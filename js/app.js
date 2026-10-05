// Startup: event wiring, initial render, public data load

document.getElementById('confirm-modal').addEventListener('click', function(e) { if (e.target === this) confirmCancel(); });

// Pre-fill the repo/path (not the token) so the admin only has to paste a token once in Settings.
(function() {
  var ex = JSON.parse(localStorage.getItem(GH_CONFIG_KEY) || '{}');
  if (!ex.repo) { ex.repo = 'GavinYPS/parkrun-league'; ex.path = 'data.json'; localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(ex)); }
})();

renderNav(); loadLogo(); renderRunners(); renderTournaments(); renderEnterTimesSel(); renderLbSel(); renderGlobalSettings();
sw('leaderboard');

// Public data load — fetches data.json without a token so the leaderboard
// shows for all visitors even without GitHub credentials configured.
(function publicLoad() {
  var cfg = ghLoadConfig();
  var repo = (cfg && cfg.repo) || 'GavinYPS/parkrun-league';
  var path = (cfg && cfg.path) || 'data.json';
  var rawUrl = 'https://raw.githubusercontent.com/' + repo + '/main/' + path;
  var hasLocalData = S.runners && S.runners.length > 0;

  fetch(rawUrl)
    .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function(remote) {
      // Only overwrite if local data is empty or remote is newer
      var remoteNewer = !hasLocalData ||
        (remote._savedAt && S._savedAt && remote._savedAt > S._savedAt) ||
        (remote._savedAt && !S._savedAt);
      if (remoteNewer) {
        S = remote;
        localStorage.setItem(STORE_KEY, JSON.stringify(S));
        if (remote._logo) localStorage.setItem('parkrun_logo', remote._logo);
        loadLogo();
        renderRunners(); renderTournaments(); renderEnterTimesSel(); renderLbSel(); renderGlobalSettings();
      }
      // Then do authenticated pull if configured (for admin saves)
      if (ghIsConfigured()) ghPull().then(function(){ renderLbSel(); }).catch(function(){});
    })
    .catch(function() {
      // Public fetch failed — fall back to authenticated pull
      if (ghIsConfigured()) ghPull().then(function(){ renderLbSel(); }).catch(function(){});
    });
})();
