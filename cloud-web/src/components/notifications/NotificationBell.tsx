"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { notificationService } from "@/lib/services/notifications";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bell, X, CheckCheck } from "lucide-react";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const router = useRouter();
  const { tokens } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const token = tokens?.access_token;
  const workspaceId = currentWorkspace?.id;

  const fetchNotifications = useCallback(async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    try {
      const data = await notificationService.list(token, workspaceId);
      setNotifications(data.filter((n) => !n.is_deleted));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await notificationService.dismiss(token, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const handleClick = async (notification: Notification) => {
    if (!token) return;
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(token, notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || !workspaceId) return;
    try {
      await notificationService.markAllAsRead(token, workspaceId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-72">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-zinc-700" />
                <p className="mt-2 text-xs text-zinc-500">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={cn(
                    "group flex cursor-pointer gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/50",
                    !notification.is_read && "bg-zinc-800/20"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-tight",
                          notification.is_read ? "text-zinc-400" : "font-medium text-white"
                        )}
                      >
                        {notification.title}
                      </p>
                      <button
                        onClick={(e) => handleDismiss(e, notification.id)}
                        className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        aria-label="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
