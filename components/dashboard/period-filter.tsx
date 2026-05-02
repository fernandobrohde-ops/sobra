'use client'

/**
 * Filtro de período do dashboard (briefing 4.3). Atualiza ?periodo=...
 * via router.push, o que faz o Server Component refazer as queries
 * sem reload total.
 *
 * Briefing menciona "Personalizado" — fica para depois (envolve range
 * picker, mais complexidade que vale o MVP).
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { PERIODS, periodLabel, type Period } from '@/lib/utils/period'

interface PeriodFilterProps {
  atual: Period
}

export function PeriodFilter({ atual }: PeriodFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function trocar(novo: Period) {
    if (novo === atual) return
    const params = new URLSearchParams(searchParams.toString())
    if (novo === 'esse-mes') {
      params.delete('periodo')
    } else {
      params.set('periodo', novo)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `?${qs}` : '?', { scroll: false })
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por período">
      {PERIODS.map((p) => {
        const ativo = p === atual
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => trocar(p)}
            disabled={pending}
            className={`px-3 py-1.5 rounded-control text-caption font-medium transition-colors ${
              ativo
                ? 'bg-sobra-ink text-white'
                : 'bg-white border border-sobra-line text-sobra-ink/70 hover:bg-sobra-bg'
            }`}
          >
            {periodLabel(p)}
          </button>
        )
      })}
    </div>
  )
}

// parsePeriodParam mora em app/(app)/dashboard/period.ts (não 'use client')
// pra ser importável pelo Server Component da page.
