import { StateCreator } from 'zustand'
import type { User } from '@shared/types'
import type { StoreState } from '../index'

export interface AuthSlice {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  setUser: (user: User | null) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (
  set
) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  logout: async () => {
    try {
      await window.gnovium.auth.logout()
    } catch {
      // Logout locally even if server call fails
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
})
