import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERSONAL_EXPENSE = [
  ["Moradia", "#6366f1"],
  ["Alimentação", "#f59e0b"],
  ["Transporte", "#0ea5e9"],
  ["Saúde", "#ef4444"],
  ["Educação", "#a855f7"],
  ["Lazer", "#ec4899"],
  ["Assinaturas", "#14b8a6"],
  ["Outros", "#94a3b8"],
] as const;

const PERSONAL_INCOME = [
  ["Salário", "#22c55e"],
  ["Freelance", "#22c55e"],
  ["Outros rendimentos", "#22c55e"],
] as const;

const BUSINESS_EXPENSE = [
  ["Fornecedores", "#6366f1"],
  ["Folha de pagamento", "#ef4444"],
  ["Marketing", "#ec4899"],
  ["Impostos", "#f59e0b"],
  ["Infraestrutura", "#0ea5e9"],
  ["Outros", "#94a3b8"],
] as const;

const BUSINESS_INCOME = [
  ["Vendas", "#22c55e"],
  ["Serviços prestados", "#22c55e"],
] as const;

async function seedCategories(
  list: readonly (readonly [string, string])[],
  type: "EXPENSE" | "INCOME",
  entity: "PERSONAL" | "BUSINESS"
) {
  for (const [name, color] of list) {
    await prisma.category.upsert({
      where: { name_type_entity: { name, type, entity } },
      update: {},
      create: { name, type, entity, color },
    });
  }
}

async function main() {
  await seedCategories(PERSONAL_EXPENSE, "EXPENSE", "PERSONAL");
  await seedCategories(PERSONAL_INCOME, "INCOME", "PERSONAL");
  await seedCategories(BUSINESS_EXPENSE, "EXPENSE", "BUSINESS");
  await seedCategories(BUSINESS_INCOME, "INCOME", "BUSINESS");

  await prisma.account.upsert({
    where: { id: "seed-personal-wallet" },
    update: {},
    create: {
      id: "seed-personal-wallet",
      name: "Carteira",
      type: "CASH",
      entity: "PERSONAL",
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
