export interface WindowState {
  x: number | null
  y: number | null
  width: number
  height: number
  is_maximized: boolean
  is_fullscreen: boolean
}

export interface AppVersion {
  app: string
  electron: string
  chrome: string
}

export interface BranchHead {
  id: string
  branch_id: string
  changeset_id: string
  updated_at: string
}

export interface EntityBranchHead {
  id: string
  entity_id: string
  branch_id: string
  changeset_id: string
  updated_at: string
}

export interface BranchMerge {
  id: string
  source_branch_id: string
  target_branch_id: string
  source_changeset_id: string | null
  target_changeset_id: string | null
  status: string
  merged_by: string | null
  created_at: string
}

export interface EntityTag {
  id: string
  entity_id: string
  tag_id: string
  created_at: string
}

export interface EntityEvent {
  id: string
  entity_id: string
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

export interface EntityPropertyValue {
  id: string
  entity_id: string
  property_id: string
  value: string | null
  created_at: string
}

export interface SnapshotBlock {
  id: string
  snapshot_id: string
  block_id: string
  snapshot: Record<string, unknown> | null
  created_at: string
}

export interface Embedding {
  id: string
  entity_id: string | null
  block_id: string | null
  embedding: string
  model: string
  created_at: string
}

export interface EntityFile {
  id: string
  entity_id: string
  file_id: string
  block_id: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface SearchDocument {
  id: string
  entity_id: string
  block_id: string | null
  title: string
  content: string
  tsv: string | null
  created_at: string
  updated_at: string
}
