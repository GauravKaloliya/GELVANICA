import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskPost } from './flask-client'
import { requireUuid } from './validate'

export function registerGraphHandlers(authService: AuthService): void {
  safeHandle('graph:query', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/graph/query', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('graph:materialize', async (_event, workspaceId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/graph/materialize', { workspace_id: workspaceId }, tokens?.access_token)
  })

  safeHandle('graph:traverse', async (_event, workspaceId: string, entityId: string, depth: number) => {
    requireUuid(workspaceId, 'workspaceId')
    requireUuid(entityId, 'center_node')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/graph/traverse', { workspace_id: workspaceId, center_node: entityId, depth }, tokens?.access_token)
  })

  safeHandle('graph:paths', async (_event, workspaceId: string, sourceId: string, targetId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireUuid(sourceId, 'source_entity_id')
    requireUuid(targetId, 'target_entity_id')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/graph/paths', { workspace_id: workspaceId, source_entity_id: sourceId, target_entity_id: targetId }, tokens?.access_token)
  })
}
