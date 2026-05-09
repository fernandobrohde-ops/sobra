'use client'

/**
 * Sistema de toasts global. Provider + hook `useToast` + render no canto.
 *
 * Sem deps externas. Suporta:
 *  - tone: 'info' | 'success' | 'error'
 *  - action: { label, onClick } pra "Desfazer"
 *  - auto-dismiss em 5s, mas resetado se hover
 *
 * Uso:
 *   const toast = useToast()
 *   toast.show({ title: 'Movimentação removida', action: { label: 'Desfazer', onClick: undo } })
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  /** Botão de ação inline (ex: "Desfazer") */
  action?: { label: string; onClick: () => void }
  /** Tempo em ms até desaparecer. Default 5000. */
  duration?: number
}

interface ToastItem extends ToastInput {
  id: string
}

interface ToastApi {
  show: (input: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>')
  }
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((curr) => curr.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((input: ToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: ToastItem = { ...input, id, tone: input.tone ?? 'info' }
    setItems((curr) => [...curr, toast])
    return id
  }, [])

  const api: ToastApi = { show, dismiss }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------

function ToastContainer({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none"
      role="region"
      aria-label="Notificações"
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  )
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [hover, setHover] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss; pausa no hover
  useEffect(() => {
    if (hover) {
      if (timer.current) clearTimeout(timer.current)
      return
    }
    const duration = item.duration ?? 5000
    timer.current = setTimeout(onDismiss, duration)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [hover, item.duration, onDismiss])

  const tone = TONE[item.tone ?? 'info']

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[420px] rounded-card border ${tone.border} ${tone.bg} shadow-lg p-3.5 animate-fade-in-up`}
      role="status"
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconBg} ${tone.iconText}`}>
        <ToneIcon tone={item.tone ?? 'info'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-sobra-ink">{item.title}</p>
        {item.description && (
          <p className="text-caption text-sobra-ink-muted mt-0.5">{item.description}</p>
        )}
      </div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick()
            onDismiss()
          }}
          className="text-body-sm font-semibold text-sobra-green hover:underline px-2 py-1 -my-1 -mr-1 flex-shrink-0"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="text-sobra-ink-faint hover:text-sobra-ink p-0.5 -m-0.5 flex-shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

const TONE: Record<ToastTone, { bg: string; border: string; iconBg: string; iconText: string }> = {
  info: {
    bg: 'bg-white',
    border: 'border-sobra-line',
    iconBg: 'bg-sobra-info-bg',
    iconText: 'text-sobra-info-text',
  },
  success: {
    bg: 'bg-white',
    border: 'border-sobra-green-mist',
    iconBg: 'bg-sobra-green-mist',
    iconText: 'text-sobra-green',
  },
  error: {
    bg: 'bg-white',
    border: 'border-sobra-danger-bg',
    iconBg: 'bg-sobra-danger-bg',
    iconText: 'text-sobra-danger-text',
  },
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (tone === 'success') return <svg {...common}><path d="M2.5 7.5l3 3 6-6" /></svg>
  if (tone === 'error') return <svg {...common}><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" /></svg>
  return <svg {...common}><circle cx="7" cy="7" r="5" /><path d="M7 4.5v3M7 9.5v.01" /></svg>
}
