// Settings login, navigation rendering, tab switching

function isLoggedIn() { return sessionStorage.getItem(SETTINGS_SESSION_KEY) === '1'; }

function renderNav() {
  var loggedIn = isLoggedIn();
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  var tabs = loggedIn
    ? [['runners','Club Runners'],['events','Tournaments'],['leaderboard','Leaderboard'],['settings','Global Settings']]
    : [['leaderboard','Leaderboard']];
  nav.innerHTML = tabs.map(function(t) {
    return '<button onclick="sw(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join('');
  var authEl = document.getElementById('header-auth');
  if (authEl) {
    authEl.innerHTML = loggedIn
      ? '<button class="btn btn-sm btn-danger" onclick="doLogout()">Log out</button>'
      : '<button class="btn btn-sm btn-primary" onclick="promptLogin()">Admin login</button>';
  }
}

function doLogout() { sessionStorage.removeItem(SETTINGS_SESSION_KEY); renderNav(); sw('leaderboard'); }

function promptLogin() {
  confirmModal('Admin Login', '', 'Login', function() {});
  setTimeout(function() {
    var msg = document.getElementById('confirm-msg');
    if (msg) msg.innerHTML = '<input type="password" id="settings-pass-input" placeholder="Enter password" style="width:100%;padding:8px;font-size:14px;margin-top:4px;"/>';
    var inp = document.getElementById('settings-pass-input');
    if (inp) { inp.focus(); inp.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); tryLogin(); } }; }
    var ok = document.getElementById('confirm-ok-btn');
    if (ok) ok.onclick = tryLogin;
    var cancel = document.getElementById('confirm-cancel');
    if (cancel) cancel.onclick = confirmCancel;
  }, 30);
}

function tryLogin() {
  var inp = document.getElementById('settings-pass-input');
  var val = inp ? inp.value : '';
  if (val === SETTINGS_PASS) {
    sessionStorage.setItem(SETTINGS_SESSION_KEY, '1');
    confirmCancel();
    renderNav();
    sw('runners');
  } else {
    if (inp) { inp.value = ''; inp.placeholder = 'Incorrect — try again'; inp.style.borderColor = 'var(--red)'; inp.focus(); }
  }
}

function sw(t) {
  if (!isLoggedIn() && t !== 'leaderboard') { promptLogin(); return; }
  document.querySelectorAll('#main-nav button').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('onclick') === "sw('" + t + "')");
  });
  document.querySelectorAll('.section').forEach(function(el) { el.classList.remove('active'); });
  var target = document.getElementById('tab-' + t);
  if (target) target.classList.add('active');
  if (t === 'leaderboard') { renderLbSel(); renderLeaderboard(); }
  if (t === 'enter-times') { renderEnterTimesSel(); renderEnterTimes(); }
  if (t === 'settings') { renderGlobalSettings(); syncLogoPreview(); }
}
