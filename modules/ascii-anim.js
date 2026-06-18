/* ═══════════════════════════════════════════
   WarTab — ASCII Animations Module
   Pure terminal-style animations rendered
   in a <pre> element via requestAnimationFrame.
   Supports dynamic font scaling, ghost/afterimage
   effect, and real-time speed/contrast controls.
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

    // Dynamic font sizing — fills available space
    var W=70,H=22;
    function sizeFont(){
      var pw=pre.clientWidth-8,ph=pre.clientHeight-8;
      if(pw<10||ph<10)return;
      // Fill width; height overflow is hidden by overflow:hidden
      pre.style.fontSize=Math.max(4,Math.round(pw/(W*0.6)))+'px';
    }
    // Observe resize + size on every frame
    if(window.ResizeObserver){ro=new ResizeObserver(sizeFont);ro.observe(pre);}
    setTimeout(sizeFont,50);

    // ── Spinning Donut ──────────────────────────────
    function renderDonut(){
      var A=0,B=0;
      function frame(){
        if(!running)return;
        sizeFont();
        var b=new Array(W*H);b.fill(' ');
        var z=new Array(W*H);z.fill(0);
        var rA,rB,ci,co,si,so,ei,eo,D,L,m,n,t,x,y,o,N;
        for(var j=0;j<6.28;j+=0.07){
          rA=Math.sin(j);rB=Math.cos(j);
          for(var i=0;i<6.28;i+=0.02){
            ci=Math.sin(i);co=Math.cos(i);
            si=Math.sin(A);so=Math.sin(j);
            ei=Math.cos(A);eo=Math.cos(j);
            D=1/(ci*(rB+2)*ei+so*si+5);
            L=co*(rB+2)*eo-si*so;
            m=Math.cos(B);n=Math.sin(B);
            t=ci*(rB+2)*si-so*ei;
            x=Math.round(35+30*D*(L*m-t*n));
            y=Math.round(12+15*D*(L*n+t*m));
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

    // ── Matrix Rain ────────────────────────────────
    function renderMatrix(){
      var drops=[];
      for(var i=0;i<60;i++)drops.push({y:-Math.random()*20,speed:0.8+Math.random()*2.5});
      var glyphs='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEF';
      var rows=20,cols=60,trail=Math.max(2,Math.round(rows*0.5*ct));
      function frame(){
        if(!running)return;
        sizeFont();
        var grid=[];
        for(var r=0;r<rows;r++)grid.push(new Array(cols).fill(' '));
        for(var i=0;i<drops.length;i++){
          var d=drops[i];
          d.y+=d.speed*0.12*sp;
          if(d.y>=rows+trail){d.y=-trail-Math.random()*8;d.speed=0.8+Math.random()*2.5;}
          for(var t=0;t<trail&&d.y-t>=0&&d.y-t<rows;t++){
            var ch=glyphs[Math.floor(Math.random()*glyphs.length)];
            var bright=t<2?0.9:t<trail*0.3?0.6:0.3;
            if(Math.random()<bright)grid[Math.floor(d.y)-t][i]=ch;
          }
        }
        pre.textContent=applyGhostGrid(grid);
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Starfield ──────────────────────────────────
    function renderStars(){
      var stars=[];
      for(var i=0;i<200;i++){
        stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:0.5+Math.random()*2});
      }
      function frame(){
        if(!running)return;
        sizeFont();
        var rows=[];
        for(var i=0;i<H;i++)rows.push(new Array(W).fill(' '));
        for(var i=0;i<stars.length;i++){
          var s=stars[i];
          s.z-=0.03*sp;
          if(s.z<=0.1){s.x=Math.random()*2-1;s.y=Math.random()*2-1;s.z=2.5;}
          var px=Math.round(W/2+s.x/s.z*30);
          var py=Math.round(H/2+s.y/s.z*15);
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

    // ── Fire ───────────────────────────────────────
    function renderFire(){
      var pixels=[];
      for(var i=0;i<W*H;i++)pixels.push(0);
      var frameCount=0,frameSkip=Math.max(0,Math.round(3-sp*0.6));
      function frame(){
        if(!running)return;
        sizeFont();
        frameCount++;
        for(var x=0;x<W;x++){
          pixels[(H-1)*W+x]=Math.random()<0.35?35:0;
        }
        for(var y=0;y<H-1;y++){
          for(var x=0;x<W;x++){
            var v=0;
            if(x>0)v+=pixels[(y+1)*W+(x-1)];
            v+=pixels[(y+1)*W+x];
            if(x<W-1)v+=pixels[(y+1)*W+(x+1)];
            pixels[y*W+x]=Math.max(0,Math.round(v/3.4-Math.random()*0.4));
          }
        }
        if(frameSkip<1||frameCount%frameSkip===0){
          var chars=' .,:;xX#';
          var out='';
          for(var y=0;y<H;y++){
            for(var x=0;x<W;x++){
              var v=Math.round(pixels[y*W+x]/ct);
              out+=v<chars.length?chars[v>=0?v:0]:'#';
            }
            out+='\n';
          }
          pre.textContent=applyGhostStr(out);
        }
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Ghost/Afterimage Engine ────────────────────
    function applyGhost(arr,valFn){
      if(!ghostOn)return gridToString(arr);
      if(!ghostBuf||ghostBuf.length!==W*H)ghostBuf=new Float32Array(W*H);
      var out='';var fn=valFn||function(v){return v;}
      for(var k=0;k<W*H;k++){
        var raw=fn(arr[k]);
        ghostBuf[k]=Math.min(1,Math.max(0,ghostBuf[k]*ghostDecay+raw*(1-ghostDecay)));
        var idx=Math.round(ghostBuf[k]*11);
        out+=k>0&&k%W===0?'\n':lum[Math.min(11,idx)];
      }
      return out;
    }
    function applyGhostGrid(grid){
      if(!ghostOn)return grid.map(function(r){return r.join('');}).join('\n');
      var gcols=grid[0]?grid[0].length:60;
      if(!ghostBuf||ghostBuf.length!==gcols)ghostBuf=new Float32Array(gcols);
      var out='';
      for(var r=0;r<grid.length;r++){
        for(var c=0;c<grid[r].length;c++){
          var raw=grid[r][c]!==' '?1:0;
          ghostBuf[c]=Math.min(1,Math.max(0,ghostBuf[c]*ghostDecay+raw*(1-ghostDecay)));
          var li=Math.round(ghostBuf[c]*11);
          out+=lum[Math.min(11,li)];
        }
        out+='\n';
      }
      return out;
    }
    function applyGhostStr(str){
      if(!ghostOn)return str;
      if(!ghostBuf||ghostBuf.length!==W*H)ghostBuf=new Float32Array(W*H);
      var out='';var ci=0;
      for(var k=0;k<str.length;k++){
        var ch=str[k];
        if(ch==='\n'){out+='\n';continue;}
        var raw=ch!==' '?1:0;
        ghostBuf[ci]=Math.min(1,Math.max(0,ghostBuf[ci]*ghostDecay+raw*(1-ghostDecay)));
        var li=Math.round(ghostBuf[ci]*11);
        out+=lum[Math.min(11,li)];
        ci++;
      }
      return out;
    }
    function gridToString(arr){
      var out='';
      for(var k=0;k<W*H;k++){
        out+=k>0&&k%W===0?'\n':arr[k];
      }
      return out;
    }

    // Start selected animation
    function startAnim(){
      ghostBuf=null;
      if(_timer){cancelAnimationFrame(_timer);_timer=null;}
      switch(sec.anim){
        case'donut':W=70;H=22;renderDonut();break;
        case'matrix':renderMatrix();break;
        case'stars':W=70;H=22;renderStars();break;
        case'fire':W=70;H=22;renderFire();break;
        default:W=70;H=22;renderDonut();
      }
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
