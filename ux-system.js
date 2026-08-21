/* WarTab Personal Command Deck — gallery, edit mode, undo, layout studio, presets. */
(function () {
  'use strict';

  var overlay = null;
  var editCardId = null;
  var layoutDraft = null;
  var undoStack = [];
  var redoStack = [];
  var HISTORY_LIMIT = 30;

  var FIRST_RUN_TEMPLATES = [
    { id:'command-center', name:'Command Center', icon:'terminal', description:'Search, favorite links, system health, clock, and notes.', cards:['search','links','resource-monitor','clock','notes'] },
    { id:'homelab', name:'Dense Homelab', icon:'server', description:'Launchers and live infrastructure status in a compact command surface.', cards:['links','service-status','resource-monitor','proxmox','git'] },
    { id:'calm', name:'Calm Start', icon:'sunrise', description:'A quiet daily view with search, clock, weather, agenda, and notes.', cards:['search','clock','weather','agenda','notes'] },
    { id:'empty', name:'Start Empty', icon:'square-dashed', description:'A completely blank page. Add only what matters to you.', cards:[] }
  ];

  var EXPERIENCE_PRESETS = {
    'command-center': { name:'Command Center', description:'High contrast, crisp surfaces, compact density.', theme:{ glow:'#7c9cff', cardOpacity:0.9, cardRadius:10 }, layout:{ gap:14 } },
    'dense-homelab': { name:'Dense Homelab', description:'Maximum information density with restrained chrome.', theme:{ glow:'#64d98b', cardOpacity:0.94, cardRadius:7 }, layout:{ gap:10 } },
    'calm-minimal': { name:'Calm Minimal', description:'Soft hierarchy, generous breathing room, quiet accent.', theme:{ glow:'#a7a0ff', cardOpacity:0.82, cardRadius:14 }, layout:{ gap:18 } },
    'ambient-glass': { name:'Ambient Glass', description:'More translucency and glow for visual dashboards.', theme:{ glow:'#5ed7ff', cardOpacity:0.68, cardRadius:16 }, layout:{ gap:16 } },
    'mobile-first': { name:'Mobile First', description:'Touch-forward shell and explicit mobile card profile.', theme:{ glow:'#ff9f68', cardOpacity:0.9, cardRadius:12 }, layout:{ gap:14 }, mobile:true }
  };

  function snapshot(label) { return { label:label, config:cloneObj(config) }; }
  function restore(entry) {
    config = cloneObj(entry.config); pageInit(); saveConfig(); applyTheme(); renderAll(); renderPageNav();
    toast(entry.label, 'success'); updateHistoryButtons();
  }
  function pushHistory(label) {
    undoStack.push(snapshot(label));
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = []; updateHistoryButtons();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot('Redo change'));
    restore(undoStack.pop());
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot('Undo change'));
    restore(redoStack.pop());
  }
  function updateHistoryButtons() {
    var u=document.getElementById('btn-undo'), r=document.getElementById('btn-redo');
    if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length;
  }
  window.WarTabUndo = { push:pushHistory, undo:undo, redo:redo, canUndo:function(){return !!undoStack.length;}, canRedo:function(){return !!redoStack.length;} };

  function closeSurface() {
    if (!overlay) return;
    overlay.remove(); overlay=null; layoutDraft=null;
    document.body.classList.remove('ux-surface-open');
  }
  function surface(title, subtitle, className) {
    closeSurface();
    overlay=document.createElement('div');overlay.className='ux-overlay';overlay.tabIndex=-1;
    var panel=document.createElement('section');panel.className='ux-surface '+(className||'');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);
    var head=document.createElement('header');head.className='ux-surface-head';
    head.innerHTML='<div><div class="ux-eyebrow">PERSONAL COMMAND DECK</div><h2>'+escHtml(title)+'</h2><p>'+escHtml(subtitle||'')+'</p></div>';
    var close=document.createElement('button');close.className='btn btn-glass btn-icon';close.setAttribute('aria-label','Close');close.appendChild(ds.icon('x'));close.onclick=closeSurface;head.appendChild(close);
    var body=document.createElement('div');body.className='ux-surface-body';panel.appendChild(head);panel.appendChild(body);overlay.appendChild(panel);document.body.appendChild(overlay);document.body.classList.add('ux-surface-open');
    overlay.onclick=function(e){if(e.target===overlay)closeSurface();};
    overlay.onkeydown=function(e){if(e.key==='Escape')closeSurface();};
    renderIcons();setTimeout(function(){var focus=panel.querySelector('input,button');if(focus)focus.focus();},0);
    return body;
  }

  function createGalleryCard(def) {
    var button=document.createElement('button');button.className='gallery-card';button.type='button';button.dataset.category=def.category||'Other';button.dataset.search=(def.label+' '+def.description+' '+def.category).toLowerCase();
    button.innerHTML='<span class="gallery-preview" data-role="'+def.role+'"><i data-lucide="'+def.icon+'"></i><span class="gallery-preview-lines"><b></b><i></i><i></i></span></span><span class="gallery-copy"><strong>'+escHtml(def.label)+'</strong><span>'+escHtml(def.description||'')+'</span><small><b>'+escHtml(def.role)+'</b> · '+escHtml(def.recommendedSize||'1 × 1')+(def.setup?' · Requires '+escHtml(def.setup):'')+'</small></span><i data-lucide="plus" class="gallery-add"></i>';
    button.onclick=function(){
      pushHistory('Undo add '+def.label);
      var parts=(def.recommendedSize||'1 × 1').split('×').map(function(x){return parseInt(x,10)||1;});
      var card=WarTabCardModel.addCard(config,def.type,{title:def.label,icon:def.icon,role:def.role,width:Math.min(parts[0],getPageCols()),height:Math.min(parts[1],4)},{maxColumns:getPageCols(),makeId:uid});
      saveConfig();renderAll();closeSurface();openCardEditPanel(card.id);toast(def.label+' added','success');
    };
    return button;
  }

  function applyTemplate(template) {
    pushHistory('Undo template '+template.name);
    var page=config.pages[config.currentPage];page.cards=[];
    template.cards.forEach(function(type,index){
      var def=WarTabCardModel.getTypeDef(type);var size=(def.recommendedSize||'1 × 1').split('×').map(function(x){return parseInt(x,10)||1;});
      WarTabCardModel.addCard(config,type,{title:def.label,icon:def.icon,role:def.role,width:Math.min(size[0],getPageCols()),height:Math.min(size[1],4),mobileOrder:index},{maxColumns:getPageCols(),makeId:uid});
    });
    saveConfig();renderAll();closeSurface();toast(template.name+' applied','success');
  }

  function openCardGallery() {
    var body=surface('Card Gallery','Choose by purpose, preview the role, then configure after adding.','card-gallery-surface');
    var tools=document.createElement('div');tools.className='gallery-tools';tools.innerHTML='<label class="gallery-search"><i data-lucide="search"></i><input type="search" placeholder="Search cards by name or purpose" aria-label="Search cards"></label><div class="gallery-categories" role="tablist"></div>';
    body.appendChild(tools);
    var categories=['All'].concat(Array.from(new Set(CARD_TYPE_DEFS.map(function(d){return d.category||'Other';}))));
    var category='All', query='';
    var tabs=tools.querySelector('.gallery-categories');
    var grid=document.createElement('div');grid.className='gallery-grid';
    function filter(){Array.from(grid.children).forEach(function(el){el.hidden=!((category==='All'||el.dataset.category===category)&&(!query||el.dataset.search.includes(query)));});}
    categories.forEach(function(name){var b=document.createElement('button');b.className='gallery-category'+(name==='All'?' active':'');b.textContent=name;b.onclick=function(){category=name;tabs.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b);});filter();};tabs.appendChild(b);});
    tools.querySelector('input').oninput=function(e){query=e.target.value.trim().toLowerCase();filter();};
    var templates=document.createElement('section');templates.className='template-strip';templates.innerHTML='<div class="gallery-section-title"><span>STARTING POINTS</span><small>Replaces this page only after you choose one</small></div>';
    var templateGrid=document.createElement('div');templateGrid.className='template-grid';
    FIRST_RUN_TEMPLATES.forEach(function(t){var b=document.createElement('button');b.className='template-card';b.innerHTML='<i data-lucide="'+t.icon+'"></i><span><strong>'+t.name+'</strong><small>'+t.description+'</small></span>';b.onclick=function(){showConfirmModal('Replace this page with the “'+t.name+'” template?',function(){applyTemplate(t);},{ok:'Apply template'});};templateGrid.appendChild(b);});
    templates.appendChild(templateGrid);body.appendChild(templates);
    var title=document.createElement('div');title.className='gallery-section-title';title.innerHTML='<span>ALL CARDS</span><small>'+CARD_TYPE_DEFS.length+' modules · manual sizing always</small>';body.appendChild(title);
    CARD_TYPE_DEFS.forEach(function(def){grid.appendChild(createGalleryCard(def));});body.appendChild(grid);renderIcons();
  }
  window.openCardGallery=openCardGallery;

  function exitContextualEditMode() { document.body.classList.remove('contextual-edit-mode');editCardId=null;document.querySelectorAll('.card-context-selected').forEach(function(x){x.classList.remove('card-context-selected');});var bar=document.getElementById('context-edit-bar');if(bar)bar.remove(); }
  function selectEditCard(cardId) {
    editCardId=cardId;document.querySelectorAll('.card-context-selected').forEach(function(x){x.classList.remove('card-context-selected');});var el=document.querySelector('.card[data-card-id="'+cardId+'"]');if(el)el.classList.add('card-context-selected');
    var card=WarTabCardModel.getCardById(config,cardId), bar=document.getElementById('context-edit-bar');if(!card||!bar)return;
    bar.querySelector('.context-card-name').textContent=card.title||'Untitled';
  }
  function enterContextualEditMode(cardId) {
    document.body.classList.add('contextual-edit-mode');var bar=document.getElementById('context-edit-bar');if(!bar){bar=document.createElement('div');bar.id='context-edit-bar';bar.innerHTML='<span class="context-edit-mode"><i data-lucide="wand-2"></i> EDIT MODE</span><strong class="context-card-name">Select a card</strong><span class="context-edit-actions"><button data-action="inspect"><i data-lucide="sliders-horizontal"></i><span>Inspect</span></button><button data-action="layout"><i data-lucide="layout-grid"></i><span>Layout</span></button><button data-action="duplicate"><i data-lucide="copy"></i><span>Duplicate</span></button><button data-action="hide"><i data-lucide="eye-off"></i><span>Mobile</span></button><button data-action="done"><i data-lucide="check"></i><span>Done</span></button></span>';document.body.appendChild(bar);bar.onclick=function(e){var a=e.target.closest('[data-action]');if(!a)return;var card=editCardId&&WarTabCardModel.getCardById(config,editCardId);if(a.dataset.action==='done')exitContextualEditMode();else if(a.dataset.action==='layout')openLayoutStudio();else if(a.dataset.action==='inspect'&&card)openCardEditPanel(card.id);else if(a.dataset.action==='duplicate'&&card){pushHistory('Undo duplicate');var copy=cloneObj(card);copy.id='card-'+uid();copy.title=(copy.title||'Card')+' Copy';config.cards.splice(config.cards.indexOf(card)+1,0,copy);saveConfig();renderAll();selectEditCard(copy.id);}else if(a.dataset.action==='hide'&&card){pushHistory('Undo mobile visibility');card.mobileHidden=!card.mobileHidden;saveConfig();renderAll();selectEditCard(card.id);}};}
    renderIcons();if(cardId)selectEditCard(cardId);
  }
  window.enterContextualEditMode=enterContextualEditMode;
  document.getElementById('card-grid').addEventListener('click',function(e){if(!document.body.classList.contains('contextual-edit-mode'))return;var card=e.target.closest('.card[data-card-id]');if(card){e.preventDefault();e.stopPropagation();selectEditCard(card.dataset.cardId);}},true);

  function draftFromCards(){var result={};config.cards.forEach(function(card,index){result[card.id]={width:card.width||1,height:card.height||1,mobileHidden:!!card.mobileHidden,mobileOrder:Number.isFinite(Number(card.mobileOrder))?Number(card.mobileOrder):index};});return result;}
  function layoutMini(card,index){var d=layoutDraft[card.id];var el=document.createElement('article');el.className='layout-mini';el.dataset.cardId=card.id;el.style.gridColumn='span '+Math.min(d.width,getPageCols());el.style.gridRow='span '+Math.min(d.height,4);el.innerHTML='<header><i data-lucide="'+(card.icon||'package')+'"></i><strong>'+escHtml(card.title||'Untitled')+'</strong><span>'+WarTabCardModel.getCardRole(card)+'</span></header><div class="layout-mini-controls"><label>W <button data-step="width:-1">−</button><b>'+d.width+'</b><button data-step="width:1">+</button></label><label>H <button data-step="height:-1">−</button><b>'+d.height+'</b><button data-step="height:1">+</button></label><label class="mobile-toggle"><input type="checkbox" '+(d.mobileHidden?'checked':'')+'> Hide mobile</label><label>Order <input type="number" min="0" value="'+d.mobileOrder+'"></label></div>';el.onclick=function(e){var step=e.target.closest('[data-step]');if(step){var bits=step.dataset.step.split(':'),key=bits[0],delta=parseInt(bits[1],10),max=key==='width'?getPageCols():4;d[key]=Math.max(1,Math.min(max,d[key]+delta));renderLayoutDraft();}};el.querySelector('[type=checkbox]').onchange=function(e){d.mobileHidden=e.target.checked;};el.querySelector('[type=number]').onchange=function(e){d.mobileOrder=Math.max(0,parseInt(e.target.value,10)||0);};return el;}
  function renderLayoutDraft(){var stage=document.querySelector('.layout-stage');if(!stage)return;stage.innerHTML='';config.cards.forEach(function(card,index){stage.appendChild(layoutMini(card,index));});renderIcons();}
  function applyLayoutDraft(){if(!layoutDraft)return;pushHistory('Undo layout changes');config.cards.forEach(function(card){var d=layoutDraft[card.id];if(!d)return;card.width=d.width;card.height=d.height;card.mobileHidden=d.mobileHidden;card.mobileOrder=d.mobileOrder;});saveConfig();renderAll();closeSurface();toast('Layout applied','success');}
  function cancelLayoutDraft(){closeSurface();}
  function openLayoutStudio(){layoutDraft=draftFromCards();var body=surface('Layout Studio','Preview manual spans and mobile profiles. Nothing changes until Apply.','layout-studio-surface');var toolbar=document.createElement('div');toolbar.className='layout-toolbar';toolbar.innerHTML='<div class="layout-viewport-tabs"><button class="active" data-view="desktop">Desktop</button><button data-view="tablet">Tablet</button><button data-view="mobile">Mobile</button></div><div class="layout-legend"><span>Manual geometry</span><span>Draft only</span></div>';body.appendChild(toolbar);var stage=document.createElement('div');stage.className='layout-stage';body.appendChild(stage);var footer=document.createElement('footer');footer.className='layout-actions';footer.innerHTML='<button class="btn btn-glass" data-layout-action="cancel">Cancel</button><button class="btn btn-glass" data-layout-action="reset">Reset draft</button><button class="btn btn-primary" data-layout-action="apply">Apply layout</button>';footer.onclick=function(e){var a=e.target.dataset.layoutAction;if(a==='apply')applyLayoutDraft();else if(a==='cancel')cancelLayoutDraft();else if(a==='reset'){layoutDraft=draftFromCards();renderLayoutDraft();}};body.appendChild(footer);toolbar.onclick=function(e){var b=e.target.closest('[data-view]');if(!b)return;toolbar.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b);});stage.dataset.preview=b.dataset.view;};renderLayoutDraft();}
  window.openLayoutStudio=openLayoutStudio;window.applyLayoutDraft=applyLayoutDraft;window.cancelLayoutDraft=cancelLayoutDraft;

  function openExperiencePresets(){var body=surface('Experience Presets','Preview a cohesive visual direction. Presets never move or resize cards.','preset-surface');var grid=document.createElement('div');grid.className='preset-grid';Object.keys(EXPERIENCE_PRESETS).forEach(function(id){var p=EXPERIENCE_PRESETS[id],b=document.createElement('button');b.className='preset-card';b.innerHTML='<span class="preset-swatch" style="--preset-accent:'+p.theme.glow+'"><i></i><i></i><i></i></span><strong>'+p.name+'</strong><span>'+p.description+'</span><small>Accent · surfaces · radius · spacing'+(p.mobile?' · mobile profile':'')+'</small>';b.onclick=function(){showConfirmModal('Apply “'+p.name+'”? Card sizes and order will not change.',function(){pushHistory('Undo preset '+p.name);Object.assign(config.theme,p.theme);config.layout.gap=p.layout.gap;if(p.mobile)config.layout.mobileProfile='touch';saveConfig();applyTheme();renderAll();closeSurface();toast(p.name+' applied','success');},{ok:'Apply preset'});};grid.appendChild(b);});body.appendChild(grid);renderIcons();}
  window.openExperiencePresets=openExperiencePresets;

  function showCommandDeckHint() {
    try { if(localStorage.getItem('wartab.onboarding.command-deck'))return; } catch(e) {}
    var target=document.getElementById('btn-command');if(!target)return;
    var hint=document.createElement('aside');hint.className='command-deck-hint';hint.innerHTML='<i data-lucide="sparkles"></i><span><strong>Your dashboard has a command deck</strong><small>Command finds anything. Add opens the new Card Gallery. More contains Edit Mode, Layout Studio, and presets.</small></span><button aria-label="Dismiss onboarding">Got it</button>';
    hint.querySelector('button').onclick=function(){try{localStorage.setItem('wartab.onboarding.command-deck','1');}catch(e){}hint.remove();};
    document.body.appendChild(hint);renderIcons();
  }

  function initShell(){
    var command=document.getElementById('btn-command');if(command)command.onclick=function(){WarTabCommandPalette.open();};
    var more=document.getElementById('btn-more'),menu=document.getElementById('command-deck-menu');if(more&&menu){more.onclick=function(e){e.stopPropagation();var open=!menu.hidden;menu.hidden=open;more.setAttribute('aria-expanded',String(!open));};document.addEventListener('click',function(e){if(!menu.contains(e.target)&&e.target!==more){menu.hidden=true;more.setAttribute('aria-expanded','false');}});menu.onclick=function(e){var a=e.target.closest('[data-command]');if(!a)return;menu.hidden=true;var action=a.dataset.command;if(action==='pages')openPageManagementPanel();else if(action==='arrange')toggleArrangeMode();else if(action==='layout')openLayoutStudio();else if(action==='edit')enterContextualEditMode();else if(action==='presets')openExperiencePresets();else if(action==='settings')toggleConfigPanel();else if(action==='help')showShortcutsOverlay();};}
    var add=document.getElementById('btn-add-card');if(add)add.onclick=openCardGallery;
    var undoBtn=document.getElementById('btn-undo'),redoBtn=document.getElementById('btn-redo');if(undoBtn)undoBtn.onclick=undo;if(redoBtn)redoBtn.onclick=redo;updateHistoryButtons();renderIcons();setTimeout(showCommandDeckHint,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShell);else initShell();
})();
