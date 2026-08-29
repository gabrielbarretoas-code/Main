"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { AccountType, Entity } from "@/lib/types";

export async function createAccount(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "CHECKING") as AccountType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const hasAutoInvest = formData.get("hasAutoInvest") === "on";

  if (!name) return;

  await prisma.account.create({
    data: { name, type, entity, organizationId, hasAutoInvest },
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.account.deleteMany({ where: { id, organizationId } });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
