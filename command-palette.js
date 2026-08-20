/* ═══════════════════════════════════════════
   WarTab — Command Palette (Ctrl+K / Ctrl+P)
   Spotlight-for-new-tab: fuzzy-find & launch any page,
   link, or app action. Self-contained module.
   Depends on global: config, renderAll, switchPage,
   toggleConfigPanel, toggleArrangeMode, addNewCard,
   openPageManagementPanel, showShortcutsOverlay, toast.
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  var palette = null;      // overlay element
  var inputEl = null;
  var resultsEl = null;
  var items = [];          // {label, sublabel, icon, kind, run, match}
  var activeIdx = 0;

  var K = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', Enter: 'Enter', Escape: 'Escape' };

  /* ── Simple fuzzy scorer (subsequence with bonus for consecutive/word starts) ── */
  function fuzzyScore(query, text) {
    if (!query) return { score: 1, matched: text };
    var q = query.toLowerCase();
    var t = text.toLowerCase();
    var qi = 0, score = 0, last = -2, firstMatch = -1;
    for (var i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) {
        var prev = i > 0 ? t[i - 1] : ' ';
        var wordStart = prev === ' ' || prev === '-' || prev === '_' || prev === '/';
        var consec = (i === last + 1);
        score += wordStart ? 3 : (consec ? 2 : 1);
        if (firstMatch < 0) firstMatch = i;
        last = i;
        qi++;
      }
    }
    if (qi < q.length) return null; // not all chars matched
    // penalty for matches far from the start
    score -= firstMatch * 0.05;
    return { score: score, matched: text };
  }

  function bestMatch(query, label, sublabel) {
    var a = fuzzyScore(query, label);
    var b = sublabel ? fuzzyScore(query, sublabel) : null;
    if (a && b) return a.score >= b.score ? a : b;
    return a || b;
  }

  /* ── Gather all launchable items from current config ── */
  function gatherItems() {
    var list = [];

    // Actions (always available)
    var actions = [
      { label: 'New Card', icon: 'plus', run: addNewCard },
      { label: 'New Page', icon: 'file-plus', run: function () { if (typeof addPage === 'function') addPage(); else toast('New page unavailable', 'error'); } },
      { label: 'Manage Pages', icon: 'list', run: openPageManagementPanel },
      { label: 'Arrange Cards', icon: 'move', run: toggleArrangeMode },
      { label: 'Open Settings', icon: 'settings', run: toggleConfigPanel },
      { label: 'Keyboard Shortcuts', icon: 'keyboard', run: showShortcutsOverlay },
    ];
    actions.forEach(function (a) { list.push({ kind: 'action', label: a.label, icon: a.icon, run: a.run }); });

    // Pages
    var order = config.pageOrder || [];
    order.forEach(function (pageId) {
      var page = config.pages && config.pages[pageId];
      if (!page) return;
      list.push({
        kind: 'page', label: page.name || 'Page', sublabel: 'Page', icon: page.icon || 'layout',
        run: function () { switchPage(pageId); }
      });
    });

    // Links from every card/section on every page
    (order.length ? order : Object.keys(config.pages || {})).forEach(function (pageId) {
      var page = config.pages && config.pages[pageId];
      if (!page || !page.cards) return;
      page.cards.forEach(function (card) {
        if (!card || !card.sections) return;
        list.push({kind:'card',label:card.title||'Card',sublabel:(page.name||'Page')+' · '+card.sections.map(function(s){return s.type;}).join(', '),icon:card.icon||'layout',run:function(){switchPage(pageId);setTimeout(function(){var target=document.querySelector('[data-card-id="'+card.id+'"]');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('highlight');setTimeout(function(){target.classList.remove('highlight');},1200);}},260);}});
        card.sections.forEach(function (sec) {
          if (!sec || !sec.links) return;
          sec.links.forEach(function (link) {
            if (!link || !link.url) return;
            var usage=(typeof getLinkUsage==='function'?getLinkUsage():{})[link.url]||{};
            list.push({
              kind: 'link', label: link.label || link.url, sublabel: link.url,
              icon: link.icon || 'link', usage:usage.count||0,
              run: function () { if(typeof recordLinkUsage==='function')recordLinkUsage(link);window.open(link.url, '_blank', 'noopener'); }
            });
          });
        });
      });
    });

    return list;
  }

  function closePalette() {
    if (palette) { palette.remove(); palette = null; }
  }

  function highlight(text, query) {
    if (!query) return text;
    var q = query.toLowerCase();
    var t = text.toLowerCase();
    var out = '', i = 0, qi = 0;
    while (i < t.length && qi < q.length) {
      if (t[i] === q[qi]) { out += '<mark>' + escapeHtml(text[i]) + '</mark>'; qi++; }
      else out += escapeHtml(text[i]);
      i++;
    }
    out += escapeHtml(text.slice(i));
    return out;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderResults() {
    var query = inputEl.value.trim();
    var intents = { 'weather today':'weather', 'weather':'weather', 'my notes':'notes',
      'notes':'notes', 'system status':'resource', 'system':'resource',
      'time':'clock', 'calendar':'agenda', 'feeds':'rss' };
    var intent = intents[query.toLowerCase()];
    if (intent) query = intent;
    var scored = [];
    items.forEach(function (item) {
      var m = bestMatch(query, item.label, item.sublabel);
      if (m) scored.push({ item: item, match: m });
    });
    scored.sort(function (a, b) { return (b.match.score+(b.item.usage||0)*0.05) - (a.match.score+(a.item.usage||0)*0.05); });
    scored = scored.slice(0, 20);

    resultsEl.innerHTML = '';
    if (!scored.length) {
      var empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = 'No matches for "' + query + '"';
      resultsEl.appendChild(empty);
      activeIdx = -1;
      return;
    }

    activeIdx = 0;
    scored.forEach(function (entry, idx) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'palette-item' + (idx === 0 ? ' active' : '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');

      var icon = document.createElement('span');
      icon.className = 'palette-item-icon';
      icon.appendChild(renderPaletteIcon(entry.item.icon, entry.item.kind));
      row.appendChild(icon);

      var label = document.createElement('span');
      label.className = 'palette-item-label';
      label.innerHTML = highlight(entry.item.label, query);
      row.appendChild(label);

      if (entry.item.sublabel) {
        var sub = document.createElement('span');
        sub.className = 'palette-item-sub';
        sub.textContent = entry.item.sublabel;
        row.appendChild(sub);
      }

      var badge = document.createElement('span');
      badge.className = 'palette-item-badge';
      badge.textContent = entry.item.kind;
      row.appendChild(badge);

      row.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      row.addEventListener('click', function () { runItem(entry.item); });
      resultsEl.appendChild(row);
    });
    renderIcons();
  }

  function renderPaletteIcon(icon, kind) {
    if (kind === 'action') {
      var i = document.createElement('i');
      i.setAttribute('data-lucide', icon || 'circle');
      return i;
    }
    // reuse renderLinkIcon if available (image/emoji/Lucide)
    if (typeof renderLinkIcon === 'function') return renderLinkIcon(icon);
    var d = document.createElement('i');
    d.setAttribute('data-lucide', 'circle');
    return d;
  }

  function runItem(item) {
    closePalette();
    if (item.run) { try { item.run(); } catch (e) { console.error('palette run failed', e); } }
    renderIcons();
  }

  function move(step) {
    var rows = resultsEl.querySelectorAll('.palette-item');
    if (!rows.length) return;
    activeIdx = (activeIdx + step + rows.length) % rows.length;
    for (var i = 0; i < rows.length; i++) {
      var on = i === activeIdx;
      rows[i].classList.toggle('active', on);
      rows[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    rows[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    closePalette();
    items = gatherItems();

    palette = document.createElement('div');
    palette.className = 'palette-overlay';
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-modal', 'true');
    palette.setAttribute('aria-label', 'Command palette');

    var box = document.createElement('div');
    box.className = 'palette-box';

    inputEl = document.createElement('input');
    inputEl.className = 'palette-input';
    inputEl.setAttribute('type', 'text');
    inputEl.setAttribute('placeholder', 'Search pages, links, actions…  (↑↓ navigate · ↵ open)');
    inputEl.setAttribute('aria-label', 'Command palette search');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.addEventListener('input', renderResults);
    box.appendChild(inputEl);

    resultsEl = document.createElement('div');
    resultsEl.className = 'palette-results';
    resultsEl.setAttribute('role', 'listbox');
    box.appendChild(resultsEl);

    var hint = document.createElement('div');
    hint.className = 'palette-hint';
    hint.innerHTML = '<span>↑↓</span> navigate <span>↵</span> open <span>esc</span> close';
    box.appendChild(hint);

    palette.appendChild(box);
    document.body.appendChild(palette);
    renderResults();

    // Focus input after attach
    setTimeout(function () { if (inputEl) inputEl.focus(); }, 10);
  }

  document.addEventListener('keydown', function (e) {
    // Ctrl+K / Cmd+K or Ctrl+P / Cmd+P open the palette (unless already open)
    if ((e.key === 'k' || e.key === 'p') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (palette) closePalette();
      else openPalette();
      return;
    }
    if (!palette) return;

    if (e.key === K.Escape) { e.preventDefault(); closePalette(); return; }
    if (e.key === K.ArrowDown) { e.preventDefault(); move(1); return; }
    if (e.key === K.ArrowUp) { e.preventDefault(); move(-1); return; }
    if (e.key === K.Enter) {
      e.preventDefault();
      var rows = resultsEl.querySelectorAll('.palette-item');
      if (rows[activeIdx] && activeIdx >= 0) rows[activeIdx].click();
      return;
    }
  });

  // Click on backdrop closes
  document.addEventListener('mousedown', function (e) {
    if (palette && e.target === palette) closePalette();
  });

  window.WarTabCommandPalette = {
    open: openPalette,
    close: closePalette,
    toggle: function () { if (palette) closePalette(); else openPalette(); }
  };
})();
