import { $id, $el, escHtml } from '../lib/helpers.js'
import { ENTITY_TYPE_DEFS, RELATION_TYPE_DEFS } from '../store/state.js'

export function renderEntityDrawer(entity, allEntities, allTags, allRelTypes) {
  if (!entity) return '<div class="entity-detail-empty">Entity not found</div>'

  const def = ENTITY_TYPE_DEFS[entity.type] || { icon: '', color: '#666' }

  const allPropNames = [...new Set([...(def.properties || []).map(p => p.name), ...Object.keys(entity.properties || {})])]
  let propsHtml = ''
  for (const pn of allPropNames) {
    const val = entity.properties?.[pn] !== undefined ? entity.properties[pn] : ''
    propsHtml += `<div class="ed-prop-row">
      <span class="ed-prop-name">${escHtml(pn)}</span>
      <span class="ed-prop-value" contenteditable="true" data-prop-name="${escHtml(pn)}">${escHtml(String(val))}</span>
    </div>`
  }

  let relsHtml = ''
  const rels = (allRelTypes?.relations || []).filter(r => r.sourceId === entity.id || r.targetId === entity.id)
  for (const r of rels) {
    const isSource = r.sourceId === entity.id
    const otherId = isSource ? r.targetId : r.sourceId
    const other = (allEntities || []).find(e => e.id === otherId)
    const rd = RELATION_TYPE_DEFS[r.type] || { label: r.type, color: '#666' }
    relsHtml += `<div class="ed-rel-row">
      <span class="ed-rel-type-badge" style="background:${rd.color}22;color:${rd.color};border-color:${rd.color}44">${rd.label}</span>
      <span class="ed-rel-arrow">${isSource ? '\u2192' : '\u2190'}</span>
      <span class="ed-rel-entity" data-entity-id="${otherId}">${other ? escHtml(other.name) : 'Deleted'}</span>
      <button class="ed-rel-remove" data-rel-id="${r.id}" title="Remove relation">\u2715</button>
    </div>`
  }
  if (!rels.length) relsHtml = '<div class="ed-empty-section">No relations</div>'

  let tagsHtml = ''
  for (const tid of (entity.tags || [])) {
    const tg = (allTags || []).find(t => t.id === tid)
    if (!tg) continue
    tagsHtml += `<span class="ed-tag-chip" style="background:${tg.color}22;border-color:${tg.color}44">
      <span class="tag-color-dot" style="background:${tg.color}"></span>${escHtml(tg.name)}
      <button class="ed-tag-remove" data-tag-id="${tid}" title="Remove tag">\u2715</button>
    </span>`
  }

  const tagOptions = (allTags || []).filter(t => !(entity.tags || []).includes(t.id))
    .map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('')

  const entityOptions = (allEntities || []).filter(e => e.id !== entity.id)
    .map(e => `<option value="${e.id}">${escHtml(e.name)} (${e.type})</option>`).join('')

  const relTypeOptions = Object.keys(RELATION_TYPE_DEFS)
    .map(t => `<option value="${t}">${RELATION_TYPE_DEFS[t].label}</option>`).join('')

  return `
    <div class="ed-header-info">
      <input class="ed-name-input" value="${escHtml(entity.name)}" maxlength="200" />
      <span class="entity-type-badge ed-type-badge" style="background:${def.color}22;color:${def.color};border-color:${def.color}44">${def.icon || ''} ${entity.type}</span>
      <div class="ed-timestamps">
        <span>Created ${entity.createdAt ? formatDate(new Date(entity.createdAt)) : 'Unknown'}</span>
        <span> \u00B7 </span>
        <span>Updated ${entity.updatedAt ? formatDate(new Date(entity.updatedAt)) : 'Unknown'}</span>
      </div>
    </div>
    <div class="ed-section">
      <div class="ed-section-title">Properties</div>
      <div class="ed-props-list">${propsHtml}</div>
      <button class="ed-add-btn" data-action="toggle-add-prop" title="Add property">+ Add Property</button>
      <div id="edAddPropForm" style="display:none" class="ed-add-form">
        <input id="edNewPropName" placeholder="Property name" class="ed-add-input" />
        <input id="edNewPropVal" placeholder="Value" class="ed-add-input" />
        <button class="ed-add-confirm" data-action="confirm-add-prop" title="Confirm add property">Add</button>
      </div>
    </div>
    <div class="ed-section">
      <div class="ed-section-title">Relations</div>
      <div class="ed-rels-list">${relsHtml}</div>
      <button class="ed-add-btn" data-action="toggle-add-rel" title="Add relation">+ Add Relation</button>
      <div id="edAddRelForm" style="display:none" class="ed-add-form ed-add-form-rel">
        <select id="edNewRelEntity" class="ed-add-select"><option value="">Select entity...</option>${entityOptions}</select>
        <select id="edNewRelType" class="ed-add-select">${relTypeOptions}</select>
        <button class="ed-add-confirm" data-action="confirm-add-rel" title="Confirm add relation">Add</button>
      </div>
    </div>
    <div class="ed-section">
      <div class="ed-section-title">Tags</div>
      <div class="ed-tags-list">${tagsHtml}</div>
      <div class="ed-tag-add-wrap">
        <select class="ed-add-select" data-action="tag-select">
          <option value="">Add tag...</option>
          ${tagOptions}
        </select>
      </div>
    </div>
    <div class="ed-section ed-danger-section">
      <button class="ed-delete-btn" data-action="delete-entity" title="Delete entity">Delete Entity</button>
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

export function mountEntityDrawer(store, router) {
  const panel = $id('entityDetailPanel')
  const overlay = $id('entityDetailOverlay')
  if (!panel || !overlay) return

  const cleans = []

  function getEntityId() {
    return store.state.entityDetailId
  }

  function refresh() {
    const id = getEntityId()
    if (!id) return
    const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
    const body = panel.querySelector('.entity-detail-panel-body') || $id('entityDetailBody')
    if (!body) return
    body.innerHTML = renderEntityDrawer(entity, store.state.entities, store.state.tags, store.state.relations)
  }

  const clickHandler = (e) => {
    const target = e.target

    const closeBtn = target.closest('.entity-detail-panel-close')
    if (closeBtn) {
      closeDrawer(store)
      return
    }

    if (overlay && target === overlay) {
      closeDrawer(store)
      return
    }

    const actionEl = target.closest('[data-action]')
    if (!actionEl) {
      const relEntity = target.closest('[data-entity-id]')
      if (relEntity) {
        const eid = relEntity.dataset.entityId
        if (eid && router && router.openEntityDetail) {
          router.openEntityDetail(eid)
        }
        return
      }

      const propValue = target.closest('.ed-prop-value')
      if (propValue) return

      const nameInput = target.closest('.ed-name-input')
      if (nameInput) return
      return
    }

    const action = actionEl.dataset.action
    const id = getEntityId()

    switch (action) {
      case 'toggle-add-prop': {
        const form = $id('edAddPropForm')
        if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none'
        break
      }
      case 'confirm-add-prop': {
        const nameInput = $id('edNewPropName')
        const valInput = $id('edNewPropVal')
        const name = nameInput?.value.trim()
        const val = valInput?.value.trim()
        if (!name || !id) return
        const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
        if (!entity) return
        entity.properties = entity.properties || {}
        entity.properties[name] = val
        if (store.updateEntity) store.updateEntity(id, { properties: entity.properties })
        refresh()
        break
      }
      case 'toggle-add-rel': {
        const form = $id('edAddRelForm')
        if (form) form.style.display = form.style.display === 'none' ? 'flex' : 'none'
        break
      }
      case 'confirm-add-rel': {
        const targetSelect = $id('edNewRelEntity')
        const typeSelect = $id('edNewRelType')
        const targetId = targetSelect?.value
        const type = typeSelect?.value
        if (!targetId || !type || !id) return
        if (store.createRelation) store.createRelation(type, id, targetId)
        refresh()
        break
      }
      case 'tag-select': {
        const select = actionEl
        const tagId = select.value
        if (!tagId || !id) return
        const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
        if (!entity) return
        entity.tags = entity.tags || []
        if (!entity.tags.includes(tagId)) {
          entity.tags.push(tagId)
          if (store.updateEntity) store.updateEntity(id, { tags: entity.tags })
        }
        refresh()
        break
      }
      case 'delete-entity': {
        if (!id) return
        if (confirm('Delete this entity permanently?')) {
          if (store.deleteEntity) store.deleteEntity(id)
          closeDrawer(store)
        }
        break
      }
    }
  }

  const changeHandler = (e) => {
    const select = e.target.closest('[data-action="tag-select"]')
    if (select) {
      const id = getEntityId()
      const tagId = select.value
      if (!tagId || !id) return
      const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
      if (!entity) return
      entity.tags = entity.tags || []
      if (!entity.tags.includes(tagId)) {
        entity.tags.push(tagId)
        if (store.updateEntity) store.updateEntity(id, { tags: entity.tags })
      }
      refresh()
    }
  }

  const blurHandler = (e) => {
    const nameInput = e.target.closest('.ed-name-input')
    if (nameInput) {
      const id = getEntityId()
      const name = nameInput.value.trim()
      if (name && id && store.updateEntity) {
        store.updateEntity(id, { name })
      }
      return
    }

    const propValue = e.target.closest('.ed-prop-value')
    if (propValue) {
      const id = getEntityId()
      const propName = propValue.dataset.propName
      const val = propValue.textContent
      if (id && propName) {
        const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
        if (!entity) return
        entity.properties = entity.properties || {}
        entity.properties[propName] = val
        if (store.updateEntity) store.updateEntity(id, { properties: entity.properties })
      }
      return
    }
  }

  const relRemoveHandler = (e) => {
    const btn = e.target.closest('.ed-rel-remove')
    if (!btn) return
    const relId = btn.dataset.relId
    if (!relId) return
    if (confirm('Remove this relation?')) {
      if (store.deleteRelation) store.deleteRelation(relId)
      refresh()
    }
  }

  const tagRemoveHandler = (e) => {
    const btn = e.target.closest('.ed-tag-remove')
    if (!btn) return
    const tagId = btn.dataset.tagId
    const id = getEntityId()
    if (!tagId || !id) return
    const entity = store.getEntity ? store.getEntity(id) : store.state.entities.find(e => e.id === id)
    if (!entity) return
    entity.tags = (entity.tags || []).filter(t => t !== tagId)
    if (store.updateEntity) store.updateEntity(id, { tags: entity.tags })
    refresh()
  }

  panel.addEventListener('click', clickHandler)
  panel.addEventListener('change', changeHandler)
  panel.addEventListener('blur', blurHandler, true)
  panel.addEventListener('click', relRemoveHandler)
  panel.addEventListener('click', tagRemoveHandler)

  const keydownHandler = (e) => {
    if (e.key === 'Escape') {
      closeDrawer(store)
    }
  }
  document.addEventListener('keydown', keydownHandler)

  cleans.push(() => panel.removeEventListener('click', clickHandler))
  cleans.push(() => panel.removeEventListener('change', changeHandler))
  cleans.push(() => panel.removeEventListener('blur', blurHandler, true))
  cleans.push(() => panel.removeEventListener('click', relRemoveHandler))
  cleans.push(() => panel.removeEventListener('click', tagRemoveHandler))
  cleans.push(() => document.removeEventListener('keydown', keydownHandler))

  return () => { for (const c of cleans) c() }
}

export function openDrawer(entityId, store) {
  store.setState({ entityDetailId: entityId })
  const overlay = $id('entityDetailOverlay')
  const panel = $id('entityDetailPanel')
  if (overlay) overlay.classList.add('open')
  if (panel) panel.classList.add('open')
  const entity = store.getEntity ? store.getEntity(entityId) : store.state.entities.find(e => e.id === entityId)
  const body = $id('entityDetailBody')
  if (body) {
    body.innerHTML = renderEntityDrawer(entity, store.state.entities, store.state.tags, store.state.relations)
  }
}

export function closeDrawer(store) {
  store.setState({ entityDetailId: null })
  const overlay = $id('entityDetailOverlay')
  const panel = $id('entityDetailPanel')
  if (overlay) overlay.classList.remove('open')
  if (panel) panel.classList.remove('open')
}
