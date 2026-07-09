import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { renderEditor, mountEditor, renderComments, mountComments } from '../components/blockEditor.js'
import { updateEntity, getEntityBlocks, createBlock, updateBlock as apiUpdateBlock, deleteBlock, saveAllBlocks, listComments, createComment, deleteComment, createNotification } from '../lib/api.js'

let _cleanup = null
let _comments = []

export function render(store, params) {
  const pageId = params?.pageId || store.state.currentPageId
  const page = store.state.pages.find(p => p.id === pageId)
  if (!page) return '<div style="padding:40px;text-align:center;color:var(--muted)">Page not found</div>'
  store.state.blocks = page.blocks || []
  store.state.currentPageId = pageId
  return renderEditor(page, page.blocks || []) + renderComments(_comments, pageId)
}

export function mount(store, router, params) {
  const pageId = params?.pageId || store.state.currentPageId
  const page = store.state.pages.find(p => p.id === pageId)
  if (!page) return

  store.state.blocks = page.blocks || []
  store.state.currentPageId = pageId

  const titleInput = $id('editorTitle')
  if (titleInput) titleInput.textContent = page.title || ''

  function getCurrentPage() {
    return store.state.pages.find(x => x.id === store.state.currentPageId)
  }

  function persistMetaToDb(p) {
    const props = {
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      parentId: p.parentId,
      meta: p.meta || {},
    }
    updateEntity(p.id, { properties: props }).catch(() => {})
  }

  function persistBlocks() {
    const id = store.state.currentPageId
    const p = store.state.pages.find(x => x.id === id)
    if (!p || !p.blocks) return
    saveAllBlocks(id, p.blocks).catch(() => {})
  }

  window.__pageStore = {
    updatePageTitle: (title) => {
      const p = getCurrentPage()
      if (p) {
        p.title = title
        p.updatedAt = new Date().toISOString()
        store.setState({ pages: [...store.state.pages] })
        updateEntity(p.id, { title }).catch(() => {})
      }
    },
    updatePageMeta: (metaUpdates) => {
      const p = getCurrentPage()
      if (p) {
        p.meta = p.meta || {}
        Object.assign(p.meta, metaUpdates)
        p.updatedAt = new Date().toISOString()
        store.setState({ pages: [...store.state.pages] })
        persistMetaToDb(p)
      }
    }
  }

  const pageService = {
    state: store.state,
    updatePage: (id, updates) => {
      const p = store.state.pages.find(x => x.id === id)
      if (p) {
        Object.assign(p, updates)
        p.updatedAt = new Date().toISOString()
      }
    }
  }

  const cleanup = mountEditor(pageService, (blocks) => {
    const id = store.state.currentPageId
    if (id) {
      const p = store.state.pages.find(x => x.id === id)
      if (p) {
        p.blocks = blocks
        p.updatedAt = new Date().toISOString()
        persistBlocks()
      }
    }
  })

  // ── Comments ──
  listComments(pageId).then(comments => {
    _comments = comments || []
    const section = $id('commentsSection')
    if (section) section.innerHTML = renderComments(_comments, pageId).replace('<div id="commentsSection"', '<div')
  }).catch(() => {})

  const cmCleanup = mountComments(pageId, {
    create: (content, parentId) => {
      return createComment(pageId, content, parentId).then(c => {
        if (c) {
          _comments.push(c)
          createNotification('default', 'local', 'comment', 'New comment', content, pageId).catch(() => {})
          refreshComments()
        }
      })
    },
    del: (id) => {
      return deleteComment(id).then(() => {
        _comments = _comments.filter(c => c.id !== id && c.parent_comment_id !== id)
        refreshComments()
      })
    }
  })

  function refreshComments() {
    const section = $id('commentsSection')
    if (section) section.innerHTML = renderComments(_comments, pageId).replace('<div id="commentsSection"', '<div').replace('<div id="commentsSection"', '<div')
  }

  _cleanup = () => {
    if (cleanup) cleanup()
    if (cmCleanup) cmCleanup()
  }
}

export function unmount() {
  if (_cleanup) { _cleanup(); _cleanup = null }
}
