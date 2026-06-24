/* ═══════════════════════════════════════════
   WarTab — Status Bar Stats
   Depends on: $, storage, config
   ═══════════════════════════════════════════ */
/* ── Status Bar ── */
function initStatusBar(){renderStatusBar();clearInterval(statsTimer);const sb=config.statusBar;if(!sb||!sb.enabled)return;const ms=(sb.refreshInterval||15)*1000;statsTimer=setInterval(fetchStats,ms);fetchStats();}
function renderStatusBar(){const bar=$('#top-stats'),sb=config.statusBar;if(!sb||!sb.enabled){bar.classList.add('hidden');bar.innerHTML='';return;}bar.classList.remove('hidden');bar.innerHTML='<span class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value" id="stat-loading">Connecting...</span></span>';}
function fetchStats(){const sb=config.statusBar;if(!sb||!sb.enabled)return;storage.getStats(sb.source,sb.glancesUrl).then(function(d){renderStats(d,sb);}).catch(function(){const el=$('#stat-loading');if(el)el.textContent='Stats offline';});}
// Build stat DOM elements from data and items array — shared by both top-bar and widget renderers
function buildStatItems(data, items){
  const parts=[];
  if(items.includes('hostname')&&data.hostname)parts.push(stItem('\uD83D\uDDA5\uFE0F','',data.hostname,null));
  if(items.includes('cpu')){const p=typeof data.cpu==='number'?data.cpu:(data.cpu&&data.cpu.total)?data.cpu.total:0;parts.push(stItem('\u26A1','CPU',p+'%',p));}
  if(items.includes('memory')){const m=data.memory||{};parts.push(stItem('\uD83E\uDDE0','RAM',(m.percent||0)+'%',m.percent||0));}
  if(items.includes('disk')){const disks=data.disks||[],r=disks.find(function(d2){return d2.mount==='/'})||disks[0];if(r)parts.push(stItem('\uD83D\uDCBE',r.mount,r.percent+'%',r.percent));}
  if(items.includes('uptime')){const u=data.uptime||{};parts.push(stItem('\u23F1\uFE0F','Up',u.string||'--'));}
  return parts;
}
function renderStats(data,sb){const bar=$('#top-stats');bar.innerHTML='';const parts=buildStatItems(data,sb.items||[]);parts.forEach(function(el,i){if(i>0){const s=document.createElement('span');s.className='stat-sep';s.textContent='\u00B7';bar.appendChild(s);}bar.appendChild(el);});if(!parts.length)bar.innerHTML='<span class="stat-item"><span class="stat-value">No stats</span></span>';}
// Build a status bar stat element (icon + label + optional progress bar + value)
function stItem(icon,label,value,pct){const div=document.createElement('span');div.className='stat-item';const ic=document.createElement('span');ic.className='stat-icon';ic.textContent=icon;div.appendChild(ic);if(label){const l=document.createElement('span');l.className='stat-label';l.textContent=label;div.appendChild(l);}if(pct!==null&&pct!==undefined){const b=document.createElement('span');b.className='stat-bar';const f=document.createElement('span');f.className='stat-bar-fill'+(pct>80?' high':pct>60?' mid':'');f.style.width=pct+'%';b.appendChild(f);div.appendChild(b);}const v=document.createElement('span');v.className='stat-value';v.textContent=value;div.appendChild(v);return div;}
