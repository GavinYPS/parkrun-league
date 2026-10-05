// Band scoring tables and point calculation

// ── Band scoring ──────────────────────────────────────────────
// New banding system. diff = actual - baseline (negative = faster than PR).
//
// Each band entry has:
//   pts        – points awarded
//   minFaster  – minimum seconds faster than PR (diff <= -minFaster), OR null if this is a "slower" bracket
//   maxSlower  – if set, award these pts when diff is between 0 and maxSlower (slower than PR but within range)
//   minSlower  – lower bound for slower bracket (diff >= minSlower)
//
// Points lookup order: check fastest brackets first (highest pts), then slower brackets.
//
// From the table image:
//  Band A (21:00-22:29):  8pts ≥81s faster | 7pts 60-80s | 6pts 46-59s | 5pts 31-45s | 4pts 21-30s | 2pts 0-20s off PR | 1pt 0-19s faster | 0.5pt 20-45s off PR
//  Band B (22:30-23:59):  8pts ≥85s faster | 7pts 63-84s | 6pts 45-62s | 4pts 31-44s | 3pts 22-30s | 2pts 0-21s off PR | 1pt 0-27s faster | 0.5pt 28-60s off PR
//  Band C (24:00-25:59):  8pts ≥100s faster | 7pts 81-99s | 6pts 72-80s | 5pts 60-71s | 4pts 45-59s | 3pts 30-44s | 2pts 0-29s off PR | 1pt 0-29s faster | 0.5pt 30-70s off PR
//  Band D (26:00-28:29):  8pts ≥121s faster | 7pts 101-120s | 6pts 86-100s | 5pts 76-85s | 4pts 61-75s | 3pts 40-60s | 2pts 0-39s off PR | 1pt 0-40s faster | 0.5pt 40-60s off PR
//  Band E (28:30-31:59):  8pts ≥151s faster | 7pts 131-150s | 6pts 100-130s | 5pts 86-99s | 4pts 66-85s | 3pts 46-65s | 2pts 0-45s off PR | 1pt 0-50s faster | 0.5pt 51-70s off PR
//  Band F (32:00-34:59):  8pts ≥191s faster | 7pts 130-190s | 6pts 111-129s | 5pts 90-110s | 4pts 75-89s | 3pts 61-74s | 2pts 0-60s off PR | 1pt 0-60s faster | 0.5pt 61-80s off PR
//  Band G (35:00-41:00):  8pts ≥231s faster | 7pts 180-230s | 6pts 161-179s | 5pts 151-160s | 4pts 120-150s | 3pts 80-119s | 2pts 0-79s off PR | 1pt 0-70s faster | 0.5pt 71-90s off PR
//
// Each entry: {pts, minFaster} for "faster than PR" brackets
//             {pts, maxSlower, minSlower} for "slower than PR" brackets (minSlower optional, defaults to 0)

var DEFAULT_BAND_TABLE = {
  A: [
    {pts:0.5, slowerFrom:20, slowerTo:45},
    {pts:1,   slowerFrom:0,  slowerTo:19},
    {pts:2,   minFaster:0,   maxFaster:20},
    {pts:4,   minFaster:21,  maxFaster:30},
    {pts:5,   minFaster:31,  maxFaster:45},
    {pts:6,   minFaster:46,  maxFaster:59},
    {pts:7,   minFaster:60,  maxFaster:80},
    {pts:8,   minFaster:81,  maxFaster:null}
  ],
  B: [
    {pts:0.5, slowerFrom:28, slowerTo:60},
    {pts:1,   slowerFrom:0,  slowerTo:27},
    {pts:2,   minFaster:0,   maxFaster:21},
    {pts:3,   minFaster:22,  maxFaster:30},
    {pts:4,   minFaster:31,  maxFaster:44},
    {pts:6,   minFaster:45,  maxFaster:62},
    {pts:7,   minFaster:63,  maxFaster:84},
    {pts:8,   minFaster:85,  maxFaster:null}
  ],
  C: [
    {pts:0.5, slowerFrom:30, slowerTo:70},
    {pts:1,   slowerFrom:0,  slowerTo:29},
    {pts:2,   minFaster:0,   maxFaster:29},
    {pts:3,   minFaster:30,  maxFaster:44},
    {pts:4,   minFaster:45,  maxFaster:59},
    {pts:5,   minFaster:60,  maxFaster:71},
    {pts:6,   minFaster:72,  maxFaster:80},
    {pts:7,   minFaster:81,  maxFaster:99},
    {pts:8,   minFaster:100, maxFaster:null}
  ],
  D: [
    {pts:0.5, slowerFrom:40, slowerTo:60},
    {pts:1,   slowerFrom:0,  slowerTo:39},
    {pts:2,   minFaster:0,   maxFaster:39},
    {pts:3,   minFaster:40,  maxFaster:60},
    {pts:4,   minFaster:61,  maxFaster:75},
    {pts:5,   minFaster:76,  maxFaster:85},
    {pts:6,   minFaster:86,  maxFaster:100},
    {pts:7,   minFaster:101, maxFaster:120},
    {pts:8,   minFaster:121, maxFaster:null}
  ],
  E: [
    {pts:0.5, slowerFrom:51, slowerTo:70},
    {pts:1,   slowerFrom:0,  slowerTo:50},
    {pts:2,   minFaster:0,   maxFaster:45},
    {pts:3,   minFaster:46,  maxFaster:65},
    {pts:4,   minFaster:66,  maxFaster:85},
    {pts:5,   minFaster:86,  maxFaster:99},
    {pts:6,   minFaster:100, maxFaster:130},
    {pts:7,   minFaster:131, maxFaster:150},
    {pts:8,   minFaster:151, maxFaster:null}
  ],
  F: [
    {pts:0.5, slowerFrom:61, slowerTo:80},
    {pts:1,   slowerFrom:0,  slowerTo:60},
    {pts:2,   minFaster:0,   maxFaster:60},
    {pts:3,   minFaster:61,  maxFaster:74},
    {pts:4,   minFaster:75,  maxFaster:89},
    {pts:5,   minFaster:90,  maxFaster:110},
    {pts:6,   minFaster:111, maxFaster:129},
    {pts:7,   minFaster:130, maxFaster:190},
    {pts:8,   minFaster:191, maxFaster:null}
  ],
  G: [
    {pts:0.5, slowerFrom:71, slowerTo:90},
    {pts:1,   slowerFrom:0,  slowerTo:70},
    {pts:2,   minFaster:0,   maxFaster:79},
    {pts:3,   minFaster:80,  maxFaster:119},
    {pts:4,   minFaster:120, maxFaster:150},
    {pts:5,   minFaster:151, maxFaster:160},
    {pts:6,   minFaster:161, maxFaster:179},
    {pts:7,   minFaster:180, maxFaster:230},
    {pts:8,   minFaster:231, maxFaster:null}
  ]
};

