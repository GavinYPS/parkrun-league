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
