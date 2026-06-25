/* ═══════════════════════════════════════════
   WarTab — Config Panel (Global Settings)
   Theme, branding, layout, data management UI.
   Depends on: $, $$, config, saveConfig (app.js), applyTheme (theme.js)
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════ CONFIG PANEL ═══════════════════════════════════════════ */
let configPanelOpen=false;
let _configTab='dashboard'; // 'dashboard' | 'appearance' | 'system'

function toggleConfigPanel(){configPanelOpen=!configPanelOpen;$('#config-overlay').classList.toggle('open',configPanelOpen);$('#config-panel').classList.toggle('open',configPanelOpen);updateBlurState();if(configPanelOpen){buildConfigPanel();renderIcons();}}

function buildConfigPanel(){const body=$('#config-body');body.innerHTML='';
  const ht=$('#config-header-title');
  if(ht)ht.innerHTML='<i data-lucide="Settings" style="width:18px;height:18px;vertical-align:middle;margin-right:var(--space-2);"></i><span style="vertical-align:middle;">WarTab Config</span>';

  // Build tab bar
  const tabBar=el('div','display:flex;gap:var(--space-2);margin-bottom:var(--space-4);border-bottom:1px solid var(--glass-border);padding-bottom:10px;');
  const tabs=[
    {id:'dashboard',label:'Dashboard',icon:'layout-dashboard'},
    {id:'appearance',label:'Appearance',icon:'palette'},
    {id:'system',label:'System',icon:'settings-2'},
  ];
  tabs.forEach(t=>{
    const btn=el('button','',t.label);
    btn.className='btn btn-glass btn-sm';
    btn.classList.toggle('config-tab',true);
    btn.classList.toggle('active',_configTab===t.id);
    if(_configTab!==t.id)btn.style.opacity='0.7';
    else btn.style.opacity='';
    btn.addEventListener('click',()=>{_configTab=t.id;buildConfigPanel();renderIcons();});
    tabBar.appendChild(btn);
  });
  body.appendChild(tabBar);

  // Call the appropriate sub-panel builder
  if(_configTab==='dashboard')buildDashboardPanel(body);
  else if(_configTab==='appearance')buildAppearancePanel(body);
  else buildSystemPanel(body);

  wrapConfigCards(body);
}

/* ── Dashboard tab: Page + Layout ── */
function buildDashboardPanel(body){
  const brand=config.branding||{};

  body.appendChild(ps('Page'));
  const br=el('div','display:flex;gap:var(--space-2);align-items:flex-start;');
  const tg=el('div','flex:1;');tg.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);','Page Title'));
  const ti=el('input','width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;');
  ti.type='text';ti.value=brand.title||'WarTab';
  ti.addEventListener('change',()=>{if(!config.branding)config.branding={};config.branding.title=ti.value;applyTheme();saveConfig();buildConfigPanel();});
  tg.appendChild(ti);br.appendChild(tg);

  const ig=el('div','flex-shrink:0;');ig.appendChild(el('label','display:block;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);','Icon'));
  const ir2=el('div','display:flex;gap:4px;align-items:center;');
  const ip=el('span','font-size:var(--text-xl);width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);');
  const bi=brand.icon||'sword';
  if(bi.startsWith('http')||bi.startsWith('data:')||bi.startsWith('/')){const img=document.createElement('img');img.src=bi;img.style.cssText='width:22px;height:22px;object-fit:contain;';ip.appendChild(img);}else if(isLucideName(bi)){const li=document.createElement('i');li.setAttribute('data-lucide',bi);li.style.cssText='width:22px;height:22px;';ip.appendChild(li);}else{ip.textContent=bi;ip.className+=' emoji-icon';}
  ir2.appendChild(ip);
  const ib=el('button','','Change');ib.className='btn btn-glass btn-sm';
  ib.addEventListener('click',()=>openIconPicker(url=>{if(!config.branding)config.branding={};config.branding.icon=url;applyTheme();saveConfig();buildConfigPanel();}));
  ir2.appendChild(ib);ig.appendChild(ir2);br.appendChild(ig);body.appendChild(br);

  body.appendChild(ps('Layout'));
  body.appendChild(pf('range','','Columns',null,config.layout.cols,v=>{config.layout.cols=parseInt(v);applyChanges();renderAll();},{min:1,max:6}));
  body.appendChild(pf('range','','Card Gap (px)',null,config.layout.gap,v=>{config.layout.gap=parseInt(v);applyChanges();renderAll();},{min:4,max:40}));
  body.appendChild(pf('range','','Page Width Padding (%)',null,parseInt(config.layout.pageWidthPadding)||2,v=>{config.layout.pageWidthPadding=parseInt(v);applyChanges();renderAll();},{min:0,max:15}));
  body.appendChild(pf('range','','Page Height Padding (%)',null,config.layout.pagePadding||2,v=>{config.layout.pagePadding=parseInt(v);applyChanges();renderAll();},{min:0,max:15}));
}

