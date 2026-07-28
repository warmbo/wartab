registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    
    // --- Toolbar (hidden until editor focused, fades in) ---
    var tb=document.createElement('div');
    tb.className='notes-tb';
    
    function mkBtn(label,cmd,val){
      var b=document.createElement('button');
      b.textContent=label;
      b.className='notes-tool-btn';
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
    mkBtn('<>','insertHTML','<code>code</code>');
    
    cw.appendChild(tb);
    
    // --- Editor ---
    var e=document.createElement('div');
    e.className='notes-editor';
    e.contentEditable=true;
    
    // Use textContent instead of innerHTML for initial empty state
    if(sec.content){
      e.innerHTML=sec.content;
    }else{
      e.textContent='';
    }
    
    var LINE_H=13*1.6,MIN_H=Math.round(4*LINE_H),MAX_LINES=15,MAX_H=Math.round(MAX_LINES*LINE_H);

    // Use the saved height within the compact workspace bounds.
    if (sec.editorHeight) {
      e.style.height = Math.max(MIN_H,Math.min(MAX_H,sec.editorHeight)) + 'px';
    }
    cw.appendChild(e);

    // --- Resize handle (drag to set height, 4–15 lines) ---
    var rh=document.createElement('div');
    rh.className='notes-resize-handle';
    rh.title='Drag to resize (4–15 lines)';
    rh.tabIndex=0;rh.setAttribute('role','separator');rh.setAttribute('aria-orientation','horizontal');
    for(var dotIdx=0;dotIdx<3;dotIdx++){var dot=document.createElement('span');dot.className='notes-resize-dot';rh.appendChild(dot);}
    cw.appendChild(rh);

    var _drag=false,_startY=0,_startH=0;
    function onMove(ev){if(!_drag)return;var h=Math.max(MIN_H,Math.min(MAX_H,_startH+ev.clientY-_startY));e.style.height=h+'px';}
    function onUp(){if(_drag){_drag=false;document.body.style.cursor='';document.body.style.userSelect='';document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);sec.editorHeight=e.offsetHeight;saveConfig();}}
    rh.addEventListener('pointerdown',function(ev){ev.preventDefault();_drag=true;_startY=ev.clientY;_startH=e.offsetHeight;rh.setPointerCapture?.(ev.pointerId);document.body.style.cursor='ns-resize';document.body.style.userSelect='none';document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp);});
    rh.addEventListener('keydown',function(ev){if(ev.key!=='ArrowUp'&&ev.key!=='ArrowDown')return;ev.preventDefault();var delta=ev.key==='ArrowUp'?-LINE_H:LINE_H;var h=Math.max(MIN_H,Math.min(MAX_H,e.offsetHeight+delta));e.style.height=Math.round(h)+'px';sec.editorHeight=Math.round(h);saveConfig();});

    // --- Toolbar visibility toggle with fade ---
    function showToolbar(){tb.classList.add('visible');}
    function hideToolbar(){tb.classList.remove('visible');}
    var blurTimer=null,disposed=false;
    e.addEventListener('focus',showToolbar);
    e.addEventListener('blur',function(){
      // Delay hide so toolbar button clicks register before the editor blurs
      clearTimeout(blurTimer);
      blurTimer=setTimeout(function(){
        blurTimer=null;
        if(disposed)return;
        if(!tb.contains(document.activeElement))hideToolbar();
      },100);
    });
    
    // --- Bottom row: download button + character count ---
    var br=document.createElement('div');
    br.className='notes-bottom-row';
    
    // Download .md button
    var dlBtn=document.createElement('button');
    dlBtn.className='notes-download-btn';
    dlBtn.textContent='↓';
    dlBtn.title='Download .md file';
    dlBtn.setAttribute('aria-label','Download note as Markdown');
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
    cc.className='notes-char-count';
    
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
          b.classList.add('active');
        }else{
          b.classList.remove('active');
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
      if(disposed)return;
      if(d.content&&d.content!==sec.content){sec.content=d.content;e.innerHTML=d.content;updateCharCount();}
    }).catch(function(err){if(disposed)return;console.error('notes load failed:', err);toast('Note load failed','error');});
    
    // --- Cleanup ---
    WarTabLifecycle.addCleanup(cw,function(){
      disposed=true;
      if(_drag){_drag=false;document.body.style.cursor='';document.body.style.userSelect='';document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);}
      if(blurTimer){clearTimeout(blurTimer);blurTimer=null;}
      if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}
    });
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the card and type directly. Content saved to notes/'+sec.id+'.md'));
  },
});
