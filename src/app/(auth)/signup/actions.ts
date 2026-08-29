"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

export type SignupState = { error?: string };

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!organizationName || !name || !email || password.length < 6) {
    return { error: "Preencha todos os campos. A senha precisa ter ao menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  await prisma.organization.create({
    data: {
      name: organizationName,
      trialEndsAt,
      users: {
        create: { email, name, passwordHash, role: "OWNER" },
      },
      categories: {
        create: [...DEFAULT_CATEGORIES],
      },
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard?entity=PERSONAL",
  });

  return {};
}

const DEFAULT_CATEGORIES = [
  { name: "Moradia", type: "EXPENSE", entity: "PERSONAL", color: "#6366f1" },
  { name: "Alimentação", type: "EXPENSE", entity: "PERSONAL", color: "#f59e0b" },
  { name: "Transporte", type: "EXPENSE", entity: "PERSONAL", color: "#0ea5e9" },
  { name: "Saúde", type: "EXPENSE", entity: "PERSONAL", color: "#ef4444" },
  { name: "Lazer", type: "EXPENSE", entity: "PERSONAL", color: "#ec4899" },
  { name: "Outros", type: "EXPENSE", entity: "PERSONAL", color: "#94a3b8" },
  { name: "Salário", type: "INCOME", entity: "PERSONAL", color: "#22c55e" },
  { name: "Fornecedores", type: "EXPENSE", entity: "BUSINESS", color: "#6366f1" },
  { name: "Folha de pagamento", type: "EXPENSE", entity: "BUSINESS", color: "#ef4444" },
  { name: "Marketing", type: "EXPENSE", entity: "BUSINESS", color: "#ec4899" },
  { name: "Impostos", type: "EXPENSE", entity: "BUSINESS", color: "#f59e0b" },
  { name: "Vendas", type: "INCOME", entity: "BUSINESS", color: "#22c55e" },
] as const;
