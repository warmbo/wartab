registerModule('clock', {
  defaults: { format24h:false, showDate:true, showCalendar:false },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='clock-widget';
    w.dataset.format24=sec.format24h?'1':'0';w.dataset.showDate=sec.showDate?'1':'0';w.dataset.showCalendar=sec.showCalendar?'1':'0';
    w.innerHTML='<div class="clock-time">--:--</div><div class="clock-date"></div>';
    if(sec.showCalendar){const c=document.createElement('div');c.className='calendar-widget';c.id='cal-'+sec.id;w.appendChild(c);}
    cw.appendChild(w);
  },
  settings: [
    { name:'format24h', label:'Format', type:'select', options:[{value:false,label:'12-hour'},{value:true,label:'24-hour'}], default:false, structural:true },
    { name:'showDate', label:'Show date', type:'checkbox', default:true, structural:true },
    { name:'showCalendar', label:'Show calendar', type:'checkbox', default:false, structural:true },
  ],
});
