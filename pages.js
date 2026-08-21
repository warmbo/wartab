/* ═══════════════════════════════════════════
   WarTab — Page Navigation
   pageInit, renderPageNav, switchPage, addPage, deletePage, shortcuts overlay.
   Depends on: $, $$, config, saveConfig (app.js), renderAll (render.js)
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════ PAGES ═══════════════════════════════════════════ */

// Normalize legacy page shapes and expose a compatibility alias for current-page cards.
function pageInit() {
  config = WarTabConfigModel.normalizePages(config, uid);
  WarTabConfigModel.attachCurrentCardsAlias(config);
}

function renderPageNav() {
  const tabs = $('#page-tabs');
  if (!tabs) return;
  Array.from(tabs.children).forEach(WarTabLifecycle.cleanupSubtree);
  tabs.innerHTML = '';

  // Wrap tabs in a scrollable container with overflow arrows
  var scrollWrap = document.createElement('div');
  scrollWrap.className = 'page-tabs-scroll';
  var inner = document.createElement('div');
  inner.className = 'page-tabs-inner';
  scrollWrap.appendChild(inner);

  (config.pageOrder || []).forEach(id => {
    const p = config.pages[id];
    if (!p) return;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.pageId = id;
    tab.className = 'page-tab' + (id === config.currentPage ? ' active' : '');
    if (id === config.currentPage) tab.setAttribute('aria-current', 'page');

    // Page icon
    const iconEl = document.createElement('span');
    iconEl.className = 'page-tab-icon';
    iconEl.appendChild(ds.icon(p.icon, 'page-tab-icon-glyph', 'layout'));
    tab.appendChild(iconEl);

    // Page name
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
    inner.appendChild(tab);
  });

  // Left/right scroll arrows
  var leftArrow = document.createElement('button');
  leftArrow.className = 'page-tab-arrow page-tab-arrow-left';
  leftArrow.innerHTML = '&#9664;';
  leftArrow.title = 'Scroll left';
  leftArrow.addEventListener('click', function() { inner.scrollBy({ left: -120, behavior: 'smooth' }); });

  var rightArrow = document.createElement('button');
  rightArrow.className = 'page-tab-arrow page-tab-arrow-right';
  rightArrow.innerHTML = '&#9654;';
  rightArrow.title = 'Scroll right';
  rightArrow.addEventListener('click', function() { inner.scrollBy({ left: 120, behavior: 'smooth' }); });

  // Show/hide arrows based on overflow
  function updateArrows() {
    var hasOverflow = inner.scrollWidth > inner.clientWidth;
    leftArrow.style.display = hasOverflow && inner.scrollLeft > 0 ? '' : 'none';
    rightArrow.style.display = hasOverflow && inner.scrollLeft < inner.scrollWidth - inner.clientWidth - 2 ? '' : 'none';
  }
  inner.addEventListener('scroll', updateArrows);
  // Use ResizeObserver for container size changes
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(updateArrows);
    ro.observe(inner);
    WarTabLifecycle.addCleanup(inner, function() { ro.disconnect(); });
  }

  tabs.appendChild(leftArrow);
  tabs.appendChild(scrollWrap);
  tabs.appendChild(rightArrow);
  setTimeout(updateArrows, 50);
  renderIcons();
}
function showShortcutsOverlay() {
  const existing = document.querySelector('#shortcuts-overlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.className = 'modal-overlay shortcuts-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box shortcuts-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Keyboard shortcuts');

  // Header with icon, title, close button — matching slide-panel-header convention
  const hdr = document.createElement('div');
  hdr.className = 'shortcuts-head';
  hdr.innerHTML = '<span class="shortcuts-title"><i data-lucide="keyboard"></i>Keyboard Shortcuts</span>';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn-glass btn-icon';
  closeBtn.setAttribute('aria-label', 'Close shortcuts');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  hdr.appendChild(closeBtn);
  box.appendChild(hdr);

  // Grouped shortcut list — every real keybinding in the app
  const groups = [
    { title: 'Navigate', rows: [
      ['Ctrl K', 'Command palette', 'Search anything · links · actions'],
      ['Ctrl L', 'Focus search bar', 'First search card on the page'],
      ['Ctrl Tab', 'Next page', 'Cycle through dashboard pages'],
      ['Ctrl Shift C', 'Settings', 'Open configuration panel'],
    ]},
    { title: 'While palette is open', rows: [
      ['↑ ↓', 'Move selection', 'Arrow keys navigate results'],
      ['↵', 'Open selected', 'Launch the highlighted item'],
      ['Esc', 'Close overlay', 'Dismiss palette or menu'],
    ]},
    { title: 'Actions', rows: [
      ['N', 'Add new card', 'Open the card gallery'],
      ['P', 'New page', 'Create and switch to a new page'],
      ['S', 'Focus search', 'Jump to the search input'],
      ['C', 'Toggle settings', 'Open or close config panel'],
      ['?', 'Close this window', 'Press again to dismiss'],
    ]},
  ];
  groups.forEach(g => {
    const group = document.createElement('div');
    group.className = 'shortcuts-group';
    const title = document.createElement('div');
    title.className = 'shortcuts-group-title';
    title.textContent = g.title;
    group.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'shortcut-grid';
    g.rows.forEach(r => {
      const k = document.createElement('kbd');
      k.className = 'kbd-shortcut';
      k.textContent = r[0];
      const label = document.createElement('span');
      label.textContent = r[1];
      const hint = document.createElement('small');
      hint.className = 'shortcuts-hint';
      hint.textContent = r[2];
      const cell = document.createElement('span');
      cell.appendChild(label);
      cell.appendChild(hint);
      grid.appendChild(k);
      grid.appendChild(cell);
    });
    group.appendChild(grid);
    box.appendChild(group);
  });

  const foot = document.createElement('div');
  foot.className = 'shortcuts-foot';
  foot.textContent = 'Esc closes this window · Ctrl+K searches anytime';
  box.appendChild(foot);

  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  renderIcons();
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
  saveConfig();
  renderAll();
  renderPageNav();
}
