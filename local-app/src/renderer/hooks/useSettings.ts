import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { SettingsCategory, SettingsValues } from '@shared/types'

const QUERY_KEY = 'settings'

export function useAllSettings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, { workspace_id: workspaceId }],
    queryFn: () => api.settings.list(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSettings(category: SettingsCategory, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, category, { workspace_id: workspaceId }],
    queryFn: () => api.settings.get(category, workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      category,
      workspaceId,
      values,
    }: {
      category: SettingsCategory
      workspaceId: string
      values: SettingsValues
    }) => api.settings.update(category, { ...values, workspace_id: workspaceId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.workspaceId] })
    },
  })
}

export function useResetSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      workspaceId,
      category,
    }: {
      workspaceId: string
      category?: SettingsCategory
    }) => api.settings.reset(workspaceId, category),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['workspaces', variables.workspaceId] })
    },
  })
}
