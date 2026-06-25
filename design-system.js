/* ═══════════════════════════════════════════
   WarTab — Design System
   Shared component library for consistent
   module card visuals across all modules.
   ═══════════════════════════════════════════
   Depends on: $, $$, uid (core.js), renderLucideEl, renderIcons (core.js)
   Load after core.js, before app.js
   ═══════════════════════════════════════════ */

var ds = window.ds || {};

/* ── Utility: create element with class ── */
function _el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
function _txt(tag, cls, text) {
  var e = _el(tag, cls);
  if (text != null) e.textContent = text;
  return e;
}

/* ═══════════════════════════════════════════
   CARD STATES
   Loading, Empty, Error, Active
   ═══════════════════════════════════════════ */

/**
 * Loading skeleton — pulsing placeholder bars
 * @param {number} lines  Number of skeleton lines (1-5)
 * @param {string} type   'bar' | 'circle' | 'card'
 * @returns {HTMLElement}
 */
ds.loading = function(lines, type) {
  lines = lines || 3;
  type = type || 'bar';
  var wrap = _el('div', 'ds-state ds-loading');
  for (var i = 0; i < lines; i++) {
    if (type === 'circle') {
      var c = _el('div', 'ds-skeleton ds-skeleton-circle');
      wrap.appendChild(c);
    } else if (type === 'card') {
      var card = _el('div', 'ds-skeleton-card');
      card.appendChild(_el('div', 'ds-skeleton ds-skeleton-hdr'));
      card.appendChild(_el('div', 'ds-skeleton ds-skeleton-bar'));
      card.appendChild(_el('div', 'ds-skeleton ds-skeleton-bar ds-skeleton-short'));
      wrap.appendChild(card);
    } else {
      var b = _el('div', 'ds-skeleton ds-skeleton-bar');
      if (i === lines - 1) b.style.width = '60%';
      b.style.animationDelay = (i * 0.15) + 's';
      wrap.appendChild(b);
    }
  }
  return wrap;
};

/**
 * Empty state — module has no data or is unconfigured
 * @param {string}  icon     Lucide icon name or emoji
 * @param {string}  message  Primary message
 * @param {string}  [hint]   Secondary hint (optional)
 * @param {object}  [action] { label, onClick } button (optional)
 * @returns {HTMLElement}
 */
ds.empty = function(icon, message, hint, action) {
  var wrap = _el('div', 'ds-state ds-empty');
  // Icon
  var iconEl;
  if (icon && isLucideName(icon)) {
    iconEl = _el('div', 'ds-empty-icon');
    var li = renderLucideEl(icon, '');
    li.style.width = '28px'; li.style.height = '28px';
    iconEl.appendChild(li);
  } else if (icon) {
    iconEl = _el('div', 'ds-empty-icon emoji-icon');
    iconEl.textContent = icon;
  } else {
    iconEl = _el('div', 'ds-empty-icon');
    var li2 = renderLucideEl('package', '');
    li2.style.width = '28px'; li2.style.height = '28px';
    iconEl.appendChild(li2);
  }
  wrap.appendChild(iconEl);
  // Message
  wrap.appendChild(_txt('div', 'ds-empty-msg', message));
  // Hint
  if (hint) wrap.appendChild(_txt('div', 'ds-empty-hint', hint));
  // Action button
  if (action) {
    var btnWrap = _el('div', 'ds-empty-action');
    var btn = _el('button', 'btn btn-glass btn-sm');
    btn.textContent = action.label;
    if (action.onClick) btn.addEventListener('click', action.onClick);
    btnWrap.appendChild(btn);
    wrap.appendChild(btnWrap);
  }
  return wrap;
};

/**
 * Error state — something went wrong
 * @param {string} message  Human-readable error
 * @param {string} [detail] Technical detail (optional)
 * @param {object} [action] { label, onClick } retry button (optional)
 * @returns {HTMLElement}
 */
ds.error = function(message, detail, action) {
  var wrap = _el('div', 'ds-state ds-error');
  // Icon + message row
  var row = _el('div', 'ds-error-row');
  var iconEl = renderLucideEl('alert-triangle', '');
  iconEl.style.cssText = 'width:16px;height:16px;flex-shrink:0;';
  row.appendChild(iconEl);
  row.appendChild(_txt('span', 'ds-error-msg', message));
  wrap.appendChild(row);
  // Detail
  if (detail) wrap.appendChild(_txt('div', 'ds-error-detail', detail));
  // Retry button
  if (action) {
    var btnWrap = _el('div', 'ds-error-action');
    var btn = _el('button', 'btn btn-glass btn-sm');
    btn.textContent = action.label;
    if (action.onClick) btn.addEventListener('click', action.onClick);
    btnWrap.appendChild(btn);
    wrap.appendChild(btnWrap);
  }
  return wrap;
};

/* ═══════════════════════════════════════════
   MODULE CARD LAYOUT
   Standard structure for section content
   ═══════════════════════════════════════════ */

