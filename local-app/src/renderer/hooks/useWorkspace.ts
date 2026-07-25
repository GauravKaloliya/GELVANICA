import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '../store'
import { api } from '@lib/api'
import type { PaginationParams, WorkspaceCreateRequest, WorkspaceUpdateRequest } from '@shared/types'

const QUERY_KEY = 'workspaces'

export function useWorkspaces(params?: PaginationParams) {
  const setWorkspaces = useStore((s) => s.setWorkspaces)
  const isAuthenticated = useStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [QUERY_KEY, 'list', params],
    queryFn: async () => {
      const data = await api.workspaces.list(params)
      setWorkspaces(data)
      return data
    },
    enabled: isAuthenticated,
  })
}

export function useWorkspace(id: string | undefined) {
  const isAuthenticated = useStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => api.workspaces.get(id!),
    enabled: isAuthenticated && !!id,
  })
}

export function useWorkspaceStats(id: string | undefined) {
  const setStats = useStore((s) => s.setStats)
  const isAuthenticated = useStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: [QUERY_KEY, 'stats', id],
    queryFn: async () => {
      const data = await api.workspaces.stats(id!)
      setStats(data)
      return data
    },
    enabled: isAuthenticated && !!id,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const addWorkspace = useStore((s) => s.addWorkspace)

  return useMutation({
    mutationFn: (data: WorkspaceCreateRequest) => api.workspaces.create(data),
    onSuccess: (workspace) => {
      addWorkspace(workspace)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WorkspaceUpdateRequest }) =>
      api.workspaces.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  const removeWorkspace = useStore((s) => s.removeWorkspace)

  return useMutation({
    mutationFn: (id: string) => api.workspaces.delete(id),
    onSuccess: (_data, id) => {
      removeWorkspace(id)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

