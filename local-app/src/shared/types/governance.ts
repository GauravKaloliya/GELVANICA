export interface GovernanceReport {
  id: string
  workspace_id: string
  health_score: number
  duplicate_count: number
  orphan_count: number
  stale_count: number
  report: {
    duplicates: Array<{ title: string; count: number }>
    orphans: Array<{ id: string; title: string }>
    stale: Array<{ id: string; title: string; last_updated: string }>
    entity_count: number
  }
  created_at: string
}

import type { WorkspaceStats } from './workspace'

export type DashboardOverview = WorkspaceStats

export interface DuplicateEntry {
  entity_a_id: string
  entity_b_id: string
  similarity: number
  title_a: string
  title_b: string
}

export interface OrphanEntry {
  id: string
  title: string
  updated_at: string
}

export interface StaleEntry {
  id: string
  title: string
  updated_at: string
}
