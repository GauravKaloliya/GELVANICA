export interface SyncOperation {
  id: string;
  workspace_id: string;
  operation_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  device_id: string | null;
  client_clock: number | null;
  synced: boolean;
  retry_count: number;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface SyncDiff {
  entity_types: unknown[];
  entities: unknown[];
  properties: unknown[];
  relations: unknown[];
  tags: unknown[];
  blocks: unknown[];
  comments: unknown[];
}

export interface SyncApplyResult {
  workspace_id: string;
  synced: {
    entity_types: number;
    entities: number;
    properties: number;
    relations: number;
    tags: number;
    blocks: number;
    comments: number;
  };
}
