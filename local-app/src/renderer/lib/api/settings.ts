import { get, post, put } from './client'
import type {
  SettingsCategory,
  SettingsValues,
  AllSettings,
} from '@shared/types'

export const settingsApi = {
  list: (workspaceId: string) =>
    get<AllSettings>('/settings/', { params: { workspace_id: workspaceId } }),
  get: (category: SettingsCategory, workspaceId: string) =>
    get<SettingsValues>(`/settings/${category}`, { params: { workspace_id: workspaceId } }),
  update: (category: SettingsCategory, data: SettingsValues & { workspace_id: string }) =>
    put<SettingsValues>(`/settings/${category}`, data),
  reset: (workspaceId: string, category?: string) =>
    post<AllSettings>('/settings/reset', { workspace_id: workspaceId, category: category || 'all' }),
}
