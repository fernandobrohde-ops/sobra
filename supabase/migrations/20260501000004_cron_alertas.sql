-- =====================================================================
-- Sobra · 20260501000004_cron_alertas.sql
-- Agenda a Edge Function `alertas-diarios` pra rodar todo dia às 8h
-- (briefing 5.2).
--
-- Pré-requisitos:
--   1. Deploy da function: `supabase functions deploy alertas-diarios`
--   2. Definir os secrets: TWILIO_* ou ZAPI_* (via supabase secrets set)
--   3. ALTERAR o placeholder <SEU-PROJETO-REF> abaixo pelo subdomínio do projeto.
--
-- Documentação: https://supabase.com/docs/guides/functions/schedule-functions
-- =====================================================================

-- pg_cron e pg_net são extensões opt-in. Habilite-as no dashboard:
-- Database → Extensions → habilitar "pg_cron" e "pg_net".
-- (As linhas abaixo são idempotentes mas só funcionam se o usuário tiver
-- permissão. Em projetos free do Supabase, você precisa habilitar via UI.)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- Job 1: alertas de vencimento — todo dia às 8h America/Sao_Paulo (= 11h UTC)
-- ---------------------------------------------------------------------
select
  cron.schedule(
    'sobra-alertas-diarios',
    '0 11 * * *',  -- 8h BRT em UTC
    $$
    select net.http_post(
      url := 'https://<SEU-PROJETO-REF>.supabase.co/functions/v1/alertas-diarios',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  );

-- ---------------------------------------------------------------------
-- Job 2: resumo semanal — segunda-feira 8h
-- (a own function detecta isSegunda(), mas explicitamos via param `tipo`
--  pra dar pra disparar manualmente também)
-- ---------------------------------------------------------------------
-- Comentado por padrão — descomente após confirmar Job 1 funcionando.
-- select
--   cron.schedule(
--     'sobra-resumo-semanal',
--     '0 11 * * 1',  -- segunda 11h UTC
--     $$
--     select net.http_post(
--       url := 'https://<SEU-PROJETO-REF>.supabase.co/functions/v1/alertas-diarios?tipo=resumo-semanal',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );

-- Para listar / desagendar:
--   select * from cron.job;
--   select cron.unschedule('sobra-alertas-diarios');
