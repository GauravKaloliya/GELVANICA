import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StoreState } from './types'
import { createAuthSlice } from './slices/authSlice'
import { createWorkspaceSlice } from './slices/workspaceSlice'
import { createEditorSlice } from './slices/editorSlice'
import { createUiSlice } from './slices/uiSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { createSyncSlice } from './slices/syncSlice'
import { createGraphSlice } from './slices/graphSlice'
import { createSearchSlice } from './slices/searchSlice'
import { createVersioningSlice } from './slices/versioningSlice'
import { createNotificationsSlice } from './slices/notificationsSlice'

export type { StoreState } from './types'

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createWorkspaceSlice(...args),
      ...createEditorSlice(...args),
      ...createUiSlice(...args),
      ...createSettingsSlice(...args),
      ...createSyncSlice(...args),
      ...createGraphSlice(...args),
      ...createSearchSlice(...args),
      ...createVersioningSlice(...args),
      ...createNotificationsSlice(...args),
    }),
    {
      name: 'gnovium-store',
      storage: createJSONStorage(() => {
        try {
          return {
            getItem: (name: string) => {
              const raw = localStorage.getItem(name)
              return raw ?? null
            },
            setItem: (name: string, value: string) => {
              localStorage.setItem(name, value)
            },
            removeItem: (name: string) => {
              localStorage.removeItem(name)
            },
          }
        } catch {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
      }),
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        sidebarOpen: state.sidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        rightSidebarTab: state.rightSidebarTab,
        isFullscreen: state.isFullscreen,
        settings: state.settings,
        status: state.status,
        lastSyncedAt: state.lastSyncedAt,
        pendingChanges: state.pendingChanges,
        searchMode: state.searchMode,
        searchHistory: state.searchHistory,
        graphLayout: state.graphLayout,
        notifications: state.notifications.slice(0, 50),
      }),
      version: 2,
      migrate: (persisted, version) => {
        const p = persisted as Partial<StoreState>
        if (version === 0) {
          return {
            ...p,
            rightSidebarTab: (p as Record<string, unknown>)['rightSidebarTab'] ?? 'properties',
          } as StoreState
        }
        if (version === 1) {
          return { ...p } as StoreState
        }
        return p as StoreState
      },
    }
  )
)
