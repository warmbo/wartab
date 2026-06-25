/* ═══════════════════════════════════════════
   WarTab — Media Card Module
   Unified dashboard for media services.
   Supports: Sonarr, Radarr, Plex (extensible).
   Each service configured with type + url + key.
   ═══════════════════════════════════════════ */

/* ── Service definitions (presets) ── */

const MEDIA_SERVICES = {
  sonarr: {
    label: 'Sonarr',
    defaultKeyLabel: 'API key (Settings > General)',
    defaultPort: 8989,
    fields: [
      { id: 'series', label: 'Series', endpoint: '/api/v3/series', parser: d => Array.isArray(d) ? d.length : 0, accent: 'var(--accent)' },
      { id: 'wanted', label: 'Wanted', endpoint: '/api/v3/wanted/missing?page=1&pageSize=1', parser: d => d.totalRecords !== undefined ? d.totalRecords : '—', accent: 'var(--color-warning)' },
    ],
    optionalFields: [
      { id: 'queued', label: 'Queued', endpoint: '/api/v3/queue?page=1&pageSize=1', parser: d => d.totalRecords !== undefined ? d.totalRecords : '—', accent: 'var(--color-success)', toggleKey: 'enableQueue', toggleLabel: 'Show queue count' },
    ],
    authHeaders: key => ({ 'X-Api-Key': key }),
  },
  radarr: {
    label: 'Radarr',
    defaultKeyLabel: 'API key (Settings > General)',
    defaultPort: 7878,
    fields: [
      { id: 'movies', label: 'Movies', endpoint: '/api/v3/movie', parser: d => Array.isArray(d) ? d.length : 0, accent: 'var(--accent)' },
      { id: 'missing', label: 'Missing', endpoint: '/api/v3/wanted/missing?page=1&pageSize=1', parser: d => d.totalRecords !== undefined ? d.totalRecords : '—', accent: 'var(--color-warning)' },
    ],
    optionalFields: [
      { id: 'queued', label: 'Queued', endpoint: '/api/v3/queue?page=1&pageSize=1', parser: d => d.totalRecords !== undefined ? d.totalRecords : '—', accent: 'var(--color-success)', toggleKey: 'enableQueue', toggleLabel: 'Show queue count' },
    ],
    authHeaders: key => ({ 'X-Api-Key': key }),
  },
  plex: {
    label: 'Plex',
    defaultKeyLabel: 'Plex token',
    defaultPort: 32400,
    authHeaders: key => ({ 'X-Plex-Token': key, 'Accept': 'application/json' }),
    fetchSessions: true,
    libraryTypes: { movie: 'Movies', show: 'TV Shows', artist: 'Music' },
  },
};

/* ── Single stat row ── */

function mediaStatRow(label, value, accent) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
  const lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
  lbl.textContent = label;
  const val = document.createElement('span');
  val.style.cssText = 'font-weight:600;font-variant-numeric:tabular-nums;color:' + (accent || 'var(--text-primary)') + ';';
  val.textContent = value;
  row.appendChild(lbl); row.appendChild(val);
  return row;
}

/* ── Service group header ── */

function mediaGroupHeader(label, statusDot, url) {
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0 3px;margin-top:4px;border-bottom:1px solid rgba(255,255,255,0.08);';
  if (url) {
    hdr.style.cursor = 'pointer';
    hdr.title = 'Open ' + label;
    hdr.addEventListener('click', function () { window.open(url, '_blank'); });
  }
  if (statusDot) {
    const dot = document.createElement('span');
    dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + statusDot + ';flex-shrink:0;';
    hdr.appendChild(dot);
  }
  const title = document.createElement('span');
  title.style.cssText = 'font-size:var(--text-sm);font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.8px;';
  title.textContent = label;
  hdr.appendChild(title);
  return hdr;
}

/* ── Direct fetch helper (no proxy needed in extension mode) ── */

