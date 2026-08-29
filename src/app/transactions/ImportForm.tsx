"use client";

import { useRef, useState, useTransition } from "react";
import { importStatement } from "./actions";

type Option = { id: string; name: string };

export default function ImportForm({
  entity,
  accounts,
}: {
  entity: string;
  accounts: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number; error?: string } | null>(
    null
  );

  return (
    <form
      ref={formRef}
      action={(fd) => {
        startTransition(async () => {
          const res = await importStatement(fd);
          setResult(res);
          if (!res.error) formRef.current?.reset();
        });
      }}
      className="flex flex-wrap gap-3 items-end"
    >
      <input type="hidden" name="entity" value={entity} />
      <div>
        <label className="block text-xs text-slate-500 mb-1">Conta de destino</label>
        <select
          name="accountId"
          required
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">
          Arquivo de extrato (.csv)
        </label>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
      </div>
      <button
        disabled={pending || accounts.length === 0}
        className="bg-slate-800 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
      >
        {pending ? "Importando..." : "Importar"}
      </button>
      {result && (
        <p className={`text-xs w-full ${result.error ? "text-red-500" : "text-emerald-600"}`}>
          {result.error
            ? result.error
            : `${result.imported} lançamento(s) importado(s), ${result.skipped} ignorado(s). Revise e concilie abaixo.`}
        </p>
      )}
      <p className="text-xs text-slate-400 w-full">
        Colunas esperadas: data, descrição, valor (negativo = despesa, positivo = receita).
      </p>
    </form>
  );
}
