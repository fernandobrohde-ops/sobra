'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SairButton() {
  const router = useRouter()
  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }
  return (
    <button type="button" onClick={sair} className="sobra-btn-secondary">
      Sair da conta
    </button>
  )
}
