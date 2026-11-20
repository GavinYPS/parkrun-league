// Per-tournament scoring settings panel

function toggleTournamentSettings(tid) {
  var bodyEl = document.getElementById('tbody-' + tid); if (!bodyEl) return;
  var existingId = 'settings-panel-' + tid; var existing = document.getElementById(existingId);
  if (existing) { existing.remove(); return; }
  var panel = document.createElement('div'); panel.id = existingId; panel.style.cssText = 'margin-bottom:.75rem;';
  panel.innerHTML = buildSettingsPanel(tid); bodyEl.prepend(panel);
}

function bandCaptionHtml(brackets, band) {
  var cap = [];
  brackets.filter(function(b){ return b.minFaster != null; }).sort(function(a,b){ return b.pts - a.pts; }).forEach(function(b){ cap.push((b.maxFaster == null ? b.minFaster + 's+' : b.minFaster + '–' + b.maxFaster + 's') + ' faster &rarr; <b>' + b.pts + '</b>'); });
  brackets.filter(function(b){ return b.slowerFrom != null; }).sort(function(a,b){ return a.slowerFrom - b.slowerFrom; }).forEach(function(b){ cap.push(b.slowerFrom + '–' + b.slowerTo + 's slower &rarr; <b>' + b.pts + '</b>'); });
  return '<b>Band ' + band + ':</b> ' + cap.join(' &nbsp;&middot;&nbsp; ') + ' &nbsp;&middot;&nbsp; otherwise 0';
}

