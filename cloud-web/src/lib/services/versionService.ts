import { API_BASE } from "@/lib/config/constants";
import type { EntityVersion, Changeset, Snapshot, DiffEntry, BlockDiffEntry, RestoreResult } from "@/lib/types";

interface VersionResponse {
  data: EntityVersion;
}

interface VersionListResponse {
  data: EntityVersion[];
  meta?: { total: number };
}

interface ChangesetResponse {
  data: Changeset;
}

interface ChangesetListResponse {
  data: Changeset[];
  meta?: { total: number };
}

interface SnapshotResponse {
  data: Snapshot;
}

interface SnapshotListResponse {
  data: Snapshot[];
  meta?: { total: number };
}

interface DiffResponse {
  data: DiffEntry;
}

interface BlockDiffResponse {
  data: BlockDiffEntry[];
}

async function versionApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Version request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const versionService = {
  listEntityVersions: async (token: string, entityId: string): Promise<EntityVersion[]> => {
    const res = await versionApi<VersionListResponse>(`/versions/entities/${entityId}`, token);
    return res.data || [];
  },

  getVersion: async (token: string, versionId: string): Promise<EntityVersion> => {
    const res = await versionApi<VersionResponse>(`/versions/${versionId}`, token);
    return res.data;
  },

  restoreVersion: async (token: string, versionId: string): Promise<RestoreResult> => {
    const res = await versionApi<{ data: RestoreResult }>(`/versions/restore/${versionId}`, token, {
      method: "POST",
    });
    return res.data;
  },

  listChangesets: async (token: string, entityId: string): Promise<Changeset[]> => {
    const res = await versionApi<ChangesetListResponse>(`/versions/changesets?entity_id=${entityId}`, token);
    return res.data || [];
  },

  createChangeset: async (token: string, data: {
    entity_id: string;
    description: string;
    parent_changeset_id?: string;
  }): Promise<Changeset> => {
    const res = await versionApi<ChangesetResponse>("/versions/changesets", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  listSnapshots: async (token: string, entityId: string): Promise<Snapshot[]> => {
    const res = await versionApi<SnapshotListResponse>(`/versions/snapshots?entity_id=${entityId}`, token);
    return res.data || [];
  },

  createSnapshot: async (token: string, data: {
    entity_id: string;
    label?: string;
    description?: string;
  }): Promise<Snapshot> => {
    const res = await versionApi<SnapshotResponse>("/versions/snapshots", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  compare: async (token: string, leftVersionId: string, rightVersionId: string): Promise<DiffEntry> => {
    const res = await versionApi<DiffResponse>(
      `/versions/compare?left_version_id=${leftVersionId}&right_version_id=${rightVersionId}`,
      token
    );
    return res.data;
  },

  compareDiff: async (token: string, data: {
    entity_id: string;
    left_version_id: string;
    right_version_id: string;
  }): Promise<DiffEntry> => {
    const res = await versionApi<DiffResponse>("/diffs/compare", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  blockDiff: async (token: string, data: {
    entity_id: string;
    block_id: string;
    left_version_id: string;
    right_version_id: string;
  }): Promise<BlockDiffEntry[]> => {
    const res = await versionApi<BlockDiffResponse>("/diffs/blocks", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
