'use client'

import { useState } from 'react'

interface UpgradeCardProps {
  className?: string
  compact?: boolean
  message?: string
}

export function UpgradeCard({ className = '', compact = false, message }: UpgradeCardProps) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function abrirCheckout() {
    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-card border border-sobra-green-soft bg-sobra-green-pale p-4 md:p-5 shadow-xs ${className}`}>
      <div className="space-y-3">
        <div>
          <p className="text-h2 font-semibold text-sobra-ink">Desbloqueie o Sobra Pro</p>
          <p className={`${compact ? 'text-caption' : 'text-body-sm'} text-sobra-ink-soft mt-1`}>
            Tenha lançamentos ilimitados, recorrências, alertas no WhatsApp, DRE completa e exportação de relatórios.
          </p>
          {message && (
            <p className="mt-2 text-caption font-medium text-sobra-green">{message}</p>
          )}
        </div>

        <button
          type="button"
          onClick={abrirCheckout}
          disabled={loading}
          className="sobra-btn-primary"
        >
          {loading ? 'Abrindo...' : 'Testar grátis por 7 dias'}
        </button>

        {erro && (
          <p className="text-caption text-sobra-danger-text">{erro}</p>
        )}
      </div>
    </div>
  )
}
