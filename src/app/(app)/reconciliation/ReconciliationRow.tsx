"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmReconciliation, quickCreateCategory } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Entity, TransactionType } from "@/lib/types";

type Category = { id: string; name: string; color: string };
type CostCenter = { id: string; name: string };

const NEW_CATEGORY_VALUE = "__new__";

export default function ReconciliationRow({
  transaction,
  categories: initialCategories,
  costCenters,
  suggestedCategoryId,
  suggestedIsTransfer,
  entity,
}: {
  transaction: {
    id: string;
    description: string;
    date: Date;
    amount: number;
    type: TransactionType;
    accountName: string;
  };
  categories: Category[];
  costCenters: CostCenter[];
  suggestedCategoryId: string | null;
  suggestedIsTransfer: boolean;
  entity: Entity;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryId, setCategoryId] = useState(suggestedCategoryId ?? "");
  const [costCenterId, setCostCenterId] = useState("");
  const [isTransfer, setIsTransfer] = useState(suggestedIsTransfer);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const wasSuggested = suggestedCategoryId !== null && categoryId === suggestedCategoryId;

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategory(true);
      return;
    }
    setCategoryId(value);
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    startTransition(async () => {
      const created = await quickCreateCategory(name, transaction.type, entity);
      if (created) {
        setCategories((prev) => [...prev, created]);
        setCategoryId(created.id);
      }
      setCreatingCategory(false);
      setNewCategoryName("");
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      await confirmReconciliation(
        transaction.id,
        categoryId || null,
        costCenterId || null,
        isTransfer
      );
      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-emerald-700 bg-emerald-50">
        <CheckCircle2 size={18} />
        <span className="flex-1 truncate">{transaction.description}</span>
        <span className="font-medium">{formatCurrency(transaction.amount)}</span>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 sm:w-64">
        <p className="text-sm font-medium text-slate-800 truncate">{transaction.description}</p>
        <p className="text-xs text-slate-400">
          {formatDate(transaction.date)} · {transaction.accountName}
        </p>
      </div>

      <span
        className={`text-sm font-medium whitespace-nowrap sm:w-28 ${
          transaction.type === "INCOME" ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {transaction.type === "INCOME" ? "+" : "-"}
        {formatCurrency(transaction.amount)}
      </span>

      <div className="flex-1 flex flex-wrap items-center gap-2">
        {!isTransfer && !creatingCategory ? (
          <select
            value={categoryId}
            onChange={(e) => handleCategorySelect(e.target.value)}
            className={`border rounded-md px-2 py-1.5 text-sm ${
              wasSuggested ? "border-indigo-300 bg-indigo-50" : "border-slate-300"
            }`}
          >
            <option value="">Selecione a categoria…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ Criar nova categoria…</option>
          </select>
        ) : isTransfer ? (
          <span className="text-xs text-slate-500 italic">
            Não conta como despesa/receita — só muda de lugar.
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome da categoria"
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm w-40"
            />
            <button
              type="button"
              disabled={pending}
              onClick={handleCreateCategory}
              className="text-xs bg-slate-800 text-white rounded-md px-2 py-1.5 hover:bg-slate-900"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setCreatingCategory(false)}
              className="text-xs text-slate-500"
            >
              Cancelar
            </button>
          </span>
        )}

        {wasSuggested && !creatingCategory && !isTransfer && (
          <span className="text-xs text-indigo-600">sugerido</span>
        )}

        <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isTransfer}
            onChange={(e) => {
              setIsTransfer(e.target.checked);
              setCreatingCategory(false);
            }}
          />
          Transferência / aplicação
          {suggestedIsTransfer && <span className="text-indigo-600">(sugerido)</span>}
        </label>

        {entity === "BUSINESS" && !isTransfer && costCenters.length > 0 && (
          <select
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="">Centro de custo (opcional)</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="button"
        disabled={pending || (!isTransfer && !categoryId)}
        onClick={handleConfirm}
        className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap"
      >
        Confirmar
      </button>
    </div>
  );
}
