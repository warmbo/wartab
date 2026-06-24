registerModule('weather', {
  defaults: { apiKey:'', zip:'', country:'US', units:'imperial', refreshInterval:600 },
  render: (sec,card,cw)=>{
    if(!document.getElementById('weather-skeleton-style')){
      const s=document.createElement('style');s.id='weather-skeleton-style';
      s.textContent='@keyframes skeleton-pulse{0%,to{opacity:.4}50%{opacity:.8}}.skeleton-pulse{animation:skeleton-pulse 1.5s ease-in-out infinite;border-radius:4px;background:var(--surface-border);color:transparent!important;display:inline-block;pointer-events:none;user-select:none;min-width:40px;}.weather-widget .skeleton-pulse{min-height:1em;}';
      document.head.appendChild(s);
    }
    const w=document.createElement('div');w.className='weather-widget';w.style.textAlign='center';w.dataset.apiKey=sec.apiKey||'';w.dataset.zip=sec.zip||'';w.dataset.country=sec.country||'US';w.dataset.units=sec.units||'imperial';w.dataset.refresh=sec.refreshInterval||600;
    w._card=card;
    const iconRow=document.createElement('div');iconRow.className='weather-main';
    const iconEl=document.createElement('i');iconEl.className='weather-icon';iconEl.setAttribute('data-lucide','cloud');iconRow.appendChild(iconEl);
    const tempWrap=document.createElement('div');tempWrap.style.cssText='display:flex;flex-direction:column;align-items:flex-start;';
    const tempEl=document.createElement('div');tempEl.className='weather-temp skeleton-pulse';tempEl.textContent='--°';tempWrap.appendChild(tempEl);
    const feelsEl=document.createElement('div');feelsEl.className='weather-feels';feelsEl.style.cssText='font-size:var(--text-xs);color:var(--text-tertiary);display:none;';tempWrap.appendChild(feelsEl);
    iconRow.appendChild(tempWrap);
    w.appendChild(iconRow);
    const descEl=document.createElement('div');descEl.className='weather-detail skeleton-pulse';descEl.textContent='Loading...';w.appendChild(descEl);
    const windEl=document.createElement('div');windEl.className='weather-wind';windEl.style.cssText='font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px;display:flex;align-items:center;gap:4px;';
    const windIcon=document.createElement('i');windIcon.setAttribute('data-lucide','wind');windIcon.style.cssText='width:12px;height:12px;';windEl.appendChild(windIcon);
    const windVal=document.createElement('span');windVal.className='weather-wind-val skeleton-pulse';windVal.textContent='--';windEl.appendChild(windVal);
    w.appendChild(windEl);
    const fcEl=document.createElement('div');fcEl.className='weather-forecast';fcEl.textContent='';w.appendChild(fcEl);
    const tsEl=document.createElement('div');tsEl.className='weather-ts';tsEl.textContent='';w.appendChild(tsEl);
    cw.appendChild(w);
    card._cleanup=()=>{
      if(card._weatherInterval){clearInterval(card._weatherInterval);card._weatherInterval=null;}
      const ws=document.getElementById('weather-skeleton-style');
      if(ws&&document.querySelectorAll('.weather-widget').length<=1)ws.remove();
    };
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('API Key'));
    bd.appendChild(cpInput('OpenWeatherMap API key',sec.apiKey||'',v=>{sec.apiKey=v;saveConfig();}));
    bd.appendChild(cpLabel('Zip Code'));
    bd.appendChild(cpInput('e.g. 90210',sec.zip||'',v=>{sec.zip=v;saveConfig();}));
    bd.appendChild(cpLabel('Country Code'));
    bd.appendChild(cpInput('US',sec.country||'US',v=>{sec.country=v;saveConfig();}));
    bd.appendChild(cpLabel('Units'));
    bd.appendChild(cpSelect([{value:'imperial',label:'°F'},{value:'metric',label:'°C'},{value:'standard',label:'K'}],sec.units||'imperial',v=>{sec.units=v;saveConfig();}));
    bd.appendChild(cpRange('Refresh (s)', sec.refreshInterval||600, 30, 1800, v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
  },
});
