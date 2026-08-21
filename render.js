/* ═══════════════════════════════════════════
   WarTab — Card & Section Rendering
   renderAll, renderCard, renderSection, all module widgets.
   Depends on: $, $$, config, saveConfig (app.js), CARD_MODULES (core.js)
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
// Resolve columns for the current page (per-page setting or global default)
function getPageCols(){return (config.pages[config.currentPage]&&config.pages[config.currentPage].cols)||config.layout.cols;}
function rerenderCard(card){
  if(!card)return null;
  const oldEl=document.querySelector('[data-card-id="'+card.id+'"]');
  if(!oldEl)return null;
  const idx=config.cards.indexOf(card);
  const newEl=renderCard(card,idx);
  WarTabLifecycle.cleanupSubtree(oldEl);
  oldEl.replaceWith(newEl);
  return newEl;
}
// Full page re-render: destroys and rebuilds grid from config
function renderAll(){if(statsTimer){clearInterval(statsTimer);statsTimer=null;}const grid=$('#card-grid');Array.from(grid.children).forEach(WarTabLifecycle.cleanupSubtree);grid.innerHTML='';var pageCols=getPageCols();grid.style.setProperty('--grid-cols',pageCols);grid.style.gap=config.layout.gap+'px';const appEl=$('#app');if(appEl){
  // Page width: slider percentage (50-100), side padding only at full width
  appEl.style.maxWidth=(parseInt(config.layout.pageWidth)||100)+'%';
  const xPad=parseInt(config.layout.pageWidthPadding)||2;
  appEl.style.paddingLeft=xPad+'%';appEl.style.paddingRight=xPad+'%';
  // Top/bottom padding: slider (%)
  const yPad=parseInt(config.layout.pagePadding)||2;
  appEl.style.paddingTop=yPad+'%';appEl.style.paddingBottom=yPad+'%';
}const _scrollY=window.scrollY;
if(!config.cards.length){
  grid.innerHTML='';
  const emptyCard=document.createElement('div');
  emptyCard.className='card empty-state';
  const emptyBody=document.createElement('div');
  emptyBody.className='card-body';
  
  const iconWrap=document.createElement('div');
  iconWrap.className='empty-state-icon';
  const iconEl=document.createElement('i');
  iconEl.setAttribute('data-lucide','layout');
  iconEl.style.width='36px';iconEl.style.height='36px';
  iconWrap.appendChild(iconEl);
  emptyBody.appendChild(iconWrap);
  
  const titleEl=document.createElement('div');
  titleEl.className='empty-state-title';
  titleEl.textContent='This page is empty';
  emptyBody.appendChild(titleEl);
  
  const descEl=document.createElement('div');
  descEl.className='empty-state-desc';
  descEl.textContent='Add your first card to get started';
  emptyBody.appendChild(descEl);
  
  const actions=document.createElement('div');
  actions.className='empty-state-actions';
  
  const b1=document.createElement('button');b1.className='btn btn-glass';b1.id='empty-add-card';
  const i1=document.createElement('i');i1.setAttribute('data-lucide','plus');i1.style.width='14px';i1.style.height='14px';
  b1.appendChild(i1);b1.appendChild(document.createTextNode(' Add Card'));actions.appendChild(b1);
  
  const b2=document.createElement('button');b2.className='btn btn-glass';b2.id='empty-add-clock';
  const i2=document.createElement('i');i2.setAttribute('data-lucide','clock');i2.style.width='14px';i2.style.height='14px';
  b2.appendChild(i2);b2.appendChild(document.createTextNode(' Add Clock'));actions.appendChild(b2);
  
  const b3=document.createElement('button');b3.className='btn btn-glass';b3.id='empty-add-links';
  const i3=document.createElement('i');i3.setAttribute('data-lucide','link');i3.style.width='14px';i3.style.height='14px';
  b3.appendChild(i3);b3.appendChild(document.createTextNode(' Add Links'));actions.appendChild(b3);
  
  const b4=document.createElement('button');b4.className='btn btn-glass';b4.id='empty-config';
  const i4=document.createElement('i');i4.setAttribute('data-lucide','settings');i4.style.width='14px';i4.style.height='14px';
  b4.appendChild(i4);b4.appendChild(document.createTextNode(' Settings'));actions.appendChild(b4);
  
  emptyBody.appendChild(actions);
  emptyCard.appendChild(emptyBody);
  grid.appendChild(emptyCard);
  setTimeout(()=>{
    const a=document.getElementById('empty-add-card');if(a)a.addEventListener('click',addNewCard);
    const b=document.getElementById('empty-add-clock');if(b)b.addEventListener('click',()=>{addCardOfType('clock',{title:'Clock',icon:'🕐',color:'#aaaaaa',width:1});});
    const c=document.getElementById('empty-add-links');if(c)c.addEventListener('click',()=>{addCardOfType('links',{title:'Links',icon:'🔗',color:'#999999',width:2});});
    const d=document.getElementById('empty-config');if(d)d.addEventListener('click',toggleConfigPanel);
  },0);
  if(_scrollY)window.scrollTo(0,_scrollY);

  return;
}
// Ungrouped cards render as normal
config.cards.forEach((c,i)=>{grid.appendChild(renderCard(c,i));});
// Don't steal focus on every re-render — only focus search on a full load when
// no panel is open and focus isn't already inside a slide panel (e.g. the user
// is typing in the config/edit panel while a card re-renders).
const fs=grid.querySelector('.inline-search-wrap input');
if(fs && !document.body.classList.contains('panel-open') && !(document.activeElement && document.activeElement.closest('.slide-panel')))fs.focus();
if(_scrollY)requestAnimationFrame(()=>window.scrollTo(0,_scrollY));
  // Render Lucide icons for any newly created data-lucide elements
  renderIcons();
}
// Card heights handled by CSS grid-auto-rows + data-height presets


function renderCard(card,idx){
  if(card._isGap){
    const div=document.createElement('div');div.className='card grid-gap-card';div.dataset.cardId=card.id;
    div.dataset.width=Math.min(card.width||1,getPageCols());div.dataset.index=idx;
    div.style.gridColumn='span '+div.dataset.width;
    if(card.height>1){div.style.gridRow='span '+card.height;div.dataset.height=card.height;}
    if(card.minHeight){const sp=document.createElement('div');sp.className='grid-gap-minh';sp.style.setProperty('--gap-minh',card.minHeight+'px');div.appendChild(sp);}
    // Controls overlay
    const h=document.createElement('div');
    h.className='grid-gap-controls';
    const eb2=document.createElement('button');eb2.className='card-edit-btn';eb2.appendChild(ds.icon('pencil','card-edit-icon'));eb2.title='Edit gap';
    eb2.addEventListener('click',e=>{e.stopPropagation();openCardEditPanel(card.id);});
    h.appendChild(eb2);
    div.appendChild(h);

    // Shadow behind controls on hover
    const shadow=document.createElement('div');
    shadow.className='grid-gap-shadow';
    div.appendChild(shadow);
    div.addEventListener('dblclick',()=>{
      const currentIdx=config.cards.findIndex(c=>c===card||c.id===card.id);
      if(currentIdx<0)return;
      config.cards.splice(currentIdx,1);saveConfig();renderAll();toast('Gap removed','success');
    });
    return div;
  }
  /* ── Regular card ── */
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.cardId = card.id;
  div.dataset.cardRole = WarTabCardModel.getCardRole(card);
  div.dataset.mobileHidden = card.mobileHidden ? 'true' : 'false';
  div.style.setProperty('--mobile-order', Number.isFinite(Number(card.mobileOrder)) ? Number(card.mobileOrder) : idx);
  div.dataset.width = Math.min(card.width || 1, getPageCols());
  div.dataset.index = idx;
  div.style.setProperty('--card-accent', card.color || config.theme.glow);
  const ch=Math.min(card.height||1,4);
  if(ch>1){
    div.dataset.height=ch;
    div.style.gridRow='span '+ch;
  }
  if (card.transparent) div.classList.add('card-transparent');

  /* Header: title (icon + text) on the left, actions (edit + drag handle) on the right */
  const hdr = document.createElement('div');
  hdr.className = 'card-header';

  const title = document.createElement('div');
  title.className = 'card-title';
  const iconEl=renderIconElement(card.icon, 'card-icon');if(iconEl)title.appendChild(iconEl);
  title.appendChild(document.createTextNode(' ' + (card.title || '')));
  // Inline editing: double-click card title to rename
  title.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    const current = card.title || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'card-title-input';
    input.style.cssText = 'background:var(--card-input-bg);border:1px solid var(--accent);color:var(--text-primary);font:inherit;font-size:var(--heading-size);font-weight:600;padding:2px 6px;width:100%;outline:none;border-radius:0;';
    this.innerHTML = '';
    this.appendChild(input);
    input.focus();
    input.select();
    const finish = function() {
      const val = input.value.trim() || current;
      card.title = val;
      saveConfig();
      renderAll();
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { ev.preventDefault(); input.value = current; input.blur(); }
    });
  });
  hdr.appendChild(title);

  const actionGroup = document.createElement('div');
  actionGroup.className = 'flex-row gap-1';

  const editBtn = document.createElement('button');
  editBtn.className = 'card-edit-btn';
  editBtn.appendChild(ds.icon('pencil', 'card-edit-icon'));
  editBtn.title = 'Edit';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openCardEditPanel(card.id); });
  actionGroup.appendChild(editBtn);

  hdr.appendChild(actionGroup);
  div.appendChild(hdr);

  /* Body: render each section */
  const body = document.createElement('div');
  body.className = 'card-body';
  (card.sections || []).forEach(section => {
    const el = renderSection(section, card);
    if (el) body.appendChild(el);
  });
  div.appendChild(body);

  // Entrance animation
  ds.entrance(div);
  return div;
}



