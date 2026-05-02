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
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',     label: 'Dashboard' },
  { href: '/contas',        label: 'Contas' },
  { href: '/relatorio',     label: 'Relatório' },
  { href: '/configuracoes', label: 'Ajustes' },
]

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
            className="relative w-9 h-9 rounded-full bg-sobra-green text-white text-caption font-medium flex items-center justify-center"
            aria-label="Menu"
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
                {/* Links de navegação no mobile */}
                <div className="md:hidden">
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block px-3 py-2 text-body text-sobra-ink hover:bg-sobra-bg rounded-control"
                      role="menuitem"
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-sobra-line" />
                </div>
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
  )
}
