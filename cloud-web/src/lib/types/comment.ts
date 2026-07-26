export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Comment {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  block_id: string | null;
  parent_id: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
