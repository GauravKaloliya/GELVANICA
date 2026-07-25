import { apiClient } from "../apiClient";
import type { ActivityEntry, EntityEvent } from "../types";

interface ActivityListResponse {
  data: ActivityEntry[];
  meta?: { total: number; page: number; per_page: number };
}

interface EventListResponse {
  data: EntityEvent[];
  meta?: { total: number };
}

export const activityService = {
  list: (workspaceId: string, params?: { page?: number; per_page?: number; user_id?: string }) => {
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    if (params?.user_id) sp.set("user_id", params.user_id);
    return apiClient.get<ActivityListResponse>(`/activity/?${sp}`);
  },

  listEvents: (workspaceId: string, params?: { entity_id?: string; changeset_id?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    if (params?.changeset_id) sp.set("changeset_id", params.changeset_id);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    return apiClient.get<EventListResponse>(`/activity/events?${sp}`);
  },
};
