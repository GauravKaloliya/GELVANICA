import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { BlockCreateRequest, BlockUpdateRequest, ReorderBlockRequest } from '@shared/types'

const QUERY_KEY = 'blocks'

export function useEntityBlocks(entityId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'entity', entityId],
    queryFn: () => api.blocks.entityBlocks(entityId),
    enabled: !!entityId,
  })
}

export function useCreateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BlockCreateRequest) => api.blocks.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'entity', variables.entity_id] })
    },
  })
}

export function useUpdateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BlockUpdateRequest }) =>
      api.blocks.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] })
    },
  })
}

export function useDeleteBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.blocks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useReorderBlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ReorderBlockRequest) => api.blocks.reorder(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'entity', variables.entity_id] })
    },
  })
}
