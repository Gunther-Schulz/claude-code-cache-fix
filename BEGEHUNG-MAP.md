# BEGEHUNG-MAP — coverage walk over this repo's claim-emission surfaces

Persistent map for the Begehung skill (rounds registered below; the map is
the deliverable, round reports derive from it). One row per axis. Declared
interval: a row unvisited for **14 days** is itself a finding at the next
invocation. First derived 2026-08-11 from the tree (tools/, docs/runbooks/,
docs/directives/, proxy/extensions/ listings executed at the desk), not from
the incident list. Fork-only file, never in PR slices.

Status vocabulary: `mechanically-guarded` (pointer to the guard's red-proof)
· `prose-covered` (rule cited) · `dark`. A status not re-read from its guard
this round carries `(unverified)`.

## Emission surfaces (completion check: every surface has ≥1 row)

Threat matrix + status JSON · BACKLOG.md (READY/Record/Parked) · harvested
fixtures + LEDGER-*.json · replay census/offline gate · gate-live sweep +
gate-status.json · harvest pipeline · shape-verdicts · bust-triage verdicts ·
state-report · absence-scan (pre-push) · backlog-lint + matrix-status
(instruments) · /health · snapshots/telemetry event logs · runbooks ·
dev-loop/FORK-NOTES prose rules · outward git/gh channels (push, commit
messages, PR bodies/comments, tags) · test suite · proxy pipeline output ·
worktree lanes · cross-repo carriers (dotfiles manifest/doctor/unit) ·
ancillary analytics (cost/quota tools).

## The map

| axis (what against what) | status | last visited | yield | next step |
|---|---|---|---|---|
| matrix prose vs status JSON (label-vs-body drift) | mechanically-guarded — `test/matrix-status.test.mjs`, red-proof pasted in Phase-1 closing report (118bc77) | 2026-08-11 · restructure | 4 misread rows motivated it | strip verdict tokens from 29 cells (READY head item) |
| BACKLOG READY claims vs world (citation drift, evidence expiry) | mechanically-guarded — citation lane + ready-bar + alias lane, reds in b9fcb6b / drain-session report | 2026-08-11 · drain | 3 un-armable entries, 23/27 aliases dead | reader-side evidence-pin check (booked) |
| test-suite bites vs live-state anchors (premise decay) | prose-covered — corpus "criteria anchored to live, mutating state decay"; two instances repaired to frozen refs 2026-08-11 | 2026-08-11 | 2 decays in one day | no sweep exists over the other ~2880 bites for live anchors — dark remainder |
| outward channels vs publication bar (push tree, commit messages, PR bodies/comments, tags) | mechanically-guarded for tip-tree + commit messages (`scanGitRange` + `scanSourceText`, reds test/absence-scan.test.mjs:522,698); range-interior blobs + tag annotations OPEN (booked READY, grep "range-interior"); gh text prose-rest (booked RECORD) | 2026-08-11 · round 1 | 4 (2 gaps booked, 2 stale runbook claims repaired) | execute the range-interior booking |
| gate-live recurring findings vs absent human (no closing moment) | prose-covered — dev-loop closing-gate q2 + `sweep-finding.md`; live counter-evidence: 14/48 RED unwalked days | 2026-08-11 · noted only | RED sat unwalked | does anything escalate an unwalked sweep finding after N days? dark |
| serving config vs verified config (DECLARED/RUNNING/VERIFIED) | mechanically-guarded — dotfiles doctor three-answer compare + source-derived gate roster, incident red 2026-07-28 | 2026-08-11 | uniformly-absent-gate blind spot found, net exists | land ship-runbook step 4b (enable+classify) — drafted, unlanded |
| new-mitigation enablement vs ship runbook (dormant machinery) | prose-covered — doctor tripwire only; runbook names no enable step | 2026-08-11 | 1 (missing step) | step 4b + book; also: gates read outside proxy/extensions/ escape the source scan |
| fixture corpus vs LEDGER (tracked ledger, untracked corpus) | prose-covered — booked c8c9945 | 2026-08-11 · drain | 1 | execute the booking |
| snapshots/telemetry event logs vs their consumers (D1 retirement, row-26 absorption answers) | dark — machinery landed 2026-08-11, no independent review; only oldKeyFallback zero proven live (110 events) | never | — | candidate round 2 |
| finding evidence vs capture rotation (volatile bytes) | mechanically-guarded (new) — READY-bar 4th clause in backlog-lint; writer half only | 2026-08-11 · drain | 3 entries + 1 rescued pin | reader-side half booked |
| worktree lanes vs main integration (unintegrated commits) | prose-covered — patch-id rule in dev-loop, `prune-lane-branches.mjs` booked not shipped | 2026-08-11 · drain | 30 commits | ship the tool, disposition the 30 |
| cross-repo carriers vs consumer read paths (decorative naming) | prose-covered — accretion consumer rule; no mechanism | 2026-08-11 | 1 (dotfiles-bound entry unreachable) | is a mechanical check possible? (entries naming a foreign repo's consumer without a carrier there) |
| bust-triage verdicts vs matrix reach | mechanically-guarded (partial) — status-file reader 41caught…110d5be with reds; row-24 reach shipped in drain stretch | 2026-08-11 · drain | 17/26-fold incident (2026-08-06), row-24 gap | remaining READY entry on triage reach |
| census classes vs investigative hand-derivations | prose-covered — dev-loop closing-gate q3 | (unverified) | — | dark: no scan finds hand-classified classes the census never absorbed |
| proxy pipeline output vs invariants | mechanically-guarded (unverified this round) — output-guard extension + gate replay; red-proofs not re-read | never (by Begehung) | — | verify red-proofs from the guard itself |
| state-report sections vs the state they claim | mechanically-guarded for absent inputs (12 third-answer bites read + render test, test/state-report.test.mjs:135-227,392); STALE direction open — gate verdict carries no age (booked READY, grep "stale gate verdict"); double-read race booked RECORD | 2026-08-11 · round 2 | 2 (1 probed live, 1 code-read) | execute the staleness booking |
| upstream PR slices vs fork-only content | prose-covered (unverified) — `slice-preflight.mjs` exists, reach unread | never | — | read what slice-preflight actually checks |
| runbooks vs their real event sequences (missing-step class) | prose-covered — GRADUATE markers convention | 2026-08-11 · 1 runbook of 7 | 1 missing step | walk the other six against a real run each |
| ancillary analytics (cost/quota/rates) vs operator decisions | dark | never | — | low cost? name the consumer first |
| shape-verdicts + /health vs dotfiles doctor booking | prose-covered (unverified) — doctor books, content-drift checks; not walked | never | — | candidate round |

## Rounds

- 2026-08-11 · round 1 · row: **outward channels vs publication bar** ·
  why: darkest × highest consumer cost (public git history is irreversible;
  the remediation precedent is destroying infrastructure) — and the one
  measured signal (verbatim quotes were found in commit messages by the
  2026-08-10 extent measurement, i.e. content the tree-scan never sees
  reached a public channel) says the guard's channel coverage was never
  enumerated. Registered before the round's first search.
  **Closed same day, yield 4:** (1) range-interior blobs escape the push
  scan — endpoint diff + tip-content read, so leak-then-scrub-then-push
  publishes the leak at its intermediate SHA; booked READY with a
  constructed red pair. (2) Annotated tag messages reach no scanner;
  folded into the same booking. (3+4) Two stale safety claims in
  upstream-pr-round.md — "scans file contents, never messages" and the
  "known blind spot" `.mjs`/`.md` paragraph — both refuted by the guard's
  own 2026-08-10 growth and its red-proofs; repaired in place, and both
  were label-over-body drift in a GUARD'S documentation, the class the
  test-bites row already tracks one level down. gh-authored text booked
  as an explicit prose-rest RECORD with its promotion trigger named.
  Lens ended on falling yield (channel enumeration exhausted: push tree,
  messages, tags, gh text, branch/tag names — names carry only hashed or
  commit-sha tokens, checked against the live ref list).
  Coverage after round 1: 7 mechanically-guarded (3 of those unverified
  this round) / 11 prose-covered / 2 dark, of 20 rows. No global claim.
  Next per rotation: darkest = snapshots/telemetry event logs vs their
  consumers (never visited, new machinery).

- 2026-08-11 · round 2 · row: **state-report sections vs the state they
  claim** · why: rotation's darkest (snapshots/telemetry) is DEFERRED with
  its reason named — an active co-writer is reshaping its consumers
  (gate-red work, 9f02518) this hour, and findings against a moving
  artifact arrive stale; this row is the darkest without a live writer:
  never visited, machinery built today, and every future session's state
  read rests on it, so wrongness is silent and lands everywhere. Lens:
  third answers and staleness — for each section, can a could-not-read,
  a stale input, or an absent input render as a clean or current claim?
  Registered before the round's first search.
  **Closed same day, yield 2:** (1) a stale gate verdict renders as
  current — no staleness logic exists in the tool; probe EXECUTED (a
  7-day-old green collects as `ok:true` with no age signal); booked
  READY (small) with a discrimination pair. (2) `collectMatrix`
  double-reads the status file against its own one-pass contract;
  booked RECORD. Positive re-grade earned by reading the guard: the
  absent-input direction is thoroughly red-proven (12 third-answer
  bites + a render test), so the row's `(unverified)` is lifted for
  that half. Lens ended on falling yield — the remaining collectors
  (repo section) read live git state where staleness is definitionally
  impossible.
  Coverage after round 2: 7 mechanically-guarded (2 unverified) /
  11 prose-covered / 2 dark, of 20 rows. No global claim. Next per
  rotation: snapshots/telemetry row once the co-writer's gate-red
  stretch closes; the deferral reason dissolves with their closing
  report.
