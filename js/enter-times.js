// Enter Times page

function renderEnterTimesSel() {
  var sel = document.getElementById('et-ev-sel'); if (!sel) return; var cur = sel.value;
  var today = new Date().toISOString().substring(0,10);
  var html = '<option value="">-- select event --</option>';
  S.tournaments.filter(function(t) { return !t.archived; }).forEach(function(t) {
    S.locations.filter(function(l) { return l.tournamentId === t.id; }).forEach(function(loc) {
      var evs = S.events.filter(function(e) { return e.locationId === loc.id && (!e.date || e.date <= today); }).sort(function(a,b) { return a.runNumber - b.runNumber; });
      if (!evs.length) return;
      html += '<optgroup label="' + t.name + ' &mdash; ' + loc.name + '">';
      evs.forEach(function(ev) { html += '<option value="' + ev.id + '" ' + (String(ev.id) === cur ? 'selected' : '') + '>#' + ev.runNumber + (ev.date ? ' &middot; ' + ev.date : '') + '</option>'; });
      html += '</optgroup>';
    });
  });
  sel.innerHTML = html;
}

var etViewMode = false;
var etEditMode = true;

function renderEnterTimes() {
  var evId = parseInt(document.getElementById('et-ev-sel').value);
  var area = document.getElementById('enter-times-area');
  if (!evId) { area.innerHTML = '<div class="notice">Select an event above.</div>'; return; }
  var ev = S.events.find(function(e) { return e.id === evId; }); if (!ev) return;
  if (!S.results[evId]) S.results[evId] = {};
  var today = new Date().toISOString().substring(0,10);
  var parkrunLink = ev.date && isParkrun(ev.tournamentId) ? 'https://www.parkrun.org.uk/' + ev.slug + '/results/' + ev.date + '/' : '';
  var parkrunActive = ev.date && ev.date <= today;
  var ts = getTournamentSettings(ev.tournamentId); var wcPts = ts.wildcardBonus || 2; var wcActive = ev.wildcard === true;
  var actionBtn = '';
  if (etViewMode) {
    actionBtn = '<button class="btn btn-sm btn-info" onclick="etViewMode=false;etEditMode=true;renderEnterTimes();">&larr; Edit Times</button>';
  } else if (etEditMode) {
    actionBtn = '<div style="display:flex;gap:8px;"><button class="btn btn-sm btn-primary" onclick="saveEnterTimes(' + evId + ')">Save</button><button class="btn btn-sm btn-primary" onclick="viewResultsValidated(' + evId + ')">View Results &rarr;</button></div>';
  } else {
    actionBtn = '<div style="display:flex;gap:8px;"><button class="btn btn-sm btn-info" onclick="etEditMode=true;renderEnterTimes();">Edit Times</button><button class="btn btn-sm btn-primary" onclick="viewResultsValidated(' + evId + ')">View Results &rarr;</button></div>';
  }
  var tableHead = etViewMode
    ? '<tr><th>Runner</th><th>Baseline</th><th>Time</th><th>Difference</th><th>Band</th><th>Points</th></tr>'
    : '<tr><th>Runner</th><th>Attended / Volunteer</th><th>Time</th></tr>';
  var titleHtml = ev.locationName + ' <span class="badge badge-orange">#' + ev.runNumber + '</span>' + (wcActive ? ' <span class="badge badge-wc">&#9889; Wildcard +' + wcPts + 'pts</span>' : '');
  var pkBtn = '';
  if (parkrunLink) {
    if (parkrunActive) { pkBtn = ' <button onclick="openParkrunResults(\'' + parkrunLink + '\')" style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--orange);background:none;border:none;cursor:pointer;padding:0;letter-spacing:.06em;">Open Parkrun Results &#8599;</button>'; }
    else { pkBtn = ' <button disabled style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--orange);background:none;border:none;cursor:not-allowed;padding:0;letter-spacing:.06em;opacity:.4;" title="Available on ' + fmtDate(ev.date) + '">Open Parkrun Results &#8599;</button>'; }
  }
  area.innerHTML = '<div class="card">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:1rem;">'
    + '<div><span style="font-size:17px;font-weight:800;text-transform:uppercase;">' + titleHtml + '</span>'
    + '<div style="font-size:12px;color:var(--text2);margin-top:3px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">' + fmtDate(ev.date) + pkBtn + '</div></div>'
    + '<div style="display:flex;gap:8px;align-items:center;">' + actionBtn + '</div></div>'
    + '<div class="results-table-wrap"><table><thead>' + tableHead + '</thead><tbody id="et-tbody-' + evId + '"></tbody></table></div></div>';
  if (etViewMode) renderEtResultRows(evId); else renderEnterTimesRows(evId);
}

