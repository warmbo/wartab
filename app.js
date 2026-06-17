/* ═══════════════════════════════════════════
   WarTab — Application Logic
   ═══════════════════════════════════════════
   Sections:
     1. Card Type Modules  — registerModule() calls for each section type
     2. Config Panel       — edit panel, form helpers, section editor, section drag
     3. Default Config     — DEFAULT_CONFIG with field documentation
     4. Icon Data          — ICON_REPO, EMOJIS, LUCIDE_ICONS, migration maps
     5. Utilities          — isLucideName, renderLucideEl, uid, $/$$
     6. Config Load/Save   — loadConfig, saveConfig, applyChanges, renderAll
     7. Render             — renderCard, renderSection, renderLinkIcon, doSearch
     8. Widgets            — clocks, weather, API poller, quotes, status bars
     9. Drag & Drop        — card reorder with simGrid preview + FLIP animation
    10. Icon Picker        — library/upload/emoji/Lucide tabbed picker
    11. Background Upload  — image upload + compression
    12. Config Panel UI    — theme, branding, layout, status bar settings
    13. Init               — page load sequence
   ═══════════════════════════════════════════ */

const WARTAB_VERSION = '0.2.1';

/* ══════ Card Type Modules ══════
   Each module defines { render, editor, defaults } for a section type.
   Add new types here without touching core rendering. */
const CARD_MODULES = {};

function registerModule(type, module){
  CARD_MODULES[type]=module;
}

// Built-in modules — each owns { defaults, render(sec,card,cw), editor(sec,card,bd) }
registerModule('links', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}] },
  render: (sec,card,cw)=>{
    const ig=document.createElement('div');ig.className='link-grid';(sec.links||[]).forEach(link=>{
      const a=document.createElement('a');a.className='link-item';a.href=link.url;a.target='_blank';a.rel='noopener';
      a.appendChild(renderLinkIcon(link.icon));var s=document.createElement('span');s.className='link-label';s.textContent=link.label;
      a.appendChild(s);ig.appendChild(a);
    });cw.appendChild(ig);
  },
  editor: (sec,card,bd)=>{
    const header=document.createElement('div');header.className='me-link-th';
    header.innerHTML='<span class="mh-grab"></span><span class="mh-label">Label</span><span class="mh-icon">Icon</span><span class="mh-url">URL</span><span class="mh-remove"></span>';
    bd.appendChild(header);
    const container=document.createElement('div');container.style.cssText='position:relative;';
    (sec.links||[]).forEach((link,li2)=>{
      const row=document.createElement('div');row.className='me-link-tr';row.dataset.linkIdx=li2;
      // Grab handle
      const gh=document.createElement('span');gh.className='me-link-grab';gh.textContent='⠿';gh.title='Drag to reorder';
      gh.addEventListener('pointerdown',(e)=>startLinkDrag(e,row,sec,li2));
      const li2_i=document.createElement('input');li2_i.className='cp-input';li2_i.placeholder='Label';li2_i.value=link.label;
      li2_i.addEventListener('change',()=>{sec.links[li2].label=li2_i.value;saveAndRefresh();});
      const ic=document.createElement('button');ic.className='me-icon-btn';
      if(link.icon&&(link.icon.startsWith('http')||link.icon.startsWith('data:')||link.icon.startsWith('/'))){const img=document.createElement('img');img.src=link.icon;img.alt='';ic.appendChild(img);}else if(isLucideName(link.icon)){const li=document.createElement('i');li.setAttribute('data-lucide',link.icon);ic.appendChild(li);}else{ic.textContent=link.icon||'🔗';}
      ic.title='Change icon';ic.addEventListener('click',()=>openIconPicker(url=>{sec.links[li2].icon=url;saveAndRefresh();}));
      const ui=document.createElement('input');ui.className='cp-input';ui.placeholder='https://';ui.value=link.url;
      ui.addEventListener('change',()=>{sec.links[li2].url=ui.value;saveAndRefresh();});
      const rm = cpBtn('✕', true); rm.title = '';
      rm.addEventListener('click',()=>{sec.links.splice(li2,1);saveAndRefresh();});
      row.appendChild(gh);row.appendChild(li2_i);row.appendChild(ic);row.appendChild(ui);row.appendChild(rm);
      container.appendChild(row);
    });
    bd.appendChild(container);
    const al=document.createElement('button');al.className='me-link-add';al.textContent='+ Add Link';
    al.addEventListener('click',()=>{sec.links=sec.links||[];sec.links.push({label:'New',url:'https://',icon:'link'});saveAndRefresh();});
    bd.appendChild(al);
  },
});
registerModule('link-list', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}] },
  render: (sec,card,cw)=>{
    const lst=document.createElement('div');lst.className='link-list';
    (sec.links||[]).forEach(link=>{
      const a=document.createElement('a');a.className='link-row';a.href=link.url;a.target='_blank';a.rel='noopener';
      a.appendChild(renderLinkIcon(link.icon));a.appendChild(document.createTextNode(' '+link.label));
      lst.appendChild(a);
    });cw.appendChild(lst);
  },
  editor: (sec,card,bd)=>{
    // link-list shares the same link-row editor as links
    CARD_MODULES['links'].editor(sec,card,bd);
  },
});
registerModule('search', {
  defaults: { placeholder:'Search...', engine:'Google' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='display:flex;gap:4px;align-items:stretch;';
    const wr=document.createElement('div');wr.className='inline-search-wrap';wr.innerHTML='<span class="search-icon"><i data-lucide="search"></i></span>';
    const i=document.createElement('input');i.type='text';i.placeholder=sec.placeholder||'Search...';wr.appendChild(i);
    w.appendChild(wr);
    const b=document.createElement('button');b.className='btn btn-glass btn-search';b.innerHTML='<i data-lucide="search"></i>';
    b.addEventListener('click',()=>doSearch(i.value,sec));i.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(i.value,sec);});
    w.appendChild(b);cw.appendChild(w);
    const en=sec.engine||config.search.selected||'Google';const t=document.createElement('div');t.className='search-engine-tag';t.textContent=en;cw.appendChild(t);
  },
  editor: (sec,card,bd)=>{
    const w=document.createElement('div');w.style.cssText='position:relative;margin-bottom:8px;';
    const wrap=document.createElement('div');wrap.className='inline-search-wrap';wrap.innerHTML='<span class="search-icon"><i data-lucide="search"></i></span>';
    const inp=document.createElement('input');inp.type='text';inp.placeholder=sec.placeholder||'Search...';inp.value='';wrap.appendChild(inp);w.appendChild(wrap);
    const btn=document.createElement('button');btn.className='btn btn-glass btn-search';btn.textContent='Go';btn.addEventListener('click',()=>doSearch(inp.value,sec));
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(inp.value,sec);});
    const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;';row.appendChild(w);row.appendChild(btn);bd.appendChild(row);
    bd.appendChild(cpLabel('Placeholder text'));
    const pi=document.createElement('input');pi.className='cp-input';pi.placeholder='Search...';pi.value=sec.placeholder||'Search...';
    pi.addEventListener('change',()=>{sec.placeholder=pi.value;saveAndRefresh();});bd.appendChild(pi);
    bd.appendChild(cpLabel('Search Engine'));
    const esel=cpSelect(Object.keys(config.search.engines).map(en=>({value:en,label:en})),sec.engine||config.search.selected||'Google',v=>{sec.engine=v;saveAndRefresh();});
    bd.appendChild(esel);
  },
});
registerModule('clock', {
  defaults: { format24h:false, showDate:true, showCalendar:false },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='clock-widget';w.dataset.format24=sec.format24h?'1':'0';w.dataset.showDate=sec.showDate?'1':'0';w.dataset.showCalendar=sec.showCalendar?'1':'0';
    w.innerHTML='<div class="clock-time">--:--</div><div class="clock-date"></div>';
    if(sec.showCalendar){const c=document.createElement('div');c.className='calendar-widget';c.id='cal-'+sec.id;w.appendChild(c);}
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    const g=document.createElement('div');g.className='me-check-group';
    g.appendChild(cpCheck('24hr',sec.format24h,v=>{sec.format24h=v;saveAndRefresh();}));
    g.appendChild(cpCheck('Show date',sec.showDate,v=>{sec.showDate=v;saveAndRefresh();}));
    g.appendChild(cpCheck('Show calendar',sec.showCalendar,v=>{sec.showCalendar=v;saveAndRefresh();}));
    bd.appendChild(g);
  },
});
registerModule('weather', {
  defaults: { apiKey:'', zip:'', country:'US', units:'imperial' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='weather-widget';w.style.textAlign='center';w.dataset.apiKey=sec.apiKey||'';w.dataset.zip=sec.zip||'';w.dataset.country=sec.country||'US';w.dataset.units=sec.units||'imperial';
    const iconRow=document.createElement('div');iconRow.className='weather-main';
    const iconEl=document.createElement('i');iconEl.className='weather-icon';iconEl.setAttribute('data-lucide','cloud');iconRow.appendChild(iconEl);
    const tempEl=document.createElement('div');tempEl.className='weather-temp';tempEl.textContent='--°';iconRow.appendChild(tempEl);
    w.appendChild(iconRow);
    const descEl=document.createElement('div');descEl.className='weather-detail';descEl.textContent='Loading...';w.appendChild(descEl);
    const windEl=document.createElement('div');windEl.className='weather-wind';windEl.style.cssText='font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px;display:flex;align-items:center;gap:4px;';
    const windIcon=document.createElement('i');windIcon.setAttribute('data-lucide','wind');windIcon.style.cssText='width:12px;height:12px;';windEl.appendChild(windIcon);
    const windVal=document.createElement('span');windVal.className='weather-wind-val';windVal.textContent='--';windEl.appendChild(windVal);
    w.appendChild(windEl);
    const tsEl=document.createElement('div');tsEl.className='weather-ts';tsEl.textContent='';w.appendChild(tsEl);
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('API Key'));
    bd.appendChild(cpInput('OpenWeatherMap API key',sec.apiKey||'',v=>{sec.apiKey=v;saveConfig();}));
    bd.appendChild(cpLabel('Zip Code'));
    bd.appendChild(cpInput('e.g. 90210',sec.zip||'',v=>{sec.zip=v;saveConfig();}));
    bd.appendChild(cpLabel('Country Code'));
    bd.appendChild(cpInput('US',sec.country||'US',v=>{sec.country=v;saveConfig();}));
    bd.appendChild(cpLabel('Units'));
    bd.appendChild(cpSelect([{value:'imperial',label:'°F'},{value:'metric',label:'°C'},{value:'standard',label:'K'}],sec.units||'imperial',v=>{sec.units=v;saveConfig();}));
  },
});
registerModule('iframe', {
  defaults: { url:'', height:300 },
  render: (sec,card,cw)=>{
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.height=(sec.height||300)+'px';ifr.allow='fullscreen';ifr.loading='lazy';cw.appendChild(ifr);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('URL'));
    const ui=cpInput('https://example.com/embed',sec.url||'',v=>{sec.url=v;saveAndRefresh();});bd.appendChild(ui);
    bd.appendChild(cpRange('Height (px)',sec.height||300,100,800,v=>{sec.height=parseInt(v);saveAndRefresh();}));
  },
});
registerModule('image', {
  defaults: { url:'', alt:'' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='padding:4px 0;';
    if(!sec.url){w.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:20px;">No image selected. Edit to add one.</div>';}
    else{
      const img=document.createElement('img');img.src=sec.url;img.alt=sec.alt||'';
      img.style.cssText='max-width:100%;height:auto;display:block;border-radius:4px;';
      img.loading='lazy';
      w.appendChild(img);
    }
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Image URL'));
    bd.appendChild(cpInput('Paste image URL or /uploads/...',sec.url||'',v=>{sec.url=v;saveAndRefresh();}));
    bd.appendChild(cpLabel('Alt text'));
    bd.appendChild(cpInput('Description',sec.alt||'',v=>{sec.alt=v;saveAndRefresh();}));
    bd.appendChild(cpHint('Upload images in the config panel > Background, then paste the URL here.'));
  },
});
registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    const e=document.createElement('div');e.className='notes-text';e.contentEditable=true;
    e.innerHTML=sec.content||'';
    // Load from server file (async — updates after initial render)
    storage.getNote(sec.id).then(function(d){
      if(d.content&&d.content!==sec.content){sec.content=d.content;e.innerHTML=d.content;}
    }).catch(function(){});
    e.addEventListener('blur',function(){
      sec.content=e.innerHTML;
      saveConfig();
      // Also save to server file
      storage.saveNote(sec.id, e.innerHTML).catch(function(){});
    });
    // Preserve line breaks on Enter
    e.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'){e.blur();return;}
      if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();document.execCommand('insertLineBreak');}
    });
    cw.appendChild(e);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the card and type directly. Content saved to notes/'+sec.id+'.md'));
  },
});

