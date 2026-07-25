import { useQuery } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'dashboard'

export function useDashboardOverview(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'overview', workspaceId],
    queryFn: () => api.dashboard.overview(workspaceId),
    enabled: !!workspaceId,
  })
}
