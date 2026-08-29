"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Entity, TransactionType } from "@/lib/types";

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "EXPENSE") as TransactionType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const color = String(formData.get("color") ?? "#6366f1");

  if (!name) return;

  await prisma.category.create({
    data: { name, type, entity, color },
  });

  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
}
