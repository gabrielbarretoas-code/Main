"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { requireOrganizationId } from "@/lib/session";
import type { Entity, TransactionType } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/assets");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function createAsset(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const kind = String(formData.get("kind") ?? "PROPERTY") as "PROPERTY" | "VEHICLE";
  const name = String(formData.get("name") ?? "").trim();
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const acquisitionDateRaw = String(formData.get("acquisitionDate") ?? "");
  const acquisitionValueRaw = String(formData.get("acquisitionValue") ?? "").replace(",", ".");
  const currentValueRaw = String(formData.get("currentValue") ?? "").replace(",", ".");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name) return;

  await prisma.asset.create({
    data: {
      kind,
      name,
      entity,
      organizationId,
      acquisitionDate: acquisitionDateRaw ? new Date(acquisitionDateRaw) : null,
      acquisitionValue: acquisitionValueRaw ? Math.abs(parseFloat(acquisitionValueRaw)) || null : null,
      currentValue: currentValueRaw ? Math.abs(parseFloat(currentValueRaw)) || null : null,
      note,
    },
  });

  revalidateAll();
}

export async function deleteAsset(id: string) {
  const organizationId = await requireOrganizationId();
  const asset = await prisma.asset.findFirst({ where: { id, organizationId }, include: { documents: true } });
  if (!asset) return;

  for (const doc of asset.documents) {
    try {
      await del(doc.url);
    } catch {
      // já pode não existir mais; ignora.
    }
  }

  await prisma.asset.deleteMany({ where: { id, organizationId } });
  revalidateAll();
}

export type AssetDocumentResult =
  | { ok: true; id: string; url: string; name: string }
  | { ok: false; error: string };

export async function uploadAssetDocument(assetId: string, formData: FormData): Promise<AssetDocumentResult> {
  const organizationId = await requireOrganizationId();
  const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId } });
  if (!asset) return { ok: false, error: "Bem não encontrado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo." };

  let blobUrl: string;
  try {
    const blob = await put(`asset-documents/${organizationId}/${assetId}-${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    blobUrl = blob.url;
  } catch (e) {
    console.error("Falha ao enviar documento pro Vercel Blob:", e);
    return {
      ok: false,
      error: "Não foi possível enviar o documento. O armazenamento de arquivos (Vercel Blob) precisa estar habilitado no projeto.",
    };
  }

  const doc = await prisma.assetDocument.create({
    data: { assetId, url: blobUrl, name: file.name },
  });

  revalidatePath("/assets");
  return { ok: true, id: doc.id, url: doc.url, name: doc.name };
}

export async function removeAssetDocument(id: string) {
  const organizationId = await requireOrganizationId();
  const doc = await prisma.assetDocument.findFirst({
    where: { id, asset: { organizationId } },
  });
  if (!doc) return;

  try {
    await del(doc.url);
  } catch {
    // já pode não existir mais; ignora.
  }

  await prisma.assetDocument.delete({ where: { id } });
  revalidatePath("/assets");
}

export async function createAssetTransaction(formData: FormData) {
  const organizationId = await requireOrganizationId();
  const assetId = String(formData.get("assetId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Math.abs(parseFloat(String(formData.get("amount") ?? "0").replace(",", ".")) || 0);
  const type = String(formData.get("type") ?? "EXPENSE") as TransactionType;
  const entity = String(formData.get("entity") ?? "PERSONAL") as Entity;
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const dateRaw = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));

  if (!assetId || !description || !accountId || amount <= 0) return;

  const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId } });
  if (!asset) return;
  const account = await prisma.account.findFirst({ where: { id: accountId, organizationId } });
  if (!account) return;
  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, organizationId } });
    if (!category) return;
  }

  await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      entity,
      date: new Date(dateRaw),
      accountId,
      categoryId,
      organizationId,
      source: "asset",
      reconciled: true,
      reconciledAt: new Date(),
      reconciledBy: "user",
      assetId,
    },
  });

  revalidateAll();
}
