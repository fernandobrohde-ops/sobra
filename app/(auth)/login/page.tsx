import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SobraLogo } from '@/components/ui/sobra-logo'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta no Sobra.',
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-sobra-bg px-4 py-5 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1080px] flex-col overflow-hidden rounded-card-lg border border-sobra-line bg-white shadow-md md:min-h-[calc(100vh-64px)] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-sobra-green p-6 text-white md:p-8">
          <div className="relative z-10">
            <SobraLogo size={34} withWordmark className="[&>span]:!text-white" />
          </div>

          <div className="relative z-10 max-w-[520px] py-10 md:py-14">
            <p className="mb-3 text-micro uppercase text-sobra-green-soft">
              Gestão no WhatsApp
            </p>
            <h1 className="max-w-[500px] text-[34px] font-medium leading-[1.08] text-white md:text-[44px]">
              Seu financeiro responde tão rápido quanto uma conversa.
            </h1>
            <p className="mt-4 max-w-[430px] text-body text-white/78">
              Entre para acompanhar o caixa, registrar movimentos e conversar com o assistente do Sobra.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 rounded-card border border-white/14 bg-white/10 p-4 backdrop-blur md:max-w-[520px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-caption text-white/65">Sobra do mês</p>
                <p className="mt-1 text-h1 font-semibold text-white">R$ 4.280</p>
              </div>
              <div className="rounded-full bg-sobra-green-accent/25 px-3 py-1 text-caption font-medium text-sobra-green-soft">
                +18%
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Entradas" value="12,4k" tone="green" />
              <MiniMetric label="Saídas" value="8,1k" tone="warn" />
              <MiniMetric label="A receber" value="1,3k" tone="info" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 md:p-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-7">
              <p className="text-caption font-medium text-sobra-green">Bem-vindo de volta</p>
              <h2 className="mt-2 text-h1 font-medium text-sobra-ink">Entrar no Sobra</h2>
              <p className="mt-2 text-body-sm text-sobra-ink-muted">
                Use seu e-mail e senha ou continue com Google.
              </p>
            </div>

            <Suspense fallback={<div className="h-[240px]" aria-hidden="true" />}>
              <LoginForm />
            </Suspense>

            <p className="mt-6 text-center text-caption text-sobra-ink-faint">
              Ao continuar, você aceita os termos de uso do Sobra.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'green' | 'warn' | 'info'
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-sobra-green-accent/20 text-sobra-green-soft'
      : tone === 'warn'
        ? 'bg-sobra-warn-bg/20 text-[#F4C77E]'
        : 'bg-sobra-info-bg/20 text-[#B8D7F2]'

  return (
    <div className="rounded-control bg-white/8 p-3">
      <p className="text-[11px] leading-tight text-white/60">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-caption font-medium ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}
