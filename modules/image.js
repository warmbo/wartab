registerModule('image', {
  defaults: { url:'', alt:'' },
  render: (sec,card,cw)=>{
    cw.style.cssText='flex:1;display:flex;flex-direction:column;';
    const w=document.createElement('div');w.style.cssText='flex:1;display:flex;flex-direction:column;padding:4px 0;';
    if(!sec.url){w.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:20px;">No image selected. Edit to add one.</div>';}
    else{
      const img=document.createElement('img');img.src=sec.url;img.alt=sec.alt||'';
      img.style.cssText='max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto;';
      img.onerror=function(){this.style.display='none';this.parentNode.innerHTML='<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-align:center;padding:20px;">Image failed to load</div>';};
      w.appendChild(img);
    }
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Image URL'));
    bd.appendChild(cpInput('Paste URL or /uploads/...',sec.url||'',v=>{sec.url=v;saveAndRefresh();}));

    // Upload button + preview of existing uploads
    const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:8px;';
    const upBtn=document.createElement('button');upBtn.className='btn btn-glass btn-sm';upBtn.textContent='Upload Image';
    row.appendChild(upBtn);
    var pickBtn;
    bd.appendChild(row);
    bd.appendChild(cpHint('Or click Upload, then pick from your uploaded images below.'));

    // File input (hidden)
    const fi=document.createElement('input');fi.type='file';
    fi.accept='image/png,image/jpeg,image/webp,image/gif';
    fi.style.display='none';bd.appendChild(fi);

    // Gallery of uploaded images
    const gal=document.createElement('div');
    gal.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px;max-height:200px;overflow-y:auto;';
    bd.appendChild(gal);

    function loadGallery(){
      gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-2xs);color:var(--text-tertiary);text-align:center;padding:8px;">Loading...</div>';
      (typeof storage!=='undefined'?storage.listUploads():Promise.resolve([])).then(function(files){
        gal.innerHTML='';
        if(!files||!files.length){
          gal.innerHTML='<div style="grid-column:1/-1;font-size:var(--text-2xs);color:var(--text-tertiary);text-align:center;padding:8px;">No uploaded images yet.</div>';
          return;
        }
        files.forEach(function(f){
          const c=document.createElement('div');c.style.cssText='cursor:pointer;border:1px solid var(--surface-border);padding:2px;background:rgba(0,0,0,0.1);';
          const i=document.createElement('img');i.src=f.url;i.style.cssText='width:100%;height:48px;object-fit:cover;display:block;';
          i.loading='lazy';
          c.title=f.name+' ('+Math.round(f.size/1024)+'KB)';
          c.appendChild(i);
          c.addEventListener('click',function(){
            sec.url=f.url;saveAndRefresh();
          });
          gal.appendChild(c);
        });
      }).catch(function(){gal.innerHTML='<div style="grid-column:1/-1;color:var(--text-tertiary);text-align:center;">Could not load uploads.</div>';});
    }

    upBtn.addEventListener('click',function(e){e.stopPropagation();fi.click();});
    fi.addEventListener('change',function(e){
      const file=e.target.files[0];if(!file)return;
      upBtn.textContent='Uploading...';upBtn.disabled=true;
      (typeof storage!=='undefined'?storage.uploadFile(file,file.name):Promise.resolve({error:'storage not available'})).then(function(result){
        upBtn.textContent='Upload Image';upBtn.disabled=false;
        if(result&&!result.error){
          sec.url=result.url;saveAndRefresh();
          setTimeout(loadGallery,500);
        }else{
          toast('Upload failed: '+(result&&result.error?result.error:'Unknown'),'error');
        }
      }).catch(function(err){
        upBtn.textContent='Upload Image';upBtn.disabled=false;
        toast('Upload error: '+err.message,'error');
      });
      fi.value='';
    });

    loadGallery();

    bd.appendChild(cpLabel('Alt text'));
    bd.appendChild(cpInput('Description',sec.alt||'',v=>{sec.alt=v;saveAndRefresh();}));
  },
});
