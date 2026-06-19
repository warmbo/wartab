registerModule('notes', {
  defaults: { content:'' },
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;';
    const e=document.createElement('div');e.className='notes-text';
    e.style.cssText='flex:1;white-space:pre-wrap;padding:8px;min-height:100px;';e.contentEditable=true;
    e.innerHTML=sec.content||'';
    // Load from server file (async — updates after initial render)
    storage.getNote(sec.id).then(function(d){
      if(d.content&&d.content!==sec.content){sec.content=d.content;e.innerHTML=d.content;}
    }).catch(function(err){console.error('notes load failed:', err);});
    e.addEventListener('blur',function(){
      sec.content=e.innerHTML;
      saveConfig();
      // Also save to server file
      storage.saveNote(sec.id, e.innerHTML).catch(function(err){console.error('notes save failed:', err);});
    });
    // Preserve line breaks on Enter
    e.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'){e.blur();return;}
      if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();document.execCommand('insertLineBreak');}
    });
    cw.appendChild(e);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpHint('✎ Click the card and type directly. Content saved to notes/'+sec.id+'.md'));
  },
});
