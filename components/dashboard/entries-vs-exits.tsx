/**
 * Gráfico simples de entradas vs saídas — barras pareadas por mês.
 *
 * Visual minimalista, SVG puro, sem libs. Mostra os últimos 6 meses
 * lado a lado: barra verde (entradas) e barra cinza (saídas), com a
 * sobra (entradas - saídas) como label discreta acima.
 */
import type { HistoricoMes } from '@/lib/dashboard/queries'
import { formatBRL } from '@/lib/utils/format'

interface EntriesVsExitsProps {
  data: HistoricoMes[]
}

export function EntriesVsExits({ data }: EntriesVsExitsProps) {
  const hasAnyMovement = data.some((d) => d.entradas > 0 || d.saidas > 0)

  // Top dos valores pra normalizar altura
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.entradas, d.saidas])
  )

  // Sobra total pro footer
  const totalSobra = data.reduce((s, d) => s + d.sobra, 0)
  const totalEntradas = data.reduce((s, d) => s + d.entradas, 0)
  const totalSaidas = data.reduce((s, d) => s + d.saidas, 0)

  return (
    <div className="bg-white border border-sobra-line rounded-card p-5 shadow-xs">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-h2 font-semibold text-sobra-ink">Entradas e saídas</h2>
        <span className="text-micro uppercase tracking-wider text-sobra-ink-faint">
          histórico dos últimos 6 meses
        </span>
      </div>
      <p className="text-caption text-sobra-ink-muted mb-5">
        Histórico mês a mês, independente do filtro escolhido acima.
      </p>

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4">
        <Legend color="#1D9E75" label="Entradas" />
        <Legend color="#D4D4CD" label="Saídas" />
      </div>

      {/* Barras */}
      <div className="relative h-32 mb-3">
        <div className="absolute inset-x-0 bottom-0 h-px bg-sobra-line-soft" aria-hidden />
        <div className="absolute inset-x-0 top-1/2 h-px bg-sobra-line-soft/70" aria-hidden />

        {hasAnyMovement ? (
          <div className="relative flex items-end justify-between gap-3 h-full">
            {data.map((m, i) => {
              const hEntradas = max > 0 ? (m.entradas / max) * 100 : 0
              const hSaidas = max > 0 ? (m.saidas / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full">
                  <div className="flex items-end gap-1.5 w-full justify-center h-full">
                    <Bar
                      height={hEntradas}
                      color="#1D9E75"
                      hoverColor="#0F6E56"
                      tooltip={`Entradas em ${m.label}: ${formatBRL(m.entradas)}`}
                    />
                    <Bar
                      height={hSaidas}
                      color="#B8B8AF"
                      hoverColor="#8F8F86"
                      tooltip={`Saídas em ${m.label}: ${formatBRL(m.saidas)}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-caption text-sobra-ink-muted text-center px-6">
            Registre algumas entradas e saídas para ver a evolução do caixa.
          </div>
        )}
      </div>

      {/* Labels dos meses */}
      <div className="flex justify-between gap-3">
        {data.map((m, i) => (
          <div
            key={i}
            className="flex-1 text-center text-caption text-sobra-ink-muted"
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Footer: totais agregados */}
      <div className="mt-5 pt-4 border-t border-sobra-line-soft grid grid-cols-3 gap-3">
        <Stat label="Entradas" value={totalEntradas} color="text-sobra-green" />
        <Stat label="Saídas" value={totalSaidas} color="text-sobra-ink" />
        <Stat
          label="Sobra"
          value={totalSobra}
          color={totalSobra >= 0 ? 'text-sobra-green' : 'text-sobra-danger-text'}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------

function Bar({
  height,
  color,
  hoverColor,
  tooltip,
}: {
  height: number
  color: string
  hoverColor: string
  tooltip: string
}) {
  // Altura mínima visível pra pequeno valor não sumir
  const h = height > 0 ? Math.max(height, 8) : 0
  return (
    <div
      title={tooltip}
      className="w-3.5 rounded-t transition-colors cursor-default"
      style={{
        height: `${h}%`,
        backgroundColor: color,
        ['--hover' as never]: hoverColor,
      }}
      onMouseEnter={undefined /* hover via CSS abaixo */}
    />
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-caption text-sobra-ink-muted">
      <span
        className="w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-micro uppercase tracking-wider text-sobra-ink-faint">
        {label}
      </div>
      <div className={`text-body-sm font-semibold tabular-nums mt-1 ${color}`}>
        {formatBRL(value)}
      </div>
    </div>
  )
}
