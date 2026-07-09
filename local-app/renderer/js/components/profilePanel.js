import { $id, escHtml, makeInitialsAvatar } from '../lib/helpers.js'
import { clearAllData } from '../lib/api.js'

function formatDate(iso) {
  if (!iso) return 'Unknown'
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return iso }
}

function getAvatarSrc(user) {
  return user?.avatar_url || makeInitialsAvatar(user?.name || user?.email || 'User')
}

async function syncProfileToCloud(store, data) {
  if (!store.state.online || !store.state.authToken) return
  try {
    const cloudUrl = await window.electron.getCloudApiUrl()
    await fetch(`${cloudUrl}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${store.state.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  } catch (e) {
    console.warn('Cloud sync failed:', e)
  }
}

function renderViewMode(user, pageCount, tagCount) {
  const name = user?.name || user?.email || 'User'
  const email = user?.email || ''
  const avatarSrc = getAvatarSrc(user)
  const memberSince = formatDate(user?.created_at)

  return `
    <div class="profile-avatar-row">
      <div class="profile-avatar-wrap-lg">
        <img class="profile-avatar-lg" src="${avatarSrc}" alt="" />
      </div>
      <div class="profile-meta">
        <div class="profile-display-name">${escHtml(name)}</div>
        <div class="profile-display-email">${escHtml(email)}</div>
      </div>
      <button class="profile-edit-btn" data-action="edit-profile" title="Edit profile">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Edit</span>
      </button>
    </div>

    <div class="profile-stats-row">
      <div class="profile-stat">
        <span class="profile-stat-value">${pageCount}</span>
        <span class="profile-stat-label">Pages</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat-value">${tagCount}</span>
        <span class="profile-stat-label">Tags</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat-value">${memberSince}</span>
        <span class="profile-stat-label">Member since</span>
      </div>
    </div>

    <div class="profile-divider"></div>

    <div class="profile-field-group">
      <div class="profile-field-group-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Account</span>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Display Name</div>
        <div class="profile-field-value">${escHtml(name)}</div>
      </div>
      <div class="profile-field">
        <div class="profile-field-label">Email</div>
        <div class="profile-field-value profile-field-value--muted">${escHtml(email)}</div>
      </div>
    </div>

    <div class="profile-divider"></div>

    <div class="profile-field-group">
      <div class="profile-field-group-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86l-8.55 14.8a2 2 0 0 0 1.74 2.94h16.96a2 2 0 0 0 1.74-2.94l-8.55-14.8a2 2 0 0 0-3.48 0z"/></svg>
        <span>Danger Zone</span>
      </div>
      <div class="profile-danger-desc">This will permanently delete all pages, tags, and data. This action cannot be undone.</div>
      <button class="profile-danger-btn btn-danger" data-action="reset-data" title="Reset all data">Reset All Data</button>
    </div>`
}

function renderEditMode(user) {
  const name = user?.name || user?.email || 'User'
  const email = user?.email || ''
  const avatarSrc = getAvatarSrc(user)
  const hasAvatar = !!user?.avatar_url

  return `
    <div class="profile-edit-row">
      <label class="profile-edit-label">Avatar</label>
      <div class="profile-edit-row-content">
        <div class="profile-avatar-wrap-lg profile-avatar-wrap-lg--editable" style="margin:0 auto">
          <img class="profile-avatar-lg" id="editAvatarImg" src="${avatarSrc}" alt="" />
          <div class="profile-avatar-overlay" data-action="change-photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <div class="profile-edit-photo-actions" style="justify-content:center">
          <button class="profile-icon-btn" data-action="change-photo" title="Change photo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <button class="profile-icon-btn profile-icon-btn--remove" data-action="remove-photo" title="Remove photo" ${!hasAvatar ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="profile-edit-divider"></div>

    <div class="profile-edit-row">
      <label class="profile-edit-label">Name</label>
      <div class="profile-edit-row-content">
        <input class="profile-edit-name" id="editNameInput" type="text" value="${escHtml(name)}" maxlength="100" placeholder="Your name" autofocus />
        <div class="profile-field-error" id="editNameError"></div>
      </div>
    </div>

    <div class="profile-edit-divider"></div>

    <div class="profile-edit-row">
      <label class="profile-edit-label">Email</label>
      <div class="profile-edit-row-content">
        <div class="profile-display-email">${escHtml(email)}</div>
      </div>
    </div>

    <div class="profile-edit-divider"></div>

    <div class="profile-edit-row">
      <div class="profile-edit-row-content" style="margin-left:0">
        <div class="profile-edit-actions">
          <button class="profile-icon-btn profile-icon-btn--save" data-action="save-edit" title="Save changes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="profile-icon-btn" data-action="cancel-edit" title="Cancel editing">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="profile-save-status" id="editStatus"></div>
      </div>
    </div>`
}

export function renderProfilePanel(user, pageCount = 0, tagCount = 0) {
  return `
    <div class="profile-header">
      <h2>Profile</h2>
      <button class="profile-close" data-action="close-profile" onclick="window.closeProfile()" title="Close profile">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="profile-body">
      ${renderViewMode(user, pageCount, tagCount)}
    </div>`
}

export function mountProfilePanel(store) {
  const panel = $id('profilePanel')
  const overlay = $id('profileOverlay')
  if (!panel || !overlay) return

  const cleans = []

  function switchToEdit() {
    const body = panel.querySelector('.profile-body')
    if (!body) return
    const user = store.state.user || {}
    body.innerHTML = renderEditMode(user)
    const input = $id('editNameInput')
    if (input) { input.focus(); input.select() }
  }

  function switchToView() {
    const body = panel.querySelector('.profile-body')
    if (!body) return
    const user = store.state.user || {}
    const pageCount = store.state.pages?.length || 0
    const tagCount = store.state.tags?.length || 0
    body.innerHTML = renderViewMode(user, pageCount, tagCount)
  }

  const clickHandler = (e) => {
    const target = e.target

    if (target.closest('[data-action="close-profile"]') || (overlay && target === overlay)) {
      closeProfile(store)
      return
    }

    const actionEl = target.closest('[data-action]')
    if (!actionEl) return
    const action = actionEl.dataset.action

    switch (action) {
      case 'edit-profile': {
        switchToEdit()
        break
      }
      case 'change-photo': {
        const electron = window.electron
        if (electron && electron.selectImageFile) {
          electron.selectImageFile().then(async (sourcePath) => {
            if (!sourcePath) return
            const destPath = await electron.copyFileToDir(sourcePath, 'avatars')
            if (!destPath) return
            const img = $id('editAvatarImg')
            if (img) img.src = destPath + '?t=' + Date.now()
          }).catch(() => {})
        }
        break
      }
      case 'remove-photo': {
        const user = store.state.user || {}
        const name = user.name || user.email || 'User'
        const dicebear = getDiceBearUrl(name)
        const img = $id('editAvatarImg')
        if (img) img.src = dicebear
        const removeBtn = actionEl
        if (removeBtn) removeBtn.setAttribute('disabled', '')
        break
      }
      case 'save-edit': {
        const nameInput = $id('editNameInput')
        const statusEl = $id('editStatus')
        const name = nameInput?.value.trim()
        const errorEl = $id('editNameError')

        if (!name || name.length < 2) {
          if (errorEl) errorEl.textContent = 'Name must be at least 2 characters'
          return
        }
        if (errorEl) errorEl.textContent = ''

        const user = store.state.user || {}
        const currentName = user.name || ''
        const avatarImg = $id('editAvatarImg')
        const currentAvatar = user.avatar_url || getDiceBearUrl(currentName || 'User')
        const newAvatar = avatarImg ? avatarImg.src : currentAvatar

        if (name === currentName && newAvatar === currentAvatar) {
          if (statusEl) {
            statusEl.textContent = 'No changes to save.'
            statusEl.className = 'profile-save-status'
            setTimeout(() => { statusEl.textContent = '' }, 2000)
          }
          return
        }

        const avatarPath = newAvatar !== getDiceBearUrl(name) ? newAvatar : null

        window.electron.saveProfile({ name, avatarPath }).then(saved => {
          if (saved) {
            store.setState({ user: { ...user, name: saved.name, avatar_url: saved.avatar_path || getDiceBearUrl(saved.name) } })
            syncProfileToCloud(store, { name, avatar_url: saved.avatar_path })
          }
          switchToView()

          const sidebarName = document.querySelector('.user-name')
          if (sidebarName) sidebarName.textContent = name
          const sidebarAvatar = document.querySelector('.user-avatar')
          if (sidebarAvatar) sidebarAvatar.src = getAvatarSrc(store.state.user)
        }).catch(err => {
          if (statusEl) {
            statusEl.textContent = 'Failed to save: ' + err.message
            statusEl.className = 'profile-save-status error'
          }
        })
        break
      }
      case 'cancel-edit': {
        switchToView()
        break
      }
      case 'reset-data': {
        if (confirm('Reset all data? This will permanently delete all pages, tags, and data. This cannot be undone.')) {
          clearAllData().then(() => location.reload()).catch(e => console.error('Reset error:', e))
        }
        break
      }
    }
  }

  panel.addEventListener('click', clickHandler)

  const keydownHandler = (e) => {
    if (e.key === 'Escape') {
      const body = panel.querySelector('.profile-body')
      if (body && body.querySelector('#editNameInput')) {
        switchToView()
      } else {
        closeProfile(store)
      }
    }
  }
  document.addEventListener('keydown', keydownHandler)

  cleans.push(() => panel.removeEventListener('click', clickHandler))
  cleans.push(() => document.removeEventListener('keydown', keydownHandler))

  return () => { for (const c of cleans) c() }
}

export function openProfile(store) {
  const overlay = $id('profileOverlay')
  const panel = $id('profilePanel')
  if (!store || !panel) return
  if (overlay) overlay.classList.add('open')
  panel.classList.add('open')
  const pageCount = store.state.pages?.length || 0
  const tagCount = store.state.tags?.length || 0
  const html = renderProfilePanel(store.state.user, pageCount, tagCount)
  const body = panel.querySelector('.profile-body')
  const header = panel.querySelector('.profile-header')
  if (!body || !header) {
    panel.innerHTML = html
  } else {
    body.innerHTML = html.replace(/^[\s\S]*?<div class="profile-body">/, '').replace(/<\/div>[\s\S]*$/, '')
    header.outerHTML = html.match(/<div class="profile-header">[\s\S]*?<\/div>/)?.[0] || ''
  }
}

export function closeProfile(store) {
  const overlay = $id('profileOverlay')
  const panel = $id('profilePanel')
  if (overlay) overlay.classList.remove('open')
  if (panel) panel.classList.remove('open')
}
