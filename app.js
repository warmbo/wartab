/* ═══════════════════════════════════════════
   WarTab — Application Logic
   ═══════════════════════════════════════════
   Sections:
     1. Card Type Modules  — registerModule() calls for each section type
     2. Config Panel       — edit panel, form helpers, section editor, section drag
     3. Default Config     — DEFAULT_CONFIG with field documentation
     4. Icon Data          — ICON_REPO, EMOJIS, LUCIDE_ICONS, migration maps
     5. Utilities          — isLucideName, renderLucideEl, uid, $/$$
     6. Config Load/Save   — loadConfig, saveConfig, applyChanges, renderAll
     7. Render             — renderCard, renderSection, renderLinkIcon, doSearch
     8. Widgets            — clocks, weather, API poller, quotes, status bars
     9. Drag & Drop        — card reorder with insertion indicator + FLIP animation
    10. Icon Picker        — library/upload/emoji/Lucide tabbed picker
    11. Background Upload  — image upload + compression
    12. Config Panel UI    — theme, branding, layout, status bar settings
    13. Init               — page load sequence
   ═══════════════════════════════════════════ */

function fetchLanScan(el){
  const body=el.querySelector('.lan-scan-body');
  if(!body)return;
  body.innerHTML='<div class="lan-scan-line" style="color:var(--text-tertiary);padding:12px;text-align:center;">LAN scan requires the self-hosted WarTab server running on your network.</div>';
}


function bumpVersion(){
  const p=WARTAB_VERSION.split('.');
  p[p.length-1]=String(parseInt(p[p.length-1])+1);
  WARTAB_VERSION = p.join('.');
  const ft=$('#footer-text');
  if(ft)ft.textContent='WarTab v'+WARTAB_VERSION;
  return WARTAB_VERSION;
}

