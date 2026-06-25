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
