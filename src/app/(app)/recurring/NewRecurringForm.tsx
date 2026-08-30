"use client";

import { useRef, useState } from "react";
import { createRecurring } from "./actions";
import { quickCreateCategory } from "../reconciliation/actions";
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker";
import type { CategoryOption } from "@/lib/categoryOptions";
import type { Entity, TransactionType } from "@/lib/types";

type Option = { id: string; name: string };

export default function NewRecurringForm({
  entity,
  accounts,
  categories: initialCategories,
  costCenters,
}: {
  entity: Entity;
  accounts: Option[];
  categories: CategoryOption[];
  costCenters: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  async function handleCreateCategory(name: string, catType: TransactionType, parentId: string | null) {
    const created = await quickCreateCategory(name, catType, entity, parentId);
    if (!created) return null;
    const option: CategoryOption = { ...created, parentId, type: catType };
    setCategories((prev) => [...prev, option]);
    return option;
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        fd.set("categoryId", categoryId);
        await createRecurring(fd);
        formRef.current?.reset();
        setCategoryId("");
        setType("EXPENSE");
      }}
      className="flex flex-wrap gap-3 items-end"
    >
      <input type="hidden" name="entity" value={entity} />
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs text-slate-500 mb-1">Descrição</label>
        <input name="description" required placeholder="Ex: Aluguel" className="input w-full" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Valor (R$)</label>
        <input
          name="amount"
          required
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="input w-28"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
        <select
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType);
            setCategoryId("");
          }}
          className="input"
        >
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Dia do mês</label>
        <input
          name="dayOfMonth"
          type="number"
          min={1}
          max={31}
          defaultValue={5}
          className="input w-20"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Conta</label>
        <select name="accountId" required className="input">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {entity === "BUSINESS" && costCenters.length > 0 && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Centro de custo</label>
          <select name="costCenterId" className="input">
            <option value="">Nenhum</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoria</label>
        <CategorySubcategoryPicker
          type={type}
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCategoryCreated={() => {}}
          createCategory={handleCreateCategory}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Começa em</label>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Termina em (opcional)</label>
        <input name="endDate" type="date" className="input" />
      </div>
      <button
        disabled={accounts.length === 0}
        className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-50"
      >
        Adicionar
      </button>
      {accounts.length === 0 && (
        <p className="text-xs text-red-500 w-full">Cadastre uma conta antes de criar uma recorrência.</p>
      )}
    </form>
  );
}
