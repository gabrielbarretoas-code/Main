"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity } from "@/lib/types";

export async function createCreditCard(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const name = String(formData.get("name") ?? "").trim();
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const creditLimitRaw = String(formData.get("creditLimit") ?? "").replace(",", ".");
  const closingDayRaw = String(formData.get("closingDay") ?? "");
  const dueDayRaw = String(formData.get("dueDay") ?? "");

  if (!name) return;

  const creditLimit = creditLimitRaw ? Math.abs(parseFloat(creditLimitRaw)) || null : null;
  const closingDay = closingDayRaw ? Math.min(31, Math.max(1, parseInt(closingDayRaw, 10))) : null;
  const dueDay = dueDayRaw ? Math.min(31, Math.max(1, parseInt(dueDayRaw, 10))) : null;

  await prisma.account.create({
    data: {
      name,
      type: "CREDIT_CARD",
      entity,
      organizationId,
      creditLimit,
      closingDay,
      dueDay,
    },
  });

  revalidatePath("/credit-cards");
  revalidatePath("/dashboard");
}
