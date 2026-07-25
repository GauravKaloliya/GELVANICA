import { StateCreator } from 'zustand'
import type { Workspace, WorkspaceStats } from '@shared/types'
import type { StoreState } from '../index'

export interface WorkspaceSlice {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  stats: WorkspaceStats | null

  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (id: string | null) => void
  setStats: (stats: WorkspaceStats | null) => void
  addWorkspace: (workspace: Workspace) => void
  removeWorkspace: (id: string) => void
}

export const createWorkspaceSlice: StateCreator<StoreState, [], [], WorkspaceSlice> = (
  set
) => ({
  workspaces: [],
  activeWorkspaceId: null,
  stats: null,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setActiveWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId }),

  setStats: (stats) => set({ stats }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId:
        state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
    })),
})
