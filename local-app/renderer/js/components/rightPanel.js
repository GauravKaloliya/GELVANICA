import { $id, $el, delegate, escHtml } from '../lib/helpers.js'
import { getEntityBacklinks, getEntityRelations, listTags, tagEntity, untagEntity, createRelation, getNeighbors, deleteRelation } from '../lib/api.js'

export let rightPanelOpen = false

export function isRightPanelOpen() { return rightPanelOpen }

export function toggleRightPanel(store, router) {
  rightPanelOpen = !rightPanelOpen
  const panel = $id('rightPanel')
  if (!panel) return
  if (rightPanelOpen) {
    renderRightPanel(store, router)
    panel.classList.add('open')
    loadBacklinks(store)
  } else {
    panel.classList.remove('open')
    setTimeout(() => { if (!rightPanelOpen) panel.innerHTML = '' }, 200)
  }
}

async function loadBacklinks(store) {
  const page = getCurrentPage(store)
  if (!page) return
  try {
    const [backlinks, relations, neighbors] = await Promise.all([
      getEntityBacklinks(page.id),
      getEntityRelations(page.id),
      getNeighbors(page.id).catch(() => []),
    ])
    const container = $id('rightPanelBacklinks')
    if (!container) return
    const pages = store.state.pages || []
    const linkedTitles = (backlinks || []).map(b => {
      const src = pages.find(p => p.id === (b.source_entity_id || b.source_id))
      return src ? { id: src.id, title: src.title } : null
    }).filter(Boolean)
    const outgoingTitles = (relations || []).map(r => {
      const tgt = pages.find(p => p.id === (r.target_entity_id || r.target_id))
      return tgt ? { id: tgt.id, title: tgt.title } : null
    }).filter(Boolean)
    const neighborTitles = (neighbors || []).map(n => {
      const p = pages.find(p => p.id === (n.id || n.entity_id))
      return p ? { id: p.id, title: p.title } : null
    }).filter(Boolean)
    container.innerHTML = `
      <div class="right-panel-subsection">
        <div class="right-panel-subtitle">Incoming links (${linkedTitles.length})</div>
        ${linkedTitles.length ? linkedTitles.map(p => `
          <div class="backlinks-item" data-backlink-id="${p.id}">
            <span>${escHtml(p.title)}</span>
          </div>`).join('') : '<div class="right-panel-empty">None</div>'}
      </div>
      <div class="right-panel-subsection" style="margin-top:16px">
        <div class="right-panel-subtitle">Outgoing links (${outgoingTitles.length})</div>
        ${outgoingTitles.length ? outgoingTitles.map(p => `
          <div class="backlinks-item" data-backlink-id="${p.id}">
            <span>${escHtml(p.title)}</span>
          </div>`).join('') : '<div class="right-panel-empty">None</div>'}
      </div>
      <div class="right-panel-subsection" style="margin-top:16px">
        <div class="right-panel-subtitle">Neighbors (${neighborTitles.length})</div>
        ${neighborTitles.length ? neighborTitles.map(p => `
          <div class="backlinks-item" data-backlink-id="${p.id}">
            <span>${escHtml(p.title)}</span>
          </div>`).join('') : '<div class="right-panel-empty">None</div>'}
      </div>
      <div class="right-panel-subsection" style="margin-top:16px">
        <div class="right-panel-subtitle">Link to another page</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <input class="right-panel-input" id="relationSearchInput" placeholder="Search pages..." style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--foreground);font-size:12px" />
          <button class="right-panel-btn" id="relationAddBtn" title="Create relation" style="padding:4px 10px;border-radius:6px;border:none;background:var(--accent);color:#fff;font-size:11px;cursor:pointer">Link</button>
        </div>
        <div id="relationSearchResults" style="margin-top:6px"></div>
      </div>`
    mountRelationEvents(container, store, page.id)
  } catch {}
}

