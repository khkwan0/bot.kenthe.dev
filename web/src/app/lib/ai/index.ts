import { Ollama } from 'ollama'
import type { Message, ToolCall } from 'ollama'
import type { Socket as ServerSocket } from 'socket.io'
import { ollamaTools, SEARCH_WEB_TOOL, toolsSystemPrompt } from '@/lib/mcp/tools'
import { formatSearchContext, searchWeb } from '@/lib/search/tavily'
import { logger } from '../logger'
import { getNamedMiddlewareRegex } from 'next/dist/shared/lib/router/utils/route-regex'

const ollamaHost =
  process.env.OLLAMA_HOST ?? 'http://vr.local.net:11434'
const ollama = new Ollama({ host: ollamaHost })

const tools = ollamaTools()

async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name !== SEARCH_WEB_TOOL.name) {
    return `Unknown tool: ${name}`
  }
  const query = typeof args?.query === 'string' ? args.query.trim() : ''
  if (!query) {
    return 'Error: missing or invalid "query" argument.'
  }
  const response = await searchWeb(query)
  if (!response?.results?.length) {
    return 'No search results found. (Ensure TAVILY_API_KEY is set on the server.)'
  }
  return formatSearchContext(response)
}

export async function handleAI(prompt: string) {
  try {
    const startTime = Date.now()
    logger.info({ startTime }, 'Starting AI response generation')
    const messages: Message[] = [
      { role: 'system', content: toolsSystemPrompt() },
      { role: 'user', content: prompt },
    ]
    const response = await ollama.chat({
      model: 'qwen3:8b',
      messages,
      tools,
    })
    console.log(response)
    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(startTime, endTime, duration)

    const toolCalls = response.message.tool_calls
    if (toolCalls?.length) {
      messages.push({
        ...response.message,
        content: response.message.content ?? '',
      })
      for (const call of toolCalls) {
        const fn = call.function
        const args =
          typeof fn.arguments === 'string'
            ? (JSON.parse(fn.arguments) as Record<string, unknown>)
            : (fn.arguments ?? {})
        const result = await executeTool(fn.name, args)
        messages.push({
          role: 'tool',
          tool_name: fn.name,
          content: result,
        })
      }
      const finalResponse = await ollama.chat({
        model: 'qwen3:8b',
        messages,
        tools,
      })
      return finalResponse.message.content ?? ''
    }

    return response.message.content ?? ''
  } catch (error: unknown) {
    console.error('Ollama error:', error)
    return 'Sorry, I encountered an error while processing your request. Please try again later.'
  }
}

/** Streams AI response tokens to the socket in real time via 'stream_token' and 'stream_end' events. */
export async function handleAIStreaming(
  socket: ServerSocket,
  message: string,
): Promise<void> {
  try {
    console.log(toolsSystemPrompt())
    const messages: Message[] = [
      // { role: 'system', content: toolsSystemPrompt() },
      { role: 'user', content: message },
    ]

    const stream = await ollama.chat({
      // model: 'deepseek-r1:8b',
      // model: 'orieg/gemma3-tools:12b-it-qat',
      // model: 'gemma3',
      model: 'qwen3:8b',
      messages,
      tools,
      stream: true,
    })


    let content = ''
    let thinking = ''
    const toolCalls: ToolCall[] = []
    for await (const chunk of stream) {
      if (chunk.message.thinking) {
        thinking = chunk.message.thinking
        socket.emit('stream_thinking', thinking)
      }
      if (chunk.message.content) {
        content += chunk.message.content
        socket.emit('stream_token', chunk.message.content)
      }
      if (chunk.message.tool_calls?.length) {
        for (let i = 0; i < chunk.message.tool_calls.length; i++) {
          const incoming = chunk.message.tool_calls[i]
          const existing = toolCalls[i]
          if (!existing) {
            toolCalls[i] = { ...incoming }
          } else {
            toolCalls[i] = {
              function: {
                name: incoming.function.name || existing.function.name,
                arguments: {
                  ...existing.function.arguments,
                  ...incoming.function.arguments,
                },
              },
            }
          }
        }
      }
    }

    if (toolCalls.length) {
      messages.push({
        role: 'assistant',
        content,
        ...(thinking && { thinking }),
        tool_calls: toolCalls,
      })
      for (const call of toolCalls) {
        const fn = call.function
        const args =
          typeof fn.arguments === 'string'
            ? (JSON.parse(fn.arguments) as Record<string, unknown>)
            : (fn.arguments ?? {})
        console.log('executeTool', fn.name, args)
        socket.emit('tool_call', fn.name)
        const result = await executeTool(fn.name, args)
        messages.push({
          role: 'tool',
          tool_name: fn.name,
          content: result,
        })
      }
      const finalStream = await ollama.chat({
        model: 'qwen3:8b',
        messages,
        tools,
        stream: true,
      })
      for await (const chunk of finalStream) {
        const token = chunk.message?.content
        if (typeof token === 'string' && token.length > 0) {
          socket.emit('stream_token', token)
        }
      }
    }

    socket.emit('stream_end')
  } catch (error: unknown) {
    console.error('Ollama streaming error:', error)
    const msg =
      error instanceof Error ? error.message : 'An error occurred while streaming.'
    socket.emit('stream_error', msg)
    socket.emit('stream_end')
  }
}

export async function savePromptHistory(prompt: string) {
  return prompt
}