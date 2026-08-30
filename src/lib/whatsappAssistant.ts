import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { normalize, suggestForTransaction } from "@/lib/categorySuggestion";
import { loadMerchantMemory, learnMerchantChoice } from "@/lib/merchantMemory";
import { formatCurrency, formatDate } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, type AccountType, type Entity, type TransactionType } from "@/lib/types";

const MODEL = "claude-opus-5";
const MAX_TOOL_ITERATIONS = 6;
const HISTORY_TURNS = 20;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_transaction",
    description:
      "Registra um novo lançamento financeiro (receita ou despesa) na conta do usuário. Use sempre que o usuário disser que gastou, pagou, recebeu ou ganhou algum valor, ou quando enviar foto de um recibo/nota fiscal.",
    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Descrição curta do lançamento, ex: 'Supermercado', 'Salário', 'Uber'.",
        },
        amount: { type: "number", description: "Valor em reais, sempre positivo." },
        type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "INCOME = receita, EXPENSE = despesa." },
        entity: {
          type: "string",
          enum: ["PERSONAL", "BUSINESS"],
          description: "Pessoal ou Comercial. Use PERSONAL a menos que o contexto seja claramente de negócio.",
        },
        date: { type: "string", description: "Data no formato AAAA-MM-DD. Se não informado, usa a data de hoje." },
        category_name: {
          type: "string",
          description: "Nome da categoria, apenas se o usuário mencionou ou for muito óbvio (ex: 'Uber' -> Transporte).",
        },
        account_name: {
          type: "string",
          description: "Nome da conta ou cartão, apenas se o usuário mencionou explicitamente.",
        },
      },
      required: ["description", "amount", "type"],
    },
  },
  {
    name: "list_accounts",
    description: "Lista as contas bancárias e cartões cadastrados do usuário.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["PERSONAL", "BUSINESS"] },
      },
    },
  },
  {
    name: "list_categories",
    description: "Lista as categorias de receita/despesa cadastradas.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["PERSONAL", "BUSINESS"] },
        type: { type: "string", enum: ["INCOME", "EXPENSE"] },
      },
    },
  },
  {
    name: "get_balance",
    description: "Consulta o saldo atual de cada conta do usuário.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["PERSONAL", "BUSINESS"] },
      },
    },
  },
  {
    name: "list_recent_transactions",
    description: "Lista os lançamentos mais recentes do usuário, do mais novo pro mais antigo.",
    input_schema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["PERSONAL", "BUSINESS"] },
        limit: { type: "number", description: "Quantidade máxima de lançamentos (padrão 10, máximo 30)." },
      },
    },
  },
];

function asEntity(value: unknown): Entity {
  return value === "BUSINESS" ? "BUSINESS" : "PERSONAL";
}

async function resolveAccount(organizationId: string, entity: Entity, hint?: string) {
  const accounts = await prisma.account.findMany({ where: { organizationId, entity } });
  if (accounts.length === 0) return { account: null, accounts };

  if (hint) {
    const norm = normalize(hint);
    const match = accounts.find((a) => normalize(a.name).includes(norm) || norm.includes(normalize(a.name)));
    if (match) return { account: match, accounts };
  }

  if (accounts.length === 1) return { account: accounts[0], accounts };
  return { account: null, accounts };
}

async function toolCreateTransaction(organizationId: string, input: Record<string, unknown>): Promise<string> {
  const description = String(input.description ?? "").trim();
  const amount = Math.abs(Number(input.amount));
  const type: TransactionType = input.type === "INCOME" ? "INCOME" : "EXPENSE";
  const entity = asEntity(input.entity);

  if (!description) return "Erro: faltou a descrição do lançamento.";
  if (!amount || !Number.isFinite(amount) || amount <= 0) return "Erro: valor inválido — peça o valor certinho pro usuário.";

  const { account, accounts } = await resolveAccount(organizationId, entity, input.account_name as string | undefined);
  if (!account) {
    if (accounts.length === 0) {
      return `Erro: não há nenhuma conta cadastrada em ${entity === "PERSONAL" ? "Pessoal" : "Comercial"}. Avise o usuário que ele precisa cadastrar uma conta no app antes de lançar pelo WhatsApp.`;
    }
    return `Erro: não ficou claro qual conta usar entre: ${accounts.map((a) => a.name).join(", ")}. Pergunte ao usuário qual delas.`;
  }

  const categories = await prisma.category.findMany({ where: { organizationId, entity, type } });
  let categoryId: string | null = null;
  const categoryHint = input.category_name as string | undefined;
  if (categoryHint) {
    const norm = normalize(categoryHint);
    const match = categories.find((c) => normalize(c.name).includes(norm) || norm.includes(normalize(c.name)));
    categoryId = match?.id ?? null;
  }
  if (!categoryId) {
    const memory = await loadMerchantMemory(organizationId, entity);
    const suggestion = suggestForTransaction(description, categories, memory);
    if (!suggestion.isTransfer) categoryId = suggestion.categoryId;
  }

  const date = input.date ? new Date(String(input.date)) : new Date();
  if (Number.isNaN(date.getTime())) return "Erro: data inválida.";

  await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      entity,
      date,
      accountId: account.id,
      categoryId,
      organizationId,
      source: "whatsapp",
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "whatsapp",
    },
  });

  if (categoryId) {
    await learnMerchantChoice(organizationId, entity, description, {
      categoryId,
      costCenterId: null,
      isTransfer: false,
    });
  }

  const category = categories.find((c) => c.id === categoryId);
  return (
    `Lançamento registrado: "${description}", ${formatCurrency(amount)} (${type === "INCOME" ? "receita" : "despesa"}), ` +
    `conta "${account.name}"${category ? `, categoria "${category.name}"` : ", sem categoria"}, data ${formatDate(date)}.`
  );
}

