// Tournament/runner data accessors, enrolment, baselines
// ── Lookups by id (strict match, returns undefined if not found) ──
function getTournament(id) { return S.tournaments.find(function(x) { return x.id === id; }); }
function getRunner(id) { return S.runners.find(function(x) { return x.id === id; }); }
function getLocation(id) { return S.locations.find(function(x) { return x.id === id; }); }
function getEvent(id) { return S.events.find(function(x) { return x.id === id; }); }


function getTournamentSettings(tid) { var t = getTournament(tid); return (t && t.settings) ? t.settings : defaultTournamentSettings(); }
function isParkrun(tid) { var t = getTournament(tid); return !t || !t.type || t.type === 'parkrun'; }
function getTournamentActivityType(tid) { var t = getTournament(tid); var type = (t && t.type) || 'parkrun'; if (type === 'generic') { return (S.activityTypes || DEFAULT_ACTIVITY_TYPES).find(function(t) { return t !== 'parkrun'; }) || '10k'; } return type; }
function getRunnerPb(rId, at) { var r = getRunner(rId); if (!r) return null; if (r.pbs && r.pbs[at] != null) return r.pbs[at]; if (at === 'parkrun' && r.pbSec != null) return r.pbSec; return null; }
function getTournamentRunners(tid) { if (!tid) return S.runners.filter(function(r) { return !r.archived; }); var key = String(tid); var enrolled = S.tournamentRunners[key] || []; return S.runners.filter(function(r) { return !r.archived && enrolled.some(function(e) { return String(e.rId) === String(r.id); }); }); }
function getTournamentRunnerEntry(tid, rId) { var key = String(tid); return (S.tournamentRunners[key] || []).find(function(e) { return String(e.rId) === String(rId); }) || null; }
function isEnrolled(tid, rId) { var key = String(tid); return (S.tournamentRunners[key] || []).some(function(e) { return String(e.rId) === String(rId); }); }
function enrollRunner(tid, rId, baselineSec) { var key = String(tid); if (!S.tournamentRunners[key]) S.tournamentRunners[key] = []; S.tournamentRunners[key] = S.tournamentRunners[key].filter(function(e) { return String(e.rId) !== String(rId); }); S.tournamentRunners[key].push({rId:rId, baselineSec:baselineSec, enrolledDate:new Date().toISOString().substring(0,10)}); }
function unenrollRunner(tid, rId) { var key = String(tid); if (!S.tournamentRunners[key]) return; S.tournamentRunners[key] = S.tournamentRunners[key].filter(function(e) { return String(e.rId) !== String(rId); }); }

function setBaseline(rId, actType, sec, tid) {
  var r = getRunner(rId); if (!r) return;
  if (tid != null) {
    var entry = getTournamentRunnerEntry(tid, rId);
    var prev = entry ? entry.baselineSec : null;
    if (prev != null && prev !== sec) { if (!r.pbHistory) r.pbHistory = {}; var key = actType + '_t' + tid; if (!r.pbHistory[key]) r.pbHistory[key] = []; r.pbHistory[key].push({sec:prev, date:new Date().toISOString().substring(0,10)}); }
    enrollRunner(tid, rId, sec);
  } else {
    if (!r.pbs) r.pbs = {};
    var prev2 = r.pbs[actType];
    if (prev2 != null && prev2 !== sec) { if (!r.pbHistory) r.pbHistory = {}; if (!r.pbHistory[actType]) r.pbHistory[actType] = []; r.pbHistory[actType].push({sec:prev2, date:new Date().toISOString().substring(0,10)}); }
    r.pbs[actType] = sec; if (actType === 'parkrun') r.pbSec = sec;
  }
}

function getTournamentBaselinePb(rId, tid) {
  var entry = getTournamentRunnerEntry(tid, rId);
  var tevs = S.events.filter(function(e) { return e.tournamentId === tid && e.date; }).sort(function(a,b) { return a.date.localeCompare(b.date); });
  for (var i = 0; i < tevs.length; i++) { var rd = (S.results[tevs[i].id] || {})[rId]; if (rd && rd.baselinePbSec != null) return rd.baselinePbSec; }
  if (entry && entry.baselineSec != null) return entry.baselineSec;
  return getRunnerPb(rId, getTournamentActivityType(tid));
}
