/* ═══════════════════════════════════════════
   WarTab — Theme & Branding
   applyTheme, hexToRgba, loadGoogleFont.
   Depends on: $, config, DEFAULT_CONFIG (from app.js)
   ═══════════════════════════════════════════ */
/* ── Theme & Branding ── */
function applyTheme(){
  const t=config.theme,bg=$('#bg-canvas');
  switch(t.bgType){
    case'gradient':bg.style.background=`linear-gradient(135deg,${t.bgValue})`;break;
    case'solid':bg.style.background=t.bgValue.split(',')[0].trim();break;
    case'image':bg.style.background=`url(${t.bgValue.trim()}) center/cover no-repeat fixed`;break;
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
