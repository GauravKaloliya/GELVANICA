import { $id } from '../lib/helpers.js';

export function createRouter(pageModules) {
  const state = { currentPage: null, currentParams: null, previousPage: null };

  async function navigate(page, params) {
    const main = $id('mainContent');
    main.innerHTML = `<div class="reveal visible"><div class="content" style="padding:40px 48px"><div class="editor-skeleton"><div class="editor-skeleton-title"></div><div class="editor-skeleton-block" style="width:80%"></div><div class="editor-skeleton-block" style="width:60%"></div><div class="editor-skeleton-block" style="width:90%"></div><div class="editor-skeleton-block" style="width:40%"></div><div class="editor-skeleton-block" style="width:70%"></div><div class="editor-skeleton-block" style="width:50%"></div></div></div></div>`;

    const prevMod = pageModules[state.currentPage];
    if (prevMod && typeof prevMod.unmount === 'function') {
      prevMod.unmount();
    }

    let mod = pageModules[page];
    if (!mod) {
      mod = await import('../pages/' + page + '.js');
      pageModules[page] = mod;
    }

    const html = mod.render(params);
    main.innerHTML = `<div class="reveal">${html}</div>`;
    requestAnimationFrame(() => {
      const reveal = main.querySelector('.reveal');
      if (reveal) reveal.classList.add('visible');
    });

    if (typeof mod.mount === 'function') {
      mod.mount(params);
    }

    state.previousPage = state.currentPage;
    state.currentPage = page;
    state.currentParams = params;

    document.querySelectorAll('.nav-item, .nav-page-item, .nav-item-main, [data-nav]').forEach(el => el.classList.remove('active'));

    const crumb = $id('pageCrumb');

    if (page === 'home') {
      crumb.textContent = 'Home';
      const el = document.querySelector('[data-page="home"]');
      if (el) el.classList.add('active');
    } else if (page === 'editor') {
      crumb.textContent = params?.pageTitle || 'Untitled';
      const el = document.querySelector(`[data-page-id="${params?.pageId}"]`);
      if (el) el.classList.add('active');
    } else if (page === 'entities') {
      crumb.textContent = 'Entities';
      const el = document.querySelector('[data-nav="entities"]');
      if (el) el.classList.add('active');
    } else if (page === 'tags') {
      crumb.textContent = 'Tags';
      const el = document.querySelector('[data-nav="tags"]');
      if (el) el.classList.add('active');
    } else if (page === 'graph') {
      crumb.textContent = 'Graph';
      const el = document.querySelector('[data-nav="graph"]');
      if (el) el.classList.add('active');
    } else if (page === 'search') {
      crumb.textContent = 'Search';
      const el = document.querySelector('[data-nav="search"]');
      if (el) el.classList.add('active');
    } else if (page === 'health') {
      crumb.textContent = 'Health';
      const el = document.querySelector('[data-nav="health"]');
      if (el) el.classList.add('active');
    } else if (page === 'settings') {
      crumb.textContent = 'Settings';
      const el = document.querySelector('[data-nav="settings"]');
      if (el) el.classList.add('active');
    }

    if (typeof window.renderSidebar === 'function') {
      window.renderSidebar();
    }
  }

  function goHome() {
    return navigate('home');
  }

  function openEditor(pageId, pageTitle) {
    return navigate('editor', { pageId, pageTitle });
  }

  return { state, navigate, goHome, openEditor };
}
