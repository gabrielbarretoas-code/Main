import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { formatCurrency, MONTHS_PT } from "@/lib/format";
import { upsertBudget } from "./actions";
import { requireOrganizationId } from "@/lib/session";

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

  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (!t.categoryId) continue;
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amount);
  }
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b]));

  const totalPlanned = budgets.reduce((s, b) => s + b.plannedAmount, 0);
  const totalSpent = Array.from(spentByCategory.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Orçamento — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <form className="flex gap-2 items-center text-sm">
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
            className="border border-slate-300 rounded-md px-2 py-1 w-20"
          />
          <button className="bg-slate-800 text-white rounded-md px-3 py-1 font-medium">
            Ver
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-slate-500">Orçado total</p>
          <p className="text-xl font-semibold">{formatCurrency(totalPlanned)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Realizado total</p>
          <p className="text-xl font-semibold">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Diferença</p>
          <p
            className={`text-xl font-semibold ${
              totalPlanned - totalSpent >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatCurrency(totalPlanned - totalSpent)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {categories.length === 0 && (
          <p className="p-4 text-sm text-slate-500">
            Cadastre categorias de despesa para planejar o orçamento.
          </p>
        )}
        {categories.map((c) => {
          const planned = budgetByCategory.get(c.id)?.plannedAmount ?? 0;
          const spent = spentByCategory.get(c.id) ?? 0;
          const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
          const over = planned > 0 && spent > planned;
          return (
            <div key={c.id} className="p-4">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
                <span className="text-xs text-slate-500">
                  {formatCurrency(spent)} de {formatCurrency(planned)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                <div
                  className={`h-full ${over ? "bg-red-500" : "bg-indigo-500"}`}
                  style={{ width: `${planned > 0 ? pct : 0}%` }}
                />
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
                  className="border border-slate-300 rounded-md px-2 py-1 text-xs w-32"
                />
                <button className="text-xs text-indigo-600 font-medium hover:underline">
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
