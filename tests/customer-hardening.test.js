import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

describe('customer-facing hardening', () => {
  it('escapes forge-provided star/fork values before innerHTML injection', () => {
    expect(read('modules/git.js')).toContain("escHtml(repo.stars)");
    expect(read('modules/git.js')).toContain("escHtml(repo.forks)");
    expect(read('modules/git.js')).not.toMatch(/"' \+ repo\.stars \+/);
    expect(read('modules/git.js')).not.toMatch(/"' \+ repo\.forks \+/);
  });

  it('renders a configure empty state when iframe has no URL', () => {
    const src = read('modules/iframe.js');
    expect(src).toContain("if(!sec.url)");
    expect(src).toContain("ds.empty('frame'");
  });

  it('routes Proxmox fetches through shared WarTabHttp with a poller and timeout', () => {
    const src = read('modules/proxmox.js');
    expect(src).not.toMatch(/fetch\(base \+ endpoint/);
    expect(src).toContain("WarTabHttp.request(base + endpoint");
    expect(src).toContain('timeout: 15000');
    expect(src).toContain("WarTabHttp.createPoller({ owner: cw");
  });

  it('ships no private deployment URL in any module default', () => {
    const combined = fs.readdirSync('modules').filter((n) => n.endsWith('.js'))
      .map((n) => read(path.join('modules', n))).join('\n');
    expect(combined).not.toMatch(/tab\.warho\.me/);
    expect(combined).not.toMatch(/10\.0\.0\.227/);
  });
});