function mediaFetch(url, headers) {
  return fetch(url, { headers: headers || {} }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

/* ── Parse Plex library sections ── */

function parsePlexLib(d) {
  const mc = d.MediaContainer || {};
  const dirs = mc.Directory || [];
  const items = Array.isArray(dirs) ? dirs : (dirs ? [dirs] : []);
  const counts = {};
  items.forEach(s => {
    const t = (s.type || '').toLowerCase();
    const sz = parseInt(s.size) || 0;
    counts[t] = (counts[t] || 0) + sz;
  });
  return counts;
}

/* ── Fetch all data for one configured service ── */

function fetchServiceData(svc) {
  const def = MEDIA_SERVICES[svc.type];
  if (!def) return Promise.resolve({ type: svc.type, label: svc.label || svc.type, error: 'Unknown type', url: null });

  const base = (svc.url || '').replace(/\/+$/, '');
  if (!base || !svc.key) return Promise.resolve({ type: svc.type, label: svc.label || def.label, error: 'Not configured', url: null });

  const headers = def.authHeaders(svc.key);

  if (svc.type === 'plex') {
    // Plex needs special handling: sessions + library sections
    return Promise.all([
      mediaFetch(base + '/status/sessions', headers).then(d => {
        const mc = d.MediaContainer || {};
        return mc.Size !== undefined ? mc.Size : 0;
      }).catch(() => '—'),
      mediaFetch(base + '/library/sections', headers).then(d => parsePlexLib(d)).catch(() => ({})),
    ]).then(([streams, lib]) => {
      return { type: 'plex', label: svc.label || 'Plex', streams, lib, error: null, url: base };
    }).catch(err => ({ type: 'plex', label: svc.label || 'Plex', error: err.message, url: base }));
  }

  // Standard services: collect field + optional field fetches
  const promises = [];
  const fieldMeta = [];

  def.fields.forEach(f => {
    promises.push(mediaFetch(base + f.endpoint, headers).then(d => f.parser(d)).catch(() => '—'));
    fieldMeta.push({ ...f, optional: false });
  });

  if (def.optionalFields) {
    def.optionalFields.forEach(f => {
      const enabled = svc[f.toggleKey];
      if (enabled) {
        promises.push(mediaFetch(base + f.endpoint, headers).then(d => f.parser(d)).catch(() => '—'));
        fieldMeta.push({ ...f, optional: true });
      }
    });
  }

  return Promise.all(promises).then(values => {
    const results = {};
    fieldMeta.forEach((f, i) => { results[f.id] = { value: values[i], label: f.label, accent: f.accent }; });
    return { type: svc.type, label: svc.label || def.label, results, error: null, url: base };
  }).catch(err => ({ type: svc.type, label: svc.label || def.label, error: err.message, url: base }));
}

/* ═══════════════════════════════════════════
   Module Registration
   ═══════════════════════════════════════════ */

registerModule('media', {
  defaults: {
    services: [
      { type: 'sonarr', url: '', key: '', label: 'Sonarr', enableQueue: false },
      { type: 'radarr', url: '', key: '', label: 'Radarr', enableQueue: false },
      { type: 'plex', url: '', key: '', label: 'Plex' },
    ]
  },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px 0;';

    const services = (sec.services || []).filter(s => s.type && s.url && s.key);
    if (!services.length) {
      w.innerHTML = '';
      w.appendChild(ds.empty('film', 'Add Media Services',
        'Add Sonarr, Radarr, Plex or other services in the card editor.', {
          label: 'Edit card',
          onClick: function() { openCardEditPanel(card.id); }
        }));
      cw.appendChild(w); return;
    }

    w.innerHTML = '<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:8px 0;text-align:center;">Loading media services...</div>';
    cw.appendChild(w);

    Promise.all(services.map(s => fetchServiceData(s)))
      .then(results => {
        w.innerHTML = '';
        results.forEach(r => {
          if (r.error) {
            w.appendChild(mediaGroupHeader(r.label, 'rgba(200,80,80,0.6)', r.url));
            w.appendChild(mediaStatRow('Error', r.error, 'var(--color-error)'));
            return;
          }

          if (r.type === 'plex') {
            w.appendChild(mediaGroupHeader(r.label, r.streams > 0 ? 'var(--color-success)' : 'var(--text-tertiary)', r.url));
            w.appendChild(mediaStatRow('Streaming', r.streams === 0 ? '0' : r.streams, r.streams > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));
            const libLabels = MEDIA_SERVICES.plex.libraryTypes;
            Object.keys(libLabels).forEach(type => {
              const count = (r.lib && r.lib[type]) || 0;
              if (count > 0) w.appendChild(mediaStatRow(libLabels[type], count, 'var(--accent)'));
            });
            return;
          }

          // Standard service (sonarr, radarr, etc.)
          w.appendChild(mediaGroupHeader(r.label, Object.values(r.results).some(v => v.value > 0) ? 'var(--accent)' : 'var(--text-tertiary)', r.url));

          // Check if wanted/missing has a value — mark it in warning color if > 0
          Object.values(r.results).forEach(rr => {
            w.appendChild(mediaStatRow(rr.label, rr.value, rr.accent));
          });
        });
      })
      .catch(err => {
        w.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);padding:4px 0;">⚠ ' + escHtml(err.message) + '</div>';
      });
  },

  editor: (sec, card, bd) => {
    if (!sec.services || !sec.services.length) sec.services = [{ type: 'sonarr', url: '', key: '', label: 'Sonarr', enableQueue: false }];

    bd.appendChild(cpLabel('Media Services'));
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:8px;';

    function renderServiceEditor() {
      container.innerHTML = '';
      (sec.services || []).forEach((svc, si) => {
        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.06);padding:10px;margin-bottom:8px;';

        // Row 1: Type selector + Remove button
        const row1 = document.createElement('div');
        row1.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;align-items:center;';

        const typeSel = document.createElement('select'); typeSel.className = 'cp-input';
        typeSel.style.cssText = 'flex:1;padding:4px 6px;font-size:var(--text-2xs);';
        ['sonarr', 'radarr', 'plex'].forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = MEDIA_SERVICES[t].label + (MEDIA_SERVICES[t].defaultPort ? ' (:'
             + MEDIA_SERVICES[t].defaultPort + ')' : '');
          if (t === svc.type) opt.selected = true;
          typeSel.appendChild(opt);
        });
        typeSel.addEventListener('change', () => {
          svc.type = typeSel.value;
          const def = MEDIA_SERVICES[svc.type];
          svc.label = def.label;
          svc.key = '';
          if (def.defaultPort && svc.url && !svc.url.includes(':')) svc.url = svc.url.replace(/\/+$/, '') + ':' + def.defaultPort;
          renderServiceEditor();
          saveConfig();
        });
        row1.appendChild(typeSel);

        const rmBtn = document.createElement('button'); rmBtn.className = 'btn btn-glass btn-sm';
        rmBtn.textContent = '✕'; rmBtn.title = 'Remove service';
        rmBtn.style.cssText = 'padding:2px 5px;font-size:var(--text-2xs);';
        rmBtn.addEventListener('click', () => {
          sec.services.splice(si, 1);
          renderServiceEditor();
          saveConfig();
        });
        row1.appendChild(rmBtn);
        card.appendChild(row1);

        // Row 2: Label + URL
        const row2 = document.createElement('div');
        row2.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;align-items:center;';
        const lblInp = document.createElement('input'); lblInp.className = 'cp-input';
        lblInp.placeholder = 'Label'; lblInp.value = svc.label || '';
        lblInp.style.cssText = 'flex:1;padding:4px 6px;font-size:var(--text-2xs);';
        lblInp.addEventListener('change', () => { svc.label = lblInp.value; saveConfig(); });
        row2.appendChild(lblInp);

        const def = MEDIA_SERVICES[svc.type];
        const urlInp = document.createElement('input'); urlInp.className = 'cp-input';
        urlInp.placeholder = 'http://' + svc.type + '.local' + (def.defaultPort ? ':' + def.defaultPort : '');
        urlInp.value = svc.url || '';
        urlInp.style.cssText = 'flex:2;padding:4px 6px;font-size:var(--text-2xs);';
        urlInp.addEventListener('change', () => { svc.url = urlInp.value; saveConfig(); });
        row2.appendChild(urlInp);
        card.appendChild(row2);

        // Row 3: API Key
        const row3 = document.createElement('div');
        row3.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;align-items:center;';
        const keyInp = document.createElement('input'); keyInp.className = 'cp-input';
        keyInp.type = 'password';
        keyInp.placeholder = def.defaultKeyLabel;
        keyInp.value = svc.key || '';
        keyInp.style.cssText = 'flex:1;padding:4px 6px;font-size:var(--text-2xs);';
        keyInp.addEventListener('change', () => { svc.key = keyInp.value; saveConfig(); });
        row3.appendChild(keyInp);
        card.appendChild(row3);

        // Optional toggles per type
        if (def.optionalFields) {
          def.optionalFields.forEach(of => {
            const chkWrap = document.createElement('div');
            chkWrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:4px;';
            const chk = document.createElement('input'); chk.type = 'checkbox';
            chk.checked = !!svc[of.toggleKey];
            chk.addEventListener('change', () => { svc[of.toggleKey] = chk.checked; saveConfig(); });
            chkWrap.appendChild(chk);
            const chkLbl = document.createElement('span');
            chkLbl.style.cssText = 'font-size:var(--text-2xs);color:var(--text-secondary);';
            chkLbl.textContent = of.toggleLabel;
            chkWrap.appendChild(chkLbl);
            card.appendChild(chkWrap);
          });
        }

        container.appendChild(card);
      });

      // Add service button
      const addBtn = document.createElement('button'); addBtn.className = 'btn btn-glass btn-sm';
      addBtn.textContent = '+ Add Service';
      addBtn.style.cssText = 'font-size:var(--text-2xs);padding:4px 10px;';
      addBtn.addEventListener('click', () => {
        sec.services.push({ type: 'sonarr', url: '', key: '', label: 'Sonarr', enableQueue: false });
        renderServiceEditor();
        saveConfig();
      });
      container.appendChild(addBtn);
    }

    renderServiceEditor();
    bd.appendChild(container);
  },
});