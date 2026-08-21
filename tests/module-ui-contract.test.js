import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const read=p=>fs.readFileSync(p,'utf8');

describe('customer module UI contract',()=>{
  it('normalizes every rendered module through shared semantic hooks',()=>{
    const render=read('render.js');
    expect(render).toContain('function normalizeModuleSurface');
    expect(render).toContain("moduleSurface.className = 'ui-module'");
    expect(render).toContain("element.dataset.ui = 'control'");
    expect(render).toContain("element.dataset.ui = 'field'");
    expect(render).toContain("element.dataset.ui = 'row'");
    expect(render).toContain('normalizeModuleSurface(moduleSurface, section.type)');
    expect(render).toContain('new MutationObserver');
  });

  it('keeps card background ownership at the shared shell, not module archetypes',()=>{
    const css=read('style.css');
    expect(css).toContain('.card:not(.card-transparent){background:var(--card-bg)}');
    expect(css).toContain('.ui-module-root{width:100%');
    expect(css).toContain(':where([data-ui="control"])');
    expect(css).toContain(':where([data-ui="field"])');
    expect(css).not.toContain('[data-ui="field"]{');
  });

  it('uses IDs only for the few functional association cases in modules',()=>{
    const sources=fs.readdirSync('modules').filter(x=>x.endsWith('.js')).map(x=>read(path.join('modules',x))).join('\n');
    const ids=(sources.match(/\.id\s*=|\bid=/g)||[]).length;
    expect(ids).toBeLessThanOrEqual(5);
  });
});
