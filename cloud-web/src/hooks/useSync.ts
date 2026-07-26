"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";
import { syncService } from "@/lib/services/sync";
import type { SyncDiff } from "@/lib/types";

export function useSync(workspaceId: string) {
  const { tokens } = useAuthStore();
  const {
    status,
    pendingChanges,
    conflictCount,
    lastSyncAt,
    devices,
    conflicts,
    operations,
    isSyncing,
    error,
    offlineQueue,
    setStatus,
    setIsSyncing,
    setError,
    fetchOperations,
    ingestOperation,
    acknowledge,
    resolveConflict,
    addToOfflineQueue,
    processOfflineQueue,
  } = useSyncStore();

  const loadOperations = useCallback(() => {
    if (tokens?.access_token) fetchOperations(tokens.access_token, workspaceId);
  }, [tokens, workspaceId, fetchOperations]);

  const pushOperation = useCallback(
    async (operation: {
      operation_type: string;
      entity_type?: string;
      entity_id?: string;
      payload: Record<string, unknown>;
    }) => {
      if (!tokens?.access_token) return;
      return ingestOperation(tokens.access_token, {
        workspace_id: workspaceId,
        ...operation,
      });
    },
    [tokens, workspaceId, ingestOperation]
  );

  const ackOperation = useCallback(
    async (opId: string) => {
      if (!tokens?.access_token) return;
      return acknowledge(tokens.access_token, workspaceId, opId);
    },
    [tokens, workspaceId, acknowledge]
  );

  const computeDiff = useCallback(
    async (exportData: Record<string, unknown>): Promise<SyncDiff | null> => {
      if (!tokens?.access_token) return null;
      return syncService.diff(workspaceId, exportData).then(res => res.data);
    },
    [tokens, workspaceId]
  );

  const applyDiff = useCallback(
    async (diff: SyncDiff) => {
      if (!tokens?.access_token) return;
      const res = await syncService.applyDiff(workspaceId, diff).then(res => res.data);
      loadOperations();
      return res;
    },
    [tokens, workspaceId, loadOperations]
  );

  const fullSync = useCallback(
    async (exportData: Record<string, unknown>) => {
      if (!tokens?.access_token) return;
      setIsSyncing(true);
      setStatus("syncing");
      try {
        const res = await syncService.syncFromExport(workspaceId, exportData);
        loadOperations();
        return res;
      } catch (e) {
        setError((e as Error).message);
        setStatus("conflict");
        return null;
      } finally {
        setIsSyncing(false);
      }
    },
    [tokens, workspaceId, setIsSyncing, setStatus, setError, loadOperations]
  );

  return {
    status,
    pendingChanges,
    conflictCount,
    lastSyncAt,
    devices,
    conflicts,
    operations,
    isSyncing,
    error,
    offlineQueue,
    loadOperations,
    pushOperation,
    ackOperation,
    computeDiff,
    applyDiff,
    fullSync,
    resolveConflict,
    addToOfflineQueue,
    processOfflineQueue,
  };
}
