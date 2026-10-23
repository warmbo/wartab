import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

// Browser-extension mode is the only mode reachable without a live server, so
// these tests pin the note contract that server mode already returns.
function loadExtensionStorage(seed = {}) {
  const data = { ...seed };
  const chrome = {
    runtime: { getURL: (p) => 'chrome-extension://wartab/' + p, lastError: null },
    storage: {
      local: {
        get(keys, callback) {
          const result = {};
          const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {});
          list.forEach((key) => { if (key in data) result[key] = data[key]; });
          callback(result);
        },
        set(values, callback) { Object.assign(data, values); callback(); },
      },
    },
  };
  const harness = loadBrowserScript('storage.js', ['storage'], { chrome });
  return { ...harness, data };
}

describe('storage note contract', () => {
  it('returns {id, content} for notes, matching server mode', async () => {
    const h = loadExtensionStorage({ wartab_note_alpha: '<p>hello</p>' });

    await expect(h.exports.storage.getNote('alpha')).resolves.toEqual({ id: 'alpha', content: '<p>hello</p>' });
    // Cached second read keeps the same shape (notes.js reads .content).
    await expect(h.exports.storage.getNote('alpha')).resolves.toEqual({ id: 'alpha', content: '<p>hello</p>' });
    h.cleanup();
  });

  it('resolves a missing note to empty content instead of undefined', async () => {
    const h = loadExtensionStorage();

    await expect(h.exports.storage.getNote('missing')).resolves.toEqual({ id: 'missing', content: '' });
    h.cleanup();
  });

  it('round-trips a saved note through the same shape', async () => {
    const h = loadExtensionStorage();

    await h.exports.storage.saveNote('beta', 'typed text');
    await expect(h.exports.storage.getNote('beta')).resolves.toEqual({ id: 'beta', content: 'typed text' });
    expect(h.data.wartab_note_beta).toBe('typed text');
    h.cleanup();
  });
});
