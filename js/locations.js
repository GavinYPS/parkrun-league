// Tournament locations

var locLookupTimer = null;

function showAddLocation(tid) {
  var formId = 'f-loc-' + tid; var existing = document.getElementById(formId); if (existing) { existing.remove(); return; }
  var form = document.createElement('div'); form.id = formId; form.className = 'inline-form';
  if (isParkrun(tid)) {
    form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Add Location</div>'
      + '<div class="form-row"><label>Parkrun URL</label><input type="url" id="loc-url-' + tid + '" placeholder="https://www.parkrun.org.uk/macclesfield/" oninput="scheduleLocLookup(' + tid + ')"/></div>'
      + '<div class="url-status" id="loc-status-' + tid + '"></div>'
      + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="addLocation(' + tid + ')">Add Location</button><button class="btn btn-sm" onclick="document.getElementById(\'f-loc-' + tid + '\').remove()">Cancel</button></div>';
  } else {
    form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Add Event</div>'
      + '<div class="form-row"><label>Name</label><input type="text" id="loc-name-' + tid + '" placeholder="e.g. Heaton Park 10k"/></div>'
      + '<div class="form-row"><label>Date</label><input type="date" id="loc-date-' + tid + '" style="max-width:190px;"/></div>'
      + '<div class="form-row"><label>Event page</label><input type="url" id="loc-eventpage-' + tid + '" placeholder="https://..."/></div>'
      + '<div class="form-row"><label>Results URL</label><input type="url" id="loc-results-' + tid + '" placeholder="https://..."/></div>'
      + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="addLocationGeneric(' + tid + ')">Add Event</button><button class="btn btn-sm" onclick="document.getElementById(\'f-loc-' + tid + '\').remove()">Cancel</button></div>';
  }
  var tbody = document.getElementById('tbody-' + tid); if (tbody) tbody.prepend(form);
  setTimeout(function() { var inp = document.getElementById('loc-url-' + tid) || document.getElementById('loc-name-' + tid); if (inp) inp.focus(); }, 50);
}

function addLocationGeneric(tid) {
  var nameEl = document.getElementById('loc-name-' + tid); var name = nameEl ? nameEl.value.trim() : '';
  var dateEl = document.getElementById('loc-date-' + tid); var date = dateEl ? dateEl.value : '';
  var epEl = document.getElementById('loc-eventpage-' + tid); var eventPage = eu(epEl ? epEl.value.trim() : '');
  var ruEl = document.getElementById('loc-results-' + tid); var resultsUrl = eu(ruEl ? ruEl.value.trim() : '');
  if (!name) { alert('Please enter a location name.'); return; }
  if (S.locations.some(function(l) { return l.tournamentId === tid && l.name === name; })) { alert(name + ' already in this tournament.'); return; }
  var slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); var locId = uid();
  S.locations.push({id:locId, tournamentId:tid, slug:slug, name:name, date:date, eventPage:eventPage, resultsUrl:resultsUrl});
  S.events.push({id:uid(), locationId:locId, tournamentId:tid, slug:slug, locationName:name, runNumber:1, date:date, wildcard:false});
  document.getElementById('f-loc-' + tid).remove(); persist(); renderTournaments(); renderEnterTimesSel();
}

