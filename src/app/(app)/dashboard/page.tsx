import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, formatDate, MONTHS_PT } from "@/lib/format";
import {
  ExpenseByCategoryChart,
  MonthlyTrendChart,
} from "@/components/charts/DashboardCharts";
import { requireOrganizationId } from "@/lib/session";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, PiggyBank, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [accounts, balanceGroups, transferGroups, recentTransactions] = await Promise.all([
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { entity, organizationId },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { entity, organizationId, isTransfer: true },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { entity, organizationId, date: { gte: sixMonthsAgoStart } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const balanceByAccount = new Map<string, number>();
  for (const g of balanceGroups) {
    const sign = g.type === "INCOME" ? 1 : -1;
    const prev = balanceByAccount.get(g.accountId) ?? 0;
    balanceByAccount.set(g.accountId, prev + sign * (g._sum.amount ?? 0));
  }

  // Contas de investimento (tipo INVESTMENT) são patrimônio guardado de fato —
  // não entram no saldo do dia a dia. As demais são o dinheiro "líquido".
  const liquidAccounts = accounts.filter((a) => a.type !== "INVESTMENT");
  const investmentAccounts = accounts.filter((a) => a.type === "INVESTMENT");
  const liquidBalance = liquidAccounts.reduce((s, a) => s + (balanceByAccount.get(a.id) ?? 0), 0);
  const investedBalance = investmentAccounts.reduce(
    (s, a) => s + (balanceByAccount.get(a.id) ?? 0),
    0
  );

  // Dinheiro que saiu da conta corrente para uma aplicação automática do banco
  // (EXPENSE) menos o que voltou de lá (INCOME) — continua seu, só "guardado".
  const autoInvestedTotal = transferGroups.reduce((sum, g) => {
    const sign = g.type === "EXPENSE" ? 1 : -1;
    return sum + sign * (g._sum.amount ?? 0);
  }, 0);
  const hasAutoInvestAccount = liquidAccounts.some((a) => a.hasAutoInvest);
  const showAutoInvestBreakdown = hasAutoInvestAccount || autoInvestedTotal !== 0;
  const availableBalance = liquidBalance + autoInvestedTotal;

  const monthTx = recentTransactions.filter(
    (t) => t.date >= monthStart && t.date < monthEnd && !t.isTransfer
  );
  const prevMonthTx = recentTransactions.filter(
    (t) => t.date >= prevMonthStart && t.date < monthStart && !t.isTransfer
  );

  const income = sumByType(monthTx, "INCOME");
  const expense = sumByType(monthTx, "EXPENSE");
  const balance = income - expense;

  const prevIncome = sumByType(prevMonthTx, "INCOME");
  const prevExpense = sumByType(prevMonthTx, "EXPENSE");

  const byCategory = new Map<string, { value: number; color: string }>();
  for (const t of monthTx) {
    if (t.type !== "EXPENSE") continue;
    const key = t.category?.name ?? "Sem categoria";
    const color = t.category?.color ?? "#94a3b8";
    const prev = byCategory.get(key)?.value ?? 0;
    byCategory.set(key, { value: prev + t.amount, color });
  }
  const categoryData = Array.from(byCategory.entries())
    .map(([name, v]) => ({ name, value: v.value, color: v.color }))
    .sort((a, b) => b.value - a.value);

  const monthly: { month: string; Receitas: number; Despesas: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const txs = recentTransactions.filter(
      (t) => t.date >= start && t.date < end && !t.isTransfer
    );
    monthly.push({
      month: MONTHS_PT[start.getMonth()].slice(0, 3),
      Receitas: sumByType(txs, "INCOME"),
      Despesas: sumByType(txs, "EXPENSE"),
    });
  }

  const topExpenses = monthTx
    .filter((t) => t.type === "EXPENSE")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          {entity === "PERSONAL" ? "Pessoal" : "Comercial"} · {MONTHS_PT[now.getMonth()]} de{" "}
          {now.getFullYear()}
        </p>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${showAutoInvestBreakdown ? "sm:grid-cols-3" : ""}`}
      >
        <StatCard
          label="Saldo real disponível"
          value={availableBalance}
          icon={Wallet}
          tone="neutral"
          highlight
        />
        {showAutoInvestBreakdown && (
          <>
            <StatCard label="Saldo transitório" value={liquidBalance} icon={ArrowLeftRight} tone="neutral" />
            <StatCard
              label="Investimento automático"
              value={autoInvestedTotal}
              icon={PiggyBank}
              tone="neutral"
            />
          </>
        )}
      </div>

      {investmentAccounts.length > 0 && (
        <StatCard
          label="Patrimônio investido (à parte)"
          value={investedBalance}
          icon={Landmark}
          tone="neutral"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Resultado do mês"
          value={balance}
          icon={TrendingUp}
          tone={balance >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Receitas do mês"
          value={income}
          icon={TrendingUp}
          tone="positive"
          change={pctChange(income, prevIncome)}
        />
        <StatCard
          label="Despesas do mês"
          value={expense}
          icon={TrendingDown}
          tone="negative"
          change={pctChange(expense, prevExpense)}
          invertChangeColor
        />
      </div>

      {showAutoInvestBreakdown && (
        <p className="text-xs text-slate-500">
          <strong>Saldo real disponível</strong> é quanto você tem de fato, já somando o que está
          aplicado automaticamente. <strong>Saldo transitório</strong> é o que está líquido na conta
          agora. <strong>Investimento automático</strong> é o que o banco moveu sozinho para uma
          aplicação (ex: Rende Fácil) — não conta como gasto.
          {investmentAccounts.length > 0 &&
            " Patrimônio investido à parte é diferente: dinheiro que você decidiu guardar em um investimento de verdade, não entra no saldo do dia a dia."}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium mb-2 text-slate-900">Despesas por categoria (mês atual)</h2>
          <ExpenseByCategoryChart data={categoryData} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium mb-2 text-slate-900">Receitas x Despesas (6 meses)</h2>
          <MonthlyTrendChart data={monthly} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium mb-3 text-slate-900">Maiores despesas do mês</h2>
          {topExpenses.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Nenhuma despesa neste mês.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topExpenses.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{t.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(t.date)}</p>
                  </div>
                  <span className="text-red-600 font-medium whitespace-nowrap ml-3">
                    {formatCurrency(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-medium mb-3 text-slate-900">Ranking de categorias</h2>
          {categoryData.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Sem dados neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {categoryData.slice(0, 6).map((c) => {
                const pct = expense > 0 ? (c.value / expense) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="text-slate-500">{formatCurrency(c.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {accounts.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhuma conta cadastrada ainda. Vá em{" "}
          <a className="text-indigo-600 underline" href={`/accounts?entity=${entity}`}>
            Contas
          </a>{" "}
          para criar a primeira.
        </p>
      )}
    </div>
  );
}

function sumByType(txs: { type: string; amount: number }[], type: "INCOME" | "EXPENSE") {
  return txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  change,
  invertChangeColor,
  highlight,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  change?: number | null;
  invertChangeColor?: boolean;
  highlight?: boolean;
}) {
  const valueColor = highlight
    ? "text-white"
    : tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-slate-900";

  const changeIsGood = change !== undefined && change !== null && (invertChangeColor ? change <= 0 : change >= 0);

  if (highlight) {
    return (
      <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-indigo-100">{label}</p>
          <Icon size={18} className="text-indigo-200" />
        </div>
        <p className={`text-3xl font-bold ${valueColor}`}>{formatCurrency(value)}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon size={16} className="text-slate-400" />
      </div>
      <p className={`text-2xl font-semibold ${valueColor}`}>{formatCurrency(value)}</p>
      {change !== undefined && change !== null && (
        <p className={`text-xs mt-1 ${changeIsGood ? "text-emerald-600" : "text-red-600"}`}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(0)}% vs mês anterior
        </p>
      )}
    </div>
  );
}
