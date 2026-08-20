registerModule('quotes', {
  defaults: { quotes:[], rotationMode:'sequential' },
  render: (sec,card,cw)=>{
    const q=document.createElement('div');q.className='quotes-widget';
    q.tabIndex=0;q.setAttribute('role','button');q.setAttribute('aria-label','Show next quote');
    const txt=document.createElement('div');txt.className='quotes-text';
    const qm=document.createElement('span');qm.className='quotes-mark';qm.textContent='\u201c';txt.appendChild(qm);
    const cont=document.createElement('span');cont.className='quotes-content';cont.textContent=(sec.quotes&&sec.quotes.length)?'…':(sec.quotes&&sec.quotes.length===0?'Add quotes in settings':'Click to load');
    q.addEventListener('click',function(){fetchQuote(q,sec);});
    q.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fetchQuote(q,sec);}});
    txt.appendChild(cont);
    q.appendChild(txt);
    const auth=document.createElement('div');auth.className='quotes-author';

    const aName=document.createElement('span');aName.className='quotes-author-name';aName.textContent='';auth.appendChild(aName);
    q.appendChild(auth);
    // Hint: click to cycle (fades in on hover)
    var hint = document.createElement('div');
    hint.className = 'quotes-hint';
    hint.textContent = 'Click to cycle';
    q.appendChild(hint);
    cw.appendChild(q);
    WarTabLifecycle.setTimeout(cw,function(){fetchQuote(q,sec);},100);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('\u270e Click the quote text to refresh. Daily mode holds one quote until tomorrow.'));
    bd.appendChild(cpLabel('Rotation'));
    bd.appendChild(cpSelect([
      {value:'sequential',label:'Sequential'},
      {value:'shuffle',label:'Shuffle'},
      {value:'daily',label:'Daily quote'}
    ],sec.rotationMode||'sequential',function(v){sec.rotationMode=v;sec._qi=undefined;saveAndRefresh();}));
    // User-added quotes
    bd.appendChild(cpLabel('Custom Quotes'));
    const list=document.createElement('div');list.style.cssText='margin-bottom:10px;';
    var _editingIdx=-1;
    const renderQuotes=()=>{
      list.innerHTML='';
      (sec.quotes||[]).forEach((qt,i)=>{
        const card=document.createElement('div');
        card.style.cssText='background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.06);padding:10px 12px;margin-bottom:8px;border-left:2px solid var(--accent);';
        const qText=document.createElement('div');
        qText.style.cssText='font-size:var(--text-xs);line-height:1.5;color:var(--text-primary);margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;';
        qText.textContent='\u201c'+qt.q+'\u201d';
        const aText=document.createElement('div');
        aText.style.cssText='font-size:var(--text-2xs);color:var(--text-secondary);font-style:italic;';
        aText.textContent='\u2014 '+qt.a;
        card.appendChild(qText);card.appendChild(aText);
        // Actions
        const acts=document.createElement('div');acts.style.cssText='display:flex;gap:4px;margin-top:6px;';
        const edBtn=document.createElement('button');edBtn.className='btn btn-glass btn-sm';edBtn.textContent='Edit';
        edBtn.style.cssText='padding:2px 8px;font-size:var(--text-2xs);';
        edBtn.addEventListener('click',()=>{
          _editingIdx=i;
          qTa.value=qt.q;aInp.value=qt.a;
          addBtn.textContent='Update';
          qTa.focus();
        });
        acts.appendChild(edBtn);
        const rmBtn=document.createElement('button');rmBtn.className='btn btn-glass btn-sm';rmBtn.textContent='\u2715';
        rmBtn.style.cssText='padding:2px 8px;font-size:var(--text-2xs);';
        rmBtn.addEventListener('click',()=>{sec.quotes.splice(i,1);_editingIdx=-1;addBtn.textContent='+ Add';qTa.value='';aInp.value='';renderQuotes();saveAndRefresh();});
        acts.appendChild(rmBtn);
        card.appendChild(acts);
        list.appendChild(card);
      });
    };
    renderQuotes();
    bd.appendChild(list);
    // Add / Edit quote form
    bd.appendChild(cpLabel('Add / Edit Quote'));
    const form=document.createElement('div');
    form.style.cssText='display:flex;flex-direction:column;gap:6px;margin-bottom:6px;';
    const qTa=document.createElement('textarea');qTa.className='cp-input';
    qTa.placeholder='Quote text';qTa.style.cssText='flex:1;min-height:60px;resize:vertical;padding:8px 10px;font-size:var(--text-sm);';
    const aInp=document.createElement('input');aInp.className='cp-input';
    aInp.placeholder='Author';aInp.style.cssText='flex:1;padding:8px 10px;font-size:var(--text-sm);';
    const addRow=document.createElement('div');addRow.style.cssText='display:flex;gap:4px;';
    const addBtn=document.createElement('button');addBtn.className='btn btn-glass btn-sm';addBtn.textContent='+ Add';
    addBtn.style.cssText='padding:6px 16px;';
    const cancelBtn=document.createElement('button');cancelBtn.className='btn btn-glass btn-sm';cancelBtn.textContent='Cancel';
    cancelBtn.style.cssText='padding:6px 16px;display:none;';
    const commit=()=>{
      const t=qTa.value.trim(),au=aInp.value.trim()||'Anonymous';
      if(!t)return;
      if(_editingIdx>=0){
        sec.quotes[_editingIdx]={q:t,a:au};
        _editingIdx=-1;
      }else{
        sec.quotes=sec.quotes||[];sec.quotes.push({q:t,a:au});
      }
      qTa.value='';aInp.value='';addBtn.textContent='+ Add';cancelBtn.style.display='none';
      renderQuotes();saveAndRefresh();
    };
    addBtn.addEventListener('click',commit);
    cancelBtn.addEventListener('click',()=>{_editingIdx=-1;qTa.value='';aInp.value='';addBtn.textContent='+ Add';cancelBtn.style.display='none';renderQuotes();});
    qTa.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.shiftKey){e.preventDefault();commit();}});
    addRow.appendChild(addBtn);addRow.appendChild(cancelBtn);
    form.appendChild(qTa);form.appendChild(aInp);form.appendChild(addRow);
    bd.appendChild(form);
  },
});
