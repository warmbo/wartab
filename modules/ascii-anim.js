/* ═══════════════════════════════════════════
   WarTab — ASCII Animations Module
   Pure terminal-style animations rendered
   in a <pre> element via requestAnimationFrame.
   Dynamically adapts W/H grid to fill the
   available card space; restarts on resize.
   ═══════════════════════════════════════════ */
registerModule('ascii-anim', {
  defaults: { anim:'donut', speed:10, contrast:10, ghost:false },
  render: (sec,card,cw)=>{
    cw.style.cssText='display:flex;flex-direction:column;flex:1;min-height:0;';
    var pre=document.createElement('pre');
    pre.style.cssText='margin:0;white-space:pre;overflow:hidden;color:var(--text-primary);background:rgba(0,0,0,0.2);text-align:left;font-family:monospace;flex:1;width:100%;box-sizing:border-box;padding:4px;line-height:1.12;';
    var running=true,_timer,ro;
    var sp=(parseFloat(sec.speed)||10)/10;
    var ct=(parseFloat(sec.contrast)||10)/10;
    var ghostOn=!!sec.ghost;
    cw.appendChild(pre);

    var lum='.,-~:;=!*#$@';
    var ghostBuf=null,ghostDecay=0.88;
    var W=70,H=22;

    // Calculate W/H from actual container size, fills both dimensions
    // Returns true if dimensions actually changed
    function sizeFont(){
      if(!pre.parentNode)return false;
      var pw=pre.clientWidth-8,ph=pre.clientHeight-8;
      if(pw<10||ph<10)return false;
      var fs=Math.max(5,Math.round(pw/(70*0.6)));
      var rowsFit=Math.round(ph/(fs*1.12));
      if(rowsFit<10)fs=Math.max(5,Math.round(ph/(12*1.12)));
      var newW=Math.max(10,Math.round(pw/(fs*0.6)));
      var newH=Math.max(5,Math.round(ph/(fs*1.12)));
      if(newW===W&&newH===H&&pre.style.fontSize===fs+'px')return false;
      W=newW;H=newH;
      pre.style.fontSize=fs+'px';
      pre.style.padding='4px';
      return true;
    }

    // ── Helpers ─────────────────────────────
    function gridToString(arr){
      var out='';
      for(var k=0;k<W*H;k++)out+=k>0&&k%W===0?'\n':arr[k];
      return out;
    }

    // ── Ghost/Afterimage Engine ─────────────
    function rebuildGhost(){ghostBuf=new Float32Array(W*H);}
    function applyGhost(arr,valFn){
      if(!ghostOn)return gridToString(arr);
      if(!ghostBuf||ghostBuf.length!==W*H)rebuildGhost();
      var out='';var fn=valFn||function(v){return v;}
      for(var k=0;k<W*H;k++){
        var raw=fn(arr[k]);
        ghostBuf[k]=Math.min(1,Math.max(0,ghostBuf[k]*ghostDecay+raw*(1-ghostDecay)));
        out+=k>0&&k%W===0?'\n':lum[Math.min(11,Math.round(ghostBuf[k]*11))];
      }
      return out;
    }
    function applyGhostGrid(grid){
      if(!ghostOn)return grid.map(function(r){return r.join('');}).join('\n');
      var gcols=grid[0]?grid[0].length:W;
      if(!ghostBuf||ghostBuf.length!==gcols)ghostBuf=new Float32Array(gcols);
      var out='';
      for(var r=0;r<grid.length;r++){
        for(var c=0;c<grid[r].length;c++){
          ghostBuf[c]=Math.min(1,Math.max(0,ghostBuf[c]*ghostDecay+(grid[r][c]!==' '?1:0)*(1-ghostDecay)));
          out+=lum[Math.min(11,Math.round(ghostBuf[c]*11))];
        }
        out+='\n';
      }
      return out;
    }
    function applyGhostStr(str){
      if(!ghostOn)return str;
      if(!ghostBuf||ghostBuf.length!==W*H)rebuildGhost();
      var out='',ci=0;
      for(var k=0;k<str.length;k++){
        var ch=str[k];
        if(ch==='\n'){out+='\n';continue;}
        ghostBuf[ci]=Math.min(1,Math.max(0,ghostBuf[ci]*ghostDecay+(ch!==' '?1:0)*(1-ghostDecay)));
        out+=lum[Math.min(11,Math.round(ghostBuf[ci]*11))];
        ci++;
      }
      return out;
    }

    // ── Spinning Donut ──────────────────────
    function renderDonut(){
      var A=0,B=0;
      function frame(){
        if(!running)return;
        var b=new Array(W*H);b.fill(' ');
        var z=new Array(W*H);z.fill(0);
        var rA,rB,ci,co,si,so,ei,eo,D,L,m,n,t,x,y,o,N;
        for(var j=0;j<6.28;j+=0.07){
          rA=Math.sin(j);rB=Math.cos(j);
          for(var i=0;i<6.28;i+=0.02){
            ci=Math.sin(i);co=Math.cos(i);
            si=Math.sin(A);so=Math.sin(j);ei=Math.cos(A);eo=Math.cos(j);
            D=1/(ci*(rB+2)*ei+so*si+5);
            L=co*(rB+2)*eo-si*so;m=Math.cos(B);n=Math.sin(B);
            t=ci*(rB+2)*si-so*ei;
            x=Math.round(W/2+W*0.43*D*(L*m-t*n));
            y=Math.round(H/2+H*0.68*D*(L*n+t*m));
            o=x+W*y;
            N=Math.round(8*((so*si-ci*rB*ei)*m-ci*rB*si-so*ei-co*rB*n));
            if(y>=0&&y<H&&x>=0&&x<W&&D>z[o]){
              z[o]=D;b[o]=lum[Math.min(11,Math.max(0,Math.round(N*ct)))];
            }
          }
        }
        pre.textContent=applyGhost(b,function(v){return v!==' '?1:0;});
        A+=0.04*sp;B+=0.02*sp;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Matrix Rain ──────────────────────────
    function renderMatrix(){
      var nDrops=Math.max(10,Math.round(W*0.85));
      var drops=[];
      for(var i=0;i<nDrops;i++)drops.push({y:-Math.random()*20,speed:0.8+Math.random()*2.5});
      var glyphs='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEF';
      var trail=Math.max(2,Math.round(H*0.5*ct));
      function frame(){
        if(!running)return;
        var grid=[];
        for(var r=0;r<H;r++)grid.push(new Array(W).fill(' '));
        for(var i=0;i<drops.length;i++){
          var d=drops[i];
          d.y+=d.speed*0.12*sp;
          if(d.y>=H+trail){d.y=-trail-Math.random()*8;d.speed=0.8+Math.random()*2.5;}
          for(var t=0;t<trail&&d.y-t>=0&&d.y-t<H;t++){
            var ch=glyphs[Math.floor(Math.random()*glyphs.length)];
            if(Math.random()<(t<2?0.9:t<trail*0.3?0.6:0.3))grid[Math.floor(d.y)-t][i]=ch;
          }
        }
        pre.textContent=applyGhostGrid(grid);
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Starfield ────────────────────────────
    function renderStars(){
      var nStars=Math.max(20,Math.round(W*H*0.13));
      var stars=[];
      for(var i=0;i<nStars;i++)stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:0.5+Math.random()*2});
      function frame(){
        if(!running)return;
        var rows=[];
        for(var i=0;i<H;i++)rows.push(new Array(W).fill(' '));
        for(var i=0;i<stars.length;i++){
          var s=stars[i];
          s.z-=0.03*sp;
          if(s.z<=0.1){s.x=Math.random()*2-1;s.y=Math.random()*2-1;s.z=2.5;}
          var px=Math.round(W/2+s.x/s.z*(W*0.43));
          var py=Math.round(H/2+s.y/s.z*(H*0.68));
          if(px>=0&&px<W&&py>=0&&py<H){
            var b=Math.max(0,Math.min(11,Math.round((1-(s.z-0.1)/2.4)*10*ct)));
            rows[py][px]=lum[b];
          }
        }
        pre.textContent=applyGhostGrid(rows);
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Fire ─────────────────────────────────
    function renderFire(){
      var pixels=[];
      for(var i=0;i<W*H;i++)pixels.push(0);
      var frameCount=0,frameSkip=Math.max(0,Math.round(3-sp*0.6));
      function frame(){
        if(!running)return;
        frameCount++;
        for(var x=0;x<W;x++)pixels[(H-1)*W+x]=Math.random()<0.35?35:0;
        for(var y=0;y<H-1;y++)for(var x=0;x<W;x++){
          var v=0;
          if(x>0)v+=pixels[(y+1)*W+(x-1)];
          v+=pixels[(y+1)*W+x];
          if(x<W-1)v+=pixels[(y+1)*W+(x+1)];
          pixels[y*W+x]=Math.max(0,Math.round(v/3.4-Math.random()*0.4));
        }
        if(frameSkip<1||frameCount%frameSkip===0){
          var chars=' .,:;xX#';
          var out='';
          for(var y=0;y<H;y++){
            for(var x=0;x<W;x++){
              var val=Math.round(pixels[y*W+x]/ct);
              out+=val<chars.length?chars[val>=0?val:0]:'#';
            }
            out+='\n';
          }
          pre.textContent=applyGhostStr(out);
        }
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Game of Life ─────────────────────────
    function renderLife(){
      var grid=[];for(var i=0;i<W*H;i++)grid.push(Math.random()<0.3?1:0);
      var frameCount=0,skip=Math.max(1,Math.round(5-sp*0.4));
      function countN(g,x,y){
        var n=0;
        for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
          if(dx===0&&dy===0)continue;
          n+=g[((y+dy+H)%H)*W+((x+dx+W)%W)];
        }
        return n;
      }
      function frame(){
        if(!running)return;
        frameCount++;
        if(frameCount%skip===0){
          var ng=[];
          for(var y=0;y<H;y++)for(var x=0;x<W;x++){
            var idx=y*W+x,n=countN(grid,x,y);
            ng[idx]=grid[idx]===1?(n===2||n===3?1:0):(n===3?1:0);
          }
          grid=ng;
          if(grid.every(function(c){return c===0;})){pre.textContent='';_timer=requestAnimationFrame(frame);return;}
        }
        var out='';
        for(var y=0;y<H;y++){for(var x=0;x<W;x++)out+=grid[y*W+x]?lum[Math.min(11,Math.round(ct*8))]:' ';out+='\n';}
        pre.textContent=applyGhostStr(out);
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Plasma ───────────────────────────────
    function renderPlasma(){
      var t=0;
      function frame(){
        if(!running)return;
        t+=0.05*sp;
        var out='';
        for(var y=0;y<H;y++){
          for(var x=0;x<W;x++){
            var v=Math.sin(x*0.2+t)*Math.cos(y*0.15+t*0.7)+Math.sin((x+y)*0.1+t*0.5)*0.5+0.5;
            v=Math.max(0,Math.min(1,v));
            out+=lum[Math.min(11,Math.round(v*11*ct))];
          }
          out+='\n';
        }
        pre.textContent=applyGhostStr(out);
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Start selected animation ─────────────
    function startAnim(){
      ghostBuf=null;
      if(_timer){cancelAnimationFrame(_timer);_timer=null;}
      sizeFont(); // sets W,H from actual dimensions
      switch(sec.anim){
        case'donut':renderDonut();break;
        case'matrix':renderMatrix();break;
        case'stars':renderStars();break;
        case'fire':renderFire();break;
        case'life':renderLife();break;
        case'plasma':renderPlasma();break;
        default:renderDonut();
      }
    }

    // Resize → recalculate W/H and restart animation if dimensions changed
    if(window.ResizeObserver){
      ro=new ResizeObserver(function(){
        if(sizeFont()&&_timer){cancelAnimationFrame(_timer);_timer=null;startAnim();}
      });
      ro.observe(pre);
    }
    setTimeout(startAnim,50);

    // Cleanup
    card._cleanup=function(){
      running=false;
      if(_timer){cancelAnimationFrame(_timer);_timer=null;}
      if(ro)ro.disconnect();
    };
    card._asciiRestart=function(){
      sp=(parseFloat(sec.speed)||10)/10;
      ct=(parseFloat(sec.contrast)||10)/10;
      ghostOn=!!sec.ghost;
      running=true;startAnim();
    };
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Animation'));
    bd.appendChild(cpSelect([
      {value:'donut',label:'Spinning Donut'},
      {value:'matrix',label:'Matrix Rain'},
      {value:'stars',label:'Starfield'},
      {value:'fire',label:'Fire'},
      {value:'life',label:'Game of Life'},
      {value:'plasma',label:'Plasma'},
    ],sec.anim||'donut',function(v){sec.anim=v;saveConfig();if(card._asciiRestart)card._asciiRestart();}));
    bd.appendChild(cpRange('Speed',parseFloat(sec.speed)||10,1,20,function(v){
      sec.speed=parseInt(v);saveConfig();if(card._asciiRestart)card._asciiRestart();
    },1));
    bd.appendChild(cpRange('Contrast',parseFloat(sec.contrast)||10,1,20,function(v){
      sec.contrast=parseInt(v);saveConfig();if(card._asciiRestart)card._asciiRestart();
    },1));
    bd.appendChild(cpCheck('Ghost / Afterimage',!!sec.ghost,function(v){
      sec.ghost=v;saveConfig();if(card._asciiRestart)card._asciiRestart();
    }));
  },
});
