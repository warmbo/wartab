registerModule('search', {
  defaults: { placeholder:'Search...', engine:'Google' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='display:flex;gap:4px;align-items:stretch;justify-content:var(--mod-justify,flex-start);';
    const wr=document.createElement('div');wr.className='inline-search-wrap';wr.innerHTML='<span class="search-icon"><i data-lucide="search"></i></span>';
    const i=document.createElement('input');i.type='text';i.placeholder=sec.placeholder||'Search...';wr.appendChild(i);
    w.appendChild(wr);
    const b=document.createElement('button');b.className='btn btn-glass btn-search';b.innerHTML='<i data-lucide="search"></i>';
    b.addEventListener('click',()=>doSearch(i.value,sec));i.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(i.value,sec);});
    w.appendChild(b);cw.appendChild(w);
    const en=sec.engine||config.search.selected||'Google';const t=document.createElement('div');t.className='search-engine-tag';t.textContent=en;cw.appendChild(t);
    // Shortcut hint
    var sh = document.createElement('div');
    sh.className = 'search-hint';
    sh.textContent = 'Ctrl+K to focus';
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
