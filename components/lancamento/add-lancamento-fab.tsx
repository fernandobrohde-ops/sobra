'use client'

/**
 * FAB (botão flutuante) v2 — premium feel.
 *
 * Comportamento:
 *  - Mobile: redondo só com "+", grande e óbvio
 *  - Desktop: expande no hover mostrando "Nova movimentação"
 *  - Sombra premium em camadas (var(--shadow-fab))
 *  - Active scale + ring de foco acessível
 *  - Suaves transições com easing customizado
 */
import { useState } from 'react'
import { AddLancamentoDrawer, type CategoriaOpcao } from './add-lancamento-drawer'

interface AddLancamentoFabProps {
  categorias: CategoriaOpcao[]
}

export function AddLancamentoFab({ categorias }: AddLancamentoFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Nova movimentação"
        className="
          fixed right-4 md:right-6 bottom-4 md:bottom-6 z-30
          group flex items-center gap-2.5
          h-14 pl-4 pr-4 md:pr-5
          rounded-full
          bg-sobra-green text-white
          shadow-fab
          transition-all duration-300 ease-out-expo
          hover:bg-sobra-green-dark hover:shadow-lg
          active:scale-[0.97]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sobra-green-mid focus-visible:ring-offset-2
          md:hover:pr-6
        "
      >
        {/* Halo sutil pulsante atrás */}
        <span
          className="absolute inset-0 rounded-full bg-sobra-green-accent/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden
        />

        {/* Ícone + */}
        <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/12 transition-transform duration-300 group-hover:rotate-90">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>

        {/* Label visível no desktop, oculta no mobile */}
        <span className="relative hidden md:inline text-body-sm font-medium whitespace-nowrap">
          Nova movimentação
        </span>
      </button>

      <AddLancamentoDrawer
        open={open}
        onClose={() => setOpen(false)}
        categorias={categorias}
      />
    </>
  )
}
