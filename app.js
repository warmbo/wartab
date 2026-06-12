/*
registerModule('status-bar', {
  defaults: { source:'local', glancesUrl:'http://localhost:61209', customUrl:'', refreshInterval:15, items:['hostname','cpu','memory','disk','uptime'] },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='status-bar-widget';w.style.cssText='display:flex;flex-direction:column;gap:6px;';
    w.dataset.source=sec.source||'local';w.dataset.glancesUrl=sec.glancesUrl||'';w.dataset.customUrl=sec.customUrl||'';
    w.dataset.refresh=sec.refreshInterval||15;w.dataset.items=JSON.stringify(sec.items||['cpu','memory','disk','uptime']);
    w.dataset.hostname=sec.hostname!==false?'1':'0';
    const content=document.createElement('div');content.className='sw-content';w.appendChild(content);
    const ts=document.createElement('div');ts.className='sw-ts';ts.style.cssText='font-size:9px;color:var(--text-tertiary);text-align:right;';w.appendChild(ts);
    cw.appendChild(w);
    // Fetch on render
    fetchStatusWidget(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(pf('select','','Source',[{value:'local',label:'Local (/api/stats)'},{value:'glances',label:'Glances API'},{value:'custom',label:'Custom URL'}],sec.source||'local',v=>{sec.source=v;saveConfig();}));
    const gl=el('div','','',pf('text','','Glances URL',null,sec.glancesUrl||'',v=>{sec.glancesUrl=v;saveConfig();}));
    gl.className='cfg-conditional'+(sec.source==='glances'?'':' hidden');
    bd.appendChild(gl);
    const cu=el('div','','',pf('text','','Custom URL',null,sec.customUrl||'',v=>{sec.customUrl=v;saveConfig();}));
    cu.className='cfg-conditional'+(sec.source==='custom'?'':' hidden');
    bd.appendChild(cu);
    bd.appendChild(inlineRange('Refresh (s)',sec.refreshInterval||15,5,120,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
    const itemsRow=document.createElement('div');itemsRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:4px 0;';
    ['hostname','cpu','memory','disk','uptime'].forEach(item=>{
      const cl=document.createElement('label');cl.style.cssText='display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
      const cc=document.createElement('input');cc.type='checkbox';cc.checked=(sec.items||[]).includes(item);
      cc.addEventListener('change',()=>{sec.items=sec.items||[];if(cc.checked&&!sec.items.includes(item))sec.items.push(item);else if(!cc.checked)sec.items=sec.items.filter(i=>i!==item);saveConfig();});
      cl.appendChild(cc);cl.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));itemsRow.appendChild(cl);
    });
    bd.appendChild(itemsRow);
  },
}); ═══════════════════════════════════════════
   WarTab — Application Logic
   ═══════════════════════════════════════════ */

