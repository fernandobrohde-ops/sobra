'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'idle' | 'submitting' | 'sent' | 'error'

const SUCCESS_MESSAGE =
  'Se esse e-mail estiver cadastrado, enviaremos um link de recuperação.'

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    const normalizedEmail = email.trim()

    if (!isValidEmail(normalizedEmail)) {
      setStatus('error')
      setMessage('Esse e-mail não parece válido. Confere e tenta de novo.')
      return
    }

    setStatus('submitting')
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: getResetRedirectUrl() }
    )

    if (error) {
      setStatus('error')
      setMessage(traduzirErroReset(error.message))
      return
    }

    setStatus('sent')
    setMessage(SUCCESS_MESSAGE)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">
          E-mail
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="voce@exemplo.com.br"
          className="sobra-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === 'submitting' || status === 'sent'}
        />
      </label>

      <button
        type="submit"
        className="sobra-btn-primary w-full"
        disabled={status === 'submitting' || status === 'sent' || !email}
      >
        {status === 'submitting' ? 'Enviando...' : 'Enviar link'}
      </button>

      {message && (
        <p
          className={
            status === 'sent'
              ? 'text-caption text-sobra-green bg-sobra-green-mist rounded-control px-3 py-2 text-center'
              : 'text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center'
          }
        >
          {message}
        </p>
      )}
    </form>
  )
}

function getResetRedirectUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'production' && appUrl) {
    return `${appUrl}/reset-password`
  }

  return 'http://localhost:3000/reset-password'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function traduzirErroReset(raw: string): string {
  const m = raw.toLowerCase()

  if (m.includes('invalid') && m.includes('email'))
    return 'Esse e-mail não parece válido. Confere e tenta de novo.'
  if (m.includes('rate') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Tenta de novo em alguns minutos.'
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Sem conexão com o servidor. Confere sua internet.'
  return 'Não consegui enviar o link agora. Tenta de novo daqui a pouco.'
}
