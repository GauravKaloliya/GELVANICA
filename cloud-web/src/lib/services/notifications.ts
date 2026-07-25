import { API_BASE } from "@/lib/config/constants";
import type { Notification } from "@/lib/types";

type NotificationCallback = (notification: Notification) => void;

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  comment_notifications: boolean;
  update_notifications: boolean;
  governance_notifications: boolean;
  sync_notifications: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

async function notificationsApi<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Request failed" } }));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const notificationService = {
  list: async (token: string, workspaceId?: string): Promise<Notification[]> => {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : "";
    const res = await notificationsApi<{ data: Notification[] }>(`/notifications/${params}`, token);
    return res.data;
  },

  create: async (
    token: string,
    notification: {
      workspace_id: string;
      user_id: string;
      entity_id?: string;
      type: string;
      title: string;
      message?: string;
    }
  ): Promise<Notification> => {
    const res = await notificationsApi<{ data: Notification }>("/notifications/", token, {
      method: "POST",
      body: JSON.stringify(notification),
    });
    return res.data;
  },

  markAsRead: async (token: string, id: string): Promise<void> => {
    await notificationsApi(`/notifications/${id}/read`, token, { method: "POST" });
  },

  dismiss: async (token: string, id: string): Promise<void> => {
    await notificationsApi(`/notifications/${id}/dismiss`, token, { method: "POST" });
  },

  markAllAsRead: async (token: string, workspaceId: string): Promise<void> => {
    const unread = await notificationService.list(token, workspaceId);
    const unreadItems = unread.filter((n) => !n.is_read);
    await Promise.all(unreadItems.map((n) => notificationService.markAsRead(token, n.id)));
  },

  getPreferences: async (token: string, workspaceId: string): Promise<NotificationPreferences> => {
    const res = await notificationsApi<{ data: NotificationPreferences }>(
      `/notifications/preferences?workspace_id=${workspaceId}`,
      token
    );
    return res.data;
  },

  updatePreferences: async (
    token: string,
    workspaceId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const res = await notificationsApi<{ data: NotificationPreferences }>("/notifications/preferences", token, {
      method: "PUT",
      body: JSON.stringify({ workspace_id: workspaceId, ...preferences }),
    });
    return res.data;
  },

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
