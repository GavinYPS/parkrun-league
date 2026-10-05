// parkrun auto-import

// ═══════════════════════════════════════════════════════════════════════════
// PARKRUN AUTO-IMPORT  v6
// Uses consolidated club report (parkrun.com/results/consolidatedclub/?clubNum=28709)
// Opens in new tab → reads DOM → passes data back via localStorage polling
// Fully standalone, no proxy, no extension needed.
// ═══════════════════════════════════════════════════════════════════════════

(function injectImportStyles() {
  var s = document.createElement('style');
  s.textContent = `
    .im-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:800;align-items:center;justify-content:center;}
    .im-overlay.open{display:flex;}
    .im-box{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);width:100%;max-width:720px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 8px 56px rgba(0,0,0,.95);margin:1rem;}
    .im-head{padding:.85rem 1.25rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:8px;}
    .im-head h3{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin:0;}
    .im-status{font-size:13px;padding:.5rem 1.25rem;background:var(--bg3);border-bottom:1px solid var(--border);color:var(--text2);display:none;align-items:center;gap:8px;flex-shrink:0;}
    .im-body{overflow-y:auto;padding:.85rem 1.25rem;flex:1;min-height:0;}
    .im-foot{padding:.7rem 1.25rem;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-shrink:0;flex-wrap:wrap;}
    .im-spin{width:13px;height:13px;border:2px solid var(--border2);border-top-color:var(--orange);border-radius:50%;animation:imspin .7s linear infinite;display:inline-block;flex-shrink:0;}
    @keyframes imspin{to{transform:rotate(360deg);}}
    .im-sec{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin:1.1rem 0 .4rem;padding-bottom:.3rem;border-bottom:1px solid var(--border);}
    .im-sec:first-child{margin-top:0;}
    .im-hdr{display:grid;grid-template-columns:18px 1fr 90px 55px;gap:8px;padding:4px 0;border-bottom:2px solid var(--border2);font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;}
    .im-row{display:grid;grid-template-columns:18px 1fr 90px 55px;gap:8px;align-items:start;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;}
    .im-row:last-child{border-bottom:none;}
    .im-vhdr{display:grid;grid-template-columns:18px 1fr 1fr;gap:8px;padding:4px 0;border-bottom:2px solid var(--border2);font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;}
    .im-vrow{display:grid;grid-template-columns:18px 1fr 1fr;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;}
    .im-vrow:last-child{border-bottom:none;}
    .im-new-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;}
    .im-new-row:last-child{border-bottom:none;}
    .im-chk{width:15px;height:15px;accent-color:var(--orange);cursor:pointer;margin-top:2px;}
    .im-prname{font-weight:600;line-height:1.3;}
    .im-sublabel{font-size:11px;color:var(--text3);margin-top:2px;}
    .im-match{font-size:11px;margin-top:3px;}
    .im-sel{font-size:12px;width:100%;margin-top:3px;}
    .im-strong{color:var(--green);}
    .im-weak{color:var(--orange);}
    .im-none{color:var(--red);}
    .im-time{font-family:'SF Mono','Fira Code',monospace;font-weight:700;color:var(--orange);font-size:14px;padding-top:1px;}
    .im-pos{font-size:11px;color:var(--text3);padding-top:2px;}
    .im-warn{background:var(--orange-dim);border:1px solid var(--orange);border-radius:var(--radius-sm);padding:.5rem .75rem;font-size:13px;color:var(--orange);margin-bottom:.75rem;line-height:1.5;}
    .im-info{font-size:12px;color:var(--text3);margin-bottom:.75rem;line-height:1.6;}
    .im-absent{padding:5px 0;font-size:12px;color:var(--text3);border-bottom:1px solid var(--border);}
    .im-absent:last-child{border-bottom:none;}
    .btn-import{color:var(--blue);border-color:rgba(90,159,212,.3);background:rgba(90,159,212,.08);}
    .btn-import:hover{background:rgba(90,159,212,.2);}
    .im-waiting{text-align:center;padding:2rem 1rem;}
    .im-waiting p{color:var(--text2);font-size:13px;margin:.75rem 0;line-height:1.6;}
    .im-progress{font-size:12px;color:var(--text3);margin-top:.5rem;}
    .im-loc-badge{display:inline-block;background:var(--bg3);border:1px solid var(--border);border-radius:3px;padding:1px 6px;font-size:11px;color:var(--text2);margin-top:2px;}
  `;
  document.head.appendChild(s);
})();

