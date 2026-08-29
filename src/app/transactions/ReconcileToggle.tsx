"use client";

import { useTransition } from "react";
import { toggleReconciled } from "./actions";

export default function ReconcileToggle({
  id,
  reconciled,
}: {
  id: string;
  reconciled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleReconciled(id, !reconciled))}
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        reconciled
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
      title="Clique para alternar conciliação"
    >
      {reconciled ? "Conciliado" : "Pendente"}
    </button>
  );
}
