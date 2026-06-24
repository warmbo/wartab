/* ═══════════════════════════════════════════
   WarTab — Core Utilities & Constants
   Shared by app.js and all modules.
   Pure functions with no dependencies on app.js state.
   ═══════════════════════════════════════════ */

/* ── Card Type Modules registry ── */
const WARTAB_VERSION = 'dev';
var WARTAB_BUILD = '';
const CARD_MODULES = {};
function registerModule(type, module){
  CARD_MODULES[type]=module;
  // Auto-inject per-module CSS into <head> on registration
  if(module.css){
    var id='mod-css-'+type;
    if(!document.getElementById(id)){
      var s=document.createElement('style');s.id=id;s.textContent=module.css;
      document.head.appendChild(s);
    }
  }
}

/* ── Event Bus (Pub/Sub) ── */
// Lightweight pub/sub for targeted re-renders instead of calling renderAll().
// Subscribe with: var unsub = on('config:card:updated', fn)
// Fire with:      emit('config:card:updated', { cardId: '...' })
const _evBus={};
function on(ev,fn){if(!_evBus[ev])_evBus[ev]=[];_evBus[ev].push(fn);return function(){_evBus[ev]=_evBus[ev].filter(function(f){return f!==fn;});};}
function emit(ev,data){(_evBus[ev]||[]).forEach(function(fn){try{fn(data);}catch(e){console.error('[EventBus]',ev,e);}});}

/* ── Public API presets for API Poller ── */
const API_PRESETS = [
  { label:'GitHub Repo', url:'https://api.github.com/repos/warmbo/wartab', fields:[{label:'Stars',path:'stargazers_count'},{label:'Forks',path:'forks_count'},{label:'Issues',path:'open_issues_count'}], icon:'github' },
  { label:'Bitcoin Price', url:'https://api.coinbase.com/v2/prices/BTC-USD/spot', fields:[{label:'BTC/USD',path:'data.amount'}], icon:'bitcoin' },
  { label:'Dog API', url:'https://dog.ceo/api/breeds/image/random', fields:[{label:'Breed Image',path:'message'}], icon:'dog' },
  { label:'IP Info', url:'http://ip-api.com/json/', fields:[{label:'IP',path:'query'},{label:'ISP',path:'isp'},{label:'City',path:'city'},{label:'Country',path:'country'}], icon:'map-pin' },
  { label:'Random User', url:'https://randomuser.me/api/', fields:[{label:'Name',path:'results.0.name.first'},{label:'Country',path:'results.0.location.country'}], icon:'users' },
  { label:'Open-Meteo (NYC)', url:'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true', fields:[{label:'Temp °C',path:'current_weather.temperature'},{label:'Wind km/h',path:'current_weather.windspeed'}], icon:'cloud-sun' },
  { label:'Joke', url:'https://v2.jokeapi.dev/joke/Any?type=single', fields:[{label:'Joke',path:'joke'}], icon:'message-circle' },
  { label:'ISS Location', url:'http://api.open-notify.org/iss-now.json', fields:[{label:'Lat',path:'iss_position.latitude'},{label:'Lon',path:'iss_position.longitude'}], icon:'globe' },
  { label:'Nightscout CGM', url:'https://YOUR-SITE.herokuapp.com/api/v1/entries.json?count=1', fields:[{label:'Glucose',path:'0.sgv',format:'number'},{label:'Trend',path:'0.direction'},{label:'Time',path:'0.dateString'}], icon:'activity' },
];

/* ── Icon data ── */
const EMOJIS = ['🔍','🕐','🌐','🖥️','📖','📝','🏠','🎬','🛡️','📊','🐳','🔐','🐙','🦊','📚','📦','🐍','💬','▶️','🎮','🐦','🌍','⚛️','📘','⚔️','⚙️','🔄','✕','🔗','🌟','🔥','💡','🚀','⚡','🎯','🧩','🎨','📡','🔧','🗄️','💾','🖨️','📷','🎥','🎵','🎙️','📻','📺','💻','⌨️','🖱️','📱','💽','💿','📀','🔌','🔋','💎','🧊','⛅','☀️','🌙','⭐','✨','💫','🎆','🌈','☁️','🌊','🔥','🍃','🌱','🌿','☘️','🍀','🏆','🥇','🥈','🥉','🏅','🎖️','🏁','🚩','🎌','📌','📍','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎸','🎺','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🎰','🎲','🧩','♠️','♥️','♦️','♣️'];

