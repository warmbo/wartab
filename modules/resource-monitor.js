/* ═══════════════════════════════════════════
   WarTab — Resource Monitor Module
   CPU, RAM, Disk, GPU, Network speed
   Bar view or SVG line graph view
   ═══════════════════════════════════════════ */
registerModule('resource-monitor', {
  defaults: { source:'local', glancesUrl:'http://localhost:61209', refreshInterval:15, graphMode:false },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='resource-monitor';
    w.style.cssText='display:flex;flex-direction:column;gap:8px;padding:4px 0;';
    w.dataset.refresh=sec.refreshInterval||15;
    w.dataset.source=sec.source||'local';w.dataset.glancesUrl=sec.glancesUrl||'';
    w.dataset.graphMode=sec.graphMode?'1':'0';
    // Graph history (30 data points per metric)
    var hist={},GRAPH_PTS=30;
    ['cpu','ram','disk','gpu'].forEach(function(k){hist[k]=[];});
    // Network speed tracking
    var _prevRx=0,_prevTx=0,_prevTs=0;
    var metrics=['cpu','ram','disk','gpu'];
    function buildMetricRow(key,label){
      const row=document.createElement('div');row.style.cssText='display:flex;flex-direction:column;gap:2px;';
      const labelRow=document.createElement('div');labelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
      const lbl=document.createElement('span');lbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent=label;
      const val=document.createElement('span');val.className='rm-val-'+key;val.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;';
      val.textContent='--';
      labelRow.appendChild(lbl);labelRow.appendChild(val);row.appendChild(labelRow);
      // Bar track
      const track=document.createElement('div');track.className='rm-track-'+key;
      track.style.cssText='height:6px;background:rgba(255,255,255,0.06);overflow:hidden;position:relative;';
      const fill=document.createElement('div');fill.className='rm-fill-'+key;
      fill.style.cssText='height:100%;width:0%;background:var(--accent);transition:width 0.4s ease;';
      track.appendChild(fill);
      // Graph SVG (hidden by default)
      var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','rm-graph-'+key);
      svg.style.cssText='display:none;width:100%;height:32px;background:rgba(0,0,0,0.1);';
      svg.setAttribute('viewBox','0 0 '+GRAPH_PTS+' 100');
      svg.setAttribute('preserveAspectRatio','none');
      var polyline=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      polyline.style.cssText='fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;';
      polyline.setAttribute('points','');
      svg.appendChild(polyline);
      row.appendChild(track);row.appendChild(svg);
      return {row:row,fill:fill,val:val,svg:svg,pline:polyline,track:track};
    }
    // Build metric rows
    var rows={};
    metrics.forEach(function(m){
      var labels={cpu:'CPU',ram:'RAM',disk:'DISK',gpu:'GPU'};
      rows[m]=buildMetricRow(m,labels[m]);
      w.appendChild(rows[m].row);
    });
    // Network row (special — shows speed, no bar/graph switch)
    const netRow=document.createElement('div');netRow.style.cssText='display:flex;flex-direction:column;gap:2px;';
    const netLabelRow=document.createElement('div');netLabelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
    const netLbl=document.createElement('span');netLbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
    netLbl.textContent='NET';
    const netVal=document.createElement('span');netVal.className='rm-val-net';netVal.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;font-size:var(--text-2xs);';
    netVal.textContent='--';
    netLabelRow.appendChild(netLbl);netLabelRow.appendChild(netVal);netRow.appendChild(netLabelRow);
    // Network speed sub-row (down / up)
    const netSpeedRow=document.createElement('div');netSpeedRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:-1px;';
    const rxEl=document.createElement('span');rxEl.className='rm-rx';
    const txEl=document.createElement('span');txEl.className='rm-tx';
    netSpeedRow.appendChild(rxEl);netSpeedRow.appendChild(txEl);netRow.appendChild(netSpeedRow);
    w.appendChild(netRow);
    // System info row
    const sysRow=document.createElement('div');sysRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:2px;';
    const hostEl=document.createElement('span');hostEl.className='rm-host';
    const tsEl=document.createElement('span');tsEl.className='rm-ts';
    sysRow.appendChild(hostEl);sysRow.appendChild(tsEl);
    w.appendChild(sysRow);
    cw.appendChild(w);
    // Toggle graph/bar mode
    function setGraphMode(enabled){
      w.dataset.graphMode=enabled?'1':'0';
      metrics.forEach(function(key){
        var r=rows[key];
        if(enabled){
          r.track.style.display='none';r.svg.style.display='block';
        }else{
          r.track.style.display='';r.svg.style.display='none';
        }
      });
    }
    setGraphMode(sec.graphMode);
    // Format bytes to human-readable
    function fmtBytes(b){if(b<1024)return b.toFixed(0)+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}
    function fmtSpeed(bps){if(bps<1024)return bps.toFixed(0)+'B/s';if(bps<1048576)return(bps/1024).toFixed(1)+'KB/s';return(bps/1048576).toFixed(1)+'MB/s';}
    // Update SVG graph with new value
    function pushGraph(key,val){
      var h=hist[key];if(!h)return;
      h.push(val);
      if(h.length>GRAPH_PTS)h.shift();
      var r=rows[key];
      if(!r||r.svg.style.display==='none')return;
      var pts=h.map(function(v,i){return i+','+(100-Math.min(v,100));}).join(' ');
      r.pline.setAttribute('points',pts);
    }
    // Fetch data
    function fetchData(){
      var url=sec.source==='glances'?(sec.glancesUrl||'http://localhost:61209')+'/api/4':'/api/stats';
      storage.getStats(sec.source, sec.glancesUrl).then(function(d){
        if(!d)return;
        var cpuPct,mem,disks,net,hostname,uptime,gpu;
        if(sec.source==='glances'){
          cpuPct=typeof d.cpu==='object'?parseFloat(d.cpu.total||0):0;
          mem=d.mem||{};disks=(d.fs||[]).filter(function(f){return f.mnt_point==='/'||f.mount==='/';});
          var root=disks[0]||{};net=d.network_bit||{};hostname=d.hostname||'';
          uptime={string:Math.floor((d.uptime||0)/3600)+'h'};
          gpu={percent:0,vram_total:0,vram_used:0,temp_c:0};
        }else{
          cpuPct=typeof d.cpu==='number'?d.cpu:0;
          mem=d.memory||{};disks=d.disks||[];
          var root=disks.find(function(d2){return d2.mount==='/';})||disks[0]||{};
          net=d.network||{};hostname=d.hostname||'';uptime=d.uptime||{};
          gpu=d.gpu||{percent:0,vram_total:0,vram_used:0,temp_c:0};
        }
        if(!w.parentNode)return; // detached from DOM
        // CPU
        var cpuVal=Math.min(cpuPct,100);
        rows.cpu.fill.style.width=cpuVal+'%';
        rows.cpu.val.textContent=(cpuPct||0).toFixed(1)+'%';
        pushGraph('cpu',cpuVal);
        // RAM
        var memPct=typeof mem.percent==='number'?mem.percent:0;
        rows.ram.fill.style.width=Math.min(memPct,100)+'%';
        var memUsed=mem.used?Math.round(mem.used/1024/1024/1024*10)/10:0;
        var memTotal=mem.total?Math.round(mem.total/1024/1024/1024*10)/10:0;
        rows.ram.val.textContent=memUsed+'/'+memTotal+'GB';
        pushGraph('ram',memPct);
        // Disk
        var diskPct=typeof root.percent==='number'?root.percent:0;
        rows.disk.fill.style.width=Math.min(diskPct,100)+'%';
        var diskUsed=root.used?Math.round(root.used/1024/1024/1024*10)/10:0;
        var diskTotal=root.total?Math.round(root.total/1024/1024/1024*10)/10:0;
        rows.disk.val.textContent=diskUsed+'/'+diskTotal+'GB';
        pushGraph('disk',diskPct);
        // GPU
        var gpuPct=typeof gpu.percent==='number'?gpu.percent:0;
        rows.gpu.fill.style.width=Math.min(gpuPct,100)+'%';
        var vramUsed=gpu.vram_used?Math.round(gpu.vram_used/1024/1024):0;
        var vramTotal=gpu.vram_total?Math.round(gpu.vram_total/1024/1024):0;
        rows.gpu.val.textContent=vramUsed+'/'+vramTotal+'MB  '+gpu.temp_c+'°C';
        pushGraph('gpu',gpuPct);
        // Network — calculate speed from delta
        var rx=net.rx_bytes||0,tx=net.tx_bytes||0;
        var now=Date.now()/1000;
        if(_prevTs>0){
          var dt=now-_prevTs;
          if(dt>0){
            var rxSpeed=Math.max(0,(rx-_prevRx))/dt;
            var txSpeed=Math.max(0,(tx-_prevTx))/dt;
            netVal.textContent=fmtSpeed(rxSpeed)+' / '+fmtSpeed(txSpeed);
            rxEl.textContent='▼ '+fmtBytes(rx);
            txEl.textContent='▲ '+fmtBytes(tx);
          }
        }else{
          netVal.textContent=fmtBytes(rx)+' / '+fmtBytes(tx);
          rxEl.textContent='▼ '+fmtBytes(rx);
          txEl.textContent='▲ '+fmtBytes(tx);
        }
        _prevRx=rx;_prevTx=tx;_prevTs=now;
        // System info
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
    // Graph mode toggle
    bd.appendChild(cpCheck('Show graphs',sec.graphMode,function(v){sec.graphMode=v;saveAndRefresh();}));
  },
});
