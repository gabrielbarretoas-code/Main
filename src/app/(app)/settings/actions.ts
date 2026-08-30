"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";

// Sem 0/O/1/I — evita confusão na hora de digitar/ler o código.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  return Array.from({ length }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
}

/** Gera (ou troca) o código de vinculação do WhatsApp da organização. */
export async function generateWhatsAppLinkCode(): Promise<string> {
  const organizationId = await requireOrganizationId();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { whatsappLinkCode: code },
      });
      revalidatePath("/settings");
      return code;
    } catch {
      // colisão rara de código — tenta de novo com outro
    }
  }
  throw new Error("Não foi possível gerar um código único agora. Tente de novo.");
}

export async function disconnectWhatsApp(): Promise<void> {
  const organizationId = await requireOrganizationId();
  await prisma.organization.update({
    where: { id: organizationId },
    data: { whatsappPhone: null },
  });
  revalidatePath("/settings");
}
