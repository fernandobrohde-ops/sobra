/**
 * Edge Function: whatsapp-webhook
 *
 * Webhook do WhatsApp (Twilio ou Z-API) → orquestra:
 *   1. Parse + dedupe da mensagem
 *   2. Vincular número (fluxo de verificação SOBRA-XXXXXX)
 *   3. Carregar contexto financeiro do usuário
 *   4. Chamar Claude com tools (function calling em loop)
 *   5. Salvar histórico
 *   6. Aplicar rate limiting por plano
 *   7. Responder via WhatsApp
 *
 * Deploy:
 *   supabase functions deploy whatsapp-webhook --no-verify-jwt
 *
 * Variáveis (supabase secrets set):
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injetadas no runtime)
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM  -- ou
 *   ZAPI_INSTANCE, ZAPI_TOKEN
 */
// @ts-ignore - Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import {
  detectProvider,
  parseTwilioWebhook,
  parseZapiWebhook,
  sendMessage,
  type IncomingMessage,
  type Provider,
} from './_whatsapp.ts'
import { chatWithClaude, type ClaudeMessage } from './_claude.ts'
import { buildTools } from './_tools.ts'

const SUPPORT_NUMBER = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '+55 ...'
const BUILD_MARKER = 'whatsapp-webhook-debug-sync-2026-05-11-01'

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response(`whatsapp-webhook ok ${BUILD_MARKER}`, { status: 200 })
  }

  const provider = detectProvider()
  const requestId = crypto.randomUUID()
  const headers = headersToObject(req.headers)
  const rawBody = await req.clone().text()

  auditLog('request recebido', {
    build: BUILD_MARKER,
    requestId,
    provider,
    method: req.method,
    url: req.url,
    headers,
    env: envStatus(),
    rawBody,
  })

  let incoming: IncomingMessage | null = null
  try {
    incoming = provider === 'twilio'
      ? await parseTwilioWebhook(req)
      : await parseZapiWebhook(new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: rawBody,
      }))

    auditLog('resultado do parse', {
      requestId,
      provider,
      incoming: incoming
        ? {
          ...incoming,
          from: maskNumero(incoming.from),
          textPreview: incoming.text.slice(0, 200),
          textLength: incoming.text.length,
        }
        : null,
    })
  } catch (err) {
    logError('Erro parseando webhook', err, {
      requestId,
      provider,
      headers,
      rawBody,
    })
  }

  if (!incoming) {
    auditLog('webhook ignorado: payload vazio ou formato não reconhecido', {
      requestId,
      provider,
      method: req.method,
      headers,
      rawBody,
    })
    return provider === 'twilio'
      ? twimlResponse('')
      : new Response('ok', { status: 200 })
  }

  if (provider === 'twilio') {
    try {
      auditLog('processamento síncrono Twilio iniciado', {
        requestId,
        messageId: incoming.messageId,
        from: maskNumero(incoming.from),
      })
      const resposta = await processarMensagem(incoming, provider, requestId)
      auditLog('processamento síncrono Twilio finalizado', {
        requestId,
        messageId: incoming.messageId,
        responseLength: resposta?.length ?? 0,
        responsePreview: resposta?.slice(0, 200) ?? '',
      })
      return twimlResponse(resposta ?? '')
    } catch (err) {
      logError('Erro processando mensagem Twilio de forma síncrona', err, {
        requestId,
        provider,
        messageId: incoming.messageId,
        from: maskNumero(incoming.from),
      })
      return twimlResponse('Tive um erro aqui ao processar sua mensagem. Tenta de novo em instantes?')
    }
  }

  // Z-API continua em background para responder rápido ao provider.
  const processing = processarMensagem(incoming, provider, requestId)
    .catch((err) => {
      logError('Erro processando mensagem em background', err, {
        requestId,
        provider,
        messageId: incoming.messageId,
        from: maskNumero(incoming.from),
      })
    })

  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void }
  }
  if (typeof runtime.EdgeRuntime?.waitUntil === 'function') {
    runtime.EdgeRuntime.waitUntil(processing)
  } else {
    auditLog('EdgeRuntime.waitUntil indisponível; processamento segue sem aguardar', {
      requestId,
      provider,
      messageId: incoming.messageId,
    })
  }

  return new Response('ok', { status: 200 })
})

