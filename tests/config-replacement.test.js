import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBrowserScript } from './browser-harness.js';

const loaded = [];
afterEach(() => {
  while (loaded.length) loaded.pop().cleanup();
});

function loadConfigPanel(globals) {
  const script = loadBrowserScript(
    'config-panel.js',
    ['persistImportedConfig', 'restoreConfigSnapshot'],
    globals,
  );
  loaded.push(script);
  return script.exports;
}

describe('whole-config replacement ordering', () => {
  it('normalizes an imported config before persisting it through the ordered saver', async () => {
    const order = [];
    const globals = {
      config: { old: true },
      DEFAULT_CONFIG: { defaults: true },
      cloneObj: value => structuredClone(value),
      deepMerge: (_base, imported) => ({ imported }),
      pageInit: vi.fn(() => order.push('normalize')),
      saveConfig: vi.fn(async () => order.push('save')),
    };
    const { persistImportedConfig } = loadConfigPanel(globals);

    await persistImportedConfig({ value: 7 });

    expect(order).toEqual(['normalize', 'save']);
    expect(globals.saveConfig).toHaveBeenCalledOnce();
  });

  it('drains ordered saves before restore and normalizes the reloaded config', async () => {
    const order = [];
    const globals = {
      config: { current: true },
      saveConfig: vi.fn(async () => order.push('drain')),
      storage: { snapshots: { restore: vi.fn(async () => order.push('restore')) } },
      loadConfig: vi.fn(async () => order.push('load')),
      pageInit: vi.fn(() => order.push('normalize')),
    };
    const { restoreConfigSnapshot } = loadConfigPanel(globals);

    await restoreConfigSnapshot('snapshot-name');

    expect(order).toEqual(['drain', 'restore', 'load', 'normalize']);
  });
});
