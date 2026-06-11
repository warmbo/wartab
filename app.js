/* ═══════════════════════════════════════════
   WarTab — Application Logic
   ═══════════════════════════════════════════ */

const DEFAULT_CONFIG = {
  branding: { title:'WarTab', icon:'⚔️' },
  theme: {
    bgType:'gradient', bgValue:'#0a0a0a, #1a1a1a, #0d0d0d',
    blur:20, glow:'#888888', fontSize:'medium',
    fontFamily:'Inter', cardBg:'dark',
  },
  statusBar: {
    enabled: true, source:'local', glancesUrl:'http://localhost:61209',
    customUrl:'', refreshInterval:15,
    items:['cpu','memory','disk','uptime'], hostname:true,
  },
  layout: { cols:4, gap:16, cardMinWidth:240 },
  search: {
    engine:'https://www.google.com/search?q=',
    engines:{ Google:'https://www.google.com/search?q=', DuckDuckGo:'https://duckduckgo.com/?q=', Brave:'https://search.brave.com/search?q=', Bing:'https://www.bing.com/search?q=', YouTube:'https://www.youtube.com/results?search_query=', Reddit:'https://www.reddit.com/search/?q=', Wikipedia:'https://en.wikipedia.org/wiki/Special:Search?search=' },
    selected:'Google', openInNewTab:true,
  },
  cards: [
    { id:'search-card', title:'Quick Search', icon:'🔍', color:'#999999', width:2, sections:[{ id:'search-main', type:'search', engine:'Google', placeholder:'Search anything...', label:'Web Search' }] },
    { id:'clock-card', title:'Time & Date', icon:'🕐', color:'#aaaaaa', width:1, sections:[{ id:'clock-main', type:'clock', format24h:false, showDate:true }] },
    { id:'daily-drivers', title:'Daily Drivers', icon:'🌐', color:'#cccccc', width:2, sections:[
      { id:'dev-links', type:'links', label:'Development', links:[ {label:'GitHub',url:'https://github.com',icon:'🐙'},{label:'GitLab',url:'https://gitlab.com',icon:'🦊'},{label:'Stack Overflow',url:'https://stackoverflow.com',icon:'📚'},{label:'npm',url:'https://www.npmjs.com',icon:'📦'},{label:'PyPI',url:'https://pypi.org',icon:'🐍'} ] },
      { id:'media-links', type:'links', label:'Media & Social', links:[ {label:'Reddit',url:'https://reddit.com',icon:'💬'},{label:'YouTube',url:'https://youtube.com',icon:'▶️'},{label:'Twitch',url:'https://twitch.tv',icon:'🎮'},{label:'X',url:'https://x.com',icon:'🐦'} ] },
    ]},
    { id:'selfhosted', title:'Self-Hosted', icon:'🖥️', color:'#777777', width:2, sections:[{ id:'sh-services', type:'links', label:'Services', links:[ {label:'Home Assistant',url:'http://homeassistant.local:8123',icon:'🏠'},{label:'Jellyfin',url:'http://jellyfin.local:8096',icon:'🎬'},{label:'Pi-hole',url:'http://pi.hole/admin',icon:'🛡️'},{label:'Grafana',url:'http://grafana.local:3000',icon:'📊'},{label:'Portainer',url:'http://portainer.local:9000',icon:'🐳'},{label:'Vaultwarden',url:'http://vault.local:8080',icon:'🔐'} ] }] },
    { id:'dev-docs', title:'Dev Docs', icon:'📖', color:'#8a8a8a', width:1, sections:[{ id:'docs-links', type:'link-list', label:'References', links:[ {label:'MDN Web Docs',url:'https://developer.mozilla.org',icon:'🌍'},{label:'React Docs',url:'https://react.dev',icon:'⚛️'},{label:'Python Docs',url:'https://docs.python.org/3/',icon:'🐍'},{label:'Docker Docs',url:'https://docs.docker.com',icon:'🐳'},{label:'Arch Wiki',url:'https://wiki.archlinux.org',icon:'📘'} ] }] },
    { id:'notes-card', title:'Quick Notes', icon:'📝', color:'#bbbbbb', width:1, sections:[{ id:'notes-main', type:'notes', label:'Notes', content:'• WarTab is running!\n• Click ✎ on any card to edit it inline.\n• Drag ⠿ to reorder cards.' }] },
  ],
};

const GOOGLE_FONTS = [
  {name:'Inter',category:'sans',sample:'The quick brown fox'},
  {name:'Space Grotesk',category:'sans',sample:'The quick brown fox'},
  {name:'Plus Jakarta Sans',category:'sans',sample:'The quick brown fox'},
  {name:'DM Sans',category:'sans',sample:'The quick brown fox'},
  {name:'Outfit',category:'sans',sample:'The quick brown fox'},
  {name:'Sora',category:'sans',sample:'The quick brown fox'},
  {name:'Manrope',category:'sans',sample:'The quick brown fox'},
  {name:'Onest',category:'sans',sample:'The quick brown fox'},
  {name:'Rubik',category:'sans',sample:'The quick brown fox'},
  {name:'Urbanist',category:'sans',sample:'The quick brown fox'},
  {name:'Be Vietnam Pro',category:'sans',sample:'The quick brown fox'},
  {name:'Epilogue',category:'sans',sample:'The quick brown fox'},
  {name:'Josefin Sans',category:'sans',sample:'The quick brown fox'},
  {name:'Karla',category:'sans',sample:'The quick brown fox'},
  {name:'Lexend',category:'sans',sample:'The quick brown fox'},
  {name:'Nunito',category:'sans',sample:'The quick brown fox'},
  {name:'Poppins',category:'sans',sample:'The quick brown fox'},
  {name:'Quicksand',category:'sans',sample:'The quick brown fox'},
  {name:'Raleway',category:'sans',sample:'The quick brown fox'},
  {name:'Work Sans',category:'sans',sample:'The quick brown fox'},
  {name:'Montserrat',category:'sans',sample:'The quick brown fox'},
  {name:'Open Sans',category:'sans',sample:'The quick brown fox'},
  {name:'Fira Sans',category:'sans',sample:'The quick brown fox'},
  {name:'Dosis',category:'sans',sample:'The quick brown fox'},
  {name:'Barlow',category:'sans',sample:'The quick brown fox'},
  {name:'Figtree',category:'sans',sample:'The quick brown fox'},
  {name:'Syne',category:'sans',sample:'The quick brown fox'},
  {name:'Archivo',category:'sans',sample:'The quick brown fox'},
  {name:'Chivo',category:'sans',sample:'The quick brown fox'},
  {name:'IBM Plex Sans',category:'sans',sample:'The quick brown fox'},
  {name:'JetBrains Mono',category:'mono',sample:'console.log("hello")'},
  {name:'DM Mono',category:'mono',sample:'const fn = (x) => x'},
  {name:'Fira Code',category:'mono',sample:'const fn = (x) => x'},
  {name:'Fraunces',category:'serif',sample:'The quick brown fox'},
  {name:'Literata',category:'serif',sample:'The quick brown fox'},
  {name:'Lora',category:'serif',sample:'The quick brown fox'},
  {name:'IBM Plex Serif',category:'serif',sample:'The quick brown fox'},
];

