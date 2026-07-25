import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { CommentCreateRequest, CommentUpdateRequest } from '@shared/types'

const QUERY_KEY = 'comments'

export function useComments(params?: { workspace_id?: string; entity_id?: string; block_id?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', params],
    queryFn: () => api.comments.list(params),
    enabled: !!params?.workspace_id,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CommentCreateRequest) => api.comments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CommentUpdateRequest }) =>
      api.comments.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.comments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
