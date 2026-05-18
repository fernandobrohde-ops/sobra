import { NextResponse, type NextRequest } from 'next/server'

import { stripe, STRIPE_PRO_PRICE_ID } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function appUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 })
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id, nome_negocio')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  let customerId = profile.stripe_customer_id as string | null

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.nome_negocio ?? undefined,
        metadata: { sobra_user_id: user.id },
      })

      customerId = customer.id

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json({ error: 'Não foi possível salvar o cliente Stripe.' }, { status: 500 })
      }
    }

    const baseUrl = appUrl(request)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        sobra_user_id: user.id,
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          sobra_user_id: user.id,
        },
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Não foi possível criar o checkout.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Erro ao abrir o Stripe Checkout.' }, { status: 500 })
  }
}
