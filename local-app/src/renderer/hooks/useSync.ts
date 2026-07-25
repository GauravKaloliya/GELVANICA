import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'sync'

export function useSyncOperations(params?: { workspace_id?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, 'operations', params],
    queryFn: () => api.sync.list(params),
    enabled: !!params?.workspace_id,
  })
}

export function useSyncTrigger() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) => window.gnovium.ipc.invoke('sync:trigger', workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}


