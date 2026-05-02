'use client'

/**
 * Botão flutuante "+" + drawer de adicionar lançamento (briefing 4.3 + 4.4).
 *
 * Componente "shell" que controla o open/close. As categorias são passadas
 * pelo Server Component (dashboard/page.tsx) que já tem acesso ao banco.
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
        aria-label="Adicionar lançamento"
        className="fixed right-4 md:right-6 bottom-4 md:bottom-6 z-30 w-14 h-14 rounded-full bg-sobra-green text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 hover:bg-sobra-green-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-sobra-green-mid focus-visible:ring-offset-2"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>

      <AddLancamentoDrawer
        open={open}
        onClose={() => setOpen(false)}
        categorias={categorias}
      />
    </>
  )
}
