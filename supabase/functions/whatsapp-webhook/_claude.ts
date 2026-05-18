/**
 * Cliente Claude API com function calling.
 *
 * Loop: chama messages.create, processa tool_use blocks chamando os
 * handlers locais, manda os tool_results de volta, repete até chegar
 * em uma resposta puramente textual (stop_reason: end_turn).
 *
 * Modelo: claude-sonnet-4-5 (recomendado pelo briefing).
 */

const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5'
const MAX_TOOL_ROUNDS = 4  // proteção contra loop infinito

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<string>

interface ClaudeResponse {
  id: string
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
}

/**
 * Conversa com o Claude executando tool calls em loop até a resposta final.
 *
 * @returns Texto final da resposta (concat de todos blocos `text`).
 */
export async function chatWithClaude(opts: {
  systemPrompt: string
  history: ClaudeMessage[]
  userMessage: string
  tools: ToolDefinition[]
  toolHandlers: Record<string, ToolHandler>
}): Promise<{ text: string; toolCalls: Array<{ name: string; input: Record<string, unknown> }> }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')

  console.error('[whatsapp-webhook] Claude start', {
    model: MODEL,
    historyLength: opts.history.length,
    userMessageLength: opts.userMessage.length,
    tools: opts.tools.map((tool) => tool.name),
  })

  const messages: ClaudeMessage[] = [
    ...opts.history,
    { role: 'user', content: opts.userMessage },
  ]

  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = []
  const finalTextParts: string[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    console.error('[whatsapp-webhook] Claude round request', {
      round: round + 1,
      messages: messages.length,
    })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: opts.systemPrompt,
        messages,
        tools: opts.tools,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[whatsapp-webhook] Claude HTTP error', {
        status: res.status,
        body: body.slice(0, 1000),
      })
      throw new Error(`Claude ${res.status}: ${body.slice(0, 300)}`)
    }

    const data = (await res.json()) as ClaudeResponse
    console.error('[whatsapp-webhook] Claude round response', {
      round: round + 1,
      stopReason: data.stop_reason,
      contentTypes: data.content.map((block) => block.type),
    })

    // Adiciona resposta do assistente ao histórico desta conversa
    messages.push({ role: 'assistant', content: data.content })

    // Coleta texto e tool_use desta round
    const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
    for (const block of data.content) {
      if (block.type === 'text') finalTextParts.push(block.text)
      if (block.type === 'tool_use') {
        console.error('[whatsapp-webhook] Claude tool_use', {
          round: round + 1,
          name: block.name,
          input: block.input,
        })
        toolUses.push(block)
      }
    }

    if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
      // Resposta final
      return { text: finalTextParts.join('\n\n').trim(), toolCalls }
    }

    // Executa tool calls e prepara tool_results pra próxima round
    const toolResults: ContentBlock[] = []
    for (const use of toolUses) {
      toolCalls.push({ name: use.name, input: use.input })
      const handler = opts.toolHandlers[use.name]
      let result: string
      let isError = false
      try {
        result = handler ? await handler(use.input) : `Tool '${use.name}' não implementada.`
      } catch (err) {
        console.error('[whatsapp-webhook] Claude tool handler exception', {
          name: use.name,
          error: err instanceof Error ? err.message : err,
        })
        result = `Erro ao executar ${use.name}: ${(err as Error).message}`
        isError = true
      }
      console.error('[whatsapp-webhook] Claude tool_result', {
        name: use.name,
        isError,
        resultPreview: result.slice(0, 500),
      })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: result,
        is_error: isError,
      })
    }

    messages.push({ role: 'user', content: toolResults })

    // limpa text parts entre rounds (só queremos o texto final)
    finalTextParts.length = 0
  }

  return {
    text: 'Hmm, não consegui processar isso agora. Tenta de novo daqui a pouco?',
    toolCalls,
  }
}
