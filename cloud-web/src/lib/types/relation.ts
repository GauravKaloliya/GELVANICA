export interface Relation {
  id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  type: string;
  label: string | null;
  properties: Record<string, unknown>;
  generated_by: "manual" | "ai";
  verified: boolean;
  confidence: number | null;
  ai_model: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
