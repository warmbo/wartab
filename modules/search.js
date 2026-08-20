registerModule('search', {
  defaults: { placeholder:'Search...', engine:'Google' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='search-widget';
    const wr=document.createElement('div');wr.className='inline-search-wrap';wr.innerHTML='<span class="search-icon"><i data-lucide="search"></i></span>';
    const i=document.createElement('input');i.type='text';i.placeholder=sec.placeholder||'Search...';i.setAttribute('aria-label','Search query');
    const suggestions=document.createElement('datalist');suggestions.id='search-suggestions-'+sec.id;i.setAttribute('list',suggestions.id);
    const seen={};
    function addSuggestion(value,label){if(!value||seen[value])return;seen[value]=true;const o=document.createElement('option');o.value=value;if(label)o.label=label;suggestions.appendChild(o);}
    try{JSON.parse(localStorage.getItem('wartab.search.history')||'[]').forEach(function(h){addSuggestion(h.query,h.engine);});}catch(error){}
    (config.pageOrder||[]).forEach(function(pageId){const page=config.pages&&config.pages[pageId];(page&&page.cards||[]).forEach(function(c){(c.sections||[]).forEach(function(s){(s.links||[]).forEach(function(link){addSuggestion(link.label,link.url);});});});});
    wr.appendChild(i);wr.appendChild(suggestions);
    w.appendChild(wr);
    const b=document.createElement('button');b.className='btn btn-glass btn-search';b.innerHTML='<i data-lucide="search"></i>';b.setAttribute('aria-label','Search');
    b.addEventListener('click',()=>doSearch(i.value,sec));i.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(i.value,sec);});
    w.appendChild(b);cw.appendChild(w);
    const en=sec.engine||config.search.selected||'Google';const t=document.createElement('button');t.type='button';t.className='search-engine-tag';t.textContent=en;t.title='Click to change search engine';
    t.addEventListener('click',function(){const names=Object.keys(config.search.engines);const next=names[(names.indexOf(sec.engine||en)+1)%names.length];sec.engine=next;t.textContent=next;saveConfig();});cw.appendChild(t);
    // Shortcut hint
    var sh = document.createElement('div');
    sh.className = 'search-hint';
    sh.textContent = 'Ctrl+L to focus · prefixes: yt: ddg: r: w:';
    cw.appendChild(sh);
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
