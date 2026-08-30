"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import type { Entity } from "@/lib/types";

export async function createReminder(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const title = String(formData.get("title") ?? "").trim();
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const note = String(formData.get("note") ?? "").trim() || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  if (!title) return;

  await prisma.reminder.create({
    data: {
      title,
      note,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      entity,
      organizationId,
    },
  });

  revalidatePath("/reminders");
}

export async function toggleReminderDone(id: string, done: boolean) {
  const organizationId = await requireOrganizationId();
  await prisma.reminder.updateMany({ where: { id, organizationId }, data: { done } });
  revalidatePath("/reminders");
}

export async function deleteReminder(id: string) {
  const organizationId = await requireOrganizationId();
  await prisma.reminder.deleteMany({ where: { id, organizationId } });
  revalidatePath("/reminders");
}
