/**
 * Edge Function: alertas-diarios (briefing 5.2).
 *
 * Roda no runtime Deno do Supabase. Não importa nada do app Next.
 *
 * Lógica (briefing 5.2):
 *  1. Todo dia às 8h: buscar lancamentos pendentes onde
 *     data_vencimento = hoje + alerta_vencimento_dias do usuário.
 *  2. Para cada um: enviar mensagem WhatsApp via provedor configurado.
 *  3. Toda segunda às 8h: enviar resumo semanal pra quem tem
 *     resumo_semanal=true.
 *
 * Como agendar:
 *  Após deploy desta function, ative pg_cron e crie o job (veja a
 *  migration `20260501000004_cron.sql`). Ele chama esta function
 *  todos os dias às 8h America/Sao_Paulo.
 *
 * Deploy:
 *   supabase functions deploy alertas-diarios
 *
 * Variáveis de ambiente esperadas (set via `supabase secrets set`):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (já populadas automaticamente)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 *   ou
 *   ZAPI_INSTANCE, ZAPI_TOKEN
 */
// @ts-ignore - Deno runtime, não Node
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// ----- Tipos mínimos -----

interface AlertaUsuario {
  user_id: string
  whatsapp: string | null
  whatsapp_ativo: boolean
  email_ativo: boolean
  alerta_vencimento_dias: number
  resumo_semanal: boolean
  nome_negocio: string
}

interface LancamentoVencendo {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  user_id: string
}

// ----- Provedor WhatsApp -----

async function enviarWhatsApp(numero: string, mensagem: string): Promise<{ ok: boolean; error?: string }> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')
  const zapiInstance = Deno.env.get('ZAPI_INSTANCE')
  const zapiToken = Deno.env.get('ZAPI_TOKEN')

  // Twilio tem precedência se ambos configurados
  if (twilioSid && twilioToken && twilioFrom) {
    return enviarViaTwilio({ sid: twilioSid, token: twilioToken, from: twilioFrom }, numero, mensagem)
  }
  if (zapiInstance && zapiToken) {
    return enviarViaZapi({ instance: zapiInstance, token: zapiToken }, numero, mensagem)
  }
  return { ok: false, error: 'Nenhum provedor de WhatsApp configurado.' }
}

async function enviarViaTwilio(
  cfg: { sid: string; token: string; from: string },
  numero: string,
  mensagem: string
): Promise<{ ok: boolean; error?: string }> {
  // Twilio espera "whatsapp:+5511999998888"
  const to = `whatsapp:${normalizarParaE164(numero)}`
  const from = cfg.from.startsWith('whatsapp:') ? cfg.from : `whatsapp:${cfg.from}`
  const auth = btoa(`${cfg.sid}:${cfg.token}`)

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: mensagem }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Twilio ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Twilio exception: ${(err as Error).message}` }
  }
}

async function enviarViaZapi(
  cfg: { instance: string; token: string },
  numero: string,
  mensagem: string
): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizarParaE164(numero).replace('+', '')
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${cfg.instance}/token/${cfg.token}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: mensagem }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Z-API ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Z-API exception: ${(err as Error).message}` }
  }
}

// "+55 11 99999-9999" / "(11) 99999-9999" → "+5511999999999"
function normalizarParaE164(s: string): string {
  const d = s.replace(/\D/g, '')
  // Já tem +55? Mantém.
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return `+${d}`
  // Local (10 ou 11 dígitos)? Adiciona +55.
  if (d.length === 10 || d.length === 11) return `+55${d}`
  return `+${d}`
}

// ----- Mensagens -----

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function mensagemVencimento(nome: string, descricao: string, valor: number, dias: number): string {
  // Briefing 5.2: "Oi [nome]! O lançamento [descrição] vence em [X dias]. Valor: R$ [valor]."
  const quando = dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `vence em ${dias} dias`
  return `Oi ${primeiroNome(nome)}! "${descricao}" ${quando}. Valor: ${formatBRL(valor)}.\n— Sobra`
}