const LUCIDE_ICONS = ['search', 'clock', 'globe', 'monitor', 'book-open', 'edit-3', 'sword', 'home', 'film', 'shield', 'bar-chart-3', 'container', 'lock', 'github', 'gitlab', 'package', 'code-2', 'message-circle', 'play', 'gamepad-2', 'twitter', 'book', 'settings', 'plus', 'x', 'link', 'star', 'zap', 'flag', 'compass', 'map-pin', 'server', 'database', 'external-link', 'mail', 'music', 'image', 'cpu', 'hard-drive', 'activity', 'wifi', 'radio', 'smartphone', 'tablet', 'laptop', 'watch', 'camera', 'video', 'headphones', 'volume-2', 'monitor-speaker', 'tv', 'layers', 'grid', 'list', 'columns', 'layout', 'panel-top', 'panel-bottom', 'panel-left', 'panel-right', 'square', 'circle', 'triangle', 'hexagon', 'diamond', 'box', 'archive', 'folder', 'file', 'file-text', 'clipboard', 'check-square', 'check', 'x-square', 'trash-2', 'refresh-cw', 'rotate-cw', 'rotate-ccw', 'download', 'upload', 'cloud', 'cloud-drizzle', 'cloud-snow', 'cloud-lightning', 'sun', 'moon', 'thermometer', 'wind', 'droplets', 'umbrella', 'user', 'users', 'user-plus', 'user-check', 'user-x', 'bell', 'bell-ring', 'bell-off', 'eye', 'eye-off', 'lock', 'unlock', 'key', 'fingerprint', 'shield-off', 'alert-triangle', 'alert-circle', 'alert-octagon', 'info', 'help-circle', 'thumbs-up', 'thumbs-down', 'smile', 'frown', 'meh', 'heart', 'calendar', 'calendar-check', 'calendar-x', 'alarm-clock', 'timer', 'hourglass', 'stopwatch', 'map', 'navigation', 'navigation-2', 'crosshair', 'target', 'locate', 'send', 'inbox', 'mail', 'mail-open', 'at-sign', 'phone', 'message-square', 'message-text', 'chat', 'printer', 'scanner', 'bluetooth', 'battery', 'battery-charging', 'power', 'plug', 'bookmark', 'tag', 'award', 'trending-up', 'trending-down', 'pie-chart', 'sliders', 'filter', 'tool', 'wrench', 'hammer', 'paintbrush', 'palette', 'pen-tool', 'eraser', 'scissors', 'copy', 'paste', 'undo', 'redo', 'bold', 'italic', 'underline', 'type', 'hash', 'percent', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right', 'chevrons-up', 'chevrons-down', 'chevrons-left', 'chevrons-right', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'maximize', 'minimize', 'expand', 'shrink', 'move', 'menu', 'more-horizontal', 'more-vertical', 'sidebar', 'columns', 'rows', 'split', 'sunrise', 'sunset', 'cloud-sun', 'cloud-moon', 'cloudy', 'cloud-off', 'haze', 'mist', 'snowflake', 'sparkles', 'loader', 'radio'];

const EMOJI_TO_LUCIDE={
'🔍':'search','🕐':'clock','🌐':'globe','🖥️':'monitor','📖':'book-open',
'📝':'edit-3','📦':'package','🏠':'home','🎬':'film','🛡️':'shield',
'📊':'bar-chart-3','🐳':'container','🔐':'lock','🐙':'github','🦊':'gitlab',
'📚':'book','🐍':'code-2','💬':'message-circle','▶️':'play','🎮':'gamepad-2',
'🐦':'x','🌍':'globe','⚛️':'atom','📘':'book','⚔️':'sword','🔗':'link',
'⚙️':'settings','🌟':'star','🔥':'flame','💡':'lightbulb','🚀':'rocket',
'⚡':'zap','🎯':'target','🧩':'puzzle','🎨':'palette','📡':'satellite',
'🔧':'wrench','🗄️':'server','💾':'save','🖨️':'printer','📷':'camera',
'🎥':'video','🎵':'music','🎙️':'mic','📻':'radio','📺':'tv','💻':'laptop',
'⌨️':'keyboard','🖱️':'mouse','📱':'smartphone','💽':'disc','💿':'disc',
'📀':'disc','🔌':'plug','🔋':'battery','💎':'diamond','🧊':'snowflake',
'⛅':'cloud-sun','☀️':'sun','🌙':'moon','⭐':'star','✨':'sparkles',
'💫':'star','🎆':'sparkles','🌈':'rainbow','☁️':'cloud','🌊':'waves',
'🔥':'flame','🍃':'wind','🌱':'sprout','🌿':'sprout','☘️':'sprout',
'🍀':'sprout','🏆':'trophy','🥇':'award','🥈':'award','🥉':'award',
'🏅':'award','🎖️':'award','🏁':'flag','🚩':'flag','🎌':'flag',
'📌':'pin','📍':'map-pin','🎪':'tent','🎭':'theater','🎬':'film',
'🎤':'mic','🎧':'headphones','🎼':'music','🎹':'piano','🥁':'drum',
'🎷':'saxophone','🎸':'guitar','🎺':'trumpet','🎻':'violin','🎲':'dice',
'♟️':'chess','🎳':'bowling','🎮':'gamepad-2','🕹️':'joystick','🎰':'slot',
'🧩':'puzzle','♠️':'spade','♥️':'heart','♦️':'diamond','♣️':'club',
'✕':'x','🔄':'refresh-cw','🐍':'code-2'};

function migrateConfigEmojis(cfg){
  if(cfg.branding&&cfg.branding.icon&&EMOJI_TO_LUCIDE[cfg.branding.icon])cfg.branding.icon=EMOJI_TO_LUCIDE[cfg.branding.icon];if(cfg.branding&&cfg.branding.icon==='twitter')cfg.branding.icon='x';
  if(cfg.cards)cfg.cards.forEach(function(card){
    if(card.icon&&EMOJI_TO_LUCIDE[card.icon])card.icon=EMOJI_TO_LUCIDE[card.icon];if(card.icon==='twitter')card.icon='x';
    (card.sections||[]).forEach(function(sec){
      if(sec.type==='links'||sec.type==='link-list')(sec.links||[]).forEach(function(lk){
        if(lk.icon&&EMOJI_TO_LUCIDE[lk.icon])lk.icon=EMOJI_TO_LUCIDE[lk.icon];if(lk.icon==='twitter')lk.icon='x';
      });
    });
  });
}

/* ── Lucide icon utilities ── */
function isLucideName(s){if(!s||typeof s!=='string')return false;if(s.startsWith('http')||s.startsWith('data:')||s.startsWith('/'))return false;if(typeof lucide!=='undefined'&&lucide.icons){const p=s.split('-').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join('');return p in lucide.icons;}return LUCIDE_ICONS.includes(s);}
function renderLucideEl(name,cls){const i=document.createElement('i');i.className=cls;i.setAttribute('data-lucide',name);return i;}
function renderIcons(){const _lw=console.warn;console.warn=function(){};try{lucide.createIcons();}catch(e){}console.warn=_lw;}

/* ── DOM helpers ── */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid(){return Math.random().toString(36).substring(2,9)+Date.now().toString(36);}
function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function cloneObj(o){return JSON.parse(JSON.stringify(o));}

/* ── Toast ── */
function toast(msg,type='info'){
  // Dedup: skip if an identical toast is already visible
  const existing = document.querySelectorAll('.toast');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].textContent === msg) return;
  }
  const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),3000);}
