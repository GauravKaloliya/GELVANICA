import { useState, useEffect, useCallback } from 'react'
import { API_BASE } from '@lib/api/client'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | null>(null)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastOnlineAt(new Date())
      setWasOffline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setLastOfflineAt(new Date())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkServerOnline = useCallback(async (url: string = `${API_BASE}/health`): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) })
      return res.ok
    } catch {
      return false
    }
  }, [])

  return {
    isOnline,
    wasOffline,
    lastOfflineAt,
    lastOnlineAt,
    checkServerOnline,
  }
}
