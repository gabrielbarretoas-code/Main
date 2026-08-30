import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, sendWhatsAppMessage, downloadWhatsAppMedia } from "@/lib/whatsapp";
import { runAssistant } from "@/lib/whatsappAssistant";

export const maxDuration = 60;

/** Handshake de verificação que a Meta chama uma vez ao salvar a URL do webhook. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppMessage = {
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
};

type WebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: WhatsAppMessage[];
      };
    }[];
  }[];
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Assinatura inválida.", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new NextResponse("JSON inválido.", { status: 400 });
  }

  const messages = payload.entry?.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []) ?? [];

  // Sempre responde 200 depois daqui — mensagens sem "messages" (ex: status
  // de entrega) são normais, e um erro ao processar não deve fazer a Meta
  // ficar reenviando o mesmo webhook em loop.
  for (const message of messages) {
    try {
      await handleMessage(message);
    } catch (e) {
      console.error("Falha ao processar mensagem do WhatsApp:", e);
    }
  }

  return new NextResponse("OK", { status: 200 });
}

async function handleMessage(message: WhatsAppMessage): Promise<void> {
  const from = message.from;

  const organization = await prisma.organization.findUnique({ where: { whatsappPhone: from } });

  if (!organization) {
    await handleUnlinkedSender(from, message);
    return;
  }

  if (message.type === "text" && message.text?.body) {
    const reply = await runAssistant(organization.id, { text: message.text.body });
    await sendWhatsAppMessage(from, reply);
    return;
  }

  if (message.type === "image" && message.image) {
    const media = await downloadWhatsAppMedia(message.image.id);
    const reply = await runAssistant(organization.id, {
      text: message.image.caption,
      image: { base64: media.base64, mimeType: media.mimeType },
    });
    await sendWhatsAppMessage(from, reply);
    return;
  }

  await sendWhatsAppMessage(
    from,
    "Por enquanto só consigo entender mensagens de texto ou foto de recibo/nota fiscal. Manda de um desses jeitos?"
  );
}

async function handleUnlinkedSender(from: string, message: WhatsAppMessage): Promise<void> {
  const code = message.type === "text" ? message.text?.body?.trim().toUpperCase() : undefined;

  if (code) {
    const organization = await prisma.organization.findUnique({ where: { whatsappLinkCode: code } });
    if (organization) {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { whatsappPhone: from, whatsappLinkCode: null },
      });
      await sendWhatsAppMessage(
        from,
        `Prontinho! Esse número agora está conectado à conta "${organization.name}" no Oportuno Finanças. Pode me contar seus gastos e receitas, ou mandar foto de um recibo — eu registro tudo pra você.`
      );
      return;
    }
  }

  await sendWhatsAppMessage(
    from,
    "Não reconheço esse número ainda. Entre no Oportuno Finanças, vá em Configurações e me mande aqui o código de vinculação que aparece lá."
  );
}
