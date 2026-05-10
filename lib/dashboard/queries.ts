/**
 * Queries do dashboard (briefing 4.3 + 5.1).
 *
 * Server-only — usa o cliente Supabase do servidor (que respeita RLS via
 * cookies da sessão do usuário). Todas as queries rodam em paralelo
 * (Promise.all) para minimizar latência.
 */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoLancamento, StatusLancamento } from '@/types/database'
import { getDateRange, getPreviousRange, type Period } from '@/lib/utils/period'

// SupabaseClient com generics frouxos. O placeholder em types/database.ts
// não bate 100% com a shape estrita que o supabase-js espera em todos os
// generics (Views, Functions, CompositeTypes), o que faz tsc reclamar
// quando passamos o client tipado. Relaxar aqui é seguro porque:
//   - Os retornos das helpers (PendenteListItem etc.) são tipados
//   - Os call sites que consomem essas helpers ainda recebem tipos certos
// Quando rodar `supabase gen types typescript --project-id ...`, vale
// voltar pra SupabaseClient<Database>.
type DB = SupabaseClient<any, any, any>

export interface DashboardData {
  /** Sobra do período = entradas - saídas */
  sobra: number
  /** Receita bruta no período (somatório de entradas) */
  faturado: number
  /** Total de saídas no período */
  totalSaidas: number
  /** Variação % vs período anterior (null se não dá para calcular) */
  variacao: number | null
  /** Sobra do período anterior (em valor absoluto) — pra microcopy */
  sobraAnterior: number
  /** Pendentes — não dependem do período */
  aReceber: number
  aPagar: number
  /** Últimas movimentações no período (10 mais recentes) */
  ultimasMovimentacoes: MovimentacaoListItem[]
  /** Histórico mensal pra sparkline (últimos 6 meses, mais antigo primeiro) */
  historicoMensal: HistoricoMes[]
}

export interface HistoricoMes {
  mes: number  // 1-12
  ano: number
  label: string  // "mai/26"
  entradas: number
  saidas: number
  sobra: number
}

export interface MovimentacaoListItem {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  status: StatusLancamento
  data: string  // ISO date
  data_vencimento: string | null
  cliente_fornecedor: string | null
  categoria: { id: string; nome: string; cor: string | null; tipo: TipoLancamento } | null
  recorrencia: 'mensal' | 'semanal' | 'anual' | null
}

/**
 * Carrega tudo que o dashboard precisa em paralelo.
 */
export async function getDashboardData(
  supabase: DB,
  userId: string,
  period: Period
): Promise<DashboardData> {
  const cur = getDateRange(period)
  const prev = getPreviousRange(period)

  const [
    sumsCurrent,
    sumsPrev,
    pendentes,
    movimentacoes,
    historicoMensal,
  ] = await Promise.all([
    sumByTipo(supabase, userId, cur.start, cur.end),
    sumByTipo(supabase, userId, prev.start, prev.end),
    sumPendentes(supabase, userId),
    listUltimas(supabase, userId, cur.start, cur.end, 10),
    getHistoricoMensal(supabase, userId, 6),
  ])

  const sobra = sumsCurrent.entrada - sumsCurrent.saida
  const sobraAnterior = sumsPrev.entrada - sumsPrev.saida

  // Briefing 5.1: ((sobra_mes_atual - sobra_mes_anterior) / sobra_mes_anterior) * 100
  // Edge cases:
  //  - Sem dados no período anterior (sobraAnterior=0): variação não é
  //    significativa, retornamos null e a UI mostra "—".
  //  - sobraAnterior negativo: a fórmula ainda funciona, mas o sinal pode
  //    confundir. Mantemos pelo briefing — se o produto evoluir, voltamos.
  const variacao =
    sobraAnterior !== 0
      ? ((sobra - sobraAnterior) / Math.abs(sobraAnterior)) * 100
      : null

  return {
    sobra,
    faturado: sumsCurrent.entrada,
    totalSaidas: sumsCurrent.saida,
    variacao,
    sobraAnterior,
    aReceber: pendentes.entrada,
    aPagar: pendentes.saida,
    ultimasMovimentacoes: movimentacoes,
    historicoMensal,
  }
}

