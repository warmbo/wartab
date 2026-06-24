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

  // Font size — compute full scale as CSS variables from numeric px values
  const tSize = parseInt(t.fontSizeText) || 14;
  const hSize = parseInt(t.fontSizeHeading) || 16;
  root.style.fontSize = tSize + 'px';
  root.style.setProperty('--text-size', tSize + 'px');
  root.style.setProperty('--text-3xs', Math.max(8, tSize - 5) + 'px');
  root.style.setProperty('--text-2xs', Math.max(9, tSize - 4) + 'px');
  root.style.setProperty('--text-xs',  Math.max(10, tSize - 3) + 'px');
  root.style.setProperty('--text-sm',  Math.max(11, tSize - 2) + 'px');
  root.style.setProperty('--text-base', tSize + 'px');
  root.style.setProperty('--text-lg',  (tSize + 2) + 'px');
  root.style.setProperty('--text-xl',  (tSize + 8) + 'px');
  root.style.setProperty('--text-2xl', (tSize + 18) + 'px');
  root.style.setProperty('--text-3xl', (tSize + 26) + 'px');
  root.style.setProperty('--heading-size', hSize + 'px');
  const fn=t.fontFamily||'Inter';
  root.style.setProperty('--font',`'${fn}','Segoe UI',system-ui,-apple-system,sans-serif`);
  loadGoogleFont(fn,true);

  // Card background — black for dark, white for light, with accent tint
  const h=t.glow.replace('#','');
  const r=parseInt(h[0]+h[1],16),gr=parseInt(h[2]+h[3],16),b=parseInt(h[4]+h[5],16);
  const mode=t.cardBg||'dark';
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

  // Font color from config
  const fc=t.fontColor||'#cccccc';
  root.style.setProperty('--text-primary',hexToRgba(fc,0.92));
  root.style.setProperty('--text-secondary',hexToRgba(fc,0.60));
  root.style.setProperty('--text-tertiary',hexToRgba(fc,0.35));

  // Branding
  const brand=$('#brand-text');
  if(brand){const b2=config.branding||DEFAULT_CONFIG.branding;const bi=b2.icon||'sword';brand.innerHTML=(isLucideName(bi)?'<span class="brand-icon"><i data-lucide="'+bi+'"></i></span>':'<span class="brand-icon emoji-icon">'+bi+'</span>')+'<span>'+escHtml(b2.title||'WarTab')+'</span>';}
  document.title=(config.branding||DEFAULT_CONFIG.branding).title||'WarTab';
  // Toggles
  document.documentElement.dataset.animations=config.theme.animations!==false?'on':'off';
  document.documentElement.dataset.accentBar=config.theme.showAccentBar!==false?'on':'off';
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
