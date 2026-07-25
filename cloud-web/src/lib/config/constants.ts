export const APP_NAME = "Gnovium";
export const APP_DESCRIPTION = "Knowledge Operating System";
export const APP_URL = process.env.NEXT_PUBLIC_CLOUD_WEB_URL || "http://localhost:3000";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + (process.env.NEXT_PUBLIC_API_BASE_PATH || "/api/v1");

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH || "/api/v1";

export const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || API_URL;

export const AUTH_API_BASE = AUTH_API_URL + API_BASE_PATH;

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const DICEBEAR_URL = "https://api.dicebear.com/7.x/identicon/svg";

export const DESKTOP_AUTH_SCHEME = "gnovium-auth";

export const STORAGE_KEYS = {
  THEME: "gnovium-theme",
  WORKSPACE_ID: "gnovium-workspace-id",
  SIDEBAR_COLLAPSED: "gnovium-sidebar-collapsed",
} as const;

export const ROUTES = {
  HOME: "/",
  AUTH: "/auth/sign-in",
  SIGN_IN: "/auth/sign-in",
  SIGN_UP: "/auth/sign-up",
  AUTH_CALLBACK: "/auth/callback",
  DESKTOP_AUTH: "/auth/sign-in?source=desktop",
  ONBOARDING: "/onboarding",
  WORKSPACES: "/workspaces",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  INVITE: (token: string) => `/invites/${token}`,

  workspace: (id: string) => `/workspace/${id}`,
  workspaceDashboard: (id: string) => `/workspace/${id}/dashboard`,
  workspaceEntities: (id: string) => `/workspace/${id}/entities`,
  workspaceEntity: (id: string, entityId: string) => `/workspace/${id}/entity/${entityId}`,
  workspaceVersions: (id: string, entityId: string) => `/workspace/${id}/entity/${entityId}/versions`,
  workspaceBranches: (id: string, entityId: string) => `/workspace/${id}/entity/${entityId}/branches`,
  workspaceGraph: (id: string) => `/workspace/${id}/graph`,
  workspaceSearch: (id: string) => `/workspace/${id}/search`,
  workspaceFiles: (id: string) => `/workspace/${id}/files`,
  workspaceTags: (id: string) => `/workspace/${id}/tags`,
  workspaceGovernance: (id: string) => `/workspace/${id}/governance`,
  workspaceActivity: (id: string) => `/workspace/${id}/activity`,
  workspaceSync: (id: string) => `/workspace/${id}/sync`,
  workspaceSettings: (id: string) => `/workspace/${id}/settings`,
  workspaceMembers: (id: string) => `/workspace/${id}/settings/members`,
  workspaceAI: (id: string) => `/workspace/${id}/settings/ai`,
  workspaceSyncSettings: (id: string) => `/workspace/${id}/settings/sync`,
  workspaceEntityTypes: (id: string) => `/workspace/${id}/settings/entity-types`,
  workspaceNotifications: (id: string) => `/workspace/${id}/settings/notifications`,
} as const;

export const ENTITY_TYPES = {
  PAGE: "page",
  NOTE: "note",
  TASK: "task",
  DOCUMENT: "document",
  BOOKMARK: "bookmark",
  FILE: "file",
} as const;

export const BLOCK_TYPES = [
  "text",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list",
  "numbered_list",
  "to_do",
  "code",
  "quote",
  "callout",
  "image",
  "divider",
  "table",
  "toggle",
  "embed",
  "equation",
  "mention",
  "ai",
] as const;

export const RELATION_TYPES = [
  "refers_to",
  "depends_on",
  "part_of",
  "related_to",
  "implements",
  "extends",
  "blocks",
  "follows",
] as const;

export const MEMBER_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export const SEARCH_MODES = ["keyword", "full_text", "hybrid", "semantic"] as const;

export const NOTIFICATION_TYPES = ["mention", "comment", "update", "entity_update", "relation_created", "backup_complete", "sync_conflict", "invite", "system"] as const;

export const SYNC_OPERATION_TYPES = [
  "entity_create",
  "entity_update",
  "entity_delete",
  "block_create",
  "block_update",
  "block_delete",
  "relation_create",
  "relation_delete",
] as const;

export const PROPERTY_TYPES = ["text", "number", "select", "multi_select", "date", "checkbox", "url", "email", "phone", "rich_text"] as const;

export const GOVERNANCE_THRESHOLDS = {
  EXCELLENT: 90,
  NEEDS_ATTENTION: 70,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 50,
  MAX_PER_PAGE: 50,
} as const;

export const RATE_LIMITS = {
  CLOUD: 600,
  LOCAL: 1200,
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE_MB: 100,
  ALLOWED_EXTENSIONS: [
    "jpg", "jpeg", "png", "gif", "webp", "svg",
    "pdf", "doc", "docx", "txt", "md",
    "json", "csv",
    "mp4", "mp3", "zip",
  ],
} as const;

export const TOKEN = {
  ACCESS_EXPIRY_MS: 30 * 60 * 1000,
  REFRESH_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
} as const;