var BAND_LABELS = ['A','B','C','D','E','F','G'];
var BAND_TIME_RANGES = {A:'21:00-22:29',B:'22:30-23:59',C:'24:00-25:59',D:'26:00-28:29',E:'28:30-31:59',F:'32:00-34:59',G:'35:00-41:00'};
// seconds boundaries for each band [minSec, maxSec]
var BAND_SEC_RANGES = {A:[1260,1349],B:[1350,1439],C:[1440,1559],D:[1560,1709],E:[1710,1919],F:[1920,2099],G:[2100,2460]};

function suggestBand(sec) {
  if (sec == null) return null;
  for (var i = 0; i < BAND_LABELS.length; i++) {
    var b = BAND_LABELS[i]; var r = BAND_SEC_RANGES[b];
    if (sec >= r[0] && sec <= r[1]) return b;
  }
  return null;
}

function getBandTable(settings) {
  return (settings && settings.bandTable) ? settings.bandTable : JSON.parse(JSON.stringify(DEFAULT_BAND_TABLE));
}

function getBandPtsForRunner(diffSecs, band, settings) {
  // diffSecs = actual - baseline; negative = faster, positive = slower, 0 = matched
  var table = getBandTable(settings);
  var brackets = table[band];
  if (!brackets || !brackets.length) return {pts:0, label:'No band set'};
  if (diffSecs > 0) {
    // Slower than baseline
    var slower = diffSecs;
    var match = brackets.filter(function(b){ return b.slowerFrom != null; })
      .sort(function(a,b){ return b.pts - a.pts; })
      .find(function(b){ return slower >= b.slowerFrom && slower <= b.slowerTo; });
    if (match) return {pts: match.pts, label: match.pts + ' pts (' + slower + 's off baseline)'};
    return {pts:0, label:'Outside range'};
  } else {
    // Faster than or equal to baseline (diffSecs <= 0)
    var faster = -diffSecs; // 0 or positive
    var best = brackets.filter(function(b){
      return b.minFaster != null && faster >= b.minFaster && (b.maxFaster == null || faster <= b.maxFaster);
    }).sort(function(a,b){ return b.pts - a.pts; })[0];
    if (best) return {pts: best.pts, label: best.pts + ' pts (' + (faster === 0 ? 'matched baseline' : faster + 's faster') + ')'};
    return {pts:0, label:'No improvement'};
  }
}

function getBonus(runs, settings) {
  var s = settings || defaultTournamentSettings();
  var tiers = s.bonusTiers.slice().sort(function(a,b) { return b.minRuns - a.minRuns; });
  for (var i = 0; i < tiers.length; i++) { if (runs >= tiers[i].minRuns) return tiers[i].points; }
  return 0;
}

function isAttended(rd) {
  if (!rd) return false;
  if (rd.attended === true) return true;
  if (rd.absent === true) return false;
  if (rd.actualSec != null) return true;
  return false;
}
