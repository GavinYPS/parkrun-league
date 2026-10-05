// Club runners page

function toggleCollapse(bodyId, chevId) {
  var body = document.getElementById(bodyId); var chev = document.getElementById(chevId);
  if (!body) return; var collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none'; if (chev) chev.classList.toggle('open', collapsed);
}

function openParkrunResults(url) {
  var club = getClubName();
  try { var ta = document.createElement('textarea'); ta.value = club; ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(e) {}
  showToast('"' + club + '" copied — paste into club search');
  setTimeout(function() { window.open(url, '_blank'); }, 800);
}

var runnerLookupTimer = null;
function scheduleRunnerLookup() {
  clearTimeout(runnerLookupTimer);
  var val = document.getElementById('r-url').value.trim();
  var row = document.getElementById('r-profile-row'); var link = document.getElementById('r-profile-link');
  if (!row || !link) return;
  var cleaned = val.replace(/^A+/i, '').trim();
  var m = cleaned.match(/\b(\d{4,9})\b/);
  if (!m) { row.style.display = 'none'; return; }
  link.href = 'https://www.parkrun.org.uk/parkrunner/' + m[1] + '/'; row.style.display = 'flex';
}

function renderPbFields(containerId, currentPbs) {
  var container = document.getElementById(containerId); if (!container) return;
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES;
  container.innerHTML = types.map(function(type) {
    var val = (currentPbs && currentPbs[type] != null) ? sHMS(currentPbs[type]) : '';
    var extra = '';
    if (type === 'parkrun') {
      var suggested = currentPbs && currentPbs['parkrun'] != null ? suggestBand(currentPbs['parkrun']) : null;
      extra = '<div id="r-band-suggestion" style="padding-left:100px;min-height:20px;margin-top:3px;">'
        + (suggested ? bandSuggHtml('r-band-select', 'r-band-suggestion', suggested) : '')
        + '</div>'
        + '<div class="form-row" style="margin-top:4px;"><label>Band</label>'
        + '<select id="r-band-select" style="max-width:240px;font-size:13px;"><option value="">No band assigned</option>'
        + BAND_LABELS.map(function(b){ return '<option value="' + b + '"' + (suggested === b ? ' selected' : '') + '>' + b + ' \u2014 ' + BAND_TIME_RANGES[b] + '</option>'; }).join('')
        + '</select></div>';
    }
    return '<div class="form-row"><label>' + type + ' Baseline</label><input type="time" id="r-pb-' + type.replace(/\s+/g,'-') + '" step="1" style="max-width:160px;" value="' + val + '"'
      + (type === 'parkrun' ? ' oninput="updateAddRunnerBandSuggestion()"' : '') + '/></div>' + extra;
  }).join('');
}

function clearRunnerForm() {
  ['r-url','r-name'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('r-url-status').innerHTML = '';
  var row = document.getElementById('r-profile-row'); if (row) row.style.display = 'none';
  renderPbFields('r-pb-fields', {});
}

function bandSuggHtml(selId, suggId, band) {
  return '<span style="font-size:12px;color:var(--text3);">Suggested: <button type="button"'
    + ' onclick="document.getElementById(\'' + selId + '\').value=\'' + band + '\';document.getElementById(\'' + suggId + '\').innerHTML=\'<span style=&quot;font-size:12px;color:var(--green);&quot;>&#10003; Band ' + band + ' applied</span>\';"'
    + ' style="background:var(--orange-dim);border:1px solid var(--orange);color:var(--orange);font-weight:700;font-size:12px;padding:1px 8px;border-radius:3px;cursor:pointer;">'
    + 'Use Band ' + band + '</button></span>';
}

function updateAddRunnerBandSuggestion() {
  var inp = document.getElementById('r-pb-parkrun');
  var suggEl = document.getElementById('r-band-suggestion');
  if (!inp || !suggEl) return;
  var sec = tSec(inp.value);
  var suggested = suggestBand(sec);
  if (suggested) {
    suggEl.innerHTML = bandSuggHtml('r-band-select', 'r-band-suggestion', suggested);
  } else {
    suggEl.innerHTML = sec ? '<span style="font-size:12px;color:var(--text3);">Time outside standard bands \u2014 assign manually</span>' : '';
  }
}

function addRunner() {
  var url = document.getElementById('r-url').value.trim();
  var name = document.getElementById('r-name').value.trim();
  var cleaned = url.replace(/^A+/i, ""); var ridM = cleaned.match(/\b(\d{4,9})\b/); var rid = ridM ? ridM[1] : "";
  if (!name) { alert('Please enter a name.'); return; }
  if (rid && S.runners.some(function(r) { return r.rid === rid; })) { alert('Runner A' + rid + ' already added.'); return; }
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES; var pbs = {};
  types.forEach(function(type) { var el = document.getElementById('r-pb-' + type.replace(/\s+/g,'-')); if (el && el.value) pbs[type] = tSec(el.value); });
  var bandSel = document.getElementById('r-band-select'); var band = bandSel ? (bandSel.value || null) : null;
  S.runners.push({id:uid(), name:name, rid:rid, homeSlug:'', pbs:pbs, band:band, pbSec: pbs['parkrun'] != null ? pbs['parkrun'] : (Object.values(pbs)[0] || null)});
  clearRunnerForm(); document.getElementById('f-runner').style.display = 'none'; persist(); renderRunners();
}

function editRunnerName(id) {
  var r = S.runners.find(function(x) { return x.id === id; }); if (!r) return;
  var h3 = document.getElementById('runner-name-' + id); if (!h3) return;
  document.querySelectorAll('.runner-card').forEach(function(card) { if (card.dataset.runnerId !== String(id)) card.style.display = 'none'; });
  h3.innerHTML = '<input type="text" id="runner-name-input-' + id + '" value="' + r.name.replace(/"/g,'&quot;') + '" style="font-size:inherit;font-family:inherit;font-weight:inherit;padding:2px 6px;max-width:200px;"/>'
    + ' <button class="btn btn-sm btn-primary" onclick="saveRunnerName(' + id + ')" style="margin-left:6px;">Save</button>'
    + ' <button class="btn btn-sm" onclick="renderRunners()" style="margin-left:4px;">Cancel</button>';
  var metaEl = h3.closest('.runner-info') ? h3.closest('.runner-info').querySelector('.runner-meta') : null;
  if (metaEl && !metaEl.querySelector('[data-rid-edit]')) {
    var div = document.createElement('div'); div.setAttribute('data-rid-edit','1'); div.style.cssText = 'margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
    div.innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;color:var(--text2);">Parkrun ID</span><input type="text" id="runner-rid-input-' + id + '" value="' + (r.rid||'') + '" placeholder="e.g. 8416304 or A8416304" style="max-width:120px;font-family:SF Mono,Fira Code,monospace;font-size:13px;padding:4px 8px;"/></div>'
      + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--text2);"><input type="checkbox" id="runner-leader-input-' + id + '" ' + (r.isLeader ? 'checked' : '') + ' style="width:14px;height:14px;accent-color:var(--orange);"/> Run Leader</label>';
    metaEl.prepend(div);
  }
  var inp = document.getElementById('runner-name-input-' + id); if (inp) inp.select();
}

function saveRunnerName(id) {
  var r = S.runners.find(function(x) { return x.id === id; }); if (!r) return;
  var inp = document.getElementById('runner-name-input-' + id); var val = inp ? inp.value.trim() : '';
  if (!val) { alert('Name cannot be empty.'); return; }
  r.name = val;
  var ridInp = document.getElementById('runner-rid-input-' + id);
  if (ridInp) { var ridVal = ridInp.value.trim(); var ridM = ridVal.match(/\b(\d{4,9})\b/); var newRid = ridM ? ridM[1] : ''; if (newRid && newRid !== r.rid && S.runners.some(function(x) { return x.id !== id && x.rid === newRid; })) { alert('Runner A' + newRid + ' already added.'); return; } r.rid = newRid; }
  var leaderCb = document.getElementById('runner-leader-input-' + id); if (leaderCb) r.isLeader = leaderCb.checked;
  persist(); renderRunners();
}

function showRunnerActions(id, show) { var card = document.querySelector('[data-runner-id="' + id + '"]'); if (!card) return; var actions = card.querySelector('.runner-actions'); if (actions) actions.style.visibility = show ? 'visible' : 'hidden'; }

function editRunnerPB(id) {
  var r = S.runners.find(function(x) { return x.id === id; }); if (!r) return;
  var cardId = 'edit-pb-' + id; var existing = document.getElementById(cardId);
  if (existing) { existing.remove(); showRunnerActions(id, true); return; }
  var card = document.querySelector('[data-runner-id="' + id + '"]'); if (!card) return;
  showRunnerActions(id, false);
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES;
  var form = document.createElement('div'); form.id = cardId;
  form.style.cssText = 'background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:.75rem 1rem;margin-top:.5rem;';
  var html = '';
  types.forEach(function(type) {
    var curVal = r.pbs && r.pbs[type] != null ? sHMS(r.pbs[type]) : (r.pbSec && type === 'parkrun' ? sHMS(r.pbSec) : '');
    var label = type === 'parkrun' ? 'Baseline' : type + ' Baseline';
    var enrolledT = S.tournaments.filter(function(t) { return getTournamentActivityType(t.id) === type && isEnrolled(t.id, r.id); });
    var tLine = enrolledT.map(function(t) { var entry = getTournamentRunnerEntry(t.id, r.id); return entry && entry.baselineSec != null ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;display:flex;align-items:center;gap:6px;"><span style="font-size:10px;background:var(--bg3);border:1px solid var(--border2);border-radius:3px;padding:1px 5px;color:var(--orange);">' + t.name + '</span><span class="text-mono">' + sTime(entry.baselineSec) + '</span></div>' : ''; }).join('');
    var history = r.pbHistory && r.pbHistory[type] ? r.pbHistory[type].slice().reverse() : [];
    var histHtml = history.length ? '<div style="margin-top:6px;padding:6px 0 2px;border-top:1px solid var(--border);"><div style="font-size:10px;color:var(--text3);margin-bottom:4px;">' + type + ' Previous Times</div>' + history.map(function(h) { return '<div style="font-size:12px;color:var(--text3);display:flex;gap:10px;padding:2px 0;"><span class="text-mono">' + sTime(h.sec) + '</span><span>' + h.date + '</span></div>'; }).join('') + '</div>' : '';
    html += '<div style="margin-bottom:12px;"><div class="form-row" style="margin-bottom:0;"><label style="min-width:110px;font-size:13px;color:var(--text2);">' + label + '</label><input type="time" id="pb-input-' + id + '-' + type.replace(/\s+/g,'-') + '" step="1" value="' + curVal + '" style="max-width:150px;" ' + (type === 'parkrun' ? 'oninput="updateBandSuggestion(' + id + ')"' : '') + '/></div>' + tLine + histHtml;
    if (type === 'parkrun') {
      var suggested = suggestBand(r.pbs && r.pbs['parkrun'] != null ? r.pbs['parkrun'] : r.pbSec);
      var bandOpts = '<option value="">No band assigned</option>' + BAND_LABELS.map(function(b) { return '<option value="' + b + '" ' + (r.band === b ? 'selected' : '') + '>Band ' + b + ' &mdash; ' + BAND_TIME_RANGES[b] + '</option>'; }).join('');
      html += '<div class="form-row" style="margin-top:6px;margin-bottom:0;align-items:flex-start;flex-direction:column;gap:4px;">'
        + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
        + '<label style="min-width:110px;font-size:13px;color:var(--text2);">Handicap Band</label>'
        + '<select id="band-input-' + id + '" style="max-width:240px;font-size:13px;">' + bandOpts + '</select>'
        + '</div>'
        + '<div id="band-suggestion-' + id + '" style="padding-left:118px;min-height:20px;">'
        + (suggested && suggested !== r.band ? '<span style="font-size:12px;color:var(--text3);">Suggested from baseline: <button onclick="document.getElementById(\'band-input-' + id + '\').value=\'' + suggested + '\';document.getElementById(\'band-suggestion-' + id + '\').innerHTML=\'\';" style="background:var(--orange-dim);border:1px solid var(--orange);color:var(--orange);font-weight:700;font-size:12px;padding:1px 8px;border-radius:3px;cursor:pointer;">Use Band ' + suggested + '</button></span>' : '')
        + '</div>'
        + '</div>';
    }
    html += '</div>';
  });
  html += '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn btn-sm btn-primary" onclick="saveRunnerPB(' + id + ')">Save</button><button class="btn btn-sm" onclick="document.getElementById(\'edit-pb-' + id + '\').remove();showRunnerActions(' + id + ',true)">Cancel</button></div>';
  form.innerHTML = html; card.appendChild(form);
  setTimeout(function() { var inp = form.querySelector('input[type=time]'); if (inp) inp.focus(); }, 50);
}

function saveRunnerPB(id) {
  var r = S.runners.find(function(x) { return x.id === id; }); if (!r) return;
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES;
  types.forEach(function(type) { var el = document.getElementById('pb-input-' + id + '-' + type.replace(/\s+/g,'-')); if (!el) return; var s = tSec(el.value); if (s != null) setBaseline(id, type, s, null); else if (r.pbs) delete r.pbs[type]; });
  r.pbSec = r.pbs && r.pbs['parkrun'] != null ? r.pbs['parkrun'] : (Object.values(r.pbs || {})[0] || null);
  var bandSel = document.getElementById('band-input-' + id); if (bandSel) r.band = bandSel.value || null;
  document.getElementById('edit-pb-' + id).remove(); showRunnerActions(id, true); persist(); renderRunners();
}

function updateBandSuggestion(id) {
  var inp = document.getElementById('pb-input-' + id + '-parkrun');
  var suggEl = document.getElementById('band-suggestion-' + id);
  var bandSel = document.getElementById('band-input-' + id);
  if (!inp || !suggEl) return;
  var sec = tSec(inp.value);
  var suggested = suggestBand(sec);
  if (suggested) {
    suggEl.innerHTML = '<span style="font-size:12px;color:var(--text3);">Suggested from baseline: <button onclick="document.getElementById(\'band-input-' + id + '\').value=\'' + suggested + '\';document.getElementById(\'band-suggestion-' + id + '\').innerHTML=\'<span style=\\\'font-size:12px;color:var(--green);\\\'>&#10003; Band ' + suggested + ' applied</span>\';" style="background:var(--orange-dim);border:1px solid var(--orange);color:var(--orange);font-weight:700;font-size:12px;padding:1px 8px;border-radius:3px;cursor:pointer;">Use Band ' + suggested + '</button></span>';
  } else {
    suggEl.innerHTML = sec ? '<span style="font-size:12px;color:var(--text3);">Time outside standard bands — assign manually</span>' : '';
  }
}

function renderRunners() {
  var el = document.getElementById('runners-body');
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES;
  var active = S.runners.filter(function(r) { return !r.archived; }).sort(function(a,b) { return a.name.localeCompare(b.name); });
  var archived = S.runners.filter(function(r) { return r.archived; }).sort(function(a,b) { return a.name.localeCompare(b.name); });

  function runnerCard(r, isArchived) {
    var meta = '';
    if (r.rid) meta += '<span style="white-space:nowrap;"><span class="val">A' + r.rid + '</span> <a href="https://www.parkrun.org.uk/parkrunner/' + r.rid + '/" target="_blank" style="font-size:11px;color:var(--text3);text-decoration:none;">Profile &#8599;</a></span>';
    if (r.band) meta += '<span style="white-space:nowrap;"><span style="font-size:10px;color:var(--text3);">Band</span> <span class="val">' + r.band + '</span></span>';
    types.forEach(function(type) { var pb = r.pbs && r.pbs[type] != null ? r.pbs[type] : (type === 'parkrun' ? r.pbSec : null); if (pb != null) meta += '<span style="white-space:nowrap;color:var(--text3);">' + type + ' <span class="val">' + sTime(pb) + '</span></span>'; });
    var nameDisplay = (r.isLeader ? '\uD83C\uDFBD ' : '') + r.name + (isArchived ? ' <span style="font-size:10px;color:var(--text3);background:var(--bg3);border-radius:4px;padding:1px 5px;">Archived</span>' : '');
    var editBtn = isArchived ? '' : '<button onclick="editRunnerName(' + r.id + ')" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--text3);vertical-align:middle;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
    var actions = isArchived
      ? '<button class="btn btn-sm" onclick="restoreRunner(' + r.id + ')" style="font-size:10px;padding:3px 8px;">Restore</button><button class="btn btn-sm btn-danger" onclick="deleteRunner(' + r.id + ')" style="font-size:10px;padding:3px 8px;">Delete</button>'
      : '<button class="btn btn-sm btn-info" onclick="editRunnerPB(' + r.id + ')" style="font-size:10px;padding:3px 8px;">Baselines</button><button class="btn btn-sm btn-danger" onclick="removeRunner(' + r.id + ')" style="font-size:10px;padding:3px 8px;">Archive</button>';
    return '<div class="runner-card" data-runner-id="' + r.id + '" style="' + (isArchived ? 'opacity:.5;' : '') + '"><div class="runner-info" style="min-width:0;"><h3 id="runner-name-' + r.id + '" style="font-size:15px;">' + nameDisplay + ' ' + editBtn + '</h3><div class="runner-meta">' + meta + '</div></div><div class="runner-actions">' + actions + '</div></div>';
  }

  if (!active.length && !archived.length) { el.innerHTML = '<div class="notice">No runners yet. Add one above.</div>'; return; }

  function renderGrid(runners, isArchived) {
    var cards = runners.map(function(r) { return runnerCard(r, isArchived); });
    var rows = [];
    for (var i = 0; i < cards.length; i += 2) {
      rows.push('<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem;">' + cards[i] + (cards[i+1] || '<div></div>') + '</div>');
    }
    return rows.join('');
  }

  var html = active.length ? renderGrid(active, false) : '<div class="notice" style="margin-bottom:1rem;">No active runners.</div>';
  if (archived.length) {
    html += '<div style="margin-top:1.5rem;"><div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;border-top:1px solid var(--border);"><span style="font-size:11px;color:var(--text3);">Archived Runners (' + archived.length + ')</span></div><div style="display:none;">' + renderGrid(archived, true) + '</div></div>';
  }
  el.innerHTML = html;
}

function removeRunner(id) { var r = S.runners.find(function(x) { return x.id === id; }); confirmModal('Archive Runner', 'Archive ' + (r ? r.name : 'this runner') + '?', 'Archive', function() { var runner = S.runners.find(function(x) { return x.id === id; }); if (runner) { runner.archived = true; persist(); renderRunners(); } }); }
function restoreRunner(id) { var r = S.runners.find(function(x) { return x.id === id; }); if (r) { r.archived = false; persist(); renderRunners(); } }
function deleteRunner(id) { var r = S.runners.find(function(x) { return x.id === id; }); confirmModal('Permanently Delete', 'Delete ' + (r ? r.name : 'this runner') + '? Cannot be undone.', 'Delete', function() { S.runners = S.runners.filter(function(x) { return x.id !== id; }); for (var evId in S.results) delete S.results[evId][id]; for (var tid in S.tournamentRunners) S.tournamentRunners[tid] = S.tournamentRunners[tid].filter(function(e) { return e.rId !== id; }); persist(); renderRunners(); }); }
