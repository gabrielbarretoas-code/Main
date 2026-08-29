import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { createCostCenter, deleteCostCenter } from "./actions";
import { requireOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CostCentersPage({
  searchParams,
}: PageProps<"/costcenters">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const costCenters = await prisma.costCenter.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Centros de Custo</h1>
        <p className="text-sm text-slate-500">
          Usados para classificar despesas e receitas comerciais por área da empresa.
        </p>
      </div>

      {entity === "PERSONAL" && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Centros de custo são um recurso do lado Comercial. Troque para &quot;Comercial&quot; no
          topo para usá-los nos lançamentos.
        </p>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo centro de custo</h2>
        <form action={createCostCenter} className="flex flex-wrap gap-3 items-end">
          <input
            name="name"
            required
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            placeholder="Ex: Comercial e Vendas"
          />
          <button className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700">
            Adicionar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {costCenters.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Nenhum centro de custo cadastrado.</p>
        )}
        {costCenters.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <span className="text-sm">{c.name}</span>
            <form action={deleteCostCenter.bind(null, c.id)}>
              <button className="text-xs text-red-500 hover:underline">Remover</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
