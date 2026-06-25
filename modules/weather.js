registerModule('weather', {
  defaults: { zip:'', country:'US', units:'celsius' },
  css: `
    .weather-widget{}
    .weather-main{display:flex;align-items:center;justify-content:var(--mod-justify,center);gap:16px;padding:8px 0;}
    .weather-icon{font-size:3rem;width:52px;height:52px;flex-shrink:0;}
    .weather-temp{font-size:3rem;font-weight:700;line-height:1.1;letter-spacing:-1px;}
    .weather-feels{font-size:var(--text-sm);color:var(--text-tertiary);}
    .weather-detail{font-size:var(--text-base);color:var(--text-secondary);margin-top:4px;}
    .weather-wind{font-size:var(--text-sm);color:var(--text-tertiary);margin-top:4px;display:flex;align-items:center;gap:4px;justify-content:var(--mod-justify,center);}
    .weather-forecast{display:flex;gap:12px;justify-content:var(--mod-justify,center);margin-top:8px;flex-wrap:wrap;}
    .weather-fc-day{text-align:center;font-size:var(--text-xs);color:var(--text-tertiary);}
    .weather-fc-day .day{font-weight:600;color:var(--text-secondary);}
    .weather-fc-temp{font-size:var(--text-sm);color:var(--text-primary);font-weight:600;}
    .weather-ts{font-size:var(--text-2xs);color:var(--text-tertiary);text-align:center;margin-top:6px;opacity:0.6;}
    /* Scale: small */
    [data-mod-scale="small"] .weather-icon{font-size:2.2rem;width:38px;height:38px;}
    [data-mod-scale="small"] .weather-temp{font-size:2.2rem;}
    [data-mod-scale="small"] .weather-detail{font-size:var(--text-sm);}
    /* Scale: large */
    [data-mod-scale="large"] .weather-icon{font-size:3.8rem;width:64px;height:64px;}
    [data-mod-scale="large"] .weather-temp{font-size:3.8rem;}
    /* Height: small card - tighter layout */
    [data-mod-height="small"] .weather-main{gap:10px;padding:2px 0;}
    [data-mod-height="small"] .weather-icon{font-size:2rem;width:34px;height:34px;}
    [data-mod-height="small"] .weather-temp{font-size:2rem;}
    [data-mod-height="small"] .weather-detail,.weather-wind,.weather-ts{font-size:var(--text-2xs);}
    /* Height: large/expanded - more breathing room */
    [data-mod-height="large"] .weather-main{padding:12px 0;}
    [data-mod-height="expanded"] .weather-main{padding:14px 0;}
  `,
  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.className = 'weather-widget';

    const iconRow = document.createElement('div');
    iconRow.className = 'weather-main';
    const iconEl = document.createElement('i');
    iconEl.className = 'weather-icon';
    iconEl.setAttribute('data-lucide', 'cloud');
    iconRow.appendChild(iconEl);

    const tempWrap = document.createElement('div');
    tempWrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;';
    const tempEl = document.createElement('div');
    tempEl.className = 'weather-temp';
    tempEl.textContent = '--°';
    tempWrap.appendChild(tempEl);

    const feelsEl = document.createElement('div');
    feelsEl.className = 'weather-feels';
    feelsEl.style.display = 'none';
    tempWrap.appendChild(feelsEl);

    iconRow.appendChild(tempWrap);
    w.appendChild(iconRow);

    const descEl = document.createElement('div');
    descEl.className = 'weather-detail';
    descEl.textContent = 'Loading...';
    w.appendChild(descEl);

    const windEl = document.createElement('div');
    windEl.className = 'weather-wind';
    windEl.style.display = 'none';
    const windIcon = document.createElement('i');
    windIcon.setAttribute('data-lucide', 'wind');
    windIcon.style.cssText = 'width:12px;height:12px;';
    windEl.appendChild(windIcon);
    const windVal = document.createElement('span');
    windVal.className = 'weather-wind-val';
    windVal.textContent = '--';
    windEl.appendChild(windVal);
    w.appendChild(windEl);

    const fcEl = document.createElement('div');
    fcEl.className = 'weather-forecast';
    w.appendChild(fcEl);

    const tsEl = document.createElement('div');
    tsEl.className = 'weather-ts';
    w.appendChild(tsEl);

    cw.appendChild(w);
    card._cleanup = function() {
      if (card._weatherInterval) { clearInterval(card._weatherInterval); card._weatherInterval = null; }
    };
  },
  onMount: function(sec, card, cw) {
    var w = cw.querySelector('.weather-widget');
    if (!w) return;

    var _cachedLat = null, _cachedLon = null;

    function fetchWeather() {
      var zip = sec.zip, country = sec.country || 'US';
      if (!zip) {
        w.querySelector('.weather-detail').textContent = 'Set zip code in card editor';
        return;
      }

      // Use cached coordinates if available (avoids re-geocoding every 10min)
      if (_cachedLat && _cachedLon) {
        doFetch(_cachedLat, _cachedLon);
        return;
      }

      // Geocode zip → lat/lon via Open-Meteo geocoding API (free, no key)
      var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
        encodeURIComponent(zip) + '&count=1&country=' + encodeURIComponent(country);

      fetch(geoUrl).then(function(r) { return r.json(); }).then(function(geo) {
        if (!geo.results || !geo.results.length) {
          w.querySelector('.weather-detail').textContent = 'Location not found for ' + zip;
          return;
        }
        _cachedLat = geo.results[0].latitude;
        _cachedLon = geo.results[0].longitude;
        doFetch(_cachedLat, _cachedLon);
      }).catch(function(err) {
        w.querySelector('.weather-detail').textContent = 'Geocoding failed';
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

      fetch(url).then(function(r) { return r.json(); }).then(function(d) {
        if (!w.parentNode) return;
        var cw = d.current_weather;
        if (!cw) throw new Error('No weather data');

        var temp = Math.round(cw.temperature);
        var code = cw.weathercode || 0;
        var wind = cw.windspeed || 0;
        var unit = isF ? '°F' : '°C';

        var iconMap = {
          0: 'sun', 1: 'sun', 2: 'cloud-sun',
          3: 'cloud',
          45: 'cloud-fog', 48: 'cloud-fog',
          51: 'cloud-drizzle', 53: 'cloud-drizzle', 55: 'cloud-drizzle',
          56: 'cloud-drizzle', 57: 'cloud-drizzle',
          61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-rain',
          66: 'cloud-rain', 67: 'cloud-rain',
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

        w.querySelector('.weather-temp').textContent = temp + unit;
        var ie = w.querySelector('.weather-icon');
        ie.setAttribute('data-lucide', icon);
        w.querySelector('.weather-detail').textContent = desc;
        var we = w.querySelector('.weather-wind');
        we.style.display = '';
        we.querySelector('.weather-wind-val').textContent = wind + (isF ? ' mph' : ' km/h');
        renderIcons();

        var daily = d.daily;
        if (daily && daily.temperature_2m_max) {
          var fcEl = w.querySelector('.weather-forecast');
          fcEl.innerHTML = '';
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
            fIcon.style.cssText = 'width:14px;height:14px;display:block;margin:2px auto;';
            var ft = document.createElement('div');
            ft.className = 'weather-fc-temp';
            ft.textContent = Math.round(maxTemps[i]) + '°';
            dayEl.appendChild(dName);
            dayEl.appendChild(fIcon);
            dayEl.appendChild(ft);
            fcEl.appendChild(dayEl);
          }
          renderIcons();
        }

        var ts = cw.time ? new Date(cw.time + 'Z') : new Date();
        w.querySelector('.weather-ts').textContent = 'Updated ' + ts.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

      }).catch(function(err) {
        if (!w.parentNode) return;
        w.querySelector('.weather-detail').textContent = 'Weather unavailable';
        console.error('Open-Meteo fetch failed:', err);
      });
    }

    fetchWeather();
    // Refresh every 10 minutes
    if (card._weatherInterval) clearInterval(card._weatherInterval);
    card._weatherInterval = setInterval(fetchWeather, 600000);
  },
  settings: [
    { name:'zip', label:'Zip Code', type:'text', placeholder:'e.g. 90210' },
    { name:'country', label:'Country Code', type:'text', placeholder:'US', default:'US' },
    { name:'units', label:'Units', type:'select', options:[{value:'celsius',label:'°C'},{value:'fahrenheit',label:'°F'}], default:'celsius' },
  ],
});
