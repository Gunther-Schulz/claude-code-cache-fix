# Backlog lane plan — 100 READY entries into 10 lanes + 1 desk round + 10 holds

Derived 2026-08-10 (late) from `node tools/backlog-lint.mjs --census` over
`## Open` (100 READY at derivation). **Consumer: the session executing the
backlog drain** (the open opus session). This is a LANE PLAN, not a set of
briefs: each lane still needs its brief written at dispatch time, and the
first step of every lane brief is a premise re-read of each member's body
against the world (20 entries were flagged stale-risk at the last close;
three were overtaken by reality in one day).

**Entry identity is the HEADLINE, never the line number.** Line numbers below
are as-of-derivation and rot with every edit; the headline's opening words are
the stable key — `grep -n` for them. This plan is re-derived, not edited: if
the Open set has moved materially, re-run the census and re-check membership
before dispatching a lane (same rule as the build-order block).

This plan executes the design already decided in the entry
**"the backlog is heavily MERGEABLE by realizing file"** (BACKLOG.md): MERGE
groups entries sharing a realizing file — they must serialize anyway, so one
lane costs one integration instead of six; BATCH groups entries with disjoint
realizing files — one lane closes all of them in one pass with zero
serialization points. A batch/merge lane takes its members as a numbered list
and its report DISPOSITIONS EVERY member: closed with commit ref, or returned
with the reason. A dropped tail must be visible, never merely absent.

**Loop-stage composition line (owed by the rubric):** no MITIGATE-stage item
is lane-dispatchable in this plan. The MITIGATE payload (pre-pipeline
conversation identity; relocation-induced key rotation) sits in the desk
round D1, and the single decision that would unblock it is the migration
strategy for state already on disk under rotated keys — an operator/desk
call, named in the build-order head as item 5's blocker.

---

## Wave 1 — parallel lanes, disjoint write sets

Each lane: own worktree, `ln -s <repo>/node_modules <worktree>/node_modules`
before any test run, one writer per lane, `BACKLOG.md` never in any lane's
write set (dispatcher books all closures). Width is bounded by what the
dispatcher can verify — token cost is identical at any width; if reports
return faster than they can be verified in the artifact, that is the real
limit, not lane count.

### L1 — backlog-tooling mega-merge (19 entries, one write set)

Write boundary: `tools/backlog-lint.mjs`, `tools/backlog-order.mjs`,
`tools/backlog-neighbours.mjs`, new `tools/backlog-index.mjs`, their tests.
The family already imports each other (`censusEntries` is shared), which is
why this is ONE lane. Internally serialized; the lane orders its own members
(the grade-split and expiry entries change what the linter checks, so they
go early).

Members (headline keys, line-as-of-derivation):
1. 542 `backlog-neighbours` joins on FILES
2. 983 the backlog is heavily MERGEABLE — **this plan is that entry's
   deliverable-in-progress**; the lane closes it only when its done-criterion
   (family lane run + one batch lane dispositioned) is met
3. 1102 the READY grade asserts INTENT TO BUILD (the grade split — keystone;
   if any member needs an operator decision it is this one: declaring the
   third grade is a repo-level call the accretion rule already sanctions at
   this ready-set size)
4. 1358 `lintCitations` can READ only 3% of the citations
5. 1378 dispose of the 16 late corrections `lintCorrectionPlacement`
6. 1429 a backlog entry that cites `file:line` has no check (reads
   bust-triage lines as DATA only — no write there)
7. 1496 a derived VIEW of this backlog outlives its source (`backlog-index`)
8. 1531 the READY count every session reads at startup
9. 1625 the succession rule's computable slice
10. 2675 `backlog-order.mjs`'s anchor namespace is the whole BULLET BODY
11. 2705 `backlog-lint` calls its own header findings advisory
12. 3547 `lintRowStatus` fires on prose that DESCRIBES a status
13. 3568 a test asserting "zero false fires on the real CURRENT" file
14. 3972 a `backlog-lint` lane for the two ways a booked entry is not
    DISPATCHABLE (its own body says: dispatch together with the WARN item)
15. 4859 READY has no expiry (process half lands in the linter; any
    BACKLOG.md convention change is returned as a proposal, not edited)
16. 6038 a POINTER entry's liveness lives in ANOTHER repo
17. 6221 a derivation asks whether an entry's PREMISE is true and never…
18. 6285 a correction APPENDED to the end of an entry is invisible
19. 6435 `backlog-lint` reports clean on a `## ` heading split

