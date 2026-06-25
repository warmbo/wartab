registerModule('links', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}], listMode:false },
  render: (sec,card,cw)=>{
    if(sec.listMode){
      // ── List view (single-column rows) ──
      const lst=document.createElement('div');lst.className='link-list';
      (sec.links||[]).forEach(link=>{
        const a=document.createElement('a');a.className='link-row';a.href=link.url;a.target='_blank';a.rel='noopener';
        a.appendChild(renderLinkIcon(link.icon));a.appendChild(document.createTextNode(' '+link.label));
        lst.appendChild(a);
      });cw.appendChild(lst);shrinkLabels(cw);
    }else{
      // ── Grid view (button cards) ──
      const ig=document.createElement('div');ig.className='link-grid';(sec.links||[]).forEach(link=>{
        const a=document.createElement('a');a.className='link-item';a.href=link.url;a.target='_blank';a.rel='noopener';
        a.appendChild(renderLinkIcon(link.icon));var s=document.createElement('span');s.className='link-label';s.textContent=link.label;
        a.appendChild(s);ig.appendChild(a);
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
