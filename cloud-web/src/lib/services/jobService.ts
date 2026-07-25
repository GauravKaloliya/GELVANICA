import { API_BASE } from "@/lib/config/constants";
import type { Job } from "@/lib/types";

interface JobResponse {
  data: Job;
}

interface JobListResponse {
  data: Job[];
  meta?: { total: number };
}

async function jobApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Job request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const jobService = {
  list: async (token: string, params?: {
    workspace_id?: string;
    status?: string;
    job_type?: string;
    limit?: number;
  }): Promise<Job[]> => {
    const searchParams = new URLSearchParams();
    if (params?.workspace_id) searchParams.set("workspace_id", params.workspace_id);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.job_type) searchParams.set("job_type", params.job_type);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const res = await jobApi<JobListResponse>(`/jobs/?${searchParams}`, token);
    return res.data || [];
  },

  get: async (token: string, jobId: string): Promise<Job> => {
    const res = await jobApi<JobResponse>(`/jobs/${jobId}`, token);
    return res.data;
  },

  cancel: async (token: string, jobId: string): Promise<Job> => {
    const res = await jobApi<JobResponse>(`/jobs/${jobId}/cancel`, token, { method: "POST" });
    return res.data;
  },

  retry: async (token: string, jobId: string): Promise<Job> => {
    const res = await jobApi<JobResponse>(`/jobs/${jobId}/retry`, token, { method: "POST" });
    return res.data;
  },
};
