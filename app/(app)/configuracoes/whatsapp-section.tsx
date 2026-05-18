'use client'

/**
 * Seção "Assistente WhatsApp" no /configuracoes.
 *
 * Estados:
 *  - vinculado: mostra número + botão "Desvincular"
 *  - sem código ativo: botão "Ativar assistente"
 *  - código ativo: mostra SOBRA-XXXXXX + instrução + auto-poll a cada 4s
 *    pra detectar quando o usuário enviou (vira vinculado)
 */
import { useState, useEffect, useRef } from 'react'
import {
  gerarCodigoVinculo,
  getStatusVinculo,
  desvincular,
  type CodigoVinculo,
  type StatusVinculo,
} from '@/lib/actions/whatsapp'

interface WhatsappSectionProps {
  inicial: StatusVinculo
  numeroSobra: string  // Número de WhatsApp do Sobra que o usuário envia o código
}

export function WhatsappSection({ inicial, numeroSobra }: WhatsappSectionProps) {
  const [status, setStatus] = useState<StatusVinculo>(inicial)
  const [codigo, setCodigo] = useState<CodigoVinculo | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling enquanto código ativo: checa se vinculou
  useEffect(() => {
    if (!codigo) {
      if (pollTimer.current) clearInterval(pollTimer.current)
      return
    }
    pollTimer.current = setInterval(async () => {
      const res = await getStatusVinculo()
      const novoVinculoConfirmado =
        res.ok &&
        res.data.vinculado &&
        !!res.data.verified_at &&
        new Date(res.data.verified_at).getTime() >= new Date(codigo.created_at).getTime()

      if (novoVinculoConfirmado) {
        setStatus(res.data)
        setCodigo(null)
      }
    }, 4000)
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [codigo])

  async function ativar() {
    setLoading(true)
    setErro(null)
    const res = await gerarCodigoVinculo()
    setLoading(false)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    setCodigo(res.data)
  }

  async function handleDesvincular() {
    if (!window.confirm('Desvincular o WhatsApp? Você não vai mais receber/enviar mensagens pelo assistente.')) return
    setLoading(true)
    const res = await desvincular()
    setLoading(false)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    setStatus({ vinculado: false, whatsapp_number: null, verified_at: null })
    setCodigo(null)
  }

  // ---- Estado: código ativo ----
  if (codigo) {
    return (
      <div className="space-y-4">
        <div className="text-center p-6 bg-sobra-bg border border-dashed border-sobra-line rounded-card">
          <p className="text-micro uppercase tracking-wider text-sobra-ink-muted mb-2">
            Seu código
          </p>
          <p className="font-display text-display text-sobra-green tabular-nums">
            {codigo.verification_code}
          </p>
          <p className="text-caption text-sobra-ink-muted mt-3">
            Expira em 15 minutos
          </p>
        </div>

        <div className="space-y-3 text-body-sm text-sobra-ink-soft">
          <p>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sobra-green text-white text-caption font-medium mr-2">1</span>
            Abra o WhatsApp e mande mensagem pro Sobra:
          </p>
          <p className="ml-8 font-medium tabular-nums text-sobra-ink">
            {numeroSobra}
          </p>
          <p>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sobra-green text-white text-caption font-medium mr-2">2</span>
            Mande exatamente:
          </p>
          <p className="ml-8 font-mono text-sobra-green bg-sobra-green-mist px-3 py-2 rounded-control inline-block">
            {codigo.verification_code}
          </p>
        </div>

        <p className="text-caption text-sobra-ink-muted flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-sobra-green animate-pulse" />
          Aguardando confirmação no WhatsApp que vai ficar vinculado...
        </p>

        <button
          type="button"
          onClick={() => setCodigo(null)}
          className="text-caption text-sobra-ink-muted hover:underline"
        >
          Cancelar
        </button>
      </div>
    )
  }

  // ---- Estado: vinculado ----
  if (status.vinculado) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 bg-sobra-green-mist border border-sobra-green-soft rounded-card">
          <div className="w-9 h-9 rounded-full bg-sobra-green text-white flex items-center justify-center flex-shrink-0">
            ✓
          </div>
          <div className="flex-1">
            <p className="text-body-sm font-semibold text-sobra-green">Assistente ativado</p>
            <p className="text-caption text-sobra-ink-soft mt-0.5">
              Vinculado ao número <span className="tabular-nums font-medium">+{status.whatsapp_number}</span>
            </p>
          </div>
        </div>

        <p className="text-caption text-sobra-ink-muted">
          Mande mensagens pra <span className="font-medium tabular-nums">{numeroSobra}</span> no WhatsApp.
          Tente: <em>&ldquo;quanto sobrou esse mês?&rdquo;</em> ou <em>&ldquo;recebi 200 do João&rdquo;</em>.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={ativar}
            disabled={loading}
            className="text-caption text-sobra-green hover:underline disabled:opacity-60"
          >
            {loading ? 'Gerando código...' : 'Trocar número vinculado'}
          </button>

          <button
            type="button"
            onClick={handleDesvincular}
            disabled={loading}
            className="text-caption text-sobra-danger-text hover:underline disabled:opacity-60"
          >
            Desvincular WhatsApp
          </button>
        </div>

        {erro && (
          <p className="text-caption text-sobra-danger-text">{erro}</p>
        )}
      </div>
    )
  }

  // ---- Estado: nada ativo ----
  return (
    <div className="space-y-4">
      <p className="text-body-sm text-sobra-ink-soft">
        Seu contador no bolso. Pergunte coisas como <em>&ldquo;quanto sobrou?&rdquo;</em> ou registre lançamentos por conversa.
      </p>

      <ul className="space-y-2 text-caption text-sobra-ink-muted">
        <li className="flex items-start gap-2">
          <span className="text-sobra-green">•</span>
          Resposta em segundos com seus dados reais
        </li>
        <li className="flex items-start gap-2">
          <span className="text-sobra-green">•</span>
          Registre vendas e despesas por mensagem
        </li>
        <li className="flex items-start gap-2">
          <span className="text-sobra-green">•</span>
          Alertas de vencimento automáticos
        </li>
      </ul>

      <button
        type="button"
        onClick={ativar}
        disabled={loading}
        className="sobra-btn-primary"
      >
        {loading ? 'Gerando código...' : 'Ativar assistente WhatsApp'}
      </button>

      {erro && (
        <p className="text-caption text-sobra-danger-text">{erro}</p>
      )}
    </div>
  )
}
