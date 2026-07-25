export type JobPriority = "critical" | "high" | "medium" | "low";

export interface Job {
  id: string;
  workspace_id: string | null;
  job_type: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  priority: JobPriority;
  idempotency_key: string | null;
  timeout_seconds: number | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
