import { $id, $el } from '../lib/helpers.js'

let _tabs = []
let _activeTabId = null
let _cleanup = null
let _router = null
let _store = null

export function renderTabBar() {
  if (!_tabs.length) return '<div class="tab-bar tab-bar-empty" id="tabBar"><div class="tab-bar-scroll"></div></div>'
  const tabsHtml = _tabs.map(tab => {
    const isActive = tab.id === _activeTabId
    const icon = tab.type === 'editor' ? '📄' : tab.icon || '📋'
    return `<div class="tab-item${isActive ? ' active' : ''}" data-tab-id="${tab.id}" title="${tab.title}">
      <span class="tab-icon">${icon}</span>
      <span class="tab-title">${tab.title || 'Untitled'}</span>
      <button class="tab-close" data-tab-close="${tab.id}" title="Close tab">&times;</button>
    </div>`
  }).join('')
  return `<div class="tab-bar" id="tabBar">
    <div class="tab-bar-scroll">${tabsHtml}</div>
  </div>`
}

export function openTab(id, title, type, params) {
  const existing = _tabs.find(t => t.id === id)
  if (existing) {
    existing.title = title || existing.title
    _activeTabId = id
  } else {
    const iconMap = {
      home: '🏠', tags: '🏷️', graph: '🕸️', search: '🔍',
      health: '❤️', settings: '⚙️', editor: '📄',
      entities: '📋', trash: '🗑️'
    }
    _tabs.push({ id, title: title || 'Untitled', type, params, icon: iconMap[type] || '📋' })
    _activeTabId = id
  }
  updateTabBarUI()
}

export function closeTab(tabId) {
  const idx = _tabs.findIndex(t => t.id === tabId)
  if (idx === -1) return null
  _tabs.splice(idx, 1)
  if (_activeTabId === tabId) {
    if (_tabs.length > 0) {
      const newIdx = Math.min(idx, _tabs.length - 1)
      _activeTabId = _tabs[newIdx].id
      return _tabs[newIdx]
    } else {
      _activeTabId = null
      return { type: 'home', id: 'home', title: 'Home', params: {} }
    }
  }
  updateTabBarUI()
  return null
}

export function getActiveTab() {
  return _tabs.find(t => t.id === _activeTabId) || null
}

export function getTabs() {
  return _tabs
}

function updateTabBarUI() {
  const container = $id('tabBar')
  if (!container) return
  const bar = document.createElement('div')
  bar.innerHTML = renderTabBar()
  const newBar = bar.firstElementChild
  if (newBar) {
    container.replaceWith(newBar)
  }
}

export function mountTabBar(router, store) {
  _router = router
  _store = store

  function handleClick(e) {
    const closeBtn = e.target.closest('[data-tab-close]')
    if (closeBtn) {
      e.stopPropagation()
      const tabId = closeBtn.dataset.tabClose
      const switchTo = closeTab(tabId)
      if (switchTo && _router) {
        if (switchTo.type === 'editor') {
          _router.navigate('editor', switchTo.params)
        } else {
          _router.navigate(switchTo.type || 'home')
        }
      }
      return
    }

    const tabItem = e.target.closest('[data-tab-id]')
    if (tabItem) {
      const tabId = tabItem.dataset.tabId
      const tab = _tabs.find(t => t.id === tabId)
      if (tab && _router) {
        _activeTabId = tabId
        updateTabBarUI()
        if (tab.type === 'editor') {
          _router.navigate('editor', tab.params)
        } else {
          _router.navigate(tab.type || 'home')
        }
      }
    }
  }

  document.addEventListener('click', (e) => {
    const tabBar = e.target.closest('#tabBar, .tab-bar')
    if (tabBar) handleClick(e)
  })

  document.addEventListener('contextmenu', (e) => {
    const tabItem = e.target.closest('[data-tab-id]')
    if (!tabItem) return
    e.preventDefault()
    e.stopPropagation()
    const existing = document.querySelector('.context-menu')
    if (existing) existing.remove()
    const tabId = tabItem.dataset.tabId
    const tab = _tabs.find(t => t.id === tabId)
    if (!tab) return
    const tabIdx = _tabs.indexOf(tab)
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.style.left = e.clientX + 'px'
    menu.style.top = e.clientY + 'px'
    menu.innerHTML = `
      <button class="context-menu-item" data-tab-action="close" title="Close tab">Close tab</button>
      <button class="context-menu-item" data-tab-action="close-others" title="Close other tabs">Close others</button>
      <button class="context-menu-item" data-tab-action="close-right" title="Close tabs to right">Close tabs to the right</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-tab-action="duplicate" title="Duplicate tab">Duplicate tab</button>`
    menu.querySelectorAll('[data-tab-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.tabAction
        if (action === 'close') {
          const switchTo = closeTab(tabId)
          if (switchTo && _router) {
            if (switchTo.type === 'editor') _router.navigate('editor', switchTo.params)
            else _router.navigate(switchTo.type || 'home')
          }
        } else if (action === 'close-others') {
          const keep = _tabs.filter(t => t.id === tabId)
          _tabs.length = 0
          _tabs.push(...keep)
          _activeTabId = tabId
          updateTabBarUI()
        } else if (action === 'close-right') {
          _tabs.splice(tabIdx + 1)
          _activeTabId = tabId
          updateTabBarUI()
        } else if (action === 'duplicate') {
          const newId = tab.id + '-copy-' + Date.now()
          _tabs.push({ ...tab, id: newId, title: tab.title + ' (copy)' })
          _activeTabId = newId
          updateTabBarUI()
          if (_router) {
            if (tab.type === 'editor') _router.navigate('editor', tab.params)
            else _router.navigate(tab.type || 'home')
          }
        }
        menu.remove()
      })
    })
    document.body.appendChild(menu)
    const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu) } }
    setTimeout(() => document.addEventListener('click', closeMenu), 10)
  })
}

export function updateTabTitle(tabId, title) {
  const tab = _tabs.find(t => t.id === tabId)
  if (tab) {
    tab.title = title
    updateTabBarUI()
  }
}

export function unmountTabBar() {
  _router = null
  _store = null
}
