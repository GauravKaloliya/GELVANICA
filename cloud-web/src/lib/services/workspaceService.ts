import { apiClient } from "../apiClient";
import type { Workspace, WorkspaceMember, WorkspaceStats } from "../types";

interface WorkspaceListResponse {
  data: Workspace[];
  meta?: { total: number };
}

interface WorkspaceResponse {
  data: Workspace;
}

interface MemberListResponse {
  data: WorkspaceMember[];
  meta?: { total: number };
}

interface MemberResponse {
  data: WorkspaceMember;
}

interface StatsResponse {
  data: WorkspaceStats;
}

export const workspaceService = {
  list: () =>
    apiClient.get<WorkspaceListResponse>("/workspaces/"),

  create: (data: { name: string; description?: string; settings?: Record<string, unknown> }) =>
    apiClient.post<WorkspaceResponse>("/workspaces/", data),

  get: (workspaceId: string) =>
    apiClient.get<WorkspaceResponse>(`/workspaces/${workspaceId}`),

  update: (workspaceId: string, data: { name?: string; description?: string; settings?: Record<string, unknown> }) =>
    apiClient.patch<WorkspaceResponse>(`/workspaces/${workspaceId}`, data),

  delete: (workspaceId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}`),

  restore: (workspaceId: string) =>
    apiClient.post<WorkspaceResponse>(`/workspaces/${workspaceId}/restore`),

  getStats: (workspaceId: string) =>
    apiClient.get<StatsResponse>(`/workspaces/${workspaceId}/stats`),

  listMembers: (workspaceId: string) =>
    apiClient.get<MemberListResponse>(`/workspaces/${workspaceId}/members`),

  getMember: (workspaceId: string, userId: string) =>
    apiClient.get<MemberResponse>(`/workspaces/${workspaceId}/members/${userId}`),

  inviteMember: (workspaceId: string, data: { email: string; role: "admin" | "editor" | "viewer" }) =>
    apiClient.post<MemberResponse>(`/workspaces/${workspaceId}/members/invite`, data),

  updateMember: (workspaceId: string, userId: string, data: { role: "admin" | "editor" | "viewer" }) =>
    apiClient.patch<MemberResponse>(`/workspaces/${workspaceId}/members/${userId}`, data),

  removeMember: (workspaceId: string, userId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`),
};