// ---------------------------------------------------------------------

async function processarMensagem(msg: IncomingMessage, provider: Provider, requestId: string): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const numero = msg.from.replace(/\D/g, '')
  const texto = msg.text.trim()
  const logCtx = {
    requestId,
    provider,
    messageId: msg.messageId,
    from: maskNumero(numero),
  }
  const responder = async (resposta: string): Promise<string> => {
    auditLog('resposta preparada', {
      ...logCtx,
      responseLength: resposta.length,
      responsePreview: resposta.slice(0, 200),
      transport: provider === 'twilio' ? 'twiml' : 'provider-api',
    })

    if (provider === 'twilio') {
      return resposta
    }

    const r = await sendMessage(provider, numero, resposta)
    if (!r.ok) {
      console.error('[whatsapp-webhook] falha enviando resposta', { ...logCtx, error: r.error })
    } else {
      auditLog('resposta enviada com sucesso', logCtx)
    }
    return resposta
  }

  auditLog('mensagem recebida', {
    ...logCtx,
    messageType: msg.messageType,
    textLength: texto.length,
  })

  if (!texto) {
    auditLog('mensagem sem texto útil', {
      ...logCtx,
      messageType: msg.messageType,
    })
    return await responder('Recebi sua mensagem, mas por enquanto consigo responder melhor mensagens de texto. Me manda sua dúvida por escrito?')
  }

  // ---- 2. Vínculo: usuário enviou SOBRA-XXXXXX? ----
  const codigoMatch = texto.match(/SOBRA-\d{6}/i)
  if (codigoMatch) {
    const codigo = codigoMatch[0].toUpperCase()
    auditLog('tentando validar código de vínculo', logCtx)

    const { data: sessao, error: sessaoErr } = await supabase
      .from('whatsapp_sessions')
      .select('id, user_id, expires_at')
      .eq('verification_code', codigo)
      .eq('verified', false)
      .maybeSingle()

    if (sessaoErr) {
      logError('Erro buscando sessão de WhatsApp pelo código', sessaoErr, logCtx)
      return await responder('Não consegui validar o código agora. Tenta de novo daqui a pouco.')
    }

    if (!sessao) {
      return await responder('Código não encontrado ou já usado. Gera um novo lá no app.')
    }
    if (new Date(sessao.expires_at as string) < new Date()) {
      return await responder('Esse código expirou. Gera um novo lá no app.')
    }

    const { error: oldSessionErr } = await supabase
      .from('whatsapp_sessions')
      .update({
        verified: false,
        whatsapp_number: null,
      })
      .eq('user_id', sessao.user_id)
      .eq('verified', true)
      .neq('id', sessao.id)

    if (oldSessionErr) {
      logError('Erro desativando vínculo antigo de WhatsApp', oldSessionErr, logCtx)
      return await responder('Não consegui trocar o número agora. Tenta de novo daqui a pouco.')
    }

    const { error: updateErr } = await supabase
      .from('whatsapp_sessions')
      .update({
        whatsapp_number: numero,
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', sessao.id)

    if (updateErr) {
      logError('Erro atualizando vínculo de WhatsApp', updateErr, logCtx)
      return await responder('Não consegui finalizar o vínculo agora. Tenta de novo daqui a pouco.')
    }

    return await responder(
      'Pronto! Vínculo confirmado. ✓\n\nAgora pode me perguntar coisas como:\n• "Quanto sobrou esse mês?"\n• "Quem ainda me deve?"\n• "Recebi 200 do João"\n\nDigite /ajuda pra ver tudo que sei fazer.')
  }

  // ---- 3. Acha o user pelo número vinculado ----
  const { data: vincSess, error: vincErr } = await supabase
    .from('whatsapp_sessions')
    .select('user_id')
    .eq('whatsapp_number', numero)
    .eq('verified', true)
    .maybeSingle()

  if (vincErr) {
    logError('Erro buscando usuário vinculado ao WhatsApp', vincErr, logCtx)
    return await responder('Não consegui acessar seu vínculo agora. Tenta de novo daqui a pouco.')
  }

  const userId = (vincSess as { user_id: string } | null)?.user_id

  if (!userId) {
    return await responder(
      `Oi! Sou o assistente do Sobra. 👋\n\nPra eu te ajudar, ative no app: Configurações → Assistente WhatsApp. Vai gerar um código (SOBRA-XXXXXX) pra você me mandar aqui.\n\nNão tem conta? sobra.app`)
  }

  // ---- 4. Comandos especiais ----
  if (/^\/ajuda$/i.test(texto)) {
    auditLog('respondendo comando /ajuda', logCtx)
    return await responder(MENSAGEM_AJUDA)
  }

  // ---- 5. Rate limiting por plano ----
  const limite = await checarRateLimit(supabase, userId)
  if (!limite.ok) {
    return await responder(limite.mensagem!)
  }

  // ---- 6. Contexto financeiro pro system prompt ----
  auditLog('carregando contexto financeiro', { ...logCtx, userId })
  const contexto = await carregarContexto(supabase, userId)
  if (!contexto) {
    return await responder('Não consegui acessar seus dados agora. Tenta de novo daqui a pouco.')
  }

  const systemPrompt = montarSystemPrompt(contexto)

  // ---- 7. Histórico ----
  const history = await carregarHistorico(supabase, userId)

  // ---- 8. Chama Claude ----
  const { definitions, handlers } = buildTools(supabase, userId)
  let resposta: string
  try {
    auditLog('chamando Claude', { ...logCtx, userId, tools: definitions.length })
    const result = await chatWithClaude({
      systemPrompt,
      history,
      userMessage: texto,
      tools: definitions,
      toolHandlers: handlers,
    })
    resposta = result.text || 'Hmm, não consegui montar uma resposta. Tenta reformular?'
    if (pareceConfirmacaoDeRegistro(resposta) && !teveMutacaoReal(result.toolCalls)) {
      logError('Claude afirmou registro sem chamar tool de mutação', new Error('missing_mutation_tool'), {
        ...logCtx,
        userId,
        resposta,
        toolCalls: result.toolCalls.map((tool) => tool.name),
      })
      resposta = 'Ainda não registrei isso no Sobra. Me confirma de novo com os dados completos? Ex: "Registrar R$ 50 a receber da Maria até 25/05".'
    }
    auditLog('Claude respondeu', {
      ...logCtx,
      userId,
      responseLength: resposta.length,
      toolCalls: result.toolCalls.map((tool) => tool.name),
    })
  } catch (err) {
    logError('Erro chamando Claude', err, { ...logCtx, userId })
    resposta = 'Tô com dificuldade de pensar agora. Tenta de novo em 1 minuto?'
  }

  // ---- 9. Salva no histórico ----
  const { error: historyErr } = await supabase.from('chat_messages').insert([
    { user_id: userId, role: 'user', content: texto },
    { user_id: userId, role: 'assistant', content: resposta },
  ])
  if (historyErr) {
    logError('Erro salvando histórico do chat', historyErr, { ...logCtx, userId })
  }

  // ---- 10. Atualiza last_used pra contar uso (rate limit) ----
  const { error: lastUsedErr } = await supabase
    .from('whatsapp_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('verified', true)
  if (lastUsedErr) {
    logError('Erro atualizando last_used_at do WhatsApp', lastUsedErr, { ...logCtx, userId })
  }

  // ---- 11. Responde ----
  return await responder(resposta)
}

function maskNumero(numero: string): string {
  const limpo = numero.replace(/\D/g, '')
  if (limpo.length <= 4) return '****'
  return `${'*'.repeat(Math.max(limpo.length - 4, 0))}${limpo.slice(-4)}`
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase()
    result[key] = lower === 'authorization' || lower === 'cookie'
      ? '[redacted]'
      : value
  }
  return result
}

function envStatus(): Record<string, boolean> {
  return {
    SUPABASE_URL: Boolean(Deno.env.get('SUPABASE_URL')),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
    ANTHROPIC_API_KEY: Boolean(Deno.env.get('ANTHROPIC_API_KEY')),
    TWILIO_ACCOUNT_SID: Boolean(Deno.env.get('TWILIO_ACCOUNT_SID')),
    TWILIO_AUTH_TOKEN: Boolean(Deno.env.get('TWILIO_AUTH_TOKEN')),
    TWILIO_WHATSAPP_FROM: Boolean(Deno.env.get('TWILIO_WHATSAPP_FROM')),
    ZAPI_INSTANCE: Boolean(Deno.env.get('ZAPI_INSTANCE')),
    ZAPI_TOKEN: Boolean(Deno.env.get('ZAPI_TOKEN')),
  }
}

function twimlResponse(message: string): Response {
  const body = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : '<Response></Response>'

  auditLog('respondendo webhook Twilio com TwiML', {
    hasMessage: Boolean(message),
    responseLength: message.length,
    responsePreview: message.slice(0, 200),
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  })
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function auditLog(message: string, context: Record<string, unknown> = {}) {
  console.error(`[whatsapp-webhook] ${message}`, {
    build: BUILD_MARKER,
    ...context,
  })
}

function teveMutacaoReal(toolCalls: Array<{ name: string }>): boolean {
  return toolCalls.some((tool) => tool.name === 'criar_lancamento' || tool.name === 'marcar_como_pago')
}

function pareceConfirmacaoDeRegistro(texto: string): boolean {
  return /\b(registrad[oa]s?|registrei|lançad[oa]s?|salv[eo]i?|criad[oa]s?|marquei|confirmad[oa]s?)\b/i.test(texto)
}

function logError(message: string, err: unknown, context: Record<string, unknown> = {}) {
  const error = err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : err

  console.error(`[whatsapp-webhook] ${message}`, {
    ...context,
    error,
  })
}

// ---------------------------------------------------------------------
// Contexto + system prompt
// ---------------------------------------------------------------------

interface Contexto {
  nome_negocio: string
  setor: string
  plano: string
  mes_atual: string
  sobra_mes: number
  total_entradas: number
  total_saidas: number
  total_a_receber: number
  qtd_a_receber: number
  total_a_pagar: number
  qtd_a_pagar: number
  sobra_mes_anterior: number
}

async function carregarContexto(supabase: any, userId: string): Promise<Contexto | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_negocio, setor, plano')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) return null

  const hoje = new Date()
  const inicioMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
  const inicioAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10)
  const fimAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().slice(0, 10)

  const [{ data: lancsMes }, { data: lancsAnt }, { data: pendentes }] = await Promise.all([
    supabase.from('lancamentos').select('tipo, valor').eq('user_id', userId).gte('data', inicioMes).lte('data', fimMes),
    supabase.from('lancamentos').select('tipo, valor').eq('user_id', userId).gte('data', inicioAnterior).lte('data', fimAnterior),
    supabase.from('lancamentos').select('tipo, valor').eq('user_id', userId).eq('status', 'pendente'),
  ])

  let entradas = 0, saidas = 0
  for (const l of (lancsMes ?? [])) {
    const v = Number(l.valor) || 0
    if (l.tipo === 'entrada') entradas += v
    else if (l.tipo === 'saida') saidas += v
  }

  let entAnt = 0, saiAnt = 0
  for (const l of (lancsAnt ?? [])) {
    const v = Number(l.valor) || 0
    if (l.tipo === 'entrada') entAnt += v
    else if (l.tipo === 'saida') saiAnt += v
  }

  let aReceber = 0, qtdReceber = 0, aPagar = 0, qtdPagar = 0
  for (const l of (pendentes ?? [])) {
    const v = Number(l.valor) || 0
    if (l.tipo === 'entrada') { aReceber += v; qtdReceber++ }
    else if (l.tipo === 'saida') { aPagar += v; qtdPagar++ }
  }

  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

  return {
    nome_negocio: profile.nome_negocio,
    setor: profile.setor,
    plano: profile.plano,
    mes_atual: meses[hoje.getMonth()],
    sobra_mes: entradas - saidas,
    total_entradas: entradas,
    total_saidas: saidas,
    total_a_receber: aReceber,
    qtd_a_receber: qtdReceber,
    total_a_pagar: aPagar,
    qtd_a_pagar: qtdPagar,
    sobra_mes_anterior: entAnt - saiAnt,
  }
}

