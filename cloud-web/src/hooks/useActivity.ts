"use client";

import { useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { API_BASE } from "@/lib/config/constants";
import type { ActivityEntry, EntityEvent } from "@/lib/types/activity";

export function useActivity(workspaceId: string) {
  const { tokens } = useAuthStore();
  const token = tokens?.access_token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [events, setEvents] = useState<EntityEvent[]>([]);

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

  const listEntries = useCallback(async (): Promise<ActivityEntry[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/activity`);
      setEntries(res.data);
      return res.data;
    } catch {
      setError("Failed to load activity entries");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  const listEvents = useCallback(async (): Promise<EntityEvent[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/workspaces/${workspaceId}/activity/events`);
      setEvents(res.data);
      return res.data;
    } catch {
      setError("Failed to load activity events");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, request]);

  return { isLoading, error, entries, events, listEntries, listEvents };
}
