// Time/date formatting and misc helpers

function uid() { return Date.now() + Math.floor(Math.random() * 9999); }
function tog(id) { var el = document.getElementById(id); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
function tSec(t) { if (!t) return null; var p = t.split(':').map(Number); if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2]; if (p.length === 2) return p[0]*60 + p[1]; return null; }
function sTime(s) { if (s == null || isNaN(s)) return '--'; return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }
function sHMS(s) { if (s == null) return ''; var h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60; return [h,m,sec].map(function(v) { return String(v).padStart(2,'0'); }).join(':'); }
function dStr(d) { if (d == null) return '--'; var a = Math.abs(d), m = Math.floor(a/60), s = a%60; return (d < 0 ? '-' : '+') + (m > 0 ? m + 'm ' : '') + s + 's'; }
function fmtDate(ds) { if (!ds) return ''; return new Date(ds + 'T00:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
function slugFromUrl(url) { var m = url.match(/parkrun\.org\.uk\/([a-z0-9-]+)\//i); return m ? m[1].toLowerCase() : null; }
function getClubName() { return S.clubName || 'Rundamentalist Run Club'; }
function eu(u) { return u && !u.match(/^https?:\/\//) ? 'https://' + u : u; }
