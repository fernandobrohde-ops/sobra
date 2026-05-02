'use client'

/**
 * Wizard de onboarding em 3 passos (briefing 4.2):
 *   1. Nome do negócio
 *   2. Setor (grade de cards clicáveis)
 *   3. WhatsApp (opcional)
 *
 * No submit final chama o RPC `completar_onboarding` que cria o profile,
 * as categorias padrão do setor e a config de alertas — tudo numa transação
 * (definido em supabase/migrations/20260501000003_onboarding_function.sql).
 */
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SetorIcon } from '@/components/ui/setor-icon'
import { SobraLogo } from '@/components/ui/sobra-logo'
import { formatPhoneBR, isValidPhoneBR, toCanonicalPhoneBR } from '@/lib/utils/phone'
import type { Setor } from '@/types/database'

type Step = 1 | 2 | 3

interface SetorOption {
  value: Setor
  label: string
}

const SETORES: SetorOption[] = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'servicos',    label: 'Serviços' },
  { value: 'comercio',    label: 'Comércio' },
  { value: 'construcao',  label: 'Construção' },
  { value: 'saude',       label: 'Saúde' },
  { value: 'educacao',    label: 'Educação' },
  { value: 'outros',      label: 'Outros' },
]

interface OnboardingWizardProps {
  userEmail: string
}

