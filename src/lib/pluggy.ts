import "server-only";

const PLUGGY_API_URL = "https://api.pluggy.ai";

export type PluggyItem = {
  id: string;
  connector: { id: number; name: string };
  status: "UPDATING" | "UPDATED" | "LOGIN_ERROR" | "OUTDATED" | "WAITING_USER_INPUT" | "ERROR";
  executionStatus: string;
  statusDetail: string | null;
  error: { code: string; message: string } | null;
};

export type PluggyAccount = {
  id: string;
  itemId: string;
  type: "BANK" | "CREDIT";
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  bankData?: { automaticallyInvestedBalance?: number | null } | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
};

let cachedApiKey: { key: string; expiresAt: number } | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now() + 60_000) {
    return cachedApiKey.key;
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não configurados.");
  }

  const res = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao autenticar na Pluggy (${res.status}).`);
  const data = (await res.json()) as { apiKey: string };

  // O apiKey é um JWT válido por ~2h; guarda por 1h50 pra ter margem.
  cachedApiKey = { key: data.apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return data.apiKey;
}

async function pluggyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${PLUGGY_API_URL}${path}`, {
    ...init,
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Pluggy API ${path} falhou (${res.status}): ${body}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

/** Token de curta duração para o widget Pluggy Connect no cliente. */
export async function createConnectToken(itemId?: string): Promise<string> {
  const data = await pluggyFetch<{ accessToken: string }>("/connect_token", {
    method: "POST",
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  return data.accessToken;
}

export async function getItem(itemId: string): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(`/items/${itemId}`);
}

/** Pede pro banco atualizar os dados agora. A Pluggy limita a 1x por hora por item. */
export async function triggerItemUpdate(itemId: string): Promise<{ ok: true; item: PluggyItem } | { ok: false; error: string }> {
  try {
    const item = await pluggyFetch<PluggyItem>(`/items/${itemId}`, { method: "PATCH", body: "{}" });
    return { ok: true, item };
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 409) {
      return { ok: false, error: "Essa conexão já foi atualizada recentemente — a Pluggy permite no máximo 1 atualização manual por hora." };
    }
    return { ok: false, error: "Não foi possível sincronizar agora." };
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  await pluggyFetch<unknown>(`/items/${itemId}`, { method: "DELETE" });
}

export async function listAccounts(itemId: string): Promise<PluggyAccount[]> {
  const data = await pluggyFetch<{ results: PluggyAccount[] }>(`/accounts?itemId=${itemId}`);
  // Só contas bancárias e cartão de crédito viram Account — investimentos têm
  // modelo de dados próprio (posições, não transações) e ficam fora por ora.
  return data.results.filter((a) => a.type === "BANK" || a.type === "CREDIT");
}

const MAX_TRANSACTION_PAGES = 20;

export async function listTransactions(accountId: string, from?: string): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  const fromParam = from ? `&from=${encodeURIComponent(from)}` : "";
  let path: string | null = `/v2/transactions?accountId=${accountId}${fromParam}`;

  for (let i = 0; i < MAX_TRANSACTION_PAGES && path; i++) {
    const data: { results: PluggyTransaction[]; next: string | null } = await pluggyFetch(path);
    all.push(...data.results);
    path = data.next ? (data.next.startsWith("http") ? data.next.replace(PLUGGY_API_URL, "") : data.next) : null;
  }

  return all;
}
