"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Unlink, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { syncOpenFinanceConnection, removeOpenFinanceConnection } from "./openFinanceActions";

export type ConnectionRow = {
  id: string;
  institutionName: string;
  status: string;
  lastSyncedAt: Date | null;
  accountNames: string[];
};

const STATUS_LABEL: Record<string, string> = {
  UPDATED: "Sincronizado",
  UPDATING: "Sincronizando…",
  LOGIN_ERROR: "Erro de login — reconecte",
  OUTDATED: "Desatualizado",
  WAITING_USER_INPUT: "Aguardando confirmação",
  ERROR: "Erro",
};

export default function OpenFinanceConnectionsList({ connections }: { connections: ConnectionRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, string>>({});

  if (connections.length === 0) return null;

  function handleSync(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await syncOpenFinanceConnection(id);
      setMessages((prev) => ({
        ...prev,
        [id]: result.ok ? `${result.imported} lançamento(s) novo(s) importado(s).` : result.error,
      }));
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await removeOpenFinanceConnection(id);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {connections.map((c) => {
        const ok = c.status === "UPDATED";
        return (
          <div key={c.id} className="p-3.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                  ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
              <p className="font-medium text-slate-800">{c.institutionName}</p>
              <p className="text-xs text-slate-400">{c.accountNames.join(", ")}</p>
              <span className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending && pendingId === c.id}
                  onClick={() => handleSync(c.id)}
                  className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 hover:bg-slate-200 disabled:opacity-40"
                >
                  <RefreshCw size={12} />
                  Sincronizar agora
                </button>
                <button
                  type="button"
                  disabled={pending && pendingId === c.id}
                  onClick={() => handleRemove(c.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-40"
                >
                  <Unlink size={12} />
                  Desconectar
                </button>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {c.lastSyncedAt ? `Última sincronização: ${formatDateTime(c.lastSyncedAt)}` : "Ainda não sincronizado"}
            </p>
            {messages[c.id] && <p className="text-xs text-slate-500">{messages[c.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}
