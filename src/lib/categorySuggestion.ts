import { CATEGORY_KEYWORD_RULES, TRANSFER_KEYWORDS } from "@/lib/defaults";

type CategoryLike = { id: string; name: string };

export function suggestIsTransfer(description: string): boolean {
  const desc = description.toLowerCase();
  return TRANSFER_KEYWORDS.some((kw) => desc.includes(kw));
}

export function suggestCategoryId(
  description: string,
  categories: CategoryLike[]
): string | null {
  const desc = description.toLowerCase();

  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => desc.includes(kw))) {
      const match = categories.find((c) => c.name.toLowerCase() === rule.category.toLowerCase());
      if (match) return match.id;
    }
  }

  // Fallback: o próprio nome da categoria aparece na descrição
  const byName = categories.find((c) => c.name.length > 3 && desc.includes(c.name.toLowerCase()));
  return byName?.id ?? null;
}
