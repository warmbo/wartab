registerModule('resource-monitor', {
  defaults: { source:'local', glancesUrl:'http://localhost:61209', refreshInterval:15 },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='resource-monitor';
    w.style.cssText='display:flex;flex-direction:column;gap:10px;padding:4px 0;';
    w.dataset.refresh=sec.refreshInterval||15;
    w.dataset.source=sec.source||'local';w.dataset.glancesUrl=sec.glancesUrl||'';
    const bars=[
      {key:'cpu',label:'CPU'},
      {key:'ram',label:'RAM'},
      {key:'disk',label:'Storage'},
      {key:'net',label:'Network'}
    ];
    bars.forEach(b=>{
      const row=document.createElement('div');row.style.cssText='display:flex;flex-direction:column;gap:2px;';
      const labelRow=document.createElement('div');labelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
      const lbl=document.createElement('span');lbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent=b.label;
      const val=document.createElement('span');val.className='rm-val-'+b.key;val.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;';
      val.textContent='--';
      labelRow.appendChild(lbl);labelRow.appendChild(val);row.appendChild(labelRow);
      const track=document.createElement('div');track.style.cssText='height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;';
      const fill=document.createElement('div');fill.className='rm-fill-'+b.key;
      fill.style.cssText='height:100%;width:0%;background:var(--accent);border-radius:3px;transition:width 0.4s ease;';
      track.appendChild(fill);row.appendChild(track);w.appendChild(row);
    });
    const sysRow=document.createElement('div');sysRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:2px;';
    const hostEl=document.createElement('span');hostEl.className='rm-host';
    const tsEl=document.createElement('span');tsEl.className='rm-ts';
    sysRow.appendChild(hostEl);sysRow.appendChild(tsEl);
    w.appendChild(sysRow);
    cw.appendChild(w);
    function fetchData(){
      var url=sec.source==='glances'?(sec.glancesUrl||'http://localhost:61209')+'/api/4':'/api/stats';
      storage.getStats(sec.source, sec.glancesUrl).then(function(d){
        if(!d)return;
        var cpuPct,mem,disks,net,hostname,uptime;
        if(sec.source==='glances'){
          cpuPct=typeof d.cpu==='object'?parseFloat(d.cpu.total||0):0;
          mem=d.mem||{};
          disks=(d.fs||[]).filter(function(f){return f.mnt_point==='/'||f.mount==='/';});
          var root=disks[0]||{};
          net=d.network_bit||{};
          hostname=d.hostname||'';
          uptime={string:Math.floor((d.uptime||0)/3600)+'h'};
        }else{
          cpuPct=typeof d.cpu==='number'?d.cpu:0;
          mem=d.memory||{};
          disks=d.disks||[];
          var root=disks.find(function(d2){return d2.mount==='/';})||disks[0]||{};
          net=d.network||{};
          hostname=d.hostname||'';
          uptime=d.uptime||{};
        }
        w.querySelector('.rm-fill-cpu').style.width=Math.min(cpuPct,100)+'%';
        w.querySelector('.rm-val-cpu').textContent=(cpuPct||0).toFixed(1)+'%';
        var memPct=typeof mem.percent==='number'?mem.percent:0;
        w.querySelector('.rm-fill-ram').style.width=Math.min(memPct,100)+'%';
        var memUsed=mem.used?Math.round(mem.used/1024/1024/1024*10)/10:0;
        var memTotal=mem.total?Math.round(mem.total/1024/1024/1024*10)/10:0;
        w.querySelector('.rm-val-ram').textContent=memUsed+'/'+memTotal+'GB';
        var diskPct=typeof root.percent==='number'?root.percent:0;
        w.querySelector('.rm-fill-disk').style.width=Math.min(diskPct,100)+'%';
        var diskUsed=root.used?Math.round(root.used/1024/1024/1024*10)/10:0;
        var diskTotal=root.total?Math.round(root.total/1024/1024/1024*10)/10:0;
        w.querySelector('.rm-val-disk').textContent=diskUsed+'/'+diskTotal+'GB';
        var rx=0,tx=0;
        if(sec.source==='glances'){
          var firstIface=Object.keys(net)[0];
          if(firstIface){rx=(net[firstIface].rx||0);tx=(net[firstIface].tx||0);}
        }else{rx=net.rx_bytes||0;tx=net.tx_bytes||0;}
        var rxGb=Math.round(rx/1024/1024/1024*100)/100;
        var txGb=Math.round(tx/1024/1024/1024*100)/100;
        w.querySelector('.rm-fill-net').style.width='0%';
        w.querySelector('.rm-val-net').textContent='▼'+rxGb+'GB ▲'+txGb+'GB';
        w.querySelector('.rm-host').textContent=hostname;
        w.querySelector('.rm-ts').textContent='↑ '+(uptime.string||'');
      }).catch(function(){});
    }
    fetchData();
    setInterval(fetchData,(sec.refreshInterval||15)*1000);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Data Source'));
    bd.appendChild(cpSelect([{value:'local',label:'Local (/api/stats)'},{value:'glances',label:'Glances API'}],sec.source||'local',function(v){sec.source=v;saveAndRefresh();}));
    var urlWrap=document.createElement('div');urlWrap.id='rm-url-'+sec.id;
    function renderUrl(){
      urlWrap.innerHTML='';
      if(sec.source==='glances'){urlWrap.appendChild(cpLabel('Glances URL'));urlWrap.appendChild(cpInput('http://localhost:61209',sec.glancesUrl||'',function(v){sec.glancesUrl=v;saveConfig();}));}
    }
    renderUrl();
    var sel=bd.querySelector('select');if(sel)sel.addEventListener('change',function(){setTimeout(renderUrl,0);});
    bd.appendChild(urlWrap);
    bd.appendChild(cpRange('Refresh (seconds)',sec.refreshInterval||15,5,120,function(v){sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});
