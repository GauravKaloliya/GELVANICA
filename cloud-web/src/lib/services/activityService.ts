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
  list: (workspaceId: string, params?: { page?: number; per_page?: number; user_id?: string; entity_id?: string; action?: string; date_from?: string; date_to?: string }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    if (params?.user_id) sp.set("user_id", params.user_id);
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    if (params?.action) sp.set("action", params.action);
    if (params?.date_from) sp.set("start_date", params.date_from);
    if (params?.date_to) sp.set("end_date", params.date_to);
    const qs = sp.toString();
    return apiClient.get<ActivityListResponse>(`/workspaces/${workspaceId}/activity${qs ? `?${qs}` : ""}`);
  },

  listEvents: (workspaceId: string, params?: { entity_id?: string; changeset_id?: string; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    if (params?.entity_id) sp.set("entity_id", params.entity_id);
    if (params?.changeset_id) sp.set("changeset_id", params.changeset_id);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    const qs = sp.toString();
    return apiClient.get<EventListResponse>(`/workspaces/${workspaceId}/activity/events${qs ? `?${qs}` : ""}`);
  },
};
