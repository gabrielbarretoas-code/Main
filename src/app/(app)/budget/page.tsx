import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, MONTHS_PT } from "@/lib/format";
import { requireOrganizationId } from "@/lib/session";
import { getCategoryIcon } from "@/lib/categoryIcons";
import BudgetCategoryCard from "./BudgetCategoryCard";
import type { TransactionType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: PageProps<"/budget">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();
  const now = new Date();
  const month = sp.month ? parseInt(String(sp.month), 10) : now.getMonth() + 1;
  const year = sp.year ? parseInt(String(sp.year), 10) : now.getFullYear();

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [categories, budgets, transactions] = await Promise.all([
    prisma.category.findMany({
      where: { entity, organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({ where: { entity, month, year, organizationId } }),
    prisma.transaction.findMany({
      where: { entity, date: { gte: monthStart, lt: monthEnd }, organizationId, isTransfer: false },
    }),
  ]);

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));

  function buildSection(type: TransactionType) {
    const typeCategories = categories.filter((c) => c.type === type);
    const parents = typeCategories.filter((c) => !c.parentId);
    const childrenByParent = new Map<string, typeof categories>();
    for (const c of typeCategories) {
      if (!c.parentId) continue;
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }

    const amountByCategoryId = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== type || !t.categoryId) continue;
      amountByCategoryId.set(t.categoryId, (amountByCategoryId.get(t.categoryId) ?? 0) + t.amount);
    }

    // Orçamento por categoria-mãe soma o valor dela + de todas as subcategorias.
    function amountForParent(parentId: string): number {
      const own = amountByCategoryId.get(parentId) ?? 0;
      const children = childrenByParent.get(parentId) ?? [];
      return own + children.reduce((s, c) => s + (amountByCategoryId.get(c.id) ?? 0), 0);
    }

    const totalPlanned = parents.reduce((s, p) => s + (budgetByCategory.get(p.id)?.plannedAmount ?? 0), 0);
    const totalActual = parents.reduce((s, p) => s + amountForParent(p.id), 0);

    return { parents, amountForParent, totalPlanned, totalActual };
  }

  const income = buildSection("INCOME");
  const expense = buildSection("EXPENSE");
  const plannedResult = income.totalPlanned - expense.totalPlanned;
  const actualResult = income.totalActual - expense.totalActual;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Orçamento — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <form className="flex gap-2 items-center text-sm">
          <input type="hidden" name="entity" value={entity} />
          <select name="month" defaultValue={month} className="border border-slate-300 rounded-lg px-2 py-1.5">
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
            className="border border-slate-300 rounded-lg px-2 py-1.5 w-20"
          />
          <button className="bg-slate-800 text-white rounded-lg px-3 py-1.5 font-medium">
            Ver
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-emerald-100">Receita planejada</p>
            <p className="text-xl font-bold">{formatCurrency(income.totalPlanned)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Recebido</p>
            <p className="text-xl font-bold">{formatCurrency(income.totalActual)}</p>
          </div>
        </div>
        <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-slate-300">Despesa planejada</p>
            <p className="text-xl font-bold">{formatCurrency(expense.totalPlanned)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-300">Gasto</p>
            <p className="text-xl font-bold">{formatCurrency(expense.totalActual)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 border border-slate-200 bg-white flex flex-wrap gap-8">
        <div>
          <p className="text-xs text-slate-500">Resultado planejado (receita − despesa)</p>
          <p className={`text-xl font-bold ${plannedResult >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(plannedResult)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Resultado realizado</p>
          <p className={`text-xl font-bold ${actualResult >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(actualResult)}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Receitas previstas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {income.parents.length === 0 && (
            <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4 md:col-span-2">
              Cadastre categorias de receita (Salário, Retiradas, Vendas, Comissões, etc) para planejar
              quanto espera receber neste mês.
            </p>
          )}
          {income.parents.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            return (
              <BudgetCategoryCard
                key={c.id}
                category={c}
                icon={<Icon size={18} />}
                planned={budgetByCategory.get(c.id)?.plannedAmount ?? 0}
                actual={income.amountForParent(c.id)}
                type="INCOME"
                month={month}
                year={year}
                entity={entity}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Despesas previstas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expense.parents.length === 0 && (
            <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4 md:col-span-2">
              Cadastre categorias de despesa para planejar o orçamento.
            </p>
          )}
          {expense.parents.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            return (
              <BudgetCategoryCard
                key={c.id}
                category={c}
                icon={<Icon size={18} />}
                planned={budgetByCategory.get(c.id)?.plannedAmount ?? 0}
                actual={expense.amountForParent(c.id)}
                type="EXPENSE"
                month={month}
                year={year}
                entity={entity}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
