/**
 * Card menor do grid 2x2 do dashboard v2.
 *
 * Premium: borda fina, hover sutil, label uppercase tracking.
 */
import { formatBRL } from '@/lib/utils/format'

type Tone = 'neutral' | 'positive' | 'negative' | 'warn'

interface StatCardProps {
  label: string
  valor: number
  tone?: Tone
  hint?: string
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'text-sobra-ink',
  positive: 'text-sobra-green',
  negative: 'text-sobra-danger-text',
  warn: 'text-sobra-warn-text',
}

export function StatCard({ label, valor, tone = 'neutral', hint }: StatCardProps) {
  return (
    <div className="group bg-white border border-sobra-line rounded-card p-4 md:p-5 shadow-xs transition-all duration-200 hover:shadow-sm hover:border-sobra-line-soft">
      <p className="text-micro uppercase tracking-wider text-sobra-ink-faint">{label}</p>
      <p
        className={`text-h2 font-semibold mt-1.5 tabular-nums transition-transform duration-200 group-hover:translate-x-0.5 ${TONE_CLASSES[tone]}`}
      >
        {formatBRL(valor)}
      </p>
      {hint && <p className="text-caption text-sobra-ink-muted mt-1">{hint}</p>}
    </div>
  )
}
