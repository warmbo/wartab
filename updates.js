/* ═══════════════════════════════════════════
   WarTab — Updates (self-update system)
   Status card + Update & Restart + Rollback + live terminal modal.
   Modelled on Bark's update card (bark-update-system skill).
   Depends on: $, el, toast, showConfirmModal (core.js / modals.js),
   el/ps helpers (config-panel.js).
   ═══════════════════════════════════════════ */
(function () {
  const TOKEN_KEY = 'wartab.updateToken';
  const POLL_MS = 900;

  let _terminal = null;      // the modal element while open
  let _pollTimer = null;
  let _after = 0;
  let _done = false;

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  }

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const tok = getToken();
    if (tok) h['X-WarTab-Update-Token'] = tok;
    return h;
  }

  async function api(url, opts) {
    const res = await fetch(url, opts || { headers: authHeaders() });
    let data = {};
    try { data = await res.json(); } catch (e) { /* ignore */ }
    return { ok: res.ok, status: res.status, data: data };
  }

  async function fetchStatus(refresh) {
    const url = '/api/update/status' + (refresh ? '?refresh=1' : '');
    const r = await api(url);
    if (!r.ok) throw new Error('status failed: ' + (r.data.error || r.status));
    return r.data;
  }

  /* ── terminal modal ── */
  function openTerminal() {
    if (_terminal) return;
    _after = 0;
    _done = false;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box update-terminal-box';
    box.style.cssText = 'max-width:680px;width:90%;text-align:left;padding:0;overflow:hidden;';
    const head = el('div', 'padding:12px 16px;border-bottom:1px solid var(--glass-border);font-weight:700;font-size:var(--text-base);display:flex;justify-content:space-between;align-items:center;',
      '🔄 WarTab Update');
    const pre = document.createElement('pre');
    pre.className = 'update-terminal';
    pre.style.cssText = 'margin:0;padding:14px 16px;max-height:420px;overflow-y:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:var(--text-xs);line-height:1.55;color:var(--text-primary);background:rgba(0,0,0,0.5);white-space:pre-wrap;word-break:break-word;';
    const foot = el('div', 'padding:10px 16px;border-top:1px solid var(--glass-border);display:flex;justify-content:flex-end;gap:var(--space-2);');
    const closeBtn = el('button', '', 'Close');
    closeBtn.className = 'btn btn-glass btn-sm';
    closeBtn.disabled = true;
    closeBtn.addEventListener('click', () => {
      stopPolling();
      overlay.remove();
      _terminal = null;
    });
    foot.appendChild(closeBtn);
    box.appendChild(head);
    box.appendChild(pre);
    box.appendChild(foot);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) return; });
    document.body.appendChild(overlay);
    _terminal = { overlay: overlay, pre: pre, closeBtn: closeBtn };

    appendLine('Updating…', 'dim');
    _pollTimer = setInterval(pollLog, POLL_MS);
    pollLog();
  }

  function appendLine(line, level) {
    if (!_terminal) return;
    const d = document.createElement('div');
    let color = 'var(--text-primary)';
    if (level === 'cmd') color = '#67e8f9';
    else if (level === 'ok') color = '#4ade80';
    else if (level === 'error') color = '#f87171';
    else if (level === 'warn') color = '#fbbf24';
    else if (level === 'header') { color = '#e2e8f0'; d.style.fontWeight = '700'; }
    else if (level === 'dim') color = 'var(--text-tertiary)';
    d.style.color = color;
    d.textContent = line;
    _terminal.pre.appendChild(d);
    _terminal.pre.scrollTop = _terminal.pre.scrollHeight;
  }

  function finishTerminal(label) {
    if (_done) return;
    _done = true;
    stopPolling();
    appendLine(label, 'ok');
    if (_terminal) _terminal.closeBtn.disabled = false;
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  async function pollLog() {
    if (!_terminal || _done) return;
    const url = '/api/update/log?after=' + _after;
    const r = await api(url);
    if (!r.ok) return;
    const d = r.data || {};
    (d.entries || []).forEach(function (e) { appendLine(e.line, e.level); });
    _after = d.last || _after;
    if (!d.active && (d.entries || []).length) {
      finishTerminal('✓ Done — the instance is updating. Refresh shortly.');
    }
  }

  /* ── status card ── */
  function renderStatus(status, holder) {
    holder.innerHTML = '';
    const current = status.current_commit ? status.current_commit.slice(0, 10) : 'unknown';
    const available = status.available_commit ? status.available_commit.slice(0, 10) : null;
    const row = (label, value, extra) => {
      const w = el('div', 'display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:var(--text-sm);');
      const l = el('span', 'color:var(--text-secondary);', label);
      const v = el('span', 'font-family:ui-monospace,monospace;', value);
      w.appendChild(l); w.appendChild(v);
      if (extra) w.appendChild(extra);
      return w;
    };
    const badge = (text, kind) => {
      const b = el('span', 'font-size:var(--text-2xs);font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px;',
        text);
      if (kind === 'ok') b.style.cssText += 'color:#052e16;background:#4ade80;';
      else if (kind === 'warn') b.style.cssText += 'color:#451a03;background:#fbbf24;';
      return b;
    };

    holder.appendChild(row('Branch', status.branch || '—'));
    holder.appendChild(row('Current build', current));
    if (status.error) {
      const e = el('div', 'font-size:var(--text-xs);color:#f87171;margin-top:4px;', '⚠ ' + status.error);
      holder.appendChild(e);
    } else if (available && status.update_available) {
      const r = row('Available', available);
      r.appendChild(badge('UPDATE', 'warn'));
      holder.appendChild(r);
      if (status.available_date) {
        let ds = '';
        try { ds = ' · ' + new Date(status.available_date).toLocaleString(); } catch (e) {}
        holder.appendChild(el('div', 'font-size:var(--text-xs);color:var(--text-tertiary);padding-bottom:6px;',
          'Released' + ds));
      }
    } else if (available) {
      const r = row('Available', available);
      r.appendChild(badge('UP TO DATE', 'ok'));
      holder.appendChild(r);
    } else {
      holder.appendChild(el('div', 'font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;',
        'No remote info yet.'));
    }
    const repo = status.repo_url;
    if (repo) {
      holder.appendChild(el('div', 'font-size:var(--text-2xs);color:var(--text-tertiary);padding-top:6px;',
        'Source: ' + repo));
    }
  }

  function tokenRow() {
    const w = el('div', 'display:flex;gap:var(--space-2);align-items:center;margin:8px 0;');
    const inp = document.createElement('input');
    inp.type = 'password';
    inp.placeholder = 'Update token (required)';
    inp.value = getToken();
    inp.style.cssText = 'flex:1;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-sm);outline:none;';
    inp.addEventListener('change', function () { setToken(inp.value.trim()); });
    const save = el('button', '', 'Save');
    save.className = 'btn btn-glass btn-sm';
    save.addEventListener('click', function () { setToken(inp.value.trim()); toast('Token saved', 'success'); });
    w.appendChild(inp); w.appendChild(save);
    return w;
  }

  async function doUpdate(applyFn, confirmMsg, okText) {
    if (!getToken()) {
      toast('Set the update token first', 'error');
      return;
    }
    showConfirmModal(confirmMsg, async function () {
      openTerminal();
      const url = applyFn === 'update' ? '/api/update' : '/api/update/rollback';
      const r = await api(url, { method: 'POST' });
      if (!r.ok) {
        finishTerminal('✗ ' + (r.data.error || ('HTTP ' + r.status + ' — wrong token?')));
        return;
      }
      // Terminal polls until active=false; then offer a manual reload button.
      setTimeout(() => { if (_done && _terminal) { _terminal.closeBtn.textContent = 'Reload'; } }, 12000);
    }, okText);
  }

  function build() {
    const container = document.createElement('div');
    container.appendChild(ps('Updates'));
    container.appendChild(el('div', 'font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-2);',
      'Pull the latest build from git and restart. Current build is auto-detected from the checkout.'));

    const statusHolder = el('div', 'margin:6px 0 10px;');
    const checkBtn = el('button', '', 'Check for updates');
    checkBtn.className = 'btn btn-glass btn-sm';
    checkBtn.addEventListener('click', async function () {
      checkBtn.disabled = true;
      try {
        const s = await fetchStatus(true);
        renderStatus(s, statusHolder);
      } catch (e) {
        statusHolder.innerHTML = '';
        statusHolder.appendChild(el('div', 'font-size:var(--text-xs);color:#f87171;', '⚠ ' + e.message));
      } finally {
        checkBtn.disabled = false;
      }
    });

    const btnRow = el('div', 'display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:8px;');
    const updateBtn = el('button', '', '🔄 Update & Restart');
    updateBtn.className = 'btn btn-glass btn-sm';
    updateBtn.style.cssText = 'border-color:rgba(103,232,249,0.4);';
    updateBtn.addEventListener('click', function () {
      doUpdate('update', 'Pull the latest build and restart WarTab? Your current config is snapshotted first.', 'Update');
    });
    const rollbackBtn = el('button', '', '↩ Rollback');
    rollbackBtn.className = 'btn btn-glass btn-sm';
    rollbackBtn.addEventListener('click', function () {
      doUpdate('rollback', 'Roll back to the build running before the last update and restart?', 'Rollback');
    });
    btnRow.appendChild(checkBtn);
    btnRow.appendChild(updateBtn);
    btnRow.appendChild(rollbackBtn);

    container.appendChild(statusHolder);
    container.appendChild(btnRow);
    container.appendChild(tokenRow());
    container.appendChild(el('div', 'font-size:var(--text-2xs);color:var(--text-tertiary);margin-top:4px;',
      'The token lives in data/.update_token (auto-generated) or WARTAB_UPDATE_TOKEN. Store it here once — it is kept in your browser only.'));

    // Auto-load status (server TTL-caches the git fetch so this is cheap).
    (function () {
      fetchStatus(false)
        .then(function (s) { renderStatus(s, statusHolder); })
        .catch(function (e) {
          statusHolder.innerHTML = '';
          statusHolder.appendChild(el('div', 'font-size:var(--text-xs);color:#f87171;', '⚠ ' + e.message));
        });
    })();
    return container;
  }

  // Expose to buildSystemPanel (config-panel.js calls wartabUpdatesBuild()).
  window.wartabUpdatesBuild = build;
})();
