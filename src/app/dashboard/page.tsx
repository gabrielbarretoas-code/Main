import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, MONTHS_PT } from "@/lib/format";
import {
  ExpenseByCategoryChart,
  MonthlyTrendChart,
} from "@/components/charts/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthTransactions = await prisma.transaction.findMany({
    where: { entity, date: { gte: monthStart, lt: monthEnd } },
    include: { category: true },
  });

  const income = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const accounts = await prisma.account.findMany({ where: { entity } });
  const accountsBalance = await Promise.all(
    accounts.map(async (a) => {
      const txs = await prisma.transaction.findMany({ where: { accountId: a.id } });
      const bal = txs.reduce(
        (s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount),
        0
      );
      return bal;
    })
  );
  const totalBalance = accountsBalance.reduce((s, b) => s + b, 0);

  const byCategory = new Map<string, { value: number; color: string }>();
  for (const t of monthTransactions) {
    if (t.type !== "EXPENSE") continue;
    const key = t.category?.name ?? "Sem categoria";
    const color = t.category?.color ?? "#94a3b8";
    const prev = byCategory.get(key)?.value ?? 0;
    byCategory.set(key, { value: prev + t.amount, color });
  }
  const categoryData = Array.from(byCategory.entries()).map(([name, v]) => ({
    name,
    value: v.value,
    color: v.color,
  }));

  const monthly: { month: string; Receitas: number; Despesas: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const txs = await prisma.transaction.findMany({
      where: { entity, date: { gte: start, lt: end } },
    });
    monthly.push({
      month: MONTHS_PT[start.getMonth()].slice(0, 3),
      Receitas: txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0),
      Despesas: txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Dashboard — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo total (contas)" value={totalBalance} tone="neutral" />
        <StatCard label="Receitas do mês" value={income} tone="positive" />
        <StatCard label="Despesas do mês" value={expense} tone="negative" />
        <StatCard label="Resultado do mês" value={balance} tone={balance >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-medium mb-2">Despesas por categoria (mês atual)</h2>
          <ExpenseByCategoryChart data={categoryData} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-medium mb-2">Receitas x Despesas (6 meses)</h2>
          <MonthlyTrendChart data={monthly} />
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}
