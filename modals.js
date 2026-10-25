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
  if(opts.width)box.style.width=opts.width;
  if (opts.align !== 'left') box.style.textAlign = 'center';

  var returnFocus = document.activeElement;
  var closed=false;

  function close() {
    if(closed || (opts.beforeClose && opts.beforeClose()===false))return false;
    closed=true;var ownsFocus=overlay===Array.from(document.querySelectorAll('.modal-overlay')).pop();
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    if(ownsFocus && returnFocus && returnFocus.isConnected && typeof returnFocus.focus==='function'){
      try { returnFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    return true;
  }
  function onKey(e) {
    // Only the newest shared modal owns keyboard dismissal and focus.
    if (overlay !== Array.from(document.querySelectorAll('.modal-overlay')).pop()) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      var controls = Array.from(box.querySelectorAll('button,input,select,textarea,a[href],[tabindex]'))
        .filter(function(el) { return !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden]'); });
      var first = controls[0] || box, last = controls[controls.length - 1] || box;
      if (!box.contains(document.activeElement) || (e.shiftKey && document.activeElement === first)) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }
  overlay.addEventListener('click', function (e) {
    if(e.target===overlay && overlay===Array.from(document.querySelectorAll('.modal-overlay')).pop())close();
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
  const label = document.createElement('p');label.className='modal-message';
  label.textContent = msg;

  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.className='modal-actions';
  const okBtn = document.createElement('button');
  okBtn.textContent = okText;
  okBtn.className = 'btn btn-glass btn-sm' + (danger ? ' btn-danger' : '');
  okBtn.type='button';okBtn.addEventListener('click',()=>{if(m.close())onConfirm();});
  const cancelBtn = document.createElement('button');
  cancelBtn.type='button';cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => m.close());
  btnRow.append(cancelBtn,okBtn);
  box.appendChild(btnRow);
  (danger?cancelBtn:okBtn).focus({preventScroll:true});
}

/* ── Info modal (message + OK button, no confirmation) ── */
function showModal(title, items) {
  const m = openModal({ label: title || 'WarTab', align: 'left', width: '520px' });
  const box = m.box;
  const body = document.createElement('div');
  if (title) {
    const t = document.createElement('h2');t.className='modal-heading';
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
  btnRow.className='modal-actions';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.type='button';okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => m.close());
  btnRow.appendChild(okBtn);
  box.appendChild(btnRow);
  okBtn.focus({ preventScroll: true });
}
