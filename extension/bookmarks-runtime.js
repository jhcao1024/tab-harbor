/**
 * bookmarks-runtime.js
 *
 * Integrated hierarchical Bookmarks view.
 * Fully localized and design-consistent.
 */

'use strict';

(function attachBookmarksRuntime(globalScope) {
  const { t } = globalScope.TabHarborI18n || { t: (k) => k };
  const iconUtils = globalScope.TabOutIconUtils || {};
  
  const escapeHtml = (v) => {
    if (typeof iconUtils.escapeHtml === 'function') return iconUtils.escapeHtml(v);
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const escapeHtmlAttr = (v) => {
    if (typeof iconUtils.escapeHtmlAttribute === 'function') return iconUtils.escapeHtmlAttribute(v);
    return String(v || '').replace(/"/g, '&quot;');
  };
  const getFallbackLabel = (l, h) => {
    if (typeof iconUtils.getFallbackLabel === 'function') return iconUtils.getFallbackLabel(l, h);
    return (l || '?').slice(0, 2).toUpperCase();
  };
  const getIconSources = (node) => {
    if (typeof iconUtils.getIconSources === 'function') return iconUtils.getIconSources({ url: node.url, title: node.title }, 16);
    return { sources: [], hostname: '' };
  };

  let navigationStack = [{ id: 'root', title: t('libraryLabel') }];
  let draggedBookmarkId = '';
  let draggedBookmarkEl = null;
  let bookmarkDragState = null;
  let bookmarkPlaceholderEl = null;
  let bookmarkDropTargetState = null;
  let suppressBookmarkClickUntil = 0;

  const ICONS = {
    trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`,
    open: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>`,
    back: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9" /></svg>`,
    drag: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" /></svg>`
  };

  const style = document.createElement('style');
  style.textContent = `
    #bookmarks-view .chip-action, #bookmarks-view .nav-back-btn { 
      display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; background: transparent; border: none; color: var(--muted); cursor: pointer; opacity: 0.48; transition: all 0.15s ease; 
    }
    #bookmarks-view .chip-action:hover, #bookmarks-view .nav-back-btn:hover { 
      opacity: 1; background: rgba(154, 145, 138, 0.1); color: var(--ink); 
    }
    #bookmarks-view .nav-back-btn { margin-right: 12px; }
    #bookmarks-view .nav-back-btn svg { width: 14px; height: 14px; }
    #bookmarks-view .chip-action.chip-delete:hover { color: var(--status-abandoned); background: rgba(179, 90, 90, 0.08); }
    #bookmarks-view .chip-action svg { width: 13px !important; height: 13px !important; pointer-events: none; }
    
    #bookmarks-view .navigation-header { display: flex; align-items: center; margin-bottom: 4px; padding: 0 4px; }
    #bookmarks-view .breadcrumb-trail { 
      display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; 
      justify-content: flex-start; overflow-x: auto; scrollbar-width: none; 
    }
    #bookmarks-view .breadcrumb-trail::-webkit-scrollbar { display: none; }
    #bookmarks-view .breadcrumb-pill { 
      font-family: 'Public Sans', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); background: rgba(154, 145, 138, 0.06); padding: 4px 10px; border-radius: 999px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; border: 1px solid transparent; 
    }
    #bookmarks-view .breadcrumb-pill:hover { color: var(--workspace-accent); background: var(--workspace-accent-soft); border-color: var(--workspace-accent-border); }
    #bookmarks-view .breadcrumb-pill.is-current { color: var(--workspace-accent); background: var(--workspace-accent-soft); border-color: var(--workspace-accent-border); cursor: default; }
    #bookmarks-view .breadcrumb-separator { color: var(--muted); opacity: 0.3; font-size: 10px; margin: 0 1px; }
    #bookmarks-view .breadcrumb-pill.is-drop-target,
    #bookmarks-view .page-chip.is-drop-target {
      color: var(--workspace-accent);
      background: color-mix(in srgb, var(--workspace-accent-soft) 42%, rgba(248, 245, 240, 0.92));
      border-color: color-mix(in srgb, var(--workspace-accent-border) 54%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace-accent) 14%, transparent);
    }
    
    #bookmarks-view .chip-folder-icon { width: 14px; height: 14px; color: var(--muted); margin-right: 6px; display: flex; align-items: center; }
    #bookmarks-view .page-chip:hover .chip-folder-icon { color: var(--workspace-accent); }
    #bookmarks-view .mission-pages { display: flex; flex-direction: column; gap: 6px; }
    #bookmarks-view .page-chip .chip-text { font-family: 'Public Sans', sans-serif; font-size: 13px; font-weight: 400; line-height: 1.4; color: var(--ink); }
    
    #bookmarks-view .mission-heading .mission-name {
      font-family: 'Libre Caslon Display', serif;
      font-size: 18px;
      font-weight: 400;
      color: var(--ink);
    }
  `;
  document.head.appendChild(style);

  function getCurrentFolderId() {
    return navigationStack[navigationStack.length - 1]?.id || 'root';
  }

  function getBookmarkParentId(folderId, children) {
    if (folderId && folderId !== 'root') return String(folderId);
    const firstParentId = Array.isArray(children)
      ? children.find(child => child?.parentId)?.parentId
      : '';
    return String(firstParentId || '0');
  }

  function moveBookmark(id, destination) {
    return new Promise((resolve, reject) => {
      try {
        chrome.bookmarks.move(String(id), destination, (result) => {
          const error = chrome.runtime?.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function reorderBookmarksInFolder(parentId, orderIds) {
    if (!parentId || !Array.isArray(orderIds) || orderIds.length < 2) return;
    for (let index = 0; index < orderIds.length; index += 1) {
      await moveBookmark(orderIds[index], { parentId: String(parentId), index });
    }
  }

  function clearBookmarkDropTargetState() {
    bookmarkDropTargetState?.element?.classList?.remove('is-drop-target');
    bookmarkDropTargetState = null;
  }

  function setBookmarkDropTargetState(nextTarget) {
    const currentElement = bookmarkDropTargetState?.element || null;
    const nextElement = nextTarget?.element || null;
    if (currentElement === nextElement &&
        bookmarkDropTargetState?.type === nextTarget?.type &&
        bookmarkDropTargetState?.folderId === nextTarget?.folderId) {
      return;
    }

    currentElement?.classList?.remove('is-drop-target');
    bookmarkDropTargetState = nextTarget || null;
    nextElement?.classList?.add('is-drop-target');
  }

  function detectBookmarkDropTarget(clientX, clientY) {
    const hitEl = document.elementFromPoint(clientX, clientY);
    if (!hitEl) return null;

    const breadcrumbEl = hitEl.closest('#bookmarks-view [data-bm-drop-breadcrumb-id]');
    if (breadcrumbEl) {
      const folderId = String(breadcrumbEl.dataset.bmDropBreadcrumbId || '');
      if (folderId && folderId !== 'root') {
        return { type: 'breadcrumb', folderId, element: breadcrumbEl };
      }
    }

    const folderChipEl = hitEl.closest('#bookmarks-view [data-bm-drop-folder-id]');
    if (folderChipEl) {
      const folderId = String(folderChipEl.dataset.bmDropFolderId || '');
      if (folderId && folderId !== draggedBookmarkId) {
        return { type: 'folder', folderId, element: folderChipEl };
      }
    }

    return null;
  }

  async function moveBookmarkIntoFolder(id, folderId) {
    if (!id || !folderId || folderId === 'root') return;
    const folder = await getFolder(folderId);
    const children = Array.isArray(folder?.children) ? folder.children : [];
    await moveBookmark(id, {
      parentId: String(folderId),
      index: children.length,
    });
  }

  function removeBookmarkChipFromCurrentView(bookmarkId) {
    const missionPages = document.querySelector('#bookmarks-view .mission-pages');
    if (!missionPages) return;

    [...missionPages.querySelectorAll('[data-bm-sort-id]')].forEach((node) => {
      if ((node.dataset?.bmSortId || '') === String(bookmarkId)) {
        node.remove();
      }
    });

    const hasItems = !!missionPages.querySelector('[data-bm-sort-id]');
    const emptyState = missionPages.querySelector('.deferred-empty');
    if (!hasItems && !emptyState) {
      missionPages.insertAdjacentHTML('beforeend', `<div class="deferred-empty">${escapeHtml(t('emptyFolderMessage'))}</div>`);
    } else if (hasItems && emptyState) {
      emptyState.remove();
    }
  }

  function ensureBookmarkPlaceholder() {
    if (bookmarkPlaceholderEl || !draggedBookmarkEl) return bookmarkPlaceholderEl;

    bookmarkPlaceholderEl = document.createElement('div');
    bookmarkPlaceholderEl.className = 'chip-reorder-placeholder chip-reorder-placeholder-preview';
    const placeholderHeight = bookmarkDragState?.height || draggedBookmarkEl.getBoundingClientRect().height;
    bookmarkPlaceholderEl.style.height = `${placeholderHeight}px`;
    bookmarkPlaceholderEl.setAttribute('aria-hidden', 'true');
    bookmarkPlaceholderEl.innerHTML = draggedBookmarkEl.innerHTML;
    draggedBookmarkEl.insertAdjacentElement('afterend', bookmarkPlaceholderEl);
    return bookmarkPlaceholderEl;
  }

  function clearBookmarkDragState() {
    draggedBookmarkId = '';
    bookmarkDragState = null;
    bookmarkPlaceholderEl?.remove();
    bookmarkPlaceholderEl = null;
    clearBookmarkDropTargetState();
    document.body.classList.remove('page-chip-list-dragging');

    if (draggedBookmarkEl) {
      draggedBookmarkEl.classList.remove('is-dragging');
      draggedBookmarkEl.style.removeProperty('--drag-left');
      draggedBookmarkEl.style.removeProperty('--drag-top');
      draggedBookmarkEl.style.removeProperty('--drag-width');
    }

    draggedBookmarkEl = null;
  }

  function updateDraggedBookmarkPosition(clientX, clientY) {
    if (!draggedBookmarkEl || !bookmarkDragState) return;
    draggedBookmarkEl.style.setProperty('--drag-left', `${clientX - bookmarkDragState.offsetX}px`);
    draggedBookmarkEl.style.setProperty('--drag-top', `${clientY - bookmarkDragState.offsetY}px`);
  }

  function animateBookmarkItems(listEl, previousRects) {
    listEl?.querySelectorAll('[data-bm-sort-id]').forEach((item) => {
      if (item.classList.contains('is-dragging')) return;

      const key = item.dataset.bmSortId || '';
      const previousRect = previousRects.get(key);
      if (!previousRect) return;

      const nextRect = item.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (!deltaX && !deltaY) return;

      item.style.transition = 'none';
      item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      requestAnimationFrame(() => {
        item.style.transition = 'transform 0.16s ease';
        item.style.transform = '';
      });
    });
  }

  function previewBookmarkOrder(dragMidY) {
    const listEl = bookmarkDragState?.listEl;
    if (!listEl || !draggedBookmarkId) return;

    const placeholder = ensureBookmarkPlaceholder();
    const previousRects = new Map();
    const items = [...listEl.querySelectorAll('[data-bm-sort-id]:not(.is-dragging)')];

    items.forEach((item) => {
      previousRects.set(item.dataset.bmSortId || '', item.getBoundingClientRect());
    });

    let insertBeforeItem = null;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (dragMidY < rect.top + rect.height / 2) {
        insertBeforeItem = item;
        break;
      }
    }

    if (insertBeforeItem) {
      listEl.insertBefore(placeholder, insertBeforeItem);
    } else {
      listEl.appendChild(placeholder);
    }

    animateBookmarkItems(listEl, previousRects);
  }

  async function getFolder(id) {
    return new Promise((resolve) => {
      try {
        if (id === 'root') {
          chrome.bookmarks.getTree((tree) => {
            if (!tree || !tree[0]) resolve(null);
            else resolve({ id: 'root', title: t('libraryLabel'), children: tree[0].children || [] });
          });
        } else {
          chrome.bookmarks.getSubTree(id, (res) => {
            resolve(res && res[0] ? res[0] : null);
          });
        }
      } catch (e) { resolve(null); }
    });
  }

  function createChipHtml(node) {
    const isFolder = !node.url;
    const title = node.title || (isFolder ? t('folderLabel') : t('untitledLabel'));
    const sources = getIconSources(node);
    const favicon = sources.sources[0] || '';
    const fallback = isFolder ? `<div class="chip-folder-icon">${ICONS.folder}</div>` : getFallbackLabel(title, sources.hostname);

    return `
      <div class="page-chip clickable" 
           data-action="bm-enter-folder" 
           data-bm-sort-id="${escapeHtmlAttr(node.id)}"
           ${isFolder ? `data-bm-drop-folder-id="${escapeHtmlAttr(node.id)}"` : ''}
           data-id="${node.id}" 
           data-title="${escapeHtmlAttr(title)}"
           ${node.url ? `data-url="${escapeHtmlAttr(node.url)}"` : ''}>
        <button class="drawer-reorder-handle chip-reorder-handle" type="button" data-bm-drag-handle="bookmark" aria-label="${escapeHtmlAttr(t('dragReorderTab') || 'Drag to reorder bookmark')}">
          ${ICONS.drag}
        </button>
        ${favicon && !isFolder ? `<img class="chip-favicon" src="${favicon}" alt="" style="pointer-events:none">` : fallback}
        <span class="chip-text" style="pointer-events:none">${escapeHtml(title)}</span>
        <div class="chip-actions">
           ${!isFolder ? `<button class="chip-action" data-action="bm-open" data-url="${escapeHtmlAttr(node.url)}">${ICONS.open}</button>` : ''}
           <button class="chip-action chip-delete" data-action="bm-delete" data-id="${node.id}" data-type="${isFolder ? 'folder' : 'bookmark'}">${ICONS.trash}</button>
        </div>
      </div>`;
  }

  async function renderView(id) {
    const container = document.getElementById('bookmarksMissions');
    if (!container) return;
    const folder = await getFolder(id);
    if (!folder) return;

    const children = folder.children || [];
    const parentId = getBookmarkParentId(id, children);

    const breadcrumbs = navigationStack.map((step, i) => {
      const isLast = i === navigationStack.length - 1;
      const dropAttr = !isLast && step.id !== 'root'
        ? ` data-bm-drop-breadcrumb-id="${escapeHtmlAttr(step.id)}"`
        : '';
      return `<span class="breadcrumb-pill ${isLast ? 'is-current' : ''}" data-action="bm-jump" data-index="${i}"${dropAttr}>${escapeHtml(step.title)}</span>` + (isLast ? '' : '<span class="breadcrumb-separator">/</span>');
    }).join('');

    const backBtn = navigationStack.length > 1 ? `<button class="nav-back-btn" data-action="bm-back">${ICONS.back}</button>` : '';

    container.innerHTML = `
      <div class="navigation-header">
        ${backBtn}
        <div class="breadcrumb-trail">${breadcrumbs}</div>
      </div>
      <div class="mission-card has-neutral-bar">
        <div class="mission-content">
          <div class="mission-pages" data-bm-parent-id="${escapeHtmlAttr(parentId)}">
            ${children.map(createChipHtml).join('')}
            ${children.length === 0 ? `<div class="deferred-empty">${t('emptyFolderMessage')}</div>` : ''}
          </div>
        </div>
      </div>`;

    const trail = container.querySelector('.breadcrumb-trail');
    if (trail && trail.scrollWidth > trail.clientWidth) trail.scrollLeft = trail.scrollWidth;
  }

  // SCOPED click listener to prevent interference
  document.addEventListener('click', async (e) => {
    // Only handle clicks inside the bookmarks view
    const isBookmarkArea = !!e.target.closest('#bookmarks-view');
    if (!isBookmarkArea) return;
    if (Date.now() < suppressBookmarkClickUntil) return;
    if (e.target.closest('[data-bm-drag-handle="bookmark"]')) return;

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action;

    if (act === 'bm-enter-folder') {
      if (el.dataset.url) chrome.tabs.create({ url: el.dataset.url });
      else {
        navigationStack.push({ id: el.dataset.id, title: el.dataset.title });
        renderView(el.dataset.id);
      }
    } else if (act === 'bm-jump') {
      const idx = parseInt(el.dataset.index, 10);
      if (idx === navigationStack.length - 1) return;
      navigationStack = navigationStack.slice(0, idx + 1);
      renderView(navigationStack[idx].id);
    } else if (act === 'bm-back') {
      if (navigationStack.length > 1) {
        navigationStack.pop();
        renderView(navigationStack[navigationStack.length - 1].id);
      }
    } else if (act === 'bm-open') {
      chrome.tabs.create({ url: el.dataset.url });
    } else if (act === 'bm-delete') {
      e.stopPropagation();
      const type = el.dataset.type || 'bookmark';
      const title = el.closest('.page-chip')?.dataset.title || 'item';
      
      // Both folder and bookmark now show the "cannot be undone" warning
      const msg = type === 'folder' 
        ? t('deleteConfirmFolder', { title }) 
        : t('deleteConfirmBookmark', { title });
        
      if (confirm(msg)) {
        chrome.bookmarks[type === 'folder' ? 'removeTree' : 'remove'](el.dataset.id, () => {
          renderView(navigationStack[navigationStack.length - 1].id);
        });
      }
    }
  });

  document.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('[data-bm-drag-handle="bookmark"]');
    if (!handle || e.button !== 0) return;

    const item = handle.closest('[data-bm-sort-id]');
    const listEl = item?.closest('.mission-pages');
    const parentId = listEl?.dataset.bmParentId || '';
    if (!item || !listEl || !parentId) return;

    e.preventDefault();
    draggedBookmarkId = item.dataset.bmSortId || '';
    draggedBookmarkEl = item;

    const rect = item.getBoundingClientRect();
    bookmarkDragState = {
      parentId,
      listEl,
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      height: rect.height,
      moved: false,
    };
  });

  document.addEventListener('pointermove', (e) => {
    if (!draggedBookmarkId || !bookmarkDragState) return;

    const distance = Math.hypot(e.clientX - bookmarkDragState.x, e.clientY - bookmarkDragState.y);
    if (!bookmarkDragState.moved && distance < 4) return;

    if (!bookmarkDragState.moved) {
      bookmarkDragState.moved = true;
      document.body.classList.add('page-chip-list-dragging');
      draggedBookmarkEl?.classList.add('is-dragging');
      draggedBookmarkEl?.style.setProperty('--drag-width', `${draggedBookmarkEl.getBoundingClientRect().width}px`);
      ensureBookmarkPlaceholder();
    }

    updateDraggedBookmarkPosition(e.clientX, e.clientY);
    const dropTarget = detectBookmarkDropTarget(e.clientX, e.clientY);
    if (dropTarget) {
      setBookmarkDropTargetState(dropTarget);
      bookmarkPlaceholderEl?.remove();
      bookmarkPlaceholderEl = null;
      return;
    }

    clearBookmarkDropTargetState();
    const dragMidY = e.clientY - bookmarkDragState.offsetY + ((bookmarkDragState.height || 0) / 2);
    previewBookmarkOrder(dragMidY);
  });

  document.addEventListener('pointerup', async () => {
    if (!draggedBookmarkId || !bookmarkDragState) return;

    const moved = bookmarkDragState.moved;
    if (moved) {
      suppressBookmarkClickUntil = Date.now() + 250;
      const dropTarget = bookmarkDropTargetState;
      if (dropTarget?.folderId) {
        const draggedId = draggedBookmarkId;
        try {
          await moveBookmarkIntoFolder(draggedId, dropTarget.folderId);
          draggedBookmarkEl?.remove();
          clearBookmarkDragState();
          removeBookmarkChipFromCurrentView(draggedId);
        } catch (error) {
          clearBookmarkDragState();
          await renderView(getCurrentFolderId());
        }
        return;
      }

      const orderIds = [...bookmarkDragState.listEl.children]
        .map((node) => {
          if (node === bookmarkPlaceholderEl) return draggedBookmarkId;
          if (node === draggedBookmarkEl) return '';
          return node.dataset?.bmSortId || '';
        })
        .filter(Boolean);

      if (draggedBookmarkEl && bookmarkPlaceholderEl) {
        bookmarkDragState.listEl.insertBefore(draggedBookmarkEl, bookmarkPlaceholderEl);
      }

      try {
        await reorderBookmarksInFolder(bookmarkDragState.parentId, orderIds);
        clearBookmarkDragState();
      } catch (error) {
        clearBookmarkDragState();
        await renderView(getCurrentFolderId());
      }
      return;
    }

    clearBookmarkDragState();
  });

  globalScope.TabHarborBookmarksRuntime = {
    render: async () => {
      // Find the Bookmarks Bar automatically
      const tree = await new Promise(resolve => chrome.bookmarks.getTree(resolve));
      const rootChildren = (tree && tree[0] && tree[0].children) || [];
      
      // ID '1' is the standard for Bookmarks Bar in Chrome/Edge. 
      // We also check titles as a fallback for different environments.
      let bookmarksBar = rootChildren.find(c => c.id === '1');
      if (!bookmarksBar) {
        bookmarksBar = rootChildren.find(c => 
          c.title === 'Bookmarks Bar' || 
          c.title === '书签栏' || 
          c.title === 'Favorites Bar'
        );
      }

      if (bookmarksBar) {
        navigationStack = [
          { id: 'root', title: t('libraryLabel') },
          { id: bookmarksBar.id, title: bookmarksBar.title }
        ];
        renderView(bookmarksBar.id);
      } else {
        navigationStack = [{ id: 'root', title: t('libraryLabel') }];
        renderView('root');
      }
    }
  };

  setTimeout(() => globalScope.TabHarborBookmarksRuntime.render(), 150);

})(typeof globalThis !== 'undefined' ? globalThis : window);
