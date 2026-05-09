/**
 * Lista de últimas movimentações v2.
 *
 * Premium feel: ícones por categoria, hover states, badges, melhor
 * hierarquia visual. Foi reescrita de cima a baixo.
 */
import { formatBRL, formatDateRelative } from '@/lib/utils/format'
import { CategoriaIcon } from '@/components/ui/categoria-icon'
import type { MovimentacaoListItem } from '@/lib/dashboard/queries'

interface MovementListProps {
  itens: MovimentacaoListItem[]
}

export function MovementList({ itens }: MovementListProps) {
  if (itens.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="bg-white border border-sobra-line rounded-card overflow-hidden shadow-xs">
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
        <h2 className="text-h2 font-semibold text-sobra-ink">Últimas movimentações</h2>
        <span className="text-micro uppercase tracking-wider text-sobra-ink-faint">
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </span>
      </div>
      <ul className="divide-y divide-sobra-line-soft">
        {itens.map((item) => (
          <MovementRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------

function MovementRow({ item }: { item: MovimentacaoListItem }) {
  return (
    <li className="px-5 py-3.5 flex items-center gap-3.5 transition-colors duration-150 hover:bg-sobra-surface-soft">
      <CategoriaIcon nome={item.categoria?.nome} tipo={item.tipo} size={38} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-body-sm font-medium text-sobra-ink truncate">
            {item.descricao}
          </p>
          {item.status === 'pendente' && (
            <span className="sobra-badge-warn">pendente</span>
          )}
          {item.recorrencia && (
            <span className="sobra-badge-neutral">
              🔁 {item.recorrencia}
            </span>
          )}
        </div>
        <p className="text-caption text-sobra-ink-muted truncate mt-0.5">
          {item.categoria?.nome ?? 'Sem categoria'}
          <span className="text-sobra-ink-faint mx-1.5">·</span>
          {formatDateRelative(item.data)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className={`text-body-sm font-semibold tabular-nums whitespace-nowrap ${
            item.tipo === 'entrada' ? 'text-sobra-green' : 'text-sobra-ink'
          }`}
        >
          {item.tipo === 'entrada' ? '+' : '−'} {formatBRL(item.valor)}
        </p>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-white border border-sobra-line rounded-card text-center py-12 px-5">
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-sobra-green-mist flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-body-sm font-medium text-sobra-ink">Nenhuma movimentação ainda</p>
      <p className="text-caption text-sobra-ink-muted mt-1.5 max-w-[26ch] mx-auto">
        Toque no botão verde aqui embaixo pra registrar sua primeira venda ou despesa.
      </p>
    </div>
  )
}
