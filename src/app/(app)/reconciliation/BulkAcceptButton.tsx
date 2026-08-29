"use client";

import { useTransition } from "react";
import { bulkConfirmSuggested } from "./actions";
import type { Entity } from "@/lib/types";

export default function BulkAcceptButton({ entity, count }: { entity: Entity; count: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => bulkConfirmSuggested(entity))}
      className="text-sm bg-emerald-600 text-white rounded-md px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? "Aplicando..." : `Aceitar ${count} sugestão(ões) automaticamente`}
    </button>
  );
}
