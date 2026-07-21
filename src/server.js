import "dotenv/config";
import express from "express";
import { verifySignature, sendTextMessage, markAsRead } from "./whatsapp.js";
import { createTodoistTask } from "./todoist.js";
import { classifyMessage } from "./classifier.js";

const {
  PORT = 3000,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET,
  TODOIST_API_TOKEN,
  ANTHROPIC_API_KEY,
  CLAUDE_MODEL,
} = process.env;

for (const [name, value] of Object.entries({
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
  TODOIST_API_TOKEN,
})) {
  if (!value) {
    console.warn(`Aviso: variável de ambiente ${name} não está configurada.`);
  }
}

const app = express();

// Guarda o corpo bruto da requisição para permitir validar a assinatura HMAC da Meta.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Deduplicação simples de mensagens (a Meta pode reenviar o mesmo webhook).
const processedMessageIds = new Set();
function alreadyProcessed(id) {
  if (processedMessageIds.has(id)) return true;
  processedMessageIds.add(id);
  if (processedMessageIds.size > 1000) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
  return false;
}

// 1) Verificação do webhook (chamada uma vez pela Meta ao configurar a URL).
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2) Recebimento de mensagens.
app.post("/webhook", (req, res) => {
  const signature = req.header("x-hub-signature-256");
  if (!verifySignature(req.rawBody, signature, WHATSAPP_APP_SECRET)) {
    return res.sendStatus(401);
  }

  // Responde imediatamente para a Meta não reenviar/expirar o webhook;
  // o processamento acontece depois, de forma assíncrona.
  res.sendStatus(200);
  handleWebhookPayload(req.body).catch((err) => {
    console.error("Erro ao processar webhook:", err);
  });
});

async function handleWebhookPayload(body) {
  const entries = body.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      for (const message of messages) {
        if (alreadyProcessed(message.id)) continue;
        await handleIncomingMessage(message, contacts);
      }
    }
  }
}

async function handleIncomingMessage(message, contacts) {
  const from = message.from;
  const senderName = contacts.find((c) => c.wa_id === from)?.profile?.name;

  if (message.type !== "text") {
    await sendTextMessage({
      token: WHATSAPP_TOKEN,
      phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
      to: from,
      body:
        "Por enquanto eu só consigo organizar mensagens de texto. Pode me mandar em texto o que você precisa? 🙂",
    });
    return;
  }

  const text = message.text?.body?.trim();
  if (!text) return;

  await markAsRead({
    token: WHATSAPP_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    messageId: message.id,
  });

  const task = await classifyMessage({
    apiKey: ANTHROPIC_API_KEY,
    model: CLAUDE_MODEL,
    text,
    senderName,
  });

  await createTodoistTask({
    apiToken: TODOIST_API_TOKEN,
    title: task.title,
    description: `${task.summary}\n\nVia WhatsApp de ${senderName || "contato"} (${from}).`,
    priority: task.priority,
    labels: task.labels,
    dueString: task.dueString,
  });

  const priorityLabel = { p1: "🔴 urgente", p2: "🟠 importante", p3: "🟡", p4: "" }[task.priority];
  const dueLine = task.dueString ? `\n🗓️ Prazo: ${task.dueString}` : "";
  const priorityLine = priorityLabel ? `\n${priorityLabel}` : "";

  await sendTextMessage({
    token: WHATSAPP_TOKEN,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    to: from,
    body: `✅ Anotei: *${task.title}*${priorityLine}${dueLine}\n\nJá está no seu Todoist.`,
  });
}

app.get("/", (_req, res) => {
  res.send("WhatsApp Secretary está no ar.");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
