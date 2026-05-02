/**
 * Card hero "O que sobrou esse mês" (briefing 4.3).
 *
 * Verde escuro, valor grande, com subtexto de faturamento e variação.
 */
import { formatBRL, formatPercent } from '@/lib/utils/format'

interface HeroCardProps {
  sobra: number
  faturado: number
  variacao: number | null
  periodoLabel: string
}

export function HeroCard({ sobra, faturado, variacao, periodoLabel }: HeroCardProps) {
  const variacaoLabel = formatPercent(variacao)
  // Cor do indicador de variação:
  //  positivo (sobra cresceu) → verde claro
  //  negativo → vermelho atenuado
  //  nulo → cinza neutro
  const variacaoCor =
    variacao == null
      ? 'text-white/60'
      : variacao >= 0
      ? 'text-sobra-green-mist'
      : 'text-[#FCA5A5]'

  return (
    <div className="rounded-card bg-sobra-green text-white p-6 md:p-7 shadow-card overflow-hidden relative">
      {/* Gráfico decorativo no canto, sutil */}
      <DecoChart />

      <p className="text-caption text-sobra-green-mist/80 uppercase tracking-wide">
        O que sobrou {periodoLabel.toLowerCase()}
      </p>
      <p className="text-display font-display mt-1 leading-none">
        {formatBRL(sobra)}
      </p>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-caption text-white/80">
        <span>de {formatBRL(faturado)} faturados</span>
        <span className="text-white/30" aria-hidden>·</span>
        <span className={variacaoCor}>
          {variacaoLabel} vs período anterior
        </span>
      </div>
    </div>
  )
}

function DecoChart() {
  return (
    <svg
      width="220"
      height="80"
      viewBox="0 0 220 80"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute right-0 top-0 opacity-20 pointer-events-none"
      aria-hidden="true"
    >
      <path
        d="M0 60 L40 50 L80 55 L120 35 L160 30 L200 12 L220 8"
        stroke="#9FE1CB"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="220" cy="8" r="3" fill="#5DCAA5" />
    </svg>
  )
}
