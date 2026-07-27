/* ═══════════════════════════════════════════
   WarTab — Git Card Module
   Connects to any Git forge to show:
   - Repo stars, language, last update
   - Latest CI/build status
   - Clickable link to the repo
   Supports: GitHub, Gitea, Forgejo, GitLab.
   ═══════════════════════════════════════════ */

const GIT_FORGES = {
  github: {
    label: 'GitHub',
    apiUrl: (base, owner, repo) => 'https://api.github.com/repos/' + owner + '/' + repo,
    ciUrl: (base, owner, repo) => 'https://api.github.com/repos/' + owner + '/' + repo + '/actions/runs?per_page=1',
    repoUrl: (base, owner, repo) => 'https://github.com/' + owner + '/' + repo,
    headers: key => key ? { 'Authorization': 'Bearer ' + key, 'Accept': 'application/vnd.github.v3+json' } : {},
    parseRepo: d => ({
      stars: d.stargazers_count,
      language: d.language,
      description: d.description,
      updated: d.updated_at,
      openIssues: d.open_issues_count,
      forks: d.forks_count,
    }),
    parseCi: d => {
      const runs = d.workflow_runs || [];
      if (!runs.length) return null;
      const latest = runs[0];
      return {
        status: latest.conclusion || latest.status,
        name: latest.name,
        updated: latest.updated_at,
        url: latest.html_url,
      };
    },
  },
  gitea: {
    label: 'Gitea / Forgejo',
    apiUrl: (base, owner, repo) => (base || 'https://codeberg.org') + '/api/v1/repos/' + owner + '/' + repo,
    ciUrl: (base, owner, repo) => (base || 'https://codeberg.org') + '/api/v1/repos/' + owner + '/' + repo + '/actions/runs?limit=1',
    repoUrl: (base, owner, repo) => (base || 'https://codeberg.org') + '/' + owner + '/' + repo,
    headers: key => key ? { 'Authorization': 'token ' + key } : {},
    parseRepo: d => ({
      stars: d.stars_count,
      language: d.language,
      description: d.description,
      updated: d.updated_at,
      openIssues: d.open_issues_count,
      forks: d.forks_count,
    }),
    parseCi: d => {
      const runs = Array.isArray(d) ? d : [];
      if (!runs.length) return null;
      const latest = runs[0];
      return {
        status: latest.conclusion || latest.status || '',
        name: latest.title || '',
        updated: latest.started_at || '',
        url: '',
      };
    },
  },
  gitlab: {
    label: 'GitLab',
    apiUrl: (base, owner, repo) => (base || 'https://gitlab.com') + '/api/v4/projects/' + encodeURIComponent(owner + '/' + repo),
    ciUrl: (base, owner, repo) => (base || 'https://gitlab.com') + '/api/v4/projects/' + encodeURIComponent(owner + '/' + repo) + '/pipelines?per_page=1',
    repoUrl: (base, owner, repo) => (base || 'https://gitlab.com') + '/' + owner + '/' + repo,
    headers: key => key ? { 'PRIVATE-TOKEN': key } : {},
    parseRepo: d => ({
      stars: d.star_count,
      language: null,  // GitLab API doesn't expose primary language in project endpoint
      description: d.description,
      updated: d.last_activity_at,
      openIssues: d.open_issues_count,
      forks: d.forks_count,
    }),
    parseCi: d => {
      const pipes = Array.isArray(d) ? d : [];
      if (!pipes.length) return null;
      const latest = pipes[0];
      return {
        status: latest.status,
        name: '#' + latest.id,
        updated: latest.updated_at || latest.finished_at,
        url: latest.web_url || '',
      };
    },
  },
};

