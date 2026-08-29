# Finanças — Controle Financeiro Pessoal e Comercial

Aplicativo web responsivo (funciona em desktop e celular, instalável como PWA) para
controle de finanças pessoais e comerciais, mantidas separadas.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma ORM](https://www.prisma.io/) + SQLite (fácil de trocar por Postgres/Supabase depois)
- Tailwind CSS
- Recharts (gráficos)

## Funcionalidades (MVP — Fase 1)

- Dashboard com saldo, receitas/despesas do mês e gráficos
- Separação entre finanças **Pessoal** e **Comercial** (alternável pelo topo)
- Lançamentos manuais de receitas/despesas com categorização
- Conciliação manual via importação de arquivo de extrato (CSV)
- Planejamento de orçamento por categoria (orçado x realizado)
- Gestão de contas e categorias

## Próximas fases (dependem de credenciais/serviços externos)

- Conexão bancária via Open Finance (ex: Pluggy, Belvo)
- Integração com WhatsApp Business API para lançar despesas e receber alertas
- Reconhecimento automático de despesas por foto de recibo, áudio, texto e arquivos (OCR/IA)

## Como rodar localmente

```bash
npm install
npx prisma db push   # cria o banco SQLite local a partir do schema
npm run db:seed      # popula categorias padrão (pessoal e comercial)
npm run dev
```

Acesse http://localhost:3000.

## Estrutura de dados

- `Account` — contas/carteiras/cartões, separadas por entidade (pessoal/comercial)
- `Category` — categorias de receita/despesa, por entidade
- `Transaction` — lançamentos (manuais ou importados), com status de conciliação
- `Budget` — valor planejado por categoria/mês/ano, comparado ao realizado
