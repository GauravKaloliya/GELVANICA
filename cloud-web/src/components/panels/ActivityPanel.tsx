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
        const json = await apiClient.get<{ data: ActivityEntry[] }>(`/workspaces/${workspaceId}/activity/events?entity_id=${entityId}`);
        setActivityEvents(json.data || []);
      } catch {
        // fallback to workspace-level activity
        try {
          const json = await apiClient.get<{ data: ActivityEntry[] }>(`/workspaces/${workspaceId}/activity`);
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
        <div key={event.id} className="rounded-md border border-border p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted uppercase">{event.action}</span>
            <span className="text-[10px] text-muted">{new Date(event.created_at).toLocaleDateString()}</span>
          </div>
          {event.details && Object.keys(event.details).length > 0 && (
            <p className="text-[10px] text-muted">{JSON.stringify(event.details)}</p>
          )}
        </div>
      ))}
      {activityEvents.length === 0 && (
        <p className="text-step-1 text-muted text-center py-4">No activity events.</p>
      )}
    </div>
  );
}
