"use client";

import { useState, useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStore } from "@/stores/syncStore";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, justReconnected } = useOnlineStatus();
  const { isSyncing, offlineQueue } = useSyncStore();
  const [showBanner, setShowBanner] = useState(false);

  const queueCount = offlineQueue.length;

  useEffect(() => {
    if (!isOnline || queueCount > 0) {
      setShowBanner(true);
    } else if (justReconnected) {
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, justReconnected, queueCount]);

  if (isOnline && queueCount === 0 && !showBanner) return null;

  const getStatusLabel = () => {
    if (isSyncing) return "Syncing...";
    if (!isOnline && queueCount > 0) return `Offline \u2014 ${queueCount} operation${queueCount !== 1 ? "s" : ""} queued`;
    if (!isOnline) return "Offline";
    if (queueCount > 0) return `Online \u2014 ${queueCount} operation${queueCount !== 1 ? "s" : ""} queued`;
    return "Back online. Syncing changes...";
  };

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-all duration-300",
      isSyncing
        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
        : isOnline
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
    )}>
      <div className="flex items-center gap-1.5">
        {isSyncing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span>{getStatusLabel()}</span>
      </div>
    </div>
  );
}
