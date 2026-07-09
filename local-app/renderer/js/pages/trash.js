import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { getTrashedEntities, restoreEntity, deleteEntity as permanentDeleteEntity } from '../lib/api.js'

let _store = null
let _router = null
let _unsubs = []
let _trashedPages = []

function relativeDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago'
  return date.toLocaleDateString()
}

async function loadTrash() {
  try {
    _trashedPages = await getTrashedEntities('default')
  } catch (e) {
    _trashedPages = []
  }
  renderContent()
}

function undoDelete(pageId, pageTitle) {
  restoreEntity(pageId).catch(e => console.error('Restore error:', e))
  _trashedPages = _trashedPages.filter(p => p.id !== pageId)
  renderContent()
  showUndoToast(`"${pageTitle || 'Untitled'}" restored`)
}

function showUndoToast(msg) {
  const existing = document.querySelector('.trash-toast')
  if (existing) existing.remove()
  const toast = document.createElement('div')
  toast.className = 'trash-toast'
  toast.innerHTML = `
    <span>${escHtml(msg)}</span>
    <button class="trash-toast-close" title="Close">&times;</button>`
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('open'))
  const remove = () => { toast.classList.remove('open'); setTimeout(() => toast.remove(), 200) }
  toast.querySelector('.trash-toast-close').addEventListener('click', remove)
  setTimeout(remove, 3000)
}

function renderContent() {
  const container = $id('mainContent')
  if (!container) return

  let html = `<div class="trash-page">
    <div class="trash-header">
      <h1 class="trash-title">Trash</h1>
      <span class="trash-count">${_trashedPages.length} item${_trashedPages.length !== 1 ? 's' : ''}</span>
    </div>`

  if (_trashedPages.length === 0) {
    html += `<div class="empty-state">
      <div class="empty-state-icon">🗑️</div>
      <div class="empty-state-title">Trash is empty</div>
      <div class="empty-state-desc">Deleted pages will appear here</div>
    </div>`
  } else {
    html += `<div class="trash-list">
      <div class="trash-list-header">
        <span class="trash-col-name">Name</span>
        <span class="trash-col-date">Deleted</span>
        <span class="trash-col-actions">Actions</span>
      </div>`
    _trashedPages.forEach(p => {
      html += `<div class="trash-item" data-id="${escHtml(p.id)}">
        <span class="trash-item-name">${escHtml(p.title) || '<em>Untitled</em>'}</span>
        <span class="trash-item-date">${relativeDate(p.archivedAt)}</span>
        <span class="trash-item-actions">
          <button class="trash-btn trash-btn--restore" data-action="restore" data-id="${escHtml(p.id)}" data-title="${escHtml(p.title)}" title="Restore">Restore</button>
          <button class="trash-btn trash-btn--delete" data-action="delete-forever" data-id="${escHtml(p.id)}" title="Delete forever">Delete forever</button>
        </span>
      </div>`
    })
    html += `</div>
      <div class="trash-footer">
        <button class="trash-btn trash-btn--empty" data-action="empty-trash" title="Empty trash">Empty trash</button>
      </div>`
  }

  html += `</div>`
  container.innerHTML = html
  attachEvents()
}

function attachEvents() {
  const container = $id('mainContent')

  container.querySelectorAll('[data-action="restore"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const title = btn.dataset.title
      undoDelete(id, title)
      const ps = window.__pagesStore
      if (ps?.loadPages) ps.loadPages()
    })
  })

  container.querySelectorAll('[data-action="delete-forever"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const page = _trashedPages.find(p => p.id === id)
      const name = page?.title || 'Untitled'
      const shouldConfirm = _store?.state?.confirmBeforeDelete !== false
      if (shouldConfirm && !confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
      await permanentDeleteEntity(id)
      _trashedPages = _trashedPages.filter(p => p.id !== id)
      renderContent()
      showUndoToast(`"${name}" permanently deleted`)
    })
  })

  const emptyBtn = container.querySelector('[data-action="empty-trash"]')
  if (emptyBtn) {
    emptyBtn.addEventListener('click', async () => {
      const shouldConfirm = _store?.state?.confirmBeforeDelete !== false
      if (shouldConfirm && !confirm(`Permanently delete all ${_trashedPages.length} items? This cannot be undone.`)) return
      for (const p of _trashedPages) {
        await permanentDeleteEntity(p.id)
      }
      _trashedPages = []
      renderContent()
      showUndoToast('Trash emptied')
    })
  }
}

export function render(store, params) {
  _store = store
  loadTrash()
  return '<div class="trash-page"><div class="trash-loading">Loading trash...</div></div>'
}

export function mount(store, router, params) {
  _store = store
  _router = router
  _unsubs.forEach(fn => fn())
  _unsubs = []
  loadTrash()
}

export function unmount() {
  _unsubs.forEach(fn => fn())
  _unsubs = []
}