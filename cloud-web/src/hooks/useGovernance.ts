"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";
import type { GovernanceHealth, GovernanceOverview, GovernanceReport, OrphansResponse, StaleResponse } from "@/lib/types/governance";

export function useGovernance(workspaceId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [duplicates, setDuplicates] = useState<GovernanceOverview | null>(null);
  const [orphans, setOrphans] = useState<OrphansResponse | null>(null);
  const [stale, setStale] = useState<StaleResponse | null>(null);

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

  const getHealth = useCallback(async (): Promise<GovernanceHealth | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/governance/health?workspace_id=${workspaceId}`);
      setHealth(res.data);
      return res.data;
    } catch {
      setError("Failed to load governance health");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getDuplicates = useCallback(async (): Promise<GovernanceOverview | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/governance/duplicates?workspace_id=${workspaceId}`);
      setDuplicates(res.data);
      return res.data;
    } catch {
      setError("Failed to load duplicates");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getOrphans = useCallback(async (): Promise<OrphansResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/governance/orphans?workspace_id=${workspaceId}`);
      setOrphans(res.data);
      return res.data;
    } catch {
      setError("Failed to load orphans");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const getStale = useCallback(async (): Promise<StaleResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/governance/stale?workspace_id=${workspaceId}`);
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
      const res = await request("/governance/report", {
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
        const res = await request("/governance/resolve", {
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
