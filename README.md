# Finanças — SaaS de Controle Financeiro Pessoal e Comercial

Aplicativo web responsivo (funciona em desktop e celular) para controle de finanças
pessoais e comerciais, com login e cada empresa/cliente vendo somente os próprios dados
(multi-tenant).

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev/) — login por e-mail/senha
- Tailwind CSS
- Recharts (gráficos)
- lucide-react (ícones)

## Funcionalidades

- Login e cadastro (cada cadastro cria uma organização isolada — pessoa ou empresa)
- Layout com barra lateral (estilo app bancário), responsivo — barra lateral fixa no
  desktop, barra de navegação inferior no celular
- Dashboard com BI: saldo, receitas/despesas do mês, comparação com mês anterior,
  maiores despesas, ranking de categorias, gráficos de categoria e evolução mensal
- Separação entre finanças **Pessoal** e **Comercial** dentro da mesma organização
- Lançamentos manuais de receitas/despesas com categorização
- Conciliação manual via importação de arquivo de extrato (CSV)
- Planejamento de orçamento por categoria (orçado x realizado)
- Gestão de contas e categorias

## Próximas fases (dependem de credenciais/serviços externos)

- **Pagamento/assinatura (Stripe):** bloqueio de acesso por plano pago
- **WhatsApp Business:** cliente lança despesas por mensagem, foto, áudio; identifica
  o cliente pelo número de telefone
- **Open Finance:** conexão bancária automática (ex: Pluggy, Belvo)
- **OCR/IA:** reconhecimento de despesas em fotos de recibos, áudio e texto livre

## Como publicar o app na internet (sem usar terminal)

1. Crie uma conta grátis em **vercel.com**, entrando com sua conta do GitHub.
2. **"Add New" → "Project"** → importe o repositório **gabrielbarretoas-code/Main**.
3. Antes de clicar em Deploy, adicione duas variáveis em **"Environment Variables"**:
   - `DATABASE_URL`: endereço de um banco Postgres gratuito (ex: crie um em
     [neon.tech](https://neon.tech), conecte com GitHub, copie a "Connection string")
   - `AUTH_SECRET`: qualquer texto longo e aleatório (ex: gere em
     [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32))
4. Clique em **"Deploy"**. O próprio build cria as tabelas do banco automaticamente.
5. Acesse o link que a Vercel gerar, clique em **"Criar conta grátis"** e cadastre a
   primeira organização.

## Como rodar localmente (opcional, exige terminal)

```bash
npm install
# crie um arquivo .env com DATABASE_URL (Postgres) e AUTH_SECRET
npx prisma db push
npm run dev
```

Acesse http://localhost:3000 e crie uma conta pela tela de cadastro.

## Estrutura de dados

- `Organization` — a empresa/cliente pagante; todo o resto pertence a uma organização
- `User` — login (e-mail/senha) vinculado a uma organização
- `Account` — contas/carteiras/cartões, por entidade (pessoal/comercial)
- `Category` — categorias de receita/despesa, por entidade
- `Transaction` — lançamentos (manuais ou importados), com status de conciliação
- `Budget` — valor planejado por categoria/mês/ano, comparado ao realizado
