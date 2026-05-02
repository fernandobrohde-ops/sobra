/**
 * Logo do Sobra — versão clara (símbolo verde sobre fundo branco/off-white)
 * conforme briefing 6.3.
 *
 * O símbolo é um gráfico de barras crescentes (mist, soft, accent) com uma
 * linha de tendência subindo e um círculo no topo, tudo alinhado.
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
  // Raio de borda escala com o tamanho — briefing 6.3
  const radius = size <= 32 ? 8 : size <= 40 ? 10 : 14

  if (!withWordmark) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Sobra"
        role="img"
        {...rest}
      >
        <rect width="40" height="40" rx={radius} fill="#0F6E56" />
        {/* Barras crescentes */}
        <rect x="9"  y="22" width="5" height="10" rx="1.5" fill="#E1F5EE" />
        <rect x="17" y="17" width="5" height="15" rx="1.5" fill="#9FE1CB" />
        <rect x="25" y="11" width="5" height="21" rx="1.5" fill="#5DCAA5" />
        {/* Linha de tendência subindo */}
        <path
          d="M9 25 L17 19 L25 13 L31 9"
          stroke="#5DCAA5"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        />
        {/* Círculo no topo */}
        <circle cx="31" cy="9" r="2.6" fill="#5DCAA5" stroke="#0F6E56" strokeWidth="1" />
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
