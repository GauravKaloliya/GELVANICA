import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type {
  PaginationParams,
  SnapshotCreateRequest,
} from '@shared/types'

const QUERY_KEY = 'versions'

export function useSnapshots(params?: { workspace_id: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, 'snapshots', params],
    queryFn: () => api.versions.snapshots.list(),
    enabled: !params || !!params.workspace_id,
  })
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SnapshotCreateRequest) => api.versions.snapshots.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'snapshots'] })
    },
  })
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.versions.snapshots.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'snapshots'] })
    },
  })
}

export function useEntityVersions(entityId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: [QUERY_KEY, 'entities', entityId, params],
    queryFn: () => api.versions.entityVersions(entityId, params),
    enabled: !!entityId,
  })
}

export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => api.versions.restore(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