// ── Constants ────────────────────────────────────────────────────────────────
var PR_CLUB_NUM = 28709;  // Default - overridden by S.clubGroupNum from settings
var PR_LS_KEY   = 'pr_import_data';   // localStorage key for cross-tab data
var PR_LS_REQ   = 'pr_import_request'; // key app writes to trigger scrape

// ── URL builder ──────────────────────────────────────────────────────────────
function getClubGroupNum() {
  return parseInt((S && S.clubGroupNum) || 28709) || 28709;
}

function prBuildConsolidatedUrl(date) {
  // Uses club group number from Global Settings (falls back to default)
  var groupNum = getClubGroupNum();
  return 'https://www.parkrun.com/results/consolidatedclub/?clubNum=' + groupNum
       + (date ? '&eventdate=' + date : '');
}

function prBuildEventUrl(ev) {
  var loc = S.locations.find(function(l){ return l.id===ev.locationId; });
  if (!loc || !ev.date) return null;
  var slug = null;
  if (loc.eventPage) { var m=loc.eventPage.match(/parkrun\.org\.uk\/([a-z0-9-]+)/i); if(m) slug=m[1].toLowerCase(); }
  if (!slug && loc.slug) slug = loc.slug.toLowerCase();
  if (!slug && loc.name) slug = loc.name.toLowerCase().replace(/\s+parkrun.*/i,'').replace(/[^a-z0-9]/g,'');
  return slug ? 'https://www.parkrun.org.uk/' + slug + '/results/' + ev.date + '/' : null;
}

// ── Name matching ────────────────────────────────────────────────────────────
function prTok(n){ return n.toLowerCase().replace(/[^a-z\s]/g,'').trim().split(/\s+/); }
function prScore(a,b){
  var ta=prTok(a),tb=prTok(b),hits=0;
  ta.forEach(function(t){ if(tb.some(function(u){return u===t||(t.length>2&&(u.startsWith(t)||t.startsWith(u)));})){ hits++; } });
  return Math.max(ta.length,tb.length)===0?0:hits/Math.max(ta.length,tb.length);
}
function prMatch(prName,runners){
  var best=null,top=0;
  runners.forEach(function(r){var s=prScore(prName,r.name);if(s>top){top=s;best=r;}});
  return {runner:best,conf:top>=0.75?'strong':top>=0.4?'weak':'none'};
}
function prSec(str){
  if(!str) return null;
  var p=str.trim().replace(/[^0-9:]/g,'').split(':').map(Number);
  if(p.length===2) return p[0]*60+p[1];
  if(p.length===3) return p[0]*3600+p[1]*60+p[2];
  return null;
}


var _imModal=null;
var _imPollTimer=null;
var _imS={rows:[],vols:[],newR:[],absent:[],evId:null,tId:null,evDate:null,evSlug:null};

// ── Parse consolidated club HTML table ───────────────────────────────────────
function prParseConsolidated(text) {
  var doc = new DOMParser().parseFromString(text, 'text/html');
  var results = [];
  var currentLocation = '';

  // Walk through all elements finding h2/h3 (location names) and tables (results)
  Array.from(doc.querySelectorAll('h1,h2,h3,h4,table')).forEach(function(el) {
    if (el.tagName.match(/^H[1-4]$/)) {
      var t = el.textContent.trim();
      if (t && !t.toLowerCase().includes('consolidated') && !t.toLowerCase().includes('results')) {
        currentLocation = t.replace(/parkrun$/i,'').trim();
      }
    } else if (el.tagName === 'TABLE') {
      Array.from(el.querySelectorAll('tbody tr')).forEach(function(tr) {
        var cells = Array.from(tr.querySelectorAll('td')).map(function(td){
          // Get text without child element noise
          return td.textContent.trim();
        });
        if (cells.length >= 5) {
          var name = cells[2], time = cells[4];
          if (!name || !time) return;
          results.push({
            pos:      cells[0],
            name:     name,
            club:     cells[3],
            time:     time.replace(/^00:/,''), // strip leading "00:" from "00:22:14" → "22:14"
            timeSec:  prSec(time),
            location: currentLocation,
          });
        }
      });
    }
  });
  return results;
}

