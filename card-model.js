/* WarTab card/section metadata and state operations. */
var CARD_TYPE_DEFS = [
  { type: 'links', label: 'Links', icon: 'link', role: 'launcher', category: 'Launch', description: 'A visual grid of favorite destinations.', recommendedSize: '2 × 1', sectionOrder: 0 },
  { type: 'search', label: 'Search', icon: 'search', role: 'launcher', category: 'Launch', description: 'Search the web or jump anywhere in WarTab.', recommendedSize: '2 × 1', sectionOrder: 2 },
  { type: 'clock', label: 'Clock', icon: 'clock', role: 'ambient', category: 'At a glance', description: 'Local time, date, and named world clocks.', recommendedSize: '1 × 1', sectionOrder: 3 },
  { type: 'notes', label: 'Notes', icon: 'edit-3', role: 'canvas', category: 'Create', description: 'A focused rich-text scratchpad with templates.', recommendedSize: '2 × 2', sectionOrder: 7 },
  { type: 'weather', label: 'Weather', icon: 'cloud-sun', role: 'ambient', category: 'At a glance', description: 'Current conditions and a five-day forecast.', recommendedSize: '1 × 1', setup: 'Location', sectionOrder: 4 },
  { type: 'iframe', label: 'Iframe', sectionLabel: 'iFrame', icon: 'monitor', role: 'canvas', category: 'Create', description: 'Embed a trusted dashboard or web application.', recommendedSize: '2 × 2', setup: 'URL', sectionOrder: 6 },
  { type: 'image', label: 'Image', icon: 'image', role: 'ambient', category: 'At a glance', description: 'Display an image as a quiet visual anchor.', recommendedSize: '2 × 1', setup: 'Image', sectionOrder: 11 },
  {
    type: 'api-poller', label: 'API Poller', icon: 'activity', role: 'feed', category: 'Data', description: 'Turn selected JSON fields into live data.', recommendedSize: '2 × 1', setup: 'API URL', sectionOrder: 8,
    sectionDefaults: {
      url: 'https://api.github.com/repos/warmbo/wartab',
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
  { type: 'quotes', label: 'Quotes', icon: 'message-circle', role: 'ambient', category: 'At a glance', description: 'Rotating inspiration with daily and shuffle modes.', recommendedSize: '1 × 1', sectionOrder: 9 },
  { type: 'timer', label: 'Timer', icon: 'timer', role: 'metric', category: 'Productivity', description: 'Countdowns, Pomodoro, and event timers.', recommendedSize: '1 × 1', sectionOrder: 5 },
  { type: 'resource-monitor', label: 'Resources', sectionLabel: 'Resource Monitor', icon: 'bar-chart-3', role: 'metric', category: 'Systems', description: 'CPU, memory, disk, and GPU at a glance.', recommendedSize: '1 × 1', sectionOrder: 10 },
  { type: 'link-list', label: 'Link List', icon: 'list', role: 'launcher', category: 'Launch', description: 'A compact text-first list of destinations.', recommendedSize: '1 × 1', sectionOrder: 1 },
  { type: 'lan-scan', label: 'LAN Scan', icon: 'radio', role: 'metric', category: 'Systems', description: 'See responsive devices on your local network.', recommendedSize: '2 × 1', setup: 'Server mode', sectionOrder: 12 },
  { type: 'digital-pet', label: 'Digital Pet', icon: 'heart', role: 'ambient', category: 'Play', description: 'A persistent desktop companion to care for.', recommendedSize: '1 × 1', sectionOrder: 13 },
  { type: 'ascii-anim', label: 'ASCII Animation', icon: 'monitor', role: 'ambient', category: 'Play', description: 'Animated low-fi text art for your dashboard.', recommendedSize: '1 × 1', sectionOrder: 14 },
  { type: 'media', label: 'Media Card', icon: 'film', role: 'feed', category: 'Media', description: 'Browse and control a configured media source.', recommendedSize: '2 × 2', setup: 'Media server', sectionOrder: 15 },
  { type: 'proxmox', label: 'Proxmox', icon: 'server', role: 'metric', category: 'Systems', description: 'Cluster and guest health from Proxmox.', recommendedSize: '2 × 1', setup: 'API access', sectionOrder: 16 },
  { type: 'git', label: 'Git Repo', icon: 'code-2', role: 'metric', category: 'Data', description: 'Repository activity, issues, and release state.', recommendedSize: '2 × 1', setup: 'Repository URL', sectionOrder: 17 },
  { type: 'rss', label: 'RSS Feed', icon: 'rss', role: 'feed', category: 'Feeds', description: 'Recent headlines from an RSS or Atom source.', recommendedSize: '2 × 2', setup: 'Feed URL', sectionOrder: 18 },
  { type: 'agenda', label: 'Agenda', icon: 'calendar-days', role: 'feed', category: 'Productivity', description: 'Upcoming events from a public calendar feed.', recommendedSize: '2 × 1', setup: 'Calendar URL', sectionOrder: 19 },
  { type: 'service-status', label: 'Service Status', icon: 'activity', role: 'metric', category: 'Systems', description: 'Live health and latency for important services.', recommendedSize: '2 × 1', setup: 'Service URLs', sectionOrder: 20 },
  { type: 'markdown', label: 'Markdown', icon: 'file-text', role: 'canvas', category: 'Create', description: 'A safe rendered Markdown canvas.', recommendedSize: '2 × 2', sectionOrder: 21 },
  { type: 'smart-links', label: 'Smart Links', icon: 'sparkles', role: 'launcher', category: 'Launch', description: 'Your most-used or recently opened links.', recommendedSize: '1 × 1', sectionOrder: 22 },
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

  function getCardRole(card) {
    if (card && card.role) return card.role;
    var first = card && card.sections && card.sections[0];
    var definition = getTypeDef(first && first.type);
    return definition && definition.role ? definition.role : 'canvas';
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

  function getBaseSectionStyles() {
    return clone(BASE_SECTION_STYLES);
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
    getCardRole: getCardRole,
    getSectionTypeOptions: getSectionTypeOptions,
    getBaseSectionStyles: getBaseSectionStyles,
    createSection: createSection,
    createCard: createCard,
    getCurrentCards: getCurrentCards,
    getCardById: getCardById,
    getCardIndex: getCardIndex,
    addCard: addCard,
    removeCard: removeCard,
  };
})();
