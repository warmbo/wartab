import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

function loadRender() {
  window.eval(fs.readFileSync(path.resolve('render.js'), 'utf8'));
}

describe('section style projection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    loadRender();
  });

  it('projects every selector-driving style and type role from one helper', () => {
    const content = document.createElement('div');
    const title = document.createElement('button');
    const section = {
      styles: {
        align: 'center',
        scale: 'large',
        density: 'comfortable',
        fontScale: { title: 1.2, content: 1.4, secondary: 0.8 },
      },
    };

    window.applySectionStyles(section, content, title);

    expect(content.dataset.modScale).toBe('large');
    expect(content.dataset.modDensity).toBe('comfortable');
    expect(content.style.getPropertyValue('--mod-density')).toBe('1.5');
    expect(content.style.getPropertyValue('--mod-scale-factor')).toBe('1.15');
    expect(content.style.getPropertyValue('--mod-df')).toBe('');
    expect(content.style.getPropertyValue('--mod-font-content')).toBe('1.4');
    expect(content.style.getPropertyValue('--mod-font-secondary')).toBe('0.8');
    expect(content.style.textAlign).toBe('center');
    expect(title.style.getPropertyValue('--mod-font-title')).toBe('1.2');
    expect(title.style.getPropertyValue('--mod-align')).toBe('center');
    expect(title.style.getPropertyValue('--mod-scale-factor')).toBe('1.15');
  });

  it('patches one section option without reverting the other style options', () => {
    const content = document.createElement('div');
    const section = { styles: { align: 'right', density: 'compact', scale: 'small' } };

    window.patchSectionStyles(section, { density: 'comfortable' }, content, null);

    expect(section.styles).toEqual({ align: 'right', density: 'comfortable', scale: 'small' });
    expect(content.dataset.modScale).toBe('small');
    expect(content.dataset.modDensity).toBe('comfortable');
    expect(content.style.getPropertyValue('--mod-align')).toBe('right');
  });

  it('patches every card section while preserving per-option values not being changed', () => {
    const card = { sections: [
      { styles: { align: 'left', density: 'compact', scale: 'small' } },
      { styles: { align: 'right', density: 'standard', scale: 'large' } },
    ] };

    window.patchCardSectionStyles(card, { density: 'comfortable' });

    expect(card.sections[0].styles).toEqual({ align: 'left', density: 'comfortable', scale: 'small' });
    expect(card.sections[1].styles).toEqual({ align: 'right', density: 'comfortable', scale: 'large' });
  });

  it('live editor styling uses the shared projection without frozen pixel sizes', () => {
    const editor = fs.readFileSync(path.resolve('section-editor.js'), 'utf8');
    const editPanel = fs.readFileSync(path.resolve('edit-panel.js'), 'utf8');
    const render = fs.readFileSync(path.resolve('render.js'), 'utf8');
    const css = fs.readFileSync(path.resolve('style.css'), 'utf8');
    // Per-section style panels were removed; all style controls are now card-level only
    expect(editor).not.toContain('applyStyleVars');
    expect(editor).not.toContain('se-style-panel');
    expect(editor).not.toContain('mkFontSlider');
    // Card-level Layout section in edit-panel.js drives all sections
    expect(editPanel).toContain("patchCardSectionStyles(card, { density: v })");
    expect(editPanel).toContain("patchCardSectionStyles(card, { scale: v })");
    expect(render).toContain("moduleSurface.className = 'module-style-surface'");
    expect(css).toMatch(/\.module-style-surface\s*\{[^}]*zoom:\s*var\(--mod-scale-factor/s);
    expect(editor).not.toContain('_baseFs');
    expect(editor).not.toContain('el.style.fontSize =');
  });
});