// ── Modal open ───────────────────────────────────────────────────────────────
function imOpen(eventId) {
  _imS.evId = eventId;
  var ev = S.events.find(function(e){ return e.id===eventId; });
  if (!ev) return;
  _imS.tId    = ev.tournamentId;
  _imS.evDate = ev.date || null;

  var loc = S.locations.find(function(l){ return l.id===ev.locationId; });
  var consolidatedUrl = prBuildConsolidatedUrl(_imS.evDate);
  var eventUrl = prBuildEventUrl(ev);

  if (!_imModal) {
    _imModal = document.createElement('div');
    _imModal.className = 'im-overlay';
    _imModal.innerHTML =
      '<div class="im-box">'+
        '<div class="im-head">'+
          '<h3 id="im-title">Import from Parkrun</h3>'+
          '<button class="btn btn-sm" onclick="imClose()">&#10005; Close</button>'+
        '</div>'+
        '<div class="im-status" id="im-status"></div>'+
        '<div class="im-body" id="im-body"></div>'+
        '<div class="im-foot">'+
          '<span id="im-count" style="font-size:12px;color:var(--text2);margin-right:auto;"></span>'+
          '<button class="btn" onclick="imClose()">Cancel</button>'+
          '<button class="btn btn-primary" id="im-commit" onclick="imCommit()" disabled>Commit Selected</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(_imModal);
  }

  _imModal.classList.add('open');
  document.getElementById('im-title').textContent =
    'Import \u2014 ' + (loc ? loc.name : 'Event') + ' \u00B7 ' + (ev.date||'');
  document.getElementById('im-status').style.display='none';
  document.getElementById('im-commit').disabled=true;
  document.getElementById('im-count').textContent='';

  // Show both options — user opens whichever page they want
  document.getElementById('im-body').innerHTML =
    '<div class="im-waiting">'+
      '<p style="margin:0 0 .75rem;font-size:14px;color:var(--text);">Choose a source, copy the results, then paste below:</p>'+

      '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem;margin-bottom:.5rem;">'+
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--orange);margin-bottom:.3rem;">Option 1 — Club Report <span style="font-weight:400;color:var(--text3);">(may lag 1–2 hrs)</span></div>'+
        '<div style="font-size:12px;color:var(--text2);margin-bottom:.5rem;">Already filtered to your club. Shows all members across all parkruns that day.</div>'+
        '<a href="'+consolidatedUrl+'" target="_blank" class="btn btn-sm btn-import">Open Club Report ↗</a>'+
      '</div>'+

      '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.75rem;margin-bottom:.75rem;">'+
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);margin-bottom:.3rem;">Option 2 — Event Results <span style="font-weight:400;color:var(--text3);">(live immediately)</span></div>'+
        '<div style="font-size:12px;color:var(--text2);margin-bottom:.5rem;">Type <strong>'+getClubName()+'</strong> in the search box, click the Group chip, then Ctrl+A → Ctrl+C.</div>'+
        (eventUrl ? '<a href="'+eventUrl+'" target="_blank" class="btn btn-sm btn-import">Open Event Results ↗</a>' : '<span class="u-muted-12">No event URL — add location slug to enable</span>')+
      '</div>'+

      '<div style="font-size:13px;color:var(--text2);margin-bottom:.5rem;"><strong>Ctrl+A → Ctrl+C</strong> on whichever page has results, then:</div>'+
      '<button class="btn btn-primary" onclick="imShowPaste()">&#8615; Paste Results</button>'+
    '</div>';
}

