export type JobPriority = 'critical' | 'high' | 'medium' | 'low';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';

export interface Job {
  id: string;
  workspace_id: string | null;
  type: string;
  status: JobStatus;
  progress: number;
  message: string | null;
  priority: JobPriority;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  idempotency_key: string | null;
  retry_count: number;
  max_retries: number;
  timeout_seconds: number | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  schedule_at: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