/* ── Edit Panel ── */
const DEFAULT_CONFIG = {
  version: WARTAB_VERSION,

  /* ── Page branding (title + favicon-style icon) ── */
  branding: { title: 'WarTab', icon: 'sword' },

  /* ── Theme settings ── */
  theme: {
    bgType: 'gradient',           // 'color' | 'gradient' | 'image'
    bgValue: '#0a0a0a, #1a1a1a, #0d0d0d',  // CSS value: color, gradient(), or image path
    bgBlur: 0,                    // blur on background image (0-20px, only when bgType=image)
    bgDim: 0,                     // darkness overlay 0-100 (only when bgType=image)
    blur: 20,                     // backdrop-filter blur amount (px)
    glow: '#888888',              // accent color (grayscale)
    fontSizeText: 14,              // body text size in px (slider: 10-28)
    fontSizeHeading: 16,           // heading/card title size in px (slider: 10-28)
    fontFamily: 'Inter',          // Google Font name (or system font)
    cardBg: 'dark',               // card background variant
    fontColor: '#cccccc',         // text color override
    cardOpacity: 1,               // 0-1 opacity for card backgrounds
    bgRotate: false,              // rotate background on interval
    animations: true,             // enable CSS transitions/animations
    showAccentBar: true,          // show 3px accent bar at top of cards
  },

  /* ── Top-bar status display (CPU, RAM, disk, uptime) ── */
  statusBar: {
    enabled: true,
    source: 'local',              // 'local' | 'glances' | 'custom'
    glancesUrl: 'http://localhost:61209',
    customUrl: '',
    refreshInterval: 15,          // seconds
    items: ['cpu', 'memory', 'disk', 'uptime'],  // order/selection of stats
    hostname: true,
  },

  /* ── Grid layout ── */
  layout: {
    cols: 4,                      // number of grid columns
    gap: 16,                      // gap between cards (px)
    pageWidth: 100,               // page width as percentage (slider: 50-100)
    pagePadding: 2,               // top/bottom padding as % of container width (slider: 0-15)
    pageWidthPadding: 2,          // left/right padding as % of container width (slider: 0-15)
  },

  /* ── Search widget settings ── */
  search: {
    engine: 'https://www.google.com/search?q=',
    engines: {
      Google: 'https://www.google.com/search?q=',
      DuckDuckGo: 'https://duckduckgo.com/?q=',
      Brave: 'https://search.brave.com/search?q=',
      Bing: 'https://www.bing.com/search?q=',
      YouTube: 'https://www.youtube.com/results?search_query=',
      Reddit: 'https://www.reddit.com/search/?q=',
      Wikipedia: 'https://en.wikipedia.org/w/index.php?search=',
    },
    selected: 'Google',
    openInNewTab: true,
  },

  /* ── Cards (each card is a dashboard panel with sections) ── */
  /* ── Cards (each card is a dashboard panel with sections) ── */
  cards: [
    {
      id: 'welcome-card', title: 'Welcome to WarTab', icon: 'sword',
      color: '#888888', width: 2,
      sections: [
        {
          id: 'welcome-intro', type: 'notes', label: 'Your Dashboard',
          content: 'Welcome to your self-hosted command centre.\n\nThis page is yours to customise — add cards, rearrange them, and connect your services.\n\nStart by clicking the + button in the top bar to add a new card, or the ⚙ gear icon to configure the look and feel.',
        },
      ],
    },
    {
      id: 'search-card', title: 'Quick Search', icon: 'search',
      color: '#999999', width: 2,
      sections: [
        { id: 'search-main', type: 'search', engine: 'Google', placeholder: 'Search anything...', label: 'Web Search' },
      ],
    },
    {
      id: 'clock-card', title: 'Time & Date', icon: 'clock',
      color: '#aaaaaa', width: 1,
      sections: [
        { id: 'clock-main', type: 'clock', format24h: false, showDate: true },
      ],
    },
    {
      id: 'get-started', title: 'Getting Started', icon: 'compass',
      color: '#777777', width: 2,
      sections: [
        {
          id: 'start-links', type: 'links', label: 'Resources',
          links: [
            { label: 'GitHub', url: 'https://github.com', icon: '/icons/github.svg' },
            { label: 'Selfhosted', url: 'https://reddit.com/r/selfhosted', icon: '/icons/reddit.svg' },
            { label: 'Home Assistant', url: 'http://homeassistant.local:8123', icon: '/icons/home-assistant.svg' },
            { label: 'Jellyfin', url: 'http://jellyfin.local:8096', icon: '/icons/jellyfin.svg' },
            { label: 'Pi-hole', url: 'http://pi.hole/admin', icon: '/icons/pi-hole.svg' },
            { label: 'Docker', url: 'https://docs.docker.com', icon: '/icons/docker.svg' },
          ],
        },
      ],
    },
    {
      id: 'module-showcase', title: 'Card Modules', icon: 'grid',
      color: '#9a9a9a', width: 2,
      sections: [
        {
          id: 'showcase-links', type: 'link-list', label: 'Available Modules',
          links: [
            { label: 'Links & Bookmarks', url: '', icon: 'link' },
            { label: 'Search Bar', url: '', icon: 'search' },
            { label: 'Clock & Calendar', url: '', icon: 'clock' },
            { label: 'Weather', url: '', icon: 'cloud-sun' },
            { label: 'Notes', url: '', icon: 'edit-3' },
            { label: 'API Poller', url: '', icon: 'activity' },
            { label: 'Resource Monitor', url: '', icon: 'bar-chart-3' },
            { label: 'Media Card', url: '', icon: 'film' },
            { label: 'Git Repo', url: '', icon: 'code-2' },
            { label: 'Proxmox', url: '', icon: 'server' },
            { label: 'Digital Pet', url: '', icon: 'heart' },
            { label: 'LAN Scan', url: '', icon: 'radio' },
          ],
        },
      ],
    },
    {
      id: 'config-tip', title: 'Configuration', icon: 'settings',
      color: '#bbbbbb', width: 1,
      sections: [
        {
          id: 'config-notes', type: 'notes', label: 'Tips',
          content: '• Click the ⚙ icon or press Ctrl+Shift+C to open settings\n• Drag ⠿ to reorder cards\n• Double-click any card title to rename it\n• Upload backgrounds in Appearance settings',
        },
      ],
    },
    {
      id: 'system-info', title: 'System', icon: 'cpu',
      color: '#999999', width: 1,
      sections: [
        { id: 'sys-resources', type: 'resource-monitor', source: 'local', glancesUrl: 'http://localhost:61209', refreshInterval: 3, graphMode: false },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════
   SECTION 4: ICON DATA
   Icon repository (service icons from selfhst/icons),
   emoji list, Lucide icon name list, and emoji→Lucide migration map.
   ═══════════════════════════════════════════ */
const ICON_CDN = '/icons';
const ICON_REPO = [];
// Load service icons from selfhst index (complete, accurate filenames)
function loadIconRepo() {
  if (ICON_REPO.length > 0) return Promise.resolve();
  return storage.getIconIndex().then(function(data){
    console.log('loadIconRepo: received', typeof data, Array.isArray(data) ? data.length + ' entries' : 'not an array');
    data.forEach(function(item){
      if (item.SVG === 'Yes') {
        ICON_REPO.push({name: item.Name, file: item.Reference, tags: [item.Category || '']});
      }
    });
    console.log('loadIconRepo: ICON_REPO now has', ICON_REPO.length, 'entries');
    // Also re-render if picker is open
    const picker = document.getElementById('icon-picker-content');
    if (picker && picker.parentElement.classList.contains('open')) {
      const activeTab = document.querySelector('.ip-tab.active');
      if (activeTab && activeTab.dataset.tab === 'library') buildLibraryTab(picker);
    }
  }).catch(function(e){
    console.error('loadIconRepo failed:', e);
    // Flag for re-render of library tab if open
    const picker = document.getElementById('icon-picker-content');
    if (picker && picker.parentElement.classList.contains('open')) {
      picker.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">Failed to load service icons. Check server connection.</div>';
    }
  });
}

let config = {}, clockInterval = null, weatherIntervals = [], apiPollTimers = [], statsTimer = null;
let dragState = null, iconPickerCallback = null;
let uploadedFiles = [];

/* ═══════════════════════════════════════════
   SECTION 6: CONFIG LOAD / SAVE
   NOTE: Config is currently stored in localStorage (browser-side).
   The server also has /api/config endpoints for potential server-side syncing.
   ═══════════════════════════════════════════ */
// Load config from localStorage, merging over DEFAULT_CONFIG

// Load config from server — called once on page init
async function loadConfig() {
  try {
    const parsed = await storage.getConfig();
    if (parsed && Object.keys(parsed).length > 0) {
      if (!parsed.version || parsed.version < '0.2.0') { migrateConfigEmojis(parsed); parsed.version = WARTAB_VERSION; }
      // Migrate old 'small'/'medium'/'large' string fontSize to numeric px
      if (typeof parsed.theme?.fontSizeText === 'string') parsed.theme.fontSizeText = ({small:13,medium:14,large:16})[parsed.theme.fontSizeText] || 14;
      if (typeof parsed.theme?.fontSizeHeading === 'string') parsed.theme.fontSizeHeading = ({small:14,medium:16,large:18})[parsed.theme.fontSizeHeading] || 16;
      // Migrate old string pageWidth/paddingHeight to numeric
      if (typeof parsed.layout?.pageWidth === 'string') parsed.layout.pageWidth = ({full:100,'three-quarters':75,half:50})[parsed.layout.pageWidth] || 100;
      if (typeof parsed.layout?.paddingHeight === 'string') parsed.layout.pagePadding = ({full:20,compact:120})[parsed.layout.paddingHeight] || 20;
      config = deepMerge(cloneObj(DEFAULT_CONFIG), parsed);
    } else {
      config = cloneObj(DEFAULT_CONFIG);
    }
  } catch (e) {
    console.error('loadConfig failed:', e);
    config = cloneObj(DEFAULT_CONFIG);
  }
}
// Save config — uses chrome.storage in extension mode, server API otherwise
function saveConfig() {
  const cfg = cloneObj(config);
  try {
    storage.saveConfig(cfg).then(function(){
      // Subtle success indicator — brief pulse on the config button
      var btn = $('#btn-config');
      if (btn) { btn.classList.add('save-ok'); setTimeout(function(){ btn.classList.remove('save-ok'); }, 600); }
      emit('config:saved', { config: config });
    }, function(err){
      console.error('saveConfig failed:', err);
      toast(err.message || 'Config save failed', 'error');
    });
  } catch(e) {
    console.error('saveConfig primary path threw:', e);
    storage.saveConfigFallback(cfg);
  }
}
// Deep-merge stored config over defaults (arrays replaced, objects recursed)
function deepMerge(t,s){const r=cloneObj(t);for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]))r[k]=deepMerge(r[k]||{},s[k]);else r[k]=s[k];}return r;}