function imShowPaste() {
  document.getElementById('im-body').innerHTML =
    '<div class="im-info" style="font-size:13px;color:var(--text);margin-bottom:.75rem;">'+
      'From the club results tab, press <strong>Ctrl+A</strong> then <strong>Ctrl+C</strong>, then paste below:'+
    '</div>'+
    '<textarea id="im-paste" style="width:100%;min-height:120px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);color:var(--text);font-size:12px;padding:.5rem;font-family:\'SF Mono\',monospace;resize:vertical;box-sizing:border-box;" placeholder="Paste here\u2026" autofocus></textarea>'+
    '<button class="btn btn-primary" style="margin-top:10px;" onclick="imReadPaste()">Read Results</button>'+
    '<div class="im-info" style="margin-top:14px;">Or use a <strong>screenshot</strong> of the results: paste it here (Ctrl+V) or choose a file. It is read in your browser and goes straight to the review step.</div>'+
    '<input type="file" accept="image/*" id="im-shot" onchange="imOcrFile(this.files[0])">'+
    '<div id="im-ocr-status" class="im-progress"></div>';
  setTimeout(function(){
    var el=document.getElementById('im-paste');
    if(el) { el.focus(); el.onpaste = imOnPaste; }
  }, 100);
}

// ── Screenshot (OCR) import ──────────────────────────────────────────────────
// Reads a screenshot of the parkrun results table with Tesseract.js (loaded on demand from a CDN),
// then feeds the recognised text through the same parser + review step as pasted text.
var TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

function imOnPaste(e) {
  var items = (e.clipboardData && e.clipboardData.items) || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image/') === 0) { e.preventDefault(); imOcrFile(items[i].getAsFile()); return; }
  }
}

function imLoadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise(function(resolve, reject) {
    var sc = document.createElement('script');
    sc.src = TESSERACT_SRC;
    sc.onload = function() { resolve(window.Tesseract); };
    sc.onerror = function() { reject(new Error('Could not load the OCR library (check your connection).')); };
    document.head.appendChild(sc);
  });
}

function imOcrFile(file) {
  if (!file) return;
  var status = document.getElementById('im-ocr-status');
  function say(msg) { if (status) status.textContent = msg; }
  say('Loading text reader...');
  imLoadTesseract().then(function(T) {
    return T.recognize(file, 'eng', { logger: function(m) {
      if (m.status === 'recognizing text') say('Reading screenshot... ' + Math.round(m.progress * 100) + '%');
    }});
  }).then(function(res) {
    var text = (res && res.data && res.data.text) || '';
    var ta = document.getElementById('im-paste');
    if (ta) ta.value = text;
    if (!prParseText(text).length) { say('No results found in that screenshot. Make sure position, name and time are all visible.'); return; }
    say('');
    imReadPaste();
  }).catch(function(err) { say('Screenshot read failed: ' + (err && err.message ? err.message : err)); });
}

function imReadPaste() {
  var text = (document.getElementById('im-paste')||{}).value || '';
  if (!text.trim()) { showToast('Paste the page text first'); return; }

  // Try parsing as consolidated club HTML table format
  var results = prParseConsolidated(text);

  // If HTML parse found nothing, try plain text line parsing
  if (!results.length) results = prParseText(text);

  if (!results.length) {
    document.getElementById('im-body').innerHTML =
      '<div class="im-warn">No results found in pasted content.<br>'+
      'Make sure you copied the consolidated club report page (not the individual event page).</div>'+
      '<button class="btn u-mt-8" onclick="imOpen(_imS.evId)">Try again</button>';
    return;
  }

  imBuild(results);
}

