registerModule('iframe', {
  defaults: { url:'', height:300 },
  settings: [
    { name:'url', label:'URL', type:'text', placeholder:'https://example.com/embed' },
    { name:'height', label:'Height (px)', type:'number', default:300, min:100, max:800, step:10 },
  ],
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;width:100%;min-width:0;';
    const configure={label:'Configure',onClick:()=>openCardEditPanel(card.id)};
    if(!String(sec.url||'').trim()){cw.appendChild(ds.empty('frame','No URL configured','Add an embed URL in the card editor.',configure));return;}
    let url;
    try{url=new URL(sec.url,document.baseURI);if(!['http:','https:'].includes(url.protocol))throw new Error('scheme');}
    catch(error){cw.appendChild(ds.error('Invalid embed URL','Use an HTTP(S) address or a relative dashboard path.',configure));return;}
    const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=url.href;ifr.title=sec.label||'Embedded content';
    ifr.style.cssText='width:100%;height:var(--iframe-height);min-height:var(--iframe-height);border:none;background:var(--card-bg-alt);';
    ifr.style.setProperty('--iframe-height',Math.max(100,Math.min(800,parseInt(sec.height)||300))+'px');
    // allow-same-origin is required for cookie/localStorage-backed dashboards, but it
    // also lets a same-origin embed drop its own sandbox. Third-party LAN dashboards
    // here are cross-origin; remove it if only cross-origin embeds are ever used.
    ifr.allow='fullscreen';ifr.loading='lazy';ifr.referrerPolicy='no-referrer';ifr.sandbox='allow-scripts allow-same-origin allow-forms allow-popups';cw.appendChild(ifr);
    // Browsers do not reliably expose X-Frame-Options/CSP rejection to the parent.
    const fallback=document.createElement('a');fallback.className='iframe-fallback';fallback.href=url.href;fallback.target='_blank';fallback.rel='noopener noreferrer';
    fallback.textContent='Open separately ↗';fallback.title='Open '+ifr.title+' if the site blocks embedding';cw.appendChild(fallback);
  },
});