/* ── Sanitize imported config — skip bad data, collect warnings ── */
function sanitizeImportConfig(raw) {
  const warnings = [];
  if (!raw || typeof raw !== 'object') return { data: {}, warnings: ['Imported data is not a valid JSON object'] };

  function walk(obj, path) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      const out = [];
      for (let i = 0; i < obj.length; i++) {
        const p = path + '[' + i + ']';
        if (obj[i] === null || obj[i] === undefined) { warnings.push(escHtml(p) + ': skipped null/undefined'); continue; }
        var cleaned = walk(obj[i], p);
        if (cleaned !== undefined && cleaned !== null) out.push(cleaned);
      }
      return out;
    }
    const out = {};
    for (var k in obj) {
      var v = obj[k];
      var p = path + '.' + k;
      if (typeof v === 'string' && v.length > 200 && v.startsWith('data:')) {
        warnings.push(escHtml(p) + ': removed embedded data URL (' + Math.round(v.length / 1024) + 'KB) — use file path instead');
        // Don't copy the data URL; deepMerge will fill from DEFAULT_CONFIG
      } else if (typeof v === 'object') {
        out[k] = walk(v, p);
      } else if (typeof v === 'string' || (v !== undefined && v !== null)) {
        out[k] = v;
      }
    }
    return out;
  }

  var data = walk(raw, '');
  if (typeof data !== 'object' || data === null) { data = {}; warnings.push('Config replaced with empty object'); }

  // Ensure top-level sections exist (deepMerge will fill in defaults)
  if (data.cards && !Array.isArray(data.cards)) { delete data.cards; warnings.push('.cards: not an array — removed'); }
  if (data.pages !== undefined && !Array.isArray(data.pages) && typeof data.pages !== 'object') { delete data.pages; warnings.push('.pages: invalid type — removed'); }
  if (data.theme && typeof data.theme !== 'object') { delete data.theme; warnings.push('.theme: invalid — using defaults'); }
  if (data.layout && typeof data.layout !== 'object') { delete data.layout; warnings.push('.layout: invalid — using defaults'); }

  return { data: data, warnings: warnings };
}