function buildSettingsPanel(tid) {
  var t = getTournament(tid); if (!t) return '';
  var s = t.settings;
  var tEvents = S.events.filter(function(e) { return e.tournamentId === tid; }).sort(function(a,b) { if (a.date && b.date) return a.date.localeCompare(b.date); return a.runNumber - b.runNumber; });
  var wcRows = tEvents.length ? tEvents.map(function(ev) {
    var loc = getLocation(ev.locationId); var isWc = ev.wildcard === true;
    var label = '#' + ev.runNumber + (ev.date ? ' &middot; ' + fmtDate(ev.date) : '') + (loc ? ' &middot; ' + loc.name : '');
    return '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:12px;color:var(--text2);">'
      + '<input type="checkbox" ' + (isWc ? 'checked' : '') + ' onchange="toggleWildcard(' + ev.id + ')" style="width:14px;height:14px;accent-color:#c084fc;flex-shrink:0;"/>'
      + '<span style="flex:1;">' + label + '</span>' + (isWc ? '<span class="badge badge-wc" style="font-size:9px;">&#9889;</span>' : '') + '</label>';
  }).join('') : '<div style="font-size:12px;color:var(--text3);padding:4px 0;">No events added yet.</div>';

  var tierRows = s.bonusTiers.map(function(tier, i) {
    return '<div style="display:grid;grid-template-columns:1fr 1fr 28px;gap:5px;align-items:center;margin-bottom:5px;">'
      + '<input type="number" value="' + tier.minRuns + '" min="1" class="text-mono" style="padding:5px 7px;font-size:13px;" onchange="updateTier(' + tid + ',' + i + ',\'minRuns\',this.value)"/>'
      + '<input type="number" value="' + tier.points + '" class="text-mono" style="padding:5px 7px;font-size:13px;" onchange="updateTier(' + tid + ',' + i + ',\'points\',this.value)"/>'
      + '<button class="btn btn-sm btn-danger" onclick="removeTier(' + tid + ',' + i + ')" style="padding:4px 6px;font-size:13px;">&#10005;</button></div>';
  }).join('');

  var bandTable = getBandTable(s);
  // Number line: slower tiers left (red), 0 anchor centre, faster tiers right (green)
  // Slower: 0.5pt (needs upper bound only — lower is open), 1pt (upper bound, lower=0)
  // Faster: 2,3,4,5,6,7,8pt (lower bound only — upper is the next tier's lower - 1, or open for 8pt)
  var SLOWER_TIERS = [0.5, 1];   // displayed right-to-left (closest to 0 first)
  var FASTER_TIERS = [2,3,4,5,6,7,8];
  var slowerBg  = 'var(--red-bg)';           var fasterBg  = 'rgba(106,176,76,.08)';
  var slowerCol = 'var(--red)';              var fasterCol = 'var(--green)';
  var inpS = 'padding:3px 4px;font-size:11px;width:100%;text-align:center;font-family:SF Mono,Fira Code,monospace;border-radius:3px;box-sizing:border-box;';

  function mkCell(val, onch, isSlower, readOnly) {
    var bg  = isSlower ? slowerBg  : fasterBg;
    var col = isSlower ? slowerCol : fasterCol;
    var bdr = isSlower ? 'rgba(224,90,90,.25)' : 'rgba(106,176,76,.25)';
    return '<input type="number" min="0" value="' + (val != null ? val : '') + '" placeholder="—"'
      + ' style="' + inpS + 'background:' + bg + ';color:' + col + ';border:1px solid ' + bdr + ';' + (readOnly ? 'opacity:.35;' : '') + '"'
      + (readOnly ? ' disabled' : ' onchange="' + onch + '"') + '/>';
  }

  // Columns: band | baseline | 0.5pt | 1pt | 2pt | 3pt | 4pt | 5pt | 6pt | 7pt | 8pt
  var colT = '24px 70px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr';

  var bandHdr =
    // Row 1: direction banners
    '<div style="display:grid;grid-template-columns:' + colT + ';gap:2px;padding:3px 6px 2px;border-bottom:1px solid var(--border2);align-items:center;">'
    + '<span></span><span></span>'
    + '<div style="grid-column:span 2;text-align:center;font-size:11px;font-weight:700;color:' + slowerCol + ';background:' + slowerBg + ';border-radius:3px;padding:3px 0;">▼ Slower than baseline</div>'
    + '<div style="grid-column:span 7;text-align:center;font-size:11px;font-weight:700;color:' + fasterCol + ';background:' + fasterBg + ';border-radius:3px;padding:3px 0;">▲ Faster than baseline</div>'
    + '</div>'
    // Row 2: pt labels
    + '<div style="display:grid;grid-template-columns:' + colT + ';gap:2px;padding:2px 6px;border-bottom:1px solid var(--border2);align-items:center;">'
    + '<span style="font-size:11px;color:var(--text3);">Band</span>'
    + '<span style="font-size:11px;color:var(--text3);">Baseline</span>'
    + SLOWER_TIERS.map(function(p){ return '<span style="text-align:center;font-size:12px;font-weight:700;color:' + slowerCol + ';">' + p + 'pt</span>'; }).join('')
    + FASTER_TIERS.map(function(p){ return '<span style="text-align:center;font-size:12px;font-weight:700;color:' + fasterCol + ';">' + p + 'pt</span>'; }).join('')
    + '</div>'
    // Row 3: threshold labels
    + '<div style="display:grid;grid-template-columns:' + colT + ';gap:2px;padding:1px 6px;border-bottom:1px solid var(--border2);align-items:center;">'
    + '<span></span><span style="font-size:10px;color:var(--text3);">mm:ss–mm:ss</span>'
    + '<span style="font-size:10px;color:' + slowerCol + ';text-align:center;">up to s</span>'
    + '<span style="font-size:10px;color:' + slowerCol + ';text-align:center;">up to s</span>'
    + FASTER_TIERS.map(function(p){ return '<span style="font-size:10px;color:' + fasterCol + ';text-align:center;">up to s</span>'; }).join('')
    + '</div>';

  var bandRows = bandHdr + BAND_LABELS.map(function(band) {
    var range    = BAND_SEC_RANGES[band];
    var brackets = bandTable[band] || [];
    function getB(pts) { return brackets.find(function(b){ return b.pts === pts; }); }

    var h   = getB(0.5) || {};
    var one = getB(1)   || {};

    var slowerCells =
      // 0.5pt — upper bound (the most-slower threshold)
      mkCell(h.slowerTo   != null ? h.slowerTo   : null, 'btSetSlower(\'' + tid + '\',\'' + band + '\',0.5,\'to\',this.value)',   true, false)
      // 1pt — upper bound (closest to 0)
    + mkCell(one.slowerTo != null ? one.slowerTo : null, 'btSetSlower(\'' + tid + '\',\'' + band + '\',1,\'to\',this.value)',    true, false);

    var fasterCells = FASTER_TIERS.map(function(p) {
      var b = getB(p) || {};
      return mkCell(b.maxFaster != null ? b.maxFaster : null, 'btSetFaster(\'' + tid + '\',\'' + band + '\',' + p + ',\'to\',this.value)', false, false);
    }).join('');

    return '<div style="border-bottom:1px solid var(--border);padding:3px 6px 6px;"><div style="display:grid;grid-template-columns:' + colT + ';gap:2px;align-items:center;">'
      + '<span style="font-family:Barlow Condensed,sans-serif;font-weight:800;font-size:15px;color:var(--orange);">' + band + '</span>'
      + '<input type="text" value="' + sTime(range[0]) + '–' + sTime(range[1]) + '" class="text-mono"'
      + ' style="padding:3px 4px;font-size:11px;width:100%;" onchange="updateBandRange(\'' + tid + '\',\'' + band + '\',this.value)"/>'
      + slowerCells
      + fasterCells
      + '</div><div class="bs-cap" id="bs-cap-' + tid + '-' + band + '">' + bandCaptionHtml(brackets, band) + '</div></div>';
  }).join('');

  return '<div class="card card-accent u-mb-0"><div class="card-title">Scoring Settings</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.25rem;margin-bottom:1.25rem;">'
    // Col 1: Attendance + Wildcard
    + '<div>'
    + '<div class="ss-label">&#9989; Attendance Bonus</div>'
    + '<p class="u-hint-11-sm">Points awarded to every runner who races at an event (has a recorded time).</p>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;"><input style="padding:5px 8px;font-size:13px;max-width:70px;" type="number" id="attendance-bonus-' + tid + '" value="' + (s.attendanceBonus || 0) + '" min="0" class="text-mono" onchange="updateAttendanceBonus(' + tid + ',this.value)"/><span class="u-sub-12">pts per race</span></div>'
    + '<div class="ss-label">&#129309; Volunteer Bonus</div>'
    + '<p class="u-hint-11-sm">Flat points for attending as a volunteer. Separate from race attendance bonus.</p>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;"><input style="padding:5px 8px;font-size:13px;max-width:70px;" type="number" id="volunteer-bonus-' + tid + '" value="' + (s.volunteerBonus || 0) + '" min="0" class="text-mono" onchange="updateVolunteerBonus(' + tid + ',this.value)"/><span class="u-sub-12">pts per session</span></div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;"><input style="padding:5px 8px;font-size:13px;max-width:70px;" type="number" id="volunteer-max-' + tid + '" value="' + (s.volunteerMaxSessions != null ? s.volunteerMaxSessions : 1) + '" min="0" class="text-mono" onchange="updateVolunteerMax(' + tid + ',this.value)"/><span class="u-sub-12">max sessions per tournament <span style="color:var(--text3);">(0 = unlimited)</span></span></div>'
    + '<div class="ss-label">&#9889; Wildcard Events</div>'
    + '<p class="u-hint-11-sm">Special events where all attendees get bonus points instead of band scoring.</p>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem;"><input style="padding:5px 8px;font-size:13px;max-width:70px;" type="number" id="wildcard-bonus-' + tid + '" value="' + (s.wildcardBonus || 2) + '" min="0" class="text-mono" onchange="updateWildcardBonus(' + tid + ',this.value)"/><span class="u-sub-12">pts per wildcard</span></div>'
    + '</div>'
    // Col 2: Wildcard event toggles
    + '<div>'
    + '<div class="ss-label">&#9889; Wildcard Event Selection</div>'
    + '<div style="max-height:160px;overflow-y:auto;">' + wcRows + '</div>'
    + '</div>'
    // Col 3: Bonus tiers
    + '<div>'
    + '<div class="ss-label">&#127919; Attendance Bonus Tiers</div>'
    + '<p class="u-hint-11-sm">Extra bonus for runners who race at multiple events. Highest qualifying tier wins. Volunteer sessions do not count.</p>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 28px;gap:5px;font-size:10px;color:var(--text3);margin-bottom:4px;"><span>Min events</span><span>Pts</span><span></span></div>'
    + '<div id="tiers-list-' + tid + '">' + tierRows + '</div>'
    + '<button class="btn btn-sm" style="margin-top:4px;" onclick="addTier(' + tid + ')">+ Add Tier</button>'
    + '</div>'
    + '</div>'
    // Band scoring — full width
    + '<div style="border-top:1px solid var(--border);padding-top:1rem;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">'
    + '<div class="ss-label u-mb-0">&#9201; Band Scoring (A–G)</div>'
    + '<button class="btn btn-sm btn-danger u-btn-xs" onclick="resetBandTable(' + tid + ')">Reset</button>'
    + '</div>'
    + '<p class="u-hint-11-sm">Each box is the <b>most seconds</b> slower or faster than the runner&rsquo;s baseline PR that still earns those points; the next tier starts where the previous one ends. Blank = tier not used. The line under each band spells out the ranges currently in force.</p>'
    + '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;overflow-x:auto;" id="bands-list-' + tid + '">' + bandRows + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-top:1rem;align-items:center;">'
    + '<button class="btn btn-sm btn-primary" onclick="saveSettingsInline(' + tid + ')">Save Settings</button>'
    + '<span id="settings-saved-' + tid + '" style="font-size:13px;color:var(--green);display:none;">Saved</span>'
    + '<button class="btn btn-sm" onclick="document.getElementById(\'settings-panel-' + tid + '\').remove()" style="margin-left:auto;">Close</button>'
    + '</div></div>';
}

