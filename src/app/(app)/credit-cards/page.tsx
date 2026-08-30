import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatCurrency } from "@/lib/format";
import { createCreditCard } from "./actions";
import { deleteAccount } from "../accounts/actions";
import ImportForm from "../transactions/ImportForm";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CreditCardsPage({
  searchParams,
}: PageProps<"/credit-cards">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const cards = await prisma.account.findMany({
    where: { entity, organizationId, type: "CREDIT_CARD" },
    orderBy: { name: "asc" },
  });

  const owedByCard = await Promise.all(
    cards.map(async (c) => {
      const txs = await prisma.transaction.findMany({
        where: { accountId: c.id, organizationId, isTransfer: false },
      });
      return txs.reduce((s, t) => s + (t.type === "EXPENSE" ? t.amount : -t.amount), 0);
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Cartões de Crédito e Faturas — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Cadastre seus cartões e suba a fatura para conciliação, no mesmo formato do extrato
          bancário.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo cartão</h2>
        <form action={createCreditCard} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="entity" value={entity} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <input name="name" required placeholder="Ex: Nubank Roxinho" className="input" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Limite (opcional)</label>
            <input name="creditLimit" type="text" inputMode="decimal" placeholder="0,00" className="input w-28" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dia de fechamento</label>
            <input name="closingDay" type="number" min={1} max={31} className="input w-20" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Dia de vencimento</label>
            <input name="dueDay" type="number" min={1} max={31} className="input w-20" />
          </div>
          <button className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light">
            Adicionar
          </button>
        </form>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
            <CreditCard size={26} />
          </span>
          <p className="font-medium text-slate-700">Nenhum cartão cadastrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((c, i) => {
            const owed = owedByCard[i];
            const pct = c.creditLimit ? Math.min((owed / c.creditLimit) * 100, 100) : 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {c.closingDay ? `Fecha dia ${c.closingDay}` : "Fechamento não definido"}
                      {c.dueDay ? ` · Vence dia ${c.dueDay}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Fatura atual</p>
                    <p className={`text-lg font-bold ${owed > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(owed)}
                    </p>
                  </div>
                  <form action={deleteAccount.bind(null, c.id)}>
                    <button className="text-xs text-red-500 hover:underline">Remover</button>
                  </form>
                </div>

                {c.creditLimit != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>{formatCurrency(owed)} usado</span>
                      <span>{formatCurrency(c.creditLimit)} de limite</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#0e223e" }}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Importar fatura
                  </p>
                  <ImportForm entity={entity} accounts={[{ id: c.id, name: c.name }]} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