### L2 — bust-triage + threat-matrix merge (8 entries)

Write boundary: `tools/bust-triage.mjs`, `test/bust-triage-*`,
`tools/dossier.mjs` (shares `matrixRow`/`STATUS_RULES`),
`docs/directives/robustness-threat-matrix.md` row cells. This lane OWNS the
matrix file — nobody else touches it in wave 1.

Members:
1. 312 `capturePairResult`'s conversation identity is the busting — head
   listed it BLOCKED on the bounded pin + lineage primitive; **both landed
   (`ce975c5`, `a68a8af`) — premise re-read, then it is likely dispatchable**
2. 2226 `bust-triage` cannot reach threat-matrix row 24 by ANY of its three
   routes
3. 2258 the matrix datapoint convention's COMPUTABLE half
4. 2331 the threat matrix has a datapoint-section form (the `matrixRow`
   truncation half is code; the cell rewrite is matrix)
5. 3429 mint the matrix row this walk's terminal state requires (doc-only,
   but it writes the matrix, so it rides in this lane)
6. 3686 `capturePairResult` may select a DIFFERENT pair than the census walk
7. 4565 the new verdict kinds have no live path
8. 5774 a walk whose disposition is NOT-OURS or NON-DEFECT with `row=none`

### L3 — replay.mjs + fixture-verdict merge (14 entries)

Write boundary: `tools/replay.mjs`, `tools/coverage-walk.mjs`,
`tools/fixture-verdict-identity.mjs`, `test/replay-*`,
`test/fixture-verdict-identity.test.mjs`, `test/fixtures/**` additions,
`.git/info/exclude`. The in-flight lanes that previously held this file have
returned and integrated — the file is free.

Members:
1. 613 a bounded pin's SIZE scales with the busting…
2. 1652 the census cannot see OUR OWN pipeline rotating
3. 1972 the LINEAGE relation, as a shared primitive — **premise re-read: the
   lineage primitive landed today; this entry may be partly or wholly done**
4. 2384 the inverse-direction coverage walk
5. 2402 the stability exemption for a first-appearance relocation
6. 2468 `findAbsorptionMisses` runs on every replay and prints on none
7. 2487 `replay.mjs --json` drops the census — **carve: this lane emits the
   census in `--json`; any bust-triage-side consumer wiring is RETURNED as a
   proposal for L2/dispatcher, never edited here (collision with L2)**
8. 2512 every OTHER row family still carries only report…
9. 2548 the widened mutation test WENT RED on the first new real pin
10. 2602 the fixture-verdict mutation population is DIRECTORY-derived
11. 2647 the suggestion-mode variant fork is a census class
12. 4254 extend `replay.mjs`'s extension bisection to CONSERVATION rows
13. 5563 born-large conversation starts become a census class
    (design decision-complete in the entry: `findBornLargeStarts`)
14. 6847 an instrument that separates MITIGATION-WORKED from…

### L4 — reminder-migration-census merge (3 entries)

Write boundary: `tools/reminder-migration-census.mjs`, `test/census-*`.
Members: 3120 (MISMATCH bodies "printed in full"), 4357
(`identity-normalization` rewrites ONE of the two containers), 5609 (MISMATCH
rows have no way OUT of the census).

### L5 — harvest merge (2 entries)

Write boundary: `tools/harvest.mjs`, `test/harvest*.test.mjs`.
Members: 2017 (`harvest --pin` cannot freeze a LATE event in a LARGE…),
2731 (`test/harvest-scrub-relations.test.mjs` reads…).

### L6 — small-tools batch (12 entries, disjoint one-file members)

The canonical BATCH: nothing forces these together; one lane, one pass,
per-member disposition. Each member's write boundary is its own file + test.
Members:
1. 3161 `xdg-migrate.mjs --verify` exits 1 on a NON-defect
2. 3629 `cost-report.mjs` had ZERO test coverage before `82372db`
3. 5804 `absence-scan`'s `allowlisted:` line cannot distinguish…
4. 3495 + 3506 `local-stamp` (two entries, one file — a merge INSIDE the
   batch; dispatch as one numbered pair)
