// Native Node 22+ CDP smoke; attach to an isolated Chromium debugging endpoint.
// Usage: node tests/browser-smoke.mjs http://127.0.0.1:8088 http://127.0.0.1:9335
// Read-only: navigation/theme changes stay in memory; never clicks Save or Apply.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const [url='http://127.0.0.1:8088', endpoint='http://127.0.0.1:9335', output] = process.argv.slice(2);
const target = await (await fetch(`${endpoint}/json/new?about:blank`, {method:'PUT'})).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen=resolve; socket.onerror=reject; });
let serial=0;
const pending=new Map(), errors=[];
socket.onmessage=event => {
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  const request=pending.get(message.id);
  if(request){ pending.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); }
};
function call(method,params={}){
  return new Promise((resolve,reject) => {
    const id=++serial, timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${method}`));},15000);
    pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function js(expression){
  const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
try {
  await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable');
  await call('Network.setCacheDisabled',{cacheDisabled:true});
  await call('Network.setBypassServiceWorker',{bypass:true});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await call('Emulation.setDeviceMetricsOverride',{width:1400,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__smokeBlockedWrites=[];
    const originalFetch=window.fetch;
    window.fetch=function(resource,options){
      const method=String(options?.method||resource?.method||'GET').toUpperCase();
      const path=new URL(resource?.url||resource,location.href).pathname;
      if(!['GET','HEAD'].includes(method)&&path!=='/api/proxy'){
        window.__smokeBlockedWrites.push({method,path,stack:new Error().stack});
        return Promise.resolve(new Response('{"error":"Browser smoke blocked a write"}',{status:403,headers:{'Content-Type':'application/json'}}));
      }
      const request=originalFetch.apply(this,arguments);
      if(method==='GET'&&path==='/api/config')return request.then(async response=>{
        if(!response.ok)return response;
        const data=await response.json();
        // Rotation intentionally saves on startup; disable only in this QA response.
        if(data.theme)data.theme.bgRotate=false;
        return new Response(JSON.stringify(data),{status:response.status,headers:response.headers});
      });
      return request;
    };
  `});
  await call('Page.navigate',{url});
  let ready=false;
  for(let retry=0;retry<100;retry++){
    ready=await js("typeof config!=='undefined' && !!config.pages && document.querySelector('#card-grid')?.children.length>0 && document.getElementById('page-loader')?.classList.contains('hidden')");
    if(ready)break;
    await pause(100);
  }
  assert(ready,'Dashboard did not finish initialization');
  await pause(1500);
  await js("document.querySelector('.command-deck-hint')?.remove();document.getElementById('bg-canvas').style.display='none';document.body.style.background='#0f0f0f'");
  const geometry=await js("JSON.stringify(Object.values(config.pages).map(p=>p.cards.map(c=>[c.id,c.width,c.height,c.mobileOrder,c.mobileHidden])))");
  const pages=await js('config.pageOrder.slice()');
  assert(pages.length>0,'No pages loaded');
  for(const page of pages) for(const mode of ['dark','light']) for(const width of [320,390,768,900,1024,1400,1920]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    await js(`config.currentPage=${JSON.stringify(page)};config.theme.cardBg=${JSON.stringify(mode)};config.theme.followSystem=false;applyTheme();renderPageNav();renderAll()`);
    await pause(120);
    const metrics=await js("({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),cards:document.querySelectorAll('#card-grid > .card').length})");
    assert.equal(metrics.overflow,0,`Page overflow at ${page}/${mode}/${width}`);
    results.push({page,mode,width,...metrics});
    if(output && page===pages[0] && mode==='dark' && [390,1400].includes(width)){
      await mkdir(output,{recursive:true});
      const shot=await call('Page.captureScreenshot',{format:'png'});
      await writeFile(`${output}/dashboard-${width}.png`,Buffer.from(shot.data,'base64'));
    }
  }
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await js("matchMedia('(pointer:coarse)').matches"),true,'Touch emulation must activate coarse-pointer CSS');
  await js('openCardGallery()');
  assert.equal(await js("[...document.querySelectorAll('.gallery-category,.ux-surface-head button')].every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})"),true,'Gallery touch targets');
  await js("document.querySelector('.gallery-search input').value='zzzz-no-match';document.querySelector('.gallery-search input').dispatchEvent(new Event('input'))");
  assert.equal(await js("[...document.querySelectorAll('.gallery-card')].filter(e=>e.getBoundingClientRect().height>0).length"),0,'Gallery filter must hide rendered cards');
  assert.match(await js("document.querySelector('.gallery-result-status').textContent"),/No cards/);
  await js('openLayoutStudio()'); await js('openLayoutStudio()');
  for(const view of ['desktop','tablet','mobile']){
    await js(`document.querySelector('[data-view="${view}"]').click()`);
    assert.equal(await js("document.querySelector('.ux-surface-body').scrollWidth-document.querySelector('.ux-surface-body').clientWidth"),0,`Layout overflow in ${view}`);
  }
  await js("document.querySelector('[data-step]')?.click();cancelLayoutDraft()");
  assert.equal(await js("JSON.stringify(Object.values(config.pages).map(p=>p.cards.map(c=>[c.id,c.width,c.height,c.mobileOrder,c.mobileHidden])))"),geometry,'Draft/viewport changes must preserve geometry');
  assert.deepEqual(await js('window.__smokeBlockedWrites'),[],'Read-only smoke must not attempt mutations');
  assert.deepEqual(errors,[],'Browser runtime exceptions');
  console.log(JSON.stringify({passed:true,renderCases:results.length,journeys:['gallery filtering','layout reopen','three layout previews','cancel preserves geometry'],errors,results},null,2));
} finally { await call('Page.close').catch(()=>{}); socket.close(); }
