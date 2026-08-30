"use client";

import { useRef, useState } from "react";
import { createLoan } from "./actions";
import { quickCreateCategory } from "../reconciliation/actions";
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker";
import type { CategoryOption } from "@/lib/categoryOptions";
import type { Entity, TransactionType } from "@/lib/types";

type Option = { id: string; name: string };
type LoanDirection = "BORROWED" | "LENT";

export default function NewLoanForm({
  entity,
  accounts,
  categories: initialCategories,
}: {
  entity: Entity;
  accounts: Option[];
  categories: CategoryOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [direction, setDirection] = useState<LoanDirection>("BORROWED");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState(initialCategories);

  // A categoria do lançamento do principal segue a direção: tomado = receita, efetuado = despesa.
  const categoryType: TransactionType = direction === "BORROWED" ? "INCOME" : "EXPENSE";

  async function handleCreateCategory(name: string, type: TransactionType, parentId: string | null) {
    const created = await quickCreateCategory(name, type, entity, parentId);
    if (!created) return null;
    const option: CategoryOption = { ...created, parentId, type };
    setCategories((prev) => [...prev, option]);
    return option;
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        fd.set("categoryId", categoryId);
        await createLoan(fd);
        formRef.current?.reset();
        setCategoryId("");
        setDirection("BORROWED");
      }}
      className="flex flex-wrap gap-3 items-end"
    >
      <input type="hidden" name="entity" value={entity} />
      <div>
        <label className="block text-xs text-slate-500 mb-1">Direção</label>
        <select
          name="direction"
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value as LoanDirection);
            setCategoryId("");
          }}
          className="input"
        >
          <option value="BORROWED">Tomado (peguei emprestado)</option>
          <option value="LENT">Efetuado (emprestei)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Contraparte</label>
        <input name="counterparty" required placeholder="Ex: Banco XPTO / João" className="input" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Valor principal (R$)</label>
        <input name="principal" required type="text" inputMode="decimal" placeholder="0,00" className="input w-28" />
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
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoria</label>
        <CategorySubcategoryPicker
          type={categoryType}
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCategoryCreated={() => {}}
          createCategory={handleCreateCategory}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Data de início</label>
        <input
          name="startDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nº de parcelas</label>
        <input name="installmentCount" type="number" min={1} defaultValue={12} className="input w-20" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Valor da parcela (R$)</label>
        <input
          name="installmentAmount"
          required
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="input w-28"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Dia de vencimento</label>
        <input name="installmentDay" type="number" min={1} max={31} defaultValue={10} className="input w-20" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Juros % a.m. (opcional)</label>
        <input name="interestRate" type="text" inputMode="decimal" placeholder="0,00" className="input w-24" />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs text-slate-500 mb-1">Observação (opcional)</label>
        <input name="note" className="input w-full" />
      </div>
      <button
        disabled={accounts.length === 0}
        className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-50"
      >
        Adicionar
      </button>
      {accounts.length === 0 && (
        <p className="text-xs text-red-500 w-full">Cadastre uma conta antes de registrar um empréstimo.</p>
      )}
    </form>
  );
}
