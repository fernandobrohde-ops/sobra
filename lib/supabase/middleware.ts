/**
 * Helper de Supabase para uso dentro do middleware do Next.js.
 *
 * Atualiza os cookies da sessão a cada request, e devolve a session
 * atual para o middleware decidir se redireciona ou não.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          // Reescreve cookies tanto na request (para o resto do middleware ler)
          // quanto na response (para o cliente receber atualizado).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() precisa rodar logo após criar o client.
  // Não insira código entre o createServerClient e este getUser, senão
  // a sessão pode ficar dessincronizada.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
