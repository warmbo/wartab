/* ═══════════════════════════════════════════
   WarTab — Icon Picker
   ═══════════════════════════════════════════ */
/* Depends on: app.js (config, $, $$, ICON_REPO, ICON_CDN, EMOJIS, LUCIDE_ICONS, renderIcons, toast, storage) */
/* State: iconPickerOpen (let) — declared in app.js */

function openIconPicker(cb){iconPickerCallback=cb;iconPickerOpen=true;$('#icon-picker-overlay').classList.add('open');$('#icon-picker').classList.add('open');buildIconPicker('icons');}
function closeIconPicker(){iconPickerOpen=false;iconPickerCallback=null;$('#icon-picker-overlay').classList.remove('open');$('#icon-picker').classList.remove('open');}
function buildIconPicker(t){const c=$('#icon-picker-content');c.innerHTML='';$$('.ip-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));if(t==='library')buildLibraryTab(c);else if(t==='upload')buildUploadTab(c);else if(t==='icons')buildIconsTab(c);else if(t==='url')buildUrlTab(c);}
function buildLibraryTab(c){const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search services...';c.appendChild(s);const g=document.createElement('div');g.className='icon-grid';c.appendChild(g);let _riTimer=null;function ri(f){g.innerHTML='';const fl=(f||'').toLowerCase();if(!ICON_REPO.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">Loading service icons...</div>';loadIconRepo();if(!_riTimer)_riTimer=setInterval(function(){if(ICON_REPO.length){clearInterval(_riTimer);_riTimer=null;ri(s.value);}else{loadIconRepo();}},300);return;}if(_riTimer){clearInterval(_riTimer);_riTimer=null;}const items=fl?ICON_REPO.filter(i=>i.name.toLowerCase().includes(fl)||i.file.toLowerCase().includes(fl)||i.tags.some(t=>t.includes(fl))):ICON_REPO;items.slice(0,120).forEach(item=>{const d=document.createElement('div');d.className='icon-grid-item';const img=document.createElement('img');img.src=`${ICON_CDN}/${item.file}.svg`;img.alt=item.name;img.onerror=function(){this.parentElement.style.display='none';};const l=document.createElement('span');l.textContent=item.name;d.appendChild(img);d.appendChild(l);d.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${item.file}.svg`));g.appendChild(d);});if(!items.length)g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';}s.addEventListener('input',()=>ri(s.value));ri('');}
function buildUploadTab(c){
  c.innerHTML='';
  const z=document.createElement('div');z.className='upload-zone';
  z.innerHTML='<div style="font-size:var(--text-3xl);">📁</div><p>Click to upload an icon (48x48 resized)</p>';c.appendChild(z);
  const fi=document.createElement('input');fi.type='file';
  fi.accept='image/png,image/svg+xml,image/webp,image/jpeg,image/gif';fi.style.display='none';
  fi.addEventListener('change',function(e){
    const file=e.target.files[0];if(!file)return;
    z.innerHTML='<div style="padding:20px;color:var(--text-secondary);">Uploading...</div>';
    storage.uploadIcon(file,file.name).then(function(result){
      if(result&&!result.error){
        selectIcon(result.url);
      }else{
        toast('Upload failed: '+(result&&result.error?result.error:'Unknown'),'error');
        buildUploadTab(c);
      }
    }).catch(function(err){
      toast('Upload error: '+err.message,'error');
      buildUploadTab(c);
    });
  });c.appendChild(fi);
  z.addEventListener('click',function(){fi.click();});
  const gal=document.createElement('div');gal.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;';
  const loadGal=function(){
    gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:12px;">Loading...</div>';
    storage.listIcons().then(function(icons){
      gal.innerHTML='';
      if(!icons||!icons.length){
        gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:12px;">No uploaded icons yet.</div>';
        return;
      }
      icons.forEach(function(ic){
        const card=document.createElement('div');card.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid var(--surface-border);cursor:pointer;background:rgba(0,0,0,0.1);position:relative;';
        const img=document.createElement('img');img.src=ic.url;img.style.cssText='width:48px;height:48px;object-fit:contain;display:block;';
        card.title=ic.name;
        card.addEventListener('click',function(){selectIcon(ic.url);});
        const del=document.createElement('button');del.textContent='X';
        del.style.cssText='position:absolute;top:2px;right:2px;padding:0 3px;font-size:10px;background:rgba(0,0,0,0.6);border:1px solid var(--surface-border);color:var(--color-error);cursor:pointer;line-height:1.4;';
        del.addEventListener('click',function(e){e.stopPropagation();
          storage.deleteIcon(ic.url).then(function(){loadGal();toast('Icon deleted');}).catch(function(){toast('Delete failed','error');});
        });
        card.appendChild(img);card.appendChild(del);gal.appendChild(card);
      });
    }).catch(function(){gal.innerHTML='<div style="grid-column:1/-1;color:var(--text-tertiary);text-align:center;padding:12px;">Could not load icons.</div>';});
  };
  loadGal();
  c.appendChild(gal);
}
function buildIconsTab(c){
  const s=document.createElement('input');s.className='icon-search-bar';s.placeholder='Search icons...';c.appendChild(s);
  const etab=document.createElement('div');etab.style.cssText='display:flex;gap:4px;margin-bottom:8px;';
  const btnSvg=document.createElement('button');btnSvg.className='btn btn-glass btn-sm';btnSvg.textContent='SVG Icons';btnSvg.style.cssText='flex:1;';
  const btnEmoji=document.createElement('button');btnEmoji.className='btn btn-glass btn-sm';btnEmoji.textContent='Emoji';btnEmoji.style.cssText='flex:1;';
  etab.appendChild(btnSvg);etab.appendChild(btnEmoji);c.appendChild(etab);
  const g=document.createElement('div');g.className='icon-grid';g.style.gridTemplateColumns='repeat(auto-fill,minmax(42px,1fr))';c.appendChild(g);
  var _mode='svg';
  function getAllLucideIcons(){
    if(typeof lucide!=='undefined'&&lucide.icons)return Object.keys(lucide.icons).sort();
    return LUCIDE_ICONS;
  }
  function ri(f){
    g.innerHTML='';const fl=(f||'').toLowerCase();
    if(_mode==='svg'){
      var allIcons=getAllLucideIcons();
      var items=fl?allIcons.filter(function(n){return n.toLowerCase().includes(fl);}):allIcons;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No icons found</div>';return;}
      var batchSize=120;
      var idx=0;
      function renderBatch(){
        var end=Math.min(idx+batchSize,items.length);
        for(;idx<end;idx++){
          var name=items[idx];
          var d=document.createElement('div');d.className='icon-grid-item';d.style.cssText='padding:6px;';
          var i=document.createElement('i');i.setAttribute('data-lucide',name);i.style.cssText='width:28px;height:28px;';
          d.appendChild(i);
          d.addEventListener('click',function(n){return function(){selectIcon(n);};}(name));g.appendChild(d);
        }
        if(idx<items.length)requestAnimationFrame(renderBatch);
        else setTimeout(renderIcons,50);
      }
      requestAnimationFrame(renderBatch);
    }else{
      var items=fl?EMOJIS.filter(function(e){return e.includes(fl);}):EMOJIS;
      if(!items.length){g.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);font-size:var(--text-base);">No emoji found</div>';return;}
      items.forEach(function(emo){var d=document.createElement('div');d.className='icon-grid-item';d.innerHTML='<span class="ip-emoji">'+emo+'</span>';d.addEventListener('click',function(){selectIcon(emo);});g.appendChild(d);});
    }
  }
  function setMode(m){_mode=m;btnSvg.style.borderColor=m==='svg'?'var(--accent)':'var(--surface-border)';btnEmoji.style.borderColor=m==='emoji'?'var(--accent)':'var(--surface-border)';ri(s.value);}
  btnSvg.addEventListener('click',function(){setMode('svg');});btnEmoji.addEventListener('click',function(){setMode('emoji');});
  s.addEventListener('input',function(){ri(s.value);});setMode('svg');
}
function buildUrlTab(c){c.innerHTML='<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:6px;">Enter a direct URL:</div><input class="icon-search-bar" id="icon-url-input" placeholder="https://example.com/icon.png"><button class="btn btn-glass btn-sm" id="icon-url-btn">Use</button><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;" id="icon-url-examples"></div>';const inp=$('#icon-url-input');['jellyfin','plex','homeassistant','portainer','pihole','grafana','sonarr','radarr'].forEach(n=>{const tag=document.createElement('button');tag.className='btn btn-glass btn-sm';tag.style.fontSize='10px';tag.textContent=n;tag.addEventListener('click',()=>selectIcon(`${ICON_CDN}/${n}.png`));$('#icon-url-examples').appendChild(tag);});inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&inp.value.trim())selectIcon(inp.value.trim());});$('#icon-url-btn').addEventListener('click',()=>{if(inp.value.trim())selectIcon(inp.value.trim());});}
function selectIcon(u){if(iconPickerCallback)iconPickerCallback(u);closeIconPicker();}
