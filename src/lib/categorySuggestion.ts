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

const MERCHANT_KEY_MAX_TOKENS = 5;

/**
 * Reduz a descrição a uma "assinatura" do estabelecimento, descartando
 * números soltos (nota fiscal, código de loja, data) que mudam a cada
 * lançamento mas não identificam quem é o estabelecimento. Duas compras no
 * mesmo lugar em meses diferentes devem gerar a mesma chave.
 */
export function extractMerchantKey(description: string): string {
  const tokens = normalize(description)
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !/^\d+$/.test(t));
  return tokens.slice(0, MERCHANT_KEY_MAX_TOKENS).join(" ");
}

export type MerchantMemoryEntry = {
  categoryId: string | null;
  costCenterId: string | null;
  isTransfer: boolean;
};

export type SuggestionResult = {
  categoryId: string | null;
  costCenterId: string | null;
  isTransfer: boolean;
  /** "learned" = veio de uma confirmação sua anterior; "keyword" = regra genérica. */
  source: "learned" | "keyword" | "none";
};

/**
 * Sugestão "inteligente" pra um lançamento: prioriza o que o próprio usuário
 * já confirmou pra esse estabelecimento (aprendizado), e só cai pras regras
 * genéricas de palavra-chave quando não há nada aprendido ainda.
 */
export function suggestForTransaction(
  description: string,
  categories: CategoryLike[],
  memory: Map<string, MerchantMemoryEntry>
): SuggestionResult {
  const merchantKey = extractMerchantKey(description);
  const learned = merchantKey ? memory.get(merchantKey) : undefined;
  if (learned) {
    return { ...learned, source: "learned" };
  }

  const isTransfer = suggestIsTransfer(description);
  const categoryId = isTransfer ? null : suggestCategoryId(description, categories);
  return {
    categoryId,
    costCenterId: null,
    isTransfer,
    source: isTransfer || categoryId ? "keyword" : "none",
  };
}
