"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireOrganizationId } from "@/lib/session";
import { importTransactionRecords } from "@/lib/transactionImport";
import type { ParsedTransaction } from "@/lib/statementImport";
import type { Entity, AccountType } from "@/lib/types";
import {
  createConnectToken,
  getItem,
  triggerItemUpdate,
  deleteItem,
  listAccounts,
  listTransactions,
  type PluggyAccount,
} from "@/lib/pluggy";

function revalidateAll() {
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

function mapAccountType(account: PluggyAccount): AccountType {
  if (account.type === "CREDIT") return "CREDIT_CARD";
  if (account.subtype === "SAVINGS_ACCOUNT") return "SAVINGS";
  return "CHECKING";
}

function hasAutoInvestBalance(account: PluggyAccount): boolean {
  return (account.bankData?.automaticallyInvestedBalance ?? 0) > 0;
}

export async function getConnectToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  await requireOrganizationId();
  try {
    const token = await createConnectToken();
    return { ok: true, token };
  } catch {
    return { ok: false, error: "Não foi possível iniciar a conexão com o Open Finance agora." };
  }
}

async function syncAccountTransactions(
  organizationId: string,
  localAccountId: string,
  entity: Entity,
  pluggyAccountId: string,
  hasAutoInvest: boolean
): Promise<number> {
  const pluggyTransactions = await listTransactions(pluggyAccountId);
  const parsed: ParsedTransaction[] = pluggyTransactions.map((t) => ({
    date: new Date(t.date),
    description: t.description,
    amount: t.amount,
    externalId: t.id,
  }));
  const { imported } = await importTransactionRecords(
    organizationId,
    localAccountId,
    entity,
    parsed,
    "open_finance",
    hasAutoInvest
  );
  return imported;
}

export async function handleItemConnected(
  pluggyItemId: string,
  entity: Entity
): Promise<{ ok: true; accountsCreated: number; transactionsImported: number } | { ok: false; error: string }> {
  const organizationId = await requireOrganizationId();

  const alreadyLinked = await prisma.openFinanceConnection.findUnique({ where: { pluggyItemId } });
  if (alreadyLinked) {
    return { ok: false, error: "Essa conexão já está vinculada." };
  }

  let item;
  try {
    item = await getItem(pluggyItemId);
  } catch {
    return { ok: false, error: "Não foi possível confirmar a conexão com o banco." };
  }

  if (item.status === "LOGIN_ERROR" || item.status === "ERROR") {
    return { ok: false, error: item.error?.message ?? "A conexão com o banco falhou." };
  }

  let pluggyAccounts: PluggyAccount[];
  try {
    pluggyAccounts = await listAccounts(pluggyItemId);
  } catch {
    return { ok: false, error: "Não foi possível buscar as contas desse banco." };
  }

  if (pluggyAccounts.length === 0) {
    return { ok: false, error: "Nenhuma conta bancária ou cartão encontrado nessa conexão." };
  }

  const connection = await prisma.openFinanceConnection.create({
    data: {
      organizationId,
      entity,
      pluggyItemId,
      institutionName: item.connector.name,
      status: item.status,
      lastSyncedAt: new Date(),
    },
  });

  let transactionsImported = 0;
  for (const pa of pluggyAccounts) {
    const autoInvest = hasAutoInvestBalance(pa);
    const account = await prisma.account.create({
      data: {
        name: pa.name,
        type: mapAccountType(pa),
        entity,
        organizationId,
        hasAutoInvest: autoInvest,
      },
    });
    await prisma.openFinanceAccountLink.create({
      data: { connectionId: connection.id, pluggyAccountId: pa.id, accountId: account.id },
    });
    transactionsImported += await syncAccountTransactions(
      organizationId,
      account.id,
      entity,
      pa.id,
      autoInvest
    );
  }

  revalidateAll();

  return { ok: true, accountsCreated: pluggyAccounts.length, transactionsImported };
}

export async function syncOpenFinanceConnection(
  connectionId: string
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const organizationId = await requireOrganizationId();

  const connection = await prisma.openFinanceConnection.findFirst({
    where: { id: connectionId, organizationId },
    include: { accountLinks: true },
  });
  if (!connection) return { ok: false, error: "Conexão não encontrada." };

  const triggerResult = await triggerItemUpdate(connection.pluggyItemId);
  if (!triggerResult.ok) {
    return { ok: false, error: triggerResult.error };
  }

  let item = triggerResult.item;
  for (let i = 0; i < 8 && item.status === "UPDATING"; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    item = await getItem(connection.pluggyItemId);
  }

  if (item.status === "LOGIN_ERROR" || item.status === "ERROR") {
    await prisma.openFinanceConnection.update({
      where: { id: connectionId },
      data: { status: item.status, statusDetail: item.error?.message ?? null },
    });
    revalidateAll();
    return { ok: false, error: item.error?.message ?? "A sincronização falhou — pode ser necessário reconectar." };
  }

  let imported = 0;
  for (const link of connection.accountLinks) {
    const account = await prisma.account.findUnique({ where: { id: link.accountId } });
    if (!account) continue;
    imported += await syncAccountTransactions(
      organizationId,
      link.accountId,
      connection.entity,
      link.pluggyAccountId,
      account.hasAutoInvest
    );
  }

  await prisma.openFinanceConnection.update({
    where: { id: connectionId },
    data: { status: item.status, statusDetail: null, lastSyncedAt: new Date() },
  });

  revalidateAll();
  return { ok: true, imported };
}

export async function removeOpenFinanceConnection(connectionId: string) {
  const organizationId = await requireOrganizationId();
  const connection = await prisma.openFinanceConnection.findFirst({ where: { id: connectionId, organizationId } });
  if (!connection) return;

  try {
    await deleteItem(connection.pluggyItemId);
  } catch {
    // pode já ter sido removido do lado da Pluggy; segue com a remoção local.
  }

  await prisma.openFinanceConnection.delete({ where: { id: connectionId } });
  revalidateAll();
}
