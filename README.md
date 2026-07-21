# WhatsApp Secretary

Automação que funciona como uma secretária/filtro para o seu WhatsApp: recebe suas mensagens através da **WhatsApp Business Platform (Cloud API)** oficial da Meta, organiza cada demanda como uma tarefa no **Todoist** (com título, prioridade e prazo extraídos automaticamente) e responde confirmando o que foi anotado.

## Como funciona

1. Alguém te manda uma mensagem no WhatsApp.
2. A Meta envia essa mensagem para o webhook desta aplicação.
3. A aplicação usa a API da Anthropic (Claude) para extrair um título curto, prioridade, prazo e categoria da mensagem (ou usa uma classificação simples por palavras-chave, se você não configurar a chave da Anthropic).
4. Cria uma tarefa no Todoist com essas informações.
5. Responde no WhatsApp confirmando o que foi anotado.

Por enquanto só mensagens de **texto** são processadas.

## Pré-requisitos

- Node.js 18 ou superior.
- Uma conta no [Meta for Developers](https://developers.facebook.com/) com um app configurado para **WhatsApp Business Platform**.
- Um token de API do [Todoist](https://todoist.com/) (Configurações → Integrações → Developer).
- (Opcional, recomendado) Uma chave de API da [Anthropic Console](https://console.anthropic.com/) para a classificação inteligente das mensagens.

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha as variáveis:

   ```bash
   cp .env.example .env
   ```

   - `WHATSAPP_TOKEN`: token de acesso do seu app na Meta (temporário para testes, ou permanente de uma conta de sistema).
   - `WHATSAPP_PHONE_NUMBER_ID`: ID do número de telefone do WhatsApp Business configurado no app.
   - `WHATSAPP_VERIFY_TOKEN`: uma string secreta que você mesmo escolhe, usada para validar a configuração do webhook.
   - `WHATSAPP_APP_SECRET`: App Secret do seu app na Meta, usado para validar a assinatura das requisições recebidas.
   - `TODOIST_API_TOKEN`: seu token de API do Todoist.
   - `ANTHROPIC_API_KEY` / `CLAUDE_MODEL`: opcional, para classificação inteligente das mensagens.

3. Rode o servidor:

   ```bash
   npm start
   ```

4. Para testar localmente, exponha a porta com uma ferramenta como [ngrok](https://ngrok.com/):

   ```bash
   ngrok http 3000
   ```

5. No painel do seu app na Meta (WhatsApp → Configuration → Webhook), configure:
   - **Callback URL**: `https://<sua-url-publica>/webhook`
   - **Verify Token**: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Assine o campo (field) **messages**.

6. Para produção, faça o deploy em qualquer serviço que rode Node.js (Render, Railway, Fly.io, um VPS, etc.) e aponte o webhook para a URL pública desse serviço.

## Segurança

- As requisições recebidas em `/webhook` têm a assinatura (`X-Hub-Signature-256`) validada usando `WHATSAPP_APP_SECRET`. Configure essa variável em produção.
- Nunca commite o arquivo `.env` (já está no `.gitignore`).

## Estrutura do projeto

```
src/
  server.js      # servidor Express, rotas do webhook e orquestração do fluxo
  whatsapp.js    # envio de mensagens e validação de assinatura da Meta
  todoist.js     # criação de tarefas no Todoist
  classifier.js  # extração de título/prioridade/prazo via Claude (com fallback)
```

## Próximos passos possíveis

- Suporte a mensagens de áudio (transcrição) e imagens.
- Persistir o histórico de mensagens processadas em um banco de dados.
- Regras de filtro (ex: ignorar remetentes desconhecidos, ou responder automaticamente perguntas frequentes).
