const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

const app = loadApp();
const pts = (diff, band) => app.getBandPtsForRunner(diff, band).pts;

test('band suggestion follows the time ranges', () => {
  assert.strictEqual(app.suggestBand(1260), 'A');
  assert.strictEqual(app.suggestBand(1349), 'A');
  assert.strictEqual(app.suggestBand(1350), 'B');
  assert.strictEqual(app.suggestBand(2460), 'G');
  assert.strictEqual(app.suggestBand(1200), null);
  assert.strictEqual(app.suggestBand(null), null);
});

test('band A points: faster brackets and slower brackets', () => {
  assert.strictEqual(pts(-100, 'A'), 8);   // >= 81s faster
  assert.strictEqual(pts(-60, 'A'), 7);
  assert.strictEqual(pts(0, 'A'), 2);      // matched baseline
  assert.strictEqual(pts(10, 'A'), 1);     // 10s slower
  assert.strictEqual(pts(30, 'A'), 0.5);   // 30s slower
  assert.strictEqual(pts(500, 'A'), 0);    // far outside range
});

test('band A bracket edges are exact', () => {
  assert.strictEqual(pts(-81, 'A'), 8);
  assert.strictEqual(pts(-80, 'A'), 7);
  assert.strictEqual(pts(-60, 'A'), 7);
  assert.strictEqual(pts(-59, 'A'), 6);
  assert.strictEqual(pts(19, 'A'), 1);
  assert.strictEqual(pts(20, 'A'), 0.5);
  assert.strictEqual(pts(46, 'A'), 0);
});

test('unknown band scores zero with a label', () => {
  const r = app.getBandPtsForRunner(-10, 'Z');
  assert.strictEqual(r.pts, 0);
  assert.strictEqual(r.label, 'No band set');
});

test('custom band table in tournament settings overrides the default', () => {
  const settings = { bandTable: { A: [{ pts: 9, minFaster: 0, maxFaster: null }] } };
  assert.strictEqual(app.getBandPtsForRunner(-5, 'A', settings).pts, 9);
});

test('attendance bonus tiers pick the highest qualifying tier', () => {
  const s = { bonusTiers: [{ minRuns: 3, points: 3 }, { minRuns: 7, points: 4 }] };
  assert.strictEqual(app.getBonus(7, s), 4);
  assert.strictEqual(app.getBonus(5, s), 3);
  assert.strictEqual(app.getBonus(2, s), 0);
});

test('isAttended: explicit flags beat a recorded time', () => {
  assert.strictEqual(app.isAttended(null), false);
  assert.strictEqual(app.isAttended({ attended: true }), true);
  assert.strictEqual(app.isAttended({ absent: true, actualSec: 1300 }), false);
  assert.strictEqual(app.isAttended({ actualSec: 1300 }), true);
  assert.strictEqual(app.isAttended({}), false);
});

test('time helpers round-trip', () => {
  assert.strictEqual(app.tSec('21:05'), 1265);
  assert.strictEqual(app.tSec('1:02:03'), 3723);
  assert.strictEqual(app.tSec(''), null);
  assert.strictEqual(app.sTime(1265), '21:05');
  assert.strictEqual(app.sTime(null), '--');
  assert.strictEqual(app.sHMS(3723), '01:02:03');
  assert.strictEqual(app.dStr(-75), '-1m 15s');
  assert.strictEqual(app.dStr(20), '+20s');
});
