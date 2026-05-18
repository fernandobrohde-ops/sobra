/**
 * Cliente WhatsApp — abstração comum sobre Twilio e Z-API.
 *
 * O webhook recebe payloads diferentes de cada provider, e este módulo
 * normaliza pra IncomingMessage. Também envia mensagens de saída.
 */

export interface IncomingMessage {
  /** Número do remetente em formato E.164 sem '+': '5511999998888' */
  from: string
  /** Texto da mensagem */
  text: string
  /** Alias simples do tipo, mantido para logs/compatibilidade */
  type: 'text' | 'media' | 'button' | 'unknown'
  /** Tipo da mensagem normalizado a partir do provider */
  messageType: 'text' | 'media' | 'button' | 'unknown'
  /** ID da mensagem (pra dedupe) */
  messageId: string
}

export type Provider = 'twilio' | 'zapi'

export function detectProvider(): Provider {
  const hasTwilio = Boolean(Deno.env.get('TWILIO_ACCOUNT_SID'))
  const hasZapi = Boolean(Deno.env.get('ZAPI_INSTANCE'))
  console.error('[whatsapp-webhook] provider detection', { hasTwilio, hasZapi })
  if (hasTwilio) return 'twilio'
  if (hasZapi) return 'zapi'
  // Default Twilio (mais comum em produção BR)
  return 'twilio'
}

// ---------------------------------------------------------------------
// Parse do webhook recebido
// ---------------------------------------------------------------------

/**
 * Twilio envia application/x-www-form-urlencoded com campos como
 * `From=whatsapp:+5511999...`, `Body=texto`, `MessageSid=SM123...`.
 */
export async function parseTwilioWebhook(req: Request): Promise<IncomingMessage | null> {
  const ct = req.headers.get('content-type') ?? ''

  if (!ct.toLowerCase().includes('application/x-www-form-urlencoded')) {
    console.error('[whatsapp-webhook] Twilio content-type inesperado', {
      contentType: ct,
    })
  }

  const form = await req.formData()
  const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))

  console.error('[whatsapp-webhook] TWILIO FORM DATA', fields)

  const rawFrom = form.get('From')?.toString() || form.get('WaId')?.toString() || ''
  const body = form.get('Body')?.toString() || ''
  const from = normalizePhone(rawFrom)
  const text = body.trim()
  const messageId = form.get('MessageSid')?.toString() ||
    form.get('SmsMessageSid')?.toString() ||
    form.get('SmsSid')?.toString() ||
    crypto.randomUUID()
  const numMedia = Number(form.get('NumMedia')?.toString() || '0')
  const twilioType = (form.get('MessageType')?.toString() || '').toLowerCase()
  const mediaContentType = form.get('MediaContentType0')?.toString() || ''
  const buttonText = form.get('ButtonText')?.toString() || ''
  const messageType = normalizeTwilioMessageType(twilioType, numMedia, mediaContentType, buttonText)

  if (!from || (!text && !buttonText)) {
    console.error('[whatsapp-webhook] Mensagem inválida Twilio', {
      hasFrom: Boolean(from),
      hasBody: Boolean(text),
      hasButtonText: Boolean(buttonText),
      fields,
    })
    return null
  }

  const parsed = {
    from,
    text: text || buttonText,
    type: messageType,
    messageType,
    messageId,
  }

  console.error('[whatsapp-webhook] TWILIO PARSED MESSAGE', {
    ...parsed,
    from: maskPhoneForLog(parsed.from),
    textPreview: parsed.text.slice(0, 200),
    textLength: parsed.text.length,
  })

  return parsed
}

/**
 * Z-API envia JSON com `phone`, `text.message`, `messageId`.
 * Formato: https://developer.z-api.io/webhooks/on-message-received
 */
