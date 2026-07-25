import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@lib/api'
import type { BackupExportRequest, BackupImportRequest } from '@shared/types'

const QUERY_KEY = 'backups'

export function useBackupList(workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', { workspace_id: workspaceId }],
    queryFn: () => api.backups.list({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  })
}

export function useExportBackup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BackupExportRequest) => api.backups.export(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}

export function useImportBackup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BackupImportRequest) => api.backups.import(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}

export function useDeleteBackup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (backupId: string) => api.backups.delete(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] })
    },
  })
}
