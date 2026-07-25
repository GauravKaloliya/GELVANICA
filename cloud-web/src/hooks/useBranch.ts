"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";
import type { Branch, BranchMerge } from "@/lib/types/branch";

export function useBranch(entityId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const listBranches = useCallback(async (): Promise<Branch[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/branches/?entity_id=${entityId}`);
      return res.data;
    } catch {
      setError("Failed to load branches");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [entityId, request]);

  const createBranch = useCallback(
    async (data: { name: string; from_branch_id?: string }): Promise<Branch> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request("/branches/", {
          method: "POST",
          body: JSON.stringify({ entity_id: entityId, ...data }),
        });
        return res.data;
      } catch (e) {
        setError("Failed to create branch");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [entityId, request]
  );

  const mergeBranch = useCallback(
    async (
      branchId: string,
      data: { target_branch_id: string; strategy?: "theirs" | "ours" | "manual" }
    ): Promise<BranchMerge> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request(`/branches/${branchId}/merge`, {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (e) {
        setError("Failed to merge branch");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  const merge = useCallback(
    async (data: {
      source_branch_id: string;
      target_branch_id: string;
      strategy?: string;
    }): Promise<BranchMerge> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await request("/branches/merge", {
          method: "POST",
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (e) {
        setError("Failed to merge branches");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [request]
  );

  return { isLoading, error, listBranches, createBranch, mergeBranch, merge };
}
