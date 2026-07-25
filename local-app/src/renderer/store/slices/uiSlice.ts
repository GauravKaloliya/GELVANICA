import { StateCreator } from 'zustand'
import type { StoreState } from '../index'

export type RightSidebarTab = 'properties' | 'backlinks' | 'comments' | 'ai' | 'graph' | 'minimap'

export interface UiSlice {
  sidebarOpen: boolean
  rightSidebarOpen: boolean
  rightSidebarTab: RightSidebarTab
  commandPaletteOpen: boolean
  isFullscreen: boolean

  toggleSidebar: () => void
  toggleRightSidebar: () => void
  setRightSidebarTab: (tab: RightSidebarTab) => void
  toggleCommandPalette: () => void
  setFullscreen: (fullscreen: boolean) => void
}

export const createUiSlice: StateCreator<StoreState, [], [], UiSlice> = (set) => ({
  sidebarOpen: true,
  rightSidebarOpen: false,
  rightSidebarTab: 'properties',
  commandPaletteOpen: false,
  isFullscreen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),

  setRightSidebarTab: (rightSidebarTab) =>
    set({ rightSidebarTab, rightSidebarOpen: true }),

  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  setFullscreen: (isFullscreen) => set({ isFullscreen }),
})
