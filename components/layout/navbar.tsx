'use client'

/**
 * Navbar do app autenticado. Mobile-first:
 * - mobile (< md): logo à esquerda, menu hamburger à direita
 * - desktop (>= md): logo à esquerda, links inline, avatar à direita
 *
 * O sair fica num menu pra evitar clique acidental.
 */
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { SobraLogo } from '@/components/ui/sobra-logo'
import { createClient } from '@/lib/supabase/client'

interface NavLink {
  href: string
  label: string
  icon: 'home' | 'wallet' | 'chart' | 'settings'
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',     label: 'Dashboard', icon: 'home' },
  { href: '/contas',        label: 'Contas',    icon: 'wallet' },
  { href: '/relatorio',     label: 'Relatório', icon: 'chart' },
  { href: '/configuracoes', label: 'Ajustes',   icon: 'settings' },
]

interface NavbarProps {
  /** Iniciais do usuário pra mostrar no avatar (ex: "FR"). */
  iniciais: string
  avatarUrl?: string | null
}

export function Navbar({ iniciais, avatarUrl }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
    <header className="sticky top-0 z-30 bg-sobra-bg/85 backdrop-blur border-b border-sobra-line">
      <div className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center" aria-label="Sobra">
          <SobraLogo size={28} withWordmark />
        </Link>

        {/* Links inline (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => {
            const ativo = pathname === l.href || pathname.startsWith(`${l.href}/`)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-control text-caption font-medium transition-colors ${
                  ativo
                    ? 'bg-sobra-green-mist text-sobra-green'
                    : 'text-sobra-ink/70 hover:text-sobra-ink hover:bg-sobra-line/40'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Avatar com iniciais — abre menu */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="relative w-9 h-9 rounded-full bg-sobra-green text-white text-caption font-medium flex items-center justify-center overflow-hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              iniciais || '·'
            )}
          </button>

          {open && (
            <>
              {/* Overlay invisível pra fechar ao clicar fora */}
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 cursor-default"
                tabIndex={-1}
              />
              <div
                className="absolute right-4 top-14 w-56 bg-white border border-sobra-line rounded-card shadow-lg p-1.5 z-50"
                role="menu"
              >
                <button
                  type="button"
                  onClick={sair}
                  className="block w-full text-left px-3 py-2 text-body text-sobra-ink hover:bg-sobra-bg rounded-control"
                  role="menuitem"
                >
                  Sair da conta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sobra-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(15,23,18,0.08)] backdrop-blur md:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-1">
        {NAV_LINKS.map((l) => {
          const ativo = pathname === l.href || pathname.startsWith(`${l.href}/`)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-control px-1 text-[11px] font-medium transition-colors ${
                ativo
                  ? 'bg-sobra-green-mist text-sobra-green'
                  : 'text-sobra-ink-muted active:bg-sobra-bg'
              }`}
            >
              <NavIcon icon={l.icon} active={ativo} />
              <span className="leading-none">{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
    </>
  )
}

function NavIcon({ icon, active }: { icon: NavLink['icon']; active: boolean }) {
  const strokeWidth = active ? 2.4 : 2
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (icon === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 10v9h11v-9" />
        <path d="M10 19v-5h4v5" />
      </svg>
    )
  }

  if (icon === 'wallet') {
    return (
      <svg {...common}>
        <path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v7a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 4 17V7.5Z" />
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18" />
        <path d="M16 13.5h.01" />
      </svg>
    )
  }

  if (icon === 'chart') {
    return (
      <svg {...common}>
        <path d="M5 19V5" />
        <path d="M5 19h14" />
        <path d="m8 15 3-4 3 2 4-6" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 .58V20a2 2 0 0 1-4 0v-.05a1.7 1.7 0 0 0-1-.58 1.7 1.7 0 0 0-1.88.34l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-.58-1H4a2 2 0 0 1 0-4h.05a1.7 1.7 0 0 0 .58-1 1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1-.58V4a2 2 0 0 1 4 0v.05a1.7 1.7 0 0 0 1 .58 1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.37 9c.2.37.38.7.58 1H20a2 2 0 0 1 0 4h-.05a1.7 1.7 0 0 0-.55 1Z" />
    </svg>
  )
}
