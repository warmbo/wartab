import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

describe('readability invariants', () => {
  it('lets the hidden attribute win over component display rules', () => {
    // .link-item{display:flex} / .gallery-card{display:grid} out-specify the
    // UA [hidden] rule, so filtering left invisible-but-visible tiles.
    expect(read('style.css')).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });

  it('routes accent-coloured text and focus rings to the legible token', () => {
    const css = read('style.css');
    expect(/\.ds-badge-info\s*\{[^}]*color:\s*var\(--accent-fg/.test(css)).toBe(true);
    expect(/\.notes-editor a\s*\{[^}]*color:\s*var\(--accent-fg/.test(css)).toBe(true);
    expect(css.includes('--accent-fg: #e6e6e6')).toBe(true);
  });

  it('keeps link labels readable instead of shrinking them to microscopic sizes', () => {
    const links = read('modules/links.js');
    expect(links).not.toContain('shrinkLabels(');
    // Both the grid tile and the list row carry a full-text title tooltip.
    expect((links.match(/\.title\s*=\s*link\.label/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
