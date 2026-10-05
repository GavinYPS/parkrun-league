// Default state, localStorage load, persist()

function defaultTournamentSettings() {
  return {
    attendanceBonus: 2,
    wildcardBonus: 2,
    volunteerBonus: 1,
    volunteerMaxSessions: 1,
    bonusTiers: [{minRuns:7,points:4},{minRuns:3,points:3}],
    bandTable: JSON.parse(JSON.stringify(DEFAULT_BAND_TABLE))
  };
}

function defaultState() {
  return {runners:[],tournaments:[],locations:[],events:[],results:{},activityTypes:['parkrun','10k'],tournamentRunners:{}};
}

var S = (function() {
  try {
    var r = localStorage.getItem(STORE_KEY);
    if (r) {
      var p = JSON.parse(r);
      if (!p.tournaments) p.tournaments = [];
      if (!p.locations) p.locations = [];
      if (!p.events) p.events = [];
      if (!p.results) p.results = {};
      if (!p.activityTypes) p.activityTypes = ['parkrun','10k'];
      if (!p.tournamentRunners) p.tournamentRunners = {};
      p.tournaments.forEach(function(t) { if (!t.settings) t.settings = defaultTournamentSettings(); });
      p.locations.forEach(function(l) {
        if (l.eventPage && !l.eventPage.match(/^https?:\/\//)) l.eventPage = 'https://' + l.eventPage;
        if (l.resultsUrl && !l.resultsUrl.match(/^https?:\/\//)) l.resultsUrl = 'https://' + l.resultsUrl;
      });
      return p;
    }
  } catch(e) {}
  return defaultState();
})();

function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch(e) {} }