export async function parseZapiWebhook(req: Request): Promise<IncomingMessage | null> {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return null
  }

  const from = String(body.phone ?? '').replace('+', '')
  const textObj = body.text as { message?: string } | undefined
  const text = textObj?.message ?? ''
  const messageId = String(body.messageId ?? '')

  if (!from || !text) return null
  return { from, text, type: 'text', messageType: 'text', messageId }
}

function maskPhoneForLog(value: string): string {
  const clean = value.replace(/\D/g, '')
  return clean.length <= 4 ? '****' : `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`
}

function normalizePhone(value: string): string {
  return value
    .replace(/^whatsapp:/i, '')
    .replace(/\D/g, '')
}

function normalizeTwilioMessageType(
  twilioType: string,
  numMedia: number,
  mediaContentType: string,
  buttonText: string
): IncomingMessage['messageType'] {
  if (buttonText) return 'button'
  if (numMedia > 0 || mediaContentType) return 'media'
  if (!twilioType || twilioType === 'text') return 'text'
  if (twilioType === 'button') return 'button'
  if (twilioType === 'media' || twilioType === 'image' || twilioType === 'audio' || twilioType === 'video') {
    return 'media'
  }
  return 'unknown'
}

// ---------------------------------------------------------------------
// Validação de assinatura HMAC
// ---------------------------------------------------------------------

/**
 * Twilio assina requests com HMAC-SHA1 em X-Twilio-Signature.
 * Documentação: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Em dev local pode ficar desabilitada via env DEV_SKIP_SIGNATURE=true.
 */
export async function validateTwilioSignature(
  req: Request,
  body: URLSearchParams,
  url: string
): Promise<boolean> {
  if (Deno.env.get('DEV_SKIP_SIGNATURE') === 'true') return true

  const signature = req.headers.get('X-Twilio-Signature')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  if (!signature || !authToken) return false

  // Twilio: assina url + sorted concat dos parâmetros
  const sorted = [...body.entries()].sort(([a], [b]) => a.localeCompare(b))
  const data = url + sorted.map(([k, v]) => k + v).join('')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

  return signature === expected
}

// ---------------------------------------------------------------------
// Envio de mensagens
// ---------------------------------------------------------------------

export async function sendMessage(
  provider: Provider,
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  console.error('[whatsapp-webhook] sendMessage chamado', {
    provider,
    to: maskPhoneForLog(to),
    textLength: text.length,
    textPreview: text.slice(0, 200),
  })
  if (provider === 'twilio') return sendTwilio(to, text)
  return sendZapi(to, text)
}

async function sendTwilio(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM')
  if (!sid || !token || !from) {
    console.error('[whatsapp-webhook] Twilio config faltando', {
      hasSid: Boolean(sid),
      hasToken: Boolean(token),
      hasFrom: Boolean(from),
    })
    return { ok: false, error: 'Twilio config faltando' }
  }

  const auth = btoa(`${sid}:${token}`)
  const fromFmt = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`
  const toFmt = `whatsapp:+${to.replace('+', '')}`

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: toFmt, From: fromFmt, Body: text }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      console.error('[whatsapp-webhook] Twilio API retornou erro', {
        status: res.status,
        body: body.slice(0, 1000),
      })
      return { ok: false, error: `Twilio ${res.status}: ${body.slice(0, 200)}` }
    }
    console.error('[whatsapp-webhook] Twilio API envio OK', { to: maskPhoneForLog(to) })
    return { ok: true }
  } catch (err) {
    console.error('[whatsapp-webhook] Twilio API exception', err)
    return { ok: false, error: `Twilio: ${(err as Error).message}` }
  }
}

async function sendZapi(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const instance = Deno.env.get('ZAPI_INSTANCE')
  const token = Deno.env.get('ZAPI_TOKEN')
  if (!instance || !token) return { ok: false, error: 'Z-API config faltando' }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instance}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: to.replace('+', ''), message: text }),
      }
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Z-API ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: `Z-API: ${(err as Error).message}` }
  }
}
