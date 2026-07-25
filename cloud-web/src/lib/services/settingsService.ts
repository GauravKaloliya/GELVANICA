import { apiClient } from "../apiClient";

interface SettingsListResponse {
  data: Record<string, unknown>;
}

export const settingsService = {
  list: async (workspaceId: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<SettingsListResponse>(`/settings/?workspace_id=${workspaceId}`);
    return res.data;
  },

  get: async (workspaceId: string, category: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<{ data: Record<string, unknown> }>(`/settings/${category}?workspace_id=${workspaceId}`);
    return res.data;
  },

  update: (workspaceId: string, category: string, data: Record<string, unknown>) =>
    apiClient.put(`/settings/${category}`, { workspace_id: workspaceId, ...data }),

  delete: (workspaceId: string, category: string) =>
    apiClient.post(`/settings/reset`, { workspace_id: workspaceId, category }),

  resetAll: (workspaceId: string) =>
    apiClient.post(`/settings/reset`, { workspace_id: workspaceId, reset_all: true }),
};
