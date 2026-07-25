import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'notifications'

export function useNotifications(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, { workspace_id: workspaceId }],
    queryFn: () => api.notifications.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.notifications.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
