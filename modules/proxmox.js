/* ═══════════════════════════════════════════
   WarTab — Proxmox Card Module
   Monitors Proxmox VE cluster:
   - Node status (online/offline, CPU, memory)
   - VM & LXC counts (total / running)
   Uses Proxmox API tokens for auth.
   ═══════════════════════════════════════════ */

registerModule('proxmox', {
  defaults: { url: '', username: '', password: '', node: '' },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:4px 0;';

    if (!sec.url || !sec.username || !sec.password) {
      w.innerHTML = '';
      w.appendChild(ds.empty('server', 'Configure Proxmox',
        'Add your Proxmox server URL and API credentials in the card editor.', {
          label: 'Edit card',
          onClick: function() { openCardEditPanel(card.id); }
        }));
      cw.appendChild(w); return;
    }

    const base = sec.url.replace(/\/+$/, '');
    // Proxmox API tokens authenticate with a dedicated header, not HTTP Basic:
    //   Authorization: PVEAPIToken=user@realm!tokenid=secret
    // Legacy config keeps the same two fields — username holds
    // "user@realm!tokenid" and password holds the token secret.
    const headers = { 'Authorization': 'PVEAPIToken=' + sec.username + '=' + sec.password };

    function authHint(message) {
      // Turn an opaque HTTP status into something the operator can act on.
      if (/\b40[13]\b/.test(String(message))) {
        return sec.username.indexOf('!') === -1
          ? 'Authentication failed — the token ID must look like user@realm!tokenid.'
          : 'Authentication failed — check the API token ID and secret, and that the token has permissions.';
      }
      return message;
    }

    function isAuthError(err) { return /Authentication failed/.test(String(err && err.message)); }

    function fetchJson(endpoint) {
      return WarTabHttp.request(base + endpoint, { headers: headers, timeout: 15000 }).then(data => {
        if (data && data.data !== undefined) return data.data;
        return data;
      }, err => { throw new Error(authHint(err && err.message)); });
    }

    function statRow(label, value, accent) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:var(--mod-justify,space-between);gap:calc(var(--space-2) * var(--mod-density,1));padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.style.cssText = 'font-weight:600;font-variant-numeric:tabular-nums;color:' + (accent || 'var(--text-primary)') + ';';
      val.textContent = value;
      row.appendChild(lbl); row.appendChild(val);
      return row;
    }

    function groupHeader(label, dotColor) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 0 3px;margin-top:4px;border-bottom:1px solid rgba(255,255,255,0.08);';
      if (dotColor) {
        const dot = document.createElement('span');
        dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;';
        hdr.appendChild(dot);
      }
      const title = document.createElement('span');
      title.style.cssText = 'font-size:var(--text-sm);font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.8px;';
      title.textContent = label;
      hdr.appendChild(title);
      return hdr;
    }

    w.innerHTML = '<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:8px 0;text-align:center;">Loading Proxmox...</div>';
    cw.appendChild(w);

    function load() {
      // Parallel fetches: cluster resources + cluster status
      return Promise.all([
        // Cluster resources — gives total VMs/LXCs with status
        fetchJson('/api2/json/cluster/resources').then(items => {
          const vms = items.filter(i => i.type === 'qemu');
          const lxc = items.filter(i => i.type === 'lxc');
          return {
            nodes: items.filter(i => i.type === 'node'),
            vmsTotal: vms.length,
            vmsRunning: vms.filter(v => v.status === 'running').length,
            lxcTotal: lxc.length,
            lxcRunning: lxc.filter(l => l.status === 'running').length,
          };
        }).catch(err => { if (isAuthError(err)) throw err; return { vmsTotal: '—', vmsRunning: '—', lxcTotal: '—', lxcRunning: '—' }; }),

        // Cluster membership and availability
        fetchJson('/api2/json/cluster/status').then(nodes => {
          // /cluster/status exposes online (boolean/0/1), not resource metrics.
          const online = nodes.filter(n => n.type === 'node' && (n.online === 1 || n.online === true));
          const offline = nodes.filter(n => n.type === 'node' && (n.online === 0 || n.online === false));
          return { nodesOnline: online.length, nodesOffline: offline.length };
        }).catch(err => { if (isAuthError(err)) throw err; return { nodesOnline: '—', nodesOffline: '—' }; })
      ]).then(([resources, cluster]) => {
        w.innerHTML = '';
        // /cluster/resources provides load fractions and byte-valued mem/maxmem.
        let cpuMax=0,cpuUsed=0,memMax=0,memUsed=0;
        (resources.nodes||[]).filter(n=>n.status==='online').forEach(n=>{
          if(Number.isFinite(n.maxcpu)&&n.maxcpu>0&&Number.isFinite(n.cpu)){cpuMax+=n.maxcpu;cpuUsed+=n.cpu*n.maxcpu;}
          if(Number.isFinite(n.maxmem)&&n.maxmem>0&&Number.isFinite(n.mem)){memMax+=n.maxmem;memUsed+=n.mem;}
        });

        // Node status — only green when there is real data and nothing is
        // offline. A failed fetch (all '—') must not render a reassuring green
        // dot on either the header or the status row.
        const healthy = cluster.nodesOnline > 0 && cluster.nodesOffline === 0;
        const nodeCount = cluster.nodesOnline !== '—'
          ? cluster.nodesOnline + (cluster.nodesOffline > 0 ? '/' + cluster.nodesOffline + ' offline' : ' online')
          : '—';
        w.appendChild(groupHeader('Nodes', healthy ? 'var(--color-success)' : 'var(--color-error)'));
        w.appendChild(statRow('Status', nodeCount, healthy ? 'var(--color-success)' : 'var(--color-error)'));

        // CPU usage — real cluster average now that cpuUsed is aggregated correctly
        if (cpuMax > 0) {
          const cpuPct = Math.min(cpuUsed / cpuMax * 100, 100);
          w.appendChild(statRow('CPU', cpuPct.toFixed(0) + '%', cpuPct > 80 ? 'var(--color-warning)' : 'var(--text-primary)'));
        }

        // Memory
        if (memMax > 0) {
          const memPct = memUsed / memMax * 100;
          const mu = Math.round(memUsed / 1024 / 1024 / 1024 * 10) / 10;
          const mt = Math.round(memMax / 1024 / 1024 / 1024 * 10) / 10;
          w.appendChild(statRow('Memory', mu + '/' + mt + ' GB', memPct > 80 ? 'var(--color-warning)' : 'var(--text-primary)'));
        }

        // VMs
        w.appendChild(groupHeader('Virtual Machines', 'var(--accent)'));
        w.appendChild(statRow('QEMU', resources.vmsRunning + ' / ' + resources.vmsTotal + ' running', resources.vmsRunning > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));
        w.appendChild(statRow('LXC', resources.lxcRunning + ' / ' + resources.lxcTotal + ' running', resources.lxcRunning > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));

        // Freshness — same primitive the network/service modules use
        const tsEl = document.createElement('div');
        tsEl.style.cssText = 'padding-top:4px;';
        tsEl.appendChild(ds.freshness(Date.now(), 180000));
        w.appendChild(tsEl);
      }).catch(err => {
        w.innerHTML = '';
        w.appendChild(ds.error('Proxmox unavailable', escHtml(err.message || 'Check the URL and credentials.'), {
          label: 'Retry',
          onClick: load
        }));
      });
    }
    WarTabHttp.createPoller({ owner: cw, interval: 60000, task: load, onError: function() {} });
  },

  editor: (sec, card, bd) => {
    bd.appendChild(cpLabel('Proxmox URL'));
    bd.appendChild(cpInput('https://proxmox.local:8006', sec.url || '', v => { sec.url = v; saveConfig(); }));
    bd.appendChild(cpLabel('API Token ID'));
    bd.appendChild(cpInput('user@pam!tokenid', sec.username || '', v => { sec.username = v; saveConfig(); }));
    bd.appendChild(cpLabel('API Token Secret'));
    const pi = cpInput('Token secret', sec.password || '', v => { sec.password = v; saveConfig(); });
    pi.type = 'password';
    bd.appendChild(pi);
    bd.appendChild(cpHint('Create an API token in Datacenter > Permissions > API Tokens. Use user@realm!tokenid as the token ID and the token secret below. WarTab sends it as an Authorization: PVEAPIToken header — the token needs at least PVEAuditor for read-only stats.'));
  },
});