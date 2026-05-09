/**
 * Geração de insights automáticos pro dashboard.
 *
 * "Assistente financeiro" que olha os dados do mês + histórico e produz
 * 3 frases curtas que ajudam o MEI a entender o caixa sem ter que
 * interpretar gráficos. Cada insight tem prioridade — escolhemos os 3
 * mais relevantes pra mostrar.
 */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoLancamento } from '@/types/database'
import type { HistoricoMes } from './queries'

type DB = SupabaseClient<any, any, any>

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'warning'
export type InsightIcon =
  | 'trend-up'
  | 'trend-down'
  | 'spotlight'
  | 'split'
  | 'percent'
  | 'sparkles'
  | 'wave'
  | 'shield'

export interface Insight {
  id: string
  icon: InsightIcon
  title: string
  text: string
  tone: InsightTone
  /** Score interno pra priorização — quanto maior, mais importante */
  priority: number
}

export interface CategoriaSpend {
  nome: string
  cor: string | null
  total: number
}

/**
 * Carrega o breakdown de categorias do mês atual (saídas, top 5).
 * Usado pelos insights e pode ser reaproveitado pelo gráfico de
 * "onde gastei mais".
 */
export async function getTopCategoriasGasto(
  supabase: DB,
  userId: string,
  start: string,
  end: string
): Promise<CategoriaSpend[]> {
  const { data } = await supabase
    .from('lancamentos')
    .select(`
      valor, tipo,
      categoria:categorias ( nome, cor )
    `)
    .eq('user_id', userId)
    .eq('tipo', 'saida')
    .gte('data', start)
    .lte('data', end)

  const acc = new Map<string, CategoriaSpend>()
  for (const row of (data ?? []) as Array<{
    valor: number | string
    tipo: string
    categoria: { nome?: string; cor?: string | null } | { nome?: string; cor?: string | null }[] | null
  }>) {
    const v = typeof row.valor === 'string' ? Number(row.valor) : row.valor
    if (!Number.isFinite(v)) continue
    const cat = Array.isArray(row.categoria) ? row.categoria[0] : row.categoria
    const nome = cat?.nome ?? 'Sem categoria'
    const cor = cat?.cor ?? null
    const existing = acc.get(nome)
    if (existing) existing.total += v
    else acc.set(nome, { nome, cor, total: v })
  }

  return [...acc.values()].sort((a, b) => b.total - a.total).slice(0, 5)
}

interface GenerateInsightsInput {
  sobra: number
  faturado: number
  totalSaidas: number
  variacao: number | null
  sobraAnterior: number
  topCategorias: CategoriaSpend[]
  historicoMensal: HistoricoMes[]
}

/**
 * Gera todos os insights aplicáveis e retorna os 3 mais importantes.
 * Cada insight tem `priority` — usamos pra escolher.
 */