function montarSystemPrompt(c: Contexto): string {
  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `Você é o assistente financeiro do Sobra, chamado de "Sobra". Você fala diretamente com ${c.nome_negocio}, um(a) ${c.setor} que usa o Sobra para controlar as finanças do negócio.

Sua personalidade: direto, amigável, sem jargão contábil. Fale como um amigo que entende de dinheiro. Nunca use termos como "EBITDA", "fluxo de caixa operacional" ou "inadimplência". Use "o que sobrou", "o que entra", "o que sai", "quem ainda te deve".

Dados financeiros atuais de ${c.nome_negocio} (${c.mes_atual}):
- Sobrou até agora: R$ ${fmt(c.sobra_mes)}
- Total que entrou: R$ ${fmt(c.total_entradas)}
- Total que saiu: R$ ${fmt(c.total_saidas)}
- A receber: R$ ${fmt(c.total_a_receber)} (${c.qtd_a_receber} lançamentos pendentes)
- A pagar: R$ ${fmt(c.total_a_pagar)} (${c.qtd_a_pagar} lançamentos pendentes)
- Mês anterior sobrou: R$ ${fmt(c.sobra_mes_anterior)}

Regras importantes:
1. Respostas curtas — máximo 3 parágrafos. WhatsApp não é relatório.
2. Use emojis com moderação — apenas quando deixar a resposta mais clara.
3. Quando registrar um lançamento, confirme com o usuário antes de salvar.
4. Se não tiver certeza do que o usuário quer dizer, pergunte.
5. Nunca invente dados. Se não souber, diga que vai buscar ou peça mais detalhes.
6. Se o usuário perguntar algo fora do contexto financeiro, redirecione gentilmente.
7. Para dados que precisam ser buscados (lançamentos específicos, períodos diferentes), use as tools disponíveis.
8. Interpretação de status:
   - "recebi", "entrou", "vendi e já pagaram" = entrada recebida, status recebido.
   - "a receber", "me deve", "vai pagar", "ficou devendo", "cliente deve" = entrada pendente, status pendente.
   - "paguei", "saiu", "comprei e já paguei" = saída paga, status pago.
   - "a pagar", "devo", "boleto", "conta em aberto", "tenho que pagar" = saída pendente, status pendente.
9. Lançamentos pendentes alimentam os cards "A receber" e "A pagar" do dashboard.
10. Nunca diga "registrado", "salvei", "pronto", "feito" ou "confirmado" sobre lançamento sem antes chamar a tool correspondente e receber retorno ok.
11. Se o usuário responder uma confirmação curta como "isso", "sim", "pode", "confirma", "confirmo" ou "ok" depois de você ter proposto um lançamento, chame a tool criar_lancamento usando exatamente os dados da sua proposta anterior.
12. Se a tool retornar erro, diga que não conseguiu registrar e mostre o erro em linguagem simples.`
}

