'use server'

/**
 * Server Actions pra ativação do assistente WhatsApp.
 *
 * - gerarCodigoVinculo: chama RPC do banco que invalida códigos antigos
 *   e cria um SOBRA-XXXXXX novo válido por 15 min.
 * - getStatusVinculo: usado pelo client pra polling — saber se o usuário
 *   já mandou a mensagem confirmando.
 * - desvincular: remove o vínculo ativo.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPlanoUsuario } from '@/lib/billing/plano'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export interface CodigoVinculo {
  verification_code: string
  expires_at: string
  created_at: string
}

export async function gerarCodigoVinculo(): Promise<Result<CodigoVinculo>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  const plano = await getPlanoUsuario(supabase, user.id)
  if (plano.isFree) {
    return { ok: false, error: 'Assistente WhatsApp está disponível no plano Pro.' }
  }

  const { data, error } = await supabase.rpc('gerar_codigo_vinculo_whatsapp')
  if (error) return { ok: false, error: 'Não consegui gerar o código agora.' }

  // RPC retorna table — pega primeira row
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { ok: false, error: 'Resposta inesperada.' }

  revalidatePath('/configuracoes')
  return {
    ok: true,
    data: {
      verification_code: row.verification_code,
      expires_at: row.expires_at,
      created_at: new Date().toISOString(),
    },
  }
}

export interface StatusVinculo {
  vinculado: boolean
  whatsapp_number: string | null
  verified_at: string | null
}

export async function getStatusVinculo(): Promise<Result<StatusVinculo>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('whatsapp_number, verified, verified_at')
    .eq('user_id', user.id)
    .eq('verified', true)
    .maybeSingle()

  const row = data as { whatsapp_number: string | null; verified: boolean; verified_at: string | null } | null
  return {
    ok: true,
    data: {
      vinculado: !!row?.verified,
      whatsapp_number: row?.whatsapp_number ?? null,
      verified_at: row?.verified_at ?? null,
    },
  }
}

export async function desvincular(): Promise<Result<null>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  const { error } = await supabase
    .from('whatsapp_sessions')
    .delete()
    .eq('user_id', user.id)

  if (error) return { ok: false, error: 'Não consegui desvincular agora.' }
  revalidatePath('/configuracoes')
  return { ok: true, data: null }
}
