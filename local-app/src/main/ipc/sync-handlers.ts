import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet, flaskPost } from './flask-client'
import { requireUuid } from './validate'

export function registerSyncHandlers(authService: AuthService): void {
  safeHandle('sync:status', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/sync/?workspace_id=${workspaceId}&pending=true`, tokens?.access_token)
  })

  safeHandle('sync:trigger', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/sync/', { workspace_id: workspaceId, operation_type: 'push' }, tokens?.access_token)
  })
}
