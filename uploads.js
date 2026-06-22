/* ═══════════════════════════════════════════
   WarTab — Background Upload
   ═══════════════════════════════════════════ */
/* Depends on: app.js (config, $, toast, storage, uploadedFiles, openBgPicker) */

function openBgUpload() {
  const hi=document.createElement('input');hi.type='file';hi.accept='image/*';hi.style.display='none';
  hi.addEventListener('change',function(e){
    const file=e.target.files[0];if(!file)return;
    compressImage(file,1920,1080,0.8).then(function(blob){
      storage.uploadFile(blob, file.name).then(function(result){
        if(result.url){
          config.theme.bgType='image';config.theme.bgValue=result.url;
          applyTheme();saveConfig();renderAll();
          toast('Uploaded');
        }else{toast('Upload failed','error');}
      }).catch(function(){toast('Upload error','error');});
    }).catch(function(){toast('Image processing failed','error');});
  });
  hi.click();
}

function compressImage(file, maxW, maxH, quality) {
  return new Promise(function(resolve, reject){
    if(file.type==='image/svg+xml'||file.type==='image/gif'){
      resolve(file);return;
    }
    const img=new Image();
    img.onload=function(){
      let w=img.width,h=img.height;
      if(w>maxW){h*=maxW/w;w=maxW;}
      if(h>maxH){w*=maxH/h;h=maxH;}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      const ctx=c.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      c.toBlob(function(blob){
        if(blob)resolve(blob);
        else reject(new Error('Compression failed'));
      },'image/jpeg',quality);
    };
    img.onerror=function(){reject(new Error('Image load failed'));};
    const url=URL.createObjectURL(file);
    img.src=url;
  });
}

function fmtSize(bytes) {
  if(bytes>=1073741824)return(bytes/1073741824).toFixed(1)+' GB';
  if(bytes>=1048576)return(bytes/1048576).toFixed(1)+' MB';
  if(bytes>=1024)return(bytes/1024).toFixed(1)+' KB';
  return bytes+' B';
}

async function fetchUploads() {
  try {
    uploadedFiles = await storage.listUploads();
  } catch(e) { /* server might not be available */ }
}

async function deleteUpload(url) {
  const name = url.split('/').pop();
  if (!name) return;
  try {
    const result = await storage.deleteFile(url);
    if (result && result.status === 'deleted') {
      uploadedFiles = uploadedFiles.filter(f => f.url !== url);
      toast('Deleted');
      if (config.theme.bgType === 'image' && config.theme.bgValue === url) {
        config.theme.bgType = 'gradient';
        config.theme.bgValue = DEFAULT_CONFIG.theme.bgValue;
        applyChanges(); saveConfig();
      }
      buildConfigPanel();
    } else {
      toast('Delete failed', 'error');
    }
  } catch(err) {
    toast('Delete error: ' + err.message, 'error');
  }
}

function openBgPicker() {
  // Refresh uploaded files list from server
  fetchUploads().then(function() {
  $('#bg-picker-content').innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:8px 0;"></div>';
  const g=$('#bg-picker-content>div');
  if(!uploadedFiles.length){g.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-tertiary);">No uploaded images</div>';}
  uploadedFiles.forEach(function(f){
    const c=document.createElement('div');c.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;position:relative;';
    const img=document.createElement('img');img.src=f.url;img.style.cssText='width:80px;height:56px;object-fit:cover;border:1px solid var(--surface-border);display:block;';
    c.addEventListener('click',function(){config.theme.bgType='image';config.theme.bgValue=f.url;applyTheme();saveConfig();renderAll();$('#bg-picker-overlay').classList.remove('open');$('#bg-picker').classList.remove('open');toast('Background set');});
    // Delete button
    const del=document.createElement('button');del.textContent='✕';
    del.style.cssText='position:absolute;top:0;right:0;padding:0 4px;font-size:11px;background:#000;border:1px solid rgba(255,80,80,0.5);color:#ff4444;cursor:pointer;line-height:1.4;font-weight:700;';
    del.addEventListener('click',function(e){
      e.stopPropagation();
      storage.deleteFile(f.url).then(function(){
        uploadedFiles=uploadedFiles.filter(function(u){return u.url!==f.url;});
        // If this was the active background, reset to default
        if(config.theme.bgType==='image'&&config.theme.bgValue===f.url){
          config.theme.bgType='gradient';config.theme.bgValue=DEFAULT_CONFIG.theme.bgValue;
          applyTheme();saveConfig();
        }
        openBgPicker();
        toast('Deleted');
      }).catch(function(){toast('Delete failed','error');});
    });
    c.appendChild(img);c.appendChild(del);
    // Label
    const lb=document.createElement('span');lb.style.cssText='font-size:var(--text-2xs);color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;max-width:80px;white-space:nowrap;text-align:center;';lb.textContent=f.name||'';
    c.appendChild(lb);
    g.appendChild(c);
  });
  $('#bg-picker-overlay').classList.add('open');$('#bg-picker').classList.add('open');
  });
}