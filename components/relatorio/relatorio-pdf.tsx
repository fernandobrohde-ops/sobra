/**
 * Documento PDF do relatório (briefing 4.6).
 *
 * Renderizado pelo route handler /api/relatorio/pdf usando @react-pdf/renderer.
 * Mantém o branding do Sobra: paleta verde, tipografia hierarquizada,
 * rodapé "Relatório gerado pelo Sobra — sobra.app".
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
} from '@react-pdf/renderer'
import type { RelatorioMes } from '@/lib/dashboard/queries'

// ---------------------------------------------------------------------
// Helpers de formatação (não usamos lib/utils/format pra evitar
// importar Intl em alguns runtimes do PDF — implementação pequena).
// ---------------------------------------------------------------------

function formatBRL(n: number): string {
  const fixed = Math.abs(n).toFixed(2).replace('.', ',')
  const [int, frac] = fixed.split(',')
  const withSep = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '−' : ''}R$ ${withSep},${frac}`
}

function formatPercent(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const r = n.toFixed(digits)
  const v = Number(r)
  return v > 0 ? `+${r}%` : `${r}%`
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ---------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------

const cores = {
  green:    '#0F6E56',
  greenAcc: '#5DCAA5',
  greenSft: '#9FE1CB',
  greenMst: '#E1F5EE',
  bg:       '#F5F5F2',
  ink:      '#1A1A18',
  line:     '#E8E8E3',
  inkSoft:  '#666661',
  danger:   '#A32D2D',
  warn:     '#854F0B',
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: cores.ink,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontFamily: 'Times-Italic',
    color: cores.ink,
  },
  spacer: { flexGrow: 1 },
  metaBlock: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 9, color: cores.inkSoft },
  metaValue: { fontSize: 13, fontWeight: 500 },

  hero: {
    backgroundColor: cores.green,
    color: '#FFFFFF',
    padding: 18,
    borderRadius: 8,
    marginBottom: 20,
  },
  heroLabel: { color: cores.greenMst, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Times-Roman', marginTop: 4 },
  heroSub: { color: '#E8F1ED', fontSize: 10, marginTop: 6 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
    color: cores.ink,
  },

  dre: {
    borderWidth: 1,
    borderColor: cores.line,
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
  },
  dreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dreRowEnd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: cores.line,
  },
  dreLabel: { fontSize: 11, color: cores.inkSoft },
  dreValue: { fontSize: 11 },
  dreValueBold: { fontSize: 13, fontWeight: 500, color: cores.green },

  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  gridCol: { flex: 1 },

  catBox: {
    borderWidth: 1,
    borderColor: cores.line,
    borderRadius: 8,
    padding: 12,
  },
  catTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
  },
  catRow: {
    paddingVertical: 4,
  },
  catRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catNome: { fontSize: 10, color: cores.ink },
  catValor: { fontSize: 10 },
  catBar: {
    marginTop: 3,
    height: 3,
    backgroundColor: cores.line,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catBarFill: {
    height: 3,
    borderRadius: 2,
  },

  empty: { fontSize: 10, color: cores.inkSoft, fontStyle: 'italic' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: cores.inkSoft,
  },
})

// ---------------------------------------------------------------------
// Logo (mesma estrutura do componente web, simplificada para PDF)
// ---------------------------------------------------------------------

function LogoSymbol() {
  return (
    <Svg width="28" height="28" viewBox="0 0 100 100">
      <Rect width="100" height="100" rx="25" fill={cores.green} />
      <Circle
        cx="50"
        cy="50"
        r="38"
        stroke="#FFFFFF"
        strokeWidth="7"
        fill="none"
        opacity={0.9}
      />
      <Path d="M50 68V34" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <Path
        d="M32 52L50 34L68 52"
        stroke="#FFFFFF"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="50" cy="74" r="5" fill={cores.greenAcc} />
    </Svg>
  )
}

// ---------------------------------------------------------------------
// Documento principal
// ---------------------------------------------------------------------

interface RelatorioPDFProps {
  data: RelatorioMes
  nomeNegocio: string
  geradoEm: string  // ISO date
}

export function RelatorioPDF({ data, nomeNegocio, geradoEm }: RelatorioPDFProps) {
  const entradas = data.breakdown.filter((b) => b.tipo === 'entrada')
  const saidas = data.breakdown.filter((b) => b.tipo === 'saida')
  const mesLabel = `${NOMES_MES[data.mes - 1]} de ${data.ano}`

  return (
    <Document
      title={`Relatório ${mesLabel} — Sobra`}
      author="Sobra"
      subject={`DRE de ${nomeNegocio} em ${mesLabel}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <LogoSymbol />
            <Text style={styles.brandText}>sobra</Text>
          </View>
          <View style={styles.spacer} />
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Relatório de</Text>
            <Text style={styles.metaValue}>{mesLabel}</Text>
            <Text style={[styles.metaLabel, { marginTop: 2 }]}>{nomeNegocio}</Text>
          </View>
        </View>

        {/* Hero — sobra do mês */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>O QUE SOBROU NESSE MÊS</Text>
          <Text style={styles.heroValue}>{formatBRL(data.lucroLiquido)}</Text>
          <Text style={styles.heroSub}>
            de {formatBRL(data.receitaBruta)} faturados · margem {formatPercent(data.margem, 1)}
          </Text>
        </View>

        {/* DRE */}
        <Text style={styles.sectionTitle}>DRE simplificada</Text>
        <View style={styles.dre}>
          <View style={styles.dreRow}>
            <Text style={styles.dreLabel}>Receita bruta</Text>
            <Text style={styles.dreValue}>{formatBRL(data.receitaBruta)}</Text>
          </View>
          <View style={styles.dreRow}>
            <Text style={styles.dreLabel}>(−) Custos e despesas</Text>
            <Text style={styles.dreValue}>− {formatBRL(data.custos)}</Text>
          </View>
          <View style={styles.dreRowEnd}>
            <Text style={styles.dreLabel}>(=) Lucro líquido</Text>
            <Text
              style={[
                styles.dreValueBold,
                { color: data.lucroLiquido < 0 ? cores.danger : cores.green },
              ]}
            >
              {formatBRL(data.lucroLiquido)}
            </Text>
          </View>
        </View>

        {/* Breakdown */}
        <Text style={styles.sectionTitle}>Por categoria</Text>
        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <CategoriaTabelaPDF
              titulo="Entradas"
              itens={entradas}
              total={data.receitaBruta}
              cor={cores.green}
            />
          </View>
          <View style={styles.gridCol}>
            <CategoriaTabelaPDF
              titulo="Saídas"
              itens={saidas}
              total={data.custos}
              cor={cores.warn}
            />
          </View>
        </View>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text>Relatório gerado pelo Sobra — sobra.app</Text>
          <Text>{geradoEm}</Text>
        </View>
      </Page>
    </Document>
  )
}

function CategoriaTabelaPDF({
  titulo,
  itens,
  total,
  cor,
}: {
  titulo: string
  itens: Array<{ nome: string; total: number }>
  total: number
  cor: string
}) {
  return (
    <View style={styles.catBox}>
      <Text style={styles.catTitle}>{titulo}</Text>
      {itens.length === 0 ? (
        <Text style={styles.empty}>Nada esse mês.</Text>
      ) : (
        itens.map((it) => {
          const pct = total > 0 ? (it.total / total) * 100 : 0
          return (
            <View key={it.nome} style={styles.catRow}>
              <View style={styles.catRowTop}>
                <Text style={styles.catNome}>{it.nome}</Text>
                <Text style={styles.catValor}>{formatBRL(it.total)}</Text>
              </View>
              <View style={styles.catBar}>
                <View
                  style={[styles.catBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: cor }]}
                />
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}
