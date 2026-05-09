/**
 * Insights do mês — seção que parece um assistente financeiro.
 *
 * Recebe insights pré-gerados do server. Renderiza 3 cards minimalistas
 * com ícone discreto, título e texto curto. Visual referência: Linear
 * "What's new" / Stripe Insights / Mercury suggestions.
 */
import type { Insight, InsightIcon, InsightTone } from '@/lib/dashboard/insights'

interface InsightsSectionProps {
  insights: Insight[]
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  if (insights.length === 0) return null

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-h2 font-semibold text-sobra-ink">Insights do mês</h2>
        <span className="text-micro uppercase tracking-wider text-sobra-ink-faint">
          atualizado agora
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <InsightCard key={insight.id} insight={insight} delay={i * 60} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------

function InsightCard({ insight, delay }: { insight: Insight; delay: number }) {
  const tone = TONE_STYLES[insight.tone]

  return (
    <div
      className="group relative bg-white border border-sobra-line rounded-card p-4 transition-all duration-200 hover:shadow-sm hover:border-sobra-line-soft animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Borda lateral colorida sutil pra dar identidade */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r ${tone.accent}`}
        aria-hidden
      />

      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.iconBg} ${tone.iconText}`}>
          <InsightIconSvg icon={insight.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-body-sm font-semibold text-sobra-ink leading-snug">
            {insight.title}
          </h3>
          <p className="text-caption text-sobra-ink-muted leading-relaxed mt-1">
            {insight.text}
          </p>
        </div>
      </div>
    </div>
  )
}

const TONE_STYLES: Record<InsightTone, { iconBg: string; iconText: string; accent: string }> = {
  positive: {
    iconBg: 'bg-sobra-green-mist',
    iconText: 'text-sobra-green',
    accent: 'bg-sobra-green-accent',
  },
  negative: {
    iconBg: 'bg-sobra-danger-bg',
    iconText: 'text-sobra-danger-text',
    accent: 'bg-sobra-danger',
  },
  warning: {
    iconBg: 'bg-sobra-warn-bg',
    iconText: 'text-sobra-warn-text',
    accent: 'bg-sobra-warn',
  },
  neutral: {
    iconBg: 'bg-sobra-line/40',
    iconText: 'text-sobra-ink-soft',
    accent: 'bg-sobra-line',
  },
}

// ---------------------------------------------------------------------
// Ícones — SVGs inline pra não depender de lib externa
// ---------------------------------------------------------------------
function InsightIconSvg({ icon }: { icon: InsightIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (icon) {
    case 'trend-up':
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </svg>
      )
    case 'trend-down':
      return (
        <svg {...common}>
          <path d="M3 7l6 6 4-4 8 8" />
          <path d="M14 17h7v-7" />
        </svg>
      )
    case 'spotlight':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
        </svg>
      )
    case 'split':
      return (
        <svg {...common}>
          <path d="M12 4v6" />
          <path d="M5 20l7-10 7 10" />
        </svg>
      )
    case 'percent':
      return (
        <svg {...common}>
          <line x1="19" y1="5" x2="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
          <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z" />
        </svg>
      )
    case 'wave':
      return (
        <svg {...common}>
          <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
  }
}
