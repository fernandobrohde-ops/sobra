'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Plano } from '@/types/database'

interface UsePlanoState {
  plano: Plano
  subscription_status: string | null
  isPro: boolean
  isFree: boolean
  loading: boolean
}

const PRO_STATUSES = new Set(['active', 'trialing'])

export function usePlano(): UsePlanoState {
  const [state, setState] = useState<UsePlanoState>({
    plano: 'free',
    subscription_status: null,
    isPro: false,
    isFree: true,
    loading: true,
  })

  useEffect(() => {
    let alive = true

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (alive) setState((curr) => ({ ...curr, loading: false }))
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('plano, subscription_status')
        .eq('id', user.id)
        .maybeSingle()

      const plano = ((data?.plano as Plano | null) ?? 'free')
      const subscriptionStatus = (data?.subscription_status as string | null) ?? null
      const isPro = plano === 'pro' && PRO_STATUSES.has(subscriptionStatus ?? '')

      if (alive) {
        setState({
          plano,
          subscription_status: subscriptionStatus,
          isPro,
          isFree: !isPro,
          loading: false,
        })
      }
    }

    load()
    return () => { alive = false }
  }, [])

  return state
}
