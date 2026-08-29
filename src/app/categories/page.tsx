import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { createCategory, deleteCategory } from "./actions";

export const dynamic = "force-dynamic";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

export default async function CategoriesPage({
  searchParams,
}: PageProps<"/categories">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);

  const categories = await prisma.category.findMany({
    where: { entity },
    orderBy: { name: "asc" },
  });

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Categorias — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
      </h1>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Nova categoria</h2>
        <form action={createCategory} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="entity" value={entity} />
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <input
              name="name"
              required
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              placeholder="Ex: Alimentação"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select name="type" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm">
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cor</label>
            <select name="color" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm">
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button className="bg-indigo-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-indigo-700">
            Adicionar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryList title="Despesas" items={expense} />
        <CategoryList title="Receitas" items={income} />
      </div>
    </div>
  );
}

function CategoryList({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string; color: string }[];
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <h2 className="font-medium p-4 border-b border-slate-100">{title}</h2>
      <div className="divide-y divide-slate-100">
        {items.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Nenhuma categoria.</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <span className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </span>
            <form action={deleteCategory.bind(null, c.id)}>
              <button className="text-xs text-red-500 hover:underline">Remover</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
