import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

describe('telemetry panel computed layout', () => {
  it('open-state rules override the base max-width:40% clamp', () => {
    const css = readFileSync('style.css', 'utf8');
    // Base rule (line ~261) clamps width to 40% of the tiny System button.
    const base = css.match(/#top-stats \{[^}]*\}/)?.[0] || '';
    expect(base).toContain('max-width: 40%');
    expect(base).toContain('overflow: hidden');
    // The [open] rule must explicitly defeat both clamps.
    const open = css.match(/\.telemetry-disclosure\[open\] #top-stats:not\(\.hidden\)\{[^}]*\}/)?.[0] || '';
    expect(open).toContain('min-width:280px');
    expect(open).toContain('max-width:280px');
    expect(open).toContain('overflow:visible');
    expect(open).toContain('width:280px');
  });

  it('stat labels/values are readable in the open panel', () => {
    const css = readFileSync('style.css', 'utf8');
    const label = css.match(/\.telemetry-disclosure\[open\] #top-stats \.stat-item \.stat-label\{[^}]*\}/)?.[0] || '';
    expect(label).toContain('color:var(--text-secondary)');
    expect(label).toContain('text-transform:none');
    const value = css.match(/\.telemetry-disclosure\[open\] #top-stats \.stat-item \.stat-value\{[^}]*\}/)?.[0] || '';
    expect(value).toContain('color:var(--text-primary)');
  });
});
import { readFileSync } from 'node:fs';
