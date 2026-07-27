/* Shared HTTP semantics and non-overlapping polling for WarTab modules. */
var WarTabHttp = (function() {
  function request(url, options) {
    options = options || {};
    var fetcher = options.fetch || fetch;
    var timeout = options.timeout === undefined ? 15000 : options.timeout;
    var controller = new AbortController();
    var timedOut = false;
    var timer = null;
    var fetchOptions = {};
    Object.keys(options).forEach(function(key) {
      if (key !== 'fetch' && key !== 'timeout') fetchOptions[key] = options[key];
    });
    fetchOptions.signal = controller.signal;
    if (timeout > 0) {
      timer = setTimeout(function() {
        timedOut = true;
        controller.abort();
      }, timeout);
    }

    return Promise.resolve()
      .then(function() { return fetcher(url, fetchOptions); })
      .then(function(response) {
        if (!response.ok) {
          return response.text().catch(function() { return ''; }).then(function(detail) {
            throw new Error('HTTP ' + response.status + (detail ? ': ' + detail : ''));
          });
        }
        var contentType = response.headers.get('Content-Type') || '';
        return contentType.includes('json') ? response.json() : response.text();
      })
      .catch(function(error) {
        if (timedOut) throw new Error('Request timed out');
        throw error;
      })
      .finally(function() { if (timer !== null) clearTimeout(timer); });
  }

  function createPoller(options) {
    options = options || {};
    var disposed = false;
    var paused = false;
    var running = false;
    var timer = null;

    function schedule() {
      if (disposed || paused || !(options.interval > 0)) return;
      timer = setTimeout(run, options.interval);
    }

    function run() {
      if (disposed || paused || running) return;
      timer = null;
      running = true;
      var operation;
      try {
        operation = options.task();
      } catch (error) {
        operation = Promise.reject(error);
      }
      Promise.resolve(operation)
        .then(function(data) {
          if (!disposed && options.onData) options.onData(data);
        })
        .catch(function(error) {
          if (!disposed && options.onError) options.onError(error);
        })
        .finally(function() {
          running = false;
          schedule();
        });
    }

    function pause() {
      paused = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function resume() {
      if (disposed || !paused) return;
      paused = false;
      if (!running) run();
    }

    function dispose() {
      disposed = true;
      paused = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    var poller = { run: run, pause: pause, resume: resume, dispose: dispose };
    if (options.owner && typeof WarTabLifecycle !== 'undefined') {
      WarTabLifecycle.addCleanup(options.owner, dispose);
    }
    if (options.immediate !== false) run();
    else schedule();
    return poller;
  }

  return { request: request, createPoller: createPoller };
})();
