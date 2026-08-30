"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, RefreshCw, Unlink } from "lucide-react";
import { generateWhatsAppLinkCode, disconnectWhatsApp } from "./actions";

export default function WhatsAppLinkCard({
  whatsappPhone,
  whatsappLinkCode,
  botNumber,
}: {
  whatsappPhone: string | null;
  whatsappLinkCode: string | null;
  botNumber: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(whatsappLinkCode);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const newCode = await generateWhatsAppLinkCode();
      setCode(newCode);
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectWhatsApp();
      setCode(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <MessageCircle size={18} />
        </span>
        <div>
          <h2 className="font-medium">Assistente no WhatsApp</h2>
          <p className="text-xs text-slate-500">
            Conte seus gastos e receitas por mensagem, ou mande foto de um recibo — a IA registra pra você.
          </p>
        </div>
      </div>

      {whatsappPhone ? (
        <div className="space-y-3">
          <p className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">
            Conectado ao número terminando em ...{whatsappPhone.slice(-4)}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:underline disabled:opacity-40"
          >
            <Unlink size={13} />
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {code ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                {botNumber
                  ? `Envie o código abaixo pelo WhatsApp para ${botNumber}:`
                  : "Envie o código abaixo pelo WhatsApp para o número do Oportuno Finanças assim que ele estiver ativo:"}
              </p>
              <p className="text-2xl font-mono font-semibold tracking-widest bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center">
                {code}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Gere um código de vinculação pra conectar seu WhatsApp.</p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={handleGenerate}
            className="flex items-center gap-1.5 text-sm bg-brand-navy text-white rounded-md px-3 py-1.5 hover:bg-brand-navy-light disabled:opacity-50"
          >
            <RefreshCw size={14} />
            {code ? "Gerar novo código" : "Gerar código de vinculação"}
          </button>
        </div>
      )}
    </div>
  );
}
