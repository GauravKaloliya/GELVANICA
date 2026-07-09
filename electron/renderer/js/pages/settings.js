import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { exportBackup, importBackup } from '../lib/api.js'

let _store = null
let _unsub = null
let _cleanup = null

const THEMES = [
  { id: 'light', label: 'Light', swatch: '#f8f7f4', border: '#d1d1c8', previewBg: '#f8f7f4', previewFg: '#1a1a1a', previewAccent: '#2563eb' },
  { id: 'dark', label: 'Dark', swatch: '#0e1117', border: '#1f232c', previewBg: '#0e1117', previewFg: '#f0f0ea', previewAccent: '#60a5fa' },
  { id: 'sepia', label: 'Sepia', swatch: '#fbf3e8', border: '#d4c5a9', previewBg: '#fbf3e8', previewFg: '#433422', previewAccent: '#7d6e58' },
  { id: 'high-contrast', label: 'High Contrast', swatch: '#000000', border: '#ffffff', previewBg: '#000000', previewFg: '#ffffff', previewAccent: '#ffffff' },
  { id: 'ocean', label: 'Ocean', swatch: '#0b1a2a', border: '#1a3a5c', previewBg: '#0f172a', previewFg: '#e2e8f0', previewAccent: '#38bdf8' },
  { id: 'midnight', label: 'Midnight', swatch: '#07080d', border: '#1a1d2e', previewBg: '#0d0a1a', previewFg: '#e8e0f0', previewAccent: '#c084fc' },
]

