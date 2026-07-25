export interface Entity {
  id: string;
  workspace_id: string;
  entity_type_id: string;
  title: string | null;
  icon: string | null;
  cover_image: string | null;
  properties: Record<string, unknown>;
  is_archived: boolean;
  archived_at: string | null;
  created_by: string | null;
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
  icon: string | null;
  config: Record<string, unknown>;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type PropertyType = "text" | "number" | "select" | "multi_select" | "date" | "checkbox" | "url" | "email" | "phone" | "rich_text";

export interface EntityProperty {
  id: string;
  workspace_id: string;
  entity_type_id: string | null;
  name: string;
  property_type: PropertyType;
  config: Record<string, unknown>;
  created_at: string;
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
