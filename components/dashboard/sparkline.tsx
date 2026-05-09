/**
 * Sparkline — gráfico de linha minúsculo em SVG puro, sem libs.
 *
 * Suaviza com curva quadrática pra ter a sensação premium dos dashboards
 * Linear/Stripe/Mercury. Mostra ponto + label do último valor opcional.
 */

interface SparklineProps {
  values: number[]
  /** Largura em px (default 200) */
  width?: number
  /** Altura em px (default 56) */
  height?: number
  /** Cor da linha (default verde claro do Sobra) */
  stroke?: string
  /** Cor do gradient da área embaixo da linha */
  fillFrom?: string
  /** Mostrar marker no último ponto */
  showLastPoint?: boolean
  className?: string
}

export function Sparkline({
  values,
  width = 200,
  height = 56,
  stroke = '#5DCAA5',
  fillFrom = 'rgba(93, 202, 165, 0.18)',
  showLastPoint = true,
  className,
}: SparklineProps) {
  if (values.length < 2) {
    // Sem dados o suficiente — render placeholder discreto
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>
    )
  }

  const padding = 4
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = (width - padding * 2) / (values.length - 1)

  // Mapeia (i, value) → (x, y)
  const points = values.map((v, i) => {
    const x = padding + i * stepX
    // Inverte Y (SVG cresce pra baixo)
    const y = padding + (1 - (v - min) / range) * (height - padding * 2)
    return { x, y }
  })

  // Curva suave usando quadratic Bezier — passa pelos pontos com ondulação leve.
  let path = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!
    const curr = points[i]!
    const midX = (prev.x + curr.x) / 2
    path += ` Q ${midX} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`
    path += ` Q ${midX} ${curr.y}, ${curr.x} ${curr.y}`
  }

  // Path da área (linha + fechamento até a base)
  const areaPath = `${path} L ${points[points.length - 1]!.x} ${height} L ${points[0]!.x} ${height} Z`

  const last = points[points.length - 1]!
  const gradId = `sparkline-grad-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFrom} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showLastPoint && (
        <>
          <circle cx={last.x} cy={last.y} r="6" fill={stroke} opacity="0.18" />
          <circle cx={last.x} cy={last.y} r="3" fill={stroke} />
          <circle cx={last.x} cy={last.y} r="1.5" fill="#FFFFFF" />
        </>
      )}
    </svg>
  )
}
