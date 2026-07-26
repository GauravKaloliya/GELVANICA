"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";
import type { Changeset, Snapshot, EntityVersion, DiffEntry, BlockDiffEntry, RestoreResult } from "@/lib/types/version";

export function useVersion(workspaceId: string, entityId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || "Request failed");
      }
      return res.json();
    },
    [token]
  );

  const listChangesets = useCallback(async (): Promise<Changeset[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/versions/changesets?entity_id=${entityId}`);
      return res.data;
    } catch {
      setError("Failed to load changesets");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, entityId, request]);

  const createChangeset = useCallback(
    async (data: { entity_id: string; description: string; parent_changeset_id?: string }): Promise<Changeset> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/versions/changesets`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (e) {
        setError("Failed to create changeset");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  const listSnapshots = useCallback(async (): Promise<Snapshot[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/versions/snapshots?entity_id=${entityId}`);
      return res.data;
    } catch {
      setError("Failed to load snapshots");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, entityId, request]);

  const createSnapshot = useCallback(
    async (data: { entity_id: string; label?: string }): Promise<Snapshot> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/versions/snapshots`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (e) {
        setError("Failed to create snapshot");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  const listEntityVersions = useCallback(async (): Promise<EntityVersion[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/versions/entities/${entityId}`);
      return res.data;
    } catch {
      setError("Failed to load entity versions");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, entityId, request]);

  const restoreVersion = useCallback(
    async (versionId: string): Promise<RestoreResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/versions/${versionId}/restore`, { method: "POST" });
        return res.data;
      } catch (e) {
        setError("Failed to restore version");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  const compareVersions = useCallback(
    async (leftVersionId: string, rightVersionId: string): Promise<DiffEntry | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/versions/compare?left_version_id=${leftVersionId}&right_version_id=${rightVersionId}`);
        return res.data;
      } catch {
        setError("Failed to compare versions");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  const compareDiff = useCallback(
    async (data: { entity_id: string; left_version_id: string; right_version_id: string }): Promise<DiffEntry | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const query = `entity_id=${data.entity_id}&left_version_id=${data.left_version_id}&right_version_id=${data.right_version_id}`;
        const res = await request(`/workspaces/${workspaceId}/diffs/compare?${query}`);
        return res.data;
      } catch {
        setError("Failed to compare diffs");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  const blockDiff = useCallback(
    async (data: { entity_id: string; block_id: string; left_version_id: string; right_version_id: string }): Promise<BlockDiffEntry[] | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/diffs/blocks`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch {
        setError("Failed to compute block diff");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, request]
  );

  return {
    isLoading,
    error,
    listChangesets,
    createChangeset,
    listSnapshots,
    createSnapshot,
    listEntityVersions,
    restoreVersion,
    compareVersions,
    compareDiff,
    blockDiff,
  };
}
