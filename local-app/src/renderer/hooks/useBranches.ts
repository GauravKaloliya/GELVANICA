import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { BranchCreateRequest } from '@shared/types'

const QUERY_KEY = 'branches'

export function useBranches(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, { workspace_id: workspaceId }],
    queryFn: () => api.branches.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useCreateBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BranchCreateRequest) => api.branches.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.branches.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

