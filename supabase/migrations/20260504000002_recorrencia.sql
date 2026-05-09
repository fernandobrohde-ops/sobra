-- =====================================================================
-- Sobra · 20260504000002_recorrencia.sql
-- Adiciona suporte a movimentações recorrentes (briefing v2 #9).
--
-- Por enquanto guardamos só a periodicidade. A geração das próximas
-- ocorrências pode ser:
--   a) client-side (calcular as próximas N e mostrar como "previstas")
--   b) cron diário que materializa as próximas (v3)
--
-- Pra MVP, basta marcar o lançamento e mostrar badge "🔁 mensal" etc.
-- =====================================================================

alter table public.lancamentos
  add column if not exists recorrencia text
    check (recorrencia is null or recorrencia in ('mensal', 'semanal', 'anual'));

comment on column public.lancamentos.recorrencia is
  'Periodicidade da movimentação. NULL = lançamento avulso (default).';

-- Índice parcial pra cron futuro buscar recorrentes rapidamente
create index if not exists lancamentos_recorrencia_idx
  on public.lancamentos (user_id, recorrencia)
  where recorrencia is not null;
