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
    cardRadius: 16,               // card border radius (px)
    topBarScale: 1,               // top-bar icon/text scale factor (0.5-2.0)
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
    // The index may resolve to a non-array (error text, wrapper object, or a
    // stale cached response). Guard before calling .forEach so the icon
    // library never crashes on bad data.
    if (!Array.isArray(data)) { console.warn('loadIconRepo: expected array, got', typeof data); return; }
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

let config = {}, statsTimer = null;
let _linkDrag = null, iconPickerCallback = null;
let uploadedFiles = [];
const configSaver = WarTabConfigStore.createConfigSaver({
  write: function(snapshot) {
    try {
      return storage.saveConfig(snapshot);
    } catch (error) {
      storage.saveConfigFallback(snapshot);
      return Promise.resolve();
    }
  },
  onSaved: function(snapshot) {
    var btn = $('#btn-config');
    if (btn) {
      btn.classList.add('save-ok');
      setTimeout(function() { btn.classList.remove('save-ok'); }, 600);
    }
    emit('config:saved', { config: snapshot });
  },
  onError: function(error) {
    console.error('saveConfig failed:', error);
    toast(error.message || 'Config save failed', 'error');
  },
});

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
  var promise = configSaver.save(config);
  // Existing fire-and-forget callers stay safe; callers that await still receive rejection.
  promise.catch(function() {});
  return promise;
}
// Compatibility names retained for existing callers; implementations live in config-model.js.
function deepMerge(target, source) {
  return WarTabConfigModel.deepMerge(target, source);
}

function sanitizeImportConfig(raw) {
  return WarTabConfigModel.sanitizeImportConfig(raw);
}




/* ═══════════════════════════════════════════ DRAG & DROP ═══════════════════════════════════════════
   Pointer-based drag with floating ghost, grid-simulated live preview, and FLIP
   animation on ALL shifted cards at drop. Touch+mouse via Pointer Events API. */

/* ══════════ Link drag-reorder (within editor) ══════════ */



function addCardOfType(type, cardOverrides) {
  var definition = WarTabCardModel.getTypeDef(type);
  if (!definition) return null;
  var page = config.pages[config.currentPage];
  var maxColumns = (page && page.cols) || config.layout.cols;
  var card = WarTabCardModel.addCard(config, type, cardOverrides || {}, {
    maxColumns: maxColumns,
  });
  saveConfig();
  renderAll();
  toast('Card added: ' + definition.label);
  return card;
}

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
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;';
  CARD_TYPE_DEFS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'cp-type-btn';
    btn.innerHTML = '<i data-lucide="'+t.icon+'" style="width:22px;height:22px;"></i><span style="font-size:var(--text-xs);color:var(--text-secondary);">'+t.label+'</span>';
    btn.addEventListener('click', () => {
      overlay.remove();
      addCardOfType(t.type);
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
  var ft=$('#footer-text');if(ft)ft.innerHTML='WarTab <a href="https://github.com/warmbo/wartab" target="_blank" rel="me noopener" style="color:var(--text-secondary);text-decoration:none;">'+WARTAB_BUILD+'</a>';
  loadIconRepo();
  $('#btn-help').addEventListener('click', function() { showShortcutsOverlay(); });
  $('#btn-config').addEventListener('click',toggleConfigPanel);
  $('#btn-add-card').addEventListener('click',()=>{addNewCard();});
  $('#brand-text').addEventListener('click',()=>{location.reload();});
  $('#btn-manage-pages').addEventListener('click',openPageManagementPanel);
  $('#btn-arrange').addEventListener('click',toggleArrangeMode);
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
