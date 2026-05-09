/**
 * Logo do Sobra — versão clara (símbolo branco/verde sobre fundo
 * verde escuro do briefing 6.3).
 *
 * O símbolo é uma seta crescente dentro de um círculo, com um ponto
 * verde-claro destacado abaixo da haste — sintetiza "alta" + "marcador
 * de início" (a 'sobra' que cresce).
 *
 * Uso:
 *   <SobraLogo size={40} />              // só o símbolo
 *   <SobraLogo size={40} withWordmark /> // símbolo + "sobra"
 */
import type { SVGProps } from 'react'

interface SobraLogoProps extends SVGProps<SVGSVGElement> {
  size?: number
  withWordmark?: boolean
}

export function SobraLogo({
  size = 40,
  withWordmark = false,
  className,
  ...rest
}: SobraLogoProps) {
  if (!withWordmark) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Sobra"
        role="img"
        {...rest}
      >
        {/* Container verde da marca — radius proporcional (25/100 = 0.25) */}
        <rect width="100" height="100" rx="25" fill="#0F6E56" />

        {/* Círculo externo */}
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="7"
          fill="none"
        />

        {/* Haste da seta */}
        <path
          d="M50 68V34"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Ponta da seta */}
        <path
          d="M32 52L50 34L68 52"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Marcador inferior em verde-claro */}
        <circle cx="50" cy="74" r="5" fill="#5DCAA5" />
      </svg>
    )
  }

  // Versão com wordmark: símbolo à esquerda + "sobra" em Lora à direita.
  // O texto usa a CSS var --font-lora carregada em app/layout.tsx.
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className ?? ''}`}
      aria-label="Sobra"
    >
      <SobraLogo size={size} {...rest} />
      <span
        className="font-display text-sobra-ink"
        style={{
          fontSize: Math.round(size * 0.7),
          letterSpacing: '-0.3px',
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        sobra
      </span>
    </span>
  )
}
