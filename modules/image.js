registerModule('image', {
  defaults: { url:'', alt:'' },
  render: (sec,card,cw)=>{
    cw.style.flex='1';cw.style.display='flex';cw.style.flexDirection='column';cw.style.width='100%';
    const w=document.createElement('div');w.className='image-widget';w.style.cssText='flex:1;min-width:0;padding:4px 0;';
    if(!sec.url){w.appendChild(ds.empty('image','No image selected','Choose an uploaded image or enter an image URL.',{label:'Choose image',onClick:()=>openCardEditPanel(card.id)}));}
    else{
      function loadImage(){
        const img=document.createElement('img');img.src=sec.url;img.alt=sec.alt||'';img.loading='lazy';img.decoding='async';
        img.style.cssText='max-width:100%;max-height:100%;object-fit:contain;display:inline-block;';
        img.onerror=function(){w.replaceChildren(ds.error('Image unavailable','Check the image URL or try loading it again.',{label:'Retry',onClick:loadImage}));};
        w.replaceChildren(img);
      }
      loadImage();
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
          const c=document.createElement('div');c.style.cssText='cursor:pointer;border:1px solid var(--surface-border);padding:2px;background:rgba(0,0,0,0.1);';c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label','Use '+f.name);
          const i=document.createElement('img');i.src=f.url;i.style.cssText='width:100%;height:48px;object-fit:cover;display:block;';
          i.loading='lazy';
          c.title=f.name+' ('+Math.round(f.size/1024)+'KB)';
          c.appendChild(i);
          c.addEventListener('click',function(){
            sec.url=f.url;saveAndRefresh();
          });
          c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}});
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
