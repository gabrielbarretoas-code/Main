"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/loans");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function createLoan(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const direction = String(formData.get("direction") ?? "BORROWED") as "BORROWED" | "LENT";
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const principal = Math.abs(parseFloat(String(formData.get("principal") ?? "0").replace(",", ".")) || 0);
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const startDateRaw = String(formData.get("startDate") ?? "");
  const installmentCount = Math.max(1, parseInt(String(formData.get("installmentCount") ?? "1"), 10) || 1);
  const installmentAmount = Math.abs(
    parseFloat(String(formData.get("installmentAmount") ?? "0").replace(",", ".")) || 0
  );
  const installmentDay = Math.min(31, Math.max(1, parseInt(String(formData.get("installmentDay") ?? "1"), 10) || 1));
  const interestRateRaw = String(formData.get("interestRate") ?? "").replace(",", ".");
  const interestRate = interestRateRaw ? parseFloat(interestRateRaw) || null : null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!counterparty || !accountId || principal <= 0 || !startDateRaw || installmentAmount <= 0) return;

  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) return;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return;
  }

  const startDate = new Date(startDateRaw);
  // Empréstimo tomado: você recebe o principal (receita) e paga as parcelas
  // (despesa). Empréstimo efetuado: o inverso.
  const principalType: TransactionType = direction === "BORROWED" ? "INCOME" : "EXPENSE";

  const loan = await prisma.loan.create({
    data: {
      direction,
      counterparty,
      principal,
      accountId,
      categoryId,
      startDate,
      installmentCount,
      installmentAmount,
      installmentDay,
      interestRate,
      note,
      entity,
      organizationId,
    },
  });

  await prisma.transaction.create({
    data: {
      description: `Empréstimo ${direction === "BORROWED" ? "tomado" : "efetuado"} — ${counterparty} (principal)`,
      amount: principal,
      type: principalType,
      entity,
      date: startDate,
      accountId,
      categoryId,
      organizationId,
      source: "loan",
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "user",
      loanId: loan.id,
    },
  });

  revalidateAll();
}

export async function deleteLoan(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.loan.deleteMany({ where: { id, organizationId } });
  revalidateAll();
}

export async function registerInstallment(loanId: string, dateIso: string) {
  const organizationId = await requireOrganizationId();

  const loan = await prisma.loan.findFirst({ where: { id: loanId, organizationId } });
  if (!loan) return;

  const date = new Date(dateIso);

  const alreadyRegistered = await prisma.transaction.findFirst({
    where: {
      loanId,
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    },
  });
  if (alreadyRegistered) return;

  // Empréstimo tomado: pagar parcela é despesa. Empréstimo efetuado: receber
  // parcela é receita.
  const installmentType: TransactionType = loan.direction === "BORROWED" ? "EXPENSE" : "INCOME";

  await prisma.transaction.create({
    data: {
      description: `Parcela — ${loan.counterparty}`,
      amount: loan.installmentAmount,
      type: installmentType,
      entity: loan.entity,
      date,
      accountId: loan.accountId,
      categoryId: loan.categoryId,
      organizationId,
      source: "loan",
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "user",
      loanId,
    },
  });

  revalidateAll();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
