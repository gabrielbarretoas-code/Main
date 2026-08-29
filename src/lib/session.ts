import { auth } from "@/auth";

export async function requireOrganizationId(): Promise<string> {
  const session = await auth();
  if (!session?.user.organizationId) {
    throw new Error("Não autenticado.");
  }
  return session.user.organizationId;
}
