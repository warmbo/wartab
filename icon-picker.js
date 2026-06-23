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
        const d=document.createElement('div');d.className='icon-grid-item';
        const img=document.createElement('img');img.src=ic.url;img.alt=ic.name;img.style.cssText='width:32px;height:32px;object-fit:contain;';
        const del=document.createElement('button');del.textContent='×';del.style.cssText='position:absolute;top:0;right:0;background:rgba(0,0,0,0.6);color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;padding:1px 4px;';
        del.addEventListener('click',function(e){e.stopPropagation();storage.deleteIcon(ic.url).then(function(){loadGal();}).catch(function(){loadGal();});});
        d.style.position='relative';d.appendChild(img);d.appendChild(del);d.addEventListener('click',function(){selectIcon(ic.url);});
        gal.appendChild(d);
      });
    }).catch(function(){gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:12px;">Failed to load icons.</div>';});
  };
  c.appendChild(gal);loadGal();
}
function buildIconsTab(c){
  c.innerHTML='';
  const sr=document.createElement('input');sr.className='icon-search-bar';sr.placeholder='Search icons...';c.appendChild(sr);
  const gc=document.createElement('div');gc.className='icon-grid';c.appendChild(gc);
  const em=document.createElement('div');em.style.cssText='margin-top:16px;font-size:var(--text-xs);color:var(--text-tertiary);';em.textContent='Emoji';c.appendChild(em);
  const eg=document.createElement('div');eg.className='icon-grid';c.appendChild(eg);
  const allIcons=Object.keys(lucide.icons||{});
  function ri2(f){
    const fl=(f||'').toLowerCase();
    const match=fl?allIcons.filter(function(n){return n.toLowerCase().includes(fl);}):[];
    gc.innerHTML='';
    const visible=match.length?match:allIcons.slice(0,300);
    visible.forEach(function(n){
      const d=document.createElement('div');d.className='icon-grid-item';
      d.innerHTML='<i data-lucide="'+n[0].toLowerCase()+n.slice(1)+'"></i>';d.title=n;
      d.addEventListener('click',function(){selectIcon(n[0].toLowerCase()+n.slice(1));});
      gc.appendChild(d);
    });
    if(!visible.length)gc.innerHTML='<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-tertiary);">No icons match "'+f+'"</div>';
    renderIcons();
    const emojiMatch=fl?EMOJIS.filter(function(e){return e[0].toLowerCase().includes(fl)||e[1].toLowerCase().includes(fl);}):EMOJIS;
    eg.innerHTML='';
    emojiMatch.slice(0,200).forEach(function(e){
      const d=document.createElement('div');d.className='icon-grid-item';
      d.innerHTML='<span class="emoji-icon">'+e[0]+'</span>';d.title=e[1];
      d.addEventListener('click',function(){selectIcon(e[0]);});
      eg.appendChild(d);
    });
    eg.style.display=emojiMatch.length?'':'none';
  }
  sr.addEventListener('input',function(){ri2(sr.value);});ri2('');
}
function buildUrlTab(c){
  c.innerHTML='';
  const w=document.createElement('div');w.style.cssText='padding:20px;display:flex;flex-direction:column;gap:12px;';
  const l=document.createElement('label');l.textContent='Icon URL:';l.style.cssText='font-size:var(--text-sm);color:var(--text-secondary);';
  const inp=document.createElement('input');inp.type='url';inp.placeholder='https://example.com/icon.svg';inp.style.cssText='width:100%;padding:8px 10px;background:rgba(0,0,0,0.3);border:1px solid var(--surface-border);color:var(--text-primary);font-size:var(--text-base);outline:none;';
  const btn=document.createElement('button');btn.className='btn btn-glass';btn.textContent='Use This URL';btn.style.cssText='align-self:flex-end;padding:8px 16px;';
  btn.addEventListener('click',function(){if(inp.value.trim())selectIcon(inp.value.trim());});
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')btn.click();});
  w.appendChild(l);w.appendChild(inp);w.appendChild(btn);c.appendChild(w);
}
