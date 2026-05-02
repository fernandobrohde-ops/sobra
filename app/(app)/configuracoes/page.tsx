/**
 * /configuracoes (briefing 4.7)
 *
 * 4 seções: Perfil, Categorias, Alertas, Plano.
 */
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Plano, Setor, TipoLancamento } from '@/types/database'
import { PerfilForm } from './perfil-form'
import { CategoriasSection } from './categorias-section'
import { AlertasForm } from './alertas-form'
import { PlanoSection } from './plano-section'
import { SairButton } from './sair-button'

export const metadata: Metadata = { title: 'Configurações' }

// Tipos locais — o gerador oficial do Supabase (`supabase gen types`) vai
// substituir isso quando rodarmos contra o schema real. Por ora, declaramos
// só o que essa página consome pra evitar narrowing pra `never`.
interface ProfileSummary {
  nome_negocio: string
  setor: Setor
  whatsapp: string | null
  plano: Plano
  trial_fim: string | null
  stripe_subscription_id: string | null
}

interface CategoriaSummary {
  id: string
  nome: string
  tipo: TipoLancamento
  cor: string | null
}

interface AlertasSummary {
  whatsapp_ativo: boolean
  email_ativo: boolean
  alerta_vencimento_dias: 1 | 2 | 3 | 7
  resumo_semanal: boolean
}

export default async function ConfiguracoesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, categoriasRes, alertasRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('nome_negocio, setor, whatsapp, plano, trial_fim, stripe_subscription_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('categorias')
      .select('id, nome, tipo, cor')
      .eq('user_id', user.id)
      .order('tipo', { ascending: true })
      .order('nome', { ascending: true }),
    supabase
      .from('alertas_config')
      .select('whatsapp_ativo, email_ativo, alerta_vencimento_dias, resumo_semanal')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // Cast — o supabase-js infere `never` em algumas combinações de
  // .select(colunas).single() com tipos placeholder. Quando substituirmos
  // o types/database.ts pelo gerado pelo `supabase gen types`, esses
  // casts ficam redundantes e podem ser removidos.
  const profile = profileRes.data as ProfileSummary | null
  const categorias = (categoriasRes.data ?? []) as CategoriaSummary[]
  const alertas: AlertasSummary = (alertasRes.data as AlertasSummary | null) ?? {
    whatsapp_ativo: true,
    email_ativo: true,
    alerta_vencimento_dias: 3,
    resumo_semanal: true,
  }

  if (!profile) return null

  return (
    <>
      <div className="mb-6">
        <h1 className="text-h1 font-medium text-sobra-ink">Configurações</h1>
        <p className="text-caption text-sobra-ink/60">
          Personalize seu negócio, categorias e alertas.
        </p>
      </div>

      <div className="space-y-5">
        <Section titulo="Perfil">
          <PerfilForm
            initial={{
              nome_negocio: profile.nome_negocio,
              setor: profile.setor,
              whatsapp: profile.whatsapp ?? '',
            }}
          />
        </Section>

        <Section titulo="Categorias">
          <CategoriasSection categorias={categorias} />
        </Section>

        <Section titulo="Alertas">
          <AlertasForm
            initial={{
              whatsapp_ativo: alertas.whatsapp_ativo,
              email_ativo: alertas.email_ativo,
              alerta_vencimento_dias: alertas.alerta_vencimento_dias,
              resumo_semanal: alertas.resumo_semanal,
            }}
            temWhatsapp={!!profile.whatsapp}
          />
        </Section>

        <Section titulo="Plano">
          <PlanoSection
            plano={profile.plano}
            trialFim={profile.trial_fim}
            temAssinatura={!!profile.stripe_subscription_id}
          />
        </Section>

        <div className="pt-2">
          <SairButton />
        </div>
      </div>
    </>
  )
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="sobra-card">
      <h2 className="text-h2 font-medium text-sobra-ink mb-4">{titulo}</h2>
      {children}
    </section>
  )
}
