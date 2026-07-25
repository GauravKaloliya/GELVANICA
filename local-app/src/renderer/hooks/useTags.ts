import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { TagCreateRequest, TagUpdateRequest } from '@shared/types'

const QUERY_KEY = 'tags'

export function useTags(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', { workspace_id: workspaceId }],
    queryFn: () => api.tags.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TagCreateRequest) => api.tags.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TagUpdateRequest }) =>
      api.tags.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.tags.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useAttachTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tagId, entityId }: { tagId: string; entityId: string }) =>
      api.tags.attach(tagId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDetachTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tagId, entityId }: { tagId: string; entityId: string }) =>
      api.tags.detach(tagId, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
