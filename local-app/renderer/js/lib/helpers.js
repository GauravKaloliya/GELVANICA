export function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return date.toLocaleDateString();
}

export const THEMES = ['light', 'dark', 'sepia', 'high-contrast', 'ocean', 'midnight'];

export function applyTheme(t, state, saveFn) {
  const html = document.documentElement;
  html.classList.remove(...THEMES);
  html.classList.add('theme-transitioning', t);
  if (saveFn) saveFn();
}

export function $id(id) {
  return document.getElementById(id);
}

export function $el(sel, ctx) {
  return (ctx || document).querySelector(sel);
}

export function $all(sel, ctx) {
  return (ctx || document).querySelectorAll(sel);
}

export function delegate(parent, selector, event, handler) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) handler(e, target);
  };
  parent.addEventListener(event, listener);
  return () => parent.removeEventListener(event, listener);
}

export function getSnippet(text, q, len = 80) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) {
    return text.length > len ? text.slice(0, len) + '…' : text;
  }
  const half = Math.floor((len - 1) / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(text.length, idx + q.length + half);
  if (end - start > len) end = start + len;
  let snippet = '';
  if (start > 0) snippet += '…';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '…';
  return snippet;
}

export function highlightText(text, q) {
  if (!q) return escHtml(text);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  let result = '';
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    result += escHtml(text.slice(last, match.index));
    result += '<mark class="search-highlight">' + escHtml(match[0]) + '</mark>';
    last = re.lastIndex;
  }
  result += escHtml(text.slice(last));
  return result;
}

export function makeInitialsAvatar(name) {
  const initials = (name || 'U').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'U'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#3b82f6"/><text x="12" y="15" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui,sans-serif" font-weight="600">${initials}</text></svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
