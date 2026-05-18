'use client'

/**
 * Listagem + criação + edição + exclusão de categorias (briefing 4.7).
 */
import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { addCategoria, deleteCategoria, updateCategoria } from '@/lib/actions/configuracoes'
import type { TipoLancamento } from '@/types/database'

interface Categoria {
  id: string
  nome: string
  tipo: TipoLancamento
  cor: string | null
}

interface CategoriasSectionProps {
  categorias: Categoria[]
}

const PALETTE = [
  '#5DCAA5', '#0F6E56', '#9FE1CB', '#1D9E75',
  '#854F0B', '#A32D2D', '#1A1A18', '#9CA3AF',
]

export function CategoriasSection({ categorias }: CategoriasSectionProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Form de adição
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState<TipoLancamento>('entrada')
  const [novaCor, setNovaCor] = useState<string>(PALETTE[0]!)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTipo, setEditTipo] = useState<TipoLancamento>('entrada')
  const [editCor, setEditCor] = useState<string>(PALETTE[0]!)
  const [savingEdit, setSavingEdit] = useState(false)

  const entradas = categorias.filter((c) => c.tipo === 'entrada')
  const saidas = categorias.filter((c) => c.tipo === 'saida')

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setErro(null)
    const res = await addCategoria({ nome: novoNome, tipo: novoTipo, cor: novaCor })
    setSubmitting(false)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    setNovoNome('')
    startTransition(() => router.refresh())
  }

  async function onDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir a categoria "${nome}"? Lançamentos antigos ficarão sem categoria, mas não somem.`)) return
    setErro(null)
    const res = await deleteCategoria(id)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    startTransition(() => router.refresh())
  }

  function abrirEdicao(categoria: Categoria) {
    setErro(null)
    setEditando(categoria)
    setEditNome(categoria.nome)
    setEditTipo(categoria.tipo)
    setEditCor(categoria.cor ?? PALETTE[0]!)
  }

  function cancelarEdicao() {
    setEditando(null)
    setEditNome('')
    setEditTipo('entrada')
    setEditCor(PALETTE[0]!)
  }

  async function onEdit(e: FormEvent) {
    e.preventDefault()
    if (!editando || savingEdit) return
    setSavingEdit(true)
    setErro(null)
    const res = await updateCategoria({
      id: editando.id,
      nome: editNome,
      tipo: editTipo,
      cor: editCor,
    })
    setSavingEdit(false)
    if (!res.ok) {
      setErro(res.error)
      return
    }
    cancelarEdicao()
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <CategoriasGrupo titulo="Entradas" itens={entradas} onEdit={abrirEdicao} onDelete={onDelete} />
        <CategoriasGrupo titulo="Saídas" itens={saidas} onEdit={abrirEdicao} onDelete={onDelete} />
      </div>

      {editando && (
        <form onSubmit={onEdit} className="border border-sobra-line bg-sobra-bg rounded-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-sobra-ink/70">
              Editar categoria
            </p>
            <button
              type="button"
              onClick={cancelarEdicao}
              className="text-caption text-sobra-ink/50 hover:text-sobra-ink"
            >
              Cancelar
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              maxLength={60}
              required
              className="sobra-input md:flex-1"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
            />
            <select
              className="sobra-input md:w-32"
              value={editTipo}
              onChange={(e) => setEditTipo(e.target.value as TipoLancamento)}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <button type="submit" className="sobra-btn-primary md:w-auto" disabled={savingEdit || !editNome.trim()}>
              {savingEdit ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <ColorPicker value={editCor} onChange={setEditCor} />
        </form>
      )}

      <form onSubmit={onAdd} className="border-t border-sobra-line pt-4 space-y-3">
        <p className="text-caption text-sobra-ink/70">Adicionar nova categoria</p>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Ex.: Marketing"
            maxLength={60}
            required
            className="sobra-input md:flex-1"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <select
            className="sobra-input md:w-32"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value as TipoLancamento)}
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <button type="submit" className="sobra-btn-primary md:w-auto" disabled={submitting || !novoNome.trim()}>
            {submitting ? '...' : 'Adicionar'}
          </button>
        </div>

        <ColorPicker value={novaCor} onChange={setNovaCor} />

        {erro && (
          <p className="text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2">
            {erro}
          </p>
        )}
      </form>
    </div>
  )
}

function CategoriasGrupo({
  titulo,
  itens,
  onEdit,
  onDelete,
}: {
  titulo: string
  itens: Categoria[]
  onEdit: (categoria: Categoria) => void
  onDelete: (id: string, nome: string) => void
}) {
  return (
    <div>
      <h3 className="text-caption text-sobra-ink/70 uppercase tracking-wide mb-2">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-caption text-sobra-ink/50">Nenhuma categoria.</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5 py-1">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.cor || (titulo === 'Entradas' ? '#5DCAA5' : '#E8E8E3') }}
              />
              <span className="text-body text-sobra-ink flex-1 truncate">{c.nome}</span>
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="text-caption text-sobra-green hover:underline px-2"
                aria-label={`Editar ${c.nome}`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id, c.nome)}
                className="text-caption text-sobra-danger-text hover:underline px-2"
                aria-label={`Excluir ${c.nome}`}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-caption text-sobra-ink/60">Cor:</span>
      {PALETTE.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          aria-label={`Cor ${cor}`}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            value === cor ? 'border-sobra-ink scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: cor }}
        />
      ))}
    </div>
  )
}
