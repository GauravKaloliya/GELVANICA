import { apiClient } from "../apiClient";

export interface SyncInterval {
  value: number;
  label: string;
}

export interface ConflictStrategy {
  value: string;
  label: string;
  description: string;
}

export interface ExportFormat {
  id: string;
  label: string;
  description: string;
  scope: "workspace" | "entity";
}

export interface SearchModeConfig {
  id: string;
  label: string;
  description: string;
}

export interface NotificationPref {
  key: string;
  label: string;
  description: string;
}

export interface GovernanceCategory {
  id: string;
  label: string;
}

export interface GovernanceThresholds {
  excellent: number;
  needs_attention: number;
}

export interface SyncFrequency {
  value: string;
  label: string;
}

export interface WorkspaceConfig {
  property_types: string[];
  member_roles: string[];
  relation_types: string[];
  block_types: string[];
  sync_intervals: SyncInterval[];
  conflict_strategies: ConflictStrategy[];
  export_formats: ExportFormat[];
  search_modes: SearchModeConfig[];
  notification_prefs: NotificationPref[];
  governance_categories: GovernanceCategory[];
  governance_thresholds: GovernanceThresholds;
  sync_frequencies: SyncFrequency[];
}

export const configService = {
  get: (workspaceId: string) =>
    apiClient.get<WorkspaceConfig>(`/workspaces/${workspaceId}/config`),
};
