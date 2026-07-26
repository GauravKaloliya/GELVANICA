import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/apiClient";
import type { Workspace, WorkspaceMember, WorkspaceStats } from "@/lib/types";

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  stats: WorkspaceStats | null;
  isLoading: boolean;
  error: string | null;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setMembers: (members: WorkspaceMember[]) => void;
  setStats: (stats: WorkspaceStats | null) => void;
  setError: (error: string | null) => void;

  fetchWorkspaces: (token: string) => Promise<void>;
  fetchWorkspace: (token: string, id: string) => Promise<void>;
  createWorkspace: (token: string, data: { name: string; description?: string; settings?: Record<string, unknown> }) => Promise<Workspace>;
  updateWorkspace: (token: string, id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (token: string, id: string) => Promise<void>;
  fetchStats: (token: string, workspaceId: string) => Promise<void>;
  fetchMembers: (token: string, workspaceId: string) => Promise<void>;
  inviteMember: (token: string, workspaceId: string, email: string, role: string) => Promise<void>;
  removeMember: (token: string, workspaceId: string, userId: string) => Promise<void>;
  updateMemberRole: (token: string, workspaceId: string, userId: string, role: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  stats: null,
  isLoading: false,
  error: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setMembers: (members) => set({ members }),
  setStats: (stats) => set({ stats }),
  setError: (error) => set({ error }),

  fetchWorkspaces: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<{ data: Workspace[] }>("/workspaces/", token);
      const workspaces = res.data;
      set({ workspaces, isLoading: false });

      const { currentWorkspace } = get();
      if (!currentWorkspace && workspaces.length > 0) {
        const persistedId = (get() as unknown as { currentWorkspaceId?: string }).currentWorkspaceId;
        const restore = persistedId ? workspaces.find((w) => w.id === persistedId) : null;
        set({ currentWorkspace: restore ?? workspaces[0] });
      }
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchWorkspace: async (token, id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<{ data: Workspace }>(`/workspaces/${id}`, token);
      set({ currentWorkspace: res.data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createWorkspace: async (token, data) => {
    const res = await apiClient.post<{ data: Workspace }>("/workspaces/", data, token);
    const workspace = res.data;
    set({ workspaces: [...get().workspaces, workspace] });
    return workspace;
  },

  updateWorkspace: async (token, id, data) => {
    const res = await apiClient.patch<{ data: Workspace }>(`/workspaces/${id}`, data, token);
    const updated = res.data;
    set({
      workspaces: get().workspaces.map((w) => (w.id === id ? updated : w)),
      currentWorkspace: get().currentWorkspace?.id === id ? updated : get().currentWorkspace,
    });
  },

  deleteWorkspace: async (token, id) => {
    await apiClient.delete(`/workspaces/${id}`, token);
    set({
      workspaces: get().workspaces.filter((w) => w.id !== id),
      currentWorkspace: get().currentWorkspace?.id === id ? null : get().currentWorkspace,
    });
  },

  fetchStats: async (token, workspaceId) => {
    try {
      const res = await apiClient.get<{ data: WorkspaceStats }>(`/workspaces/${workspaceId}/stats`, token);
      set({ stats: res.data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchMembers: async (token, workspaceId) => {
    try {
      const res = await apiClient.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`, token);
      set({ members: res.data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  inviteMember: async (token, workspaceId, email, role) => {
    await apiClient.post(`/workspaces/${workspaceId}/members/invite`, { email, role }, token);
  },

  removeMember: async (token, workspaceId, userId) => {
    await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`, token);
    set({ members: get().members.filter((m) => m.user_id !== userId) });
  },

  updateMemberRole: async (token, workspaceId, userId, role) => {
    await apiClient.patch(`/workspaces/${workspaceId}/members/${userId}`, { role }, token);
    set({
      members: get().members.map((m) =>
        m.user_id === userId ? { ...m, role: role as WorkspaceMember["role"] } : m
      ),
    });
  },
}),
    {
      name: "gnovium-workspace",
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspace?.id,
      }),
    }
  )
);
