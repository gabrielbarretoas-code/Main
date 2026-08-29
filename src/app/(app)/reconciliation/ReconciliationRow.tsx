"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmReconciliation, quickCreateCategory } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildCategoryOptions, type CategoryOption } from "@/lib/categoryOptions";
import type { Entity } from "@/lib/types";
import type { TransactionRowData } from "./ReconciliationList";

export type { CategoryOption };
type CostCenter = { id: string; name: string };

const NEW_CATEGORY_VALUE = "__new__";

export default function ReconciliationRow({
  transaction,
  categories,
  costCenters,
  suggestedCategoryId,
  suggestedIsTransfer,
  entity,
  onCategoryCreated,
}: {
  transaction: TransactionRowData;
  categories: CategoryOption[];
  costCenters: CostCenter[];
  suggestedCategoryId: string | null;
  suggestedIsTransfer: boolean;
  entity: Entity;
  onCategoryCreated: (cat: CategoryOption) => void;
}) {
  const wasAlreadyReconciled = transaction.reconciled;
  const [categoryId, setCategoryId] = useState(
    transaction.categoryId ?? suggestedCategoryId ?? ""
  );
  const [costCenterId, setCostCenterId] = useState(transaction.costCenterId ?? "");
  const [isTransfer, setIsTransfer] = useState(transaction.isTransfer || suggestedIsTransfer);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const wasSuggested =
    !wasAlreadyReconciled && suggestedCategoryId !== null && categoryId === suggestedCategoryId;
  const options = buildCategoryOptions(categories, transaction.type);

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
        onCategoryCreated({ ...created, parentId: null, type: transaction.type });
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
      if (wasAlreadyReconciled) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else {
        setConfirmed(true);
      }
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
              wasSuggested ? "border-brand-gold bg-brand-gold-light" : "border-slate-300"
            }`}
          >
            <option value="">Selecione a categoria…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
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

        {wasSuggested && !creatingCategory && (
          <span className="text-xs text-brand-navy font-medium">sugerido</span>
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
          {suggestedIsTransfer && <span className="text-brand-navy font-medium">(sugerido)</span>}
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

      {justSaved && <span className="text-xs text-emerald-600 whitespace-nowrap">Salvo ✓</span>}

      <button
        type="button"
        disabled={pending || (!isTransfer && !categoryId)}
        onClick={handleConfirm}
        className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-40 whitespace-nowrap"
      >
        {wasAlreadyReconciled ? "Salvar" : "Confirmar"}
      </button>
    </div>
  );
}