/**
 * Build a standard module card frame
 * @param {object} opts
 * @param {string|Element} [opts.icon]      Icon (Lucide name, emoji, or Element)
 * @param {string}         [opts.title]     Section label
 * @param {object}         [opts.status]    { color, label } status dot
 * @param {Element[]}      [opts.actions]   Quick action buttons array
 * @param {Element|Element[]} opts.content  Primary content (always visible)
 * @param {Element|Element[]} [opts.secondary]  Secondary content (hidden on small)
 * @param {Element|Element[]} [opts.footer]     Optional footer actions
 * @returns {HTMLElement} The assembled module frame
 */
ds.card = function(opts) {
  var frame = _el('div', 'ds-module');

  /* ── Header ── */
  if (opts.icon || opts.title || opts.status || opts.actions) {
    var hdr = _el('div', 'ds-module-hdr');
    
    // Icon
    if (opts.icon) {
      if (typeof opts.icon === 'string') {
        if (isLucideName(opts.icon)) {
          var li = renderLucideEl(opts.icon, '');
          li.style.cssText = 'width:16px;height:16px;flex-shrink:0;';
          hdr.appendChild(li);
        } else {
          hdr.appendChild(_txt('span', 'ds-module-icon ds-module-icon-emoji', opts.icon));
        }
      } else if (opts.icon instanceof Element) {
        hdr.appendChild(opts.icon);
      }
    }

    // Title
    if (opts.title) {
      hdr.appendChild(_txt('span', 'ds-module-title', opts.title));
    }

    // Status dot
    if (opts.status) {
      var sd = _el('span', 'ds-status');
      var dot = _el('span', 'ds-status-dot');
      dot.style.background = opts.status.color || 'var(--text-tertiary)';
      sd.appendChild(dot);
      if (opts.status.label) {
        sd.appendChild(_txt('span', 'ds-status-label', opts.status.label));
      }
      hdr.appendChild(sd);
    }

    // Quick actions (right side)
    if (opts.actions && opts.actions.length) {
      var acts = _el('div', 'ds-module-actions');
      opts.actions.forEach(function(a) { acts.appendChild(a); });
      hdr.appendChild(acts);
    }

    frame.appendChild(hdr);
  }

  /* ── Content (primary, always visible) ── */
  if (opts.content) {
    var cw = _el('div', 'ds-module-content');
    if (Array.isArray(opts.content)) {
      opts.content.forEach(function(c) { if (c) cw.appendChild(c); });
    } else if (opts.content instanceof Element) {
      cw.appendChild(opts.content);
    }
    frame.appendChild(cw);
  }

  /* ── Secondary (larger cards only) ── */
  if (opts.secondary) {
    var sw = _el('div', 'ds-module-secondary mod-only-large');
    if (Array.isArray(opts.secondary)) {
      opts.secondary.forEach(function(s) { if (s) sw.appendChild(s); });
    } else if (opts.secondary instanceof Element) {
      sw.appendChild(opts.secondary);
    }
    frame.appendChild(sw);
  }

  /* ── Footer ── */
  if (opts.footer) {
    var fw = _el('div', 'ds-module-footer');
    if (Array.isArray(opts.footer)) {
      opts.footer.forEach(function(f) { if (f) fw.appendChild(f); });
    } else if (opts.footer instanceof Element) {
      fw.appendChild(opts.footer);
    }
    frame.appendChild(fw);
  }

  return frame;
};

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */

/**
 * Status indicator dot
 * @param {string} color  CSS color
 * @param {string} [label]  Optional label text
 * @param {string} [title]  Tooltip text
 * @returns {HTMLElement}
 */
ds.statusDot = function(color, label, title) {
  var wrap = _el('span', 'ds-status');
  var dot = _el('span', 'ds-status-dot');
  dot.style.background = color || 'var(--text-tertiary)';
  if (title) wrap.title = title;
  wrap.appendChild(dot);
  if (label) wrap.appendChild(_txt('span', 'ds-status-label', label));
  return wrap;
};

/**
 * Section header with collapse toggle — used inside modules
 * for collapsible sub-sections (like INFRASTRUCTURE / SERVICES / MEDIA)
 * @param {string} label     Section label
 * @param {object} [opts]
 * @param {boolean} [opts.collapsed]   Start collapsed (default: false)
 * @param {function} [opts.onToggle]   Called with new collapsed state
 * @param {string|Element} [opts.icon] Icon
 * @param {Element[]} [opts.actions]   Action buttons for the header
 * @returns {object} { header: Element, content: Element, toggle: function }
 */
