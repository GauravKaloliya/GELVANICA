"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";
import type { GovernanceHealthScore, GovernanceReport } from "@/lib/types/governance";

export function useGovernance(workspaceId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<GovernanceHealthScore | null>(null);
  const [duplicates, setDuplicates] = useState<{ duplicate_entities: Array<{ name: string; count: number; entity_ids?: string[] }> } | null>(null);
  const [orphans, setOrphans] = useState<{ orphans: Array<{ id: string; name: string | null; updated_at: string }> } | null>(null);
  const [stale, setStale] = useState<{ stale: Array<{ id: string; name: string | null; updated_at: string }> } | null>(null);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || "Request failed");
      }
      return res.json();
    },
    [token]
  );

  const getHealth = useCallback(async (): Promise<GovernanceHealthScore | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/governance/health`);
      setHealth(res.data);
      return res.data;
    } catch {
      setError("Failed to load governance health");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getDuplicates = useCallback(async (): Promise<{ duplicate_entities: Array<{ name: string; count: number; entity_ids?: string[] }> } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/governance/duplicates`);
      setDuplicates(res.data);
      return res.data;
    } catch {
      setError("Failed to load duplicates");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getOrphans = useCallback(async (): Promise<{ orphans: Array<{ id: string; name: string | null; updated_at: string }> } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/governance/orphans`);
      setOrphans(res.data);
      return res.data;
    } catch {
      setError("Failed to load orphans");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getStale = useCallback(async (): Promise<{ stale: Array<{ id: string; name: string | null; updated_at: string }> } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/governance/stale`);
      setStale(res.data);
      return res.data;
    } catch {
      setError("Failed to load stale items");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const generateReport = useCallback(async (): Promise<GovernanceReport | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/governance/report`, {
        method: "POST",
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      return res.data;
    } catch {
      setError("Failed to generate report");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const resolveIssue = useCallback(
    async (data: { issue_type: string; entity_id: string; resolution: string }): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/workspaces/${workspaceId}/governance/resolve`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (e) {
        setError("Failed to resolve issue");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  return {
    isLoading,
    error,
    health,
    duplicates,
    orphans,
    stale,
    getHealth,
    getDuplicates,
    getOrphans,
    getStale,
    generateReport,
    resolveIssue,
  };
}
