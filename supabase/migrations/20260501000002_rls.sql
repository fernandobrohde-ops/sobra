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
