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

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 50,
  MAX_PER_PAGE: 100,
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

export const AUTH = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_SECONDS: 300,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?`~]{8,128}$/,
} as const;

export const GRAPH = {
  MAX_ITERATIONS: 10000,
  DEFAULT_DEPTH: 2,
} as const;
