'use client'

/**
 * Lista de últimas movimentações v2.
 *
 * Premium feel: ícones por categoria, hover states, badges, melhor
 * hierarquia visual. Foi reescrita de cima a baixo.
 */
import { useRef, useState, useTransition, type PointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { formatBRL, formatDateRelative } from '@/lib/utils/format'
import { CategoriaIcon } from '@/components/ui/categoria-icon'
import { useToast } from '@/components/ui/toast'
import { deleteLancamento } from '@/lib/actions/lancamento'
import {
  AddLancamentoDrawer,
  type CategoriaOpcao,
  type LancamentoInicial,
} from '@/components/lancamento/add-lancamento-drawer'
import type { MovimentacaoListItem } from '@/lib/dashboard/queries'

interface MovementListProps {
  itens: MovimentacaoListItem[]
  categorias: CategoriaOpcao[]
}

export function MovementList({ itens, categorias }: MovementListProps) {
  const router = useRouter()
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [editarItem, setEditarItem] = useState<LancamentoInicial | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function removerMovimentacao(id: string, descricao: string) {
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
        toast.show({
          title: 'Não consegui remover',
          description: res.error,
          tone: 'error',
        })
        return
      }
      startTransition(() => router.refresh())
    }, 5000)
    pendingDeletes.current.set(id, timer)

    toast.show({
      title: 'Movimentação removida',
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
          toast.show({ title: 'Remoção desfeita', tone: 'info', duration: 2500 })
        },
      },
    })
  }

  function editarMovimentacao(item: MovimentacaoListItem) {
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

  const visibleItens = itens.filter((item) => !hiddenIds.has(item.id))

  if (visibleItens.length === 0) {
    return <EmptyState />
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
              onEditar={() => editarMovimentacao(item)}
              onRemover={() => removerMovimentacao(item.id, item.descricao)}
            />
          ))}
        </ul>
      </div>

      <AddLancamentoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categorias={categorias}
        inicial={editarItem}
      />
    </>
  )
}

// ---------------------------------------------------------------------

function MovementRow({
  item,
  onEditar,
  onRemover,
}: {
  item: MovimentacaoListItem
  onEditar: () => void
  onRemover: () => void
}) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [actionOpen, setActionOpen] = useState(false)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return
    const delta = e.clientX - startX.current
    const next = Math.min(0, Math.max(delta, -96))
    setOffset(next)
  }

  function onPointerUp() {
    if (startX.current === null) return
    const shouldOpen = offset < -44
    setActionOpen(shouldOpen)
    setOffset(shouldOpen ? -88 : 0)
    startX.current = null
  }

  return (
    <li className="relative overflow-hidden bg-white">
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <button
          type="button"
          onClick={onRemover}
          className="h-10 rounded-control bg-sobra-danger-bg px-3 text-caption font-semibold text-sobra-danger-text hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sobra-danger-text/40"
        >
          Remover
        </button>
      </div>

      <div
        className="relative bg-white px-5 py-3.5 flex items-center gap-3.5 transition-[transform,background-color] duration-150 hover:bg-sobra-surface-soft"
        style={{
          transform: `translateX(${actionOpen ? -88 : offset}px)`,
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
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

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${item.descricao}`}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sobra-ink-faint hover:text-sobra-green hover:bg-sobra-green-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-sobra-green-mid"
          >
            <EditIcon />
          </button>

          <div className="text-right">
            <p
              className={`text-body-sm font-semibold tabular-nums whitespace-nowrap ${
                item.tipo === 'entrada' ? 'text-sobra-green' : 'text-sobra-ink'
              }`}
            >
              {item.tipo === 'entrada' ? '+' : '−'} {formatBRL(item.valor)}
            </p>
            <button
              type="button"
              onClick={onRemover}
              className="hidden md:inline-block text-micro uppercase tracking-wider text-sobra-ink-faint hover:text-sobra-danger-text mt-0.5"
            >
              Remover
            </button>
          </div>
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
        Use o botão de nova movimentação para registrar sua primeira venda ou despesa.
      </p>
    </div>
  )
}

function EditIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 13.8V16h2.2L15 7.2 12.8 5 4 13.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M11.8 6 14 8.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
