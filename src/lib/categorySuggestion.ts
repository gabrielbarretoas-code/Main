import { CATEGORY_KEYWORD_RULES, TRANSFER_KEYWORDS } from "@/lib/defaults";

type CategoryLike = { id: string; name: string };

/** minúsculas e sem acento, pra casar "Eletrica" com "Elétrica" e afins. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bate a palavra/frase inteira (com \b), não um pedaço no meio de outra palavra. */
function containsKeyword(normalizedDesc: string, keyword: string): boolean {
  const kw = escapeRegex(normalize(keyword).trim());
  if (!kw) return false;
  return new RegExp(`\\b${kw}\\b`).test(normalizedDesc);
}

export function suggestIsTransfer(description: string): boolean {
  const desc = normalize(description);
  return TRANSFER_KEYWORDS.some((kw) => containsKeyword(desc, kw));
}

export function suggestCategoryId(
  description: string,
  categories: CategoryLike[]
): string | null {
  const desc = normalize(description);

  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.keywords.some((kw) => containsKeyword(desc, kw))) {
      const match = categories.find((c) => normalize(c.name) === normalize(rule.category));
      if (match) return match.id;
    }
  }

  // Fallback: o próprio nome da categoria aparece na descrição
  const byName = categories.find((c) => c.name.length > 3 && containsKeyword(desc, c.name));
  return byName?.id ?? null;
}
