// Guards backwards compatibility: the live data.json must keep loading and merging cleanly.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, ROOT } = require('./load');

const raw = fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8');
const data = JSON.parse(raw);

test('data.json loads into state without losing runners/tournaments/events', () => {
  const app = loadApp({ parkrun_league_v3: raw });
  assert.strictEqual(app.S.runners.length, data.runners.length);
  assert.strictEqual(app.S.tournaments.length, data.tournaments.length);
  assert.strictEqual(app.S.events.length, data.events.length);
  app.S.tournaments.forEach(t => assert.ok(t.settings, 'tournament ' + t.name + ' has settings'));
});

test('old saves missing newer fields get defaults', () => {
  const app = loadApp({ parkrun_league_v3: JSON.stringify({ runners: [{ id: 1, name: 'A' }] }) });
  assert.deepStrictEqual(Array.from(app.S.tournaments), []);
  assert.ok(app.S.results && app.S.tournamentRunners && app.S.activityTypes.length > 0);
});

test('corrupt saved state falls back to empty defaults', () => {
  const app = loadApp({ parkrun_league_v3: '{not json' });
  assert.strictEqual(app.S.runners.length, 0);
});

test('every stored result scores without throwing', () => {
  const app = loadApp({ parkrun_league_v3: raw });
  let n = 0;
  app.S.events.forEach(ev => {
    const ts = app.getTournamentSettings(ev.tournamentId);
    const res = app.S.results[ev.id] || {};
    app.S.runners.forEach(r => {
      const rd = res[r.id];
      if (!app.isAttended(rd) || rd.actualSec == null) return;
      const base = app.getTournamentBaselinePb(r.id, ev.tournamentId) || r.pbSec;
      if (base == null) return;
      const out = app.getBandPtsForRunner(rd.actualSec - base, r.band || app.suggestBand(base), ts);
      assert.ok(typeof out.pts === 'number' && isFinite(out.pts));
      n++;
    });
  });
  assert.ok(n > 0, 'expected at least one scored result');
});

test('ghMerge: local records and results win, remote-only records are kept', () => {
  const app = loadApp();
  const remote = { runners: [{ id: 1, name: 'Remote' }, { id: 2, name: 'RemoteOnly' }], tournaments: [], locations: [], events: [], results: { e1: { 1: { actualSec: 1300 }, 2: { actualSec: 1400 } } } };
  const local = { runners: [{ id: 1, name: 'Local' }], tournaments: [], locations: [], events: [], results: { e1: { 1: { actualSec: 1250 } } } };
  const m = app.ghMerge(local, remote);
  assert.strictEqual(m.runners.find(r => r.id === 1).name, 'Local');
  assert.ok(m.runners.find(r => r.id === 2));
  assert.strictEqual(m.results.e1[1].actualSec, 1250);
  assert.strictEqual(m.results.e1[2].actualSec, 1400);
});

test('id lookup helpers use strict id matching', () => {
  const app = loadApp({ parkrun_league_v3: raw });
  const r = app.S.runners[0], t = app.S.tournaments[0];
  assert.strictEqual(app.getRunner(r.id), r);
  assert.strictEqual(app.getTournament(t.id), t);
  assert.strictEqual(app.getRunner(String(r.id)), undefined);
  assert.strictEqual(app.getEvent(-1), undefined);
});