5. 3192 `restart-exposure --match` takes a TEXT predicate
6. 4169 `tools/lane-sweep.mjs`: make the lane enumeration repeatable
7. 4312 the PR-ROUNDS trigger, split out with its WRITER
8. 2626 the synthetic-HOME pattern is the only way to drive…
9. 6128 `git stash`/`pop` across a `git mv` desyncs the index (note/check —
   realizing site per body)
10. 3524 22 orphaned `worktree-agent-*` branches survive their worktrees
11. 3446 a comment claiming a `{ todo }` marker exists is checkable

### L7 — XDG accounting + strict-reader batch (7 entries)

Write boundary: `tools/xdg-writer-guard.mjs` + test, `tools/logs.mjs` +
`test/logs-schemas.test.mjs`, README path citations, doc files the members
name. NOT `proxy/**` (those members are D1).
Members:
1. 1301 bucket (d) of the XDG accounting: 65 measured instances
2. 2833 (counts CORRECTED WITHIN THE HOUR…) — premise re-read mandatory
3. 3052 the EXCLUDED-BY-GENRE bucket (~260 occurrences)
4. 3091 the three READMEs must agree on their path citations — **premise
   check against FORK-NOTES "Where this fork's own state lives": the
   standing decision is READMEs stay upstream's; the entry must reconcile
   with that decision or return**
5. 6337 `tools/xdg-writer-guard.mjs` is red at 34 — **carve: its `gate-live`
   wiring half is RETURNED as a proposal for L10, not edited here**
6. 6370 nothing distinguishes a checker that WORKS from…
7. 6480 `tools/logs.mjs` shipped as "one strict reader owning every…"

### L8 — docs/process batch (10 entries; owns `docs/dev-loop.md` + runbooks)

Write boundary: `docs/dev-loop.md`, `docs/runbooks/**`, `CLAUDE.local.md`
pointers (via dotfiles where deployed — those halves return as proposals).
**Standing carve for every OTHER lane: nobody but L8 edits `docs/dev-loop.md`
in wave 1; code lanes return their doc deltas in their reports and the
dispatcher integrates or hands them to L8.**
Members:
1. 1830 the new tools-decision instrument is CAPTURE-BOUND
2. 2290 three ingestion lanes reach the same event and two disposition…
3. 3849 the own-event-log timestamp correlator: a RULE
4. 3871 a FIELD can be a default rather than a…
5. 3950 when an instrument surprises you, run…
6. 4486 the close-out lane inventories EVENTS and not SIGNALS
7. 4524 findings get classified ONE-SIDEDLY
8. 5746 an entry proposing a DECLARED EXEMPTION states the…
9. 6504 the scrub's length-vector residual was accepted on a premise…
10. 4665 an index check for the runbook lane system

### L9 — evidence/investigation batch (3 entries, read-only analysis)

No code write set; output is analysis + proposed dispositions, booked by the
dispatcher. **Runs its instruments from its OWN worktree (frozen copies) —
L2/L3 are editing the very tools this lane executes, and read-or-execute
counts as overlap.**
Members: 2354 (the 336k UNCLASSIFIED event / transcript-ledger join),
3658 (~30% of `join:cross-message` pairs do NOT fire `movedFresh`),
4284 (why did twelve first-appearance relocations rotate free while the
thirteenth cost 216k).

## Wave 2 — after L3 integrates

### L10 — gate-live + billing merge (5 entries)

Write boundary: `tools/gate-live.mjs`, `test/gate-live*.test.mjs`, plus the
replay-adjacent tests it shares with L3 (`test/replay-gate-selfcheck*`,
`test/mitigation-output-form.test.mjs`) — which is exactly why it waits for
L3. Also integrates the two returned proposals (6337's wiring, 5763's sweep
call).
Members:
1. 1246 RE-SCOPED after a batch lane correctly REFUSED…
2. 1272 `rebilledBytes` still emits the understated number
3. 3399 no instrument reads the BILLING side
4. 6408 `gate-status.json` grows without bound
5. 5763 the matrix lint is blocked at SUITE time (wire `--lint-matrix` into
   the sweep)

## D1 — desk round: proxy/, deployment-coupled (7 entries — NOT lane work)

