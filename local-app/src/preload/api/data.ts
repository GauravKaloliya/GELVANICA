import { safeInvoke } from '../safe-ipc'
import type { Workspace, Entity, Block, Relation, Tag, Comment, GnoviumFile } from '@shared/types'

export const dataAPI = {
  workspace: {
    list: (params?: Record<string, unknown>): Promise<Workspace[]> =>
      safeInvoke('workspace:list', params) as Promise<Workspace[]>,
    get: (workspaceId: string): Promise<Workspace> =>
      safeInvoke('workspace:get', workspaceId) as Promise<Workspace>,
    create: (data: { name: string; description?: string }): Promise<Workspace> =>
      safeInvoke('workspace:create', data) as Promise<Workspace>,
    update: (workspaceId: string, data: { name?: string; description?: string }): Promise<Workspace> =>
      safeInvoke('workspace:update', workspaceId, data) as Promise<Workspace>,
    delete: (workspaceId: string): Promise<void> =>
      safeInvoke('workspace:delete', workspaceId) as Promise<void>,
    stats: (workspaceId: string): Promise<Record<string, unknown>> =>
      safeInvoke('workspace:stats', workspaceId) as Promise<Record<string, unknown>>,
  },

  entity: {
    list: (params?: Record<string, unknown>): Promise<Entity[]> =>
      safeInvoke('entity:list', params) as Promise<Entity[]>,
    get: (entityId: string): Promise<Entity> =>
      safeInvoke('entity:get', entityId) as Promise<Entity>,
    create: (data: unknown): Promise<Entity> =>
      safeInvoke('entity:create', data) as Promise<Entity>,
    update: (entityId: string, data: unknown): Promise<Entity> =>
      safeInvoke('entity:update', entityId, data) as Promise<Entity>,
    delete: (entityId: string): Promise<void> =>
      safeInvoke('entity:delete', entityId) as Promise<void>,
    restore: (entityId: string): Promise<void> =>
      safeInvoke('entity:restore', entityId) as Promise<void>,
    archive: (entityId: string): Promise<void> =>
      safeInvoke('entity:archive', entityId) as Promise<void>,
    duplicate: (entityId: string): Promise<Entity> =>
      safeInvoke('entity:duplicate', entityId) as Promise<Entity>,
    children: (entityId: string, params?: Record<string, unknown>): Promise<Entity[]> =>
      safeInvoke('entity:children', entityId, params) as Promise<Entity[]>,
    createChild: (parentId: string, data: unknown): Promise<Entity> =>
      safeInvoke('entity:create-child', parentId, data) as Promise<Entity>,
  },

  entityTypes: {
    list: (params?: Record<string, unknown>): Promise<unknown[]> =>
      safeInvoke('entity-types:list', params) as Promise<unknown[]>,
    create: (data: unknown): Promise<unknown> =>
      safeInvoke('entity-types:create', data) as Promise<unknown>,
  },

  entityProperties: {
    list: (params?: Record<string, unknown>): Promise<unknown[]> =>
      safeInvoke('entity-properties:list', params) as Promise<unknown[]>,
    create: (data: unknown): Promise<unknown> =>
      safeInvoke('entity-properties:create', data) as Promise<unknown>,
  },

  block: {
    list: (params?: Record<string, unknown>): Promise<Block[]> =>
      safeInvoke('block:list', params) as Promise<Block[]>,
    get: (blockId: string): Promise<Block> =>
      safeInvoke('block:get', blockId) as Promise<Block>,
    entityBlocks: (entityId: string): Promise<Block[]> =>
      safeInvoke('block:entity-blocks', entityId) as Promise<Block[]>,
    delete: (blockId: string): Promise<void> =>
      safeInvoke('block:delete', blockId) as Promise<void>,
  },

  relation: {
    list: (params?: Record<string, unknown>): Promise<Relation[]> =>
      safeInvoke('relation:list', params) as Promise<Relation[]>,
    get: (relationId: string): Promise<Relation> =>
      safeInvoke('relation:get', relationId) as Promise<Relation>,
    create: (data: unknown): Promise<Relation> =>
      safeInvoke('relation:create', data) as Promise<Relation>,
    delete: (relationId: string): Promise<void> =>
      safeInvoke('relation:delete', relationId) as Promise<void>,
    outgoing: (entityId: string): Promise<Relation[]> =>
      safeInvoke('relation:outgoing', entityId) as Promise<Relation[]>,
    backlinks: (entityId: string): Promise<Relation[]> =>
      safeInvoke('relation:backlinks', entityId) as Promise<Relation[]>,
    neighbors: (entityId: string): Promise<unknown> =>
      safeInvoke('relation:neighbors', entityId) as Promise<unknown>,
    path: (sourceId: string, targetId: string): Promise<unknown> =>
      safeInvoke('relation:path', sourceId, targetId) as Promise<unknown>,
  },

  tag: {
    list: (params?: Record<string, unknown>): Promise<Tag[]> =>
      safeInvoke('tag:list', params) as Promise<Tag[]>,
    get: (tagId: string): Promise<Tag> =>
      safeInvoke('tag:get', tagId) as Promise<Tag>,
    create: (data: unknown): Promise<Tag> =>
      safeInvoke('tag:create', data) as Promise<Tag>,
    update: (tagId: string, data: unknown): Promise<Tag> =>
      safeInvoke('tag:update', tagId, data) as Promise<Tag>,
    delete: (tagId: string): Promise<void> =>
      safeInvoke('tag:delete', tagId) as Promise<void>,
    attach: (tagId: string, entityId: string): Promise<void> =>
      safeInvoke('tag:attach', tagId, entityId) as Promise<void>,
    detach: (tagId: string, entityId: string): Promise<void> =>
      safeInvoke('tag:detach', tagId, entityId) as Promise<void>,
  },

  comment: {
    list: (params?: Record<string, unknown>): Promise<Comment[]> =>
      safeInvoke('comment:list', params) as Promise<Comment[]>,
    get: (commentId: string): Promise<Comment> =>
      safeInvoke('comment:get', commentId) as Promise<Comment>,
    create: (data: unknown): Promise<Comment> =>
      safeInvoke('comment:create', data) as Promise<Comment>,
    update: (commentId: string, data: unknown): Promise<Comment> =>
      safeInvoke('comment:update', commentId, data) as Promise<Comment>,
    delete: (commentId: string): Promise<void> =>
      safeInvoke('comment:delete', commentId) as Promise<void>,
  },

  file: {
    list: (params?: Record<string, unknown>): Promise<GnoviumFile[]> =>
      safeInvoke('file:list', params) as Promise<GnoviumFile[]>,
    get: (fileId: string): Promise<GnoviumFile> =>
      safeInvoke('file:get', fileId) as Promise<GnoviumFile>,
    upload: (filePath: string): Promise<GnoviumFile> =>
      safeInvoke('file:upload', filePath) as Promise<GnoviumFile>,
    download: (fileId: string, savePath?: string): Promise<string> =>
      safeInvoke('file:download', fileId, savePath) as Promise<string>,
    delete: (fileId: string): Promise<void> =>
      safeInvoke('file:delete', fileId) as Promise<void>,
    link: (fileId: string, entityId: string): Promise<void> =>
      safeInvoke('file:link', fileId, entityId) as Promise<void>,
    unlink: (fileId: string, entityId: string): Promise<void> =>
      safeInvoke('file:unlink', fileId, entityId) as Promise<void>,
    cleanupOrphans: (): Promise<{ removed: number }> =>
      safeInvoke('file:cleanup-orphans') as Promise<{ removed: number }>,
  },
}
