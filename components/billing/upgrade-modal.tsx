'use client'

import { UpgradeCard } from './upgrade-card'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  message?: string
}

export function UpgradeModal({ open, onClose, message }: UpgradeModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full md:max-w-[480px] bg-white rounded-t-card md:rounded-card p-4 md:p-5 shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-sobra-ink/50 hover:text-sobra-ink p-1"
          aria-label="Fechar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <UpgradeCard message={message} />
      </div>
    </div>
  )
}
