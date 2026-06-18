/* ═══════════════════════════════════════════
   WarTab — ASCII Animations Module
   Pure terminal-style animations rendered
   in a <pre> element via requestAnimationFrame.
   ═══════════════════════════════════════════ */
registerModule('ascii-anim', {
  defaults: { anim:'donut', speed:1, contrast:1 },
  render: (sec,card,cw)=>{
    cw.style.cssText='display:flex;flex-direction:column;flex:1;min-height:0;';
    var pre=document.createElement('pre');pre.className='ascii-anim-pre';
    pre.style.cssText='margin:0;font-size:10px;line-height:1.15;white-space:pre;overflow:hidden;color:var(--text-primary);background:rgba(0,0,0,0.2);text-align:left;font-family:monospace;flex:1;width:100%;box-sizing:border-box;padding:6px;';
    var running=true,_timer;
    var sp=parseFloat(sec.speed)||1;
    var ct=parseFloat(sec.contrast)||1;
    cw.appendChild(pre);

    // ── Spinning Donut ──────────────────────────────
    function renderDonut(){
      var A=0,B=0;
      var lum='.,-~:;=!*#$@';
      var W=70,H=22;
      function frame(){
        if(!running)return;
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
        var out='';
        for(var k=0;k<W*H;k++){
          out+=k>0&&k%W===0?'\n':b[k];
        }
        pre.textContent=out;
        A+=0.04*sp;B+=0.02*sp;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Matrix Rain ────────────────────────────────
    function renderMatrix(){
      var cols=60;
      var drops=[];
      for(var i=0;i<cols;i++)drops.push({y:-Math.random()*20,speed:1+Math.random()*3});
      var glyphs='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEF';
      var rows=20;
      var trail=Math.max(2,Math.round(rows*0.5*ct));
      function frame(){
        if(!running)return;
        var grid=[];
        for(var r=0;r<rows;r++)grid.push(new Array(cols).fill(' '));
        for(var i=0;i<drops.length;i++){
          var d=drops[i];
          d.y+=d.speed*0.15*sp;
          if(d.y>=rows+trail){d.y=-trail-Math.random()*10;d.speed=1+Math.random()*3;}
          for(var t=0;t<trail&&d.y-t>=0&&d.y-t<rows;t++){
            var ch=glyphs[Math.floor(Math.random()*glyphs.length)];
            var bright=t<2?0.9:t<trail*0.3?0.6:0.3;
            if(Math.random()<bright)grid[Math.floor(d.y)-t][i]=ch;
          }
        }
        pre.textContent=grid.map(function(r){return r.join('');}).join('\n');
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Starfield ──────────────────────────────────
    function renderStars(){
      var stars=[];
      for(var i=0;i<200;i++){
        stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()*2+0.5});
      }
      var W=70,H=22;
      function frame(){
        if(!running)return;
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
        pre.textContent=rows.map(function(r){return r.join('');}).join('\n');
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Fire ───────────────────────────────────────
    function renderFire(){
      var W=70,H=22;
      var pixels=[];
      for(var i=0;i<W*H;i++)pixels.push(0);
      var lastTime=0;
      var frameInterval=Math.max(1,Math.round(3/sp));
      var frameCount=0;
      function frame(){
        if(!running)return;
        frameCount++;
        for(var x=0;x<W;x++){
          pixels[(H-1)*W+x]=Math.random()<0.3?35:0;
        }
        for(var y=0;y<H-1;y++){
          for(var x=0;x<W;x++){
            var v=0;
            if(x>0)v+=pixels[(y+1)*W+(x-1)];
            v+=pixels[(y+1)*W+x];
            if(x<W-1)v+=pixels[(y+1)*W+(x+1)];
            pixels[y*W+x]=Math.max(0,Math.round(v/3.2-Math.random()*0.5));
          }
        }
        var chars=' .,:;xX#';
        var out='';
        for(var y=0;y<H;y++){
          for(var x=0;x<W;x++){
            var v=Math.round(pixels[y*W+x]/ct);
            out+=v<chars.length?chars[v>=0?v:0]:'#';
          }
          out+='\n';
        }
        pre.textContent=out;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Boids / Flocking ────────────────────────────
    // (placeholder for future)

    // Start selected animation
    var lum='.,-~:;=!*#$@';
    function startAnim(){
      if(_timer){cancelAnimationFrame(_timer);_timer=null;}
      switch(sec.anim){
        case'donut':renderDonut();break;
        case'matrix':renderMatrix();break;
        case'stars':renderStars();break;
        case'fire':renderFire();break;
        default:renderDonut();
      }
    }
    setTimeout(startAnim,100);

    // Cleanup
    card._asciiCleanup=function(){
      running=false;
      if(_timer){cancelAnimationFrame(_timer);_timer=null;}
    };
    card._asciiRestart=function(){running=true;startAnim();};
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Animation'));
    bd.appendChild(cpSelect([
      {value:'donut',label:'Spinning Donut'},
      {value:'matrix',label:'Matrix Rain'},
      {value:'stars',label:'Starfield'},
      {value:'fire',label:'Fire'},
    ],sec.anim||'donut',function(v){sec.anim=v;if(card._asciiRestart)card._asciiRestart();saveAndRefresh();}));
    bd.appendChild(cpRange('Speed',parseFloat(sec.speed)||1,0.1,5,function(v){sec.speed=parseFloat(v);card._asciiRestart();saveAndRefresh();}));
    bd.appendChild(cpRange('Contrast',parseFloat(sec.contrast)||1,0.2,3,function(v){sec.contrast=parseFloat(v);card._asciiRestart();saveAndRefresh();}));
  },
});
