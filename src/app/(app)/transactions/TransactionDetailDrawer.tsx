"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, Clock, Pencil } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { buildCategoryOptions, type CategoryOption } from "@/lib/categoryOptions";
import { updateTransactionDetails, type TransactionDetailsUpdate } from "./actions";
import type { Entity } from "@/lib/types";
import type { TransactionRowData } from "./TransactionsTable";

type CostCenter = { id: string; name: string };

const NEW_CATEGORY_VALUE = "__new__";

export default function TransactionDetailDrawer({
  transaction,
  categories,
  costCenters,
  entity,
  onClose,
  onSaved,
  onCreateCategory,
}: {
  transaction: TransactionRowData | null;
  categories: CategoryOption[];
  costCenters: CostCenter[];
  entity: Entity;
  onClose: () => void;
  onSaved: (id: string, patch: TransactionDetailsUpdate) => void;
  onCreateCategory: (name: string, type: TransactionRowData["type"]) => Promise<CategoryOption | null>;
}) {
  const open = transaction !== null;
  const [cached, setCached] = useState<TransactionRowData | null>(transaction);
  const [loadedId, setLoadedId] = useState<string | null>(transaction?.id ?? null);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [costCenterId, setCostCenterId] = useState(transaction?.costCenterId ?? "");
  const [isTransfer, setIsTransfer] = useState(transaction?.isTransfer ?? false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (transaction && transaction.id !== loadedId) {
    setLoadedId(transaction.id);
    setCached(transaction);
    setCategoryId(transaction.categoryId ?? "");
    setCostCenterId(transaction.costCenterId ?? "");
    setIsTransfer(transaction.isTransfer);
    setCreatingCategory(false);
    setNewCategoryName("");
    setSaved(false);
  }

  const options = cached ? buildCategoryOptions(categories, cached.type) : [];
  const wasAdjusted =
    cached?.reconciledAt != null &&
    new Date(cached.updatedAt).getTime() - new Date(cached.reconciledAt).getTime() > 60_000;

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setCreatingCategory(true);
      return;
    }
    setCategoryId(value);
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name || !cached) return;
    startTransition(async () => {
      const created = await onCreateCategory(name, cached.type);
      if (created) setCategoryId(created.id);
      setCreatingCategory(false);
      setNewCategoryName("");
    });
  }

  function handleSave() {
    if (!cached) return;
    startTransition(async () => {
      const result = await updateTransactionDetails(
        cached.id,
        isTransfer ? null : categoryId || null,
        isTransfer ? null : costCenterId || null,
        isTransfer
      );
      if (result) {
        onSaved(cached.id, result);
        setCached((prev) => (prev ? { ...prev, ...result } : prev));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {cached && (
        <>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">{formatDateTime(cached.date)}</p>
            <h2 className="font-semibold text-slate-900 truncate">{cached.description}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-700 rounded-full p-1 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="rounded-xl p-4 bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white">
            <p className="text-xs text-slate-300">Valor</p>
            <p
              className={`text-2xl font-bold ${
                cached.type === "INCOME" ? "text-emerald-300" : "text-white"
              }`}
            >
              {cached.type === "INCOME" ? "+" : "-"}
              {formatCurrency(cached.amount)}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {cached.accountName} · {cached.source === "import" ? "importado" : "manual"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
            {cached.reconciled ? (
              <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>
                  Conciliado em {cached.reconciledAt ? formatDateTime(cached.reconciledAt) : "—"}
                  {wasAdjusted && (
                    <span className="flex items-center gap-1 text-amber-700 mt-1">
                      <Pencil size={13} />
                      Ajustado em {formatDateTime(cached.updatedAt)}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <Clock size={16} />
                Pendente de conciliação
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isTransfer}
              onChange={(e) => {
                setIsTransfer(e.target.checked);
                setCreatingCategory(false);
              }}
            />
            Transferência / aplicação automática — não conta como despesa/receita
          </label>

          {!isTransfer && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Categoria e subcategoria
                </p>
                {!creatingCategory ? (
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Selecione a categoria…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                    <option value={NEW_CATEGORY_VALUE}>+ Criar nova categoria…</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={handleCreateCategory}
                      className="text-xs bg-slate-800 text-white rounded-md px-2.5 py-2 hover:bg-slate-900 whitespace-nowrap"
                    >
                      Criar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingCategory(false)}
                      className="text-xs text-slate-500 whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {entity === "BUSINESS" && costCenters.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                    Centro de custo
                  </p>
                  <select
                    value={costCenterId}
                    onChange={(e) => setCostCenterId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Nenhum</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-600">Salvo ✓</span>}
          <button
            type="button"
            disabled={pending || (!isTransfer && !categoryId)}
            onClick={handleSave}
            className="ml-auto bg-brand-navy text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-40"
          >
            {cached.reconciled ? "Salvar alterações" : "Confirmar conciliação"}
          </button>
        </div>
        </>
        )}
      </aside>
    </>
  );
}