function mensagemResumoSemanal(nome: string, sobra: number, aReceber: number): string {
  // Briefing 5.2: "Semana encerrada. Sobrou: R$ [valor]. A receber essa semana: R$ [valor]."
  return `Bom dia, ${primeiroNome(nome)}! Semana encerrada. Sobrou: ${formatBRL(sobra)}. A receber essa semana: ${formatBRL(aReceber)}.\n— Sobra`
}

function primeiroNome(s: string): string {
  return s.split(/\s+/)[0] ?? ''
}

// ----- Handler -----

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const isResumoSemanal = url.searchParams.get('tipo') === 'resumo-semanal' || isSegunda()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let enviados = 0
  let falhas = 0

  // Busca todos os usuários com WhatsApp e alertas ativos.
  const { data: configs } = await supabase
    .from('alertas_config')
    .select(`
      user_id, whatsapp_ativo, email_ativo, alerta_vencimento_dias, resumo_semanal,
      profiles ( whatsapp, nome_negocio )
    `)
    .eq('whatsapp_ativo', true)

  const usuarios: AlertaUsuario[] = (configs ?? [])
    .map((c: any) => {
      const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
      if (!p?.whatsapp) return null
      return {
        user_id: c.user_id,
        whatsapp: p.whatsapp,
        whatsapp_ativo: c.whatsapp_ativo,
        email_ativo: c.email_ativo,
        alerta_vencimento_dias: c.alerta_vencimento_dias,
        resumo_semanal: c.resumo_semanal,
        nome_negocio: p.nome_negocio,
      } as AlertaUsuario
    })
    .filter((u: AlertaUsuario | null): u is AlertaUsuario => u !== null)

  // ----- 1. Alertas de vencimento -----
  for (const u of usuarios) {
    const alvo = dataAlvo(u.alerta_vencimento_dias)
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('id, descricao, valor, data_vencimento, user_id')
      .eq('user_id', u.user_id)
      .eq('status', 'pendente')
      .eq('data_vencimento', alvo)

    for (const l of (lancs ?? []) as LancamentoVencendo[]) {
      const msg = mensagemVencimento(u.nome_negocio, l.descricao, l.valor, u.alerta_vencimento_dias)
      const r = await enviarWhatsApp(u.whatsapp!, msg)
      if (r.ok) enviados++
      else { falhas++; console.error(`Falha lanc=${l.id}:`, r.error) }
    }
  }

  // ----- 2. Resumo semanal (segundas) -----
  if (isResumoSemanal) {
    const { start, end } = ultimaSemana()
    for (const u of usuarios.filter((x) => x.resumo_semanal)) {
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('tipo, valor, status')
        .eq('user_id', u.user_id)
        .gte('data', start)
        .lte('data', end)

      let entradas = 0, saidas = 0, aReceber = 0
      for (const l of (lancs ?? []) as Array<{ tipo: string; valor: number; status: string }>) {
        const v = typeof l.valor === 'string' ? Number(l.valor) : l.valor
        if (!Number.isFinite(v)) continue
        if (l.tipo === 'entrada') {
          entradas += v
          if (l.status === 'pendente') aReceber += v
        } else if (l.tipo === 'saida') {
          saidas += v
        }
      }
      const sobra = entradas - saidas
      const msg = mensagemResumoSemanal(u.nome_negocio, sobra, aReceber)
      const r = await enviarWhatsApp(u.whatsapp!, msg)
      if (r.ok) enviados++
      else falhas++
    }
  }

  return new Response(JSON.stringify({ ok: true, enviados, falhas }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ----- Helpers de data -----

function dataAlvo(diasFrente: number): string {
  const d = new Date()
  d.setDate(d.getDate() + diasFrente)
  return toISODate(d)
}

function isSegunda(): boolean {
  return new Date().getDay() === 1  // 0=domingo, 1=segunda
}

function ultimaSemana(): { start: string; end: string } {
  const hoje = new Date()
  // Segunda da semana passada até domingo passado.
  const fimSemanaPassada = new Date(hoje)
  fimSemanaPassada.setDate(hoje.getDate() - hoje.getDay())  // último domingo
  const inicioSemanaPassada = new Date(fimSemanaPassada)
  inicioSemanaPassada.setDate(fimSemanaPassada.getDate() - 6)  // segunda anterior
  return { start: toISODate(inicioSemanaPassada), end: toISODate(fimSemanaPassada) }
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