/* ── Appearance tab: Background + Appearance + Typography ── */
function buildAppearancePanel(body){
  /* Background */
  body.appendChild(ps('Background'));
  const bgType=config.theme.bgType;
  body.appendChild(pf('select','','Type',[{value:'gradient',label:'Gradient'},{value:'solid',label:'Solid'},{value:'image',label:'Image'}],bgType,v=>{config.theme.bgType=v;// Reset bgValue to a default compatible with the new type (was left from old type)
if(v==='gradient'){if(!config.theme.bgValue.includes(','))config.theme.bgValue='#0a0a0a, #1a1a1a';}else if(v==='solid'){var parts=config.theme.bgValue.split(',');config.theme.bgValue=(parts[0]||'#0a0a0a').trim();}else if(v==='image'&&config.theme.bgValue.includes(',')){config.theme.bgValue='#0a0a0a';}applyChanges();renderAll();buildConfigPanel();}));

  if(bgType==='gradient'){
    const parts=config.theme.bgValue.split(',').map(s=>s.trim());
    const c1=parts[0]||'#0a0a0a';
    const c2=parts[1]||'#1a1a1a';
    const gr=el('div','margin-bottom:var(--space-3);');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Gradient Colors'));
    const row=el('div','display:flex;gap:var(--space-2);align-items:center;');
    const p1=document.createElement('input');p1.type='color';p1.value=c1;p1.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p1.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p1);
    const p2=document.createElement('input');p2.type='color';p2.value=c2;p2.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);flex-shrink:0;';
    p2.addEventListener('input',()=>{config.theme.bgValue=p1.value+', '+p2.value;applyChanges();});
    row.appendChild(p2);
    gr.appendChild(row);body.appendChild(gr);
  } else if(bgType==='solid'){
    const gr=el('div','margin-bottom:var(--space-3);');gr.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Color'));
    const p=document.createElement('input');p.type='color';p.value=config.theme.bgValue||'#0a0a0a';p.style.cssText='width:48px;height:34px;padding:2px;cursor:pointer;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';
    p.addEventListener('input',()=>{config.theme.bgValue=p.value;applyChanges();});
    gr.appendChild(p);body.appendChild(gr);
  } else if(bgType==='image'){
    body.appendChild(pf('range','','Image Blur (px)',null,parseInt(config.theme.bgBlur)||0,v=>{config.theme.bgBlur=parseInt(v);applyChanges();},{min:0,max:20}));
    body.appendChild(pf('range','','Image Dim (%)',null,parseInt(config.theme.bgDim)||0,v=>{config.theme.bgDim=parseInt(v);applyChanges();},{min:0,max:100}));
  }

  const bgr=el('div','display:flex;gap:var(--space-2);flex-wrap:wrap;');
  const ub=el('button','','Upload Image');ub.className='btn btn-glass btn-sm';ub.addEventListener('click',()=>openBgUpload());bgr.appendChild(ub);
  if(uploadedFiles.length){const sb=el('button','','Previous Images ('+uploadedFiles.length+')');sb.className='btn btn-glass btn-sm';sb.addEventListener('click',()=>openBgPicker());bgr.appendChild(sb);}
  if(bgType==='image'){
    const setUrlBtn=el('button','','Set URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{buildConfigPanel();});bgr.appendChild(setUrlBtn);
  } else {
    const setUrlBtn=el('button','','Set Image URL');setUrlBtn.className='btn btn-glass btn-sm';
    setUrlBtn.addEventListener('click',()=>{config.theme.bgType='image';applyChanges();saveConfig();buildConfigPanel();});
    bgr.appendChild(setUrlBtn);
  }
  body.appendChild(el('div','margin-bottom:var(--space-3);',null,bgr));
  body.appendChild(chk('Random background on load',config.theme.bgRotate,v=>{config.theme.bgRotate=v;saveConfig();}));

  /* Current Page */
  body.appendChild(ps('Current Page'));
  var _cp = config.pages[config.currentPage];
  if (_cp) {
    body.appendChild(pf('text','','Page Name',null,_cp.name||'Untitled',function(v){_cp.name=v;saveConfig();renderPageNav();}));

    // Icon
    var iconRow=el('div','display:flex;gap:6px;align-items:center;margin-bottom:var(--space-3);');
    iconRow.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);','Icon'));
    var iconPreview=document.createElement('span');
    if (_cp.icon && isLucideName(_cp.icon)) iconPreview.appendChild(renderLucideEl(_cp.icon,''));
    else iconPreview.textContent=_cp.icon||'';
    iconPreview.style.cssText='font-size:var(--text-xl);width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);';
    var changeBtn=el('button','','Change');changeBtn.className='btn btn-glass btn-sm';
    changeBtn.addEventListener('click',function(){openIconPicker(function(url){_cp.icon=url;saveConfig();renderPageNav();buildConfigPanel();});});
    iconRow.appendChild(iconPreview);
    iconRow.appendChild(changeBtn);
    body.appendChild(iconRow);

    // Columns
    body.appendChild(pf('range','','Columns',null,_cp.cols||config.layout.cols,function(v){_cp.cols=parseInt(v);saveConfig();renderAll();},{min:1,max:6}));
  }

  /* Appearance */
  body.appendChild(ps('Appearance'));
  body.appendChild(pf('select','','Card Style',[{value:'dark',label:'Dark'},{value:'light',label:'Light'}],config.theme.cardBg||'dark',v=>{config.theme.cardBg=v;applyChanges();}));
  body.appendChild(pf('range','','Card Transparency',null,Math.round((1-(config.theme.cardOpacity||1))*100),v=>{config.theme.cardOpacity=1-(parseInt(v)/100);applyChanges();},{min:0,max:100}));
  body.appendChild(pf('color','','Accent Color',null,config.theme.glow,v=>{config.theme.glow=v;applyChanges();}));
  body.appendChild(pf('range','','Glass Blur (px)',null,config.theme.blur,v=>{config.theme.blur=parseInt(v);applyChanges();},{min:4,max:40}));
  body.appendChild(chk('Animated transitions',config.theme.animations!==false,v=>{config.theme.animations=v;applyChanges();renderAll();}));
  body.appendChild(chk('Card accent bar',config.theme.showAccentBar!==false,v=>{config.theme.showAccentBar=v;applyChanges();renderAll();}));

  /* Typography */
  body.appendChild(ps('Typography'));
  body.appendChild(pf('color','','Font Color',null,config.theme.fontColor||'#cccccc',v=>{config.theme.fontColor=v;applyChanges();document.body.style.setProperty('--text-primary',hexToRgba(v,0.92));}));
  body.appendChild(pf('range','','Body Text Size',null,config.theme.fontSizeText,v=>{config.theme.fontSizeText=parseInt(v);applyChanges();},{min:10,max:28}));
  body.appendChild(pf('range','','Heading Size',null,config.theme.fontSizeHeading,v=>{config.theme.fontSizeHeading=parseInt(v);applyChanges();},{min:10,max:28}));
  const curFont=config.theme.fontFamily||'Inter';
  const TOP_FONTS = [
    {name:'Inter',sample:'The quick brown fox jumps'},{name:'Space Grotesk',sample:'The quick brown fox jumps'},
    {name:'JetBrains Mono',sample:'console.log(42)'},{name:'Fraunces',sample:'The quick brown fox jumps'},
    {name:'Plus Jakarta Sans',sample:'The quick brown fox jumps'},{name:'DM Sans',sample:'The quick brown fox jumps'},
    {name:'Outfit',sample:'The quick brown fox jumps'},{name:'Sora',sample:'The quick brown fox jumps'},
    {name:'Manrope',sample:'The quick brown fox jumps'},{name:'Rubik',sample:'The quick brown fox jumps'},
    {name:'Nunito',sample:'The quick brown fox jumps'},{name:'Poppins',sample:'The quick brown fox jumps'},
    {name:'Raleway',sample:'The quick brown fox jumps'},{name:'Work Sans',sample:'The quick brown fox jumps'},
    {name:'Montserrat',sample:'The quick brown fox jumps'},{name:'Fira Sans',sample:'The quick brown fox jumps'},
    {name:'Barlow',sample:'The quick brown fox jumps'},{name:'Figtree',sample:'The quick brown fox jumps'},
    {name:'Archivo',sample:'The quick brown fox jumps'},{name:'Chivo',sample:'The quick brown fox jumps'},
    {name:'Epilogue',sample:'The quick brown fox jumps'},{name:'Josefin Sans',sample:'The quick brown fox jumps'},
    {name:'Karla',sample:'The quick brown fox jumps'},{name:'Lexend',sample:'The quick brown fox jumps'},
    {name:'Quicksand',sample:'The quick brown fox jumps'},{name:'Urbanist',sample:'The quick brown fox jumps'},
    {name:'Onest',sample:'The quick brown fox jumps'},{name:'Be Vietnam Pro',sample:'The quick brown fox jumps'},
    {name:'IBM Plex Sans',sample:'The quick brown fox jumps'},{name:'DM Mono',sample:'const x = 1;'},
  ];
  if(!TOP_FONTS.find(f=>f.name===curFont)) TOP_FONTS.push({name:curFont,sample:'The quick brown fox jumps'});
  const fg=document.createElement('div');fg.style.cssText='margin-bottom:var(--space-3);';
  fg.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Font'));
  const fsel=document.createElement('select');
  fsel.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';
  fsel.style.fontFamily=`'${curFont}',sans-serif`;
  TOP_FONTS.forEach(f=>loadGoogleFont(f.name));
  TOP_FONTS.forEach(f=>{
    const o=document.createElement('option');o.value=f.name;
    o.textContent=f.name;o.style.fontFamily=`'${f.name}',sans-serif`;
    o.style.fontSize='15px';
    if(f.name===curFont)o.selected=true;fsel.appendChild(o);
  });
  fsel.addEventListener('change',()=>{config.theme.fontFamily=fsel.value;fsel.style.fontFamily=`'${fsel.value}',sans-serif`;saveConfig();applyTheme();renderAll();});
  fg.appendChild(fsel);body.appendChild(fg);
}

