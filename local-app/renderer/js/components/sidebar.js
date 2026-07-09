import { $id, $el, delegate, escHtml, makeInitialsAvatar } from '../lib/helpers.js'
import { updateTabTitle, closeTab } from './tabBar.js'
import { updateEntity, archiveEntity, restoreEntity, listWorkspaces, getWorkspaceStats } from '../lib/api.js'

export function renderSidebar(pages, currentPageId, user, recentPages = []) {
  const navPagesHtml = renderPageTree(pages, currentPageId, null, 0)
  const name = user?.name || user?.email || 'User'
  const avatarSrc = user?.avatar_url || user?.avatar_path || makeInitialsAvatar(name)
  const recentHtml = renderRecentPages(pages, recentPages)
  const favoritePages = pages.filter(p => p.meta?.favorite)
  const favHtml = favoritePages.length
    ? favoritePages.map(p => `
      <div class="fav-page-item" data-page-id="${p.id}" title="${p.title}">
        <span class="fav-star">\u2605</span>
        <span class="fav-page-title">${p.title || 'Untitled'}</span>
      </div>`).join('')
    : `<div class="fav-page-item" style="opacity:0.4;cursor:default;pointer-events:none"><span class="fav-star">\u2606</span><span style="font-size:11px">No favorites yet</span></div>`
  return `
    <div class="sidebar-resize-handle" id="sidebarResizeHandle"></div>
    <div class="sidebar-header">
      <div class="brand-row">
        <img class="brand-logo" src="gnovium-logo.jpeg" alt="" />
        <span class="brand-text">Gnovium</span>
        <span class="sidebar-ws-label" id="wsSelector" title="Switch workspace">default</span>
      </div>
      <button class="sidebar-add-page" title="New page">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
    <div class="sidebar-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Search pages\u2026" id="sidebarSearch" />
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section-header" data-section="favorites">
        <span style="font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--muted)">Favorites</span>
        <span class="sidebar-section-arrow"></span>
      </div>
      <div class="sidebar-section-content" id="favoritesSection">
        ${favHtml}
      </div>
      <div id="recentPagesContainer">${recentHtml}</div>
      <div class="sidebar-section-header" data-section="pages">
        <span class="nav-section" style="padding:8px 0 4px">Pages</span>
        <span class="sidebar-section-arrow"></span>
        <button class="sidebar-section-add" data-section-add="page" title="New page">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div class="sidebar-section-content" id="pagesSection">
        <div class="nav-pages" id="navPages">${navPagesHtml || '<div class="sidebar-empty-msg">No pages</div>'}</div>
      </div>
      <div class="sidebar-section-header" data-section="workspace">
        <span class="nav-section" style="padding:8px 0 4px">Workspace</span>
        <span class="sidebar-section-arrow"></span>
        <button class="sidebar-section-add" data-section-add="folder" title="New folder">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div class="sidebar-section-content" id="workspaceSection">

        <div class="nav-item" data-nav="entities">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          <span>Entities</span>
        </div>
        <div class="nav-item" data-nav="tags">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <span>Tags</span>
        </div>
        <div class="nav-item" data-nav="graph">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><line x1="12" y1="9" x2="17" y2="7"/><line x1="7" y1="7" x2="9" y2="9"/><line x1="9" y1="15" x2="7" y2="17"/><line x1="15" y1="15" x2="17" y2="17"/></svg>
          <span>Graph</span>
        </div>
        <div class="nav-item" data-nav="search">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search</span>
        </div>
        <div class="nav-item" data-nav="health">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Health</span>
        </div>
        <div class="nav-item" data-nav="settings">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Settings</span>
        </div>
        <div class="nav-item" data-nav="trash">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>Trash</span>
        </div>
        <div class="nav-item" data-nav="shortcuts">
          <svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h.01M10 16h.01M14 16h.01M18 16h.01"/></svg>
          <span>Shortcuts</span>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-footer-divider"></div>
      <div class="sidebar-user">
        <img class="user-avatar" src="${avatarSrc}" alt="" />
        <span class="user-name">${name}</span>
        <span class="status-dot" style="background:${user?.online ? '#22c55e' : '#f59e0b'}"></span>
      </div>
    </div>`
}

