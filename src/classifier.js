const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const URGENT_KEYWORDS = [
  "urgente",
  "urgência",
  "emergência",
  "agora",
  "hoje",
  "o quanto antes",
  "imediato",
];

/**
 * Classificação simples baseada em palavras-chave, usada quando não há
 * ANTHROPIC_API_KEY configurada. Não tenta extrair prazo (dueString).
 */
function fallbackClassify(text, senderName) {
  const lower = text.toLowerCase();
  const isUrgent = URGENT_KEYWORDS.some((kw) => lower.includes(kw));

  return {
    title: text.length > 100 ? `${text.slice(0, 97)}...` : text,
    priority: isUrgent ? "p2" : "p4",
    labels: [],
    dueString: null,
    summary: `Mensagem de ${senderName || "WhatsApp"}: ${text}`,
  };
}

function stripCodeFence(raw) {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

/**
 * Usa a API da Anthropic (Claude) para extrair de uma mensagem de WhatsApp
 * uma tarefa acionável: título curto, prioridade, labels e prazo (se houver).
 * Cai para classificação simples se a chamada falhar ou a chave não estiver configurada.
 */
export async function classifyMessage({ apiKey, model, text, senderName }) {
  if (!apiKey) {
    return fallbackClassify(text, senderName);
  }

  const systemPrompt = `Você é a secretária pessoal de um usuário e organiza as mensagens que ele recebe no WhatsApp em tarefas acionáveis no Todoist.
Dada a mensagem recebida, responda SOMENTE com um objeto JSON (sem texto adicional, sem markdown) com os campos:
- "title": string curta e acionável (máx. 80 caracteres) descrevendo a tarefa.
- "priority": um de "p1" (urgente/importante), "p2" (importante), "p3" (pode esperar), "p4" (padrão/sem urgência aparente).
- "labels": array de 0 a 3 strings curtas categorizando o assunto (ex: "trabalho", "pessoal", "financeiro", "saúde").
- "dueString": uma expressão de prazo em linguagem natural em português (ex: "amanhã", "sexta-feira", "hoje às 18h"), ou null se não houver prazo aparente na mensagem.
- "summary": uma frase curta resumindo do que se trata, para usar como descrição da tarefa.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-5",
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Remetente: ${senderName || "desconhecido"}\nMensagem: ${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("Chamada à Anthropic API falhou, usando fallback:", res.status, await res.text());
      return fallbackClassify(text, senderName);
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(stripCodeFence(raw));

    return {
      title: parsed.title?.slice(0, 120) || fallbackClassify(text, senderName).title,
      priority: ["p1", "p2", "p3", "p4"].includes(parsed.priority) ? parsed.priority : "p4",
      labels: Array.isArray(parsed.labels) ? parsed.labels.slice(0, 3) : [],
      dueString: parsed.dueString || null,
      summary: parsed.summary || text,
    };
  } catch (err) {
    console.warn("Erro ao classificar mensagem com a Anthropic API, usando fallback:", err);
    return fallbackClassify(text, senderName);
  }
}
