import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

function rootScriptSources() {
  const html = fs.readFileSync('index.html', 'utf8');
  return Array.from(html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"}]*)?"/g), (match) => match[1])
    .filter((source) => !source.includes('/') && source !== 'build-meta.js');
}

describe('extension package manifest', () => {
  it('includes every root JavaScript file loaded by index.html', () => {
    const build = fs.readFileSync('extension/build.sh', 'utf8');
    const missing = rootScriptSources().filter((source) => !new RegExp(`^\\s*${source.replace('.', '\\.') }\\s*$`, 'm').test(build));

    expect(missing).toEqual([]);
  });
});
