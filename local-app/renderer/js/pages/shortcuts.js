import { escHtml } from '../lib/helpers.js'

let _cleanup = null

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { keys: '⌘K', label: 'Command Palette', desc: 'Open the command palette to search pages and actions' },
      { keys: '⌘P', label: 'Search Pages', desc: 'Open global search to find pages across the workspace' },
      { keys: '⌘N', label: 'New Page', desc: 'Create a new blank page and open it in the editor' },
      { keys: '⌘\\', label: 'Toggle Sidebar', desc: 'Show or hide the sidebar navigation' },
      { keys: '⌘⌥P', label: 'Toggle Page Info', desc: 'Show or hide the right panel with page details' },
      { keys: '⌘⇧H', label: 'Go Home', desc: 'Navigate to the home/welcome page' },
      { keys: '⌘⇧T', label: 'Open Trash', desc: 'View recently deleted pages' },
      { keys: '⌘⇧S', label: 'Keyboard Shortcuts', desc: 'Open this keyboard shortcuts reference page' },
    ]
  },
  {
    category: 'Editing',
    items: [
      { keys: '⌘B', label: 'Bold', desc: 'Bold the selected text' },
      { keys: '⌘I', label: 'Italic', desc: 'Italicize the selected text' },
      { keys: '⌘U', label: 'Underline', desc: 'Underline the selected text' },
      { keys: '⌘⇧X', label: 'Strikethrough', desc: 'Strikethrough the selected text' },
      { keys: '⌘Z', label: 'Undo', desc: 'Undo the last action' },
      { keys: '⌘⇧Z', label: 'Redo', desc: 'Redo the last undone action' },
      { keys: '⌘⇧K', label: 'Add Link', desc: 'Insert or edit a hyperlink on the selected text' },
      { keys: '⌘⇧7', label: 'Numbered List', desc: 'Toggle numbered list formatting' },
      { keys: '⌘⇧8', label: 'Bullet List', desc: 'Toggle bullet list formatting' },
      { keys: '⌘]', label: 'Indent', desc: 'Increase the indentation level' },
      { keys: '⌘[', label: 'Outdent', desc: 'Decrease the indentation level' },
      { keys: '⌘⇧M', label: 'Highlight', desc: 'Toggle highlight/marker on the selected text' },
    ]
  },
  {
    category: 'Block Operations',
    items: [
      { keys: '⌘D', label: 'Duplicate Block', desc: 'Duplicate the current editor block' },
      { keys: '⌘⇧↑', label: 'Move Block Up', desc: 'Move the current editor block upward' },
      { keys: '⌘⇧↓', label: 'Move Block Down', desc: 'Move the current editor block downward' },
      { keys: 'Enter', label: 'New Block', desc: 'Create a new block below the current one' },
      { keys: 'Backspace', label: 'Delete Block', desc: 'Delete the current block when empty' },
      { keys: '⌘Enter', label: 'Finish Editing', desc: 'Complete editing and submit the current form or action' },
    ]
  },
  {
    category: 'Block Navigation',
    items: [
      { keys: '↑', label: 'Previous Block', desc: 'Move focus to the previous editor block' },
      { keys: '↓', label: 'Next Block', desc: 'Move focus to the next editor block' },
      { keys: 'Tab', label: 'Next Table Cell', desc: 'Move to the next cell in a table' },
      { keys: '⇧Tab', label: 'Previous Table Cell', desc: 'Move to the previous cell in a table' },
    ]
  },
  {
    category: 'Search & Find',
    items: [
      { keys: '⌘F', label: 'Find in Page', desc: 'Open the find bar to search within the current page' },
      { keys: '⌘⇧F', label: 'Find & Replace', desc: 'Open find and replace in the current page' },
      { keys: '/', label: 'Slash Command Menu', desc: 'Open the block type command menu in the editor' },
      { keys: '@', label: 'Page Mention', desc: 'Trigger page mention autocomplete in the editor' },
    ]
  },
  {
    category: 'Application',
    items: [
      { keys: '⌘⇧L', label: 'Toggle Theme', desc: 'Switch between light, dark, and other themes' },
      { keys: '⌘,', label: 'Open Settings', desc: 'Open the settings and preferences page' },
      { keys: '⌘⇧P', label: 'Open Profile', desc: 'Open your user profile panel' },
      { keys: '⌘/', label: 'Shortcuts Overlay', desc: 'Show the keyboard shortcuts modal overlay' },
      { keys: 'Esc', label: 'Close Modal / Menu', desc: 'Close any open modal, menu, or panel' },
      { keys: 'Esc Esc', label: 'Zen Mode', desc: 'Double-press Escape to enter or exit focus mode' },
      { keys: '⌘⇧N', label: 'Go to Tags', desc: 'Navigate to the tags management page' },
      { keys: '⌘⇧G', label: 'Go to Graph', desc: 'Navigate to the knowledge graph view' },
    ]
  },
  {
    category: 'Miscellaneous',
    items: [
      { keys: '⌘⇧C', label: 'Copy as Markdown', desc: 'Copy the current selection as Markdown text' },
      { keys: '⌘⇧V', label: 'Paste as Plain Text', desc: 'Paste without any formatting' },
      { keys: '⌘⇧D', label: 'Toggle DevTools', desc: 'Open or close Chrome Developer Tools' },
      { keys: '⌘⇧E', label: 'Go to Entities', desc: 'Navigate to the entities management page' },
      { keys: '⌘⇧O', label: 'Toggle Outline', desc: 'Show or hide the page outline / table of contents' },
      { keys: '⌘⇧I', label: 'Import Content', desc: 'Open the import dialog to bring in external content' },
    ]
  },
]