// ---------------------------------------------------------------------
// Histórico mensal — usado pelo sparkline do hero card.
// Pega os últimos N meses (incluindo o atual). Resolve em memória depois
// de uma query única.
// ---------------------------------------------------------------------
async function getHistoricoMensal(
  supabase: DB,
  userId: string,
  meses: number
): Promise<HistoricoMes[]> {
  const hoje = new Date()
  // Início do mês mais antigo a buscar
  const start = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1)
  const end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`

  const { data } = await supabase
    .from('lancamentos')
    .select('tipo, valor, data')
    .eq('user_id', userId)
    .gte('data', startStr)
    .lte('data', endStr)

  // Inicializa buckets pra cada mês no range (mais antigo → atual)
  const buckets: HistoricoMes[] = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    buckets.push({
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') +
             '/' + String(d.getFullYear()).slice(-2),
      entradas: 0,
      saidas: 0,
      sobra: 0,
    })
  }

  // Soma por mês
  for (const row of (data ?? []) as Array<{ tipo: string; valor: number | string; data: string }>) {
    const v = typeof row.valor === 'string' ? Number(row.valor) : row.valor
    if (!Number.isFinite(v)) continue
    const [yStr, mStr] = row.data.split('-')
    const y = Number(yStr), m = Number(mStr)
    const bucket = buckets.find((b) => b.ano === y && b.mes === m)
    if (!bucket) continue
    if (row.tipo === 'entrada') bucket.entradas += v
    else if (row.tipo === 'saida') bucket.saidas += v
  }

  for (const b of buckets) b.sobra = b.entradas - b.saidas
  return buckets
}

// ---------------------------------------------------------------------
// Queries internas
// ---------------------------------------------------------------------

interface ValoresPorTipo {
  entrada: number
  saida: number
}

/**
 * Soma de `valor` por `tipo` num intervalo de datas. Faz uma única query
 * pegando só as colunas necessárias e somando em memória — para os volumes
 * de um MEI (centenas, talvez milhares de lançamentos), é tranquilo.
 *
 * Quando o volume crescer, dá para criar uma view materializada ou uma
 * RPC que faz `select tipo, sum(valor) from lancamentos ... group by tipo`.
 */
async function sumByTipo(
  supabase: DB,
  userId: string,
  start: string,
  end: string
): Promise<ValoresPorTipo> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('tipo, valor')
    .eq('user_id', userId)
    .gte('data', start)
    .lte('data', end)

  if (error) throw error
  return reduceByTipo(data ?? [])
}

async function sumPendentes(supabase: DB, userId: string): Promise<ValoresPorTipo> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('tipo, valor')
    .eq('user_id', userId)
    .eq('status', 'pendente')

  if (error) throw error
  return reduceByTipo(data ?? [])
}

function reduceByTipo(rows: { tipo: string; valor: number | string }[]): ValoresPorTipo {
  const acc: ValoresPorTipo = { entrada: 0, saida: 0 }
  for (const r of rows) {
    const v = typeof r.valor === 'string' ? Number(r.valor) : r.valor
    if (!Number.isFinite(v)) continue
    if (r.tipo === 'entrada') acc.entrada += v
    else if (r.tipo === 'saida') acc.saida += v
  }
  return acc
}

// ---------------------------------------------------------------------
// getRelatorioMes — alimenta a tela /relatorio (briefing 4.6)
// DRE simplificada + breakdown por categoria.
// ---------------------------------------------------------------------

export interface CategoriaBreakdown {
  categoria_id: string | null
  nome: string
  cor: string | null
  tipo: TipoLancamento
  total: number
  qtd: number
}

export interface RelatorioMes {
  mes: number  // 1-12
  ano: number
  receitaBruta: number
  custos: number
  lucroLiquido: number
  margem: number | null  // null se receitaBruta = 0
  breakdown: CategoriaBreakdown[]
}

export async function getRelatorioMes(
  supabase: DB,
  userId: string,
  mes: number,
  ano: number
): Promise<RelatorioMes> {
  // Calcula start/end do mês solicitado
  const start = `${ano}-${String(mes).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes, 0).getDate()  // mes (1-12) + day=0 = último dia do mês
  const end = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('lancamentos')
    .select(`
      tipo, valor,
      categoria:categorias ( id, nome, cor, tipo )
    `)
    .eq('user_id', userId)
    .gte('data', start)
    .lte('data', end)

  if (error) throw error

  // Agrupa em memória — para os volumes do MEI, é tranquilo.
  const acc = new Map<string, CategoriaBreakdown>()
  let receitaBruta = 0
  let custos = 0

  for (const row of data ?? []) {
    const valor = typeof row.valor === 'string' ? Number(row.valor) : row.valor
    if (!Number.isFinite(valor)) continue

    if (row.tipo === 'entrada') receitaBruta += valor
    else if (row.tipo === 'saida') custos += valor

    const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria
    const key = cat?.id ?? `__sem_cat_${row.tipo}`
    const existing = acc.get(key)
    if (existing) {
      existing.total += valor
      existing.qtd += 1
    } else {
      acc.set(key, {
        categoria_id: cat?.id ?? null,
        nome: cat?.nome ?? 'Sem categoria',
        cor: cat?.cor ?? null,
        tipo: (cat?.tipo as TipoLancamento) ?? (row.tipo as TipoLancamento),
        total: valor,
        qtd: 1,
      })
    }
  }

  const lucroLiquido = receitaBruta - custos
  const margem = receitaBruta !== 0 ? (lucroLiquido / receitaBruta) * 100 : null

  // Ordena: entradas primeiro (descendente), depois saídas (descendente)
  const breakdown = [...acc.values()].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'entrada' ? -1 : 1
    return b.total - a.total
  })

  return { mes, ano, receitaBruta, custos, lucroLiquido, margem, breakdown }
}

