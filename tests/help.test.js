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
  assert.strictEqual(app.helpSeasonParts(7, 0, 0, false, settings).find(p => p.label === 'Attendance Bonus Tiers').pts, 4);
  assert.strictEqual(app.helpSeasonParts(2, 0, 0, false, settings).find(p => p.label === 'Attendance Bonus Tiers').pts, 0);
});

test('help axis is wide enough to show every tier of a custom band table', () => {
  const table = JSON.parse(JSON.stringify(app.DEFAULT_BAND_TABLE));
  const base = app.helpAxis(table);
  table.G.find(b => b.pts === 7).maxFaster = 400;   // a tier far beyond the defaults
  const wide = app.helpAxis(table);
  assert.ok(wide.hi > base.hi && wide.hi >= 400);
  assert.ok(base.lo <= -(90 + 15));                  // widest default slower tier is 90s
});

test('"what do I need" lists each tier with the finishing time it needs (Band C, 24:30 baseline)', () => {
  const rows = app.helpNeed(1470, 'C', app.DEFAULT_BAND_TABLE);
  const row = pts => rows.find(r => r.pts === pts);
  assert.deepStrictEqual([rows[0].pts, rows[0].from, rows[0].to], [8, null, 1370]);   // 100s+ faster: 22:50 or quicker
  assert.deepStrictEqual([row(7).from, row(7).to], [1371, 1389]);                    // 81-99s faster: 22:51-23:09
  assert.deepStrictEqual([row(2).from, row(2).to], [1441, 1470]);                    // 0-29s faster
  assert.deepStrictEqual([row(1).from, row(1).to], [1471, 1499]);                    // 1-29s slower (0 means level, which is the 2pt tier)
  assert.strictEqual(rows[rows.length - 1].pts, 0.5);
  assert.strictEqual(rows.length, app.DEFAULT_BAND_TABLE.C.length);                    // every tier is listed
});

test('band example baseline falls inside its own band', () => {
  app.BAND_LABELS.forEach(b => assert.strictEqual(app.suggestBand(app.helpBandExample(b)), b));
});
