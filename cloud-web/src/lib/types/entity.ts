export interface Entity {
  id: string;
  workspace_id: string;
  entity_type_id: string;
  name: string | null;
  icon: string | null;
  color: string | null;
  cover_image: string | null;
  parent_id: string | null;
  sort_order: number;
  summary: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
  version: number;
  block_count: number;
  properties?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityType {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  color: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type PropertyType = "text" | "number" | "date" | "select" | "multi_select" | "checkbox" | "url" | "email" | "phone" | "rich_text" | "boolean" | "entity_ref";

export interface EntityProperty {
  id: string;
  workspace_id: string;
  entity_type_id: string | null;
  name: string;
  type: PropertyType;
  description: string | null;
  required: boolean;
  options: Record<string, unknown>;
  config: Record<string, unknown>;
  default_value: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EntityPropertyValue {
  id: string;
  entity_id: string;
  property_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
