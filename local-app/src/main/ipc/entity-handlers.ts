import { safeHandle } from './handler-wrapper'
import { AuthService } from '../auth-service'
import { flaskGet, flaskPost, flaskPatch, flaskRequest } from './flask-client'
import { requireUuid, requireString } from './validate'
import { toSearchParams } from '../../shared/utils/query-params'

interface CreateEntityData {
  workspace_id: string
  title: string
  entity_type_id?: string
  content?: string
  parent_id?: string
  tags?: string[]
}

interface UpdateEntityData {
  title?: string
  entity_type_id?: string
}

interface CreateChildData {
  workspace_id: string
  title?: string
}

interface CreateEntityTypeData {
  name: string
}

interface CreateEntityPropertyData {
  name: string
  property_type: string
}

interface BlockData {
  block_type?: string
  content?: unknown
}

export function registerEntityHandlers(authService: AuthService): void {
  // Entity CRUD
  safeHandle('entity:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/entities/${qs}`, tokens?.access_token)
  })

  safeHandle('entity:get', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/entities/${entityId}`, tokens?.access_token)
  })

  safeHandle('entity:create', async (_event, data: unknown) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid payload')
    const body = data as CreateEntityData
    if (!body.workspace_id || typeof body.workspace_id !== 'string') throw new Error('workspace_id is required')
    if (!body.title || typeof body.title !== 'string') throw new Error('title is required')
    const { title, entity_type_id } = data as UpdateEntityData
    if (title !== undefined) requireString(title, 'title', { minLength: 1, maxLength: 500 })
    if (entity_type_id !== undefined) requireUuid(entity_type_id, 'entity_type_id')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/entities/', data, tokens?.access_token)
  })

  safeHandle('entity:update', async (_event, entityId: string, data: unknown) => {
    requireUuid(entityId, 'entityId')
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid payload: expected object')
    const { title, entity_type_id } = data as UpdateEntityData
    if (title !== undefined) requireString(title, 'title', { minLength: 1, maxLength: 500 })
    if (entity_type_id !== undefined) requireUuid(entity_type_id, 'entity_type_id')
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/entities/${entityId}`, data, tokens?.access_token)
  })

  safeHandle('entity:delete', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/entities/${entityId}`, undefined, tokens?.access_token)
  })

  safeHandle('entity:restore', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/entities/${entityId}/restore`, undefined, tokens?.access_token)
  })

  safeHandle('entity:archive', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/entities/${entityId}/archive`, undefined, tokens?.access_token)
  })

  safeHandle('entity:duplicate', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/entities/${entityId}/duplicate`, undefined, tokens?.access_token)
  })

  safeHandle('entity:children', async (_event, entityId: string, params?: Record<string, unknown>) => {
    requireUuid(entityId, 'parentId')
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/entities/${entityId}/children${qs}`, tokens?.access_token)
  })

  safeHandle('entity:create-child', async (_event, parentId: string, data: unknown) => {
    requireUuid(parentId, 'parentId')
    if (!data || typeof data !== 'object') throw new Error('Invalid payload')
    const body = data as CreateChildData
    if (!body.workspace_id) throw new Error('workspace_id is required')
    requireUuid(body.workspace_id, 'workspace_id')
    const { title } = data as UpdateEntityData
    if (title !== undefined) requireString(title, 'title', { minLength: 1, maxLength: 500 })
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/entities/${parentId}/children`, data, tokens?.access_token)
  })

  // Entity Types
  safeHandle('entity-types:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/entities/types${qs}`, tokens?.access_token)
  })

  safeHandle('entity-types:create', async (_event, data: unknown) => {
    const { name } = data as CreateEntityTypeData
    requireString(name, 'name', { minLength: 1, maxLength: 100 })
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/entities/types', data, tokens?.access_token)
  })

  // Entity Properties
  safeHandle('entity-properties:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/entities/properties${qs}`, tokens?.access_token)
  })

  safeHandle('entity-properties:create', async (_event, data: unknown) => {
    const { name, property_type } = data as CreateEntityPropertyData
    requireString(name, 'name', { minLength: 1, maxLength: 100 })
    requireString(property_type, 'property_type', { maxLength: 50 })
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/entities/properties', data, tokens?.access_token)
  })

  // Editor Blocks
  safeHandle('editor:block-create', async (_event, entityId: string, blockData: unknown) => {
    requireUuid(entityId, 'entityId')
    const { block_type, content } = (blockData ?? {}) as BlockData
    if (block_type !== undefined) requireString(block_type, 'block_type', { maxLength: 50 })
    if (content !== undefined && typeof content !== 'object') throw new Error('content must be an object')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/blocks/', { entity_id: entityId, ...(blockData as Record<string, unknown>) }, tokens?.access_token)
  })

  safeHandle('editor:block-update', async (_event, blockId: string, data: unknown) => {
    requireUuid(blockId, 'blockId')
    const { block_type, content } = (data ?? {}) as BlockData
    if (block_type !== undefined) requireString(block_type, 'block_type', { maxLength: 50 })
    if (content !== undefined && typeof content !== 'object') throw new Error('content must be an object')
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/blocks/${blockId}`, data, tokens?.access_token)
  })

  safeHandle('editor:block-move', async (_event, blockId: string, targetEntityId: string, position: number) => {
    requireUuid(blockId, 'blockId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/blocks/${blockId}/move`, { parent_block_id: null, target_entity_id: targetEntityId, position }, tokens?.access_token)
  })

  safeHandle('editor:reorder', async (_event, entityId: string, orderedIds: string[]) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/blocks/reorder', {
      entity_id: entityId,
      blocks: orderedIds.map((id, index) => ({ id, position: index })),
    }, tokens?.access_token)
  })

  // Block CRUD (extended)
  safeHandle('block:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/blocks/${qs}`, tokens?.access_token)
  })

  safeHandle('block:get', async (_event, blockId: string) => {
    requireUuid(blockId, 'blockId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/blocks/${blockId}`, tokens?.access_token)
  })

  safeHandle('block:entity-blocks', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/blocks/entity/${entityId}`, tokens?.access_token)
  })

  safeHandle('block:delete', async (_event, blockId: string) => {
    requireUuid(blockId, 'blockId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/blocks/${blockId}`, undefined, tokens?.access_token)
  })
}
