/* WarTab card/section metadata and state operations. */
var CARD_TYPE_DEFS = [
  { type: 'links', label: 'Links', icon: 'link', sectionOrder: 0 },
  { type: 'search', label: 'Search', icon: 'search', sectionOrder: 2 },
  { type: 'clock', label: 'Clock', icon: 'clock', sectionOrder: 3 },
  { type: 'notes', label: 'Notes', icon: 'edit-3', sectionOrder: 7 },
  { type: 'weather', label: 'Weather', icon: 'cloud-sun', sectionOrder: 4 },
  { type: 'iframe', label: 'Iframe', sectionLabel: 'iFrame', icon: 'monitor', sectionOrder: 6 },
  { type: 'image', label: 'Image', icon: 'image', sectionOrder: 11 },
  {
    type: 'api-poller', label: 'API Poller', icon: 'activity', sectionOrder: 8,
    sectionDefaults: {
      url: 'https://api.github.com/repos/nousresearch/wartab',
      refreshInterval: 120,
      fields: [
        { label: 'Stars', path: 'stargazers_count' },
        { label: 'Forks', path: 'forks_count' },
        { label: 'Issues', path: 'open_issues_count' },
      ],
      mappings: [
        { label: 'Stars', field: 'stargazers_count', format: 'text' },
        { label: 'Forks', field: 'forks_count', format: 'text' },
        { label: 'Issues', field: 'open_issues_count', format: 'text' },
      ],
    },
  },
  { type: 'quotes', label: 'Quotes', icon: 'message-circle', sectionOrder: 9 },
  { type: 'timer', label: 'Timer', icon: 'timer', sectionOrder: 5 },
  { type: 'resource-monitor', label: 'Resources', sectionLabel: 'Resource Monitor', icon: 'bar-chart-3', sectionOrder: 10 },
  { type: 'link-list', label: 'Link List', icon: 'list', sectionOrder: 1 },
  { type: 'lan-scan', label: 'LAN Scan', icon: 'radio', sectionOrder: 12 },
  { type: 'digital-pet', label: 'Digital Pet', icon: 'heart', sectionOrder: 13 },
  { type: 'ascii-anim', label: 'ASCII Animation', icon: 'monitor', sectionOrder: 14 },
  { type: 'media', label: 'Media Card', icon: 'film', sectionOrder: 15 },
  { type: 'proxmox', label: 'Proxmox', icon: 'server', sectionOrder: 16 },
  { type: 'git', label: 'Git Repo', icon: 'code-2', sectionOrder: 17 },
];

var WarTabCardModel = (function() {
  var BASE_SECTION_STYLES = {
    align: 'left',
    density: 'standard',
    scale: 'medium',
    fontScale: { title: 1, content: 1, secondary: 1 },
  };

  function clone(value) {
    if (value === undefined || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(clone);
    var copy = {};
    Object.keys(value).forEach(function(key) { copy[key] = clone(value[key]); });
    return copy;
  }

  function merge(target, source) {
    var result = clone(target || {});
    Object.keys(source || {}).forEach(function(key) {
      var value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = merge(result[key], value);
      } else {
        result[key] = clone(value);
      }
    });
    return result;
  }

  function makePrefixedId(prefix, makeId) {
    var raw = makeId ? String(makeId()) : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return raw.startsWith(prefix + '-') ? raw : prefix + '-' + raw;
  }

  function getTypeDef(type) {
    return CARD_TYPE_DEFS.find(function(definition) { return definition.type === type; });
  }

  function getSectionTypeOptions() {
    return CARD_TYPE_DEFS.slice()
      .sort(function(a, b) { return a.sectionOrder - b.sectionOrder; })
      .map(function(definition) {
        return { value: definition.type, label: definition.sectionLabel || definition.label };
      });
  }

  function getModuleDefaults(type) {
    var modules = typeof CARD_MODULES !== 'undefined' ? CARD_MODULES : {};
    return modules[type] && modules[type].defaults ? modules[type].defaults : {};
  }

  function createSection(type, overrides, makeId) {
    var definition = getTypeDef(type) || { type: type, label: type };
    var section = merge(getModuleDefaults(type), definition.sectionDefaults || {});
    section = merge(section, {
      id: makePrefixedId('sec', makeId),
      type: type,
      label: definition.label,
      styles: BASE_SECTION_STYLES,
    });
    return merge(section, overrides || {});
  }

  function createCard(type, overrides, options) {
    options = options || {};
    overrides = overrides || {};
    var maxColumns = Math.max(1, parseInt(options.maxColumns, 10) || 1);
    var requestedWidth = Math.max(1, parseInt(overrides.width, 10) || 1);
    var card = {
      id: makePrefixedId('card', options.makeId),
      title: '',
      icon: 'package',
      color: '#888888',
      width: Math.min(requestedWidth, maxColumns),
      height: 1,
      sections: [createSection(type, options.sectionOverrides, options.makeId)],
    };
    var merged = merge(card, overrides);
    merged.width = Math.min(Math.max(1, parseInt(merged.width, 10) || 1), maxColumns);
    return merged;
  }

  function getCurrentCards(config) {
    if (!config || !config.pages || !config.pages[config.currentPage]) return [];
    var page = config.pages[config.currentPage];
    if (!Array.isArray(page.cards)) page.cards = [];
    return page.cards;
  }

  function getCardById(config, cardId) {
    return getCurrentCards(config).find(function(card) { return card.id === cardId; });
  }

  function getCardIndex(config, cardId) {
    return getCurrentCards(config).findIndex(function(card) { return card.id === cardId; });
  }

  function addCard(config, type, overrides, options) {
    var card = createCard(type, overrides, options);
    getCurrentCards(config).push(card);
    return card;
  }

  function removeCard(config, cardId) {
    var cards = getCurrentCards(config);
    var index = getCardIndex(config, cardId);
    if (index < 0) return undefined;
    return { card: cards.splice(index, 1)[0], index: index };
  }

  return {
    typeDefinitions: CARD_TYPE_DEFS,
    getTypeDef: getTypeDef,
    getSectionTypeOptions: getSectionTypeOptions,
    createSection: createSection,
    createCard: createCard,
    getCurrentCards: getCurrentCards,
    getCardById: getCardById,
    getCardIndex: getCardIndex,
    addCard: addCard,
    removeCard: removeCard,
  };
})();
