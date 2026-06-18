/* ═══════════════════════════════════════════
   WarTab — Resource Monitor Module
   CPU, RAM, Disk, GPU, Network speed
   Bar view or auto-scaled SVG line graph view
   Graph data cached globally — survives re-renders
   ═══════════════════════════════════════════ */
if(!window._rmCache)window._rmCache={};
registerModule('resource-monitor', {
  defaults: { source:'local', glancesUrl:'http://localhost:61209', refreshInterval:3, graphMode:false },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='resource-monitor';
    w.style.cssText='display:flex;flex-direction:column;gap:8px;padding:4px 0;';
    w.dataset.refresh=sec.refreshInterval||3;
    w.dataset.source=sec.source||'local';w.dataset.glancesUrl=sec.glancesUrl||'';
    w.dataset.graphMode=sec.graphMode?'1':'0';
    // Restore or initialize graph cache
    var GRAPH_PTS=25,ck=sec.id,cache=window._rmCache[ck];
    var hist;
    if(cache&&cache.hist){
      hist=cache.hist;
      var _prevRx=cache.prevRx||0,_prevTx=cache.prevTx||0,_prevTs=cache.prevTs||0;
      var _smoothed=cache.smoothed||{};
    }else{
      hist={};['cpu','ram','disk','gpu','rx','tx'].forEach(function(k){hist[k]=[];});
      var _prevRx=0,_prevTx=0,_prevTs=0;
      var _smoothed={};
    }
    var metrics=['cpu','ram','disk','gpu'];
    // viewBox always 0-100. Map values proportionally: 0% at bottom, maxVal near top.
    // 15% headroom keeps the highest value from clipping the top edge.
    function pctScale(arr){
      var max=0;
      for(var i=0;i<arr.length;i++)if(arr[i]>max)max=arr[i];
      return max*1.15||1; // headroom so top value sits at y≈13 not y=0
    }
    function pctY(v,max){
      if(max<=0)return 100; // no data → bottom
      var clamped=Math.max(0,Math.min(max,v));
      return 100-((clamped/max)*100); // 0%→bottom(100), max%→y≈13
    }
    function fitRange(arr){
      var min=Infinity,max=-Infinity;
      for(var i=0;i<arr.length;i++){if(arr[i]<min)min=arr[i];if(arr[i]>max)max=arr[i];}
      var range=Math.max(max-min,1);
      var pad=range*0.1;
      return {min:Math.max(0,min-pad),max:max+pad,range:range+pad*2};
    }
    function mapY(v,fr){
      if(fr.max===fr.min)return fr.range/2;
      var pos=(v-fr.min)/(fr.max-fr.min);
      return (1-pos)*fr.range;
    }
    function buildMetricRow(key,label){
      const row=document.createElement('div');row.style.cssText='display:flex;flex-direction:column;gap:2px;';
      const labelRow=document.createElement('div');labelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
      const lbl=document.createElement('span');lbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent=label;
      const val=document.createElement('span');val.className='rm-val-'+key;val.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;';
      val.textContent='--';
      labelRow.appendChild(lbl);labelRow.appendChild(val);row.appendChild(labelRow);
      const track=document.createElement('div');track.className='rm-track-'+key;
      track.style.cssText='height:6px;background:rgba(255,255,255,0.06);overflow:hidden;position:relative;';
      const fill=document.createElement('div');fill.className='rm-fill-'+key;
      fill.style.cssText='height:100%;width:0%;background:var(--accent);transition:width 0.4s ease;';
      track.appendChild(fill);
      var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','rm-graph-'+key);
      svg.style.cssText='display:none;width:100%;height:48px;background:rgba(0,0,0,0.08);';
      svg.setAttribute('preserveAspectRatio','none');
      var polyline=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      polyline.setAttribute('vector-effect','non-scaling-stroke');
      polyline.style.cssText='fill:none;stroke:var(--accent);stroke-width:1.5px;stroke-linejoin:round;stroke-linecap:round;';
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
    // Network row
    const netRow=document.createElement('div');netRow.style.cssText='display:flex;flex-direction:column;gap:2px;';
    const netLabelRow=document.createElement('div');netLabelRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-2xs);';
    const netLbl=document.createElement('span');netLbl.style.cssText='color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
    netLbl.textContent='NET';
    const netVal=document.createElement('span');netVal.className='rm-val-net';netVal.style.cssText='color:var(--text-primary);font-variant-numeric:tabular-nums;font-size:var(--text-2xs);';
    netVal.textContent='--';
    netLabelRow.appendChild(netLbl);netLabelRow.appendChild(netVal);netRow.appendChild(netLabelRow);
    const netTrack=document.createElement('div');netTrack.className='rm-track-net';
    netTrack.style.cssText='height:4px;background:rgba(255,255,255,0.06);overflow:hidden;';
    const netFill=document.createElement('div');netFill.className='rm-fill-net';
    netFill.style.cssText='height:100%;width:0%;background:var(--accent);transition:width 0.4s ease;';
    netTrack.appendChild(netFill);netRow.appendChild(netTrack);
    var netSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    netSvg.setAttribute('class','rm-graph-net');
    netSvg.style.cssText='display:none;width:100%;height:40px;background:rgba(0,0,0,0.08);';
    netSvg.setAttribute('preserveAspectRatio','none');
    var netRxLine=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    netRxLine.setAttribute('vector-effect','non-scaling-stroke');
    netRxLine.style.cssText='fill:none;stroke:rgba(255,255,255,0.7);stroke-width:1.5px;stroke-linejoin:round;stroke-linecap:round;';
    netRxLine.setAttribute('points','');
    netSvg.appendChild(netRxLine);
    var netTxLine=document.createElementNS('http://www.w3.org/2000/svg','polyline');
    netTxLine.setAttribute('vector-effect','non-scaling-stroke');
    netTxLine.style.cssText='fill:none;stroke:rgba(255,255,255,0.25);stroke-width:1px;stroke-linejoin:round;stroke-linecap:round;';
    netTxLine.setAttribute('points','');
    netSvg.appendChild(netTxLine);
    netRow.appendChild(netSvg);
    const netSpeedRow=document.createElement('div');netSpeedRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:1px;';
    const rxEl=document.createElement('span');rxEl.className='rm-rx';
    const txEl=document.createElement('span');txEl.className='rm-tx';
    netSpeedRow.appendChild(rxEl);netSpeedRow.appendChild(txEl);netRow.appendChild(netSpeedRow);
    w.appendChild(netRow);
    // System info row
    const sysRow=document.createElement('div');sysRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:2px;';
    const hostEl=document.createElement('span');hostEl.className='rm-host';
    const tsEl=document.createElement('span');tsEl.className='rm-ts';
    const extraEl=document.createElement('span');extraEl.className='rm-extra';
    sysRow.appendChild(hostEl);sysRow.appendChild(extraEl);sysRow.appendChild(tsEl);
    w.appendChild(sysRow);
    cw.appendChild(w);
    // Redraw existing graph data onto fresh SVGs after re-render
    function redrawExistingGraphs(){
      metrics.forEach(function(key){
        var h=hist[key];if(!h||!h.length)return;
        var r=rows[key];if(!r||r.svg.style.display==='none')return;
        var maxV=pctScale(h);
        r.pline.setAttribute('viewBox','0 0 '+GRAPH_PTS+' 100');
        r.pline.setAttribute('points',h.map(function(v,i){return i+','+pctY(v,maxV);}).join(' '));
      });
      if(hist.rx&&hist.rx.length&&netSvg.style.display!=='none'){
        var both=hist.rx.concat(hist.tx);
        var fr=fitRange(both);
        netSvg.setAttribute('viewBox','0 0 '+GRAPH_PTS+' '+fr.range);
        netRxLine.setAttribute('points',hist.rx.map(function(v,i){return i+','+(mapY(v,fr));}).join(' '));
        netTxLine.setAttribute('points',hist.tx.map(function(v,i){return i+','+(mapY(v,fr));}).join(' '));
      }
    }
    // Write cache on each update
    function saveCache(){
      window._rmCache[ck]={hist:hist,prevRx:_prevRx,prevTx:_prevTx,prevTs:_prevTs,smoothed:_smoothed};
    }
    // Toggle bar / graph mode
    function setGraphMode(enabled){
      w.dataset.graphMode=enabled?'1':'0';
      metrics.forEach(function(key){
        var r=rows[key];
        if(enabled){r.track.style.display='none';r.svg.style.display='block';}
        else{r.track.style.display='';r.svg.style.display='none';}
      });
      if(enabled){netTrack.style.display='none';netSvg.style.display='block';}
      else{netTrack.style.display='';netSvg.style.display='none';}
      if(enabled)setTimeout(redrawExistingGraphs,0);
    }
    setGraphMode(sec.graphMode);
    function fmtBytes(b){if(b<1024)return b.toFixed(0)+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}
    function fmtSpeed(bps){if(bps<1024)return bps.toFixed(0)+'B/s';if(bps<1048576)return(bps/1024).toFixed(1)+'KB/s';return(bps/1048576).toFixed(1)+'MB/s';}
    function pushGraph(key,val){
      // Exponential smoothing: 35% new, 65% history — prevents spikey on/off lines
      if(_smoothed[key]===undefined)_smoothed[key]=val;
      else _smoothed[key]=_smoothed[key]*0.65+val*0.35;
      var sv=_smoothed[key];
      var h=hist[key];if(!h)return;
      h.push(sv);
      if(h.length>GRAPH_PTS)h.shift();
      var r=rows[key];
      if(r&&r.svg.style.display!=='none'){
        var maxV=pctScale(h);
        r.pline.setAttribute('viewBox','0 0 '+GRAPH_PTS+' 100');
        r.pline.setAttribute('points',h.map(function(v,i){return i+','+pctY(v,maxV);}).join(' '));
      }
    }
    function updateNetGraph(rxSpeed,txSpeed){
      hist.rx.push(rxSpeed);hist.tx.push(txSpeed);
      if(hist.rx.length>GRAPH_PTS){hist.rx.shift();hist.tx.shift();}
      if(netSvg.style.display==='none')return;
      var both=hist.rx.concat(hist.tx);
      var fr=fitRange(both);
      netSvg.setAttribute('viewBox','0 0 '+GRAPH_PTS+' '+fr.range);
      netRxLine.setAttribute('points',hist.rx.map(function(v,i){return i+','+(mapY(v,fr));}).join(' '));
      netTxLine.setAttribute('points',hist.tx.map(function(v,i){return i+','+(mapY(v,fr));}).join(' '));
    }
    // Fetch data
    function fetchData(){
      storage.getStats(sec.source, sec.glancesUrl).then(function(d){
        if(!d)return;
        var cpuPct,mem,disks,net,hostname,uptime,gpu,cpuTemp,procs;
        if(sec.source==='glances'){
          cpuPct=typeof d.cpu==='object'?parseFloat(d.cpu.total||0):0;
          mem=d.mem||{};disks=(d.fs||[]).filter(function(f){return f.mnt_point==='/'||f.mount==='/';});
          var root=disks[0]||{};net=d.network_bit||{};hostname=d.hostname||'';
          uptime={string:Math.floor((d.uptime||0)/3600)+'h'};
          gpu={percent:0,vram_total:0,vram_used:0,temp_c:0};
          cpuTemp={celsius:0};procs=0;
        }else{
          cpuPct=typeof d.cpu==='number'?d.cpu:0;
          mem=d.memory||{};disks=d.disks||[];
          var root=disks.find(function(d2){return d2.mount==='/';})||disks[0]||{};
          net=d.network||{};hostname=d.hostname||'';uptime=d.uptime||{};
          gpu=d.gpu||{percent:0,vram_total:0,vram_used:0,temp_c:0};
          cpuTemp=d.cpu_temp||{celsius:0};procs=d.processes||0;
        }
        if(!w.parentNode)return;
        rows.cpu.fill.style.width=Math.min(cpuPct,100)+'%';
        rows.cpu.val.textContent=(cpuPct||0).toFixed(1)+'%';
        pushGraph('cpu',Math.min(cpuPct,100));
        var memPct=typeof mem.percent==='number'?mem.percent:0;
        rows.ram.fill.style.width=Math.min(memPct,100)+'%';
        var mu=mem.used?Math.round(mem.used/1024/1024/1024*10)/10:0;
        var mt=mem.total?Math.round(mem.total/1024/1024/1024*10)/10:0;
        rows.ram.val.textContent=mu+'/'+mt+'GB';pushGraph('ram',memPct);
        var diskPct=typeof root.percent==='number'?root.percent:0;
        rows.disk.fill.style.width=Math.min(diskPct,100)+'%';
        var du=root.used?Math.round(root.used/1024/1024/1024*10)/10:0;
        var dt=root.total?Math.round(root.total/1024/1024/1024*10)/10:0;
        rows.disk.val.textContent=du+'/'+dt+'GB';pushGraph('disk',diskPct);
        var gpuPct=typeof gpu.percent==='number'?gpu.percent:0;
        rows.gpu.fill.style.width=Math.min(gpuPct,100)+'%';
        var vu=gpu.vram_used?Math.round(gpu.vram_used/1024/1024/1024*100)/100:0;
        var vt=gpu.vram_total?Math.round(gpu.vram_total/1024/1024/1024*100)/100:0;
        rows.gpu.val.innerHTML=vu+'/'+vt+'GB <span style="opacity:0.5">'+(gpu.temp_c||0)+'°C</span>';
        pushGraph('gpu',gpuPct);
        var rx=net.rx_bytes||0,tx=net.tx_bytes||0;
        var now=Date.now()/1000;
        var rxSpeed=0,txSpeed=0;
        if(_prevTs>0){var dt=now-_prevTs;if(dt>0){rxSpeed=Math.max(0,(rx-_prevRx))/dt;txSpeed=Math.max(0,(tx-_prevTx))/dt;}}
        var isGraph=w.dataset.graphMode==='1';
        if(isGraph){netVal.textContent=fmtSpeed(rxSpeed)+' / '+fmtSpeed(txSpeed);updateNetGraph(rxSpeed,txSpeed);}
        else{netVal.textContent=fmtBytes(rx)+' / '+fmtBytes(tx);}
        netFill.style.width='0%';
        rxEl.textContent='▼ '+fmtBytes(rx);txEl.textContent='▲ '+fmtBytes(tx);
        _prevRx=rx;_prevTx=tx;_prevTs=now;
        hostEl.textContent=hostname;
        var extraParts=[];if(cpuTemp.celsius>0)extraParts.push(cpuTemp.celsius+'°C');if(procs>0)extraParts.push(procs+' proc');
        extraEl.textContent=extraParts.length?extraParts.join(' · '):'';
        tsEl.textContent='↑ '+(uptime.string||'');
        saveCache();
      }).catch(function(){});
    }
    fetchData();
    setInterval(fetchData,(sec.refreshInterval||3)*1000);
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
    bd.appendChild(cpRange('Poll interval (s)',sec.refreshInterval||3,1,60,function(v){sec.refreshInterval=parseInt(v);saveAndRefresh();}));
    bd.appendChild(cpCheck('Show graphs',sec.graphMode,function(v){sec.graphMode=v;saveAndRefresh();}));
  },
});