const WARTAB_VERSION = '0.2.0';

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
    const g=document.createElement('div');g.className='link-grid';
    (sec.links||[]).forEach(l=>{
      const a=document.createElement('a');a.className='link-item';a.href=l.url;a.target='_blank';a.rel='noopener';
      a.appendChild(renderLinkIcon(l.icon));
      const s=document.createElement('span');s.className='link-label';s.textContent=l.label;
      a.appendChild(s);g.appendChild(a);
    });cw.appendChild(g);
  },
  editor: (sec,card,bd)=>{
    (sec.links||[]).forEach((link,li2)=>{
      const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;align-items:center;margin-bottom:3px;';
      const li2_i=document.createElement('input');li2_i.placeholder='Label';li2_i.value=link.label;
      li2_i.style.cssText='flex:1;padding:3px 6px;background:rgba(0,0,0,.2);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';
      li2_i.addEventListener('change',()=>{sec.links[li2].label=li2_i.value;saveConfig();renderAll();});
      const ic=document.createElement('button');
      ic.style.cssText='padding:2px 4px;font-size:14px;background:none;border:1px solid var(--surface-border);cursor:pointer;color:var(--text-primary);width:26px;height:22px;display:flex;align-items:center;justify-content:center;';
      if(link.icon&&(link.icon.startsWith('http')||link.icon.startsWith('data:'))){const img=document.createElement('img');img.src=link.icon;img.style.cssText='width:16px;height:16px;object-fit:contain;';ic.appendChild(img);}else if(isLucideName(link.icon)){var li=document.createElement('i');li.setAttribute('data-lucide',link.icon);li.style.cssText='width:16px;height:16px;';ic.appendChild(li);}else{ic.textContent=link.icon||'🔗';}
      ic.title='Change icon';ic.addEventListener('click',()=>openIconPicker(url=>{sec.links[li2].icon=url;saveConfig();renderAll();}));
      const ui=document.createElement('input');ui.placeholder='https://';ui.value=link.url;
      ui.style.cssText='flex:1;padding:3px 6px;background:rgba(0,0,0,.2);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';
      ui.addEventListener('change',()=>{sec.links[li2].url=ui.value;saveConfig();renderAll();});
      const rm=btn('✕',null,true);rm.style.cssText='padding:2px 4px;font-size:10px;';
      rm.addEventListener('click',()=>{sec.links.splice(li2,1);saveConfig();renderAll();});
      row.appendChild(li2_i);row.appendChild(ic);row.appendChild(ui);row.appendChild(rm);
      bd.appendChild(row);
    });
    const al=document.createElement('button');al.className='btn btn-glass btn-sm';al.textContent='+ Link';
    al.style.cssText='font-size:10px;padding:2px 8px;';
    al.addEventListener('click',()=>{sec.links=sec.links||[];sec.links.push({label:'New',url:'https://',icon:'link'});saveConfig();renderAll();});
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
    const w=document.createElement('div');w.style.cssText='position:relative;';
    const wrap=document.createElement('div');wrap.className='inline-search-wrap';wrap.innerHTML='<span class="search-icon"><i data-lucide="search"></i></span>';
    const inp=document.createElement('input');inp.type='text';inp.placeholder=sec.placeholder||'Search...';inp.value='';wrap.appendChild(inp);w.appendChild(wrap);
    const btn=document.createElement('button');btn.className='btn btn-glass btn-search';btn.textContent='Go';btn.addEventListener('click',()=>doSearch(inp.value,sec));
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(inp.value,sec);});
    const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;margin-top:4px;';row.appendChild(w);row.appendChild(btn);bd.appendChild(row);
    const pi=document.createElement('input');pi.placeholder='Placeholder';pi.value=sec.placeholder||'Search...';
    pi.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;margin-top:4px;';
    pi.addEventListener('change',()=>{sec.placeholder=pi.value;saveConfig();renderAll();});bd.appendChild(pi);
    const esel=document.createElement('select');esel.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;margin-top:4px;';
    const curEng=sec.engine||config.search.selected||'Google';
    Object.keys(config.search.engines).forEach(en=>{const o=document.createElement('option');o.value=en;o.textContent=en;if(en===curEng)o.selected=true;esel.appendChild(o);});
    esel.addEventListener('change',()=>{sec.engine=esel.value;saveConfig();renderAll();});
    const elbl=document.createElement('label');elbl.style.cssText='display:block;font-size:10px;font-weight:600;color:var(--text-tertiary);margin-top:6px;margin-bottom:2px;';elbl.textContent='Search Engine';
    bd.appendChild(elbl);bd.appendChild(esel);
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
    bd.appendChild(inlineCheck('24hr',sec.format24h,v=>{sec.format24h=v;saveConfig();renderAll();}));
    bd.appendChild(inlineCheck('Show date',sec.showDate,v=>{sec.showDate=v;saveConfig();renderAll();}));
    bd.appendChild(inlineCheck('Show calendar',sec.showCalendar,v=>{sec.showCalendar=v;saveConfig();renderAll();}));
  },
});
registerModule('weather', {
  defaults: { apiKey:'', location:'', units:'imperial' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='weather-widget';w.dataset.apiKey=sec.apiKey||'';w.dataset.location=sec.location||'';w.dataset.units=sec.units||'imperial';
    const iconRow=document.createElement('div');iconRow.className='weather-main';
    const iconEl=document.createElement('i');iconEl.className='weather-icon';iconEl.setAttribute('data-lucide','cloud');iconRow.appendChild(iconEl);
    const tempEl=document.createElement('div');tempEl.className='weather-temp';tempEl.textContent='--°';iconRow.appendChild(tempEl);
    w.appendChild(iconRow);
    const descEl=document.createElement('div');descEl.className='weather-detail';descEl.textContent='Loading...';w.appendChild(descEl);
    const windEl=document.createElement('div');windEl.className='weather-wind';windEl.style.cssText='font-size:11px;color:var(--text-tertiary);margin-top:2px;display:flex;align-items:center;gap:4px;';
    const windIcon=document.createElement('i');windIcon.setAttribute('data-lucide','wind');windIcon.style.cssText='width:12px;height:12px;';windEl.appendChild(windIcon);
    const windVal=document.createElement('span');windVal.className='weather-wind-val';windVal.textContent='--';windEl.appendChild(windVal);
    w.appendChild(windEl);
    const tsEl=document.createElement('div');tsEl.className='weather-ts';tsEl.textContent='';w.appendChild(tsEl);
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    ['apiKey','location'].forEach(k=>{const i=document.createElement('input');i.placeholder=k;i.value=sec[k]||'';i.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';i.addEventListener('change',()=>{sec[k]=i.value;saveConfig();});bd.appendChild(i);});
    const us=document.createElement('select');us.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';
    [{v:'imperial',l:'F'},{v:'metric',l:'C'},{v:'standard',l:'K'}].forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;if(o.v===sec.units)opt.selected=true;us.appendChild(opt);});
    us.addEventListener('change',()=>{sec.units=us.value;saveConfig();});bd.appendChild(us);
  },
});
registerModule('iframe', {
  defaults: { url:'', height:300 },
  render: (sec,card,cw)=>{
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.height=(sec.height||300)+'px';ifr.allow='fullscreen';ifr.loading='lazy';cw.appendChild(ifr);
  },
  editor: (sec,card,bd)=>{
    const ui=document.createElement('input');ui.placeholder='URL';ui.value=sec.url||'';ui.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';ui.addEventListener('change',()=>{sec.url=ui.value;saveConfig();renderAll();});bd.appendChild(ui);
    bd.appendChild(inlineRange('Height',sec.height||300,100,800,v=>{sec.height=parseInt(v);saveConfig();renderAll();}));
  },
});
registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    const e=document.createElement('div');e.className='notes-text';e.contentEditable=true;e.textContent=sec.content||'';
    e.addEventListener('blur',()=>{const idx=findSection(sec.id);if(idx>=0){config.cards[idx[0]].sections[idx[1]].content=e.textContent;saveConfig();}});
    e.addEventListener('keydown',function(ev){if(ev.key==='Escape')e.blur();});
    cw.appendChild(e);
  },
  editor: (sec,card,bd)=>{
    const hint=document.createElement('div');hint.style.cssText='font-size:11px;color:var(--text-tertiary);font-style:italic;padding:4px 0;';
    hint.textContent='✎ Click the card and type directly to edit notes. Press Esc to finish.';
    bd.appendChild(hint);
  },
});
registerModule('dropdown', {
  defaults: { label:'More', links:[{label:'Example',url:'https://example.com',icon:'link'}] },
  render: (sec,card,cw)=>{
    const b=document.createElement('button');b.className='dropdown-toggle';b.innerHTML=`${escAttr(sec.label||'More')} <span class="arrow">▶</span>`;
    const c=document.createElement('div');c.className='dropdown-content';
    b.addEventListener('click',()=>{b.classList.toggle('open');c.classList.toggle('open');});cw.appendChild(b);
    const ig=document.createElement('div');ig.className='link-grid';(sec.links||[]).forEach(link=>{
      const a=document.createElement('a');a.className='link-item';a.href=link.url;a.target='_blank';a.rel='noopener';
      a.appendChild(renderLinkIcon(link.icon));const s=document.createElement('span');s.className='link-label';s.textContent=link.label;
      a.appendChild(s);ig.appendChild(a);
    });c.appendChild(ig);cw.appendChild(c);
  },
  editor: (sec,card,bd)=>{
    CARD_MODULES['links'].editor(sec,card,bd);
  },
});
registerModule('api-poller', {
  defaults: { url:'', jsonPath:'', label:'API', refreshInterval:60 },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='api-widget';w.dataset.url=sec.url||'';w.dataset.jsonPath=sec.jsonPath||'';w.dataset.label=sec.label||'';w.dataset.refresh=sec.refreshInterval||60;
    w.innerHTML=`<div class="api-row"><span class="api-label">${escAttr(sec.label||'Loading...')}</span><span class="api-value">--</span></div>`;cw.appendChild(w);fetchApiWidget(w);
  },
  editor: (sec,card,bd)=>{
    const ui=document.createElement('input');ui.placeholder='API URL';ui.value=sec.url||'';ui.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';ui.addEventListener('change',()=>{sec.url=ui.value;saveConfig();});bd.appendChild(ui);
    const pi=document.createElement('input');pi.placeholder='JSON path';pi.value=sec.jsonPath||'';pi.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';pi.addEventListener('change',()=>{sec.jsonPath=pi.value;saveConfig();});bd.appendChild(pi);
    bd.appendChild(inlineRange('Refresh (s)',sec.refreshInterval||60,5,600,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});

registerModule('quotes', {
  defaults: { category:'inspirational' },
  render: (sec,card,cw)=>{
    const q=document.createElement('div');q.className='quotes-widget';
    q.style.cssText='display:flex;flex-direction:column;gap:6px;padding:4px 0;min-height:80px;';
    const txt=document.createElement('div');txt.className='quotes-text';
    txt.style.cssText='font-size:15px;line-height:1.5;font-style:italic;color:var(--text-primary);position:relative;padding-left:20px;';
    const qm=document.createElement('span');qm.textContent='"';qm.style.cssText='position:absolute;left:0;top:-4px;font-size:24px;color:var(--accent);opacity:0.5;font-style:normal;';txt.appendChild(qm);
    const cont=document.createElement('span');cont.className='quotes-content';cont.textContent='Click to load';txt.appendChild(cont);
    q.appendChild(txt);
    const auth=document.createElement('div');auth.className='quotes-author';
    auth.style.cssText='font-size:11px;color:var(--text-secondary);text-align:right;padding-right:4px;';
    const aName=document.createElement('span');aName.className='quotes-author-name';aName.textContent='';auth.appendChild(aName);
    q.appendChild(auth);
    // Click to refresh
    q.addEventListener('click',function(){fetchQuote(q);});
    q.dataset.secId=sec.id;
    cw.appendChild(q);
    // Auto-load on first render
    setTimeout(function(){fetchQuote(q);},100);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(inlineCheck('Auto-refresh on click',sec.autoRefresh!==false,function(v){sec.autoRefresh=v;saveConfig();}));
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

const DEFAULT_CONFIG = {
  version: WARTAB_VERSION,
  branding: { title:'WarTab', icon:'sword' },
  theme: {
    bgType:'gradient', bgValue:'#0a0a0a, #1a1a1a, #0d0d0d',
    blur:20, glow:'#888888', fontSize:'medium',
    fontFamily:'Inter', cardBg:'dark',
    fontColor:'#cccccc',
    bgRotate:false,animations:true,showAccentBar:true,
  },
  statusBar: {
    enabled: true, source:'local', glancesUrl:'http://localhost:61209',
    customUrl:'', refreshInterval:15,
    items:['cpu','memory','disk','uptime'],
  },
  layout: { cols:4, gap:16, cardMinWidth:240, paddingX:24, paddingY:24 },
  search: {
    engine:'https://www.google.com/search?q=',
    engines:{ Google:'https://www.google.com/search?q=', DuckDuckGo:'https://duckduckgo.com/?q=', Brave:'https://search.brave.com/search?q=', Bing:'https://www.bing.com/search?q=', YouTube:'https://www.youtube.com/results?search_query=', Reddit:'https://www.reddit.com/search/?q=', Wikipedia:'https://en.wikipedia.org/wiki/Special:Search?search=' },
    selected:'Google', openInNewTab:true,
  },
  cards: [
    { id:'search-card', title:'Quick Search', icon:'search', color:'#999999', width:2, sections:[{ id:'search-main', type:'search', engine:'Google', placeholder:'Search anything...', label:'Web Search' }] },
    { id:'clock-card', title:'Time & Date', icon:'clock', color:'#aaaaaa', width:1, sections:[{ id:'clock-main', type:'clock', format24h:false, showDate:true }] },
    { id:'daily-drivers', title:'Daily Drivers', icon:'globe', color:'#cccccc', width:2, sections:[
      { id:'dev-links', type:'links', label:'Development', links:[ {label:'GitHub',url:'https://github.com',icon:'github'},{label:'GitLab',url:'https://gitlab.com',icon:'gitlab'},{label:'Stack Overflow',url:'https://stackoverflow.com',icon:'message-circle'},{label:'npm',url:'https://www.npmjs.com',icon:'package'},{label:'PyPI',url:'https://pypi.org',icon:'code-2'} ] },
      { id:'media-links', type:'links', label:'Media & Social', links:[ {label:'Reddit',url:'https://reddit.com',icon:'message-circle'},{label:'YouTube',url:'https://youtube.com',icon:'play'},{label:'Twitch',url:'https://twitch.tv',icon:'gamepad-2'},{label:'X',url:'https://x.com',icon:'twitter'} ] },
    ]},
    { id:'selfhosted', title:'Self-Hosted', icon:'monitor', color:'#777777', width:2, sections:[{ id:'sh-services', type:'links', label:'Services', links:[ {label:'Home Assistant',url:'http://homeassistant.local:8123',icon:'home'},{label:'Jellyfin',url:'http://jellyfin.local:8096',icon:'film'},{label:'Pi-hole',url:'http://pi.hole/admin',icon:'shield'},{label:'Grafana',url:'http://grafana.local:3000',icon:'bar-chart-3'},{label:'Portainer',url:'http://portainer.local:9000',icon:'container'},{label:'Vaultwarden',url:'http://vault.local:8080',icon:'lock'} ] }] },
    { id:'dev-docs', title:'Dev Docs', icon:'book-open', color:'#8a8a8a', width:1, sections:[{ id:'docs-links', type:'link-list', label:'References', links:[ {label:'MDN Web Docs',url:'https://developer.mozilla.org',icon:'globe'},{label:'React Docs',url:'https://react.dev',icon:'code-2'},{label:'Python Docs',url:'https://docs.python.org/3/',icon:'book'},{label:'Docker Docs',url:'https://docs.docker.com',icon:'container'},{label:'Arch Wiki',url:'https://wiki.archlinux.org',icon:'book'} ] }] },
    { id:'notes-card', title:'Quick Notes', icon:'edit-3', color:'#bbbbbb', width:1, sections:[{ id:'notes-main', type:'notes', label:'Notes', content:'• WarTab is running!\n• Click ✎ on any card to edit it inline.\n• Drag ⠿ to reorder cards.' }] },
  ],
};


const ICON_CDN = '/icons';
const ICON_REPO = [
  {name:'Home Assistant',file:'homeassistant',tags:['home','automation','smarthome']},{name:'Jellyfin',file:'jellyfin',tags:['media','video','streaming']},{name:'Plex',file:'plex',tags:['media','video','streaming']},{name:'Emby',file:'emby',tags:['media','video','streaming']},{name:'Sonarr',file:'sonarr',tags:['media','tv','downloads']},{name:'Radarr',file:'radarr',tags:['media','movies','downloads']},{name:'Lidarr',file:'lidarr',tags:['media','music','downloads']},{name:'Readarr',file:'readarr',tags:['media','books','downloads']},{name:'Prowlarr',file:'prowlarr',tags:['media','indexer','downloads']},{name:'qBittorrent',file:'qbittorrent',tags:['torrent','downloads']},{name:'Deluge',file:'deluge',tags:['torrent','downloads']},{name:'Transmission',file:'transmission',tags:['torrent','downloads']},{name:'SABnzbd',file:'sabnzbd',tags:['usenet','downloads']},{name:'Pihole',file:'pihole',tags:['dns','adblock','network']},{name:'AdGuard',file:'adguard',tags:['dns','adblock','network']},{name:'Grafana',file:'grafana',tags:['monitoring','metrics','dashboard']},{name:'Prometheus',file:'prometheus',tags:['monitoring','metrics']},{name:'Portainer',file:'portainer',tags:['docker','container','management']},{name:'Docker',file:'docker',tags:['container']},{name:'Traefik',file:'traefik',tags:['proxy','reverse-proxy','network']},{name:'Nginx',file:'nginx',tags:['proxy','web-server']},{name:'Caddy',file:'caddy',tags:['proxy','web-server']},{name:'Nextcloud',file:'nextcloud',tags:['cloud','files','sync']},{name:'OwnCloud',file:'owncloud',tags:['cloud','files','sync']},{name:'Vaultwarden',file:'vaultwarden',tags:['password','security']},{name:'Bitwarden',file:'bitwarden',tags:['password','security']},{name:'Authentik',file:'authentik',tags:['auth','sso','security']},{name:'Authelia',file:'authelia',tags:['auth','sso','security']},{name:'Uptime Kuma',file:'uptimekuma',tags:['monitoring','uptime','status']},{name:'GitHub',file:'github',tags:['git','code','dev']},{name:'GitLab',file:'gitlab',tags:['git','code','dev']},{name:'Gitea',file:'gitea',tags:['git','code','dev']},{name:'Jenkins',file:'jenkins',tags:['ci','cd','build']},{name:'n8n',file:'n8n',tags:['automation','workflow']},{name:'Node-RED',file:'nodered',tags:['automation','workflow','iot']},{name:'Homebridge',file:'homebridge',tags:['smarthome','homekit']},{name:'Proxmox',file:'proxmox',tags:['virtualization','hypervisor']},{name:'TrueNAS',file:'truenas',tags:['nas','storage']},{name:'Unraid',file:'unraid',tags:['nas','storage']},{name:'WireGuard',file:'wireguard',tags:['vpn','network']},{name:'Tailscale',file:'tailscale',tags:['vpn','network']},{name:'Speedtest',file:'speedtest',tags:['network','speed']},{name:'Nginx Proxy Manager',file:'nginxproxymanager',tags:['proxy','management']},{name:'Homer',file:'homer',tags:['dashboard']},{name:'Organizr',file:'organizr',tags:['dashboard']},{name:'Dashy',file:'dashy',tags:['dashboard']},{name:'Heimdall',file:'heimdall',tags:['dashboard']},{name:'Netdata',file:'netdata',tags:['monitoring','metrics','system']},{name:'InfluxDB',file:'influxdb',tags:['database','metrics','time-series']},{name:'PostgreSQL',file:'postgresql',tags:['database']},{name:'MySQL',file:'mysql',tags:['database']},{name:'MongoDB',file:'mongodb',tags:['database']},{name:'Redis',file:'redis',tags:['database','cache']},{name:'Python',file:'python',tags:['language','code']},{name:'Node.js',file:'nodejs',tags:['language','runtime']},{name:'Apache',file:'apache',tags:['web-server']},{name:'Syncthing',file:'syncthing',tags:['sync','files']},{name:'Restic',file:'restic',tags:['backup']},{name:'Borg',file:'borg',tags:['backup']},{name:'Duplicati',file:'duplicati',tags:['backup']},{name:'Calibre',file:'calibre',tags:['books','library']},{name:'Tautulli',file:'tautulli',tags:['media','plex','monitoring']},{name:'Ombi',file:'ombi',tags:['media','requests']},{name:'Overseerr',file:'overseerr',tags:['media','requests']},{name:'Jellyseerr',file:'jellyseerr',tags:['media','requests']},{name:'Jackett',file:'jackett',tags:['media','indexer']},{name:'FlareSolverr',file:'flaresolverr',tags:['proxy','captcha']},{name:'Ngrok',file:'ngrok',tags:['tunnel','proxy']},{name:'Cloudflare',file:'cloudflare',tags:['cdn','dns','security']},{name:'OpenVPN',file:'openvpn',tags:['vpn','network']},{name:'Pfsense',file:'pfsense',tags:['firewall','router']},{name:'OPNsense',file:'opnsense',tags:['firewall','router']},{name:'HAProxy',file:'haproxy',tags:['proxy','load-balancer']},{name:'Kubernetes',file:'kubernetes',tags:['container','orchestration']},{name:'Ansible',file:'ansible',tags:['automation','config-management']},{name:'Terraform',file:'terraform',tags:['infrastructure','iac']},{name:'Discord',file:'discord',tags:['chat','social']},{name:'Slack',file:'slack',tags:['chat','social']},{name:'Mattermost',file:'mattermost',tags:['chat','social']},{name:'Matrix',file:'matrix',tags:['chat','social']},{name:'Reddit',file:'reddit',tags:['social','forum']},{name:'YouTube',file:'youtube',tags:['video','social']},{name:'Twitch',file:'twitch',tags:['streaming','social']},{name:'Wikipedia',file:'wikipedia',tags:['reference','wiki']},{name:'Stack Overflow',file:'stackoverflow',tags:['code','reference']},{name:'Arch Linux',file:'archlinux',tags:['linux','os']},{name:'Ubuntu',file:'ubuntu',tags:['linux','os']},{name:'Debian',file:'debian',tags:['linux','os']},{name:'Alpine',file:'alpine',tags:['linux','os','container']},{name:'Git',file:'git',tags:['version-control']},{name:'VS Code',file:'vscode',tags:['editor','code']},{name:'Firefox',file:'firefox',tags:['browser']},{name:'Chrome',file:'chrome',tags:['browser']},{name:'Unifi',file:'unifi',tags:['network','wifi','ubiquiti']},{name:'OpenWRT',file:'openwrt',tags:['router','network']},{name:'Frigate',file:'frigate',tags:['nvr','camera','vision']},{name:'Scrypted',file:'scrypted',tags:['smarthome','camera']},{name:'ESPHome',file:'esphome',tags:['iot','smarthome']},{name:'MQTT',file:'mqtt',tags:['iot','messaging']},{name:'Zigbee2MQTT',file:'zigbee2mqtt',tags:['iot','smarthome','zigbee']},{name:'Mosquitto',file:'mosquitto',tags:['mqtt','iot']},{name:'OpenMediaVault',file:'openmediavault',tags:['nas','storage']},{name:'Filebrowser',file:'filebrowser',tags:['files','management']},{name:'Navidrome',file:'navidrome',tags:['music','streaming']},{name:'Airsonic',file:'airsonic',tags:['music','streaming']},{name:'Audiobookshelf',file:'audiobookshelf',tags:['audiobooks','podcasts']},{name:'Immich',file:'immich',tags:['photos','gallery']},{name:'Photoprism',file:'photoprism',tags:['photos','gallery']},{name:'Paperless-ngx',file:'paperlessngx',tags:['documents','scanning']},{name:'Changedetection',file:'changedetection',tags:['monitoring','alerts']},{name:'Miniflux',file:'miniflux',tags:['rss','feeds']},{name:'FreshRSS',file:'freshrss',tags:['rss','feeds']},{name:'Memos',file:'memos',tags:['notes','memos']},{name:'Outline',file:'outline',tags:['wiki','knowledge-base']},{name:'Bookstack',file:'bookstack',tags:['wiki','documentation']},{name:'Wiki.js',file:'wikijs',tags:['wiki','documentation']},{name:'HedgeDoc',file:'hedgedoc',tags:['notes','collaboration']},{name:'Cockpit',file:'cockpit',tags:['server','management']},{name:'CasaOS',file:'casaos',tags:['homelab','dashboard']},{name:'Dockge',file:'dockge',tags:['docker','compose','management']},{name:'Dozzle',file:'dozzle',tags:['docker','logs']},{name:'Watchtower',file:'watchtower',tags:['docker','updates']},{name:'Komodo',file:'komodo',tags:['monitoring','docker']},{name:'Diun',file:'diun',tags:['docker','notifications']},
];
const EMOJIS = ['🔍','🕐','🌐','🖥️','📖','📝','🏠','🎬','🛡️','📊','🐳','🔐','🐙','🦊','📚','📦','🐍','💬','▶️','🎮','🐦','🌍','⚛️','📘','⚔️','⚙️','🔄','✕','🔗','🌟','🔥','💡','🚀','⚡','🎯','🧩','🎨','📡','🔧','🗄️','💾','🖨️','📷','🎥','🎵','🎙️','📻','📺','💻','⌨️','🖱️','📱','💽','💿','📀','🔌','🔋','💎','🧊','⛅','☀️','🌙','⭐','✨','💫','🎆','🌈','☁️','🌊','🔥','🍃','🌱','🌿','☘️','🍀','🏆','🥇','🥈','🥉','🏅','🎖️','🏁','🚩','🎌','📌','📍','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎸','🎺','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🎲','🧩','♠️','♥️','♦️','♣️'];
const LUCIDE_ICONS = ['search', 'clock', 'globe', 'monitor', 'book-open', 'edit-3', 'sword', 'home', 'film', 'shield', 'bar-chart-3', 'container', 'lock', 'github', 'gitlab', 'package', 'code-2', 'message-circle', 'play', 'gamepad-2', 'twitter', 'book', 'settings', 'plus', 'x', 'link', 'star', 'zap', 'flag', 'compass', 'map-pin', 'server', 'database', 'external-link', 'mail', 'music', 'image', 'cpu', 'hard-drive', 'activity', 'wifi', 'radio', 'smartphone', 'tablet', 'laptop', 'watch', 'camera', 'video', 'headphones', 'volume-2', 'monitor-speaker', 'tv', 'layers', 'grid', 'list', 'columns', 'layout', 'panel-top', 'panel-bottom', 'panel-left', 'panel-right', 'square', 'circle', 'triangle', 'hexagon', 'diamond', 'box', 'archive', 'folder', 'file', 'file-text', 'clipboard', 'check-square', 'check', 'x-square', 'trash-2', 'refresh-cw', 'rotate-cw', 'rotate-ccw', 'download', 'upload', 'cloud', 'cloud-drizzle', 'cloud-snow', 'cloud-lightning', 'sun', 'moon', 'thermometer', 'wind', 'droplets', 'umbrella', 'user', 'users', 'user-plus', 'user-check', 'user-x', 'bell', 'bell-ring', 'bell-off', 'eye', 'eye-off', 'lock', 'unlock', 'key', 'fingerprint', 'shield-off', 'alert-triangle', 'alert-circle', 'alert-octagon', 'info', 'help-circle', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'meh', 'heart', 'calendar', 'calendar-check', 'calendar-x', 'alarm-clock', 'timer', 'hourglass', 'stopwatch', 'map', 'navigation', 'navigation-2', 'crosshair', 'target', 'locate', 'send', 'inbox', 'mail', 'mail-open', 'at-sign', 'phone', 'message-square', 'message-text', 'chat', 'printer', 'scanner', 'bluetooth', 'battery', 'battery-charging', 'power', 'plug', 'bookmark', 'tag', 'award', 'trending-up', 'trending-down', 'pie-chart', 'sliders', 'filter', 'tool', 'wrench', 'hammer', 'paintbrush', 'palette', 'pen-tool', 'eraser', 'scissors', 'copy', 'paste', 'undo', 'redo', 'bold', 'italic', 'underline', 'type', 'hash', 'percent', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevrons-up', 'chevrons-down', 'chevrons-left', 'chevrons-right', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right', 'arrow-down-left', 'external-link', 'maximize', 'minimize', 'expand', 'shrink', 'fullscreen', 'dock', 'sidebar', 'menu', 'more-horizontal', 'more-vertical', 'chrome', 'codepen', 'figma', 'slack', 'trello', 'youtube'];

// Detect if a string is a Lucide icon name (not URL, not emoji)
// Emoji → Lucide name migration map for existing configs
var EMOJI_TO_LUCIDE={
'🔍':'search','🕐':'clock','🌐':'globe','🖥️':'monitor','📖':'book-open',
'📝':'edit-3','📦':'package','🏠':'home','🎬':'film','🛡️':'shield',
'📊':'bar-chart-3','🐳':'container','🔐':'lock','🐙':'github','🦊':'gitlab',
'📚':'book','🐍':'code-2','💬':'message-circle','▶️':'play','🎮':'gamepad-2',
'🐦':'twitter','🌍':'globe','⚛️':'atom','📘':'book','⚔️':'sword','🔗':'link',
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
  if(cfg.branding&&cfg.branding.icon&&EMOJI_TO_LUCIDE[cfg.branding.icon])cfg.branding.icon=EMOJI_TO_LUCIDE[cfg.branding.icon];
  if(cfg.cards)cfg.cards.forEach(function(card){
    if(card.icon&&EMOJI_TO_LUCIDE[card.icon])card.icon=EMOJI_TO_LUCIDE[card.icon];
    if(card.sections)card.sections.forEach(function(sec){
      if(sec.links)sec.links.forEach(function(link){
        if(link.icon&&EMOJI_TO_LUCIDE[link.icon])link.icon=EMOJI_TO_LUCIDE[link.icon];
      });
    });
  });
  return cfg;
}

function isLucideName(s){if(!s||typeof s!=='string')return false;if(s.startsWith('http')||s.startsWith('data:')||s.startsWith('/'))return false;return LUCIDE_ICONS.includes(s);}
// Render a Lucide icon element (data-lucide attribute for auto-replacement)
function renderLucideEl(name,cls){var i=document.createElement('i');i.className=cls;i.setAttribute('data-lucide',name);return i;}

let config = {}, clockInterval = null, weatherIntervals = [], apiPollTimers = [], statsTimer = null;
let dragState = null, editModeCardId = null, iconPickerCallback = null;
let uploadedFiles = [], _eqPending = false;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid(){return Math.random().toString(36).substring(2,9)+Date.now().toString(36);}
function cloneObj(o){return JSON.parse(JSON.stringify(o));}
function toast(msg,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),3000);}
function toastWithUndo(msg,undoFn){const el=document.createElement('div');el.className='toast';el.style.cssText='display:flex;align-items:center;gap:10px;';const t=document.createElement('span');t.textContent=msg;const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent='Undo';b.style.fontWeight='700';b.addEventListener('click',()=>{undoFn();el.remove();toast('Restored');});el.appendChild(t);el.appendChild(b);$('#toast-container').appendChild(el);setTimeout(()=>{if(el.parentNode)el.remove();},6000);}

/* ── Config ── */
function loadConfig(){try{const s=localStorage.getItem('wartab');if(s){var parsed=JSON.parse(s);if(!parsed.version||parsed.version<'0.2.0'){migrateConfigEmojis(parsed);parsed.version=WARTAB_VERSION;localStorage.setItem('wartab',JSON.stringify(parsed));}config=deepMerge(cloneObj(DEFAULT_CONFIG),parsed);}else config=cloneObj(DEFAULT_CONFIG);}catch(e){config=cloneObj(DEFAULT_CONFIG);}}
function saveConfig(){try{localStorage.setItem('wartab',JSON.stringify(config));}catch(e){}}
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

  // Font size
  root.style.fontSize=({small:'13px',medium:'14px',large:'16px'})[t.fontSize]||'14px';
  root.style.setProperty('--font-size',({small:'13px',medium:'14px',large:'16px'})[t.fontSize]||'14px');
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}','Segoe UI',system-ui,-apple-system,sans-serif`);
  loadGoogleFont(fn,true);

  // Accent-tinted glass — card background uses accent color at varying opacity
  const h=t.glow.replace('#','');
  const r=parseInt(h[0]+h[1],16),gr=parseInt(h[2]+h[3],16),b=parseInt(h[4]+h[5],16);
  const mode=t.cardBg||'dark';
  const opts={dark:{c:0.08,a:0.12,i:0.3},light:{c:0.14,a:0.08,i:0.15},'solid-dark':{c:0.85,a:0.9,i:0.4},'solid-light':{c:0.88,a:0.92,i:0.08},neon:{c:0.03,a:0.06,i:0.15}};
  const o=opts[mode]||opts.dark;
  root.style.setProperty('--card-bg',`rgba(${r},${gr},${b},${o.c})`);
  root.style.setProperty('--card-bg-alt',`rgba(${r},${gr},${b},${o.a})`);
  root.style.setProperty('--card-input-bg',`rgba(${r},${gr},${b},${o.i})`);
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
  if(typeof lucide!=='undefined')setTimeout(function(){lucide.createIcons();},0);
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
function fetchStats(){const sb=config.statusBar;if(!sb||!sb.enabled)return;let url;if(sb.source==='local')url='/api/stats';else if(sb.source==='glances')url=sb.glancesUrl+'/api/4';else if(sb.source==='custom'&&sb.customUrl)url=sb.customUrl;else return;fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(d=>renderStats(d,sb)).catch(()=>{const el=$('#stat-loading');if(el)el.textContent='Stats offline';});}
function renderStats(data,sb){const bar=$('#top-stats');bar.innerHTML='';const items=sb.items||[];const parts=[];if(items.includes('hostname')&&data.hostname)parts.push(stItem('🖥️','',data.hostname,null));if(items.includes('cpu')){let p=typeof data.cpu==='number'?data.cpu:(data.cpu&&data.cpu.total)?data.cpu.total:0;parts.push(stItem('⚡','CPU',p+'%',p));}if(items.includes('memory')){const m=data.memory||{};parts.push(stItem('🧠','RAM',(m.percent||0)+'%',m.percent||0));}if(items.includes('disk')){const d=data.disks||[],r=d.find(d=>d.mount==='/')||d[0];if(r)parts.push(stItem('💾',r.mount,r.percent+'%',r.percent));}if(items.includes('uptime')){const u=data.uptime||{};parts.push(stItem('⏱️','Up',u.string||'--'));}parts.forEach((el,i)=>{if(i>0){const s=document.createElement('span');s.className='stat-sep';s.textContent='·';bar.appendChild(s);}bar.appendChild(el);});if(!parts.length)bar.innerHTML='<span class="stat-item"><span class="stat-value">No stats</span></span>';}
function stItem(icon,label,value,pct){const div=document.createElement('span');div.className='stat-item';div.innerHTML=`<span class="stat-icon">${icon}</span>`;if(label){const l=document.createElement('span');l.className='stat-label';l.textContent=label;div.appendChild(l);}if(pct!==null&&pct!==undefined){const b=document.createElement('span');b.className='stat-bar';const f=document.createElement('span');f.className='stat-bar-fill'+(pct>80?' high':pct>60?' mid':'');f.style.width=pct+'%';b.appendChild(f);div.appendChild(b);}const v=document.createElement('span');v.className='stat-value';v.textContent=value;div.appendChild(v);return div;}

/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
function renderAll(){apiPollTimers.forEach(clearTimeout);apiPollTimers=[];const grid=$('#card-grid');grid.innerHTML='';grid.style.setProperty('--grid-cols',config.layout.cols);grid.style.gap=config.layout.gap+'px';var appEl=$('#app');if(appEl){appEl.style.paddingLeft=config.layout.paddingX+'px';appEl.style.paddingRight=config.layout.paddingX+'px';appEl.style.paddingTop=config.layout.paddingY+'px';appEl.style.paddingBottom='80px';}const _scrollY=window.scrollY;
if(!config.cards.length){
  grid.innerHTML=`<div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;"><i data-lucide="package" style="width:48px;height:48px;"></i></div>
    <div style="font-size:20px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">Your dashboard is empty</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px;">Add your first card to get started</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button class="btn btn-glass" id="empty-add-card">➕ Add Card</button>
      <button class="btn btn-glass" id="empty-add-clock">🕐 Add Clock</button>
      <button class="btn btn-glass" id="empty-add-links">🔗 Add Links</button>
      <button class="btn btn-glass" id="empty-config">⚙️ Settings</button>
    </div></div>`;
  setTimeout(()=>{
    const a=document.getElementById('empty-add-card');if(a)a.addEventListener('click',addNewCard);
    const b=document.getElementById('empty-add-clock');if(b)b.addEventListener('click',()=>{addNewCard();const c=config.cards[config.cards.length-1];if(c){c.title='Clock';c.icon='🕐';c.color='#aaaaaa';c.width=1;c.sections=[{id:'sec-'+uid(),type:'clock',format24h:false,showDate:true}];saveConfig();renderAll();}});
    const c=document.getElementById('empty-add-links');if(c)c.addEventListener('click',()=>{addNewCard();const c2=config.cards[config.cards.length-1];if(c2){c2.title='Links';c2.icon='🔗';c2.color='#999999';c2.width=2;c2.sections=[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}];saveConfig();renderAll();}});
    const d=document.getElementById('empty-config');if(d)d.addEventListener('click',toggleConfigPanel);
  },0);
  if(_scrollY)window.scrollTo(0,_scrollY);if(typeof lucide!=='undefined')lucide.createIcons();
  return;
}
// Ungrouped cards render as normal
config.cards.forEach((c,i)=>{grid.appendChild(c.id===editModeCardId?renderCardEditor(c,i):renderCard(c,i));});
setupWeatherWidgets();setupClocks();scheduleEqualize();const fs=grid.querySelector('.inline-search-wrap input');if(fs&&!document.activeElement?.closest('.card-editing'))fs.focus();if(_scrollY)requestAnimationFrame(()=>window.scrollTo(0,_scrollY));if(typeof lucide!=='undefined')lucide.createIcons();}
function scheduleEqualize(){if(!_eqPending){_eqPending=true;requestAnimationFrame(()=>{_eqPending=false;equalizeCardHeights();});}}
function equalizeCardHeights(){const grid=$('#card-grid');const allCards=[...grid.children].filter(el=>el.classList.contains('card'));if(!allCards.length)return;allCards.forEach(c=>c.style.minHeight='');// Skip cards with height>1 (double-height cards control their own size)
const cards=allCards.filter(c=>{const idx=parseInt(c.dataset.index);const card=config.cards[idx];return !card||!card.height||card.height<=1;});if(!cards.length)return;const rows=[];let curRow=[],curTop=-1;cards.forEach(card=>{const r=card.getBoundingClientRect();if(curTop<0||Math.abs(r.top-curTop)>8){if(curRow.length)rows.push(curRow);curRow=[card];curTop=r.top;}else curRow.push(card);});if(curRow.length)rows.push(curRow);rows.forEach(row=>{if(row.length<2)return;const m=Math.max(...row.map(c=>c.offsetHeight));row.forEach(c=>c.style.minHeight=m+'px');});}

function renderCard(card,idx){
  if(card._isGap){
    const div=document.createElement('div');div.className='card grid-gap-card';div.dataset.cardId=card.id;
    div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=idx;
    div.style.gridColumn='span '+div.dataset.width;
    if(card.height>1)div.style.gridRow='span '+card.height;
    // Strip ALL visual properties — completely invisible card
    div.style.cssText+=';background:none!important;border:none!important;box-shadow:none!important;outline:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;min-width:0;display:block;position:relative;';if(card.minHeight){var sp=document.createElement('div');sp.style.cssText='min-height:'+card.minHeight+'px;pointer-events:none;';div.appendChild(sp);}
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
    eb2.addEventListener('click',e=>{e.stopPropagation();toggleCardEdit(card.id);});
    h.appendChild(eb2);
    const dh=document.createElement('i');dh.className='drag-handle';dh.setAttribute('data-lucide','grip-vertical');dh.title='Drag';
    h.appendChild(dh);
    div.appendChild(h);
    dh.addEventListener('mousedown',e=>startDrag(e,card.id,idx));
    div.addEventListener('dblclick',()=>{config.cards.splice(idx,1);saveConfig();renderAll();toast('Gap removed');});
    return div;
  }
  const div=document.createElement('div');div.className='card';div.dataset.cardId=card.id;div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=idx;div.style.setProperty('--card-accent',card.color||config.theme.glow);
  if(card.height>1)div.style.gridRow='span '+card.height;
  const hdr=document.createElement('div');hdr.className='card-header';const title=document.createElement('div');title.className='card-title';title.appendChild(renderIconElement(card.icon,'card-icon'));title.appendChild(document.createTextNode(' '+(card.title||'')));hdr.appendChild(title);const rg=document.createElement('div');rg.style.cssText='display:flex;align-items:center;gap:4px;';const eb=document.createElement('button');eb.className='card-edit-btn';eb.textContent='✎';eb.title='Edit';eb.addEventListener('click',e=>{e.stopPropagation();toggleCardEdit(card.id);});rg.appendChild(eb);const hd=document.createElement('i');hd.className='drag-handle';hd.setAttribute('data-lucide','grip-vertical');hd.title='Drag';rg.appendChild(h);hdr.appendChild(rg);div.appendChild(hdr);const body=document.createElement('div');body.className='card-body';(card.sections||[]).forEach(sec=>{const el=renderSection(sec,card);if(el)body.appendChild(el);});div.appendChild(body);hd.addEventListener('mousedown',function(e){startDrag(e,card.id,idx);});return div;
}

function renderIconElement(icon,cls){if(!icon)return renderLucideEl('package',cls);if(icon.startsWith('http')||icon.startsWith('data:')||icon.startsWith('/')){const img=document.createElement('img');img.className=cls;img.src=icon;img.alt='';img.loading='lazy';img.onerror=function(){var e=renderLucideEl('package',cls);this.parentNode.replaceChild(e,this);};return img;}if(isLucideName(icon))return renderLucideEl(icon,cls);const s=document.createElement('span');s.className=cls+' emoji-icon';s.textContent=icon;return s;}

function renderCardEditor(card,idx){const div=document.createElement('div');div.className='card card-editing';div.dataset.cardId=card.id;div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=idx;div.style.setProperty('--card-accent',card.color||config.theme.glow);const hdr=document.createElement('div');hdr.className='card-header';const t=document.createElement('div');t.style.cssText='font-size:14px;font-weight:600;';t.textContent='✎ Editing:';const rg=document.createElement('div');rg.style.cssText='display:flex;align-items:center;gap:4px;';const db=document.createElement('button');db.className='btn btn-glass btn-sm';db.textContent='Done';db.addEventListener('click',()=>{editModeCardId=null;saveConfig();renderAll();toast('Card saved');});rg.appendChild(db);const delBtn=document.createElement('button');delBtn.className='btn btn-glass btn-sm btn-danger';delBtn.textContent='Delete';delBtn.addEventListener('click',()=>{const snap=cloneObj(config.cards);if(!confirm('Delete "'+(card.title||'card')+'"?'))return;config.cards.splice(idx,1);editModeCardId=null;saveConfig();renderAll();toastWithUndo('Card deleted',()=>{config.cards=snap;saveConfig();renderAll();});});rg.appendChild(delBtn);hdr.appendChild(t);hdr.appendChild(rg);div.appendChild(hdr);const body=document.createElement('div');body.className='card-body';
// Gap cards: only show width + group + gap toggle
if(card._isGap){
  body.appendChild(inlineRange('Width',card.width,1,config.layout.cols,v=>{card.width=parseInt(v);saveConfig();div.dataset.width=Math.min(card.width,config.layout.cols);}));
  body.appendChild(inlineRange('Min Height (px)',card.minHeight||0,0,400,v=>{card.minHeight=parseInt(v)||0;saveConfig();renderAll();}));
  const gt2=document.createElement('div');gt2.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:12px;';
  const gc2=document.createElement('input');gc2.type='checkbox';gc2.checked=!!card._isGap;
  gc2.addEventListener('change',()=>{card._isGap=gc2.checked;if(!gc2.checked)card.sections=[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}];saveConfig();renderAll();});
  gt2.appendChild(gc2);gt2.appendChild(document.createTextNode('Empty gap'));
  body.appendChild(gt2);div.appendChild(body);return div;
}
body.appendChild(inlineField('Title','text',card.title,v=>{card.title=v;saveConfig();}));body.appendChild(iconField(card));body.appendChild(inlineColor('Color',card.color,v=>{card.color=v;saveConfig();applyTheme();div.style.setProperty('--card-accent',v);}));
// Gap toggle
const gt=document.createElement('div');gt.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:12px;color:var(--text-primary);';
const gc=document.createElement('input');gc.type='checkbox';gc.checked=!!card._isGap;
gc.addEventListener('change',()=>{card._isGap=gc.checked;if(gc.checked)card.sections=[];saveConfig();renderAll();});
gt.appendChild(gc);gt.appendChild(document.createTextNode('Empty gap (no content)'));
body.appendChild(gt);body.appendChild(inlineRange('Width',card.width,1,config.layout.cols,v=>{card.width=parseInt(v);saveConfig();div.dataset.width=Math.min(card.width,config.layout.cols);}));body.appendChild(inlineRange('Height',card.height||1,1,2,v=>{card.height=parseInt(v);saveConfig();if(card.height>1)div.style.gridRow='span '+card.height;else div.style.gridRow='';}));const sl=document.createElement('div');sl.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-secondary);margin:12px 0 6px;';sl.textContent='Sections';body.appendChild(sl);(card.sections||[]).forEach((sec,si)=>{body.appendChild(renderInlineSection(sec,card,si));});const as=document.createElement('button');as.className='btn btn-glass btn-sm';as.style.marginTop='4px';as.textContent='+ Add Section';as.addEventListener('click',()=>{card.sections=card.sections||[];card.sections.push({id:'sec-'+uid(),type:'links',label:'New Section',links:[{label:'Example',url:'https://example.com',icon:'link'}]});saveConfig();renderAll();toast('Section added');});body.appendChild(as);div.appendChild(body);return div;}

