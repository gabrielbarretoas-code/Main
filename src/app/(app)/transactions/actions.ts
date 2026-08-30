"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { put, del } from "@vercel/blob";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";
import {
  computeDedupeKey,
  decodeFileText,
  detectFileKind,
  normalizeGenericRow,
  parseOfxTransactions,
  parsePdfTransactions,
  parseXlsxRows,
  type ParsedTransaction,
} from "@/lib/statementImport";
import { suggestIsTransfer } from "@/lib/categorySuggestion";

export async function createTransaction(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "0").replace(",", ".");
  const amount = Math.abs(parseFloat(amountRaw) || 0);
  const type = String(formData.get("type") ?? "EXPENSE") as TransactionType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!description || !accountId || amount <= 0) return;

  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) return;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return;
  }

  await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      entity,
      date: new Date(date),
      accountId,
      categoryId,
      organizationId,
      source: "manual",
      note,
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "user",
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function deleteTransaction(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.transaction.deleteMany({ where: { id, organizationId } });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export type TransactionDetailsUpdate = {
  reconciled: boolean;
  reconciledAt: Date | null;
  reconciledBy: string | null;
  updatedAt: Date;
  categoryId: string | null;
  costCenterId: string | null;
  isTransfer: boolean;
  note: string | null;
};

export async function updateTransactionDetails(
  transactionId: string,
  categoryId: string | null,
  costCenterId: string | null,
  isTransfer: boolean,
  note: string | null
): Promise<TransactionDetailsUpdate | null> {
  const organizationId = await requireOrganizationId();

  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, organizationId } });
  if (!existing) return null;

  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return null;
  }
  if (costCenterId) {
    const costCenter = await prisma.costCenter.findFirst({ where: { id: costCenterId, organizationId } });
    if (!costCenter) return null;
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId: isTransfer ? null : categoryId,
      costCenterId: isTransfer ? null : costCenterId,
      isTransfer,
      reconciled: true,
      reconciledAt: existing.reconciledAt ?? new Date(),
      reconciledBy: existing.reconciledBy ?? "user",
      note: note?.trim() || null,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/reconciliation");
  revalidatePath("/dashboard");
  revalidatePath("/budget");

  return {
    reconciled: updated.reconciled,
    reconciledAt: updated.reconciledAt,
    reconciledBy: updated.reconciledBy,
    updatedAt: updated.updatedAt,
    categoryId: updated.categoryId,
    costCenterId: updated.costCenterId,
    isTransfer: updated.isTransfer,
    note: updated.note,
  };
}

export type AttachmentResult =
  | { ok: true; attachmentUrl: string; attachmentName: string }
  | { ok: false; error: string };

export async function uploadAttachment(transactionId: string, formData: FormData): Promise<AttachmentResult> {
  const organizationId = await requireOrganizationId();
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, organizationId } });
  if (!existing) return { ok: false, error: "Lançamento não encontrado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo." };

  let blobUrl: string;
  try {
    const blob = await put(
      `receipts/${organizationId}/${transactionId}-${Date.now()}-${file.name}`,
      file,
      { access: "public" }
    );
    blobUrl = blob.url;
  } catch {
    return {
      ok: false,
      error: "Não foi possível enviar o anexo. O armazenamento de arquivos (Vercel Blob) precisa estar habilitado no projeto.",
    };
  }

  if (existing.attachmentUrl) {
    try {
      await del(existing.attachmentUrl);
    } catch {
      // arquivo antigo pode já não existir mais; ignora.
    }
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { attachmentUrl: blobUrl, attachmentName: file.name },
  });

  revalidatePath("/transactions");

  return { ok: true, attachmentUrl: blobUrl, attachmentName: file.name };
}

export async function removeAttachment(transactionId: string): Promise<boolean> {
  const organizationId = await requireOrganizationId();
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, organizationId } });
  if (!existing) return false;

  if (existing.attachmentUrl) {
    try {
      await del(existing.attachmentUrl);
    } catch {
      // já pode não existir mais; ignora.
    }
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { attachmentUrl: null, attachmentName: null },
  });

  revalidatePath("/transactions");
  return true;
}

type ImportResult = {
  imported: number;
  skipped: number;
  duplicates?: number;
  autoReconciled?: number;
  error?: string;
};

