// Per-tournament runner enrolment panel

function showTournamentRunners(tid) {
  var panelId = 'runners-panel-' + tid; var bodyEl = document.getElementById('tbody-' + tid); if (!bodyEl) return;
  var existing = document.getElementById(panelId); if (existing) { existing.remove(); return; }
  var panel = document.createElement('div'); panel.id = panelId; panel.style.cssText = 'margin-bottom:.75rem;'; bodyEl.prepend(panel); renderRunnersPanel(tid, false);
}

function renderRunnersPanel(tid, editMode) {
  var panel = document.getElementById('runners-panel-' + tid); if (!panel) return;
  var t = getTournament(tid); if (!t) return;
  var actType = getTournamentActivityType(tid); var label = actType; var showPkId = isParkrun(tid);
  if (!editMode) {
    var enrolledRunners = S.runners.filter(function(r) { return !r.archived && isEnrolled(tid, r.id); });
    var rows = enrolledRunners.length ? enrolledRunners.map(function(r) {
      var entry = getTournamentRunnerEntry(tid, r.id); var baseline = (entry && entry.baselineSec != null) ? entry.baselineSec : getRunnerPb(r.id, actType);
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:10px;flex-wrap:wrap;">'
        + '<div><span style="font-size:15px;font-weight:700;">' + r.name + '</span>' + (showPkId && r.rid ? '<span style="font-size:12px;color:var(--text3);margin-left:6px;">A' + r.rid + '</span>' : '') + (r.band ? '<span class="badge badge-orange" style="margin-left:6px;">Band ' + r.band + '</span>' : '') + '</div>'
        + '<span style="font-size:13px;color:var(--text3);">' + label + ' baseline: <span class="text-mono" style="color:var(--orange);">' + (baseline != null ? sTime(baseline) : '--') + '</span></span></div>';
    }).join('') : '<div style="font-size:13px;color:var(--text3);padding:8px 0;">No runners enrolled yet.</div>';
    panel.innerHTML = '<div class="card card-accent u-mb-0"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;"><div class="card-title u-mb-0">Club Runners (' + enrolledRunners.length + ')</div><div style="display:flex;gap:6px;"><button class="btn btn-sm btn-info" onclick="renderRunnersPanel(' + tid + ',true)">Edit</button><button class="btn btn-sm" onclick="document.getElementById(\'runners-panel-' + tid + '\').remove()">Close</button></div></div>' + rows + '</div>';
  } else {
    var rows2 = S.runners.filter(function(r) { return !r.archived; }).map(function(r) {
      var isIn = isEnrolled(tid, r.id); var entry = getTournamentRunnerEntry(tid, r.id); var suggested = (entry && entry.baselineSec != null) ? entry.baselineSec : getRunnerPb(r.id, actType);
      var suggestedBand = isParkrun(tid) ? suggestBand(suggested) : null;
      var bandOpts = '<option value="">—</option>' + BAND_LABELS.map(function(b) { return '<option value="' + b + '" ' + (r.band === b ? 'selected' : '') + '>Band ' + b + '</option>'; }).join('');
      var bandHtml = isParkrun(tid)
        ? '<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;">'
          + '<div style="display:flex;align-items:center;gap:5px;"><span class="u-muted-11">Band</span><select id="enroll-band-' + tid + '-' + r.id + '" style="font-size:12px;padding:3px 6px;max-width:100px;">' + bandOpts + '</select></div>'
          + (suggestedBand ? '<button id="enroll-band-sugg-' + tid + '-' + r.id + '" onclick="document.getElementById(\'enroll-band-' + tid + '-' + r.id + '\').value=\'' + suggestedBand + '\';this.style.display=\'none\';" style="font-size:10px;background:var(--orange-dim);border:1px solid var(--orange);color:var(--orange);padding:1px 6px;border-radius:3px;cursor:pointer;white-space:nowrap;">Suggested: ' + suggestedBand + ' (' + BAND_TIME_RANGES[suggestedBand] + ')</button>' : '')
          + '</div>'
        : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">'
        + '<input type="checkbox" id="enroll-cb-' + tid + '-' + r.id + '" ' + (isIn ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:var(--orange);flex-shrink:0;"/>'
        + '<label for="enroll-cb-' + tid + '-' + r.id + '" style="flex:1;font-size:15px;font-weight:700;cursor:pointer;">' + r.name + (showPkId && r.rid ? ' <span style="font-weight:400;font-size:12px;color:var(--text3);">A' + r.rid + '</span>' : '') + '</label>'
        + '<div style="display:flex;align-items:center;gap:6px;"><span class="u-muted-11">' + label + ' baseline</span><input type="time" id="enroll-baseline-' + tid + '-' + r.id + '" step="1" value="' + (suggested != null ? sHMS(suggested) : '') + '" style="max-width:130px;" oninput="autoEnrollOnBaseline(' + tid + ',' + r.id + ');updateEnrollBandSuggestion(\'' + tid + '\',' + r.id + ')"/></div>'
        + bandHtml
        + '</div>';
    }).join('');
    panel.innerHTML = '<div class="card card-accent u-mb-0"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;"><div class="card-title u-mb-0">Club Runners</div><div style="display:flex;gap:6px;"><button class="btn btn-sm btn-primary" onclick="saveRunnersPanel(' + tid + ')">Save</button><button class="btn btn-sm" onclick="renderRunnersPanel(' + tid + ',false)">Cancel</button></div></div><p style="font-size:12px;color:var(--text3);margin-bottom:.75rem;">Tick runners to include them. Each needs a <strong>' + label + ' baseline</strong>. Band changes update the global profile.</p>' + (S.runners.length ? rows2 : '<div class="notice">No runners added yet.</div>') + '</div>';
  }
}

function autoEnrollOnBaseline(tid, rId) { var cb = document.getElementById('enroll-cb-' + tid + '-' + rId); var input = document.getElementById('enroll-baseline-' + tid + '-' + rId); if (cb && input && input.value) cb.checked = true; }

function updateEnrollBandSuggestion(tid, rId) {
  var input = document.getElementById('enroll-baseline-' + tid + '-' + rId);
  var bandSel = document.getElementById('enroll-band-' + tid + '-' + rId);
  if (!input || !isParkrun(tid)) return;
  var sec = tSec(input.value);
  var suggested = suggestBand(sec);
  var suggBtnId = 'enroll-band-sugg-' + tid + '-' + rId;
  var suggBtn = document.getElementById(suggBtnId);
  if (!suggBtn && bandSel && bandSel.parentNode && bandSel.parentNode.parentNode) {
    suggBtn = document.createElement('button');
    suggBtn.id = suggBtnId;
    suggBtn.style.cssText = 'font-size:10px;background:var(--orange-dim);border:1px solid var(--orange);color:var(--orange);padding:1px 6px;border-radius:3px;cursor:pointer;white-space:nowrap;margin-top:3px;';
    bandSel.parentNode.parentNode.appendChild(suggBtn);
  }
  if (suggBtn) {
    if (suggested) {
      var b = suggested;
      suggBtn.textContent = 'Suggested: ' + b + ' (' + BAND_TIME_RANGES[b] + ')';
      suggBtn.style.display = '';
      suggBtn.onclick = function() { var sel = document.getElementById('enroll-band-' + tid + '-' + rId); if (sel) sel.value = b; this.style.display = 'none'; };
    } else {
      suggBtn.style.display = 'none';
    }
  }
}

function saveRunnersPanel(tid) {
  var actType = getTournamentActivityType(tid); var errors = [];
  S.runners.forEach(function(r) {
    var cb = document.getElementById('enroll-cb-' + tid + '-' + r.id); var timeInput = document.getElementById('enroll-baseline-' + tid + '-' + r.id);
    if (cb && cb.checked) { var sec = tSec(timeInput ? timeInput.value : ''); if (!sec) errors.push(r.name + ' needs a ' + actType + ' baseline.'); else { setBaseline(r.id, actType, sec, tid); if (!r.pbs) r.pbs = {}; if (r.pbs[actType] == null) { r.pbs[actType] = sec; if (actType === 'parkrun') r.pbSec = sec; }
      // Save band to global profile
      var bandSel = document.getElementById('enroll-band-' + tid + '-' + r.id);
      if (bandSel && bandSel.value) r.band = bandSel.value;
    } }
    else unenrollRunner(tid, r.id);
  });
  if (errors.length) { alert('Please fix:\n' + errors.join('\n')); return; }
  persist(); renderEnterTimesSel(); renderRunners(); renderRunnersPanel(tid, false);
}
