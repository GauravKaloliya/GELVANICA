import { useEffect, useCallback } from 'react'
import { useStore } from '../store'

export function useAuth() {
  const user = useStore((s) => s.user)
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const isLoading = useStore((s) => s.isLoading)
  const error = useStore((s) => s.error)
  const setUser = useStore((s) => s.setUser)
  const setLoading = useStore((s) => s.setLoading)
  const setError = useStore((s) => s.setError)

  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      setLoading(true)
      try {
        const profile = await window.gnovium.auth.getProfile()
        if (cancelled) return
        const storedUser = profile && typeof profile === 'object' && 'user' in profile ? profile.user : profile
        if (storedUser && typeof storedUser === 'object' && 'id' in storedUser) {
          setUser(storedUser as import('@shared/types').User)
        } else {
          setUser(null)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initAuth()
    return () => { cancelled = true }
  }, [setUser, setLoading, setError])

  useEffect(() => {
    const cleanupStatus = window.gnovium.auth.onStatusChanged((data) => {
      if (data.authenticated && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    })

    const cleanupCode = window.gnovium.auth.onCodeReceived(async (data) => {
      try {
        setLoading(true)
        const result = await window.gnovium.auth.exchangeCode(data.code) as {
          user?: import('@shared/types').User
          error?: string
        }
        if (result?.error) {
          setError(result.error)
        } else if (result?.user) {
          setUser(result.user)
        }
      } catch {
        setError('Failed to complete authentication')
      } finally {
        setLoading(false)
      }
    })

    return () => {
      cleanupStatus()
      cleanupCode()
    }
  }, [setUser, setLoading, setError])

  const login = useCallback(() => {
    window.gnovium.auth.openWebview()
  }, [])

  const logout = useCallback(async () => {
    try {
      await window.gnovium.auth.logout()
    } catch {
      // Logout locally even if server call fails
    } finally {
      setUser(null)
    }
  }, [setUser])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    setError,
  }
}
