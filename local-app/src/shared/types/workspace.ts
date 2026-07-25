export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  deployment_mode: 'local' | 'cloud'
  settings: Record<string, unknown> | null
  is_deleted: boolean
  is_archived?: boolean
  is_default?: boolean
  branch_count?: number
  storage_used_bytes?: number
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
  updated_at: string
  entity_count?: number
  file_count?: number
}

export interface WorkspaceCreateRequest {
  name: string
  description?: string
  settings?: Record<string, unknown>
}

export interface WorkspaceUpdateRequest {
  name?: string
  description?: string | null
  settings?: Record<string, unknown>
}

export interface WorkspaceStats {
  workspace_id: string
  entity_count: number
  block_count: number
  relation_count: number
  comment_count: number
  archived_count: number
  member_count: number
  recent_entities: Array<{
    id: string
    title: string
    updated_at: string
  }>
}
