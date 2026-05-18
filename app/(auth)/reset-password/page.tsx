import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SobraLogo } from '@/components/ui/sobra-logo'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Criar nova senha',
  description: 'Defina uma nova senha para sua conta no Sobra.',
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-sobra-bg px-4 py-5 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1080px] flex-col overflow-hidden rounded-card-lg border border-sobra-line bg-white shadow-md md:min-h-[calc(100vh-64px)] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-sobra-green p-6 text-white md:p-8">
          <div className="relative z-10">
            <SobraLogo size={34} withWordmark className="[&>span]:!text-white" />
          </div>

          <div className="relative z-10 max-w-[520px] py-10 md:py-14">
            <p className="mb-3 text-micro uppercase text-sobra-green-soft">
              Nova senha
            </p>
            <h1 className="max-w-[500px] text-[34px] font-medium leading-[1.08] text-white md:text-[44px]">
              Deixe sua conta pronta para o próximo acesso.
            </h1>
            <p className="mt-4 max-w-[430px] text-body text-white/78">
              Valide o link recebido por e-mail e escolha uma senha nova para entrar no Sobra.
            </p>
          </div>

          <div className="relative z-10 rounded-card border border-white/14 bg-white/10 p-4 backdrop-blur md:max-w-[520px]">
            <p className="text-caption text-white/65">Segurança</p>
            <p className="mt-2 text-h2 font-medium text-white">Use pelo menos 6 caracteres</p>
            <p className="mt-2 text-body-sm text-white/70">
              Depois da alteração, você será enviado para o login.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 md:p-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-7">
              <p className="text-caption font-medium text-sobra-green">Conta verificada</p>
              <h2 className="mt-2 text-h1 font-medium text-sobra-ink">
                Criar nova senha
              </h2>
              <p className="mt-2 text-body-sm text-sobra-ink-muted">
                Informe e confirme sua nova senha.
              </p>
            </div>

            <Suspense fallback={<div className="h-[220px]" aria-hidden="true" />}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  )
}
