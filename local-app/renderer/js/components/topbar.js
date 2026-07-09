import { delegate, makeInitialsAvatar, escHtml } from '../lib/helpers.js'
import { updateEntity, listNotifications, duplicateEntity, listBranches, createBranch, mergeBranches } from '../lib/api.js'

function buildBreadcrumbs(currentPage, pages) {
  if (!currentPage) return '<span class="crumb active" id="pageCrumb">Home</span>'
  const crumbs = []
  let p = currentPage
  const seen = new Set()
  while (p && !seen.has(p.id)) {
    seen.add(p.id)
    crumbs.unshift({ id: p.id, title: p.title || 'Untitled' })
    p = pages.find(x => x.id === p.parentId)
  }
  return crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1
    return `<span class="crumb${isLast ? ' active' : ''}" data-crumb-id="${c.id}"${isLast ? ' id="pageCrumb"' : ''}>${c.title}</span>${!isLast ? '<span class="crumb-sep">/</span>' : ''}`
  }).join('')
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago'
  return new Date(dateStr).toLocaleDateString()
}

export function renderTopbar(user, crumbs, currentPage, pages, theme) {
  const name = user?.name || user?.email || 'User'
  const avatarSrc = user?.avatar_url || user?.avatar_path || makeInitialsAvatar(name)
  const breadcrumb = crumbs && crumbs.length ? crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1
    return `<span class="crumb${isLast ? ' active' : ''}"${isLast ? ' id="pageCrumb"' : ''}>${c}</span>${!isLast ? '<span class="crumb-sep">/</span>' : ''}`
  }).join('') : buildBreadcrumbs(currentPage, pages || [])
  const isEditor = !!currentPage
  const isFav = currentPage?.meta?.favorite
  const editedTime = isEditor ? formatRelativeTime(currentPage.updatedAt) : ''
  const themeIcon = theme && (theme === 'light' || theme === 'sepia')
    ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`
    : `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`

  const editorActions = isEditor ? `
    <div class="topbar-divider"></div>
    <div class="tooltip-trigger">
      <button class="topbar-btn topbar-fav-btn" data-topbar="favorite" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <span class="tooltip-content">${isFav ? 'Remove from favorites' : 'Add to favorites'}</span>
    </div>
    <span class="topbar-edited">${editedTime ? 'Edited ' + editedTime : ''}</span>
    ${isEditor && editedTime ? `<img class="topbar-last-editor" src="${avatarSrc}" title="Last edited by ${name}" />` : ''}` : ''

  return `
    <div class="topbar-left">
      <div class="topbar-ws" title="Workspace">
        <span>Gnovium</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="tooltip-trigger">
        <button class="topbar-btn topbar-branch-btn" data-topbar="branch" title="Switch branch" style="font-size:11px;font-weight:500;gap:4px;padding:2px 8px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
          <span id="branchLabel">main</span>
        </button>
        <span class="tooltip-content">Branch</span>
      </div>
      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="home" title="Home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </button>
        <span class="tooltip-content">Home</span>
      </div>
      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="undo" title="Undo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <span class="tooltip-content">Undo <span class="kbd-badge">⌘Z</span></span>
      </div>
      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="redo" title="Redo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <span class="tooltip-content">Redo <span class="kbd-badge">⌘⇧Z</span></span>
      </div>
      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="command-palette" title="Command palette">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 7 7 4 10 7 7 10 4 7z"/><polyline points="17 4 20 7 17 10 14 7 17 4z"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
        </button>
        <span class="tooltip-content">Command Palette <span class="kbd-badge">⌘K</span></span>
      </div>
    </div>
    <div class="topbar-center">
      ${breadcrumb}
      ${editorActions}
    </div>
    <div class="topbar-right">
      ${isEditor ? `
      <div class="tooltip-trigger">
        <button class="topbar-btn topbar-share-btn" data-topbar="share" title="Share">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          <span>Share</span>
        </button>
        <span class="tooltip-content">Share this page</span>
      </div>
      <div class="topbar-divider"></div>
      ` : ''}
      <button class="topbar-btn topbar-new-btn" data-topbar="new-page" title="New page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <div class="tooltip-trigger">
        <button class="topbar-btn topbar-notif-btn" data-topbar="notifications" title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge" id="notifBadge" style="display:none"></span>
        </button>
        <span class="tooltip-content">Notifications</span>
      </div>

      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="theme" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${themeIcon}</svg>
        </button>
        <span class="tooltip-content">Switch theme</span>
      </div>
      ${isEditor ? `
      <div class="tooltip-trigger">
        <button class="topbar-btn" data-topbar="right-panel" title="Toggle right panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
        <span class="tooltip-content">Page info</span>
      </div>
      <div class="topbar-divider"></div>
      <div class="tooltip-trigger topbar-overflow-trigger">
        <button class="topbar-btn" data-topbar="overflow" title="More options">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
        <span class="tooltip-content">More actions</span>
      </div>
      ` : ''}
      <div class="tooltip-trigger">
        <button class="topbar-btn topbar-avatar-btn" data-topbar="profile" title="Profile">
          <img class="topbar-avatar" src="${avatarSrc}" alt="" />
        </button>
        <span class="tooltip-content">Profile</span>
      </div>
    </div>`
}

export function mountTopbar(router, store) {
  const topbar = document.querySelector('.topbar')
  if (!topbar) return

  const clean = delegate(topbar, '[data-topbar]', 'click', (e, el) => {
    if (e.target.closest('.topbar-overflow-menu')) return
    const action = el.dataset.topbar
    if (action === 'overflow') {
      showOverflowMenu(e, router, store)
      return
    }
    switch (action) {
      case 'home':
        if (router.navigate) router.navigate('home')
        break
      case 'undo':
        document.execCommand('undo')
        break
      case 'redo':
        document.execCommand('redo')
        break
      case 'command-palette':
        const event = new KeyboardEvent('keydown', { metaKey: true, key: 'k' })
        document.dispatchEvent(event)
        break
      case 'right-panel':
        if (typeof window.toggleRightPanel === 'function') window.toggleRightPanel()
        break
      case 'favorite': {
        const page = getCurrentPage()
        if (page && store) {
          page.meta = page.meta || {}
          page.meta.favorite = !page.meta.favorite
          page.updatedAt = new Date().toISOString()
          const props = {
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
            parentId: page.parentId,
            meta: page.meta,
          }
          updateEntity(page.id, { properties: props }).catch(() => {})
          store.setState({ pages: [...store.state.pages] })
          renderTopbarFull()
        }
        break
      }
      case 'share':
        if (typeof window.showShareModal === 'function') {
          window.showShareModal()
        }
        break
      case 'notifications':
        showNotificationsPanel(e, store)
        break
      case 'branch':
        showBranchMenu(e)
        break
      case 'new-page':
        if (router.createPage && router.openEditor) {
          router.createPage('Untitled').then(page => {
            if (page) router.openEditor(page.id, page.title)
          })
        }
        break
      case 'overflow':
        showOverflowMenu(e, router, store)
        break
      case 'theme':
        if (typeof window.toggleTheme === 'function') window.toggleTheme()
        break
      case 'profile':
        if (typeof window.openProfile === 'function') window.openProfile()
        break
    }
  })

  function getCurrentPage() {
    const page = router?.state?.currentPage
    const params = router?.state?.currentParams
    if (page === 'editor' && params?.pageId) {
      return store?.state?.pages?.find(p => p.id === params.pageId) || null
    }
    return null
  }

  function renderTopbarFull() {
    const el = document.querySelector('.topbar')
    if (!el) return
    const currentPage = getCurrentPage()
    el.innerHTML = renderTopbar(store?.state?.user, undefined, currentPage, store?.state?.pages, store?.state?.theme)
  }

  function showOverflowMenu(e, router, store) {
    const existing = document.querySelector('.context-menu')
    if (existing) existing.remove()
    const page = getCurrentPage()
    if (!page) return
    const menu = document.createElement('div')
    menu.className = 'context-menu topbar-overflow-menu'
    menu.style.right = '10px'
    menu.style.left = 'auto'
    menu.style.top = '42px'
    menu.innerHTML = `
      <button class="context-menu-item" data-overflow="duplicate" title="Duplicate page">Duplicate</button>
      <button class="context-menu-item" data-overflow="export" title="Export as Markdown">Export as Markdown</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item context-menu-item--danger" data-overflow="trash" title="Move to trash">Move to Trash</button>`
    menu.querySelectorAll('[data-overflow]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.overflow
        if (act === 'duplicate') {
          duplicateEntity(page.id).then(() => {
            if (router.createPage) {
              router.createPage(page.title + ' (copy)').then(p => {
                if (p) router.openEditor(p.id, p.title)
              })
            }
          }).catch(() => {
            if (router.createPage) {
              router.createPage(page.title + ' (copy)').then(p => {
                if (p) router.openEditor(p.id, p.title)
              })
            }
          })
        } else if (act === 'export') {
          const blob = new Blob([page.title], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = (page.title || 'untitled') + '.md'
          a.click()
          URL.revokeObjectURL(url)
        } else if (act === 'trash') {
          if (confirm('Move "' + (page.title || 'Untitled') + '" to trash?')) {
            updateEntity(page.id, { archived_at: new Date().toISOString() }).catch(() => {})
            store.state.pages = store.state.pages.filter(p => p.id !== page.id)
            store.setState({ pages: [...store.state.pages] })
            if (router.navigate) router.navigate('home')
          }
        }
        menu.remove()
      })
    })
    document.body.appendChild(menu)
    const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu) } }
    setTimeout(() => document.addEventListener('click', closeMenu), 10)
  }

  function showNotificationsPanel(e, store) {
    const existing = document.querySelector('.notifications-panel')
    if (existing) { existing.remove(); return }
    const panel = document.createElement('div')
    panel.className = 'notifications-panel context-menu'
    panel.style.right = '48px'
    panel.style.left = 'auto'
    panel.style.top = '42px'
    panel.style.width = '320px'
    panel.style.maxHeight = '400px'
    panel.style.overflowY = 'auto'
    panel.innerHTML = '<div style="padding:12px;text-align:center;color:var(--muted);font-size:13px">Loading notifications...</div>'
    document.body.appendChild(panel)

    listNotifications('default', 20).then(notifs => {
      if (!notifs || !notifs.length) {
        panel.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">No notifications</div>'
        return
      }
      panel.innerHTML = notifs.map(n => `
        <div class="context-menu-item" style="flex-direction:column;align-items:flex-start;gap:2px;height:auto;padding:10px 14px;cursor:default">
          <div style="font-size:13px;font-weight:${n.read_at ? '400' : '600'};color:var(--foreground)">${escHtml(n.title || '')}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(n.message || '')}</div>
        </div>`).join('')
    }).catch(() => {
      panel.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Failed to load notifications</div>'
    })

    const closePanel = (ev) => { if (!panel.contains(ev.target) && ev.target !== e.target?.closest?.('[data-topbar="notifications"]')) { panel.remove(); document.removeEventListener('click', closePanel) } }
    setTimeout(() => document.addEventListener('click', closePanel), 10)
  }

  let _branches = []

  async function loadBranches() {
    try { _branches = await listBranches('default') || [] } catch { _branches = [] }
    const label = document.getElementById('branchLabel')
    if (label && _branches.length > 0) {
      const active = store.state?.branchId || 'default'
      const b = _branches.find(x => x.id === active)
      if (b) label.textContent = b.name
    }
  }

  loadBranches()

  function showBranchMenu(e) {
    const existing = document.querySelector('.branch-menu')
    if (existing) { existing.remove(); return }
    const btn = e.target.closest('[data-topbar="branch"]')
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const menu = document.createElement('div')
    menu.className = 'branch-menu context-menu'
    menu.style.left = rect.left + 'px'
    menu.style.top = (rect.bottom + 4) + 'px'
    const active = store.state?.branchId || 'default'
    menu.innerHTML = (_branches.length ? _branches.map(b => `
      <button class="context-menu-item${b.id === active ? ' context-menu-item--active' : ''}" data-branch-id="${b.id}">${escHtml(b.name || b.id)}</button>
    `).join('') : '') + `
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-branch-action="create">Create branch...</button>
      ${_branches.length > 1 ? `<button class="context-menu-item" data-branch-action="merge">Merge branches...</button>` : ''}`
    document.body.appendChild(menu)
    const closeMenu = (ev) => { if (!menu.contains(ev.target) && ev.target !== btn) { menu.remove(); document.removeEventListener('click', closeMenu) } }
    setTimeout(() => document.addEventListener('click', closeMenu), 10)
  }

  document.addEventListener('click', async (e) => {
    const branchItem = e.target.closest('[data-branch-id]')
    if (branchItem) {
      const id = branchItem.dataset.branchId
      if (id && store?.setState) store.setState({ branchId: id })
      document.querySelector('.branch-menu')?.remove()
      const label = document.getElementById('branchLabel')
      if (label) label.textContent = branchItem.textContent.trim()
      return
    }
    const branchAction = e.target.closest('[data-branch-action]')
    if (branchAction) {
      const action = branchAction.dataset.branchAction
      document.querySelector('.branch-menu')?.remove()
      if (action === 'create') {
        const name = prompt('Branch name:')
        if (name) {
          try {
            await createBranch('default', name)
            await loadBranches()
          } catch (err) { alert('Failed: ' + err.message) }
        }
      } else if (action === 'merge') {
        if (_branches.length < 2) return
        const names = _branches.map(b => b.name || b.id)
        const src = prompt('Source branch:\n' + names.join(', '))
        const tgt = prompt('Target branch:\n' + names.join(', '))
        if (src && tgt) {
          const s = _branches.find(b => (b.name || b.id) === src)
          const t = _branches.find(b => (b.name || b.id) === tgt)
          if (s && t) {
            try {
              await mergeBranches(s.id, t.id)
              await loadBranches()
            } catch (err) { alert('Failed: ' + err.message) }
          }
        }
      }
    }
  })

  function updateNotifBadge() {
    listNotifications('default', 1).then(notifs => {
      const badge = document.getElementById('notifBadge')
      if (!badge) return
      const unread = (notifs || []).filter(n => !n.read_at).length
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread
        badge.style.display = 'flex'
      } else {
        badge.style.display = 'none'
      }
    }).catch(() => {})
  }

  updateNotifBadge()
  const notifInterval = setInterval(updateNotifBadge, 30000)

  const breadcrumbClean = delegate(topbar, '[data-crumb-id]', 'click', (e, el) => {
    e.stopPropagation()
    const pageId = el.dataset.crumbId
    const page = store?.state?.pages?.find(p => p.id === pageId)
    if (page && router.openEditor) {
      router.openEditor(pageId, page.title)
    }
  })

  const combinedClean = () => { clean(); breadcrumbClean(); clearInterval(notifInterval) }
  return combinedClean
}

export function renderSetupTopbar(user, crumbs) {
  return renderTopbar(user, crumbs || ['Home'])
}

