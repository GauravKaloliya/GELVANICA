import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/apiClient";
import type { SyncOperation } from "@/lib/types";

type SyncStatus = "idle" | "syncing" | "conflict" | "offline";
type DeviceType = "desktop" | "web" | "mobile";

export interface SyncDevice {
  id: string;
  name: string;
  type: DeviceType;
  lastSyncAt: string | null;
  status: "synced" | "syncing" | "offline";
}

interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: unknown;
  cloudVersion: unknown;
  detectedAt: string;
}

interface OfflineQueueItem {
  id: string;
  operation: string;
  payload: unknown;
  timestamp: string;
}

interface SyncState {
  status: SyncStatus;
  pendingChanges: number;
  conflictCount: number;
  lastSyncAt: string | null;
  devices: SyncDevice[];
  conflicts: SyncConflict[];
  operations: SyncOperation[];
  isSyncing: boolean;
  error: string | null;
  offlineQueue: OfflineQueueItem[];

  setStatus: (status: SyncStatus) => void;
  setIsSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;

  fetchOperations: (token: string, workspaceId: string) => Promise<void>;
  fetchDevices: (token: string, workspaceId: string) => Promise<void>;
  fetchConflicts: (token: string, workspaceId: string) => Promise<void>;
  ingestOperation: (token: string, operation: Partial<SyncOperation> & {
    workspace_id: string;
    operation_type: string;
    payload: Record<string, unknown>;
  }) => Promise<void>;
  acknowledge: (token: string, workspaceId: string, opId: string) => Promise<void>;
  syncFromExport: (token: string, workspaceId: string, exportData: Record<string, unknown>) => Promise<void>;
  resolveConflict: (token: string, workspaceId: string, conflictId: string, resolution: "local_wins" | "remote_wins" | "manual", mergedData?: Record<string, unknown>) => Promise<void>;
  addToOfflineQueue: (operation: string, payload: unknown, workspaceId: string) => void;
  processOfflineQueue: (token: string, workspaceId: string) => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
  status: "idle",
  pendingChanges: 0,
  conflictCount: 0,
  lastSyncAt: null,
  devices: [],
  conflicts: [],
  operations: [],
  isSyncing: false,
  error: null,
  offlineQueue: [],

  setStatus: (status) => set({ status }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ error }),

  fetchOperations: async (token, workspaceId) => {
    try {
      const res = await apiClient.get<{ data: SyncOperation[] }>(`/workspaces/${workspaceId}/sync`, token);
      set({ operations: res.data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchDevices: async (token, workspaceId) => {
    try {
      const res = await apiClient.get<{ data: SyncDevice[] }>(`/workspaces/${workspaceId}/sync/devices`, token);
      set({ devices: res.data });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchConflicts: async (token, workspaceId) => {
    try {
      const res = await apiClient.get<{ data: SyncConflict[] }>(`/workspaces/${workspaceId}/sync/conflicts`, token);
      set({ conflicts: res.data, conflictCount: res.data.length });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  ingestOperation: async (token, operation) => {
    set({ isSyncing: true, status: "syncing" });
    try {
      const wsId = operation.workspace_id;
      const res = await apiClient.post<{ data: SyncOperation }>(`/workspaces/${wsId}/sync`, operation, token);
      set({
        operations: [...get().operations, res.data],
        pendingChanges: get().pendingChanges + 1,
        isSyncing: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isSyncing: false, status: "idle" });
    }
  },

  acknowledge: async (token, workspaceId, opId) => {
    try {
      await apiClient.post(`/workspaces/${workspaceId}/sync/${opId}/ack`, undefined, token);
      set({ pendingChanges: Math.max(0, get().pendingChanges - 1) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  syncFromExport: async (token, workspaceId, exportData) => {
    set({ isSyncing: true, status: "syncing" });
    try {
      await apiClient.post(`/workspaces/${workspaceId}/sync/sync-from-export`, { export_data: exportData }, token);
      set({
        lastSyncAt: new Date().toISOString(),
        status: "idle",
        isSyncing: false,
        pendingChanges: 0,
      });
    } catch (e) {
      set({ error: (e as Error).message, isSyncing: false, status: "conflict" });
    }
  },

  resolveConflict: async (token, workspaceId, conflictId, resolution, mergedData) => {
    try {
      await apiClient.post(`/workspaces/${workspaceId}/sync/conflicts/${conflictId}/resolve`, {
        resolution,
        merged_data: mergedData,
      }, token);
      set({
        conflicts: get().conflicts.filter((c) => c.id !== conflictId),
        conflictCount: Math.max(0, get().conflictCount - 1),
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addToOfflineQueue: (operation, payload, workspaceId) => {
    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      operation,
      payload: { ...(payload as Record<string, unknown>), workspace_id: workspaceId },
      timestamp: new Date().toISOString(),
    };
    set({ offlineQueue: [...get().offlineQueue, item] });
  },

  processOfflineQueue: async (token, workspaceId) => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;
    for (const item of queue) {
      try {
        await apiClient.post(`/workspaces/${workspaceId}/sync`, { operation_type: item.operation, payload: item.payload }, token);
      } catch {
        break;
      }
    }
    set({ offlineQueue: get().offlineQueue.slice(queue.length) });
  },
}),
    {
      name: "gnovium-sync",
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