ds.sectionHeader = function(label, opts) {
  opts = opts || {};
  var hdr = _el('button', 'ds-section-hdr');
  // Arrow
  var arrow = _el('span', 'ds-section-arrow');
  arrow.textContent = '▶';
  hdr.appendChild(arrow);
  // Icon
  if (opts.icon) {
    if (typeof opts.icon === 'string' && isLucideName(opts.icon)) {
      var li = renderLucideEl(opts.icon, '');
      li.style.cssText = 'width:14px;height:14px;flex-shrink:0;';
      hdr.appendChild(li);
    } else if (typeof opts.icon === 'string') {
      hdr.appendChild(_txt('span', '', opts.icon));
    } else if (opts.icon instanceof Element) {
      hdr.appendChild(opts.icon);
    }
  }
  // Label
  hdr.appendChild(_txt('span', 'ds-section-label', label));
  // Actions
  if (opts.actions && opts.actions.length) {
    var acts = _el('span', 'ds-section-acts');
    opts.actions.forEach(function(a) { acts.appendChild(a); });
    hdr.appendChild(acts);
  }
  // Collapsible content wrapper
  var cw = _el('div', 'ds-section-body');
  var collapsed = opts.collapsed !== false;
  if (collapsed) {
    cw.classList.add('ds-collapsed');
    hdr.classList.add('ds-collapsed');
  }
  // Toggle
  hdr.addEventListener('click', function() {
    collapsed = !collapsed;
    cw.classList.toggle('ds-collapsed', collapsed);
    hdr.classList.toggle('ds-collapsed', collapsed);
    if (opts.onToggle) opts.onToggle(collapsed);
  });
  return {
    header: hdr,
    content: cw,
    toggle: function(c) { collapsed = c; cw.classList.toggle('ds-collapsed', c); hdr.classList.toggle('ds-collapsed', c); }
  };
};

/**
 * Stat row — label + value pair
 * @param {string} label  Stat label
 * @param {string|Element} value  Stat value
 * @param {string} [accent]  Color for value
 * @returns {HTMLElement}
 */
ds.statRow = function(label, value, accent) {
  var row = _el('div', 'ds-stat-row');
  row.appendChild(_txt('span', 'ds-stat-label', label));
  if (typeof value === 'string') {
    var valEl = _txt('span', 'ds-stat-value', value);
    if (accent) valEl.style.color = accent;
    row.appendChild(valEl);
  } else if (value instanceof Element) {
    if (accent) value.style.color = accent;
    row.appendChild(value);
  }
  return row;
};

/**
 * Action button — consistent small action button
 * @param {string} label  Button text
 * @param {function} onClick  Click handler
 * @param {string} [icon]  Lucide icon name to prepend
 * @returns {HTMLElement}
 */
ds.actionBtn = function(label, onClick, icon) {
  var btn = _el('button', 'btn btn-glass btn-sm');
  if (icon && isLucideName(icon)) {
    var li = renderLucideEl(icon, '');
    li.style.cssText = 'width:12px;height:12px;';
    btn.appendChild(li);
    btn.appendChild(document.createTextNode(' ' + label));
  } else {
    btn.textContent = label;
  }
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
};

/**
 * Metric bar — progress bar with label and value
 * @param {string} label  Metric name
 * @param {number} value  Percentage 0-100
 * @param {string} [color]  Fill color (defaults to accent)
 * @returns {HTMLElement}
 */
ds.metricBar = function(label, value, color) {
  var wrap = _el('div', 'ds-metric');
  var labelRow = _el('div', 'ds-metric-hdr');
  labelRow.appendChild(_txt('span', 'ds-metric-label', label));
  labelRow.appendChild(_txt('span', 'ds-metric-val', Math.round(value) + '%'));
  wrap.appendChild(labelRow);
  var track = _el('div', 'ds-metric-track');
  var fill = _el('div', 'ds-metric-fill');
  fill.style.width = Math.max(0, Math.min(100, value)) + '%';
  if (color) fill.style.background = color;
  track.appendChild(fill);
  wrap.appendChild(track);
  return wrap;
};

/**
 * Timestamp — "updated 5m ago"
 * @param {number} ts  Unix timestamp in ms
 * @returns {HTMLElement}
 */
ds.timestamp = function(ts) {
  var el = _txt('div', 'ds-ts', '');
  if (ts) {
    el.dataset.ts = ts;
    el.textContent = 'updated ' + timeAgo(ts);
  }
  return el;
};

/**
 * Value with formatting — format a value per its type
 * @param {*} value       Raw value
 * @param {string} format  'text' | 'number' | 'percent' | 'bytes' | 'duration'
 * @returns {string}
 */
ds.format = function(value, format) {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'number':
      var n = Number(value);
      return Number.isFinite(n) ? n.toLocaleString() : '—';
    case 'percent':
      return Number(value).toFixed(1) + '%';
    case 'bytes':
      return ds.fmtBytes(value);
    case 'duration':
      return ds.fmtDuration(value);
    default:
      return String(value);
  }
};

/* ── Byte formatter ── */
ds.fmtBytes = function(v) {
  var units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = 0, val = Number(v);
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return val.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
};

/* ── Duration formatter ── */
ds.fmtDuration = function(seconds) {
  var s = Number(seconds);
  if (s < 60) return Math.round(s) + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
};