function renderRecentPages(pages, recentPages) {
  const items = recentPages.slice(0, 5)
  if (!items.length) return ''
  return `
    <div class="sidebar-section-header" data-section="recent">
      <span style="font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--muted)">Recent</span>
      <span class="sidebar-section-arrow"></span>
    </div>
    <div class="sidebar-section-content" id="recentSection">
      ${items.map(r => {
        const page = pages.find(p => p.id === r.id)
        const title = page?.title || r.label || 'Untitled'
        const dotColor = page ? getPageColor(page.id) : '#666'
        return `<div class="recent-page-item" data-recent-id="${r.id}">
          <div class="recent-page-dot" style="background:${dotColor}"></div>
          <span>${title}</span>
        </div>`
      }).join('')}
    </div>`
}

const PAGE_COLORS = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#84cc16']
function getPageColor(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i)
  return PAGE_COLORS[Math.abs(hash) % PAGE_COLORS.length]
}

function renderPageTree(pages, currentPageId, parentId, depth) {
  const children = pages.filter(p => p.parentId === parentId)
  if (!children.length) return ''
  let html = ''
  for (const page of children) {
    const isActive = page.id === currentPageId
    const grandChildren = pages.filter(p => p.parentId === page.id)
    const hasChildren = grandChildren.length > 0
    const dotColor = getPageColor(page.id)
    const icon = page.meta?.icon || ''
    html += `<div class="nav-page-item${isActive ? ' active' : ''}" data-page-id="${page.id}" draggable="true" style="padding-left:${12 + depth * 20}px">`
    if (hasChildren) {
      html += `<span class="nav-page-toggle"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>`
    } else {
      html += `<span class="nav-page-toggle" style="visibility:hidden"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>`
    }
    if (icon) {
      html += `<span class="page-icon" style="font-size:12px;flex-shrink:0">${icon}</span>`
    } else {
      html += `<div class="page-dot" style="background:${dotColor}"></div>`
    }
    html += `<span class="page-drag-handle" title="Drag to reorder">\u2261</span>`
    html += `<span class="nav-page-name">${page.title}</span>`
    const isFav = page.meta?.favorite
    html += `<span class="nav-page-fav" data-fav="${page.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '★' : '☆'}</span>`
    html += `</div>`
    if (hasChildren) {
      html += `<div class="nav-page-children">${renderPageTree(pages, currentPageId, page.id, depth + 1)}</div>`
    }
  }
  return html
}