function mountRelationEvents(container, store, entityId) {
  const input = container.querySelector('#relationSearchInput')
  const results = container.querySelector('#relationSearchResults')
  const addBtn = container.querySelector('#relationAddBtn')
  if (!input || !results) return

  const doSearch = () => {
    const q = input.value.toLowerCase().trim()
    const pages = store.state.pages || []
    const filtered = q ? pages.filter(p => p.title?.toLowerCase().includes(q) && p.id !== entityId).slice(0, 8) : []
    results.innerHTML = filtered.map(p =>
      `<div class="backlinks-item" data-rel-target="${p.id}" style="padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer">${escHtml(p.title)}</div>`
    ).join('')
    results.querySelectorAll('[data-rel-target]').forEach(el => {
      el.addEventListener('click', async () => {
        const targetId = el.dataset.relTarget
        try {
          await createRelation('default', entityId, targetId)
          el.textContent = '✓ Linked'
          el.style.color = 'var(--accent)'
        } catch {}
      })
    })
  }

  input.addEventListener('input', doSearch)
  addBtn.addEventListener('click', doSearch)
}

function closeRightPanel() {
  const panel = $id('rightPanel')
  if (panel) panel.classList.remove('open')
  rightPanelOpen = false
  setTimeout(() => { if (panel && !rightPanelOpen) panel.innerHTML = '' }, 200)
}

function getCurrentPage(store) {
  const router = window.__router
  const page = router?.state?.currentPage
  const params = router?.state?.currentParams
  if (page === 'editor' && params?.pageId) {
    return store?.state?.pages?.find(p => p.id === params.pageId) || null
  }
  return null
}

function renderRightPanel(store, router) {
  const panel = $id('rightPanel')
  if (!panel) return
  const page = getCurrentPage(store)
  const pages = store?.state?.pages || []
  const activeTab = panel.dataset.activeTab || 'properties'

  const propertiesHtml = page ? renderProperties(page, store) : '<div class="right-panel-empty">Open a page to see properties</div>'
  const backlinksHtml = '<div class="right-panel-empty">Loading backlinks...</div>'
  const tocHtml = page ? renderTOC() : ''

  panel.innerHTML = `
    <div class="right-panel-header">
      <span class="right-panel-title">Page info</span>
      <button class="right-panel-close" data-right-action="close" title="Close panel">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="right-panel-tabs">
      <button class="right-panel-tab${activeTab === 'properties' ? ' active' : ''}" data-right-tab="properties" title="View properties">Properties</button>
      <button class="right-panel-tab${activeTab === 'backlinks' ? ' active' : ''}" data-right-tab="backlinks" title="View backlinks">Links</button>
      <button class="right-panel-tab${activeTab === 'toc' ? ' active' : ''}" data-right-tab="toc" title="View table of contents">TOC</button>
    </div>
    <div class="right-panel-body">
      <div class="right-panel-section${activeTab === 'properties' ? '' : ' hidden'}" id="rightPanelProperties">
        ${propertiesHtml}
      </div>
      <div class="right-panel-section${activeTab === 'backlinks' ? '' : ' hidden'}" id="rightPanelBacklinks">
        ${backlinksHtml}
      </div>
      <div class="right-panel-section${activeTab === 'toc' ? '' : ' hidden'}" id="rightPanelTOC">
        ${tocHtml}
      </div>
    </div>`

  mountRightPanelEvents(panel, store, router)
}

