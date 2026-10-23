import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';
let app;
afterEach(() => { app?.cleanup(); vi.useRealTimers(); });
// Use the real script with a pre-existing shell, rather than a copied algorithm.
function load() {
  vi.useFakeTimers();
  const config = { pages:{ home:{cards:[{id:'one',title:'One',width:2,height:2}]} }, currentPage:'home' };
  app = loadBrowserScript('ux-system.js', [], {
    config, cloneObj: value => JSON.parse(JSON.stringify(value)),
    CARD_TYPE_DEFS:[{type:'notes',label:'Notes',description:'Write things',category:'Create',role:'canvas',icon:'edit'}],
    WarTabCardModel:{getCurrentCards:c=>c.pages[c.currentPage].cards,getCardRole:()=> 'canvas'},
    ds:{icon:()=>app.document.createElement('i')}, escHtml:String, renderIcons:()=>{}, getPageCols:()=>4,
  }, '<div id="card-grid"></div>');
  return config;
}
describe('gallery and manual layout journeys', () => {
  it('opens and replaces Layout Studio without relying on a config.cards alias', () => {
    const config=load(), before=JSON.stringify(config);
    app.window.openLayoutStudio();
    expect(app.document.querySelectorAll('.layout-mini')).toHaveLength(1);
    app.window.openLayoutStudio();
    expect(app.document.querySelectorAll('.layout-mini')).toHaveLength(1);
    app.document.querySelector('[data-step="width:1"]').click();
    app.window.cancelLayoutDraft();
    expect(JSON.stringify(config)).toBe(before);
  });
  it('keeps keyboard focus inside the gallery and narrow layout previews', () => {
    load();app.window.openCardGallery();
    const panel=app.document.querySelector('.ux-surface');
    const first=panel.querySelector('button'), last=Array.from(panel.querySelectorAll('button')).pop();
    last.focus();last.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
    expect(app.document.activeElement).toBe(first);
    first.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
    expect(app.document.activeElement).toBe(last);
    const outside=app.document.createElement('button');app.document.body.append(outside);outside.focus();
    outside.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
    expect(app.document.activeElement).toBe(first);
    app.window.openLayoutStudio();
    app.document.querySelector('[data-view="mobile"]').click();
    expect(app.document.querySelector('.layout-mini').style.gridColumn).toBe('span 1');
    expect(app.document.querySelector('.layout-stage').style.getPropertyValue('--studio-cols')).toBe('1');
  });
  it('reports no matches, hides templates while searching, and restores focus', () => {
    load();
    const trigger=app.document.createElement('button');app.document.body.append(trigger);trigger.focus();
    app.window.openCardGallery();
    const input=app.document.querySelector('.gallery-search input');input.value='missing';input.dispatchEvent(new app.window.Event('input'));
    expect(app.document.querySelector('.gallery-card').hidden).toBe(true);
    expect(app.document.querySelector('.template-strip').hidden).toBe(true);
    expect(app.document.querySelector('[role="status"]').textContent).toContain('No cards');
    app.document.querySelector('.ux-surface [aria-label="Close"]').click();
    expect(app.document.activeElement).toBe(trigger);
  });
});
