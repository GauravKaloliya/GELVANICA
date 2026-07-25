"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { jobService } from "@/lib/services/jobService";

export function useJobs(filters?: { status?: string; job_type?: string }) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;

  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => jobService.list(token!, filters),
    enabled: !!token,
    refetchInterval: (query) => {
      const jobs = query.state.data;
      if (jobs?.some((j) => j.status === "pending" || j.status === "running")) {
        return 5000;
      }
      return false;
    },
  });
}

export function useJobDetail(jobId: string | null) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;

  return useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobService.get(token!, jobId!),
    enabled: !!token && !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job?.status === "pending" || job?.status === "running") {
        return 3000;
      }
      return false;
    },
  });
}

export function useCancelJob() {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobService.cancel(token!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useRetryJob() {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jobService.retry(token!, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
