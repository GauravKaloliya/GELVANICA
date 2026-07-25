"use client";

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { apiClient } from "@/lib/apiClient";
import type { Workspace } from "@/lib/types";

interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  workspaceAccentColor: string;
  setWorkspaceAccentColor: (color: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { tokens } = useAuthStore();
  const { currentWorkspace, setCurrentWorkspace, workspaces, setWorkspaces } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(false);
  const [accentColor, setAccentColor] = useState("#6366f1");

  const setWorkspaceAccentColor = useCallback((color: string) => {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) return;
    setAccentColor(color);
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--accent", color);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!tokens?.access_token) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ data: Workspace[] }>("/workspaces/");
      setWorkspaces(res.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [tokens, setWorkspaces]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (ws) {
        setCurrentWorkspace(ws);
        if (typeof window !== "undefined") {
          localStorage.setItem("gnovium-current-workspace", id);
        }
      }
    },
    [workspaces, setCurrentWorkspace]
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      const saved = typeof window !== "undefined" ? localStorage.getItem("gnovium-current-workspace") : null;
      const ws = workspaces.find((w) => w.id === saved) || workspaces[0];
      if (ws) setCurrentWorkspace(ws);
    }
  }, [workspaces, currentWorkspace, setCurrentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      const color = (currentWorkspace.settings as Record<string, unknown>)?.accent_color as string || "#6366f1";
      if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
        setAccentColor(color);
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--accent", color);
        }
      }
    }
  }, [currentWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ currentWorkspace, workspaces, isLoading, switchWorkspace, refreshWorkspaces, workspaceAccentColor: accentColor, setWorkspaceAccentColor }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}
