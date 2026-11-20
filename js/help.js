// Help page: how scoring works (interactive, uses the live tournament settings) and how to use the app

function helpSettings() {
  var t = S.tournaments.filter(function(x) { return !x.archived && (!x.type || x.type === 'parkrun'); })[0];
  return { name: t ? t.name : null, settings: t ? getTournamentSettings(t.id) : defaultTournamentSettings() };
}

// Axis span (seconds faster than baseline; negative = slower) wide enough for every tier in the table.
function helpAxis(table) {
  var lo = 0, hi = 0;
  Object.keys(table).forEach(function(band) {
    table[band].forEach(function(b) {
      if (b.slowerTo != null) lo = Math.max(lo, b.slowerTo);
      if (b.minFaster != null) hi = Math.max(hi, b.maxFaster != null ? b.maxFaster : b.minFaster + 45);
    });
  });
  return { lo: -(lo + 15), hi: hi + 15 };
}

// Season total broken into its parts, using the same settings the leaderboard uses.
function helpSeasonParts(runs, avgSpeed, wildcards, volunteered, settings) {
  return [
    { label: 'Speed', pts: runs * avgSpeed, color: 'var(--orange)' },
    { label: 'Attendance', pts: runs * (settings.attendanceBonus || 0), color: 'var(--blue)' },
    { label: 'Volunteer', pts: volunteered ? (settings.volunteerBonus || 0) : 0, color: 'var(--green)' },
    { label: 'Wildcard', pts: wildcards * (settings.wildcardBonus || 2), color: 'var(--purple)' },
    { label: 'Run-count bonus', pts: getBonus(runs, settings), color: 'var(--text3)' }
  ];
}

function helpPct(v, ax) { return (v - ax.lo) / (ax.hi - ax.lo) * 100; }
function helpColor(pts, faster) {
  return faster ? 'color-mix(in srgb, var(--green) ' + (14 + pts * 7) + '%, var(--bg2))' : 'color-mix(in srgb, var(--red) ' + (pts < 1 ? 24 : 40) + '%, var(--bg2))';
}
function helpSegs(table, band, ax) {
  var out = '';
  (table[band] || []).forEach(function(b) {
    var faster = b.minFaster != null, a, z;
    if (faster) { a = b.minFaster - .5; z = b.maxFaster == null ? ax.hi : b.maxFaster + .5; }
    else { a = -b.slowerTo - .5; z = -Math.max(b.slowerFrom, 1) + .5; }
    var w = helpPct(z, ax) - helpPct(a, ax);
    out += '<div class="help-seg" style="left:' + helpPct(a, ax) + '%;width:' + w + '%;background:' + helpColor(b.pts, faster) + ';" title="' + b.pts + ' pts">' + (w > 3.2 ? b.pts : '') + '</div>';
  });
  return out + '<div class="help-zero" style="left:' + helpPct(0, ax) + '%;"></div>';
}
function helpAxisHtml(ax, ticks) {
  return ticks.filter(function(v) { return v >= ax.lo && v <= ax.hi; }).map(function(v) {
    return '<span style="left:' + helpPct(v, ax) + '%;">' + (v > 0 ? '+' + v : v < 0 ? '&minus;' + (-v) : '0') + 's</span>';
  }).join('');
}
var HELP_TICKS = [-100, -50, 0, 50, 100, 150, 200, 250];

function helpOne() {
  var h = helpSettings(), table = getBandTable(h.settings), ax = helpAxis(table);
  var bs = tSec(document.getElementById('help-base').value), band = bs ? suggestBand(bs) : null;
  var d = parseInt(document.getElementById('help-diff').value);
  document.getElementById('help-diff-lab').textContent = 'This race vs baseline: ' + (d < 0 ? (-d) + 's faster' : d > 0 ? d + 's slower' : 'level');
  var strip = document.getElementById('help-s1');
  document.getElementById('help-a1').innerHTML = helpAxisHtml(ax, HELP_TICKS);
  if (!band) {
    document.getElementById('help-pts').textContent = '–';
    document.getElementById('help-line1').innerHTML = 'Enter a baseline between <b>21:00</b> and <b>41:00</b> (mm:ss).';
    document.getElementById('help-line2').textContent = ''; strip.innerHTML = ''; return;
  }
  var p = getBandPtsForRunner(d, band, h.settings).pts;
  document.getElementById('help-pts').textContent = p;
  document.getElementById('help-line1').innerHTML = 'Baseline <b>' + sTime(bs) + '</b> puts the runner in <b>Band ' + band + '</b> (' + sTime(BAND_SEC_RANGES[band][0]) + '&ndash;' + sTime(BAND_SEC_RANGES[band][1]) + ').';
  document.getElementById('help-line2').innerHTML = 'Finishing in <b>' + sTime(bs + d) + '</b> is ' + (d < 0 ? (-d) + 's faster than' : d > 0 ? d + 's slower than' : 'level with') + ' baseline: <b>' + p + ' speed point' + (p === 1 ? '' : 's') + '</b>' + (p === 0 ? ' (outside every tier)' : '') + '.';
  strip.innerHTML = helpSegs(table, band, ax) + '<div class="help-marker" style="left:' + helpPct(-d, ax) + '%;"></div>';
}

