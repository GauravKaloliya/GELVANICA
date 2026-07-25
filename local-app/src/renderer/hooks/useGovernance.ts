import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'governance'

export function useGovernanceHealth(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'health', workspaceId],
    queryFn: () => api.governance.health(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useDuplicates(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'duplicates', workspaceId],
    queryFn: () => api.governance.duplicates(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useOrphans(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'orphans', workspaceId],
    queryFn: () => api.governance.orphans(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useStale(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'stale', workspaceId],
    queryFn: () => api.governance.stale(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useRecalculateHealth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) => api.governance.recalculateHealth(workspaceId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'health', variables] })
    },
  })
}
