/**
 * Parser do searchParam `mes` (formato YYYY-MM) da tela /relatorio.
 *
 * Mora num arquivo separado (não 'use client') porque é importado tanto
 * pelo Server Component quanto pelo Client Component (mes-selector.tsx).
 */
export function parseMesParam(
  raw: string | string[] | undefined
): { mes: number; ano: number } {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v && /^\d{4}-\d{2}$/.test(v)) {
    const [anoStr, mesStr] = v.split('-')
    const mes = Number(mesStr)
    const ano = Number(anoStr)
    if (mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
      return { mes, ano }
    }
  }
  const hoje = new Date()
  return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }
}
