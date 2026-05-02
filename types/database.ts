/**
 * Tipos do banco — placeholder mínimo.
 *
 * IMPORTANTE: SOBRESCREVA este arquivo assim que o schema estiver
 * aplicado no Supabase, usando o gerador oficial:
 *
 *   npx supabase gen types typescript \
 *     --project-id cppotgaghgzwolagvjdl \
 *     --schema public > types/database.ts
 *
 * Por que `Database = any`? Manter Tables/Views/Functions tipados
 * parcialmente faz o supabase-js inferir resultados como `never` em
 * projeções com colunas explícitas (`select('coluna1, coluna2')`),
 * o que quebra o build em vários pontos. Como solução de transição,
 * deixamos o shape totalmente frouxo.
 *
 * Type safety real é mantida via:
 *   - Enums explícitos abaixo (Setor, Plano, TipoLancamento, StatusLancamento)
 *   - Tipos de retorno em lib/dashboard/queries.ts
 *   - Tipos de input em lib/actions/*
 */

export type Setor =
  | 'alimentacao'
  | 'servicos'
  | 'comercio'
  | 'construcao'
  | 'saude'
  | 'educacao'
  | 'outros'

export type Plano = 'gratis' | 'essencial' | 'pro'

export type TipoLancamento = 'entrada' | 'saida'

export type StatusLancamento = 'pago' | 'recebido' | 'pendente'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