registerModule('api-poller', {
  defaults: { url:'', jsonPath:'', label:'API', refreshInterval:60 },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='api-widget';w.dataset.url=sec.url||'';w.dataset.jsonPath=sec.jsonPath||'';w.dataset.label=sec.label||'';w.dataset.refresh=sec.refreshInterval||60;
    w.innerHTML=`<div class="api-row"><span class="api-label">${escAttr(sec.label||'Loading...')}</span><span class="api-value">--</span></div>`;cw.appendChild(w);fetchApiWidget(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('API URL'));
    const ui=cpInput('https://api.example.com/status',sec.url||'',v=>{sec.url=v;saveConfig();});bd.appendChild(ui);
    bd.appendChild(cpLabel('JSON Path'));
    const pi=cpInput('e.g. data.cpu.usage',sec.jsonPath||'',v=>{sec.jsonPath=v;saveConfig();});bd.appendChild(pi);
    bd.appendChild(cpRange('Refresh (seconds)',sec.refreshInterval||60,5,600,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});

registerModule('quotes', {
  defaults: { quotes:[] },
  render: (sec,card,cw)=>{
    const q=document.createElement('div');q.className='quotes-widget';
    q.style.cssText='display:flex;flex-direction:column;gap:6px;padding:4px 0;min-height:80px;';
    const txt=document.createElement('div');txt.className='quotes-text';
    txt.style.cssText='font-size:var(--text-lg);line-height:1.5;font-style:italic;color:var(--text-primary);position:relative;padding-left:20px;';
    const qm=document.createElement('span');qm.textContent='"';qm.style.cssText='position:absolute;left:0;top:-4px;font-size:var(--text-2xl);color:var(--accent);opacity:0.5;font-style:normal;';txt.appendChild(qm);
    const cont=document.createElement('span');cont.className='quotes-content';cont.textContent='Click to load';
    cont.addEventListener('click',function(e){e.stopPropagation();fetchQuote(q,sec);});
    txt.appendChild(cont);
    q.appendChild(txt);
    const auth=document.createElement('div');auth.className='quotes-author';
    auth.style.cssText='font-size:var(--text-xs);color:var(--text-secondary);text-align:right;padding-right:4px;';
    const aName=document.createElement('span');aName.className='quotes-author-name';aName.textContent='';auth.appendChild(aName);
    q.appendChild(auth);
    q.dataset.secId=sec.id;
    cw.appendChild(q);
    setTimeout(function(){fetchQuote(q,sec);},100);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the quote text to refresh.'));
    // User-added quotes
    bd.appendChild(cpLabel('Custom Quotes'));
    const list=document.createElement('div');list.style.cssText='margin-bottom:8px;';
    const renderQuotes=()=>{
      list.innerHTML='';
      (sec.quotes||[]).forEach((qt,i)=>{
        const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;align-items:center;margin-bottom:4px;font-size:var(--text-xs);';
        row.innerHTML='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);">"'+escAttr(qt.q)+'" — '+escAttr(qt.a)+'</span>';
        const rm=document.createElement('button');rm.className='btn btn-glass btn-sm';rm.textContent='✕';rm.style.cssText='padding:0 4px;font-size:var(--text-2xs);';
        rm.addEventListener('click',()=>{sec.quotes.splice(i,1);renderQuotes();saveAndRefresh();});
        row.appendChild(rm);list.appendChild(row);
      });
    };
    renderQuotes();
    bd.appendChild(list);
    // Add quote form
    const addRow=document.createElement('div');addRow.style.cssText='display:flex;gap:4px;margin-bottom:6px;';
    const qInp=document.createElement('input');qInp.className='cp-input';qInp.placeholder='Quote text';qInp.style.cssText='flex:2;';
    const aInp=document.createElement('input');aInp.className='cp-input';aInp.placeholder='Author';aInp.style.cssText='flex:1;';
    const addBtn=document.createElement('button');addBtn.className='btn btn-glass btn-sm';addBtn.textContent='+';
    addBtn.addEventListener('click',()=>{
      const t=qInp.value.trim(),au=aInp.value.trim()||'Anonymous';
      if(!t)return;
      sec.quotes=sec.quotes||[];sec.quotes.push({q:t,a:au});
      qInp.value='';aInp.value='';renderQuotes();saveAndRefresh();
    });
    addRow.appendChild(qInp);addRow.appendChild(aInp);addRow.appendChild(addBtn);bd.appendChild(addRow);
  },
});
registerModule('timer', {
  defaults: { mode:'interval', duration:300, targetDate:'', label:'' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='text-align:center;padding:8px 0;';
    w.dataset.secId=sec.id;
    const display=document.createElement('div');display.className='timer-display';
    display.style.cssText='font-size:var(--text-3xl);font-weight:200;letter-spacing:2px;font-variant-numeric:tabular-nums;font-family:var(--font);padding:8px 0;';
    display.textContent='--:--';
    w.appendChild(display);
    if(sec.mode==='countdown'){
      // ── Countdown / event timer ──
      const labelEl=document.createElement('div');labelEl.style.cssText='font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px;';
      if(sec.label)labelEl.textContent=sec.label;
      w.appendChild(labelEl);
      const info=document.createElement('div');info.className='timer-info';info.style.cssText='font-size:var(--text-2xs);color:var(--text-tertiary);margin-top:2px;';
      w.appendChild(info);
      function updateCountdown(){
        if(!sec.targetDate){display.textContent='--:--';info.textContent='Set target date in editor';return;}
        const now=Date.now(),target=new Date(sec.targetDate).getTime(),diff=target-now;
        if(diff<=0){display.textContent='★ EVENT PASSED ★';display.style.color='var(--accent)';info.textContent='Target was '+new Date(sec.targetDate).toLocaleDateString();return;}
        const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
        display.style.color='';display.textContent=d+'d '+String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';
        info.textContent=diff>86400000?Math.floor(diff/86400000)+' days until' :'Today!';
      }
      updateCountdown();
      setInterval(updateCountdown,1000);
    } else {
      // ── Interval timer (existing behavior) ──
      const btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:6px;justify-content:center;margin-top:4px;';
      const startBtn=document.createElement('button');startBtn.className='btn btn-glass btn-sm';startBtn.textContent='▶ Start';
      const resetBtn=document.createElement('button');resetBtn.className='btn btn-glass btn-sm';resetBtn.textContent='↺ Reset';
      btnRow.appendChild(startBtn);btnRow.appendChild(resetBtn);w.appendChild(btnRow);
      let remaining=sec.duration||300;
      let interval=null;
      const fmt=s=>{const m=Math.floor(s/60);const s2=s%60;return String(m).padStart(2,'0')+':'+String(s2).padStart(2,'0');};
      const updateDisplay=()=>{display.textContent=fmt(remaining);if(remaining<=0){display.textContent='★ TIME UP ★';display.style.color='var(--accent)';}};
      const stop=()=>{if(interval){clearInterval(interval);interval=null;startBtn.textContent='▶ Start';}};
      const start=()=>{if(interval)return;if(remaining<=0){remaining=sec.duration||300;display.style.color='';}interval=setInterval(()=>{remaining--;updateDisplay();if(remaining<=0)stop();},1000);startBtn.textContent='⏸ Pause';};
      startBtn.addEventListener('click',()=>{if(interval)stop();else start();});
      resetBtn.addEventListener('click',()=>{showConfirmModal('Reset timer?',()=>{stop();remaining=sec.duration||300;display.style.color='';updateDisplay();});});
      updateDisplay();
    }
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    const modeRow=document.createElement('div');modeRow.style.cssText='margin-bottom:10px;';
    modeRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Mode'));
    const modeSel=document.createElement('select');modeSel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';
    [{value:'interval',label:'Stopwatch / Interval'},{value:'countdown',label:'Countdown to Date'}].forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===(sec.mode||'interval'))opt.selected=true;modeSel.appendChild(opt);});
    modeRow.appendChild(modeSel);bd.appendChild(modeRow);
    const intervalFields=document.createElement('div');intervalFields.id='timer-interval-'+sec.id;
    const countdownFields=document.createElement('div');countdownFields.id='timer-cd-'+sec.id;countdownFields.style.display='none';
    // Interval fields
    const h=Math.floor((sec.duration||300)/3600),mm=Math.floor(((sec.duration||300)%3600)/60);
    const hSel=document.createElement('select');hSel.style.cssText='width:70px;padding:5px 6px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    for(let i=0;i<24;i++){const o=document.createElement('option');o.value=i;o.textContent=i+'h';if(i===h)o.selected=true;hSel.appendChild(o);}
    const mSel=document.createElement('select');mSel.style.cssText='width:70px;padding:5px 6px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;margin-left:8px;';
    for(let i=0;i<60;i+=5){const o=document.createElement('option');o.value=i;o.textContent=i+'m';if(i===mm)o.selected=true;mSel.appendChild(o);}
    const syncDuration=()=>{sec.duration=parseInt(hSel.value)*3600+parseInt(mSel.value)*60;saveAndRefresh();};
    hSel.addEventListener('change',syncDuration);mSel.addEventListener('change',syncDuration);
    const durRow=document.createElement('div');durRow.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:10px;';
    durRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-right:4px;','Duration'));
    durRow.appendChild(hSel);durRow.appendChild(mSel);intervalFields.appendChild(durRow);
    // Countdown fields
    const dateRow=document.createElement('div');dateRow.style.cssText='margin-bottom:10px;';
    dateRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Target Date'));
    const dtInp=document.createElement('input');dtInp.type='datetime-local';dtInp.value=sec.targetDate?sec.targetDate.slice(0,16):'';dtInp.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    dtInp.addEventListener('change',()=>{sec.targetDate=dtInp.value;saveAndRefresh();});
    dateRow.appendChild(dtInp);countdownFields.appendChild(dateRow);
    const labelRow=document.createElement('div');labelRow.style.cssText='margin-bottom:10px;';
    labelRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Event Label'));
    const lbInp=document.createElement('input');lbInp.type='text';lbInp.value=sec.label||'';lbInp.placeholder='e.g. Birthday';lbInp.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    lbInp.addEventListener('change',()=>{sec.label=lbInp.value;saveAndRefresh();});
    labelRow.appendChild(lbInp);countdownFields.appendChild(labelRow);
    // Toggle visibility based on mode
    function toggleFields(){
      const isCd = (modeSel.value === 'countdown');
      intervalFields.style.display = isCd ? 'none' : '';
      countdownFields.style.display = isCd ? '' : 'none';
    }
    modeSel.addEventListener('change',()=>{sec.mode=modeSel.value;toggleFields();saveAndRefresh();});
    toggleFields();
    bd.appendChild(intervalFields);bd.appendChild(countdownFields);
  },
});

registerModule('resource-monitor', {
  defaults: { source:'local', glancesUrl:'http://localhost:61209', refreshInterval:15 },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='resource-monitor';
    w.style.cssText='display:flex;flex-direction:column;gap:10px;padding:4px 0;';
    w.dataset.refresh=sec.refreshInterval||15;
    w.dataset.source=sec.source||'local';w.dataset.glancesUrl=sec.glancesUrl||'';
    const bars=[
      {key:'cpu',label:'CPU'},
      {key:'ram',label:'RAM'},
      {key:'disk',label:'Storage'},
      {key:'net',label:'Network'}
    ];
    bars.forEach(b=>{
      const row=document.createElement('div');row.style.cssText='display:flex;flex-direction:column;gap:2px;';
      const labelRow=document.createElement('div');labelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
      const lbl=document.createElement('span');lbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent=b.label;
      const val=document.createElement('span');val.className='rm-val-'+b.key;val.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;';
      val.textContent='--';
      labelRow.appendChild(lbl);labelRow.appendChild(val);row.appendChild(labelRow);
      const track=document.createElement('div');track.style.cssText='height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;';
      const fill=document.createElement('div');fill.className='rm-fill-'+b.key;
      fill.style.cssText='height:100%;width:0%;background:var(--accent);border-radius:3px;transition:width 0.4s ease;';
      track.appendChild(fill);row.appendChild(track);w.appendChild(row);
    });
    const sysRow=document.createElement('div');sysRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:2px;';
    const hostEl=document.createElement('span');hostEl.className='rm-host';
    const tsEl=document.createElement('span');tsEl.className='rm-ts';
    sysRow.appendChild(hostEl);sysRow.appendChild(tsEl);
    w.appendChild(sysRow);
    cw.appendChild(w);
    function fetchData(){
      var url=sec.source==='glances'?(sec.glancesUrl||'http://localhost:61209')+'/api/4':'/api/stats';
      storage.getStats(sec.source, sec.glancesUrl).then(function(d){
        if(!d)return;
        var cpuPct,mem,disks,net,hostname,uptime;
        if(sec.source==='glances'){
          cpuPct=typeof d.cpu==='object'?parseFloat(d.cpu.total||0):0;
          mem=d.mem||{};
          disks=(d.fs||[]).filter(function(f){return f.mnt_point==='/'||f.mount==='/';});
          var root=disks[0]||{};
          net=d.network_bit||{};
          hostname=d.hostname||'';
          uptime={string:Math.floor((d.uptime||0)/3600)+'h'};
        }else{
          cpuPct=typeof d.cpu==='number'?d.cpu:0;
          mem=d.memory||{};
          disks=d.disks||[];
          var root=disks.find(function(d2){return d2.mount==='/';})||disks[0]||{};
          net=d.network||{};
          hostname=d.hostname||'';
          uptime=d.uptime||{};
        }
        w.querySelector('.rm-fill-cpu').style.width=Math.min(cpuPct,100)+'%';
        w.querySelector('.rm-val-cpu').textContent=(cpuPct||0).toFixed(1)+'%';
        var memPct=typeof mem.percent==='number'?mem.percent:0;
        w.querySelector('.rm-fill-ram').style.width=Math.min(memPct,100)+'%';
        var memUsed=mem.used?Math.round(mem.used/1024/1024/1024*10)/10:0;
        var memTotal=mem.total?Math.round(mem.total/1024/1024/1024*10)/10:0;
        w.querySelector('.rm-val-ram').textContent=memUsed+'/'+memTotal+'GB';
        var diskPct=typeof root.percent==='number'?root.percent:0;
        w.querySelector('.rm-fill-disk').style.width=Math.min(diskPct,100)+'%';
        var diskUsed=root.used?Math.round(root.used/1024/1024/1024*10)/10:0;
        var diskTotal=root.total?Math.round(root.total/1024/1024/1024*10)/10:0;
        w.querySelector('.rm-val-disk').textContent=diskUsed+'/'+diskTotal+'GB';
        var rx=0,tx=0;
        if(sec.source==='glances'){
          var firstIface=Object.keys(net)[0];
          if(firstIface){rx=(net[firstIface].rx||0);tx=(net[firstIface].tx||0);}
        }else{rx=net.rx_bytes||0;tx=net.tx_bytes||0;}
        var rxGb=Math.round(rx/1024/1024/1024*100)/100;
        var txGb=Math.round(tx/1024/1024/1024*100)/100;
        w.querySelector('.rm-fill-net').style.width='0%';
        w.querySelector('.rm-val-net').textContent='▼'+rxGb+'GB ▲'+txGb+'GB';
        w.querySelector('.rm-host').textContent=hostname;
        w.querySelector('.rm-ts').textContent='↑ '+(uptime.string||'');
      }).catch(function(){});
    }
    fetchData();
    setInterval(fetchData,(sec.refreshInterval||15)*1000);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Data Source'));
    bd.appendChild(cpSelect([{value:'local',label:'Local (/api/stats)'},{value:'glances',label:'Glances API'}],sec.source||'local',function(v){sec.source=v;saveAndRefresh();}));
    var urlWrap=document.createElement('div');urlWrap.id='rm-url-'+sec.id;
    function renderUrl(){
      urlWrap.innerHTML='';
      if(sec.source==='glances'){urlWrap.appendChild(cpLabel('Glances URL'));urlWrap.appendChild(cpInput('http://localhost:61209',sec.glancesUrl||'',function(v){sec.glancesUrl=v;saveConfig();}));}
    }
    renderUrl();
    var sel=bd.querySelector('select');if(sel)sel.addEventListener('change',function(){setTimeout(renderUrl,0);});
    bd.appendChild(urlWrap);
    bd.appendChild(cpRange('Refresh (seconds)',sec.refreshInterval||15,5,120,function(v){sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});
function bumpVersion(){
  const p=WARTAB_VERSION.split('.');
  p[p.length-1]=String(parseInt(p[p.length-1])+1);
  WARTAB_VERSION = p.join('.');
  const ft=$('#footer-text');
  if(ft)ft.textContent='WarTab v'+WARTAB_VERSION;
  return WARTAB_VERSION;
}

/* ── Edit Panel ── */
let _editingCardId = null, _editPanelOpen = false;

function openCardEditPanel(cardId) {
  const card = config.cards.find(c => c.id === cardId);
  if (!card) return;
  _editingCardId = cardId;
  _editPanelOpen = true;
  $('#edit-panel-body').innerHTML = '';
  buildCardEditPanel(card);
  $('#edit-panel-overlay').classList.add('open');
  $('#edit-panel').classList.add('open');
  const title = $('#edit-panel-title');
  if (title) title.textContent = '✎ ' + (card._isGap ? 'Edit Gap' : escAttr(card.title || 'Untitled'));
}

function closeCardEditPanel() {
  _editingCardId = null;
  _editingPageId = null;
  _editPanelOpen = false;
  $('#edit-panel-overlay').classList.remove('open');
  $('#edit-panel').classList.remove('open');
}

function saveAndRefresh() {
  saveConfig();
  if (_editingCardId) {
    renderAll();
    if (config.cards.find(c => c.id === _editingCardId)) {
      openCardEditPanel(_editingCardId);
    }
  } else if (_editingPageId) {
    renderAll();
    renderPageNav();
  } else {
    renderAll();
  }
}

let _editingPageId = null;

function openPageEditPanel(pageId) {
  const page = config.pages[pageId];
  if (!page) return;
  _editingPageId = pageId;
  _editingCardId = null;
  _editPanelOpen = true;
  const body = $('#edit-panel-body');
  body.innerHTML = '';
  const title = $('#edit-panel-title');
  if (title) title.textContent = '✎ Page: ' + escAttr(page.name);

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
  // Render icons
  setTimeout(function(){
    if(typeof lucide!=='undefined'){
      var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
      lucide.createIcons();
      console.warn=_lw;
    }
  }, 0);
}

/* ── Edit Panel Form Helpers ── */
function cpLabel(text) {
  const l = document.createElement('label');
  l.className = 'cp-label';
  l.textContent = text;
  return l;
}

function cpInput(placeholder, value, onChange) {
  const i = document.createElement('input');
  i.className = 'cp-input';
  i.type = 'text';
  i.placeholder = placeholder || '';
  i.value = value || '';
  if (onChange) i.addEventListener('change', () => onChange(i.value));
  return i;
}

function cpSelect(options, value, onChange) {
  const s = document.createElement('select');
  s.className = 'cp-select';
  (options || []).forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    s.appendChild(opt);
  });
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function cpCheck(label, checked, onChange) {
  const w = document.createElement('label');
  w.className = 'cp-check';
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = !!checked;
  c.addEventListener('change', () => onChange(c.checked));
  w.appendChild(c);
  w.appendChild(document.createTextNode(label));
  return w;
}

function cpRange(label, value, min, max, onChange) {
  const g = document.createElement('div');
  g.className = 'cp-range';
  g.appendChild(cpLabel(label));
  const row = document.createElement('div');
  row.className = 'cp-range-row';
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.value = value;
  const s = document.createElement('span');
  s.className = 'cp-range-val';
  s.textContent = value;
  r.addEventListener('input', () => { s.textContent = r.value; });
  const doChange = () => { onChange(r.value); s.textContent = r.value; };
  r.addEventListener('pointerup', doChange);
  r.addEventListener('keyup', e => { if (e.key === 'Enter') doChange(); });
  row.appendChild(r); row.appendChild(s);
  g.appendChild(row);
  return g;
}

function cpHint(text) {
  const d = document.createElement('div');
  d.className = 'cp-hint';
  d.textContent = text;
  return d;
}

function cpDivider(text) {
  const d = document.createElement('div');
  d.className = 'cp-divider';
  d.textContent = text;
  return d;
}

function cpBtn(text, danger) {
  const b = document.createElement('button');
  b.className = 'btn btn-glass btn-sm' + (danger ? ' btn-danger' : '');
  b.textContent = text;
  if (danger) b.title = text;
  return b;
}

/* ── Edit Panel Builder ── */
function buildCardEditPanel(card) {
  const body = $('#edit-panel-body');
  body.innerHTML = '';

  if (card._isGap) {
    body.appendChild(cpRange('Width', card.width, 1, config.layout.cols, v => {
      card.width = parseInt(v); saveAndRefresh();
    }));
    body.appendChild(cpRange('Min Height (px)', card.minHeight || 0, 0, 400, v => {
      card.minHeight = parseInt(v) || 0; saveAndRefresh();
    }));
    body.appendChild(cpCheck('Empty gap (no content)', true, v => {
      if (!v) { card.sections = card._savedSections || [{ id: 'sec-' + uid(), type: 'links', label: 'Links', links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] }]; }
      card._isGap = v;
      saveAndRefresh();
    }));
    const foot = document.createElement('div');
    foot.className = 'cp-footer';
    const done = cpBtn('Done');
    done.addEventListener('click', closeCardEditPanel);
    foot.appendChild(done);
    body.appendChild(foot);
    return;
  }

  /* ── Card Settings ── */
  body.appendChild(cpDivider('CARD SETTINGS'));
  const panel = document.createElement('div');
  panel.className = 'cs-panel';
  const grid = document.createElement('div');
  grid.className = 'cs-grid';

  // Title
  const titleG = document.createElement('div');
  titleG.className = 'cs-full cs-pair';
  titleG.appendChild(cpLabel('Title'));
  const ti = cpInput('Card title', card.title, v => { card.title = v; saveAndRefresh(); });
  titleG.appendChild(ti);
  grid.appendChild(titleG);

  // Icon
  const iconG = document.createElement('div');
  iconG.className = 'cs-pair';
  iconG.appendChild(cpLabel('Icon'));
  const iconRow = document.createElement('div');
  iconRow.className = 'cs-icon-row';
  const ip = document.createElement('span');
  ip.className = 'cs-icon-preview';
  if (card.icon && (card.icon.startsWith('http') || card.icon.startsWith('data:') || card.icon.startsWith('/'))) {
    const img = document.createElement('img'); img.src = card.icon; img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
    ip.appendChild(img);
  } else if (isLucideName(card.icon)) {
    ip.appendChild(renderLucideEl(card.icon, ''));
  } else {
    ip.textContent = card.icon || '📦';
  }
  iconRow.appendChild(ip);
  const chIcon = cpBtn('Change');
  chIcon.addEventListener('click', () => openIconPicker(url => { card.icon = url; saveAndRefresh(); }));
  iconRow.appendChild(chIcon);
  const clIcon = cpBtn('✕');
  clIcon.addEventListener('click', () => { card.icon = 'package'; saveAndRefresh(); });
  iconRow.appendChild(clIcon);
  iconG.appendChild(iconRow);
  grid.appendChild(iconG);

  // Color
  const colorG = document.createElement('div');
  colorG.className = 'cs-pair';
  colorG.appendChild(cpLabel('Color'));
  const colorRow = document.createElement('div');
  colorRow.className = 'cs-color-row';
  const cp = document.createElement('input');
  cp.type = 'color'; cp.value = card.color || config.theme.glow;
  cp.style.cssText = 'width:40px;height:34px;padding:2px;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);cursor:pointer;flex-shrink:0;';
  const ct = document.createElement('input');
  ct.className = 'cp-input';
  ct.type = 'text'; ct.value = card.color || config.theme.glow;
  const syncColor = v => { cp.value = v; ct.value = v; card.color = v; saveAndRefresh(); };
  cp.addEventListener('input', () => syncColor(cp.value));
  ct.addEventListener('change', () => syncColor(ct.value));
  colorRow.appendChild(cp);
  colorRow.appendChild(ct);
  colorG.appendChild(colorRow);
  grid.appendChild(colorG);

  // Width
  const wG = document.createElement('div');
  wG.className = 'cs-pair';
  wG.appendChild(cpRange('Width', card.width, 1, config.layout.cols, v => { card.width = parseInt(v); saveAndRefresh(); }));
  grid.appendChild(wG);

  // Height
  const hG = document.createElement('div');
  hG.className = 'cs-pair';
  hG.appendChild(cpRange('Height', card.height || 1, 1, 4, v => { card.height = parseInt(v); saveAndRefresh(); }));
  grid.appendChild(hG);

  // Gap toggle (full width)
  const gapG = document.createElement('div');
  gapG.className = 'cs-full';
  gapG.appendChild(cpCheck('Empty gap (no content)', false, v => {
    card._isGap = v;
    if (v) { card._savedSections = card.sections; card.sections = []; }
    else { card.sections = card._savedSections || []; }
    saveAndRefresh();
  }));
  grid.appendChild(gapG);

  // Transparent card (see-through, no bg/border/shadow)
  const trG = document.createElement('div');
  trG.className = 'cs-full';
  trG.appendChild(cpCheck('Transparent (no background)', card.transparent, v => { card.transparent = v; saveAndRefresh(); }));
  grid.appendChild(trG);

  panel.appendChild(grid);
  body.appendChild(panel);

  /* ── Sections ── */
  body.appendChild(cpDivider('SECTIONS'));
  (card.sections || []).forEach((sec, si) => {
    try {
      body.appendChild(buildSectionEditor(sec, card, si));
    } catch(e) {
      console.error('Section editor error', e);
    }
  });
  const addSecBtn = cpBtn('+ Add Section');
  addSecBtn.style.marginTop = '4px';
  addSecBtn.addEventListener('click', () => {
    card.sections = card.sections || [];
    card.sections.push({ id: 'sec-' + uid(), type: 'links', label: 'Links', links: [{ label: 'Example', url: 'https://example.com', icon: 'link' }] });
    saveAndRefresh();
    toast('Section added');
  });
  body.appendChild(addSecBtn);

  /* ── Footer ── */
  const foot = document.createElement('div');
  foot.className = 'cp-footer';
  const doneBtn = cpBtn('Done');
  doneBtn.addEventListener('click', closeCardEditPanel);
  foot.appendChild(doneBtn);
  const delBtn = cpBtn('Delete Card', true);
  delBtn.addEventListener('click', () => {
    const snap = cloneObj(config.cards);
    const idx = config.cards.findIndex(c => c.id === card.id);
    if (idx < 0) return;
    if (!confirm('Delete "' + (card.title || 'card') + '"?')) return;
    config.cards.splice(idx, 1);
    closeCardEditPanel();
    saveConfig();
    renderAll();
    toastWithUndo('Card deleted', () => { config.cards = snap; saveConfig(); renderAll(); });
  });
  foot.appendChild(delBtn);
  body.appendChild(foot);
}

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
    saveAndRefresh();
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
      saveAndRefresh();
    }
  );
  tg.appendChild(sel);
  row1.appendChild(tg);
  bd.appendChild(row1);

  /* Module editor fields */
  const mc = document.createElement('div');
  mc.className = 'me-card';
  const mod = CARD_MODULES[sec.type];  if (mod && mod.editor) mod.editor(sec, card, mc);
  if (mc.children.length > 0) bd.appendChild(mc);
  cardEl.appendChild(bd);

  /* ── Drag setup ── */
  dh.addEventListener('mousedown', e => {
    startSectionDrag(e, card.id, si, cardEl);
  });

  return cardEl;
}