export function render() {
  const allHtml = SHORTCUTS.map(group => `
    <div class="sc-group" data-category="${escHtml(group.category)}">
      <h2 class="sc-group-title">${escHtml(group.category)}</h2>
      <div class="sc-group-items">
        ${group.items.map(item => `
          <div class="sc-item">
            <div class="sc-item-keys">
              ${item.keys.split(' ').map(k => `<kbd>${escHtml(k)}</kbd>`).join('')}
            </div>
            <div class="sc-item-info">
              <div class="sc-item-label">${escHtml(item.label)}</div>
              <div class="sc-item-desc">${escHtml(item.desc)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')

  return `<div class="shortcuts-page">
    <div class="sc-header">
      <h1 class="sc-header-title">Keyboard Shortcuts</h1>
      <p class="sc-header-sub">${SHORTCUTS.reduce((s, g) => s + g.items.length, 0)} shortcuts to help you work faster</p>
    </div>
    <div class="sc-search-wrap">
      <svg class="sc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="sc-search" id="scSearch" type="text" placeholder="Search shortcuts\u2026" autofocus spellcheck="false" />
    </div>
    <div class="sc-groups" id="scGroups">${allHtml}</div>
  </div>`
}

export function mount() {
  const input = document.getElementById('scSearch')
  if (!input) return

  function filter(q) {
    const lower = (q || '').toLowerCase().trim()
    const groups = document.querySelectorAll('.sc-group')
    let visibleCount = 0
    groups.forEach(group => {
      const items = group.querySelectorAll('.sc-item')
      let groupMatch = false
      items.forEach(item => {
        const label = item.querySelector('.sc-item-label')?.textContent?.toLowerCase() || ''
        const desc = item.querySelector('.sc-item-desc')?.textContent?.toLowerCase() || ''
        const keys = item.querySelector('.sc-item-keys')?.textContent?.toLowerCase() || ''
        const match = !lower || label.includes(lower) || desc.includes(lower) || keys.includes(lower)
        item.style.display = match ? '' : 'none'
        if (match) groupMatch = true
      })
      group.style.display = groupMatch ? '' : 'none'
      if (groupMatch) visibleCount++
    })
    const header = document.querySelector('.sc-header-sub')
    if (header) {
      const total = document.querySelectorAll('.sc-item').length
      const visible = document.querySelectorAll('.sc-item[style*="display: none"]')
      const showing = total - visible.length
      header.textContent = showing + ' of ' + total + ' shortcuts'
    }
  }

  input.addEventListener('input', () => filter(input.value))
  filter('')

  _cleanup = () => {
    input.removeEventListener('input', () => filter(input.value))
  }
}

export function unmount() {
  if (_cleanup) {
    _cleanup()
    _cleanup = null
  }
}
