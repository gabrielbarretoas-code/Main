import Link from "next/link";
import { HandCoins, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeLoanInstallments } from "@/lib/recurrence";
import { deleteLoan } from "./actions";
import NewLoanForm from "./NewLoanForm";
import RegisterInstallmentButton from "./RegisterInstallmentButton";

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: PageProps<"/loans">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [loans, accounts, categories] = await Promise.all([
    prisma.loan.findMany({
      where: { organizationId, entity },
      include: { account: true, category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
  ]);

  const loanIds = loans.map((l) => l.id);
  const installmentTransactions = loanIds.length
    ? await prisma.transaction.findMany({
        where: { loanId: { in: loanIds }, source: "loan" },
        select: { id: true, loanId: true, date: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Empréstimos — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Registre empréstimos tomados (você deve) e efetuados (te devem), com parcelas e saldo
          devedor.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo empréstimo</h2>
        <NewLoanForm
          entity={entity}
          accounts={accounts}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            parentId: c.parentId,
            type: c.type,
          }))}
        />
      </div>

      {loans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
            <HandCoins size={26} />
          </span>
          <p className="font-medium text-slate-700">Nenhum empréstimo cadastrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const installmentDates = computeLoanInstallments(loan);
            const paidByDate = new Map(
              installmentTransactions
                .filter((t) => t.loanId === loan.id)
                .map((t) => [t.date.toISOString().slice(0, 10), t.id])
            );
            const installments = installmentDates.map((date) => {
              const iso = date.toISOString().slice(0, 10);
              return { date, iso, transactionId: paidByDate.get(iso) ?? null };
            });
            const paidCount = installments.filter((i) => i.transactionId).length;
            const remaining = (loan.installmentCount - paidCount) * loan.installmentAmount;
            const nextPending = installments.find((i) => !i.transactionId);
            const settled = paidCount >= loan.installmentCount;
            const pct = Math.min((paidCount / loan.installmentCount) * 100, 100);

            return (
              <div key={loan.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          loan.direction === "BORROWED"
                            ? "text-red-600 bg-red-50"
                            : "text-emerald-600 bg-emerald-50"
                        }`}
                      >
                        {loan.direction === "BORROWED" ? "Tomado" : "Efetuado"}
                      </span>
                      {settled && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} />
                          Quitado
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800 mt-1">{loan.counterparty}</p>
                    <p className="text-xs text-slate-400">
                      {loan.account.name}
                      {loan.category ? ` · ${loan.category.name}` : ""}
                      {loan.interestRate ? ` · ${loan.interestRate}% a.m.` : ""}
                    </p>
                    {loan.note && <p className="text-xs text-slate-400 mt-0.5">{loan.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Principal</p>
                    <p className="font-medium text-slate-800">{formatCurrency(loan.principal)}</p>
                    <p className="text-xs text-slate-400 mt-1">Saldo devedor</p>
                    <p className={`font-medium ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                  <form action={deleteLoan.bind(null, loan.id)}>
                    <button className="text-xs text-red-500 hover:underline">Remover</button>
                  </form>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>
                      {paidCount} de {loan.installmentCount} parcelas
                    </span>
                    <span>{formatCurrency(loan.installmentAmount)} cada</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-navy transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {!settled && nextPending && (
                  <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-slate-600">
                      Próxima parcela: <span className="font-medium">{formatDate(nextPending.date)}</span>
                    </p>
                    <RegisterInstallmentButton loanId={loan.id} dateIso={nextPending.iso} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Todos os lançamentos de principal e parcela aparecem também em{" "}
        <Link href={`/transactions?entity=${entity}`} className="underline">
          Lançamentos
        </Link>
        .
      </p>
    </div>
  );
}
