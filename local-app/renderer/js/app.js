import { createStore } from './store/state.js'
import { createPagesStore } from './store/pages.js'
import { archiveEntity, deleteEntity } from './lib/api.js'
import { renderSidebar, mountSidebar, updateSidebarPageTree } from './components/sidebar.js'
import { renderTopbar, mountTopbar, renderSetupTopbar } from './components/topbar.js'
import { mountProfilePanel, openProfile, closeProfile } from './components/profilePanel.js'
import { openTab, closeTab, mountTabBar, unmountTabBar, getActiveTab, getTabs } from './components/tabBar.js'
import { $id, $el, $all, escHtml } from './lib/helpers.js'
import { toggleRightPanel, mountRightPanel } from './components/rightPanel.js'
import * as homeMod from './pages/home.js'
import * as tagsMod from './pages/tags.js'
import * as graphMod from './pages/graph.js'
import * as searchMod from './pages/search.js'
import * as editorMod from './pages/editor.js'
import * as healthMod from './pages/health.js'
import * as settingsMod from './pages/settings.js'
import * as entitiesMod from './pages/entities.js'
import * as trashMod from './pages/trash.js'
import * as shortcutsMod from './pages/shortcuts.js'

const store = createStore()
const pagesStore = createPagesStore(store)
window.__pagesStore = pagesStore
window.electron.getApiPort().then(p => { window.__apiPort = p }).catch(() => { window.__apiPort = 5000 })
window.__autosaveInterval = store.state.autosaveInterval || 3000
window.__restartAutosave = () => {
  window.__autosaveInterval = store.state.autosaveInterval || 3000
}

const THEMES_LIST = ['light', 'dark', 'sepia', 'high-contrast', 'ocean', 'midnight']
function applyThemeAndSave(t) {
  const html = document.documentElement
  html.classList.remove(...THEMES_LIST)
  html.classList.add('theme-transitioning', t)
  store.setState({ theme: t })
  localStorage.setItem('gnovium-theme', t)
  setTimeout(() => html.classList.remove('theme-transitioning'), 300)
}

const savedTheme = localStorage.getItem('gnovium-theme')
if (savedTheme && THEMES_LIST.includes(savedTheme)) {
  applyThemeAndSave(savedTheme)
} else {
  applyThemeAndSave('dark')
}

function renderSidebarFull() {
  const sidebar = document.querySelector('.sidebar')
  if (!sidebar) return
  sidebar.innerHTML = renderSidebar(store.state.pages, store.state.currentPageId, store.state.user, recentPages)
  mountSidebar(router, store)
  window.applySettings()
}

function wrapPage(mod) {
  return {
    render: (params) => mod.render(store, params),
    mount: (params) => mod.mount && mod.mount(store, router, params),
    unmount: () => mod.unmount && mod.unmount()
  }
}

const pageModules = {
  home: wrapPage(homeMod),
  tags: wrapPage(tagsMod),
  graph: wrapPage(graphMod),
  search: wrapPage(searchMod),
  editor: wrapPage(editorMod),
  health: wrapPage(healthMod),
  settings: wrapPage(settingsMod),
  entities: wrapPage(entitiesMod),
  trash: wrapPage(trashMod),
  shortcuts: wrapPage(shortcutsMod)
}

