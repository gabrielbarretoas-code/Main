import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeDedupeKey, type ParsedTransaction } from "@/lib/statementImport";
import { suggestIsTransfer } from "@/lib/categorySuggestion";
import type { Entity } from "@/lib/types";

export type ImportSummary = { imported: number; duplicates: number; autoReconciled: number };

/**
 * Grava um lote de transações já parseadas numa conta, sem nunca duplicar
 * lançamento (mesma proteção usada pelo import de extrato: chave de
 * deduplicação por transação, comparada com o que já existe na conta e com
 * o resto do próprio lote). Compartilhado entre o import de arquivo
 * (CSV/XLSX/OFX/PDF) e a sincronização de Open Finance.
 */
export async function importTransactionRecords(
  organizationId: string,
  accountId: string,
  entity: Entity,
  transactions: ParsedTransaction[],
  source: string,
  hasAutoInvest: boolean
): Promise<ImportSummary> {
  const existingKeys = new Set(
    (
      await prisma.transaction.findMany({
        where: { accountId, dedupeKey: { not: null } },
        select: { dedupeKey: true },
      })
    ).map((t) => t.dedupeKey as string)
  );

  let autoReconciled = 0;
  let duplicates = 0;
  const seenInBatch = new Set<string>();
  const toCreate: Prisma.TransactionCreateManyInput[] = [];

  for (const t of transactions) {
    const dedupeKey = computeDedupeKey(t);
    if (existingKeys.has(dedupeKey) || seenInBatch.has(dedupeKey)) {
      duplicates++;
      continue;
    }
    seenInBatch.add(dedupeKey);

    const isKnownTransfer = hasAutoInvest && suggestIsTransfer(t.description);
    if (isKnownTransfer) autoReconciled++;

    toCreate.push({
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.amount < 0 ? "EXPENSE" : "INCOME",
      entity,
      date: t.date,
      accountId,
      organizationId,
      source,
      isTransfer: isKnownTransfer,
      reconciled: isKnownTransfer,
      reconciledAt: isKnownTransfer ? new Date() : null,
      reconciledBy: isKnownTransfer ? "system" : null,
      dedupeKey,
    });
  }

  if (toCreate.length > 0) {
    // skipDuplicates é uma segunda camada de proteção contra corrida (duas
    // sincronizações simultâneas) — a filtragem acima já cobre o caso normal.
    await prisma.transaction.createMany({ data: toCreate, skipDuplicates: true });
  }

  return { imported: toCreate.length, duplicates, autoReconciled };
}
