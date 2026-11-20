const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

// Minimal stand-ins for the Club Details card: the view panel, the edit panel and the Edit button.
function clubCard(app) {
  const el = () => ({ style: {}, textContent: 'Edit', focus() {} });
  const els = { 'club-view-state': el(), 'club-edit-state': el(), 'club-edit-btn': el(), 'setting-club-name': el() };
  app.document.getElementById = id => els[id] || null;
  return els;
}

// Pressing Edit calls toggleClubEdit() with no argument. The test of "am I editing?" was inverted,
// so from the view state it chose the view state again and the button did nothing.
test('Edit button (no argument) switches Club Details into edit mode and Cancel switches back', () => {
  const app = loadApp(), els = clubCard(app);
  app.toggleClubEdit(false);                       // how the page renders
  assert.strictEqual(els['club-view-state'].style.display, 'block');
  app.toggleClubEdit();                            // the Edit button
  assert.strictEqual(els['club-edit-state'].style.display, 'block');
  assert.strictEqual(els['club-view-state'].style.display, 'none');
  assert.strictEqual(els['club-edit-btn'].style.display, 'none');
  app.toggleClubEdit(false);                       // Cancel / after Save
  assert.strictEqual(els['club-view-state'].style.display, 'block');
  assert.strictEqual(els['club-edit-state'].style.display, 'none');
});
