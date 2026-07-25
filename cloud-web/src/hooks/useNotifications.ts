"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { notificationService } from "@/lib/services/notifications";
import type { Notification } from "@/lib/types";

export function useNotifications() {
  const { tokens } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!tokens?.access_token) return;
    setIsLoading(true);
    try {
      const data = await notificationService.list(
        tokens.access_token,
        currentWorkspace?.id
      );
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [tokens, currentWorkspace]);

  useEffect(() => {
    if (!tokens?.access_token || !currentWorkspace?.id) return;

    fetchNotifications();

    let cleanupWs: (() => void) | undefined;

    try {
      cleanupWs = notificationService.connectWebSocket(
        tokens.access_token,
        currentWorkspace.id,
        (notification) => {
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });
        }
      );
    } catch {
      // WebSocket unavailable, rely on polling
    }

    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => {
      clearInterval(interval);
      cleanupWs?.();
    };
  }, [fetchNotifications, tokens, currentWorkspace]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!tokens?.access_token) return;
      await notificationService.markAsRead(tokens.access_token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    [tokens]
  );

  const markAllAsRead = useCallback(async () => {
    if (!tokens?.access_token || !currentWorkspace?.id) return;
    await notificationService.markAllAsRead(tokens.access_token, currentWorkspace.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [tokens, currentWorkspace]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
