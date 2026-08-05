# Reserved-entry identity — build report

Directive: `docs/directives/reserved-entry-identity-directive.md` (DESIGN
SETTLED 2026-07-31). Worktree: `.claude/worktrees/agent-a089a1e858aa10362`,
branched from `main` at 1c80f67. Four commits, unpushed; see (f).

**HEADLINE: built as designed, and the criterion is MET beyond what the
directive asked for.** Measured A/B between two detached worktrees differing
only by this diff, over the whole 8.5 GB live corpus under the serving gate
set: stability violations **10 → 2**, and the 2 that remain are attributed by
the gate itself to a DIFFERENT extension (`deferred-tool-rewrite`) and are
identical in both trees. **Zero insertion-normalization stability violations
remain anywhere.** The directive's named target, s-captureC, goes 2 → 0; so do
s-captureD, s-captureA and s-captureM, which the unit-2b build could not close
and which turn out to have been the same ordinal collision on three more
captures. Safety, conservation, sequence and canonical order are 0 everywhere
in both trees. Two of unit 2b's three TODO tests flip to passing unedited; the
third does not, and the reason is a contradiction inside the directive itself,
surfaced in (c) rather than papered over.

---

## (a) Items completed, with evidence

1. **Integration.** `aef760b` + `dc8c475` cherry-picked from
   `wt/fidelity/opus` and reconciled with 5c4d70a's reset-path duplicate
   suppression, squashed into one commit (`b70c88b`) preserving their author
   and their content attribution in the message. Reconciliation per the
   directive's integration plan step 1: both suppression kinds flow through
   the ONE `suppressions` array the gates read — `kind: "join-move"` keeps its
   slot, a plain duplicate is removed — mirroring what the success path
   already did. Baseline after reconciliation and before any new code: the
   three targeted files at 78 tests, 75 pass, 0 fail, 3 todo (the three known
   TODOs still todo), so the build did not start on a broken merge.

