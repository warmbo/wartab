import fs from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import {loadBrowserScript} from './browser-harness.js';
let app;
afterEach(()=>app?.cleanup());
function palette(){
 const noop=()=>{};const globals={config:{search:{},pages:{home:{name:'Home',cards:[{title:'Fixture',sections:[{links:[{label:'<img src=x onerror=alert(1)>',url:'https://fixture.invalid'},{label:'Unsafe',url:'javascript:alert(1)'}]}]}]}},pageOrder:['home']},renderIcons:noop,renderLinkIcon:()=>app.document.createElement('span'),getLinkUsage:vi.fn(()=>({})),addNewCard:noop,openPageManagementPanel:noop,toggleArrangeMode:noop,toggleConfigPanel:noop,showShortcutsOverlay:noop,switchPage:noop};
 globals.bookmarkHref=value=>/^(javascript|data|vbscript):/i.test(value)?'':value;
 app=loadBrowserScript('command-palette.js',[],globals,'<button id="trigger">Command</button>');app.document.getElementById('trigger').focus();app.window.WarTabCommandPalette.open();return app;
}
it('palette renders untrusted bookmark labels as text and excludes active URL schemes',()=>{
 palette();expect(app.document.querySelector('.palette-item-label img')).toBeNull();expect(app.document.querySelector('.palette-results').textContent).toContain('<img src=x onerror=alert(1)>');expect(app.document.querySelector('.palette-results').textContent).not.toContain('Unsafe');expect(app.window.getLinkUsage).toHaveBeenCalledTimes(1);
 const input=app.document.querySelector('.palette-input');input.value='img';input.dispatchEvent(new app.window.Event('input'));const label=[...app.document.querySelectorAll('.palette-item-label')].find(el=>el.textContent.includes('<img'));expect(label.querySelectorAll('mark')).toHaveLength(1);expect(label.querySelector('mark').textContent).toBe('img');
});
it('palette associates the active result and returns focus on dismissal',()=>{
 palette();const input=app.document.querySelector('.palette-input');expect(input.getAttribute('role')).toBe('combobox');expect(app.document.getElementById(input.getAttribute('aria-controls'))).not.toBeNull();expect(app.document.getElementById(input.getAttribute('aria-activedescendant')).getAttribute('aria-selected')).toBe('true');
 const behind=vi.fn();app.document.addEventListener('keydown',behind);input.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'?',bubbles:true}));expect(behind).not.toHaveBeenCalled();input.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(behind).not.toHaveBeenCalled();expect(app.document.activeElement.id).toBe('trigger');
});
it('switchPage renders immediately, ignores current-page clicks and preserves geometry',()=>{
 const save=vi.fn(),render=vi.fn(),nav=vi.fn();app=loadBrowserScript('pages.js',['switchPage'],{config:{currentPage:'a',pages:{a:{cards:[{id:'one',width:2}]},b:{cards:[]}}},saveConfig:save,renderAll:render,$:()=>null});app.window.renderPageNav=nav;
 app.exports.switchPage('a');expect(save).not.toHaveBeenCalled();app.exports.switchPage('b');expect(render).toHaveBeenCalledTimes(1);expect(save).toHaveBeenCalledTimes(1);expect(app.window.config.pages.a.cards[0].width).toBe(2);
});
it('shared confirmation defaults destructive focus to Cancel and commits once',()=>{
 app=loadBrowserScript('modals.js',['showConfirmModal']);const confirm=vi.fn();app.exports.showConfirmModal('Delete fixture?',confirm,'Delete');const buttons=app.document.querySelectorAll('.modal-box button');expect(app.document.activeElement.textContent).toBe('Cancel');const remove=[...buttons].find(b=>b.textContent==='Delete');remove.click();remove.click();expect(confirm).toHaveBeenCalledTimes(1);
});
it('shortcuts reuse the shared modal and trap focus without stealing modified shortcuts',()=>{
 app=loadBrowserScript('pages.js',['showShortcutsOverlay'],{renderIcons:()=>{},addNewCard:vi.fn(),addPage:vi.fn(),toggleConfigPanel:vi.fn(),$:()=>null});app.window.eval(fs.readFileSync('modals.js','utf8'));app.exports.showShortcutsOverlay();const box=app.document.querySelector('.shortcuts-box');expect(box).not.toBeNull();expect(box.closest('.modal-overlay')).not.toBeNull();app.document.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'n',ctrlKey:true,bubbles:true}));expect(app.window.addNewCard).not.toHaveBeenCalled();app.exports.showShortcutsOverlay();expect(app.document.querySelector('.modal-overlay')).toBeNull();
});
