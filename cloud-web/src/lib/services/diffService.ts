import { apiClient } from "../apiClient";
import type { DiffEntry, BlockDiffEntry } from "../types";

interface DiffResponse {
  data: DiffEntry;
}

interface BlockDiffResponse {
  data: BlockDiffEntry[];
}

export const diffService = {
  compareDiff: (workspaceId: string, data: {
    entity_id: string;
    left_version_id: string;
    right_version_id: string;
  }) => apiClient.get<DiffResponse>(
    `/workspaces/${workspaceId}/diffs/compare?entity_id=${data.entity_id}&left_version_id=${data.left_version_id}&right_version_id=${data.right_version_id}`
  ),

  blockDiff: (workspaceId: string, data: {
    entity_id: string;
    block_id: string;
    left_version_id: string;
    right_version_id: string;
  }) => apiClient.post<BlockDiffResponse>(
    `/workspaces/${workspaceId}/diffs/blocks`, data
  ),
};
