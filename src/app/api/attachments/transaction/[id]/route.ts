import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationId } from "@/lib/session";
import { streamPrivateBlob } from "@/lib/blobProxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await requireOrganizationId();

  const transaction = await prisma.transaction.findFirst({
    where: { id, organizationId },
    select: { attachmentUrl: true, attachmentName: true },
  });
  if (!transaction?.attachmentUrl) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  return streamPrivateBlob(transaction.attachmentUrl, transaction.attachmentName ?? "anexo");
}
