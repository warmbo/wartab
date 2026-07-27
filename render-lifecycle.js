/* Composable ownership for timers, observers, listeners, and module cleanup. */
var WarTabLifecycle = (function() {
  var cleanups = new WeakMap();
  var disposed = new WeakSet();

  function addCleanup(owner, cleanup) {
    if (!owner || typeof cleanup !== 'function') return cleanup;
    if (disposed.has(owner)) {
      cleanup();
      return cleanup;
    }
    var callbacks = cleanups.get(owner);
    if (!callbacks) {
      callbacks = [];
      cleanups.set(owner, callbacks);
    }
    callbacks.push(cleanup);
    return cleanup;
  }

  function cleanupElement(owner) {
    if (!owner || disposed.has(owner)) return;
    disposed.add(owner);
    var callbacks = cleanups.get(owner) || [];
    cleanups.delete(owner);
    callbacks.forEach(function(cleanup) {
      try {
        cleanup();
      } catch (error) {
        console.error('render cleanup failed:', error);
      }
    });
  }

  function cleanupSubtree(root) {
    if (!root) return;
    var descendants = Array.from(root.querySelectorAll('*'));
    for (var index = descendants.length - 1; index >= 0; index--) {
      cleanupElement(descendants[index]);
    }
    cleanupElement(root);
  }

  function managedInterval(owner, callback, delay) {
    var timer = setInterval(callback, delay);
    addCleanup(owner, function() { clearInterval(timer); });
    return timer;
  }

  function managedTimeout(owner, callback, delay) {
    var timer = setTimeout(callback, delay);
    addCleanup(owner, function() { clearTimeout(timer); });
    return timer;
  }

  function observe(owner, observer, target) {
    observer.observe(target || owner);
    addCleanup(owner, function() { observer.disconnect(); });
    return observer;
  }

  return {
    addCleanup: addCleanup,
    cleanupElement: cleanupElement,
    cleanupSubtree: cleanupSubtree,
    setInterval: managedInterval,
    setTimeout: managedTimeout,
    observe: observe,
  };
})();
