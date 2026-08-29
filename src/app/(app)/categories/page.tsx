import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { deleteCategory } from "./actions";
import { requireOrganizationId } from "@/lib/session";
import { getCategoryIcon } from "@/lib/categoryIcons";
import NewCategoryForm from "./NewCategoryForm";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: PageProps<"/categories">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const categories = await prisma.category.findMany({
    where: { entity, organizationId },
    orderBy: { name: "asc" },
  });

  const parents = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c);
    childrenByParent.set(c.parentId, list);
  }

  const income = parents.filter((c) => c.type === "INCOME");
  const expense = parents.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Categorias — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Organize com categorias e subcategorias para um relatório financeiro claro de verdade.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h2 className="font-medium mb-3">Nova categoria</h2>
        <NewCategoryForm
          entity={entity}
          parents={parents.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            icon: p.icon,
            color: p.color,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryGroup title="Despesas" categories={expense} childrenByParent={childrenByParent} />
        <CategoryGroup title="Receitas" categories={income} childrenByParent={childrenByParent} />
      </div>
    </div>
  );
}

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

function CategoryGroup({
  title,
  categories,
  childrenByParent,
}: {
  title: string;
  categories: CategoryRow[];
  childrenByParent: Map<string, CategoryRow[]>;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium text-slate-900">{title}</h2>
      {categories.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
          Nenhuma categoria ainda.
        </p>
      )}
      {categories.map((c) => {
        const Icon = getCategoryIcon(c.icon);
        const children = childrenByParent.get(c.id) ?? [];
        return (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${c.color}20`, color: c.color }}
              >
                <Icon size={18} />
              </span>
              <span className="flex-1 font-medium text-sm text-slate-800">{c.name}</span>
              <form action={deleteCategory.bind(null, c.id)}>
                <button className="text-xs text-red-500 hover:underline">Remover</button>
              </form>
            </div>
            {children.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3 pl-[3.25rem]">
                {children.map((child) => (
                  <span
                    key={child.id}
                    className="group inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full"
                    style={{ backgroundColor: `${child.color}15`, color: child.color }}
                  >
                    {child.name}
                    <form action={deleteCategory.bind(null, child.id)}>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full hover:bg-black/10 flex items-center justify-center">
                        ×
                      </button>
                    </form>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
