import { safeHandle } from './handler-wrapper'
import type { AuthService } from '../auth-service'
import { flaskPost } from './flask-client'
import { requireUuid, requireString } from './validate'

export function registerAiHandlers(authService: AuthService): void {
  safeHandle('ai:query', async (_event, workspaceId: string, query: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireString(query, 'query')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/ai/query', { workspace_id: workspaceId, question: query }, tokens?.access_token)
  })

  safeHandle('ai:suggest-relations', async (_event, workspaceId: string, entityId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireUuid(entityId, 'entity_id')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/ai/suggest-relations', { workspace_id: workspaceId, entity_id: entityId }, tokens?.access_token)
  })

  safeHandle('ai:summarize', async (_event, workspaceId: string, entityId: string) => {
    requireUuid(workspaceId, 'workspaceId')
    requireUuid(entityId, 'entity_id')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/ai/summarize', { workspace_id: workspaceId, entity_id: entityId }, tokens?.access_token)
  })
}
