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
  label.style.cssText = 'font-size:var(--text-base);color:var(--text-primary);margin-bottom:16px;';
  box.appendChild(label);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.textContent = okText;
  okBtn.style.cssText = okText === 'Delete' ? 'border-color:#cc4444;color:#cc4444;' : '';
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
function showModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.cssText = 'max-width:520px;text-align:left;';
  const body = document.createElement('div');
  body.innerHTML = html;
  box.appendChild(body);
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:16px;';
  const okBtn = document.createElement('button');
  okBtn.className = 'btn btn-glass btn-sm';
  okBtn.textContent = 'OK';
  okBtn.addEventListener('click', () => overlay.remove());
  btnRow.appendChild(okBtn);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