// Parser for consolidated club report paste (tab-separated) or plain text
function prParseText(text) {
  var results = [], currentLoc = '';
  var lines = text.split('\n').map(function(l){ return l.trimRight(); }).filter(Boolean);

  for (var i=0; i<lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    // Detect location heading: "Macclesfield parkrun" style
    if (trimmed.match(/parkrun$/i) && !trimmed.match(/\d{1,2}:\d{2}/) && trimmed.length < 80) {
      currentLoc = trimmed.replace(/\s*parkrun$/i,'').trim();
      continue;
    }

    // Tab-separated row: pos \t genderPos \t name \t club \t time
    if (line.indexOf('\t') >= 0) {
      var parts = line.split('\t').map(function(p){ return p.trim(); });
      if (parts.length >= 5 && parts[0].match(/^\d+$/) && parts[4].match(/\d+:\d{2}/)) {
        var t = parts[4].replace(/^00:/,'');
        results.push({ pos:parts[0], name:parts[2], club:parts[3], time:t, timeSec:prSec(parts[4]), location:currentLoc });
        continue;
      }
    }

    // Fallback: regex match for "29  Gavin TREVENA  22:14" style
    // A row that is complete on one line (e.g. from a screenshot) must not swallow the next line.
    var rowRe = /^(\d+)\s+([A-Za-zÀ-ɏ][a-zA-ZÀ-ɏ\s'\-\.]+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)(?:\s|$)/;
    var single = trimmed.replace(/\s+/g,' ').match(rowRe);
    var chunk = [trimmed, (lines[i+1]||'').trim(), (lines[i+2]||'').trim()].join(' ').replace(/\s+/g,' ');
    var m = single || chunk.match(/^(\d+)\s+([A-Za-z\u00C0-\u024F][a-zA-Z\u00C0-\u024F\s'\-\.]+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)(?:\s|$)/);
    if (m) {
      var nm = m[2].trim();
      if (nm && nm.toLowerCase() !== 'unknown' && !nm.match(/position|parkrunner/i)) {
        var t2 = m[3].replace(/^00:/,'');
        results.push({ pos:m[1], name:nm, time:t2, timeSec:prSec(m[3]), location:currentLoc, club:'' });
        if (!single) i++;
      }
    }
  }

  // Deduplicate
  var seen = {};
  return results.filter(function(f){
    var k = f.name + f.time;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

// ── Build review UI ──────────────────────────────────────────────────────────
function imBuild(allResults) {
  var tRunners = getTournamentRunners(_imS.tId);
  var evSlug = _imS.evSlug; // e.g. "macclesfield"

  // Filter to just the event's location if we know it
  // The consolidated report shows ALL parkruns — we want to match by event location
  var loc = S.locations.find(function(l){ var ev=S.events.find(function(e){return e.id===_imS.evId;}); return ev && l.id===ev.locationId; });
  var locName = loc ? loc.name.toLowerCase().replace(/\s+parkrun.*/i,'').trim() : '';

  // Split into: ran this event's location vs ran elsewhere
  var atThisEvent = allResults.filter(function(r){
    if (!locName) return true; // can't filter, show all
    return r.location.toLowerCase().replace(/\s+parkrun.*/i,'').trim().includes(locName) ||
           locName.includes(r.location.toLowerCase().replace(/\s+parkrun.*/i,'').trim());
  });
  var atOtherEvents = allResults.filter(function(r){
    if (!locName) return false;
    var rl = r.location.toLowerCase().replace(/\s+parkrun.*/i,'').trim();
    return !rl.includes(locName) && !locName.includes(rl);
  });

  // Use atThisEvent for matching; show atOtherEvents as info
  var workingSet = atThisEvent.length ? atThisEvent : allResults;

  _imS.rows = workingSet.map(function(f){
    var m = prMatch(f.name, tRunners);
    return { prRow:f, runner:m.conf!=='none'?m.runner:null, conf:m.conf,
             checked:m.conf==='strong'&&!!f.timeSec, override:null };
  });

  _imS.newR = _imS.rows.filter(function(r){ return r.conf==='none'; })
    .map(function(r){ return { prName:r.prRow.name, time:r.prRow.time, timeSec:r.prRow.timeSec, pos:r.prRow.pos, location:r.prRow.location, add:false }; });

  var matchedIds = _imS.rows.filter(function(r){ return r.runner||r.override; })
    .map(function(r){ return String(r.override||(r.runner&&r.runner.id)); });
  _imS.absent = tRunners.filter(function(r){ return !matchedIds.includes(String(r.id)); });
  _imS.otherEvents = atOtherEvents;

  imRender();
}

function imRender() {
  var tRunners = getTournamentRunners(_imS.tId);
  var html = '';
  var loc = S.locations.find(function(l){ var ev=S.events.find(function(e){return e.id===_imS.evId;}); return ev && l.id===ev.locationId; });

  // Summary
  var total = _imS.rows.length + (_imS.otherEvents||[]).length;
  html += '<div class="im-info">';
  html += '<strong>' + total + '</strong> club member(s) ran on ' + (_imS.evDate||'this date') + ' across all parkruns.';
  if (_imS.otherEvents && _imS.otherEvents.length) {
    html += ' <strong>' + _imS.rows.length + '</strong> at ' + (loc?loc.name:'this event') + ', <strong>' + _imS.otherEvents.length + '</strong> at other locations.';
  }
  html += '</div>';

  // Matched runners at this event
  var matched = _imS.rows.filter(function(r){ return r.conf!=='none'; });
  if (matched.length) {
    html += '<div class="im-sec">At ' + (loc?loc.name:'This Event') + ' \u2014 Matched (' + matched.length + ')</div>';
    html += '<div class="im-hdr"><span></span><span>Parkrun Name \u2192 Tournament Runner</span><span>Time</span><span>Pos</span></div>';
    _imS.rows.forEach(function(item,i){
      if (item.conf==='none') return;
      var cl='im-'+item.conf, lb=item.conf==='strong'?'\u2713 Strong match':'~ Weak \u2014 confirm:';
      var opts='<option value="">-- reassign --</option>'+tRunners.map(function(r){
        var sel=(item.override?item.override===r.id:item.runner&&item.runner.id===r.id)?' selected':'';
        return '<option value="'+r.id+'"'+sel+'>'+r.name+'</option>';
      }).join('');
      html += '<div class="im-row">'+
        '<input type="checkbox" class="im-chk" id="imc-'+i+'" '+(item.checked?'checked':'')+' onchange="imToggle('+i+',this.checked)">'+
        '<div><div class="im-prname">'+item.prRow.name+'</div>'+
          '<div class="im-match '+cl+'">'+lb+'</div>'+
          '<select class="im-sel" onchange="imOverride('+i+',this.value)">'+opts+'</select></div>'+
        '<div class="im-time">'+(item.prRow.time||'--')+'</div>'+
        '<div class="im-pos">#'+(item.prRow.pos||'?')+'</div></div>';
    });
  }

  // Unrecognised at this event
  if (_imS.newR.length) {
    html += '<div class="im-sec">Not in Tournament \u2014 Suggest Adding (' + _imS.newR.length + ')</div>';
    html += '<div class="im-info">Found under your club but not in the tournament roster.</div>';
    _imS.newR.forEach(function(nr,i){
      html += '<div class="im-new-row">'+
        '<div style="display:flex;align-items:start;gap:10px;">'+
          '<input type="checkbox" class="im-chk" id="imnew-'+i+'" onchange="imToggleNew('+i+',this.checked)" style="margin-top:3px;">'+
          '<div><div class="im-prname">'+nr.prName+'</div>'+
            '<div class="im-sublabel">Pos #'+nr.pos+' \u00B7 Not in roster</div></div></div>'+
        '<div class="im-time">'+nr.time+'</div></div>';
    });
  }

  // Members who ran OTHER parkruns this week (info only)
  if (_imS.otherEvents && _imS.otherEvents.length) {
    html += '<div class="im-sec">Ran Elsewhere This Week (' + _imS.otherEvents.length + ') \u2014 Info Only</div>';
    _imS.otherEvents.forEach(function(r){
      var m = prMatch(r.name, getTournamentRunners(_imS.tId));
      var runnerName = m.conf!=='none' ? m.runner.name : r.name;
      html += '<div class="im-absent">'+runnerName+' \u2014 <span class="im-loc-badge">'+r.location+'</span> \u2014 <span style="color:var(--orange);font-family:monospace;">'+r.time+'</span></div>';
    });
  }

  // Absent from results entirely
  if (_imS.absent.length) {
    html += '<div class="im-sec">Not Found in Results (' + _imS.absent.length + ')</div>';
    _imS.absent.forEach(function(r){
      var existing = S.results[_imS.evId] && S.results[_imS.evId][r.id];
      var note = existing && existing.actualSec ? ' <span style="color:var(--green);font-size:11px;">(already: '+sTime(existing.actualSec)+')</span>' : '';
      html += '<div class="im-absent">'+r.name+note+'</div>';
    });
  }

  document.getElementById('im-body').innerHTML = html;
  imUpdateCount();
}

function imToggle(i,v){_imS.rows[i].checked=v;imUpdateCount();}
function imOverride(i,rId){
  _imS.rows[i].override=rId||null;_imS.rows[i].checked=!!rId;
  document.getElementById('imc-'+i).checked=!!rId;imUpdateCount();
}
function imToggleNew(i,v){_imS.newR[i].add=v;imUpdateCount();}
function imUpdateCount(){
  var n=_imS.rows.filter(function(r){return r.checked;}).length;
  var nN=_imS.newR.filter(function(r){return r.add;}).length;
  var t=n+nN;
  document.getElementById('im-count').textContent=t+' result'+(t!==1?'s':'')+' to commit'+(nN?' (inc. '+nN+' new)'  :'');
  document.getElementById('im-commit').disabled=t===0;
}
function imClose(){
  clearInterval(_imPollTimer);
  if(_imModal) _imModal.classList.remove('open');
}

function imCommit(){
  var evId=_imS.evId,tId=_imS.tId;
  if(!S.results[evId]) S.results[evId]={};
  var n=0;
  _imS.rows.forEach(function(item){
    if(!item.checked) return;
    var rId=item.override||(item.runner?item.runner.id:null);
    if(!rId||!item.prRow.timeSec) return;
    S.results[evId][rId]=Object.assign(S.results[evId][rId]||{},{
      actualSec:item.prRow.timeSec, attended:true,
      importSource:'parkrun', importedAt:new Date().toISOString()
    });
    n++;
  });
  var newRunnersAdded = [];
  _imS.newR.forEach(function(nr){
    if(!nr.add||!nr.timeSec) return;
    var newId=uid();
    // Use the imported time as initial PB for parkrun
    var pbs = {}; pbs['parkrun'] = nr.timeSec;
    var band = suggestBand ? suggestBand(nr.timeSec) : null;
    S.runners.push({id:newId, name:nr.prName, rid:'', homeSlug:'', pbs:pbs, pbSec:nr.timeSec, band:band});
    // Enrol with their run time as baseline
    enrollRunner(tId, newId, nr.timeSec);
    S.results[evId][newId]={actualSec:nr.timeSec, attended:true, importSource:'parkrun', importedAt:new Date().toISOString()};
    newRunnersAdded.push({id:newId, name:nr.prName, time:nr.time, timeSec:nr.timeSec});
    n++;
  });
  persist();
  imClose();

  if(newRunnersAdded.length) {
    // Show a follow-up modal to set PBs for new runners
    setTimeout(function(){ imShowNewRunnerPbs(newRunnersAdded, tId); }, 300);
    showToast(n+' result'+(n!==1?'s':'')+' committed \u2713 \u2014 set PBs for new runners');
  } else {
    showToast(n+' result'+(n!==1?'s':'')+' committed \u2713');
  }
  if(typeof renderEnterTimes==='function') renderEnterTimes();
  if(typeof renderRunners==='function') renderRunners();
}

function imCloseNewPb(el){ el.closest(".im-overlay").remove(); }

function imShowNewRunnerPbs(newRunners, tId) {
  var types = S.activityTypes || ['parkrun'];
  var modal = document.createElement('div');
  modal.className = 'im-overlay open';
  modal.style.zIndex = '900';

  var rows = newRunners.map(function(nr, i) {
    var pbInputs = types.map(function(type) {
      // Pre-fill parkrun with their imported time
      var preVal = type === 'parkrun' ? nr.time : '';
      return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;">'+
        '<label style="font-size:12px;color:var(--text2);width:70px;">'+type+'</label>'+
        '<input id="newpb-'+i+'-'+type+'" type="text" class="input" style="width:90px;font-family:monospace;" '+
          'placeholder="MM:SS" value="'+preVal+'">'+
      '</div>';
    }).join('');

    return '<div style="border-bottom:1px solid var(--border);padding:.75rem 0;">'+
      '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">'+nr.name+'</div>'+
      '<div style="font-size:12px;color:var(--text3);margin-bottom:6px;">Imported time: <span style="color:var(--orange);font-family:monospace;">'+nr.time+'</span> &mdash; set as parkrun PB baseline</div>'+
      pbInputs+
    '</div>';
  }).join('');

  // Store data globally so onclick can access without inline JSON
  window._imNewRunners = newRunners;
  window._imNewTid = tId;

  modal.innerHTML =
    '<div class="im-box">'+
      '<div class="im-head">'+
        '<h3>Set Baselines for New Runners</h3>'+
        '<button class="btn btn-sm" onclick="imCloseNewPb(this)">&#10005; Skip</button>'+
      '</div>'+
      '<div class="im-body">'+
        '<div class="im-info">These runners were added from Parkrun. Their imported time has been set as their parkrun PB. Adjust if needed &mdash; this becomes their handicap baseline.</div>'+
        rows+
      '</div>'+
      '<div class="im-foot">'+
        '<button class="btn" onclick="imCloseNewPb(this)">Skip</button>'+
        '<button class="btn btn-primary" onclick="imSaveNewPbs(window._imNewRunners, window._imNewTid, this)">Save Baselines</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(modal);
}

function imSaveNewPbs(newRunners, tId, btn) {
  var types = S.activityTypes || ['parkrun'];
  newRunners.forEach(function(nr, i) {
    var runner = S.runners.find(function(r){ return r.id === nr.id; });
    if (!runner) return;
    var bestSec = null;
    types.forEach(function(type) {
      var el = document.getElementById('newpb-'+i+'-'+type);
      if (!el || !el.value.trim()) return;
      var sec = prSec(el.value.trim());
      if (!sec) return;
      runner.pbs[type] = sec;
      if (!bestSec || sec < bestSec) bestSec = sec;
    });
    if (bestSec) {
      runner.pbSec = bestSec;
      runner.band = suggestBand ? suggestBand(bestSec) : null;
      // Update tournament baseline
      enrollRunner(tId, nr.id, bestSec);
    }
  });
  persist();
  if(typeof renderRunners==='function') renderRunners();
  if(typeof renderTournaments==='function') renderTournaments();
  btn.closest('.im-overlay').remove();
  showToast('Baselines saved \u2713');
}

// ── Inject Import button ─────────────────────────────────────────────────────
var _origRET = renderEnterTimes;
renderEnterTimes = function(){
  _origRET();
  imInjectButton();
};
function imInjectButton(){
  var sel=document.getElementById('et-ev-sel');
  if(!sel||!sel.value) return;
  var header=document.querySelector('#tab-enter-times .page-header');
  if(!header||header.querySelector('#im-import-btn')) return;
  var evId=parseInt(sel.value);
  var ev=S.events.find(function(e){return e.id===evId;});
  if(!ev||!isParkrun(ev.tournamentId)) return;
  var btn=document.createElement('button');
  btn.id='im-import-btn';
  btn.className='btn btn-import';
  btn.innerHTML='\u2B07 Import from Parkrun';
  btn.onclick=function(){imOpen(evId);};
  header.appendChild(btn);
}
(function patchSel(){
  var sel=document.getElementById('et-ev-sel');
  if(!sel) return;
  var orig=sel.onchange;
  sel.onchange=function(){
    var old=document.getElementById('im-import-btn');if(old) old.remove();
    if(orig) orig.call(this);
    setTimeout(imInjectButton,60);
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
// END PARKRUN AUTO-IMPORT
// ═══════════════════════════════════════════════════════════════════════════
