/**
 * Cálculos de período para o filtro do dashboard (briefing 4.3).
 *
 * Importante: a tabela `lancamentos.data` é DATE, não TIMESTAMPTZ.
 * Por isso comparamos em string ISO `YYYY-MM-DD` em UTC pra evitar
 * surpresas de fuso na fronteira do mês.
 */

export type Period = 'esse-mes' | 'mes-passado' | 'ultimos-3-meses'

export const PERIODS: Period[] = ['esse-mes', 'mes-passado', 'ultimos-3-meses']

export function isPeriod(s: string | null | undefined): s is Period {
  return s === 'esse-mes' || s === 'mes-passado' || s === 'ultimos-3-meses'
}

export function periodLabel(p: Period): string {
  switch (p) {
    case 'esse-mes': return 'Esse mês'
    case 'mes-passado': return 'Mês passado'
    case 'ultimos-3-meses': return 'Últimos 3 meses'
  }
}

/** ISO `YYYY-MM-DD` para uma data local. */
export function toDateOnly(d: Date): string {
  // Usa o fuso local do servidor — para BR, vai bater com a percepção
  // do usuário ("hoje" = data local).
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

interface DateRange {
  start: string  // ISO date inclusive
  end: string    // ISO date inclusive
  label: string
}

export function getDateRange(period: Period, today = new Date()): DateRange {
  const ano = today.getFullYear()
  const mes = today.getMonth() // 0-indexed

  switch (period) {
    case 'esse-mes': {
      const start = new Date(ano, mes, 1)
      const end = new Date(ano, mes + 1, 0) // último dia do mês
      return { start: toDateOnly(start), end: toDateOnly(end), label: 'Esse mês' }
    }
    case 'mes-passado': {
      const start = new Date(ano, mes - 1, 1)
      const end = new Date(ano, mes, 0)
      return { start: toDateOnly(start), end: toDateOnly(end), label: 'Mês passado' }
    }
    case 'ultimos-3-meses': {
      const start = new Date(ano, mes - 2, 1)
      const end = new Date(ano, mes + 1, 0)
      return { start: toDateOnly(start), end: toDateOnly(end), label: 'Últimos 3 meses' }
    }
  }
}

/**
 * Para o cálculo de variação vs anterior (briefing 5.1):
 * - esse-mes        → mes-passado
 * - mes-passado     → mes-retrasado
 * - ultimos-3-meses → 3 meses anteriores aos exibidos
 */
export function getPreviousRange(period: Period, today = new Date()): DateRange {
  const ano = today.getFullYear()
  const mes = today.getMonth()

  switch (period) {
    case 'esse-mes': {
      const start = new Date(ano, mes - 1, 1)
      const end = new Date(ano, mes, 0)
      return { start: toDateOnly(start), end: toDateOnly(end), label: 'Mês anterior' }
    }
    case 'mes-passado': {
      const start = new Date(ano, mes - 2, 1)
      const end = new Date(ano, mes - 1, 0)
      return { start: toDateOnly(start), end: toDateOnly(end), label: 'Mês retrasado' }
    }
    case 'ultimos-3-meses': {
      const start = new Date(ano, mes - 5, 1)
      const end = new Date(ano, mes - 2, 0)
      return { start: toDateOnly(start), end: toDateOnly(end), label: '3 meses anteriores' }
    }
  }
}
