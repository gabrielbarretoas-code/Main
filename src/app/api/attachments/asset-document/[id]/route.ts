import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationId } from "@/lib/session";
import { streamPrivateBlob } from "@/lib/blobProxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const organizationId = await requireOrganizationId();

  const document = await prisma.assetDocument.findFirst({
    where: { id, asset: { organizationId } },
    select: { url: true, name: true },
  });
  if (!document) {
    return new NextResponse("Arquivo não encontrado.", { status: 404 });
  }

  return streamPrivateBlob(document.url, document.name);
}