/* ═══════════════════════════════════════════ DRAG & DROP ═══════════════════════════════════════════
   Pointer-based drag with floating ghost, grid-simulated live preview, and FLIP
   animation on ALL shifted cards at drop. Touch+mouse via Pointer Events API. */

/* ══════════ Link drag-reorder (within editor) ══════════ */



function addNewCard(){
  // Card type picker modal — Lucide icons, glass style
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('tabindex','-1');
  const box = document.createElement('div');
  box.className = 'modal-box';
  const label = document.createElement('div');
  label.textContent = 'New Card';
  label.className = 'modal-title';
  box.appendChild(label);
  const types = [
    {type:'links', label:'Links', icon:'link'},
    {type:'search', label:'Search', icon:'search'},
    {type:'clock', label:'Clock', icon:'clock'},
    {type:'notes', label:'Notes', icon:'edit-3'},
    {type:'weather', label:'Weather', icon:'cloud-sun'},
    {type:'iframe', label:'Iframe', icon:'monitor'},
    {type:'image', label:'Image', icon:'image'},
    {type:'api-poller', label:'API Poller', icon:'activity'},
    {type:'quotes', label:'Quotes', icon:'message-circle'},
    {type:'timer', label:'Timer', icon:'timer'},
    {type:'resource-monitor', label:'Resources', icon:'bar-chart-3'},
    {type:'link-list', label:'Link List', icon:'list'},
    {type:'lan-scan', label:'LAN Scan', icon:'radio'},
    {type:'digital-pet', label:'Digital Pet', icon:'heart'},
    {type:'ascii-anim', label:'ASCII Animation', icon:'monitor'},
    {type:'media', label:'Media Card', icon:'film'},
    {type:'proxmox', label:'Proxmox', icon:'server'},
    {type:'git', label:'Git Repo', icon:'code-2'},
  ];

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;';
  types.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'cp-type-btn';
    btn.innerHTML = '<i data-lucide="'+t.icon+'" style="width:22px;height:22px;"></i><span style="font-size:var(--text-xs);color:var(--text-secondary);">'+t.label+'</span>';
    btn.addEventListener('click', () => {
      overlay.remove();
      var colMax=config.layout.cols;
      if(config.pages[config.currentPage]&&config.pages[config.currentPage].cols)colMax=config.pages[config.currentPage].cols;
      const sec = {id:'sec-'+uid(),type:t.type,label:t.label,styles:{align:'left',density:'standard',scale:'medium',fontScale:{title:1,content:1,secondary:1}}};
      if(t.type==='links'||t.type==='link-list') sec.links=[{label:'Example',url:'https://example.com',icon:'link'}];
      if(t.type==='api-poller') {sec.url='https://api.github.com/repos/nousresearch/wartab';sec.fields=[{label:'Stars',path:'stargazers_count'},{label:'Forks',path:'forks_count'},{label:'Issues',path:'open_issues_count'}];sec.refreshInterval=120;}
      config.cards.push({
        id:'card-'+uid(), title:'', icon:'package', color:'#888888',
        width:Math.min(1,colMax), height:1,
        sections:[sec],
      });
      saveConfig(); renderAll(); toast('Card added: '+t.label);
    });
    grid.appendChild(btn);
  });
  box.appendChild(grid);
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'width:100%;justify-content:center;';
  cancelBtn.addEventListener('click', () => overlay.remove());
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.focus();
  // Render Lucide icons in the modal
  renderIcons();
}
function applyChanges(){saveConfig();applyTheme();}



