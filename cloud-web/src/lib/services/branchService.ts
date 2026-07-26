import { apiClient } from "../apiClient";
import type { Branch, BranchMerge, MergeConflict } from "../types";

interface BranchListResponse {
  data: Branch[];
  meta?: { total: number };
}

interface BranchResponse {
  data: Branch;
}

interface MergeResponse {
  data: BranchMerge;
}

interface ConflictListResponse {
  data: MergeConflict[];
}

interface ConflictResponse {
  data: MergeConflict;
}

export const branchService = {
  list: (workspaceId: string, params?: { entity_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    const qs = sp.toString();
    return apiClient.get<BranchListResponse>(`/workspaces/${workspaceId}/branches${qs ? `?${qs}` : ""}`);
  },

  get: (workspaceId: string, branchId: string) =>
    apiClient.get<BranchResponse>(`/workspaces/${workspaceId}/branches/${branchId}`),

  create: (workspaceId: string, data: {
    entity_id?: string;
    name: string;
    description?: string;
    from_branch_id?: string;
  }) => apiClient.post<BranchResponse>(`/workspaces/${workspaceId}/branches`, data),

  update: (workspaceId: string, branchId: string, data: { name?: string; description?: string; is_locked?: boolean }) =>
    apiClient.patch<BranchResponse>(`/workspaces/${workspaceId}/branches/${branchId}`, data),

  delete: (workspaceId: string, branchId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/branches/${branchId}`),

  restore: (workspaceId: string, branchId: string) =>
    apiClient.post<BranchResponse>(`/workspaces/${workspaceId}/branches/${branchId}/restore`),

  merge: (workspaceId: string, data: {
    source_branch_id: string;
    target_branch_id: string;
    strategy?: "theirs" | "ours" | "manual";
  }) => apiClient.post<MergeResponse>(`/workspaces/${workspaceId}/branches/merge`, data),

  mergeFromBranch: (workspaceId: string, branchId: string, data: {
    target_branch_id: string;
    strategy?: "theirs" | "ours" | "manual";
  }) => apiClient.post<MergeResponse>(`/workspaces/${workspaceId}/branches/${branchId}/merge`, data),

  listConflicts: (workspaceId: string, params?: { merge_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.merge_id) sp.set("merge_id", params.merge_id);
    const qs = sp.toString();
    return apiClient.get<ConflictListResponse>(`/workspaces/${workspaceId}/branches/merge-conflicts${qs ? `?${qs}` : ""}`);
  },

  resolveConflict: (workspaceId: string, conflictId: string, data: {
    resolution: "theirs" | "ours" | "manual";
    merged_data?: Record<string, unknown>;
  }) => apiClient.patch<ConflictResponse>(`/workspaces/${workspaceId}/branches/merge-conflicts/${conflictId}/resolve`, data),
};
