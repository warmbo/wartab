/* ═══════════════════════════════════════════
   WarTab — Digital Pet Module
   Front-facing cat with room,
   mood expressions, network speech,
   blink eyes, and tail wag.
   ═══════════════════════════════════════════ */
registerModule('digital-pet', {
  defaults: { petName:'', hunger:80, happiness:80, waste:10, lastFed:Date.now(), lastPetted:Date.now(), lastCleaned:Date.now() },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='dp-container';
    w.dataset.secId=sec.id;
    // Front-facing cat — 11x5, moves side-to-side
    var C='  /\\_/\\  ( \n ( ^.^ ) _)\n   \\"/  (   \n ( | | )   \n(__d b__)  ';
    var eyes={idle:'^',blink:'-',happy:'*',love:'♥',curious:'O',hungry:'o',sad:';',dead:'x',angry:'#'};
    var _mood='idle',_walking=false,_lastX=50,_blink=false,_wag=false;
    // Top bar
    const top=document.createElement('div');top.className='dp-top';
    const nameEl=document.createElement('span');nameEl.className='dp-name';nameEl.textContent=sec.petName||'cat';top.appendChild(nameEl);
    const moodLabel=document.createElement('span');moodLabel.className='dp-mood-label';top.appendChild(moodLabel);
    w.appendChild(top);
    // Room — walls, door, window, floor, cat
    const pen=document.createElement('div');pen.className='dp-pen';
    const floor=document.createElement('div');floor.className='dp-floor';pen.appendChild(floor);
    // Hallway perspective floor between doorway and main floor
    const hfloor=document.createElement('div');hfloor.className='dp-hallway-floor';pen.appendChild(hfloor);
    // Perspective lines inside the hallway floor (closer together near door)
    var lineHeights=[2,8,15,23,32,42,53];
    for(var i=0;i<lineHeights.length;i++){
      var fl=document.createElement('div');fl.className='dp-floor-line';
      fl.style.top=lineHeights[i]+'px';fl.style.position='absolute';
      fl.style.left='0';fl.style.width='100%';fl.style.height='1px';
      fl.style.background='rgba(255,255,255,0.05)';fl.style.pointerEvents='none';
      hfloor.appendChild(fl);
    }
    // Floor inside the doorway opening
    const dwfloor=document.createElement('div');dwfloor.className='dp-doorway-floor';pen.appendChild(dwfloor);
    const doorway=document.createElement('div');doorway.className='dp-doorway';pen.appendChild(doorway);
    const door=document.createElement('div');door.className='dp-door';pen.appendChild(door);
    const windowEl=document.createElement('div');windowEl.className='dp-window';pen.appendChild(windowEl);
    const sillEl=document.createElement('div');sillEl.className='dp-window-sill';pen.appendChild(sillEl);
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
    var _sayTimer,_walkTimer,_blinkTimer,_wagTimer;
    function fetchNetFact(){
      storage.getStats('local', '').then(function(d){
        var facts=[];
        if(d.hostname)facts.push('Hello, '+d.hostname+' here!');
        if(d.uptime&&d.uptime.string)facts.push("I've been up "+d.uptime.string+" ... getting sleepy.");
        if(typeof d.cpu==='number'){
          if(d.cpu>80)facts.push('CPU is '+d.cpu+"% ... that's hot!");
          else if(d.cpu<10)facts.push('CPU is only '+d.cpu+'% ... so quiet.');
          else facts.push("CPU chillin' at "+d.cpu+'%.');
        }
        if(d.memory){
          var memPct = d.memory.percent !== undefined ? d.memory.percent :
            (d.memory.total > 0 ? Math.round(d.memory.active / d.memory.total * 100) : 0);
          if(memPct>80)facts.push('RAM is '+memPct+"% full ... need more sticks!");
          else if(memPct<30)facts.push('Plenty of RAM free ... '+memPct+'% used.');
          else facts.push('Memory looking good at '+memPct+'%.');
        }
        if(d.disks&&d.disks[0]){
          var diskPct = d.disks[0].percent !== undefined ? d.disks[0].percent :
            (d.disks[0].total > 0 ? Math.round(d.disks[0].used / d.disks[0].total * 100) : 0);
          if(diskPct>90)facts.push('Disk is '+diskPct+"% full ... yikes!");
          else if(diskPct>70)facts.push('Disk at '+diskPct+"% ... might want to clean up.");
          else facts.push('Disk has plenty of space ... '+diskPct+'% used.');
        }
        facts.push('The network looks good.');
        facts.push("What's going on with 10.0.0.x?");
        if(d.hostname)facts.push(d.hostname+' is alive and well.');
        speak(facts[Math.floor(Math.random()*facts.length)]);
      }).catch(function(e){
        if(e&&e.retry){
          setTimeout(fetchNetFact,60000);
          return;
        }
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
    // Perspective shift
    function updatePerspective(x){
      var pw=pen.offsetWidth||260;
      var pct=x/(pw-80);
      if(pct<0)pct=0;if(pct>1)pct=1;
      windowEl.style.right=(6+pct*12)+'px';
      windowEl.style.opacity=(0.3+pct*0.5)+'';
      sillEl.style.right=(6+pct*12-2)+'px';
      sillEl.style.opacity=(0.3+pct*0.5)+'';
      door.style.left=(4+(1-pct)*10)+'px';
      door.style.opacity=(0.3+(1-pct)*0.5)+'';
      doorway.style.left=(2+(1-pct)*10)+'px';
      doorway.style.opacity=(0.3+(1-pct)*0.5)+'';
      hfloor.style.opacity=(0.3+(1-pct)*0.5)+'';
      dwfloor.style.opacity=(0.3+(1-pct)*0.5)+'';
    }
    // Render cat with mood eyes, blink, and tail wag
    function setFrame(){
      var ec=_blink?'-':(eyes[_mood]||'^');
      var txt=C.replace(/\^/g,ec);
      if(_wag) txt=txt.replace('d','\x00').replace('b','d').replace('\x00','b');
      creature.textContent=txt;
    }
    // Glide to new position
    function startWalk(){
      if(_walking)return;_walking=true;
      var pw=pen.offsetWidth||260,ph=pen.offsetHeight||180;
      var nx=Math.random()*(pw-80);
      var ny=ph-24-82+Math.random()*8;
      _lastX=nx;
      creature.style.left=nx+'px';creature.style.top=ny+'px';
      updatePerspective(nx);
      setFrame();
      clearTimeout(_walkTimer);
      _walkTimer=setTimeout(function(){_walking=false;},2600);
    }
    // Update mood
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
      if(moodKey!==_mood){_mood=moodKey;}
      moodLabel.textContent=moodTxt;
      setFrame();
    }
    updateAll();
    setInterval(updateAll,5000);
    startWalk();
    var walkTimer=setInterval(function(){
      if(!_walking)startWalk();
    },4500+Math.random()*2500);
    // Blink every 4s
    _blinkTimer=setInterval(function(){
      _blink=!_blink;
      if(!_walking)setFrame();
    },4000);
    // Tail wag every 600ms
    _wagTimer=setInterval(function(){
      _wag=!_wag;
      if(!_walking)setFrame();
    },600);
    card._cleanup=function(){
      if(walkTimer)clearInterval(walkTimer);
      if(_walkTimer)clearTimeout(_walkTimer);
      if(_sayTimer)clearInterval(_sayTimer);
      if(_blinkTimer)clearInterval(_blinkTimer);
      if(_wagTimer)clearInterval(_wagTimer);
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