function toastWithUndo(msg,undoFn){const el=document.createElement('div');el.className='toast';el.style.cssText='display:flex;align-items:center;gap:10px;';const t=document.createElement('span');t.textContent=msg;const b=document.createElement('button');b.className='btn btn-glass btn-sm';b.textContent='Undo';b.style.fontWeight='700';b.addEventListener('click',()=>{undoFn();el.remove();toast('Restored','success');});el.appendChild(t);el.appendChild(b);$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),5000);}

/* ── Time utilities ── */
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function timeAgo(ts){const s=Math.floor((Date.now()-ts)/1000);if(s<60)return s+'s ago';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function getNested(o,p){return p.split('.').reduce((a,pt)=>a&&a[pt],o);}

/* ── Fetch with timeout ── */
function fetchWithTimeout(url, options, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/* ── Virtual Grid Utilities (coordinate tracking, collision detection) ── */
// Tracks card positions in a virtual coordinate space for future drag-and-drop
// improvements, without changing the current CSS-grid rendering approach.
// Cards are placed left-to-right, top-to-bottom, wrapping per row.
// Each card gets: x, y (column/row start, 1-indexed), cols, rows.

function assignGridPositions(cards, cols) {
  var col=1, row=1;
  cards.forEach(function(c){
    var w=Math.min(c.width||1, cols);
    if(col+w-1>cols){col=1;row+=1;}
    c._gx=col; c._gy=row; c._gw=w; c._gh=Math.min(c.height||1,4);
    col+=w;
  });
}

function getGridBounds(cards, cols) {
  assignGridPositions(cards, cols);
  var gw=cards.reduce(function(m,c){return Math.max(m,c._gx+c._gw-1);},0);
  var gh=cards.reduce(function(m,c){return Math.max(m,c._gy+c._gh-1);},0);
  return {cols:gw, rows:gh};
}

function getCardAt(cards, cols, gx, gy) {
  assignGridPositions(cards, cols);
  for(var i=0;i<cards.length;i++){
    var c=cards[i];
    if(gx>=c._gx&&gx<c._gx+c._gw&&gy>=c._gy&&gy<c._gy+c._gh) return c;
  }
  return null;
}

function isAreaFree(cards, cols, gx, gy, gw, gh, ignoreId) {
  for(var r=0;r<gh;r++)for(var c2=0;c2<gw;c2++){
    var cell=getCardAt(cards,cols,gx+c2,gy+r);
    if(cell&&cell.id!==ignoreId)return false;
  }
  return true;
}