registerModule('iframe', {
  defaults: { url:'', height:300 },
  render: (sec,card,cw)=>{
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.height=(sec.height||300)+'px';ifr.allow='fullscreen';ifr.loading='lazy';cw.appendChild(ifr);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('URL'));
    const ui=cpInput('https://example.com/embed',sec.url||'',v=>{sec.url=v;saveAndRefresh();});bd.appendChild(ui);
    bd.appendChild(cpRange('Height (px)',sec.height||300,100,800,v=>{sec.height=parseInt(v);saveAndRefresh();}));
  },
});
