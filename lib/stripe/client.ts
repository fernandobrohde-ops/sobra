/**
 * Cliente Stripe (server-side).
 *
 * Pegue a chave em: Stripe Dashboard → Developers → API keys.
 * Em dev, use a chave de teste (sk_test_...).
 */
import 'server-only'
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  // Falha cedo, com mensagem útil. Não crasha o build (só executa
  // quando o módulo é importado em runtime).
  console.warn('STRIPE_SECRET_KEY não configurada. Funcionalidades de pagamento não vão funcionar.')
}

export const stripe = new Stripe(key ?? 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

/**
 * Mapeamento de plano interno → Price ID do Stripe.
 * Configure depois de criar os produtos no dashboard do Stripe.
 *
 * Crie 2 produtos com seus respectivos Price IDs e cole aqui (ou em env vars).
 */
export const STRIPE_PRICE_IDS = {
  essencial: process.env.STRIPE_PRICE_ESSENCIAL ?? 'price_essencial_placeholder',
  pro:       process.env.STRIPE_PRICE_PRO       ?? 'price_pro_placeholder',
} as const

export type PlanoStripe = keyof typeof STRIPE_PRICE_IDS
