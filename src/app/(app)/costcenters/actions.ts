"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";

export async function createCostCenter(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.costCenter.create({ data: { name, organizationId } });

  revalidatePath("/costcenters");
  revalidatePath("/reconciliation");
}

export async function deleteCostCenter(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.costCenter.deleteMany({ where: { id, organizationId } });
  revalidatePath("/costcenters");
  revalidatePath("/reconciliation");
}
