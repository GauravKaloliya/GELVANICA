import { useState, useEffect, useCallback, useRef } from 'react'

type HealthStatus = 'healthy' | 'checking' | 'disconnected' | 'reconnecting'

const CHECK_INTERVAL_MS = 10000
const RECONNECT_INTERVAL_MS = 3000

export function useHealthCheck(): { status: HealthStatus; reconnect: () => void } {
  const [status, setStatus] = useState<HealthStatus>('checking')
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearInterval(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const checkHealth = useCallback(async () => {
    if (!window.gnovium) {
      setStatus('disconnected')
      return
    }
    try {
      const result = await window.gnovium.ipc.invoke('auth:is-online') as { online?: boolean }
      if (result?.online) {
        clearReconnectTimer()
        setStatus('healthy')
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('disconnected')
    }
  }, [clearReconnectTimer])

  const reconnect = useCallback(() => {
    clearReconnectTimer()
    setStatus('reconnecting')
    const interval = setInterval(async () => {
      try {
        const result = await window.gnovium?.ipc.invoke('auth:is-online') as { online?: boolean }
        if (result?.online) {
          clearReconnectTimer()
          setStatus('healthy')
        }
      } catch {
        // Keep trying
      }
    }, RECONNECT_INTERVAL_MS)
    reconnectTimerRef.current = interval
  }, [clearReconnectTimer])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, CHECK_INTERVAL_MS)
    return () => {
      clearReconnectTimer()
      clearInterval(interval)
    }
  }, [checkHealth, clearReconnectTimer])

  return { status, reconnect }
}
