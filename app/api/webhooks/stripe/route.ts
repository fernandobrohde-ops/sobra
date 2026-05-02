/**
 * Webhook do Stripe (briefing 5.4).
 *
 * Recebe eventos do Stripe e atualiza profile.plano e
 * profile.stripe_subscription_id de acordo. Eventos tratados:
 *  - checkout.session.completed (assinatura nova)
 *  - customer.subscription.updated (mudou de plano)
 *  - customer.subscription.deleted (cancelou)
 *
 * Importante: usamos a service_role key porque o webhook não tem
 * sessão de usuário (vem do Stripe direto pra nós).
 *
 * Para validar no Stripe Dashboard:
 *   1. Adicione um endpoint apontando pra https://seu-app.com/api/webhooks/stripe
 *   2. Selecione os eventos acima.
 *   3. Copie o webhook secret pra STRIPE_WEBHOOK_SECRET.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe/client'
import type { Database, Plano } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Service role bypassa RLS — necessário porque o webhook não tem sessão.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL e SERVICE_ROLE_KEY são obrigatórios pro webhook.')
  }
  return createServiceClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret não configurado.' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature inválida:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = serviceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.sobra_user_id
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        if (!userId || !subscriptionId) break

        // Busca o subscription pra saber qual price_id e mapear pro plano.
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = sub.items.data[0]?.price.id
        const plano = priceIdToPlano(priceId)

        await supabase
          .from('profiles')
          .update({
            plano,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          })
          .eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const userId = sub.metadata?.sobra_user_id
        if (!userId) break

        const priceId = sub.items.data[0]?.price.id
        const plano = priceIdToPlano(priceId)

        // Cancelado mas ainda no período pago? Mantemos o plano até a
        // data fim. Aqui só atualizamos quando o status muda de fato.
        const ativo = ['active', 'trialing'].includes(sub.status)
        await supabase
          .from('profiles')
          .update({
            plano: ativo ? plano : 'gratis',
            stripe_subscription_id: ativo ? sub.id : null,
          })
          .eq('id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.sobra_user_id
        if (!userId) break

        await supabase
          .from('profiles')
          .update({ plano: 'gratis', stripe_subscription_id: null })
          .eq('id', userId)
        break
      }

      default:
        // Ignoramos eventos não esperados sem retornar erro
        // (Stripe espera 2xx pra não retentar).
        break
    }
  } catch (err) {
    console.error('Erro processando webhook:', err)
    // Stripe vai retentar com backoff automático.
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function priceIdToPlano(priceId: string | undefined): Plano {
  if (!priceId) return 'gratis'
  if (priceId === STRIPE_PRICE_IDS.essencial) return 'essencial'
  if (priceId === STRIPE_PRICE_IDS.pro) return 'pro'
  return 'gratis'
}
