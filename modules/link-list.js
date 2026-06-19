registerModule('link-list', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}] },
  render: (sec,card,cw)=>{
    const lst=document.createElement('div');lst.className='link-list';
    (sec.links||[]).forEach(link=>{
      const a=document.createElement('a');a.className='link-row';a.href=link.url;a.target='_blank';a.rel='noopener';
      a.appendChild(renderLinkIcon(link.icon));a.appendChild(document.createTextNode(' '+link.label));
      lst.appendChild(a);
    });cw.appendChild(lst);shrinkLabels(cw);
  },
  editor: (sec,card,bd)=>{
    // link-list shares the same link-row editor as links
    CARD_MODULES['links'].editor(sec,card,bd);
  },
});