function editLocationGeneric(lid) {
  var loc = getLocation(lid); if (!loc) return;
  var formId = 'f-edit-loc-' + lid; var existing = document.getElementById(formId); if (existing) { existing.remove(); return; }
  var form = document.createElement('div'); form.id = formId; form.className = 'inline-form'; form.style.cssText = 'margin:.5rem 0;';
  form.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:.75rem;">Edit Event</div>'
    + '<div class="form-row"><label>Name</label><input type="text" id="edit-loc-name-' + lid + '" value="' + loc.name.replace(/"/g,'&quot;') + '"/></div>'
    + '<div class="form-row"><label>Date</label><input type="date" id="edit-loc-date-' + lid + '" value="' + (loc.date||'') + '" style="max-width:190px;"/></div>'
    + '<div class="form-row"><label>Event page</label><input type="url" id="edit-loc-eventpage-' + lid + '" value="' + (loc.eventPage||'').replace(/"/g,'&quot;') + '"/></div>'
    + '<div class="form-row"><label>Results URL</label><input type="url" id="edit-loc-results-' + lid + '" value="' + (loc.resultsUrl||'').replace(/"/g,'&quot;') + '"/></div>'
    + '<div class="btn-group" style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="saveLocationGeneric(' + lid + ')">Save</button><button class="btn btn-sm" onclick="document.getElementById(\'f-edit-loc-' + lid + '\').remove()">Cancel</button></div>';
  var allBlocks = document.querySelectorAll('.location-block'); var targetBlock = null;
  allBlocks.forEach(function(b) { if (b.innerHTML.indexOf('editLocationGeneric(' + lid + ')') !== -1) targetBlock = b; });
  if (targetBlock) targetBlock.insertAdjacentElement('afterend', form);
  else { var tb = document.getElementById('tbody-' + loc.tournamentId); if (tb) tb.prepend(form); }
  setTimeout(function() { var inp = document.getElementById('edit-loc-name-' + lid); if (inp) inp.focus(); }, 50);
}

function saveLocationGeneric(lid) {
  var loc = getLocation(lid); if (!loc) return;
  var nameEl = document.getElementById('edit-loc-name-' + lid); var name = nameEl ? nameEl.value.trim() : '';
  var dateEl = document.getElementById('edit-loc-date-' + lid); var date = dateEl ? dateEl.value : '';
  var epEl = document.getElementById('edit-loc-eventpage-' + lid); var eventPage = eu(epEl ? epEl.value.trim() : '');
  var ruEl = document.getElementById('edit-loc-results-' + lid); var resultsUrl = eu(ruEl ? ruEl.value.trim() : '');
  if (!name) { alert('Name is required.'); return; }
  loc.name = name; loc.date = date; loc.eventPage = eventPage; loc.resultsUrl = resultsUrl;
  var ev = S.events.find(function(e) { return e.locationId === lid; }); if (ev) { ev.locationName = name; ev.date = date; }
  document.getElementById('f-edit-loc-' + lid).remove(); persist(); renderTournaments(); renderEnterTimesSel();
}

function scheduleLocLookup(tid) {
  clearTimeout(locLookupTimer); var statusEl = document.getElementById('loc-status-' + tid); if (statusEl) statusEl.innerHTML = '';
  var urlEl = document.getElementById('loc-url-' + tid); var url = urlEl ? urlEl.value.trim() : ''; var slug = slugFromUrl(url); if (!slug) return;
  locLookupTimer = setTimeout(function() {
    var el = document.getElementById('loc-status-' + tid); if (!el) return;
    var name = slug.split('-').map(function(w) { return w ? w[0].toUpperCase() + w.slice(1) : ''; }).join(' ') + ' Parkrun';
    el.innerHTML = '<span style="color:var(--green)">' + name + '</span>'; el.dataset.name = name; el.dataset.slug = slug;
  }, 400);
}

function addLocation(tid) {
  var urlInput = document.getElementById('loc-url-' + tid); var statusEl = document.getElementById('loc-status-' + tid);
  var url = urlInput ? urlInput.value.trim() : ''; var slug = (statusEl && statusEl.dataset.slug) || slugFromUrl(url);
  var name = (statusEl && statusEl.dataset.name) || (slug ? slug.split('-').map(function(w) { return w[0].toUpperCase() + w.slice(1); }).join(' ') + ' Parkrun' : '');
  if (!slug) { alert('Please paste a valid Parkrun location URL.'); return; }
  if (S.locations.some(function(l) { return l.tournamentId === tid && l.slug === slug; })) { alert(name + ' already in this tournament.'); return; }
  S.locations.push({id:uid(), tournamentId:tid, slug:slug, name:name});
  document.getElementById('f-loc-' + tid).remove(); persist(); renderTournaments();
}

function removeLocation(lid) {
  var loc = getLocation(lid);
  confirmModal('Remove Location', 'Remove "' + (loc ? loc.name : 'this location') + '" and all its events?', 'Remove', function() {
    S.events.filter(function(e) { return e.locationId === lid; }).forEach(function(e) { delete S.results[e.id]; });
    S.events = S.events.filter(function(e) { return e.locationId !== lid; }); S.locations = S.locations.filter(function(l) { return l.id !== lid; });
    persist(); renderTournaments(); renderEnterTimesSel();
  });
}
