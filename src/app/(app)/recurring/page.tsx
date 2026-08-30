import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatCurrency } from "@/lib/format";
import { computeMonthlyOccurrences } from "@/lib/recurrence";
import { toggleRecurringActive, deleteRecurring } from "./actions";
import NewRecurringForm from "./NewRecurringForm";
import UpcomingOccurrences, { type Occurrence } from "./UpcomingOccurrences";

export const dynamic = "force-dynamic";

const LOOKAHEAD_DAYS = 90;

export default async function RecurringPage({
  searchParams,
}: PageProps<"/recurring">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [recurring, accounts, categories, costCenters] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: { organizationId, entity },
      include: { account: true, category: true },
      orderBy: { dayOfMonth: "asc" },
    }),
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
  ]);

  const today = new Date();
  const windowEnd = new Date(today.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const activeRecurring = recurring.filter((r) => r.active);
  const recurringIds = activeRecurring.map((r) => r.id);

  const launchedTransactions = recurringIds.length
    ? await prisma.transaction.findMany({
        where: {
          recurringTransactionId: { in: recurringIds },
          date: { gte: today, lte: windowEnd },
        },
        select: { id: true, recurringTransactionId: true, date: true },
      })
    : [];
  const launchedByKey = new Map(
    launchedTransactions.map((t) => [`${t.recurringTransactionId}|${t.date.toISOString().slice(0, 10)}`, t.id])
  );

  const occurrences: Occurrence[] = [];
  for (const r of activeRecurring) {
    const dates = computeMonthlyOccurrences(r, today, windowEnd);
    for (const date of dates) {
      const isoDate = date.toISOString().slice(0, 10);
      occurrences.push({
        key: `${r.id}|${isoDate}`,
        recurringId: r.id,
        date: date.toISOString(),
        description: r.description,
        amount: r.amount,
        type: r.type,
        accountName: r.account.name,
        categoryName: r.category?.name ?? null,
        launchedTransactionId: launchedByKey.get(`${r.id}|${isoDate}`) ?? null,
      });
    }
  }
  occurrences.sort((a, b) => a.date.localeCompare(b.date));

  const pendingIncome = occurrences
    .filter((o) => o.type === "INCOME" && !o.launchedTransactionId)
    .reduce((s, o) => s + o.amount, 0);
  const pendingExpense = occurrences
    .filter((o) => o.type === "EXPENSE" && !o.launchedTransactionId)
    .reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Recorrências — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Despesas e receitas recorrentes, para acompanhar contas a pagar e a receber previstas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
          <p className="text-xs text-emerald-100">A receber previsto (próximos {LOOKAHEAD_DAYS} dias)</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingIncome)}</p>
        </div>
        <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white">
          <p className="text-xs text-slate-300">A pagar previsto (próximos {LOOKAHEAD_DAYS} dias)</p>
          <p className="text-2xl font-bold">{formatCurrency(pendingExpense)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Nova recorrência</h2>
        <NewRecurringForm
          entity={entity}
          accounts={accounts}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            parentId: c.parentId,
            type: c.type,
          }))}
          costCenters={costCenters}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Próximas ocorrências</h2>
        <UpcomingOccurrences occurrences={occurrences} entity={entity} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Cadastradas</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {recurring.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Nenhuma recorrência cadastrada ainda.</p>
          )}
          {recurring.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-slate-800">{r.description}</p>
                <p className="text-xs text-slate-400">
                  Todo dia {r.dayOfMonth} · {r.account.name}
                  {r.category ? ` · ${r.category.name}` : ""}
                </p>
              </div>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  r.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {r.type === "INCOME" ? "+" : "-"}
                {formatCurrency(r.amount)}
              </span>
              <form action={toggleRecurringActive.bind(null, r.id, !r.active)}>
                <button
                  type="submit"
                  className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                    r.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.active ? "Ativa" : "Inativa"}
                </button>
              </form>
              <form action={deleteRecurring.bind(null, r.id)}>
                <button className="text-xs text-red-500 hover:underline whitespace-nowrap">Remover</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
