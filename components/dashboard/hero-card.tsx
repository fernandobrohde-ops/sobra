/**
 * Hero card v2 — "O que sobrou" com foco emocional + sparkline.
 *
 * Filosofia: o card tem que transmitir clareza financeira em 1 segundo.
 * Hierarquia: Label sutil → Valor enorme em Lora → Microcopy contextual
 * → Sparkline → Comparação. Tudo sobre fundo verde com profundidade.
 */
import { formatBRL, formatPercent } from '@/lib/utils/format'
import { Sparkline } from './sparkline'
import type { HistoricoMes } from '@/lib/dashboard/queries'

interface HeroCardProps {
  sobra: number
  faturado: number
  variacao: number | null
  sobraAnterior: number
  periodoLabel: string
  historicoMensal: HistoricoMes[]
}

export function HeroCard({
  sobra,
  faturado,
  variacao,
  sobraAnterior,
  periodoLabel,
  historicoMensal,
}: HeroCardProps) {
  // Microcopy emocional baseada no estado financeiro
  const microcopy = gerarMicrocopy(sobra, faturado, variacao)

  // Cor da variação
  const varCor =
    variacao == null
      ? 'text-white/55'
      : variacao >= 0
      ? 'text-sobra-green-mist'
      : 'text-[#FCA5A5]'

  const varIcon =
    variacao == null
      ? null
      : variacao >= 0
      ? <TrendUpIcon />
      : <TrendDownIcon />

  // Valores pra sparkline (sobra dos últimos 6 meses)
  const sparkValues = (historicoMensal ?? []).map((h) => h.sobra)

  return (
    <div className="relative rounded-card-lg overflow-hidden shadow-hero">
      {/* Gradient layered sobre verde escuro pra dar profundidade */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F6E56] via-[#0F6E56] to-[#0a4f3d]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(93,202,165,0.20),transparent_60%)]" />

      {/* Pattern grid sutil no fundo */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Conteúdo */}
      <div className="relative p-6 md:p-8 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-micro uppercase tracking-wider text-sobra-green-mist/70">
              O que sobrou {periodoLabel.toLowerCase()}
            </p>
            <p className="font-display text-display-xl mt-2 leading-none">
              {formatBRL(sobra)}
            </p>
            <p className="text-body-sm text-white/65 mt-3 max-w-[28ch]">
              {microcopy}
            </p>
          </div>

          {/* Sparkline à direita (esconde no mobile pra dar respiro) */}
          <div className="hidden md:block flex-shrink-0">
            <Sparkline
              values={sparkValues}
              width={220}
              height={64}
              stroke="#9FE1CB"
              fillFrom="rgba(159, 225, 203, 0.22)"
            />
            <p className="text-micro text-white/40 text-right mt-1.5">últimos 6 meses</p>
          </div>
        </div>

        {/* Footer: comparação com mês anterior */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-body-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-white/55">Faturamento</span>
            <span className="font-medium tabular-nums">{formatBRL(faturado)}</span>
          </div>
          <span className="text-white/20" aria-hidden>·</span>
          {variacao !== null ? (
            <div className={`flex items-center gap-1 font-medium ${varCor}`}>
              {varIcon}
              <span className="tabular-nums">{formatPercent(variacao)}</span>
              <span className="text-white/55 font-normal">vs período anterior</span>
            </div>
          ) : (
            <div className="text-white/45">
              Sem dados anteriores pra comparar
            </div>
          )}
          {sobraAnterior !== 0 && variacao !== null && (
            <>
              <span className="text-white/20" aria-hidden>·</span>
              <div className="text-white/45 tabular-nums">
                Anterior: {formatBRL(sobraAnterior)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Microcopy emocional — varia conforme estado financeiro
// ---------------------------------------------------------------------
function gerarMicrocopy(sobra: number, faturado: number, variacao: number | null): string {
  if (faturado === 0 && sobra === 0) {
    return 'Quando entrar dinheiro, você vai ver aqui o que realmente sobra.'
  }

  if (sobra < 0) {
    return 'Você gastou mais do que entrou. Vamos olhar onde dá pra apertar.'
  }

  if (faturado === 0 && sobra < 0) {
    return 'Mês de gastos. Quando vier receita, fica mais fácil enxergar.'
  }

  if (variacao !== null && variacao >= 20) {
    return 'Mês forte. Sobrou bem mais que o anterior — bora manter o ritmo.'
  }

  if (variacao !== null && variacao <= -20) {
    return 'Sobrou menos que no período anterior. Vale dar uma olhada nos gastos.'
  }

  if (sobra > 0 && faturado > 0) {
    return 'Esse é o que ficou no caixa depois de tudo pago.'
  }

  return 'Esse é o resultado do seu mês até aqui.'
}

function TrendUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 9.5L6 6.5L8 8.5L11.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 5H11.5V7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrendDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3 4.5L6 7.5L8 5.5L11.5 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9H11.5V6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
