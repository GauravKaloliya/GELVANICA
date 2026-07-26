import { apiClient } from "../apiClient";
import type { GovernanceReport, GovernanceHealthScore } from "../types";

interface GovernanceReportListResponse {
  data: GovernanceReport[];
}

interface GovernanceReportResponse {
  data: GovernanceReport;
}

interface HealthResponse {
  data: GovernanceHealthScore;
}

interface DuplicatesResponse {
  data: Array<{ name: string; count: number; entity_ids?: string[] }>;
}

interface OrphansResponse {
  data: Array<{ id: string; name: string | null; updated_at: string }>;
}

interface StaleResponse {
  data: Array<{ id: string; name: string | null; updated_at: string }>;
}

export const governanceService = {
  listReports: (workspaceId: string) =>
    apiClient.get<GovernanceReportListResponse>(`/workspaces/${workspaceId}/governance/reports`),

  getReport: (workspaceId: string, reportId: string) =>
    apiClient.get<GovernanceReportResponse>(`/workspaces/${workspaceId}/governance/reports/${reportId}`),

  createReport: (workspaceId: string, data: { type: string; title: string; params?: Record<string, unknown> }) =>
    apiClient.post<GovernanceReportResponse>(`/workspaces/${workspaceId}/governance/reports`, data),

  healthScore: (workspaceId: string) =>
    apiClient.get<HealthResponse>(`/workspaces/${workspaceId}/governance/health`),

  healthScoreCompute: (workspaceId: string) =>
    apiClient.post<HealthResponse>(`/workspaces/${workspaceId}/governance/health-score`),

  duplicates: (workspaceId: string) =>
    apiClient.get<DuplicatesResponse>(`/workspaces/${workspaceId}/governance/duplicates`),

  orphans: (workspaceId: string) =>
    apiClient.get<OrphansResponse>(`/workspaces/${workspaceId}/governance/orphans`),

  stale: (workspaceId: string) =>
    apiClient.get<StaleResponse>(`/workspaces/${workspaceId}/governance/stale`),
};