function renderThemeOption(t, current) {
  const isDefault = t.id === 'dark'
  return `<button class="settings-theme-btn${t.id === current ? ' active' : ''}" data-theme="${t.id}" title="Apply theme">
    <span class="settings-theme-swatch" style="background:${t.swatch};border-color:${t.border}"></span>
    <span class="settings-theme-label">${t.label}</span>
    ${isDefault ? '<span class="settings-theme-default-badge">Default</span>' : ''}
    ${t.id === current ? '<span class="settings-theme-check">✓</span>' : ''}
    <div class="settings-theme-preview" style="background:${t.previewBg};color:${t.previewFg};--p-accent:${t.previewAccent}">
      <div class="stp-bar" style="background:${t.previewBg};border-bottom:1px solid ${t.border}"><span style="background:${t.previewAccent}"></span></div>
      <div class="stp-side" style="background:${t.previewBg};border-right:1px solid ${t.border}"></div>
      <div class="stp-content">
        <div class="stp-line" style="background:${t.previewFg};opacity:0.8"></div>
        <div class="stp-line" style="background:${t.previewFg};opacity:0.4;width:60%"></div>
        <div class="stp-line" style="background:${t.previewAccent};opacity:0.3;width:40%"></div>
      </div>
      <div class="settings-theme-preview-label">${t.label}</div>
    </div>
  </button>`
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function renderToggle(key, label, desc, s) {
  const val = s[key]
  return `<div class="settings-option">
    <div class="settings-option-info">
      <div class="settings-option-label">${label}</div>
      ${desc ? '<div class="settings-option-desc">' + desc + '</div>' : ''}
    </div>
    <label class="settings-toggle">
      <input type="checkbox" data-setting-key="${key}" ${val ? 'checked' : ''} />
      <span class="settings-toggle-slider"></span>
    </label>
  </div>`
}

function renderSelect(key, label, desc, options, s) {
  const val = s[key]
  return `<div class="settings-option">
    <div class="settings-option-info">
      <div class="settings-option-label">${label}</div>
      ${desc ? '<div class="settings-option-desc">' + desc + '</div>' : ''}
    </div>
    <select class="settings-select" data-setting-key="${key}">
      ${options.map(o => '<option value="' + o.val + '"' + (String(val) === String(o.val) ? ' selected' : '') + '>' + o.label + '</option>').join('')}
    </select>
  </div>`
}

function renderSection(id, icon, title, desc, content) {
  return `<div class="settings-section" data-section="${id}">
    <div class="settings-section-header">
      <span class="settings-section-icon settings-section-icon--svg">${icon}</span>
      <div>
        <h2 class="settings-section-title">${title}</h2>
        <p class="settings-section-desc">${desc}</p>
      </div>
    </div>
    <div class="settings-section-body">${content}</div>
  </div>`
}

export function render(store) {
  const s = store.state
  const theme = s.theme || 'dark'
  const themeOptions = THEMES.map(t => renderThemeOption(t, theme)).join('')

  const backupLocDisplay = s.backupLocation || 'Not set'
  const backupLocShort = s.backupLocation ? s.backupLocation.split('/').slice(-2).join('/') : 'Not set'

  return `<div class="settings-page">
    <div class="settings-header">
      <h1 class="settings-title">Settings</h1>
      <p class="settings-subtitle">Configure your workspace preferences</p>
    </div>
    <div class="settings-founder-section">
      <div class="settings-founder-content">
        <div class="settings-founder-avatar">
          <img src="logo/founder.jpeg" alt="Gaurav Kaloliya" />
        </div>
        <div class="settings-founder-info">
          <div class="settings-founder-name">CREATED BY</div>
          <div class="settings-founder-title">GAURAV KALOLIYA</div>
          <div class="settings-founder-desc">FOUNDER & CREATOR</div>
          <div class="settings-founder-quote">"Gnovium was born from a simple belief — that knowledge should behave like a living system, not a graveyard of documents. Every feature, every endpoint, every line of code was built to make that vision real."</div>
          <div class="settings-founder-links">
            <a href="https://www.linkedin.com/in/gaurav-kaloliya-b44569417/" target="_blank">LinkedIn</a>
            <a href="https://github.com/GauravKaloliya" target="_blank">GitHub</a>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-sections">
      ${renderSection('appearance',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 9v6M9 12h6"/></svg>',
        'Appearance', 'Choose your theme and visual style',
        '<div class="settings-theme-grid">' + themeOptions + '</div>')}

      ${renderSection('privacy',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        'Privacy & Security', 'Control data privacy and local operation',
        renderToggle('localOnly', 'Local-only mode', 'When enabled, all network requests are blocked. No data leaves your device.', s))}

      ${renderSection('backup',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        'Backup', 'Configure automatic backups and export options',
        renderSelect('autoBackupInterval', 'Auto-backup interval', 'Regularly create workspace backups', [
          { val: 'never', label: 'Never' },
          { val: 'hourly', label: 'Every hour' },
          { val: 'daily', label: 'Daily' },
          { val: 'weekly', label: 'Weekly' },
        ], s) +
        '<div class="settings-option">' +
          '<div class="settings-option-info">' +
            '<div class="settings-option-label">Backup location</div>' +
            '<div class="settings-option-desc">Directory where backups are saved</div>' +
          '</div>' +
          '<button class="settings-action-btn" data-action="pick-backup-loc" title="Choose folder">' + escHtml(backupLocShort) + '</button>' +
        '</div>' +
        renderToggle('includeAttachmentsInExport', 'Include attachments in export', 'Includes uploaded files and images when exporting data.', s))}

      ${renderSection('navigation',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'Navigation & Sidebar', 'Customize the sidebar and page tree',
        renderToggle('showPageIcons', 'Show page icons in sidebar', 'Displays emoji icons next to page names in the sidebar tree.', s))}

      ${renderSection('editor',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        'Editor', 'Configure the block editor behavior',
        renderToggle('highlightSearchMatches', 'Highlight search matches in editor', 'When searching, matching text is highlighted within the editor content.', s) +
        renderToggle('showWordCount', 'Show word count in status bar', 'Displays a live word count in the editor status bar.', s) +
        renderSelect('autosaveInterval', 'Autosave interval', 'How often your changes are automatically saved', [
          { val: 1000, label: '1 second' },
          { val: 3000, label: '3 seconds' },
          { val: 5000, label: '5 seconds' },
          { val: 10000, label: '10 seconds' },
        ], s))}

      ${renderSection('history',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'History & Versioning', 'Manage page history and snapshots',
        renderToggle('autoCreateSnapshots', 'Auto-create snapshots on page close', 'Automatically creates a named snapshot every time you close a page.', s) +
        renderSelect('snapshotRetentionDays', 'Snapshot retention period', 'How long snapshots are kept before being pruned', [
          { val: 7, label: '7 days' },
          { val: 30, label: '30 days' },
          { val: 90, label: '90 days' },
          { val: 0, label: 'Forever' },
        ], s))}

      ${renderSection('trash',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        'Trash', 'Configure trash and deletion behavior',
        renderSelect('autoEmptyTrashDays', 'Auto-empty trash interval', 'Automatically permanently deletes trashed items after the specified period', [
          { val: 0, label: 'Never' },
          { val: 7, label: '7 days' },
          { val: 30, label: '30 days' },
          { val: 90, label: '90 days' },
        ], s) +
        renderToggle('confirmBeforeDelete', 'Confirm before permanently deleting', 'Shows a confirmation dialog before permanently deleting items from trash.', s))}

      ${renderSection('ai',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a10 10 0 0 1 10 10c0 2.5-1 5-2.5 6.5L17 16"/><path d="M2 12a10 10 0 0 1 10-10"/><path d="M2 12a10 10 0 0 0 10 10"/><path d="M12 22v-6"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
        'AI Integration', 'Connect AI services for smart suggestions, auto-tagging, and semantic search',
        '<div class="settings-ai-cards">' +
          '<div class="settings-ai-card">' +
            '<div class="settings-ai-card-header">' +
              '<span class="settings-ai-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3"/><path d="M12 18a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3"/><path d="M5 12h14"/></svg></span>' +
              '<div><div class="settings-ai-card-title">Smart Suggestions</div><div class="settings-ai-card-desc">AI-powered entity linking and block suggestions as you type</div></div>' +
            '</div>' +
            '<div class="settings-ai-card-status"><span class="settings-status-dot settings-status-dot--offline"></span><span>Not connected</span></div>' +
            '<button class="settings-ai-connect-btn" data-action="ai-connect" title="Configure AI provider">Configure Provider</button>' +
          '</div>' +
          '<div class="settings-ai-card">' +
            '<div class="settings-ai-card-header">' +
              '<span class="settings-ai-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h6"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg></span>' +
              '<div><div class="settings-ai-card-title">Auto Tagging</div><div class="settings-ai-card-desc">Automatically classify and tag entities based on content</div></div>' +
            '</div>' +
            '<div class="settings-ai-card-status"><span class="settings-status-dot settings-status-dot--offline"></span><span>Requires AI provider</span></div>' +
            '<button class="settings-ai-connect-btn" data-action="ai-connect" title="Configure AI provider">Configure Provider</button>' +
          '</div>' +
          '<div class="settings-ai-card">' +
            '<div class="settings-ai-card-header">' +
              '<span class="settings-ai-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg></span>' +
              '<div><div class="settings-ai-card-title">Semantic Search</div><div class="settings-ai-card-desc">Natural language search across all pages and entities</div></div>' +
            '</div>' +
            '<div class="settings-ai-card-status"><span class="settings-status-dot settings-status-dot--offline"></span><span>Requires AI provider</span></div>' +
            '<button class="settings-ai-connect-btn" data-action="ai-connect" title="Configure AI provider">Configure Provider</button>' +
          '</div>' +
        '</div>')}

      ${renderSection('data',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 7l-7 5-7-5"/><path d="M19 17l-7-5-7 5"/><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
        'Data Management', 'Export and manage your workspace data',
        '<div class="settings-data-cards">' +
          '<div class="settings-data-card">' +
            '<div class="settings-data-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>' +
            '<div class="settings-data-info"><div class="settings-data-title">Export All Data</div><div class="settings-data-desc">Download your entire workspace as JSON</div></div>' +
            '<button class="settings-action-btn" data-action="export-all" title="Export all data as JSON">Export JSON</button>' +
          '</div>' +
          '<div class="settings-data-card">' +
            '<div class="settings-data-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>' +
            '<div class="settings-data-info"><div class="settings-data-title">Import Data</div><div class="settings-data-desc">Restore from a previously exported JSON backup</div></div>' +
            '<button class="settings-action-btn" data-action="import-data" title="Import data from JSON">Import JSON</button>' +
          '</div>' +
          '<div class="settings-data-card">' +
            '<div class="settings-data-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 12h6"/><path d="M12 9v6"/></svg></div>' +
            '<div class="settings-data-info"><div class="settings-data-title">Export as Markdown</div><div class="settings-data-desc">Export all pages as Markdown files</div></div>' +
            '<button class="settings-action-btn" data-action="export-markdown" title="Export as Markdown">Export MD</button>' +
          '</div>' +
          '<div class="settings-data-card">' +
            '<div class="settings-data-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div>' +
            '<div class="settings-data-info"><div class="settings-data-title">Storage Usage</div><div class="settings-data-desc">Data stored in local SQLite database</div></div>' +
            '<button class="settings-action-btn settings-action-btn--danger" data-action="clear-data" title="Clear all data">Clear All Data</button>' +
          '</div>' +
        '</div>')}

      ${renderSection('about',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        'About', 'Version information and resources',
        '<div class="settings-about">' +
          '<div class="settings-about-row"><span class="settings-about-key">Version</span><span class="settings-about-val">0.1.0</span></div>' +
          '<div class="settings-about-row"><span class="settings-about-key">Engine</span><span class="settings-about-val">Gnovium Engine</span></div>' +
        '</div>')}
    </div>
  </div>`
}

export function mount(store) {
  _store = store

  const main = $id('mainContent')

  function attachEvents() {
    if (_cleanup) { _cleanup(); _cleanup = null }

    const clickHandler = (e) => {
      const themeBtn = e.target.closest('[data-theme]')
      if (themeBtn) {
        const t = themeBtn.dataset.theme
        if (t && _store && typeof window.toggleTheme === 'function') {
          _store.setState({ theme: t })
          const html = document.documentElement
          html.classList.remove('light','dark','sepia','high-contrast','ocean','midnight')
          html.classList.add('theme-transitioning', t)
          localStorage.setItem('gnovium-theme', t)
          setTimeout(() => html.classList.remove('theme-transitioning'), 300)
          main.innerHTML = render(_store)
          attachEvents()
        }
        return
      }

      const aiBtn = e.target.closest('[data-action="ai-connect"]')
      if (aiBtn) {
        const modal = document.createElement('div')
        modal.className = 'settings-modal-overlay'
        modal.innerHTML = `<div class="settings-modal">
          <div class="settings-modal-header">
            <h3 class="settings-modal-title">AI Provider Setup</h3>
            <button class="settings-modal-close" data-action="close-modal" title="Close">✕</button>
          </div>
          <div class="settings-modal-body">
            <p class="settings-modal-desc">Configure your AI provider to enable smart suggestions, auto-tagging, and semantic search.</p>
            <div class="settings-modal-field">
              <label class="settings-modal-label">Provider</label>
              <select class="settings-modal-input">
                <option value="">Select a provider...</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </div>
            <div class="settings-modal-field">
              <label class="settings-modal-label">API Key</label>
              <input class="settings-modal-input" type="password" placeholder="sk-..." />
            </div>
            <button class="settings-action-btn" data-action="save-ai-config" title="Save configuration" style="width:100%;margin-top:8px">Save Configuration</button>
          </div>
        </div>`
        document.body.appendChild(modal)
        requestAnimationFrame(() => modal.classList.add('open'))
        return
      }

      const closeModal = e.target.closest('[data-action="close-modal"]')
      if (closeModal) {
        const modal = closeModal.closest('.settings-modal-overlay')
        if (modal) {
          modal.classList.remove('open')
          setTimeout(() => modal.remove(), 300)
        }
        return
      }

      const saveAi = e.target.closest('[data-action="save-ai-config"]')
      if (saveAi) {
        const modal = saveAi.closest('.settings-modal-overlay')
        if (modal) {
          modal.classList.remove('open')
          setTimeout(() => modal.remove(), 300)
        }
        return
      }

      const exportBtn = e.target.closest('[data-action="export-all"]')
      if (exportBtn) {
        exportBackup('default').then(resp => {
          const data = resp.data || resp
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `gnovium-export-${new Date().toISOString().slice(0,10)}.json`
          a.click()
          URL.revokeObjectURL(url)
        }).catch(e => { console.error('Export failed:', e); alert('Export failed: ' + e.message) })
        return
      }

      const importBtn = e.target.closest('[data-action="import-data"]')
      if (importBtn) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (ev) => {
          const file = ev.target.files?.[0]
          if (!file) return
          try {
            const text = await file.text()
            const data = JSON.parse(text)
            const payload = data.data || data
            const workspaceId = payload.workspace_id || 'default'
            const result = await importBackup({ workspace_id: workspaceId, ...payload })
            _store.loadTags()
            _store.loadEntities()
            main.innerHTML = render(_store)
            attachEvents()
          } catch (err) {
            alert('Failed to import: ' + err.message)
          }
        }
        input.click()
        return
      }

      const mdBtn = e.target.closest('[data-action="export-markdown"]')
      if (mdBtn) {
        let md = ''
        for (const p of _store.state.pages) {
          md += `# ${p.title}\n\n`
          for (const b of (p.blocks || [])) {
            if (b.type === 'h1') md += `# ${b.content}\n\n`
            else if (b.type === 'h2') md += `## ${b.content}\n\n`
            else if (b.type === 'h3') md += `### ${b.content}\n\n`
            else if (b.type === 'divider') md += `---\n\n`
            else md += `${b.content || ''}\n\n`
          }
        }
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gnovium-pages-${new Date().toISOString().slice(0,10)}.md`
        a.click()
        URL.revokeObjectURL(url)
        return
      }

      const clearBtn = e.target.closest('[data-action="clear-data"]')
      if (clearBtn) {
        const modal = document.createElement('div')
        modal.className = 'settings-modal-overlay'
        modal.innerHTML = `<div class="settings-modal settings-modal--danger">
          <div class="settings-modal-header">
            <h3 class="settings-modal-title">Clear All Data?</h3>
            <button class="settings-modal-close" data-action="close-modal" title="Close">✕</button>
          </div>
          <div class="settings-modal-body">
            <p class="settings-modal-desc">This will permanently delete all entities, tags, relations, and pages. This action cannot be undone.</p>
            <div class="settings-modal-actions">
              <button class="settings-action-btn" data-action="close-modal" title="Cancel">Cancel</button>
              <button class="settings-action-btn settings-action-btn--danger" data-action="confirm-clear" title="Delete everything">Delete Everything</button>
            </div>
          </div>
        </div>`
        document.body.appendChild(modal)
        requestAnimationFrame(() => modal.classList.add('open'))
        return
      }

      const confirmClear = e.target.closest('[data-action="confirm-clear"]')
      if (confirmClear) {
        const modal = confirmClear.closest('.settings-modal-overlay')
        if (modal) modal.remove()
        _store.setState({ tags: [], pages: [] })
        _store.saveTags()
        main.innerHTML = render(_store)
        attachEvents()
        return
      }

      /* ── Backup location picker ── */
      const pickLoc = e.target.closest('[data-action="pick-backup-loc"]')
      if (pickLoc) {
        if (window.electron?.selectDirectory) {
          window.electron.selectDirectory().then(dir => {
            if (dir) {
              _store.setState({ backupLocation: dir })
              _store.saveSettings()
              main.innerHTML = render(_store)
              attachEvents()
            }
          })
        } else {
          const dir = prompt('Enter full backup directory path:')
          if (dir) {
            _store.setState({ backupLocation: dir })
            _store.saveSettings()
            main.innerHTML = render(_store)
            attachEvents()
          }
        }
        return
      }

    }

    /* ── Setting change handler (toggles, selects) ── */
    const settingChangeHandler = (e) => {
      const el = e.target
      const key = el.dataset.settingKey
      if (!key) return
      let val
      if (el.type === 'checkbox') {
        val = el.checked
      } else if (el.tagName === 'SELECT') {
        val = el.value
        if (!isNaN(Number(val))) val = Number(val)
      }
      _store.setState({ [key]: val })
      _store.saveSettings()

      /* ── Apply settings immediately ── */
      if (key === 'localOnly') {
        applyLocalOnly(val)
      }
      if (key === 'autosaveInterval') {
        window.__autosaveInterval = val
        if (window.__restartAutosave) window.__restartAutosave()
      }
      if (key === 'showWordCount') {
        const wc = document.getElementById('pageWordCount')
        if (wc) wc.style.display = val ? '' : 'none'
      }
      if (key === 'showPageIcons') {
        document.querySelectorAll('.page-icon').forEach(el => el.style.display = val ? '' : 'none')
        document.querySelectorAll('.page-dot').forEach(el => el.style.display = val ? 'none' : '')
      }
    }

    function applyLocalOnly(enabled) {
      if (enabled) {
        const origFetch = window.fetch
        if (!window.__origFetch) {
          window.__origFetch = origFetch
          window.fetch = function() { return Promise.reject(new Error('Network disabled: Local-only mode')) }
        }
        const origXHR = window.XMLHttpRequest
        if (!window.__origXHR) {
          window.__origXHR = origXHR
          window.XMLHttpRequest = function() {
            const xhr = new origXHR()
            const origOpen = xhr.open
            xhr.open = function() { throw new Error('Network disabled: Local-only mode') }
            return xhr
          }
        }
      } else {
        if (window.__origFetch) {
          window.fetch = window.__origFetch
          window.__origFetch = null
        }
        if (window.__origXHR) {
          window.XMLHttpRequest = window.__origXHR
          window.__origXHR = null
        }
      }
    }

    /* Apply localOnly on mount */
    if (_store.state.localOnly) applyLocalOnly(true)

    /* Apply page icons state on mount */
    setTimeout(() => {
      document.querySelectorAll('.page-icon').forEach(el => el.style.display = _store.state.showPageIcons ? '' : 'none')
      document.querySelectorAll('.page-dot').forEach(el => el.style.display = _store.state.showPageIcons ? 'none' : '')
      const wc = document.getElementById('pageWordCount')
      if (wc) wc.style.display = _store.state.showWordCount ? '' : 'none'
    }, 100)

    main.addEventListener('click', clickHandler)
    main.addEventListener('change', settingChangeHandler)
    document.addEventListener('keydown', keydownHandler)
    _cleanup = () => {
      main.removeEventListener('click', clickHandler)
      main.removeEventListener('change', settingChangeHandler)
      document.removeEventListener('keydown', keydownHandler)
    }
  }

  const keydownHandler = (e) => {
    if (e.key === 'Escape') {
      const modals = $all('.settings-modal-overlay')
      for (const m of modals) {
        m.classList.remove('open')
        setTimeout(() => m.remove(), 300)
      }
    }
  }

  attachEvents()
}

function showToast(msg, type) {
  const t = document.createElement('div')
  t.className = 'undo-toast'
  t.innerHTML = `<span>${escHtml(msg)}</span><button class="undo-toast-close">&times;</button>`
  document.body.appendChild(t)
  requestAnimationFrame(() => t.classList.add('open'))
  t.querySelector('.undo-toast-close').addEventListener('click', () => { t.classList.remove('open'); setTimeout(() => t.remove(), 200) })
  setTimeout(() => { t.classList.remove('open'); setTimeout(() => t.remove(), 200) }, 3000)
}

export function unmount() {
  if (_unsub) { _unsub(); _unsub = null }
  if (_cleanup) { _cleanup(); _cleanup = null }
  _store = null
}
