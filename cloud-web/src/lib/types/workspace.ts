import type { ActivityEntry } from "./activity";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  owner_id: string;
  my_role: "viewer" | "editor" | "admin" | "owner";
  entity_count: number;
  block_count: number;
  deployment_mode: "local" | "cloud";
  settings: Record<string, unknown>;
  sync_enabled: boolean;
  cloud_workspace_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  email: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface WorkspaceStats {
  workspace: {
    id: string;
    name: string;
    my_role: string;
  };
  stats: {
    entities: number;
    blocks: number;
    files: number;
    relations: number;
    tags: number;
    members: number;
    archived: number;
    storage_used: number;
    storage_quota: number;
  };
  recent_entities: Array<{
    id: string;
    name: string;
    type: string;
    updated_at: string;
  }>;
  recent_activity: ActivityEntry[];
  storage_by_type: Record<string, number>;
}
