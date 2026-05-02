/**
 * Cliente Supabase para o SERVIDOR.
 *
 * Use em Server Components, Route Handlers e Server Actions.
 * Cada chamada cria um cliente novo, ligado ao cookieStore da request
 * atual — não armazene em variável global.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // O método set pode falhar quando chamado de Server Components
            // (cookies só podem ser definidos via Route Handler / Server Action
            // / middleware). Nesses casos, o middleware já cuida de revalidar
            // a sessão, então é seguro ignorar.
          }
        },
      },
    }
  )
}
