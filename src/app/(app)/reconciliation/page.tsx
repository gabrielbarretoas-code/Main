import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { suggestCategoryId, suggestIsTransfer } from "@/lib/categorySuggestion";
import ReconciliationRow from "./ReconciliationRow";
import BulkAcceptButton from "./BulkAcceptButton";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage({
  searchParams,
}: PageProps<"/reconciliation">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [pendingTransactions, categories, costCenters] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId, entity, reconciled: false },
      include: { account: true },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({ where: { organizationId, entity }, orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
  ]);

  const suggestedCount = pendingTransactions.filter(
    (t) => suggestIsTransfer(t.description) || suggestCategoryId(t.description, categories) !== null
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Conciliação — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
          </h1>
          <p className="text-sm text-slate-500">
            {pendingTransactions.length} lançamento(s) aguardando categorização.
          </p>
        </div>
        {suggestedCount > 0 && <BulkAcceptButton entity={entity} count={suggestedCount} />}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {pendingTransactions.length === 0 && (
          <p className="p-6 text-sm text-slate-500 text-center">
            Nada pendente por aqui — todos os lançamentos já estão conciliados. 🎉
          </p>
        )}
        {pendingTransactions.map((t) => (
          <ReconciliationRow
            key={t.id}
            transaction={{
              id: t.id,
              description: t.description,
              date: t.date,
              amount: t.amount,
              type: t.type,
              accountName: t.account.name,
            }}
            categories={categories}
            costCenters={costCenters}
            suggestedCategoryId={suggestCategoryId(t.description, categories)}
            suggestedIsTransfer={suggestIsTransfer(t.description)}
            entity={entity}
          />
        ))}
      </div>
    </div>
  );
}