function btEnsureTable(tid) {
  var t = getTournament(parseInt(tid)); if (!t) return null;
  if (!t.settings.bandTable) t.settings.bandTable = JSON.parse(JSON.stringify(DEFAULT_BAND_TABLE));
  return t;
}
function btRefresh(tid) {
  var p = document.getElementById('settings-panel-' + tid); if (p) p.innerHTML = buildSettingsPanel(tid);
}
function btUpdate(tid, band, bi, field, val) {
  var t = btEnsureTable(tid); if (!t) return;
  var brackets = t.settings.bandTable[band];
  if (!brackets) return;
  var sorted = brackets.slice().sort(function(a,b){ return b.pts - a.pts; });
  var b = sorted[bi]; if (!b) return;
  var num = parseFloat(val);
  if (field === 'pts') { b.pts = isNaN(num) ? 0 : num; }
  else if (field === 'from') {
    if (b.minFaster != null) b.minFaster = isNaN(num) ? 0 : num;
    else b.minSlower = isNaN(num) ? 0 : num;
  } else if (field === 'to') {
    if (b.maxSlower != null) b.maxSlower = isNaN(num) ? 0 : num;
  }
}
function btRemove(tid, band, bi) {
  var t = btEnsureTable(tid); if (!t) return;
  var brackets = t.settings.bandTable[band]; if (!brackets) return;
  var sorted = brackets.slice().sort(function(a,b){ return b.pts - a.pts; });
  var target = sorted[bi]; if (!target) return;
  t.settings.bandTable[band] = brackets.filter(function(b) { return b !== target; });
  btRefresh(tid);
}
function btAdd(tid, band, isFaster) {
  var t = btEnsureTable(tid); if (!t) return;
  if (!t.settings.bandTable[band]) t.settings.bandTable[band] = [];
  if (isFaster) t.settings.bandTable[band].push({pts:1, minFaster:0});
  else t.settings.bandTable[band].push({pts:0.5, maxSlower:30, minSlower:0});
  btRefresh(tid);
}
function updateBandTable(tid, band, pts, val) {
  var t = btEnsureTable(tid); if (!t) return;
  var sec = parseFloat(val);
  var brackets = t.settings.bandTable[band] || [];
  brackets = brackets.filter(function(b) { return b.pts !== pts; });
  if (!isNaN(sec) && sec >= 0 && val !== '') brackets.push({pts:pts, minFaster:sec});
  t.settings.bandTable[band] = brackets;
}

