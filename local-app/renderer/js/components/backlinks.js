import { $el, delegate, escHtml } from '../lib/helpers.js'

export function renderBacklinks(pages, currentPageId) {
  const currentPage = pages.find(p => p.id === currentPageId)
  if (!currentPage) {
    return `
      <div class="backlinks-panel">
        <div class="backlinks-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Backlinks</span>
          <span class="backlinks-count">0</span>
        </div>
        <div class="backlinks-empty">No pages link to this page yet.</div>
      </div>`
  }

  const searchPatterns = [
    `[[${currentPageId}]]`,
    `[[${(currentPage.title || '').toLowerCase()}]]`,
    `[[${currentPage.id}]]`,
  ]

  const linkingPages = pages.filter(p => {
    if (p.id === currentPageId) return false
    const content = ((p.title || '') + ' ' + JSON.stringify(p.blocks || [])).toLowerCase()
    return searchPatterns.some(pattern => content.includes(pattern))
  })

  if (linkingPages.length === 0) {
    return `
      <div class="backlinks-panel">
        <div class="backlinks-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Backlinks</span>
          <span class="backlinks-count">0</span>
        </div>
        <div class="backlinks-empty">No pages link to this page yet.</div>
      </div>`
  }

  const colors = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#84cc16']
  function getColor(id) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
    return colors[Math.abs(hash) % colors.length]
  }

  const itemsHtml = linkingPages.map(p => `
    <div class="backlinks-item" data-backlink-id="${p.id}">
      <div class="backlinks-item-dot" style="background:${getColor(p.id)}"></div>
      <span>${escHtml(p.title)}</span>
    </div>`).join('')

  return `
    <div class="backlinks-panel">
      <div class="backlinks-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span>Backlinks</span>
        <span class="backlinks-count">${linkingPages.length}</span>
      </div>
      <div class="backlinks-list">${itemsHtml}</div>
    </div>`
}

export function mountBacklinks(container, router) {
  if (!container) return

  const clean = delegate(container, '[data-backlink-id]', 'click', (e, el) => {
    const pageId = el.dataset.backlinkId
    if (pageId && router && router.openEditor) {
      const title = el.querySelector('span')?.textContent || ''
      router.openEditor(pageId, title)
    }
  })

  return clean
}
