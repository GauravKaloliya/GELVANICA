"use client";

import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useWorkspace() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const stats = useWorkspaceStore((s) => s.stats);
  const members = useWorkspaceStore((s) => s.members);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const fetchWorkspace = useWorkspaceStore((s) => s.fetchWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const fetchStats = useWorkspaceStore((s) => s.fetchStats);
  const fetchMembers = useWorkspaceStore((s) => s.fetchMembers);
  const inviteMember = useWorkspaceStore((s) => s.inviteMember);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const updateMemberRole = useWorkspaceStore((s) => s.updateMemberRole);

  return { workspaces, currentWorkspace, stats, members, isLoading, fetchWorkspaces, fetchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, fetchStats, fetchMembers, inviteMember, removeMember, updateMemberRole };
}
