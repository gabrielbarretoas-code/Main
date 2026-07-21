import crypto from "node:crypto";

const GRAPH_VERSION = "v20.0";

function apiUrl(path) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
}

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta em cada webhook,
 * comparando com o HMAC-SHA256 do corpo bruto calculado com o App Secret.
 */
export function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return true; // permite rodar sem validação em ambiente de teste
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.replace("sha256=", "");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function sendTextMessage({ token, phoneNumberId, to, body }) {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha ao enviar mensagem no WhatsApp: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function markAsRead({ token, phoneNumberId, messageId }) {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });

  if (!res.ok) {
    // Não crítico para o fluxo principal — apenas loga.
    console.warn("Não foi possível marcar mensagem como lida:", await res.text());
  }
}
