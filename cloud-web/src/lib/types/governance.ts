export type GovernanceReportType = 'access_audit' | 'change_log' | 'storage_summary' | 'activity_summary' | 'compliance' | 'health_check';

export type GovernanceReportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface GovernanceReport {
  id: string;
  workspace_id: string;
  type: GovernanceReportType;
  title: string;
  status: GovernanceReportStatus;
  data: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface GovernanceHealthScore {
  entity_count: number;
  block_count: number;
  relation_count: number;
  duplicate_count: number;
  orphan_count: number;
  stale_count: number;
  health_score: number;
}