function inlineField(l,t,v,o){const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';const lb=document.createElement('label');lb.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';lb.textContent=l;g.appendChild(lb);const i=document.createElement('input');i.type=t;i.value=v;i.style.cssText='width:100%;padding:5px 10px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';i.addEventListener('change',()=>o(i.value));g.appendChild(i);return g;}
function iconField(card){const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';const l=document.createElement('label');l.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';l.textContent='Icon';g.appendChild(l);const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;';const p=document.createElement('span');p.style.cssText='font-size:24px;width:32px;height:32px;text-align:center;display:flex;align-items:center;justify-content:center;';if(card.icon&&(card.icon.startsWith('http')||card.icon.startsWith('data:'))){const img=document.createElement('img');img.src=card.icon;img.style.cssText='width:28px;height:28px;object-fit:contain;';p.appendChild(img);}else if(isLucideName(card.icon)){p.appendChild(renderLucideEl(card.icon,'card-icon'));}else{p.textContent=card.icon||'📦';p.style.color='unset';}row.appendChild(p);const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent='Change';b.addEventListener('click',()=>openIconPicker(url=>{card.icon=url;saveConfig();renderAll();}));row.appendChild(b);const cb=document.createElement('button');cb.className='btn btn-glass btn-sm';cb.textContent='✕';cb.addEventListener('click',()=>{card.icon='package';saveConfig();renderAll();});row.appendChild(cb);g.appendChild(row);return g;}
function inlineColor(l,v,o){const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';const lb=document.createElement('label');lb.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';lb.textContent=l;g.appendChild(lb);const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;';const c=document.createElement('input');c.type='color';c.value=v;c.style.cssText='width:36px;height:30px;padding:1px;border:1px solid var(--surface-border);background:rgba(0,0,0,.3);cursor:pointer;';const t=document.createElement('input');t.type='text';t.value=v;t.style.cssText='flex:1;padding:5px 10px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';const sync=x=>{c.value=x;t.value=x;o(x);};c.addEventListener('input',()=>sync(c.value));t.addEventListener('change',()=>sync(t.value));row.appendChild(c);row.appendChild(t);g.appendChild(row);return g;}
function inlineRange(l,v,mn,mx,o){const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';const lb=document.createElement('label');lb.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';lb.textContent=l;g.appendChild(lb);const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;';const r=document.createElement('input');r.type='range';r.min=mn;r.max=mx;r.value=v;r.style.flex='1';r.style.accentColor='var(--accent)';const s=document.createElement('span');s.style.cssText='font-size:12px;color:var(--text-secondary);min-width:24px;';s.textContent=v;r.addEventListener('input',()=>{s.textContent=r.value;});r.addEventListener('pointerup',()=>{o(r.value);s.textContent=r.value;});r.addEventListener('keyup',e=>{if(e.key==='Enter')o(r.value);});row.appendChild(r);row.appendChild(s);g.appendChild(row);return g;}
function inlineCheck(l,v,o){const w=document.createElement('div');w.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-primary);';const c=document.createElement('input');c.type='checkbox';c.checked=!!v;c.addEventListener('change',()=>o(c.checked));const lb=document.createElement('span');lb.textContent=l;w.appendChild(c);w.appendChild(lb);return w;}

function renderInlineSection(sec,card,si){
  const div=document.createElement('div');div.className='section-editor';div.style.borderLeftColor=card.color||config.theme.glow;
  const hdr=document.createElement('div');hdr.className='section-editor-header';
  hdr.innerHTML=`<span class="section-edit-label">${escAttr(sec.type)}</span>`;
  const acts=document.createElement('div');acts.style.cssText='display:flex;gap:4px;';
  if(si>0){const b=btn('↑','Up');b.addEventListener('click',()=>moveSection(card.id,si,-1));acts.appendChild(b);}
  if(si<(card.sections||[]).length-1){const b=btn('↓','Down');b.addEventListener('click',()=>moveSection(card.id,si,1));acts.appendChild(b);}
  const del=btn('✕','Delete',true);del.addEventListener('click',()=>{card.sections.splice(si,1);saveConfig();renderAll();toast('Section deleted');});acts.appendChild(del);hdr.appendChild(acts);div.appendChild(hdr);
  const bd=document.createElement('div');bd.style.cssText='display:flex;flex-direction:column;gap:5px;';
  const sel=document.createElement('select');sel.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';
  ['links','link-list','search','clock','weather','iframe','notes','dropdown','api-poller'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;if(t===sec.type)o.selected=true;sel.appendChild(o);});sel.addEventListener('change',()=>{sec.type=sel.value;saveConfig();renderAll();});bd.appendChild(sel);
  const li=document.createElement('input');li.placeholder='Section label';li.value=sec.label||'';li.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';li.addEventListener('change',()=>{sec.label=li.value;saveConfig();renderAll();});bd.appendChild(li);
  const mod=CARD_MODULES[sec.type];
  if(mod&&mod.editor)mod.editor(sec,card,bd);
  div.appendChild(bd);return div;
}
function btn(t,ti,d){const b=document.createElement('button');b.className=`btn btn-glass btn-sm${d?' btn-danger':''}`;b.textContent=t;if(ti)b.title=ti;return b;}
function doSearch(q,sec){const s=(q||'').trim();if(!s)return;const en=sec.engine||config.search.selected||'Google';window.open((config.search.engines[en]||config.search.engines['Google'])+encodeURIComponent(s),'_blank');}

function renderSection(sec,card){const f=document.createDocumentFragment();if(sec.label&&sec.type!=='clock'){const l=document.createElement('div');l.className='section-title';const tog=document.createElement('span');tog.className='section-toggle'+(sec.collapsed?' closed':' open');tog.textContent=sec.collapsed?'▶':'▼';tog.addEventListener('click',()=>{sec.collapsed=!sec.collapsed;saveConfig();renderAll();});l.appendChild(tog);l.appendChild(document.createTextNode(sec.label));f.appendChild(l);}const cw=document.createElement('div');cw.className='section-content'+(sec.collapsed?' collapsed':'');const mod=CARD_MODULES[sec.type];
if(mod&&mod.render)mod.render(sec,card,cw);
else cw.textContent='Unknown type: '+sec.type;f.appendChild(cw);const sl=card.sections||[],is=sl.indexOf(sec)===sl.length-1;if(!is&&sec.type!=='clock'){const hr=document.createElement('hr');hr.className='section-divider';f.appendChild(hr);}return f;}
function renderLinkIcon(icon){if(!icon){var i=document.createElement('i');i.className='link-icon';i.setAttribute('data-lucide','link');return i;}if(icon.startsWith('http')||icon.startsWith('data:')||icon.startsWith('/')){const img=document.createElement('img');img.className='link-custom-icon';img.src=icon;img.alt='';img.loading='lazy';img.onerror=function(){var e=document.createElement('i');e.className='link-icon';e.setAttribute('data-lucide','link');this.parentNode.replaceChild(e,this);};return img;}if(isLucideName(icon)){var i=document.createElement('i');i.className='link-icon';i.setAttribute('data-lucide',icon);return i;}const s=document.createElement('span');s.className='link-icon emoji-icon';s.textContent=icon;return s;}
function findSection(sid){for(let ci=0;ci<config.cards.length;ci++)for(let si=0;si<(config.cards[ci].sections||[]).length;si++)if(config.cards[ci].sections[si].id===sid)return[ci,si];return-1;}
function moveSection(cid,si,dir){const c=config.cards.find(x=>x.id===cid);if(!c)return;const t=si+dir,secs=c.sections;if(t<0||t>=secs.length)return;[secs[si],secs[t]]=[secs[t],secs[si]];saveConfig();renderAll();}
function toggleCardEdit(id){editModeCardId=editModeCardId===id?null:id;renderAll();}

function setupClocks(){if(clockInterval)clearInterval(clockInterval);updateClocks();clockInterval=setInterval(updateClocks,1000);}
function updateClocks(){$$('.clock-widget').forEach(el=>{const n=new Date(),f24=el.dataset.format24==='1',sd=el.dataset.showDate==='1';let h=n.getHours();const m=String(n.getMinutes()).padStart(2,'0');el.querySelector('.clock-time').textContent=f24?String(h).padStart(2,'0')+':'+m:(h%12||12)+':'+m+' '+(h>=12?'PM':'AM');if(sd)el.querySelector('.clock-date').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});if(el.dataset.showCalendar==='1'){const cal=el.querySelector('.calendar-widget');if(cal)renderCalendar(cal,n);}});}
function renderCalendar(el,date){const y=date.getFullYear(),m=date.getMonth();const fd=new Date(y,m,1).getDay();const ld=new Date(y,m+1,0).getDate();const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];let h=`<div class="calendar-month">${mn[m]} ${y}</div><div class="calendar-grid">`;['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{h+=`<div class="calendar-day-header">${d}</div>`;});for(let i=0;i<fd;i++)h+='<div class="calendar-day other-month"></div>';const today=new Date();for(let d=1;d<=ld;d++){const is=y===today.getFullYear()&&m===today.getMonth()&&d===today.getDate();h+=`<div class="calendar-day${is?' today':''}">${d}</div>`;}h+='</div>';el.innerHTML=h;}
function setupWeatherWidgets(){weatherIntervals.forEach(clearInterval);weatherIntervals=[];$$('.weather-widget').forEach(fetchWeather);}
function fetchWeather(el){const k=el.dataset.apiKey,l=el.dataset.location;if(!k||!l){el.querySelector('.weather-detail').textContent='Set API key & location in config';return;}const ts=Date.now();fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(l)}&units=${el.dataset.units}&appid=${k}`).then(r=>r.json()).then(d=>{if(d.cod!==200)throw Error(d.message);var iconEl=el.querySelector('.weather-icon');if(iconEl){var lname=wIcon(d.weather[0].id);iconEl.setAttribute('data-lucide',lname);}el.querySelector('.weather-temp').textContent=Math.round(d.main.temp)+'°';el.querySelector('.weather-detail').textContent=d.weather[0].description+' · '+d.main.humidity+'% humidity';var windEl=el.querySelector('.weather-wind-val');if(windEl){var ws=d.wind?d.wind.speed:0;windEl.textContent=ws+' '+(el.dataset.units==='imperial'?'mph':'m/s');}var tsEl=el.querySelector('.weather-ts');if(tsEl){tsEl.textContent='updated just now';tsEl.dataset.ts=String(ts);}el.dataset.lastOk=String(ts);if(typeof lucide!=='undefined')lucide.createIcons();}).catch(e=>{el.querySelector('.weather-detail').textContent='⚠ '+e.message;var tsEl=el.querySelector('.weather-ts');if(tsEl){var lo=el.dataset.lastOk;tsEl.textContent=lo?'last ok: '+timeAgo(parseInt(lo)):'';tsEl.dataset.ts=lo||String(ts);}});weatherIntervals.push(setInterval(()=>fetchWeather(el),600000));}
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
function fetchQuote(el){
  var txt=el.querySelector('.quotes-content'),auth=el.querySelector('.quotes-author-name');
  if(!txt||!auth)return;
  var q=LOCAL_QUOTES[Math.floor(Math.random()*LOCAL_QUOTES.length)];
  txt.textContent=q.q;
  auth.textContent='— '+q.a;
}


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
    if(!parts.length)content.innerHTML='<div style="font-size:12px;color:var(--text-tertiary);">No stats</div>';
    if(ts){ts.textContent='updated';ts.dataset.ts=String(Date.now());}
  }
  var url;
  if(src==='local')url='/api/stats';
  else if(src==='glances')url=el.dataset.glancesUrl+'/api/4';
  else if(src==='custom'&&el.dataset.customUrl)url=el.dataset.customUrl;
  else{content.innerHTML='<div style="font-size:12px;color:var(--text-tertiary);">Configure source</div>';return;}
  content.innerHTML='<div style="font-size:12px;color:var(--text-tertiary);">Loading...</div>';
  fetch(url).then(function(r){if(!r.ok)throw Error(r.status);return r.json();}).then(function(d){render(d);}).catch(function(){content.innerHTML='<div style="font-size:12px;color:#cc6666;">Stats offline</div>';});
}

/* ═══════════════════════════════════════════ DRAG & DROP ═══════════════════════════════════════════
   Pointer-based drag with position preview, gap-slot awareness, smooth animation.
   Cards snap to grid cells; gaps preserve blank spaces for customization.
*/
function startDrag(e,id,idx){
  e.preventDefault();
  const card=config.cards.find(x=>x.id===id);
  if(!card)return;
  const grid=$('#card-grid');
  const srcEl=grid.querySelector(`[data-card-id="${id}"]`);
  if(!srcEl)return;
  srcEl.classList.add('dragging');

  // Ghost box — shows exact target position
  const ghost=document.createElement('div');ghost.className='drag-ghost';
  ghost.style.display='none';
  document.body.appendChild(ghost);
  // Mini label inside ghost
  const label=card._isGap?'empty':(card.icon||'package')+' '+(card.title||'');
  ghost.innerHTML=`<div style="padding:8px 12px;font-size:12px;font-weight:600;">${label}</div>`;

  dragState={cardId:id,srcEl,ghost,active:false};
  document.addEventListener('mousemove',onDragMove);
  document.addEventListener('mouseup',onDragEnd);
}

function onDragMove(e){
  if(!dragState)return;
  if(!dragState.active&&dragState.srcEl){
    if(!dragState._startX){dragState._startX=e.clientX;dragState._startY=e.clientY;return;}
    if((e.clientX-dragState._startX)**2+(e.clientY-dragState._startY)**2<64)return;
    dragState.active=true;
  }
  if(!dragState.active)return;

  const grid=$('#card-grid');
  const ghost=dragState.ghost;
  if(!ghost)return;
  const gr=grid.getBoundingClientRect();
  const cols=config.layout.cols;
  const colW=gr.width/cols;

  // Card dimensions for the ghost
  const card=config.cards.find(c=>c.id===dragState.cardId);
  if(!card){ghost.style.display='none';return;}
  const cw=Math.min(card.width||1,cols);

  // Calculate target column (snap card so its center is at cursor)
  const relX=e.clientX-gr.left;
  const targetCol=Math.max(0,Math.min(cols-cw,Math.floor((relX-(cw*colW)/2)/colW)+1));

  // Find which row this column position falls in
  const items=[...grid.children].filter(el=>el.classList.contains('card')&&el!==dragState.srcEl);
  const rows=[]; // array of {top,bottom,cards[],right}
  for(const el of items){
    const r=el.getBoundingClientRect();
    let found=false;
    for(const row of rows){
      if(Math.abs(row.top-r.top)<10){row.cards.push(el);row.right=Math.max(row.right,r.right);row.bottom=r.bottom;found=true;break;}
    }
    if(!found)rows.push({top:r.top,bottom:r.bottom,cards:[el],right:r.right});
  }

  // Find which row the cursor is on
  let targetRow=null;
  let targetRowIdx=0;
  for(let i=0;i<rows.length;i++){
    const row=rows[i];
    if(e.clientY>=row.top&&e.clientY<=row.bottom){targetRow=row;targetRowIdx=i;break;}
  }
  // If between rows, use the nearest
  if(!targetRow){
    let best=null,bestD=Infinity;
    for(let i=0;i<rows.length;i++){
      const d=Math.abs(e.clientY-rows[i].top);
      if(d<bestD){bestD=d;best=i;}
    }
    if(best!==null){targetRow=rows[best];targetRowIdx=best;}
  }

  if(!targetRow){
    // No rows yet — ghost at cursor
    ghost.style.display='';
    ghost.style.cssText=`
      position:fixed;pointer-events:none;z-index:999;
      left:${gr.left+targetCol*colW}px;top:${e.clientY-30}px;
      width:${cw*colW-4}px;height:60px;
      border:2px dashed var(--accent);background:var(--accent-glass);
      backdrop-filter:blur(4px);border-radius:0;
    `;
    dragState._beforeCard=null;
    return;
  }

  // The card should go in the target row at targetCol. Snapshot the row cards.
  // Find the insertion point: the first card in the row whose left edge is past the target column
  ghost.style.display='';
  const ghostLeft=gr.left+targetCol*colW;
  const ghostTop=targetRow.top;
  const ghostW=cw*colW;
  const ghostH=targetRow.bottom-targetRow.top;

  ghost.style.cssText=`
    position:fixed;pointer-events:none;z-index:999;
    left:${ghostLeft}px;top:${ghostTop}px;
    width:${ghostW-4}px;height:${ghostH-4}px;
    border:2px dashed var(--accent);background:var(--accent-glass);
    backdrop-filter:blur(4px);border-radius:0;
    display:flex;align-items:center;justify-content:center;
  `;

  // Determine which card to insert before based on grid position
  // Find the first card (in DOM order) that starts at or after the target column AND same row
  let beforeCard=null;
  for(const el of items){
    const r=el.getBoundingClientRect();
    if(Math.abs(r.top-targetRow.top)<10&&r.left>=ghostLeft){
      beforeCard=el;break;
    }
  }
  // If not found in same row, check the next row's first card
  if(!beforeCard&&targetRowIdx<rows.length-1){
    beforeCard=rows[targetRowIdx+1].cards[0];
  }
  dragState._beforeCard=beforeCard?beforeCard.dataset.cardId:null;
}

function onDragEnd(e){
  document.removeEventListener('mousemove',onDragMove);
  document.removeEventListener('mouseup',onDragEnd);
  if(!dragState)return;
  const{cardId,srcEl,ghost,active,_beforeCard}=dragState;
  if(srcEl)srcEl.classList.remove('dragging');
  if(ghost&&ghost.parentNode)ghost.remove();

  if(active&&_beforeCard){
    const grid=$('#card-grid');
    const cards=config.cards;
    const srcIdx=cards.findIndex(c=>c.id===cardId);
    const tgtIdx=cards.findIndex(c=>c.id===_beforeCard);
    if(srcIdx>=0&&tgtIdx>=0&&srcIdx!==tgtIdx){
      const mel=grid.querySelector(`[data-card-id="${cardId}"]`);
      const bdom=grid.querySelector(`[data-card-id="${_beforeCard}"]`);
      if(mel&&bdom){
        // FLIP animation: record position BEFORE move
        const first=mel.getBoundingClientRect();

        // Move card to new DOM position
        grid.insertBefore(mel,bdom);

        // Record position AFTER move
        const last=mel.getBoundingClientRect();

        // Calculate delta: invert (move from old to new)
        const dx=first.left-last.left;
        const dy=first.top-last.top;
        const sx=first.width/last.width;
        const sy=first.height/last.height;

        // Apply inverse transform so card appears at its old position
        mel.style.transformOrigin='top left';
        mel.style.transform=`translate(${dx}px,${dy}px) scale(${sx},${sy})`;
        mel.style.transition='none';

        // On next frame, animate to final position
        requestAnimationFrame(()=>{
          mel.style.transition='transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
          mel.style.transform='translate(0,0) scale(1,1)';
        });

        // Clean up after animation
        setTimeout(()=>{
          mel.style.transition='';
          mel.style.transform='';
          mel.style.transformOrigin='';
        },400);
      }
      const[m]=cards.splice(srcIdx,1);
      cards.splice(srcIdx<tgtIdx?tgtIdx-1:tgtIdx,0,m);
      saveConfig();
      const allCards=[...grid.children].filter(el=>el.classList.contains('card'));
      allCards.forEach((el,i)=>{el.dataset.index=i;});
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
function openIconPicker(cb){iconPickerCallback=cb;iconPickerOpen=true;$('#icon-picker-overlay').classList.add('open');$('#icon-picker').classList.add('open');buildIconPicker('library');}
function closeIconPicker(){iconPickerOpen=false;iconPickerCallback=null;$('#icon-picker-overlay').classList.remove('open');$('#icon-picker').classList.remove('open');}
function buildIconPicker(t){const c=$('#icon-picker-content');c.innerHTML='';$$('.ip-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));if(t==='library')buildLibraryTab(c);else if(t==='icons')buildIconsTab(c);else if(t==='url')buildUrlTab(c);}
function buildLibraryTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search services...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);function ri(f){g.innerHTML='';const fl=(f||'').toLowerCase();const items=fl?ICON_REPO.filter(i=>i.name.toLowerCase().includes(fl)||i.file.toLowerCase().includes(fl)||i.tags.some(t=>t.includes(fl))):ICON_REPO;items.slice(0,120).forEach(item=>{const d=document.createElement('div');d.className='icon-grid-item';const img=document.createElement('img');img.src=`${ICON_CDN}/${item.file}.png`;img.alt=item.name;img.loading='lazy';img.onerror=function(){this.parentElement.style.display='none';};const l=document.createElement('span');l.textContent=item.name;d.appendChild(img);d.appendChild(l);d.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${item.file}.png`));g.appendChild(d);});if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">No icons found</div>';}s.addEventListener('input',()=>ri(s.value));ri('');}

