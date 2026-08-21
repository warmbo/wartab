/* ═══════════════════════════════════════════
   WarTab — Modal Dialogs
   Confirmation and info modals, plus the shared
   openModal() primitive every surface funnels through.
   ═══════════════════════════════════════════ */

/* Shared modal host. Returns { overlay, box, close, body }.
   Handles Esc, backdrop click, focus capture, focus return,
   and aria dialog semantics — so callers never hand-roll shells. */
function openModal(opts) {
  opts = opts || {};
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'presentation');
  var box = document.createElement('div');
  box.className = 'modal-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  if (opts.label) box.setAttribute('aria-label', opts.label);
  if (opts.width) box.style.maxWidth = opts.width;
  if (opts.align !== 'left') box.style.textAlign = 'center';

  var returnFocus = document.activeElement;

  function close() {
    if (opts.beforeClose && opts.beforeClose() === false) return;
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    if (returnFocus && typeof returnFocus.focus === 'function') {
      try { returnFocus.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey, true);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Move focus inside the dialog (first focusable or the box itself)
  var first = box.querySelector('button, input, select, textarea, a[href], [tabindex]');
  if (first) first.focus({ preventScroll: true });
  else { box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true }); }

  return {
    overlay: overlay,
    box: box,
    body: box,
    close: close
  };
}

/** Simple confirmation overlay.
 *  Usage: showConfirmModal(msg, onConfirm, okTextOrOptions)
 *  okTextOrOptions may be a string (label; legacy) or { ok, danger } where
 *  danger:true styles the OK button as destructive (no longer string-sniffing).
 */
function showConfirmModal(msg, onConfirm, okTextOrOptions) {
  let okText = 'Delete', danger = false;
  if (okTextOrOptions && typeof okTextOrOptions === 'object') {
    okText = okTextOrOptions.ok || okText;
    danger = !!okTextOrOptions.danger;
  } else {
    okText = okTextOrOptions || 'Delete';
    danger = okText === 'Delete';
  }
  const m = openModal({ label: okText + '?', align: 'center' });
  const box = m.box;
  const label = document.createElement('div');
  label.textContent = msg;
  label.style.cssText = 'font-size:var(--text-base);color:var(--text-primary);margin-bottom:var(--space-4);';
  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:var(--space-2);justify-content:center;';
  const okBtn = document.createElement('button');
  okBtn.textContent = okText;
  okBtn.className = 'btn btn-glass btn-sm' + (danger ? ' btn-danger' : '');
  okBtn.addEventListener('click', () => { m.close(); onConfirm(); });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => m.close());
  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(btnRow);
  okBtn.focus({ preventScroll: true });
}

/* ── Info modal (message + OK button, no confirmation) ── */
function showModal(title, items) {
  const m = openModal({ label: title || 'WarTab', align: 'left', width: '520px' });
  const box = m.box;
  const body = document.createElement('div');
  if (title) {
    const t = document.createElement('div');
    t.style.cssText = 'font-weight:700;margin-bottom:var(--space-3);';
    t.textContent = title;
    body.appendChild(t);
  }
  if (items && items.length) {
    const list = document.createElement('div');
    list.className = 'import-warn-list';
    items.forEach(function(item) {
      const line = document.createElement('div');
      line.textContent = item;
      list.appendChild(line);
    });
    body.appendChild(list);
  }
  box.appendChild(body);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:var(--space-2);justify-content:center;margin-top:var(--space-4);';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => m.close());
  btnRow.appendChild(okBtn);
  box.appendChild(btnRow);
  okBtn.focus({ preventScroll: true });
}
