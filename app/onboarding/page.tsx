/**
 * Página /onboarding (briefing 4.2)
 *
 * Exibida apenas uma vez, na primeira vez que o usuário faz login.
 * Como ainda não temos o profile, o middleware deixa passar (a verificação
 * de "já tem profile?" mora aqui mesmo, no Server Component).
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from './onboarding-wizard'

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Configure seu negócio em 3 passos rápidos.',
}

export default async function OnboardingPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redundante com o middleware, mas defensivo.
  if (!user) {
    redirect('/login')
  }

  // Se já existe profile, o usuário já passou pelo onboarding antes.
  // Manda direto pro dashboard pra evitar reconfiguração acidental.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    redirect('/dashboard')
  }

  return <OnboardingWizard userEmail={user.email ?? ''} />
}
