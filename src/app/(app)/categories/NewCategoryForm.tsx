"use client";

import { useMemo, useState } from "react";
import { createCategory } from "./actions";
import { CATEGORY_ICON_NAMES, getCategoryIcon } from "@/lib/categoryIcons";
import type { Entity, TransactionType } from "@/lib/types";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

type ParentOption = { id: string; name: string; type: TransactionType; icon: string; color: string };

export default function NewCategoryForm({
  entity,
  parents,
}: {
  entity: Entity;
  parents: ParentOption[];
}) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(CATEGORY_ICON_NAMES[0]);
  const [parentId, setParentId] = useState("");

  const availableParents = useMemo(() => parents.filter((p) => p.type === type), [parents, type]);

  return (
    <form action={createCategory} className="space-y-3">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 mb-1">Nome</label>
          <input
            name="name"
            required
            className="input"
            placeholder="Ex: Manutenção do Veículo"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tipo</label>
          <select
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TransactionType);
              setParentId("");
            }}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Categoria-mãe (opcional)</label>
          <select
            name="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Nenhuma — categoria principal</option>
            {availableParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button className="bg-brand-navy text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light shadow-sm">
          Adicionar
        </button>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1.5">Cor</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-transform ${
                color === c ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1.5">Ícone</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICON_NAMES.map((name) => {
            const Icon = getCategoryIcon(name);
            const selected = icon === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                  selected
                    ? "border-brand-navy bg-brand-gold-light text-brand-navy scale-110 shadow-sm"
                    : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