window.showProgressModal = function showProgressModal(title, steps) {
  const existing = document.querySelector('.progress-modal-overlay')
  if (existing) existing.remove()
  const overlay = document.createElement('div')
  overlay.className = 'progress-modal-overlay'
  const stepHtml = steps.map((s, i) => `
    <div class="progress-step" data-step="${i}">
      <div class="progress-step-indicator"><div class="progress-step-dot"></div></div>
      <div class="progress-step-label">${s}</div>
    </div>`).join('')
  overlay.innerHTML = `<div class="progress-modal">
    <div class="progress-modal-header">
      <h3 class="progress-modal-title">${title}</h3>
      <div class="loading-dots"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
    </div>
    <div class="progress-steps">${stepHtml}</div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width:0%"></div>
    </div>
  </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))
  let currentStep = 0
  function advance(step) {
    const dots = overlay.querySelectorAll('.progress-step-dot')
    const bar = overlay.querySelector('.progress-bar-fill')
    if (step < dots.length) {
      dots[step].classList.add('done')
      dots[step].innerHTML = '✓'
    }
    currentStep = step + 1
    const pct = Math.min(100, Math.round((currentStep / steps.length) * 100))
    if (bar) bar.style.width = pct + '%'
    if (currentStep >= steps.length) {
      setTimeout(() => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300) }, 600)
    }
  }
  return { overlay, advance, close: () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 300) } }
}

function showToast(message, type, duration) {
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  const t = document.createElement('div')
  t.className = 'toast toast--' + (type || 'info')
  const iconMap = { success: '\u2713', error: '\u2717', info: '\u2139\uFE0F' }
  t.innerHTML = `<span class="toast-icon">${iconMap[type] || iconMap.info}</span><span>${message}</span><button class="toast-close" title="Dismiss">\u2715</button>`
  t.querySelector('.toast-close').addEventListener('click', () => t.remove())
  container.appendChild(t)
  const dur = duration || 3000
  setTimeout(() => { t.style.animation = 'toastOut 0.3s cubic-bezier(0.16,1,0.3,1) both'; setTimeout(() => t.remove(), 300) }, dur)
}

function showCommandPalette() {
  const existing = document.querySelector('.cmd-palette-overlay')
  if (existing) { existing.remove(); return }

  const overlay = document.createElement('div')
  overlay.className = 'cmd-palette-overlay'
  overlay.innerHTML = `
    <div class="cmd-palette">
      <input class="cmd-palette-input" type="text" placeholder="Search pages and actions..." autofocus />
      <div class="cmd-palette-results"></div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  const input = overlay.querySelector('.cmd-palette-input')
  const results = overlay.querySelector('.cmd-palette-results')

  const COMMANDS = [
    { id: 'home', label: 'Go to Home', icon: '\uD83C\uDFE0', desc: 'Navigate to home page' },
    { id: 'tags', label: 'Go to Tags', icon: '\uD83C\uDFF7\uFE0F', desc: 'Manage tags' },
    { id: 'graph', label: 'Go to Graph', icon: '\uD83D\uDD78\uFE0F', desc: 'View knowledge graph' },
    { id: 'search', label: 'Go to Search', icon: '\uD83D\uDD0D', desc: 'Search everything' },
    { id: 'health', label: 'Workspace Health', icon: '\u2764\uFE0F', desc: 'Check workspace health' },
    { id: 'settings', label: 'Open Settings', icon: '\u2699\uFE0F', desc: 'Configure workspace' },
    { id: 'theme', label: 'Toggle Theme', icon: '\uD83C\uDF19', desc: 'Switch between themes' },
    { id: 'new-page', label: 'New Page', icon: '\uD83D\uDCC4', desc: 'Create a new blank page' },
    { id: 'focus', label: 'Toggle Focus Mode', icon: '\uD83D\uDD0D', desc: 'Minimize distractions' },
  ]

  function renderCommands(filter) {
    const lower = (filter || '').toLowerCase()
    const pages = store.state.pages || []
    const pageItems = pages.filter(p => !lower || p.title?.toLowerCase().includes(lower)).slice(0, 5).map(p => ({
      id: 'page-' + p.id, label: p.title || 'Untitled', icon: '\uD83D\uDCC4', desc: 'Open page',
      action: () => router.openEditor(p.id, p.title)
    }))

    const recentItems = (filter ? [] : recentPages.slice(0, 3)).map(r => {
      const p = pages.find(x => x.id === r.id)
      return {
        id: 'page-' + r.id, label: p?.title || r.label || 'Untitled', icon: '\u23F0', desc: 'Recent page',
        action: () => p ? router.openEditor(p.id, p.title) : null
      }
    }).filter(Boolean)

    const filteredCommands = COMMANDS.filter(c => !lower || c.label.toLowerCase().includes(lower) || c.desc.toLowerCase().includes(lower))
    const allItems = [...filteredCommands, ...recentItems, ...pageItems]
    if (allItems.length === 0) {
      const newPageCmd = { id: 'new-page', label: `Create page "${filter}"`, icon: '\u2795', desc: 'Create a new page with this title', action: () => {
        router.createPage(filter).then(p => { if (p) router.openEditor(p.id, p.title) })
      }}
      results.innerHTML = `<div class="cmd-palette-item cmd-palette-empty selected" data-cmd="new-page">
        <div class="cmd-palette-item-icon">\u2795</div>
        <div class="cmd-palette-item-text">
          <div class="cmd-palette-item-label">Create page "${escHtml(filter)}"</div>
          <div class="cmd-palette-item-desc">No results found — create a new page</div>
        </div>
      </div>`
      return
    }
    results.innerHTML = allItems.map((item, i) => `
      <div class="cmd-palette-item${i === 0 ? ' selected' : ''}" data-cmd="${item.id}">
        <div class="cmd-palette-item-icon">${item.icon}</div>
        <div class="cmd-palette-item-text">
          <div class="cmd-palette-item-label">${item.label}</div>
          ${item.desc ? '<div class="cmd-palette-item-desc">' + item.desc + '</div>' : ''}
        </div>
      </div>`).join('')

    let selectedIndex = 0

    results.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-palette-item')
      if (item) {
        const cmd = item.dataset.cmd
        executeCommand(cmd)
      }
    })

    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.cmd-palette-item')
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        items[selectedIndex]?.classList.remove('selected')
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
        items[selectedIndex]?.classList.add('selected')
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        items[selectedIndex]?.classList.remove('selected')
        selectedIndex = Math.max(selectedIndex - 1, 0)
        items[selectedIndex]?.classList.add('selected')
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = items[selectedIndex]
        if (selected) executeCommand(selected.dataset.cmd)
      } else if (e.key === 'Escape') {
        overlay.remove()
      }
    })
  }

  function executeCommand(cmd) {
    overlay.remove()
    if (cmd === 'theme') {
      window.toggleTheme()
      showToast('Theme switched', 'success')
    } else if (cmd === 'new-page') {
      router.createPage('Untitled').then(page => {
        if (page) router.openEditor(page.id, page.title)
        showToast('New page created', 'success')
      })
    } else if (cmd === 'focus') {
      document.getElementById('app')?.classList.toggle('focus-mode')
      showToast('Focus mode ' + (document.getElementById('app')?.classList.contains('focus-mode') ? 'on' : 'off'), 'info')
    } else if (cmd?.startsWith('page-')) {
      const pageId = cmd.replace('page-', '')
      const p = store.state.pages.find(x => x.id === pageId)
      if (p) router.openEditor(p.id, p.title)
    } else if (cmd) {
      if (router.navigate) router.navigate(cmd)
    }
  }

  input.addEventListener('input', () => renderCommands(input.value))
  renderCommands('')
  setTimeout(() => input.focus(), 50)

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })
}

