/**
 * Middleware do Next.js — proteção de rotas + refresh de sessão.
 *
 * 1. Atualiza os cookies do Supabase a cada request (necessário para
 *    Server Components conseguirem ler o usuário corretamente).
 * 2. Redireciona usuários não autenticados que tentem acessar áreas
 *    protegidas para /login.
 * 3. Redireciona usuários autenticados que cheguem em /login para
 *    /dashboard.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Prefixos que exigem usuário autenticado.
// /onboarding também é protegido — só faz sentido depois do login.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/contas',
  '/relatorio',
  '/configuracoes',
  '/onboarding',
]

const AUTH_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Não autenticado tentando entrar em área privada → manda pro login,
  // preservando o destino para redirecionar de volta após autenticar.
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Autenticado batendo em /login → manda direto pro dashboard.
//  if (isAuthRoute && user) {
//   const url = request.nextUrl.clone()
//    url.pathname = '/dashboard'
//  url.searchParams.delete('redirect')
//  return NextResponse.redirect(url)
// }

  return response
}

export const config = {
  // Ignora arquivos estáticos, imagens otimizadas, favicons e a rota
  // de callback do OAuth (que precisa rodar antes do redirect).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks).*)',
  ],
}
