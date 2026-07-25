import type { Entity } from "./entity";

export interface Changeset {
  id: string;
  branch_id: string;
  snapshot_id: string | null;
  message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Snapshot {
  id: string;
  branch_id: string;
  name: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EntityVersion {
  id: string;
  entity_id: string;
  changeset_id: string | null;
  snapshot: Record<string, unknown>;
  content_hash: string;
  created_at: string;
}

export interface BlockVersion {
  id: string;
  block_id: string;
  changeset_id: string | null;
  snapshot: Record<string, unknown>;
  content_hash: string;
  created_at: string;
}

export interface DiffEntry {
  left_version_id: string;
  right_version_id: string;
  diff: Record<string, { left: unknown; right: unknown }>;
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