const ICON_CDN = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png';
const ICON_REPO = [
  {name:'Home Assistant',file:'homeassistant',tags:['home','automation','smarthome']},{name:'Jellyfin',file:'jellyfin',tags:['media','video','streaming']},{name:'Plex',file:'plex',tags:['media','video','streaming']},{name:'Emby',file:'emby',tags:['media','video','streaming']},{name:'Sonarr',file:'sonarr',tags:['media','tv','downloads']},{name:'Radarr',file:'radarr',tags:['media','movies','downloads']},{name:'Lidarr',file:'lidarr',tags:['media','music','downloads']},{name:'Readarr',file:'readarr',tags:['media','books','downloads']},{name:'Prowlarr',file:'prowlarr',tags:['media','indexer','downloads']},{name:'qBittorrent',file:'qbittorrent',tags:['torrent','downloads']},{name:'Deluge',file:'deluge',tags:['torrent','downloads']},{name:'Transmission',file:'transmission',tags:['torrent','downloads']},{name:'SABnzbd',file:'sabnzbd',tags:['usenet','downloads']},{name:'Pihole',file:'pihole',tags:['dns','adblock','network']},{name:'AdGuard',file:'adguard',tags:['dns','adblock','network']},{name:'Grafana',file:'grafana',tags:['monitoring','metrics','dashboard']},{name:'Prometheus',file:'prometheus',tags:['monitoring','metrics']},{name:'Portainer',file:'portainer',tags:['docker','container','management']},{name:'Docker',file:'docker',tags:['container']},{name:'Traefik',file:'traefik',tags:['proxy','reverse-proxy','network']},{name:'Nginx',file:'nginx',tags:['proxy','web-server']},{name:'Caddy',file:'caddy',tags:['proxy','web-server']},{name:'Nextcloud',file:'nextcloud',tags:['cloud','files','sync']},{name:'OwnCloud',file:'owncloud',tags:['cloud','files','sync']},{name:'Vaultwarden',file:'vaultwarden',tags:['password','security']},{name:'Bitwarden',file:'bitwarden',tags:['password','security']},{name:'Authentik',file:'authentik',tags:['auth','sso','security']},{name:'Authelia',file:'authelia',tags:['auth','sso','security']},{name:'Uptime Kuma',file:'uptimekuma',tags:['monitoring','uptime','status']},{name:'GitHub',file:'github',tags:['git','code','dev']},{name:'GitLab',file:'gitlab',tags:['git','code','dev']},{name:'Gitea',file:'gitea',tags:['git','code','dev']},{name:'Jenkins',file:'jenkins',tags:['ci','cd','build']},{name:'n8n',file:'n8n',tags:['automation','workflow']},{name:'Node-RED',file:'nodered',tags:['automation','workflow','iot']},{name:'Homebridge',file:'homebridge',tags:['smarthome','homekit']},{name:'Proxmox',file:'proxmox',tags:['virtualization','hypervisor']},{name:'TrueNAS',file:'truenas',tags:['nas','storage']},{name:'Unraid',file:'unraid',tags:['nas','storage']},{name:'WireGuard',file:'wireguard',tags:['vpn','network']},{name:'Tailscale',file:'tailscale',tags:['vpn','network']},{name:'Speedtest',file:'speedtest',tags:['network','speed']},{name:'Nginx Proxy Manager',file:'nginxproxymanager',tags:['proxy','management']},{name:'Homer',file:'homer',tags:['dashboard']},{name:'Organizr',file:'organizr',tags:['dashboard']},{name:'Dashy',file:'dashy',tags:['dashboard']},{name:'Heimdall',file:'heimdall',tags:['dashboard']},{name:'Netdata',file:'netdata',tags:['monitoring','metrics','system']},{name:'InfluxDB',file:'influxdb',tags:['database','metrics','time-series']},{name:'PostgreSQL',file:'postgresql',tags:['database']},{name:'MySQL',file:'mysql',tags:['database']},{name:'MongoDB',file:'mongodb',tags:['database']},{name:'Redis',file:'redis',tags:['database','cache']},{name:'Python',file:'python',tags:['language','code']},{name:'Node.js',file:'nodejs',tags:['language','runtime']},{name:'Apache',file:'apache',tags:['web-server']},{name:'Syncthing',file:'syncthing',tags:['sync','files']},{name:'Restic',file:'restic',tags:['backup']},{name:'Borg',file:'borg',tags:['backup']},{name:'Duplicati',file:'duplicati',tags:['backup']},{name:'Calibre',file:'calibre',tags:['books','library']},{name:'Tautulli',file:'tautulli',tags:['media','plex','monitoring']},{name:'Ombi',file:'ombi',tags:['media','requests']},{name:'Overseerr',file:'overseerr',tags:['media','requests']},{name:'Jellyseerr',file:'jellyseerr',tags:['media','requests']},{name:'Jackett',file:'jackett',tags:['media','indexer']},{name:'FlareSolverr',file:'flaresolverr',tags:['proxy','captcha']},{name:'Ngrok',file:'ngrok',tags:['tunnel','proxy']},{name:'Cloudflare',file:'cloudflare',tags:['cdn','dns','security']},{name:'OpenVPN',file:'openvpn',tags:['vpn','network']},{name:'Pfsense',file:'pfsense',tags:['firewall','router']},{name:'OPNsense',file:'opnsense',tags:['firewall','router']},{name:'HAProxy',file:'haproxy',tags:['proxy','load-balancer']},{name:'Kubernetes',file:'kubernetes',tags:['container','orchestration']},{name:'Ansible',file:'ansible',tags:['automation','config-management']},{name:'Terraform',file:'terraform',tags:['infrastructure','iac']},{name:'Discord',file:'discord',tags:['chat','social']},{name:'Slack',file:'slack',tags:['chat','social']},{name:'Mattermost',file:'mattermost',tags:['chat','social']},{name:'Matrix',file:'matrix',tags:['chat','social']},{name:'Reddit',file:'reddit',tags:['social','forum']},{name:'YouTube',file:'youtube',tags:['video','social']},{name:'Twitch',file:'twitch',tags:['streaming','social']},{name:'Wikipedia',file:'wikipedia',tags:['reference','wiki']},{name:'Stack Overflow',file:'stackoverflow',tags:['code','reference']},{name:'Arch Linux',file:'archlinux',tags:['linux','os']},{name:'Ubuntu',file:'ubuntu',tags:['linux','os']},{name:'Debian',file:'debian',tags:['linux','os']},{name:'Alpine',file:'alpine',tags:['linux','os','container']},{name:'Git',file:'git',tags:['version-control']},{name:'VS Code',file:'vscode',tags:['editor','code']},{name:'Firefox',file:'firefox',tags:['browser']},{name:'Chrome',file:'chrome',tags:['browser']},{name:'Unifi',file:'unifi',tags:['network','wifi','ubiquiti']},{name:'OpenWRT',file:'openwrt',tags:['router','network']},{name:'Frigate',file:'frigate',tags:['nvr','camera','vision']},{name:'Scrypted',file:'scrypted',tags:['smarthome','camera']},{name:'ESPHome',file:'esphome',tags:['iot','smarthome']},{name:'MQTT',file:'mqtt',tags:['iot','messaging']},{name:'Zigbee2MQTT',file:'zigbee2mqtt',tags:['iot','smarthome','zigbee']},{name:'Mosquitto',file:'mosquitto',tags:['mqtt','iot']},{name:'OpenMediaVault',file:'openmediavault',tags:['nas','storage']},{name:'Filebrowser',file:'filebrowser',tags:['files','management']},{name:'Navidrome',file:'navidrome',tags:['music','streaming']},{name:'Airsonic',file:'airsonic',tags:['music','streaming']},{name:'Audiobookshelf',file:'audiobookshelf',tags:['audiobooks','podcasts']},{name:'Immich',file:'immich',tags:['photos','gallery']},{name:'Photoprism',file:'photoprism',tags:['photos','gallery']},{name:'Paperless-ngx',file:'paperlessngx',tags:['documents','scanning']},{name:'Changedetection',file:'changedetection',tags:['monitoring','alerts']},{name:'Miniflux',file:'miniflux',tags:['rss','feeds']},{name:'FreshRSS',file:'freshrss',tags:['rss','feeds']},{name:'Memos',file:'memos',tags:['notes','memos']},{name:'Outline',file:'outline',tags:['wiki','knowledge-base']},{name:'Bookstack',file:'bookstack',tags:['wiki','documentation']},{name:'Wiki.js',file:'wikijs',tags:['wiki','documentation']},{name:'HedgeDoc',file:'hedgedoc',tags:['notes','collaboration']},{name:'Cockpit',file:'cockpit',tags:['server','management']},{name:'CasaOS',file:'casaos',tags:['homelab','dashboard']},{name:'Dockge',file:'dockge',tags:['docker','compose','management']},{name:'Dozzle',file:'dozzle',tags:['docker','logs']},{name:'Watchtower',file:'watchtower',tags:['docker','updates']},{name:'Komodo',file:'komodo',tags:['monitoring','docker']},{name:'Diun',file:'diun',tags:['docker','notifications']},
];

const EMOJIS = ['🔍','🕐','🌐','🖥️','📖','📝','🏠','🎬','🛡️','📊','🐳','🔐','🐙','🦊','📚','📦','🐍','💬','▶️','🎮','🐦','🌍','⚛️','📘','⚔️','⚙️','🔄','✕','🔗','🌟','🔥','💡','🚀','⚡','🎯','🧩','🎨','📡','🔧','🗄️','💾','🖨️','📷','🎥','🎵','🎙️','📻','📺','💻','⌨️','🖱️','📱','💽','💿','📀','🔌','🔋','💎','🧊','⛅','☀️','🌙','⭐','✨','💫','🎆','🌈','☁️','🌊','🔥','🍃','🌱','🌿','☘️','🍀','🏆','🥇','🥈','🥉','🏅','🎖️','🏁','🚩','🎌','📌','📍','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎸','🎺','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🎲','🧩','♠️','♥️','♦️','♣️'];

let config = {}, clockInterval = null, weatherIntervals = [], apiPollTimers = [], statsTimer = null;
let dragState = null, editModeCardId = null, iconPickerCallback = null;
let customIcons = [], customBackgrounds = [], _eqPending = false;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid() { return Math.random().toString(36).substring(2,9)+Date.now().toString(36); }
function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className=`toast ${type}`; el.textContent=msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ── Config ── */
function loadConfig() {
  try {
    const s = localStorage.getItem('wartab');
    if(s) config = deepMerge(cloneObj(DEFAULT_CONFIG), JSON.parse(s));
    else config = cloneObj(DEFAULT_CONFIG);
  } catch(e) { config = cloneObj(DEFAULT_CONFIG); }
  try { customIcons = JSON.parse(localStorage.getItem('wartab-icons')||'[]'); } catch(e) { customIcons = []; }
  try { customBackgrounds = JSON.parse(localStorage.getItem('wartab-bg')||'[]'); } catch(e) { customBackgrounds = []; }
}
function saveConfig() { try { localStorage.setItem('wartab', JSON.stringify(config)); } catch(e) {} }
function deepMerge(t,s) {
  const r=cloneObj(t);
  for(const k in s) { if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])) r[k]=deepMerge(r[k]||{},s[k]); else r[k]=s[k]; }
  return r;
}

