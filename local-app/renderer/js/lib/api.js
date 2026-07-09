let _baseUrl = null

async function base() {
  if (!_baseUrl) {
    const port = await window.electron.getApiPort()
    _baseUrl = `http://localhost:${port}/api/v1`
  }
  return _baseUrl
}

async function req(method, path, body) {
  const url = `${await base()}${path}`
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body != null) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path}: ${res.status} ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function get(path) { return req('GET', path) }
function post(path, body) { return req('POST', path, body) }
function patch(path, body) { return req('PATCH', path, body) }
function del(path) { return req('DELETE', path) }

// ── Helpers ──
export function makeId(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowISO() {
  return new Date().toISOString()
}

function rowToPage(r) {
  let props = {}
  try { props = typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}) } catch {}
  return {
    id: r.id,
    title: r.title,
    entityType: r.entity_type || r.entity_type_id || 'page',
    blocks: [],
    meta: props.meta || {},
    createdAt: props.createdAt || r.created_at,
    updatedAt: props.updatedAt || r.updated_at,
    parentId: props.parentId || null,
    archivedAt: r.archived_at,
  }
}

function unpack(data) {
  return data?.results || data?.items || data || []
}

// ── Workspaces ──
export async function listWorkspaces() {
  const data = await get('/workspaces/')
  return unpack(data)
}

export async function createWorkspace(name, description = '', settings = {}) {
  return post('/workspaces/', { name, description, settings })
}

export async function getWorkspace(id) {
  try {
    return await get(`/workspaces/${id}`)
  } catch { return null }
}

export async function getWorkspaceStats(id) {
  try {
    return await get(`/workspaces/${id}/stats`)
  } catch { return null }
}

export async function updateWorkspace(id, updates) {
  return patch(`/workspaces/${id}`, updates)
}

export async function deleteWorkspace(id) {
  await del(`/workspaces/${id}`)
}

// ── Health ──
export async function healthCheck() {
  try {
    const port = await window.electron.getApiPort()
    const res = await fetch(`http://localhost:${port}/health`)
    return res.ok
  } catch { return false }
}

// ── Entities ──
export async function listEntities(workspaceId = 'default') {
  const data = await get(`/entities/?workspace_id=${workspaceId}`)
  return unpack(data).map(r => rowToPage(r))
}

export async function createEntity(workspaceId = 'default', title = 'Untitled', entityType = 'page') {
  const properties = { createdAt: nowISO(), updatedAt: nowISO(), parentId: null }
  const row = await post('/entities/', { workspace_id: workspaceId, title, entity_type_id: entityType, properties })
  return rowToPage(row)
}

export async function getEntity(id) {
  try {
    const row = await get(`/entities/${id}`)
    return row && !row.archived_at ? rowToPage(row) : null
  } catch { return null }
}

export async function getEntityChildren(id, page = 1, perPage = 50) {
  const data = await get(`/entities/${id}/children?page=${page}&per_page=${perPage}`)
  return unpack(data).map(r => rowToPage(r))
}

export async function createEntityChild(parentId, workspaceId = 'default', title = 'Untitled', entityType = 'page') {
  return post(`/entities/${parentId}/children`, { workspace_id: workspaceId, entity_type_id: entityType, title })
}

export async function updateEntity(id, updates) {
  const merged = { ...updates, updatedAt: nowISO() }
  const row = await patch(`/entities/${id}`, merged)
  return row ? rowToPage(row) : null
}

export async function deleteEntity(id) {
  await del(`/entities/${id}`)
}

export async function archiveEntity(id) {
  await post(`/entities/${id}/archive`)
}

export async function restoreEntity(id) {
  await post(`/entities/${id}/restore`)
}

export async function getTrashedEntities(workspaceId = 'default') {
  const data = await get(`/entities/?workspace_id=${workspaceId}`)
  const rows = unpack(data).filter(r => r.archived_at)
  return rows.map(r => rowToPage(r))
}

export async function duplicateEntity(id) {
  return post(`/entities/${id}/duplicate`)
}

export async function listEntityTypes() {
  const data = await get('/entities/types')
  return unpack(data)
}

export async function createEntityType(data) {
  return post('/entities/types', data)
}

export async function listEntityProperties() {
  const data = await get('/entities/properties')
  return unpack(data)
}

export async function createEntityProperty(data) {
  return post('/entities/properties', data)
}

export async function getEntityVersions(id) {
  try {
    return await get(`/entities/${id}/versions`)
  } catch { return [] }
}

