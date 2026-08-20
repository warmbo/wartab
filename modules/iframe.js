registerModule('iframe', {
  defaults: { url:'', height:300 },
  settings: [
    { name:'url', label:'URL', type:'text', placeholder:'https://example.com/embed' },
    { name:'height', label:'Height (px)', type:'number', default:300, min:100, max:800, step:10 },
  ],
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.title=(sec.label||'Embedded content');ifr.style.cssText='width:100%;height:var(--iframe-height);min-height:var(--iframe-height);border:none;background:var(--card-bg-alt);';ifr.style.setProperty('--iframe-height',Math.max(100,Math.min(800,parseInt(sec.height)||300))+'px');ifr.allow='fullscreen';ifr.loading='lazy';ifr.sandbox='allow-scripts allow-same-origin allow-forms allow-popups';cw.appendChild(ifr);
  },
});