function renderEtResultRows(evId) {
  var tbody = document.getElementById('et-tbody-' + evId); if (!tbody) return;
  var ev = S.events.find(function(e) { return e.id === evId; });
  var res = S.results[evId] || {}; var ts = getTournamentSettings(ev ? ev.tournamentId : null); var showPkId = isParkrun(ev ? ev.tournamentId : null);
  var attending = getTournamentRunners(ev ? ev.tournamentId : null).filter(function(r) { return isAttended(res[r.id]); });
  if (!attending.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:1.5rem;">No attending runners.</td></tr>'; return; }
  tbody.innerHTML = attending.map(function(r) {
    var rd = res[r.id] || {};
    var isVolunteer = rd.volunteer === true || (isAttended(rd) && rd.actualSec == null);
    var actual = rd.actualSec != null ? rd.actualSec : null;
    var baseline = getTournamentBaselinePb(r.id, ev ? ev.tournamentId : null);
    var diff = (actual != null && baseline != null) ? actual - baseline : null;

    // Points breakdown for this event
    var bandPts = 0; var bandLabel = '';
    if (!isVolunteer && diff != null && isParkrun(ev ? ev.tournamentId : null) && r.band) {
      var bp = getBandPtsForRunner(diff, r.band, ts);
      bandPts = bp.pts; bandLabel = bp.label;
    }
    var attPts = isVolunteer ? 0 : (ts.attendanceBonus || 0);
    var volPts = isVolunteer ? (ts.volunteerBonus || 0) : 0;
    var eventTotal = bandPts + attPts + volPts;

    var bc = diff == null ? 'badge-neu' : diff < 0 ? 'badge-pos' : 'badge-neg';
    var ptsColor = eventTotal > 0 ? 'var(--orange)' : eventTotal < 0 ? 'var(--red)' : 'var(--text)';
    var ptsDisplay = (eventTotal > 0 ? '+' : '') + eventTotal;

    // Build pts breakdown label
    var breakdown = [];
    if (bandPts !== 0) breakdown.push(bandLabel || bandPts + ' band pts');
    if (attPts > 0) breakdown.push('+' + attPts + ' att.');
    if (volPts > 0) breakdown.push('+' + volPts + ' vol.');
    var breakdownStr = breakdown.join(' · ');

    var baselineDisplay = isVolunteer ? '<span style="color:var(--text3);">—</span>'
      : (baseline != null
        ? '<span class="text-mono" style="color:var(--orange);">' + sTime(baseline) + '</span> <button onclick="editBaseline(' + evId + ',' + r.id + ')" style="background:none;border:none;cursor:pointer;padding:2px 4px;font-size:10px;color:var(--text3);">Edit</button>'
        : '<span style="color:var(--text3);">--</span> <button onclick="editBaseline(' + evId + ',' + r.id + ')" style="background:none;border:none;cursor:pointer;padding:2px 4px;font-size:10px;color:var(--orange);">Set</button>');
    var nameCell = '<strong style="font-size:15px;text-transform:uppercase;">' + r.name + '</strong>' + (showPkId && r.rid ? '<br><span style="font-size:11px;color:var(--text3);">A' + r.rid + '</span>' : '');

    if (isVolunteer) {
      return '<tr><td>' + nameCell + '</td>'
        + '<td><span style="font-size:12px;color:var(--blue);font-weight:600;">🙋 Volunteered</span></td>'
        + '<td><span style="color:var(--text3);">—</span></td>'
        + '<td></td>'
        + '<td style="font-size:12px;color:var(--text2);">' + (volPts > 0 ? '+' + volPts + ' volunteer bonus' : 'No volunteer bonus') + '</td>'
        + '<td style="font-weight:800;font-size:18px;color:' + ptsColor + ';">' + ptsDisplay + '</td></tr>';
    }
    return '<tr><td>' + nameCell + '</td><td style="white-space:nowrap;">' + baselineDisplay + '</td>'
      + '<td class="text-mono">' + (actual != null ? sTime(actual) : '<span style="color:var(--text3)">--</span>') + '</td>'
      + '<td>' + (diff != null ? '<span class="badge ' + bc + '">' + dStr(diff) + '</span>' : '') + '</td>'
      + '<td style="font-size:12px;color:var(--text2);">' + breakdownStr + '</td>'
      + '<td style="font-weight:800;font-size:18px;color:' + ptsColor + ';">' + ptsDisplay + '</td></tr>';
  }).join('');
}

function renderEnterTimesRows(evId) {
  var tbody = document.getElementById('et-tbody-' + evId); if (!tbody) return;
  var ev = S.events.find(function(e) { return e.id === evId; }); var showPkId = isParkrun(ev ? ev.tournamentId : null);
  var res = S.results[evId] || {}; var eligible = getTournamentRunners(ev ? ev.tournamentId : null);
  if (!eligible.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:1.5rem;">No runners enrolled.</td></tr>'; return; }
  var readonly = !etEditMode;
  if (readonly) eligible = eligible.filter(function(r) { return isAttended(res[r.id] || {}); });
  var tickedSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10" stroke="#fff" stroke-width="2.5" fill="none"/></svg>';
  var emptySvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>';
  tbody.innerHTML = eligible.map(function(r) {
    var rd = res[r.id] || {}; var attended = isAttended(rd); var mVal = rd.actualSec != null ? sHMS(rd.actualSec) : '00:00:00';
    var nameCell = '<strong style="font-size:15px;text-transform:uppercase;">' + r.name + '</strong>' + (showPkId && r.rid ? '<br><span style="font-size:11px;color:var(--text3);">A' + r.rid + '</span>' : '');
    var attendedCell, timeCell;
    if (readonly) {
      var isVolunteer = rd.volunteer === true;
      attendedCell = attended
        ? '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--orange);">' + tickedSvg + '</span>'
        : '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text3);">' + emptySvg + '</span>';
      var typeCell = !attended
        ? '<span style="color:var(--text3);font-size:12px;">&mdash;</span>'
        : (isVolunteer
          ? '<span style="font-size:12px;color:var(--blue);font-weight:600;">🙋 Volunteered</span>'
          : (rd.actualSec != null
            ? '<span style="font-size:12px;color:var(--orange);font-weight:600;">🏃 Raced</span>'
            : '<span style="font-size:12px;color:var(--blue);font-weight:600;">🙋 Volunteered</span>'));
      timeCell = !attended ? '<span style="color:var(--text3);font-size:12px;">&mdash;</span>'
        : (isVolunteer ? '<span style="color:var(--text3);font-size:12px;">&mdash;</span>'
        : '<span class="text-mono" style="font-size:14px;">' + (rd.actualSec != null ? sTime(rd.actualSec) : '&mdash;') + '</span>');
    } else {
      var isVolunteer = rd.volunteer === true;
      // Attended tick column
      attendedCell = '<button onclick="toggleAttendanceEt(' + evId + ',' + r.id + ')" style="background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;" title="' + (attended ? 'Mark as not attended' : 'Mark as attended') + '">' + (attended ? tickedSvg : emptySvg) + '</button>';
      // Type column — only shown when attended; defaults to Raced
      var typeCell = !attended ? '<span style="color:var(--text3);font-size:12px;">&mdash;</span>'
        : '<div style="display:flex;gap:4px;">'
          + '<button onclick="setRunnerTypeEt(' + evId + ',' + r.id + ',false)" style="font-size:11px;padding:2px 8px;border-radius:3px;cursor:pointer;border:1px solid ' + (!isVolunteer ? 'var(--orange)' : 'var(--border2)') + ';background:' + (!isVolunteer ? 'var(--orange-dim)' : 'none') + ';color:' + (!isVolunteer ? 'var(--orange)' : 'var(--text3)') + ';font-weight:700;">🏃 Raced</button>'
          + '<button onclick="setRunnerTypeEt(' + evId + ',' + r.id + ',true)" style="font-size:11px;padding:2px 8px;border-radius:3px;cursor:pointer;border:1px solid ' + (isVolunteer ? 'var(--blue)' : 'var(--border2)') + ';background:' + (isVolunteer ? 'rgba(90,159,212,.15)' : 'none') + ';color:' + (isVolunteer ? 'var(--blue)' : 'var(--text3)') + ';font-weight:700;">🙋 Volunteered</button>'
          + '</div>';
      timeCell = !attended ? '<span style="font-size:12px;color:var(--text3);">&mdash;</span>'
        : (isVolunteer ? '<span style="font-size:12px;color:var(--text3);">&mdash;</span>'
        : '<input type="time" step="1" id="et-time-' + evId + '-' + r.id + '" value="' + mVal + '" style="max-width:140px;"/>');
    }
    return '<tr><td>' + nameCell + '</td><td style="text-align:center;">' + attendedCell + '</td><td>' + typeCell + '</td><td>' + timeCell + '</td></tr>';
  }).join('');
}

function toggleAttendanceEt(evId, rId) {
  if (!S.results[evId]) S.results[evId] = {};
  if (!S.results[evId][rId]) S.results[evId][rId] = {};
  var cur = S.results[evId][rId].attended === true;
  S.results[evId][rId].attended = !cur;
  // When marking as attended, pre-fill 00:00:00 as default in the DOM if input exists
  renderEnterTimesRows(evId);
  if (!cur) {
    // Just enabled — focus the time input
    setTimeout(function() {
      var inp = document.getElementById('et-time-' + evId + '-' + rId);
      if (inp) { inp.value = '00:00:00'; inp.select(); inp.focus(); }
    }, 30);
  }
}

function toggleVolunteerEt(evId, rId) {
  if (!S.results[evId]) S.results[evId] = {};
  if (!S.results[evId][rId]) S.results[evId][rId] = {};
  var cur = S.results[evId][rId].volunteer === true;
  if (!cur) {
    // Volunteer: attended the event but didn't race — gets attendance bonus only, no band points
    S.results[evId][rId].attended = true;
    S.results[evId][rId].volunteer = true;
    S.results[evId][rId].actualSec = null;
  } else {
    S.results[evId][rId].volunteer = false;
  }
  renderEnterTimesRows(evId);
}

function setRunnerTypeEt(evId, rId, isVolunteer) {
  if (!S.results[evId]) S.results[evId] = {};
  if (!S.results[evId][rId]) S.results[evId][rId] = {};
  S.results[evId][rId].attended = true;
  S.results[evId][rId].volunteer = isVolunteer;
  if (isVolunteer) S.results[evId][rId].actualSec = null;
  renderEnterTimesRows(evId);
}

function saveEnterTimes(evId) {
  var ev = S.events.find(function(e) { return e.id === evId; }); if (!ev) return;
  if (!S.results[evId]) S.results[evId] = {};
  var eligible = getTournamentRunners(ev ? ev.tournamentId : null);
  eligible.forEach(function(r) {
    var rd = S.results[evId][r.id] || {};
    if (!rd.attended) { delete S.results[evId][r.id]; return; }
    var input = document.getElementById('et-time-' + evId + '-' + r.id);
    var val = input ? input.value : ''; var p = val.split(':').map(Number);
    var sec = p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : (p.length === 2 ? p[0]*60 + p[1] : null);
    var baseline = getRunnerPb(r.id, getTournamentActivityType(ev.tournamentId)) || null;
    var isVol = rd.volunteer === true;
    S.results[evId][r.id] = {
      attended: true,
      volunteer: isVol,
      actualSec: isVol ? null : ((sec && sec > 0) ? sec : null),
      baselinePbSec: isVol ? null : baseline
    };
  });
  persist(); etEditMode = false; renderEnterTimes(); showToast('Times saved');
}

function editBaseline(evId, rId) {
  var r = S.runners.find(function(x) { return x.id === rId; }); if (!r) return;
  var ev = S.events.find(function(e) { return e.id === evId; }); var tid = ev ? ev.tournamentId : null;
  var actType = getTournamentActivityType(tid); var parkrun = isParkrun(tid);
  var current = parkrun ? (((S.results[evId] || {})[rId] || {}).baselinePbSec || getTournamentBaselinePb(rId, tid)) : getTournamentBaselinePb(rId, tid);
  confirmModal((parkrun ? 'Edit Event Baseline' : 'Edit Tournament Baseline') + ' - ' + r.name, '', 'Update', function() {
    var valEl = document.getElementById('baseline-edit-input'); var val = valEl ? valEl.value : ''; var s = tSec(val);
    if (!s) { alert('Invalid time.'); return; }
    setBaseline(rId, actType, s, tid);
    if (parkrun) { if (!S.results[evId]) S.results[evId] = {}; if (!S.results[evId][rId]) S.results[evId][rId] = {}; S.results[evId][rId].baselinePbSec = s; }
    persist(); renderEtResultRows(evId);
  });
  setTimeout(function() {
    var msg = document.getElementById('confirm-msg');
    if (msg) msg.innerHTML = '<span style="display:block;margin-bottom:.5rem;font-size:13px;color:var(--text2);">Current: <strong style="color:var(--orange);">' + (current != null ? sTime(current) : 'not set') + '</strong></span><input type="time" id="baseline-edit-input" step="1" value="' + (current != null ? sHMS(current) : '') + '" style="width:100%;padding:8px;font-size:14px;font-family:SF Mono,Fira Code,monospace;margin-top:.5rem;"/>';
    var inp = document.getElementById('baseline-edit-input'); if (inp) inp.focus();
  }, 50);
}

function viewResultsValidated(evId) {
  var res = S.results[evId] || {}; var ev = S.events.find(function(e) { return e.id === evId; });
  var eligible = getTournamentRunners(ev ? ev.tournamentId : null);
  var missing = eligible.filter(function(r) { var rd = res[r.id] || {}; return isAttended(rd) && !rd.volunteer && !rd.actualSec; });
  if (missing.length) {
    var names = missing.map(function(r) { return r.name; }).join(', ');
    confirmModal('Missing Times', missing.length + ' runner' + (missing.length > 1 ? 's have' : ' has') + ' no time: ' + names + '. Continue anyway?', 'View Results', function() {});
    setTimeout(function() { var ok = document.getElementById('confirm-ok-btn'); if (ok) ok.onclick = function() { confirmCancel(); etViewMode = true; renderEnterTimes(); }; }, 30);
  } else { etViewMode = true; renderEnterTimes(); }
}
