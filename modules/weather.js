/* ═══════════════════════════════════════════
   WarTab — Weather Module
   Open-Meteo (free, no API key) with full
   design system integration.
   ═══════════════════════════════════════════ */

registerModule('weather', {
  defaults: { zip:'', country:'US', units:'celsius' },
  css: `
    /* ── Alignment (all elements use --mod-justify / --mod-align) ── */
    .weather-main{display:flex;align-items:center;justify-content:var(--mod-justify,center);gap:calc(20px * var(--mod-df,1));padding:calc(8px * var(--mod-df,1)) 0;}
    .weather-wind-row{display:flex;align-items:center;justify-content:var(--mod-justify,flex-start);gap:calc(6px * var(--mod-df,1));font-size:calc(var(--text-sm) * var(--mod-font-secondary,1));color:var(--text-tertiary);margin-top:calc(4px * var(--mod-df,1));}
    .weather-forecast{display:flex;gap:calc(16px * var(--mod-df,1));flex-wrap:wrap;justify-content:var(--mod-justify,center);padding:calc(8px * var(--mod-df,1)) 0;}

    /* ── Typography (--mod-font-title/content/secondary multipliers) ── */
    .weather-temp{font-size:calc(var(--text-4xl) * var(--mod-font-content,1));font-weight:700;line-height:1;letter-spacing:-1px;}
    .weather-feels{font-size:calc(var(--text-sm) * var(--mod-font-secondary,1));color:var(--text-tertiary);margin-top:2px;}
    .weather-detail{font-size:calc(var(--text-sm) * var(--mod-font-secondary,1));color:var(--text-secondary);}
    .weather-fc-day .day{font-weight:600;color:var(--text-secondary);font-size:calc(var(--text-xs) * var(--mod-font-secondary,1));letter-spacing:0.5px;}
    .weather-fc-temp{font-size:calc(var(--text-sm) * var(--mod-font-content,1));color:var(--text-primary);font-weight:600;}

    /* ── Layout containers ── */
    .weather-fc-day{text-align:center;display:flex;flex-direction:column;align-items:center;gap:calc(4px * var(--mod-df,1));color:var(--text-tertiary);}
    .weather-temp-wrap{display:flex;flex-direction:column;align-items:center;}
    .weather-secondary-wrap{display:flex;flex-direction:column;gap:calc(6px * var(--mod-df,1));}

    /* ── Icons (size controlled by scale, not density) ── */
    .weather-icon-main{width:56px;height:56px;flex-shrink:0;}
    .weather-icon-wind{width:14px;height:14px;}
    .weather-fc-icon{width:28px;height:28px;display:block;margin:2px auto;}

    /* ══════ Scale: small ══════ */
    [data-mod-scale="small"] .weather-temp{font-size:calc(var(--text-3xl) * var(--mod-font-content,1));}
    [data-mod-scale="small"] .weather-icon-main{width:40px;height:40px;}
    [data-mod-scale="small"] .weather-fc-icon{width:22px;height:22px;}
    [data-mod-scale="small"] .weather-icon-wind{width:12px;height:12px;}
    [data-mod-scale="small"] .weather-forecast{gap:calc(12px * var(--mod-df,1));}

    /* ══════ Scale: large ══════ */
    [data-mod-scale="large"] .weather-temp{font-size:calc(var(--text-5xl) * var(--mod-font-content,1));}
    [data-mod-scale="large"] .weather-icon-main{width:72px;height:72px;}
    [data-mod-scale="large"] .weather-fc-icon{width:34px;height:34px;}
    [data-mod-scale="large"] .weather-icon-wind{width:16px;height:16px;}
    [data-mod-scale="large"] .weather-forecast{gap:calc(20px * var(--mod-df,1));}
    [data-mod-scale="large"] .weather-fc-temp{font-size:calc(var(--text-base) * var(--mod-font-content,1));}
    [data-mod-scale="large"] .weather-wind-row{font-size:calc(var(--text-base) * var(--mod-font-secondary,1));}

    /* ══════ Height: large ══════ */
    [data-mod-height="large"] .weather-forecast{gap:20px;}
    [data-mod-height="large"] .weather-fc-icon{width:32px;height:32px;}
    [data-mod-height="large"] .weather-main{gap:24px;padding:10px 0;}

    /* ══════ Height: expanded ══════ */
    [data-mod-height="expanded"] .weather-forecast{gap:24px;}
    [data-mod-height="expanded"] .weather-fc-icon{width:36px;height:36px;}
    [data-mod-height="expanded"] .weather-main{gap:28px;padding:14px 0;}
  `,
  render: function(sec, card, cw) {
    /* ── Phase 1: Skeleton using design system ── */
    var frame = ds.card({
      content: ds.loading(3, 'bar'),
      secondary: ds.loading(4, 'bar'),
    });
    frame.dataset.weatherReady = '0';
    cw.appendChild(frame);

    card._cleanup = function() {
      if (card._weatherInterval) { clearInterval(card._weatherInterval); card._weatherInterval = null; }
    };
  },

  onMount: function(sec, card, cw) {
    var frame = cw.querySelector('.ds-module');
    if (!frame) return;

    var _cachedLat = null, _cachedLon = null;

    function fetchWeather() {
      var zip = sec.zip, country = sec.country || 'US';
      /* ── Empty state: no zip configured ── */
      if (!zip) {
        var emptyEl = ds.empty('map-pin', 'No location set',
          'Add your zip code in the card editor.', {
            label: 'Edit card',
            onClick: function() { openCardEditPanel(card.id); }
          });
        frame.innerHTML = '';
        frame.appendChild(emptyEl);
        return;
      }

      if (_cachedLat && _cachedLon) {
        doFetch(_cachedLat, _cachedLon);
        return;
      }

      /* ── Geocode zip → lat/lon ── */
      var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(zip) + '&count=1&country=' + encodeURIComponent(country);

      /* ── Loading state: show skeleton ── */
      if (frame.dataset.weatherReady !== '1') {
        frame.innerHTML = '';
        frame.appendChild(ds.loading(3, 'bar'));
      }

      fetch(geoUrl).then(function(r) { return r.json(); }).then(function(geo) {
        if (!geo.results || !geo.results.length) {
          var errEl = ds.error('Location "' + zip + '" not found in ' + country,
            'Check zip/postal code and country code in card editor.', {
              label: 'Edit',
              onClick: function() { openCardEditPanel(card.id); }
            });
          frame.innerHTML = '';
          frame.appendChild(errEl);
          return;
        }
        _cachedLat = geo.results[0].latitude;
        _cachedLon = geo.results[0].longitude;
        doFetch(_cachedLat, _cachedLon);
      }).catch(function(err) {
        var errEl = ds.error('Geocoding failed', 'Open-Meteo geocoding service unreachable.', {
          label: 'Retry',
          onClick: fetchWeather
        });
        frame.innerHTML = '';
        frame.appendChild(errEl);
        console.error('Open-Meteo geocoding failed:', err);
      });
    }

    function doFetch(lat, lon) {
      var isF = sec.units === 'fahrenheit';
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' +
        encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) +
        '&current_weather=true' +
        '&daily=temperature_2m_max,temperature_2m_min,weathercode' +
        '&timezone=auto' +
        (isF ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&wind_speed_unit=kmh');

      /* ── Loading indicator on refresh ── */
      var oldContent = frame.querySelector('.ds-module-content');
      if (!oldContent && frame.dataset.weatherReady === '0') {
        frame.innerHTML = '';
        frame.appendChild(ds.loading(3, 'bar'));
      }

      fetch(url).then(function(r) { return r.json(); }).then(function(d) {
        if (!cw.isConnected) return;
        var cwData = d.current_weather;
        if (!cwData) throw new Error('No weather data');

        var temp = Math.round(cwData.temperature);
        var code = cwData.weathercode || 0;
        var wind = cwData.windspeed || 0;
        var unit = isF ? '°F' : '°C';

        var iconMap = {
          0: 'sun', 1: 'sun', 2: 'cloud-sun',
          3: 'cloud',
          45: 'cloud-fog', 48: 'cloud-fog',
          51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-drizzle',
          61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
          71: 'cloud-snow', 73: 'cloud-snow', 75: 'cloud-snow',
          77: 'cloud-snow',
          80: 'cloud-drizzle', 81: 'cloud-rain', 82: 'cloud-rain',
          85: 'cloud-snow', 86: 'cloud-snow',
          95: 'cloud-lightning', 96: 'cloud-lightning', 99: 'cloud-lightning'
        };
        var wmoDescs = {
          0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
          45: 'Foggy', 48: 'Foggy',
          51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
          61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
          71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
          77: 'Snow grains',
          80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
          85: 'Light snow showers', 86: 'Snow showers',
          95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
        };

        var icon = iconMap[code] || 'cloud';
        var desc = wmoDescs[code] || '';

        /* ── Build primary content ── */
        var contentEl = document.createElement('div');
        contentEl.className = 'weather-main';

        var iconEl = document.createElement('i');
        iconEl.setAttribute('data-lucide', icon);
        iconEl.className = 'weather-icon-main';
        contentEl.appendChild(iconEl);

        var tempWrap = document.createElement('div');
        tempWrap.className = 'weather-temp-wrap';
        var tempEl = document.createElement('div');
        tempEl.className = 'weather-temp';
        tempEl.textContent = temp + unit;
        tempWrap.appendChild(tempEl);

        var feelsEl = document.createElement('div');
        feelsEl.className = 'weather-feels';
        // Replace plain text desc with a badge
        var badgeVariant = 'info';
        if (code >= 95) badgeVariant = 'error';       // thunderstorm
        else if (code >= 71) badgeVariant = 'info';    // snow
        else if (code >= 61) badgeVariant = 'warning'; // rain
        else if (code >= 51) badgeVariant = 'warning'; // drizzle
        else if (code >= 45) badgeVariant = ''; // fog
        if (badgeVariant) feelsEl.appendChild(ds.badge(desc, badgeVariant));
        else feelsEl.appendChild(ds.badge(desc));
        tempWrap.appendChild(feelsEl);
        contentEl.appendChild(tempWrap);

        /* ── Wind row ── */
        var windRow = document.createElement('div');
        windRow.className = 'weather-wind-row';
        var windIcon = document.createElement('i');
        windIcon.setAttribute('data-lucide', 'wind');
        windIcon.className = 'weather-icon-wind';
        windRow.appendChild(windIcon);
        windRow.appendChild(document.createTextNode(wind + (isF ? ' mph' : ' km/h')));

        /* ── Build secondary content (forecast) ── */
        var secondaryEl = document.createElement('div');
        secondaryEl.className = 'weather-secondary-wrap';

        var daily = d.daily;
        if (daily && daily.temperature_2m_max) {
          var fcEl = document.createElement('div');
          fcEl.className = 'weather-forecast';
          var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          var today = new Date().getDay();
          var maxTemps = daily.temperature_2m_max;
          var wCodes = daily.weathercode || [];
          for (var i = 0; i < Math.min(maxTemps.length, 5); i++) {
            var dayEl = document.createElement('div');
            dayEl.className = 'weather-fc-day';
            var dName = document.createElement('div');
            dName.className = 'day';
            dName.textContent = i === 0 ? 'Now' : days[(today + i) % 7];
            var fIcon = document.createElement('i');
            fIcon.setAttribute('data-lucide', iconMap[wCodes[i]] || 'cloud');
            fIcon.className = 'weather-fc-icon';
            var ft = document.createElement('div');
            ft.className = 'weather-fc-temp';
            ft.textContent = Math.round(maxTemps[i]) + '°';
            dayEl.appendChild(dName);
            dayEl.appendChild(fIcon);
            dayEl.appendChild(ft);
            fcEl.appendChild(dayEl);
          }
          secondaryEl.appendChild(fcEl);
        }

        /* ── Timestamp ── */
        var ts = cwData.time ? new Date(cwData.time + 'Z') : new Date();
        var tsEl = ds.timestamp(ts.getTime());
        secondaryEl.appendChild(tsEl);

        /* ── Assemble using design system ── */
        frame.innerHTML = '';
        frame.dataset.weatherReady = '1';
        var newCard = ds.card({
          icon: null,
          content: [contentEl, windRow],
          secondary: secondaryEl
        });
        frame.appendChild(newCard);
        renderIcons();

      }).catch(function(err) {
        if (!cw.isConnected) return;
        var errEl = ds.error('Weather fetch failed', err.message || 'Check network connection.', {
          label: 'Retry',
          onClick: fetchWeather
        });
        frame.innerHTML = '';
        frame.appendChild(errEl);
      });
    }

    /* ── Start fetch ── */
    fetchWeather();

    /* ── Refresh every 10 minutes ── */
    card._weatherInterval = setInterval(fetchWeather, 600000);
  },
  settings: [
    { name:'zip', label:'Zip / Postal Code', type:'text', placeholder:'90210', default:'' },
    { name:'country', label:'Country Code', type:'text', placeholder:'US', default:'US' },
    { name:'units', label:'Units', type:'select', options:[{value:'celsius',label:'°C'},{value:'fahrenheit',label:'°F'}], default:'celsius' },
  ],
});
