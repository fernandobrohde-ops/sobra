/**
 * Parser do searchParam `periodo` da tela /dashboard.
 *
 * Mora num arquivo separado (não 'use client') porque é importado pelo
 * Server Component da page e pelo Client Component PeriodFilter.
 */
import { isPeriod, type Period } from '@/lib/utils/period'

export function parsePeriodParam(raw: string | string[] | undefined): Period {
  const v = Array.isArray(raw) ? raw[0] : raw
  return isPeriod(v) ? v : 'esse-mes'
}
