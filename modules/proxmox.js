/* ═══════════════════════════════════════════
   WarTab — Proxmox Card Module
   Monitors Proxmox VE cluster:
   - Node status (online/offline, CPU, memory)
   - VM & LXC counts (total / running)
   Uses Proxmox API tokens for auth.
   All requests via /api/proxy to bypass CORS.
   ═══════════════════════════════════════════ */

registerModule('proxmox', {
  defaults: { url: '', username: '', password: '', node: '' },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:4px 0;';

    if (!sec.url || !sec.username || !sec.password) {
      w.innerHTML = '<div style="color:var(--text-tertiary);font-size:var(--text-sm);padding:8px 0;text-align:center;">Configure Proxmox in the card editor</div>';
      cw.appendChild(w); return;
    }

    const base = sec.url.replace(/\/+$/, '');
    // Basic auth: username is "user@realm!tokenid", password is the token secret
    const auth = btoa(sec.username + ':' + sec.password);
    const headers = { 'Authorization': 'Basic ' + auth };

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
        const data = r.body;
        if (data && data.data !== undefined) return data.data;
        return data;
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

    // Parallel fetches: cluster resources + cluster status
    Promise.all([
      // Cluster resources — gives total VMs/LXCs with status
      fetchJson('/api2/json/cluster/resources').then(items => {
        const vms = items.filter(i => i.type === 'qemu');
        const lxc = items.filter(i => i.type === 'lxc');
        return {
          vmsTotal: vms.length,
          vmsRunning: vms.filter(v => v.status === 'running').length,
          lxcTotal: lxc.length,
          lxcRunning: lxc.filter(l => l.status === 'running').length,
        };
      }).catch(() => ({ vmsTotal: '—', vmsRunning: '—', lxcTotal: '—', lxcRunning: '—' })),

      // Cluster status — gives node CPU/memory info
      fetchJson('/api2/json/cluster/status').then(nodes => {
        const online = nodes.filter(n => n.type === 'node' && n.status === 'online');
        const offline = nodes.filter(n => n.type === 'node' && n.status === 'offline');
        // Aggregate CPU and memory from online nodes
        let cpuMax = 0, cpuUsed = 0, memMax = 0, memUsed = 0;
        online.forEach(n => {
          if (n.cpu) cpuMax += n.cpu;
          if (n.cpuinfo && n.cpuinfo.cpus) cpuMax = n.cpuinfo.cpus;
          if (n.maxcpu) cpuMax += n.maxcpu;
          if (n.memory && n.memory.total) memMax += n.memory.total;
          if (n.memory && n.memory.used) memUsed += n.memory.used;
        });
        return { nodesOnline: online.length, nodesOffline: offline.length, cpuMax, cpuUsed, memMax, memUsed, nodes };
      }).catch(() => ({ nodesOnline: '—', nodesOffline: '—', cpuMax: 0, cpuUsed: 0, memMax: 0, memUsed: 0, nodes: [] }))
    ]).then(([resources, cluster]) => {
      w.innerHTML = '';

      // Node status
      const allOk = cluster.nodesOffline === 0 || cluster.nodesOffline === '—';
      w.appendChild(groupHeader('Nodes', allOk ? 'var(--color-success)' : 'var(--color-error)'));
      const nodeCount = cluster.nodesOnline !== '—' ? cluster.nodesOnline + (cluster.nodesOffline > 0 ? '/' + cluster.nodesOffline + ' offline' : ' online') : '—';
      w.appendChild(statRow('Status', nodeCount, allOk ? 'var(--color-success)' : 'var(--color-error)'));

      // CPU usage
      if (cluster.cpuMax > 0) {
        const cpuPct = Math.min(cluster.cpuUsed / cluster.cpuMax * 100, 100);
        // Fetch per-node CPU from first online node for actual percentage
        const firstNode = Array.isArray(cluster.nodes) ? cluster.nodes.find(n => n.type === 'node' && n.status === 'online') : null;
        if (firstNode) {
          fetchJson('/api2/json/nodes/' + firstNode.node + '/status').then(nodeStatus => {
            const cpu = nodeStatus.cpu || 0;
            const cpuRow = w.querySelector('[data-stat="cpu"]');
            if (cpuRow) cpuRow.querySelector('.stat-val').textContent = (cpu * 100).toFixed(1) + '%';
          }).catch(() => {});
        }
        // Use cluster-level CPU count as baseline
        w.appendChild(statRow('CPU Cores', Math.round(cluster.cpuMax), 'var(--accent)'));
      }

      // Memory
      if (cluster.memMax > 0) {
        const memPct = cluster.memUsed / cluster.memMax * 100;
        const mu = Math.round(cluster.memUsed / 1024 / 1024 / 1024 * 10) / 10;
        const mt = Math.round(cluster.memMax / 1024 / 1024 / 1024 * 10) / 10;
        w.appendChild(statRow('Memory', mu + '/' + mt + ' GB', memPct > 80 ? 'var(--color-warning)' : 'var(--text-primary)'));
      }

      // VMs
      w.appendChild(groupHeader('Virtual Machines', 'var(--accent)'));
      w.appendChild(statRow('QEMU', resources.vmsRunning + ' / ' + resources.vmsTotal + ' running', resources.vmsRunning > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));
      w.appendChild(statRow('LXC', resources.lxcRunning + ' / ' + resources.lxcTotal + ' running', resources.lxcRunning > 0 ? 'var(--color-success)' : 'var(--text-secondary)'));
    }).catch(err => {
      w.innerHTML = '<div style="color:var(--color-error);font-size:var(--text-sm);padding:4px 0;">⚠ ' + escHtml(err.message) + '</div>';
    });
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
    bd.appendChild(cpHint('Create an API token in Datacenter > Permissions > API Tokens. Use user@pam!tokenid as the username and the secret as the password.'));
  },
});