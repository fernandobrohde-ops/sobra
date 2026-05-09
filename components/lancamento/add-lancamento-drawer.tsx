'use client'

/**
 * Drawer (mobile) / modal (desktop) de lançamento (briefing 4.4 + 4.5).
 *
 * Funciona em dois modos:
 *  - "novo": chamado pelo FAB no dashboard. Sem `inicial`, dispara addLancamento.
 *  - "editar": chamado pela tela /contas. Recebe `inicial`, dispara updateLancamento.
 */
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  addLancamento,
  updateLancamento,
  type AddLancamentoInput,
  type Recorrencia,
} from '@/lib/actions/lancamento'
import type { TipoLancamento, StatusLancamento } from '@/types/database'
import { toDateOnly } from '@/lib/utils/period'

export interface CategoriaOpcao {
  id: string
  nome: string
  tipo: TipoLancamento
}

/**
 * Estado inicial para modo "editar". Campos opcionais correspondem aos
 * campos opcionais do banco.
 */
export interface LancamentoInicial {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  status: StatusLancamento
  categoria_id: string | null
  data: string
  data_vencimento: string | null
  cliente_fornecedor: string | null
  recorrencia?: Recorrencia
}

interface AddLancamentoDrawerProps {
  open: boolean
  onClose: () => void
  categorias: CategoriaOpcao[]
  /** Quando presente, o drawer entra em modo "editar". */
  inicial?: LancamentoInicial | null
}

type StatusVisual = 'concluido' | 'pendente'  // mapeia para 'pago'/'recebido' ou 'pendente'

function statusToVisual(s: StatusLancamento): StatusVisual {
  return s === 'pendente' ? 'pendente' : 'concluido'
}

/** Formata um número como string editável: 150.5 → "150,5" (BR). */
function valorToString(n: number): string {
  return Number.isFinite(n) ? String(n).replace('.', ',') : ''
}

