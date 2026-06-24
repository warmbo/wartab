/* ═══════════════════════════════════════════
   WarTab — API Poller Module
   Enhanced with:
   - Field mappings (dot notation, labels, formats)
   - Format types: text, number, percent, bytes, duration, date, relativeDate
   - Value remapping (value → label)
   - Scale, suffix, prefix
   - Display modes: block, list
   - Custom headers & HTTP methods
   ═══════════════════════════════════════════ */

/* ── Format helpers ── */

function fmtBytes(v) {
  if (v === null || v === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let val = Number(v);
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return val.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const s = Number(seconds);
  if (s < 60) return Math.round(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
}

function fmtPercent(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(1) + '%';
}

function fmtText(v) {
  return v !== null && v !== undefined ? String(v) : '—';
}

function fmtNumber(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : '—';
}

function applyFormat(value, format) {
  switch (format) {
    case 'bytes': return fmtBytes(value);
    case 'duration': return fmtDuration(value);
    case 'percent': return fmtPercent(value);
    case 'number': return fmtNumber(value);
    case 'text': default: return fmtText(value);
  }
}

function applyRemap(value, remapRules) {
  if (!remapRules || !remapRules.length) return value;
  for (const rule of remapRules) {
    if (rule.value !== undefined && String(value) === String(rule.value)) return rule.to;
    if (rule.any) return rule.to;
  }
  return value;
}

function getNested(obj, path) {
  if (!path) return obj;
  const parts = String(path).split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Array indexing: locations.1.name
    const idx = parseInt(part);
    if (!isNaN(idx) && Array.isArray(current)) {
      current = current[idx];
    } else if (typeof current === 'object') {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/* ── API fetch wrapper — direct fetch (no proxy needed) ── */

function apiFetch(url, method, headers, body) {
  const opts = { method: method || 'GET' };
  if (headers && Object.keys(headers).length) opts.headers = headers;
  if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  return fetch(url, opts).then(r => {
    const ct = r.headers.get('Content-Type') || '';
    if (ct.includes('json')) return r.json();
    return r.text();
  });
}

/* ── Module registration ── */

registerModule('api-poller', {
  defaults: {
    url: '', method: 'GET', headers: {}, refreshInterval: 60,
    display: 'block',
    mappings: [{ field: '', label: 'Value', format: 'text' }]
  },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.className = 'api-widget';
    w.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;padding:4px 0;';

    // Backward compat: if old-style jsonPath/fields exist, convert
    if (sec.jsonPath && (!sec.mappings || !sec.mappings.length)) {
      const label = sec.label || 'Value';
      sec.mappings = [{ field: sec.jsonPath, label: label, format: 'text' }];
    }
    if (sec.fields && sec.fields.length && (!sec.mappings || !sec.mappings.length)) {
      sec.mappings = sec.fields.map(f => ({
        field: f.path || '', label: f.label || 'Value', format: 'text'
      }));
    }

    const refresh = (sec.refreshInterval || 60) * 1000;
    let _timer = null;

    function fetchAndRender() {
      const url = sec.url || '';
      if (!url) {
        w.innerHTML = '<div class="api-row"><span class="api-label">No URL set</span></div>';
        return;
      }

      w.innerHTML = '<div class="api-row"><span class="api-label">' +
        escHtml(sec.label || '') +
        '</span><span class="api-value">Loading...</span></div>';

      apiFetch(url, sec.method, sec.headers, null)
        .then(data => {
          const mappings = sec.mappings || [];
          if (!mappings.length) {
            // No mappings — just show JSON as text
            w.innerHTML = '<div class="api-row"><span class="api-value" style="word-break:break-all;">' +
              escHtml(typeof data === 'string' ? data : JSON.stringify(data, null, 2)) +
              '</span></div>';
            return;
          }

          let html = '';
          if (sec.display === 'list') {
            // List view: label on left, value on right
            mappings.forEach(m => {
              const raw = getNested(data, m.field);
              let val = applyRemap(raw, m.remap);
              if (m.scale) val = Number(val) * Number(m.scale);
              const display = (m.prefix || '') + applyFormat(val, m.format) + (m.suffix || '');
              html += '<div class="api-row">' +
                '<span class="api-label">' + escHtml(m.label || m.field || 'Value') + '</span>' +
                '<span class="api-value">' + escHtml(display) + '</span></div>';
            });
          } else {
            // Block view (default): label on top, value below
            mappings.forEach(m => {
              const raw = getNested(data, m.field);
              let val = applyRemap(raw, m.remap);
              if (m.scale) val = Number(val) * Number(m.scale);
              const display = (m.prefix || '') + applyFormat(val, m.format) + (m.suffix || '');
              html += '<div class="api-row">' +
                '<span class="api-label">' + escHtml(m.label || m.field || 'Value') + '</span></div>' +
                '<div class="api-value" style="font-size:var(--text-lg);font-weight:600;padding-bottom:6px;">' +
                escHtml(display) + '</div>';
            });
          }

          html += '<div class="api-ts" style="margin-top:4px;">updated just now</div>';
          w.innerHTML = html;
          w.dataset.lastOk = String(Date.now());
        })
        .catch(err => {
          const lo = w.dataset.lastOk;
          w.innerHTML = '<div class="api-row"><span class="api-label">' +
            escHtml(sec.label || 'Error') +
            '</span><span class="api-value api-error">⚠ ' + escHtml(err.message) +
            '</span></div>' +
            '<div class="api-ts">' + (lo ? 'last ok: ' + timeAgo(parseInt(lo)) : '') + '</div>';
        });
    }

    fetchAndRender();
    if (refresh > 5000) {
      _timer = setInterval(fetchAndRender, refresh);
      // Store timer on widget for cleanup
      w._apiTimer = _timer;
    }
    cw.appendChild(w);
  },

  editor: (sec, card, bd) => {
    // Ensure backward compat fields exist
    if (!sec.mappings && sec.fields) {
      sec.mappings = sec.fields.map(f => ({
        field: f.path || '', label: f.label || 'Value', format: 'text'
      }));
    }
    if (!sec.mappings) sec.mappings = [{ field: '', label: 'Value', format: 'text' }];

    bd.appendChild(cpLabel('Label'));
    bd.appendChild(cpInput('My API', sec.label || '', v => { sec.label = v; saveConfig(); }));

    bd.appendChild(cpLabel('API URL'));
    bd.appendChild(cpInput('https://api.example.com/status', sec.url || '', v => { sec.url = v; saveConfig(); }));

    // Preset selector
    bd.appendChild(cpLabel('Preset'));
    const presetSel = document.createElement('select'); presetSel.className = 'cp-input';
    presetSel.appendChild(new Option('— None —', ''));
    API_PRESETS.forEach(function(p) {
      const opt = new Option(p.label, p.url);
      if (p.url === sec.url) opt.selected = true;
      presetSel.appendChild(opt);
    });
    presetSel.addEventListener('change', function() {
      const p = API_PRESETS.find(x => x.url === this.value);
      if (p) {
        sec.url = p.url;
        sec.mappings = (p.fields || []).map(f => ({
          field: f.path || '', label: f.label || 'Value', format: f.format || 'text'
        }));
        if (!sec.label || sec.label === 'API' || API_PRESETS.some(x => x.label === sec.label)) sec.label = p.label;
        saveAndRefreshStructural();
      }
    });
    bd.appendChild(presetSel);

    // HTTP Method
    bd.appendChild(cpLabel('Method'));
    const methodSel = document.createElement('select'); methodSel.className = 'cp-input';
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(m => {
      const opt = new Option(m, m);
      if (m === (sec.method || 'GET')) opt.selected = true;
      methodSel.appendChild(opt);
    });
    methodSel.addEventListener('change', () => { sec.method = methodSel.value; saveConfig(); });
    bd.appendChild(methodSel);

    bd.appendChild(cpRange('Refresh (seconds)', sec.refreshInterval || 60, 5, 600,
      v => { sec.refreshInterval = parseInt(v); saveConfig(); }));

    // Display mode
    bd.appendChild(cpLabel('Display Mode'));
    const displaySel = document.createElement('select'); displaySel.className = 'cp-input';
    [{ value: 'block', label: 'Block (label + large value)' },
     { value: 'list', label: 'List (label side-by-side)' }].forEach(o => {
      const opt = new Option(o.label, o.value);
      if (o.value === (sec.display || 'block')) opt.selected = true;
      displaySel.appendChild(opt);
    });
    displaySel.addEventListener('change', () => { sec.display = displaySel.value; saveConfig(); });
    bd.appendChild(displaySel);

    // Custom headers (simplified — single header key:value)
    bd.appendChild(cpLabel('Headers (optional)'));
    const hdrContainer = document.createElement('div');
    hdrContainer.style.cssText = 'margin-bottom:8px;';
    function renderHeaders() {
      hdrContainer.innerHTML = '';
      const hdrs = sec.headers || {};
      Object.keys(hdrs).forEach(k => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;align-items:center;';
        const kInp = document.createElement('input'); kInp.className = 'cp-input';
        kInp.placeholder = 'Header'; kInp.value = k;
        kInp.style.cssText = 'flex:1;padding:5px 6px;font-size:var(--text-2xs);';
        kInp.addEventListener('change', () => {
          if (kInp.value !== k) {
            sec.headers[kInp.value] = sec.headers[k];
            delete sec.headers[k];
            saveConfig();
          }
        });
        const vInp = document.createElement('input'); vInp.className = 'cp-input';
        vInp.placeholder = 'Value'; vInp.value = hdrs[k];
        vInp.style.cssText = 'flex:2;padding:5px 6px;font-size:var(--text-2xs);';
        vInp.addEventListener('change', () => { sec.headers[kInp.value] = vInp.value; saveConfig(); });
        const rm = document.createElement('button'); rm.className = 'btn btn-glass btn-sm';
        rm.textContent = '✕'; rm.style.cssText = 'padding:2px 5px;font-size:var(--text-2xs);'; rm.setAttribute('aria-label','Remove field');
        rm.addEventListener('click', () => { delete sec.headers[kInp.value]; renderHeaders(); saveConfig(); });
        row.appendChild(kInp); row.appendChild(vInp); row.appendChild(rm);
        hdrContainer.appendChild(row);
      });
      const addBtn = document.createElement('button'); addBtn.className = 'btn btn-glass btn-sm';
      addBtn.textContent = '+ Add Header'; addBtn.style.cssText = 'font-size:var(--text-2xs);padding:4px 10px;';
      addBtn.addEventListener('click', () => {
        if (!sec.headers) sec.headers = {};
        const name = 'X-Custom-' + Object.keys(sec.headers).length;
        sec.headers[name] = '';
        renderHeaders();
        saveConfig();
      });
      hdrContainer.appendChild(addBtn);
    }
    renderHeaders();
    bd.appendChild(hdrContainer);

    // Field mappings
    bd.appendChild(cpLabel('Field Mappings'));
    const fieldContainer = document.createElement('div');
    fieldContainer.style.cssText = 'margin-bottom:8px;';

    function renderFields() {
      fieldContainer.innerHTML = '';
      (sec.mappings || []).forEach((m, fi) => {
        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.06);padding:10px;margin-bottom:8px;';

        // Row 1: Label + Field path
        const row1 = document.createElement('div');
        row1.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;align-items:center;';
        const lInp = document.createElement('input'); lInp.className = 'cp-input';
        lInp.placeholder = 'Label'; lInp.value = m.label || '';
        lInp.style.cssText = 'flex:1;padding:5px 6px;font-size:var(--text-2xs);';
        lInp.addEventListener('change', () => { sec.mappings[fi].label = lInp.value; saveConfig(); });
        const pInp = document.createElement('input'); pInp.className = 'cp-input';
        pInp.placeholder = 'Field path (e.g. data.amount)'; pInp.value = m.field || '';
        pInp.style.cssText = 'flex:2;padding:5px 6px;font-size:var(--text-2xs);';
        pInp.addEventListener('change', () => { sec.mappings[fi].field = pInp.value; saveConfig(); });
        const rm = document.createElement('button'); rm.className = 'btn btn-glass btn-sm';
        rm.textContent = '✕'; rm.title = 'Remove';
        rm.style.cssText = 'padding:2px 5px;font-size:var(--text-2xs);';
        rm.addEventListener('click', () => { sec.mappings.splice(fi, 1); renderFields(); saveConfig(); });
        row1.appendChild(lInp); row1.appendChild(pInp); row1.appendChild(rm);
        card.appendChild(row1);

        // Row 2: Format + Scale + Suffix
        const row2 = document.createElement('div');
        row2.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;';

        const fmtSel = document.createElement('select'); fmtSel.className = 'cp-input';
        fmtSel.style.cssText = 'flex:1;min-width:80px;padding:4px 6px;font-size:var(--text-2xs);';
        ['text', 'number', 'percent', 'bytes', 'duration'].forEach(f => {
          const opt = new Option(f, f);
          if (f === (m.format || 'text')) opt.selected = true;
          fmtSel.appendChild(opt);
        });
        fmtSel.addEventListener('change', () => { sec.mappings[fi].format = fmtSel.value; saveConfig(); });
        row2.appendChild(fmtSel);

        const scaleInp = document.createElement('input'); scaleInp.className = 'cp-input';
        scaleInp.placeholder = 'Scale'; scaleInp.value = m.scale || '';
        scaleInp.style.cssText = 'width:55px;padding:4px 4px;font-size:var(--text-2xs);';
        scaleInp.addEventListener('change', () => {
          sec.mappings[fi].scale = scaleInp.value ? parseFloat(scaleInp.value) : undefined;
          saveConfig();
        });
        row2.appendChild(scaleInp);

        const prefInp = document.createElement('input'); prefInp.className = 'cp-input';
        prefInp.placeholder = 'Prefix'; prefInp.value = m.prefix || '';
        prefInp.style.cssText = 'width:50px;padding:4px 4px;font-size:var(--text-2xs);';
        prefInp.addEventListener('change', () => { sec.mappings[fi].prefix = prefInp.value; saveConfig(); });
        row2.appendChild(prefInp);

        const suffInp = document.createElement('input'); suffInp.className = 'cp-input';
        suffInp.placeholder = 'Suffix'; suffInp.value = m.suffix || '';
        suffInp.style.cssText = 'width:55px;padding:4px 4px;font-size:var(--text-2xs);';
        suffInp.addEventListener('change', () => { sec.mappings[fi].suffix = suffInp.value; saveConfig(); });
        row2.appendChild(suffInp);

        card.appendChild(row2);
        fieldContainer.appendChild(card);
      });

      const addBtn = document.createElement('button'); addBtn.className = 'btn btn-glass btn-sm';
      addBtn.textContent = '+ Add Mapping'; addBtn.style.cssText = 'font-size:var(--text-2xs);padding:4px 10px;';
      addBtn.addEventListener('click', () => {
        sec.mappings.push({ field: '', label: 'Value', format: 'text' });
        renderFields();
        saveConfig();
      });
      fieldContainer.appendChild(addBtn);
    }
    renderFields();
    bd.appendChild(fieldContainer);
  },
});  // end api-poller