function moveSection(cid, si, dir) {
  const c = config.cards.find(x => x.id === cid);
  if (!c) return;
  const t = si + dir, secs = c.sections;
  if (t < 0 || t >= secs.length) return;
  [secs[si], secs[t]] = [secs[t], secs[si]];
  saveAndRefresh();
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
    _insertAfter: null,
  };
  document.addEventListener('mousemove', onSecDragMove);
  document.addEventListener('mouseup', onSecDragEnd);
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
  document.removeEventListener('mousemove', onSecDragMove);
  document.removeEventListener('mouseup', onSecDragEnd);
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
            saveConfig();
            renderAll();
            openCardEditPanel(cardId);
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
const DEFAULT_CONFIG = {
  version: WARTAB_VERSION,

  /* ── Page branding (title + favicon-style icon) ── */
  branding: { title: 'WarTab', icon: 'sword' },

  /* ── Theme settings ── */
  theme: {
    bgType: 'gradient',           // 'color' | 'gradient' | 'image'
    bgValue: '#0a0a0a, #1a1a1a, #0d0d0d',  // CSS value: color, gradient(), or image path
    blur: 20,                     // backdrop-filter blur amount (px)
    glow: '#888888',              // accent color (grayscale)
    fontSizeText: 14,              // body text size in px (slider: 10-28)
    fontSizeHeading: 16,           // heading/card title size in px (slider: 10-28)
    fontFamily: 'Inter',          // Google Font name (or system font)
    cardBg: 'dark',               // card background variant
    fontColor: '#cccccc',         // text color override
    cardOpacity: 1,               // 0-1 opacity for card backgrounds
    bgRotate: false,              // rotate background on interval
    animations: true,             // enable CSS transitions/animations
    showAccentBar: true,          // show 3px accent bar at top of cards
  },

  /* ── Top-bar status display (CPU, RAM, disk, uptime) ── */
  statusBar: {
    enabled: true,
    source: 'local',              // 'local' | 'glances' | 'custom'
    glancesUrl: 'http://localhost:61209',
    customUrl: '',
    refreshInterval: 15,          // seconds
    items: ['cpu', 'memory', 'disk', 'uptime'],  // order/selection of stats
    hostname: true,
  },

  /* ── Grid layout ── */
  layout: {
    cols: 4,                      // number of grid columns
    gap: 16,                      // gap between cards (px)
    pageWidth: 'full',            // 'full' | 'three-quarters' | 'half'
    paddingHeight: 'full',        // 'full' (20px top/bottom) | 'compact' (120px)
  },

  /* ── Search widget settings ── */
  search: {
    engine: 'https://www.google.com/search?q=',
    engines: {
      Google: 'https://www.google.com/search?q=',
      DuckDuckGo: 'https://duckduckgo.com/?q=',
      Brave: 'https://search.brave.com/search?q=',
      Bing: 'https://www.bing.com/search?q=',
      YouTube: 'https://www.youtube.com/results?search_query=',
      Reddit: 'https://www.reddit.com/search/?q=',
      Wikipedia: 'https://en.wikipedia.org/w/index.php?search=',
    },
    selected: 'Google',
    openInNewTab: true,
  },

  /* ── Cards (each card is a dashboard panel with sections) ── */
  cards: [
    {
      id: 'search-card', title: 'Quick Search', icon: 'search',
      color: '#999999', width: 2,
      sections: [
        { id: 'search-main', type: 'search', engine: 'Google',
          placeholder: 'Search anything...', label: 'Web Search' },
      ],
    },
    {
      id: 'clock-card', title: 'Time & Date', icon: 'clock',
      color: '#aaaaaa', width: 1,
      sections: [
        { id: 'clock-main', type: 'clock', format24h: false, showDate: true },
      ],
    },
    {
      id: 'daily-drivers', title: 'Daily Drivers', icon: 'globe',
      color: '#cccccc', width: 2,
      sections: [
        {
          id: 'dev-links', type: 'links', label: 'Development',
          links: [
            { label: 'GitHub', url: 'https://github.com', icon: '/icons/github.svg' },
            { label: 'GitLab', url: 'https://gitlab.com', icon: '/icons/gitlab.svg' },
            { label: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '/icons/stackoverflow.svg' },
            { label: 'npm', url: 'https://www.npmjs.com', icon: 'package' },
            { label: 'PyPI', url: 'https://pypi.org', icon: 'code-2' },
          ],
        },
        {
          id: 'media-links', type: 'links', label: 'Media & Social',
          links: [
            { label: 'Reddit', url: 'https://reddit.com', icon: '/icons/reddit.svg' },
            { label: 'YouTube', url: 'https://youtube.com', icon: '/icons/youtube.svg' },
            { label: 'Twitch', url: 'https://twitch.tv', icon: '/icons/twitch.svg' },
            { label: 'X', url: 'https://x.com', icon: 'x' },
          ],
        },
      ],
    },
    {
      id: 'selfhosted', title: 'Self-Hosted', icon: 'monitor',
      color: '#777777', width: 2,
      sections: [
        {
          id: 'sh-services', type: 'links', label: 'Services',
          links: [
            { label: 'Home Assistant', url: 'http://homeassistant.local:8123', icon: '/icons/homeassistant.svg' },
            { label: 'Jellyfin', url: 'http://jellyfin.local:8096', icon: '/icons/jellyfin.svg' },
            { label: 'Pi-hole', url: 'http://pi.hole/admin', icon: '/icons/pihole.svg' },
            { label: 'Grafana', url: 'http://grafana.local:3000', icon: '/icons/grafana.svg' },
            { label: 'Portainer', url: 'http://portainer.local:9000', icon: '/icons/portainer.svg' },
            { label: 'Vaultwarden', url: 'http://vault.local:8080', icon: '/icons/vaultwarden.svg' },
          ],
        },
      ],
    },
    {
      id: 'dev-docs', title: 'Dev Docs', icon: 'book-open',
      color: '#8a8a8a', width: 1,
      sections: [
        {
          id: 'docs-links', type: 'link-list', label: 'References',
          links: [
            { label: 'MDN Web Docs', url: 'https://developer.mozilla.org', icon: 'globe' },
            { label: 'Python Docs', url: 'https://docs.python.org/3/', icon: 'book' },
            { label: 'Docker Docs', url: 'https://docs.docker.com', icon: '/icons/docker.svg' },
            { label: 'Arch Wiki', url: 'https://wiki.archlinux.org', icon: 'book' },
          ],
        },
      ],
    },
    {
      id: 'notes-card', title: 'Quick Notes', icon: 'edit-3',
      color: '#bbbbbb', width: 1,
      sections: [
        {
          id: 'notes-main', type: 'notes', label: 'Notes',
          content: '• WarTab is running!\n• Click ✎ on any card to edit it inline.\n• Drag ⠿ to reorder cards.',
        },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════
   SECTION 4: ICON DATA
   Icon repository (service icons from selfhst/icons),
   emoji list, Lucide icon name list, and emoji→Lucide migration map.
   ═══════════════════════════════════════════ */
const ICON_CDN = '/icons';
const ICON_REPO = [];
// Load service icons from selfhst index (complete, accurate filenames)
function loadIconRepo() {
  if (ICON_REPO.length > 0) return;
  storage.getIconIndex().then(function(data){
    data.forEach(function(item){
      if (item.SVG === 'Yes') {
        ICON_REPO.push({name: item.Name, file: item.Reference, tags: [item.Category || '']});
      }
    });
    // Also re-render if picker is open
    var picker = document.getElementById('icon-picker-content');
    if (picker && picker.parentElement.classList.contains('open')) {
      var activeTab = document.querySelector('.ip-tab.active');
      if (activeTab && activeTab.dataset.tab === 'library') buildLibraryTab(picker);
    }
  }).catch(function(){});
}
const EMOJIS = ['🔍','🕐','🌐','🖥️','📖','📝','🏠','🎬','🛡️','📊','🐳','🔐','🐙','🦊','📚','📦','🐍','💬','▶️','🎮','🐦','🌍','⚛️','📘','⚔️','⚙️','🔄','✕','🔗','🌟','🔥','💡','🚀','⚡','🎯','🧩','🎨','📡','🔧','🗄️','💾','🖨️','📷','🎥','🎵','🎙️','📻','📺','💻','⌨️','🖱️','📱','💽','💿','📀','🔌','🔋','💎','🧊','⛅','☀️','🌙','⭐','✨','💫','🎆','🌈','☁️','🌊','🔥','🍃','🌱','🌿','☘️','🍀','🏆','🥇','🥈','🥉','🏅','🎖️','🏁','🚩','🎌','📌','📍','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎸','🎺','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🎲','🧩','♠️','♥️','♦️','♣️'];
const LUCIDE_ICONS = ['search', 'clock', 'globe', 'monitor', 'book-open', 'edit-3', 'sword', 'home', 'film', 'shield', 'bar-chart-3', 'container', 'lock', 'github', 'gitlab', 'package', 'code-2', 'message-circle', 'play', 'gamepad-2', 'twitter', 'book', 'settings', 'plus', 'x', 'link', 'star', 'zap', 'flag', 'compass', 'map-pin', 'server', 'database', 'external-link', 'mail', 'music', 'image', 'cpu', 'hard-drive', 'activity', 'wifi', 'radio', 'smartphone', 'tablet', 'laptop', 'watch', 'camera', 'video', 'headphones', 'volume-2', 'monitor-speaker', 'tv', 'layers', 'grid', 'list', 'columns', 'layout', 'panel-top', 'panel-bottom', 'panel-left', 'panel-right', 'square', 'circle', 'triangle', 'hexagon', 'diamond', 'box', 'archive', 'folder', 'file', 'file-text', 'clipboard', 'check-square', 'check', 'x-square', 'trash-2', 'refresh-cw', 'rotate-cw', 'rotate-ccw', 'download', 'upload', 'cloud', 'cloud-drizzle', 'cloud-snow', 'cloud-lightning', 'sun', 'moon', 'thermometer', 'wind', 'droplets', 'umbrella', 'user', 'users', 'user-plus', 'user-check', 'user-x', 'bell', 'bell-ring', 'bell-off', 'eye', 'eye-off', 'lock', 'unlock', 'key', 'fingerprint', 'shield-off', 'alert-triangle', 'alert-circle', 'alert-octagon', 'info', 'help-circle', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'meh', 'heart', 'calendar', 'calendar-check', 'calendar-x', 'alarm-clock', 'timer', 'hourglass', 'stopwatch', 'map', 'navigation', 'navigation-2', 'crosshair', 'target', 'locate', 'send', 'inbox', 'mail', 'mail-open', 'at-sign', 'phone', 'message-square', 'message-text', 'chat', 'printer', 'scanner', 'bluetooth', 'battery', 'battery-charging', 'power', 'plug', 'bookmark', 'tag', 'award', 'trending-up', 'trending-down', 'pie-chart', 'sliders', 'filter', 'tool', 'wrench', 'hammer', 'paintbrush', 'palette', 'pen-tool', 'eraser', 'scissors', 'copy', 'paste', 'undo', 'redo', 'bold', 'italic', 'underline', 'type', 'hash', 'percent', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevrons-up', 'chevrons-down', 'chevrons-left', 'chevrons-right', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right', 'arrow-down-left', 'external-link', 'maximize', 'minimize', 'expand', 'shrink', 'fullscreen', 'dock', 'sidebar', 'menu', 'more-horizontal', 'more-vertical', 'chrome', 'codepen', 'figma', 'slack', 'trello', 'youtube'];

// Detect if a string is a Lucide icon name (not URL, not emoji)
// Emoji → Lucide name migration map for existing configs
var EMOJI_TO_LUCIDE={
'🔍':'search','🕐':'clock','🌐':'globe','🖥️':'monitor','📖':'book-open',
'📝':'edit-3','📦':'package','🏠':'home','🎬':'film','🛡️':'shield',
'📊':'bar-chart-3','🐳':'container','🔐':'lock','🐙':'github','🦊':'gitlab',
'📚':'book','🐍':'code-2','💬':'message-circle','▶️':'play','🎮':'gamepad-2',
'🐦':'x','🌍':'globe','⚛️':'atom','📘':'book','⚔️':'sword','🔗':'link',
'⚙️':'settings','🌟':'star','🔥':'flame','💡':'lightbulb','🚀':'rocket',
'⚡':'zap','🎯':'target','🧩':'puzzle','🎨':'palette','📡':'satellite',
'🔧':'wrench','🗄️':'server','💾':'save','🖨️':'printer','📷':'camera',
'🎥':'video','🎵':'music','🎙️':'mic','📻':'radio','📺':'tv','💻':'laptop',
'⌨️':'keyboard','🖱️':'mouse','📱':'smartphone','💽':'disc','💿':'disc',
'📀':'disc','🔌':'plug','🔋':'battery','💎':'diamond','🧊':'snowflake',
'⛅':'cloud-sun','☀️':'sun','🌙':'moon','⭐':'star','✨':'sparkles',
'💫':'star','🎆':'sparkles','🌈':'rainbow','☁️':'cloud','🌊':'waves',
'🔥':'flame','🍃':'wind','🌱':'sprout','🌿':'sprout','☘️':'sprout',
'🍀':'sprout','🏆':'trophy','🥇':'award','🥈':'award','🥉':'award',
'🏅':'award','🎖️':'award','🏁':'flag','🚩':'flag','🎌':'flag',
'📌':'pin','📍':'map-pin','🎪':'tent','🎭':'theater','🎬':'film',
'🎤':'mic','🎧':'headphones','🎼':'music','🎹':'piano','🥁':'drum',
'🎷':'saxophone','🎸':'guitar','🎺':'trumpet','🎻':'violin','🎲':'dice',
'♟️':'chess','🎳':'bowling','🎮':'gamepad-2','🕹️':'joystick','🎰':'slot',
'🧩':'puzzle','♠️':'spade','♥️':'heart','♦️':'diamond','♣️':'club',
'✕':'x','🔄':'refresh-cw','🐍':'code-2'};
function migrateConfigEmojis(cfg){
  if(cfg.branding&&cfg.branding.icon&&EMOJI_TO_LUCIDE[cfg.branding.icon])cfg.branding.icon=EMOJI_TO_LUCIDE[cfg.branding.icon];if(cfg.branding&&cfg.branding.icon==='twitter')cfg.branding.icon='x';
  if(cfg.cards)cfg.cards.forEach(function(card){
    if(card.icon&&EMOJI_TO_LUCIDE[card.icon])card.icon=EMOJI_TO_LUCIDE[card.icon];if(card.icon==='twitter')card.icon='x';
    if(card.sections)card.sections.forEach(function(sec){
      if(sec.links)sec.links.forEach(function(link){
        if(link.icon&&EMOJI_TO_LUCIDE[link.icon])link.icon=EMOJI_TO_LUCIDE[link.icon];if(link.icon==='twitter')link.icon='x';
      });
    });
  });
  return cfg;
}

/* ═══════════════════════════════════════════
   SECTION 5: UTILITIES
   Helper functions for the entire app.
   ═══════════════════════════════════════════ */
function isLucideName(s){if(!s||typeof s!=='string')return false;if(s.startsWith('http')||s.startsWith('data:')||s.startsWith('/'))return false;if(typeof lucide!=='undefined'&&lucide.icons){var p=s.split('-').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join('');return p in lucide.icons;}return LUCIDE_ICONS.includes(s);}
// Render a Lucide icon element (data-lucide attribute for auto-replacement by lucide.createIcons())
function renderLucideEl(name,cls){var i=document.createElement('i');i.className=cls;i.setAttribute('data-lucide',name);return i;}

let config = {}, clockInterval = null, weatherIntervals = [], apiPollTimers = [], statsTimer = null;
let dragState = null, iconPickerCallback = null;
let uploadedFiles = [], _eqPending = false;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid(){return Math.random().toString(36).substring(2,9)+Date.now().toString(36);}
function cloneObj(o){return JSON.parse(JSON.stringify(o));}
function toast(msg,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),3000);}

/* ═══════════════════════════════════════════
   SECTION 6: CONFIG LOAD / SAVE
   NOTE: Config is currently stored in localStorage (browser-side).
   The server also has /api/config endpoints for potential server-side syncing.
   ═══════════════════════════════════════════ */
// Load config from localStorage, merging over DEFAULT_CONFIG
function toastWithUndo(msg,undoFn){const el=document.createElement('div');el.className='toast';el.style.cssText='display:flex;align-items:center;gap:10px;';const t=document.createElement('span');t.textContent=msg;const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent='Undo';b.style.fontWeight='700';b.addEventListener('click',()=>{undoFn();el.remove();toast('Restored');});el.appendChild(t);el.appendChild(b);$('#toast-container').appendChild(el);setTimeout(()=>{if(el.parentNode)el.remove();},6000);}

// Load config from server — called once on page init
async function loadConfig() {
  try {
    var parsed = await storage.getConfig();
    if (parsed && Object.keys(parsed).length > 0) {
      if (!parsed.version || parsed.version < '0.2.0') { migrateConfigEmojis(parsed); parsed.version = WARTAB_VERSION; }
      // Migrate old 'small'/'medium'/'large' string fontSize to numeric px
      if (typeof parsed.theme?.fontSizeText === 'string') parsed.theme.fontSizeText = ({small:13,medium:14,large:16})[parsed.theme.fontSizeText] || 14;
      if (typeof parsed.theme?.fontSizeHeading === 'string') parsed.theme.fontSizeHeading = ({small:14,medium:16,large:18})[parsed.theme.fontSizeHeading] || 16;
      config = deepMerge(cloneObj(DEFAULT_CONFIG), parsed);
    } else {
      config = cloneObj(DEFAULT_CONFIG);
    }
  } catch (e) {
    console.error('loadConfig failed:', e);
    config = cloneObj(DEFAULT_CONFIG);
  }
}
// Save config to server — fire-and-forget POST
function saveConfig() {
  var cfg = cloneObj(config);
  try {
    storage.saveConfig(cfg).catch(function(){});
  } catch(e) {
    fetch('/api/config', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(cfg), keepalive: true }).catch(function(){});
  }
}
// Deep-merge stored config over defaults (arrays replaced, objects recursed)
function deepMerge(t,s){const r=cloneObj(t);for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))r[k]=deepMerge(r[k]||{},s[k]);else r[k]=s[k];}return r;}

