/* ═══════════════════════════════════════════
   WarTab — Form Helper Functions
   Shared by edit-panel and config-panel builders.
   ═══════════════════════════════════════════ */
function cpLabel(text) {
  const l = document.createElement('label');
  l.className = 'cp-label';
  l.textContent = text;
  return l;
}

function cpInput(placeholder, value, onChange) {
  const i = document.createElement('input');
  i.className = 'cp-input';
  i.type = 'text';
  i.placeholder = placeholder || '';
  i.value = value || '';
  if (onChange) i.addEventListener('change', () => onChange(i.value));
  return i;
}

function cpSelect(options, value, onChange) {
  const s = document.createElement('select');
  s.className = 'cp-select';
  (options || []).forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    opt.disabled = !!o.disabled;
    if (o.value === value) opt.selected = true;
    s.appendChild(opt);
  });
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function cpCheck(label, checked, onChange) {
  const w = document.createElement('label');
  w.className = 'cp-check';
  const c = document.createElement('input');
  c.type = 'checkbox';
  c.checked = !!checked;
  c.addEventListener('change', () => onChange(c.checked));
  w.appendChild(c);
  w.appendChild(document.createTextNode(label));
  return w;
}

function cpRange(label, value, min, max, onChange, step) {
  const g = document.createElement('div');
  g.className = 'cp-range';
  g.appendChild(cpLabel(label));
  const row = document.createElement('div');
  row.className = 'cp-range-row';
  const r = document.createElement('input');
  r.type = 'range'; r.min = min; r.max = max; r.value = value; if(step!==undefined) r.step = step;
  const s = document.createElement('span');
  s.className = 'cp-range-val';
  s.textContent = value;
  r.addEventListener('input', () => { s.textContent = r.value; });
  const doChange = () => { onChange(r.value); s.textContent = r.value; };
  r.addEventListener('pointerup', doChange);
  r.addEventListener('keyup', e => { if (e.key === 'Enter') doChange(); });
  // 'change' fires on keyboard release too, so arrow-key adjustments persist
  r.addEventListener('change', doChange);
  row.appendChild(r); row.appendChild(s);
  g.appendChild(row);
  return g;
}

function cpHint(text) {
  const d = document.createElement('div');
  d.className = 'cp-hint';
  d.textContent = text;
  return d;
}

function cpDivider(text) {
  const d = document.createElement('div');
  d.className = 'cp-divider';
  d.textContent = text;
  return d;
}

function cpBtn(text, danger) {
  const b = document.createElement('button');
  b.className = 'btn btn-glass btn-sm' + (danger ? ' btn-danger' : '');
  b.textContent = text;
  if (danger) b.title = text;
  return b;
}

/**
 * Structured row editor — turns "Label|URL per line" style fields into real
 * label+value input rows with add/remove. Stores back into the same
 * newline-delimited, pipe-separated string so existing module parsers keep
 * working unchanged.
 * @param {object} opts
 * @param {string} [opts.value]       Current pipe-string value (or array)
 * @param {string} [opts.labelPh]     Placeholder for the first column
 * @param {string} [opts.valuePh]     Placeholder for the second column
 * @param {function} [opts.onChange]  Called with the serialized string
 * @returns {HTMLElement}
 */
function cpRows(opts) {
  opts = opts || {};
  var wrap = document.createElement('div');
  wrap.className = 'cp-rows';

  function parse() {
    var rows = [];
    if (Array.isArray(opts.value)) return opts.value.slice();
    String(opts.value || '').split('\n').forEach(function(line) {
      if (!line.trim()) return;
      var p = line.split('|');
      rows.push([(p[0] || '').trim(), (p[1] || '').trim()]);
    });
    return rows;
  }
  function serialize(rows) {
    return rows.map(function(r) { return (r[0] || '').trim() + '|' + (r[1] || '').trim(); }).join('\n');
  }
  function emit(rows) {
    if (opts.onChange) opts.onChange(serialize(rows));
  }

  var rows = parse();

  function render() {
    wrap.innerHTML = '';
    rows.forEach(function(row, i) {
      var line = document.createElement('div');
      line.className = 'me-link-tr';
      var l = document.createElement('input');
      l.className = 'cp-input';
      l.placeholder = opts.labelPh || 'Label';
      l.value = row[0];
      l.setAttribute('aria-label', 'Row ' + (i + 1) + ' label');
      l.addEventListener('change', function() { rows[i][0] = l.value; emit(rows); });
      var v = document.createElement('input');
      v.className = 'cp-input';
      v.placeholder = opts.valuePh || 'Value';
      v.value = row[1];
      v.setAttribute('aria-label', 'Row ' + (i + 1) + ' value');
      v.addEventListener('change', function() { rows[i][1] = v.value; emit(rows); });
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'me-icon-btn';
      rm.textContent = '✕';
      rm.title = 'Remove row';
      rm.setAttribute('aria-label', 'Remove row ' + (i + 1));
      rm.addEventListener('click', function() { rows.splice(i, 1); emit(rows); render(); });
      line.appendChild(l); line.appendChild(v); line.appendChild(rm);
      wrap.appendChild(line);
    });
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'me-link-add';
    add.textContent = '+ Add Row';
    add.addEventListener('click', function() { rows.push(['', '']); emit(rows); render(); });
    wrap.appendChild(add);
  }

  render();
  return wrap;
}

/* ── Collapsible field group for module editors ── */
function meFieldGroup(label, defaultOpen) {
  var wrap = document.createElement('div');
  wrap.className = 'me-field-group';

  var hdr = document.createElement('button');
  hdr.type = 'button';
  hdr.className = 'me-field-group-hdr';
  hdr.innerHTML = '<span class="me-field-group-arrow">▶</span><span class="me-field-group-label">' + label + '</span>';
  wrap.appendChild(hdr);

  var body = document.createElement('div');
  body.className = 'me-field-group-body';
  if (!defaultOpen) {
    body.classList.add('me-fg-collapsed');
    hdr.classList.add('me-fg-collapsed');
  }
  wrap.appendChild(body);

  hdr.addEventListener('click', function() {
    var isOpen = !body.classList.contains('me-fg-collapsed');
    body.classList.toggle('me-fg-collapsed', isOpen);
    hdr.classList.toggle('me-fg-collapsed', isOpen);
  });

  return body;  // Return the body so the module editor appends fields to it
}
