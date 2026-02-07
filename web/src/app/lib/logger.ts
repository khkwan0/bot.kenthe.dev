import pino from 'pino'
const isDev = process.env.NODE_ENV === 'development'
let counter = 0

// In development, use a simple console-based logger to avoid worker thread issues
// In production, use pino for structured JSON logs
const devLogger = {
  trace: (...args: unknown[]) => console.trace('[TRACE]', ...args),
  debug: (...args: unknown[]) => console.debug('[DEBUG]', ...args),
  info: (...args: unknown[]) => console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  fatal: (...args: unknown[]) => console.error('[FATAL]', ...args),
}

export const logger = isDev
  ? (devLogger as pino.Logger)
  : pino({
      level: 'info',
      transport: {
        target: 'pino-roll',
        options: {
          file: './logs/app.log',
          size: '100m',
          mkdir: true,
        },
      },
    })

export const nextRequestId = () => {
  counter++
  return `req-${counter.toString(36)}`
}