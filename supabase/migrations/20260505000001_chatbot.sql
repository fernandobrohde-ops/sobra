-- =====================================================================
-- Sobra · 20260505000001_chatbot.sql
-- Tabelas pra suporte do assistente WhatsApp via IA (briefing chatbot v1).
--
-- chat_messages    histórico de conversa (últimas 20 por usuário)
-- whatsapp_sessions vínculo entre número de WhatsApp e auth user
-- =====================================================================

-- ---------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------
create table public.chat_messages (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          not null references auth.users(id) on delete cascade,
  role        text          not null check (role in ('user', 'assistant', 'system', 'tool')),
  content     text          not null,
  /* tool_calls e tool_results em jsonb pra cobrir o function-calling do
     Claude. NULL pra mensagens puras de texto. */
  tool_data   jsonb,
  created_at  timestamptz   not null default now()
);

create index chat_messages_user_recent_idx
  on public.chat_messages (user_id, created_at desc);

comment on table public.chat_messages is
  'Histórico da conversa entre o usuário e o assistente Sobra. Mantemos apenas as últimas 20 por usuário (cleanup via trigger ou cron).';

-- ---------------------------------------------------------------------
-- whatsapp_sessions
-- ---------------------------------------------------------------------
create table public.whatsapp_sessions (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  /* Número em formato E.164 sem '+': "5511999998888". Único quando vinculado. */
  whatsapp_number text,
  /* Código que o usuário deve enviar pra confirmar vínculo (formato SOBRA-XXXXXX). */
  verification_code text      not null,
  verified        boolean     not null default false,
  /* Quando o usuário enviou a mensagem de confirmação */
  verified_at     timestamptz,
  /* Quando o vínculo expira se não for verificado (15 min) */
  expires_at      timestamptz not null default (now() + interval '15 minutes'),
  created_at      timestamptz not null default now(),
  /* Último uso — pra rate limiting e cleanup futuro */
  last_used_at    timestamptz
);

-- Cada usuário só tem UM vínculo verificado de cada vez.
create unique index whatsapp_sessions_user_verified_idx
  on public.whatsapp_sessions (user_id)
  where verified = true;

-- Cada número só pode estar vinculado a UM usuário verificado.
create unique index whatsapp_sessions_number_verified_idx
  on public.whatsapp_sessions (whatsapp_number)
  where verified = true and whatsapp_number is not null;

-- O webhook precisa achar rápido por código (durante a verificação)
create index whatsapp_sessions_code_idx
  on public.whatsapp_sessions (verification_code)
  where verified = false;

comment on table public.whatsapp_sessions is
  'Vincula número de WhatsApp a um usuário do Sobra. Fluxo: app gera código → usuário envia código no WhatsApp → webhook valida e marca verified=true.';

-- ---------------------------------------------------------------------
-- Cleanup automático: mantém só últimas 20 mensagens por usuário
-- ---------------------------------------------------------------------
create or replace function public.cleanup_chat_messages()
returns trigger
language plpgsql
as $$
begin
  -- Apaga as mensagens mais antigas que ultrapassem o limite de 20.
  delete from public.chat_messages
  where id in (
    select id from public.chat_messages
    where user_id = new.user_id
    order by created_at desc
    offset 20
  );
  return new;
end;
$$;

create trigger chat_messages_cleanup
  after insert on public.chat_messages
  for each row execute function public.cleanup_chat_messages();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.chat_messages enable row level security;

create policy chat_messages_select_own
  on public.chat_messages for select
  using (auth.uid() = user_id);

-- INSERT só via service_role (webhook). Não deixamos client inserir.
-- Sem policy de insert/update/delete pra usuários autenticados.

alter table public.whatsapp_sessions enable row level security;

create policy whatsapp_sessions_select_own
  on public.whatsapp_sessions for select
  using (auth.uid() = user_id);

-- INSERT/UPDATE controlados via Server Actions com service_role.
-- A action `gerar_codigo_vinculo` cria; o webhook valida.

-- ---------------------------------------------------------------------
-- RPC pra app gerar código de vínculo (usado pela tela /configuracoes).
-- Retorna o código pra o app exibir + instruções de uso.
-- ---------------------------------------------------------------------
create or replace function public.gerar_codigo_vinculo_whatsapp()
returns table (verification_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
  v_expires timestamptz;
begin
  if v_user_id is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Invalida códigos não verificados anteriores do mesmo user
  delete from public.whatsapp_sessions
  where user_id = v_user_id and verified = false;

  -- Gera código aleatório de 6 dígitos (com prefixo SOBRA-)
  v_code := 'SOBRA-' || lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires := now() + interval '15 minutes';

  insert into public.whatsapp_sessions
    (user_id, verification_code, expires_at)
  values
    (v_user_id, v_code, v_expires);

  return query select v_code, v_expires;
end;
$$;

revoke all on function public.gerar_codigo_vinculo_whatsapp() from public;
grant execute on function public.gerar_codigo_vinculo_whatsapp() to authenticated;
