import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function loadHttp() {
  window.eval(fs.readFileSync(path.resolve('http.js'), 'utf8'));
  return window.WarTabHttp;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('production HTTP and polling helpers', () => {
  let http;

  beforeEach(() => {
    delete window.WarTabHttp;
    http = loadHttp();
  });

  it('rejects non-success responses and parses successful content by type', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('offline'), headers: { get: () => 'text/plain' } })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }), headers: { get: () => 'application/json' } });

    await expect(http.request('/fail', { fetch: fetcher })).rejects.toThrow('HTTP 503: offline');
    await expect(http.request('/ok', { fetch: fetcher })).resolves.toEqual({ ok: true });
  });

  it('aborts requests that exceed their timeout', async () => {
    vi.useFakeTimers();
    let signal;
    const request = http.request('/slow', {
      timeout: 50,
      fetch: vi.fn((_url, options) => {
        signal = options.signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      }),
    });
    const rejection = expect(request).rejects.toThrow('Request timed out');

    await vi.advanceTimersByTimeAsync(50);

    await rejection;
    expect(signal.aborted).toBe(true);
    vi.useRealTimers();
  });

  it('converts synchronous fetch failures to rejections and clears the timeout', async () => {
    vi.useFakeTimers();
    const request = http.request('/broken', {
      timeout: 50,
      fetch: () => { throw new Error('sync failure'); },
    });

    await expect(request).rejects.toThrow('sync failure');
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('polls without overlapping requests and schedules from completion', async () => {
    vi.useFakeTimers();
    const operations = [deferred(), deferred()];
    const task = vi.fn(() => operations[task.mock.calls.length - 1].promise);
    const onData = vi.fn();
    const poller = http.createPoller({ task, interval: 100, onData });

    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(task).toHaveBeenCalledTimes(1);

    operations[0].resolve('first');
    await Promise.resolve();
    expect(onData).toHaveBeenCalledWith('first');
    await vi.advanceTimersByTimeAsync(99);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);

    poller.dispose();
    operations[1].resolve('second');
    await Promise.resolve();
    expect(onData).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('registers disposal with the render owner', () => {
    const owner = document.createElement('div');
    const addCleanup = vi.fn();
    window.WarTabLifecycle = { addCleanup };

    const poller = http.createPoller({ owner, task: () => new Promise(() => {}), interval: 100 });

    expect(addCleanup).toHaveBeenCalledWith(owner, poller.dispose);
  });

  it('pauses and resumes polling without overlapping an in-flight task', async () => {
    vi.useFakeTimers();
    const operation = deferred();
    const task = vi.fn(() => operation.promise);
    const poller = http.createPoller({ task, interval: 100 });

    poller.pause();
    poller.resume();
    expect(task).toHaveBeenCalledTimes(1);
    operation.resolve('done');
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);
    expect(task).toHaveBeenCalledTimes(2);

    poller.dispose();
    vi.useRealTimers();
  });
});
