import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { RelationCreateRequest } from '@shared/types'

const QUERY_KEY = 'relations'

export function useRelations(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', { workspace_id: workspaceId }],
    queryFn: () => api.relations.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useCreateRelation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RelationCreateRequest) => api.relations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useOutgoingRelations(entityId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'outgoing', entityId],
    queryFn: () => api.relations.outgoing(entityId),
    enabled: !!entityId,
  })
}

export function useBacklinks(entityId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'backlinks', entityId],
    queryFn: () => api.relations.backlinks(entityId),
    enabled: !!entityId,
  })
}


