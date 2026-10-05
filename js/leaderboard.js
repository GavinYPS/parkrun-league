// Leaderboard page

function renderLbSel() {
  var sel = document.getElementById('lb-tournament-sel'); var cur = sel ? sel.value : '';
  if (!sel) return;
  sel.innerHTML = '<option value="">-- select tournament --</option>' + S.tournaments.map(function(t) { return '<option value="' + t.id + '" ' + (String(t.id) === cur ? 'selected' : '') + '>' + (t.archived ? '[Archived] ' : '') + t.name + '</option>'; }).join('');
  // Auto-select first active tournament if none selected
  if (!cur && S.tournaments.length) {
    var first = S.tournaments.find(function(t){ return !t.archived; }) || S.tournaments[0];
    if (first) { sel.value = String(first.id); renderLeaderboard(); }
  }
}

function renderLeaderboard() {
  var sel = document.getElementById('lb-tournament-sel'); var tid = sel ? sel.value : '';
  var t = tid ? S.tournaments.find(function(x) { return String(x.id) === tid; }) : null;
  var area = document.getElementById('lb-area'); var heading = document.getElementById('lb-heading');
  if (!t) {
    if (heading) heading.textContent = 'Leaderboard';
    area.innerHTML = '<div class="notice" style="padding:2rem 1rem 1rem;"><div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:.5rem;">Select a tournament to view the leaderboard</div><div style="font-size:13px;color:var(--text3);">Use the dropdown above</div></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:1rem;">'
      + [{label:'Club Runners',value:S.runners.length},{label:'Tournaments',value:S.tournaments.length},{label:'Events',value:S.events.length}].map(function(m) { return '<div class="metric"><div class="metric-label">' + m.label + '</div><div class="metric-value">' + m.value + '</div></div>'; }).join('') + '</div>';
    return;
  }
  if (heading) heading.textContent = t.name;
  var today = new Date().toISOString().substring(0,10);
  var filterEvs = S.events.filter(function(e) { return String(e.tournamentId) === tid && (!e.date || e.date <= today); });
  var eligibleRunners = getTournamentRunners(parseInt(tid));
  var scores = eligibleRunners.map(function(r) {
    var bandPts = 0, runs = 0, attendancePts = 0, wildcardPts = 0;
    filterEvs.forEach(function(ev) {
      var rd = (S.results[ev.id] || {})[r.id];
      if (!isAttended(rd)) return;
      var ts = getTournamentSettings(ev.tournamentId);
      if (isAttended(rd)) {
        if (ev.wildcard) { wildcardPts += (ts.wildcardBonus || 2); }
        else if (rd.volunteer) {
          // Volunteer: points handled in separate volunteer loop below
        } else if (rd.actualSec != null) {
          // Racer: attendance bonus + band points
          attendancePts += (ts.attendanceBonus || 0);
          var baseline = getTournamentBaselinePb(r.id, parseInt(tid));
          if (baseline != null && isParkrun(parseInt(tid)) && r.band) {
            var bResult = getBandPtsForRunner(rd.actualSec - baseline, r.band, ts);
            bandPts += bResult.pts;
          }
          runs++;
        }
      }
    });
    var ts = getTournamentSettings(parseInt(tid));
    var volunteerPts = 0;
    var volunteerSessions = 0;
    filterEvs.forEach(function(ev) {
      var rd2 = (S.results[ev.id] || {})[r.id];
      if (rd2 && rd2.volunteer && !ev.wildcard) {
        var ts2 = getTournamentSettings(ev.tournamentId);
        var maxSessions = ts2.volunteerMaxSessions != null ? ts2.volunteerMaxSessions : 1;
        if (maxSessions === 0 || volunteerSessions < maxSessions) {
          volunteerPts += (ts2.volunteerBonus || 0);
          volunteerSessions++;
        }
      }
    });
    return {runner:r, bandPts:bandPts, runs:runs, attendancePts:attendancePts, wildcardPts:wildcardPts, volunteerPts:volunteerPts, bonus:getBonus(runs, ts), total:bandPts + attendancePts + wildcardPts + volunteerPts + getBonus(runs, ts)};
  }).filter(function(s) { return s.runs > 0 || s.volunteerPts > 0 || s.wildcardPts > 0; }).sort(function(a,b) { return b.total - a.total || a.runner.name.localeCompare(b.runner.name); });

  var totalPts = scores.reduce(function(sum, s) { return sum + s.total; }, 0);
  var ts = getTournamentSettings(parseInt(tid));
  var showAttBonus = (ts.attendanceBonus || 0) > 0 && scores.some(function(s) { return s.attendancePts > 0; });
  var hasVolunteers = scores.some(function(s) { return s.volunteerPts > 0; });
  var showVolBonus = hasVolunteers;
  var hasWildcard = filterEvs.some(function(e) { return e.wildcard === true; });
  var showWcBonus = hasWildcard && (ts.wildcardBonus || 2) > 0 && scores.some(function(s) { return s.wildcardPts > 0; });
  var colDef = '40px 1fr' + (showAttBonus ? ' 75px' : '') + (showVolBonus ? ' 75px' : '') + (showWcBonus ? ' 75px' : '') + ' 75px 90px 80px';
  var hdr = '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">#</span>'
    + '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Runner</span>'
    + (showAttBonus ? '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#9989; Att.</span>' : '')
    + (showVolBonus ? '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#129309; Vol.</span>' : '')
    + (showWcBonus ? '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#9889; WC</span>' : '')
    + '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#9201; Speed</span>'
    + '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#127919; Bonus</span>'
    + '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;">&#127942; Total</span>';
  var posStyles = ['background:var(--orange);color:#fff;', 'background:#555;color:#fff;', 'background:#7a3d10;color:#fff;'];
  var rows = scores.length ? scores.map(function(s, i) {
    var bandColor = s.bandPts > 0 ? 'var(--green)' : s.bandPts < 0 ? 'var(--red)' : 'var(--text)';
    return '<div style="display:grid;grid-template-columns:' + colDef + ';gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">'
      + '<div class="pos-num" style="' + (posStyles[i] || 'background:var(--bg4);color:var(--text2);font-size:12px;') + '">' + (i+1) + '</div>'
      + '<div><div class="lb-name">' + s.runner.name + '</div><div class="lb-sub">' + (s.runner.rid ? 'A' + s.runner.rid + ' &middot; ' : '') + s.runs + ' run' + (s.runs !== 1 ? 's' : '') + '</div></div>'
      + (showAttBonus ? '<div class="text-right" style="color:var(--blue);font-weight:600;">+' + s.attendancePts + '</div>' : '')
      + (showVolBonus ? '<div class="text-right" style="color:#6ab04c;font-weight:600;">+' + s.volunteerPts + '</div>' : '')
      + (showWcBonus ? '<div class="text-right" style="color:#c084fc;font-weight:600;">+' + s.wildcardPts + '</div>' : '')
      + '<div class="text-right" style="font-weight:600;color:' + bandColor + ';">' + (s.bandPts > 0 ? '+' : '') + s.bandPts + '</div>'
      + '<div class="text-right" style="color:var(--orange);font-weight:600;">' + (s.bonus > 0 ? '+' : '') + s.bonus + '</div>'
      + '<div class="text-right" style="font-size:22px;font-weight:800;color:' + (i === 0 ? 'var(--orange)' : 'var(--text)') + ';">' + s.total + '</div></div>';
  }).join('') : '<div class="notice">No results entered yet.</div>';

  area.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:1.25rem;">'
    + [{label:'Club Runners',value:S.runners.length},{label:'Total Points',value:totalPts},{label:'Events',value:filterEvs.length}].map(function(m) { return '<div class="metric"><div class="metric-label">' + m.label + '</div><div class="metric-value">' + m.value + '</div></div>'; }).join('') + '</div>'
    + '<div class="card"><div style="display:grid;grid-template-columns:' + colDef + ';gap:8px;padding:6px 0 10px;border-bottom:1px solid var(--border2);margin-bottom:4px;">' + hdr + '</div>' + rows + '</div>';
}
