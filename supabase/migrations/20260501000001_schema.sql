-- =====================================================================
-- Sobra · 20260501000001_schema.sql
-- Schema base: 4 tabelas, índices e trigger de updated_at.
-- RLS é configurado em 20260501000002_rls.sql.
-- =====================================================================

-- Extensões necessárias (gen_random_uuid já vem com pgcrypto no Supabase)
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Trigger genérico de updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles · estende auth.users com dados do negócio
-- ---------------------------------------------------------------------
create table public.profiles (
  id                       uuid        primary key references auth.users(id) on delete cascade,
  nome_negocio             text        not null check (length(trim(nome_negocio)) between 1 and 120),
  setor                    text        not null check (setor in ('alimentacao', 'servicos', 'comercio', 'construcao', 'saude', 'educacao', 'outros')),
  whatsapp                 text                 check (whatsapp is null or whatsapp ~ '^\+?[0-9 ()-]{8,20}$'),
  plano                    text        not null default 'essencial' check (plano in ('gratis', 'essencial', 'pro')),
  trial_fim                timestamptz          default (now() + interval '14 days'),
  stripe_customer_id       text,
  stripe_subscription_id   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is
  'Estende auth.users com os dados do negócio do MEI. 1:1 com auth.users.';

-- ---------------------------------------------------------------------
-- categorias · pré-populadas por setor no onboarding
-- ---------------------------------------------------------------------
create table public.categorias (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  nome        text        not null check (length(trim(nome)) between 1 and 60),
  tipo        text        not null check (tipo in ('entrada', 'saida')),
  cor         text                 check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone       text,
  created_at  timestamptz not null default now(),
  -- Evita duplicatas literais. O usuário pode ter "Aluguel" só uma vez por tipo.
  unique (user_id, nome, tipo)
);

create index categorias_user_idx on public.categorias (user_id);

comment on table public.categorias is
  'Categorias de lançamentos. Cada usuário tem suas próprias.';

-- ---------------------------------------------------------------------
-- lancamentos · entradas e saídas (tabela principal)
-- ---------------------------------------------------------------------
create table public.lancamentos (
  id                  uuid          primary key default gen_random_uuid(),
  user_id             uuid          not null references auth.users(id) on delete cascade,
  descricao           text          not null check (length(trim(descricao)) between 1 and 200),
  -- numeric(12,2) suporta até 9.999.999.999,99 — folga confortável pra MEI/ME.
  valor               numeric(12,2) not null check (valor > 0),
  tipo                text          not null check (tipo in ('entrada', 'saida')),
  status              text          not null default 'pendente'
                                    check (status in ('pago', 'recebido', 'pendente')),
  categoria_id        uuid                   references public.categorias(id) on delete set null,
  data                date          not null default current_date,
  data_vencimento     date,
  cliente_fornecedor  text                   check (cliente_fornecedor is null or length(trim(cliente_fornecedor)) <= 120),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  -- Coerência de status com tipo: entrada nunca é "pago", saida nunca é "recebido".
  constraint lancamentos_status_tipo_coerente check (
    (tipo = 'entrada' and status in ('recebido', 'pendente')) or
    (tipo = 'saida'   and status in ('pago',     'pendente'))
  )
);

create trigger lancamentos_set_updated_at
  before update on public.lancamentos
  for each row execute function public.set_updated_at();

-- Índices alinhados com os queries do briefing (seções 5.1 e 5.2):
-- - dashboard: somatórios por mês → filtra por user_id + data
-- - lista de últimas movimentações → ordena por data desc
create index lancamentos_user_data_idx
  on public.lancamentos (user_id, data desc);

-- - contas a pagar/receber → filtra por user_id + status pendente + data_vencimento
-- Index parcial economiza espaço (a maioria dos lançamentos antigos vai estar pago).
create index lancamentos_pendentes_idx
  on public.lancamentos (user_id, data_vencimento)
  where status = 'pendente';

-- - rotina de alertas (cron diário) → busca por data_vencimento global
create index lancamentos_vencimento_idx
  on public.lancamentos (data_vencimento)
  where status = 'pendente' and data_vencimento is not null;

comment on table public.lancamentos is
  'Cada linha é uma entrada ou saída de dinheiro do MEI/ME.';

-- ---------------------------------------------------------------------
-- alertas_config · 1:1 com profiles (chave primária = user_id)
-- ---------------------------------------------------------------------
create table public.alertas_config (
  user_id                 uuid        primary key references auth.users(id) on delete cascade,
  whatsapp_ativo          boolean     not null default true,
  email_ativo             boolean     not null default true,
  alerta_vencimento_dias  smallint    not null default 3 check (alerta_vencimento_dias in (1, 2, 3, 7)),
  resumo_semanal          boolean     not null default true,
  updated_at              timestamptz not null default now()
);

create trigger alertas_config_set_updated_at
  before update on public.alertas_config
  for each row execute function public.set_updated_at();

comment on table public.alertas_config is
  'Preferências de alerta por usuário. Lida pela rotina diária de cron.';
