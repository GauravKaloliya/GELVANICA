"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
  const store = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    store.initialize().finally(() => setReady(true))
  }, [store])

  const value: SessionContextType = {
    user: store.user,
    tokens: store.tokens,
    isLoading: !ready || store.isLoading,
    isAuthenticated: store.isAuthenticated,
    login: store.login,
    logout: store.logout,
    refreshToken: store.refreshAccessToken,
    updateUser: store.setUser,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}