function helpSeason() {
  var h = helpSettings();
  var runs = parseInt(document.getElementById('help-runs').value), avg = parseFloat(document.getElementById('help-avg').value);
  var wc = parseInt(document.getElementById('help-wc').value), vol = document.getElementById('help-vol').checked;
  document.getElementById('help-runs-lab').textContent = 'Races run: ' + runs;
  document.getElementById('help-avg-lab').textContent = 'Average speed points per race: ' + avg;
  document.getElementById('help-wc-lab').textContent = 'Wildcard events: ' + wc;
  var parts = helpSeasonParts(runs, avg, wc, vol, h.settings);
  var total = parts.reduce(function(s, p) { return s + p.pts; }, 0), shown = parts.filter(function(p) { return p.pts > 0; });
  document.getElementById('help-tot').textContent = total;
  document.getElementById('help-totline').innerHTML = shown.map(function(p) { return p.label + ' <b>' + p.pts + '</b>'; }).join(' + ') || 'No points yet';
  document.getElementById('help-stack').innerHTML = shown.map(function(p) { return '<div style="flex:' + p.pts + ' 1 0;background:' + p.color + ';">' + (p.pts / total > .07 ? p.pts : '') + '</div>'; }).join('');
  document.getElementById('help-slegend').innerHTML = parts.map(function(p) { return '<span><i style="background:' + p.color + ';"></i>' + p.label + '</span>'; }).join('');
}

