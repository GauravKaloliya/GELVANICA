"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

export function useCommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { logout } = useAuthStore();
  const { workspaces, currentWorkspace } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const workspaceId = currentWorkspace?.id;

  const commands: Command[] = [
    {
      id: "search",
      label: "Search",
      description: "Full-text search across workspace",
      shortcut: "⌘K",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/search`);
      },
      category: "Navigation",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/dashboard`);
      },
      category: "Navigation",
    },
    {
      id: "graph",
      label: "Knowledge Graph",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/graph`);
      },
      category: "Navigation",
    },
    {
      id: "files",
      label: "Files",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/files`);
      },
      category: "Navigation",
    },
    {
      id: "governance",
      label: "Governance",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/governance`);
      },
      category: "Navigation",
    },
    {
      id: "activity",
      label: "Activity Log",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/activity`);
      },
      category: "Navigation",
    },
    {
      id: "tags",
      label: "Tags",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/tags`);
      },
      category: "Navigation",
    },
    {
      id: "settings",
      label: "Workspace Settings",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/settings`);
      },
      category: "Settings",
    },
    {
      id: "members",
      label: "Manage Members",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/settings/members`);
      },
      category: "Settings",
    },
    {
      id: "ai-settings",
      label: "AI Configuration",
      action: () => {
        setCommandPaletteOpen(false);
        if (workspaceId) router.push(`/workspace/${workspaceId}/settings/ai`);
      },
      category: "Settings",
    },
    ...workspaces.map((w) => ({
      id: `switch-${w.id}`,
      label: `Switch to ${w.name}`,
      action: () => {
        setCommandPaletteOpen(false);
        router.push(`/workspace/${w.id}/dashboard`);
      },
      category: "Workspaces",
    })),
    {
      id: "logout",
      label: "Log Out",
      action: () => {
        setCommandPaletteOpen(false);
        logout();
        router.push("/auth/sign-in");
      },
      category: "Account",
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const executeCommand = useCallback(
    (command: Command) => {
      command.action();
      setQuery("");
      setSelectedIndex(0);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        executeCommand(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setQuery("");
        setSelectedIndex(0);
      }
    },
    [filtered, selectedIndex, executeCommand, setCommandPaletteOpen]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return {
    isOpen: commandPaletteOpen,
    query,
    setQuery,
    commands: filtered,
    selectedIndex,
    setSelectedIndex,
    executeCommand,
    handleKeyDown,
    close: () => {
      setCommandPaletteOpen(false);
      setQuery("");
      setSelectedIndex(0);
    },
  };
}
