/* ═══════════════════════════════════════════
   WarTab — Plex Module
   Media server dashboard widget.
   Displays: active streams, movie/show/music counts.
   Token from https://www.plexopedia.com/plex-media-server/general/plex-token/
   ═══════════════════════════════════════════ */

registerModule('plex', {
  defaults: { url: '', key: '' },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:4px 0;';

    if (!sec.url || !sec.key) {
      w.innerHTML = '<div style="color:var(--text-tertiary);font-size:var(--text-sm);">Configure Plex URL & token</div>';
      cw.appendChild(w); return;
    }

    const base = sec.url.replace(/\/+$/, '');
    const tokenParam = '?X-Plex-Token=' + encodeURIComponent(sec.key);

    function fetchXml(endpoint) {
      // Plex API returns XML by default; force JSON with Accept header
      return fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: base + endpoint + tokenParam,
          method: 'GET',
          headers: { 'Accept': 'application/json', 'X-Plex-Token': sec.key }
        })
      }).then(r => r.json()).then(r => {
        if (r.error) throw new Error(r.error);
        return r.body;
      });
    }

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

    w.innerHTML = '<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:8px 0;text-align:center;">Loading Plex...</div>';
    cw.appendChild(w);

    // Plex API: /status/sessions returns active streams.
    // /library/sections returns all library sections with type + size.
    Promise.all([
      // Active streams
      fetchXml('/status/sessions').then(d => {
        const mc = d.MediaContainer || {};
        return mc.Size !== undefined ? mc.Size : 0;
      }).catch(() => '—'),
      // Library sections — sum by type
      fetchXml('/library/sections').then(d => {
        const mc = d.MediaContainer || {};
        const dirs = mc.Directory || [];
        const items = Array.isArray(dirs) ? dirs : (dirs ? [dirs] : []);
        const counts = { movie: 0, show: 0, artist: 0, other: 0 };
        items.forEach(s => {
          const t = (s.type || '').toLowerCase();
          const sz = parseInt(s.size) || 0;
          if (counts[t] !== undefined) counts[t] += sz;
          else counts.other += sz;
        });
        return counts;
      }).catch(() => ({ movie: '—', show: '—', artist: '—', other: '—' }))
    ]).then(([streams, lib]) => {
      w.innerHTML = '';
      w.appendChild(statRow('Streaming', streams === 0 ? '0' : streams, streams > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));
      if (lib.movie !== '—') w.appendChild(statRow('Movies', lib.movie, 'var(--accent)'));
      if (lib.show !== '—') w.appendChild(statRow('TV Shows', lib.show, 'var(--accent)'));
      if (lib.artist !== '—') w.appendChild(statRow('Music', lib.artist, 'var(--accent)'));
    }).catch(err => {
      w.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);padding:4px 0;">⚠ ' + escHtml(err.message) + '</div>';
    });
  },

  editor: (sec, card, bd) => {
    bd.appendChild(cpLabel('Plex URL'));
    bd.appendChild(cpInput('http://plex.local:32400', sec.url || '', v => { sec.url = v; saveConfig(); }));
    bd.appendChild(cpLabel('Plex Token'));
    const ki = cpInput('Get from plex token docs', sec.key || '', v => { sec.key = v; saveConfig(); });
    ki.type = 'password';
    bd.appendChild(ki);
  },
});