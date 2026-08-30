"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function createRecurring(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const description = String(formData.get("description") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "0").replace(",", ".");
  const amount = Math.abs(parseFloat(amountRaw) || 0);
  const type = String(formData.get("type") ?? "EXPENSE") as TransactionType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const costCenterId = String(formData.get("costCenterId") ?? "") || null;
  const dayOfMonth = Math.min(31, Math.max(1, parseInt(String(formData.get("dayOfMonth") ?? "1"), 10) || 1));
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");

  if (!description || !accountId || amount <= 0 || !startDateRaw) return;

  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) return;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return;
  }
  if (costCenterId) {
    const costCenter = await prisma.costCenter.findFirst({ where: { id: costCenterId, organizationId } });
    if (!costCenter) return;
  }

  await prisma.recurringTransaction.create({
    data: {
      description,
      amount,
      type,
      entity,
      accountId,
      categoryId,
      costCenterId,
      dayOfMonth,
      startDate: new Date(startDateRaw),
      endDate: endDateRaw ? new Date(endDateRaw) : null,
      organizationId,
    },
  });

  revalidateAll();
}

export async function toggleRecurringActive(id: string, active: boolean) {
  const organizationId = await requireOrganizationId();
  await prisma.recurringTransaction.updateMany({
    where: { id, organizationId },
    data: { active },
  });
  revalidateAll();
}

export async function deleteRecurring(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.recurringTransaction.deleteMany({ where: { id, organizationId } });
  revalidateAll();
}

export async function launchOccurrence(recurringId: string, dateIso: string) {
  const organizationId = await requireOrganizationId();

  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, organizationId },
  });
  if (!recurring) return;

  const date = new Date(dateIso);

  const alreadyLaunched = await prisma.transaction.findFirst({
    where: {
      recurringTransactionId: recurringId,
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    },
  });
  if (alreadyLaunched) return;

  await prisma.transaction.create({
    data: {
      description: recurring.description,
      amount: recurring.amount,
      type: recurring.type,
      entity: recurring.entity,
      date,
      accountId: recurring.accountId,
      categoryId: recurring.categoryId,
      costCenterId: recurring.costCenterId,
      organizationId,
      source: "recurring",
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "user",
      recurringTransactionId: recurringId,
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
