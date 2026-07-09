import { $id, $el, $all, escHtml, getSnippet, highlightText } from '../lib/helpers.js'
import { search } from '../lib/api.js'

let _store = null
let _unsub = null
let _cleanup = null
let _searchResults = []
let _searchSel = -1
let _searchTimer = null

function performSearch(store) {
  const q = store.state.searchQuery.trim().toLowerCase()
  _searchResults = []
  _searchSel = -1

  if (!q) return { pages: [], tags: [] }
  return null
}

function renderResults(store, res, q) {
  if (!q) {
    return '<div class="search-empty">Type to search across pages and tags</div>'
  }

  const shouldHighlight = store?.state?.highlightSearchMatches !== false

  let html = ''

  if (res.pages.length) {
    html += `<div class="search-group"><div class="search-group-title">Pages (${res.pages.length})</div>`
    res.pages.forEach(r => {
      html += `<div class="search-result-item" data-idx="${_searchResults.indexOf(r)}" data-type="page">
        <div class="search-result-icon">📄</div>
        <div class="search-result-text">
          <div class="search-result-title">${shouldHighlight ? highlightText(r.title, q) : escHtml(r.title)}</div>
          ${r.snippet && r.snippet !== r.title ? `<div class="search-result-snippet">${shouldHighlight ? highlightText(r.snippet, q) : escHtml(r.snippet)}</div>` : ''}
        </div>
        <span class="search-result-badge search-result-badge--page">Page</span>
      </div>`
    })
    html += `</div>`
  }

  if (res.tags.length) {
    html += `<div class="search-group"><div class="search-group-title">Tags (${res.tags.length})</div>`
    res.tags.forEach(r => {
      html += `<div class="search-result-item" data-idx="${_searchResults.indexOf(r)}" data-type="tag">
        <div class="search-result-icon"><span class="search-tag-dot" style="background:${r.color || '#666'}"></span></div>
        <div class="search-result-text">
          <div class="search-result-title">${shouldHighlight ? highlightText(r.title, q) : escHtml(r.title)}</div>
        </div>
        <span class="search-result-badge search-result-badge--tag">Tag</span>
      </div>`
    })
    html += `</div>`
  }

  if (!res.pages.length && !res.tags.length) {
    html = `<div class="search-empty">No results found for "${escHtml(q)}"</div>`
  }

  return html
}

export function render(store) {
  const q = store.state.searchQuery || ''
  const res = q ? (store.__searchCache || { pages: [], tags: [] }) : { pages: [], tags: [] }
  const resultsHtml = renderResults(store, res, q)

  return `<div class="search-page">
  <div class="search-page-header">
    <div class="search-page-input-wrap">
      <svg class="search-page-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="search-page-input" placeholder="Search pages and tags..." value="${escHtml(q)}" autofocus spellcheck="false">
    </div>
  </div>
  <div class="search-page-results">
    ${resultsHtml}
  </div>
</div>`
}

function updateSearchSel() {
  const items = $all('.search-result-item')
  items.forEach((el, i) => {
    el.classList.toggle('search-selected', i === _searchSel)
  })
}

function moveSearchSel(dir) {
  const total = _searchResults.length
  if (!total) return
  _searchSel = Math.max(0, Math.min(total - 1, _searchSel + dir))
  updateSearchSel()
  const items = $all('.search-result-item')
  const target = items[_searchSel]
  if (target) target.scrollIntoView({ block: 'nearest' })
}

function activateSearchSel(store, router) {
  if (_searchSel >= 0 && _searchSel < _searchResults.length) {
    activateSearchResult(_searchSel, store, router)
  }
}

function activateSearchResult(idx, store, router) {
  const r = _searchResults[idx]
  if (!r) return
  if (r.type === 'page') {
    router.navigate('editor', { pageId: r.id, pageTitle: r.title })
  } else if (r.type === 'tag') {
    router.navigate('tags')
  }
}

export function mount(store, router) {
  _store = store
  const container = $id('mainContent')

  async function doSearch(q) {
    if (!q) {
      _searchResults = []
      _searchSel = -1
      store.__searchCache = { pages: [], tags: [] }
      return
    }
    try {
      const results = await search(q)
      const pages = results.filter(r => r.match_type === 'page' || r.match_type === 'block').map(r => ({
        id: r.entity_id, title: r.title, snippet: r.content || r.title, type: 'page'
      }))
      const tags = []
      const deduped = []
      const seen = new Set()
      for (const p of pages) {
        if (!seen.has(p.id)) { seen.add(p.id); deduped.push(p) }
      }
      _searchResults = deduped
      _searchSel = -1
      store.__searchCache = { pages: deduped, tags }
    } catch {
      store.__searchCache = { pages: [], tags: [] }
    }
  }

  function reRender() {
    container.innerHTML = render(store)
    attachEvents()
    updateSearchSel()

    const input = $el('.search-page-input')
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }

  _unsub = store.subscribe(() => {
    const input = $el('.search-page-input', container)
    if (input) {
      const res = store.__searchCache || { pages: [], tags: [] }
      const results = $el('.search-page-results', container)
      if (results) {
        results.innerHTML = renderResults(store, res, store.state.searchQuery.trim())
        updateSearchSel()
      }
    }
  })

  function attachEvents() {
    if (_cleanup) {
      _cleanup()
      _cleanup = null
    }

    const input = $el('.search-page-input', container)
    if (!input) return

    input.addEventListener('input', () => {
      clearTimeout(_searchTimer)
      _searchTimer = setTimeout(async () => {
        const q = input.value
        store.setState({ searchQuery: q })
        await doSearch(q)
        const results = $el('.search-page-results', container)
        if (results) {
          const cache = store.__searchCache || { pages: [], tags: [] }
          results.innerHTML = renderResults(store, cache, q)
          updateSearchSel()
        }
      }, 300)
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSearchSel(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSearchSel(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        activateSearchSel(store, router)
      } else if (e.key === 'Escape') {
        _searchSel = -1
        updateSearchSel()
        input.blur()
      }
    })

    container.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item')
      if (!item) return
      const idx = parseInt(item.dataset.idx, 10)
      if (!isNaN(idx)) {
        _searchSel = idx
        updateSearchSel()
        activateSearchResult(idx, store, router)
      }
    })

    container.addEventListener('mousemove', (e) => {
      const item = e.target.closest('.search-result-item')
      if (item) {
        const idx = parseInt(item.dataset.idx, 10)
        if (!isNaN(idx) && idx !== _searchSel) {
          _searchSel = idx
          updateSearchSel()
        }
      }
    })

    _cleanup = () => {
      clearTimeout(_searchTimer)
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
  _searchResults = []
  _searchSel = -1
  _store = null
}
