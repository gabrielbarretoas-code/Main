"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { confirmReconciliation, quickCreateCategory } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CategoryOption } from "@/lib/categoryOptions";
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker";
import type { Entity } from "@/lib/types";
import type { TransactionRowData } from "./ReconciliationList";

export type { CategoryOption };
type CostCenter = { id: string; name: string };

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
  const [confirmed, setConfirmed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const wasSuggested =
    !wasAlreadyReconciled && suggestedCategoryId !== null && categoryId === suggestedCategoryId;

  async function handleCreateCategory(
    name: string,
    type: typeof transaction.type,
    parentId: string | null
  ): Promise<CategoryOption | null> {
    const created = await quickCreateCategory(name, type, entity, parentId);
    if (!created) return null;
    return { ...created, parentId, type };
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
        {!isTransfer ? (
          <span className={wasSuggested ? "rounded-md ring-2 ring-brand-gold" : undefined}>
            <CategorySubcategoryPicker
              type={transaction.type}
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              onCategoryCreated={onCategoryCreated}
              createCategory={handleCreateCategory}
            />
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">
            Não conta como despesa/receita — só muda de lugar.
          </span>
        )}

        {wasSuggested && (
          <span className="text-xs text-brand-navy font-medium">sugerido</span>
        )}

        <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isTransfer}
            onChange={(e) => setIsTransfer(e.target.checked)}
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
