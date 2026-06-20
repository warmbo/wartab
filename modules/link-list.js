// Backward-compatible alias — link-list is now a display mode of the links module
registerModule('link-list', {
  defaults: { links:[{label:'Example',url:'https://example.com',icon:'link'}], listMode:true },
  render: (sec,card,cw)=>{
    sec.listMode=true;
    CARD_MODULES['links'].render(sec,card,cw);
  },
  editor: (sec,card,bd)=>{
    CARD_MODULES['links'].editor(sec,card,bd);
  },
});