// ---------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------

async function carregarHistorico(supabase: any, userId: string): Promise<ClaudeMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (!data) return []
  // Reverte pra ordem cronológica (mais antiga primeiro)
  return [...data].reverse().map((m: any) => ({ role: m.role, content: m.content }))
}

// ---------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------

async function checarRateLimit(supabase: any, userId: string): Promise<{ ok: boolean; mensagem?: string }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plano')
    .eq('id', userId)
    .single()

  const limite = profile?.plano === 'gratis' ? 5 : 20

  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', inicioHoje.toISOString())

  if ((count ?? 0) >= limite) {
    return {
      ok: false,
      mensagem: `Você atingiu o limite de mensagens de hoje (${limite}/dia). Amanhã estou de volta! 😊\n\nQuer mais? Faça upgrade no app.`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------

const MENSAGEM_AJUDA = `Oi! Sou o Sobra, seu assistente financeiro. Sou bom em:

📊 *Consultas*
• "Quanto sobrou esse mês?"
• "Como foi outubro?"
• "Quem ainda me deve?"
• "Quanto gastei com Marketing?"

✍️ *Registrar movimentações*
• "Recebi 500 do João"
• "Paguei 80 de internet hoje"
• "Vendi 1200 hoje"

⚠️ *Vencimentos*
• "O que vence essa semana?"
• "Quais boletos abertos?"

✅ *Atualizar*
• "Já paguei a internet"
• "O cliente Z já me pagou"
`
