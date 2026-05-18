/**
 * /contas — A receber e A pagar (briefing 4.5).
 *
 * Server Component que lê ?aba=receber|pagar (default: receber), busca os
 * lançamentos pendentes daquele tipo e renderiza tabs + lista interativa.
 */
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listPendentes } from '@/lib/dashboard/queries'
import type { TipoLancamento } from '@/types/database'
import { ContasTabs } from './contas-tabs'
import { parseAbaParam, type Aba } from './aba'
import { ContasList } from './contas-list'
import type { CategoriaOpcao } from '@/components/lancamento/add-lancamento-drawer'
import { classificarVencimento, urgenciaScore } from '@/lib/utils/format'
import { getPlanoUsuario } from '@/lib/billing/plano'
import { UpgradeCard } from '@/components/billing/upgrade-card'

export const metadata: Metadata = { title: 'Contas' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ContasPageProps {
  searchParams: { aba?: string }
}

export default async function ContasPage({ searchParams }: ContasPageProps) {
  const aba: Aba = parseAbaParam(searchParams.aba)
  const tipo: TipoLancamento = aba === 'receber' ? 'entrada' : 'saida'

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [pendentes, categorias, plano] = await Promise.all([
    listPendentes(supabase, user.id, tipo),
    fetchCategorias(supabase, user.id),
    getPlanoUsuario(supabase, user.id),
  ])

  // Refinamos a ordem aqui — o banco já trouxe ordenado por data_vencimento
  // ASC, mas precisamos misturar "sem prazo" (NULLs) no final e priorizar
  // vencidos no topo. urgenciaScore garante a ordem do briefing.
  const ordenados = pendentes
    .map((p) => ({ p, score: urgenciaScore(classificarVencimento(p.data_vencimento)) }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.p)

  // Total no topo da aba — reforça o que o usuário precisa "atacar".
  const total = ordenados.reduce((sum, p) => sum + p.valor, 0)

  return (
    <>
      <div className="mb-5">
        <h1 className="text-h1 font-medium text-sobra-ink">Contas</h1>
        <p className="text-caption text-sobra-ink/60">
          Tudo o que está pendente.
        </p>
      </div>

      <ContasTabs atual={aba} />

      {plano.isFree && (
        <div className="mb-4">
          <UpgradeCard
            compact
            message="Múltiplas contas financeiras estão disponíveis no plano Pro."
          />
        </div>
      )}

      <ContasList
        itens={ordenados}
        categorias={categorias}
        total={total}
        aba={aba}
        isPro={plano.isPro}
      />
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
  // Cast porque o placeholder de Database faz o supabase-js narrowar `data`
  // pra never[] quando projetamos colunas. Some quando rodar `supabase gen types`.
  const rows = data as Array<{ id: string; nome: string; tipo: TipoLancamento }>
  return rows.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }))
}
