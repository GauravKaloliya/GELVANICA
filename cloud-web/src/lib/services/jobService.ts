import { apiClient } from "../apiClient";
import type { Job } from "@/lib/types";

export const jobService = {
  list: (workspaceId: string, params?: { status?: string; type?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.type) sp.set("type", params.type);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return apiClient.get<{data: Job[]}>(`/workspaces/${workspaceId}/jobs${qs ? `?${qs}` : ""}`);
  },

  get: (workspaceId: string, jobId: string) =>
    apiClient.get<{data: Job}>(`/workspaces/${workspaceId}/jobs/${jobId}`),

  create: (workspaceId: string, data: { type: string; priority?: string; payload?: Record<string, unknown>; idempotency_key?: string; timeout_seconds?: number; schedule_at?: string; max_retries?: number }) =>
    apiClient.post<{data: Job}>(`/workspaces/${workspaceId}/jobs`, data),

  markRunning: (workspaceId: string, jobId: string) =>
    apiClient.post<{data: Job}>(`/workspaces/${workspaceId}/jobs/${jobId}/running`),

  markCompleted: (workspaceId: string, jobId: string, result?: Record<string, unknown>) =>
    apiClient.post<{data: Job}>(`/workspaces/${workspaceId}/jobs/${jobId}/completed`, { result }),

  markFailed: (workspaceId: string, jobId: string, error?: Record<string, unknown>) =>
    apiClient.post<{data: Job}>(`/workspaces/${workspaceId}/jobs/${jobId}/fail`, { error }),

  cancel: (workspaceId: string, jobId: string) =>
    apiClient.post<{data: Job}>(`/workspaces/${workspaceId}/jobs/${jobId}/cancel`),

};
