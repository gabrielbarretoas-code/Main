"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import { suggestCategoryId, suggestIsTransfer } from "@/lib/categorySuggestion";
import type { Entity, TransactionType } from "@/lib/types";

export async function confirmReconciliation(
  transactionId: string,
  categoryId: string | null,
  costCenterId: string | null,
  isTransfer: boolean
) {
  const organizationId = await requireOrganizationId();

  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, organizationId } });
  if (!existing) return;

  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return;
  }
  if (costCenterId) {
    const costCenter = await prisma.costCenter.findFirst({ where: { id: costCenterId, organizationId } });
    if (!costCenter) return;
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      categoryId: isTransfer ? null : categoryId,
      costCenterId: isTransfer ? null : costCenterId,
      isTransfer,
      reconciled: true,
      reconciledAt: existing.reconciledAt ?? new Date(),
      reconciledBy: existing.reconciledBy ?? "user",
    },
  });

  revalidatePath("/reconciliation");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function quickCreateCategory(
  name: string,
  type: TransactionType,
  entity: Entity,
  parentId: string | null = null
): Promise<{ id: string; name: string; color: string } | null> {
  const organizationId = await requireOrganizationId();
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, organizationId, type, entity },
    });
    if (!parent) return null;
  }

  const colors = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#0ea5e9", "#a855f7", "#ec4899", "#14b8a6"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const category = await prisma.category.upsert({
    where: { organizationId_name_type_entity: { organizationId, name: trimmed, type, entity } },
    update: {},
    create: { name: trimmed, type, entity, color, organizationId, parentId },
  });

  revalidatePath("/categories");
  revalidatePath("/reconciliation");
  revalidatePath("/transactions");

  return { id: category.id, name: category.name, color: category.color };
}

export async function bulkConfirmSuggested(entity: Entity) {
  const organizationId = await requireOrganizationId();

  const [pendingTransactions, categories] = await Promise.all([
    prisma.transaction.findMany({ where: { organizationId, entity, reconciled: false } }),
    prisma.category.findMany({ where: { organizationId, entity } }),
  ]);

  for (const t of pendingTransactions) {
    if (suggestIsTransfer(t.description)) {
      await prisma.transaction.update({
        where: { id: t.id },
        data: { isTransfer: true, categoryId: null, reconciled: true },
      });
      continue;
    }
    const suggestion = suggestCategoryId(t.description, categories);
    if (!suggestion) continue;
    await prisma.transaction.update({
      where: { id: t.id },
      data: { categoryId: suggestion, reconciled: true },
    });
  }

  revalidatePath("/reconciliation");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}