2. **Match exclusion** (`classifyPinned`'s match loop): an entry with
   `stored.rs` is neither looked up in `incomingByKey` nor added to
   `droppedNow`; it is collected into `reserved`. Non-`rs` entries keep
   absolute (h, r, o) matching byte-for-byte.

3. **The mint**: both canonical-rebuild sites file the absorbed entry at the
   merged message's slot as `{ ...priorCanonical[mv.ci], rs: true }`. P is
   matched normally and never flagged.

4. **The per-request disposition pass**, run once after the match loop and
   consumed by both rebuild sites: re-fire / reclaim / lapse in that order,
   over the neighbourhood `(lo, hi)` resolved exactly as `findJoinMoves`
   condition (d) resolves it. Unresolvable or crossed bounds → nothing at all,
   no substitution and no state change.

5. **Role constraint (f)** in `findJoinMoves` — merged wire message role
   `"system"` and absorbed entry stored role `"system"` — and the same
   constraint on both disposition probes. This closes the latent gap the
   unit-2b report surfaced at §c5.

6. **`rs` entries excluded from `canonOrderViolation`.** Not named in the
   directive and required by its own rule that the stored key is no longer
   load-bearing: the order check maps canonical entries to wire indices BY
   KEY, so leaving it in would resurrect exactly the collision the reservation
   removes. Bitten (M10).

7. **`tools/verdict-ab.mjs`** — the unit-2b A/B probe graduated to a committed
   tool, with two modes (independent chains; `--seed-from-a` for old-canon
   compatibility), all three committed fixture shapes read, conversation
   grouping by the extension's own `resolveInsertionSessionKey`, and exit 2
   COULD-NOT-VERIFY kept and demonstrated.

8. **Twelve new bites** in `test/insertion-join-move.test.mjs` section (e),
   expectations written from the directive before implementation.

Size: +136 non-comment lines in `proxy/extensions/insertion-normalization.mjs`
(+270 including the definition comments), inside the directive's 120–200 LOC
budget. No new abstraction, no new file beyond the assigned tool.

---

## (b) Checks RUN, with real output

### Red-first — the twelve bites against the reconciled tree, before the change

    not ok 25 - BITE — MINT: a recognized move files the absorbed entry with rs:true, and P is never flagged
    not ok 26 - BITE — MATCH EXCLUSION: one MORE copy of the reserved text does not re-bind it
    not ok 27 - BITE — RE-FIRE: the merged form still on the wire re-serves the stored bytes, declared
    not ok 28 - BITE — RECLAIM: CC flips back to the original form, so the entry rejoins wire identity
    not ok 30 - BITE — FAIL-CLOSED: an unresolvable neighbourhood changes nothing at all
    not ok 31 - BITE — role (f): a merged message in a non-system role is not a move
    not ok 32 - BITE — role (f): an absorbed entry whose stored role is not system is not a move
    not ok 33 - BITE — role (f): a non-system candidate inside the gap is neither a re-fire nor a reclaim
    not ok 34 - a reserved entry never reports as dropped, and never as a canonical-order violation

Two of the twelve were green before the change and had to be: the LAPSE bite
(nothing was reserved yet, so "not carried forward" held vacuously — it becomes
load-bearing after the change, and its mutation M5 proves it) and the
fires-on-a-non-defect guard.

### Mutation precision — ten mutations, each removing the condition its bite names

| mutation | bites that went red |
|---|---|
| M1 match exclusion removed | MATCH EXCLUSION (+ RECLAIM, FAIL-CLOSED, the dropped/canonOrder bite) |
| M2 mint drops `rs` | MINT (+ MATCH EXCLUSION, RE-FIRE, FAIL-CLOSED, dropped/canonOrder) |
| M3 re-fire disposition removed | RE-FIRE (+ the reset-leg fixture bites) |
| M4 reclaim disposition removed | RECLAIM (+ the real-flap bite) |
| M5 lapsed entry carried forward | LAPSE — and only LAPSE |
| M6 unresolvable bounds lapse instead of hold | FAIL-CLOSED — and only FAIL-CLOSED |
| M7 (f) merged-message role dropped | role (f), mint side |
| M8 (f) absorbed-entry role dropped | role (f), stored side |
| M9 (f) probe role dropped | role (f), probe side |
| M10 canonOrder reads the reserved key | the dropped/canonOrder bite (+ the reset-leg four-gate bite) |

**M4 initially bit NOTHING in the RECLAIM bite** — a finding about the check,
not the mutation. With the reclaim deleted, the entry lapses and the wire
message becomes a fresh entry carrying the same stored bytes at the same
canonical index: observationally identical in that construction. The bite now
asserts what actually separates them — a reclaimed message is a MATCHED entry,
so `inserted` counts only the tail turn and the request classifies
`append-only`, where a lapse would splice a new entry mid-history and classify
`normalized`. It bites M4 now.

### Verifier 1–2 — the bites and the three TODO tests

    node --test test/insertion-join-move.test.mjs test/insertion-normalization.test.mjs \
      test/insertion-merge-suppression.test.mjs test/insertion-suppression.test.mjs \
      test/insertion-suppression-on-reset.test.mjs test/replay-gate-selfcheck.test.mjs \
      test/replay-fidelity.test.mjs test/output-guard.test.mjs \
      test/proxy-restart-transparent.test.mjs test/proxy-microcompact-stability.test.mjs \
      test/proxy-pipeline.test.mjs test/replay-class-matrix.test.mjs

    # tests 253   # pass 250   # fail 0   # todo 3

TODO 16 ("the reset's canonical describes the wire it forwarded, so the NEXT
request still sees a move") and TODO 17 ("the real reset leg passes all five
gates") now report as PASSING todos, unedited. TODO 15 does not — see (c).

### Verifier 3 — s-captureC under `--gates-from-capture`, measured A/B

Two detached worktrees in the scratchpad, differing only by this diff; the
instrument (`tools/replay.mjs`) is byte-identical in both.

PRE (`b70c88b`, units 2+2b reconciled):

    cross-request byte-stability violations (self-inflicted busts): 2
      n=196->197 ts=2026-07-29T14:51:30.647Z inDiv=233 outDiv=225 [CC bytes at outDiv IDENTICAL -> ours] <- insertion-normalization (outDiv=223)
      n=399->400 ts=2026-07-29T16:10:08.266Z inDiv=346 outDiv=333 [CC bytes at outDiv IDENTICAL -> ours] <- insertion-normalization (outDiv=331)
    canonical order violations: 0   safety: 0   conservation: 0   sequence: 0

POST (`71a482e`):

    cross-request byte-stability violations (self-inflicted busts): 0
    stability exemptions (telemetry-backed, not counted as violations): 0
    canonical order violations (state model vs wire): 0
    safety violations (conversation corrupted): 0
    content-conservation violations: 0
    sequence violations (normalize then reset): 0

**2 → 0, both measured pairs, and nothing else moved on that capture.**

### Verifier 4 — old-canon compatibility, `tools/verdict-ab.mjs --seed-from-a`

Tree B is fed, at every request, the canonical tree A wrote for the preceding
one — i.e. exactly the restart case: rs-free state on disk, new code taking the
next decision.

    A: b70c88b   B: 71a482e   mode: seed-from-A (old-canon compatibility)
      skipped growth-s-captureO-toolsBytes-2026-07-30.json: no request carries a messages array
      skipped growth-s-captureA-toolsBytes-2026-07-30.json: no request carries a messages array
      skipped oscillation-s-captureA-863.json: no request carries a messages array
      flap-s-captureB-86: 4 request(s), 1 conversation(s)
      harvested-append-after-change-s-captureH-323: 2 request(s), 1 conversation(s)
      harvested-replace-edit-s-captureE-20: 2 request(s), 1 conversation(s)
      harvested-splice-insert-mid-s-captureE-19: 2 request(s), 1 conversation(s)
      pinned-s-captureA-26-28: 29 request(s), 6 conversation(s)
      reset-move-s-captureC-196-197: 5 request(s), 1 conversation(s)
    IDENTICAL across 44 verdict lines, 6 corpora
    exit=0

This is the directive's row-3 restart declaration, measured rather than argued.

The steady-state A/B (independent chains) shows the change and only the change:

    DIFFERS on 2 of 44 verdict lines:
      - A reset-move-s-captureC-196-197 n=197 action=reset reset=not-subsequence pinned=1 suppressed=0 moved=0 dropped=0 out=237
      + B reset-move-s-captureC-196-197 n=197 action=normalized reset=-               pinned=1 suppressed=1 moved=1 dropped=3 out=237
      - A reset-move-s-captureC-196-197 n=198 action=normalized reset=- pinned=1 suppressed=0 moved=0 dropped=4 out=239
      + B reset-move-s-captureC-196-197 n=198 action=normalized reset=- pinned=1 suppressed=1 moved=1 dropped=4 out=239

The whole `rs` lifecycle on real (harvested, sanitized) capture bytes,
`--verbose`, five requests of one conversation:

      A n=187 reset/no-prior-canonical  moved=0        B n=187 reset/no-prior-canonical  moved=0
      A n=195 normalized moved=1 dropped=6             B n=195 normalized moved=1 dropped=6   <- MINT
      A n=196 normalized moved=1 dropped=1             B n=196 normalized moved=1 dropped=1   <- re-fire (A: fresh recognition)
      A n=197 reset/not-subsequence moved=0 dropped=0  B n=197 normalized moved=1 dropped=3   <- THE FIX
      A n=198 normalized moved=0 dropped=4             B n=198 normalized moved=1 dropped=4   <- re-fire

In A the substitution dies at n=197 and never comes back — the forwarded bytes
at the merged slot flip to CC's raw merge and stay there. In B it survives,
because the entry stopped claiming an ordinal in an array it is not in.

Worth reading: the **flap corpus is unchanged**, and its n=105 leg is the
RECLAIM path on real bytes — CC flips back to the inline form and the entry
rejoins wire identity with an identical verdict line. The reclaim is exercised
on measured traffic, not only synthetically.

The instrument's own COULD-NOT-VERIFY answer, demonstrated red against an empty
fixture directory rather than asserted:

    mode: independent chains
    COULD NOT VERIFY — no fixture yielded a replayable request
    exit=2

### Verifier 5 — five-gate sweep, whole live corpus, SERVING gate set

`tools/gate-live.mjs`, run from each detached worktree with `--status`
redirected into the scratchpad so the operator's
`~/.claude/cache-fix-gate-status.json` keeps describing the SERVING code
(mtime confirms it untouched). Gate set resolved from the running unit and
printed by the tool itself:

    CACHE_FIX_FORWARD_PROXY=on CACHE_FIX_PREFIXDIFF=1
    CACHE_FIX_INSERTION_NORMALIZE=1 CACHE_FIX_VOLATILE_PIN=1
    CACHE_FIX_TOOL_REWRITE=1 CACHE_FIX_UPSTREAM_DETECTION=1
    CACHE_FIX_UPSTREAM_ERROR_LOG=on CACHE_FIX_CAPTURE_MAX_MB=8192
    CACHE_FIX_OUTPUT_GUARD=1

    PRE  (b70c88b):  33 capture(s), 8600 MB, 5 failing
    POST (71a482e):  36 capture(s), 8521 MB, 1 failing

Per capture, and ATTRIBUTED rather than promised. Every capture not listed
reads 0 on all five gates in both trees:

| capture | PRE stability | POST stability | requests (PRE = POST) |
|---|---|---|---|
| s-captureC | 2 | **0** | 769 |
| s-captureD | 2 | **0** | 2073 |
| s-captureA | 2 | **0** | 2630 |
| s-captureM | 1 | **0** | 209 |
| s-captureB | 3 | **2** | 1058 |
| corpus total | **10** | **2** | |

**Safety, conservation, sequence and canonical order are 0 on every capture in
BOTH trees** — 8.5 GB, ~10 000 requests. Stability goes 10 → 2.

The directive asked specifically for s-captureA and s-captureD to be measured
and attributed per pair: both are at **zero**, so there is no pair left to
attribute on either. That is a stronger result than unit 2b reached (it left
s-captureA at 2 and s-captureD at 2) and it closes the family the unit-2b
report could not: the same ordinal collision was producing violations on three
captures, not one.

The 2 that remain are both on **s-captureB**, whose PRE count was 3 — so this
build closed one there too. Their attribution is below rather than asserted.

Two honesty notes about the sweep as an A/B. First, the capture COUNT differs
(33 vs 36): three tiny captures (2, 13 and 1 requests) were present only for
the POST run, all clean, none in the failing set. Second, several captures are
live and still growing, so a naive A/B across two sequential 8 GB sweeps is
confounded in principle — but the per-capture REQUEST COUNTS are identical for
every capture in the table above, so for the captures the comparison is about,
both trees replayed exactly the same input.

Attribution of s-captureB's violations, from the gate's own attribution line
(the line exists precisely so this is not hand-derived — dev-loop, "rule out
the instrument", step 3):

    PRE (b70c88b), 3 violations
      n=112->113 inDiv=108 outDiv=90  [CC bytes at outDiv IDENTICAL -> ours] <- insertion-normalization (outDiv=89)
      n=709->710 inDiv=376 outDiv=236 [CC bytes at outDiv IDENTICAL -> ours] <- deferred-tool-rewrite (outDiv=236)
      n=701->718 inDiv=365 outDiv=82  [CC bytes at outDiv IDENTICAL -> ours] <- deferred-tool-rewrite (outDiv=82)

    POST (71a482e), 2 violations
      n=709->710 inDiv=376 outDiv=236 [CC bytes at outDiv IDENTICAL -> ours] <- deferred-tool-rewrite (outDiv=236)
      n=701->718 inDiv=365 outDiv=82  [CC bytes at outDiv IDENTICAL -> ours] <- deferred-tool-rewrite (outDiv=82)

The insertion-normalization pair is cured; the two survivors belong to a
DIFFERENT extension, `deferred-tool-rewrite`, and are byte-for-byte the same
two pairs in both trees. Combined with the table above, the sweep's verdict is
exact and needs no hedging:

> **Across 8.5 GB of live capture, ~10 000 requests, under the serving gate
> set: ZERO insertion-normalization stability violations remain. Safety,
> conservation, sequence and canonical order are 0 everywhere in both trees.
> The only stability violations left in the whole corpus are two
> deferred-tool-rewrite pairs on one capture, present identically before this
> change.**

Those two are pre-existing and out of scope here — the unit-2b report named
them at its (g) as unattributed-to-2b and worth a separate look; that is still
true, and they now stand alone as the corpus's entire remaining stability
debt.

### Verifier 6 — suite, census, bust-triage

Full suite with the two port-bound files excluded (`proxy-integration`,
`proxy-wrapper`; CLAUDE.local.md — they hang while the production proxy holds
the port):

    # tests 1826   # pass 1823   # fail 0   # cancelled 0   # skipped 0   # todo 3

The only non-passing item in the whole suite is TODO 15.

`bust-triage` on the historical 14:32:29 event, re-run under this tree:

    bust-triage — 2026-07-31 14:32:29  142k re-written  session 7749d7fc
      OK    transcript  messages_changed / 117568
      OK    reconcile   ledger and transcript agree
      OK    capture     2026-07-31T14:28:01.815Z -> 2026-07-31T14:31:32.942Z, n=85->85
      OK    census      replace/edit
      OK    migration   row-4 container migration at host 58 (EXTENDED)
      VERDICT: KNOWN-OPEN — matrix row 4

Unchanged by this build and correctly so: that bust is the row-4 container
migration (EXTENDED), a different class with its own open item. The verdict
line is recorded here so the next reader does not re-derive it.

Census sweep over s-captureC under `--gates-from-capture`, both trees, so the
census's own counters are A/B'd rather than reported one-sided:

    PRE  (b70c88b)   cross-request byte-stability violations: 2
                     replace/edit positions: 90 total, 45 TAIL, 45 MID-HISTORY
                     mitigation: 1/5 mitigable events absorbed (20%)

    POST (a6ccc2d)   cross-request byte-stability violations: 0
                     replace/edit positions: 90 total, 45 TAIL, 45 MID-HISTORY
                     mitigation: 1/5 mitigable events absorbed (20%)

Everything the census counts about CC's INPUT is identical, as it must be — the
census is a lens on the traffic, not on us — and the one counter that is about
us, stability, goes to zero. The `mitigation: 1/5` line is unchanged and
unrelated: it counts `splice/insert-mid` events (four `append-only`
pass-throughs, ~0.2 MB), which is the pre-existing `MITIGABLE` scoping problem
the unit-2b report raised at its §c2 — a flap pair classifies `replace/edit`
and never enters that counter at all. Not this build's to fix; still its own
backlog item.

---

## (c) Gaps surfaced — for a tier above this one

1. **The directive contradicts itself about n=197, and the contradiction is
   load-bearing for integration-plan step 3.** Verifier 1 says "n=197 must not
   reset and must re-serve". Integration step 3 says the three TODO tests
   "must flip to passing WITHOUT edits to their expectations". TODO 15's
   control assertion is `at(197).action === "reset"` with
   `resetReason === "not-subsequence"`. Both cannot hold: with the re-bind
   removed there is no inversion at n=197, so it classifies `normalized`
   (measured, verdict-ab line above). Verifier 1's reading is the one the
   design implies and the one the mechanism delivers — the unit-2b report
   itself called the reset "the SYMPTOM". **I did not edit the expectation**;
   TODO 15 stays red-as-todo and announces itself. The criterion it carries
   (stability quiet on the reset leg) is asserted directly by TODO 17, which
   passes. The decision — rewrite TODO 15's control to assert `normalized`,
   or delete it as subsumed by TODO 17 — is a directive-level call, not mine.

2. **"Lapse" has two readings in the directive and I picked one.** The text is
   "the entry is simply not carried into the rebuilt canonical (today's drop
   semantics)". The clause and the parenthetical point in different
   directions: today's drop semantics on the success path is `d: true` plus
   trailing, which is NOT "not carried". I took the explicit clause — a lapsed
   entry is dropped outright — because it is what makes the lifecycle
   self-limiting, and because a `d`-marked entry keeps a stale key in the file
   forever for no reader. Bitten by M5. If the parenthetical was the intent,
   this is a one-line change plus a bite edit.

3. **`heldCi` (unresolvable neighbourhood) can persist indefinitely.** The
   fail-closed rule is "no state change", so a reserved entry whose bounds
   never resolve is carried forward unchanged on every success-path request,
   forever, doing nothing. Bounded in practice (~1–2 reserved entries per
   conversation, measured) and it costs one canonical entry, but there is no
   retirement rule for it and the directive names none. On the RESET path I
   made the opposite choice — a held entry is not carried, because that path
   already discards everything not on the wire — so a reset does retire it.
   Both choices are stated in the code comments; neither is measured.

4. **Does the join-move re-serve owe `tools/reminder-migration-census.mjs`?**
   dev-loop calls that the byte-match gate "every NORMALIZATION design must
   pass before it ships", and a re-serve does substitute our stored bytes for
   CC's current form. The directive's verifier list does not include it, and
   the conservation gate enforces the per-request byte accounting for exactly
   this substitution — so I did not run it and did not treat it as a
   precondition. If the answer is that it IS owed, that is a pre-restart step
   this build has not taken.

5. **`tools/verdict-ab.mjs` has no committed self-test.** Its COULD-NOT-VERIFY
   path was demonstrated red by execution (output above) and its reader was
   corrected after a real miss (see (e)), but nothing in `test/` pins either.
   A self-test needs a new test file, which the write boundary excluded.

6. **`dropped-majority`'s precedence relative to move recognition** — named
   unmeasured by the flap directive and by the unit-2b report, still
   unmeasured. The disposition pass runs before it and would apply on that
   path too; no corpus instance exercises it.

---

## (d) Deviations, with reason

1. **The cherry-picks landed as ONE squashed commit** rather than two, per the
   brief's "one commit for the reconciled cherry-picks". Original author and
   both original commit subjects and rationales are preserved in the message.

2. **`tools/replay.mjs` is touched**, which the write boundary excluded. It is
   not new authorship: `aef760b` carries a 28-line change to it
   (`wireRemovedIndices`, and `adjustedInHash` switched to it) without which
   a join-move substitution reads to the gates as a removal and manufactures
   an off-by-one on every subsequent message. The brief ordered that commit
   cherry-picked; the file rode along. Not modified by me beyond that.

3. **`moved` now counts re-fires as well as `findJoinMoves` recognitions.**
   Required, not cosmetic: reservation takes the entry out of `droppedNow`, so
   recognition fires exactly once per move and every later request is a
   re-fire. Counting only recognitions would report the substitution as having
   stopped on precisely the requests where it is working — and TODO 16, which
   the directive requires to pass unedited, asserts `moved === 1` on a
   post-reset request.

4. **`rs` entries are excluded from `canonOrderViolation`** (item a6). Not in
   the directive's design section; implied by its own statement that the
   stored key is no longer load-bearing.

5. **Two guard bites were green before the change** (LAPSE, and the
   no-move-at-all guard). Stated rather than quietly counted as red-first:
   they assert that today's behaviour is unchanged, which is what a guard must
   do, and their mutations are what make them load-bearing.

---

## (e) Candidate lessons

1. **A mutation that leaves its own bite green is a finding about the bite.**
   M4 (delete the reclaim) left the RECLAIM bite passing because a lapse
   followed by a fresh entry with the same stored bytes was observationally
   identical in that construction. Writing down what the DEFINITION says
   separates the two — "binds as an ordinary matched entry", therefore not an
   insertion — produced the assertion that bites. Same shape as unit 2b's M4
   and M6, one build later.

2. **A fixture reader silently narrows the corpus it reads.** The first draft
   of `verdict-ab`'s loader handled one of the three committed fixture shapes
   and would have printed "IDENTICAL across 9 verdict lines" as a clean A/B
   over the whole corpus — a pass-shaped absence covering four fifths of it,
   including the 29-request pinned fixture that carries six conversations. The
   fix is not care; it is that the reader NAMES every file it skipped, so the
   narrowing is visible in the output.

3. **A settled design's own verifier list can contradict its integration
   plan.** Both clauses here were written in the same pass, minutes apart, and
   only execution surfaced that they disagree about whether n=197 resets. The
   tell was available at design time: one clause describes the mechanism, the
   other describes a test written before the mechanism existed.

4. **When a symptom is correctly identified as a symptom, the tests written
   against it encode the symptom.** The unit-2b report said in so many words
   that the not-subsequence reset was the symptom, not the cause — and the
   TODO test written in the same commit asserts the reset as a control. A test
   whose control asserts the defect's signature expires when the defect does.

---

## (f) Files touched + commits (unpushed)

| commit | what |
|---|---|
| `b70c88b` | cherry-picks aef760b + dc8c475, reconciled with 5c4d70a — `proxy/extensions/insertion-normalization.mjs`, `test/insertion-join-move.test.mjs`, `test/fixtures/harvested/reset-move-s-captureC-196-197.json` (new), `tools/replay.mjs` |
| `71a482e` | the build — `proxy/extensions/insertion-normalization.mjs` (+270 −20), `test/insertion-join-move.test.mjs` (+224) |
| `1493892` | `tools/verdict-ab.mjs` (new) |
| `a6ccc2d` | self-caught O(n²) on the reset path's reclaim lookup — a map, not a `matched.find` per kept entry. Proven decision-neutral by `verdict-ab 71a482e a6ccc2d` (IDENTICAL, 44 lines) and all ten mutations re-run |

Plus this report and the directive's Status line. Staged with targeted
`git add`, never `-A`. Trailer `Co-Authored-By: Claude Opus 5` on every commit
authored here. Nothing pushed. Nothing under `~/.claude` written — the
gate-live status file went to the scratchpad
(`gate-status-opus-reserved-identity.json`) precisely so the operator's
`~/.claude/cache-fix-gate-status.json` keeps describing the SERVING code.

---

## (g) What was NOT verified

- **Nothing was deployed.** No dotfiles pin bump, no proxy restart, no gate
  stamp. The directive ships this at the deferred restart boundary, after all
  proxy work.
- **`proxy-integration` and `proxy-wrapper`** — excluded, as on this machine
  they hang against the production port.
- **The reclaim path on the s-captureC capture specifically.** It is exercised
  by the flap fixture's real bytes and by the synthetic bites; which requests
  of the live captures take it was not traced.
- **Which requests of s-captureD, s-captureA and s-captureM were cured.** The
  counts go 2/2/1 → 0/0/0 and the two trees differ by nothing else, so the
  delta is attributable to this diff; the individual pairs were not traced to
  their per-request telemetry the way s-captureC's and s-captureB's were. That
  three otherwise-unrelated captures cleared at once is itself evidence the
  cured mechanism is the ordinal collision and not something capture-specific,
  but it is inference, not measurement.
- **`heldCi` on real traffic.** No corpus instance produced an unresolvable
  neighbourhood for a reserved entry; the fail-closed branch is proven
  synthetically only.
- **Any conversation with more than one reserved entry at a time.** The
  disposition pass handles a list and guards against two entries claiming one
  wire index, but every measured instance has exactly one.
- **`reminder-migration-census`** — not run; see (c4) for why that is a
  question rather than an omission.

---

## (h) Sources actually read, of those the brief named

- `docs/directives/reserved-entry-identity-directive.md` — in full.
- `docs/audits/unit-2b-closing-report-2026-07-30.md` — in full, including
  § "Why the criterion is not met" and the A/B instrument's lessons.
- `docs/directives/flap-move-mitigation-and-fidelity-gate.md` — in full,
  including both Status sections and the corrected done-criterion.
- `docs/dev-loop.md` — in full, including "Adding a check", "A checker has
  THREE answers", "Never hand-roll identity in a probe", and the closing gate.
- `CLAUDE.md` and `CLAUDE.local.md` at the repo root.
- `proxy/extensions/insertion-normalization.mjs` and
  `test/insertion-join-move.test.mjs` on this branch, after the integration.
- Additionally, load-bearing but not named in the brief: `tools/replay.mjs`
  (`wireRemovedIndices`, `suppressedIndices`, `conversationOf`, the gate
  entry points), `tools/gate-live.mjs`, `tools/bust-triage.mjs`,
  `tools/harvest.mjs` (`readPinnedFixture`), and the commit messages of
  `aef760b` / `dc8c475` including the KNOWN DEFECT note.

---

## Closing gate (dev-loop, four questions)

1. **Mechanized?** Yes, twice. The identity rule is code with ten mutations
   behind it, and the hand-run A/B that the unit-2b build did with a throwaway
   script is now `tools/verdict-ab.mjs` — including its `--seed-from-a` mode,
   which converts the row-3 restart-transparency argument into a measurement.
2. **Evidence harvestable?** Already harvested: the whole regression rests on
   `reset-move-s-captureC-196-197.json`, committed, with the mechanism frozen
   in its `_mechanism` note. Nothing here depends on a capture surviving.
3. **Census class?** No new class. The `rs` lifecycle is state, not a traffic
   shape, and the traffic shape it serves (the cross-message join) already has
   its census treatment. The unresolved census question is the pre-existing
   one the unit-2b report raised — that a flap pair classifies `replace/edit`
   and so never enters the `mitigated` counter — which is its own backlog item
   and is not touched here.
4. **Instruments rode along?** Yes. `verdict-ab` is the new instrument;
   `replay.mjs`'s `wireRemovedIndices` (from the cherry-pick) is what keeps
   the gates able to read a substitution as a substitution; and the new
   `rs` field is inert to every existing gate by construction — measured, via
   verifier 4, not assumed.
