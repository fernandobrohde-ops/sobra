/**
 * Helpers de formatação. Tudo em pt-BR, sem dependências externas.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Formata um número como BRL: 1234.56 → "R$ 1.234,56".
 * Aceita string para acomodar `numeric` do Postgres que vem como string.
 */
export function formatBRL(valor: number | string | null | undefined): string {
  if (valor == null) return 'R$ 0,00'
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(n)) return 'R$ 0,00'
  return BRL.format(n)
}

/**
 * "30/04" — útil em listas adensadas.
 * Aceita string ISO ou Date.
 */
export function formatDateShort(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

/**
 * "hoje", "ontem", "2 dias atrás", "30/04" — para o campo "data" da
 * lista de movimentações no dashboard.
 *
 * Compara em data local (ignora hora) para evitar bug de fuso.
 */
export function formatDateRelative(d: string | Date): string {
  const target = typeof d === 'string' ? new Date(d) : d
  const today = startOfLocalDay(new Date())
  const that = startOfLocalDay(target)
  const diffMs = today.getTime() - that.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} dias atrás`
  if (diffDays === -1) return 'amanhã'
  if (diffDays < -1 && diffDays > -7) return `em ${-diffDays} dias`
  return formatDateShort(target)
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Variação percentual com sinal: 12 → "+12%", -5 → "-5%", null → "—".
 */
export function formatPercent(p: number | null | undefined, digits = 0): string {
  if (p == null || !Number.isFinite(p)) return '—'
  const rounded = p.toFixed(digits)
  const n = Number(rounded)
  if (n > 0) return `+${rounded}%`
  return `${rounded}%`
}

/**
 * "Sobrou R$ 1.234,56" para uso em alertas / WhatsApp.
 * Sem "R$" duplicado, sem fontes ASCII.
 */
/**
 * Status de vencimento (briefing 4.5):
 *  - vencido: data_vencimento < hoje
 *  - hoje: data_vencimento == hoje
 *  - futuro: data_vencimento > hoje (com `dias` = quantos faltam)
 *  - sem-prazo: data_vencimento == null
 */
export type VencimentoStatus =
  | { tipo: 'vencido'; dias: number }
  | { tipo: 'hoje' }
  | { tipo: 'futuro'; dias: number }
  | { tipo: 'sem-prazo' }

export function classificarVencimento(
  dataVencimento: string | null | undefined,
  hoje: Date = new Date()
): VencimentoStatus {
  if (!dataVencimento) return { tipo: 'sem-prazo' }
  // Comparar em data local sem hora — date é YYYY-MM-DD.
  const venc = parseISODate(dataVencimento)
  const ref = startOfLocalDay(hoje)
  const diffMs = venc.getTime() - ref.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return { tipo: 'vencido', dias: -diffDays }
  if (diffDays === 0) return { tipo: 'hoje' }
  return { tipo: 'futuro', dias: diffDays }
}

/** Label curta do badge de vencimento. */
export function labelVencimento(s: VencimentoStatus): string {
  switch (s.tipo) {
    case 'vencido':
      return s.dias === 1 ? 'Vencido (1 dia)' : `Vencido (${s.dias} dias)`
    case 'hoje':
      return 'Vence hoje'
    case 'futuro':
      return s.dias === 1 ? 'Vence amanhã' : `Em ${s.dias} dias`
    case 'sem-prazo':
      return 'Sem prazo'
  }
}

/**
 * Score de urgência para sort estável: quanto menor, mais urgente.
 *  - vencidos: -10000 - dias    (mais antigos primeiro)
 *  - hoje: -1
 *  - futuros: dias               (mais próximos primeiro)
 *  - sem prazo: +Infinity (final)
 */
export function urgenciaScore(s: VencimentoStatus): number {
  switch (s.tipo) {
    case 'vencido': return -10000 - s.dias
    case 'hoje':    return -1
    case 'futuro':  return s.dias
    case 'sem-prazo': return Number.POSITIVE_INFINITY
  }
}

function parseISODate(s: string): Date {
  // Trata como data local — evita conversão de fuso indesejada.
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, d ?? 1)
}

export function formatBRLCompact(valor: number | string | null | undefined): string {
  if (valor == null) return '0,00'
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(n)) return '0,00'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
