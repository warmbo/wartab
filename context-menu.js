/* ═══════════════════════════════════════════
   WarTab — Unified Site Context Menu
   One target-aware menu for links, cards, page chrome, panels,
   and blank dashboard space. Rendered in a body-level portal at
   the maximum browser z-index.
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  var linkContexts = new WeakMap();
  var root = null;
  var menu = null;
  var returnFocus = null;

  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'wartab-context-menu-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
    return root;
  }

  function close(options) {
    options = options || {};
    if (menu) menu.remove();
    menu = null;
    if (root) root.replaceChildren();
    if (options.restoreFocus && returnFocus && typeof returnFocus.focus === 'function') {
      returnFocus.focus({ preventScroll: true });
    }
    returnFocus = null;
  }

  function copyText(value, successMessage) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast('Clipboard unavailable', 'error');
      return;
    }
    navigator.clipboard.writeText(value).then(function () {
      toast(successMessage || 'Copied', 'success');
    }).catch(function () { toast('Copy failed', 'error'); });
  }

  function addItem(items, label, icon, action, options) {
    items.push({ label: label, icon: icon, action: action, danger: !!(options && options.danger), shortcut: options && options.shortcut });
  }

  function addSeparator(items) { items.push({ separator: true }); }

  function linkItems(context) {
    var items = [], link = context.link, sec = context.section, card = context.card;
    addItem(items, 'Open in new tab', 'external-link', function () {
      recordLinkUsage(link); window.open(link.url, '_blank', 'noopener');
    });
    addItem(items, 'Open here', 'arrow-up-right', function () {
      recordLinkUsage(link); window.location.href = link.url;
    });
    addSeparator(items);
    addItem(items, 'Copy URL', 'copy', function () { copyText(link.url, 'URL copied'); });
    addItem(items, 'Copy Markdown', 'file-text', function () {
      copyText('[' + (link.label || link.url) + '](' + link.url + ')', 'Markdown copied');
    });
    if (context.readonly) return items;
    addSeparator(items);
    addItem(items, 'Edit link', 'pencil', function () { openCardEditPanel(card.id); });
    addItem(items, 'Delete link', 'trash-2', function () {
      showConfirmModal('Delete “' + (link.label || 'this link') + '”?', function () {
        var index = (sec.links || []).indexOf(link);
        if (index < 0) return;
        sec.links.splice(index, 1); saveConfig(); renderAll();
        toastWithUndo('Link deleted', function () {
          sec.links.splice(index, 0, link); saveConfig(); renderAll();
        });
      }, { ok: 'Delete link', danger: true });
    }, { danger: true });
    return items;
  }

  function duplicateCard(card) {
    var cards = WarTabCardModel.getCurrentCards(config);
    var index = cards.indexOf(card);
    if (index < 0) return;
    var copy = cloneObj(card);
    copy.id = 'card-' + uid();
    copy.title = (copy.title || 'Untitled') + ' Copy';
    (copy.sections || []).forEach(function (section) { section.id = 'sec-' + uid(); });
    cards.splice(index + 1, 0, copy);
    saveConfig(); renderAll();
    toastWithUndo('Card duplicated', function () {
      var current = cards.indexOf(copy); if (current >= 0) cards.splice(current, 1);
      saveConfig(); renderAll();
    });
  }

  function deleteCard(card) {
    showConfirmModal('Delete “' + (card.title || 'this card') + '”?', function () {
      var result = WarTabCardModel.removeCard(config, card.id);
      if (!result) return;
      saveConfig(); renderAll();
      toastWithUndo('Card deleted', function () {
        WarTabCardModel.getCurrentCards(config).splice(result.index, 0, result.card);
        saveConfig(); renderAll();
      });
    }, { ok: 'Delete card', danger: true });
  }

  function cardItems(card) {
    var items = [];
    addItem(items, 'Edit card', 'pencil', function () { openCardEditPanel(card.id); });
    addItem(items, 'Arrange this card', 'move', function () {
      if (typeof _arrangeActive !== 'undefined' && !_arrangeActive) toggleArrangeMode();
      setTimeout(function () { if (typeof showArrowsForCard === 'function') showArrowsForCard(card.id); }, 0);
    });
    addItem(items, 'Duplicate card', 'copy', function () { duplicateCard(card); });
    addItem(items, 'Copy card JSON', 'file-json', function () { copyText(JSON.stringify(card, null, 2), 'Card JSON copied'); });
    addSeparator(items);
    addItem(items, 'Delete card', 'trash-2', function () { deleteCard(card); }, { danger: true });
    return items;
  }

  function pageItems(target) {
    var items = [];
    var tab = target && target.closest ? target.closest('.page-tab') : null;
    if (tab && tab.dataset.pageId && config.pages[tab.dataset.pageId]) {
      var pageId = tab.dataset.pageId;
      addItem(items, 'Open page', 'panel-top', function () { switchPage(pageId); });
      addItem(items, 'Edit page', 'pencil', function () { openPageEditPanel(pageId); });
      addSeparator(items);
    }
    addItem(items, 'Command palette', 'search', function () {
      if (window.WarTabCommandPalette) window.WarTabCommandPalette.open();
    }, { shortcut: 'Ctrl K' });
    addItem(items, 'Add card', 'plus', function () { addNewCard(); });
    addItem(items, 'Edit mode', 'wand-2', function () { if (window.enterContextualEditMode) window.enterContextualEditMode(); });
    addItem(items, 'Layout Studio', 'layout-grid', function () { if (window.openLayoutStudio) window.openLayoutStudio(); });
    addItem(items, 'Experience presets', 'swatch-book', function () { if (window.openExperiencePresets) window.openExperiencePresets(); });
    addItem(items, 'Arrange cards', 'move', function () { toggleArrangeMode(); });
    addItem(items, 'Manage pages', 'layout-dashboard', function () { openPageManagementPanel(); });
    addItem(items, 'Settings', 'settings', function () { if (!configPanelOpen) toggleConfigPanel(); });
    addSeparator(items);
    addItem(items, 'Reload WarTab', 'refresh-cw', function () { window.location.reload(); }, { shortcut: 'Ctrl R' });
    return items;
  }

  function buildItems(target) {
    var linkEl = target && target.closest ? target.closest('.link-item,.link-row,.smart-link') : null;
    var context = linkEl && linkContexts.get(linkEl);
    if (context) return linkItems(context);
    var cardEl = target && target.closest ? target.closest('.card[data-card-id]') : null;
    if (cardEl) {
      var card = WarTabCardModel.getCardById(config, cardEl.dataset.cardId);
      if (card) return cardItems(card);
    }
    return pageItems(target);
  }

  function positionMenu(x, y) {
    var rect = menu.getBoundingClientRect();
    var gutter = 8;
    var left = Math.max(gutter, Math.min(x, window.innerWidth - rect.width - gutter));
    var top = Math.max(gutter, Math.min(y, window.innerHeight - rect.height - gutter));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function open(x, y, items, label) {
    close();
    returnFocus = document.activeElement;
    ensureRoot();
    menu = document.createElement('div');
    menu.className = 'site-context-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', label || 'WarTab actions');
    menu.tabIndex = -1;

    items.forEach(function (definition) {
      if (definition.separator) {
        var separator = document.createElement('div');
        separator.className = 'site-context-separator';
        separator.setAttribute('role', 'separator');
        menu.appendChild(separator);
        return;
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'site-context-item' + (definition.danger ? ' danger' : '');
      button.setAttribute('role', 'menuitem');
      var icon = document.createElement('i'); icon.setAttribute('data-lucide', definition.icon || 'circle');
      var text = document.createElement('span'); text.className = 'site-context-label'; text.textContent = definition.label;
      button.appendChild(icon); button.appendChild(text);
      if (definition.shortcut) {
        var shortcut = document.createElement('kbd'); shortcut.textContent = definition.shortcut; button.appendChild(shortcut);
      }
      button.addEventListener('click', function () { close(); definition.action(); });
      menu.appendChild(button);
    });

    root.appendChild(menu);
    positionMenu(x, y);
    renderIcons();
    var first = menu.querySelector('[role="menuitem"]');
    if (first) first.focus({ preventScroll: true });
  }

  function menuItems() { return menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')) : []; }

  document.addEventListener('contextmenu', function (event) {
    // Preserve native editing operations where browser cut/copy/paste and spellcheck matter.
    if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
    event.stopPropagation();
    open(event.clientX, event.clientY, buildItems(event.target), 'WarTab context menu');
  }, true);

  document.addEventListener('pointerdown', function (event) {
    if (menu && !menu.contains(event.target)) close();
  }, true);

  document.addEventListener('keydown', function (event) {
    if (!menu) return;
    var items = menuItems();
    var index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); close({ restoreFocus: true }); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1 + items.length) % items.length].focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); }
    else if (event.key === 'Home') { event.preventDefault(); if (items[0]) items[0].focus(); }
    else if (event.key === 'End') { event.preventDefault(); if (items.length) items[items.length - 1].focus(); }
    else if (event.key === 'Tab') close();
  }, true);

  window.addEventListener('blur', function () { close(); });
  window.addEventListener('resize', function () { close(); });
  window.addEventListener('scroll', function () { close(); }, true);

  window.WarTabContextMenu = {
    open: open,
    close: close,
    registerLink: function (element, context) { linkContexts.set(element, context); }
  };
})();
