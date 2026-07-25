import { API_BASE } from "@/lib/config/constants";
import type { SyncOperation, SyncDiff, SyncApplyResult } from "@/lib/types";

async function syncApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Sync failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const syncService = {
  listOperations: async (token: string, workspaceId: string): Promise<SyncOperation[]> => {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    const res = await syncApi<{ data: SyncOperation[] }>(`/sync/?${params}`, token);
    return res.data;
  },

  ingestOperation: async (
    token: string,
    operation: Partial<SyncOperation> & { workspace_id: string; operation_type: string; payload: Record<string, unknown> }
  ): Promise<SyncOperation> => {
    const res = await syncApi<{ data: SyncOperation }>("/sync/", token, {
      method: "POST",
      body: JSON.stringify(operation),
    });
    return res.data;
  },

  getOperation: async (token: string, id: string): Promise<SyncOperation> => {
    const res = await syncApi<{ data: SyncOperation }>(`/sync/${id}`, token);
    return res.data;
  },

  acknowledge: async (token: string, opId: string): Promise<void> => {
    await syncApi(`/sync/${opId}/ack`, token, { method: "POST" });
  },

  diff: async (
    token: string,
    workspaceId: string,
    exportData: Record<string, unknown>
  ): Promise<SyncDiff> => {
    const res = await syncApi<{ data: SyncDiff }>("/sync/diff", token, {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, export_data: exportData }),
    });
    return res.data;
  },

  applyDiff: async (
    token: string,
    workspaceId: string,
    diff: SyncDiff
  ): Promise<SyncApplyResult> => {
    const res = await syncApi<{ data: SyncApplyResult }>("/sync/apply-diff", token, {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, diff }),
    });
    return res.data;
  },

  resolveConflict: async (
    token: string,
    workspaceId: string,
    data: {
      entity_id: string;
      resolution: "keep_local" | "keep_remote" | "merge";
      merged_data?: Record<string, unknown>;
    }
  ): Promise<{ resolved: boolean }> => {
    const res = await syncApi<{ data: { resolved: boolean } }>("/sync/resolve-conflict", token, {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, ...data }),
    });
    return res.data;
  },

  syncFromExport: async (
    token: string,
    workspaceId: string,
    exportData: Record<string, unknown>
  ): Promise<SyncApplyResult> => {
    const res = await syncApi<{ data: SyncApplyResult }>("/sync/sync-from-export", token, {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, export_data: exportData }),
    });
    return res.data;
  },
};
