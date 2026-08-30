"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Landmark } from "lucide-react";
import { getConnectToken, handleItemConnected } from "./openFinanceActions";
import type { Entity } from "@/lib/types";

// O SDK da Pluggy acessa `window` já na inicialização do módulo, o que
// quebra a renderização no servidor — precisa carregar só no navegador.
const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => m.PluggyConnect),
  { ssr: false }
);

export default function PluggyConnectButton({ entity }: { entity: Entity }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [linking, startLinking] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function handleOpen() {
    setMessage(null);
    startLoading(async () => {
      const result = await getConnectToken();
      if (result.ok) {
        setToken(result.token);
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading || linking}
        className="flex items-center gap-2 bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-50"
      >
        <Landmark size={16} />
        {linking ? "Conectando…" : "Conectar via Open Finance"}
      </button>

      {message && (
        <p className={`text-xs ${message.type === "error" ? "text-red-500" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}

      {token && (
        <PluggyConnect
          connectToken={token}
          // Habilitado só em desenvolvimento — mostra o conector fictício
          // "Pluggy Bank" no seletor. Trocar para false quando for produção.
          includeSandbox={true}
          connectorTypes={["PERSONAL_BANK", "BUSINESS_BANK"]}
          onSuccess={(data: { item: { id: string } }) => {
            setToken(null);
            startLinking(async () => {
              const result = await handleItemConnected(data.item.id, entity);
              if (result.ok) {
                setMessage({
                  type: "success",
                  text: `Conectado! ${result.accountsCreated} conta(s) e ${result.transactionsImported} lançamento(s) importado(s).`,
                });
                router.refresh();
              } else {
                setMessage({ type: "error", text: result.error });
              }
            });
          }}
          onError={() => {
            setToken(null);
            setMessage({ type: "error", text: "Não foi possível conectar com o banco." });
          }}
          onClose={() => setToken(null)}
        />
      )}
    </div>
  );
}
