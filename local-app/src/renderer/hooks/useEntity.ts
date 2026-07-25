import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'
import { api } from '@lib/api'
import type { EntityCreateRequest, EntityUpdateRequest, PaginationParams } from '@shared/types'

const QUERY_KEY = 'entities'

export function useEntities(params?: { workspace_id?: string } & PaginationParams) {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const workspaceId = params?.workspace_id ?? activeWorkspaceId ?? undefined

  return useQuery({
    queryKey: [QUERY_KEY, 'list', workspaceId, params],
    queryFn: () => api.entities.list({ ...params, workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useEntity(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => api.entities.get(id!),
    enabled: !!id,
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: EntityCreateRequest) => api.entities.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EntityUpdateRequest }) =>
      api.entities.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteEntity() {
  const queryClient = useQueryClient()
  const activeEntityId = useStore((s) => s.activeEntityId)
  const setActiveEntity = useStore((s) => s.setActiveEntity)

  return useMutation({
    mutationFn: (id: string) => api.entities.delete(id),
    onSuccess: (_data, id) => {
      if (activeEntityId === id) setActiveEntity(null)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useArchiveEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.entities.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useEntityTypes(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'types', { workspace_id: workspaceId }],
    queryFn: () => api.entities.types.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}


