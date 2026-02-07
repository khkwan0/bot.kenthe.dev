'use client'
import {createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback} from 'react'
import {logger} from '@/lib/logger'
import {io, Socket} from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  sendMessage: (message: string) => void
  disconnect: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({children}: {children: ReactNode}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const sendMessage = useCallback((message: string) => {
    socketRef.current?.emit('message', message)
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  useEffect(() => {
    setIsConnecting(true)
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:33112', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
    })
    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnecting(false)
      setIsConnected(true)
    })
    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })
    newSocket.on('connect_error', (err) => {
      setIsConnecting(false)
      setError(err)
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      setIsConnecting(false)
      setError(null)
      logger.error('Socket disconnected: unmounted')
    }
  }, [])

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    disconnect,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context
}
