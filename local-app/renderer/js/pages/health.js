import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { getHealthScore, recalculateHealth, getDuplicates, getOrphans, getStale } from '../lib/api.js'

let _store = null
let _cleanup = null
let _healthData = null
let _activeTab = 'overview'
let _extraData = { duplicates: [], orphans: [], stale: [] }

async function computeHealth(store) {
  try {
    const data = await getHealthScore('default')
    _healthData = {
      score: data.health_score || data.score || 0,
      pageCount: data.total_entities || store.state.pages.length,
      tagCount: store.state.tags.length,
      untitled: data.report?.duplicates || [],
      emptyPages: [],
      stalePages: data.report?.stale || [],
      duplicateCount: data.duplicate_count || 0,
      orphanCount: data.orphan_count || 0,
      staleCount: data.stale_count || 0,
    }
  } catch {
    const { pages, tags } = store.state
    let deductions = 0
    const untitled = pages.filter(p => !p.title || p.title.trim() === '' || p.title.trim() === 'Untitled')
    const emptyPages = pages.filter(p => !p.blocks || p.blocks.length === 0)
    const threeMonthsAgo = Date.now() - 90 * 86400000
    const stalePages = pages.filter(p => new Date(p.updatedAt).getTime() < threeMonthsAgo)
    deductions += Math.min(untitled.length * 8, 25)
    deductions += Math.min(emptyPages.length * 5, 20)
    deductions += Math.min(stalePages.length * 3, 15)
    deductions += pages.length === 0 ? 30 : 0
    deductions += tags.length === 0 ? 10 : 0
    _healthData = {
      score: Math.max(0, Math.min(100, 100 - deductions)),
      untitled, emptyPages, stalePages,
      pageCount: pages.length, tagCount: tags.length,
      duplicateCount: 0, orphanCount: 0, staleCount: stalePages.length,
    }
  }
  return _healthData
}

async function fetchExtraData() {
  try { _extraData.duplicates = await getDuplicates('default') || [] } catch { _extraData.duplicates = [] }
  try { _extraData.orphans = await getOrphans('default') || [] } catch { _extraData.orphans = [] }
  try { _extraData.stale = await getStale('default') || [] } catch { _extraData.stale = [] }
}

function renderGauge(score) {
  const r = 72
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const c1 = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const c2 = score >= 80 ? '#06b6d4' : score >= 50 ? '#f97316' : '#ef4444'
  return `<svg class="health-gauge-svg" viewBox="0 0 180 180">
    <defs>
      <linearGradient id="gaugeSpin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"><animateTransform attributeName="gradientTransform" type="rotate" from="0 0 0" to="360 0 0" dur="4s" repeatCount="indefinite"/></stop>
        <stop offset="100%" stop-color="${c2}"><animateTransform attributeName="gradientTransform" type="rotate" from="0 0 0" to="360 0 0" dur="4s" repeatCount="indefinite"/></stop>
      </linearGradient>
    </defs>
    <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--border)" stroke-width="10" stroke-linecap="round" transform="rotate(-90 90 90)" />
    <circle cx="90" cy="90" r="${r}" fill="none" stroke="url(#gaugeSpin)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 90 90)" style="transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" />
    <text x="90" y="86" text-anchor="middle" fill="var(--foreground)" font-size="36" font-weight="700" font-family="Geist,sans-serif">${score}</text>
    <text x="90" y="110" text-anchor="middle" fill="var(--muted)" font-size="11" font-weight="500" font-family="Geist,sans-serif" letter-spacing="1">Health</text>
  </svg>`
}

function renderMetricCard(icon, label, value, desc, color) {
  return `<div class="health-card">
    <div class="health-card-header">
      <div class="health-card-icon" style="color:${color}">${icon}</div>
      <div class="health-card-value" style="color:${color}">${value}</div>
    </div>
    <div class="health-card-label">${label}</div>
    <div class="health-card-desc">${desc}</div>
  </div>`
}

function renderPageRow(p) {
  const title = (p.title || p.name || '').trim() || 'Untitled'
  const date = new Date(p.updatedAt || p.updated_at || Date.now())
  const diff = Date.now() - date.getTime()
  let ago = diff < 3600000 ? Math.floor(diff / 60000) + 'm ago'
    : diff < 86400000 ? Math.floor(diff / 3600000) + 'h ago'
    : diff < 604800000 ? Math.floor(diff / 86400000) + 'd ago'
    : date.toLocaleDateString()
  return `<div class="health-entity-row">
    <span class="health-entity-icon" style="background:var(--card-bg)">📄</span>
    <span class="health-entity-name">${escHtml(title)}</span>
    <span class="health-entity-date">${ago}</span>
    <button class="health-view-btn micro-press" data-action="open-page" data-id="${escHtml(p.id || p.entity_id)}" title="Open page">Open</button>
  </div>`
}

