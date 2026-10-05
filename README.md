# Parkrun League

Static tournament tracker for the Rundamentalist Run Club. No build step: served directly by GitHub Pages.

## Project structure

```
index.html          Markup only; loads css/ and js/
css/styles.css      All styles (design tokens in :root)
js/                 Classic scripts sharing one global scope (inline onclick handlers need globals)
data.json           Synced league data (read via raw.githubusercontent.com)
rundamentalist/     Separate club marketing page
```

### js/ (loaded in this order)

| File | Responsibility |
|---|---|
| config.js | Constants and storage keys |
| bands.js | Band scoring tables, point calculation |
| state.js | Default state, localStorage load, `persist()` |
| auth.js | Settings login, nav, tab switching |
| logo.js | Club logo |
| github-sync.js | GitHub data.json merge/push/pull |
| ui.js, utils.js | Modal/toast; formatting helpers |
| tournament-data.js | Enrolment, baselines, tournament accessors |
| runners.js | Club Runners page |
| tournaments.js, locations.js, events.js | Tournaments page |
| tournament-settings.js, tournament-runners.js | Per-tournament panels |
| enter-times.js | Enter Times page |
| leaderboard.js | Leaderboard page |
| global-settings.js | Global settings, activity types |
| export.js | CSV export |
| import.js | parkrun auto-import |
| app.js | Startup wiring and initial render (**must load last**) |

Add a new feature as a new `js/<feature>.js` with a `<script>` tag before `app.js`.

## Tests
`npm test` runs Node's built-in test runner (no dependencies) against the real scripts, including a check that `data.json` still loads and scores. `npm run check` syntax-checks `js/`.

## Local dev
`python -m http.server 8765` then open http://localhost:8765. Syntax check: `for f in js/*.js; do node --check "$f"; done`.
