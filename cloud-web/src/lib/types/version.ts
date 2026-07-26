import type { Entity } from "./entity";

export interface Changeset {
  id: string;
  branch_id: string;
  snapshot_id: string | null;
  message: string | null;
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Snapshot {
  id: string;
  branch_id: string;
  name: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityVersion {
  id: string;
  entity_id: string;
  branch_id: string | null;
  changeset_id: string | null;
  snapshot_id: string | null;
  version: number;
  message: string | null;
  snapshot: Record<string, unknown>;
  content_hash: string;
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BlockVersion {
  id: string;
  block_id: string;
  changeset_id: string | null;
  snapshot: Record<string, unknown>;
  content_hash: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface DiffEntry {
  from_version: number;
  to_version: number;
  summary: {
    blocks_added: number;
    blocks_removed: number;
    blocks_modified: number;
  };
  changes: Array<{
    block_id: string;
    type: 'added' | 'removed' | 'modified';
    block_type: string;
    from: Record<string, unknown> | null;
    to: Record<string, unknown> | null;
  }>;
}

export interface BlockDiffEntry {
  type: "added" | "removed" | "modified";
  block_id: string;
  entity_id: string;
  snapshot?: Record<string, unknown>;
}

export type RestoreResult = Entity;

export interface SnapshotBlock {
  snapshot_id: string;
  block_id: string;
  block_created_at: string | null;
  entity_id: string;
}
