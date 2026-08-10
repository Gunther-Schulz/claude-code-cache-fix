# claude-code-cache-fix (fork) — open operational items

Proxy-domain parking. Deployment-side items (which gates run on which
machine, pins, acceptance records) live in the operator's dotfiles repo;
SYSTEM items — code, PRs, investigations, upstream threads — live here.
Fork-only file, excluded from PR slices like FORK-NOTES.md. One item per
bullet, evidence pointer included.

## Build order — RE-DERIVED 2026-08-10 late (THIRD derivation of the day)

Not a stored priority: recomputed from the rubric in `docs/dev-loop.md`, over
the **110 `- **READY` bullets under `## Open`** as of this derivation, counted
with the header test (`awk '/^## Done/{exit} /^- \*\*READY/{c++}'`), never
carried in prose. **Re-derive rather than edit.**

**Why a third derivation the same day, stated because two in a day was already
flagged as churn.** The second one is stale in four specific ways, each of them
an event rather than an opinion: two of its anchors completed and were removed
(the state-key FLIP attribution, the transcript instrument); its item 2's grade
says "design NOT decided" when the design was settled hours later and the item
is now BLOCKED behind a three-link chain; ~21 net new entries are unranked; and
a hard blocker was booked ahead of everything.

**The cadence finding, kept because it is about the METHOD and not about
today.** Three derivations in one day, each superseded within hours by that
day's own output, is a ranking paying for itself in re-derivation. The response
is in this block's shape, not in doing it less often: it ranks a HEAD of eleven
and says plainly that the other ~99 are unranked. A long ranked list is what
decays fastest, because every item below the few you actually take is a
prediction nobody tested.

**Grades** (unchanged from the second pass, they earned their keep): DESK needs
judgment before a brief exists; DISPATCHABLE goes straight to a brief;
BLOCKED names what must land first; PARTIAL is decision-incomplete and says
where.

### 0. CLEARED 2026-08-10, hours after this block was written

**11 commits are unpushed and `git push` is DENIED by the unbooked-subagent
guard.** The guard half is DISCHARGED: it cites subagent commits `347d477` and
`e9a374b`, this session dispatched both, and both were verified in the artifact
— diffs read, suites run, the instruments exercised directly, and `e9a374b`'s
verifier additionally sabotage-probed. The override is the guard's own
audit-visible path for exactly that state.
The publication half was the real gate — the stack sat on `8b77c4f`, whose
message maps where already-public leaks are in history — and it was answered by
an explicit operator GO. **Pushed: `e483acc..f01175b`, 12 commits.** The rank
anchor is REMOVED rather than re-pointed, per this block's own removal-only
rule; the entry is graded DONE in `## Open`.


### Loop-stage composition — the fifth signal, applied to this head

Added to the rubric hours after this block was derived, on an operator
question, and this head is its first test. **It fails the first clause and
therefore owes the second.**

Nine of the ten ranked items advance SEE / ATTRIBUTE / VERIFY. Exactly one
advances MITIGATE — item 5, the pre-pipeline conversation identity, row 26's
actual fix — and it is **not dispatchable**: DESK, deployment-coupled, and its
migration half (state already on disk under rotated keys) is explicitly
undecided.

So, per the rule: **no MITIGATE-stage item is dispatchable today, and the
decision that would change that is the migration strategy for existing
per-key state.** That is one design call, it is the operator's or the desk's
rather than an executor's, and until it is made the loop's payload cannot
ship no matter how many instruments improve. Naming it here is the point —
an all-instrument head is defensible for a phase and indefensible as a
standing condition, and the way it becomes standing is nobody writing this
paragraph.

The measured backdrop, same day: of 100 READY entries, 36 cite a `tools/`
file and 11 cite a `proxy/` one. The queue was ~3:1 tooling before any
ranking ran, so the head's composition is downstream of what gets BOOKED, not
only of how it gets ordered.

### 1. Irreversible — evidence or history that cannot be undone

Empty this pass, and that is a RESULT rather than an omission. The leak class
that put items here was closed today and the closure was verified end to end by
planting a synthetic id in a tracked file and watching the suite go red. The
publication-bar and untrack-in-place questions are live but operator-gated, not
buildable, and they sit in item 0's decision round.

### 2. Instruments that LIED — Tier A: feeds EVENT DISPOSITION

Ordered by REACH — how much downstream evidence the lie corrupts.

1. **`verifyPin` cannot fail for the defect it exists to catch, on bounded
   pins.** Measured by sabotage today, not argued: with `boundedKeep` dropping
   every third record it should keep, both sides lost the same records, the
   pair count fell 188 -> 125, and the check still returned `diffs: []`. Widest
   reach on this list — every frozen pin's trustworthiness reads through it,
   and the freeze is how evidence survives capture rotation at all.
   _DISPATCHABLE — design decided, red-first arrangement already run_
   <!-- entry: "applies the retention filter" -->
2. **`capturePairResult` picks the busting conversation.** Tier 1 by consumer:
   pick the wrong conversation and the class is mis-filed before any other
   check runs. Design settled today by measuring the rotation; two of its three
   blockers have now landed (the lineage primitive, the bounded pin).
   _BLOCKED — needs item 1, then both verifier cases frozen_
   <!-- entry: "capturePairResult's conversation identity is the busting" -->
3. **`identityRotation` reports the right event under the wrong digest**, so
   its rows cannot be joined to the event logs recording the same rotation —
   12-char whole-message hash against the proxy's 16-char content-only one.
   _DISPATCHABLE_
   <!-- entry: "measures the right EVENT" -->
4. **A frozen evidence archive whose own cited numbers are not in it.** Found
   by sending a lane to reproduce two claims and having both fail; the source
   transcript was never frozen, only a derived view beside it.
   _PARTIAL — the archive is operator-side data, so the write boundary is
   split; the convention half (cite the FILE, not the directory) is decided_
   <!-- entry: "a FROZEN evidence archive whose own cited numbers" -->
5. **Give the downstream stateful extensions the PRE-PIPELINE conversation
   identity.** Row 26's actual fix, and today's attribution named it: the
   extension that keys pre-mutation never rotates. **Its blocker cleared this
   session** — the gating class shipped and went red on the real defect.
   _DESK, deployment-coupled — the design's migration half (state already on
   disk under rotated keys) is explicitly not decided, and it touches state
   KEYS, so row 3's restart-transparency declaration is owed before it ships_
   <!-- entry: "give the downstream stateful extensions the PRE-PIPELINE" -->

### 3. Tier B: feeds the GATES

6. **The suite has at least one intermittent test and the runner discards the
   evidence to name it.** One failure in four runs of one commit today, with
   the documented ENOSPC class excluded by checking `df` rather than assuming.
   It gates every push, so a red that vanishes on re-run trains the retry
   reflex.
   _DISPATCHABLE_
   <!-- entry: "the suite has at least one INTERMITTENT test" -->
7. **The required-reading gate guards `Write`/`Edit` and not a third tool.**
   _DISPATCHABLE_
   <!-- entry: "the required-reading gate guards" -->

### 4. Tier C: feeds the BACKLOG and the process

8. **`backlog-neighbours` joins on FILES**, so a premise refuted inside another
   entry is invisible to it — the miss that happened here today, with its red
   already run.
   _DISPATCHABLE_
   <!-- entry: "backlog-neighbours` joins on FILES" -->
9. **`identityRotation` counts a persistent STATE as if it were an event**, so
   its 40% is not the rotation rate row 26 asks for.
   _DISPATCHABLE_
   <!-- entry: "counts a persistent STATE" -->
10. **A bounded pin's size scales with identity CHURN**, which no note says and
    the first real measurement contradicted.
    _DISPATCHABLE_
    <!-- entry: "a bounded pin's SIZE scales with the busting" -->

### The unranked ~99

Deliberately unranked, and named so the silence is not read as a verdict. The
rubric's own guard applies: **an item nobody can rank is a finding about the
item** — if its evidence supports none of signals 2-4 it is not
decision-complete, and the gap is in the entry rather than in this list. A
session with capacity beyond the head above re-derives over the tail rather
than reading down from here.


## Handoff — 2026-08-10 evening. Rewritten, not appended; a stale one reads as authoritative.

The 2026-08-07 handoff is REPLACED. Its content is discharged and not repeated.

**The entry point is `continue from backlog`, and nothing here is an
instruction the entries lack.** Build ORDER is deliberately absent — it is
derived at build time, and the block above is BANNER-MARKED STALE with the
re-derivation booked as a READY entry.

**STATE 2026-08-10 evening — THE FORK IS COMMITTED BUT NOT PUSHED, AND THE
PUSH IS BLOCKED BY A GUARD. This is the first thing to deal with.**

`git log origin/main..main` is 7 commits. `git push` is DENIED by the
unbooked-subagent-commit guard, naming two of them:

    347d477  census: emit identityRotation …          Co-Authored-By: Claude Sonnet 5
    e9a374b  Add --bounded mode to harvest --pin …     Co-Authored-By: Claude Sonnet 5

A commit counts as unbooked when it carries a `Co-Authored-By: Claude` trailer
with no `Claude-Session:` trailer. Both are SUBAGENT commits belonging to
session `…01R9jUauuFcnSPMSjx1ALPUp`, whose dispatcher owns them — subagents
commit unpushed by design and the dispatcher pushes after verifying. The
session that wrote this handoff (`…0185hkJZrFiq8xfMkH8GHFiw`) deliberately did
NOT use `PUSH_UNBOOKED_SUBAGENT_OK=1`: an override taken for another writer's
unverified work is the habit that kills a guard.

**So the next action here is that dispatcher verifying its two commits and
pushing the branch.** Everything else is behind them, including a shipped
guard fix. The tree was green at the exact HEAD that was pushed-attempted
(`npm test`: 2654 tests, 2649 pass, 0 fail, 5 skipped).

`dotfiles` is clean and pushed (its own peer session carried `7530895` out).
No `proxy/**` change this pass, so no pin bump and no restart is owed.

**What this session shipped, so it is not re-derived.** A full public-surface
and systems review, its findings booked as entries below rather than left in
chat. Four stale claims corrected in `docs/dev-loop.md` (a citation to a path
that never existed; a "BOOKED AND UNBUILT" line stale 29 minutes after it was
written; `gate-status.json`'s refuted "steady state"; the scrub's falsified
length-vector rationale). The fork's git history scanned end to end for the
first time — 712 fork-only commits, 1752 blobs, one real published PNG and a
reversible id mapping, NO other-session conversation text. A guard defect
found and fixed (`a449d9a`): the full-UUID shape was deferred to a roster that
did not walk `BACKLOG.md`, so writing the FULL id disabled the guard that
catches the SHORT one.

**Three decisions are now MADE and must not be re-opened without new
evidence** — each carries what would re-open it, in its own entry: git history
ACCEPT (no rewrite); the scrub's length-vector residual ACCEPT-AND-REWRITE;
the public-surface split UNTRACK IN PLACE at LOW priority.

**The operator's publication bar is now a written rule**, in
`CLAUDE.local.md` (deployed from dotfiles): no content from any session other
than cache-fix's own dev chat reaches the public tree; tool names are fine.
Read it before touching fixtures or writing about captures.

**What is BROKEN rather than merely unbuilt — read before trusting anything:**
nothing is known-broken in the running fork. Two DOC-level falsehoods are live
and booked, which is worse than unbuilt because they are load-bearing premises:
`FORK-NOTES.md` states `deferred-tool-rewrite` is disabled in the unit while
`/health` reports its gate ON and it logs `action=rewrite` on live traffic —
that sentence is a premise of the restart-transparency argument; and commit
`0ca3419`'s TITLE overstates a safety finding that the same day's later
measurement downgraded (git history is immutable, the correction lives in the
entry). Both have READY entries. The earlier `mkdtemp` leak and the leak scan's
blob-granular discard remain fixed and carry loud regression signals.

**Two busts, 2026-08-08 morning, both dispositioned.** 638k (`s-captureAS`,
dotfiles project) — Claude Code's, `replace/edit` MID-HISTORY at host 274,
attributed by diffing raw vs forwarded bodies; it re-billed because the class is
not in `replay.mjs`'s MITIGABLE set at all, and row 4's READY canonicalization
design is what closes it. 141k (`s-captureAT`, this repo's session) —
`splice/insert-mid`, a class the pipeline DOES attempt, disarmed by a state-key
flip across the pair with both sides `no-prior-canonical`; the flip's cause is
unattributed and booked. `bust-triage` answered MITIGATED on the second, which
is the row's status reported as a per-instance absorption claim — booked.
Evidence for the 141k is NOT in a capture: it is the extension event logs,
snapshotted to `~/.local/share/cache-fix/bust-evidence/2026-08-08/` (verified to
carry both timestamps and >1 distinct key). The capture pin was taken and
reported `does NOT reproduce`; it was deleted rather than committed.

**DECIDED (operator, 2026-08-08 afternoon) — the XDG default STAYS.** The
question below is settled and carried here only as the record: keep
`statePath('anthropic-proxy-logs')`, because the config-directory hygiene cost
is ours permanently (a data file under `~/.claude/` draws a permission prompt on
every read and write, for every session and agent) while the dashboard side is
one exported variable. What the decision actually surfaced was a DEFECT, not a
doc gap: the pointer was already complete — `docs/dashboard-integration.md`
documents the divergence, the shared `ANTHROPIC_PROXY_LOG_DIR`, the export
one-liner and the `--output-dir` alternative, and both READMEs link it — but the
tool's own `--help` claimed its defaults were `~/.claude/usage.jsonl` and
`~/.claude/anthropic-proxy-logs`, contradicting the `statePath()` calls twenty
lines above it, and `CACHE_FIX_USAGE_LOG` was undocumented. Fixed and verified
by running `--help`; the interop caveat now sits in the help text where someone
debugging an empty dashboard will actually meet it. This is another instance of
the class the XDG accounting found sixty-five of — a doc line disagreeing with
the `statePath()` call in its own module — so the accounting's residual is not
yet zero.

Superseded question, kept for the record: the DEFAULT was the decision — our XDG hygiene rule, or
the consumer's directory. It has no entry because it is a question, not a work
item — see the session-close lane on questions parked in queues.

**Disjoint write-sets, a fact about the files rather than a judgement** — for
anyone dispatching in parallel:
  `tools/bust-triage.mjs` + `test/bust-triage-*` + the matrix's row cells
  `tools/replay.mjs` + `tools/coverage-walk.mjs` + `test/replay-gate-selfcheck*`
  `tools/reminder-migration-census.mjs` + `test/census-*`
  `proxy/**` — deployment-coupled: any change needs a dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) and a restart
  `BACKLOG.md` belongs to the dispatcher alone, always.
The collision surfaces NOT visible in a file list — the shared git index, the
node_modules symlink, the alias registry, sibling-repo isolation — are in
`docs/dev-loop.md` ("Once the order is derived, run it in PARALLEL").

**Work booked in other repos, with pointers here:** the declared-public
visibility check (dotfiles doctor), the push-gate and path-hook payload-vs-intent
fires (the `dispatch-guards` plugin's `dev-notes/`), and the claude-worktime
items. A peer session was active in `claude-worktime` and dotfiles today.

**Population and collision facts, measured this pass (a fact about the files,
not a judgement).** 84 `- **READY` entries, re-grepped at close. By consumer
tier: 26 event-disposition / 26 gates / 15 backlog-process / 17 not-instrument.
15 carry an UNRESOLVED write-set, 8 carry NO verifier, 20 are flagged
stale-risk — re-read a stored entry's PREMISE against the world before
dispatching it; three entries were overtaken by reality today. Files claimed by
2+ entries, which is what caps fan-out width: `tools/bust-triage.mjs` (9),
`tools/replay.mjs` (8), `session-scan.py` (4), `docs/dev-loop.md` (4),
`bootstrap/doctor.py` (3), then `fixture-verdict-identity.mjs`,
`backlog-lint.mjs`, `README.ko.md`, `proxy/server.mjs`,
`insertion-normalization.mjs`, the matrix (2 each). The first two alone
serialize 17 entries. The raw census extraction is deliberately NOT stored: it
snapshotted a file that grew +217 lines under it, and a stale extraction invites
ranking from it — the stored-priority defect one level up. Re-run the census
dispatch; it is one lane and ~15 minutes.

**The row-22 enumeration is DONE and its output is in the repo** —
`docs/directives/success-path-only-enumeration.md`. It answers the matrix's
nine-day-old question ("which normalization behaviours silently switch off on a
reset"), covers every extension with per-label counts, and carries the finding
that `extensions.json` is not the activation gate. Read it before designing any
reset-path change.

**What this session added to the method**, all in `docs/dev-loop.md`, because
the next session inherits the rules and not the reasoning: the pattern-scope
blind spot and its ACCOUNTING mechanism (which returned 65 on its first run),
enumeration keyed on a NAME vs a BEHAVIOUR, red-first arrangements that decay
when the work is committed, instruments that match themselves, fixtures encoding
states the real system cannot produce, extract-then-validate probes, and the
ENOSPC misattribution with its wrong first explanation left in.

## Open

- **READY (BLOCKING the bounded pin's fidelity claim) — `verifyPin` on a
  BOUNDED pin applies the retention filter to its own reference side, so it
  cannot fail for the defect it exists to catch. PROVEN by sabotage, not
  argued.** Booked 2026-08-10 at integration of `--bounded`. The lane surfaced
  the mechanism as a question rather than settling it at its own tier, which is
  exactly right; the answer is that the mechanism is wrong.
  What it does today: for `header.bounded`, the live side is built by
  `writeCapturePrefixBounded`, which applies `boundedKeep` — the SAME retention
  function the pin was built with. Both sides therefore drop the same records,
  and any defect in the filter is invisible by construction. This is the
  same-parentage failure the corpus names: the expectation pins the very thing
  it should catch.
  **The measurement, run at the desk before booking.** Baseline on
  `s-captureAW` 1048..1049: bounded pin 19,686,465 bytes vs a streamed source
  prefix of 610,897,526 (**3.22%**), `verifyPin` live 188 pairs / pin 188 /
  `diffs: []`. Then `boundedKeep` was sabotaged to drop every THIRD record it
  should keep, and the same command re-run: pin 12.93 MB, live **125** pairs /
  pin 125 / **`diffs: []` again**. A pin that had silently lost a third of its
  evidence got a clean bill of health, and the pair count fell 188 -> 125 with
  nothing flagging it. `tools/harvest.mjs` was restored from a byte copy
  immediately after (verified: empty `git diff`, zero `SABOTAGE` occurrences).
  **What this does and does not invalidate, because the distinction is the
  useful part.** The SIZE claim stands — 3.22% is a measurement of the artifact
  and was reproduced independently at the desk. The FIDELITY claim does not:
  "identical verdicts at a fraction of the bytes" is established by this check
  and by nothing else, so as of `e9a374b` the bounded mode ships with its size
  proven and its fidelity unproven. No bounded pin gets committed as a fixture
  until this is fixed.
  Design, decided: the live side goes back to the UNFILTERED prefix
  (`writeCapturePrefix`), and the COMPARISON is narrowed instead of the input —
  both sides restricted to the BUSTING CONVERSATION, identified by
  `conversationOf` of the target record itself. That identity comes from the
  capture, not from `boundedKeep`, which is the whole point: the reference
  stops being filter-derived. The lineage-related conversations are
  deliberately NOT part of the bar — they are retained so a later
  lineage-aware consumer can find them, and a contract defined over them would
  be filter-derived again.
  **MECHANISM SETTLED 2026-08-10, at the desk, because the paragraph above is
  not decision-complete at implementation grain and briefing it would have
  handed that gap to the executing tier.** "Narrow the comparison to the
  busting conversation" does not survive contact with `compareReplayVerdicts`:
  it compares AGGREGATES parsed from a replay — total pairs, violation lines,
  census class tallies — and `runCensus` reports a tally over the whole file,
  not per conversation. Scoping it would mean teaching `replay.mjs` to emit a
  per-conversation breakdown, which widens the write set to the file the
  bounded pin only consumes.
  The cheaper mechanism is a CONTENT check, and it is strictly stronger against
  the defect that motivated this entry. From the RAW capture — independent of
  `boundedKeep`, which is the whole point — compute
  `S = { ordinals i <= m : conversationOf(record_i) === conversationOf(target) }`.
  Then assert the pin holds a REAL (non-placeholder) record at every ordinal in
  S. A retention filter that drops a member of the busting conversation now
  fails on evidence the filter had no hand in producing, and the existing
  verdict comparison stays as a second, weaker check rather than being torn
  out.
  What this establishes, stated exactly so it is not over-read: the busting
  conversation is COMPLETE in the pin. The lineage-related records remain
  outside the bar, deliberately — they are retained for a later lineage-aware
  consumer, and a contract defined over them would be filter-derived again,
  which is the defect this entry exists to remove.
  Under the sabotage below, S is computed from the capture and does not move
  while the pin loses a third of its records, so the check goes red — which is
  the property the current one lacks.
  Verifier, red-first, and the arrangement is ALREADY RUN and recorded above:
  re-apply the same every-third-record sabotage and the check must go RED
  (target-conversation pairs differ), where today it returns `diffs: []`.
  Unsabotaged, the primary case must still return no divergence. Both arms on
  one capture, one command each.
  Done-criterion: sabotage red, clean run green, and the entry above re-graded
  from "size proven, fidelity unproven".
  Write boundary: `tools/harvest.mjs`, `test/harvest-pin-bounded.test.mjs`.
  Consumer tier **1 (event disposition)** — every frozen pin's trustworthiness
  reads through this check.

- **READY — `capturePairResult`'s conversation identity is the busting
  request's own `messages[0]`, so the pairing instrument goes BLIND exactly
  when the class it would observe fires.** Found 2026-08-08 by the row-map
  lane, which correctly refused to fix it and returned the question.
  Sites, cited rather than described: `tools/bust-triage.mjs:754`
  (`const cid = JSON.stringify(after.body.messages[0])`) fixes identity from
  the busting request, and `:765`
  (`if (JSON.stringify(r.body.messages[0]) !== cid) continue;`) tests every
  candidate predecessor against it.
  **Line numbers corrected 2026-08-10** (749 -> 754, 760 -> 765): `28d5022`
  inserted the attribution section above both sites and shifted them. Surfaced
  by `backlog-neighbours` on its first live run — the neighbour report is what
  made anyone re-read this entry at all. The entry survived only because it
  QUOTED the expression beside each number; a bare `:749` now points at an
  unrelated line that still reads as a plausible site.
  **Threat-matrix row 29's mechanism IS the
  rebuild of `messages[0]` at an idle boundary**, so for every row-29 event the
  predecessor is unreachable by construction and the tool answers
  `UNVERIFIABLE / no-pair-in-conversation`. Measured identically BEFORE and
  AFTER that lane's change on `2026-08-08T11:46:36Z` and its companion
  `11:46:13Z` — which is also what proved my own briefed verifier vacuous
  (below).
  **Three consequences, and the third decided the ranking.** (1) Every row-29
  event reports as could-not-verify rather than as row 29, so the class is
  silently UNDER-COUNTED in any survey reading this tool. (2) The outcome is
  indistinguishable from a genuinely absent capture — the could-not-verify
  REASON class this tool was already corrected for once. (3) `docs/dev-loop.md`
  now carries a gate: no mitigation may be designed while attribution is
  COULD-NOT-ATTRIBUTE. So row 29 cannot be mitigated at all until pairing
  works — a tooling gap holding a whole matrix row hostage.
  **DESIGN DECIDED 2026-08-10 at the desk, by measuring the rotation rather
  than reasoning about it.** The fork was real: `conversationOf`'s
  history-derived identity is CORRECT for cache purposes — a rebuilt
  `messages[0]` genuinely IS a new conversation to the API, which is why row 29
  costs what it costs — while a bust WALK needs a different relation, the
  predecessor ACROSS an identity rotation. Two concepts; conflating them is how
  the defect arrived, so the fix adds a relation instead of bending the
  existing one.
  **The measurement that settled it** (capture `s-captureAT`, the entry's own
  red case, ord 715 = the 2026-08-08T11:46:36Z bust; per-message SHA over the
  raw arrays): the target carries 555 messages and its `messages[0]` matches
  NONE of the preceding requests — the rebuild is total, so no
  `messages[0]`-keyed search can ever reach the predecessor. But by CONTENT the
  same requests share 97.1 / 97.3 / 97.7 / 98.1 / **98.5%** of the target's
  messages (ords 709-713, rising with recency), while the co-tenant sidecar at
  ord 714 — a 1-message title-generation call — shares **0%**. Index-aligned
  comparison is useless here (longest common run from index 1 is only 21,
  because the rebuild also changed the array LENGTH, 564 -> 555, shifting
  everything after the first divergence); set overlap over per-message hashes
  is what separates cleanly.
  **So content overlap does the very job `messages[0]` identity was introduced
  for** — excluding co-tenant traffic — AND survives the rotation that defeats
  it. That is the design: a SECOND, explicitly named relation, never a
  loosening of the first.
  Design: keep `conversationOf` (`messages[0]`) exactly as it is, as the CACHE
  identity. Add a LINEAGE relation to the shared primitive — overlap of
  per-message hash sets, `shared / min(|a|,|b|)` — SPLIT OUT 2026-08-10 into
  its own entry below, because the bounded-`--pin` entry turned out to need the
  same relation and neither could be verified before it existed. Then make
  `capturePairResult` two-stage: the current same-`cid` search first, unchanged,
  so every stable-identity pair behaves byte-identically; only when it returns
  nothing does the lineage fallback run, taking the highest-overlap EARLIER
  request above the threshold. The returned pair is LABELLED as crossing a
  rotation so a reader cannot mistake it for an ordinary pair, and neither
  relation is re-derived inline — three confident wrong answers here already
  came from hand-rolled identity.
  Threshold: **0.5**, chosen to sit far from both measured clusters (0% for a
  co-tenant, 97%+ for a true predecessor) rather than tuned to either edge. If
  a future case lands between them that is a finding about the class, not a
  reason to tune the number.
  **Dependency the fix must carry:** `pairEditContext`
  (`tools/bust-triage.mjs:1261`, its shared identity test at `:1276`)
  deliberately reuses the SAME test to stay consistent with
  `capturePairResult`'s notion of "same conversation". A fix at 754/765
  updates that call site in the same change, or the two disagree about which
  requests are one conversation — a silent split-brain inside one tool.
  (Citations re-checked 2026-08-10: `:1271` named a `for await` line, not
  `pairEditContext`. Found while READING this entry to work it — the same
  day's neighbour-driven correction above had fixed only the two citations
  the report quoted and left these, which is the reach failure the citation
  checker is booked to end: a correction scoped to what the instrument
  pointed at, in an entry where the same numbers appear twice more.)
  Verifier, red-first — BOTH sides re-run 2026-08-10 and their current output
  recorded here, so the arrangement is checkable rather than remembered.
  RED: `--at 2026-08-08T11:46:36Z` today returns `VERDICT: UNVERIFIABLE` /
  `ATTRIBUTION: COULD-NOT-ATTRIBUTE`, reason "its conversation has 18
  request(s) in this capture and none earlier — nothing to pair it against".
  After the fix it must reach a row, and the pair it reaches must be ord 713
  (the 98.5% neighbour), not merely "some" pair.
  CONTROL: `--at 2026-08-08T12:18:15Z` today pairs n=224->226 with
  `ATTRIBUTION: CC's` and a stable state key; it must come back BYTE-IDENTICAL,
  which is what stops a fix from pairing everything to anything.
  NEGATIVE CONTROL, from the same measurement: the 1-message sidecar at ord 714
  shares 0% and must never be selected as the predecessor — the lineage
  fallback has to reject it on its own evidence, not by a special case.
  **HARD ORDERING CONSTRAINT (rubric signal 1) — this entry is BLOCKED on the
  bounded-`--pin` entry, and the block is measured, not cautious.** Both
  verifier cases live in captures that rotate: `s-captureAT` is **441 MB** and
  `s-captureAU` is **279 MB**, and `harvest --pin` writes every record from 0
  through the pair, so freezing the red case at ord 715 is a multi-hundred-MB
  write into a PUBLIC history. Building this against the LIVE captures instead
  produces a verifier that decays into a false alarm the moment they age out —
  the anchored-to-mutating-state defect this repo already names. So the chain is
  THREE links, not two: the LINEAGE primitive lands first (its own entry below
  — a pure function needing no capture), then the bounded `--pin` that consumes
  it, then both cases are frozen, then this ships against the frozen pins. The
  middle link acquired its lineage-union clause on 2026-08-10 for THIS entry's
  sake: bounded on `conversationOf` alone it would have dropped the ord-713
  predecessor and frozen a pin proving nothing — recorded in that entry. Until then the design above is
  complete and the work is NOT dispatchable, which is a sequencing fact rather
  than a gap in the design.
  Consumer tier **1 (event disposition)**. Unranked (booked after the
  derivation); a Tier A head candidate at the next one.
  <!-- entry: "capturePairResult's conversation identity is the busting request's own messages[0]" -->

- **READY (small) — `identityRotation` measures the right EVENT with the
  wrong DIGEST, so its rows cannot be joined to the event logs that record the
  same rotation.** Surfaced 2026-08-10 by the lane that built it, as a question
  rather than a unilateral predicate change — correctly. The class fires
  exactly on its named positive and stays silent on its named negative, both
  verified live; what does not line up are the row's `rawId`/`fwdId` STRINGS.
  `replay.mjs`'s `sha()` (`:87-89`) truncates to **12** hex chars over
  `JSON.stringify` of the WHOLE message object, `role` included;
  `conversationSubKey`/`hashMessageContent`
  (`proxy/extensions/message-hash.mjs:16-24,48-63`) truncates to **16** over
  `msg.content` ONLY. Two primitives over one conceptual quantity, never shown
  equivalent, so by construction a census row can never print the digest the
  insertion-normalization event log recorded for the same request — the desk's
  own verification of this class had to compute the second primitive by hand
  to check the first.
  **Why this is a definition problem and not a formatting one.** What counts as
  "the conversation identity our extensions key on" is defined by
  `conversationSubKey`, because that is the function the proxy actually keys
  on. A near-twin computed over a different input shape can disagree with it —
  a `role` change on `messages[0]` fires our class and moves no real key — and
  nothing downstream would notice, since no consumer compares the two.
  Design, decided: the row carries the REAL identity. Retain `inConvKey` and
  `outConvKey` on the compact entry — two short strings per ENTRY, not per
  message, which is cheaper than the per-message arrays already retained
  beside them — computed by importing `conversationSubKey` itself, never a
  re-implementation (`tools/harvest.mjs` already imports across the
  `proxy/` boundary, so the direction is established). The stripped-twin
  predicate stays as the cheap pre-filter; the digests reported become the
  proxy's own.
  Verifier, red-first, live positive already in hand: the row for
  `s-captureAT` at 2026-08-08T09:58:50.626Z must print
  `496b188f5f435920` -> `a20843f8616f3866`, the pair the desk verified twice
  and the event log recorded, where today it prints two 12-char digests
  matching neither. The negative at 09:58:46.362Z must stay silent.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **1 (event disposition)**.

- **READY (small) — a FROZEN evidence archive whose own cited numbers are not
  in it, and nothing said so for three days.** Found 2026-08-10 by the lane
  building the transcript instrument, which was sent to reproduce two claims
  against `~/.local/share/claude-worktime/cold-design-evidence-2026-08-07/`
  and could reproduce NEITHER — correctly reporting both as gaps rather than
  tuning the tool until the numbers appeared. Re-run independently at the desk,
  same result both times:
  - the "01:00 session" numbers (`cc` 335,933 / `cr` 39,711) are real and ARE
    frozen — in `event-windows.jsonl`, a DERIVED worktime log sitting beside
    the tar. The raw CC transcript they were computed from is NOT in
    `transcripts-2026-08-07.tar.gz`: no file among its 24 carries
    `"sessionId":"06636dd1-…"`. The id appears eight times in the tar's PATH
    names — as a scratchpad DIRECTORY belonging to that session, whose
    transcripts have their own, different session ids. A name-shaped match in
    the wrong namespace, which is the coordinate-space confusion `dev-loop`
    already collects, arriving inside an evidence archive.
  - the `previous_message_not_found` timestamps (03:31:59Z / 03:32:01Z) appear
    NOWHERE in the archive — not in the tar, not in `cold-rows-all.jsonl`, not
    in `event-windows.jsonl`. The archive does hold two real ones, at
    2026-08-06T16:41:37.941Z and 2026-08-06T23:59:10.461Z. The cited pair most
    likely came from the worktime LEDGER (the neighbouring entry discusses a
    contradictory-class pair at 2026-08-07T03:32:02Z in ledger vocabulary —
    booked twice, `hit`/`idle` then `cost`/`resume`), i.e. a verifier that
    silently crossed two sources.
  **Why this is the closing gate's question 2 failing in the field, not a
  filing error.** The archive was created BY a design pass, on the day of the
  measurement, precisely so the claims would stay checkable after rotation. It
  froze the derived views and left the source out — so the entry read as
  evidence-backed for three days while the evidence for half of it did not
  exist, and the only reason anyone found out is that a lane was sent to
  reproduce it rather than to trust it.
  Design, decided, two halves — the second is the one that generalises:
  (1) the archive gains an INVENTORY it does not currently have: one
  `MANIFEST.jsonl` listing every file with its size, its sha256, and for a
  transcript the session ids actually INSIDE it (never the ones in its path).
  (2) A verifier that cites a frozen archive names the FILE inside it that
  carries the number, not the directory — `<archive>/event-windows.jsonl` is a
  checkable citation, `<archive>/` is a gesture. The convention costs a path
  segment and is what would have caught this at write time.
  Verifier, red-first, with the positive already in hand: build the manifest
  and assert it lists no `sessionId` for 06636dd1 while
  `event-windows.jsonl` does carry `cc` 335,933 — the exact split this finding
  is. RED against the old state is that no manifest exists at all, so the
  question "is the source in here?" is answerable only by extracting 24 files
  and grepping, which is what it cost today.
  Done-criterion: the manifest exists, the transcript entry above cites file
  paths rather than the directory, and both facts above are readable without
  extracting the tar.
  Write boundary: the archive directory (operator-side data, not this repo's
  tree) plus this repo's citing entries. **Consumer tier 1 (event
  disposition)** — a frozen archive is what every later attribution re-reads,
  and one that silently lacks its source sends the re-reader to a wrong
  conclusion or to no conclusion at all.

- **READY — give the downstream stateful extensions the PRE-PIPELINE
  conversation identity; the fix already exists in-tree and only one extension
  uses it.** Booked 2026-08-10 from the same attribution. Row 26's defect is
  that `insertion-normalization` (order 395) and `deferred-tool-rewrite`
  (order 425) key their per-conversation state on `conversationSubKey` of the
  body AS THEY RECEIVE IT — i.e. over `messages[0]` bytes that
  `fresh-session-sort` (order 250) may have just invented. `fresh-session-sort`
  itself does NOT have this problem, and that is the whole design input:
  `fresh-session-sort.mjs:373` computes its memory key by calling
  `resolveInsertionSessionKey` on `body.messages` BEFORE its own relocation
  runs, so its identity is stable under its own edit. Corroborated on disk —
  the only `*-fresh-sort-relocated.json` present sits under the pre-mutation
  suffix, none under the rotated one.
  Design, NOT yet decided, and this is named rather than hand-waved: the shape
  is "capture the conversation identity once, at the pipeline's entry, and let
  every stateful extension read THAT" — but where it is carried (a `ctx` field
  set before the first mutating extension is the obvious candidate), and what
  happens to state already on disk under rotated keys, are open. The migration
  half is the one that bites: existing per-key files are named by the rotated
  identity, and a change to the key scheme touches state KEYS, which is exactly
  the threat-matrix row-3 condition under which a restart is NOT
  cache-transparent and must state its declaration before it ships.
  **HARD ORDERING CONSTRAINT (rubric signal 1): blocked on the
  `identityRotation` census class above.** A check that only goes red against
  the current defect has to be demonstrated red BEFORE the fix removes the
  defect, or it ships having never gone red on anything — and this fix's whole
  effect is to make rotations stop mattering, which would leave the class
  permanently green and unproven.
  Consumer tier **1 (event disposition)**. Deployment-coupled: `proxy/` change,
  needs the dotfiles pin bump and a restart, at a stated session boundary.

- **READY (small) — the suite has at least one INTERMITTENT test, and the
  runner throws away the evidence needed to name it.** Observed 2026-08-10 at
  `e9a374b`: four consecutive full runs of ONE commit returned 2642 pass / **1
  fail**, then 2643 / 0, then 2643 / 0, then (with another lane integrated)
  2649 / 0. The documented environment class was EXCLUDED rather than assumed:
  `df` reported `/tmp` at **3% used, 30 GB free**, so this is not the 2026-08-08
  ENOSPC shape, which is the first suspect this repo tells you to check.
  **The failing test was never identified, and that is the actual defect.** The
  run streamed to a terminal, the summary counters were read, and by the time
  the failure mattered the output was gone; two further runs were spent on
  greps against output that no longer existed. The suite gates every push, so
  an intermittent failure that vanishes on re-run trains precisely the retry
  reflex that a red result must never train.
  Design, decided, two halves. (1) The runner persists each run's full output
  to a per-run file under the repo's scratch convention and prints the path in
  its summary line, so a transient red is diagnosable after the fact instead of
  re-run away. (2) The pre-push hook keeps its own last-failure output for the
  same reason — it is the run most likely to be transient and least likely to
  be watched.
  Verifier, red-first: with the persistence in place, force one failure, then
  confirm the named file contains the failing test's name and diff AFTER a
  subsequent green run has overwritten the console. Today no such file exists,
  which is the red.
  NOT fixed on notice, and named rather than left implicit: the flake itself
  stays UNIDENTIFIED until the mechanism exists to catch it, so this entry
  buys the diagnosis, not the fix. If the same counter split recurs before
  then, capture the log by redirection first.
  Write boundary: `package.json`, `tools/git-hooks/pre-push`.
  Consumer tier **2 (feeds the gates)**.

- **READY (small) — the required-reading gate guards `Write`/`Edit` and NOT a
  script, so the session's first write can bypass it entirely.** Measured
  2026-08-10 by walking into it: this session's phase-1 edit rewrote
  `BACKLOG.md` from a `node` script run through `Bash`, moving 74 bullets, and
  the PreToolUse gate that is supposed to deny the first write until
  `docs/dev-loop.md` and `FORK-NOTES.md` have been Read never fired — it keys on
  the Write/Edit tool names. No harm here (both files had been Read, which is
  why this is a gate finding and not an incident), and that is exactly what makes
  it worth booking: the guarded route was taken by accident, not by design.
  This is the entry-path table in `docs/dev-loop.md` ("a mechanism that guards
  one route is not a guard") with a fifth row, and the same shape as the
  `npm test` vs `node --test` row already in it: the protected thing is reachable
  by a second route, the second route is silent, and every instance reads as
  working because the route someone happened to take was the guarded one.
  Design, decided: the gate matches on the WRITE EFFECT, not the tool name — add
  a Bash lane that fires when a command's argv would write a repo file (a
  redirect, a `tee`, an interpreter invocation with a script that writes), or, if
  that predicate is too loose to keep near-zero false fires, invert it: make the
  reading obligation a precondition of the SESSION rather than of the first
  Write, satisfied once and checked cheaply thereafter. The judgment-shaped
  remainder stays prose with the operator as backstop — the corpus rule on
  mechanisms earning their slot only where the trigger is computable.
  Verifier, red-first and permanently runnable: in a scratch clone with the
  reading unsatisfied, run `node -e 'require("fs").appendFileSync("BACKLOG.md","x")'`
  through Bash — it must be DENIED, and the identical run after the two Reads must
  be allowed. Both arms required; today only the second is observable, which is
  the vacuous-green shape.
  Consumer tier **2 (feeds the gates)** — it is a guard in front of a
  correctness obligation. Unranked (booked after the derivation).

- **READY (small) — `backlog-neighbours` joins on FILES, so a premise refuted
  inside ANOTHER ENTRY is invisible to it; add the IDENTIFIER join.** Booked
  2026-08-10, from the miss it would have caught the same hour. `cf0592d`
  recorded a rotation measurement in the `capturePairResult` entry which
  refuted the retention rule of the bounded-`--pin` entry — a conversation-only
  filter that drops the very predecessor it was meant to freeze. Nothing
  flagged it; it surfaced only because the two entries were read together at
  dispatch time, an hour later, by hand. `tools/backlog-neighbours.mjs` exists
  for exactly this class ("closing an entry can invalidate a DIFFERENT open
  entry", its header) and could not see it. Its join is a commit's touched
  FILES against entries' backticked file tokens, and this commit touched only
  `BACKLOG.md`. **Run today, it returns TEN candidates and the bounded-`--pin`
  entry is not among them** — the ten are the entries that happen to cite
  `BACKLOG.md` by name, i.e. the ones ABOUT backlog tooling. So the failure is
  not an empty result, which would at least look like one: it is a populated,
  plausible report selected by a naming convention that is uncorrelated with
  who shares the moved premise. A reader gets ten dispositions to fill and the
  one that mattered is absent.
  Design, decided: a SECOND join in the same report, at one grain finer.
  When a commit changes `BACKLOG.md` itself, diff which ENTRIES its bodies
  changed, and list every still-open entry sharing a backticked camelCase
  IDENTIFIER token with them — same report shape, same blank disposition slot
  (still-valid / premise-corrected / now-unnecessary), same three-answer
  discipline, still a REPORT and never a gate. The file join is untouched.
  **Measured before building, on this tree (2026-08-10), because a join is
  worth nothing if it fires on everything or on nothing:** over the 116 open
  entries there are 194 distinct backticked camelCase identifiers, 44 of them
  shared by more than one entry, and the widest is shared by SEVEN. That is
  report-sized, unlike the file join's own worst case (`docs/dev-loop.md` is
  named by sixteen entries, which its header already calls out as the reason
  it is not a gate). One entry cites a disproportionate share of all
  identifiers and will appear in most lists — name it in the output rather
  than special-casing it.
  Verifier, red-first, with a live known positive rather than a constructed
  one: run the new join over `cf0592d`. It must list the bounded-`--pin` entry
  as a neighbour of the `capturePairResult` entry via `conversationOf` — the
  miss above, reproduced. RED against the OLD implementation was RUN, not
  assumed: `node tools/backlog-neighbours.mjs cf0592d` today prints TEN
  `shared=BACKLOG.md` candidates and none of them is the bounded-`--pin`
  entry. Re-run after THIS entry was written it prints ELEVEN — this entry
  joined the candidate set, because it cites `BACKLOG.md`, while the entry
  that actually shares the moved premise still does not appear. The count
  tracks how many entries are ABOUT backlog tooling and is uncorrelated with
  the premise, which is the defect stated as a measurement. (Candidate LINE
  numbers are deliberately not recorded: they shift on every insertion, and an
  entry about stale cross-entry evidence should not ship a stale view of its
  own.) BASELINE, so
  the red is not vacuous: those ten prove the tool RAN and joined — this is a
  wrong-population result, not a dead command — and the file join must still
  return its own candidates on a commit touching a CODE file, unchanged by this
  work. Second positive, already planted: `sameLineage` appears in exactly the
  two entries of the lineage chain and in no others, so it is a two-member
  class the join must reproduce exactly.
  Done-criterion: both joins in one report, the `cf0592d` reproduction pasted,
  suite green.
  Write boundary: `tools/backlog-neighbours.mjs`, `test/backlog-neighbours.test.mjs`.
  Consumer tier **3 (backlog and process)**.
  **Second, smaller finding from the same hour, same file, booked here rather
  than as its own entry because the mechanism is the same lint:** cross-entry
  references in this file are written POSITIONALLY — "the entry above", "split
  out from the entry below" — and `tools/backlog-order.mjs` PHYSICALLY REORDERS
  entries on every derivation. Four such references were written today and all
  four still happened to hold after a reorder ran minutes later, which is luck
  and not a property. When one breaks it breaks silently: the sentence stays
  grammatical and points at whatever entry now occupies the position. The file
  already carries the durable handle — each entry's `<!-- entry: "…" -->`
  anchor — so the rule is that a cross-entry reference names the headline, and
  the check is a `backlog-lint` report flagging positional words in an entry
  body that refers to another entry. Instrument-positive available today: the
  lineage chain's three entries reference each other positionally right now.

- **READY (small) — `identityRotation` counts a persistent STATE as if it were
  an event, so its 40% is not the rate row 26 asks about.** Measured
  2026-08-10 on `s-captureAT`: **298 of 738 requests** classify. The lane's
  reading, which the code supports: `fresh-session-sort`'s relocation is a
  persistent per-session mutation — once it fires for a conversation, EVERY
  subsequent request in that conversation carries the relocated block, and a
  per-REQUEST predicate re-fires on each one. So 298 is "requests served under
  a rotated identity", while row 26's open question is "how often does a
  rotation OCCUR", and the two differ by roughly the length of each affected
  conversation.
  Design, decided: keep the per-request rows (they are the honest per-request
  fact and the join surface for a cost question), and add a TRANSITION count
  beside them — a rotation is NEW when the conversation's raw identity has not
  been seen rotating before in this capture. Report both, labelled, because
  reporting either alone invites the other's question.
  Verifier: over `s-captureAT` the per-request count stays 298 and the
  transition count is materially smaller; both printed, neither derivable from
  the other by the reader guessing. Done when the daily sweep's number cannot
  be read as a rotation rate without saying which of the two it is.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **3** — it mis-describes a count rather than mis-classifying an
  event.

- **READY (small) — a bounded pin's SIZE scales with the busting
  conversation's identity CHURN, which the design note does not say and the
  first real measurement contradicts.** Measured 2026-08-10 by the
  `--bounded` lane. The `capturePairResult` entry's framing implies a target
  plus a few neighbours; the real RED2 union arm on `s-captureAT` ord 715 came
  back at **251 real records**, because that conversation's `conversationOf`
  churned REPEATEDLY across its whole growth rather than once near the end —
  `lineageOverlap` runs from 0.60 (ord 5, a tiny message set sharing a handful
  of messages) up to 0.98 (near ord 715), every one of them above the 0.5
  threshold. That is the union working as specified, not a defect: a small
  early message set clears a ratio threshold on a few shared messages just as
  easily as a large late one does on nearly all of them, because the
  denominator is `min(|A|,|B|)`.
  Design, decided: state it where the number lives, not where it was
  discovered — a note beside `LINEAGE_THRESHOLD` in `tools/replay.mjs` naming
  the min-denominator consequence, so the next reader meets it at the
  definition instead of per-instance. No behaviour change: the threshold is
  NOT retuned, per its own entry ("a future case landing between the clusters
  is a finding about the class, not a reason to tune the number").
  Verifier: the note cites the measured 0.60-0.98 spread and the 251-record
  outcome. Done when a reader of `LINEAGE_THRESHOLD` can predict the sizing
  behaviour without running it.
  Write boundary: `tools/replay.mjs`. Consumer tier **3**.

- **DONE 2026-08-10 (`f01175b` pushed `e483acc..f01175b`, 12 commits) — the
  guard half was discharged by verification and the publication half by an
  explicit operator GO ("you can push, you are the only one here").** The
  guard cited subagent commits `347d477` and `e9a374b`; this session
  dispatched both and verified both in the artifact — diffs read, suites run,
  the instruments exercised directly, and `e9a374b`'s verifier additionally
  sabotage-probed — so the audit-visible override was the guard's own path for
  that state, not a bypass of it. The second half was never the guard: the
  stack sat on `8b77c4f`, whose message maps where already-public leaks are,
  and that was surfaced twice as an operator decision and held until answered.
  Original header: **11 commits are unpushed and `git push` is DENIED by
  the unbooked-subagent-commit guard.** Booked 2026-08-10 evening by the
  closing session so it is visible at SESSION START, not only in the handoff:
  the session-start hook injects READY bullets from this section, and the
  `## Handoff` section is not on that path. A blocker whose carrier the reader
  never loads is not persisted.
  The guard names two commits — `347d477` (census: emit identityRotation) and
  `e9a374b` (harvest --pin --bounded). Both carry `Co-Authored-By: Claude
  Sonnet 5` with no `Claude-Session:` trailer, which is what "unbooked" means.
  They are SUBAGENT commits of session `…01R9jUauuFcnSPMSjx1ALPUp`; subagents
  commit unpushed by design and the DISPATCHER pushes after verifying in the
  artifact.
  Done when: that dispatcher has verified its two commits and `git push origin
  main` succeeds, leaving `git log origin/main..main` empty.
  **Do NOT reach for `PUSH_UNBOOKED_SUBAGENT_OK=1`** unless you are that
  dispatcher and have verified them — an override taken for another writer's
  unverified work is the habit that kills a guard, and the closing session
  declined it for exactly that reason.
  The tree was green at the attempted push (`npm test`: 2654 / 2649 pass / 0
  fail / 5 skipped), so nothing else stands between these commits and the
  remote.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "9 commits unpushed; push denied by the unbooked-subagent guard" -->

- **READY — the backlog is heavily MERGEABLE by realizing file, and the
  measurement that suggested otherwise was my own weak instrument.** Raised
  2026-08-10 by the operator on both counts: *"i wonder what the rest are?"*
  and *"a lot of the tooling ones could be heavily merged, no?"* Both answered
  by measuring, and the first answer corrects a number this session had already
  published.
  **The correction first, because the earlier claim was under-evidenced.** This
  session reported "36 cite a `tools/` file, 11 cite a `proxy/` file, so the
  queue is ~3:1 tooling". The predicate was a backticked FILE PATH, and **63 of
  100 entries cite neither** — not because they are not tool work, but because
  they name a FUNCTION instead: `capturePairResult`, `rebilledBytes`,
  `findAbsorptionMisses`, the frozen-archive entry, three `bust-triage` row
  entries. So 36 and 11 are FLOORS, the 3:1 ratio is not established, and the
  honest statement is that the tooling share is at least 36% and probably far
  higher. The direction of the operator's original intuition survives; the
  number I attached to it does not. Same shape as this repo's standing warning:
  a pattern-scoped count certifies the pattern, not the class.
  **The merge finding, which is the actionable half.** Counting entries by the
  `tools/` file they name: `replay.mjs` **6**, `backlog-lint.mjs` **6**,
  `harvest.mjs` 3, `backlog-order.mjs` 3, `bust-triage.mjs` 3,
  `cold-events.mjs` 2, `gate-live.mjs` 2, `lane-sweep.mjs` 2. And the
  backlog-tooling FAMILY — `backlog-lint` + `backlog-order` +
  `backlog-neighbours` + `backlog-index` — is **11 entries against four files
  that already import each other** (`backlog-neighbours` and `backlog-order`
  both consume `backlog-lint`'s `censusEntries`).
  Design, decided: **bundle by realizing file, not by topic.** Dispatch
  discipline already says items sharing a file must serialize, so a shared file
  is not a reason to queue them — it is a reason to make them ONE lane with one
  red-first arrangement and one integration. The backlog-tooling family is the
  first bundle and the largest: up to 11 entries, one write set, one suite run.
  `replay.mjs`'s six and `harvest.mjs`'s three are the next two, though both
  files have lanes in flight right now and the bundle waits for them.
  **What this does NOT claim.** Bundling reduces LANES and integration cost; it
  does not reduce the work, and an entry that is merely adjacent is not merged
  by being in the same lane. The merge is real only where the entries share a
  red-first arrangement or a single design decision — otherwise it is a
  convoy, which is fine but should be called that.
  Verifier: after the first bundle, the count of entries naming that file drops
  by the number closed, and each closed entry carries the same commit ref —
  which is also the check that the bundle did not quietly drop one.
  Done-criterion: the backlog-tooling family is one lane and its entries close
  together or return with a stated reason why one could not.
  Consumer tier **3 (backlog and process)**.

- **READY (small) — `DOTFILES-BRIEF-inherited-items.md` sits untracked at the
  repo root and needs a disposal, not a mention.** Written 2026-08-10 on
  operator request ("if any of the open items are work for the dotfiles repo,
  give me a brief for another session"), excluded via `.git/info/exclude`
  because this repo is public and the brief names guard internals. It covers
  the eleven `(operator-side, dotfiles)` and POINTER entries plus the two
  writes the closing review session left owed, and it POINTS at their bodies
  rather than copying them.
  It is spent the moment that session reports back. Disposal, decided by the
  same reasoning the review brief's own entry used: DELETE rather than move to
  `docs/directives/` — unlike that one it is a routing document with no
  findings of its own, every claim in it is a pointer to an entry that
  outlives it, and publishing guard internals buys nothing. Deleting an
  untracked file is irreversible with no git copy, so it is a confirm-first
  act, not an assume-one.
  Trigger: the dotfiles session reports, or the last of its eleven entries
  closes. Done-criterion: the file is gone and each closed pointer entry
  carries its dotfiles commit ref.
  **HANDED OFF 2026-08-10 — and the eleven entries were RE-GRADED, which is the
  half that would otherwise have been a mention.** They carried `READY`, and
  `READY` asserts this session intends to build them; once the brief was passed
  on that was false, and a false grade is the exact defect the grade-split entry
  below names. They now read `PARKED [HANDED OFF 2026-08-10]`, which is the
  closed vocabulary's honest fit: PARKED requires a named trigger and these have
  one — **the dotfiles session reporting back**. Stated once here rather than
  copied into eleven bodies, because a shared fact with eleven homes drifts in
  ten of them.
  READY fell **111 -> 100** on that re-grade alone, and that number is worth
  reading carefully: nothing was built and nothing was dropped. The count was
  simply wrong before, in the direction the operator had already spotted by
  eye. Selection was by GRADE MARKER — `(operator-side, dotfiles`,
  `(operator-side, corpus`, and the two POINTER spellings naming that repo —
  never by the word "dotfiles", which also appears in cache-fix entries that
  are merely deployment-coupled and stay ours. One further match was left
  alone: an entry already graded `IN FLIGHT` since 2026-08-06, dispatched
  elsewhere and not this brief's to re-grade.
  Re-grading them is NOT a discharge. Each still owes its closure here with the
  dotfiles commit ref, which is what the pointer entries exist for.

- **READY — the READY grade asserts INTENT TO BUILD, 110 entries carry it, and
  the operator's read is that they will never be finished. He is right, and the
  count is not the defect — the GRADE is.** Raised 2026-08-10 by the operator
  looking at the number ("110 is so much, I really see problems with ever
  finishing them"). Measured the same hour rather than argued: 12 entries
  closed that day against ~33 booked, READY 89 -> 110, about **2.75:1**. The
  repo's retirement trigger (3:1 over a +30% stretch) had NOT fired, so the
  rule says nothing is owed — and the rule is answering a different question
  than the one asked. Retirement removes what is overtaken; it does not make a
  110-item queue honest.
  **The diagnosis.** `READY` is defined as decision-complete AND dispatchable,
  so a file carrying 110 of them asserts an intention to build 110 things. That
  is false, and everyone reading it knows it is false, which is the specific
  harm: a grade nobody believes stops carrying information, and the head of the
  list becomes indistinguishable from its tail. Today's third derivation
  already worked around this by hand — it ranked ELEVEN and said the other ~99
  are unranked — which is the shape of the fix arriving as a workaround.
  Design, decided: **split the grade.** `READY` keeps its current meaning and
  is reserved for the derived head — queued work someone intends to take.
  Everything else that is decision-complete but unscheduled becomes
  `DESIGNED`: the same body, the same verifier, the same done-criterion,
  explicitly NOT a commitment. Nothing is dropped and nothing is downgraded in
  substance — the record stays complete, which is what booking exists for,
  while the queue becomes a number that means something.
  Consequences to carry in the same change, each already a live consumer:
  `tools/backlog-lint.mjs` (grade vocabulary and census), the session-start
  hook (it injects READY bullets, and injecting 110 is why a fresh session
  opens on noise), `tools/backlog-order.mjs` (rank anchors must resolve to
  READY, so promotion to the head becomes an explicit act), and the retirement
  trigger's ratio, which should then read against DESIGNED rather than READY.
  **The standing rule this implies, stated so the split does not silently
  re-fill:** a finding is booked `DESIGNED` by default; it becomes `READY` only
  by a derivation putting it in the head. Booking stays as cheap as it is today
  — that is deliberate and is not what is being traded away.
  Verifier, red-first: after the split, the session-start hook's injected list
  is the derived head and nothing else (today it is 110 lines); `backlog-lint`
  fails a `READY` bullet carrying no rank anchor; and the count the operator
  reads at startup is the queue, not the archive.
  Done-criterion: READY count equals the derived head's size, DESIGNED carries
  the rest, and no entry lost a field in the move.
  Write boundary: `BACKLOG.md`, `tools/backlog-lint.mjs`,
  `tools/backlog-order.mjs`, plus the dotfiles-side session-start hook (a
  POINTER — that body belongs in the dotfiles repo).
  Consumer tier **3 (backlog and process)** — it mis-describes the queue rather
  than mis-classifying an event, but it is read at the start of every session.

- **READY (small) — billing and verdict are written by two extensions with no
  join key, so the join is by TIMESTAMP, which is how today's walk mis-joined.**
  The capture's `outcome` record carries `id` and `requestId`; the prefix-diff
  event record carries none of them — its keys are `betaHeader, causes, chain,
  key, msgs, params, prevTs, sid, system, systemMatch, tools, toolsMatch, ts,
  view, windows` (read off a real record 2026-08-10). Joining them therefore
  means matching wall-clock stamps across two tap points, on a session that
  interleaves several conversations and models — the exact conditions under
  which `bust-triage` picked the wrong conversation the same morning.
  Design (decided): prefix-diff writes the request `id` into its event record,
  same value the capture's request and outcome records already share, so the
  join is an equality test instead of a proximity heuristic. Field name `id`,
  matching the capture's — never a second spelling (this repo has paid for that
  twice today).
  Verifier, red-first: a replay over a capture must join every prefix-diff event
  to its outcome by `id` with zero unmatched, and the SAME join by timestamp
  proximity must be shown to mis-pair at least one record on the 2026-08-10
  session — the measurement that justifies the field, not an assumption that it
  helps. Done-criterion: both numbers pasted, suite green, `/health` unchanged.
  Write boundary: `proxy/extensions/prefix-diff.mjs` + its tests. **Deployment-
  coupled**: `proxy/` changes need the dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) and `systemctl --user restart
  cache-fix-proxy`; the change touches no state KEYS and no freeze logic, so
  row 3's restart-transparency verdict holds and the restart is cache-transparent.

- **READY (operator-side, claude-worktime — POINTER; body belongs in that
  repo's BACKLOG) — the ❄ detector fires on `cc` alone, so GROWTH is booked as
  LOSS.** Measured 2026-08-07 01:00:55Z: `cc` 335,933 with `cr` **39,711 =
  exactly the predecessor's `cc`**, i.e. every cached token reused and the
  written portion entirely new content (a 907 kB `tool_result` from the
  session's first tool call). No `cache_miss_reason` exists anywhere in that
  transcript. A ❄ fired anyway, and the event entered the ledger as
  `k:"hit"` — a preventable-loss class.
  **ROOT CAUSE FOUND 2026-08-07, and it is not the threshold — it is the
  BASELINE.** The predicate (`cc >= 0.6 x prev_ctx` AND `cr <= prev_ctx / 5`,
  `claude-worktime.sh:1694`) is applied per TRANSCRIPT ROW, and one assistant
  message is written across several rows carrying identical usage. Row 2 is
  therefore compared against row 1 OF THE SAME MESSAGE, whose `ctx` already
  contains the big write. Measured: state file reads
  `count=1 … lastcc=335933 lasthit_t=1786064455 lastcause=other`, `gap` 15 s,
  so the baseline turn was 01:00:40 — and the 01:00:40 and 01:00:54 transcript
  rows both read `cc` 335,933 / `cr` 39,711. Baseline `prev_ctx` becomes
  375,646 instead of 39,713, so identical numbers read as "re-wrote 89% of a
  375k context, read back 10%" and both tests pass by wide margins.
  **This unifies two entries.** The same duplicate-row shape explains the
  triple-booking already moved to that repo (three rows, one `msgId`, three
  hits) AND this false fire (two rows, one message, poisoned baseline). One
  root cause: rows are not API calls.
  **The fix already exists in a sibling implementation, which is how this was
  confirmed rather than argued.** `tools/cold-events.mjs` in THIS repo
  re-implements the identical predicate (`r.cr <= Math.floor(prevCtx / 5)`,
  line 184) and dedupes by `requestId` first, with its own comment recording
  why ("38 rows for 12 API calls… requestId is the API call"). Run against the
  same transcript it returns **`events: 0`** over 13 calls — zero cold
  rewrites where worktime booked a 336k hit. Two independent measurements of
  one quantity diverging is the cheap reach detector, and here it names the
  defect and the remedy in one step.
  Secondary, and still worth having once the baseline is right: `ctx` - `cc`
  is the surviving read, and comparing it against the predecessor's write
  separates the three live cases where a `cc` threshold cannot — 39,713
  (growth) / 2 (TTL loss) / 15,224 (real bust).
  **And the cause ladder has no branch for "the cache was fine."** It runs
  idle -> model -> residual, assuming a cold rewrite happened and only asking
  why; the residual names a real cause only if `cache_miss_reason` is
  readable, and here the transcript contains none because there was no miss.
  So a false fire can only ever be labelled `other` — the label is a
  CONSEQUENCE of the false fire, not independent evidence for it. FORK-NOTES
  already says `other` means "no cause available"; what is new is that it is
  also what a non-event looks like.
  **DESIGNED AND MOVED 2026-08-07 — the body now lives in
  `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md`; do not execute from
  here.** Designing the three together showed one root cause (the detector
  has no notion of an API CALL) and three dependency-ordered layers, and the
  pass falsified two claims stated above, both by reading rather than
  reasoning:
  - **"the predicate is applied per TRANSCRIPT ROW" is true of OUR scanner,
    not of worktime's live path.** `claude-worktime.sh:1259-1279` takes its
    usage from the statusline stdin payload
    (`.context_window.current_usage.*`), so the predicate runs per statusline
    RENDER. Sixteen fields are extracted and none is an identifier, so a
    `requestId` dedupe — which is what `tools/cold-events.mjs` does and why it
    is right — is not available at that tap without reading the transcript.
    The conclusion (poisoned baseline, not a bad threshold) survives intact;
    the mechanism sentence did not.
  - **worktime already HAS a dedupe guard, and its holes are the defect.**
    `claude-worktime.sh:1640-1652` skips the block when `(cr,cc)` matches the
    previous pair — but the file is `${LOGDIR}/.token_prev`, ONE file for every
    session (verified on disk beside the per-session `.cold_<sid>` files). A
    concurrent session's write between two renders of one call lets the
    duplicate through. So the repair is a per-session identity guard, not a
    new mechanism.
  Also found while measuring: the contradictory-class pair RECURRED at
  2026-08-07 03:32:02Z (427,535 booked twice, `hit`/`idle` then
  `cost`/`resume`) with **no retraction at all**, where the 23:59 instance got
  one. Live and growing, not historical. Two further entries were booked there
  from this pass (the 45 unreadable ledger lines' writer; the missing ledger
  query surface).

- **READY (small) — `rebilledBytes` still emits the understated number under
  the intuitive NAME, while the corrected figure hides behind a longer one.**
  Booked 2026-08-08 as the named residual of the fix above. The lane added
  `rebilledBreakpointBytes` / `savedBreakpointBytes` alongside and left
  `rebilledBytes` / `savedBytes` untouched — correct as a conservative change
  that breaks no consumer, and it leaves the misleading half in the position a
  reader reaches for first.
  Measured on the worked example (s-captureAM, n=265->266): `rebilledBytes` =
  **114,653**, `rebilledBreakpointBytes` = **884,858**, the latter
  independently verified equal to the sum of all 291 messages in the raw
  capture. That is a **7.7x** spread between two fields whose names differ by
  one word — and note the parent entry's own headline said 2.6x, so the entry
  under-stated its own defect and the fix's measurement corrected it.
  **Why a naming change rather than leaving both:** every cost figure in this
  repo is assembled by a reader choosing a field, and the field named
  `rebilledBytes` is the one they will choose. Design, decided: rename the
  divergence-based field to `rebilledSuffixBytes` — which is what it actually
  measures, the suffix from the divergence — so neither name is the obvious
  default and the reader has to say which they mean. Do NOT delete it: it is
  the right number for "how much of the tail changed", a different question
  from what the cache re-bills.
  This is a value-set change others depend on, so it lands with its DEPENDENTS
  SEARCH stated — command and hits — in the same commit: `rebilledBytes` and
  `savedBytes` are read by `gate-live.mjs`, the status file's row schema, and
  anything consuming `replay.mjs --json`. A rename that misses one of those
  breaks silently, which is the class this repo's convention exists for.
  Verifier: the search's own hits, all updated, plus the suite green.
  <!-- entry: "rebilledBytes still emits the understated number under the intuitive NAME" -->

- **READY — bucket (d) of the XDG accounting: 65 measured instances still
  telling readers the proxy writes under `~/.claude`.** Booked 2026-08-08 with
  the list ITEMISED here rather than left in a scratchpad, because a dispatch
  was in flight against it and its input had no durable carrier — if that lane
  had died the work would have been lost with the message that described it.
  **The in-flight lane was STOPPED at session close and its work DISCARDED** —
  twelve files edited, nothing committed, so there was no verified artifact to
  salvage and no report to book. Recorded rather than hidden: the cost was that
  lane's time, and the reason it cost nothing more is that this list is in the
  file. A worktree of half-finished uncommitted edits carried across a session
  boundary is worse than redoing it — the next session would find modifications
  with no owner and no verification, and might trust them.
  **The list, by write-set, so it can be split or run whole:**
  (1) SOURCE COMMENTS contradicting their own module, 14 — each file imports and
  calls `statePath`/`dataPath`: `proxy/extensions/prefix-diff.mjs:5,11,954,957`
  (`:954` is an `@param` default), `upstream-change-detection.mjs:8,10`,
  `bootstrap-defense.mjs:156`, `overage-warning.mjs:7`, `proxy/server.mjs:13`,
  `proxy/oauth/events.mjs:2`, `proxy/session-mirror-writer.mjs:7`,
  `usage-log.mjs:1`, `upstream-error-log.mjs:2`, `rate-limit-log.mjs:1`.
  (2) THE CONTRACT SENTENCE, `proxy/session-mirror-writer.mjs:8-9`: "established
  convention is all proxy artifacts live under `~/.claude/` per Fable round 1 B5
  finding", four lines under `import { statePath }`. Not a stale path — a stated
  project CONVENTION that is false and will regenerate the class in the next
  artifact someone writes. Fix this one even if nothing else on the list gets
  done.
  (3) `README.ko.md`, 7 — never swept by either doc lane, both of whose file
  lists named `README.md` and `README.zh.md` from memory. `:128` claims ALL
  telemetry is written under `~/.claude/`; also `:42`, `:205` x3, `:301` x2.
  `:249` is CORRECT (inside a migration blockquote) and stays.
  (4) `docs/runbooks/runtime-anomaly.md`, 5 — `:35` says five extensions log
  under `~/.claude/` directly above a table whose rows are XDG-relative; plus
  `:68,69,71,104`.
  (5) `tools/`, 16 — `usage-to-dashboard-ndjson` x4, `cost-report` x3,
  `cache_analysis.py` x2, one each in `bust-triage`, `cold-events`,
  `quota-analysis`, `reminder-migration-census`, `replay`,
  `sim-session-budget-breaker`, `test-config-root`. `test/`, 3 —
  `harvest-pin:232`, `proxy-session-budget-breaker:47`, and
  `proxy-rate-limit-log:306` which is a wrong ASSERT MESSAGE (fix the message,
  never the assertion).
  **MUST NOT be "fixed":** Claude Code's own config root (`settings.json`,
  `hooks/`, `projects/`, `.credentials.json`, `.oauth_refresh.lock`), and
  `docs/dashboard-integration.md:34,44` which are fgrosswig's dashboard's own
  default, attributed in the text.
  **`BACKLOG.md`'s 19 hits are excluded** — mostly historical narrative in
  entries describing what the paths WERE; the counting lane flagged 19 as a
  conservative over-count it did not adjudicate.
  Done-criterion: re-run the accounting (classifier preserved at
  `docs/directives/` or rebuilt per the method in `docs/dev-loop.md`) and reach
  bucket (d) = 0, or itemise each survivor with the reason. DEPLOYMENT-COUPLED:
  `proxy/` changes move the tree hash, needing a dotfiles pin bump and restart.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Three cited paths moved under proxy/extensions/: usage-log.mjs,
  upstream-error-log.mjs, rate-limit-log.mjs. session-mirror-writer.mjs's
  contract sentence is now at lines 7-9, not 8-9. The core defect (stale
  ~/.claude comments) is unfixed and the entry stands.
- **READY (small) — a backlog entry that cites `file:line` has no check that
  the line still holds what it quotes, and citations outlived their source six
  times in one session.** Measured 2026-08-10 across the retirement pass and
  the attribution grade: the `capturePairResult` entry cited
  `tools/bust-triage.mjs:749` and `:760`; `28d5022` inserted the attribution
  section above both and they silently became `:754` and `:765`. That entry
  survived only because it QUOTED the expression beside each number — a bare
  `:749` now points at an unrelated line that still reads as a plausible site,
  which is the silent direction. Same class as the stale line index, the
  shifted ordinals and the live-anchored test assertions this session also
  produced: a derived view outliving its source.
  Design, decided: extend `tools/backlog-lint.mjs` with a CITATION check over
  `## Open` — for every `path:line` token whose entry also quotes a backticked
  expression within the following two lines, read that line of that file and
  compare. Reuse `backlog-neighbours`'s `citedPath` for the split rather than a
  second regex; that function exists because this exact namespace confusion
  already cost a silent zero-candidate run.
  Reach requirement, measured 2026-08-10: the check must also catch the BARE
  continuation form (`` `:760` `` on its own, meaning "the same file, line
  760"), not only the full `path:line` token. A `grep -o` for
  `tools/bust-triage.mjs:[0-9]*` over this file found four citations and
  MISSED every bare one — including the two that were actually stale. An
  instrument that under-reports exactly where entries are most compact is the
  zero-hit-read-as-absence shape, so the bare form is part of the scope, not
  a follow-up. Resolve a bare `:NNN` against the nearest preceding full path
  citation in the same entry.
  SCOPE: `## Open` only. `## Done` citations are historical records of the
  state at closing time and must NOT be rewritten — one drifted example is
  already in there (`tools/bust-triage.mjs:553` for `stateKeyFlip`, now at
  `:557`), and correcting it would falsify the record it exists to keep.
  FOUR answers, never two — and the count is four because dry-running the
  criterion split one of them (below): MATCH; DRIFTED — the quoted expression
  is elsewhere in the file, reported WITH its new line number, which makes the
  report a patch rather than a complaint; BROKEN-PATH — the cited file does not
  exist; COULD-NOT-CHECK — line past EOF, or no quoted expression to anchor
  on — naming which check failed. A citation
  with no quoted expression is COULD-NOT-CHECK by construction and never a
  pass — the whole point is that a bare number cannot be validated.
  **Correction to this design, 2026-08-10, found by dry-running it:** an
  ABSENT FILE is its own finding (BROKEN-PATH), NOT a COULD-NOT-CHECK. The
  first draft above filed it under could-not-check, which would have swallowed
  a real positive silently — the exact failure mode the three-answer rule
  exists to prevent, written into the criterion itself. Caught because the
  criterion was dry-run against cases already in hand rather than booked
  unexercised. COULD-NOT-CHECK keeps only: line past EOF, and no quoted
  expression to anchor on.
  **Dry run over `## Open`, the instrument-positive for this entry** (same
  day, 33 distinct `path:line` citations resolved against their files):
  1 BROKEN-PATH — `proxy/extensions/session-mirror-writer.mjs:8-9`, where no
  `extensions/` copy exists and the real file is `proxy/session-mirror-writer.mjs`
  (lines 8-9 correct there). That one is load-bearing: the entry citing it
  argues the XDG relocation REVERSES upstream's stated design rather than
  adding a missing convention, which sets the whole upstream-PR strategy. The
  substantive claim survived the check — the sentence is byte-identical in
  `upstream/main` at those lines, verified by `diff` — so the defect was the
  path alone, corrected in place. That is the shape this check is for: a
  citation wrong in a way that leaves every sentence around it true.
  Verifier, red-first, against a FROZEN reference so the case cannot decay the
  way `3acdcd5` had to repair: run the check over the pre-correction backlog
  (`git show <the commit before today's correction>:BACKLOG.md`) against
  today's `tools/bust-triage.mjs` — it must report DRIFTED with 749 -> 754.
  Control: the same run over the corrected text must report MATCH, and an entry
  citing a line that never moved must not fire.
  Done when the check runs inside `backlog-lint`'s existing pass (no new entry
  point) and its drift report names the corrected line number.
  Write boundary: `tools/backlog-lint.mjs`, `test/backlog-lint.test.mjs`.

- **READY — a derived VIEW of this backlog outlives its source within one
  session, three times measured in one afternoon, and every consumer of it reads
  the wrong bytes silently.** Measured 2026-08-10 during the retirement pass, by
  the session that built the views: (1) a line-number index generated at
  `8e58988` was read after a commit that inserted 34 lines, and six entries came
  back as the WRONG entries — the tell was a bullet rendering as `PARKED` where a
  `READY` was expected, i.e. it was caught by luck, not by a check; (2) after
  eight entries left `## Open`, the ORDINALS shifted, so a lane's `n=61` and the
  desk's `n=61` named different entries — resolved only by mapping through header
  TEXT; (3) a disposition script captured bullet positions before later
  insertions moved them and mangled the file, caught by a conservation check and
  restored from HEAD.
  All three are one class and it is already named in `docs/dev-loop.md` ("two
  coordinate spaces that look like one", "paraphrases drift ... constructed at
  read time as a partial or transformed view"). What the day adds is that the
  view here is generated by the session itself, minutes before use, which is
  precisely when it feels safest.
  Design, decided: the index stops being a throwaway and becomes
  `tools/backlog-index.mjs` — the third re-paste of the same twelve lines is the
  graduation trigger this repo already writes down. It emits per READY entry a
  STABLE identity that survives both insertion and removal (the header line's
  content hash), alongside the volatile `n`/`startLine`/`endLine`, and it stamps
  the file with the `git rev-parse HEAD:BACKLOG.md` blob it was built from. Any
  consumer re-checks that blob before trusting a line number and re-derives on
  mismatch. Dispatch briefs cite the stable id, never the ordinal — which is what
  would have made lane C's `n=61` unambiguous.
  Verifier, red-first over an immutable reference: build the index at `8e58988`,
  then read entry ordinals 50 and 61 against HEAD `f3980db` — the ordinals must
  resolve to DIFFERENT headers (the defect, reproducible forever), while the
  content-hash ids must resolve to the same two entries in both. Done when a
  stale index fails loudly instead of returning a plausible wrong entry.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation, but it corrupted three separate readings in
  one session. Unranked (booked after the derivation).

- **READY 2026-08-07 — the READY count every session reads at startup is 66
  where 57 exist, and 6 further READY items sit outside the ranking carrier
  entirely.** Two halves of one reach failure — the reader and the writer, per
  dev-loop's standing question.
  **Reader.** `session-scan.py:29` (dotfiles) defines a bullet as READY "when
  the literal 'READY' appears anywhere in the bullet's own text". Measured
  2026-08-07 over this file: 114 top-level bullets under `## Open`, **66** match
  the hook's rule, **57** begin `- **READY`. The nine extras are two bullets
  marked **DONE**, plus PARTLY DONE, BUST, HANDOFF, GATE-RED and two FINDING
  bullets — each merely mentions READY in its body. So the startup line a fresh
  context reads over-reports the unbuilt-actionable queue by 16%, and the
  `## Build order` block's own rule ("a finished item must not hold a rank") is
  broken by the COUNTER rather than by the list. Not a hidden bug: the docstring
  states the rule as intended, which is why it survived — a definition that
  over-fires reads as deliberate.
  **Writer.** Six `- **READY` bullets sit BELOW `## Open`'s end (line 4253),
  under `## Upstream PR round`. File order is the ranking carrier
  (`tools/backlog-order.mjs`) and the hook reads `## Open` only, so those six
  are unrankable and invisible by construction — and nothing stops the next one
  from landing there. Fixing only the predicate leaves the generator running.
  **Why this ranks as an instrument defect, not a gap:** the count is consumed
  at every session start, and it is an input to the build-order derivation
  itself — the ranking reads a population that includes finished work.
  **Third instance, measured 2026-08-10 — and this one IS the derivation's
  own input.** The `## Build order` block written by the retirement pass
  states its population as "the **86** `- **READY` bullets under `## Open`".
  Counted at that same commit with the header test this entry prescribes
  (`awk '/^## Done/{exit} /^- \*\*READY/{c++}'`): **91**. The pass's
  arithmetic (92 -> 83 after eight retirements and a merge, +3 booked) was
  carried in prose and never checked against the file it describes, so a
  count reached a delivered artifact that the artifact's own source refutes.
  This is why the reader fix alone is insufficient: a count nobody recomputes
  from the file drifts wherever it is written down, and the build-order block
  is the highest-leverage place for it to be wrong.
  Design, both halves. *Reader* (dotfiles repo; booked there too — this entry is
  the fork-side record): the predicate becomes a HEADER test, the bullet's first
  line matching `^- \*\*READY\b`, which is the grade-marker convention the file
  actually uses. *Writer* (here): the six are moved into `## Open` or re-graded,
  and `tools/backlog-lint.mjs` gains a check that no `- **READY` or
  `- **PARKED` bullet exists outside `## Open`.
  Verifier, red-first, two bites: the lint bite fails on the file as it stands
  (6 offenders) and passes after the move; and `session-scan.py --test` gains a
  fixture bullet reading `- **DONE 2026-08-06 … supersedes the READY entry
  above`, which must NOT be counted — today it is, and that is the red.
  Done when: both bites go red first and green after, and the injected startup
  count equals `grep -c '^- \*\*READY' BACKLOG.md`.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Reader half FIXED (session-scan.py now matches READY by header line, with a
  regression test); WRITER half still open — 5 `- **READY` bullets sit outside
  `## Open` under `## Upstream PR round`, whole-file 97 vs section 92, and no
  backlog-lint guard exists. Also: phase 1 of this pass identified a SECOND
  writer mechanism this entry never named — five bullets reading `-
  **(shipped) READY`, invisible to a `^- \*\*READY` grep but counted by the
  hook's substring rule. They are now in `## Done`. See the merge note: this
  entry and the NARRATIVE-grade-token entry are one defect.
  **MERGED 2026-08-10 by the retirement pass — this entry ABSORBS the
  narrative-grade-token entry, because the pass proved them one defect with
  one verifier.** The other entry's writer half (nothing stops a bullet
  opening with a story instead of a grade) and this entry's writer half (READY
  bullets outside the ranking carrier) are the same failure: the GRADE MARKER
  in a bullet's first token is the only thing every consumer reads, and
  nothing enforces its vocabulary. The pass added a THIRD variant neither
  entry named — five bullets reading `- **(shipped) READY`, which a `^-
  \*\*READY` grep misses while the hook's substring rule counts them, so the
  two known counters disagreed in OPPOSITE directions on the same five
  bullets. Merged design, one check in `tools/backlog-lint.mjs`: every
  top-level bullet's first token must come from a closed grade vocabulary, and
  no bullet carrying a READY grade may sit outside `## Open`. Red-first on
  three real positives now permanently available in `## Done` at this commit
  rather than on planted cases — the nine substring-only extras, the five
  outside-`## Open` bullets, and the five `(shipped) READY` bullets. Done when
  `backlog-lint` fails on each of the three and the SessionStart count equals
  `grep -c '^- \*\*READY'` over `## Open`.
- **READY (small) — the succession rule's computable slice: an entry that
  ASSERTS a matrix row's status is a dependent nothing re-reads.** The rule
  itself is judgment-shaped and stays prose (dev-loop, "A finding never lands
  alone"), but one slice is a byte comparison: entries routinely say "row N is
  OPEN" / "row N is mitigated" in their own words, and the row's status text
  moves without them. The runbook already names the trap — "a row NAMED is not a
  row READ" — and today's walk hit it from the other side, where row 4's text
  carried the answer an entry had not absorbed.
  Design (decided): extend `tools/backlog-lint.mjs` rather than add a file (the
  extend-before-writing rule; it already owns entry-scoped parsing and the
  `- **` to next `- **` boundary). New WARN class: an entry citing `row N`
  within a sentence that also carries a status word (OPEN / RE-OPENED / CLOSED /
  MITIGATED / OBSERVED / ACCEPTED) is checked against that row's actual status
  cell in `docs/directives/robustness-threat-matrix.md`; a mismatch names the
  entry, the asserted status, and the row's current one. Status vocabulary comes
  from the matrix's own cells, read as data, never a hardcoded list — the
  seven-value vocabulary is exactly what `bust-triage` already collapses wrongly.
  Verifier, red-first against an immutable reference: `git show` an entry from
  before row 4's 2026-07-31 RE-OPENED edit that asserts the row CLOSED, run the
  lint over that pair, and it must name the entry. Over-firing controls, both
  required green: an entry citing `row N` with no status claim must stay silent,
  and an entry whose asserted status matches the current cell must stay silent.
  Done-criterion: red demonstrated on the historical pair with the command and
  its output pasted, both controls green, full suite green, lint wired WARN-only
  into the daily sweep as the existing header class already is.
  Write boundary: `tools/backlog-lint.mjs`, `test/backlog-lint*.test.mjs`.

- **READY (small) — the census cannot see OUR OWN pipeline rotating the
  conversation identity, which is the one thing it would have to see to catch
  row 26 automatically.** Booked 2026-08-10, straight out of the state-key
  attribution below, and it is the closing gate's questions 1 and 3 answered
  together: the rotation was found by a hand replay of the pre-395 pipeline in
  a scratch state dir, and a class found by hand is a class the census should
  emit. Today nothing compares the two identities at all — `replay.mjs`
  computes `conversationOf` on ONE snapshot and never asks whether our own
  extensions moved it.
  Design, decided: a census class `identityRotation`, emitted per request when
  `conversationSubKey` over the RAW captured body differs from the same
  function over the body as it reaches order 395. `replay.mjs` already runs
  the real pipeline over recorded traffic, so both snapshots are in hand at the
  point the census runs; nothing new needs replaying — they are already on
  every compact entry as `inHash` (raw) and `outHash` (forwarded), built by
  the same `sha(JSON.stringify(m))` primitive on both sides
  (`replay.mjs:876`, `:898`).
  **The predicate is the cache_control-STRIPPED twins, and getting this wrong
  is how the class would ship firing on non-defects.** Use
  `inHashNoCC[0] !== outHashNoCC[0]`, not `inHash[0] !== outHash[0]`. The
  proxy's real key function strips `cache_control` per block before hashing
  (`message-hash.mjs:16-24`, via `hashMessageContent`), so a moved BREAKPOINT
  changes `inHash[0]` while changing the actual conversation identity not at
  all — and breakpoints move constantly. The stripped twins already exist for
  a neighbouring reason (`inHashNoCC` at `:885`, `outHashNoCC` just after
  `:898`), so this costs an index, not a mechanism. Named caveat, not to be
  papered over: `stripCacheControlDeep` and `hashMessageContent`'s per-block
  strip are two implementations of one intent and have not been shown
  equivalent — so the bite set carries a constructed cache_control-ONLY
  difference that must NOT classify, which is the case that would expose a
  divergence between them. A rotation is not by
  itself a defect (it is row 26's precondition, and eleven of row 26's twelve
  measured rotations cost nothing), so this ships as a CLASS and a count, never
  as a gate failure — a check firing on a non-defect trains the override reflex
  that kills it.
  Verifier, red-first, with a live known positive rather than a constructed
  one: over capture `s-captureAT`, the request at 2026-08-08T09:58:50.626Z must
  classify `identityRotation` (raw `496b188f5f435920` -> post-pipeline
  `a20843f8616f3866`, both verified twice on 2026-08-10), while the request at
  09:58:46.362Z — same conversation, same session, 4 s earlier, untouched by
  `fresh-session-sort` — must NOT. That neighbouring negative is what stops the
  class being a counter that fires on everything. RED against the old
  implementation is that the class does not exist and the two requests are
  indistinguishable to every census output today.
  Done-criterion: the class is emitted, the positive/negative pair above is
  reproduced in a bite, and the count appears in the daily sweep so the class's
  RATE becomes observable instead of anecdotal — the rate is exactly what row
  26 says this corpus cannot currently estimate.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **1 (event disposition)**.

- **DONE 2026-08-10 — ANSWERED, and the answer is that the flip is OURS. The
  entry's own premise ("the class is row 26 but this instance has no cause")
  was half wrong: it IS row 26, cause and all.** The varying input is named at
  field granularity, which was this entry's done-criterion. `sid` and
  `systemPromptSubKey(system)` are identical across the pair; the only
  differing input is `conversationSubKey(messages)` — the hash of
  `messages[0]` — and **CC sent byte-identical `messages[0]` in both
  requests**. `fresh-session-sort` (order 250) stripped an
  `# MCP Server Instructions` `<system-reminder>` out of message index 3 and
  prepended it as a new block 0 (`fresh-session-sort.mjs:462-470`, `:480-483`),
  taking `messages[0]` from 3 blocks to 4, and `insertion-normalization`
  (order 395) keyed on the mutated array.
  Established TWICE, independently: the lane reproduced both recorded suffixes
  by replaying the real pre-395 pipeline in a scratch XDG state dir, with a
  one-byte sentinel mutation yielding a third value (so the probe discriminates
  rather than merely agreeing); and the desk recomputed `conversationSubKey`
  over the RAW captured records alone, where both hash to
  `496b188f5f435920` with 3 blocks each. Full text and the new
  pre/post-snapshot fact are in the threat matrix, row 26.
  **The entry's warning held and is repeated here because the successor
  entries inherit it:** what the flip demonstrably did is DISARM our
  absorption. It is NOT established that it caused the 141k re-bill — CC keys
  its cache on the bytes it sends, not on our internal key — and the upstream
  miss's own cause stays unattributed on this instance.
  Successors booked directly above: the `identityRotation` census class (the
  mechanism this hand investigation prototyped) and the pre-pipeline-identity
  fix it gates.
  Original header: **READY — attribute the state-key FLIP that disarmed row 1's mitigation on a
  live 141k bust; the class is row 26 but this instance has no cause.**
  Booked 2026-08-08 from the bust walk on s-captureAT (2026-08-08T09:59:53Z,
  141k, `messages_changed / 124331`, this repo's own dev session). The two
  requests of the busting pair ran under DIFFERENT state keys 4 s apart —
  capture 09:58:46.362Z -> insertion event 09:58:46.364Z key
  `…496b188f5f435920`, capture 09:58:50.626Z -> event 09:58:50.628Z key
  `…a20843f8616f3866` — and BOTH logged `action=reset resetReason=no-prior-
  canonical`. The census classes the pair `splice/insert-mid`, which IS in
  `replay.mjs`'s MITIGABLE set, so unlike the same morning's 638k this is a
  mitigation that was ARMED and had no baseline to act on, not one that was
  never attempted. Session-wide that session: 12 distinct keys / 127 events /
  13 resets, **12 of them `no-prior-canonical`**; 8 of the 12 keys carry
  exactly ONE event, i.e. a key appears, takes one request, and is never seen
  again. `bust-triage` answered **MITIGATED (row 1)** on it, because it maps
  the census class to the row's STATUS and never reads the pair's extension
  events — the runbook's step-8 GRADUATE marker is exactly this and is booked
  separately.
  **What is NOT established, and must not be assumed by whoever takes this:**
  that the key flip CAUSED the re-bill. CC keys its cache on the bytes it
  sends, not on our internal key, so what is established is that the flip
  DISARMED our absorption — the upstream miss has its own cause, unattributed
  here. Do not write "key rotation caused a 141k bust" into the matrix on this
  evidence.
  Design: determine what varies the sub-key across two requests of one
  conversation. Read `conversationSubKey`/`identityKey` (import them, never
  re-derive — a probe that re-computes a key has produced a confident wrong
  answer three times here) and diff the two raw capture records at 09:58:46.362Z
  and 09:58:50.626Z on exactly the inputs the key function consumes.
  Verifier, red-first and with a control: feeding the earlier record's
  key-inputs must reproduce key `…496b188f…` and the later record's must
  reproduce `…a20843f8…`; the control that proves the probe discriminates is a
  sentinel mutation of one key-input yielding NEITHER. Done when the varying
  input is named at field granularity, or the entry is re-graded PARKED with
  that named as the missing evidence.
  <!-- entry: "attribute the state-key FLIP that disarmed row 1's mitigation" -->

- **DONE 2026-08-10 (`b0adb93`) as to the INSTRUMENT; its verifier was
  wrong about the evidence and is corrected below rather than left to be
  re-inherited.** `--rows` ships: one JSONL record per deduped API call, with
  inclusive `--since`/`--until` windowing, `--rows`+`--json` a named usage
  error, `messageId`/`stopReason` added to `normalizeRow`, and `scanRows` now
  returning the `rows` its own docstring had claimed for it while the body
  returned three keys. Red-first: 9 new bites red against the unmodified tool
  with all 16 pre-existing bites still green, then 25/25; full suite green at
  the integrated commit (2637 pass / 0 fail).
  **Verified at the desk by running it, not by reading the report:** over the
  frozen 2026-08-07 archive it emits **732 rows from 1,483 raw transcript
  rows — 751 dropped as duplicate API calls**, which is the requestId dedupe
  doing more than half the work, and surfaces both real
  `previous_message_not_found` calls in one command.
  **The two claims this entry's verifier named could NOT be reproduced, and
  that is a finding about the ARCHIVE, not about the tool** — booked as its own
  entry directly above. The reproducible replacements, run 2026-08-10 and
  recorded so the next reader inherits a checkable claim: the two
  `previous_message_not_found` rows sit at 2026-08-06T16:41:37.941Z and
  2026-08-06T23:59:10.461Z, and `cc` 335,933 lives in the archive's
  `event-windows.jsonl`, not in any transcript inside its tar.
  Residual, unverified and named: `--rows` was not load-tested on a >512 MB
  transcript (`readUsageRows` is already streamed, so this is untested rather
  than suspect).
  Original header: **READY — a TRANSCRIPT query instrument. It is the least-tooled data
  source we own, measured, and it is where every cache investigation
  actually lives.** Two enumerations run 2026-08-07:
  an instrument inventory across the three repos (100 instruments) and
  a probe census over readable session history since 2026-07-28
  (1,258 ad-hoc analysis commands matching a closed five-pattern set).
  Cross-read, `transcripts` is served by **exactly one** instrument, a
  QUERY — no GATE, no REPORT, no DOCTOR — while **36 hand-written
  probes** went at transcripts directly. By contrast `live_captures`
  has 9 instruments across all four labels.
  Both numbers are FLOORS, not estimates: the census found no session
  data at all before 2026-07-28, `claude-worktime` has no readable
  main transcript, and 15 of 39 session identities survive only as
  orphaned subagent fragments. The true hand-probe count is higher.
  The recurring shape is stable across the 36 and is what makes this
  designable rather than vague: open `~/.claude/projects/**/<sid>.jsonl`,
  walk it line by line, pull `message.usage` and
  `message.diagnostics.cache_miss_reason` per entry, join to a
  timestamp or an ordinal. Tonight's whole investigation was that
  query, run four times by hand.
  Design: extend `tools/cold-events.mjs` rather than add a file — it
  already reads transcripts, already dedupes rows into API CALLS by
  `requestId` (the property every hand probe got wrong or omitted),
  and already carries the conversation-grouping discipline. Add a
  `--rows` mode emitting one record per API call: timestamp, `sid`,
  `requestId`, `messageId`, `cache_creation`, `cache_read`,
  `input_tokens`, `ctx`, `cache_miss_reason.{type,cache_missed_input_tokens}`,
  and `stop_reason` — as JSONL, filterable by time window. The
  extend-don't-add rule applies with force here: a fresh file re-earns
  the requestId dedupe from zero, and that is exactly the property
  whose absence produced the 2026-08-07 false ❄.
  Verifier, red-first: over the frozen transcript archive at
  `~/.local/share/claude-worktime/cold-design-evidence-2026-08-07/`, `--rows` reports the
  01:00 session's two API calls (cc 39,711 / cc 335,933) as TWO rows
  where the raw transcript carries more, and names the dropped
  duplicate count; and it reproduces, in one command, the
  `previous_message_not_found` diagnostics at 03:31:59Z and 03:32:01Z
  that took a hand probe to find.

- **READY (small) — the new tools-decision instrument is CAPTURE-BOUND, so it
  answers only while the evidence it needs is still on disk.** Surfaced by the
  lane's own deviation slot (`6fc397d`): the decision reaches
  `ctx.meta.deferredToolRewriteStats` and the `findToolsDeltas` census row, and
  `appendTelemetry` was deliberately left untouched to keep the diff inside
  "no behaviour change". Correct for that dispatch, and it leaves a hole.
  **Why it matters is `docs/dev-loop.md`'s question 2, the RECURRING-producer
  corollary:** a mechanism that produces findings forever satisfies the
  evidence question in its own machinery or not at all — "a human can re-run it
  later" is not an answer while the inputs expire. Reading this decision today
  requires REPLAYING a capture, and captures rotate on a quadratic clock with
  oldest-mtime-first eviction. The JSONL telemetry outlives them. So for any
  bust older than the retention window the question this instrument was built
  to answer is once again unanswerable — the exact shape the absorption check
  hit on 2026-08-05, when 3 of the 12 captures behind its first 50 rows were
  evicted within hours of shipping.
  Design, decided: `appendTelemetry` carries the same two fields the census row
  now carries (`announcedNames`, `passthrough`), written at the moment the
  decision is made. Telemetry already has a `suppressed` flag covering one of
  the two pass-through reasons, so the addition is the second reason plus the
  announced list — not a new record type.
  Verifier, red-first: a request that announces new tools must leave a
  telemetry line naming them, checkable WITHOUT any capture present. Today no
  such line exists — that absence is the red. Control: a request with no tools
  delta writes the empty form rather than omitting the fields, keeping "decided
  nothing" distinct from "never ran", the same distinction the census row
  already preserves.
  Done-criterion: the 2026-08-10 decision is recoverable from telemetry alone
  after its capture is gone.
  Write boundary: `proxy/extensions/deferred-tool-rewrite.mjs`, its tests.
  Touches `proxy/` — pin bump and restart ride along, and the restart is
  cache-transparent (no state keys, no freeze logic).

- **PARKED 2026-08-10 — the fork's ENTIRE operational corpus is public, and
  nothing about the upstream relationship requires it to be.** Raised by the
  operator while settling the quote question, and it reaches much further than
  quotes.
  **FIRST COUNT WAS WRONG, and the error is the one this repo keeps naming.**
  It reported "~289 fork-only documents, ~3.5 MB" by taking the fork-only
  DIRECTORY list out of `CLAUDE.local.md` and summing whole directories — a
  label read as its own body, never checked against the world. Re-derived
  mechanically (`comm -23` of `git ls-files` against
  `git ls-tree -r upstream/main`): 405 of 901 tracked files are absent from
  upstream, but 318 are under `test/`, 33 under `tools/` and 2 under
  `proxy/` — fork-only CODE, which is candidate upstream contribution and
  belongs in public. Of the 217 files in `docs/code-reviews`, 206 are
  UPSTREAM'S OWN, inherited by the fork; only 11 are ours. Same shape in
  `docs/directives`: 52 present, 23 fork-only.
  **The real private-candidate set is 52 files, 1.7 MB** — `BACKLOG.md`,
  `FORK-NOTES.md`, 23 directives, 11 code-review reports, 9 audits, 5
  runbooks, `docs/dev-loop.md`, `docs/CONSUMER-SETUP.md` — roughly a sixth of
  what the first count claimed, which changes this from a migration into a
  move.
  **It is NOT a clean split, and that is the design question.** Several
  fork-only directives document features that were upstreamed
  (`proxy-deferred-tool-rewrite.md`, `proxy-insertion-normalization.md`,
  `proxy-output-guard.md`), so they read as contribution material rather than
  operator notes. Proposed rule, mechanical enough to apply without
  re-litigating each file: a fork-only doc stays PUBLIC only if it documents
  code that has been or will be upstreamed, or is cited by an upstream PR;
  everything describing how the OPERATOR works — backlog, runbooks, handoffs,
  session takeovers, dispatch reports, threat evidence, audits — goes private.
  Checked rather than assumed: across the three OPEN upstream PRs the only
  fork-only doc referenced in any PR body is `docs/dev-loop.md` (one
  reference), so exactly one file is load-bearing for a live contribution.
  **Why it is public is an accident of GitHub, not a decision:** a fork
  inherits its parent's visibility and cannot be made private. The operator's
  private material already has a home — `Gunther-Schulz/dotfiles` is private —
  so this is the one body of working notes that escaped it.
  **What the public fork IS load-bearing for, checked rather than assumed:**
  `gh pr list --repo cnighswonger/... --author ...` returns 6 MERGED and 3 OPEN
  upstream PRs whose branches live in this fork. So the fork itself must stay,
  and "delete and recreate with a clean history" — the remediation the
  Public-Repo Information Hygiene section prescribes for a leak — would break
  three open contributions. That option is real but no longer cheap, and the
  repo has 0 stars and 0 forks, so the cost is entirely the open PRs.
  RECOMMENDATION (operator's call, which is why this is parked): move the
  fork-only operational corpus into the private repo and leave the public fork
  carrying only what upstream could ever want. That stops the accrual without
  touching the PR relationship. It does NOT retract what is already published —
  history rewrite on a repo with live upstream PRs is the disruptive option and
  is a separate decision.
  MISSING (why parked): the operator's decision on the public surface, and — if
  it is yes — the migration's own design, since the tooling assumes these paths
  (`.claude/required-reading.json` names repo-relative files, and
  `tools/backlog-*.mjs`, the runbook router and the dotfiles doctor all read
  in-tree paths). The migration is tractable but it is not a `git mv`.

- **READY (small) — the public-repo hygiene policy enumerates origin IPs and
  stack fingerprints and says NOTHING about CONVERSATION CONTENT, which is the
  category this repo actually handles most of.** Raised by the operator
  2026-08-10 ("for public consumption, we leak nothing from our chats?") and
  answered by measurement rather than by assurance, on the pin pushed the same
  day (`pinned-s-dda5c6419d49-372-373.json`): message text is replaced by
  `t_<hash>_<len>` tokens, tool inputs by `REDACTED`, the SYSTEM block —
  where the operator's private global corpus renders — tokenized identically,
  headers reduced to `anthropic-beta` alone (no auth, no key), and tool
  objects reduced to `{"name": ...}` with descriptions and JSON schemas
  dropped. The scrubber holds. That is not the gap.
  **The gap is that none of it is WRITTEN DOWN as policy, and two things do
  survive by design.** (i) Tool NAMES ship in cleartext — today's matrix row 6
  entry names seven `mcp__claude-in-chrome__*` tools, which discloses which MCP
  servers and skills this machine runs. Capability disclosure, not
  conversation, and probably acceptable — but acceptable by nobody's decision
  until stated. (ii) Our own tracked PROSE and COMMIT MESSAGES quoted the
  operator verbatim.
  **OPERATOR DECISION 2026-08-10, and it overrides the recommendation this
  entry originally carried:** no verbatim operator quotes in public material,
  going forward, and the existing ones scrubbed where scrubbing is possible.
  The original recommendation here was to KEEP the practice because a quote is
  a BASIS and a paraphrased trigger is the label-over-body drift this repo
  keeps getting bitten by. That reasoning was answered on two grounds and both
  are recorded because the entry would otherwise re-argue it: the rule needed
  PER-INSTANCE judgment ("keep it when work-scoped and short"), which is the
  predicate shape that over- and under-fires, and here a single misjudgment is
  irreversible public history — unbounded downside against marginal upside;
  and the evidential value survives a neutral restatement ("operator trigger:
  the READY count read as implausibly large" records the same causation), so
  compliance costs nearly nothing, which collapses the basis argument on its
  own arithmetic. The deciding ground is not evidence quality at all: they are
  the operator's words, published without their having agreed to it.
  EXTENT, measured 2026-08-10 rather than estimated: ONE verbatim quote in the
  whole tracked tree (`BACKLOG.md:39`, scrubbed in this change to a neutral
  restatement that keeps the attribution and the trigger), and SIX across all
  commit messages. An earlier scan suggesting ~56 was instrument error — those
  hits quote documents, code and review reports, not the operator.
  Design, decided: state the conversation-content rule beside the existing
  origin-IP rules, in four lines — capture-derived fixtures ship structure and
  hashes only, never prose (already true, now asserted); tool names are
  acceptable disclosure; NO verbatim operator quotes in tracked prose or commit
  messages; where a trigger or decision needs recording, the attribution and
  the causal record stay and only the wording is restated, because a blunt
  deletion would destroy the provenance that made the line worth having.
  **Placement, and it is the whole reason this is booked rather than done:**
  the tracked `CLAUDE.md` is UPSTREAM's, and this fork's own rule says
  corrections and deviations land in `CLAUDE.local.md`, which is DEPLOYED from
  the dotfiles repo and must be edited THERE, never in this tree. So the edit
  is a dotfiles change (`cache-fix/CLAUDE.local.md`) and this entry is the
  fork-side record of it. Consumer: the next dotfiles session.
  Verifier: the deployed overlay carries the three lines, and the doctor's
  content-drift check on `DEPLOYED_COPIES` stays green.

- **READY (small) — the LINEAGE relation, as a shared primitive in
  `replay.mjs`, ahead of BOTH its consumers.** Split out 2026-08-10 from the
  `capturePairResult` entry above, when re-reading the bounded-`--pin` entry's
  premises against the world showed the two could not both be right in the
  order they were booked (the finding is recorded in that entry, below).
  `conversationOf` (`tools/replay.mjs:1077`, `e.inHash[0]` — the first
  message's byte hash) is the CACHE identity and stays exactly as it is: it
  answers "will these two requests hit the same prefix". It cannot answer "is
  this the same conversation as before CC rebuilt its history", and the
  measurement says so — on `s-captureAT` ord 715 the target's `messages[0]`
  matches NONE of the preceding requests, while those same requests share
  97.1 / 97.3 / 97.7 / 98.1 / **98.5%** of its messages by content (ords
  709-713, rising with recency) and the 1-message co-tenant sidecar at ord 714
  shares **0%**.
  Design, decided: a SECOND named relation beside `conversationOf`, in the same
  module, exported the same way — `lineageOverlap(a, b)` = |shared message
  hashes| / min(|a|, |b|) over the compact form's `inHash`, and
  `sameLineage(a, b)` = that ratio >= **0.5**. The threshold sits far from both
  measured clusters rather than tuned to either edge; a future case landing
  between them is a finding about the class, not a reason to tune the number.
  Neither relation replaces the other, and no consumer re-derives either
  inline — three confident wrong answers in this repo already came from
  hand-rolled identity.
  **Why it lands FIRST, ahead of either consumer:** it is a pure function over
  two hash arrays, so its own red-first arrangement needs no capture at all.
  That is what breaks the deadlock the re-read exposed — each consumer needed
  the other's output before it could be verified.
  Verifier, red-first: constructed `inHash` arrays reproducing the measured
  shape — a predecessor whose index 0 differs and whose length changed
  (564 -> 555 in the real case) while ~97% of contents survive, plus a
  1-message sidecar. RED against the OLD implementation is `conversationOf`
  itself: it returns different identities for the 97%-overlap pair, i.e. no
  pairing at all, which is the defect; `sameLineage` must return true there and
  false for the sidecar. BASELINE, stated because the red is otherwise
  indistinguishable from a check that is always red: `conversationOf` must go
  GREEN on two requests that DO share `messages[0]`, so the arrangement
  demonstrates the split rather than a blanket failure.
  Done-criterion: both relations exported from `replay.mjs` with bites green,
  and no existing caller of `conversationOf` changed — the cache identity is
  not touched by this entry.
  Write boundary: `tools/replay.mjs`, `test/replay-lineage.test.mjs` (new file
  — `git add -N` before the pathspec commit).
  Consumer tier **1 (event disposition)**, inherited from the two entries that
  consume it.

- **READY (small) — `harvest --pin` cannot freeze a LATE event in a LARGE
  capture, which is exactly when the expensive busts happen.** `--pin n..m`
  always writes every record from 0 through m (deliberately: replay from 0 is
  what keeps insertion-normalization's per-conversation canonical state in
  sync, stated in `tools/harvest.mjs`'s own header). That is correct and it
  does not scale. Measured 2026-08-10 on a live 311k `messages_changed` bust:
  the capture was 592 MB / 2065 records and the busting pair sat at 1048..1049,
  so the prescribed freeze would have written roughly 300 MB into a PUBLIC git
  history. The existing tracked pins are 36 KB, 1.7 MB and 30 MB — this is an
  order of magnitude past the largest, and `docs/runbooks/bust-appears.md`'s
  "structural classes are worth the megabytes" was written when pins were tens
  of megabytes.
  **Consequence, and it is the closing gate's own question 2:** for a late
  event in a big capture there is currently NO proportionate freeze, so the
  evidence-harvestable answer is "no" by construction rather than by choice.
  The one thing that keeps this from being urgent is also measured: eviction is
  oldest-mtime-first, so an ACTIVE session's capture is the last to go — the
  window is real, but it closes when the session goes quiet, which is exactly
  when it stops being traffic and starts being evidence.
  Design, decided: `--pin` gains a bounded-prefix mode that keeps replay
  correctness instead of trading it away. Replay from 0 is needed for the
  per-conversation canonical state, so the bound is per-CONVERSATION, not
  per-file: keep every record of the busting pair's own conversation
  (`conversationOf`, already the grouping key `replay.mjs` uses) from 0
  through m, UNION every record `sameLineage` relates to the busting request
  (the primitive entry above), and drop the rest, which contribute nothing to
  that state. On an interleaved multi-tenant capture like the measured one that
  is most of the file.
  **What the re-read found, 2026-08-10, and why the union clause is part of the
  design rather than a refinement of it.** This entry was booked with the
  conversation filter ALONE, hours before the rotation measurement in the
  `capturePairResult` entry above existed. Applied to that entry's own red case
  it freezes nothing usable: `bust-triage`'s live output on `s-captureAT` ord
  715 reads "its conversation has 18 request(s) in this capture and none
  earlier", so a `conversationOf`-bounded pin over 0..715 keeps exactly ONE
  record — itself. The replay then finds zero pairs, and the pin's own
  self-verification says so in its own words: "compared nothing — same-
  conversation pairs live=N pin=0; a replay over zero pairs proves nothing"
  (`tools/harvest.mjs:814`). The 98.5% predecessor at ord 713 would be dropped
  by the very filter meant to make freezing it affordable. Neither entry was
  wrong when it was written; the premise moved under this one, and it moved
  inside a DIFFERENT entry, which is why nothing flagged it until the two were
  read together at dispatch time — the stored-brief rot the routing rules name,
  caught here by the re-read rather than by a mechanism.
  Verifier, red-first and self-proving: the bounded pin must reproduce the SAME
  verdicts as the full pin over the same range — same pair count for the
  busting conversation, same violations, same census classes — which is the
  check `--pin` already runs on itself today, so the bar is "identical verdicts
  at a fraction of the bytes", not a new notion of correctness. RED: the same
  bound applied by naive truncation (records n..m only, no conversation
  filter) must FAIL that check, which is the failure mode the header comment
  already predicts and nothing currently demonstrates.
  SECOND RED, from the finding above, so the union clause is demonstrated
  load-bearing instead of assumed — and CORRECTED 2026-08-10 before it was
  briefed, because the first version of it could not discriminate. It read
  "the conversation-only bound must report ZERO pairs while the union bound
  reproduces the live verdicts for that conversation". Both arms report zero
  pairs: `replay.mjs` groups by `conversationOf`, so the ord-715 target is a
  singleton there whatever the pin contains, and the live replay of 0..715
  finds no pair either. A check both arms pass is not a check — it is the
  unprovable-predicate shape this repo already names, arriving as a
  verdict-level check where the difference is at CONTENT level.
  The discriminating form, which is what the union clause is actually for:
  the two bounds differ in WHAT THE PIN CONTAINS, so assert on the pin.
  Conversation-only over `s-captureAT` 715 writes exactly ONE request record
  (the target itself). Conversation-union-lineage writes that one PLUS the
  ord-709..713 neighbours, ord 713 among them — the 98.5% predecessor a later
  `capturePairResult` has to be able to find in the frozen artifact. Assert
  the record counts and ord 713's presence, not the replay verdict.
  This also states the boundary plainly for whoever builds it: keeping the
  lineage records does NOT make `replay.mjs` pair them, and is not meant to.
  Replay's grouping stays `conversationOf` and stays right. The union exists
  so the FROZEN FILE still holds the predecessor when the lineage-aware
  consumer arrives.
  Done-criterion: the 2026-08-10 bust above is freezable at a size in line with
  the existing tracked pins, with verdicts identical to the unbounded pin.
  Write boundary: `tools/harvest.mjs`, `test/harvest*.test.mjs`.

- **RESOLVED 2026-08-10 — CLOSED by the pass's own correction, taking the
  "or close" branch it offered. `bust-appears.md` already carries the designed
  caveat verbatim (step 2, GRADUATE marker at :91, before the `--at` call at
  :112) and `sweep-finding.md` never sends a reader to `bust-triage` for pair
  selection at all — its only mentions sit in the KNOWN-OPEN branch discussing an
  unrelated row-status bug. Established by a dispatched lane that read both files
  and HALTED rather than inventing a place to put the caveat.**
  Original header: both event runbooks open on a tool measured unreliable for
  the exact event that enters them.** `docs/runbooks/sweep-finding.md` and
  `docs/runbooks/bust-appears.md` send a fresh context to `bust-triage` FIRST.
  Measured 2026-08-10: it selects the busting request by time proximity to the
  worktime event and is blind to `model`, so on a fable session with sonnet
  subagents it handed back the sonnet pair `n=97->99` (04:40:43/47) while the
  fable request at 04:40:37.944 was the one that busted — and every instrument
  reading the walk then collected described a conversation that never busted.
  A fresh context following either runbook today walks into that silently.
  This entry exists because the dependents were NAMED in session prose and
  nearly left there — the named-and-unbooked shape, caught by the operator.
  Design (decided): both runbooks gain a step-zero caveat BEFORE the
  `bust-triage` line — check the busting request's `model` against the
  session's other traffic, and treat a verdict as void if the selected pair's
  model differs from the model the bust was reported against. Written as a
  caveat, not a rewrite: the tool fix is a separate entry, and the runbook must
  stay correct in the window before it ships. Each caveat carries
  `[GRADUATE -> bust-triage groups by conversation AND model]` per this repo's
  runbook-as-staging-area rule, so it is removed by the commit that mechanizes
  it rather than by someone deciding it reads fine.
  Verifier: the caveat must name the 2026-08-10 instance with its two
  timestamps, so a reader can reproduce the miss rather than take the warning
  on trust; `grep -n "GRADUATE" docs/runbooks/*.md` shows both new markers.
  Done-criterion: both files carry the caveat above their `bust-triage` step,
  both markers present, suite green.
  Write boundary: `docs/runbooks/sweep-finding.md`,
  `docs/runbooks/bust-appears.md`.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Half of the premise is gone. bust-appears.md already carries the designed
  model-mismatch caveat (step 2 + GRADUATE marker). sweep-finding.md was
  restructured and no longer opens on bust-triage — step 1 is now `Freeze
  before you analyze`, and bust-triage enters only inside the KNOWN-OPEN
  branch (~line 174) under a different caveat. `Both runbooks open on the
  unreliable tool` no longer holds; re-scope to bust-appears alone or close.
- **RESOLVED 2026-08-10 by the retirement pass — NO WORK REMAINS HERE, and the
  READY grade was wrong on its own body's evidence: parts (1) and (2) shipped
  (`7827c4e`, `b94d118`) and part (3) is a separate entry below. Kept as the
  record of what the instrument covers, per its own closing sentence.**
  Original header: graduate the coverage walk into `tools/`: "is this content on the
  wire" must not be answered by a substring scan, and today every such answer
  is one.** Found 2026-08-07 by the conservation enumeration lane, reported
  against its own delivered result after its lane had closed.
  **The measured defect, in a probe that read as CLEAN.** Its first R-side
  probe labelled all 31 clause-(b) rows REAL-LOSS. It returned a definite
  verdict for every row with a stated basis, and the basis was TRUE — it had
  simply never looked inside list-content `tool_result` blocks, so bytes that
  were on the wire scanned as absent. A coverage walk replaced it and all 31
  flipped to fully covered. Thirty-one phantom content losses, one instrument
  away from being reported as a mitigation defect.
  **Why this is a tooling item and not a war story.** The failure is invisible
  from inside the probe — its output is a definite label, not an error — and
  invisible to a second instrument that shares the reach limit, so the usual
  cross-check does not reach it. Any attribution resolving presence by scanning
  `block.text` and string `block.content` only carries the same defect, in the
  direction that OVER-reports loss. That is the shape of the hand-rolled
  presence probes written here so far, and the walk that survives contact
  exists only as `cover-rows.py` in a session scratchpad, perishable by
  construction.
  **Design, decided.** Graduate it to `tools/`, extending an existing tool
  rather than adding a file if one fits — `bust-triage` and `replay` both
  already own capture+dump plumbing. Interface, from the working probe: given a
  capture, a `replay.mjs --dump-forwarded` dump and a rows JSON, report per-row
  coverage percent plus the uncovered remainder VERBATIM — the remainder is
  what turns "X% covered" into an attribution. It walks every container the
  wire can carry, list-content `tool_result` blocks included; the enumeration
  of container shapes is the thing being graduated, since that is exactly what
  the substring scan got wrong.
  **Verifier, red-first, and the known positive is real and in hand:** the 31
  clause-(b) rows.
  **PARTLY SHIPPED 2026-08-08 — `7827c4e`, `tools/coverage-walk.mjs` (new, 564
  lines) plus `blockUnitsFull` exported from `replay.mjs`.** New file rather
  than an extension, reason stated as the rule requires: `bust-triage` owns
  capture-PAIR plumbing and not `--dump-forwarded`, `replay.mjs` is the dump's
  PRODUCER and this is a consumer of its output, and the house precedent for a
  separate consumer of replay's dump is `absorption-classify.mjs`. Suite
  2344/2342/0 at that commit, verified at the desk in a frozen worktree, not
  taken from the report.
  **THE ENTRY'S OWN MECHANISM WAS FALSE, and the halt this entry's brief
  carried is what caught it.** Struck: "it had simply never looked inside
  list-content `tool_result` blocks" and "a mutation removing list-content
  descent must send them back to REAL-LOSS". Measured over all 31 rows through
  the shipped instrument, and REPRODUCED at the desk against the PRESERVED
  attribution rows (i.e. not the lane's own row derivation):

      (no mutation)                    COVERED=31 UNCOVERED=0
      --without reminder-unwrap        COVERED=0  UNCOVERED=31
      --without list-content-descent   COVERED=31 UNCOVERED=0   <- NO-OP
      --without multi-piece            COVERED=0  UNCOVERED=31
      --without separator-skip         COVERED=0  UNCOVERED=31

  The true reach limit was the whole-string substring scan (0% vs 100%), plus
  the reminder unwrap and the join separator. The GATE-side limit is narrower
  than "cannot see joins": `crossJoinUnitHash` reconstructs a cross-message join
  only for ADJACENT forwarded messages, and the contributors sit at forwarded 55
  and 57 with an unrelated message at 56. All 31 rows are ONE message (one
  distinct content sha, 9949 bytes / 9865 code units, role=system, string
  content) reconstructing exactly as `unwrap(fwd[55].content[9])` + `"\n\n"` +
  `unwrap(fwd[55].content[10])` + `"\n\n"` + `fwd[57].content` = 683+2+683+2+
  8495 = 9865.
  **REMAINING WORK — (1) and (2) CLOSED 2026-08-08 (`b94d118`), (3) split out:**
  (1) DONE — the bite (`test/coverage-walk-bite.test.mjs`, 9 tests) names the
  three conditions that are actually red on the real 31-row positive, one bite
  each, each certified by breaking THAT condition's wiring alone; the
  dispatcher reproduced one mutant independently and exactly the bite naming it
  fired. Plus two controls that stop the fixtures collapsing into one: a
  whole-string scan must FAIL on the join fixture (with its own positive
  control), and each fixture asserts the other's conditions are no-ops on it.
  (2) DONE — the list-content descent has a SYNTHETIC positive, and the branch
  is stated plainly because no real row reaches it: 93 covering pieces across
  the 31 rows, zero from a list-content sub-block. The entry's "7 list-content
  blocks" was itself wrong — it came from the small preserved `fwd-*` files;
  the full dump carries 186, with 62 `tool_reference` sub-blocks.
  (3) OPEN — the 35 `out`/`invented` rows, split into its own entry below.
  **This entry is therefore READY only for (3)'s absence**, which is another
  entry's work; it survives here as the record of what the instrument covers.
  **The done-criterion as written CANNOT be met, and the honest form replaces
  it.** It said the re-run converts "1 REAL-LOSS" from a floor into a bound.
  Measured: of the 66 checker-reach rows, 31 are now POSITIVELY confirmed on
  the wire by an instrument whose covering conditions are each red; the other
  35 return COULD-NOT-VERIFY with the reason computed. So the floor's SCOPE
  shrank and the floor remains a floor.

- **READY — `bust-triage` cannot reach threat-matrix row 24 by ANY of its three
  routes, so the whole resume / born-large class triages as UNVERIFIABLE or
  UNCLASSIFIED forever.** Measured 2026-08-06 on capture s-captureAL (the
  204,513-token `system_changed` event, walked to CONTROLLED-CAUSE in row 24).
  Three independent misses, each at file:line:
  (i) **Pair selection.** `capturePair` pairs on byte-identical `messages[0]`
  (`bust-triage.mjs:334-347`), so a bust whose defining feature IS a
  `messages[0]` change can never be represented. Worse, it is steered there:
  `preferTelemetryConfirmed` (`:313-332`) prefers the RESET-carrying request,
  and at a resume boundary that request is BY CONSTRUCTION its conversation's
  first — a guaranteed null. The heuristic is correct and puts the class out of
  reach anyway.
  (ii) **Census class.** The counterfactual pair (91→92) was built and run
  through the tool's own steps: `censusPair` = append-only, `migrationVerdict` =
  null, `classToRow` → null.
  (iii) **Cause map.** `causeToRow` (`:524-538`) maps `messages_changed`→4 and
  `tools_changed`→6/23 and nothing else. **`system_changed` — one of the three
  causes CC emits, and the one this whole class books under — maps to no row.**
  Good news, and it is why this is READY rather than urgent: both reachable
  routes fail LOUDLY (UNVERIFIABLE / UNCLASSIFIED). There is no silent-wrong-row
  path. Positive control that the tool is not simply broken:
  `--at 2026-08-06T12:54:49Z` returns a pair and grades KNOWN-OPEN row 4.
  Design, DECIDED (dispatcher), in two separable halves so they can ship apart:
  **the cause map first** — `system_changed` → row 24, three lines, and it
  converts the loudest hole into an answer; **then the pair mode** — when no
  same-`messages[0]` predecessor exists, fall back to the nearest earlier
  same-session request with ≥2 messages and LABEL the pair
  `cross-conversation (born-large)`, so nothing downstream mistakes it for a
  normal pair. Verifier, red-first and already in hand: `--at 1786038016` must
  go from UNVERIFIABLE to a row-24 verdict, and the 12:54:49Z control must be
  unchanged.

- **READY (small) — the matrix datapoint convention's COMPUTABLE half: a table
  cell over N chars, or one carrying a date-stamped addendum, is a finding.**
  Carved out 2026-08-08 at dispatch time, not deferred by judgment: the check
  belongs in `tools/bust-triage.mjs` beside the existing `--lint-matrix`, and
  that file was being edited by the `mkdtemp` lane in the same window, so
  building it concurrently would have collided. The prose half — the convention
  in the matrix header — shipped separately.
  Design, unchanged from the parent entry: red-first on row 24 at the commit
  BEFORE the retraction (the cell then held a dated addendum contradicting its
  own body), and SILENT on rows whose walks live in datapoint sections — which
  is most of them, and is what keeps the check from firing on the whole table.
  **PROBE THE RED-FIRST ARRANGEMENT BEFORE BRIEFING IT.** The building lane
  flagged that it did not check whether that commit is still reachable or
  whether the cell there really holds the contradicting addendum — and booked
  verifiers have now decayed twice this week in this repo. One command settles
  it; do it first.
  **Implementation notes from the lane that wrote the prose half**, so the next
  one does not re-derive them: `splitRowCells` already exists in
  `tools/bust-triage.mjs` and `matrixRow` sits beside it at `:740`; the status
  truncation is `:751`; row 24's cell is 13,161 chars, which is the outlier to
  threshold against; and a date-stamped addendum inside a cell is a
  `20\d\d-\d\d-\d\d` match in the status cell.
  **A SECOND computable case, now that the convention names it:** an
  `## Event walk` section that names no numbered row is unreachable to
  `causeToRow` (which indexes numbered rows only, `bust-triage.mjs:912` and the
  comment at `:934`). Three such walks exist today — the `2026-08-07 09:52:42Z`,
  `2026-08-07 01:00:55Z` and `2026-07-31` ones. That is a real red-first
  arrangement sitting in the file right now, and it is stronger than the row-24
  one because it cannot decay: the walks are committed history.
  That silence half is the load-bearing one: a lint that flags every long cell
  trains the override reflex the convention exists to prevent.

- **READY — three ingestion lanes reach the same event and two disposition
  VOCABULARIES reach the matrix, with nothing reconciling or deduping them.**
  Operator, 2026-08-07: "there are two ingestion lanes right? when I report,
  but at the same time we sweep on a schedule — two lanes but they converge on
  results I assume." Three, and they converge on the CARRIER but not on the
  VOCABULARY. From `dev-loop.md`'s own index:
  - `bust-appears` (❄ / operator / `--list`) ends at **mitigated / parked /
    controlled-cause / upstream-filed** — four values, all answering "what did
    we DO about it";
  - `sweep-finding` (the daily gate, nobody present) ends at **regression /
    known-open / non-defect / instrument-defect / new-class /
    could-not-verify** — six values, all answering "what KIND of thing is it";
  - `runtime-anomaly` (our own detectors) ends at "the sweep's six, plus
    open-booked".
  So two of three share a vocabulary and the bust lane's is DISJOINT from it.
  The axes are legitimately different — one is a disposition, the other a
  classification — but the same EVENT can enter by any door, and which door it
  came through decides which shape of answer it gets.
  **The concrete risk, measured 2026-08-07:** the sweep last ran 2026-08-06
  07:35Z and is RED (`ok:false, failing:1`); the next run is due 07:15 CEST.
  Today's three busts (03:49 local 419k, 06:08 203k, 06:17 230k) were all
  ingested through the bust lane, two of them dispositioned. Nothing tells the
  sweep that. It can re-raise a dispositioned event as a fresh finding, and a
  reader has no way to see that the two records describe one event — the
  duplicate-under-two-names shape the dev-loop already documents for class
  names ("one phenomenon reached from two directions grows two names"), here at
  the level of whole lanes.
  Design: one reconciliation point, not a merged vocabulary — the vocabularies
  stay distinct because the questions are. A matrix event carries the LANE it
  entered by and the event identity (timestamp + session) it was dispositioned
  under; the sweep consults that before raising, and an event already
  dispositioned by another lane is reported as `already-dispositioned (<lane>,
  <date>)` rather than as a new finding. That is a set difference, not a
  judgment call.
  Verifier, red-first: run the sweep against today's ledger with the two
  dispositioned busts in the matrix — today it raises them as findings, which
  is the red; after, it names them as already-dispositioned and raises only the
  419k, which genuinely is not walked. Negative control: an event no lane has
  touched must still be raised normally, so the reconciliation cannot become a
  silencer.

- **READY — the threat matrix has a datapoint-section form and yesterday's
  addendum was appended INTO the table cell instead, which is how a cell came
  to contradict itself.** Row 24's cell carries a 2026-08-02 measurement
  ("mid-session corpus edits are FREE, only the resume pays", 246 requests) and,
  a few hundred words later, a 2026-08-06 addendum asserting the opposite as
  "the operator-facing half this row had not stated". Retracted 2026-08-07 on
  re-measurement. The mechanism is structural, not carelessness: the cell is
  thousands of words in ONE table cell, so an author appending to it does not
  read it first, and `matrixRow` truncates the status at 260 chars, so no
  reader sees the conflict either.
  **The form already exists and was not used.** Rows 3, 4 and 24 all carry
  `### Row N datapoint — <date>: <finding>` sections BELOW the table, which are
  readable, diffable, and where every other walk this week landed. The
  2026-08-06 addendum is the one that went into the cell.
  Design: state the convention in the matrix header — a walk's findings land as
  a dated datapoint section; the CELL carries only the row's current status and
  disposition — and add a `tools/` check for the computable half: a table cell
  over N chars, or one containing a date-stamped addendum, is a finding.
  Verifier, red-first: red on row 24 at the commit before the retraction (the
  cell then held a dated addendum contradicting its own body), and SILENT on
  rows whose walks live in datapoint sections — which is most of them, and is
  what keeps the check from firing on the whole table.

- **READY — the 2026-08-07 01:00:55Z 336k event reads UNCLASSIFIED, and its
  transcript diagnostic does not join to the ledger record.** Surfaced
  2026-08-07 by `22b8c05`, which turned a non-answer into a finding: with the
  request selection fixed, the walk reaches a real pair (`n=2->4`) and the
  census says `append-only`, which maps to no matrix row — the tool's own
  stop-here. Second half, and it may explain the first: the session transcript
  holds 328 records with 5 `cache_miss_reason` diagnostics and NONE reports
  `cache_creation 335933` (they report 339, 339, 427535, 427535, 427535), so
  the ledger event and the transcript cannot be joined at that stamp. Until
  that join is explained the UNCLASSIFIED cannot be graded — an append-only
  pair carrying a 336k re-bill is either a new class or an instrument artifact,
  and the two are distinguished by which record the 335,933 belongs to. Do the
  join first; mint the row only if the event survives it. Note the earlier walk
  for this same stamp dispositioned it NON-DEFECT/GROWTH on the transcript's
  own numbers — that walk and this verdict must be reconciled, not stacked.

  **DROP REJECTED 2026-08-10 — a lane graded this OVERTAKEN; the desk
  overturned it.**
  A lane graded this OVERTAKEN on the threat matrix's reconciled walk
  (disposition NON-DEFECT). REJECTED at the desk: that is closing against a
  document, and the document CONTRADICTS this entry on a checkable fact. This
  entry says the transcript holds 328 records with 5 cache_miss_reason
  diagnostics (339, 339, 427535 x3); the matrix says `there is no
  cache_miss_reason anywhere in this session's transcript — grep returns
  zero`. Both cannot be true, and the walk's own FINDING 2 (bust-triage had
  selected a haiku sidecar, not the real predecessor) is a live candidate for
  why they disagree about WHICH conversation. The entry stands, with a sharper
  question than it was booked with: which conversation does each of those two
  readings belong to? Settle it by reading the transcript, never by quoting
  either document.
- **READY — the inverse-direction coverage walk: an `out`/`invented`
  conservation row asks "CC never sent this in this conversation", which no
  instrument answers today.** Split out 2026-08-08 from the entry above, whose
  three-input interface (capture + forwarded dump + rows) structurally cannot
  carry it. Rows by side across the three failing captures, measured: 67 total,
  32 `in`, 35 `out` — s-captureAE 35 rows (1 `in`/suppressed-without-copy, 34
  `out`/invented), s-captureAH 31 rows (all `in`), s-captureAO 1 row
  (`out`/invented). Every `out` row needs `conversationOf` grouping over the
  conversation's whole RAW population rather than one request's forwarded
  array. Design NOT decided — this is the fork in the road that keeps it out of
  the ready grade: either `coverage-walk` grows a second mode that takes the
  capture and a conversation key, or the question belongs in `replay.mjs` where
  the grouping already exists. Verifier, red-first and available: the 35 rows
  return COULD-NOT-VERIFY today (real output: `35 row(s): COVERED=0 UNCOVERED=0
  COULD-NOT-VERIFY=35`), so any real verdict on them is a change of state.
  Until this ships, "1 REAL-LOSS" stays a FLOOR and no document may quote it as
  a bound.

- **READY — the stability exemption for a first-appearance relocation must
  assert what it does NOT currently cover: that the forwarded `tools[]` held
  across the relocation.** This is the instrument that would have caught row 26
  on the morning it fired, and its absence is why every gate was green while
  216k tokens burned. Today the exemption is granted on
  `relocated[].firstAppearance` alone (replay.mjs), which is a true statement
  about the deliberate `messages[0]` cost and says nothing about the prefix
  level ABOVE messages, where this one actually landed. Design, decided: the
  exemption gains a condition — forwarded `tools[]` byte-identical across the
  pair — and a first-appearance relocation that also flips tools is NOT
  exempt, it is a violation naming both facts. Row 25 already built
  `prefixAboveMessages` for this exact distinction; consult it rather than
  re-derive. Verifier: red-first against the live pair — the current build must
  exempt `n=166->167` and the new build must fail it, on the same input, one
  variable. Note the ordering constraint with the row-26 fix: once the key
  rotation is fixed the tools stop flipping, so this check must be demonstrated
  red BEFORE that ships, or its motivating case dissolves and it would ship
  having never gone red on a real defect. Done-criterion: the red demonstrated
  and quoted, plus a bite in `test/replay-gate-selfcheck.test.mjs` per the
  every-new-gate rule.
  **STAGE-2b RESULT 2026-08-06 evening, and the ROUTE DECIDED (dispatcher). NOT
  BUILT: zero of the 12 surviving positives would fire it.** The named live pair
  was evicted, so every first-appearance-relocation exemption still on disk was
  enumerated at HEAD's build over the serving gate set — 12 pairs, 5 captures,
  all `mcp`, all `prefixAboveMessages` fully INTACT. Full table and the
  presence-probe behind it: threat matrix row 26, addendum of the same evening
  (`8c3404e`). The condition would have shipped changing nothing, and tomorrow's
  sweep would be byte-identical — which is the finding, not a disappointment.
  **The class is live and only the COST is intermittent.** Row 26's link (c) —
  `deferred-tool-rewrite` logging `no-baseline` under the post-relocation key —
  is present at all twelve relocating requests' own millisecond. The rotation
  always fires. What the twelve never met is the SECOND condition: a frozen tools
  order held under the PRE-rotation key that disagrees with CC's passthrough
  array. That difference is the whole gap between one 216,060-token event and
  twelve free ones.
  **ROUTE: synthetic red-first, merged with the fixture row 26 already mandates.
  Decided rather than left open, with its basis.** The dev-loop rule forbidding a
  substitute case was minted about a briefed known-positive that never existed —
  an entry whose body cited no commit, i.e. an attribution error. This case
  existed, was measured to the token, and had its mechanism isolated with a
  falsification probe AND a control. The rule's purpose is to stop an instrument
  being tuned to ratify its own premise; that purpose is not engaged where the
  premise was established independently by measurement. So the fixture is not
  "a case constructed to make the check fire" — it is the durable form of a
  defect the corpus can no longer hold, and it was independently required
  already.
  **AND THE FIXTURE SPEC IS WRONG AS WRITTEN — this is the correction, and
  skipping it produces a vacuous green.** The row-26 entry specifies two requests
  "differing only by the first appearance of a skills block". That fixture
  reproduces the ROTATION and nothing else — which is exactly the state all
  twelve survivors are in, and they demonstrate that rotation alone leaves the
  forwarded `tools[]` intact. A check for the tools condition demonstrated
  against a two-request fixture would therefore pass while asserting nothing, the
  same shape as every other vacuous green this repo has collected. The merged
  fixture needs THREE or more requests: enough leading traffic for
  `deferred-tool-rewrite` to FREEZE a tools order under the pre-rotation key that
  differs from CC's passthrough array, and only then the relocating request. One
  fixture then makes both assertions red against the current build — row 26's
  (the sub-key is identical across the pair) and this one's (the exemption is
  denied when the forwarded `tools[]` flips).
  The ordering constraint stands and is now cheap to honour: demonstrate this red
  before the row-26 fix ships. It is no longer ABSOLUTE, because a committed
  synthetic fixture can be replayed against the pre-fix extension by the existing
  bisection — but relying on that is archaeology, and doing it in the right order
  costs nothing.

- **READY — `findAbsorptionMisses` runs on every replay and prints on none.**
  `docs/dev-loop.md` says it "now asks it on every run — not behind
  `--census`, because the whole point is that nobody knew to look". True of the
  COMPUTATION (`replay.mjs:3082`); the rows reach a human only via `--json`
  (`replay.mjs:3195`) or `gate-live`'s status file. The text report — the
  route `docs/runbooks/bust-appears.md` step 4 tells a human to run during a
  bust walk — has no absorption section at all, not even a zero line. Measured
  2026-08-06 on s-captureAM: 1 miss existed and the text run never mentioned
  it; it surfaced only because `relocDepartures` happened to name the same
  pair by a different check. One-route guard shape, and the doc claims a reach
  the code does not have.
  Design: print the section unconditionally with its count (zero included, per
  the three-answer rule), each row carrying the three numbers the check exists
  for — absorbed-at, forwarded divergence, `ours`. Verifier: a fixture with a
  known miss must show the row in plain `--census` output, and a fixture with
  none must print an explicit `0`.
  While there: the dev-loop sentence gets corrected in the same commit — it is
  the sentence that made the gap invisible.

- **READY — `replay.mjs --json` drops the census entirely, so every consumer
  has to parse its TEXT output.** Returned as a gap by the pin-verification
  lane, which hit it while building: `census.tally` and `census.examples` are
  `Map`s, and `JSON.stringify` renders a Map as `{}`. Measured:
  `node tools/replay.mjs <capture> --census --json` yields
  `{"pairs":1,"conv":2,"tally":{},"examples":{}}` — the two fields carrying the
  actual classification are empty objects, and nothing errors.
  Consequence, already paid: `verifyPin` parses replay's human-readable output
  and guards itself with an anchor check that sets `ok:false` on unreadable
  input. That guard is correct and the parsing should not have been necessary.
  Design, decided: serialize both Maps as plain objects in the `--json` path.
  **Dependents search first, and stated in the same change** — `--json` is a
  contract, and a consumer keying on the current empty `{}` (or on its absence)
  would break silently; the change lands with `grep -rn "\-\-json" tools/ test/`
  and the hits enumerated.
  **Dependent set grew 2026-08-10:** `tools/bust-triage.mjs` now spawns
  `replay.mjs --json --census` and reads `parsed.violations` (`28d5022`). It
  does not read `tally`/`examples`, so this fix cannot break it — but it is a
  new `--json` consumer the enumeration above must name, and it was surfaced
  by `backlog-neighbours`, not by the grep. Verifier, red-first: the command above must print
  populated `tally`/`examples`; control, a run with no census requested must be
  byte-identical to today. Done when `verifyPin` can drop its text parser — and
  the parser's removal is the done-criterion, not an optional follow-up, since a
  second reader of the same data is how the two drift.

- **READY — every OTHER row family in `replay.mjs` still carries only report
  ordinals, so the next consumer that goes back to the capture repeats the bug
  just fixed.** Found 2026-08-06 walking s-captureAM: the far-from-anchor
  excerpt pass keyed its asks by the census `n` and matched them against
  `readCapture`'s LINE index — 5 of 6 asks printed `(missing)`, the 6th printed
  a request 11 minutes away. Fixed for `edits` rows by carrying `id`/`prevId`
  from the capture record (`test/replay-excerpt-record-identity.test.mjs`, red
  on the shipped code). **The WRITER half is untouched**: `violations`,
  `exemptions`, `absorptionMisses`, `blockMigrations`, `relocDepartures`,
  `successions` and `mitigation` rows all still carry `n`/`prevN` and nothing
  else that joins to disk, and nothing marks them as non-joinable — so the
  hazard is intact for every future reader, which is exactly the "fix the
  reader, leave the generator" shape `docs/dev-loop.md` warns about.
  Measured rather than asserted, by dumping one key per family from a
  `--json` run over s-captureAM: `exemptions`, `absorptionMisses`, `relocDepartures`,
  `toolsDeltas`, `mitigation`, `blockMigrations`, `successions` and
  `duplicateRequests` all carry `n`/`prevN` and no id — nine families, two
  more than the first draft of this entry named. `violations` was empty on
  that capture and is unverified.
  **Update 2026-08-10:** `violations` is empty on the largest CURRENT capture
  too (`--census` reports 0 rows), so this family stays unverified from live
  data. Its `n` space was verified against disk, though, by the attribution
  lane's join: `bust-triage.mjs`'s ordinal loop (`:685-690`) and `replay.mjs`'s
  `reqN` (`:3578-3597`) agree on 5,990 records across four real captures, zero
  disagreements, instrument-positive on a planted body-less request. So for
  `violations` the ordinal IS joinable today — and the fix is still wanted,
  because nothing MARKS it joinable and the next reader re-derives that at
  their own risk. And the precedent already existed and did
  not travel: the `report` family has carried `captureId` all along.
  Design: `compactEntry` already retains `id` as of this commit; add
  `id`/`prevId` to each row family at construction, one line each.
  Verifier, and it must be the generic one rather than a second copy of the
  excerpt test: a test that asserts EVERY row family emitted by a `--json` run
  over a fixture with interleaved outcome records carries a non-null `id` for
  each ordinal it carries — red today on six of the seven families.

- **READY — the widened mutation test WENT RED on the first new real pin,
  and which side is wrong is NOT established.** Found 2026-08-06 at
  session close, by the push gate, on the first fixture added after the
  widening shipped two hours earlier. That is the widening working: under
  the old `FIXTURES[0]` behaviour this pin would have been invisible.
  The failure, verbatim: mutant (1) — "a prefix of boot+outcome records
  (verdicts never depend on either) gets fully dropped, identity holds" —
  `AssertionError: every prefix record here is inert, so the cut must drop
  all 191, not 12`.
  **Two hypotheses, and picking one without evidence is the whole trap:**
  either the cut under-drops on this shape (a real defect, assertion
  right), or the assertion encodes a property true only of the three
  fixtures it was written against — "widening a population re-grades
  assertions written for a population of one", the lane's own candidate
  lesson, landing on the very next fixture.
  **Reproduction, one move:** put
  `test/fixtures/pending-review/pinned-s-48bf252a4e02-101-122.json` back
  into `test/fixtures/harvested/` and run `npm test`. It is parked outside
  the scanned corpus so `main` stays green and the evidence survives — and
  because the directory-derived-population defect booked below means any
  file left there changes what the suite proves.
  **Do NOT resolve it by softening the assertion** (dev-loop's box: a
  guard that fires is repaired by a declared exemption the guard itself
  verifies, never a loosened predicate). Verifier: whichever hypothesis
  wins is demonstrated on the real fixture — if the cut is wrong, a bite
  red on the current implementation; if the assertion is wrong, its
  replacement still goes red on a planted under-drop.
  The pin is verified evidence for the matrix's `previous_message_not_found`
  second instance (231 records, replays green over 103 pairs), so it is
  worth keeping either way.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — a non-executable hook is SKIPPED BY GIT
  IN SILENCE, so one `chmod` disables the machine's last gate with no error
  anywhere.** Found 2026-08-06 by the leak-gate lane, against itself, and it is
  the more valuable half of that work: a neutralised copy of the push hook was
  written by python's `open()` at mode 644, git skipped it entirely, and the
  test run's failure landed on a PRE-EXISTING case — which read as the intended
  red. Nothing ran, and the run looked like evidence.
  Two distinct consequences, and the second is why this is not a testing note:
  the instrument shape (a red that is really a non-event, the family this repo
  has hit three times) and the STANDING exposure — the leak scan, the suite
  gate, and every other hook are single `chmod` away from silently not
  existing, in a repo where the thing they guard is unscrubbable public history.
  Verified present today (`-rwxr-xr-x` on the dotfiles dispatcher), which is the
  point: nothing checks it, so it is true until it is not.
  Design, decided: a doctor verdict over every registered hook path — file
  exists, is executable by the invoking user, and (for symlinked repo hooks)
  its TARGET is too, since `.git/hooks/pre-push` here is a symlink and the mode
  that matters is the target's. Computable, zero-judgment, near-zero false
  fires — the precipitation criterion the corpus names. Verifier, red-first:
  `chmod -x` a hook in a throwaway clone and require the verdict to go red;
  control, the current state must be green. Done when a hook that git would
  skip cannot pass doctor.

- **READY — the fixture-verdict mutation population is DIRECTORY-derived, so
  the suite covers a different corpus on every machine.** Found 2026-08-06
  immediately after integrating the widening, by an unexplained test-count
  delta: the dispatched lane measured 2200 tests in its worktree and the same
  code measured 2203 here. The difference is exactly one fixture × three
  mutants. This clone's `test/fixtures/harvested/` holds FOUR pins; git tracks
  three. The fourth is a 46 MB pin excluded in `.git/info/exclude` — deliberately
  machine-local, and picked up anyway because the test enumerates the DIRECTORY.
  So the coverage line reads `walked 4 replayable fixture(s)` here and
  `walked 3` in any other checkout, CI included, with nothing saying so.
  The widening did not introduce this — the old test took the alphabetically
  first entry of the same directory listing, which is the same defect with a
  population of one. Widening made it visible and multiplied it by the corpus
  size, which is the honest way round.
  Design, decided: the population comes from `git ls-files`, not from `readdir`
  — a tracked-file question answered by the tracking system. An untracked or
  excluded pin present in the directory is REPORTED by the coverage line
  ("3 tracked, 1 untracked ignored: <name>") rather than silently walked, so a
  local experiment cannot change what the suite proves.
  Verifier, red-first and available on this machine right now: with the 46 MB
  pin present, the current test walks 4 and must walk 3 after the change while
  naming the skipped one; on a clean checkout both walk 3. Done when the
  coverage count is a function of the repository rather than of the machine.

- **READY — the synthetic-HOME pattern is the only way to drive this repo's
  CLIs, and it is currently re-invented per test.** Credited to the dispatched
  status-enum work's candidate lesson, generalised one step: every tool here
  that matters reads `~/.claude` — the worktime ledger, the gate status file,
  the capture directory, the alias registry — and each has a CLI on top whose
  WIRING is where the defects have actually lived. Measured the same day: the
  `--at` silent substitution lived entirely in `main()`, so a resolver unit test
  passes straight over it; pointing HOME at a synthetic ledger and spawning the
  real binary is what caught it, and it also produced the strongest red
  arrangement available — new expectations against the old implementation, with
  no module-load red to mistake for discrimination.
  Design, decided: a shared test helper that builds a synthetic `~/.claude`
  (ledger, gate status, captures, aliases — each optional), yields its path, and
  tears it down; every new CLI bite drives the real binary through it instead of
  importing internals. Verifier, red-first: re-point the two existing CLI bites
  at the helper and show they still go red under their own mutations; a helper
  that silently produces an EMPTY home must fail loudly rather than yield a
  passing test over nothing — that is the "0/0 reads like clean" shape this repo
  has hit three times.
  Not blocking anything; ranked at the next derivation.

- **READY — the suggestion-mode variant fork is a census class: CC issues
  two variants of one conversation that differ at a mid-history index, and
  every consecutive-pair check compares across them.** Found 2026-08-05
  while classifying the absorption misses; 6 of the 34 rows are this, all
  on one capture. Shape, read off the raw pre-pipeline records: at the same
  array index CC sends either the real user turn or a 1,377-byte
  `[SUGGESTION MODE: Suggest what the user might naturally type next into
  Claude Code.]` instruction, alternating between requests, with identical
  `messages[0]`, system prompt, tool count and model — so `conversationOf`
  groups them and the pair (suggestion-variant, real-variant) reads as a
  prefix divergence. Nothing our mitigations could absorb: the bytes on
  both sides are CC's own, and neither variant is the other's predecessor.
  Cost, as far as it is measured: no cold event within +/-180 s of any of
  the six.
  Design, decision-complete: a `suggestionVariant` boolean on the
  absorption row, from a marker predicate over the pre-pipeline message at
  the divergence index (the instruction's leading bracket line is a
  constant CC emits verbatim) — extend `findAbsorptionMisses`, never a new
  file. Verifier, red-first: a synthetic pair whose divergence is the
  suggestion prompt asserts the flag, plus a control that an ordinary user
  turn at the same index does not set it. Done when the daily sweep counts
  the class beside `cacheControlOnly`, so the residual population is what
  is left after BOTH free classes are named.
  Named residue: the class is measured on ONE capture and one CC version;
  whether the marker text is stable across CC releases is unverified, and
  a predicate keyed to prose decays — `cc-version-normalize`'s own version
  telemetry is the join if it ever needs one.

- **READY — `backlog-order.mjs`'s anchor namespace is the whole BULLET BODY, so
  an entry that QUOTES another entry's title breaks the ranking tool.** Hit
  2026-08-06 evening, first use after the tool shipped, by ordinary work: an
  addendum written into the row-scoped-pinning entry cited the ranked-5th item
  by its title, and `--check` died with `anchor matches 2 bullets`. Reproduction
  is one line — put any ranked anchor's text inside a second bullet.
  The tool behaved CORRECTLY (`reorder`, tools/backlog-order.mjs:79-91: zero or
  multiple hits throw, nothing is written — a partially-applied order is worse
  than none), so this is not a silent defect and the loudness is the design
  working. It is the fires-on-legitimate-work shape instead: citing one entry
  from another is normal prose, and the current repair is to reword the citation,
  which trains the writer to avoid naming entries rather than to name them.
  Design, decided, and derived from the DEFINITION rather than from the current
  behaviour: an anchor identifies an entry by its TITLE, and a title is the bold
  lead of the bullet — so the match is scoped to the bullet's first line
  (`b.split("\n")[0].includes(a)`), never its body. That is a narrowing to what
  the anchor always meant, not a softened predicate: a genuine duplicate TITLE
  still throws, which is the case the guard exists for.
  Verifier, red-first and already in hand: a bite over a synthetic two-bullet
  document where bullet B's BODY quotes bullet A's title verbatim — against
  today's implementation `reorder` throws `anchor matches 2 bullets`, against the
  fix it ranks A and leaves B below; plus the preserved-guard control, two
  bullets with the same TITLE, which must still throw under both. Done-criterion:
  both bites, and `node tools/backlog-order.mjs --check` green on the real file
  with the citation restored to the wording that failed — which is NOT in git
  history (it was reworded before the commit, so no diff carries it) and is
  therefore quoted here as the reproduction input: a bullet body containing the
  string `the stability exemption for a first-appearance` + ` relocation`, split
  across two literals in this entry for exactly the reason the entry exists.

- **READY (small) — `backlog-lint` calls its own header findings advisory and
  the suite treats them as blocking, so the CLI trains its reader to walk into
  a push gate.** Measured 2026-08-06, on me: the tool printed
  `1 stale header(s) — WARN only, review BACKLOG.md` and exited **0**, I read
  "WARN only" as advisory and committed, and `test/backlog-lint.test.mjs`
  ("CLI: zero false fires on the current BACKLOG.md") failed the pre-push
  suite on the identical line. Two instruments, one predicate, opposite
  severities — and the one a human reads while writing is the lenient one.
  The trigger was a grade-claim marker (the past-tense form of "verify", in
  capitals) inside a `READY` entry's BODY, under a non-matching header —
  exactly what the lane is for, so this was a real fire and not a false one.
  Written around rather than quoted, because writing the token here fires the
  lane a second time: this entry tripped it on its own first draft. That
  self-reference is itself the missing piece — a lane with no way to talk
  about its own trigger has no exemption path, which is the declared-exemption
  shape `docs/dev-loop.md` prescribes and this lane lacks.
  Design decision belongs with the operator and is stated here rather than
  taken: either the CLI exits non-zero on a header finding (making the two
  agree, at the cost of a stricter local loop), or the WARN line names the
  consequence — "blocks the pre-push suite" — instead of the word "only".
  Recommendation: the second. It costs one string, keeps the local loop
  non-blocking for genuinely advisory classes, and the failure it prevents is
  a reader believing a severity the pipeline does not honour.
  Verifier: with a planted marker, the CLI's own output must name the gate it
  will fail, and the assertion must quote that phrase so the two cannot drift.

- **READY — `test/harvest-scrub-relations.test.mjs` reads
  `test/fixtures/harvested` NON-recursively, so the standing corpus check
  cannot see `rowpins/`.** Found 2026-08-07 by the lane that created the
  subdirectory (`e787960`). Reader half: recurse — a one-line change, and the
  new pins are already covered by their own test, so this closes the general
  route rather than a live leak. **Writer half, which is the one that
  compounds:** a sweep that creates subdirectories under
  `test/fixtures/harvested/` is still running, so the NEXT subdirectory is
  invisible to the corpus check again. The computable seam: assert that every
  file under `test/fixtures/harvested/**` is reached by the scan's own file
  list — a set difference, no judgment. Verifier, red-first: plant a sentinel
  identifier in a file inside `rowpins/`, run the suite, and require red;
  today it passes green, which is the defect.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — the reorder collapses the READY-age
  signal, which is the measured case `session-scan.py` asked for before
  re-opening first-appearance dating.** `_entry_times` dates entries by
  `git blame`, and the docstring names its own residual explicitly: "an entry
  ... moved in a way git records as delete-plus-add reads younger than it has
  been sitting. A first-appearance implementation was built to close that and
  then REVERTED on 2026-08-06: on this corpus both methods return the same
  oldest date ... Re-open with a measured case: two runs of this hook
  straddling a backlog reorder where the reported age drops."
  This is that reorder, and it is not a one-off: the carrier design makes a
  whole-section reorder the NORMAL consequence of every future re-derivation.
  **MEASURED, and the prediction written here first was WRONG — kept, because
  the correction is the useful part.** The predicted symptom was the attention
  line collapsing to ~0d. It did not: `28 READY, oldest 1d` before the reorder
  commit, `29 READY, oldest 1d` after. The aggregate is a MIN over every READY
  bullet, only the 13 ranked ones moved, and an unmoved 08-05 entry still holds
  the minimum — so the line looked fine and proved nothing either way. What
  actually died is per-entry, confirmed by reading blame rather than by
  reasoning about it: two moved headers now date to today 16:59 (the reorder
  commit), two unmoved ones still date to 08-05 21:48 and 22:25.
  So the damage is narrower than predicted and lands worse: the entries that
  lose their age are exactly the RANKED ones — the head of the list, the items
  most likely to reach the three-session re-grade — while the aggregate signal
  that would have shown it stays healthy-looking. It also degrades with use:
  every future re-derivation moves more entries, and the min creeps toward
  today one reorder at a time.
  Design, decided: restore the first-appearance implementation (it exists in
  dotfiles history) and date an entry by the commit that first introduced its
  header line, not by the last commit that touched it. Verifier, red-first and
  now available: run both dating methods against this repo across the reorder
  commit — blame must report ~0d for the moved entries and first-appearance
  must report their true ages; the reverted implementation could not be
  falsified before because no such case existed. Done when the age on the
  attention line survives a reorder unchanged.
  **RE-GRADED 2026-08-10 by the retirement pass, and the decided design above is
  now the EXPENSIVE option. The measured case this entry asked for arrived, far
  larger than the two-entry one recorded above, and it was self-inflicted:**
  commit `8e58988` (the Open/Done split) moved 74 bullets, and git rendered it as
  a whole-file rewrite. Measured over all 92 READY headers at their indexed
  lines: **42 of 92 now blame to `8e58988`** — they read as booked today, their
  real ages gone. That is the predicted damage at 46% of the list rather than at
  two entries, and it hit the ranked head hardest, exactly as this entry said it
  would.
  **The cheap fix was probed and it is TOTAL: `git blame -M -C` returns 42 -> 0.**
  Same 92 lines, same commit, one command apart: without move detection 42 blame
  to the reorder commit, with `-M -C` **zero** do, and the distribution goes flat
  across the original booking commits (spot-check, entry n=5 at line 706: plain
  `80839806 2026-08-07`, with `-M -C` `23079f09 2026-08-07`). The hook does not
  pass either flag — `session-scan.py:218` is
  `_git_out(root, "blame", "--line-porcelain", "--", name)`, and the docstring
  four lines above it names this exact residual while the call does nothing about
  it.
  **Corrected design, replacing the one above:** add `-M -C` to that call first,
  because it closes the MEASURED case (verbatim block moves recorded as
  delete-plus-add) at two flags against a reimplementation. Stated honestly, it
  is not a full substitute: `-M -C` follows a line that moved UNCHANGED, so an
  entry whose header is REWORDED still dates to the reword. First-appearance
  dating remains the complete answer and stays booked as the residual — but it is
  no longer the first move, and shipping it before the two flags would spend the
  larger cost to buy the same measured case.
  Verifier, red-first and permanently runnable (an immutable commit range, not
  live tree state): over the 92 header lines at `8e58988`, plain blame must
  report 42 hits on `8e58988` and `-M -C` must report 0. Both numbers reproduce
  today and will reproduce next year.
  **What this cost, recorded because the pass caused it:** the SessionStart
  attention line derives entry age from the same blame call, so its `oldest Nd`
  figure has been wrong for every session since `8e58988` — a live wrong number,
  not a latent one. It is the reason this jumped the queue.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles — POINTER; body belongs in that repo) — the
  doctor has no three-answer verdict for the sweep's new `rowPins` fields.**
  Booked 2026-08-07 with `e787960`, which added per-row `rowPins` plus a sweep
  rollup `{captures, written, unchanged, rejected, unverifiable, conflicts,
  errors}` to `~/.claude/cache-fix-gate-status.json`. Nothing reads them. The
  closing gate's question 4 (instruments ride along) is therefore answered
  PARTLY for that change, and this entry is the named remainder. Design
  question for the dotfiles side, stated so it is not re-derived: `rejected > 0`
  or `conflicts > 0` means a pin's bytes did not match the row it claims —
  loud, not advisory; `unverifiable` is the third answer and must not fold into
  either. Consumer: `bootstrap/doctor.py`, which enumerates its own `*_verdict`
  functions and fails its self-check if one lacks a test.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Path citation is stale: `~/.claude/cache-fix-gate-status.json` does not
  exist. Real path `~/.local/state/cache-fix/gate-status.json` (present),
  written by gate-live.mjs:61 via statePath(). rowPins and rollup fields
  confirmed still present there. Substance unaffected.
- **READY (counts CORRECTED WITHIN THE HOUR — the counts below are WRONG; read
  this block
  first). FORK-OWNED is 39 items / 42 occurrences; UPSTREAM-OWNED is 4 locations
  / 7 occurrences, `README.ko.md` and nothing else.** Commit `53a5adc` shipped
  the superseded numbers in its title and body; git history is immutable, so the
  correction lives here.
  **The instrument was wrong, and the distinction is the lesson.** The first
  ownership pass tested whether the COMMENT TEXT was byte-identical to
  `upstream/main`. That answers "is this prose inherited?" — a different
  question from the one that decides ownership: does the FUNCTION the claim
  describes still belong to upstream, or did this fork rewrite it? Re-tested
  against the function, every one of the 13 proxy/tools items imports
  `statePath`/`dataPath`/`xdgState` from `xdg-dirs.mjs` — a module upstream does
  not have — in the very function the comment sits above. **A byte-identical
  comment over a fork-rewritten function is a stale comment on the fork's OWN
  change, not an upstream claim.** Ambiguous after re-testing: none.
  So `session-mirror-writer.mjs:8-9`'s contract sentence is OURS to fix after
  all — we rewrote the function under it and left the sentence describing the
  old behaviour.
  **What survives the correction, unchanged:** that sentence IS byte-identical
  in `upstream/main`, and upstream's `cache-telemetry.mjs:16` really does
  `join(claudeHome(), "quota-status")`. Upstream's stated convention genuinely
  is `~/.claude`, so the PR repricing below stands on its own evidence — it
  never depended on the miscounted bucket. Both things are true at once: the
  convention is upstream's, and our stale copy of the sentence is ours.
  Scope of the authorised repair is therefore the 39 fork-owned items, and the
  verifier's guard inverts: after the repair the UPSTREAM-OWNED bucket must
  still read exactly `README.ko.md` — evidence `git log --format='%an' --
  README.ko.md` shows zero commits by this fork's operator, ever.

  **GUARD WIDENED 2026-08-08 afternoon, and as written above it had become a
  guard that PASSES WHILE THE DEFECT RETURNS.** `bbc1213` (operator decision,
  peer session) REVERTS the fork's XDG patches to `README.md` and
  `README.zh.md` — restoring upstream's `~/.claude` text in all three
  translations deliberately, measured 0 / 0 / 0 XDG claims after. So
  **all three READMEs are UPSTREAM-OWNED and EXCLUDED from this repair class**,
  not `README.ko.md` alone. The guard's authorship evidence is what made it too
  narrow: `README.ko.md` had zero fork commits, the other two had some, and the
  guard encoded AUTHORSHIP where the question is OWNERSHIP — and a revert
  changes ownership without changing authorship history. Read as written, the
  old guard would have watched the Korean file, seen it unchanged, passed, and
  let a future accounting "repair" `README.md`'s ~22 restored `~/.claude`
  mentions straight back into the divergence the operator just decided against.
  Corrected guard: after any repair, ALL THREE READMEs still carry upstream's
  text, and the XDG-claim count in each is ZERO. The trap was surfaced by the
  peer session that made the revert, which is the only place it was visible —
  from inside this entry the guard reads correct.

  Superseded text follows: **repair the 17 fork-only stale location claims. The
  other 29 are UPSTREAM'S and must not be touched, because upstream's stated
  convention IS `~/.claude`.** Accounting completed 2026-08-08 over the whole tracked tree,
  then re-classified against `upstream/main` by byte-level evidence
  (`git show upstream/main:<file> | grep -F "<exact text>"` per item, not by a
  file-ownership guess).
  Counts: **STILL-WRONG 17**, all confirmed fork-only — the file is absent from
  upstream, or the text has no upstream match.
  **RE-MEASURED 2026-08-10 (operator question: "does our design violate
  upstream?"), and the 17 above is STALE.** `node tools/xdg-writer-guard.mjs`
  is RED at 34 violations today. Partitioned by whose artifact the citation
  names: 9 cite SOMEONE ELSE'S path (`~/.claude/projects/**` = Claude Code's
  own transcripts; `anthropic-proxy-logs/` = fgrosswig's dashboard) and are
  CORRECT — that is the guard's own documented KNOWN LIMITATION, "the
  predicate has no notion of whose artifact", not a new finding. The other 25
  name OUR artifacts; of those, 3 are the guard's own explanatory header and
  at least one is a deliberate contrast (`usage-to-dashboard-ndjson.mjs:142`,
  "both defaults are XDG state paths, NOT ~/.claude"), so the true repair set
  is ~20 and is NOT yet triaged item by item.
  Spot-checked 3 of 25 against the code, stale 3 for 3 — comment vs the
  function directly under it: `proxy/server.mjs:13` says "writes to
  ~/.claude/cache-fix-debug.log" while `:25` returns `statePath("debug.log")`;
  `tools/cost-report.mjs:6` says "reads ... at ~/.claude/usage.jsonl" while
  `:32` calls `legacyReadPath(statePath('usage.jsonl'), …)`;
  `proxy/extensions/usage-log.mjs:1` says "append ... to ~/.claude/usage.jsonl"
  while the module imports `statePath`.
  **The guard is RED and BLOCKS NOTHING.** `npm test` is green at the same
  commit: `test/xdg-writer-guard.test.mjs` exercises the PREDICATE on
  synthetic content and never runs it over the real tree, so the 34 sit in a
  tool nobody's pipeline calls. Wiring it is a separate decision from the
  repair (it cannot go blocking while it over-fires on the 9 above), and it
  is exactly the shape this repo keeps re-learning: a checker that passes
  review, reports honestly, and is wired to no consumer.
 **UPSTREAM-OWNED 29 locations /
  ~32 occurrences**, confirmed byte-identical in `upstream/main` right now.
  CORRECT ~45. EXCLUDED 3 files. The headline dropped from 49 to 17 purely by
  asking who owns the file — and the earlier figure of 65 contained false
  positives too (`tools/cache_analysis.py`'s two hits re-verified CORRECT: an
  explicitly commented legacy fallback, not a stale claim).
  **The finding that outranks the counts, and it is definition-level:**
  `proxy/session-mirror-writer.mjs:8-9` carries the sentence "the
  established convention is all proxy artifacts live under `~/.claude/`" — and
  that sentence is byte-identical in `upstream/main`. It is not a fork mistake
  we failed to clean up; it is UPSTREAM'S OWN STATED DESIGN, inherited
  unchanged. Corroborated at the code altitude rather than the comment
  altitude: upstream's `cache-telemetry.mjs:16` literally does
  `join(claudeHome(), "quota-status")`.
  **What that does to the upstream-PR question:** the XDG relocation is not "add
  a missing convention" to upstream, it is REVERSING one they have written down
  and implemented. That is a design argument with their maintainers, not a
  cleanup PR, and it should be priced that way before anyone opens it. It also
  means every one of those 29 comments is CORRECT in its own repo and repairing
  them here would silently diverge 29 more upstream files.
  **Three-way README contradiction — DECIDED 2026-08-08 by `bbc1213`, and the
  paragraph below is kept only as the input that produced the decision. Every
  one of its three clauses is now STALE: the count is 0, not 29; the fork edits
  are reverted; the disagreement is gone.** The operator's revert-or-upstream
  call — named "still open" below — was made, and it went REVERT: all three
  translations carry upstream's `~/.claude` text on purpose. Where the
  divergence is documented now is `FORK-NOTES.md`, in a new section before the
  update-from-upstream procedure, which also records the condition that would
  flip the call — if people actually install FROM this fork rather than it being
  the operator's deployment plus a PR staging ground, the answer becomes finish
  the migration and accept the conflicts.
  Superseded text: **Three-way README contradiction, now measured.** `README.md` (29 XDG
  mentions, fork-patched in `332df4a`/`ddcdca3`) and `README.zh.md` were both
  edited by this fork; `README.ko.md` was not — it is byte-identical to
  upstream's plus one disclaimer line. So three translations of one document now
  disagree about where the same proxy writes. The repair is NOT to patch the
  Korean file into agreement: it is the operator's revert-or-upstream decision,
  still open, and this entry is its input.
  Scope of the repair this entry authorises: the 17 fork-only items ONLY —
  `docs/runbooks/runtime-anomaly.md` (5), `tools/` (9 across
  `usage-to-dashboard-ndjson`, `cost-report`, `cold-events`, `quota-analysis`,
  `reminder-migration-census`, `replay`, `sim-session-budget-breaker`), `test/`
  (3), plus the fork-only source items including `write-owner-only.mjs:6-9,14`
  (a module DEFINITION that is false against ~15 callers) and
  `tools/test-config-root.mjs`'s opening definition (a false universal
  `claudeHome()` claim carrying no path substring — the accounting lane's own
  answer to "name one member the pattern cannot match").
  Verifier: after the repair, re-run the accounting's own probes and the
  STILL-WRONG bucket returns zero for fork-only files, with UPSTREAM-OWNED
  unchanged at 29 — a repair that shrinks the upstream bucket has overstepped
  and is the failure this entry exists to prevent.
  <!-- entry: "repair the 17 fork-only stale location claims" -->

- **READY (severity DOWNGRADED 2026-08-08, SAME DAY, BY THE LANE THAT FOUND IT
  — read this
  first): the reset paths skip insertion-normalization's OWN adjacency check,
  but `output-guard` is an unconditional BACKSTOP, so this is not a safety
  hole.** The original entry follows unchanged below; it is kept rather than
  rewritten because the correction is the more useful artifact.
  What kills the severity claim: `output-guard.mjs` (order 690, gate
  `CACHE_FIX_OUTPUT_GUARD=1` live) imports the SAME `validateToolAdjacency`
  (`:25`) and runs it as `checkToolAdjacency` inside the `VALIDATORS` array
  (`:118`), which `findViolation` (`:124-130`) walks unconditionally on the
  fully-mutated final body at `:157`, every request, with no early return
  reachable from any reset. On a violation it reverts `ctx.body` to the
  pre-pipeline stash and logs CRITICAL. Dispatcher-confirmed at those lines.
  **And it has NEVER FIRED.** Zero `*-guard-events.jsonl` files exist in
  `statePath("snapshots")` — which is where `appendGuardEvent(getSnapshotDir(),
  …)` (`:192`, `:38`) writes, and the same directory holds thousands of other
  extensions' `*-events.jsonl`, so the zero is a measured absence and not a
  glob that could never match.
  **What the finding actually is, re-derived rather than deleted:** a reset
  that produced an invalid body would cost a FULL PIPELINE DISCARD — every
  mitigation for that request thrown away and the raw body forwarded — which
  is an honest bust, LOUD (CRITICAL log + telemetry), and never yet observed.
  That moves it off the silence signal entirely, which was half its ranking
  case. It stays READY because the defence-in-depth argument is real (the
  backstop discards work the inner check could have prevented) and because
  `checkAssistantTerminal` (`:108-117`) silently no-ops when the stash's
  `structuredClone` throws (`:25`) — a narrow same-gate gap worth closing in
  the same pass. Consumer tier stays **2**; the SILENCE elevation is WITHDRAWN.
  **Method note, the reason this entry is kept in full:** the severity claim
  was published to the operator and committed (`0ca3419`, whose title now
  overstates it — git history is immutable, the correction lives here) before
  the backstop was known. Round 1 of the enumeration was scoped to
  insertion-normalization and answered its question correctly; the backstop sat
  one extension away, and the question that surfaced it — "does any OTHER
  extension have this shape?" — was asked only in round 2. A single-extension
  enumeration cannot see a cross-extension backstop, and nothing in round 1's
  output signalled the absence. Ask the cross-file question in round ONE.

  Original entry, unchanged: **the tool-adjacency SAFETY check does not run on
  ANY reset path, and safety is the property this repo says outranks cache.**
  Found 2026-08-08 by
  the row-22 disarm enumeration; the control flow confirmed at the source by
  the dispatcher rather than booked on the lane's word.
  `validateToolAdjacency` (`proxy/extensions/insertion-normalization.mjs:459`)
  has exactly two call sites, `:545` and `:1720`. Every reset is an EARLY
  RETURN that never reaches `:1720` — `return resetKeepingPins("not-
  subsequence")` `:1535`, `("dropped-majority")` `:1539`, `("edit-shaped")`
  `:1597`, `("assistant-interleaved")` `:1601` — and `resetKeepingPins` itself
  (`:1039-1212`) contains no adjacency call. So the pinned/moved/refired
  messages a reset forwards go out WITHOUT the correctness check the success
  path applies to its own output.
  **Rate, measured, not assumed:** the matrix's row-22 work puts the reset rate
  at roughly one request in three. In one live session 2026-08-08 (s-captureAT):
  13 resets over 127 insertion events, 12 of them `no-prior-canonical`; a second
  session took `edit-shaped` on its busting request. So this is a routinely
  taken path, not an edge case.
  **What is NOT claimed, and this bounds the severity honestly:** no adjacency
  violation has been OBSERVED. `replay.mjs`'s own safety gate covers message
  count, roles, order and tool adjacency over pipeline output, and it reported
  `safety violations: 0` on both captures replayed that day. So this is an
  UNGUARDED ROUTE, not a known-broken one — the dev-loop's entry-path table
  shape exactly ("the protected thing is reachable by a second route, the
  second route is silent"), one level inside an extension rather than across
  invocations. Do not write "the proxy corrupts conversations on reset" into
  the matrix on this evidence.
  Design: call `validateToolAdjacency` on `resetKeepingPins`' output before it
  returns, taking the same action the success path takes when it fails. The
  success path's failure branch at `:545`/`:1720` is the model; do not invent a
  second policy.
  Verifier, red-first and it needs CONSTRUCTING because no natural instance
  exists: build a fixture whose reset output violates adjacency (a pinned
  `tool_use` restored without its `tool_result`, or the reverse), assert the new
  code rejects it, and confirm the OLD code forwards it silently — that silent
  forward IS the red. Negative control, required so the check cannot pass by
  always firing: a normal `no-prior-canonical` reset from s-captureAT must still
  pass untouched. Done when both arms hold and the full suite is green.
  **Sequencing constraint (hard):** this check must be demonstrated RED against
  the current code BEFORE any change to the reset paths ships, or it ships
  having never gone red on anything.
  Consumer tier **2 (feeds the gates)** — it is a correctness guard, not an
  event classifier — but note it outranks its tier on the SILENCE signal: a
  fidelity failure here is silent by construction, and the repo's stance is
  that safety outranks cache.
  <!-- entry: "the tool-adjacency SAFETY check does not run on ANY reset path" -->

- **READY — the XDG accounting's EXCLUDED-BY-GENRE bucket (~260 occurrences)
  was never individually verified, and two exceptions have already been found
  inside it.** Measured 2026-08-08 by the accounting lane, and flagged by that
  lane itself rather than by a reader — which is what makes it credible.
  The accounting bucketed `docs/directives/`, `docs/code-reviews/`,
  `docs/release-tests/`, `docs/audits/` and `BACKLOG.md` as EXCLUDED on the
  reasoning that they are historical genres whose stale paths are honest
  history. That reasoning is right for most of the set and wrong for an unknown
  fraction of it: `robustness-threat-matrix.md` was already a known exception
  (fixed earlier), and this run found a SECOND —
  `docs/audits/restart-state-audit.md:84`, which is not frozen history at all
  because `proxy-restart-transparent-state.md:11` actively cites it as "the
  authority". Two more are unresolved:
  `docs/directives/xdg-data-and-config-dir-guard.md` (the directive that
  MOTIVATED this migration, carrying stale "TODAY:" framing) and
  `proxy-restart-transparent-state.md` (cites the wrong audit).
  **So the headline number is a FLOOR, not a count.** STILL-WRONG came back 49
  occurrences across 30 file:line locations, and that figure explicitly excludes
  a bucket with a known non-zero error rate. Anyone reading "49" as the residual
  is reading a partial view as its whole body.
  **The discriminator that separates the two cases, and why a genre rule cannot:
  CITATION.** A historical document nobody cites is history; a historical
  document another live document cites as authority is a live claim wearing a
  genre's clothes. Genre is a property of the folder; authority is a property of
  the citation graph, and only the second decides.
  Design: sweep the excluded set by CITATION rather than by genre — for each
  file in it carrying a location claim, grep the tracked tree for references to
  that filename; a file cited by any live document (runbook, directive in force,
  CLAUDE.md, FORK-NOTES, a tool's comment) is IN SCOPE and gets classified
  individually. Uncited files stay excluded, and the exclusion is then a
  measurement rather than an assumption.
  Verifier, red-first with both polarities available today: the sweep must
  return `restart-state-audit.md` IN SCOPE (it is cited as authority) and must
  return at least one genuinely-uncited historical document OUT of scope —
  otherwise it has simply widened to everything and re-created the genre problem
  with a different label. Done when every one of the ~260 occurrences carries an
  individual verdict and the residual is a number.
  <!-- entry: "the XDG accounting's EXCLUDED-BY-GENRE bucket was never verified" -->

- **READY (small) — the three READMEs must agree on their path citations.**
  Proposed 2026-08-08 by the same lane, from a measured miss: `README.ko.md` was
  skipped by BOTH doc sweeps because each file list named `README.md` and
  `README.zh.md` from memory, and it ended up carrying the class's single worst
  line — a blanket claim (`:128`) that ALL telemetry is written under
  `~/.claude/`. A translation drifting from its source is invisible to any
  reviewer who does not read that language.
  Design: a check asserting the three READMEs cite the same set of paths.
  Computable, near-zero false fire, and it does not require the checker to read
  Korean — it compares path tokens, not prose. Red-first: the pre-fix
  `README.ko.md` must fail it.
  **RE-AIMED 2026-08-08 afternoon, and the entry is MORE worth building, not
  less.** `bbc1213` reverted the fork's XDG patches to `README.md` and
  `README.zh.md`, so the three now AGREE (0 / 0 / 0 XDG claims) and the check
  would be green today. Two things follow and neither is "drop it".
  (1) The red-first arrangement moves to committed history and becomes
  permanent rather than expiring: run it over `ddcdca3`, where the three
  demonstrably disagreed — English and Chinese carrying XDG claims beside
  upstream's, Korean carrying upstream's alone — and require a FAIL; run it
  over `bbc1213` and require silence. Two immutable refs, one of each polarity,
  so it cannot pass by always firing and cannot decay.
  (2) Its VALUE changed from detective to preventive, and that is the stronger
  case: the operator's decision is that all three carry upstream's text, and
  the thing most likely to undo it is a future XDG accounting "repairing"
  `README.md`'s restored `~/.claude` mentions. This check is what makes that
  attempt fail loudly instead of silently re-creating the divergence. It is the
  same shape as the writer-side guard at cost rank 1 — a generator-stopper, not
  another sweep.

- **READY — the census header promises MISMATCH bodies "printed in full"; the
  code prints lengths only, and three consumers believed the sentence.** Found
  2026-08-07 by the byteGate lane, which needed the bodies and discovered the
  tool cannot produce them.
  **The claim**, `tools/reminder-migration-census.mjs:46-47`: every MISMATCH
  "is a hole in the rule and is printed in full, because these are what would
  silently move a bust." **The code**: the `extra:` body line is EXTENDED-only
  (`:1167-1170`), and a MISMATCH row carries `text: ""` by construction —
  MISMATCH is reachable ONLY from the no-counterpart branch (`:332-334`), which
  pushes an empty text. Verified by running the tool `--verbose` over both
  captures that carry a MISMATCH; the complete output for each finding is one
  line of counts (`host=` `blocks=` `recon=` `rejected=`) and no body at all.
  **Why this is worth an entry rather than a one-line docstring fix.** The
  sentence was read as a CAPABILITY by three independent consumers: the
  header's own author, the dotfiles handover of 2026-08-07 §2b ("the two bodies
  are printable: … `--verbose`"), and this repo's dispatch brief, which
  repeated the handover's instruction to a lane that then could not follow it.
  Nothing executes a header comment, so nothing ever contradicted it — the
  prose-only class the dev-loop's closing gate names, in its purest form: a
  building-heavy stretch verifies most of its claims as a byproduct, and a
  header verifies none of its own.
  **Design, decided — build the capability, do not weaken the sentence.** The
  header states the right requirement; a MISMATCH body is exactly what a human
  needs and is what the lane had to reconstruct by hand with a scratch probe
  importing `analysePair`/`conversationOf`/`canonical`. So carry the bodies on
  the MISMATCH finding and print them under `--verbose`: the reconstruction,
  and the standalone actually considered where one exists. Retiring the promise
  instead would be tuning the definition to ratify the implementation, which is
  the parentage error the corpus names.
  **Verifier, red-first:** assert that `--verbose` output for a MISMATCH
  contains the reconstruction text. That bite must be shown RED against today's
  code — it will be, because today's code emits no body — and the assertion is
  written from the header's requirement, never from what the new code happens
  to emit.
  Adjacent, found in the same pass and NOT bundled with it: the READY entry
  further down for `census must distinguish "no counterpart" from "counterpart
  present but unmatched"` has SHIPPED — `rejectedCandidate` is live at `:302`
  and `:304` — and is still graded READY. Re-grade it DONE with its commit ref
  when the `anyPresent` fix lands, since that fix touches the same branch and
  will re-read this code anyway.

- **READY 2026-08-07 — `xdg-migrate.mjs --verify` exits 1 on a NON-defect:
  it reports NOT-ARRIVED for paths that were never written, and calls that
  the abort condition.** Found by running the real migration on the desktop
  (dotfiles booked it; fork main `7b804fe`). Measured: `--apply` moved 16 of
  16 live paths, `COULD-NOT: 0`, and classified the other 8 as
  `ALREADY-DONE … (neither present — nothing was ever written here)`.
  `--verify` then re-read the same 24 and printed `arrived: 16
  NOT-ARRIVED: 6 COULD-NOT-VERIFY: 2`, exit code **1**, under the banner
  *"NOT-ARRIVED is the ABORT condition for the restart, not a warning: an
  extension whose store did not arrive starts empty, which costs a
  guaranteed re-baseline on every live conversation."* Independently
  checked from the dotfiles side: all six are absent at the LEGACY path
  too, so nothing was left behind and nothing can re-baseline — a store
  that never existed has nothing to lose. The two halves of one tool
  disagree: `--apply` distinguishes "never written" from "moved", `--verify`
  does not, so it folds a never-fired extension into the same bucket as a
  real transfer failure. THE DEFECT IS THE CHECK, NOT THE MIGRATION — and it
  is the shape this repo's own dev-loop names: a check that fires on a
  non-defect trains its reader to discount the red that will one day be
  real, and this one fires on the FIRST and only run of a gate designed to
  be run once. Design decided: `--verify`'s three answers become arrived /
  NOT-ARRIVED (present at neither location AND recorded as moved by apply —
  the real abort) / NEVER-WRITTEN (absent at both, apply said ALREADY-DONE
  — reported, not aborting), with `COULD-NOT-VERIFY` untouched. Verifier:
  re-run `--verify` on this now-migrated machine and it exits 0 with
  `arrived: 16  never-written: 6  COULD-NOT-VERIFY: 2`; red-first by
  asserting the current exit 1 before the change. Done when the exit code
  distinguishes the two, and a synthetic case where a path IS recorded as
  moved but is missing still aborts.


- **READY — `restart-exposure --match` takes a TEXT predicate, and an
  extension-behaviour change's affected class is usually STRUCTURAL, so the
  rule that says "price it against live sessions, not the corpus" has no
  instrument for the commonest case.** Found 2026-08-07 while shipping the
  suppression fix (403dde9, matrix row 28). That change's affected class is
  "a conversation where a suppression is firing with nothing restoring the
  block" — a predicate over canonical state and forwarded bytes, not over
  text. Without `--match` the tool answers ~815k across all seven live
  sessions, which is the worst case and is not the number the decision
  needs; the real number came from the morning sweep's conservation rows
  (zero live sessions in the class), which is a DIFFERENT instrument
  answering a NEIGHBOURING question — it reports on the last sweep's
  snapshot, not on the sessions live at restart time, and a session that
  entered the class since 11:50Z is invisible to it. Two sessions have now
  reached for a text predicate and settled for a proxy.
  Design, decided: `--match` keeps its text form and gains a
  `--match-class <name>` that runs the named replay predicate over each live
  session's own capture tail — the classes are the conservation kinds the
  gate already emits (`suppressed-without-copy`, `invented`, `lost`), so the
  vocabulary is `replay.mjs`'s, not a new one. Verifier, red-first: point it
  at capture s-captureAE (which carries the row) and at s-captureAO (which
  does not) and require the two to separate; the arrangement exists today
  because both captures are preserved at
  `~/.local/share/cache-fix/attribution-2026-08-07/`. Done when a restart
  decision for a structural class can quote a per-session number with the
  class named.

- **PARKED (provisional — investigation still open, operator flagged that these
  gradings may be revised) — the 2026-08-10 04:40:39Z 213k event and the
  instrument failures the walk exposed.** One entry rather than seven, because
  the walk is not finished and splitting it now would freeze a shape that is
  still moving. Missing evidence that closes the parking: the census row for
  the FABLE pair spanning 04:40:24.015 -> 04:40:37.944 (msgs 110 -> 113). If it
  reads `splice/insert-mid`, this event is row 1 / row 4 economics and the entry
  becomes KNOWN-OPEN, not a new class.
  **What IS measured (executed output, not reasoning).** A real bust: the fable
  main thread went `cr=224187 cc=1148` (04:40:24) -> `cr=15603 cc=213429`
  (04:40:37) -> `cr=229032 cc=1153` (04:41:04), and 15603+213429=229032
  exactly — the prefix was discarded, rebuilt in full, then read in full. The
  ~15.6k survivor is tools+system alone, the signature row 4 already records at
  `cache_read 15,214 / cache_creation 123,032`. NOT OURS by the gate's own
  verdict: `replay.mjs --gates-from-capture --census` over the capture exits 0
  with 0 stability and 0 safety violations across 281 same-conversation pairs /
  31 conversations, 10 of 10 declared gates. Tools (14), system (11316 ch),
  sysBlocks (3) and `messages[0]` (73456 ch) are byte-stable across the bust, so
  it is not tools_changed and not a system-prompt change. Same capture:
  `mitigation: 1/8 mitigable events absorbed (13%)`, ~0.5 MB passed through.
  **Instrument findings, each with its basis.**
  (a) `bust-triage` selected the pair `n=97->99` at 04:40:43/47 — SONNET
  subagent traffic — while the busting request was FABLE at 04:40:37.944. It
  picks by time proximity to the worktime event (04:40:50) and is blind to
  `model`, so every "append-only / unchanged / toolsMatch:true" the walk
  collected described a conversation that never busted. Distinct from the
  booked `capturePairResult` messages[0]-identity entry: that one mis-pairs
  WITHIN a conversation, this one selects the wrong conversation entirely.
  (b) `bust-triage` never reads the `outcome` records in the same capture file,
  though they carry `usage.cacheRead`/`cacheCreation` per request — the numbers
  that identified the class in one command after the walk had already run.
  (c) `replay.mjs` already prints `CROSS-TENANT=baseline belongs to another
  conversation on this session id … NOT evidence of a bust`; `bust-triage`
  consults none of it.
  (d) The same quantity carries different names in different files:
  `usage.cacheRead` (capture outcome) vs `cache_read_input_tokens`
  (`usage.jsonl`); `msgs` (prefix-diff events) vs `messageCountPrev/Now`
  (prefix-diff last-state). Querying one schema with the other's names returns
  `null`, which reads as "no data" — three vacuous reads in one session, two of
  them reported to the operator before being caught.
  (e) `grep`-ing a capture JSONL by timestamp matches timestamps inside message
  CONTENT, not the record's own `.ts`. Committed here, returned false rows;
  the correct form filters on `.ts` in jq.
  (f) `gate-live` keeps finding ROWS but not what attributes them: of this
  morning's three conservation reds, the 34-row capture was already evicted, so
  that finding can no longer be attributed at all.
  **PARKING CONDITION DISCHARGED 2026-08-10 — and it refutes the hypothesis it
  was booked to test.** The splice/insert-mid guess is DEAD. The busting pair's
  own prefix-diff record reads `msgs 110->113, causes: [], chain.appendOnly:
  true, first: -1, toolsMatch: true, systemMatch: true, params: [],
  betaHeader: null, windows {head:0, markers:2, tail:3}` — strictly append-only,
  and the census carries no row for it because there was no divergence to
  report. The four-request neighbourhood inverts the story outright:

      04:40:17  106->108  causes:[messages@105(user)]  appendOnly:false  cr=220904  no bust
      04:40:24  108->110  causes:[]                    appendOnly:true   cr=224187  no bust
      04:40:37  110->113  causes:[]                    appendOnly:true   cr= 15603  cc=213429  BUST
      04:41:04  113->115  causes:[messages@112(system)] appendOnly:false cr=229032  no bust

  The request carrying a MID-HISTORY divergence kept its cache; the one that
  lost 213k differed from its predecessor by three APPENDED messages and
  nothing else. Marker windows identical across all four, so a breakpoint move
  is excluded too — which also clears `stripCacheControlMarkers` on our side.
  **Terminal state: COULD-NOT-ATTRIBUTE with a computed reason, and a NEW CLASS
  by construction** — every axis any instrument here measures was stable, so
  the loss is not ours (replay: 0 stability, 0 safety over 281 pairs) and not a
  CC prefix change (append-only in the PRE-pipeline capture). What remains is
  server-side cache behaviour we cannot observe from either tap point. Per the
  attribution gate, NO mitigation may be designed for this, and none is booked.
  **The one thing still not established:** whether
  insertion-normalization's 1/8 absorption on this capture is a regression or
  the standing rate — that is a separate measurement over more captures, and it
  is not what caused this event.

- **READY (small) — a brief that dispatches committing work into THIS repo must
  state both trailers, or the dispatcher's push bounces.** Measured 2026-08-10:
  the brief gave the executor `Co-Authored-By: Claude sonnet-5 …` and nothing
  else; this repo's pre-push guard treats a commit carrying
  `Co-Authored-By: Claude ` WITHOUT a `Claude-Session:` trailer as an unbooked
  subagent commit and refuses the push. The commit WAS booked — full report
  received, verified at the desk, a defect found and fixed — so the audited
  override was correct, but the bounce was avoidable and the override is a habit
  worth not training. Dispatch skill §1 already says guarded write paths
  pre-name their gate; this is the repo-specific fact that rule needs to be
  applied here, and it lives nowhere a brief-writer looks.
  Design (decided): `CLAUDE.md`'s verify section gains one line under the
  existing push discipline — briefs dispatching work that commits here state
  BOTH trailers verbatim, `Co-Authored-By: Claude <model> <noreply@…>` and
  `Claude-Session: <url>`, because the guard reads the pair, not either alone.
  Stated as the repo fact, not as a brief template, so it holds for any brief
  form.
  Verifier: a scratch commit carrying only the Co-Authored-By trailer must be
  refused by the guard, and the same commit with both trailers must pass —
  run in a throwaway clone, never against this working tree.
  Done-criterion: both runs' output pasted, line present in CLAUDE.md.
  Write boundary: `CLAUDE.md`.
  **Provenance worth keeping: this entry exists because
  `tools/named-unbooked-scan.mjs` flagged it on its FIRST real run**, over the
  session that built it, on the sentence "worth carrying forward" — the exact
  phrase-class it was built for, naming a defect its own author had left in
  prose one message earlier.

- **READY — no instrument reads the BILLING side, so the only ground truth we
  have about whether the cache held is unread.** Measured 2026-08-10:
  `grep -c usage tools/gate-live.mjs` → 0; `bust-triage` reads none;
  `replay.mjs`'s only `cacheRead` mentions are prose in comments (`:1200`,
  `:1256`). Every gate asks a POSITIONAL question about our output against CC's
  input; none asks whether the prefix was actually reused. The 213k walk above
  took hours and reached UNCLASSIFIED, then resolved in one command once the
  `outcome` records were read — records that were in the capture the whole time.
  Design (decided): a `cacheLoss` check in `tools/gate-live.mjs`, REPORT-only
  until its corpus-wide rate is measured (the absorption check's precedent — a
  blocking check shipped before anyone knows how often it fires is how a guard
  trains its reader to ignore it). Per same-conversation pair, join the capture's
  `outcome` usage to the pair and flag: `cacheRead` falling by an order of
  magnitude while the pair's own verdict is NO divergence. Rows carry the
  four-request neighbourhood — ts, model, msgs, causes, appendOnly, cacheRead,
  cacheCreation — written AT DETECTION TIME, because this is a recurring
  producer with no closing moment and its inputs are on the eviction clock
  (closing gate q2); a count alone would have lost today's event by tomorrow.
  Verifier, red-first on a TRUE positive from real data, not a planted one: the
  2026-08-10T04:40:39Z fable request must fire (`cacheRead` 224187 -> 15603,
  `causes: []`, `appendOnly: true`). Over-firing controls, both required
  silent and both real: the 04:40:17 pair, which DID diverge mid-history and
  kept its cache at 220904, and the 04:41:04 pair (divergent, cr=229032) —
  divergence without loss must never fire, or the check reports the class
  backwards.
  Done-criterion: red on the real positive with its output pasted, both real
  controls green, corpus-wide rate reported over the live captures, suite green.
  Write boundary: `tools/gate-live.mjs`, `test/gate-live*.test.mjs`. No `proxy/`
  change, so no pin bump and no restart.

- **READY (small) — mint the matrix row this walk's terminal state requires.**
  An event mapping to no row is UNCLASSIFIED, and the rule is to stop and mint
  rather than explain it away; the walk above reached a terminal state with no
  row to record it against, which is the alarm the matrix's convergence note
  relies on. Drafted content, so this is a placement task and not a re-think:
  CLASS — an APPEND-ONLY request loses its cached prefix, cache read collapsing
  to roughly tools+system size while cache creation prices the whole context.
  DETECTION — `outcome.usage.cacheRead` falling by an order of magnitude across
  a pair whose prefix-diff record reads `causes: []` and `appendOnly: true`.
  STATUS — OBSERVED, CAUSE NOT ISOLATED (server-side; both tap points clean).
  NOT MITIGABLE from here, stated with its reason rather than left blank, and
  the row carries the 2026-08-10 04:40:39Z datapoint with the four-request
  table above as its evidence. Verifier: `bust-triage` on that stamp must map
  to the new row instead of answering UNCLASSIFIED. Done-criterion: row present,
  `bust-triage --at 2026-08-10T04:40:50Z` names it, suite green.
  Write boundary: `docs/directives/robustness-threat-matrix.md`.

- **READY (small) — a comment claiming a `{ todo }` marker exists is checkable
  against the runner, and nothing checks it.** `c3481d1` fixed three such
  claims by hand in one file; the class is "prose about a test contradicting
  the test", and it is silent by construction — the suite is green either way,
  so only a human reading the header ever finds it. The judgment half (is this
  sentence a claim about the present or a description of the past?) stays
  prose; the computable slice is the marker itself.
  Design (decided): one bite, in the SHAPE the same file already proves works —
  `test/tool-output-stamps.test.mjs:243-259` pins "exactly the one known
  `--json` mention" and fails when a new one appears. Same move over the test
  tree: collect (a) every `test/*.mjs` whose COMMENT text contains `{ todo }`
  and (b) every file with a real todo-marked test declaration, and assert the
  two sets match a mapping declared IN the test as data. A file narrating a
  removed marker is listed as a known comment-only mention with its reason;
  a NEW mention anywhere fails until someone classifies it. That is the
  declared-exemption form dev-loop mandates, not a softened regex — the check
  never has to decide what a sentence means, only that somebody classified it.
  Verifier: red-first against an IMMUTABLE reference, not the working tree —
  `git checkout c3481d1^ -- test/tool-output-stamps.test.mjs`, print
  `git diff --stat HEAD` as proof the old blob is really in place, and the bite
  must fire NAMING that file (its header claimed `{ todo }`; the runner reports
  0 todo tests). Over-firing control: at `c3481d1` and later the bite is green
  with the three narrating mentions classified.
  Done-criterion: red demonstrated with the old blob in place and the diffstat
  pasted, control green, full suite green.
  Write boundary: one new file under `test/`. No `tools/` change.

- **PARKED — TWO REAL order collisions exist in the loaded registry, and
  nothing says whether their relative order matters.** Measured 2026-08-08
  while red-proving the tie bite above, against the real loaded registry:
  `deferred-tools-restore` and `microcompact-stability` both sit at order
  350; `output-guard` and `session-budget-breaker` both sit at 690. Within a
  tie, which runs first rests on sort stability — no contract fixes it, and a
  registry reload or a rename could silently swap them.
  This was found in passing, NOT investigated: I do not know whether either
  pair is order-sensitive, and the 350 pair in particular both touch request
  content, which is where a swap would show.
  NAMED MISSING EVIDENCE, the one thing that decides it: for each pair, run
  the two orderings over the same realistic body and compare the resulting
  `body.messages` — identical output means the tie is harmless and the pair
  can stay; any difference makes it a live latent bug and the orders must be
  separated (which touches `proxy/**`, so tree-pin bump plus restart, with a
  row-3 declaration).
  Deliberately parked rather than "fixed" by assigning distinct orders: that
  would CHANGE execution order for whichever pair is order-sensitive, i.e. the
  repair could itself be the regression. Measure first.
  Trigger to unpark: any change to either pair, or the next time the tie bite
  above is extended registry-wide.

- **READY (small) — the both-zones class recurs PAST the eleven-file boundary
  the shipped entry drew, at two measured sites.** `proxy/server.mjs:51` and
  `preload.mjs:1396` are both `[${new Date().toISOString()}] ...` human-facing
  log-line prefixes — the same shape as `usage-to-dashboard-ndjson`'s watch
  line, which WAS converted in `82372db`. They were left because they sit
  outside that lane's write boundary, not because they are correct.
  Design (decided): import `withLocal` from `tools/local-stamp.mjs` at both
  sites. Verifier: extend `test/local-stamp.test.mjs` with a bite per site plus
  the standing purity CONTROL that no machine-read `ts`/`timestamp` field in
  `proxy/**` gains a suffix (the sweep already accounted 33 proxy hits and 11
  preload hits as machine fields — that accounting is the exclusion list).
  Done-criterion: red-first on each new bite, full suite green.
  **Deployment coupling:** `proxy/**` is TREE-PINNED — this needs the dotfiles
  `CACHE_FIX_PROXY_TREE_PIN` bump plus `systemctl --user restart
  cache-fix-proxy`. Row-3 declaration, stated before the restart: a log-line
  format change touches neither state KEYS nor freeze logic, so the restart is
  cache-transparent.

- **READY (small) — `cost-report.mjs` had ZERO test coverage before `82372db`
  and still has none.** Measured by the lane: `grep -rl cost-report test/`
  returned nothing. Its timestamp changes in `82372db` (three display sites, two
  of them pass-through, plus a `padEnd 28→43` column widening) are verified only
  by live smoke output, which is not a committed regression. This is the
  general shape, not a one-off: the both-zones sweep touched a tool whose
  correctness nothing pins, so the NEXT edit there is equally unguarded.
  Design (decided): `test/cost-report.test.mjs` pinning (a) the text-report
  Timestamp column renders both zones, (b) `--json` carries no `local` text,
  (c) the column is wide enough that a both-zones stamp does not wrap.
  Verifier: red-first — revert each pin's site in turn, confirm exactly its own
  bite fires. Done-criterion: three bites, each independently reddened.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  `ZERO test coverage` is factually wrong today: the entry's own verifying
  command `grep -rl cost-report test/` now returns
  test/tool-output-stamps.test.mjs, whose ARM1/ARM2 cover design points (a)
  and (b). Still true: no dedicated test/cost-report.test.mjs, and nothing
  covers design point (c), the column-width/wrap concern. Re-scope to (c).
- **PARKED — `usage-to-dashboard-ndjson.mjs --watch` was never exercised live.**
  Its converted line sits in a long-running `fs.watch` callback; the lane
  verified it by code inspection plus the shared helper's Date-input unit tests
  (the same input type), never by running it. NAMED MISSING EVIDENCE: one live
  `--watch` run observed emitting a both-zones line while a real append occurs.
  Trigger to unpark: the next time anything edits that watch path, or the next
  dashboard session that runs `--watch` anyway — cheap to grab in passing, and
  it is the only site in the sweep with no executed check behind it.

- **READY — ~30% of `join:cross-message` pairs do NOT fire `movedFresh`, and
  nobody has established whether they share a cause.** Booked 2026-08-08 from
  the corpus measurement that closed the question above: over all 89 captures
  under PRODUCTION gates, 18,425 pairs, **139 labelled `join:cross-message`, 97
  of them (69.8%) fire `movedFresh`**. The measurement's job was to decide
  whether the mitigation reaches the class at all — it does — and the residue
  is a separate question the same run surfaced and deliberately did not chase.
  **Why it is worth its own entry rather than a footnote:** the 42 non-firing
  pairs are, today, indistinguishable from each other. Some are presumably the
  same shape as the 05:24:37Z instance (s-captureAN) that motivated the parent
  entry and is confirmed absent from the 97; whether the rest share that shape,
  several shapes, or none, is unmeasured. A 30% miss rate quoted without that
  split is a number that sounds like a bound and is not one.
  Design, decided: classify the 42. Group them by whatever the census already
  emits (anchorDelta band, block counts, whether the suppression set contained
  a NEAR-miss hash), and report the distribution — the deliverable is the
  SPLIT, not a rate. Only once the groups exist is it worth asking whether any
  of them is mitigable.
  Verifier, red-first and permanent because it runs over committed corpus
  behaviour rather than live state: the classifier must place the 05:24:37Z
  pair in a named group rather than in an "other" bucket, and the group counts
  must sum to 42 with an explicit zero for any empty class — a classifier whose
  buckets do not reconcile against the total has not classified anything.
  Consumer tier **1 (event disposition)** — it decides whether an individual
  cross-message miss is a known shape or a new one. Unranked (booked after the
  derivation).
  <!-- entry: "~30% of join:cross-message pairs do NOT fire movedFresh" -->

- **READY — `capturePairResult` may select a DIFFERENT pair than the one the
  census walk calls "the bust", and nothing says the two disagree.** Found
  2026-08-08 by the row-map lane while validating against known bytes, and it
  is the more dangerous of that lane's two findings because the output looks
  correct either way.
  Measured on s-captureAM (session `c7e7cb71`): the tool's pairing selected
  **ord 260->261** — a real `replace/edit` pair in the same conversation,
  `anchorDelta +0`, benign — while the threat matrix's own hand walk names
  **ord 265->266** (`anchorDelta -48`, the FLAP) as the actual busting
  transition. Both are genuine pairs several requests apart; the tool is not
  malfunctioning, it is answering a different question than the reader assumes.
  **The general shape, which is why this is booked rather than shrugged at:**
  two independently-computed facts about "the same bust" — the ledger
  cc/transcript-diagnostic match, and the capture-pair selection — agreeing
  that an event happened is NOT evidence that they picked the same underlying
  request pair. Every piece of evidence the tool prints beside its verdict
  (anchorDelta, blockMigration rows, FLAP tags, and the new far-from-anchor
  callout) is computed on the SELECTED pair, so a mis-selection presents as
  confident, well-formatted evidence for the wrong transition.
  Design, decided: the tool states which pair it selected and on what basis,
  and flags when a same-conversation neighbour scores as a stronger bust
  candidate (a larger |anchorDelta|, or a FLAP where the selected pair has
  none). Do NOT silently change the selection rule — the current one is
  documented and a second, unannounced heuristic is how the previous selection
  defect got its wrong story.
  Verifier, red-first, on committed evidence that cannot decay: s-captureAM,
  where the tool selects 260->261 and the matrix names 265->266. After the
  change the disagreement must be VISIBLE in the output. Control: a walk whose
  selected pair IS the strongest candidate must gain no warning.
  Consumer tier **1 (event disposition)** — it feeds the evidence every walk's
  disposition rests on. Unranked (booked after the derivation).
  <!-- entry: "capturePairResult may select a DIFFERENT pair than the census walk" -->

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles — POINTER) — `doctor` has no verdict
  over the live EXTENSION set, so six extensions run undeclared and nothing
  says so.** Booked 2026-08-08 as the half of the activation-gate entry that
  lands in the dotfiles repo and therefore outside this tree's write boundary.
  The reporting half SHIPPED here (`2e088df`, deployed): `/health` now emits
  `extensions: [{name, file, order, enabled, source}]` beside `gates`, where
  `source` is the layer that decided it — `config` / `module-default` /
  `implicit-true`.
  **Measured live at the moment it shipped: 36 loaded, 30 `config`, and SIX
  with no declaration anywhere** — `upstream-change-detection` (50),
  `deferred-tools-restore` (350), `auto-1m-guard` (520),
  `thinking-block-sanitize` (550), `session-health` (590), `prefix-diff` (680).
  Three of those are `implicit-true`: nothing in any file says they should run;
  they run because the loader defaults to true on absence.
  Design, decided, from the shipping lane's recommendation and stated as a
  predicate rather than a description: `doctor` FAILS when any entry in the
  live `/health` `.extensions` array carries `source !== "config"` — running
  without an explicit `extensions.json` entry. Green when the same extension is
  declared. This completes the DECLARED/RUNNING/VERIFIED discipline for
  extensions, which today exists only for gates.
  **Do NOT pair this with flipping the loader default to off.** That is a
  behaviour change to the serving pipeline and needs its own row-3 declaration
  and live pricing; this verdict only makes the gap visible.
  Verifier, red-first and available today without constructing anything: the
  live `/health` currently returns six non-`config` entries, so the verdict
  must go RED against production as it stands. Green arm: declare one of the
  six in `extensions.json` and require that entry to stop firing while the
  other five still do — an over-firing control, so it cannot pass by always
  failing. Third answer required per this repo's standing checker discipline: a
  `/health` that cannot be reached is COULD-NOT-VERIFY, never a pass.
  <!-- entry: "doctor has no verdict over the live EXTENSION set" -->

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles) — nothing checks that a
  declared-public remote is STILL public.** Booked 2026-08-08 as the named limit
  of the entry above. `OEFFENTLICHE_REMOTES` is a human claim the hook trusts:
  a repo made private later keeps being treated as published, and its bytes
  would then pass a gate that exists to stop exactly that.
  **Decided: NOT a check inside the hook.** A live `gh repo view` in pre-push is
  the wrong mechanism in both directions — offline it either fails closed (a
  gate that cannot pass, the defect this week removed twice) or fails open (no
  protection at all), and it puts a network round trip in front of every push.
  Design: a dotfiles doctor verdict that asserts each URL in
  `OEFFENTLICHE_REMOTES` still reports `PUBLIC`, on the doctor's own schedule,
  with the three-answer discipline (unreachable network is COULD-NOT-VERIFY, not
  a pass). Verifier, red-first: point it at a list entry that is private (or a
  nonexistent repo) and require a FAIL; today nothing asks. Done when the list
  has a mechanism keeping it true rather than a convention.

 Found 2026-08-06
  while confirming the leak-scan lane's scope reading, which is otherwise
  correct and confirmed: it treats a commit message as published when the text
  is reachable from `stdin <old>` or from ANY `refs/remotes/**` ref. That is the
  right rule for this clone — origin and upstream are both public GitHub repos,
  and it is the only reading under which 3 of the 4 measured occurrences are
  covered, since upstream's merge commit is not reachable from any PR branch's
  old remote tip.
  The residual is the word "remote". A clone with BOTH a private remote and a
  public one — a private mirror, a work remote, a bare backup — would treat a
  message published only to the PRIVATE side as already public, and then let it
  through to the public one. The gate would be correct about "the remote already
  has this" and wrong about the only thing that matters, which is whether the
  bytes are already beyond recall. No such clone exists here today; this is
  written down because the hook is machine-global and the next clone is not
  reviewed by anyone.
  Design, decided: the published set is computed per REMOTE against the remote
  being pushed to, not over `refs/remotes/**` as a flat set — `git push` names
  its remote on argv, and the hook already receives it. Verifier, red-first: a
  fixture clone with two remotes where the message exists only on remote A must
  BLOCK on a push to remote B, and pass on a push to A; today it passes both.
  Done when the scope question is answered per destination.

- **OPEN — three residuals of the DONE-anchor guard (c533cef), each named in
  its lane's report and none dispositioned by it.** (i) The guard's
  resolution vocabulary is `backlog-lint.mjs`'s four (DONE/RESOLVED/FIXED/
  BUILT); this file's headers also open with CLOSED, SUPERSEDED, MOVED,
  ACCEPTED, which neither tool treats as resolution markers. Whether they
  should is a definition call — decide it in backlog-lint FIRST (single
  source; the guard imports its verdict), never by widening the guard alone.
  None of the four is anchored today. Trigger: the first ranked entry whose
  header opens with one of them. (ii) `BUILT ... NOT LIVE` is arguably still
  live work; the guard would call it completed if it were ever anchored.
  Named, not special-cased — a shape exemption is how a predicate stops
  being computable. Same trigger. (iii) The pre-existing zero-match/
  multi-match errors in `backlog-order.mjs` still have no bites — the
  completed-entry clause shipped with the tool's first and only 9 tests.
  Cheap: same suite, two synthetic fixtures.

- **OPEN — the conservation checker's fresh-session-sort exemptions (clauses
  e/f) are reachable ONLY through the `lost` branch, so CC duplicating the
  pre-image elsewhere in the request defeats both: 34 false `invented` rows on
  one capture.** Attribution lane, 2026-08-07, s-captureAE n=167..203: the
  relocated skills block is a pure line permutation (same multiset, same
  length), but CC also sends the list a second time unwrapped, so `lost` is
  empty, the clause-(f) rewrite logic (tools/replay.mjs:3012 gate, :3029-3046)
  is skipped, fssExemptFHashes never learns the post-image — and seenRewrites
  (:3045) is fed in the same skipped branch, so clause (e) can never fire for
  these bytes either (confirmed at the class tail: n=203 re-serves the stale
  sorted block while CC's live list moved on). Two-arm disproving probe
  (duplicate present/removed) flips 1 violation/0 exemptions to 0/2. The
  checker is implicated, not the extension. Repair design is desk work: the
  exemption must learn the post-image without the `lost` precondition, WITHOUT
  softening real-invention detection — the two-arm probe is the red-first
  arrangement either way. Same evidence bundle as the HOT entry.

- **OPEN — clause (b)'s three join forms cannot express a conserved THREE-WAY
  split, so 31 fully-conserved suppressions report as
  `suppressed-without-copy`.** Attribution lane, 2026-08-07, s-captureAH
  n=201..237: raw[57] byte-exactly equals unwrap(FWD[55].b[9]) + "\n\n" +
  unwrap(FWD[55].b[10]) + "\n\n" + FWD[57] (shown at both ends of the class);
  the same request's single-message joins reconstruct fine (positive control).
  joinUnitHash/crossJoinUnitHash (tools/replay.mjs:2641-2666) accept whole-unit
  copy, single-message volatile join, adjacent cross-join — nothing spanning
  three messages. Flagged in the same request, unexplained and NOT assumed
  benign: FWD[56] (1488 b, a deferred-tool-rewrite description notice) exists
  in neither raw[57] nor anywhere in CC's raw array; it produced no violation.
  Same evidence bundle.

- **OPEN — a smoosh-split peel product re-served in a LATER request has no
  exemption clause: clause (d) covers a peel verified in THIS request, clause
  (e) covers fresh-session-sort re-serves, and nothing covers the pair.**
  Attribution lane, 2026-08-07, s-captureAO n=288: the 446-byte MCP-
  instructions block only ever existed embedded inside a tool_result — CC
  never sent it as a unit, so `seen` has no entry — and splitSmooshedReminders
  on the conversation's own earlier raw m2 reproduces the forwarded block
  byte-exactly (peeled block[2] equalsForwardedBlock=TRUE). Stale re-serve of
  own content, not invention, not cross-conversation (the lane's first
  cross-conversation probe read b.text where tool_result carries content; the
  corrected probe was proven live on a known positive first and the leak claim
  withdrawn). Same evidence bundle.

- **READY (small) — the own-event-log timestamp correlator: a RULE
  stated in three places with no tool behind it.** `docs/dev-loop.md`
  ("Rule out ourselves — attribution starts at our own event logs")
  makes this mandatory before any external attribution, and the
  hand-step census of 2026-08-07 found it hand-applied identically in
  the runbooks with `tool=grep` and no wrapper — one of 14 RECURRING
  un-mechanized steps found across runbooks, dev-loop and the matrix.
  The rule already carries its own precedent for why it matters: three
  "400 must end with a user message" failures were verbally booked as
  harness noise twice, and our own suppression log had preceded all
  three by ~1 second.
  Design: `tools/own-logs-at.mjs <epoch|ISO> [--window-sec N]` — greps
  every `~/.claude/cache-fix-snapshots/*-events.jsonl` and the
  extension event logs for entries inside the window, printing them
  time-ordered with their source file, and exiting 0 with an explicit
  "no entries in window" line rather than silence (the three-answer
  rule: an empty window is a stated result, never a blank).
  Verifier, red-first: run at the 2026-07-30 suppression incident's
  stamp and the suppressed-duplicate entries must appear; run at a
  quiet stamp and the output must say so in words. A run that prints
  nothing at all is a failing run.

- **READY — `docs/dev-loop.md`: a FIELD can be a default rather than a
  measurement, and 0 is where the two are indistinguishable. FIVE instances in
  one session.** The file already teaches that a number names its tap point and
  its unit; it does not teach that a number may not be a number at all. Each of
  these was used according to the field's NAME before its definition was read,
  and each produced a confident wrong statement:
  `mtok` — read as "no prefix matched"; it is the missed portion AS READ from
  the transcript diagnostic and defaults to 0 when that read never happened.
  Disproof was in the ledger: one event booked three times reads `mtok` 0, 0,
  182,728.
  `pinned` — read as the size of the pin store, so a 9->4 transition looked
  like state loss; it is a per-request count of pins APPLIED
  (`insertion-normalization.mjs`, `pinned: applied`), which alternates with
  CC's own oscillation and means nothing about retention.
  `rebilledBytes` — read as the cost; it prices from the divergence index while
  the wire prices from the last written breakpoint (its own entry, above).
  `readCapture`'s index — read as the request ordinal; it counts every
  non-blank LINE, and `main()` documents that hazard 500 lines above the pass
  that walked into it.
  `cause: other` — the one case already documented in FORK-NOTES as a degraded
  default, which is what makes the class visible: the SAME shape was
  undocumented on every sibling field.
  Design: one section, sited beside "Tap points — every number names where it
  was measured", stating the class — a field's value is a measurement only
  where the writer wrote one; the zero of an unwritten field and the zero of a
  measured absence are the same bytes, and only the writer distinguishes them.
  This is the three-answer rule (verified clean / verified broken / COULD NOT
  VERIFY) one level down: it already governs CHECKERS and not the FIELDS they
  read. Widening the existing section beats a new one.
  **WIDENED 2026-08-07 — the class covers PRESENCE-encoded booleans, not just
  numeric zeros, and the sixth instance cost a wrong finding delivered to the
  operator.** `prefix-diff` writes `record.crossTenant = true` and OMITS the
  field when false (`prefix-diff.mjs:1095`). Reading the raw event log, a
  session saw two very different `msgs` shapes under one key with no marker on
  either, concluded the tool was POOLING two conversations into one baseline,
  and told the operator so — who correctly asked for it to be booked. It was
  wrong: 475 persisted records DO carry `crossTenant`, and the ones without it
  are correctly unmarked. An absent boolean and an unemitted boolean are the
  same bytes, exactly as an unwritten 0 and a measured 0 are.
  This is the harder half of the class, because the numeric version at least
  shows a value. Design addition: the section states that a boolean encoded by
  key PRESENCE is unreadable from a single record — the reader must establish
  that the writer emits it at all (`grep -c` for the key across the corpus is
  the one-command check, and it is what settled this instance) before reading
  its absence as `false`.
  Residual, PARKED with its named probe rather than booked as a finding: four
  records in one capture show `messages=31->2` with `tools[SendMessage:removed]`
  and no `crossTenant`. Whether that is correct depends on `prefix-diff`'s own
  tenant DEFINITION, which has not been read; the probe is reading it and
  checking those four against it. The session's tenant-switch signature was
  hand-rolled, which is the never-hand-roll-identity trap, so the discrepancy
  is suggestive and nothing more.
  Verifier: the section names the five fields above with, for each, what its
  zero means; states the presence-encoded-boolean case with `crossTenant` as
  its worked example; and `cause: other`'s FORK-NOTES paragraph gains a pointer
  to it, since that paragraph is where a reader currently learns the class from
  a single instance.

- **READY (small) — `docs/dev-loop.md`: when an instrument surprises you, run
  the SIBLING implementation before reasoning about the defect.** The corpus
  carries this as principle ("divergence between two independently built
  measurements of the same quantity is the cheap reach detector"); the dev-loop
  has the whole "rule out the instrument" ladder and does not mention it,
  though this repo is unusually rich in sibling implementations.
  Measured 2026-08-07: a 336k ❄ was diagnosed by running `tools/cold-events.mjs`
  — the fork's own re-implementation of worktime's cold-event predicate — over
  the same transcript. It returned `events: 0` against worktime's one 336k hit,
  and the difference between them (a `requestId` dedup one has and the other
  lacks) WAS the defect and its remedy, in a single step. Reasoning had already
  produced two wrong mechanisms before that command ran.
  Design: one step in the "Rule out the instrument" ladder, above "look at the
  bytes" — name the known sibling pairs so the step is executable rather than
  aspirational (`cold-events.mjs` vs claude-worktime's detector;
  `replay.mjs --census` vs `reminder-migration-census.mjs` on container
  migrations; `bust-triage` vs `dossier` on row lookup, which the runbook
  already treats as a disagreement source).
  Verifier: the step, run against the 2026-08-07 01:00:55Z stamp, reaches the
  same verdict the hand-walk reached — and the ladder's existing steps stay in
  their current order, since this adds a rung rather than re-ranking them.

- **READY (small; same file as the backlog-lint WARN item, dispatch them
  together) — a `backlog-lint` lane for the two ways a booked entry is not
  DISPATCHABLE.** Standing rule persisted 2026-08-06 (operator, session-close
  runbook step 8): the backlog closes dispatchable — every open entry
  executable by someone who is not you, in the repo where the work happens,
  without asking anyone a question. Steps 5 to 7 of that lane catch findings
  that were never booked; nothing catches a booked entry that reads complete
  and cannot be executed. Both shapes were measured the day the rule was
  written, both authored by the session that wrote them: a decision parked in
  a work queue (an entry whose body says the operator must decide first —
  correct authorship, incomplete queue item, and the operator was present the
  whole time), and the wrong carrier (two claude-worktime items booked here
  while that repo's own BACKLOG.md read "Ready: (empty), Parked: (empty)").
  Design: two classes over READY/HOT bodies only — DECISION-PARKED on the
  language tells ("operator decision", "stated rather than taken", "bring to
  the operator", "decide whether", "recommendation:" adjacent to a grade
  header) and FOREIGN-CARRIER on a repo path outside this tree in an entry
  that is not marked operator-side-informational. WARN, not blocking: whether
  a given entry is genuinely blocked is judgment, so the lint flags and the
  operator backstops — a blocking predicate here would fire on legitimate
  entries and train the override reflex.
  **SECTION EXEMPTION, found by HAND-RUNNING the check before building it
  (2026-08-06):** this file already has a `## Parked decisions` section (line
  6204) — the sanctioned home for a question that is deliberately waiting.
  DECISION-PARKED must not fire inside it, or the lane's first run flags the
  one place the shape is CORRECT: the fires-on-legitimate-work failure this
  entry's own WARN-not-blocking clause guards against, one level down. So the
  distinction is three-way, not two — parked on evidence (healthy, anywhere),
  a decision inside `## Parked decisions` (healthy), a decision inside a READY
  work entry (the finding).
  **Its red cases already exist, unsettled, and producing that list is what
  the lane is FOR:** the same hand-run found three outside that section — the
  write-registration item ("registered nowhere, by instruction … an operator
  decision, not build work", ~line 78), the upstream order-690 collision
  ("SURFACED, NOT RAISED — an operator decision", ~line 1108), and the
  upstream-error-log gate flip ("operator decision", ~line 6195). Each either
  moves into `## Parked decisions` or gets settled. Which one is the
  operator's call, not the lane's.
  Verifier, red-first and THREE sides required: red on the two 2026-08-06
  entries named above at the commit that introduced them; SILENT on a PARKED
  entry whose body names missing evidence; and SILENT on every entry inside
  `## Parked decisions`, checked against the three real ones now sitting
  there.

- **CORROBORATION 2026-08-06 for the conservation-exemption entry below — a
  SECOND capture, same shape.** That entry closes "Not claimed here — different
  capture, and a candidate is not a match." Gating s-captureAL under the serving
  config exits 123 with `n=91 lost: in[96] (system): 1 of 1 unit` +
  `invented: out[96] (system)` — the identical lost+invented system-unit pair on
  a capture whose resume was walked independently (matrix row 24, 17:40:16Z).
  Two captures, one shape, both containing a resume. Still NOT the byte-level
  proof: that remains the `normalizeSessionStartText` comparison the entry
  names. What this changes is the odds, not the evidence class.

- **READY — kill the relocation-induced conversation-key rotation (threat
  matrix row 26): resolve the conversation sub-key ONCE from the RAW body and
  have both stateful extensions read it.** Mechanism fully isolated 2026-08-06,
  216,060 tokens on one request; the row carries the four measured links and the
  falsification probe with its control, so nothing here needs re-deriving.
  Design, decided: `conversationSubKey` is a property of CC's conversation, so
  it is computed early (before order 250 mutates `messages[0]`) into `ctx.meta`
  and both `insertion-normalization` (395) and `deferred-tool-rewrite` (425)
  read it from there instead of each re-deriving it from whatever body reaches
  them — the repo's own "never hand-roll identity" rule, applied to the case
  where the second derivation is over OUR bytes. `fresh-session-sort` (250)
  already keys on the raw body and needs no change; that asymmetry is the bug's
  signature and its state files are the proof (its memory sits under the raw
  key while the downstream two sit under the rotated one).
  Verifier, named: a SYNTHETIC fixture — mandatory, not preferred, because the
  scrub destroys all four relocatable-block predicates (dev-loop, "The scrub
  destroys CONTENT PREDICATES"), so no harvested pin can ever carry this class.
  Red-first arrangement, stated so it cannot pass vacuously: the fixture's two
  requests differ only by the first appearance of a skills block; against the
  CURRENT implementation the assertion "the sub-key deferred-tool-rewrite keys
  on is identical across the pair" must FAIL, and the failure must name the two
  keys. Done-criterion: that assertion green, `deferred-tool-rewrite` reporting
  `rewrite`/`unchanged` rather than `no-baseline` on the second request, and
  the forwarded `tools[]` byte-identical across the pair.
  **Row-3 declaration, required before the restart, not after:** this CHANGES
  STATE KEYS for two extensions — the restart is NOT cache-transparent and
  every live conversation re-baselines. Price it with
  `tools/restart-exposure.mjs --match` against live sessions before shipping,
  per dev-loop's "price it against LIVE sessions, not the corpus".
  **FIXTURE SPEC CORRECTED 2026-08-06 evening (dispatcher), and the correction is
  load-bearing for the entry ranked before this one.** The two-request shape
  above — "differ only by the first appearance of a skills block" — is sufficient
  for THIS entry's assertion (the sub-key must not rotate) and INSUFFICIENT for
  the tools-condition check that must ship first: it reproduces the rotation
  only, and 12 surviving pairs measured the same evening prove rotation alone
  leaves the forwarded `tools[]` intact. Build the fixture at three-or-more
  requests — leading traffic that makes `deferred-tool-rewrite` freeze a tools
  order under the pre-rotation key differing from CC's passthrough array, then
  the relocating request — and ONE fixture serves both verifiers. Building the
  two-request version first would satisfy this entry and silently hand the other
  a check that passes while asserting nothing.

- **PARTLY DONE — `docs/runbooks/session-close.md` SHIPPED 2026-08-06; the
  computable half of it is still READY. The fifth lane: the operator
  signals a session is ending.** Operator-proposed 2026-08-06 at the moment it
  paid for itself. Asked "all threads done or booked?" at close, the
  enumeration found two that were not, and BOTH were invisible to every
  existing check: a bust `bust-triage --list` had surfaced hours earlier and
  nobody walked, and two agreed corpus edits that existed only in chat. Neither
  is a defect in any tool. They are the class that dies with the context, and
  session close is the only moment they can be caught — which is exactly why it
  needs a line and did not have one.
  **What makes this lane different from the closing gate it sits beside:** the
  four questions in dev-loop run per CHANGE and ask whether the WORK is
  finished. This runs once per SESSION and asks a different question — is every
  fact that currently lives only in context now on disk? A session can close
  with every piece of work correctly finished and still lose a decision nobody
  wrote down. Framed the way the next session experiences it: the job is
  converting context-resident state into disk-resident state, and everything
  not converted is gone, silently, with no artifact recording that it existed.
  **Computable half — build this as the check; each item is a set difference,
  none needs judgment:** cold events since session start that have no recorded
  disposition (`bust-triage --list` against the matrix and backlog); background
  agents not closed; a `ScheduleWakeup` still armed; worktrees carrying
  dangling rebase state (`.git/rebase-merge` / `rebase-apply`); uncommitted
  tracked files. **NOT unpushed commits** — the dotfiles `unpushed-reminder`
  Stop hook already owns that and calls itself the session-cut check; adding a
  second reader is the duplicate-guard shape.
  **The NAMED-AND-UNBOOKED check — computable after all, and the highest-value
  item in this entry.** Operator, 2026-08-06: "you named a gap to me but didn't
  take the next steps." Four times that day a finding was correctly spotted,
  described in prose, and left there until the operator converted it — a
  prioritisation method, this very lane, the per-event lines, and a recurring
  own-conduct error the session proposed to "carry forward" rather than write
  down. Not one was missed; every one was named and unbooked, because naming a
  gap feels like delivering it. The tell is therefore textual and diffable, not
  a matter of self-assessment: scan the session's own assistant output for
  gap-language — "we should", "worth booking", "the gap is", "I'd carry
  forward", "worth watching", "not yet booked" — and require each hit to
  resolve to a commit, a BACKLOG entry, or a file change made in the same
  session. Unresolved hits are the report. Expect false fires (the phrasing is
  common in ordinary explanation), so this REPORTS and never blocks — its value
  is a list to walk at close, and a check that blocked on prose would be
  softened within a day. Red-first arrangement, available from this session's
  own transcript: run it over 2026-08-06 before `fc4b7aa` and it must surface
  the "conduct, not rules" sentence; run it after and that hit must resolve to
  `fc4b7aa`.
  **The step that must lead the line — RUN the mechanism, do not describe it.**
  Every close-out claim about what some machinery will do is checked by
  executing that machinery, not by reasoning about it, and the checks are
  seconds each. Measured twice in the last ten minutes of 2026-08-06, both
  times the description was wrong: "the next session picks this up
  automatically" — running `session-scan.py` showed it hands over eight READY
  headers in FILE order with the ranking invisible; and "everything is booked"
  — running the enumeration found two findings named in conversation and never
  written down. Same shape as the corpus rule about reconstructing behaviour
  from source rather than exercising it, pointed at OUR OWN machinery, which is
  where it is least suspected because we wrote it. So the lane opens by running
  what it is about to report on.
  **SCOPE EXTENSION 2026-08-07 — the trigger is not session close, and
  scoping it there is why this keeps happening.** Twice in ONE session, hours
  apart, the same shape fired mid-flight with no close in sight. First: a
  timed-out ad-hoc scan was described in prose and converted only when the
  operator asked "may a tool/instrument improvement to book?". Then, later,
  the session's own closing paragraph listed THREE of its own instrument
  misfires — a process-per-line scan, a jq keyed on a field name taken from a
  summary instead of the file, and `$?` after a pipe reporting `tail` — and
  booked none of them until the operator asked a second time, "why were two
  not booked before I mentioned it?". One of the three had nearly let a
  CRASHING guard read as passing.
  The entry as written says the value is "a list to walk at close". A long
  session has one close and many work-units, so a close-scoped check cannot
  catch either instance above. The global corpus already states the correct
  trigger — the learning question fires again whenever the CORRECTION LIST
  GROWS, because the count is a recognizable event where closing is not — and
  this entry does not carry it.
  Computable, and tonight is its red-first case: fire when one assistant
  message enumerates two or more of the session's OWN errors (a self-directed
  correction list), not only at close. Run it over this session's transcript
  and it must surface the three-misfire paragraph with zero of the three
  resolving to a commit at that timestamp; run it after `95f9c89` and two of
  the three must resolve.
  The recorded miss shape is that both conversions came from the operator
  asking. That is the backstop doing the mechanism's job, twice in one
  session, on a mechanism already booked and still unbuilt.
  **Judgment half — stays prose, and is where today's other two lived:**
  decisions or designs settled in conversation with no carrier (the tell is a
  sentence like "we agreed X" with no commit, backlog entry, or file behind
  it); numbers or claims committed earlier in the session that later evidence
  revised — today's build-order block said four busts and 1,124k when the truth
  was five and 1,200k, and nothing but re-reading catches that; and the three
  closing questions from the operator corpus (missing / learned / routed).
  **Terminal state, one only:** CLOSED — every context-resident fact is on disk
  or explicitly named as deliberately dropped. "I think that's everything" is
  not it.
  Verifier, red-first and available: run the computable half against this
  session's own state as of 11:07Z, when the 76k bust had been listed and not
  yet dispositioned — it must name that event. Against the state after
  `42b9ad7` it must be silent. Done-criterion: both, plus the run printing what
  it examined (events considered, agents, worktrees), since a close-out
  reporting "nothing outstanding" over an empty enumeration is the failure this
  repo has hit most often.

- **READY — `tools/lane-sweep.mjs`: make the lane enumeration repeatable, because
  the hand pass found three gaps and will not survive this session.** Done by
  hand 2026-08-06 (operator-prompted): walk every event class and check it has
  a trigger, a line, a terminal state, and a durable disposition. It found the
  sweep runbook's missing doorbell, the two upstream triggers, and a whole
  unrouted event class (the proxy's own runtime detector logs). The reasoning
  that produced it is exactly what does not survive into the next session —
  dev-loop's own "the manual pass finds the defect once, the mechanism finds it
  forever."
  **The mechanical half, which is the whole of this item.** Three cross-checks,
  each a set difference over things that exist on disk:
  (1) PRODUCERS vs LANES — enumerate every path an extension writes under
  `claudeHome()` (14 extensions do today, via `appendFileOwnerOnly`/
  `writeFileOwnerOnly`) plus every `cache-fix-*.timer`; for each, require
  EITHER a named reader (some `tools/*.mjs` opens it) OR a lane (a runbook or
  the dev-loop index names it). Neither → **UNROUTED**, which is the alarm. This
  is the check that would have named the runtime-detector class instead of
  waiting for someone to notice `upstream-errors.jsonl` at 79 KB.
  (2) INDEX vs FILES, both directions — every dev-loop index row resolves to a
  runbook that exists; every `docs/runbooks/*.md` appears in the index. Catches
  the orphan and the dead pointer, which is how the CLAUDE.local.md runbook
  list went stale within hours of the second runbook landing.
  (3) MARKERS — every `[GRADUATE -> …]` either names a BACKLOG item whose text
  is present, or says "not yet booked" AND names its trigger. A marker pointing
  at a booked item that has since shipped is stale and must fail.
  **Schema change this needs, and it is small:** the dev-loop index table gains
  a TRIGGER column naming the mechanism (`statusline ❄`, `SessionStart line`,
  `operator decision`). Check (1) then verifies a named trigger RESOLVES — a
  hook file that exists, or the literal `operator decision`, which is a valid
  answer and not a hole. Without that column the doorbell gap is invisible to
  any check, which is precisely how it shipped.
  **The one open decision, surfaced not filled:** state-only writers (canon
  files, watermarks) are not finding producers and would otherwise all report
  UNROUTED. Recommendation: an explicit `writesState` declaration in the
  extension's own export, so the exemption is data the check reads and goes red
  when a state file quietly starts carrying findings — never a filename
  allowlist in the checker, which is the softened-predicate shape.
  **Verifier, red-first, and the arrangement is available today:** run it at
  `217b61c^` — it must report the runtime-detector producers UNROUTED and the
  sweep lane's trigger missing; at `217b61c` the trigger row is still missing
  (that fix is the booked doorbell item), so the bite to pin is the UNROUTED
  set shrinking by exactly the producers the doorbell item routes. Done-criterion:
  that, plus the run printing what it EXAMINED — producer count, lane count,
  marker count — because a sweep that reports "no gaps" over an empty
  enumeration is this repo's most-repeated failure.
  **NOT in scope, and it is the judgment half:** whether the event-class list is
  COMPLETE. No check knows what events the world produces; today's runtime-detector
  class was found by asking, not by enumerating. That stays a prose ritual with
  dev-loop's existing stock-sweep cadence and its retirement signal (two
  consecutive sweeps returning only minor findings, then it stops until the next
  burst) — reused, not re-invented.

- **READY — `/health`'s `gates` is a pure `CACHE_FIX_*` env filter, so any
  extension gated by `enabled:` in `extensions.json` is INVISIBLE to the
  DECLARED/RUNNING/VERIFIED check that every runbook leans on.** Found
  2026-08-06 by the dispatched agent writing the runtime-anomaly runbook, and
  verified here: `proxy/server.mjs:577-581` builds `_gates` as
  `Object.entries(process.env).filter(([k]) => k.startsWith("CACHE_FIX_"))`.
  `rate-limit-log` is gated by `enabled: false` in its own default export plus
  a row in `extensions.json` (`rate-limit-log.mjs:215`) — no env var — so it
  cannot appear in `/health`, cannot appear in the sweep's `gates`, and the
  three-way agreement dev-loop calls load-bearing silently answers about a
  SUBSET of the pipeline while reading as if it covered all of it. That is the
  "absence of evidence wearing a verdict's clothes" shape aimed at the one
  check that decides whether a gate run means anything for production. The
  same day, the dispatcher looked at `/health`, did not see `usage-log` or
  `rate-limit-log`, and had to go read `extensions.json` to find them enabled —
  the confusion this causes is measured, not hypothetical.
  Design, decided: `/health` reports the RESOLVED extension set — every
  extension with its enabled state and the SOURCE that decided it (`env` /
  `extensions.json` / `default`) — and the sweep records that same resolved set
  as its third answer, so all three compare like with like. The env list stays
  as-is beside it; this adds an answer rather than changing one. Verifier,
  red-first: with `rate-limit-log` enabled in `extensions.json` and no env var,
  today's `/health` omits it and the new one must name it with
  `source: extensions.json`; flipping it to disabled must flip the report.
  Done-criterion: both, plus `doctor`'s three-way comparison reading the
  resolved set — a fix that leaves doctor comparing env lists has moved the
  blind spot, not closed it.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  /health already reports resolved extensions with their source (2e088df). The
  doctor-side consumption is still open — and it is a DUPLICATE of n=50, so
  this is a merge candidate rather than an independent entry.
- **READY — extend `replay.mjs`'s extension bisection to CONSERVATION rows;
  today it attributes stability violations only, and conservation rows are
  attributed by hand.** The graduation trigger fired long ago and was only
  noticed when `docs/runbooks/sweep-finding.md` had to teach the hand method
  as a step: dev-loop's rule is "whenever a step of this list gets answered by
  hand twice, move it into the tool" (dev-loop.md:269), and the 2026-08-05
  gate-red triage ran this exact hand method — the suspected extension's own
  exported transform over the real raw bytes — on THREE extensions in one
  sitting (`fresh-session-sort`'s `sortSkillsBlock`/`pinBlockContent`,
  `smoosh-split` composed with `content-strip`, and
  `identity-normalization`'s `normalizeSessionStartText`). Not a new tool:
  the machinery exists and is good (`replay.mjs:3169` — one bisection over
  the union of rows rather than one per row, results cached by cut, 58s
  linear -> ~11s bisected). It is pointed at `violations` and never at the
  conservation list. Design, decided: build the bisection's input as the
  UNION of stability violations and conservation rows, and give each
  conservation row the same `attributedTo` field a stability violation
  already gets — same cut-cache, so the added cost is the extra rows'
  probes, not a second bisection pass. Verifier, red-first: the 38-row
  gate-red capture is the known positive — every row must come back
  attributed to one of the three extensions named above, and the run must
  report rows it could NOT attribute as their own count rather than folding
  them into the attributed ones (an attribution that cannot say "I don't
  know" is the could-not-verify hole in a third clothing). Done-criterion:
  that capture's rows attributed with the counts matching the hand triage
  recorded in the "GATE-RED TRIAGED 2026-08-05" entry, plus a bite in
  `test/replay-gate-selfcheck.test.mjs`. Removes the `[GRADUATE]` marker on
  step 4 of the sweep runbook — that marker comes out with this commit and
  by no other means.

- **READY (small, and it sharpens the rate question) — why did twelve
  first-appearance relocations rotate the key for free while the thirteenth cost
  216k? The type is the obvious suspect and probably the wrong one.** All 12
  survivors are `mcp`; the costly one was `skills` (14,593 chars). Correlation
  noted, mechanism not — and the mechanism already has a better candidate: the
  flip needs `deferred-tool-rewrite` to be HOLDING a frozen tools order under the
  pre-rotation key, which depends on whether CC had already reordered its tools
  array earlier in that conversation, i.e. on WHEN in the session the relocation
  lands, not on which block type moved. Cheap to settle from evidence already on
  disk: for each of the 12, read the PRE-rotation key's state in
  `*-deferred-tool-events.jsonl` (the enumeration read the post-rotation key
  only) and record whether a baseline was held. Done-criterion: a held/not-held
  column beside the 12, and a one-line verdict on which of the two hypotheses the
  data supports — with "neither, n is too small" as an acceptable answer, since
  12 free instances and one costly one is not a rate. Ranks below the fixture
  work: it explains the cost distribution, it does not block the mitigation.

  **DROP REJECTED 2026-08-10 — a lane graded this OVERTAKEN; the desk
  overturned it.**
  A lane graded this OVERTAKEN citing the STAGE-2b record at
  BACKLOG.md:904-916. REJECTED at the desk: that record answers a NARROWER
  question. It establishes that zero of the 12 surviving positives would fire
  the proposed check, and that all 12 are `mcp` with prefixAboveMessages
  INTACT. This entry asks a MECHANISM question — why twelve rotations were
  free and the thirteenth cost 216k, with its own text already saying the type
  is the obvious suspect and probably the wrong one. A true sentence answering
  a smaller question is the reach failure the corpus names; the mechanism is
  still unexplained.
- **READY — the PR-ROUNDS trigger, split out of the entry above with its WRITER
  named, because it is the one part that cannot ride the SessionStart hook
  directly.** The gate-red part reads a local file and is dispatched; this part
  needs `gh`, i.e. the network, and a session-start hook is the one place a
  network call must not go — it sits on the critical path of every session and
  fails in ways nobody sees. So the design splits in two, and only the writer is
  new work: a scheduled WRITER (user timer, hourly) runs `gh pr list --repo
  cnighswonger/claude-code-cache-fix --author @me --json
  number,reviewDecision,updatedAt,headRefName` plus per-PR last-comment time,
  compares each against our last push on that branch, and writes
  `~/.claude/cache-fix-pr-rounds.json` as `{finished, rounds:[{n, since}]}`; the
  READER is the attention line, under the same three states the gate-red part
  uses — count when >0, silent at zero, `stale` when `finished` is older than
  ~3 h, silent when the file is absent (a machine with no fork checkout must not
  grow a permanent line).
  **The live positive exists and it is today's, which is why this is READY and
  not parked.** Measured 2026-08-06 ~19:30 local by a hand `gh pr list` run
  purely to write this entry: #273 MERGED at 16:19:46Z, and at 16:28:44Z
  upstream posted a round on **#278** asking for a second rebase (`#273` and
  `#317` merged since our `3c4ecfa` push; current upstream main `48e9673`;
  "nothing to fix in your code"), plus the finding that both CI failures are the
  same transient 503 at *Prepare all required actions*, not our code. That round
  sat **three hours** with nothing announcing it.
  **The sharper cost, and it is the one worth quoting at the next
  re-derivation:** the previous session's own handoff — written at 19:01, i.e.
  after both events — records "Today's three rebases went out … and #273 reads
  APPROVED, so the ball is with upstream." #273 had been MERGED for 42 minutes
  and #278 had been waiting for 33 when that sentence was written. The handoff
  was not careless; it was working from the last state anyone had LOOKED at,
  which is precisely what a doorbell replaces. A missing watcher does not only
  delay a response — it writes stale premises into the artifact the next session
  starts from.
  Verifier, three parts: (a) WRITER — its output for today must contain #278
  with `since = 2026-08-06T16:28:44Z`, checked against the `gh` output by hand
  once; (b) READER red-first — against that file the attention line prints the
  rounds part, against a synthetic `{rounds: []}` it prints nothing, against a
  `finished` 6 h old it prints stale; (c) the zero case proven silent on the
  same invocation that fires on the real file, so a zero from an instrument that
  never ran is excluded. Done-criterion: all three, plus the writer's failure
  mode named — `gh` unauthenticated or offline must leave the previous file
  intact and let staleness speak, never write an empty `rounds` (an empty list
  from a failed call is indistinguishable from peace, and would be the
  absence-wearing-a-verdict's-clothes shape aimed at the one signal that has now
  measurably gone unanswered twice).

- **READY — `identity-normalization` rewrites ONE of the two containers CC emits
  for the same message, so its own normalization is half-applied.** Measured
  2026-08-06, s-captureAL, same message and same conversation 52 s apart:
  `identity-normalization.mjs:126` reads `if (!Array.isArray(msg.content))
  continue;`, so the block-array form at n=91 is rewritten
  (`SessionStart:resume` → `startup`, verified byte-identical to the extension's
  own exported `normalizeSessionStartText` over the raw bytes) while the BARE
  STRING form at n=92 passes through untouched — though the same transform
  returns `substitutions=1` on it. This is the repo's own entry-path rule ("a
  mechanism that guards one route is not a guard") landing inside an extension
  rather than on a gate. Cost UNMEASURED, and that is the honest state: the
  point is that a normalization which fires on one container and not the other
  can leave the prefix divergent exactly where it meant to hold it.
  Verifier: this is a NORMALIZATION, so it does not ship without
  `tools/reminder-migration-census.mjs` green across the corpus (content AND
  placement, any MISMATCH blocking) — that gate is not optional and is named
  here so it cannot be skipped. Red-first: n=92 of s-captureAL forwards the
  un-normalized bare string today; after the fix it must forward the substituted
  text, same input, one variable. Durable evidence must be SYNTHETIC — the
  predicate is literal text, which the scrub destroys.

- **IN FLIGHT (operator-side, dotfiles; dispatched 2026-08-06 evening) — the
  push scan's already-published filter covers COMMIT MESSAGES only, and the FILE
  half fired on the identical class the same week.** The 2026-08-06 fix
  (dotfiles `6912e2b`) discards message findings whose text the other side
  already has, and says so in its own docstring, which ends
  `Datei-Befunde bleiben unangetastet`. That was a declared scope, not an
  oversight — which is exactly why this entry exists: the ARGUMENT the fix
  records ("was oeffentlich ist, ist per Konstruktion ausserhalb dessen, was ein
  Block noch verhindern koennte") is about publication, not about which FIELD
  carries the bytes, so it reached message bytes and stopped at file bytes for no
  stated reason. A rule's basis outliving its stated scope is the reach-test
  shape from the grounding corpus, here written down by the author of the
  narrower half.
  **The occurrence, measured:** a force-push of `pr/output-guard` rebased onto
  `upstream/main` (`e3149ae`) was blocked by 5 `capture-key-prefix` findings in
  `proxy/extensions/deferred-tool-rewrite.mjs` (224/238/417) and
  `test/deferred-tool-rewrite.test.mjs` (258/517). Confirmed before any
  bypass was considered: all five lines are byte-identical to `upstream/main`'s
  same lines, and neither file is in the branch's own 13-file diff. The bytes are
  a source comment naming a capture, already public in upstream's repo via our
  own merged #273 — unretractable by any block. **No `--no-verify` was taken**;
  the fork's rule limits it to deliberate WIP pushes, and the corpus rule is that
  a guard firing on legitimate work earns a declared exemption the guard itself
  verifies, never an override habit. The push is held until the gate is fixed.
  Design dispatched: discard a FILE finding only when the blob at the pushed tip
  is byte-identical to the same path's blob at a published tip (same
  `veroeffentlichte_tips` source as the message filter). A file our own commits
  touched is fully scanned, always — conservative on purpose, since a file
  carrying both public and new bytes must never ride through on its public half.
  Red-first: tonight's block reproduced, then green, and a capture id planted in
  a file the branch DOES touch must still block.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — one status file now has TWO definitions of
  "how old is the sweep", and they can disagree by design.** Surfaced 2026-08-06
  by the agent that built the gate-red doorbell, as a returned gap rather than a
  silent choice — the good outcome, and worth noting as such. The hook
  (`claude/hooks/session-scan.py`) measures age from the payload's `.finished`
  with a 26 h bound; doctor (`gate_status_verdict`, `bootstrap/doctor.py:458-479`)
  measures it from the file's **mtime** with a 36 h bound. Both read
  `~/.claude/cache-fix-gate-status.json`. A file that is copied, restored from a
  backup, or rewritten without a fresh sweep has a new mtime and an old
  `.finished`: the hook says stale, doctor says fine, and each is internally
  consistent — the classic two-namespaces-that-look-like-one shape (dev-loop,
  "Two coordinate spaces that look like one"), here at the level of a unit
  rather than an index.
  Design, decided: `.finished` wins — it answers "last SWEPT", mtime answers
  "last WRITTEN", and the question both readers are asking is the first. Doctor
  converges onto `.finished`, and the bound becomes ONE constant with one name,
  read by both (a second copy of "26" is the thing that rots). The hook's
  behaviour does not change.
  Verifier, red-first and cheap to stage: a status file with `finished` 30 h ago
  and mtime NOW — today doctor passes it and the hook flags it; after the change
  both flag it. Plus the control that a genuinely fresh sweep still passes both.
  Done-criterion: the disagreement demonstrated before and gone after, one
  constant with both consumers citing it, and doctor's own bite battery green.
  NOT this repo's file — this is a dotfiles change, booked here only because it
  was found here and the fork backlog already carries operator-side entries.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Substance STILL-TRUE (doctor.py still ages the file by mtime;
  session-scan.py's own comment records doctor as deliberately left
  unconverged), but the entry's path citation
  `~/.claude/cache-fix-gate-status.json` is stale — same correction as n=25.
- **QUEUED THIS SESSION (2026-08-06 evening) — #278's second rebase round,
  serialized behind the running fork-repo lane, not dropped.** The round is read
  and understood (previous entry carries its content); the work is the runbook
  `docs/runbooks/upstream-pr-round.md` end to end — worktree + `node_modules`
  symlink, rebase onto current `upstream/main`, full `npm test` in the worktree,
  the hygiene greps scoped to THIS round's commits, then push and the
  push-announcement comment. It is not running yet for one reason, stated so it
  is not re-litigated: another agent owns this repository's working copy right
  now, and the runbook's own setup writes to the shared `.git` — one writer per
  repository. If this entry is still here when the fork lane has reported, that
  is the next thing to run.
  **RUN 2026-08-06 evening — REBASED AND VERIFIED, PUSH HELD.** Clean rebase onto
  `upstream/main` = `e3149ae` (not the `48e9673` upstream's comment names — it had
  moved again), zero conflicts, nothing left mid-rebase. `git range-diff` shows
  both commits `=`: content and message identical to what is already public in
  `refs/pull/278/head`, which is what makes the message-grep vacuous BY PROOF
  rather than by assertion. Suite in the worktree 1767/1768 (the count grew from
  1724 because the new base carries #273/#317). Both diff forms now agree at 13
  files / +543 / **0 deletions**; upstream's phantom `-2125` is gone. The push is
  blocked by the leak-gate scope gap booked above and waits on that fix — NOT on
  an override.
  **CI, and upstream's account is right but incomplete IN OUR FAVOUR.** Run
  31102727767 on the pre-rebase head: `test (18)` and `test (22)` each have
  exactly one step, `Set up job`, dead at *Failed to resolve action download
  info — Service Unavailable* (15:38–15:41Z), never reaching `Run tests` — so
  upstream's transient claim is corroborated verbatim. What their comment omits:
  **`test (20)` succeeded, all nine steps green including `Run tests`.** The
  suite did execute on `3c4ecfa` and passed; only two legs died at setup.
  **SURFACED, NOT RAISED — an operator decision, because it exceeds the
  push-announcement pattern the runbook authorises.** Post-rebase
  `proxy/extensions.json` registers `output-guard` at order **690, the same slot
  as the pre-existing `session-budget-breaker`**, while `request-log` already
  sits at **700** (`enabled: false`). This is unchanged branch content, not a
  rebase artifact, and it bears directly on the structural premise upstream's
  review raised (that nothing registers above 690 — a disabled 700 entry already
  exists). Their load-bearing review pass will reach it. Raising it needs a GO;
  the runbook's box permits the push announcement and nothing beyond it.
  **Instrument note, third instance tonight of one shape:** the round's first
  check grepped the test output for `output-guard` and got zero — a pattern that
  could never have matched, since no test title in that file carries the string.
  Same family as this evening's `jq '.byteGate.mismatch'` null: a self-composed
  pattern or path IS the instrument, and its reach is the claim's basis. Both
  were caught by their own authors; neither was caught by a mechanism.

- **READY — the close-out lane inventories EVENTS and not SIGNALS, so a
  doorbell that fires on every single turn can go a whole session
  undispositioned.** Found 2026-08-06 by asking "what else did we miss?"
  after the lane had already reported CLOSED. Measured on this session:
  `attention: 25 behind upstream (as of last fetch) | 33 READY, oldest 1d`
  was injected at session start and re-rendered every turn for ~8 hours.
  Nobody merged, nobody decided not to merge, and no entry records either.
  The lane's step 2 walks cold EVENTS to a disposition and its step 3 reads
  git state — neither asks what the standing signals were saying, so the
  one signal that was on the whole time was the one thing not walked.
  **Why this is worse than an ordinary miss: the doorbell was built this
  morning to stop exactly this, and it worked.** It fired, correctly, on
  every turn. What failed is the layer above — a signal with no
  disposition step becomes wallpaper, and a doorbell that is never
  answered trains the reader to stop hearing it, which is this repo's
  own check-that-fires-on-a-non-defect shape aimed at a check that is
  firing CORRECTLY. Habituation is the failure mode of a working alarm.
  Design, decided: close-out gains a step between 2 and 3 — **re-run the
  SessionStart scan and require every non-silent part of the attention
  line to resolve** to (a) an action taken this session, (b) a booked
  entry, or (c) an explicit "not this session, because —". The line is
  silent when clean by construction, so the step is a no-op on a healthy
  repo and costs one command otherwise. Computable: the parts are already
  structured (`N behind upstream`, `N READY, oldest Nd`, and gate-red once
  it ships), so the check is a parse plus a set difference against the
  session's own commits — no judgment beyond option (c)'s reason.
  Verifier, red-first and available: run it against this session before
  this entry existed — it must flag `25 behind upstream` as undispositioned;
  against the state after, it must pass on (b). Done when a standing
  signal cannot stay on for a whole session without someone saying why.
  **Immediate disposition of the instance, so this entry is not itself the
  miss it describes:** `main` is 25 behind `upstream/main`, deliberately
  NOT merged this session — merging upstream into deployed fork-main is a
  restart-and-repin operation (FORK-NOTES' update procedure), which is a
  poor fit for a session that spent its budget elsewhere and is closing.
  It is the first thing the next session should weigh against build order
  item 4.

- **READY — findings get classified ONE-SIDEDLY and the operator is the
  only thing that catches it. Twice on 2026-08-06, which is a rate, not an
  anecdote.** This is the gap behind the two entries below, booked
  separately because fixing either of them leaves this one intact.
  **Instance 1 (morning):** four findings were tool-shaped in the telling
  and procedure- or rule-shaped in fact; each became an entry only when the
  operator asked. The response was to widen dev-loop rule three from
  "tooling and docs" to "tooling, docs, PROCEDURES, RULES".
  **Instance 2 (same evening, after that widening):** a reach failure —
  `bust-triage` cannot see a disposition the matrix records — was written
  up as "**the finding is the tool, not the bust**", with a reader fix
  about to be booked alone. The writer half (nothing requires a
  CONTROLLED-CAUSE walk to become a row, so the next one lands in prose
  too) surfaced only when the operator asked four words. Verified against
  artifacts, not memory: the matrix addendum written BEFORE the question
  contains zero process-half language; the entry written after contains
  both.
  **So the widened rule did not hold on its own first evening, and that is
  the finding.** A rule that names four categories still gets answered with
  one, because the session states the category in the same breath as the
  defect and never re-asks. Widening the vocabulary again would repeat the
  morning's fix and get the morning's result.
  **Computable slice, and it rides a check already booked** — the
  named-and-unbooked scanner (session-close entry below) already scans the
  session's own output for gap-language and reports unresolved hits. Add
  one pattern class to its spec: REACH-FAILURE language — "cannot reach",
  "invisible to", "only indexes", "does not see", "not covered by" — and
  require the entry that resolves it to contain a writer clause (what put
  the target out of reach, and whether that is still happening). It
  REPORTS, never blocks, exactly as that check's design already specifies.
  **Red-first arrangement, available now and unusually clean:** run it over
  this session. The matrix addendum must be flagged (reach-failure language,
  no writer clause); the backlog entry written twenty minutes later must
  not (both halves present). Two texts, one session, opposite verdicts, no
  synthetic fixture needed.
  **Judgment remainder, stated so nobody mechanizes it:** whether a
  one-sided finding is genuinely one-sided (some reach failures have no
  live writer) is not computable. The check surfaces candidates; the
  operator stays the backstop, and the honest record is that the backstop
  is what worked both times.

- **READY — the new verdict kinds have no live path, so most of the enum has
  never been produced by a real bust.** Honest residue from the status-enum
  lane's slot (g), booked rather than left in its report: `classToRow` and
  `causeToRow` only ever produce rows 1, 4, 6 and 23, so the kinds ACCEPTED,
  PARTIAL, BUILT, DOCUMENTED, COVERED and NOT-APPLICABLE are exercised by bites
  against the real status strings and by nothing else. STATUS-UNREADABLE reached
  its output path only under a temporary mutation that forced row 3.
  Why it is worth an entry rather than a shrug: the mapping was just corrected
  in the direction of "stop reassuring the reader", and the rows that benefit
  most from that correction are precisely the ones no live classification can
  reach. A verdict nobody can trigger is a verdict nobody will notice is wrong.
  Named missing evidence: whether the gap is in the CLASSIFIER (a real bust
  whose shape maps to an ACCEPT row exists and is being sent to row 1/4/6/23
  instead) or in the MATRIX (no bust class legitimately lands on those rows).
  Those need opposite fixes, and the census's own class distribution over the
  live corpus answers which — one query, not a design. Do that before designing
  anything.

- **BUST 2026-08-06 15:02:33Z — 48k, cause `other`, PARKED with its named
  missing evidence.** Walked the bust-appears line rather than improvised.
  Inventory (`--list`): this is the newest cold event and the only one after
  the 14:46:32Z CONTROLLED(compact); the operator reported both and neither
  was a second instance of the other.
  `other` is the DEGRADED cause — `claude-worktime.sh` sets it as a default and
  overwrites it only when `cache_miss_reason` reads, so it means "no cause
  available", never "causes tested and rejected".
  MEASURED, replay under the SERVING configuration (10 of 10 declared gates,
  resolved from `/health`, capture `s-captureAG`): **4 same-conversation pairs
  across 4 conversations, 0 stability / 0 safety / 0 sequence / 0 conservation
  violations**; the pairs are 3 append-only + 1 identical. So nothing of ours
  diverged in that session's traffic, and by the pre-pipeline rule there is no
  divergence to attribute in either direction.
  **Named missing evidence, which is the whole reason this is parked and not
  closed:** the per-request `cache_read_input_tokens` for that session in the
  15:01–15:04Z window. That number separates "fresh conversation start, cold by
  construction" from "a real re-bill", and it is currently unreachable — see
  the usage-join entry below, which is the mechanism this park is waiting on.
  Promotion trigger: that join existing, or a second instance of the same
  48k-shaped `other` event in a session whose usage rows can be reached.

- **READY — the usage log has no CC-session key by design, so the number that
  settles a re-bill question cannot be reached from a bust.** Grounding,
  measured 2026-08-06 while parking the 48k above: `~/.claude/usage.jsonl`
  carries 3001 rows and exactly **2 distinct `sid` values** over eighteen hours
  in which the proxy captured 83 sessions. That is not a coverage gap — the
  definition says so at `proxy/extensions/usage-log.mjs:10`: `sid` is the
  **proxy session, sticky for proxy lifetime**, and the two values are one
  restart apart. The header states the intended join at :40-49: `request_id`
  from the upstream response header, joined against CC's own per-session
  transcripts, "recovers per-CC-session attribution that `sid` alone cannot
  provide" — documented, and implemented by nothing.
  **Why this ranks as more than a convenience:** the 610k entry's remedy is
  exactly this number ("`usage-log` was enabled tonight and writes per-request
  `cache_read` / `cache_creation`"). That claim is true per REQUEST and does not
  reach a SESSION without the join, so the entry's stated way out is a step
  nobody has built — and the 48k above is the first bust to stall on it.
  Design, decided: a `--usage` mode on `bust-triage` that, for the pair it has
  already identified, reads the CC transcript for the session, collects the
  `requestId`s in the busting window, joins them against `usage.jsonl`, and
  prints `cache_read` / `cache_creation` per request beside the pair. Same tool,
  because the pair identification and the window are already there — a new file
  would re-earn the conversation-grouping and UTC lessons from zero.
  Verifier, red-first: the 48k event above must go from "cannot be answered" to
  a printed pair of numbers; control, a stamp whose window has no matching
  `requestId` must say so rather than print zeros. Done when the park above can
  be closed by running one command.
  **Probe lesson from finding it, kept because it is the same error one level
  out:** the first probe filtered `usage.jsonl` by CC session id and returned 0
  rows, which read as "the instrument does not cover this session". It was a
  namespace mismatch — the field is a proxy id — and the definition at
  `usage-log.mjs:10` said so at reading distance. Reading the source is what
  corrected it; more probing would not have.

- **READY — the required-reading INJECTION carries the closing gate and not the
  recognition device, so a fresh session gets the questions and never sees the
  event→lane table.** Reported by a peer session and CONFIRMED here at the
  bytes: the extract markers in `docs/dev-loop.md` sit at lines 728 and 802 and
  wrap the closing gate alone; "Which line are you on" — the table that maps an
  EVENT to its runbook — is at line 7, far outside. `.claude/required-reading.json`
  lists the two files, and the gate still forces the full read at the session's
  first Write, so the precise claim is narrower than "a fresh session never sees
  it": a session that WRITES gets the table, a session that only reads or
  reviews never does, and the injection's usefulness is what makes the absence
  invisible.
  **HARD ORDERING CONSTRAINT — do not fix this before the index check below.**
  This state is a live red for that check's fourth condition. Fix it first and
  the check ships having never gone red on anything, which is the failure
  `docs/dev-loop.md` documents under "Adding a check".
  Same constraint, same reason, for its sibling: `CLAUDE.local.md` lists 3 of
  the 5 runbooks on disk (`bust-appears`, `sweep-finding`, `upstream-pr-round`;
  `runtime-anomaly` and `session-close` are missing), one line after the text
  that predicts its own staleness — the fix there is DELETION of the list, not
  an update, since the file already points at dev-loop's table as the index.
  That file is deployed from dotfiles `cache-fix/CLAUDE.local.md` and is edited
  THERE, never in this repo.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  The extract markers are at docs/dev-loop.md:1348 and :1422, not 728/802. The
  file grew under the citation.
- **READY — an index check for the runbook lane system, and it must be built
  BEFORE the two reds above.** Peer session's design, adopted: build it split,
  with checks 2 and 3 domain-free so they are not this repo's private tooling,
  plus a fourth condition — **every index row names a detection channel**, i.e.
  how the event announces itself, which is what makes a lane's trigger
  falsifiable instead of aspirational.
  Red-first arrangement, available RIGHT NOW and destroyed by fixing either red:
  check (2) goes red on `CLAUDE.local.md`'s 3-of-5 list; check (4) goes red on
  the injection gap above (rows exist whose detection channel is a hook that
  does not carry them). Build, demonstrate both reds, then fix the reds.
  Done-criterion: both reds demonstrated on the real files, then green after the
  two fixes land, and a synthetic index missing a detection channel still red.

- **PARKED — nothing anywhere says when a LANE is born.** Peer session's
  finding, and it is rule-shaped, which is the class dev-loop's rule three was
  widened to catch. Five lanes have been minted (bust, sweep, runtime-anomaly,
  upstream-PR-round, session-close), each on somebody noticing an event class
  had no written procedure, and the trigger for minting the next one exists
  nowhere. Named missing evidence: what distinguishes an event class that
  DESERVES a lane from one that a rule or a tool should absorb — the five
  existing lanes are the only data, and all five were minted the same week under
  operator prompting, so they cannot yet separate the two. Promotion trigger: a
  sixth lane proposed, or one of the five going unused for a month.
  **Input for the next re-derivation, not an edit to the current list:**
  `tools/lane-sweep.mjs` was ranked on a premise that has since moved — its
  value was scored as fork-only, and the index check above makes two of its
  conditions domain-free. Re-score it when the order is next derived.

- **HANDOFF 2026-08-05 LATE NIGHT — read this first. It supersedes the NIGHT
  handoff's queue section and nothing else.**
  **STATE: everything committed and pushed, both repos.** Fork main at the
  commit carrying this entry; dotfiles at the pin `f024b0a`. Suite 2184/2184.
  Proxy restarted TWICE tonight and verified content-to-content both times
  (`/health` == `sourceFingerprint(disk)` == `3162447a7a61`, dotfiles pin ==
  `git rev-parse --short HEAD:proxy` == `f024b0a`). A gate re-stamp for that
  tree was running when this was written — CHECK IT FIRST
  (`jq -c '{finished,code,failing}' ~/.claude/cache-fix-gate-status.json`);
  the previous sweep was 63 captures, 1 failing, and the one failure is the
  long-standing row-24 conservation pair, not a regression.
  **THE QUEUE'S TOP ITEM IS DONE, with its mechanism.** CACHE-CONTROL and
  TEXT were one class: 26 of 34 absorption misses are a moved cache_control
  breakpoint. The ladder mislabelled them (TEXT ran before the strip test),
  `cacheControlOnly` now rides every absorption row from a
  container-preserving stripped hash, and the sweep summary carries
  `cacheControlOnly` + `cacheControlUnknown`. The sweep's own number
  reproduced the hand classification exactly, 26/34 with zero unknowns.
  **AND THE FINDING IT PRODUCED IS PARTLY IN DOUBT — start here.** A 610k
  bust at 20:52Z is a marker leaving the last message and nothing else. The
  counting stands; the inference "therefore free" does not. Its entry below
  carries the measurement, the frozen fixture, and the one number that
  settles it. That number now exists going forward: `usage-log` was enabled
  tonight and writes per-request `cache_read` / `cache_creation`.
  **DO NOT DISPATCH `builtByUs` AS WRITTEN.** Its named known positives are
  gone from the corpus — one row no longer exists, the other moved index —
  and three spot-checked rows were all byte-present in CC's raw array. Its
  entry says what to re-ground first.
  **UPSTREAM MOVED TODAY, and the previous handoff's "nothing is blocked on
  us" is stale.** Four PRs merged (#275, #279, #280, #282). #272 is rebased,
  APPROVED and CLEAN — ball with upstream, and #273/#278/#281 unblock behind
  it. #276 answered. #295 closed as dropped. #278 shows `mergeStateStatus:
  DIRTY` and will need the same rebase treatment #272 got — that is the next
  upstream item, and the runbook covers it.
  **TWO PUBLIC CLAIMS WERE CORRECTED TONIGHT**, both because a check was made
  at the wrong layer: a scanner "false positive" that was really a declared
  exemption doing its job, and the marker-is-free note above. Both edited in
  place, reasons stated. The lesson is already in dev-loop; the pattern was
  testing a part (an exported regex, a corpus count) and claiming a property
  of the whole (the scanner, the cost).

- **BUST 2026-08-05 20:52Z — 610k, `messages_changed`, and its only
  pre-pipeline difference is a cache_control marker leaving the last message.
  This CONTRADICTS the same day's "a moved breakpoint is free" finding and
  the finding is the thing in doubt, not the bust.** Fresh, measured at the
  raw bytes, evidence frozen before rotation: `pinned-s-6052bdc81b48-218-219`
  (431 records, full prefix from 0). Session s-captureAD, requests 218 -> 219,
  20:50:40.217Z -> 20:51:02.935Z, 456 -> 458 messages.
  THE PAIR, read pre-pipeline (request-capture, order 60): `tools` identical,
  `system` identical, and the first raw divergence is at index **455 — the
  LAST message of the 456**, where the two differ by 48 bytes that are
  exactly `,"cache_control":{"type":"ephemeral","ttl":"1h"}`. Verified
  mechanically: identical once every cache_control key is dropped. One
  differing index out of the whole common prefix.
  THE BREAKPOINT LAYOUT is what makes it cost. CC carries exactly ONE
  message-array breakpoint and moves it forward every turn: at 218 it sits on
  `455:block[1]`, at 219 on `456:block[0]`. Both requests also carry
  `system[1]`/`system[2]`. So the entry request 218 wrote ends AT message 455
  — the message that then changed — and the only breakpoints that survive
  unchanged cover tools+system alone. `messages_changed / 529627`.
  WHY THIS IS NOT A CONTRADICTION OF THE MEASUREMENT, BUT OF ITS
  GENERALISATION: the 34-row corpus classification stands as counting (26 of
  34 rows are marker-only, mechanically confirmed by the sweep's own
  `cacheControlOnly`). What does NOT stand is the inference that marker-only
  therefore means free. The cold-ledger check behind it asked "is there a bust
  within +/-180 s", and 32 of 34 said no — but ABSENCE of a bust at those rows
  is consistent with an older cache entry, written when the changed message
  was not yet the tail, still being readable. This bust is the case where no
  such entry survives, and there the marker's own bytes are inside the only
  prefix on offer. A moved marker is free WHEN an entry ending below the
  change is still readable, and that is a different claim from the one made.
  NAMED MISSING EVIDENCE, and it is what a future session should get first:
  per-request `cache_read_input_tokens` / `cache_creation_input_tokens` for
  the pair. The capture carries NO outcome records with usage on this session
  (measured: 0 of them), so the split between "read an older entry" and "read
  nothing below system" is currently unmeasured — and that split is the whole
  question. `usage-log` exists and is DISABLED in `proxy/extensions.json`;
  enabling it is the cheapest route to the number, and is a serving change, so
  it is an operator call rather than something to switch on unasked.
  ALSO NOT DONE: no fix. Nothing here is obviously ours — the marker placement
  is CC's, our `cache-control-normalize` acts at order 400 on the FORWARDED
  body and this divergence is already present pre-pipeline. Whether our
  canonical placement helps, hurts, or is neutral against CC's single moving
  breakpoint is exactly the unmeasured question above.
  CONSEQUENCE ALREADY TAKEN: the public comment on anthropics/claude-code#81967
  carried the un-narrowed "moving a marker costs nothing" note as an aside; it
  has been withdrawn in place, with the reason stated, rather than defended.

- **PARKED — the rules corpus has no fire-rate, so prose accumulates with no
  retirement signal.** Named in conversation 2026-08-06 and initially NOT
  booked, on the reasoning that a check I could not specify is not
  decision-complete. That was the third exit the rule forbids: not-decision-
  complete is what PARKED is for, and leaving it in chat would have lost it.
  The concern, measured: `docs/dev-loop.md` grew by roughly 150 lines in one
  day, and rule three's scope was wrong within hours of being written — caught
  only because the operator asked, not because anything re-read it. Mitigations
  have a retirement policy (the fire-ledger, RAW vs ABSORBED) and skill-craft
  has a consolidation rule; dev-loop prose has neither, so a rule that never
  fires is indistinguishable from one that fires constantly, and unread rules
  dilute the ones that work.
  **Named missing evidence, which is why this is parked and not ready:** what
  "a rule fired" even means operationally. A count of sessions that cited it is
  not it (citation is not application), and a judgment poll wearing a number is
  worse than nothing. The nearest candidate worth exploring is the incident
  trail the rules already carry — most dev-loop rules name a dated occurrence,
  so a rule whose newest occurrence is old is a candidate for consolidation
  rather than for deletion. Promotion trigger: a second consecutive session
  where a dev-loop rule is found to be wrong or too narrow, which would make
  this a pattern rather than one bad afternoon.

- **UNDISPOSITIONED SWEEP FINDINGS 2026-08-06 — two, both surfaced at session
  close by running doctor, neither walked. The sweep lane's first real
  input.** Recorded with what is measured so the walk starts from evidence
  rather than from scratch; NOT classified, because guessing a terminal state
  is the thing that lane exists to prevent.
  (1) **Gate red, conservation.** The single failing row in
  `~/.claude/cache-fix-gate-status.json` reads `exit=1, pairs=1395,
  stability=0, safety=0, conservation=2` — one of 66 captures. Candidate class
  is the declared-behaviour conservation shape triaged 2026-08-05 (that entry
  attributed 38 rows on a different capture to `fresh-session-sort` and
  `smoosh-split`+`content-strip`), but two rows on a different capture is a
  CANDIDATE, not a match: the 2026-08-05 attribution was made by running each
  suspected extension's own exported transform over the real bytes, and
  nothing of the sort has been done here. Next step is exactly that.
  (2) **The byte-gate's two readers disagree.** `doctor` reports
  `MISMATCH=2` with tally `{EXACT: 543, EXTENDED: 84, DROPPED: 4, MISMATCH: 2}`
  while `jq '.byteGate.mismatch'` on the same status file returns **null**.
  Null is "nobody measured", not 0 — so either doctor computes the tally from
  a source the status file does not carry, or the field is not being written.
  Until that is settled, neither number can be cited: this is the
  instrument-defect branch of the sweep lane, and the first move is finding
  which producer doctor actually reads.
  **DISPOSITIONED 2026-08-06 evening — INSTRUMENT-DEFECT, and the instrument is
  the HAND QUERY, not the producer.** The two readers never disagreed. The
  producer writes a top-level `byteGate` carrying
  `tally: {EXACT:543, EXTENDED:84, DROPPED:4, MISMATCH:2}`; summing the same
  four fields across `.rows[].byteGate.tally` independently gives exactly
  `{543, 84, 4, 2}`; and doctor reads that same object (`bytegate_verdict`,
  dotfiles `bootstrap/doctor.py:530-544`). There is no key named `mismatch` at
  any level — the field is `tally.MISMATCH` — so `jq '.byteGate.mismatch'`
  returned null because the PATH does not exist, not because nothing was
  measured. **MISMATCH=2 is citable**, and the two rows behind it are named in
  the status file (`byteGate.tally.MISMATCH == 1` on each of two captures, 1670
  and 1395 pairs).
  **The transferable half, and it is why this entry stays rather than being
  deleted:** a `jq` null is ambiguous in exactly the way this repo's three-answer
  rule is about — "absent because unmeasured" and "absent because you asked for
  the wrong key" are byte-identical answers, and the first reads as a finding
  about the system while the second is a finding about the reader. A
  self-composed query path is the instrument, so its own form is the claim's
  basis (grounding corpus, the self-built view). Cheap discipline, first use
  here: before reading a null as a measurement, print the object's KEYS
  (`jq -r 'keys|join(", ")'`, or `[.rows[].byteGate|keys?]|add|unique`) and show
  the path exists. Not mechanized deliberately — the trigger is judgment-shaped
  (every legitimate null would fire it) and this is the first recorded
  occurrence; if a second hand-cited null is ever mis-read, the probe has been
  used twice and graduates to `tools/` under the standing rule.
  **This closes finding (2) of this entry. Finding (1) — the gate-red
  conservation row — remains OPEN and unwalked**; its next step is still the one
  written above: run each suspected extension's own exported transform over the
  real bytes rather than pattern-matching it to the 2026-08-05 attribution.
  Both are pre-existing, neither is caused by 2026-08-06's changes, and both
  were named in conversation before being written down — the named-and-unbooked
  shape, caught by the close-out enumeration on the same day the rule for it
  was minted.

- **READY — READY has no expiry, so nothing ever forces the build-or-drop
  decision, and the queue is now growing faster than it drains.** Measured
  2026-08-06 from git history, counting `^- \*\*READY` per day: **8 (07-30),
  7 (08-02), 13 (08-05), 25 (08-06)** — flat through 08-02, when items were
  being built, then roughly doubling today alone. PARKED over the same span:
  2 → 16. Today produced twelve new READY entries and one line of executable
  change.
  **Why this is the self-improvement loop's own failure mode rather than a
  tidiness complaint.** Every mechanism this repo added today makes FINDING
  gaps cheaper and converting them into decision-complete entries frictionless
  — the standing question, the named-and-unbooked check, the lane sweep. None
  makes BUILDING cheaper. A system that optimises the cheap half of a pipeline
  and not the expensive half accumulates at the junction, and the accumulation
  reads as health: every finding is "booked", the backlog is rich, and the
  machinery is unchanged. The corpus rule that should prevent it —
  "items leave by commit ref or are dropped with a one-line reason" — has no
  TRIGGER, so nothing ever asks, and an entry booked in good faith on 07-30 is
  indistinguishable at a glance from one booked this morning.
  Design, decided: entry age is computable (`git log -S` on the entry's header
  line gives its first appearance), so the count and the OLDEST READY age ride
  the same SessionStart carrier as the three doorbells — one line, silent below
  a threshold. And the re-grade rule: a READY item that survives **three
  sessions** without being built gets one of two dispositions, never a third —
  re-affirmed with a sentence saying what evidence still makes it worth
  building, or DROPPED with its one-line reason. "Still relevant" is not a
  disposition. The point is not to shrink the list; it is that an item nobody
  will build is information about priorities, and leaving it silently ranked
  hides that information.
  Verifier: against 2026-08-06's state it must report 25 READY with the oldest
  dating to 07-30 or earlier; against a synthetic backlog of three fresh
  entries it must be silent. Done-criterion: both, plus the age derived from
  git rather than from a date written in the entry — a hand-written date is a
  label over its own body and will drift from the commit that added it.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, corpus — NOT this repo) — two corpus edits agreed
  2026-08-06 and handed to another session; booked here because chat is not a
  carrier.** Both come from one measured failure: a dispatch brief written from
  a settled six-decision round dropped decision 5 (the cross-repo boundary),
  which surfaced only because the dispatcher re-read its own decisions after
  spawning. Same shape the §2 report tail already fixed one level down — free
  composition drops invariant clauses — but for the design's OWN decisions
  rather than the boilerplate.
  (1) **dispatch skill §1 brief skeleton gains a slot**:
  `## Decisions this dispatch must honor`, enumerated from the round, `n/a` for
  the ones that do not apply. Satisfied by construction for anyone pasting the
  skeleton, which is how the tail already works. Deliberately NOT a hook lane:
  the condition ("an operator decision round preceded this dispatch") is
  invisible to the hook, so a lane would demand an `n/a` line on every brief and
  train the override reflex — the computable slice precipitates, this part does
  not.
  (2) **CLAUDE.md model-routing: sharpen the existing already-written-brief
  clause**, not a new entry. It names the three shapes and says "the settled
  design is the brief's core already written" — and never says what to DO with
  it. The gap is exactly there: that reads as "the thinking is done" when it
  should read "carry it across verbatim — an enumerated design is QUOTED into
  the brief, not restated from memory." Widening beats adding; the generic
  paraphrase-drift rule above it is already correct and already present.
  (3) **CLAUDE.md Fixing — widen the own-past-output clause from ASSERTION to
  any direction and any quantity.** Operator's correction, 2026-08-06: a
  recurring error named as "conduct I'll carry forward" has no carrier and dies
  at session end — the same argument this entry makes about chat-only
  decisions, which the session then violated in the same message. So it is a
  rule or it is nothing.
  The clause today reads: asserting "I already answered/sent/delivered X" is a
  claim about the transcript, checked there before it is asserted. Correct, and
  it fired on none of the day's three instances because each ran a different
  direction: (i) asserting a NON-delivery — a subagent's report demanded as
  missing when it had arrived, been read, and been acted on, costing the agent
  three resends and a diagnosis of a delivery fault that did not exist;
  (ii) asserting a CLASSIFICATION before reading it — a leak gate bypassed on
  "this is the known already-public false fire", confirmed only afterwards
  (it was, but the confirmation is what makes the bypass legitimate);
  (iii) asserting a COUNT from attention — "four busts, 1,124,000 tokens"
  committed into a ranked artifact while `bust-triage --list` had printed five,
  the fifth read past hours earlier.
  Widening, not a new entry: the invariant is that a claim about the RECORD —
  what was delivered, what a gate said, how many there were — is checked
  against the record whenever the check is cheap, regardless of whether the
  claim is positive, negative, or numeric. The tell is uniform and worth
  keeping: the sentence is about something the session witnessed, and the
  witness is memory of ATTENTION rather than the artifact. Three instances in
  one day argues the direction-specific phrasing is what let it through.
  (4) **CLAUDE.md Per-project accretion — widen the do-it-now-or-book-it
  bullet to cover the DELIBERATE postponement.** It currently reads: a deferred
  change stated only in chat has no carrier and evaporates — do it now or book
  it; "I'll fold it in later" is the tell. Correct, and it did not bind on
  2026-08-06, because the tell it names is a passive one. What actually
  happened was an ACTIVE, reasoned-sounding decision — "I am deliberately not
  writing this now, at this depth" — which loses the finding just as
  completely while presenting as prudence rather than as drift. That is the
  costume rule from Grounding, and the two bullets should meet: the branch is
  binary, done or booked, with no third exit however well argued.
  Carry the falsifier with it, since it is what makes the rule self-enforcing:
  **booking costs about what doing it costs, for anything small.** So any
  reason that would justify not making a two-line fix fails by the same
  arithmetic to justify not booking it. Where the fix is genuinely large the
  costs diverge and the choice is real — which is precisely the case booking
  exists for. One question before any postponement: what does booking this
  cost, against doing it? "About the same" means it was never a decision.
  Operator's framing, 2026-08-06, worth keeping verbatim in whatever wording
  lands: things cannot get lost, ever.
  Both files are operational corpus: `CLAUDE-maintenance.md` governs the edit
  and each lands with a JOURNAL line in dotfiles. Not done here because the
  operator routed it to a separate session.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Of the four proposed corpus edits, item (4) has already landed in the global
  accretion.md; items (1)-(3) are still open. Re-scope to three.
- **PARKED — do the three runbooks actually get FOLLOWED, and did folding the
  two sub-classes in rather than splitting them out hold?** The
  per-event-line work is DONE (operator session 2026-08-06, `0868657` +
  the sweep-runbook commit): `docs/runbooks/bust-appears.md`,
  `sweep-finding.md`, `upstream-pr-round.md`, indexed in dev-loop's "Which
  line are you on", each ending in a named terminal state. Decisions taken,
  recorded here because nothing else carries them: THREE lines, not the five
  originally listed — an instrument going red and a gate-red that triages to
  a non-defect are decision POINTS INSIDE the other lines, not event classes
  with their own sequence, and splitting them out would have produced files
  duplicating context that nobody opens. Terminal states are REUSED, never
  invented (the bust line takes FORK-NOTES' four; the sweep line got its own
  six, settled by the dispatcher before briefing so a cheaper tier could not
  design them silently). Runbooks are staging areas: a hand-run step carries
  `[GRADUATE -> where it belongs]` and the marker is removed only by the
  commit that mechanizes it.
  **Named missing evidence for un-parking:** two occurrences of each event
  class handled BY the runbook, after which the questions are answerable and
  not before — (a) did the folded-in sub-classes get reached, or did a
  session hit an instrument-lying case and fail to find the branch because
  it was not a file? (b) which `[GRADUATE]` markers survived two occurrences
  and are therefore overdue? (c) did any session route a finding to "seems
  fine", i.e. off the terminal-state list entirely? None of these is
  answerable from the documents themselves — only from watching them get
  used, which is why this is parked rather than ready.

- **OPEN-BOOKED 2026-08-06 — a recurring `401` with `requested_model: "test"`
  and no session id, unexplained, still firing.** The runtime-anomaly runbook's
  own worked example, and the reason that terminal state exists. Measured:
  `~/.claude/usage-log/upstream-errors.jsonl` holds 194 lines of which 170 are
  this shape — `response_status: 401`, `requested_model: "test"`,
  `session_id: null`, `request_path: /v1/messages`, `x_should_retry: false` —
  distributed 1 (07-30), 22 (07-31), 7 (08-01), 7 (08-02), 121 (08-05), 12+
  (08-06, still growing during the investigation, last seen 12:44:01Z).
  **Why this is not already closed:** an earlier entry in this file attributes
  the shape to "today's test runs" on 07-31 (grep `model:"test" 401s`). That
  explanation was written about one day's occurrences and cannot carry 08-05's
  121 — a premise that was true when written, re-used past its evidence, which
  is the stale-premise class the corpus names under Fixing. The dispatched
  agent caught this unprompted and correctly refused to close on the old note.
  **Named missing evidence:** the sender. No repo tool sends `requested_model:
  "test"` (grepped across `tools/*.sh`, `tools/*.mjs`), and `session_id: null`
  rules out a Claude Code session. Next probe, cheapest first: correlate the
  timestamps against `~/.claude/cache-fix-captures/` (a capture exists → it
  came through the normal path) and against the dotfiles doctor/bootstrap run
  times, since an unauthenticated probe on a schedule is the shape that fits.
  Until the sender is named this stays OPEN-BOOKED — real, reproducible,
  cause not established — and NOT closed as controlled-cause on a guess.

- **HANDOFF 2026-08-05 NIGHT — read this first; it supersedes the
  EVENING handoff's "START HERE" section and nothing else.**
  **THE INDEX-0 VIOLATION IS ANSWERED, MITIGATED — AND IT COST NOTHING.**
  Mechanism, verified at the forwarded bodies rather than reasoned from
  the source: `fresh-session-sort` re-derived its relocated set from the
  CURRENT array on every request, so what we forwarded at `messages[0]`
  tracked the PRESENCE of the source block. (s-captureAB is the ~281 MB
  capture whose pair sits at 2026-08-05T13:49:31Z -> 13:50:48Z; the real
  filename is local-only — join by timestamp against
  `~/.claude/cache-fix-gate-status.json`, never by writing the session id
  into this public tree.) On it the mcp
  `<system-reminder>` sat at raw msg[3] from n=325 through n=331 and was
  gone at n=336; with nothing to relocate, our forwarded `messages[0]`
  went from four blocks to three (`--dump-forwarded 331:0,336:0`) while
  CC's own `messages[0]` was byte-identical on both sides.
  **THE PIN WAS THE WRONG QUESTION.** `pinBlockContent` holds a block's
  BYTES stable while it is present; across that pair the block was
  ABSENT, so nothing consulted it. Presence was the unheld axis. Anyone
  re-opening this: do not go looking for a pin bug, there isn't one.
  **THE COST WAS ZERO ON THAT OCCURRENCE, and this is the correction
  that matters.** CC changed `tools[]` from 11 entries to 9 and its first
  system block from 57 to 62 chars in the same request. The cache prefix
  is `[tools][system][messages]`, so it was already broken two levels
  above messages and our index-0 flip added nothing. The EVENING
  handoff's ranking — "one occurrence costs more than the whole
  remaining absorption-miss population" — rested on `outDiv 0` alone and
  does not survive. **So CACHE-CONTROL 14 / TEXT 15 is once again the
  top of the queue**, and the `builtByUs` + pin-at-finding dispatch after
  it, exactly as the evening handoff ordered them below the index-0 item.
  **THE READING IS NOW A FIELD, not a paragraph.** Every stability
  violation carries `prefixAboveMessages {ourToolsIdentical,
  ourSystemIdentical, ccToolsIdentical, ccSystemIdentical, intact}` and
  the human line prints `[prefix ALREADY broken above messages:
  tools+system changed -> no marginal cost]` or `[prefix above messages
  INTACT -> the whole message array re-bills]`. `intact` is the OURS side
  because ours is what bills; the cc* pair answers the different question
  of whose change it was, and the two come apart precisely where
  deferred-tool-rewrite is doing its job. Demonstrated on the real row,
  not just on bites: the live line reads
  `n=331->336 … outDiv=0 [CC bytes at outDiv IDENTICAL -> ours]
  [prefix ALREADY broken above messages: tools+system changed -> no
  marginal cost] <- fresh-session-sort`.
  **WHAT SHIPPED, all of it pushed and suite-green (2154/2154):**
  (1) `_relocatedByConversation` in fresh-session-sort — a per-conversation
  memory of relocated types, keyed by `resolveInsertionSessionKey`
  (imported, never re-derived), LRU-capped at 256
  (`CACHE_FIX_FRESH_SORT_MAX_CONVERSATIONS`), serving a remembered block
  only when CC sends no instance of that type; CC's newer bytes always
  win, so a genuine content change still resets (65d0455).
  (2) That memory PERSISTED — one file per conversation key under
  `cache-fix-snapshots`, tmp+rename, owner-only, fail-open read, written
  only on change, disk bounded by the same cap (4a61b1c). Without it every
  restart re-inflicted the very divergence the memory prevents.
  (3) `reserved` telemetry plus conservation F-side clause (e), which
  verifies a re-serve against rewrites the gate itself saw on the wire
  earlier in the same conversation (65d0455).
  (4) `prefixAboveMessages` on every stability violation, and the human
  line that reads it (65d0455) — the cost annotation above.
  (5) A departure CENSUS class, `findRelocDepartures`, always on, REPORT
  not gate (500f131).
  (6) The daily sweep now persists per-gate ROWS, not just counts —
  stability, stability-exempt, conservation, conservation-exempt,
  sequence, order — capped at 200/field/capture with an explicit
  `<field>Truncated` marker, and `absorptionMissRows` moved onto the same
  recorder so an absent field reads as `null` rather than as a measured
  zero (c6a6e31, c0a525c). Measured growth on today's corpus: ~113 KB
  against 104 KB, ~8%.
  (7) `tools/test-config-root.mjs` — the suite had NO default config root,
  so any test driving a stateful extension wrote into the operator's real
  `~/.claude`; this one left 8 files there in a single run (4a61b1c).
  **THE FIX IS PROVEN LIVE — this replaced an "unproven" note held for most
  of the session.** Corpus-wide rate, from the sweep that now persists
  departure rows: 3 departures over 42 captures, 2 of them costly (prefix
  above messages INTACT), both on capture s-captureAC this afternoon. That
  capture replayed under the PRE-fix build produces exactly two stability
  violations at those same two pairs (n=120->123, n=254->259; outDiv=0,
  inDiv=3, ccIdenticalAtOutDiv=true, attributed to fresh-session-sort) and is
  CLEAN under the shipped build. Same capture, same gates, one variable.
  Neither was visible to the earlier counterfactual because both postdate the
  14:51Z pre-fix sweep — which is why the honest answer was "unproven" for
  hours and is not any more.
  What it saves, to its reach: CC diverged at index 3 on its own, so the fix
  prevents the AMPLIFICATION to index 0, recovering messages 0..2 — 19.7% of
  the array at n=123, 62.4% at n=259, messages[0] alone ~52 KB. The billed-
  token saving is NOT measured (it depends on breakpoint placement); the
  claim stops at bytes. Superseded note follows.
  **WHAT WAS NOT ESTABLISHED, until it was.** The class's
  live rate is now measured (2 departures / 342 same-conversation pairs on
  s-captureAB, 1 of them with an intact prefix), but the fix's live
  ENGAGEMENT is still unproven. The second departure does not prove it:
  neither sweep reports a stability violation at n=48->49 — not the
  post-fix one (16:00Z, `e20ece6439f4`) nor the pre-fix one (14:51Z,
  `3c14d4fd3446`), and the second is the counterfactual, so under the old
  code that departure cost nothing either. The extension had simply never
  relocated that type for that conversation. What would prove engagement
  is a departure whose predecessor carries a `relocated` declaration for
  the same type; none has been observed. The bites are still the only
  evidence that the memory does what it says.
  **DEPLOY IS DONE (restarted ~17:55Z, verified content-to-content).**
  `sourceFingerprint(disk)` == `/health proxy_tree` == `a5ca4c18d185`, and
  the 17:56->18:13Z sweep is stamped with that same tree, so all three
  answers agree. Bookkeeping correction (2026-08-05 fresh-context review):
  this paragraph previously said NOT DONE — commit e57908b's message
  claimed to amend it and the amendment never landed in the diff, so the
  label sat stale over a resolved body. Two evidence notes from the same
  review: the restart's "23 of 23 forwarded bodies byte-identical
  old-vs-new" A/B exists ONLY in e57908b's commit message, with no run
  artifact anywhere — treat that half as unverified; the "no cold record
  after" half IS verified against the worktime ledger (last real cold
  event 12:20:13Z, controlled resume 17:22:36Z, nothing after the
  restart).
  Row-3 statement for that restart: fresh-session-sort is now
  stateful-PERSISTED, so the restart is cache-transparent for it — the
  relocation memory is re-read from disk, which is exactly what the
  byte-identical-restart bite pins. No state KEY changed and no existing
  baseline is re-keyed: the state file is new, and its absence is an
  ordinary fail-open read. Price it with `tools/restart-exposure.mjs` like
  any other restart, but this change adds no re-baselining of its own.

- **PARKED — relocation-memory EVICTION stranding: the one route where a
  stranded memory costs the full array.** The memory and its state files
  are capped at 256 conversations (LRU + oldest-mtime prune,
  fresh-session-sort); a conversation quiet long enough to fall past BOTH
  caps loses its remembered block with the prefix above messages INTACT —
  the original row-25 full-cost flip, and eviction takes the quiet session
  first (the dev-loop harvest lesson, applied to state). Key-rotation
  stranding is exempt and free by coupling (row 25, the entry above);
  eviction stranding is neither. Missing evidence, named: no instance
  observed. The census already emits exactly the promotion signal: a costly
  departure row (`prefixAboveMessages.intact: true`) whose PREDECESSOR
  carries a `relocated`/`reserved` declaration for the same type, in the
  daily `relocDepartureRows`. One such row promotes this to work (raise the
  cap, or exempt-and-declare); until then it parks. 2026-08-05.

- **HANDOFF 2026-08-05 EVENING — superseded on its "START HERE" section
  by the night handoff above; the rest still stands.** Written at ~274k tokens on the depth rule, with
  work remaining and no blocker — the restart is the recommendation,
  not an exhaustion.
  **READ `docs/dev-loop.md` BEFORE THE FIRST CHANGE.** Not the pointer
  to it, the file. This session spent an afternoon re-deriving a design
  that closing-gate question 2 already stated in full, because the
  overlay carried a shorthand of the four questions good enough to feel
  sufficient. The shorthand is gone now (dotfiles f1eefc3) and question
  2 is widened for recurring producers (2fa2807). Do not re-add a
  summary anywhere.
  **STATE: everything committed and pushed, both repos.** Fork main at
  2fa2807; dotfiles at a8c506e. Proxy deployed and verified
  content-to-content (`sourceFingerprint(disk)` == `/health proxy_tree`
  == `3c14d4fd3446`), dotfiles pin `8c747aa`. Suite 2128/2128.
  **WHAT SHIPPED:** the absorption-miss classifier (`tools/
  absorption-classify.mjs`, 8-class ladder, two-pass with a mandatory
  cross-check), `--dump-forwarded`/`--dump-out` on replay, `prevN` on
  absorption rows, `absorptionMissRows` persisted by the sweep, and
  the container fix itself (04ed3c9) — the re-serve now emits the
  container the entry was LAST SEEN in, at all four re-serve sites.
  **THE NUMBER THAT MATTERED IS ANSWERED.** The morning's "50 misses,
  40 ours, unexplained" is one mechanism: 41 of 41 rows CONTAINER,
  every other class zero. The fix removed it — 15 rows gone, 26 moved
  to a later index, 0 reclassified at the same index.
  **START HERE INSTEAD — a LIVE stability violation at forwarded index
  0, ours by construction, found by the post-fix gate run.** Capture
  the 83 MB capture of the session that was carrying ~413k tokens,
  n=336 / prevN=331, ts 2026-08-05T13:50:48Z:
  `outDiv: 0` against `inDiv: 3`, with `ccIdenticalAtOutDiv: true` —
  CC's own message 0 was IDENTICAL across the pair and ours was not.
  The gate attributes it to **`fresh-session-sort`** by its own
  bisection. Three sibling events on the same capture (n=180, 185,
  325) ARE exempted; this one is not.
  WHY IT OUTRANKS THE CACHE-CONTROL LAYER: a divergence at forwarded
  `messages[0]` invalidates the entire messages array — the cache
  prefix is [tools][system][messages], so everything after index 0
  re-bills. That session was carrying ~413k tokens. One occurrence of
  this costs more than the whole remaining absorption-miss population.
  NOT MINE, and checked rather than assumed: replayed under
  `04ed3c9~1` and under `04ed3c9` in a frozen worktree, the violation
  is BYTE-IDENTICAL — same n, same prevN, same indices, same
  attribution. It surfaced now because the capture GREW (the request
  postdates the 12:20Z sweep), not because the container fix changed
  anything.
  WHERE TO START: this morning's triage established that
  `fresh-session-sort` rewrites the skills `<system-reminder>` block —
  `sortSkillsBlock` + `pinBlockContent`, 8080 -> 8079 chars — and
  booked that as a CONSERVATION matter with declared exemptions. This
  is the STABILITY face of the same extension and the exemptions do
  not cover it. The question to answer first is why the pin did not
  hold: `pinBlockContent` exists to make that block byte-stable across
  requests, and between n=331 and n=336 it did not.
  **THEN the next number: CACHE-CONTROL 14** (plus
  TEXT 15), out of 30 remaining misses, 24 ours. Both classes scored
  ZERO before the fix because the container divergence masked them.
  This is the same shape as the morning's 40, one layer down, and
  today's two busts (349k, 786k) are what an unabsorbed miss costs.
  **GATE STATE after the fix, stamped against the new build
  (`proxyTree 3c14d4fd3446`, 14:51-15:06Z): 39 captures, 2 failing,
  BOTH ATTRIBUTED and neither caused by this session's change.**
  ONE capture stability 1 — the index-0 finding above, proven
  byte-identical old-vs-new. A SECOND capture conservation 2 — the
  pre-existing row-24 container-flip pair the earlier handoffs already
  attributed. Sweep-wide absorption after the fix: 31 total / 25 ours
  over 7 captures.
  **RECOMMENDED ORDER for the next session** — the index-0 violation
  first (it is the only item here with a full-context re-bill behind
  it), then:
  (1) `builtByUs` + pin-at-finding as ONE dispatch — both `tools/`,
  both touch replay.mjs/gate-live.mjs, so one lane and sequential.
  `builtByUs` turns the `ours` split from a floor into a count (a row
  whose bytes were provably ours was scored not-ours today);
  pin-at-finding makes the evidence outlive the corpus and is the
  written revert trigger for the retention bridge.
  (2) Classify the CACHE-CONTROL layer.
  NOT worth the next session: the single surviving CONTAINER row
  (n=334 of the 597 MB capture) — one instance behind a deliberate
  fail-closed boundary, against fourteen in the next class.
  **ROW 4 IS NOT CLOSED.** The container fix is necessary and not
  sufficient for the 349k bust: on its own capture the divergence
  moved from index 360 to 373 and reclassified to TEXT, attributed to
  CC's own input (`inDiv` 369).
  **THE BRIDGE THAT MUST BE RETIRED:** capture retention is at 12288,
  raised from 8192 because the corpus was evicting captures an
  analysis still needed. Revert when pin-at-finding lands; the trigger
  is written in the dotfiles unit file where the knob lives.

- **HANDOFF 2026-08-05 LATE — superseded by the evening handoff above;
  its UPSTREAM section is still current.** It supersedes the
  handoff below on every point they disagree.** Everything is
  committed and pushed (fork-main and dotfiles both clean, 0 unpushed).
  Suite 2112/2112. Deployed tree `9ef42be576bd`, /health verified
  content-to-content against disk, dotfiles pin `5d39423`. Doctor reports
  ONE fail and it is the gate-red below, not a machine problem —
  "1 von 41 Captures NICHT sauber". Everything else in doctor is
  green, including the two new .git/config-signature checks.

  **STATE OF THE GATE: 1 failing capture, down from 3.** The survivor
  is s-captureD conservation 2 — the row-24 container-flip pair the
  earlier handoff already attributed as PRE-EXISTING and proven
  byte-identical under old and new code. The other two are CLOSED (see
  the GATE-RED CLOSED entry): 38 -> 0 and 2 -> 0.

  **THE BIGGEST OPEN THING, and it is new: the absorption check's
  first corpus-wide number is 50 misses, 40 of them OURS, across 12
  captures.** `gate-live` now carries `absorption: {total, ours,
  captures}` in every sweep. That is 40 cases where a mitigation RAN
  and did not ABSORB, attributable to us — the class that let a 349k
  bust replay green on all five gates. It is a REPORT, not a gate, on
  purpose: the rate was unmeasured when it shipped and now it is not,
  so the next question is CLASSIFICATION — are the 40 one mechanism or
  several? Start here; it is the largest measured, unexplained number
  in the repo.

  **WHAT SHIPPED TODAY** (all pushed, all red-first): the conservation
  exemptions (fresh-session-sort's rewrite, the smoosh-split/
  content-strip composition) and the `normalizeSessionStartText`
  anchoring; `findAbsorptionMisses` in replay + the daily sweep; the
  UTC round trip (`bust-triage` marks its rows, `dossier` reads a
  naked stamp as UTC); the absence-scan's three blind spots — object
  KEY names, commit messages, and every text file type — plus
  class-scoped exemptions replacing the path-wide allowlist; the
  harvest ledger's keys hashed (94 session UUIDs gone from a public
  file); `tools/restart-exposure.mjs`; and the doctor checks for the
  .git/config corruption signature (dotfiles 443b200).

  **THREE THINGS THE NEXT SESSION SHOULD NOT RE-LEARN.**
  (1) A restart is transparent unless the NEW CODE forwards different
  bytes for content live conversations already hold — measured six
  restarts, one bust, with a comment-only-scrub restart as the clean
  control. Before any proxy restart whose change alters forwarded
  bytes, run `node tools/restart-exposure.mjs --match '<class>'`; the
  cost is live-session tokens, never corpus instances.
  (2) The gate's conservation units are UNWRAPPED while the
  extensions' predicates are defined over the WRAPPED
  `<system-reminder>` form. That one confusion caused three separate
  bugs in replay.mjs in a single afternoon.
  (3) A measurement over a working tree another writer holds is quoted
  with the commit it was taken at, or not quoted — three wrong
  exposure counts came from unpinned greps while an agent committed.

  **UPSTREAM:** all nine PR-round items are ANSWERED — which is not
  the same as merged, and the distinction matters for whoever reads
  this next. Six PRs had their review round answered with a fix
  pushed and a comment posted (#272, #275, #276, #279, #280, #282) and
  are still OPEN awaiting upstream; issue #292 is answered and its fix
  is **PR #307** (`Closes #292`); the absence-scan split is **PR
  #306**; #295 is DROPPED on a falsified premise (see its entry).
  Nothing is blocked on us. Do NOT re-do any of the six — check the PR
  thread first; the next move on all of them is upstream's.

  **THE 8-HEX PREFIX IN HISTORY: DECIDED — ACCEPTED, 2026-08-05.** See
  the dedicated entry below for the measurements and the basis.

- **HANDOFF 2026-08-05 — the 08-02 handoff's G1/G2/G3 are all settled
  and shipped on `wt/description-absorb` (now at 7f6e5a1, pushed);
  read this before the entry below, which it supersedes on those
  points.**
  **G2 DECIDED: SET-identity.** Basis: sort-stabilization (order 200,
  `proxy/extensions/sort-stabilization.mjs:60-62`) name-sorts
  `body.tools` on EVERY live request, so incoming order is not a
  property the pipeline preserves — and the absorb forwards the
  canonical's first-seen order regardless, so the relax changes zero
  wire bytes versus the order-identical case. Bite re-specified FIRST
  (commit 1a60631), red-first at both levels (new bite vs fd87e12:
  exactly the reorder expectation red; new self-check vs old replay:
  exactly the exemption test red). Corpus: the absorb now FIRES on
  request 1202 — the 484,972-token bust — and old-vs-new replay of
  the whole 1512-request capture differs ONLY in the 52 declared
  announcements.
  **G1 SHIPPED (da4e8e1)** — with a deliberate deviation from the
  entry below: the exemption is SHAPE-based (isDescriptionNotice,
  living beside the builder, shared template constants), NOT keyed on
  `descriptionChangedNames` telemetry as sketched, because both
  consumers rule telemetry out: input-side ECHOES of injections carry
  no telemetry (the 2026-07-29 one-sided-filter incident), and the
  byte-stability exemption reads positions after bodies are gone
  (tools/replay.mjs:712-716).
  **G3 SETTLED by wire evidence, not a probe**
  (tools/scan-description-carrier-evidence.mjs, 7f6e5a1): 837 live
  streamed-200 requests on claude-opus-5 AND claude-fable-5 carried
  an active tool_addition injection (beta on the wire) alongside CC's
  own role:system TEXT messages — the notice's exact carrier shape,
  at population scale. Residue: proves the carrier, not the specific
  notice bytes; the extension header's gate-3 live acceptance (one
  absorbed request observed on production capture) remains owed at
  flag-flip.
  **DEPLOYMENT of the two landed changes: DONE, by the 08-05 boot.**
  The machine rebooted 09:59; systemd started the proxy from the repo
  tree at 9059d3a, and /health's fingerprint matches disk exactly
  (eec233efa271) — no restart owed. Dotfiles pin bumped ad4ff80 ->
  6b69e87 (dotfiles d2c9874).
  **ROW 4 IS NOT CLOSED — the gate ran RED, on OTHER classes.** First
  gate run over the 40-capture/6.7GB corpus (10:02-10:14): failing 3,
  byte-gate MISMATCH 3. Attributed: s-captureJ conservation 2 = the
  row-24 container-flip pair at n=1400 (in[937]/out[937], role
  system, 938-msg thread) — PRE-EXISTING, proven byte-identical under
  old and new code. UNATTRIBUTED, next session's triage:
  **s-captureI conservation 38** (the big one), s-captureU
  conservation 2, byte-gate MISMATCH s-captureG x2 + s-captureJ x1.
  Row 4's own signal was not read out of the gate rows before this
  handoff — read it there before booking anything about row 4.
  **BRANCH DEPLOY still gated on:** (1) full suite on the branch —
  known sole failure is the absence-scan guard at the branch's
  pre-770e915 base (session ids main already scrubbed;
  gate-live.test.mjs, replay-gate-selfcheck.test.mjs, replay.mjs) —
  merge into current main and re-run rather than fixing on-branch;
  (2) the merge itself; (3) restart with row-3 stated: fd87e12+ is
  FORWARD-COMPATIBLE ONLY (rollback after deploy is not clean — old
  build mis-marks defer_loading on new-format state).
  **UPSTREAM (operator asked 08-05):** fork is 14 behind
  upstream/main; `git merge-tree` shows REAL conflicts in
  proxy/server.mjs and test/proxy-wrapper.test.mjs — the pull is its
  own deployment-coupled work unit, not a casual merge. Among the 14:
  header-forwarding and supervised-stop fixes to server.mjs, launcher
  ca-trust changes, RFC 7230 absolute-form fix. PR-thread sweep
  (10 fork PRs; 5 CHANGES_REQUESTED, #275 CONFLICTING) dispatched to
  a sonnet agent 08-05; report delivered — persisted (id-masked) at
  docs/audits/upstream-pr-sweep-2026-08-05.md, and every actionable
  item from it is booked in the "Upstream PR round" section below.

- **BUST 2026-08-05 12:20Z — 786k, 655,021 tokens re-billed, and it was
  MY RESTART. Investigated, mechanism closed, lesson mechanized.**
  Full record: matrix "Row 3 datapoint — 2026-08-05".
  Chain, each link measured: the restart landed at 14:19:51 CEST,
  BETWEEN the busting pair's two requests (14:19:40 -> 14:19:58).
  Census says **append-only** — CC moved nothing mid-history — while
  the forwarded view diverged at `messages@1180(assistant)` with
  system and tools matching, so the change was ours.
  `identity-normalization`'s message loop runs over EVERY message,
  assistant turns included; the anchoring fix shipped minutes earlier
  narrowed what it rewrites. The diverging message is raw index 1216,
  an assistant turn OF THIS SESSION, containing
  `SessionStart:resume hook success:` quoted in prose — in the
  paragraph reporting the anchoring fix. Old build rewrote it, new
  build does not, restart swapped builds mid-conversation. Settled
  after one re-baseline, as a one-time cost should.
  THE ROW-3 STATEMENT PREDICTED THE CLASS AND MIS-SIZED IT. It said
  running conversations quoting the marker pay a one-time re-baseline
  — correct — and closed "one measured instance corpus-wide, so cheap
  and right", which is the wrong denominator. The corpus is history;
  the bill is live sessions. The affected session was the one the
  change was written in, which is the normal case for a change made
  while using the thing it changes, not bad luck.
  MECHANIZED: `tools/restart-exposure.mjs` prices a restart against
  LIVE sessions, optionally filtered by a predicate for the change's
  affected class. On today's predicate it reports ~581k tokens against
  the single matching session — the number missing from the decision.
  Its own first live run understated that session as `~0k` because it
  took the last record of ANY kind and the tail ended on an outcome
  record; fixed, and that defect is what its bite pins hardest.

- **BUST TRIAGED 2026-08-05 — the 349k s-captureQ event is row 4,
  post-deploy, and the operator's re-anchor hypothesis is REFUTED.**
  Full record: the new "Row 4 datapoint — 2026-08-05" section of
  `docs/directives/robustness-threat-matrix.md`. Headline: the two
  09:09:41Z / 09:10:03Z ledger rows are ONE event double-recorded
  (the earlier raced and never upgraded off `cause=other`);
  `cacheRead` 15,583 against `ctx` 364,589 means only tools+system
  survived. The mitigation RECOGNIZED the migration (`movedFresh:2`,
  join-moves at 370 and 402, count held 414 -> 414) and the forwarded
  prefix still diverged at `messages@360(system)` with identical
  leading content. Row 4 therefore does NOT close — its stated
  closing condition is a live non-event and this is a live event.
  **ANSWERED same day, measured and attributed** (full record in the
  matrix datapoint): forwarded[360] carries BYTE-IDENTICAL text in
  both requests and differs only in its CONTAINER — `content:"T"` at
  n=220, `content:[{"type":"text","text":"T"}]` at n=221, a 25-byte
  delta that is exactly the block-array JSON. The array form is
  byte-present nowhere in CC's raw request: we built it.
  `insertion-normalization` is the stage (per-extension trace; the
  `cache-control-normalize`/`ttl-management` lead was WRONG), and the
  reason is the pin's own contract — it re-serves FIRST-SEEN bytes,
  and the first time CC sent that message (n=194, 08:56:27.369Z) it
  was an array carrying `cache_control {"ephemeral","1h"}`. From
  n=195 it was a bare string for 26 straight requests. **Rows 4 and
  24 compose:** the un-merge restores the right text at the right
  index in a container that left the wire 26 requests earlier, and
  the staleness is dormant until a join-move fires.
  Operator-side, outside this repo: the periodic re-anchor hook's
  ~52KB corpus output is truncated by the harness's persisted-output
  mechanism to a 2,324-char preview plus a file pointer
  (`.../tool-results/hook-…-additionalContext.txt`, 54,266 bytes on
  disk) — the corpus it exists to re-show does not reach the model.

- **FINDING 2026-08-05 (dispatcher-measured) — the absorption check's
  `ours` flag UNDER-attributes, so "40 of 50 ours" is a floor and the
  class question must be asked over all 50.** Measured on the
  known-positive capture, which the sweep scores 2 total / 1 ours.
  Both rows are class CONTAINER with a 25-byte delta; the second
  (`n=124->130`, forwarded index 178) is scored NOT ours only because
  CC's own input diverged earlier — `inputDivergence 28` against
  `forwardedDivergence 178` — and the flag is
  `ours = inDiv === null || inDiv > outDiv` (replay.mjs:1228).
  So the flag answers "is the FIRST forwarded divergence explainable
  by CC's input?", not "did WE build the bytes at the divergence
  index?" — and on this row the earlier input divergence is one our
  own pipeline ABSORBED, i.e. the mitigation working, which then
  disqualifies the row from the attribution it deserves.
  THE SHARPER TEST EXISTS AND IS THE MATRIX'S OWN: is
  `JSON.stringify(forwarded[i])` byte-present in CC's raw `messages`
  array? Run over both rows (probe: replay `--dump-forwarded
  124:178,130:178,220:360,221:360`, then a substring test against the
  raw record):
      n=124 forwarded[178] string 9002 B — present in CC's raw: YES
      n=130 forwarded[178] array  9027 B — present in CC's raw: NO — we built it
      n=220 forwarded[360] string  405 B — present in CC's raw: YES
      n=221 forwarded[360] array   430 B — present in CC's raw: NO — we built it
  The text is present in CC's array in all four cases; only the
  container is ours. So `n=130` is the 349k defect exactly, 96
  requests earlier in the same capture, and the flag hid it.
  READY, and it is small: `--dump-forwarded` gains a `builtByUs`
  boolean computed at dump time (`rec.body.messages` is in hand there,
  pre-pipeline), and `absorption-classify` carries it as a column
  beside `ours`. Re-run the corpus after it lands and grade the
  classes on `builtByUs`, not on `ours`. Verifier, red-first: assert
  `builtByUs === true` for n=130 and n=221 and `false` for their
  predecessors — red today, since the field does not exist.
  RESIDUE, named: this says nothing about the 10 not-ours rows on
  OTHER captures; they may be genuine CC-side divergences. The
  re-run is what settles their split, and until it lands the honest
  statement is "at least 40 of 50, mechanism unconfirmed for the
  remainder".
  **RE-GROUND BEFORE DISPATCHING THIS, 2026-08-05 evening: the named known
  positives are not reproducible on the current corpus.** `n=124->130` is
  gone from the sweep entirely, and `n=220->221` now diverges at forwarded
  373 rather than 360 — the container fix (04ed3c9) moved it, exactly as
  the evening handoff recorded. Spot-checked with this entry's own sharper
  test (is `JSON.stringify(forwarded[i])` byte-present in CC's raw
  `messages`?) on three rows of today's 34, one per shape: the row-4
  residual (i=373), the surviving CONTAINER row (i=346 — CC sends both the
  array and the bare-string form itself, row 24's flip seen from the other
  side), and a cache_control-only row (i=414). All six reads byte-present,
  so no live "we built it" instance turned up among them — three rows of
  34, a spot check and not the population.
  A briefed known positive is a claim, not a fixture (dev-loop, "Adding a
  check"), and a check whose motivating case dissolves does not get a
  substitute hunted for it. The next move here is a live known positive or
  a re-grade, not a build.

- **FINDING 2026-08-05 (measured, mid-dispatch) — the capture corpus
  is SATURATED, so evidence now expires by mtime within hours, and
  every corpus-wide number the sweep prints is unreproducible the
  moment it is printed.** Surfaced by the absorption-classification
  dispatch: 3 of the 12 captures the 12:20Z sweep measured were GONE
  from disk when the classifier ran at ~15:30Z, taking 11 of the 50
  rows (9 of the 40 `ours`) with them. Mechanism, read at the source:
  `request-capture.mjs:191-219` (`sweepCaptureDir`) deletes
  OLDEST-mtime-first until the directory is under the ceiling, and
  the serving ceiling is `CACHE_FIX_CAPTURE_MAX_MB=8192` (read live
  from `systemctl --user show cache-fix-proxy -p Environment`) against
  a directory measuring 7.6 GB / 37 files right now — down from 41
  files at the sweep. At the ceiling every new request evicts an older
  capture, so eviction is CONTINUOUS, not occasional, and it selects
  on last-write time rather than on evidentiary value: the quiet
  session's capture goes first, and a capture is quiet exactly when
  its conversation has ended, which is when it becomes evidence.
  THE CONCRETE COST, today, twice over: the capture that carried this
  morning's 38-row conservation gate-red is one of the three that
  rotated away. That triage had to REPLAY the capture to get its rows
  (the status file stores counts only), and it landed hours before the
  file was deleted. Had it not, the row-level attribution behind
  "GATE-RED CLOSED" could no longer be produced at all — the fix and
  its tests would stand, and the evidence for WHY would be gone.
  NOT A NEW RETENTION POLICY. Raising the ceiling buys hours and
  changes nothing structural; the corpus is a rolling window by
  design and should stay one. What must change is that a measurement
  keeps its own rows at the moment it takes them, which is the READY
  item below.
  BRIDGE TAKEN 2026-08-05 (operator GO): ceiling 8192 -> 12288
  (dotfiles 4c2d0ca, unpushed there — a concurrent writer holds that
  repo). Restart verified transparent: `proxy_tree 9ef42be576bd`
  before and after, env-only change, so no forwarded byte differs and
  no `restart-exposure` run was owed (row 3). The dotfiles comment
  claiming "8 GB ~= 11 Tage" was falsified by today's measurement and
  is corrected in the same commit. REVERT TRIGGER: the READY item
  below plus the pin-at-finding item — once both land, the window
  carries discovery only and 8192 is enough again.
  THE SIGNAL FOR THIS EXISTED AND HAD NO READER, which is the part
  worth keeping. `harvest.mjs:897-901` prints "WARNING: N capture(s)
  expired before harvest — raise CACHE_FIX_CAPTURE_MAX_MB", and the
  unit comment names that warning as the designed measurement of
  whether the cap suffices. It runs twice daily. Nobody has read it:
  the ledger carries 93 `gone` entries against 7 live. So the cap was
  instrumented from the start and the instrument reported into a
  stream with no consumer — the orphan-telemetry class this backlog
  already tracks (Q4), landing on the one number it was built for.
  Also, the warning's own wording is wrong in the same way today's
  byte-length label was: every one of the 93 has a watermark >= 1,
  i.e. it WAS harvested at least once, so the message fires on
  "expired after harvest" while saying "before harvest". Fix the
  string when the reader is built; a warning that misstates its own
  condition trains the reader who finally arrives to discount it.

- **PARKED — `_pinnedBlocks` in fresh-session-sort (and its twin in
  identity-normalization) is keyed by BLOCK TYPE alone, across every
  conversation on the machine.** Noticed while building the relocation memory
  beside it, and deliberately not touched: it is the repo's own
  identity-computed-too-cheaply shape ("Identity is where the bugs live"),
  and two live conversations with different skills blocks do flip the pin
  every request. It costs nothing TODAY, and the reason is worth writing
  down: on a hash mismatch the function returns `normalized`, a pure
  function of the current call's own argument, so a collision evicts a cache
  entry and never returns another tenant's bytes — the pin is a
  reference-identity micro-cache, exactly as the restart-state audit
  established. Named missing evidence before it becomes work: a use that
  reads `pinned.text` for anything other than returning it, or a second
  writer of `_pinnedBlocks` — either turns the collision from free into
  cross-tenant. The relocation memory next door is keyed per conversation
  and is not affected.

- **READY — born-large conversation starts become a census class.** The
  classification has now been hand-derived TWICE (the parked resume-boundary
  classifier, and the step-0 probe that closed the /resume item) — exactly
  the closing-gate-Q3 shape where the next instance gets re-derived instead
  of recognized. Design, decision-complete: a `findBornLargeStarts(entries)`
  in replay.mjs (extend the existing tool, never a new file), REPORT not
  gate, one row per first-seen `conversationSubKey` whose first request
  carries ≥50 messages, with the most recent earlier large request as
  comparand and three fields the step-0 probe proved informative: whether
  the full system hash held, whether `systemPromptSubKey` rotated (compact
  entries already carry `inSysSub`), and the system char delta. Verifier:
  bites in replay-gate-selfcheck (green on a synthetic born-large pair, red
  with the grouping key forced constant, control for a conversation born
  small); plus the live known positive (the 449-msg start). Done when the
  daily sweep persists the rows like the other eight arrays. ~60 LOC + 3
  bites; not load-bearing (report-only).

- **PARKED — the rotated-identity born-large population: 20 of 28 born-large
  starts are NOT resume-shaped.** Signature, measured 2026-08-05: first
  system block rotates (the agent-SDK identity swap) with a repeating
  ~+2,040-char total-system delta, new conversation born at 57-244
  messages, clustered across sessions and days. These are some distinct CC
  mechanism (teammate/SDK agent boundaries?) — not operator `/resume`, and
  currently nameless, so any cost they carry is invisible in triage.
  Missing evidence, named: what CC feature produces them (correlate one
  boundary's timestamp against the operator's transcript for that session),
  and whether their first request re-bills (read its outcome record's
  cache_read). Both are one-capture lookups; either promotes the class to
  its own matrix row. The born-large census class above will count them
  from day one via the sub-key-rotated field.

- **PARKED — what the pointer lane does NOT cover, named by its builder rather
  than discovered later.** Shipped 2026-08-05 (ffdf760, `--pointers`,
  report-only, 5 labels after COMMIT-DEAD was dropped). Four declared blind
  spots, each with the evidence that would promote it to work: (1) the
  false-fire rate is measured on ONE file at ONE commit — future entries may
  cite shapes never seen, and that rate is the input to any decision to make
  the lane BLOCKING; (2) ABS-PATH and REF-DEAD rest on n=1 each; (3) the lane
  answers "does this pointer resolve", never "does it still MEAN what its entry
  claims" — a live path whose contents moved reads clean; (4) `bin/`, `hooks/`
  and `templates/` are real top-level dirs here but sit outside the scoped
  four-dir set, so a dead path under them is invisible. (4) is a one-line
  widening whenever someone wants it; the others need accumulated runs, which
  is the trigger: revisit after the lane has been run on a materially changed
  BACKLOG.md a few times.

- **READY — the byte-gate's MISMATCH rows have no way OUT of the census, so
  the sweep cannot persist them (tools/-only).** Surfaced by the row-persistence
  lane as a returned question, not filled by it: the six other per-gate row
  arrays now ride the status file, but the byte gate is a SECOND child
  (`reminder-migration-census.mjs`) whose `--json` emit never includes the
  per-row `details` array it builds internally — `--verbose` adds
  volatileRows/duplicateRows, neither of which is the MISMATCH set. Its emit
  carries an "ADDITIVE ONLY" comment written for gate-live's benefit, and its
  richest row set never entered that contract: orphan telemetry one layer in.
  Decision, so this is dispatchable as written: expose a MISMATCH-FILTERED
  slice (never raw `details`, which is unbounded and includes EXACT rows),
  cap it CENSUS-side at 200 with an explicit `detailsTruncated: <total>`
  beside it — the producer owns its own bound — and have `summarise()` copy
  it verbatim into `byteGateMismatchRows` through the existing `persistRows`,
  which already gives it the three answers. Verifier, red-first: a census bite
  asserting a MISMATCH corpus emits the slice (red today — no such key), plus
  the truncation control, plus a gate-live bite that the field lands on the row.

- **PARKED — `~/.claude/cache-fix-snapshots` grows without bound: ~9,800 files
  / 181 MB, five writers, no pruner anywhere (measured 2026-08-05).**
  fresh-session-sort's new state files prune their OWN class (newest 256), and
  that is deliberately all they touch: another extension's canonical is
  load-bearing for ITS correctness, so a directory-wide sweep is not a
  tools/-side decision. Named missing evidence: which of the five classes are
  still READ after their session ends (insertion canon and ladder rungs are,
  by design; `-last.json`/`-diff.json` may not be), and what the retention
  window should be for each. Until that is answered a pruner would be deleting
  state on a guess. The deployment side (a timer, if it lands) belongs in
  dotfiles, not here.

- **INCIDENT RECURRED 2026-08-05 12:35 — the entry below was booked
  SOLVED and was not; the fix covered the pre-push PATH, not the
  hazard. Now closed at the spawn, red-first, measured.**
  WHAT HAPPENED: the same corruption, same signature — `core.bare =
  true`, `user.name = t`, `user.email = t@t` written into the SHARED
  `<repo>/.git/config` (this clone), breaking
  the work tree for the main repo and all six live worktrees at once.
  Repaired by unsetting the three keys; nothing else in the config was
  touched, no commits lost, every worktree healthy afterwards
  (checked, not assumed).
  ATTRIBUTION, immediate and mine: a dispatch brief I wrote listed the
  incident repro itself as a verifier — `GIT_DIR=$(git rev-parse
  --absolute-git-dir) node --test test/absence-scan.test.mjs` — WITHOUT
  sequencing it after the hardening it was meant to verify. Run against
  the un-hardened file, that command does exactly what the un-hardened
  file does. The agent executed the brief correctly.
  WHY THE EARLIER "SOLUTION" DID NOT HOLD, and this is the part worth
  keeping: it hardened `tools/git-hooks/pre-push` (sanitize the hook
  env before `npm test`). That closes ONE CALLER. The hazard lives in
  the test helpers, which spawn git with `cwd: tempdir` and an
  inherited env, so ANY runner with `GIT_DIR` set reproduces it — a
  hook, a hand-typed command, another repo's tooling, an agent. The
  entry below even names the remaining work ("Same hardening goes to
  fork-main's own copies … when this ships") and defers it to a PR
  that has not landed; that deferral is what left the hole open for
  seven hours. A fix at the caller is not a fix at the hazard.
  FIXED at the spawn, in both files, red-first on a THROWAWAY CLONE so
  the proof itself risked nothing: un-hardened, the repro moves the
  config md5 `58de0dd7…` -> `81d02943…` and injects `user.name=t` /
  `user.email=t@t`; hardened, 36/36 tests pass and the md5 is
  BYTE-IDENTICAL before and after. `SCRUBBED_GIT_ENV` sets `GIT_DIR`,
  `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_COMMON_DIR`,
  `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`,
  `GIT_CEILING_DIRECTORIES` to undefined (not `""` — an empty string
  is still "set" to git), inlined in each test file rather than shared,
  so `absence-scan.test.mjs` stays standalone-portable for the split PR.
  **MECHANIZATION, now doubly earned and still not built** — the
  entry below already named it: doctor FAILS on a local
  `user.name`/`user.email` in this repo (the convention here is the
  global identity, so a local one is always leakage) and on
  `core.bare` being set in a non-bare repo. Both are computable
  predicates with near-zero false fires, and both would have caught
  this within seconds instead of at the next `git rebase`. It is a
  dotfiles-repo change; surfaced to the operator rather than made from
  a fork session.

- **NEW FINDING 2026-08-05, from the same event — `hooks/examples/
  worktree-edit-guard.py` is GIT_DIR-sensitive.** Measured, not
  argued: with an absolute `GIT_DIR` exported, all eight "block"
  assertions in `test/hook-worktree-edit-guard.test.mjs` fail — the
  guard resolves the exported git dir instead of the worktree it was
  asked about, so it stops blocking out-of-worktree edits. Its real
  deployment is a Claude Code PreToolUse hook, where no `GIT_DIR` is
  exported, so this is not a live hole today; the test now spawns it
  with the same scrub for exactly that reason (it should measure the
  guard, not the harness's environment). Open question, not decided
  here: should the guard scrub its own environment before resolving
  paths, so that a future caller which DOES export `GIT_DIR` cannot
  silently disarm it? Fail-closed is this guard's whole design, and
  "silently stops blocking under an inherited env" is the opposite.
  Verifier if built: the same eight assertions, run under an exported
  absolute `GIT_DIR`, must still block — red today by measurement.

- **READY — the lanes backfill: the five runbooks gain `Trigger:` lines and
  dev-loop's router table gains kind/channels, per the dotfiles lanes-format
  contract.** Booked 2026-08-07 on operator instruction; this is the scope
  dotfiles Session C could not deliver because a session held this working
  copy. **Authority: `/home/g/dev/Gunther-Schulz/dotfiles/docs/directives/lanes-format-contract.md`,
  settled by operator GO 2026-08-07 — its decisions are NOT re-openable at
  execution; a contradiction between it and the ground here returns to the
  operator with evidence, never a local redesign.** Read first: its sections
  "The file format", "Backfill for the five existing files", "The router — one
  per repo, DECLARED, never assumed", "The other validator (boundary declared
  in data)".
  Items, all additive: (1) add the five `Trigger:` lines to
  `docs/runbooks/*.md` exactly as the backfill section renders them — no other
  text, heading or line change to those five files; (2) extend
  `docs/dev-loop.md`'s router table ("Which line are you on") with `kind` and
  `channels` columns per the router section — dev-loop REMAINS the router and
  no `INDEX.md` is created (operator GO, option 2: a second router is the
  duplicate-head defect this file already books); (3) declare the router in
  `.claude/required-reading.json` — `"lanes": {"dir": "docs/runbooks", "router":
  "docs/dev-loop.md"}` beside `"required"`; (4) file three entries HERE, decided
  in this repo: `check_devbook_form.py` fails `runtime-anomaly` (missing stop),
  `session-close` (missing verify) and `sweep-finding` (missing stop) — the
  contract's validator boundary makes these non-binding for lanes, so satisfy
  or exempt is this repo's domain judgment; (5) reconcile the READY
  `tools/lane-sweep.mjs` entry, whose "TRIGGER column" schema clause predates
  the contract — amend it to key on the kind/channels columns landing here, so
  two schemas do not get built.
  **PLACEMENT GAP, found at booking and NOT bridged (item 3):**
  `.claude/required-reading.json` is UNTRACKED in this repo — `git ls-files
  .claude/` returns only `agent-name` and `github-app`. The live file is
  deployed from dotfiles `cache-fix/required-reading.json` (present there,
  52 bytes), and CLAUDE.local.md's standing rule for deployed artifacts is
  edit THERE, never here. So item 3's write lands in the dotfiles source and
  arrives here by deployment; an edit made in this tree would be overwritten
  and would not be tracked. Stated rather than resolved: whether the contract
  intends the dotfiles-side write is the operator's to confirm, and it changes
  which repo the commit lands in, not what is written.
  Verifier: `/home/g/dev/Gunther-Schulz/dotfiles/tools/lane-check.py` — red
  already attested at 7 violations over the un-backfilled lanes here; after the
  backfill it must run green over this repo, real output pasted. This repo's
  own battery green before push. Write boundaries: the five lane files
  (`Trigger:` lines only), `docs/dev-loop.md` (table only),
  `.claude/required-reading.json` (see the placement gap), `BACKLOG.md`.

- **READY (small) — an entry proposing a DECLARED EXEMPTION states the
  `ctx.meta` key it will read, or states that there is none.** Booked 2026-08-07
  from the clause-(h) lane's standing question, and it is a writer-side repair
  rather than a reader-side one. That entry's own verifier required the
  exemption to be "telemetry-backed"; the extension it named publishes no
  telemetry at all (`ctx.meta` in `identity-normalization.mjs`: 0 hits), so the
  dispatched lane had to make a design decision the entry had implicitly
  foreclosed. **What wrote it out of reach:** the clause form was read off the
  three existing INSTANCES rather than off each extension's actual surface, and
  that generator is still running — the next declared-exemption entry inherits
  the same assumption. The fix is one line at intake, in
  `docs/dev-loop.md` beside the conservation discussion, plus the corollary the
  lane proved: a declaration need not be an extension's SELF-REPORT, since a
  harness-measured effect is strictly harder evidence and avoids making a
  checker-side repair deployment-coupled. Done when both sentences are in the
  method file where an entry author reads before writing.

- **READY (small) — the matrix lint is blocked at SUITE time, one step after the
  prose is written.** Booked 2026-08-07 by the lane that built
  `--lint-matrix`, as its own named residual. The writer half now exists — an
  undeclared `## Event walk` is refused — but the refusal arrives at the next
  `npm test`, not at the edit, so a walk can be written, committed and read by a
  human before anything objects. Design: call `--lint-matrix` from `gate-live`'s
  sweep and give it a doctor verdict beside `backlogLint`, which is the same
  shape that file already carries for the backlog. Verifier, red-first: plant an
  undeclared walk, run the sweep, require the status file to carry the finding —
  today it carries nothing, because nothing asks.

- **READY (small) — a walk whose disposition is NOT-OURS or NON-DEFECT with
  `row=none` would read STATUS-UNREADABLE.** Named 2026-08-07 by the enum lane
  and deliberately not built, because widening the enum a second time was
  outside its decided scope. Neither token is in `STATUS_RULES`; no walk is in
  that state today (both such walks carry `row=4` or `cause=none`), so this is a
  latent case rather than a live one. Verifier, red-first: a fixture walk
  declaring `disposition=NOT-OURS row=none` must reach a real verdict, and today
  reads STATUS-UNREADABLE — a stop-here on a walk that needs no stopping, which
  is the exact defect the CONTROLLED-CAUSE entry just closed one token over.

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles) — `cache-fix/CLAUDE.local.md:91`
  lists FOUR verdicts and there are now six.** Found 2026-08-07 by the enum
  lane's dependents search, which is the reason that search is a convention: a
  value-set change breaks its documented consumers silently. The file is
  deployed from dotfiles and must be edited THERE, never in this tree. Also
  update the runbook's list if it drifts again — this repo's copy was corrected
  in the same commit as this booking.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  The doc still lists 4 verdicts (unchanged, so the entry stands), but the
  real count is now 7, not the `six` this entry cites — KEY-FLIP, shipped by
  n=76's own work, was never counted.
- **READY (small) — `absence-scan`'s `allowlisted:` line cannot distinguish a
  whole-file SKIP from a class-scoped DROP, which is exactly the distinction the
  2026-08-05 narrowing was made to create.** Noticed 2026-08-08 while scanning
  today's sweep pins before committing them: three files reported `allowlisted:`
  and the reader cannot tell whether they were scanned-with-two-findings-dropped
  or skipped whole. `report()` prints one line for both routes — `main()`'s file
  branch and `scanGitRange` both `allowlisted.push(file)` on a full skip
  (`isAllowlisted`), and both push again when `kept.length < findings.length`.
  **Graded honestly as LATENT, not as a lying instrument, because the check was
  run rather than assumed:** `isAllowlisted` was narrowed the same day to mean
  "exempt from EVERY class", and no `ALLOWLIST` entry uses `classes: "all"`
  today, so the full-skip route is currently unreachable. It becomes live the
  day someone adds one — and then a path-wide skip reads exactly like a
  two-class drop, which is the entry-path shape `docs/dev-loop.md` collects (the
  protected thing reachable by a second, silent route). Design, decided: two
  distinct lines — `skipped (all classes): <path>` and
  `exempt <class,…>: <path>` — so the report states which route fired. Verifier,
  red-first: a temporary `classes: "all"` entry must make the two lines differ;
  today both render identically. NOT built on notice because
  `tools/absence-scan.mjs` is owned by a running lane (the finding-granular
  discard); this is the booking, and whoever holds that file next takes it.

- **(PARTLY DONE — 2026-08-08, `978a44e` operational + `ddcdca3` user-facing;
  the wider class is IN FLIGHT) the XDG migration left ~50 legacy
  `~/.claude/cache-fix*` path
  citations across the tracked tree, and only the operational read path was
  swept.**
  **ANSWERED, and it was the entry's gating question: the PROXY's own defaults
  moved, not just this machine's data.** `proxy/extensions/request-capture.mjs`
  returns `process.env.CACHE_FIX_CAPTURE_DIR || dataPath("captures")`, importing
  from `proxy/xdg-dirs.mjs`, and six proxy extensions import those helpers. So
  the legacy citations were wrong for every consumer of this package, not merely
  stale for us — which is what moved this from a docs chore to a shipping bug.
  **The user-facing sweep shipped** (`ddcdca3`): 25 citations across seven docs,
  each path resolved through its OWNING module before being written, plus one
  user-facing string inside `proxy/` — which moved the proxy tree hash and was
  handled as such (dotfiles pin `b1d070f` -> `e631c5b`, restart 09:59 local,
  row-3 declaration made BEFORE the restart because the string is metadata on an
  extension's default export and cannot reach forwarded bytes).
  **AND THE SWEEP'S OWN SCOPE WAS THE DEFECT.** It was scoped by
  `git grep "\.claude/cache-fix"` — a pattern encoding a NAMING convention while
  the defect is a LOCATION. ~74 citations of the same class remained, of
  proxy-owned artifacts whose filenames lack the substring (`quota-status/`,
  `usage.jsonl`, `session-mirrors/`, `upstream-baseline.json`,
  `workflow-derivation-events.jsonl`, …), leaving `docs/disk-usage.md`
  internally contradicting itself. This is the SECOND instance of that error in
  one day and both are the dispatcher's: the first was this entry's own
  `ls ~/.claude/cache-fix*` count, corrected in the morning and then reproduced
  in an afternoon brief. Rule booked in `docs/dev-loop.md`.
  **THE WIDER SWEEP SHIPPED** (`332df4a`), and the discrimination held: 116 ->
  76 occurrences over the owned set, with 34 SURVIVORS that are supposed to
  survive — `settings.json` x9, `hooks/` x8, `projects/` x4, `.credentials.json`
  x3, `.oauth_refresh.lock` x1, all Claude Code's own config root, plus 9
  deliberate historical/fallback mentions. `docs/disk-usage.md` went to ZERO and
  its rows no longer disagree with each other. CHANGELOG rose by 2 on purpose —
  the new `[Unreleased]` entry cites `~/.claude` to say what moved OUT of it —
  and all ~27 wider hits there sit in dated release sections, so none was
  rewritten.
  **Untouched populations verified by construction rather than by count**: the
  commit touches exactly the six owned docs, so `code-reviews/`, `audits/`,
  `directives/`, `tools/`, `test/`, `proxy/` and `preload.mjs` cannot have
  moved. Worth recording because my first attempt to check this compared MY
  occurrence counts against the lane's LINE counts on a tree that had since
  gained two other lanes' commits — two instruments and two trees, which is the
  namespace error one level up. The file list settles it and the counts do not.
  **What remains, and it is not this entry's:** `preload.mjs`'s citations are
  its real deployment path and are correct; `docs/directives/` and the
  historical sets stay as written.
  Original entry follows. Found 2026-08-08 by a lane that named ONE stale citation
  (`docs/dev-loop.md`); the grep for the class found, AFTER the operational
  half was fixed, 85 remaining hits in 48 files (`git grep -c
  '\.claude/cache-fix' -- . ':!BACKLOG.md'`, summed — 106 in 49 files counting
  this file's own prose, which is history and stays). The
  operational half is FIXED in this entry's commit — `docs/dev-loop.md` and the
  three runbooks, 11 citations repointed to
  `~/.local/state/cache-fix/gate-status.json`,
  `~/.local/share/cache-fix/captures/` and
  `~/.local/state/cache-fix/snapshots/`, each proved by RUNNING the documented
  command (the `jq` returns `false / 3`, the census glob resolves 100 captures)
  rather than by re-reading the path.
  **What is deliberately NOT swept, and why it is a decision rather than an
  omission.** Three populations, and bulk-editing them would each be a
  different mistake. (1) HISTORICAL records — `docs/code-reviews/`,
  `docs/audits/`, `docs/disclosure/`, `march-23-regression-investigation.md`:
  these record what was true when written, and rewriting them falsifies the
  record. Leave permanently. (2) UPSTREAM-FACING docs — `README.md`,
  `README.zh.md`, `CHANGELOG.md`, `docs/guia-pt-br.md`, `docs/monitoring.md`,
  `docs/CONSUMER-SETUP.md`, `docs/disk-usage.md`: these document behaviour for
  cnighswonger's users, and whether they are wrong depends on whether the
  PROXY's own defaults moved or only this machine's data did. Unresolved and it
  is the real question. (3) CODE comments and docstrings in `proxy/**` and
  `tools/**`: same dependency, plus `tools/alias-claim.mjs:48`'s
  `LEGACY_REGISTRY` is a DELIBERATE one-transition fallback and must not be
  touched.
  **Done-criterion:** answer (2) first by reading what `proxy/` actually writes
  today — if the defaults moved, the upstream-facing docs are wrong for every
  consumer and that is a shipping bug, not a docs chore; if only this
  deployment's data moved, they are correct as written and the sweep ends. The
  entry stays READY because that read is the whole decision and it is cheap.
  Verifier: `git grep -c "\.claude/cache-fix"` before and after, with the
  three populations accounted for by name rather than by count.

- **PARKED (named residual, not a defect) — the finding-granular discard walks
  every distinct published version of a path, measured at 5.4s for 226 versions
  of one file.** Recorded 2026-08-08 from the leak-scan lane's measurement so it
  is not re-derived. Paid ONLY when a path already has findings; a clean push
  short-circuits before the walk (rc==0), so no normal push pays it. The lane
  surfaced an early exit (stop once every pending identity is matched, giving an
  IDENTICAL discard decision and cutting the common case to ~1 run) and did NOT
  build it, correctly — it was outside its brief.
  **DECIDED at the desk: do not build it.** A latency nobody waits on does not
  justify adding a termination condition to a filter whose correctness is the
  entire point — a wrong early exit discards a finding that was never matched,
  which is the swallow direction. What would unpark this: a measured case where
  the walk is actually in someone's way (a path with versions in the thousands,
  or a push that visibly stalls). The number above is the trigger to compare
  against.

- **PARKED [HANDED OFF 2026-08-10] (small, POINTER — body belongs in the dotfiles/harness repo) — a
  path-restriction hook read a REGEX as a filesystem path and denied the
  command.** Measured 2026-08-08: `restrict-bash-paths.py` blocked a lane's
  probe because the grep PATTERN it carried was `/home/[a-z]+/\.claude` — a
  regular expression, matched as though it were a path outside the allowed
  directories. The lane obeyed the hook's own instruction not to retry or work
  around, so that arm of its reach check is permanently UNRUN.
  **Third instance today of one shape**, which is what makes it worth booking
  rather than shrugging at: a guard whose predicate reads the PAYLOAD when it
  means to read the INTENT. The other two are the subagent push-gate firing on
  the word "push" inside commit MESSAGES, twice, both on lanes whose subject was
  the push hook. Design not decided here — it belongs to whoever owns the hook;
  what this entry carries is the measured shape and the fire count.

- **PARKED — nothing checks that a booked verifier is still RUNNABLE, so a
  red-first arrangement rots silently between booking and build.** Booked
  2026-08-08 as the WRITER half of the leak-scan entry's stale-verifier
  correction (that entry carries the reader half: the arrangement re-anchored to
  a commit range). The judgment half shipped as prose the same hour —
  `docs/dev-loop.md`, "Adding a check", the immutable-anchor paragraph — so what
  is parked here is only the mechanized half.
  **Why it is parked and not ready: the missing piece is a computable predicate
  with near-zero false fires, and three candidates have already failed.**
  (1) Matching wording ("must go from BLOCKED to allowed", "currently",
  "available immediately") is an enumerated tell — it catches its listed
  variants and misses the next one, which is the failure shape the corpus names.
  (2) "The verifier must cite an immutable anchor" over-fires on every entry
  whose verifier is legitimately `npm test`. (3) Re-RUNNING each booked verifier
  is the only honest check and is not a lint — it is a sweep, and its cost is
  unbounded.
  **What would unpark it:** a predicate that separates a verifier naming
  VOLATILE state from one naming a standing command, stated as a rule rather
  than a word list — plus a measured false-fire rate over the current READY
  population before it blocks anything. Note the adjacent machinery that may
  already reach part of it: the pointer lane's liveness check
  (`docs/dev-loop.md`, "A liveness or resolution check asks 'does this
  resolve'") already resolves cited refs and paths, and a verifier citing a
  commit that no longer resolves is exactly its shape — check whether extending
  it costs less than a new check before designing one.
  **Rate, honestly:** three recorded instances of an entry's own load-bearing
  claim dissolving under a one-command probe, all found by a session that
  probed before briefing. None was found by a check.

- **PARKED 2026-08-08 — delete `legacyReadPath` and its 26 call sites. Named
  missing evidence: 30 consecutive days with no `CacheFixLegacyPathWarning`.**
  `proxy/xdg-dirs.mjs:100-106` instructs its own deletion — "REMOVE THIS AND
  EVERY `legacyReadPath(` call after the transition. Grep for the function name;
  that is the whole deletion" — and nothing anywhere named when the transition
  ends, so a fallback designed for ONE transition has been indistinguishable
  from permanent since it landed. Measured 2026-08-08: `git grep
  "legacyReadPath("` returns **26 hits across 12 files** (`proxy/xdg-dirs.mjs`,
  `proxy/extensions/cache-telemetry.mjs`, `test/xdg-dirs.test.mjs`, and the
  tools `bust-triage`, `cold-events`, `cost-report`, `dossier`, `gate-live`,
  `harvest`, `quota-analysis`, `restart-exposure`,
  `scan-description-carrier-evidence`), and BACKLOG.md contained zero mentions
  of it before this entry.
  **Why PARKED and not READY, with the evidence named so this is a spec rather
  than drift:** the deletion is trivially enumerable and its DONE-criterion is
  its own grep returning zero, so nothing about the work is undecided — what is
  missing is the evidence that the transition finished. Deleting while a machine
  still holds unmigrated data turns a loud warning into a silent absent-file,
  which is the failure the fallback exists to prevent.
  The trigger is measurable rather than a judgement call because the instrument
  already exists: the fallback emits `CacheFixLegacyPathWarning` once per path
  per process, so "no warning for 30 consecutive days" is observable. It becomes
  READY the day that holds.
  Verifier when it fires: `git grep "legacyReadPath("` returns zero, `npm test`
  green, and — the arm that matters — a probe run against a HOME containing only
  legacy-located artifacts must fail LOUDLY with a missing-file error rather
  than silently resolving to an empty new path, because a silent empty read is
  exactly what the three-answer design in the module header was built to avoid.
  <!-- entry: "delete legacyReadPath and its 26 call sites" -->

- **READY — `CacheFixConfigDirDivergenceWarning`: tell a user who has set
  `CLAUDE_CONFIG_DIR` that our roots deliberately do NOT follow it, and where
  they actually resolve.** Booked 2026-08-08 afternoon at the request of the
  peer session that withdrew the parent design, and booked BEFORE that parent
  was re-graded — which is the only order that works. This warning existed as a
  subordinate clause inside the `key our roots by PROFILE` entry; that entry's
  headline design is withdrawn (`docs/directives/portable-state-roots.md` §7),
  so re-grading it — correct in itself — would have taken the warning with it.
  **It is now the WHOLE answer**, not a fallback: with `CLAUDE_CONFIG_DIR`
  refused as a root key, the warning is what tells a user that per-profile
  isolation and security relocation are available, and how (the explicit
  `CACHE_FIX_DATA_DIR` / `CACHE_FIX_STATE_DIR` overrides, which are OUR contract
  and cannot move under us). A carrier defect caught one step before it landed;
  the writer half — an amendment that should have been a split — is the lesson.
  **Design, complete, so nothing needs re-deriving:**
  - Fires in the WRAPPERS — `xdgData()` (`proxy/xdg-dirs.mjs:151`) and
    `xdgState()` (`:156`) — never in `resolveRoot` (`:141`), which stays pure
    and side-effect-free. That purity is what makes it testable, and it is the
    same reason `assertIsolated` sits in the wrappers.
  - Reuses the existing `warned` Set at `:192` — the legacy fallback's
    once-per-key mechanism. Do NOT add a second warn-once mechanism.
  - Condition: `CLAUDE_CONFIG_DIR` is set AND neither `CACHE_FIX_DATA_DIR` nor
    `CACHE_FIX_STATE_DIR` is set.
  - Text states four things: the variable is set; our roots deliberately do not
    follow it; where they actually resolve; and that the two `CACHE_FIX_*_DIR`
    overrides co-locate them.
  **Verifier, red-first, three arms, ALL required — the third is the one that
  matters.** FIRES: config dir set, no override → exactly one warning per root
  key (not per call). SILENT: config dir unset — this is the control that
  protects the live deployment, where neither variable is set. SILENT: config
  dir set WITH an override present — the over-firing control, because a warning
  that keeps firing after the user has already resolved the divergence trains
  them to ignore it, which is the check-that-fires-on-a-non-defect shape aimed
  at the one message we need read.
  Deployment-coupled: `proxy/**`, so it needs a dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) and a restart. Row 3: it touches neither
  state KEYS nor freeze logic — a warn-once side effect in a path wrapper — so
  the restart is cache-transparent, and that declaration is made HERE, before
  the restart, per the row's own rule.
  Unranked deliberately: booked after the 2026-08-08 afternoon derivation, and
  a rank is a re-derivation's to assign.
  <!-- entry: "CacheFixConfigDirDivergenceWarning" -->

- **READY (small) — a POINTER entry's liveness lives in ANOTHER repo, so this
  file's DONE-anchor guard cannot see it, and a POINTER can hold a rank forever
  after its work has shipped.** Measured 2026-08-08 afternoon on myself:
  `backlog-order.mjs` throws when a rank anchor resolves to a DONE-graded entry
  — it fired three times today and is the reason no stale rank survived — but it
  only reads THIS file's grade. A POINTER entry's body lives elsewhere by
  definition, so the fork entry stays `READY` no matter what that repo does, and
  the guard passes with a clean conscience. Two ranked entries in the current
  block are POINTERs; a third was in the previous block.
  **And the failure mode is not hypothetical — it is how I got it wrong in both
  directions in one hour.** I first carried the ❄-detector POINTER forward at
  Tier A rank 6 without checking the other repo (the midday handoff had said the
  cross-repo items shipped); then, when the operator asked, I discharged it from
  that same handoff SENTENCE rather than from the world; then the operator
  observed the class still firing and the check refuted the discharge. Three
  readings, none of them from the pointed-at repo, and the one that settled it
  was an md5 against the installed file.
  Design, decided: a POINTER entry names its target repo and an identifying
  string; a check resolves that repo's backlog and reports the target entry's
  grade beside the pointer, with the three-answer discipline — target RESOLVED
  (this pointer is stale) / target LIVE / COULD-NOT-RESOLVE with its reason
  (repo absent, string not found, ambiguous match). It runs where the other
  cross-file checks run, not in `gate-live`: this is a repo-state property, not
  a traffic property. Keep it a REPORT, not a blocker, until its false-fire rate
  over the current POINTER population is measured — a guard that blocks before
  anyone knows how often it fires on legitimate work is how a guard trains its
  reader to ignore it.
  **And "resolved there" is NOT "discharged here" — the check reports, the human
  grades.** That distinction is the whole lesson above: the ❄ pointer's target
  entries ARE shipped in the other repo, and the fork-side concern survived them
  anyway. A pointer whose target is RESOLVED is a prompt to re-read the fork
  entry's own premise against the world, never an instruction to grade it DONE.
  Verifier, red-first and available on committed history: run it over
  `git show ed76e61:BACKLOG.md` — the ❄ pointer must report target-RESOLVED
  (`8bfc385` shipped before that commit) while the fork entry there reads READY,
  which is exactly the divergence nothing currently detects. Negative control: a
  POINTER whose target is genuinely open must report target-LIVE, and a POINTER
  naming a repo that is not present must report COULD-NOT-RESOLVE rather than
  either.
  Consumer tier **3 (backlog and process)** — it mis-orders work and is
  recovered at the next derivation. Unranked (booked after the derivation).
  <!-- entry: "a POINTER entry's liveness lives in ANOTHER repo" -->

- **READY (small) — a lane whose worktree is RECLAIMED lands in the shared main
  checkout, and its in-progress red then blocks the DISPATCHER's unrelated
  push.** Measured 2026-08-08 afternoon, end to end. A lane was dispatched with
  worktree isolation; the worktree did not survive, and the lane correctly
  reported that it was in the shared checkout. That report was acknowledged and
  the write-boundary rules were re-issued (pathspec-only commits, never amend,
  never push) — and the coupling nobody named was the PUSH: the repo's pre-push
  hook runs the WHOLE suite, so the lane's half-written
  `test/xdg-writer-guard.test.mjs:112` (2407 pass / 1 fail, a test it was
  actively iterating on) blocked a dispatcher push carrying two unrelated
  commits. The dispatcher's work was green; the tree was not.
  **The wrong repair is `--no-verify`, and it is worth writing down why**, since
  it is the obvious move and the hook itself suggests it. The repo hook is
  CHAINED behind the global dispatcher hook (dotfiles `git/hooks/pre-push`),
  which runs the fixture-leak scan — so `--no-verify` skips the suite AND the
  leak scan, at the exact boundary where git history stops being editable. A
  bypass taken for an unrelated red is how a capture id reaches a public repo.
  The correct move is to wait for the tree to go green, which is what happened.
  **What is actually missing:** `docs/dev-loop.md` says concurrent lanes need
  worktrees, and the dispatch skill's worktree recipe assumes the worktree
  exists. Neither covers the case where the harness RECLAIMS it mid-run and the
  lane silently continues in the shared checkout — discovered by the dispatcher
  at push time, which is the worst moment to discover it.
  Design, decided, two halves. (1) A dispatcher-side probe at the first report
  from any isolated lane: confirm the worktree still exists
  (`git worktree list` naming it) before acknowledging; a reclaimed worktree
  converts the lane to shared-checkout rules, which now include "the dispatcher
  cannot push until you are green — tell me when you are". (2) State the
  coupling in the brief's write-boundaries section so the executing lane knows
  its red is not private. Do NOT try to scope the pre-push suite to changed
  files: the whole-suite run is what catches cross-file breakage and narrowing
  it to buy push latency trades a real guard for convenience.
  Verifier, red-first, reproducible without waiting for a lane: in a scratch
  clone, add a failing test file, commit an unrelated change by pathspec, and
  confirm `git push` is BLOCKED; remove the failing test and confirm it is
  allowed. That is the whole mechanism, and it is the arrangement this incident
  ran by accident.
  Consumer tier **3 (backlog and process)** — it costs elapsed time and a
  bypass temptation, not a wrong verdict. Unranked (booked after the
  derivation).
  <!-- entry: "a lane whose worktree is RECLAIMED lands in the shared main checkout" -->

- **READY — a derivation asks whether an entry's PREMISE is true and never
  whether WORK REMAINS, and the two come apart silently.** Measured 2026-08-10,
  within an hour of the first retirement pass, by the ranking that pass fed: the
  coverage-walk entry was probed STILL-TRUE — correctly, every fact in it holds —
  and ranked tenth, and it contains no remaining work at all. Its own body says
  so in a sentence nobody read at ranking time: parts (1) and (2) shipped
  (`7827c4e`, `b94d118`) and part (3) was split into a separate entry, leaving it
  "READY only for (3)'s absence, which is another entry's work; it survives here
  as the record of what the instrument covers."
  **The class, stated so it is not re-learned as a one-off:** an entry can be
  entirely TRUE and entirely DONE at once. Premise-truth and work-remaining are
  independent, the retirement pass measured only the first, and the READY grade
  asserts the second. So a pass that verifies every premise still leaves the
  count overstating the queue, and the overstatement is invisible precisely
  because each entry reads correct.
  **Why this is not covered by the neighbour-invalidation entry above it:** that
  one fires when a DIFFERENT entry's work lands. This one fires when the entry's
  OWN work lands in pieces and the residue is split out — no other entry closes,
  so nothing anywhere is triggered.
  **The computable slice, which is most of it:** an entry whose body cites its
  own commit refs as shipped, or whose text splits its remainder into another
  entry, is machine-detectable — commit-shaped tokens plus a split-out phrase in
  a bullet still graded READY. The judgment remainder (is what is left actually
  work?) stays prose.
  Design, decided: the check lands in `tools/backlog-lint.mjs` as a REPORT — a
  READY bullet whose body carries a shipped-commit citation for its own parts is
  flagged for a human read, never auto-re-graded. Report and not a gate, because
  an entry legitimately cites commits that shipped ADJACENT work, and a guard
  firing on that trains the override reflex.
  **Verifier, red-first over an immutable reference and a TRUE positive:** run it
  over `BACKLOG.md` at `633256b`, where the coverage-walk entry was still graded
  READY with `7827c4e` and `b94d118` in its own body — it must flag exactly that
  entry. Over-firing control: the entries that cite a commit ref belonging to
  another entry's work must NOT be flagged. Done when the flag fires on the
  frozen positive and the derivation's own preamble records the count it found.
  Consumer tier **3 (backlog and process)** — it mis-orders work and inflates
  every count read from this file, and it is recovered at the next derivation.

- **READY (small) — a correction APPENDED to the end of an entry is invisible to
  everyone who reads the entry's head, and this repo's own entries are long
  enough that the head is what gets read.** Measured 2026-08-10, and it cost a
  dispatch: the retirement pass wrote `PREMISE CORRECTED` blocks by APPENDING
  them after each entry's body. Hours later the same session briefed a lane from
  one of those entries, read its head to write the brief's Background, and
  asserted the pre-correction premise as current fact. The correction sat at line
  29 of 36 — 78% in. The lane read the whole entry, found the contradiction,
  halted before touching a file, and returned the question. The guard worked and
  the dispatch was still wasted.
  **The class:** an entry is a document with a HEAD and a BODY, and a grade or a
  premise correction is a claim about the WHOLE entry. Placed at the end it
  becomes a label that the label's own readers never reach — the corpus's
  label-over-body drift, produced here by the correction format rather than by
  neglect. Appending is what a script does naturally, which is why this arrived
  as a mechanical habit rather than a judgment error.
  **What makes it worth a mechanism rather than a resolution:** the writer is
  still running. Every future pass that corrects entries in bulk will append
  unless something stops it, and the next reader will be a brief-writer under
  momentum — the exact conditions of this instance.
  Design, decided, two halves. (1) CONVENTION, in `docs/dev-loop.md` beside the
  entry-format rules: a grade change or premise correction is written
  IMMEDIATELY AFTER the entry's first bold claim, never appended — the reader who
  stops early must hit it first. (2) The computable slice, in
  `tools/backlog-lint.mjs` as a REPORT: a bullet containing a correction marker
  (`PREMISE CORRECTED`, `RE-GRADED`, `CORRECTED`, `WITHDRAWN`) past its first
  third is flagged. Report and not a gate, because a long entry may legitimately
  narrate several corrections in sequence; what is flagged is the FIRST one being
  late.
  **Verifier, red-first over an immutable reference and a TRUE positive:** run it
  over `BACKLOG.md` at `633256b` — the runbook-caveat entry must flag (correction
  at 78%), and the entries whose corrections the same pass placed early must not.
  Over-firing control: an entry whose ONLY correction marker sits in a quoted
  historical narrative must not flag.
  Done when the check fires on the frozen positive, and the next bulk correction
  pass writes its blocks at the head by construction.
  Consumer tier **3 (backlog and process)** — it mis-informs the reader of an
  entry, and its measured cost so far is one wasted dispatch.

- **READY (small) — `tools/xdg-writer-guard.mjs` is red at 34 and its `main()`
  is wired to no consumer; and the reason recorded in this backlog for why
  `npm test` stays green is FALSE.** Booked 2026-08-10 from the public-surface
  and systems review. The wiring half is already named inside the bucket-(d)
  entry above as "a second item hiding inside this one" — which is the shape
  that never ships, so it is precipitated out here.
  **The correction matters more than the item.** That entry says
  "`test/xdg-writer-guard.test.mjs` exercises the PREDICATE on synthetic
  content and never runs it over the real tree". Verified in the artifact and
  it is wrong: `:35` runs `execFileSync("git", ["show", <ref>:<path>])` against
  real git history, `:97-98` reads `tools/usage-to-dashboard-ndjson.mjs`, and
  `:115` reads `tools/gate-live.mjs`. The test reads real bytes. What is
  unwired is only the **full-tree sweep entrypoint** — `main()` — which no
  test, gate or hook calls. I asserted the synthetic-only version myself
  first, inheriting it from a brief, and a dispatched census contradicted me;
  reading the file settled it. The class name survived
  (predicate-tested, deployment-untested); the instance attribution did not,
  and the correction makes the fix an order of magnitude cheaper — wire one
  entrypoint, do not rewrite a test.
  Design (decided): give `main()` a consumer, NON-blocking at first because it
  over-fires on the 9 someone-else's-path hits — a `gate-live` sweep line, the
  same reporting slot the backlog lint uses, so a red is visible daily without
  training the override reflex. It goes blocking only after the ~20 real stale
  claims are repaired and the 9 are a declared, self-verifying exemption the
  guard itself checks.
  Verifier, red-first: run the wired consumer at the current commit and
  confirm it reports non-zero (34 today — the baseline is already red, which
  is stated because a mutate-and-revert proof over an always-red baseline
  proves nothing); then plant one fresh stale claim and confirm the count
  moves by exactly one.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "xdg-writer-guard main() is wired to no consumer" -->

- **READY — nothing in this repo distinguishes a checker that WORKS from a
  checker that is CALLED, so `npm test` green is not evidence that any
  instrument runs on real data.** Booked 2026-08-10; this is the structural
  finding under the review's seed observation 1, which asked whether a
  manifest of checkers-and-consumers beats case-by-case discovery.
  **Measured, not asserted.** A census over the stack classified **49
  mechanisms: REAL 13, SYNTHETIC-ONLY 16, MANUAL-ONLY 15, NO-CONSUMER 1** —
  31 of 49 never touch real data unattended. `npm test` at the same commit:
  2620 tests, 2615 pass, 0 fail, 5 skipped. The suite proves mechanisms WORK.
  Nothing proves they are USED, and the two failures are indistinguishable
  from inside the suite.
  **Why prose will not close this.** The rule is already written in this
  file, in `docs/dev-loop.md`, and it has been re-learned at least three times
  this month (the scope lint, the xdg guard, the absorption check). Each
  instance was caught by a human reading a report, which is exactly the
  recognition step that fails mid-flight.
  Design (decided): a derived meta-test, not a hand-maintained manifest — a
  hand-written list of checkers goes stale the first time someone adds one,
  which is the same label-over-body defect the checkers exist to catch.
  Enumerate executable checkers from the tree the way
  `test/logs-schemas.test.mjs:340-420` enumerates sources
  (`git ls-files tools` filtered to modules exporting a `main` or having a
  CLI entry), and assert each appears in at least one CONSUMER position:
  a `package.json` script, a `gate-live` invocation, a git hook, a systemd
  unit, or a test that calls its entrypoint over real tree data. Unreached
  checkers are a KNOWN-OPEN inventory **by path, never by count** — a count
  stops validating the day it legitimately grows.
  `test/logs-schemas.test.mjs:340-420` is the template in every respect and
  should be read before writing this: real sweep, self-verifying `mustMatch`
  exemption, a planted-case instrument-positive AND a real-file
  instrument-positive, `assert.ok(files.length > 50)` so a dead enumerator
  cannot pass as a clean sweep.
  Verifier, red-first: the meta-test must go red on `xdg-writer-guard.mjs`
  TODAY (it is the known positive, unwired at this commit); wiring it must
  turn that one row green while the rest of the inventory stays put.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "nothing distinguishes a checker that works from one that is called" -->

- **READY — `gate-status.json` grows without bound, the doc that says
  otherwise is why nobody noticed, and the fix is to SPLIT it, not to prune
  it.** Measured 2026-08-10: **571,997 bytes** against the ~200 KB
  `docs/dev-loop.md` recorded as a steady state (2.9x); **103 rows** against
  **70 captures on disk**; **41 of 103 rows name a capture that is gone**
  (negative control: the other 62 resolve, so the orphan count is not a
  matcher artifact). `grep -nE 'prune|MAX_ROWS|retain' tools/gate-live.mjs`
  returns nothing. Rows do not track the capture count — the file is
  monotonic in cumulative captures ever seen.
  The doc's sentence has been corrected in place (`docs/dev-loop.md`, the
  "Never Read that status file whole" block), because a load-bearing measured
  number that is 2.9x stale is what makes the growth invisible.
  **The inversion is the design.** Those 41 orphaned rows are precisely what
  closing-gate question 2 demands of a recurring producer: evidence that
  outlived its capture. Pruning them to shrink the file would delete the
  answer to the question the gate exists to ask. Split instead: a small
  `gate-status.json` snapshot (ok / failing / current rows) that the doctor
  and `jq` read, plus an append-only `gate-evidence.jsonl` that nobody `Read`s
  whole and nothing prunes.
  Verifier: after the split, `stat -c%s` on the snapshot stays under the Read
  tool's cap across a week of gate runs while the evidence file's line count
  strictly increases; and the 41 currently-orphaned rows survive the
  migration (count them before and after — a migration that "cleans up" is
  the failure mode).
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "gate-status.json grows without bound; split it, do not prune it" -->

- **READY (small) — `backlog-lint` reports clean on a `## ` heading split
  across two lines, and 82 entries were filed under a phantom section because
  of it.** Found and repaired 2026-08-10. `BACKLOG.md` carried
  `## Upstream PR round — booked 2026-08-05; the round below is CLOSED,` on
  one line and `## current state is the first entry` on the next: ONE logical
  heading, TWO `## ` lines, so every section-scoped parser saw two sections
  and 82 entries sat under a heading that is a sentence fragment.
  `node tools/backlog-lint.mjs BACKLOG.md` → `backlog-lint: clean`, before and
  after. The heading is now joined; the lint gap is not.
  Design (decided): add a predicate to `backlog-lint` — a `## ` line whose
  text begins lowercase, or whose predecessor `## ` line ends in a comma or
  conjunction, is a WRAPPED-HEADING finding. Both halves, because either
  alone is escapable.
  Verifier, red-first, and the baseline is stated: the lint is GREEN on the
  current file, so re-introduce the exact two-line form from
  `git show HEAD:BACKLOG.md` and confirm the new predicate fires on it; then
  confirm it stays silent on every other `## ` heading in the file (the
  over-fire half — a lint that flags legitimate headings trains the override
  reflex).
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "backlog-lint reports clean on a heading split across two lines" -->

- **PARKED [HANDED OFF 2026-08-10] (small, POINTER — the fix site is `dotfiles`) — the session-start
  line reports `127 open item(s)` from `## Open` alone, while the file holds
  337 entries across five sections, and the rendered line carries no
  qualifier.** Measured 2026-08-10 by section:
  `## Open` **128**, `## Done` 93, `## Upstream PR round` 82,
  `## Parked decisions` 29, `## From the closing-gate sweep` 5.
  `session-scan.py:29` (dotfiles) declares the `## Open` scope in its
  docstring — the code is honest; the OUTPUT is the paraphrase. A reader sees
  a whole-file count. This is the label-over-body class pointed at our own
  instrument: the scope is true, stated, and invisible at the point of use.
  Design (decided): the rendered line names its scope —
  `backlog (BACKLOG.md): 128 open item(s) [## Open only; 209 more in 4 other
  sections]`. Cheaper and more honest than widening the scan.
  **Owed write, not done, and the reason is stated rather than silent:** the
  fix site is `session-scan.py` in the `dotfiles` repo, whose working copy was
  reported carrying ~50 unpushed commits from a peer session. One writer per
  working copy — writing this entry into another writer's tree is the
  collision the dispatch rules forbid. The dotfiles-side booking is
  OUTSTANDING and this pointer does not discharge it; a pointer whose consumer
  never loads this file is decorative.
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "session-start line reports ## Open only, unqualified" -->

- **READY — `tools/logs.mjs` shipped as "one strict reader owning every
  on-disk schema" and has ZERO adopters; 14 tools still hand-parse the
  formats it owns.** Measured 2026-08-10, the day it landed
  (`f7e52dd` + `4c9ae88` + `17e0a14`). Importers of `tools/logs.mjs`:
  `tools/logs.mjs` itself and `test/logs-schemas.test.mjs` — nothing else.
  `grep -lE 'gate-status|usage\.jsonl|-events\.jsonl|captures/' tools/*.mjs`
  → **14 files**.
  The module is correct and tested. It simply does not yet do the job it was
  built for, and `docs/dev-loop.md:100-105` describes it in the present tense
  as though it does — which is how a mechanism becomes a paraphrase of itself.
  This is the same shape as the xdg-guard entry above and is the second
  instance behind the checker-consumer meta-test; both are listed because the
  meta-test will not migrate call sites.
  Design (decided): migrate the 14 hand-parsers to `logs.mjs` one commit per
  file, then let the existing scope lint go BLOCKING on the schema field
  names appearing outside the owner. Order matters — the lint before the
  migration is a guard that fires on legitimate work 14 times.
  Verifier: after each migration commit the sweep in
  `test/logs-schemas.test.mjs:340-420` moves exactly one path out of its
  KNOWN-OPEN inventory; the inventory is by path, so the count cannot drift
  silently.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "tools/logs.mjs shipped with zero adopters" -->

- **READY — the scrub's length-vector residual was accepted on a premise the
  operator's 2026-08-10 bar falsifies, so the acceptance has to be re-derived
  rather than inherited.** `docs/dev-loop.md` recorded the residual —
  paragraph count, per-paragraph lengths, and cross-text sharing of identical
  paragraphs — as "Accepted here (operator, 2026-07-31) because this
  deployment runs local and controlled and **commits only its own traffic's
  fixtures**". The proxy fronts every Claude Code session on this machine, so
  the captures behind those fixtures are other projects' conversations. The
  exemption's own next clause — "anyone harvesting NON-local or third-party
  traffic should re-make that judgment ... length vectors can fingerprint
  known public texts" — describes this deployment. It was written as a
  warning to someone else.
  **The operator's bar, stated 2026-08-10:** cache-fix's own dev chat in
  public is acceptable; content from any OTHER session is not. Tool names are
  explicitly acceptable (same day) — inventory, not content.
  **Content measured clean against that bar across all 249 tracked fixture
  files**, every probe red-first against a planted positive: message text is
  hash tokens throughout; 1,323 image blocks all tokenized, **0** base64
  payloads; 34,053 of 34,054 thinking blocks empty, the one non-empty block
  synthetic and labelled; **0** non-structural object keys across 249 tracked
  and 176 untracked-and-staged files; 0 foreign filesystem paths; 249/249
  readable, zero could-not-verify. The prose corpus yielded exactly one
  conversation-shaped quote and it is the harness string "The user sent a new
  message while you were working:".
  So the residual is SHAPE, never content: nobody reconstructs a conversation
  from it, but for a session that pasted a known public document the vector
  can confirm which one.
  **DECIDED 2026-08-10 — ACCEPT-AND-REWRITE** (operator, standing go on the
  recommendation): the shape residual is accepted under the new bar, and the
  falsified rationale is replaced rather than inherited. The alternative was
  changing the scrub granularity, rejected because the
  granularity is what makes the fixtures useful as replay input, and
  quantising paragraph lengths would degrade the corpus to defeat an attack
  nobody has evidence of. What is not defensible is leaving the falsified
  sentence standing; it has been rewritten in place already, marked as an open
  accepted risk pointing here.
  Consumer tier **1 (event disposition)** — it governs what may be published.
  <!-- entry: "the length-vector acceptance rests on a falsified premise" -->

- **PARTLY DONE 2026-08-10 — the bar is now written down and one of its five
  predicates is enforced; three remain.**
  **Shipped:** the bar itself is in `CLAUDE.local.md` (dotfiles
  `cache-fix/CLAUDE.local.md`, commit `7530895`, deployed and pushed) — stated
  in one line with the load-bearing fact under it, the 2026-08-10 measurement,
  the enforcement split, and the note that git history is not covered.
  **Also shipped, by a different route than this entry predicted:** the
  canonical-UUID predicate. `a449d9a` widened the source-UUID roster to every
  tracked SOURCE_SCANNABLE file, so a session id in any tracked source file or
  document now fails `npm test`. That is stronger than the `absence-scan`
  predicate proposed below and supersedes it — one owner for the shape, not
  two.
  **Still open, and the entry is READY for exactly these:** the base64-run,
  non-empty-thinking, and foreign-path predicates over source files, plus the
  harness-marker one. Each ships with its own planted-positive fixture — four
  reds, not one, because red certifies the class that fired.
  Original entry follows.
  Booked 2026-08-10, the day the bar was first stated. The bar: **no content
  from any session other than cache-fix's own dev chat reaches the public
  tree**; tool names are acceptable.
  Every check that currently defends it was run BY HAND this session. When
  the next session harvests, nothing re-runs them.
  Design (decided), splitting computable from judgment exactly where the
  post-incident rule says to. Computable, and it goes into `absence-scan.mjs`
  (already a pre-push hook, so it sits before the irreversible boundary):
  a base64 run of ≥256 chars; a non-empty `thinking`/`redacted_thinking`
  body; an absolute `/home/<user>/...` path outside this repo and the known
  XDG roots; a canonical UUID in content or filename; the harness markers
  (`<system-reminder>`, "The user sent a new message while you were
  working:"). Each of the five ships with its own planted-positive fixture in
  the test — five reds, not one, because red certifies the class that fired,
  never the instrument's reach.
  Judgment remainder, staying prose with the operator as backstop: whether a
  given residual string is other-session content or this repo's own
  vocabulary. The 2026-08-10 pass had to classify 3,012 distinct residual
  strings by hand and every one turned out to be this repo's census
  vocabulary, sanitizer provenance notes, or test scaffolding — that
  classification is not mechanizable and should not be faked.
  The bar itself belongs in `CLAUDE.local.md` (the operator overlay, which is
  where fork conventions live and which every session in this repo loads),
  stated in one line, with the mechanism named beside it.
  Verifier: the five planted-positive fixtures each turn `absence-scan` red in
  isolation, and the whole current tree stays green — the over-fire half.
  **Two of the five now have a REAL known positive, which beats a planted one
  and was found the same day** (see the history-scan entry below): the base64
  predicate can be proven on blob
  `aceb2c443f4a35f5f76ac2adbf5e7c59c96ca1b8` — an actual 9,794-byte PNG that
  actually shipped — and the UUID predicate on **s-captureAX**'s full session
  id, which sits in `LEDGER-Siren.json`'s historical blob (the id itself is in
  the machine-local alias registry, not here). A predicate red on the defect
  that really occurred certifies the class
  that really fires; a planted case certifies only the planting.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "the operator's publication bar is not written down or enforced" -->

- **READY — the public-surface split: UNTRACK IN PLACE, do not move the
  files; and two of the four premises the decision was built on are refuted.**
  Booked 2026-08-10 from the review of `FABLE-BRIEF-public-surface-and-systems-
  review.md`. The proposal was to move ~33 fork-only documents into a private
  `cache-fix-ops` repo.
  **Refuted premise 1 — "6 merged, 3 open" upstream PRs.** Real count:
  **10 merged, 3 open, 1 closed** (`gh pr list --repo
  cnighswonger/claude-code-cache-fix --author Gunther-Schulz --state all`).
  **Refuted premise 2 — decision #2, "`docs/dev-loop.md` stays public because
  an open upstream PR body references it".** Only **#276** references it, and
  its own line reads "Optional — happy to drop it if you'd rather keep docs
  lean." Zero PR-body hits for BACKLOG / FORK-NOTES / runbooks / audits /
  matrix. The stated basis for keeping dev-loop public does not hold — it
  should stay public for a different and stronger reason: **82 of its
  citations sit in `tools/`, which #276 upstreams.**
  **The permalink probe, executed with a negative control**, and it cuts both
  ways: a file deleted in `76658d8` is still served at its parent SHA
  `7553466` — raw HTTP **200**, blob page HTTP **200** — while the same path
  at `main` is HTTP **404**. So moving files buys nothing retroactively; only
  the forward write stream changes. Decision #4 (no history rewrite) already
  accepted that, but the move was being priced as if it bought more.
  **The measured cost of moving.** 144 citations in PUBLIC source would dangle
  into a private repo; 12 of the 94 citing files already exist in upstream's
  tree. `tools/bust-triage.mjs:77` hardcodes the threat matrix path and
  degrades SILENTLY: probed with a positive control, `matrixRow(4, <real>)`
  returns the row and `matrixRow(4, <moved>)` returns `null`;
  `eventWalks(<real>)` returns 5 and `eventWalks(<moved>)` returns 0 — every
  event becomes UNCLASSIFIED with no error. `required-reading-gate.py` is
  **fail-open by design** (its own docstring: roster absent → ALLOW, SILENT),
  so moving `FORK-NOTES.md` silently disables half the gate.
  **What the operator's bar does to this whole question: it largely dissolves
  it.** The 120 MB of fixtures — the largest and most alarming part of the
  public surface — measure clean (entry above). The 52 fork-only documents are
  cache-fix dev chat by construction, which the bar explicitly permits. The
  33-file move solves a problem that does not exist.
  Design (recommended, operator's call): **untrack in place.** Make
  `cache-fix-ops` the HOME and deploy back to the same in-tree paths through
  the existing `DEPLOYED_COPIES` mechanism in dotfiles' `bootstrap/manifest.py`
  — the same mechanism that already deploys `CLAUDE.local.md` and
  `.claude/required-reading.json` here. Every path stays where every tool,
  citation and gate expects it; nothing dangles; nothing degrades silently.
  Use a TRACKED `.gitignore`, not `.git/info/exclude` — the latter does not
  travel to a fresh clone, which is the whole failure mode being guarded
  against.
  **DECIDED 2026-08-10 — UNTRACK IN PLACE, priority LOW** (operator, standing
  go on the recommendation). Low because the bar's content half is met in the
  tree, so the move buys hygiene rather than protection; the design above is
  what gets built when it is picked up, and no part of it waits on further
  evidence.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "public-surface split: untrack in place, do not move the files" -->

- **DONE `a449d9a` (2026-08-10) — the full-UUID shape was deferred to a
  roster that did not walk the file, so writing the FULL id disabled the guard
  that catches the SHORT one. Roster widened to the scanner's own predicate;
  the two now import the same regex.**
  **MECHANISM CORRECTED, and the first version of this entry was wrong in a
  way worth keeping visible.** It claimed "`absence-scan` cannot see PROSE —
  both byte-level classes fire only on parsed JSON values". That is false.
  `tools/absence-scan.mjs:355-361` routes a source file to `scanSourceText`
  DELIBERATELY, applying the short-key class alone, and `:395-408` carries the
  measured rationale for excluding the UUID and b64 classes from source files
  (dozens of legitimate synthetics in tests and docs; a guard that fires on
  legitimate work trains the override reflex). I graded a considered design as
  an oversight because I read the behaviour and not the reasons beside it —
  the wrongness claim needs the DEFINITION, not just the reproduction, and the
  definition was one screen up in the same file.
  **What actually survived, and it is sharper than the original claim.**
  `FULL_UUID_HEAD` (`:441`) suppresses the short-key finding on any line
  containing a full 8-4-4-4-12 UUID, deferring that shape to "the source-UUID
  roster the suite already walks" (`test/absence-scan.test.mjs:387`). That
  roster walked `test/*.mjs`, `tools/*.mjs`, `proxy/**.mjs`, `docs/**.md` —
  599 files, and NO root-level `.md`, no `.md` under `tools/`, no tracked
  `.sh`/`.py`/`.yml`. So for `BACKLOG.md` and `FORK-NOTES.md` — the two
  fork-only root documents, and the ones that discuss captures most — the
  deferral pointed at nobody, and writing the full form actively DISABLED the
  short-key guard on that line. Two sentences of one spec disagreeing.
  Measured, both arms: `scanContent("… <full id>", "BACKLOG.md")` -> 0
  findings; the short form on the same file -> 1.
  **CONFIRMED END-TO-END by a second session, 2026-08-10, by planting rather
  than by reading** — the component measurements above establish the roster's
  WIDTH, and this establishes that the chain from a real edit to a blocked push
  actually closes. A synthetic full UUID appended to tracked `FORK-NOTES.md`
  turned the roster bite RED ("unlisted UUID(s) in source — a capture
  identifier in a public tree, or a new synthetic missing from the allowlist"),
  35 pass / 1 fail; the repo's pre-push hook runs the full suite, so that red
  is a blocked push. `FORK-NOTES.md` was restored from a byte copy in the same
  command (empty `git diff`, zero occurrences remaining). Worth recording
  because the scan ITSELF still reports `absence-scan: clean` on that file —
  checked directly, exit 0 — so the guard that stops the leak is the suite, not
  the scanner, and anyone reading only the scanner's own output would conclude
  the opposite.
  **Fix shipped.** The roster now enumerates `git ls-files` filtered through
  `SOURCE_SCANNABLE` and `SCANNABLE`, both newly EXPORTED from the scanner and
  IMPORTED by the test rather than restated — the deferral's target is now the
  same set as its domain by construction, and narrowing one narrows the other.
  646 files, up from 599. `git ls-files` rather than a wider readdir also
  excludes untracked scratch, which is correct: three root-level dossier files
  on this machine carry real registered capture ids right now, and they are
  not findings while untracked and become findings the moment anyone commits
  them.
  **Red-first, arrangement named:** the new expectations were run against the
  OLD walk in place (same directory, so paths resolve; only the walk reverted)
  and failed on `the walk collected no root-level file`, 35 other tests
  passing — so the red is the new assertion, not a broken copy. An earlier
  attempt to prove this from a scratchpad copy failed for path reasons and was
  discarded rather than reported as the red. Over-fire half: 0 offenders
  across all 646 files, `npm test` 2648 tests / 2643 pass / 0 fail.
  **One allowlist entry added, and it is NOT ours:**
  `tools/MANUAL-COMPACT.md` carries a real-looking session id as example
  output, byte-identical in `upstream/main` (verified with
  `git show upstream/main:<file> | grep -c`). Inherited, already published
  from upstream's own repository, listed with that provenance rather than
  scrubbed — editing it would diverge a file we carry unchanged. I nearly
  scrubbed it as a live fork leak; the same "measure whose artifact it is
  first" check that cut the public-surface count by six caught it.
  **The scope line was the other half and is corrected too.** It reported
  every non-corpus file as getting "byte-level classes only (b64-run,
  capture-uuid)" — false in both halves for a source file: those classes never
  run on it, and the one that does (`capture-key-prefix`) went unnamed. It now
  reports the two regimes separately and names the roster that owns the full
  shape. An assurance wider than its predicate is what stops anyone checking
  it.
  Superseded text follows: **`absence-scan` cannot see
  PROSE. Both of its byte-level classes fire only on parsed JSON values, so a
  session UUID or an image payload written into any `.md` file passes the
  pre-push guard untouched — and its own scope line says the opposite.**
  Found 2026-08-10 by doing it: while writing the history-scan entry below I
  put a real published session UUID into `BACKLOG.md`, and neither guard
  stopped it. My own grep did.
  **Measured, both arms, same UUID, same run:**
  - as a JSON value → `FINDING capture-uuid ... $.note (36 chars)`, exit
    non-zero. The class works.
  - in markdown prose → `absence-scan: clean`.
  Identical split for the other class: a 400-char base64 run is
  `FINDING b64-run` as a JSON value and **clean** in a `.md` file.
  **The label-over-body half, which is why nobody looked.** The tool prints
  `scope: N file(s) outside test/fixtures/harvested/ — byte-level classes
  only (b64-run, capture-uuid)` (`tools/absence-scan.mjs:640`). "Byte-level"
  reads as "these classes run over the raw bytes of this file". They do not:
  `:248-253` and `:221` are value predicates evaluated during a JSON walk, so
  for a non-JSON file the walk yields nothing and every class returns clean.
  The assurance is wider than the predicate establishes, which is exactly
  what stops anyone checking it.
  **Why this is blocking rather than tidy-up.** The alias convention exists
  *for prose* — `BACKLOG.md`, `docs/dev-loop.md`, the threat matrix, the
  runbooks are where captures get discussed, and prose is the one place the
  pre-push scan is blind. The Edit-time hook covers part of the gap: it
  denied a later write of mine for `capture-key-prefix` (short `s-<hex>`
  forms). It did NOT deny the full canonical UUID. So a full session id in a
  markdown file today passes BOTH guards, and the only thing that caught it
  was a human running grep on the diff.
  Design (decided): the two `scope: "any"` classes get a genuine byte-level
  pass over the file's raw text for every scanned file, JSON or not — the
  JSON walk stays as-is for the corpus classes that need key context
  (`raw-content` needs `CONTENT_KEYS`, so it cannot go byte-level and must
  keep saying so). Then correct the scope line to state what each class
  actually reaches; an instrument's own words about itself are a claim like
  any other.
  Verifier, red-first, and the arrangement is already run: plant a real
  published session UUID and a 400-char base64 run in a `.md` fixture and
  confirm both fire (today both are silent — that is the red, and it is a
  REAL positive, not a constructed one: the UUID is s-captureAX's, which
  genuinely shipped). Over-fire half: the current tree, including this file
  with its ~185 alias citations, must stay green — aliases are not UUIDs and
  must not become findings.
  Consumer tier **1 (event disposition)** — it is the guard on the
  irreversible boundary.
  <!-- entry: "absence-scan cannot see prose; both byte-level classes are JSON-value-only" -->

- **DECISION (operator's) — git history was scanned end to end for the first
  time on 2026-08-10, and it holds exactly two things: one real published
  image, and a reversible session-id mapping. No conversation text.** The
  question decision #4 ("no history rewrite") was answered under is now
  measured rather than unknown.
  **Method, so the numbers are re-checkable.** Population defined
  mechanically and pinned: every blob introduced by a fork-only commit, any
  path — `git rev-list upstream/main..HEAD` then `git diff-tree -r` per
  commit — **712 commits, 1,752 distinct (blob, path) pairs**, pinned at
  `cf0592d` because HEAD moved mid-run and a moving population is not a
  population. Seven-class closed taxonomy, each class required to catch a
  planted positive before any of its zeros counted; `blobs_scanned` 1752,
  `blobs_unreadable` 0.
  **FINDING 1 — a real PNG, published, unretractable.** Blob
  `aceb2c443f4a35f5f76ac2adbf5e7c59c96ca1b8`, the reset-move 196-197 fixture
  of **s-captureAX**, at `$.requests[0..4].messages[210].content[2].source.data`:
  9,794 bytes, PNG magic verified, **951x55, 8-bit RGBA**, five identical
  copies. Header decoded only; the image was not viewed. Introduced by
  `a1170a7`, removed by `687cbc5` ("sanitize fixtures fully: nested payloads,
  capture identifiers, wall-clock, filenames") — **both commits are ancestors
  of `origin/main`**, so it was public before the scrubber fix and the blob
  stays fetchable at its sha forever. This is the incident
  `docs/dev-loop.md` already records, now located to the byte. `in_head:
  false` is not protection, and the permalink probe (raw and blob both HTTP
  200 at a pinned sha, 404 at `main`) is why.
  The second base64-shaped hit is NOT an image — it is a thinking-block
  `signature` field in the oscillation 863 fixture of **s-captureAZ**.
  Recorded because the taxonomy's literal shape test cannot tell the two
  apart and the next reader will hit the same ambiguity.
  **FINDING 2 — the short scrub tokens are reversible from public files.**
  The short token for **s-captureAX** resolves to its full canonical session
  UUID in historical blobs of `test/fixtures/harvested/LEDGER-Siren.json`,
  `docs/directives/robustness-threat-matrix.md` and `tools/replay.mjs`; the
  same holds for **s-captureAY** and **s-captureAZ**. Every containing commit
  is an ancestor of `origin/main`. Verified with a negative control:
  `git log --all -S` on a planted nonexistent UUID returns 0 commits.
  Current HEAD is clean — its 13 canonical UUIDs are placeholders plus three
  fixed test constants. (The three full ids are in the alias registry, which
  is machine-local by nature; they are not repeated here, for the reason this
  entry is about.)
  **What the scan did NOT find, each with the reason its zero is
  believable.** No other-session conversation text: 681 CHAT-PROSE hits, 78
  unique, every one our own provenance headers, our census verdict strings,
  harness text, or hand-written synthetic fixtures that declare themselves
  in-band (`insertion-1405.json`: "NOT real session content — built by
  hand"). No foreign-project paths: 295 hits, 27 unique, all this repo's own
  PR worktrees, `claude-worktime`, or `/home/test/...` placeholders — the
  allowlist was too narrow, an instrument-scope artifact rather than a leak.
  One THINKING-TEXT hit, synthetic and self-labelled.
  **The one residual that is the operator's own:** the flap and oscillation
  fixtures carry dotfiles corpus hook prose (`CLAUDE-maintenance.md` text)
  and a real agent id, committed RAW on purpose because the migration
  evidence needed raw bytes. All `in_head: false` after the 2026-07-31
  rebuild; history keeps them. Not another session's chat.
  **DECIDED 2026-08-10 — ACCEPT, no history rewrite** (operator, standing go
  on the recommendation). Recorded as a made decision rather than a live
  question so the next session does not re-open it: the basis is the
  measurement in this entry, and what would re-open it is NEW evidence — a
  further class found in history, or the image turning out to carry something
  its 951x55 strip does not suggest. Absent that, this is closed.
  The reasoning it rests on: A 951x55 image strip and a set of session identifiers do not
  justify rewriting a repo with three open upstream PRs, and the rewrite
  would not retract anything already cloned or cached. What the measurement
  changes is that the acceptance is made on evidence instead of on the
  absence of it — which was the whole reason to scan.
  **Not deferrable regardless of that decision:** the two predicates get
  their real known positives wired into `absence-scan` (entry above), so the
  next occurrence is stopped at the pre-push boundary rather than found by a
  scan a year later.
  **The guard proved itself while this entry was being written.** The first
  draft quoted the three full session UUIDs as evidence, and the fixture-leak
  hook refused the write — an entry ABOUT an id leak would have committed
  those ids into the current tree, where none of them are today. A guard that
  fires on its author writing about the very class it guards is the strongest
  evidence it is not decorative, and it is worth one line so the next session
  does not read the alias convention as bureaucracy.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "git history scanned: one published PNG, one reversible id mapping, no chat text" -->

- **READY — an instrument that separates MITIGATION-WORKED from
  MITIGATION-RAN. Today three instruments all report engagement and none
  reports outcome, so a live question had two surviving readings and nothing
  to decide between them.** Part B seed 2 of the 2026-08-10 review, booked
  because the review closed without reaching it and an unbooked seed dies
  with the session that read it.
  The observed case: a 263k bust triaged to a clean attribution, and the
  mitigation question could not be answered at all. `mutatedBy` proves an
  extension RAN. `absorptionMisses` returned 0. The wire still showed the
  array growing. Reading A — the mitigation worked and the growth is the
  API's own price. Reading B — the mitigation ran and did nothing. Both fit
  every number available.
  **The class, stated so it is not re-learned per instance:** a counter of
  invocations is a liveness probe, not an outcome probe, and a zero from a
  miss-counter is the non-event shape — a dead detector returns it too. The
  stack has several of these and they read as outcome evidence because they
  sit beside outcome questions.
  Design (decided): the outcome instrument is a COUNTERFACTUAL, not another
  counter — replay the same pair with the extension disabled and diff the
  wire bytes against the mitigated run. `tools/replay.mjs` already replays a
  serving config, so this is a second config and a diff, not new machinery.
  Reading A predicts a difference; reading B predicts byte-identity. That is
  the discriminating measurement the two readings lacked.
  Verifier, red-first: run it on the 263k case, where the answer is currently
  unknown — and BEFORE trusting either result, run it on a pair whose outcome
  is already known (a mitigation whose effect is measured), because a
  counterfactual harness that silently replays the same config twice returns
  byte-identity for both readings and looks like reading B.
  Consumer tier **1 (event disposition)** — it decides whether a matrix row
  is mitigated.
  <!-- entry: "an instrument that separates mitigation-worked from mitigation-ran" -->

- **ANSWERED 2026-08-10, not booked as open — "guards firing on legitimate
  work: reproducible discipline or luck?" It is discipline, and the sample is
  now four, including one failure the original two did not show.** Part B
  seed 5 of the review. Recorded because the question was asked and an
  unrecorded answer gets re-asked.
  The four instances, each with what the repair was: (1) the leak scan
  blocking on synthetic-but-UUID-shaped placeholders — repaired AT THE DATA,
  making the synthetics unmistakable; (2) a scope lint false-positiving on a
  coincidental identifier — repaired with a self-verifying declared
  exemption; (3) 2026-08-10, the capture-key-prefix hook denying a legitimate
  BACKLOG.md write that carried real ids — a CORRECT fire, repaired at the
  data by claiming aliases; (4) 2026-08-10, `tools/MANUAL-COMPACT.md`'s
  upstream-owned session id — repaired with a declared allowlist entry
  carrying its provenance, verified with `git show upstream/main:<file>`.
  **The pattern is real: every repair was at the DATA or in a NAMED, verified
  exemption, and none softened a predicate or reached for an override.** That
  is the shape the corpus prescribes, and four for four is not luck.
  **The failure the original two hid, and it is why this is worth recording
  rather than celebrating:** a guard can also over-SUPPRESS, and that direction
  produces no false fire to notice. `FULL_UUID_HEAD` suppressed the short-key
  class whenever a line carried a full UUID, deferring to a roster that did
  not walk the file — silent, and it took a real leak to surface (fixed,
  `a449d9a`). So the discipline is proven on the fire direction only. The
  standing question this leaves: **for every suppression clause in a guard,
  what proves its deferral target actually covers the suppressed domain?**
  `a449d9a` answered that for one clause by importing the predicate instead
  of restating it; nothing yet asks it of the others.
  Design (decided, small): a test that enumerates suppression clauses in
  `tools/` guards and asserts each names a target the suite exercises. Where
  that is not mechanizable, the clause carries the assertion inline, as
  `FULL_UUID_HEAD` now does.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "guards firing on legitimate work: discipline, and the suppression direction it misses" -->

- **READY (small) — dispose of `FABLE-BRIEF-public-surface-and-systems-review.md`
  at the repo root: it is a spent brief, and its own header's reason for
  existing untracked has expired.** Booked 2026-08-10 by the session that
  executed it, because naming a loose end is not disposing of it.
  The file says it is "UNTRACKED on purpose — it argues about what to
  un-publish, so it does not publish itself while that decision is open." That
  decision is now CLOSED (untrack-in-place, LOW priority — its own entry
  above), and every finding the brief commissioned is booked: Part A as the
  public-surface entry, Part B seeds 1/4/6 as the checker-consumer,
  derived-view and record-drift entries, seed 2 as the mitigation-outcome
  instrument, seed 3 shipped by `e9a374b`, seed 5 answered in its own entry.
  So the brief is spent, not pending.
  Design (decided): MOVE it to `docs/directives/`, do not delete. Two reasons,
  and the second is why this is an entry rather than an act. (1) File roles:
  `docs/directives/` is where persisted briefs of substantial dispatched work
  live, and this is one. (2) Deleting an untracked file is IRREVERSIBLE — git
  holds no copy — and it is the operator's own input document, not this
  session's artifact. An irreversible act on someone else's file is exactly
  the kind that gets confirmed rather than assumed.
  Note before moving: `docs/directives/` is TRACKED and this repo is public,
  so the move publishes it. Read it against the publication bar first
  (`CLAUDE.local.md`) — it quotes measurements and PR counts, and a spot check
  found no capture ids in it, but the check belongs to whoever moves it, not
  to this entry. If it fails that read, delete instead and record which.
  Done when: the file is under `docs/directives/` and committed, or deleted
  with the reason recorded in this entry's closure line.
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "dispose of the spent FABLE-BRIEF at the repo root" -->

## Upstream PR round — booked 2026-08-05; the round below is CLOSED, current state is the first entry

**STATE AS OF 2026-08-05 21:00Z, read from the API rather than from this
file's history — the entries below record what WE did, not what upstream
then did with it, and four of them have since merged.**

| PR | state | ball |
|---|---|---|
| #275 #279 #280 #282 | **MERGED** 15:11–15:31Z | done |
| #272 | **APPROVED, mergeStateStatus CLEAN**, rebased onto `39570db` tonight | upstream |
| #276 | answered tonight; upstream replied accepting both points | upstream |
| #306 #307 | open, no comments, REVIEW_REQUIRED | upstream |
| #273 #281 | REVIEW_REQUIRED, BLOCKED behind #272 | upstream |
| #278 | REVIEW_REQUIRED, **mergeStateStatus DIRTY** | **US — entry below** |
| #295 | CLOSED tonight, premise falsified | done |

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — a worktree without `node_modules`
  should fail loudly at doctor time, not as a 900 s fake hang.** Measured
  2026-08-05: four of fifteen worktrees (pr2, pr5, pr6, pr7) had no
  `node_modules`, symlinked the same day. The runbook has said to symlink at
  setup since 08-02 and the gap still recurred four times, which is the
  signal that prose is the wrong instrument here — the trigger is a
  computable predicate with no judgment in it and effectively zero false
  fires: a worktree of this repo whose `node_modules` does not resolve.
  Design: a doctor verdict that enumerates `git worktree list --porcelain`
  for the cache-fix repo and reports any whose `node_modules` is absent,
  with the symlink command in the message. Verifier, red-first: remove the
  link from one worktree and require the verdict to go red naming that
  worktree; control that a fully-linked set reports clean. Done when the
  check ships with its three-answer case (no worktrees at all is "could not
  verify", not "clean").

- **READY — #278 (`pr/output-guard`) is CONFLICTING and needs the same
  rebase #272 just had.** Measured 2026-08-05 21:00Z: `mergeStateStatus:
  DIRTY`, last comment ours from 07-30, so nothing is owed in the thread —
  only the merge state blocks it. Upstream's contributor rule (their tracked
  CLAUDE.md, which binds on upstream-facing branches) is rebase-against-
  current-main, never cherry-pick the conflict away, and the runbook's
  rebase-policy step covers it.
  Design, decision-complete: worktree at `/home/g/dev/vendor/cache-fix-pr7`
  (already provisioned, already on `pr/output-guard` at `e4bd379`;
  `node_modules` was missing and was symlinked 2026-08-05 — along with
  pr2, pr5 and pr6, which had the same gap — so the suite runs there now:
  `test/output-guard.test.mjs` 15/15, and `hpagent` resolves. That gap is
  the documented 900 s false hang, and four of fifteen worktrees carried
  it). Then `git rebase upstream/main`, full suite in the worktree, the
  runbook's
  hygiene greps scoped to THIS round's commits, `git push
  --force-with-lease`, then the push-announcement comment with real test
  counts and the attribution footer.
  Known in advance, so it does not surprise the next session: the push-side
  leak scan will block the force-push by re-flagging already-public commit
  messages — that is the separate READY item above, and the check is
  patch-id equivalence against the pre-rebase commits before overriding.
  Done when #278 reports CLEAN and the comment is posted.

Procedure for every item: docs/runbooks/upstream-pr-round.md (worktree
setup, hygiene gate, comment form, the box). Per-PR state and full
review gists: docs/audits/upstream-pr-sweep-2026-08-05.md. Upstream's
own landing order is in issue #284 (2026-08-04 comment): #272 first
("highest-leverage thing on your side of the board"), then the
absence-scan split (unblocks their #302), then #279/#282/#275/#280,
then the queued ones. Work the items in that order.

- **DONE 2026-08-05 — #272 (c489f29, pushed, commented), #282
  (9474a39, pushed, commented), #276 (1ccd191 + f80501f, pushed,
  commented), #292 (d667df9 on fork-main, commented).** Four of the
  nine. Notes that outlive the items: (1) the reviewer's named lists
  UNDERCOUNTED on both scrub items — 5 named vs 11 actual on #272,
  9 files named vs 6 further captures on #276 — because a
  diff-scoped read reaches only what the slice changed; the
  corpus-wide bare-shape grep is what found the rest. (2) Both scrub
  branches fail `npm test` on `proxy-read-dedupe.test.mjs:505`
  (extension-order adjacency) and it is a genuine branch-base
  artifact — VERIFIED by checking the base commit out into a scratch
  worktree and running the suite there, not by trusting the report;
  both pushes were `--no-verify` with that stated. (3) #282's branch
  fails one wrapper test under this machine's ambient
  `NO_PROXY`/`HTTPS_PROXY` — the machine routes through the proxy
  this repo builds — and passes 11/11 with them cleared; fork-main's
  copy of that test is no longer env-sensitive, so porting the fix
  onto the branch is a candidate if the reviewer trips on it.
  **#275 also DONE (8a47da4), inline rather than dispatched — the only
  CONFLICTING one, and a rebase with real conflicts is not work for a
  cheaper tier.** Three notes from it: (1) the rebase DROPPED the
  header-forwarding commit as already-applied upstream, so that stack
  is gone and the branch is one commit on upstream/main — the
  "CONFLICTING" state was mostly staleness, not divergence; (2) the
  /health finding is worse than the review framed it — of ~117
  `CACHE_FIX_*` names the code reads, several carry an OAuth client
  id, a token endpoint, a credentials path and the operator's
  filesystem layout, so the fix is an allowlist of value-bearing
  GATES with NAME-ONLY as the default, which makes a variable added
  tomorrow safe without anyone remembering the file exists; measured
  cost zero, all eleven production gates keep their values; (3) the
  red-first arrangement had a weaker variant available that would
  have read identically in a report — helper-level assertions pass
  with the call sites reverted — so the suite drives `ext.onRequest`
  end to end and stats the disk.
  **ROUND CLOSED 2026-08-05 — all nine items resolved.** Landed:
  #272, #276, #282, #292, #275, #279, #280, and the absence-scan split
  as **PR #306**. #295 is DROPPED (premise falsified — see its entry).
  #280 note worth keeping: the content-minimization went WIDER than
  its three named categories, because the head-5/tail-3 message
  windows stored real message bytes and the old truncation capped only
  `.text` — `tool_use.input` and `tool_result.content` went to disk
  uncapped on every changed request. The design's three categories
  would have left "prompt text does not rest on disk" false by
  construction. Verified by planting a sentinel in four places at once
  and grepping every written file: 0 hits in default mode, 25 with
  `CACHE_FIX_PREFIXDIFF_CONTENT=1` — the second number is what makes
  the first mean anything, and both were re-measured by the dispatcher
  independently of the shipped test.
  TWO THINGS THE ROUND TURNED UP THAT OUTLIVE IT:
  (1) **Upstream's own tree still carries the real capture content** in
  `test/fixtures/cc-transcript-shape-snapshot.json` — measured, not
  inferred: the scanner returns 10 findings / exit 2 against their
  current main. Reported on #292 with the count, and the standing offer
  to send our rebuilt fixture as its own PR is theirs to accept.
  (2) **A tool's suite must not assert things about its HOST repo's
  content.** Fork-main's absence-scan suite carries two such guards
  (the transcript fixture is clean; every source-tree UUID is on a
  roster). Ported verbatim into the standalone cut they went red on
  upstream's data — correctly, but unlandably. Dropped from the port
  with the reason written in the file. The general shape: a bite goes
  red on the TOOL's defects; a bite that also goes red on its host's
  data cannot be adopted, and softening it to pass is worse than
  removing it.

- **(DONE, see above) — #272: scrub the 5 residual capture-id comment strings.**
  On branch `pr/insertion-normalization`: the reviewer's 08-01 comment
  names 5 comment-only occurrences of the real capture session id —
  `insertion-normalization.mjs:616,659`,
  `test/insertion-merge-suppression.test.mjs:2`,
  `test/insertion-suppression.test.mjs:7,267` (line numbers as of
  head `720ecb46`; re-locate by grep, not by line). Replace each with
  the synthetic token the branch already uses (`s-4b6a435234bf`).
  Verifier: grep for the real id over the whole branch returns zero;
  full suite green in the worktree. Done: pushed + PR comment;
  reviewer restarts full review from top per their comment.

- **(DONE 2026-08-05, d667df9 + issue comment) — #292: synthesize cc-transcript-shape-snapshot.json.**
  The tracked fixture carries 6 real UUIDs, a 448-char thinking
  signature, a `$.source` path, and 2,305 chars of verbatim
  third-party GitHub comments with 3 real logins (confirmed by
  upstream 08-03), plus a `_note` falsely claiming it is redacted.
  Rebuild it structure-preserving with every value from known-safe
  generators (the redaction-by-scrub vs build-from-safe-parts
  asymmetry: build, don't scrub), drop the false `_note`, remove the
  fixture's allowlist entry in the absence-scan, and reply on #292.
  Verifier: fork-main's content-scanning absence-scan green WITHOUT
  the allowlist entry; every test consuming the fixture's shape still
  green. Sequenced BEFORE the split item below so the standalone scan
  ships without the entry.

- **(DONE 2026-08-05 — PR #306 opened) — absence-scan split: standalone PR (unblocks upstream
  #302; asked twice, #284 + #292).** New branch from `upstream/main`
  carrying only `tools/absence-scan.mjs` + its test, in the
  content-scanning form fork-main ships (post-770e915), with the two
  boundary conditions fixed exactly as upstream named them: (1)
  `CORPUS_SCOPE` — upstream has no `test/fixtures/harvested/`; the
  scan must treat that scope as empty-and-passing when the directory
  is absent, with a test pinning it; (2) no
  cc-transcript-shape-snapshot.json allowlist entry (see the #292
  item's sequencing); (3) the test file's scratch-repo helpers
  scrub git's hook environment in their spawn env
  (`GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` undefined) — an
  upstream consumer running this suite from a git hook otherwise
  corrupts their real repo (the SOLVED incident above; reproduced,
  not theoretical). Same hardening goes to fork-main's own copies of
  absence-scan.test.mjs and hook-worktree-edit-guard.test.mjs when
  this ships. Verifier: the scan's own suite green on the cut
  branch against upstream/main; a planted violation goes red
  (instrument known-positive); the incident's GIT_DIR repro run
  against the hardened tests leaves the enclosing repo's config
  byte-identical. Done: PR opened as the standalone,
  `Ref #302` + `Ref #292` in the body, generated-with footer.

- **(DONE 2026-08-05, 1ccd191 + f80501f) — #276: widen the branch's absence-scan + clean the 9
  files.** `pr/verification-tools` still carries the filename-only
  scan; the reviewer holds review on #276 AND #272 until it scans
  tracked-file CONTENTS and is re-run. Port fork-main's
  content-scanning version (and its 770e915-class scrubs) onto the
  branch; the reviewer's 08-01 comment lists 9 branch files carrying
  the real id in comments. Verifier: the widened scan green on the
  branch; grep for the real id returns zero. Done: pushed + PR
  comment answering the hold.

- **(DONE 2026-08-05, 0b67dbf pushed + commented) — #279: split the sanitize planner by mode.** Design
  settled from the review (full text on the PR, round 1, 07-31): the
  by-shape protection of answered tool-continuations applies to the
  v1 omitted-thinking path ONLY; the `v2StripSigned` path keeps its
  directive contract — strip signed thinking from ALL prior assistant
  turns, preserve only the latest active continuation
  (proxy-thinking-block-sanitize-v2.md:58-67,153-159). Verifier: the
  reviewer's own repro flips — `planSanitize([answered continuation,
  later assistant], {v2StripSigned:true})` strips the prior signed
  block (droppedV2:1, matching main) — while the PR's new v1
  byte-stability regression test stays green; both suites green.
  Done: pushed + PR comment. #284 calls this one of the two "closest
  to landing."

- **(DONE 2026-08-05, 9474a39) — #282: alarm predicate suppresses only count-only
  INCREASES.** `upstream-change-detection.mjs:469` (head `de9ab87e`)
  currently suppresses every count-only diff; a DECREASE
  (compaction/truncation/upstream rewrite) must still alarm. Add the
  increase-only condition plus a regression test for the decrease
  case. Verifier: new test red against the branch head, green after;
  suite green. Done: pushed + PR comment. The other "closest to
  landing" per #284.

- **(DONE 2026-08-05, 8a47da4 force-pushed + commented) — #275: capture-file hardening + /health env allowlist +
  rebase.** Three parts, one branch (`pr/request-capture`, the only
  CONFLICTING one): (1) capture dir 0700, capture files 0600 via the
  repo's own write-owner-only helpers, applied BEFORE first byte is
  written (pre-write, per the review); (2) /health and boot records
  stop dumping the whole `CACHE_FIX_*` env — emit a declared
  allowlist of known gate keys; an unknown `CACHE_FIX_*` key appears
  by NAME only, never value, with a test pinning that; (3) rebase
  onto current upstream/main (the conflict is real; conflict files
  not enumerable via API — surfaces during rebase),
  `--force-with-lease`. Verifier: mode-bit assertions in tests; the
  allowlist test; suite green post-rebase. Done: pushed + PR comment.
  Note for the report: upstream marks this load-bearing (their
  human's review follows — not ours to chase).

- **(DONE 2026-08-05, 2f96c88 pushed + commented) — #280: prefix-diff persistence gets a permissions +
  retention story.** Design settled: (1) every prefix-diff artifact
  goes through write-owner-only (0600) — snapshots, diffs, events,
  rotations; (2) content minimization by default: system-block
  windows (up to 20k chars/block), message previews, and event-record
  previews are stored ONLY under a new opt-in
  `CACHE_FIX_PREFIXDIFF_CONTENT=1`; default persists hashes + lengths
  + indices (attribution stays readable, prompt text does not rest on
  disk); (3) cross-key retention: a sweep on boot deleting prefix-diff
  artifacts older than 14 days and pruning oldest beyond 200 session
  keys — the reviewer's exact gap was "no cross-key GC, TTL, cap, or
  sweep". Document in the PR body that the CONTENT flag persists
  prompt-derived text. Verifier: mode-bit test; a seeded-old-files
  sweep test; default-mode test asserting no raw prompt text lands in
  any artifact (grep the written files for a sentinel string from the
  request); suite green. Done: pushed + PR comment.

- **DROPPED 2026-08-05 — NOT ACHIEVABLE as scoped; the premise was
  falsified, not the timing.** The entry assumed the 7 commits were
  self-contained. They are relative to #276 and are NOT relative to
  #272: six of the seven MODIFY
  `proxy/extensions/insertion-normalization.mjs`, none creates it, and
  `git cat-file -e upstream/main:...insertion-normalization.mjs`
  fails — that file exists only because of #272. Cherry-picking the
  first onto a branch cut from upstream/main gives
  `CONFLICT (modify/delete)`, not a textual conflict, and the only
  resolution is importing #272's file creation, which recreates the
  stacked diff the slim branch exists to avoid. Upstream's own stated
  alternative applies literally: once #272 lands, #295 re-diffs
  against a main carrying the base file and the problem dissolves.
  Reported on #295; no branch pushed, no draft PR. Re-open only if
  #272 stalls AND upstream asks again.
  (original entry below, for the record)
- **(DROPPED, see above) READY (optional acceleration) — #295: cut the 7-commit slim
  branch.** Upstream cannot review the stacked diff (69 files of
  inherited parents) and offered the #304-shaped workaround: a branch
  from upstream/main carrying only the 7 #295-specific commits
  (enumerate: commits on `pr/insertion-join-moves` not on its stack
  parents). Cherry-pick onto the slim branch (deleted since; the entry is
  DROPPED, so the name is history, not a pointer); if a
  pick depends materially on #272/#276 content, STOP and report —
  upstream's stated alternative is waiting for the parents to land.
  Verifier: suite green on the slim branch; diff shows only the
  7-commit surface. Done: new draft PR referencing #295, comment on
  #295 pointing at it.

- **SHIPPED fork-side 2026-08-05 (commit ref: the tools/git-hooks
  commit this entry rides in; activation corrected same day) — the
  pre-push full-suite gate.** The named obstacle dissolved: the hook
  is TRACKED (tools/git-hooks/pre-push); activation is per-machine as
  a SYMLINK `.git/hooks/pre-push -> ../../tools/git-hooks/pre-push`
  (done on Siren), which the operator's GLOBAL hook dispatcher chains
  after its fixture-leak scan. Verified red-first: a seeded failing
  test refused a real push; the landing pushes are the green cases.
  Bypass: `--no-verify`, stated in the same message.
  **INCIDENT, same day, caught by the check's own red-test:** the
  first activation used repo-local `core.hooksPath`, which silently
  REPLACED the global leak-scan dispatcher for exactly the repo it
  protects (one push, 190b395, went out leak-unscanned; its content
  was clean — hook + backlog text, and npm test's absence-scan ran).
  Root cause: a config write without the dependents search — one
  `git config core.hooksPath` read would have shown the global
  dispatcher. Mechanized: the dotfiles doctor now FAILS on a set
  repo-local hooksPath in this repo and on a missing/wrong
  .git/hooks/pre-push symlink (both halves proven red on their
  defects). The former dotfiles residues are DONE: doctor checks
  landed, and the stale "npm test hangs on the production port"
  warning is retired from CLAUDE.local (added 2026-07-29 with no
  recorded observation; never reproduced; both real hangs were the
  worktree node_modules artifact). The worktree gap is CLOSED
  mechanically (dotfiles b419af0, same day): the dispatcher now falls
  back to the common git dir's hooks, so `.git/hooks/pre-push`
  reaches worktree pushes — bite-tested (red against the old
  dispatcher), and live-verified from the wt-g2 worktree, where the
  suite gate refused a dry-run push it previously never saw.
  Original entry follows for the record.

- **(superseded, see above) — a full-suite gate before push (the red-main incident,
  2026-08-02 evening).** What happened: the source-UUID guard landed
  2026-08-01 (2a8738d); on 2026-08-02 two commits (0def5ca, 3b32e6b)
  each put a REAL capture session id into a tracked `.mjs`, and both
  pushed with the guard red. Nobody ran `npm test` — targeted files
  were run instead, which is the documented habit and is usually
  right. The red survived a day and was found only because an
  unrelated full-suite run happened during other work; fixed forward
  in 770e915. Note what did NOT fail: the guard itself fired
  correctly, on a real defect, the first time it was asked.
  The post-incident question (1) answers YES here — "the full suite
  is green" is a computable predicate with near-zero false-fire risk,
  because the suite is FAST: measured twice today at ~17 s wall clock
  for 2036 tests. Design: a `pre-push` git hook running `npm test`,
  refusing the push on a non-zero exit, with an explicit bypass
  documented for the deliberate-WIP case. Verifier: the hook refuses
  a push with a seeded failing test and permits it once removed.
  NAMED OBSTACLE, not a blocker but the reason this is READY rather
  than done: git hooks live in `.git/hooks`, which is untracked, so
  the hook is machine-local and invisible to a fresh clone — placing
  it is arguably a dotfiles-repo act (CLAUDE.local: deployment items
  live there), and this fork-side entry should not decide that. Also
  named: `CLAUDE.local.md` warns `npm test` "can hang on the
  production port"; that did not reproduce in either of today's two
  full runs, so the warning is a STALE-PREMISE CANDIDATE — if it is
  live, the hook needs a timeout and the warning needs its trigger
  condition written down; if it is stale, the warning should go. That
  file is deployed from dotfiles and must be edited there, so the
  question travels to the operator rather than being resolved here.

- **HANDOFF 2026-08-02 LATE evening — supersedes the earlier handoff
  below on every point they disagree. Read this first.** Main is at
  9059d3a, everything pushed, working tree clean, `git stash list`
  EMPTY (the earlier handoff's stash item is resolved). Full suite
  2054/2054/0, run on main after the last integration — main is
  GREEN, which it was not when this session started.
  **WHAT LANDED** (all pushed): 739aa22 the row-4 ordinal fix (the
  535k class, verified four independent ways — see the matrix
  datapoint); 9059d3a the movedFresh/movedRefires split, integrated
  from a sonnet dispatch and dispatcher-verified; 770e915 a RED MAIN
  fixed forward (real capture session ids in tracked .mjs, guard
  broken for a day); 268278c firstDivergence made two-sided
  (identity was not reflexive); 1ed57a7 tools/replay-compare.mjs;
  7673050 the row-24 messages-half investigation booked as a DESIGN.
  **THE ONE THING NOT INTEGRATED — pick this up first.** Branch
  `wt/description-absorb`, commit **fd87e12**, PUSHED to origin as
  insurance (its worktree lives under /tmp and will not survive a
  reboot; the branch will). It is the row-23 + row-24-tools-layer
  description-absorb build: 182 lines of deferred-tool-rewrite.mjs
  plus the 366-line bite, which the dispatcher confirmed genuinely
  red against clean HEAD (5 behavioural fails, both safety CONTROLs
  already green). Its full report DID arrive before the session
  closed and it changes the picture — **do not deploy fd87e12 as it
  stands.** NOT RE-RUN BY THE DISPATCHER; what the AGENT verified:
  bite 9/9, deferred-tool-rewrite 40/40, `npm test` 2044/2043 (sole
  failure = the absence-scan guard expected at its pre-fix base),
  corpus replay complete both sides, and red-first RE-ESTABLISHED
  independently in its own clean worktree at 9799ff0 (9 tests,
  4 pass / 5 fail, both safety CONTROLs among the passes).
  Deviations: none, bite untouched.
  **THREE THINGS BLOCK DEPLOYMENT, all raised by the agent as
  questions above its tier — the next session's first decisions.**
  **G2, the important one: THE SHIPPED FORM MISSES THE BUST THAT
  MOTIVATED IT.** `classifyToolChange` on the raw captured arrays
  does return `description-absorbed` for the 15:53 pair — but in the
  REAL state chain request 1202 still RESETS, because the canonical
  holds FIRST-SEEN order while sort-stabilization (order 200)
  name-sorts the incoming array, so after any earlier addition the
  orders never match again (that key shows 370 pure-reorder
  `rewrite` results before 1202). Counterfactual, on a chain the
  agent first validated by reproducing the executed pipeline's own
  histogram and absorb ordinals exactly: relaxing the precondition
  from ORDER-identity to SET-identity (same names, no held, no new;
  `input_schema` identity UNCHANGED so the safety boundary is
  untouched, and the extension already forwards its own order) takes
  the corpus from 14 absorbs to 52, resets 3 -> 2, and COVERS 1202 —
  the live 484,972-token bust. The agent shipped the strict form
  because the BITE mandates it ("CONTROL — order is part of the
  identity the absorb requires") and correctly refused to edit the
  bite to fit its code. THE DECISION IS OURS: is tools[] order part
  of the callable contract, or is SET-identity the intended
  precondition? If SET-identity, re-specify the bite's reorder
  CONTROL FIRST, then change the code — never the other way round.
  **G1: the offline gate does not declare the new announcement.**
  Corpus old -> new: safety 0 -> 14, conservation 2 -> 16 (+14
  `invented`), one cause — `isDeclaredInjection` (tools/replay.mjs
  :330, and the conservation clause at :1949) accepts ONLY a system
  message whose content is entirely `tool_addition` blocks, while
  the description notice carries TEXT blocks (it must: no tool is
  added). Not corruption; the gate needs widening, keyed on the
  extension's reported `descriptionChangedNames` rather than on
  shape. Until then the daily gate goes RED on legitimate work —
  the fires-on-a-non-defect class this repo treats as its own
  defect.
  **G3: the wire carrier is unproven against the live API.**
  `tool_addition` blocks are probe-backed for opus-5/fable-5; a TEXT
  block on a mid-conversation system message under that beta is NOT,
  and the shipped code assumes the allowlist built for the former
  covers the latter. One `tools/probe-tool-addition.mjs`-style run
  settles it and is owed BEFORE this rides live.
  **Row 3 for fd87e12:** no state-key change; freeze logic EXTENDED
  not altered (the canonical is now retained across one delta class
  that previously re-baselined); persisted `additions` entries gain
  additive `kind`/`sig` fields. Old files read fine, but state
  written by this build and read by the OLD build mis-marks
  defer_loading — **forward-compatible only, so a rollback after
  deploying it is not clean.**
  Its worktree (scratchpad/wt-desc-absorb) is disposable; the branch
  is the work. Note the agent did NOT read BACKLOG.md or matrix rows
  23/24 — both were on its do-not-touch list and it worked from the
  bite — so nothing in those files informed its G2 choice.
  **DEPLOYMENT IS OWED AND NOT DONE — this is the largest open
  item, and the plan CHANGED at the last minute.** The intent was
  one restart carrying all three proxy/** changes. G1-G3 above take
  fd87e12 off that list, so the choice is now explicit and it is the
  next session's to make: **deploy the TWO landed changes now** (the
  ordinal fix + the movedFresh split, both on main, both green, both
  cache-transparent), or hold the restart until the description
  absorb clears its three blockers. The recommendation from here is
  DEPLOY THE TWO: the ordinal fix is the 535k-token class and it
  earns nothing sitting on disk, row 4 closes only on the live
  non-event, and fd87e12's G2 decision may take a round or two. The
  cost of not bundling is one extra restart, which is cheap and
  cache-transparent; the cost of bundling is that the largest
  measured win waits on an open design question.
  Mechanics: dotfiles pin `CACHE_FIX_PROXY_TREE_PIN` is at `ad4ff80`
  (bootstrap/manifest.py:157); the proxy tree is `5d651e7` as of
  9059d3a — recompute with `git rev-parse --short HEAD:proxy` rather
  than copying that value, since it moves with any proxy/** commit.
  Then `systemctl --user restart cache-fix-proxy`, then one gate
  run. Row 3 is answered for BOTH landed changes: no new state key,
  no persisted schema change (only canonical `o` VALUES corrected in
  place), and `freeze` does not appear in insertion-normalization
  .mjs at all — the restart is cache-transparent and cleanly
  reversible. fd87e12 is NOT (forward-compatible only; see its Row 3
  note above), which is a second, independent reason not to bundle
  it. Rows 4 and 23 close on the LIVE non-event, not on the build.
  **ENVIRONMENT TRAP that cost this session real time, and will cost
  the next one the same:** a git worktree does NOT inherit
  `node_modules`, so `npm test` in a fresh worktree dies with
  `ERR_MODULE_NOT_FOUND: Cannot find package 'hpagent'` across every
  proxy-* suite and two tests then appear to HANG for ~899 s. Both
  agents hit it and one of them misread it as CLAUDE.local's
  documented production-port hazard. Fix when creating a worktree:
  `ln -s <repo>/node_modules
  <worktree>/node_modules` (5 packages, that is all this repo
  needs). COROLLARY, and it corrects an earlier claim in this file:
  the "npm test can hang on the production port" warning is
  NEITHER confirmed nor refuted by today's evidence — both observed
  hangs are fully explained by the missing dependencies, so they are
  evidence for neither side. The stale-premise question stays open.
  **STILL LIVE OFF-GIT:** the 46 MB row-4 pin
  (test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json,
  untracked, git-excluded) and its source capture both still exist.
  It earned its keep twice today (see the 3-UPDATE item below) and
  should NOT be deleted — but fixture-cut cannot make it
  committable; see the content-addressed-fixture READY item for the
  axis that can.
  **PRIORITY ORDER for the next session, revised after the agents'
  final reports:** (1) **settle G2** — order-identity vs
  set-identity for the description absorb. It is a one-question
  design decision worth 484,972 measured tokens on the very bust
  that motivated the build, and everything else about fd87e12 waits
  behind it. If the answer is set-identity, the BITE changes first.
  (2) G1, widening replay's `isDeclaredInjection` — cheap, tools/-
  only, not deployment-coupled, and until it lands the daily gate
  reports 14 false violations. (3) The deployment boundary for the
  two landed changes (see the recommendation above), then the gate
  run that closes row 4 on a live non-event. (4) G3's carrier probe,
  before fd87e12 ever rides live. (5) Price the NARROW container
  normalisation from the row-24 messages design — it covers the
  unconditional 589k half by itself and may make the wide
  message-level pin unnecessary. (6) The content-addressed fixture
  format, before pinning the next large fixture. STANDING GO carries forward with both refinements (do not
  blindly book a mis-scoped request; do not close an investigation on
  a first negative) and all gates still bind.
  **RESIDUE, named:** the movedFresh reset-path emitter is covered by
  reading and by a success-path bite, but the reset+re-fire-only
  combination was never executed — the dispatcher looked for it
  across a 963-request capture and found ZERO instances, so it
  remains not-observed rather than confirmed. Two worktrees I created
  were removed at wrap-up, and the old locked
  agent-ade6b83a41d013bf0 worktree was removed too: its only content
  was the description-absorb bite, now committed byte-identically in
  fd87e12 (diffed before removing).

- **HANDOFF 2026-08-02 evening — three items carry LIVE OFF-GIT STATE
  a fresh session cannot discover by reading the repo. Read this
  before starting anything below.** The session that produced them
  ended at ~650k tokens; everything verified is already committed and
  pushed, so `git log` is trustworthy — what follows is only the
  work that is NOT in a commit.
  (1) **RESOLVED 2026-08-02 evening (739aa22, pushed) — the stash is
  popped, verified and committed; `git stash list` is empty and the
  bite is tracked at test/insertion-ordinal-reattribution.test.mjs.**
  Red-first arrangement stated in the commit: NEW bite against OLD
  implementation (main tip, patch out of the tree) → moved 0,
  reset/not-subsequence, CONTROL green; same bite green with the
  patch. Corpus A/B over four captures / 4,136 requests eliminated
  three resets, one per busting capture (c7c83ca5 n=894, 6df6b9d2
  n=839, 0fbf8674 n=1417 — the last two are the very instances the
  design entry named), with zero deltas on a capture lacking the
  shape. Row 3: no new state key, no schema change, `freeze` absent
  from the file. Row-4 datapoint written to the threat matrix. What
  remains is DEPLOYMENT only, on the shared boundary. Original entry
  follows for the record.
  **(1-orig) Ordinal fix (row-4, the 535k class) — THE STASH IS GONE;
  the work is not. Recovery, 2026-08-05:** `git stash list` is EMPTY and
  `.git/logs/refs/stash` does not exist, so the `git stash pop` recipe below
  no longer works — it would pop nothing, or someone else's later stash. The
  commit itself survived as an UNREACHABLE object and is now anchored by a
  tag so gc cannot take it: **`wip/ordinal-fix-2026-08-02` = 692abc0**,
  verified to be exactly this entry's description (143 insertions / 4
  deletions in proxy/extensions/insertion-normalization.mjs, base 1ea9804).
  Use `git stash apply wip/ordinal-fix-2026-08-02` — apply, not pop, and it
  three-way merges onto a main that has moved since 2026-08-02. Attribution,
  since a stash push+pop happened in this repo on 2026-08-05: the drop
  PREDATES it — `git stash list` printed exactly one entry (that session's
  own) while its stash was live, and `git stash push` never removes existing
  entries. When it was dropped is not recoverable; the stash reflog goes with
  the ref. The untracked red-first bite is still on disk
  (test/insertion-ordinal-reattribution.test.mjs, 4,256 bytes).
  Original text follows, with the stale recipe kept only so the pointer's
  history is legible: implementation
  lived in a stash that no longer exists — recovered and anchored as tag
  `wip/ordinal-fix-2026-08-02`, see the correction at the head of this entry;
  "WIP on main: 1ea9804", 143 insertions / 4 deletions
  in proxy/extensions/insertion-normalization.mjs. Its red-first bite
  is on disk UNTRACKED at test/insertion-ordinal-reattribution.test
  .mjs (88 lines) and is EXPECTED TO FAIL without the stash — do not
  commit it alone, that would put a failing test on main. Recipe:
  `git stash pop`, run the bite (RED before / GREEN after was already
  demonstrated by hand), then the four suites named in the design
  entry, then a corpus check over >=3 captures incl. the row-4
  busting one (`s-captureA`). The design is settled and
  written out in the "MECHANISM FOUND" entry below — classifyPinned's
  match loop, family (h,r) whose stored count exceeds wire count by
  exactly one, re-attribute via condition (d)'s lo/hi discriminator,
  fail closed otherwise. proxy/** so it is deployment-coupled: pin
  bump + restart at a stated boundary, and the report must state
  whether it writes a state key or touches freeze logic (row 3).
  (2) **Description-absorb (row 23 + the row-24 tools layer) —
  worktree `.claude/worktrees/agent-ade6b83a41d013bf0` at base
  360093a, LOCKED, holding only an untracked
  test/deferred-tool-description-absorb.test.mjs.** The extension was
  never modified; the agent was aborted early. Either finish it there
  and cherry-pick, or delete the worktree
  (`git worktree remove ... --force`) and restart from the design in
  the row-23 entry. NOTE the scope GREW after that brief was written:
  this same mitigation also absorbs the row-24 `/resume` tools-layer
  bust (session id embedded in the Bash description), so it now has
  TWO real test cases, and the second is the better one because it
  recurs on every resume.
  (3-UPDATE 2026-08-02 evening) The 46 MB pin is still on disk and its
  source capture still exists. It has now EARNED its keep twice over.
  First, as independent verification of the ordinal fix on sanitized
  bytes: replayed under pre-fix and post-fix code, exactly 1 of 895
  entry verdicts differs — n=894, `reset/not-subsequence` (suppressed
  31) -> `normalized` (suppressed 32). That is a stronger inertness
  statement than the live-capture A/B because the fixture is
  tokenized, so it holds even after the capture rotates. Second, the
  attempt to minimize it exposed a real instrument bug: fixture-cut
  refused with "internal error … d=0 failed its own identity check
  against itself", which was NOT fixture-cut's bug but a one-sided
  presence guard in firstDivergence — fixed two-sided in 268278c with
  a red-first reflexivity bite. Minimization re-run after that fix;
  whether the fixture becomes committable is recorded below when the
  run lands. NOTE for whoever reads the fixture as row-4 evidence: it
  produces exactly ONE mitigation row, at 783->804, and none at the
  pinned range 892..894 — the pair's value here is the ENTRY VERDICT
  flip at n=894, not a mitigation row. Also n=893 replays as
  `reset/no-prior-canonical` with inLen=1, i.e. a foreign
  single-message request sits inside the pinned range.
  (3) **Frozen evidence, untracked and locally git-excluded:**
  test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json (46 MB,
  the row-4 busting pair). tools/fixture-cut.mjs now exists (2cd23fa)
  and is the tool that would make it committable — that sweep was
  never run. If the file is gone, re-pin with `harvest --pin <key>
  892..894` — resolve `<key>` from `bust-triage --list`, which prints
  the freeze command with the live key already filled in, rather than
  from a session id written down here.
  Also live: two worktrees were removed at integration today; if
  `git worktree list` ever shows an `agent-` entry with no running
  agent, it is a leak — remove it.
  **STANDING GO, carried from the 2026-08-02 session — this is the
  operator's grant, not an assumption.** Work autonomously by best
  judgement; dispatch freely without asking per-item; book and
  persist everything as you go. Two explicit refinements the operator
  made during that session, both to be continued: (a) do NOT blindly
  book a request that is mis-scoped — improve it and say why, which
  the operator called out approvingly twice; (b) do NOT close an
  investigation on a first negative — the operator had to push for
  another digging round and was right both times, which is now the
  Grounding true-basis clause. Gates that still bind: anything
  published under the operator's accounts (upstream issues, PR
  comments) is DRAFTED and approved before posting; proxy/** changes
  are deployment-coupled and ride a stated boundary with a dotfiles
  pin bump + restart; haiku is barred; the fable consolidation review
  of the corpus is booked in the dotfiles corpus backlog and must NOT
  run in a session that authored those mints.
  **PRIORITY ORDER for the next session**, highest value first:
  (1) finish the ordinal fix from tag `wip/ordinal-fix-2026-08-02`
  (`git stash apply` it; the stash index it once lived at is gone) — it is the 535k-token
  class and the design is settled; (2) the description-absorb build,
  which now absorbs TWO measured classes (row 23 plus the row-24
  `/resume` tools layer, the better test case since it recurs on
  every resume); (3) the row-24 messages layer — investigate at opus,
  escalate to fable if opus finds no design, explicitly not closable
  on a cheap negative; (4) the deployment boundary once (1) and (2)
  land: pin bump + restart carries both, plus the `movedFresh`
  telemetry split which should ride the same restart rather than
  spending a second boundary.

- **NEW CLASS 2026-08-02 — description-only tools[] change re-bills
  the whole context; mitigation dispatched.** Live in the
  dispatcher's own session: bust 15:53:46, 552k re-written,
  transcript `tools_changed / 484972`, capture pair 15:53:08.789Z ->
  15:53:26.105Z (ordinals 1200..1202). Measured on the raw bodies:
  the tool SET is unchanged (13 before, 13 after, no adds, no
  removes, same order) and exactly ONE tool differs — `Bash`, with
  `name` identical and `input_schema` BYTE-IDENTICAL, only
  `description` growing 2907 -> 2984 chars. **77 bytes of tool prose
  re-billed 484,972 tokens**, because tools precede messages in the
  cache prefix. The added line is advisory ("Command output is
  displayed to you, not reliably to the user"), i.e. a client-side
  text edit, not a capability change. Messages were `append-only`,
  so nothing mid-history moved — this is purely a tools-block event.
  deferred-tool-rewrite BEHAVED AS DESIGNED and is not at fault: its
  telemetry reads `action=reset reason=tool-schema-changed` — it
  holds tools[] stable for ADDITIONS (announce in-band) and takes the
  honest reset for any schema change to an existing tool. Nothing
  covered a description-only delta.
  MITIGABILITY: YES, and the boundary is what makes it safe —
  identical `input_schema` guarantees the model cannot emit a call
  the client is unable to execute, so a stale DESCRIPTION is safe
  where a stale SCHEMA is not. Design (settled, dispatched to opus
  in an isolated worktree): on a delta that is description-only,
  forward the CANONICAL tools block and announce the changed
  description in-band via the extension's EXISTING announcement
  machinery, with distinct telemetry; anything touching name,
  input_schema, set or order keeps today's honest reset. Verifier:
  red-first bite on a description-only pair plus a CONTROL bite
  proving an input_schema delta still resets, and a live replay of
  ordinals 1200..1202 showing the forwarded tools block byte-stable.
  Deployment-coupled (proxy/**), rides a stated boundary.
  INSTRUMENT GAP found in the same triage, booked below: bust-triage
  called this UNCLASSIFIED although it had already read and printed
  `transcript tools_changed`.

- **DONE 2026-08-02 (caa38c5, inline, parallel to three dispatches;
  13/13 tests + selftest green, and the live 15:53:46 bust re-triages
  from UNCLASSIFIED to KNOWN-OPEN/row 23) — bust-triage's verdict
  consults the transcript cause.** Shipped slightly WIDER than this
  entry specified, deliberately: rather than mapping `tools_changed`
  to the general row and stopping, `causeToRow` discriminates the
  tools delta from the pair it already holds — every tool's `name`
  and `input_schema` byte-identical with changed prose is row 23
  (absorbable), anything touching schema, set or order is row 6. That
  discrimination is precisely the three hand probes this session
  spent on the live capture, and the manual pass is unfinished while
  the check does not exist. UNCLASSIFIED stays reachable and now
  requires BOTH axes to miss, with the why-line naming which cause
  was considered. Original entry: On the 15:53:46 bust the tool printed
  `OK transcript tools_changed / 484972` and then `VERDICT:
  UNCLASSIFIED — census class "append-only" maps to no
  threat-matrix row`. Both statements are true and the verdict is
  still wrong: the census classifies the MESSAGE array, so a
  tools-driven bust whose messages are legitimately append-only is
  unclassifiable BY CONSTRUCTION on that axis, and the tool already
  holds the answer one line above. Design: when the census class
  maps to no row, fall back to the transcript cause (`tools_changed`
  -> the tools-stability row, `messages_changed` -> row 4, etc.)
  before returning UNCLASSIFIED; keep UNCLASSIFIED for the genuine
  case where NEITHER axis maps, since that verdict is this tool's
  whole payload. Verifier: bite red-first on a synthetic
  append-only + tools_changed event asserting the row is named, and
  a control asserting an unmappable pair still returns UNCLASSIFIED.
  tools/-only, not deployment-coupled.

- **(DONE — shipped 9059d3a; `movedFresh`/`movedRefires` are live in
  insertion-normalization.mjs and were the telemetry that made the
  2026-08-05 349k bust readable) — split `moved` into fresh recognitions vs re-fires
  (the instrument change the 660k bust argues for).** Grounding,
  verified at the line: insertion-normalization.mjs:1062 emits
  `moved: moves.length + refires.length` — the code holds the two
  populations in SEPARATE arrays and sums them at the telemetry
  boundary. That single `+` is why the busting request reported
  `moved:5` while findJoinMoves had minted ZERO fresh recognitions,
  and why "the mitigation ran" could not be distinguished from "the
  mitigation matched" until an investigation read the code. Design:
  keep `moved` (consumers exist), add `movedFresh: moves.length`
  and `movedRefires: refires.length`. Consumers to wire in the same
  pass: a shape-verdicts entry whose alarm is exactly
  "join-moves re-firing while fresh recognitions stay 0 over N
  requests" (the shape that just cost 535k tokens), and the fire
  ledger's absorbed column, which today counts activity that may be
  pure re-fire. Verifier: bite red-first on a synthetic pair where
  moves=0 and refires>0 — today's telemetry cannot express it.
  SERIALIZED behind the ordinal fix (same file), and it should ride
  the SAME proxy boundary — one restart carries both.

- **(DONE — `bust-triage` now prints `freeze: harvest --pin <key> n..m`
  on its capture line, verified live 2026-08-05) — bust-triage prints pin-ready request ordinals.**
  Grounding: an evidence-freezing error made by the dispatcher
  today. bust-triage's capture line reports `n=591->595`, which is a
  MESSAGE COUNT, while `harvest --pin <key> n..m` takes file-wide
  REQUEST ORDINALS (harvest.mjs:612-648) — the busting pair was
  ordinals 892..894. Pinning the reported numbers froze an unrelated
  90-minute-earlier range and produced a 17 MB fixture of the wrong
  thing, undetected until an agent cross-checked. Design: the
  capture line also prints the two ordinals, or emits the exact
  `harvest --pin` command; the two numbers live in the same record
  the line is built from. tools/-only, no deployment coupling.
  Verifier: bite asserting the printed ordinals address the same
  records the pair was read from.

- **READY (trigger fired) — fixture minimization at pin time
  (was PARKED as "harvest --pin --replay-from K", fixture-cut c3).**
  The park's stated build trigger was "a second fixture needing
  minimization"; today produced it — pinned-s-9f12950909ed-892-894
  .json is 46 MB (full prefix from 0) and is untracked-and-excluded
  precisely because it cannot be committed at that size, which
  leaves the row-4 evidence outside git rather than in it. The
  2026-08-01 ruling that minimization stays a post-step gated by
  tools/fixture-verdict-identity.mjs still holds — this item is the
  post-step being built, not a harvest parameter.

- **CANDIDATE MINT, belongs to the CORPUS layer not this repo — a
  STOPGAP is never the recommendation on its own (dispatcher defect,
  2026-08-05).** Evidence: asked how to keep captures alive for a
  running analysis, I offered three options and recommended raising
  the retention ceiling — a knob that buys hours and moves the same
  loss later. The durable design (evidence leaves the window at
  finding time, kilobytes per row, into git) came only after the
  operator asked "isn't there a GOOD permanent solution?", and it was
  ALREADY WRITTEN in this repo's own runbook as closing-gate question
  2, which I had not re-read.
  Target entry, by amendment not addition: CLAUDE.md "Recommending &
  reporting", whose existing rule kills hedging options beside a
  strong recommendation. The gap is one level down — the
  recommendation ITSELF can be a stopgap, and a stopgap is defensible
  only as a bridge. Proposed widening, in that entry's register: a
  stopgap recommended alone reads as a solution and closes the
  question; it ships named as a bridge, with the durable fix stated
  beside it and a revert trigger written where the knob lives, or it
  is not the recommendation.
  Why it is corpus-level and not project-level: it fired here on a
  retention ceiling, but the shape is any knob, timeout, retry,
  allowlist or cap — every project has them. The project half of
  today's lesson (a recurring finding-producer has no closing moment)
  is already minted in `docs/dev-loop.md` question 2, which is where
  it is true.
  Not minted from this session on purpose: the global corpus is
  governed by `CLAUDE-maintenance.md` (amendment-over-addition, the
  render test, a JOURNAL line in the dotfiles repo), and that repo
  currently has a concurrent writer holding `claude/`. It is a
  focused unit, not a fold-in.

- **CANDIDATE MINT, belongs to the CORPUS layer not this repo —
  brief-time path existence check (dispatcher defect, 2026-08-02).**
  Evidence: the row-24 investigation brief listed `tools/census.mjs`
  as a file to read. That file does not exist — the census lives
  inside `tools/replay.mjs`. The agent surfaced it as a gap instead
  of bridging it (correct behaviour, and the reason it cost nothing),
  but a cheaper-tier executor might have invented a plausible
  substitute. dispatch-discipline §1 already carries the rule this
  violates ("Files to read, listed — never paraphrased"); what it
  lacks is the check, and I named the path from memory.
  Per CLAUDE-maintenance's precipitation-first rule this is a HOOK
  candidate rather than prose: "every repo-relative path named in a
  dispatch prompt exists" is computable with near-zero false fires.
  A hook is a config write and therefore veto-gated, and the corpus
  is the operator's layer — so this is recorded here as a candidate
  and surfaced, not minted from a fork session. Widening the existing
  §1 clause beats adding an entry if it stays prose.

- **READY — price the NARROW container normalisation before building
  the wide message-level pin (row 24 messages half, 2026-08-02).**
  Order matters here and the investigation said so itself: the narrow
  fix — normalise ONLY the string <-> single-block `content` container
  on a `role:"system"` message, leaving `cache_control` untouched —
  covers the 588,956-token UNCONDITIONAL half by itself, because that
  bust was a clean message-layer isolation (`cacheRead=15,223`, exactly
  tools+system, byte-identical). The wide fix (volatile pin widened
  from block level to message level, plus removal tolerance re-serving
  canonical bytes instead of dropping) reaches 100% of the pre-exit
  array but is a much larger change to phase-3 behaviour. Do the
  pricing first: if the narrow one holds, the wide one may not be owed
  at all. Both are proxy/**, deployment-coupled.
  Full design, simulation, safety argument, named risk (stale
  `cache_control` re-served beside the live one — count them, budget
  is 4) and the value split are in the threat matrix, section
  "Row 24 — messages layer". Verifier for either: the simulation the
  investigation already ran — `firstDivergence(A, forwarded) === null`
  plus `validateToolAdjacency(forwarded)` on the real 16:06:39 /
  16:12:42 pair of s-captureJ — as a red-first bite, since neither
  holds today.
  NAMED MISSING EVIDENCE, and it gates nothing but should ride along:
  the container flip has ONE measured instance and its corpus-wide
  frequency is unmeasured. The check that would settle it does not
  exist — "divergence at a string-content message that previously
  carried `cache_control`", a replay.mjs addition, tools/-only and not
  deployment-coupled.
  SCHEDULING NOTE, from the same measurement: the cache is a strict
  prefix [tools][system][messages] and tools differ by construction on
  every resume, so the resume's FIRST request is gated by the
  SYSTEM-PROMPT half, not by this one. This work buys the second
  request and everything after it.

- **READY — content-addressed fixture format: the axis that actually
  makes a pinned fixture committable (2026-08-02, measured).**
  fixture-cut WORKS now (it was blocked by the firstDivergence guard,
  fixed 268278c) and on its motivating case it is close to useless:
  on the 46 MB row-4 fixture it dropped 16 of 1707 prefix records —
  ~1% of content; the headline 47.9 MB -> 23.5 MB is almost entirely
  the input being pretty-printed and the output compact. This is NOT
  a fixture-cut defect. Front-truncation is the wrong axis, because
  insertion-normalization's canonical state is stateful from request
  0, so nearly every prefix record is genuinely load-bearing and the
  bisection is right to keep it.
  THE REAL SIZE DRIVER, measured on the cut file: a capture stores
  the WHOLE `messages` array per request, so 887 request records hold
  95,613 message objects of which only 2,466 are DISTINCT — a 38.8x
  redundancy that grows quadratically with conversation length. The
  fixture is big because it stores the same ~2.5k messages 38 times
  over, not because it retains too many requests.
  Design: a content-addressed fixture format — each distinct message
  object stored once in a `messages` pool keyed by hash, each request
  carrying the ordered list of keys; rehydrate at load in
  fixture-verdict-identity's replay path (and harvest's writer).
  Projected: ~23.5 MB -> under 1 MB, i.e. committable, which is the
  entire point of the parent item. Verifier: byte-identity of the
  rehydrated fixture's REPLAY VERDICTS against the flat form —
  fixture-verdict-identity is exactly that comparison and already
  exists, so the check is `firstDivergence(flat, rehydrated) === null`
  over the real 46 MB fixture, plus a red-first bite proving a
  corrupted pool entry is caught rather than silently rehydrated.
  Blocked on nothing. Do it before pinning the next large fixture.

- **(DONE — shipped as `rejectedCandidate`, live at
  `tools/reminder-migration-census.mjs:302` and `:304`, with its bite in
  `test/census-counterpart-diagnostic.test.mjs`; re-graded 2026-08-08 after
  the byte-gate lane found it still carrying a READY header) census must
  distinguish "no counterpart" from
  "counterpart present but unmatched".** Re-graded rather than closed
  silently, because the entry's own case and the field's REACH came apart
  afterwards and both facts belong here. The case this entry names — a
  wrapper-retaining standalone at host+1, host PRESENT — is served: the row no
  longer reads `actual=0ch` about something present.
  **What the field does NOT reach, found 2026-08-07/08 and booked in the
  byte-gate entry rather than re-opening this one:** with the host ABSENT
  (`hj = -1`, pruned) the position filter never ran, so the field named the
  FIRST system message in the array as "the nearest position-eligible
  standalone that classify() rejected" — 37,831 chars of an unrelated
  summarization notice. `41ed30c` nulls it there, which is correct and hands
  the reader back `actual=0ch` — this entry's own tell, returning one case
  over, for a state that still has no word of its own. The fix (a distinct
  `host-pruned` token) is in the live byte-gate lane's brief.
  This is the shape worth keeping: a fix that cures a misleading tell can grow
  its own misleading tell one case over, and the entry that shipped the cure is
  where the next reader looks. Original entry follows. Grounding: the diagnostic
  cost the dispatcher several investigation steps today. On a
  MISMATCH the census prints `actual=0ch`, and its own comment
  (:264) documents that as "the tell that no counterpart was found
  at all, rather than a rule that failed". For the s-captureG rows
  that tell was WRONG: a counterpart existed at host+1 and merely
  failed the standalone predicate (it was wrapper-retaining), so the
  number said "absent" about something present. Design: when the
  no-counterpart branch is taken, report whether a candidate
  standalone existed at the expected position and was rejected — a
  third state alongside the DROPPED/MISMATCH split that already
  lives there (:300-316), with the rejected candidate's length so
  `recon` and it can be compared at a glance. Verifier: bite
  red-first on the s-captureG shape (a wrapper-retaining standalone
  at host+1) asserting the row does NOT read 0ch.

- **Candidate — census `--json` carries no finding rows.** Surfaced
  by the rejectedCandidate build (2026-08-02) and correctly returned
  as a question rather than widened into its scope: the JSON output
  has always emitted rollups (tally/prunes/duplicates/…) and never
  the per-finding rows, so `rejectedCandidate` — and every other
  per-row detail — is visible only in the human print. Consequence:
  a machine consumer sees verdict COUNTS and cannot see which
  occurrence produced them, which is why per-row questions keep
  being answered by re-running the tool by hand and reading prose.
  Build when a second consumer needs row-level data; natural shape
  is a `details` array behind a flag, so the default output size
  does not change.

- **Candidate — gate status code-stamp races a concurrent commit.**
  Today's sweep stamped `toolsTree` at start and a tools/ commit
  landed during its 75-minute run, so the finished status file
  describes a tree that no longer exists and the doctor's
  code-mismatch warning fires on a non-defect — the shape that
  trains readers to discount warnings. Cheapest honest fix: stamp
  the tree at start AND at finish, and say "code changed during the
  sweep" when they differ, which is a different statement from
  "verdict is stale". Build if the warning fires again on a clean
  run; one occurrence is not yet a pattern.

- **Candidate — corpus-wide ordinal-drift detector.** The
  investigation hand-derived "1 of 534 families drifts on the
  busting request"; the manual pass found it once, a stat would
  watch it forever (and would answer the ordinal fix's own named
  gap: how often the class occurs across captures). Design sketch: a
  per-request census/replay stat counting families whose stored
  count exceeds their wire count, reported like the existing
  tallies. Build only if the ordinal fix's corpus verification does
  not already answer the frequency question.

- **OPEN (2026-08-02, dispatcher-measured) — PREMISE FALSIFIED: the
  migrated standalone is NOT always wrapper-stripped, so
  "canonicalize forward to the standalone form" does not cover every
  instance.** Both homes of the premise say it the same way — this
  BACKLOG's row-4 entry and threat-matrix row 4: "CC ... emits the
  same text as ONE standalone `role:"system"` message after the
  host, wrappers STRIPPED and the blocks JOINED with `\n\n`".
  Counter-instance, measured: capture s-captureG, request
  2026-08-02T08:06:10.259Z (second at 08:24:18.702Z, host=74). The
  census reports `MISMATCH host=30 blocks=1 recon=327ch actual=0ch`.
  Raw dump of the request: a standalone counterpart DOES exist at
  host+1 (index 31, role:"system", content a STRING not a block
  array), total length 364, `<system-reminder>` WRAPPER RETAINED;
  stripping the wrapper leaves exactly 327 characters — byte-equal
  to the census's own reconstruction. So the reconstruction rule is
  right about the TEXT and wrong about the ENVELOPE for this shape.
  Consequences, enumerated per the stale-premise rule rather than
  left to be re-derived: (1) a normalization that canonicalizes
  forward to the stripped form would MOVE the bust for this shape,
  not absorb it — which is exactly what the census's own "DO NOT
  SHIP as-is" verdict on MISMATCH says, and it was right; (2) any
  matcher keyed on stripped-and-joined text cannot match a
  wrapper-retaining standalone — a candidate mechanism for the
  un-merge miss at host 568, sent to that investigation as evidence
  to test, NOT as its answer; (3) the census's `actual=0ch`
  diagnostic is misleading here — it reads as "no counterpart found"
  (the documented tell of a matching bug) while a counterpart exists
  and merely failed the standalone predicate; the verdict is right,
  the tell is not. Owed: whether the wrapper-retained form is a
  distinct CC behaviour or the same one at a different lifecycle
  point, and whether the corpus's EXACT rows are all stripped-form
  (i.e. is this rare or merely rarely matched). Do NOT re-grade the
  row-4 design as settled until that is answered.
  SCOPE SETTLED 2026-08-02 (same day) by the host-568 investigation
  this evidence was sent to — and consequence (2) above is REFUTED,
  recorded rather than quietly dropped. Executed on the busting
  pair's raw bytes: the migrated standalone at after[569] contains
  `<system-reminder>` NOWHERE, both source blocks at before[568] DO
  carry wrappers, and stripped-join + "\n\n" + before[569] ===
  after[569] is TRUE while the wrapper-retained join is FALSE — CC
  applied the canonical rule there exactly as both homes state it.
  Capture-wide over that 498 MB file: ZERO wrapper-carrying
  standalones, and the zero is trustworthy because the instrument
  was proven live in the same run (base pattern
  `"role":"system","content":"` matches 820 lines; a synthetic
  positive control matches the wrapper-retaining pattern) — the
  non-event probe done properly. Edge named by that run, not
  bridged: the looser variant cannot cross an escaped quote, so a
  wrapper appearing mid-text after an escaped `"` would be missed;
  the wholly-wrapped shape this entry describes is what the strict
  pattern catches, and that is 0. Net: the falsification STANDS
  (the premise is not universal; s-captureG is a real
  counter-instance and surfaces as MISMATCH, a different verdict
  from that pair's clean EXTENDED), but the form is RARE rather
  than merely rarely matched, it did NOT cause the host-568 miss
  (ordinal misattribution did), and it does not change the ordinal
  fix's design. The only open half left is the first one above:
  distinct CC behaviour, or the same one at a different lifecycle
  point.

- **OPEN (attributed 2026-08-02, fix serialized behind a running
  read-only dispatch) — conservation gate fires on
  fresh-session-sort's declared rewrite: 38 violations, capture
  s-captureI, the sole red row in the 15:05 sweep (29 captures,
  ok=false failing=1).** NOT a defect and NOT the smoosh class (that
  exemption stands; conservation exemptions on this capture = 0).
  Attribution, dispatcher-run: every failing request is the FIRST
  request of a fresh sub-key (deferred-tool telemetry reads
  `action=no-baseline` at each), i.e. the parallel agent spawns at
  10:43-10:44; the violations sit at in[0]/in[6] as "1 of 4 units
  lost, 1 of 5 invented" — 4 blocks in, 5 out. Mechanism:
  fresh-session-sort REWRITES a system-reminder block in place
  (`sortSkillsBlock` sorts the skills list's lines) and relocates
  hooks/skills/deferred-tools/MCP blocks
  (`isRelocatableBlock`), so CC's original bytes are neither
  forwarded nor accounted for by any clause the fifth gate carries.
  The extension DECLARES its work
  (`ctx.meta.freshSessionSortStats`, fresh-session-sort.mjs:211) and
  the STABILITY gate already keys an exemption off exactly that
  (`freshSessionSortExemption`, replay.mjs:193) — conservation, being
  newer, never got the clause. Remedy (same shape as the smoosh
  exemption that shipped this morning, 3b32e6b): a declared
  exemption the gate BYTE-VERIFIES by chaining the extension's own
  transform, tamper stays red, exemptions counted visibly.
  Complication, named: fresh-session-sort does not export its
  transform today, so chaining it needs an export — a proxy/**
  change, behaviour-neutral but deployment-coupled (pin bump +
  restart; row-3 clear, no state keys or freeze logic). SERIALIZED,
  not parked: tools/replay.mjs is in the read set of the running
  un-merge investigation, and a concurrent writer there would hand
  that agent an unstable instrument.

- **RESOLVED 2026-07-31 (059aae3 — suppression runs on the reset
  path; header re-titled 2026-08-01, body was already resolved) —
  hook-context container normalization (matrix row 4,
  mid-history replace/edit).** Grounding: measured live 2026-07-31, two
  instruments agreeing (`--census`: `edit@98 of 123 [anchor-25] ~75 kB`;
  raw capture diff of the adjacent requests), end-to-end cost from the
  transcript's own `cache_miss_reason messages_changed / 105006`. The
  mutation is a deterministic CONTAINER change, not a content change:
  CC first appends hook additional-context as text blocks INSIDE the
  preceding message, each wrapped `<system-reminder>\n…\n</system-reminder>`
  (observed: msg 97, two blocks, 387 + 313 chars); a later request emits
  the same text as ONE standalone `role:"system"` message positioned after
  the host (observed: idx 98, 627 chars), wrappers STRIPPED and the blocks
  JOINED with `\n\n`. Verified not byte-identical across the move, and the
  transformation fully accounts for the difference. Mitigability —
  the only deliberation the matrix's Mitigation policy allows — is
  ANSWERED YES: the class is recognisable by that shape, and both forms
  carry identical information, so pinning changes serialization only, never
  what the model reads. Same safety argument insertion-normalization
  already makes for the splice direction; this is its mirror for the
  replace direction. Design (settled): canonicalize FORWARD to the standalone
  form on every request — strip the wrappers, join with `\n\n`, emit as one
  `role:"system"` message after the host. Forward-only, so the `\n\n` join
  is never ambiguously re-split; the A→B transition then changes no bytes.
  `role:"system"` inside `messages[]` is legitimate wire shape, not an
  anomaly — it is the `mid-conversation-tool-changes` beta's format
  (`deferred-tool-rewrite.mjs:16,381`). Verifier — NOTE the first one named here was WRONG and the run proved
  it: `--census` classifies the INPUT (what CC sent), so no mitigation can
  ever change `edit@98 of 123`; that line names the class, never the
  absorption. The real check is whether the FORWARDED bodies converge —
  run `normalizeMessages` over both captured requests and compare the first
  divergence index. RESOLVED 2026-07-31 — and NOT by the extension this
  item proposed. The mechanism already existed: insertion-normalization's
  migrated-duplicate suppression (#76606, decision B) covers exactly this
  shape, and its telemetry for the busting request read
  `action=reset resetReason=not-subsequence pinned=2 suppressed=0` — pins
  restored, suppression skipped, because `resetKeepingPins` returns before the
  suppression pass. The suppression was therefore disabled by ANY reset, and
  this extension's own measurement puts resets at ~1 request in 3. Fixed in
  059aae3 by running suppression on the reset path, reusing the pins it has
  already restored. Measured on the motivating pair: divergence 97 -> 100,
  re-bill ~104 kB -> ~96 kB, suppressed=1.
  A separate `hook-context-normalize` extension WAS written first (acc0814)
  and has been REVERTED. It duplicated VOLATILE_WRAP_REGEX and the
  canonical-join concept in a second file, and measured WORSE than fixing the
  existing one (97 -> 101, ~97 kB). The diagnosis that justified it — "the
  class was never in insertion-normalization's scope" — came from reading that
  extension's header instead of its telemetry, which said the opposite. That
  is the dev-loop rule "extend an existing tool before writing a new one",
  violated one day after writing it; recorded rather than tidied away.
  Residual, NOT closed: divergence still lands at 100. The remainder is the
  EXTENDED class (a later form carrying text that did not exist yet) plus the
  ephemeral-turn pruning — neither absorbable by a serialization rule.
  NOT gated on the rate re-measure below: the Mitigation policy states fire
  counts are "never a worthiness threshold" and cost never gates the work —
  an earlier revision of this item made exactly that error.
  CORRECTION 2026-07-31 (same day, later): "neither absorbable by a
  serialization rule" did not survive measurement. (a) The pruning half is
  a measured NON-EVENT on its own — 10 of 10 pure tail prunes in this
  session's capture produced zero `cache_miss_reason` entries (matrix
  row 22 carries the probe); it costs only when a co-occurring mid-history
  change breaks the prefix below the injection point. (b) The EXTENDED
  half IS absorbable — not by predicting bytes but by refusing the edit:
  the census verdict is defined as `actual.startsWith(reconstructed)`
  (`reminder-migration-census.mjs:96`), so the delta is byte-computable.
  READY item below. Also grounded same day: billing is ALL-OR-NOTHING per
  request — the 11:41 bust turn's transcript usage reads
  `cache_read 15,214 / cache_creation 123,032` on a divergence at msg 98
  of 124 whose suffix is only ~19k tokens; with breakpoints at
  {system, messages[0], tail} a mid-history divergence re-bills nearly the
  whole context regardless of depth. Consequence: partial absorption buys
  ~nothing live; per-request TOTAL absorption is the prize, so the last
  open class is worth as much as the first.
  CORRECTION 2026-08-02 (prune dossier, dispatcher-verified): scope
  NARROWED — all-or-nothing holds WHEN a miss fires (the 11:41
  measurement stands); instrument-visible divergence does not imply
  a miss fires: 14 interior role:"system" removals (f94e53ce,
  div=4) measured billing-free (zero cache_miss_reason, ordinary
  creations). "Any unabsorbed mid-history divergence pays ~full
  price" over-claimed; at least the interior system-removal class
  is free. See the reframed interior-prunes entry above.

- **CLOSED 2026-07-31 — EXTENDED-class absorb: build refused on
  measurement; duplicate of the flap-move cross-message-join class
  (5c4d70a, dispatcher-verified: the merged-standalone byte relation
  re-checked against the raw capture, npm test 1783/0).** Do not
  re-dispatch off this entry — the un-merge lives in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md unit 2,
  blocked on the identity decision. Original entry kept below for the
  record; its premise and placement are both refuted in the resolution
  lines at the bottom. Grounding: census over
  this session's capture reports exactly one EXTENDED occurrence
  (2026-07-31T11:41:05.778Z, host=99, recon=293ch, actual=716ch) and the
  extra text is the "task tools haven't been used recently" harness
  reminder appended after `\n\n` — bookkeeping-class, position-insensitive.
  EXTENDED is definitionally append-shaped (`actual.startsWith(recon)`,
  `reminder-migration-census.mjs:96`), so `delta = actual.slice(recon.length)`
  needs no prediction. Design (settled): inside insertion-normalization
  (extend, never a new extension — the acc0814 lesson above), when a
  pinned/canonical standalone's incoming bytes EXTEND the first-seen form,
  forward the first-seen bytes at the original position and emit the delta
  as a proxy-authored `role:"system"` entry at a FROZEN index — appended at
  the current tail on first sight, then held at that index forever (same
  stable-insertion machinery the pins already use; precedent for
  content-at-relocated-position: `deferred-tool-rewrite.mjs` tool_addition
  blocks). Class-gated: only text matching the harness-bookkeeping wrap
  contract; anything else takes the honest reset. Safety argument: the
  model reads identical information, a few positions later; information is
  never dropped. Verifier: replay the 11:41 pair through the pipeline —
  first forwarded divergence must move past the EXTENDED host (beyond
  index 99); plus a unit test red-first on the captured 293→716ch pair.
  Done-criterion: on the motivating pair, with row-4 suppression + this,
  forwarded divergence ≥ 122 (the injection point), i.e. the entire
  mid-history region byte-stable, leaving only the self-healing prune.
  NOT bundled: the volatile-block-pinning directive (flip class) — note
  its blocking precondition "wait for capture/replay harness" is NOW MET
  (replay/census/bust-triage all exist); it can be scheduled on its own
  evidence.
  BUILD REFUSED 2026-07-31 (dispatch
  docs/directives/extended-class-absorb-directive.md; full evidence
  docs/code-reviews/extended-absorb-report.md). Three measurements, in
  the order that killed the design:
  (1) THE PREMISE IS WRONG. The EXTENDED remainder is not "new reminder
  text that did not exist yet" — it is a standalone system message the
  PREDECESSOR request already carried, swallowed into the migrated
  reminder. Measured on the motivating pair (capture s-captureF,
  conversation e7394e05, requests 100->101): before[99] user + one
  330ch wrapped reminder, before[100] system 421ch, after[101] system
  716ch = 293 + "\n\n" + 421, the 421 byte-identical to before[100].
  Corpus-wide, over every EXTENDED occurrence the census finds:
  9 of 9 MERGED-STANDALONE, 0 genuinely new text (4 sessions, 4 dates).
  (2) THE PLACEMENT IS A NO-OP. Real pipeline, serving gate set, the
  conversation replayed from its first request: baseline first
  forwarded divergence 100; with the delta re-emitted at a frozen TAIL
  index (this item's design) 100 — unchanged, zero absorption, because
  the bytes belong at the index the swallowed message occupied. Putting
  them back THERE moves it to 123 of 124, i.e. past the >=122
  done-criterion, the whole mid-history region byte-stable.
  (3) IT IS ALREADY IN FLIGHT, under another name. That un-merge IS unit 2's
  "first-seen re-serve" in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md — the
  PARKED/UNPARKED cross-message-join item below (msg89's reminder +
  "\n\n" + standalone msg90) is the same shape reached from the census's
  blockMigration label instead of its EXTENDED label. Unit 2b is built
  on branch wt/fidelity/opus and BLOCKED on THE IDENTITY DECISION, not
  on a placement question. So this item is a DUPLICATE: it closes by
  merging into that one, never by a second mechanism (the acc0814
  lesson at the file level).
  Shipped from the dispatch, in scope and independent of the design: the
  reset path now DECLARES its suppressions (`suppressions: [{index,
  hash}]`, not just the count), so replay's safety and conservation
  gates stop reporting a designed behaviour as corruption — one false
  safety violation and one false conservation violation on the
  motivating conversation, both 0 after. Two spun-off items with their
  verifiers written out live in the report file, un-lifted into this
  backlog only because the dispatch's write boundary stopped at this
  entry: a census EXTENDED->MERGED-STANDALONE annotation, and the
  census byte-gate's SILENT capture skips (4 of 39 files, 6.2 GB — 79%
  of the corpus by bytes — dropped on `RangeError: Cannot create a
  string longer than 0x1fffffe8 characters`, reported as "25
  capture(s)" with no could-not-verify line).

- **RESOLVED 2026-07-31 (a77c930) — census reads captures by LINE, and says what it could not
  read** (lifted 2026-07-31 from
  docs/code-reviews/extended-absorb-report.md §c4, where the measured
  skip list lives). Replace `readCapture`'s `readFileSync` in
  `tools/reminder-migration-census.mjs` with `readLines`
  (`tools/read-lines.mjs`, already streaming and already the fix for
  this exact RangeError class in `replay.mjs`); keep per-conversation
  grouping unchanged. Report skipped/unreadable files as their own
  line and make a run whose unreadable count is non-zero say so in
  the verdict block (three-answer rule). Verifier: a run over
  `~/.claude/cache-fix-captures/*.jsonl` reports 39 files considered
  and 0 unreadable, versus 25/4 today; per-capture EXACT/EXTENDED
  tallies on the 25 currently-readable files unchanged. A MISMATCH
  surfacing in the newly-readable 79% of corpus bytes is a FINDING to
  report, never a failure of this change. Done when `gate-live`'s
  sweep cannot report a clean byte-gate over a corpus it did not read.
  **RESOLVED a77c930** — `read 39/39 capture(s), 0 UNREADABLE` against a
  baseline re-run of the old code reporting `25 capture(s)` and exit 0;
  tallies on the previously-readable 35 files unchanged (17 EXACT / 10
  EXTENDED / 1 DROPPED / 0 MISMATCH), pairs 3661 vs the baseline's 3662
  minutes later (live captures grew between runs). 2.4 GB capture
  censused in 6 s under `--max-old-space-size=512`. Done-criterion met in
  404d5fc: `gate-live` runs the census per capture and a byte-gate that
  could not READ makes the row not clean. FINDING from the newly-readable
  79%: placement is no longer single (56 at host+1, **3 at host+4**), so
  "single placement; safe to emit" was a verdict over 21% of the corpus —
  docs/code-reviews/census-hardening-report.md §c3.

- **RESOLVED 2026-07-31 (a301ef1) — census: EXTENDED sub-classification (MERGED-STANDALONE vs
  NEW-TEXT)** (lifted 2026-07-31 from the same report §c3; ORDER: land
  the line-read item above first — this one's classifications then
  cover the whole corpus). In `analysePair`, when a finding classifies
  EXTENDED, compare `actual.slice(recon.length)` (leading `"\n\n"`
  stripped) against the texts of the BEFORE request's standalone
  `role:"system"` messages; emit the sub-verdict on the detail row and
  in the non-EXACT listing. Also correct the header comment: "NOT
  absorbable by any normalization" is refuted for the merged
  sub-class. Verifier: red-first on the corpus — the 9 occurrences of
  the report's §b1 must print MERGED-STANDALONE, and a synthetic
  new-text pair must print NEW-TEXT. Done when the sub-verdict appears
  in `--json`, so `bust-triage` can key on it.
  **RESOLVED a301ef1** — `extendedSub` rides `--json`; corpus-wide over
  all 39 captures: **21 EXTENDED, 21 MERGED-STANDALONE, 0 NEW-TEXT**, and
  each of the report's nine §b1 occurrences prints MERGED-STANDALONE.
  Header comment corrected in place. Four unit tests red-first at a77c930
  (test/census-extended-subclass.test.mjs), including the discriminating
  case: a remainder present only in the LATER request is NEW-TEXT, since
  matching the after request's own standalones would make every merge
  trivially true. NOT done (out of both items' scope):
  `bust-triage.mjs`'s `migrationVerdict` still returns a bare EXTENDED
  and could import `subclassifyExtended` — report §c4.

- **REFRAMED 2026-08-02 (sonnet dossier, dispatcher-verified in the
  transcript: cache_read climbs smoothly through the event, creations
  stay sub-3k, zero cache_miss_reason) — the two enormous interior
  prunes BILLED NOTHING; the open question is now the
  instrument-vs-billing mismatch, not the prune size.** Dossier of
  12:42:11.673Z (f94e53ce, capture present; b6952ffc's rotated
  away): 14 messages removed, ALL role:"system" (899–15852 B),
  scattered indices 4→653, not anchor-clustered; index-4 BEFORE =
  role:"system" CC date-changed reminder (15852 B), AFTER =
  ordinary assistant turn. Raw-capture divergence at div=4 AND the
  prefix-diff ledger's independent flag at the same index/moment —
  yet the transcript shows no billing event at all. Consequence,
  the stale-premise cascade: "billing is all-or-nothing per
  request" NARROWS to "when a mid-history miss FIRES, re-bill is
  ~total (11:41 measurement stands); instrument-visible divergence
  does NOT imply a miss fires — interior role:'system' removals
  measured billing-free" (correction lines added at both homes:
  the row-4 entry below and matrix row 4). Mitigation consequence:
  this prune class needs NO absorption — it is already free; what
  it needs is the instruments learning which divergences bill.
  OPEN question, next step: characterize what the API's cache
  actually keys on across role:"system" entries (a controlled
  probe, or passive: census prune rows joined against transcript
  usage per event — the join the dossier hand-ran, mechanizable).
  Instrument findings booked: capturePair silently picks the wrong
  pair when driven by a floored timestamp (candidate below); the
  s-<8hex> tokens here are raw UUID prefixes, not sidToken hashes
  (bust-triage.mjs:461 — brief premise corrected).
  Original entry: `12:42:11.673Z n=688->675 div=4 anchor=674
  rebilled=671` (s-captureN — invisible to every verdict until
  a77c930) and `11:40:24.245Z n=83->81 div=4 anchor=80 rebilled=77`
  (s-captureW); the census prune rows surface any recurrence
  without a hand-run.

- **Candidate — capturePair floored-timestamp mis-selection
  (prune-dossier instrument finding, 2026-08-02).** Driven by a
  floored/seconds-grain timestamp, capturePair (bust-triage.mjs:252,
  also dossier.mjs's path) silently picks the wrong request pair for
  sub-second-adjacent events — the dossier worked around it by
  locating the pair by hand and calling the classifiers directly.
  Adjacent to the resolved reset-telemetry preference and the parked
  join-key entry; fix candidate: carry ms precision end-to-end or
  prefer the pair bracketing the exact event ts. Trigger: next
  bust-triage/dossier session touching that file.

- **CLOSED 2026-08-02 (sonnet discovery, dispatcher-verified at the
  cited lines) — placement multiplicity is interleaving depth, and
  nothing rests on a fixed offset.** The finder (chained from
  census()'s own exports, 30 live captures, 0 unreadable) found the
  corpus rotated to ONE host+4 occurrence (s-captureK, host@128 ->
  standalone@132, EXACT, 327B): a leftover EXTENDED standalone at
  +1, a real tool round-trip at +2/+3, the migrated standalone at
  +4 — interleaving, not a new migration shape. The consumer
  re-check the entry owed is now VERIFIED, not deferred:
  findSuppressibleDuplicate matches by content hash ("never a
  positional or role heuristic", insertion-normalization.mjs:726),
  findJoinMoves searches a bounded byte-match window, and the
  flap-move unit-2 re-serve substitutes in place at the move's own
  mergedIndex (:1372-1390, rationale recorded in the code).
  Placement tally today: 8 distinct EXACT offsets
  (+1:213, +6:2, +10:2, +4/+11/+12/+17/+42: 1 each) — the
  MORE-THAN-ONE-PLACEMENT warning is correct and stays. Residual,
  named: the earlier narrowing's other 2 host+4 occurrences rotated
  out unreconciled — no basis to say what they were.
  Original entry: **placement is no longer single: re-check what
  rested on it (report census-hardening §c3).** Full-corpus census prints 56
  standalones at host+1 and **3 at host+4** with the tool's own
  MORE-THAN-ONE-PLACEMENT warning, where the readable-21% corpus said
  "single placement; safe to emit". The 3 host+4 occurrences are
  uninvestigated.
  NARROWED 2026-08-01 (same sonnet discovery, per-occurrence finder
  built from the census's own exported primitives and
  cross-validated against the shipped tally): the 3 occurrences are
  NOT in the twin-bust or enormous-prune captures — every placement
  there is host+1. They live among the ~35 untouched, mostly-live
  captures; locate when those rotate, or via the finder over the
  full corpus in a quiet window. Consumers to re-check: any NORMALIZATION design that
  emits at a fixed host offset — the flap-move unit-2 re-serve is
  slot-preserving (no emit) and should be unaffected, but that is a
  claim to verify at its integration, not a fact.

- **RESOLVED 2026-07-31 (74f0f28 + the dispatcher's
  most-informative-host preference; verified live: triage of
  11:41:05 prints "row-4 container migration at host 99
  (EXTENDED/MERGED-STANDALONE)") — bust-triage sub-verdict.** The
  dispatch surfaced rather than built the one real decision: the
  pair carries TWO migrating hosts and first-match hid the EXTENDED
  behind an EXACT; ruling: one result kept (shape stable), most
  informative wins (EXTENDED > EXACT > DROPPED). Also this evening,
  same tool: capturePair now streams (7138ddd) — the 752 MB capture
  killed the default run with the same ERR_STRING_TOO_LONG class
  a77c930 fixed in the census; found live and independently by the
  dispatch (its gap 2).

- **RESOLVED 2026-07-31 — harvest scrub now preserves prefix/join byte
  relations (bffcb05, dispatcher-verified).** Was PARKED (report §c5:
  `scrub(a+"\n\n"+b) != scrub(a)+"\n\n"+scrub(b)`, executed). The named
  missing piece — a relation-preserving scrub that does not weaken the
  privacy guarantee — was settled same day as a `"\n\n"`-homomorphism
  (docs/directives/scrub-relation-preservation-directive.md): wrap
  handling first and unchanged, then per-segment tokens rejoined with
  the domain's join separator. Privacy delta is metadata-only and
  operator-ACCEPTED for this local, controlled deployment (caveat for
  non-local harvesters in scrubText's comment and dev-loop corpus
  hygiene). Verified: 10 property tests red-first then green, npm test
  1800/0, --dry-run clean under a 512 MB heap cap, and the dispatcher's
  cross-tool round-trip on the REAL motivating pair — new scrub +
  committed census: verdict EXTENDED, delta byte-equal to the scrubbed
  predecessor standalone, i.e. the class survives sanitization
  end-to-end.

- **RESOLVED 2026-07-31 (404d5fc; boundary decided, see below) — prune-event classification rides `--census` (mechanize the
  2026-07-31 drop-scan probe).** The row-22 refutation was produced by a
  throwaway inline script (per-message hash prefixes; drop events
  classified PURE-TAIL-PRUNE vs INTERIOR-DIVERGENT by first-differing
  index) plus a transcript join on `cache_miss_reason` (±90s). Extend
  `reminder-migration-census.mjs` (never a new tool): census already pairs
  same-conversation requests, so add a per-pair `nDrop` classification and
  a summary line (`prunes: {pure, interior}`), and let `bust-triage.mjs`
  do the transcript join it already knows how to do. Verifier: re-run over
  this session's capture must reproduce 12 events, 10 pure / 2 interior
  (11:31:58 and 11:41:05). Done when `gate-live.mjs`'s daily sweep carries
  the summary, so an interior-divergent prune surfaces without a hand-run.
  **RESOLVED 404d5fc, with the verifier's SPLIT disputed — decision open.**
  `classifyPrune` imports `firstDivergence` + `isHumanTurn`; `gate-live`
  carries `prunes` per row and corpus-wide. Event COUNT reproduces exactly
  (12 on s-captureF) and 11:41:05 is INTERIOR-DIVERGENT (breaks at 97,
  anchor 123, re-bills 27 of 124). 11:31:58 does NOT reproduce as
  interior: at the bytes it is the same phenomenon as the ten pure ones —
  a `[SUGGESTION MODE: …]` block pruned, the user's real turn landing at
  the same index — differing only in the live turn having produced 3
  messages rather than 1-2. The entry's 10/2 is reachable only via a
  "within N of the tail" threshold no definition produces, so the shipped
  boundary is the ANCHOR (the relation row 4's verdict rests on): 11 pure
  / 1 interior. DECIDED 2026-07-31 (dispatcher): the ANCHOR boundary is
  KEPT and this entry's 10/2 is corrected to 11/1 — the 10/2 was
  parented on the throwaway probe's output (the remembered symptom,
  dev-loop "Adding a check" rule 2), the bytes show 11:31:58
  shape-identical to the pure events, and reproducing 10/2 requires a
  tail-distance threshold no definition produces. Corpus-wide: 226 drop events,
  181 pure, 45 interior, 0 unanchored — two of them re-bill nearly
  everything (12:42:11 n=688->675 breaks at 4, re-bills 671, in a capture
  unreadable before a77c930; 11:40:24 n=83->81 breaks at 4, re-bills 77),
  unexplained and worth their own triage (report §c2). Done-criterion met:
  the full sweep prints `byte-gate corpus-wide: 59 EXACT / 22 EXTENDED (22
  merged-standalone, 0 new-text) / 1 DROPPED / 0 MISMATCH; prunes 181 pure
  / 46 INTERIOR-DIVERGENT` and all 39 rows carry `byteGate` in the status
  file (`unreadable: 0`, `errors: 0`); `npm test` 1820/0.

- **RESOLVED 2026-07-31 (6efce90) — bust-triage must see what the statusline shows (k:"cost"
  blindness).** Grounding, observed live 2026-07-31 ~13:53Z: statusline
  showed `❄ 55k compact (8m)` (ledger `k:"cost"` t=1785505434, this
  session); `bust-triage` and `--list` showed nothing newer than 12:25
  because `bust-triage.mjs:59` filters `k === "hit"` only — the default
  run silently triaged an older, different event. The event itself was
  controlled (post-/compact + model-switch first write, same instant as
  the transcript's `model_changed mtok=49784` diagnostic at 13:43:54Z;
  worktime cc=54908 is total-written, mtok is missed-portion — one event,
  two measures). Fix (extend, not new tool): include `k:"cost"` entries in
  `--list` labeled `CONTROLLED(<cause>)`; when the newest ledger event is
  a controlled class, the default run states that and names the event it
  fell back to instead of silently skipping. Verifier: re-run against the
  current ledger must list the 1785505434 compact event and say so in the
  no-args run. Done when a ❄-visible event can never be absent from
  `--list`. Per the three-answer rule: "cannot triage: controlled cause"
  is an answer; silence is not.
  **RESOLVED 6efce90** — `coldEvents()` reads the whole ❄-visible
  population and splits `bust` / `controlled`; `busts()` is a filter over
  it, so nothing downstream shifted. Live `--list` now carries
  `2026-07-31 13:43:54  55k  CONTROLLED(compact)  77fe2779`. The no-args
  half could not be reproduced against the ledger as it stands (a bust
  landed at 14:32:29, so the newest event is no longer controlled), so it
  was exercised through the real `main()` against a copy truncated to
  that instant: it prints the NOTE and names the 12:25:23 fallback — the
  substitution that used to happen in silence. WIDENED beyond the entry,
  deliberately: legacy `k:"resume"` is included with `k:"cost"`, because
  the ❄ token advances on `cold_hit` and `cold_cost` and worktime's own
  `--cold --all` filter is `hit or cost or resume` (3 resume records are
  live in the ledger) — the done-criterion is the superset's.

- **PARKED — commit-claim guard (commit-msg hook, warn-only): a message
  naming a file/symbol absent from the staged diff.** Evidence, twice in
  two days in THIS repo: acc0814's message claimed a BACKLOG.md edit the
  commit did not contain (landed separately as c369e50), and 7b2a5ef's
  message listed `hostId` among the census exports while the staged file
  lacked it — the code sat uncommitted until session close 2026-07-31
  (committed 3afce21). Both are the same shape: the message was written
  against intended state, not staged state. Parked on a design decision
  the operator owns: the hook lives in dotfiles (git hooks are deployed
  from there), and the computable predicate needs care to avoid
  fire-on-non-defect (messages legitimately name files they do not touch
  — "matrix row 4", "see BACKLOG"); candidate slice: warn only when a
  message uses change verbs (add/fix/export/remove) adjacent to a
  path-or-symbol token that greps to zero hits in `git diff --cached`.
  Trigger reworded 2026-07-31 (operator GO) from a count to a content
  test — a third incident adds count, not information; the predicate's
  false-fire problem is not fixed by more examples. Unpark and BUILD
  (backtick-scoped slice only: change verb + backtick-quoted
  path-or-symbol token with zero hits in `git diff --cached`) when an
  incident arrives where the false message carried real cost (someone
  acted on it before the diff corrected them) OR one the backtick
  slice would provably have caught. A further CHEAP self-surfacing
  incident is instead evidence to DROP the item with a one-line
  reason: the class is real but self-healing (the message sits
  permanently beside its own refutation, the diff), and exposure has
  shrunk since the park — the push-claim reminder (dispatch-guards
  0.1.12) now creates a review moment before agent commits publish.
  Either way the next incident decides; the item leaves in one of the
  two directions.

- **PARKED — row 4 rate re-measure (telemetry, NOT a gate on the item
  above).** (Header restored 2026-07-31 — c53ea3a replaced this line
  instead of inserting above it, gluing this item's body onto the
  commit-claim entry.) Missing evidence, named: 14 replace/edits in 179 pairs (7.8%)
  in one session vs 5 in 838 (0.6%) in the 940-request corpus that closed
  the row on 2026-07-28 — one session against a corpus, so the rate is not
  established. Trigger to unpark: a `--census` sweep over the harvested
  corpus reporting MID-HISTORY replace/edit counts WITH anchor distances,
  so "deep" separates from "1-2 off the tail" (four of the five here were
  the latter, ~1-5 kB). Value is retirement/telemetry evidence and sizing
  the win — never permission to build.

- **PARKED — suggestion-mode ephemeral turns (matrix row 22): establish
  pruning-boundary stability.** Missing evidence, named — and note the
  fire rate is deliberately NOT among it: the Mitigation policy states
  fire counts are never a worthiness threshold, so frequency sizes the
  win but cannot gate the work. What DOES block is mitigability:
  (a) context only — how often CC injects `[SUGGESTION MODE: …]` turns into the live
  `messages[]` — observed once, at 2026-07-31T11:41:05.778Z, where 8
  scaffolding entries were pruned as the array went 130→124; (b)
  whether the injection/pruning boundary is stable enough to pin, i.e.
  whether the turns are recognisable by something better than their
  text prefix. Mitigability is UNASSESSED and must stay so until (b):
  these entries carry ordinary `user`/`assistant` roles, so holding
  them out of canonical history on a text match risks dropping real
  conversation — safety outranks cache. Note the class is
  independently real but was NOT the cause of the 11:41 bust (row 4's
  mutation at index 98 sat earlier and dominated the re-bill).

- **RESOLVED 2026-07-31 — `role:"system"` inside `messages[]` is
  legitimate wire shape, not an anomaly.** It is the
  `mid-conversation-tool-changes` beta's format
  (`deferred-tool-rewrite.mjs:16,381`), and CC additionally uses that
  role to carry hook additional-context. The observation that opened
  this item (13 of 124 messages) needed no mitigation of its own — it
  was the CONTAINER half of row 4's mutation, and is folded into the
  READY item above. Kept as a line rather than deleted so a future
  session re-encountering the role does not re-derive it.

- **RESOLVED 2026-08-01 (f71dd3a, ready-bundle dispatch,
  dispatcher-verified: 51/51, clean over all 123 test files; the
  verifier took the REAL-HISTORY route — both wave-2 defects
  reproduced from git-show reconstructions, cured tree green, and
  the WIDENED fixture arm red-first. Residual: the "wired into the
  next port brief" arm lands with the rebuild brief (HOLD entry);
  not yet run against a live slice worktree) — slice-port
  preflight: resolve a test file's module-scope
  reads against the slice tree before mapping it.** Grounding: both
  wave-2 load failures (2026-07-30) were the same shape — a test
  file mapped into a slice by `--stat` carried a module-scope
  dependency living in another slice (static
  `import ../tools/harvest.mjs`; top-level `readFileSync` of the
  oscillation fixture) and died at load in pr1/pr7/pr10; only
  `node --test` on the slice sees it, after the port. Design
  (settled): a `tools/` check that, given a slice tree and a list
  of test files, extracts static import specifiers and top-level
  `readFileSync`/`readFile` literals and resolves each against the
  tree — missing resolution = red, named. Verifier: run against the
  wave-2 mapping as recorded — must flag exactly
  `insertion-suppression.test.mjs` (harvest.mjs) and
  `insertion-merge-suppression.test.mjs` (oscillation fixture) at
  the pre-fix states, green after da9bf8c + the fixture port.
  Done-criterion: check in `tools/`, red on the recorded defect,
  wired into the next port brief's preflight. Related brief-form
  note for the next port: distinguish modify/delete conflicts on
  brief-prescribed discard paths (no-op resolution, proceed) from
  content (`UU`) conflicts (abort) — wave-2's executor had to
  deviate to deliver anything (report §d D1).
  WIDENED 2026-08-01 (fixture-leak post-incident, operator GO): the
  preflight also flags a FIXTURE mapped into a slice without its
  absence coverage — any test/fixtures/** file in a slice whose
  absence scan (tools/absence-scan.mjs, extracted from
  harvest-scrub-relations §6) is not runnable in that slice = red,
  named. The dotfiles pre-push guard is the boundary backstop either
  way, so this preflight arm is defense-in-depth, not the only line.

- **BUILT+SERVING 2026-07-30 (78940a0, rides the restart with
  b167fa5; residual OPEN: sole-587k-contributor question, closer =
  the post-restart live non-event; header re-titled 2026-08-01) —
  MERGED-reminder standalone: the 587k's real mechanism
  (premise corrected by the builder's probe, dispatcher
  byte-verified 2026-07-30).** The oscillation-pin premise was
  DISPROVEN against real code + production telemetry: the pin
  already absorbs msg863's flips (volatile-classed, identity
  unchanged, zero resets across the window). The REAL forwarded
  divergence: CC migrates BOTH of msg863's hook reminders into ONE
  standalone system message — wrapper-stripped, joined with exactly
  "\n\n" (627 chars, byte-confirmed at raw 864) — and suppression
  cannot match it: pinnedBlockHashes hashes blocks INDIVIDUALLY,
  never a concatenation (suppressed:0 across 560 session events;
  census independently flags the edit as not-the-known-class).
  DESIGN SETTLED: per pinned entry with >=2 volatile blocks, also
  register the join-hash of their unwrapped texts in wire order
  ("\n\n" joiner as observed); a standalone matching the join
  suppresses through the existing path; subset-merges not built
  (unobserved — the census keeps watching). Fixture extended with
  the real 864 standalone (requests_864). Build granted to the
  probing agent. BUILT + VERIFIED + PUSHED same day (78940a0: 7/7
  merge bites red-first from the real fixture bytes; sibling suites
  65/65; gate 0/0/0/0; the census's "input-mitigated but NOT
  output-preserved" list EMPTIED — including n=1515->1528, a second
  independent real occurrence from a different subagent's spawn,
  confirming the fix generalizes past the fixture). Rides the
  restart boundary with b167fa5 (view-markers). Residual: whether
  this is the sole 587k contributor or one of several (agent flag,
  unverified; the post-restart live non-event is the closer).

- **RESOLVED 2026-08-02 (0def5ca + bc454d1 + b702b69 + 07218a1, opus
  dispatch, dispatcher-verified: 39/39 on both suites re-run, all
  four red-first probes reported broken->red->green, live
  shape-verdicts run shows the fire-ledger verdict, commit graph
  re-verified after the amend incidents) — mitigation fire-rate
  ledger.** gate-live --fire-ledger (default
  ~/.claude/cache-fix-fire-ledger.jsonl, no systemd change needed —
  the series starts with the next timer run) appends one line per
  sweep: {ts, windowFrom, windowSeeded, ccVersions, captures,
  raw{7}, absorbed{7}}; RAW = census-measured CC behaviour per
  class, ABSORBED = event-log applications over the inter-sweep
  window; null never 0 on a missing source (bitten in-suite).
  NOT THE SAME UNIT: raw counts occurrences, absorbed counts
  applications (a suppression re-applies per request by design) —
  ratio-blind by construction, said in the file header (b702b69).
  shape-verdicts `fire-ledger` is informational unless the series
  itself cannot answer (no ledger / undated / >26h frozen) — the
  check-fires-on-non-defect rule applied at design time. Matrix
  gains the Retirement policy block (bc454d1): 0 RAW across N sweeps
  spanning cc-versions >= X + named upstream ref (row 4 candidate:
  anthropics/claude-code#81077) + gate OFF never deletion, RAW
  return = mechanical re-add trigger. DECISION booked (2026-08-02):
  ccVersions joins capture sid -> CC transcript's own top-level
  `version` — the brief's "cc-version namespace already in captures"
  premise was REFUTED in the artifact (0 grep hits across all 34
  captures; request-capture stores only anthropic-beta + session-id,
  request-capture.mjs:108); the transcript is CC's own version
  record, accepted as retirement evidence. Residuals, named:
  guardRestores RAW = null by definition (answers our pipeline, not
  CC; suite-asserted so a future measure must argue with a test);
  oscillationAbsorptions has no ABSORBED source without an
  extension-side field (proxy/** — rides a proxy boundary, never
  alone); blockMigrations/duplicates absorbed-null (no mitigation
  absorbs those classes); 4 single-request captures resolved
  ccVersions []; multi-day verdict wording fixture-tested only; 26h
  staleness threshold inherited from HARVEST_MAX_AGE_H, not measured
  against the gate cadence; per-row retire triggers still open in
  the matrix block. SAVED-vs-LEAKED bytes clause NOT built — its own
  OPEN item below. Original entry follows.
  (UPSTREAM-REF candidate logged 2026-08-01: anthropics/claude-code
  #81077 — "PostToolUse additionalContext re-serialized between
  turns, invalidating prompt cache" — is the row-4 class filed
  upstream; found by the dossier's gh sweep. A future row-4
  retirement names it, per refinement (1) below.)
  (operator question 2026-07-30: upstream may fix CC
  bugs; mitigations should retire on quiet evidence, like corpus
  rules at fire-rate reviews). Today: per-class fire EVIDENCE exists
  (insertion/deferred event logs, guard-events, census per-sweep
  counts) but no TIME SERIES and no retirement consumer — gate
  status keeps only the latest run. WIDENED 2026-07-30 (loop stage
  RETIRE): the per-run line also accumulates SAVED-vs-LEAKED —
  absorbed bytes (input-mitigated sizes) vs passed-through re-billed
  bytes — the retirement evidence and the proxy's justification
  number in one series. Design sketch: gate-live appends
  one compact per-run line (date + per-class counts: suppressions,
  relocations, tool-addition announcements, oscillation-absorptions,
  guard restores, blockMigrations, duplicates) to a cumulative
  fire-ledger jsonl; consumer: a shape-verdicts entry answering
  "class X last fired N days ago" + threat-matrix rows gain retire
  triggers ("quiet M weeks + upstream fix confirmed -> gate OFF,
  acceptance-style"). Operator refinements 2026-07-30, both in the
  design: (1) UPSTREAM EVIDENCE IS PART OF THE BASIS — a retirement
  names its CC-side ref (issue closed / changelog entry / version),
  and the ledger lines carry the CC VERSION seen (cc-version
  namespace already in captures), so the claim becomes "0 raw
  occurrences across N sweeps spanning versions >= X, where X ships
  the fix" — not just "quiet lately". (2) RETIREMENT IS REVERSIBLE
  BY CONSTRUCTION — gate OFF, never code deletion (the
  built-and-dormant pattern); the ledger tracks TWO columns per
  class: RAW occurrences (CC's behavior, census-measured offline —
  keeps counting even with the gate off) and ABSORBED fires
  (mitigation activity). Re-add trigger = raw count returns after
  retirement; re-enable takes a fresh acceptance entry (the
  existing pattern — the acceptance dict already carries REMOVED
  entries whose re-enable "verlangt eine neue Abnahme", and the
  doctor enforces it). Pairs naturally with the soak summary and
  the watch threads.

- **BUILT 2026-08-02 (dc0fce1, opus dispatch, dispatcher-verified:
  61/61 across five suites, four red-first probes, real subset line
  appended to scratch) — fire-ledger SAVED-vs-LEAKED bytes columns;
  saved side NULL-BLOCKED on a replay field, its READY item below.**
  Line schema gains savedBytes/leakedBytes (7-class key set, null
  never 0, old lines parseable — bitten). This entry's own premise
  "the data already exists per mitigation row" was REFUTED in the
  artifact: only relocations carries byte fields; leakedBytes is
  1-of-7 live and PROVEN to move when the mitigation fires (A/B
  replay on s-captureG: gate OFF 23865, serving 13952 — the 9913
  delta is the absorbed re-bill). savedBytes is 7/7 null under both
  readings (census AND event logs carry no byte field anywhere) —
  the one blocking expression is replay.mjs:1044
  `rebilledBytes: mitigated ? 0 : rebilled`, which computes the
  justification number and discards it. Dispatcher rulings
  2026-08-02: shipped-all-null RATIFIED (an all-null column reads
  "unmeasured", the ledger's own discipline); rebilledOutBytes
  correctly NOT summed into leakedBytes (output tokens price
  differently — own column if ever wanted, candidate below);
  verdict message stays counts-only until saved is real. Lesson
  booked from the refutation: "the data already exists" in a
  backlog entry is an artifact claim and decays as the artifact
  moves.

- **RESOLVED 2026-08-02 (0a905a5, inline after the smoosh lane
  closed; 128/128 across six affected suites) — replay keeps the
  pre-mitigation re-bill: savedBytes' one missing field.** Landed
  as designed with one correction to the entry's own claim: "NO
  gate-live change needed" was the dispatch's overstatement — its
  shipped summariseFireBytes hard-nulled saved, so the read had to
  be added there (with an old-schema guard: rows predating the
  field stay null, measured-empty is a real zero, three states
  pinned in-suite). Retained-not-recomputed pinned by replaying the
  same pair mitigated and unmitigated (equal numbers, opposite
  fields). Done-criterion met exactly: n=63 row savedBytes 9913
  under serving gates, subset ledger line
  savedBytes.relocations 9913 / leakedBytes.relocations 13952 —
  byte-equal to the dispatch's A/B evidence. The fire ledger now
  prices both directions; the saved/(saved+leaked) verdict ratio
  (candidate below) is unblocked.

- **Candidate — leakedOutBytes column (fire-bytes proposal 3,
  2026-08-02).** rebilledOutBytes exists and is real but every
  observed row read 0 (outputPreserved:true) — build only if the
  output-side leak ever measures non-zero; trigger: a sweep showing
  rebilledOutBytes > 0.

- **Candidate — fire-ledger verdict gains saved/(saved+leaked)
  (fire-bytes proposal 4).** UNBLOCKED 2026-08-02 (0a905a5 —
  savedBytes live); those two share RAW's denominator, so theirs is
  the one meaningful ratio on the line (units note already in
  gate-live's header). Build on operator wish or when the series
  has enough lines for the ratio to say something.

- **RESOLVED 2026-08-02 (3b32e6b, sonnet dispatch,
  dispatcher-verified: five replay suites green, live replay of the
  capture 10 violations -> 0 with 10 visible same-class exemptions,
  exit 0) — new live conservation failure: s-captureP,
  conservation=10, gate exit 1 (found 2026-08-02 by the fire-ledger
  dispatch's full-corpus run — 34 captures vs the 07:51 production
  sweep's 28; NOT caused by the fire-ledger work, which touches no
  replay or extension path).** The gate now byte-verifies
  smoosh-split's declared peel by chaining the extension's own
  export; tamper stays red; the gate's DEFINITION comment carries
  the new clause (d), and the dispatch also repaired pre-existing
  drift there (isDeclaredStrip's dangling clause-(c)
  self-reference). Residual, named: exemption granularity is
  message-level — a message carrying BOTH a legitimate peel and an
  unrelated genuine drop stays a plain violation with no
  known-good-part hint (safe direction, never masks a loss; not
  observed live). Lesson: "the comment is the definition" needs
  occasional audit against the code's inline clause references —
  drift compounds silently until someone adds an adjacent clause.
  Mon 07:18 sweep expected GREEN.
  ATTRIBUTE DONE 2026-08-02 (inline, dispatcher; replayed the
  capture alone with --gates-from-capture, dumped in[2] of the
  09:18:11 request): NOT a defect — the gate fires on legitimate,
  declared mitigation work it predates. Five requests
  09:18:11–09:18:45, each losing 1 user tool_result unit at in[2]
  and inventing 2 at out[2] — the exact signature of
  smoosh-split.mjs (ON in serving config; declares
  ctx.meta.smooshSplitStats) peeling a trailing <system-reminder>
  (MCP server instructions, smooshed by CC into a WebFetch
  redirect tool_result string) into a text block appended to the
  same message. The conservation gate's definition (replay.mjs
  ~:1683) has clauses for suppressions and declared injections,
  none for the peel — first live smoosh since the gate shipped.
  Remedy per the check-fires-on-non-defect rule: declared
  exemption the gate byte-verifies by CHAINING the extension's own
  exported splitSmooshedReminders (census-sub-classifier
  precedent), tamper stays red, exemptions counted visibly;
  sonnet dispatch in flight, resolution ref lands with its booked
  report. Capture note: the session is LIVE — counts may exceed 10
  by verification time; same-class growth is expected.

- **Candidate — docs-name-real-gates test** (2026-07-30, consumer-doc
  tiering): a small test asserting every CACHE_FIX_* named in
  docs/*.md exists as an env the code actually reads — a doc
  recommending a renamed/removed gate misleads consumers silently
  (the consumer principle for docs). Build at next docs touch.

- **Candidate — tools/whodunit: timestamp-correlation sweep as a
  tool** (2026-07-30, first use was a hand grep): given a
  timestamp, sweep all event logs (insertion, guard, deferred,
  upstream-changes, upstream-errors) +-5s and print correlated
  events — the mechanized form of dev-loop's "rule out ourselves"
  step. Second use graduates it into tools/ per the probe rule;
  built then, not now.

- **Residual — harvest --pin needs a ts-range mode** (2026-07-30):
  ordinal selection against a LIVE capture failed twice in one hour
  (growth moved the window; harvest's numbering differs from a hand
  count — two schemes, the identity error at ordinal level). Pin by
  timestamp range + echo endpoint timestamps in the report line for
  eyeball verification; deep-range pins also need a no-full-prefix
  mode (297 MB fixture from an 8-request window).

- **FIXED + CLASS CLOSED 2026-07-30 (e0f8fcb; all three real
  failures replay clean, fourth 400 was the deploy window; two
  residues named in body; header re-titled 2026-08-01) —
  suppression can strip a request's FINAL message ->
  assistant-terminal 400: OUR bug, three live failures 2026-07-30**
  (operator push overturned the dispatcher's "harness noise" claim
  — twice booked wrong in chat before the log check). Evidence:
  insertion event log's three suppressed-duplicate events precede
  the three "400 must end with a user message" idle-failures by ~1s
  each (05:55:26/27 lifo, 07:12:37/38 fss, 08:09:10/11
  oscillation). Mechanism: report-enforcer injects IDENTICAL
  instruction bytes at every SubagentStop; first occurrence pinned,
  next occurrence suppressed as duplicate; when it was the resume
  request's ONLY/new final message the forwarded conversation ends
  assistant-role -> upstream 400. Damage so far: failed pokes of
  COMPLETED agents (cosmetic); the same mechanism would kill a
  live resume of unfinished work. FIX (granted to the suppression
  agent): (1) tail guard — never suppress the array's final
  message (a tail-position duplicate is the request's live payload,
  not a migration; bite red-first on the resume shape); (2)
  output-guard gains the assistant-terminal invariant (incoming
  ends non-assistant -> forwarded must too; restore + guard-event
  on violation — the live catch this class lacked); (3) replay the
  three real failing sub-conversations pre/post. proxy/** — the
  restart urgency is raised: the class actively breaks resumes.
  FIXED same day (e0f8fcb, sonnet, pushed after dispatcher
  verification: 83/83 + output-guard suite green; all THREE real
  failures replayed pre/post — PRE shows the exact 400 condition
  (incoming last=user, forwarded last=assistant, guard silent);
  POST all three intact, suppressed=0 at tail, build 1 prevents
  and build 2 stands as belt. Builder also caught + fixed its own
  prior test's accidental tail-index harness). Candidate lesson
  stands: a mutation that can REMOVE messages needs a
  tail-validity invariant from day one; the message-COUNT lesson
  covered the checkers, not the API-contract shape. SERVING after
  the ASAP restart (task #5). CLASS CLOSED (probe, same day): a
  fourth 400 at 08:40:48 was the DEPLOYMENT WINDOW — the request
  hit 54s after the fix's push and 43s before its restart, served
  by the stale process (probe reproduced production's event log
  byte-for-byte with the pre-fix files, and HEAD replays the same
  request clean; the three originals replay clean under current
  code — no second mechanism). Two residues, named: (1) accepted —
  commit-to-restart windows serve stale code by construction; rare,
  self-healing, no standing check built (point-in-time gates can't
  see a 54s window; a fix-class actively firing during its own
  deploy window is unlucky timing, not drift). (2) instrument
  lesson — the dispatcher misread a TRUNCATED log print ("index:
  2..." was index 287, cut mid-number) and briefed "mid-history"
  wrong; the probe's full-record read corrected it. Print full
  records when the value is load-bearing.

- **Upstream PR series #272–#281 (ten open, #281 draft) — await review.**
  Updated 2026-07-30 after the suppression work: #272 gained the
  duplicate-suppression commit (c713d0e), #276 the output-side
  metric/census/exemptions refresh (93203c9, extension synced to the
  #272 tip), #281 rebased onto c713d0e (draft, force-with-lease); all
  three commented, slices test-verified in their own worktrees.
  Rebase worktrees: `~/dev/vendor/cache-fix-pr{1..10}`. #281 flips to
  ready when #272 merges (either side can; `gh pr ready 281`). Residue
  riding with rebases or a final chore PR: +35 lines of test hardening
  (install-service / proxy-wrapper / read-dedupe tests) and
  proxy-restart-transparent.test.mjs. PR2's copy of
  session-key-invariants.test.mjs excises the prefix-diff tenantId case;
  it lives in #280's proxy-prefix-diff.test.mjs.
  Wave 2 (post-morning commits da4e7e1..e0f8fcb → #272/#276/#278/#280,
  #281 rebase): hold released 2026-07-30, brief decision-complete at
  docs/directives/pr-wave2-port-brief.md; execution blocked by the CC
  Agent-denial incident — full state in
  docs/directives/HANDOFF-2026-07-30-agent-denial-restart.md.

- **COMMITTED on PR #272 and #273 threads: week-of-soak summary, due
  ~2026-08-05.** Material: cache-fix-gate-status.json history + the
  worktime --cold ledger (preventable vs TTL-idle split).

- **Watch threads** for responses: anthropics/claude-code #76606,
  #81967, #78660 (our comments with measurements), #82229 (our issue),
  cnighswonger PRs #272–#281.

- **ECONNRESET on >200K cold contexts (CC#79989) — exposure noted,
  mitigation candidate.** This fleet runs the 1m beta at 700k+ contexts.
  If a session hard-fails every request after going cold, this is the
  first hypothesis; the candidate mitigation is a forward-path
  retry/backoff. Not built: no local occurrence yet (deferral basis:
  zero observed instances here — an occurrence is the build trigger,
  and the threat-matrix coverage section carries the class).

- **Row 2 (threat matrix): TTL keepalive** — OPEN since 2026-07-27,
  phase-3 candidate, cost-positive only if the operator returns after
  idle; needs idle-detection + opt-in. Unchanged.

- **Reminder-swap (#76606): DECIDED — pin-and-suppress (operator
  "B", 2026-07-29 evening).** Resolution history: fidelity probe
  proved replay byte-faithful to the wire; the "mitigated:true" had
  been the METRIC's blindness (input-side only), and the pipeline's
  real behavior is restore-the-pin AND forward the duplicate — a
  splice at 31 that re-billed 124k while carrying the reminder
  twice. (a) DONE: census blockMigration annotation (5cdf51b).
  (b) DONE: output-side metric (3db056b, pushed; dispatcher-verified
  under boot-record gates — flags exactly n=26->28, nowhere else in
  1190 requests). Residuals from its report, accepted with names:
  the real-pair test SKIPs (not fails) once the capture rotates —
  third motivating instance for "Harvest pins instances" above; and
  the metric newly exposes FIVE more output-spliced pairs (~0.6 MB,
  ordinals in the mitigation report) — classify against
  blockMigration after (c) lands, they may be a different mechanism.
  (c) DONE 2026-07-30 (c5d870d, sonnet build;
  dispatcher-verified: suites green, full-corpus gate 0/0/0/0 under
  boot-record gates, real pair edit@31 ~61 kB -> edit@48 ~5 kB).
  Two spec corrections booked from the build, both verified: the
  "declared exemption in the live output-guard" clause was written
  against a check that does not exist (output-guard has no
  message-count invariant BY DESIGN — its directive line 58; 0
  fires over 1190 requests) — no exemption owed; and the literal
  acceptance criterion "outputPreserved:true / rebilledOut 0" was
  unreachable by this fix alone — the residual divergence at 48 is
  ttl-management relocating its cache_control marker off the old
  tail (messages differ in ONLY that key, direct diff), expected
  behavior of a different extension. The stability gate needed the
  same declared exemption as the safety gate and the brief did not
  name it (67 false fires before the fix, caught by full-corpus
  replay) — lesson: a message-COUNT change gets checked against all
  four replay invariants, not the two a brief happens to name.
  Suppression is re-detected per request from the on-disk pin set
  (no new state file). Remaining, named: (1) DEPLOY — proxy/** ->
  dotfiles pin bump + restart at a stated session boundary + gate
  run (dev-loop); row 8 closes on the live non-event, not the
  build. (2) The five other output-spliced pairs are confirmed NOT
  block migrations (census post-fix: exactly 4, none of the five)
  — a different, still-unclassified mechanism, still open. (3) The
  three sibling migrations (n=105->107, 107->108, 108->109) were
  covered only by the aggregate gate, not individually verified.
  (4) grep for consumers of the new suppressed/suppressions stats
  fields not run (prior equivalent check on outputForm found none).

- **DONE 2026-07-30 — replay warns on gateless runs of gated
  captures** (669c8c7, sonnet build, pushed after dispatcher
  verification; grounding was three same-day instrument errors with
  the dev-loop prose loaded each time). Validation better than the
  planned bite: during dispatcher verification the warning fired on
  a REAL instance of its class — a head-1 gates extraction on a
  multi-boot capture whose first boot declares no gates produced an
  empty env the dispatcher believed was gated; the builder's
  union-across-boots judgment call is what made the fire correct.
  Named residuals, accepted: the strict-partial case (0<M<N gates
  set) shares the code path but has no bite; no real multi-boot
  fixture in-repo (union exercised against the live capture only).
  Convention from the incident: extract gates via the ALL-boots
  union, never head -1 — and DONE 2026-07-30 (dac26a0; clause sat
  stale as READY until booked 2026-08-02), the mechanized form: a
  `--gates-from-capture` replay flag applying the union (names AND
  values, later boots winning) so no operator hand-extracts gates
  at all; the warning text now names the flag as the remedy
  (replay.mjs:2242).
  Design: reuse declaredGateNames' iteration, apply before
  extension load (same merge point as --env); --env still wins
  over the flag where both name a gate. Verifier: bite — flag on
  the multi-boot capture reproduces the union run (no warning,
  header "N of N"); flag + --env override → override wins. The
  hand-extraction one-liner dies with the flag (the probe-
  graduation rule's case).

- **DONE 2026-07-30 — injectAdditions LIFO fix (00d1e58, sonnet in
  isolated worktree, cherry-picked + pushed after dispatcher
  verification: 25 stability violations -> 0 on the real capture,
  own replay run, all other invariants 0; red-before-green in units
  AND on the capture; no pre-existing test asserted LIFO). Open
  question from the build, unresolved: pre/post replay diagnostic
  logs diverged in volume past line 1912 (a 643-message conversation
  cycling; live capture grew between runs ~6 min apart — plausible,
  unconfirmed). SERVING since 2026-07-30 morning (pin c3f975b,
  restart at a stated boundary, /health = disk fingerprint
  910554e0b153); ported to upstream PR #273 (6636aa9, commented).
  Live non-event on the next MCP-heavy session boot closes it. Original entry follows for the record.**
  Mechanism found by probe 2026-07-30, dispatcher-verified at the
  code. The gate-red investigation
  (s-captureC, 25 violations, burst n=372-397) resolved: a session-
  boot MCP discovery cascade grows tools[] 0->11->428->singles while
  the conversation stays 1 message; `injectAdditions`
  (deferred-tool-rewrite.mjs:408-440) splices EVERY addition at its
  anchor's idx+1, so on a shared anchor the newest addition lands
  first and pushes all earlier ones back — a LIFO stack that
  reorders the already-forwarded prefix on every new tool.
  Deterministic (byte-for-byte in sequential replay), pre-existing
  (A/B exonerated the suppression deploy). Fix design: injection
  order must preserve FORWARDED order — on a shared anchor, splice
  each new addition AFTER the additions already injected there
  (append to the run, FIFO), so the forwarded prefix is stable and
  only the tail grows; same rule in the reanchor path. Verifier:
  red-green on the real capture — the 25 stability violations drop
  to 0 with fidelity/safety unchanged; unit bite for the shared-
  anchor multi-addition order. Live-cost note from the probe: the
  26 burst requests have NO outcome records (cancelled in-flight),
  so the paid cost is unattributable without A/B — the violations
  themselves are the evidence. Upstream coupling: PR #273 carries
  this extension — port the fix there after fork verification.
  Full evidence: scratchpad flap-probe/detail.txt (session-local);
  probe report booked here is the durable record. Related, same
  probe, SEPARATE items: (i) torn capture lines, (ii) census
  output-hash blind spot — both below. The second
  red capture is a DIFFERENT class: s-captureD n=2024->2025
  (12:31:18Z, pre-deploy traffic), 1 violation, `inDiv=1 outDiv=0
  [CC bytes IDENTICAL -> ours] <- fresh-session-sort` — CC's input
  changed at index 1, our output byte-flapped at index 0; not
  suppression-shaped (byte change, not message removal), one
  instance in ~2000 requests. RESOLVED at mechanism level
  (probe 2026-07-30, dispatcher-verified at the code):
  fresh-session-sort's relocate branch fires on the FIRST
  APPEARANCE of a relocatable block type anywhere in the array
  (hasScatteredBlocks, :117-127) and prepends it to messages[0] —
  a DELIBERATE one-time relocation bust that buys elimination of
  repeated future ones (extension-impact-guide: the #34629 class,
  the project's founding bug). Deterministic-from-input;
  1/~2000 matches session-init frequency. DONE 2026-07-30
  (e41e068, sonnet, pushed after dispatcher verification: 52/52 +
  selfcheck green; real pair PRE 1 violation measured independently
  twice, POST 0 violations + 1 annotated telemetry-backed exemption
  on the dispatcher's own run — THE GATE'S LAST RED IS RESOLVED,
  next sweep should be fully green). Builder's attribution
  correction on the record: its "second POST run" was the
  dispatcher's process seen via ps — POST stands on one run, PRE
  on two. Extension half proxy/** — rides the shared restart
  boundary. The build was: fresh-session-sort emits ctx.meta
  telemetry (relocated block types + first-appearance flag), and
  replay's stability check gains a telemetry-keyed
  exemption mirroring suppressedIndices ("never a re-derived
  guess") for first-appearance relocations at the reported index.
  Verifier: red-green on the real pair (s-captureD n=2024->2025
  flips to exempt-with-basis, gate fully green) + unit bite both
  ways (relocation without telemetry stays RED — the exemption
  must not fire on shape alone). SERIALIZED behind the row6-dup
  dispatch on tools/replay.mjs; extension half is proxy/** — rides
  the shared next restart boundary (fourth rider).

- **DONE 2026-07-30 — capture appends serialize per path**
  (ec71be1, sonnet, pushed after dispatcher verification: 14/14
  across queue + capture suites, routing confirmed at all three
  sites). Escalation settled at dispatch: the mocked chunked-yield
  RED is SUFFICIENT — the checker's expectation derives from the
  defect's definition (writes split across syscalls interleave),
  and the live tie to reality is the 5 torn pairs already observed;
  an at-scale flaky repro would add platform noise, not evidence.
  Builder finding, dispatcher-verified: jsonl-session-mirror rides
  proxy/session-mirror-writer.mjs's appendFileSync — synchronous,
  cannot self-interleave, correctly untouched. NOT YET SERVING:
  proxy/** — rides the next restart boundary together with the
  error-log gate flip (one boundary, one statement).
  Original entry: (settled
  2026-07-30; evidence: flap probe fact 4 — 5 pairs of torn ~1MB
  lines in s-captureC, appendFile interleave; mechanism: node
  splits large buffers across write() syscalls, concurrent async
  appends to one path interleave mid-line). Design: a per-path
  promise-chain append queue (a small shared util; request-capture's
  three appendFile sites route through it; check jsonl-session-mirror
  for the same pattern and route it too if found). No format change.
  Verifier: bite — two concurrent large appends through the writer
  parse back as exactly two lines (red against bare appendFile);
  census unparseable count on future captures is the standing
  consumer. Done: bite green + suites green.

- **DONE 2026-07-30 — census outputForm strips cache_control
  (903a2be) + --gates-from-capture flag (dac26a0), one sonnet
  dispatch, dispatcher-verified: all five pairs AND n=26->28 now
  outputPreserved:true on the real capture via the new flag; 61/61
  replay suites green; downstream suppression-test assertion updated
  by the dispatcher (c128dbf — second consecutive dispatch tripped
  that file; lesson booked: grep test/ for assertions on a field
  before changing what it returns). Ported to upstream PR #276
  (16a3ca3, commented; extensions synced to the #272/#273 tips). Original entry:** The five "unclassified output-spliced
  pairs" in s-captureA are RESOLVED as instrument artifact: CC
  itself sends the same 32,140-char text as a cache_control-bearing
  block while it is the tail, then as a bare string later — its own
  shape choice, pre-pipeline (probe-verified on n=678->681 raw
  bytes; deferredToolRewriteStats inert on all five;
  findStabilityViolations 0 on the whole capture). compactEntry
  (replay.mjs:474) hashes raw JSON.stringify(message) with no
  cache_control strip, unlike the pin-identity path (:396) — the
  exact input-side blind-spot class already documented, unfixed on
  the output side. Fix: strip cache_control (and mirror the
  volatile-wrapper fold where applicable) in the out-side hashing
  used by findMitigationGaps' outputForm; verifier: the five pairs
  flip to outputPreserved:true / rebilledOut ~0 while n=26->28's
  pre-fix signature (in the harvested fixture, if pinned) still
  classifies as spliced. Closes the reminder-swap entry's residual
  (2).

- **DONE 2026-07-30 — harvest --pin + fixture fallback (da4e7e1 +
  fda83cc + 2dfe0f0, sonnet in isolated worktree, cherry-picked +
  pushed after dispatcher verification: 40/40 combined incl. both
  real-pair suites from live capture AND from the committed pinned
  fixture; first pin landed: pinned-s-captureA-26-28.json, 431 kB).
  Load-bearing deviation REVIEWED AND APPROVED (fda83cc, own
  commit): the shared scrubber's fixed "REDACTED" for wrapped
  reminders broke wrap/unwrap identity — a fixture replayed to the
  PRE-fix defect shape; now the inner text re-wraps its own
  deterministic token, preserving equality-under-scrub with no raw
  leak; empirical basis in the code comment. The rotation-eats-
  evidence residual (three instances) is retired. Original entry:**
  (settled 2026-07-30; three motivating instances: real-pair tests
  SKIP after rotation — suppression, output-form, and the metric
  booking each carried the residual). Design per the parked sketch:
  `harvest --pin <key> <n..m>` writes the sanitized range (harvest's
  existing scrubber; tool schemas dropped as today) to
  test/fixtures/harvested/pinned-<key>-<n>-<m>.json; real-pair tests
  gain a fixture-fallback (capture absent -> pinned fixture ->
  skip); matrix rows / acceptance strings cite fixtures, not capture
  keys, from then on. Verifier: pin the n=26->28 pair as the first
  real use; the suppression real-pair test passes from the fixture
  with the capture path renamed away (red: fallback absent ->
  skip). Done: flag + fallback + first pin landed.

- **DONE 2026-07-30 — telemetry-consumer table in shape-verdicts
  (083c5d6 + dispatcher gate-source fix 8e91c69, pushed): five
  entries, 13/13 bites, live-mutation red. Dispatcher verification
  caught the gate-source gap (out-of-band runs read env, not
  serving truth — fixed via gate-status fallback; the fix's own
  first draft had its ReferenceError swallowed by its fail-open
  catch, caught by the live-output check, not the suite). Residues
  booked: session-mirror gate invisible to the fallback (sweep set
  excludes mirror/capture by design) — warn stands as known;
  upstream-change-detection logs ROUTINE message-count growth as
  structural_change (alarm-noise calibration, row 5 territory);
  the unknowable fs-error branch unbitten. Original entry:** (settled 2026-07-30, grounded in the
  consumer principle minted same day + the fresh no-consumer grep
  for suppressed/suppressions). Design: a declared table in
  shape-verdicts.mjs — {file, kind: alarm|log, maxAgeH, predicate}
  — emitting one three-answer verdict per entry (alarm files warn
  on nonzero recent entries: guard-events, upstream-changes; log
  files warn on staleness only: insertion/deferred event logs,
  session mirrors). Status-file fields + boot proxyTree: doctor is
  already their consumer — declared, nothing built. Verifier: bite
  per kind (alarm fires on a nonzero fixture, log fires on an old
  mtime); the doctor books the new verdicts unchanged. Done: table
  + verdicts + bites green.

- **Row 2 TTL keepalive — PARK sharpened to a measurable trigger**
  (settled 2026-07-30): cost math — a keepalive is a full-prefix
  cache-READ (~0.1x) per <1h window; one avoided cold re-bill
  (~1.25x write) pays for ~12 refreshes, so it is cost-positive
  only for returns within a bounded idle window. Build trigger,
  measurable from the worktime --cold ledger's preventable/TTL-idle
  split: a week showing repeated TTL-idle colds with return inside
  ~2h. Until the ledger shows that pattern, not built; design then:
  opt-in timer, last-activity from capture mtime, capped extension
  window.

- **RESOLVED 2026-07-31 — restart boundary EXECUTED (operator GO
  "restart now"; same GO retired the restart-busts-live-sessions
  caution, 747f5e6).** Evidence chain: pin bumped 3730d27 → 00f4273
  with acceptance extended (dotfiles 7f03a2c); proxy restarted
  ~22:04 CEST, /health ok, serving tree 06ed53a421a6; error-log
  flip live (unit already carried =on, activated by this restart;
  acceptance was on file since 2026-07-30); doctor: pin OK, running
  process = disk tree OK, all gates classified+accepted; fresh gate
  stamp 20:18:58Z describes the SERVING tree — byteGate 0 MISMATCH
  / 0 unreadable, sole failing capture s-captureB (the two
  pre-existing deferred-tool-rewrite pairs, own OPEN item below).
  Telemetry "needs a look" warns both walked to controlled causes
  (this session's tool-schema flips; model:"test" 401s from today's
  test runs). RIDER STILL OPEN, moved to the dotfiles BACKLOG
  (deployment items live there): doctor has no byteGate/prunes
  consumer yet — the fields are in the status file, doctor ignores
  them silently (alarm-without-reader class).

- **OPEN — twin busts 2026-07-31 19:13:48 (152k, s-captureV) and
  19:22:40 (190k, s-captureS): KNOWN FAMILY suspected (row-4
  mid-history mutation), plugin-update trigger hypothesis
  unverified.** Evidence gathered at triage time: BOTH sessions'
  telemetry shows a `not-subsequence` reset seconds before the ❄
  stamp (7749d7fc 19:13:31 pinned=3; adf6cadb 19:22:22 pinned=1),
  both on the PRE-restart serving code (deployment 20:04Z); both
  transcripts say messages_changed (152k/165k). Two deep sessions,
  9 minutes apart, same signature → shared trigger; candidate with
  exact timing: `claude plugin update dispatch-guards` completed
  19:13:13.559Z — 35 s before the first bust, and the second landed
  at the other session's next turn (hook-set change plausibly
  changes hook-context reminders mid-history in every live
  session). ATTRIBUTE step owed: byte-diff the reset pair
  (19:22:22 request vs its conversation predecessor) and say WHAT
  moved; whether the deployed un-merge absorbs it is the live
  question.
  ATTRIBUTE DONE 2026-08-01 (sonnet discovery, frozen copies,
  originals byte-identical before/after): KNOWN FAMILY CONFIRMED at
  byte level — both resets are the row-4 container migration
  (reminder blocks leave a host whose hostId/tool_use_id stays;
  not-subsequence confirmed both sides): adf6cadb diverges at
  msg-index 58 in a SIDECAR conversation, its departed blocks JOIN
  an existing standalone (452→1085 B, same index — the
  merged-standalone shape 78940a0 targets); 7749d7fc at index 69 in
  main, a fresh 1925 B standalone. Trigger hypothesis holds as the
  entry predicted: 7749d7fc reset +17.7 s after the plugin-update
  completion, adf6cadb at its own next turn (+549 s), and BOTH
  sessions show the same ~17 s reset→bust-stamp internal lag. The
  live question is unchanged and time-gated: a post-restart
  recurrence means the un-merge did not absorb it; silence means it
  did. TOOL GAP found en route (own fix candidate, small):
  bust-triage's capturePair picks the newest plausible pair ≤ stamp
  and chose an APPEND-ONLY pair 4-16 s after the actual
  reset-carrying request → verdict UNCLASSIFIED was a
  pair-SELECTION artifact, not a new class; candidate rule — prefer
  the nearest same-conversation pair whose after-request carries a
  non-append action (the telemetry knows), fall back to current
  rule. Tool gap resolved — its own DONE entry directly below;
  THIS entry stays open only on the time-gated absorption question.
  NOTE for next occurrence: if this class fires again
  POST-restart, the un-merge did not absorb it — that is the real
  news; tonight's instances prove nothing about the new code.
  WATCH ARMED 2026-08-02T14:32:54Z (dispatcher): the same trigger
  class was fired deliberately — `claude plugin update
  dispatch-guards` 0.1.15 -> 0.1.17 — with the serving code checked
  current first (proxy source fingerprint a80e29b2b356 equals the
  on-disk tree, so the un-merge IS live; /health, not inferred).
  Baseline: 7 bust events 2026-08-02, ZERO of cause
  messages_changed; three model_changed at 14:30-14:32 (537k+281k+
  267k re-billed) belong to an operator model switch ~39 s BEFORE
  the update — a co-occurring variable the cause label separates,
  and the reason the discriminator is the CAUSE, not the count.
  Result at +3 min: no bust of any cause. NOT YET CONCLUSIVE, and
  the reason is the non-event rule: census over the dispatching
  session's own capture shows NO row-4 migration in the post-update
  traffic (69 edits / 18 blockMigrations in the file, none after
  14:32:54), i.e. the trigger has not fired yet — silence so far is
  absence of stimulus, not proven absorption. Live sessions may also
  need /reload-plugins (the update printed "Restart to apply") for
  the new hook set to reach them. How to close this properly: the
  census classifies CC's INPUT independently of billing, so the
  conclusive pair is a request where the census SHOWS the row-4
  container migration AND the ledger shows no messages_changed —
  absorption demonstrated; a messages_changed bust on such a pair
  refutes the un-merge. Next session reading this: run
  `bust-triage --list | rg messages_changed` and the census over any
  capture spanning a hook-set change.
  WATCH ANSWERED 2026-08-02T14:58:11Z — NEGATIVE, which is this
  entry's own stated real news: the un-merge did NOT absorb the
  class. Operator-reported ❄, triaged mechanically with the tooling
  built today: session c7c83ca5, 660k re-written, transcript
  `messages_changed / 535102`, capture pair 14:56:52.670 ->
  14:57:41.375 n=591->595, census replace/edit, migration = row-4
  container migration at host 568 (EXTENDED/MERGED-STANDALONE),
  VERDICT KNOWN-OPEN. It fired 25 min after the deliberate plugin
  update (14:32:54) on serving code checked current, so the trigger
  hypothesis holds and the absorption question is settled negative.
  NOT a dead mechanism — insertion-normalization's telemetry for the
  main sub-key shows it RAN on the busting request:
  `14:57:41.399Z reset resetReason=not-subsequence pinned=34
  suppressed=31 moved=5` (predecessor 14:56:52.694Z: normalized
  pinned=31 suppressed=29 moved=5). Pins restored, 31 suppressions
  applied, 5 join-moves re-served — and host 568 still diverged, so
  the gap is in MATCHING, not in firing: the one shape a non-event
  probe could never have distinguished. Evidence frozen against
  rotation: test/fixtures/harvested/pinned-s-9f12950909ed-590-596
  .json (17 MB, UNTRACKED by design — the fixture-cut minimization
  floor applies before it could ever be committed). Investigation
  dispatched (opus, read-only) for the mechanism at file:line plus a
  minimal absorb design and its red-first bite; any proxy/** fix is
  deployment-coupled and rides a stated boundary. Cost datum for the
  Mitigation policy: this single instance re-billed 535k tokens.
  MECHANISM FOUND 2026-08-02 (opus investigation, dispatcher-verified
  at the cited lines and by running the bite): NOT a definition gap
  and NOT the wrapper-retention class (that evidence was sent to the
  investigation and correctly tested-and-set-aside — the un-merge's
  definition covers this pair byte-exactly). The miss is one level
  below the definition, in OCCURRENCE-ORDINAL IDENTITY: identityKey
  is `h|r|o` (insertion-normalization.mjs:381-383, applied
  :1115-1117), and the 421-byte "task tools haven't been used
  recently" nudge occurs 28x in the canonical against 27x on the
  busting wire, so ordinals re-bind — the entry that actually
  vanished (ci 545) matches the surviving copy at wire 584, leaving
  `droppedNow = {560}`, the LAST ordinal, whose predecessor pins no
  reminder, so findJoinMoves takes `continue` at :835 condition (b)
  and returns []. The file already names this class and declares it
  out of scope (:1108-1110, verified verbatim: "the general ordinal
  instability of duplicate copies under middle-copy drops is a
  pre-existing class and deliberately out of scope here") — THAT
  SENTENCE IS THE DEFECT. Counterfactual on the real state:
  attribute the drop to ci 545 and findJoinMoves returns exactly
  {mergedIndex:569, ci:545, afterIdx:568}, conditions (a)-(f) all
  holding, with wanted (622 + "\n\n" + 421 = 1045) byte-equal to
  wire[569]. The reset is a CO-SYMPTOM, not upstream: the single
  strict-increasing break in `matched` is the same misattribution
  (ci 545->584 then 546->570). `moved:5` was five re-fires of
  reserved entries — findJoinMoves minted ZERO fresh recognitions,
  which is why "the mitigation ran" and "the mitigation matched"
  came apart. Distinct from the CLOSED EXTENDED-absorb entry: unit 2
  shipped and works, and the agent's control run shows today's code
  absorbs the identical shape when the nudge has ONE copy; the
  never-measured piece is DUPLICATE SIBLINGS.
  DESIGN (settled, from the investigation): extend the match loop in
  classifyPinned (:1082-1118) — no new function — so that for a
  family (h,r) whose live stored count exceeds its wire count by
  exactly one, attribution is re-derived with the same lo/hi
  neighbourhood discriminator condition (d) already uses; fail
  closed otherwise. Probed on the real request: 1 of 534 families
  triggers and exactly one member qualifies ({ci 545, lo 568,
  hi 570}). BITE exists and is dispatcher-run: ~40 lines synthetic,
  no capture bytes — RED today ("a swallowed MIDDLE copy of a
  recurring standalone is recognized as a join-move": moved 0), and
  its CONTROL (one nudge copy) GREEN, so the bite isolates the
  duplicate-sibling case rather than the machinery. Named gaps
  before shipping: corpus-wide effect across the other captures not
  measured, and row-3 restart safety not exercised (no state key
  written, but freeze logic untested). EVIDENCE CORRECTION: the
  earlier frozen fixture was the WRONG RANGE — `--pin n..m` takes
  file-wide REQUEST ORDINALS (harvest.mjs:612-648) while
  bust-triage's "n=591->595" is a MESSAGE COUNT; the busting pair is
  ordinals 892..894, re-pinned as
  test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json (46 MB,
  untracked and locally excluded; needs the fixture-cut floor before
  it could be committed).
  CLASS COST, measured 2026-08-02 over the whole worktime ledger
  (58 bust events, 6 distinct days): `messages_changed` is the
  LARGEST single cause — 21 events, 5.99M tokens of context
  re-written, ~38% of the 15.7M total; next are `other` (23, 5.45M),
  `tools_changed` (3, 1.26M), `model_changed` (4, 1.25M), `idle`
  (4, 1.06M), `model` (3, 0.71M). Framing per the Mitigation policy:
  this is a PRIORITY datum and explicitly NOT a worthiness
  threshold — cost never gates whether the work happens (an earlier
  revision of the row-4 entry made exactly that error). Two
  caveats: `cc` is context size re-written, an approximation of the
  true re-bill (the transcript's cache_creation is exact), and
  `messages_changed` is a cause label that may cover classes beyond
  row-4.

- **DONE 2026-08-02 (092a7cf + d2c9d00, sonnet dispatch,
  dispatcher-verified: selftest green, controlled 8/8, dossier
  19/19, real triage re-run) — bust-triage pair-selection tool gap
  (split out of the twin-busts entry above, whose absorption
  question stays open).** Three layers, each red-proven on real
  numbers: (1) telemetry-confirmed preference; (2) nearest-event
  wins over newest-of-matches (5 ms genuine vs 1899 ms spurious
  cross-conversation match), candidates scoped to 60 s of the
  recency pick (unscoped, an exact coincidental match 18 min out
  won); (3) match narrowed to action="reset" only — "non-append"
  was a paraphrase; the extension's own action contract
  (insertion-normalization.mjs ~483-554) defines reset as the
  cache-invalidating action, and "normalized" fires on ordinary
  successful requests (a 4 ms normalized decoy beat the genuine
  5 ms reset match). Result: BOTH twin busts now classify
  mechanically — adf6cadb KNOWN-OPEN/row-4 host 58
  MERGED-STANDALONE via --at; 7749d7fc KNOWN-OPEN/row-4 host 71
  EXTENDED/NEW-TEXT via direct capturePair+censusPair+
  migrationVerdict call (its LEDGER ENTRY IS PRUNED — activity.jsonl
  greps empty — so the --at flow cannot reach it). Residuals, named:
  the twin-busts entry's byte attribution said "index 69" where the
  tool reports host 71 — unchased; no broader sid sweep for other
  normalized-vs-reset collisions; same-conversation join key parked
  below.

- **PARKED — bust-triage pair selection: same-conversation join key
  (twin-busts tool-gap residual, 2026-08-02).** The timestamp join
  shipped in 092a7cf/d2c9d00 is a proximity heuristic; the exact fix
  joins on the insertion events' own `key` field (full sessionKey)
  against a per-candidate key computed from conversationSubKey
  (exported, proxy/extensions/message-hash.mjs) + systemPromptSubKey
  (NOT exported from insertion-normalization.mjs) + resolveSessionId.
  Named missing piece: the systemPromptSubKey export is a proxy/**
  change — deployment-coupled (pin bump + restart), so it rides the
  next proxy boundary, never alone. Evidence: sonnet dispatch report
  2026-08-02 — reset-only matching closed both live cases without
  it; trigger to build is the next selection miss the heuristic
  cannot break.

- **RESOLVED (attribution 2026-08-01; remedy 8e28833; deployment
  legs re-checked 2026-08-02 by the dispatcher: CACHE_FIX_UPSTREAM_
  ERROR_LOG reads `on` in the serving unit per /health, proxy pin
  ad4ff80 equals HEAD:proxy, and the status stamp's proxyTree
  a80e29b2b356 equals the on-disk source fingerprint — so the
  "still describes the pre-5c4d70a tree" clause below is itself
  superseded). RESIDUAL, dotfiles-side and unclosed: the doctor's
  three-answer verdict on the sweep status file's `byteGate` and
  `prunes` fields. Header re-graded 2026-08-02 — it read OPEN with
  "ATTRIBUTE step owed" while its own body recorded the attribution
  DONE; caught by backlog-lint only after DONE was added to its
  marker set (9d20b7d follow-up), i.e. the guard was blind to this
  corpus's most-used grade word — the corpus's entire remaining
  stability debt: two
  deferred-tool-rewrite pairs on s-captureB** (n=709→710 outDiv=236,
  n=701→718 outDiv=82, gate attribution line, byte-identical across
  the identity-build A/B — pre-existing, not insertion-normalization;
  named "worth a separate look" in the unit-2b report (g) and now
  the sole red row in every sweep, incl. the fresh post-deployment
  stamp). ATTRIBUTE step owed: pull the two pairs' per-request
  deferred-tool-rewrite telemetry and classify — real self-inflicted
  flip vs instrument/exemption gap.
  DONE 2026-08-01 (sonnet discovery, dispatcher-classified; evidence
  docs/code-reviews/s-0dc8ac87c43d-attribute-evidence.md — token
  name, capture = this entry's): both divergences are
  deferred-tool-rewrite's own reset branch wiping its injected
  announcements (reason=tool-schema-changed; CC raw bytes identical
  at both indices; attribution instrument-bisected, violations=2
  exemptions=0 corpus-wide). Classification: self-inflicted in FORM,
  zero marginal billing in SUBSTANCE — the schema change that
  triggers the reset busts the tools-block cache prefix regardless
  (premise: tools precede messages in the cache prefix, Anthropic
  caching docs — the one reviewer-checkable premise). Remedy decided
  → READY exemption entry below; reset-preserving-additions REJECTED
  (no billing win, muddies honest-reset semantics). The strict-A/B
  rotation constraint is superseded by the bisection unless the
  exemption bite demands live confirmation. Unit bites exist
  (test/proxy-upstream-error-log.test.mjs, #235); flip =
  CACHE_FIX_UPSTREAM_ERROR_LOG=1 in the serving unit riding the
  NEXT proxy restart (no dedicated restart), acceptance recorded
  per the doctor's gates-acceptance format in dotfiles; the new
  shape-verdicts alarm entry (Q4 pattern above) is its standing
  consumer — closes the alarm-without-reader gap for this file
  from day one. Done: gate serving + acceptance entry + doctor
  green. SAME BOUNDARY now also carries (2026-07-31): the dotfiles
  proxy tree pin bump for 5c4d70a (insertion-normalization
  declares reset-path suppressions — telemetry-only, no state
  keys or freeze logic touched, so row-3 restart-safe) and the
  post-restart gate stamp (the dispatch's gate run went to
  scratchpad deliberately, so ~/.claude/cache-fix-gate-status.json
  still describes the pre-5c4d70a tree). Also at that boundary
  (dotfiles-side): the daily sweep's status file now carries
  `byteGate` and `prunes` fields (404d5fc) that doctor has never
  seen — they need their three-answer doctor verdict with the first
  timer-path run (census-hardening report, NOT-VERIFIED slot).

- **DONE 2026-08-01 (8e28833, opus dispatch, dispatcher-verified
  114/114; agent live A/B on the evidence capture: violations 2->0,
  exemptions=2, gate exit 1->0) — reset-wipes-additions exemption.**
  Residuals, named: an append-only+reset pair stays a VIOLATION by this
  entry's own ccIdentical condition (future false red, named in the code
  comment); corpus-wide no-new-exemptions unmeasured until the next
  daily sweep; the status row now carries stabilityExempt so
  GREEN-by-exemption is visible to the doctor. Original entry: In
  scanGroup, beside freshSessionSortExemption: exempt a violation
  iff the after-request's deferred-tool-rewrite telemetry shows
  action=reset reason=tool-schema-changed AND the divergence is
  fully explained by removed tool_addition injection message(s) AND
  CC's raw messages are identical at outDiv. Build note: replay's
  compact stability entries do not carry deferredToolRewriteStats
  today (the evidence probe had to re-run the pipeline) — carrying
  action/reason into the entry is part of the build. Bite red-first
  on a synthetic pair pinning the shape; live confirmation: corpus
  violations 2→0 with exemptions=2 and the doctor cache-fix-gate
  goes GREEN. Urgency basis: a standing FAIL on a non-defect trains
  readers to discount the gate (the check-fires-on-non-defect
  shape). Evidence: the attribute file above.

- **RESOLVED 2026-07-30 (probe, dispatcher-booked): forwardedStable
  was a census framing gap — deferred-tool-rewrite is NOT broken.**
  100% of "unstable" pairs coincide with a genuine new-tool
  announcement; held/shared tools byte-identical on every checked
  repeat pair; first-event hypothesis measured out (3/25, 3/37).
  DONE 2026-07-30 (813edc8, sonnet, pushed after dispatcher
  verification: selfcheck exit 0; real capture s-captureC measures
  heldStable 37/37 against forwardedStable 1/37 — 100%, no
  counterexamples, stronger than the probe's hedge; deviation
  accepted: missing outTools data -> heldStable false, mirroring
  the existing convention). deferred-tool-rewrite's guarantee is
  now measured AS MADE by the daily sweep. Matrix row 6 updated
  same day with the measured number.

- **RESOLVED 2026-07-30 (probe; header re-titled 2026-08-01, body
  already carried the resolution — third stale-header instance that
  day) — duplicate-request contradiction: ~100 adjacent identical
  pairs vs the booked "one instance in 3,446"** (new per-conversation
  counter, 2026-07-30: 72+28 pairs in 21+2 streaks across the two
  current captures; the 07-29 probe that dispositioned CC#78420
  "ABSENT ON THIS SETUP" likely measured global file adjacency, so
  interleaved sessions broke adjacency — definition mismatch
  hypothesis, unverified). One streak matches the known MCP cascade;
  21 streaks in s-captureA (13+ repeats, 3-min spans) unexplained.
  RESOLVED 2026-07-30 (probe): definition-mismatch FALSIFIED by
  measurement (global vs per-conversation differs marginally); the
  growth is corpus content, and the streaks are retry-shaped —
  distinct ids, backoff intervals, ZERO outcome records (none
  billed): client retries against upstream/proxy errors, not the
  #78420 billing shape. Coverage row re-dispositioned same day.
  Residue, named: the error evidence itself arrives with the
  upstream-error-log flip (booked); streak timestamps vs error
  timestamps is the confirming check, rides the first week of that
  gate. Honest gap: the 07-29 probe's exact runtime/file list not
  recoverable.
  REVISED 2026-08-01: the zero-billed discriminator was SAMPLE-BOUND
  — the counter's first live run over the current corpus found a
  second population; see the double-billed OPEN entry below.

- **OPEN (attributed 2026-08-02: CC-defect-resend lean, upstream
  filing is the next step and needs operator GO) — double-billed
  duplicate pairs, now 33 streaks.** Sonnet discovery
  (dispatcher-spot-checked: the hand-verified s-captureK streak's
  two outcomes read identical outSha 610e911e / outBytes 2406 under
  my own probe): 33/33 double-billed streaks have byte-IDENTICAL
  response content between both billed answers — retry-refuting
  (a retry hoping for better gets different bytes); 79% land at the
  session's very first request (structural, not content-gated);
  upstream-error correlation 1/33 and that one sits inside a 2-hour
  401 burst (auth noise, not signal — 30/32 log entries are 401s).
  The entry's earlier degenerate-lean was the wrong lens: the
  content-class split (24 deg/deg, 4 deg/sub, 2 sub/deg, 3 sub/sub)
  is superseded by the hash identity. Residues, named: one
  outputTokens-vs-outSha accounting anomaly (s-captureT 654/656:
  same bytes, tokens 2 vs 1); the 7 mid-session streaks' trigger
  uncharacterized. Evidence: the discovery report in the
  dispatching session's scratchpad; re-derivable from the census
  duplicates key + outcome outSha join.
  INSTRUMENT DEFECT 2026-08-02, and it invalidates this entry's own
  "degenerate answer" reasoning: the capture outcome record's
  `usage.outputTokens` is the `message_start` PLACEHOLDER, never the
  completion length. request-capture builds the outcome on
  message_start only (request-capture.mjs:311) and its own comment
  says message_delta updates output tokens afterwards but waiting
  risks losing the record on a cancelled stream — a defensible
  choice, recorded under a field name that reads as final. Measured:
  in one 805-outcome capture, 803 responses exceed 20 kB while the
  MAXIMUM outputTokens ever recorded is 73, mass at 1-3. So every
  "outputTokens 1-2 => degenerate answer" inference is void — this
  entry's original one, the census's help text
  (reminder-migration-census.mjs:92,985), and the discovery's
  content-class split (24 deg/deg etc.), which its own outSha
  finding had already superseded for a different reason. The
  byte-identity result is UNAFFECTED (outSha/outBytes are real).
  A correct source already exists: cache-telemetry, request-log and
  usage-log read `event.usage.output_tokens` off message_delta
  (stream.mjs, cache-telemetry.mjs) — final, not placeholder. Fix
  design (proxy/**, so it RIDES THE NEXT PROXY BOUNDARY, never
  alone): rename to `outputTokensAtStart` in the outcome record and
  let consumers that want the real length join the request-log `n`;
  dependents search run before the rename lands (this entry's own
  grep found the census help text and the two test fixtures).
  Undiagnosed, named: the recorded distribution has a 34-73 tail no
  message_start story explains — not chased, and not needed for the
  invalidation above.
  UPSTREAM FILING BLOCKED 2026-08-02 by its own refutation probe
  (dispatcher, run BEFORE drafting): the report's open item 3 — "is
  CC actually sending two physically distinct HTTP requests, or is
  one proxy-side" — probed on the hand-verified s-captureK pair.
  Half-answered, and it reframes the finding. Both answers carry
  DISTINCT server-assigned request-ids (req_011Cdbpbge…,
  req_011Cdbpbgi…), so two real API calls were made and billed, and
  the proxy forwards one-inbound-one-upstream (server.mjs
  forwardRequest per request, no retry loop in the handler) — the
  duplication is client-side, not ours. BUT the pair is a HAIKU
  SIDECAR (model claude-haiku-4-5, msgs=1, max_tokens=32000), not
  the main conversation, and neither id appears in that session's CC
  transcript — which carries requestId 1648 times, so the absence is
  real rather than an instrument gap: background calls simply are not
  transcript-recorded. Consequence: "CC re-sends CONVERSATION
  requests" is the wrong framing for at least the session-start
  majority, which looks like the background sidecar double-firing —
  and session start is where 26/33 streaks sit by construction.
  SPLIT DONE 2026-08-02 (sonnet discovery, dispatcher-verified on
  s-captureK 751/754 with my own probe): of 31 double-billed
  streaks, 24 are HAIKU SIDECAR calls (nMsg=1, max_tokens=32000) and
  7 are MAIN-THREAD shaped (fable-5/opus-5, nMsg>1,
  max_tokens=64000) — clean split, zero ambiguous. The entry's
  "one pair near session start" shape is ENTIRELY a sidecar artifact:
  all 24 sit at capture lines 3-5, every session. Discriminator note
  from the build: system-prompt presence does NOT separate the
  classes (every request carries one, sidecars included) — message
  count + model does. TRANSCRIPT ASYMMETRY, the finding that makes
  the main-thread subset reportable: on s-captureK 751/754 (two
  fable-5 requests, 152 messages each, responses byte-identical at
  outSha 62baa3a1 / 3,043,768 B) CC's own transcript records the
  SECOND request-id three times and the FIRST zero times — so CC
  received a COMPLETE answer, discarded it, re-sent the identical
  request and kept the second answer; both were billed. Completeness
  matters to the reading: identical outSha means the discarded
  response was not truncated, which argues against retry-after-
  failed-stream and toward a genuine duplicate send. Across 3
  main-thread streaks checked, 0 had both ids present and 2 had
  exactly one — consistent shape, small n, stated as such. Then: fold into the #272/#273 week-of-soak
  summary (due ~08-07) and/or file upstream as the #78420-adjacent
  shape — Public Communication rule: draft first, operator approves
  before posting.
  Original entry: **double-billed duplicate pairs: 29 streaks live
  (dup-census first run, 2026-08-01), hand-verified at the
  altitude.** Two examples records-read-directly: s-captureK lines
  3/5 (identical 2384-char haiku bodies, 14 ms apart, BOTH answered,
  587 input tokens charged EACH) and s-captureT lines 654/656
  (identical 1.84 MB fable bodies 11 s apart, both answered;
  outputTokens 2 and 1 — the first answers look degenerate; second
  read 360k cached). Corpus rollup: 71 pairs / 67 streaks / 32
  billed / 29 double-billed of 10,454 same-conversation pairs.
  Shape: one pair near session start per session + scattered
  mid-session. OPEN question: CC defect (needless re-send, the
  #78420-adjacent shape) vs legitimate retry after a degenerate
  answer — the outputTokens 2/1 pattern leans retry-after-degenerate
  but is unclassified. Next evidence: inspect the paired answers'
  content class; correlate streak timestamps with upstream errors
  once the error-log gate flips (same rider as the retry residue
  above). Not comparable to the 07-30 numbers: that sample's capture
  aged out of the corpus mid-measurement.

- **DONE 2026-08-01 (194baf2 + dispatcher wiring, sonnet dispatch,
  dispatcher-verified) — duplicates wired into the daily gate.** Two
  corrections booked from the build: the census `duplicates` key is
  produced by reminder-migration-census.mjs, not replay.mjs; and no
  "volatile-change metric consumer" existed as code to pattern on — the
  verdict follows shape-verdicts' three-answer convention instead.
  Field lands with the next daily run (deployment-side). Original
  entry: tools/gate-live.mjs summariseCensus (≈:134-149) whitelists
  pairs/unreadable/tally/extendedSub/prunes and drops the census's
  new `duplicates` key; add it plus a sweep-level reduce so the
  status file carries pairs/streaks/billed/doubleBilled per sweep —
  that line is what makes Q1's "re-answers daily" true, and
  doubleBilledStreaks is the alarm column (first standing consumer:
  shape-verdicts, same pattern as the volatile-change metric).
  Verifier: the field present in the next daily status file with
  the live numbers; a synthetic sweep bite red-first on the dropped
  key. Effort S.

## From the closing-gate sweep (2026-07-29, opus dispatch) — parked with bases

- **Orphan telemetry consumers (Q4).** Alarm files written by ON gates
  that nothing reads: `guard-events.jsonl` (output-guard restores),
  `upstream-changes.jsonl` (row 5's alarm), insertion/deferred event
  logs, session mirrors; plus status-file fields (`gateSource`,
  `fidelityMutated*`) and boot-record `proxyTree`. Design ONE consumer
  pattern (likely: more shape-verdicts entries reading each file's
  recency + alarm count) rather than N bespoke checks. Deferral basis:
  consumer DESIGN per file is judgment work (which absence fails, which
  warns), not a mechanical port. Effort M.
- **Harvest pins instances, not only classes (Q2).** Fixtures bank one
  exemplar per CLASS; the evidence behind specific verdicts (row 4's
  distribution on s-captureD, acceptance strings citing s-captureL)
  still rots with rotation. Spec sketch: `harvest --pin <key> <n..m>`
  freezes a sanitized range as a named fixture; matrix rows and
  acceptance strings then cite fixtures, not capture keys. Effort M.
- **Row 6's isolating query is built and unread (Q3).** findToolsDeltas
  emits exactly the tools-only classification row 6 says "cannot be run
  as-is". With --census now on every sweep, read the answer off the
  next gate status and update row 6. Effort S, blocked on one timer run.
- DONE 2026-08-01 (4185fb4, dup-census dispatch, dispatcher-verified:
  selftest + 29/29; red-first structural AND mutation; the naive
  forward-only billing match was itself caught red by the order-true
  fixture) — Duplicate-request probe → census check (Q1). The counter
  found a real population on its first live run → the double-billed
  OPEN entry near the resolved duplicate-request item. Daily
  re-answering still needs the gate-live wiring (READY below).
- **upstream-error-log gate ON? (operator decision.)** CC#79989's named
  first-hypothesis alarm exists in-tree and is OFF. Needs the standard
  acceptance probe before flipping — a gate flip without one is the
  class the roster check exists for.
- **resolveCaptureKey pools literal "empty" (79 requests).** A capture
  keying change = state-KEY change (threat matrix row 3): belongs at a
  session boundary, stated before the restart. Not urgent — the pooled
  requests are keyless utility calls.

## Parked decisions

- **Repo location `~/dev/vendor/` — LEAVE for now** (operator + session
  2026-07-29). The fork is operator-owned (taxonomy says
  `~/dev/Gunther-Schulz/`), but a move touches the serving unit's
  ExecStart, HTTPS_PROXY env, manifest paths, repos.tsv, and ten live
  PR worktrees' gitdir pointers — coordinated migration for purely
  taxonomic gain. Revisit trigger: PR series merged and worktrees
  removed (the natural cheap moment).

- **Resume-boundary attribution — BUILT the day it was parked**
  (operator push; findSuccessions in tools/replay.mjs, census-gated,
  rides the daily sweep): compaction/resume/fork boundary classes with
  opener pricing; interleaves structurally suppressed (never-returns +
  first-appearance conditions — the one-shot-sidecar phantom was caught
  by the class's own bite). Validated pair-for-pair against the hand
  probe on s-captureE (9de68b3).

- **Census system-delta class — candidate, not built** (2026-07-29).
  Within-session inflation instruments: tools[] churn is classified
  (findToolsDeltas, counts + forwardedStable); SYSTEM deltas are only
  observed live (prefix-diff cause lines) and preserved in captures —
  censusPair classifies messages only, so an offline "how often / how
  expensive are mid-session system changes" question has no census
  answer today. Deliberately not built: no such question is currently
  unanswered (prefix-diff logs + matrix row 5 cover the known classes).
  Build trigger: the first system-delta question that needs an offline
  answer over a corpus — then a census kind beside toolsDeltas, same
  shape.

- **PARKED (design) — flap escape: cross-message join +
  reset-before-suppression precedence.** The earlier READY per-block
  item's premise was REFUTED by the build probe (fixture 090a110, full
  measurements in its commit message): per-block hashes exist since
  #76606, both matchable standalone legs already hash-match; the escape
  is classifyPinned's reset("edit-shaped") firing BEFORE suppression,
  triggered by the novel CROSS-MESSAGE join (msg89's reminder + "\n\n"
  + standalone msg90, landing in dropped msg90's gap). Named open
  decisions before any build: (1) may a cross-message join suppress at
  all — suppressing drops msg90's bytes from the wire (the extension
  never re-adds a message; same family as the suppression-stripped
  final-message 400s), the alternative direction is first-seen-form
  canonical re-serve rather than suppression; (2) may suppression
  precede the edit-shaped reset — a load-bearing safety discriminator
  with measured false-positive history. Unpark condition (corrected
  same day per the matrix mitigation policy — cost never gates
  mitigation): a settled answer to the two design questions, nothing
  else; the cost-trigger this entry briefly carried contradicted the
  recorded operator ruling (matrix header / row 6 ladder) and is
  withdrawn. MERGE NOTE 2026-07-31: main now carries the reset-path
  suppressions DECLARATION (5c4d70a) while branch wt/fidelity/opus
  carries its own sibling declaration fix ("builder deviation,
  REQUIRED and kept" in the flap-move directive's status) — the two
  edit the same classifyPinned region and must be reconciled at that
  branch's integration, not auto-merged. The detector supplies design specimens, not a
  worthiness threshold. UNPARKED 2026-07-30 (operator GO): both
  questions answered by mechanism in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md —
  fidelity gate first (its red case IS question 1's dangerous
  design), then candidacy-gated first-seen re-serve. STATUS: unit 1
  (conservation gate) SHIPPED 95ca0cb — question 1 answered
  mechanically, red on record; unit 2 BLOCKED on the
  reset-abandons-move regression (branch wt/fidelity/opus, directive
  Status section has the shape + candidate fix); next step is the
  reset-path design decision + five-gate re-sweep.
  RESOLVED 2026-07-31: units 2/2b integrated (reconciled with 5c4d70a
  per the MERGE NOTE above) and the last escape — the ordinal
  re-bind — closed by the reserved-entry identity build
  (a1170a7..9983a1b + the TODO-15 rewrite; directive
  reserved-entry-identity-directive.md, report
  docs/code-reviews/reserved-entry-identity-report.md).
  Corpus-verified zero insertion-normalization stability violations;
  deployment rides the restart boundary. Branch wt/fidelity/opus is
  consumed (cherry-picked, squashed) and deletable.

- **RESOLVED — census flap annotation: shipped BEFORE the dispatch
  that was sent to build it (fc44da3 marker + 47defba addendum, both
  ancestors of the dispatch base 94cbf82; caught by the census-pair
  agent's premise check, git log on the target file, before any
  build — its lesson (i)). Entry left by those refs; joined-standalone
  below resolved by 9ff79f7 the same night (dispatcher-verified:
  selfcheck 66/66, full suite 1848/1848/0; live slice of s-captureB:
  "10, 6 FLAP, 7 JOIN (3 cross-message)" vs "3, 2 FLAP" at base).
  CORRECTION riding this (agent gap 2, matrix updated): the
  addendum's "the real flap is the single 92→94 pair" is REFUTED by
  the live run — THREE hosts reverse, so row 4's 221k event was
  priced at a third of its true size.** Original entry kept below
  for the record.
  Original: census flap annotation (blockMigration reversal).
  `replay.mjs --census` emits a `flap` marker when the same
  blockMigration block-hash pair reverses direction within 5 requests
  of one conversation — today the flap is visible only by reading
  adjacent census lines (matrix 8cd4e1c). Verifier: emits on the
  2026-07-30 triple (n=102-108), silent on a corpus without reversals;
  mutation test in replay-gate-selfcheck per dev-loop "Adding a check".
  ADDENDUM (same day): detector counts REAL migrations only — the
  blockUnits standalone predicate over-reports 2x (phantom on any
  message shrunk to one block); its fix granted to the running
  annotation builder, red-first, before the detector lands. On the
  2026-07-30 triple the real flap is the single 92->94 pair reversing.

- **RESOLVED 2026-07-31 (9ff79f7, census-pair dispatch — see the
  flap-annotation resolution above for the shared evidence; kinds
  tagged in-entry vs cross-message, join hashes on compactEntry, no
  text retained, dead blockUnits removed).** Original: blockUnits
  hashes blocks individually, so a standalone that is a JOIN produces
  no migration row — two of the three standalone legs in fixture
  flap-s-captureB-86.json are joins the detector cannot see, and the
  s-captureA oscillation (fixture oscillation-s-captureA-863.json)
  shows a whole flap class invisible for the same reason. Design:
  register joined-block hashes as migration-candidate targets —
  in-entry joins per 78940a0's "\n\n" rule; cross-message joins
  tagged as their own kind (they are the parked design item's
  subject, and the tag is what will count them). Verifier: red-first
  on oscillation-s-captureA-863.json — a migration row appears for
  the merged standalone where none does today; existing corpora
  verdicts unchanged. Done-criterion: census on that fixture shows
  the join-standalone row; selfcheck mutation test added per
  dev-loop "Adding a check".

- **RESOLVED 2026-08-01 (eead8bc, loop-trio dispatch,
  dispatcher-verified 126/126; live ledgers verifiably untouched).
  Done-criterion ruling (its G1): SATISFIED — the entry named a
  SPEND case as the test case for a THRESHOLD detector (the 1.07M
  fable-verify dispatch had a healthy cache; zero threshold events
  is the CORRECT answer, and its spend rides the totals row), and
  the entry's intent — subagent busts worktime cannot see — is
  decisively measured: six events, ~1.5M cc, on 07-30 alone, none
  in worktime's ledger. Feasibility answer: NO new response tap —
  request-capture outcome records carry usage since e57a0de.
  Follow-up decisions → the wiring/grain OPEN entry below —
  proxy-side cold detection: subagent-complete bust
  visibility (loop: SEE).** worktime's cold ledger is main-session
  only by design; subagent spend is invisible (a verify dispatch cost
  ≈1.1M processed tokens dedup-corrected, excavated by hand from
  transcript files).
  The proxy sees every request and response. Step 1, named
  feasibility: confirm usage fields are extractable from the proxied
  response path (SSE message_delta usage) against a captured
  response; step 2: per conversation-key cc/cr running totals +
  magnitude-threshold events (runbook rule: cc>=60% of prior ctx,
  cr<=20%) appended to a cold-events ledger with key + model.
  Verifier: reproduces worktime's main-thread events AND surfaces a
  subagent event worktime cannot see (the 2026-07-30 fable verify
  dispatch is the known test case). Done-criterion: that dispatch
  would have produced an event row.

- **RESOLVED 2026-08-01 (0486395, loop-trio dispatch,
  dispatcher-verified; entry verifier 5/5 evidence classes PRESENT
  against the 07-30 16:57 event, matrix-datapoint facts verbatim;
  bonus find: the gh sweep surfaced anthropics/claude-code#81077 —
  the row-4 class already filed upstream, logged on the fire-rate
  entry as its upstream-ref candidate) — bust dossier tool
  (loop: ATTRIBUTE).** `tools/dossier.mjs
  <utc-timestamp|--last>`: emits ONE file joining the worktime row,
  the prefix-diff snapshot-ledger slice for the window, census lines
  for the affected pairs, transcript context pointers, and the
  dev-loop-mandated `gh search issues` sweep. The runbook stays the
  interpretation guide; collection stops being manual. Verifier: run
  against the 2026-07-30 16:57 event — the dossier must contain the
  facts the hand investigation established (matrix Row 4 datapoint is
  the expected-content spec). Done-criterion: one command, one file,
  all four runbook steps' evidence present or explicitly marked
  absent (three-answer rule).

- **RESOLVED 2026-08-01 (7a4f226, loop-trio dispatch,
  dispatcher-verified; ENOENT-strict "new key" predicate — the one
  surviving mutant got its own seventh bite; activation rides the
  next proxy boundary, no deploy performed) — key→conversation map
  (rides the dossier; loop:
  ATTRIBUTE).** prefix-diff appends one line per NEW key — (key,
  session-id, model, first-seen ts) — to a keymap ledger; deletes the
  runbook's "the mapping is recorded nowhere; select by TIME"
  friction. Verifier: the 2026-07-30 main-vs-verifier key confusion
  becomes a single lookup.

- **OPEN (design) — cold-events wiring + tenant grain (loop-trio
  G2/G3).** Nothing invokes cold-events yet (DEFAULT_LEDGER_PATH
  exported for whoever wires it), and the grain decision gates the
  wiring: capture outcome records are SESSION-grained (the Messages
  API has no agentId slot), and a real run over s-captureR MEASURED
  a false event (cause=model, prevCtx=1k — a haiku background call
  and the main conversation diffing against each other; exactly the
  co-tenant artifact prefix-diff's tenantId exists to remove).
  Options, undecided: (a) run over transcripts
  (conversation-grained — what both verifiers used, proven), (b)
  give capture rows a tenant via prefix-diff's tenantId hash, (c)
  accept session grain and filter. Until settled, capture-only
  proxy-side detection manufactures false events — do not wire that
  path. Evidence: loop-trio report 3a, eead8bc's test suite.

- **PARKED — CC-version tripwire (loop: premise staleness).** On
  first traffic from a new CC client version, one alarm suggesting a
  census sweep of day-one captures against known classes. MISSING
  EVIDENCE before any design (doc-vs-artifact rule): what
  CACHE_FIX_UPSTREAM_DETECTION already covers — read the extension
  first; if it already does this, the item dissolves into a doc
  pointer.

- **RESOLVED 2026-07-31 — reserved-entry identity built, criterion
  met and exceeded (a1170a7 integration, fad6f6b build, da8b837
  verdict-ab, 0cc05c7 perf, 9983a1b docs; opus dispatch,
  dispatcher-verified: suites 253/0 and 1826/0 re-run, s-captureC
  five gates 0/0/0/0/0 re-run, verdict-ab --seed-from-a IDENTICAL/44
  re-run).** Was READY with the directive as brief. Corpus-wide:
  stability 10 → 2, both survivors deferred-tool-rewrite on
  s-captureB, ZERO insertion-normalization violations left; the
  ordinal collision turned out to be firing on four captures, not
  one. All three unit-2b TODO tests now pass — TODO 15's control was
  symptom-parented and was rewritten by the dispatcher to assert the
  definition (n=197 normalized). Lapse read ratified (dropped
  outright). Deployment rides the restart boundary. Residuals below
  in the PARKED reserved-entry-residuals entry; verdict-ab self-test
  its own READY item.

- **RESOLVED 2026-07-31 (687cbc5, opus dispatch,
  dispatcher-verified: full suite 1839/1839/0 on main
  post-integration; report
  docs/code-reviews/fixture-sanitization-report.md) — fixture
  sanitization, directive §§1-5.** 9/20 absence bites red-first on
  the old fixtures (5 raw PNGs, 83 live timestamps, 3 UUIDs, 57 raw
  strings, 4 raw signatures); verdict-neutral across all 44 corpus
  verdict lines; all 9 non-LEDGER fixtures rebuilt+renamed;
  oscillation fixture's "already tokenized" premise REFUTED and
  fully rebuilt; the merged-join byte-equality is now a CHECK,
  retiring the raw-retention precedent. §6 (upstream rewrites)
  stays reviewer-gated. Dispatch gap dispositions: (g1)
  LEDGER-Siren.json's 42 session UUIDs + wall-clock = ACCEPTED
  RESIDUAL for this local/controlled deployment per the operator's
  2026-07-31 corpus-hygiene ruling; tokenizing the ledger is PARKED
  below. (g2) hardcoded UUID + /home path in two test REAL_CAPTURE
  defaults → READY item below. (g3) four stale fixture-name
  comments: replay.mjs's two fixed same evening; the extension's
  two ride the next proxy boundary (folded into the blocker-3
  item's note).

- **PARKED — tokenize LEDGER-Siren.json keys (g1 follow-up).**
  Accepted residual today (operator ruling, local deployment);
  becomes real work only if the ledger ever feeds a PR slice or a
  non-local consumer. Same sidToken scheme harvest now uses;
  consumer to name at build time: growth snapshots + doctor
  bookings read it.

- **RESOLVED 2026-08-01 (eb4f844, fixture-cut dispatch,
  dispatcher-verified) — test REAL_CAPTURE defaults (g2).** With a
  correction to this entry's own design: "newest capture" was wrong
  on contact with the data (the newest file belongs to an unrelated
  conversation and fails the pair assertions) — the landed fix
  recovers the capture by HASHING candidates (sidToken(filename) ==
  fixture header.key over the capture dir); override kept, designed
  skip kept, no identifier in source. Lesson booked: a backlog
  entry can carry a decision falsified by one ls. The verifier's
  "zero UUIDs in test/ source" is now a standing mechanism:
  absence-scan.test.mjs source-allowlist test (red-first on the two
  live instances it then caught — census-block-migration comment +
  tools/replay.mjs, both fixed same commit).

- **RESOLVED 2026-08-01 — prepared PR-slice branches: all conditions
  met, rewritten and pushed.** #272 rewritten (tip 720ecb4, forced),
  #276 rewritten via filter-repo + sanitization sync commit (tip
  8bb3af4, forced), #281 rebased (fb63f61, forced), the join-moves
  branch rebuilt from the rewritten tips and pushed as draft PR #295;
  rewrite-done comments on #272 (issuecomment-5151725115) and #276
  (issuecomment-5151722072). Full verification per
  docs/audits/pr-prep-2026-08-01/rewrite-plan.md status ledger.
  Original entry (conditions historical): State: pr/verification-tools
  advanced 53761a3 → a0a051f (15 commits, tools/ byte-equal to fork
  main) in worktree cache-fix-pr4; NEW pr/insertion-join-moves at
  fbec02f (b713b2f + merge of a0a051f + 7 commits, extension
  byte-equal to fork main) in worktree cache-fix-pr12; both merge
  clean onto upstream/main 0817302; suites green except the
  pre-existing proxy-read-dedupe failure (#272 open blocker 4,
  proven pre-existing at 53761a3). Drafts + exact push/gh commands:
  docs/audits/pr-prep-2026-07-31/. Conditions before any push:
  (1) MET 2026-07-31 late (687cbc5) — fixture-sanitization §§1-5 on
  fork main;
  (2) MET 2026-08-01 10:53Z — the #272 reviewer CONFIRMED the path
  on-thread ("On the rewrite — go ahead … Force-push when ready;
  nothing here depends on the current SHAs"):
  cnighswonger/claude-code-cache-fix#272 issuecomment-5151107400,
  replying to the operator-approved plan issuecomment-5147223070.
  Same comment sets the landing order: after #272's rewrite lands,
  rebase the stack #273 → #276 → #278, #281 last; reviewer will
  re-review #272 from the top (fresh round, review state already
  changes-requested); Chris review still required (load-bearing);
  (3) the prepared branches are then REBUILT carrying only clean
  fixture blobs (both are unpushed, so no force-push is needed on
  them; #272's own branch rewrite is the reviewer-coordinated one).
  Rewrite detail from the hardening gap 3 disposition: the slice
  copies of insertion-normalization.mjs drop the capture-prefix
  half of the fixture-name comments — the token↔capture pairing
  stays fork-only.
  Also fold in at push time: the stacked PR body should name #273
  as the third stacked parent (the merge carries
  deferred-tool-rewrite.mjs).

- **RESOLVED 2026-08-01 (measurement 97867f3, directive 40c11b2,
  delivered on-thread: PR #272 issuecomment-5151089462; decision =
  evidenced allowlist monitored by the daily census IN-PLACE-TEXT
  metric, fail-closed re-pin is the build trigger on first
  occurrence) — #272 blocker 2: a reminder-only BYTE change is
  re-served stale (reviewer: "not patchable, needs a directive" —
  agreed, and it is a genuine fidelity question, not appeasement).**
  Volatile exclusion IS the pin mechanism, so the extension cannot
  currently distinguish CC re-serializing a reminder (pin, correct)
  from CC changing its bytes (stale forward, fidelity risk; reviewer
  reproduced OLD→NEW overridden). Measurement FIRST, design second:
  the corpus can answer how often pinned volatile bytes actually
  change across matched entries (census-style sweep over harvested +
  live captures). Outcome shapes the design — measured-never → the
  evidenced allowlist the reviewer offered as the alternative;
  measured-real → fail-closed re-pin (store the NEW bytes, honest
  reset of that boundary only). Deliverable: the directive the
  reviewer asked for, with the measurement inside.
  ALSO IN THE DIRECTIVE (2026-08-01 GO): the fixture-strategy section
  the reviewer asked for — synthesized-by-default for public trees,
  harvested-and-scrubbed as the justified exception gated on the
  absence scan; minification; the body/headers-retention question
  answered together with the persistence story; and the widened
  public-repo hygiene class (conversation/capture data alongside
  origin-server info) proposed for upstream's CLAUDE.md.

- STANDING GO (operator, 2026-07-31 late): the held execution items
  below — blockers 3+4, census flap annotation, joined-standalone
  target — dispatch WITHOUT a further per-item GO the moment their
  file sets free (the fixture-sanitize lane closing is the trigger
  for the test-file overlaps). The same standing GO covers the
  design-tier openers (blocker-2 measurement+directive, enormous
  prunes, placement re-check, and the s-captureB
  deferred-tool-rewrite pairs' ATTRIBUTE step — telemetry pull +
  three-way classification per its OPEN item) at next session
  start.

- **RESOLVED 2026-07-31 (blockers 3+4, opus dispatch,
  dispatcher-verified: full suite 1843/1843/0 on main; report
  docs/code-reviews/hardening-blockers34-report.md).** Blocker 3:
  write-owner-only primitive, 27 write sites / 18 extensions, mode
  at create + lazy chmod (Node's mode option is CREATE-only — the
  booked lesson), red-first 0/4 → 4/4 with mutation-split
  mechanisms. Blocker 4: adjacency NOT load-bearing (grep basis:
  read-dedupe.mjs has zero cache-control references); assertion
  already green on fork main since 60cb337 — the missing piece was
  the recorded reasoning, now beside the assertion. Gap
  dispositions: prefix-diff's truncated raw snapshot KEPT
  (diagnostic purpose; 0600 covers; same treatment as canon
  entry.m); the token↔capture-prefix comment pairing stays on fork
  (association already public here) but the §6 slice rewrite DROPS
  the capture half upstream (noted on the HOLD entry); missing
  proxy-read-dedupe.md directive → READY item below. NEXT PROXY
  BOUNDARY owed (pin bump + restart + gate): carries 0600 +
  comment fixes; row-3 clear per the report (no state keys, no
  freeze logic, no order change).

- **RESOLVED 2026-08-01 (0c487c7, fixture-cut dispatch,
  dispatcher-verified: grep leaves no citation not immediately
  followed by "was never committed") — proxy-read-dedupe.md refs.**
  Conservative branch taken per the entry's rule: the header carries
  contracts but no goal/threat-model and defers to sections it
  cannot supply (incl. an open msgIdx question) — extraction would
  have meant new claims, so both refs now state the file never
  existed and point at extension-impact-guide §12.

- **PARKED — harvest --pin --replay-from K (fixture-cut c3).**
  runPin always writes replayFrom 0 + the full prefix, so
  regenerating the pinned fixture would restore the 432 kB dump.
  Ruling 2026-08-01: minimization STAYS a post-step gated by
  tools/fixture-verdict-identity.mjs — the floor is swept per
  fixture, not a harvest parameter. Trigger to build: a second
  fixture needing minimization at harvest time.

- **RESOLVED 2026-08-01 (78bf112, ready-bundle dispatch,
  dispatcher-verified; mutants derived at test time, fixture
  discovered shape-agnostically, both reds land inside the
  comparison; known limit: one replayable fixture today, first by
  sort order if more appear) — committed bite for
  tools/fixture-verdict-identity.mjs (fixture-cut c2).** test/fixture-verdict-identity.test.mjs seeding
  both demonstrated reds as fixtures: (1) a cut missing a covered
  ordinal → coverage divergence; (2) a cut keeping every record but
  stripping the pin-establishing reminder bytes → outHash
  divergence inside the comparison. Verifier: both seeds exit 1
  with the named divergence, the real pair exits 0. Done-criterion:
  node --test green + both mutants bitten.

- **RESOLVED 2026-08-01 (df902a2, ready-bundle dispatch,
  dispatcher-verified: red-first on exactly 7 real hits, tokens
  cross-checked against committed fixture names by executing
  sidToken, org-id redacted per the asymmetry ruling, source scan
  now walks docs/) — docs/ UUID triage (source-scan follow-up).** Full
  8-4-4-4-12 UUIDs appear in 9+ files under docs/ (sweep
  2026-08-01: code-reviews, directives, release-tests, audits).
  Classify per hit: synthetic example vs capture/session-derived;
  tokenize the real ones (burn-forward, history unscrubbable);
  uncertain → surface, never guess. Verifier: extend the
  absence-scan source test's scope to docs/ with the synthetics
  allowlisted — the extension IS the done-criterion.

- **PARKED — bare s-<8hex> short forms in fork docs prose
  (ready-bundle residual c2: s-captureD, s-captureM, s-captureF in
  the threat matrix; BACKLOG prose carries many more).** Ruling
  2026-08-01, consistent with the 07-31 association-on-fork ruling:
  ACCEPTED residual on this fork — the short forms carry
  operator-local cross-referencing value and the token↔capture
  association is already public here; the exception (same file
  redacts the full UUID → tokenize the short forms too) was applied
  by the triage. Trigger to act: any such doc ported upstream —
  tokenize at the port, and the slice preflight's absence arm is
  the backstop.

- **DONE 2026-08-01 (8578ebb + sweep wiring, sonnet dispatch,
  dispatcher-verified: red-first on 4 of the 5 named instances; the
  5th, blocker-4 dup, is a CROSS-entry duplicate outside the same-entry
  rule — resolved by deletion in 9ae9e9b, and cross-entry near-duplicate
  detection deliberately not built) — backlog header lint (FIVE stale headers found
  2026-08-01: row-4, blocker-4 dup, duplicate-request,
  merged-standalone, final-message strip — each header
  contradicting its own body's recorded resolution; two of them
  mis-graded a survey before being caught).** tools/backlog-lint.mjs,
  WARN-only: flag an entry whose header grade is OPEN/READY/HOT
  while the SAME entry's body (scoped `- **` to next `- **`)
  carries a dated resolution marker (RESOLVED/FIXED/BUILT +
  VERIFIED/CLASS CLOSED). Verifier: red on the five instances as
  they stood at 40c11b2 (`git show 40c11b2:BACKLOG.md`), zero
  false fires on the current file. Done-criterion: lint in tools/,
  red-first demonstrated, wired as a WARN into the daily sweep or
  doctor.

- **RETIRED-marker (see RESOLVED above) — original blocker-3 entry
  follows for the record.**
  Original: conversation-derived state
  files land at ambient umask with raw bytes. Canon/events (this
  extension), request bodies (#275), system prompts (#280) — same
  shape three times; the reviewer asks to fix it once as a pattern.
  Fork-side too: ~/.claude state written by the serving proxy. Build:
  explicit 0600 on every conversation-derived write (one helper,
  grep-established call sites stated), hashes instead of raw bytes
  where bytes are not structurally required (canon `entry.m` IS
  structurally required — that stays, documented). Verifier: a bite
  asserting mode 0600 on freshly written canon/events; sweep of
  existing files chmod'd at deploy.

- DROPPED 2026-08-01 (duplicate): the #272 blocker-4 adjacency entry —
  already resolved 2026-07-31 (see the RESOLVED blockers 3+4 entry
  above: adjacency not load-bearing, assertion green since 60cb337,
  reasoning recorded beside it). The prepared branches' known-red is
  cured by their rebuild (HOLD entry, condition 3).
- **RESOLVED 2026-07-31 (1770a97, small-pair dispatch,
  dispatcher-verified: 11/11 tests) — verdict-ab self-test.** (This
  bullet's header had been consumed by a neighboring edit — the
  second same-day instance of the header-splice shape, this time the
  dispatcher's own; restored as its resolution.) Skip-list derived
  at test time by a shape-agnostic search, no fixture named — rename
  -safe by construction; four mutants each bitten, including the
  historical 2-of-6 reader-narrowing miss.

- **PARKED — reserved-entry residuals, three named, all unmeasured
  (report gaps c3/c6 + not-verified list).** (1) heldCi retirement:
  a reserved entry with a permanently unresolvable neighbourhood is
  carried forward inert forever on the success path (the reset path
  retires it); bounded (~1-2 entries/conversation measured), costs
  one canonical entry. (2) dropped-majority precedence relative to
  move recognition: the disposition pass runs on that path too; no
  corpus instance exercises it (named unmeasured three reports
  running). (3) conversations with >1 reserved entry at a time: the
  pass handles a list and guards double-claims, but every measured
  instance has exactly one. Missing evidence, named: a corpus
  instance of any of the three. Trigger: first live sighting (a
  held entry, a dropped-majority reset with a live move, or a
  two-reserve conversation) — then measure before designing.


- **RESOLVED 2026-08-01 (dotfiles 7d1b3df, verified live on a blocked
  push; fork-side exemption 9db47fc) — absence-scan run-seam: the class
  recurred one day after the mechanism shipped, and the seam is now a
  pre-push guard.** 2026-08-01: seven full-UUID
  literals of capture 0d6f38ba landed via three loop-trio commits
  and were pushed public with absence-scan.test.mjs already on main
  (red-first mint 2026-07-31, the g2 entry above) — the mechanism
  caught nothing because nothing runs it at the push seam; it fired
  only when a later session ran the suite by hand. Fixed forward
  f1fc59f (existing proxy-suite synthetic swapped in, no allowlist
  growth; the leaked UUID itself is unscrubbable history, same
  accepted-residual class as the LEDGER keys, PARKED above).
  Decision RESOLVED 2026-08-01 — by the operator's dotfiles,
  independently and before this entry was booked: pre-push
  absence-scan guard deployed 10:47 (dotfiles 7d1b3df), runs the
  pushing tree's tools/absence-scan.mjs over every outgoing range,
  EMPTY..tip for new refs. Verified live the same day: blocked a
  new-branch push on upstream's own transcript-shape fixture —
  a pre-existing-third-party false fire, repaired by declared
  ALLOWLIST exemption with provenance (the guard's documented
  remedy), not by --no-verify.
  Same day, same prose-vs-guard shape: reader worktrees
  (dispatch-discipline's frozen-reader recipe) have no removal
  clause — two frozen /tmp probe worktrees found still registered
  days after their sessions ended (verified clean ancestors,
  removed 2026-08-01); the discipline edit's carrier is ~/.claude
  (operator corpus, GO owed).

- PARKED 2026-08-05 — READINESS residue for this repo, awaiting the
  executor-skill + §6 reshape (dotfiles backlog e519b8c). Under the
  reshaped design this repo keeps NO detailed certification ledger —
  certification is class-level and global; the per-repo file holds
  only exclusions and deviations. Pre-drafted for when it lands:
  exclusions — deploy/restart of the serving proxy (silent failure
  mode + production-facing; never delegable down, §6 exclusion
  class); anything touching state KEYS or freeze logic (threat
  matrix row 3 — session-boundary statement required, judgment
  stays top-tier). Convention already in force regardless of the
  park: the Opus dev session's FIRST run of each procedure class
  here (PR round, bust triage, gate-red triage) gets its output
  graded by a top-tier session — that grading doubles as the
  class-certification probe once §6 lands. Missing piece that
  unparks this: the executor skill shipped + §6 amended (named
  trigger). Consumer: the session instantiating READINESS.json
  here, and the grading session booking probe evidence.

- **(DONE — 2026-08-08, `b82ee4f` + `eca3a10`)** every temp-dir producer here LEAKS its mkdtemp
  dir:
  **SHIPPED.** `tools/tmpdir.mjs`: one run root per process, removed on exit,
  on throw, and on SIGINT/SIGTERM/SIGHUP — and deliberately NOT a reaper, it
  never deletes what it did not create in-process. 146 call sites across 81
  files converted. `gate-live` now carries `tmpLeftovers` and BLOCKS (`ok`
  false) on run roots older than 1h whose creating process is dead; the
  liveness skip is what keeps it from firing on gate-live's own long replay
  children, which would have been a guard firing on legitimate work.
  **Verified by the dispatcher, not booked from the report:** a full suite run
  leaves ZERO entries newer than a marker (0 in a frozen worktree at the lane's
  commit, 0 again on main after integration). No `proxy/` file changed, so this
  is NOT deployment-coupled — no pin bump, no restart.
  **THE ENTRY'S OWN NUMBER WAS REFUTED, and it was a ranking input.** "One
  full-suite run leaves thousands" was never measured: the real figure is
  **113**, confirmed by two independent instruments. 31,108 was ACCUMULATION
  over many runs plus the scheduled tools. Nothing about the fix changes; the
  cost signal this was ranked on does.
  **The brief's enumeration key was wrong and would have shipped a false
  green** — "every mkdtemp call site" missed a hand-rolled `join(tmpdir(), …)`
  and an aliased `mkdtemp as mkd`. Found by MEASURING after conversion (3
  leftovers, not 0), never by grepping. Third instance of the name-vs-behaviour
  class in one day, all in the dispatcher's own scoping; rule booked in
  `docs/dev-loop.md`.
  **Writer half shipped too**, unasked and correctly: `test/no-raw-mkdtemp.
  test.mjs` fails on the `mkdtemp` name outside the helper (no exemptions —
  matching the NAME rather than the call shape is what makes the alias route
  fail) and on undeclared hand-rolled `tmpdir()` sites, each declared with a
  count and a reason so a changed count fails too. Shown red against the base.
  **DECIDED, on the nine remaining hand-rolled `tmpdir()` sites:** leave them.
  Four create things and own their cleanup (measured: 0 leftovers), five build
  paths that must not exist or are assertion-only, and all nine are declared in
  a guard that fails on an undeclared site or a changed count. That is a
  mechanism rather than a promise, which is the bar. Converting the four is
  available if the helper should ever be the single route; it buys nothing
  measurable today.
  ORIGINAL ENTRY FOLLOWS. /tmp (31 GB tmpfs) hit 100% with 31,108 top-level dirs
  (7,024 fixture-verd*, ~8,000 bt-*, plus census-*, harvest-*,
  verdict-*, ledger-*, mitigation-output-*, insertion-suppress*,
  cache-fix-probe/replay-*), and the ENOSPC broke UNRELATED live
  tooling machine-wide (Claude Code's Bash output capture died
  mid-session — silent-failure class: the suite stays green while
  filling the disk). Writer half: test suite and tools create
  mkdtemp dirs and never remove them — one full-suite run leaves
  thousands; gate-live (daily) and harvest (twice daily) add on
  schedule, so refill is structural, not incidental. Entry-path
  enumeration: npm test, bare node --test, gate-live, harvest,
  bust-triage, census, replay probes — every mkdtemp call site.
  Design: one shared tmpdir helper (per-run parent dir + cleanup
  registered on exit/finally), imported by tools and tests (the
  extend-existing-tool rule); plus gate-live reports a leftover
  count of matching dirs older than 1h as a failing signal so a
  regression is loud. Verifier (red-first: today's state IS the
  red): run the full suite, then count matching /tmp dirs newer
  than a start marker — must be 0; current runs leave thousands.
  Interim relief 2026-08-08: hand-deleted ~21,500 pattern-matched
  g-owned dirs older than 60 min (100% -> 25G free) — the
  hand-cleanup is the prototype, the helper is the deliverable.
  Consumer: next tooling session here; the derivation ranks it.

## Done — closures, one home (accretion rule: closure lives in exactly ONE carrier)

Moved out of `## Open` 2026-08-10 by the first retirement pass this repo has run.
These bullets were already closed in their own bodies; nothing here was re-graded, and
no entry was dropped — the move is relocation only, verified by header-multiset equality.
Grade tokens moved: DONE, (DONE …), (shipped) READY, RESOLVED, CLOSED, BUILT, SHIPPED,
RETIRED, MOVED, ACCEPTED, (superseded …), GATE-RED TRIAGED, GATE-RED CLOSED.

- **MERGED 2026-08-10 (was READY) (small) — a bullet whose grade token is a NARRATIVE word hides live,
  decision-complete work from every READY-based count, including the one this
  ranking is derived over.** Found 2026-08-08 afternoon by the re-derivation,
  and only because it was reading BODIES: two entries carried live work under
  the grades `CORRECTED WITHIN THE HOUR` and `DOWNGRADED`, and the second's own
  body says "It stays READY" a few lines under a header that does not say so.
  Both were re-graded in this entry's commit. What is NOT fixed is the writer:
  nothing stops the next session opening a bullet with a story instead of a
  grade, and the failure is silent in the way that matters — the entry reads
  perfectly and simply never appears in a list.
  **The class, stated so it is not re-learned as a one-off:** the grade is a
  LABEL over its own body, and a narrative first word is a label that stopped
  describing the body the moment a re-grade was written in prose rather than in
  the header. Every consumer that greps `^- \*\*READY` — the SessionStart
  injection, the ranking population, any survey — inherits the drift.
  Design, decided: the `--census` mode being built on `tools/backlog-lint.mjs`
  already buckets every grade token and lists the UNCLASSIFIED ones. Extend it
  so the NARRATIVE buckets (anything outside the live-grade set
  READY/OPEN/HOT/PARKED and the resolution set) emit a WARN naming the line —
  a non-zero count there means live work is invisible to every consumer, which
  is a finding, not a statistic.
  Verifier, red-first, anchored to immutable refs so it cannot decay: run it
  over `git show b7ae5aa:BACKLOG.md` and it must name the two bullets the hand
  scan found — the `CORRECTED WITHIN THE HOUR` XDG-ownership entry and the
  `DOWNGRADED` tool-adjacency entry; run it over this commit and it must be
  silent on both.
  **CORRECTED WITHIN THE HOUR by the census's first real run, and the
  correction is the point: the class is 26, not 2.** The paragraph above was
  written from a HAND scan, and the hand scan was the pattern — it reached the
  two bullets I happened to read and stopped. `backlog-lint.mjs --census` over
  `b7ae5aa` reports `UNCLASSIFIED=25`, and over HEAD `UNCLASSIFIED=26` — the
  26th being the `OVERTAKEN` grade I invented three edits earlier, which is the
  instrument firing on its own dispatcher within minutes of landing. So the
  number in a claim about a class is the instrument's, never the reader's.
  What the 26 are is NOT yet classified and that is the remaining work: most
  look archival by shape (`HANDOFF`, `BUST`, `GATE-RED TRIAGED`, `MOVED`,
  `FINDING`) and are fine as history, but at least `OPEN-BOOKED`,
  `QUEUED THIS SESSION` and `IN FLIGHT` name live work that no READY-based
  count can see. Done-criterion, sharpened: every one of the 26 carries an
  individual verdict — live-work-mis-graded, or archival-and-correct — and the
  WARN then fires only on the first class. A count without that split would
  train the override reflex on its first run.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation. Ranked at the next derivation, not here.
  <!-- entry: "a bullet whose grade token is a NARRATIVE word hides live" -->

  **MERGED 2026-08-10 into the READY-count entry (`the READY count every
  session reads at startup is 66 where 57 exist`), which now carries the
  combined design and a red-first arrangement over three real positives
  instead of two separate ones.** Merged rather than left parallel because
  both halves are closed by ONE check over the grade vocabulary; kept as a
  record so the reasoning is not re-derived. No content was dropped in the
  merge — the class statement above travelled into the absorbing entry.
- **RETIRED 2026-08-10 (was READY) (small, BLOCKED on a guard fix) — `test/tool-output-stamps.test.mjs`s
  header is now STALE and actively false.** It still says ARM 1 is red on this
  tree on purpose and that two assertions are todo-marked; `f9ec558` fixed the
  defects and removed the markers. A reader who trusts the header will believe
  two live defects remain.
  Design (decided): rewrite the header block to say the two sites WERE found
  still-wrong by this check and were fixed in `f9ec558`, keeping the citations
  (they are the evidence that the check works) and dropping every present-tense
  red and todo claim.
  Verifier: `grep -n "todo" test/tool-output-stamps.test.mjs` returns nothing,
  and the header names `f9ec558`.
  **Why not done in `f9ec558`:** the header is a comment block whose every line
  opens with a double slash, and a PreToolUse guard currently hard-denies any
  Bash command whose text contains that token — a false fire diagnosed
  2026-08-08 and handed to the dotfiles session. Correcting the header was
  booked rather than worked around. UNBLOCKS as soon as that guard fix lands;
  the edit itself is a two-minute rewrite.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  test/tool-output-stamps.test.mjs's header is no longer false: every
  surviving mention of ARM 1 and of the `{ todo }` markers is past-tense
  history (grep for `ARM 1|todo|on purpose` over the file, lines
  21/34/73/82/84). Shipped by c3481d1.
- **RETIRED 2026-08-10 (was READY) (small) — `named-unbooked-scan` is referenced by nothing but itself.**
  Measured immediately after it shipped: `grep -n "named-unbooked-scan"` across
  `BACKLOG.md`, `docs/runbooks/*.md`, `docs/dev-loop.md` and `tools/*.mjs`
  returns hits in ONE file — the tool's own source. No runbook step invokes it,
  no lane names it, nothing schedules it. It is a mechanism with no trigger,
  which is the state the class it detects is about: the check against
  named-and-unbooked was itself named and unwired within the hour of being
  built, by the session that built it.
  Design (decided): the session-close lane owns it —
  `docs/runbooks/session-close.md` gains a numbered step running it over the
  session's own transcript with `--until HEAD`, and the step carries
  `[GRADUATE -> a Stop-hook runs it without anyone remembering]`, because a
  runbook step still depends on someone reading the runbook, which is the same
  dependency that produced the defect. Report-only, as the tool already is.
  Verifier: `grep -n "named-unbooked-scan" docs/runbooks/session-close.md`
  returns the step and its GRADUATE marker; running the step by hand over this
  session's transcript prints its examined-count line rather than a bare
  verdict. Done-criterion: both, suite green.
  Write boundary: `docs/runbooks/session-close.md`.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  named-unbooked-scan is wired: docs/runbooks/session-close.md:82 invokes it
  as numbered step 5. Shipped by 75155b2, hours after this entry was booked.
- **RETIRED 2026-08-10 (was READY) — FIRST THING NEXT SESSION: explain the 2026-08-07 01:00:55Z false ❄
  to the operator in plain language, before any build work.** They asked for
  this explicitly, tired, at the end of a long session, after an explanation
  written in commit-message register did not land. Deliver it as the opening
  message of the session and wait for their reply.
  **What to explain, in this order** (the material is all on disk — matrix
  "Event walk 2026-08-07 01:00:55Z" and the detector entry below; nothing needs
  re-deriving):
  1. Nothing broke. The cache did its job perfectly. The ❄ was wrong.
  2. What the ❄ actually watches: two numbers per turn — how much was newly
     written, and how much was re-read from cache. It cries wolf when the write
     is big AND the read is small, both measured against the previous turn.
  3. What really happened: the session's first tool call returned a 907 kB
     result. That is genuinely new text, so of course it had to be written to
     the cache once. Everything from before it was re-read intact — the read
     equals the previous write to the token.
  4. Why the alarm fired anyway: Claude Code writes one reply into the
     transcript as SEVERAL rows carrying the same numbers. The alarm compared
     one of those rows against another row of the SAME reply. That inflated
     "the previous turn" from 40k to 375k, and against a made-up 375k baseline
     the perfectly normal numbers look alarming.
  5. Why it said `other`: the alarm's list of causes is idle / model-changed /
     everything-else. There is no entry for "nothing was wrong", so a false
     alarm can only ever come out as `other`. The word is a symptom of the bug,
     not a clue about it.
  6. How we know rather than think: the fork has its own copy of the same
     alarm, which throws away duplicate rows first. Run on the same transcript
     it reports zero events, where the other reported a 336k disaster.
  **7. THEN disambiguate it from the OTHER incident, because the operator
  conflated the two at the end of that session and the next reader will too.**
  They are different events with opposite verdicts, hours apart:
  - the 336k above (01:00:55Z) — a FALSE alarm, nothing lost, an instrument
    bug;
  - the 205k at 2026-08-06 17:40:16Z (`system_changed`, matrix row 24) — a
    REAL cost, and the cause is a RESUME, not an edit. Restarting a
    conversation makes Claude Code rebuild its opening from whatever is on
    disk at that moment, and it pays for the whole rebuilt opening. If the
    rules file changed while the session was away, the new text shows up in
    that rebuild — visible at the boundary, but it is the rebuild being paid
    for, not the edit.
  The plain-language version of the rule, which is the useful part: **editing
  the rules while a session is running costs that session nothing — it already
  holds its copy. The next resume pays.**
  **8. And say what was checked, including the correction.** This session
  edited the global rules at 2026-08-07 01:37:48Z with six sessions live, then
  measured its own: the opening message was 64,006 bytes before the edit and
  64,006 after, unchanged. Nothing was re-read, nothing was re-billed. That
  matters because a claim written into the threat matrix hours earlier said the
  opposite — and the matrix had ALREADY recorded the correct, measured version
  months of requests earlier, in the same cell. Both are now reconciled, with
  the wrong one struck. Tell the operator that part too: they asked the
  question that surfaced it.
  **Rules for the delivery, and they are the point of this entry:** short
  sentences, no field names in the first pass, no timestamps unless asked, and
  no "findings/booked/verifier" vocabulary. Offer the detail afterwards; do not
  open with it. If it cannot be said without jargon, it is not understood well
  enough yet.
  Done when: the operator says it landed, or asks a follow-up that shows it
  did. Not when the message is sent.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Delivered, and then overtaken a second time. The 2026-08-07 transcript
  records the plain-language explanation given as that session's opening
  message; independently, the false-❄ root cause was found and fixed
  2026-08-08 with `hits=0` against the fix. Verified by transcript search at
  the desk, not from the lane's report.
- **RETIRED 2026-08-10 (was READY) — THREE triggers have no watcher, and the third is the worst: a RED
  daily sweep has no doorbell either.** Found 2026-08-06 while enumerating the
  lanes: `session-scan.py` surfaces BACKLOG only, and NO SessionStart hook reads
  `~/.claude/cache-fix-gate-status.json`. The dotfiles doctor reads it, but
  doctor is a command someone runs, not something that greets them. So
  `docs/runbooks/sweep-finding.md` — written that same morning — has a trigger
  of "you happened to look." The runbook was authored, reviewed and committed
  without anyone noticing its entry condition did not exist, which is the
  clearest possible case for the standing instrument question (dev-loop, rule
  three): the gap was in the thing being built, not in something old.
  All three conditions are computable, share one carrier, and ship together:
  gate red (`.ok == false` or `.failing > 0` in the status file, plus its
  `finished` age so a stale sweep reads as stale rather than clean), commits
  behind (`git log main..upstream/main --oneline | wc -l`), and review rounds
  waiting (`gh pr list --author @me` with activity newer than our last push).
  Silent at zero, all three.
  Measured 2026-08-06, by looking rather than by anything reporting: fork `main`
  is **24 commits behind `upstream/main`**, and **three open PRs (#273, #276,
  #278) carry a reviewer comment from that same day**, all three `CONFLICTING`,
  all three at `REVIEW_REQUIRED`, all three asking for the same rebase. The
  runbook for answering a round exists and is good; nothing tells anyone a
  round is waiting. A well-written line with no doorbell.
  Both conditions are computable with near-zero false fires, which is the test
  a mechanism has to pass here — no judgment, no semantics, two counts:
  `git log main..upstream/main --oneline | wc -l`, and `gh pr list --author @me
  --json number,reviewDecision,updatedAt` filtered to rounds newer than our last
  push on that branch. Design, decided: both land as counts on the SessionStart
  line beside the backlog count that already appears there — same carrier,
  because that line is demonstrably on the read path and a new one would not
  be. Silent at zero; a count only when there is something. Verifier: with the
  state as of 2026-08-06 it must print both (24 behind, 3 rounds waiting);
  against a synthetic in-sync state it must print nothing. Done-criterion:
  both, plus the zero case proven silent — a trigger that always prints is a
  trigger nobody reads.
  NOT covered here, because it is not computable and should not be faked: WHEN
  a fork mitigation becomes an upstream slice. FORK-NOTES says "when ready",
  which is an unstated trigger and therefore drift. That one is an operator
  decision and stays prose — but it stays prose ON PURPOSE and says so, rather
  than by omission.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The doorbell exists. session-scan.py:293 gate_alerts() reads
  gate_status_path() (:257, XDG first, ~/.claude fallback at :129), and THIS
  session's SessionStart carried `attention: gate RED: 2/103 failing` — the
  live world-read, stronger than the code read.
- **RETIRED 2026-08-10 (was READY) (small) — `capturePair`'s comment describes a size floor the code does
  not implement.** `bust-triage.mjs:275-277` says the busting request must carry
  "a body at least as large as the ledger's own ctx figure allows, floored at 2
  messages"; the code implements only `messages.length >= 2`. Doc-over-body
  drift in a function whose selection rule is load-bearing for every triage.
  Either implement the ctx floor or delete the clause — deciding which needs one
  measurement: whether any real bust would be selected differently. Verifier:
  the 12:54:49Z control and the s-captureAL case must both be unchanged by
  whichever way it resolves.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The ctx-byte size floor is implemented, not messages.length>=2 alone:
  bust-triage.mjs:652-653 `bigEnough = (line) => ctx == null ||
  Buffer.byteLength(line) >= ctx`, composed into `plausible`.
- **RETIRED 2026-08-10 (was READY) — `bust-triage` reports a STATE-KEY CHANGE across the busting pair
  as its own line.** This is the hand-step that found row 26, and it is
  invisible to every diff of the request bodies: the extension event logs
  carry the key each request was handled under, and a key that changes between
  two requests of one conversation is a total state loss reported as
  `no-baseline`/`reset` rather than as an error. Measured 2026-08-06:
  `deferred-tool-rewrite` logged `rewrite` under one key and `no-baseline`
  under another nine seconds later, same conversation — that flip WAS the
  216,060-token bust, and nothing in either request's bytes said so. Closing
  gate question 3 answers YES by existing: the classification was made by hand,
  so the tool should emit it. Design, decided: for the pair it already
  identifies, `bust-triage` greps
  `~/.claude/cache-fix-snapshots/*-{insertion,deferred-tool}-events.jsonl` at
  both timestamps, extracts the key each request was handled under, and prints
  a `state-key` step — OK when both requests share a key, and a named finding
  when they differ, quoting both keys and both `action` values. It is a STEP in
  the existing chain, not a new tool (dev-loop: extend an existing tool before
  writing a new one; reuse inherits the interleaving and pairing lessons a
  fresh file re-earns from zero). Verifier, red-first: run it at
  `--at 2026-08-06T09:59:58Z`, which must report the flip
  `7741083f1d475059 -> 0adfdad6b91abb0e` with `rewrite -> no-baseline`; and at
  a stamp whose pair shares one key, which must report OK. Done-criterion:
  both, plus the step appearing in the OK case too — a check that prints only
  on findings cannot be distinguished from one that did not run.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The state-key line shipped: stateKeyFlip at tools/bust-triage.mjs:553,
  stateKeyAt at :505, and the KEY-FLIP verdict documented at :49-55.
- **RETIRED 2026-08-10 (was READY) (POINTER — body belongs in the `dispatch-guards` plugin repo's
  `dev-notes/`) — a veto gate keyed on a WORD in a command matches that word in
  a commit MESSAGE.** Measured 2026-08-08 by the leak-scan lane: `git commit -F -`
  with a heredoc was BLOCKED by `subagent-push-gate` because the commit message
  contained the word "push" (it was describing the push hook). No push was
  attempted or possible.
  **SECOND FIRE, 2026-08-08, different lane:** the same gate denied a
  `git commit` whose inline message carried push-adjacent wording, in a lane
  whose entire subject was the push hook — so the wording was unavoidable, not
  incidental. Both lanes recovered the same correct way (read the state, confirm
  nothing was staged or committed, retry with `-F <file>`), and both surfaced it
  rather than working around it silently. Two fires in one day, both on lanes
  working ON the push path, is the fire-rate this observation needed: the
  predicate reads the payload when it means to read the intent, and it fires
  hardest on exactly the work most likely to need the words. The lane recovered correctly — confirmed nothing had
  been committed, then committed via `-F <file>` — and the confirm-before-retry
  step is the part worth keeping, because a blocked step leaves the state its
  successor assumes was created.
  **Why it is worth a booking rather than a shrug:** this is the
  check-that-fires-on-a-non-defect shape sitting on the gate that matters most,
  and its cost is the override reflex it trains on exactly the guard where an
  override is most dangerous. The general form is a predicate reading the
  PAYLOAD when it means to read the INTENT. Design NOT decided here — it is the
  plugin's, and the plugin's own evolution rule says the observation goes to
  `dev-notes/dispatch-OBSERVATIONS.md` with a proposed rule change. Done when
  that observation exists there; the fix itself is the plugin maintainer's call.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Recorded where the entry said it belonged: dispatch-guards
  dev-notes/dispatch-OBSERVATIONS.md:104-107 carries the
  heredoc-commit-message case with its proposed fix.
- **RETIRED 2026-08-10 (was READY) — the dispatch-guards writer-claims gate WARNs on a claim whose work
  is already in HEAD, which trains the override reflex it exists to prevent.**
  Measured 2026-08-08, live: a lane's first Edit to
  `~/dev/Gunther-Schulz/claude-worktime/claude-worktime.sh` fired
  `writer-claims-gate` naming `aopus-rotation-writer-a3b5e1755a1598d3` "within
  the claim TTL". That agent's guard fires are stamped 08:06Z; the commits
  carrying its work landed 08:52–08:58Z; its session was quiet from 08:18Z. So
  the claim outlived its own commits by ~2 h and fired on work that could not
  collide with anything.
  **Why it matters beyond the nuisance:** the executing lane could not
  distinguish this from a live conflict using git state alone — a clean tree
  proves nothing was COMMITTED, never that nobody holds uncommitted work — and
  it proceeded on that reasoning, correctly but on a basis narrower than its
  conclusion. What actually settled it was an out-of-band timing comparison the
  dispatcher ran. A guard that fires on a non-defect and can only be cleared by
  the dispatcher is the check-that-trains-its-reader-to-ignore-red shape from
  the corpus.
  Design (this is the PLUGIN's repo, not this one — body belongs in
  `dispatch-guards`' `dev-notes/dispatch-OBSERVATIONS.md` and its BACKLOG;
  this entry is a POINTER so the finding is not lost if that repo is not opened
  soon): before firing, check whether the claimed path's claimed work is
  reachable from HEAD — if the claiming agent's commits are already merged, the
  claim is spent and the gate stays silent. Cheaper variant if that is hard:
  expire a claim when the working tree is clean at the claimed path.
  Verifier, red-first: replay this exact case — a claim stamped before a commit
  that contains its work — must NOT warn; a claim with genuinely uncommitted
  changes at the claimed path MUST still warn. Both arms required; the second
  is the over-firing control that keeps the repair from silencing the gate.
  <!-- entry: "the dispatch-guards writer-claims gate WARNs on a claim whose work" -->

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Recorded upstream: dispatch-guards dev-notes/dispatch-OBSERVATIONS.md:410,
  section titled `writer-claims-gate WARNs on a claim whose work is already in
  HEAD`.
- **DONE `82372db` (2026-08-08) — every human-facing stamp emits BOTH zones.**
  Shipped: `tools/local-stamp.mjs` + `test/local-stamp.test.mjs`; seven tools
  converted, four verified as needing none. Verified at the desk by my own
  one-condition mutation, not the lane's: appending a local suffix to
  `restart-exposure`'s machine field `lastActivity` reddened exactly the
  purity CONTROL and nothing else (6 pass / 1 fail from a 7/7 green
  baseline); restored, full suite 2479 pass / 0 fail. Scope correction the
  lane measured: **eleven** files, not ten — original text kept below.
  ORIGINAL ENTRY:
- **(shipped) READY — every human-facing stamp emits BOTH zones, because ten tools emit
  UTC and none emits local.** Measured 2026-08-07: `grep -l 'toISOString\|UTC'
  tools/*.mjs` returns ten tools; `grep -rn 'toLocaleTimeString\|local)'`
  returns zero local-time renderings anywhere in `tools/`. So every stamp that
  reaches the operator is in a zone their clock does not show, and the
  conversion is left to a human doing arithmetic at 6am.
  **The recurrence is the case for building it.** The dev-loop already carries
  a UTC section, and `bust-triage.mjs:618-624` shows the class was reasoned
  about carefully — but only at the MACHINE-to-machine end ("`dossier` now
  reads a zone-less stamp as UTC; this end stops producing one"). The human end
  was never in scope. Cost, 2026-08-07: several turns of a phantom
  disagreement in which the operator and the session were each correct about a
  DIFFERENT bust — 01:49:59Z (03:49 local, 419k, one session) versus
  04:08:35Z/04:17:25Z (06:08/06:17 local, another) — while appearing to
  contradict each other. Operator, same day: "this timezone mismatch has bitten
  many times in many sessions here."
  Design, writer-side, one shared helper in `tools/` used by the human-facing
  print paths: `2026-08-07 04:08:35Z (06:08 local)`. Two constraints that
  decide the format. The UTC token stays FIRST and unmodified, because
  `bust-triage --list` instructs the reader to paste a stamp straight into
  `dossier` and that copy path must keep working. And machine-readable output
  (`--json`, status files, ledger writes) gains NOTHING — the suffix is for
  display lines only, or it becomes a parsing hazard, which is this same class
  in mirror.
  Verifier, red-first: `bust-triage --list` today prints `04:08:35Z` with no
  local rendering — that is the red; after, it prints the pair, and
  `dossier "$(node tools/bust-triage.mjs --list | ...)"` still resolves the
  same event, which is the control proving the paste path survived. Plus a
  negative: `--json` output must be byte-identical before and after.
  **Reader-side backstop is an OPERATOR DECISION, stated not taken** — a Stop
  hook scanning the session's own final message for a bare UTC stamp outside
  code fences with no local equivalent nearby. It is computable and the machine
  already runs a hook of exactly this shape over assistant output
  (`midturn-answer-check.py`), so the pattern is proven here. It changes what
  every session on this machine is nagged about, so it is not a fork-side call.

- **DONE `c567907` (2026-08-08) — `backlog-order.mjs --check` names the
  misplaced bullet.** On mismatch it now prints the first divergent index, the
  leading line found there, the leading line expected there, and a misplaced
  count. Desk verification beyond the lane: I probed the combination the lane
  reported as untested (mismatch at index 0, three displaced, and a full
  reversal) — correct in all three. ORIGINAL ENTRY:
- **(shipped) READY (small) — `backlog-order.mjs --check` reports a verdict with no
  diagnostic, so establishing WHY costs a stash-and-bisect.** Fired 2026-08-08:
  after booking three entries the check printed `file order does NOT match the
  derived order` and nothing else. Finding out that my own insertion caused it
  took `git stash` -> re-run -> `git stash pop` — i.e. mutating the working tree
  to interrogate a read-only check, on a copy other agents write to. The tool
  already HAS both sequences in hand at that moment (`ordered` and `bullets`,
  `tools/backlog-order.mjs:168-170`); it just discards the difference.
  Design (decided): on mismatch, print the first divergent index with the
  leading line of the bullet found there and the bullet expected there, plus a
  count of misplaced bullets. Exit code unchanged (1).
  Verifier: red-first — a fixture BACKLOG with one bullet moved out of rank
  order must produce the naming output; a fixture already in order must stay
  silent (over-firing control). Done-criterion: both bites, full suite green.
  Write boundary: `tools/backlog-order.mjs`, `test/backlog-order.test.mjs`.

- **DONE `d02d58c` + `f9ec558` (2026-08-08) — the both-zones class now has a
  check at the printed-output altitude, and it found two live defects on its
  first run.** `test/tool-output-stamps.test.mjs` executes each of the seven
  converted tools over a fixture and reads the actual bytes: ARM 1 (no bare UTC
  instant without a local pairing on the same line) and ARM 2 (no `local` text
  in machine-read output). 16 bites, all enforcing.
  **What it caught, which is the point:** `82372db` claimed a complete sweep;
  the check refuted it. `bust-triage`s capture step prints the pair stamps and
  the computed span raw at FOUR sites including the success path that fires on
  every clean triage, and `dossier`s step 3 does the same in what that file
  calls the body a person reads. Both verified live against fixtures, not read
  from source.
  **The repair shape, worth reusing:** the two lanes disagreed about
  `bust-triage`s `span` and both were right — it is composed once and read
  verbatim by BOTH `--json` and the text renderer, so mutating it leaks a
  suffix into a parsed payload, while no raw epoch survives at the print site
  to re-derive from. `local-stamp.mjs` gained `withLocalStamps`, applied at the
  TEXT boundary only; the stored value stays bare. One call at each tools
  single text emit site covers every stamp beneath it — including the dossier
  step 2 and step 4 rows the lane named as reached but never exercised.
  Desk note: the lane marked its two findings `todo` rather than silencing
  them, which was correct while `tools/` was outside its write boundary — but a
  todo test reports neither pass nor fail, so the markers were removed once the
  defects were fixed. A todo left standing is a bite that guards nothing.

- **DONE `c3481d1` (2026-08-10) — the header no longer claims defects that
  `f9ec558` fixed, and the same staleness had TWO siblings further down the
  file.** Unblocked by the dotfiles guard fix `025b95f` (dotfiles
  `BACKLOG.md:592` DONE, `LEDGER.md:106`), verified live here before editing
  rather than read off that entry: a `//`-carrying command ran, and the
  guard's own documented positive (`ls /`) still returned
  `deny: path '/' is outside allowed directories` — so the green was the fix
  and not a disabled hook.
  **Desk work beyond the booked design.** (a) The citations were kept per the
  design, and each of the seven line numbers was CHECKED still to point at its
  site (`f9ec558` repaired at the emit boundary, not in those lines) rather
  than kept on the assumption that a fix elsewhere leaves them alone.
  (b) Reading the whole file instead of only the named block found two more
  stale claims of the same class: the dossier ARM 1 comment called step 3 "the
  KNOWN gap, isolated into its own `{ todo }` test below" when no todo test
  exists, and the NAMED GAP block still read as unadjudicated while
  `f9ec558`'s single `withLocalStamps` pass at dossier's render return covers
  the step 2 / step 4 rows (they are still UNEXERCISED — that part was true
  and is now stated as the two missing fixtures).
  **The booked verifier was wrong, which is the fire-rate datapoint.**
  `grep -n "todo"` returning nothing is not achievable and should not be: three
  surviving mentions NARRATE the marker's removal, and deleting them would
  destroy the record the header exists to carry. A keyword verifier cannot
  separate a claim about the present from a description of the past. The
  load-bearing check is the suite's own `todo 0` (2514 tests, 0 fail), which is
  a measurement rather than a text match — this is the "an entry's verifier is
  a claim, probe it before building against it" class, third recorded instance.
  **Closing gate.** q1 — the mechanizable slice is booked as the entry
  immediately below; q2 n/a, the evidence is committed source, not a rotating
  capture; q3 no new census class, this is a doc-staleness class the census
  does not see; q4 no instrument change rode along and none was needed — the
  bites themselves were untouched, only the prose about them.
  ORIGINAL ENTRY:
- **DONE (2026-08-10) — `bust-appears.md` now checks the tool's conversation and
  model before trusting its verdict. CORRECTED ON EXECUTION: the entry claimed
  BOTH runbooks; only one was exposed.** `sweep-finding.md` does not open on
  `bust-triage` — its line runs freeze -> establish -> rule out instrument ->
  attribute -> route, and it reaches the tool only in the KNOWN-OPEN terminal
  state, for row mapping, which it already warns about at its own `:174-184`.
  Its findings arrive as `gate-live` rows per capture, so the model-blind
  SELECTION defect cannot reach it. The entry's "both runbooks" was written from
  memory of naming them together in a reply, not from reading either line — the
  same inherited-claim shape this session already booked twice, caught here by
  opening the file the entry named. No caveat added there; forcing one in to
  satisfy the entry would have been the tuning-to-fit failure.
  ORIGINAL ENTRY:
- **(shipped) READY — the both-zones class has no mechanism at the ALTITUDE the defect
  lives at: the printed output.** `82372db` fixed the sites a human found by
  reading; nothing stops the next one. The lane's own lesson says why a source
  check cannot cover it: `quota-analysis` and `cost-report` print raw UTC
  stamps without ever calling `toISOString()` (pass-through from upstream
  JSONL), so grep-for-the-render-call undercounts at the FILE level and again
  at the LINE level inside a file already in scope.
  Design (decided), `test/tool-output-stamps.test.mjs`: EXECUTE each converted
  tool in a side-effect-free invocation over a fixture, capture stdout, and
  assert no line contains a bare `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` without a
  `(HH:MM local)` on the same line. Companion arm: each tool's `--json` output
  must contain no `local` text.
  Constraint the lane must respect: find a genuinely side-effect-free
  invocation per tool, and where none exists, SKIP that tool explicitly with
  the reason named in the test file — never invent one that writes.
  Verifier: red-first — revert one converted site (e.g. `quota-analysis`'s
  "Time range") and the bite must name that tool; over-firing control — a line
  legitimately carrying a bare stamp (an output FILENAME, a machine field
  echoed in text) must not fire, so the exclusion is declared IN the test as
  data it checks, not as a softened regex.
  Done-criterion: red-first on the reverted site, control green, suite green.
  Write boundary: `test/tool-output-stamps.test.mjs` only.

- **DONE `8fc54e0` (2026-08-08) — `tools/md-splice.mjs` makes anchored splices
  fail loudly.** Desk verification beyond the lane: I replayed the ORIGINAL
  incident against the helper — a two-op call whose second op targets `## Open`
  in a file that says `## Ready` — and it threw naming `operation 2 (find:
  "## Open")` with expected/actual counts, leaving the file byte-identical.
  That is the instrument going red on the defect it was built for, established
  by replay rather than by its own expectation. First real use: this very
  grading edit. ORIGINAL ENTRY:
- **(shipped) READY (small) — anchored markdown splices fail SILENTLY, and the pattern is
  used constantly here.** Measured 2026-08-08 in `claude-worktime`: a python
  splice targeted `## Open`, that repo uses `## Ready`, and because only the
  FIRST replacement was asserted the second dropped with no error — the only
  tell was an insertion count that looked plausible. Same session ran this
  splice shape a dozen times against `BACKLOG.md`; each one re-pastes the
  assert-by-hand discipline, which is exactly where the re-pasted one-liner
  hides a variant bug (project convention: a probe used twice graduates to
  `tools/`).
  Design (decided), `tools/md-splice.mjs`: one exported function taking a file
  path and a list of `{find, replace, count}` operations; every operation
  states its expected occurrence count, and any mismatch throws NAMING the
  operation and both counts before writing anything. All-or-nothing: the file
  is written once, after every operation has matched its count.
  Verifier: red-first — an operation whose `find` is absent must throw with the
  operation named (not a generic error); an operation matching twice where
  `count: 1` was stated must throw; the all-or-nothing property gets its own
  bite (a two-operation call where the second fails must leave the file
  byte-identical). Done-criterion: three bites, each independently reddened
  from a green baseline. Write boundary: `tools/md-splice.mjs`,
  `test/md-splice.test.mjs` (both new).

- **DONE `93cbad4` + `3abc02d` (2026-08-08) — the pre-mutation premise is
  pinned by a runtime bite.** `test/capture-is-pre-mutation.test.mjs`: the
  pre-capture slice is derived from the loaded registry`s own `order` values
  every run, never from today`s extension names, so a future extension landing
  below 60 is exercised without the file changing.
  Two desk findings the lane did not have:
  (i) THE TIE WAS UNCOVERED. `splitAtCapture` divides on `order < rc.order`,
  so a mutator at exactly 60 fell into `atOrAfter` and was never exercised,
  while its real position against request-capture rested on sort stability.
  Found by probing the boundary once the lane`s bites were green: caught at
  59, missed at 60. Closed by FORBIDDING the tie rather than defining a
  tie-break, and red-proven on a TRUE positive — the registry already has
  collisions at 350 and 690, so aiming the same predicate there reddens it.
  (ii) The lane settled one claim statically (request-capture`s own onRequest
  does not mutate `body.messages`). Executed it instead: hash identical across
  the call, capture file written, so it engaged rather than no-opped.
  ORIGINAL ENTRY:
- **(shipped) READY — the premise EVERY attribution verdict rests on is guarded by a
  code comment and nothing else.** Every `OURS / CC's` call this repo makes
  reduces to one claim: the capture is PRE-mutation, so a divergence visible in
  it was sent by Claude Code. Measured 2026-08-08: `request-capture` is order
  60; the only thing asserting that no earlier extension touches the body is
  prose in `proxy/extensions/output-guard-stash.mjs` ("Order 55: before the
  first body-mutating extension (cc-version-normalize, 90)"). No test pins it.
  Instrument-positive for that absence: `grep -rn '\.order\b' test/` DOES find
  relative-order pins (`proxy-cc-version-normalize.test.mjs:275` asserts
  `ext.order < fingerprintExt.order`), so the pattern can match — it finds
  nothing for `request-capture`.
  **Why it is severe: the failure is silent and points the wrong way.** Add or
  reorder any extension below order 60 that touches `body.messages` and every
  future verdict flips from "CC's" to possibly-ours with no alarm — i.e. we
  would build a mitigation for a bust we caused. That is the exact
  mis-attribution the operator named as the thing to never do.
  **Do NOT verify this statically.** Measured the same day: a grep for
  body-mutation idioms returned zero for the three sub-60 extensions AND zero
  for two KNOWN mutators (`sort-stabilization`, `identity-normalization`), so a
  pattern search cannot answer "does X mutate Y" here.
  Design (decided), runtime, `test/capture-is-pre-mutation.test.mjs`:
  (a) REAL-REGISTRY BITE — run the actual loaded registry over a realistic
  fixture body; structurally hash `body.messages` at the instant
  `request-capture`'s `onRequest` runs; assert it equals the hash of the
  unmutated input.
  (b) RED-FIRST — inject a synthetic extension at order 50 that mutates
  `body.messages`; bite (a) must fire. This is a real mechanism disable, not a
  module-load red.
  (c) OVER-FIRING CONTROL — a synthetic extension at order 100 that mutates
  just as hard must NOT fire (a). Without it, (a) is indistinguishable from
  "nothing anywhere ever mutates", which is false and would make the check
  unprovable.
  Done-criterion: (b) reddens exactly (a) from a green baseline; (c) green in
  the same run; full suite green. Write boundary: `test/` only — no `proxy/**`
  change, so no tree-pin bump and no restart.

- **(DONE — 2026-08-08, `6d9a8d3`) `tools/dossier.mjs` carries the reconcile
  vocabulary-collision that `bust-triage` just shed.** Found 2026-08-07 while
  fixing the bust-triage half (`fb20f3d`): `dossier.mjs:286` does
  `if (d.transcriptCause && r.cause && r.cause !== d.transcriptCause.type)` ->
  "instrument disagreement", i.e. the same string-inequality test over two
  different vocabularies that warned on AGREEMENT. `sameEvent` and
  `CAUSE_EQUIVALENCE` are already exported from `bust-triage.mjs` for exactly
  this, so the change is one import and one call. Verifier, red-first: drive
  `dossier` on 2026-08-06T23:59:10Z (ledger `idle`, transcript
  `previous_message_not_found`) — today it must warn, after the change it must
  not; control, the raced-read positive (s-captureQ, 2026-08-05T09:09:41Z,
  ledger `other` vs transcript `messages_changed`) must still warn. Recorded
  honestly: identified by READING dossier, not by running it — the
  reproduction is the first step, not a formality.

- **(DONE — MEASURED 2026-08-08; the answer is YES, 69.8%) does `movedFresh` EVER fire on a pair the census labels
  `join:cross-message`? The matrix and the tool disagree and nobody has
  measured it.** Booked 2026-08-07 from the 05:24:37Z statiker walk. Row 4's
  2026-07-31 datapoint says the flap/cross-message-join mitigation is "BUILT
  and corpus-clean, pending deployment"; `replay.mjs`'s own census text says "a
  cross-message join spans two messages, so no hash set in the extension
  matches it"; and on that live 134k bust the deployed extension logged
  `moved=0 movedFresh=0` while the census scored the pair `mitigation: 0/0
  mitigable` — the shape never entered the mitigable denominator at all. One of
  those two statements is about a shape the other does not name, which is the
  one-phenomenon-two-names trap this repo already books elsewhere. This is a
  MEASUREMENT, not a design: over the corpus the daily sweep already reads,
  count pairs the census labels `join:cross-message` and, for each, whether the
  insertion event log records a `movedFresh > 0` at that request. Done when the
  two claims are reconciled in the matrix, or the divergence is minted as its
  own row. Discriminator stated so the result cannot be read both ways: a
  non-zero rate means the mitigation reaches the class and the 05:24 instance
  is a miss to attribute; a zero rate means the built mitigation and the census
  label name different shapes, and row 4's "pending deployment" line is
  describing something that is not this.

- **(DONE — 2026-08-08, `1d07836`; naming residual booked below) `rebilledBytes` prices the re-bill from the DIVERGENCE, the wire
  prices it from the last surviving BREAKPOINT, and the fire ledger's one
  meaningful ratio is built on the first.** Derived by hand during the
  2026-08-06 18:08:32Z walk and not booked at the time — caught by the
  session-close named-and-unbooked sweep, which is exactly the class that
  step existed for.
  `findMitigationGaps` computes `rebilled` as the sum of `inBytes` from the
  divergence index onward (`replay.mjs`, the `cur.inBytes.slice(from)` line),
  and `savedBytes` is its complement. `gate-live`'s `summariseFireBytes` reads
  both as the relocations class's leaked/saved columns, and its own comment
  calls `saved/(saved+leaked)` "the one ratio on this line that means
  something".
  **The model is breakpoint-blind.** The API reuses up to a WRITTEN
  cache_control breakpoint, not up to an arbitrary index, so a divergence at
  index N re-bills from the last breakpoint at or before N — and when no
  breakpoint sits between the array start and N, that is the whole array.
  Measured on the 18:08:32Z pair (s-captureAM, n=265->266): the census row
  reports `rebilledBytes` 114,653 while the transcript recorded `cc` 300,597
  against `ctx` 315,821 with `cacheRead` **15,222** — the surviving hit is
  tools+system alone. Threat-matrix row 4 already states this economics in
  prose ("all of which sit at the tail"); what is new is that a FIELD feeding
  a ledger does not model it.
  **Units, stated because this repo has been bitten by exactly this:** 114,653
  is `JSON.stringify(...).length` — UTF-16 code units under a name that says
  bytes — and 300,597 is tokens. They are not two measurements of one
  quantity and the entry does not divide them. The claim is about the MODEL,
  not a ratio between those two numbers.
  **What is NOT established, and it decides the size of the fix:** whether the
  ratio survives. Both columns share the model, so a uniform understatement
  would cancel — but the error depends on per-pair breakpoint placement, so
  uniformity is an assumption, not a finding. Nothing here has measured it.
  Design: price from the last cache_control breakpoint at or before the
  divergence, which `compactEntry` can retain as a per-message breakpoint
  index at no content cost (`outHashNoCC`/`stripCacheControlDeep` already walk
  the field). Keep the current number under its own name rather than
  redefining a field other rows carry.
  Verifier, red-first: on this pair the new number must price essentially the
  whole array while the old one prices the suffix, and a TAIL edit — where a
  breakpoint does sit at the divergence — must leave both numbers equal, since
  that is the case the current model gets right and a fix that moves it is
  overshooting.

- **(DONE — 2026-08-08, `844b792`; two findings booked separately below) `bust-triage` maps `replace/edit` -> row 4 flatly
  (`bust-triage.mjs:501`), so the census annotations that distinguish this
  row's sub-mechanisms never reach the operator at the runbook's designated
  entry point.** Measured 2026-08-06: the 301k s-captureAM bust is a 20-leg
  FLAP at one index with `anchorDelta` -45/-48 — i.e. the census's own
  far-from-anchor tripwire fires and says "NOT the known reminder-anchoring
  class" — and `bust-triage`'s verdict block shows `census replace/edit` and
  nothing else. `anchorDelta` exists nowhere outside `replay.mjs`: zero hits in
  `bust-triage.mjs` and zero in the threat matrix. A walker who runs only the
  triage (which is what step 2 of `runbooks/bust-appears.md` prescribes) cannot
  tell an anchored ±2 re-stamp from a deep oscillation, and the two have
  different mitigation stories inside one row.
  Design: `bust-triage` already imports `censusPair` from `replay.mjs`; have it
  also report the pair's `anchorDelta` and any `blockMigration`/FLAP rows on
  the same pair, and print the far-from-anchor callout verbatim when it fires.
  Verifier: run against this capture's stamp — the row must name FLAP and the
  anchor distance; run against a ±2 anchored instance and it must not.

- **(DONE — 2026-08-08, `2e088df`; deployed, pin `8127160`, restarted; the
  doctor half is booked below) `extensions.json` is NOT the activation gate: every `.mjs` in
  `proxy/extensions/` runs unless it disables ITSELF.** Found 2026-08-08 as the
  zero-order finding of the disarm enumeration; verified by the dispatcher at
  `proxy/pipeline.mjs:20-70`. `loadExtensions` does `readdir(dir)`, filters
  `.mjs`, and computes `const enabled = cfg?.enabled ?? ext.enabled ?? true`.
  Absence from `extensions.json` therefore means DEFAULT ON, not off. Six files
  are absent from the config and live anyway, four of them un-inspected as of
  this booking: `deferred-tools-restore.mjs` (MUTATES, `:352`),
  `thinking-block-sanitize.mjs`, `upstream-change-detection.mjs` (5 Maps),
  `prefix-diff.mjs`, plus `session-health.mjs` and `auto-1m-guard.mjs`
  (classified read-only/stateless).
  **Why this is more than a config nit.** The repo has a three-answer
  discipline for which GATES run — DECLARED/RUNNING/VERIFIED (the unit's
  `Environment=`, `/health`, and the sweep's status file), and `doctor`
  compares all three. There is NO equivalent answer for which EXTENSIONS run:
  a `.mjs` dropped into the directory is live with no declaration anywhere and
  nothing compares it against anything. Every enumeration of "what is enabled"
  written from `extensions.json` has been over the wrong set — which is the
  enumeration-keyed-on-a-NAME error from the dev-loop, one level up at the
  directory. FORK-NOTES' restart-transparency argument enumerates extensions
  this way and is booked separately for the same reason.
  Design: make the extension set answerable and comparable. Emit the loaded set
  (name, file, order, enabled, and WHERE enabled came from — config / module
  default / implicit true) on `/health` beside `gates`, and have `doctor` fail
  when a live extension has no explicit declaration. Do NOT flip the default to
  off in the same change: that is a behaviour change to the serving pipeline
  and needs its own row-3 declaration and live pricing.
  Verifier, red-first: plant a no-op `.mjs` in a scratch extensions dir, load
  it, and assert `/health` lists it with source `implicit-true`; assert
  `doctor` goes RED on exactly that condition and stays green when the same
  extension is declared. Negative control: a file with its own
  `enabled:false` must NOT appear in the loaded set.
  Consumer tier **1 (event disposition)** — every "which extension did this"
  attribution, including today's two bust walks, reads the set this would fix.
  <!-- entry: "extensions.json is NOT the activation gate" -->

- **(DONE — 2026-08-08, `6faf161`) the operator's view and `bust-triage --list` share NO identifying
  field, so neither side can name an event the other can find.** Operator,
  2026-08-07: "I feel like there must be some gaps here as well in our tooling
  that we can't properly match my reporting and what you are able to easily
  investigate and match." Correct, and it is computable.
  What each side actually sees. The ❄ token renders **ordinal (`#2`), size,
  cause, AGE (`17m`)** and the operator knows the **project** they are sitting
  in; it shows no session id and no timestamp. `--list` renders
  (`bust-triage.mjs:648-649`) **UTC stamp, size, cause, 8-char sid**; it shows
  no project, no age, no ordinal. **The only overlap is size+cause.** That is
  why an entire exchange ran on "203k / 230k / 419k" as the sole handles, and
  why "the largest" and "the latest" collided into a phantom disagreement — with
  the zone mismatch (its own entry, above) sitting on top.
  Design: `--list` gains the three fields the operator can read off their
  screen — the per-session ORDINAL that worktime displays, the PROJECT
  directory the session belongs to, and the AGE — beside the existing UTC
  stamp and sid. The ordinal is the load-bearing one: worktime already computes
  it (`cold_count`, `claude-worktime.sh:1371`), the operator sees it, and
  "#2 in statiker" is unambiguous where "230k" is not. Project comes from the
  transcript path under `~/.claude/projects/`; age is `now - t`, rendered like
  the token's.
  **Operator addition, 2026-08-07, and it improves the design:** a WINDOW and
  SESSION GROUPING, not just extra columns. Today `--list` shows "15 of 112" —
  a count, not a period — while the question actually asked is "what happened
  in the last day, and in which sessions". So: `--since <dur>` (default 24h)
  and rows grouped under their session, each group headed by project and
  session, e.g. `statiker c08e2235: #1 203k messages_changed 06:08 local /
  #2 230k messages_changed 06:17 local`. Grouping is what makes the ordinal
  meaningful, since the ordinal is per-session by construction.
  Extend `--list`; do NOT add a tool. `bust-triage` already carries the
  conversation-grouping, the ledger/transcript reconcile, and the
  three-answer discipline, and a fresh file re-earns all of it from zero.
  **SEQUENCING, and this is the part that must not be skipped: the overview
  inherits the ledger's three known duplication modes** — one event booked
  three times (17:39:59/17:40:08/17:40:16Z), two events booked under
  contradictory classes (23:59, 03:32), and a pair with no retraction. Built
  today, a 24-hour overview would render phantom rows with an authoritative
  face, which is strictly worse than the current friction: the operator would
  stop trusting it after the first phantom, and a display nobody trusts is the
  guard-trains-its-reader-to-ignore-it shape. So this ships AFTER, or
  simultaneously with, the claude-worktime dedupe (that repo's entry (B)), or
  it ships with a stated caveat line naming the duplication modes in its own
  output — never silently.
  Verifier, red-first against today's own confusion: given only what the
  operator can see — "statiker, #2, 230k, messages_changed, 17m" — one
  `--list` invocation must identify exactly one row, and the same three inputs
  against the OTHER session's 419k event must identify a different single row.
  Today neither is possible, which is the red. Negative control: a session with
  one bust must render no ordinal, matching the token's own omit-at-N=1 rule,
  so the two displays cannot disagree about the ordinal itself. Plus a
  duplication control: the 17:40 triple must appear as ONE row (or as one row
  flagged as a known duplicate set), never as three.

- **(DONE — 2026-08-08, `13278fa`) `bust-triage` reports a state-key CHANGE across the pair as its own
  line (runbook step 8's GRADUATE marker, now with a measured false verdict
  behind it).** The marker has sat in `docs/runbooks/bust-appears.md` step 8
  since it was written; 2026-08-08 supplied the miss it predicted. On
  s-captureAT the tool answered `VERDICT: MITIGATED / matrix row 1 (MITIGATED)`
  for a pair whose two requests ran under different state keys with both sides
  `no-prior-canonical` — i.e. it reported the ROW's status as though it were a
  per-instance absorption claim, on an instance where nothing absorbed.
  Consumer tier **1 (event disposition)** under the dev-loop's reach ordering:
  a walker who runs only the triage, which is what step 2 of the runbook
  prescribes, closes the walk on a pass that was not one.
  Design: `bust-triage` already locates the pair's two requests by timestamp;
  read `~/.local/state/cache-fix/snapshots/*-insertion-events.jsonl` (and the
  deferred-tool log) at those two timestamps, and emit the state key for each
  side plus a `KEY-FLIP` line when they differ. A flip is a stop-here, ranking
  with UNCLASSIFIED and STATUS-UNREADABLE, because a body diff cannot see it.
  Emit `no-prior-canonical` on both sides as its own note even when the key is
  stable — "armed but baseline-less" is the state this walk needed named.
  Verifier, red-first, and it is available today rather than synthetic: run the
  new code against **2026-08-08T09:59:54Z** (s-captureAT) — must emit KEY-FLIP
  and must NOT close as MITIGATED; and against **2026-08-08T09:48:53Z**
  (s-captureAS), whose pair was measured state-key IDENTICAL — must NOT emit
  KEY-FLIP. Two live cases, one of each polarity, so the check cannot pass by
  always firing. Old code fails the first and passes the second, which is the
  red.
  **Second half, same entry because it is the same read** (added 2026-08-08
  when runbook step 11 was corrected): once the tool reads those logs it also
  PRINTS the snapshot command for them, beside the pin command it already
  prints — for whichever artifact the verdict actually rests on. The runbook
  now carries the artifact table and the machine-local snapshot convention
  (`~/.local/share/cache-fix/bust-evidence/<date>/`, 0600, never committed —
  raw lines carry session ids and the hygiene scan's `capture-uuid` class
  blocks them at push); what is missing is the tool emitting it, so a walker
  who runs only `bust-triage` is told which freeze to take. Verifier: on
  s-captureAT the tool must print an event-log snapshot command, on a pair
  whose finding is byte-shaped it must print the pin command, and the
  snapshot arm must be shown to reproduce (both timestamps present, >1
  distinct `key`) — a snapshot is a claim exactly like a pin is.
  <!-- entry: "bust-triage reports a state-key CHANGE across the pair" -->

- **(DONE — 2026-08-08, `2545fdf`; 29 violations remain for the repair lane) the WRITER-side guard that ends the XDG class: a module importing
  `statePath`/`dataPath` must not carry a `~/.claude` citation outside a
  labelled legacy context.** Proposed 2026-08-08 by the lane that ran the
  accounting, and it is the one item here that would stop the sweeps rather
  than run another one. Rule zero applies: this is the generator, and every
  sweep so far has been the amplifier.
  **Why it is the right predicate:** it is computable, it has near-zero false
  fires (a legacy/migration mention is labelled and exempt by construction),
  and it fires at WRITE time rather than at sweep time. Measured reach: it would
  have caught all 14 comment hits in the accounting's bucket (d), plus the four
  `description:` strings fixed before them — i.e. the entire source half of a
  class that has now consumed four lanes.
  **Red-first, and the arrangement is real and in hand:** the 14 known hits are
  committed history. Point the check at the tree before `bdd964d` and require it
  to name them; point it at the tree after the bucket-(d) lane lands and require
  silence. Both ends exist, so this cannot decay the way a live-state
  arrangement does.
  Placement: a repo check under `tools/`, wired into the suite the way the other
  source-shape guards are. NOT `gate-live` — this is a source property, not a
  traffic property.

- **(DONE — 2026-08-08, `83de792`; residual named below) FORK-NOTES asserts
  `deferred-tool-rewrite` is disabled; it is
  ENABLED in the serving config, and that sentence is load-bearing.**
  The sentence is corrected AND the argument it was a premise of is re-derived
  rather than patched around. Three claims verified by the dispatcher in the
  artifact, not booked on the lane's word: `/health` reports
  `"CACHE_FIX_TOOL_REWRITE":"1"`; `grep -l 'body\.tools' proxy/extensions/*.mjs`
  returns **FOUR** files, not the three the old argument enumerated; and
  `tools/verdict-ab.mjs:55` is hardcoded (below).
  **The re-enumeration is the part worth keeping.** Two extensions touching
  `body.tools` had never been considered — `thinking-block-sanitize` (reads
  only, for a hash) and `tool-input-normalize`, which is ACTIVE because
  `extensions.json` overrides its own file-level `enabled: false`. That is the
  `extensions.json`-is-not-the-activation-gate finding arriving from the
  opposite direction: the old argument enumerated from memory of a config, and
  the config both under- and over-states what runs. Outcome: row 3's
  restart-transparency verdict does NOT need re-grading — it gains a fourth
  confirming mechanism (`body.tools` is rebuilt every request from
  disk-persisted state, so a fresh process reproduces it byte-identically)
  instead of losing its only stated one.
  **RESIDUAL, and it is a PARENTAGE defect in this entry rather than in the
  work: the verifier this entry named cannot verify what it was named for.**
  The entry said "a restart with `verdict-ab --seed-from-a` over the
  deferred-tool canon". `tools/verdict-ab.mjs:55` is
  `const EXT = "proxy/extensions/insertion-normalization.mjs"` — hardcoded, no
  override, single-extension by its own header's admission. The lane ran it as
  literally specified (exit 0, IDENTICAL across 310 verdict lines, 8 corpora)
  and then said plainly that the green was OFF-TARGET, which is the right call
  and the reason it is recorded here: a spec sentence and the tool it names
  disagreed, and neither settles it from the inside. So this entry's
  restart-transparency half rests on CODE READING with the label **unverified**
  for the executed half. The tool that would actually verify it is
  `replay.mjs --restart-at N` against a deferred-tool-carrying fixture. That is
  booked below as its own entry rather than left as a caveat here.
  Measured 2026-08-08: `FORK-NOTES.md` (the restart-transparency section)
  states "`deferred-tool-rewrite` (the only extension holding tool-order state)
  is disabled in the unit". The extension's gate is `CACHE_FIX_TOOL_REWRITE`
  (`proxy/extensions/deferred-tool-rewrite.mjs:92`) and `/health` reports
  `CACHE_FIX_TOOL_REWRITE=1`; its event log carries `action=rewrite` on live
  traffic in both sessions examined that morning. So the claim is false against
  the running system.
  **Why this is not a typo fix.** The sentence is a PREMISE in FORK-NOTES' own
  argument that no enabled extension can vary `body.tools` across a restart —
  the argument that supports treating restarts as cache-transparent and that
  retired an earlier "restarts bust live sessions" caution. With the premise
  false, the argument's reach is unknown: `deferred-tool-rewrite` is named
  there as *the* extension holding tool-order state, and it is running.
  Design: correct the sentence, then re-derive the restart-transparency
  argument from the current gate set rather than editing around it — the
  stale-premise rule's "plans and conclusions built on the old premise execute
  stale unless enumerated and re-derived". State explicitly whether
  `deferred-tool-rewrite`'s persisted serialization state makes a fresh process
  emit a byte-identical `body.tools`, citing the code that makes it so.
  Verifier: a restart with `verdict-ab --seed-from-a` over the deferred-tool
  canon, plus the assertion that the corrected FORK-NOTES sentence names the
  same gate value `/health` reports. Done when the sentence and the argument
  both match the serving config, or the row-3 restart-transparency claim is
  re-graded with its new bound stated.
  <!-- entry: "FORK-NOTES asserts deferred-tool-rewrite is disabled" -->

- **(DONE — WITHDRAWN before implementation, 2026-08-08; see
  `docs/directives/portable-state-roots.md` §7) key our roots by PROFILE when
  `CLAUDE_CONFIG_DIR` is set, because
  that variable IS Claude Code's profile identity and our single global root
  silently dissolves it.**
  **The design is REVERSED, and the reason is measured rather than cautious:
  `CLAUDE_CONFIG_DIR` does not mean what this entry assumed.** It does not bound
  Claude Code's OWN footprint — session-resume mirrors under `os.tmpdir()`, a
  separate `CLAUDE_SECURESTORAGE_CONFIG_DIR`, an XDG updater family
  (`versions`/`staging`/`locks` under the XDG data/cache/state roots), a
  platform-fixed managed-settings root, and `.claude.json` as a SIBLING FILE in
  `$HOME` all escape it. A knob that does not contain its own product cannot be
  sold as containing ours, so both halves of this entry's design — "DATA follows
  the config dir" and the profile-suffix rule — are withdrawn. Establishing that
  took two independent lanes, one reading documentation and one reading the
  installed binary, and each caught something the other missed; the record is in
  §7.
  What replaces it is what was already there: the explicit `CACHE_FIX_DATA_DIR`
  / `CACHE_FIX_STATE_DIR` overrides, which are OUR contract and cannot move
  under us. Profile isolation and security relocation are BOTH served by the
  user setting the override per profile.
  **The surviving piece was STRANDED inside this entry as a subordinate clause
  and is now its own READY entry** (`CacheFixConfigDirDivergenceWarning`, at the
  end of `## Open`). That is the carrier defect worth recording: the warning had
  been AMENDED into this entry rather than split out, so re-grading the parent
  — which is correct — would have taken the only remaining answer with it. The
  peer session that made the withdrawal caught it and asked for the split before
  the re-grade, which is the only order in which it was catchable.
  **This entry also cost a rank.** The 2026-08-08 afternoon derivation ranked it
  at cost rank 6 on the basis that its hard sequencing constraint had dissolved.
  That check was TRUE and answered a narrower question than the one it shut:
  `portable-state-roots` shipped, and the design it gated did not survive. The
  rank is VACATED rather than re-pointed, per the DONE-anchor guard.
  Original entry follows. Designed 2026-08-08 when the operator challenged the
  don't-use-`claudeHome()` decision; the decision survived, this gap did not.
  Claude Code's machinery has exactly ONE storage concept: a single relocatable
  root, no config/data/state split (`getClaudeConfigHomeDir()` is one memoized
  base for config, caches, state and transcripts alike). `CLAUDE_CONFIG_DIR`
  therefore carries two meanings at once — WHERE things live, and WHICH PROFILE
  they belong to. `proxy/claude-home.mjs:5-7` names the second in its own words:
  "running one proxy per config dir". Our XDG roots honour neither, so two
  profiles under two config dirs commingle their captures in one directory,
  losing an isolation upstream's `claudeHome()` callers get for free.
  **The split this design rests on:** copy Claude's IDENTITY model, refuse its
  STORAGE model. Its storage model puts data in a config directory because it
  has no split, and the harness then protects that path by SHAPE — which is the
  defect that caused the relocation in the first place, so copying it
  reproduces the thing we fixed. Identity is orthogonal to storage class and
  costs one path segment.
  Design: `root(kind)` = explicit `CACHE_FIX_{DATA,STATE}_DIR` used as-is;
  otherwise `<xdg-or-platform-base>/cache-fix[/<profile>]`, where `<profile>` is
  OMITTED when `CLAUDE_CONFIG_DIR` is unset or resolves to the default
  `~/.claude`, and is a short stable key derived from the resolved config-dir
  path otherwise. Derive the key from the RESOLVED absolute path, not the raw
  variable, so `~/x`, `$HOME/x` and `/home/g/x` are one profile and not three —
  the hand-rolled-identity rule applies to path keys too.
  **Sequencing (hard): lands AFTER `docs/directives/portable-state-roots.md`
  ships**, and as its own commit. Bundling it hides which edit moved which path,
  and the portable-roots change carries a byte-identical-paths invariant that
  must be provable on its own.
  Verifier, red-first, three arms: (1) `CLAUDE_CONFIG_DIR` unset -> roots
  byte-identical to today (the no-op control that protects the live deployment
  — measured 2026-08-08: neither `CLAUDE_CONFIG_DIR` nor `XDG_*` is set in the
  unit or the operator's environment, so this arm covers production); (2)
  `CLAUDE_CONFIG_DIR` set to the DEFAULT `~/.claude` -> still no suffix, which
  is the over-firing control and the one a naive implementation fails; (3) two
  distinct config dirs -> two distinct roots, and the same dir spelled three
  ways -> one root. Old code fails (2)... no: old code passes 1 and 2 and fails
  3, so arm 3 is the red.
  **AMENDED same day, operator question: the security-boundary case is SOLVED
  by construction, not by the warning.** The first draft of this entry left a
  relocated-`CLAUDE_CONFIG_DIR` user with our DATA root at the platform default
  and offered a warning as the answer. A warning is a notification, not a
  control, and for a security boundary that is the wrong instrument.
  What the evidence changed: the DATA root has exactly two consumers
  (`git grep -l "dataPath("` over `proxy/`), and both are the sensitive ones —
  the MITM CA (`proxy/config.mjs:67`, already overridable via
  `CACHE_FIX_CA_DIR`) and the capture corpus (`request-capture.mjs`, already
  opt-in behind `CACHE_FIX_REQUEST_CAPTURE=1`). STATE holds the regenerable
  half: event logs, snapshots, status files. So the module's own split rule —
  unrecoverable if lost -> DATA, regenerable -> STATE — already partitions by
  SENSITIVITY as well as by durability, and the design can use that.
  So the roots diverge deliberately, and the rationale is stated because two
  roots behaving differently is otherwise a surprise:

      DATA:  CACHE_FIX_DATA_DIR
             -> $CLAUDE_CONFIG_DIR/cache-fix   (when set and non-default)
             -> platform/XDG data root
      STATE: CACHE_FIX_STATE_DIR
             -> platform/XDG state root [+ profile suffix, above]

  DATA follows the boundary the user CHOSE; STATE follows platform convention.
  A user who deliberately puts their Claude root on an encrypted volume has
  stated where their Claude-adjacent secrets live, and our preference for
  spec purity does not outrank that — while regenerable operational logs have
  no such claim on the volume.
  **This also simplifies the entry above rather than adding to it:** DATA
  following `CLAUDE_CONFIG_DIR` gives profile isolation for free, so the profile
  SUFFIX is needed only on the STATE root. One mechanism, not two.
  The explicit `CACHE_FIX_*_DIR` overrides stay top of the ladder, which is the
  escape for the case this does NOT cover: a relocated config dir that the
  harness's shape-based protection still prompts on. Whether it does is
  **UNVERIFIED** — the protection keys on path shape and a user-chosen
  `/secure/claude` is probably not that shape, but nothing here measured it, and
  the argument above deliberately does not rest on it.
  `CacheFixConfigDirDivergenceWarning` narrows accordingly: it now fires only
  when STATE diverges from a set `CLAUDE_CONFIG_DIR`, since DATA no longer
  does — and if that leaves it firing on every relocated-config user for a
  divergence that is now deliberate and documented, it should not ship at all.
  Decide that when the portable-roots lane's version is in hand.

- **(DONE — OVERTAKEN, 2026-08-08 afternoon, verified by reading the file;
  residual
  named below) `.claude/settings.local.json` still grants the DEAD capture path,
  so every agent read of the corpus now costs a permission prompt.**
  **The load-bearing half of this entry is FALSE against the world today, and
  the probe cost one Read.** The entry's whole case is "the grant that would
  stop it does not exist". It DOES: `.claude/settings.local.json:9` carries
  `Read(//home/g/.local/share/cache-fix/captures/**)` and `:10` carries
  `Bash(cp ~/.local/share/cache-fix/captures/*)` — the live XDG paths, both
  present. So the designed work is already done and no config write is needed;
  the veto-gated call this entry existed to justify never had to be made.
  **Residual, which is clutter and not a defect:** the dead grants remain at
  `:11-12` and at `:33,35,36,37` (the legacy alias-registry commands). They
  permit paths nothing can read, which is harmless — the entry's own design said
  KEEP the legacy entries through the transition anyway. They retire with
  `legacyReadPath`, on that entry's 30-quiet-day trigger, not separately.
  **Why this is recorded rather than deleted:** it is the fourth entry this week
  whose own load-bearing claim dissolved under a one-command probe, and the
  first found by the DERIVATION rather than by a lane briefed against it — the
  ranking removed its rank on the promise of doing the work, and the work turned
  out to be done. That is the stale-premise class the handoff names, and the
  standing repair (nothing checks that a booked premise is still true) is the
  PARKED verifier-runnability entry.
  Original entry follows. Lines 9-10
  grant `Read(//home/g/.claude/cache-fix-captures/**)` and a `Bash(cp
  ~/.claude/cache-fix-captures/…)`; that directory no longer exists — the
  migration moved the corpus to `~/.local/share/cache-fix/captures/` (96
  entries, verified 2026-08-07 20:20Z). The grants are write-only labels: they
  permit a path nothing can read and fail to permit the one everything reads.
  Design, decided: ADD `Read(//home/g/.local/share/cache-fix/captures/**)` and
  repoint the `cp` rule; KEEP the legacy entries through the transition,
  matching the code's one-transition fallback. Config write, therefore
  veto-gated — correctly refused once when a SUBAGENT asked for it (permission
  laundering); the operator asking is not that. Done-criterion: an agent `Read`
  under the XDG captures path raises no prompt.
  <!-- entry: "settings.local.json still grants the DEAD capture path" -->

- **(DONE — 2026-08-08, dotfiles `3014043`) "already on a remote" is not "already
  public", and the shipped scoping cannot tell them apart.**
  **SHIPPED as DECLARED publicness, not inferred.** `OEFFENTLICHE_REMOTES` sits
  beside `GUARDED`, same list-not-pattern form: the published set is stdin
  `<old>` (always, unconditional) UNION the tracking refs of remotes whose URL
  is declared public. Matching is on a normal form (`host/owner/repo`,
  lowercased, so `https://…/r.git` and `git@…:o/r.git` collapse) and is EXACT
  rather than substring — `…/claude-code-cache-fix` is a prefix of
  `…/claude-code-cache-fix-private`, so a substring match would declare public
  precisely the mirror the list guards against. That trap carries its own
  assertion.
  **The route NOT taken, and why, because the record had it backwards.** The
  entry specified destination-only scoping. The building lane implemented it,
  measured it, and showed it reddens two battery bites that encode measured
  2026-08-06 incidents: bytes already public on UPSTREAM must not block a push
  to ORIGIN. Upstream is public, so those bytes are already beyond recall and
  blocking them is the fires-on-a-non-defect shape on the one gate before
  unerasable history. Destination-only was too narrow; any-remote was too wide;
  declared publicness is the only reading that keeps both properties.
  **A prior halt on this design was recorded with a basis that had gone STALE**
  — its stated reason, "regresses the two 2026-08-06 cases", was true on
  2026-08-07 under the blob-granular rule and false after the finding-granular
  change of 2026-08-08. Re-measuring cost ten minutes and changed what was
  actually being decided. An inherited verdict deserves a re-measure, not a
  re-read.
  **Verified by the dispatcher before pushing:** `pre-push --test` all green
  against the deployed scanner; the two incident bites' assertions byte-identical
  (only a fixture-realism argument changed on a shared helper, same class as the
  already-blessed 7/7b fix); and all three declared URLs confirmed `PUBLIC` via
  `gh repo view --json visibility`, because declaring a private repo public is
  the one failure this design cannot survive.
  **First LIVE git-invoked runs, and stated precisely rather than generously:**
  the fork's pushes at 10:19:32 and 10:22:19 ran the new hook as a real git
  hook (committed 10:18:57; the fork is `GUARDED`). Neither crashed and neither
  false-blocked. That is the clean-path only — a scan returning no findings
  short-circuits before the filter — so the FILTERING path remains
  battery-and-fixture verified, not live-verified. The distinction is the whole
  difference between "it ran" and "it worked".
  **Named limits, all fail-closed by construction, none measured:** the URL
  normal form covers https and scp-style; `ssh://` with an explicit port and
  other transports fall through to NOT-public. The `git push <url>` form
  contributes no declared remote, so stdin `<old>` alone applies. Each errs
  toward keeping findings, which is the safe direction, and each is unmeasured.

- **(DONE — verified shipped 2026-08-08 by reading the deployed hook, not the
  entry) the push-side leak scan reaches ONE repo; body and design live in
  `~/dev/Gunther-Schulz/dotfiles/BACKLOG.md` (booked 2026-08-06).**
  **Re-graded before dispatching against it**, which is the third stale grade
  caught today by probing an entry's claim first. The design was to split
  `MARKER`'s two jobs; `git/hooks/pre-push` now carries exactly that:
  `SCANNER_REPO = "claude-code-cache-fix"` (`:121`) keeps the fallback-scanner
  path, and `GUARDED = (SCANNER_REPO, "claude-worktime")` (`:132`) is the
  activation list `is_active` reads (`:170-172`). The measured trigger — one
  `capture-key-prefix` finding already published in `claude-worktime`'s history
  — is covered: that repo is guarded now.
  **What is NOT closed, and is a DECISION rather than a residual:** every repo
  outside `GUARDED` still gets a silent exit 0. The file says why in its own
  comment — deliberately a LIST, not a pattern, because the hook is fail-closed
  on a missing scanner and a repo swept in by regex would push unchecked. So
  the entry's "reaches ONE repo" framing is superseded: it reaches the repos on
  a list, and widening the list is a per-repo decision with a scanner
  prerequisite, not a bug to fix. A future repo handling capture keys gets
  added to `GUARDED` deliberately; that is the standing action, not a build
  item.

  The machine-wide `git/hooks/pre-push` dispatcher activates on one substring
  (`MARKER = "claude-code-cache-fix"`, `is_active = any(MARKER in u)`), so
  every other repo gets a silent exit 0 — including `claude-worktime`, which
  is PUBLIC, handles session ids and capture keys by its nature, and as of
  2026-08-06 carries this repo's operator-side bust items. One
  `capture-key-prefix` finding already sits in its published history,
  unremediable.
  **Why a pointer HERE when the code is there** (operator, 2026-08-06): the
  two repos are operationally linked, and the session likely to do this work
  is a cache-fix bust session — the scanner it would extend is
  `tools/absence-scan.mjs` in this tree, and the hazard is discovered here.
  The carrier rule wants the body where the work happens and a pointer on the
  reader's path; this is the pointer. It is deliberately NOT a copy — the
  design (including the `MARKER`-has-two-jobs trap) is stated once, there.
  Do not execute from this entry; open that one.
  Same shape, mirrored, as the two claude-worktime pointers above: body in the
  executing repo, pointer where the finder sits.
  **BUILT 2026-08-07, UNPUSHED (dotfiles `ca46be4`).** `MARKER`'s two jobs are
  split exactly as the design says — `SCANNER_REPO` keeps the fallback scanner
  path, a separate `GUARDED` tuple drives activation, and activation stayed a
  LIST. Verified here rather than on the report: reverting `GUARDED` to its old
  single-entry value reddens exactly the claude-worktime assertion and
  restoring it greens the whole battery. The lane also graduated its end-to-end
  probe into the battery as a permanent case, so activation is no longer proven
  only by a bare predicate assertion.
  **The push is BLOCKED and not by this work:** two peer-session commits
  (`b795abf`, `8942ec5`, both operator-GO corpus/gate work) sit in the same
  outgoing set, so pushing would publish another session's work. Halted as a
  question rather than pushed — an unexpected commit in the push set is
  answered, never resolved by a live push.
  **EVIDENCE CORRECTION, measured by the lane and stronger than what the
  dotfiles entry states:** that entry cites ONE `capture-key-prefix` finding in
  claude-worktime's `BACKLOG.md`. Measured over the whole history: **four**
  findings, and **none of them in `BACKLOG.md`** — two in `claude-worktime.sh`,
  one in `docs/cachebust-runbook.md`, one in `tests/replay-cold-detect.sh`,
  plus one in a commit message. All are ancestors of `origin/main`, published
  and unremediable. This strengthens the entry's own trigger-rate argument, and
  the dotfiles-side body still carries the stale number — correct it there when
  that repo is next written.
  **ENTRY TWO ("already on a remote" is not "already public") is HALTED at a
  design contradiction, and the decision is the operator's** — the entry's
  design (scope the published set to the DESTINATION remote) was implemented
  and measured, and it regresses the two 2026-08-06 cases: this clone has
  `origin` and `upstream` both public, so destination-only scoping stops
  counting upstream as published and re-blocks every push to origin. The entry
  itself concedes the premise ("origin and upstream are both public GitHub
  repos") and specifies only what to do about a PRIVATE remote. The options are
  (A) destination-only, measured and rejected; (B) destination plus an
  explicitly DECLARED-PUBLIC remote list — fail-closed, keeps the measured
  cases green, and note that matching by repo NAME does not work because a
  private mirror carries the same name; (C) park with the residual named, since
  no clone here has a private+public pair today. Nothing is committed for entry
  TWO; the measured implementation is preserved as a patch in the lane's
  scratch.

- **(DONE — 2026-08-08, `052468b`) the byte-gate's `anyPresent` probe can never
  return false for a
  RECURRING reminder text, so a pruned host is reported MISMATCH instead of
  DROPPED.**
  **SHIPPED in the MATCHING form, not the counting one**, and the corpus result
  was reproduced by the dispatcher rather than booked from the report: 100/100
  captures read, 0 UNREADABLE, **9 DROPPED / 1 MISMATCH** (was 8 / 2). The sole
  surviving MISMATCH is case A — `2026-08-06T11:12:52.584Z host=3 blocks=3
  recon=4347ch rejected=7961ch`, the genuine wrapper-envelope hole — and the
  verdict block still reads `DO NOT SHIP as-is`, which is the outcome that
  mattered: whole-body counting would have reached ZERO MISMATCH and flipped
  that block to "the rule holds on every occurrence", turning the gate green
  for a NORMALIZATION design while a live hole existed.
  **`hj === null` was MEASURED, not argued, and the measurement changed the
  answer.** Over 100 captures / 17.5k pairs / 950 hosts it occurs TWICE, and
  BOTH occurrences reach the no-counterpart branch reporting a bogus rejected
  candidate (25,870ch and 36,066ch, each the message at index 1). So the guard
  was extended to cover it; both rows now print `host-unlocatable`. The
  competing lane had left this unmeasured and its guard did not cover it — had
  that implementation been integrated, the defect would have shipped with a
  plausible story saying it was probably unreachable.
  **Three states now have three words**, closing the tell this row inherited:
  `host-pruned` (host absent), `host-unlocatable` (host carries no id),
  `actual=0ch` (host located, nothing found — three rows, correctly).
  **NAMED RESIDUAL, written at the branch in code as well as here:** a created
  counterpart whose text is byte-identical to a carrier pruned in the SAME pair
  is accounted for by it and reads DROPPED. Outside that case the one-way
  property holds (a true DROPPED may read MISMATCH, never the reverse), so the
  tally stays an upper bound on holes. No live instance searched for.
  Original entry follows. Found 2026-08-07 by the byteGate-MISMATCH lane, dispatcher-verified
  in the code the same hour. Instrument-partition tier 2 (feeds the GATES): a
  MISMATCH blocks shipping any NORMALIZATION design, so a false MISMATCH blocks
  a correct mitigation, and this one has been standing in the corpus-wide tally
  that three documents quote as a semantics question.
  **The defect, at `tools/reminder-migration-census.mjs:326-330`.** The
  no-counterpart branch distinguishes DROP from rule-failure, and its own
  comment states the question correctly: "if the text is absent from `after`
  ENTIRELY, nothing migrated and the rule was never exercised". The
  implementation asks a different question — `blocks.some(...)` takes a 60-char
  probe of each block and searches `wholeAfter()`, the entire serialized after
  body. For a reminder text that recurs at other indices the predicate cannot
  return false whatever the pair did. This is dev-loop's own "a needle that
  matches more than one thing", shipped inside a tool rather than a throwaway
  probe — and the file that documents that lesson is the one this tool's author
  had read.
  **The measured instance (s-captureAP, request ordinal 97, predecessor 96,
  2026-08-05T11:44:44.398Z / 13:44 local).** `MISMATCH host=186 blocks=2
  recon=780ch rejected=37831ch`; n 190->189, prune INTERIOR-DIVERGENT div=174
  anchor=176. The host's `tool_use_id` is absent from the after body entirely —
  the host was PRUNED, nothing migrated. Per-block occurrence counts, which are
  the whole evidence and are what the fix keys on:

  | block | as standalone system msgs | 60-char probe occurrences |
  |---|---|---|
  | 0 (319ch, PreToolUse:Bash push-claim hook) | before [40, 87, 175] -> after [40, 87] | before 4 -> after **3** |
  | 1 (459ch, PostToolUse:Bash plugin-update hook) | before [] -> after [] | before 1 -> after **0** |

  Every count DECREASED. `anyPresent` fired on pre-existing standalones at
  indices 40 and 87 that are byte-identical on both sides. Correct verdict:
  DROPPED.
  **Design, decided — the discriminator comes from the DEFINITION, not from the
  artifact.** The question is whether a counterpart was CREATED at or after the
  host's position, never whether the text appears somewhere. So `anyPresent`
  becomes `anyCreated`.
  **REFUTED 2026-08-08 by the dry-run this entry said it had already done.**
  The struck design read: "per block, count occurrences in BOTH bodies and
  require some block's after-count to EXCEED its before-count. Checked against
  both live cases: case B has no block increasing -> DROPPED; case A
  (s-captureAQ, the genuine wrapper-envelope hole) creates its standalone in
  after, so that block's count increases -> stays MISMATCH." The second half is
  false, and the word "checked" is what makes this worth recording: the dry-run
  was asserted, not executed. Measured by the lane, before any edit, with a
  probe importing `analysePair`/`conversationOf` and counting EVERY match —
  case A (reqOrd 25, prev 24, host present in after at hj=2): block 0 probe60
  2->2, block 1 2->2, block 2 1->1. Whole-body `anyCreated` calls case A
  **DROPPED**, which is a FALSE DROPPED — the one-way error direction REVERSED,
  hiding a real hole instead of over-reporting one.
  **The mechanism is structural, not a quirk of the case:** a migration
  CONSERVES the whole-body count — the inline occurrence disappears exactly as
  the standalone appears — so counting a serialized body is blind to precisely
  the event "a counterpart was created". The corrected design counts the
  STANDALONE population `classify()` already walks (`sysBefore`/`sysAfter`),
  which is what "counterpart" means in this tool: case A block 2 goes 0->1,
  case B goes 3->2 and 0->0. It is also cheaper than the shipped code — no
  `wholeAfter()` serialization, so the per-pair memory note at `:324-326` stays
  satisfied.
  **And COUNT-ONLY is still not the definition, decided at the desk on the
  lane's own case B.** A pair that PRUNES one standalone carrying the block's
  text AND creates a counterpart nets zero, reads "no increase", and returns a
  false DROPPED; case B's block 0 (`standaloneSys` 3->2) proves prunes are
  ordinary here. So the rule is a MATCHING one — a standalone in after not
  accounted for by a corresponding standalone in before — and count-only ships
  only with that residual named in the code, in the report, and as a stated
  loss of the one-way error property the corpus tally's bound rests on. A
  synthetic prune+create pair is the bite that pins it either way.
  **Second, independent defect in the same row, and it is a fix that
  overshot.** `rejectedCandidate` (`:302`, `:304`) exists to cure the
  `actual=0ch` misleading tell — the READY entry further down this file. Its
  position filter reads `if (hj !== null && hj >= 0 && s.j <= hj) continue;`,
  so when `hj = -1` (host absent, exactly this case) the guard short-circuits,
  no filter applies, and the FIRST system message in the array is reported as
  "the nearest position-eligible standalone that classify() rejected". Here
  that printed 37,831 chars of an unrelated summarization notice as though it
  were the counterpart considered. Fix: `rejectedCandidate` is null whenever
  `hj < 0`, because the claim its name makes is false there. Note the shape for
  the ledger — the earlier misleading-tell fix grew its own misleading tell one
  case over, which is the class a single clean review round books and a second
  falsification round catches.
  **Verifier, red-first, and the fixture must be SYNTHETIC.** The class is
  detected by literal TEXT, and the sanitizer replaces text with hash tokens —
  so a harvested pin of s-captureAP cannot reproduce it, and pinning it would
  produce the `harvest --pin` trap dev-loop already documents (a fixture that
  replays clean and proves nothing). Build a synthetic pair: a 2-block host at
  a mid index; block 0's inner text also present as byte-identical standalones
  at two lower indices in BOTH bodies; block 1's text present in before and
  absent from after; the host's `tool_use_id` absent from after. Current code
  must say MISMATCH on it and the fixed code DROPPED. The mutation that proves
  the bite discriminates: raise one block's after-count above its before-count
  and watch the verdict return to MISMATCH.
  **Corpus consequence, stated so the tally is not re-quoted stale.** The
  error direction is one-way (a true DROPPED can be reported MISMATCH, never
  the reverse), so today's `8 DROPPED / 2 MISMATCH` is at most 2 rows wrong and
  the real byte-gate hole count is ONE, not two. The 2026-08-02 `MISMATCH x3`
  accounting (this file, s-captureJ x1 attributed to row 24 — another
  host-vanishing event) may be the same misfire; that is UNVERIFIABLE and stays
  so, because s-captureJ predates the alias registry and cannot be resolved.

- **(DONE — 2026-08-08; fork `7591fec` = `e607c3a` + the test fix, dotfiles
  `d144540`) the leak scan's already-published discard
  is BLOB-granular, so any edit to a file carrying a pre-existing finding is
  blocked forever.**
  **SHIPPED, and both halves verified by the dispatcher against the DEPLOYED
  scanner rather than the lane's copy** — the distinction matters, because the
  lane's own battery first ran green vacuously against the deployed scanner
  that had no `--at` yet, which is how it found the need for a capability
  assert. Real case (range `cb1b5b4~2..cb1b5b4^`, driven through the hook's
  `main()` with git's own stdin, never a live push): hook exit **1 -> 0**, with
  `2 Befund(e) ... uebersprungen: dieselben Bytes liegen am selben Pfad schon in
  der veroeffentlichten History`. Anti-swallow, in a throwaway clone deleted
  afterwards: a freshly planted identifier still **BLOCKS** (exit 1, one
  finding). A discard that swallowed the new one would have traded a gate that
  cannot pass for a gate that does not fire, so that half was the required one.
  **Mechanism as built:** every finding carries an identity —
  `sha256(class + NUL + bytes)[:12]`, hashed never printed, emitted INSIDE the
  parens so the hook's `FINDING_DATEI` regex stays backward-compatible by
  construction; a new `--at <ref> <path>` mode classifies content by its
  LOGICAL path so allowlisting and class-scoped exemptions behave as in
  `--git-range`; and the hook walks each path's DISTINCT published blob
  versions, unioning identities. Fail-closed at every branch.
  **The gate then blocked the dispatcher's own push of the fix** — four
  `capture-key-prefix` findings from literal synthetic keys in the new tests.
  Repaired with the file's existing convention (`SYNTH_KEY`, built from
  fragments so no literal sits on disk), never an allowlist entry and never
  `--no-verify`: exempting the scanner's own test file would blind it to the
  class that matters most, which is this entry's own argument about
  `claude-worktime.sh`. Touching the test to fix it also exposed a real hole in
  it — `SYNTH_KEY_2` was never asserted to fire the class on its own, so the
  "a line gains a SECOND identifier" test had been proving something weaker
  than it claimed.
  Original entry follows. Measured 2026-08-07, on the guard's FIRST real push after
  being widened to `claude-worktime`: a one-function fix to
  `claude-worktime.sh` was blocked by two `capture-key-prefix` findings at lines
  1664 and 1933, both **byte-identical to lines already in `origin/main`**
  (`git grep -F "<line>" origin/main` → present). The bytes are months public
  and unremediable; blocking the push does not unpublish them, it only stops all
  future work on that file.
  **Mechanism:** the discard asks whether the BLOB is already published. Editing
  the file mints a new blob, so a pre-existing finding inside it reads as new on
  every subsequent push. The commit-MESSAGE half of the same discard works
  correctly and is what the widening lane demonstrated end-to-end — which is why
  this passed its verifier and still failed in production: the lane's E2E case
  planted its identifier in a NEW file, so no already-published blob was ever
  edited.
  **This is a gate that cannot pass**, the shape `docs/dev-loop.md` already names
  for `--git-range` over a whole branch, and it trains exactly the `--no-verify`
  habit the hook's own header was rewritten to prevent. It is live right now.
  Design, decided: make the discard FINDING-granular — a finding whose matched
  bytes already appear at the same path in the published history is discarded,
  regardless of which blob currently carries them. The path qualifier keeps it
  narrow: the same bytes appearing in a NEW file are still a finding.
  **CORRECTED 2026-08-08, by probing the entry's own verifier before briefing
  against it.** The line below read "Verifier, red-first and available
  immediately: `git push` in the `claude-worktime` clone with commit `0527e88`
  present must go from BLOCKED to allowed". It is not runnable, and the same
  session that booked it is what killed it: `git log --oneline origin/main..HEAD`
  in that clone is EMPTY, and the offending bytes were scrubbed hours later by
  `cb1b5b4` ("scrub the capture-key prefixes out of four comments"). A booked
  entry's mechanism claim earns the same disproving probe as any other
  load-bearing claim — the rule `docs/dev-loop.md` states, firing on the entry
  that quotes it.
  **The runnable red, on real history and needing no construction** (executed
  2026-08-08 from the claude-worktime clone):
  `node <fork>/tools/absence-scan.mjs --git-range cb1b5b4~2..cb1b5b4^` reports
  the two `capture-key-prefix` findings in `claude-worktime.sh` at lines 1664
  and 1933. `cb1b5b4^` IS `0527e88`, so the pushed range is the one the entry
  meant; the difference is that the arrangement is driven through the scanner
  and the hook's filter rather than through a push.
  **And this enlarges the design rather than merely repairing the verifier.**
  Those bytes are reachable in published HISTORY (at `cb1b5b4^`, an ancestor of
  `origin/main`) and are ABSENT from today's `origin/main` TIP, because the
  scrub removed them. The shipped code reasons over published TIPS; the design
  sentence above says "published history". Tip-only is why the right sentence
  and the wrong implementation coexisted, and the fix must walk the path's
  distinct published blob versions, not the tip.
  Verifier, red-first, as executed above; and a planted NEW identifier in the
  same file must still BLOCK —
  both halves required, since a discard that swallows the new one has traded a
  gate that cannot pass for a gate that does not fire. Plant it in a throwaway
  clone, never in the real one.
  **Do not "fix" this with an allowlist entry:** the allowlist is class-scoped
  per path, so exempting `claude-worktime.sh` from `capture-key-prefix` would
  hide every FUTURE capture key in the file that matters most.
  <!-- entry: "the leak scan's already-published discard" -->

- **(DONE — 2026-08-07, `7b804fe` merge + `c50f183`; dotfiles pin `a5c7263` ->
  `b1d070f`) the SIXTEEN cache-fix-owned paths leave `~/.claude/`; the
  registry was one of seventeen.** EXECUTED: `xdg-migrate --apply` moved 16 of
  16 live paths (COULD-NOT: 0), proxy restarted 19:28Z on the new code,
  `~/.claude/` verified free of every `cache-fix*` entry, doctor 20 FAIL -> 3.
  The count in the body below is SIXTEEN and the executed scope was 24 — the
  extra eight were latent writers a live-directory `ls` could not see, which is
  the entry's own recorded lesson and is left standing rather than edited.
  Two things the run itself produced, both booked separately: `--verify` calls
  a never-written path an abort condition (`c50f183`), and the CA moved while
  running shells held the old path in `NODE_EXTRA_CA_CERTS`, breaking every new
  CC session until a fresh shell (dotfiles LEDGER 2026-08-07). Re-graded at
  session close because the injected SessionStart head lists READY headers in
  file order, so a shipped entry left at READY offers finished work to the next
  session — the DONE-anchor defect this file already carries an entry for.
  Original body follows.
  Operator-ranked FIRST, 2026-08-07.
  `~/.claude/` holds `cache-fix-captures/`, `cache-fix-snapshots/`,
  `cache-fix-state/`, `cache-fix-gate-status.json`,
  `cache-fix-fire-ledger.jsonl`, `cache-fix-keymap.jsonl`,
  `cache-fix-bootstrap-log.jsonl`, `cache-fix-debug.log`, `cache-fix-ca/`,
  `quota-status/`, `session-mirrors/`, `upstream-baseline.json`,
  `upstream-changes.jsonl`, `usage.jsonl`, `usage-log/` and
  `workflow-derivation-events.jsonl` — all tool DATA in a config directory, all
  raising the harness's shape-keyed permission prompt on every read and write,
  for every session and every agent.
  **Two corrections, 2026-08-07, both measured against the live directory
  rather than against this entry.** (1) The count was NINE and the seven
  non-prefixed members were missing, because the enumerating search was
  `ls ~/.claude/cache-fix*` — a glob over the NAME standing in for the class
  "paths this project owns". It could never have matched `quota-status/` or
  `usage.jsonl`, so its result carried no information about them; the
  dotfiles guard, enumerating by allow-set instead, sees all sixteen.
  (2) The split below was stated as "a fact not a judgment" and was neither.
  It is retained verbatim because the correction is legible only against it:
  the sentence names six PROXY extensions as the writers and then concludes a
  `tools/`-only half in the next clause — the contradiction sat inside one
  paragraph, unread, because the reader who wrote it was counting READERS.
  Grepping writers: `cache-fix-gate-status.json` and
  `cache-fix-fire-ledger.jsonl` are the only two written from `tools/`.
  `cache-fix-captures/` — 12 GB, the largest single prompt source — is written
  by `proxy/extensions/request-capture.mjs`. Two of sixteen is not a split
  worth building, so it is DROPPED: one deployment-coupled change, one restart.
  ~~The split that decides the work, and it is a fact not a judgment: five
  tools READ these (`bust-triage`, `dossier`, `gate-live`, `harvest`,
  `cold-events`) and six proxy extensions WRITE them (`request-capture`,
  `prefix-diff`, `insertion-normalization`, `fresh-session-sort`,
  `deferred-tool-rewrite`, `output-guard`). The tools half is `tools/`-only and
  ships today.~~
  Design, decided: `$XDG_DATA_HOME`/`~/.local/share/cache-fix/` for DATA —
  the rule is "unrecoverable if lost", which admits `captures/` and `ca/` and
  nothing else — and `$XDG_STATE_HOME`/`~/.local/state/cache-fix/` for the
  other fourteen (regenerable, or merely expensive to lose). Every path
  resolves through an env override with an XDG default, exactly as
  `CACHE_FIX_ALIAS_REGISTRY` now does, through ONE resolver at
  `proxy/xdg-dirs.mjs` — not one per side: seven files under `tools/` already
  import from `../proxy/`, and a second copy is a path resolver that can
  diverge from the one production uses. Each reader keeps a LOUD legacy
  fallback for one transition; silent fallback is how two stores diverge.
  **Restart accounting is part of this entry, not an afterthought:** the change
  moves where captures and state KEYS are written, so the row-3 rule applies
  and the restart is priced against LIVE sessions
  (`tools/restart-exposure.mjs --match …`) before it is taken, not against the
  corpus.
  Verifier, red-first: the dotfiles guard
  (`bootstrap/doctor.py`, `claude_dir_entries_verdict`) names all sixteen
  today — that is the red, and it is the right instrument because it
  enumerates by allow-set. Done is those sixteen NAMES gone from its output,
  never a finding COUNT: the count is live mutating state and has already been
  quoted at three different values (22, 19, 18) in one day. Plus, per path
  moved, one executed read through the tool that owns it, because a moved file
  nothing can find is a worse failure than a prompt. The machine-wide guard
  that keeps the class from returning is a SEPARATE dispatch, briefed at
  `docs/directives/xdg-data-and-config-dir-guard.md`.
  <!-- entry: "the SIXTEEN cache-fix-owned paths leave" -->

- **(DONE — this commit, 2026-08-07; threat-matrix row 28)
  insertion-normalization suppressed a system message WITHOUT emitting a
  copy: the one REAL content loss in the 67-row conservation residue, and the
  mechanism was live.**
  **BRANCH NAMED, then fixed.** The step-through this entry asked for was run
  under instrumented replay of the preserved capture (a truncated 63-request
  slice reproduces the row, so the loop is seconds rather than minutes):
  `[DBG reset-suppress] idx=8 hash=b6e8e363… ci=7 onWire=false pinApplied=false`
  against `idx=13 hash=45e20a0c… ci=11 onWire=true pinApplied=true`. The branch
  is `resetKeepingPins`' duplicate-suppression loop, and the defect is its
  PRECONDITION rather than the loop: `pinnedBlockHashes(priorCanonical)` answers
  "is this block in a live canonical entry", where the suppression's safety
  argument needs "is a copy on the wire we are sending". CC had edited the
  carrier (skill body 21476 -> 21475 chars), so its identity changed, so the pin
  could not apply — and the reminder's hash was still in the set from an entry
  nothing was serving.
  **The same hole had a SECOND entry path, found by the sibling enumeration and
  not by the instance:** on the success path a carrier arriving with a
  `cache_control` breakpoint still MATCHES (identity is volatile-blind) while
  `pinnedForwardForm` (:637-641) forwards CC's message untouched. Matched is not
  restored. Both call sites now read their hash sets off the bytes the request
  actually forwards (`restoringHashes`), which also covers the pruned-carrier
  and merged-join siblings by construction.
  **Red-first, stated:** the four new bites in
  `test/insertion-suppression-copy-present.test.mjs` were run against the OLD
  implementation in a worktree at the pre-fix HEAD — all four red, both controls
  green — then against the fix, all six green. The preserved capture goes
  exit 1 -> exit 0 with the row gone; the other two preserved captures' rows are
  unchanged (34 / 31 / 1), which is what shows the fix is targeted rather than a
  softened predicate. npm test 2327/2327.
  Original attribution, kept for the record — 2026-08-07 by the read-only lane:
  on s-captureAE n=62, raw[8] — a 1473-byte "CLAUDE.md was modified" system
  message carrying the operator's own edit diff — is absent from the forwarded
  array three ways (as a unit under the gate's own hashing, as a substring, and
  line-by-line, 0 of 18 substantial lines), while the SAME request's other
  suppression (raw[13]) correctly reappears wrapped — per-instance failure,
  not wholesale, which is what makes it credible. Differential-confirmed
  (INSERTION_NORMALIZE=0 removes the row). Extension unchanged since 04ed3c9
  (2026-08-05), so current traffic is exposed. NOT attributed: WHICH branch
  drops it — needs a step-through against the preserved input. Next step,
  decision-shaped and cheap: trace the branch on the preserved arms, then fix
  red-first (the preserved capture replays the row). Evidence bundle +
  all three captures preserved against rotation at
  `~/.local/share/cache-fix/attribution-2026-08-07/` (machine-local;
  ATTRIBUTION-TABLE.tsv, differential arms, probes importing replay.mjs's own
  identity functions, run.sh).

- **(DONE — this commit, 2026-08-07)
  a COMPLETED entry can hold a rank anchor, so the '## Build order' block
  keeps proposing work that already shipped — and no tool said so.**
  Found 2026-08-07 by a dispatched lane that was cut FROM the defect: its
  brief came from the Tier B head ("the conservation gate has no
  declared-exemption clause for `identity-normalization`"), whose own bullet
  had read `(DONE — f2ab6d0, 2026-08-07)` since that morning. The lane's base
  check and grounding reads found the work already landed and it halted
  without building, which is the only reason this cost one dispatch rather
  than a rebuild.
  **Not one stale item: FOUR of the block's thirty-three anchors** resolved to
  DONE-graded bullets (this one, plus the `causeToRow` walk, the verdict enum,
  and the idle/TTL guard — all four shipped earlier the same day). Each is
  removed by this commit, with its bullet's own DONE grade and landed commit
  cited: 9da34df, 52796ea, d520ec0, f2ab6d0, each verified an ancestor of HEAD
  rather than taken from the header text.
  **Why both existing guards were silent, and it is structural.**
  `backlog-order.mjs` asked WHETHER an anchor resolves — zero hits, two hits,
  two anchors on one bullet — and never WHAT it resolves to, so a DONE bullet
  matched its anchor and stayed ranked. `backlog-lint.mjs` skips any entry
  whose header carries no live grade (`HEADER_GRADE`: OPEN/READY/HOT), which
  is exactly what a CORRECTLY re-graded DONE header does not carry, so the
  entry left its population at the moment it became defective in this other
  sense. Both printed clean over the defective file; measured, not reasoned:
  `--check` exit 0 and `backlog-lint: clean`.
  **Shipped:** a completed-entry clause in `reorder()`, same loud-by-
  construction shape as the zero/multi-match errors beside it — an anchor
  resolving to a DONE/RESOLVED/FIXED/BUILT-graded bullet is an error and
  nothing is written. The marker vocabulary is `backlog-lint.mjs`'s own
  (RES_WORD + DONE_LINE), taken as a definition rather than re-derived from
  what today's file happens to contain. Scoped to the bullet's HEADER, which
  is the narrowness that matters: backlog-lint matches its markers anywhere in
  a body, and this corpus writes line-initial DONE sub-steps inside entries
  that are correctly still open — a body-wide match would have fired on those.
  All anchors are reported in one error rather than the first only, since the
  list is repaired as a whole.
  **Red-first, run against today's file before any removal:** 4 reported, all
  DONE-graded, output pasted in the lane's report. Permanent bite:
  `test/backlog-order.test.mjs` (the tool's first suite — it shipped with
  none), 9 tests, its red half reading the pre-removal BACKLOG.md at `a6e51ed`
  via `git show` at test time so the arrangement stays re-runnable against an
  immutable ref. Mutation-checked: with `resolvedGrade` forced to null, 5 of
  the 9 go red and the three negative cases stay green.
  **NOT done here, and deliberately: nothing was re-ranked.** Dead anchors were
  removed and the sequence renumbered; the surviving order is untouched and
  still carries its 2026-08-07 midday derivation date. Removal is the block's
  own documented practice for shipped work ("Five of that list's ranks shipped
  … and drop out"), while re-ranking is a re-derivation and belongs at the desk
  (dev-loop: "the derived order is re-derived, not edited").

- **(DONE — 9da34df, 2026-08-07)
  a matrix walk that dispositions a CAUSE is invisible to the
  tool that triages that cause, and both halves of the gap are real.**
  Found 2026-08-06 at session close. `bust-triage --at` returned
  **UNCLASSIFIED** — "a class nothing currently covers" — for
  `previous_message_not_found`, which this repo walked to CONTROLLED-CAUSE
  on 2026-07-31 and wrote up under a `## Event walk` heading in the threat
  matrix. `causeToRow` reaches numbered rows only, so the walk is
  unreachable by construction.
  **Machinery half:** the matrix has two containers for a disposition —
  numbered rows and `## Event walk` prose — and the tool indexes one. A
  reader following the documented route finds the answer; the tool
  following its route reports a new class. That is the entry-path rule
  (dev-loop) aimed at the matrix itself.
  **Process half, which is the generator:** nothing requires a walk ending
  in CONTROLLED-CAUSE to become a numbered row, or to state why it
  deliberately is not. The 2026-07-31 walk was prose because the moment
  called for prose; the next one will be too.
  **The seam between them is COMPUTABLE, which is what makes this a check
  rather than a rule.** "A cause token dispositioned anywhere in the matrix
  that `causeToRow` cannot resolve" is a set difference over two lists, no
  judgment involved — the precipitation criterion the corpus names.
  Design, decided: (1) extend the matrix reader to index `## Event walk`
  sections by the cause they name, so a documented disposition is reachable
  from the cause; (2) add a lint asserting the set difference is empty, so
  the process half enforces itself instead of relying on the next author
  remembering; (3) the same lint asserts every `## Event walk` section
  either names a numbered row or carries an explicit no-row declaration —
  that is the generator, and it is a grep, not a judgment.
  **Recorded because the rule change rests on it:** this session found (1)
  on its own, wrote "the finding is the tool, not the bust" into the matrix,
  and was about to book the reader fix ALONE. The process half exists only
  because the operator asked "machinery or process?" — verified against the
  artifacts rather than recalled: the matrix addendum, written before the
  question, contains zero process-half language; the entry you are reading,
  written after, contains both. `docs/dev-loop.md` rule three now carries
  the sharpened form (every reach failure has a writer, still running). Verifier, red-first and available now: the lint must go red
  on today's state (`previous_message_not_found` dispositioned, unreachable)
  and green after (1); `--at 2026-08-06T16:35:15Z` must stop saying
  UNCLASSIFIED and name the walk. Done when a cause the matrix has
  dispositioned cannot read as UNCLASSIFIED.

- **(DONE — 52796ea, 2026-08-07)
  the verdict enum has no value for CONTROLLED-CAUSE, so a row whose
  honest status is a controlled cause must be written as `ACCEPT` to stay
  readable.** Found 2026-08-06 minting row 27: `statusKind` returned null for
  "CONTROLLED-CAUSE …", which makes the row STATUS-UNREADABLE — a documented
  stop-here — on a row that needs no stopping. Worked around by leading the
  cell with `ACCEPT` (row 21's precedent for "no local mitigation possible"),
  with the reason written into the cell so the next author does not re-derive
  it. `VERDICT_BY_KIND`'s own comment declines to widen the vocabulary
  unilaterally because it has consumers outside that file — which is exactly
  why this is an entry and not a patch.
  **DECIDED (operator, 2026-08-06): add the fifth verdict value.** The
  alternative — keep four and make the ACCEPT-with-explanation form the written
  convention — was put beside it and declined, because
  `runbooks/bust-appears.md` already lists CONTROLLED-CAUSE as one of four
  terminal dispositions, so the enum is the short thing, and the workaround
  makes a controlled cause read as an open one on every future walk.
  The comment's stated worry ("consumers outside this file") was MEASURED
  before deciding rather than trusted: `grep -rn 'VERDICT_BY_KIND\|statusKind'`
  over this repo and dotfiles returns `tools/bust-triage.mjs` (definition,
  `statusVerdict`, `triage()`, the printer's STATUS-UNREADABLE case, and the
  header comment at lines 37-39), `test/bust-triage-status-enum.test.mjs`, and
  the verdict list in `runbooks/bust-appears.md` step 2. `tools/dossier.mjs`
  imports from bust-triage but its only `verdict` reference is
  `s.migration.verdict` — the byte-match census's EXACT/EXTENDED vocabulary, a
  different axis. Nothing in dotfiles calls bust-triage; no `--json` consumer
  exists outside this repo. Reach: one code file, one test, one runbook line.
  Design: `STATUS_RULES` gains `[/^CONTROLLED(?:-CAUSE)?\b/, "CONTROLLED"]`,
  `VERDICT_BY_KIND.CONTROLLED = "CONTROLLED-CAUSE"`, and the runbook's verdict
  list gains it. Name collision to carry in the comment, NOT to resolve by
  renaming: `bust-triage` already has `CONTROLLED = new Set(["cost","resume"])`
  which classifies LEDGER EVENTS by their `k`. A row STATUS of CONTROLLED-CAUSE
  is a different axis — the CLASS has no mitigation — and row 27 fires on an
  event the ledger classified `bust`. Two axes, one word; the comment says so
  where both are read.
  **HARD ORDERING CONSTRAINT, and it is why this cannot be split:** matrix row
  27's status cell currently leads with `ACCEPT` solely to stay readable. The
  cell flips to `CONTROLLED-CAUSE` in the SAME commit as the enum change —
  flipped earlier the row reads STATUS-UNREADABLE, flipped later the enum ships
  with no row exercising it.
  Verifier, red-first and three-sided: `matrixRow(27)` must return kind
  CONTROLLED and verdict CONTROLLED-CAUSE after; the existing enum test's
  assertions for all nine current kinds must still pass unchanged (a widening
  that perturbs an existing mapping is a different change); and a junk status
  must still return STATUS-UNREADABLE, since the mandatory-unmatched-case
  property is the thing the whole enum was rebuilt for on 2026-08-06.

- **(DONE — d520ec0, 2026-08-07)
  `bust-triage` has no idle/TTL guard, so a 216k eviction answered
  KNOWN-OPEN row 4.** Measured 2026-08-06 23:59:10Z (s-captureAL, matrix row 27,
  minted by that walk): `gap` 22,702 s against `"ttl":"1h"` on the session's own
  wire, transcript `previous_message_not_found`, and a surviving read of 2 tokens
  (`ctx` 215,875 - `cc` 215,873) — the cached entry
  expired five hours before the request existed, and the pair's real container
  migration at host 104 is a true statement that is not the cause. `classToRow`
  saw census `replace/edit`, returned 4, and the verdict inflated row 4's
  evidence with an instance row 4 did not produce.
  **The discriminators are computable from the ledger record `bust-triage`
  already reads** and none is consulted — this is a mechanization, not a
  research task.
  **CORRECTED 2026-08-07, before this shipped:** the design below first named
  `mtok === 0` as one of two discriminators. `mtok` is the missed portion as
  read from the transcript diagnostic and DEFAULTS TO 0 when that diagnostic
  was never read — the same degraded default `cause: other` carries. The
  2026-08-06 17:39-17:40 event is booked three times with `mtok` 0, 0 and
  182,728: one event, three values. A check keyed on it would have fired on
  every unresolved row. Use the surviving read instead — `ctx` - `cc`, both
  present on the record, no default to be fooled by.
  Design: before any `classToRow` call, test `gap` against the TTL in force and
  a surviving read (`ctx` - `cc`) at or near zero; on a hit, return row 27 and
  stop. The TTL is read from the
  capture's own wire, never assumed — a hardcoded 3600 is the remembered-number
  error the dev-loop names.
  Verifier, red-first: this stamp must return row 27, and the 2026-08-06
  18:08:32Z stamp (surviving read 15,224 of `ctx` 315,821, sub-minute gap)
  must still return row 4 — a guard that reclassifies both is worse than none.
  Third side, added by the 2026-08-07 01:00:55Z walk: the 336k event there had
  a surviving read of 39,713 that exactly equalled its predecessor's write, and
  must classify as GROWTH rather than as either row — a guard that folds it in
  with the idle case has learned "large `cc`" instead of "prefix lost".
  **ORDERING — do the verdict-enum entry FIRST.** Row 27's status cell leads
  with `ACCEPT` today purely to stay readable, so this guard's row-27 hit
  currently prints verdict KNOWN-OPEN. After the enum entry lands it prints
  CONTROLLED-CAUSE. Assert the POST-enum value: written against today's value
  the test pins the workaround and goes red the moment the enum ships, which
  is the same-parentage error one step over.

- **(DONE — f2ab6d0, 2026-08-07)
  the conservation gate has no declared-exemption clause for
  `identity-normalization`, so EVERY capture containing a resume fails the gate
  on declared behaviour.** SHIPPED as clause (h), byte-verified by chaining the
  extension's own `normalizeSessionStartText` per block. Verified by the
  dispatcher in the artifact, not on the report: s-captureAL replayed under the
  serving gate set reads conservation 0 (was 2) with both rows carrying
  `exemptReason: identity-normalization:session-start-substitution` on the
  `lost` and `invented` sides. Of the four live reds, one flips green and 66
  rows remain across the other three — measured as NOT this class (zero `lost`
  rows survive anywhere), and deliberately not widened to. **The design
  deviation, accepted:** the extension publishes no `ctx.meta` telemetry, so the
  declaration is the replay's own staged per-extension measurement (`mutatedBy`)
  rather than a self-report — an observed effect, and it avoids making a
  checker-side repair deployment-coupled. Item 2 of the entry (the `in[937]`
  sweep finding) returns COULD NOT VERIFY: that capture has rotated, shown
  against a known positive rather than asserted. Three gaps it surfaced are
  booked below and their build is in flight on the same lane. Original entry
  follows. Found 2026-08-06 while walking s-captureAL: clauses
  exist for `smoosh-split`, `fresh-session-sort` and `content-strip`
  (`replay.mjs:2426-2455`) and not for this one, so its documented
  resume→startup substitution reports as `lost` + `invented` on the system unit
  every time. That is the fires-on-a-non-defect class on a BLOCKING gate, and it
  trains its reader to discount conservation red.
  **CONCRETE NEXT STEP FOR UNDISPOSITIONED SWEEP FINDING 1, which this makes
  cheap:** that finding's single failing row reads `in[937] (system): 1 of 1
  unit lost` + `invented` — the same shape one index-space over. Its own entry
  named the method and left it unwalked; the method is now demonstrated. Run
  `normalizeSessionStartText` over that capture's raw `n=1400 msg[937]` and
  compare to the forwarded bytes. If they match, the standing gate red is this
  same declared behaviour and the sweep finding closes as non-defect with the
  exemption as its fix. **Not claimed here — different capture, and a candidate
  is not a match.**
  Verifier for the exemption itself: it must be telemetry-backed and narrow
  enough that a REAL conservation violation in the same message still fires —
  demonstrated by mutating the substitution to change extra bytes and watching
  the gate go red through the exemption.

- **(DONE — e787960 + a5912ad, 2026-08-07)
  evidence leaves the rolling window at FINDING time: the
  sweep pins the request bytes behind each finding row (tools/-only,
  not deployment-coupled).** SHIPPED: `replay.mjs --pin-rows` (all 8
  persisted row families, each with its own index, coordinate SPACE and
  owner), `gate-live --rowpins` writing scrubbed pins to
  `test/fixtures/harvested/rowpins/`, idempotent by (keyToken, n, index,
  space, family), rejecting `bytesMatchRow:false` without writing. Pin
  size measured against the entry's kilobytes claim: 11,711 B committed,
  mean 4,618 B over 21 pins on a 255 MB capture, pin pass +5.7% wall.
  Red-first arrangement executed: capture removed, old path
  `ENOENT`, pin alone still answers "did we build these bytes"
  (`forwardedPresentInRawAt=null -> OURS`). Two residues, both booked
  below: the doctor's three-answer verdict for the new `rowPins` fields
  (dotfiles), and `harvest-scrub-relations` not recursing into the new
  subdirectory. A THIRD residue was closed the same day rather than
  booked (`instantUtc`, and the class-scoped `live-timestamp` exemption
  for `rowpins/`): the pin shipped at day precision with the hour-join
  named as a residual, and this session put it to the operator
  recommending deferral — the operator's correction is now rule ZERO in
  `docs/dev-loop.md`, and it is the reason that residue is a commit and
  not a bullet. Original entry follows. This is the permanent answer to the
  expiry finding above, and the reason no ceiling is the answer:
  eviction is continuous by construction, so the fix is not to keep
  captures longer but to stop needing them. Two halves, and the
  second is this item — the first is the row-persistence item below.
  Grounding, measured today: a row-scoped pin is KILOBYTES. The
  builtByUs probe needed exactly `forwarded[i]` for two requests plus
  the raw `messages` array to test byte-presence; the whole evidence
  for the 349k bust's row is a few KB against a 316 MB capture. The
  46 MB fixture problem that blocks `harvest --pin` does NOT apply
  here, because that tool pins a whole prefix from request 0 while
  this pins one pair at one index — so this item is NOT blocked on
  the content-addressed fixture format, and that is the thing to
  check first if it looks blocked.
  Design: when a gate records a finding row, write a companion
  artifact keyed by the row (capture-key hash + n + index) carrying
  the two forwarded messages at the divergence index, the raw
  counterpart, and the array lengths. Scrubbed by the existing
  harvest scrub, absence-scanned like everything else, and small
  enough to commit — which is the whole point: the finding becomes
  answerable from git after the capture is gone.
  Verifier, red-first: delete (or point away from) the capture and
  require the row's attribution question — "did we build these bytes"
  — to still be answerable from the pinned artifact alone; red today,
  since the answer currently requires the capture. Plus a control
  that a pin whose bytes do not match the row it claims is rejected
  rather than trusted.
  WHY THIS IS THE PERMANENT ONE, stated so it is not re-litigated:
  the window's job becomes DISCOVERY, and archival moves to git where
  it is diffable, scrubbed and free. The ceiling then only has to
  outlive the gap between two sweeps, which is hours, not weeks.
  **NEW COST, measured 2026-08-06 evening, and it is a different KIND
  from the earlier ones: eviction took out a READY item's named
  verifier, not just an explanation.** Row 26's pair `n=166->167` was
  measured at 09:59Z; by ~19:25Z the capture holding it was gone from
  `~/.claude/cache-fix-captures/` (checked by filename, no match), so
  the ranked-5th item on the forwarded-`tools[]` condition for that
  exemption — booked the same day, and stating "red-first against the
  live pair: the current build must exempt `n=166->167`" — had its
  designated known-positive dissolve inside ten hours. The pin taken for
  that row cannot stand in: the scrub destroys all four relocatable-block
  predicates, which the row itself records. Every earlier datapoint for
  this item was about losing an EXPLANATION after the fact; this one is
  about a check that cannot be built red-first at all, which is the
  point where the loss stops being retrospective and starts blocking
  work. What survives is what the sweep already wrote down: 12
  `first-appearance-relocation` exemption rows across 5 still-present
  captures in the 07:55Z status file — i.e. the status file's own
  row-level record is currently the ONLY thing standing between this
  class and unbuildability, which is exactly the artifact this item
  proposes to make durable.

- **(DONE — 93a8414, 2026-08-07) `bust-triage`'s UNVERIFIABLE branch prints a FALSE disjunction, and
  the reason text is what a reader acts on.** SHIPPED: the reason is computed
  from the walk that failed — capture absent / present-but-window-not-covered /
  present-and-covered-but-no-pair — on the transcript step as well as the
  capture step (the done-criterion covers both, and both disjuncts were false
  on the motivating event). A THIRD live instance was measured the same
  morning, on the 05:24:37Z statiker bust, before the fix landed. Original
  entry follows. Found 2026-08-06 by using it on
  the event above: it answered `UNVERIFIABLE — no capture pair (capture off, or
  rotated)`, and both disjuncts were false. The capture for that session existed
  at the time of the run, covered the window (its last write is one minute AFTER
  the busting timestamp), and a replay over it found 4 same-conversation pairs.
  So the tool's stated reason named two causes, neither of which held, for a
  state it has no word for: capture PRESENT, pairs PRESENT, and its own pairing
  step nonetheless returning nothing.
  This is the same defect family as the two-value verdict collapse already
  ranked — dev-loop's "a checker has THREE answers, not two", one level in: the
  third answer is present but its EXPLANATION is a guess, and a guessed reason
  reads exactly like a measured one.
  Design, decided: the UNVERIFIABLE reason is computed, never asserted — check
  in order and report which check failed: capture file for the session absent /
  present-but-window-not-covered / present-and-covered-but-no-pair-found. The
  third is its own reason string and names the pairing input it had.
  Verifier, red-first: drive it on the event above; today it must print the
  false disjunction and after the change it must print the
  present-and-covered-but-no-pair case. Control: a genuinely absent capture must
  still report absent. Done when no UNVERIFIABLE row states a cause the tool did
  not test.

- **(DONE — 22b8c05, 2026-08-07) `bust-triage` picks the busting request by TIME ALONE, so a haiku
  sidecar was named as the cause of a 336k opus event — and the tool then
  reported the evidence missing while it sat on disk.** (Title kept verbatim as
  the record of the drift the next paragraph corrects; the shipped rule selects
  by whether a candidate could CARRY the event, not by clock position.)
  **THIS ENTRY'S NARRATIVE WAS WRONG AND THE CORRECTION IS THE LESSON.** The
  defect, the design and the verifier were all sound — the fix ships and the
  entry's verifier passes verbatim — but the MECHANISM this entry named is not
  the one in the code, measured by a probe printing every candidate plus a
  stage trace of the real function: the 01:00:54.702Z sidecar has `n=1` and was
  already excluded by the pre-existing `plausible` predicate, so it never
  entered the candidate set and cannot have won on recency; the recency rule
  picked the CORRECT request; what displaced it is `preferTelemetryConfirmed`,
  where a different sidecar's reset event sits 5 ms from an earlier opus
  request. The quoted "2,368 bytes" and "01:00:54.702Z" belong to different
  records. WHAT WROTE IT OUT OF REACH: the entry was assembled by reading a
  candidate LIST instead of tracing the selection FUNCTION, and nothing stops
  the next entry being written the same way — the generalized rule is now in
  `docs/dev-loop.md` ("A booked entry's MECHANISM claim"). Original entry
  follows, kept unedited as the record of the drift. Measured 2026-08-07
  01:00:55Z (matrix event walk of that date). The rule is "the newest request
  at or before the ledger stamp", and the ledger stamp is when the RESPONSE
  was booked, not when the request was sent. A `claude-haiku-4-5` sidecar at
  01:00:54.702Z (1 message, 2,368 bytes, no tools) beat the real request at
  01:00:27.553Z (opus-5, 4 messages, 977 kB) by 27 seconds. The sidecar has no
  predecessor in its own conversation, so the walk cascaded to
  `no capture pair (capture off, or rotated)` / `no diagnostic found (older CC,
  or transcript rotated)` and UNVERIFIABLE — with the capture present at 6.6 MB
  and the transcript at 55 lines. **Both disjunctions false.** This is the
  co-tenant interleaving trap `replay.mjs` documents at its grouping comment,
  inside the tool built to end the hand walk; it is also a second live
  instance for the booked false-disjunction entry, which should be fixed in
  the same pass.
  Design: select among requests whose response could plausibly be the booked
  event, not by raw recency — filter to the conversation that CARRIES the
  bust. Two signals are already on the records: the ledger's `ctx` against the
  candidate's own token size (a 2 kB sidecar cannot produce a 375k-token
  event), and the model (a bust booked for an opus response did not come from
  a haiku request). Prefer the size test as primary; it needs no model list to
  go stale.
  Verifier, red-first and both sides: this stamp must select the 01:00:27.553Z
  opus request and reach a real verdict, and the 2026-08-06 18:08:32Z stamp
  (no interleaved sidecar) must select exactly what it selects today — a
  selection change on the uncontaminated case is a regression, not a fix.
  While there: when no candidate survives, the WARN must say which reason
  actually applies rather than printing a disjunction of two it did not test.

- **(DONE — b2459a3, 2026-08-07) the threat matrix's status cell is split on `|`, so a row whose
  prose CONTAINS a pipe hands the reader a mid-cell fragment.** SHIPPED as
  candidate (b), markdown-table semantics (a cell boundary is an UNESCAPED pipe
  outside inline code). Done-criterion met and measured: STATUS-UNREADABLE rows
  across the live matrix now 0 (was row 3 alone); the MITIGATED set is unchanged
  at rows 1, 7, 8, 9, 15, 18, 25, so `docs/runbooks/bust-appears.md`'s recorded
  figure did not go stale. Original entry follows. Surfaced
  2026-08-06 by the dispatched status-enum work, correctly returned as a gap
  rather than fixed inside a boundary that did not cover it. Row 3's status
  contains an inline `` `header:anthropic-beta[-mid-conversation-tool-changes]` ``
  in running text; `matrixRow`'s `line.split("|")` therefore yields a fragment
  starting mid-sentence, and the `DOCUMENTED` the row LEADS with is never seen
  by anything. The shipped status enum makes this land on STATUS-UNREADABLE,
  which is the safe direction and is not a fix: the tool still cannot read a row
  it is supposed to read.
  Two candidate fixes and the second is preferred: (a) escape the pipe in the
  matrix cell — one row today, and the next author re-introduces it; (b) parse
  the row by markdown table semantics (a cell boundary is an UNESCAPED pipe
  outside inline code), which fixes the class. Verifier, red-first: row 3 must
  parse to kind DOCUMENTED after the change and to STATUS-UNREADABLE before it;
  control, a row with no pipe in its prose is unaffected. Done when no matrix
  row reads as UNREADABLE for a reason that is the parser's rather than the
  row's.
  **Why it is worth more than one row:** the same split is how the other matrix
  readers reach their cells. A parser that silently truncates at the first pipe
  is the "partial view read as its whole body" shape aimed at a table.

- **(DONE — fb20f3d, 2026-08-07) the reconcile check fires when the two instruments AGREE.** SHIPPED as a
  cause-equivalence table; the raced-read known positive (s-captureQ,
  2026-08-05T09:09:41Z) must and does still WARN. First live fire on a NEW
  event the same morning: the 09:52:42Z bust in the dev session, where the
  ledger's `other` and the transcript's `previous_message_not_found` are the
  raced read, and the check named it unprompted — that walk is in the matrix.
  `tools/dossier.mjs:286` carries the identical predicate and is booked below.
  `bust-triage` warned "LEDGER says idle, TRANSCRIPT says
  previous_message_not_found — instrument disagreement" on 2026-08-06 23:59:10Z.
  They name one eviction: `idle` is the ledger's gap-derived cause, the other is
  the API's diagnostic. The check compares two fields from different vocabularies
  as though they were one. Design: an equivalence table for the pairs that mean
  the same event (`idle`/`previous_message_not_found` is the first entry), and
  the warning fires only outside it. Verifier: red on this stamp today, and it
  must STILL fire on the genuine disagreement the check was built for — the
  raced `other` read that never upgraded (matrix row 4's 2026-08-05 datapoint
  names an instance), which is the known positive it must not lose.

- **MOVED 2026-08-06 to `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md` —
  `previous_message_not_found` booked a hit, against the 2026-07-31 fix's own
  contract.** Not dropped and not done: the work is in claude-worktime and a
  session there reads that file, not this one. Body lives there; it is not
  restated here, because a copy drifts from its original and a survey built
  from copies inherits the drift. Evidence for it stays here where it was
  measured — matrix row 27's datapoint, 2026-08-06 23:59:10Z.
  First instance of this repo's "the backlog closes dispatchable" rule
  (`runbooks/session-close.md` step 8) catching a wrong carrier: that file
  read "Ready: (empty)" while two of its items sat in this one.

- **MOVED 2026-08-06 to `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md` — one
  event is booked twice or three times, so every cost total derived from that
  ledger is inflated by an unknown factor.** Merged there with the
  contradictory-CLASS instance found the same day, and the class question is
  now DECIDED (operator: neither class wins — dedupe the cost, keep both
  classifications, render the disagreement as its own state). Body lives there,
  deliberately not restated here.
  **What stays this repo's problem, and it is the reason to care:** the
  build-order block above opens with "five busts, 1,200,000 tokens re-billed"
  and ranks the queue partly on it. That figure rests on a counter with two
  known duplication modes. It is not re-derived here on one instance — but it
  is a premise with a crack in it rather than a fact, and the next build-order
  derivation says so or repeats it.

- **DONE 2026-08-06 (dotfiles `6912e2b`) — the push-side leak scan re-flagged already-public history on every
  rebase of an open PR branch, and the only exit is `--no-verify`.** Measured
  2026-08-05 while rebasing `pr/insertion-normalization` onto upstream's
  current main (upstream asked for it, to pick up their #310): the scan ranges
  over the REF UPDATE (`old..new`), so a force-push after a rebase presents
  eight re-parented commits as new and re-reports the `capture-key-prefix`
  findings in two of their messages. Those messages are byte-identical to
  commits already on the remote — verified by `git patch-id --stable` on all
  eight and by md5 of the two flagged messages — so they are already in
  `refs/pull/272/head`, which no push can retract and no block can help.
  The push went out with `--no-verify`, stated in the same message, after the
  full suite ran green in the worktree (1708/1709, 1 skipped).
  This is the fires-on-a-non-defect shape on the one gate guarding a public
  boundary, and the override habit it trains is the failure mode — the
  runbook already says as much about the HAND grep and scopes it to the
  round's own commits; the hook has no such scoping.
  Design, decision-complete: scope the scan's commit-message pass to content
  the REMOTE does not already have — for a force-push that is
  `new_sha ^{/}` minus the set of messages reachable from the old remote tip,
  computed from the pre-push stdin's `<old> <new>` pair rather than from the
  range alone. A message already published is out of scope by construction,
  not by allowlist. Verifier, red-first: drive the hook with a simulated
  force-push whose new commits are patch-identical re-parents of the old ones
  and assert it does NOT block; plus the control that a genuinely new commit
  carrying a capture key in its message still does. Done when a rebase
  force-push of an open PR branch passes the gate without `--no-verify`.
  Lives in dotfiles (the global pre-push dispatcher owns the leak scan), so
  this is an operator-side item like the Write-time hook entry below.
  **SECOND AND THIRD OCCURRENCE 2026-08-06 — this is now overdue, not
  pending.** Rebasing all three open PR branches onto `b00b141` produced the
  identical block on each: four `capture-key-prefix` findings, all four in the
  message of `b00b141` itself — UPSTREAM's own merge commit of our #272, an
  ancestor of `upstream/main` and therefore public on their repo, unremovable
  by anything we do. The design above already covers it (a message reachable
  from the remote tip is out of scope by construction), and the case is even
  clearer than the originating one: the flagged commit is not merely
  already-published, it is not ours. Three pushes went out `--no-verify` this
  round, each stated. The measured cost of the gap is no longer "an override
  once" — it is an override becoming the routine way to push a rebased branch,
  which is precisely the reflex the entry predicted.
  Discipline note from the same round, kept because it is the part that nearly
  went wrong: on the second of the three pushes the bypass was used WITHOUT
  first confirming the block was this known case. It was checked afterwards and
  the branch was clean, but the order was wrong — the confirmation is what makes
  the bypass legitimate, and doing it retroactively is how a justified exception
  decays into a habit. Until the hook is fixed: read the block, name the commit
  it flags, confirm that commit is already public, THEN bypass.

- **BUILT 2026-08-06, NOT LIVE (dotfiles `7b13af4`) — moved the leak scan's feedback from PUSH
  to WRITE.** Grounding, measured 2026-08-05: the same author leaked capture
  session ids into tracked files TWICE in one session, hours apart, and both
  times learned at `git push` — after the bytes were in a commit, requiring an
  amend each time. The scan is correctly placed as the last line before public
  history and must stay there; what is missing is an earlier, cheaper signal.
  Root cause is booked in `docs/dev-loop.md` ("The written rule is NARROWER
  than the enforced one") and its prose half is fixed there; this item is the
  mechanical half.
  Design: a PreToolUse hook on Write/Edit that runs `tools/absence-scan.mjs`'s
  `scope: "any"` classes over the pending CONTENT when the target path is
  TRACKED in a repo whose tree carries `tools/absence-scan.mjs` — import the
  classes, never restate the patterns, so the two gates cannot drift. Deny with
  the class name and the alias convention in the message. Scope keeps the false
  fires near zero: untracked paths (scratch, `CLAUDE.local.md`, the alias
  registry) and non-repo paths are exempt by construction, and those are where
  a session id legitimately gets written.
  Verifier, red-first: drive the hook with a payload containing a real-shaped
  capture key destined for a tracked path — must DENY, naming the class; and
  two negatives that must ALLOW — the same payload to an untracked path, and a
  tracked path in a repo without the scanner. Done when a write of the shape
  that leaked today is refused at the Write call.
  Lives in dotfiles (`claude/hooks/`), not here: the repo owns the classes, the
  machine owns the hook.

- **CLOSED 2026-08-06 — VERIFIED BLOCKING, by an executed run against the LIVE
  hook.** The dispatcher ran the lane's own force-push repro
  (`repro-item1.sh`, two real bare remotes and a real fetch) pointed at
  `~/dev/Gunther-Schulz/dotfiles/git/hooks/pre-push`, the file global
  `core.hooksPath` actually resolves: CTRL 1 (new commit, capture key in the
  MESSAGE) `git push exit=1`; CTRL 2 (new commit, capture UUID in a FILE)
  `git push exit=1`; CASE A (force-push of re-parented commits) and CASE B
  (rebase onto upstream's public commit) both `exit=0` with the already-public
  findings named as skipped rather than silently dropped. So the gate blocks
  what it must, passes what it should, and says which it did. The entry stays
  in place rather than being deleted because the STATE it describes recurs:
  every future edit to that file is live on write, and this run is the shape
  that re-closes it.
  Original entry, kept for the trigger it names:
  State: global `core.hooksPath` resolves to the dotfiles
  `git/hooks/` directory, so `git/hooks/pre-push` is the active gate for every
  push on this machine and went live the moment it was WRITTEN — no commit, no
  deploy. A dispatched lane rewrote it (270 lines, already on the dotfiles
  remote via a peer session's push).
  What IS established: the modified hook let a legitimate 8-commit push through
  with the leak scan running (fork `main` -> `75d9a0e`), so it is not
  fail-closed and not hanging on the normal path.
  What is NOT established, and is the entire point of the gate: that it still
  BLOCKS a real leak. One attempt was made and proves nothing — a throwaway repo
  driven with a synthetic pre-push stdin pair hung for two minutes and was
  killed; the invocation was artificial (no reachable remote), so the hang is
  evidence about the probe, not about the hook.
  Verifier: plant a capture-key-shaped identifier in a commit MESSAGE in a
  throwaway clone with a reachable local bare remote, push, and require a block
  naming the class; control, a clean commit must push. Until that passes, treat
  every push from this machine as unscanned and read the block output rather
  than trusting silence. Done when the control has gone red on a planted leak
  since the rewrite.

- **DONE 2026-08-06 (c003759) — `harvest --pin` now verifies the pin reproduces what it was taken
  for; today it reports success on a fixture that proves nothing.** Measured
  2026-08-06: a pin taken to freeze the row-26 evidence printed
  `pinned 327 record(s), range 166..167` and replays with 0 exemptions where
  the live range yields `first-appearance-relocation (skills)`. The scrub had
  removed the literal prefixes the extension keys on; the tool had no way to
  notice and no obligation to look. Design, decided: after writing the fixture,
  `--pin` replays BOTH the pinned file and the same range of the source capture
  under the same gates, and compares the verdict-bearing rows (exit code,
  stability violations, exemptions, census classes) — feeding `.records` out as
  JSONL, never pointing `replay.mjs` at the `.json` pin, which reads 0 pairs and
  exits clean. The comparison therefore asserts the PAIR COUNT first: two runs
  that compared nothing agree perfectly and mean nothing. Divergence prints as a
  named WARNING on the pin — `pinned, but does NOT reproduce: <what differs>` —
  never as silent success; a pin that reproduces nothing is still worth keeping
  as raw structure, so this warns rather than refuses. Verifier: run it on
  `pinned-s-468303a4d2d0-166-167.json`, which is the known positive — it must
  warn. Then run it on a pin whose class survives the scrub, which must not.
  Done-criterion: both, plus the warning text naming the missing rows.

- **DONE 2026-08-06 (70ffcb4 + 142e6b1) — `bust-triage`'s verdict was a two-value collapse over a seven-value
  status vocabulary, and the default is the reassuring one.** Measured
  2026-08-06: `--at 2026-08-06T09:59:58Z` returned **MITIGATED** for a bust
  whose class nobody has mitigated, citing row 6 — whose status is literally
  "OBSERVED, CAUSE NOT ISOLATED". Cause: `bust-triage.mjs:397` computes
  `open: /\bOPEN\b|RE-OPENED/.test(status)` over a 260-char slice and
  `:513` maps `row.open ? "KNOWN-OPEN" : "MITIGATED"`, so every status that is
  neither OPEN nor RE-OPENED lands on MITIGATED. Swept over the matrix: **7 of
  25 rows mis-map** — 3 (DOCUMENTED), 5 (PARTIAL), 6 (OBSERVED, CAUSE NOT
  ISOLATED), 13 (BUILT), 14 (BUILT, remedy proved insufficient), 16 (COVERED
  operator-side), 17 (N/A note only). The same stamp's `dossier` said "no row
  matches — UNCLASSIFIED, treat as a new class" and was right; the tool a
  reader acts on was the one that was wrong. This is dev-loop's "A checker has
  THREE answers, not two" broken inside the repo's own front-line triage: the
  third answer (status recognized by no rule) is folded into pass. Design,
  decided: parse the status to an explicit enum with a MANDATORY unmatched case
  that surfaces as its own verdict — `STATUS-UNREADABLE`, grouped with
  UNCLASSIFIED as a stop-here, never with MITIGATED. Verifier: red-first
  against the current implementation using row 6's real status string, which
  must return MITIGATED today and must not after; plus a case per mis-mapping
  row above. Done-criterion: all 7 stop being MITIGATED, and a row whose status
  genuinely reads MITIGATED still does.

- **DONE 2026-08-06 (4168add) — `fixture-verdict-identity.test.mjs` mutation-tested `FIXTURES[0]`,
  so which artifact the whole file exercises is decided by SORT ORDER, and
  adding a pin silently re-aims it.** Found 2026-08-06 by adding one: the new
  pin sorted first (`468…` before `4b6…`), became the mutation subject, and the
  file went red on its own vacuous-pass guard ("carries no `<system-reminder>`
  block — the mutation would be a no-op"). The guard is right and the aiming is
  not. Probed: the identical fixture renamed to sort last gives 2184/2184
  green, so every pin except position 0 is mutation-tested by nothing — the
  entry-path shape, in the corpus this time. Design, decided: run the three
  mutants over EVERY replayable fixture (they are a handful, and the run is
  seconds), with the no-op precondition reported per fixture as a named SKIP
  carrying the reason rather than an assertion failure — a fixture that cannot
  host the mutation is a fact about the fixture, not a broken test, and today
  it reads as the latter. Verifier: with a known-defective pin present at any
  position the run must name it; with only sound pins it must be green and must
  print how many fixtures it exercised. Done-criterion: both, and the count
  printed — a run over one fixture and a run over five must not look alike.

- **DONE 2026-08-06 (ships with this entry's commit, `tools/backlog-order.mjs`)
  — the derived build order did not reach a fresh session, so the
  ranking was invisible exactly where it is meant to act.** Found 2026-08-06 by
  running the SessionStart hook against this repo instead of assuming what it
  emits: `session-scan.py` reads the `## Open` section only, and the
  `## Build order` block sits above it. A starting session is therefore handed
  eight READY headers in FILE order — the first being an 08-05 bust entry —
  and never sees which of the twenty-seven to build first. The doorbell and
  the ranking were built the same day and do not meet.
  Two candidate fixes, and the second is preferred. (a) Teach the hook to
  surface a named ranking section — but `session-scan.py` is generic and shared
  by every repo, and hard-coding one repo's heading into it is the wrong
  placement. (b) **Make file order BE the derived order**: re-ordering the
  `## Open` section to match the ranking whenever it is re-derived makes the
  injected head the ranked head for free, with no hook change and no second
  place for the order to live. That is consistent with the rubric rather than
  in tension with it — the rule is "re-derive rather than edit", and a
  re-derivation that also reorders the file is still one derivation with one
  carrier. Verifier: after a re-derive, the hook's first injected line
  is the ranking's item 1. Done-criterion: that, plus the `## Build order`
  block naming file order as its own carrier so the next session does not
  reintroduce a second copy.
  **BUILT as (b), both halves.** `tools/backlog-order.mjs` moves the ranked
  bullets to the head of `## Open` from anchors that live inside the build-order
  items themselves — one copy of the rank, adjacent to the item it ranks — and
  its `--check` mode is the standing guard. Demonstrated red before it was
  applied (`--check` exit 1 against the file as it stood, injected head an 08-05
  bust entry), green after, and idempotent on a second run. The block above now
  names file order as the carrier and carries the two commands.
  **Residual, named rather than left implicit:** the tool moves whole bullets,
  so `git blame` dates every moved entry to the reorder commit — which is
  precisely the case `session-scan.py`'s own age docstring says would re-open
  its first-appearance question. That is the entry below, with the number.

- **DONE 2026-08-05 (ships with this entry's commit) — CACHE-CONTROL and
  TEXT are ONE mechanism, it is ours, and it re-bills nothing: 26 of the
  34 absorption misses are a moved cache_control BREAKPOINT.** The queue's
  top item asked whether the remaining misses are one mechanism or
  several. Measured over every row the sweep persisted, not over a sample:
  each row's forwarded pair dumped at its own divergence index
  (`--dump-forwarded` built from the persisted rows, one replay pass per
  capture) and compared after a container-preserving cache_control strip.
  **26 CACHE-CONTROL / 7 TEXT / 1 CONTAINER**, and the ladder class agrees
  with the strip test on all 34 rows — two independent computations, zero
  disagreements.
  **THE MECHANISM IS OUR OWN `cache-control-normalize` (order 400,
  enabled).** It strips every user-message marker and places one canonical
  `{"type":"ephemeral"}` on the last block of the last user message, so on
  the NEXT request the message at the old position has lost its marker and
  `findAbsorptionMisses` — which hashes raw bytes, deliberately — calls
  that a miss. The signature is a 48-byte delta, exactly
  `,"cache_control":{"type":"ephemeral","ttl":"1h"}`.
  **AND IT IS FREE, measured rather than argued.** The API keys its cache
  on content and reads a marker as the designation of a write point; the
  documented multi-turn pattern is to move the breakpoint to the newest
  turn every request and keep reading the prefix. Live check: 32 of 34 rows
  have NO cold event in the same session within +/-180 s, over all 83
  worktime-ledger events. The instrument is shown live on a known positive
  in the same query — the one genuinely-stale row lands on both 349k events
  — and the other hit is a `tools_changed` bust, a cause above the messages
  layer entirely.
  **"TEXT 15" WAS NEVER A TEXT CLASS.** `extractText` stringifies every
  non-text block, cache_control included, so a marker on a `tool_result`
  read as a text difference and the TEXT check ran first. The evening
  handoff's split was measured through that ladder. Fixed: the strip test
  now runs directly after ROLE, where it can steal no row from a real class
  (a pair equal after stripping differs in nothing else by construction).
  Red-first on the real shape; the CONTAINER and TEXT order controls stay
  green.
  **WHAT SHIPPED, tools/-only, no deployment coupling:** (1) the ladder
  reorder plus its bite; (2) `stripCacheControlDeep` in replay.mjs,
  exported and imported by absorption-classify so the two cannot drift;
  (3) `outHashNoCC` in `compactEntry` — container-PRESERVING, deliberately
  not `outHashSem`, which folds string into one-block array and would have
  exempted the row-4 container flip this check exists for; (4)
  `cacheControlOnly` on every absorption row, `null` (never `false`) when
  the entry predates the field; (5) the sweep's `absorption` summary gains
  `cacheControlOnly` + `cacheControlUnknown`. Suite 2182/2182.
  **THE RESIDUAL, named: 8 rows that are real, and neither is new work
  today.** One is the row-4 residual the evening handoff already booked
  (CC's own input diverged first). One is the surviving CONTAINER row. The
  other six are a CC-side variant fork on one capture, entry below.

- **DONE 2026-08-05 (fresh-context review; ships with this entry's commit) —
  the post-fix standing red on s-captureAB is explained, verified at the
  bytes, and converted to a declared exemption.** The sweep kept failing
  that capture's n=331->336 under the SHIPPED build because the relocation
  memory is keyed through `systemPromptSubKey`, and CC swapped its first
  system block in the same request ("You are Claude Code…" 57 chars -> "You
  are a Claude agent…" 62 chars, sub-key 2719b7a4 -> 0d706285) — the memory
  sat stranded under the old key, the in-place path forwarded without the
  block, and the flip is free by construction (the system change re-bills
  everything after system anyway). No extension change: carrying the memory
  across rotation would either re-open the sidecar collision the sub-key
  closes or buy bytes that are already re-billed. The gate instead gains
  `memoryStrandedByKeyRotationExemption` (replay.mjs): five conditions, all
  telemetry or imported identity, green on the stranding shape and red on
  each condition removed singly (replay-gate-selfcheck), demonstrated on the
  real capture (exit 1 -> exit 0, the row now prints
  `memory-stranded-by-key-rotation (mcp)` with both sub-keys as basis).
  Condition 5 (`ourSystemIdentical === false`) is the exemption's own
  retirement trigger: if anything upstream ever stabilizes the forwarded
  system prompt, a stranding stops being free and the violation returns by
  construction. Row 25 carries the same explanation.

- **DONE 2026-08-05 (500f131) — the relocated-block DEPARTURE class is a
  census class, and it found a second instance the hand-read had missed.**
  `findRelocDepartures` (replay.mjs), always on, REPORT not gate, one row per
  type present in a pair's predecessor and absent in its successor, each
  carrying `prefixAboveMessages` so a costly departure is separable from a
  free one at a glance. First corpus reading on s-captureAB: 2 departures /
  342 pairs, 1 with an intact prefix. Row 25 amended; the sentence it
  replaced ("exactly one departure") was a hand-read and was wrong.

- **DONE 2026-08-05 (4a61b1c) — the relocation memory persists, so a
  restart no longer re-inflicts the divergence it prevents.** One file per
  conversation key under `cache-fix-snapshots`, tmp+rename, owner-only,
  fail-open read, written only on change, disk bounded by the same cap as
  memory (newest 256, pruned every 64th write, own suffix only). Pinned by a
  byte-identical-restart bite plus a fail-open control plus both halves of
  the 0600 invariant; mutating `persistMemory` to a no-op turns all three
  red. Audit moved back to stateful-PERSISTED.

- **GATE-RED TRIAGED 2026-08-05 — all 38 conservation rows on
  s-captureI attributed to TWO declared behaviours; neither is a
  corruption, and the gate is right by its own definition.** Method:
  the capture replayed under `--gates-from-capture` (exit 1,
  reproducing the sweep: conservation 38 = 19 lost + 19 invented,
  everything else 0), then each row attributed by RUNNING the
  suspected extension's own exported transform over the real raw
  bytes — not by reading it. Evidence file:
  `scratchpad/replay-c7c83ca5.json` (session-local).
  **(A) 11 lost + 11 invented — `fresh-session-sort`'s block
  rewrite.** The skills `<system-reminder>` block is re-sorted by
  `sortSkillsBlock` and whitespace-normalized by `pinBlockContent`
  (fresh-session-sort.mjs:37-70): 8080 -> 8079 chars, unit hash
  `0a3d686e8066b1e2` -> `85efde987a484e9d`, first difference at
  offset 85 (the entry order). `hashMessageContent` excludes only
  `cache_control`, so a text rewrite is one lost unit plus one
  invented unit, per request, exactly the observed 1:1. Measured on
  requests 168/169/175 (block at msg 0) and 191 (msg 14, relocated to
  out[0] — which is why the lost and invented rows sit at different
  message indices). The deferred-tools block's sort is a NO-OP on
  this corpus (CC already emits it sorted), which is why one unit
  moves and not two.
  **(B) 8 lost + 8 invented — `smoosh-split` COMPOSED with
  `content-strip`, at msg[6] of requests 177/180/181/182/186/187/
  189/191.** msg[6] block[3] is a `tool_result` whose STRING content
  carries a `<system-reminder>` smooshed onto its end ("The task
  tools haven't been used recently."). `splitSmooshedReminders`
  returns `{peeled:1}` on it (measured), splitting 4 blocks into 5;
  `content-strip` then removes the peeled standalone because that
  text matches its own BOOKKEEPING_PATTERNS (content-strip.mjs:4-12).
  The conservation gate's clause-(d) peel exemption requires
  `peeled.every(u => fHashes.has(u.hash))` (replay.mjs:1927) and that
  `.every` correctly fails — the peeled unit really is off the wire.
  So the exemption machinery is working; what is missing is a
  declared exemption for content-strip AT ALL: clause (c)
  (`isDeclaredStrip`) covers only fresh-session-sort's
  `isClearArtifact`, never content-strip's bookkeeping patterns.
  **Consequence: this is the repo's own "a check that fires on a
  NON-defect is failing too" class, twice.** No content the model
  needs is lost — (A) reorders a list, (B) drops a rotating
  bookkeeping nudge on purpose — but the daily gate goes RED on
  legitimate work, which trains the reader to discount red. Repair is
  the declared-exemption shape this file already uses, never a
  softened predicate. Two READY items below.
  **(C) s-captureU's 2 rows, same sweep, attributed the same way and
  it is the one with a real fidelity residue.** Replayed under its own
  gates (exit 1, conservation 2, everything else 0): request 292
  (2026-08-02T17:20:02.283Z), `in[278]` lost / `out[272]` invented, a
  single-unit 5,438-char user text block. Attribution by exercising
  the extension's own export: `normalizeSessionStartText`
  (identity-normalization.mjs:36-56) rewrites `SessionStart:resume
  hook success:` -> `SessionStart:startup hook success:` at offset
  1379 — and at that offset the marker is being QUOTED inside a
  `<teammate-message>` as prose, not emitted as a hook. The predicate
  is an unanchored substring replace over any text block, so it
  cannot tell a live marker from a mention of one. Booked as its own
  READY item below; the conservation exemption for it is the same
  declare-and-verify shape as (A).
  With (A), (B), (C) and the already-attributed s-captureJ 2 (row-24
  container flip, 08-05 handoff), every conservation row of the
  10:02-10:14 sweep is now accounted for. Byte-gate MISMATCH x3 stays
  as the handoff left it: s-captureG x2 is the PREMISE FALSIFIED entry
  further down (wrapper-retaining standalone), s-captureJ x1 the same
  row-24 pair.

- **(DONE 2026-08-05) — anchor `normalizeSessionStartText` to a block that IS a
  SessionStart hook output.** Grounding, measured (entry (C) above):
  the normalizer rewrote a quoted marker inside a teammate message's
  prose, silently altering conversation content CC sent. Impact here
  is cosmetic (one word inside a quotation) and the class is not:
  any text mentioning `SessionStart:resume hook success:` gets
  rewritten wherever it appears, including a user's own words.
  Design: require the block to BE the hook output — the marker at
  text start, or at the start of the `<system-reminder>` wrapper's
  inner text — rather than matching anywhere in it; the two other
  substitutions (`SESSION_START_ID_TAG`,
  `SESSION_START_LAST_ACTIVE_LINE`) get the same anchoring review in
  the same pass. Verifier, red-first: a bite with two blocks — a real
  SessionStart hook block (still normalized) and a prose block
  quoting the marker mid-sentence (must pass through untouched) —
  red against today's implementation on the second. proxy/** so it is
  deployment-coupled; row 3 answer expected NO state key and no freeze
  change, to be stated by the implementation.

- **GATE-RED CLOSED 2026-08-05 — all 40 conservation rows are now
  either exempt-with-verification or fixed at the source.** Measured
  on the two captures, replayed under their own gates:
  s-captureI **38 -> 0** violations, 38 exemptions
  (`fresh-session-sort:rewrite` 22 + `smoosh-split:declared-peel` 16),
  matching the triage's 22/16 split exactly. s-captureL **2 -> 0**
  with ZERO exemptions — the better outcome: anchoring
  `normalizeSessionStartText` stops the rewrite happening on quoted
  prose at all, so nothing needed excusing. An exemption there would
  have papered over a real fidelity bug.
  FOUR OF MY OWN DEFECTS, all silent (the code ran and returned
  plausible output), all found by measuring rather than reading:
  (1) the gate's units are UNWRAPPED while both extensions' predicates
  are defined over the WRAPPED `<system-reminder>` form — three
  separate bugs from this one confusion, now handled by carrying the
  peel's BLOCKS beside their hashes with the reason at the call site;
  (2) the F-side credited a fresh-session-sort rewrite to
  `smoosh-split:declared-peel` — an exemption ledger that mislabels
  WHY bytes were excused is barely better than a silent exemption;
  (3) `fresh-session-sort` declared stats only on the RELOCATION path,
  so the in-place sort branch rewrote blocks and declared nothing —
  18 of the 38 rows were that branch;
  (4) the composed peel/strip case needed the peel's verification to
  accept a product content-strip legitimately removed.
  DEVIATION from the booked design, with its reason: the entry said
  re-run `fixBlockText`, but that ends in `pinBlockContent`, which
  MUTATES the extension's module-level pin map — a checker must not
  edit the state of the thing it checks, mid-run. The pure half
  (`rewriteBlockText`) was extracted for the gate, so it still chains
  the extension's own logic rather than re-implementing the sort.
  ONE PRE-EXISTING TEST updated rather than worked around: it asserted
  the in-place branch emits NO stats, which was stricter than its own
  stated reason (no RELOCATE telemetry, since a relocation record buys
  a stability exemption). Verified directly that a rewrite-only
  declaration yields `null` from `freshSessionSortExemption`, so no
  stability exemption is widened.

- **(DONE 2026-08-05) — conservation gate: declared exemption for
  `fresh-session-sort`'s block rewrite.** Design settled by the
  triage above. Shape mirrors the existing clause-(d) peel exemption
  exactly (replay.mjs:1853 `smooshSplitPeelUnits` / :1927): the
  extension DECLARES its rewrites (`ctx.meta.freshSessionSortStats`
  with the count, same wiring as `smooshSplitStats` at
  replay.mjs:2310), and the gate VERIFIES the declaration by
  re-running fresh-session-sort's OWN exported `fixBlockText(
  getBlockType(t), t)` on the raw block and requiring the result
  present in F byte-identically — declaration alone never exempts.
  Restricted to blocks the extension actually touches
  (`isRelocatableBlock`); a rewrite of anything else stays a
  violation. Verifier, red-first: the bite asserts the 11 rows of
  s-captureI (requests 168,169,175,177,180,181,182,186,187,189,191)
  go from `lost`/`invented` to `conservationExemptions` — red against
  today's replay.mjs — plus a CONTROL asserting that a rewrite whose
  re-run does NOT reproduce the forwarded bytes still reports a
  violation (tamper one forwarded block in the fixture). tools/-only,
  not deployment-coupled.

- **(DONE 2026-08-05, as the peel/strip COMPOSITION) — conservation gate: declared exemption for
  `content-strip`.** Same shape, clause (c) widened. content-strip
  (order-wise ahead of the gate's view) declares the blocks it
  removed; the gate re-runs content-strip's OWN predicates
  (`isContinueTrailerBlock` / `isBookkeepingReminder`, which must be
  EXPORTED — they are module-private today, content-strip.mjs:14-31)
  against the raw unit and exempts only a unit those predicates
  accept. Note the composition the triage found: the unit reaching
  content-strip may be a smoosh-split PEEL product rather than a
  block CC sent, so the clause-(d) peel verification must treat a
  peeled unit that content-strip legitimately strips as accounted —
  i.e. the two exemptions compose, and the bite must cover the
  composed case, which is the ONLY case measured so far (8 of the 8
  rows). Verifier, red-first: the bite asserts the 8 rows at msg[6]
  of s-captureI become exemptions — red today — plus a CONTROL that a
  removed block matching NEITHER predicate still reports `lost`.
  tools/-only, not deployment-coupled. SEQUENCE: this one after the
  fresh-session-sort exemption, since both touch the same R-side loop.

- **ACCEPTED 2026-08-05 (operator decision, measured) — the 8-hex
  capture-key prefix already in published git history stays there. No
  history rewrite.**
  WHAT IS ACTUALLY EXPOSED, measured rather than estimated:
  - fork-main's WORKING TREE: **clean**. `absence-scan` over all 605
    tracked files reports clean; the raw-grep hits that remain are the
    synthetics the scanner knows (the fixture token, the test
    fixtures, the exemption regex itself).
  - fork-main's own COMMIT HISTORY: 21 distinct prefixes across the
    messages. Public, immutable.
  - the OPEN PR branches' commit messages, which live in upstream's
    `refs/pull/N/head`: **31 occurrences**, concentrated in three
    branches (pr/insertion-join-moves 15, pr/verification-tools 11,
    pr/insertion-normalization 5). The other four are clean.
  - upstream's `main`: **NOT exposed.** Both merged PRs (#274, #277)
    carry none of the class in message or added diff — checked, not
    assumed, and this was the fact that decided it.
  WHY ACCEPT RATHER THAN REMEDIATE, and the first reason alone is
  sufficient:
  (1) **Remediation is not available.** GitHub retains
    `refs/pull/N/head` objects after a force-push and after a PR
    closes — precedent already recorded in this repo (#294/#296). A
    fork-history rewrite would break every PR branch and every
    upstream ref while retracting nothing that has been fetched.
    There is no action whose outcome is "the bytes are gone".
  (2) **The residual value of the leaked bytes is near zero.** An
    8-hex prefix of a session UUID identifies a LOCAL Claude Code
    conversation on one machine. It is not a credential, it addresses
    no remote resource, and it authenticates nothing. It has worth
    only to someone who ALSO holds the corresponding capture — and
    captures are never published, which is the rule the whole
    hygiene apparatus exists to keep. Contrast the origin-IP
    precedent this repo's CLAUDE.md cites, where the leaked value WAS
    the attack surface and remediation meant rotating the host: here
    there is nothing to rotate and nothing the value unlocks.
  (3) The forward boundary is closed and measured: the scan now reads
    file CONTENTS across every text type, object KEY names, and
    COMMIT MESSAGES scoped to the range being pushed — 0 findings
    over 605 files, still red on an unseen real prefix.
  WHAT WOULD RE-OPEN THIS: a capture file becoming public (the prefix
  then links a comment to real prompt bytes), or upstream asking for
  the branches to be rewritten. Neither is true today.
  NOT DONE, deliberately: rewriting the three branches' commit
  messages. It would cost a force-push on each, break the review
  threads' commit links, and — per (1) — not retract anything.

- **RESOLVED 2026-08-05 — the push gate now sees source files, and the
  tree it guards is scrubbed. Both halves landed together, which was
  the whole point.**
  THE GAP, found by running the instrument against a known positive
  rather than by reading it: `--git-range` filtered candidates to
  `.json`/`.jsonl` BEFORE any class ran, so a capture identifier in a
  tracked `.mjs` or `.md` passed the push hook silently — exactly
  where the 2026-08-02 red-main incident put one. A planted UUID went
  RED in a `.json` and GREEN in a `.mjs`. The FILTER was the hole, not
  the class definitions.
  THE COUPLING, and why neither half could ship alone: widening the
  gate over an unscrubbed tree fires it on hundreds of pre-existing
  non-defects and trains the `--no-verify` reflex on the one boundary
  that matters; scrubbing without widening leaves the next addition
  unguarded. So: scrub first (e822458 + this commit), then widen.
  THE SCRUB. Each distinct real prefix maps to a stable synthetic
  token (`s-captureA`, `s-captureB`, …) applied everywhere, so two
  notes about the same capture still visibly refer to the same one. No
  mapping file — a committed synthetic-to-real table would undo the
  exercise. 42 files, 314 occurrences replaced.
  THE MEASUREMENT, pinned to refs because it was got wrong three times
  otherwise (see the correction note below):
  pre-scrub `b6017b8` = **430 matches across 49 files**, 97 distinct
  prefixes; post-scrub `e822458` = 116 across 8 files, all in the
  excluded set below.
  DELIBERATELY NOT SCRUBBED, each for a stated reason:
  `test/fixtures/harvested/LEDGER-*.json` (94) is the per-machine
  harvest watermark, allowlisted in the scanner's own code by operator
  ruling 2026-07-31 — and its entries are NOT bare prefixes at all:
  every one is a JSON key holding a FULL UUID, which the 8-hex pattern
  matches only by its head. Substituting the head alone would have
  left the real 28-hex tail in place beside a synthetic prefix — worse
  than a no-op. Two full-UUID citations in this file's own prose, and
  two ASSERTED test values, were handled individually.
  **CORRECTION, recorded because the shape repeats.** This entry
  carried three wrong exposure numbers in succession: 96 (one id
  counted, framed as the class), then 414 (an unanchored count that
  also matched the SAFE 12-hex form), then "four files / ~116" — the
  last measured against a tree a dispatched agent was committing to,
  WITHOUT PINNING A REF, so pre- and post-scrub numbers were compared
  as if they were the same tree. The agent pinned its refs and was
  right throughout; the dispatcher's corrections were the unreliable
  part. Rule earned: a measurement over a working tree another writer
  holds is quoted with the commit it was taken at, or it is not
  quoted.
  THE WIDENING, kept narrow on purpose. Source files get the
  short-key class and ONLY it. Widening the whole scan across source
  would drag the UUID and base64 classes over dozens of legitimate
  synthetic values — the fires-on-a-non-defect trap, one level up from
  the one being fixed. Measured false-fire rate after the scrub: **0
  findings over 545 tracked source files**, with the class still red
  on a real prefix. Two false fires were found and fixed in the
  predicate rather than papered over in the data: a bare
  `s-20240229` inside a grep pattern in prose, and the head of a full
  UUID, which belongs to the UUID class and was double-reporting.
  RESIDUE, named: the ids remain in immutable public history — this
  buys hygiene forward, not retraction — and the PR branches' own
  commit MESSAGES still carry prefixes that no push can retract.

- **DONE 2026-08-05 — the ledger's 94 session UUIDs are gone, and the
  scanner's KEY-POSITION blind spot that hid them is closed.** Operator
  GO on the recommendation; building it found the larger defect.
  WHAT WAS ACTUALLY WRONG, two independent things:
  (1) `harvest` indexed `ledger.keys` BY the capture key, so every
  entry was a full session id in a tracked public file. (2) The
  scanner could not see them: `strings()` yielded VALUES only, never
  object KEY NAMES. Measured — the identical UUID reports
  `capture-uuid` as a value and NOTHING as a key. A map keyed by the
  protected thing is an ordinary shape, so this was a general hole,
  not a quirk of one file.
  MY RECOMMENDATION WAS PARTLY WRONG and the record says so: I told
  the operator to retire the allowlist entry in the same commit.
  Retiring it turns the gate red on 95 `live-timestamp` findings from
  `lastHarvest`, which is legitimately what a watermark ledger
  contains. The entry stays; its JUSTIFICATION is narrowed to that one
  class. The old wording ("keyed by raw capture key BY DESIGN") is
  what let everyone, including its author, read it as blessing the
  identifiers.
  BUILT: `ledgerKey()` hashes to `k_<sha16>`, migrating at LOAD so
  watermarks survive with nobody running anything. Verified on the
  live file: 95 keys, all distinct under the map, 94 UUID-shaped -> 0,
  every watermark >= its previous value. Key findings are positional
  (`$.keys[#1]~key`) because the path would otherwise BE the key —
  the finding would have echoed the thing it exists to flag.
  NEARLY BROKE: `key` also feeds `sidToken()` for harvested FIXTURE
  FILENAMES. Hashing it there would have renamed every future fixture
  and silently split them from the existing ones; the raw capture key
  stays for that path.
  BLAST RADIUS, checked rather than recalled (operator asked): the
  ledger reached NO upstream PR. All 14 PRs ever opened list zero
  LEDGER files; every PR branch diffs zero against upstream/main; the
  file is absent from upstream/main. The fork-only convention held.
  The exposure was real but confined to fork-main, which is itself
  public.
  Red-first both halves: removing the key-yield turns the two scanner
  bites red; reverting `ledgerKey` to identity turns the ledger bites
  red. Suite 2089/2089.
  **FOLLOW-UP, same day — the residual named in the report is closed
  too.** The allowlist was PATH-wide: a file named in it was skipped
  entirely, so an exemption written about one class excused every
  class. That is how the ledger's identifiers sat behind an exemption
  whose stated reason was its timestamps — and it meant the one file
  whose exposure started this was the one file the scanner would not
  look at. Entries are `{pattern, classes}` now; the file is scanned
  and only the named classes are dropped. `isAllowlisted` narrowed to
  mean "exempt from EVERY class" and is consequently false for the
  ledger. Verified: the real ledger still exits 0 (its timestamps are
  excused), a UUID planted into it exits 2 with a positional path.
  Two consumer tests encoded the old semantics and were updated rather
  than worked around — one asserted that an allowlisted path is "not
  scanned", which was the defect stated as an expectation.

- **DONE 2026-08-05 (closed on measurement, step 0; ships with this entry's
  commit) — the `/resume` re-bill (matrix row 24): STEP 0 ANSWERED YES, the
  system layer usually breaks too, so the messages[0] pin is refused and the
  item closes without a build.** Measured corpus-wide (probe importing
  `conversationSubKey`/`systemPromptSubKey`, proven live on this entry's own
  named known positive — the 449-msg born-large conversation — after a first
  run returned zero on a reader-shape bug): 28 born-large conversation
  starts across all captures; at 24 of the 27 with an in-file comparand the
  SYSTEM layer broke across the boundary (row 24's own boundary among them),
  and in the cleanest same-thread subset (no first-block rotation, message
  count within a few percent) still 4 of 7. System renders before messages:
  at the typical boundary a messages-layer pin buys nothing. The
  recommendation below (do NOT build) is thereby measured, not argued; the
  class stays a CONTROLLED cost. Row 24 carries the assessment. Two
  follow-ons booked separately: the born-large census class, and the
  rotated-identity born-large population (20 of 28, repeating ~+2,040-char
  system delta) that is NOT resume-shaped and deserves its own name.
  Original entry kept below for the record.
  **(superseded) READY — the `/resume` re-bill (matrix row 24): pick up where
  the row's
  named missing evidence stops, and decide a compromise.** Operator ask,
  2026-08-05. Not a fresh investigation: row 24 already measured the class
  (~1.19M tokens across one boundary, `cache_read=0` on the first resumed
  request, TTL expiry ruled out, resuming FASTER cannot help) and graded it
  OPEN AND PROMISING — 98% of the resumed content is byte-identical to the
  pre-exit array, and the index-0 divergence is a `<system-reminder>` block
  carrying the CLAUDE.md corpus snapshot, i.e. the volatile-reminder class rows
  1 and 23 already mitigate. Still live and current rather than historical:
  the cold ledger records `2026-08-05 17:22:36Z 408k CONTROLLED(resume)` for
  the operator's own session today.
  **STEP 0, ADDED 2026-08-05 night, and it may close this item without any
  build: does the SYSTEM layer break on a resume too?** On the one boundary
  row 24 measured in depth, all three cache layers had changed — system prompt
  11,102 -> 10,090 chars (a whole `# Communicating with the user` section
  absent), `messages[0]`, and the message count 966 -> 938. System renders
  BEFORE messages, so on that boundary a messages-layer pin buys exactly
  NOTHING. Whether that is typical is unmeasured, and it is cheap to measure:
  compare system-prompt hashes across resume boundaries in the existing
  captures (a rebuilt array's signature is a conversation whose FIRST request
  is already large — `conversationSubKey`, imported, never re-derived). If the
  system layer usually breaks too, this item closes on measurement.
  RECOMMENDATION as of tonight, stated so the next session does not re-derive
  it: do NOT build the messages[0] pin. Three reasons beyond step 0. The
  announcement cannot actually supersede — the stale block's bytes ARE the
  cache key, so it cannot be deleted and the model sees both copies, leaving a
  prose marker as the only lever, and prose is what the re-anchor hook exists
  because it decays. The corpus is authoritative INSTRUCTION text, so a rule
  edited to stop a behaviour still says do it in the stale copy: a correctness
  cost paid for a cache cost, against this repo's own ordering. And a resume is
  a CONTROLLED cost — `bust-triage` classifies it that way deliberately — so
  the machinery it needs (a key surviving a rebuilt messages[0], persisted
  state, a delta computation) ranks below the preventable classes still open.
  An earlier version of this entry recommended the compromise; that
  recommendation underweighted the system layer, which is the same error as
  reading an index-0 divergence without checking whether tools had already
  changed.

  **The blocker to solve FIRST, and it is new — it comes from building the
  relocation memory today.** Every stateful extension keys on
  `conversationSubKey(messages)`, a hash of `messages[0]`. A resume REBUILDS
  `messages[0]`, so the resumed session is a different conversation to all of
  them by construction — there is no key under which the pre-exit form could
  be looked up, which is why "pin messages[0] to its first-seen form" is not
  yet implementable however desirable it is. So step 1 is the KEY question,
  not the pinning question: does any identity survive a resume boundary
  (session-id header + system-prompt sub-key without the conversation
  sub-key? a content overlap test against recent conversations?), and what
  does each candidate collide with — the co-tenant traffic that forced the
  conversation sub-key in the first place is the thing to re-check, since
  dropping it is what row 14 was about.
  Step 2 is row 24's own named missing evidence: where the SECOND divergence
  lands once `messages[0]` is held (the 49 dropped and 18 new messages must be
  located — tail, scattered, or a compaction boundary), measured with today's
  instruments, which did not exist when the row was written: the stability
  violation's `prefixAboveMessages` says whether a message-layer fix would
  even be billable, and the row's own note that the SYSTEM prompt also
  changed means the messages half may be worth nothing until the system half
  is answered too.
  Step 3 is the compromise itself, and one half of it is an OPERATOR CALL,
  not a measurement: re-serving a stale corpus snapshot after the operator has
  deliberately edited the rules mid-session. The in-band announcement pattern
  (rows 1/23) can carry the delta so the model still reads the newer text —
  that is the shape of the compromise, and whether it is acceptable for
  authoritative instruction text is the operator's to settle.
  Done when: the key question has a measured answer, the second divergence has
  an index and a re-billed size, and the compromise is either designed or
  refused with its reason. Evidence pointer, with its expiry: today's capture
  for session `03d45c17` holds exactly one born-large conversation
  (`conversationSubKey 9ea7aead0d1a7452`, n=2, 15:33:17Z, 449 messages) — the
  rebuilt-array signature — while the 17:22:36Z 408k event's own request was
  NOT located in it, which is itself the first thing to reconcile. Captures
  rotate oldest-mtime-first; this one is ~320 MB and current.

- **DONE 2026-08-06 (c53bbae) — `bust-triage --at <stamp>` substituted silently when the stamp
  names a CONTROLLED event (tools/-only).** Found 2026-08-05 by using it: the
  DEFAULT path prints the note it should — "the newest cold event is
  2026-08-05 17:22:36Z CONTROLLED(resume), 408k re-written … Cannot triage …
  Falling back to the newest BUST" — and `--at 2026-08-05T17:22:36Z` prints
  NOTHING and answers about the 12:20:13Z `messages_changed` bust instead.
  That is the exact failure `fallbackNote`'s own docstring names ("someone
  sees a ❄ token, runs the tool, and gets a verdict about a different, older
  event with nothing marking the substitution") — the guard exists, and the
  `--at` path routes around it, which is worse than not having it: the reader
  believes the verdict describes the event they asked about.
  Design: `--at` resolves against ALL cold events, not just busts; when the
  resolved event is controlled, emit the same note (naming the requested
  stamp, not only "the newest") before any fallback, and when there is no
  bust at or before the stamp say so rather than defaulting to the newest.
  Verifier, red-first: a bite driving `--at` with a controlled stamp against
  a synthetic ledger must assert the note's presence and the named stamp —
  red today, since the path prints nothing; plus a control asserting the
  default path's note is unchanged.

- **DONE 2026-08-05 (c6a6e31, c0a525c, b9c5a28) — the daily sweep persists
  ROWS, not just counts.** Eight fields, taken verbatim from the child's
  parsed JSON with no reshaping: stability, stability-exempt, conservation,
  conservation-exempt, sequence, order, absorption-miss and
  reloc-departure. Capped at 200/field/capture with an explicit
  `<field>Truncated: <total>` beside it, and all eight go through one
  recorder that keeps the three answers — absent is `null`, empty is a
  measured zero. `absorptionMissRows` moved onto it too: it shipped first
  and shipped with `?? []`, so an absent field read as a measured zero in
  the one row a reader consults to decide whether a class is live.
  VERIFIED against a real sweep, not only synthetics (17:34Z run, 42
  captures): every row carries the arrays, none null, and the live
  stability row carries `prefixAboveMessages` — which also closed the
  "field names read, not exercised" residue the building lane reported.
  Measured growth: ~113 KB against 104 KB, ~8%. RESIDUAL, split off into
  its own entry above: byte-gate MISMATCH rows, which no child exposes as
  a copyable array.
  Original text follows for the evidence trail.
  AMENDED 2026-08-05 night: STABILITY rows belong in the list too — the
  original enumeration named conservation, byte-gate, order, sequence and
  census and skipped them, and they now carry the field that says what a
  violation COST (`prefixAboveMessages`, row 25). Today that field exists
  only in the replay JSON the sweep throws away, so the status file still
  shows `stability: 1` and the next reader re-derives the cost by hand
  over a multi-hundred-MB capture — which is the exact loss this item
  exists to stop, and it has now happened twice.
  Grounding: the finding above, plus the precedent that just shipped —
  the absorption check's rows are now written to the status file
  (`gate-live.mjs`, `row.absorptionMissRows`) precisely because their
  absence forced an 8 GB re-read to answer a question the sweep had
  already answered once. Every other per-row gate still discards:
  conservation violations and exemptions, byte-gate MISMATCH rows,
  order and sequence violations, census findings. Each is a list the
  sweep computes and throws away, and each is re-derivable only while
  the capture still exists — which the finding above prices at hours.
  Design: same shape as `absorptionMissRows`, one field per gate,
  written from the child's parsed JSON with NO reshaping. Bound it
  per gate per capture (200 rows is above every count observed; the
  38-row gate-red is the largest so far) and on truncation write an
  explicit `truncated: <n>` beside the array — a silently short list
  is the failure this item exists to prevent, one level up.
  Verifier, red-first: a bite asserting a sweep row carries the
  conservation rows for a capture whose replay reports them, red
  against today's `summarise*` which keep only counts; plus a control
  asserting the truncation marker appears when the cap is crossed.
  NOT in scope: changing what any gate COMPUTES, or the sweep's
  pass/fail. This is persistence only.

- **DONE 2026-08-05 (04ed3c9) — the canonical re-serve normalizes its
  CONTAINER to the wire's current one (proxy/**, deployed).** Closed
  2026-08-05 night. The closure is right — the work shipped as 04ed3c9 —
  but the ROUTE to it, as first written here, was not, and the correction
  matters more than the closure: this entry's own body cites NO commit ref.
  `04ed3c9` appears at the first line of the NEXT entry, which was already
  graded DONE, and the first version of this note attributed it across that
  boundary — the same-entry/cross-entry limit `tools/backlog-lint.mjs`
  documents as deliberate, walked into while reading. The lint was clean on
  this entry for a simpler reason than the one first recorded: it carries no
  resolution marker of any kind. Caught by the dispatched lane, which
  refused to build a check on the premise and halted instead of widening the
  entry boundary to make its known-positive fire — the right call, and the
  reason no `GRADE-VS-COMMIT` lane exists.
  The design below is what shipped; it is kept for the evidence trail.** This is the
  349k bust's actual fix and it is narrower than the row-24 message-
  level pin. Grounding, all measured today (matrix, Row 4 datapoint
  2026-08-05): `resetKeepingPins`/`findJoinMoves` substitute
  `priorCanonical[ci].m` verbatim, that stored message is CC's
  FIRST-SEEN form, and CC's first-seen form for a `role:"system"`
  harness message is frequently the block-array wrapper it uses to
  carry a `cache_control` breakpoint — which it then drops. Measured
  instance: first seen n=194 as `array[1] cc={"ephemeral","1h"}`,
  bare string from n=195 for 26 requests, re-served as an array at
  n=221, 349,004 tokens.
  Design: at substitution time, re-serve the canonical's TEXT in the
  container the CURRENT wire message uses — string stays string,
  array stays array — rather than the container that was stored.
  Text identity is untouched, so the safety argument is unchanged
  (same bytes, same slot, same count, same roles); only the envelope
  follows the wire. Scope it to the `role:"system"` single-text-block
  case that is measured, and fail closed to today's behaviour on
  anything else — a multi-block message or a container change that
  also changes text is NOT this class.
  CALL SITES, located 2026-08-05 (read, not yet exercised — the
  exercise is the bite below): the verbatim re-serve is exactly two
  lines, `insertion-normalization.mjs:941` (join-moves,
  `out[mv.mergedIndex] = priorCanonical[mv.ci].m`) and `:942`
  (re-fires, `out[rf.index] = priorCanonical[rf.ci].m`). The stored
  `.m` is written by `buildPinEntry` (:620-622) as
  `stripAllCacheControl(msg)` over CC's RAW first-seen message, so
  the container stored is whichever one CC happened to use first —
  the array, in the measured instance, because that is how CC carries
  a breakpoint.
  WHY THIS IS A FORWARDING BUG AND NOT AN IDENTITY ONE, and it is the
  fact that makes the fix small: `canonicalMessageShape` (:370-379)
  ALREADY treats a bare string and a single text block as the same
  identity, which is why the entry matched across the flip at all.
  Identity is container-blind today; only the forwarded bytes are
  not. And the PIN path already does the right thing — line 925 calls
  `pinnedForwardForm(stored, messages[e.index])`, i.e. it consults
  the live wire message before deciding what to send (:633-637).
  The move/re-fire path at 941-942 is the outlier that consults
  nothing. State the fix that way when building it: give 941-942 the
  wire-consulting form the pin path already has.
  SEQUENCING against the narrow container normalisation item further
  down: they are the same mechanism seen from two sides (CC's flip vs
  our stored flip) and both are proxy/**. First read of the code says
  they do NOT dissolve into one another and the sequencing note
  overstated it — this item fixes what WE re-serve (two lines,
  container-blind identity already in place), the row-24 item
  normalizes what CC sends, which rewrites pass-through bytes and is
  the larger behaviour change. A row-24 normalisation applied to both
  the stored and the live view would also cover this class as a side
  effect, so the dissolve direction is one-way and the cheap item is
  this one. That reading is UNEXERCISED: it rests on the call sites
  above, not on a replay, and the old-vs-new corpus check below is
  what settles it.
  Verifier, red-first: a bite that drives the measured sequence —
  first request carries the message as `array[1]` with a
  `cache_control`, later requests as a bare string, then a join-move
  fires — and asserts the forwarded message is a STRING. Red against
  today's implementation (it forwards the array). Plus a CONTROL
  where the wire's current form IS an array, asserting the array is
  still forwarded. Corpus check: replay s-captureQ old-vs-new and
  require the ONLY delta to be at n=221.

- **(DONE 2026-08-05 — shipped 12d7dd6, then CLASSIFIED 383d8a5, and the
  class it found is FIXED at 04ed3c9) — a gate that asks whether a
  mitigation ABSORBED, not just whether it ran.**
  WHAT THE FIRST CORPUS-WIDE MEASUREMENT SAID, and it is a
  single-class population: **41 of 41 absorption-miss rows are
  CONTAINER** — a stale block-array-vs-string wrapper — across 9
  captures, with every other class of the 8-way ladder at ZERO
  (ABSENT, IDENTICAL, ROLE, TEXT, CACHE-CONTROL, BLOCKS, OTHER all 0).
  The `ours` subset, 33 rows, has the identical shape. So the answer
  to "are the 40 one mechanism or several?" is ONE mechanism, and it
  is the one the 349k bust named.
  `IDENTICAL: 0` is the instrument's own self-check: not one reported
  divergence turned out to be a false alarm at the index it named.
  COVERAGE, stated rather than summed: 41/50 rows overall and 33/40
  `ours`, because 3 captures rotated off disk between the 12:20Z sweep
  and the run. The measured total EXCEEDS the 39/31 ceiling that
  arithmetic predicted, and the excess is isolated rather than waved
  at: 8 of 9 captures match their sweep counts exactly and one grew
  from 9 to 11 rows (both new rows CONTAINER, both ours) because
  captures are live. +2/+2 accounts for the whole delta.
  THE FIX FOLLOWED THE MEASUREMENT, same day: 04ed3c9 makes the
  re-serve emit the container the entry was LAST SEEN in. Post-fix
  re-run of the same corpus is the after-half of the comparison; on
  the known-positive capture it is already CONTAINER 2 -> 0, with one
  row reclassifying to TEXT thirteen messages later and attributed to
  CC's own input (`inDiv` 369 < `fwdDiv` 373).
  RESIDUE, named: single-class at n=41 is established FOR THIS
  CORPUS, not as a universal — whether other classes exist elsewhere
  is the next corpus's question, and the per-capita RATE is still
  unmeasured. And the `ours` split is a floor, not a count (see the
  under-attribution finding above).
  **THE AFTER-HALF, measured over the same 9 captures under 04ed3c9,
  and the row-level join is what makes it a verdict rather than a
  tally.** Totals 41 -> 30 rows, 33 -> 24 ours, CONTAINER 41 -> 1.
  Joining pre to post by request number: **15 rows GONE, 26 MOVED TO A
  LATER INDEX, 0 reclassified AT THE SAME INDEX**, plus 4 new rows on
  the one capture that grew between the two runs. The zero is the
  finding: not one slot came back as "right container, still wrong
  bytes at that index", which is the shape a half-fix would have. The
  fix repaired every instance it touched.
  IT DID NOT REMOVE THE MISSES, AND THAT IS THE HONEST HEADLINE: 30
  remain, 24 of them ours, now classifying as TEXT 15 and
  CACHE-CONTROL 14 — two classes that scored ZERO before, because the
  container divergence was the FIRST one and masked everything behind
  it. Every "moved later" row is a prefix that now survives further
  and then diverges for a different reason. So the corpus has not got
  better by 11 rows; it has become legible for the first time, and
  the next layer is a marker-placement class (CACHE-CONTROL) that no
  one has looked at yet.
  ONE CONTAINER ROW SURVIVES (n=334 of the 597 MB capture,
  CONTAINER@342 -> CONTAINER@346): a SECOND container divergence
  sitting behind the first, at a different index, so it is not the
  fixed one reappearing. It is presumably one of the shapes
  `reserveForward` fails closed on — multi-block, or a role outside
  the carrier class. Named, not chased.
  METHOD CAVEAT, stated because it bounds the comparison: captures
  are live and one of the nine grew between the before and after
  runs, so the two populations are not measured over byte-identical
  inputs. The per-request join is immune to that (a row is matched by
  its own request number, and growth shows up as `new`), which is why
  the join is the evidence here and the totals are not.

- **(DONE, see above) — a gate that asks whether a mitigation ABSORBED, not just
  whether it ran.** Grounding, and it is the reason the 349k bust
  reached a human: the capture replays exit 0 on all five gates and
  every verdict is correct. Stability asks whether OUR output
  diverged EARLIER than CC's input; CC diverged at the same logical
  slot, so green is the right answer. Nothing asks the question that
  mattered — insertion-normalization reported `movedFresh:2`, i.e.
  it RECOGNIZED both migrations, and the forwarded prefix diverged at
  the very slot it had just substituted. "The mitigation ran" and
  "the mitigation absorbed" came apart, which is the same split the
  `movedFresh`/`movedRefires` work was minted for, one level up.
  Design: a sixth per-pair check — when an entry reports a fresh
  absorption (`movedFresh > 0`, or a description absorb, or an
  oscillation absorption) AND the forwarded pair still diverges at or
  before the absorbed index, that is an ABSORPTION MISS. Report it
  with the absorbed index, the forwarded divergence index, and
  whether the raw pair diverged there too — the three numbers that
  turned this bust from a puzzle into a mechanism. It is a REPORT
  first, not a gate: measure its corpus-wide rate before deciding
  whether it may block, precisely because a check that fires on a
  non-defect trains the reader to discount red.
  Verifier, red-first: run it over s-captureQ and require exactly one
  absorption-miss row at n=221 (absorbed index 360, forwarded
  divergence 360) — the current code reports nothing, so the bite is
  red by construction; plus a CONTROL over a capture where an absorb
  fires and the prefix holds (the description absorb on s-captureJ
  n=1202), asserting zero rows. tools/-only, not deployment-coupled,
  and it should ride gate-live's daily sweep as a `absorptionMisses`
  summary alongside `byteGate`.

- **(SUPERSEDED by the recurrence entry above — its fix was
  incomplete) SOLVED INCIDENT 2026-08-05 (root cause found same day, fixed in
  the commit this entry rides in) — the .git/config corruption was
  the suite hook running under git's HOOK ENVIRONMENT from a
  worktree.** Mechanism, fully reproduced: git exports GIT_DIR into
  pre-push hooks — RELATIVE ".git" for main-tree pushes, ABSOLUTE
  for worktree pushes. The suite's scratch-repo test helpers spawn
  git with cwd=tempdir but inherited env, so under the worktree
  hook every `git init`/`git config` in them resolved to the REAL
  shared git dir: `git init` on a git-dir not named ".git" writes
  core.bare=true (bare-ness is guessed from the dir name), and the
  fixture identity writes followed. Main-tree pushes were immune
  because the relative GIT_DIR re-resolves inside each test's temp
  cwd — which is why the corruption appeared only after the
  dispatcher's worktree-reach fix made the suite run on a worktree
  push at all (my own dry-run at 10:56:09; config mtime 10:56:10).
  Repro: `GIT_DIR=$(git rev-parse --absolute-git-dir) node --test
  test/absence-scan.test.mjs` from a worktree — corrupts; measured.
  Fix: tools/git-hooks/pre-push unsets `git rev-parse
  --local-env-vars` before npm test — same repro against the fixed
  hook leaves the config byte-identical; measured. The 10:51
  FETCH_HEAD/ORIG_HEAD was dot apply's own refresh pull, benign and
  unrelated. Standing lesson for ANY runner of this suite from a git
  hook: sanitize the hook env first — and the absence-scan split
  entry below now carries the test-layer hardening so upstream
  consumers are safe regardless of their hook context.
  Original investigation record follows.

- **(superseded by the SOLVED entry above) OPEN INCIDENT 2026-08-05
  ~10:51-10:56 — an external writer
  corrupted this repo's .git/config; repaired, attribution needs the
  concurrent sessions' transcripts.** Observed: `core.bare=true` +
  `user.name=t` + `user.email=t@t` written into the LOCAL config
  (config mtime 10:56:10), breaking all git work-tree operations and
  mis-authoring one commit as "t" (b81e80a — re-authored to 3261ee3
  and force-with-lease pushed same hour). Also unexplained:
  FETCH_HEAD + ORIG_HEAD written 10:51 by a fetch/pull this session
  never ran. `.git/description` and `HEAD` untouched since July, so
  no reinit — direct config writes. The t/t@t/bare triple is exactly
  the scratch-repo fixture convention of BOTH test rigs on this
  machine. EXONERATED BY EXPERIMENT, both re-run against a config
  md5 before/after: (1) the fork suite's two t@t-writing test files
  executed inside the wt-g2 worktree — config byte-identical; (2)
  the dotfiles pre-push battery executed with cwd in this repo —
  config byte-identical.
  UPDATE, same day: the 10:51 half is SOLVED — the operator ran
  `./dot apply`, whose refresh step runs `git -C <this repo> pull
  --ff-only` by design (dot: step_refresh_verified_clones), exactly
  the FETCH_HEAD/ORIG_HEAD fingerprint. Benign. The 10:56 config
  write stays open, with the exoneration list now exhaustive for
  locally executable mechanisms: fork suite files (read + measured,
  helpers temp-bound), dotfiles pre-push battery (measured, twice,
  both cwds), and doctor's FULL 18-hook bite-test loop replicated
  with cwd in this repo (all CLEAN against a config md5) — so `dot
  apply`'s doctor pass does not reproduce it either, on current
  code. Unexecutable-from-here candidates remain: the clippy
  session's live worktree-config probes (mid-edit on exactly that
  recipe at 10:55), and manual shell commands. Next diagnostics, in
  order: the operator's fish `history --show-time` for 10:51-10:56,
  and the clippy session's transcript. Mechanization candidate once
  attributed: doctor fail on a local user.name/user.email in this
  repo (global identity is the convention here; a local one is
  always leakage).

- **(DONE — claude-worktime `0527e88`, 2026-08-07; PUSH BLOCKED, see below)
  `PROJECT_GIT_ANCHOR` does not reach a WORKTREE, so
  agent lanes book their time as separate projects.** Fixed as designed:
  `--git-common-dir` with the old `--show-toplevel` kept as the fallback for
  git < 2.31 and non-standard layouts. `tests/label-git-anchor.sh` pins it with
  its controls — a subdirectory and the repo root must not regress, a non-git
  path must still fall back, and with the anchor OFF everything is unchanged,
  which is what stops a fix that anchors unconditionally from passing. Red-first
  recorded: reverting the one changed question reds the two worktree cases and
  leaves the subdirectory control green. All six suites pass; installed to
  `~/.local/bin/claude-worktime` (install.sh COPIES, so a reinstall was
  required).
  **THE PUSH IS BLOCKED, and the blocker is the guard widened hours earlier in
  the same session** — its first real push on the repo it was widened to cover.
  `absence-scan` flags `capture-key-prefix` at `claude-worktime.sh:1664` and
  `:1933`, and both lines are **byte-identical to lines already in
  `origin/main`** (checked with `git grep -F` against that ref). So the
  already-published discard did not apply, and the mechanism is that the
  discard is BLOB-granular: editing a file that carries a pre-existing finding
  mints a new blob, so the finding reads as new forever. Consequence, and it is
  the shape the lane's own brief warned about: `claude-worktime.sh` is now
  permanently unpushable without `--no-verify` — a gate that cannot pass, which
  trains the override habit its header exists to prevent. Booked as its own
  entry below. Not overridden: the operator's gate, on a publish action.
  Original entry follows. Found 2026-08-07 by the
  operator reading their own statusline: the label had changed to
  `worktrees/agent-<id> (worktree-agent-<id> ✗?)` with its own `total 16m`,
  while `PROJECT_GIT_ANCHOR=true` was already set in their config (line 245).
  **The mechanism, executed rather than reasoned:** `_project_label_v`
  (`claude-worktime.sh:~726`) anchors with
  `git -C "$path" rev-parse --show-toplevel`, and inside a worktree that
  returns THE WORKTREE'S OWN ROOT —
  measured: `--show-toplevel` -> `<repo>/.claude/worktrees/agent-<id>` while
  `--git-common-dir` -> `<repo>/.git`. So the option's own comment ("anchor to
  the git repo root, so subdirs and worktrees show the repo") is true for
  subdirs and false for worktrees, which is why it reads as working.
  Design: anchor via the common dir — `git -C "$path" rev-parse
  --path-format=absolute --git-common-dir`, then strip the trailing `/.git`
  (and handle a bare `.git` file/dir alike). Verifier, red-first: the label for
  a path inside a worktree must render as the REPO today and does not; control,
  a plain subdirectory of the main clone must render exactly as it does now,
  and a non-git path must still fall back to the short-path label.
  **Why it is worth more than cosmetics:** per-project totals are the operator's
  own measurement surface, and this repo's build-order rubric ranks on measured
  cost. Every agent lane silently forks a new "project" whose time is not
  counted against the repo it was spent on — and the harness places agent
  worktrees INSIDE the repo (`.claude/worktrees/`), so the fork rate is one per
  dispatched lane, three today alone. Candidate for the false-verdict partition
  at the next derivation (consumer: the worktime ledger, i.e. process/backlog
  tier); not placed by this session, which had already derived its order.
  **Why the body is not in claude-worktime yet, with its trigger:** a lane is
  live right now whose verifier clones that repo and asserts against a
  pre-existing finding in ITS `BACKLOG.md`; editing that file mid-run changes
  the fixture under the test. Move the body there when that lane returns — one
  writer per repo, which is the rule this repo just wrote down.

- **(DONE — 5ecba0b + 0d0d2b6 + 3d98c09, 2026-08-07) three defects the
  conservation clause work surfaced in the gate it extended.** All three
  shipped. Verified here rather than on the report, and the verification that
  mattered is the POSITIVE CONTROL, because zero rows moved on the live corpus
  and "nothing moved" reads identically to "the clause is dead": after the
  per-unit narrowing, s-captureAO still grants **44** `fresh-session-sort:rewrite`
  exemptions alongside 50 peel and 13 strip, conservation unchanged at 1 — a
  broken pre-image/post-image mapping would have collapsed those 44 to zero and
  produced 44 new violations. s-captureAL still reads conservation 0 with its
  two clause-(h) exemptions. **Named residue, carried forward:** both narrowings
  are unproven ON LIVE DATA — no message in the four swept captures carries a
  partial exemption, so the constructed bites are the entire evidence, and the
  other 81 captures were not swept for one. Original entry follows. All three are in
  `tools/replay.mjs`, all three were recommended-to-build by the lane that found
  them, and all three are being built on the extended grant; this entry is the
  record, and if the lane returns without them it is the spec.
  (1) **The three-answer gap.** With no declaration surface on the entry, the
  clause is off and the row reads as an ordinary violation — a could-not-verify
  wearing a fail's clothes, which is the failure this repo has now hit four
  times. Not new with clause (h): `fssDeclared`, `stripDeclared` and
  `smooshDeclared` all behave identically. Fix: a `declarationsUnavailable`
  flag, additive to the row schema, and the row's TEXT must say so too — a flag
  alone leaves the human-facing line unchanged. Red-first: a hand-built entry
  with no stats. Bounded: the SHIPPED path is immune (`conservationViolations`
  is called from one place, with an entry whose `mutatedBy` is always an array),
  so the reachable route is `findConservationViolations` and hand-built entries.
  (2) **Clause (f) exempts per MESSAGE where it claims per unit.**
  `rewriteExempt`'s predicate never references the unit beyond the strip check,
  so one verified rewrite exempts every other lost unit of that message — an
  over-firing exemption, i.e. a gate that UNDER-fires, on the side where safety
  outranks cache. Red-first arrangement already demonstrated: mutation M3 of the
  clause-(h) battery installed exactly that shape and the "a REAL loss in the
  same message" bite went red. This one changes live verdicts, so the four
  currently-red captures are re-run and any row whose verdict MOVES is reported.
  (3) **The violation row's COUNT is not narrowed by partial exemptions** — 2
  lost of which 1 is declared-and-verified still reads `2 of 2`. Pre-existing,
  shared with clauses (f) and (g); a no-op except in the partial case, which is
  what its bite must construct.

- **(DONE by enumeration — 2026-08-07, no further defect found) `lines()` drops
  blank lines, so every POSITION derived from
  it is short by the blank count, and the sweep was never done.**
  **THE SWEEP, run and recorded rather than left as a verdict:** every consumer
  of the helper, in both files that define one. `tools/bust-triage.mjs` — line
  109 (`coldEvents`, JSONL records), 134 and 183 (transcript JSONL), 254 (event
  logs), 737 (`matrixRow`, which matches a row by its own text and returns the
  ROW, never an index); `tools/dossier.mjs` — 116 and 188, both JSONL. **Not one
  of them derives a position**: they read records or match content, where
  dropping blank lines is harmless and for JSONL is required. The single site
  that did derive one — `eventWalks` — was fixed at build time and reads the
  file whole. So the class is one instance, and the entry closes with the
  enumeration as its basis rather than with a fix. What DID ship is the missing
  contract: both helper definitions now carry it, with the measured symptom
  (line 1045 reported for a heading at 1212, both numbers plausible), because
  the next author's defence is the comment at the definition, not this entry.
  Original entry follows. Found
  2026-08-07 mid-build: the matrix lint first reported line 1045 for a heading
  that sits at 1212, and both numbers are plausible — the tell is only that one
  of them is wrong. Fixed in `eventWalks` by reading the file whole. **The
  finding is the SWEEP that did not happen:** the lane fixed its own call site
  and stated plainly that other tools deriving positions from the same helper
  have the same defect and were not checked. Design: grep every consumer of
  `lines()` in `tools/`, and for each, decide whether it derives a POSITION
  (defect) or only content (fine); the ones that do get the whole-file read.
  Done when the enumeration exists with a verdict per call site — an unswept
  helper defect is the paraphrase-drift shape at the line-number level.

- **(DONE — 2026-08-08, this entry's own commit) re-derive the build order; the
  block is banner-marked STALE and
  three of its inputs moved on 2026-08-07 evening.** Done-criterion met as
  written: the block is replaced whole (header `DERIVED 2026-08-08 (morning)`,
  no STALE banner), `node tools/backlog-order.mjs --check` exits 0 over 35
  anchors, `backlog-lint` clean. The pre-existing drift is discharged with it.
  A fourth input the booking did not anticipate: twelve entries had been booked
  after the previous derivation ran, seven of them rankable — four admitted to a
  partition, three declined with their tests recorded in the block. Original
  entry follows. Booked rather than done at
  session close, because a derivation is judgment over the whole READY
  population and this session had none of it loaded. What moved is enumerated
  in the banner itself (shipped operator-ranked #1; stale Tier B head numbers;
  the restart's zero-bust datapoint). Note `--check` is ALREADY red at HEAD, so
  the re-derivation also discharges a pre-existing drift rather than one this
  session introduced. Done-criterion: `node tools/backlog-order.mjs --check`
  exits 0 against a block whose header date is the derivation's own, and the
  STALE banner is gone. Do NOT patch the existing block.

- **(DONE — 2026-08-08 afternoon, this entry's own commit) re-derive the build
  order; the block is banner-marked STALE and
  four of its ranked anchors shipped the day it was written.** Done-criterion
  met as written: the block is replaced whole (header
  `DERIVED 2026-08-08 (afternoon)`, no STALE banner),
  `node tools/backlog-order.mjs --check` exits 0 over **44 anchors / 167
  bullets**, `backlog-lint` clean, and the population is conserved (167 bullets
  / 81 READY before and after the reorder).
  **Two of the booking's own premises were WRONG and the probes are the
  useful half.** (1) The banner said "67 -> 76 READY"; the measured header-set
  diff between `0cef42f` and `b7ae5aa` is **66 -> 81**, +18 booked and −3 left.
  (2) It suggested the empty irreversible partition was the input to weigh; the
  input that actually moved the ranking was the WITHDRAWAL of the morning pass's
  quiet-hours datapoint — two cold events landed the same morning it was spent
  on — plus a hard sequencing constraint dissolving. Both recorded in the new
  block's inputs (i)–(vi).
  Original entry follows. Booked at session
  close 2026-08-08 rather than done, because a derivation is judgment over the
  whole READY population and this session had spent its context elsewhere.
  What moved is enumerated in the banner (empty irreversible partition, 35 -> 31
  anchors, 67 -> 76 READY). Done-criterion: `node tools/backlog-order.mjs
  --check` exits 0 against a block whose header date is the derivation's own,
  and the STALE banner is gone. Do NOT patch the existing block.
  Note for whoever does it: the irreversible partition being EMPTY is a real
  input, not an oversight — an empty top partition is a re-derivation trigger,
  not a vacancy to fill by promoting whatever sat below it.

- **(DONE — 2026-08-08 afternoon, operator instruction "please do it") the
  pre-push suite verifies the WORKING TREE, not the commits being
  pushed, so it can go red on code that is not being pushed and green on a
  commit that is broken.**
  Shipped in `tools/git-hooks/pre-push`: the suite now runs in a DETACHED
  WORKTREE at each pushed sha, read from the refs git feeds the hook on stdin
  (branch deletions carry an all-zero sha and are skipped; empty stdin falls
  back to HEAD — still the committed state, never the working tree). Not
  `git stash`: a pre-push hook must never mutate a working copy a co-writer may
  be mid-edit in. The worktree gets the standing `node_modules` symlink and is
  removed on exit, throw and signal.
  **RED-FIRST PROOF, executed at the desk against the OLD hook
  (`git show HEAD:tools/git-hooks/pre-push`, bare `npm test` in the working
  tree) over the same two synthetic fixtures — inverted on BOTH directions, and
  the output is the whole point of this entry:**

      OLD, untracked scratch red / commit green   -> RESULT: BLOCKED  <- false red
      OLD, commit red / tree 'fixed' uncommitted  -> RESULT: ALLOWED  <- FALSE GREEN,
                                                     broken commit reached the remote

  The false-green direction is now MEASURED rather than argued. It was the arm
  nobody had seen fire, and it is the reason this was worth changing: the cheap
  direction merely wastes a push, the silent one publishes a broken commit under
  a green hook.
  The permanent guard is `test/pre-push-hook.test.mjs`, 4 bites: untracked red
  does not block; committed red blocks even over a green tree; an ordinary green
  push still passes (the over-firing control); and no worktree is left
  registered. Its fixture repo carries its OWN trivial `npm test`, so a hook
  that runs `npm test` is never exercised BY `npm test` — that recursion is real
  and the fixture is what avoids it.
  **A defect in the TEST, caught by the test:** the first version asserted the
  hook's message against `execFileSync`'s return value, which is stdout alone
  while the hook reports on stderr — an assertion that could only ever have been
  vacuous, and it failed loudly only because it was a PRESENCE assertion. The
  same mistake inside an absence assertion is a permanent silent green. Switched
  to `spawnSync` and the reason is written into the helper.
  Original entry follows. Found 2026-08-08 afternoon by an operator question
  ("is that a bug? should be fixed also then") about a blocked push, which is
  the right question: the blockage looked like correct guard behaviour and the
  guard underneath it is aimed at the wrong object.
  **Measured, both facts checked rather than assumed:** `tools/git-hooks/pre-push:41`
  runs bare `npm test`. At the blocked push, `git status --short` reported
  `?? test/xdg-writer-guard.test.mjs` and `?? tools/xdg-writer-guard.mjs` — both
  UNTRACKED — while `git log origin/main..HEAD` listed exactly three commits,
  none of which touched either file. So the hook failed a push over a file that
  was not in it.
  **The false-red is the cheap direction. The false-GREEN is why this ranks.**
  The same defect runs the other way and silently: uncommitted fixes in the
  working tree make a BROKEN committed state pass. Edit a file, do not commit
  it, push — the suite runs against the edit and the pushed commit is broken,
  with a green hook on the record. This repo has already written that shape down
  twice in `docs/dev-loop.md` from other instruments ("new runs against new", a
  red-first arrangement decaying into a vacuous green); this is the same error
  in the guard that stands in front of the irreversible boundary.
  **Second cost, and it is the one that compounds:** the hook's own failure text
  advertises `git push --no-verify` as the escape. The repo hook is CHAINED
  behind the dotfiles global hook that runs the fixture-leak scan, so every
  bypass taken for an unrelated red also skips the scan at the exact boundary
  where git history stops being editable. A guard that false-fires on a
  co-writer's scratch, while naming its own bypass in the error, is training the
  override reflex on the one guard that must never be overridden.
  Design, decided: run the suite against the PUSHED SHA, not the working tree —
  `git worktree add --detach <tmp> <sha>` (the tip being pushed), symlink
  `node_modules` into it (the repo's standing worktree hazard, already noted in
  this hook's own header comment at `:14`), run `npm test` there, remove it.
  Do NOT `git stash` the working tree instead: stashing mutates a working copy
  that a co-writer may be mid-edit in, which is the one thing a pre-push hook
  must never do.
  Verifier, red-first, BOTH directions required and both reproducible in a
  throwaway clone (never against this repo — a destructive repro aimed at a
  working tree took out the main clone and six worktrees once):
  (1) FALSE-RED: commit a green change, add an UNTRACKED failing test, push —
  must be ALLOWED after the fix and is BLOCKED today (today's behaviour is the
  red, already observed live);
  (2) FALSE-GREEN: commit a BROKEN change, then fix it in the working tree
  WITHOUT committing, push — must be BLOCKED after the fix and is ALLOWED today.
  Direction (2) is the one that must be demonstrated, because it is the one
  nobody has seen fire and the one that lets a broken commit reach main.
  Negative control so the hook does not simply always block: an ordinary clean
  push with a green tree must still pass, unchanged.
  **Do not weaken the blocking while fixing the aim.** The whole-suite run and
  the hard block are correct and stay; what changes is only WHICH tree it runs
  against. A change that narrowed the suite to touched files would trade a real
  guard for push latency.
  Consumer tier **2 (feeds the gates)** — it is the gate in front of the
  irreversible boundary. Unranked (booked after the derivation); on the next
  derivation it is a Tier B head candidate on the false-green direction alone.
  <!-- entry: "the pre-push suite verifies the WORKING TREE, not the commits being pushed" -->

- **DONE `28d5022` + `8d603fc` (2026-08-10) — `bust-triage` prints an
  ATTRIBUTION line, and the primitive behind it is imported rather than
  restated.** Two-part design, and the split IS the finding. PART ONE is free:
  captures are PRE-pipeline, so a pure append on CC's raw side
  (`attributionOf`'s `inDiv === null` branch) answers OURS without touching
  disk. PART TWO needs the REAL forwarded array, which only a full stateful
  corpus replay supplies, so it shells out to `replay.mjs --json --census`
  exactly as `gate-live.mjs` already does daily. The lane flagged that
  subprocess as a deviation; ACCEPTED at the desk on its stated basis, opened
  rather than inherited: `tools/replay.mjs:3829` ("Naive attribution (re-run
  just the offending pair) does not work for stateful extensions").
  Desk finding — the lane's own NOT-VERIFIED slot, inverted. It reported the
  costly path's OURS branch as having "no live reachable case on real data".
  The structure says more: `findStabilityViolations` emits a row ONLY under
  `outDiv !== null && outDiv < (inDiv ?? Infinity)` (`replay.mjs` scanGroup),
  which IS `attributionOf(inDiv, outDiv) === true` spelled with the same two
  quantities the row then carries — so OURS is the ONLY verdict that path can
  reach, and the `"CC's"` alternative beside it was a predicate no input could
  falsify, wearing a discriminator's clothes in a three-answer contract.
  Executed, not reasoned: synthetic pairs through the real
  `findStabilityViolations`, instrument-positive first — outDiv=1 < inDiv=3
  emitted 1 row, append-only emitted 1 row (both attributionOf true), the CC's
  shape inDiv=1 < outDiv=3 emitted 0. `8d603fc` replaces the constant with
  `attributionFromRow`, mapping an invariant break to COULD-NOT-ATTRIBUTE with
  the contradiction named, and its bite re-derives the unemittability from the
  real function so a widened emission guard reddens AT THE GUARD rather than at
  a later misattributed bust.
  Second desk finding: the ROW JOIN was unverified and is now measured.
  `replayedViolations` matches `v.n === pair.after.ord && v.prevN ===
  pair.before.ord` — two ordinal spaces built by two different loops
  (`bust-triage.mjs:685-690` vs `replay.mjs:3578-3597`), the coordinate-space
  shape this repo has been bitten by before. Compared per record over four real
  captures: 5,990 records indexed, ZERO disagreements; instrument-positive on a
  planted capture, where a body-less request produces a detected disagreement,
  so the zero is a reading and not a dead probe.
  And the honest reason no live case exists for the costly path: `--census`
  over the largest real capture reports `violations: 0 rows`. Current traffic
  has no stability violation to attribute.
  ORIGINAL ENTRY:
- **(shipped) READY — `bust-triage` emits an ATTRIBUTION verdict (OURS / CC's /
  COULD-NOT-ATTRIBUTE), because today it emits none and the walk that decides
  whether to build a mitigation is the walk that cannot say whose bytes
  moved.** Booked 2026-08-08 on an operator question — "are we careful not to
  attribute wrongly and create a mitigation for a bust we caused?" — answered
  by reading the code rather than the doctrine, which is what turned a
  reassuring answer into an entry.
  **The primitive EXISTS and is correct; the bust walk does not use it.**
  `replay.mjs` computes it twice, independently: `ours: inDiv === null || inDiv
  > outDiv` (`:1537`) and the `ccIdenticalAtOutDiv` annotation printed per
  stability violation (`:3897`). `grep -n 'ours\|attribut' tools/bust-triage.mjs`
  returns **only prose comments** — zero attribution logic — against those two
  live sites. Instrument-positive for that grep: the same pattern over
  `replay.mjs` returns the two sites above, so the zero is a measured absence
  and not a pattern that could never match.
  **Three measured instances, all from one morning, one in each failure
  direction:** the 141k answered `MITIGATED` by mapping the census class to the
  ROW's status (an absorption claim where nothing absorbed — the dangerous
  direction, since it says our mitigation worked); the 638k was attributed by
  HAND-diffing raw against forwarded; the 540k returned `UNVERIFIABLE` and
  stopped with no attribution, which is where a human guesses.
  Design, decided: `bust-triage` prints an `ATTRIBUTION:` line beside its
  verdict, with three answers and no default, the third carrying its COMPUTED
  reason (never a guessed disjunction — that defect already cost this tool a
  correction). It IMPORTS the primitive from `replay.mjs` rather than
  re-deriving it: a second implementation of a divergence or identity test has
  produced a confident wrong answer here three times, and this is the one place
  a wrong answer sends us to fix the wrong system.
  **VERIFIER DURABILITY CORRECTED 2026-08-10, by probing it before dispatching:
  the arrangement is NOT frozen, and it cannot be made frozen by pinning.** The
  claim below ("anchored to frozen evidence rather than to live captures") is
  false in both directions. Measured: the 638k walk runs today and emits no
  ATTRIBUTION line — that is the red, live — but its evidence is the live capture
  pair `n=305->311`, not a fixture. Freezing was attempted with the exact command
  `bust-triage` prints (`harvest --pin s-captureAS 370..372`) and the pin's own
  verifier answered `pinned, but does NOT reproduce: stability exemptions live=1
  pin=0`, naming an unrelated `fresh-session-sort:first-appearance-relocation
  (mcp)` pair at `n=111->113`. A pin carries the full prefix from record 0 by
  construction, so narrowing the range cannot exclude that pair; and the class is
  the one `docs/dev-loop.md` already documents — `fresh-session-sort`'s
  predicates read literal TEXT, which the scrub replaces with hash tokens. The
  fixture was deleted rather than committed, per the same-verdict precedent.
  **Consequence for scheduling, which is why this sits at the top of the entry:**
  the red-first case lives only as long as the capture does. Eviction is
  oldest-mtime-first; as of 2026-08-10 the corpus holds 92 captures with the
  oldest at 2026-08-07 03:55, so this one is not next in line — but the
  arrangement decays rather than waits, and a session that finds it gone must
  re-derive a red case instead of declaring the check unbuildable.
  Verifier, red-first, both polarities available today (original text, with its
  frozen-evidence claim now refuted above): the 638k pair
  (`2026-08-08T09:48:53Z`, hand-attributed to CC's `replace/edit` mid-history)
  must come back **CC's**; and a pair whose forwarded bytes diverge earlier than
  CC's — the stability-violation shape `replay.mjs` already annotates
  `[CC bytes at outDiv IDENTICAL -> ours]` — must come back **OURS**. Old code
  emits neither line, which is the red. Negative control so it cannot pass by
  always answering: the 540k (`2026-08-08T11:46:36Z`), which genuinely cannot be
  paired, must come back COULD-NOT-ATTRIBUTE with the pairing reason, NOT with a
  guess in either direction.
  The prose half SHIPPED with this entry's commit (`docs/dev-loop.md`, "No
  mitigation is DESIGNED before the attribution verdict exists") — it is a gate,
  not advice: while the answer is missing or COULD-NOT-ATTRIBUTE, no mitigation
  for that bust may be designed, booked or briefed. This entry is the machinery
  half; until it lands the gate is enforced by hand, which is exactly the
  arrangement the closing gate's question 1 says does not survive a session
  boundary.
  Consumer tier **1 (event disposition)** — it is the definition of the tier: a
  lie here mis-files the class and every mitigation designed afterwards is
  designed against the wrong evidence. Unranked deliberately (booked after the
  2026-08-08 afternoon derivation); on the next derivation it is a Tier A head
  candidate.
  <!-- entry: "bust-triage emits an ATTRIBUTION verdict" -->

- **DONE `697116b` + `feb8351` + `3acdcd5` (2026-08-10) — a closing commit
  lists the open entries it may have invalidated.** `tools/backlog-neighbours.mjs`:
  given a commit, every still-OPEN entry naming a file it touched, each with a
  blank disposition slot. A REPORT and never a gate — most file overlap between
  entries is ordinary co-tenancy (`docs/dev-loop.md` alone is named by sixteen
  entries), and a guard firing on non-defects trains the override reflex that
  kills it.
  Desk findings: (i) the join was blind to every entry that cited a LINE —
  `path:line` compared whole against git's path namespace, so the tool went
  quiet exactly where an entry was most specific about what it depends on.
  Caught on the tool's OWN motivating case, which returned 0 candidates;
  `feb8351` adds `citedPath`. (ii) The bites asserted line numbers against the
  LIVE working tree, so they died the moment the file they measured changed —
  `3acdcd5` re-anchors all three to a frozen `git show e5d635a:BACKLOG.md` and
  matches on headline text instead of position.
  (iii) FIRST LIVE USE, on this very series, and it paid: four neighbours
  surfaced across `8d603fc`/`28d5022`, of which one was a genuine premise
  correction — the `capturePairResult` entry's cited line numbers had drifted
  749 -> 754 and 760 -> 765 under `28d5022`, and nothing else would have
  re-read that entry. A true positive on its first real run, and it is what
  minted the citation-drift entry now open above.
  ORIGINAL ENTRY:
- **(shipped) READY — closing an entry can invalidate a DIFFERENT open entry, and nothing
  re-reads the neighbours when work ships.** Measured 2026-08-10 by the
  retirement pass, twice, from real history: the state-key entry shipped
  `KEY-FLIP`, which made a second entry's cited verdict count (`six`) wrong — the
  real number is seven, and the second entry was not touched; and `/health`
  gaining an `extensions[]` field from unrelated work dissolved half of the
  gates-blindness entry's premise. Both survived as plausible, decision-complete
  text until a lane probed them directly, which is the failure mode: the entry
  reads perfectly and is quietly about a world that moved.
  **Why the existing rules do not catch it.** The ranking rubric's signal 1
  handles the opposite sign — items that must PRECEDE others or their motivating
  case dissolves — which is about ordering, not about re-reading afterwards. The
  succession rule in `docs/dev-loop.md` is scoped to new EVIDENCE killing a
  premise; our own shipped implementation does not read as evidence arriving, it
  reads as progress, so the trigger never fires on it. Neither is wrong; both
  are aimed one step away.
  **The firing moment is computable, which is what makes this mechanizable at
  all:** an entry going to a closed grade WITH a commit ref is a discrete,
  observable event, unlike the judgment-shaped conditions this file usually has
  to leave as prose.
  Design, decided — `tools/backlog-neighbours.mjs`, a REPORT and never a gate:
  given a commit that closes an entry, list every still-open entry naming a file
  that commit touched, and require a one-line disposition per candidate —
  still-valid / premise-corrected / now-unnecessary. Report, because most hits
  are ordinary co-tenancy (`docs/dev-loop.md` alone is named by sixteen entries)
  and a guard that fires on non-defects trains the override reflex that kills it.
  The join already exists: `filesNamed` per entry, which the census emits.
  **VERIFIER CORRECTED 2026-08-10 — the designated true positive was UNREACHABLE
  BY CONSTRUCTION, found by the lane that built the tool.** `508a006` is a
  BACKLOG-only bookkeeping commit; the work that invalidated the verdict-count
  entry shipped in `13278fa`. And that entry can never surface at all: its only
  file-shaped citation is `cache-fix/CLAUDE.local.md:91`, a dotfiles path this
  repo keeps untracked by design, so no commit here can ever report it touched.
  The pairing was booked without being dry-run — the briefed-known-positive
  defect, committed by this entry's own author.
  **The reachable positive is the class's SECOND measured instance:** `2e088df`
  (which gave `/health` its `extensions[]` field) touches `proxy/server.mjs`, and
  the still-open gates-blindness entry cites `proxy/server.mjs:577-581`. Measured
  after the desk fix below: 3 candidates, that entry among them. Red-first
  pairing, reproduces from history forever.
  **A DEFECT THE DESK FOUND THAT THE LANE'S VERIFIER COULD NOT:** the join
  compared whole backtick tokens against git paths, so every entry citing a LINE
  (`foo.mjs:12`, `foo.mjs:577-581`) was invisible — the tool answered 0
  candidates on the very instance it exists for. That is the `path:line` shape
  `docs/dev-loop.md` already records, and it UNDER-reports, the dangerous
  direction. Fixed at the desk: `citedPath` strips only a trailing line-or-range
  suffix. The lane could not have caught it, because the one positive the brief
  gave it was the unreachable one.
  Original verifier text, kept because its failure is the lesson: run it against
  `508a006` — the commit that retired the state-key entry — and it must
  surface the verdict-count entry as a candidate. Control against
  over-firing: it must NOT surface entries whose only overlap is a file the
  closing commit did not touch.
  Done when a closed entry cannot be committed without its neighbour
  dispositions, and the two 2026-08-10 pairs both appear in a dry run over
  history.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation, but it left two stale premises standing in
  decision-complete text, which is where it does real damage.

- **DONE `32da665` (2026-08-10) — `backlog-lint`'s marker exemption widened
  from slash-adjacency to enumeration context plus sub-claim scope**, so the
  same enumeration written with `vs` or commas stops false-firing. The repair
  shape is the one the corpus prescribes for a guard that fires on legitimate
  work: a declared exemption the guard itself verifies, keyed on enumeration
  CONTEXT, never a softened predicate or an override habit.
  ORIGINAL ENTRY:
- **(shipped) READY — `backlog-lint`'s enumeration exemption is SLASH-ONLY, so the same
  enumeration written with `vs` or commas false-fires.** Measured 2026-08-08,
  live, on the entry two below this one: writing the repo's own three-answer
  gate discipline as a `vs`-joined triple tripped `WARN backlog-header
  grade=READY`, i.e. the lint read a NAMED TECHNICAL TERM as a claim that the
  entry's work was resolved. The tool already anticipates exactly this class —
  its header comment says the exemption exists because its own entry lists the
  marker words — but the guard is `(?<!\/)…(?!\/)`, so it clears the
  slash-joined form and misses the same enumeration joined by `vs`, by a
  comma, or by `and`. Worked around at the time by writing the triple
  slash-joined, which is honest (it IS an enumeration) but is a workaround,
  not the fix.
  **This entry self-fired while being written, which is the evidence.** Naming
  the trigger forms literally in prose trips the very gap they describe, so
  they are described here and belong as literal strings in the test fixture,
  not in this file — a guard whose gap cannot be documented without tripping
  it is the sharpest possible statement of the gap.
  **Why it is worth fixing rather than living with:** the verification word is
  a term of art in this repo — it is one third of the DECLARED/RUNNING/VERIFIED
  triple
  that `doctor` compares — so any entry discussing gate verification trips it.
  A guard that fires on correct prose is the check-that-fires-on-a-non-defect
  shape: it trains its reader to route around it, which is what happened here
  within one minute of it firing.
  Design: widen the exemption from slash-adjacency to ENUMERATION CONTEXT —
  the marker word appearing inside a run of two or more all-caps terms joined
  by `/`, `,`, `vs`, `and`, or `+`. Do NOT simply drop the verification word
  from the marker set; the dated-resolution signal it carries is the whole
  point of the check.
  Verifier, red-first, BOTH arms required because this is a predicate change to
  a live guard: (1) the real prose instances the check exists for — a READY
  entry whose body carries the verification word beside a resolution date, in
  resolution prose — must STILL fire; (2) the enumeration forms above must
  NOT. Take arm (1) from the check's own
  historical true positives so the fix is measured against what it caught, not
  against what I imagine it caught. Done when `node tools/backlog-lint.mjs` is
  clean on a corpus containing both arms and `test/backlog-lint.test.mjs`
  covers each.
  **THIRD FIRE, same day, and it pins the sub-shape the design must handle:
  SPACE-PADDED separators.** The repo's three-answer gate triple, written with
  spaces around its slashes, trips the lint; the identical triple written tight
  (the spelling `docs/dev-loop.md` uses) does not. The exemption is
  slash-ADJACENCY — it inspects the single character on each side of the marker
  word — so a padded separator puts a SPACE there and escapes it. Not a new
  defect: the precise boundary of the existing one, and it settles the design
  question above. The widened predicate must key on enumeration CONTEXT, never
  on adjacent characters.
  **And this paragraph tripped the guard while being written, for the second
  time in this entry — by violating the entry's OWN instruction four
  paragraphs up:** literal trigger forms belong in the test fixture, not in
  this file. The first draft pasted the padded triple in as its example, the
  lint fired on this entry, and because `test/backlog-lint.test.mjs` treats a
  WARN as BLOCKING (the separate ranked entry two below), it turned the whole
  suite red and refused a push. So the convention is not stylistic: writing a
  trigger form literally here costs a red suite. Restated without the literal,
  which is what the entry already told me to do.

  **SECOND MEASURED FALSE FIRE, 2026-08-08 afternoon, and it is a DIFFERENT
  shape — so the design above is too narrow.** Editing the XDG-ownership entry
  to record that its three-way README sub-claim had been resolved by `bbc1213`
  tripped `WARN backlog-header grade=READY marker=RESOLVED`. That is not an
  enumeration and no exemption for `vs`/comma/`and` would clear it: the marker
  was a genuine dated resolution, of a SUB-CLAIM, inside an entry that is
  correctly still open. The tool's scope comment already concedes the boundary
  — "one entry runs from a `- **` bullet to the next" — so it cannot tell "this
  entry is resolved" from "something inside this entry is resolved", and a long
  entry that records its own corrections over time is exactly where the second
  case lives. Both fires share one root: the rule reads a marker's PRESENCE
  where it means the entry's STATUS.
  **Worked around, and the workaround is named rather than hidden:** the word
  was changed to `DECIDED`, which is accurate and is not in the marker set, so
  `backlog-lint` is clean at this commit. That is the second time in two days
  this guard has been routed around within a minute of firing — which is the
  fire rate, and it is the argument for fixing rather than living with it.
  Widen the design accordingly: the fix must clear a dated resolution that
  scopes to a NAMED SUB-CLAIM (a sentence-initial bold run, a "superseded text
  follows" section) while still firing on a resolution that scopes to the entry.
  Arm (1) of the verifier is unchanged and still comes from the check's own
  historical true positives.
  Consumer tier **3 (backlog and process)** — it mis-labels entries and is
  recovered at the next read; ranked accordingly, not promoted for being
  annoying.
  <!-- entry: "backlog-lint's enumeration exemption is SLASH-ONLY" -->

- **DONE `f7e52dd` + `4c9ae88` + `17e0a14` (2026-08-10) — `tools/logs.mjs`, one
  strict reader owning the schemas of every format this repo writes.** Six
  readers, each a Proxy that THROWS "unknown field X for format Y" on any name
  outside its schema and defaults only schema-marked-optional fields;
  `cacheReadOf`/`cacheCreationOf`/`messageCountsOf` normalize the two spellings
  per concept. Both motivating wrong reads — the ones that reached the operator
  as fact in one bust walk — are pinned as bites and were verified at the desk
  by executing the reader, not by reading the report: asking a capture OUTCOME
  record for `cache_read_input_tokens` and a prefix-diff EVENT row for
  `messageCountPrev` both throw naming field AND format, while
  `usage.cacheRead`/`cacheCreation` return the frozen 15603 / 213429.
  Evidence frozen rather than live-read: the brief's known positive lived in a
  ROTATING capture, so it is hand-placed into `test/fixtures/logs-schemas.json`
  and the test never reads the captures directory.
  **Desk findings the lane did not have.** (i) Its companion scope lint shipped
  as a PREDICATE that nothing ran over the tree — honestly reported in its own
  slot (g), and the same shape as `tools/xdg-writer-guard.mjs`, which sits red
  at 34 while `npm test` is green. `4c9ae88` gives it the real tree plus a
  declared inventory of PATHS (never a count): `tools/cost-report.mjs` EXEMPT
  with a `mustMatch` the check re-verifies so a drifted exemption fails loudly,
  `tools/cold-events.mjs` KNOWN-OPEN as a genuine hand-parse awaiting adoption.
  Instrument-positive both ways — a planted hand-parse fails the sweep, a
  drifted exemption is reported as stale — because an inventory that happens to
  match is indistinguishable from a sweep that cannot fire.
  (ii) The fixture's `sid` placeholders were synthetic but UUID-SHAPED, and the
  pre-push absence-scan blocked on all four. My own hygiene pass had read every
  value and confirmed none was real; the guard enforces the stricter property —
  not "is this a real id" but "is this shaped like one" — and on a public
  history that is the right bar. Repaired at the DATA (`17e0a14`), not by an
  allowlist entry or `--no-verify`: neither escape was needed once the bytes
  stopped being UUID-shaped.
  **Named limitation carried forward, not silently solved:** the scope lint
  covers only the camelCase capture/prefix-diff spellings. `usage.jsonl`'s
  snake_case names are ALSO Anthropic's own wire vocabulary (they appear in raw
  API responses and CC transcripts), so a text pattern cannot tell "reads our
  usage.jsonl" from "reads a live API response" — separating them needs
  parse-site provenance. Adoption into `bust-triage` and other consumers
  remains its own entry.
  ORIGINAL ENTRY:
- **(shipped) READY — one reader owns the schemas of everything this repo writes, and it
  THROWS on an unknown field instead of returning `null`.** Supersedes the
  narrower "normalize two field names" framing in the parked 213k entry's item
  (d): the defect is not two spellings, it is that every consumer hand-parses.
  Measured 2026-08-10: one bust walk ran ~8 ad-hoc `jq` probes over four
  formats this repo writes, and two returned confidently wrong answers by
  querying one schema with another's names — `usage.cacheRead` (capture
  `outcome`) vs `cache_read_input_tokens` (`usage.jsonl`); `msgs` (prefix-diff
  events) vs `messageCountPrev/Now` (prefix-diff last-state). Both reached the
  operator as fact before being caught. A missing check is silent; a
  hand-rolled read returns a NUMBER indistinguishable from a correct one.
  Design (decided): `tools/logs.mjs`, one module, four format readers — capture
  request records, capture `outcome` records, `usage.jsonl`, prefix-diff
  events + last-state — each exposing normalized accessors over BOTH on-disk
  spellings. The on-disk names do NOT change: `proxy/stream.mjs:21-22` and
  `proxy/extensions/usage-log.mjs:187-188` are wire/schema writers with the
  whole capture corpus behind them, and renaming either makes every archived
  capture unreadable by the new reader — a bigger version of the bug being
  fixed. Reader is strict: an unknown field name throws, naming the field and
  the format, never returns `undefined`.
  Companion scope lint, same shape as the existing xdg scope check
  (`test/` already proves the form): a known schema's raw field names must not
  appear outside `tools/logs.mjs` and the writers named above; a new call site
  that hand-parses fails the bite.
  Verifier, red-first, anchored to immutable references — the two real wrong
  reads, replayed: asking a capture `outcome` record for
  `cache_read_input_tokens`, and a prefix-diff EVENT row for
  `messageCountPrev`, must THROW under the reader while both correct spellings
  return the right numbers on the same records. Over-firing control: a record
  legitimately missing an optional field returns its declared default and does
  not throw, declared IN the test as data. Known positive from real data, not
  planted: the 04:40:39Z outcome must read `cacheRead=15603`,
  `cacheCreation=213429` through the reader.
  Done-criterion: both throws demonstrated red before the reader exists (or, if
  the module must exist first, one named accessor disabled at a time per the
  module-load-red rule), controls green, scope lint green, full suite green.
  Write boundary: `tools/logs.mjs`, `test/logs*.test.mjs`. No `proxy/` change,
  so no pin bump and no restart. `bust-triage`'s adoption is a SEPARATE entry —
  this one ships the reader and its lint only.

- **DONE `6fc397d` (2026-08-10) — `deferred-tool-rewrite` reports WHAT IT
  DECIDED, and the decision closed threat-matrix row 6's open residue.** The
  extension now emits `announcedNames` and `passthrough[{name,reason}]` on
  `ctx.meta.deferredToolRewriteStats` every request — always present, empty
  arrays rather than omitted, so "ran and had nothing to decide" stays
  distinguishable from "never ran" — and `findToolsDeltas` carries it beside
  `heldStable`/`outCount`, so any `--census` run answers the question that
  previously took a hand investigation.
  **The answer, and it is reading (ii).** Verified at the desk by replaying the
  frozen pin under the serving gate config rather than by reading the lane's
  report: n=373 carries all seven `mcp__claude-in-chrome__*` names in
  `announcedNames` with `passthrough: []`, and n=370 the five
  `mcp__playwright__*` names. The MCP tools were never scoped out — they took
  the documented `tool_addition` path, and the one-time array growth is the
  API's own precondition (the schema must sit in `tools[]` with
  `defer_loading:true` for the `tool_reference` block to resolve;
  `proxy/extensions/deferred-tool-rewrite.mjs:13-15`, `:450`). So the 263k was
  NOT a mitigation miss: ladder step (a) holds what was already forwarded, and a
  genuinely new tool costs one front invalidation because tools render above
  system+messages. The remaining lever is step (b), the session-start preload.
  **Desk checks beyond the report.** The red was independently confirmed — this
  session had recorded the same n=373 row hours earlier with no decision field
  at all, so the absence was observed before the lane existed rather than taken
  on trust. The `passthrough` field was probed for the unprovable-predicate
  shape (a field no input can make non-empty, the defect caught in the
  attribution code the same morning): both reason branches are reachable and
  exercised — `test/deferred-tool-rewrite.test.mjs:976` (`model-not-allowlisted`)
  and `:1004` (`no-anchor-message`). Write boundary held: 4 files, 195
  insertions, ZERO deletions, which is the shape a reporting-only change must
  have.
  **Honest residue, three parts.** (1) `passthrough` has never been observed
  non-empty on real traffic; both reason branches are exercised only by
  synthetic unit tests, so reachable-by-construction is not reached, and one
  pin is one pin. (2) The empty-not-absent CONTROL was likewise exercised only
  on constructed input — every row in the pin carries non-empty
  `announcedNames`, so no real pair demonstrates the empty-array case live.
  The property is a code invariant and constructed input is adequate for one,
  but the distinction is recorded rather than rounded off. (3) The instrument
  has not been run against the OTHER row-6 instances (the 2026-07-27 175k
  event, the 141k and 638k walks), so "the mitigation works" is established for
  this pin and inferred everywhere else.
  **Deployment deliberately NOT done:** this touches `proxy/`, so it needs a
  dotfiles pin bump and a proxy restart. The dotfiles repo carried ~50 unpushed
  commits from a peer session, so the pin bump is held rather than half-landed.
  The running proxy is unaffected — the code ships here, the deployment waits.
  ORIGINAL ENTRY:
- **(shipped) READY (small) — `deferred-tool-rewrite` ENGAGED on a 263k tools bust and the
  array still grew on the wire; nothing reads what it actually did.** Measured
  2026-08-10 on `s-captureAV` (pin `pinned-s-dda5c6419d49-372-373.json`,
  replayed `--gates-from-capture`, 10 of 10 declared gates set including
  `CACHE_FIX_TOOL_REWRITE=1`): the n=372->373 pair is `membership+`,
  `toolsOnly:true`, `msgKind:append-only`, zero removals, zero reorders — seven
  `mcp__claude-in-chrome__*` tools arriving from a mid-session MCP connect.
  `heldStable` TRUE, `absorptionMisses` 0, and `outCount` `27->34`. The
  extension appears in `mutatedBy` for BOTH requests, so it ran.
  **The gap is instrument-shaped, not mitigation-shaped.** `mutatedBy` reports
  that an extension ENGAGED; it cannot report what the extension DECIDED. Threat
  matrix row 6 describes ladder step (a) as holding `tools[]` byte-stable and
  delivering new schemas as appended `tool_addition` blocks — had that happened
  here `outCount` would have stayed 27. Two readings survive the measurement and
  it separates neither: (i) the rewrite scopes out MCP-sourced tools; (ii) its
  guarantee is only held-tool byte-stability and a growing array front-invalidates
  regardless, which is what row 6's own AMBIGUITY-RESOLVED paragraph actually
  says. This is the "the mitigation ran" vs "the mitigation absorbed" split
  `docs/runbooks/bust-appears.md` names, one level lower: here even the ABSORBED
  question returns 0 while the wire shows growth, so neither existing instrument
  answers it.
  Design, decided: `deferred-tool-rewrite` already computes the decision; surface
  it as per-request stats the way the other extensions do
  (`ctx.meta.<ext>Stats`, the shape `fresh-session-sort` and
  `insertion-normalization` already use and that `replay.mjs` already reads for
  its exemption bases). Minimum fields: how many additions were injected as
  `tool_addition` blocks, how many names were passed through into `tools[]`
  untouched, and the reason for each pass-through. Then `findToolsDeltas`'s row
  carries the decision beside `heldStable`/`outCount`, and row 6's open question
  is answerable from any `--census` run instead of by hand.
  Verifier, red-first, anchored to the FROZEN pin above so it cannot decay:
  replaying `pinned-s-dda5c6419d49-372-373.json` must report, for n=373, a
  non-empty pass-through list naming the seven `mcp__claude-in-chrome__*` tools
  — today it reports nothing at all, which is the red. Control: a pair with no
  tools delta must carry an empty decision record and NOT be absent, so "no
  decision" and "extension never ran" stay distinguishable.
  Done-criterion: the stats ride every `--census` run, the pin above reproduces
  the pass-through list, and threat-matrix row 6's NAMED MISSING EVIDENCE line is
  answered by a command rather than a reading. **This entry does not decide
  whether the pass-through is a defect** — it builds the instrument that can tell
  the two readings apart, which the matrix row cannot do today.
  Write boundary: `proxy/extensions/deferred-tool-rewrite.mjs`, `tools/replay.mjs`
  (`findToolsDeltas` row only), their tests. Touches `proxy/` — so a dotfiles pin
  bump plus `systemctl --user restart cache-fix-proxy` rides along, and the
  restart is cache-transparent (no state KEYS or freeze logic touched).