export function mountSidebar(router, store) {
  const sidebar = document.querySelector('.sidebar')
  if (!sidebar) return

  const cleans = []

  cleans.push(delegate(sidebar, '[data-nav]', 'click', (e, el) => {
    const nav = el.dataset.nav
    if (nav && router.navigate) router.navigate(nav)
  }))

  cleans.push(delegate(sidebar, '.nav-page-item[data-page-id]', 'click', (e, el) => {
    if (e.target.closest('.page-dot, .nav-page-icon-picker, .nav-page-fav')) return
    const pageId = el.dataset.pageId
    if (pageId && router.openEditor) {
      const nameEl = el.querySelector('.nav-page-name')
      const title = nameEl ? nameEl.textContent : ''
      router.openEditor(pageId, title)
    }
  }))

  cleans.push(delegate(sidebar, '[data-fav]', 'click', (e, el) => {
    e.stopPropagation()
    const pageId = el.dataset.fav
    if (pageId && store) {
      const page = store.state.pages.find(p => p.id === pageId)
      if (page) {
        page.meta = page.meta || {}
        page.meta.favorite = !page.meta.favorite
        page.updatedAt = new Date().toISOString()
        const props = {
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          parentId: page.parentId,
          meta: page.meta,
        }
        updateEntity(pageId, { properties: props }).catch(() => {})
        store.setState({ pages: [...store.state.pages] })
      }
    }
  }))

  cleans.push(delegate(sidebar, '[data-recent-id]', 'click', (e, el) => {
    const pageId = el.dataset.recentId
    if (pageId && router.openEditor) {
      const title = el.querySelector('span')?.textContent || ''
      router.openEditor(pageId, title)
    }
  }))

  cleans.push(delegate(sidebar, '.sidebar-add-page', 'click', async () => {
    if (router.createPage && router.openEditor) {
      const page = await router.createPage('Untitled')
      if (page) router.openEditor(page.id, page.title)
    }
  }))

  cleans.push(delegate(sidebar, '.sidebar-user', 'click', () => {
    if (typeof window.openProfile === 'function') {
      window.openProfile()
    }
  }))

  cleans.push(delegate(sidebar, '.sidebar-section-header', 'click', (e, el) => {
    if (e.target.closest('.sidebar-section-add')) return
    const section = el.dataset.section
    const contentId = section + 'Section'
    const content = document.getElementById(contentId)
    const arrow = el.querySelector('.sidebar-section-arrow')
    if (content) {
      content.classList.toggle('collapsed')
      arrow?.classList.toggle('collapsed')
    }
  }))

  cleans.push(delegate(sidebar, '[data-section-add]', 'click', (e, el) => {
    const type = el.dataset.sectionAdd
    if (type === 'page' && router.createPage && router.openEditor) {
      router.createPage('Untitled').then(page => {
        if (page) router.openEditor(page.id, page.title)
      })
    } else if (type === 'folder') {
      const existing = document.querySelector('.rename-modal-overlay')
      if (existing) existing.remove()
      const overlay = document.createElement('div')
      overlay.className = 'rename-modal-overlay'
      overlay.innerHTML = `
        <div class="rename-modal">
          <h3 class="rename-modal-title">New folder</h3>
          <input class="rename-modal-input" type="text" placeholder="Folder name..." value="New Folder" autofocus />
          <div class="rename-modal-actions">
            <button class="rename-modal-btn rename-modal-btn--cancel" title="Cancel">Cancel</button>
            <button class="rename-modal-btn rename-modal-btn--save" title="Create">Create</button>
          </div>
        </div>`
      document.body.appendChild(overlay)
      requestAnimationFrame(() => overlay.classList.add('open'))
      const input = overlay.querySelector('.rename-modal-input')
      input.focus()
      input.select()
      const save = async () => {
        const title = input.value.trim() || 'New Folder'
        if (router.createPage && router.openEditor) {
          const page = await router.createPage(title)
          if (page && router.openEditor) router.openEditor(page.id, page.title)
        }
        overlay.classList.remove('open')
        setTimeout(() => overlay.remove(), 200)
      }
      overlay.querySelector('.rename-modal-btn--save').addEventListener('click', save)
      overlay.querySelector('.rename-modal-btn--cancel').addEventListener('click', () => {
        overlay.classList.remove('open')
        setTimeout(() => overlay.remove(), 200)
      })
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
      })
    }
  }))

  const searchInput = $id('sidebarSearch')
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      const existing = document.querySelector('.search-modal-overlay')
      if (existing) return
      searchInput.blur()
      const overlay = document.createElement('div')
      overlay.className = 'search-modal-overlay'
      overlay.innerHTML = `
        <div class="search-modal">
          <div class="search-modal-header">
            <svg class="search-modal-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-modal-input" placeholder="Search pages and tags..." autofocus spellcheck="false">
            <span class="search-modal-hint"><span class="kbd-badge">esc</span> to close</span>
          </div>
          <div class="search-modal-founder">
            <img class="search-modal-founder-img" src="logo/founder.jpeg" alt="Gaurav Kaloliya" />
            <div class="search-modal-founder-info">
              <div class="search-modal-founder-name">Gaurav Kaloliya</div>
              <div class="search-modal-founder-title">Founder & Creator of Gnovium</div>
              <div class="search-modal-founder-links">
                <a href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417/" target="_blank" title="LinkedIn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://github.com/GauravKaloliya" target="_blank" title="GitHub">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div class="search-modal-divider"></div>
          <div class="search-modal-results"></div>
        </div>`
      document.body.appendChild(overlay)
      requestAnimationFrame(() => overlay.classList.add('open'))
      const input = overlay.querySelector('.search-modal-input')
      input.focus()
      input.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase()
        const results = overlay.querySelector('.search-modal-results')
        if (!q) { results.innerHTML = ''; return }
        const allPages = document.querySelectorAll('.nav-page-item .nav-page-name')
        const matches = []
        allPages.forEach(el => {
          const name = el.textContent.toLowerCase()
          if (name.includes(q)) matches.push({ name: el.textContent, id: el.closest('[data-page-id]')?.dataset.pageId })
        })
        if (matches.length === 0) {
          results.innerHTML = '<div class="search-modal-empty">No results found</div>'
        } else {
          results.innerHTML = matches.slice(0, 20).map(m => `
            <div class="search-modal-item" data-page-id="${m.id || ''}">
              <span class="search-modal-item-icon">📄</span>
              <span class="search-modal-item-name">${escHtml(m.name)}</span>
            </div>`).join('')
        }
      })
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = input.value.trim()
          if (q && router.navigate) {
            overlay.classList.remove('open')
            setTimeout(() => overlay.remove(), 300)
            router.navigate('search', { query: q })
          }
        }
      })
      overlay.addEventListener('click', (e) => {
        const item = e.target.closest('.search-modal-item')
        if (item) {
          const pageId = item.dataset.pageId
          overlay.classList.remove('open')
          setTimeout(() => overlay.remove(), 300)
          if (pageId && router.navigate) router.navigate('page', { id: pageId })
          else if (router.navigate) router.navigate('search', { query: input.value.trim() })
        }
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open')
          setTimeout(() => overlay.remove(), 300)
        }
      })
      document.addEventListener('keydown', function closeHandler(ev) {
        if (ev.key === 'Escape') {
          overlay.classList.remove('open')
          setTimeout(() => { overlay.remove(); document.removeEventListener('keydown', closeHandler) }, 300)
        }
      })
    })
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        searchInput.focus()
      }
    })
  }

  cleans.push(delegate(sidebar, '.nav-page-toggle', 'click', (e, el) => {
    e.stopPropagation()
    el.classList.toggle('collapsed')
    const childContainer = el.closest('.nav-page-item')?.nextElementSibling
    if (childContainer?.classList.contains('nav-page-children')) {
      childContainer.classList.toggle('collapsed')
    }
  }))

  const resizeHandle = $id('sidebarResizeHandle')
  if (resizeHandle) {
    let isResizing = false
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      isResizing = true
      const startX = e.clientX
      const startWidth = sidebar.offsetWidth
      const onMove = (ev) => {
        if (!isResizing) return
        const newWidth = Math.max(180, Math.min(500, startWidth + ev.clientX - startX))
        sidebar.style.width = newWidth + 'px'
      }
      const onUp = () => {
        isResizing = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
    resizeHandle.addEventListener('click', (e) => e.stopPropagation())
  }

  cleans.push(delegate(sidebar, '.nav-page-item', 'contextmenu', (e, el) => {
    e.preventDefault()
    e.stopPropagation()
    const existing = document.querySelector('.context-menu')
    if (existing) existing.remove()
    const pageId = el.dataset.pageId
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.style.left = e.clientX + 'px'
    menu.style.top = e.clientY + 'px'
    menu.innerHTML = `
      <button class="context-menu-item" data-action="rename" title="Rename page">Rename page</button>
      <button class="context-menu-item" data-action="duplicate" title="Duplicate page">Duplicate</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item context-menu-item--danger" data-action="delete" title="Move to trash">Move to trash</button>`
    menu.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action
        if (action === 'rename') {
          showRenamePageModal(store, pageId)
        } else if (action === 'duplicate') {
          if (router.createPage) {
            const original = store.state.pages.find(p => p.id === pageId)
            const title = (original?.title || 'Untitled') + ' (copy)'
            const page = await router.createPage(title)
            if (page && router.openEditor) router.openEditor(page.id, page.title)
          }
        } else if (action === 'delete') {
          const page = store.state.pages.find(p => p.id === pageId)
          const pageName = page?.title || 'Untitled'
          const filtered = store.state.pages.filter(p => p.id !== pageId)
          store.state.pages = filtered
          archiveEntity(pageId).catch(e => console.error('API soft-delete error:', e))
          const switchTo = closeTab(pageId)
          if (store.state.currentPageId === pageId) {
            if (switchTo && router.navigate) {
              if (switchTo.type === 'editor') {
                router.navigate('editor', switchTo.params)
              } else {
                router.navigate(switchTo.type || 'home')
              }
            } else if (router.navigate) {
              router.navigate('home')
            }
          }
          store.setState({ pages: [...filtered] })
          showUndoDeleteToast(pageId, pageName)
        }
        menu.remove()
      })
    })
    document.body.appendChild(menu)
    const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu) } }
    setTimeout(() => document.addEventListener('click', closeMenu), 10)
  }))

  function showUndoDeleteToast(pageId, pageName) {
    const existing = document.querySelector('.undo-toast')
    if (existing) existing.remove()
    const toast = document.createElement('div')
    toast.className = 'undo-toast'
    toast.innerHTML = `
      <span>Moved "${pageName}" to trash</span>
      <button class="undo-toast-btn" title="Undo">Undo</button>
      <button class="undo-toast-close" title="Close">&times;</button>`
    document.body.appendChild(toast)
    requestAnimationFrame(() => toast.classList.add('open'))
    toast.querySelector('.undo-toast-btn').addEventListener('click', async () => {
      restoreEntity(pageId).catch(e => console.error('Restore error:', e))
      const restoredPages = store.state.pages
      restoredPages.push({ id: pageId, title: pageName, blocks: [], meta: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), parentId: null })
      store.setState({ pages: [...restoredPages] })
      toast.classList.remove('open')
      setTimeout(() => toast.remove(), 200)
    })
    const remove = () => { toast.classList.remove('open'); setTimeout(() => toast.remove(), 200) }
    toast.querySelector('.undo-toast-close').addEventListener('click', remove)
    setTimeout(remove, 4000)
  }

  cleans.push(delegate(sidebar, '.nav-page-item[draggable]', 'dragstart', (e, el) => {
    el.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', el.dataset.pageId)
  }))

  cleans.push(delegate(sidebar, '.nav-page-item[draggable]', 'dragend', (e, el) => {
    el.classList.remove('dragging')
    sidebar.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'))
  }))

  cleans.push(delegate(sidebar, '.nav-page-item[draggable]', 'dragover', (e, el) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    sidebar.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'))
    el.classList.add('drag-over')
  }))

  cleans.push(delegate(sidebar, '.nav-page-item[draggable]', 'dragleave', (e, el) => {
    el.classList.remove('drag-over')
  }))

  cleans.push(delegate(sidebar, '.nav-page-item[draggable]', 'drop', (e, el) => {
    e.preventDefault()
    el.classList.remove('drag-over')
    const dragId = e.dataTransfer.getData('text/plain')
    const targetId = el.dataset.pageId
    if (!dragId || dragId === targetId) return
    const pages = store?.state?.pages
    if (!pages) return
    const dragIdx = pages.findIndex(p => p.id === dragId)
    const targetIdx = pages.findIndex(p => p.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return
    const copy = [...pages]
    const [moved] = copy.splice(dragIdx, 1)
    const newTargetIdx = copy.findIndex(p => p.id === targetId)
    copy.splice(newTargetIdx + 1, 0, moved)
    store.setState({ pages: copy })
  }))

  cleans.push(delegate(sidebar, '.page-dot', 'click', (e, el) => {
    e.stopPropagation()
    const existing = document.querySelector('.nav-page-icon-picker')
    if (existing) { existing.remove(); return }
    const pageItem = el.closest('.nav-page-item')
    if (!pageItem) return
    const pageId = pageItem.dataset.pageId
    const picker = document.createElement('div')
    picker.className = 'nav-page-icon-picker'
    const emojis = ['📄','📝','📋','📊','📈','📉','🗂️','📁','📂','🗃️','📅','📌','📍','⭐','🔥','💡','🧠','🎯','🚀','💎','🔮','🌈','🎨','🛠️','⚙️','🔧','📎','🔗','💬','👤','🏢','📦','🎁','🏆','💪','🧩','🎭','🎪','🎤','🎵']
    picker.innerHTML = emojis.map(e => `<span class="nav-page-icon-opt" data-icon="${e}">${e}</span>`).join('')
    el.parentNode.appendChild(picker)
    const close = (ev) => { if (!picker.contains(ev.target) && ev.target !== el) { picker.remove(); document.removeEventListener('click', close) } }
    setTimeout(() => document.addEventListener('click', close), 10)
    picker.addEventListener('click', (ev) => {
      const opt = ev.target.closest('.nav-page-icon-opt')
      if (!opt) return
      const icon = opt.dataset.icon
      el.innerHTML = icon
      el.className = 'page-icon-set'
      picker.remove()
      const p = store?.state?.pages?.find(x => x.id === pageId)
      if (p) {
        p.meta = p.meta || {}
        p.meta.icon = icon
        p.updatedAt = new Date().toISOString()
        store.setState({ pages: [...store.state.pages] })
        const props = {
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          parentId: p.parentId,
          meta: p.meta,
        }
        updateEntity(pageId, { properties: props }).catch(e => console.error('API icon persist error:', e))
      }
    })
  }))

  cleans.push(delegate(sidebar, '.nav-page-item', 'contextmenu', (e, el) => {
    e.preventDefault()
    document.querySelectorAll('.sidebar-context-menu').forEach(m => m.remove())
    const pageId = el.dataset.pageId
    const menu = document.createElement('div')
    menu.className = 'sidebar-context-menu'
    menu.style.left = e.clientX + 'px'
    menu.style.top = e.clientY + 'px'
    menu.innerHTML = `
      <button class="context-menu-item" data-action="rename" data-id="${pageId}">Rename</button>
      <button class="context-menu-item" data-action="duplicate" data-id="${pageId}">Duplicate</button>
      <button class="context-menu-item context-menu-item--danger" data-action="delete" data-id="${pageId}">Delete</button>
    `
    document.body.appendChild(menu)
    const closeMenu = (ev) => {
      menu.remove()
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('contextmenu', closeMenu)
    }
    setTimeout(() => {
      document.addEventListener('click', closeMenu)
      document.addEventListener('contextmenu', closeMenu)
    }, 0)
  }))

  // ── Workspace selector ──
  let _workspaces = []

  async function loadWorkspaceList() {
    try { _workspaces = await listWorkspaces() || [] } catch { _workspaces = [] }
    const label = document.getElementById('wsSelector')
    if (label && _workspaces.length > 1) {
      const current = store.state?.workspaceId || 'default'
      const ws = _workspaces.find(w => w.id === current)
      label.textContent = ws ? ws.name : current
    }
  }

  loadWorkspaceList()

  cleans.push(delegate(sidebar, '#wsSelector', 'click', (e, el) => {
    const existing = document.querySelector('.ws-dropdown')
    if (existing) { existing.remove(); return }
    if (!_workspaces.length) return
    const rect = el.getBoundingClientRect()
    const dl = document.createElement('div')
    dl.className = 'ws-dropdown'
    dl.style.left = rect.left + 'px'
    dl.style.top = (rect.bottom + 4) + 'px'
    const current = store.state?.workspaceId || 'default'
    dl.innerHTML = _workspaces.map(w =>
      `<button class="ws-dropdown-item${w.id === current ? ' active' : ''}" data-ws-id="${w.id}">${escHtml(w.name || w.id)}</button>`
    ).join('')
    document.body.appendChild(dl)
    const closeDl = (ev) => { if (!dl.contains(ev.target) && ev.target !== el) { dl.remove(); document.removeEventListener('click', closeDl) } }
    setTimeout(() => document.addEventListener('click', closeDl), 10)
  }))

  cleans.push(delegate(document, '.ws-dropdown-item', 'click', (e, el) => {
    const wsId = el.dataset.wsId
    if (wsId && store) {
      if (store.setState) store.setState({ workspaceId: wsId })
      const label = document.getElementById('wsSelector')
      if (label) label.textContent = el.textContent.trim()
      document.querySelector('.ws-dropdown')?.remove()
    }
  }))

  return () => { for (const c of cleans) c() }
}

