const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

function appWithTournament() {
  const app = loadApp();
  app.S.tournaments.push({ id: 1778105189351, name: 'T', settings: app.defaultTournamentSettings() });
  return app;
}
const A = app => app.S.tournaments[0].settings.bandTable.A;

// The inline onchange handlers pass the tournament id as a quoted string; a strict
// id comparison used to make every band edit a silent no-op.
test('band edit from the settings panel applies (tournament id arrives as a string)', () => {
  const app = appWithTournament();
  app.btSetFaster('1778105189351', 'A', 4, 'to', '25');
  assert.strictEqual(A(app).find(b => b.pts === 4).maxFaster, 25);
  app.btSetSlower('1778105189351', 'A', 0.5, 'to', '50');
  assert.strictEqual(A(app).find(b => b.pts === 0.5).slowerTo, 50);
});

test('band caption spells out the stored ranges', () => {
  const app = loadApp();
  const cap = app.bandCaptionHtml(app.DEFAULT_BAND_TABLE.A, 'A');
  assert.ok(cap.includes('81s+ faster'));
  assert.ok(cap.includes('21–30s faster'));
  assert.ok(cap.includes('20–45s slower'));
  assert.ok(cap.includes('otherwise 0'));
});

// Every faster time from 0s up to the top tier must land in exactly one tier (no gaps, no overlaps).
function fasterCoverage(app, band) {
  const tiers = A(app).filter(b => b.minFaster != null);
  const out = [];
  for (let s = 0; s <= 400; s++) {
    out.push(tiers.filter(b => s >= b.minFaster && (b.maxFaster == null || s <= b.maxFaster)).length);
  }
  return out;
}
const edit = (app, pts, v) => app.btSetFaster('1778105189351', 'A', pts, 'to', v);
const t5 = app => A(app).find(b => b.pts === 5);

test('lowering a tier limit pulls the next tier start down (no gap)', () => {
  const app = appWithTournament();
  edit(app, 4, '25');
  assert.strictEqual(t5(app).minFaster, 26);
  assert.ok(fasterCoverage(app, 'A').every(n => n === 1));
});

test('raising a tier limit pushes the next tier start up (no overlap), cascading if it swallows a tier', () => {
  const app = appWithTournament();
  edit(app, 4, '35');
  assert.strictEqual(t5(app).minFaster, 36);
  assert.ok(fasterCoverage(app, 'A').every(n => n === 1));
  edit(app, 4, '70');   // beyond the 5pt and 6pt limits
  assert.ok(fasterCoverage(app, 'A').every(n => n === 1));
  assert.strictEqual(app.getBandPtsForRunner(-72, 'A', app.S.tournaments[0].settings).pts >= 6, true);
});

test('blanking a middle tier removes it and neighbours cover the range; blanking the top tier keeps it open-ended', () => {
  const app = appWithTournament();
  edit(app, 4, '');
  assert.strictEqual(A(app).some(b => b.pts === 4), false);
  assert.strictEqual(t5(app).minFaster, 21);
  assert.ok(fasterCoverage(app, 'A').every(n => n === 1));
  edit(app, 8, '');
  assert.strictEqual(A(app).find(b => b.pts === 8).maxFaster, null);
});

test('adding a tier in a blank box slots it in between its neighbours', () => {
  const app = appWithTournament();
  edit(app, 3, '25');   // Band A has no 3pt tier by default; 2pt is 0-20, 4pt is 21-30
  const t3 = A(app).find(b => b.pts === 3);
  assert.strictEqual(t3.minFaster, 21);
  assert.strictEqual(A(app).find(b => b.pts === 4).minFaster, 26);
  assert.ok(fasterCoverage(app, 'A').every(n => n === 1));
});

test('editing the 1pt slower limit moves the start of the 0.5pt tier', () => {
  const app = appWithTournament();
  app.btSetSlower('1778105189351', 'A', 1, 'to', '15');
  const half = A(app).find(b => b.pts === 0.5);
  assert.strictEqual(half.slowerFrom, 16);
  const s = app.S.tournaments[0].settings;
  for (let d = 1; d <= 45; d++) assert.ok(app.getBandPtsForRunner(d, 'A', s).pts > 0, d + 's slower');
});
