import type { WorkspaceMember } from "@/lib/types";

type Role = WorkspaceMember["role"];

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
} as const;

const PERMISSIONS = {
  READ_ENTITY: "viewer",
  CREATE_ENTITY: "editor",
  EDIT_ENTITY: "editor",
  DELETE_ENTITY: "editor",
  ARCHIVE_ENTITY: "editor",
  CREATE_RELATION: "editor",
  DELETE_RELATION: "editor",
  CREATE_COMMENT: "editor",
  EDIT_COMMENT: "editor",
  AI_ACTIONS: "editor",
  MANAGE_MEMBERS: "admin",
  MANAGE_SETTINGS: "admin",
  MANAGE_WORKSPACE: "admin",
  DELETE_WORKSPACE: "owner",
  TRANSFER_OWNERSHIP: "owner",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  const requiredLevel = ROLE_HIERARCHY[PERMISSIONS[permission] as Role];
  const userLevel = ROLE_HIERARCHY[role];
  return userLevel >= requiredLevel;
}

export function canRead(role: Role | undefined): boolean {
  return hasPermission(role, "READ_ENTITY");
}

export function canEdit(role: Role | undefined): boolean {
  return hasPermission(role, "EDIT_ENTITY");
}

export function canDelete(role: Role | undefined): boolean {
  return hasPermission(role, "DELETE_ENTITY");
}

export function canManageMembers(role: Role | undefined): boolean {
  return hasPermission(role, "MANAGE_MEMBERS");
}

export function canManageSettings(role: Role | undefined): boolean {
  return hasPermission(role, "MANAGE_SETTINGS");
}

export function canDeleteWorkspace(role: Role | undefined): boolean {
  return hasPermission(role, "DELETE_WORKSPACE");
}

export function canUseAI(role: Role | undefined): boolean {
  return hasPermission(role, "AI_ACTIONS");
}

export function getRoleName(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getRoleBadgeColor(role: Role): string {
  switch (role) {
    case "owner":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "admin":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "editor":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "viewer":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function canEditEntity(role: Role | undefined, entityOwnerId: string | null, userId: string): boolean {
  if (!role) return false;
  if (role === "owner" || role === "admin") return true;
  if (role === "viewer") return false;
  if (entityOwnerId === userId) return true;
  return hasPermission(role, "EDIT_ENTITY");
}

export function canDeleteEntity(role: Role | undefined, entityOwnerId: string | null, userId: string): boolean {
  if (!role) return false;
  if (role === "owner" || role === "admin") return true;
  if (entityOwnerId === userId) return true;
  return hasPermission(role, "DELETE_ENTITY");
}

export function canComment(role: Role | undefined): boolean {
  return hasPermission(role, "CREATE_COMMENT");
}

export function getPermissionDeniedMessage(permission: PermissionKey): string {
  const messages: Record<PermissionKey, string> = {
    READ_ENTITY: "You need at least Viewer access to view this content.",
    CREATE_ENTITY: "You need Editor access to create entities.",
    EDIT_ENTITY: "You need Editor access to edit entities.",
    DELETE_ENTITY: "You need Editor access to delete entities.",
    ARCHIVE_ENTITY: "You need Editor access to archive entities.",
    CREATE_RELATION: "You need Editor access to create relations.",
    DELETE_RELATION: "You need Editor access to delete relations.",
    CREATE_COMMENT: "You need Editor access to create comments.",
    EDIT_COMMENT: "You need Editor access to edit comments.",
    AI_ACTIONS: "You need Editor access to use AI features.",
    MANAGE_MEMBERS: "You need Admin access to manage members.",
    MANAGE_SETTINGS: "You need Admin access to manage settings.",
    MANAGE_WORKSPACE: "You need Admin access to manage the workspace.",
    DELETE_WORKSPACE: "Only the Owner can delete this workspace.",
    TRANSFER_OWNERSHIP: "Only the Owner can transfer ownership.",
  };
  return messages[permission] || "You don't have permission to perform this action.";
}
