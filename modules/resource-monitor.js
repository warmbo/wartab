/* ═══════════════════════════════════════════
   WarTab — Resource Monitor Module
   CPU, RAM, Disk, GPU + Network speed
   Bar view or canvas sparkline graph view
   Zero external dependencies — no Chart.js
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
    var GRAPH_PTS=25,ck=sec.id,cache=window._rmCache[ck];
    var hist;
    if(cache&&cache.hist){
      hist=cache.hist;
      var _prevRx=cache.prevRx||0,_prevTx=cache.prevTx||0,_prevTs=cache.prevTs||0;
      var _prevDiskRd=cache.prevDiskRd||0,_prevDiskWr=cache.prevDiskWr||0,_prevDiskTs=cache.prevDiskTs||0;
      var _smoothed=cache.smoothed||{};
    }else{
      hist={};['cpu','ram','disk','gpu','rx','tx'].forEach(function(k){hist[k]=[];});
      var _prevRx=0,_prevTx=0,_prevTs=0;
      var _prevDiskRd=0,_prevDiskWr=0,_prevDiskTs=0;
      var _smoothed={};
    }
    var metrics=['cpu','ram','disk','gpu'];
    // Canvas sparkline renderer — draws a polyline scaled to fill the canvas
    function hexToRgba(h,a){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return'rgba('+r+','+g+','+b+','+a+')';}
    function drawSparkline(canvas,data,color,fixedMax){
      if(!canvas||!data||!data.length)return;
      var ctx=canvas.getContext('2d');
      var W=canvas.width,H=canvas.height,pad=2;
      var max=fixedMax||0;
      if(!fixedMax)for(var i=0;i<data.length;i++)if(data[i]>max)max=data[i];
      if(max<1)max=1;
      var plotH=H-pad*2,plotW=W-pad*2,plotBot=H-pad;
      ctx.clearRect(0,0,W,H);
      var pts=[];
      for(var i=0;i<data.length;i++){
        pts.push({x:pad+(i/(data.length-1||1))*plotW,y:pad+plotH-(data[i]/max)*plotH});
      }
      // Smooth quadratic bezier through points (caller must moveTo first)
      function smoothCurve(ctx,pts){
        for(var i=1;i<pts.length-1;i++){
          var xc=(pts[i].x+pts[i+1].x)/2,yc=(pts[i].y+pts[i+1].y)/2;
          ctx.quadraticCurveTo(pts[i].x,pts[i].y,xc,yc);
        }
        ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
      }
      // Fill below the line — from bottom-left up to first point, along curve, down to bottom-right
      ctx.beginPath();
      ctx.moveTo(pts[0].x,plotBot);
      ctx.lineTo(pts[0].x,pts[0].y);
      smoothCurve(ctx,pts);
      ctx.lineTo(pts[pts.length-1].x,plotBot);
      ctx.closePath();
      ctx.fillStyle=hexToRgba(color,0.12);
      ctx.fill();
      // Stroke the line
      ctx.beginPath();
      ctx.moveTo(pts[0].x,pts[0].y);
      smoothCurve(ctx,pts);
      ctx.strokeStyle=color;
      ctx.lineWidth=1.5;
      ctx.lineJoin='round';
      ctx.lineCap='round';
      ctx.stroke();
    }
    function drawNetSparkline(canvas,rxData,txData){
      if(!canvas||!rxData||!rxData.length)return;
      var ctx=canvas.getContext('2d');
      var W=canvas.width,H=canvas.height,pad=2;
      var max=0;
      for(var i=0;i<rxData.length;i++)if(rxData[i]>max)max=rxData[i];
      for(var i=0;i<txData.length;i++)if(txData[i]>max)max=txData[i];
      if(max<1)max=1;
      var plotH=H-pad*2,plotW=W-pad*2,plotBot=H-pad;
      ctx.clearRect(0,0,W,H);
      function buildPts(data){
        var p=[];
        for(var i=0;i<data.length;i++)p.push({x:pad+(i/(data.length-1||1))*plotW,y:pad+plotH-(data[i]/max)*plotH});
        return p;
      }
      function drawFilledCurve(pts,fillColor,strokeColor,lineW){
        ctx.beginPath();
        ctx.moveTo(pts[0].x,plotBot);
        ctx.lineTo(pts[0].x,pts[0].y);
        for(var i=1;i<pts.length-1;i++){
          var xc=(pts[i].x+pts[i+1].x)/2,yc=(pts[i].y+pts[i+1].y)/2;
          ctx.quadraticCurveTo(pts[i].x,pts[i].y,xc,yc);
        }
        ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
        ctx.lineTo(pts[pts.length-1].x,plotBot);
        ctx.closePath();
        ctx.fillStyle=fillColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pts[0].x,pts[0].y);
        for(var i=1;i<pts.length-1;i++){
          var xc=(pts[i].x+pts[i+1].x)/2,yc=(pts[i].y+pts[i+1].y)/2;
          ctx.quadraticCurveTo(pts[i].x,pts[i].y,xc,yc);
        }
        ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);
        ctx.strokeStyle=strokeColor;
        ctx.lineWidth=lineW;
        ctx.lineJoin='round';
        ctx.lineCap='round';
        ctx.stroke();
      }
      var rxPts=buildPts(rxData),txPts=buildPts(txData);
      drawFilledCurve(txPts,'rgba(255,255,255,0.05)','rgba(255,255,255,0.25)',1);
      drawFilledCurve(rxPts,'rgba(255,255,255,0.08)','rgba(255,255,255,0.7)',1.5);
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
      track.style.cssText='height:6px;background:rgba(255,255,255,0.06);overflow:hidden;';
      const fill=document.createElement('div');fill.className='rm-fill-'+key;
      fill.style.cssText='height:100%;width:0%;background:var(--accent);transition:width 0.4s ease;';
      track.appendChild(fill);
      var canvas=document.createElement('canvas');canvas.className='rm-spark-'+key;
      var cwrap=document.createElement('div');cwrap.style.cssText='display:none;height:48px;position:relative;';
      cwrap.appendChild(canvas);
      row.appendChild(track);row.appendChild(cwrap);
      return {row:row,fill:fill,val:val,canvas:canvas,cwrap:cwrap,track:track,key:key};
    }
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
    const netFill=document.createElement('div');netFill.className='rm-fill-net';
    netFill.style.cssText='height:4px;width:0%;background:var(--accent);transition:width 0.4s ease;';
    netRow.appendChild(netFill);
    var netCanvas=document.createElement('canvas');netCanvas.className='rm-spark-net';
    var netCwrap=document.createElement('div');netCwrap.style.cssText='display:none;height:40px;position:relative;';
    netCwrap.appendChild(netCanvas);
    netRow.appendChild(netCwrap);
    const netSpeedRow=document.createElement('div');netSpeedRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:1px;';
    const rxEl=document.createElement('span');rxEl.className='rm-rx';
    const txEl=document.createElement('span');txEl.className='rm-tx';
    netSpeedRow.appendChild(rxEl);netSpeedRow.appendChild(txEl);netRow.appendChild(netSpeedRow);
    w.appendChild(netRow);
    // System info
    const sysRow=document.createElement('div');sysRow.style.cssText='display:flex;justify-content:space-between;font-size:var(--text-3xs);color:var(--text-tertiary);margin-top:2px;';
    const hostEl=document.createElement('span');hostEl.className='rm-host';
    const tsEl=document.createElement('span');tsEl.className='rm-ts';
    sysRow.appendChild(hostEl);sysRow.appendChild(tsEl);
    w.appendChild(sysRow);
    cw.appendChild(w);
    // Size canvases to match their container, then redraw
    function sizeAndDrawAll(){
      metrics.forEach(function(key){
        var r=rows[key];if(!r)return;
        if(r.cwrap.style.display==='none')return;
        var rect=r.cwrap.getBoundingClientRect();
        var dpr=window.devicePixelRatio||1;
        r.canvas.width=rect.width*dpr;
        r.canvas.height=rect.height*dpr;
        r.canvas.style.width=rect.width+'px';
        r.canvas.style.height=rect.height+'px';
        var ctx=r.canvas.getContext('2d');
        ctx.scale(dpr,dpr);
        var accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#888';
        drawSparkline(r.canvas,hist[key],accent,key==='ram'?100:0);
      });
      if(netCwrap.style.display==='none')return;
      var rect=netCwrap.getBoundingClientRect();
      var dpr=window.devicePixelRatio||1;
      netCanvas.width=rect.width*dpr;
      netCanvas.height=rect.height*dpr;
      netCanvas.style.width=rect.width+'px';
      netCanvas.style.height=rect.height+'px';
      var ctx=netCanvas.getContext('2d');
      ctx.scale(dpr,dpr);
      drawNetSparkline(netCanvas,hist.rx,hist.tx);
    }
    // Toggle bar / graph mode
    function setGraphMode(enabled){
      w.dataset.graphMode=enabled?'1':'0';
      metrics.forEach(function(key){
        var r=rows[key];
        if(enabled){r.track.style.display='none';r.cwrap.style.display='block';}
        else{r.track.style.display='';r.cwrap.style.display='none';}
      });
      if(enabled){netFill.style.display='none';netCwrap.style.display='block';}
      else{netFill.style.display='';netCwrap.style.display='none';}
      if(enabled)setTimeout(sizeAndDrawAll,0);
    }
    setGraphMode(sec.graphMode);
    // Helpers
    function fmtBytes(b){if(b<1024)return b.toFixed(0)+'B';if(b<1048576)return(b/1024).toFixed(1)+'KB';return(b/1048576).toFixed(1)+'MB';}
    function fmtSpeed(bps){if(bps<1024)return bps.toFixed(0)+'B/s';if(bps<1048576)return(bps/1024).toFixed(1)+'KB/s';return(bps/1048576).toFixed(1)+'MB/s';}
    function pushGraph(key,val){
      if(_smoothed[key]===undefined)_smoothed[key]=val;
      else _smoothed[key]=_smoothed[key]*0.65+val*0.35;
      var sv=_smoothed[key];
      var h=hist[key];if(!h)return;
      h.push(sv);
      if(h.length>GRAPH_PTS)h.shift();
      var r=rows[key];
      if(r&&r.cwrap.style.display!=='none'){
        drawSparkline(r.canvas,h,getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#888',key==='ram'?100:0);
      }
    }
    function updateNetGraph(rxSpeed,txSpeed){
      hist.rx.push(rxSpeed);hist.tx.push(txSpeed);
      if(hist.rx.length>GRAPH_PTS){hist.rx.shift();hist.tx.shift();}
      if(netCwrap.style.display!=='none'){
        drawNetSparkline(netCanvas,hist.rx,hist.tx);
      }
    }
    function saveCache(){
      window._rmCache[ck]={hist:hist,prevRx:_prevRx,prevTx:_prevTx,prevTs:_prevTs,prevDiskRd:_prevDiskRd,prevDiskWr:_prevDiskWr,prevDiskTs:_prevDiskTs,smoothed:_smoothed};
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
        var isGraph=w.dataset.graphMode==='1';
        // CPU
        var cpuVal=Math.min(cpuPct,100);
        rows.cpu.fill.style.width=cpuVal+'%';
        var cpuExtra=[];if(cpuTemp.celsius>0)cpuExtra.push(cpuTemp.celsius+'°C');if(procs>0)cpuExtra.push(procs+'p');
        rows.cpu.val.innerHTML=(cpuPct||0).toFixed(1)+'% <span style="opacity:0.5;font-weight:400;font-size:var(--text-3xs)">'+cpuExtra.join(' ')+'</span>';
        pushGraph('cpu',cpuVal);
        // RAM — show active memory (fluctuates with process activity)
        var memPct=typeof mem.active==='number'&&mem.total?mem.active/mem.total*100:0;
        rows.ram.fill.style.width=Math.min(memPct,100)+'%';
        var mu=mem.active?Math.round(mem.active/1024/1024/1024*10)/10:0;
        var mt=mem.total?Math.round(mem.total/1024/1024/1024*10)/10:0;
        rows.ram.val.textContent=mu+'/'+mt+'GB';pushGraph('ram',memPct);
        // Disk — I/O speed (delta-based, like network)
        var dio=d.disk_io||{};
        var dr=dio.readsectors||0,dw=dio.writesectors||0;
        var diskNow=Date.now()/1000;
        var diskRdSpeed=0,diskWrSpeed=0;
        if(_prevDiskTs>0){
          var ddt=diskNow-_prevDiskTs;
          if(ddt>0){
            diskRdSpeed=Math.max(0,(dr-_prevDiskRd))*512/ddt;
            diskWrSpeed=Math.max(0,(dw-_prevDiskWr))*512/ddt;
          }
        }
        rows.disk.val.textContent=fmtSpeed(diskRdSpeed)+' / '+fmtSpeed(diskWrSpeed);
        rows.disk.fill.style.width='0%';
        pushGraph('disk',diskRdSpeed);
        _prevDiskRd=dr;_prevDiskWr=dw;_prevDiskTs=diskNow;
        // GPU
        var gpuPct=typeof gpu.percent==='number'?gpu.percent:0;
        rows.gpu.fill.style.width=Math.min(gpuPct,100)+'%';
        var vu=gpu.vram_used?Math.round(gpu.vram_used/1024/1024/1024*100)/100:0;
        var vt=gpu.vram_total?Math.round(gpu.vram_total/1024/1024/1024*100)/100:0;
        rows.gpu.val.innerHTML=vu+'/'+vt+'GB <span style="opacity:0.5">'+(gpu.temp_c||0)+'°C</span>';
        pushGraph('gpu',gpuPct);
        // Network
        var rx=net.rx_bytes||0,tx=net.tx_bytes||0;
        var now=Date.now()/1000;
        var rxSpeed=0,txSpeed=0;
        if(_prevTs>0){var dt=now-_prevTs;if(dt>0){rxSpeed=Math.max(0,(rx-_prevRx))/dt;txSpeed=Math.max(0,(tx-_prevTx))/dt;}}
        if(isGraph){netVal.textContent=fmtSpeed(rxSpeed)+' / '+fmtSpeed(txSpeed);updateNetGraph(rxSpeed,txSpeed);}
        else{netVal.textContent=fmtBytes(rx)+' / '+fmtBytes(tx);}
        rxEl.textContent='▼ '+fmtBytes(rx);txEl.textContent='▲ '+fmtBytes(tx);
        _prevRx=rx;_prevTx=tx;_prevTs=now;
        hostEl.textContent=hostname;
        tsEl.textContent='↑ '+(uptime.string||'');
        saveCache();
      }).catch(function(err){
        console.error('resource-monitor fetch failed:', err);
      });
    }
    fetchData();
    var _rmInterval=setInterval(fetchData,(sec.refreshInterval||3)*1000);
    card._cleanup=function(){clearInterval(_rmInterval);};
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Data Source'));
    bd.appendChild(cpSelect([{value:'local',label:'Local (server stats)'},{value:'glances',label:'Glances API'}],sec.source||'local',function(v){sec.source=v;saveAndRefresh();}));
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
