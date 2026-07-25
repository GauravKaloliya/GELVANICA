import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskGet } from './flask-client'
import { requireUuid } from './validate'

export function registerDashboardHandlers(authService: AuthService): void {
  safeHandle('dashboard:overview', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/dashboard/overview?workspace_id=${workspaceId}`, tokens?.access_token)
  })
}