function updateBandRange(tid, band, val) {
  // Accept "mm:ss–mm:ss" or "mm:ss-mm:ss"
  var parts = val.split(/[–\-]/);
  var from = tSec(parts[0] && parts[0].trim());
  var to   = tSec(parts[1] && parts[1].trim());
  if (from != null) BAND_SEC_RANGES[band][0] = from;
  if (to   != null) BAND_SEC_RANGES[band][1] = to;
  BAND_TIME_RANGES[band] = sTime(BAND_SEC_RANGES[band][0]) + '-' + sTime(BAND_SEC_RANGES[band][1]);
}
function btSetFaster(tid, band, pts, field, val) {
  // Boxes hold each tier's upper limit; neighbouring tiers re-flow so there are never gaps or overlaps.
  var t = btEnsureTable(tid); if (!t) return;
  if (!t.settings.bandTable[band]) t.settings.bandTable[band] = [];
  var tbl = t.settings.bandTable[band];
  var asc = function(a,b){ return a.pts - b.pts; };
  var chain = tbl.filter(function(b){ return b.minFaster != null; }).sort(asc);
  var existing = chain.find(function(b){ return b.pts === pts; });
  var sec = parseInt(val); var blank = isNaN(sec) || val === '';
  if (blank) {
    if (existing && existing !== chain[chain.length - 1]) tbl.splice(tbl.indexOf(existing), 1);  // blank = tier unused, neighbours cover its range
    else if (existing) existing.maxFaster = null;                                               // top tier is open-ended
  } else {
    if (!existing) { existing = {pts: pts, minFaster: 0, maxFaster: null}; tbl.push(existing); }
    existing.maxFaster = sec;
  }
  chain = tbl.filter(function(b){ return b.minFaster != null; }).sort(asc);
  chain.forEach(function(b, k) {
    if (k === 0) b.minFaster = 0;
    else { b.minFaster = chain[k-1].maxFaster == null ? b.minFaster : chain[k-1].maxFaster + 1; if (b.maxFaster != null && b.maxFaster < b.minFaster) b.maxFaster = b.minFaster; }
    var inp = document.querySelector('#bands-list-' + tid + ' input[onchange*="btSetFaster(\'' + tid + '\',\'' + band + '\',' + b.pts + ',"]');
    if (inp && inp !== document.activeElement) inp.value = b.maxFaster != null ? b.maxFaster : '';
  });
  var c = document.getElementById('bs-cap-' + tid + '-' + band); if (c) c.innerHTML = bandCaptionHtml(tbl, band);
}
function btSetSlower(tid, band, pts, field, val) {
  // 1pt runs 0..X s slower and 0.5pt starts at X+1, so editing the 1pt box moves the 0.5pt start.
  var t = btEnsureTable(tid); if (!t) return;
  if (!t.settings.bandTable[band]) t.settings.bandTable[band] = [];
  var tbl = t.settings.bandTable[band];
  var existing = tbl.find(function(b){ return b.pts === pts && b.slowerFrom != null; });
  if (!existing) { existing = {pts: pts, slowerFrom: 0, slowerTo: 0}; tbl.push(existing); }
  var sec = parseInt(val);
  existing.slowerTo = isNaN(sec) ? 0 : sec;
  if (pts === 1) {
    existing.slowerFrom = 0;
    var half = tbl.find(function(b){ return b.pts === 0.5 && b.slowerFrom != null; });
    if (half) {
      half.slowerFrom = existing.slowerTo + 1; if (half.slowerTo < half.slowerFrom) half.slowerTo = half.slowerFrom;
      var inp = document.querySelector('#bands-list-' + tid + ' input[onchange*="btSetSlower(\'' + tid + '\',\'' + band + '\',0.5,"]');
      if (inp) inp.value = half.slowerTo;
    }
  }
  var c = document.getElementById('bs-cap-' + tid + '-' + band); if (c) c.innerHTML = bandCaptionHtml(tbl, band);
}
function resetBandTable(tid) {
  if (!confirm('Reset band scoring to defaults?')) return;
  var t = getTournament(tid); if (!t) return;
  t.settings.bandTable = JSON.parse(JSON.stringify(DEFAULT_BAND_TABLE));
  var p = document.getElementById('settings-panel-' + tid); if (p) p.innerHTML = buildSettingsPanel(tid);
}

