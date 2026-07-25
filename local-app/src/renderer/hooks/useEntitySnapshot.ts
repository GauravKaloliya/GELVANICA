import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'versions'

export function useEntitySnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      entityId,
      changesetId,
    }: {
      entityId: string
      changesetId: string
    }) => api.versions.entitySnapshot(entityId, { changeset_id: changesetId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'entities', variables.entityId] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'snapshots'] })
    },
  })
}
