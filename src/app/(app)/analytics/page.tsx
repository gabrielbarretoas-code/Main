import { Landmark, Wallet, Home as HomeIcon, HandCoins, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatCurrency, formatDate, MONTHS_PT } from "@/lib/format";
import { computeMonthlyOccurrences, computeLoanInstallments } from "@/lib/recurrence";
import { ExpenseByCategoryChart, MonthlyTrendChart } from "@/components/charts/DashboardCharts";

export const dynamic = "force-dynamic";

const LOOKAHEAD_DAYS = 90;

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const now = new Date();
  const month = sp.month ? parseInt(String(sp.month), 10) : now.getMonth() + 1;
  const year = sp.year ? parseInt(String(sp.year), 10) : now.getFullYear();
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [accounts, balanceGroups, assets, loans, recurring, periodTx, trendTx] = await Promise.all([
    prisma.account.findMany({ where: { entity, organizationId } }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { entity, organizationId },
      _sum: { amount: true },
    }),
    prisma.asset.findMany({ where: { entity, organizationId } }),
    prisma.loan.findMany({ where: { entity, organizationId } }),
    prisma.recurringTransaction.findMany({ where: { entity, organizationId, active: true } }),
    prisma.transaction.findMany({
      where: { entity, organizationId, date: { gte: periodStart, lt: periodEnd }, isTransfer: false },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: { entity, organizationId, date: { gte: twelveMonthsAgo }, isTransfer: false },
    }),
  ]);

  // Patrimônio líquido: saldo das contas (inclui cartão de crédito, que já
  // entra negativo naturalmente) + bens - saldo devedor de empréstimos
  // tomados + saldo a receber de empréstimos efetuados.
  const balanceByAccount = new Map<string, number>();
  for (const g of balanceGroups) {
    const sign = g.type === "INCOME" ? 1 : -1;
    balanceByAccount.set(g.accountId, (balanceByAccount.get(g.accountId) ?? 0) + sign * (g._sum.amount ?? 0));
  }
  const accountsTotal = accounts.reduce((s, a) => s + (balanceByAccount.get(a.id) ?? 0), 0);
  const assetsTotal = assets.reduce((s, a) => s + (a.currentValue ?? a.acquisitionValue ?? 0), 0);

  const loanIds = loans.map((l) => l.id);
  const loanTransactions = loanIds.length
    ? await prisma.transaction.findMany({
        where: { loanId: { in: loanIds }, source: "loan" },
        select: { loanId: true, date: true },
      })
    : [];

  let borrowedRemaining = 0;
  let lentRemaining = 0;
  for (const loan of loans) {
    const installments = computeLoanInstallments(loan);
    const paidDates = new Set(
      loanTransactions.filter((t) => t.loanId === loan.id).map((t) => t.date.toISOString().slice(0, 10))
    );
    const paidCount = installments.filter((d) => paidDates.has(d.toISOString().slice(0, 10))).length;
    const remaining = (loan.installmentCount - paidCount) * loan.installmentAmount;
    if (loan.direction === "BORROWED") borrowedRemaining += remaining;
    else lentRemaining += remaining;
  }

  const netWorth = accountsTotal + assetsTotal - borrowedRemaining + lentRemaining;

  // Contas a pagar/receber previstas: recorrências + parcelas de empréstimo
  // pendentes, combinadas numa única linha do tempo.
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const recurringIds = recurring.map((r) => r.id);
  const launchedRecurring = recurringIds.length
    ? await prisma.transaction.findMany({
        where: { recurringTransactionId: { in: recurringIds }, date: { gte: now, lte: windowEnd } },
        select: { recurringTransactionId: true, date: true },
      })
    : [];
  const launchedRecurringKeys = new Set(
    launchedRecurring.map((t) => `${t.recurringTransactionId}|${t.date.toISOString().slice(0, 10)}`)
  );

  type ForecastItem = { date: Date; description: string; amount: number; type: "INCOME" | "EXPENSE" };
  const forecast: ForecastItem[] = [];

  for (const r of recurring) {
    for (const date of computeMonthlyOccurrences(r, now, windowEnd)) {
      const key = `${r.id}|${date.toISOString().slice(0, 10)}`;
      if (!launchedRecurringKeys.has(key)) {
        forecast.push({ date, description: r.description, amount: r.amount, type: r.type });
      }
    }
  }

  for (const loan of loans) {
    const installments = computeLoanInstallments(loan);
    const paidDates = new Set(
      loanTransactions.filter((t) => t.loanId === loan.id).map((t) => t.date.toISOString().slice(0, 10))
    );
    const installmentType = loan.direction === "BORROWED" ? "EXPENSE" : "INCOME";
    for (const date of installments) {
      if (date < now || date > windowEnd) continue;
      const iso = date.toISOString().slice(0, 10);
      if (paidDates.has(iso)) continue;
      forecast.push({ date, description: `Parcela — ${loan.counterparty}`, amount: loan.installmentAmount, type: installmentType });
    }
  }

  forecast.sort((a, b) => a.date.getTime() - b.date.getTime());
  const forecastIncome = forecast.filter((f) => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
  const forecastExpense = forecast.filter((f) => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);

  // Evolução de caixa — 12 meses.
  const monthly: { month: string; Receitas: number; Despesas: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const txs = trendTx.filter((t) => t.date >= start && t.date < end);
    monthly.push({
      month: `${MONTHS_PT[start.getMonth()].slice(0, 3)}/${String(start.getFullYear()).slice(2)}`,
      Receitas: txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      Despesas: txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    });
  }

  // Despesas por categoria no período selecionado.
  const byCategory = new Map<string, { value: number; color: string }>();
  for (const t of periodTx) {
    if (t.type !== "EXPENSE") continue;
    const key = t.category?.name ?? "Sem categoria";
    const color = t.category?.color ?? "#94a3b8";
    byCategory.set(key, { value: (byCategory.get(key)?.value ?? 0) + t.amount, color });
  }
  const categoryData = Array.from(byCategory.entries())
    .map(([name, v]) => ({ name, value: v.value, color: v.color }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Análises — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Patrimônio líquido" value={netWorth} icon={TrendingUp} highlight />
        <MetricCard label="Contas (líquido + investido)" value={accountsTotal} icon={Wallet} />
        <MetricCard label="Bens (imóveis/automóveis)" value={assetsTotal} icon={HomeIcon} />
        <MetricCard
          label="Empréstimos (líquido)"
          value={lentRemaining - borrowedRemaining}
          icon={HandCoins}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium mb-2 text-slate-900">Receitas x Despesas (12 meses)</h2>
          <MonthlyTrendChart data={monthly} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Despesas por categoria</h2>
            <form className="flex gap-2 items-center text-xs">
              <input type="hidden" name="entity" value={entity} />
              <select name="month" defaultValue={month} className="border border-slate-300 rounded-md px-2 py-1">
                {MONTHS_PT.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                name="year"
                type="number"
                defaultValue={year}
                className="border border-slate-300 rounded-md px-2 py-1 w-16"
              />
              <button className="bg-slate-800 text-white rounded-md px-2.5 py-1 font-medium">Ver</button>
            </form>
          </div>
          <ExpenseByCategoryChart data={categoryData} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">
            Contas a pagar x receber (próximos {LOOKAHEAD_DAYS} dias)
          </h2>
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600">A receber: <span className="font-medium">{formatCurrency(forecastIncome)}</span></span>
            <span className="text-red-600">A pagar: <span className="font-medium">{formatCurrency(forecastExpense)}</span></span>
          </div>
        </div>
        {forecast.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
            Nenhuma conta prevista — cadastre recorrências ou empréstimos para ver a previsão aqui.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {forecast.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 text-sm">
                <span className="text-slate-500 w-24 shrink-0">{formatDate(f.date)}</span>
                <span className="flex-1 truncate text-slate-700">{f.description}</span>
                <span className={`font-medium whitespace-nowrap ${f.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                  {f.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(f.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Landmark size={12} />
        Patrimônio líquido soma saldo de contas (inclui dívida de cartão), valor atual dos bens
        cadastrados e o saldo de empréstimos (a receber menos a pagar).
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-300">{label}</p>
          <Icon size={18} className="text-brand-gold" />
        </div>
        <p className="text-2xl font-bold">{formatCurrency(value)}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon size={16} className="text-slate-400" />
      </div>
      <p className={`text-xl font-semibold ${value >= 0 ? "text-slate-900" : "text-red-600"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
