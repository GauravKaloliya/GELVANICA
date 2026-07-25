export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_id: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
