"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { jobService } from "@/lib/services/jobService";

export function useJobs(workspaceId: string, filters?: { status?: string; job_type?: string }) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;

  return useQuery({
    queryKey: ["jobs", workspaceId, filters],
    queryFn: () => jobService.list(workspaceId, filters).then(res => res.data),
    enabled: !!token && !!workspaceId,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (jobs?.some((j) => j.type === "pending" || j.type === "running")) {
        return 5000;
      }
      return false;
    },
  });
}

export function useJobDetail(workspaceId: string, jobId: string | null) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;

  return useQuery({
    queryKey: ["jobs", workspaceId, jobId],
    queryFn: () => jobService.get(workspaceId, jobId!).then(res => res.data),
    enabled: !!token && !!jobId && !!workspaceId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job?.type === "pending" || job?.type === "running") {
        return 3000;
      }
      return false;
    },
  });
}

export function useCancelJob(workspaceId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobService.cancel(workspaceId, jobId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}


