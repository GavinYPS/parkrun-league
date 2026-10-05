// Tournaments page: add/archive/edit and list rendering

function addTournament() {
  var name = document.getElementById('t-name').value.trim(); var desc = document.getElementById('t-desc').value.trim(); var type = (document.getElementById('t-type') || {}).value || 'parkrun';
  if (!name) { alert('Tournament name is required.'); return; }
  S.tournaments.push({id:uid(), name:name, desc:desc, type:type, settings:defaultTournamentSettings()});
  ['t-name','t-desc'].forEach(function(id) { document.getElementById(id).value = ''; }); document.getElementById('f-tournament').style.display = 'none';
  persist(); renderTournaments(); renderLbSel();
}

function archiveTournament(tid) { var t = getTournament(tid); if (!t) return; confirmModal('Archive Tournament', 'Archive "' + t.name + '"?', 'Archive', function() { t.archived = true; delete S.tournamentRunners[String(tid)]; persist(); renderTournaments(); renderLbSel(); }); }
function restoreTournament(tid) { var t = getTournament(tid); if (!t) return; t.archived = false; persist(); renderTournaments(); renderLbSel(); }

function editTournament(tid) {
  var t = getTournament(tid); if (!t) return;
  var formId = 'f-edit-t-' + tid; var existing = document.getElementById(formId); if (existing) { existing.remove(); return; }
  var form = document.createElement('div'); form.id = formId; form.className = 'inline-form card-accent'; form.style.marginBottom = '.75rem';
  var opts = (S.activityTypes || DEFAULT_ACTIVITY_TYPES).map(function(type) { return '<option value="' + type + '" ' + ((t.type || 'parkrun') === type ? 'selected' : '') + '>' + type + '</option>'; }).join('');
  form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Edit Tournament</div>'
    + '<div class="form-row"><label>Name</label><input type="text" id="edit-t-name-' + tid + '" value="' + t.name.replace(/"/g,'&quot;') + '"/></div>'
    + '<div class="form-row"><label>Description</label><input type="text" id="edit-t-desc-' + tid + '" value="' + (t.desc||'').replace(/"/g,'&quot;') + '"/></div>'
    + '<div class="form-row"><label>Type</label><select id="edit-t-type-' + tid + '" style="max-width:220px;">' + opts + '</select></div>'
    + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="saveTournamentEdit(' + tid + ')">Save</button><button class="btn btn-sm" onclick="document.getElementById(\'f-edit-t-' + tid + '\').remove()">Cancel</button></div>';
  var tbody = document.getElementById('tbody-' + tid); if (tbody) tbody.prepend(form);
  setTimeout(function() { var inp = document.getElementById('edit-t-name-' + tid); if (inp) inp.focus(); }, 50);
}

function saveTournamentEdit(tid) {
  var t = getTournament(tid); if (!t) return;
  var nameEl = document.getElementById('edit-t-name-' + tid); var name = nameEl ? nameEl.value.trim() : '';
  var descEl = document.getElementById('edit-t-desc-' + tid); var desc = descEl ? descEl.value.trim() : '';
  var typeEl = document.getElementById('edit-t-type-' + tid); var type = typeEl ? typeEl.value : 'parkrun';
  if (!name) { alert('Name is required.'); return; }
  t.name = name; t.desc = desc; t.type = type;
  document.getElementById('f-edit-t-' + tid).remove(); persist(); renderTournaments(); renderLbSel();
}

function renderTournaments() {
  var el = document.getElementById('tournaments-body');
  var active = S.tournaments.filter(function(t) { return !t.archived; });
  var archived = S.tournaments.filter(function(t) { return t.archived; });
  if (!active.length && !archived.length) { el.innerHTML = '<div class="notice">No tournaments yet.</div>'; return; }
  var today = new Date().toISOString().substring(0,10);

  function renderCard(t, isArchived) {
    var tLocs = S.locations.filter(function(l) { return l.tournamentId === t.id; });
    var tEvents = S.events.filter(function(e) { return e.tournamentId === t.id; });
    var locsHtml = tLocs.map(function(loc) {
      if (!isParkrun(t.id)) {
        var locEv = S.events.find(function(e) { return e.locationId === loc.id; }); var evId = locEv ? locEv.id : null;
        var resultsLink = loc.resultsUrl ? '<a href="' + eu(loc.resultsUrl) + '" target="_blank" style="color:var(--text3);text-decoration:none;border-bottom:1px solid var(--border2);">Results &#8599;</a>' : '';
        var eventPageLink = loc.eventPage ? '<a href="' + eu(loc.eventPage) + '" target="_blank" style="color:var(--text3);text-decoration:none;border-bottom:1px solid var(--border2);">Event page &#8599;</a>' : '';
        var meta = [eventPageLink, resultsLink, loc.date ? fmtDate(loc.date) : '<em style="color:var(--text3)">no date</em>'].filter(Boolean).join(' &middot; ');
        var wcActive = locEv && locEv.wildcard === true;
        var btns = '';
        if (evId) { btns += '<button class="btn btn-sm btn-info" onclick="etViewMode=false;etEditMode=true;sw(\'enter-times\');document.getElementById(\'et-ev-sel\').value=\'' + evId + '\';renderEnterTimes();">Enter Times</button>'; btns += '<button class="btn btn-sm" onclick="etViewMode=true;etEditMode=false;sw(\'enter-times\');document.getElementById(\'et-ev-sel\').value=\'' + evId + '\';renderEnterTimes();">Results</button>'; }
        btns += '<button class="btn btn-sm" onclick="editLocationGeneric(' + loc.id + ')">Edit</button><button class="btn btn-sm btn-danger" onclick="removeLocation(' + loc.id + ')">Remove</button>';
        return '<div class="location-block"><div class="location-header" style="cursor:default;"><div><div class="location-name">' + loc.name + (wcActive ? ' <span class="badge badge-wc">&#9889; Wildcard</span>' : '') + '</div><div class="location-meta">' + meta + '</div></div><div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;">' + btns + '</div></div></div>';
      }
      var locEvents = S.events.filter(function(e) { return e.locationId === loc.id; }).sort(function(a,b) { return a.runNumber - b.runNumber; });
      var evRows = locEvents.map(function(ev) {
        var evUrl = ev.date ? 'https://www.parkrun.org.uk/' + loc.slug + '/results/' + ev.date + '/' : '';
        var wcActive = ev.wildcard === true;
        var canEnterTimes = !ev.date || ev.date <= today;
        var evOnOrAfterToday = ev.date && ev.date <= today;
        var leftSide = '<span class="badge badge-orange">#' + ev.runNumber + '</span>';
        if (wcActive) leftSide += ' <span class="badge badge-wc">&#9889; Wildcard</span>';
        leftSide += ' <span style="font-size:13px;color:var(--text2);">' + (ev.date ? fmtDate(ev.date) : '<em style="color:var(--text3)">no date</em>') + '</span>';
        if (evUrl) {
          if (evOnOrAfterToday) { leftSide += ' <button onclick="openParkrunResults(\'' + evUrl + '\')" class="btn btn-sm btn-info" style="padding:2px 8px;font-size:11px;">Open Parkrun Results &#8599;</button>'; }
          else { leftSide += ' <button class="btn btn-sm btn-info" style="padding:2px 8px;font-size:11px;opacity:.4;cursor:not-allowed;" disabled title="Available on ' + fmtDate(ev.date) + '">Open Parkrun Results &#8599;</button>'; }
        }
        var rightSide = '<button class="btn btn-sm" onclick="editEvent(' + ev.id + ')">Edit</button>';
        if (canEnterTimes) {
          rightSide += '<button class="btn btn-sm btn-info" onclick="etViewMode=false;etEditMode=true;sw(\'enter-times\');document.getElementById(\'et-ev-sel\').value=\'' + ev.id + '\';renderEnterTimes();">Enter Times</button>';
          rightSide += '<button class="btn btn-sm" onclick="etViewMode=true;etEditMode=false;sw(\'enter-times\');document.getElementById(\'et-ev-sel\').value=\'' + ev.id + '\';renderEnterTimes();">Results</button>';
        } else {
          rightSide += '<button class="btn btn-sm" disabled style="opacity:.35;cursor:not-allowed;" title="Available on ' + fmtDate(ev.date) + '">Enter Times</button>';
          rightSide += '<button class="btn btn-sm" disabled style="opacity:.35;cursor:not-allowed;" title="Available on ' + fmtDate(ev.date) + '">Results</button>';
        }
        rightSide += '<button class="btn btn-sm btn-danger" onclick="removeEvent(' + ev.id + ')">Remove</button>';
        return '<div class="event-row" id="evrow-' + ev.id + '"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + leftSide + '</div><div style="display:flex;gap:6px;flex-shrink:0;">' + rightSide + '</div></div>';
      }).join('');
      return '<div class="location-block"><div class="location-header" onclick="toggleCollapse(\'loc-body-' + loc.id + '\',\'loc-chev-' + loc.id + '\')">'
        + '<div><div class="location-name">' + loc.name + '</div><div class="location-meta"><a href="https://www.parkrun.org.uk/' + loc.slug + '/results/eventhistory/" target="_blank" onclick="event.stopPropagation();" style="color:var(--text3);text-decoration:none;border-bottom:1px solid var(--border2);">Location Results &#8599;</a> &middot; ' + locEvents.length + ' event' + (locEvents.length !== 1 ? 's' : '') + '</div></div>'
        + '<div style="display:flex;gap:6px;flex-shrink:0;align-items:center;"><button class="btn btn-sm btn-primary" onclick="event.stopPropagation();showAddEvent(' + loc.id + ')">+ Add Event</button><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeLocation(' + loc.id + ')">Remove</button><svg id="loc-chev-' + loc.id + '" class="chevron open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>'
        + '</div><div class="location-events" id="loc-body-' + loc.id + '">' + (evRows || '<div style="font-size:13px;color:var(--text3);padding:6px 0;">No events yet.</div>') + '</div></div>';
    }).join('');

    var tMeta = (t.desc ? t.desc + ' &middot; ' : '') + tLocs.length + ' ' + (isParkrun(t.id) ? 'location' + (tLocs.length !== 1 ? 's' : '') + ' &middot; ' + tEvents.length + ' event' + (tEvents.length !== 1 ? 's' : '') : 'event' + (tLocs.length !== 1 ? 's' : ''));
    var hdrBtns = isArchived
      ? '<button class="btn btn-sm" onclick="event.stopPropagation();restoreTournament(' + t.id + ')">Restore</button>'
      : '<button class="btn btn-sm" onclick="event.stopPropagation();editTournament(' + t.id + ')">Edit</button>'
        + '<button class="btn btn-sm" onclick="event.stopPropagation();showTournamentRunners(' + t.id + ')">Club Runners</button>'
        + '<button class="btn btn-sm" onclick="event.stopPropagation();toggleTournamentSettings(' + t.id + ')">Settings</button>'
        + '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();showAddLocation(' + t.id + ')">' + (isParkrun(t.id) ? '+ Add Location' : '+ Add Event') + '</button>'
        + '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();archiveTournament(' + t.id + ')">Archive</button>';
    return '<div class="tournament-card"><div class="tournament-header" onclick="toggleCollapse(\'tbody-' + t.id + '\',\'t-chev-' + t.id + '\')">'
      + '<div><div class="tournament-title">' + t.name + (isArchived ? ' <span style="font-size:11px;color:var(--text3);background:var(--bg3);border-radius:4px;padding:2px 6px;margin-left:6px;">Archived</span>' : '') + '</div><div class="tournament-meta">' + tMeta + '</div></div>'
      + '<div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;align-items:center;">' + hdrBtns + '<svg id="t-chev-' + t.id + '" class="chevron open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>'
      + '</div><div class="tournament-body" id="tbody-' + t.id + '">' + (isArchived ? '' : (locsHtml || '<div style="font-size:13px;color:var(--text3);">No locations yet.</div>')) + '</div></div>';
  }

  var html = active.map(function(t) { return renderCard(t, false); }).join('');
  if (archived.length) {
    html += '<div style="margin-top:1.5rem;"><div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;border-top:1px solid var(--border);"><span style="font-size:11px;color:var(--text3);">Archived Tournaments (' + archived.length + ')</span></div><div style="display:none;">' + archived.map(function(t) { return renderCard(t, true); }).join('') + '</div></div>';
  }
  el.innerHTML = html;
}
