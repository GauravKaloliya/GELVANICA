import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export function useSession() {
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000

  const user = useStore((s) => s.user)
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const isLoading = useStore((s) => s.isLoading)
  const logout = useStore((s) => s.logout)

  useEffect(() => {
    if (!isAuthenticated) {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current)
        sessionTimerRef.current = null
      }
      return
    }

    const handleExpired = () => {
      logout()
    }

    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current)
    }
    sessionTimerRef.current = setTimeout(handleExpired, SESSION_TIMEOUT_MS)

    const handleActivity = () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current)
      }
      sessionTimerRef.current = setTimeout(handleExpired, SESSION_TIMEOUT_MS)
    }

    document.addEventListener('mousemove', handleActivity)
    document.addEventListener('keydown', handleActivity)
    document.addEventListener('click', handleActivity)

    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current)
        sessionTimerRef.current = null
      }
      document.removeEventListener('mousemove', handleActivity)
      document.removeEventListener('keydown', handleActivity)
      document.removeEventListener('click', handleActivity)
    }
  }, [isAuthenticated, logout, SESSION_TIMEOUT_MS])

  return {
    user,
    isAuthenticated,
    isLoading,
  }
}
