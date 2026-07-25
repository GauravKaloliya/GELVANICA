import { StateCreator } from 'zustand'
import type { StoreState } from '../index'

export interface VersioningSlice {
  activeVersionId: string | null
  versionFilter: {
    branchId: string | null
    entityId: string | null
  }

  setActiveVersion: (id: string | null) => void
  setVersionFilter: (filter: Partial<VersioningSlice['versionFilter']>) => void
}

export const createVersioningSlice: StateCreator<StoreState, [], [], VersioningSlice> = (set) => ({
  activeVersionId: null,
  versionFilter: {
    branchId: null,
    entityId: null,
  },

  setActiveVersion: (activeVersionId) => set({ activeVersionId }),

  setVersionFilter: (filter) =>
    set((state) => ({
      versionFilter: { ...state.versionFilter, ...filter },
    })),
})
