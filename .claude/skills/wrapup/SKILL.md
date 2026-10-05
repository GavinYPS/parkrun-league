---
name: wrapup
description: End-of-task quality and verification pass for parkrun-league changes. Use when finishing a coding task, preparing changes for commit, or whenever asked to "wrap up", "review what we did", or "quality check this".
---

# Wrapup — End-of-Task Quality Pass for parkrun-league

Adapted from the Acto wrapup skill. parkrun-league is a no-build static site (GitHub Pages): `index.html` + `css/styles.css` + classic scripts in `js/`. There is no test suite or typechecker, so verification is syntax checks plus a browser smoke test.

Work through each step and report findings as you go. Say what you found before changing anything non-trivial.

## 1. Scope the diff
`git status` / `git diff`. Confirm every change is relevant; look for stray `console.log`, scratch files, accidental edits. Keep the review scoped to these changes.

## 2. Correctness
Review as if it were someone else's PR:
- Empty state (no runners/tournaments/events), missing `S.results[evId]`, null PBs/baselines, failed `fetch`/GitHub calls.
- State consistency: anything mutating `S` must call `persist()` (localStorage) and re-render the affected view. Data only reaches the shared `data.json` via `ghPush()`; check new mutations don't silently skip that where sibling code pushes (e.g. `saveSettingsInline`), and that `ghMerge`/`_savedAt` handling still works for any new field on `S`.
- Data shape: `S` = `{runners, tournaments, locations, events, results, activityTypes, tournamentRunners}`. New fields need a default in `state.js` (existing saved data and `data.json` won't have them) and must be handled by `ghMerge`.
- Scoring changes (`bands.js`, `getBandPtsForRunner`, `getBonus`): spot-check against the band table comments and a leaderboard with real `data.json` data.
- Pages are the `#tab-*` sections in `index.html` (runners, events, enter-times, leaderboard, settings), switched by `sw()`; the nav shows only Leaderboard until logged in.
- Inline `onclick="..."` handlers rely on **global functions** — a renamed/moved function must stay global and be loaded.
- Copy-pasted handlers that were not adapted (runner vs. tournament vs. location variants).

## 3. File structure conventions
- Scripts are classic (non-module) and share one global scope. Load order lives in `index.html` and matters only for top-level statements: `config` → `bands` → `state` first, `app.js` last.
- New code goes in the file that owns that feature (see README "Project structure"). Create a new `js/<feature>.js` rather than growing an unrelated file; add its `<script>` tag before `app.js`.
- No new top-level statements that run at load outside `state.js`/`app.js`/`import.js`.
- CSS: use existing `var(--x)` tokens in `css/styles.css`; no raw hex where a token exists. Prefer the `.u-*` utility classes (end of `styles.css`) over new inline styles. Caution: a single-class utility loses to existing more-specific rules (e.g. on `input`), so visually verify; `u-input-sm` was tried and reverted for this reason.
- Use `getTournament/getRunner/getLocation/getEvent(id)` instead of `S.x.find(...)`.

## 4. Security & secrets
- Never add tokens, passwords, or keys to source. The admin pastes the GitHub token in Settings; it lives only in that browser's localStorage. Anything client-side is public on GitHub Pages.
- Known existing issue to keep flagging: the hardcoded settings password in `config.js` (client-side only, not real security).

## 5. Verification
```bash
for f in js/*.js; do node --check "$f"; done          # syntax
python -m http.server 8765                              # serve, then load http://localhost:8765
```
Run `npm test` (scoring, merge and data.json compatibility tests) and `npm run check` (syntax). Then smoke test in a browser (Playwright works): page loads with no `pageerror`, leaderboard renders, and the changed path is exercised (log in via settings, click through the feature). A syntax check does not prove the UI works.

## 5b. Other parts of the repo
- `rundamentalist/rundamentalist.html` is a separate, self-contained marketing page (own CSS, large embedded assets). Don't apply `js/`/`css/` conventions to it or mix the two.
- `data.json` is live league data (the app commits "Sync ..." changes to it). Never hand-edit or reformat it as part of a code change; keep it out of the diff unless that is the task.
- Pages deploys straight from `main`; there is no workflow or build.

## 6. Duplication
Search `js/` for existing helpers (`utils.js`, `tournament-data.js`, `ui.js`) before adding new ones. Consolidate real duplication; don't invent abstractions for things that only look similar.

## 7. Report format
- **Scope**: files changed.
- **Correctness**: edge cases checked, issues found/fixed.
- **Structure**: files touched, load order OK.
- **Security**: secrets flagged.
- **Verification**: syntax + smoke test results, honestly (what was not run).
- **Open questions / follow-ups**.
