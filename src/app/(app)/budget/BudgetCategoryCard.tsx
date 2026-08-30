import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/format";
import { upsertBudget } from "./actions";
import type { Entity, TransactionType } from "@/lib/types";

export default function BudgetCategoryCard({
  category,
  icon,
  planned,
  actual,
  type,
  month,
  year,
  entity,
}: {
  category: { id: string; name: string; color: string };
  icon: ReactNode;
  planned: number;
  actual: number;
  type: TransactionType;
  month: number;
  year: number;
  entity: Entity;
}) {
  const pct = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;

  let badge: { label: string; className: string } | null = null;
  let barColor = category.color;

  if (type === "EXPENSE") {
    const over = planned > 0 && actual > planned;
    const near = !over && planned > 0 && pct >= 80;
    if (over) {
      badge = { label: "estourou", className: "text-red-600 bg-red-50" };
      barColor = "#ef4444";
    } else if (near) {
      badge = { label: "quase lá", className: "text-amber-600 bg-amber-50" };
      barColor = "#f59e0b";
    }
  } else {
    const reached = planned > 0 && actual >= planned;
    const near = !reached && planned > 0 && pct >= 80;
    if (reached) {
      badge = { label: "meta batida", className: "text-emerald-600 bg-emerald-50" };
      barColor = "#22c55e";
    } else if (near) {
      badge = { label: "quase lá", className: "text-amber-600 bg-amber-50" };
      barColor = "#f59e0b";
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {icon}
          </span>
          <span className="font-medium text-sm text-slate-800">{category.name}</span>
        </span>
        {badge && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>
            {formatCurrency(actual)} {type === "INCOME" ? "recebido" : "gasto"}
          </span>
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
        <input type="hidden" name="categoryId" value={category.id} />
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
}
