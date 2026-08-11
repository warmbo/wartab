import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

let loaded;
afterEach(() => loaded?.cleanup());

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function source(path) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

function hoverBlocks(css) {
  return [...css.matchAll(/([^{}]+:hover[^{}]*)\{([^{}]*)\}/g)].map(match => ({
    selector: match[1].trim(),
    body: match[2],
  }));
}

describe('configurable icon contract', () => {
  it('renders Lucide, image URL, and emoji values through one safe helper', () => {
    loaded = loadBrowserScript('design-system.js', ['ds'], {
      isLucideName: value => value === 'house',
      renderLucideEl: (name, cls) => {
        const icon = loaded.document.createElement('i');
        icon.dataset.lucide = name;
        icon.className = cls;
        return icon;
      },
    });

    const lucide = loaded.exports.ds.icon('house', 'role-icon');
    const image = loaded.exports.ds.icon('/uploads/icons/home.png', 'role-icon');
    const emoji = loaded.exports.ds.icon('🏠', 'role-icon');

    expect(lucide.dataset.lucide).toBe('house');
    expect(image.tagName).toBe('IMG');
    expect(image.getAttribute('src')).toBe('/uploads/icons/home.png');
    expect(image.className).toBe('role-icon');
    expect(emoji.textContent).toBe('🏠');
    expect(emoji.classList.contains('emoji-icon')).toBe(true);
  });

  it('uses the shared icon helper on every page icon surface', () => {
    for (const path of ['pages.js', 'page-editor.js', 'config-panel.js', 'edit-panel.js']) {
      expect(source(path), `${path} should use ds.icon`).toContain('ds.icon(');
    }
    expect(source('render.js')).toContain("ds.icon('pencil'");
  });

  it('exposes page tabs as keyboard controls with a non-color selected state', () => {
    const pages = source('pages.js');
    expect(pages).toContain("document.createElement('button')");
    expect(pages).toContain("setAttribute('aria-current', 'page')");
  });
});

