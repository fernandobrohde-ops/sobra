import type { Metadata, Viewport } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'

// Inter → interface principal (referência de SaaS premium: Linear, Stripe, Ramp).
// Carrega vários pesos pra ter hierarquia rica nos cards e tipografia sutil.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

// Lora → display/logo, usado em hero, valores grandes, headlines emocionais.
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Sobra — controle financeiro pra MEI',
    template: '%s · Sobra',
  },
  description:
    'Dashboard financeiro simples para MEI e ME. Sem jargão contábil, com alertas no WhatsApp.',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F6E56',
  // Mobile first: o briefing destaca 375px como largura mínima de teste.
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-sobra-bg text-sobra-ink antialiased">
        {children}
      </body>
    </html>
  )
}
