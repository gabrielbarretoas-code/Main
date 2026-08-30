import { prisma } from "@/lib/prisma";
import { parseEntity, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";
import { createAccount, deleteAccount } from "./actions";
import { formatCurrency } from "@/lib/format";
import { requireOrganizationId } from "@/lib/session";
import PluggyConnectButton from "./PluggyConnectButton";
import OpenFinanceConnectionsList, { type ConnectionRow } from "./OpenFinanceConnectionsList";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: PageProps<"/accounts">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [accounts, connections] = await Promise.all([
    prisma.account.findMany({
      where: { entity, organizationId },
      include: { openFinanceLink: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.openFinanceConnection.findMany({
      where: { entity, organizationId },
      include: { accountLinks: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const balances = await Promise.all(
    accounts.map(async (a) => {
      const txs = await prisma.transaction.findMany({ where: { accountId: a.id, organizationId } });
      return txs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
    })
  );

  const connectionRows: ConnectionRow[] = connections.map((c) => ({
    id: c.id,
    institutionName: c.institutionName,
    status: c.status,
    lastSyncedAt: c.lastSyncedAt,
    accountNames: c.accountLinks.map((l) => l.account.name),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Contas — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div>
          <h2 className="font-medium">Open Finance</h2>
          <p className="text-xs text-slate-500">
            Conecte seu banco e traga contas e lançamentos automaticamente, sem digitar nada.
          </p>
        </div>
        <PluggyConnectButton entity={entity} />
        <OpenFinanceConnectionsList connections={connectionRows} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Nova conta</h2>
        <form action={createAccount} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="entity" value={entity} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <input
              name="name"
              required
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              placeholder="Ex: Nubank"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              name="type"
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 pb-1.5">
            <input type="checkbox" name="hasAutoInvest" />
            Tem investimento automático de saldo (ex: Rende Fácil, Cofrinho)?
          </label>
          <button className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light">
            Adicionar
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2">
          Se marcado, identificamos e conciliamos essas movimentações automaticamente — elas não
          entram como despesa, e aparecem separadas no Dashboard como saldo aplicado.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {accounts.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Nenhuma conta cadastrada.</p>
        )}
        {accounts.map((a, i) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-slate-500">
                {ACCOUNT_TYPE_LABELS[a.type as AccountType]}
                {a.hasAutoInvest && (
                  <span className="ml-2 text-brand-navy bg-brand-gold-light px-1.5 py-0.5 rounded-full">
                    investimento automático
                  </span>
                )}
                {a.openFinanceLink && (
                  <span className="ml-2 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Open Finance
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`font-medium ${
                  balances[i] >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(balances[i])}
              </span>
              <form action={deleteAccount.bind(null, a.id)}>
                <button className="text-xs text-red-500 hover:underline">Remover</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
