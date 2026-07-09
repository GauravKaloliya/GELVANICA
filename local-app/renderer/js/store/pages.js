import { listEntities as loadEntities, createEntity, updateEntity, archiveEntity, deleteEntity as permanentDeleteEntity, restoreEntity, getTrashedEntities, makeId, nowISO } from '../lib/api.js'

export function createPagesStore(store) {
  async function loadPages() {
    try {
      const rows = await loadEntities('default')
      store.state.pages = rows
      store.setState({ pages: rows })
    } catch (e) {
      console.error('Failed to load pages from DB:', e)
      store.state.pages = []
    }
  }

  function createPage(title = 'Untitled') {
    const now = nowISO()
    const id = makeId('page-')
    const page = {
      id,
      title,
      blocks: [],
      meta: {},
      createdAt: now,
      updatedAt: now,
      parentId: null,
    }
    store.state.pages.push(page)
    createEntity('default', title, 'page').catch(e => console.error('API createPage error:', e))
    store.setState({ pages: [...store.state.pages] })
    return page
  }

  function findPage(id) {
    return store.state.pages.find(p => p.id === id)
  }

  function updatePage(id, updates) {
    const page = store.state.pages.find(p => p.id === id)
    if (!page) return null
    Object.assign(page, updates)
    page.updatedAt = new Date().toISOString()
    const props = {
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      parentId: page.parentId,
      meta: page.meta || {},
    }
    updateEntity(id, { title: page.title, properties: props }).catch(e => console.error('API updatePage error:', e))
    store.setState({ pages: [...store.state.pages] })
    return page
  }

  function deletePage(id, onDeleteNavigate) {
    function collectDescendantIds(parentId) {
      const ids = []
      for (const p of store.state.pages) {
        if (p.parentId === parentId) {
          ids.push(p.id)
          ids.push(...collectDescendantIds(p.id))
        }
      }
      return ids
    }

    const toRemove = new Set([id, ...collectDescendantIds(id)])
    store.state.pages = store.state.pages.filter(p => !toRemove.has(p.id))

    for (const removeId of toRemove) {
      archiveEntity(removeId).catch(e => console.error('API deletePage error:', e))
    }
    store.setState({ pages: [...store.state.pages] })

    if (store.state.currentPageId === id && typeof onDeleteNavigate === 'function') {
      onDeleteNavigate()
    }
  }

  function softDeletePage(id, onDeleteNavigate) {
    function collectDescendantIds(parentId) {
      const ids = []
      for (const p of store.state.pages) {
        if (p.parentId === parentId) {
          ids.push(p.id)
          ids.push(...collectDescendantIds(p.id))
        }
      }
      return ids
    }
    const toRemove = new Set([id, ...collectDescendantIds(id)])
    store.state.pages = store.state.pages.filter(p => !toRemove.has(p.id))
    for (const removeId of toRemove) {
      archiveEntity(removeId).catch(e => console.error('API softDelete error:', e))
    }
    store.setState({ pages: [...store.state.pages] })
    if (store.state.currentPageId === id && typeof onDeleteNavigate === 'function') {
      onDeleteNavigate()
    }
  }

  function restorePageFromTrash(id) {
    restoreEntity(id).catch(e => console.error('API restore error:', e))
    window.setTimeout(() => {
      const pagesStore = window.__pagesStore || store
      if (pagesStore.loadPages) pagesStore.loadPages()
    }, 100)
  }

  function permanentDeletePage(id) {
    function collectDescendantIds(parentId) {
      const ids = []
      for (const p of store.state.pages) {
        if (p.parentId === parentId) {
          ids.push(p.id)
          ids.push(...collectDescendantIds(p.id))
        }
      }
      return ids
    }
    const toRemove = new Set([id, ...collectDescendantIds(id)])
    store.state.pages = store.state.pages.filter(p => !toRemove.has(p.id))
    for (const removeId of toRemove) {
      permanentDeleteEntity(removeId).catch(e => console.error('API permanentDelete error:', e))
    }
    store.setState({ pages: [...store.state.pages] })
  }

  async function loadTrashedPages() {
    try {
      return await getTrashedEntities('default')
    } catch (e) {
      console.error('Failed to load trashed pages:', e)
      return []
    }
  }

  function toggleFavorite(id) {
    const page = store.state.pages.find(p => p.id === id)
    if (!page) return
    page.meta = page.meta || {}
    page.meta.favorite = !page.meta.favorite
    updatePage(id, { meta: page.meta })
  }

  function isFavorite(id) {
    const page = store.state.pages.find(p => p.id === id)
    return page?.meta?.favorite || false
  }

  function getFavoritePages() {
    return store.state.pages.filter(p => p.meta?.favorite)
  }

  function getChildPages(parentId) {
    return store.state.pages.filter(p => p.parentId === parentId)
  }

  function getPageChildren(id) {
    return getChildPages(id)
  }

  function init() {
    loadPages()
  }

  return {
    loadPages,
    createPage,
    findPage,
    updatePage,
    deletePage,
    softDeletePage,
    restorePageFromTrash,
    permanentDeletePage,
    loadTrashedPages,
    toggleFavorite,
    isFavorite,
    getFavoritePages,
    getChildPages,
    getPageChildren,
    init,
  }
}
