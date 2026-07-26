export interface Branch {
  id: string;
  workspace_id: string;
  parent_branch_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_locked: boolean;
  created_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BranchMerge {
  id: string;
  source_branch_id: string;
  target_branch_id: string;
  created_by: string | null;
  merged_at: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface MergeConflict {
  id: string;
  merge_id: string;
  workspace_id: string;
  entity_id: string;
  conflict_type: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by: string | null;
  resolution: 'source' | 'target' | 'manual' | null;
  resolved_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityBranchHead {
  id: string;
  branch_id: string;
  entity_id: string;
  current_version_id: string | null;
  base_version_id: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BranchHead {
  branch_id: string;
  entity_id: string;
  block_id: string;
  block_created_at: string;
}
