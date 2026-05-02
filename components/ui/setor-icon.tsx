/**
 * Ícones dos setores do briefing 4.2.
 *
 * Estilo: traço único, currentColor (herdam a cor do contexto).
 * 24x24, mas escalam via prop size.
 */
import type { SVGProps } from 'react'
import type { Setor } from '@/types/database'

interface SetorIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  setor: Setor
  size?: number
}

export function SetorIcon({ setor, size = 24, ...rest }: SetorIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }

  switch (setor) {
    case 'alimentacao':
      // Xícara com vapor
      return (
        <svg {...common}>
          <path d="M5 10h12v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5Z" />
          <path d="M17 11h2a2 2 0 0 1 0 4h-2" />
          <path d="M8 4c0 1 1 1.5 1 2.5S8 8 8 9" />
          <path d="M12 4c0 1 1 1.5 1 2.5S12 8 12 9" />
        </svg>
      )

    case 'servicos':
      // Chave de boca
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 1 5 5l-9.5 9.5-3.5-1.5-1.5-3.5 9.5-9.5Z" />
          <path d="m9 12 3 3" />
        </svg>
      )

    case 'comercio':
      // Sacola
      return (
        <svg {...common}>
          <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
          <path d="M9 11V6a3 3 0 0 1 6 0v5" />
        </svg>
      )

    case 'construcao':
      // Capacete de obra
      return (
        <svg {...common}>
          <path d="M3 17h18" />
          <path d="M5 17v-2a7 7 0 0 1 14 0v2" />
          <path d="M10 8V5a2 2 0 0 1 4 0v3" />
          <path d="M3 17h18v2H3z" />
        </svg>
      )

    case 'saude':
      // Coração
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
        </svg>
      )

    case 'educacao':
      // Livro aberto
      return (
        <svg {...common}>
          <path d="M3 5h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v13h-7a3 3 0 0 0-2 1 3 3 0 0 0-2-1H3V5Z" />
          <path d="M12 6v13" />
        </svg>
      )

    case 'outros':
      // Maleta/pasta
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      )

    default: {
      // exhaustiveness check em compile-time
      const _never: never = setor
      return null
    }
  }
}