// ── Blocks ──
export async function listBlocks(workspaceId = 'default') {
  const data = await get(`/blocks/?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function getEntityBlocks(entityId) {
  const data = await get(`/blocks/entity/${entityId}`)
  return unpack(data)
}

export async function createBlock(entityId, blockType = 'text', content = '', position = 0, parentBlockId = null, indent = 0) {
  return post('/blocks/', { entity_id: entityId, type: blockType, content, position, parent_block_id: parentBlockId })
}

export async function getBlock(id) {
  return get(`/blocks/${id}`)
}

export async function updateBlock(id, content) {
  return patch(`/blocks/${id}`, { content })
}

export async function moveBlock(id, newPosition, newParentBlockId = null) {
  return post(`/blocks/${id}/move`, { position: newPosition, parent_block_id: newParentBlockId })
}

export async function reorderBlocks(entityId, blockIds) {
  return post('/blocks/reorder', { entity_id: entityId, block_ids: blockIds })
}

export async function deleteBlock(id) {
  await del(`/blocks/${id}`)
}

export async function saveAllBlocks(entityId, blocks) {
  const existing = await getEntityBlocks(entityId)
  for (const b of existing) {
    try { await deleteBlock(b.id) } catch {}
  }
  const created = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    try {
      const result = await createBlock(entityId, b.type || 'text', b.content || '', i, null, 0)
      created.push(result)
    } catch (e) { console.error('Failed to save block:', e) }
  }
  return created
}

// ── Clear / Reset ──
export async function clearAllData(workspaceId = 'default') {
  const entities = await listEntities(workspaceId)
  for (const e of entities) {
    try { await deleteEntity(e.id) } catch {}
  }
  const tags = await listTags(workspaceId)
  for (const t of tags) {
    try { await deleteTag(t.id) } catch {}
  }
}

// ── Tags ──
export async function listTags(workspaceId = 'default') {
  const data = await get(`/tags/?workspace_id=${workspaceId}`)
  return unpack(data).map(r => ({ id: r.id, name: r.name, color: r.color }))
}

export async function createTag(workspaceId = 'default', name, color = '#3b82f6') {
  return post('/tags/', { workspace_id: workspaceId, name, color })
}

export async function getTag(id) {
  return get(`/tags/${id}`)
}

export async function updateTag(id, name) {
  const row = await patch(`/tags/${id}`, { name })
  return row ? { id: row.id, name: row.name, color: row.color } : null
}

export async function deleteTag(id) {
  await del(`/tags/${id}`)
}

export async function tagEntity(tagId, entityId) {
  return post(`/tags/${tagId}/entities/${entityId}`)
}

export async function untagEntity(tagId, entityId) {
  await del(`/tags/${tagId}/entities/${entityId}`)
}

// ── Relations ──
export async function listRelations(workspaceId = 'default') {
  const data = await get(`/relations/?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function createRelation(workspaceId, sourceEntityId, targetEntityId, relationType = 'refers_to', metadata = {}) {
  return post('/relations/', { workspace_id: workspaceId, source_entity_id: sourceEntityId, target_entity_id: targetEntityId, relation_type: relationType, metadata })
}

export async function getRelation(id) {
  return get(`/relations/${id}`)
}

export async function deleteRelation(id) {
  await del(`/relations/${id}`)
}

export async function getEntityRelations(entityId) {
  const data = await get(`/relations/entity/${entityId}`)
  return unpack(data)
}

export async function getEntityBacklinks(entityId) {
  const data = await get(`/relations/backlinks/${entityId}`)
  return unpack(data)
}

export async function getNeighbors(entityId) {
  const data = await get(`/relations/neighbors/${entityId}`)
  return data?.data || data
}

export async function findRelationPath(sourceEntityId, targetEntityId) {
  return get(`/relations/path?source_entity_id=${sourceEntityId}&target_entity_id=${targetEntityId}`)
}

// ── Search ──
export async function search(query, workspaceId = 'default', limit = 20) {
  const data = await get(`/search/?q=${encodeURIComponent(query)}&workspace_id=${workspaceId}&limit=${limit}`)
  return unpack(data)
}

// ── AI ──
export async function aiQuery(workspaceId, prompt, model = 'default') {
  return post('/ai/query', { workspace_id: workspaceId, prompt, model })
}

// ── Governance / Health ──
export async function getHealthScore(workspaceId = 'default') {
  try {
    return await get(`/governance/health?workspace_id=${workspaceId}`)
  } catch {
    return { score: 0, total_entities: 0, stale_entities: 0, orphans: 0, duplicates: 0 }
  }
}

export async function recalculateHealth(workspaceId = 'default') {
  return post('/governance/health-score', { workspace_id: workspaceId })
}

export async function getDuplicates(workspaceId = 'default') {
  const data = await get(`/governance/duplicates?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function getOrphans(workspaceId = 'default') {
  const data = await get(`/governance/orphans?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function getStale(workspaceId = 'default') {
  const data = await get(`/governance/stale?workspace_id=${workspaceId}`)
  return unpack(data)
}

// ── Graph ──
export async function getGraph(workspaceId = 'default') {
  return get(`/graph/?workspace_id=${workspaceId}`)
}

export async function materializeGraph(workspaceId = 'default') {
  return post('/graph/materialize', { workspace_id: workspaceId })
}

export async function queryGraph(workspaceId = 'default', relationTypes = [], entityTypeIds = [], limit = 200) {
  const body = { workspace_id: workspaceId, limit }
  if (relationTypes.length) body.relation_types = relationTypes
  if (entityTypeIds.length) body.entity_type_ids = entityTypeIds
  return post('/graph/query', body)
}

export async function traverseGraph(workspaceId = 'default', centerNode, depth = 2, relationTypes = []) {
  const body = { workspace_id: workspaceId, center_node: centerNode, depth }
  if (relationTypes.length) body.relation_types = relationTypes
  return post('/graph/traverse', body)
}

export async function findPaths(workspaceId = 'default', sourceEntityId, targetEntityId) {
  return post('/graph/paths', { workspace_id: workspaceId, source_entity_id: sourceEntityId, target_entity_id: targetEntityId })
}

// ── Activity ──
export async function getActivity(workspaceId = 'default', limit = 50) {
  const data = await get(`/activity/?workspace_id=${workspaceId}&limit=${limit}`)
  return unpack(data)
}

// ── Dashboard ──
export async function getDashboardOverview(workspaceId = 'default') {
  const data = await get(`/dashboard/overview?workspace_id=${workspaceId}`)
  return data?.data || data
}

// ── Branches ──
export async function listBranches(workspaceId = 'default') {
  const data = await get(`/branches/?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function createBranch(workspaceId, name, parentBranchId = null, description = '', isDefault = false) {
  return post('/branches/', { workspace_id: workspaceId, name, parent_branch_id: parentBranchId, description, is_default: isDefault })
}

export async function getBranch(id) {
  return get(`/branches/${id}`)
}

export async function deleteBranch(id) {
  await del(`/branches/${id}`)
}

export async function mergeBranch(id, targetBranchId) {
  return post(`/branches/${id}/merge`, { target_branch_id: targetBranchId })
}

export async function mergeBranches(sourceBranchId, targetBranchId) {
  return post('/branches/merge', { source_branch_id: sourceBranchId, target_branch_id: targetBranchId })
}

// ── Backups ──
export async function exportBackup(workspaceId = 'default') {
  return post('/backups/export', { workspace_id: workspaceId })
}

export async function exportBackupToDisk(workspaceId = 'default', filePath) {
  return post('/backups/export-to-disk', { workspace_id: workspaceId, file_path: filePath })
}

export async function importBackup(data) {
  return post('/backups/import', data)
}

// ── Comments ──
export async function listComments(entityId) {
  const data = await get(`/comments/?entity_id=${entityId}`)
  return unpack(data)
}

export async function createComment(entityId, content, parentCommentId = null) {
  return post('/comments/', { entity_id: entityId, content, parent_comment_id: parentCommentId })
}

export async function getComment(id) {
  return get(`/comments/${id}`)
}

export async function updateComment(id, content) {
  return patch(`/comments/${id}`, { content })
}

export async function deleteComment(id) {
  await del(`/comments/${id}`)
}

// ── Notifications ──
export async function listNotifications(workspaceId = 'default') {
  const data = await get(`/notifications/?workspace_id=${workspaceId}`)
  return unpack(data)
}

export async function createNotification(workspaceId, userId, type, title, message, entityId = null) {
  return post('/notifications/', { workspace_id: workspaceId, user_id: userId, type, title, message, entity_id: entityId })
}

export async function markNotificationRead(id) {
  return post(`/notifications/${id}/read`)
}

// ── Files ──
export async function listFiles(workspaceId = 'default', page = 1, perPage = 50) {
  const data = await get(`/files/?workspace_id=${workspaceId}&page=${page}&per_page=${perPage}`)
  return unpack(data)
}

export async function uploadFile(workspaceId, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('workspace_id', workspaceId)
  const url = `${await base()}/files/upload`
  const res = await fetch(url, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export async function createFile(workspaceId, fileName, fileData, mimeType = 'application/octet-stream') {
  return post('/files/', { workspace_id: workspaceId, name: fileName, data: fileData, mime_type: mimeType })
}

export async function getFile(fileId) {
  return get(`/files/${fileId}`)
}

export async function getFileDownloadUrl(fileId) {
  return `${await base()}/files/${fileId}/download`
}

export async function deleteFile(fileId) {
  await del(`/files/${fileId}`)
}

export async function presignFileUpload(fileName, mimeType) {
  try {
    return await post('/files/presign', { name: fileName, mime_type: mimeType })
  } catch { return null }
}

export async function attachFileToEntity(fileId, entityId) {
  return post(`/files/${fileId}/entities/${entityId}`)
}

export async function cleanupOrphanFiles(workspaceId = 'default') {
  return post('/files/cleanup-orphans', { workspace_id: workspaceId })
}
