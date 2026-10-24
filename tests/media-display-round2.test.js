import {afterEach,expect,it,vi} from 'vitest';
import {loadBrowserScript} from './browser-harness.js';
let app;
afterEach(()=>app?.cleanup());
function load(file,extra={}){
 let definition;app=loadBrowserScript(file,[],{registerModule:(_t,d)=>definition=d,openCardEditPanel:vi.fn(),...extra});
 app.window.ds={empty:(_i,message,hint,action)=>{const el=app.document.createElement('div');el.textContent=message+' '+hint;if(action){const b=app.document.createElement('button');b.textContent=action.label;b.onclick=action.onClick;el.append(b);}return el;},error:(message,detail,action)=>{const el=app.document.createElement('div');el.textContent=message+' '+detail;if(action){const b=app.document.createElement('button');b.textContent=action.label;b.onclick=action.onClick;el.append(b);}return el;}};
 return definition;
}
it('image empty state provides a real configure action',()=>{
 const module=load('modules/image.js'),owner=app.document.createElement('div');module.render({},{id:'one'},owner);
 owner.querySelector('button').click();expect(app.window.openCardEditPanel).toHaveBeenCalledWith('one');
});
it('failed images retain an actionable retry and retry the same source',()=>{
 const module=load('modules/image.js'),owner=app.document.createElement('div');module.render({url:'/uploads/photo.png',alt:'Photo'},{id:'one'},owner);
 owner.querySelector('img').dispatchEvent(new app.window.Event('error'));
 expect(owner.textContent).toContain('Image unavailable');owner.querySelector('button').click();
 expect(owner.querySelector('img').getAttribute('src')).toBe('/uploads/photo.png');
});
it('LAN discovery requires an explicit click, uses the existing endpoint and renders untrusted device names as text',async()=>{
 let module;const request=vi.fn().mockResolvedValue({devices:[{ip:'192.0.2.7',hostname:'<img src=x onerror=alert(1)>',mac:'00:00:00:00:00:00',vendor:'Fixture'}]});
 app=loadBrowserScript('modules/lan-scan.js',[],{registerModule:(_t,d)=>module=d,WarTabHttp:{request},WarTabLifecycle:{addCleanup:vi.fn()}});
 const owner=app.document.createElement('div');module.render({label:'Fixture LAN'}, {id:'one'},owner);
 expect(request).not.toHaveBeenCalled();await owner.querySelector('button').onclick();expect(request).toHaveBeenCalledWith('/api/arp');
 expect(owner.textContent).toContain('1 discovered');expect(owner.textContent).toContain('<img src=x onerror=alert(1)>');expect(owner.querySelector('img')).toBeNull();
 expect(owner.querySelector('button').disabled).toBe(false);
});
it('media distinguishes a failed service from a legitimate zero count',async()=>{
 app=loadBrowserScript('modules/media.js',['fetchServiceData'],{registerModule:()=>{},WarTabHttp:{request:vi.fn().mockRejectedValue(new Error('offline'))}});
 const service={type:'sonarr',url:'https://fixture.invalid',key:'synthetic-fixture-key'};
 expect((await app.exports.fetchServiceData(service)).error).toBeTruthy();
 expect((await app.exports.fetchServiceData({...service,type:'plex'})).error).toBeTruthy();
 app.window.WarTabHttp.request.mockResolvedValue({totalRecords:0});
 const zero=await app.exports.fetchServiceData(service);expect(zero.error).toBeNull();expect(zero.results.wanted.value).toBe(0);
});
it('media refreshes with an owner-bound poller instead of showing one stale snapshot',()=>{
 let module,options;app=loadBrowserScript('modules/media.js',[],{registerModule:(_t,d)=>module=d,WarTabHttp:{request:vi.fn(),createPoller:o=>{options=o;return {};}}});
 app.window.ds={loading:()=>app.document.createElement('div')};const owner=app.document.createElement('div');
 module.render({services:[{type:'sonarr',url:'https://fixture.invalid',key:'synthetic'}]}, {id:'one'},owner);
 expect(options.owner).toBe(owner);expect(options.interval).toBe(60000);expect(typeof options.task).toBe('function');
});
it('iframe rejects executable schemes instead of creating an active frame',()=>{
 const module=load('modules/iframe.js'),owner=app.document.createElement('div');module.render({url:'javascript:alert(1)'},{id:'one'},owner);
 expect(owner.querySelector('iframe')).toBeNull();expect(owner.textContent).toContain('Invalid embed URL');
});
it('iframe offers a direct-open fallback for sites that disallow embedding',()=>{
 const module=load('modules/iframe.js'),owner=app.document.createElement('div');module.render({url:'https://example.test/dashboard',label:'Dashboard'},{id:'one'},owner);
 const link=owner.querySelector('a');expect(link.href).toBe('https://example.test/dashboard');expect(link.rel).toContain('noopener');
 expect(owner.querySelector('iframe').getAttribute('title')).toBe('Dashboard');
});
