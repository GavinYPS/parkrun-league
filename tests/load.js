// Loads the browser scripts into an isolated vm context with minimal stubs, in the same order as index.html.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PURE_FILES = ['config', 'bands', 'state', 'utils', 'tournament-data', 'github-sync', 'import'];

function memoryStorage(initial) {
  const m = Object.assign({}, initial);
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
  };
}

// local: object to preload into localStorage (e.g. {parkrun_league_v3: '<json>'})
function loadApp(local) {
  const ctx = vm.createContext({
    localStorage: memoryStorage(local),
    sessionStorage: memoryStorage(),
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { appendChild() {} } },
    renderEnterTimes() {},  // import.js wraps this at load
    console,
  });
  PURE_FILES.forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  });
  return ctx;
}

module.exports = { loadApp, ROOT };
