"use client";

import { useState, useTransition } from "react";
import { getParentCategories, getSubcategories, type CategoryOption } from "@/lib/categoryOptions";
import type { TransactionType } from "@/lib/types";

const NEW_VALUE = "__new__";

/**
 * Categoria e subcategoria em dois selects separados (não um único combo com
 * prefixo visual) — a categoria-mãe agrega o total gasto/recebido; a
 * subcategoria explica onde, dentro dela, esse valor foi.
 */
export default function CategorySubcategoryPicker({
  type,
  categories,
  value,
  onChange,
  onCategoryCreated,
  createCategory,
}: {
  type: TransactionType;
  categories: CategoryOption[];
  value: string;
  onChange: (categoryId: string) => void;
  onCategoryCreated: (cat: CategoryOption) => void;
  createCategory: (
    name: string,
    type: TransactionType,
    parentId: string | null
  ) => Promise<CategoryOption | null>;
}) {
  const [creatingLevel, setCreatingLevel] = useState<"category" | "subcategory" | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = categories.find((c) => c.id === value) ?? null;
  const parentId = selected ? selected.parentId ?? selected.id : "";
  const subId = selected?.parentId ? selected.id : "";

  const parents = getParentCategories(categories, type);
  const subcategories = parentId ? getSubcategories(categories, type, parentId) : [];

  function handleParentChange(v: string) {
    if (v === NEW_VALUE) {
      setCreatingLevel("category");
      return;
    }
    onChange(v);
  }

  function handleSubChange(v: string) {
    if (v === NEW_VALUE) {
      setCreatingLevel("subcategory");
      return;
    }
    onChange(v || parentId);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const parentForCreate = creatingLevel === "subcategory" ? parentId : null;
    startTransition(async () => {
      const created = await createCategory(name, type, parentForCreate);
      if (created) {
        onCategoryCreated({ ...created, parentId: parentForCreate, type });
        onChange(created.id);
      }
      setCreatingLevel(null);
      setNewName("");
    });
  }

  if (creatingLevel) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={creatingLevel === "category" ? "Nome da categoria" : "Nome da subcategoria"}
          className="input py-1.5 text-sm w-40"
        />
        <button
          type="button"
          disabled={pending}
          onClick={handleCreate}
          className="text-xs bg-slate-800 text-white rounded-md px-2 py-1.5 hover:bg-slate-900 whitespace-nowrap"
        >
          Criar
        </button>
        <button
          type="button"
          onClick={() => {
            setCreatingLevel(null);
            setNewName("");
          }}
          className="text-xs text-slate-500 whitespace-nowrap"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={parentId}
        onChange={(e) => handleParentChange(e.target.value)}
        className="input py-1.5 text-sm"
      >
        <option value="">Categoria…</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value={NEW_VALUE}>+ Criar nova categoria…</option>
      </select>

      {parentId && (
        <select
          value={subId}
          onChange={(e) => handleSubChange(e.target.value)}
          className="input py-1.5 text-sm"
        >
          <option value="">Sem subcategoria</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEW_VALUE}>+ Criar subcategoria…</option>
        </select>
      )}
    </div>
  );
}