/**
 * Render a card/section icon element. Supports three formats:
 *   1. Lucide icon name  → <i data-lucide="..."> (replaced with SVG at runtime)
 *   2. URL/image path    → <img> (with Lucide fallback on load error)
 *   3. Emoji string      → <span class="emoji-icon">
 * @param {string} icon   Icon identifier
 * @param {string} cls    CSS class for the element
 * @returns {HTMLElement}
 */
function renderIconElement(icon, cls) {
  if (!icon) return null;
  if (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/')) {
    // Reject file: protocol URLs
    if (icon.startsWith('file:')) return renderLucideEl('package', cls);
    const img = document.createElement('img');
    img.className = cls; img.src = icon; img.alt = '';
    img.onerror = function() {
      const fallback = renderLucideEl('package', cls);
      this.parentNode.replaceChild(fallback, this);
      renderIcons();
    };
    return img;
  }
  if (isLucideName(icon)) return renderLucideEl(icon, cls);
  const span = document.createElement('span');
  span.className = cls + ' emoji-icon';
  span.textContent = icon;
  return span;
}


function doSearch(query, section) {
  let s = (query || '').trim();
  if (!s) return;
  const prefixes = { 'g:':'Google', 'ddg:':'DuckDuckGo', 'br:':'Brave',
    'b:':'Bing', 'yt:':'YouTube', 'r:':'Reddit', 'w:':'Wikipedia' };
  let engine = section.engine || config.search.selected || 'Google';
  const prefix = Object.keys(prefixes).find(function(key){return s.toLowerCase().startsWith(key);});
  if(prefix){engine=prefixes[prefix];s=s.slice(prefix.length).trim();}
  if(!s)return;
  try{
    const key='wartab.search.history';
    const history=JSON.parse(localStorage.getItem(key)||'[]').filter(function(item){return item.query!==s||item.engine!==engine;});
    history.unshift({query:s,engine:engine,ts:Date.now()});
    localStorage.setItem(key,JSON.stringify(history.slice(0,30)));
  }catch(error){}
  const url = (config.search.engines[engine] || config.search.engines['Google']) + encodeURIComponent(s);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Project persisted section styles onto the rendered title/content pair. */
function applySectionStyles(section, contentWrap, titleRow) {
  if (!contentWrap) return;
  var st = section && section.styles ? section.styles : {};
  var centeredByDefault = section && ['clock', 'weather', 'timer', 'quotes'].includes(section.type);
  var align = st.align || (centeredByDefault ? 'center' : 'left');
  var scale = st.scale || 'medium';
  var density = st.density || 'standard';
  var scaleFactor = scale === 'small' ? 0.85 : scale === 'large' ? 1.15 : 1;
  var densityFactor = density === 'compact' ? 0.6 : density === 'comfortable' ? 1.5 : 1;
  var fontScale = st.fontScale || {};

  contentWrap.dataset.modScale = scale;
  contentWrap.dataset.modDensity = density;
  contentWrap.dataset.modAlign = align;
  contentWrap.style.setProperty('--mod-align', align);
  contentWrap.style.setProperty('--mod-justify', align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start');
  contentWrap.style.setProperty('--mod-density', String(densityFactor));
  contentWrap.style.setProperty('--mod-scale-factor', String(scaleFactor));
  contentWrap.style.setProperty('--mod-font-title', String(fontScale.title || 1));
  contentWrap.style.setProperty('--mod-font-content', String(fontScale.content || 1));
  contentWrap.style.setProperty('--mod-font-secondary', String(fontScale.secondary || 1));
  contentWrap.style.textAlign = align === 'left' ? '' : align;

  if (titleRow) {
    titleRow.style.setProperty('--mod-align', align);
    titleRow.style.setProperty('--mod-justify', align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start');
    titleRow.style.setProperty('--mod-scale-factor', String(scaleFactor));
    titleRow.style.setProperty('--mod-font-title', String(fontScale.title || 1));
    titleRow.dataset.modScale = scale;
    titleRow.dataset.modDensity = density;
  }
}

window.applySectionStyles = applySectionStyles;

/** Merge a partial style update without resetting sibling options. */
function patchSectionStyles(section, patch, contentWrap, titleRow) {
  if (!section) return;
  section.styles = Object.assign({}, section.styles || {}, patch || {});
  if (contentWrap) applySectionStyles(section, contentWrap, titleRow);
}

/** Apply one partial style update to every section in a card. */
function patchCardSectionStyles(card, patch) {
  (card && card.sections || []).forEach(function(section) {
    patchSectionStyles(section, patch);
  });
}

window.patchSectionStyles = patchSectionStyles;
window.patchCardSectionStyles = patchCardSectionStyles;

/** Apply the customer-facing shared DOM contract without erasing semantic hooks. */
function normalizeModuleSurface(surface, moduleType) {
  if (!surface) return;
  surface.dataset.ui = 'module';
  surface.dataset.module = moduleType || 'unknown';
  var root = surface.firstElementChild;
  if (root) { root.classList.add('ui-module-root'); root.dataset.ui = 'module-root'; }
  Array.from(surface.querySelectorAll('*')).forEach(function(element) {
    if (element === root) return;
    var tag = element.tagName;
    var classes = typeof element.className === 'string' ? element.className.toLowerCase() : '';
    if (tag === 'BUTTON') element.dataset.ui = 'control';
    else if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') element.dataset.ui = 'field';
    else if (tag === 'A') element.dataset.ui = 'link';
    else if (tag === 'DETAILS') element.dataset.ui = 'disclosure';
    else if (tag === 'SUMMARY') element.dataset.ui = 'disclosure-trigger';
    else if (tag === 'CANVAS' || tag === 'IFRAME' || tag === 'IMG' || tag === 'PRE') element.dataset.ui = 'media';
    else if (/loading|skeleton|error|empty/.test(classes)) element.dataset.ui = 'state';
    else if (/row|item/.test(classes)) element.dataset.ui = 'row';
    else if (/value|temp|time|display/.test(classes)) element.dataset.ui = 'value';
    else if (/meta|hint|detail|label|date|author|\bts\b/.test(classes)) element.dataset.ui = 'meta';
    else if (/list|grid|stats|forecast|actions/.test(classes)) element.dataset.ui = 'collection';
  });
}

/**
 * Render a card section (a content block within a card body).
 * Creates a section-title toggle (if labelled, non-clock) + content area with module render output.
 * @param {Object} section   The section config object
 * @param {Object} card      The parent card config
 * @returns {DocumentFragment}
 */
function renderSection(section, card) {
  const fragment = document.createDocumentFragment();
  let titleRow = null;

  /* ── Section title row (label + collapse toggle) ── */
  if (section.label && section.type !== 'clock') {
    titleRow = document.createElement('button');
    titleRow.className = 'dropdown-toggle' + (section.collapsed ? '' : ' open');
    titleRow.dataset.secId = section.id;
    titleRow.setAttribute('aria-expanded', section.collapsed ? 'false' : 'true');
    titleRow.setAttribute('aria-controls', 'sec-' + section.id);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = section.label;
    titleRow.appendChild(labelSpan);

    const arrow = document.createElement('i');
    arrow.className = 'arrow';
    arrow.setAttribute('data-lucide', 'chevron-right');
    titleRow.appendChild(arrow);

    titleRow.addEventListener('click', (e) => {
      e.stopPropagation();
      section.collapsed = !section.collapsed;
      titleRow.classList.toggle('open');
      titleRow.setAttribute('aria-expanded', section.collapsed ? 'false' : 'true');
      let c = titleRow.nextElementSibling;
      while (c && !c.classList.contains('section-content') && !c.classList.contains('dropdown-content')) c = c.nextElementSibling;
      if (c) {
        if (section.collapsed) {
          // Collapse: remove open class (gets overflow:hidden, removes flex:1),
          // pin to current height, then animate max-height to 0 via CSS transition
          c.style.maxHeight = c.scrollHeight + 'px';
          c.offsetHeight;
          c.classList.remove('open');
          c.style.maxHeight = '';   // CSS max-height:0 now applies, transition fires
          clearTimeout(c._collapseTimer);
          c._collapseTimer = setTimeout(function() {
            c.style.maxHeight = '';
          }, 450);
          // Stop any running timers in this section
          const timers = c.querySelectorAll('[data-timer-id]');
          timers.forEach(function(t){if(t._timer){clearInterval(t._timer);}});
        } else {
          // Expand: add open class (overflow:visible), measure natural height, animate from 0 up
          c.classList.add('open');
          if(c._collapseTimer){clearTimeout(c._collapseTimer);c._collapseTimer=null;}
          c.style.maxHeight = '';
          const h2 = c.scrollHeight;
          c.style.maxHeight = '0px';
          c.offsetHeight;
          c.style.maxHeight = h2 + 'px';
        }
      }
      saveConfig();
    });

    fragment.appendChild(titleRow);
  }

  /* ── Content area ── */
  const contentWrap = document.createElement('div');
  contentWrap.className = 'dropdown-content' + (section.collapsed ? '' : ' open');

  applySectionStyles(section, contentWrap, titleRow);

  // Height-based variant: data-mod-height is set on the card element by
  // renderCard(). Modules can use [data-mod-height="small"] selectors.
  var _ch = Math.min(card.height || 1, 4);
  var _hv = _ch <= 1 ? 'small' : _ch === 2 ? 'medium' : _ch === 3 ? 'large' : 'expanded';
  contentWrap.dataset.modHeight = _hv;
  contentWrap.dataset.secId = section.id;
  contentWrap.dataset.moduleType = section.type;

  // Store a direct DOM reference for the style panel to update without querySelector
  section.__cw = contentWrap;

  const module = CARD_MODULES[section.type];
  const moduleSurface = document.createElement('div');
  moduleSurface.className = 'ui-module';
  contentWrap.appendChild(moduleSurface);
  if (module && module.render) {
    module.render(section, card, moduleSurface);
  } else {
    moduleSurface.textContent = 'Unknown type: ' + section.type;
  }
  normalizeModuleSurface(moduleSurface, section.type);
  var moduleObserver = new MutationObserver(function() { normalizeModuleSurface(moduleSurface, section.type); });
  moduleObserver.observe(moduleSurface, { childList: true, subtree: true });
  WarTabLifecycle.addCleanup(moduleSurface, function() { moduleObserver.disconnect(); });
  // Two-phase render: if module has onMount(), call it after the element is
  // connected to the DOM. requestAnimationFrame fires after the current frame's
  // synchronous DOM mutations (appendChild/replaceWith) complete, guaranteeing
  // the element tree is live and measurable.
  if (module && module.onMount) {
    (function(cw,sec,cd){
      requestAnimationFrame(function(){
        if(cw.isConnected) {
          var cleanup = module.onMount(sec, cd, cw);
          normalizeModuleSurface(cw, sec.type);
          if (typeof cleanup === 'function') WarTabLifecycle.addCleanup(cw, cleanup);
        }
      });
    })(moduleSurface,section,card);
  }
  fragment.appendChild(contentWrap);

  /* ── Divider (between sections) ── */
  const sectionList = card.sections || [];
  const isLast = sectionList.indexOf(section) === sectionList.length - 1;
  if (!isLast && section.type !== 'clock') {
    const divider = document.createElement('hr');
    divider.className = 'section-divider';
    fragment.appendChild(divider);
  }

  return fragment;
}

/**
 * Render a link icon for bookmark grid/list items. Supports same three formats
 * as renderIconElement: Lucide name, image URL, or emoji.
 * @param {string} icon   Icon identifier
 * @returns {HTMLElement}
 */
function renderLinkIcon(icon) {
  /* Image URL needs link-custom-icon class for object-fit sizing */
  if (icon && (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/'))) {
    if (icon.startsWith('file:')) return renderLinkIcon('');
    const img = document.createElement('img');
    img.className = 'link-custom-icon'; img.src = icon; img.alt = '';
    img.onerror = function() {
      const fallback = document.createElement('i');
      fallback.className = 'link-icon'; fallback.setAttribute('data-lucide', 'link');
      this.parentNode.replaceChild(fallback, this);
      renderIcons();
    };
    return img;
  }
  if (!icon) return renderLucideEl('link', 'link-icon');
  return renderIconElement(icon, 'link-icon');
}

/* ── Local quote library ── */
// Shrink link labels that overflow their container — keeps buttons single-line
function shrinkLabels(container) {
  setTimeout(function() {
    if (!container || !container.parentNode) return;
    container.querySelectorAll('.link-label').forEach(function(el) {
      if (el.scrollWidth > el.clientWidth) {
        let fs = parseInt(window.getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth && fs > 8) {
          el.style.fontSize = (--fs) + 'px';
        }
      }
    });
  }, 0);
}



function fetchQuote(el, sec) {
  const txt = el.querySelector('.quotes-content'),
      auth = el.querySelector('.quotes-author-name');
  if (!txt || !auth) return;
  const pool = sec.quotes || [];
  if (!pool.length) {
    txt.textContent = 'Add quotes in settings';
    auth.textContent = '';
    return;
  }
  const mode=sec.rotationMode||'sequential';
  if(mode==='daily'){
    const day=Math.floor(Date.now()/86400000);
    sec._qi=day%pool.length;
  }else if(mode==='shuffle'){
    let next=Math.floor(Math.random()*pool.length);
    if(pool.length>1&&next===sec._qi)next=(next+1)%pool.length;
    sec._qi=next;
  }else{
    if (typeof sec._qi !== 'number') sec._qi = -1;
    sec._qi = (sec._qi + 1) % pool.length;
  }
  const pick = pool[sec._qi];
  txt.textContent = pick.q;
  auth.textContent = '— ' + pick.a;
}
