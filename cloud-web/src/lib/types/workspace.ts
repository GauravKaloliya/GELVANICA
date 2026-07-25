import type { User } from "./auth";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
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
  joined_at: string;
  updated_at: string;
  user: User;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface WorkspaceStats {
  workspace_id: string;
  entity_count: number;
  block_count: number;
  relation_count: number;
  comment_count: number;
  archived_count: number;
  member_count: number;
  recent_entities: Array<{
    id: string;
    title: string;
    updated_at: string;
  }>;
}
