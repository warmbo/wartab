/* ═══════════════════════════════════════════
   WarTab — Modal Dialogs
   Confirmation and info modals.
   ═══════════════════════════════════════════ */
/** Simple confirmation overlay */
function showConfirmModal(msg, onConfirm, okText) {
  okText = okText || 'Delete';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.textAlign = 'center';
  const label = document.createElement('div');
  label.textContent = msg;
  label.style.cssText = 'font-size:var(--text-base);color:var(--text-primary);margin-bottom:var(--space-4);';
  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:var(--space-2);justify-content:center;';
  const okBtn = document.createElement('button');
  okBtn.textContent = okText;
  okBtn.className = 'btn btn-glass btn-sm' + (okText === 'Delete' ? ' btn-danger' : '');
  okBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-glass btn-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

/* ── Info modal (message + OK button, no confirmation) ── */
function showModal(title, items) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.cssText = 'max-width:520px;text-align:left;';
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
  okBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(okBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
