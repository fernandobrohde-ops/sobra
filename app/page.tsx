/**
 * Rota raiz `/` — apenas decide para onde mandar o usuário.
 *
 * Autenticado → /dashboard
 * Não autenticado → /login
 *
 * O middleware também faz redirects, mas manter a lógica aqui evita
 * piscar uma página em branco caso o middleware mude no futuro.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/login')
}
