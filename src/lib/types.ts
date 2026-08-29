export type Entity = "PERSONAL" | "BUSINESS";
export type TransactionType = "INCOME" | "EXPENSE";
export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "CASH" | "INVESTMENT";

export function parseEntity(value: string | string[] | undefined): Entity {
  return value === "BUSINESS" ? "BUSINESS" : "PERSONAL";
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  CREDIT_CARD: "Cartão de crédito",
  CASH: "Dinheiro",
  INVESTMENT: "Investimento",
};