/* ── System tab: Status Bar + Data + Snapshots + API Keys + Credits ── */
function buildSystemPanel(body){
  /* Status Bar */
  body.appendChild(ps('Status Bar'));
  body.appendChild(chk('Show',config.statusBar.enabled,v=>{config.statusBar.enabled=v;saveConfig();applyTheme();initStatusBar();renderAll();_configTab='system';buildConfigPanel();}));
  body.appendChild(pf('select','','Source',[{value:'local',label:'Local (server stats)'},{value:'glances',label:'Glances API'},{value:'custom',label:'Custom URL'}],config.statusBar.source,v=>{config.statusBar.source=v;saveConfig();initStatusBar();_configTab='system';buildConfigPanel();}));
  const gl=el('div','','',pf('text','','Glances URL',null,config.statusBar.glancesUrl,v=>{config.statusBar.glancesUrl=v;saveConfig();initStatusBar();}));
  gl.className='cfg-conditional'+(config.statusBar.source==='glances'?'':' hidden');
  body.appendChild(gl);
  const cu=el('div','','',pf('text','','Custom URL',null,config.statusBar.customUrl||'',v=>{config.statusBar.customUrl=v;saveConfig();initStatusBar();}));
  cu.className='cfg-conditional'+(config.statusBar.source==='custom'?'':' hidden');
  body.appendChild(cu);
  body.appendChild(pf('range','','Refresh (s)',null,config.statusBar.refreshInterval,v=>{config.statusBar.refreshInterval=parseInt(v);saveConfig();initStatusBar();},{min:5,max:120}));
  const itemsRow=document.createElement('div');itemsRow.style.cssText='display:flex;gap:var(--space-2);flex-wrap:wrap;padding:4px 0;';
  ['hostname','cpu','memory','disk','uptime'].forEach(item=>{
    const cl=document.createElement('label');cl.style.cssText='display:flex;align-items:center;gap:4px;font-size:var(--text-sm);cursor:pointer;';
    const cc=document.createElement('input');cc.type='checkbox';cc.checked=(config.statusBar.items||[]).includes(item);
    cc.addEventListener('change',()=>{config.statusBar.items=config.statusBar.items||[];if(cc.checked&&!config.statusBar.items.includes(item))config.statusBar.items.push(item);else if(!cc.checked)config.statusBar.items=config.statusBar.items.filter(i=>i!==item);saveConfig();initStatusBar();});
    cl.appendChild(cc);cl.appendChild(document.createTextNode(item.charAt(0).toUpperCase()+item.slice(1)));itemsRow.appendChild(cl);
  });
  const itemsG=el('div','margin-bottom:var(--space-3);');itemsG.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);','Show items:'));
  itemsG.appendChild(itemsRow);body.appendChild(itemsG);

  /* Data */
  body.appendChild(ps('Data'));
  const acts=el('div','display:flex;gap:var(--space-2);flex-wrap:wrap;');
  ['Export','Import','Reset'].forEach(label=>{
    const b=el('button','',label);b.className='btn btn-glass btn-sm'+(label==='Reset'?' btn-danger':'');
    b.addEventListener('click',()=>{
      if(label==='Export'){const d=new Date();const cfg=cloneObj(config);var stripDataUrls=function(o){if(o&&typeof o==='object'){for(const k in o){if(typeof o[k]==='string'&&o[k].length>200&&o[k].startsWith('data:')){o[k]='[embedded data stripped — use file path instead]';}else{stripDataUrls(o[k]);}}}};stripDataUrls(cfg);const bb=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(bb);a.download='wartab-config-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.json';a.click();URL.revokeObjectURL(a.href);toast('Exported');}
      else if(label==='Import'){$('#import-file-input2').click();}
      else if(label==='Reset'){showConfirmModal('Reset all settings to defaults? This cannot be undone.',()=>{const snap=cloneObj(config);config=cloneObj(DEFAULT_CONFIG);saveConfig();applyTheme();renderAll();_configTab='system';buildConfigPanel();initStatusBar();toastWithUndo('Reset',()=>{config=snap;saveConfig();applyTheme();renderAll();_configTab='system';buildConfigPanel();initStatusBar();});},'Reset');}
    });
    acts.appendChild(b);
  });
  body.appendChild(acts);
  const fi2=document.createElement('input');fi2.type='file';fi2.accept='.json';fi2.style.display='none';fi2.id='import-file-input2';
  fi2.addEventListener('change',e=>{if(e.target.files[0]){const r=new FileReader();r.onload=async ev=>{try{const d=JSON.parse(ev.target.result);var result=sanitizeImportConfig(d);var warnings=result.warnings;var cleaned=result.data;showConfirmModal('Import config from '+e.target.files[0].name+'? This will replace your current configuration.',async()=>{config=deepMerge(cloneObj(DEFAULT_CONFIG),cleaned);try{await storage.saveConfig(cloneObj(config));}catch(e){toast('Import save failed: '+e.message,'error');return;}applyTheme();renderAll();_configTab='system';buildConfigPanel();initStatusBar();if(warnings.length){showModal('Import completed with ' + warnings.length + ' warnings', warnings);}else{toast('Imported');}},'Import');}catch(e){toast('Failed: '+e.message,'error');}};r.readAsText(e.target.files[0]);}});
  body.appendChild(fi2);

  /* Snapshots */
  body.appendChild(ps('Snapshots'));
  const snapHint=el('div','font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-2);','Auto-saved on every config change. Last 20 kept.');
  body.appendChild(snapHint);
  const snapRow=el('div','display:flex;gap:var(--space-2);margin-bottom:var(--space-2);');
  const saveSnapBtn=el('button','','Save Snapshot Now');saveSnapBtn.className='btn btn-glass btn-sm';
  saveSnapBtn.addEventListener('click',async()=>{await storage.snapshots.create();renderSnapshots();});
  snapRow.appendChild(saveSnapBtn);
  const snapList=el('div','display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;');
  snapRow.appendChild(snapList);
  body.appendChild(snapRow);
  function renderSnapshots(){
    snapList.innerHTML='<div style="font-size:var(--text-2xs);color:var(--text-tertiary);padding:4px 0;">Loading...</div>';
    storage.snapshots.list().then(snaps=>{
      snapList.innerHTML='';
      if(!snaps||!snaps.length){snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">No snapshots yet</div>';return;}
      snaps.forEach(s=>{
        const r=el('div','display:flex;gap:var(--space-2);align-items:center;padding:3px 0;');
        const ts=s.name.replace(/_/g,' ').substring(0,15);
        const lbl=el('span','flex:1;font-size:var(--text-xs);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',ts);
        const sz=el('span','font-size:var(--text-2xs);color:var(--text-tertiary);flex-shrink:0;',fmtSize(s.size));
        const rst=el('button','','Restore');rst.className='btn btn-glass btn-sm';rst.style.cssText='padding:2px 8px;font-size:var(--text-2xs);';
        rst.addEventListener('click',()=>{showConfirmModal('Restore snapshot from '+ts+'? Current config will be replaced.',async()=>{try{await storage.snapshots.restore(s.name);await loadConfig();applyTheme();renderAll();_configTab='system';buildConfigPanel();initStatusBar();toast('Restored: '+ts);}catch(e){toast('Restore failed: '+e.message,'error');}}, 'Restore')});
        const del=el('button','','✕');del.className='btn btn-glass btn-sm';del.style.cssText='padding:2px 7px;font-size:var(--text-2xs);color:#cc6666;border-color:rgba(200,80,80,0.3);';
        del.addEventListener('click',()=>{showConfirmModal('Delete snapshot from '+ts+'?',async()=>{try{await storage.snapshots.delete(s.name);renderSnapshots();toast('Deleted: '+ts);}catch(e){toast('Delete failed: '+e.message,'error');}},'Delete')});
        r.appendChild(lbl);r.appendChild(sz);r.appendChild(rst);r.appendChild(del);
        snapList.appendChild(r);
      });
    }).catch(()=>{snapList.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);padding:4px 0;">Server snapshots unavailable</div>';});
  }
  renderSnapshots();
  body.appendChild(snapList);

  /* API Keys */
  body.appendChild(ps('API Keys'));
  const apibox=el('div','font-size:var(--text-sm);line-height:1.7;padding:0 0 8px;');
  apibox.innerHTML='<div style="margin-bottom:var(--space-3);color:var(--text-secondary);">Some modules need a free API key. Get yours here:</div>'+
    '<div style="display:flex;flex-direction:column;gap:var(--space-2);">'+
    '<div style="display:flex;gap:var(--space-2);align-items:flex-start;padding:8px 10px;background:rgba(0,0,0,0.2);"><span style="font-size:16px;">🌤</span><div><div style="font-weight:600;font-size:var(--text-sm);">Weather (OpenWeatherMap)</div><div style="font-size:var(--text-2xs);color:var(--text-tertiary);">Free tier, 60 calls/min. Sign up at <a href="https://openweathermap.org/api" target="_blank" style="color:var(--accent);">openweathermap.org/api</a></div></div></div>'+
    '</div>';
  body.appendChild(apibox);

  /* Credits */
  body.appendChild(ps('Credits'));
  const cbox=el('div','font-size:var(--text-xs);line-height:1.7;padding:0 0 8px;color:var(--text-secondary);');
  cbox.innerHTML='<div style="display:flex;flex-direction:column;gap:var(--space-2);">'+
    '<div style="display:flex;gap:var(--space-2);align-items:center;"><span style="font-size:14px;">📦</span><span>Service icons by <a href="https://selfh.st/icons/" target="_blank" style="color:var(--accent);">selfh.st/icons</a></span></div>'+
    '<div style="display:flex;gap:var(--space-2);align-items:center;"><span style="font-size:14px;">🎯</span><span>UI icons by <a href="https://lucide.dev/" target="_blank" style="color:var(--accent);">Lucide</a> (ISC License)</span></div>'+
    '</div>';
  body.appendChild(cbox);
  body.appendChild(fi2);
}
/* Wrap config panel sections in card containers */
function wrapConfigCards(body) {
  const sections = []; let cur = null;
  Array.from(body.children).forEach(function(el) {
    const h3 = el.querySelector('h3');
    if (h3 && !el.querySelector('input,select,button')) {
      if (cur) sections.push(cur);
      cur = { header: el, fields: [] };
    } else if (cur) {
      cur.fields.push(el);
    }
  });
  if (cur) sections.push(cur);
  sections.forEach(function(s) {
    const wrap = document.createElement('div');
    wrap.className = 'cs-panel cp-config-card';
    s.header.parentNode.insertBefore(wrap, s.header);
    wrap.appendChild(s.header);
    s.fields.forEach(function(f) { wrap.appendChild(f); });
  });
}

function bgValueRow(body){
  // Show text field for image URL
  const g=el('div','margin-bottom:var(--space-3);');g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:3px;','Image URL'));
  const i=document.createElement('input');i.type='text';i.value=config.theme.bgValue;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
  i.placeholder='Paste image URL or upload above...';
  i.addEventListener('change',()=>{config.theme.bgValue=i.value;applyChanges();saveConfig();});
  g.appendChild(i);body.appendChild(g);
}

function el(tag,style,text,children){
  const e=document.createElement(tag);
  if(style)e.style.cssText=style;
  if(text!==undefined&&text!==null)e.textContent=text;
  if(children)e.appendChild(children);
  return e;
}

function chk(label,value,onChange){
  const w=el('div','display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);');
  const c=document.createElement('input');c.type='checkbox';c.checked=!!value;
  c.addEventListener('change',()=>onChange(c.checked));
  w.appendChild(c);w.appendChild(el('span','font-size:var(--text-base);',label));
  return w;
}


function ps(t){return el('div','','',el('h3','font-size:var(--text-sm);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);margin-bottom:var(--space-3);margin-top:var(--space-3);padding-bottom:4px;border-bottom:1px solid var(--glass-border);font-family:var(--font);',t));}
function pf(type,key,label,options,value,onChange,attrs){const g=el('div','margin-bottom:var(--space-3);');
  if(type==='select'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);',label));const s=document.createElement('select');s.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;cursor:pointer;';(options||[]).forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;if(o.value===value)opt.selected=true;s.appendChild(opt);});s.addEventListener('change',()=>onChange(s.value));g.appendChild(s);}
  else if(type==='range'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);',label));const r=el('div','display:flex;align-items:center;gap:var(--space-2);');const i=document.createElement('input');i.type='range';i.min=attrs.min||0;i.max=attrs.max||100;i.value=value;i.style.cssText='flex:1;accent-color:var(--accent);';const s=el('span','font-size:var(--text-sm);color:var(--text-secondary);min-width:30px;',String(value));i.addEventListener('input',()=>s.textContent=i.value);i.addEventListener('pointerup',()=>onChange(i.value));r.appendChild(i);r.appendChild(s);g.appendChild(r);}
  else if(type==='color'){g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);',label));const r=el('div','display:flex;gap:var(--space-2);align-items:center;');const i=document.createElement('input');i.type='color';i.value=value;i.style.cssText='width:40px;height:34px;padding:2px;cursor:pointer;flex-shrink:0;border:1px solid var(--surface-border);background:rgba(0,0,0,0.3);';const t=document.createElement('input');t.type='text';t.value=value;t.style.cssText='flex:1;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';const sync=v=>{i.value=v;t.value=v;onChange(v);};i.addEventListener('input',()=>sync(i.value));t.addEventListener('change',()=>sync(t.value));r.appendChild(i);r.appendChild(t);g.appendChild(r);}
  else{g.appendChild(el('label','display:block;font-size:var(--text-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--space-1);',label));const i=document.createElement('input');i.type='text';i.value=value;i.style.cssText='width:100%;padding:7px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';i.addEventListener('change',()=>onChange(i.value));g.appendChild(i);}
  return g;
}
