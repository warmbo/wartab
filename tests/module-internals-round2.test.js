import {afterEach,expect,it,vi} from 'vitest';
import {loadBrowserScript} from './browser-harness.js';
let app;
afterEach(()=>app?.cleanup());
it('only applies the state hook to state containers, not every empty-state child',()=>{
 app=loadBrowserScript('render.js',['normalizeModuleSurface']);
 const surface=app.document.createElement('div');
 surface.innerHTML='<div><div class="ds-state ds-empty"><div class="ds-empty-icon"></div><div class="ds-empty-msg">No URL</div><div class="ds-empty-hint">Configure it</div><div class="ds-empty-action"><button>Configure</button></div></div></div>';
 app.exports.normalizeModuleSurface(surface,'iframe');
 expect(surface.querySelector('.ds-state').dataset.ui).toBe('state');
 for(const el of surface.querySelectorAll('.ds-empty > div'))expect(el.dataset.ui).not.toBe('state');
 expect(surface.querySelector('button').dataset.ui).toBe('control');
});
it('keeps bookmark paths, queries and fragment routes distinct when deduplicating',()=>{
 app=loadBrowserScript('modules/links.js',['normalizeBookmarkUrl'],{registerModule:vi.fn()});
 const normalize=app.exports.normalizeBookmarkUrl;
 expect(normalize('https://EXAMPLE.com/path')).toBe(normalize('https://example.com/path'));
 expect(normalize('https://example.com/Path')).not.toBe(normalize('https://example.com/path'));
 expect(normalize('https://example.com/?key=A')).not.toBe(normalize('https://example.com/?key=a'));
 expect(normalize('https://example.com/#one')).not.toBe(normalize('https://example.com/#two'));
});
it('bookmark rendering rejects active URL schemes and preserves the original link index',()=>{
 let module;const context=vi.fn();
 app=loadBrowserScript('modules/links.js',['bookmarkHref'],{registerModule:(_t,d)=>module=d,recordLinkUsage:vi.fn(),WarTabContextMenu:{registerLink:context},renderLinkIcon:()=>app.document.createElement('i')});
 app.window.ds={empty:()=>app.document.createElement('div')};
 expect(app.exports.bookmarkHref('java\tscript:alert(1)')).toBe('');expect(app.exports.bookmarkHref('data:text/html,test')).toBe('');
 expect(app.exports.bookmarkHref('https://example.test/Path')).toBe('https://example.test/Path');
 const owner=app.document.createElement('div');module.render({links:[{url:'javascript:alert(1)'},{label:'Safe',url:'https://example.test'}]}, {id:'one'},owner);
 expect(owner.querySelectorAll('a')).toHaveLength(1);expect(context.mock.calls[0][1].index).toBe(1);
});
it('smart-link usage survives malformed local data without mutating object prototypes',()=>{
 app=loadBrowserScript('core.js',['getLinkUsage','recordLinkUsage']);
 for(const raw of ['null','[]','42']){app.window.localStorage.setItem('wartab.link.usage',raw);expect(Object.keys(app.exports.getLinkUsage())).toHaveLength(0);}
 app.window.localStorage.setItem('wartab.link.usage',JSON.stringify({'https://example.test':{count:'broken'}}));
 app.exports.recordLinkUsage({url:'https://example.test',label:'Example'});
 expect(app.exports.getLinkUsage()['https://example.test'].count).toBe(1);
 app.exports.recordLinkUsage({url:'__proto__',label:'Prototype route'});
 expect(app.window.Object.prototype.count).toBeUndefined();
});
it('real design-system stat rows render numeric values, including zero',()=>{
 app=loadBrowserScript('design-system.js',[]);
 expect(app.window.ds.statRow('Count',0).querySelector('.ds-stat-value').textContent).toBe('0');
 expect(app.window.ds.statRow('Count',2).querySelector('.ds-stat-value').textContent).toBe('2');
});
it('digital-pet zero stats remain zero and healthy health is not colored as danger',()=>{
 let module;app=loadBrowserScript('modules/digital-pet.js',[],{registerModule:(_t,d)=>module=d,prefersReducedMotion:()=>true,storage:{getStats:()=>new Promise(()=>{})},WarTabLifecycle:{addCleanup:vi.fn()},setTimeout:vi.fn(()=>1),setInterval:vi.fn(()=>1),clearTimeout:vi.fn(),clearInterval:vi.fn(),saveConfig:vi.fn()});
 const now=Date.now(),owner=app.document.createElement('div');
 module.render({id:'pet',hunger:0,happiness:0,waste:0,energy:0,health:100,lastFed:now,lastPetted:now,lastCleaned:now,lastEnergyTs:now,lastHealthTs:now},{},owner);
 expect([...owner.querySelectorAll('.dp-val')].map(e=>e.textContent)).toEqual(['0','0','0','0','100']);
 const sample=app.document.createElement('div');sample.style.background='hsl(120,70%,45%)';
 expect(owner.querySelectorAll('.dp-fill')[4].style.background).toBe(sample.style.background);
 expect(owner.querySelectorAll('[role="progressbar"]')).toHaveLength(5);
});
it('ASCII animation explains reduced motion and offers explicit play/pause controls',()=>{
 const raf=vi.fn(()=>1),cancel=vi.fn();let module;
 app=loadBrowserScript('modules/ascii-anim.js',[],{registerModule:(_t,d)=>module=d,prefersReducedMotion:()=>true,requestAnimationFrame:raf,cancelAnimationFrame:cancel,WarTabLifecycle:{addCleanup:vi.fn()}});
 const owner=app.document.createElement('div');module.render({anim:'donut'},{id:'one'},owner);
 expect(owner.querySelector('pre').textContent).toContain('reduced motion');
 const button=owner.querySelector('button');expect(button.textContent).toContain('Play');button.click();expect(raf).toHaveBeenCalled();
 button.click();expect(cancel).toHaveBeenCalled();expect(button.textContent).toContain('Play');
});
it('link-list renders rows without mutating the saved section or shared defaults',()=>{
 const render=vi.fn(),defaults={listMode:false,links:[]};
 app=loadBrowserScript('modules/link-list.js',[],{CARD_MODULES:{links:{defaults,render}},registerModule:vi.fn()});
 const definition=app.window.registerModule.mock.calls[0][1],section={type:'link-list',links:[]};
 definition.render(section,{id:'test'},app.document.createElement('div'));
 expect(render.mock.calls[0][0].listMode).toBe(true);expect(section.listMode).toBeUndefined();expect(defaults.listMode).toBe(false);
});
