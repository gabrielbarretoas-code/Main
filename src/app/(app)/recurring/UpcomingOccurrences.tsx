"use client";

import { useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { launchOccurrence } from "./actions";
import type { Entity } from "@/lib/types";

export type Occurrence = {
  key: string;
  recurringId: string;
  date: string; // ISO
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  accountName: string;
  categoryName: string | null;
  launchedTransactionId: string | null;
};

export default function UpcomingOccurrences({
  occurrences,
  entity,
}: {
  occurrences: Occurrence[];
  entity: Entity;
}) {
  const [pending, startTransition] = useTransition();

  if (occurrences.length === 0) {
    return (
      <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
        Nenhuma ocorrência prevista nos próximos meses.
      </p>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {occurrences.map((o) => (
        <div key={o.key} className="flex flex-wrap items-center gap-3 p-3.5">
          <div className="min-w-[90px]">
            <p className="text-sm font-medium text-slate-800">{formatDate(new Date(o.date))}</p>
          </div>
          <div className="flex-1 min-w-[160px]">
            <p className="text-sm text-slate-800 truncate">{o.description}</p>
            <p className="text-xs text-slate-400 truncate">
              {o.accountName}
              {o.categoryName ? ` · ${o.categoryName}` : ""}
            </p>
          </div>
          <span
            className={`text-sm font-medium whitespace-nowrap ${
              o.type === "INCOME" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {o.type === "INCOME" ? "+" : "-"}
            {formatCurrency(o.amount)}
          </span>

          {o.launchedTransactionId ? (
            <Link
              href={`/transactions?entity=${entity}&open=${o.launchedTransactionId}`}
              className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full font-medium hover:bg-emerald-100 whitespace-nowrap"
            >
              <CheckCircle2 size={13} />
              Lançado
            </Link>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => launchOccurrence(o.recurringId, o.date))}
              className="flex items-center gap-1.5 text-xs bg-brand-navy text-white px-2.5 py-1.5 rounded-full font-medium hover:bg-brand-navy-light disabled:opacity-40 whitespace-nowrap"
            >
              <Clock size={13} />
              Lançar agora
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
