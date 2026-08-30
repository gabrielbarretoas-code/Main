import "server-only";

import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

/**
 * Busca um blob privado e devolve como resposta HTTP pronta pra servir —
 * usado pelas rotas de anexo, que já validaram que o usuário logado tem
 * permissão de ver esse arquivo específico antes de chamar isso.
 */
export async function streamPrivateBlob(blobUrl: string, filename: string): Promise<NextResponse> {
  const blob = await get(blobUrl, { access: "private" });
  if (!blob?.stream) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
