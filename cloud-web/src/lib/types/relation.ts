export interface Relation {
  id: string;
  workspace_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  generated_by: "manual" | "ai";
  verified: boolean;
  confidence: number | null;
  ai_model: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
