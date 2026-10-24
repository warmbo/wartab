// One native form for both the dashboard and the editor preview.
function createSearchForm(sec){
  const form=document.createElement('form');form.className='search-widget';form.setAttribute('role','search');form.setAttribute('aria-label','Web search');
  const wrap=document.createElement('div');wrap.className='inline-search-wrap';wrap.innerHTML='<span class="search-icon" aria-hidden="true"><i data-lucide="search"></i></span>';
  const input=document.createElement('input');input.type='search';input.placeholder=sec.placeholder||'Search…';input.setAttribute('aria-label','Search query');
  input.setAttribute('autocomplete','off');input.setAttribute('autocapitalize','off');input.setAttribute('spellcheck','false');input.setAttribute('enterkeyhint','search');wrap.appendChild(input);
  const button=document.createElement('button');button.type='submit';button.className='btn btn-glass btn-search';button.innerHTML='<i data-lucide="search"></i>';button.setAttribute('aria-label','Search');
  form.append(wrap,button);form.addEventListener('submit',event=>{event.preventDefault();doSearch(input.value,sec);});
  return {form,input,wrap};
}

registerModule('search', {
  defaults: { placeholder:'Search...', engine:'Google' },
  render: (sec,card,cw)=>{
    const {form:w,input:i,wrap:wr}=createSearchForm(sec);
    // A stable id keeps the datalist unique when a card has no id (two id-less
    // search cards would otherwise share one list id and merge suggestions).
    const listId='search-suggestions-'+(sec.id||('c'+Math.random().toString(36).slice(2)));
    const suggestions=document.createElement('datalist');suggestions.id=listId;i.setAttribute('list',listId);
    const seen={};
    function addSuggestion(value,label){if(!value||seen[value])return;seen[value]=true;const o=document.createElement('option');o.value=value;if(label)o.label=label;suggestions.appendChild(o);}
    try{JSON.parse(localStorage.getItem('wartab.search.history')||'[]').forEach(function(h){addSuggestion(h.query,h.engine);});}catch(error){}
    (config.pageOrder||[]).forEach(function(pageId){const page=config.pages&&config.pages[pageId];(page&&page.cards||[]).forEach(function(c){(c.sections||[]).forEach(function(s){(s.links||[]).forEach(function(link){addSuggestion(link.label,link.url);});});});});
    wr.appendChild(suggestions);cw.appendChild(w);
    const engines=(config.search&&config.search.engines)||{};
    const en=sec.engine||(config.search&&config.search.selected)||'Google';
    const t=document.createElement('button');t.type='button';t.className='search-engine-tag';t.textContent=en;t.title='Click to change search engine';
    t.setAttribute('aria-label','Search engine: '+en+'. Activate to switch.');
    t.addEventListener('click',function(){
      const names=Object.keys(engines);
      if(!names.length)return;
      const next=names[(names.indexOf(sec.engine||en)+1)%names.length];
      sec.engine=next;t.textContent=next;t.setAttribute('aria-label','Search engine: '+next+'. Activate to switch.');saveConfig();
    });cw.appendChild(t);
    // Shortcut hint
    var sh = document.createElement('div');
    sh.className = 'search-hint';
    sh.textContent = 'Search prefixes: yt: ddg: r: w:';
    cw.appendChild(sh);
  },
  editor: (sec,card,bd)=>{
    const {form}=createSearchForm(sec);form.classList.add('search-preview');bd.appendChild(form);
    const editorId=Math.random().toString(36).slice(2);
    const placeholderLabel=cpLabel('Placeholder text');bd.appendChild(placeholderLabel);
    const pi=document.createElement('input');pi.id='search-placeholder-'+editorId;placeholderLabel.htmlFor=pi.id;pi.className='cp-input';pi.placeholder='Search...';pi.value=sec.placeholder||'Search...';
    pi.addEventListener('change',()=>{sec.placeholder=pi.value;saveAndRefresh();});bd.appendChild(pi);
    const engineLabel=cpLabel('Search Engine');bd.appendChild(engineLabel);
    const esel=cpSelect(Object.keys((config.search&&config.search.engines)||{}).map(en=>({value:en,label:en})),sec.engine||(config.search&&config.search.selected)||'Google',v=>{sec.engine=v;saveAndRefresh();});
    esel.id='search-engine-'+editorId;engineLabel.htmlFor=esel.id;bd.appendChild(esel);
  },
});
