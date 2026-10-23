import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// notes.js registers its module at load time; the paste/link helpers live at
// top level next to it, so a stub registrar is enough to reach them.
function loadNotes() {
  const registered = {};
  window.registerModule = (type, definition) => { registered[type] = definition; };
  window.eval(fs.readFileSync(path.resolve('modules/notes.js'), 'utf8'));
  return registered;
}

function clean(html) {
  const host = document.createElement('div');
  host.innerHTML = window.notesSanitizePaste(html);
  return host;
}

describe('notes paste safety', () => {
  afterEach(() => { delete window.registerModule; });

  it('registers the notes module with paste and link handlers', () => {
    loadNotes();
    const source = fs.readFileSync(path.resolve('modules/notes.js'), 'utf8');
    expect(source).toContain("addEventListener('paste'");
    expect(source).toContain('notesSanitizePaste');
    expect(source).toContain('notesSafeHref(a.getAttribute(');
  });

  it('drops scripts, styles and embedded media from pasted markup', () => {
    const host = clean('<p onclick="steal()">Hi <b>there</b></p><script>alert(1)</script><style>*{display:none}</style><iframe src="//evil"></iframe><object data="x"></object><svg onload="alert(1)"></svg>');

    expect(host.querySelector('script,style,iframe,object,svg')).toBeNull();
    expect(host.querySelector('p').hasAttribute('onclick')).toBe(false);
    expect(host.innerHTML).toBe('<p>Hi <b>there</b></p>');
  });

  it('keeps safe formatting and unwraps unknown tags instead of dropping their text', () => {
    const host = clean('<div><span>keep</span></div><h3>T</h3><ul><li>one</li></ul><strong>b</strong><code>c</code>');

    expect(host.querySelector('div,span')).toBeNull();
    expect(host.textContent).toContain('keep');
    expect(host.querySelector('h3')?.textContent).toBe('T');
    expect(host.querySelectorAll('li')).toHaveLength(1);
    expect(host.querySelector('strong')?.textContent).toBe('b');
    expect(host.querySelector('code')?.textContent).toBe('c');
  });

  it('keeps http(s) links, unwraps dangerous ones and strips pasted attributes', () => {
    const safe = clean('<a href="https://example.com/x" class="c" style="color:red" onclick="x()">x</a>').querySelector('a');
    expect(safe.getAttribute('href')).toBe('https://example.com/x');
    expect(safe.getAttribute('rel')).toBe('noopener');
    expect(safe.hasAttribute('class')).toBe(false);
    expect(safe.hasAttribute('style')).toBe(false);
    expect(safe.hasAttribute('onclick')).toBe(false);

    const bad = clean('<a href="javascript:alert(1)">click</a>');
    expect(bad.querySelector('a')).toBeNull();
    expect(bad.textContent).toBe('click');
  });

  it('only keeps images from http(s) or the app upload paths, without pasted sizing attributes', () => {
    const img = clean('<img src="https://cdn.example/a.png" alt="a" width="9000" height="9000" style="width:9000px" onerror="alert(1)">').querySelector('img');
    expect(img.getAttribute('src')).toBe('https://cdn.example/a.png');
    expect(img.getAttribute('alt')).toBe('a');
    expect(img.hasAttribute('width')).toBe(false);
    expect(img.hasAttribute('onerror')).toBe(false);
    expect(img.style.width).toBe('');
    expect(img.style.maxWidth).toBe('100%');

    expect(clean('<img src="/uploads/local.png">').querySelector('img')?.getAttribute('src')).toBe('/uploads/local.png');
    expect(clean('<img src="data:image/svg+xml,<svg onload=alert(1)>">').querySelector('img')).toBeNull();
    expect(clean('<img src="x" onerror="alert(1)">').querySelector('img')).toBeNull();
  });

  it('exposes the sanitizer output as inert html', () => {
    expect(window.notesSanitizePaste('<script>alert(1)</script>')).toBe('');
    expect(window.notesSanitizePaste('')).toBe('');
    expect(window.notesSanitizePaste(undefined)).toBe('');
  });
});

describe('notes linkify helpers', () => {
  it('trims trailing sentence punctuation but keeps balanced parentheses', () => {
    loadNotes();
    expect(window.notesTrimUrl('https://example.com.')).toBe('https://example.com');
    expect(window.notesTrimUrl('https://example.com/a,')).toBe('https://example.com/a');
    expect(window.notesTrimUrl('https://en.wikipedia.org/wiki/Foo_(bar)')).toBe('https://en.wikipedia.org/wiki/Foo_(bar)');
    expect(window.notesTrimUrl('https://example.com/x):')).toBe('https://example.com/x');
    expect(window.notesTrimUrl('https://example.com')).toBe('https://example.com');
  });

  it('only accepts http(s) hrefs for click-through', () => {
    expect(window.notesSafeHref('https://example.com')).toBe('https://example.com');
    expect(window.notesSafeHref('HTTP://example.com')).toBe('HTTP://example.com');
    expect(window.notesSafeHref('javascript:alert(1)')).toBeNull();
    expect(window.notesSafeHref('data:text/html,x')).toBeNull();
    expect(window.notesSafeHref('')).toBeNull();
    expect(window.notesSafeHref(undefined)).toBeNull();
  });
});
