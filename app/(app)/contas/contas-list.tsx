'use client'

/**
 * Lista interativa da tela /contas (briefing 4.5).
 *
 * Cada item exibe descrição, valor, status do vencimento (badge) e um menu
 * com 3 ações: Marcar como pago, Editar, Excluir.
 *
 * Edição reabre o `AddLancamentoDrawer` em modo "editar".
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  markLancamentoConcluido,
  deleteLancamento,
} from '@/lib/actions/lancamento'
import {
  AddLancamentoDrawer,
  type CategoriaOpcao,
  type LancamentoInicial,
} from '@/components/lancamento/add-lancamento-drawer'
import {
  formatBRL,
  formatDateShort,
  classificarVencimento,
  labelVencimento,
  type VencimentoStatus,
} from '@/lib/utils/format'
import type { PendenteListItem } from '@/lib/dashboard/queries'
import type { Aba } from './aba'

interface ContasListProps {
  itens: PendenteListItem[]
  categorias: CategoriaOpcao[]
  total: number
  aba: Aba
}

export function ContasList({ itens, categorias, total, aba }: ContasListProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Estado local para overlay de "ação em andamento" — evita cliques duplos.
  const [acaoEmId, setAcaoEmId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Drawer de edição
  const [editarItem, setEditarItem] = useState<LancamentoInicial | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function marcarComoConcluido(id: string) {
    setAcaoEmId(id)
    setErro(null)
    const res = await markLancamentoConcluido(id)
    setAcaoEmId(null)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    startTransition(() => router.refresh())
  }

  async function excluir(id: string) {
    if (!window.confirm('Excluir esse lançamento? Essa ação não tem volta.')) return
    setAcaoEmId(id)
    setErro(null)
    const res = await deleteLancamento(id)
    setAcaoEmId(null)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    startTransition(() => router.refresh())
  }

  function abrirEdicao(item: PendenteListItem) {
    setEditarItem({
      id: item.id,
      descricao: item.descricao,
      valor: item.valor,
      tipo: item.tipo,
      status: 'pendente',
      categoria_id: item.categoria?.id ?? null,
      data: item.data,
      data_vencimento: item.data_vencimento,
      cliente_fornecedor: item.cliente_fornecedor,
    })
    setDrawerOpen(true)
  }

  if (itens.length === 0) {
    return (
      <EmptyState aba={aba} />
    )
  }

  return (
    <>
      {/* Total no topo dá direção: o usuário entende o "tamanho da fila". */}
      <div className="sobra-card !p-4 md:!p-5 mb-4 flex items-baseline justify-between">
        <span className="text-caption text-sobra-ink/60">
          Total {aba === 'receber' ? 'a receber' : 'a pagar'}
        </span>
        <span className={`text-h2 font-medium tabular-nums ${
          aba === 'receber' ? 'text-sobra-green' : 'text-sobra-warn-text'
        }`}>
          {formatBRL(total)}
        </span>
      </div>

      <ul className="space-y-2.5">
        {itens.map((item) => {
          const venc = classificarVencimento(item.data_vencimento)
          const ocupado = acaoEmId === item.id || pending
          return (
            <li key={item.id}>
              <ContaItem
                item={item}
                vencimento={venc}
                ocupado={ocupado}
                onMarcar={() => marcarComoConcluido(item.id)}
                onEditar={() => abrirEdicao(item)}
                onExcluir={() => excluir(item.id)}
              />
            </li>
          )
        })}
      </ul>

      {erro && (
        <p className="mt-4 text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center">
          {erro}
        </p>
      )}

      <AddLancamentoDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          // Limpa o item depois de uma transição curta pra não piscar
          // o título mudando de volta enquanto fecha.
          setTimeout(() => setEditarItem(null), 200)
        }}
        categorias={categorias}
        inicial={editarItem}
      />
    </>
  )
}

// ---------------------------------------------------------------------

