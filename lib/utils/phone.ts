/**
 * Utilitários de telefone brasileiro.
 *
 * O briefing 4.2 pede um campo opcional para WhatsApp. O CHECK do banco
 * (em 20260501000001_schema.sql) aceita `^\+?[0-9 ()-]{8,20}$`, que cobre
 * tanto a forma com máscara quanto sem.
 */

/**
 * Aplica progressivamente a máscara `(XX) XXXXX-XXXX` (ou `(XX) XXXX-XXXX`
 * para telefones fixos) ao usuário enquanto digita. Sempre retorna uma
 * versão formatada baseada apenas nos dígitos do input — ou seja, é
 * idempotente: pode ser aplicada de novo sem corromper.
 */
export function formatPhoneBR(raw: string): string {
  let d = raw.replace(/\D/g, '')
  // Cola com código do país (+55): tira pra não virar DDD inválido.
  // Só faz isso se sobrar um número plausível (10 ou 11 dígitos).
  if (d.length >= 12 && d.length <= 13 && d.startsWith('55')) {
    d = d.slice(2)
  }
  d = d.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Considera válido se tiver 10 dígitos (fixo) ou 11 dígitos (celular).
 * Não verifica DDDs específicos — bom o bastante para um campo opcional.
 */
export function isValidPhoneBR(s: string): boolean {
  const d = s.replace(/\D/g, '')
  return d.length === 10 || d.length === 11
}

/**
 * Normaliza para o formato canônico que vai pro banco: `+55 11 99999-9999`.
 * Retorna `null` se o input estiver vazio (campo opcional). Lança se for
 * inválido — quem chama deve garantir isValidPhoneBR primeiro.
 */
export function toCanonicalPhoneBR(s: string): string | null {
  const d = s.replace(/\D/g, '')
  if (d.length === 0) return null
  if (d.length !== 10 && d.length !== 11) {
    throw new Error('Telefone deve ter 10 ou 11 dígitos.')
  }
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  const middle = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)
  const suffix = rest.length === 9 ? rest.slice(5) : rest.slice(4)
  return `+55 ${ddd} ${middle}-${suffix}`
}
