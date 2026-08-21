import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('section-editor rows integration', () => {
  it('wires the rows field type to cpRows in the settings schema renderer', () => {
    const src = fs.readFileSync('section-editor.js', 'utf8');
    expect(src).toContain("case 'rows':");
    expect(src).toContain('mc.appendChild(cpRows({');
    expect(src).toContain('labelPh: f.placeholder');
    expect(src).toContain('valuePh: f.valuePlaceholder');
  });

  it('declares service-status and network-status targets as structured rows', () => {
    const info = fs.readFileSync('modules/information.js', 'utf8');
    expect(info).toContain("type:'rows'");
    expect(info).not.toContain('Label|URL per line');
    const net = fs.readFileSync('modules/network-status.js', 'utf8');
    expect(net).toContain("type:'rows'");
    expect(net).not.toContain('Label|Host per line');
  });
});
