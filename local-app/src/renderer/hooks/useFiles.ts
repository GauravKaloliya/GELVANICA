import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { CleanupOrphansRequest } from '@shared/types'

const QUERY_KEY = 'files'

export function useFiles(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', { workspace_id: workspaceId }],
    queryFn: () => api.files.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => api.files.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.files.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}

export function useCleanupOrphans() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data?: CleanupOrphansRequest) => api.files.cleanupOrphans(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}