/* ── Theme & Branding ── */
function applyTheme(){
  const t=config.theme,bg=$('#bg-canvas');
  switch(t.bgType){
    case'gradient':bg.style.background=`linear-gradient(135deg,${t.bgValue})`;break;
    case'solid':bg.style.background=t.bgValue.split(',')[0].trim();break;
    case'image':bg.style.background=`url(${t.bgValue.trim()}) center/cover no-repeat fixed`;break;
    default:bg.style.background=`linear-gradient(135deg,${DEFAULT_CONFIG.theme.bgValue})`;
  }
  const root=document.documentElement;
  root.style.setProperty('--bg-blur',t.blur+'px');
  root.style.setProperty('--accent',t.glow);
  root.style.setProperty('--accent-glow',hexToRgba(t.glow,0.3));
  root.style.setProperty('--accent-glass',hexToRgba(t.glow,0.12));

  // Font size — compute full scale as CSS variables from numeric px values
  const tSize = parseInt(t.fontSizeText) || 14;
  const hSize = parseInt(t.fontSizeHeading) || 16;
  root.style.fontSize = tSize + 'px';
  root.style.setProperty('--text-size', tSize + 'px');
  root.style.setProperty('--text-3xs', Math.max(8, tSize - 5) + 'px');
  root.style.setProperty('--text-2xs', Math.max(9, tSize - 4) + 'px');
  root.style.setProperty('--text-xs',  Math.max(10, tSize - 3) + 'px');
  root.style.setProperty('--text-sm',  Math.max(11, tSize - 2) + 'px');
  root.style.setProperty('--text-base', tSize + 'px');
  root.style.setProperty('--text-lg',  (tSize + 2) + 'px');
  root.style.setProperty('--text-xl',  (tSize + 8) + 'px');
  root.style.setProperty('--text-2xl', (tSize + 18) + 'px');
  root.style.setProperty('--text-3xl', (tSize + 26) + 'px');
  root.style.setProperty('--heading-size', hSize + 'px');
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}','Segoe UI',system-ui,-apple-system,sans-serif`);
  loadGoogleFont(fn,true);

  // Card background — black for dark, white for light, with accent tint
  const h=t.glow.replace('#','');
  const r=parseInt(h[0]+h[1],16),gr=parseInt(h[2]+h[3],16),b=parseInt(h[4]+h[5],16);
  const mode=t.cardBg||'dark';
  const op = t.cardOpacity !== undefined ? t.cardOpacity : 1;
  const base = mode === 'light' ? [255,255,255] : [0,0,0];
  const tint = mode === 'light' ? 0.18 : 0.06;
  // Dark: black + accent blend. Light: white + visible accent blend.
  root.style.setProperty('--card-bg',`rgba(${Math.round(base[0]*(1-tint)+r*tint)},${Math.round(base[1]*(1-tint)+gr*tint)},${Math.round(base[2]*(1-tint)+b*tint)},${op})`);
  root.style.setProperty('--card-bg-alt',`rgba(${r},${gr},${b},${mode==='light' ? 0.15 : 0.08})`);
  root.style.setProperty('--card-input-bg', mode === 'light'
    ? `rgba(0,0,0,${0.06 * op})`
    : `rgba(255,255,255,${0.15 * op})`);
  document.documentElement.dataset.cardBg=mode;

  // Font color from config
  const fc=t.fontColor||'#cccccc';
  root.style.setProperty('--text-primary',hexToRgba(fc,0.92));
  root.style.setProperty('--text-secondary',hexToRgba(fc,0.60));
  root.style.setProperty('--text-tertiary',hexToRgba(fc,0.35));

  // Branding
  const brand=$('#brand-text');
  if(brand){const b2=config.branding||DEFAULT_CONFIG.branding;var bi=b2.icon||'sword';brand.innerHTML=(isLucideName(bi)?'<span class="brand-icon"><i data-lucide="'+bi+'"></i></span>':'<span class="brand-icon emoji-icon">'+bi+'</span>')+'<span>'+escAttr(b2.title||'WarTab')+'</span>';}
  document.title=(config.branding||DEFAULT_CONFIG.branding).title||'WarTab';
  // Toggles
  document.documentElement.dataset.animations=config.theme.animations!==false?'on':'off';
  document.documentElement.dataset.accentBar=config.theme.showAccentBar!==false?'on':'off';
  // Re-render Lucide SVGs (brand icon may have changed)
  if(typeof lucide!=='undefined')setTimeout(function(){var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};lucide.createIcons();console.warn=_lw;},0);
}
function hexToRgba(h,a){const c=h.replace('#','');return`rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}
function loadGoogleFont(fn,allowReplace){
  if(fn==='Inter')return; // Inter loaded from local inter.css
  var id='wartab-font-'+fn.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  if(document.getElementById(id))return;
  if(!allowReplace){
    var l=document.createElement('link');l.id=id;l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
  }else{
    var oe=document.getElementById('wartab-font');
    if(oe&&oe.dataset.font===fn)return;
    if(oe)oe.remove();
    var l=document.createElement('link');l.id='wartab-font';l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
  }
}
function escAttr(s){if(typeof s!=='string')return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ── Status Bar ── */
function initStatusBar(){renderStatusBar();clearInterval(statsTimer);const sb=config.statusBar;if(!sb||!sb.enabled)return;const ms=(sb.refreshInterval||15)*1000;statsTimer=setInterval(fetchStats,ms);fetchStats();}
function renderStatusBar(){const bar=$('#top-stats'),sb=config.statusBar;if(!sb||!sb.enabled){bar.classList.add('hidden');bar.innerHTML='';return;}bar.classList.remove('hidden');bar.innerHTML='<span class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value" id="stat-loading">Connecting...</span></span>';}
function fetchStats(){const sb=config.statusBar;if(!sb||!sb.enabled)return;storage.getStats(sb.source,sb.glancesUrl).then(function(d){renderStats(d,sb);}).catch(function(){const el=$('#stat-loading');if(el)el.textContent='Stats offline';});}
function renderStats(data,sb){const bar=$('#top-stats');bar.innerHTML='';const items=sb.items||[];const parts=[];if(items.includes('hostname')&&data.hostname)parts.push(stItem('🖥️','',data.hostname,null));if(items.includes('cpu')){let p=typeof data.cpu==='number'?data.cpu:(data.cpu&&data.cpu.total)?data.cpu.total:0;parts.push(stItem('⚡','CPU',p+'%',p));}if(items.includes('memory')){const m=data.memory||{};parts.push(stItem('🧠','RAM',(m.percent||0)+'%',m.percent||0));}if(items.includes('disk')){const d=data.disks||[],r=d.find(d=>d.mount==='/')||d[0];if(r)parts.push(stItem('💾',r.mount,r.percent+'%',r.percent));}if(items.includes('uptime')){const u=data.uptime||{};parts.push(stItem('⏱️','Up',u.string||'--'));}parts.forEach((el,i)=>{if(i>0){const s=document.createElement('span');s.className='stat-sep';s.textContent='·';bar.appendChild(s);}bar.appendChild(el);});if(!parts.length)bar.innerHTML='<span class="stat-item"><span class="stat-value">No stats</span></span>';}
// Build a status bar stat element (icon + label + optional progress bar + value)
function stItem(icon,label,value,pct){const div=document.createElement('span');div.className='stat-item';div.innerHTML=`<span class="stat-icon">${icon}</span>`;if(label){const l=document.createElement('span');l.className='stat-label';l.textContent=label;div.appendChild(l);}if(pct!==null&&pct!==undefined){const b=document.createElement('span');b.className='stat-bar';const f=document.createElement('span');f.className='stat-bar-fill'+(pct>80?' high':pct>60?' mid':'');f.style.width=pct+'%';b.appendChild(f);div.appendChild(b);}const v=document.createElement('span');v.className='stat-value';v.textContent=value;div.appendChild(v);return div;}

/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
// Full page re-render: destroys and rebuilds grid from config
function renderAll(){apiPollTimers.forEach(clearTimeout);apiPollTimers=[];const grid=$('#card-grid');grid.innerHTML='';grid.style.setProperty('--grid-cols',config.layout.cols);grid.style.gap=config.layout.gap+'px';var appEl=$('#app');if(appEl){
  // Page width: full=100%+20px pad, 3/4=75%, 1/2=50% (auto-margins center narrower widths)
  const pctMap={full:'100%','three-quarters':'75%',half:'50%'};
  appEl.style.maxWidth=pctMap[config.layout.pageWidth]||'100%';
  const xPad=config.layout.pageWidth==='full'?20:0;
  appEl.style.paddingLeft=xPad+'px';appEl.style.paddingRight=xPad+'px';
  // Y padding: Full → 20px, Compact → 120px
  const yPad=config.layout.paddingHeight==='compact'?120:20;
  appEl.style.paddingTop=yPad+'px';appEl.style.paddingBottom=yPad+'px';
}const _scrollY=window.scrollY;
if(!config.cards.length){
  grid.innerHTML=`<div class="card" style="grid-column:1/-1;padding:0;"><div class="card-body" style="display:flex;flex-direction:column;align-items:center;padding:40px 24px;text-align:center;">
    <div style="font-size:var(--text-3xl);margin-bottom:12px;opacity:0.5;"><i data-lucide="layout" style="width:36px;height:36px;"></i></div>
    <div style="font-size:var(--heading-size);font-weight:600;margin-bottom:4px;color:var(--text-primary);">This page is empty</div>
    <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:20px;">Add your first card to get started</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-glass" id="empty-add-card"><i data-lucide="plus" style="width:14px;height:14px;"></i> Add Card</button>
      <button class="btn btn-glass" id="empty-add-clock"><i data-lucide="clock" style="width:14px;height:14px;"></i> Add Clock</button>
      <button class="btn btn-glass" id="empty-add-links"><i data-lucide="link" style="width:14px;height:14px;"></i> Add Links</button>
      <button class="btn btn-glass" id="empty-config"><i data-lucide="settings" style="width:14px;height:14px;"></i> Settings</button>
    </div>
  </div></div>`;
  setTimeout(()=>{
    const a=document.getElementById('empty-add-card');if(a)a.addEventListener('click',addNewCard);
    const b=document.getElementById('empty-add-clock');if(b)b.addEventListener('click',()=>{addNewCard();const c=config.cards[config.cards.length-1];if(c){c.title='Clock';c.icon='🕐';c.color='#aaaaaa';c.width=1;c.sections=[{id:'sec-'+uid(),type:'clock',format24h:false,showDate:true}];saveConfig();renderAll();}});
    const c=document.getElementById('empty-add-links');if(c)c.addEventListener('click',()=>{addNewCard();const c2=config.cards[config.cards.length-1];if(c2){c2.title='Links';c2.icon='🔗';c2.color='#999999';c2.width=2;c2.sections=[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}];saveConfig();renderAll();}});
    const d=document.getElementById('empty-config');if(d)d.addEventListener('click',toggleConfigPanel);
  },0);
  if(_scrollY)window.scrollTo(0,_scrollY);
if(typeof lucide!=='undefined'){
  var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
  lucide.createIcons();
  console.warn=_lw;
}

  return;
}
// Ungrouped cards render as normal
config.cards.forEach((c,i)=>{grid.appendChild(renderCard(c,i));});
setupWeatherWidgets();setupClocks();scheduleEqualize();const fs=grid.querySelector('.inline-search-wrap input');if(fs)fs.focus();if(_scrollY)requestAnimationFrame(()=>window.scrollTo(0,_scrollY));
if(typeof lucide!=='undefined'){
  var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
  lucide.createIcons();
  console.warn=_lw;
}
}
function scheduleEqualize(){if(!_eqPending){_eqPending=true;requestAnimationFrame(()=>{_eqPending=false;equalizeCardHeights();});}}
function equalizeCardHeights(){const grid=$('#card-grid');const allCards=[...grid.children].filter(el=>el.classList.contains('card'));if(!allCards.length)return;allCards.forEach(c=>c.style.minHeight='');// Skip cards with height>1 (double-height cards control their own size)
const cards=allCards.filter(c=>{const idx=parseInt(c.dataset.index);const card=config.cards[idx];return !card||!card.height||card.height<=1;});if(!cards.length)return;const rows=[];let curRow=[],curTop=-1;cards.forEach(card=>{const r=card.getBoundingClientRect();if(curTop<0||Math.abs(r.top-curTop)>8){if(curRow.length)rows.push(curRow);curRow=[card];curTop=r.top;}else curRow.push(card);});if(curRow.length)rows.push(curRow);rows.forEach(row=>{if(row.length<2)return;const m=Math.max(...row.map(c=>c.offsetHeight));row.forEach(c=>c.style.minHeight=m+'px');});}

function renderCard(card,idx){
  if(card._isGap){
    const div=document.createElement('div');div.className='card grid-gap-card';div.dataset.cardId=card.id;
    div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=idx;
    div.style.gridColumn='span '+div.dataset.width;
    if(card.height>1)div.style.gridRow='span '+card.height;
    // Subtle boundary so the gap space is visible
    div.style.cssText+=';background:none!important;box-shadow:none!important;outline:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;min-width:0;display:block;position:relative;border:1px dashed rgba(255,255,255,0.12)!important;';
    if(card.minHeight){var sp=document.createElement('div');sp.style.cssText='min-height:'+card.minHeight+'px;pointer-events:none;';div.appendChild(sp);}
    div.style.setProperty('--card-accent','transparent');
    div.style.setProperty('--card-bg','transparent');
    // Header at same position as regular cards (top-right)
    const h=document.createElement('div');
    h.style.cssText='position:absolute;top:8px;right:8px;display:flex;align-items:center;gap:4px;opacity:0;transition:opacity 0.15s;z-index:2;';
    div.addEventListener('mouseenter',()=>h.style.opacity='1');
    div.addEventListener('mouseleave',()=>h.style.opacity='0');
    // Shadow behind controls on hover
    const shadow=document.createElement('div');
    shadow.style.cssText='position:absolute;top:4px;right:4px;width:50px;height:30px;border-radius:4px;background:rgba(0,0,0,0.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity 0.15s;z-index:1;pointer-events:none;';
    div.addEventListener('mouseenter',()=>shadow.style.opacity='1');
    div.addEventListener('mouseleave',()=>shadow.style.opacity='0');
    div.appendChild(shadow);
    const eb2=document.createElement('button');eb2.className='card-edit-btn';eb2.textContent='✎';eb2.title='Edit gap';
    eb2.addEventListener('click',e=>{e.stopPropagation();openCardEditPanel(card.id);});
    h.appendChild(eb2);
    const dh=document.createElement('span');dh.className='drag-handle';dh.textContent='⠿';dh.title='Drag';dh.style.touchAction='none';
    h.appendChild(dh);
    div.appendChild(h);
    dh.addEventListener('pointerdown',e=>startDrag(e,card.id,idx));
    div.addEventListener('dblclick',()=>{config.cards.splice(idx,1);saveConfig();renderAll();toast('Gap removed');});
    return div;
  }
  /* ── Regular card ── */
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.cardId = card.id;
  div.dataset.width = Math.min(card.width || 1, config.layout.cols);
  div.dataset.index = idx;
  div.style.setProperty('--card-accent', card.color || config.theme.glow);
  if (card.height > 1) {
    div.style.gridRow = 'span ' + Math.min(card.height, 4);
    div.style.minHeight = (100 + card.height * 80) + 'px';
  }
  if (card.transparent) div.classList.add('card-transparent');

  /* Header: title (icon + text) on the left, actions (edit + drag handle) on the right */
  const hdr = document.createElement('div');
  hdr.className = 'card-header';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.appendChild(renderIconElement(card.icon, 'card-icon'));
  title.appendChild(document.createTextNode(' ' + (card.title || '')));
  hdr.appendChild(title);

  const actionGroup = document.createElement('div');
  actionGroup.style.cssText = 'display:flex;align-items:center;gap:4px;';

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
  if (!icon) return renderLucideEl('package', cls);
  if (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/')) {
    const img = document.createElement('img');
    img.className = cls; img.src = icon; img.alt = '';
    img.loading = 'lazy';
    img.onerror = function() {
      var fallback = renderLucideEl('package', cls);
      this.parentNode.replaceChild(fallback, this);
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
  window.open(url, '_blank');
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

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▶';
    titleRow.appendChild(arrow);

    titleRow.addEventListener('click', (e) => {
      e.stopPropagation();
      section.collapsed = !section.collapsed;
      titleRow.classList.toggle('open');
      var c = titleRow.nextElementSibling;
      while (c && !c.classList.contains('section-content') && !c.classList.contains('dropdown-content')) c = c.nextElementSibling;
      if (c) {
        if (!section.collapsed) {
          c.style.display = '';
          requestAnimationFrame(function(){ requestAnimationFrame(function(){ c.classList.add('open'); }); });
        } else {
          c.classList.remove('open');
          clearTimeout(c._closeTimer);
          c._closeTimer = setTimeout(function(){ if (c.classList.contains('open') === false) c.style.display = 'none'; }, 300);
        }
      }
      saveConfig();
    });

    fragment.appendChild(titleRow);
  }

  /* ── Content area ── */
  const contentWrap = document.createElement('div');
  contentWrap.className = 'dropdown-content' + (section.collapsed ? '' : ' open');

  const module = CARD_MODULES[section.type];
  if (module && module.render) {
    module.render(section, card, contentWrap);
  } else {
    contentWrap.textContent = 'Unknown type: ' + section.type;
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
  /* Default: Lucide 'link' icon */
  if (!icon) {
    var el = document.createElement('i');
    el.className = 'link-icon'; el.setAttribute('data-lucide', 'link');
    return el;
  }
  /* Image URL */
  if (icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/')) {
    const img = document.createElement('img');
    img.className = 'link-custom-icon'; img.src = icon; img.alt = '';
    img.loading = 'lazy';
    img.onerror = function() {
      var fallback = document.createElement('i');
      fallback.className = 'link-icon'; fallback.setAttribute('data-lucide', 'link');
      this.parentNode.replaceChild(fallback, this);
    };
    return img;
  }
  /* Lucide icon name */
  if (isLucideName(icon)) {
    var el = document.createElement('i');
    el.className = 'link-icon'; el.setAttribute('data-lucide', icon);
    return el;
  }
  /* Emoji fallback */
  const span = document.createElement('span');
  span.className = 'link-icon emoji-icon';
  span.textContent = icon;
  return span;
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

function setupClocks(){if(clockInterval)clearInterval(clockInterval);updateClocks();clockInterval=setInterval(updateClocks,1000);}
function updateClocks(){$$('.clock-widget').forEach(el=>{const n=new Date(),f24=el.dataset.format24==='1',sd=el.dataset.showDate==='1';let h=n.getHours();const m=String(n.getMinutes()).padStart(2,'0');el.querySelector('.clock-time').textContent=f24?String(h).padStart(2,'0')+':'+m:(h%12||12)+':'+m+' '+(h>=12?'PM':'AM');if(sd)el.querySelector('.clock-date').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});if(el.dataset.showCalendar==='1'){const cal=el.querySelector('.calendar-widget');if(cal)renderCalendar(cal,n);}});}
function renderCalendar(el,date){const y=date.getFullYear(),m=date.getMonth();const fd=new Date(y,m,1).getDay();const ld=new Date(y,m+1,0).getDate();const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];let h=`<div class="calendar-month">${mn[m]} ${y}</div><div class="calendar-grid">`;['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{h+=`<div class="calendar-day-header">${d}</div>`;});for(let i=0;i<fd;i++)h+='<div class="calendar-day other-month"></div>';const today=new Date();for(let d=1;d<=ld;d++){const is=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();h+=`<div class="calendar-day${is?' today':''}">${d}</div>`;}h+='</div>';el.innerHTML=h;}
function setupWeatherWidgets(){weatherIntervals.forEach(clearInterval);weatherIntervals=[];$$('.weather-widget').forEach(fetchWeather);}
function fetchWeather(el){const k=el.dataset.apiKey,z=el.dataset.zip,c=el.dataset.country||'US';if(!k||!z){el.querySelector('.weather-detail').textContent='Set API key & zip code in config';return;}const ts=Date.now();fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(z)},${encodeURIComponent(c)}&units=${el.dataset.units}&appid=${k}`).then(r=>r.json()).then(d=>{if(d.cod!==200)throw Error(d.message);var iconEl=el.querySelector('.weather-icon');if(iconEl){var lname=wIcon(d.weather[0].id);iconEl.setAttribute('data-lucide',lname);}el.querySelector('.weather-temp').textContent=Math.round(d.main.temp)+'°';el.querySelector('.weather-detail').textContent=d.weather[0].description+' · '+d.main.humidity+'% humidity';var windEl=el.querySelector('.weather-wind-val');if(windEl){var ws=d.wind?d.wind.speed:0;windEl.textContent=ws+' '+(el.dataset.units==='imperial'?'mph':'m/s');}var tsEl=el.querySelector('.weather-ts');if(tsEl){tsEl.textContent='updated just now';tsEl.dataset.ts=String(ts);}el.dataset.lastOk=String(ts);
if(typeof lucide!=='undefined'){
  var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
  lucide.createIcons();
  console.warn=_lw;
}
}).catch(e=>{el.querySelector('.weather-detail').textContent='⚠ '+e.message;var tsEl=el.querySelector('.weather-ts');if(tsEl){var lo=el.dataset.lastOk;tsEl.textContent=lo?'last ok: '+timeAgo(parseInt(lo)):'';tsEl.dataset.ts=lo||String(ts);}});weatherIntervals.push(setInterval(()=>fetchWeather(el),600000));}
function wIcon(id){if(id<300)return'cloud-lightning';if(id<400)return'cloud-drizzle';if(id<600)return'cloud-rain';if(id<700)return'cloud-snow';if(id<800)return'cloud-fog';if(id===800)return'sun';return'cloud';}
function fetchApiWidget(el){const u=el.dataset.url,jp=el.dataset.jsonPath;if(!u){el.innerHTML='<div class="api-row"><span class="api-label">No API URL set</span></div>';return;}const ts=Date.now();fetch(u).then(r=>r.json()).then(d=>{const v=jp?getNested(d,jp):JSON.stringify(d,null,2);el.innerHTML='<div class="api-row"><span class="api-label">'+escAttr(el.dataset.label)+'</span><span class="api-value">'+escAttr(String(v))+'</span></div><div class="api-ts" data-ts="'+ts+'">updated just now</div>';el.dataset.lastOk=String(ts);const iv=parseInt(el.dataset.refresh)*1000;if(iv>0)apiPollTimers.push(setTimeout(()=>fetchApiWidget(el),iv));}).catch(e=>{const lo=el.dataset.lastOk;el.innerHTML='<div class="api-row"><span class="api-label">'+escAttr(el.dataset.label)+'</span><span class="api-value api-error">'+escAttr(e.message)+'</span></div><div class="api-ts" data-ts="'+(lo||ts)+'">'+(lo?'last ok: '+timeAgo(parseInt(lo)):'')+'</div>';const iv=parseInt(el.dataset.refresh)*1000;if(iv>0)apiPollTimers.push(setTimeout(()=>fetchApiWidget(el),iv));});}
function timeAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function getNested(o,p){return p.split('.').reduce((a,pt)=>a&&a[pt],o);}