export function updateSidebarPageTree(pages, currentPageId) {
  const container = document.querySelector('.nav-pages')
  if (!container) return
  container.innerHTML = renderPageTree(pages, currentPageId, null, 0)
}

export function showRenamePageModal(store, pageId) {
  const existing = document.querySelector('.rename-modal-overlay')
  if (existing) existing.remove()
  const page = store.state.pages.find(p => p.id === pageId)
  if (!page) return
  const overlay = document.createElement('div')
  overlay.className = 'rename-modal-overlay'
  overlay.innerHTML = `
    <div class="rename-modal">
      <h3 class="rename-modal-title">Rename page</h3>
      <input class="rename-modal-input" type="text" value="${page.title || 'Untitled'}" autofocus />
      <div class="rename-modal-actions">
        <button class="rename-modal-btn rename-modal-btn--cancel" title="Cancel">Cancel</button>
        <button class="rename-modal-btn rename-modal-btn--save" title="Save">Save</button>
      </div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))
  const input = overlay.querySelector('.rename-modal-input')
  input.focus()
  input.select()
  const save = () => {
    const title = input.value.trim() || 'Untitled'
    page.title = title
    page.updatedAt = new Date().toISOString()
    store.setState({ pages: [...store.state.pages] })
    updateEntity(pageId, { title }).catch(e => console.error('API rename error:', e))
    updateTabTitle(pageId, title)
    overlay.classList.remove('open')
    setTimeout(() => overlay.remove(), 200)
  }
  overlay.querySelector('.rename-modal-btn--save').addEventListener('click', save)
  overlay.querySelector('.rename-modal-btn--cancel').addEventListener('click', () => {
    overlay.classList.remove('open')
    setTimeout(() => overlay.remove(), 200)
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
  })
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200) }
  })
}


