'use server'

/**
 * Server Actions para lançamentos.
 *
 * Cliente Supabase do server respeita RLS via cookies da sessão. Toda
 * mutação revalida `/dashboard` e `/contas` para refletir os números no
 * mesmo render (sem race condition com o cache do Next).
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { TipoLancamento, StatusLancamento } from '@/types/database'

export type Recorrencia = 'mensal' | 'semanal' | 'anual' | null

export interface AddLancamentoInput {
  descricao: string
  valor: number  // já parseado em decimal
  tipo: TipoLancamento
  status: StatusLancamento
  categoria_id: string | null
  data: string  // ISO YYYY-MM-DD
  data_vencimento: string | null
  cliente_fornecedor: string | null
  recorrencia: Recorrencia
}

export type AddLancamentoResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function addLancamento(
  input: AddLancamentoInput
): Promise<AddLancamentoResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  // Validações server-side. O DB também valida via CHECK, mas damos uma
  // mensagem amigável aqui antes de bater no banco.
  const erro = validar(input)
  if (erro) return { ok: false, error: erro }

  const { data, error } = await supabase
    .from('lancamentos')
    .insert({
      user_id: user.id,
      descricao: input.descricao.trim(),
      valor: input.valor,
      tipo: input.tipo,
      status: input.status,
      categoria_id: input.categoria_id,
      data: input.data,
      data_vencimento: input.data_vencimento,
      cliente_fornecedor: input.cliente_fornecedor?.trim() || null,
      recorrencia: input.recorrencia,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: traduzirErro(error.message) }
  }

  // Faz com que /dashboard e /contas releiam dados na próxima navegação.
  revalidatePath('/dashboard')
  revalidatePath('/contas')

  return { ok: true, id: data.id }
}

// ---------------------------------------------------------------------

function validar(input: AddLancamentoInput): string | null {
  if (!input.descricao.trim()) return 'Coloca uma descrição.'
  if (input.descricao.trim().length > 200)
    return 'Descrição muito longa (máx 200).'
  if (!Number.isFinite(input.valor) || input.valor <= 0)
    return 'O valor precisa ser maior que zero.'
  if (input.tipo !== 'entrada' && input.tipo !== 'saida')
    return 'Tipo inválido.'

  // Status precisa ser coerente com o tipo (mesmo CHECK do banco)
  if (input.tipo === 'entrada' && !['recebido', 'pendente'].includes(input.status))
    return 'Entrada só pode estar como recebida ou pendente.'
  if (input.tipo === 'saida' && !['pago', 'pendente'].includes(input.status))
    return 'Saída só pode estar como paga ou pendente.'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data))
    return 'Data inválida.'
  if (input.data_vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(input.data_vencimento))
    return 'Vencimento inválido.'
  if (input.recorrencia !== null && !['mensal', 'semanal', 'anual'].includes(input.recorrencia))
    return 'Recorrência inválida.'

  return null
}

function traduzirErro(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('row-level security'))
    return 'Sem permissão pra salvar. Tenta sair e entrar de novo.'
  if (m.includes('check constraint'))
    return 'Algum campo está com valor inválido. Confere e tenta de novo.'
  return 'Não consegui salvar agora. Tenta de novo.'
}

// ---------------------------------------------------------------------
// updateLancamento — usado pelo drawer em modo "editar"
// ---------------------------------------------------------------------

export type UpdateResult = { ok: true } | { ok: false; error: string }

export async function updateLancamento(
  id: string,
  input: AddLancamentoInput
): Promise<UpdateResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  const erro = validar(input)
  if (erro) return { ok: false, error: erro }

  const { error } = await supabase
    .from('lancamentos')
    .update({
      descricao: input.descricao.trim(),
      valor: input.valor,
      tipo: input.tipo,
      status: input.status,
      categoria_id: input.categoria_id,
      data: input.data,
      data_vencimento: input.data_vencimento,
      cliente_fornecedor: input.cliente_fornecedor?.trim() || null,
      recorrencia: input.recorrencia,
    })
    .eq('id', id)
    // RLS já garante user_id, mas reforçamos para evitar update por engano
    // se a policy mudar no futuro.
    .eq('user_id', user.id)

  if (error) {
    return { ok: false, error: traduzirErro(error.message) }
  }

  revalidatePath('/dashboard')
  revalidatePath('/contas')
  return { ok: true }
}

// ---------------------------------------------------------------------
// markLancamentoConcluido — usado pela tela /contas
// Pendente → Pago/Recebido conforme o tipo. Idempotente.
// ---------------------------------------------------------------------

export async function markLancamentoConcluido(
  id: string
): Promise<UpdateResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  // Lê o tipo para escolher o status correto. Faz num fetch só com .single()
  // e RLS garante que o usuário só vê os próprios.
  const { data: lanc, error: readErr } = await supabase
    .from('lancamentos')
    .select('tipo')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (readErr) return { ok: false, error: traduzirErro(readErr.message) }
  if (!lanc) return { ok: false, error: 'Lançamento não encontrado.' }

  const novoStatus: StatusLancamento = lanc.tipo === 'entrada' ? 'recebido' : 'pago'

  const { error } = await supabase
    .from('lancamentos')
    .update({ status: novoStatus, data_vencimento: null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: traduzirErro(error.message) }

  revalidatePath('/dashboard')
  revalidatePath('/contas')
  return { ok: true }
}

// ---------------------------------------------------------------------
// deleteLancamento — usado pela tela /contas
// Hard delete porque o briefing 4.5 lista "Excluir" como ação direta. RLS
// + policy `lancamentos_delete_own` garantem o escopo.
// ---------------------------------------------------------------------

export async function deleteLancamento(id: string): Promise<UpdateResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou. Entra de novo.' }

  const { error } = await supabase
    .from('lancamentos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: traduzirErro(error.message) }

  revalidatePath('/dashboard')
  revalidatePath('/contas')
  return { ok: true }
}
