registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    
    // --- Toolbar (hidden until editor focused, fades in) ---
    var tb=document.createElement('div');
    tb.className='notes-tb';
    tb.style.cssText='gap:4px;padding:0;border-bottom:1px solid rgba(255,255,255,0.06);margin:0;flex-wrap:wrap;display:flex;max-height:0;opacity:0;overflow:hidden;transition:max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease;';
    
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
    e.style.cssText='min-height:90px;max-height:none;overflow-y:auto;padding:8px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.06);color:var(--text-primary);font-size:var(--text-sm);line-height:1.6;outline:none;';
    
    // Use textContent instead of innerHTML for initial empty state
    if(sec.content){
      e.innerHTML=sec.content;
    }else{
      e.textContent='';
    }
    
    // Use saved editor height or default
    if (sec.editorHeight) {
      e.style.height = sec.editorHeight + 'px';
      e.style.maxHeight = 'none';
    }
    cw.appendChild(e);

    // --- Resize handle (drag to set height, 4–25 lines) ---
    var rh=document.createElement('div');
    rh.style.cssText='height:4px;cursor:ns-resize;background:rgba(255,255,255,0.06);border-radius:2px;margin:2px 0;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:3px;';
    rh.title='Drag to resize (4–25 lines)';
    rh.innerHTML='<span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.12);"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.12);"></span><span style="display:block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.12);"></span>';
    cw.appendChild(rh);

    var _drag=false,_startY=0,_startH=0;
    var LINE_H=13*1.6,MIN_H=Math.round(4*LINE_H),MAX_H=Math.round(25*LINE_H);
    function onMove(ev){if(!_drag)return;var h=Math.max(MIN_H,Math.min(MAX_H,_startH+ev.clientY-_startY));e.style.height=h+'px';e.style.maxHeight='none';}
    function onUp(){if(_drag){_drag=false;document.body.style.cursor='';document.body.style.userSelect='';document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);sec.editorHeight=e.offsetHeight;saveConfig();}}
    rh.addEventListener('mousedown',function(ev){ev.preventDefault();_drag=true;_startY=ev.clientY;_startH=e.offsetHeight;document.body.style.cursor='ns-resize';document.body.style.userSelect='none';document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);});

    // --- Toolbar visibility toggle with fade ---
    function showToolbar(){tb.style.maxHeight='40px';tb.style.opacity='1';tb.style.padding='4px 0';tb.style.margin='0 0 4px 0';}
    function hideToolbar(){tb.style.maxHeight='0';tb.style.opacity='0';tb.style.padding='0';tb.style.margin='0';}
    e.addEventListener('focus',showToolbar);
    e.addEventListener('blur',function(){
      // Delay hide so toolbar button clicks register before the editor blurs
      setTimeout(function(){
        if(!tb.contains(document.activeElement))hideToolbar();
      },100);
    });
    
    // --- Bottom row: download button + character count ---
    var br=document.createElement('div');
    br.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:4px 0;';
    
    // Download .md button
    var dlBtn=document.createElement('button');
    dlBtn.innerHTML='&#x2193;';
    dlBtn.title='Download .md file';
    dlBtn.style.cssText='padding:2px 8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text-secondary);cursor:pointer;border-radius:3px;font-size:var(--text-xs);line-height:1;';
    dlBtn.addEventListener('click',function(){
      var content=e.innerHTML;
      var plain=e.textContent||'';
      var blob=new Blob([content],{type:'text/markdown'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url;
      a.download=(sec.label||card.title||'note')+'.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    br.appendChild(dlBtn);
    
    // Character count
    var cc=document.createElement('div');
    cc.style.cssText='font-size:var(--text-xs);color:var(--text-secondary);opacity:0.6;';
    
    function updateCharCount(){
      var txt=e.textContent||'';
      cc.textContent=txt.length+' chars';
    }
    updateCharCount();
    br.appendChild(cc);
    cw.appendChild(br);

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
      if(_drag){_drag=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);}
      if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}
    };
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the card and type directly. Content saved to notes/'+sec.id+'.md'));
  },
});
