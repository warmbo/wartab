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
        row.innerHTML='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);">"'+escHtml(qt.q)+'" — '+escHtml(qt.a)+'</span>';
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
