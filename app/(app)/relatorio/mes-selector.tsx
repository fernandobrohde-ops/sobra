'use client'

/**
 * Seletor de mês/ano para o relatório (briefing 4.6).
 * Atualiza ?mes=YYYY-MM via router.push.
 */
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface MesSelectorProps {
  mesAtual: number
  anoAtual: number
}

export function MesSelector({ mesAtual, anoAtual }: MesSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const valor = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`
  const hoje = new Date()
  // Permitir até 1 mês no futuro (caso usuário queira preparar relatório).
  const max = `${hoje.getFullYear()}-${String(hoje.getMonth() + 2).padStart(2, '0')}`

  function trocar(novo: string) {
    if (!/^\d{4}-\d{2}$/.test(novo)) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('mes', novo)
    startTransition(() => router.push(`?${params.toString()}`, { scroll: false }))
  }

  return (
    <input
      type="month"
      value={valor}
      max={max}
      onChange={(e) => trocar(e.target.value)}
      disabled={pending}
      className="sobra-input !py-2 !w-auto"
      aria-label="Selecionar mês"
    />
  )
}

// parseMesParam mora em ./mes (não 'use client') pra ser importável
// pelo Server Component da page.
