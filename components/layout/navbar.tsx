'use client'

/**
 * Navbar do app autenticado. Mobile-first:
 * - mobile (< md): logo + avatar no topo, navegação principal fixa embaixo
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
  icon: NavIcon
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',     label: 'Dashboard', icon: 'dashboard' },
  { href: '/contas',        label: 'Contas', icon: 'wallet' },
  { href: '/relatorio',     label: 'Relatório', icon: 'chart' },
  { href: '/configuracoes', label: 'Ajustes', icon: 'settings' },
]

type NavIcon = 'dashboard' | 'wallet' | 'chart' | 'settings'

interface NavbarProps {
  /** Iniciais do usuário pra mostrar no avatar (ex: "FR"). */
  iniciais: string
}

export function Navbar({ iniciais }: NavbarProps) {
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
              const ativo = isActive(pathname, l.href)
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
              className="relative w-9 h-9 rounded-full bg-sobra-green text-white text-caption font-medium flex items-center justify-center"
              aria-label="Menu da conta"
              aria-expanded={open}
            >
              {iniciais || '·'}
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-sobra-line bg-white/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0px)]"
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-4 max-w-[520px] mx-auto px-1.5 pt-1.5 pb-1.5">
          {NAV_LINKS.map((l) => {
            const ativo = isActive(pathname, l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`h-14 rounded-control flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  ativo
                    ? 'text-sobra-green bg-sobra-green-mist'
                    : 'text-sobra-ink/55 hover:text-sobra-ink hover:bg-sobra-bg'
                }`}
                aria-current={ativo ? 'page' : undefined}
              >
                <NavIconSvg icon={l.icon} />
                <span>{l.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavIconSvg({ icon }: { icon: NavIcon }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (icon === 'wallet') {
    return (
      <svg {...common}>
        <path d="M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3h12" />
        <path d="M16 12h3" />
      </svg>
    )
  }

  if (icon === 'chart') {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-6" />
      </svg>
    )
  }

  if (icon === 'settings') {
    return (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M4 17h16" />
        <path d="M8 7v4" />
        <path d="M16 13v4" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
      <path d="M10 19v-5h4v5" />
    </svg>
  )
}
