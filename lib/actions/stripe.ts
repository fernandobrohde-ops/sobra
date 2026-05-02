'use server'

/**
 * Server Actions do Stripe (briefing 5.4).
 *
 * - createCheckoutSession: cria sessão de pagamento e devolve URL pra
 *   redirecionar o usuário pro Checkout do Stripe.
 * - createPortalSession: abre o billing portal pra usuário gerenciar
 *   método de pagamento, plano e cancelamento.
 *
 * O webhook (app/api/webhooks/stripe/route.ts) é quem efetivamente
 * atualiza o profile.plano quando o pagamento confirma.
 */
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_IDS, type PlanoStripe } from '@/lib/stripe/client'

type Result = { ok: true; url: string } | { ok: false; error: string }

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export async function createCheckoutSession(plano: PlanoStripe): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: 'Sessão expirou.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, nome_negocio')
    .eq('id', user.id)
    .single()
  if (!profile) return { ok: false, error: 'Perfil não encontrado.' }

  const priceId = STRIPE_PRICE_IDS[plano]
  if (!priceId || priceId.includes('placeholder')) {
    return { ok: false, error: 'Os preços do Stripe não foram configurados ainda.' }
  }

  // Reaproveita customer existente, ou cria um novo. O lookup pelo
  // customer_id evita duplicatas no Stripe.
  let customerId = profile.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.nome_negocio,
      metadata: { sobra_user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/configuracoes?stripe=success`,
      cancel_url: `${appUrl()}/configuracoes?stripe=cancelado`,
      // Passa o user_id no metadata pra reconciliar no webhook.
      subscription_data: {
        metadata: { sobra_user_id: user.id },
      },
      allow_promotion_codes: true,
    })

    if (!session.url) return { ok: false, error: 'Não consegui abrir o checkout.' }
    return { ok: true, url: session.url }
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return { ok: false, error: 'Erro ao abrir o checkout. Tenta de novo.' }
  }
}

export async function createPortalSession(): Promise<Result> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirou.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return { ok: false, error: 'Você ainda não tem assinatura ativa.' }
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl()}/configuracoes`,
    })
    return { ok: true, url: session.url }
  } catch (err) {
    console.error('Stripe portal error:', err)
    return { ok: false, error: 'Erro ao abrir o portal.' }
  }
}
