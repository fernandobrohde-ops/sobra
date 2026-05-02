'use client'

/**
 * Tabs A Receber / A Pagar (briefing 4.5).
 * Sincroniza com ?aba=receber|pagar.
 *
 * O type Aba e parseAbaParam moram em ./aba (não 'use client') pra serem
 * usáveis no Server Component da page.
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { Aba } from './aba'

interface ContasTabsProps {
  atual: Aba
}

const TABS: Array<{ valor: Aba; label: string }> = [
  { valor: 'receber', label: 'A Receber' },
  { valor: 'pagar',   label: 'A Pagar' },
]

export function ContasTabs({ atual }: ContasTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function trocar(nova: Aba) {
    if (nova === atual) return
    const params = new URLSearchParams(searchParams.toString())
    if (nova === 'receber') {
      params.delete('aba')  // receber é o default — limpa o param
    } else {
      params.set('aba', nova)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `?${qs}` : '?', { scroll: false })
    })
  }

  return (
    <div className="flex gap-1 p-1 bg-white border border-sobra-line rounded-card mb-4" role="tablist">
      {TABS.map((t) => {
        const ativo = t.valor === atual
        return (
          <button
            key={t.valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => trocar(t.valor)}
            disabled={pending}
            className={`flex-1 px-3 py-2.5 rounded-control text-body font-medium transition-colors ${
              ativo
                ? 'bg-sobra-green text-white'
                : 'text-sobra-ink/70 hover:bg-sobra-bg'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