var LOCAL_QUOTES=[
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
  var txt = el.querySelector('.quotes-content'),
      auth = el.querySelector('.quotes-author-name');
  if (!txt || !auth) return;
  var pool = sec.quotes || [];
  if (!pool.length) {
    txt.textContent = 'Add quotes in settings';
    auth.textContent = '';
    return;
  }
  if (typeof sec._qi !== 'number') sec._qi = -1;
  sec._qi = (sec._qi + 1) % pool.length;
  var pick = pool[sec._qi];
  txt.textContent = pick.q;
  auth.textContent = '— ' + pick.a;
}


// Fetch and render system stats for the status-bar card module
function fetchStatusWidget(el){
  var content=el.querySelector('.sw-content'),ts=el.querySelector('.sw-ts');
  if(!content)return;
  var src=el.dataset.source,items;
  try{items=JSON.parse(el.dataset.items||'[]');}catch(e){items=['cpu','memory','disk','uptime'];}
  function render(d){
    content.innerHTML='';var parts=[];
    if(items.includes('hostname')&&d.hostname)parts.push(stItem('🖥️','',d.hostname,null));
    if(items.includes('cpu')){var p=typeof d.cpu==='number'?d.cpu:(d.cpu&&d.cpu.total)?d.cpu.total:0;parts.push(stItem('⚡','CPU',p+'%',p));}
    if(items.includes('memory')){var m=d.memory||{};parts.push(stItem('🧠','RAM',(m.percent||0)+'%',m.percent||0));}
    if(items.includes('disk')){var disks=d.disks||[],r=disks.find(function(d2){return d2.mount==='/'})||disks[0];if(r)parts.push(stItem('💾',r.mount,r.percent+'%',r.percent));}
    if(items.includes('uptime')){var u=d.uptime||{};parts.push(stItem('⏱️','Up',u.string||'--'));}
    parts.forEach(function(el2,i){if(i>0){var sep=document.createElement('span');sep.className='stat-sep';sep.textContent='·';content.appendChild(sep);}content.appendChild(el2);});
    if(!parts.length)content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">No stats</div>';
    if(ts){ts.textContent='updated';ts.dataset.ts=String(Date.now());}
  }
  var url;
  if(src==='local')url='/api/stats';
  else if(src==='glances')url=el.dataset.glancesUrl+'/api/4';
  else if(src==='custom'&&el.dataset.customUrl)url=el.dataset.customUrl;
  else{content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Configure source</div>';return;}
  content.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-tertiary);">Loading...</div>';
  fetch(url).then(function(r){if(!r.ok)throw Error(r.status);return r.json();}).then(function(d){render(d);}).catch(function(){content.innerHTML='<div style="font-size:var(--text-sm);color:#cc6666;">Stats offline</div>';});
}

/* ═══════════════════════════════════════════ DRAG & DROP ═══════════════════════════════════════════
   Pointer-based drag with floating ghost, grid-simulated live preview, and FLIP
   animation on ALL shifted cards at drop. Touch+mouse via Pointer Events API. */

// Simulate CSS Grid auto-placement (left-to-right, top-to-bottom, multi-row aware)
// Returns [{row,col}] for each card in same order as input array
function simGrid(cards, cols) {
  const occ = []; // occ[row][col] = true
  const out = [];
  for (const card of cards) {
    const w = Math.min(card.width || 1, cols);
    const h = card.height || 1;
    let placed = false;
    for (let row = 0; !placed && row < 100; row++) {
      if (!occ[row]) occ[row] = [];
      for (let col = 0; col <= cols - w && !placed; col++) {
        let free = true;
        for (let dr = 0; dr < h && free; dr++)
          for (let dc = 0; dc < w && free; dc++)
            if (occ[row + dr] && occ[row + dr][col + dc]) free = false;
        if (free) {
          for (let dr = 0; dr < h; dr++) {
            if (!occ[row + dr]) occ[row + dr] = [];
            for (let dc = 0; dc < w; dc++) occ[row + dr][col + dc] = true;
          }
          out.push({ row, col }); placed = true;
        }
      }
    }
    if (!placed) out.push({ row: 0, col: 0 });
  }
  return out;
}

/* ══════════ Link drag-reorder (within editor) ══════════ */
let _linkDrag = null;

function startLinkDrag(e, row, sec, srcIdx) {
  if (e.button !== 0) return;
  e.preventDefault();

  row.classList.add('me-link-dragging');
  const label = (sec.links[srcIdx] || {}).label || 'Link';

  const ghost = document.createElement('div');
  ghost.className = 'me-link-ghost';
  ghost.textContent = '⠿ ' + label;
  ghost.style.display = 'none';
  document.body.appendChild(ghost);

  _linkDrag = { srcRow: row, srcIdx, sec, ghost, active: false, _startX: e.clientX, _startY: e.clientY };

  document.addEventListener('pointermove', onLinkDragMove);
  document.addEventListener('pointerup', onLinkDragEnd);
  document.addEventListener('pointercancel', onLinkDragEnd);
}

function linkDropClear() {
  document.querySelectorAll('.me-link-tr.drop-above, .me-link-tr.drop-below').forEach(el => {
    el.classList.remove('drop-above', 'drop-below');
  });
}

