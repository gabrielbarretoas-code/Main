import type { TransactionType } from "@/lib/types";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  type: TransactionType;
};

export function getParentCategories(categories: CategoryOption[], type: TransactionType) {
  return categories.filter((c) => c.type === type && !c.parentId);
}

export function getSubcategories(categories: CategoryOption[], type: TransactionType, parentId: string) {
  return categories.filter((c) => c.type === type && c.parentId === parentId);
}
