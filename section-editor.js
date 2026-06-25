/* ═══════════════════════════════════════════
   WarTab — Section Editor (Edit Panel)
   buildSectionEditor, section drag reorder within the edit panel.
   Depends on: $, $$, config, saveConfig (app.js),
               saveAndRefresh, saveAndRefreshStructural (edit-panel.js),
               cpLabel, cpInput, cpSelect, cpCheck, cpBtn, cpDivider (form-helpers.js),
               toast (core.js), uid (core.js), CARD_MODULES (core.js)
   ═══════════════════════════════════════════ */

function buildSectionEditor(sec, card, si) {

  const cardEl = document.createElement('div');

  cardEl.className = 'se-card';

  cardEl.dataset.secIdx = si;

  cardEl.style.borderLeftColor = card.color || config.theme.glow;



  /* ── Card Header: drag handle | badge | title | actions ── */

  const hdr = document.createElement('div');

  hdr.className = 'se-card-header';



  // Grab handle

  const dh = document.createElement('span');

  dh.className = 'se-drag-handle';

  dh.textContent = '⠿';

  dh.title = 'Drag to reorder';

  hdr.appendChild(dh);



  // Type badge

  const badge = document.createElement('span');

  badge.className = 'me-badge';

  badge.textContent = sec.type;

  hdr.appendChild(badge);



  // Section heading title

  const title = document.createElement('span');

  title.className = 'se-card-title';

  title.textContent = sec.label || 'Untitled';

  hdr.appendChild(title);



  // Actions (delete)

  const acts = document.createElement('div');

  acts.className = 'se-card-actions';

  const del = cpBtn('✕', true);

  del.title = 'Delete section';

  del.addEventListener('click', e => {

    e.stopPropagation();

    const c = config.cards.find(x => x.id === card.id);

    if (!c) return;

    c.sections.splice(si, 1);

    saveAndRefreshStructural();

    toast('Section deleted');

  });

  acts.appendChild(del);

  hdr.appendChild(acts);

  cardEl.appendChild(hdr);



  /* ── Card Body ── */

  const bd = document.createElement('div');

  bd.className = 'se-card-body';



  /* Label + Type side by side */

  const row1 = document.createElement('div');

  row1.className = 'se-inline';

  const lg = document.createElement('div');

  lg.appendChild(cpLabel('Label'));

  const li = cpInput('Section heading', sec.label || '', v => {

    sec.label = v; saveAndRefresh();

  });

  lg.appendChild(li);

  row1.appendChild(lg);

  const tg = document.createElement('div');

  tg.appendChild(cpLabel('Type'));

  const sel = cpSelect(

    [

      {value:'links',label:'Links'},

      {value:'link-list',label:'Link List'},

      {value:'search',label:'Search'},

      {value:'clock',label:'Clock'},

      {value:'weather',label:'Weather'},

      {value:'timer',label:'Timer'},

      {value:'iframe',label:'iFrame'},

      {value:'notes',label:'Notes'},

      {value:'api-poller',label:'API Poller'},

      {value:'quotes',label:'Quotes'},

      {value:'resource-monitor',label:'Resource Monitor'},

      {value:'image',label:'Image'},

      {value:'lan-scan',label:'LAN Scan'},

      {value:'digital-pet',label:'Digital Pet'},

      {value:'ascii-anim',label:'ASCII Animation'},

      {value:'media',label:'Media Card'},

      {value:'proxmox',label:'Proxmox'},

      {value:'git',label:'Git Repo'},

    ],

    sec.type,

    v => {

      // Auto-title the section label from the type name

      if (!sec.label || sec.label === sec.type || sec.label === 'Links') {

        sec.label = v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ');

      }

      sec.type = v;

      // Merge defaults for the new type

      const mod = CARD_MODULES[v];

      if (mod && mod.defaults) Object.assign(sec, cloneObj(mod.defaults));
      // Ensure section style defaults exist
      if (!sec.styles) sec.styles = { align:'left', density:'standard', scale:'medium' };

      saveAndRefreshStructural();

    }

  );

  tg.appendChild(sel);

  row1.appendChild(tg);

  bd.appendChild(row1);



  /* Module editor fields */

  const mc = document.createElement('div');

  mc.className = 'me-card';

  const mod = CARD_MODULES[sec.type];
  // Settings schema auto-render: if module declares settings[], generate
  // editor fields automatically instead of requiring a manual editor() fn.
  // Supports: text, number, range, select, checkbox, color, textarea.
  if (mod && mod.settings) {
    mod.settings.forEach(function(f){
      var onChange = function(v){ sec[f.name]=v; if(f.structural)saveAndRefreshStructural(); else saveConfig(); };
      switch(f.type||'text'){
        case 'text':
          mc.appendChild(cpLabel(f.label)); mc.appendChild(cpInput(f.placeholder||'',sec[f.name]!==undefined?sec[f.name]:f.default||'',onChange));
          break;
        case 'number':
          mc.appendChild(cpLabel(f.label));
          var mn=f.min||0,mx=f.max||100;
          mc.appendChild(cpRange(f.label,sec[f.name]!==undefined?sec[f.name]:f.default||mn,mn,mx,onChange,f.step));
          break;
        case 'select':
          mc.appendChild(cpLabel(f.label)); mc.appendChild(cpSelect(f.options||[],sec[f.name]!==undefined?sec[f.name]:f.default||'',onChange));
          break;
        case 'checkbox':
          mc.appendChild(cpCheck(f.label,sec[f.name]!==undefined?sec[f.name]:f.default||false,onChange));
          break;
        case 'color':
          mc.appendChild(cpLabel(f.label));
          var cr=document.createElement('div');cr.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:8px;';
          var cp2=document.createElement('input');cp2.type='color';cp2.value=sec[f.name]||f.default||'#888888';
          cp2.style.cssText='width:40px;height:34px;padding:2px;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);cursor:pointer;flex-shrink:0;';
          var ct=document.createElement('input');ct.className='cp-input';ct.type='text';ct.value=sec[f.name]||f.default||'#888888';
          var sync=function(){cp2.value=ct.value;sec[f.name]=ct.value;saveConfig();};
          cp2.addEventListener('change',function(){ct.value=cp2.value;onChange(cp2.value);});
          ct.addEventListener('change',sync);
          cr.appendChild(cp2);cr.appendChild(ct);mc.appendChild(cr);
          break;
        case 'textarea':
          mc.appendChild(cpLabel(f.label));
          var ta=document.createElement('textarea');ta.className='cp-input';ta.placeholder=f.placeholder||'';
          ta.style.cssText='min-height:60px;resize:vertical;width:100%;';
          ta.value=sec[f.name]||f.default||'';
          ta.addEventListener('change',function(){onChange(ta.value);});
          mc.appendChild(ta);
          break;
      }
    });
  } else if (mod && mod.editor) {
    mod.editor(sec, card, mc);
  }

  if (mc.children.length > 0) bd.appendChild(mc);

  /* ── Style controls (alignment, density, scale) ── */
  // Universal customization panel for all modules. Controls set CSS variables
  // on the section content wrap: --mod-align, --mod-density-scale, --mod-scale.
  if (!sec.styles) sec.styles = {};
  var st = sec.styles;

  // Helper: update data- attributes on the live card preview without re-render
  function applyStyleVars(s) {
    if (!s || !s.id || !_editingCardId) return;
    var cardEl = document.querySelector('[data-card-id="' + _editingCardId + '"]');
    if (!cardEl) return;
    var pcw = cardEl.querySelector('[data-sec-id="' + s.id + '"]');
    if (!pcw) return;
    var ss = s.styles || {};
    var al = ss.align || 'left';
    var sc = ss.scale || 'medium';
    var de = ss.density || 'standard';
    pcw.dataset.modScale = sc;
    pcw.dataset.modDensity = de;
    pcw.style.setProperty('--mod-align', al);
    pcw.style.setProperty('--mod-justify', al === 'center' ? 'center' : al === 'right' ? 'flex-end' : 'flex-start');
    pcw.style.textAlign = al === 'left' ? '' : al;
  }

  var styleToggle = document.createElement('button');
  styleToggle.className = 'dropdown-toggle';
  styleToggle.style.cssText = 'font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;padding:6px 0;margin-top:4px;cursor:pointer;border:none;background:none;display:flex;align-items:center;gap:4px;width:100%;';
  styleToggle.innerHTML = '<i data-lucide="chevron-right" style="width:12px;height:12px;transition:transform 0.2s;"></i> Style';
  var styleBody = document.createElement('div');
  styleBody.style.cssText = 'overflow:hidden;transition:max-height 0.25s ease;max-height:0;';
  var styleInner = document.createElement('div');
  styleInner.style.cssText = 'padding:4px 0;';

  styleToggle.addEventListener('click', function() {
    var isOpen = styleBody.style.maxHeight !== '0px';
    styleBody.style.maxHeight = isOpen ? '0px' : styleBody.scrollHeight + 'px';
    styleToggle.querySelector('i').style.transform = isOpen ? '' : 'rotate(90deg)';
  });

  // Alignment
  var alignGroup = document.createElement('div');
  alignGroup.style.cssText = 'margin-bottom:6px;';
  alignGroup.appendChild(cpLabel('Alignment'));
  var alignRow = document.createElement('div');
  alignRow.style.cssText = 'display:flex;gap:4px;';
  ['left','center','right'].forEach(function(a) {
    var ab = document.createElement('button');
    ab.textContent = a.charAt(0).toUpperCase() + a.slice(1);
    ab.style.cssText = 'flex:1;padding:4px 6px;border:1px solid var(--surface-border);background:' +
      ((st.align||'left') === a ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.2)') +
      ';color:var(--text-primary);cursor:pointer;border-radius:3px;font-size:var(--text-xs);';
    ab.addEventListener('click', function() {
      st.align = a;
      saveConfig();
      applyStyleVars(sec);
    });
    alignRow.appendChild(ab);
  });
  alignGroup.appendChild(alignRow);
  styleInner.appendChild(alignGroup);

  // Density
  styleInner.appendChild(cpLabel('Density'));
  styleInner.appendChild(cpSelect(
    [{value:'compact',label:'Compact'},{value:'standard',label:'Standard'},{value:'comfortable',label:'Comfortable'}],
    st.density || 'standard',
    function(v) { st.density = v; saveConfig(); applyStyleVars(sec); }
  ));

  // Scale
  styleInner.appendChild(cpLabel('Scale'));
  styleInner.appendChild(cpSelect(
    [{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],
    st.scale || 'medium',
    function(v) { st.scale = v; saveConfig(); applyStyleVars(sec); }
  ));

  styleBody.appendChild(styleInner);
  bd.appendChild(styleToggle);
  bd.appendChild(styleBody);
  renderIcons();

  cardEl.appendChild(bd);



  /* ── Drag setup ── */

  dh.addEventListener('pointerdown', e => {

    startSectionDrag(e, card.id, si, cardEl);

  });



  return cardEl;

}



/* ── Section drag-and-drop (vertical reorder in edit panel) ── */

let secDragState = null;



function startSectionDrag(e, cardId, secIdx, srcEl) {

  if (e.button !== 0) return;

  e.preventDefault();

  secDragState = {

    cardId,

    secIdx,

    srcEl,

    ghost: null,

    active: false,

    _startY: e.clientY,

  };

  document.addEventListener('pointermove', onSecDragMove);

  document.addEventListener('pointerup', onSecDragEnd);

}



function onSecDragMove(e) {

  if (!secDragState) return;

  if (!secDragState.active) {

    if (Math.abs(e.clientY - secDragState._startY) < 8) return;

    secDragState.active = true;

    // Create ghost indicator

    const ghost = document.createElement('div');

    ghost.className = 'se-ghost';

    ghost.style.display = 'none';

    secDragState.srcEl.parentNode.insertBefore(ghost, secDragState.srcEl);

    secDragState.ghost = ghost;

    secDragState.srcEl.classList.add('dragging');

  }



  const { srcEl, ghost } = secDragState;

  if (!ghost) return;



  const body = srcEl.parentNode;

  if (!body) return;



  // Gather all section cards (excluding the dragged one)

  const cards = [...body.querySelectorAll('.se-card')].filter(el => el !== srcEl);

  let insertBefore = null;



  for (const card of cards) {

    const rect = card.getBoundingClientRect();

    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {

      insertBefore = card;

      break;

    }

  }



  // Move ghost to the correct position

  if (insertBefore) {

    body.insertBefore(ghost, insertBefore);

  } else {

    // Append after last card

    const lastCard = cards[cards.length - 1];

    if (lastCard && lastCard.nextSibling) {

      body.insertBefore(ghost, lastCard.nextSibling);

    } else {

      body.appendChild(ghost);

    }

  }



  ghost.style.display = '';

}



function onSecDragEnd(e) {

  document.removeEventListener('pointermove', onSecDragMove);

  document.removeEventListener('pointerup', onSecDragEnd);

  if (!secDragState) return;

  const { cardId, srcEl, ghost, active } = secDragState;

  if (srcEl) srcEl.classList.remove('dragging');



  if (active && ghost && ghost.parentNode) {

    const body = document.getElementById('edit-panel-body');

    if (body) {

      // The ghost was moved to the target position — read where it landed

      const nextCard = ghost.nextElementSibling &&

        ghost.nextElementSibling.classList.contains('se-card')

        ? ghost.nextElementSibling : null;

      ghost.remove();



      const allCards = [...body.querySelectorAll('.se-card')];

      // If ghost was before a card, insert at that card's index; if at end, use length

      const newIdx = nextCard ? allCards.indexOf(nextCard) : allCards.length;

      if (newIdx >= 0) {

        const c = config.cards.find(x => x.id === cardId);

        if (c) {

          const oldIdx = secDragState.secIdx;

          if (oldIdx !== newIdx) {

            const secs = c.sections;

            const [m] = secs.splice(oldIdx, 1);

            const targetIdx = newIdx > oldIdx ? newIdx - 1 : newIdx;

            secs.splice(targetIdx, 0, m);

            saveAndRefreshStructural();

            toast('Section moved');

            secDragState = null;

            return;

          }

        }

      }

    }

    renderAll();

    if (cardId) openCardEditPanel(cardId);

  } else if (ghost && ghost.parentNode) {

    ghost.remove();

  }



  secDragState = null;

}



/* ═══════════════════════════════════════════

   SECTION 3: DEFAULT CONFIG

   Starting config used when no config.json exists yet.

   Edit this to change the default dashboard layout for new installations.



   Icon paths (/icons/name.svg) reference locally cached selfhst/icons files.

   ═══════════════════════════════════════════ */
