/**
 * Dashboard (briefing 4.3) — tela principal do produto.
 *
 * Server Component que dispara as queries em paralelo e compõe os
 * blocos. Performance prevista no briefing: < 2s de carregamento, com
 * Suspense quando necessário.
 */
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData } from '@/lib/dashboard/queries'
import { getDateRange } from '@/lib/utils/period'
import { HeroCard } from '@/components/dashboard/hero-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { MovementList } from '@/components/dashboard/movement-list'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { parsePeriodParam } from './period'
import { AddLancamentoFab } from '@/components/lancamento/add-lancamento-fab'
import type { CategoriaOpcao } from '@/components/lancamento/add-lancamento-drawer'
import type { TipoLancamento } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard' }

interface DashboardPageProps {
  searchParams: { periodo?: string }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const period = parsePeriodParam(searchParams.periodo)
  const range = getDateRange(period)

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // O layout (app)/layout.tsx já redireciona se !user; aqui só assegura tipo.
  if (!user) return null

  // Dashboard + categorias do drawer em paralelo.
  const [dados, categorias] = await Promise.all([
    getDashboardData(supabase, user.id, period),
    fetchCategorias(supabase, user.id),
  ])

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-h1 font-medium text-sobra-ink">Dashboard</h1>
          <p className="text-caption text-sobra-ink/60">{range.label}</p>
        </div>
        <PeriodFilter atual={period} />
      </div>

      <HeroCard
        sobra={dados.sobra}
        faturado={dados.faturado}
        variacao={dados.variacao}
        periodoLabel={range.label}
      />

      <section className="grid grid-cols-2 gap-3 mt-5">
        <StatCard label="A receber" valor={dados.aReceber} tone="positive" />
        <StatCard label="A pagar" valor={dados.aPagar} tone="warn" />
        <StatCard label="Total entradas" valor={dados.faturado} />
        <StatCard label="Total saídas" valor={dados.totalSaidas} />
      </section>

      <section className="mt-5">
        <MovementList itens={dados.ultimasMovimentacoes} />
      </section>

      <AddLancamentoFab categorias={categorias} />
    </>
  )
}

async function fetchCategorias(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<CategoriaOpcao[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, tipo')
    .eq('user_id', userId)
    .order('nome', { ascending: true })

  if (error || !data) return []
  // Cast — placeholder de Database narrowa pra never[]; some com supabase gen types.
  const rows = data as Array<{ id: string; nome: string; tipo: TipoLancamento }>
  return rows.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))
}
