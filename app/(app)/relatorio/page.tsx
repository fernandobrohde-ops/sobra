/**
 * Relatório — DRE simplificada por mês (briefing 4.6).
 *
 * Server Component que lê ?mes=YYYY-MM (default: mês atual), busca os
 * dados via getRelatorioMes e renderiza:
 *  - Seletor de mês/ano
 *  - DRE simplificada (Receita | Custos | Lucro | Margem)
 *  - Breakdown por categoria
 *  - Botão Exportar PDF (chama /api/relatorio/pdf?mes=YYYY-MM)
 */
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getRelatorioMes } from '@/lib/dashboard/queries'
import { formatBRL, formatPercent } from '@/lib/utils/format'
import { MesSelector } from './mes-selector'
import { parseMesParam } from './mes'

export const metadata: Metadata = { title: 'Relatório' }

interface RelatorioPageProps {
  searchParams: { mes?: string }
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default async function RelatorioPage({ searchParams }: RelatorioPageProps) {
  const { mes, ano } = parseMesParam(searchParams.mes)

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const dados = await getRelatorioMes(supabase, user.id, mes, ano)
  const entradas = dados.breakdown.filter((b) => b.tipo === 'entrada')
  const saidas = dados.breakdown.filter((b) => b.tipo === 'saida')

  const mesLabel = `${NOMES_MES[mes - 1]} de ${ano}`
  const pdfUrl = `/api/relatorio/pdf?mes=${ano}-${String(mes).padStart(2, '0')}`

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-h1 font-medium text-sobra-ink">Relatório</h1>
          <p className="text-caption text-sobra-ink/60">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <MesSelector mesAtual={mes} anoAtual={ano} />
          <a
            href={pdfUrl}
            className="sobra-btn-primary !py-2"
            target="_blank"
            rel="noopener"
          >
            Exportar PDF
          </a>
        </div>
      </div>

      {/* DRE simplificada */}
      <div className="sobra-card mb-4">
        <h2 className="text-h2 font-medium mb-4">DRE simplificada</h2>
        <div className="space-y-2">
          <DreLinha label="Receita bruta" valor={dados.receitaBruta} />
          <DreLinha label="(−) Custos e despesas" valor={dados.custos} negativo />
          <DreLinha
            label="(=) Lucro líquido"
            valor={dados.lucroLiquido}
            destaque
            tipo={dados.lucroLiquido >= 0 ? 'positive' : 'negative'}
          />
          <div className="border-t border-sobra-line pt-2 mt-2 flex justify-between items-baseline">
            <span className="text-body text-sobra-ink/70">Margem</span>
            <span className="text-h2 font-medium tabular-nums">
              {formatPercent(dados.margem, 1)}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown por categoria */}
      <div className="grid md:grid-cols-2 gap-4">
        <CategoriaTabela
          titulo="Entradas por categoria"
          itens={entradas}
          total={dados.receitaBruta}
          tipo="entrada"
        />
        <CategoriaTabela
          titulo="Saídas por categoria"
          itens={saidas}
          total={dados.custos}
          tipo="saida"
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------

function DreLinha({
  label,
  valor,
  negativo = false,
  destaque = false,
  tipo = 'neutral',
}: {
  label: string
  valor: number
  negativo?: boolean
  destaque?: boolean
  tipo?: 'positive' | 'negative' | 'neutral'
}) {
  const color =
    tipo === 'positive' ? 'text-sobra-green' : tipo === 'negative' ? 'text-sobra-danger-text' : 'text-sobra-ink'

  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-body ${destaque ? 'font-medium' : 'text-sobra-ink/70'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${destaque ? 'text-h2 font-medium ' + color : 'text-body'}`}>
        {negativo ? '− ' : ''}{formatBRL(valor)}
      </span>
    </div>
  )
}

interface CategoriaTabelaItem {
  nome: string
  cor: string | null
  total: number
  qtd: number
}

function CategoriaTabela({
  titulo,
  itens,
  total,
  tipo,
}: {
  titulo: string
  itens: CategoriaTabelaItem[]
  total: number
  tipo: 'entrada' | 'saida'
}) {
  if (itens.length === 0) {
    return (
      <div className="sobra-card">
        <h3 className="text-h2 font-medium mb-3">{titulo}</h3>
        <p className="text-caption text-sobra-ink/60">Nada por aqui esse mês.</p>
      </div>
    )
  }

  return (
    <div className="sobra-card">
      <h3 className="text-h2 font-medium mb-3">{titulo}</h3>
      <ul className="divide-y divide-sobra-line">
        {itens.map((b) => {
          const pct = total > 0 ? (b.total / total) * 100 : 0
          return (
            <li key={b.nome} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between mb-1">
                <span className="flex items-center gap-2 text-body text-sobra-ink truncate min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: b.cor || (tipo === 'entrada' ? '#5DCAA5' : '#E8E8E3') }}
                  />
                  <span className="truncate">{b.nome}</span>
                </span>
                <span className="text-body font-medium tabular-nums whitespace-nowrap">
                  {formatBRL(b.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-sobra-line rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tipo === 'entrada' ? 'bg-sobra-green' : 'bg-sobra-warn-text'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="text-caption text-sobra-ink/60 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
