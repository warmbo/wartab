/* WarTab — compact information modules: RSS, agenda, service status, markdown. */
(function(){
  function text(tag,cls,value){const e=document.createElement(tag);e.className=cls||'';e.textContent=value||'';return e;}
  function proxyText(url){return WarTabHttp.request('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url,method:'GET'})}).then(function(result){return typeof result==='string'?result:(result.body||result.data||'');});}
  function fillError(root,message,retry){root.replaceChildren(ds.error(message,'Check the URL and network access.',{label:'Retry',onClick:retry}));}
  function safeHref(href){const raw=String(href||'').trim();if(!raw)return'';if(/^[a-z][a-z0-9+.-]*:/i.test(raw)&&!/^https?:/i.test(raw))return'';return raw;}

  registerModule('rss',{
    defaults:{url:'',limit:6,refreshInterval:900},
    css:`.info-list{display:flex;flex-direction:column;gap:var(--space-1)}.info-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--space-2);align-items:center;padding:6px 8px;border-radius:var(--radius-sm);color:var(--text-primary);text-decoration:none}.info-row:hover{background:var(--accent-glass)}.info-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.info-meta{font-size:var(--text-2xs);color:var(--text-tertiary);white-space:nowrap}`,
    render:function(sec,card,cw){cw.appendChild(ds.loading(4,'bar'));},
    onMount:function(sec,card,cw){
      function load(){if(!sec.url){cw.replaceChildren(ds.empty('rss','No feed configured','Add an RSS/Atom URL in the card editor.'));return Promise.resolve();}return proxyText(sec.url).then(function(xml){const doc=new DOMParser().parseFromString(xml,'text/xml');const nodes=Array.from(doc.querySelectorAll('item, entry')).slice(0,Math.max(1,parseInt(sec.limit)||6));const list=text('div','info-list');nodes.forEach(function(node){const title=(node.querySelector('title')||{}).textContent||'Untitled';const linkNode=node.querySelector('link');const rawHref=(linkNode&&linkNode.getAttribute('href'))||(linkNode&&linkNode.textContent)||'#';const a=text('a','info-row');const href=safeHref(rawHref);a.href=href||'#';a.target='_blank';a.rel='noopener';a.appendChild(text('span','info-title',title.trim()));const date=node.querySelector('pubDate, published, updated');a.appendChild(text('span','info-meta',date?new Date(date.textContent).toLocaleDateString():''));list.appendChild(a);});cw.replaceChildren(nodes.length?list:ds.empty('rss','No feed entries','The feed returned no readable items.'));}).catch(function(){fillError(cw,'Feed unavailable',load);});}
      return WarTabHttp.createPoller({owner:cw,interval:Math.max(60000,(parseInt(sec.refreshInterval)||900)*1000),task:load});
    },
    settings:[{name:'url',label:'RSS / Atom URL',type:'text',placeholder:'https://example.com/feed.xml'},{name:'limit',label:'Entries',type:'number',default:6},{name:'refreshInterval',label:'Refresh seconds',type:'number',default:900}]
  });

  registerModule('agenda',{
    defaults:{url:'',limit:6,refreshInterval:1800},
    render:function(sec,card,cw){cw.appendChild(ds.loading(4,'bar'));},
    onMount:function(sec,card,cw){
      function unfold(raw){return raw.replace(/\r?\n[ \t]/g,'');}
      function load(){if(!sec.url){cw.replaceChildren(ds.empty('calendar-days','No calendar configured','Add a public iCal URL in the editor.'));return Promise.resolve();}return proxyText(sec.url).then(function(raw){const events=unfold(raw).split('BEGIN:VEVENT').slice(1).map(function(block){function field(name){const m=block.match(new RegExp('^'+name+'[^:]*:(.*)$','mi'));return m?m[1].trim():'';}const start=field('DTSTART');const date=start?new Date(start.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?.*$/,'$1-$2-$3T$4:$5:00')):null;return{title:field('SUMMARY')||'Untitled event',date:date};}).filter(function(e){return e.date&&!isNaN(e.date)&&e.date.getTime()>Date.now()-86400000;}).sort(function(a,b){return a.date-b.date;}).slice(0,Math.max(1,parseInt(sec.limit)||6));const list=text('div','info-list');events.forEach(function(e){const row=text('div','info-row');row.appendChild(text('span','info-title',e.title));row.appendChild(text('span','info-meta',e.date.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})));list.appendChild(row);});cw.replaceChildren(events.length?list:ds.empty('calendar-check','Agenda clear','No upcoming events found.'));}).catch(function(){fillError(cw,'Calendar unavailable',load);});}
      return WarTabHttp.createPoller({owner:cw,interval:Math.max(300000,(parseInt(sec.refreshInterval)||1800)*1000),task:load});
    },
    settings:[{name:'url',label:'Public iCal URL',type:'text',placeholder:'https://example.com/calendar.ics'},{name:'limit',label:'Events',type:'number',default:6},{name:'refreshInterval',label:'Refresh seconds',type:'number',default:1800}]
  });

  registerModule('service-status',{
    defaults:{services:'',refreshInterval:60},
    css:`.service-summary{display:grid;gap:var(--space-1);padding:var(--space-2) 0 var(--space-3)}.service-summary-line{font-size:var(--text-lg);font-weight:700;color:var(--text-primary)}.service-summary-meta{display:flex;align-items:center;gap:var(--space-2);color:var(--text-secondary);font-size:var(--text-xs)}.service-details summary{min-height:36px;display:flex;align-items:center;gap:var(--space-2);cursor:pointer;color:var(--text-secondary);font-size:var(--text-xs)}.service-details summary::marker{color:var(--text-tertiary)}`,
    render:function(sec,card,cw){cw.appendChild(ds.loading(4,'bar'));},
    onMount:function(sec,card,cw){
      function parse(){return String(sec.services||'').split('\n').map(function(line){const p=line.split('|');return{label:(p[0]||'').trim(),url:(p[1]||'').trim()};}).filter(function(s){return s.label&&s.url;});}
      function renderRows(rows,checkedAt){
        const healthy=rows.filter(function(r){return r.state==='healthy';});
        const avg=healthy.length?Math.round(healthy.reduce(function(sum,r){return sum+r.ms;},0)/healthy.length):0;
        const root=text('div','service-status-widget');const summary=text('div','service-summary');
        summary.appendChild(text('div','service-summary-line',healthy.length+'/'+rows.length+' services healthy'));
        const meta=text('div','service-summary-meta',healthy.length?(avg+' ms average latency'):'Attention required');meta.appendChild(ds.freshness(checkedAt,Math.max(120000,(parseInt(sec.refreshInterval)||60)*3000)));summary.appendChild(meta);root.appendChild(summary);
        const details=document.createElement('details');details.className='service-details';const toggle=document.createElement('summary');toggle.textContent='Service details';details.appendChild(toggle);
        const list=text('div','info-list');rows.forEach(function(r){list.appendChild(ds.statusRow({label:r.s.label,href:r.s.url,state:r.state,status:r.state==='healthy'?'Online':'Offline',context:r.state==='healthy'?(r.ms+' ms response'):'Connection failed',meta:r.state==='healthy'?r.ms+' ms':'—'}));});details.appendChild(list);root.appendChild(details);cw.replaceChildren(root);renderIcons();
      }
      function load(){const services=parse();if(!services.length){cw.replaceChildren(ds.empty('activity','No services configured','Add services to monitor or launch.',{label:'Configure',onClick:function(){openCardEditPanel(card.id);}}));return Promise.resolve();}return Promise.all(services.map(function(s){const started=Date.now();return WarTabHttp.request('/api/proxy',{method:'POST',timeout:8000,headers:{'Content-Type':'application/json'},body:JSON.stringify({url:s.url,method:'GET',timeout:5})}).then(function(){return{s:s,state:'healthy',ms:Date.now()-started};},function(){return{s:s,state:'offline',ms:Date.now()-started};});})).then(function(rows){renderRows(rows,Date.now());});}
      return WarTabHttp.createPoller({owner:cw,interval:Math.max(15000,(parseInt(sec.refreshInterval)||60)*1000),task:load});
    },
    settings:[{name:'services',label:'Services',type:'rows',placeholder:'Name',valuePlaceholder:'https://…'},{name:'refreshInterval',label:'Refresh seconds',type:'number',default:60}]
  });

  function markdown(input){return escHtml(String(input||'')).replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/^[-*] (.*)$/gm,'<li>$1</li>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>');}
  registerModule('markdown',{
    defaults:{content:'# Markdown\nWrite **rich** static content here.'},
    css:`.markdown-widget{line-height:1.6;color:var(--text-secondary);overflow-wrap:anywhere}.markdown-widget h1,.markdown-widget h2,.markdown-widget h3{color:var(--text-primary);margin:0 0 var(--space-2)}.markdown-widget code{padding:2px 5px;border-radius:var(--radius-sm);background:var(--card-input-bg);font-family:monospace}.markdown-widget a{color:var(--accent)}`,
    render:function(sec,card,cw){const root=text('div','markdown-widget');root.innerHTML=markdown(sec.content);cw.appendChild(root);},
    settings:[{name:'content',label:'Markdown',type:'textarea',placeholder:'# Heading'}]
  });
})();
