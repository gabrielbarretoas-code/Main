import { Home } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { createAsset } from "./actions";
import AssetCard from "./AssetCard";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: PageProps<"/assets">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const [assets, accounts, categories] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId, entity },
      include: { documents: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ where: { entity, organizationId }, orderBy: { name: "asc" } }),
  ]);

  const assetIds = assets.map((a) => a.id);
  const linkedTransactions = assetIds.length
    ? await prisma.transaction.findMany({
        where: { assetId: { in: assetIds } },
        select: { assetId: true, type: true, amount: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Imóveis e Automóveis — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Cadastre seus bens, documentos relacionados e as despesas ou receitas que eles geram.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo bem</h2>
        <form action={createAsset} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="entity" value={entity} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select name="kind" className="input">
              <option value="PROPERTY">Imóvel</option>
              <option value="VEHICLE">Automóvel</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <input name="name" required placeholder="Ex: Apartamento Centro" className="input w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data de aquisição</label>
            <input name="acquisitionDate" type="date" className="input" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Valor de aquisição</label>
            <input name="acquisitionValue" type="text" inputMode="decimal" placeholder="0,00" className="input w-28" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Valor atual</label>
            <input name="currentValue" type="text" inputMode="decimal" placeholder="0,00" className="input w-28" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 mb-1">Observação</label>
            <input name="note" className="input w-full" />
          </div>
          <button className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light">
            Adicionar
          </button>
        </form>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
            <Home size={26} />
          </span>
          <p className="font-medium text-slate-700">Nenhum bem cadastrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((asset) => {
            const linked = linkedTransactions.filter((t) => t.assetId === asset.id);
            const totalIncome = linked.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
            const totalExpense = linked.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
            return (
              <AssetCard
                key={asset.id}
                asset={asset}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                accounts={accounts}
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  color: c.color,
                  parentId: c.parentId,
                  type: c.type,
                }))}
                entity={entity}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