Every member touches `proxy/**`: pin bump + restart owed per change, row-3
restart-transparency declaration where state keys/freeze logic move. These
serialize at the desk (or one carefully-briefed sequential lane with the
dispatcher holding deployment), and the round OPENS with the one design
decision the build-order head names: **migration strategy for state already
on disk under rotated keys** (blocks the MITIGATE payload).
Members: 481 (pre-pipeline conversation identity — row 26's fix, the
MITIGATE keystone), 4026 (kill relocation-induced key rotation — MITIGATE),
1148 (billing and verdict written by two extensions), 2967 (output-guard,
severity downgraded), 4221 (`/health` `gates` is a pure env filter), 4605
(usage log has no CC-session key), 5995 (`CacheFixConfigDirDivergenceWarning`).

## D2 — holds: operator-gated, cross-repo, trigger-gated (10 entries)

Not dispatchable here; each carries its trigger. Booking them into lanes
would re-create the false-READY defect the grade-split entry names.
- 427 FROZEN evidence archive (operator-side data; write boundary split)
- 512 required-reading gate guards `Write`/`Edit` and NOT a third tool
  (realizing file is the dotfiles hook — cross-repo)
- 4638 required-reading INJECTION carries the closing gate (same hook)
- 1063 `DOTFILES-BRIEF-inherited-items.md` disposal (trigger: dotfiles
  session reports back; deletion is confirm-first)
- 1173 claude-worktime POINTER (body belongs in that repo)
- 5702 the lanes backfill (dotfiles-coupled contract)
- 6081 HALF (1) CAME BACK; half (2) stays with… (split ownership)
- 6598 public-surface split UNTRACK IN PLACE (operator-gated, LOW)
- 1918 the public-repo hygiene policy enumerates origin IPs (edits the
  tracked upstream CLAUDE.md — desk/operator call)
- 6913 dispose of `FABLE-BRIEF-public-surface-and-systems-review.md`
  (trigger-gated disposal, confirm-first delete)

---

## Accounting

100 READY at derivation = L1 19 + L2 8 + L3 14 + L4 3 + L5 2 + L6 12 + L7 7
+ L8 10 + L9 3 + L10 5 + D1 7 + D2 10. Every entry appears in exactly one
lane. After wave 1 + wave 2 + the desk round, the residual open set is D2's
10 holds plus whatever lanes return non-closed — each visible by the
per-member disposition rule.

## What this plan does NOT claim

Bundling reduces LANES and integration cost; it does not reduce the work.
A lane's members that merely share a file are a convoy, not a merged design —
the report form (every member dispositioned) is what keeps a convoy honest.
Booking rate exceeded closure rate today (~1.7 new per closed); this plan
drains the CURRENT set and says nothing about the set that its own execution
will discover. The grade-split entry (L1 member 3) is what makes the READY
label survivable either way.

## Execution protocol (binding, from dev-loop — restated so no lane has to find it)

- One worktree per lane; symlink `node_modules` first or proxy suites die
  `ERR_MODULE_NOT_FOUND: hpagent` looking like 900 s hangs.
- `npm test` shells to git: never share a clone between two committing lanes
  (`index.lock`).
- `BACKLOG.md` and all booking belong to the dispatcher. Integration, push,
  and pin bumps stay at the desk.
- Every lane brief closes with the dispatch skill's tail block; the dispatch
  skill is loaded before any dispatch (hook-enforced).
- Brief-covered execution defaults to SONNET; the lane-brief-writing and
  report-grading judgment stays at the dispatcher's tier. A lane whose
  members need design decisions mid-flight is a mis-briefed lane — it
  returns the question, never improvises.
- Premise re-read per member before dispatch (stale-risk: 20 flagged; two
  named above are already partly overtaken: 312, 1972).