/* ── Theme & Branding ── */
function applyTheme() {
  const t=config.theme, bg=$('#bg-canvas');
  switch(t.bgType) {
    case'gradient': bg.style.background=`linear-gradient(135deg,${t.bgValue})`; break;
    case'solid': bg.style.background=t.bgValue.split(',')[0].trim(); break;
    case'image': bg.style.background=`url(${t.bgValue.trim()}) center/cover no-repeat fixed`; break;
    default: bg.style.background=`linear-gradient(135deg,${DEFAULT_CONFIG.theme.bgValue})`;
  }
  const root=document.documentElement;
  root.style.setProperty('--bg-blur',t.blur+'px');
  root.style.setProperty('--accent',t.glow);
  root.style.setProperty('--accent-glow',hexToRgba(t.glow,0.3));
  root.style.setProperty('--accent-glass',hexToRgba(t.glow,0.12));
  root.style.fontSize = ({small:'13px',medium:'14px',large:'16px'})[t.fontSize]||'14px';
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}', 'Segoe UI', system-ui, -apple-system, sans-serif`);
  loadGoogleFont(fn);
  document.documentElement.dataset.cardBg = t.cardBg || 'dark';

  // Branding
  const brand = $('#brand-text');
  if(brand) {
    const b = config.branding || DEFAULT_CONFIG.branding;
    brand.innerHTML = `<span class="brand-icon">${b.icon||'⚔️'}</span><span>${escAttr(b.title||'WarTab')}</span>`;
  }
  document.title = (config.branding||DEFAULT_CONFIG.branding).title || 'WarTab';
}
function hexToRgba(h,a){const c=h.replace('#','');return `rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}
function loadGoogleFont(fontName) {
  const id='wartab-font'; const e=document.getElementById(id);
  if(e&&e.dataset.font===fontName) return;
  if(e) e.remove();
  const l=document.createElement('link'); l.id=id; l.dataset.font=fontName; l.rel='stylesheet';
  l.href=`https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g,'+')}:wght@200..700&display=swap`;
  document.head.appendChild(l);
}
function escAttr(s){if(typeof s!=='string')return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ── Status Bar ── */
function initStatusBar() {
  renderStatusBar();
  clearInterval(statsTimer);
  const sb=config.statusBar;
  if(!sb||!sb.enabled) return;
  const ms=(sb.refreshInterval||15)*1000;
  statsTimer=setInterval(fetchStats, ms);
  fetchStats();
}
function renderStatusBar() {
  const bar=$('#status-bar');
  const sb=config.statusBar;
  if(!sb||!sb.enabled) { bar.classList.add('hidden'); bar.innerHTML=''; return; }
  bar.classList.remove('hidden');
  bar.innerHTML='<span class="stat-item"><span class="stat-icon">⚡</span><span class="stat-value" id="stat-loading">Connecting...</span></span>';
}
function fetchStats() {
  const sb=config.statusBar;
  if(!sb||!sb.enabled) return;
  let url;
  if(sb.source==='local') url='/api/stats';
  else if(sb.source==='glances') url=sb.glancesUrl+'/api/4';
  else if(sb.source==='custom'&&sb.customUrl) url=sb.customUrl;
  else return;
  fetch(url)
    .then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
    .then(data=>renderStats(data,sb))
    .catch(()=>{const el=$('#stat-loading');if(el)el.textContent='Stats offline';});
}
function renderStats(data, sb) {
  const bar=$('#status-bar'); bar.innerHTML='';
  const items=sb.items||[];
  const parts=[];
  // Hostname
  if(sb.hostname!==false&&data.hostname) {
    parts.push(stItem('🖥️','',data.hostname,null));
  }
  // CPU
  if(items.includes('cpu')) {
    let pct = typeof data.cpu==='number'?data.cpu:(data.cpu&&data.cpu.total)?data.cpu.total:null;
    if(pct===null) pct=0;
    parts.push(stItem('⚡','CPU',pct+'%',pct));
  }
  // Memory
  if(items.includes('memory')) {
    const m=data.memory||{};
    const pct=m.percent||0;
    const usedFmt=formatBytes(m.used);
    const totalFmt=formatBytes(m.total);
    parts.push(stItem('🧠','RAM',pct+'%',pct));
  }
  // Disk (show first non-root, or root)
  if(items.includes('disk')) {
    const disks=data.disks||[];
    const root=disks.find(d=>d.mount==='/')||disks[0];
    if(root) {
      parts.push(stItem('💾',root.mount,root.percent+'%',root.percent));
    }
  }
  // Uptime
  if(items.includes('uptime')) {
    const u=data.uptime||{};
    parts.push(stItem('⏱️','Up',u.string||'--'));
  }

  parts.forEach((el,i)=>{
    if(i>0){const sep=document.createElement('span');sep.className='stat-sep';sep.textContent='·';bar.appendChild(sep);}
    bar.appendChild(el);
  });
  if(!parts.length) bar.innerHTML='<span class="stat-item"><span class="stat-value">Stats unavailable</span></span>';
}
function stItem(icon, label, value, pct) {
  const div=document.createElement('span'); div.className='stat-item';
  div.innerHTML=`<span class="stat-icon">${icon}</span>`;
  if(label){const l=document.createElement('span');l.className='stat-label';l.textContent=label;div.appendChild(l);}
  if(pct!==null&&pct!==undefined){
    const bar=document.createElement('span');bar.className='stat-bar';
    const fill=document.createElement('span');fill.className='stat-bar-fill'+(pct>80?' high':pct>60?' mid':'');
    fill.style.width=pct+'%';bar.appendChild(fill);div.appendChild(bar);
  }
  const v=document.createElement('span');v.className='stat-value';v.textContent=value;div.appendChild(v);
  return div;
}
function formatBytes(b){
  if(!b)return '0B';
  const u=['B','KB','MB','GB','TB'];
  let i=0;let v=b;
  while(v>=1024&&i<u.length-1){v/=1024;i++;}
  return (i<2?Math.round(v):v.toFixed(1))+u[i];
}

/* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
function renderAll() {
  apiPollTimers.forEach(clearTimeout); apiPollTimers=[];
  const grid=$('#card-grid'); grid.innerHTML='';
  grid.style.setProperty('--grid-cols',config.layout.cols);
  grid.style.gap=config.layout.gap+'px';
  config.cards.forEach((c,i)=>{ grid.appendChild(c.id===editModeCardId?renderCardEditor(c,i):renderCard(c,i)); });
  setupWeatherWidgets(); setupClocks();
  scheduleEqualize();
  // Focus first inline search
  const firstSearch = grid.querySelector('.inline-search-wrap input');
  if(firstSearch && !document.activeElement?.closest('.card-editing')) firstSearch.focus();
}
function scheduleEqualize(){if(!_eqPending){_eqPending=true;requestAnimationFrame(()=>{_eqPending=false;equalizeCardHeights();});}}
function equalizeCardHeights() {
  const grid=$('#card-grid');const cards=[...grid.children].filter(el=>el.classList.contains('card'));
  if(!cards.length)return;cards.forEach(c=>c.style.minHeight='');
  const rows=[];let curRow=[],curTop=-1;
  cards.forEach(card=>{const r=card.getBoundingClientRect();if(curTop<0||Math.abs(r.top-curTop)>8){if(curRow.length)rows.push(curRow);curRow=[card];curTop=r.top;}else curRow.push(card);});
  if(curRow.length)rows.push(curRow);
  rows.forEach(row=>{if(row.length<2)return;const maxH=Math.max(...row.map(c=>c.offsetHeight));row.forEach(c=>c.style.minHeight=maxH+'px');});
}

/* ── Render card (view) ── */
function renderCard(card, index) {
  const div=document.createElement('div');div.className='card';
  div.dataset.cardId=card.id;div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=index;
  div.style.setProperty('--card-accent',card.color||config.theme.glow);
  const hdr=document.createElement('div');hdr.className='card-header';
  const title=document.createElement('div');title.className='card-title';
  title.appendChild(renderIconElement(card.icon,'card-icon'));
  title.appendChild(document.createTextNode(' '+(card.title||'')));
  hdr.appendChild(title);
  const rg=document.createElement('div');rg.style.cssText='display:flex;align-items:center;gap:4px;';
  const editBtn=document.createElement('button');editBtn.className='card-edit-btn';editBtn.textContent='✎';editBtn.title='Edit this card';
  editBtn.addEventListener('click',e=>{e.stopPropagation();toggleCardEdit(card.id);});rg.appendChild(editBtn);
  const handle=document.createElement('span');handle.className='drag-handle';handle.textContent='⠿';handle.title='Drag to reorder';
  rg.appendChild(handle);hdr.appendChild(rg);div.appendChild(hdr);
  const body=document.createElement('div');body.className='card-body';
  (card.sections||[]).forEach(sec=>{const el=renderSection(sec,card);if(el)body.appendChild(el);});
  div.appendChild(body);
  handle.addEventListener('pointerdown',e=>startDrag(e,card.id,index));
  return div;
}

function renderIconElement(icon,cls) {
  if(!icon){const s=document.createElement('span');s.className=cls;s.textContent='📦';return s;}
  if(icon.startsWith('http')||icon.startsWith('data:')||icon.startsWith('/')){
    const img=document.createElement('img');img.className=cls;img.src=icon;img.alt='';img.loading='lazy';
    img.onerror=function(){this.outerHTML='<span class="'+cls+'">📦</span>';};return img;
  }
  const s=document.createElement('span');s.className=cls;s.textContent=icon;return s;
}

/* ── Render card editor (inline) ── */
function renderCardEditor(card,index){
  const div=document.createElement('div');div.className='card card-editing';
  div.dataset.cardId=card.id;div.dataset.width=Math.min(card.width||1,config.layout.cols);div.dataset.index=index;
  div.style.setProperty('--card-accent',card.color||config.theme.glow);
  const hdr=document.createElement('div');hdr.className='card-header';
  const title=document.createElement('div');title.style.cssText='font-size:14px;font-weight:600;';title.textContent='✎ Editing:';
  const rg=document.createElement('div');rg.style.cssText='display:flex;align-items:center;gap:4px;';
  const doneBtn=document.createElement('button');doneBtn.className='btn btn-glass btn-sm';doneBtn.textContent='Done';
  doneBtn.addEventListener('click',()=>{editModeCardId=null;saveConfig();renderAll();toast('Card saved');});
  rg.appendChild(doneBtn);hdr.appendChild(title);hdr.appendChild(rg);div.appendChild(hdr);
  const body=document.createElement('div');body.className='card-body';
  body.appendChild(inlineField('Title','text',card.title,v=>{card.title=v;saveConfig();}));
  body.appendChild(iconField(card));
  body.appendChild(inlineColor('Color',card.color,v=>{card.color=v;saveConfig();applyTheme();div.style.setProperty('--card-accent',v);}));
  body.appendChild(inlineRange('Width',card.width,1,config.layout.cols,v=>{card.width=parseInt(v);saveConfig();div.dataset.width=Math.min(card.width,config.layout.cols);}));
  const sl=document.createElement('div');sl.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-secondary);margin:12px 0 6px;';sl.textContent='Sections';body.appendChild(sl);
  (card.sections||[]).forEach((sec,si)=>{body.appendChild(renderInlineSection(sec,card,si));});
  const as=document.createElement('button');as.className='btn btn-glass btn-sm';as.style.marginTop='4px';as.textContent='+ Add Section';
  as.addEventListener('click',()=>{card.sections=card.sections||[];card.sections.push({id:'sec-'+uid(),type:'links',label:'New Section',links:[{label:'Example',url:'https://example.com',icon:'🔗'}]});saveConfig();renderAll();toast('Section added');});
  body.appendChild(as);div.appendChild(body);return div;
}

function inlineField(label,type,value,onChange){
  const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';
  const l=document.createElement('label');l.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';l.textContent=label;g.appendChild(l);
  const inp=document.createElement('input');inp.type=type;inp.value=value;
  inp.style.cssText='width:100%;padding:5px 10px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';
  inp.addEventListener('change',()=>onChange(inp.value));g.appendChild(inp);return g;
}
function iconField(card){
  const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';
  const l=document.createElement('label');l.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';l.textContent='Icon';g.appendChild(l);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;';
  const preview=document.createElement('span');preview.style.cssText='font-size:24px;width:32px;text-align:center;';
  if(card.icon&&(card.icon.startsWith('http')||card.icon.startsWith('data:'))){const img=document.createElement('img');img.src=card.icon;img.style.cssText='width:28px;height:28px;object-fit:contain;';preview.appendChild(img);}
  else{preview.textContent=card.icon||'📦';}
  row.appendChild(preview);
  const btn=document.createElement('button');btn.className='btn btn-glass btn-sm';btn.textContent='Change';
  btn.addEventListener('click',()=>openIconPicker(url=>{card.icon=url;saveConfig();renderAll();}));row.appendChild(btn);
  const clearBtn=document.createElement('button');clearBtn.className='btn btn-glass btn-sm';clearBtn.textContent='✕';
  clearBtn.addEventListener('click',()=>{card.icon='📦';saveConfig();renderAll();});row.appendChild(clearBtn);
  g.appendChild(row);return g;
}
function inlineColor(label,value,onChange){
  const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';
  const l=document.createElement('label');l.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';l.textContent=label;g.appendChild(l);
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;align-items:center;';
  const c=document.createElement('input');c.type='color';c.value=value;c.style.cssText='width:36px;height:30px;padding:1px;border:1px solid var(--surface-border);background:rgba(0,0,0,.3);cursor:pointer;';
  const t=document.createElement('input');t.type='text';t.value=value;t.style.cssText='flex:1;padding:5px 10px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';
  const sync=v=>{c.value=v;t.value=v;onChange(v);};c.addEventListener('input',()=>sync(c.value));t.addEventListener('change',()=>sync(t.value));
  row.appendChild(c);row.appendChild(t);g.appendChild(row);return g;
}
function inlineRange(label,val,min,max,onChange){
  const g=document.createElement('div');g.style.cssText='margin-bottom:8px;';
  const l=document.createElement('label');l.style.cssText='display:block;font-size:11px;font-weight:600;color:var(--text-secondary);margin-bottom:2px;';l.textContent=label;g.appendChild(l);
  const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;';
  const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.value=val;r.style.flex='1';r.style.accentColor='var(--accent)';
  const s=document.createElement('span');s.style.cssText='font-size:12px;color:var(--text-secondary);min-width:24px;';s.textContent=val;
  r.addEventListener('input',()=>{s.textContent=r.value;});r.addEventListener('pointerup',()=>{onChange(r.value);s.textContent=r.value;});
  r.addEventListener('keyup',e=>{if(e.key==='Enter')onChange(r.value);});
  row.appendChild(r);row.appendChild(s);g.appendChild(row);return g;
}
function inlineCheck(label,val,onChange){
  const w=document.createElement('div');w.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-primary);';
  const c=document.createElement('input');c.type='checkbox';c.checked=!!val;
  const l=document.createElement('span');l.textContent=label;c.addEventListener('change',()=>onChange(c.checked));
  w.appendChild(c);w.appendChild(l);return w;
}

/* ── Render inline section editor ── */
function renderInlineSection(sec,card,si){
  const div=document.createElement('div');div.className='section-editor';div.style.borderLeftColor=card.color||config.theme.glow;
  const hdr=document.createElement('div');hdr.className='section-editor-header';
  hdr.innerHTML=`<span class="section-edit-label">${escAttr(sec.type)}${sec.label?': '+escAttr(sec.label):''}</span>`;
  const acts=document.createElement('div');acts.style.cssText='display:flex;gap:4px;';
  if(si>0){const b=btn('↑','Move up');b.addEventListener('click',()=>moveSection(card.id,si,-1));acts.appendChild(b);}
  if(si<(card.sections||[]).length-1){const b=btn('↓','Move down');b.addEventListener('click',()=>moveSection(card.id,si,1));acts.appendChild(b);}
  const del=btn('✕','Delete',true);del.addEventListener('click',()=>{card.sections.splice(si,1);saveConfig();renderAll();toast('Section deleted');});
  acts.appendChild(del);hdr.appendChild(acts);div.appendChild(hdr);
  const bd=document.createElement('div');bd.style.cssText='display:flex;flex-direction:column;gap:5px;';
  const sel=document.createElement('select');sel.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';
  ['links','link-list','search','clock','weather','iframe','notes','dropdown','api-poller'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;if(t===sec.type)o.selected=true;sel.appendChild(o);});
  sel.addEventListener('change',()=>{sec.type=sel.value;saveConfig();renderAll();});bd.appendChild(sel);
  const lblInp=document.createElement('input');lblInp.placeholder='Section label';lblInp.value=sec.label||'';
  lblInp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';
  lblInp.addEventListener('change',()=>{sec.label=lblInp.value;saveConfig();renderAll();});bd.appendChild(lblInp);
  if(['links','link-list','dropdown'].includes(sec.type)){(sec.links||[]).forEach((link,li)=>{const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;align-items:center;margin-bottom:3px;';const li_inp=document.createElement('input');li_inp.placeholder='Label';li_inp.value=link.label;li_inp.style.cssText='flex:1;padding:3px 6px;background:rgba(0,0,0,.2);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';li_inp.addEventListener('change',()=>{sec.links[li].label=li_inp.value;saveConfig();renderAll();});const ic_btn=document.createElement('button');ic_btn.style.cssText='padding:2px 4px;font-size:14px;background:none;border:1px solid var(--surface-border);cursor:pointer;color:var(--text-primary);width:26px;height:22px;display:flex;align-items:center;justify-content:center;';if(link.icon&&(link.icon.startsWith('http')||link.icon.startsWith('data:'))){const img=document.createElement('img');img.src=link.icon;img.style.cssText='width:16px;height:16px;object-fit:contain;';ic_btn.appendChild(img);}else{ic_btn.textContent=link.icon||'🔗';}ic_btn.title='Change icon';ic_btn.addEventListener('click',()=>openIconPicker(url=>{sec.links[li].icon=url;saveConfig();renderAll();}));const ur_inp=document.createElement('input');ur_inp.placeholder='https://';ur_inp.value=link.url;ur_inp.style.cssText='flex:1;padding:3px 6px;background:rgba(0,0,0,.2);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';ur_inp.addEventListener('change',()=>{sec.links[li].url=ur_inp.value;saveConfig();renderAll();});const rm=btn('✕',null,true);rm.style.cssText='padding:2px 4px;font-size:10px;';rm.addEventListener('click',()=>{sec.links.splice(li,1);saveConfig();renderAll();});row.appendChild(li_inp);row.appendChild(ic_btn);row.appendChild(ur_inp);row.appendChild(rm);bd.appendChild(row);});const addL=document.createElement('button');addL.className='btn btn-glass btn-sm';addL.textContent='+ Link';addL.style.cssText='font-size:10px;padding:2px 8px;';addL.addEventListener('click',()=>{sec.links=sec.links||[];sec.links.push({label:'New',url:'https://',icon:'🔗'});saveConfig();renderAll();});bd.appendChild(addL);}
  else if(sec.type==='search'){const w=document.createElement('div');w.style.cssText='position:relative;';const wrap=document.createElement('div');wrap.className='inline-search-wrap';wrap.innerHTML='<span class="search-icon">🔍</span>';const inp=document.createElement('input');inp.type='text';inp.placeholder=sec.placeholder||'Search...';inp.value='';wrap.appendChild(inp);w.appendChild(wrap);const btn=document.createElement('button');btn.className='btn btn-glass btn-search';btn.textContent='Go';btn.addEventListener('click',()=>doSearch(inp.value,sec));inp.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(inp.value,sec);});const row=document.createElement('div');row.style.cssText='display:flex;gap:4px;margin-top:4px;';row.appendChild(w);row.appendChild(btn);bd.appendChild(row);const pInp=document.createElement('input');pInp.placeholder='Placeholder';pInp.value=sec.placeholder||'Search...';pInp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;margin-top:4px;';pInp.addEventListener('change',()=>{sec.placeholder=pInp.value;saveConfig();renderAll();});bd.appendChild(pInp);}
  else if(sec.type==='clock'){bd.appendChild(inlineCheck('24hr',sec.format24h,v=>{sec.format24h=v;saveConfig();renderAll();}));bd.appendChild(inlineCheck('Show date',sec.showDate,v=>{sec.showDate=v;saveConfig();renderAll();}));}
  else if(sec.type==='weather'){['apiKey','location'].forEach(k=>{const inp=document.createElement('input');inp.placeholder=k;inp.value=sec[k]||'';inp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';inp.addEventListener('change',()=>{sec[k]=inp.value;saveConfig();});bd.appendChild(inp);});const usel=document.createElement('select');usel.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:11px;outline:none;';[{v:'imperial',l:'F'},{v:'metric',l:'C'},{v:'standard',l:'K'}].forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.l;if(o.v===sec.units)opt.selected=true;usel.appendChild(opt);});usel.addEventListener('change',()=>{sec.units=usel.value;saveConfig();});bd.appendChild(usel);}
  else if(sec.type==='iframe'){const uInp=document.createElement('input');uInp.placeholder='URL';uInp.value=sec.url||'';uInp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';uInp.addEventListener('change',()=>{sec.url=uInp.value;saveConfig();renderAll();});bd.appendChild(uInp);bd.appendChild(inlineRange('Height',sec.height||300,100,800,v=>{sec.height=parseInt(v);saveConfig();renderAll();}));}
  else if(sec.type==='notes'){const ta=document.createElement('textarea');ta.placeholder='Notes...';ta.value=sec.content||'';ta.style.cssText='width:100%;min-height:40px;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;resize:vertical;';ta.addEventListener('change',()=>{sec.content=ta.value;saveConfig();renderAll();});bd.appendChild(ta);}
  else if(sec.type==='api-poller'){const uInp=document.createElement('input');uInp.placeholder='API URL';uInp.value=sec.url||'';uInp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';uInp.addEventListener('change',()=>{sec.url=uInp.value;saveConfig();});bd.appendChild(uInp);const pInp=document.createElement('input');pInp.placeholder='JSON path (e.g. stats.cpu)';pInp.value=sec.jsonPath||'';pInp.style.cssText='width:100%;padding:4px 8px;background:var(--card-input-bg);border:1px solid var(--surface-border);color:var(--text-primary);font-size:12px;outline:none;';pInp.addEventListener('change',()=>{sec.jsonPath=pInp.value;saveConfig();});bd.appendChild(pInp);bd.appendChild(inlineRange('Refresh (s)',sec.refreshInterval||60,5,600,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));}
  div.appendChild(bd);return div;
}

function btn(text,title,danger){const b=document.createElement('button');b.className=`btn btn-glass btn-sm${danger?' btn-danger':''}`;b.textContent=text;if(title)b.title=title;return b;}

function doSearch(query,sec){
  const q=(query||'').trim();if(!q)return;
  const en=sec.engine||'Google';
  window.open((config.search.engines[en]||config.search.engines['Google'])+encodeURIComponent(q),'_blank');
}

/* ── Render sections (view) ── */
function renderSection(sec,card){
  const f=document.createDocumentFragment();
  if(sec.label&&sec.type!=='clock'){const l=document.createElement('div');l.className='section-title';l.textContent=sec.label;f.appendChild(l);}
  switch(sec.type){
    case'links':{const g=document.createElement('div');g.className='link-grid';(sec.links||[]).forEach(l=>{const a=document.createElement('a');a.className='link-item';a.href=l.url;a.target='_blank';a.rel='noopener';a.appendChild(renderLinkIcon(l.icon));const span=document.createElement('span');span.className='link-label';span.textContent=l.label;a.appendChild(span);g.appendChild(a);});f.appendChild(g);break;}
    case'link-list':{const lst=document.createElement('div');lst.className='link-list';(sec.links||[]).forEach(l=>{const a=document.createElement('a');a.className='link-row';a.href=l.url;a.target='_blank';a.rel='noopener';a.appendChild(renderLinkIcon(l.icon));a.appendChild(document.createTextNode(' '+l.label));lst.appendChild(a);});f.appendChild(lst);break;}
    case'search':{const w=document.createElement('div');w.style.cssText='display:flex;gap:4px;align-items:stretch;';const wrap=document.createElement('div');wrap.className='inline-search-wrap';wrap.innerHTML='<span class="search-icon">🔍</span>';const inp=document.createElement('input');inp.type='text';inp.placeholder=sec.placeholder||'Search...';wrap.appendChild(inp);w.appendChild(wrap);const btn=document.createElement('button');btn.className='btn btn-glass btn-search';btn.textContent='🔍';btn.addEventListener('click',()=>doSearch(inp.value,sec));inp.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(inp.value,sec);});w.appendChild(btn);f.appendChild(w);if(sec.engine){const t=document.createElement('div');t.className='search-engine-tag';t.textContent=sec.engine;f.appendChild(t);}break;}
    case'clock':{const w=document.createElement('div');w.className='clock-widget';w.dataset.format24=sec.format24h?'1':'0';w.dataset.showDate=sec.showDate?'1':'0';w.innerHTML='<div class="clock-time">--:--</div><div class="clock-date"></div>';f.appendChild(w);break;}
    case'weather':{const w=document.createElement('div');w.className='weather-widget';w.dataset.apiKey=sec.apiKey||'';w.dataset.location=sec.location||'';w.dataset.units=sec.units||'imperial';w.innerHTML='<span class="weather-icon">🌤</span><div><div class="weather-temp">--°</div><div class="weather-detail">Loading...</div></div>';f.appendChild(w);break;}
    case'iframe':{const ifr=document.createElement('iframe');ifr.className='card-iframe';ifr.src=sec.url||'';ifr.style.height=(sec.height||300)+'px';ifr.allow='fullscreen';ifr.loading='lazy';f.appendChild(ifr);break;}
    case'notes':{const el=document.createElement('div');el.className='notes-text';el.contentEditable=true;el.textContent=sec.content||'';el.addEventListener('blur',()=>{const idx=findSection(sec.id);if(idx>=0){config.cards[idx[0]].sections[idx[1]].content=el.textContent;saveConfig();}});f.appendChild(el);break;}
    case'dropdown':{const b=document.createElement('button');b.className='dropdown-toggle';b.innerHTML=`${escAttr(sec.label||'More')} <span class="arrow">▶</span>`;const c=document.createElement('div');c.className='dropdown-content';b.addEventListener('click',()=>{b.classList.toggle('open');c.classList.toggle('open');});f.appendChild(b);const ig=document.createElement('div');ig.className='link-grid';(sec.links||[]).forEach(l=>{const a=document.createElement('a');a.className='link-item';a.href=l.url;a.target='_blank';a.rel='noopener';a.appendChild(renderLinkIcon(l.icon));const span=document.createElement('span');span.className='link-label';span.textContent=l.label;a.appendChild(span);ig.appendChild(a);});c.appendChild(ig);f.appendChild(c);break;}
    case'api-poller':{const w=document.createElement('div');w.className='api-widget';w.dataset.url=sec.url||'';w.dataset.jsonPath=sec.jsonPath||'';w.dataset.label=sec.label||'';w.dataset.refresh=sec.refreshInterval||60;w.innerHTML=`<div class="api-row"><span class="api-label">${escAttr(sec.label||'Loading...')}</span><span class="api-value">--</span></div>`;f.appendChild(w);fetchApiWidget(w);break;}
  }
  const sl=card.sections||[],isLast=sl.indexOf(sec)===sl.length-1;
  if(!isLast&&sec.type!=='clock'){const hr=document.createElement('hr');hr.className='section-divider';f.appendChild(hr);}
  return f;
}

function renderLinkIcon(icon){
  if(!icon){const s=document.createElement('span');s.className='link-icon';s.textContent='🔗';return s;}
  if(icon.startsWith('http')||icon.startsWith('data:')||icon.startsWith('/')){const img=document.createElement('img');img.className='link-custom-icon';img.src=icon;img.alt='';img.loading='lazy';img.onerror=function(){this.outerHTML='<span class="link-icon">🔗</span>';};return img;}
  const s=document.createElement('span');s.className='link-icon';s.textContent=icon;return s;
}

function findSection(sid){for(let ci=0;ci<config.cards.length;ci++)for(let si=0;si<(config.cards[ci].sections||[]).length;si++)if(config.cards[ci].sections[si].id===sid)return[ci,si];return-1;}
function moveSection(cardId,si,dir){const card=config.cards.find(c=>c.id===cardId);if(!card)return;const t=si+dir,secs=card.sections;if(t<0||t>=secs.length)return;[secs[si],secs[t]]=[secs[t],secs[si]];saveConfig();renderAll();}
function toggleCardEdit(id){editModeCardId=editModeCardId===id?null:id;renderAll();}

/* ── Clocks/Weather/Poller ── */
function setupClocks(){if(clockInterval)clearInterval(clockInterval);updateClocks();clockInterval=setInterval(updateClocks,1000);}
function updateClocks(){$$('.clock-widget').forEach(el=>{const n=new Date(),f24=el.dataset.format24==='1',sd=el.dataset.showDate==='1';let h=n.getHours();const m=String(n.getMinutes()).padStart(2,'0');el.querySelector('.clock-time').textContent=f24?String(h).padStart(2,'0')+':'+m:(h%12||12)+':'+m+' '+(h>=12?'PM':'AM');if(sd)el.querySelector('.clock-date').textContent=n.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});});}
function setupWeatherWidgets(){weatherIntervals.forEach(clearInterval);weatherIntervals=[];$$('.weather-widget').forEach(fetchWeather);}
function fetchWeather(el){const k=el.dataset.apiKey,l=el.dataset.location;if(!k||!l){el.querySelector('.weather-detail').textContent='Set API key & location in config';return;}fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(l)}&units=${el.dataset.units}&appid=${k}`).then(r=>r.json()).then(d=>{if(d.cod!==200)throw Error(d.message);const e=wEmoji(d.weather[0].id);el.querySelector('.weather-icon').textContent=e;el.querySelector('.weather-temp').textContent=Math.round(d.main.temp)+'°';el.querySelector('.weather-detail').textContent=d.weather[0].description+' · '+d.main.humidity+'% humidity';}).catch(e=>{el.querySelector('.weather-detail').textContent='⚠ '+e.message;});weatherIntervals.push(setInterval(()=>fetchWeather(el),600000));}
function wEmoji(id){if(id<300)return'⛈';if(id<400)return'🌦';if(id<600)return'🌧';if(id<700)return'❄';if(id<800)return'🌫';if(id===800)return'☀';return'☁';}
function fetchApiWidget(el){const u=el.dataset.url,jp=el.dataset.jsonPath;if(!u){el.innerHTML='<div class="api-row"><span class="api-label">No API URL set</span></div>';return;}fetch(u).then(r=>r.json()).then(d=>{const v=jp?getNested(d,jp):JSON.stringify(d,null,2);el.innerHTML=`<div class="api-row"><span class="api-label">${escAttr(el.dataset.label)}</span><span class="api-value">${escAttr(String(v))}</span></div>`;const iv=parseInt(el.dataset.refresh)*1000;if(iv>0)apiPollTimers.push(setTimeout(()=>fetchApiWidget(el),iv));}).catch(e=>{el.innerHTML=`<div class="api-row"><span class="api-label">${escAttr(el.dataset.label)}</span><span class="api-value api-error">${escAttr(e.message)}</span></div>`;});}
function getNested(o,p){return p.split('.').reduce((a,pt)=>a&&a[pt],o);}
function refreshWidgets(){$$('.api-widget').forEach(fetchApiWidget);$$('.weather-widget').forEach(fetchWeather);updateClocks();toast('Widgets refreshed');}

