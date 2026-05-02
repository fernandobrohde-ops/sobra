/**
 * Tipos e parser do searchParam `aba` da tela /contas.
 *
 * Mora num arquivo separado (não 'use client') porque é importado
 * tanto pelo Server Component (page.tsx) quanto por Client Components
 * (contas-tabs.tsx, contas-list.tsx). Funções não-componente exportadas
 * de módulos `'use client'` viram undefined ao serem chamadas no servidor.
 */
export type Aba = 'receber' | 'pagar'

export function parseAbaParam(raw: string | string[] | undefined): Aba {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v === 'pagar' ? 'pagar' : 'receber'
}
