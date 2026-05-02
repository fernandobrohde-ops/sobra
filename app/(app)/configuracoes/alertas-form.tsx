'use client'

/**
 * Form de alertas (briefing 4.7).
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updateAlertas } from '@/lib/actions/configuracoes'

interface AlertasFormProps {
  initial: {
    whatsapp_ativo: boolean
    email_ativo: boolean
    alerta_vencimento_dias: 1 | 2 | 3 | 7
    resumo_semanal: boolean
  }
  /** Se false, desabilita o toggle de WhatsApp e mostra hint. */
  temWhatsapp: boolean
}

export function AlertasForm({ initial, temWhatsapp }: AlertasFormProps) {
  const router = useRouter()
  const [whatsappAtivo, setWhatsappAtivo] = useState(initial.whatsapp_ativo)
  const [emailAtivo, setEmailAtivo] = useState(initial.email_ativo)
  const [dias, setDias] = useState<1 | 2 | 3 | 7>(initial.alerta_vencimento_dias)
  const [resumo, setResumo] = useState(initial.resumo_semanal)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; text: string } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setMsg(null)
    const res = await updateAlertas({
      whatsapp_ativo: whatsappAtivo,
      email_ativo: emailAtivo,
      alerta_vencimento_dias: dias,
      resumo_semanal: resumo,
    })
    setSubmitting(false)
    if (!res.ok) {
      setMsg({ tipo: 'erro', text: res.error })
      return
    }
    setMsg({ tipo: 'ok', text: 'Salvo.' })
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Toggle
        label="Avisar pelo WhatsApp"
        hint={temWhatsapp ? 'Mandamos no número do seu perfil.' : 'Cadastre um WhatsApp no perfil pra ativar.'}
        checked={whatsappAtivo && temWhatsapp}
        disabled={!temWhatsapp}
        onChange={setWhatsappAtivo}
      />
      <Toggle
        label="Avisar por e-mail"
        hint="Lembrete dos boletos próximos do vencimento."
        checked={emailAtivo}
        onChange={setEmailAtivo}
      />

      <div>
        <p className="text-caption text-sobra-ink/70 mb-1.5">Avisar com antecedência de</p>
        <div className="flex gap-1.5" role="radiogroup">
          {([1, 2, 3, 7] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={dias === d}
              onClick={() => setDias(d)}
              className={`flex-1 px-3 py-2 rounded-control text-caption font-medium transition-colors ${
                dias === d
                  ? 'bg-sobra-green text-white'
                  : 'bg-white border border-sobra-line text-sobra-ink/70'
              }`}
            >
              {d === 1 ? '1 dia' : `${d} dias`}
            </button>
          ))}
        </div>
      </div>

      <Toggle
        label="Receber resumo semanal"
        hint="Toda segunda às 8h: o que sobrou na semana e o que está por vir."
        checked={resumo}
        onChange={setResumo}
      />

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="sobra-btn-primary" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar alertas'}
        </button>
        {msg && (
          <span className={`text-caption ${msg.tipo === 'ok' ? 'text-sobra-green' : 'text-sobra-danger-text'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-body text-sobra-ink">{label}</p>
        {hint && <p className="text-caption text-sobra-ink/60 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-sobra-green' : 'bg-sobra-line'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
