import {createServer} from 'http'
import next from 'next'
import {Server as SocketIOServer} from 'socket.io'
import {logger} from './src/app/lib/logger'
import {handleAIStreaming, handleAI} from '@/lib/ai'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME ?? '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({dev, hostname, port})
const handle = app.getRequestHandler()

// Debug: Log environment
logger.info('=== SERVER STARTING ===')
logger.info('NODE_ENV: ' + process.env.NODE_ENV || 'not set')
logger.info('dev mode: ' + dev)
logger.info(
  'Logger isDev ' + (process.env.NODE_ENV === 'development' ? 'true' : 'false'),
)

app.prepare().then(() => {
  const httpServer = createServer(handle)
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  })
  io.on('connection', socket => {
    logger.info('A user connected')

    socket.on('message', (message: unknown) => {
      const text = typeof message === 'string' ? message : String(message)
      logger.info({ text }, 'Received message')
      handleAIStreaming(socket, text)
      // handleAI(text)
    })

    socket.on('disconnect', () => {
      logger.info('A user disconnected')
    })
  })

  httpServer.listen(port, () => {
    logger.info(`Ready on http://${hostname}:${port}`)
  })
})