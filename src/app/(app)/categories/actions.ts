"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";

export async function createCategory(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "EXPENSE") as TransactionType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const color = String(formData.get("color") ?? "#6366f1");

  if (!name) return;

  await prisma.category.create({
    data: { name, type, entity, color, organizationId },
  });

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.category.deleteMany({ where: { id, organizationId } });
  revalidatePath("/categories");
}
