import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import TransactionForm from "./TransactionForm";
import ImportForm from "./ImportForm";
import TransactionsTable from "./TransactionsTable";
import { requireOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [accounts, categories, costCenters, transactions] = await Promise.all([
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: { entity, organizationId },
      include: { account: true, category: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Lançamentos — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo lançamento manual</h2>
        <TransactionForm entity={entity} accounts={accounts} categories={categories} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Conciliação por importação de extrato</h2>
        <ImportForm entity={entity} accounts={accounts} />
      </div>

      <TransactionsTable
        transactions={transactions.map((t) => ({
          id: t.id,
          description: t.description,
          date: t.date,
          amount: t.amount,
          type: t.type,
          accountName: t.account.name,
          categoryId: t.categoryId,
          categoryName: t.category?.name ?? null,
          categoryColor: t.category?.color ?? null,
          costCenterId: t.costCenterId,
          isTransfer: t.isTransfer,
          reconciled: t.reconciled,
          reconciledAt: t.reconciledAt,
          reconciledBy: t.reconciledBy,
          updatedAt: t.updatedAt,
          source: t.source,
          note: t.note,
          attachmentUrl: t.attachmentUrl,
          attachmentName: t.attachmentName,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          parentId: c.parentId,
          type: c.type,
        }))}
        costCenters={costCenters}
        entity={entity}
      />
    </div>
  );
}
