import { $id, $el, escHtml, formatDate } from '../lib/helpers.js'
import { getDashboardOverview, getActivity, listWorkspaces, getWorkspaceStats } from '../lib/api.js'

let _cleanup = null
let _stats = null

export function render(store, params) {
  const pages = (store?.state?.pages || params?.pages || []).filter(p => !p.folder)
  const stats = _stats

  const statsHtml = stats ? `
    <section class="welcome-section">
      <h2 class="welcome-section-title">Workspace Overview</h2>
      <div class="welcome-stats-row" style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="welcome-stat-card" style="flex:1;min-width:120px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--foreground)">${stats.entity_count || pages.length}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Entities</div>
        </div>
        <div class="welcome-stat-card" style="flex:1;min-width:120px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--foreground)">${stats.block_count || '—'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Blocks</div>
        </div>
        <div class="welcome-stat-card" style="flex:1;min-width:120px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--foreground)">${stats.relation_count || '—'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Relations</div>
        </div>
        <div class="welcome-stat-card" style="flex:1;min-width:120px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--foreground)">${stats.comment_count || '—'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Comments</div>
        </div>
      </div>
    </section>` : ''

  const recentHtml = pages.length
    ? `<section class="welcome-section">
        <h2 class="welcome-section-title">Recent Pages</h2>
        <div class="welcome-recent-grid">
          ${pages.slice(0, 4).map(p => `
            <a class="welcome-recent-item" data-page-id="${p.id}">
              <div class="welcome-recent-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div class="welcome-recent-info">
                <div class="welcome-recent-name">${p.title || 'Untitled'}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </section>`
    : ''

  return `<div class="welcome-page">
    <div class="welcome-badge">
      <span class="welcome-badge-dot"></span>
      Local Mode
    </div>

    <h1 class="welcome-title">
      <span class="welcome-title-line">Welcome to</span>
      <span class="welcome-title-highlight">Gnovium</span>
    </h1>
    <p class="welcome-subtitle">Your knowledge operating system — ready to capture, connect, and explore.</p>

    <div class="welcome-actions">
      <button class="welcome-action micro-hover" data-action="new-page" title="Create a new page">
        <div class="welcome-action-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        </div>
        <div class="welcome-action-text">
          <div class="welcome-action-label">New Page</div>
          <div class="welcome-action-desc">Create a blank page and start writing</div>
        </div>
        <span class="welcome-action-kbd"><kbd>⌘</kbd><kbd>N</kbd></span>
      </button>

      <button class="welcome-action micro-hover" data-action="graph" title="Open graph view">
        <div class="welcome-action-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><path d="M12 9v6M9 12h6M15 7l4-2M5 17l4-2M17 17l2 2M5 7l2-2"/></svg>
        </div>
        <div class="welcome-action-text">
          <div class="welcome-action-label">Knowledge Graph</div>
          <div class="welcome-action-desc">Visualize connections between your pages</div>
        </div>
      </button>

      <button class="welcome-action micro-hover" data-action="tags" title="Open tags">
        <div class="welcome-action-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        </div>
        <div class="welcome-action-text">
          <div class="welcome-action-label">Browse Tags</div>
          <div class="welcome-action-desc">Organize and find pages by topic</div>
        </div>
      </button>

      <button class="welcome-action micro-hover" data-action="settings" title="Open settings">
        <div class="welcome-action-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div class="welcome-action-text">
          <div class="welcome-action-label">Settings</div>
          <div class="welcome-action-desc">Configure themes, sync, and preferences</div>
        </div>
      </button>
    </div>

    <section class="welcome-section">
      <h2 class="welcome-section-title">Keyboard Shortcuts</h2>
      <div class="welcome-shortcuts">
        <div class="welcome-shortcut">
          <kbd>⌘K</kbd>
          <span>Command palette</span>
        </div>
        <div class="welcome-shortcut">
          <kbd>⌘N</kbd>
          <span>New page</span>
        </div>
        <div class="welcome-shortcut">
          <kbd>⌘P</kbd>
          <span>Search pages</span>
        </div>
        <div class="welcome-shortcut">
          <kbd>⌘\</kbd>
          <span>Toggle sidebar</span>
        </div>
        <div class="welcome-shortcut">
          <kbd>⌘B</kbd>
          <span>Bold</span>
        </div>
        <div class="welcome-shortcut">
          <kbd>⌘I</kbd>
          <span>Italic</span>
        </div>
      </div>
    </section>

    ${statsHtml}
    ${recentHtml}
  </div>`
}

export function mount(store, router) {
  const container = $id('mainContent')

  getDashboardOverview('default').then(s => { _stats = s; container.innerHTML = render(store) }).catch(() => {})
  listWorkspaces().then(wsList => {
    if (wsList && wsList.length > 1) {
      const el = document.querySelector('.welcome-stats-row')
      if (el) {
        el.insertAdjacentHTML('afterend', `<section class="welcome-section"><h2 class="welcome-section-title">Workspaces</h2><div style="display:flex;gap:8px;flex-wrap:wrap">${wsList.map(w => `<span style="padding:4px 12px;border-radius:6px;background:var(--card-bg);border:1px solid var(--border);font-size:12px">${escHtml(w.name || w.id)}</span>`).join('')}</div></section>`)
      }
    }
  }).catch(() => {})
  getActivity('default', 10).then(entries => {
    const el = document.querySelector('.welcome-stats-row')
    if (el && entries.length) {
      const html = entries.slice(0, 3).map(e =>
        `<div style="font-size:11px;color:var(--muted);padding:2px 0">${e.action || e.type}: ${e.details?.title || e.entity_id || ''}</div>`
      ).join('')
      el.insertAdjacentHTML('afterend', `<section class="welcome-section"><h2 class="welcome-section-title">Recent Activity</h2>${html}</section>`)
    }
  }).catch(() => {})

  function handleClick(e) {
    const actionBtn = e.target.closest('[data-action]')
    if (!actionBtn) {
      const recentItem = e.target.closest('[data-page-id]')
      if (recentItem && router?.navigate) {
        const pageId = recentItem.dataset.pageId
        const page = store?.state?.pages?.find(p => p.id === pageId)
        router.navigate('editor', { pageId, pageTitle: page?.title || 'Untitled' })
      }
      return
    }

    const action = actionBtn.dataset.action
    if (!router?.navigate) return

    if (action === 'new-page') {
      router.createPage('Untitled').then(page => {
        if (page) router.openEditor(page.id, page.title)
      })
    } else {
      router.navigate(action)
    }
  }

  container.addEventListener('click', handleClick)

  _cleanup = () => {
    container.removeEventListener('click', handleClick)
  }
}

export function unmount() {
  if (_cleanup) {
    _cleanup()
    _cleanup = null
  }
}