/* ══════════ Keyboard Shortcuts Overlay ══════════ */

/* ═══════════════════════════════════════════ INIT ═══════════════════════════════════════════ */
async function init() {
  try {
  await loadConfig(); applyTheme();
  pageInit();  // migrate/init pages
  if(!config.cards||!config.cards.length){console.warn('Config had no cards — restored defaults');config=cloneObj(DEFAULT_CONFIG);pageInit();saveConfig();}
  await fetchUploads();
  // Random background on load if rotation enabled
  if(config.theme.bgRotate&&uploadedFiles.length>0){
    const pick=uploadedFiles[Math.floor(Math.random()*uploadedFiles.length)];
    if(pick){config.theme.bgType='image';config.theme.bgValue=pick.url;saveConfig();applyTheme();}
  }
  renderAll(); renderPageNav(); initStatusBar();
  // Build version from config metadata (set by server as git hash)
  WARTAB_BUILD = WARTAB_BUILD || config._version || WARTAB_VERSION;
  // Footer — build version with source link
  var ft=$('#footer-text');if(ft)ft.innerHTML='WarTab <a href="https://github.com/warmbo/wartab" target="_blank" rel="me noopener" style="color:var(--text-secondary);text-decoration:none;">'+WARTAB_BUILD+'</a>  [?] shortcuts';
  loadIconRepo();
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#btn-add-card').addEventListener('click',()=>{addNewCard();});
  $('#brand-text').addEventListener('click',()=>{location.reload();});
  $('#btn-manage-pages').addEventListener('click',openPageManagementPanel);
  $('#config-close').addEventListener('click',toggleConfigPanel);
  $('#config-overlay').addEventListener('click',toggleConfigPanel);
  $$('.ip-tab').forEach(t=>t.addEventListener('click',()=>buildIconPicker(t.dataset.tab)));
  $('#icon-picker-close').addEventListener('click',closeIconPicker);
  $('#icon-picker-overlay').addEventListener('click',closeIconPicker);
  $('#edit-panel-close').addEventListener('click',closeCardEditPanel);
  $('#edit-panel-overlay').addEventListener('click',closeCardEditPanel);
  // Background picker close handlers
  $('#bg-picker-close').addEventListener('click',function(){
    $('#bg-picker-overlay').classList.remove('open');
    $('#bg-picker').classList.remove('open');
  });
  $('#bg-picker-overlay').addEventListener('click',function(){
    $('#bg-picker-overlay').classList.remove('open');
    $('#bg-picker').classList.remove('open');
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&configPanelOpen)toggleConfigPanel();
    if(e.key==='Escape'&&iconPickerOpen)closeIconPicker();
    if(e.key==='Escape'&&_editPanelOpen)closeCardEditPanel();
    if(e.key==='Escape'&&document.querySelector('#shortcuts-overlay'))document.querySelector('#shortcuts-overlay').remove();
    if(e.key==='Escape'&&document.querySelector('#bg-picker.open')){
      $('#bg-picker-overlay').classList.remove('open');
      $('#bg-picker').classList.remove('open');
    }
    if(e.key==='C'&&e.ctrlKey&&e.shiftKey){e.preventDefault();toggleConfigPanel();}
    if((e.key==='l'||e.key==='k')&&(e.ctrlKey||e.metaKey)){e.preventDefault();const fs=$('#card-grid .inline-search-wrap input');if(fs)fs.focus();}
    // ? opens shortcuts overlay
    if(e.key==='?'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();showShortcutsOverlay();}
    // Also catch Shift+/ which browsers may report as '/' with shiftKey
    if(e.key==='/'&&e.shiftKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();showShortcutsOverlay();}
    if(e.key==='Tab'&&(e.ctrlKey||e.metaKey)){e.preventDefault();const order=config.pageOrder||[];if(!order.length)return;const idx=order.indexOf(config.currentPage);const next=order[(idx+1)%order.length];switchPage(next);}
  });
  // Periodic timestamp updater
  setInterval(()=>{
    $$('.api-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
    $$('.weather-ts').forEach(el=>{const t=parseInt(el.dataset.ts);if(t)el.textContent='updated '+timeAgo(t);});
  },15000);
  console.log('WarTab initialized');
  // Render any Lucide icons that were added dynamically
  renderIcons();
  } catch(e) {
    console.error('init error:', e);
  } finally {
    $('#page-loader').classList.add('hidden');
  }
}
// Safety net: hide spinner after 10s even if init function fails silently
setTimeout(function(){const pl=document.getElementById('page-loader');if(pl)pl.classList.add('hidden');},10000);
document.addEventListener('DOMContentLoaded', init);
