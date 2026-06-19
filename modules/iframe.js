registerModule('iframe', {
  defaults: { url:'', height:300 },
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;width:100%;';
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.cssText='flex:1;width:100%;border:none;background:var(--card-bg-alt);';ifr.allow='fullscreen';ifr.loading='lazy';ifr.sandbox='allow-scripts allow-same-origin allow-forms allow-popups';cw.appendChild(ifr);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('URL'));
    const ui=cpInput('https://example.com/embed',sec.url||'',v=>{sec.url=v;saveAndRefresh();});bd.appendChild(ui);
    bd.appendChild(cpRange('Height (px)',sec.height||300,100,800,v=>{sec.height=parseInt(v);saveAndRefresh();}));
  },
});
