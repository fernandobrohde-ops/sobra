/**
 * Tools (functions) que o Claude pode chamar via function calling.
 *
 * Cada tool tem definição (schema enviado pra Claude) e handler (executa
 * a query no Supabase e retorna string formatada pro Claude usar).
 */
// @ts-ignore - Deno
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import type { ToolDefinition, ToolHandler } from './_claude.ts'

export function buildTools(supabase: SupabaseClient, userId: string): {
  definitions: ToolDefinition[]
  handlers: Record<string, ToolHandler>
} {
  console.error('[whatsapp-webhook] buildTools', { userId })

  const definitions: ToolDefinition[] = [
    {
      name: 'get_lancamentos',
      description:
        'Busca lançamentos do usuário com filtros. Use quando o usuário perguntar sobre movimentações específicas (ex: "quem ainda me deve?", "quais minhas vendas dessa semana?").',
      input_schema: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['entrada', 'saida'],
            description: 'Filtrar só entradas ou saídas. Omitir = ambos.',
          },
          status: {
            type: 'string',
            enum: ['pago', 'recebido', 'pendente'],
            description: 'Filtrar por status. Omitir = todos.',
          },
          data_inicio: {
            type: 'string',
            description: 'Data inicial em YYYY-MM-DD.',
          },
          data_fim: {
            type: 'string',
            description: 'Data final em YYYY-MM-DD.',
          },
          limit: {
            type: 'number',
            description: 'Máximo de resultados (default 10, máx 30).',
          },
        },
      },
    },
    {
      name: 'get_resumo_periodo',
      description:
        'Resumo financeiro agregado de um período. Use pra responder perguntas como "quanto sobrou esse mês?", "como foi outubro?".',
      input_schema: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', description: 'YYYY-MM-DD' },
          data_fim: { type: 'string', description: 'YYYY-MM-DD' },
          agrupar_por: {
            type: 'string',
            enum: ['categoria', 'tipo'],
            description: 'Opcional. Agrega o breakdown por categoria ou por tipo.',
          },
        },
        required: ['data_inicio', 'data_fim'],
      },
    },
    {
      name: 'criar_lancamento',
      description:
        'Cria um novo lançamento (entrada ou saída). SEMPRE confirme com o usuário antes de chamar (mostre o que vai registrar e pergunte "posso confirmar?"). Use quando o usuário descrever uma movimentação ("recebi 500 do João", "paguei 80 de internet"). IMPORTANTE: se o usuário disser "a receber", "me deve", "vai pagar", "ficou devendo" ou "cliente deve", crie como tipo="entrada" e status="pendente". Se disser "a pagar", "devo", "boleto", "conta em aberto" ou "tenho que pagar", crie como tipo="saida" e status="pendente". Só use status="recebido" quando o dinheiro já entrou; só use status="pago" quando o dinheiro já saiu.',
      input_schema: {
        type: 'object',
        properties: {
          descricao: { type: 'string', description: 'Descrição curta (até 200 chars).' },
          valor: { type: 'number', description: 'Valor em reais (positivo).' },
          tipo: { type: 'string', enum: ['entrada', 'saida'] },
          categoria_nome: {
            type: 'string',
            description: 'Nome da categoria (ex: "Marketing", "Venda"). Se não existir, será criada.',
          },
          status: {
            type: 'string',
            enum: ['pago', 'recebido', 'pendente'],
            description: 'Use pendente para a receber/a pagar. Use recebido para entrada já recebida. Use pago para saída já paga.',
          },
          data: { type: 'string', description: 'YYYY-MM-DD. Default: hoje.' },
          data_vencimento: {
            type: 'string',
            description: 'YYYY-MM-DD. Use quando status=pendente.',
          },
          cliente_fornecedor: { type: 'string', description: 'Opcional.' },
        },
        required: ['descricao', 'valor', 'tipo', 'status'],
      },
    },
    {
      name: 'get_vencimentos_proximos',
      description:
        'Lista lançamentos pendentes que vencem nos próximos N dias. Use pra "o que vence essa semana?".',
      input_schema: {
        type: 'object',
        properties: {
          dias: { type: 'number', description: 'Janela em dias (default 7).' },
        },
      },
    },
    {
      name: 'marcar_como_pago',
      description:
        'Marca um lançamento pendente como pago/recebido. Use quando o usuário disser "paguei aquela conta", "o cliente pagou".',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID do lançamento (UUID). Pegue de get_lancamentos antes.' },
        },
        required: ['id'],
      },
    },
  ]

  const handlers: Record<string, ToolHandler> = {
    get_lancamentos: async (input) => {
      console.error('[whatsapp-webhook] tool get_lancamentos start', { userId, input })
      let q = supabase
        .from('lancamentos')
        .select(`id, descricao, valor, tipo, status, data, data_vencimento, cliente_fornecedor,
                 categoria:categorias ( nome )`)
        .eq('user_id', userId)
        .order('data', { ascending: false })
        .limit(Math.min(Number(input.limit ?? 10), 30))

      if (input.tipo) q = q.eq('tipo', String(input.tipo))
      if (input.status) q = q.eq('status', String(input.status))
      if (input.data_inicio) q = q.gte('data', String(input.data_inicio))
      if (input.data_fim) q = q.lte('data', String(input.data_fim))

      const { data, error } = await q
      if (error) {
        console.error('[whatsapp-webhook] tool get_lancamentos error', { userId, error: error.message })
        return JSON.stringify({ error: error.message })
      }
      console.error('[whatsapp-webhook] tool get_lancamentos ok', { userId, count: data?.length ?? 0 })
      return JSON.stringify({ count: data?.length ?? 0, lancamentos: data ?? [] })
    },

    get_resumo_periodo: async (input) => {
      console.error('[whatsapp-webhook] tool get_resumo_periodo start', { userId, input })
      const { data_inicio, data_fim, agrupar_por } = input as Record<string, string>
      const { data, error } = await supabase
        .from('lancamentos')
        .select('tipo, valor, categoria:categorias ( nome )')
        .eq('user_id', userId)
        .gte('data', data_inicio)
        .lte('data', data_fim)
      if (error) {
        console.error('[whatsapp-webhook] tool get_resumo_periodo error', { userId, error: error.message })
        return JSON.stringify({ error: error.message })
      }

      let entradas = 0
      let saidas = 0
      const breakdown: Record<string, { tipo: string; total: number }> = {}
      for (const r of (data ?? []) as Array<{
        tipo: string; valor: number | string;
        categoria: { nome?: string } | { nome?: string }[] | null;
      }>) {
        const v = typeof r.valor === 'string' ? Number(r.valor) : r.valor
        if (!Number.isFinite(v)) continue
        if (r.tipo === 'entrada') entradas += v
        else if (r.tipo === 'saida') saidas += v

        if (agrupar_por) {
          const cat = Array.isArray(r.categoria) ? r.categoria[0] : r.categoria
          const key = agrupar_por === 'categoria'
            ? (cat?.nome ?? 'Sem categoria')
            : r.tipo
          if (!breakdown[key]) breakdown[key] = { tipo: r.tipo, total: 0 }
          breakdown[key].total += v
        }
      }

      const sobra = entradas - saidas
      const margem = entradas > 0 ? (sobra / entradas) * 100 : null

      return JSON.stringify({
        periodo: { inicio: data_inicio, fim: data_fim },
        total_entradas: entradas,
        total_saidas: saidas,
        sobra,
        margem_percentual: margem,
        breakdown: agrupar_por ? breakdown : undefined,
      })
    },

    criar_lancamento: async (input) => {
      console.error('[whatsapp-webhook] tool criar_lancamento start', { userId, input })
      const { descricao, valor } = input as Record<string, string | number>
      const tipo = normalizeTipo(input.tipo)
      const status = normalizeStatus(input.status, tipo)
      const today = new Date().toISOString().slice(0, 10)
      const data = (input.data as string) ?? today
      const dataVenc = status === 'pendente'
        ? normalizeDate(input.data_vencimento) ?? data
        : undefined

      if (!tipo || !status) {
        console.error('[whatsapp-webhook] tool criar_lancamento tipo/status inválido', { userId, input })
        return JSON.stringify({
          error: 'Tipo ou status inválido. Use entrada/saida e recebido/pago/pendente.',
        })
      }

      // Resolve categoria_nome → categoria_id (cria se não existir)
      let categoriaId: string | null = null
      if (input.categoria_nome) {
        const nome = String(input.categoria_nome).trim()
        const { data: existing } = await supabase
          .from('categorias')
          .select('id')
          .eq('user_id', userId)
          .eq('nome', nome)
          .eq('tipo', tipo)
          .maybeSingle()

        if (existing) {
          categoriaId = (existing as { id: string }).id
        } else {
          const { data: nova, error: catErr } = await supabase
            .from('categorias')
            .insert({ user_id: userId, nome, tipo })
            .select('id')
            .single()
          if (catErr) {
            console.error('[whatsapp-webhook] tool criar_lancamento categoria error', { userId, error: catErr.message })
            return JSON.stringify({ error: `Erro criando categoria: ${catErr.message}` })
          }
          categoriaId = (nova as { id: string }).id
        }
      }

      const { data: novo, error } = await supabase
        .from('lancamentos')
        .insert({
          user_id: userId,
          descricao: String(descricao),
          valor: Number(valor),
          tipo,
          status,
          categoria_id: categoriaId,
          data,
          data_vencimento: status === 'pendente' ? (dataVenc ?? null) : null,
          cliente_fornecedor: input.cliente_fornecedor ? String(input.cliente_fornecedor) : null,
        })
        .select('id, descricao, valor, tipo, status, data, data_vencimento')
        .single()

      if (error) {
        console.error('[whatsapp-webhook] tool criar_lancamento error', { userId, error: error.message })
        return JSON.stringify({ error: error.message })
      }
      console.error('[whatsapp-webhook] tool criar_lancamento ok', { userId, lancamento: novo })
      return JSON.stringify({
        ok: true,
        mensagem: 'Lançamento salvo no banco. Só afirme que registrou se ok=true.',
        lancamento: novo,
      })
    },

    get_vencimentos_proximos: async (input) => {
      console.error('[whatsapp-webhook] tool get_vencimentos_proximos start', { userId, input })
      const dias = Math.min(Number(input.dias ?? 7), 60)
      const today = new Date()
      const target = new Date(today.getTime() + dias * 24 * 60 * 60 * 1000)
      const todayStr = today.toISOString().slice(0, 10)
      const targetStr = target.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('lancamentos')
        .select(`id, descricao, valor, tipo, data_vencimento, cliente_fornecedor,
                 categoria:categorias ( nome )`)
        .eq('user_id', userId)
        .eq('status', 'pendente')
        .not('data_vencimento', 'is', null)
        .gte('data_vencimento', todayStr)
        .lte('data_vencimento', targetStr)
        .order('data_vencimento', { ascending: true })

      if (error) {
        console.error('[whatsapp-webhook] tool get_vencimentos_proximos error', { userId, error: error.message })
        return JSON.stringify({ error: error.message })
      }
      console.error('[whatsapp-webhook] tool get_vencimentos_proximos ok', { userId, count: data?.length ?? 0 })
      return JSON.stringify({ janela_dias: dias, count: data?.length ?? 0, vencimentos: data ?? [] })
    },

    marcar_como_pago: async (input) => {
      console.error('[whatsapp-webhook] tool marcar_como_pago start', { userId, input })
      const id = String(input.id)
      const { data: lanc, error: readErr } = await supabase
        .from('lancamentos')
        .select('tipo')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle()
      if (readErr) {
        console.error('[whatsapp-webhook] tool marcar_como_pago read error', { userId, error: readErr.message })
        return JSON.stringify({ error: readErr.message })
      }
      if (!lanc) {
        console.error('[whatsapp-webhook] tool marcar_como_pago not found', { userId, id })
        return JSON.stringify({ error: 'Lançamento não encontrado.' })
      }

      const novoStatus = (lanc as { tipo: string }).tipo === 'entrada' ? 'recebido' : 'pago'
      const { error } = await supabase
        .from('lancamentos')
        .update({ status: novoStatus, data_vencimento: null })
        .eq('id', id)
        .eq('user_id', userId)
      if (error) {
        console.error('[whatsapp-webhook] tool marcar_como_pago update error', { userId, error: error.message })
        return JSON.stringify({ error: error.message })
      }
      console.error('[whatsapp-webhook] tool marcar_como_pago ok', { userId, id, novoStatus })
      return JSON.stringify({ ok: true, novo_status: novoStatus })
    },
  }

  return { definitions, handlers }
}

function normalizeTipo(value: unknown): 'entrada' | 'saida' | null {
  const tipo = String(value ?? '').toLowerCase().trim()
  if (tipo === 'entrada' || tipo === 'receita' || tipo === 'receber') return 'entrada'
  if (tipo === 'saida' || tipo === 'saída' || tipo === 'despesa' || tipo === 'pagar') return 'saida'
  return null
}

function normalizeStatus(value: unknown, tipo: 'entrada' | 'saida' | null): 'recebido' | 'pago' | 'pendente' | null {
  const status = String(value ?? '').toLowerCase().trim()
  if (status === 'pendente' || status === 'a_receber' || status === 'a receber' || status === 'a_pagar' || status === 'a pagar') {
    return 'pendente'
  }
  if (tipo === 'entrada' && (status === 'recebido' || status === 'pago')) return status === 'pago' ? 'recebido' : 'recebido'
  if (tipo === 'saida' && (status === 'pago' || status === 'recebido')) return status === 'recebido' ? 'pago' : 'pago'
  return null
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  const date = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}
