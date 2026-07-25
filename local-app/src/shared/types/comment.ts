export interface Comment {
  id: string
  workspace_id: string
  entity_id: string | null
  block_id: string | null
  parent_comment_id: string | null
  author_id: string
  content: string
  is_deleted: boolean
  created_at: string
  updated_at?: string
  user_name?: string
  user_avatar_url?: string
}

export interface CommentCreateRequest {
  workspace_id: string
  entity_id?: string | null
  block_id?: string | null
  parent_comment_id?: string | null
  content: string
}

export interface CommentUpdateRequest {
  content: string
}