function renderOverview(data) {
  const ambientColor = data.score >= 80 ? '#22c55e' : data.score >= 50 ? '#eab308' : '#ef4444'

  const untitledHtml = data.untitled.length > 0
    ? data.untitled.map(p => renderPageRow(p)).join('')
    : '<div class="health-empty">No untitled pages — great naming!</div>'

  const staleHtml = data.stalePages.length > 0
    ? data.stalePages.map(p => renderPageRow(p)).join('')
    : '<div class="health-empty">No stale pages — everything is fresh!</div>'

  const orphanHtml = data.orphanCount > 0
    ? `<div class="health-alert-card">
        <div class="health-alert-head">
          <span class="health-alert-icon">🔗</span>
          <div>
            <div class="health-alert-title">Orphaned Entities</div>
            <div class="health-alert-count">${data.orphanCount} entities with no relations</div>
          </div>
        </div>
      </div>`
    : ''

  return `<div class="health-overview">
    <div class="health-gauge-wrap" style="position:relative">
      <div class="health-gauge-ambient" style="background:radial-gradient(circle at center, ${ambientColor}33, transparent 70%)"></div>
      <div class="health-gauge-fill">${renderGauge(data.score)}</div>
    </div>
    <div class="health-stats">
      ${renderMetricCard('📄', 'Total Pages', data.pageCount, 'Documents created', '#3b82f6')}
      ${renderMetricCard('🏷️', 'Tags', data.tagCount, 'Categorization labels', '#06b6d4')}
      ${renderMetricCard('⚠️', 'Duplicates', data.duplicateCount, 'Entities with identical titles', '#eab308')}
      ${renderMetricCard('🔗', 'Orphans', data.orphanCount, 'Entities with no relations', '#8b5cf6')}
    </div>
  </div>

  <div class="health-alerts">
    <h2 class="health-section-title">Alerts &amp; Actions</h2>
    <div class="health-alert-grid">

      <div class="health-alert-card${data.untitled.length === 0 ? ' health-alert--ok' : ''}">
        <div class="health-alert-head">
          <span class="health-alert-icon">${data.untitled.length === 0 ? '✅' : '⚠️'}</span>
          <div>
            <div class="health-alert-title">Untitled Pages</div>
            <div class="health-alert-count">${data.untitled.length > 0 ? data.untitled.length + ' page' + (data.untitled.length === 1 ? '' : 's') + ' without a title' : 'All pages have titles'}</div>
          </div>
        </div>
        <div class="health-alert-body">${untitledHtml}</div>
      </div>

      <div class="health-alert-card${data.stalePages.length === 0 ? ' health-alert--ok' : ''}">
        <div class="health-alert-head">
          <span class="health-alert-icon">${data.stalePages.length === 0 ? '✅' : '⏳'}</span>
          <div>
            <div class="health-alert-title">Stale Pages</div>
            <div class="health-alert-count">${data.stalePages.length > 0 ? data.stalePages.length + ' page' + (data.stalePages.length === 1 ? '' : 's') + ' untouched for 90+ days' : 'Everything up to date'}</div>
          </div>
        </div>
        <div class="health-alert-body">${staleHtml}</div>
      </div>

      ${orphanHtml}

    </div>
  </div>`
}

function renderTabList(label, items, icon) {
  if (!items || !items.length) return `<div class="health-empty" style="padding:32px">No ${label.toLowerCase()} found</div>`
  return items.map(p => renderPageRow(p)).join('')
}

export function render(store) {
  const data = _healthData || { score: 0, pageCount: 0, tagCount: 0, untitled: [], emptyPages: [], stalePages: [], duplicateCount: 0, orphanCount: 0, staleCount: 0 }
  const e = _extraData

  const tabs = ['overview', 'duplicates', 'orphans', 'stale']
  const tabHtml = tabs.map(t => `<button class="gov-tab${_activeTab === t ? ' active' : ''}" data-gov-tab="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')

  let contentHtml = ''
  if (_activeTab === 'overview') contentHtml = renderOverview(data)
  else if (_activeTab === 'duplicates') contentHtml = `<h2 class="health-section-title">Duplicate Entities</h2><div class="health-alert-grid"><div class="health-alert-card">${renderTabList('Duplicates', e.duplicates, '⚠️')}</div></div>`
  else if (_activeTab === 'orphans') contentHtml = `<h2 class="health-section-title">Orphaned Entities</h2><div class="health-alert-grid"><div class="health-alert-card">${renderTabList('Orphans', e.orphans, '🔗')}</div></div>`
  else if (_activeTab === 'stale') contentHtml = `<h2 class="health-section-title">Stale Entities</h2><div class="health-alert-grid"><div class="health-alert-card">${renderTabList('Stale', e.stale, '⏳')}</div></div>`

  return `<div class="health-page">
    <div class="health-header">
      <div class="health-header-text">
        <h1 class="health-title">Workspace Health</h1>
        <p class="health-subtitle">Governance dashboard for your knowledge base</p>
      </div>
      <button class="health-recalc-btn" data-action="recalc-health" title="Recalculate health score">Recalculate</button>
    </div>

    <div class="gov-tabs">${tabHtml}</div>

    ${contentHtml}
  </div>`
}

export function mount(store, router) {
  _store = store
  const main = $id('mainContent')

  Promise.all([computeHealth(store), fetchExtraData()]).then(() => {
    main.innerHTML = render(store)
    attachEvents()
  })

  function attachEvents() {
    if (_cleanup) { _cleanup(); _cleanup = null }
    const clickHandler = async (e) => {
      const btn = e.target.closest('[data-action="open-page"]')
      if (btn) {
        const id = btn.dataset.id
        const page = store.state.pages.find(p => p.id === id)
        if (page && router) router.navigate('editor', { pageId: page.id, pageTitle: page.title })
        else if (router) router.navigate('editor', { pageId: id })
      }
      const recalc = e.target.closest('[data-action="recalc-health"]')
      if (recalc) {
        try { await recalculateHealth('default') } catch {}
        await Promise.all([computeHealth(store).then(() => {}), fetchExtraData()])
        main.innerHTML = render(store)
        attachEvents()
      }
      const tab = e.target.closest('[data-gov-tab]')
      if (tab) {
        _activeTab = tab.dataset.govTab
        main.innerHTML = render(store)
        attachEvents()
      }
    }
    main.addEventListener('click', clickHandler)
    _cleanup = () => main.removeEventListener('click', clickHandler)
  }
}

export function unmount() {
  if (_cleanup) { _cleanup(); _cleanup = null }
  _store = null
}
