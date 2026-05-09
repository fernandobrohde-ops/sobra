import type { Config } from 'tailwindcss'

/**
 * Tokens de design do Sobra v2.
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
        // Verdes da marca (escala completa)
        'sobra-green': {
          DEFAULT: '#0F6E56',
          dark:    '#0d5f49',
          mid:     '#1D9E75',
          accent:  '#5DCAA5',
          soft:    '#9FE1CB',
          mist:    '#E1F5EE',
          pale:    '#F4FAF7',
        },
        // Neutros expandidos pra hierarquia rica
        'sobra-bg':         '#F5F5F2',
        'sobra-surface':    '#FFFFFF',
        'sobra-surface-soft': '#FAFAF8',
        'sobra-ink':        '#1A1A18',
        'sobra-ink-soft':   '#4A4A47',
        'sobra-ink-muted':  '#6B6B68',
        'sobra-ink-faint':  '#9C9C99',
        'sobra-line':       '#E8E8E3',
        'sobra-line-soft':  '#F1EFE8',
        // Feedback
        'sobra-danger': {
          DEFAULT: '#D94040',
          bg:      '#FCEBEB',
          text:    '#A32D2D',
        },
        'sobra-warn': {
          DEFAULT: '#BA7517',
          bg:      '#FAEEDA',
          text:    '#854F0B',
        },
        'sobra-info': {
          bg:      '#E8F1FB',
          text:    '#1F4A7C',
        },
      },
      fontFamily: {
        // Inter pra interface (estilo Linear/Stripe), Lora pra display
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-lora)', 'serif'],
      },
      fontSize: {
        // Escala expandida com hierarquia mais rica
        'display-xl': ['44px', { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '500' }],
        'display':    ['32px', { lineHeight: '1.1',  letterSpacing: '-0.02em',  fontWeight: '500' }],
        'h1':         ['24px', { lineHeight: '1.25', letterSpacing: '-0.01em',  fontWeight: '600' }],
        'h2':         ['20px', { lineHeight: '1.3',  letterSpacing: '-0.005em', fontWeight: '600' }],
        'h3':         ['16px', { lineHeight: '1.4',                              fontWeight: '600' }],
        'body':       ['15px', { lineHeight: '1.5',                              fontWeight: '400' }],
        'body-sm':    ['14px', { lineHeight: '1.5',                              fontWeight: '400' }],
        'caption':    ['13px', { lineHeight: '1.45',                             fontWeight: '400' }],
        'micro':      ['11px', { lineHeight: '1.4',  letterSpacing: '0.04em',    fontWeight: '500' }],
      },
      borderRadius: {
        'card':    '14px',
        'card-lg': '20px',
        'control': '10px',
      },
      boxShadow: {
        'xs':    '0 1px 2px rgba(15, 23, 18, 0.04)',
        'card':  '0 1px 2px rgba(15, 23, 18, 0.04)',
        'sm':    '0 2px 6px rgba(15, 23, 18, 0.05), 0 1px 2px rgba(15, 23, 18, 0.04)',
        'md':    '0 8px 24px rgba(15, 23, 18, 0.06), 0 2px 6px rgba(15, 23, 18, 0.04)',
        'lg':    '0 16px 48px rgba(15, 23, 18, 0.08), 0 4px 12px rgba(15, 23, 18, 0.05)',
        'hero':  '0 24px 64px rgba(15, 110, 86, 0.18), 0 8px 24px rgba(15, 110, 86, 0.10)',
        'fab':   '0 12px 32px rgba(15, 110, 86, 0.32), 0 4px 12px rgba(15, 110, 86, 0.20)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo':  'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    },
  },
  plugins: [],
}

export default config
