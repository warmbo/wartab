/* WarTab — summary-first network health. Uses the existing server ping API. */
registerModule('network-status', {
  defaults: { targets:'', refreshInterval:60 },
  css: `.network-summary{display:grid;gap:var(--space-1);padding:var(--space-2) 0 var(--space-3)}.network-summary strong{font-size:var(--text-lg);color:var(--text-primary)}.network-summary span{display:flex;align-items:center;gap:var(--space-2);color:var(--text-secondary);font-size:var(--text-xs)}.network-details summary{min-height:36px;display:flex;align-items:center;color:var(--text-secondary);font-size:var(--text-xs);cursor:pointer}`,
  render: function(sec,card,cw){cw.appendChild(ds.loading(3,'bar'));},
  onMount: function(sec,card,cw){
    var cacheKey='wartab.network.'+(sec.id||'default');
    function parse(){return String(sec.targets||'').split('\n').map(function(line){var p=line.split('|');return{label:(p[0]||'').trim(),host:(p[1]||'').trim()};}).filter(function(t){return t.label&&t.host;});}
    function saveCache(rows,ts){try{localStorage.setItem(cacheKey,JSON.stringify({rows:rows,ts:ts}));}catch(e){}}
    function loadCache(){try{return JSON.parse(localStorage.getItem(cacheKey)||'null');}catch(e){return null;}}
    function friendlyError(value){var error=String(value||'').toLowerCase();if(error.includes('operation not permitted')||error.includes('cap_net_raw'))return'Ping permission unavailable';if(error.includes('timeout'))return'Timed out';return error?'Check unavailable':'';}
    function renderRows(rows,checkedAt){
      var reachable=rows.filter(function(r){return r.state==='healthy';});
      var unknown=rows.filter(function(r){return r.state==='unknown';});
      var measured=reachable.filter(function(r){return Number.isFinite(r.avg_ms);});
      var avg=measured.length?Math.round(measured.reduce(function(sum,r){return sum+r.avg_ms;},0)/measured.length):null;
      var root=document.createElement('div');root.className='network-widget';
      var summary=document.createElement('div');summary.className='network-summary';
      var primary=document.createElement('strong');primary.textContent=unknown.length===rows.length?'Network checks unavailable':reachable.length+'/'+rows.length+' targets reachable';summary.appendChild(primary);
      var context=document.createElement('span');context.appendChild(document.createTextNode(avg===null?(unknown.length?unknown.length+' checks unknown':'Latency unavailable'):avg+' ms average latency'));context.appendChild(ds.freshness(checkedAt,Math.max(120000,(parseInt(sec.refreshInterval)||60)*3000)));summary.appendChild(context);root.appendChild(summary);
      var details=document.createElement('details');details.className='network-details';var toggle=document.createElement('summary');toggle.textContent='Network details';details.appendChild(toggle);
      var list=document.createElement('div');list.className='info-list';rows.forEach(function(row){var labels={healthy:'Reachable',offline:'Offline',unknown:'Unknown'};list.appendChild(ds.statusRow({label:row.label,state:row.state,status:labels[row.state]||'Unknown',context:row.error?row.host+' · '+row.error:row.host,meta:row.state==='healthy'&&Number.isFinite(row.avg_ms)?Math.round(row.avg_ms)+' ms':'—'}));});details.appendChild(list);root.appendChild(details);cw.replaceChildren(root);renderIcons();
    }
    function refresh(){
      var targets=parse();if(!targets.length){cw.replaceChildren(ds.empty('network','No network targets','Add a gateway, DNS server, or public host to check.',{label:'Configure',onClick:function(){openCardEditPanel(card.id);}}));return Promise.resolve();}
      return Promise.all(targets.map(function(target){return WarTabHttp.request('/api/ping?host='+encodeURIComponent(target.host)+'&count=2',{timeout:10000}).then(function(data){return{label:target.label,host:target.host,state:data.alive?'healthy':(String(data.error||'').toLowerCase().includes('timeout')?'offline':'unknown'),avg_ms:Number(data.avg_ms),error:friendlyError(data.error)};},function(){return{label:target.label,host:target.host,state:'unknown',avg_ms:null,error:'Check unavailable'};});})).then(function(rows){var now=Date.now();saveCache(rows,now);renderRows(rows,now);});
    }
    var cached=loadCache();if(cached&&cached.rows)renderRows(cached.rows,cached.ts);
    return WarTabHttp.createPoller({owner:cw,interval:Math.max(30000,(parseInt(sec.refreshInterval)||60)*1000),task:refresh});
  },
  settings:[
    {name:'targets',label:'Targets (Label|Host per line)',type:'textarea',placeholder:'Gateway|10.0.0.1\nInternet|1.1.1.1\nDNS|10.0.0.2'},
    {name:'refreshInterval',label:'Refresh seconds',type:'number',default:60}
  ]
});
