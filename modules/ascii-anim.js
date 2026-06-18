/* ═══════════════════════════════════════════
   WarTab — ASCII Animations Module
   Pure terminal-style animations rendered
   in a <pre> element via requestAnimationFrame.
   ═══════════════════════════════════════════ */
registerModule('ascii-anim', {
  defaults: { anim:'donut', speed:1, height:4 },
  render: (sec,card,cw)=>{
    var pre=document.createElement('pre');pre.className='ascii-anim-pre';
    pre.style.cssText='margin:0;font-size:10px;line-height:1.15;white-space:pre;overflow:hidden;color:var(--accent);text-align:center;';
    var h=(sec.height||4)*48;pre.style.height=h+'px';
    var running=true,_timer;
    cw.appendChild(pre);

    // ── Spinning Donut ──────────────────────────────
    function renderDonut(){
      var A=0,B=0;
      var lum=".,-~:;=!*#$@";
      var W=70,H=22;
      function frame(){
        if(!running)return;
        var b=new Array(W*H);b.fill(' ');
        var z=new Array(W*H);z.fill(0);
        var rA,rB,ci,co,si,so,ei,eo,D,l,m,n,t,x,y,o,N;
        for(var j=0;j<6.28;j+=0.07){
          rA=Math.sin(j);rB=Math.cos(j);
          for(var i=0;i<6.28;i+=0.02){
            ci=Math.sin(i);co=Math.cos(i);
            si=Math.sin(A);so=Math.sin(j);
            ei=Math.cos(A);eo=Math.cos(j);
            D=1/(ci*(rB+2)*ei+so*si+5);
            l=co*(rB+2)*eo-si*so;
            m=Math.cos(B);n=Math.sin(B);
            t=ci*(rB+2)*si-so*ei;
            x=Math.round(35+30*D*(l*m-t*n));
            y=Math.round(12+15*D*(l*n+t*m));
            o=x+W*y;
            N=Math.round(8*((so*si-ci*rB*ei)*m-ci*rB*si-so*ei-co*rB*n));
            if(y>=0&&y<H&&x>=0&&x<W&&D>z[o]){
              z[o]=D;b[o]=lum[N>0?N:0];
            }
          }
        }
        var out='';
        for(var k=0;k<W*H;k++){
          out+=k%W===0?'\n':b[k];
        }
        pre.textContent=out;
        A+=0.04*sec.speed;B+=0.02*sec.speed;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Matrix Rain ────────────────────────────────
    function renderMatrix(){
      var cols=Math.floor((pre.offsetWidth||300)/8);
      if(cols<10)cols=30;
      var drops=new Array(cols);for(var i=0;i<cols;i++)drops[i]=1;
      var glyphs='ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789ABCDEF';
      var lines=Math.floor(h/15);if(lines<3)lines=10;
      function frame(){
        if(!running)return;
        var out='';
        for(var l=0;l<lines;l++){
          for(var i=0;i<drops.length;i++){
            var ch=glyphs[Math.floor(Math.random()*glyphs.length)];
            out+=drops[i]>l+1&&Math.random()>0.3?ch:' ';
            if(l===lines-1){
              drops[i]+=0.5*sec.speed;
              if(drops[i]>30||(drops[i]>5&&Math.random()<0.02))drops[i]=0;
              if(Math.random()<0.005*sec.speed)drops[i]=1;
            }
          }
          out+='\n';
        }
        pre.textContent=out;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // ── Starfield ──────────────────────────────────
    function renderStars(){
      var numStars=100;
      var stars=[];
      for(var i=0;i<numStars;i++){
        stars.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random()});
      }
      var W=70,H=22;
      function frame(){
        if(!running)return;
        var rows=[];
        for(var i=0;i<H;i++)rows.push(new Array(W).fill(' '));
        for(var i=0;i<stars.length;i++){
          var s=stars[i];
          s.z-=0.02*sec.speed;
          if(s.z<=0){s.x=Math.random()*2-1;s.y=Math.random()*2-1;s.z=1;}
          var px=Math.round(W/2+s.x/s.z*30);
          var py=Math.round(H/2+s.y/s.z*15);
          if(px>=0&&px<W&&py>=0&&py<H){
            var b=Math.max(0,Math.min(10,Math.round((1-s.z)*10)));
            rows[py][px]='.,-~:;=!*#$@'[b];
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
      function frame(){
        if(!running)return;
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
            var v=pixels[y*W+x];
            out+=v<7?chars[v]:'#';
          }
          out+='\n';
        }
        pre.textContent=out;
        _timer=requestAnimationFrame(frame);
      }
      _timer=requestAnimationFrame(frame);
    }

    // Start selected animation
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
    startAnim();

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
    bd.appendChild(cpRange('Speed',parseFloat(sec.speed)||1,0.1,3,function(v){sec.speed=parseFloat(v);if(card._asciiRestart)card._asciiRestart();saveAndRefresh();}));
    bd.appendChild(cpRange('Height',sec.height||4,2,8,function(v){sec.height=parseInt(v);saveAndRefresh();}));
  },
});
