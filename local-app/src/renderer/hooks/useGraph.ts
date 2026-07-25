import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { GraphQueryResponse } from '@shared/types'

const QUERY_KEY = 'graph'

export function useGraph(workspaceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, workspaceId],
    queryFn: () => api.graph.get(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useGraphTraverse(workspaceId: string | null, entityId: string, depth?: number) {
  return useQuery({
    queryKey: [QUERY_KEY, 'traverse', workspaceId, entityId, depth],
    queryFn: () => api.graph.traverse(workspaceId!, entityId, depth),
    enabled: !!workspaceId && !!entityId,
    select: (data) => data as GraphQueryResponse,
  })
}

export function useGraphPaths(workspaceId: string | null, sourceId: string, targetId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'paths', workspaceId, sourceId, targetId],
    queryFn: () => api.graph.paths(workspaceId!, sourceId, targetId),
    enabled: !!workspaceId && !!sourceId && !!targetId,
    select: (data) => data as Array<{ entity_id: string; relation_type: string }>,
  })
}

export function useMaterializeGraph() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workspaceId: string) => api.graph.materialize(workspaceId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables] })
    },
  })
}
