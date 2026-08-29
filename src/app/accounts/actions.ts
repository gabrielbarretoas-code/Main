"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { AccountType, Entity } from "@/lib/types";

export async function createAccount(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CHECKING") as AccountType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;

  if (!name) return;

  await prisma.account.create({
    data: { name, type, entity },
  });

  revalidatePath("/accounts");
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/accounts");
}
