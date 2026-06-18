registerModule('api-poller', {
  defaults: { url:'', jsonPath:'', label:'API', refreshInterval:60, fields:[] },
  render: (sec,card,cw)=>{
    const w=document.createElement('div');w.className='api-widget';
    w.dataset.url=sec.url||'';w.dataset.jsonPath=sec.jsonPath||'';
    w.dataset.label=sec.label||'';w.dataset.refresh=sec.refreshInterval||60;
    w.dataset.fields=JSON.stringify(sec.fields||[]);
    renderApiWidget(w);
    cw.appendChild(w);
  },
  editor: (sec,card,bd)=>{
    bd.appendChild(cpLabel('Label'));
    const li=cpInput('My API',sec.label||'',v=>{sec.label=v;saveConfig();});bd.appendChild(li);
    bd.appendChild(cpLabel('API URL'));
    const ui=cpInput('https://api.example.com/status',sec.url||'',v=>{sec.url=v;saveConfig();});bd.appendChild(ui);
    // Preset selector
    bd.appendChild(cpLabel('Preset'));
    const presetSel=document.createElement('select');presetSel.className='cp-input';
    presetSel.appendChild(new Option('— None —',''));
    API_PRESETS.forEach(function(p){
      var opt=new Option(p.label, p.url);
      if(p.url===sec.url)opt.selected=true;
      presetSel.appendChild(opt);
    });
    presetSel.addEventListener('change',function(){
      var p=API_PRESETS.find(function(x){return x.url===this.value;},this);
      if(p){
        sec.url=p.url;sec.fields=p.fields.map(function(f){return {label:f.label,path:f.path};});
        if(!sec.label||sec.label==='API'||API_PRESETS.some(function(x){return x.label===sec.label;}))sec.label=p.label;
        saveAndRefresh();
      }
    });
    bd.appendChild(presetSel);
    bd.appendChild(cpRange('Refresh (seconds)',sec.refreshInterval||60,5,600,v=>{sec.refreshInterval=parseInt(v);saveConfig();}));
    // Multiple fields
    bd.appendChild(cpLabel('Fields'));
    var fieldContainer=document.createElement('div');fieldContainer.style.cssText='margin-bottom:8px;';
    function renderFields(){
      fieldContainer.innerHTML='';
      (sec.fields||[]).forEach(function(f,fi){
        var row=document.createElement('div');row.style.cssText='display:flex;gap:4px;margin-bottom:4px;align-items:center;';
        var lInp=document.createElement('input');lInp.className='cp-input';lInp.placeholder='Label';lInp.value=f.label;
        lInp.style.cssText='flex:1;padding:5px 6px;font-size:var(--text-2xs);';
        lInp.addEventListener('change',function(){sec.fields[fi].label=lInp.value;saveConfig();});
        var pInp=document.createElement('input');pInp.className='cp-input';pInp.placeholder='Path';pInp.value=f.path;
        pInp.style.cssText='flex:2;padding:5px 6px;font-size:var(--text-2xs);';
        pInp.addEventListener('change',function(){sec.fields[fi].path=pInp.value;saveConfig();});
        var rm=document.createElement('button');rm.className='btn btn-glass btn-sm';rm.textContent='✕';rm.style.cssText='padding:2px 5px;font-size:var(--text-2xs);';
        rm.addEventListener('click',function(){sec.fields.splice(fi,1);renderFields();saveConfig();});
        row.appendChild(lInp);row.appendChild(pInp);row.appendChild(rm);
        fieldContainer.appendChild(row);
      });
      var addBtn=document.createElement('button');addBtn.className='btn btn-glass btn-sm';addBtn.textContent='+ Add Field';addBtn.style.cssText='font-size:var(--text-2xs);padding:4px 10px;';
      addBtn.addEventListener('click',function(){if(!sec.fields)sec.fields=[];sec.fields.push({label:'Value',path:''});renderFields();saveConfig();});
      fieldContainer.appendChild(addBtn);
    }
    renderFields();
    bd.appendChild(fieldContainer);
  },
  });  // end api-poller
