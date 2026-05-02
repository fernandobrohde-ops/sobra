'use client'

/**
 * Formulário de login — magic link + Google OAuth (briefing 4.1).
 *
 * Estados:
 *  - idle: form pronto pra preencher
 *  - submitting: requisição em andamento
 *  - sent: e-mail enviado, mostra confirmação no lugar do form
 *  - error: erro do Supabase (rede, rate limit, etc.)
 */
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoogleIcon } from '@/components/ui/google-icon'

type Status = 'idle' | 'submitting' | 'sent' | 'error'

export function LoginForm() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  // Erro pode vir do estado local (submissão atual) OU da URL (?erro=)
  // quando o callback rejeita um magic link.
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    const codigo = searchParams.get('erro')
    if (codigo === 'link_invalido')
      return 'Esse link expirou ou já foi usado. Pede um novo logo abaixo.'
    if (codigo === 'cancelado') return 'Login cancelado. Pode tentar de novo.'
    return null
  })

  // Preserva o destino original que o middleware tentou bloquear (?redirect=...)
  // O callback vai ler o mesmo parâmetro depois de trocar o code por sessão.
  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const target = searchParams.get('redirect')
    const url = new URL('/auth/callback', window.location.origin)
    if (target) url.searchParams.set('next', target)
    return url.toString()
  }, [searchParams])

  async function onSubmitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // shouldCreateUser=true permite primeiro acesso. O profile é criado
        // só depois, no fim do onboarding.
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(traduzirErro(error.message))
      return
    }
    setStatus('sent')
  }

  async function onClickGoogle() {
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(traduzirErro(error.message))
    }
    // Sucesso: o próprio Supabase redireciona o navegador para o Google.
  }

  // ----- View: confirmação após envio do magic link -----
  if (status === 'sent') {
    return (
      <div className="text-center py-2">
        <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-sobra-green-mist flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 6.5l7 4 7-4M3 6.5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M3 6.5l7-3 7 3"
              stroke="#0F6E56"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-body text-sobra-ink font-medium mb-1">
          Enviamos um link para seu e-mail
        </p>
        <p className="text-caption text-sobra-ink/60">
          Abra <strong className="text-sobra-ink">{email}</strong> e clique no link
          para entrar. Pode fechar essa aba.
        </p>
        <button
          type="button"
          className="mt-5 text-caption text-sobra-green hover:underline"
          onClick={() => {
            setStatus('idle')
            setErrorMsg(null)
          }}
        >
          Usar outro e-mail
        </button>
      </div>
    )
  }

  // ----- View: form padrão -----
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmitMagicLink} className="space-y-3" noValidate>
        <label className="block">
          <span className="text-caption text-sobra-ink/70 mb-1.5 block">
            Seu e-mail
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
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
          />
        </label>

        <button
          type="submit"
          className="sobra-btn-primary w-full"
          disabled={status === 'submitting' || !email}
        >
          {status === 'submitting' ? 'Enviando...' : 'Entrar com magic link'}
        </button>
      </form>

      <div className="flex items-center gap-3" role="separator" aria-label="ou">
        <span className="h-px flex-1 bg-sobra-line" />
        <span className="text-caption text-sobra-ink/40">ou</span>
        <span className="h-px flex-1 bg-sobra-line" />
      </div>

      <button
        type="button"
        onClick={onClickGoogle}
        className="sobra-btn-secondary w-full gap-2"
        disabled={status === 'submitting'}
      >
        <GoogleIcon />
        <span>Entrar com Google</span>
      </button>

      {errorMsg && (
        <p className="text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  )
}

// Tradução simplificada das mensagens mais comuns que o Supabase devolve.
// Mantém o tom do produto: sem jargão, direto.
function traduzirErro(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('rate') || m.includes('too many'))
    return 'Você pediu vários links seguidos. Tenta de novo em alguns minutos.'
  if (m.includes('invalid') && m.includes('email'))
    return 'Esse e-mail não parece válido. Confere e tenta de novo.'
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Sem conexão com o servidor. Confere sua internet.'
  return 'Não rolou agora. Tenta de novo daqui a pouco.'
}
