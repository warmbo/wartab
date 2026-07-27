import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function loadStore() {
  window.eval(fs.readFileSync(path.resolve('config-store.js'), 'utf8'));
  return window.WarTabConfigStore;
}

describe('production config save queue', () => {
  let store;

  beforeEach(() => {
    delete window.WarTabConfigStore;
    store = loadStore();
  });

  it('serializes writes and coalesces unsent snapshots to the newest state', async () => {
    const writes = [];
    const pending = [];
    const saver = store.createConfigSaver({
      write(snapshot) {
        writes.push(snapshot);
        const operation = deferred();
        pending.push(operation);
        return operation.promise;
      },
    });

    const first = saver.save({ value: 1 });
    const second = saver.save({ value: 2 });
    const third = saver.save({ value: 3 });

    expect(writes).toEqual([{ value: 1 }]);
    pending[0].resolve();
    await first;
    await Promise.resolve();
    expect(writes).toEqual([{ value: 1 }, { value: 3 }]);

    pending[1].resolve();
    await expect(Promise.all([second, third])).resolves.toEqual([
      { value: 3 }, { value: 3 },
    ]);
  });

  it('clones snapshots before queued mutations can alter them', async () => {
    const writes = [];
    const saver = store.createConfigSaver({
      write(snapshot) { writes.push(snapshot); return Promise.resolve(); },
    });
    const config = { nested: { value: 1 } };

    const saved = saver.save(config);
    config.nested.value = 9;

    await expect(saved).resolves.toEqual({ nested: { value: 1 } });
    expect(writes).toEqual([{ nested: { value: 1 } }]);
  });

  it('reports a failed write and continues with the newest pending snapshot', async () => {
    const operations = [deferred(), deferred()];
    const onError = vi.fn();
    let index = 0;
    const saver = store.createConfigSaver({
      write() { return operations[index++].promise; },
      onError,
    });

    const failed = saver.save({ value: 1 });
    const next = saver.save({ value: 2 });
    operations[0].reject(new Error('disk full'));

    await expect(failed).rejects.toThrow('disk full');
    expect(onError).toHaveBeenCalledTimes(1);
    operations[1].resolve();
    await expect(next).resolves.toEqual({ value: 2 });
  });

  it('notifies success with the exact persisted snapshot', async () => {
    const onSaved = vi.fn();
    const saver = store.createConfigSaver({
      write() { return Promise.resolve(); },
      onSaved,
    });

    await saver.save({ value: 1 });

    expect(onSaved).toHaveBeenCalledWith({ value: 1 });
  });

  it('does not turn a successful write into a failure when its notification throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const saver = store.createConfigSaver({
      write() { return Promise.resolve(); },
      onSaved() { throw new Error('listener failed'); },
    });

    await expect(saver.save({ value: 1 })).resolves.toEqual({ value: 1 });
    await expect(saver.save({ value: 2 })).resolves.toEqual({ value: 2 });
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
