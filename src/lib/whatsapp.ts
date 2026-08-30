import "server-only";

import crypto from "crypto";

const GRAPH_API_VERSION = "v26.0";
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getAccessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN não configurado.");
  return token;
}

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID não configurado.");
  return id;
}

/** Confere a assinatura HMAC-SHA256 que a Meta manda em toda chamada de webhook. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = signatureHeader.replace(/^sha256=/, "");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

/** Envia uma mensagem de texto simples pro número informado (formato E.164, sem "+"). */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const res = await fetch(`${GRAPH_API_URL}/${getPhoneNumberId()}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha ao enviar mensagem no WhatsApp (${res.status}): ${body}`);
  }
}

/** Baixa uma mídia recebida (foto de recibo, por exemplo) a partir do media id do webhook. */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<{ base64: string; mimeType: string }> {
  const metaRes = await fetch(`${GRAPH_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!metaRes.ok) throw new Error(`Falha ao buscar metadados da mídia (${metaRes.status}).`);
  const meta = (await metaRes.json()) as { url: string; mime_type: string };

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!fileRes.ok) throw new Error(`Falha ao baixar mídia (${fileRes.status}).`);
  const buffer = Buffer.from(await fileRes.arrayBuffer());

  return { base64: buffer.toString("base64"), mimeType: meta.mime_type };
}
