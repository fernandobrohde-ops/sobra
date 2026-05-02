/**
 * Lista de últimas movimentações no dashboard (briefing 4.3).
 * Inclui empty state, vital pra primeira sessão depois do onboarding.
 */
import { formatBRL, formatDateRelative } from '@/lib/utils/format'
import type { MovimentacaoListItem } from '@/lib/dashboard/queries'

interface MovementListProps {
  itens: MovimentacaoListItem[]
}

export function MovementList({ itens }: MovementListProps) {
  if (itens.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="sobra-card !p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
        <h2 className="text-h2 font-medium text-sobra-ink">Últimas movimentações</h2>
      </div>
      <ul className="divide-y divide-sobra-line">
        {itens.map((item) => (
          <li key={item.id} className="px-5 py-3.5 flex items-center gap-3">
            <CategoryDot cor={item.categoria?.cor} tipo={item.tipo} />
            <div className="flex-1 min-w-0">
              <p className="text-body text-sobra-ink truncate">{item.descricao}</p>
              <p className="text-caption text-sobra-ink/60 truncate">
                {item.categoria?.nome ?? 'Sem categoria'} · {formatDateRelative(item.data)}
                {item.status === 'pendente' && (
                  <> · <span className="text-sobra-warn-text">pendente</span></>
                )}
              </p>
            </div>
            <div
              className={`text-body font-medium tabular-nums whitespace-nowrap ${
                item.tipo === 'entrada' ? 'text-sobra-green' : 'text-sobra-ink'
              }`}
            >
              {item.tipo === 'entrada' ? '+' : '−'} {formatBRL(item.valor)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CategoryDot({
  cor,
  tipo,
}: {
  cor: string | null | undefined
  tipo: 'entrada' | 'saida'
}) {
  // Se a categoria tem cor própria, usa. Caso contrário, fallback por tipo.
  const fallback = tipo === 'entrada' ? '#5DCAA5' : '#E8E8E3'
  return (
    <span
      aria-hidden
      className="block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: cor || fallback }}
    />
  )
}

function EmptyState() {
  return (
    <div className="sobra-card text-center py-10">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-sobra-green-mist flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-body text-sobra-ink font-medium">Nenhuma movimentação ainda</p>
      <p className="text-caption text-sobra-ink/60 mt-1">
        Toque no botão <span className="text-sobra-green">+</span> aqui embaixo para
        registrar sua primeira venda ou despesa.
      </p>
    </div>
  )
}
