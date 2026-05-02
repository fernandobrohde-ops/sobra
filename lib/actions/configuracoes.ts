'use server'

/**
 * Server Actions da tela /configuracoes (briefing 4.7).
 *
 * Cobre as 4 seções: Perfil, Categorias, Alertas, Plano (a parte de
 * Stripe fica em lib/actions/stripe.ts).
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Setor, TipoLancamento } from '@/types/database'

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string }

// ---------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------

export interface UpdatePerfilInput {
  nome_negocio: string
  setor: Setor
  whatsapp: string | null
}

export async function updatePerfil(input: UpdatePerfilInput): Promise<ActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  if (!input.nome_negocio.trim()) return { ok: false, error: 'O nome do negócio não pode ficar em branco.' }
  if (input.nome_negocio.trim().length > 120) return { ok: false, error: 'Nome muito longo (máx 120).' }
  if (!SETORES_VALIDOS.has(input.setor)) return { ok: false, error: 'Setor inválido.' }
  if (input.whatsapp && !/^\+?[0-9 ()-]{8,20}$/.test(input.whatsapp))
    return { ok: false, error: 'Telefone inválido.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      nome_negocio: input.nome_negocio.trim(),
      setor: input.setor,
      whatsapp: input.whatsapp,
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: 'Não consegui salvar agora. Tenta de novo.' }

  revalidatePath('/configuracoes')
  revalidatePath('/dashboard')
  return { ok: true }
}

const SETORES_VALIDOS = new Set<Setor>([
  'alimentacao', 'servicos', 'comercio', 'construcao', 'saude', 'educacao', 'outros',
])

// ---------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------

export interface AddCategoriaInput {
  nome: string
  tipo: TipoLancamento
  cor: string | null
}

export async function addCategoria(
  input: AddCategoriaInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  const nome = input.nome.trim()
  if (!nome) return { ok: false, error: 'Coloca um nome pra categoria.' }
  if (nome.length > 60) return { ok: false, error: 'Nome muito longo (máx 60).' }
  if (input.tipo !== 'entrada' && input.tipo !== 'saida') return { ok: false, error: 'Tipo inválido.' }
  if (input.cor && !/^#[0-9A-Fa-f]{6}$/.test(input.cor)) return { ok: false, error: 'Cor inválida.' }

  const { data, error } = await supabase
    .from('categorias')
    .insert({ user_id: user.id, nome, tipo: input.tipo, cor: input.cor })
    .select('id')
    .single()

  if (error) {
    // Trata o erro de unique (user_id, nome, tipo) que vem do banco.
    if (error.message.toLowerCase().includes('duplicate'))
      return { ok: false, error: 'Você já tem uma categoria com esse nome.' }
    return { ok: false, error: 'Não consegui salvar agora. Tenta de novo.' }
  }

  revalidatePath('/configuracoes')
  return { ok: true, data: { id: data.id } }
}

export async function deleteCategoria(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  // Por causa do `on delete set null` no FK de lancamentos.categoria_id,
  // os lançamentos antigos ficam com categoria_id = null e aparecem como
  // "Sem categoria". Sem perda de dados.
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: 'Não consegui excluir agora.' }

  revalidatePath('/configuracoes')
  revalidatePath('/dashboard')
  return { ok: true }
}

// ---------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------

export interface UpdateAlertasInput {
  whatsapp_ativo: boolean
  email_ativo: boolean
  alerta_vencimento_dias: 1 | 2 | 3 | 7
  resumo_semanal: boolean
}

export async function updateAlertas(input: UpdateAlertasInput): Promise<ActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  if (![1, 2, 3, 7].includes(input.alerta_vencimento_dias))
    return { ok: false, error: 'Antecedência inválida.' }

  // upsert porque se o profile foi criado mas (por algum motivo) a row de
  // alertas_config não existe, garantimos a criação aqui.
  const { error } = await supabase
    .from('alertas_config')
    .upsert(
      {
        user_id: user.id,
        whatsapp_ativo: input.whatsapp_ativo,
        email_ativo: input.email_ativo,
        alerta_vencimento_dias: input.alerta_vencimento_dias,
        resumo_semanal: input.resumo_semanal,
      },
      { onConflict: 'user_id' }
    )

  if (error) return { ok: false, error: 'Não consegui salvar agora.' }

  revalidatePath('/configuracoes')
  return { ok: true }
}
