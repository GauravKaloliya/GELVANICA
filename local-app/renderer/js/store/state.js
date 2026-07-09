import { listTags as apiLoadTags, createTag as apiCreateTag, updateTag as apiUpdateTag, deleteTag as apiDeleteTag, listEntities as apiLoadEntities, createEntity as apiCreateEntity, archiveEntity as apiSoftDelete, restoreEntity as apiRestoreEntity } from '../lib/api.js'

export const TAG_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899']

export const ENTITY_TYPE_DEFS = {
  Note: { icon: '\uD83D\uDCDD', color: '#3b82f6' },
  Person: { icon: '\uD83D\uDC64', color: '#8b5cf6' },
  Company: { icon: '\uD83C\uDFED', color: '#06b6d4' },
  Project: { icon: '\uD83D\uDCCB', color: '#f59e0b' },
  Event: { icon: '\uD83D\uDCC5', color: '#ef4444' },
  Book: { icon: '\uD83D\uDCDA', color: '#10b981' },
  Article: { icon: '\uD83D\uDCF0', color: '#ec4899' },
  Idea: { icon: '\uD83D\uDCA1', color: '#84cc16' },
}

export function createStore() {
  const state = {
    pages: [],
    tags: [],
    entities: [],
    currentPage: 'home',
    currentPageId: null,
    blocks: [],
    theme: 'dark',
    connected: false,
    searchQuery: '',
    online: false,
    user: null,
    authToken: null,
    entityFilter: { type: '', search: '' },
    entitySort: { key: 'createdAt', dir: 'desc' },
    localOnly: false,
    encryptDb: false,
    autoBackupInterval: 'never',
    backupLocation: '',
    includeAttachmentsInExport: true,
    showPageIcons: true,
    highlightSearchMatches: true,
    showWordCount: true,
    autosaveInterval: 3000,
    autoCreateSnapshots: false,
    snapshotRetentionDays: 30,
    autoEmptyTrashDays: 0,
    confirmBeforeDelete: true,
  }

  const listeners = new Set()

  function subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function setState(updates) {
    Object.assign(state, updates)
    for (const fn of listeners) {
      fn(state)
    }
  }

  function loadTags() {
    apiLoadTags('default').then(rows => {
      state.tags = rows
      setState({ tags: rows })
    }).catch(e => console.error('Failed to load tags from API:', e))
  }

  function createTag(name, color) {
    const id = 'tag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const tag = { id, name, color }
    state.tags.push(tag)
    setState({ tags: [...state.tags] })
    apiCreateTag('default', name, color).catch(e => console.error('API createTag error:', e))
    return tag
  }

  function getTagById(id) {
    return state.tags.find(t => t.id === id)
  }

  function updateTag(id, name) {
    const tag = state.tags.find(t => t.id === id)
    if (!tag) return null
    tag.name = name
    setState({ tags: [...state.tags] })
    apiUpdateTag(id, name).catch(e => console.error('API updateTag error:', e))
    return tag
  }

  function deleteTag(id) {
    state.tags = state.tags.filter(t => t.id !== id)
    setState({ tags: [...state.tags] })
    apiDeleteTag(id).catch(e => console.error('API deleteTag error:', e))
  }

  function mergeTags(sourceId, targetId) {
    state.tags = state.tags.filter(t => t.id !== sourceId)
    setState({ tags: [...state.tags] })
    apiDeleteTag(sourceId).catch(e => console.error('API mergeTags error:', e))
  }

  function saveTags() {
    // Tags are auto-persisted via API on create/update/delete
  }

  function loadEntities() {
    apiLoadEntities('default').then(rows => {
      state.entities = rows.map(r => ({
        id: r.id,
        name: r.title,
        type: r.entityType || 'Note',
        tags: [],
        properties: {},
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      setState({ entities: [...state.entities] })
    }).catch(e => console.error('Failed to load entities:', e))
  }

  function createEntity(type = 'Note') {
    const id = 'ent-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    const now = new Date().toISOString()
    const entity = { id, name: 'New ' + type, type, tags: [], properties: {}, createdAt: now, updatedAt: now }
    state.entities.push(entity)
    setState({ entities: [...state.entities] })
    apiCreateEntity('default', entity.name, type).catch(e => console.error('API createEntity error:', e))
    return entity
  }

  function getEntity(id) {
    return state.entities.find(e => e.id === id) || null
  }

  function deleteEntity(id) {
    const name = (state.entities.find(e => e.id === id)?.name) || 'Untitled'
    state.entities = state.entities.filter(e => e.id !== id)
    setState({ entities: [...state.entities] })
    apiSoftDelete(id).catch(e => console.error('API soft-delete entity error:', e))
    const toast = document.createElement('div')
    toast.className = 'undo-toast'
    toast.innerHTML = `
      <span>Moved "${name}" to trash</span>
      <button class="undo-toast-btn" title="Undo">Undo</button>
      <button class="undo-toast-close" title="Dismiss">&times;</button>`
    document.body.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('open'))
    toast.querySelector('.undo-toast-btn').addEventListener('click', async () => {
      apiRestoreEntity(id).catch(e => console.error('Restore error:', e))
      state.entities.push({ id, name, type: 'Note', tags: [], properties: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      setState({ entities: [...state.entities] })
      toast.classList.remove('open')
      setTimeout(() => toast.remove(), 200)
    })
    const remove = () => { toast.classList.remove('open'); setTimeout(() => toast.remove(), 200) }
    toast.querySelector('.undo-toast-close').addEventListener('click', remove)
    setTimeout(remove, 4000)
  }

  function init() {
    loadTags()
    loadEntities()
    const saved = localStorage.getItem('gnovium-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.assign(state, parsed)
      } catch (e) {}
    }
  }

  function saveSettings() {
    const keys = [
      'localOnly','encryptDb','autoBackupInterval','backupLocation',
      'includeAttachmentsInExport','showPageIcons','highlightSearchMatches',
      'showWordCount','autosaveInterval','autoCreateSnapshots',
      'snapshotRetentionDays','autoEmptyTrashDays','confirmBeforeDelete'
    ]
    const toSave = {}
    keys.forEach(k => { toSave[k] = state[k] })
    localStorage.setItem('gnovium-settings', JSON.stringify(toSave))
  }

  return {
    state,
    subscribe,
    setState,
    saveSettings,
    loadTags,
    saveTags,
    createTag,
    getTagById,
    updateTag,
    deleteTag,
    mergeTags,
    loadEntities,
    createEntity,
    getEntity,
    deleteEntity,
    init,
  }
}
