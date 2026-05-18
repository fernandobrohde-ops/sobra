import type { createClient } from '@/lib/supabase/server'
import type { Plano } from '@/types/database'

export const FREE_LANCAMENTOS_MENSAIS = 30
export const PRO_STATUSES = new Set(['active', 'trialing'])

export interface PlanoUsuario {
  plano: Plano
  subscription_status: string | null
  isPro: boolean
  isFree: boolean
}

export interface UsoMensalLancamentos {
  usados: number
  limite: number
  restante: number
  atingiuLimite: boolean
}

type SupabaseServerClient = ReturnType<typeof createClient>

export async function getPlanoUsuario(
  supabase: SupabaseServerClient,
  userId: string
): Promise<PlanoUsuario> {
  const { data } = await supabase
    .from('profiles')
    .select('plano, subscription_status')
    .eq('id', userId)
    .maybeSingle()

  const plano = ((data?.plano as Plano | null) ?? 'free')
  const subscriptionStatus = (data?.subscription_status as string | null) ?? null
  const isPro = plano === 'pro' && PRO_STATUSES.has(subscriptionStatus ?? '')

  return {
    plano,
    subscription_status: subscriptionStatus,
    isPro,
    isFree: !isPro,
  }
}

export async function getUsoMensalLancamentos(
  supabase: SupabaseServerClient,
  userId: string,
  baseDate = new Date()
): Promise<UsoMensalLancamentos> {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1)

  const { count } = await supabase
    .from('lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())

  const usados = count ?? 0

  return {
    usados,
    limite: FREE_LANCAMENTOS_MENSAIS,
    restante: Math.max(0, FREE_LANCAMENTOS_MENSAIS - usados),
    atingiuLimite: usados >= FREE_LANCAMENTOS_MENSAIS,
  }
}

export async function getBillingContext(
  supabase: SupabaseServerClient,
  userId: string
) {
  const [plano, usoMensal] = await Promise.all([
    getPlanoUsuario(supabase, userId),
    getUsoMensalLancamentos(supabase, userId),
  ])

  return { ...plano, usoMensal }
}
