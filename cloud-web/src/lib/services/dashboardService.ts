import { apiClient } from "../apiClient";

interface DashboardOverview {
  entity_count: number;
  relation_count: number;
  comment_count: number;
  archived_count: number;
  member_count: number;
  file_count: number;
  tag_count: number;
  recent_activity: unknown[];
  governance_score?: number;
}

interface OverviewResponse {
  data: DashboardOverview;
}

export const dashboardService = {
  getOverview: (workspaceId: string) =>
    apiClient.get<OverviewResponse>(`/workspaces/${workspaceId}/dashboard/overview`),

  getStorage: (workspaceId: string) =>
    apiClient.get<{ data: { used_bytes: number; quota_bytes: number; file_count: number } }>(
      `/workspaces/${workspaceId}/dashboard/storage`
    ),
};