async function toolListAccounts(organizationId: string, input: Record<string, unknown>): Promise<string> {
  const entity = asEntity(input.entity);
  const accounts = await prisma.account.findMany({ where: { organizationId, entity } });
  if (accounts.length === 0) return "Nenhuma conta cadastrada.";
  return accounts.map((a) => `${a.name} (${ACCOUNT_TYPE_LABELS[a.type as AccountType]})`).join("\n");
}

async function toolListCategories(organizationId: string, input: Record<string, unknown>): Promise<string> {
  const entity = asEntity(input.entity);
  const type = input.type === "INCOME" || input.type === "EXPENSE" ? (input.type as TransactionType) : undefined;
  const categories = await prisma.category.findMany({ where: { organizationId, entity, ...(type ? { type } : {}) } });
  if (categories.length === 0) return "Nenhuma categoria cadastrada.";
  return categories.map((c) => c.name).join(", ");
}

async function toolGetBalance(organizationId: string, input: Record<string, unknown>): Promise<string> {
  const entity = asEntity(input.entity);
  const accounts = await prisma.account.findMany({ where: { organizationId, entity } });
  if (accounts.length === 0) return "Nenhuma conta cadastrada.";

  const lines = await Promise.all(
    accounts.map(async (a) => {
      const txs = await prisma.transaction.findMany({ where: { accountId: a.id, organizationId } });
      const balance = txs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
      return `${a.name}: ${formatCurrency(balance)}`;
    })
  );
  return lines.join("\n");
}

async function toolListRecentTransactions(organizationId: string, input: Record<string, unknown>): Promise<string> {
  const entity = asEntity(input.entity);
  const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 30);
  const txs = await prisma.transaction.findMany({
    where: { organizationId, entity },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
  });
  if (txs.length === 0) return "Nenhum lançamento encontrado.";
  return txs
    .map(
      (t) =>
        `${formatDate(t.date)} — ${t.description} — ${t.type === "INCOME" ? "+" : "-"}${formatCurrency(t.amount)}${
          t.category ? ` (${t.category.name})` : ""
        }`
    )
    .join("\n");
}

async function executeTool(organizationId: string, name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "create_transaction":
      return toolCreateTransaction(organizationId, input);
    case "list_accounts":
      return toolListAccounts(organizationId, input);
    case "list_categories":
      return toolListCategories(organizationId, input);
    case "get_balance":
      return toolGetBalance(organizationId, input);
    case "list_recent_transactions":
      return toolListRecentTransactions(organizationId, input);
    default:
      return `Erro: ferramenta desconhecida "${name}".`;
  }
}

function buildSystemPrompt(organizationName: string): string {
  const today = formatDate(new Date());
  return [
    `Você é o assistente financeiro do "Oportuno Finanças" conversando por WhatsApp com alguém da organização "${organizationName}". Hoje é ${today}.`,
    "Responda sempre em português do Brasil, em mensagens curtas e diretas — é um chat de WhatsApp, não um relatório.",
    "Quando o usuário mencionar um gasto, pagamento, recebimento ou ganho, use a ferramenta create_transaction para registrar de verdade — não finja que registrou.",
    "Nunca invente um valor que o usuário não informou. Se faltar o valor, pergunte antes de registrar.",
    "Use PERSONAL como entidade padrão, a menos que o contexto deixe claro que é despesa/receita do negócio (ex: 'comprei material pra revenda').",
    "Se o usuário mandar foto de um recibo ou nota fiscal, leia o valor, o estabelecimento e a data (se legível) e registre o lançamento — só pergunte algo se a imagem estiver realmente ilegível.",
    "Depois de registrar algo, confirme em 1-2 linhas o que foi lançado. Se o usuário quiser corrigir algo, ele pode editar direto no app.",
    "Para perguntas sobre saldo, categorias ou lançamentos recentes, use as ferramentas de consulta antes de responder — nunca invente números.",
  ].join(" ");
}

export type AssistantInput = {
  text?: string;
  image?: { base64: string; mimeType: string };
};

export async function runAssistant(organizationId: string, input: AssistantInput): Promise<string> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!organization) return "Organização não encontrada.";

  const historyRows = await prisma.whatsAppMessage.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
  });
  const history: Anthropic.MessageParam[] = historyRows
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

  const userContent: Anthropic.MessageParam["content"] = input.image
    ? [
        {
          type: "image",
          source: { type: "base64", media_type: input.image.mimeType as "image/jpeg", data: input.image.base64 },
        },
        { type: "text", text: input.text?.trim() || "Segue o recibo." },
      ]
    : input.text?.trim() || "";

  const userHistoryText = input.image ? `[imagem de recibo] ${input.text?.trim() ?? ""}`.trim() : (input.text?.trim() ?? "");

  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userContent }];
  const client = getClient();

  let finalText = "";
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: buildSystemPrompt(organization.name),
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    finalText = textBlocks.map((b) => b.text).join("\n").trim();

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(organizationId, toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText = "Certo!";
  }

  await prisma.whatsAppMessage.createMany({
    data: [
      { organizationId, role: "user", content: userHistoryText || "[mensagem vazia]" },
      { organizationId, role: "assistant", content: finalText },
    ],
  });

  // Mantém só as últimas mensagens pra não crescer sem limite.
  const toKeep = await prisma.whatsAppMessage.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
    select: { id: true },
  });
  if (toKeep.length === HISTORY_TURNS) {
    await prisma.whatsAppMessage.deleteMany({
      where: { organizationId, id: { notIn: toKeep.map((m) => m.id) } },
    });
  }

  return finalText;
}
