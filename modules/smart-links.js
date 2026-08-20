registerModule('smart-links', {
  defaults: { mode:'most-used', limit:6 },
  css: `.smart-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-1)}.smart-link{display:flex;align-items:center;gap:var(--space-2);padding:7px 8px;border-radius:var(--radius-sm);color:var(--text-primary);text-decoration:none;min-width:0}.smart-link:hover{background:var(--accent-glass)}.smart-link .link-icon{width:18px;height:18px}.smart-link-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.smart-link-count{margin-left:auto;color:var(--text-tertiary);font-size:var(--text-2xs)}`,
  render: function(sec, card, cw) {
    var usage = getLinkUsage();
    var rows = Object.keys(usage).map(function(url) {
      var item = usage[url];
      return { url:url, label:item.label||url, icon:item.icon||'link', count:item.count||0, last:item.last||0 };
    });
    rows.sort(sec.mode==='recent'
      ? function(a,b){return b.last-a.last;}
      : function(a,b){return (b.count-a.count)||(b.last-a.last);});
    rows=rows.slice(0,Math.max(1,parseInt(sec.limit)||6));
    if(!rows.length){cw.appendChild(ds.empty('sparkles','No usage yet','Open dashboard links and your favorites will appear here.'));return;}
    var grid=document.createElement('div');grid.className='smart-links';
    rows.forEach(function(link){var a=document.createElement('a');a.className='smart-link';a.href=link.url;a.target='_blank';a.rel='noopener';a.appendChild(renderLinkIcon(link.icon));var label=document.createElement('span');label.className='smart-link-label';label.textContent=link.label;a.appendChild(label);var count=document.createElement('span');count.className='smart-link-count';count.textContent=sec.mode==='recent'?'recent':String(link.count);a.appendChild(count);a.addEventListener('click',function(){recordLinkUsage(link);});grid.appendChild(a);});
    cw.appendChild(grid);
  },
  settings:[
    {name:'mode',label:'Ranking',type:'select',options:[{value:'most-used',label:'Most used'},{value:'recent',label:'Recent'}],default:'most-used',structural:true},
    {name:'limit',label:'Links',type:'number',default:6,structural:true}
  ]
});
