import { readFileSync } from 'node:fs';
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
    expect(css).toContain('.clock-time { font-size: var(--text-2xl) !important; }');
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
  });

  it('routes scripted animation through the shared motion preference', () => {
    expect(source('core.js')).toContain("dataset.animations === 'off'");
    expect(source('modules/ascii-anim.js')).toContain("typeof prefersReducedMotion==='function'");
    expect(source('modules/digital-pet.js')).toContain("typeof prefersReducedMotion==='function'");
  });
});
