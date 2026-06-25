registerModule('iframe', {
  defaults: { url:'', height:300 },
  settings: [
    { name:'url', label:'URL', type:'text', placeholder:'https://example.com/embed' },
    { name:'height', label:'Height (px)', type:'number', default:300, min:100, max:800, step:10 },
  ],
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.cssText='flex:1;width:100%;border:none;background:var(--card-bg-alt);';ifr.allow='fullscreen';ifr.loading='lazy';ifr.sandbox='allow-scripts allow-same-origin allow-forms allow-popups';cw.appendChild(ifr);
  },
});
