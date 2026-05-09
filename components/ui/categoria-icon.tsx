/**
 * Mapeamento de categorias → ícone + cor.
 *
 * Funciona por nome normalizado da categoria (lower + sem acento). Se
 * o nome não bater com nenhum mapeamento conhecido, cai num default
 * baseado no tipo (entrada/saida). Mantém compatibilidade com qualquer
 * categoria customizada que o usuário criou.
 */
import type { TipoLancamento } from '@/types/database'

interface CategoriaIconProps {
  /** Nome da categoria (qualquer string — a gente normaliza) */
  nome: string | null | undefined
  /** Tipo pra fallback caso o nome não bata com nenhum mapping */
  tipo?: TipoLancamento
  /** Tamanho em px (default 36) */
  size?: number
  className?: string
}

interface CategoriaStyle {
  bg: string
  fg: string
  emoji: string
}

// Paleta de fundos suaves + emojis.
// Emojis funcionam mobile-first, são universais, leves, e o briefing pediu
// (🌐 Domínio, 💬 WhatsApp, 💰 Venda, 📦 Estoque, 📢 Marketing).
const STYLES = {
  green:   { bg: '#E1F5EE', fg: '#0F6E56' },
  blue:    { bg: '#E8F1FB', fg: '#1F4A7C' },
  amber:   { bg: '#FAEEDA', fg: '#854F0B' },
  red:     { bg: '#FCEBEB', fg: '#A32D2D' },
  purple:  { bg: '#EFEAFB', fg: '#4F2D8B' },
  pink:    { bg: '#FCEAF1', fg: '#8B2D5A' },
  gray:    { bg: '#F1EFE8', fg: '#4A4A47' },
  teal:    { bg: '#DCEFEC', fg: '#0E5C57' },
} as const

type StyleKey = keyof typeof STYLES

// Map por slug normalizado → estilo + emoji.
const MAP: Record<string, { palette: StyleKey; emoji: string }> = {
  // ===== ENTRADAS =====
  'venda':                 { palette: 'green',  emoji: '💰' },
  'venda produto':         { palette: 'green',  emoji: '💰' },
  'vendas':                { palette: 'green',  emoji: '💰' },
  'servico':               { palette: 'teal',   emoji: '🛠️' },
  'prestacao de servico':  { palette: 'teal',   emoji: '🛠️' },
  'pix':                   { palette: 'green',  emoji: '⚡' },
  'pix recebido':          { palette: 'green',  emoji: '⚡' },
  'recorrente':            { palette: 'purple', emoji: '🔁' },
  'receita recorrente':    { palette: 'purple', emoji: '🔁' },
  'comissao':              { palette: 'blue',   emoji: '🤝' },
  'reembolso':             { palette: 'gray',   emoji: '↩️' },
  'venda no balcao':       { palette: 'green',  emoji: '🧾' },
  'delivery':              { palette: 'amber',  emoji: '🛵' },
  'consultas':             { palette: 'teal',   emoji: '🩺' },
  'procedimentos':         { palette: 'teal',   emoji: '🏥' },
  'mensalidades':          { palette: 'purple', emoji: '📅' },
  'aulas avulsas':         { palette: 'purple', emoji: '🎓' },
  'recebimento de obra':   { palette: 'amber',  emoji: '🏗️' },
  'receitas':              { palette: 'green',  emoji: '💸' },

  // ===== SAÍDAS =====
  'marketing':             { palette: 'pink',   emoji: '📢' },
  'ferramentas':           { palette: 'blue',   emoji: '🔧' },
  'ferramenta':            { palette: 'blue',   emoji: '🔧' },
  'whatsapp':              { palette: 'green',  emoji: '💬' },
  'dominio':               { palette: 'blue',   emoji: '🌐' },
  'internet':              { palette: 'blue',   emoji: '📡' },
  'estoque':               { palette: 'amber',  emoji: '📦' },
  'funcionarios':          { palette: 'purple', emoji: '👥' },
  'mao de obra':           { palette: 'purple', emoji: '👥' },
  'impostos':              { palette: 'red',    emoji: '📑' },
  'assinaturas':           { palette: 'purple', emoji: '🔁' },
  'assinatura':            { palette: 'purple', emoji: '🔁' },
  'transporte':            { palette: 'amber',  emoji: '🚚' },
  'alimentacao':           { palette: 'amber',  emoji: '🍽️' },
  'aluguel':               { palette: 'gray',   emoji: '🏠' },
  'aluguel do espaco':     { palette: 'gray',   emoji: '🏠' },
  'frete':                 { palette: 'amber',  emoji: '🚚' },
  'materiais':             { palette: 'amber',  emoji: '🧱' },
  'material de obra':      { palette: 'amber',  emoji: '🧱' },
  'material didatico':     { palette: 'purple', emoji: '📚' },
  'embalagem':             { palette: 'amber',  emoji: '📦' },
  'ingredientes':          { palette: 'amber',  emoji: '🥬' },
  'equipamentos':          { palette: 'blue',   emoji: '🔌' },
  'plataformas':           { palette: 'purple', emoji: '💻' },
  'insumos':               { palette: 'amber',  emoji: '🧪' },
  'despesas':              { palette: 'gray',   emoji: '🧾' },
  'outros':                { palette: 'gray',   emoji: '•' },

  // Sinônimos comuns que MEIs digitam
  'aluguel da loja':       { palette: 'gray',   emoji: '🏠' },
  'salario':               { palette: 'purple', emoji: '👥' },
  'salarios':              { palette: 'purple', emoji: '👥' },
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove diacríticos
    .replace(/[^a-z0-9 ]/g, '')        // só letras+números+espaço
    .trim()
}

export function getCategoriaStyle(
  nome: string | null | undefined,
  tipo?: TipoLancamento
): CategoriaStyle {
  if (nome) {
    const key = normalizar(nome)
    const map = MAP[key]
    if (map) {
      const palette = STYLES[map.palette]
      return { bg: palette.bg, fg: palette.fg, emoji: map.emoji }
    }
    // Fallback parcial: tenta achar por palavra contida
    for (const [k, v] of Object.entries(MAP)) {
      if (key.includes(k) || k.includes(key)) {
        const palette = STYLES[v.palette]
        return { bg: palette.bg, fg: palette.fg, emoji: v.emoji }
      }
    }
  }
  // Fallback final pelo tipo
  if (tipo === 'entrada') {
    return { bg: STYLES.green.bg, fg: STYLES.green.fg, emoji: '💰' }
  }
  return { bg: STYLES.gray.bg, fg: STYLES.gray.fg, emoji: '🧾' }
}

export function CategoriaIcon({ nome, tipo, size = 36, className }: CategoriaIconProps) {
  const style = getCategoriaStyle(nome, tipo)
  const fontSize = Math.round(size * 0.5)
  return (
    <div
      className={`flex items-center justify-center rounded-lg flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size, backgroundColor: style.bg, color: style.fg, fontSize }}
      aria-hidden
    >
      <span style={{ lineHeight: 1 }}>{style.emoji}</span>
    </div>
  )
}
