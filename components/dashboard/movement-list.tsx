'use client'

/**
 * Lista de últimas movimentações v2.
 *
 * Premium feel: ícones por categoria, hover states, badges, melhor
 * hierarquia visual. Foi reescrita de cima a baixo.
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatBRL, formatDateRelative } from '@/lib/utils/format'
import { CategoriaIcon } from '@/components/ui/categoria-icon'
import type { MovimentacaoListItem } from '@/lib/dashboard/queries'
import {
  AddLancamentoDrawer,
  type CategoriaOpcao,
  type LancamentoInicial,
} from '@/components/lancamento/add-lancamento-drawer'
import { deleteLancamento } from '@/lib/actions/lancamento'
import { useToast } from '@/components/ui/toast'

interface MovementListProps {
  itens: MovimentacaoListItem[]
  categorias: CategoriaOpcao[]
  isPro?: boolean
}

export function MovementList({ itens, categorias, isPro = false }: MovementListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [editarItem, setEditarItem] = useState<LancamentoInicial | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const visibleItens = itens.filter((item) => !hiddenIds.has(item.id))

  if (visibleItens.length === 0) {
    return <EmptyState />
  }

  function abrirEdicao(item: MovimentacaoListItem) {
    setEditarItem({
      id: item.id,
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      status: item.status,
      categoria_id: item.categoria?.id ?? null,
      data: item.data,
      data_vencimento: item.data_vencimento,
      cliente_fornecedor: item.cliente_fornecedor,
      recorrencia: item.recorrencia,
    })
    setDrawerOpen(true)
  }

  function excluir(id: string, descricao: string) {
    setHiddenIds((curr) => new Set(curr).add(id))

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      const res = await deleteLancamento(id)
      if (!res.ok) {
        setHiddenIds((curr) => {
          const next = new Set(curr)
          next.delete(id)
          return next
        })
        toast.show({ title: 'Não consegui excluir', description: res.error, tone: 'error' })
        return
      }
      startTransition(() => router.refresh())
    }, 5000)
    pendingDeletes.current.set(id, timer)

    toast.show({
      title: 'Movimentação excluída',
      description: descricao,
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          const t = pendingDeletes.current.get(id)
          if (t) {
            clearTimeout(t)
            pendingDeletes.current.delete(id)
          }
          setHiddenIds((curr) => {
            const next = new Set(curr)
            next.delete(id)
            return next
          })
          toast.show({ title: 'Desfeito', tone: 'info', duration: 2500 })
        },
      },
    })
  }

  return (
    <>
      <div className="bg-white border border-sobra-line rounded-card overflow-hidden shadow-xs">
        <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
          <h2 className="text-h2 font-semibold text-sobra-ink">Últimas movimentações</h2>
          <span className="text-micro uppercase tracking-wider text-sobra-ink-faint">
            {visibleItens.length} {visibleItens.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <ul className="divide-y divide-sobra-line-soft">
          {visibleItens.map((item) => (
            <MovementRow
              key={item.id}
              item={item}
              onEditar={() => abrirEdicao(item)}
              onExcluir={() => excluir(item.id, item.descricao)}
            />
          ))}
        </ul>
      </div>

      <AddLancamentoDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setTimeout(() => setEditarItem(null), 200)
        }}
        categorias={categorias}
        inicial={editarItem}
        isPro={isPro}
      />
    </>
  )
}

// ---------------------------------------------------------------------

function MovementRow({
  item,
  onEditar,
  onExcluir,
}: {
  item: MovimentacaoListItem
  onEditar: () => void
  onExcluir: () => void
}) {
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
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onEditar}
            className="text-caption text-sobra-green hover:underline"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onExcluir}
            className="text-caption text-sobra-danger-text hover:underline"
          >
            Excluir
          </button>
        </div>
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
