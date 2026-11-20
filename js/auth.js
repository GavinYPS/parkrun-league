// Settings login, navigation rendering, tab switching

function isLoggedIn() { return sessionStorage.getItem(SETTINGS_SESSION_KEY) === '1'; }

function renderNav() {
  var loggedIn = isLoggedIn();
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  var tabs = loggedIn
    ? [['runners','Club Runners','Runners'],['events','Tournaments'],['leaderboard','Leaderboard'],['settings','Global Settings','Settings'],['help','Help']]
    : [['leaderboard','Leaderboard'],['help','Help']];
  nav.innerHTML = tabs.map(function(t) {
    return '<button onclick="sw(\'' + t[0] + '\')"><span class="nav-full">' + t[1] + '</span><span class="nav-short">' + (t[2] || t[1]) + '</span></button>';
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
    if (ghIsConfigured()) ghPull().then(function(){ renderLbSel(); }).catch(function(){});   // admins only: sync after login
    var go = pendingPage || 'runners'; pendingPage = null; sw(go);
  } else {
    if (inp) { inp.value = ''; inp.placeholder = 'Incorrect — try again'; inp.style.borderColor = 'var(--red)'; inp.focus(); }
  }
}

// Each tab is a page with its own link: index.html#help, #leaderboard, #runners, #events, #enter-times, #settings
var PAGES = {leaderboard:'Leaderboard', help:'Help', runners:'Club Runners', events:'Tournaments', 'enter-times':'Enter Times', settings:'Global Settings'};
var curPage = null, pendingPage = null;

function sw(t) {
  if (!PAGES[t]) t = 'leaderboard';
  if (!isLoggedIn() && t !== 'leaderboard' && t !== 'help') {
    pendingPage = t; promptLogin();   // after login we land on the page that was asked for
    if (curPage) { history.replaceState(null, '', '#' + curPage); return; }
    t = 'leaderboard';                // opened a protected link cold: show the leaderboard behind the login box
  }
  curPage = t;
  document.title = PAGES[t] + ' — ' + getClubName();
  if (location.hash !== '#' + t) location.hash = t;
  document.querySelectorAll('#main-nav button').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('onclick') === "sw('" + t + "')");
  });
  document.querySelectorAll('.section').forEach(function(el) { el.classList.remove('active'); });
  var target = document.getElementById('tab-' + t);
  if (target) target.classList.add('active');
  if (t === 'leaderboard') { renderLbSel(); renderLeaderboard(); }
  if (t === 'enter-times') { renderEnterTimesSel(); renderEnterTimes(); }
  if (t === 'help') renderHelp();
  if (t === 'settings') { renderGlobalSettings(); syncLogoPreview(); }
}
