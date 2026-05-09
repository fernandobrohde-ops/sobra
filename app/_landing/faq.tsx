'use client'

/**
 * FAQ accordion da landing.
 *
 * Recebe a lista de perguntas e respostas como props (definidas no
 * server component da page). O estado de qual está aberta vive aqui.
 */
import { useState } from 'react'

export interface FaqItem {
  q: string
  a: string
}

interface FaqProps {
  itens: FaqItem[]
}

export function Faq({ itens }: FaqProps) {
  const [aberto, setAberto] = useState<number | null>(null)

  return (
    <>
      {itens.map((item, i) => {
        const isOpen = aberto === i
        return (
          <div
            key={i}
            className={`faq-item ${isOpen ? 'open' : ''}`}
            onClick={() => setAberto(isOpen ? null : i)}
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setAberto(isOpen ? null : i)
              }
            }}
          >
            <div className="faq-q">
              {item.q}
              <div className="faq-icon" aria-hidden>+</div>
            </div>
            <div className="faq-a">{item.a}</div>
          </div>
        )
      })}
    </>
  )
}
