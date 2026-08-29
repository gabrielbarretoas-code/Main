"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity } from "@/lib/types";

export async function upsertBudget(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const categoryId = String(formData.get("categoryId") ?? "");
  const month = parseInt(String(formData.get("month") ?? "1"), 10);
  const year = parseInt(String(formData.get("year") ?? "2026"), 10);
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const plannedAmount = Math.abs(
    parseFloat(String(formData.get("plannedAmount") ?? "0").replace(",", "."))
  );

  if (!categoryId || plannedAmount <= 0) return;

  const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
  if (!category) return;

  await prisma.budget.upsert({
    where: {
      organizationId_month_year_entity_categoryId: { organizationId, month, year, entity, categoryId },
    },
    update: { plannedAmount },
    create: { organizationId, month, year, entity, categoryId, plannedAmount },
  });

  revalidatePath("/budget");
}

export async function deleteBudget(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.budget.deleteMany({ where: { id, organizationId } });
  revalidatePath("/budget");
}
