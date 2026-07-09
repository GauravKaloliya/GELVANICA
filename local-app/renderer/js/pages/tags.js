import { $id, $el, $all, escHtml } from '../lib/helpers.js'
import { TAG_COLORS } from '../store/state.js'

let _store = null
let _unsub = null
let _cleanup = null
let _selectedColor = TAG_COLORS[0]

export function render(store) {
  const state = store.state

  const colorCircles = TAG_COLORS.map(c =>
    `<div class="tag-color-opt${c === _selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}"></div>`
  ).join('')

  const mergeOptions = (excludeId) => {
    return state.tags.filter(t => t.id !== excludeId).map(t =>
      `<option value="${escHtml(t.id)}">${escHtml(t.name)}</option>`
    ).join('')
  }

  const cards = state.tags.map(t => {
    const cnt = 0
    const hasMergeTargets = state.tags.some(x => x.id !== t.id)
    return `<div class="tag-card neo-depth" data-tag-id="${escHtml(t.id)}">
      <div class="tag-card-color" style="background:${t.color}"></div>
      <div class="tag-card-name" data-id="${escHtml(t.id)}" contenteditable="true">${escHtml(t.name)}</div>
      <div class="tag-card-count">${cnt} use${cnt !== 1 ? 's' : ''}</div>
      <div class="tag-card-actions">
        ${hasMergeTargets ? `<button class="tag-action-btn tag-merge-btn" data-id="${escHtml(t.id)}" title="Merge">⊕</button>` : ''}
      </div>
      <div class="tag-merge-form" data-merge-id="${escHtml(t.id)}">
        <select class="tag-merge-select" data-merge-id="${escHtml(t.id)}">
          <option value="">Merge into…</option>
          ${mergeOptions(t.id)}
        </select>
        <button class="tag-merge-confirm" data-source="${escHtml(t.id)}" title="Confirm merge">Merge</button>
      </div>
    </div>`
  }).join('')

  const hasTags = cards.length > 0
  return `<div class="tags-page">
  <div class="tags-toolbar">
    <button class="tags-create-btn" title="Create new tag">+ New Tag</button>
  </div>
  <div class="create-tag-form">
    <input class="tags-input tag-name-input" placeholder="Tag name" maxlength="50" spellcheck="false">
    <div class="tag-color-picker">
      ${colorCircles}
    </div>
    <div class="create-tag-actions">
      <button class="tag-create-confirm" title="Confirm create tag">Create</button>
      <button class="tag-create-cancel" title="Cancel">Cancel</button>
    </div>
  </div>
  ${hasTags ? `<div class="tags-grid">${cards}</div>` : `<div class="empty-state">
    <div class="empty-state-icon">🏷️</div>
    <div class="empty-state-title">No tags yet</div>
    <div class="empty-state-desc">Create tags to categorize and organize your entities</div>
    <button class="empty-state-action tags-create-btn" title="Create tag">+ Create Tag</button>
  </div>`}
</div>`
}

export function mount(store) {
  _store = store
  const container = $id('mainContent')

  function reRender() {
    container.innerHTML = render(store)
    attachEvents()
  }

  _unsub = store.subscribe(() => reRender())

  function attachEvents() {
    if (_cleanup) {
      _cleanup()
      _cleanup = null
    }

    const createBtn = $el('.tags-create-btn', container)
    const createForm = $el('.create-tag-form', container)
    if (createBtn && createForm) {
      createBtn.addEventListener('click', () => {
        createForm.classList.add('visible')
        const inp = $el('.tag-name-input', createForm)
        if (inp) setTimeout(() => inp.focus(), 50)
        _selectedColor = TAG_COLORS[0]
        updateColorPicker()
      })
    }

    container.querySelectorAll('.tag-color-opt').forEach(el => {
      el.addEventListener('click', () => {
        _selectedColor = el.dataset.color
        updateColorPicker()
      })
    })

    function updateColorPicker() {
      container.querySelectorAll('.tag-color-opt').forEach(el => {
        el.classList.toggle('selected', el.dataset.color === _selectedColor)
      })
    }

    const confirmBtn = $el('.tag-create-confirm', container)
    const cancelBtn = $el('.tag-create-cancel', container)
    const nameInput = $el('.tag-name-input', container)

    if (confirmBtn && cancelBtn) {
      confirmBtn.addEventListener('click', () => {
        if (!nameInput) return
        const name = nameInput.value.trim()
        if (!name) return
        store.createTag(name, _selectedColor)
        nameInput.value = ''
        createForm.classList.remove('visible')
      })

      cancelBtn.addEventListener('click', () => {
        if (nameInput) nameInput.value = ''
        createForm.classList.remove('visible')
      })
    }

    container.querySelectorAll('.tag-card-name').forEach(el => {
      el.addEventListener('blur', () => {
        const id = el.dataset.id
        const name = el.textContent.trim()
        if (name) {
          store.updateTag(id, name)
        }
      })
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          el.blur()
        }
      })
    })

    container.querySelectorAll('.tag-merge-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        const form = container.querySelector(`.tag-merge-form[data-merge-id="${id}"]`)
        if (form) form.classList.toggle('visible')
      })
    })

    container.querySelectorAll('.tag-merge-confirm').forEach(btn => {
      btn.addEventListener('click', () => {
        const sourceId = btn.dataset.source
        const sel = container.querySelector(`.tag-merge-select[data-merge-id="${sourceId}"]`)
        if (!sel || !sel.value) return
        if (confirm('Merge this tag into the target? Source tag will be removed.')) {
          store.mergeTags(sourceId, sel.value)
        }
      })
    })

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (createForm) createForm.classList.remove('visible')
        container.querySelectorAll('.tag-merge-form.visible').forEach(f => f.classList.remove('visible'))
      }
    }
    document.addEventListener('keydown', keyHandler)

    _cleanup = () => {
      document.removeEventListener('keydown', keyHandler)
    }
  }

  attachEvents()
}

export function unmount() {
  if (_unsub) {
    _unsub()
    _unsub = null
  }
  if (_cleanup) {
    _cleanup()
    _cleanup = null
  }
  _store = null
}
