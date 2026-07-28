/* WarTab configuration normalization and import sanitation. */
var WarTabConfigModel = (function() {
  function isUnsafeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }

  function clone(value) {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    var copy = {};
    Object.keys(value).forEach(function(key) {
      if (!isUnsafeKey(key)) copy[key] = clone(value[key]);
    });
    return copy;
  }

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function deepMerge(defaults, override) {
    var result = isRecord(defaults) ? clone(defaults) : {};
    if (!isRecord(override)) return result;

    Object.keys(override).forEach(function(key) {
      if (isUnsafeKey(key)) return;
      var value = override[key];
      result[key] = isRecord(value)
        ? deepMerge(isRecord(result[key]) ? result[key] : {}, value)
        : clone(value);
    });
    return result;
  }

  function nextPageId(makeId, pages) {
    var raw;
    do {
      raw = makeId ? String(makeId()) : Math.random().toString(36).slice(2, 10);
      if (!raw.startsWith('page-')) raw = 'page-' + raw;
    } while (pages[raw]);
    return raw;
  }

  function normalizePage(page) {
    var normalized = isRecord(page) ? clone(page) : {};
    delete normalized.id;
    if (!Array.isArray(normalized.cards)) normalized.cards = [];
    return normalized;
  }

  function normalizePages(input, makeId) {
    var config = isRecord(input) ? clone(input) : {};
    var pages = {};

    if (Array.isArray(config.pages)) {
      config.pages.forEach(function(page) {
        if (!isRecord(page)) return;
        var id = page.id ? String(page.id) : nextPageId(makeId, pages);
        if (isUnsafeKey(id)) id = nextPageId(makeId, pages);
        if (pages[id]) id = nextPageId(makeId, pages);
        pages[id] = normalizePage(page);
      });
    } else if (isRecord(config.pages)) {
      Object.keys(config.pages).forEach(function(id) {
        if (isUnsafeKey(id)) return;
        if (!isRecord(config.pages[id])) return;
        pages[id] = normalizePage(config.pages[id]);
      });
    }

    if (!Object.keys(pages).length) {
      var firstId = nextPageId(makeId, pages);
      pages[firstId] = {
        name: 'Page 1',
        icon: 'layout',
        cards: Array.isArray(config.cards) ? clone(config.cards) : [],
      };
    }

    var requestedOrder = Array.isArray(config.pageOrder) ? config.pageOrder : [];
    var seen = {};
    var order = [];
    requestedOrder.forEach(function(id) {
      id = String(id);
      if (Object.prototype.hasOwnProperty.call(pages,id) && !seen[id]) {
        seen[id] = true;
        order.push(id);
      }
    });
    Object.keys(pages).forEach(function(id) {
      if (!seen[id]) order.push(id);
    });

    config.pages = pages;
    config.pageOrder = order;
    config.currentPage = Object.prototype.hasOwnProperty.call(pages,config.currentPage) ? config.currentPage : order[0];
    delete config.cards;
    return config;
  }

  function attachCurrentCardsAlias(config) {
    Object.defineProperty(config, 'cards', {
      configurable: true,
      enumerable: false,
      get: function() {
        var page = config.pages && config.pages[config.currentPage];
        return page && Array.isArray(page.cards) ? page.cards : [];
      },
      set: function(cards) {
        var page = config.pages && config.pages[config.currentPage];
        if (page) page.cards = Array.isArray(cards) ? cards : [];
      },
    });
    return config;
  }

  function sanitizeImportConfig(raw) {
    var warnings = [];
    if (!isRecord(raw)) {
      return { data: {}, warnings: ['Imported data is not a valid JSON object'] };
    }

    function walk(value, path) {
      if (Array.isArray(value)) {
        return value.reduce(function(items, item, index) {
          var itemPath = path + '[' + index + ']';
          if (item === null || item === undefined) {
            warnings.push(itemPath + ': skipped null/undefined');
          } else {
            items.push(walk(item, itemPath));
          }
          return items;
        }, []);
      }
      if (!isRecord(value)) return value;

      var output = {};
      Object.keys(value).forEach(function(key) {
        if (isUnsafeKey(key)) {
          warnings.push(path + '.' + key + ': removed unsafe key');
          return;
        }
        var item = value[key];
        var itemPath = path + '.' + key;
        if (typeof item === 'string' && item.length > 200 && item.startsWith('data:')) {
          warnings.push(itemPath + ': removed embedded data URL (' + Math.round(item.length / 1024) + 'KB) — use file path instead');
        } else if (item === null) {
          output[key] = null;
        } else if (item !== undefined) {
          output[key] = walk(item, itemPath);
        }
      });
      return output;
    }

    var data = walk(raw, '');
    if (data.cards !== undefined && !Array.isArray(data.cards)) {
      delete data.cards;
      warnings.push('.cards: not an array — removed');
    }
    if (data.pages !== undefined && !Array.isArray(data.pages) && !isRecord(data.pages)) {
      delete data.pages;
      warnings.push('.pages: invalid type — removed');
    }
    if (data.theme !== undefined && !isRecord(data.theme)) {
      delete data.theme;
      warnings.push('.theme: invalid — using defaults');
    }
    if (data.layout !== undefined && !isRecord(data.layout)) {
      delete data.layout;
      warnings.push('.layout: invalid — using defaults');
    }
    return { data: data, warnings: warnings };
  }

  return {
    deepMerge: deepMerge,
    normalizePages: normalizePages,
    attachCurrentCardsAlias: attachCurrentCardsAlias,
    sanitizeImportConfig: sanitizeImportConfig,
  };
})();
