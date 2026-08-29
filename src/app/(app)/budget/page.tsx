import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, MONTHS_PT } from "@/lib/format";
import { upsertBudget } from "./actions";
import { requireOrganizationId } from "@/lib/session";
import { getCategoryIcon } from "@/lib/categoryIcons";

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
      where: { entity, type: "EXPENSE", organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({ where: { entity, month, year, organizationId } }),
    prisma.transaction.findMany({
      where: { entity, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd }, organizationId },
    }),
  ]);

  const parents = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }

  const spentByCategoryId = new Map<string, number>();
  for (const t of transactions) {
    if (!t.categoryId) continue;
    spentByCategoryId.set(t.categoryId, (spentByCategoryId.get(t.categoryId) ?? 0) + t.amount);
  }

  // Orçamento por categoria-mãe soma o gasto dela + de todas as subcategorias.
  function spentForParent(parentId: string): number {
    const own = spentByCategoryId.get(parentId) ?? 0;
    const children = childrenByParent.get(parentId) ?? [];
    return own + children.reduce((s, c) => s + (spentByCategoryId.get(c.id) ?? 0), 0);
  }

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));

  const totalPlanned = budgets.reduce((s, b) => s + b.plannedAmount, 0);
  const totalSpent = parents.reduce((s, p) => s + spentForParent(p.id), 0);

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

      <div className="rounded-xl p-5 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex flex-wrap gap-8">
        <div>
          <p className="text-xs text-indigo-100">Orçado total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPlanned)}</p>
        </div>
        <div>
          <p className="text-xs text-indigo-100">Realizado total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-indigo-100">Sobra</p>
          <p className={`text-2xl font-bold ${totalPlanned - totalSpent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {formatCurrency(totalPlanned - totalSpent)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parents.length === 0 && (
          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4 md:col-span-2">
            Cadastre categorias de despesa para planejar o orçamento.
          </p>
        )}
        {parents.map((c) => {
          const planned = budgetByCategory.get(c.id)?.plannedAmount ?? 0;
          const spent = spentForParent(c.id);
          const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
          const over = planned > 0 && spent > planned;
          const near = !over && planned > 0 && pct >= 80;
          const Icon = getCategoryIcon(c.icon);
          const barColor = over ? "#ef4444" : near ? "#f59e0b" : c.color;

          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${c.color}20`, color: c.color }}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="font-medium text-sm text-slate-800">{c.name}</span>
                </span>
                {over && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    estourou
                  </span>
                )}
                {near && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    quase lá
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>{formatCurrency(spent)} gasto</span>
                  <span>{formatCurrency(planned)} planejado</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${planned > 0 ? pct : 0}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>

              <form action={upsertBudget} className="flex gap-2 items-center">
                <input type="hidden" name="categoryId" value={c.id} />
                <input type="hidden" name="entity" value={entity} />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="year" value={year} />
                <input
                  name="plannedAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Valor planejado"
                  defaultValue={planned > 0 ? planned : ""}
                  className="input text-xs py-1.5"
                />
                <button className="text-xs bg-slate-100 text-slate-700 font-medium rounded-lg px-3 py-1.5 hover:bg-slate-200 whitespace-nowrap">
                  Salvar
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
