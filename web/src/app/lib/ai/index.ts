import { Ollama } from 'ollama'
import type { Socket as ServerSocket } from 'socket.io'
import {
  isWebSearchEnabled,
  searchWeb,
  formatSearchContext,
} from '@/lib/search/tavily'

const ollamaHost =
  process.env.OLLAMA_HOST ?? 'http://vr.local.net:11434'
const ollama = new Ollama({ host: ollamaHost })

export async function handleAI(prompt: string) {
  try {
    const startTime = Date.now()
    console.log('Starting AI response generation', startTime)
    const response = await ollama.chat({
      model: 'gemma3',
      messages: [
        /*
        {
          role: 'system',
          content: 'You are a pirate, speak like a pirate',  
        },
        */
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(startTime, endTime, duration)
    return response.message.content
  } catch (error: unknown) {
    console.error('Ollama error:', error)
    return 'Sorry, I encountered an error while processing your request. Please try again later.'
  }
}

const RAG_SYSTEM_PROMPT = `You are a helpful assistant with access to up-to-date web search results. Use the provided search context to answer accurately. Cite sources using [1], [2], etc. and list "Sources:" at the end with the same numbers and URLs. If the context does not contain relevant information, say so and answer from general knowledge.`

/** Streams AI response tokens to the socket in real time via 'stream_token' and 'stream_end' events. */
export async function handleAIStreaming(
  socket: ServerSocket,
  message: string,
): Promise<void> {
  try {
    let messages: { role: 'system' | 'user'; content: string }[]

    if (isWebSearchEnabled()) {
      const searchResponse = await searchWeb(message)
      if (searchResponse?.results?.length) {
        const context = formatSearchContext(searchResponse)
        messages = [
          { role: 'system', content: RAG_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Search context:\n${context}\n\nUser question: ${message}`,
          },
        ]
      } else {
        messages = [{ role: 'user', content: message }]
      }
    } else {
      messages = [{ role: 'user', content: message }]
    }

    const stream = await ollama.chat({
      model: 'gemma3',
      messages,
      stream: true,
    })
    for await (const chunk of stream) {
      const content = chunk.message?.content
      if (typeof content === 'string' && content.length > 0) {
        socket.emit('stream_token', content)
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