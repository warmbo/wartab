registerModule('clock', {
  defaults: { format24h:false, showDate:true, showCalendar:false },
  css: `
    .clock-time{font-size:var(--text-3xl);font-weight:200;letter-spacing:2px;font-variant-numeric:tabular-nums;text-shadow:var(--emboss-shadow);}
    .clock-date{color:var(--text-secondary);margin-top:var(--space-1);letter-spacing:1px;text-transform:uppercase;font-size:var(--text-xs);}
    .calendar-widget{margin-top:var(--space-2);font-size:var(--text-xs);}
    .calendar-month{text-align:center;font-weight:600;margin-bottom:var(--space-1);color:var(--text-secondary);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.5px;}
    .calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;text-align:center;}
    .calendar-day-header{font-size:var(--text-3xs);color:var(--text-tertiary);padding:2px 0;text-transform:uppercase;}
    .calendar-day{padding:3px 0;font-variant-numeric:tabular-nums;transition:background var(--anim-fast);}
    .calendar-day.today{background:var(--accent-glass);color:var(--text-primary);font-weight:600;}
    .calendar-day.other-month{color:var(--text-tertiary);opacity:0.4;}
    .clock-extras{font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-2);text-align:center;}
    /* Clock calendar fix: ensure calendar-month is hidden when showCalendar is set to false on page settings */
    .clock-widget[data-show-calendar="0"] .calendar-widget{display:none !important;}

    [data-mod-scale="small"] .clock-time{font-size:var(--text-2xl);}
    [data-mod-scale="large"] .clock-time{font-size:var(--text-4xl);}
    [data-mod-height="small"] .clock-date{display:none;}
    [data-mod-height="small"] .calendar-widget{display:none;}
    [data-mod-height="small"] .clock-extras{display:none;}
    [data-mod-height="medium"] .clock-extras{display:none;}
  `,
  render: function(sec, card, cw) {
    var w = document.createElement('div');
    w.className = 'clock-widget';
    w.dataset.showCalendar = sec.showCalendar ? '1' : '0';

    /* Always visible: time */
    var timeEl = document.createElement('div');
    timeEl.className = 'clock-time';
    timeEl.textContent = '--:--';
    w.appendChild(timeEl);

    /* Date: visible when showDate AND card height >= 2 */
    var dateEl = document.createElement('div');
    dateEl.className = 'clock-date';
    if (sec.showDate) {
      dateEl.style.display = ds.showHide('medium', card.height);
    } else {
      dateEl.style.display = 'none';
    }
    w.appendChild(dateEl);

    /* Extras (week/day-of-year): visible at height >= 3 */
    var extras = document.createElement('div');
    extras.className = 'clock-extras';
    extras.style.display = ds.showHide('large', card.height);
    w.appendChild(extras);

    /* Calendar: visible when showCalendar=true OR card height >= 2 */
    var calEl = document.createElement('div');
    calEl.className = 'calendar-widget';
    calEl.id = 'cal-' + sec.id;
    if (sec.showCalendar) {
      calEl.style.display = ds.showHide('medium', card.height);
    } else {
      calEl.style.display = 'none';
    }
    w.appendChild(calEl);

    cw.appendChild(w);

    card._cleanup = function() {
      if (card._clockInterval) { clearInterval(card._clockInterval); card._clockInterval = null; }
    };
  },
  onMount: function(sec, card, cw) {
    var w = cw.querySelector('.clock-widget');
    if (!w) return;

    function tick() {
      if (!cw.isConnected) return;
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      var timeStr;
      if (sec.format24h) {
        timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      } else {
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        timeStr = h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
      }

      var timeEl = w.querySelector('.clock-time');
      if (timeEl) timeEl.textContent = timeStr;

      var dateEl = w.querySelector('.clock-date');
      if (dateEl && sec.showDate && dateEl.style.display !== 'none') {
        dateEl.textContent = now.toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }).toUpperCase();
      }

      /* Extras */
      var extrasEl = w.querySelector('.clock-extras');
      if (extrasEl && card.height >= 3) {
        var startOfYear = new Date(now.getFullYear(), 0, 0);
        var diff = now - startOfYear;
        var dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        var weekNum = Math.ceil((dayOfYear + new Date(now.getFullYear(), 0, 1).getDay()) / 7);
        extrasEl.textContent = 'Week ' + weekNum + ' \u00b7 Day ' + dayOfYear;
      }

      /* Calendar */
      var calEl = w.querySelector('.calendar-widget');
      if (calEl && calEl.style.display !== 'none') {
        var year = now.getFullYear();
        var month = now.getMonth();
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = now.getDate();

        var months = ['January','February','March','April','May','June','July',
          'August','September','October','November','December'];
        var html = '<div class="calendar-month">' + months[month] + ' ' + year + '</div>';
        html += '<div class="calendar-grid">';
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d) {
          html += '<div class="calendar-day-header">' + d + '</div>';
        });
        for (var i = 0; i < firstDay; i++) {
          html += '<div class="calendar-day other-month"></div>';
        }
        for (var d = 1; d <= daysInMonth; d++) {
          html += '<div class="calendar-day' + (d === today ? ' today' : '') + '">' + d + '</div>';
        }
        html += '</div>';
        calEl.innerHTML = html;
      }
    }

    tick();
    card._clockInterval = setInterval(tick, 10000);
  },
  settings: [
    { name:'format24h', label:'Format', type:'select', options:[{value:false,label:'12-hour'},{value:true,label:'24-hour'}], default:false, structural:true },
    { name:'showDate', label:'Show date', type:'checkbox', default:true, structural:true },
    { name:'showCalendar', label:'Show calendar', type:'checkbox', default:false, structural:true },
  ],
});
