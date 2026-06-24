/* ═══════════════════════════════════════════
   WarTab — Page Navigation
   pageInit, renderPageNav, switchPage, addPage, deletePage, shortcuts overlay.
   Depends on: $, $$, config, saveConfig (app.js), renderAll (render.js)
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════ PAGES ═══════════════════════════════════════════ */

// Migrate a config without pages into the pages format
function pageInit() {
  if (!config.pages) {
    const id = 'page-' + uid();
    config.pages = {};
    config.pages[id] = { name: 'Page 1', icon: 'layout', cards: config.cards || [] };
    config.pageOrder = [id];
    config.currentPage = id;
    config.cards = config.pages[id].cards;
  } else {
    // Ensure currentPage is valid — fall back to first page if missing/empty
    if (!config.pages[config.currentPage] || !config.pageOrder.includes(config.currentPage)) {
      config.currentPage = config.pageOrder[0];
    }
    config.cards = config.pages[config.currentPage].cards;
  }
}

function renderPageNav() {
  const tabs = $('#page-tabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  (config.pageOrder || []).forEach(id => {
    const p = config.pages[id];
    if (!p) return;
    const tab = document.createElement('span');
    tab.className = 'page-tab' + (id === config.currentPage ? ' active' : '');

    // Page icon — part of the tab, no separate click handler
    const iconEl = document.createElement('span');
    iconEl.className = 'page-tab-icon';
    if (p.icon && isLucideName(p.icon)) {
      iconEl.appendChild(renderLucideEl(p.icon, ''));
    } else if (p.icon) {
      iconEl.textContent = p.icon;
    } else {
      iconEl.appendChild(renderLucideEl('layout', ''));
    }
    tab.appendChild(iconEl);

    // Page name — click to switch, double-click opens edit panel
    const nameSpan = document.createElement('span');
    nameSpan.textContent = p.name;
    let clickTimer = null;
    tab.addEventListener('click', () => {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = setTimeout(() => { clickTimer = null; switchPage(id); }, 250);
    });
    tab.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      openPageEditPanel(id);
    });
    tab.appendChild(nameSpan);
    tabs.appendChild(tab);
  });
  // Render Lucide SVGs for page tab icons
  renderIcons();
}
function showShortcutsOverlay() {
  const existing = document.querySelector('#shortcuts-overlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.maxWidth = '420px';
  box.innerHTML = '<div style="font-size:var(--heading-size);font-weight:700;color:var(--text-primary);margin-bottom:16px;">Keyboard Shortcuts</div>' +
    '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px;">Press a key while this window is open:</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);line-height:1.8;">' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">N</kbd><span>Add new card</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">S</kbd><span>Focus search bar</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">P</kbd><span>New page</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">C</kbd><span>Toggle config panel</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);font-weight:700;">?</kbd><span>Close this window</span>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;font-size:var(--text-2xs);color:var(--text-tertiary);">Esc to close · Ctrl+K to search anytime</div>';
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  // Focus the overlay so keydown events fire
  overlay.setAttribute('tabindex', '-1');
  overlay.focus();
  // Listen for single-key commands on the overlay itself
  function onShortcutKey(e) {
    const key = e.key.toLowerCase();
    if (key === 'n') { e.preventDefault(); overlay.remove(); addNewCard(); }
    else if (key === 's') { e.preventDefault(); overlay.remove(); const fs=$('#card-grid .inline-search-wrap input'); if(fs)fs.focus(); }
    else if (key === 'p') { e.preventDefault(); overlay.remove(); addPage(); }
    else if (key === 'c') { e.preventDefault(); overlay.remove(); toggleConfigPanel(); }
    else if (e.key === '?') { e.preventDefault(); overlay.remove(); }
    else if (e.key === 'Escape') { overlay.remove(); }
  }
  overlay.addEventListener('keydown', onShortcutKey);
  // Also capture keys globally while overlay is visible (in case focus shifts)
  document.addEventListener('keydown', onShortcutKey);
  // Clean up global listener when overlay closes
  const origRemove = overlay.remove.bind(overlay);
  overlay.remove = function() {
    document.removeEventListener('keydown', onShortcutKey);
    origRemove();
  };
}

function switchPage(pageId) {
  if (!config.pages[pageId]) return;
  config.currentPage = pageId;
  config.cards = config.pages[pageId].cards;
  saveConfig();
  const grid = $('#card-grid');
  if (grid) grid.classList.add('page-switching');
  setTimeout(function() {
    renderAll();
    renderPageNav();
    if (grid) grid.classList.remove('page-switching');
  }, 200);
}

function addPage() {
  const id = 'page-' + uid();
  config.pages[id] = { name: 'Page ' + (Object.keys(config.pages).length + 1), icon: 'layout', cards: [] };
  config.pageOrder.push(id);
  switchPage(id);
}

function deletePage(pageId) {
  if (config.pageOrder.length <= 1) return;
  const idx = config.pageOrder.indexOf(pageId);
  if (idx < 0) return;
  config.pageOrder.splice(idx, 1);
  delete config.pages[pageId];
  // Switch to nearest remaining page
  const next = config.pageOrder[Math.min(idx, config.pageOrder.length - 1)];
  config.currentPage = next;
  config.cards = config.pages[next].cards;
  saveConfig();
  renderAll();
  renderPageNav();
}
