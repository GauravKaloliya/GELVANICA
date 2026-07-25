import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { readSettings, flaskGet, flaskPost, flaskRequest, safePath } from './flask-client'
import type { AppSettings } from '@shared/types'
import { logger } from '../logger'
import { requireUuid, requireString } from './validate'
import { encryptData, decryptData } from '../crypto'

let backupTimer: ReturnType<typeof setInterval> | null = null

export async function performAutoBackup(): Promise<void> {
  try {
    const settings = await readSettings()
    if (!settings.backups?.backup_interval) return
    logger.info('Backup', 'Performing auto-backup')
    const result = await flaskGet<{ data?: Array<{ id: string }> }>('/api/v1/workspaces/')
    const workspaces = result.ok && result.data?.data ? result.data.data : []
    for (const ws of workspaces) {
      await flaskPost('/api/v1/backups/export', { workspace_id: ws.id })
    }
    logger.info('Backup', `Auto-backup completed for ${workspaces.length} workspace(s)`)
  } catch (error) {
    logger.error('Backup', 'Auto-backup failed:', error)
  }
}

export function registerBackupHandlers(authService: AuthService): void {
  safeHandle('backup:export', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:import', async (_event, data: Record<string, unknown>) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup import payload')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/import', data, tokens?.access_token)
  })

  safeHandle('backup:list', async () => {
    const tokens = authService.getTokens()
    return flaskGet('/api/v1/backups/', tokens?.access_token)
  })

  safeHandle('backup:auto-backup', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:export-to-disk', async (_event, workspaceId: string, filePath: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(filePath, 'filePath')
    if (!safePath(filePath)) throw new Error('Invalid file path')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-to-disk', { workspace_id: workspaceId, path: filePath }, tokens?.access_token)
  })

  safeHandle('backup:start-timer', async () => {
    const settings = await readSettings()
    const intervalMs = Number((settings as AppSettings).backups?.backup_interval) || 86400000
    if (backupTimer) clearInterval(backupTimer)
    backupTimer = setInterval(() => {
      performAutoBackup().catch((e) => logger.error('Backup', 'Auto backup failed', e))
    }, intervalMs)
  })

  safeHandle('backup:stop-timer', async () => {
    if (backupTimer) {
      clearInterval(backupTimer)
      backupTimer = null
    }
  })

  safeHandle('backup:export-encrypted', async (_event, workspaceId: string, password: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    const result = await flaskPost('/api/v1/backups/export', { workspace_id: workspaceId }, tokens?.access_token)
    if (!result.ok) throw new Error(result.error ?? 'Export failed')
    const json = JSON.stringify(result.data)
    const encrypted = encryptData(json, password)
    return { data: encrypted.toString('base64') }
  })

  safeHandle('backup:import-encrypted', async (_event, encryptedData: string, password: string) => {
    try {
      const buffer = Buffer.from(encryptedData, 'base64')
      const json = decryptData(buffer, password)
      const parsed = JSON.parse(json)
      const tokens = authService.getTokens()
      return flaskPost('/api/v1/backups/import', parsed, tokens?.access_token)
    } catch {
      throw new Error('Decryption failed — incorrect password or corrupted data')
    }
  })

  safeHandle('backup:change-password', async (_event, encryptedData: string, oldPassword: string, newPassword: string) => {
    try {
      const buffer = Buffer.from(encryptedData, 'base64')
      const json = decryptData(buffer, oldPassword)
      const reEncrypted = encryptData(json, newPassword)
      return { data: reEncrypted.toString('base64') }
    } catch {
      throw new Error('Decryption failed — incorrect password or corrupted data')
    }
  })

  safeHandle('backup:export-markdown', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-markdown', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:export-zip', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-zip', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:export-html', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-html', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:export-pdf', async (_event, workspaceId: string, entityId?: string) => {
    requireUuid(workspaceId, 'workspaceId')
    if (entityId) requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-pdf', { workspace_id: workspaceId, entity_id: entityId }, tokens?.access_token)
  })

  safeHandle('backup:export-zip-encrypted', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/export-zip-encrypted', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('backup:import-zip', async (_event, workspaceId: string, filePath: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(filePath, 'filePath')
    if (!safePath(filePath)) throw new Error('Invalid file path')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/backups/import-zip', { workspace_id: workspaceId, file_path: filePath }, tokens?.access_token)
  })

  safeHandle('backup:delete', async (_event, backupId: string) => {
    requireUuid(backupId, 'backupId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/backups/${backupId}`, undefined, tokens?.access_token)
  })

  safeHandle('backup:rotate-key', async () => {
    const { rotateBackupKey } = await import('./secret-rotation')
    await rotateBackupKey()
    return { rotated: true }
  })
}
