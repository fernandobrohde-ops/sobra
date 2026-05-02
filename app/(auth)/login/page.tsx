/**
 * Página /login (briefing 4.1)
 *
 * Server Component só por estrutura (metadata + layout). O formulário em si
 * é um Client Component porque precisa de estado (loading, erro, sent).
 */
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SobraLogo } from '@/components/ui/sobra-logo'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta no Sobra com magic link ou Google.',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-sobra-bg">
      <div className="w-full max-w-[400px]">
        {/* Logo centralizada — briefing 4.1 */}
        <div className="flex justify-center mb-8">
          <SobraLogo size={48} withWordmark />
        </div>

        <div className="sobra-card">
          <h1 className="text-h1 font-medium text-sobra-ink text-center mb-1">
            Entre no Sobra
          </h1>
          <p className="text-caption text-sobra-ink/60 text-center mb-6">
            Sem senha. Mandamos um link no seu e-mail.
          </p>

          {/* Suspense é exigido pelo Next 14 quando usamos useSearchParams() dentro do client. */}
          <Suspense fallback={<div className="h-[200px]" aria-hidden="true" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-caption text-center text-sobra-ink/50 mt-6">
          Ao continuar, você aceita nossos termos de uso.
        </p>
      </div>
    </main>
  )
}
