/**
 * GET /api/relatorio/pdf?mes=YYYY-MM
 *
 * Gera o PDF do relatório do mês solicitado e devolve com
 * Content-Type: application/pdf. Acionado pelo botão "Exportar PDF" da
 * tela /relatorio.
 *
 * Roda no Node runtime (não Edge) porque @react-pdf/renderer usa APIs
 * que não rodam em Edge.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getRelatorioMes } from '@/lib/dashboard/queries'
import { RelatorioPDF } from '@/components/relatorio/relatorio-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const mesParam = request.nextUrl.searchParams.get('mes')
  const { mes, ano } = parseMes(mesParam)

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const [profileRes, dados] = await Promise.all([
    supabase.from('profiles').select('nome_negocio').eq('id', user.id).single(),
    getRelatorioMes(supabase, user.id, mes, ano),
  ])

  const nomeNegocio = profileRes.data?.nome_negocio ?? 'Seu negócio'
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // renderToBuffer aceita um React Element. Usamos createElement diretamente
  // para evitar configurar JSX nesta route handler.
  const buffer = await renderToBuffer(
    <RelatorioPDF data={dados} nomeNegocio={nomeNegocio} geradoEm={geradoEm} />
  )

  const filename = `sobra-relatorio-${ano}-${String(mes).padStart(2, '0')}.pdf`

  // Convert Node Buffer to Uint8Array para satisfazer o tipo BodyInit
  // de NextResponse (Buffer estende Uint8Array, mas o TS é estrito aqui).
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // inline = abre no navegador em nova aba; troque por attachment se
      // quiser forçar download.
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

function parseMes(raw: string | null): { mes: number; ano: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [anoStr, mesStr] = raw.split('-')
    const mes = Number(mesStr)
    const ano = Number(anoStr)
    if (mes >= 1 && mes <= 12 && ano >= 2000 && ano <= 2100) {
      return { mes, ano }
    }
  }
  const hoje = new Date()
  return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() }
}
