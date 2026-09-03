/* ═══════════════════════════════════════════
   WarTab — Theme & Branding
   applyTheme, hexToRgba, loadGoogleFont.
   Depends on: $, config, DEFAULT_CONFIG (from app.js)
   ═══════════════════════════════════════════ */
/* ── Background image display-size cap ──
   Uploaded wallpapers can be 4K+ (a 3840×2160 source decodes to a ~33MB RGBA
   texture the compositor must also blur). `background-size: cover` downscales
   to the viewport for display, so a display-sized source renders pixel-identical
   while the GPU holds a fraction of the memory. We apply the raw URL immediately
   (no visual regression / async gap), then swap in a display-resolution copy once
   it has been downscaled to an offscreen canvas. */
const _bgCache = new Map();        // url -> downscaled dataURL (or raw when not downscaleable)
const _bgInFlight = new Set();     // urls currently being processed
function _capBgToDisplay(url){
  if(_bgCache.has(url)) return _bgCache.get(url);
  if(_bgInFlight.has(url)) return url;                 // in progress — keep raw meanwhile
  if(!url || typeof Image==='undefined' || typeof document==='undefined'||!document.createElement('canvas')) return url;
  _bgInFlight.add(url);
  const dpr = Math.max(1, (window.devicePixelRatio||1));
  // Enough for any screen: 2× viewport to cover retina, hard-capped to keep texture small.
  const maxSide = Math.min(2560, Math.max(1600, 2 * Math.max(window.innerWidth, window.innerHeight) * dpr));
  const img = new Image();
  img.onload = function(){
    try{
      if(img.naturalWidth <= maxSide && img.naturalHeight <= maxSide){
        _bgCache.set(url, url);                         // already small enough
      }else{
        const scale = Math.min(1, maxSide/Math.max(img.naturalWidth, img.naturalHeight));
        const c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(img.naturalWidth*scale));
        c.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=c.getContext('2d');
        ctx.drawImage(img,0,0,c.width,c.height);
        _bgCache.set(url, c.toDataURL('image/jpeg',0.82));
      }
    }catch(e){ _bgCache.set(url, url); }               // fall back to raw on any error
    _bgInFlight.delete(url);
    _applyCachedBg(url);
  };
  img.onerror = function(){ _bgCache.set(url, url); _bgInFlight.delete(url); _applyCachedBg(url); };
  img.src = url;
  return url;
}
function _applyCachedBg(url){
  // Only swap if this url is still the active image background.
  const t=config&&config.theme;
  if(!t || t.bgType!=='image' || t.bgValue!==url) return;
  const bg=typeof $==='function'?$('#bg-canvas'):null;
  if(!bg) return;
  const cached=_bgCache.get(url)||url;
  const isData=String(cached).slice(0,5)==='data:';
  bg.style.background=`url(${isData?'':'"'}${cached}${isData?'':'"'}) center/cover no-repeat`;
}
function applyTheme(){
  const t=config.theme,bg=$('#bg-canvas');
  switch(t.bgType){
    case'gradient':bg.style.background=`linear-gradient(135deg,${t.bgValue})`;break;
    case'solid':bg.style.background=t.bgValue.split(',')[0].trim();break;
    case'image':{
      const u=t.bgValue.trim();
      bg.style.background=`url("${u}") center/cover no-repeat`;
      const capped=_capBgToDisplay(u);                 // kick off (or reuse) display-size downscale
      if(capped!==u) bg.style.background=`url("${capped}") center/cover no-repeat`;
      break;
    }
    default:bg.style.background=`linear-gradient(135deg,${DEFAULT_CONFIG.theme.bgValue})`;
  }
  const root=document.documentElement;
  root.style.setProperty('--bg-blur',t.blur+'px');
  // Background image blur + dim (only effective when bgType=image)
  root.style.setProperty('--bg-img-blur', (t.bgType==='image' ? (parseInt(t.bgBlur)||0) : 0) + 'px');
  root.style.setProperty('--bg-dim-opacity', (t.bgType==='image' ? Math.min(1, Math.max(0, (parseInt(t.bgDim)||0)/100)) : 0));
  root.style.setProperty('--accent',t.glow);
  root.style.setProperty('--accent-glow',hexToRgba(t.glow,0.3));
  root.style.setProperty('--accent-glass',hexToRgba(t.glow,0.12));

  // Typography uses one monotonic, bounded scale. Keep the browser root at its
  // accessibility default; WarTab's setting controls component tokens instead.
  const tSize = Math.min(28, Math.max(10, parseInt(t.fontSizeText) || 14));
  const hSize = Math.min(28, Math.max(10, parseInt(t.fontSizeHeading) || 16));
  const px = value => `${Math.round(value * 100) / 100}px`;
  const typeScale = {
    '--text-3xs': Math.max(8, tSize * 0.68),
    '--text-2xs': Math.max(9, tSize * 0.76),
    '--text-xs': Math.max(10, tSize * 0.84),
    '--text-sm': Math.max(10, tSize - 2),
    '--text-base': tSize,
    '--text-lg': tSize + 2,
    '--text-xl': tSize + 6,
    '--text-2xl': tSize + 10,
    '--text-3xl': tSize + 18,
    '--text-4xl': tSize + 26,
    '--text-5xl': tSize + 38,
  };
  root.style.fontSize = '';
  root.style.setProperty('--text-size', px(tSize));
  Object.entries(typeScale).forEach(([name, value]) => root.style.setProperty(name, px(value)));
  root.style.setProperty('--type-body', px(tSize));
  root.style.setProperty('--type-ui', px(typeScale['--text-sm']));
  root.style.setProperty('--type-label', px(typeScale['--text-xs']));
  root.style.setProperty('--type-meta', px(typeScale['--text-2xs']));
  root.style.setProperty('--type-card-title', px(Math.max(hSize, tSize + 1)));
  root.style.setProperty('--type-panel-title', px(Math.max(hSize + 2, tSize + 3)));
  root.style.setProperty('--heading-size', px(Math.max(hSize, tSize + 1)));
  root.style.setProperty('--topbar-scale', parseFloat(t.topBarScale) || 1);
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}','Segoe UI',system-ui,-apple-system,sans-serif`);
  loadGoogleFont(fn,true);

  // Card background — black for dark, white for light, with accent tint
  const h=t.glow.replace('#','');
  const r=parseInt(h[0]+h[1],16),gr=parseInt(h[2]+h[3],16),b=parseInt(h[4]+h[5],16);
  // Follow-system overrides the explicit card style with the OS preference.
  const wantFollow = t.followSystem === true &&
    typeof window !== 'undefined' && !!window.matchMedia;
  const osLight = wantFollow &&
    window.matchMedia('(prefers-color-scheme: light)').matches;
  const mode = osLight ? 'light' : (t.cardBg||'dark');
  const op = t.cardOpacity !== undefined ? t.cardOpacity : 1;
  const base = mode === 'light' ? [255,255,255] : [0,0,0];
  const tint = mode === 'light' ? 0.18 : 0.06;
  // Dark: black + accent blend. Light: white + visible accent blend.
  root.style.setProperty('--card-bg',`rgba(${Math.round(base[0]*(1-tint)+r*tint)},${Math.round(base[1]*(1-tint)+gr*tint)},${Math.round(base[2]*(1-tint)+b*tint)},${op})`);
  root.style.setProperty('--card-bg-alt',`rgba(${r},${gr},${b},${mode==='light' ? 0.15 : 0.08})`);
  root.style.setProperty('--card-input-bg', mode === 'light'
    ? `rgba(0,0,0,${0.06 * op})`
    : `rgba(255,255,255,${0.15 * op})`);
  document.documentElement.dataset.cardBg=mode;
  // Card radius
  root.style.setProperty('--card-radius', (t.cardRadius !== undefined ? parseInt(t.cardRadius) : 16) + 'px');
  // Surface radius — menus, panels, gallery, palette follow the card-radius
  // setting so controls never look disconnected from the cards. Clamped so an
  // aggressive 0-radius choice still keeps tiny chips readable (they use
  // --radius-sm directly and are unaffected).
  var cardR = t.cardRadius !== undefined ? parseInt(t.cardRadius) : 16;
  root.style.setProperty('--radius', Math.max(2, Math.min(cardR || 16, 24)) + 'px');
  // Control radius — buttons/inputs/menu items scale at ~half the card radius
  // so they stay readable but always feel like part of the same product.
  root.style.setProperty('--control-radius', Math.max(3, Math.min(Math.round((cardR || 16) / 2), 12)) + 'px');

  // Font color from config — invert in light card mode for readability
  var fc=t.fontColor||'#cccccc';
  if (mode === 'light') {
    // In light mode, use dark text (independent of user's fontColor config)
    fc = '#222222';
  }
  root.style.setProperty('--text-primary',hexToRgba(fc,0.92));
  root.style.setProperty('--text-secondary',hexToRgba(fc,0.60));
  root.style.setProperty('--text-tertiary',hexToRgba(fc,0.48));

  // Branding
  const brand=$('#brand-text');
  if(brand){
    const b2=config.branding||DEFAULT_CONFIG.branding;
    const bi=String(b2.icon||'sword');
    const iconWrap=document.createElement('span');
    iconWrap.className='brand-icon';
    if(isLucideName(bi)){
      const icon=document.createElement('i');icon.setAttribute('data-lucide',bi);iconWrap.appendChild(icon);
    }else if(bi.startsWith('http')||bi.startsWith('data:')||bi.startsWith('/')){
      iconWrap.classList.add('brand-icon-img');
      const image=document.createElement('img');image.src=bi;image.alt='';iconWrap.appendChild(image);
    }else{
      iconWrap.classList.add('emoji-icon');iconWrap.textContent=bi;
    }
    const title=document.createElement('span');title.className='brand-title';title.textContent=b2.title||'WarTab';
    brand.setAttribute('aria-label',b2.title||'WarTab');
    brand.replaceChildren(iconWrap,title);
  }
  document.title=(config.branding||DEFAULT_CONFIG.branding).title||'WarTab';
  // Toggles
  document.documentElement.dataset.animations=config.theme.animations!==false?'on':'off';
  document.documentElement.dataset.accentBar=config.theme.showAccentBar!==false?'on':'off';

  // Custom CSS injection — user overrides applied last so they win on equal
  // specificity. Re-applied on every theme change so edits take effect live.
  var cssEl = document.getElementById('wartab-custom-css');
  var css = (config.theme && config.theme.customCss) || '';
  if (css) {
    if (!cssEl) { cssEl = document.createElement('style'); cssEl.id = 'wartab-custom-css'; document.head.appendChild(cssEl); }
    if (cssEl.textContent !== css) cssEl.textContent = css;
  } else if (cssEl) {
    cssEl.remove();
  }
}
function hexToRgba(h,a){const c=h.replace('#','');return`rgba(${parseInt(c[0]+c[1],16)},${parseInt(c[2]+c[3],16)},${parseInt(c[4]+c[5],16)},${a})`;}

/** Explicitly flip the card theme (dark/light), overriding follow-system for the session. */
function toggleTheme(){
  config.theme = config.theme || {};
  config.theme.followSystem = false;
  config.theme.cardBg = (config.theme.cardBg === 'light') ? 'dark' : 'light';
  applyTheme();
  saveConfig();
  toast('Theme: ' + (config.theme.cardBg === 'light' ? 'Light' : 'Dark'), 'success');
}
function loadGoogleFont(fn,allowReplace){
  if(fn==='Inter')return; // Inter loaded from local inter.css
  const id='wartab-font-'+fn.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  if(document.getElementById(id))return;
  if(!allowReplace){
    const l=document.createElement('link');l.id=id;l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
  }else{
    const oe=document.getElementById('wartab-font');
    if(oe&&oe.dataset.font===fn)return;
    if(oe)oe.remove();
    const l=document.createElement('link');l.id='wartab-font';l.dataset.font=fn;l.rel='stylesheet';
    l.href='https://fonts.googleapis.com/css2?family='+fn.replace(/ /g,'+')+':wght@200..700&display=swap';
    document.head.appendChild(l);
}
}
