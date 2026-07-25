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
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    return apiClient.get<BranchListResponse>(`/branches/?${sp}`);
  },

  get: (branchId: string) =>
    apiClient.get<BranchResponse>(`/branches/${branchId}`),

  create: (data: {
    workspace_id: string;
    entity_id?: string;
    name: string;
    description?: string;
    from_branch_id?: string;
  }) => apiClient.post<BranchResponse>("/branches/", data),

  delete: (branchId: string) =>
    apiClient.delete(`/branches/${branchId}`),

  merge: (data: {
    source_branch_id: string;
    target_branch_id: string;
    strategy?: "theirs" | "ours" | "manual";
  }) => apiClient.post<MergeResponse>("/branches/merge", data),

  mergeFromBranch: (branchId: string, data: {
    target_branch_id: string;
    strategy?: "theirs" | "ours" | "manual";
  }) => apiClient.post<MergeResponse>(`/branches/${branchId}/merge`, data),

  listConflicts: (workspaceId: string, params?: { merge_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.merge_id) sp.set("merge_id", params.merge_id);
    return apiClient.get<ConflictListResponse>(`/branches/merge-conflicts?${sp}`);
  },

  resolveConflict: (conflictId: string, data: {
    resolution: "theirs" | "ours" | "manual";
    merged_data?: Record<string, unknown>;
  }) => apiClient.post<ConflictResponse>(`/branches/merge-conflicts/${conflictId}/resolve`, data),
};
