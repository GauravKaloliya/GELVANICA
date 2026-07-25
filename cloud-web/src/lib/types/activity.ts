export interface ActivityEntry {
  id: string;
  workspace_id: string;
  user_id: string | null;
  entity_id: string;
  block_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface EntityEvent {
  id: string;
  workspace_id: string;
  entity_id: string;
  changeset_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
