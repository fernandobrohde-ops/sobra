'use client'

/**
 * Seção Plano (briefing 4.7 + 5.4).
 * Abre o Checkout via Route Handler e o Portal via Server Action.
 */
import { useState } from 'react'
import { createPortalSession } from '@/lib/actions/stripe'
import type { Plano } from '@/types/database'

interface PlanoSectionProps {
  plano: Plano
  trialFim: string | null
  temAssinatura: boolean
}

const LABELS: Record<Plano, string> = {
  free: 'Grátis',
  gratis: 'Grátis',
  essencial: 'Essencial',
  pro: 'Pro',
}

export function PlanoSection({ plano, trialFim, temAssinatura }: PlanoSectionProps) {
  const [loading, setLoading] = useState<'upgrade' | 'portal' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const trialAtivo = trialFim && new Date(trialFim) > new Date()
  const diasTrial = trialFim
    ? Math.max(0, Math.ceil((new Date(trialFim).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0

  async function handleUpgrade() {
    setLoading('upgrade')
    setErro(null)

    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json().catch(() => null) as { url?: string; error?: string } | null

      if (!res.ok || !data?.url) {
        setErro(data?.error ?? 'Erro ao abrir o checkout. Tenta de novo.')
        return
      }

      window.location.href = data.url
    } catch {
      setErro('Não consegui conectar com o checkout. Tenta de novo em instantes.')
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    setErro(null)
    const res = await createPortalSession()
    setLoading(null)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    window.location.href = res.url
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-h2 font-medium text-sobra-ink">{LABELS[plano]}</span>
        {trialAtivo && !temAssinatura && (
          <span className="sobra-badge-positive">
            Trial · {diasTrial} {diasTrial === 1 ? 'dia restante' : 'dias restantes'}
          </span>
        )}
        {temAssinatura && (
          <span className="sobra-badge-positive">Assinatura ativa</span>
        )}
      </div>

      <p className="text-body text-sobra-ink/70">
        {temAssinatura
          ? 'Você pode atualizar plano, método de pagamento ou cancelar pelo portal.'
          : trialAtivo
          ? 'Aproveite o trial. Quando acabar, sua assinatura mensal mantém o acesso.'
          : 'Teste o Pro grátis por 7 dias. Depois, a assinatura mensal é R$99.'}
      </p>

      <div className="flex flex-wrap gap-3">
        {temAssinatura ? (
          <button
            type="button"
            onClick={handlePortal}
            disabled={loading !== null}
            className="sobra-btn-primary"
          >
            {loading === 'portal' ? 'Abrindo...' : 'Gerenciar assinatura'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading !== null}
            className="sobra-btn-primary"
          >
            {loading === 'upgrade' ? 'Abrindo...' : 'Testar grátis por 7 dias'}
          </button>
        )}
      </div>

      {erro && (
        <p className="text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2">
          {erro}
        </p>
      )}
    </div>
  )
}
