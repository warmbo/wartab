registerModule('lan-scan', {
  defaults: { label:'Network Scan', refreshInterval:60 },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='lan-scan-widget';w.dataset.refresh=sec.refreshInterval||60;
    const hdr=document.createElement('div');hdr.className='lan-scan-hdr';
    const title=document.createElement('span');title.className='lan-scan-title';title.textContent=sec.label||'Network Scan';hdr.appendChild(title);
    const count=document.createElement('span');count.className='lan-scan-count';hdr.appendChild(count);w.appendChild(hdr);
    const body=document.createElement('div');body.className='lan-scan-body';
    const hint=document.createElement('p');hint.className='lan-scan-muted';hint.textContent='Discover neighbours from the self-hosted WarTab server. Scanning sends a few local pings; it is not a complete subnet inventory.';body.appendChild(hint);
    const button=document.createElement('button');button.type='button';button.className='btn btn-glass btn-sm';button.textContent='Scan network';
    let disposed=false;
    if(window.WarTabLifecycle)WarTabLifecycle.addCleanup(cw,()=>{disposed=true;});
    // ponytail: explicit scans only; never probe a LAN just by opening a dashboard.
    button.onclick=async()=>{
      if(button.disabled||disposed)return;button.disabled=true;button.textContent='Scanning…';
      try{
        const data=await WarTabHttp.request('/api/arp');if(disposed)return;
        if(!data||!Array.isArray(data.devices))throw new Error('No device list returned');
        count.textContent=data.devices.length+' discovered';body.replaceChildren();
        if(!data.devices.length){body.appendChild(ds.empty('network','No neighbours found','The server ARP table has no discovered devices.'));}
        data.devices.forEach(device=>{
          const row=document.createElement('div');row.className='lan-scan-line';
          const name=document.createElement('strong');name.textContent=device.hostname||device.ip||'Unknown device';row.appendChild(name);
          const detail=document.createElement('span');detail.className='lan-scan-muted';detail.textContent=[device.ip,device.mac,device.vendor].filter(Boolean).join(' · ');row.appendChild(detail);body.appendChild(row);
        });
      }catch(error){if(!disposed)body.replaceChildren(ds.error('Discovery unavailable','Check the self-hosted server connection and try again.'));}
      finally{if(!disposed){button.disabled=false;button.textContent='Scan again';}}
    };
    w.appendChild(body);w.appendChild(button);cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Label'));
    bd.appendChild(cpInput('Network Scan',sec.label||'',v=>{sec.label=v;saveConfig();}));
    bd.appendChild(cpHint('Scans run only when you choose Scan network. No automatic network probing.'));
  },
});
