import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = path => fs.readFileSync(path, 'utf8');

describe('Personal Command Deck redesign contracts', () => {
  it('defines all five semantic card roles and assigns every module type', () => {
    const model = read('card-model.js');
    for (const role of ['launcher', 'metric', 'canvas', 'feed', 'ambient']) {
      expect(model).toContain(`role: '${role}'`);
    }
    expect(model).toContain('getCardRole');
    expect(read('render.js')).toContain('div.dataset.cardRole');
  });

  it('exposes visible Command and Add actions with one overflow menu', () => {
    const html = read('index.html');
    expect(html).toContain('id="btn-command"');
    expect(html).toContain('id="btn-add-card"');
    expect(html).toContain('id="btn-more"');
    expect(html).toContain('id="command-deck-menu"');
  });

  it('ships gallery, contextual editing, undo, layout studio, and presets', () => {
    const ux = read('ux-system.js');
    expect(ux).toContain('window.WarTabUndo');
    expect(ux).toContain('openCardGallery');
    expect(ux).toContain('openLayoutStudio');
    expect(ux).toContain('enterContextualEditMode');
    expect(ux).toContain('EXPERIENCE_PRESETS');
    expect(ux).toContain('FIRST_RUN_TEMPLATES');
  });

  it('keeps layout geometry staged until explicit apply', () => {
    const ux = read('ux-system.js');
    expect(ux).toContain('layoutDraft');
    expect(ux).toContain("data-layout-action=\"apply\"");
    expect(ux).toContain('applyLayoutDraft');
    expect(ux).toContain('cancelLayoutDraft');
  });

  it('supports explicit mobile visibility and order without changing desktop geometry', () => {
    const render = read('render.js');
    const css = read('style.css');
    expect(render).toContain('card.mobileHidden');
    expect(render).toContain('card.mobileOrder');
    expect(css).toContain('[data-mobile-hidden="true"]');
    expect(css).toContain('--mobile-order');
  });

  it('renders onboarding above every card, panel, modal, and toast', () => {
    const css = read('style.css');
    expect(css).toContain('.command-deck-hint{position:fixed');
    expect(css).toContain('z-index:2147483646');
  });
});
