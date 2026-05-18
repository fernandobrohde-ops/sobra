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
import { WhatsappSection } from './whatsapp-section'
import { getStatusVinculo } from '@/lib/actions/whatsapp'
import { PRO_STATUSES } from '@/lib/billing/plano'
import { UpgradeCard } from '@/components/billing/upgrade-card'

export const metadata: Metadata = { title: 'Configurações' }

// Tipos locais — o gerador oficial do Supabase (`supabase gen types`) vai
// substituir isso quando rodarmos contra o schema real. Por ora, declaramos
// só o que essa página consome pra evitar narrowing pra `never`.
interface ProfileSummary {
  nome_negocio: string
  setor: Setor
  whatsapp: string | null
  avatar_url: string | null
  plano: Plano
  trial_fim?: string | null
  trial_ends_at?: string | null
  subscription_status?: string | null
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
      .select('*')
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

  const isPro = profile.plano === 'pro' && PRO_STATUSES.has(profile.subscription_status ?? '')

  const { data: avatarProfile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  profile.avatar_url = avatarProfile?.avatar_url ?? null

  // Status do vínculo WhatsApp pra hidratação inicial da seção
  const statusVinc = await getStatusVinculo()
  const wppInicial = statusVinc.ok
    ? statusVinc.data
    : { vinculado: false, whatsapp_number: null, verified_at: null }

  // Número público do Sobra que o usuário envia mensagem
  const numeroSobra = process.env.NEXT_PUBLIC_SOBRA_WHATSAPP ?? '+55 54 3698-3995'

  return (
    <>
      <div className="mb-6">
        <h1 className="text-h1 font-medium text-sobra-ink">Configurações</h1>
        <p className="text-caption text-sobra-ink/60">
          Organize seu perfil, assistente e preferências do Sobra.
        </p>
      </div>

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-card border border-sobra-green-soft bg-sobra-green-pale p-5 md:p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="text-micro uppercase tracking-wider text-sobra-green mb-2">
                Diferencial do Sobra
              </p>
              <h2 className="text-h1 font-medium text-sobra-ink">Assistente WhatsApp</h2>
              <p className="mt-2 text-body-sm text-sobra-ink-soft">
                Registre entradas, saídas e contas por conversa, com respostas usando os dados reais do seu negócio.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-caption font-medium text-sobra-green shadow-xs">
              <span className="h-2 w-2 rounded-full bg-sobra-green" />
              {wppInicial.vinculado ? 'Ativo' : 'Disponível'}
            </div>
          </div>
          <div className="mt-5 border-t border-sobra-green-soft/70 pt-5">
            {isPro ? (
              <WhatsappSection inicial={wppInicial} numeroSobra={numeroSobra} />
            ) : (
              <UpgradeCard
                compact
                message="Alertas e assistente WhatsApp estão disponíveis no plano Pro."
              />
            )}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Section titulo="Perfil" descricao="Dados públicos do negócio e aparência da conta.">
              <PerfilForm
                initial={{
                  nome_negocio: profile.nome_negocio,
                  setor: profile.setor,
                  whatsapp: profile.whatsapp ?? '',
                  avatar_url: profile.avatar_url ?? '',
                }}
              />
            </Section>

            <Section titulo="Categorias" descricao="Organização usada no dashboard e nos lançamentos.">
              <CategoriasSection categorias={categorias} />
            </Section>
          </div>

          <div className="space-y-5">
            <Section titulo="Alertas" descricao="Avisos de vencimento e resumo semanal.">
              <AlertasForm
                initial={{
                  whatsapp_ativo: alertas.whatsapp_ativo,
                  email_ativo: alertas.email_ativo,
                  alerta_vencimento_dias: alertas.alerta_vencimento_dias,
                  resumo_semanal: alertas.resumo_semanal,
                }}
                temWhatsapp={!!profile.whatsapp}
                isPro={isPro}
              />
            </Section>

            <Section titulo="Plano" descricao="Assinatura e acesso atual.">
              <PlanoSection
                plano={profile.plano ?? 'free'}
                trialFim={profile.trial_ends_at ?? profile.trial_fim ?? null}
                temAssinatura={
                  profile.subscription_status === 'active' ||
                  profile.subscription_status === 'trialing'
                }
              />
            </Section>

            <div className="rounded-card border border-sobra-line bg-white p-4 shadow-xs">
              <SairButton />
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

function Section({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
}) {
  return (
    <section className="sobra-card">
      <div className="mb-4">
        <h2 className="text-h2 font-medium text-sobra-ink">{titulo}</h2>
        {descricao && (
          <p className="mt-1 text-caption text-sobra-ink-muted">{descricao}</p>
        )}
      </div>
      {children}
    </section>
  )
}
