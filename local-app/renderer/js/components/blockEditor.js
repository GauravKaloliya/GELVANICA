import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { aiQuery, uploadFile as apiUploadFile } from '../lib/api.js'

const HEADING_TYPES = ['h1','h2','h3','h4','h5','h6']
const BASIC_TYPES = ['text', ...HEADING_TYPES, 'quote', 'divider', 'checkbox', 'toggle']
const MEDIA_TYPES = ['code', 'callout', 'image', 'table', 'file', 'columns']

const FONT_FAMILIES = [
  { value: 'Geist, sans-serif', label: 'Geist' },
  { value: 'Geist Mono, monospace', label: 'Geist Mono' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: 'Serif', label: 'Serif' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
]

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]

const TEXT_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#1a1a1a','#6b6b6b','#ffffff']

const BLOCK_HIGHLIGHT_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffd43b','#ff6b6b','#51cf66','#339af0','#cc5de8','#f06595','transparent']

const ALIGN_OPTIONS = [
  { value: 'left', icon: '\u2190', label: 'Left' },
  { value: 'center', icon: '\u2194', label: 'Center' },
  { value: 'right', icon: '\u2192', label: 'Right' },
  { value: 'justify', icon: '\u21AF', label: 'Justify' },
]

export function renderEditor(page, blocks) {
  const created = page.createdAt ? new Date(page.createdAt) : new Date()
  const updated = page.updatedAt ? new Date(page.updatedAt) : new Date()
  const blocksList = (blocks || []).slice()
  if (blocksList.length === 0) blocksList.push({ type: 'text', content: '', id: `b${Date.now()}`, meta: {}, checked: false, children: [] })
  const blockCount = blocksList.length
  const blocksHtml = blocksList.map((block, i) => renderBlock(block, i)).join('')
  const coverSrc = page.meta?.cover || ''
  const pageIcon = page.meta?.icon || ''
  const hasCover = !!coverSrc
  return `
    <div class="editor" id="editorContainer">
      ${hasCover ? `
      <div class="editor-cover" id="editorCover">
        <img class="editor-cover-img" src="${escHtml(coverSrc)}" alt="" />
        <div class="editor-cover-actions">
          <button class="editor-cover-btn" data-cover-action="change" title="Change cover image">Change cover</button>
          <button class="editor-cover-btn" data-cover-action="remove" title="Remove cover image">Remove</button>
        </div>
      </div>` : `
      <div class="editor-cover editor-cover--empty" id="editorCover" data-cover-action="change">
        <div class="editor-cover-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Add cover</span>
        </div>
      </div>`}
      <div class="editor-toolbar" id="editorToolbar">
        <div class="editor-toolbar-group">
          <button class="editor-tb-btn" data-tb="undo" title="Undo (⌘Z)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="editor-tb-btn" data-tb="redo" title="Redo (⌘⇧Z)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          <button class="editor-tb-btn editor-tb-btn--active" data-tb="bold" title="Bold (⌘B)"><strong>B</strong></button>
          <button class="editor-tb-btn" data-tb="italic" title="Italic (⌘I)"><em>I</em></button>
          <button class="editor-tb-btn" data-tb="underline" title="Underline (⌘U)"><u>U</u></button>
          <button class="editor-tb-btn" data-tb="strike" title="Strikethrough"><s>S</s></button>
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          <select class="editor-tb-select" id="tbFontFamily" title="Font Family">
            ${FONT_FAMILIES.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
          </select>
          <select class="editor-tb-select" id="tbFontSize" title="Font Size">
            ${FONT_SIZES.map(s => `<option value="${s}">${s}px</option>`).join('')}
          </select>
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          <div class="editor-tb-color-wrap" title="Text Color">
            <input type="color" class="editor-tb-color" id="tbTextColor" value="#1a1a1a" />
            <span class="editor-tb-color-label">A</span>
          </div>
          <button class="editor-tb-btn" data-tb="block-color" title="Block highlight">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          ${ALIGN_OPTIONS.map(a =>
            `<button class="editor-tb-btn" data-tb="align-${a.value}" title="${a.label}">${a.icon}</button>`
          ).join('')}
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          <button class="editor-tb-btn" data-tb="insert-image" title="Insert Image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>
          <button class="editor-tb-btn" data-tb="insert-file" title="Insert File">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </button>
          <div class="editor-toolbar-divider"></div>
          <div class="tooltip-trigger">
            <button class="editor-tb-btn" data-tb="ai-query" title="AI Assistant">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a4 4 0 0 1 4 4c0 2-2 5-4 7-2-2-4-5-4-7a4 4 0 0 1 4-4z"/><path d="M2 22c0-4 4-7 10-7s10 3 10 7"/></svg>
            </button>
            <span class="tooltip-content">AI Assistant</span>
          </div>
        </div>
        <div class="editor-toolbar-divider"></div>
        <div class="editor-toolbar-group">
          <select class="editor-tb-select" id="tbBlockType" title="Block Type">
            <optgroup label="Basic">
              <option value="text">Text</option>
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
              <option value="quote">Quote</option>
              <option value="divider">Divider</option>
              <option value="checkbox">Checkbox</option>
              <option value="toggle">Toggle</option>
            </optgroup>
            <optgroup label="Media">
              <option value="code">Code</option>
              <option value="callout">Callout</option>
              <option value="image">Image</option>
              <option value="table">Table</option>
              <option value="file">File</option>
              <option value="columns">Columns</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div class="page-info">
        <span class="page-info-dot"></span>
        <span class="page-info-item"><span id="pageWordCount">0 words</span></span>
        <span class="page-info-sep">·</span>
        <span class="page-info-item"><span id="pageBlockCount">${blockCount} block${blockCount !== 1 ? 's' : ''}</span></span>
        <span class="page-info-sep">·</span>
        <span class="page-info-item">Updated <span id="pageUpdatedAt">${formatDate(updated)}</span></span>
        <span class="page-info-sep">·</span>
        <span class="page-info-item">Created <span id="pageCreatedAt">${formatDate(created)}</span></span>
      </div>
      <div class="editor-title-row">
        ${pageIcon ? `<div class="editor-page-icon" id="editorPageIcon">${pageIcon}</div>` : `<div class="editor-page-icon editor-page-icon--empty" id="editorPageIcon" title="Add icon">${pageIcon || ' '}</div>`}
        <div id="editorTitle" class="editor-title" contenteditable="true" data-placeholder="Untitled">${escHtml(page.title || '')}</div>
      </div>
      <div id="editorBlocks" class="editor-blocks">${blocksHtml}</div>
    </div>`
}

