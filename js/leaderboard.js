// Leaderboard page

var lbScores = [];   // rows of the leaderboard on screen, used by the runner modal

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

  lbScores = scores;
  var ts = getTournamentSettings(parseInt(tid));
  var showAttBonus = (ts.attendanceBonus || 0) > 0 && scores.some(function(s) { return s.attendancePts > 0; });
  var hasVolunteers = scores.some(function(s) { return s.volunteerPts > 0; });
  var showVolBonus = hasVolunteers;
  var hasWildcard = filterEvs.some(function(e) { return e.wildcard === true; });
  var showWcBonus = hasWildcard && (ts.wildcardBonus || 2) > 0 && scores.some(function(s) { return s.wildcardPts > 0; });
  var colDef = '40px 1fr' + (showAttBonus ? ' 75px' : '') + (showWcBonus ? ' 75px' : '') + ' 75px 90px' + (showVolBonus ? ' 75px' : '') + ' 80px';
  var hdr = '<span class="u-th-right" style="text-align:left;">#</span>'
    + '<span class="u-th-right" style="text-align:left;">Runner</span>'
    + (showAttBonus ? '<span class="u-th-right">&#9989; Att.</span>' : '')
    + (showWcBonus ? '<span class="u-th-right">&#9889; WC</span>' : '')
    + '<span class="u-th-right">&#9201; Speed</span>'
    + '<span class="u-th-right">&#127919; Bonus</span>'
    + (showVolBonus ? '<span class="u-th-right">&#129309; Vol.</span>' : '')
    + '<span class="u-th-right">&#127942; Total</span>';
  var posStyles = ['background:var(--orange);color:#fff;', 'background:#555;color:#fff;', 'background:#7a3d10;color:#fff;'];
  var rows = scores.length ? scores.map(function(s, i) {
    var bandColor = s.bandPts > 0 ? 'var(--green)' : s.bandPts < 0 ? 'var(--red)' : 'var(--text)';
    return '<div class="lb-row" style="--lbcols:' + colDef + ';cursor:pointer;" onclick="showRunnerSummary(' + s.runner.id + ')" title="View times: ' + s.runner.name + '">'
      + '<div class="pos-num" style="' + (posStyles[i] || 'background:var(--bg4);color:var(--text2);font-size:12px;') + '">' + (i+1) + '</div>'
      + '<div><div class="lb-name">' + s.runner.name + '</div><div class="lb-sub">' + (s.runner.rid ? 'A' + s.runner.rid + ' &middot; ' : '') + s.runs + ' run' + (s.runs !== 1 ? 's' : '') + '</div></div>'
      + '<div class="lb-pts">'
      + (showAttBonus ? '<div class="text-right lb-pt" data-l="Att." style="color:var(--blue);">+' + s.attendancePts + '</div>' : '')
      + (showWcBonus ? '<div class="text-right lb-pt" data-l="WC" style="color:#c084fc;">+' + s.wildcardPts + '</div>' : '')
      + '<div class="text-right lb-pt" data-l="Speed" style="color:' + bandColor + ';">' + (s.bandPts > 0 ? '+' : '') + s.bandPts + '</div>'
      + '<div class="text-right lb-pt" data-l="Bonus" style="color:var(--orange);">' + (s.bonus > 0 ? '+' : '') + s.bonus + '</div>'
      + (showVolBonus ? '<div class="text-right lb-pt" data-l="Vol." style="color:var(--green);">+' + s.volunteerPts + '</div>' : '')
      + '</div>'
      + '<div class="text-right lb-total" style="color:' + (i === 0 ? 'var(--orange)' : 'var(--text)') + ';">' + s.total + ' <span style="color:var(--text3);font-weight:400;">&rsaquo;</span></div></div>';
  }).join('') : '<div class="notice">No results entered yet.</div>';

  area.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:10px;margin-bottom:1.25rem;">'
    + [{label:'Club Runners',value:S.runners.length},{label:'Avg Turnout',value:(filterEvs.filter(function(e){return !e.wildcard;}).length ? Math.round(scores.reduce(function(n,x){return n+x.runs;},0) / filterEvs.filter(function(e){return !e.wildcard;}).length * 10) / 10 : 0) + ' / race'},{label:'Leader',value:scores.length ? scores[0].runner.name.split(' ')[0] : '–',sub:scores.length > 1 ? '+' + (scores[0].total - scores[1].total) + ' pts ahead of ' + scores[1].runner.name.split(' ')[0] : ''},{label:'Events',value:filterEvs.length}].map(function(m) { return '<div class="metric"><div class="metric-label">' + m.label + '</div><div class="metric-value">' + m.value + '</div>' + (m.sub ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">' + m.sub + '</div>' : '') + '</div>'; }).join('') + '</div>'
    + '<div class="card"><div class="lb-hdr" style="--lbcols:' + colDef + ';">' + hdr + '</div>' + rows + '</div>';
}

// Modal: every tournament time for one runner (opened by clicking a leaderboard row)
function showRunnerSummary(rid) {
  var r = getRunner(rid); if (!r) return;
  var today = new Date().toISOString().substring(0,10);
  var sel = document.getElementById('lb-tournament-sel'); var curTid = sel ? sel.value : '';
  var html = '';
  S.tournaments.slice().sort(function(a, b) { return (String(b.id) === curTid) - (String(a.id) === curTid); }).forEach(function(t) {
    var ts = getTournamentSettings(t.id), base = getTournamentBaselinePb(r.id, t.id), rows = '', best = null;
    S.events.filter(function(e) { return e.tournamentId === t.id && (!e.date || e.date <= today); })
      .sort(function(a, b) { return (a.date || '').localeCompare(b.date || '') || a.runNumber - b.runNumber; }).forEach(function(ev) {
        var rd = (S.results[ev.id] || {})[r.id];
        if (!isAttended(rd)) return;
        var what, pts = '';
        if (ev.wildcard) { what = '<span style="color:#c084fc;">Wildcard</span>'; pts = '+' + (ts.wildcardBonus || 2); }
        else if (rd.volunteer) { what = '<span style="color:var(--green);">Volunteered</span>'; }
        else if (rd.actualSec != null) {
          what = '<b class="text-mono">' + sTime(rd.actualSec) + '</b>';
          if (base != null) { var dl = rd.actualSec - base; what += ' <span style="font-size:11px;color:' + (dl < 0 ? 'var(--green)' : dl > 0 ? 'var(--red)' : 'var(--text3)') + ';">' + (dl < 0 ? '−' : '+') + sTime(Math.abs(dl)) + '</span>'; }
          if (best == null || rd.actualSec < best) best = rd.actualSec;
          if (base != null && isParkrun(t.id) && r.band) { var bp = getBandPtsForRunner(rd.actualSec - base, r.band, ts).pts; pts = (bp > 0 ? '+' : '') + bp; }
        } else return;
        rows += '<tr><td>' + (ev.date ? fmtDate(ev.date) : '') + '</td><td>' + ev.locationName.split(' ')[0] + ' #' + ev.runNumber + '</td><td>' + what + '</td><td class="text-right">' + pts + '</td></tr>';
      });
    if (!rows) return;
    html += '<div style="margin-top:.9rem;"><div style="font-weight:700;color:var(--orange);">' + t.name + '</div>'
      + '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;">' + (base != null ? 'Baseline ' + sTime(base) : 'No baseline') + (best != null ? ' &middot; Best ' + sTime(best) : '') + '</div>'
      + '<div style="overflow-x:auto;"><table style="font-size:13px;"><tr><th style="text-align:left;">Date</th><th style="text-align:left;">Event</th><th style="text-align:left;">Time</th><th class="text-right">Pts</th></tr>' + rows + '</table></div></div>';
  });
  var pos = lbScores.findIndex(function(x) { return x.runner.id === r.id; }), me = lbScores[pos];
  if (me) {
    var ord = pos + 1, sfx = (ord % 100 >= 11 && ord % 100 <= 13) ? 'th' : ['th','st','nd','rd','th','th','th','th','th','th'][ord % 10];
    var parts = [['Speed', me.bandPts, 'var(--text)'], ['Att.', me.attendancePts, 'var(--blue)'], ['Bonus', me.bonus, 'var(--orange)'], ['Wildcard', me.wildcardPts, '#c084fc'], ['Vol.', me.volunteerPts, 'var(--green)']]
      .filter(function(x) { return x[0] === 'Speed' || x[1] !== 0; });
    html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.6rem;"><span style="font-family:Barlow Condensed,sans-serif;font-size:22px;font-weight:800;color:var(--orange);">' + ord + sfx + ' place</span></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + parts.map(function(x) { return '<div style="background:var(--bg3);border-radius:6px;padding:6px 10px;text-align:center;min-width:56px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);">' + x[0] + '</div><div style="font-size:16px;font-weight:700;color:' + x[2] + ';">' + (x[1] > 0 ? '+' : '') + x[1] + '</div></div>'; }).join('')
      + '<div style="background:var(--bg4);border-radius:6px;padding:6px 10px;text-align:center;min-width:56px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);">Total</div><div style="font-size:16px;font-weight:800;color:var(--orange);">' + me.total + '</div></div></div>' + html;
  }
  document.getElementById('runner-modal-title').textContent = r.name + (r.band ? ' · Band ' + r.band : '');
  document.getElementById('runner-modal-body').innerHTML = html || '<p style="color:var(--text3);">No times recorded yet.</p>';
  document.getElementById('runner-modal').classList.add('open');
}
