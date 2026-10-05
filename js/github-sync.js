// GitHub data.json sync (config, merge, push, pull)

function toggleTokenVisibility() {
  var inp = document.getElementById('gh-token');
  var eyeOn = document.getElementById('icon-eye');
  var eyeOff = document.getElementById('icon-eye-off');
  if (!inp) return;
  var isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  eyeOn.style.display = isHidden ? 'none' : 'block';
  eyeOff.style.display = isHidden ? 'block' : 'none';
}

function ghLoadConfig() { try { return JSON.parse(localStorage.getItem(GH_CONFIG_KEY) || '{}'); } catch(e) { return {}; } }

function ghSaveConfig() {
  var t = document.getElementById('gh-token'); var r = document.getElementById('gh-repo'); var p = document.getElementById('gh-path');
  var cfg = { token: t ? t.value.trim() : '', repo: r ? r.value.trim() : '', path: p ? p.value.trim() : 'data.json' };
  localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(cfg));
}

function ghIsConfigured() { var c = ghLoadConfig(); return !!(c.token && c.repo); }
function ghHasRetrieved() { return sessionStorage.getItem('parkrun_gh_retrieved') === '1'; }
function ghMarkRetrieved() { sessionStorage.setItem('parkrun_gh_retrieved', '1'); }

function ghSetSaveEnabled(enabled) {
  var btn = document.getElementById('gh-save-btn'); var hint = document.getElementById('gh-save-hint');
  if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.45'; }
  if (hint) hint.style.display = enabled ? 'none' : 'inline';
}

function ghOnTokenBlur() { ghSaveConfig(); }

function ghStatus(msg, ok) {
  var el = document.getElementById('gh-sync-status');
  if (el) { el.textContent = msg; el.style.color = ok === false ? 'var(--red)' : ok === true ? 'var(--green)' : 'var(--text3)'; }
}

function ghMerge(local, remote) {
  var m = JSON.parse(JSON.stringify(remote));
  // For arrays, prefer local record if it exists (local changes win)
  function mergeArray(ra, la) {
    var map = {};
    (ra || []).forEach(function(x) { map[x.id] = x; });
    // Local records overwrite remote
    (la || []).forEach(function(x) { map[x.id] = x; });
    return Object.values(map);
  }
  m.runners = mergeArray(remote.runners, local.runners);
  m.tournaments = mergeArray(remote.tournaments, local.tournaments);
  m.locations = mergeArray(remote.locations, local.locations);
  m.events = mergeArray(remote.events, local.events);
  // Results: local wins at the individual result level
  m.results = JSON.parse(JSON.stringify(remote.results || {}));
  Object.keys(local.results || {}).forEach(function(evId) {
    if (!m.results[evId]) m.results[evId] = {};
    Object.keys(local.results[evId] || {}).forEach(function(rId) {
      // Local result always wins
      m.results[evId][rId] = local.results[evId][rId];
    });
  });
  // Tournament runners: local wins
  m.tournamentRunners = JSON.parse(JSON.stringify(remote.tournamentRunners || {}));
  Object.keys(local.tournamentRunners || {}).forEach(function(tid) {
    m.tournamentRunners[tid] = local.tournamentRunners[tid];
  });
  m._savedAt = Date.now();
  return m;
}

async function ghGetSha(cfg) {
  var r = await fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + cfg.path, {
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github.v3+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GitHub API error: ' + r.status);
  return (await r.json()).sha || null;
}

async function ghPush() {
  var cfg = ghLoadConfig();
  if (!cfg.token || !cfg.repo) { alert('Configure Data Sync in Settings first.'); return; }
  if (!ghHasRetrieved()) { ghStatus('Load data first', false); alert('Load the latest data first before saving.'); return; }
  ghStatus('Saving...');
  try {
    var sha = await ghGetSha(cfg);
    S._savedAt = Date.now();
    var logo = localStorage.getItem('parkrun_logo') || null;
    var payload = JSON.parse(JSON.stringify(S));
    payload._logo = logo;
    persist();
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
    var body = { message: 'Sync ' + new Date().toISOString(), content: content };
    if (sha) body.sha = sha;
    var r = await fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + cfg.path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify(body)
    });
    if (!r.ok) { var e = await r.json(); throw new Error(e.message || r.status); }
    // Update local savedAt to match what we just pushed
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    ghStatus('Saved ' + new Date().toLocaleTimeString(), true);
    ghSetSaveEnabled(true);
    showToast('Data saved to cloud');
  } catch(e) { ghStatus('Save failed: ' + e.message, false); console.error(e); }
}

async function ghPull() {
  var cfg = ghLoadConfig();
  if (!cfg.token || !cfg.repo) { ghStatus('No token configured', false); return; }
  ghStatus('Loading...');
  try {
    var r = await fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + cfg.path, {
      headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github.v3+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (r.status === 404) { ghMarkRetrieved(); ghSetSaveEnabled(true); ghStatus('No data saved yet', false); return; }
    if (!r.ok) { var e = await r.json(); throw new Error(e.message || 'HTTP ' + r.status); }
    var d = await r.json();
    var raw = d.content.replace(/\n/g, '');
    var remote = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw), function(c) { return c.charCodeAt(0); })));
    var differs = JSON.stringify(S) !== JSON.stringify(remote);
    var hasLocal = !!(S.runners && S.runners.length || S.tournaments && S.tournaments.length);
    if (hasLocal && differs) {
      var ls = S._savedAt ? new Date(S._savedAt).toLocaleString() : 'unsaved';
      var rs = remote._savedAt ? new Date(remote._savedAt).toLocaleString() : 'unknown';
      var choice = await new Promise(function(resolve) {
        confirmModal('Data Conflict', 'Local: ' + ls + '\nCloud: ' + rs + '\n\nMerge keeps both. Overwrite replaces local with cloud.', 'Merge', function() { resolve('merge'); });
        setTimeout(function() {
          var b = document.getElementById('confirm-cancel');
          if (b) { b.textContent = 'Overwrite'; b.onclick = function() { resolve('overwrite'); confirmCancel(); }; }
        }, 30);
      });
      S = choice === 'merge' ? ghMerge(S, remote) : remote;
    } else {
      S = remote;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    if (remote._logo) localStorage.setItem('parkrun_logo', remote._logo);
    else localStorage.removeItem('parkrun_logo');
    loadLogo();
    ghMarkRetrieved(); ghSetSaveEnabled(true);
    ghStatus('Loaded ' + new Date().toLocaleTimeString(), true);
    renderRunners(); renderTournaments(); renderLbSel(); renderGlobalSettings();
  } catch(e) {
    ghStatus('Load failed: ' + e.message + ' — you can still save manually', false);
    ghMarkRetrieved(); ghSetSaveEnabled(true); console.warn(e);
  }
}
