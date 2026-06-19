registerModule('clock', {
  defaults: { format24h:false, showDate:true, showCalendar:false },
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;';
    const w=document.createElement('div');w.className='clock-widget';
    w.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;padding:8px 0;text-align:center;';
    w.dataset.format24=sec.format24h?'1':'0';w.dataset.showDate=sec.showDate?'1':'0';w.dataset.showCalendar=sec.showCalendar?'1':'0';
    w.innerHTML='<div class="clock-time">--:--</div><div class="clock-date"></div>';
    if(sec.showCalendar){const c=document.createElement('div');c.className='calendar-widget';c.id='cal-'+sec.id;w.appendChild(c);}
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    const g=document.createElement('div');g.className='me-check-group';
    g.appendChild(cpCheck('24hr',sec.format24h,v=>{sec.format24h=v;saveAndRefresh();}));
    g.appendChild(cpCheck('Show date',sec.showDate,v=>{sec.showDate=v;saveAndRefresh();}));
    g.appendChild(cpCheck('Show calendar',sec.showCalendar,v=>{sec.showCalendar=v;saveAndRefresh();}));
    bd.appendChild(g);
  },
});
