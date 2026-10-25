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
  var returnFocus = null;

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

  function looksLikeUrl(value) {
    return /^(https?:\/\/)/i.test(value) || /^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(?:\/|$)/i.test(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/i.test(value);
  }

  function parseCommandQuery(raw) {
    var value=String(raw||'').trim();
    var engines={ 'g':'Google', 'ddg':'DuckDuckGo', 'b':'Bing', 'br':'Brave', 'yt':'YouTube', 'r':'Reddit', 'w':'Wikipedia' };
    var prefix=value.match(/^([a-z]+)(?::|\s+)\s*(.+)$/i);
    var engine=prefix&&engines[prefix[1].toLowerCase()];
    if(engine)return{query:prefix[2].trim(),engine:engine,explicit:true,scope:'search'};
    var service=value.match(/^@(?:server|service)\s+(.+)$/i);
    if(service)return{query:service[1].trim(),scope:'service'};
    if(value.charAt(0)==='>')return{query:value.slice(1).trim(),scope:'action'};
    if(looksLikeUrl(value)){var url=/^https?:\/\//i.test(value)?value:'http://'+value;return{query:value,url:url,scope:'url'};}
    return{query:value,engine:null,scope:'all'};
  }

  function runWebSearch(query, engine) {
    var selected=engine||(config.search&&config.search.selected)||'Google';
    var base=(config.search&&config.search.engines&&config.search.engines[selected])||(config.search&&config.search.engines&&config.search.engines.Google)||'https://www.google.com/search?q=';
    window.open(base+encodeURIComponent(query),'_blank','noopener,noreferrer');
  }

  /* ── Gather all launchable items from current config ── */
  function gatherItems() {
    var list = [];
    var usageByUrl=typeof getLinkUsage==='function'?getLinkUsage():{};

    // Actions (always available)
    var actions = [
      { label: 'New Card', icon: 'plus', run: addNewCard },
      { label: 'New Page', icon: 'file-plus', run: function () { if (typeof addPage === 'function') addPage(); else toast('New page unavailable', 'error'); } },
      { label: 'Manage Pages', icon: 'list', run: openPageManagementPanel },
      { label: 'Arrange Cards', icon: 'move', run: toggleArrangeMode },
      { label: 'Open Settings', icon: 'settings', run: toggleConfigPanel },
      { label: 'Keyboard Shortcuts', icon: 'keyboard', run: showShortcutsOverlay },
      { label: 'Toggle Theme', icon: 'sun-moon', run: function () { if (typeof toggleTheme === 'function') toggleTheme(); else toast('Theme toggle unavailable', 'error'); } },
      { label: 'Refresh Data', icon: 'refresh-cw', run: function () { if (typeof refreshAllCards === 'function') refreshAllCards(); else toast('Refresh unavailable', 'error'); } },
    ];
    actions.forEach(function (a) { list.push({ kind: 'action', label: a.label, icon: a.icon, run: a.run }); });

    // Recent searches (bounded, newest first) — shown above generic results.
    try {
      (JSON.parse(localStorage.getItem('wartab.search.history') || '[]') || []).slice(0, 5).forEach(function(h){
        if(!h || !h.query) return;
        list.push({
          kind: 'recent-search', label: h.query, sublabel: 'Recent · ' + (h.engine || 'Search'),
          icon: 'history',
          run: function () { runWebSearch(h.query, h.engine); }
        });
      });
    } catch (error) {}

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
            if (!link || !link.url || !bookmarkHref(link.url)) return;
            var usage=usageByUrl[link.url]||{};
            list.push({
              kind: 'link', label: link.label || link.url, sublabel: link.url,
              icon: link.icon || 'link', usage:usage.count||0,
              run: function () { if(typeof recordLinkUsage==='function')recordLinkUsage(link);window.open(bookmarkHref(link.url), '_blank', 'noopener,noreferrer'); }
            });
          });
        });
      });
    });

    return list;
  }

  function closePalette() {
    if (!palette)return;
    palette.remove();palette=null;inputEl=null;resultsEl=null;
    if(returnFocus&&returnFocus.isConnected&&!document.querySelector('.modal-overlay,.ux-overlay'))returnFocus.focus({preventScroll:true});
    returnFocus=null;
  }

  function highlight(text, query) {
    text=String(text??'');
    if (!query) return escapeHtml(text);
    var q = query.toLowerCase();
    var t = text.toLowerCase();
    var out = '', i = 0, qi = 0;
    while (i < t.length && qi < q.length) {
      if (t[i] === q[qi]) { out += '<mark>' + escapeHtml(text[i]) + '</mark>'; qi++; }
      else out += escapeHtml(text[i]);
      i++;
    }
    out += escapeHtml(text.slice(i));
    return out.replace(/<\/mark><mark>/g,'');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderResults() {
    var parsed = parseCommandQuery(inputEl.value);
    var query = parsed.query;
    var intents = { 'weather today':'weather', 'weather':'weather', 'my notes':'notes',
      'notes':'notes', 'system status':'resource', 'system':'resource',
      'time':'clock', 'calendar':'agenda', 'feeds':'rss' };
    var intent = intents[query.toLowerCase()];
    if (intent) query = intent;
    var scored = [];
    items.forEach(function (item) {
      if(parsed.scope==='action'&&item.kind!=='action')return;
      if(parsed.scope==='service'&&item.kind!=='link'&&item.kind!=='card')return;
      var m = bestMatch(query, item.label, item.sublabel);
      if (m) scored.push({ item: item, match: m });
    });
    if(parsed.url){scored.unshift({item:{kind:'service',label:'Open '+parsed.url,sublabel:'Direct address',icon:'external-link',run:function(){window.open(parsed.url,'_blank','noopener');}},match:{score:100,matched:parsed.url}});}
    if(query&&parsed.scope!=='url'&&parsed.scope!=='action'&&parsed.scope!=='service'){
      var engine=parsed.engine||(config.search&&config.search.selected)||'Google';
      scored.push({ item:{ kind: 'search', label:'Search '+engine+' for “'+query+'”',sublabel:parsed.explicit?'Search prefix':'Web search',icon:'search',run:function(){runWebSearch(query,engine);} }, match:{score:parsed.explicit?90:0.75,matched:query} });
    }
    var emptyBoost = !query;
    scored.sort(function (a, b) {
      var ka = emptyBoost ? (a.item.kind === 'action' ? 100 : a.item.kind === 'recent-search' ? 80 : 0) : 0;
      var kb = emptyBoost ? (b.item.kind === 'action' ? 100 : b.item.kind === 'recent-search' ? 80 : 0) : 0;
      return (kb + b.match.score + (b.item.usage || 0) * 0.05) - (ka + a.match.score + (a.item.usage || 0) * 0.05);
    });
    scored = scored.slice(0, 20);

    resultsEl.innerHTML = '';
    if (!scored.length) {
      var empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = 'No matches for "' + query + '"';
      resultsEl.appendChild(empty);
      activeIdx = -1;inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    activeIdx = 0;
    scored.forEach(function (entry, idx) {
      var row = document.createElement('button');
      row.type = 'button';row.tabIndex=-1;row.id='palette-result-'+idx;
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
      badge.textContent=({'recent-search':'Recent',service:'Open'})[entry.item.kind]||entry.item.kind;
      row.appendChild(badge);

      row.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      row.addEventListener('click', function () { runItem(entry.item); });
      resultsEl.appendChild(row);
    });
    inputEl.setAttribute('aria-activedescendant','palette-result-0');
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
    inputEl.setAttribute('aria-activedescendant',rows[activeIdx].id);
    rows[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    if(document.querySelector('.modal-overlay,.ux-overlay'))return;
    closePalette();returnFocus=document.activeElement;
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
    inputEl.setAttribute('placeholder', 'Search commands, pages and bookmarks…');
    inputEl.setAttribute('aria-label', 'Command palette search');
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.addEventListener('input', renderResults);
    inputEl.setAttribute('role','combobox');inputEl.setAttribute('aria-expanded','true');inputEl.setAttribute('aria-controls','palette-results');inputEl.setAttribute('aria-autocomplete','list');
    var searchRow=document.createElement('div');searchRow.className='palette-search';searchRow.appendChild(inputEl);
    var closeButton=document.createElement('button');closeButton.type='button';closeButton.className='palette-close btn btn-glass btn-icon';closeButton.textContent='×';closeButton.setAttribute('aria-label','Close commands');closeButton.onclick=closePalette;searchRow.appendChild(closeButton);box.appendChild(searchRow);

    resultsEl = document.createElement('div');
    resultsEl.className = 'palette-results';resultsEl.id='palette-results';resultsEl.setAttribute('aria-label','Commands and destinations');
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
    var focusInput=inputEl;setTimeout(function(){if(focusInput.isConnected)focusInput.focus();},0);
  }

  document.addEventListener('keydown', function (e) {
    // Ctrl+K / Cmd+K or Ctrl+P / Cmd+P open the palette (unless already open)
    if ((e.key === 'k' || e.key === 'p') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if(document.querySelector('.modal-overlay,.ux-overlay'))return;
      if (palette) closePalette();
      else openPalette();
      return;
    }
    if (!palette || document.querySelector('.modal-overlay,.ux-overlay')) return;
    e.stopPropagation();

    if (e.key === K.Escape) { e.preventDefault(); closePalette(); return; }
    if (e.key === K.ArrowDown) { e.preventDefault(); move(1); return; }
    if (e.key === K.ArrowUp) { e.preventDefault(); move(-1); return; }
    if(e.key==='Tab'){
      var closeButton=palette.querySelector('.palette-close');e.preventDefault();
      (document.activeElement===inputEl?closeButton:inputEl).focus();return;
    }
    if (e.key === K.Enter && e.target.closest?.('.palette-close'))return;
    if (e.key === K.Enter) {
      e.preventDefault();
      var rows = resultsEl.querySelectorAll('.palette-item');
      if (rows[activeIdx] && activeIdx >= 0) rows[activeIdx].click();
      return;
    }
  },true);

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
