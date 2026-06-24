/* ═══════════════════════════════════════════
   WarTab — Page Editor (Edit Panel)
   openPageEditPanel, page management panel, page drag reorder.
   Depends on: $, $$, config, saveConfig (app.js),
               renderPageNav (pages.js), renderIcons (core.js),
               showConfirmModal (modals.js), uid (core.js), escHtml (core.js)
   ═══════════════════════════════════════════ */

function openPageEditPanel(pageId) {

  const page = config.pages[pageId];

  if (!page) return;

  _editingPageId = pageId;

  _editingCardId = null;

  _editPanelOpen = true;

  const body = $('#edit-panel-body');

  body.innerHTML = '';

  const title = $('#edit-panel-title');

  if (title) title.textContent = '✎ Page: ' + escHtml(page.name);

  // Icon row

  const iconG = document.createElement('div');

  iconG.className = 'cs-pair';

  iconG.appendChild(cpLabel('Icon'));

  const iconRow = document.createElement('div');

  iconRow.className = 'cs-icon-row';

  const ip = document.createElement('span');

  ip.className = 'cs-icon-preview';

  if (page.icon && isLucideName(page.icon)) {

    ip.appendChild(renderLucideEl(page.icon, ''));

  } else if (page.icon) {

    ip.textContent = page.icon;

  } else {

    ip.appendChild(renderLucideEl('layout', ''));

  }

  iconRow.appendChild(ip);

  const chIcon = cpBtn('Change');

  chIcon.addEventListener('click', () => openIconPicker(url => { page.icon = url; saveConfig(); renderPageNav(); }));

  iconRow.appendChild(chIcon);

  iconG.appendChild(iconRow);

  body.appendChild(iconG);

  // Name

  const nameG = document.createElement('div');

  nameG.className = 'cs-pair';

  nameG.appendChild(cpLabel('Name'));

  const ni = cpInput('Page name', page.name, v => { page.name = v; saveConfig(); renderPageNav(); });

  nameG.appendChild(ni);

  body.appendChild(nameG);

  // Columns
  const colG = document.createElement('div');
  colG.className = 'cs-pair';
  colG.appendChild(cpRange('Columns', page.cols || config.layout.cols, 1, 6, v => {
    page.cols = parseInt(v);
    saveConfig();
    renderAll();
  }));
  body.appendChild(colG);

  // Divider

  body.appendChild(cpDivider(''));

  // Footer

  const foot = document.createElement('div');

  foot.className = 'cp-footer';

  const doneBtn = cpBtn('Done');

  doneBtn.addEventListener('click', closeCardEditPanel);

  foot.appendChild(doneBtn);

  const delBtn = cpBtn('Delete Page', true);

  delBtn.addEventListener('click', () => {

    if (config.pageOrder.length <= 1) { toast('Cannot delete last page'); return; }

    showConfirmModal('Delete page "' + page.name + '"?', () => {

      deletePage(pageId);

      closeCardEditPanel();

    });

  });

  foot.appendChild(delBtn);

  body.appendChild(foot);

  // Open panel

  $('#edit-panel-overlay').classList.add('open');

  $('#edit-panel').classList.add('open');

  renderIcons();

}

/* ── Page Management Panel (overview of all pages) ── */

// Simple drag-to-reorder state for page list

let _pageDrag = null;

function openPageManagementPanel() {

  _editingPageId = null;

  _editingCardId = null;

  _editPanelOpen = true;

  const body = $('#edit-panel-body');

  body.innerHTML = '';

  const title = $('#edit-panel-title');

  if (title) title.textContent = '📄 Manage Pages';

  // Create a card for each page

  (config.pageOrder || []).forEach(function(id) {

    const p = config.pages[id];

    if (!p) return;

    const card = document.createElement('div');

    card.className = 'cp-config-card';

    card.dataset.pageId = id;

    card.style.cssText = 'display:flex;flex-direction:column;gap:10px;';

    // Header with icon + name

    const hdr = document.createElement('div');

    hdr.style.cssText = 'display:flex;align-items:center;gap:8px;';

    // Drag handle

    const dh = document.createElement('span');

    dh.textContent = '⠿';

    dh.className = 'drag-page-handle';

    dh.title = 'Drag to reorder';

    hdr.appendChild(dh);

    const iconSpan = document.createElement('span');

    iconSpan.className = 'icon-box';

    if (p.icon && isLucideName(p.icon)) {

      iconSpan.appendChild(renderLucideEl(p.icon, ''));

    } else if (p.icon) {

      iconSpan.textContent = p.icon;

    } else {

      iconSpan.appendChild(renderLucideEl('layout', ''));

    }

    hdr.appendChild(iconSpan);

    const nm = document.createElement('span');

    nm.className = 'text-bold';

    nm.textContent = p.name;

    hdr.appendChild(nm);

    // Edit button

    const eb = cpBtn('✎');

    eb.className = 'btn btn-glass btn-sm';

    eb.title = 'Edit page';

    eb.addEventListener('click', function() { openPageEditPanel(id); });

    hdr.appendChild(eb);

    // Delete button

    const db = cpBtn('✕', true);

    db.className = 'btn btn-glass btn-sm btn-danger';

    db.title = 'Delete page';

    db.addEventListener('click', function() {

      if (config.pageOrder.length <= 1) { toast('Cannot delete last page','warning'); return; }

      showConfirmModal('Delete page "' + p.name + '"?', function() {

        deletePage(id);

        body.innerHTML = '';

        openPageManagementPanel();

      });

    });

    hdr.appendChild(db);

    card.appendChild(hdr);

    body.appendChild(card);

    // Drag-to-reorder via pointer events

    dh.addEventListener('pointerdown', function(e) {

      if (e.button !== 0) return;

      e.preventDefault();

      e.stopPropagation();

      card.style.opacity = '0.4';

      card.style.transform = 'scale(0.97)';

      _pageDrag = { card: card, pageId: id, startY: e.clientY };

      document.addEventListener('pointermove', onPageDragMove);

      document.addEventListener('pointerup', onPageDragEnd);

      document.addEventListener('pointercancel', onPageDragEnd);

    });

  });

  // Render icons for all page cards

  renderIcons();

  // Footer with Add + Done

  const foot = document.createElement('div');

  foot.className = 'cp-footer';

  foot.style.cssText = 'display:flex;gap:8px;margin-top:var(--space-4);';

  const addBtn = cpBtn('+ Add Page');

  addBtn.addEventListener('click', function() {

    addPage();

    body.innerHTML = '';

    openPageManagementPanel();

  });

  foot.appendChild(addBtn);

  const doneBtn = cpBtn('Done');

  doneBtn.addEventListener('click', closeCardEditPanel);

  foot.appendChild(doneBtn);

  body.appendChild(foot);

  // Open panel (same positioning logic as card edit)

  const panel = $('#edit-panel');

  panel.classList.remove('slide-left');

  panel.style.transition = 'none';

  panel.style.transform = 'translateX(100%)';

  panel.offsetHeight;

  requestAnimationFrame(function() {

    requestAnimationFrame(function() {

      panel.style.transition = '';

      panel.classList.add('open');

      panel.style.transform = '';

      $('#edit-panel-overlay').classList.add('open');

      document.body.classList.add('panel-open');

    });

  });

}

