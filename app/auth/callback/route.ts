/**
 * Callback de autenticação — fecha o loop de magic link e Google OAuth.
 *
 * Fluxo:
 *  1. Usuário clica no link do e-mail (ou volta do Google).
 *  2. Supabase redireciona pro nosso `/auth/callback?code=...&next=/dashboard`.
 *  3. Aqui trocamos o `code` por uma sessão (cookies do Supabase) e
 *     redirecionamos pra:
 *       - `next` se foi passado e for safe (mesma origem),
 *       - `/onboarding` se o usuário ainda não tem profile,
 *       - `/dashboard` caso contrário.
 *
 * Erros: se o Supabase recusar o code (link expirado, já usado), volta pra
 * /login com `?erro=link_invalido`.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const errorDescription = searchParams.get('error_description')

  // O usuário pode chegar aqui com erro (ex: cancelou no Google).
  if (errorDescription) {
    const url = new URL('/login', origin)
    url.searchParams.set('erro', 'cancelado')
    return NextResponse.redirect(url)
  }

  if (!code) {
    const url = new URL('/login', origin)
    url.searchParams.set('erro', 'link_invalido')
    return NextResponse.redirect(url)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const url = new URL('/login', origin)
    url.searchParams.set('erro', 'link_invalido')
    return NextResponse.redirect(url)
  }

  // Decide o destino. Só aceita `next` se for um path relativo seguro
  // (começa com '/' e não é um path absoluto external como `//evil.com`).
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null

  // Se o usuário já é conhecido pelo banco (tem profile), manda pro dashboard.
  // Caso contrário, é primeiro acesso → onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let destino = '/dashboard'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    destino = profile ? safeNext ?? '/dashboard' : '/onboarding'
  }

  return NextResponse.redirect(new URL(destino, origin))
}
