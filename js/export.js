// CSV export

function downloadFile(filename, content, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type:mime})); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

function exportCSV(type) {
  var today = new Date().toISOString().substring(0,10);
  if (type === 'runners') {
    var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES; var activeTournaments = S.tournaments.filter(function(t) { return !t.archived; });
    var header = ['Name','Runner ID'].concat(types.map(function(t) { return t + ' Baseline'; })).concat(activeTournaments.map(function(t) { return t.name + ' Baseline'; }));
    var rows = [header];
    S.runners.forEach(function(r) {
      var globalBaselines = types.map(function(type) { return r.pbs && r.pbs[type] != null ? sTime(r.pbs[type]) : (type === 'parkrun' && r.pbSec != null ? sTime(r.pbSec) : ''); });
      var tournamentBaselines = activeTournaments.map(function(t) { var entry = getTournamentRunnerEntry(t.id, r.id); return entry && entry.baselineSec != null ? sTime(entry.baselineSec) : ''; });
      rows.push([r.name, 'A' + r.rid].concat(globalBaselines).concat(tournamentBaselines));
    });
    downloadFile('runners.csv', rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n'), 'text/csv');
  } else if (type === 'results') {
    var rows = [['Tournament','Location','Run #','Date','Runner','Runner ID','Baseline','Time','Diff (s)','Points','Attended']];
    S.events.filter(function(e) { return !e.date || e.date <= today; }).forEach(function(ev) {
      var t = getTournament(ev.tournamentId); var ts = getTournamentSettings(ev.tournamentId); var res = S.results[ev.id] || {};
      S.runners.forEach(function(r) {
        var rd = res[r.id] || {}; var attended = isAttended(rd); var actual = attended ? (rd.actualSec != null ? rd.actualSec : null) : null;
        var baseline = getTournamentBaselinePb(r.id, ev.tournamentId) || r.pbSec; var diff = (actual != null && baseline != null) ? actual - baseline : null; var bp = diff != null ? getBandPts(diff, ts) : null;
        rows.push([t ? t.name : '', ev.locationName, ev.runNumber, ev.date || '', r.name, 'A' + r.rid, baseline != null ? sTime(baseline) : '', actual != null ? sTime(actual) : '', diff != null ? diff : '', bp != null ? bp.pts : '', attended ? 'Yes' : 'No']);
      });
    });
    downloadFile('results.csv', rows.map(function(r) { return r.map(function(c) { return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','); }).join('\n'), 'text/csv');
  }
}
