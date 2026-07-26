"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { User, AuthTokens } from '@/lib/types'

interface SessionContextType {
  user: User | null
  tokens: AuthTokens | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User, tokens: AuthTokens) => void
  logout: () => void
  refreshToken: () => Promise<boolean>
  updateUser: (user: User) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const initialize = useAuthStore(s => s.initialize)
  const user = useAuthStore(s => s.user)
  const tokens = useAuthStore(s => s.tokens)
  const storeIsLoading = useAuthStore(s => s.isLoading)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const login = useAuthStore(s => s.login)
  const logout = useAuthStore(s => s.logout)
  const refreshAccessToken = useAuthStore(s => s.refreshAccessToken)
  const setUser = useAuthStore(s => s.setUser)

  const [ready, setReady] = useState(false)

  useEffect(() => {
    initialize().finally(() => setReady(true))
  }, [initialize])

  const value = useMemo<SessionContextType>(() => ({
    user,
    tokens,
    isLoading: !ready || storeIsLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken: refreshAccessToken,
    updateUser: setUser,
  }), [user, tokens, ready, storeIsLoading, isAuthenticated, login, logout, refreshAccessToken, setUser])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}