/* ═══════════════════════════════════════════ DRAG ═══════════════════════════════════════════ */
function startDrag(e,cardId,index){if(e.button!==0)return;e.preventDefault();const card=config.cards.find(c=>c.id===cardId);if(!card)return;const grid=$('#card-grid');const cardEls=[...grid.children].filter(el=>el.classList.contains('card'));const clone=document.createElement('div');clone.className='card drag-clone';clone.style.cssText=`position:fixed;z-index:999;pointer-events:none;opacity:0.85;width:${cardEls[0]?.offsetWidth||280}px;transform:rotate(2deg) scale(0.95);`;clone.style.setProperty('--card-accent',card.color||config.theme.glow);clone.innerHTML=`<div style="padding:12px 16px;background:var(--card-bg);backdrop-filter:blur(var(--bg-blur));border:1px solid var(--glass-border);box-shadow:0 12px 48px rgba(0,0,0,.5);"><div style="font-size:13px;font-weight:600;">${card.icon||'📦'} ${escAttr(card.title)}</div></div>`;clone.style.left=(e.clientX-20)+'px';clone.style.top=(e.clientY-10)+'px';document.body.appendChild(clone);const placeholder=document.createElement('div');placeholder.className='drag-placeholder';placeholder.style.height=(cardEls[index]?.offsetHeight||120)+'px';grid.insertBefore(placeholder,cardEls[index]);cardEls[index].style.opacity='0.3';dragState={cardId,index,clone,placeholder};document.addEventListener('pointermove',onDragMove);document.addEventListener('pointerup',onDragEnd);document.addEventListener('pointercancel',onDragEnd);}
function onDragMove(e){if(!dragState)return;dragState.clone.style.left=(e.clientX-20)+'px';dragState.clone.style.top=(e.clientY-10)+'px';const grid=$('#card-grid'),placeholder=grid.querySelector('.drag-placeholder');if(!placeholder)return;document.body.style.pointerEvents='none';const elUnder=document.elementFromPoint(e.clientX,e.clientY);document.body.style.pointerEvents='';const cardUnder=elUnder?.closest('.card');if(cardUnder&&cardUnder.dataset.cardId!==dragState.cardId){grid.insertBefore(placeholder,cardUnder);}else if(!cardUnder){const cards=[...grid.children].filter(el=>el.classList.contains('card')&&el.dataset.cardId!==dragState.cardId);let inserted=false;for(const el of cards){const rect=el.getBoundingClientRect();if(e.clientY<rect.top+rect.height/2){grid.insertBefore(placeholder,el);inserted=true;break;}}if(!inserted)grid.appendChild(placeholder);}}
function onDragEnd(){document.removeEventListener('pointermove',onDragMove);document.removeEventListener('pointerup',onDragEnd);document.removeEventListener('pointercancel',onDragEnd);if(!dragState)return;const{cardId,index,clone,placeholder}=dragState;if(clone.parentNode)clone.remove();const grid=$('#card-grid');let targetIndex=-1;if(placeholder&&placeholder.parentNode===grid){targetIndex=[...grid.children].indexOf(placeholder);placeholder.remove();}const original=grid.querySelector(`[data-card-id="${cardId}"]`);if(original)original.style.opacity='';if(targetIndex>=0){const cards=config.cards;const srcIdx=cards.findIndex(c=>c.id===cardId);if(srcIdx>=0&&srcIdx!==targetIndex){const[moved]=cards.splice(srcIdx,1);const adjusted=srcIdx<targetIndex?targetIndex-1:targetIndex;cards.splice(adjusted,0,moved);saveConfig();renderAll();toast('Card reordered');}else renderAll();}else renderAll();dragState=null;}

