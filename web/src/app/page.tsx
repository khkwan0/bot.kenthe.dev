'use client'

import { useState, FormEvent, useEffect, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSocketContext } from '@/context/SocketContext'

type MessageRole = 'user' | 'assistant'

const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'Compare React and Vue for a new project',
  'Summarize the key ideas of stoicism',
  'What are the best practices for API design?',
]

const markdownComponents: Parameters<typeof ReactMarkdown>[0]['components'] = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="text-[var(--foreground)]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }) =>
    className ? (
      <code className={`block p-2 rounded bg-[var(--foreground)]/10 text-sm overflow-x-auto ${className}`} {...props}>
        {children}
      </code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-[var(--foreground)]/10 text-sm font-mono" {...props}>
        {children}
      </code>
    ),
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
  a: ({ href, children }) => (
    <a href={href ?? '#'} className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-lg font-semibold mt-2 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--accent)]/50 pl-3 my-2 text-[var(--foreground)]/90">
      {children}
    </blockquote>
  ),
}

export default function HomePage() {
  const { socket, sendMessage, isConnected, isConnecting, error } = useSocketContext()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: MessageRole; content: string }[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [toolCallMessage, setToolCallMessage] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const streamEndHandledRef = useRef(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useRef(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }).current

  useLayoutEffect(() => {
    scrollToBottom()
    const id = requestAnimationFrame(scrollToBottom)
    return () => cancelAnimationFrame(id)
  }, [messages, streamingContent, streamingThinking, toolCallMessage, scrollToBottom])

  useEffect(() => {
    if (!socket) return
    const onToken = (token: string) => {
      setStreamError(null)
      setToolCallMessage(null)
      flushSync(() => {
        setStreamingContent((prev) => prev + token)
      })
      scrollToBottom()
      requestAnimationFrame(scrollToBottom)
    }
    const onThinking = (thinking: string) => {
      setStreamError(null)
      setToolCallMessage(null)
      flushSync(() => {
        setStreamingThinking((prev) => prev + thinking)
      })
      scrollToBottom()
      requestAnimationFrame(scrollToBottom)
    }
    const onToolCall = (tool: string) => {
      setStreamError(null)
      const message = tool === 'search_web' ? 'Searching the web...' : 'Calling a tool...'
      setToolCallMessage(message)
      scrollToBottom()
      requestAnimationFrame(scrollToBottom)
    }
    const onEnd = () => {
      setStreamingThinking('')
      setToolCallMessage(null)
      setStreamingContent((prev) => {
        if (prev && !streamEndHandledRef.current) {
          streamEndHandledRef.current = true
          setMessages((m) => [...m, { role: 'assistant', content: prev }])
        }
        return ''
      })
    }
    const onStreamError = (msg: string) => setStreamError(msg)
    socket.on('stream_thinking', onThinking)
    socket.on('tool_call', onToolCall)
    socket.on('stream_token', onToken)
    socket.on('stream_end', onEnd)
    socket.on('stream_error', onStreamError)
    return () => {
      socket.off('stream_thinking', onThinking)
      socket.off('tool_call', onToolCall)
      socket.off('stream_token', onToken)
      socket.off('stream_end', onEnd)
      socket.off('stream_error', onStreamError)
    }
  }, [socket])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = input.trim()
    if (!trimmed) return
    streamEndHandledRef.current = false
    sendMessage(trimmed)
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setStreamingContent('')
    setStreamingThinking('')
    setToolCallMessage(null)
    setStreamError(null)
    setInput('')
  }

  function handleSuggestion(suggestion: string) {
    setInput(suggestion)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  const hasConversation = messages.length > 0 || streamingContent || streamingThinking || toolCallMessage || streamError
  const canSubmit = isConnected && input.trim().length > 0

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-[var(--background)] font-[var(--font-geist-sans)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <span className="text-lg font-semibold text-[var(--foreground)] tracking-tight">
          Ask
        </span>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]" aria-live="polite">
          <span
            className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}
            aria-hidden
          />
          {isConnecting && 'Connecting…'}
          {isConnected && 'Online'}
          {error && !isConnecting && !isConnected && `Error`}
        </div>
      </header>

      {/* Content: centered empty state or conversation */}
      {!hasConversation ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--foreground)] text-center mb-2">
            Ask anything.
          </h1>
          <p className="text-[var(--muted)] text-sm text-center mb-8">
            Type @ for sources and / for shortcuts.
          </p>

          <form action="#" onSubmit={handleSubmit} className="w-full mb-6">
            <div className="relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[var(--accent)]/30 focus-within:border-[var(--accent)]/50 transition-shadow">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask anything..."
                disabled={!isConnected}
                rows={5}
                className="flex-1 min-w-0 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none text-base disabled:opacity-50 disabled:cursor-not-allowed resize-none py-2"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="ml-2 p-2 rounded-full bg-[var(--accent)] text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                aria-label="Send"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestion(s)}
                disabled={!isConnected}
                className="px-4 py-2 rounded-full text-sm text-[var(--muted)] border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--input-bg)] hover:text-[var(--foreground)] hover:border-[var(--muted)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-6 max-w-3xl w-full mx-auto"
          >
            <div className="flex flex-col gap-6">
              {messages.map((msg, i) => (
                <div
                  key={`${i}-${msg.role}-${msg.content.slice(0, 40)}`}
                  className={msg.role === 'user' ? 'flex justify-end' : ''}
                >
                  <div
                    className={
                      msg.role === 'user'
                        ? 'max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[var(--accent)] text-white text-sm'
                        : 'rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] text-sm prose prose-sm max-w-none dark:prose-invert'
                    }
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {streamingThinking && (
                <div className="flex justify-start">
                  <div className="max-w-full rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--input-bg)]/60 border border-[var(--border)] text-[var(--muted)] text-sm prose prose-sm max-w-none dark:prose-invert [&_*]:text-[var(--muted)]">
                    <span className="font-medium mb-1 block">Thinking</span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {streamingThinking}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--muted)] animate-pulse align-middle" aria-hidden />
                  </div>
                </div>
              )}
              {toolCallMessage && (
                <div className="flex justify-start">
                  <p className="text-[var(--muted)] text-sm italic" aria-live="polite">
                    {toolCallMessage}
                  </p>
                </div>
              )}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-full rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {streamingContent}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--accent)] animate-pulse align-middle" aria-hidden />
                  </div>
                </div>
              )}
              {streamError && (
                <div className="rounded-2xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                  {streamError}
                </div>
              )}
            </div>
          </div>

          {/* Sticky input */}
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <form action="#" onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[var(--accent)]/30 focus-within:border-[var(--accent)]/50 transition-shadow">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Ask a follow-up..."
                  disabled={!isConnected}
                  rows={5}
                  className="flex-1 min-w-0 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none py-2"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="p-1.5 rounded-full bg-[var(--accent)] text-white hover:opacity-90 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </main>
  )
}
