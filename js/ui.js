// Confirm modal and toast

var _confirmCb = null;
function confirmModal(title, msg, okLabel, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok-btn').textContent = okLabel || 'OK';
  document.getElementById('confirm-cancel').textContent = 'Cancel';
  document.getElementById('confirm-cancel').onclick = confirmCancel;
  _confirmCb = cb;
  document.getElementById('confirm-modal').classList.add('open');
}
function confirmOK() { document.getElementById('confirm-modal').classList.remove('open'); if (_confirmCb) { _confirmCb(); _confirmCb = null; } }
function confirmCancel() { document.getElementById('confirm-modal').classList.remove('open'); _confirmCb = null; }

function showToast(msg) {
  var toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg4);border:1px solid var(--border2);color:var(--text);font-family:Barlow Condensed,sans-serif;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:8px 20px;border-radius:var(--radius-sm);box-shadow:0 4px 16px rgba(0,0,0,.5);z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg; toast.style.opacity = '1';
  clearTimeout(toast._timer); toast._timer = setTimeout(function() { toast.style.opacity = '0'; }, 2000);
}
