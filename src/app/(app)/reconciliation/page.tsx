import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { suggestCategoryId, suggestIsTransfer } from "@/lib/categorySuggestion";
import ReconciliationList from "./ReconciliationList";
import BulkAcceptButton from "./BulkAcceptButton";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage({
  searchParams,
}: PageProps<"/reconciliation">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [pendingTx, reconciledTx, categories, costCenters] = await Promise.all([
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
  ]);

  const suggestions: Record<string, { categoryId: string | null; isTransfer: boolean }> = {};
  let suggestedCount = 0;
  for (const t of pendingTx) {
    const isTransfer = suggestIsTransfer(t.description);
    const categoryId = isTransfer ? null : suggestCategoryId(t.description, categories);
    suggestions[t.id] = { categoryId, isTransfer };
    if (isTransfer || categoryId) suggestedCount++;
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
