// Global settings and activity types

function renderGlobalSettings() {
  var name = getClubName();
  var input = document.getElementById('setting-club-name'); var display = document.getElementById('club-name-display');
  if (input) input.value = name; if (display) display.textContent = name;
  toggleClubEdit(false); renderActivityTypes(false);
  var gnDisplay = document.getElementById('club-groupnum-display');
  var gnInput = document.getElementById('setting-club-groupnum');
  var gn = S.clubGroupNum || '';
  if (gnDisplay) gnDisplay.textContent = gn || 'Not set';
  if (gnInput) gnInput.value = gn || '';
  var ghCfg = ghLoadConfig();
  var ghT = document.getElementById('gh-token'); var ghR = document.getElementById('gh-repo'); var ghP = document.getElementById('gh-path');
  if (ghT) ghT.value = ghCfg.token || ''; if (ghR) ghR.value = ghCfg.repo || 'GavinYPS/parkrun-league'; if (ghP) ghP.value = ghCfg.path || 'data.json';
  if (!ghCfg.repo) ghSaveConfig();
  ghSetSaveEnabled(ghHasRetrieved());
}

function renderActivityTypes(editMode) {
  var el = document.getElementById('activity-types-list'); if (!el) return;
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES;
  var headerEl = document.getElementById('activity-types-header');
  if (headerEl) headerEl.innerHTML = editMode
    ? '<div style="display:flex;gap:6px;"><button class="btn btn-sm btn-primary" onclick="saveActivityTypes()">Save</button><button class="btn btn-sm" onclick="renderActivityTypes(false)">Cancel</button></div>'
    : '<button class="btn btn-sm btn-info" onclick="renderActivityTypes(true)">Edit</button>';
  if (!editMode) {
    el.innerHTML = types.map(function(type) { return '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:14px;font-weight:600;text-transform:uppercase;color:var(--text);">' + type + '</div>'; }).join('');
    var addRow = document.getElementById('activity-type-add-row'); if (addRow) addRow.style.display = 'none';
  } else {
    el.innerHTML = types.map(function(type, i) { return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="text" id="at-input-' + i + '" value="' + type + '" style="flex:1;font-size:13px;max-width:200px;"/>' + (types.length > 1 ? '<button onclick="removeActivityType(' + i + ')" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text3);">&#10005;</button>' : '') + '</div>'; }).join('');
    var addRow = document.getElementById('activity-type-add-row'); if (addRow) addRow.style.display = 'flex';
  }
}

function saveActivityTypes() {
  var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES; var errors = [];
  types.forEach(function(old, i) {
    var el = document.getElementById('at-input-' + i); if (!el) return;
    var val = el.value.trim().toLowerCase(); if (!val) { errors.push('Type name cannot be empty.'); return; }
    if (val !== old) {
      var otherVals = types.map(function(_, j) { return j === i ? null : (document.getElementById('at-input-' + j) ? document.getElementById('at-input-' + j).value.trim().toLowerCase() : null); }).filter(Boolean);
      if (otherVals.indexOf(val) !== -1) { errors.push('"' + val + '" is a duplicate.'); return; }
      S.runners.forEach(function(r) { if (r.pbs && r.pbs[old] != null) { r.pbs[val] = r.pbs[old]; delete r.pbs[old]; } if (r.pbHistory && r.pbHistory[old]) { r.pbHistory[val] = r.pbHistory[old]; delete r.pbHistory[old]; } });
      S.tournaments.forEach(function(t) { if (t.type === old) t.type = val; }); types[i] = val;
    }
  });
  if (errors.length) { alert(errors.join('\n')); return; } persist(); renderActivityTypes(false); renderRunners();
}

function populateTypeSelect(selId, currentVal) { var sel = document.getElementById(selId); if (!sel) return; var types = S.activityTypes || DEFAULT_ACTIVITY_TYPES; sel.innerHTML = types.map(function(type) { return '<option value="' + type + '" ' + ((currentVal || 'parkrun') === type ? 'selected' : '') + '>' + type + '</option>'; }).join(''); }
function addActivityType() { var input = document.getElementById('new-activity-type'); var val = input ? input.value.trim().toLowerCase() : ''; if (!val) { alert('Enter a type name.'); return; } if (!S.activityTypes) S.activityTypes = ['parkrun','10k']; if (S.activityTypes.indexOf(val) !== -1) { alert(val + ' already exists.'); return; } S.activityTypes.push(val); if (input) input.value = ''; persist(); renderActivityTypes(true); renderRunners(); }
function removeActivityType(i) { if (!S.activityTypes || S.activityTypes.length <= 1) { alert('Must have at least one activity type.'); return; } var type = S.activityTypes[i]; confirmModal('Remove Activity Type', 'Remove "' + type + '"?', 'Remove', function() { S.activityTypes.splice(i, 1); persist(); renderActivityTypes(true); renderRunners(); }); }

function toggleClubEdit(forceState) {
  var view = document.getElementById('club-view-state'); var edit = document.getElementById('club-edit-state'); var btn = document.getElementById('club-edit-btn');
  var isEditing = forceState !== undefined ? forceState : (view.style.display === 'none');
  if (isEditing) { view.style.display = 'none'; edit.style.display = 'block'; btn.style.display = 'none'; var inp = document.getElementById('setting-club-name'); if (inp) inp.focus(); }
  else { view.style.display = 'block'; edit.style.display = 'none'; btn.style.display = ''; btn.textContent = 'Edit'; }
}

function saveGlobalSettings() {
  var nameEl = document.getElementById('setting-club-name'); var name = nameEl ? nameEl.value.trim() : '';
  if (!name) { alert('Club name is required.'); return; }
  S.clubName = name;
  // Save Parkrun group number
  var gnEl = document.getElementById('setting-club-groupnum');
  var gn = gnEl ? parseInt(gnEl.value.trim()) : 0;
  if (gn) S.clubGroupNum = gn;
  persist();
  document.getElementById('club-name-display').textContent = name;
  var gnDisplay = document.getElementById('club-groupnum-display');
  if (gnDisplay) gnDisplay.textContent = gn || S.clubGroupNum || 'Not set';
  toggleClubEdit(false);
  var msg = document.getElementById('global-settings-saved'); if (msg) { msg.style.display = 'inline'; setTimeout(function() { msg.style.display = 'none'; }, 2000); }
  if (ghIsConfigured()) ghPush();
}
