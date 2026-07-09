import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { ENTITY_TYPE_DEFS } from '../store/state.js'

let _store = null
let _unsub = null
let _cleanup = null
let _prevSearchVal = ''

function relativeDate(dateStr) {
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago'
  return date.toLocaleDateString()
}

function getSortedFilteredEntities(state) {
  let entities = [...state.entities]

  if (state.entityFilter.type) {
    entities = entities.filter(e => e.type === state.entityFilter.type)
  }

  if (state.entityFilter.search) {
    const q = state.entityFilter.search.toLowerCase()
    entities = entities.filter(e => {
      if (e.name.toLowerCase().includes(q)) return true
      for (const v of Object.values(e.properties)) {
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true
      }
      return false
    })
  }

  const { key, dir } = state.entitySort
  entities.sort((a, b) => {
    let aVal, bVal
    if (key === 'tags') {
      aVal = (a.tags || []).length
      bVal = (b.tags || []).length
    } else if (key === 'type') {
      aVal = a.type
      bVal = b.type
    } else {
      aVal = a[key]
      bVal = b[key]
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return dir === 'asc' ? -1 : 1
    if (aVal > bVal) return dir === 'asc' ? 1 : -1
    return 0
  })

  return entities
}

function sortIndicator(key, sortKey, sortDir) {
  if (sortKey !== key) return ''
  return sortDir === 'asc' ? ' ▲' : ' ▼'
}

function entitiesEmptyState(hasFilter) {
  if (hasFilter) {
    return `<div class="empty-state entities-empty">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">No matching entities</div>
      <div class="empty-state-desc">Try adjusting your search or filter to find what you're looking for</div>
    </div>`
  }
  return `<div class="empty-state entities-empty">
    <div class="empty-state-icon">👤</div>
    <div class="empty-state-title">No entities yet</div>
    <div class="empty-state-desc">Create your first entity to start building your knowledge graph</div>
      <button class="empty-state-action micro-press" data-action="create-first-entity" title="Create entity">+ New Entity</button>
  </div>`
}

export function render(params) {
  const store = _store
  if (!store) return entitiesEmptyState(false)

  const state = store.state
  const entities = getSortedFilteredEntities(state)
  const { key: sortKey, dir: sortDir } = state.entitySort

  const typeOptions = Object.keys(ENTITY_TYPE_DEFS).map(t =>
    `<option value="${escHtml(t)}"${state.entityFilter.type === t ? ' selected' : ''}>${escHtml(t)}</option>`
  ).join('')

  const typeItems = Object.keys(ENTITY_TYPE_DEFS).map(t => {
    const def = ENTITY_TYPE_DEFS[t]
    return `<div class="entities-dropdown-item" data-type="${escHtml(t)}">${def.icon} ${escHtml(t)}</div>`
  }).join('')

  const hasFilter = state.entityFilter.type || state.entityFilter.search

  if (entities.length === 0) {
    return `<div class="entities-page">
    <div class="entities-toolbar">
      <div class="entities-search-wrap">
        <input type="text" class="entities-search-input" placeholder="Search entities..." value="${escHtml(state.entityFilter.search)}" spellcheck="false">
      </div>
      <select class="entities-type-filter">
        <option value="">All Types</option>
        ${typeOptions}
      </select>
      <div class="entities-new-wrap">
      <button class="entities-new-btn micro-press" title="New entity">+ New Entity ▾</button>
        <div class="entities-new-dropdown">
          ${typeItems}
        </div>
      </div>
    </div>
    ${entitiesEmptyState(hasFilter)}
  </div>`
  }

  const rows = entities.map(e => {
    const def = ENTITY_TYPE_DEFS[e.type]
    const color = def ? def.color : '#666'
    const tagsHtml = (e.tags || []).map(tid => {
      const tag = store.getTagById(tid)
      return tag
        ? `<span class="entities-tag-chip" style="background:${tag.color}18;color:${tag.color};border:1px solid ${tag.color}40">${escHtml(tag.name)}</span>`
        : ''
    }).join('')

    return `<tr class="entities-row card-hover hover-glow" data-id="${escHtml(e.id)}">
      <td class="entities-cell-name">${escHtml(e.name) || '<em>Untitled</em>'}</td>
      <td><span class="entities-type-badge" style="background:${color}18;color:${color};border:1px solid ${color}40">${def ? def.icon : ''} ${escHtml(e.type)}</span></td>
      <td class="entities-cell-tags">${tagsHtml}</td>
      <td class="entities-cell-date">${relativeDate(e.createdAt)}</td>
      <td><button class="entities-delete-btn" data-id="${escHtml(e.id)}" title="Delete">✕</button></td>
    </tr>`
  }).join('')

  return `<div class="entities-page">
  <div class="entities-toolbar">
    <div class="entities-search-wrap">
      <input type="text" class="entities-search-input" placeholder="Search entities..." value="${escHtml(state.entityFilter.search)}" spellcheck="false">
    </div>
    <select class="entities-type-filter">
      <option value="">All Types</option>
      ${typeOptions}
    </select>
    <div class="entities-new-wrap">
      <button class="entities-new-btn" title="New entity">+ New Entity ▾</button>
      <div class="entities-new-dropdown">
        ${typeItems}
      </div>
    </div>
  </div>
  <div class="entities-table-wrap">
    <table class="entities-table">
      <thead>
        <tr>
          <th class="entities-th-sortable" data-sort="name">Name${sortIndicator('name', sortKey, sortDir)}</th>
          <th class="entities-th-sortable" data-sort="type">Type${sortIndicator('type', sortKey, sortDir)}</th>
          <th class="entities-th-sortable" data-sort="tags">Tags${sortIndicator('tags', sortKey, sortDir)}</th>
          <th class="entities-th-sortable" data-sort="createdAt">Created${sortIndicator('createdAt', sortKey, sortDir)}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="entities-count">${entities.length} entit${entities.length === 1 ? 'y' : 'ies'}</div>
</div>`
}

export function mount(store, router) {
  _store = store
  const container = $id('mainContent')

  function reRender() {
    const focused = $el('.entities-search-input')
    const selStart = focused ? focused.selectionStart : null
    const selEnd = focused ? focused.selectionEnd : null

    container.innerHTML = render()
    attachEvents()

    if (focused) {
      const newInput = $el('.entities-search-input')
      if (newInput) {
        newInput.focus()
        if (selStart !== null && selEnd !== null) {
          newInput.setSelectionRange(selStart, selEnd)
        }
      }
    }
  }

  _unsub = store.subscribe(() => reRender())

  function attachEvents() {
    if (_cleanup) {
      _cleanup()
      _cleanup = null
    }

    const searchInput = $el('.entities-search-input', container)
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.setState({ entityFilter: { ...store.state.entityFilter, search: e.target.value } })
      })
    }

    const typeFilter = $el('.entities-type-filter', container)
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        store.setState({ entityFilter: { ...store.state.entityFilter, type: e.target.value } })
      })
    }

    container.querySelectorAll('.entities-th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort
        const { key: curKey, dir: curDir } = store.state.entitySort
        const dir = (key === curKey && curDir === 'asc') ? 'desc' : 'asc'
        store.setState({ entitySort: { key, dir } })
      })
    })

    const createFirst = container.querySelector('[data-action="create-first-entity"]')
    if (createFirst) {
      createFirst.addEventListener('click', () => {
        const entity = store.createEntity('Note')
        store.setState({ entityDetailId: entity.id })
      })
    }

    const newBtn = $el('.entities-new-btn', container)
    const dropdownEl = $el('.entities-new-dropdown', container)
    if (newBtn && dropdownEl) {
      newBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdownEl.classList.toggle('visible')
      })
    }

    container.querySelectorAll('.entities-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type
        const entity = store.createEntity(type)
        if (dropdownEl) dropdownEl.classList.remove('visible')
        store.setState({ entityDetailId: entity.id })
      })
    })

    container.querySelectorAll('.entities-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.entities-delete-btn')) return
        store.setState({ entityDetailId: row.dataset.id })
      })
    })

    container.querySelectorAll('.entities-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const id = btn.dataset.id
        const entity = store.getEntity(id)
            if (entity && confirm(`Delete "${entity.name || 'Untitled'}"? It will be moved to trash.`)) {
          store.deleteEntity(id)
        }
      })
    })

    function hideEntityDropdown() {
      const dd = $el('.entities-new-dropdown', container)
      if (dd) dd.classList.remove('visible')
    }
    const outsideHandler = (e) => {
      if (!e.target.closest('.entities-new-wrap')) hideEntityDropdown()
    }
    document.addEventListener('click', outsideHandler)

    const keyHandler = (e) => {
      if (e.key === 'Escape') hideEntityDropdown()
    }
    document.addEventListener('keydown', keyHandler)

    _cleanup = () => {
      document.removeEventListener('click', outsideHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }

  attachEvents()
}

export function unmount() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
  if (_cleanup) {
    _cleanup()
    _cleanup = null
  }
  _store = null
}