registerModule('git', {
  defaults: {
    forge: 'github',
    url: '',        // base URL for self-hosted forges
    owner: '',
    repo: '',
    key: '',
    showCi: true,
  },

  render: (sec, card, cw) => {
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:4px 0;';

    if (!sec.owner || !sec.repo) {
      w.innerHTML = '';
      w.appendChild(ds.empty('code-2', 'Configure Git Repo',
        'Add your repository details in the card editor.', {
          label: 'Edit card',
          onClick: function() { openCardEditPanel(card.id); }
        }));
      cw.appendChild(w); return;
    }

    const forge = GIT_FORGES[sec.forge] || GIT_FORGES.github;
    const headers = forge.headers(sec.key);
    const repoUrl = forge.repoUrl(sec.url, sec.owner, sec.repo);
    const apiUrl = forge.apiUrl(sec.url, sec.owner, sec.repo);

    function directFetch(url) {
      return fetch(url, { headers: headers }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    // Header with repo link
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:4px;';
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:var(--text-lg);opacity:0.7;';
    icon.textContent = sec.forge === 'github' ? '⚙' : sec.forge === 'gitlab' ? '🦊' : '🗄';
    hdr.appendChild(icon);
    const link = document.createElement('a');
    link.href = repoUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = 'font-size:var(--text-sm);font-weight:600;color:var(--text-primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    link.textContent = sec.owner + '/' + sec.repo;
    link.title = 'Open on ' + forge.label;
    hdr.appendChild(link);
    w.appendChild(hdr);

    w.innerHTML += '<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:4px 0;text-align:center;">Loading...</div>';
    cw.appendChild(w);

    function statRow(label, value, accent, href) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.style.cssText = 'font-weight:600;font-variant-numeric:tabular-nums;color:' + (accent || 'var(--text-primary)') + ';';
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.style.cssText = 'color:inherit;text-decoration:none;';
        a.textContent = value;
        val.appendChild(a);
      } else {
        val.textContent = value;
      }
      row.appendChild(lbl); row.appendChild(val);
      return row;
    }

    const promises = [
      directFetch(apiUrl).then(forge.parseRepo).catch(() => ({ stars: '—', language: '—', description: '', updated: null, openIssues: '—', forks: '—' })),
    ];

    if (sec.showCi) {
      const ciUrl = forge.ciUrl(sec.url, sec.owner, sec.repo);
      promises.push(directFetch(ciUrl).then(forge.parseCi).catch(() => null));
    } else {
      promises.push(Promise.resolve(null));
    }

    Promise.all(promises).then(([repo, ci]) => {
      w.innerHTML = '';
      w.appendChild(hdr);

      // Description
      if (repo.description) {
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:var(--text-xs);color:var(--text-secondary);padding:2px 0 6px;line-height:1.4;';
        desc.textContent = repo.description;
        w.appendChild(desc);
      }

      // Stats row
      const statsRow = document.createElement('div');
      statsRow.style.cssText = 'display:flex;gap:var(--space-3);padding:4px 0;flex-wrap:wrap;';
      
      if (repo.stars !== '—') {
        const starEl = document.createElement('span');
        starEl.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:var(--text-xs);color:var(--text-secondary);';
        starEl.innerHTML = '★ <strong style="color:var(--text-primary);font-weight:600;">' + repo.stars + '</strong>';
        statsRow.appendChild(starEl);
      }
      if (repo.forks !== '—') {
        const forkEl = document.createElement('span');
        forkEl.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:var(--text-xs);color:var(--text-secondary);';
        forkEl.innerHTML = '⑂ <strong style="color:var(--text-primary);font-weight:600;">' + repo.forks + '</strong>';
        statsRow.appendChild(forkEl);
      }
      if (repo.language) {
        const langEl = document.createElement('span');
        langEl.style.cssText = 'font-size:var(--text-xs);color:var(--text-tertiary);';
        langEl.textContent = repo.language;
        statsRow.appendChild(langEl);
      }
      if (repo.openIssues !== '—') {
        const issEl = document.createElement('span');
        issEl.style.cssText = 'font-size:var(--text-xs);color:var(--text-tertiary);';
        issEl.textContent = repo.openIssues + ' issues';
        statsRow.appendChild(issEl);
      }
      w.appendChild(statsRow);

      // Last updated
      if (repo.updated) {
        const ts = new Date(repo.updated);
        const now = new Date();
        const diffMs = now - ts;
        const diffDays = Math.floor(diffMs / 86400000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMin = Math.floor(diffMs / 60000);
        let rel;
        if (diffMin < 1) rel = 'just now';
        else if (diffMin < 60) rel = diffMin + 'm ago';
        else if (diffHrs < 24) rel = diffHrs + 'h ago';
        else rel = diffDays + 'd ago';
        w.appendChild(statRow('Updated', rel, 'var(--text-tertiary)'));
      }

      // CI status
      if (ci) {
        const statusMap = {
          'success': { label: 'Passing', color: 'var(--color-success)' },
          'failure': { label: 'Failing', color: 'var(--color-error)' },
          'cancelled': { label: 'Cancelled', color: 'var(--text-tertiary)' },
          'skipped': { label: 'Skipped', color: 'var(--text-tertiary)' },
          'running': { label: 'Running', color: 'var(--color-warning)' },
          'pending': { label: 'Pending', color: 'var(--color-warning)' },
          'null': { label: 'No status', color: 'var(--text-tertiary)' },
        };
        const s = statusMap[ci.status] || { label: ci.status || 'Unknown', color: 'var(--text-warning)' };
        const lbl = 'CI: ' + (ci.name || '');
        w.appendChild(statRow(lbl, s.label, s.color, ci.url));
      }
    }).catch(err => {
      w.innerHTML = '';
      w.appendChild(hdr);
      const errEl = document.createElement('div');
      errEl.style.cssText = 'color:var(--color-error);font-size:var(--text-sm);padding:4px 0;';
      errEl.textContent = '⚠ ' + err.message;
      w.appendChild(errEl);
    });
  },

  editor: (sec, card, bd) => {
    // Quick setup: paste a repo URL to auto-detect forge + owner + repo
    bd.appendChild(cpLabel('Quick Setup (paste repo URL)'));
    var quickInp = cpInput('https://github.com/owner/repo', '', function(v) {
      var match;
      match = v.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (match) { sec.forge = 'github'; sec.owner = match[1]; sec.repo = match[2].replace(/\.git$/, ''); saveAndRefreshStructural(); return; }
      match = v.match(/gitlab\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (match) { sec.forge = 'gitlab'; sec.owner = match[1]; sec.repo = match[2].replace(/\.git$/, ''); saveAndRefreshStructural(); return; }
      match = v.match(/(https?:\/\/[^\/]+)\/([^\/]+)\/([^\/\?#]+)/);
      if (match) { sec.forge = 'gitea'; sec.url = match[1]; sec.owner = match[2]; sec.repo = match[3].replace(/\.git$/, ''); saveAndRefreshStructural(); }
    });
    bd.appendChild(quickInp);

    bd.appendChild(cpLabel('Git Forge'));
    bd.appendChild(cpSelect(
      [{ value: 'github', label: 'GitHub' },
       { value: 'gitea', label: 'Gitea / Forgejo' },
       { value: 'gitlab', label: 'GitLab' }],
      sec.forge || 'github',
      v => { sec.forge = v; saveAndRefresh(); }
    ));

    // Show URL field only for self-hosted forges
    if (sec.forge && sec.forge !== 'github') {
      bd.appendChild(cpLabel('Instance URL'));
      bd.appendChild(cpInput('https://git.example.com', sec.url || '', v => { sec.url = v; saveConfig(); }));
    }

    bd.appendChild(cpLabel('Owner'));
    bd.appendChild(cpInput('username', sec.owner || '', v => { sec.owner = v; saveConfig(); }));

    bd.appendChild(cpLabel('Repository'));
    bd.appendChild(cpInput('repo-name', sec.repo || '', v => { sec.repo = v; saveConfig(); }));

    bd.appendChild(cpLabel('API Token (optional for public repos)'));
    const ki = cpInput('Personal access token', sec.key || '', v => { sec.key = v; saveConfig(); });
    ki.type = 'password';
    bd.appendChild(ki);

    bd.appendChild(cpCheck('Show CI/build status', sec.showCi !== false, v => { sec.showCi = v; saveConfig(); }));
    bd.appendChild(cpHint('For GitHub: generate a token at Settings > Developer settings > Personal access tokens. For self-hosted forges, the instance URL must be accessible from WarTab\'s server.'));
  },
});