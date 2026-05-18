'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoogleIcon } from '@/components/ui/google-icon'

type Status = 'idle' | 'submitting' | 'error'

export function LoginForm() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    const codigo = searchParams.get('erro')
    if (codigo === 'link_invalido')
      return 'Não consegui confirmar seu acesso. Tenta entrar de novo.'
    if (codigo === 'cancelado') return 'Login cancelado. Pode tentar de novo.'
    return null
  })

  const redirectPath = useMemo(() => {
    const target = searchParams.get('redirect')
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
  }, [searchParams])

  async function onSubmitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    setStatus('submitting')
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(traduzirErro(error.message))
      return
    }
    window.location.href = redirectPath
  }

  async function onClickGoogle() {
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildOAuthRedirect(redirectPath),
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(traduzirErro(error.message))
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmitLogin} className="space-y-3" noValidate>
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
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
          />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-caption text-sobra-ink/70">
              Senha
            </label>
            <Link
              href="/forgot-password"
              className="text-caption font-medium text-sobra-green hover:text-sobra-green-dark"
            >
              Esqueci minha senha
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Sua senha"
            className="sobra-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === 'submitting'}
          />
        </div>

        <button
          type="submit"
          className="sobra-btn-primary w-full"
          disabled={status === 'submitting' || !email || !password}
        >
          {status === 'submitting' ? 'Entrando...' : 'Entrar'}
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

function traduzirErro(raw: string): string {
  const m = raw.toLowerCase()
  if (m.includes('rate') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Tenta de novo em alguns minutos.'
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'E-mail ou senha não conferem.'
  if (m.includes('invalid') && m.includes('email'))
    return 'Esse e-mail não parece válido. Confere e tenta de novo.'
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Sem conexão com o servidor. Confere sua internet.'
  return 'Não rolou agora. Tenta de novo daqui a pouco.'
}

function buildOAuthRedirect(redirectPath: string): string {
  const url = new URL('/auth/callback', window.location.origin)
  if (redirectPath !== '/dashboard') url.searchParams.set('next', redirectPath)
  return url.toString()
}
