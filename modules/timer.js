registerModule('timer', {
  defaults: { mode:'interval', duration:300, targetDate:'', label:'' },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.style.cssText='text-align:center;padding:8px 0;';
    w.dataset.secId=sec.id;
    const display=document.createElement('div');display.className='timer-display';
    display.style.cssText='font-size:var(--text-3xl);font-weight:200;letter-spacing:2px;font-variant-numeric:tabular-nums;font-family:var(--font);padding:8px 0;';
    display.textContent='--:--';
    w.appendChild(display);
    if(sec.mode==='countdown'){
      // ── Countdown / event timer ──
      const labelEl=document.createElement('div');labelEl.style.cssText='font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px;';
      if(sec.label)labelEl.textContent=sec.label;
      w.appendChild(labelEl);
      const info=document.createElement('div');info.className='timer-info';info.style.cssText='font-size:var(--text-2xs);color:var(--text-tertiary);margin-top:2px;';
      w.appendChild(info);
      function updateCountdown(){
        if(!sec.targetDate){display.textContent='--:--';info.textContent='Set target date in editor';return;}
        const now=Date.now(),target=new Date(sec.targetDate).getTime(),diff=target-now;
        if(diff<=0){display.textContent='★ EVENT PASSED ★';display.style.color='var(--accent)';info.textContent='Target was '+new Date(sec.targetDate).toLocaleDateString();return;}
        const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
        display.style.color='';display.textContent=d+'d '+String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s';
        info.textContent=diff>86400000?Math.floor(diff/86400000)+' days until' :'Today!';
      }
      updateCountdown();
      var _cdInterval=setInterval(updateCountdown,1000);
      card._cleanup=function(){clearInterval(_cdInterval);};
    } else {
      // ── Interval timer (existing behavior) ──
      const btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:6px;justify-content:center;margin-top:4px;';
      const startBtn=document.createElement('button');startBtn.className='btn btn-glass btn-sm';startBtn.textContent='▶ Start';
      const resetBtn=document.createElement('button');resetBtn.className='btn btn-glass btn-sm';resetBtn.textContent='↺ Reset';
      btnRow.appendChild(startBtn);btnRow.appendChild(resetBtn);w.appendChild(btnRow);
      let remaining=sec.duration||300;
      let interval=null;
      const fmt=s=>{const m=Math.floor(s/60);const s2=s%60;return String(m).padStart(2,'0')+':'+String(s2).padStart(2,'0');};
      const updateDisplay=()=>{display.textContent=fmt(remaining);if(remaining<=0){display.textContent='★ TIME UP ★';display.style.color='var(--accent)';}};
      const stop=()=>{if(interval){clearInterval(interval);interval=null;startBtn.textContent='▶ Start';}};
      const start=()=>{if(interval)return;if(remaining<=0){remaining=sec.duration||300;display.style.color='';}interval=setInterval(()=>{remaining--;updateDisplay();if(remaining<=0)stop();},1000);startBtn.textContent='⏸ Pause';};
      startBtn.addEventListener('click',()=>{if(interval)stop();else start();});
      resetBtn.addEventListener('click',()=>{showConfirmModal('Reset timer?',()=>{stop();remaining=sec.duration||300;display.style.color='';updateDisplay();},'Reset');});
      updateDisplay();
    }
    cw.appendChild(w);
    // Hint: flashes on complete
    var hint = document.createElement('div');
    hint.className = 'timer-hint';
    hint.textContent = 'Page title flashes when time is up';
    cw.appendChild(hint);
  },
  editor: (sec,card,bd)=>{
    const modeRow=document.createElement('div');modeRow.style.cssText='margin-bottom:10px;';
    modeRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Mode'));
    const modeSel=document.createElement('select');modeSel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';
    [{value:'interval',label:'Stopwatch / Interval'},{value:'countdown',label:'Countdown to Date'}].forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===(sec.mode||'interval'))opt.selected=true;modeSel.appendChild(opt);});
    modeRow.appendChild(modeSel);bd.appendChild(modeRow);
    const intervalFields=document.createElement('div');intervalFields.id='timer-interval-'+sec.id;
    const countdownFields=document.createElement('div');countdownFields.id='timer-cd-'+sec.id;countdownFields.style.display='none';
    // Interval fields
    const h=Math.floor((sec.duration||300)/3600),mm=Math.floor(((sec.duration||300)%3600)/60);
    const hSel=document.createElement('select');hSel.style.cssText='width:70px;padding:5px 6px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    for(let i=0;i<24;i++){const o=document.createElement('option');o.value=i;o.textContent=i+'h';if(i===h)o.selected=true;hSel.appendChild(o);}
    const mSel=document.createElement('select');mSel.style.cssText='width:70px;padding:5px 6px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;margin-left:8px;';
    for(let i=0;i<60;i+=5){const o=document.createElement('option');o.value=i;o.textContent=i+'m';if(i===mm)o.selected=true;mSel.appendChild(o);}
    const syncDuration=()=>{sec.duration=parseInt(hSel.value)*3600+parseInt(mSel.value)*60;saveAndRefresh();};
    hSel.addEventListener('change',syncDuration);mSel.addEventListener('change',syncDuration);
    const durRow=document.createElement('div');durRow.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:10px;';
    durRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-right:4px;','Duration'));
    durRow.appendChild(hSel);durRow.appendChild(mSel);intervalFields.appendChild(durRow);
    // Countdown fields
    const dateRow=document.createElement('div');dateRow.style.cssText='margin-bottom:10px;';
    dateRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Target Date'));
    const dtInp=document.createElement('input');dtInp.type='datetime-local';dtInp.value=sec.targetDate?sec.targetDate.slice(0,16):'';dtInp.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    dtInp.addEventListener('change',()=>{sec.targetDate=dtInp.value;saveAndRefresh();});
    dateRow.appendChild(dtInp);countdownFields.appendChild(dateRow);
    const labelRow=document.createElement('div');labelRow.style.cssText='margin-bottom:10px;';
    labelRow.appendChild(el('label','font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;display:block;','Event Label'));
    const lbInp=document.createElement('input');lbInp.type='text';lbInp.value=sec.label||'';lbInp.placeholder='e.g. Birthday';lbInp.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
    lbInp.addEventListener('change',()=>{sec.label=lbInp.value;saveAndRefresh();});
    labelRow.appendChild(lbInp);countdownFields.appendChild(labelRow);
    // Toggle visibility based on mode
    function toggleFields(){
      const isCd = (modeSel.value === 'countdown');
      intervalFields.style.display = isCd ? 'none' : '';
      countdownFields.style.display = isCd ? '' : 'none';
    }
    modeSel.addEventListener('change',()=>{sec.mode=modeSel.value;toggleFields();saveAndRefresh();});
    toggleFields();
    bd.appendChild(intervalFields);bd.appendChild(countdownFields);
  },
});
