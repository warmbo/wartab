import { afterEach, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';
let app;
afterEach(()=>app?.cleanup());
it('traps confirmation focus and Escape closes only the newest modal',()=>{
  app=loadBrowserScript('modals.js',['openModal']);
  const lower=app.exports.openModal({label:'First'});
  const upper=app.exports.openModal({label:'Second'});
  upper.box.innerHTML='<button>Yes</button><button>No</button>';
  const [first,last]=upper.box.children;
  last.focus();
  app.document.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Tab',cancelable:true}));
  expect(app.document.activeElement).toBe(first);
  app.document.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));
  expect(upper.overlay.isConnected).toBe(false);
  expect(lower.overlay.isConnected).toBe(true);
});