- **In-flight at derivation:** a sonnet batch lane (`batch-six-smalls`) held
  this working copy at 2026-08-10T16:15Z. Before dispatching L6 (and before
  trusting any small entry's open status), check that lane's closing report
  and closures — some L6 members may already be done or in flight.

---

## MEMBERSHIP RE-CHECK 2026-08-10 (the executing session, before wave 1)

The check this plan's own head demands, run rather than assumed. Method:
every member headline resolved against a fresh `backlog-lint --census` by
TEXT, not by line number (`scratchpad/resolve.mjs`, 100/100 resolved); the
`batch-six-smalls` closing commits read (`ff5824c`, `910fb8e`, `12f40b4`);
the two flagged entries probed against the world.

**Seven members were already closed and are struck.** Six of them were
invisible to the derivation census because of a defect in the CLOSURE
CONVENTION, now booked and repaired: a closure prepends a `DONE` bullet and
leaves the ORIGINAL bullet graded `READY`, so one finished item is counted
open forever. Enumerated red-first (6 over `3b37ece:BACKLOG.md`, 2 after four
hand re-grades, 0 after all six) — the true open count is **94**, not 100.

| lane | member | disposition |
|---|---|---|
| L1 | the succession rule's computable slice | CLOSED `2e53a01` |
| L1 | a derivation asks whether an entry's PREMISE is true | CLOSED `2e53a01`+`2676523` |
| L3 | the LINEAGE relation as a shared primitive | CLOSED `d8bb9b6` — desk-verified: exports at `tools/replay.mjs:1179-1191`, 10/10 bites pass, `conversationOf` untouched |
| L6 | `cost-report.mjs` had ZERO test coverage | CLOSED `92fdffc` |
| L6 | `absence-scan`'s `allowlisted:` line | CLOSED `b77d8b8` |
| L7 | `tools/xdg-writer-guard.mjs` is red at 34 | CLOSED `2d07e74` — **including** the `gate-live` wiring half this plan carved out for L10; that carve is void |
| L8 | when an instrument surprises you, run the SIBLING | CLOSED `cf8843f` |

**Three members MOVE, each on a realizing-file resolution the derivation did
not make:**

- The `local-stamp` pair (L6 member 4) was RE-SCOPED by the batch lane's
  correct refusal: its boundary is now `proxy/server.mjs:51` and
  `preload.mjs:1396`. That is `proxy/**`, so it is deployment-coupled and
  moves **L6 → D1**.
- `git stash`/`pop` across a `git mv` (L6 member 9) realizes in
  `test/logs-schemas.test.mjs`, which L7 owns. Moves **L6 → L7**.
- `rebilledBytes` (L10 member 2) was RE-SCOPED to 65 sites across 10 files
  including `tools/replay.mjs` and four `test/replay-*`/fixture-verdict
  suites. It was already wave 2; the re-scope confirms rather than changes
  that, and hardens it — L10 may not start until L3 has integrated.

**Two premise re-reads run at the desk rather than delegated,** because both
were flagged and both gate a lane's first act:

- `capturePairResult` (L2 member 1): its stated blockers both landed
  (`ce975c5`, `a68a8af`, plus `d8bb9b6`), and its red arrangement STILL
  REPRODUCES — re-run today, `VERDICT: UNVERIFIABLE` /
  `ATTRIBUTION: COULD-NOT-ATTRIBUTE`, selected request at ord 715, n=555,
  "18 request(s) in this capture and none earlier", byte-for-byte the entry's
  recorded red. Its four cited sites were re-read and all four are exact
  (`tools/bust-triage.mjs:754`, `:765`, `:1261`, `:1276`). DISPATCHABLE, and
  its red is runnable TODAY — the capture behind it is on a rotation clock, so
  L2 runs that arm first.
- The lineage entry (L3 member 3): DONE, above.

**Corrected lane sizes.** Wave 1: L1 17 + 1 new (the closure double-grade
check, booked today — realizing file `tools/backlog-lint.mjs`, already L1's
boundary) = **18**; L2 8; L3 13; L4 3; L5 2; L6 7; L7 7; L8 9; L9 3 — **70**.
Wave 2: L10 5. Desk: D1 7 + the `local-stamp` pair (two bullets, one work
item) = 9. Holds: D2 10, unchanged.

Accounting, against the measured census rather than against this plan's
arithmetic: **94 READY** = 70 + 5 + 9 + 10. Derivation of the 94 from the
derivation-time 100: −7 closed, +1 booked today. Every entry appears in
exactly one lane.

## ADDENDUM 2026-08-10 (desk) — one member added to L1

`backlog-lanes.mjs` (lane derivation as a mechanical join + the
boundary-missing lint) is booked and joins **L1** — its write set is exactly
L1's boundary (`backlog-lint.mjs` + a new sibling + tests). L1 is 19 with
it; the running total moves 94 → 95 (+1 booked, nothing closed by this
addendum). Rationale and the global rule it descends from (the corpus's
ready grade now requires a realizing write-boundary, dotfiles `88a3580`)
are in the entry. If L1 has already dispatched when this is read, the entry
waits for L1's integration rather than opening a second writer on the
family.
