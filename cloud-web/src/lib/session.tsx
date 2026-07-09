"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User, AuthTokens, API_BASE } from '@/lib/api'

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
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!tokens

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.data)
      } else {
        throw new Error('Failed to fetch user profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      logout()
    }
  }

  const login = (userData: User, authTokens: AuthTokens) => {
    setUser(userData)
    setTokens(authTokens)
    localStorage.setItem('access_token', authTokens.access_token)
    localStorage.setItem('refresh_token', authTokens.refresh_token)
  }

  const logout = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const refreshToken = async (): Promise<boolean> => {
    if (!tokens?.refresh_token) {
      logout()
      return false
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
        }),
      })

      if (response.ok) {
        const newTokens = await response.json()
        setTokens(newTokens)
        localStorage.setItem('access_token', newTokens.access_token)
        localStorage.setItem('refresh_token', newTokens.refresh_token)
        return true
      } else {
        logout()
        return false
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      logout()
      return false
    }
  }

  useEffect(() => {
    const initializeSession = async () => {
      const storedAccessToken = localStorage.getItem('access_token')
      const storedRefreshToken = localStorage.getItem('refresh_token')

      if (storedAccessToken && storedRefreshToken) {
        setTokens({ access_token: storedAccessToken, refresh_token: storedRefreshToken })
        await fetchUserProfile(storedAccessToken)
      }

      setIsLoading(false)
    }

    initializeSession()
  }, [])

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  const value: SessionContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    updateUser,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}
