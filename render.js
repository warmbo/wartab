/* ═══════════════════════════════════════════
   WarTab — Card & Section Rendering
   renderAll, renderCard, renderSection, all module widgets.
   Depends on: $, $$, config, saveConfig (app.js), CARD_MODULES (core.js)
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
// Resolve columns for the current page (per-page setting or global default)
function getPageCols(){return (config.pages[config.currentPage]&&config.pages[config.currentPage].cols)||config.layout.cols;}
// Full page re-render: destroys and rebuilds grid from config
function renderAll(){apiPollTimers.forEach(clearTimeout);apiPollTimers=[];const grid=$('#card-grid');// Cleanup old card modules before destroying DOM
const oldCards=grid.querySelectorAll('.card');oldCards.forEach(function(c){if(c._cleanup)c._cleanup();});grid.innerHTML='';var pageCols=getPageCols();grid.style.setProperty('--grid-cols',pageCols);grid.style.gap=config.layout.gap+'px';const appEl=$('#app');if(appEl){
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
    const b=document.getElementById('empty-add-clock');if(b)b.addEventListener('click',()=>{addNewCard();const c=config.cards[config.cards.length-1];if(c){c.title='Clock';c.icon='🕐';c.color='#aaaaaa';c.width=1;c.sections=[{id:'sec-'+uid(),type:'clock',format24h:false,showDate:true}];saveConfig();renderAll();}});
    const c=document.getElementById('empty-add-links');if(c)c.addEventListener('click',()=>{addNewCard();const c2=config.cards[config.cards.length-1];if(c2){c2.title='Links';c2.icon='🔗';c2.color='#999999';c2.width=2;c2.sections=[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}];saveConfig();renderAll();}});
    const d=document.getElementById('empty-config');if(d)d.addEventListener('click',toggleConfigPanel);
  },0);
  if(_scrollY)window.scrollTo(0,_scrollY);

  return;
}
// Ungrouped cards render as normal
config.cards.forEach((c,i)=>{grid.appendChild(renderCard(c,i));});
setupClocks();const fs=grid.querySelector('.inline-search-wrap input');if(fs)fs.focus();if(_scrollY)requestAnimationFrame(()=>window.scrollTo(0,_scrollY));
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
    const eb2=document.createElement('button');eb2.className='card-edit-btn';eb2.textContent='✎';eb2.title='Edit gap';
    eb2.addEventListener('click',e=>{e.stopPropagation();openCardEditPanel(card.id);});
    h.appendChild(eb2);
    const dh=document.createElement('span');dh.className='drag-handle';dh.textContent='⠿';dh.title='Drag';dh.style.touchAction='none';
    h.appendChild(dh);
    div.appendChild(h);
    // Shadow behind controls on hover
    const shadow=document.createElement('div');
    shadow.className='grid-gap-shadow';
    div.appendChild(shadow);
    dh.addEventListener('pointerdown',e=>startDrag(e,card.id,idx));
    div.addEventListener('dblclick',()=>{config.cards.splice(idx,1);saveConfig();renderAll();toast('Gap removed','success');});
    return div;
  }
  /* ── Regular card ── */
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.cardId = card.id;
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
  editBtn.textContent = '✎';
  editBtn.title = 'Edit';
  editBtn.addEventListener('click', e => { e.stopPropagation(); openCardEditPanel(card.id); });
  actionGroup.appendChild(editBtn);

  const dragHandle = document.createElement('span');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Drag';
  dragHandle.style.touchAction = 'none';
  actionGroup.appendChild(dragHandle);

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

  

  dragHandle.addEventListener('pointerdown', function(e) { startDrag(e, card.id, idx); });
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
  const s = (query || '').trim();
  if (!s) return;
  const engine = section.engine || config.search.selected || 'Google';
  const url = (config.search.engines[engine] || config.search.engines['Google']) + encodeURIComponent(s);
  window.open(url, '_blank', 'noopener,noreferrer');
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

  /* ── Section title row (label + collapse toggle) ── */
  if (section.label && section.type !== 'clock') {
    const titleRow = document.createElement('button');
    titleRow.className = 'dropdown-toggle' + (section.collapsed ? '' : ' open');
    titleRow.dataset.secId = section.id;

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

  // Apply section styles: alignment, density, scale, and icon controls.
  // Every module inherits these as CSS variables on the content wrap,
  // so modules can reference --mod-align, --mod-density-scale, --mod-scale
  // in their CSS without any JavaScript changes.
  var st = section.styles || {};
  contentWrap.style.setProperty('--mod-align', st.align || 'left');
  contentWrap.style.setProperty('--mod-justify', st.align === 'center' ? 'center' : st.align === 'right' ? 'flex-end' : 'flex-start');
  contentWrap.style.setProperty('--mod-density-scale', String(st.density === 'compact' ? '0.6' : st.density === 'comfortable' ? '1.5' : '1'));
  contentWrap.style.setProperty('--mod-scale', String(st.scale === 'small' ? '0.75' : st.scale === 'large' ? '1.4' : '1'));
  if (st.align === 'center') { contentWrap.style.textAlign = 'center'; }
  else if (st.align === 'right') { contentWrap.style.textAlign = 'right'; }

  // Height-based variant: data-mod-height is set on the card element by
  // renderCard(). Modules can use [data-mod-height="small"] selectors.
  var _ch = Math.min(card.height || 1, 4);
  var _hv = _ch <= 1 ? 'small' : _ch === 2 ? 'medium' : _ch === 3 ? 'large' : 'expanded';
  contentWrap.dataset.modHeight = _hv;
  contentWrap.dataset.secId = section.id;
  contentWrap.dataset.modScale = st.scale || 'medium';
  contentWrap.dataset.modDensity = st.density || 'standard';
  contentWrap.style.setProperty('--mod-df', String(st.density === 'compact' ? '0.6' : st.density === 'comfortable' ? '1.5' : '1'));
  // Store a direct DOM reference for the style panel to update without querySelector
  section.__cw = contentWrap;

  const module = CARD_MODULES[section.type];
  if (module && module.render) {
    module.render(section, card, contentWrap);
  } else {
    contentWrap.textContent = 'Unknown type: ' + section.type;
  }
  // Two-phase render: if module has onMount(), call it after the element is
  // connected to the DOM. requestAnimationFrame fires after the current frame's
  // synchronous DOM mutations (appendChild/replaceWith) complete, guaranteeing
  // the element tree is live and measurable.
  if (module && module.onMount) {
    (function(cw,sec,cd){
      requestAnimationFrame(function(){
        if(cw.isConnected) module.onMount(sec, cd, cw);
      });
    })(contentWrap,section,card);
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
/**
 * Find a section by its ID across all cards.
 * @param {string} sectionId   The section.id to find
 * @returns {Array|number} [cardIndex, sectionIndex] or -1 if not found
 */
function findSection(sectionId) {
  for (let ci = 0; ci < config.cards.length; ci++) {
    const sections = config.cards[ci].sections || [];
    for (let si = 0; si < sections.length; si++) {
      if (sections[si].id === sectionId) return [ci, si];
    }
  }
  return -1;
}

function setupClocks(){if(clockInterval)clearInterval(clockInterval);if($$('.clock-widget').length===0){clockInterval=null;return;}updateClocks();clockInterval=setInterval(updateClocks,1000);}
function updateClocks(){$$('.clock-widget').forEach(el=>{const n=new Date(),f24=el.dataset.format24==='1',sd=el.dataset.showDate==='1';let h=n.getHours();const m=String(n.getMinutes()).padStart(2,'0');el.querySelector('.clock-time').textContent=f24?String(h).padStart(2,'0')+':'+m:(h%12||12)+':'+m+' '+(h>=12?'PM':'AM');if(sd)el.querySelector('.clock-date').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});if(el.dataset.showCalendar==='1'){const cal=el.querySelector('.calendar-widget');if(cal)renderCalendar(cal,n);}});}
function renderCalendar(el,date){const y=date.getFullYear(),m=date.getMonth();const fd=new Date(y,m,1).getDay();const ld=new Date(y,m+1,0).getDate();const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];let h=`<div class="calendar-month">${mn[m]} ${y}</div><div class="calendar-grid">`;['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{h+=`<div class="calendar-day-header">${d}</div>`;});for(let i=0;i<fd;i++)h+='<div class="calendar-day other-month"></div>';const today=new Date();for(let d=1;d<=ld;d++){const is=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();h+=`<div class="calendar-day${is?' today':''}">${d}</div>`;}h+='</div>';el.innerHTML=h;}
function renderApiWidget(el){renderApiFetch(el);}
function renderApiFetch(el){
  const u=el.dataset.url;
  if(!u){el.innerHTML='<div class="api-row"><span class="api-label">No API URL set</span></div>';return;}
  el.innerHTML='<div class="api-row"><span class="api-label">'+escHtml(el.dataset.label||'')+'</span><span class="api-value">Loading...</span></div><div class="api-ts">fetching...</div>';
  const ts=Date.now();
  fetch(u).then(function(r){if(!r.ok)throw Error(r.status+' '+r.statusText);return r.json();}).then(function(d){
    let fields=[];
    try{fields=JSON.parse(el.dataset.fields||'[]');}catch(e){}
    let html='';
    if(fields&&fields.length){
      fields.forEach(function(f){
        const v=f.path?getNested(d,f.path):'';
        const vs=v!==undefined&&v!==null?String(v):'\u2014';
        html+='<div class="api-row"><span class="api-label">'+escHtml(f.label)+'</span><span class="api-value">'+escHtml(vs)+'</span></div>';
      });
    } else {
      const jp=el.dataset.jsonPath;
      const v=jp?getNested(d,jp):JSON.stringify(d,null,2);
      html+='<div class="api-row"><span class="api-label">'+label+'</span><span class="api-value">'+escHtml(String(v))+'</span></div>';
    }
    html+='<div class="api-ts" data-ts="'+ts+'">updated just now</div>';
    el.innerHTML=html;
    el.dataset.lastOk=String(ts);
    const iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0){apiPollTimers.push(setTimeout(function(){renderApiFetch(el);},iv));}
  }).catch(function(e){
    const lo=el.dataset.lastOk;
    el.innerHTML='<div class="api-row"><span class="api-label">'+escHtml(el.dataset.label||'')+'</span><span class="api-value api-error">'+escHtml(e.message)+'</span></div><div class="api-ts" data-ts="'+(lo||ts)+'">'+(lo?'last ok: '+timeAgo(parseInt(lo)):'')+'</div>';
    const iv=parseInt(el.dataset.refresh)*1000;
    if(iv>0){apiPollTimers.push(setTimeout(function(){renderApiFetch(el);},iv));}
});
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



const LOCAL_QUOTES=[
  {q:'The best way to predict the future is to invent it.',a:'Alan Kay'},
  {q:'Any sufficiently advanced technology is indistinguishable from magic.',a:'Arthur C. Clarke'},
  {q:'Simplicity is prerequisite for reliability.',a:'Edsger W. Dijkstra'},
  {q:'Talk is cheap. Show me the code.',a:'Linus Torvalds'},
  {q:'First, solve the problem. Then, write the code.',a:'John Johnson'},
  {q:'Debugging is twice as hard as writing the code in the first place.',a:'Brian Kernighan'},
  {q:'In theory, there is no difference between theory and practice.',a:'Jan L. A. van de Snepscheut'},
  {q:'The only way to go fast is to go well.',a:'Robert C. Martin'},
  {q:'Programs must be written for people to read, and only incidentally for machines to execute.',a:'Harold Abelson'},
  {q:'The function of good software is to make the complex appear to be simple.',a:'Grady Booch'},
  {q:'It works on my machine.',a:'Anonymous'},
  {q:'We build our computer systems the way we build our cities: over time, without a plan, on top of ruins.',a:'Ellen Ullman'},
  {q:'A good programmer is someone who always looks both ways before crossing a one-way street.',a:'Doug Linder'},
  {q:'Fix the cause, not the symptom.',a:'Steve Maguire'},
  {q:"The most damaging phrase in the language is 'We've always done it this way.'",a:'Grace Hopper'},
  {q:'Measuring programming progress by lines of code is like measuring aircraft building progress by weight.',a:'Bill Gates'},
  {q:'Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.',a:'John Woods'},
  {q:'The trouble with computers is that they do what you tell them, not what you want.',a:'Danny Hillis'},
  {q:'Before software can be reusable it first has to be usable.',a:'Ralph Johnson'},
  {q:'Make it work, make it right, make it fast.',a:'Kent Beck'},
  {q:'Computers are fast; programmers keep it slow.',a:'Anonymous'},
];
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
  if (typeof sec._qi !== 'number') sec._qi = -1;
  sec._qi = (sec._qi + 1) % pool.length;
  const pick = pool[sec._qi];
  txt.textContent = pick.q;
  auth.textContent = '— ' + pick.a;
}


// Fetch and render system stats for the status-bar card module
function fetchStatusWidget(el){
  const content=el.querySelector('.sw-content'),ts=el.querySelector('.sw-ts');
  if(!content)return;
  const src=el.dataset.source; let items;
  try{items=JSON.parse(el.dataset.items||'[]');}catch(e){items=['cpu','memory','disk','uptime'];}
  function render(d){
    content.innerHTML='';const parts=buildStatItems(d,items);
    parts.forEach(function(el2,i){if(i>0){const sep=document.createElement('span');sep.className='stat-sep';sep.textContent='·';content.appendChild(sep);}content.appendChild(el2);});
    if(!parts.length)content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">No stats</div>';
    if(ts){ts.textContent='updated';ts.dataset.ts=String(Date.now());}
  }
  if(!src||(src==='custom'&&!el.dataset.customUrl)){content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Configure source</div>';return;}
  content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Loading...</div>';
  storage.getStats(src, el.dataset.glancesUrl, el.dataset.customUrl).then(function(d){render(d);}).catch(function(){content.innerHTML='<div style="font-size:var(--text-sm);color:#cc6666;">Stats offline</div>';});
}
