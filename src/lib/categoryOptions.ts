import type { TransactionType } from "@/lib/types";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  type: TransactionType;
};

/** Ordena categorias-mãe seguidas das suas subcategorias, com prefixo visual. */
export function buildCategoryOptions(categories: CategoryOption[], type: TransactionType) {
  const sameType = categories.filter((c) => c.type === type);
  const parents = sameType.filter((c) => !c.parentId);
  const options: { id: string; label: string }[] = [];
  for (const p of parents) {
    options.push({ id: p.id, label: p.name });
    const children = sameType.filter((c) => c.parentId === p.id);
    for (const c of children) {
      options.push({ id: c.id, label: `↳ ${c.name}` });
    }
  }
  return options;
}
