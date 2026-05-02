-- ====================================================================
-- Sobra · TODAS AS MIGRATIONS CONSOLIDADAS
-- Cole tudo isso de uma vez no SQL Editor do Supabase e clique RUN.
-- ====================================================================


-- ===========================================
-- 20260501000001_schema.sql
-- ===========================================
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

-- ===========================================
-- 20260501000002_rls.sql
-- ===========================================
-- =====================================================================
-- Sobra · 20260501000002_rls.sql
-- Row Level Security: cada usuário só vê e mexe em seus próprios dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

-- INSERT controlado: o profile é criado pela function completar_onboarding
-- (security definer) durante o onboarding. Mesmo assim, mantemos a policy
-- por defesa em profundidade.
create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sem DELETE: profiles são removidos via cascade de auth.users,
-- ou administrativamente pela service_role.

-- ---------------------------------------------------------------------
-- categorias
-- ---------------------------------------------------------------------
alter table public.categorias enable row level security;

create policy categorias_select_own
  on public.categorias for select
  using (auth.uid() = user_id);

create policy categorias_insert_own
  on public.categorias for insert
  with check (auth.uid() = user_id);

create policy categorias_update_own
  on public.categorias for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy categorias_delete_own
  on public.categorias for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- lancamentos
-- ---------------------------------------------------------------------
alter table public.lancamentos enable row level security;

create policy lancamentos_select_own
  on public.lancamentos for select
  using (auth.uid() = user_id);

create policy lancamentos_insert_own
  on public.lancamentos for insert
  with check (auth.uid() = user_id);

create policy lancamentos_update_own
  on public.lancamentos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy lancamentos_delete_own
  on public.lancamentos for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- alertas_config
-- ---------------------------------------------------------------------
alter table public.alertas_config enable row level security;

create policy alertas_config_select_own
  on public.alertas_config for select
  using (auth.uid() = user_id);

create policy alertas_config_insert_own
  on public.alertas_config for insert
  with check (auth.uid() = user_id);

create policy alertas_config_update_own
  on public.alertas_config for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sem DELETE direto: a row some via cascade quando o usuário é apagado.

-- ===========================================
-- 20260501000003_onboarding_function.sql
-- ===========================================
-- =====================================================================
-- Sobra · 20260501000003_onboarding_function.sql
-- Function chamada pelo client no fim do onboarding (briefing 4.2).
-- Cria perfil + categorias padrão do setor + alertas_config — atômico.
-- =====================================================================

-- ---------------------------------------------------------------------
-- categorias_padrao(setor)
-- Devolve a lista de categorias default daquele setor.
-- Tabela retornada para o caller usar em INSERT...SELECT.
-- ---------------------------------------------------------------------
create or replace function public.categorias_padrao(p_setor text)
returns table (nome text, tipo text)
language sql
immutable
as $$
  select t.nome, t.tipo
  from (values
    -- Serviços (briefing 4.2)
    ('servicos',    'Prestação de serviço', 'entrada'),
    ('servicos',    'Materiais',            'saida'),
    ('servicos',    'Transporte',           'saida'),
    ('servicos',    'Ferramentas',          'saida'),

    -- Alimentação
    ('alimentacao', 'Venda no balcão',      'entrada'),
    ('alimentacao', 'Delivery',             'entrada'),
    ('alimentacao', 'Ingredientes',         'saida'),
    ('alimentacao', 'Embalagem',            'saida'),

    -- Comércio
    ('comercio',    'Venda produto',        'entrada'),
    ('comercio',    'Estoque',              'saida'),
    ('comercio',    'Frete',                'saida'),
    ('comercio',    'Aluguel',              'saida'),

    -- Construção (não estava no briefing — defaults razoáveis)
    ('construcao',  'Recebimento de obra',  'entrada'),
    ('construcao',  'Material de obra',     'saida'),
    ('construcao',  'Mão de obra',          'saida'),
    ('construcao',  'Equipamentos',         'saida'),

    -- Saúde
    ('saude',       'Consultas',            'entrada'),
    ('saude',       'Procedimentos',        'entrada'),
    ('saude',       'Insumos',              'saida'),
    ('saude',       'Aluguel do espaço',    'saida'),

    -- Educação
    ('educacao',    'Mensalidades',         'entrada'),
    ('educacao',    'Aulas avulsas',        'entrada'),
    ('educacao',    'Material didático',    'saida'),
    ('educacao',    'Plataformas',          'saida'),

    -- Outros (genérico)
    ('outros',      'Receitas',             'entrada'),
    ('outros',      'Despesas',             'saida')
  ) as t(setor_alvo, nome, tipo)
  where t.setor_alvo = p_setor;
$$;

comment on function public.categorias_padrao(text) is
  'Retorna as categorias padrão para o setor. Usado por completar_onboarding.';

-- ---------------------------------------------------------------------
-- completar_onboarding(nome_negocio, setor, whatsapp)
-- Roda no fim do onboarding. Cria profile + categorias padrão +
-- alertas_config numa única transação. SECURITY DEFINER para conseguir
-- inserir as categorias mesmo com RLS, mas sempre escrevendo com o
-- auth.uid() do caller.
-- ---------------------------------------------------------------------
create or replace function public.completar_onboarding(
  p_nome_negocio text,
  p_setor text,
  p_whatsapp text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  -- Sempre exigir um usuário autenticado.
  if v_user_id is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Idempotência: se já existe profile, devolve o que tem (não recria nada).
  select * into v_profile from public.profiles where id = v_user_id;
  if found then
    return v_profile;
  end if;

  -- 1) profile
  insert into public.profiles (id, nome_negocio, setor, whatsapp)
  values (v_user_id, p_nome_negocio, p_setor, p_whatsapp)
  returning * into v_profile;

  -- 2) categorias padrão do setor
  insert into public.categorias (user_id, nome, tipo)
  select v_user_id, c.nome, c.tipo
  from public.categorias_padrao(p_setor) c;

  -- 3) alertas_config (defaults da própria tabela cuidam dos valores)
  insert into public.alertas_config (user_id) values (v_user_id);

  return v_profile;
end;
$$;

comment on function public.completar_onboarding(text, text, text) is
  'Cria profile + categorias padrão do setor + alertas_config numa transação. Idempotente.';

-- Permitir que usuários autenticados chamem a function.
revoke all on function public.completar_onboarding(text, text, text) from public;
grant execute on function public.completar_onboarding(text, text, text) to authenticated;
