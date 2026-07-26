export interface ActivityEntry {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  user_id: string | null;
  display_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityEvent {
  id: string; workspace_id: string; entity_id: string; user_id: string | null;
  changeset_id: string | null; event_type: string; payload: Record<string, unknown>;
  created_at: string; is_deleted: boolean; deleted_at: string | null; deleted_by: string | null;
}
