registerModule('lan-scan', {
  defaults: { label:'Network Scan', refreshInterval:60 },
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    const w=document.createElement('div');w.className='lan-scan-widget';
    w.style.cssText='flex:1;display:flex;flex-direction:column;';
    w.dataset.refresh=sec.refreshInterval||60;
    const hdr=document.createElement('div');hdr.className='lan-scan-hdr';
    hdr.innerHTML='<span class="lan-scan-dot"></span><span class="lan-scan-title">LAN SCAN</span><span class="lan-scan-count"></span>';
    w.appendChild(hdr);
    const body=document.createElement('div');body.className='lan-scan-body';
    // No server-side scan endpoint exists — show an honest message instead of
    // flashing a fake "scanning..." row that never resolves.
    body.innerHTML='<div class="lan-scan-muted">LAN scan requires the self-hosted WarTab server running on your network.</div>';
    w.appendChild(body);
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Label'));
    const li=cpInput('Network Scan',sec.label||'',v=>{sec.label=v;saveConfig();});bd.appendChild(li);
    bd.appendChild(cpRange('Refresh (seconds)',sec.refreshInterval||60,10,600,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});
