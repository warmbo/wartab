import fs from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import {loadBrowserScript} from './browser-harness.js';
let app;
afterEach(()=>app?.cleanup());
it('range helpers bind visible labels, preserve zero and save once per committed change',()=>{
 app=loadBrowserScript('form-helpers.js',['cpRange','cpInput','cpBtn']);const change=vi.fn();
 const range=app.exports.cpRange('Opacity',0,0,100,change),input=range.querySelector('input');
 expect(range.querySelector('label').htmlFor).toBe(input.id);expect(input.id).toBeTruthy();
 expect(app.exports.cpInput('Count',0).value).toBe('0');expect(app.exports.cpBtn('Add').type).toBe('button');
 input.value='50';input.dispatchEvent(new app.window.Event('input'));expect(change).not.toHaveBeenCalled();
 input.dispatchEvent(new app.window.Event('pointerup'));input.dispatchEvent(new app.window.Event('change'));
 expect(change).toHaveBeenCalledTimes(1);expect(range.querySelector('output').textContent).toBe('50');
});
it('static dashboard has named native landmarks and a working skip target',()=>{
 app=loadBrowserScript('form-helpers.js',[],{ },fs.readFileSync('index.html','utf8'));
 expect(app.document.querySelector('header#top-bar')).not.toBeNull();expect(app.document.querySelector('nav#page-tabs').getAttribute('aria-label')).toBeTruthy();
 expect(app.document.querySelector('main#card-grid').tabIndex).toBe(-1);expect(app.document.querySelector('.skip-link').hash).toBe('#card-grid');
 expect(app.document.querySelector('footer#footer')).not.toBeNull();
});
it('search uses the same native submit behavior in the dashboard and editor preview',()=>{
 let module;const search=vi.fn();app=loadBrowserScript('modules/search.js',[],{registerModule:(_t,d)=>module=d,doSearch:search,saveConfig:vi.fn(),saveAndRefresh:vi.fn(),config:{pages:{},pageOrder:[],search:{engines:{Google:'https://example.test?q='}}},cpLabel:()=>app.document.createElement('label'),cpSelect:()=>app.document.createElement('select')});
 for(const mode of ['render','editor']){const owner=app.document.createElement('div');module[mode]({engine:'Google'}, {},owner);if(mode==='editor'){const labels=[...owner.querySelectorAll('label')];expect(labels).toHaveLength(2);expect(labels.every(label=>label.htmlFor&&owner.querySelector('#'+label.htmlFor))).toBe(true);}const form=owner.querySelector('form');expect(form).not.toBeNull();const input=form.querySelector('input');expect(input.type).toBe('search');input.value='fixture query';const event=new app.window.Event('submit',{cancelable:true});form.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);}
 expect(search).toHaveBeenCalledTimes(2);expect(search.mock.calls[0][0]).toBe('fixture query');
});
it('launcher names do not produce orphaned final letters, and unnamed links stay readable',()=>{
 let module;app=loadBrowserScript('modules/links.js',[],{registerModule:(_t,d)=>module=d,renderLinkIcon:()=>app.document.createElement('i'),recordLinkUsage:vi.fn(),WarTabContextMenu:{registerLink:vi.fn()}});
 const owner=app.document.createElement('div');module.render({links:[{label:'qBittorrent',url:'https://fixture.invalid'},{label:'Warmbo Desk',url:'https://fixture.invalid/desk'},{url:'https://fixture.invalid/fallback'}]}, {},owner);
 const labels=owner.querySelectorAll('.link-label');expect(labels[0].classList.contains('link-label-compact')).toBe(true);expect(labels[1].classList.contains('link-label-compact')).toBe(false);expect(labels[2].textContent).toBe('https://fixture.invalid/fallback');
});
it('legacy id-less sections get unique targets and cannot be locked closed without a toggle',()=>{
 app=loadBrowserScript('render.js',['renderSection'],{CARD_MODULES:{},WarTabLifecycle:{addCleanup:vi.fn()}});
 const a={type:'fixture',collapsed:true},b={type:'clock',label:'Clock',collapsed:true},card={sections:[a,b]};
 const first=app.exports.renderSection(a,card).querySelector('.dropdown-content'),second=app.exports.renderSection(b,card).querySelector('.dropdown-content');
 expect(first.id).not.toBe(second.id);for(const content of [first,second]){expect(content.inert).toBe(false);expect(content.classList.contains('open')).toBe(true);}
 expect(a.collapsed).toBe(true);expect(a.id).toBeUndefined();
});
it('collapsed module sections have a real aria-controls target and are inert until expanded',()=>{
 app=loadBrowserScript('render.js',['renderSection'],{CARD_MODULES:{fixture:{render:(_s,_c,owner)=>{const b=app.document.createElement('button');b.textContent='Fixture';owner.append(b);}}},WarTabLifecycle:{addCleanup:vi.fn()},saveConfig:vi.fn()});
 const sec={id:'one',type:'fixture',label:'Details',collapsed:true},card={height:1,sections:[sec]};
 app.document.body.append(app.exports.renderSection(sec,card));const toggle=app.document.querySelector('.dropdown-toggle'),content=app.document.getElementById(toggle.getAttribute('aria-controls'));
 expect(content).not.toBeNull();expect(content.inert).toBe(true);toggle.click();expect(content.inert).toBe(false);expect(toggle.getAttribute('aria-expanded')).toBe('true');
});
