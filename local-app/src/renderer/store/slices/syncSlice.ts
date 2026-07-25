import { StateCreator } from 'zustand'
import type { SyncStatusType } from '@shared/types'
import type { StoreState } from '../index'

export interface SyncSlice {
  status: SyncStatusType
  lastSyncedAt: string | null
  pendingChanges: number
  error: string | null

  setStatus: (status: SyncStatusType) => void
  setLastSynced: (time: string | null) => void
  setPendingChanges: (n: number) => void
  setError: (error: string | null) => void
}

export const createSyncSlice: StateCreator<StoreState, [], [], SyncSlice> = (set) => ({
  status: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  error: null,

  setStatus: (status) => set({ status }),

  setLastSynced: (lastSyncedAt) => set({ lastSyncedAt }),

  setPendingChanges: (pendingChanges) => set({ pendingChanges }),

  setError: (error) => set({ error }),
})
