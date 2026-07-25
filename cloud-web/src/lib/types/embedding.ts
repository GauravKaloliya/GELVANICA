export interface Embedding {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  block_id: string | null;
  model: string;
  embedding: unknown;
  content_hash: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
