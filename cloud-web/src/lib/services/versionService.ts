import { apiClient } from "../apiClient";
import type { EntityVersion, Changeset, Snapshot, DiffEntry } from "../types";

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

export const versionService = {
  listChangesets: (workspaceId: string, entityId: string) =>
    apiClient.get<ChangesetListResponse>(`/workspaces/${workspaceId}/versions/changesets?entity_id=${entityId}`),

  createChangeset: (workspaceId: string, data: {
    entity_id: string;
    description: string;
    parent_changeset_id?: string;
  }) => apiClient.post<ChangesetResponse>(`/workspaces/${workspaceId}/versions/changesets`, data),

  getChangeset: (workspaceId: string, changesetId: string) =>
    apiClient.get<ChangesetResponse>(`/workspaces/${workspaceId}/versions/changesets/${changesetId}`),

  deleteChangeset: (workspaceId: string, changesetId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/versions/changesets/${changesetId}`),

  listSnapshots: (workspaceId: string, entityId: string) =>
    apiClient.get<SnapshotListResponse>(`/workspaces/${workspaceId}/versions/snapshots?entity_id=${entityId}`),

  createSnapshot: (workspaceId: string, data: {
    entity_id: string;
    label?: string;
    description?: string;
  }) => apiClient.post<SnapshotResponse>(`/workspaces/${workspaceId}/versions/snapshots`, data),

  getSnapshot: (workspaceId: string, snapshotId: string) =>
    apiClient.get<SnapshotResponse>(`/workspaces/${workspaceId}/versions/snapshots/${snapshotId}`),

  deleteSnapshot: (workspaceId: string, snapshotId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/versions/snapshots/${snapshotId}`),

  createEntitySnapshot: (workspaceId: string, entityId: string) =>
    apiClient.post<SnapshotResponse>(`/workspaces/${workspaceId}/versions/entities/${entityId}/snapshot`),

  listEntityVersions: (workspaceId: string, entityId: string) =>
    apiClient.get<VersionListResponse>(`/workspaces/${workspaceId}/versions/entities/${entityId}`),

  restoreVersion: (workspaceId: string, versionId: string) =>
    apiClient.post<{ data: unknown }>(`/workspaces/${workspaceId}/versions/${versionId}/restore`),

  getBlockVersions: (workspaceId: string, blockId: string) =>
    apiClient.get<VersionListResponse>(`/workspaces/${workspaceId}/versions/blocks/${blockId}`),

  compare: (workspaceId: string, leftVersionId: string, rightVersionId: string) =>
    apiClient.get<DiffResponse>(
      `/workspaces/${workspaceId}/versions/compare?left_version_id=${leftVersionId}&right_version_id=${rightVersionId}`
    ),
};