export function generateInsights(input: GenerateInsightsInput): Insight[] {
  const insights: Insight[] = []
  const {
    sobra,
    faturado,
    totalSaidas,
    variacao,
    topCategorias,
    historicoMensal,
  } = input

  // ---- 1. Variação vs mês anterior ----
  if (variacao !== null) {
    if (variacao >= 25) {
      insights.push({
        id: 'variacao-up',
        icon: 'trend-up',
        title: `Sobrou ${Math.round(variacao)}% a mais que o período anterior`,
        text: 'Bom sinal. O ritmo de caixa melhorou e o que ficou no fim cresceu.',
        tone: 'positive',
        priority: 90,
      })
    } else if (variacao <= -25) {
      insights.push({
        id: 'variacao-down',
        icon: 'trend-down',
        title: `Sobrou ${Math.round(Math.abs(variacao))}% a menos que o período anterior`,
        text: 'Vale dar uma olhada nos gastos do mês — algo cresceu ou a receita caiu.',
        tone: 'negative',
        priority: 95,
      })
    } else if (Math.abs(variacao) < 5 && faturado > 0) {
      insights.push({
        id: 'variacao-flat',
        icon: 'wave',
        title: 'Caixa estável',
        text: 'Sobra parecida com o período anterior. Operação sob controle.',
        tone: 'neutral',
        priority: 30,
      })
    }
  }

  // ---- 2. Maior categoria de gasto ----
  const top = topCategorias[0]
  if (top && totalSaidas > 0) {
    const pctTop = (top.total / totalSaidas) * 100
    if (pctTop >= 40) {
      insights.push({
        id: 'top-categoria-concentrada',
        icon: 'spotlight',
        title: `${top.nome} concentrou ${Math.round(pctTop)}% das saídas`,
        text: 'Categoria pesada esse mês. Se diminuir, sua sobra cresce direto.',
        tone: 'warning',
        priority: 85,
      })
    } else if (pctTop >= 20) {
      insights.push({
        id: 'top-categoria',
        icon: 'spotlight',
        title: `Maior gasto: ${top.nome}`,
        text: `${formatBRLCompact(top.total)} foi pra ${top.nome.toLowerCase()} esse mês.`,
        tone: 'neutral',
        priority: 60,
      })
    }
  }

  // ---- 3. Comparação top 1 vs top 2 ----
  const second = topCategorias[1]
  if (top && second && top.total > second.total * 1.5) {
    insights.push({
      id: 'top-vs-second',
      icon: 'split',
      title: `${top.nome} custou mais que ${second.nome}`,
      text: `Diferença de ${formatBRLCompact(top.total - second.total)} entre os dois maiores gastos.`,
      tone: 'neutral',
      priority: 50,
    })
  }

  // ---- 4. Margem ----
  if (faturado > 0) {
    const margem = (sobra / faturado) * 100
    if (margem < 10 && sobra > 0) {
      insights.push({
        id: 'margem-baixa',
        icon: 'percent',
        title: `Margem apertada (${margem.toFixed(0)}%)`,
        text: 'De cada R$ 100 que entra, sobram menos de R$ 10. Vale revisar custos.',
        tone: 'warning',
        priority: 80,
      })
    } else if (margem >= 30) {
      insights.push({
        id: 'margem-saudavel',
        icon: 'shield',
        title: `Margem saudável (${margem.toFixed(0)}%)`,
        text: `De cada R$ 100 faturados, ${margem.toFixed(0)} ficam no caixa. Tá indo bem.`,
        tone: 'positive',
        priority: 55,
      })
    }
  }

  // ---- 5. Tendência da sobra (3 meses) ----
  if (historicoMensal.length >= 3) {
    const ultimos3 = historicoMensal.slice(-3)
    const subindo = ultimos3.every((m, i) => i === 0 || m.sobra > ultimos3[i - 1]!.sobra)
    const caindo = ultimos3.every((m, i) => i === 0 || m.sobra < ultimos3[i - 1]!.sobra)
    if (subindo && ultimos3[2]!.sobra > 0) {
      insights.push({
        id: 'tendencia-up',
        icon: 'sparkles',
        title: 'Sobra crescendo 3 meses seguidos',
        text: 'O caixa tá melhorando consistentemente. Bom momento pra reinvestir.',
        tone: 'positive',
        priority: 75,
      })
    } else if (caindo) {
      insights.push({
        id: 'tendencia-down',
        icon: 'sparkles',
        title: 'Sobra caindo 3 meses seguidos',
        text: 'Vale entender se é sazonal ou se algum custo cresceu. A gente investiga junto?',
        tone: 'warning',
        priority: 88,
      })
    }
  }

  // ---- 6. Sem dados suficientes ----
  if (insights.length === 0) {
    if (faturado === 0 && totalSaidas === 0) {
      insights.push({
        id: 'sem-dados',
        icon: 'sparkles',
        title: 'Comece registrando suas movimentações',
        text: 'Quanto mais lançamentos, melhores os insights. Toque no + lá embaixo.',
        tone: 'neutral',
        priority: 1,
      })
    } else {
      insights.push({
        id: 'em-construcao',
        icon: 'sparkles',
        title: 'Continue registrando',
        text: 'Daqui a algumas semanas a gente já consegue tirar tendências mais ricas.',
        tone: 'neutral',
        priority: 1,
      })
    }
  }

  // Ordena por prioridade desc e pega top 3
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

// ---------------------------------------------------------------------
// Helper local — formatação compacta sem importar lib/utils/format pra
// evitar dependência circular (insights vai ser importada pela page).
// ---------------------------------------------------------------------
function formatBRLCompact(n: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(n)
}