function updateAttendanceBonus(tid, val) { var t = getTournament(tid); if (t) t.settings.attendanceBonus = parseInt(val) || 0; }
function updateVolunteerBonus(tid, val) { var t = getTournament(tid); if (t) t.settings.volunteerBonus = parseInt(val) || 0; }
function updateVolunteerMax(tid, val) { var t = getTournament(tid); if (t) t.settings.volunteerMaxSessions = parseInt(val) || 0; }
function updateWildcardBonus(tid, val) { var t = getTournament(tid); if (t) t.settings.wildcardBonus = parseInt(val) || 0; }
function updateTier(tid, i, field, val) { var t = getTournament(tid); if (!t) return; t.settings.bonusTiers[i][field] = parseInt(val) || 0; }
function removeTier(tid, i) { if (!confirm('Remove this tier?')) return; var t = getTournament(tid); if (!t) return; t.settings.bonusTiers.splice(i, 1); var p = document.getElementById('settings-panel-' + tid); if (p) p.innerHTML = buildSettingsPanel(tid); }
function addTier(tid) { var t = getTournament(tid); if (!t) return; t.settings.bonusTiers.push({minRuns:1,points:1}); var p = document.getElementById('settings-panel-' + tid); if (p) p.innerHTML = buildSettingsPanel(tid); }
function saveSettingsInline(tid) { persist(); if (ghIsConfigured()) ghPush(); var msg = document.getElementById('settings-saved-' + tid); if (msg) msg.style.display = 'inline'; setTimeout(function() { var p = document.getElementById('settings-panel-' + tid); if (p) p.remove(); }, 800); }
