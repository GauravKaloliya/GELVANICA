"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { hasPermission } from "@/lib/services/permissions";
import type { PermissionKey } from "@/lib/services/permissions";

export function usePermissions() {
  const { user } = useAuthStore();
  const { members } = useWorkspaceStore();

  const currentMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user?.id]
  );

  const role = currentMember?.role;

  const can = useMemo(() => {
    return (permission: PermissionKey): boolean => hasPermission(role, permission);
  }, [role]);

  return {
    role,
    currentMember,
    can,
    canRead: hasPermission(role, "READ_ENTITY"),
    canEdit: hasPermission(role, "EDIT_ENTITY"),
    canDelete: hasPermission(role, "DELETE_ENTITY"),
    canManageMembers: hasPermission(role, "MANAGE_MEMBERS"),
    canManageSettings: hasPermission(role, "MANAGE_SETTINGS"),
    canDeleteWorkspace: hasPermission(role, "DELETE_WORKSPACE"),
    canUseAI: hasPermission(role, "AI_ACTIONS"),
    isOwner: role === "owner",
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isViewer: role === "viewer",
  };
}