export async function importStatement(formData: FormData): Promise<ImportResult> {
  const organizationId = await requireOrganizationId();
  const file = formData.get("file") as File | null;
  const accountId = String(formData.get("accountId") ?? "");
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;

  if (!file || !accountId) {
    return { imported: 0, skipped: 0, error: "Selecione um arquivo e uma conta." };
  }

  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) {
    return { imported: 0, skipped: 0, error: "Conta inválida." };
  }

  const kind = detectFileKind(file.name);
  let transactions: ParsedTransaction[] = [];
  let rowCount = 0;

  try {
    if (kind === "csv") {
      const text = await decodeFileText(file);
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",
      });
      if (parsed.errors.length && parsed.data.length === 0) {
        return { imported: 0, skipped: 0, error: "Não foi possível ler o arquivo CSV." };
      }
      rowCount = parsed.data.length;
      transactions = parsed.data
        .map(normalizeGenericRow)
        .filter((t): t is ParsedTransaction => t !== null);
    } else if (kind === "xlsx") {
      const rows = await parseXlsxRows(file);
      rowCount = rows.length;
      transactions = rows.map(normalizeGenericRow).filter((t): t is ParsedTransaction => t !== null);
    } else if (kind === "ofx") {
      const text = await decodeFileText(file);
      transactions = parseOfxTransactions(text);
      rowCount = transactions.length;
    } else if (kind === "pdf") {
      transactions = await parsePdfTransactions(file);
      rowCount = transactions.length;
      if (transactions.length === 0) {
        return {
          imported: 0,
          skipped: 0,
          error:
            "Não consegui reconhecer lançamentos nesse PDF. Funciona melhor com PDFs de texto (não escaneados). Tente exportar em CSV, Excel ou OFX pelo internet banking.",
        };
      }
    } else {
      return {
        imported: 0,
        skipped: 0,
        error: "Formato de arquivo não suportado. Use CSV, Excel (.xlsx/.xls), OFX ou PDF.",
      };
    }
  } catch {
    return { imported: 0, skipped: 0, error: "Não foi possível ler esse arquivo." };
  }

  // Nunca duplicar lançamento: cada linha importada ganha uma chave de
  // deduplicação (FITID do banco quando disponível, senão uma assinatura por
  // data+valor+descrição) e é comparada tanto com o que já existe na conta
  // quanto com o restante deste mesmo arquivo antes de ser gravada.
  const existingKeys = new Set(
    (
      await prisma.transaction.findMany({
        where: { accountId, dedupeKey: { not: null } },
        select: { dedupeKey: true },
      })
    ).map((t) => t.dedupeKey as string)
  );

  let autoReconciled = 0;
  let duplicates = 0;
  const seenInBatch = new Set<string>();
  const toCreate: Prisma.TransactionCreateManyInput[] = [];

  for (const t of transactions) {
    const dedupeKey = computeDedupeKey(t);
    if (existingKeys.has(dedupeKey) || seenInBatch.has(dedupeKey)) {
      duplicates++;
      continue;
    }
    seenInBatch.add(dedupeKey);

    const isKnownTransfer = account.hasAutoInvest && suggestIsTransfer(t.description);
    if (isKnownTransfer) autoReconciled++;

    toCreate.push({
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.amount < 0 ? "EXPENSE" : "INCOME",
      entity,
      date: t.date,
      accountId,
      organizationId,
      source: "import",
      isTransfer: isKnownTransfer,
      reconciled: isKnownTransfer,
      reconciledAt: isKnownTransfer ? new Date() : null,
      reconciledBy: isKnownTransfer ? "system" : null,
      dedupeKey,
    });
  }

  if (toCreate.length > 0) {
    // skipDuplicates é uma segunda camada de proteção contra corrida (duas
    // importações simultâneas) — a filtragem acima já cobre o caso normal.
    await prisma.transaction.createMany({ data: toCreate, skipDuplicates: true });
  }

  const imported = toCreate.length;
  const skipped = Math.max(rowCount - imported - duplicates, 0);

  revalidatePath("/transactions");
  revalidatePath("/reconciliation");
  revalidatePath("/dashboard");
  revalidatePath("/budget");

  return { imported, skipped, duplicates, autoReconciled };
}