interface ContaItemProps {
  item: PendenteListItem
  vencimento: VencimentoStatus
  ocupado: boolean
  onMarcar: () => void
  onEditar: () => void
  onExcluir: () => void
}

function ContaItem({ item, vencimento, ocupado, onMarcar, onEditar, onExcluir }: ContaItemProps) {
  return (
    <div className="sobra-card !p-4">
      <div className="flex items-start gap-3">
        <CategoryDot cor={item.categoria?.cor} tipo={item.tipo} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-body text-sobra-ink font-medium truncate min-w-0">
              {item.descricao}
            </p>
            <span className="tabular-nums text-body font-medium ml-auto whitespace-nowrap">
              {formatBRL(item.valor)}
            </span>
          </div>
          <p className="text-caption text-sobra-ink/60 mt-0.5 truncate">
            {item.categoria?.nome ?? 'Sem categoria'}
            {item.cliente_fornecedor ? ` · ${item.cliente_fornecedor}` : ''}
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            <VencimentoBadge venc={vencimento} dataIso={item.data_vencimento} />
            <ActionMenu
              ocupado={ocupado}
              onMarcar={onMarcar}
              onEditar={onEditar}
              onExcluir={onExcluir}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryDot({ cor, tipo }: { cor: string | null | undefined; tipo: 'entrada' | 'saida' }) {
  const fallback = tipo === 'entrada' ? '#5DCAA5' : '#E8E8E3'
  return (
    <span
      aria-hidden
      className="block w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0"
      style={{ backgroundColor: cor || fallback }}
    />
  )
}

function VencimentoBadge({
  venc,
  dataIso,
}: {
  venc: VencimentoStatus
  dataIso: string | null
}) {
  const cls =
    venc.tipo === 'vencido'
      ? 'sobra-badge-negative'
      : venc.tipo === 'hoje'
      ? 'sobra-badge-warn'
      : venc.tipo === 'futuro'
      ? 'sobra-badge-positive'
      : 'sobra-badge-positive opacity-60'

  return (
    <span className="inline-flex items-baseline gap-2 text-caption">
      <span className={cls}>{labelVencimento(venc)}</span>
      {dataIso && (
        <span className="text-sobra-ink/50">{formatDateShort(dataIso)}</span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------

function ActionMenu({
  ocupado,
  onMarcar,
  onEditar,
  onExcluir,
}: {
  ocupado: boolean
  onMarcar: () => void
  onEditar: () => void
  onExcluir: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative ml-auto flex items-center gap-1.5">
      <button
        type="button"
        onClick={onMarcar}
        disabled={ocupado}
        className="text-caption font-medium text-sobra-green hover:underline disabled:opacity-50 px-2 py-1"
      >
        Marcar como pago
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={ocupado}
        aria-label="Mais ações"
        className="w-7 h-7 rounded-control text-sobra-ink/60 hover:bg-sobra-bg disabled:opacity-50 flex items-center justify-center"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
            tabIndex={-1}
          />
          <div className="absolute right-0 top-9 w-44 bg-white border border-sobra-line rounded-card shadow-lg p-1.5 z-50">
            <MenuItem onClick={() => { setOpen(false); onEditar() }}>
              Editar
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); onExcluir() }} danger>
              Excluir
            </MenuItem>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 text-body rounded-control hover:bg-sobra-bg ${
        danger ? 'text-sobra-danger-text' : 'text-sobra-ink'
      }`}
      role="menuitem"
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------

function EmptyState({ aba }: { aba: Aba }) {
  return (
    <div className="sobra-card text-center py-12">
      <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-sobra-green-mist flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12l5 5L20 7" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-body text-sobra-ink font-medium">
        Sem nada {aba === 'receber' ? 'a receber' : 'a pagar'} pendente
      </p>
      <p className="text-caption text-sobra-ink/60 mt-1">
        Você está em dia. Boa.
      </p>
    </div>
  )
}
