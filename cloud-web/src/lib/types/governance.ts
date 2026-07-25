import type { Entity } from "./entity";

export interface GovernanceReport {
  id: string;
  workspace_id: string;
  health_score: number;
  duplicate_count: number;
  orphan_count: number;
  stale_count: number;
  report: {
    duplicates: Array<{ title: string; count: number }>;
    orphans: Entity[];
    stale: Entity[];
    entity_count: number;
  };
  created_at: string;
}

export interface GovernanceHealth {
  health_score: number;
  duplicate_count: number;
  orphan_count: number;
  stale_count: number;
  entity_count: number;
  created_at: string;
}

export interface DuplicateGroup {
  title: string;
  count: number;
  entity_ids?: string[];
}

export interface GovernanceOverview {
  duplicates: DuplicateGroup[];
}

export interface OrphansResponse {
  orphans: Entity[];
}

export interface StaleResponse {
  stale: Entity[];
}
