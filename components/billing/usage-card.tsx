interface UsageCardProps {
  isPro: boolean
  usados: number
  limite: number
}

export function UsageCard({ isPro, usados, limite }: UsageCardProps) {
  if (isPro) {
    return (
      <div className="rounded-card border border-sobra-green-soft bg-sobra-green-pale px-4 py-3 shadow-xs">
        <p className="text-caption font-medium text-sobra-green">Plano Pro</p>
        <p className="text-body-sm text-sobra-ink">Lançamentos ilimitados</p>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((usados / limite) * 100))

  return (
    <div className="rounded-card border border-sobra-line bg-white px-4 py-3 shadow-xs">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-sobra-ink-muted">Plano Free</p>
          <p className="text-body-sm text-sobra-ink">{usados} de {limite} lançamentos usados no Free</p>
        </div>
        <span className="text-caption tabular-nums text-sobra-ink-muted">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-sobra-line overflow-hidden">
        <div className="h-full rounded-full bg-sobra-green" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