describe('interaction consistency contract', () => {
  const css = source('style.css');

  it('keeps keyboard focus visible and disabled controls distinct', () => {
    expect(css).toMatch(/:where\([^)]*button[^)]*\):focus-visible/);
    expect(css).toMatch(/:where\([^)]*button[^)]*\):disabled/);
  });

  it('does not lift or scale cards and controls on hover', () => {
    const offenders = hoverBlocks(css).filter(({ selector, body }) =>
      /(\.card|\.btn|button|\.page-tab|\.link-item|\.icon-grid-item)/.test(selector)
      && /transform\s*:(?!\s*none)/.test(body)
    );
    expect(offenders.map(block => block.selector)).toEqual([]);
  });

  it('exposes hover hints to coarse-pointer users', () => {
    const coarsePointer = css.match(/@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)\s*\{([\s\S]*?)\n\}/);
    expect(coarsePointer?.[1]).toContain('.quotes-hint');
    expect(coarsePointer?.[1]).toContain('.timer-hint');
    expect(coarsePointer?.[1]).toContain('.search-hint');
  });

  it('applies top-bar scaling after the base component rules', () => {
    expect(css.indexOf('/* Top-bar scale — controlled')).toBeGreaterThan(css.indexOf('#top-actions .btn-icon:hover'));
    expect(css).toContain('font-size: clamp(var(--text-sm), calc(var(--text-lg) * var(--topbar-scale)), calc(var(--text-lg) + 1px))');
    expect(css).toContain('font-size: clamp(var(--text-2xs), calc(var(--text-xs) * var(--topbar-scale)), var(--text-sm))');
    expect(css).toContain('padding: clamp(6px, calc(6px * var(--topbar-scale)), 8px) clamp(14px, calc(18px * var(--topbar-scale)), 22px)');
    expect(css).toContain('width: clamp(22px, calc(24px * var(--topbar-scale)), 26px)');
    expect(css).toContain('min-width: clamp(28px, calc(30px * var(--topbar-scale)), 36px)');
    expect(css).toContain('width: clamp(14px, calc(16px * var(--topbar-scale)), 18px)');
    expect(css).not.toContain('min-width: calc(32px * var(--topbar-scale))');
  });

  it('progressively discloses top-bar telemetry before it can overlap navigation', () => {
    const compactTelemetry = css.match(/@media \(max-width: 1400px\) \{([\s\S]*?)\n\}/);
    expect(compactTelemetry?.[1]).toContain('#top-stats .stat-bar');
    expect(compactTelemetry?.[1]).toContain('#top-stats .stat-item:first-child');
    expect(compactTelemetry?.[1]).toContain('#top-stats .stat-item:last-child');
  });

  it('keeps arrange mode available to touch and keyboard users', () => {
    const arrange = source('arrange-mode.js');
    expect(arrange).toContain("addEventListener('click'");
    expect(arrange).toContain("addEventListener('focusin'");
    expect(arrange).toContain("e.key !== 'Enter' && e.key !== ' '");
    expect(arrange).toContain("setAttribute('aria-pressed'");
    expect(source('index.html')).toContain('aria-label="Arrange cards" aria-pressed="false"');
  });

  it('gives icon-picker choices keyboard semantics and restores focus', () => {
    const picker = source('icon-picker.js');
    expect(picker).toContain("setAttribute('role','button')");
    expect(picker).toContain("setAttribute('tabindex','0')");
    expect(picker).toContain('_iconPickerReturnFocus.focus()');
    expect(source('index.html')).toContain('role="tablist"');
  });

  it('owns compact card spacing in the final responsive layer', () => {
    expect(css.lastIndexOf('/* Final responsive ownership')).toBeGreaterThan(css.lastIndexOf('.card > .card-body'));
    expect(css).toContain('.card-body [data-mod-scale] .clock-time { font-size: clamp(32px, calc(var(--text-2xl) * var(--mod-font-content, 1)), 48px); }');
    expect(css).toContain('.card-title { font-size: clamp(16px, var(--type-card-title), 24px);');
    expect(css).not.toContain('.clock-time { font-size: var(--text-2xl) !important; }');
  });

  it('does not compress the top bar behind bottom-sheet panels', () => {
    const mobile = css.match(/@media \(max-width: 768px\) \{\s*body\.panel-open #top-bar \{([\s\S]*?)\n\s*\}/);
    expect(mobile?.[1]).toContain('padding-right: 0');
    expect(mobile?.[1]).toContain('padding-left: 0');
    expect(css).toContain('body.panel-open.panel-left #top-bar');
  });

  it('keeps mobile framing and active feedback restrained', () => {
    expect(css).not.toContain('#app { padding: 0 !important');
    expect(css).not.toContain('#card-grid { grid-template-columns: 1fr !important; gap: 0; }');
    expect(css).not.toContain('animation: arrange-spin');
    expect(css).not.toContain('0 0 70px');
    expect(css).toContain('.dp-actions .btn, .notes-tb button');
    const ascii = source('modules/ascii-anim.js');
    expect(ascii).toContain('Math.floor(pw/charW)');
    expect(ascii).not.toContain('ensure the grid overfills');
  });

  it('closes independent-review responsive and selector-contract findings', () => {
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*?#top-bar\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/s);
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*?#top-actions\s*\{[^}]*position:\s*static/s);
    expect(css).toContain('#top-stats .stat-item:first-child, #top-stats .stat-item:last-child { display: flex; }');
    expect(css).not.toContain('#page-tabs { overflow-x: auto;');
    expect(css).not.toContain('.notes-toolbar');
    expect(css).not.toContain('.link-grid-item');
    expect(css).not.toContain('.link-list-item');
    expect(css).not.toContain('.dp-stat-label');
    expect(css).not.toContain('.dp-stat-value');
    expect(css).toContain('font-size: max(11px, var(--type-meta))');
    expect(css).toContain('font-size: max(12px, var(--type-meta))');
    // config.json is gitignored runtime state (absent on fresh clones) — only
    // assert the layout contract when a live config is actually present.
    if (existsSync(resolve(repositoryRoot, 'config.json'))) {
      expect(JSON.parse(source('config.json')).layout.gap).toBe(12);
    }

    const pet = source('modules/digital-pet.js');
    expect(pet).toContain('creature.getBoundingClientRect().width');
    expect(pet).toContain("token.className='dp-info-token'");
  });

  it('gives typography one late semantic ownership layer', () => {
    expect(css.lastIndexOf('AURA TYPOGRAPHY SYSTEM')).toBeGreaterThan(css.lastIndexOf('VISUAL EXCELLENCE'));
    expect(css).toContain('--type-card-title: 15px');
    expect(css).toContain('--type-panel-title: 18px');
    expect(css).toMatch(/\.card-title\s*\{[^}]*font-size:\s*var\(--type-card-title\)/s);
    expect(css).toMatch(/\.slide-panel-header h2,\s*\.modal-title\s*\{[^}]*font-size:\s*var\(--type-panel-title\)/s);
    expect(css).toMatch(/\.dropdown-toggle,\s*\.ds-module-title\s*\{[^}]*font-size:\s*var\(--type-label\)/s);
    expect(css).toMatch(/\.stat-item \.stat-value,[^}]*font-variant-numeric:\s*tabular-nums/s);
    expect(css).toMatch(/\.quotes-text\s*\{[^}]*line-height:\s*1\.65/s);
    expect(css).toMatch(/button,\s*input,\s*select,\s*textarea\s*\{[^}]*font-family:\s*inherit/s);
    expect(css).toContain('--text-tertiary: rgba(255, 255, 255, 0.48)');
    expect(source('theme.js')).toContain('hexToRgba(fc,0.48)');
  });

  it('uses one structural rhythm across cards, sections, links, and dense modules', () => {
    expect(css).toContain('--card-inline: var(--space-4)');
    expect(css).toMatch(/\.card-header\s*\{[^}]*padding:[^;]*var\(--card-inline\)/s);
    expect(css).toMatch(/\.card-body\s*\{[^}]*padding:[^;]*var\(--card-inline\)/s);
    expect(css).toMatch(/\.dropdown-toggle\s*\{[^}]*min-height:\s*32px[^}]*padding:\s*var\(--space-2\) 0/s);
    expect(css).toMatch(/\.link-item\s*\{\s*[^}]*min-height:\s*76px/s);
    expect(css).toMatch(/\.link-item \.link-icon\s*\{[^}]*width:\s*28px[^}]*height:\s*28px/s);
    expect(css).toMatch(/\.resource-monitor\s*\{[^}]*gap:\s*var\(--space-2\)/s);
    expect(css).toMatch(/\.rm-label-row\s*\{[^}]*font-size:\s*calc\(var\(--text-xs\)/s);
    expect(css).toContain('.dp-actions { display: flex; gap: var(--space-2); }');

    const monitor = source('modules/resource-monitor.js');
    expect(monitor).toContain("row.className='rm-metric-row'");
    expect(monitor).toContain("labelRow.className='rm-label-row'");
    expect(monitor).toContain("cwrap.className='rm-chart-wrap'");
    expect(monitor).toContain("detail.className='rm-value-detail'");
    expect(monitor).toContain('data.length<2');

    const notes = source('modules/notes.js');
    expect(notes).not.toContain('style.cssText');
    expect(notes).toContain("tb.className='notes-tb'");
    expect(notes).toContain("rh.className='notes-resize-handle'");
    expect(notes).toContain('MAX_LINES=15');
    expect(css).toMatch(/\.notes-editor\s*\{[^}]*min-height:\s*90px/s);
    expect(css).toMatch(/#footer\s*\{[^}]*position:\s*static/s);
  });

  it('caps configurable display typography before module scales can overflow cards', () => {
    const clock = source('modules/clock.js');
    const weather = source('modules/weather.js');
    const timer = source('modules/timer.js');
    const quotes = source('modules/quotes.js');
    expect(clock).toContain('clamp(var(--text-xl),calc(var(--text-3xl) * var(--mod-font-content,1)),var(--text-4xl))');
    expect(clock).toContain('letter-spacing:-0.035em');
    expect(weather).toContain('clamp(var(--text-2xl),calc(var(--text-4xl) * var(--mod-font-content,1)),var(--text-5xl))');
    expect(weather).toContain('font-weight:600');
    expect(css).toMatch(/\.timer-display\s*\{[^}]*font-size:\s*clamp\(var\(--text-xl\), calc\(var\(--text-3xl\) \* var\(--mod-font-content, 1\)\), var\(--text-4xl\)\)/s);
    expect(css).toMatch(/\.quotes-text\s*\{[^}]*font-style:\s*italic[^}]*line-height:\s*1\.65/s);
  });

  it('routes scripted animation through the shared motion preference', () => {
    expect(source('core.js')).toContain("dataset.animations === 'off'");
    expect(source('modules/ascii-anim.js')).toContain("typeof prefersReducedMotion==='function'");
    expect(source('modules/digital-pet.js')).toContain("typeof prefersReducedMotion==='function'");
  });
});
