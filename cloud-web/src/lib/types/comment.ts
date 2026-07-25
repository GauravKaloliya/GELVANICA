export interface Comment {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  block_id: string | null;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}