/* ═══════════════════════════════════════════ ICON PICKER ═══════════════════════════════════════════ */
let iconPickerOpen=false;
function openIconPicker(cb){iconPickerCallback=cb;iconPickerOpen=true;$('#icon-picker-overlay').classList.add('open');$('#icon-picker').classList.add('open');buildIconPicker('library');}
function closeIconPicker(){iconPickerOpen=false;iconPickerCallback=null;$('#icon-picker-overlay').classList.remove('open');$('#icon-picker').classList.remove('open');}
function buildIconPicker(tab){const c=$('#icon-picker-content');c.innerHTML='';$$('.ip-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));if(tab==='library')buildLibraryTab(c);else if(tab==='upload')buildUploadTab(c);else if(tab==='emoji')buildEmojiTab(c);else if(tab==='url')buildUrlTab(c);}
function buildLibraryTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search services...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);function ri(filter){g.innerHTML='';const f=(filter||'').toLowerCase();const items=f?ICON_REPO.filter(i=>i.name.toLowerCase().includes(f)||i.file.toLowerCase().includes(f)||i.tags.some(t=>t.includes(f))):ICON_REPO;items.slice(0,120).forEach(item=>{const d=document.createElement('div');d.className='icon-grid-item';const img=document.createElement('img');img.src=`${ICON_CDN}/${item.file}.png`;img.alt=item.name;img.loading='lazy';img.onerror=function(){this.parentElement.style.display='none';};const l=document.createElement('span');l.textContent=item.name;d.appendChild(img);d.appendChild(l);d.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${item.file}.png`));g.appendChild(d);});if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px;">No icons found</div>';}
  s.addEventListener('input',()=>ri(s.value));ri('');}
function buildUploadTab(c){const z=document.createElement('div');z.className='upload-zone';z.innerHTML='<div style="font-size:36px;">📁</div><p>Click to upload an icon image</p>';c.appendChild(z);const fi=document.createElement('input');fi.type='file';fi.accept='image/png,image/svg+xml,image/webp,image/jpeg,image/gif';fi.style.display='none';fi.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const url=ev.target.result;customIcons.push({name:file.name,url,id:uid()});try{localStorage.setItem('wartab-icons',JSON.stringify(customIcons));}catch(e){}selectIcon(url);};reader.readAsDataURL(file);});z.addEventListener('click',()=>fi.click());c.appendChild(fi);if(customIcons.length){const l=document.createElement('div');l.style.cssText='font-size:12px;font-weight:600;color:var(--text-secondary);margin:12px 0 6px;';l.textContent='Previously uploaded:';c.appendChild(l);const g=document.createElement('div');g.className='icon-grid';customIcons.forEach(icon=>{const d=document.createElement('div');d.className='icon-grid-item';d.innerHTML=`<img src="${icon.url}" alt="${icon.name.substring(0,12)}" style="width:28px;height:28px;object-fit:contain;"><span>${icon.name.substring(0,12)}</span>`;d.addEventListener('click',()=>selectIcon(icon.url));g.appendChild(d);});c.appendChild(g);}}
function buildEmojiTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search emojis...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);function re(filter){g.innerHTML='';const f=(filter||'').toLowerCase();const items=f?EMOJIS.filter(e=>e.includes(f)):EMOJIS;items.forEach(emoji=>{const d=document.createElement('div');d.className='icon-grid-item';d.innerHTML=`<span class="ip-emoji">${emoji}</span>`;d.addEventListener('click',()=>selectIcon(emoji));g.appendChild(d);});}s.addEventListener('input',()=>re(s.value));re('');}
function buildUrlTab(c){c.innerHTML=`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Enter a direct URL to an icon:</div><input class="icon-search-bar" id="icon-url-input" placeholder="https://example.com/icon.png"><button class="btn btn-glass btn-sm" id="icon-url-btn">Use this URL</button><div style="font-size:11px;color:var(--text-tertiary);margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;">— or use a dashboard icon —</div><div style="display:flex;flex-wrap:wrap;gap:4px;" id="icon-url-examples"></div>`;const input=$('#icon-url-input');const examples=$('#icon-url-examples');['jellyfin','plex','homeassistant','portainer','pihole','grafana','sonarr','radarr'].forEach(n=>{const tag=document.createElement('button');tag.className='btn btn-glass btn-sm';tag.style.fontSize='10px';tag.textContent=n;tag.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${n}.png`));examples.appendChild(tag);});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim())selectIcon(input.value.trim());});$('#icon-url-btn').addEventListener('click',()=>{if(input.value.trim())selectIcon(input.value.trim());});}
function selectIcon(url){if(iconPickerCallback)iconPickerCallback(url);closeIconPicker();}

