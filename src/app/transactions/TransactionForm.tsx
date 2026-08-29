"use client";

import { useRef } from "react";
import { createTransaction } from "./actions";

type Option = { id: string; name: string };

export default function TransactionForm({
  entity,
  accounts,
  categories,
}: {
  entity: string;
  accounts: Option[];
  categories: (Option & { type: string })[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await createTransaction(fd);
        formRef.current?.reset();
      }}
      className="flex flex-wrap gap-3 items-end"
    >
      <input type="hidden" name="entity" value={entity} />
      <div>
        <label className="block text-xs text-slate-500 mb-1">Data</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs text-slate-500 mb-1">Descrição</label>
        <input
          name="description"
          required
          placeholder="Ex: Supermercado"
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Valor (R$)</label>
        <input
          name="amount"
          required
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-28"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
        <select name="type" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm">
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Conta</label>
        <select
          name="accountId"
          required
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Categoria</label>
        <select name="categoryId" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm">
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={accounts.length === 0}
        className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        Adicionar
      </button>
      {accounts.length === 0 && (
        <p className="text-xs text-red-500 w-full">
          Cadastre uma conta antes de lançar transações.
        </p>
      )}
    </form>
  );
}
