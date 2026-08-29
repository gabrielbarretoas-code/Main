import { prisma } from "@/lib/prisma";
import { parseEntity, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";
import { createAccount, deleteAccount } from "./actions";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: PageProps<"/accounts">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);

  const accounts = await prisma.account.findMany({
    where: { entity },
    orderBy: { createdAt: "asc" },
  });

  const balances = await Promise.all(
    accounts.map(async (a) => {
      const txs = await prisma.transaction.findMany({ where: { accountId: a.id } });
      return txs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Contas — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

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
          <button className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700">
            Adicionar
          </button>
        </form>
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
