registerModule('image', {
  defaults: { url:'', alt:'' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='padding:4px 0;';
    if(!sec.url){w.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:20px;">No image selected. Edit to add one.</div>';}
    else{
      const img=document.createElement('img');img.src=sec.url;img.alt=sec.alt||'';
      img.style.cssText='max-width:100%;height:auto;display:block;border-radius:4px;';
      img.loading='lazy';
      w.appendChild(img);
    }
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Image URL'));
    bd.appendChild(cpInput('Paste image URL or /uploads/...',sec.url||'',v=>{sec.url=v;saveAndRefresh();}));
    bd.appendChild(cpLabel('Alt text'));
    bd.appendChild(cpInput('Description',sec.alt||'',v=>{sec.alt=v;saveAndRefresh();}));
    bd.appendChild(cpHint('Upload images in the config panel > Background, then paste the URL here.'));
  },
});
