import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { suggestForTransaction } from "@/lib/categorySuggestion";
import { loadMerchantMemory } from "@/lib/merchantMemory";
import ReconciliationList from "./ReconciliationList";
import BulkAcceptButton from "./BulkAcceptButton";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage({
  searchParams,
}: PageProps<"/reconciliation">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [pendingTx, reconciledTx, categories, costCenters, merchantMemory] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId, entity, reconciled: false },
      include: { account: true },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: { organizationId, entity, reconciled: true },
      include: { account: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.category.findMany({ where: { organizationId, entity }, orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    loadMerchantMemory(organizationId, entity),
  ]);

  const suggestions: Record<
    string,
    { categoryId: string | null; costCenterId: string | null; isTransfer: boolean; learned: boolean }
  > = {};
  let suggestedCount = 0;
  for (const t of pendingTx) {
    const suggestion = suggestForTransaction(t.description, categories, merchantMemory);
    suggestions[t.id] = {
      categoryId: suggestion.categoryId,
      costCenterId: suggestion.costCenterId,
      isTransfer: suggestion.isTransfer,
      learned: suggestion.source === "learned",
    };
    if (suggestion.source !== "none") suggestedCount++;
  }

  const toRow = (t: (typeof pendingTx)[number]) => ({
    id: t.id,
    description: t.description,
    date: t.date,
    amount: t.amount,
    type: t.type,
    accountName: t.account.name,
    categoryId: t.categoryId,
    costCenterId: t.costCenterId,
    isTransfer: t.isTransfer,
    reconciled: t.reconciled,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Conciliação — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
          </h1>
          <p className="text-sm text-slate-500">
            {pendingTx.length} lançamento(s) aguardando categorização.
          </p>
        </div>
        {suggestedCount > 0 && <BulkAcceptButton entity={entity} count={suggestedCount} />}
      </div>

      <ReconciliationList
        pending={pendingTx.map(toRow)}
        reconciled={reconciledTx.map(toRow)}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          parentId: c.parentId,
          type: c.type,
        }))}
        costCenters={costCenters}
        entity={entity}
        suggestions={suggestions}
      />
    </div>
  );
}
