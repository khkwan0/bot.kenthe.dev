import { Ollama } from 'ollama'
import type { Socket as ServerSocket } from 'socket.io'

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

/** Streams AI response tokens to the socket in real time via 'stream_token' and 'stream_end' events. */
export async function handleAIStreaming(
  socket: ServerSocket,
  message: string,
): Promise<void> {
  try {
    const stream = await ollama.chat({
      model: 'gemma3',
      messages: [{ role: 'user', content: message }],
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