/**
 * Card menor para o grid 2x2 do dashboard (briefing 4.3):
 *   A receber | A pagar | Total entradas | Total saídas
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
    <div className="sobra-card !p-4 md:!p-5">
      <p className="text-caption text-sobra-ink/60">{label}</p>
      <p className={`text-h2 font-medium mt-1 ${TONE_CLASSES[tone]}`}>
        {formatBRL(valor)}
      </p>
      {hint && <p className="text-caption text-sobra-ink/50 mt-0.5">{hint}</p>}
    </div>
  )
}