function renderProperties(page, store) {
  if (!page) return '<div class="right-panel-empty">No page selected</div>'

  const created = page.createdAt ? new Date(page.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
  const updated = page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  const wordCount = estimateWordCount(page)
  const tags = store?.state?.tags || []
  const pageTags = tags.filter(t => page.tagIds?.includes?.(t.id) || page.meta?.tagIds?.includes?.(t.id) || page.meta?.tags?.includes?.(t.id))

  const tagsHtml = `<div class="right-panel-tags-wrap">${pageTags.length ? pageTags.map(t => `<span class="right-panel-tag" style="background:${t.color}22;color:${t.color};border:1px solid ${t.color}44">${escHtml(t.name)}</span>`).join('') : '<span class="right-panel-empty" style="display:inline;font-size:11px">No tags</span>'}</div>`

  const allTagsHtml = tags.map(t => `<label class="right-panel-tag-opt" style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;cursor:pointer"><input type="checkbox" data-tag-id="${t.id}" ${pageTags.some(pt => pt.id === t.id) ? 'checked' : ''} /><span style="color:${t.color}">${escHtml(t.name)}</span></label>`).join('')

  return `
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Icon</span>
      <span class="right-panel-prop-value">${page.meta?.icon || '—'}</span>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Title</span>
      <span class="right-panel-prop-value">${escHtml(page.title || 'Untitled')}</span>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Created</span>
      <span class="right-panel-prop-value">${created}</span>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Modified</span>
      <span class="right-panel-prop-value">${updated}</span>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Words</span>
      <span class="right-panel-prop-value">${wordCount}</span>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">Tags</span>
      <div class="right-panel-prop-value">${tagsHtml}</div>
    </div>
    <div class="right-panel-property" style="flex-direction:column;align-items:stretch">
      <span class="right-panel-prop-label">Manage tags</span>
      <div style="margin-top:4px">${allTagsHtml}</div>
    </div>
    <div class="right-panel-property">
      <span class="right-panel-prop-label">ID</span>
      <span class="right-panel-prop-value" style="font-size:10px;opacity:0.5;font-family:monospace">${page.id}</span>
    </div>`
}

function renderTOC() {
  const blockInputs = document.querySelectorAll('#editorBlocks .editor-block')
  if (!blockInputs.length) return '<div class="right-panel-empty">No headings found</div>'

  const headings = []
  blockInputs.forEach((el, i) => {
    for (let h = 1; h <= 6; h++) {
      if (el.classList.contains('block-type-h' + h)) {
        const input = el.querySelector('.block-input')
        const text = input?.textContent?.trim()
        if (text) {
          headings.push({ level: h, text, index: i })
        }
        break
      }
    }
  })

  if (!headings.length) return '<div class="right-panel-empty">No headings found</div>'

  return headings.map(h => `
    <div class="toc-item" data-toc-index="${h.index}" style="padding-left:${(h.level - 1) * 16}px">
      <span class="toc-item-text">${escHtml(h.text)}</span>
    </div>`).join('')
}

function estimateWordCount(page) {
  if (!page?.blocks) return 0
  let text = ''
  page.blocks.forEach(b => { if (b.content) text += ' ' + b.content })
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function mountRightPanelEvents(panel, store, router) {
  delegate(panel, '[data-right-action="close"]', 'click', () => closeRightPanel())

  delegate(panel, '[data-right-tab]', 'click', (e, el) => {
    panel.querySelectorAll('.right-panel-tab').forEach(t => t.classList.remove('active'))
    el.classList.add('active')
    panel.dataset.activeTab = el.dataset.rightTab
    panel.querySelectorAll('.right-panel-section').forEach(s => s.classList.add('hidden'))
    const target = $id('rightPanel' + el.dataset.rightTab.charAt(0).toUpperCase() + el.dataset.rightTab.slice(1))
    if (target) target.classList.remove('hidden')
  })

  delegate(panel, '[data-backlink-id]', 'click', (e, el) => {
    const pageId = el.dataset.backlinkId
    if (pageId && router?.openEditor) {
      const title = el.querySelector('span')?.textContent || ''
      router.openEditor(pageId, title)
      closeRightPanel()
    }
  })

  delegate(panel, '[data-toc-index]', 'click', (e, el) => {
    const index = parseInt(el.dataset.tocIndex, 10)
    const blocks = document.querySelectorAll('#editorBlocks .editor-block')
    if (blocks[index]) {
      const input = blocks[index].querySelector('.block-input')
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input.focus()
      }
    }
    closeRightPanel()
  })

  delegate(panel, '[data-tag-id]', 'change', async (e, el) => {
    const page = getCurrentPage(store)
    if (!page) return
    const tagId = el.dataset.tagId
    try {
      if (el.checked) {
        await tagEntity(tagId, page.id)
      } else {
        await untagEntity(tagId, page.id)
      }
    } catch {}
  })
}

export function mountRightPanel(store, router) {
  window.__router = router
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'p') {
      e.preventDefault()
      toggleRightPanel(store, router)
    }
  })
}
