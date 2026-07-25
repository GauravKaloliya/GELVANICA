import { apiClient } from "../apiClient";
import type { GovernanceReport, DuplicateGroup, Entity, GovernanceOverview } from "../types";

interface HealthResponse {
  data: GovernanceReport;
}

interface DuplicatesResponse {
  data: DuplicateGroup[];
}

interface OrphansResponse {
  data: Entity[];
}

interface StaleResponse {
  data: Entity[];
}

interface HealthScoreResponse {
  data: GovernanceReport;
}

interface OverviewResponse {
  data: GovernanceOverview;
}

export const governanceService = {
  health: (workspaceId: string) =>
    apiClient.get<HealthResponse>(`/governance/health?workspace_id=${workspaceId}`),

  duplicates: (workspaceId: string) =>
    apiClient.get<DuplicatesResponse>(`/governance/duplicates?workspace_id=${workspaceId}`),

  orphans: (workspaceId: string) =>
    apiClient.get<OrphansResponse>(`/governance/orphans?workspace_id=${workspaceId}`),

  stale: (workspaceId: string) =>
    apiClient.get<StaleResponse>(`/governance/stale?workspace_id=${workspaceId}`),

  healthScore: (workspaceId: string) =>
    apiClient.post<HealthScoreResponse>("/governance/health-score", { workspace_id: workspaceId }),

  overview: (workspaceId: string) =>
    apiClient.get<OverviewResponse>(`/governance/health?workspace_id=${workspaceId}`),
};
