"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";

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

async function decodeFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Extratos de bancos brasileiros costumam vir em Latin-1/Windows-1252,
    // não UTF-8 — decodificar como UTF-8 corromperia os acentos.
    return new TextDecoder("windows-1252").decode(buffer);
  }
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

  const text = await decodeFileText(file);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
  });

  if (parsed.errors.length && parsed.data.length === 0) {
    return { imported: 0, skipped: 0, error: "Não foi possível ler o arquivo CSV." };
  }

  const dateKeys = ["data", "date", "dt"];
  const descKeys = [
    "descricao",
    "descrição",
    "description",
    "historico",
    "histórico",
    "memo",
    "lancamento",
    "lançamento",
  ];
  const amountKeys = ["valor", "amount", "value", "valor (r$)"];

  function pick(row: Record<string, string>, keys: string[]) {
    const lowerMap = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
    );
    for (const k of keys) {
      if (lowerMap[k] !== undefined) return lowerMap[k];
    }
    // Fallback: prefix match, in case the header has extra words or characters
    for (const k of keys) {
      const found = Object.entries(lowerMap).find(([header]) => header.startsWith(k));
      if (found) return found[1];
    }
    return undefined;
  }

  function isBalanceLine(description: string): boolean {
    const stripped = description.replace(/\s+/g, "").toLowerCase();
    return stripped.startsWith("saldo");
  }

  function parseAmount(raw: string): number {
    const cleaned = raw.replace(/[^\d,.-]/g, "");
    if (cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(cleaned.replace(/,/g, ""));
  }

  function parseDate(raw: string): Date | null {
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return new Date(raw);
    const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (brMatch) {
      const [, d, m, y] = brMatch;
      const year = y.length === 2 ? `20${y}` : y;
      return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  let imported = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const dateRaw = pick(row, dateKeys);
    const descRaw = pick(row, descKeys);
    const amountRaw = pick(row, amountKeys);

    if (!dateRaw || !descRaw || amountRaw === undefined) {
      skipped++;
      continue;
    }

    if (isBalanceLine(descRaw)) {
      skipped++;
      continue;
    }

    const date = parseDate(dateRaw.trim());
    const value = parseAmount(amountRaw.trim());

    if (!date || isNaN(value) || value === 0) {
      skipped++;
      continue;
    }

    await prisma.transaction.create({
      data: {
        description: descRaw.trim(),
        amount: Math.abs(value),
        type: value < 0 ? "EXPENSE" : "INCOME",
        entity,
        date,
        accountId,
        organizationId,
        source: "import",
        reconciled: false,
      },
    });
    imported++;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");

  return { imported, skipped };
}