function renderHelp() {
  var body = document.getElementById('help-body'); if (!body) return;
  var h = helpSettings(), s = h.settings, table = getBandTable(s), ax = helpAxis(table);
  var tiers = s.bonusTiers.slice().sort(function(a, b) { return a.minRuns - b.minRuns; }).map(function(t) { return t.minRuns + ' runs +' + t.points; }).join(', ');
  var terms = [
    ['var(--orange)', 'Speed', '0 to 8 per race, against your own baseline'],
    ['var(--blue)', 'Attendance', '+' + (s.attendanceBonus || 0) + ' for every race'],
    ['var(--green)', 'Volunteer', '+' + (s.volunteerBonus || 0) + ' (max ' + (s.volunteerMaxSessions != null ? s.volunteerMaxSessions : 1) + ' session)'],
    ['var(--purple)', 'Wildcard', '+' + (s.wildcardBonus || 2) + ' per wildcard event'],
    ['var(--text3)', 'Run-count bonus', tiers + ' (highest tier only)']
  ].map(function(t) { return '<div class="help-term"><i style="background:' + t[0] + ';"></i><b>' + t[1] + '</b><span>' + t[2] + '</span></div>'; }).join('');
  var rows = BAND_LABELS.map(function(b) {
    return '<div class="help-row"><div class="help-lab">Band ' + b + '<small>' + sTime(BAND_SEC_RANGES[b][0]) + '&ndash;' + sTime(BAND_SEC_RANGES[b][1]) + '</small></div><div class="help-strip help-strip-sm">' + helpSegs(table, b, ax) + '</div></div>';
  }).join('');
  var legend = '<span><i style="background:' + helpColor(.5, false) + ';"></i>slower: 0.5&ndash;1 pt</span>'
    + [2, 4, 6, 8].map(function(p) { return '<span><i style="background:' + helpColor(p, true) + ';"></i>faster: ' + p + ' pts</span>'; }).join('')
    + '<span><i style="background:var(--bg3);"></i>0 pts</span>';
  var how = [
    ['Club Runners', 'Use <b>+ Add Runner</b> and enter the Parkrun ID. The band is suggested from the runner’s PB (<b>Use Band</b>) and can be changed. Runners can be archived rather than deleted.'],
    ['Tournaments', '<b>+ New Tournament</b>, then add a location with <b>Add Location</b> and each week’s run with <b>+ Add Event</b>. <b>Baselines</b> sets each enrolled runner’s baseline PB, which is what every race is scored against. <b>Settings</b> holds the scoring tables and bonuses.'],
    ['Entering times', 'Open <b>Enter Times</b> on an event. Mark each runner as <b>Raced</b> or <b>Volunteered</b>, type the time and press <b>Save</b>. <b>View Results</b> shows the baseline, difference, band and points for every runner. Use <b>Edit Times</b> to go back, and <b>Back to tournament</b> to return.'],
    ['Importing from Parkrun', 'On Enter Times, <b>Import from Parkrun</b> accepts a pasted club report or a screenshot of the results. Check the matches, then <b>Commit Selected</b>.'],
    ['Wildcard events', 'Tick an event as a wildcard in the tournament <b>Settings</b>. Everyone who attends gets the flat wildcard bonus instead of band scoring.'],
    ['Leaderboard', 'Public view of the totals, with the points split into attendance, volunteer, speed, bonus and total. Pick a tournament at the top.'],
    ['Saving and syncing', 'Data is stored in this browser. In <b>Global Settings</b> the <b>Data Sync</b> panel (GitHub token, repo, file path) saves it to the shared <b>data.json</b> so every device sees the same league. If saving fails with 401, the token has expired or is wrong.']
  ].map(function(x) { return '<div class="help-how"><h3>' + x[0] + '</h3><p>' + x[1] + '</p></div>'; }).join('');

  body.innerHTML = '<div class="page-header"><h2>How it works</h2></div>'
    + '<p class="help-lead">Every race is scored against the runner’s own baseline PB, so slower and faster runners earn points for the same relative effort. <span id="help-for"></span></p>'
    + '<div class="help-formula">' + terms + '</div>'
    + '<div class="card"><div class="card-title">1 &middot; One race</div>'
    + '<div class="help-controls"><label class="help-f">Baseline PB (mm:ss)<input type="text" id="help-base" value="24:30" inputmode="numeric" autocomplete="off" oninput="helpOne()"/></label>'
    + '<label class="help-f"><span id="help-diff-lab"></span><input type="range" id="help-diff" min="-270" max="100" value="-40" oninput="helpOne()"/></label></div>'
    + '<div class="help-readout"><div class="help-big" id="help-pts"></div><div><p id="help-line1"></p><p id="help-line2"></p></div></div>'
    + '<div class="help-dir"><span class="s">&#9664; slower than baseline</span><span class="f">faster than baseline &#9654;</span></div>'
    + '<div class="help-strip" id="help-s1"></div><div class="help-axis" id="help-a1"></div></div>'
    + '<div class="card"><div class="card-title">2 &middot; All bands side by side</div>'
    + '<p class="help-note">Same seconds scale for every band. Slower runners get wider tiers, so the same points need a bigger improvement in seconds.</p>'
    + '<div class="help-legend">' + legend + '</div>'
    + '<div class="help-scroll"><div>' + rows + '<div class="help-axis" style="margin-left:90px;">' + helpAxisHtml(ax, HELP_TICKS) + '</div></div></div></div>'
    + '<div class="card"><div class="card-title">3 &middot; A whole season</div>'
    + '<div class="help-controls"><label class="help-f"><span id="help-runs-lab"></span><input type="range" id="help-runs" min="1" max="10" value="4" oninput="helpSeason()"/></label>'
    + '<label class="help-f"><span id="help-avg-lab"></span><input type="range" id="help-avg" min="0" max="8" step="0.5" value="3" oninput="helpSeason()"/></label>'
    + '<label class="help-f"><span id="help-wc-lab"></span><input type="range" id="help-wc" min="0" max="3" value="0" oninput="helpSeason()"/></label>'
    + '<label class="help-chk"><input type="checkbox" id="help-vol" onchange="helpSeason()"/> Volunteered once</label></div>'
    + '<div class="help-readout"><div class="help-big" id="help-tot"></div><div><p id="help-totline"></p></div></div>'
    + '<div class="help-stack" id="help-stack"></div><div class="help-legend" id="help-slegend"></div>'
    + '<p class="help-note">Wildcard events are separate from races: they pay the flat wildcard bonus and do not count towards the run-count bonus.</p></div>'
    + '<div class="page-header"><h2>Using the app</h2></div><div class="help-hows">' + how + '</div>';
  document.getElementById('help-for').textContent = h.name ? 'The figures below come from the “' + h.name + '” settings.' : 'The figures below are the league defaults.';
  helpOne(); helpSeason();
}