export function AddLancamentoDrawer({
  open,
  onClose,
  categorias,
  inicial = null,
}: AddLancamentoDrawerProps) {
  const router = useRouter()
  const titleId = useId()
  const modoEditar = inicial !== null

  // Inicialização condicional dos states. Quando `inicial` muda (ou some),
  // o useEffect abaixo ressincroniza.
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valorStr, setValorStr] = useState(inicial ? valorToString(inicial.valor) : '')
  const [tipo, setTipo] = useState<TipoLancamento>(inicial?.tipo ?? 'entrada')
  const [statusVisual, setStatusVisual] = useState<StatusVisual>(
    inicial ? statusToVisual(inicial.status) : 'concluido'
  )
  const [categoriaId, setCategoriaId] = useState<string>(inicial?.categoria_id ?? '')
  const [data, setData] = useState<string>(inicial?.data ?? toDateOnly(new Date()))
  const [vencimento, setVencimento] = useState<string>(inicial?.data_vencimento ?? '')
  const [cliente, setCliente] = useState<string>(inicial?.cliente_fornecedor ?? '')
  const [recorrencia, setRecorrencia] = useState<Recorrencia>(inicial?.recorrencia ?? null)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Categorias do tipo selecionado. Quando troca tipo, reseta a categoria
  // se a atual não pertencer ao novo tipo.
  const categoriasFiltradas = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo]
  )

  useEffect(() => {
    if (categoriaId && !categoriasFiltradas.some((c) => c.id === categoriaId)) {
      setCategoriaId('')
    }
  }, [tipo, categoriasFiltradas, categoriaId])

  // ESC fecha. Bloqueia scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Quando o usuário abre o drawer com um lançamento diferente (ou troca
  // de "novo" para "editar"), ressincroniza os estados.
  useEffect(() => {
    if (!open) return
    setDescricao(inicial?.descricao ?? '')
    setValorStr(inicial ? valorToString(inicial.valor) : '')
    setTipo(inicial?.tipo ?? 'entrada')
    setStatusVisual(inicial ? statusToVisual(inicial.status) : 'concluido')
    setCategoriaId(inicial?.categoria_id ?? '')
    setData(inicial?.data ?? toDateOnly(new Date()))
    setVencimento(inicial?.data_vencimento ?? '')
    setCliente(inicial?.cliente_fornecedor ?? '')
    setRecorrencia(inicial?.recorrencia ?? null)
    setErrorMsg(null)
  }, [open, inicial])

  function reset() {
    setDescricao('')
    setValorStr('')
    setTipo('entrada')
    setStatusVisual('concluido')
    setCategoriaId('')
    setData(toDateOnly(new Date()))
    setVencimento('')
    setCliente('')
    setRecorrencia(null)
    setErrorMsg(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return

    const valor = parseValorBR(valorStr)
    if (valor == null || valor <= 0) {
      setErrorMsg('Coloca um valor maior que zero.')
      return
    }

    const status: StatusLancamento = mapStatus(statusVisual, tipo)

    const input: AddLancamentoInput = {
      descricao,
      valor,
      tipo,
      status,
      categoria_id: categoriaId || null,
      data,
      data_vencimento: status === 'pendente' && vencimento ? vencimento : null,
      cliente_fornecedor: cliente.trim() || null,
      recorrencia,
    }

    setSubmitting(true)
    setErrorMsg(null)
    const result = modoEditar && inicial
      ? await updateLancamento(inicial.id, input)
      : await addLancamento(input)
    setSubmitting(false)

    if (!result.ok) {
      setErrorMsg(result.error)
      return
    }

    if (!modoEditar) reset()  // em editar, não limpa pra evitar piscar
    onClose()
    router.refresh()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full md:max-w-[480px] bg-white md:rounded-card rounded-t-card max-h-[92vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-sobra-line flex items-center justify-between">
          <h2 id={titleId} className="text-h2 font-medium">
            {modoEditar ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sobra-ink/50 hover:text-sobra-ink p-1"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Toggle Entrada / Saída — destaque visual conforme briefing 4.4 */}
          <div
            className="grid grid-cols-2 gap-2 p-1 bg-sobra-bg rounded-control"
            role="radiogroup"
            aria-label="Tipo"
          >
            <ToggleButton
              ativo={tipo === 'entrada'}
              corAtivo="bg-sobra-green text-white"
              onClick={() => setTipo('entrada')}
              role="radio"
              aria-checked={tipo === 'entrada'}
            >
              Entrada
            </ToggleButton>
            <ToggleButton
              ativo={tipo === 'saida'}
              corAtivo="bg-sobra-ink text-white"
              onClick={() => setTipo('saida')}
              role="radio"
              aria-checked={tipo === 'saida'}
            >
              Saída
            </ToggleButton>
          </div>

          <Field label="Descrição">
            <input
              type="text"
              required
              autoFocus
              maxLength={200}
              placeholder={tipo === 'entrada' ? 'Ex.: Venda no PIX' : 'Ex.: Conta de luz'}
              className="sobra-input"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Field>

          <Field label="Valor">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-sobra-ink/50">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="0,00"
                className="sobra-input pl-10 tabular-nums"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Categoria">
            <select
              className="sobra-input"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">— sem categoria —</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>

          <Field label="Data">
            <input
              type="date"
              required
              className="sobra-input"
              value={data}
              onChange={(e) => setData(e.target.value)}
              max={toDateOnly(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))}
            />
          </Field>

          {/* Toggle de status: Pago/Recebido vs Pendente */}
          <Field label="Status">
            <div
              className="grid grid-cols-2 gap-2 p-1 bg-sobra-bg rounded-control"
              role="radiogroup"
              aria-label="Status"
            >
              <ToggleButton
                ativo={statusVisual === 'concluido'}
                corAtivo="bg-sobra-green text-white"
                onClick={() => setStatusVisual('concluido')}
                role="radio"
                aria-checked={statusVisual === 'concluido'}
              >
                {tipo === 'entrada' ? 'Recebido' : 'Pago'}
              </ToggleButton>
              <ToggleButton
                ativo={statusVisual === 'pendente'}
                corAtivo="bg-sobra-warn-text text-white"
                onClick={() => setStatusVisual('pendente')}
                role="radio"
                aria-checked={statusVisual === 'pendente'}
              >
                Pendente
              </ToggleButton>
            </div>
          </Field>

          {/* Vencimento aparece só quando o status é pendente — briefing 4.4 */}
          {statusVisual === 'pendente' && (
            <Field label="Vencimento">
              <input
                type="date"
                className="sobra-input"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Field>
          )}

          <Field label={tipo === 'entrada' ? 'Cliente (opcional)' : 'Fornecedor (opcional)'}>
            <input
              type="text"
              maxLength={120}
              placeholder={tipo === 'entrada' ? 'Nome do cliente' : 'Nome do fornecedor'}
              className="sobra-input"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />
          </Field>

          {/* Recorrência — toggle elegante. Esconde quando está em "pendente" pra
              não confundir (recorrente + pendente fica esquisito) */}
          {statusVisual === 'concluido' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption text-sobra-ink/70">
                  Movimentação recorrente
                </span>
                <Switch
                  ativo={recorrencia !== null}
                  onChange={(on) => setRecorrencia(on ? 'mensal' : null)}
                />
              </div>
              {recorrencia !== null && (
                <div className="grid grid-cols-3 gap-2 p-1 bg-sobra-bg rounded-control">
                  {(['semanal', 'mensal', 'anual'] as const).map((r) => (
                    <ToggleButton
                      key={r}
                      ativo={recorrencia === r}
                      corAtivo="bg-white text-sobra-green shadow-xs"
                      onClick={() => setRecorrencia(r)}
                      role="radio"
                      aria-checked={recorrencia === r}
                    >
                      {r === 'semanal' ? 'Semanal' : r === 'mensal' ? 'Mensal' : 'Anual'}
                    </ToggleButton>
                  ))}
                </div>
              )}
              <p className="text-caption text-sobra-ink-muted mt-1.5">
                {recorrencia
                  ? 'Vai aparecer marcada como 🔁 recorrente.'
                  : 'Marque se for um lançamento que repete (aluguel, assinatura, etc).'}
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="text-caption text-sobra-danger-text bg-sobra-danger-bg rounded-control px-3 py-2 text-center">
              {errorMsg}
            </p>
          )}

          <div className="pt-2 flex gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              className="sobra-btn-secondary flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="sobra-btn-primary flex-1"
              disabled={submitting || !descricao.trim() || !valorStr.trim()}
            >
              {submitting
                ? 'Salvando...'
                : modoEditar
                ? 'Salvar alterações'
                : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// helpers internos
// ---------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-caption text-sobra-ink/70 mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function ToggleButton({
  ativo,
  corAtivo,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ativo: boolean; corAtivo: string }) {
  return (
    <button
      type="button"
      {...rest}
      className={`px-3 py-2 rounded-[6px] text-caption font-medium transition-colors ${
        ativo ? corAtivo : 'text-sobra-ink/70 hover:bg-sobra-line/40'
      }`}
    >
      {children}
    </button>
  )
}

function Switch({ ativo, onChange }: { ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
        ativo ? 'bg-sobra-green' : 'bg-sobra-line'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          ativo ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/**
 * Aceita "1.234,56", "1234.56", "1234,56", "1234". Devolve número ou null
 * se não conseguir interpretar. Sem dependências.
 */
function parseValorBR(s: string): number | null {
  if (!s.trim()) return null
  // Remove tudo exceto dígitos, vírgula e ponto.
  const limpo = s.replace(/[^\d,.-]/g, '')
  // Sem nenhum dígito = não é número (ex: "abc" → "" → não vira 0).
  if (!/\d/.test(limpo)) return null
  // Se tem vírgula e ponto: vírgula é decimal, ponto é milhar.
  // Se só tem vírgula: vírgula é decimal.
  // Se só tem ponto: pode ser decimal (ex: 12.50) ou milhar (1.234) — desambigua
  // pela posição (3 dígitos depois do último ponto = milhar).
  let normalizado: string
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (limpo.includes('.')) {
    const partes = limpo.split('.')
    const ultima = partes[partes.length - 1]!
    if (partes.length > 1 && ultima.length === 3) {
      // 1.234 → milhar, sem decimal
      normalizado = limpo.replace(/\./g, '')
    } else {
      normalizado = limpo
    }
  } else {
    normalizado = limpo
  }
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : null
}

function mapStatus(visual: StatusVisual, tipo: TipoLancamento): StatusLancamento {
  if (visual === 'pendente') return 'pendente'
  return tipo === 'entrada' ? 'recebido' : 'pago'
}
