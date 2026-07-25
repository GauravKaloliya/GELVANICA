import { safeInvoke, safeOn } from '../safe-ipc'

export const featuresAPI = {
  backup: {
    exportWorkspace: (workspaceId: string): Promise<unknown> =>
      safeInvoke('backup:export', workspaceId),
    importWorkspace: (data: Record<string, unknown>): Promise<unknown> =>
      safeInvoke('backup:import', data),
    list: (): Promise<unknown> => safeInvoke('backup:list'),
    autoBackup: (workspaceId: string): Promise<unknown> =>
      safeInvoke('backup:auto-backup', workspaceId),
    exportToDisk: (workspaceId: string, filePath: string): Promise<unknown> =>
      safeInvoke('backup:export-to-disk', workspaceId, filePath),
    exportEncrypted: (workspaceId: string, password: string): Promise<unknown> =>
      safeInvoke('backup:export-encrypted', workspaceId, password),
    importEncrypted: (encryptedData: string, password: string): Promise<unknown> =>
      safeInvoke('backup:import-encrypted', encryptedData, password),
    changePassword: (encryptedData: string, oldPassword: string, newPassword: string): Promise<unknown> =>
      safeInvoke('backup:change-password', encryptedData, oldPassword, newPassword),
    startTimer: (): Promise<void> => safeInvoke('backup:start-timer') as Promise<void>,
    stopTimer: (): Promise<void> => safeInvoke('backup:stop-timer') as Promise<void>,
  },

  graph: {
    query: (workspaceId: string): Promise<unknown> =>
      safeInvoke('graph:query', workspaceId),
    materialize: (workspaceId: string): Promise<unknown> =>
      safeInvoke('graph:materialize', workspaceId),
    traverse: (workspaceId: string, entityId: string, depth: number): Promise<unknown> =>
      safeInvoke('graph:traverse', workspaceId, entityId, depth),
    shortestPath: (workspaceId: string, sourceId: string, targetId: string): Promise<unknown> =>
      safeInvoke('graph:paths', workspaceId, sourceId, targetId),
  },

  search: {
    keyword: (workspaceId: string, query: string): Promise<unknown> =>
      safeInvoke('search:keyword', workspaceId, query),
    semantic: (workspaceId: string, query: string): Promise<unknown> =>
      safeInvoke('search:semantic', workspaceId, query),
    hybrid: (workspaceId: string, query: string): Promise<unknown> =>
      safeInvoke('search:hybrid', workspaceId, query),
    onOpen: (listener: () => void) => safeOn('search:open', listener),
  },

  ai: {
    query: (workspaceId: string, query: string): Promise<unknown> =>
      safeInvoke('ai:query', workspaceId, query),
    suggestRelations: (workspaceId: string, entityId: string): Promise<unknown> =>
      safeInvoke('ai:suggest-relations', workspaceId, entityId),
    summarize: (workspaceId: string, entityId: string): Promise<unknown> =>
      safeInvoke('ai:summarize', workspaceId, entityId),
  },

  editor: {
    blockCreate: (entityId: string, blockData: unknown): Promise<unknown> =>
      safeInvoke('editor:block-create', entityId, blockData),
    blockUpdate: (blockId: string, data: unknown): Promise<unknown> =>
      safeInvoke('editor:block-update', blockId, data),
    blockMove: (blockId: string, targetEntityId: string, position: number): Promise<unknown> =>
      safeInvoke('editor:block-move', blockId, targetEntityId, position),
    blockReorder: (entityId: string, orderedIds: string[]): Promise<unknown> =>
      safeInvoke('editor:reorder', entityId, orderedIds),
    onNewEntity: (listener: () => void) => safeOn('editor:new-entity', listener),
    onSave: (listener: () => void) => safeOn('editor:save', listener),
  },

  versioning: {
    history: (entityId: string): Promise<unknown> =>
      safeInvoke('versioning:history', entityId),
    snapshot: (branchId: string, name: string, description: string): Promise<unknown> =>
      safeInvoke('versioning:snapshot', branchId, name, description),
    branches: (workspaceId: string): Promise<unknown> =>
      safeInvoke('versioning:branches', workspaceId),
    createBranch: (workspaceId: string, name: string, description: string): Promise<unknown> =>
      safeInvoke('versioning:create-branch', workspaceId, name, description),
    diff: (leftVersionId: string, rightVersionId: string): Promise<unknown> =>
      safeInvoke('versioning:diff', leftVersionId, rightVersionId),
    merge: (sourceBranchId: string, targetBranchId: string): Promise<unknown> =>
      safeInvoke('versioning:merge', sourceBranchId, targetBranchId),
    resolveConflict: (id: string, resolution: string): Promise<unknown> =>
      safeInvoke('versioning:resolve-conflict', id, resolution),
  },

  governance: {
    health: (workspaceId: string): Promise<unknown> =>
      safeInvoke('governance:health', workspaceId),
    duplicates: (workspaceId: string): Promise<unknown> =>
      safeInvoke('governance:duplicates', workspaceId),
    orphans: (workspaceId: string): Promise<unknown> =>
      safeInvoke('governance:orphans', workspaceId),
    stale: (workspaceId: string, days: number): Promise<unknown> =>
      safeInvoke('governance:stale', workspaceId, days),
  },
}