function showContextMenu(e, items) {
  e.preventDefault()
  const existing = document.querySelector('.context-menu')
  if (existing) existing.remove()
  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.style.left = e.clientX + 'px'
  menu.style.top = e.clientY + 'px'
  menu.innerHTML = items.map(item => {
    if (item.divider) return '<div class="context-menu-divider"></div>'
    const iconHtml = item.icon ? `<span class="context-menu-icon">${item.icon}</span>` : ''
    return `<button class="context-menu-item${item.danger ? ' context-menu-item--danger' : ''}" title="${escHtml(item.label)}">${iconHtml}${item.label}</button>`
  }).join('')
  menu.querySelectorAll('.context-menu-item').forEach((btn, i) => {
    const item = items.filter(x => !x.divider)[i]
    if (item?.action) btn.addEventListener('click', () => { item.action(); menu.remove() })
  })
  document.body.appendChild(menu)
  const close = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', close) } }
  setTimeout(() => document.addEventListener('click', close), 10)
}

function showKeyboardShortcutsModal() {
  const existing = document.querySelector('.shortcuts-modal-overlay')
  if (existing) { existing.remove(); return }
  const overlay = document.createElement('div')
  overlay.className = 'shortcuts-modal-overlay'
  overlay.innerHTML = `
    <div class="shortcuts-modal">
      <div class="shortcuts-modal-header">
        <span class="shortcuts-modal-title">Keyboard Shortcuts</span>
        <button class="shortcuts-modal-close" data-shortcuts-close title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="shortcuts-modal-body">
        <div class="shortcuts-group">
          <div class="shortcuts-group-title">Navigation</div>
          <div class="shortcut-row"><kbd>⌘K</kbd><span>Command palette</span></div>
          <div class="shortcut-row"><kbd>⌘P</kbd><span>Search pages</span></div>
          <div class="shortcut-row"><kbd>⌘N</kbd><span>New page</span></div>
          <div class="shortcut-row"><kbd>⌘⇧L</kbd><span>Toggle dark/light theme</span></div>
          <div class="shortcut-row"><kbd>⌘\</kbd><span>Toggle sidebar</span></div>
          <div class="shortcut-row"><kbd>⌘⌥P</kbd><span>Toggle page info panel</span></div>
        </div>
        <div class="shortcuts-group">
          <div class="shortcuts-group-title">Editing</div>
          <div class="shortcut-row"><kbd>⌘B</kbd><span>Bold</span></div>
          <div class="shortcut-row"><kbd>⌘I</kbd><span>Italic</span></div>
          <div class="shortcut-row"><kbd>⌘U</kbd><span>Underline</span></div>
          <div class="shortcut-row"><kbd>⌘Z</kbd><span>Undo</span></div>
          <div class="shortcut-row"><kbd>⌘⇧Z</kbd><span>Redo</span></div>
          <div class="shortcut-row"><kbd>/</kbd><span>Slash command menu</span></div>
          <div class="shortcut-row"><kbd>@</kbd><span>Link to page</span></div>
        </div>
        <div class="shortcuts-group">
          <div class="shortcuts-group-title">Search & Find</div>
          <div class="shortcut-row"><kbd>⌘F</kbd><span>Find in page</span></div>
          <div class="shortcut-row"><kbd>⌘⇧F</kbd><span>Replace in page</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd><span>Close modal / menu</span></div>
        </div>
      </div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-shortcuts-close]')) {
      overlay.classList.remove('open')
      setTimeout(() => overlay.remove(), 200)
    }
  })
}

function showShareModal() {
  const existing = document.querySelector('.share-modal-overlay')
  if (existing) { existing.remove(); return }
  const overlay = document.createElement('div')
  overlay.className = 'share-modal-overlay'
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <span class="share-modal-title">Share</span>
        <button class="share-modal-close" data-share-close title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="share-modal-tabs">
        <button class="share-modal-tab active" data-share-tab="invite" title="Invite tab">Invite</button>
        <button class="share-modal-tab" data-share-tab="publish" title="Publish tab">Publish</button>
      </div>
      <div class="share-modal-body">
        <div class="share-tab-content active" data-share-content="invite">
          <div class="share-invite-input-row">
            <input class="share-invite-input" type="text" placeholder="Enter email address..." />
            <button class="share-invite-btn" title="Send invite">Invite</button>
          </div>
          <div class="share-invite-access">
            <span class="share-access-label">Access level</span>
            <select class="share-access-select">
              <option value="view">Can view</option>
              <option value="comment">Can comment</option>
              <option value="edit">Can edit</option>
            </select>
          </div>
          <div class="share-invite-empty">No team members yet. Invite someone above.</div>
        </div>
        <div class="share-tab-content" data-share-content="publish">
          <div class="share-publish-info">
            <p>Publish this page to the web. Anyone with the link can view.</p>
            <button class="share-publish-btn" title="Publish to web">Publish to web</button>
          </div>
          <div class="share-publish-note">Published pages are publicly accessible.</div>
        </div>
      </div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))

  overlay.querySelectorAll('[data-share-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('[data-share-tab]').forEach(t => t.classList.remove('active'))
      overlay.querySelectorAll('[data-share-content]').forEach(c => c.classList.remove('active'))
      tab.classList.add('active')
      const content = overlay.querySelector(`[data-share-content="${tab.dataset.shareTab}"]`)
      if (content) content.classList.add('active')
    })
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-share-close]')) {
      overlay.classList.remove('open')
      setTimeout(() => overlay.remove(), 200)
    }
  })
}

const router = {
  state: { currentPage: null, currentParams: null, previousPage: null },
  createPage: async (title) => {
    const page = pagesStore.createPage(title)
    return page
  },
  goHome: () => router.navigate('home'),
  openEditor: (pageId, pageTitle) => router.navigate('editor', { pageId, pageTitle }),
  async navigate(page, params) {
    const mod = pageModules[page]
    if (!mod) return

    const main = $id('mainContent')
    const prevMod = pageModules[router.state.currentPage]
    /* Snapshot on page close */
    if (router.state.currentPage === 'editor' && router.state.currentParams?.pageId) {
      createSnapshotForPage(router.state.currentParams.pageId)
    }
    if (prevMod && prevMod.unmount) prevMod.unmount()

    router.state.previousPage = router.state.currentPage
    router.state.currentPage = page
    router.state.currentParams = params

    main.classList.add('page-exit')
    await new Promise(r => setTimeout(r, 160))

    const html = mod.render(params)
    main.innerHTML = html
    main.classList.remove('page-exit')
    main.classList.add('page-enter')
    if (mod.mount) mod.mount(params)
    window.applySettings()

    setTimeout(() => main.classList.remove('page-enter'), 300)

    document.querySelectorAll('.nav-item, .nav-page-item, .nav-item-main, [data-nav]').forEach(el => el.classList.remove('active'))

    if (page === 'home') {
      $el('[data-page="home"]')?.classList.add('active')
      openTab('home', 'Home', 'home')
    } else if (page === 'editor') {
      $el(`[data-page-id="${params?.pageId}"]`)?.classList.add('active')
      if (params?.pageId) {
        const p = pagesStore.findPage(params.pageId)
        openTab(params.pageId, p?.title || params?.pageTitle || 'Untitled', 'editor', params)
      }
    } else if (page === 'tags') {
      $el('[data-nav="tags"]')?.classList.add('active')
      openTab('tags', 'Tags', 'tags')
    } else if (page === 'graph') {
      $el('[data-nav="graph"]')?.classList.add('active')
      openTab('graph', 'Graph', 'graph')
    } else if (page === 'search') {
      $el('[data-nav="search"]')?.classList.add('active')
      openTab('search', 'Search', 'search')
    } else if (page === 'health') {
      $el('[data-nav="health"]')?.classList.add('active')
      openTab('health', 'Health', 'health')
    } else if (page === 'settings') {
      $el('[data-nav="settings"]')?.classList.add('active')
      openTab('settings', 'Settings', 'settings')
    } else if (page === 'entities') {
      $el('[data-nav="entities"]')?.classList.add('active')
      openTab('entities', 'Entities', 'entities')
    } else if (page === 'trash') {
      $el('[data-nav="trash"]')?.classList.add('active')
      openTab('trash', 'Trash', 'trash')
    } else if (page === 'shortcuts') {
      $el('[data-nav="shortcuts"]')?.classList.add('active')
      openTab('shortcuts', 'Shortcuts', 'shortcuts')
    }

    updateSidebarPageTree(store.state.pages, store.state.currentPageId)
    addToRecentPages(page, params)
    renderTopbarFull()
    setupScrollProgress(page)
  }
}

let recentPages = []

function addToRecentPages(page, params) {
  let label = page
  let id = page
  if (page === 'editor' && params?.pageId) {
    const p = pagesStore.findPage(params.pageId)
    label = p?.title || params?.pageTitle || 'Untitled'
    id = params.pageId
  }
  recentPages = recentPages.filter(r => r.id !== id)
  recentPages.unshift({ id, label, page })
  if (recentPages.length > 10) recentPages.pop()
}


function setupScrollProgress(currentPage) {
  let progressBar = document.querySelector('.scroll-progress')
  if (!progressBar) {
    progressBar = document.createElement('div')
    progressBar.className = 'scroll-progress'
    document.body.appendChild(progressBar)
  }
  const mainContent = ($id('mainContent') || document.querySelector('.content'))
  if (!mainContent) { progressBar.style.display = 'none'; return }
  if (!['editor', 'home', 'tags', 'health', 'settings', 'shortcuts'].includes(currentPage)) {
    progressBar.style.display = 'none'
    return
  }
  progressBar.style.display = 'block'
  const onScroll = () => {
    const scrollTop = mainContent.scrollTop
    const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
    progressBar.style.width = pct + '%'
  }
  mainContent.addEventListener('scroll', onScroll)
  onScroll()
}

window.openProfile = () => openProfile(store)
window.closeProfile = () => closeProfile(store)
window.renderSidebar = renderSidebarFull
window.openEditor = (pageId, title) => router.openEditor(pageId, title)
window.toggleRightPanel = () => toggleRightPanel(store, router)
window.showShareModal = () => showShareModal()
window.showKeyboardShortcuts = () => showKeyboardShortcutsModal()
window.__store = store
window.applySettings = () => {
  setTimeout(() => {
    document.querySelectorAll('.page-icon').forEach(el => el.style.display = store.state.showPageIcons ? '' : 'none')
    document.querySelectorAll('.page-dot').forEach(el => el.style.display = store.state.showPageIcons ? 'none' : '')
    const wc = document.getElementById('pageWordCount')
    if (wc) wc.style.display = store.state.showWordCount ? '' : 'none'
  }, 50)
}
window.toggleTheme = () => {
  const cur = store.state.theme || 'high-contrast'
  const idx = THEMES_LIST.indexOf(cur)
  applyThemeAndSave(THEMES_LIST[(idx + 1) % THEMES_LIST.length])
}

/* ── Auto-backup timer ── */
let backupTimer = null
function startAutoBackup() {
  if (backupTimer) { clearInterval(backupTimer); backupTimer = null }
  const interval = store.state.autoBackupInterval
  if (!interval || interval === 'never') return
  const ms = interval === 'hourly' ? 3600000 : interval === 'daily' ? 86400000 : interval === 'weekly' ? 604800000 : 0
  if (ms <= 0) return
  backupTimer = setInterval(() => {
    const location = store.state.backupLocation
    if (!location) return
    try {
      const data = {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        tags: store.state.tags,
        pages: store.state.pages,
        autoBackup: true,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      if (window.electron?.writeFile) {
        const name = `gnovium-backup-${new Date().toISOString().slice(0,10)}.json`
        window.electron.writeFile(location + '/' + name, JSON.stringify(data, null, 2))
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gnovium-backup-${new Date().toISOString().slice(0,10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Auto-backup failed:', e)
    }
  }, ms)
}
startAutoBackup()
/* Re-start when setting changes */
store.subscribe(() => {
  const prev = window.__prevBackupInterval
  if (prev !== store.state.autoBackupInterval) {
    window.__prevBackupInterval = store.state.autoBackupInterval
    startAutoBackup()
  }
})

/* ── Auto-empty trash timer ── */
let trashTimer = null
function startAutoEmptyTrash() {
  if (trashTimer) { clearInterval(trashTimer); trashTimer = null }
  const days = store.state.autoEmptyTrashDays
  if (!days || days <= 0) return
  trashTimer = setInterval(() => {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString()
    const trashed = store.state.entities.filter(e => e.archivedAt && e.archivedAt < cutoff)
    trashed.forEach(e => {
      deleteEntity(e.id).catch(() => {})
      store.state.entities = store.state.entities.filter(x => x.id !== e.id)
    })
    if (trashed.length > 0) {
      store.setState({ entities: [...store.state.entities] })
    }
  }, 3600000) /* Check every hour */
}
startAutoEmptyTrash()
store.subscribe(() => {
  const prev = window.__prevTrashDays
  if (prev !== store.state.autoEmptyTrashDays) {
    window.__prevTrashDays = store.state.autoEmptyTrashDays
    startAutoEmptyTrash()
  }
})

/* ── Snapshot on page close ── */
function createSnapshotForPage(pageId) {
  if (!store.state.autoCreateSnapshots) return
  const page = store.state.pages.find(p => p.id === pageId)
  if (!page || !page.blocks || page.blocks.length === 0) return
  const snapshot = {
    id: 'snap-' + Date.now(),
    pageId,
    blocks: JSON.parse(JSON.stringify(page.blocks)),
    createdAt: new Date().toISOString(),
  }
  const key = 'gnovium-snapshots-' + pageId
  const existing = JSON.parse(localStorage.getItem(key) || '[]')
  existing.push(snapshot)
  /* Apply retention */
  const retentionDays = store.state.snapshotRetentionDays
  if (retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 86400000
    while (existing.length > 0 && new Date(existing[0].createdAt).getTime() < cutoff) {
      existing.shift()
    }
  }
  /* Keep max 50 snapshots */
  while (existing.length > 50) existing.shift()
  localStorage.setItem(key, JSON.stringify(existing))
}

/* ── Zen Mode (double Escape only) ── */
let zenTimeout = null
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (zenTimeout) {
      clearTimeout(zenTimeout)
      zenTimeout = null
      document.body.classList.toggle('zen-mode')
      document.getElementById('app')?.classList.toggle('zen-mode')
      return
    }
    zenTimeout = setTimeout(() => { zenTimeout = null }, 400)
  }
})

document.addEventListener('keydown', (e) => {
  const cmd = e.metaKey || e.ctrlKey
  const shift = e.shiftKey
  const alt = e.altKey
  const key = e.key.toLowerCase()
  const isEditor = document.activeElement?.closest?.('[contenteditable]')

  /* ── Global shortcuts ── */
  if (cmd && key === 'k') { e.preventDefault(); showCommandPalette(); return }
  if (cmd && key === '/') { e.preventDefault(); showKeyboardShortcutsModal(); return }
  if (cmd && alt && key === 'p') { e.preventDefault(); toggleRightPanel(store, router); return }
  if (cmd && key === 'p') { e.preventDefault(); router.navigate('search'); return }
  if (cmd && key === 'n') { e.preventDefault(); router.createPage('Untitled').then(p => { if (p) router.openEditor(p.id, p.title) }); return }
  if (cmd && key === '\\') { e.preventDefault(); document.querySelector('.sidebar')?.classList.toggle('collapsed'); document.getElementById('app')?.classList.toggle('sidebar-collapsed'); return }
  if (cmd && key === ',') { e.preventDefault(); router.navigate('settings'); return }

  /* ── Shift + Cmd shortcuts ── */
  if (cmd && shift) {
    if (key === 'h') { e.preventDefault(); router.navigate('home'); return }
    if (key === 't') { e.preventDefault(); router.navigate('trash'); return }
    if (key === 's') { e.preventDefault(); router.navigate('shortcuts'); return }
    if (key === 'l') { e.preventDefault(); window.toggleTheme(); return }
    if (key === 'p') { e.preventDefault(); window.openProfile(); return }
    if (key === 'n') { e.preventDefault(); router.navigate('tags'); return }
    if (key === 'g') { e.preventDefault(); router.navigate('graph'); return }
    if (key === 'e') { e.preventDefault(); router.navigate('entities'); return }
    if (key === 'o') { e.preventDefault(); toggleOutline(); return }
    if (key === 'd') { e.preventDefault(); if (window.electron?.toggleDevtools) window.electron.toggleDevtools(); return }
    if (key === 'i') { e.preventDefault(); openImportDialog(); return }
    if (key === 'c') { e.preventDefault(); copyAsMarkdown(); return }
  }

  /* ── Editor-only shortcuts (contentEditable) ── */
  if (isEditor) {
    if (cmd && shift) {
      if (key === 'x') { e.preventDefault(); document.execCommand('strikeThrough'); return }
      if (key === 'k') { e.preventDefault(); const url = prompt('Enter link URL:'); if (url) document.execCommand('createLink', false, url); return }
      if (key === '7') { e.preventDefault(); document.execCommand('insertOrderedList'); return }
      if (key === '8') { e.preventDefault(); document.execCommand('insertUnorderedList'); return }
      if (key === 'm') { e.preventDefault(); document.execCommand('hiliteColor', false, '#fef08a'); return }
    }
    if (cmd && key === ']') { e.preventDefault(); document.execCommand('indent'); return }
    if (cmd && key === '[') { e.preventDefault(); document.execCommand('outdent'); return }
    if (cmd && key === 'd') { e.preventDefault(); dispatchBlockAction('duplicate'); return }
    if (cmd && key === 'enter') { e.preventDefault(); dispatchBlockAction('finish'); return }
    if (cmd && shift && key === 'arrowup') { e.preventDefault(); dispatchBlockAction('move-up'); return }
    if (cmd && shift && key === 'arrowdown') { e.preventDefault(); dispatchBlockAction('move-down'); return }
  }

  /* ── Escape: close open modals ── */
  if (key === 'escape') {
    const palette = document.querySelector('.cmd-palette-overlay')
    if (palette) { palette.remove(); return }
    const shortcutsModal = document.querySelector('.shortcuts-modal-overlay')
    if (shortcutsModal) {
      shortcutsModal.classList.remove('open')
      setTimeout(() => shortcutsModal.remove(), 200)
      return
    }
    const shareModal = document.querySelector('.share-modal-overlay')
    if (shareModal) {
      shareModal.classList.remove('open')
      setTimeout(() => shareModal.remove(), 200)
    }
  }
})

function dispatchBlockAction(action) {
  const block = document.activeElement?.closest('.editor-block')
  if (!block) return
  block.dispatchEvent(new CustomEvent('block-action', { bubbles: true, detail: { action } }))
}

function toggleOutline() {
  document.querySelector('.editor-outline')?.classList.toggle('open')
}

function openImportDialog() {
  const existing = document.querySelector('.import-modal-overlay')
  if (existing) { existing.remove(); return }
  const overlay = document.createElement('div')
  overlay.className = 'import-modal-overlay'
  overlay.innerHTML = `
    <div class="import-modal">
      <div class="import-modal-header">
        <span class="import-modal-title">Import Content</span>
        <button class="import-modal-close" data-import-close title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="import-modal-body">
        <p style="font-size:14px;color:var(--muted);margin-bottom:16px">Import Markdown, HTML, or plain text.</p>
        <textarea class="import-modal-textarea" placeholder="Paste your content here..." rows="8" style="width:100%;padding:12px;background:var(--sunken-bg);border:1px solid var(--border);border-radius:8px;color:var(--foreground);font-family:'Geist Mono',monospace;font-size:13px;resize:vertical"></textarea>
        <button class="import-modal-btn" data-import-confirm title="Import">Import</button>
      </div>
    </div>`
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('open'))
  const textarea = overlay.querySelector('.import-modal-textarea')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-import-close]')) {
      overlay.classList.remove('open')
      setTimeout(() => overlay.remove(), 200)
    }
  })
  overlay.querySelector('[data-import-confirm]')?.addEventListener('click', () => {
    overlay.classList.remove('open')
    setTimeout(() => overlay.remove(), 200)
  })
}

function copyAsMarkdown() {
  const sel = window.getSelection()
  const text = sel?.toString()
  if (text) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

document.addEventListener('contextmenu', (e) => {
  const editorBlock = e.target.closest('.editor-block')
  if (editorBlock) return
  const tabItem = e.target.closest('[data-tab-id]')
  if (tabItem) return
  const input = e.target.closest('input, textarea, [contenteditable]')
  if (input) return
  const navItem = e.target.closest('.nav-page-item, .sidebar, [data-nav]')
  if (navItem) return
  e.preventDefault()
  showContextMenu(e, [
    { label: 'New Page', icon: '\u2795', action: () => { const p = router.createPage('Untitled'); if (p) router.openEditor(p.id, p.title) } },
    { label: 'Go Home', icon: '\uD83C\uDFE0', action: () => router.navigate('home') },
    { divider: true },
    { label: 'Toggle Theme', icon: '\uD83C\uDF0D', action: () => window.toggleTheme() },
    { label: 'Keyboard Shortcuts', icon: '\u2328', action: () => showKeyboardShortcutsModal() },
    { label: 'Command Palette', icon: '\uD83D\uDD0D', action: () => showCommandPalette() },
  ])
})

store.init()

store.subscribe(() => {
  renderSidebarFull()
})

pagesStore.init()

function getCurrentPageForTopbar() {
  const page = router.state.currentPage
  const params = router.state.currentParams
  if (page === 'editor' && params?.pageId) {
    return store.state.pages.find(p => p.id === params.pageId) || null
  }
  return null
}

function renderTopbarFull() {
  const el = document.querySelector('.topbar')
  if (!el) return
  const currentPage = getCurrentPageForTopbar()
  el.innerHTML = renderTopbar(store.state.user, undefined, currentPage, store.state.pages, store.state.theme)
}

window.electron.getAuthData().then(auth => {
  if (auth?.user) {
    store.setState({ user: auth.user, authToken: auth.access_token })
  }
  renderTopbarFull()
}).catch(() => {
  renderTopbarFull()
})

renderSidebarFull()

const topbar = document.querySelector('.topbar')
if (topbar) {
  renderTopbarFull()
  mountTopbar(router, store)
}

mountProfilePanel(store)

mountTabBar(router, store)

mountRightPanel(store, router)

openTab('home', 'Home', 'home')

router.navigate('home')

/* ── Ripple effect on all interactive elements ── */
function applyRippleToNewButtons() {
  document.querySelectorAll('button:not(.ripple-target), .btn:not(.ripple-target), [role="button"]:not(.ripple-target), .nav-item:not(.ripple-target), .topbar-btn:not(.ripple-target)').forEach(el => {
    el.classList.add('ripple-target')
  })
}
const rippleObserver = new MutationObserver(() => applyRippleToNewButtons())
rippleObserver.observe($id('app') || document.body, { subtree: true, childList: true })
applyRippleToNewButtons()

/* ── Global tooltip system for all buttons ── */
const tooltipEl = document.createElement('div')
tooltipEl.className = 'global-tooltip'
document.body.appendChild(tooltipEl)
let tooltipTimeout = null
document.addEventListener('mouseover', (e) => {
  const btn = e.target.closest('button, .btn, [role="button"], .nav-item, .topbar-btn, .editor-tb-btn, .profile-close, .sidebar-add-page, .welcome-action, .landing-btn')
  if (!btn) { tooltipEl.classList.remove('visible'); return }
  const text = btn.getAttribute('title') || btn.getAttribute('data-tooltip') || ''
  if (!text) { tooltipEl.classList.remove('visible'); return }
  btn.setAttribute('title', '')  // suppress native tooltip
  clearTimeout(tooltipTimeout)
  tooltipTimeout = setTimeout(() => {
    tooltipEl.textContent = text
    const rect = btn.getBoundingClientRect()
    tooltipEl.style.left = Math.round(rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2) + 'px'
    tooltipEl.style.top = Math.round(rect.bottom + 6) + 'px'
    tooltipEl.classList.add('visible')
  }, 400)
})
document.addEventListener('mouseout', (e) => {
  if (e.target.closest('button, .btn, [role="button"], .nav-item, .topbar-btn, .editor-tb-btn, .profile-close, .sidebar-add-page, .welcome-action, .landing-btn')) {
    clearTimeout(tooltipTimeout)
    tooltipEl.classList.remove('visible')
  }
})

/* ── Hover preview cards for [[page]] links ── */
function initHoverCards() {
  document.querySelectorAll('.page-mention').forEach(el => {
    el.addEventListener('mouseenter', () => {
      const existing = document.querySelector('.page-hover-card')
      if (existing) existing.remove()
      const pageId = el.dataset.pageId
      if (!pageId) return
      const page = store.state.pages.find(p => p.id === pageId)
      if (!page) return
      const card = document.createElement('div')
      card.className = 'page-hover-card'
      const preview = page.blocks?.[0]?.content?.slice(0, 120) || ''
      const updated = page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : ''
      card.innerHTML = `
        <div class="page-hover-card-title">${escHtml(page.title || 'Untitled')}</div>
        <div class="page-hover-card-preview">${escHtml(preview)}</div>
        <div class="page-hover-card-meta">
          <span>${page.meta?.icon || ''}</span>
          <span>Updated ${updated}</span>
        </div>`
      document.body.appendChild(card)
      const rect = el.getBoundingClientRect()
      let left = rect.left
      let top = rect.bottom + 8
      if (top + 200 > window.innerHeight) top = rect.top - 200 - 8
      if (left + 280 > window.innerWidth) left = window.innerWidth - 290
      card.style.left = Math.max(4, left) + 'px'
      card.style.top = Math.max(4, top) + 'px'
      requestAnimationFrame(() => card.classList.add('open'))
    })
    el.addEventListener('mouseleave', () => {
      const card = document.querySelector('.page-hover-card')
      if (card) { card.classList.remove('open'); setTimeout(() => card.remove(), 200) }
    })
  })
}
const hoverObserver = new MutationObserver(() => initHoverCards())
hoverObserver.observe($id('mainContent') || document.body, { subtree: true, childList: true })
initHoverCards()
