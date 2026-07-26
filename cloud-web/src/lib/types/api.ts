export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export type ObjectLockMode = 'GOVERNANCE' | 'COMPLIANCE';
export type MergeStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type RelationType = 'manual' | 'ai';
export type SyncConflict = 'keep_local' | 'keep_remote' | 'merge';
export type EntityEventType = string;
export type PropertyValue = unknown;
