import type { Config } from 'tailwindcss'

/**
 * Tokens de design do Sobra — extraídos da seção 6 do briefing.
 * Mantenha em sincronia com app/globals.css (variáveis CSS).
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Verdes da marca
        'sobra-green': {
          DEFAULT: '#0F6E56',  // primário (botões, hero card)
          dark: '#0d5f49',     // hover do primário
          mid: '#1D9E75',      // focus de inputs
          accent: '#5DCAA5',   // barras do gráfico
          soft: '#9FE1CB',     // barras do gráfico
          mist: '#E1F5EE',     // badge positivo / barras
        },
        // Neutros
        'sobra-bg': '#F5F5F2',     // fundo off-white
        'sobra-ink': '#1A1A18',    // texto principal
        'sobra-line': '#E8E8E3',   // bordas
        // Feedback
        'sobra-danger': {
          bg: '#FCEBEB',
          text: '#A32D2D',
        },
        'sobra-warn': {
          bg: '#FAEEDA',
          text: '#854F0B',
        },
      },
      fontFamily: {
        // Lora (display/logo) e DM Sans (interface) carregadas via next/font em app/layout.tsx
        display: ['var(--font-lora)', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala do briefing
        'display': ['32px', { lineHeight: '1.2', fontWeight: '500' }],
        'h1': ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        'h2': ['20px', { lineHeight: '1.35', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        // Cards, botões, inputs
        'card': '14px',
        'control': '10px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(15, 110, 86, 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
