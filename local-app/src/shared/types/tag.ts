export interface Tag {
  id: string
  workspace_id: string
  name: string
  color: string | null
  created_at: string
  entity_count?: number
}

export interface TagCreateRequest {
  workspace_id: string
  name: string
  color?: string | null
}

export interface TagUpdateRequest {
  name?: string
  color?: string | null
}