/* ═══════════════════════════════════════════ CONFIG PANEL ═══════════════════════════════════════════ */
let configPanelOpen=false;
function toggleConfigPanel(){configPanelOpen=!configPanelOpen;$('#config-overlay').classList.toggle('open',configPanelOpen);$('#config-panel').classList.toggle('open',configPanelOpen);if(configPanelOpen)buildConfigPanel();}
function buildConfigPanel(){const body=$('#config-body');body.innerHTML='';
  body.appendChild(ps('Branding'));
  body.appendChild(pf('text','brandTitle','Page Title',null,(config.branding||{}).title||'WarTab',v=>{if(!config.branding)config.branding={};config.branding.title=v;applyTheme();saveConfig();}));
  body.appendChild(pf('text','brandIcon','Brand Icon (emoji or URL)',null,(config.branding||{}).icon||'⚔️',v=>{if(!config.branding)config.branding={};config.branding.icon=v;applyTheme();saveConfig();}));

  body.appendChild(ps('Status Bar'));
  body.appendChild(pf('checkbox','sbEnabled','Show system stats bar',null,config.statusBar.enabled,v=>{config.statusBar.enabled=v;saveConfig();applyTheme();initStatusBar();renderAll();}));
  body.appendChild(pf('select','sbSource','Stats Source',[{value:'local',label:'Local server (/api/stats)'},{value:'glances',label:'Glances API'},{value:'custom',label:'Custom URL'}],config.statusBar.source,v=>{config.statusBar.source=v;saveConfig();initStatusBar();}));
  body.appendChild(pf('text','sbGlances','Glances URL',null,config.statusBar.glancesUrl,v=>{config.statusBar.glancesUrl=v;saveConfig();initStatusBar();}));
  body.appendChild(pf('text','sbCustom','Custom URL',null,config.statusBar.customUrl||'',v=>{config.statusBar.customUrl=v;saveConfig();initStatusBar();}));
  body.appendChild(pf('range','sbInterval','Refresh (seconds)',null,config.statusBar.refreshInterval,v=>{config.statusBar.refreshInterval=parseInt(v);saveConfig();initStatusBar();},{min:5,max:120}));
  body.appendChild(pf('checkbox','sbHostname','Show hostname',null,config.statusBar.hostname!==false,v=>{config.statusBar.hostname=v;saveConfig();initStatusBar();}));

  // Status bar items checkboxes
  const itemsDiv=document.createElement('div');itemsDiv.className='form-group';
  const itemsLabel=document.createElement('label');itemsLabel.textContent='Show items:';itemsDiv.appendChild(itemsLabel);
  const itemsRow=document.createElement('div');itemsRow.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;';
  ['cpu','memory','disk','uptime'].forEach(item=>{
    const cb=document.createElement('label');cb.style.cssText='display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
    const chk=document.createElement('input');chk.type='checkbox';chk.checked=(config.statusBar.items||[]).includes(item);
    chk.addEventListener('change',()=>{
      config.statusBar.items=config.statusBar.items||[];
      if(chk.checked&&!config.statusBar.items.includes(item))config.statusBar.items.push(item);
      else if(!chk.checked)config.statusBar.items=config.statusBar.items.filter(i=>i!==item);
      saveConfig();initStatusBar();
    });
    cb.appendChild(chk);cb.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));
    itemsRow.appendChild(cb);
  });
  itemsDiv.appendChild(itemsRow);body.appendChild(itemsDiv);

  body.appendChild(ps('Theme'));
  body.appendChild(pf('select','bgType','Background Type',[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'},{value:'image',label:'Image'}],config.theme.bgType,v=>{config.theme.bgType=v;applyChanges();renderAll();}));
  body.appendChild(pf('text','bgValue','Background Value',null,config.theme.bgValue,v=>{config.theme.bgValue=v;applyChanges();}));
  const bgRow=document.createElement('div');bgRow.className='form-group';
  const bgLbl=document.createElement('label');bgLbl.textContent='Upload or set background image';bgRow.appendChild(bgLbl);
  const bgBtns=document.createElement('div');bgBtns.style.cssText='display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;';
  const upBg=document.createElement('button');upBg.className='btn btn-glass btn-sm';upBg.textContent='Upload Image';
  upBg.addEventListener('click',()=>openBgUpload());bgBtns.appendChild(upBg);
  const urlBg=document.createElement('button');urlBg.className='btn btn-glass btn-sm';urlBg.textContent='Set URL';
  urlBg.addEventListener('click',()=>{const u=prompt('Background image URL:');if(u){config.theme.bgType='image';config.theme.bgValue=u;applyChanges();saveConfig();buildConfigPanel();}});bgBtns.appendChild(urlBg);
  if(customBackgrounds.length){const showBg=document.createElement('button');showBg.className='btn btn-glass btn-sm';showBg.textContent='Browse ('+customBackgrounds.length+')';showBg.addEventListener('click',()=>openBgPicker());bgBtns.appendChild(showBg);}
  bgRow.appendChild(bgBtns);body.appendChild(bgRow);

  body.appendChild(pf('select','cardBg','Card Background',[
    {value:'dark',label:'Dark Glass'},{value:'light',label:'Light Glass'},{value:'solid-dark',label:'Solid Dark'},{value:'solid-light',label:'Solid Light'},
  ],config.theme.cardBg||'dark',v=>{config.theme.cardBg=v;applyChanges();}));
  body.appendChild(pf('range','blur','Glass Blur (px)',null,config.theme.blur,v=>{config.theme.blur=parseInt(v);applyChanges();},{min:4,max:40}));
  body.appendChild(pf('color','glow','Accent Color',null,config.theme.glow,v=>{config.theme.glow=v;applyChanges();}));
  body.appendChild(pf('select','fontSize','Font Size',[{value:'small',label:'Small'},{value:'medium',label:'Medium'},{value:'large',label:'Large'}],config.theme.fontSize,v=>{config.theme.fontSize=v;applyChanges();}));

  body.appendChild(ps('Font'));
  body.appendChild(pf('select','fontCategory','Category',[{value:'all',label:'All'},{value:'sans',label:'Sans-serif'},{value:'mono',label:'Monospace'},{value:'serif',label:'Serif'}],'all',v=>{document.getElementById('font-picker-grid').dataset.cat=v;renderFontPicker();}));
  const fontGrid=document.createElement('div');fontGrid.className='font-preview-grid';fontGrid.id='font-picker-grid';body.appendChild(fontGrid);
  renderFontPicker();

  body.appendChild(ps('Layout'));
  body.appendChild(pf('range','cols','Columns',null,config.layout.cols,v=>{config.layout.cols=parseInt(v);applyChanges();renderAll();},{min:1,max:6}));
  body.appendChild(pf('range','gap','Card Gap (px)',null,config.layout.gap,v=>{config.layout.gap=parseInt(v);applyChanges();renderAll();},{min:4,max:40}));

  body.appendChild(ps('Default Search Engine'));
  const engs=Object.entries(config.search.engines).map(([k])=>({value:k,label:k}));
  body.appendChild(pf('select','searchEngine','Engine',engs,config.search.selected,v=>{config.search.selected=v;saveConfig();}));
  body.appendChild(pf('checkbox','openNewTab','Open in new tab',null,config.search.openInNewTab,v=>{config.search.openInNewTab=v;saveConfig();}));

  body.appendChild(ps('Actions'));
  const acts=document.createElement('div');acts.className='config-acts';
  acts.style.cssText='display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;';
  acts.innerHTML=`<button class="btn btn-glass btn-sm" id="btn-export">Export Config</button><button class="btn btn-glass btn-sm" id="btn-import">Import Config</button><button class="btn btn-glass btn-sm btn-danger" id="btn-reset">Reset</button>`;
  body.appendChild(acts);
  const fi=document.createElement('input');fi.type='file';fi.accept='.json';fi.style.display='none';fi.id='import-file-input';
  body.appendChild(fi);
  $('#btn-export').addEventListener('click',exportConfig);
  $('#btn-import').addEventListener('click',()=>fi.click());
  $('#btn-reset').addEventListener('click',resetConfig);
  fi.addEventListener('change',e=>{if(e.target.files[0])importConfig(e.target.files[0]);});
}
function renderFontPicker(){const grid=document.getElementById('font-picker-grid');const cat=grid.dataset.cat||'all';const current=config.theme.fontFamily||'Inter';grid.innerHTML='';const fonts=cat==='all'?GOOGLE_FONTS:GOOGLE_FONTS.filter(f=>f.category===cat);fonts.forEach(f=>{const div=document.createElement('div');div.className='font-option'+(f.name===current?' selected':'');div.style.fontFamily=`'${f.name}',sans-serif`;div.innerHTML=`<div class="font-name">${f.name}${f.category==='mono'?' 🧬':''}${f.category==='serif'?' 🔤':''}</div><div class="font-preview">${f.sample}</div>`;div.addEventListener('click',()=>{config.theme.fontFamily=f.name;saveConfig();applyTheme();renderAll();buildConfigPanel();toast('Font: '+f.name);});grid.appendChild(div);});}
function ps(t){const d=document.createElement('div');d.className='config-section';d.innerHTML=`<h3>${t}</h3>`;return d;}
function pf(type,key,label,options,value,onChange,attrs){const g=document.createElement('div');g.className='form-group';const l=document.createElement('label');l.textContent=label;g.appendChild(l);if(type==='checkbox'){const w=document.createElement('div');w.style.cssText='display:flex;align-items:center;gap:8px;margin-top:4px;';const c=document.createElement('input');c.type='checkbox';c.checked=!!value;c.addEventListener('change',()=>onChange(c.checked));w.appendChild(c);g.replaceChild(w,l);}else if(type==='select'){const s=document.createElement('select');(options||[]).forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===value)opt.selected=true;s.appendChild(opt);});s.addEventListener('change',()=>onChange(s.value));g.appendChild(s);}else if(type==='range'){const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:8px;';const i=document.createElement('input');i.type='range';i.min=attrs.min||0;i.max=attrs.max||100;i.value=value;i.style.flex='1';const s=document.createElement('span');s.textContent=value;s.style.cssText='font-size:12px;color:var(--text-secondary);min-width:30px;';i.addEventListener('input',()=>{s.textContent=i.value;});i.addEventListener('pointerup',()=>onChange(i.value));r.appendChild(i);r.appendChild(s);g.appendChild(r);}else if(type==='color'){const r=document.createElement('div');r.className='color-row';const i=document.createElement('input');i.type='color';i.value=value;const t=document.createElement('input');t.type='text';t.value=value;t.style.flex='1';const sync=v=>{i.value=v;t.value=v;onChange(v);};i.addEventListener('input',()=>sync(i.value));t.addEventListener('change',()=>sync(t.value));r.appendChild(i);r.appendChild(t);g.appendChild(r);}else{const i=document.createElement('input');i.type='text';i.value=value;i.addEventListener('change',()=>onChange(i.value));g.appendChild(i);}return g;}

function openBgUpload(){const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.style.display='none';fi.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const url=ev.target.result;customBackgrounds.push({name:file.name,url,id:uid()});try{localStorage.setItem('wartab-bg',JSON.stringify(customBackgrounds));}catch(e){}config.theme.bgType='image';config.theme.bgValue=url;applyChanges();saveConfig();buildConfigPanel();toast('Background set');};reader.readAsDataURL(file);});fi.click();}
function openBgPicker(){const overlay=$('#bg-picker-overlay');const picker=$('#bg-picker');overlay.classList.add('open');picker.classList.add('open');const content=$('#bg-picker-content');content.innerHTML='';const label=document.createElement('div');label.style.cssText='font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;';label.textContent='Uploaded backgrounds:';content.appendChild(label);const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;';customBackgrounds.forEach(bg=>{const div=document.createElement('div');div.style.cssText='cursor:pointer;border:1px solid var(--surface-border);overflow:hidden;position:relative;aspect-ratio:16/9;';div.innerHTML=`<img src="${bg.url}" style="width:100%;height:100%;object-fit:cover;" alt="${bg.name}">`;div.addEventListener('click',()=>{config.theme.bgType='image';config.theme.bgValue=bg.url;applyChanges();saveConfig();overlay.classList.remove('open');picker.classList.remove('open');buildConfigPanel();toast('Background set');});grid.appendChild(div);});content.appendChild(grid);$('#bg-picker-close').onclick=()=>{overlay.classList.remove('open');picker.classList.remove('open');};overlay.onclick=()=>{overlay.classList.remove('open');picker.classList.remove('open');};}

function exportConfig(){const b=new Blob([JSON.stringify(config,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='wartab-config.json';a.click();URL.revokeObjectURL(a.href);toast('Config exported');}
function importConfig(file){const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);config=deepMerge(cloneObj(DEFAULT_CONFIG),d);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Config imported');}catch(e){toast('Failed: '+e.message,'error');}};r.readAsText(file);}
function resetConfig(){if(!confirm('Reset all config to defaults?'))return;config=cloneObj(DEFAULT_CONFIG);saveConfig();applyTheme();renderAll();buildConfigPanel();initStatusBar();toast('Reset to defaults');}
function applyChanges(){saveConfig();applyTheme();}

/* ═══════════════════════════════════════════ INIT ═══════════════════════════════════════════ */
function init() {
  loadConfig(); applyTheme(); renderAll(); initStatusBar();
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#config-close').addEventListener('click',toggleConfigPanel);
  $('#config-overlay').addEventListener('click',toggleConfigPanel);
  $$('.ip-tab').forEach(tab=>{tab.addEventListener('click',()=>buildIconPicker(tab.dataset.tab));});
  $('#icon-picker-close').addEventListener('click',closeIconPicker);
  $('#icon-picker-overlay').addEventListener('click',closeIconPicker);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&configPanelOpen)toggleConfigPanel();
    if(e.key==='Escape'&&iconPickerOpen)closeIconPicker();
    if(e.key==='C'&&e.ctrlKey&&e.shiftKey){e.preventDefault();toggleConfigPanel();}
    // Focus first inline search
    if((e.key==='l'||e.key==='k')&&(e.ctrlKey||e.metaKey)){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
  });
  let rt=null;window.addEventListener('resize',()=>{if(rt)clearTimeout(rt);rt=setTimeout(()=>{scheduleEqualize();},150);});
  console.log('WarTab initialized');
}
document.addEventListener('DOMContentLoaded', init);
