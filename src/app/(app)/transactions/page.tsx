import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import TransactionForm from "./TransactionForm";
import ImportForm from "./ImportForm";
import ReconcileToggle from "./ReconcileToggle";
import { deleteTransaction } from "./actions";
import { requireOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [accounts, categories, transactions] = await Promise.all([
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">Descrição</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Conta</th>
              <th className="p-3 font-medium text-right">Valor</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  Nenhum lançamento ainda.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="p-3 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="p-3">{t.description}</td>
                <td className="p-3">
                  {t.isTransfer ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Transferência
                    </span>
                  ) : t.category ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: t.category.color }}
                      />
                      {t.category.name}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="p-3">{t.account.name}</td>
                <td
                  className={`p-3 text-right font-medium whitespace-nowrap ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </td>
                <td className="p-3">
                  <ReconcileToggle id={t.id} reconciled={t.reconciled} />
                </td>
                <td className="p-3">
                  <form action={deleteTransaction.bind(null, t.id)}>
                    <button className="text-xs text-red-500 hover:underline">
                      Remover
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
