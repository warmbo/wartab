import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = p => fs.readFileSync(p, 'utf8');

describe('audit round 3 fixes', () => {
  it('scopes the 1400px telemetry disclosure to the closed inline strip only', () => {
    const css = read('style.css');
    const block = css.match(/@media \(max-width: 1400px\) \{([\s\S]*?)\n\}/)?.[1] || '';
    expect(block).toContain('.telemetry-disclosure:not([open]) #top-stats .stat-bar');
    expect(block).not.toContain('\n  #top-stats .stat-bar');
    expect(block).not.toContain('\n  #top-stats .stat-item:first-child');
  });

  it('closes the System telemetry dropdown on Esc and outside click', () => {
    const app = read('app.js');
    expect(app).toContain("const telemetry=document.querySelector('.telemetry-disclosure[open]');");
    expect(app).toContain("telemetry.removeAttribute('open')");
    expect(app).toContain("if(telemetry&&!telemetry.contains(e.target))");
  });

  it('never produces undefined+query when an engine is deleted or renamed', () => {
    const render = read('render.js');
    expect(render).toContain("const engines=config.search&&config.search.engines?config.search.engines:{};");
    expect(render).toContain("const fallbackUrl='https://duckduckgo.com/?q=';");
    expect(render).toContain("engines[engine]||engines[config.search&&config.search.selected]||engines['Google']||fallbackUrl");
  });

  it('guards engine rename collisions and refreshes the default-engine select', () => {
    const panel = read('config-panel.js');
    expect(panel).toContain('An engine named "');
    expect(panel).toContain('val in map');
    expect(panel).toContain('renderSearchPanel()');
    expect(panel).toContain('engineSelectWrap.innerHTML=\'\'');
  });

  it('measures command-deck menu size at runtime for positioning', () => {
    const ux = read('ux-system.js');
    expect(ux).toContain('menu.offsetWidth||236');
    expect(ux).toContain('menu.offsetHeight||400');
    expect(ux).toContain('window.innerWidth-mw-8');
    expect(ux).toContain('window.innerHeight-mh-8');
    expect(ux).not.toContain('rect.right-220');
  });

  it('wraps the popover closed-state rule in @supports for fallback browsers', () => {
    const css = read('style.css');
    expect(css).toContain('@supports selector(:popover-open){.command-deck-menu:not(:popover-open){display:none}}');
  });

  it('disposes the stats poller object instead of clearInterval on a no-op', () => {
    const render = read('render.js');
    expect(render).toContain("if(typeof statsTimer.dispose==='function')statsTimer.dispose();else clearInterval(statsTimer);");
  });

  it('brings context menu and ux-surface radii onto the token scale', () => {
    const css = read('style.css');
    const ctx = css.match(/\.site-context-menu \{[\s\S]*?\n\}/)?.[0] || '';
    expect(ctx).toContain('border-radius: var(--radius)');
    const item = css.match(/\.site-context-item \{[\s\S]*?\n\}/)?.[0] || '';
    expect(item).toContain('border-radius: var(--control-radius)');
    expect(css).toContain('.ux-surface{width:min(1120px,100%);max-height:min(880px,calc(100vh - 48px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--glass-border-hover);border-radius:var(--radius)');
  });

  it('converts stat labels to readable secondary color and palette badges to pills', () => {
    const css = read('style.css');
    expect(css).toContain('.stat-item .stat-label { font-weight: 500; color: var(--text-secondary);');
    expect(css).toContain('border-radius: 999px; color: var(--text-tertiary, rgba(255,255,255,0.5));');
  });

  it('coerces unbounded number settings to real numbers with default fallback', () => {
    const editor = read('section-editor.js');
    expect(editor).toContain("var parsed=parseInt(num.value,10);");
    expect(editor).toContain("Number.isFinite(parsed)?parsed:(f.default!==undefined?f.default:0)");
  });

  it('bounds the link-usage store with LRU eviction', () => {
    const core = read('core.js');
    expect(core).toContain("if(urls.length>120)");
    expect(core).toContain("urls.sort(function(a,b){return (usage[a].last||0)-(usage[b].last||0);});");
    expect(core).toContain("urls.slice(0,urls.length-120).forEach(function(u){delete usage[u];});");
  });

  it('coalesces the module-surface MutationObserver re-tag via rAF', () => {
    const render = read('render.js');
    expect(render).toContain("if(_observeRaf)return;");
    expect(render).toContain("_observeRaf=requestAnimationFrame");
    expect(render).toContain("cancelAnimationFrame(_observeRaf)");
  });

  it('raises the resource-monitor default poll interval from 3s to 5s', () => {
    const rm = read('modules/resource-monitor.js');
    expect(rm).toContain('refreshInterval:5');
    expect(rm).not.toContain('refreshInterval||3');
  });
});