function onLinkDragMove(e) {
  if (!_linkDrag) return;
  if (!_linkDrag.active) {
    const dx = e.clientX - _linkDrag._startX, dy = e.clientY - _linkDrag._startY;
    if (dx * dx + dy * dy < 64) return;
    _linkDrag.active = true;
    if (_linkDrag.ghost) _linkDrag.ghost.style.display = '';
  }
  if (!_linkDrag.active || !_linkDrag.ghost) return;

  // Move ghost to cursor
  _linkDrag.ghost.style.cssText = `
    position:fixed; pointer-events:none; z-index:9999;
    left:${e.clientX + 10}px; top:${e.clientY - 16}px;
    display:flex; align-items:center; gap:6px;
    padding:8px 14px;
    background:var(--accent-glass);
    border:2px dashed var(--accent);
    backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    font-size:var(--text-sm); font-weight:600;
    color:var(--accent); white-space:nowrap;
  `;

  // Remove previous indicators
  linkDropClear();

  // Find which row the cursor is over
  const rows = _linkDrag.srcRow.parentElement.querySelectorAll('.me-link-tr');
  let targetRow = null;
  let insertBefore = false;  // true = above, false = below

  for (const r of rows) {
    if (r === _linkDrag.srcRow) continue;
    const rect = r.getBoundingClientRect();
    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
      targetRow = r;
      // Insert above if cursor is in upper half
      const midY = rect.top + rect.height / 2;
      insertBefore = e.clientY < midY;
      break;
    }
  }

  // If cursor is below the last row, target the last row as "below"
  if (!targetRow && rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const rect = lastRow.getBoundingClientRect();
    if (e.clientY > rect.bottom) {
      targetRow = lastRow;
      insertBefore = false;
    } else if (e.clientY < rows[0].getBoundingClientRect().top) {
      targetRow = rows[0];
      insertBefore = true;
    }
  }

  if (targetRow) {
    targetRow.classList.add(insertBefore ? 'drop-above' : 'drop-below');
    _linkDrag._targetRow = targetRow;
    _linkDrag._insertBefore = insertBefore;
  } else {
    _linkDrag._targetRow = null;
  }
}

function onLinkDragEnd(e) {
  document.removeEventListener('pointermove', onLinkDragMove);
  document.removeEventListener('pointerup', onLinkDragEnd);
  document.removeEventListener('pointercancel', onLinkDragEnd);

  if (!_linkDrag) return;
  const { srcRow, srcIdx, sec, ghost, active, _targetRow, _insertBefore } = _linkDrag;

  // Clean up
  if (ghost && ghost.parentNode) ghost.remove();
  if (srcRow) srcRow.classList.remove('me-link-dragging');
  linkDropClear();

  if (active && _targetRow) {
    const rows = [...srcRow.parentElement.querySelectorAll('.me-link-tr')];
    const tgtIdxStr = _targetRow.dataset.linkIdx;
    const tgtIdx = tgtIdxStr !== undefined ? parseInt(tgtIdxStr, 10) : -1;

    if (tgtIdx >= 0 && tgtIdx !== srcIdx) {
      const links = sec.links || [];
      const [moved] = links.splice(srcIdx, 1);
      // Adjust target index after removal
      let insertAt = tgtIdx;
      if (tgtIdx > srcIdx) insertAt = tgtIdx - 1;
      if (!_insertBefore) insertAt = insertAt + 1;
      insertAt = Math.min(insertAt, links.length);
      links.splice(insertAt, 0, moved);
      saveAndRefresh();
    }
  }

  _linkDrag = null;
}

function startDrag(e, id, idx){
  if(e.button!==0)return;
  e.preventDefault();
  const card=config.cards.find(x=>x.id===id);
  if(!card)return;
  const grid=$('#card-grid');
  const srcEl=grid.querySelector(`[data-card-id="${id}"]`);
  if(!srcEl)return;
  srcEl.classList.add('dragging');

  const ghost=document.createElement('div');ghost.className='drag-ghost';
  ghost.style.display='none';
  const cw=Math.min(card.width||1,config.layout.cols);
  const ch=card.height||1;
  ghost.innerHTML='<div class="dgh-label">'+((card._isGap?'␣ empty':(card.icon||'')+' '+(card.title||'')).trim()||'Card')+'</div>';
  document.body.appendChild(ghost);

  // Record cursor offset from card's left edge at grab time
  const srcRect=srcEl.getBoundingClientRect();
  dragState={cardId:id,srcEl,ghost,active:false,_startX:e.clientX,_startY:e.clientY,_beforeCardId:null,
    _cardWidth:cw,_cardHeight:ch,_grabOffs:e.clientX-srcRect.left};
  document.addEventListener('pointermove',onDragMove);
  document.addEventListener('pointerup',onDragEnd);
  document.addEventListener('pointercancel',onDragEnd);
  document.body.style.overflow = 'hidden';
}

function pushClear(){
  $$('.card.push-preview').forEach(el=>{el.classList.remove('push-preview');el.style.transform='';});
}

// Group cards by DOM y-position to find rows. Pass excludeEl=null to include all.
function buildRowMap(grid, excludeEl) {
  const items=[...grid.children].filter(el=>el.classList.contains('card')&&el!==excludeEl);
  const rows=[];
  for(const el of items){
    const r=el.getBoundingClientRect();let found=false;
    for(const row of rows){if(Math.abs(row.top-r.top)<10){row.cards.push(el);row.right=Math.max(row.right,r.right);row.bottom=Math.max(row.bottom,r.bottom);found=true;break;}}
    if(!found)rows.push({top:r.top,bottom:r.bottom,cards:[el],right:r.right});
  }
  return rows;
}

function onDragMove(e){
  if(!dragState)return;
  if(!dragState.active){
    const dx=e.clientX-dragState._startX,dy=e.clientY-dragState._startY;
    if(dx*dx+dy*dy<64)return;
    dragState.active=true;
    if(dragState.ghost)dragState.ghost.style.display='';
    // On activation, also refine grab offset from the actual card position
    if(dragState.srcEl){
      const sr=dragState.srcEl.getBoundingClientRect();
      dragState._grabOffs=e.clientX-sr.left;
    }
  }
  if(!dragState.active)return;

  const grid=$('#card-grid'),ghost=dragState.ghost,dSrc=dragState.srcEl;
  if(!ghost||!grid)return;
  const gr=grid.getBoundingClientRect(),cols=config.layout.cols,gap=(config.layout.gap||16);
  const colW=(gr.width-(cols-1)*gap)/cols,step=colW+gap;
  const cw=dragState._cardWidth,ch=dragState._cardHeight;
  const grabOffs=dragState._grabOffs||colW*0.33;

  // Snap to column: preserve grab offset so cursor points to the same relative spot on the card
  // Use step (colW+gap) because column left-edges are step apart in the actual grid
  const relX=e.clientX-gr.left;
  let targetCol=Math.round((relX-grabOffs)/step);
  targetCol=Math.max(0,Math.min(cols-cw,targetCol));

  // Build row map (exclude dragged card for cursor/insertion detection)
  const rows=buildRowMap(grid,dSrc);
  let targetRow=null,rowIdx=0;
  for(let i=0;i<rows.length;i++){const row=rows[i];if(e.clientY>=row.top&&e.clientY<=row.bottom){targetRow=row;rowIdx=i;break;}}
  if(!targetRow&&rows.length){
    let best=0,bestD=Infinity;
    for(let i=0;i<rows.length;i++){const d=Math.abs(e.clientY-rows[i].top);if(d<bestD){bestD=d;best=i;}}
    targetRow=rows[best];rowIdx=best;
  }

  const ghostLeft=gr.left+targetCol*(colW+gap);
  const ghostW=cw*colW+(cw-1)*gap;
  const ghostTop=targetRow?targetRow.top:(e.clientY-30);
  const ghostH=targetRow?(targetRow.bottom-targetRow.top):60;

  // Find insertion point: first card whose LEFT EDGE is at or past the ghost's left edge
  let beforeCard=null;
  if(targetRow){
    for(const el of targetRow.cards){
      const r=el.getBoundingClientRect();
      if(r.left>=ghostLeft-5){beforeCard=el;break;}
    }
    // Past all cards in row — use next DOM sibling (next row's first card, or null → append)
    if(!beforeCard&&targetRow.cards.length){
      const ns=targetRow.cards[targetRow.cards.length-1].nextElementSibling;
      beforeCard=(ns&&ns.classList.contains('card'))?ns:null;
    }
  }
  dragState._beforeCardId=beforeCard?beforeCard.dataset.cardId:null;

  // Position ghost
  ghost.style.cssText=`
    position:fixed;pointer-events:none;z-index:999;
    left:${ghostLeft}px;top:${ghostTop}px;
    width:${ghostW-4}px;min-height:${ghostH-4}px;
    display:flex;align-items:center;justify-content:center;
    background:var(--accent-glass);border:2px dashed var(--accent);
    backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
  `;

  // ── Exact-final-positions preview ──
  // Compute simGrid for old and new card order, then apply transforms
  // so every card renders exactly where it will be on drop.
  pushClear();
  const allCards=config.cards;
  const srcIdx2=allCards.findIndex(c=>c.id===dragState.cardId);
  if(srcIdx2>=0){
    const newOrder=[...allCards];
    const [moved]=newOrder.splice(srcIdx2,1);
    const beforeIdx=beforeCard?newOrder.findIndex(c=>c.id===beforeCard.dataset.cardId):newOrder.length;
    newOrder.splice(beforeIdx,0,moved);

    const oldSim=simGrid(allCards,cols);
    const newSim=simGrid(newOrder,cols);

    // Row height estimate for Y positioning
    const allRows=buildRowMap(grid,null);
    const avgRowH=allRows.length
      ? allRows.reduce((s,r)=>s+(r.bottom-r.top),0)/allRows.length
      : colW*0.6;
    const rowStep=avgRowH+gap;

    for(let i=0;i<allCards.length;i++){
      const c=allCards[i];
      if(c.id===dragState.cardId)continue;
      const oldP=oldSim[i];
      const newIdx2=newOrder.findIndex(nc=>nc.id===c.id);
      if(newIdx2<0)continue;
      const newP=newSim[newIdx2];

      const dx=(newP.col-oldP.col)*step;
      const dy=(newP.row-oldP.row)*rowStep;

      if(dx||dy){
        const el=grid.querySelector(`[data-card-id="${c.id}"]`);
        if(el){
          el.classList.add('push-preview');
          el.style.transform=`translate(${dx}px,${dy}px)`;
        }
      }
    }
  }
  // Drop-shift: highlight the card that will be displaced (beforeCard) + cards right of it
  dropZoneHighlight(beforeCard,targetRow,ghostLeft);
}

function dropZoneClear(){$$('.card.drop-shift').forEach(el=>el.classList.remove('drop-shift'));}

function dropZoneHighlight(beforeCard,targetRow,ghostLeft){
  dropZoneClear();
  if(!targetRow||!beforeCard)return;
  // Highlight all cards from beforeCard to the end of its row
  let found=false;
  for(const el of targetRow.cards){
    if(el===beforeCard)found=true;
    if(found)el.classList.add('drop-shift');
  }
  if(!found){
    // beforeCard is in a different row (next row) — just highlight that card
    beforeCard.classList.add('drop-shift');
  }
}

function onDragEnd(e){
  document.removeEventListener('pointermove',onDragMove);
  document.removeEventListener('pointerup',onDragEnd);
  document.removeEventListener('pointercancel',onDragEnd);
  dropZoneClear();
  pushClear();
  if(!dragState)return;
  const{cardId,srcEl,ghost,active,_beforeCardId}=dragState;
  if(ghost&&ghost.parentNode)ghost.remove();
  if(srcEl)srcEl.classList.remove('dragging');
  document.body.style.overflow = '';

  if(active){
    const grid=$('#card-grid');
    const cards=config.cards;
    const srcIdx=cards.findIndex(c=>c.id===cardId);
    if(srcIdx<0){renderAll();dragState=null;return;}
    let tgtIdx=-1;

    if(_beforeCardId){
      tgtIdx=cards.findIndex(c=>c.id===_beforeCardId);
    }else{
      // Append to end
      tgtIdx=cards.length;
    }

    if(tgtIdx>=0&&srcIdx!==tgtIdx){
      // FLIP ALL shifted cards — snapshot before DOM move
      const allCards=[...grid.children].filter(el=>el.classList.contains('card'));
      const snaps=allCards.map(el=>({el,first:el.getBoundingClientRect()}));

      if(_beforeCardId){
        const bdom=grid.querySelector(`[data-card-id="${_beforeCardId}"]`);
        if(bdom)grid.insertBefore(srcEl,bdom);
        else grid.appendChild(srcEl);
      }else{
        grid.appendChild(srcEl);
      }

      // Capture last positions (forces reflow)
      const flips=snaps.map(({el,first})=>{
        const last=el.getBoundingClientRect();
        return{el,dx:first.left-last.left,dy:first.top-last.top};
      });
      const moved=flips.filter(f=>f.dx||f.dy);

      if(moved.length){
        for(const{el,dx,dy}of moved){
          el.style.transition='none';
          el.style.transform=`translate(${dx}px,${dy}px)`;
        }
        requestAnimationFrame(()=>{
          for(const{el,dx,dy}of moved){
            if(dx||dy){
              el.style.transition='transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
              el.style.transform='translate(0,0)';
            }
          }
          setTimeout(()=>{
            for(const{el}of moved){
              el.style.transition='';el.style.transform='';
            }
          },450);
        });
      }

      const[m]=cards.splice(srcIdx,1);
      const insertAt=tgtIdx>(srcIdx)?tgtIdx-1:tgtIdx;
      cards.splice(insertAt,0,m);
      saveConfig();
      [...grid.children].filter(el=>el.classList.contains('card')).forEach((el,i)=>{el.dataset.index=i;});
      toast('Card moved');
      dragState=null;
      return;
    }
  }

  if(srcEl)srcEl.classList.remove('dragging');
  if(active)renderAll();
  dragState=null;
}

function addGap(){
  config.cards.push({id:'gap-'+uid(),title:'',icon:'',color:'transparent',width:1,height:1,_isGap:true});
  saveConfig();renderAll();toast('Gap added');
}
function removeGap(idx){
  config.cards.splice(idx,1);
  saveConfig();renderAll();
}

