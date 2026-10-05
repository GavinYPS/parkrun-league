// Tournament events (run dates)

function prevSaturday() { var d = new Date(); var day = d.getDay(); d.setDate(d.getDate() - (day === 6 ? 0 : day + 1)); return d.toISOString().substring(0,10); }

function suggestNextDate(locEvents, suggestedRun) {
  var sorted = locEvents.slice().sort(function(a,b) { return b.runNumber - a.runNumber; });
  var last = sorted[0]; var prev = sorted[1];
  if (!last || !last.date) return prevSaturday();
  if (prev && prev.date && prev.runNumber) {
    var gap = last.runNumber - prev.runNumber;
    if (gap > 0) { var runsAhead = (suggestedRun || last.runNumber + 1) - last.runNumber; var result = new Date(last.date + 'T12:00:00'); result.setDate(result.getDate() + runsAhead * 7); return result.toISOString().substring(0,10); }
  }
  var runsAhead2 = (suggestedRun || last.runNumber + 1) - last.runNumber; var result2 = new Date(last.date + 'T12:00:00'); result2.setDate(result2.getDate() + runsAhead2 * 7); return result2.toISOString().substring(0,10);
}

function showAddEvent(lid) {
  var formId = 'f-ev-' + lid; var existing = document.getElementById(formId); if (existing) { existing.remove(); return; }
  var loc = getLocation(lid); var parkrun = isParkrun(loc ? loc.tournamentId : null);
  var locEvents = S.events.filter(function(e) { return e.locationId === lid; }).sort(function(a,b) { return b.runNumber - a.runNumber; });
  var lastEv = locEvents[0]; var suggestedRun = lastEv ? lastEv.runNumber + 1 : ''; var suggestedDate = parkrun ? suggestNextDate(locEvents, suggestedRun || undefined) : prevSaturday();
  var form = document.createElement('div'); form.id = formId; form.className = 'inline-form';
  form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Add Event</div>'
    + '<div class="form-row"><label>Date</label><input type="date" id="evdate-' + lid + '" value="' + suggestedDate + '" style="max-width:190px;"' + (parkrun ? ' oninput="autoRunFromDate(' + lid + ')"' : '') + '/>' + (parkrun ? '<span id="evdate-hint-' + lid + '" style="font-size:11px;color:var(--text3);margin-left:4px;">sets run number</span>' : '') + '</div>'
    + '<div class="form-row"><label>' + (parkrun ? 'Run number' : 'Event number') + '</label><input type="number" min="1" id="evnum-' + lid + '" value="' + suggestedRun + '" style="max-width:130px;font-family:SF Mono,Fira Code,monospace;"/></div>'
    + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="saveEvent(' + lid + ')">Save Event</button><button class="btn btn-sm" onclick="document.getElementById(\'f-ev-' + lid + '\').remove()">Cancel</button></div>';
  var evlist = document.getElementById('loc-body-' + lid); if (evlist) evlist.prepend(form);
  if (parkrun) autoRunFromDate(lid);
  setTimeout(function() { var inp = document.getElementById('evdate-' + lid); if (inp) inp.focus(); }, 50);
}

function autoRunFromDate(lid) {
  var dateEl = document.getElementById('evdate-' + lid); var numEl = document.getElementById('evnum-' + lid); var hintEl = document.getElementById('evdate-hint-' + lid);
  if (!dateEl || !numEl || !dateEl.value) return;
  var locEvents = S.events.filter(function(e) { return e.locationId === lid; }).sort(function(a,b) { return b.runNumber - a.runNumber; });
  var lastEv = locEvents[0]; if (!lastEv || !lastEv.date || !lastEv.runNumber) return;
  var diffWeeks = Math.round((new Date(dateEl.value + 'T12:00:00') - new Date(lastEv.date + 'T12:00:00')) / 604800000);
  var suggestedRun = lastEv.runNumber + diffWeeks;
  if (suggestedRun > 0) { numEl.value = suggestedRun; if (hintEl) hintEl.textContent = 'run #' + suggestedRun; }
  else { if (hintEl) hintEl.textContent = 'check date'; }
}

function saveEvent(lid) {
  var loc = getLocation(lid); if (!loc) return;
  var numEl = document.getElementById('evnum-' + lid); var num = parseInt(numEl ? numEl.value : '');
  var dateEl = document.getElementById('evdate-' + lid); var date = dateEl ? dateEl.value : '';
  if (!num || num < 1) { alert('Run number must be 1 or greater.'); return; }
  if (S.events.some(function(e) { return e.locationId === lid && e.runNumber === num; })) { alert('Run #' + num + ' already exists.'); return; }
  S.events.push({id:uid(), locationId:lid, tournamentId:loc.tournamentId, slug:loc.slug, locationName:loc.name, runNumber:num, date:date, wildcard:false});
  document.getElementById('f-ev-' + lid).remove(); persist(); renderTournaments(); renderEnterTimesSel();
}

function removeEvent(eid) {
  var ev = getEvent(eid);
  confirmModal('Remove Event', 'Remove run #' + (ev ? ev.runNumber : 'this event') + ' and all its results?', 'Remove', function() { S.events = S.events.filter(function(e) { return e.id !== eid; }); delete S.results[eid]; persist(); renderTournaments(); renderEnterTimesSel(); });
}

function editEvent(eid) {
  var ev = getEvent(eid); if (!ev) return;
  var formId = 'f-edit-ev-' + eid; var existing = document.getElementById(formId); if (existing) { existing.remove(); return; }
  var row = document.getElementById('evrow-' + eid); if (!row) return;
  var form = document.createElement('div'); form.id = formId; form.className = 'inline-form'; form.style.marginTop = '6px';
  form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Edit Event</div>'
    + '<div class="form-row"><label>Run number</label><input type="number" min="1" id="edit-evnum-' + eid + '" value="' + ev.runNumber + '" style="max-width:130px;font-family:SF Mono,Fira Code,monospace;"/></div>'
    + '<div class="form-row"><label>Date</label><input type="date" id="edit-evdate-' + eid + '" value="' + (ev.date||'') + '" style="max-width:190px;"/></div>'
    + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="saveEventEdit(' + eid + ')">Save</button><button class="btn btn-sm" onclick="document.getElementById(\'f-edit-ev-' + eid + '\').remove()">Cancel</button></div>';
  row.insertAdjacentElement('afterend', form); setTimeout(function() { var inp = document.getElementById('edit-evnum-' + eid); if (inp) inp.focus(); }, 50);
}

function saveEventEdit(eid) {
  var ev = getEvent(eid); if (!ev) return;
  var numEl = document.getElementById('edit-evnum-' + eid); var num = parseInt(numEl ? numEl.value : '');
  var dateEl = document.getElementById('edit-evdate-' + eid); var date = dateEl ? dateEl.value : '';
  if (!num || num < 1) { alert('Run number must be 1 or greater.'); return; }
  if (S.events.some(function(e) { return e.id !== eid && e.locationId === ev.locationId && e.runNumber === num; })) { alert('Run #' + num + ' already exists.'); return; }
  ev.runNumber = num; ev.date = date; document.getElementById('f-edit-ev-' + eid).remove(); persist(); renderTournaments(); renderEnterTimesSel();
}

function toggleWildcard(eid) {
  var ev = getEvent(eid); if (!ev) return;
  ev.wildcard = !ev.wildcard; persist();
  var panel = document.getElementById('settings-panel-' + ev.tournamentId); if (panel) panel.innerHTML = buildSettingsPanel(ev.tournamentId);
  renderTournaments();
}
