import { useQuery } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'activity'

export function useActivityLog(workspaceId: string, params?: { page?: number; per_page?: number; since?: string; until?: string; action?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, 'log', workspaceId, params],
    queryFn: () => api.activity.list({ workspace_id: workspaceId, ...params }),
    enabled: !!workspaceId,
  })
}