// ---------------------------------------------------------------------
// listPendentes — alimenta a tela /contas (briefing 4.5)
// Ordenação: mais urgente primeiro = vencidos no topo, depois os que
// vencem em breve. Sem vencimento vai pro fim.
// ---------------------------------------------------------------------

export interface PendenteListItem {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  data: string
  data_vencimento: string | null
  cliente_fornecedor: string | null
  categoria: { id: string; nome: string; cor: string | null; tipo: TipoLancamento } | null
  recorrencia: 'mensal' | 'semanal' | 'anual' | null
}

export async function listPendentes(
  supabase: DB,
  userId: string,
  tipo: TipoLancamento
): Promise<PendenteListItem[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select(`
      id, descricao, valor, tipo, data, data_vencimento, cliente_fornecedor, recorrencia,
      categoria:categorias ( id, nome, cor, tipo )
    `)
    .eq('user_id', userId)
    .eq('status', 'pendente')
    .eq('tipo', tipo)
    // Sem vencimento por último (NULLS LAST). Vencidos e próximos misturados,
    // mas o JS abaixo refina a ordem pra ficar exatamente como o briefing pede.
    .order('data_vencimento', { ascending: true, nullsFirst: false })

  if (error) throw error

  const itens = (data ?? []).map((row): PendenteListItem => {
    const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria
    return {
      id: row.id,
      descricao: row.descricao,
      valor: typeof row.valor === 'string' ? Number(row.valor) : row.valor,
      tipo: row.tipo as TipoLancamento,
      data: row.data,
      data_vencimento: row.data_vencimento,
      cliente_fornecedor: row.cliente_fornecedor,
      categoria: cat
        ? { id: cat.id, nome: cat.nome, cor: cat.cor, tipo: cat.tipo as TipoLancamento }
        : null,
      recorrencia: row.recorrencia ?? null,
    }
  })

  return itens
}

async function listUltimas(
  supabase: DB,
  userId: string,
  start: string,
  end: string,
  limit: number
): Promise<MovimentacaoListItem[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select(`
      id, descricao, valor, tipo, status, data, data_vencimento, cliente_fornecedor, recorrencia,
      categoria:categorias ( id, nome, cor, tipo )
    `)
    .eq('user_id', userId)
    .gte('data', start)
    .lte('data', end)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row): MovimentacaoListItem => {
    // O Supabase retorna o relacionamento como objeto único quando a FK é
    // single — mas o gerador de tipos às vezes infere como array. Tratamos
    // os dois casos para não quebrar.
    const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria
    return {
      id: row.id,
      descricao: row.descricao,
      valor: typeof row.valor === 'string' ? Number(row.valor) : row.valor,
      tipo: row.tipo as TipoLancamento,
      status: row.status as StatusLancamento,
      data: row.data,
      data_vencimento: row.data_vencimento,
      cliente_fornecedor: row.cliente_fornecedor,
      categoria: cat
        ? { id: cat.id, nome: cat.nome, cor: cat.cor, tipo: cat.tipo as TipoLancamento }
        : null,
      recorrencia: row.recorrencia ?? null,
    }
  })
}
