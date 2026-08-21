import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

describe('cpRows structured editor', () => {
  it('parses pipe-strings into rows, serializes on change, adds and removes rows', () => {
    const h = loadBrowserScript('form-helpers.js', ['cpRows'], {});
    let emitted = null;
    const el = h.exports.cpRows({
      value: 'Gateway|10.0.0.1\nInternet|1.1.1.1',
      labelPh: 'Label',
      valuePh: 'Host',
      onChange: (v) => { emitted = v; },
    });
    const inputs = el.querySelectorAll('input');
    expect(inputs.length).toBe(4); // 2 rows × 2 inputs
    expect(inputs[0].value).toBe('Gateway');
    expect(inputs[1].value).toBe('10.0.0.1');
    expect(inputs[2].value).toBe('Internet');

    // Change a value → serialize
    inputs[1].value = '10.0.0.2';
    inputs[1].dispatchEvent(new h.window.Event('change', { bubbles: true }));
    expect(emitted).toBe('Gateway|10.0.0.2\nInternet|1.1.1.1');

    // Add a row
    const add = el.querySelector('.me-link-add');
    add.click();
    expect(el.querySelectorAll('input').length).toBe(6);
    expect(emitted).toBe('Gateway|10.0.0.2\nInternet|1.1.1.1\n|');

    // Remove a row
    const remove = el.querySelector('.me-icon-btn');
    remove.click();
    expect(el.querySelectorAll('input').length).toBe(4);
    expect(emitted).toBe('Internet|1.1.1.1\n|');
    h.cleanup();
  });
});
