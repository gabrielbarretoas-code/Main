"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CategoryOption } from "@/lib/categoryOptions";
import type { Entity, TransactionType } from "@/lib/types";
import { deleteTransaction, type TransactionDetailsUpdate } from "./actions";
import { quickCreateCategory } from "../reconciliation/actions";
import TransactionDetailDrawer from "./TransactionDetailDrawer";

export type TransactionRowData = {
  id: string;
  description: string;
  date: Date;
  amount: number;
  type: TransactionType;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  costCenterId: string | null;
  isTransfer: boolean;
  reconciled: boolean;
  reconciledAt: Date | null;
  updatedAt: Date;
  source: string;
};

type CostCenter = { id: string; name: string };

export default function TransactionsTable({
  transactions: initialTransactions,
  categories: initialCategories,
  costCenters,
  entity,
}: {
  transactions: TransactionRowData[];
  categories: CategoryOption[];
  costCenters: CostCenter[];
  entity: Entity;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = transactions.find((t) => t.id === selectedId) ?? null;

  function handleSaved(id: string, patch: TransactionDetailsUpdate) {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const category = patch.categoryId ? categories.find((c) => c.id === patch.categoryId) : null;
        return {
          ...t,
          ...patch,
          categoryName: category?.name ?? null,
          categoryColor: category?.color ?? null,
        };
      })
    );
  }

  async function handleCreateCategory(name: string, type: TransactionType) {
    const created = await quickCreateCategory(name, type, entity);
    if (!created) return null;
    const option: CategoryOption = { ...created, parentId: null, type };
    setCategories((prev) => [...prev, option]);
    return option;
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="p-3 font-medium">Data</th>
              <th className="p-3 font-medium">Descrição</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Conta</th>
              <th className="p-3 font-medium text-right">Valor</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  Nenhum lançamento ainda.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50"
              >
                <td className="p-3 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="p-3">{t.description}</td>
                <td className="p-3">
                  {t.isTransfer ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Transferência
                    </span>
                  ) : t.categoryName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: t.categoryColor ?? "#94a3b8" }}
                      />
                      {t.categoryName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="p-3">{t.accountName}</td>
                <td
                  className={`p-3 text-right font-medium whitespace-nowrap ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.reconciled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {t.reconciled ? "Conciliado" : "Pendente"}
                  </span>
                </td>
                <td className="p-3">
                  <form
                    action={deleteTransaction.bind(null, t.id)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="text-xs text-red-500 hover:underline">Remover</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionDetailDrawer
        transaction={selected}
        categories={categories}
        costCenters={costCenters}
        entity={entity}
        onClose={() => setSelectedId(null)}
        onSaved={handleSaved}
        onCreateCategory={handleCreateCategory}
      />
    </>
  );
}
