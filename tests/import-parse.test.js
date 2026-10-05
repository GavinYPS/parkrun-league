const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('./load');

const app = loadApp();

test('one-line rows (OCR/screenshot text) are all parsed, none skipped', () => {
  const text = ['Finishers', '', '©', '36 Gavin TREVENA 22:53', '', '75 Michelle CARTER 25:25',
    '88 Helen POINTON 26:09', '109 Amy MAHON 27:01', '270 Rebecca BETTISON 45:09'].join('\n');
  const r = app.prParseText(text);
  assert.deepStrictEqual(Array.from(r, x => x.pos), ['36', '75', '88', '109', '270']);
  assert.strictEqual(r[0].name, 'Gavin TREVENA');
  assert.strictEqual(r[0].time, '22:53');
  assert.strictEqual(r[4].timeSec, 2709);
});

test('multi-line rows (pos / name / time on separate lines) still parse', () => {
  const r = app.prParseText('36\nGavin TREVENA\n22:53\n75\nMichelle CARTER\n25:25');
  assert.deepStrictEqual(Array.from(r, x => x.name), ['Gavin TREVENA', 'Michelle CARTER']);
});
