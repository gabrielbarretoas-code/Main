"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { DEFAULT_CATEGORY_TREE, DEFAULT_COST_CENTERS } from "@/lib/defaults";

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

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      trialEndsAt,
      users: {
        create: { email, name, passwordHash, role: "OWNER" },
      },
      costCenters: {
        create: DEFAULT_COST_CENTERS.map((name) => ({ name })),
      },
    },
  });

  for (const def of DEFAULT_CATEGORY_TREE) {
    const parent = await prisma.category.create({
      data: {
        name: def.name,
        type: def.type,
        entity: def.entity,
        color: def.color,
        icon: def.icon,
        organizationId: organization.id,
      },
    });

    if (def.children?.length) {
      await prisma.category.createMany({
        data: def.children.map((childName) => ({
          name: childName,
          type: def.type,
          entity: def.entity,
          color: def.color,
          icon: def.icon,
          organizationId: organization.id,
          parentId: parent.id,
        })),
      });
    }
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard?entity=PERSONAL",
  });

  return {};
}
