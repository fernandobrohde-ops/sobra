/**
 * Layout das páginas autenticadas (route group `(app)`).
 *
 * Faz:
 *  1. Garante que o usuário está logado (defensivo, redundante com o middleware).
 *  2. Carrega o profile. Se não existir, manda para /onboarding (caminho
 *     defensivo — o callback já trata, mas evita estado inconsistente
 *     se alguém deletar o profile manualmente).
 *  3. Renderiza a Navbar e o conteúdo da rota filho.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { ToastProvider } from '@/components/ui/toast'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome_negocio')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const iniciais = pegarIniciais(profile.nome_negocio)

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-sobra-bg">
        <Navbar iniciais={iniciais} />
        <div className="flex-1">
          <div className="max-w-[960px] mx-auto px-4 pt-6 pb-28 md:py-8">{children}</div>
        </div>
      </div>
    </ToastProvider>
  )
}

/** "Padaria do João" → "PJ"; "Sobra" → "S". */
function pegarIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 0 && !STOPWORDS.has(p.toLowerCase()))
  if (partes.length === 0) return '·'
  if (partes.length === 1) return partes[0]!.charAt(0).toUpperCase()
  return (partes[0]!.charAt(0) + partes[partes.length - 1]!.charAt(0)).toUpperCase()
}

// Evita pegar preposições como inicial.
const STOPWORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
