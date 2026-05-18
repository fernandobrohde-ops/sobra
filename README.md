# Sobra

Dashboard financeiro para MEI e ME — Next.js 14 (App Router) + Supabase + TypeScript + Tailwind.

> Este repositório contém o **setup inicial** do MVP. As páginas, schema do banco e integrações (Stripe, Resend, WhatsApp) serão adicionadas nas próximas etapas, conforme o briefing.

## Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript** strict
- **Supabase** (auth via magic link + Google OAuth, Postgres, RLS)
- **Tailwind CSS** com tokens de design da marca
- **`@supabase/ssr`** (padrão atual recomendado pela Supabase)

## Estrutura

```
sobra/
├── app/
│   ├── (auth)/login/         # rota pública de login
│   ├── (app)/                # rotas autenticadas (dashboard, contas, etc)
│   ├── onboarding/           # primeira sessão do usuário
│   ├── api/                  # webhooks (stripe) e rotinas (alertas)
│   ├── layout.tsx            # fontes Lora + DM Sans, metadados
│   ├── page.tsx              # redireciona para /dashboard ou /login
│   └── globals.css           # tokens de design
├── components/               # ui, dashboard, lancamento, layout
├── lib/
│   ├── supabase/             # client.ts (browser), server.ts, middleware.ts
│   ├── stripe/               # (futuro)
│   └── utils/                # formatters, calculators (futuro)
├── types/database.ts         # tipos do banco (placeholder até gerar com supabase CLI)
├── middleware.ts             # protege rotas e atualiza sessão Supabase
├── tailwind.config.ts        # cores, tipografia, raios do briefing
├── package.json
├── tsconfig.json
└── .env.example
```

## Como rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (free tier basta).
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (mantenha em segredo!)
3. Em **Authentication → Providers**, ative:
   - **Email** (com magic link)
   - **Google** (siga o tutorial do Supabase para criar credenciais OAuth)

### 3. Aplicar o schema do banco

Existem três migrations em `supabase/migrations/`:

| Arquivo | O que faz |
|---|---|
| `20260501000001_schema.sql` | Cria as 4 tabelas (`profiles`, `categorias`, `lancamentos`, `alertas_config`) com índices e trigger de `updated_at`. |
| `20260501000002_rls.sql` | Habilita RLS e cria as policies — cada usuário só vê seus dados. |
| `20260501000003_onboarding_function.sql` | Cria a função `completar_onboarding(...)` que será chamada pelo client no fim do fluxo de onboarding. |

#### Opção A — Supabase CLI (recomendado)

```bash
# instalar o CLI uma única vez
npm i -g supabase

# linkar com o projeto remoto
supabase link --project-ref <ID-DO-PROJETO>

# aplicar as migrations
supabase db push
```

#### Opção B — SQL Editor do dashboard

Abra **SQL Editor** no painel do Supabase e cole o conteúdo dos três arquivos, **na ordem dos timestamps**, executando um por vez.

### 4. Gerar os tipos TypeScript do banco

Depois das migrations aplicadas, sobrescreva o placeholder em `types/database.ts`:

```bash
npx supabase gen types typescript \
  --project-id <ID-DO-PROJETO> \
  --schema public > types/database.ts
```

### 5. Variáveis de ambiente

```bash
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY
```

### 6. Subir o servidor de dev

```bash
npm run dev
```

Acesse `http://localhost:3000`. Como ainda não existe `/login` nem `/dashboard`, você verá um 404 — isso é esperado nesta etapa do setup.

## Funcionalidades implementadas

- ✅ **/login** — magic link + Google OAuth (briefing 4.1)
- ✅ **/onboarding** — wizard de 3 passos (briefing 4.2)
- ✅ **/dashboard** — hero, 2x2 grid, últimas movimentações, filtro de período (briefing 4.3)
- ✅ **Adicionar/editar lançamento** — drawer mobile/modal (briefing 4.4)
- ✅ **/contas** — A receber / A pagar com badges de urgência e ações inline (briefing 4.5)
- ✅ **/relatorio** — DRE simplificada + breakdown por categoria + export PDF (briefing 4.6)
- ✅ **/configuracoes** — perfil, categorias, alertas, plano (briefing 4.7)
- ✅ **Stripe** — checkout, billing portal, webhook (briefing 5.4) — *requer setup adicional*
- ✅ **Alertas WhatsApp** — Edge Function + cron 8h diário (briefing 5.2) — *requer setup adicional*

## Setup adicional (pagamento e alertas)

### Stripe (briefing 5.4)

