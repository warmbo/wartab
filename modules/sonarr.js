/* ═══════════════════════════════════════════
   WarTab — Sonarr Module
   TV series management dashboard widget.
   Displays: total series, wanted/missing, queue count.
   API key from Settings > General.
   ═══════════════════════════════════════════ */

registerModule('sonarr', {
  defaults: { url: '', key: '', enableQueue: false },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:4px 0;';

    if (!sec.url || !sec.key) {
      w.innerHTML = '<div style="color:var(--text-tertiary);font-size:var(--text-sm);">Configure Sonarr URL & API key</div>';
      cw.appendChild(w); return;
    }

    const headers = { 'X-Api-Key': sec.key };
    const base = sec.url.replace(/\/+$/, '');

    function fetchJson(endpoint) {
      return fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: base + endpoint,
          method: 'GET',
          headers: headers
        })
      }).then(r => r.json()).then(r => {
        if (r.error) throw new Error(r.error);
        return r.body;
      });
    }

    // Stat row helper
    function statRow(label, value, accent) {
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

    w.innerHTML = '<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:8px 0;text-align:center;">Loading Sonarr...</div>';
    cw.appendChild(w);

    Promise.all([
      fetchJson('/api/v3/series').then(d => Array.isArray(d) ? d.length : 0).catch(() => '—'),
      fetchJson('/api/v3/wanted/missing?page=1&pageSize=1').then(d => d.totalRecords !== undefined ? d.totalRecords : '—').catch(() => '—'),
      sec.enableQueue
        ? fetchJson('/api/v3/queue?page=1&pageSize=1').then(d => d.totalRecords !== undefined ? d.totalRecords : '—').catch(() => '—')
        : Promise.resolve(null)
    ]).then(([series, wanted, queued]) => {
      w.innerHTML = '';
      w.appendChild(statRow('Series', series, 'var(--accent)'));
      w.appendChild(statRow('Wanted', wanted, 'var(--color-warning)'));
      if (queued !== null) w.appendChild(statRow('Queued', queued, 'var(--color-success)'));
    }).catch(err => {
      w.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);padding:4px 0;">⚠ ' + escHtml(err.message) + '</div>';
    });
  },

  editor: (sec, card, bd) => {
    bd.appendChild(cpLabel('Sonarr URL'));
    bd.appendChild(cpInput('http://sonarr.local:8989', sec.url || '', v => { sec.url = v; saveConfig(); }));
    bd.appendChild(cpLabel('API Key'));
    const ki = cpInput('from Settings > General', sec.key || '', v => { sec.key = v; saveConfig(); });
    ki.type = 'password';
    bd.appendChild(ki);
    bd.appendChild(cpCheck('Show queue count', !!sec.enableQueue, v => { sec.enableQueue = v; saveConfig(); }));
  },
});