import type { Metadata, Viewport } from 'next'
import { DM_Sans, Lora } from 'next/font/google'
import './globals.css'

// DM Sans → interface (weights do briefing: 300, 400, 500)
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Lora → display/logo (weights 400 e 500, com itálico)
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500'],
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
    <html lang="pt-BR" className={`${dmSans.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-sobra-bg text-sobra-ink antialiased">
        {children}
      </body>
    </html>
  )
}
