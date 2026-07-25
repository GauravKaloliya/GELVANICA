"use client";

import { hasPermission, type PermissionKey } from "@/lib/services/permissions";
import type { WorkspaceMember } from "@/lib/types";

interface PermissionGateProps {
  role: WorkspaceMember["role"] | undefined;
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}

interface RoleGuardProps {
  role: WorkspaceMember["role"] | undefined;
  minimumRole: WorkspaceMember["role"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function RoleGuard({ role, minimumRole, children, fallback = null }: RoleGuardProps) {
  const userLevel = role ? ROLE_LEVELS[role] ?? 0 : 0;
  const requiredLevel = ROLE_LEVELS[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
