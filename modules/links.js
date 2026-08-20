registerModule('links', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}], listMode:false },
  css: `
    .ctx-menu{position:fixed;z-index:calc(var(--z-modal,200)+20);min-width:180px;background:var(--card-bg,rgba(20,20,20,0.95));border:1px solid var(--glass-border,rgba(255,255,255,0.12));border-radius:var(--radius,12px);box-shadow:0 12px 40px rgba(0,0,0,0.45);padding:4px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);font-family:var(--font);}
    .ctx-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;background:transparent;border:none;border-radius:8px;color:var(--text-primary,#eee);font-size:13px;cursor:pointer;text-align:left;}
    .ctx-item:hover{background:var(--accent-glass,rgba(255,255,255,0.1));}
    .ctx-item i{width:16px;height:16px;opacity:0.8;}
    .ctx-sep{height:1px;background:var(--glass-border,rgba(255,255,255,0.08));margin:4px 6px;}
    .ctx-item.danger{color:var(--color-error,#ff6b6b);}
    [data-card-bg="light"] .ctx-menu{background:rgba(255,255,255,0.97);color:#111;}
  `,
  render: (sec,card,cw)=>{
    const bindCtx=(a,link,idx)=>{
      a.addEventListener('click',()=>recordLinkUsage(link));
      a.addEventListener('contextmenu',(ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        showLinkContextMenu(ev.clientX,ev.clientY,link,()=>{
          // On edit: open this card's edit panel (module editor) — reopen panel
          openCardEditPanel(card.id);
        },()=>{
          // On delete: remove the link and persist
          if(sec.links && sec.links.length>1){sec.links.splice(idx,1);}
          else {sec.links=[];}
          saveConfig();renderAll();
        });
      });
    };
    if(sec.listMode){
      // ── List view (single-column rows) ──
      const lst=document.createElement('div');lst.className='link-list';
      (sec.links||[]).forEach((link,idx)=>{
        const a=document.createElement('a');a.className='link-row';a.href=link.url;a.target='_blank';a.rel='noopener';
        a.appendChild(renderLinkIcon(link.icon));a.appendChild(document.createTextNode(' '+link.label));
        bindCtx(a,link,idx);
        lst.appendChild(a);
      });cw.appendChild(lst);shrinkLabels(cw);
    }else{
      // ── Grid view (button cards) ──
      const ig=document.createElement('div');ig.className='link-grid';(sec.links||[]).forEach((link,idx)=>{
        const a=document.createElement('a');a.className='link-item';a.href=link.url;a.target='_blank';a.rel='noopener';
        a.appendChild(renderLinkIcon(link.icon));var s=document.createElement('span');s.className='link-label';s.textContent=link.label;
        a.appendChild(s);bindCtx(a,link,idx);ig.appendChild(a);
      });cw.appendChild(ig);shrinkLabels(cw);
    }
  },
  editor: (sec,card,bd)=>{
    // Display mode toggle
    const modeG=document.createElement('div');modeG.className='me-check-group';
    modeG.appendChild(cpCheck('List view (instead of buttons)',!!sec.listMode,v=>{sec.listMode=v;saveAndRefresh();}));
    bd.appendChild(modeG);
    // Link list editor
    const header=document.createElement('div');header.className='me-link-th';
    header.innerHTML='<span class="mh-grab"></span><span class="mh-label">Label</span><span class="mh-icon">Icon</span><span class="mh-url">URL</span><span class="mh-remove"></span>';
    bd.appendChild(header);
    const container=document.createElement('div');container.style.cssText='position:relative;';
    (sec.links||[]).forEach((link,li2)=>{
      const row=document.createElement('div');row.className='me-link-tr';row.dataset.linkIdx=li2;
      const gh=document.createElement('span');gh.className='me-link-grab';gh.textContent='⠿';gh.title='Drag to reorder';
      gh.addEventListener('pointerdown',(e)=>startLinkDrag(e,row,sec,li2));
      const li2_i=document.createElement('input');li2_i.className='cp-input';li2_i.placeholder='Label';li2_i.value=link.label;
      li2_i.addEventListener('change',()=>{sec.links[li2].label=li2_i.value;saveAndRefresh();});
      const ic=document.createElement('button');ic.className='me-icon-btn';
      if(link.icon&&(link.icon.startsWith('http')||link.icon.startsWith('data:')||link.icon.startsWith('/'))){const img=document.createElement('img');img.src=link.icon;img.alt='';ic.appendChild(img);}else if(isLucideName(link.icon)){const li=document.createElement('i');li.setAttribute('data-lucide',link.icon);ic.appendChild(li);}else{ic.textContent=link.icon||'🔗';}
      ic.title='Change icon';ic.addEventListener('click',()=>openIconPicker(url=>{sec.links[li2].icon=url;ic.innerHTML='';if(url.startsWith('http')||url.startsWith('data:')||url.startsWith('/')){const img=document.createElement('img');img.src=url;img.alt='';ic.appendChild(img);}else if(isLucideName(url)){const li=document.createElement('i');li.setAttribute('data-lucide',url);ic.appendChild(li);renderIcons();}else{ic.textContent=url||'🔗';}saveAndRefresh();}));
      const ui=document.createElement('input');ui.className='cp-input';ui.placeholder='https://';ui.value=link.url;
      ui.addEventListener('change',()=>{sec.links[li2].url=ui.value;saveAndRefresh();});
      const rm = cpBtn('✕', true); rm.title = '';
      rm.addEventListener('click',()=>{sec.links.splice(li2,1);saveAndRefreshStructural();});
      row.appendChild(gh);row.appendChild(li2_i);row.appendChild(ic);row.appendChild(ui);row.appendChild(rm);
      container.appendChild(row);
    });
    bd.appendChild(container);
    const al=document.createElement('button');al.className='me-link-add';al.textContent='+ Add Link';
    al.addEventListener('click',()=>{sec.links=sec.links||[];sec.links.push({label:'New',url:'https://',icon:'link'});saveAndRefreshStructural();});
    bd.appendChild(al);
    // Batch add
    var batchBtn = document.createElement('button');
    batchBtn.className = 'me-link-add';
    batchBtn.textContent = '+ Batch Add';
    batchBtn.style.cssText = 'margin-left:6px;';
    var batchArea = null;
    batchBtn.addEventListener('click', function() {
      if (batchArea) { batchArea.remove(); batchArea = null; batchBtn.textContent = '+ Batch Add'; return; }
      batchBtn.textContent = 'Cancel Batch';
      batchArea = document.createElement('div');
      batchArea.style.cssText = 'margin-top:6px;';
      batchArea.appendChild(cpLabel('Paste label/URL pairs (one per line):'));
      var ta = document.createElement('textarea');
      ta.className = 'cp-input';
      ta.placeholder = 'Label\tURL\nGitHub\thttps://github.com\nReddit\thttps://reddit.com';
      ta.style.cssText = 'min-height:80px;resize:vertical;width:100%;font-family:monospace;font-size:var(--text-xs);';
      batchArea.appendChild(ta);
      var addAll = document.createElement('button');
      addAll.className = 'btn btn-glass btn-sm';
      addAll.textContent = 'Add All';
      addAll.style.cssText = 'margin-top:4px;';
      addAll.addEventListener('click', function() {
        var lines = ta.value.split('\n').filter(function(l) { return l.trim(); });
        var added = 0;
        lines.forEach(function(line) {
          var parts = line.split('\t');
          if (parts.length >= 2) {
            var label = parts[0].trim();
            var url = parts[1].trim();
            if (label && url) {
              sec.links = sec.links || [];
              sec.links.push({ label: label, url: url, icon: 'link' });
              added++;
            }
          } else if (parts.length === 1 && parts[0].match(/^https?:\/\//)) {
            // URL only — generate label from domain
            sec.links = sec.links || [];
            sec.links.push({ label: parts[0].replace(/^https?:\/\//, '').split('/')[0], url: parts[0], icon: 'link' });
            added++;
          }
        });
        if (added > 0) {
          saveAndRefreshStructural();
          toast('Added ' + added + ' links');
          batchArea.remove(); batchArea = null; batchBtn.textContent = '+ Batch Add';
        }
      });
      batchArea.appendChild(addAll);
      bd.insertBefore(batchArea, bd.querySelector('.me-link-add') ? bd.querySelector('.me-link-add').nextSibling : null);
    });
    bd.appendChild(batchBtn);
  },
});
