# Directive: records restructure — status becomes data, narrative stays prose

Date: 2026-08-11. Author: desk session (Fable), second-opinion lane; operator
approved the strategy in conversation the same day.
Consumer: the next session that takes this repo's desk (operator will name this
file as its instruction). Status: READY — decisions below are settled; the two
marked OPERATOR are not.

## Why (the incident this generalizes)

On 2026-08-10/11 one session misread four threat-matrix rows (3, 5, 14, 22) by
taking a status cell's leading token as its verdict while the deciding sentence
sat mid-body; row 26's cell read NOT MITIGATED over a fix shipped the night
before (246b61d); row 14's headline contradicted its own body's result; two
independently built census instruments disagreed on collision counts because
"which files does this entry write" is free text; and row 4's remaining
mitigation survived only as a dangling commit (dc8c475, now held by tag
`rescue/unit-2b-dc8c475`) because nothing checks that booked work is reachable
from a ref. Every failure is one defect: project STATE stored as prose, so
reading state is a judgment pass, and judgment passes drift (label-over-body,
the grounding corpus's own class). The repo's data-with-checkers surfaces
(fixtures, gates, absence scan, suite) produced zero such confusions the same
day. Hence the principle this directive implements: **status becomes data with
a checker; prose keeps the reasoning.**

## Non-functional notes

Size budget: one small JSON (~29 rows × 5 fields), one test file (~100 LOC),
one lint extension (~80 LOC), header edits to BACKLOG.md and per-row cell
edits to the matrix. No new abstractions beyond the status file. Touches no
`proxy/**` — no pin bump, no restart, not deployment-coupled. Load-bearing:
yes (it changes how every future session reads project state), which is why
each phase carries a mechanical verifier.

## Phase 0 — land the owed record corrections first (against the WORLD)

Before any restructuring, the three known-stale records get corrected, each by
reading the running system / repo, never by copying this directive (dev-loop:
"CLOSING is established against the WORLD"). This directive is a prompt to
check, not evidence.

1. Row 26: verify 246b61d + a5f1960 are in main and the extensions carry the
   pre-pipeline identity (grep the extension source), then set the row
   SHIPPED-pending-retirement with the seven-day oldKeyFallback trigger named.
2. Row 22: settle UNASSESSED-vs-closeable by reading the row's promoted
   question against `docs/directives/success-path-only-enumeration.md` (the
   artifact, not its mention).
3. Row 14: reconcile headline vs body ("proved insufficient" vs "0 resets
   across 940 requests") from the corpus result cited in the body.

Also re-verify the D1 backlog entry (~line 391 region claims vs shipped state).

## Phase 1 — threat-matrix status file

- New file `docs/directives/robustness-threat-matrix.status.json`: an object
  keyed by row number ("1".."29"), each value
  `{ "status": <enum>, "evidence": <ref>, "date": "YYYY-MM-DD",
  "residual": <string|null> }`.
- Status enum (closed): `SHIPPED`, `RESIDUAL` (shipped with a named remainder
  — `residual` is then required non-null), `OPEN` (buildable, design pending
  or ready), `DECLINED` (build refused on measurement — evidence names the
  measurement), `IMPOSSIBLE` (physics: model-keyed cache, upstream eviction,
  TTL), `OUT-OF-SCOPE` (mitigation lives outside this repo), `UNASSESSED`.
- `evidence` is a commit hash, a repo-relative artifact path, or a dated
  measurement pointer. For `SHIPPED`/`RESIDUAL` it MUST be a commit hash or
  artifact path that resolves.
- Populate by reading each row's BODY (the deciding sentence), not its leading
  token — the 2026-08-11 verdicts lane's method (deciding quote per row). The
  five-build board from that session (rows 4, 23, 2 open; 6, 25 residual-build)
  is a seed to verify, not to transcribe.
- One fact, one home: after population, each prose row's status cell is edited
  to carry narrative + `status: see robustness-threat-matrix.status.json`; the
  verdict token leaves the prose. The matrix stays the home for reasoning,
  evidence trails, and event walks.
- Checker `test/matrix-status.test.mjs` (runs in `npm test`, hence on every
  pre-push): valid enum; all 29 rows present and exactly the rows the matrix
  file has (count parsed from the matrix's row headers); `RESIDUAL` ⇒
  non-null residual; `SHIPPED`/`RESIDUAL` evidence resolves (`git cat-file -e`
  for hashes, `fs.existsSync` for paths — accept both object types, per
  dev-loop's "does this resolve, never as-the-type-I-expected").
- Red-first, per dev-loop "Adding a check": after the checker exists and is
  green, mutate one condition at a time and watch the specific bite go red —
  an evidence hash truncated to a nonexistent object, a RESIDUAL row with
  residual null, a 28-row file. Paste the red output into the closing report.

## Phase 2 — backlog: declare the third grade, shrink READY to the head

- The accretion rule's threshold ("ready outgrows what the repo will ever
  schedule") was crossed; declare it in BACKLOG.md's header: three grades —
  `READY` (scheduled head only, cap ~10), `RECORD` (decision-complete memory,
  not scheduled), `PARKED` (unchanged).
- Mechanical demotion: every current `- **READY` entry not selected for the
  head becomes `- **RECORD (ex-READY 2026-08-11)` — one pass, no re-grading
  by reading, bodies untouched. Nothing is dropped.
- Head selection is derived per dev-loop "Build order is DERIVED at build
  time" (with its MITIGATE-composition rule), from the Phase 1 status file's
  OPEN/RESIDUAL rows first. Selection is the executing session's judgment;
  the cap is not.
- New-booking bar (header text + lint): a READY entry must carry
  (a) an anchor — the matrix row or serving-correctness surface it serves,
  (b) a write-set of actual paths, (c) a verifier command. An entry that
  cannot name its anchor books as RECORD or dies as a one-line journal note.
  This is the base case that stops instruments breeding instruments.
- Extend `tools/backlog-lint.mjs`: enforce (a)-(c) on READY entries only;
  plus ref-reachability — any commit hash or `wt/` branch a READY entry cites
  must resolve and be reachable from some ref (the dc8c475 class, caught at
  lint time instead of by luck). Red-first against the CURRENT file before the
  demotion pass: it must fire on known instances (the unresolved-write-set
  entries the 2026-08-11 census enumerated); paste the fire.

## Phase 3 — records-vs-world reconciliation in the daily lane

Add to the sweep path (gate-live or a sibling invoked beside it, executing
session's placement call within `tools/`): matrix-status checker invariants +
backlog-lint over the head, so records drift shows up in the morning sweep,
not in archaeology. This rides Phase 1+2's tools; it is wiring, not new logic.

## Order, boundaries, exits

- Order: Phase 0 → 1 → 2 → 3, each committed separately (pathspec commits;
  574 untracked harvest files are present in the tree — never `git add -A`).
- OPERATOR decisions, not covered here: whether to push
  `rescue/unit-2b-dc8c475` (publishes a pre-publication-bar fixture; run
  `tools/absence-scan.mjs` over it first if yes); and ratifying the READY cap
  (~10) if a different number is wanted.
- Out of scope: any `proxy/**` change; the five-row build program itself
  (rows 4, 23, 2, 6, 25) — it resumes AFTER this restructure, reading the
  status file it produces; global-corpus edits (dotfiles: honorable-drop
  wording, calendar retirement cadence) — those belong to the dotfiles repo
  and are booked there, not here.

## Closing gate (answered for this directive)

1. Mechanized? Yes — the deliverables ARE the mechanisms (checker, lint,
   sweep wiring); interpretation (head selection, row re-reads) stays human.
2. Harvestable? The evidence is repo-resident (commits, artifact paths), not
   rotating captures; the status file snapshots verdicts with dates.
3. Census class? n/a — no traffic classification changes.
4. Instruments ride along? Yes — each phase lands with its checker in the
   same change, red-first demonstrated before it counts.
