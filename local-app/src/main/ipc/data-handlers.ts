import { safeHandle } from './handler-wrapper'
import { readFile, writeFile, stat } from 'fs/promises'
import { AuthService } from '../auth-service'
import { FLASK_BASE_URL, flaskGet, flaskPost, flaskPatch, flaskRequest, safePath } from './flask-client'
import { requireUuid, requireString, requireSafeFilename, validateFileMagicBytes, requireAllowedFileType } from './validate'
import { acquireUploadSlot, releaseUploadSlot } from './upload-limiter'
import { logger } from '../logger'
import { toSearchParams } from '../../shared/utils/query-params'

interface CreateRelationData {
  source_entity_id: string
  target_entity_id: string
  relation_type: string
}

interface CreateTagData {
  name: string
  color?: string
}

interface CreateCommentData {
  entity_id: string
  block_id?: string
  content: string
  author_id?: string
}

export function registerDataHandlers(authService: AuthService): void {
  // ─── Relation CRUD ───────────────────────────────────
  safeHandle('relation:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/relations/${qs}`, tokens?.access_token)
  })

  safeHandle('relation:get', async (_event, relationId: string) => {
    requireUuid(relationId, 'relationId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/relations/${relationId}`, tokens?.access_token)
  })

  safeHandle('relation:create', async (_event, data: unknown) => {
    const { source_entity_id, target_entity_id, relation_type } = data as CreateRelationData
    requireUuid(source_entity_id, 'source_entity_id')
    requireUuid(target_entity_id, 'target_entity_id')
    requireString(relation_type, 'relation_type', { maxLength: 100 })
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/relations/', data, tokens?.access_token)
  })

  safeHandle('relation:delete', async (_event, relationId: string) => {
    requireUuid(relationId, 'relationId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/relations/${relationId}`, undefined, tokens?.access_token)
  })

  safeHandle('relation:outgoing', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/relations/entity/${entityId}`, tokens?.access_token)
  })

  safeHandle('relation:backlinks', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/relations/backlinks/${entityId}`, tokens?.access_token)
  })

  safeHandle('relation:neighbors', async (_event, entityId: string) => {
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/relations/neighbors/${entityId}`, tokens?.access_token)
  })

  safeHandle('relation:path', async (_event, sourceId: string, targetId: string) => {
    requireUuid(sourceId, 'sourceId')
    requireUuid(targetId, 'targetId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/relations/path?source_entity_id=${sourceId}&target_entity_id=${targetId}`, tokens?.access_token)
  })

  // ─── Tag CRUD ────────────────────────────────────────
  safeHandle('tag:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/tags/${qs}`, tokens?.access_token)
  })

  safeHandle('tag:get', async (_event, tagId: string) => {
    requireUuid(tagId, 'tagId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/tags/${tagId}`, tokens?.access_token)
  })

  safeHandle('tag:create', async (_event, data: unknown) => {
    const { name, color } = data as CreateTagData
    requireString(name, 'name', { minLength: 1, maxLength: 50 })
    if (color !== undefined) requireString(color, 'color', { maxLength: 20 })
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/tags/', data, tokens?.access_token)
  })

  safeHandle('tag:update', async (_event, tagId: string, data: unknown) => {
    requireUuid(tagId, 'tagId')
    const { name, color } = data as CreateTagData
    if (name !== undefined) requireString(name, 'name', { minLength: 1, maxLength: 50 })
    if (color !== undefined) requireString(color, 'color', { maxLength: 20 })
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/tags/${tagId}`, data, tokens?.access_token)
  })

  safeHandle('tag:delete', async (_event, tagId: string) => {
    requireUuid(tagId, 'tagId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/tags/${tagId}`, undefined, tokens?.access_token)
  })

  safeHandle('tag:attach', async (_event, tagId: string, entityId: string) => {
    requireUuid(tagId, 'tagId')
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/tags/${tagId}/entities/${entityId}`, undefined, tokens?.access_token)
  })

  safeHandle('tag:detach', async (_event, tagId: string, entityId: string) => {
    requireUuid(tagId, 'tagId')
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/tags/${tagId}/entities/${entityId}`, undefined, tokens?.access_token)
  })

  // ─── Comment CRUD ────────────────────────────────────
  safeHandle('comment:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/comments/${qs}`, tokens?.access_token)
  })

  safeHandle('comment:get', async (_event, commentId: string) => {
    requireUuid(commentId, 'commentId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/comments/${commentId}`, tokens?.access_token)
  })

  safeHandle('comment:create', async (_event, data: unknown) => {
    const { entity_id, block_id, content, author_id } = data as CreateCommentData
    requireUuid(entity_id, 'entity_id')
    if (block_id !== undefined) requireUuid(block_id, 'block_id')
    requireString(content, 'content', { minLength: 1, maxLength: 10000 })
    if (author_id !== undefined) requireUuid(author_id, 'author_id')
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/comments/', data, tokens?.access_token)
  })

  safeHandle('comment:update', async (_event, commentId: string, data: unknown) => {
    requireUuid(commentId, 'commentId')
    const { content } = data as CreateCommentData
    if (content !== undefined) requireString(content, 'content', { minLength: 1, maxLength: 10000 })
    const tokens = authService.getTokens()
    return flaskPatch(`/api/v1/comments/${commentId}`, data, tokens?.access_token)
  })

  safeHandle('comment:delete', async (_event, commentId: string) => {
    requireUuid(commentId, 'commentId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/comments/${commentId}`, undefined, tokens?.access_token)
  })

  // ─── File CRUD ───────────────────────────────────────
  safeHandle('file:list', async (_event, params?: Record<string, unknown>) => {
    const tokens = authService.getTokens()
    const qs = params ? toSearchParams(params) : ''
    return flaskGet(`/api/v1/files/${qs}`, tokens?.access_token)
  })

  safeHandle('file:get', async (_event, fileId: string) => {
    requireUuid(fileId, 'fileId')
    const tokens = authService.getTokens()
    return flaskGet(`/api/v1/files/${fileId}`, tokens?.access_token)
  })

  safeHandle('file:upload', async (_event, filePath: string, workspaceId?: string) => {
    try {
      const tokens = authService.getTokens()
      const safe = safePath(filePath)
      const fileName = safe.split(/[/\\]/).pop() ?? 'file'

      requireSafeFilename(fileName)

      const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
      const fileStat = await stat(safe)
      if (fileStat.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${Math.round(fileStat.size / 1024 / 1024)}MB exceeds 100MB limit`)
      }

      const buffer = await readFile(safe)

      // Validate file type via magic bytes
      const detectedMime = validateFileMagicBytes(buffer.buffer, undefined)
      requireAllowedFileType(detectedMime)

      const uploadId = `${fileName}-${Date.now()}`
      if (!acquireUploadSlot(uploadId)) {
        throw new Error('Too many concurrent uploads. Please try again later.')
      }

      try {
        const formData = new FormData()
        formData.append('file', new Blob([buffer]), fileName)
        if (workspaceId) formData.append('workspace_id', workspaceId)
        const headers: Record<string, string> = {}
        if (tokens?.access_token) headers['Authorization'] = `Bearer ${tokens.access_token}`
        const response = await fetch(`${FLASK_BASE_URL}/api/v1/files/upload`, {
          method: 'POST',
          headers,
          body: formData,
          signal: AbortSignal.timeout(60000),
        })
        return response.json().catch(() => null)
      } finally {
        releaseUploadSlot(uploadId)
      }
    } catch (error) {
      logger.error('DataHandlers', 'file:upload failed', error)
      throw error
    }
  })

  safeHandle('file:download', async (_event, fileId: string, savePath?: string) => {
    try {
      requireUuid(fileId, 'fileId')
      const tokens = authService.getTokens()
      const headers: Record<string, string> = {}
      if (tokens?.access_token) headers['Authorization'] = `Bearer ${tokens.access_token}`
      const response = await fetch(`${FLASK_BASE_URL}/api/v1/files/${fileId}/download`, {
        headers,
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) return { ok: false, error: response.statusText }
      const buffer = Buffer.from(await response.arrayBuffer())
      if (savePath) {
        const safe = safePath(savePath)
        await writeFile(safe, buffer)
        return { ok: true, path: safe, size: buffer.length }
      }
      return { ok: true, data: buffer.toString('base64'), size: buffer.length }
    } catch (error) {
      logger.error('DataHandlers', 'file:download failed', error)
      throw error
    }
  })

  safeHandle('file:delete', async (_event, fileId: string) => {
    requireUuid(fileId, 'fileId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/files/${fileId}`, undefined, tokens?.access_token)
  })

  safeHandle('file:link', async (_event, fileId: string, entityId: string) => {
    requireUuid(fileId, 'fileId')
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskPost(`/api/v1/files/${fileId}/entities/${entityId}`, undefined, tokens?.access_token)
  })

  safeHandle('file:unlink', async (_event, fileId: string, entityId: string) => {
    requireUuid(fileId, 'fileId')
    requireUuid(entityId, 'entityId')
    const tokens = authService.getTokens()
    return flaskRequest('DELETE', `/api/v1/files/${fileId}/entities/${entityId}`, undefined, tokens?.access_token)
  })

  safeHandle('file:cleanup-orphans', async () => {
    const tokens = authService.getTokens()
    return flaskPost('/api/v1/files/cleanup-orphans', undefined, tokens?.access_token)
  })
}