1. Criar conta em [stripe.com](https://stripe.com), ativar modo teste.
2. Criar 2 produtos no Stripe Dashboard (Products → New):
   - **Sobra Essencial** — definir valor mensal recorrente
   - **Sobra Pro** — definir valor mensal recorrente
3. Pegar os Price IDs (`price_xxx`) e adicionar em `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ESSENCIAL=price_...
   STRIPE_PRICE_PRO=price_...
   ```
4. Configurar webhook em **Developers → Webhooks → Add endpoint**:
   - URL: `https://seu-app.vercel.app/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copiar o webhook secret pra `STRIPE_WEBHOOK_SECRET` no `.env.local`
5. Habilitar o billing portal em **Settings → Billing → Customer portal**.

Em dev, use o [Stripe CLI](https://stripe.com/docs/stripe-cli) pra testar webhook localmente:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Assistente WhatsApp com IA (chatbot)

O usuário conversa com o "Sobra" pelo WhatsApp e o Claude responde com dados reais do banco — usando function calling pra buscar lançamentos, registrar movimentações ou marcar contas como pagas.

1. **Aplicar a migration** `supabase/migrations/20260505000001_chatbot.sql` (cria `chat_messages` + `whatsapp_sessions` + RPC `gerar_codigo_vinculo_whatsapp`).

2. **Conta Anthropic**: criar em [console.anthropic.com](https://console.anthropic.com), pegar API key em Settings → API Keys.

3. **Setar secrets no Supabase** (adicione ao bloco anterior se ainda não fez):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # E o provider WhatsApp (Twilio OU Z-API)
   supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM='whatsapp:+14155238886'
   ```

4. **Deploy da Edge Function**:
   ```bash
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   ```
   `--no-verify-jwt` é necessário porque o webhook não tem JWT do Supabase (vem do WhatsApp direto).

5. **Configurar o webhook no provider**:
   - **Twilio**: Console → Messaging → WhatsApp Sandbox → Inbound URL = `https://<projeto>.supabase.co/functions/v1/whatsapp-webhook` (POST)
   - **Z-API**: Painel → Webhooks → Mensagem recebida = mesma URL acima

6. **Testar fluxo de vínculo**:
   - No app: Configurações → Assistente WhatsApp → "Ativar"
   - Copiar o código `SOBRA-XXXXXX`
   - Mandar a mensagem pro número do bot
   - O webhook valida e marca verified=true
   - A página detecta via polling e mostra "Assistente ativado ✓"

7. **Testar conversa**:
   - "Quanto sobrou esse mês?" → bot busca dados e responde
   - "Recebi 200 do João por consultoria" → bot pede confirmação e registra
   - "/ajuda" → lista de comandos

**Custos**: Claude Sonnet 4.5 a ~R$ 0,02 por mensagem média. Com 20 msg/dia/usuário no plano paid (R$ 49), custo de IA fica em ~5% da receita.

### Alertas WhatsApp (briefing 5.2)

1. Escolher um provedor:
   - **Twilio** (mais robusto, sandbox grátis): pegar `Account SID`, `Auth Token` e o número aprovado de WhatsApp (`whatsapp:+14155238886` no sandbox).
   - **Z-API** (mais barato no BR): pegar `Instance ID` e `Token`.
2. Setar os secrets no Supabase:
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_WHATSAPP_FROM='whatsapp:+14155238886'
   # OU
   supabase secrets set ZAPI_INSTANCE=... ZAPI_TOKEN=...
   ```
3. Deploy da Edge Function:
   ```bash
   supabase functions deploy alertas-diarios
   ```
4. No SQL Editor do Supabase, habilitar `pg_cron` e `pg_net` (Database → Extensions).
5. Editar `supabase/migrations/20260501000004_cron_alertas.sql` substituindo `<SEU-PROJETO-REF>` pelo subdomínio do projeto, e executar.
6. Verificar que o job foi agendado: `select * from cron.job;`

Para testar manualmente:
```bash
curl -X POST 'https://<projeto>.supabase.co/functions/v1/alertas-diarios' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Convenções

- **Mobile first**: testar tudo em 375px de largura. Tailwind é mobile first por padrão; use `md:`, `lg:` apenas para alargar.
- **Server Components por padrão.** Só adicione `'use client'` quando precisar de estado/efeito/eventos.
- **Tipagem estrita.** O `tsconfig` está em `strict: true`. Nada de `any` solto.
- **Sem jargão na UI.** O texto que aparece na tela deve fazer sentido para um MEI sem formação contábil.

## Tokens de design

Definidos em duas fontes (mantenha alinhadas):
- `tailwind.config.ts` — para uso no JSX (`bg-sobra-green`, `text-sobra-ink`, etc.)
- `app/globals.css` — para CSS puro (`var(--color-green)`)

| Token | Valor | Uso |
|---|---|---|
| `sobra-green` | `#0F6E56` | botão primário, card hero |
| `sobra-green-dark` | `#0d5f49` | hover do primário |
| `sobra-green-mid` | `#1D9E75` | focus de input |
| `sobra-bg` | `#F5F5F2` | fundo da app |
| `sobra-ink` | `#1A1A18` | texto principal |
| `sobra-line` | `#E8E8E3` | bordas |

Tipografia: **Lora** (display) e **DM Sans** (interface), carregadas via `next/font/google` em `app/layout.tsx`.
