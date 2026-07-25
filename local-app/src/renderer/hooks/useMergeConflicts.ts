import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'

const QUERY_KEY = 'mergeConflicts'

export function useMergeConflicts(params: { workspace_id: string; merge_id?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => api.branches.listMergeConflicts(params),
    enabled: !!params.workspace_id,
  })
}

export function useResolveMergeConflict() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conflictId,
      data,
    }: {
      conflictId: string
      data: { resolution: 'ours' | 'theirs' | 'manual'; merged_content?: Record<string, unknown> }
    }) => api.branches.resolveConflict(conflictId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}

export function useMergeBranch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      sourceBranchId,
      targetBranchId,
    }: {
      sourceBranchId: string
      targetBranchId: string
    }) => api.branches.mergeInto(sourceBranchId, targetBranchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['branches'] })
    },
  })
}
