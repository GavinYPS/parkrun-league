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

// For a baseline and band: each points tier with the finishing time (seconds) it needs, fastest tier first.
// from/to are inclusive finishing times; from = null means "that time or quicker".
function helpNeed(bs, band, table) {
  var rows = (table[band] || []).map(function(b) {
    if (b.minFaster != null) return { pts: b.pts, from: b.maxFaster == null ? null : bs - b.maxFaster, to: bs - b.minFaster, diff: -b.minFaster, vs: (b.maxFaster == null ? b.minFaster + 's+' : b.minFaster + '–' + b.maxFaster + 's') + ' faster' };
    var lo = Math.max(b.slowerFrom, 1);
    return { pts: b.pts, from: bs + lo, to: bs + b.slowerTo, diff: b.slowerTo, vs: lo + '–' + b.slowerTo + 's slower' };
  });
  return rows.sort(function(a, b) { return b.pts - a.pts || a.to - b.to; });
}
// A typical baseline for a band (midpoint, rounded to 15s) for the example buttons.
function helpBandExample(band) { var r = BAND_SEC_RANGES[band]; return Math.round((r[0] + r[1]) / 2 / 15) * 15; }

function helpPick(d) { var el = document.getElementById('help-diff'); if (el) { el.value = d; helpOne(); } }
function helpPickBand(band) { document.getElementById('help-base').value = sTime(helpBandExample(band)); document.getElementById('help-diff').value = -40; helpOne(); }

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
    out += '<div class="help-seg" style="left:' + helpPct(a, ax) + '%;width:' + w + '%;background:' + helpColor(b.pts, faster) + ';" title="' + b.pts + ' pts"' + (w < 3.5 ? ' data-narrow' : '') + '>' + b.pts + '</div>';
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
    document.getElementById('help-line2').textContent = ''; strip.innerHTML = ''; document.getElementById('help-need').innerHTML = '';
    document.querySelectorAll('.help-chip').forEach(function(c) { c.classList.remove('active'); }); return;
  }
  document.querySelectorAll('.help-chip').forEach(function(c) { c.classList.toggle('active', c.getAttribute('data-band') === band); });
  var p = getBandPtsForRunner(d, band, h.settings).pts;
  document.getElementById('help-pts').textContent = p;
  document.getElementById('help-line1').innerHTML = 'Baseline <b>' + sTime(bs) + '</b> puts the runner in <b>Band ' + band + '</b> (' + sTime(BAND_SEC_RANGES[band][0]) + '&ndash;' + sTime(BAND_SEC_RANGES[band][1]) + ').';
  document.getElementById('help-line2').innerHTML = 'Finishing in <b>' + sTime(bs + d) + '</b> is ' + (d < 0 ? (-d) + 's faster than' : d > 0 ? d + 's slower than' : 'level with') + ' baseline: <b>' + p + ' speed point' + (p === 1 ? '' : 's') + '</b>' + (p === 0 ? ' (outside every tier)' : '') + '.';
  strip.innerHTML = helpSegs(table, band, ax) + '<div class="help-marker" style="left:' + helpPct(-d, ax) + '%;"></div>';
  var need = helpNeed(bs, band, table), t = bs + d;
  document.getElementById('help-need').innerHTML = '<div class="help-need-head"><span>Points</span><span>Finish in</span><span>Against baseline</span></div>'
    + need.map(function(r) {
      var when = r.from == null ? sTime(r.to) + ' or quicker' : r.from === r.to ? sTime(r.to) : sTime(r.from) + ' – ' + sTime(r.to);
      var hit = (r.from == null || t >= r.from) && t <= r.to;
      return '<button class="help-need-row' + (hit ? ' hit' : '') + '" onclick="helpPick(' + r.diff + ')"><b>' + r.pts + '</b><span>' + when + '</span><span>' + r.vs + '</span></button>';
    }).join('')
    + '<p class="help-note">Finish slower than ' + sTime(bs + (table[band].filter(function(b) { return b.slowerTo != null; }).reduce(function(m, b) { return Math.max(m, b.slowerTo); }, 0))) + ' and the race scores 0 speed points. Click a row to move the slider to the slowest time in that tier.</p>';
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

