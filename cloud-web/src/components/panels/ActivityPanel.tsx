"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import type { ActivityEntry } from "@/lib/types";

interface ActivityPanelProps {
  token: string;
  workspaceId: string;
  entityId: string;
}

export default function ActivityPanel({ workspaceId, entityId }: ActivityPanelProps) {
  const [activityEvents, setActivityEvents] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const json = await apiClient.get<{ data: ActivityEntry[] }>(`/activity/events?workspace_id=${workspaceId}&entity_id=${entityId}`);
        setActivityEvents(json.data || []);
      } catch {
        // fallback to workspace-level activity
        try {
          const json = await apiClient.get<{ data: ActivityEntry[] }>(`/activity/?workspace_id=${workspaceId}`);
          setActivityEvents(
            (json.data || []).filter(
              (e: ActivityEntry) => e.entity_id === entityId
            )
          );
        } catch { /* ignore */ }
      }
    };
    fetchActivity();
  }, [workspaceId, entityId]);

  return (
    <div className="space-y-2">
      {activityEvents.map((event) => (
        <div key={event.id} className="rounded-md border border-zinc-800 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-400 uppercase">{event.action}</span>
            <span className="text-[10px] text-zinc-600">{new Date(event.created_at).toLocaleDateString()}</span>
          </div>
          {event.details && Object.keys(event.details).length > 0 && (
            <p className="text-[10px] text-zinc-500">{JSON.stringify(event.details)}</p>
          )}
        </div>
      ))}
      {activityEvents.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-4">No activity events.</p>
      )}
    </div>
  );
}
