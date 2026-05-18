import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

import type { Database } from '@/types/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia',
  })

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
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await updateProfileFromSubscription(supabase, subscription, session.metadata?.sobra_user_id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await updateProfileFromSubscription(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await updateProfileFromSubscription(supabase, subscription)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Erro processando webhook:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function updateProfileFromSubscription(
  supabase: ReturnType<typeof serviceClient>,
  subscription: Stripe.Subscription,
  metadataUserId?: string
) {
  const userId = metadataUserId ?? subscription.metadata?.sobra_user_id
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const ativo = subscription.status === 'active' || subscription.status === 'trialing'
  const updates = {
    plano: ativo ? 'pro' : 'free',
    subscription_status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: ativo ? subscription.id : null,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  }

  const { error } = userId
    ? await supabase.from('profiles').update(updates).eq('id', userId)
    : await supabase
        .from('profiles')
        .update(updates)
        .eq('stripe_customer_id', customerId)

  if (error) throw error
}
