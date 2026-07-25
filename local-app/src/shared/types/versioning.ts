export interface Branch {
  id: string
  workspace_id: string
  parent_branch_id: string | null
  name: string
  description: string | null
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface BranchCreateRequest {
  workspace_id: string
  parent_branch_id?: string | null
  name: string
  description?: string
  is_default?: boolean
}

export interface MergeBranchRequest {
  source_branch_id: string
  target_branch_id: string
}

export interface Changeset {
  id: string
  branch_id: string
  snapshot_id: string | null
  message: string | null
  created_by: string | null
  created_at: string
}

export interface Snapshot {
  id: string
  branch_id: string
  name: string | null
  description: string | null
  created_by: string | null
  created_at: string
}

export interface EntityVersion {
  id: string
  entity_id: string
  changeset_id: string | null
  snapshot: Record<string, unknown> | null
  content_hash: string | null
  created_at: string
}

export interface BlockVersion {
  id: string
  block_id: string
  changeset_id: string | null
  snapshot: Record<string, unknown> | null
  content_hash: string | null
  created_at: string
}

export interface DiffFieldComparison {
  left: unknown
  right: unknown
}

export interface VersionCompareResponse {
  left_version_id: string
  right_version_id: string
  diff: Record<string, DiffFieldComparison>
}

export interface RestoreResponse {
  entity_id: string
  restored_version_id: string
  restored_at: string
  blocks_restored: number
}

export interface ChangesetCreateRequest {
  branch_id: string
  snapshot_id?: string | null
  message?: string
}

export interface SnapshotCreateRequest {
  branch_id: string
  name?: string
  description?: string
}

export interface DiffCompareRequest {
  left_version_id: string
  right_version_id: string
}

export interface BlockDiffFieldComparison {
  left: unknown
  right: unknown
}

export interface BlockDiffResponse {
  entity_id: string
  diff: Record<string, BlockDiffFieldComparison>
}

export interface MergeConflict {
  id: string
  merge_id: string
  entity_id: string
  conflict_type: string
  details: Record<string, unknown>
  resolved: boolean
  resolved_by?: string
  resolution?: string
  resolved_at?: string
}

export interface Version {
  id: string
  entity_id: string
  version_number: number
  branch_name?: string
  description?: string
  changeset_summary?: string
  stats?: {
    additions?: number
    deletions?: number
    blocks_changed?: number
  }
  author_name?: string
  created_at: string
}

export interface EntitySnapshotResponse {
  entity_id: string
  snapshot_id: string
  changeset_id: string
  created_at: string
  blocks_captured: number
}