function formatDate(d) {
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function renderBlock(block, index) {
  let bulletHtml = ''
  let contentHtml = ''
  const inlineStyle = buildInlineStyle(block)
  let extraClass = `block-type-${block.type}`
  const blockBg = block.bgColor ? ` style="background:${block.bgColor}"` : ''

  switch (block.type) {
    case 'h1': bulletHtml = '#'; break
    case 'h2': bulletHtml = '##'; break
    case 'h3': bulletHtml = '###'; break
    case 'h4': bulletHtml = '####'; break
    case 'h5': bulletHtml = '#####'; break
    case 'h6': bulletHtml = '######'; break
    case 'quote': bulletHtml = '\u201C'; break
    case 'text': bulletHtml = '\u2022'; break
    case 'bullet': bulletHtml = '\u2022'; break
    case 'number': bulletHtml = (index + 1) + '.'; break
    case 'checkbox':
      bulletHtml = `<div class="checkbox-custom${block.checked ? ' checked' : ''}"></div>`
      break
    case 'toggle':
      bulletHtml = ''
      contentHtml = `<div class="block-toggle-header"><span class="block-toggle-arrow${block.collapsed ? ' collapsed' : ''}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span><div class="block-input" contenteditable="true" data-placeholder="Toggle..."${inlineStyle}>${escHtml(block.content || '')}</div></div><div class="block-toggle-content${block.collapsed ? ' collapsed' : ''}">${renderNestedBlocks(block.children, index)}</div>`
      break
    case 'divider':
      bulletHtml = ''
      contentHtml = '<div><div class="block-divider-line"></div></div>'
      break
    case 'callout':
      extraClass = 'block-type-callout'
      bulletHtml = ''
      contentHtml = `<span class="callout-emoji">${block.meta?.emoji || '\uD83D\uDCA1'}</span><div class="block-input" contenteditable="true" data-placeholder="Write a callout..."${inlineStyle}>${escHtml(block.content || '')}</div>`
      break
    case 'code':
      bulletHtml = ''
      contentHtml = `<div class="code-block-header"><span class="code-lang-badge">${block.meta?.language || 'plaintext'}</span></div><div class="block-input code-block-input" contenteditable="true" data-placeholder="Code..." spellcheck="false"${inlineStyle}>${highlightCode(block.content || '', block.meta?.language)}</div>`
      break
    case 'image':
      bulletHtml = ''
      if (block.meta?.src) {
        contentHtml = `<div class="image-block-wrap"><img class="image-block-img" src="${escHtml(block.meta.src)}" alt="${escHtml(block.meta.alt || '')}" loading="lazy" style="max-width:${block.meta.size || 100}%" /><div class="image-resize-handles"><div class="image-resize-corner image-resize-se" data-resize="se"></div><div class="image-resize-corner image-resize-sw" data-resize="sw"></div></div></div>`
      } else {
        contentHtml = `<div class="image-block-placeholder" data-action="upload-image"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Click to upload image</span></div>`
      }
      break
    case 'file': {
      bulletHtml = ''
      const f = block.meta?.file
      const fileUrl = block.meta?.src || ''
      if (fileUrl && fileUrl.startsWith('data:image/')) {
        contentHtml = `<div class="image-block-wrap"><img class="image-block-img" src="${escHtml(fileUrl)}" alt="${escHtml(f?.name || '')}" loading="lazy" style="max-width:100%" /><div class="image-resize-handles"><div class="image-resize-corner image-resize-se" data-resize="se"></div><div class="image-resize-corner image-resize-sw" data-resize="sw"></div></div></div>`
      } else if (f && f.name) {
        contentHtml = `<div class="file-block" data-action="open-file">
          <div class="file-block-icon">${getFileIcon(f.name)}</div>
          <div class="file-block-info">
            <div class="file-block-name">${escHtml(f.name)}</div>
            <div class="file-block-meta">${formatFileSize(f.size || 0)}${f.lastModified ? ' \u00B7 ' + formatDate(new Date(f.lastModified)) : ''}</div>
          </div>
          <button class="file-block-download" data-action="download-file" data-url="${escHtml(fileUrl)}" data-name="${escHtml(f.name)}" data-size="${f.size || 0}" title="Download file">Download</button>
        </div>`
      } else {
        contentHtml = `<div class="file-block-placeholder" data-action="upload-file">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Click to upload file</span>
        </div>`
      }
      break
    }
    case 'columns': {
      bulletHtml = ''
      const cols = block.meta?.columnCount || 2
      let colsHtml = ''
      for (let i = 0; i < cols; i++) {
        colContent = (block.columns && block.columns[i]) || ''
        colsHtml += `<div class="block-column"><div class="block-input" contenteditable="true" data-placeholder="Column ${i + 1}...">${escHtml(colContent)}</div></div>`
      }
      contentHtml = `<div class="block-type-columns">${colsHtml}</div>`
      let colContent
      break
    }
    case 'table': {
      bulletHtml = ''
      const tableData = parseTableContent(block.content || '')
      const tableStyle = block.meta?.tableStyle || {}
      const rowStyles = tableStyle.rows || {}
      const cellStyles = tableStyle.cells || {}
      const borderColor = tableStyle.borderColor || ''
      const textColor = tableStyle.textColor || ''
      const borderStyle = borderColor ? ` style="border-color:${borderColor}"` : ''
      const textStyle = textColor ? ` style="color:${textColor}"` : ''
      let tableHtml = '<div class="table-block-wrap"><table class="table-block" data-table-id="t' + Date.now() + '"' + borderStyle + textStyle + '>'
      tableData.forEach((row, ri) => {
        const rowBg = rowStyles[ri]?.bg || ''
        const rowTc = rowStyles[ri]?.textColor || ''
        const rowStyle = (rowBg || rowTc) ? ' style="' + (rowBg ? 'background:' + rowBg + ';' : '') + (rowTc ? 'color:' + rowTc + ';' : '') + '"' : ''
        tableHtml += '<tr' + rowStyle + '>'
        if (ri > 0) {
          tableHtml += '<td class="table-row-drag" data-table-row="' + ri + '" contenteditable="false"><span class="table-drag-handle"></span><span class="table-row-resize" data-resize-row="' + ri + '"></span></td>'
        }
        row.forEach((cell, ci) => {
          const tag = ri === 0 ? 'th' : 'td'
          const cellKey = ri + ',' + ci
          const cellSty = cellStyles[cellKey]
          let cellStyle = ''
          if (cellSty) {
            const parts = []
            if (cellSty.bg) parts.push('background:' + cellSty.bg)
            if (cellSty.textColor) parts.push('color:' + cellSty.textColor)
            if (cellSty.borderColor) parts.push('border-color:' + cellSty.borderColor)
            if (parts.length) cellStyle = ' style="' + parts.join(';') + '"'
          }
          const resizer = ri === 0 ? '<span class="table-col-resize" data-col-resize="' + ci + '"></span>' : ''
          tableHtml += `<${tag} contenteditable="true"${cellStyle}>${escHtml(cell)}${resizer}</${tag}>`
        })
        tableHtml += '</tr>'
      })
      if (tableData.length > 0) {
        const firstRowCells = tableData[0].length
        tableHtml += '<tr class="table-insert-row"><td colspan="' + (firstRowCells + 1) + '"><button class="table-insert-btn" data-table-action="insert-row-at" title="Insert row below" data-pos="' + tableData.length + '">+ Insert row below</button></td></tr>'
      }
      tableHtml += '</table>'
      tableHtml += '<div class="table-actions">'
      tableHtml += '<button class="table-action-btn" data-table-action="row-end" title="Add row at end">+ Row (end)</button>'
      tableHtml += '<button class="table-action-btn" data-table-action="col-end" title="Add column at end">+ Col (end)</button>'
      tableHtml += '<button class="table-action-btn" data-table-action="col-left" title="Add column to left">+ Col (left)</button>'
      tableHtml += '<button class="table-action-btn table-format-btn" data-table-action="format" title="Table formatting">\u270E Style</button>'
      tableHtml += '</div></div>'
      contentHtml = tableHtml
      break
    }
    default:
      bulletHtml = '\u2022'
  }

  if (!contentHtml && block.type !== 'divider' && block.type !== 'toggle') {
    contentHtml = `<div class="block-input" contenteditable="true" data-placeholder="Type something..."${inlineStyle}>${escHtml(block.content || '')}</div>`
  }

  const childrenHtml = block.children && block.children.length && block.type !== 'toggle'
    ? `<div class="block-nested">${block.children.map((c, ci) => renderBlock(c, ci)).join('')}</div>`
    : ''

  return `
    <div class="editor-block ${extraClass}${block.nested ? ' block-nested' : ''}" data-block-index="${index}" style="text-align:${block.align || 'left'}"${blockBg}>
      <div class="block-hover-popup">
        <button class="block-hover-btn" data-action="add-block-above" title="Add block above (⌘↵)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="block-hover-btn" data-action="add-cover" title="Add cover image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
        <button class="block-hover-btn" data-action="add-comment" title="Add comment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
      <div class="block-actions-toolbar">
        <button class="block-action-btn" data-action="block-color-btn" title="Block color">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>
        <button class="block-action-btn" data-action="block-duplicate" title="Duplicate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="block-action-btn" data-action="block-move-up" title="Move up">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button class="block-action-btn" data-action="block-move-down" title="Move down">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button class="block-action-btn" data-action="block-indent" title="Indent">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="17 18 11 12 17 6"/><line x1="21" y1="12" x2="7" y2="12"/></svg>
        </button>
        <button class="block-action-btn block-action-btn--danger" data-action="block-delete" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div class="block-drag-handle" draggable="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
      </div>
      <div class="block-bullet">${bulletHtml}</div>
      <div class="block-content">${contentHtml}</div>
      ${childrenHtml}
    </div>`
}

function renderNestedBlocks(children, parentIndex) {
  if (!children || !children.length) return '<div class="block-nested" style="min-height:24px"><div class="block-input" contenteditable="true" data-placeholder="Nested content..." style="padding:4px 2px;font-size:14px"></div></div>'
  return `<div class="block-nested">${children.map((c, i) => renderBlock(c, i)).join('')}</div>`
}

function highlightCode(code, lang) {
  if (!code) return ''
  const patterns = {
    keyword: /\b(function|const|let|var|if|else|return|import|export|from|class|extends|new|this|async|await|try|catch|throw|for|while|do|switch|case|break|continue|typeof|instanceof|in|of|yield|static|get|set|def|lambda|where|let|in|data)\b/g,
    string: /(''|""|``|'.*?'|".*?"|`.*?`)/g,
    comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    number: /\b(-?\d+\.?\d*)\b/g,
    built_in: /\b(console|Math|JSON|Array|Object|String|Number|Boolean|Map|Set|Promise|Symbol|Reflect|parseInt|parseFloat|setTimeout|setInterval|fetch|localStorage|document|window|process|require|module|__dirname|exports)\b/g,
    function: /\b(\w+)\s*\(/g,
  }
  let result = escHtml(code)
  const langLower = (lang || '').toLowerCase()
  if (langLower === 'plaintext' || !lang) return result
  result = result.replace(patterns.comment, '<span class="hljs-comment">$1</span>')
  result = result.replace(patterns.string, '<span class="hljs-string">$1</span>')
  result = result.replace(patterns.keyword, '<span class="hljs-keyword">$1</span>')
  result = result.replace(patterns.number, '<span class="hljs-number">$1</span>')
  result = result.replace(patterns.built_in, '<span class="hljs-built_in">$1</span>')
  return result
}

function buildInlineStyle(block) {
  const parts = []
  if (block.fontFamily) parts.push(`font-family:${block.fontFamily}`)
  if (block.fontSize) parts.push(`font-size:${block.fontSize}px`)
  if (block.color) parts.push(`color:${block.color}`)
  return parts.length ? ` style="${parts.join(';')}"` : ''
}

function getFileIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  const icons = {
    pdf: '\uD83D\uDCC4', doc: '\uD83D\uDCDD', docx: '\uD83D\uDCDD',
    xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA', ppt: '\uD83D\uDCC8', pptx: '\uD83D\uDCC8',
    zip: '\uD83D\uDCE6', rar: '\uD83D\uDCE6', gz: '\uD83D\uDCE6',
    mp3: '\uD83C\uDFB5', wav: '\uD83C\uDFB5', flac: '\uD83C\uDFB5',
    mp4: '\uD83C\uDFAC', mov: '\uD83C\uDFAC', avi: '\uD83C\uDFAC',
    jpg: '\uD83D\uDDBC', jpeg: '\uD83D\uDDBC', png: '\uD83D\uDDBC', gif: '\uD83D\uDDBC', svg: '\uD83D\uDDBC',
    js: '\uD83D\uDCD1', ts: '\uD83D\uDCD1', py: '\uD83D\uDCD1', json: '\uD83D\uDCD1',
    md: '\uD83D\uDCDD', txt: '\uD83D\uDCDD', csv: '\uD83D\uDCCA',
  }
  return icons[ext] || '\uD83D\uDCC4'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function parseTableContent(content) {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length === 0) return [['', ''], ['', '']]
  return lines.map(line => line.split('|').filter(c => c.trim() !== '---').map(c => c.trim()))
}

function serializeTable(data) {
  return data.map(row => '| ' + row.join(' | ') + ' |').join('\n')
}

export function mountEditor(pageStore, blocksChangedCallback) {
  const blocksContainer = $id('editorBlocks')
  const titleInput = $id('editorTitle')
  const toolbar = $id('editorToolbar')
  const editorContainer = $id('editorContainer')
  if (!blocksContainer) return

  const cleans = []
  let saveTimer = null
  let dragData = null

  function getAutosaveDelay() {
    return window.__autosaveInterval || 300
  }

  function scheduleSave() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { saveBlocks(); updateWordCount() }, getAutosaveDelay())
  }

  function saveBlocks() {
    const blocks = collectBlocks()
    if (blocksChangedCallback) blocksChangedCallback(blocks)
  }

  function collectBlocks() {
    const items = $all('.editor-block', blocksContainer)
    const blocks = []
    items.forEach(el => {
      const index = parseInt(el.dataset.blockIndex, 10)
      const type = Array.from(el.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
      const input = el.querySelector('.block-input')
      const content = input ? input.textContent : ''
      const block = { id: `b${Date.now()}-${index}`, type, content, align: el.style.textAlign || 'left' }
      const blockStyle = input?.getAttribute('style')
      if (blockStyle) {
        const st = input.style
        if (st.fontFamily) block.fontFamily = st.fontFamily
        if (st.fontSize) block.fontSize = parseInt(st.fontSize, 10)
        if (st.color) block.color = st.color
      }
      const bg = el.getAttribute('style')
      if (bg && bg.includes('background:')) {
        const m = bg.match(/background:(#[^;]+)/)
        if (m) block.bgColor = m[1]
      }
      if (type === 'checkbox') {
        block.checked = el.querySelector('.checkbox-custom')?.classList.contains('checked') || false
      }
      if (type === 'toggle') {
        block.collapsed = el.querySelector('.block-toggle-arrow')?.classList.contains('collapsed') || false
        const nested = el.querySelector('.block-nested')
        if (nested) {
          block.children = []
          nested.querySelectorAll('.editor-block').forEach(child => {
            block.children.push(collectSingleBlock(child))
          })
        }
      }
      if (type === 'callout') {
        const emojiEl = el.querySelector('.callout-emoji')
        block.meta = { emoji: emojiEl ? emojiEl.textContent : '\uD83D\uDCA1' }
      }
      if (type === 'code') {
        const badge = el.querySelector('.code-lang-badge')
        block.meta = { language: badge ? badge.textContent : 'plaintext' }
      }
      if (type === 'image') {
        const img = el.querySelector('.image-block-img')
        block.meta = {
          src: img ? img.src : '',
          alt: img ? img.alt : '',
          size: block.meta?.size || 100,
        }
      }
      if (type === 'file') {
        block.meta = block.meta || {}
        const downloadBtn = el.querySelector('[data-action="download-file"]')
        if (downloadBtn) {
          block.meta.file = {
            name: downloadBtn.dataset.name || '',
            size: parseInt(downloadBtn.dataset.size, 10) || 0,
          }
          block.meta.src = downloadBtn.dataset.url || ''
        }
      }
      if (type === 'columns') {
        const colInputs = el.querySelectorAll('.block-column .block-input')
        block.meta = { columnCount: colInputs.length }
        block.columns = Array.from(colInputs).map(inp => inp.textContent)
      }
      if (type === 'table') {
        const table = el.querySelector('.table-block')
        if (table) {
          const data = []
          const rows = table.querySelectorAll('tr')
          const tableStyle = {}
          const rowStyles = {}
          rows.forEach(tr => {
            if (tr.classList.contains('table-insert-row')) return
            const row = []
            tr.querySelectorAll('th, td').forEach(cell => {
              if (cell.classList.contains('table-row-drag')) return
              row.push(cell.textContent)
            })
            data.push(row)
          })
          block.content = serializeTable(data)
          const headerRow = table.querySelector('tr')
          if (headerRow) {
            const cells = headerRow.querySelectorAll('th')
            const borderColors = new Set()
            const textColors = new Set()
            cells.forEach(cell => {
              if (cell.style.borderColor) borderColors.add(cell.style.borderColor)
              if (cell.style.color) textColors.add(cell.style.color)
            })
            if (borderColors.size === 1) tableStyle.borderColor = borderColors.values().next().value
            else if (borderColors.size > 0) tableStyle.borderColor = ''
            if (textColors.size === 1) tableStyle.textColor = textColors.values().next().value
            else if (textColors.size > 0) tableStyle.textColor = ''
          }
          const dataRows = table.querySelectorAll('tr:not(.table-insert-row)')
          dataRows.forEach((tr, ri) => {
            if (ri === 0) return
            const bg = tr.style.background || ''
            if (bg) {
              if (!rowStyles[ri]) rowStyles[ri] = {}
              rowStyles[ri].bg = bg
            }
          })
          if (Object.keys(rowStyles).length > 0) tableStyle.rows = rowStyles
          if (Object.keys(tableStyle).length > 0) {
            block.meta = block.meta || {}
            block.meta.tableStyle = tableStyle
          }
        }
      }
      blocks.push(block)
    })
    return blocks
  }

  function collectSingleBlock(el) {
    const type = Array.from(el.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
    const input = el.querySelector('.block-input')
    const content = input ? input.textContent : ''
    const block = { id: `b${Date.now()}`, type, content, align: el.style.textAlign || 'left' }
    return block
  }

  function getBlockIndex(el) {
    const blockEl = el.closest('.editor-block')
    return blockEl ? parseInt(blockEl.dataset.blockIndex, 10) : -1
  }

  function focusBlock(index, end) {
    const items = $all('.editor-block', blocksContainer)
    if (items[index]) {
      const inp = items[index].querySelector('.block-input')
      if (inp) {
        inp.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(inp)
        range.collapse(!end)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  function createBlockAfter(index, type, content) {
    const items = $all('.editor-block', blocksContainer)
    const newEl = document.createElement('div')
    newEl.innerHTML = renderBlock({ type, content, id: `b${Date.now()}`, meta: {}, checked: false, children: [] }, index + 1)
    const child = newEl.firstElementChild
    if (child) {
      child.classList.add('editor-block-new', 'inserting')
      child.addEventListener('animationend', () => child.classList.remove('inserting'), { once: true })
      if (items[index]) {
        items[index].after(child)
      } else {
        blocksContainer.appendChild(child)
      }
      reindexBlocks()
      focusBlock(index + 1)
      saveBlocks()
    }
  }

  function reindexBlocks() {
    $all('.editor-block', blocksContainer).forEach((el, i) => {
      el.dataset.blockIndex = i
    })
  }

  function deleteBlock(index) {
    const items = $all('.editor-block', blocksContainer)
    if (items[index]) {
      items[index].remove()
      reindexBlocks()
      saveBlocks()
      focusBlock(Math.max(0, index - 1))
    }
  }

  function duplicateBlock(index) {
    const items = $all('.editor-block', blocksContainer)
    const source = items[index]
    if (!source) return
    const type = Array.from(source.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
    const input = source.querySelector('.block-input')
    const content = input ? input.textContent : ''
    const newEl = document.createElement('div')
    const align = source.style.textAlign || 'left'
    const bg = source.getAttribute('style') || ''
    newEl.innerHTML = renderBlock({ type, content, id: `b${Date.now()}`, meta: {}, checked: false, align, bgColor: source.style.backgroundColor || '' }, index + 1)
    const child = newEl.firstElementChild
    if (child) {
      child.classList.add('editor-block-new', 'inserting')
      child.addEventListener('animationend', () => child.classList.remove('inserting'), { once: true })
      source.after(child)
      reindexBlocks()
      saveBlocks()
    }
  }

  function indentBlock(index) {
    const items = $all('.editor-block', blocksContainer)
    const target = items[index]
    if (!target || index === 0) return
    const prev = items[index - 1]
    if (!prev) return
    let nested = prev.querySelector('.block-nested')
    if (!nested) {
      nested = document.createElement('div')
      nested.className = 'block-nested'
      prev.appendChild(nested)
    }
    target.classList.add('block-nested')
    nested.appendChild(target)
    reindexBlocks()
    saveBlocks()
  }

  function moveBlock(index, dir) {
    const items = $all('.editor-block', blocksContainer)
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    if (dir < 0) {
      a.parentElement.insertBefore(a, b)
    } else {
      b.parentElement.insertBefore(b, a)
    }
    reindexBlocks()
    saveBlocks()
    focusBlock(target)
  }

  function convertBlockType(el, newType) {
    const blockEl = el.closest('.editor-block')
    if (!blockEl) return
    const index = parseInt(blockEl.dataset.blockIndex, 10)
    Array.from(blockEl.classList).forEach(c => {
      if (c.startsWith('block-type-')) blockEl.classList.remove(c)
    })
    blockEl.classList.add(`block-type-${newType}`)
    const bullet = blockEl.querySelector('.block-bullet')
    const content = blockEl.querySelector('.block-input')?.textContent || ''
    const align = blockEl.style.textAlign || 'left'

    function setContent(html) {
      const contentDiv = blockEl.querySelector('.block-content')
      if (contentDiv) contentDiv.innerHTML = html
    }

    if (newType === 'divider') {
      if (bullet) bullet.innerHTML = ''
      setContent('<div><div class="block-divider-line"></div></div>')
    } else if (newType === 'toggle') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<div class="block-toggle-header"><span class="block-toggle-arrow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span><div class="block-input" contenteditable="true" data-placeholder="Toggle...">${escHtml(content)}</div></div><div class="block-toggle-content"><div class="block-nested"><div class="block-input" contenteditable="true" data-placeholder="Nested content..." style="padding:4px 2px;font-size:14px"></div></div></div>`)
    } else if (newType === 'callout') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<span class="callout-emoji">\uD83D\uDCA1</span><div class="block-input" contenteditable="true" data-placeholder="Write a callout...">${escHtml(content)}</div>`)
    } else if (newType === 'code') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<div class="code-block-header"><span class="code-lang-badge">plaintext</span></div><div class="block-input code-block-input" contenteditable="true" data-placeholder="Code..." spellcheck="false">${escHtml(content)}</div>`)
    } else if (newType === 'image') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<div class="image-block-placeholder" data-action="upload-image"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Click to upload image</span></div>`)
    } else if (newType === 'file') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<div class="file-block-placeholder" data-action="upload-file"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><span>Click to upload file</span></div>`)
    } else if (newType === 'columns') {
      if (bullet) bullet.innerHTML = ''
      setContent(`<div class="block-type-columns"><div class="block-column"><div class="block-input" contenteditable="true" data-placeholder="Column 1..."></div></div><div class="block-column"><div class="block-input" contenteditable="true" data-placeholder="Column 2..."></div></div></div>`)
    } else if (newType === 'table') {
      if (bullet) bullet.innerHTML = ''
      showTableGridPicker(blockEl)
      return
    } else if (newType === 'checkbox') {
      if (bullet) bullet.innerHTML = '<div class="checkbox-custom"></div>'
      const contentDiv = blockEl.querySelector('.block-content')
      if (contentDiv) {
        contentDiv.innerHTML = `<div class="block-input" contenteditable="true" data-placeholder="Type something...">${escHtml(content)}</div>`
      }
    } else {
      const symbols = { h1: '#', h2: '##', h3: '###', h4: '####', h5: '#####', h6: '######', quote: '\u201C', text: '\u2022', bullet: '\u2022', number: (index + 1) + '.' }
      if (bullet) bullet.textContent = symbols[newType] || '\u2022'
      const contentDiv = blockEl.querySelector('.block-content')
      if (contentDiv && !contentDiv.querySelector('.block-input')) {
        contentDiv.innerHTML = `<div class="block-input" contenteditable="true" data-placeholder="Type something...">${escHtml(content)}</div>`
      }
    }
    saveBlocks()
  }

  function setBlockColor(blockEl, color) {
    if (color === 'transparent') {
      blockEl.style.background = ''
      blockEl.removeAttribute('style')
    } else {
      blockEl.style.background = color
    }
    saveBlocks()
  }

  function showBlockColorPicker(blockEl) {
    const existing = document.querySelector('.block-color-picker')
    if (existing) { existing.remove(); return }
    const picker = document.createElement('div')
    picker.className = 'block-color-picker'
    BLOCK_HIGHLIGHT_COLORS.forEach(c => {
      const swatch = document.createElement('div')
      swatch.className = 'block-color-swatch'
      if (c === 'transparent') {
        swatch.style.background = 'var(--card-bg)'
        swatch.style.border = '2px dashed var(--border)'
        swatch.title = 'Remove color'
      } else {
        swatch.style.background = c
      }
      swatch.addEventListener('click', (e) => {
        e.stopPropagation()
        setBlockColor(blockEl, c)
        picker.remove()
      })
      picker.appendChild(swatch)
    })
    blockEl.appendChild(picker)
    const outsideHandler = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove()
        document.removeEventListener('click', outsideHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', outsideHandler), 10)
  }

  function showTableFormatToolbar(table, tableWrap) {
    const existing = document.querySelector('.table-format-toolbar')
    if (existing) { existing.remove(); return }

    const TABLE_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffd43b','transparent']

    const selectedRows = table.querySelectorAll('tr.selected-row')
    const allRows = table.querySelectorAll('tr:not(.table-insert-row)')
    const selectedRowIdx = selectedRows.length === 1 ? Array.from(allRows).indexOf(selectedRows[0]) : -1
    const multiSelect = selectedRows.length > 1
    const firstCell = allRows[0]?.querySelector('th')
    const curBorder = firstCell?.style.borderColor || ''
    const curText = firstCell?.style.color || ''

    const toolbar = document.createElement('div')
    toolbar.className = 'table-format-toolbar'
    toolbar.innerHTML = `
      <div class="tft-header">Table Style</div>
      <div class="tft-section">
        <div class="tft-label">Border color</div>
        <div class="tft-colors" data-format="borderColor">
          ${TABLE_COLORS.map(c => `<div class="tft-swatch${curBorder === c || (!curBorder && c === 'transparent') ? ' active' : ''}" data-color="${c}" style="background:${c === 'transparent' ? 'var(--card-bg)' : c};${c === 'transparent' ? 'border:2px dashed var(--border)' : ''}"></div>`).join('')}
        </div>
      </div>
      <div class="tft-section">
        <div class="tft-label">Text color</div>
        <div class="tft-colors" data-format="textColor">
          ${TABLE_COLORS.map(c => `<div class="tft-swatch${curText === c || (!curText && c === 'transparent') ? ' active' : ''}" data-color="${c}" style="background:${c === 'transparent' ? 'var(--card-bg)' : c};${c === 'transparent' ? 'border:2px dashed var(--border)' : ''}"></div>`).join('')}
        </div>
      </div>
      <div class="tft-section">
        <div class="tft-label">Row background ${multiSelect ? '<span class="tft-multi-badge">' + selectedRows.length + ' selected</span>' : ''}</div>
        <div class="tft-rows">
          <select class="tft-row-select">
            <option value="-1">${multiSelect ? 'Multiple rows selected' : (selectedRowIdx >= 0 ? 'Row ' + (selectedRowIdx) : 'Select row\u2026')}</option>
            ${allRows.length > 1 ? Array.from(allRows).slice(1).map((tr, i) => {
              const cellText = tr.querySelector('td:not(.table-row-drag)')?.textContent?.slice(0, 20) || ('Row ' + (i + 1))
              return '<option value="' + (i + 1) + '"' + (selectedRowIdx === i + 1 ? ' selected' : '') + '>' + escHtml(cellText) + '</option>'
            }).join('') : ''}
          </select>
          <div class="tft-colors" data-format="rowBg">
            ${TABLE_COLORS.map(c => `<div class="tft-swatch${c === 'transparent' ? ' active' : ''}" data-color="${c}" style="background:${c === 'transparent' ? 'var(--card-bg)' : c};${c === 'transparent' ? 'border:2px dashed var(--border)' : ''}"></div>`).join('')}
          </div>
        </div>
      </div>`

    tableWrap.appendChild(toolbar)
    requestAnimationFrame(() => toolbar.classList.add('open'))

    toolbar.querySelectorAll('.tft-colors').forEach(container => {
      const format = container.dataset.format
      container.addEventListener('click', (e) => {
        const swatch = e.target.closest('.tft-swatch')
        if (!swatch) return
        const color = swatch.dataset.color
        container.querySelectorAll('.tft-swatch').forEach(s => s.classList.remove('active'))
        if (color !== 'transparent') swatch.classList.add('active')

        if (format === 'borderColor') {
          table.querySelectorAll('th, td').forEach(cell => {
            if (cell.classList.contains('table-row-drag')) return
            cell.style.borderColor = color === 'transparent' ? '' : color
          })
        } else if (format === 'textColor') {
          table.querySelectorAll('th, td').forEach(cell => {
            if (cell.classList.contains('table-row-drag')) return
            cell.style.color = color === 'transparent' ? '' : color
          })
        } else if (format === 'rowBg') {
          const sel = table.querySelectorAll('tr.selected-row')
          if (sel.length > 0) {
            sel.forEach(tr => { tr.style.background = color === 'transparent' ? '' : color })
          } else {
            const rowSelect = toolbar.querySelector('.tft-row-select')
            const rowIdx = parseInt(rowSelect?.value, 10)
            if (rowIdx >= 0 && allRows[rowIdx]) {
              allRows[rowIdx].style.background = color === 'transparent' ? '' : color
            }
          }
        }
        saveBlocks()
      })
    })

    toolbar.querySelector('.tft-row-select')?.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10)
      table.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'))
      if (idx >= 0 && allRows[idx]) allRows[idx].classList.add('selected-row')
    })

    const outsideHandler = (e) => {
      if (!toolbar.contains(e.target) && !e.target.closest('[data-table-action="format"]')) {
        toolbar.classList.remove('open')
        toolbar.addEventListener('transitionend', () => toolbar.remove(), { once: true })
        document.removeEventListener('click', outsideHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', outsideHandler), 10)
  }

  function showTableGridPicker(blockEl) {
    const existing = document.querySelector('.table-grid-picker-overlay')
    if (existing) { existing.remove(); return }

    const MAX = 8
    let selRows = 3, selCols = 4

    const overlay = document.createElement('div')
    overlay.className = 'table-grid-picker-overlay'
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

    const picker = document.createElement('div')
    picker.className = 'table-grid-picker'
    picker.innerHTML = `
      <div class="tgp-header">Insert Table</div>
      <div class="tgp-grid"></div>
      <div class="tgp-label"><span class="tgp-dim">3 × 4</span></div>
      <div class="tgp-actions">
        <button class="tgp-btn tgp-cancel" data-action="cancel">Cancel</button>
        <button class="tgp-btn tgp-confirm" data-action="confirm">Create</button>
      </div>`

    const gridEl = picker.querySelector('.tgp-grid')
    const labelEl = picker.querySelector('.tgp-dim')
    const cells = []

    function updateLabel() { labelEl.textContent = selRows + ' × ' + selCols }
    function updateGrid() {
      gridEl.innerHTML = ''
      cells.length = 0
      for (let r = 0; r < MAX; r++) {
        for (let c = 0; c < MAX; c++) {
          const cell = document.createElement('div')
          cell.className = 'tgp-cell' + (r < selRows && c < selCols ? ' active' : '')
          cell.dataset.r = r
          cell.dataset.c = c
          cell.addEventListener('mouseenter', () => {
            selRows = r + 1
            selCols = c + 1
            cells.forEach(el => {
              const rr = parseInt(el.dataset.r, 10)
              const cc = parseInt(el.dataset.c, 10)
              el.classList.toggle('active', rr < selRows && cc < selCols)
            })
            updateLabel()
          })
          cell.addEventListener('click', () => {
            createTableWithSize(blockEl, selRows, selCols)
            overlay.remove()
          })
          gridEl.appendChild(cell)
          cells.push(cell)
        }
      }
    }
    updateGrid()

    picker.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove())
    picker.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      createTableWithSize(blockEl, selRows, selCols)
      overlay.remove()
    })

    overlay.appendChild(picker)
    document.body.appendChild(overlay)
  }

  function createTableWithSize(blockEl, rows, cols) {
    let tableHtml = '<div class="table-block-wrap"><table class="table-block" data-table-id="t' + Date.now() + '">'
    const headerCells = []
    for (let c = 1; c <= cols; c++) headerCells.push('Col ' + c)
    tableHtml += '<tr><th contenteditable="true">' + headerCells.join('</th><th contenteditable="true">') + '</th></tr>'
    for (let r = 1; r < rows; r++) {
      tableHtml += '<tr><td class="table-row-drag" data-table-row="' + r + '" contenteditable="false"><span class="table-drag-handle"></span><span class="table-row-resize" data-resize-row="' + r + '"></span></td>'
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td contenteditable="true"></td>'
      }
      tableHtml += '</tr>'
    }
    tableHtml += '<tr class="table-insert-row"><td colspan="' + (cols + 1) + '"><button class="table-insert-btn" data-table-action="insert-row-at" title="Insert row below" data-pos="' + rows + '">+ Insert row below</button></td></tr>'
    tableHtml += '</table><div class="table-actions"><button class="table-action-btn" data-table-action="row-end" title="Add row at end">+ Row (end)</button><button class="table-action-btn" data-table-action="col-end" title="Add column at end">+ Col (end)</button><button class="table-action-btn" data-table-action="col-left" title="Add column to left">+ Col (left)</button><button class="table-action-btn" data-table-action="delete-row" title="Delete selected row(s)">− Row</button><button class="table-action-btn" data-table-action="delete-col" title="Delete column">− Col</button><button class="table-action-btn table-format-btn" data-table-action="format" title="Table formatting">✎ Style</button></div></div>'
    const contentDiv = blockEl.querySelector('.block-content')
    if (contentDiv) contentDiv.innerHTML = tableHtml
    saveBlocks()
  }

  function uploadFile(blockEl) {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = e.target?.files?.[0]
      if (!file) return
      const contentDiv = blockEl.querySelector('.block-content')
      try {
        const ws = store?.state?.workspaceId || 'default'
        const result = await apiUploadFile(ws, file)
        const fileId = result?.id
        const fileUrl = result?.public_url || ''
        const isImage = result?.mime_type?.startsWith('image/') || file.type.startsWith('image/')
        const meta = JSON.stringify({ fileId, fileName: result?.file_name || file.name, mimeType: result?.mime_type || file.type, fileSize: result?.file_size || file.size, publicUrl: fileUrl })
        if (isImage) {
          if (contentDiv) {
            contentDiv.innerHTML = `<div class="image-block-wrap"><img class="image-block-img" src="${fileUrl || ''}" alt="${escHtml(file.name)}" loading="lazy" style="max-width:100%" data-file-id="${fileId}" data-file-meta="${escHtml(meta)}" /><div class="image-resize-handles"><div class="image-resize-corner image-resize-se" data-resize="se"></div><div class="image-resize-corner image-resize-sw" data-resize="sw"></div></div></div>`
          }
        } else {
          if (contentDiv) {
            contentDiv.innerHTML = `<div class="file-block" data-action="open-file" data-file-id="${fileId}">
              <div class="file-block-icon">${getFileIcon(result?.file_name || file.name)}</div>
              <div class="file-block-info">
                <div class="file-block-name">${escHtml(result?.file_name || file.name)}</div>
                <div class="file-block-meta">${formatFileSize(result?.file_size || file.size)}</div>
              </div>
              <button class="file-block-download" data-action="download-file" data-file-id="${fileId}" title="Download file">Download</button>
            </div>`
          }
        }
        saveBlocks()
      } catch (err) {
        if (contentDiv) contentDiv.textContent = 'Upload failed: ' + err.message
      }
    }
    input.click()
  }

  function applyInlineStyle(prop, value) {
    const sel = window.getSelection()
    if (!sel.rangeCount || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const span = document.createElement('span')
    span.style[prop] = value
    try {
      range.surroundContents(span)
    } catch {
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)
    }
    sel.removeAllRanges()
    sel.addRange(range)
  }

  let activeSlashMenu = null

  function closeSlashMenu() {
    if (activeSlashMenu) {
      activeSlashMenu.remove()
      activeSlashMenu = null
    }
  }

  function showSlashMenu(anchor, index) {
    closeSlashMenu()
    const SLASH_ITEMS = [
      { type: 'text', label: 'Text', icon: 'A', desc: 'Plain text', cat: 'Basic' },
      { type: 'h1', label: 'Heading 1', icon: 'H1', desc: 'Large heading', cat: 'Headings' },
      { type: 'h2', label: 'Heading 2', icon: 'H2', desc: 'Medium heading', cat: 'Headings' },
      { type: 'h3', label: 'Heading 3', icon: 'H3', desc: 'Small heading', cat: 'Headings' },
      { type: 'h4', label: 'Heading 4', icon: 'H4', desc: 'Subheading', cat: 'Headings' },
      { type: 'h5', label: 'Heading 5', icon: 'H5', desc: 'Small subheading', cat: 'Headings' },
      { type: 'h6', label: 'Heading 6', icon: 'H6', desc: 'Tiny heading', cat: 'Headings' },
      { type: 'quote', label: 'Quote', icon: '\u201C', desc: 'Block quote', cat: 'Basic' },
      { type: 'divider', label: 'Divider', icon: '\u2014', desc: 'Horizontal divider', cat: 'Basic' },
      { type: 'checkbox', label: 'Checkbox', icon: '\u2611', desc: 'To-do item', cat: 'Basic' },
      { type: 'toggle', label: 'Toggle', icon: '\u25B6', desc: 'Collapsible section', cat: 'Basic' },
      { type: 'callout', label: 'Callout', icon: '\uD83D\uDCA1', desc: 'Highlighted callout', cat: 'Media' },
      { type: 'code', label: 'Code', icon: '</>', desc: 'Code block', cat: 'Media' },
      { type: 'image', label: 'Image', icon: '\uD83D\uDDBC', desc: 'Upload or embed image', cat: 'Media' },
      { type: 'file', label: 'File', icon: '\uD83D\uDCC4', desc: 'Upload a file', cat: 'Media' },
      { type: 'table', label: 'Table', icon: '\u229E', desc: 'Simple table', cat: 'Media' },
      { type: 'columns', label: 'Columns', icon: '\u2016', desc: 'Multi-column layout', cat: 'Media' },
    ]
    const menu = document.createElement('div')
    menu.className = 'slash-menu'
    menu.innerHTML = `
      <input class="slash-menu-search" type="text" placeholder="Filter..." autofocus />
      <div class="slash-menu-list"></div>`
    const searchInput = menu.querySelector('.slash-menu-search')
    const list = menu.querySelector('.slash-menu-list')

    let currentFilter = ''

    function renderItems(filter) {
      currentFilter = filter || ''
      const lower = (filter || '').toLowerCase()
      const categories = [...new Set(SLASH_ITEMS.map(i => i.cat))]
      list.innerHTML = ''
      for (const cat of categories) {
        const items = SLASH_ITEMS.filter(i => i.cat === cat && (!lower || i.label.toLowerCase().includes(lower) || i.desc.toLowerCase().includes(lower)))
        if (!items.length) continue
        const catDiv = document.createElement('div')
        catDiv.className = 'slash-menu-category'
        catDiv.textContent = cat
        catDiv.addEventListener('click', () => {
          catDiv.classList.toggle('collapsed')
        })
        list.appendChild(catDiv)
        items.forEach(item => {
          const div = document.createElement('div')
          div.className = 'slash-menu-item'
          div.innerHTML = `<div class="slash-menu-icon">${item.icon}</div><div class="slash-menu-text"><div class="slash-menu-label">${item.label}</div><div class="slash-menu-desc">${item.desc}</div></div>`
          div.addEventListener('click', () => {
            const blockEl = $el(`.editor-block[data-block-index="${index}"]`, blocksContainer)
            if (blockEl) convertBlockType(blockEl, item.type)
            closeSlashMenu()
          })
          list.appendChild(div)
        })
      }
    }

    searchInput.addEventListener('input', () => renderItems(searchInput.value))
    renderItems('')
    anchor.parentElement.appendChild(menu)
    setTimeout(() => searchInput.focus(), 50)
    activeSlashMenu = menu

    const outsideHandler = (e) => {
      if (activeSlashMenu && !activeSlashMenu.contains(e.target)) {
        closeSlashMenu()
        document.removeEventListener('click', outsideHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', outsideHandler), 10)
  }

  let activeMentionMenu = null

  function closeMentionMenu() {
    if (activeMentionMenu) {
      activeMentionMenu.remove()
      activeMentionMenu = null
    }
  }

  function showMentionMenu(anchor, index, query) {
    closeMentionMenu()
    const allPages = pageStore?.state?.pages || []
    const filtered = query
      ? allPages.filter(p => p.title?.toLowerCase().includes(query.toLowerCase()))
      : allPages
    const menu = document.createElement('div')
    menu.className = 'slash-menu'
    menu.style.width = '220px'
    menu.innerHTML = filtered.length
      ? filtered.slice(0, 8).map(p => `<div class="slash-menu-item" data-page-id="${p.id}"><div class="slash-menu-icon">\uD83D\uDCC4</div><div class="slash-menu-text"><div class="slash-menu-label">${escHtml(p.title || 'Untitled')}</div></div></div>`).join('')
      : '<div class="slash-menu-item" style="opacity:0.5;cursor:default">No pages found</div>'
    menu.querySelectorAll('[data-page-id]').forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.pageId
        const label = item.querySelector('.slash-menu-label')?.textContent || 'Untitled'
        const blockEl = $el(`.editor-block[data-block-index="${index}"]`, blocksContainer)
        const input = blockEl?.querySelector('.block-input')
        if (input) {
          const sel = window.getSelection()
          if (sel.rangeCount) {
            const range = sel.getRangeAt(0)
            range.deleteContents()
            const link = document.createElement('a')
            link.href = `#page-${pageId}`
            link.contentEditable = false
            link.className = 'page-mention'
            link.dataset.pageId = pageId
            link.textContent = '@' + label
            range.insertNode(link)
            range.collapse(false)
            sel.removeAllRanges()
            sel.addRange(range)
          }
        }
        closeMentionMenu()
        saveBlocks()
      })
    })
    anchor.parentElement.appendChild(menu)
    activeMentionMenu = menu
    const outsideHandler = (e) => {
      if (activeMentionMenu && !activeMentionMenu.contains(e.target)) {
        closeMentionMenu()
        document.removeEventListener('click', outsideHandler)
      }
    }
    setTimeout(() => document.addEventListener('click', outsideHandler), 10)
  }

  let findReplaceOverlay = null

  function showFindReplace() {
    closeFindReplace()
    const overlay = document.createElement('div')
    overlay.className = 'find-replace-overlay'
    overlay.id = 'findReplaceOverlay'
    overlay.innerHTML = `
      <input class="find-replace-input" id="findInput" type="text" placeholder="Find..." autofocus />
      <input class="find-replace-input" id="replaceInput" type="text" placeholder="Replace..." />
      <span class="find-replace-count" id="findCount">0 matches</span>
      <button class="find-replace-btn find-replace-btn--subtle" id="findPrevBtn" title="Find previous">\u25B2</button>
      <button class="find-replace-btn find-replace-btn--subtle" id="findNextBtn" title="Find next">\u25BC</button>
      <button class="find-replace-btn" id="replaceBtn" title="Replace">Replace</button>
      <button class="find-replace-btn" id="replaceAllBtn" title="Replace all">All</button>
      <button class="find-replace-btn find-replace-btn--subtle" id="findCloseBtn" title="Close find and replace">\u2715</button>`
    toolbar.after(overlay)
    findReplaceOverlay = overlay
    let currentIndex = -1
    let matches = []

    function findMatches(query) {
      matches = []
      currentIndex = -1
      document.querySelectorAll('.find-highlight').forEach(el => {
        el.replaceWith(el.textContent)
      })
      if (!query) { updateCount(); return }
      const items = $all('.block-input', blocksContainer)
      items.forEach(input => {
        const text = input.textContent
        let idx = 0
        while ((idx = text.toLowerCase().indexOf(query.toLowerCase(), idx)) !== -1) {
          const range = document.createRange()
          range.setStart(input.firstChild || input, idx)
          range.setEnd(input.firstChild || input, idx + query.length)
          const span = document.createElement('span')
          span.className = 'find-highlight'
          try {
            range.surroundContents(span)
          } catch { idx++; continue }
          matches.push({ el: span, input })
          idx += query.length
        }
      })
      updateCount()
    }

    function updateCount() {
      const countEl = $id('findCount')
      if (countEl) countEl.textContent = matches.length + ' match' + (matches.length !== 1 ? 'es' : '')
    }

    function goTo(index) {
      document.querySelectorAll('.find-highlight.active').forEach(el => el.classList.remove('active'))
      if (matches[index]) {
        currentIndex = index
        matches[index].el.classList.add('active')
        matches[index].el.scrollIntoView({ block: 'center' })
      }
    }

    $id('findInput')?.addEventListener('input', (e) => findMatches(e.target.value))
    $id('findNextBtn')?.addEventListener('click', () => {
      if (matches.length) goTo((currentIndex + 1) % matches.length)
    })
    $id('findPrevBtn')?.addEventListener('click', () => {
      if (matches.length) goTo((currentIndex - 1 + matches.length) % matches.length)
    })
    $id('replaceBtn')?.addEventListener('click', () => {
      if (matches[currentIndex]) {
        const input = matches[currentIndex].input
        const replaceVal = $id('replaceInput')?.value || ''
        const sel = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(matches[currentIndex].el)
        sel.removeAllRanges()
        sel.addRange(range)
        document.execCommand('insertText', false, replaceVal)
        saveBlocks()
        findMatches($id('findInput')?.value || '')
      }
    })
    $id('replaceAllBtn')?.addEventListener('click', () => {
      const replaceVal = $id('replaceInput')?.value || ''
      ;[...matches].reverse().forEach(m => {
        const sel = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(m.el)
        sel.removeAllRanges()
        sel.addRange(range)
        document.execCommand('insertText', false, replaceVal)
      })
      saveBlocks()
      findMatches($id('findInput')?.value || '')
    })
    $id('findCloseBtn')?.addEventListener('click', closeFindReplace)
  }

  function closeFindReplace() {
    if (findReplaceOverlay) {
      findReplaceOverlay.remove()
      findReplaceOverlay = null
    }
    document.querySelectorAll('.find-highlight').forEach(el => {
      el.replaceWith(el.textContent)
    })
  }

  function updateWordCount() {
    const wcEl = $id('pageWordCount')
    if (!wcEl) return
    let text = ''
    $all('.block-input', blocksContainer).forEach(inp => { text += ' ' + inp.textContent })
    const words = text.trim() ? text.trim().split(/\s+/).length : 0
    const chars = text.length
    wcEl.textContent = `${words} words \u00B7 ${chars} characters`
  }

  function showToast(message, type) {
    const toast = document.querySelector('.toast') || document.createElement('div')
    if (!toast.parentElement) {
      const container = document.createElement('div')
      container.className = 'toast-container'
      document.body.appendChild(container)
    }
    const container = document.querySelector('.toast-container')
    const t = document.createElement('div')
    t.className = 'toast toast--' + (type || 'info')
    const iconMap = { success: '\u2713', error: '\u2717', info: '\u2139\uFE0F' }
    t.innerHTML = `<span class="toast-icon">${iconMap[type] || iconMap.info}</span><span>${escHtml(message)}</span><button class="toast-close" title="Dismiss">\u2715</button>`
    t.querySelector('.toast-close').addEventListener('click', () => t.remove())
    container.appendChild(t)
    setTimeout(() => { t.style.animation = 'toastOut 0.3s cubic-bezier(0.16,1,0.3,1) both'; setTimeout(() => t.remove(), 300) }, 3000)
  }

  function showAiQueryModal(relatedInput) {
    const existing = document.querySelector('.ai-query-modal')
    if (existing) { existing.remove(); return }
    const overlay = document.createElement('div')
    overlay.className = 'ai-query-modal'
    overlay.innerHTML = `
      <div class="ai-query-box">
        <div class="ai-query-header">AI Assistant</div>
        <textarea class="ai-query-textarea" placeholder="Ask AI to write or transform content..." rows="4"></textarea>
        <div class="ai-query-actions">
          <button class="ai-query-btn ai-query-btn--send">Generate</button>
          <button class="ai-query-btn" data-ai-cancel>Cancel</button>
        </div>
        <div class="ai-query-result" style="display:none"></div>
      </div>`
    document.body.appendChild(overlay)

    const textarea = overlay.querySelector('.ai-query-textarea')
    const resultEl = overlay.querySelector('.ai-query-result')
    const sendBtn = overlay.querySelector('.ai-query-btn--send')
    textarea.focus()

    sendBtn.addEventListener('click', async () => {
      const prompt = textarea.value.trim()
      if (!prompt) return
      sendBtn.disabled = true
      sendBtn.textContent = 'Thinking...'
      try {
        const res = await aiQuery('default', prompt)
        const answer = res?.data?.response || res?.response || res?.text || JSON.stringify(res)
        resultEl.textContent = typeof answer === 'string' ? answer : JSON.stringify(answer)
        resultEl.style.display = 'block'
      } catch (err) {
        resultEl.textContent = 'Error: ' + err.message
        resultEl.style.display = 'block'
      }
      sendBtn.disabled = false
      sendBtn.textContent = 'Generate'
    })

    overlay.querySelector('[data-ai-cancel]').addEventListener('click', () => overlay.remove())
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
  }

  function updateInsertRowColspan(table) {
    const firstRow = table.querySelector('tr')
    if (!firstRow) return
    const cols = firstRow.querySelectorAll('th:not(.table-row-drag), td:not(.table-row-drag)').length || 2
    table.querySelectorAll('.table-insert-row td, .table-insert-row th').forEach(cell => {
      cell.colSpan = cols + 1
    })
  }

  const inputHandler = (e) => {
    const input = e.target.closest('.block-input')
    if (!input || !blocksContainer.contains(input)) return
    scheduleSave()
  }

  const keydownHandler = (e) => {
    const input = e.target.closest('.block-input')
    if (!input || !blocksContainer.contains(input)) return
    const blockEl = input.closest('.editor-block')
    const index = blockEl ? parseInt(blockEl.dataset.blockIndex, 10) : -1
    const isCode = blockEl?.classList.contains('block-type-code')

    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      showFindReplace()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isCode) return
      const content = input.textContent
      input.textContent = content
      createBlockAfter(index, 'text', '')
      return
    }

    if (e.key === 'Backspace' && input.textContent === '') {
      const items = $all('.editor-block', blocksContainer)
      if (items.length > 1) {
        e.preventDefault()
        deleteBlock(index)
      }
    }

    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      focusBlock(index - 1, true)
    }

    if (e.key === 'ArrowDown') {
      const items = $all('.editor-block', blocksContainer)
      if (index < items.length - 1) {
        e.preventDefault()
        focusBlock(index + 1, false)
      }
    }

    if (e.key === '/' && !e.shiftKey && input.textContent === '') {
      e.preventDefault()
      showSlashMenu(input, index)
    }

    if (e.key === '@' && (input.textContent === '' || input.textContent.endsWith(' '))) {
      const text = input.textContent
      const atIdx = text.lastIndexOf('@')
      if (atIdx !== -1) {
        const query = text.slice(atIdx + 1)
        e.preventDefault()
        showMentionMenu(input, index, query)
      }
    }

    if (e.key === 'Tab') {
      const cell = e.target.closest('th, td')
      if (cell && cell.closest('.table-block')) {
        e.preventDefault()
        const table = cell.closest('.table-block')
        const allCells = table.querySelectorAll('th:not(.table-row-drag), td:not(.table-row-drag)')
        const currentIdx = Array.from(allCells).indexOf(cell)
        const nextIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1
        if (nextIdx >= 0 && nextIdx < allCells.length) {
          allCells[nextIdx].focus()
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(allCells[nextIdx])
          range.collapse(false)
          sel.removeAllRanges()
          sel.addRange(range)
        } else if (!e.shiftKey && nextIdx >= allCells.length) {
          const tr = document.createElement('tr')
          const colCount = table.querySelectorAll('tr')[0]?.querySelectorAll('th:not(.table-row-drag), td:not(.table-row-drag)').length || 2
          const dragTd = document.createElement('td')
          dragTd.className = 'table-row-drag'
          dragTd.contentEditable = false
          const handle = document.createElement('span')
          handle.className = 'table-drag-handle'
          dragTd.appendChild(handle)
          tr.appendChild(dragTd)
          for (let i = 0; i < colCount; i++) {
            const cell = document.createElement('td')
            cell.contentEditable = true
            tr.appendChild(cell)
          }
          const insertRow = table.querySelector('.table-insert-row')
          if (insertRow) table.insertBefore(tr, insertRow)
          else table.appendChild(tr)
          const newCells = tr.querySelectorAll('td:not(.table-row-drag)')
          if (newCells.length > 0) {
            newCells[0].focus()
            const range = document.createRange()
            const sel = window.getSelection()
            range.selectNodeContents(newCells[0])
            range.collapse(false)
            sel.removeAllRanges()
            sel.addRange(range)
          }
          updateInsertRowColspan(table)
          saveBlocks()
        }
        return
      }
      if (!e.shiftKey) {
        e.preventDefault()
        document.execCommand('insertHTML', false, '    ')
      }
    }
  }

  const keyupHandler = (e) => {
    const input = e.target.closest('.block-input')
    if (!input || !blocksContainer.contains(input)) return
    const sel = window.getSelection()
    if (!sel.rangeCount) return
    const text = input.textContent
    const cursorPos = sel.focusOffset
    const beforeCursor = text.slice(0, cursorPos)
    const atIdx = beforeCursor.lastIndexOf('@')
    if (atIdx !== -1 && !beforeCursor.slice(atIdx + 1).includes(' ')) {
      const query = beforeCursor.slice(atIdx + 1)
      const blockEl = input.closest('.editor-block')
      const index = blockEl ? parseInt(blockEl.dataset.blockIndex, 10) : -1
      if (query.length >= 0) {
        showMentionMenu(input, index, query)
      }
    } else if (e.key !== '@') {
      setTimeout(closeMentionMenu, 200)
    }
  }

  const clickHandler = (e) => {
    const blockEl = e.target.closest('.editor-block')
    if (!blockEl || !blocksContainer.contains(blockEl)) return
    const index = parseInt(blockEl.dataset.blockIndex, 10)

    const checkbox = e.target.closest('.checkbox-custom')
    if (checkbox) {
      checkbox.classList.toggle('checked')
      const blockInput = checkbox.closest('.editor-block')?.querySelector('.block-input')
      if (blockInput) blockInput.classList.toggle('checked')
      saveBlocks()
      return
    }

    const toggleArrow = e.target.closest('.block-toggle-arrow')
    if (toggleArrow) {
      toggleArrow.classList.toggle('collapsed')
      const content = toggleArrow.closest('.editor-block')?.querySelector('.block-toggle-content')
      if (content) content.classList.toggle('collapsed')
      return
    }

    const calloutEmoji = e.target.closest('.callout-emoji')
    if (calloutEmoji && !e.target.closest('.emoji-picker')) {
      const existing = document.querySelector('.emoji-picker')
      if (existing) { existing.remove(); return }
      const emojis = ['\uD83D\uDCA1', '\uD83D\uDCDD', '\u26A0\uFE0F', '\u2705', '\u274C', '\uD83D\uDD25', '\u2B50', '\uD83D\uDCCC', '\uD83D\uDCAA', '\uD83C\uDFAF', '\uD83D\uDE80', '\uD83D\uDCCE', '\uD83D\uDD17', '\uD83D\uDCBB', '\uD83D\uDDA5\uFE0F', '\uD83D\uDCCA', '\uD83D\uDCC2', '\uD83D\uDCC1']
      const picker = document.createElement('div')
      picker.className = 'emoji-picker'
      emojis.forEach(emoji => {
        const btn = document.createElement('button')
        btn.textContent = emoji
        btn.className = 'emoji-picker-item'
        btn.addEventListener('click', () => {
          calloutEmoji.textContent = emoji
          picker.remove()
          saveBlocks()
        })
        picker.appendChild(btn)
      })
      calloutEmoji.parentElement.appendChild(picker)
      return
    }

    const imagePlaceholder = e.target.closest('[data-action="upload-image"]')
    if (imagePlaceholder) {
      uploadFile(blockEl)
      return
    }

    const filePlaceholder = e.target.closest('[data-action="upload-file"]')
    if (filePlaceholder) {
      uploadFile(blockEl)
      return
    }

    const downloadBtn = e.target.closest('[data-action="download-file"]')
    if (downloadBtn) {
      const url = downloadBtn.dataset.url
      const name = downloadBtn.dataset.name
      const fileId = downloadBtn.dataset.fileId
      if (fileId) {
        window.open(`http://localhost:${window.__apiPort || 5000}/api/v1/files/${fileId}/download`)
      } else if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = name || 'download'
        a.click()
      }
      return
    }

    const openBtn = e.target.closest('[data-action="open-file"]')
    if (openBtn) {
      const fileId = openBtn.dataset.fileId
      if (fileId) {
        window.open(`http://localhost:${window.__apiPort || 5000}/api/v1/files/${fileId}/download`)
      }
      return
    }

    /* ── Multi-row selection in tables ── */
    const dragHandle = e.target.closest('.table-row-drag, .table-drag-handle')
    if (dragHandle) {
      const tr = dragHandle.closest('tr')
      if (tr && !tr.classList.contains('table-insert-row')) {
        if (e.shiftKey) {
          tr.classList.toggle('selected-row')
        } else {
          const table = tr.closest('.table-block')
          if (table) {
            const alreadySelected = tr.classList.contains('selected-row')
            table.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'))
            if (!alreadySelected || tr.parentElement.querySelector('.selected-row')) tr.classList.add('selected-row')
          }
        }
        e.preventDefault()
        return
      }
    }

    const tableAction = e.target.closest('[data-table-action]')
    if (tableAction) {
      const tableWrap = tableAction.closest('.table-block-wrap')
      const table = tableWrap?.querySelector('.table-block')
      if (!table) return
      const action = tableAction.dataset.tableAction
      function getColCount() {
        const firstRow = table.querySelector('tr')
        if (!firstRow) return 2
        const cells = firstRow.querySelectorAll('th, td')
        let count = 0
        cells.forEach(c => { if (!c.classList.contains('table-row-drag')) count++ })
        return count
      }
      function addDragCell(tr) {
        const dragTd = document.createElement('td')
        dragTd.className = 'table-row-drag'
        dragTd.contentEditable = false
        dragTd.style.position = 'relative'
        const handle = document.createElement('span')
        handle.className = 'table-drag-handle'
        dragTd.appendChild(handle)
        const resizeHandle = document.createElement('span')
        resizeHandle.className = 'table-row-resize'
        dragTd.appendChild(resizeHandle)
        tr.insertBefore(dragTd, tr.firstElementChild)
      }
      function addDataCell(tr, isHeader) {
        const tag = isHeader ? 'th' : 'td'
        const cell = document.createElement(tag)
        cell.contentEditable = true
        tr.appendChild(cell)
        return cell
      }
      if (action === 'row-end' || action === 'row') {
        const cols = getColCount()
        const tr = document.createElement('tr')
        addDragCell(tr)
        for (let i = 0; i < cols; i++) {
          addDataCell(tr, false)
        }
        const insertRow = table.querySelector('.table-insert-row')
        if (insertRow) {
          table.insertBefore(tr, insertRow)
          const pos = insertRow.dataset.pos ? parseInt(insertRow.dataset.pos) : 0
          insertRow.dataset.pos = (pos + 1).toString()
          const btn = insertRow.querySelector('[data-table-action="insert-row-at"]')
          if (btn) {
            const oldPos = parseInt(btn.dataset.pos, 10)
            btn.dataset.pos = (oldPos + 1).toString()
          }
        } else {
          table.appendChild(tr)
        }
        updateInsertRowColspan(table)
      } else if (action === 'col-end' || action === 'col') {
        const isFirst = true
        table.querySelectorAll('tr').forEach(tr => {
          if (tr.classList.contains('table-insert-row')) return
          const isHeaderRow = tr === table.querySelector('tr') || tr.parentElement?.tagName === 'THEAD'
          addDataCell(tr, isHeaderRow)
        })
        updateInsertRowColspan(table)
      } else if (action === 'col-left') {
        table.querySelectorAll('tr').forEach(tr => {
          if (tr.classList.contains('table-insert-row')) return
          const isHeaderRow = tr === table.querySelector('tr') || tr.parentElement?.tagName === 'THEAD'
          const cell = document.createElement(isHeaderRow ? 'th' : 'td')
          cell.contentEditable = true
          const firstRealCell = Array.from(tr.querySelectorAll('th, td')).find(c => !c.classList.contains('table-row-drag'))
          if (firstRealCell) {
            tr.insertBefore(cell, firstRealCell)
          } else {
            tr.appendChild(cell)
          }
        })
        updateInsertRowColspan(table)
      } else if (action === 'insert-row-at') {
        const pos = parseInt(tableAction.dataset.pos, 10)
        const cols = getColCount()
        const tr = document.createElement('tr')
        addDragCell(tr)
        for (let i = 0; i < cols; i++) {
          addDataCell(tr, false)
        }
        const rows = table.querySelectorAll('tr')
        let targetBefore = null
        let currentPos = 0
        let insertRowNode = null
        rows.forEach(r => {
          if (r.classList.contains('table-insert-row')) {
            insertRowNode = r
            return
          }
          if (currentPos === pos) targetBefore = r
          currentPos++
        })
        if (targetBefore) {
          table.insertBefore(tr, targetBefore)
        } else if (insertRowNode) {
          table.insertBefore(tr, insertRowNode)
        } else {
          table.appendChild(tr)
        }
        if (insertRowNode) {
          const btn = insertRowNode.querySelector('[data-table-action="insert-row-at"]')
          if (btn) btn.dataset.pos = (currentPos + 1).toString()
        }
        updateInsertRowColspan(table)
      } else if (action === 'delete-row') {
        const selectAll = tableAction.dataset.all === 'true'
        if (selectAll) {
          const allRows = table.querySelectorAll('tr:not(.table-insert-row)')
          if (allRows.length <= 2) { showToast('Need at least 1 data row', 'error'); return }
          table.querySelectorAll('tr.selected-row, tr:not(.table-insert-row)').forEach(tr => {
            if (tr !== allRows[0]) tr.remove()
          })
        } else {
          const selected = table.querySelectorAll('tr.selected-row')
          if (selected.length > 0) {
            const allRows = table.querySelectorAll('tr:not(.table-insert-row)')
            if (allRows.length - selected.length < 1) { showToast('Need at least 1 data row', 'error'); return }
            selected.forEach(tr => tr.remove())
          } else {
            const allDataRows = table.querySelectorAll('tr:not(.table-insert-row)')
            if (allDataRows.length > 1) allDataRows[allDataRows.length - 1].remove()
            else showToast('Need at least 1 data row', 'error')
          }
        }
        table.querySelectorAll('tr.selected-row').forEach(r => r.classList.remove('selected-row'))
        updateInsertRowColspan(table)
      } else if (action === 'delete-col') {
        const cols = getColCount()
        const headerCells = table.querySelector('tr')?.querySelectorAll('th:not(.table-row-drag), td:not(.table-row-drag)') || []
        if (headerCells.length <= 1) { showToast('Need at least 1 column', 'error'); return }
        let colToDelete = cols - 1
        const lastHeader = headerCells[headerCells.length - 1]
        if (lastHeader) colToDelete = Array.from(headerCells).indexOf(lastHeader)
        table.querySelectorAll('tr:not(.table-insert-row)').forEach(tr => {
          const cells = tr.querySelectorAll('th:not(.table-row-drag), td:not(.table-row-drag)')
          if (cells[colToDelete]) cells[colToDelete].remove()
        })
        updateInsertRowColspan(table)
      } else if (action === 'format') {
        showTableFormatToolbar(table, tableWrap)
        return
      }
      saveBlocks()
      return
    }

    const imageWrap = e.target.closest('.image-block-img')
    if (imageWrap) {
      const existing = document.querySelector('.image-size-controls')
      if (existing) { existing.remove(); return }
      const controls = document.createElement('div')
      controls.className = 'image-size-controls'
      ;[0.5, 0.75, 1, 1.25, 1.5].forEach(s => {
        const btn = document.createElement('button')
        btn.textContent = (s * 100) + '%'
        btn.className = 'image-size-btn' + (s === 1 ? ' active' : '')
        btn.addEventListener('click', () => {
          imageWrap.style.maxWidth = (s * 100) + '%'
          document.querySelectorAll('.image-size-btn').forEach(b => b.classList.remove('active'))
          btn.classList.add('active')
          controls.remove()
        })
        controls.appendChild(btn)
      })
      imageWrap.parentElement.appendChild(controls)
      return
    }

    /* ── Hover popup buttons ── */
    const addAbove = e.target.closest('[data-action="add-block-above"]')
    if (addAbove) {
      createBlockAfter(index - 1, 'text', '')
      return
    }
    const addCover = e.target.closest('[data-action="add-cover"]')
    if (addCover) {
      const coverEl = document.querySelector('.editor-cover')
      if (coverEl) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (ev) => {
          const file = ev.target?.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (re) => {
            const dataUrl = re.target?.result
            if (!dataUrl) return
            const pageStore = window.__pageStore
            if (pageStore) pageStore.updatePageMeta({ cover: dataUrl })
            coverEl.style.backgroundImage = `url(${dataUrl})`
            coverEl.classList.remove('editor-cover--empty')
          }
          reader.readAsDataURL(file)
        }
        input.click()
      }
      return
    }
    const addComment = e.target.closest('[data-action="add-comment"]')
    if (addComment) {
      const existing = document.querySelector('.comment-input-overlay')
      if (existing) { existing.remove(); return }
      const overlay = document.createElement('div')
      overlay.className = 'comment-input-overlay'
      overlay.innerHTML = `
        <div class="comment-input-box">
          <textarea class="comment-input-textarea" placeholder="Write a comment..." rows="3"></textarea>
          <div class="comment-input-actions">
            <button class="comment-input-btn comment-input-btn--send" data-comment-send title="Add comment">Comment</button>
            <button class="comment-input-btn" data-comment-cancel title="Cancel">Cancel</button>
          </div>
        </div>`
      blockEl.appendChild(overlay)
      const textarea = overlay.querySelector('.comment-input-textarea')
      textarea.focus()
      overlay.querySelector('[data-comment-send]').addEventListener('click', () => {
        const text = textarea.value.trim()
        if (text) {
          blockEl.dataset.comment = text
          showToast('Comment added', 'success')
        }
        overlay.remove()
      })
      overlay.querySelector('[data-comment-cancel]').addEventListener('click', () => overlay.remove())
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
      return
    }

    const blockColorBtn = e.target.closest('[data-action="block-color-btn"]')
    if (blockColorBtn) {
      showBlockColorPicker(blockEl)
      return
    }

    const duplicateBtn = e.target.closest('[data-action="block-duplicate"]')
    if (duplicateBtn) {
      duplicateBlock(index)
      return
    }

    const moveUpBtn = e.target.closest('[data-action="block-move-up"]')
    if (moveUpBtn) {
      moveBlock(index, -1)
      return
    }

    const moveDownBtn = e.target.closest('[data-action="block-move-down"]')
    if (moveDownBtn) {
      moveBlock(index, 1)
      return
    }

    const indentBtn = e.target.closest('[data-action="block-indent"]')
    if (indentBtn) {
      indentBlock(index)
      return
    }

    const deleteBtn = e.target.closest('[data-action="block-delete"]')
    if (deleteBtn) {
      deleteBlock(index)
      return
    }

    const mention = e.target.closest('.page-mention')
    if (mention) {
      const pageId = mention.dataset.pageId
      if (pageId && window.openEditor) {
        window.openEditor(pageId, mention.textContent?.replace('@', '') || '')
      }
      return
    }
  }

  const contextMenuHandler = (e) => {
    const blockEl = e.target.closest('.editor-block')
    if (!blockEl || !blocksContainer.contains(blockEl)) return
    e.preventDefault()
    const existing = document.querySelector('.context-menu')
    if (existing) existing.remove()
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.style.left = e.clientX + 'px'
    menu.style.top = e.clientY + 'px'
    const curType = Array.from(blockEl.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
    menu.innerHTML = `
      <button class="context-menu-item" data-action="duplicate" title="Duplicate block">Duplicate</button>
      <button class="context-menu-item" data-action="copy" title="Copy content">Copy content</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-action="turn-into" title="Change block type">Turn into...</button>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item" data-action="indent" title="Indent block">Indent</button>
      <button class="context-menu-item context-menu-item--danger" data-action="delete" title="Delete block">Delete block</button>`
    menu.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action
        const index = parseInt(blockEl.dataset.blockIndex, 10)
        if (action === 'duplicate') duplicateBlock(index)
        else if (action === 'delete') deleteBlock(index)
        else if (action === 'indent') indentBlock(index)
        else if (action === 'copy') {
          const text = blockEl.querySelector('.block-input')?.textContent || ''
          navigator.clipboard?.writeText(text)
          showToast('Content copied', 'success')
        } else if (action === 'turn-into') {
          menu.remove()
          showTurnIntoSubmenu(blockEl, e.clientX, e.clientY)
          return
        }
        menu.remove()
      })
    })
    document.body.appendChild(menu)
    const closeMenu = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', closeMenu) } }
    setTimeout(() => document.addEventListener('click', closeMenu), 10)
  }

  function showTurnIntoSubmenu(blockEl, x, y) {
    const existing = document.querySelector('.context-menu')
    if (existing) existing.remove()
    const curType = Array.from(blockEl.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
    const submenu = document.createElement('div')
    submenu.className = 'context-menu turn-into-submenu'
    submenu.style.left = x + 'px'
    submenu.style.top = y + 'px'
    const BLOCK_TYPES = [
      { type: 'text', label: 'Text', icon: 'A' },
      { type: 'h1', label: 'Heading 1', icon: 'H1' },
      { type: 'h2', label: 'Heading 2', icon: 'H2' },
      { type: 'h3', label: 'Heading 3', icon: 'H3' },
      { type: 'h4', label: 'Heading 4', icon: 'H4' },
      { type: 'h5', label: 'Heading 5', icon: 'H5' },
      { type: 'h6', label: 'Heading 6', icon: 'H6' },
      { type: 'quote', label: 'Quote', icon: '\u201C' },
      { type: 'divider', label: 'Divider', icon: '\u2014' },
      { type: 'checkbox', label: 'Checkbox', icon: '\u2611' },
      { type: 'toggle', label: 'Toggle', icon: '\u25B6' },
      { type: 'callout', label: 'Callout', icon: '\uD83D\uDCA1' },
      { type: 'code', label: 'Code', icon: '</>' },
      { type: 'table', label: 'Table', icon: '\u229E' },
      { type: 'columns', label: 'Columns', icon: '\u2016' },
    ]
    submenu.innerHTML = BLOCK_TYPES.map(t => `
      <button class="context-menu-item${t.type === curType ? ' context-menu-item--active' : ''}" data-turn-type="${t.type}" title="Convert to this type">
        <span class="turn-into-icon">${t.icon}</span>
        <span>${t.label}</span>
        ${t.type === curType ? '<span class="turn-into-check">\u2713</span>' : ''}
      </button>`).join('') + '<div class="context-menu-divider"></div><button class="context-menu-item" data-action="close-submenu" title="Cancel">Cancel</button>'
    submenu.querySelectorAll('[data-turn-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newType = btn.dataset.turnType
        if (newType !== curType) convertBlockType(blockEl, newType)
        submenu.remove()
      })
    })
    submenu.querySelector('[data-action="close-submenu"]').addEventListener('click', () => submenu.remove())
    document.body.appendChild(submenu)
    const closeSubmenu = (ev) => { if (!submenu.contains(ev.target)) { submenu.remove(); document.removeEventListener('click', closeSubmenu) } }
    setTimeout(() => document.addEventListener('click', closeSubmenu), 10)
  }

  const focusoutHandler = (e) => {
    const input = e.target.closest('.block-input')
    if (input && blocksContainer.contains(input)) {
      clearTimeout(saveTimer)
      saveBlocks()
      updateWordCount()
    }
  }

  const dragstartHandler = (e) => {
    const handle = e.target.closest('.block-drag-handle')
    if (!handle) return
    const blockEl = handle.closest('.editor-block')
    if (!blockEl) return
    if (blockEl.parentElement !== blocksContainer) return
    const index = parseInt(blockEl.dataset.blockIndex, 10)
    dragData = { index }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    const ghost = blockEl.cloneNode(true)
    ghost.className = 'drag-ghost'
    ghost.style.left = '-9999px'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 20, 20)
    blockEl.classList.add('dragging')
    setTimeout(() => { ghost.remove(); blockEl.classList.remove('dragging') }, 0)
  }

  const dragoverHandler = (e) => {
    const blockEl = e.target.closest('.editor-block')
    if (!blockEl || dragData === null) return
    if (dragData.type === 'table-row') return
    if (blockEl.parentElement !== blocksContainer) return
    e.preventDefault()
    document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'))
    const rect = blockEl.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (e.clientY < midY) {
      blockEl.classList.add('drop-zone')
      blockEl.style.borderTop = ''
    } else {
      blockEl.classList.add('drop-zone')
      blockEl.style.borderBottom = ''
    }
  }

  const dragleaveHandler = (e) => {
    const blockEl = e.target.closest('.editor-block')
    if (blockEl) blockEl.classList.remove('drop-zone')
  }

  const dropHandler = (e) => {
    e.preventDefault()
    document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'))
    const blockEl = e.target.closest('.editor-block')
    if (!blockEl || dragData === null) return
    if (dragData.type === 'table-row') return
    if (blockEl.parentElement !== blocksContainer) return
    const targetIndex = parseInt(blockEl.dataset.blockIndex, 10)
    if (targetIndex === dragData.index) return
    const items = $all('.editor-block', blocksContainer)
    const dragged = items[dragData.index]
    if (!dragged) return
    const rect = blockEl.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (e.clientY < midY) {
      blockEl.parentElement.insertBefore(dragged, blockEl)
    } else {
      const next = blockEl.nextElementSibling
      if (next) blockEl.parentElement.insertBefore(dragged, next)
      else blockEl.parentElement.appendChild(dragged)
    }
    reindexBlocks()
    saveBlocks()
    dragData = null
    showToast('Block moved', 'success')
  }

  const dragendHandler = () => {
    document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'))
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
    dragData = null
  }

  const imageResizeHandler = (e) => {
    const handle = e.target.closest('.image-resize-corner')
    if (!handle) return
    e.preventDefault()
    const img = handle.closest('.image-block-wrap')?.querySelector('img')
    if (!img) return
    const startX = e.clientX
    const startSize = parseFloat(img.style.maxWidth) || 100
    const onMove = (ev) => {
      const diff = ev.clientX - startX
      const newSize = Math.max(20, Math.min(100, startSize + diff / 3))
      img.style.maxWidth = newSize + '%'
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      saveBlocks()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  let selectionToolbar = null
  function showSelectionToolbar(range) {
    const existing = document.querySelector('.selection-toolbar')
    if (existing) existing.remove()
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return
    const selRange = selection.getRangeAt(0)
    const editorContainer = document.getElementById('editorContainer')
    if (!editorContainer || !editorContainer.contains(selRange.commonAncestorContainer)) return
    const rect = selRange.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const toolbar = document.createElement('div')
    toolbar.className = 'selection-toolbar'
    toolbar.innerHTML = `
      <button class="sel-tb-btn" data-sel-action="bold" title="Bold (⌘B)"><strong>B</strong></button>
      <button class="sel-tb-btn" data-sel-action="italic" title="Italic (⌘I)"><em>I</em></button>
      <button class="sel-tb-btn" data-sel-action="underline" title="Underline (⌘U)"><u>U</u></button>
      <button class="sel-tb-btn" data-sel-action="strike" title="Strikethrough"><s>S</s></button>
      <div class="sel-tb-divider"></div>
      <button class="sel-tb-btn" data-sel-action="code" title="Inline code">{ }</button>
      <button class="sel-tb-btn" data-sel-action="link" title="Link">\uD83D\uDD17</button>
      <div class="sel-tb-divider"></div>
      <button class="sel-tb-btn" data-sel-action="copy" title="Copy">\uD83D\uDCCB</button>`
    document.body.appendChild(toolbar)
    const tbWidth = toolbar.offsetWidth
    const tbHeight = toolbar.offsetHeight
    let left = rect.left + rect.width / 2 - tbWidth / 2
    let top = rect.top - tbHeight - 8
    if (top < 4) top = rect.bottom + 8
    if (left < 4) left = 4
    if (left + tbWidth > window.innerWidth - 4) left = window.innerWidth - tbWidth - 4
    toolbar.style.left = left + 'px'
    toolbar.style.top = top + 'px'
    requestAnimationFrame(() => toolbar.classList.add('open'))
    toolbar.querySelectorAll('[data-sel-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.selAction
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) { toolbar.remove(); return }
        document.execCommand(action === 'strike' ? 'strikeThrough' : action === 'code' ? 'insertHTML' : action, false, action === 'code' ? '<code>' + sel.toString() + '</code>' : null)
        if (action === 'copy') {
          navigator.clipboard?.writeText(sel.toString())
          showToast('Copied to clipboard', 'success')
        }
        if (action === 'link') {
          const url = prompt('Enter URL:')
          if (url) document.execCommand('createLink', false, url)
        }
        saveBlocks()
        toolbar.remove()
      })
    })
  }
  function selectionToolbarHandler(e) {
    setTimeout(() => {
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const container = document.getElementById('editorContainer')
        if (container && container.contains(range.commonAncestorContainer)) {
          showSelectionToolbar(range)
          return
        }
      }
      const tb = document.querySelector('.selection-toolbar')
      if (tb) tb.remove()
    }, 10)
  }
  function selectionToolbarKeyHandler(e) {
    if (e.key === 'Escape') {
      const tb = document.querySelector('.selection-toolbar')
      if (tb) tb.remove()
    }
  }

  blocksContainer.addEventListener('input', inputHandler)
  blocksContainer.addEventListener('keydown', keydownHandler)
  blocksContainer.addEventListener('keyup', keyupHandler)
  blocksContainer.addEventListener('click', clickHandler)
  blocksContainer.addEventListener('focusout', focusoutHandler)
  blocksContainer.addEventListener('contextmenu', contextMenuHandler)
  blocksContainer.addEventListener('dragstart', dragstartHandler)
  blocksContainer.addEventListener('dragover', dragoverHandler)
  blocksContainer.addEventListener('dragleave', dragleaveHandler)
  blocksContainer.addEventListener('drop', dropHandler)
  blocksContainer.addEventListener('dragend', dragendHandler)
  blocksContainer.addEventListener('mousedown', imageResizeHandler)

  const tableColResizeHandler = (e) => {
    const handle = e.target.closest('.table-col-resize')
    if (!handle) return
    e.preventDefault()
    e.stopPropagation()
    const th = handle.parentElement
    const table = th.closest('.table-block')
    if (!table) return
    const startX = e.clientX
    const startW = th.offsetWidth
    const onMove = (ev) => {
      const dx = ev.clientX - startX
      const newW = Math.max(40, startW + dx)
      th.style.width = newW + 'px'
      th.style.maxWidth = newW + 'px'
      const colIdx = Array.from(th.parentElement.children).indexOf(th)
      table.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td, th')
        if (cells[colIdx] && cells[colIdx] !== th) {
          cells[colIdx].style.width = newW + 'px'
          cells[colIdx].style.maxWidth = newW + 'px'
        }
      })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const tableRowResizeHandler = (e) => {
    const handle = e.target.closest('.table-row-resize')
    if (!handle) return
    e.preventDefault()
    e.stopPropagation()
    const tr = handle.closest('tr')
    if (!tr) return
    const startY = e.clientY
    const startH = tr.offsetHeight
    const onMove = (ev) => {
      const dy = ev.clientY - startY
      const newH = Math.max(28, startH + dy)
      tr.style.height = newH + 'px'
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const tableRowDragStartHandler = (e) => {
    const handle = e.target.closest('.table-row-drag, .table-drag-handle')
    if (!handle) return
    if (e.target.closest('.table-row-resize')) return
    const tr = handle.closest('tr')
    if (!tr || tr.classList.contains('table-insert-row')) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
    tr.classList.add('dragging-row')
    dragData = { type: 'table-row', element: tr, table: tr.closest('.table-block') }
  }

  const tableRowDragOverHandler = (e) => {
    const tr = e.target.closest('tr')
    if (!tr || !dragData || dragData.type !== 'table-row') return
    e.preventDefault()
    tr.closest('.table-block')?.querySelectorAll('.drop-zone-row').forEach(el => el.classList.remove('drop-zone-row'))
    const rect = tr.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (e.clientY < midY) tr.classList.add('drop-zone-row', 'drop-before')
    else tr.classList.add('drop-zone-row', 'drop-after')
  }

  const tableRowDropHandler = (e) => {
    const tr = e.target.closest('tr')
    if (!tr || !dragData || dragData.type !== 'table-row') return
    e.preventDefault()
    const dragged = dragData.element
    const tbody = dragged.parentElement
    const rect = tr.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (e.clientY < midY) tbody.insertBefore(dragged, tr)
    else tbody.insertBefore(dragged, tr.nextSibling)
    dragged.classList.remove('dragging-row')
    tr.closest('.table-block')?.querySelectorAll('.drop-zone-row').forEach(el => el.classList.remove('drop-zone-row'))
    dragData = null
    saveBlocks()
  }
  blocksContainer.addEventListener('mousedown', tableColResizeHandler)
  blocksContainer.addEventListener('mousedown', tableRowResizeHandler)
  blocksContainer.addEventListener('dragstart', tableRowDragStartHandler)
  blocksContainer.addEventListener('dragover', tableRowDragOverHandler)
  blocksContainer.addEventListener('drop', tableRowDropHandler)

  function blockActionHandler(e) {
    const action = e.detail?.action
    const block = e.target?.closest?.('.editor-block')
    if (!block) return
    const items = $all('.editor-block', blocksContainer)
    const index = Array.prototype.indexOf.call(items, block)
    if (index === -1) return
    if (action === 'duplicate') duplicateBlock(index)
    else if (action === 'move-up') moveBlock(index, -1)
    else if (action === 'move-down') moveBlock(index, 1)
    else if (action === 'finish') block.blur()
  }
  blocksContainer.addEventListener('block-action', blockActionHandler)

  document.addEventListener('mouseup', selectionToolbarHandler)
  document.addEventListener('keydown', selectionToolbarKeyHandler)

  cleans.push(() => blocksContainer.removeEventListener('input', inputHandler))
  cleans.push(() => blocksContainer.removeEventListener('keydown', keydownHandler))
  cleans.push(() => blocksContainer.removeEventListener('keyup', keyupHandler))
  cleans.push(() => blocksContainer.removeEventListener('click', clickHandler))
  cleans.push(() => blocksContainer.removeEventListener('focusout', focusoutHandler))
  cleans.push(() => blocksContainer.removeEventListener('contextmenu', contextMenuHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragstart', dragstartHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragover', dragoverHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragleave', dragleaveHandler))
  cleans.push(() => blocksContainer.removeEventListener('drop', dropHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragend', dragendHandler))
  cleans.push(() => blocksContainer.removeEventListener('mousedown', imageResizeHandler))
  cleans.push(() => blocksContainer.removeEventListener('mousedown', tableColResizeHandler))
  cleans.push(() => blocksContainer.removeEventListener('mousedown', tableRowResizeHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragstart', tableRowDragStartHandler))
  cleans.push(() => blocksContainer.removeEventListener('dragover', tableRowDragOverHandler))
  cleans.push(() => blocksContainer.removeEventListener('drop', tableRowDropHandler))
  cleans.push(() => blocksContainer.removeEventListener('block-action', blockActionHandler))
  cleans.push(() => document.removeEventListener('mouseup', selectionToolbarHandler))
  cleans.push(() => document.removeEventListener('keydown', selectionToolbarKeyHandler))

  if (titleInput) {
    const titleHandler = () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        if (pageStore && pageStore.updatePage) {
          const pageId = pageStore.state?.currentPageId
          if (pageId) pageStore.updatePage(pageId, { title: titleInput.value })
        }
      }, getAutosaveDelay())
    }
    const titleBlurHandler = () => {
      clearTimeout(saveTimer)
      if (pageStore && pageStore.updatePage) {
        const pageId = pageStore.state?.currentPageId
        if (pageId) pageStore.updatePage(pageId, { title: titleInput.value })
      }
    }
    titleInput.addEventListener('input', titleHandler)
    titleInput.addEventListener('blur', titleBlurHandler)
    cleans.push(() => titleInput.removeEventListener('input', titleHandler))
    cleans.push(() => titleInput.removeEventListener('blur', titleBlurHandler))
  }

  if (toolbar) {
    const tbHandler = (e) => {
      const blockInput = blocksContainer.querySelector('.editor-block:focus-within .block-input') ||
        blocksContainer.querySelector('.block-input:focus')
      if (!blockInput) {
        const first = blocksContainer.querySelector('.block-input')
        if (first) first.focus()
        else return
      }

      const btn = e.target.closest('[data-tb]')
      if (btn) {
        const cmd = btn.dataset.tb
        if (cmd === 'bold') document.execCommand('bold', false)
        else if (cmd === 'italic') document.execCommand('italic', false)
        else if (cmd === 'underline') document.execCommand('underline', false)
        else if (cmd === 'strike') document.execCommand('strikeThrough', false)
        else if (cmd === 'undo') document.execCommand('undo', false)
        else if (cmd === 'redo') document.execCommand('redo', false)
        else if (cmd === 'block-color') {
          const blockEl = blockInput.closest('.editor-block')
          if (blockEl) showBlockColorPicker(blockEl)
        }
        else if (cmd.startsWith('align-')) {
          const align = cmd.replace('align-', '')
          const blockEl = blockInput.closest('.editor-block')
          if (blockEl) blockEl.style.textAlign = align
          document.execCommand('justify' + (align === 'left' ? 'Left' : align === 'center' ? 'Center' : align === 'right' ? 'Right' : 'Full'), false)
          saveBlocks()
        }
        else if (cmd === 'insert-image') {
          const blockEl = blockInput.closest('.editor-block')
          const items = $all('.editor-block', blocksContainer)
          const index = blockEl ? parseInt(blockEl.dataset.blockIndex, 10) : items.length - 1
          createBlockAfter(index, 'image', '')
          setTimeout(() => {
            const freshItems = $all('.editor-block', blocksContainer)
            const newBlock = freshItems[index + 1]
            if (newBlock) uploadFile(newBlock)
          }, 50)
        }
        else if (cmd === 'insert-file') {
          const blockEl = blockInput.closest('.editor-block')
          const items = $all('.editor-block', blocksContainer)
          const index = blockEl ? parseInt(blockEl.dataset.blockIndex, 10) : items.length - 1
          createBlockAfter(index, 'file', '')
          setTimeout(() => {
            const freshItems = $all('.editor-block', blocksContainer)
            const newBlock = freshItems[index + 1]
            if (newBlock) uploadFile(newBlock)
          }, 50)
        }
        else if (cmd === 'ai-query') {
          showAiQueryModal(blockInput)
        }
        return
      }

      const fontFamily = e.target.closest('#tbFontFamily')
      if (fontFamily) {
        applyInlineStyle('fontFamily', fontFamily.value)
        saveBlocks()
        return
      }

      const fontSize = e.target.closest('#tbFontSize')
      if (fontSize) {
        applyInlineStyle('fontSize', fontSize.value + 'px')
        saveBlocks()
        return
      }

      const textColor = e.target.closest('#tbTextColor')
      if (textColor) {
        applyInlineStyle('color', textColor.value)
        saveBlocks()
        return
      }

      const blockType = e.target.closest('#tbBlockType')
      if (blockType) {
        const blockEl = blockInput.closest('.editor-block')
        if (blockEl) convertBlockType(blockEl, blockType.value)
        return
      }
    }

    toolbar.addEventListener('click', tbHandler)
    toolbar.addEventListener('change', tbHandler)
    cleans.push(() => toolbar.removeEventListener('click', tbHandler))
    cleans.push(() => toolbar.removeEventListener('change', tbHandler))

    const fontFamilySel = $id('tbFontFamily')
    const fontSizeSel = $id('tbFontSize')
    const textColorInput = $id('tbTextColor')
    const blockTypeSel = $id('tbBlockType')

    function updateToolbarForSelection() {
      if (!fontFamilySel || !fontSizeSel || !textColorInput || !blockTypeSel) return
      const sel = window.getSelection()
      if (!sel.rangeCount) return
      let node = sel.focusNode
      if (!node) return
      if (node.nodeType === 3) node = node.parentElement

      const blockInput = node?.closest?.('.block-input')
      if (!blockInput || !blocksContainer.contains(blockInput)) return

      const blockEl = blockInput.closest('.editor-block')
      if (blockEl) {
        const type = Array.from(blockEl.classList).find(c => c.startsWith('block-type-'))?.replace('block-type-', '') || 'text'
        blockTypeSel.value = type
      }

      const style = blockInput.style || blockInput.parentElement?.style
      if (style) {
        if (style.fontFamily) fontFamilySel.value = style.fontFamily
        if (style.fontSize) fontSizeSel.value = parseInt(style.fontSize, 10)
        if (style.color) textColorInput.value = rgbToHex(style.color)
      }
    }

    document.addEventListener('selectionchange', updateToolbarForSelection)
    cleans.push(() => document.removeEventListener('selectionchange', updateToolbarForSelection))
  }

  if (titleInput) {
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const firstBlock = blocksContainer.querySelector('.block-input')
        if (firstBlock) firstBlock.focus()
      }
    }
    titleInput.addEventListener('keydown', keyHandler)
    cleans.push(() => titleInput.removeEventListener('keydown', keyHandler))

    const blurHandler = () => {
      const pageStore = window.__pageStore
      if (pageStore) {
        pageStore.updatePageTitle(titleInput.textContent || '')
      }
    }
    titleInput.addEventListener('blur', blurHandler)
    cleans.push(() => titleInput.removeEventListener('blur', blurHandler))
  }

  const pageIconEl = $id('editorPageIcon')
  if (pageIconEl) {
    cleans.push(delegate(pageIconEl.closest('.editor-title-row'), '.editor-page-icon', 'click', (e, el) => {
      const existing = document.querySelector('.editor-icon-picker')
      if (existing) { existing.remove(); return }
      const emojis = ['📄','📝','📋','📊','📈','📉','🗂️','📁','📂','🗃️','📅','📌','📍','⭐','🔥','💡','🧠','🎯','🚀','💎','🔮','🌈','🎨','🛠️','⚙️','🔧','📎','🔗','💬','👤','🏢','📦','🎁','🏆','💪','🧩','🎭','🎪','🎤','🎵']
      const picker = document.createElement('div')
      picker.className = 'editor-icon-picker'
      picker.innerHTML = emojis.map(e => `<span class="editor-icon-opt" data-icon="${e}">${e}</span>`).join('')
      el.appendChild(picker)
      const close = (ev) => { if (!picker.contains(ev.target) && ev.target !== el) { picker.remove(); document.removeEventListener('click', close) } }
      setTimeout(() => document.addEventListener('click', close), 10)
      picker.addEventListener('click', (ev) => {
        const opt = ev.target.closest('.editor-icon-opt')
        if (!opt) return
        const icon = opt.dataset.icon
        el.textContent = icon
        el.classList.remove('editor-page-icon--empty')
        picker.remove()
        const pageStore = window.__pageStore
        if (pageStore) pageStore.updatePageMeta({ icon })
      })
    }))
  }

  const coverEl = $id('editorCover')
  if (coverEl) {
    cleans.push(delegate(coverEl, '[data-cover-action]', 'click', (e, el) => {
      const action = el.dataset.coverAction
      const pageStore = window.__pageStore
      if (!pageStore) return
      if (action === 'remove') {
        pageStore.updatePageMeta({ cover: '' })
        coverEl.innerHTML = `<div class="editor-cover-placeholder">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Add cover</span>
        </div>`
        coverEl.classList.add('editor-cover--empty')
        coverEl.setAttribute('data-cover-action', 'change')
      } else if (action === 'change' || coverEl.classList.contains('editor-cover--empty')) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (ev) => {
          const file = ev.target?.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = (re) => {
            const dataUrl = re.target?.result
            if (!dataUrl) return
            pageStore.updatePageMeta({ cover: dataUrl })
            coverEl.innerHTML = `<img class="editor-cover-img" src="${dataUrl}" alt="" />
              <div class="editor-cover-actions">
<button class="editor-cover-btn" data-cover-action="change" title="Change cover image">Change cover</button>
<button class="editor-cover-btn" data-cover-action="remove" title="Remove cover image">Remove</button>
              </div>`
            coverEl.classList.remove('editor-cover--empty')
            coverEl.removeAttribute('data-cover-action')
          }
          reader.readAsDataURL(file)
        }
        input.click()
      }
    }))
  }

  updateWordCount()

  return () => { for (const c of cleans) c() }
}

function rgbToHex(rgb) {
  const match = rgb.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (!match) return '#1a1a1a'
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0')
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0')
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0')
  return '#' + r + g + b
}

export function renderBacklinks(backlinkPages) {
  if (!backlinkPages || backlinkPages.length === 0) {
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

  const itemsHtml = backlinkPages.map(p => `
    <div class="backlinks-item" data-backlink-id="${p.id}">
      <div class="backlinks-item-dot" style="background:${getColor(p.id)}"></div>
      <span>${escHtml(p.title)}</span>
    </div>`).join('')

  return `
    <div class="backlinks-panel">
      <div class="backlinks-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span>Backlinks</span>
          <span class="backlinks-count">${backlinkPages.length}</span>
      </div>
      <div class="backlinks-list">${itemsHtml}</div>
    </div>`
}

export function mountBacklinks(router) {
  const container = document.querySelector('.backlinks-panel')
  if (!container) return

  const clean = delegate(container, '[data-backlink-id]', 'click', (e, el) => {
    const pageId = el.dataset.backlinkId
    if (pageId && router.openEditor) {
      const title = el.querySelector('span')?.textContent || ''
      router.openEditor(pageId, title)
    }
  })

  return clean
}

export function renderComments(comments, entityId) {
  if (!comments || comments.length === 0) {
    return `
      <div id="commentsSection" class="comments-section">
        <div class="comments-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Comments</span>
          <span class="comments-count">0</span>
        </div>
        <div class="comments-empty">No comments yet. Write one below.</div>
        <div class="comments-input-row">
          <textarea class="comments-textarea" placeholder="Write a comment..." rows="2"></textarea>
          <button class="comments-send-btn" data-comment-create>Comment</button>
        </div>
      </div>`
  }

  const topLevel = comments.filter(c => !c.parent_comment_id)
  const itemsHtml = topLevel.map(c => {
    const replies = comments.filter(r => r.parent_comment_id === c.id)
    const repliesHtml = replies.length
      ? `<div class="comments-replies">${replies.map(r => `
          <div class="comments-item comments-item--reply" data-comment-id="${r.id}">
            <div class="comments-item-content">${escHtml(r.content)}</div>
            <div class="comments-item-meta">
              <button class="comments-delete-btn" data-comment-delete="${r.id}" title="Delete reply">Delete</button>
            </div>
          </div>`).join('')}</div>`
      : ''
    return `
      <div class="comments-item" data-comment-id="${c.id}">
        <div class="comments-item-content">${escHtml(c.content)}</div>
        <div class="comments-item-meta">
          <button class="comments-reply-btn" data-comment-reply="${c.id}" title="Reply">Reply</button>
          <button class="comments-delete-btn" data-comment-delete="${c.id}" title="Delete">Delete</button>
        </div>
        ${repliesHtml}
      </div>`
  }).join('')

  return `
    <div id="commentsSection" class="comments-section">
      <div class="comments-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Comments</span>
        <span class="comments-count">${comments.length}</span>
      </div>
      <div class="comments-list">${itemsHtml}</div>
      <div class="comments-input-row">
        <textarea class="comments-textarea" placeholder="Write a comment..." rows="2"></textarea>
        <button class="comments-send-btn" data-comment-create>Comment</button>
      </div>
    </div>`
}

export function mountComments(entityId, api) {
  const section = $id('commentsSection')
  if (!section) return () => {}

  const cleanCreate = delegate(section, '[data-comment-create]', 'click', async () => {
    const textarea = section.querySelector('.comments-textarea')
    const text = textarea?.value.trim()
    if (!text) return
    textarea.value = ''
    try {
      await api.create(text, null)
    } catch {}
  })

  const cleanDelete = delegate(section, '[data-comment-delete]', 'click', async (e, el) => {
    const id = el.dataset.commentDelete
    if (!id) return
    try {
      await api.del(id)
    } catch {}
  })

  const cleanReply = delegate(section, '[data-comment-reply]', 'click', (e, el) => {
    const parentId = el.dataset.commentReply
    const existing = section.querySelector('.reply-input-box')
    if (existing) { existing.remove(); return }
    const box = document.createElement('div')
    box.className = 'reply-input-box'
    box.innerHTML = `
      <textarea class="comments-textarea reply-textarea" placeholder="Write a reply..." rows="2"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="comments-send-btn reply-send-btn" data-reply-parent="${parentId}">Reply</button>
        <button class="comments-delete-btn reply-cancel-btn">Cancel</button>
      </div>`
    el.parentElement.after(box)
    box.querySelector('.reply-textarea').focus()

    box.querySelector('.reply-cancel-btn')?.addEventListener('click', () => box.remove())
    box.querySelector('.reply-send-btn')?.addEventListener('click', async () => {
      const text = box.querySelector('.reply-textarea')?.value.trim()
      if (!text) return
      try {
        await api.create(text, parentId)
        box.remove()
      } catch {}
    })
  })

  return () => { cleanCreate(); cleanDelete(); cleanReply() }
}
