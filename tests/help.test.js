const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

const app = loadApp();
const settings = app.defaultTournamentSettings();   // attendance +2, volunteer +1, wildcard +2, 3 runs +3, 7 runs +4
const total = parts => parts.reduce((s, p) => s + p.pts, 0);

test('season parts add up like the leaderboard (speed + attendance + volunteer + wildcard + run-count bonus)', () => {
  // 4 runs at 3 speed pts: 12 + 8 attendance + 1 volunteer + 2 wildcard + 3 run-count = 26
  assert.strictEqual(total(app.helpSeasonParts(4, 3, 1, true, settings)), 26);
  // 7 runs reaches the top tier (+4), not +3 and +4 together
  assert.strictEqual(app.helpSeasonParts(7, 0, 0, false, settings).find(p => p.label === 'Run-count bonus').pts, 4);
  assert.strictEqual(app.helpSeasonParts(2, 0, 0, false, settings).find(p => p.label === 'Run-count bonus').pts, 0);
});

test('help axis is wide enough to show every tier of a custom band table', () => {
  const table = JSON.parse(JSON.stringify(app.DEFAULT_BAND_TABLE));
  const base = app.helpAxis(table);
  table.G.find(b => b.pts === 7).maxFaster = 400;   // a tier far beyond the defaults
  const wide = app.helpAxis(table);
  assert.ok(wide.hi > base.hi && wide.hi >= 400);
  assert.ok(base.lo <= -(90 + 15));                  // widest default slower tier is 90s
});
