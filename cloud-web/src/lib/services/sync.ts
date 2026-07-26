import { apiClient } from "../apiClient";
import type { SyncOperation, SyncDiff, SyncApplyResult } from "@/lib/types";

export const syncService = {
  listOperations: (workspaceId: string) =>
    apiClient.get<{data: SyncOperation[]}>(`/workspaces/${workspaceId}/sync`),

  ingestOperation: (workspaceId: string, operation: { operation_type: string; payload: Record<string, unknown>; device_id?: string | null; client_clock?: number | null; entity_type?: string | null; entity_id?: string | null }) =>
    apiClient.post<{data: SyncOperation}>(`/workspaces/${workspaceId}/sync`, operation),

  getOperation: (workspaceId: string, id: string) =>
    apiClient.get<{data: SyncOperation}>(`/workspaces/${workspaceId}/sync/${id}`),

  acknowledge: (workspaceId: string, opId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/sync/${opId}/ack`),

  diff: (workspaceId: string, exportData: Record<string, unknown>) =>
    apiClient.post<{data: SyncDiff}>(`/workspaces/${workspaceId}/sync/diff`, { export_data: exportData }),

  applyDiff: (workspaceId: string, diff: SyncDiff) =>
    apiClient.post<{data: SyncApplyResult}>(`/workspaces/${workspaceId}/sync/apply-diff`, { diff }),

  resolveConflict: (workspaceId: string, data: { entity_id: string; resolution: "keep_local" | "keep_remote" | "merge"; merged_data?: Record<string, unknown> }) =>
    apiClient.post<{data: {resolved: boolean}}>(`/workspaces/${workspaceId}/sync/resolve-conflict`, data),

  resolveConflictById: (workspaceId: string, conflictId: string, data: { resolution: "keep_local" | "keep_remote" | "merge"; merged_data?: Record<string, unknown> }) =>
    apiClient.post<{data: {resolved: boolean}}>(`/workspaces/${workspaceId}/sync/conflicts/${conflictId}/resolve`, data),

  syncFromExport: (workspaceId: string, exportData: Record<string, unknown>) =>
    apiClient.post<{data: SyncApplyResult}>(`/workspaces/${workspaceId}/sync/sync-from-export`, { export_data: exportData }),

  push: (workspaceId: string, operations: SyncOperation[]) =>
    apiClient.post<{data: {synced: number}}>(`/workspaces/${workspaceId}/sync/push`, { operations }),

  pull: (workspaceId: string, lastSyncedAt?: string) =>
    apiClient.post<{data: {operations: SyncOperation[]; last_synced_at: string}}>(`/workspaces/${workspaceId}/sync/pull`, { last_synced_at: lastSyncedAt }),

  fullSync: (workspaceId: string) =>
    apiClient.post<{data: {operations: SyncOperation[]}}>(`/workspaces/${workspaceId}/sync/full-sync`),

  status: (workspaceId: string) =>
    apiClient.get<{data: {pending_count: number; last_synced_at: string | null}}>(`/workspaces/${workspaceId}/sync/status`),

  getChanges: (workspaceId: string, since?: string) =>
    apiClient.get<{data: {changes: unknown[]}}>(`/workspaces/${workspaceId}/sync/changes${since ? `?since=${since}` : ""}`),
};
