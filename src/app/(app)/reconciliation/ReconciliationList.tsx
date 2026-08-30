"use client";

import { useState } from "react";
import ReconciliationRow, { type CategoryOption } from "./ReconciliationRow";
import type { Entity, TransactionType } from "@/lib/types";

export type TransactionRowData = {
  id: string;
  description: string;
  date: Date;
  amount: number;
  type: TransactionType;
  accountName: string;
  categoryId: string | null;
  costCenterId: string | null;
  isTransfer: boolean;
  reconciled: boolean;
};

type CostCenter = { id: string; name: string };

export default function ReconciliationList({
  pending,
  reconciled,
  categories: initialCategories,
  costCenters,
  entity,
  suggestions,
}: {
  pending: TransactionRowData[];
  reconciled: TransactionRowData[];
  categories: CategoryOption[];
  costCenters: CostCenter[];
  entity: Entity;
  suggestions: Record<
    string,
    { categoryId: string | null; costCenterId: string | null; isTransfer: boolean; learned: boolean }
  >;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [showReconciled, setShowReconciled] = useState(false);

  function handleCategoryCreated(cat: CategoryOption) {
    setCategories((prev) => [...prev, cat]);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {pending.length === 0 && (
          <p className="p-6 text-sm text-slate-500 text-center">
            Nada pendente por aqui — todos os lançamentos já estão conciliados. 🎉
          </p>
        )}
        {pending.map((t) => (
          <ReconciliationRow
            key={t.id}
            transaction={t}
            categories={categories}
            costCenters={costCenters}
            suggestedCategoryId={suggestions[t.id]?.categoryId ?? null}
            suggestedCostCenterId={suggestions[t.id]?.costCenterId ?? null}
            suggestedIsTransfer={suggestions[t.id]?.isTransfer ?? false}
            suggestionLearned={suggestions[t.id]?.learned ?? false}
            entity={entity}
            onCategoryCreated={handleCategoryCreated}
          />
        ))}
      </div>

      {reconciled.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowReconciled((v) => !v)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-2"
          >
            {showReconciled ? "▾" : "▸"} Já conciliados ({reconciled.length}) — clique para editar
          </button>
          {showReconciled && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {reconciled.map((t) => (
                <ReconciliationRow
                  key={t.id}
                  transaction={t}
                  categories={categories}
                  costCenters={costCenters}
                  suggestedCategoryId={null}
                  suggestedIsTransfer={false}
                  entity={entity}
                  onCategoryCreated={handleCategoryCreated}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
