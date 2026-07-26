"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { usePermissions } from "@/hooks/usePermissions";
import { useConfig } from "@/hooks/useConfig";
import { InviteMemberModal, RemoveMemberModal } from "@/components/modals";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { DataTable } from "@/components/ui/DataTable";
import { UserAvatar } from "@/components/ui/Avatar";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getRoleBadgeColor, getRoleName } from "@/lib/services/permissions";
import type { WorkspaceMember } from "@/lib/types";
import { UserPlus, Shield, Trash2 } from "lucide-react";

interface MembersTableProps {
  workspaceId: string;
}

export function MembersTable({ workspaceId }: MembersTableProps) {
  const { tokens, user } = useAuthStore();
  const { members, fetchMembers, inviteMember, removeMember, updateMemberRole } = useWorkspaceStore();
  const { canManageMembers, role: myRole } = usePermissions();
  const { config } = useConfig(workspaceId);
  const memberRoles = config?.member_roles ?? [];

  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    if (tokens?.access_token) {
      fetchMembers(tokens.access_token, workspaceId);
    }
  }, [tokens, workspaceId, fetchMembers]);

  const handleInvite = async (email: string, role: string) => {
    if (!tokens?.access_token) return;
    await inviteMember(tokens.access_token, workspaceId, email, role);
    fetchMembers(tokens.access_token, workspaceId);
  };

  const handleRemove = async () => {
    if (!tokens?.access_token || !removeTarget) return;
    await removeMember(tokens.access_token, workspaceId, removeTarget.user_id);
    setRemoveTarget(null);
  };

  const handleRoleChange = async (member: WorkspaceMember, newRole: string) => {
    if (!tokens?.access_token) return;
    setChangingRole(member.user_id);
    try {
      await updateMemberRole(tokens.access_token, workspaceId, member.user_id, newRole);
    } finally {
      setChangingRole(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Shield className="h-5 w-5 text-muted" />
            Members
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <PermissionGate role={myRole} permission="MANAGE_MEMBERS">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </PermissionGate>
      </div>

      <div className="rounded-lg border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 text-xs text-muted sm:grid-cols-4">
          <div>
            <span className="font-medium text-amber-400">Owner</span>
            <p>Full control</p>
          </div>
          <div>
            <span className="font-medium text-blue-400">Admin</span>
            <p>Manage members</p>
          </div>
          <div>
            <span className="font-medium text-green-400">Editor</span>
            <p>Edit content</p>
          </div>
          <div>
            <span className="font-medium text-muted">Viewer</span>
            <p>Read only</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: "member",
            header: "Member",
            render: (member: WorkspaceMember) => (
              <div className="flex items-center gap-3">
                <UserAvatar name={member.display_name} avatarUrl={member.avatar_url} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{member.display_name || "Unknown"}</p>
                    {member.user_id === user?.id && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{member.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            render: (member: WorkspaceMember) => {
              const isOwner = member.role === "owner";
              const canChangeRole = canManageMembers && !isOwner && member.user_id !== user?.id;
              return canChangeRole ? (
                <PermissionGate role={myRole} permission="MANAGE_MEMBERS">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member, e.target.value)}
                    disabled={changingRole === member.user_id}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium capitalize bg-transparent outline-none",
                      getRoleBadgeColor(member.role),
                      changingRole === member.user_id && "opacity-50"
                    )}
                  >
                    {memberRoles.filter((r) => r !== "owner").map((r) => (
                      <option key={r} value={r} className="bg-surface text-foreground">
                        {getRoleName(r)}
                      </option>
                    ))}
                  </select>
                </PermissionGate>
              ) : (
                <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", getRoleBadgeColor(member.role))}>
                  {getRoleName(member.role)}
                </span>
              );
            },
          },
          {
            key: "joined",
            header: "Joined",
            render: (member: WorkspaceMember) => (
              <span className="text-[11px] text-muted">{formatRelativeTime(member.joined_at)}</span>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (member: WorkspaceMember) => {
              const canRemoveMember = canManageMembers && member.role !== "owner" && member.user_id !== user?.id;
              return canRemoveMember ? (
                <PermissionGate role={myRole} permission="MANAGE_MEMBERS">
                  <button onClick={() => setRemoveTarget(member)} className="rounded p-1 text-muted hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </PermissionGate>
              ) : null;
            },
          },
        ]}
        data={members}
        keyExtractor={(member) => member.id}
        emptyMessage="No members yet"
      />

      <InviteMemberModal open={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} workspaceId={workspaceId} />
      <RemoveMemberModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        memberName={removeTarget?.display_name || "Unknown"}
        memberEmail={removeTarget?.email || ""}
        role={removeTarget?.role || ""}
      />
    </div>
  );
}
