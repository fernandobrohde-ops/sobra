'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'submitting' | 'success' | 'error'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState<string | null>('Validando link...')

  useEffect(() => {
    let active = true

    async function prepareSession() {
      const code = searchParams.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return

        if (error) {
          setStatus('error')
          setMessage(traduzirErroLink(error.message))
          return
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (!active) return

      if (error || !session) {
        setStatus('error')
        setMessage(traduzirErroLink(error?.message))
        return
      }

      setStatus('ready')
      setMessage(null)
    }

    prepareSession()

    return () => {
      active = false
    }
  }, [searchParams, supabase])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    if (password.length < 6) {
      setStatus('ready')
      setMessage('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('ready')
      setMessage('As senhas precisam ser iguais.')
      return
    }

    setStatus('submitting')
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('ready')
      setMessage(traduzirErroSenha(error.message))
      return
    }

    setStatus('success')
    setMessage('Senha alterada com sucesso.')

    window.setTimeout(() => {
      router.replace('/login')
    }, 1400)
  }

  if (status === 'checking') {
    return (
      <p className="text-caption text-sobra-info-text bg-sobra-info-bg rounded-control px-3 py-2 text-center">
        {message}
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <p className="text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center">
          {message}
        </p>
        <Link href="/forgot-password" className="sobra-btn-primary w-full">
          Enviar novo link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">
          Nova senha
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className="sobra-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={status === 'submitting' || status === 'success'}
        />
      </label>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">
          Confirmar nova senha
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="Digite a senha de novo"
          className="sobra-input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={status === 'submitting' || status === 'success'}
        />
      </label>

      <button
        type="submit"
        className="sobra-btn-primary w-full"
        disabled={
          status === 'submitting' ||
          status === 'success' ||
          !password ||
          !confirmPassword
        }
      >
        {status === 'submitting' ? 'Salvando...' : 'Alterar senha'}
      </button>

      {message && (
        <p
          className={
            status === 'success'
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

function traduzirErroLink(raw?: string): string {
  const m = raw?.toLowerCase() ?? ''

  if (m.includes('expired'))
    return 'Esse link expirou. Peça um novo link de recuperação.'
  if (m.includes('invalid') || m.includes('token') || m.includes('code'))
    return 'Esse link não é válido. Peça um novo link de recuperação.'
  return 'Não foi possível validar o link. Peça um novo link de recuperação.'
}

function traduzirErroSenha(raw: string): string {
  const m = raw.toLowerCase()

  if (m.includes('weak') || m.includes('password'))
    return 'Essa senha está fraca. Use pelo menos 6 caracteres.'
  if (m.includes('expired'))
    return 'Esse link expirou. Peça um novo link de recuperação.'
  if (m.includes('invalid') || m.includes('token') || m.includes('session'))
    return 'Esse link não é válido. Peça um novo link de recuperação.'
  if (m.includes('rate') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Tenta de novo em alguns minutos.'
  return 'Não consegui alterar a senha agora. Tenta de novo daqui a pouco.'
}