var helpTab = 'scoring';
function helpTabSwitch(tab) {
  helpTab = tab;
  ['scoring', 'admin'].forEach(function(k) {
    var panel = document.getElementById('help-p-' + k), btn = document.getElementById('help-t-' + k);
    if (panel) panel.style.display = k === tab ? '' : 'none';
    if (btn) btn.classList.toggle('active', k === tab);
  });
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
  function cards(list) { return '<div class="help-hows">' + list.map(function(x) { return '<div class="help-how"><h3>' + x[0] + '</h3><p>' + x[1] + '</p></div>'; }).join('') + '</div>'; }
  var admin = isLoggedIn();
  if (!admin || !helpTab) helpTab = 'scoring';
  var leaderboardHelp = cards([
    ['Runner and #', 'Runners are ranked by total points. Ties are broken alphabetically. The small line under a name shows the Parkrun ID and how many races they have run.'],
    ['Att.', 'Attendance points: a flat bonus for every race the runner completed.'],
    ['Vol.', 'Volunteer points. Only shown once someone has volunteered.'],
    ['WC', 'Wildcard points from wildcard events. Only shown when the tournament has a wildcard event.'],
    ['Speed', 'Points for how much faster (or slower) the runner was than their own baseline, added up over every race. See section 1 above.'],
    ['Bonus', 'The run-count bonus for racing often. Only the highest tier reached counts, once.'],
    ['Total', 'Everything added together. Runners with no results yet are not listed.']
  ]);
  var adminHelp =
      '<h3 class="help-sub">Club runners</h3>' + cards([
        ['Adding a runner', 'On <b>Club Runners</b> press <b>+ Add Runner</b>. Only a name is required. Add the Parkrun ID (with or without the leading A) and a link to their Parkrun profile appears. The same ID cannot be added twice. Enter a baseline time for each activity type, and the band is suggested from the parkrun baseline (press <b>Use Band</b> or pick one from the list). Finish with <b>Save Runner</b>.'],
        ['Changing a runner', 'Use the pencil beside the name to rename a runner or tick <b>Run Leader</b>. <b>Baselines</b> edits their personal bests and band. Changing a PB here does not change a baseline already set for a tournament (see below).'],
        ['Adding a runner to a tournament', 'Adding a runner to the club does not put them on a leaderboard. In <b>Tournaments</b>, open the tournament’s <b>Club Runners</b> button, press <b>Edit</b>, tick the runner, enter their baseline for that tournament and check the band, then <b>Save</b>. Typing a baseline ticks the box for you, and a runner ticked without a baseline will not save.'],
        ['Removing a runner from a tournament', 'In the same <b>Club Runners</b> panel, press <b>Edit</b>, untick the runner and <b>Save</b>. They drop off that tournament’s leaderboard and runner list. Their recorded times are kept, and they stay in the club and in any other tournament.'],
        ['Archiving a runner', '<b>Archive</b> on a runner’s card (you are asked to confirm) is the safe way to take someone out, for example when they leave the club. They move to the greyed <b>Archived</b> section at the bottom of the page, disappear from every tournament and leaderboard, and cannot be enrolled. Nothing is lost.'],
        ['Restoring or deleting', 'Open the <b>Archived</b> section and press <b>Restore</b> to bring a runner back. They return to every tournament they were in, with their times and baselines intact. <b>Delete</b> is permanent: it removes the runner and all of their recorded times and tournament entries, and cannot be undone. Archive instead unless it was added by mistake.']
      ])
    + '<h3 class="help-sub">Tournaments and events</h3>' + cards([
        ['Creating a tournament', 'Press <b>+ New Tournament</b>, name it and choose its type. Then <b>Add Location</b>, and a <b>+ Add Event</b> for each week’s run. Archive a finished tournament to tidy the list, and restore it any time.'],
        ['Baselines', 'The baseline is the time every race is scored against. It is set per tournament in the <b>Club Runners</b> panel, and starts from the runner’s PB for that activity.']
      ])
    + '<h3 class="help-sub">Match day</h3>' + cards([
        ['Entering times', 'Open <b>Enter Times</b> on an event. Mark each runner as <b>Raced</b> or <b>Volunteered</b>, type the time and press <b>Save</b>. <b>View Results</b> shows baseline, difference, band and points for everyone. <b>Edit Times</b> goes back, and <b>Back to tournament</b> returns to the Tournaments page.'],
        ['Importing from Parkrun', 'On Enter Times, <b>Import from Parkrun</b> takes a pasted club report or a screenshot of the results. Check the matches, then <b>Commit Selected</b>.'],
        ['Wildcard events', 'Tick an event as a wildcard in the tournament <b>Settings</b>. Everyone who attends gets the flat wildcard bonus instead of band scoring.']
      ])
    + '<h3 class="help-sub">Scoring settings</h3>' + cards([
        ['Editing the bands', 'Open a tournament’s <b>Settings</b>. In Band Scoring each box is the most seconds slower or faster than baseline that earns those points. Changing a box moves the neighbouring tier so there are never gaps or overlaps, and clearing a box drops that tier. The line under each band spells out the ranges. <b>Save Settings</b> keeps your changes and <b>Reset</b> restores the defaults.'],
        ['Bonuses', 'Attendance, volunteer and wildcard points, and the run-count tiers, are in the same Settings panel. The Help figures above update to match as soon as you save.']
      ])
    + '<h3 class="help-sub">Saving and syncing</h3>' + cards([
        ['Data Sync', 'Data is kept in this browser. In <b>Global Settings</b> the <b>Data Sync</b> panel (GitHub token, repo, file path) saves it to the shared <b>data.json</b> so every device sees the same league. <b>Save Data</b> pushes and <b>Load Data</b> pulls.'],
        ['If saving fails', 'A 401 error means the GitHub token has expired or is wrong. Create a new fine-grained token with <b>Contents: Read and write</b> on the repo and paste it into the Token box.']
      ]);
  var tabs = admin ? '<div class="help-tabs"><button id="help-t-scoring" onclick="helpTabSwitch(\'scoring\')">Scoring</button><button id="help-t-admin" onclick="helpTabSwitch(\'admin\')">Admin guide</button></div>' : '';

  body.innerHTML = '<div class="page-header"><h2>Help</h2>' + tabs + '</div>'
    + '<div id="help-p-scoring"><p class="help-lead">Every race is scored against the runner’s own baseline PB, so slower and faster runners earn points for the same relative effort. <span id="help-for"></span></p>'
    + '<div class="help-formula">' + terms + '</div>'
    + '<div class="card"><div class="card-title">1 &middot; What do I need?</div>'
    + '<p class="help-note">Pick a band to see an example, or type your own baseline PB. The table shows the finishing time needed for each points tier.</p>'
    + '<div class="help-chips">' + BAND_LABELS.map(function(b) { return '<button class="help-chip" data-band="' + b + '" onclick="helpPickBand(\'' + b + '\')">Band ' + b + '<small>' + sTime(BAND_SEC_RANGES[b][0]) + '&ndash;' + sTime(BAND_SEC_RANGES[b][1]) + '</small></button>'; }).join('') + '</div>'
    + '<div class="help-controls"><label class="help-f">Baseline PB (mm:ss)<input type="text" id="help-base" value="24:30" inputmode="numeric" autocomplete="off" oninput="helpOne()"/></label>'
    + '<label class="help-f"><span id="help-diff-lab"></span><input type="range" id="help-diff" min="-270" max="100" value="-40" oninput="helpOne()"/></label></div>'
    + '<div class="help-readout"><div class="help-big" id="help-pts"></div><div><p id="help-line1"></p><p id="help-line2"></p></div></div>'
    + '<div class="help-scroll"><div><div class="help-dir"><span class="s">&#9664; slower than baseline</span><span class="f">faster than baseline &#9654;</span></div>'
    + '<div class="help-strip" id="help-s1"></div><div class="help-axis" id="help-a1"></div></div></div><div id="help-need"></div></div>'
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
    + '<div class="card"><div class="card-title">Reading the leaderboard</div>' + leaderboardHelp + '</div></div>'
    + (admin ? '<div id="help-p-admin" style="display:none;"><p class="help-lead">Admin only. These steps run the league week to week, and are hidden from visitors who are not logged in.</p>' + adminHelp + '</div>' : '');
  document.getElementById('help-for').textContent = h.name ? 'The figures below come from the “' + h.name + '” settings.' : 'The figures below are the league defaults.';
  helpOne(); helpSeason(); helpTabSwitch(helpTab);
}