function buildIconsTab(c){
  const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search icons or emoji...';c.appendChild(s);
  const etab=document.createElement('div');etab.style.cssText='display:flex;gap:4px;margin-bottom:8px;';
  const btnSvg=document.createElement('button');btnSvg.className='btn btn-glass btn-sm';btnSvg.textContent='SVG Icons';btnSvg.style.cssText='flex:1;';
  const btnEmoji=document.createElement('button');btnEmoji.className='btn btn-glass btn-sm';btnEmoji.textContent='Emoji';btnEmoji.style.cssText='flex:1;';
  etab.appendChild(btnSvg);etab.appendChild(btnEmoji);c.appendChild(etab);
  const g=document.createElement('div');g.className='icon-grid';g.style.gridTemplateColumns='repeat(auto-fill,minmax(50px,1fr))';c.appendChild(g);
  var _mode='svg';
  function ri(f){g.innerHTML='';const fl=(f||'').toLowerCase();
    if(_mode==='svg'){const items=fl?LUCIDE_ICONS.filter(n=>n.includes(fl)):LUCIDE_ICONS;
      items.forEach(name=>{const d=document.createElement('div');d.className='icon-grid-item';d.style.cssText='flex-direction:column;gap:2px;padding:6px 2px;';
      const i=document.createElement('i');i.setAttribute('data-lucide',name);i.style.cssText='width:22px;height:22px;';
      const l=document.createElement('span');l.style.cssText='font-size:9px;text-align:center;overflow:hidden;text-overflow:ellipsis;max-width:50px;white-space:nowrap;';l.textContent=name;
      d.appendChild(i);d.appendChild(l);
      d.addEventListener('click',()=>selectIcon(name));g.appendChild(d);});
      if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">No icons found</div>';
    }else{const items=fl?EMOJIS.filter(e=>e.includes(fl)):EMOJIS;
      items.forEach(emo=>{const d=document.createElement('div');d.className='icon-grid-item';d.innerHTML='<span class="ip-emoji">'+emo+'</span>';d.addEventListener('click',()=>selectIcon(emo));g.appendChild(d);});
      if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">No emoji found</div>';
    }
  }function setMode(m){_mode=m;btnSvg.style.borderColor=m==='svg'?'var(--accent)':'var(--surface-border)';btnEmoji.style.borderColor=m==='emoji'?'var(--accent)':'var(--surface-border)';ri(s.value);if(m==='svg')setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},0);}
  btnSvg.addEventListener('click',function(){setMode('svg');});btnEmoji.addEventListener('click',function(){setMode('emoji');});
  s.addEventListener('input',function(){ri(s.value);});setMode('svg');setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},0);}