/* ═══════════════════════════════════════════ ICON PICKER ═══════════════════════════════════════════ */
let iconPickerOpen=false;
function openIconPicker(cb){iconPickerCallback=cb;iconPickerOpen=true;$('#icon-picker-overlay').classList.add('open');$('#icon-picker').classList.add('open');buildIconPicker('icons');}
function closeIconPicker(){iconPickerOpen=false;iconPickerCallback=null;$('#icon-picker-overlay').classList.remove('open');$('#icon-picker').classList.remove('open');}
function buildIconPicker(t){const c=$('#icon-picker-content');c.innerHTML='';$$('.ip-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));if(t==='library')buildLibraryTab(c);else if(t==='upload')buildUploadTab(c);else if(t==='icons')buildIconsTab(c);else if(t==='url')buildUrlTab(c);}
function buildLibraryTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search services...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);function ri(f){g.innerHTML='';const fl=(f||'').toLowerCase();const items=fl?ICON_REPO.filter(i=>i.name.toLowerCase().includes(fl)||i.file.toLowerCase().includes(fl)||i.tags.some(t=>t.includes(fl))):ICON_REPO;items.slice(0,120).forEach(item=>{const d=document.createElement('div');d.className='icon-grid-item';const img=document.createElement('img');img.src=`${ICON_CDN}/${item.file}.svg`;img.alt=item.name;img.loading='lazy';img.onerror=function(){this.parentElement.style.display='none';};const l=document.createElement('span');l.textContent=item.name;d.appendChild(img);d.appendChild(l);d.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${item.file}.svg`));g.appendChild(d);});if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';}s.addEventListener('input',()=>ri(s.value));ri('');}
function buildUploadTab(c){const z=document.createElement('div');z.className='upload-zone';z.innerHTML='<div style="font-size:var(--text-3xl);">📁</div><p>Click to upload an icon image</p>';c.appendChild(z);const fi=document.createElement('input');fi.type='file';fi.accept='image/png,image/svg+xml,image/webp,image/jpeg,image/gif';fi.style.display='none';fi.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{selectIcon(ev.target.result);};reader.readAsDataURL(file);});z.addEventListener('click',()=>fi.click());c.appendChild(fi);}
function buildIconsTab(c){
  const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search icons or emoji...';c.appendChild(s);
  const etab=document.createElement('div');etab.style.cssText='display:flex;gap:4px;margin-bottom:8px;';
  const btnSvg=document.createElement('button');btnSvg.className='btn btn-glass btn-sm';btnSvg.textContent='SVG Icons';btnSvg.style.cssText='flex:1;';
  const btnEmoji=document.createElement('button');btnEmoji.className='btn btn-glass btn-sm';btnEmoji.textContent='Emoji';btnEmoji.style.cssText='flex:1;';
  etab.appendChild(btnSvg);etab.appendChild(btnEmoji);c.appendChild(etab);
  const g=document.createElement('div');g.className='icon-grid';g.style.gridTemplateColumns='repeat(auto-fill,minmax(52px,1fr))';c.appendChild(g);
  var _mode='svg';
  // Get all available Lucide icon names from the loaded library (dynamic, always complete)
  function getAllLucideIcons(){
    if(typeof lucide!=='undefined'&&lucide.icons)return Object.keys(lucide.icons).sort();
    return LUCIDE_ICONS; // fallback
  }
  function ri(f){
    g.innerHTML='';const fl=(f||'').toLowerCase();
    if(_mode==='svg'){
      var allIcons=getAllLucideIcons();
      var items=fl?allIcons.filter(function(n){return n.toLowerCase().includes(fl);}):allIcons;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';return;}
      // Batch-render icons in chunks for performance (keeps UI responsive with 600+ icons)
      var batchSize=80;
      var idx=0;
      function renderBatch(){
        var end=Math.min(idx+batchSize,items.length);
        for(;idx<end;idx++){
          var name=items[idx];
          var d=document.createElement('div');d.className='icon-grid-item';d.style.cssText='flex-direction:column;gap:2px;padding:6px 2px;';
          var i=document.createElement('i');i.setAttribute('data-lucide',name);i.style.cssText='width:20px;height:20px;';
          var l=document.createElement('span');l.style.cssText='font-size:var(--text-3xs);text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:52px;white-space:nowrap;';l.textContent=name;
          d.appendChild(i);d.appendChild(l);
          d.addEventListener('click',function(n){return function(){selectIcon(n);};}(name));g.appendChild(d);
        }
        if(idx<items.length)requestAnimationFrame(renderBatch);
        else if(typeof lucide!=='undefined'){
          var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
          lucide.createIcons();
          console.warn=_lw;
        }
      }
      requestAnimationFrame(renderBatch);
    }else{
      var items=fl?EMOJIS.filter(function(e){return e.includes(fl);}):EMOJIS;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No emoji found</div>';return;}
      items.forEach(function(emo){var d=document.createElement('div');d.className='icon-grid-item';d.innerHTML='<span class="ip-emoji">'+emo+'</span>';d.addEventListener('click',function(){selectIcon(emo);});g.appendChild(d);});
    }
  }
  function setMode(m){_mode=m;btnSvg.style.borderColor=m==='svg'?'var(--accent)':'var(--surface-border)';btnEmoji.style.borderColor=m==='emoji'?'var(--accent)':'var(--surface-border)';ri(s.value);if(m==='svg')setTimeout(function(){
if(typeof lucide!=='undefined'){
  var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
  lucide.createIcons();
  console.warn=_lw;
}
},0);}
  btnSvg.addEventListener('click',function(){setMode('svg');});btnEmoji.addEventListener('click',function(){setMode('emoji');});
  s.addEventListener('input',function(){ri(s.value);});setMode('svg');
}
function buildUrlTab(c){c.innerHTML=`<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:6px;">Enter a direct URL:</div><input class="icon-search-bar" id="icon-url-input" placeholder="https://example.com/icon.png"><button class="btn btn-glass btn-sm" id="icon-url-btn">Use</button><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;" id="icon-url-examples"></div>`;const inp=$('#icon-url-input');['jellyfin','plex','homeassistant','portainer','pihole','grafana','sonarr','radarr'].forEach(n=>{const tag=document.createElement('button');tag.className='btn btn-glass btn-sm';tag.style.fontSize='10px';tag.textContent=n;tag.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${n}.png`));$('#icon-url-examples').appendChild(tag);});inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&inp.value.trim())selectIcon(inp.value.trim());});$('#icon-url-btn').addEventListener('click',()=>{if(inp.value.trim())selectIcon(inp.value.trim());});}
function selectIcon(u){if(iconPickerCallback)iconPickerCallback(u);closeIconPicker();}

/* ═══════════════════════════════════════════ BACKGROUND UPLOAD ═══════════════════════════════════════════ */
function openBgUpload() {
  toast('Processing image...');
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.style.display = 'none';
  fi.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      // Compress & resize via canvas
      const blob = await compressImage(file, 1920, 1080, 0.85);
      if (blob.size > 5 * 1024 * 1024) { toast('Image too large after compression', 'error'); return; }

      // Upload to server
      var blobFile = new File([blob], file.name, { type: file.type });
      const result = await storage.uploadFile(blobFile, file.name);
      if (result.error) { toast('Upload failed: ' + result.error, 'error'); return; }

      config.theme.bgType = 'image';
      config.theme.bgValue = result.url;
      applyChanges(); saveConfig();
      uploadedFiles.unshift(result);
      buildConfigPanel();
      toast('Background set (' + (result.width||'') + 'x' + (result.height||'') + ' @ ' + fmtSize(result.size) + ')');
    } catch(err) {
      toast('Upload error: ' + err.message, 'error');
    }
  });
  fi.click();
}

function compressImage(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      // Resize if needed
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => resolve(b), 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function deleteUpload(url) {
  const name = url.split('/').pop();
  if (!name) return;
  try {
    const result = await storage.deleteFile(url);
    if (result && result.status === 'deleted') {
      uploadedFiles = uploadedFiles.filter(f => f.url !== url);
      toast('Deleted');
      // If this was the current background, reset
      if (config.theme.bgType === 'image' && config.theme.bgValue === url) {
        config.theme.bgType = 'gradient';
        config.theme.bgValue = DEFAULT_CONFIG.theme.bgValue;
        applyChanges(); saveConfig();
      }
      buildConfigPanel();
    } else {
      toast('Delete failed', 'error');
    }
  } catch(err) {
    toast('Delete error: ' + err.message, 'error');
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

async function fetchUploads() {
  try {
    uploadedFiles = await storage.listUploads();
  } catch(e) { /* server might not be available */ }
}

function openBgPicker() {
  const overlay = $('#bg-picker-overlay');
  const picker = $('#bg-picker');
  overlay.classList.add('open'); picker.classList.add('open');
  const content = $('#bg-picker-content'); content.innerHTML = '';

  if (!uploadedFiles.length) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No uploaded backgrounds yet. Upload one from the config panel.</div>';
    $('#bg-picker-close').onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
    overlay.onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
    return;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;';

  uploadedFiles.forEach(f => {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--surface-border);cursor:pointer;transition:all 0.1s;';
    card.innerHTML = `
      <img src="${f.url}" style="width:80px;height:45px;object-fit:cover;flex-shrink:0;" alt="">
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--text-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escAttr(f.name)}</div>
        <div style="font-size:var(--text-2xs);color:var(--text-tertiary);">${fmtSize(f.size)}</div>
      </div>
      <button class="btn btn-glass btn-sm btn-danger" style="flex-shrink:0;" data-action="delete">Delete</button>
    `;
    // Click to set as background
    card.addEventListener('click', e => {
      if (e.target.dataset.action === 'delete') return;
      config.theme.bgType = 'image';
      config.theme.bgValue = f.url;
      applyChanges(); saveConfig();
      overlay.classList.remove('open'); picker.classList.remove('open');
      buildConfigPanel();
      toast('Background set');
    });
    // Delete button
    const delBtn = card.querySelector('[data-action="delete"]');
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteUpload(f.url).then(function(){openBgPicker();}).catch(function(){openBgPicker();});
    });
    grid.appendChild(card);
  });

  content.appendChild(grid);
  $('#bg-picker-close').onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
  overlay.onclick = () => { overlay.classList.remove('open'); picker.classList.remove('open'); };
}

/* ═══════════════════════════════════════════ CONFIG PANEL ═══════════════════════════════════════════ */
let configPanelOpen=false;
function toggleConfigPanel(){configPanelOpen=!configPanelOpen;$('#config-overlay').classList.toggle('open',configPanelOpen);$('#config-panel').classList.toggle('open',configPanelOpen);if(configPanelOpen)buildConfigPanel();}
function buildConfigPanel(){const body=$('#config-body');body.innerHTML='';
  const brand=config.branding||{};
  // Update header title
  const ht=$('#config-header-title');
  if(ht)ht.textContent='⚙️ '+(brand.title||'WarTab')+' Config';

  /* ── Page ── */
  body.appendChild(ps('Page'));
  const br=el('div','display:flex;gap:8px;align-items:flex-start;');
  const tg=el('div','flex:1;');tg.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Page Title'));
  const ti=el('input','width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;');
  ti.type='text';ti.value=brand.title||'WarTab';
  ti.addEventListener('change',()=>{if(!config.branding)config.branding={};config.branding.title=ti.value;applyTheme();saveConfig();buildConfigPanel();});
  tg.appendChild(ti);br.appendChild(tg);

  const ig=el('div','flex-shrink:0;');ig.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Icon'));
  const ir2=el('div','display:flex;gap:4px;align-items:center;');
  const ip=el('span','font-size:var(--text-xl);width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);');
  const bi=brand.icon||'sword';
  if(bi.startsWith('http')||bi.startsWith('data:')||bi.startsWith('/')){const img=document.createElement('img');img.src=bi;img.style.cssText='width:22px;height:22px;object-fit:contain;';ip.appendChild(img);}else if(isLucideName(bi)){var li=document.createElement('i');li.setAttribute('data-lucide',bi);li.style.cssText='width:22px;height:22px;';ip.appendChild(li);setTimeout(function(){
if(typeof lucide!=='undefined'){
  var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
  lucide.createIcons();
  console.warn=_lw;
}
},0);}else{ip.textContent=bi;ip.className+=' emoji-icon';}
  ir2.appendChild(ip);
  const ib=el('button','','Change');ib.className='btn btn-glass btn-sm';
  ib.addEventListener('click',()=>openIconPicker(url=>{if(!config.branding)config.branding={};config.branding.icon=url;applyTheme();saveConfig();buildConfigPanel();}));
  ir2.appendChild(ib);ig.appendChild(ir2);br.appendChild(ig);body.appendChild(br);

  /* ── Background ── */
  body.appendChild(ps('Background'));
  const bgType=config.theme.bgType;
  body.appendChild(pf('select','','Type',[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'},{value:'image',label:'Image'}],bgType,v=>{config.theme.bgType=v;applyChanges();renderAll();buildConfigPanel();}));

  // Value field — color picker for solid, dual pickers for gradient, text for image
  if(bgType==='gradient'){
    const parts=config.theme.bgValue.split(',').map(s=>s.trim());
    const c1=parts[0]||'#0a0a0a';
    const c2=parts[1]||'#1a1a1a';
    const gr=el('div','margin-bottom:10px;');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Gradient Colors'));
    const row=el('div','display:flex;gap:8px;align-items:center;');
    const p1=document.createElement('input');p1.type='color';p1.value=c1;p1.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p1.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p1);
    const p2=document.createElement('input');p2.type='color';p2.value=c2;p2.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p2.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p2);
    gr.appendChild(row);body.appendChild(gr);
  } else if(bgType==='solid'){
    const gr=el('div','margin-bottom:10px;');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Color'));
    const p=document.createElement('input');p.type='color';p.value=config.theme.bgValue||'#0a0a0a';p.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';
    p.addEventListener('input',()=>{config.theme.bgValue=p.value;applyChanges();});
    gr.appendChild(p);body.appendChild(gr);
  } else if(bgType==='image'){
    bgValueRow(body);
  }

  // Upload + Previous Images buttons
  const bgr=el('div','display:flex;gap:6px;flex-wrap:wrap;');
  const ub=el('button','','Upload Image');ub.className='btn btn-glass btn-sm';ub.addEventListener('click',()=>openBgUpload());bgr.appendChild(ub);
  if(uploadedFiles.length){const sb=el('button','','Previous Images ('+uploadedFiles.length+')');sb.className='btn btn-glass btn-sm';sb.addEventListener('click',()=>openBgPicker());bgr.appendChild(sb);}
  // Set URL button (always visible for image type)
  if(bgType==='image'){
    const setUrlBtn=el('button','','Set URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{buildConfigPanel();});bgr.appendChild(setUrlBtn);
  } else {
    const setUrlBtn=el('button','','Set Image URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{config.theme.bgType='image';applyChanges();saveConfig();buildConfigPanel();});
    bgr.appendChild(setUrlBtn);
  }
  body.appendChild(el('div','margin-bottom:10px;',null,bgr));

  body.appendChild(chk('Random background on load',config.theme.bgRotate,v=>{config.theme.bgRotate=v;saveConfig();}));

  /* ── Appearance ── */
  body.appendChild(ps('Appearance'));
  body.appendChild(pf('select','','Card Style',[{value:'dark',label:'Dark'},{value:'light',label:'Light'}],config.theme.cardBg||'dark',v=>{config.theme.cardBg=v;applyChanges();}));
  body.appendChild(pf('range','','Card Transparency',null,Math.round((1-(config.theme.cardOpacity||1))*100),v=>{config.theme.cardOpacity=1-(parseInt(v)/100);applyChanges();},{min:0,max:100}));
  body.appendChild(pf('color','','Accent Color',null,config.theme.glow,v=>{config.theme.glow=v;applyChanges();}));
  body.appendChild(pf('range','','Glass Blur (px)',null,config.theme.blur,v=>{config.theme.blur=parseInt(v);applyChanges();},{min:4,max:40}));
  body.appendChild(chk('Animated transitions',config.theme.animations!==false,v=>{config.theme.animations=v;applyChanges();renderAll();}));
  body.appendChild(chk('Card accent bar',config.theme.showAccentBar!==false,v=>{config.theme.showAccentBar=v;applyChanges();renderAll();}));

  /* ── Typography ── */
  body.appendChild(ps('Typography'));
  body.appendChild(pf('color','','Font Color',null,config.theme.fontColor||'#cccccc',v=>{config.theme.fontColor=v;applyChanges();document.body.style.setProperty('--text-primary',hexToRgba2(v,0.92));}));
  body.appendChild(pf('range','','Body Text Size (px)',null,config.theme.fontSizeText,v=>{config.theme.fontSizeText=parseInt(v);applyChanges();},{min:10,max:28}));
  body.appendChild(pf('range','','Heading Size (px)',null,config.theme.fontSizeHeading,v=>{config.theme.fontSizeHeading=parseInt(v);applyChanges();},{min:10,max:28}));
  const curFont=config.theme.fontFamily||'Inter';
  const TOP_FONTS = [
    {name:'Inter',sample:'The quick brown fox jumps'},
    {name:'Space Grotesk',sample:'The quick brown fox jumps'},
    {name:'JetBrains Mono',sample:'console.log(42)'},
    {name:'Fraunces',sample:'The quick brown fox jumps'},
    {name:'Plus Jakarta Sans',sample:'The quick brown fox jumps'},
    {name:'DM Sans',sample:'The quick brown fox jumps'},
    {name:'Outfit',sample:'The quick brown fox jumps'},
    {name:'Sora',sample:'The quick brown fox jumps'},
    {name:'Manrope',sample:'The quick brown fox jumps'},
    {name:'Rubik',sample:'The quick brown fox jumps'},
    {name:'Nunito',sample:'The quick brown fox jumps'},
    {name:'Poppins',sample:'The quick brown fox jumps'},
    {name:'Raleway',sample:'The quick brown fox jumps'},
    {name:'Work Sans',sample:'The quick brown fox jumps'},
    {name:'Montserrat',sample:'The quick brown fox jumps'},
    {name:'Fira Sans',sample:'The quick brown fox jumps'},
    {name:'Barlow',sample:'The quick brown fox jumps'},
    {name:'Figtree',sample:'The quick brown fox jumps'},
    {name:'Archivo',sample:'The quick brown fox jumps'},
    {name:'Chivo',sample:'The quick brown fox jumps'},
    {name:'Epilogue',sample:'The quick brown fox jumps'},
    {name:'Josefin Sans',sample:'The quick brown fox jumps'},
    {name:'Karla',sample:'The quick brown fox jumps'},
    {name:'Lexend',sample:'The quick brown fox jumps'},
    {name:'Quicksand',sample:'The quick brown fox jumps'},
    {name:'Urbanist',sample:'The quick brown fox jumps'},
    {name:'Onest',sample:'The quick brown fox jumps'},
    {name:'Be Vietnam Pro',sample:'The quick brown fox jumps'},
    {name:'IBM Plex Sans',sample:'The quick brown fox jumps'},
    {name:'DM Mono',sample:'const x = 1;'},
  ];
  // Ensure current font is in the list
  if(!TOP_FONTS.find(f=>f.name===curFont)) TOP_FONTS.push({name:curFont,sample:'The quick brown fox jumps'});
  const fg=document.createElement('div');fg.style.cssText='margin-bottom:10px;';
  fg.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Font'));
  const fsel=document.createElement('select');
  fsel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';
  fsel.style.fontFamily=`'${curFont}',sans-serif`;
  // Preload all font options so dropdown renders them correctly
  TOP_FONTS.forEach(f=>loadGoogleFont(f.name));
  TOP_FONTS.forEach(f=>{
    const o=document.createElement('option');o.value=f.name;
    o.textContent=f.name;
    o.style.fontFamily=`'${f.name}',sans-serif`;
    o.style.fontSize='15px';
    if(f.name===curFont)o.selected=true;fsel.appendChild(o);
  });
  fsel.addEventListener('change',()=>{
    config.theme.fontFamily=fsel.value;
    fsel.style.fontFamily=`'${fsel.value}',sans-serif`;
    saveConfig();applyTheme();renderAll();
  });
  fg.appendChild(fsel);body.appendChild(fg);

  /* ── Status Bar ── */
  body.appendChild(ps('Status Bar'));
  body.appendChild(chk('Show',config.statusBar.enabled,v=>{config.statusBar.enabled=v;saveConfig();applyTheme();initStatusBar();renderAll();buildConfigPanel();}));
  body.appendChild(pf('select','','Source',[{value:'local',label:'Local (/api/stats)'},{value:'glances',label:'Glances API'},{value:'custom',label:'Custom URL'}],config.statusBar.source,v=>{config.statusBar.source=v;saveConfig();initStatusBar();buildConfigPanel();}));

  // Conditional: Glances URL
  const gl=el('div','','',pf('text','','Glances URL',null,config.statusBar.glancesUrl,v=>{config.statusBar.glancesUrl=v;saveConfig();initStatusBar();}));
  gl.className='cfg-conditional'+(config.statusBar.source==='glances'?'':' hidden');
  body.appendChild(gl);

  // Conditional: Custom URL
  const cu=el('div','','',pf('text','','Custom URL',null,config.statusBar.customUrl||'',v=>{config.statusBar.customUrl=v;saveConfig();initStatusBar();}));
  cu.className='cfg-conditional'+(config.statusBar.source==='custom'?'':' hidden');
  body.appendChild(cu);

  body.appendChild(pf('range','','Refresh (s)',null,config.statusBar.refreshInterval,v=>{config.statusBar.refreshInterval=parseInt(v);saveConfig();initStatusBar();},{min:5,max:120}));
  const itemsRow=document.createElement('div');itemsRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:4px 0;';
  ['hostname','cpu','memory','disk','uptime'].forEach(item=>{
    const cl=document.createElement('label');cl.style.cssText='display:flex;align-items:center;gap:4px;font-size:var(--text-sm);cursor:pointer;';
    const cc=document.createElement('input');cc.type='checkbox';cc.checked=(config.statusBar.items||[]).includes(item);
    cc.addEventListener('change',()=>{config.statusBar.items=config.statusBar.items||[];if(cc.checked&&!config.statusBar.items.includes(item))config.statusBar.items.push(item);else if(!cc.checked)config.statusBar.items=config.statusBar.items.filter(i=>i!==item);saveConfig();initStatusBar();});
    cl.appendChild(cc);cl.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));itemsRow.appendChild(cl);
  });
  const itemsG=el('div','margin-bottom:10px;');itemsG.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Show items:'));
  itemsG.appendChild(itemsRow);body.appendChild(itemsG);

  /* ── Layout ── */
  body.appendChild(ps('Layout'));
  body.appendChild(pf('range','','Columns',null,config.layout.cols,v=>{config.layout.cols=parseInt(v);applyChanges();renderAll();},{min:1,max:6}));
  body.appendChild(pf('range','','Card Gap (px)',null,config.layout.gap,v=>{config.layout.gap=parseInt(v);applyChanges();renderAll();},{min:4,max:40}));
  body.appendChild(pf('select','','Page Width',[
    {value:'full',label:'Full Width'},
    {value:'three-quarters',label:'3/4 Width'},
    {value:'half',label:'1/2 Width'},
  ],config.layout.pageWidth||'full',v=>{config.layout.pageWidth=v;applyChanges();renderAll();}));
  body.appendChild(pf('select','','Page Height',[
    {value:'full',label:'Full (20px padding)'},
    {value:'compact',label:'Compact (120px padding)'},
  ],config.layout.paddingHeight||'full',v=>{config.layout.paddingHeight=v;applyChanges();renderAll();}));

  /* ── Data ── */
  body.appendChild(ps('Data'));
  const acts=el('div','display:flex;gap:8px;flex-wrap:wrap;');
  ['Export','Import','Reset'].forEach(label=>{
    const b=el('button','',label);b.className='btn btn-glass btn-sm'+(label==='Reset'?' btn-danger':'');
    b.addEventListener('click',()=>{
      if(label==='Export'){const d=new Date();const bb=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(bb);a.download='wartab-config-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.json';a.click();URL.revokeObjectURL(a.href);toast('Exported');}
      else if(label==='Import'){$('#import-file-input2').click();}
      else if(label==='Reset'){showConfirmModal('Reset all settings to defaults? This cannot be undone.',()=>{const snap=cloneObj(config);config=cloneObj(DEFAULT_CONFIG);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toastWithUndo('Reset',()=>{config=snap;saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();});});}
    });
    acts.appendChild(b);
  });
  body.appendChild(acts);
  const fi2=document.createElement('input');fi2.type='file';fi2.accept='.json';fi2.style.display='none';fi2.id='import-file-input2';
  fi2.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);showConfirmModal('Import config from '+e.target.files[0].name+'? This will replace your current configuration.',()=>{config=deepMerge(cloneObj(DEFAULT_CONFIG),d);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Imported');});}catch(e){toast('Failed: '+e.message,'error');}};r.readAsText(e.target.files[0]);}});

  /* ── Snapshots ── */
  body.appendChild(ps('Snapshots'));
  const snapHint=el('div','font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:6px;','Auto-saved on every config change. Last 20 kept.');
  body.appendChild(snapHint);
  const snapRow=el('div','display:flex;gap:8px;margin-bottom:8px;');
  const saveSnapBtn=el('button','','Save Snapshot Now');saveSnapBtn.className='btn btn-glass btn-sm';
  saveSnapBtn.addEventListener('click',async()=>{await storage.snapshots.create();renderSnapshots();});
  snapRow.appendChild(saveSnapBtn);
  const snapList=el('div','display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;');
  snapRow.appendChild(snapList);
  body.appendChild(snapRow);
  function renderSnapshots(){
    snapList.innerHTML='<div style="font-size:var(--text-2xs);color:var(--text-tertiary);padding:4px 0;">Loading...</div>';
    storage.snapshots.list().then(snaps=>{
      snapList.innerHTML='';
      if(!snaps||!snaps.length){snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">No snapshots yet</div>';return;}
      snaps.forEach(s=>{
        const r=el('div','display:flex;gap:6px;align-items:center;padding:3px 0;');
        const ts=s.name.replace(/_/g,' ').substring(0,15);
        const lbl=el('span','flex:1;font-size:var(--text-xs);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',ts);
        const sz=el('span','font-size:var(--text-2xs);color:var(--text-tertiary);flex-shrink:0;',fmtSize(s.size));
        const rst=el('button','','Restore');rst.className='btn btn-glass btn-sm';rst.style.cssText='padding:2px 8px;font-size:var(--text-2xs);';
        rst.addEventListener('click',()=>{showConfirmModal('Restore snapshot from '+ts+'? Current config will be replaced.',async()=>{await storage.snapshots.restore(s.name);await loadConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Restored: '+ts);});});
        r.appendChild(lbl);r.appendChild(sz);r.appendChild(rst);
        snapList.appendChild(r);
      });
    }).catch(()=>{snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">Server snapshots unavailable</div>';});
  }
  renderSnapshots();
  body.appendChild(snapList);
  
  /* ── API Keys ── */
  body.appendChild(ps('API Keys'));
  const apibox=el('div','font-size:var(--text-sm);line-height:1.7;padding:0 0 8px;');
  apibox.innerHTML='<div style="margin-bottom:10px;color:var(--text-secondary);">Some modules need a free API key. Get yours here:</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;">'+
    '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:rgba(0,0,0,0.2);"><span style="font-size:16px;">🌤</span><div><div style="font-weight:600;font-size:var(--text-sm);">Weather (OpenWeatherMap)</div><div style="font-size:var(--text-2xs);color:var(--text-tertiary);">Free tier, 60 calls/min. Sign up at <a href="https://openweathermap.org/api" target="_blank" style="color:var(--accent);">openweathermap.org/api</a></div></div></div>'+
    '</div>';
  body.appendChild(apibox);
/* ── Credits ── */
body.appendChild(ps('Credits'));
const cbox=el('div','font-size:var(--text-xs);line-height:1.7;padding:0 0 8px;color:var(--text-secondary);');
cbox.innerHTML='<div style="display:flex;flex-direction:column;gap:6px;">'+
  '<div style="display:flex;gap:8px;align-items:center;"><span style="font-size:14px;">📦</span><span>Service icons by <a href="https://selfh.st/icons/" target="_blank" style="color:var(--accent);">selfh.st/icons</a></span></div>'+
  '<div style="display:flex;gap:8px;align-items:center;"><span style="font-size:14px;">🎯</span><span>UI icons by <a href="https://lucide.dev/" target="_blank" style="color:var(--accent);">Lucide</a> (ISC License)</span></div>'+
  '</div>';
body.appendChild(cbox);
body.appendChild(fi2);
// Wrap each config section in a card
wrapConfigCards(body);
}

/* Wrap config panel sections in card containers */
function wrapConfigCards(body) {
  var sections = [], cur = null;
  Array.from(body.children).forEach(function(el) {
    var h3 = el.querySelector('h3');
    if (h3 && !el.querySelector('input,select,button')) {
      if (cur) sections.push(cur);
      cur = { header: el, fields: [] };
    } else if (cur) {
      cur.fields.push(el);
    }
  });
  if (cur) sections.push(cur);
  sections.forEach(function(s) {
    var wrap = document.createElement('div');
    wrap.className = 'cs-panel cp-config-card';
    s.header.parentNode.insertBefore(wrap, s.header);
    wrap.appendChild(s.header);
    s.fields.forEach(function(f) { wrap.appendChild(f); });
  });
}

function bgValueRow(body){
  // Show text field for image URL
  const g=el('div','margin-bottom:10px;');g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Image URL'));
  const i=document.createElement('input');i.type='text';i.value=config.theme.bgValue;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
  i.placeholder='Paste image URL or upload above...';
  i.addEventListener('change',()=>{config.theme.bgValue=i.value;applyChanges();saveConfig();});
  g.appendChild(i);body.appendChild(g);
}

function el(tag,style,text,children){
  const e=document.createElement(tag);
  if(style)e.style.cssText=style;
  if(text!==undefined&&text!==null)e.textContent=text;
  if(children)e.appendChild(children);
  return e;
}

function chk(label,value,onChange){
  const w=el('div','display:flex;align-items:center;gap:6px;margin-bottom:8px;');
  const c=document.createElement('input');c.type='checkbox';c.checked=!!value;
  c.addEventListener('change',()=>onChange(c.checked));
  w.appendChild(c);w.appendChild(el('span','font-size:var(--text-base);',label));
  return w;
}

function hexToRgba2(h,a){const c=h.replace('#','');return`rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}

function ps(t){return el('div','','',el('h3','font-size:var(--text-sm);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);margin-bottom:10px;margin-top:12px;padding-bottom:4px;border-bottom:1px solid var(--glass-border);font-family:var(--font);',t));}
function addNewCard(){
  const colMax=config.layout.cols;
  config.cards.push({
    id:'card-'+uid(), title:'', icon:'package', color:'#888888',
    width:Math.min(1,colMax),height:1,
    sections:[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}],
  });
  saveConfig(); renderAll(); toast('New card added');
}
function pf(type,key,label,options,value,onChange,attrs){const g=el('div','margin-bottom:10px;');
  if(type==='select'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const s=document.createElement('select');s.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';(options||[]).forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===value)opt.selected=true;s.appendChild(opt);});s.addEventListener('change',()=>onChange(s.value));g.appendChild(s);}
  else if(type==='range'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;align-items:center;gap:8px;');const i=document.createElement('input');i.type='range';i.min=attrs.min||0;i.max=attrs.max||100;i.value=value;i.style.cssText='flex:1;accent-color:var(--accent);';const s=el('span','font-size:var(--text-sm);color:var(--text-secondary);min-width:30px;',String(value));i.addEventListener('input',()=>s.textContent=i.value);i.addEventListener('pointerup',()=>onChange(i.value));r.appendChild(i);r.appendChild(s);g.appendChild(r);}
  else if(type==='color'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;gap:8px;align-items:center;');const i=document.createElement('input');i.type='color';i.value=value;i.style.cssText='width:40px;height:34px;padding:2px;cursor:pointer;flex-shrink:0;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';const t=document.createElement('input');t.type='text';t.value=value;t.style.cssText='flex:1;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';const sync=v=>{i.value=v;t.value=v;onChange(v);};i.addEventListener('input',()=>sync(i.value));t.addEventListener('change',()=>sync(t.value));r.appendChild(i);r.appendChild(t);g.appendChild(r);}
  else{g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const i=document.createElement('input');i.type='text';i.value=value;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';i.addEventListener('change',()=>onChange(i.value));g.appendChild(i);}
  return g;
}
function applyChanges(){saveConfig();applyTheme();}

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
  if(typeof lucide!=='undefined'){
    var _lw=console.warn;console.warn=function(m){if(m&&m.indexOf&&m.indexOf('not found')<0)_lw.apply(console,arguments);};
    lucide.createIcons();
    console.warn=_lw;
  }
}

/** Simple confirmation overlay */
function showConfirmModal(msg, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#151515;border:1px solid var(--glass-border);padding:24px;min-width:280px;text-align:center;';
  const label = document.createElement('div');
  label.textContent = msg;
  label.style.cssText = 'font-size:var(--text-base);color:var(--text-primary);margin-bottom:16px;';
  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.textContent = 'Delete';
  okBtn.style.cssText = 'border-color:#cc4444;color:#cc4444;';
  okBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

/* ══════════ Keyboard Shortcuts Overlay ══════════ */
function showShortcutsOverlay() {
  var existing = document.querySelector('#shortcuts-overlay');
  if (existing) { existing.remove(); return; }
  var overlay = document.createElement('div');
  overlay.id = 'shortcuts-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#151515;border:1px solid var(--glass-border);padding:24px 32px;min-width:300px;max-width:420px;';
  box.innerHTML = '<div style="font-size:var(--heading-size);font-weight:700;color:var(--text-primary);margin-bottom:16px;">Keyboard Shortcuts</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:var(--text-sm);line-height:1.8;">' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">n</kbd><span>Add new card</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">s</kbd><span>Focus search bar</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">?</kbd><span>Toggle this overlay</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Esc</kbd><span>Close panels / overlay</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Ctrl+<span style="text-decoration:underline">N</span></kbd><span>New card</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Ctrl+Shift+<span style="text-decoration:underline">N</span></kbd><span>New page</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Ctrl+Tab</kbd><span>Next page</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Ctrl+K</kbd><span>Focus search</span>' +
    '<kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:3px;font-family:var(--font);font-size:var(--text-xs);">Ctrl+Shift+<span style="text-decoration:underline">C</span></kbd><span>Toggle config panel</span>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px;font-size:var(--text-2xs);color:var(--text-tertiary);">Press Esc to close</div>';
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function switchPage(pageId) {
  if (!config.pages[pageId]) return;
  config.currentPage = pageId;
  config.cards = config.pages[pageId].cards;
  saveConfig();
  const grid = $('#card-grid');
  if (grid) grid.style.opacity = '0';
  setTimeout(function() {
    renderAll();
    renderPageNav();
    if (grid) grid.style.opacity = '';
  }, 60);
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

/* ═══════════════════════════════════════════ INIT ═══════════════════════════════════════════ */
async function init() {
  await loadConfig(); applyTheme();
  pageInit();  // migrate/init pages
  if(!config.cards||!config.cards.length){console.warn('Config had no cards — restored defaults');config=cloneObj(DEFAULT_CONFIG);pageInit();saveConfig();}
  await fetchUploads();
  // Random background on load if rotation enabled
  if(config.theme.bgRotate&&uploadedFiles.length>0){
    const pick=uploadedFiles[Math.floor(Math.random()*uploadedFiles.length)];
    if(pick){config.theme.bgType='image';config.theme.bgValue=pick.url;saveConfig();applyTheme();}
  }
  renderAll(); renderPageNav(); initStatusBar();
  // Footer
  $('#footer-text').textContent='WarTab v'+WARTAB_VERSION+'  [?] shortcuts';
  loadIconRepo();
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#btn-add-card').addEventListener('click',()=>{addNewCard();});
  $('#brand-text').addEventListener('click',()=>{location.reload();});
  $('#btn-add-page').addEventListener('click',()=>{addPage();});
  $('#config-close').addEventListener('click',toggleConfigPanel);
  $('#config-overlay').addEventListener('click',toggleConfigPanel);
  $$('.ip-tab').forEach(t=>t.addEventListener('click',()=>buildIconPicker(t.dataset.tab)));
  $('#icon-picker-close').addEventListener('click',closeIconPicker);
  $('#icon-picker-overlay').addEventListener('click',closeIconPicker);
  $('#edit-panel-close').addEventListener('click',closeCardEditPanel);
  $('#edit-panel-overlay').addEventListener('click',closeCardEditPanel);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&configPanelOpen)toggleConfigPanel();
    if(e.key==='Escape'&&iconPickerOpen)closeIconPicker();
    if(e.key==='Escape'&&_editPanelOpen)closeCardEditPanel();
    if(e.key==='Escape'&&document.querySelector('#shortcuts-overlay'))document.querySelector('#shortcuts-overlay').remove();
    if(e.key==='C'&&e.ctrlKey&&e.shiftKey){e.preventDefault();toggleConfigPanel();}
    if((e.key==='l'||e.key==='k')&&(e.ctrlKey||e.metaKey)){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
    // Keyboard shortcuts: Ctrl+N = new card, Ctrl+Shift+N = new page, Ctrl+Tab = next page
    if(e.key==='n'&&(e.ctrlKey||e.metaKey)&&!e.shiftKey){e.preventDefault();addNewCard();}
    if(e.key==='n'&&(e.ctrlKey||e.metaKey)&&e.shiftKey){e.preventDefault();addPage();}
    if(e.key==='Tab'&&(e.ctrlKey||e.metaKey)){e.preventDefault();const order=config.pageOrder||[];if(!order.length)return;const idx=order.indexOf(config.currentPage);const next=order[(idx+1)%order.length];switchPage(next);}
    // Single-key shortcuts — only when no panels are open
    if(!configPanelOpen&&!_editPanelOpen&&!iconPickerOpen){
      if(e.key==='?'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();showShortcutsOverlay();}
      if(e.key==='n'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();addNewCard();}
      if(e.key==='s'&&!e.ctrlKey&&!e.metaKey&&!e.target.closest('input,textarea,select')){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
    }
  });
  let rt=null;window.addEventListener('resize',()=>{if(rt)clearTimeout(rt);rt=setTimeout(()=>{scheduleEqualize();},150);});
  // Periodic timestamp updater
  setInterval(()=>{
    $$('.api-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
    $$('.weather-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
  },15000);
  console.log('WarTab initialized');
}
document.addEventListener('DOMContentLoaded', init);
