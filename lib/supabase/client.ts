/**
 * Cliente Supabase para o BROWSER.
 *
 * Use em Client Components ('use client'). Para Server Components,
 * Route Handlers e Server Actions, use lib/supabase/server.ts.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
