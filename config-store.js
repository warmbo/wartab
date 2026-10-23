/* Ordered, coalescing persistence for WarTab configuration changes. */
var WarTabConfigStore = (function() {
  // A single delayed retry: a transient failure must not silently drop the
  // newest config, since the in-memory state is only re-persisted on next edit.
  var RETRY_DELAY_MS = 1000;

  function clone(value) {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    var copy = {};
    Object.keys(value).forEach(function(key) { copy[key] = clone(value[key]); });
    return copy;
  }

  function createConfigSaver(options) {
    options = options || {};
    if (typeof options.write !== 'function') throw new TypeError('write must be a function');

    var active = false;
    var pending = null;

    function notify(callback, value) {
      if (!callback) return;
      try { callback(value); }
      catch (error) { console.error('Config persistence notification failed:', error); }
    }

    function fail(job, error) {
      notify(options.onError, error);
      advance();
      job.waiters.forEach(function(waiter) { waiter.reject(error); });
    }

    function run(job) {
      active = true;
      var operation;
      try {
        operation = options.write(job.snapshot);
      } catch (error) {
        operation = Promise.reject(error);
      }
      Promise.resolve(operation)
        .then(function() {
          notify(options.onSaved, clone(job.snapshot));
          advance();
          job.waiters.forEach(function(waiter) { waiter.resolve(clone(job.snapshot)); });
        })
        .catch(function(error) {
          if (!pending && !job.retried) {
            // ponytail: one retry, no backoff — add backoff only if writes stay flaky.
            job.retried = true;
            setTimeout(function() {
              if (pending) {
                // A newer save arrived while waiting: it supersedes this snapshot,
                // so this caller rides along and is settled by that write.
                pending.waiters = job.waiters.concat(pending.waiters);
                active = false;
                advance();
                return;
              }
              run(job);
            }, RETRY_DELAY_MS);
            return;
          }
          fail(job, error);
        });
    }

    function advance() {
      active = false;
      if (pending) {
        var next = pending;
        pending = null;
        run(next);
      }
    }

    function save(config) {
      var snapshot = clone(config);
      var promise = new Promise(function(resolve, reject) {
        var waiter = { resolve: resolve, reject: reject };
        if (!active) {
          run({ snapshot: snapshot, waiters: [waiter] });
        } else if (pending) {
          pending.snapshot = snapshot;
          pending.waiters.push(waiter);
        } else {
          pending = { snapshot: snapshot, waiters: [waiter] };
        }
      });
      return promise;
    }

    return { save: save };
  }

  return { createConfigSaver: createConfigSaver };
})();
