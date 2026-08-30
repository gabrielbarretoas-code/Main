import "server-only";

import { prisma } from "@/lib/prisma";
import { extractMerchantKey, type MerchantMemoryEntry } from "@/lib/categorySuggestion";
import type { Entity } from "@/lib/types";

/** Carrega tudo que a organização já "ensinou" pro sistema, pra sugerir nos próximos lançamentos. */
export async function loadMerchantMemory(
  organizationId: string,
  entity: Entity
): Promise<Map<string, MerchantMemoryEntry>> {
  const rows = await prisma.merchantCategoryMemory.findMany({
    where: { organizationId, entity },
  });

  const memory = new Map<string, MerchantMemoryEntry>();
  for (const row of rows) {
    memory.set(row.merchantKey, {
      categoryId: row.categoryId,
      costCenterId: row.costCenterId,
      isTransfer: row.isTransfer,
    });
  }
  return memory;
}

/**
 * Grava (ou reforça) a escolha do usuário pra esse estabelecimento — é isso
 * que faz o sistema "aprender" e parar de perguntar de novo pro mesmo lugar.
 * A confirmação mais recente sempre prevalece.
 */
export async function learnMerchantChoice(
  organizationId: string,
  entity: Entity,
  description: string,
  choice: { categoryId: string | null; costCenterId: string | null; isTransfer: boolean }
): Promise<void> {
  const merchantKey = extractMerchantKey(description);
  if (!merchantKey) return;

  await prisma.merchantCategoryMemory.upsert({
    where: { organizationId_entity_merchantKey: { organizationId, entity, merchantKey } },
    update: {
      categoryId: choice.categoryId,
      costCenterId: choice.costCenterId,
      isTransfer: choice.isTransfer,
      confirmedCount: { increment: 1 },
      lastConfirmedAt: new Date(),
    },
    create: {
      organizationId,
      entity,
      merchantKey,
      categoryId: choice.categoryId,
      costCenterId: choice.costCenterId,
      isTransfer: choice.isTransfer,
    },
  });
}
