registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;width:100%;';
    
    // --- Toolbar ---
    var tb=document.createElement('div');
    tb.style.cssText='display:flex;gap:4px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px;flex-wrap:wrap;';
    
    function mkBtn(label,cmd,val){
      var b=document.createElement('button');
      b.textContent=label;
      b.style.cssText='padding:2px 8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text-primary);cursor:pointer;border-radius:3px;font-size:var(--text-xs);';
      b.addEventListener('mousedown',function(ev){ev.preventDefault();});
      b.addEventListener('click',function(){
        e.focus();
        document.execCommand(cmd,false,val||null);
        updateActiveStates();
      });
      tb.appendChild(b);
      return b;
    }
    
    mkBtn('B','bold');
    mkBtn('I','italic');
    mkBtn('H','formatBlock','h3');
    mkBtn('ul','insertUnorderedList');
    mkBtn('<>','insertHTML','<code style="background:rgba(255,255,255,0.08);padding:2px 4px;border-radius:3px;font-family:monospace;">code</code>');
    
    cw.appendChild(tb);
    
    // --- Editor ---
    var e=document.createElement('div');
    e.className='notes-editor';
    e.contentEditable=true;
    e.style.cssText='min-height:100px;max-height:32em;overflow-y:auto;padding:8px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.06);color:var(--text-primary);font-size:var(--text-sm);line-height:1.6;outline:none;';
    
    // Use textContent instead of innerHTML for initial empty state
    if(sec.content){
      e.innerHTML=sec.content;
    }else{
      e.textContent='';
    }
    
    cw.appendChild(e);
    
    // --- Character count ---
    var cc=document.createElement('div');
    cc.style.cssText='text-align:right;font-size:var(--text-xs);color:var(--text-secondary);padding:4px 0;opacity:0.6;';
    
    function updateCharCount(){
      var txt=e.textContent||'';
      cc.textContent=txt.length+' chars';
    }
    updateCharCount();
    cw.appendChild(cc);

    // --- Autosave with debounce ---
    var autosaveTimer=null;
    
    function doSave(){
      sec.content=e.innerHTML;
      saveConfig();
      storage.saveNote(sec.id, e.innerHTML).catch(function(err){console.error('notes save failed:', err); toast('Note save failed','error');});
    }
    
    function debounceSave(){
      if(autosaveTimer)clearTimeout(autosaveTimer);
      autosaveTimer=setTimeout(function(){
        autosaveTimer=null;
        doSave();
      },300);
    }
    
    // --- Toolbar active state tracking ---
    function updateActiveStates(){
      var btns=tb.querySelectorAll('button');
      btns.forEach(function(b){
        var cmd=null;
        if(b.textContent==='B')cmd='bold';
        else if(b.textContent==='I')cmd='italic';
        else if(b.textContent==='ul')cmd='insertUnorderedList';
        if(cmd&&document.queryCommandState(cmd)){
          b.style.background='rgba(255,255,255,0.2)';
          b.style.borderColor='rgba(255,255,255,0.3)';
        }else{
          b.style.background='rgba(255,255,255,0.05)';
          b.style.borderColor='rgba(255,255,255,0.1)';
        }
      });
    }
    
    // --- Event listeners ---
    e.addEventListener('input',function(){
      updateCharCount();
      debounceSave();
    });
    
    // Preserve line breaks on Enter
    e.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'){e.blur();return;}
      if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();document.execCommand('insertLineBreak');}
    });
    
    e.addEventListener('mouseup',updateActiveStates);
    e.addEventListener('keyup',updateActiveStates);
    
    // --- Load saved content from storage ---
    storage.getNote(sec.id).then(function(d){
      if(d.content&&d.content!==sec.content){sec.content=d.content;e.innerHTML=d.content;updateCharCount();}
    }).catch(function(err){console.error('notes load failed:', err); toast('Note load failed','error');});
    
    // --- Cleanup ---
    card._cleanup=function(){
      if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}
    };
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the card and type directly. Content saved to notes/'+sec.id+'.md'));
  },
});
