/* ═══════════════════════════════════════════
   WarTab — Digital Pet Module
   ASCII cat with walk cycle, room environment,
   mood expressions, and network speech.
   ═══════════════════════════════════════════ */
registerModule('digital-pet', {
  defaults: { petName:'', hunger:80, happiness:80, waste:10, lastFed:Date.now(), lastPetted:Date.now(), lastCleaned:Date.now() },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='dp-container';
    w.dataset.secId=sec.id;
    // Cat frames — 6-frame walk cycle + mood expressions, all 8×4 with tail
    var C={
      idle:[' /\\_/\\ \n( o o )~\n | Y |  \n |_|_|  '],
      blink:[' /\\_/\\ \n( - o )~\n | Y |  \n |_|_|  '],
      walk:[' /\\_/\\ \n( o o )~\n | Y |  \n |_|_|  ',' /\\_/\\ \n( o o )~\n | Y |  \n| |_|   ',' /\\_/\\ \n( o o )~\n | Y |  \n|_| |   ',' /\\_/\\ \n( o o )~\n | Y |  \n |_|_|  ',' /\\_/\\ \n( o o )~\n | Y |  \n  |_| | ',' /\\_/\\ \n( o o )~\n | Y |  \n | |_|  '],
      happy:[' /\\_/\\ \n( * * )~\n | Y |  \n |_|_|  '],
      love:[' /\\_/\\ \n( ♥ ♥ )~\n | Y |  \n |_|_|  '],
      curious:[' /\\_/\\ \n( o O )~\n | Y |  \n |_|_|  '],
      hungry:[' /\\_/\\ \n( o o )~\n | Y |  \n |_|_|  '],
      sad:[' /\\_/\\ \n( ;; )~\n | Y |  \n |_|_|  '],
      dead:[' /\\_/\\ \n( x x )~\n | Y |  \n |_|_|  '],
      angry:[' /\\_/\\ \n( # # )~\n | Y |  \n |_|_|  '],
    };
    var _mood='idle',_frame=0,_walking=false,_lastX=50;
    // Top bar
    const top=document.createElement('div');top.className='dp-top';
    const nameEl=document.createElement('span');nameEl.className='dp-name';nameEl.textContent=sec.petName||'cat';top.appendChild(nameEl);
    const moodLabel=document.createElement('span');moodLabel.className='dp-mood-label';top.appendChild(moodLabel);
    w.appendChild(top);
    // Room — walls, door, window, floor, cat
    const pen=document.createElement('div');pen.className='dp-pen';
    const floor=document.createElement('div');floor.className='dp-floor';pen.appendChild(floor);
    const door=document.createElement('div');door.className='dp-door';pen.appendChild(door);
    const windowEl=document.createElement('div');windowEl.className='dp-window';pen.appendChild(windowEl);
    const speech=document.createElement('div');speech.className='dp-speech';pen.appendChild(speech);
    const creature=document.createElement('pre');creature.className='dp-creature';pen.appendChild(creature);
    w.appendChild(pen);
    // Stats
    const stats=document.createElement('div');stats.className='dp-stats';
    function makeStat(label,getVal){
      const row=document.createElement('div');row.className='dp-stat-row';
      const lbl=document.createElement('span');lbl.className='dp-stat-lbl';lbl.textContent=label;row.appendChild(lbl);
      const bar=document.createElement('div');bar.className='dp-bar';
      const fill=document.createElement('div');fill.className='dp-fill';bar.appendChild(fill);row.appendChild(bar);
      const valEl=document.createElement('span');valEl.className='dp-val';row.appendChild(valEl);
      const upd=()=>{const v=Math.max(0,Math.min(100,getVal()));fill.style.width=v+'%';fill.style.background=v>50?'var(--accent)':'rgba(200,80,80,0.5)';valEl.textContent=Math.round(v);};
      return {row,upd};
    }
    function elapsed(ts){return(Date.now()-(ts||Date.now()))/60000;}
    function curHunger(){return(sec.hunger||80)-elapsed(sec.lastFed)*2;}
    function curHappy(){return(sec.happiness||80)-elapsed(sec.lastPetted)*1;}
    function curWaste(){return(sec.waste||10)+elapsed(sec.lastCleaned)*0.5;}
    const hS=makeStat('Hunger',curHunger);stats.appendChild(hS.row);
    const haS=makeStat('Mood',curHappy);stats.appendChild(haS.row);
    const wS=makeStat('Dirt',curWaste);stats.appendChild(wS.row);
    w.appendChild(stats);
    // Actions
    const acts=document.createElement('div');acts.className='dp-actions';
    function mkBtn(label,onClick){const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent=label;b.addEventListener('click',function(e){e.stopPropagation();onClick();});acts.appendChild(b);}
    mkBtn('Feed',()=>{sec.lastFed=Date.now();sec.hunger=Math.min(100,(sec.hunger||80)+30);sec.happiness=Math.min(100,(sec.happiness||80)+5);sec.waste=Math.min(100,(sec.waste||10)+10);saveConfig();updateAll();});
    mkBtn('Pet',()=>{sec.lastPetted=Date.now();sec.happiness=Math.min(100,(sec.happiness||80)+20);saveConfig();updateAll();});
    mkBtn('Clean',()=>{sec.lastCleaned=Date.now();sec.waste=Math.max(0,(sec.waste||10)-40);saveConfig();updateAll();});
    w.appendChild(acts);
    cw.appendChild(w);
    // Network speech
    var _sayTimer,_frameTimer,_walkTimer;
    function fetchNetFact(){
      fetch('/api/stats').then(function(r){return r.json();}).then(function(d){
        var facts=[];
        if(d.hostname)facts.push('Hello, '+d.hostname+' here!');
        if(d.uptime)facts.push("I've been up "+d.uptime.string+" ... getting sleepy.");
        if(typeof d.cpu==='number'){
          if(d.cpu>80)facts.push('CPU is '+d.cpu+"% ... that's hot!");
          else if(d.cpu<10)facts.push('CPU is only '+d.cpu+'% ... so quiet.');
          else facts.push('CPU chillin\' at '+d.cpu+'%.');
        }
        if(d.memory){
          var m=Math.round(d.memory.percent);
          if(m>80)facts.push('RAM is '+m+"% full ... need more sticks!");
          else if(m<30)facts.push('Plenty of RAM free ... '+m+'% used.');
          else facts.push('Memory looking good at '+m+'%.');
        }
        if(d.disks&&d.disks[0]){
          var ds=Math.round(d.disks[0].percent);
          if(ds>90)facts.push('Disk is '+ds+"% full ... yikes!");
          else if(ds>70)facts.push('Disk at '+ds+"% ... might want to clean up.");
          else facts.push('Disk has plenty of space ... '+ds+'% used.');
        }
        facts.push('The network looks good.');
        facts.push("What's going on with 10.0.0.x?");
        if(d.hostname)facts.push(d.hostname+' is alive and well.');
        speak(facts[Math.floor(Math.random()*facts.length)]);
      }).catch(function(){
        var fb=["No signal... is the server okay?","Can't reach the network...","Hello? Anyone there?","The network is quiet... too quiet."];
        speak(fb[Math.floor(Math.random()*fb.length)]);
      });
    }
    function speak(msg){
      speech.textContent=msg;speech.classList.add('visible');
      clearTimeout(speech._hide);speech._hide=setTimeout(function(){speech.classList.remove('visible');},6000);
    }
    _sayTimer=setInterval(fetchNetFact,18000+Math.random()*12000);
    setTimeout(fetchNetFact,3000+Math.random()*4000);
    // Walk cycle — floor-constrained, with perspective
    function updatePerspective(x){
      var pw=pen.offsetWidth||260;
      var pct=x/(pw-80); // 0=left wall, 1=right wall
      if(pct<0)pct=0;if(pct>1)pct=1;
      windowEl.style.right=(6+pct*12)+'px';
      windowEl.style.opacity=(0.3+pct*0.5)+'';
      door.style.left=(4+(1-pct)*10)+'px';
      door.style.opacity=(0.3+(1-pct)*0.5)+'';
    }
    function startWalk(){
      if(_walking)return;_walking=true;
      var pw=pen.offsetWidth||260,ph=pen.offsetHeight||140;
      var nx=Math.random()*(pw-80);
      // Keep cat on the floor: sprite ~64px tall, pen 140px, floor 24px
      var ny=ph-24-62+Math.random()*8;
      _lastX=nx;
      creature.style.left=nx+'px';creature.style.top=ny+'px';
      updatePerspective(nx);
      // Animate walk frames
      var wf=0;
      if(_frameTimer)clearInterval(_frameTimer);
      _frameTimer=setInterval(function(){
        wf=(wf+1)%C.walk.length;
        creature.textContent=C.walk[wf];
      },380);
      clearTimeout(_walkTimer);
      _walkTimer=setTimeout(function(){
        _walking=false;
        if(_frameTimer){clearInterval(_frameTimer);_frameTimer=null;}
        setFrame();
      },2600);
    }
    function setFrame(){
      if(_walking)return;
      var frames=C[_mood]||C.idle;
      var txt;
      if(_mood==='idle'&&frames.length===1&&C.blink){
        txt=Math.random()<0.15?C.blink[0]:frames[0];
      }else{
        txt=frames[_frame%frames.length]||frames[0];
      }
      creature.textContent=txt;
    }
    // Update display
    function updateAll(){
      hS.upd();haS.upd();wS.upd();
      const h=Math.max(0,curHunger()),ha=Math.max(0,curHappy()),wa=Math.max(0,curWaste());
      var moodKey,moodTxt;
      if(h<=0||ha<=0){moodKey='dead';moodTxt='Dead';}
      else if(h<20&&ha<20){moodKey='angry';moodTxt='Angry';}
      else if(h<30){moodKey='hungry';moodTxt='Hungry';}
      else if(wa>70){moodKey='sad';moodTxt='Dirty';}
      else if(ha<30){moodKey='sad';moodTxt='Sad';}
      else if(ha>80&&h>65&&wa<30){moodKey='love';moodTxt='Loved';}
      else if(ha>65&&h>50){moodKey='happy';moodTxt='Happy';}
      else if(ha>40){moodKey='curious';moodTxt='Curious';}
      else{moodKey='idle';moodTxt=(sec.petName||'cat');}
      if(moodKey!==_mood){_mood=moodKey;_frame=0;}
      moodLabel.textContent=moodTxt;
      setFrame();
    }
    updateAll();
    setInterval(updateAll,5000);
    startWalk();
    var walkTimer=setInterval(function(){
      if(!_walking)startWalk();
    },4500+Math.random()*2500);
    card._dpCleanup=function(){
      if(walkTimer)clearInterval(walkTimer);
      if(_frameTimer)clearInterval(_frameTimer);
      if(_walkTimer)clearTimeout(_walkTimer);
      if(_sayTimer)clearInterval(_sayTimer);
    };
  },
  editor: (sec,card,bd)=>{
    const nr=document.createElement('div');nr.style.cssText='margin-bottom:10px;';
    nr.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Pet Name'));
    const ni=document.createElement('input');ni.type='text';ni.value=sec.petName||'';ni.placeholder='cat';ni.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    ni.addEventListener('change',()=>{sec.petName=ni.value;saveAndRefresh();});nr.appendChild(ni);bd.appendChild(nr);
    const rr=document.createElement('div');rr.style.cssText='margin-bottom:10px;';
    const rb=document.createElement('button');rb.className='btn btn-glass btn-sm btn-danger';rb.textContent='Reset Pet';
    rb.addEventListener('click',function(e){e.stopPropagation();const d=Date.now();sec.hunger=80;sec.happiness=80;sec.waste=10;sec.lastFed=d;sec.lastPetted=d;sec.lastCleaned=d;saveAndRefresh();});
    rr.appendChild(rb);bd.appendChild(rr);
  },
});
