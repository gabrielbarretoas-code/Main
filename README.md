# Finanças — Controle Financeiro Pessoal e Comercial

Aplicativo web responsivo (funciona em desktop e celular, instalável como PWA) para
controle de finanças pessoais e comerciais, mantidas separadas.

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
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

## Como publicar o app na internet (sem usar terminal)

1. Crie uma conta grátis em **vercel.com**, entrando com sua conta do GitHub (botão "Continue with GitHub").
2. Dentro da Vercel, clique em **"Add New" → "Project"**.
3. Escolha o repositório **gabrielbarretoas-code/Main** e clique em **"Import"**.
4. Em "Branch", selecione `claude/criar-aplicativo-n1kbo3` (ou faça o merge da PR para `main` antes, se preferir publicar a branch principal).
5. Antes de clicar em Deploy, crie o banco de dados: na própria tela de importação (ou depois, na aba **"Storage"** do projeto), clique em **"Create Database" → escolha "Postgres" (Neon)**. A Vercel conecta a variável `DATABASE_URL` automaticamente ao projeto.
6. Clique em **"Deploy"**. Aguarde alguns minutos — o próprio build já cria as tabelas e cadastra as categorias padrão automaticamente.
7. Ao terminar, a Vercel te dá um link (algo como `financas-app.vercel.app`) — é esse link que você acessa pelo navegador, no computador ou no celular.

## Como rodar localmente (opcional, exige terminal)

```bash
npm install
# defina DATABASE_URL no .env apontando para um Postgres (local ou na nuvem)
npx prisma db push
npm run db:seed
npm run dev
```

Acesse http://localhost:3000.

## Estrutura de dados

- `Account` — contas/carteiras/cartões, separadas por entidade (pessoal/comercial)
- `Category` — categorias de receita/despesa, por entidade
- `Transaction` — lançamentos (manuais ou importados), com status de conciliação
- `Budget` — valor planejado por categoria/mês/ano, comparado ao realizado
