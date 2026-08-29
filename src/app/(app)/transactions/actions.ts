"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";
import {
  decodeFileText,
  detectFileKind,
  normalizeGenericRow,
  parseOfxTransactions,
  parsePdfTransactions,
  parseXlsxRows,
  type ParsedTransaction,
} from "@/lib/statementImport";

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
      reconciled: true,
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

export async function toggleReconciled(id: string, reconciled: boolean) {
  const organizationId = await requireOrganizationId();
  await prisma.transaction.updateMany({
    where: { id, organizationId },
    data: { reconciled },
  });
  revalidatePath("/transactions");
}

type ImportResult = { imported: number; skipped: number; error?: string };

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

  let imported = 0;
  for (const t of transactions) {
    await prisma.transaction.create({
      data: {
        description: t.description,
        amount: Math.abs(t.amount),
        type: t.amount < 0 ? "EXPENSE" : "INCOME",
        entity,
        date: t.date,
        accountId,
        organizationId,
        source: "import",
        reconciled: false,
      },
    });
    imported++;
  }

  const skipped = Math.max(rowCount - imported, 0);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");

  return { imported, skipped };
}