function buildUrlTab(c){c.innerHTML=`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Enter a direct URL:</div><input class="icon-search-bar" id="icon-url-input" placeholder="https://example.com/icon.png"><button class="btn btn-glass btn-sm" id="icon-url-btn">Use</button><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;" id="icon-url-examples"></div>`;const inp=$('#icon-url-input');['jellyfin','plex','homeassistant','portainer','pihole','grafana','sonarr','radarr'].forEach(n=>{const tag=document.createElement('button');tag.className='btn btn-glass btn-sm';tag.style.fontSize='10px';tag.textContent=n;tag.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${n}.png`));$('#icon-url-examples').appendChild(tag);});inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&inp.value.trim())selectIcon(inp.value.trim());});$('#icon-url-btn').addEventListener('click',()=>{if(inp.value.trim())selectIcon(inp.value.trim());});}
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
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': file.name },
        body: blob,
      });
      const result = await resp.json();
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
    const resp = await fetch('/api/uploads/' + name, { method: 'DELETE' });
    const result = await resp.json();
    if (result.status === 'deleted' || resp.ok) {
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
    const resp = await fetch('/api/uploads');
    if (resp.ok) { uploadedFiles = await resp.json(); }
  } catch(e) { /* server might not be available */ }
}

function openBgPicker() {
  const overlay = $('#bg-picker-overlay');
  const picker = $('#bg-picker');
  overlay.classList.add('open'); picker.classList.add('open');
  const content = $('#bg-picker-content'); content.innerHTML = '';

  if (!uploadedFiles.length) {
    content.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">No uploaded backgrounds yet. Upload one from the config panel.</div>';
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
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escAttr(f.name)}</div>
        <div style="font-size:10px;color:var(--text-tertiary);">${fmtSize(f.size)}</div>
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
      deleteUpload(f.url);
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
  const tg=el('div','flex:1;');tg.appendChild(el('label','display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Page Title'));
  const ti=el('input','width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;');
  ti.type='text';ti.value=brand.title||'WarTab';
  ti.addEventListener('change',()=>{if(!config.branding)config.branding={};config.branding.title=ti.value;applyTheme();saveConfig();buildConfigPanel();});
  tg.appendChild(ti);br.appendChild(tg);

  const ig=el('div','flex-shrink:0;');ig.appendChild(el('label','display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Icon'));
  const ir2=el('div','display:flex;gap:4px;align-items:center;');
  const ip=el('span','font-size:22px;width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);');
  const bi=brand.icon||'sword';
  if(bi.startsWith('http')||bi.startsWith('data:')||bi.startsWith('/')){const img=document.createElement('img');img.src=bi;img.style.cssText='width:22px;height:22px;object-fit:contain;';ip.appendChild(img);}else if(isLucideName(bi)){var li=document.createElement('i');li.setAttribute('data-lucide',bi);li.style.cssText='width:22px;height:22px;';ip.appendChild(li);setTimeout(function(){if(typeof lucide!=='undefined')lucide.createIcons();},0);}else{ip.textContent=bi;ip.className+=' emoji-icon';}
  ir2.appendChild(ip);
  const ib=el('button','','Change');ib.className='btn btn-glass btn-sm';
  ib.addEventListener('click',()=>openIconPicker(url=>{if(!config.branding)config.branding={};config.branding.icon=url;applyTheme();saveConfig();buildConfigPanel();}));
  ir2.appendChild(ib);ig.appendChild(ir2);br.appendChild(ig);body.appendChild(br);

  /* ── Background ── */
  body.appendChild(ps('Background'));
  const bgType=config.theme.bgType;
  body.appendChild(pf('select','','Type',[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'},{value:'image',label:'Image'}],bgType,v=>{config.theme.bgType=v;applyChanges();renderAll();buildConfigPanel();}));

  // Value field — only for gradient/solid by default; shown on "Set URL" click for image
  if(bgType==='image'){
    bgValueRow(body);
  } else {
    body.appendChild(pf('text','','Value',null,config.theme.bgValue,v=>{config.theme.bgValue=v;applyChanges();}));
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
  body.appendChild(pf('color','','Accent Color',null,config.theme.glow,v=>{config.theme.glow=v;applyChanges();}));
  body.appendChild(pf('range','','Glass Blur (px)',null,config.theme.blur,v=>{config.theme.blur=parseInt(v);applyChanges();},{min:4,max:40}));
  body.appendChild(pf('select','','Card Style',[{value:'dark',label:'Deep Glass'},{value:'light',label:'Frosted Glass'},{value:'solid-dark',label:'Solid Obsidian'},{value:'solid-light',label:'Solid Pearl'},{value:'neon',label:'Neon Pulse'}],config.theme.cardBg||'dark',v=>{config.theme.cardBg=v;applyChanges();}));
  body.appendChild(chk('Animated transitions',config.theme.animations!==false,v=>{config.theme.animations=v;applyChanges();renderAll();}));
  body.appendChild(chk('Card accent bar',config.theme.showAccentBar!==false,v=>{config.theme.showAccentBar=v;applyChanges();renderAll();}));
  /* ── Font ── */
  body.appendChild(ps('Font'));
  const fontColor=config.theme.fontColor||'#cccccc';
  body.appendChild(pf('color','','Font Color',null,fontColor,v=>{config.theme.fontColor=v;applyChanges();document.body.style.setProperty('--text-primary',hexToRgba2(v,0.92));}));
  body.appendChild(pf('select','','Font Size',[{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],config.theme.fontSize,v=>{config.theme.fontSize=v;applyChanges();}));
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
  fg.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Font'));
  const fsel=document.createElement('select');
  fsel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;cursor:pointer;';
  fsel.style.fontFamily=`'${curFont}',sans-serif`;
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
  fg.appendChild(fsel);body.appendChild(fg);  /* ── Status Bar ── */
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
    const cl=document.createElement('label');cl.style.cssText='display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
    const cc=document.createElement('input');cc.type='checkbox';cc.checked=(config.statusBar.items||[]).includes(item);
    cc.addEventListener('change',()=>{config.statusBar.items=config.statusBar.items||[];if(cc.checked&&!config.statusBar.items.includes(item))config.statusBar.items.push(item);else if(!cc.checked)config.statusBar.items=config.statusBar.items.filter(i=>i!==item);saveConfig();initStatusBar();});
    cl.appendChild(cc);cl.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));itemsRow.appendChild(cl);
  });
  const itemsG=el('div','margin-bottom:10px;');itemsG.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;','Show items:'));
  itemsG.appendChild(itemsRow);body.appendChild(itemsG);

  /* ── Layout ── */
  body.appendChild(ps('Layout'));
  body.appendChild(pf('range','','Columns',null,config.layout.cols,v=>{config.layout.cols=parseInt(v);applyChanges();renderAll();},{min:1,max:6}));
  body.appendChild(pf('range','','Card Gap (px)',null,config.layout.gap,v=>{config.layout.gap=parseInt(v);applyChanges();renderAll();},{min:4,max:40}));
  body.appendChild(pf('range','','Page Padding X (px)',null,config.layout.paddingX||24,v=>{config.layout.paddingX=parseInt(v)||24;applyChanges();renderAll();},{min:0,max:80}));
  body.appendChild(pf('range','','Page Padding Y (px)',null,config.layout.paddingY||24,v=>{config.layout.paddingY=parseInt(v)||24;applyChanges();renderAll();},{min:0,max:80}));

  /* ── Data ── */
  body.appendChild(ps('Data'));
  const acts=el('div','display:flex;gap:8px;flex-wrap:wrap;');
  ['Export','Import','Reset'].forEach(label=>{
    const b=el('button','',label);b.className='btn btn-glass btn-sm'+(label==='Reset'?' btn-danger':'');
    b.addEventListener('click',()=>{
      if(label==='Export'){const bb=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(bb);a.download='wartab-config.json';a.click();URL.revokeObjectURL(a.href);toast('Exported');}
      else if(label==='Import'){$('#import-file-input2').click();}
      else if(label==='Reset'){if(!confirm('Reset to defaults?'))return;const snap=cloneObj(config);config=cloneObj(DEFAULT_CONFIG);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toastWithUndo('Reset',()=>{config=snap;saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();});}
    });
    acts.appendChild(b);
  });
  body.appendChild(acts);
  const fi2=document.createElement('input');fi2.type='file';fi2.accept='.json';fi2.style.display='none';fi2.id='import-file-input2';
  fi2.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);config=deepMerge(cloneObj(DEFAULT_CONFIG),d);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Imported');}catch(e){toast('Failed: '+e.message,'error');}};r.readAsText(e.target.files[0]);}});
  
  /* ── API Keys ── */
  body.appendChild(ps('API Keys'));
  const apibox=el('div','font-size:12px;line-height:1.7;padding:0 0 8px;');
  apibox.innerHTML='<div style="margin-bottom:10px;color:var(--text-secondary);">Some modules need a free API key. Get yours here:</div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;">'+
    '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:rgba(0,0,0,0.2);"><span style="font-size:16px;">🌤</span><div><div style="font-weight:600;font-size:12px;">Weather (OpenWeatherMap)</div><div style="font-size:10px;color:var(--text-tertiary);">Free tier, 60 calls/min. Sign up at <a href="https://openweathermap.org/api" target="_blank" style="color:var(--accent);">openweathermap.org/api</a></div></div></div>'+
    '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;background:rgba(0,0,0,0.2);"><span style="font-size:16px;">💬</span><div><div style="font-weight:600;font-size:12px;">Quotes</div><div style="font-size:10px;color:var(--text-tertiary);">Built-in. 21 local quotes, no network needed.</div></div></div>'+
    '</div>';
  body.appendChild(apibox);
body.appendChild(fi2);
}

function bgValueRow(body){
  // Show text field for image URL
  const g=el('div','margin-bottom:10px;');g.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Image URL'));
  const i=document.createElement('input');i.type='text';i.value=config.theme.bgValue;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;';
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
  w.appendChild(c);w.appendChild(el('span','font-size:13px;',label));
  return w;
}

function hexToRgba2(h,a){const c=h.replace('#','');return`rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}

function ps(t){return el('div','','',el('h3','font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);margin-bottom:14px;margin-top:24px;padding-bottom:6px;border-bottom:1px solid var(--glass-border);font-family:var(--font);',t));}
function addNewCard(){
  const colMax=config.layout.cols;
  config.cards.push({
    id:'card-'+uid(), title:'New Card', icon:'package', color:'#888888',
    width:Math.min(1,colMax),height:1,
    sections:[{id:'sec-'+uid(),type:'links',label:'Links',links:[{label:'Example',url:'https://example.com',icon:'link'}]}],
  });
  saveConfig(); renderAll(); toast('New card added');
}
function pf(type,key,label,options,value,onChange,attrs){const g=el('div','margin-bottom:10px;');
  if(type==='select'){g.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const s=document.createElement('select');s.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;cursor:pointer;';(options||[]).forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===value)opt.selected=true;s.appendChild(opt);});s.addEventListener('change',()=>onChange(s.value));g.appendChild(s);}
  else if(type==='range'){g.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;align-items:center;gap:8px;');const i=document.createElement('input');i.type='range';i.min=attrs.min||0;i.max=attrs.max||100;i.value=value;i.style.cssText='flex:1;accent-color:var(--accent);';const s=el('span','font-size:12px;color:var(--text-secondary);min-width:30px;',String(value));i.addEventListener('input',()=>s.textContent=i.value);i.addEventListener('pointerup',()=>onChange(i.value));r.appendChild(i);r.appendChild(s);g.appendChild(r);}
  else if(type==='color'){g.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const r=el('div','display:flex;gap:8px;align-items:center;');const i=document.createElement('input');i.type='color';i.value=value;i.style.cssText='width:40px;height:34px;padding:2px;cursor:pointer;flex-shrink:0;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';const t=document.createElement('input');t.type='text';t.value=value;t.style.cssText='flex:1;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;';const sync=v=>{i.value=v;t.value=v;onChange(v);};i.addEventListener('input',()=>sync(i.value));t.addEventListener('change',()=>sync(t.value));r.appendChild(i);r.appendChild(t);g.appendChild(r);}
  else{g.appendChild(el('label','display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:3px;',label));const i=document.createElement('input');i.type='text';i.value=value;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:13px;outline:none;';i.addEventListener('change',()=>onChange(i.value));g.appendChild(i);}
  return g;
}
function applyChanges(){saveConfig();applyTheme();}

/* ═══════════════════════════════════════════ INIT ═══════════════════════════════════════════ */
async function init() {
  loadConfig(); applyTheme();
  await fetchUploads();
  // Random background on load if rotation enabled
  if(config.theme.bgRotate&&uploadedFiles.length>0){
    const pick=uploadedFiles[Math.floor(Math.random()*uploadedFiles.length)];
    if(pick){config.theme.bgType='image';config.theme.bgValue=pick.url;saveConfig();applyTheme();}
  }
  renderAll(); initStatusBar();
  // Footer
  $('#footer-text').textContent='WarTab v'+WARTAB_VERSION;
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#btn-add-card').addEventListener('click',()=>{addNewCard();});
  $('#config-close').addEventListener('click',toggleConfigPanel);
  $('#config-overlay').addEventListener('click',toggleConfigPanel);
  $$('.ip-tab').forEach(t=>t.addEventListener('click',()=>buildIconPicker(t.dataset.tab)));
  $('#icon-picker-close').addEventListener('click',closeIconPicker);
  $('#icon-picker-overlay').addEventListener('click',closeIconPicker);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&configPanelOpen)toggleConfigPanel();
    if(e.key==='Escape'&&iconPickerOpen)closeIconPicker();
    if(e.key==='C'&&e.ctrlKey&&e.shiftKey){e.preventDefault();toggleConfigPanel();}
    if((e.key==='l'||e.key==='k')&&(e.ctrlKey||e.metaKey)){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
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