export function OnboardingWizard({ userEmail }: OnboardingWizardProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [step, setStep] = useState<Step>(1)
  const [nome, setNome] = useState('')
  const [setor, setSetor] = useState<Setor | null>(null)
  const [whatsappRaw, setWhatsappRaw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const whatsappFormatted = formatPhoneBR(whatsappRaw)
  const whatsappValido = whatsappRaw === '' || isValidPhoneBR(whatsappRaw)

  function avancar() {
    setErrorMsg(null)
    if (step === 1 && nome.trim().length === 0) return
    if (step === 2 && !setor) return
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s))
  }

  function voltar() {
    setErrorMsg(null)
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s))
  }

  async function concluir(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (!setor) {
      setStep(2)
      return
    }
    if (whatsappRaw && !isValidPhoneBR(whatsappRaw)) {
      setErrorMsg('Confere o telefone — falta dígito.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    const whatsappCanonico = whatsappRaw
      ? toCanonicalPhoneBR(whatsappRaw)
      : null

    const { error } = await supabase.rpc('completar_onboarding', {
      p_nome_negocio: nome.trim(),
      p_setor: setor,
      p_whatsapp: whatsappCanonico,
    })

    if (error) {
      setSubmitting(false)
      setErrorMsg('Não rolou agora. Tenta de novo daqui a pouco.')
      return
    }

    // router.refresh força os Server Components a relerem (incluindo profile).
    router.refresh()
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-8 bg-sobra-bg">
      <div className="w-full max-w-[480px]">
        <div className="flex justify-center mb-6">
          <SobraLogo size={36} withWordmark />
        </div>

        {/* Indicador de progresso (3 barras) */}
        <div
          className="flex gap-1.5 mb-6"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-label={`Passo ${step} de 3`}
        >
          {([1, 2, 3] as const).map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-sobra-green' : 'bg-sobra-line'
              }`}
            />
          ))}
        </div>

        <div className="sobra-card">
          {step === 1 && (
            <PassoNome
              nome={nome}
              setNome={setNome}
              onContinuar={avancar}
              userEmail={userEmail}
            />
          )}

          {step === 2 && (
            <PassoSetor
              setor={setor}
              setSetor={setSetor}
              onVoltar={voltar}
              onContinuar={avancar}
            />
          )}

          {step === 3 && (
            <PassoWhatsApp
              valor={whatsappFormatted}
              onChange={(v) => setWhatsappRaw(v)}
              valido={whatsappValido}
              onVoltar={voltar}
              onConcluir={concluir}
              submitting={submitting}
            />
          )}

          {errorMsg && (
            <p className="mt-4 text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center">
              {errorMsg}
            </p>
          )}
        </div>

        <p className="text-caption text-center text-sobra-ink/50 mt-5">
          Passo {step} de 3
        </p>
      </div>
    </main>
  )
}

// =====================================================================
// Passos
// =====================================================================

function PassoNome({
  nome,
  setNome,
  onContinuar,
  userEmail,
}: {
  nome: string
  setNome: (v: string) => void
  onContinuar: () => void
  userEmail: string
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onContinuar()
      }}
      className="space-y-4"
    >
      <div>
        <h1 className="text-h1 font-medium text-sobra-ink mb-1">
          Boas-vindas{userEmail ? `, ${userEmail.split('@')[0]}` : ''}
        </h1>
        <p className="text-body text-sobra-ink/60">
          Como o seu negócio se chama?
        </p>
      </div>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">
          Nome do negócio
        </span>
        <input
          type="text"
          autoFocus
          required
          maxLength={120}
          placeholder="Ex.: Padaria da Esquina"
          className="sobra-input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </label>

      <button
        type="submit"
        className="sobra-btn-primary w-full"
        disabled={nome.trim().length === 0}
      >
        Continuar
      </button>
    </form>
  )
}

function PassoSetor({
  setor,
  setSetor,
  onVoltar,
  onContinuar,
}: {
  setor: Setor | null
  setSetor: (s: Setor) => void
  onVoltar: () => void
  onContinuar: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h1 font-medium text-sobra-ink mb-1">
          Em qual setor você atua?
        </h1>
        <p className="text-body text-sobra-ink/60">
          A gente já cria as categorias certas pra você.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Setor">
        {SETORES.map((s) => {
          const selected = setor === s.value
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSetor(s.value)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-card border-[1.5px] transition-colors ${
                selected
                  ? 'border-sobra-green bg-sobra-green-mist text-sobra-green'
                  : 'border-sobra-line bg-white text-sobra-ink hover:bg-sobra-bg'
              }`}
            >
              <SetorIcon
                setor={s.value}
                size={28}
                className={selected ? 'text-sobra-green' : 'text-sobra-ink/70'}
              />
              <span className="text-caption font-medium">{s.label}</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button type="button" className="sobra-btn-secondary flex-1" onClick={onVoltar}>
          Voltar
        </button>
        <button
          type="button"
          className="sobra-btn-primary flex-1"
          onClick={onContinuar}
          disabled={!setor}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

function PassoWhatsApp({
  valor,
  onChange,
  valido,
  onVoltar,
  onConcluir,
  submitting,
}: {
  valor: string
  onChange: (raw: string) => void
  valido: boolean
  onVoltar: () => void
  onConcluir: (e: FormEvent) => void
  submitting: boolean
}) {
  return (
    <form onSubmit={onConcluir} className="space-y-4">
      <div>
        <h1 className="text-h1 font-medium text-sobra-ink mb-1">
          Quer alertas no WhatsApp?
        </h1>
        <p className="text-body text-sobra-ink/60">
          A gente avisa antes do boleto vencer. Pode pular se preferir.
        </p>
      </div>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">
          Para receber alertas de vencimento
        </span>
        <input
          type="tel"
          inputMode="tel"
          autoFocus
          autoComplete="tel-national"
          maxLength={16}
          placeholder="(11) 99999-9999"
          className={`sobra-input ${
            valor && !valido ? 'border-sobra-danger-text/60' : ''
          }`}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
        />
        {valor && !valido && (
          <span className="text-caption text-sobra-danger-text mt-1 block">
            Telefone precisa ter 10 ou 11 dígitos.
          </span>
        )}
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          className="sobra-btn-secondary flex-1"
          onClick={onVoltar}
          disabled={submitting}
        >
          Voltar
        </button>
        <button
          type="submit"
          className="sobra-btn-primary flex-1"
          disabled={submitting || (valor !== '' && !valido)}
        >
          {submitting ? 'Salvando...' : valor === '' ? 'Pular e concluir' : 'Concluir'}
        </button>
      </div>
    </form>
  )
}
