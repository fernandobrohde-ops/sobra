'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function DashboardAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    let lastRefresh = 0

    function refresh() {
      const now = Date.now()
      if (now - lastRefresh < 5000) return
      lastRefresh = now
      router.refresh()
    }

    const interval = window.setInterval(refresh, 20000)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [router])

  return null
}
