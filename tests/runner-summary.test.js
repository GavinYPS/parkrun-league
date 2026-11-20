const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

// The modal opened from a leaderboard row lists each of the runner's times with its points.
test('showRunnerSummary lists the runner\'s times and band points per event', () => {
  const app = loadApp();
  const els = { 'runner-modal-title': { textContent: '' }, 'runner-modal-body': { innerHTML: '' }, 'runner-modal': { classList: { add() { this.on = true; } } }, 'lb-tournament-sel': { value: '1' } };
  app.document.getElementById = id => els[id] || null;
  app.S.tournaments = [{ id: 1, name: 'T1', type: 'parkrun' }];
  app.S.runners = [{ id: 7, name: 'Sam', band: 'C' }];
  app.S.events = [
    { id: 11, tournamentId: 1, locationName: 'Mac', runNumber: 5, date: '2020-01-04' },
    { id: 12, tournamentId: 1, locationName: 'Mac', runNumber: 6, date: '2020-01-11', wildcard: true }];
  app.S.results = { 11: { 7: { actualSec: 1500, baselinePbSec: 1560 } }, 12: { 7: { attended: true } } };
  app.showRunnerSummary(7);
  assert.match(els['runner-modal-title'].textContent, /Sam/);
  assert.match(els['runner-modal-body'].innerHTML, /25:00/);
  assert.match(els['runner-modal-body'].innerHTML, /Wildcard/);
  assert.match(els['runner-modal-body'].innerHTML, /Baseline 26:00/);
  assert.ok(els['runner-modal'].classList.on);
});
