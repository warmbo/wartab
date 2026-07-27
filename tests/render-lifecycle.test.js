import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function loadLifecycle() {
  window.eval(fs.readFileSync(path.resolve('render-lifecycle.js'), 'utf8'));
  return window.WarTabLifecycle;
}

describe('production render lifecycle', () => {
  let lifecycle;

  beforeEach(() => {
    delete window.WarTabLifecycle;
    document.body.innerHTML = '';
    lifecycle = loadLifecycle();
  });

  it('composes every cleanup on one owner and runs each exactly once', () => {
    const owner = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();
    lifecycle.addCleanup(owner, first);
    lifecycle.addCleanup(owner, second);

    lifecycle.cleanupElement(owner);
    lifecycle.cleanupElement(owner);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cleans descendants before their parent', () => {
    const order = [];
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    lifecycle.addCleanup(parent, () => order.push('parent'));
    lifecycle.addCleanup(child, () => order.push('child'));

    lifecycle.cleanupSubtree(parent);

    expect(order).toEqual(['child', 'parent']);
  });

  it('immediately runs cleanup registered after an owner was disposed', () => {
    const owner = document.createElement('div');
    const cleanup = vi.fn();
    lifecycle.cleanupElement(owner);

    lifecycle.addCleanup(owner, cleanup);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('managed intervals and timeouts are cancelled with their owner', () => {
    vi.useFakeTimers();
    const owner = document.createElement('div');
    const intervalTask = vi.fn();
    const timeoutTask = vi.fn();
    lifecycle.setInterval(owner, intervalTask, 100);
    lifecycle.setTimeout(owner, timeoutTask, 100);

    lifecycle.cleanupElement(owner);
    vi.advanceTimersByTime(500);

    expect(intervalTask).not.toHaveBeenCalled();
    expect(timeoutTask).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
