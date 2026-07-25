import { apiClient } from "../apiClient";
import type { ActivityEntry } from "../types";

interface DashboardOverview {
  entity_count: number;
  relation_count: number;
  comment_count: number;
  archived_count: number;
  member_count: number;
  file_count: number;
  tag_count: number;
  recent_activity: ActivityEntry[];
  governance_score?: number;
}

interface OverviewResponse {
  data: DashboardOverview;
}

interface StatsResponse {
  data: DashboardOverview;
}

interface ActivityResponse {
  data: ActivityEntry[];
  meta?: { total: number };
}

export const dashboardService = {
  getOverview: (workspaceId: string) =>
    apiClient.get<OverviewResponse>(`/dashboard/overview?workspace_id=${workspaceId}`),

  getStats: (workspaceId: string) =>
    apiClient.get<StatsResponse>(`/workspaces/${workspaceId}/stats`),

  getRecentActivity: (workspaceId: string, limit = 10) =>
    apiClient.get<ActivityResponse>(`/activity/?workspace_id=${workspaceId}&per_page=${limit}`),
};
