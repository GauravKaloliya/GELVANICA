import { apiClient } from "../apiClient";
import { API_BASE } from "@/lib/config/constants";
import type { Notification } from "@/lib/types";

type NotificationCallback = (notification: Notification) => void;

export const notificationService = {
  list: (workspaceId: string) =>
    apiClient.get<{ data: Notification[] }>(`/workspaces/${workspaceId}/notifications`),

  get: (workspaceId: string, notificationId: string) =>
    apiClient.get<{ data: Notification }>(`/workspaces/${workspaceId}/notifications/${notificationId}`),

  create: (workspaceId: string, notification: {
    user_id: string;
    entity_id?: string;
    type: string;
    title: string;
    message?: string;
  }) => apiClient.post<{ data: Notification }>(`/workspaces/${workspaceId}/notifications`, notification),

  update: (workspaceId: string, notificationId: string, data: { is_read?: boolean; title?: string; body?: string }) =>
    apiClient.patch<{ data: Notification }>(`/workspaces/${workspaceId}/notifications/${notificationId}`, data),

  markAsRead: (workspaceId: string, id: string) =>
    apiClient.post(`/workspaces/${workspaceId}/notifications/${id}/read`),

  dismiss: (workspaceId: string, id: string) =>
    apiClient.post(`/workspaces/${workspaceId}/notifications/${id}/dismiss`),

  markAllAsRead: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/notifications/read-all`),

  getUnreadCount: (workspaceId: string) =>
    apiClient.get<{ data: { unread_count: number } }>(`/workspaces/${workspaceId}/notifications/unread-count`),

  connectWebSocket: (token: string, workspaceId: string, onNotification: NotificationCallback): (() => void) => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;

    const connect = () => {
      try {
        const wsBase = API_BASE.replace(/^http/, "ws");
        ws = new WebSocket(`${wsBase}/ws/notifications?workspace_id=${workspaceId}`);

        ws.onopen = () => {
          reconnectAttempts = 0;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "auth", token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "notification") {
              onNotification(data.payload as Notification);
            }
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          if (reconnectAttempts < MAX_RECONNECT) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectTimer = setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        // WebSocket not available or connection failed
      }
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  },
};
