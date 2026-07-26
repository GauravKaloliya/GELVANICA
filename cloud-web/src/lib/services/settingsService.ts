import { apiClient } from "../apiClient";

interface SettingsListResponse {
  data: Record<string, unknown>;
}

export const settingsService = {
  list: async (workspaceId: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<SettingsListResponse>(`/workspaces/${workspaceId}/settings`);
    return res.data;
  },

  get: async (workspaceId: string, category: string): Promise<Record<string, unknown>> => {
    const res = await apiClient.get<{ data: Record<string, unknown> }>(`/workspaces/${workspaceId}/settings/${category}`);
    return res.data;
  },

  update: (workspaceId: string, category: string, data: Record<string, unknown>) =>
    apiClient.put(`/workspaces/${workspaceId}/settings/${category}`, data),

  updateMulti: (workspaceId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/workspaces/${workspaceId}/settings`, data),

  reset: (workspaceId: string, category: string) =>
    apiClient.post(`/workspaces/${workspaceId}/settings/reset`, { category }),

  resetAll: (workspaceId: string) =>
    apiClient.post(`/workspaces/${workspaceId}/settings/reset`, { reset_all: true }),
};
