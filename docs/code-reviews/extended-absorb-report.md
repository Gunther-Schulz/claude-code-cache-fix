# Closing report — EXTENDED-class absorb (matrix row 4 residual)

Dispatch: `docs/directives/extended-class-absorb-directive.md` (executor
opus-5, dispatcher fable session adf6cadb, 2026-07-31).
Verdict: **the design was not built — it is refuted by measurement and
duplicates work already in flight.** One in-scope defect found on the way
was fixed and shipped.

---

## (a) Items completed, with evidence

1. **Grounding read, then checked against the bytes** — and the bytes
   contradicted the grounding (§b1).
2. **NOT BUILT: the EXTENDED absorb as specified.** Refusal grounds in §c1
   and §c2; this is the item the dispatch existed for, so it is the
   headline, not a footnote.
3. **SHIPPED: the reset path declares its suppressions.**
   `proxy/extensions/insertion-normalization.mjs` — `resetKeepingPins` now
   returns `suppressions: [{index, hash}]` beside the count it already
   returned. Red-first, measured effect in §b3.
4. **SHIPPED: `test/extended-absorb.test.mjs`** — four tests: the class's
   true shape (definitional, from the corrected grounding), the
   declaration defect (red-first), the count-vs-declaration invariant on
   BOTH paths, and a pin on the class's still-OPEN state.
5. **Recorded** in `BACKLOG.md` (the EXTENDED item's resolution lines),
   `docs/directives/robustness-threat-matrix.md` (row 4 datapoint), and
   the directive's status line.

## (b) Checks RUN, with real output

### b1 — what the EXTENDED class actually is

Motivating pair located by `conversationOf` (imported from the census,
never by capture adjacency): capture `s-captureF`, conversation
`e7394e052ea78bbc`, capture request indices **100 -> 101**
(`11:40:45.196Z` -> `11:41:05.778Z`, 130 -> 124 messages).

    before[99]   user    tool_result + ONE <system-reminder> block (330ch)
    before[100]  system  standalone harness nudge (421ch)
    after[101]   system  ONE message, 716ch  =  293 + "\n\n" + 421

293ch is the wrapper-stripped reminder from `before[99]`; the 421ch tail
is `before[100]` **verbatim**. The census's EXTENDED verdict
(`actual.startsWith(recon)`) is true, but its header's reading of it —
"new reminder text that did not exist at the earlier request ... NOT
absorbable by any normalization" — is not. CC **merged an existing
standalone message into the migrated reminder**.

Asked of every EXTENDED occurrence in the readable corpus (probe reusing
the census's own `census()` / `conversationOf()` / `textOf()`), because
n=1 is not proven:

    MERGED-STANDALONE 2026-07-28T13:19:14.503Z host=30  recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-31T11:41:05.778Z host=99  recon=293ch actual=716ch  extra=421ch
    MERGED-STANDALONE 2026-07-31T12:50:25.347Z host=190 recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-31T11:27:46.691Z host=40  recon=700ch actual=1032ch extra=330ch
    MERGED-STANDALONE 2026-07-31T11:58:26.984Z host=114 recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-29T14:49:57.339Z host=222 recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-29T14:50:08.424Z host=222 recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-29T14:50:58.716Z host=222 recon=627ch actual=1050ch extra=421ch
    MERGED-STANDALONE 2026-07-29T15:45:02.462Z host=330 recon=627ch actual=1050ch extra=421ch

    EXTENDED occurrences classified: 9 merged-standalone, 0 genuinely new text

Four sessions, four dates. The two remainder texts are the "task tools
haven't been used recently" nudge (421ch) and the "user sent a new
message while you were working" note (330ch) — both messages CC emits
standalone in its own right.

### b2 — placement, measured on the real pipeline

The conversation replayed from its FIRST request (74 requests) through
the real pipeline — same loader, same `extensions.json`, serving gate set
read from `cache-fix-proxy.service` (`INSERTION_NORMALIZE`,
`VOLATILE_PIN`, `TOOL_REWRITE`, `PREFIXDIFF`, `UPSTREAM_DETECTION`,
`OUTPUT_GUARD`). Instrument check first: the probe's baseline reproduces
`replay.mjs`'s and `prefix-diff`'s number (100) before any simulated
placement is trusted.

    pair: n=72 (11:40:45.196Z) -> n=73 (11:41:05.778Z)
    forwarded lengths: 131 -> 124
    BASELINE first forwarded divergence: 100
    merged standalone at forwarded[100] (716ch)
      swallows a 421ch standalone the predecessor forwarded
      prefix (migrated reminder) = 293ch
    design-A (delta at frozen TAIL):                 first divergence = 100
    design-B (un-merge, restore at canonical index): first divergence = 123

Forwarded array length 124, so 123 is its last index: design-B leaves the
entire mid-history region byte-stable and clears the directive's
done-criterion (>=122). Design-A — the dispatched design — moves nothing.

### b3 — the defect that WAS in scope, red-first

Replaying the same conversation with the serving gates, **before** the
fix:

    safety violations (conversation corrupted): 1
      n=73 length: 124 -> 123
    content-conservation violations: 1
      n=73 lost: in[98] (system): 1 of 1 unit(s) present in CC's request
                 and in no forwarded message
    insertion telemetry n=73: suppressed: 1, suppressions: []

Both reds are false. The suppression at `in[98]` is the designed
migrated-duplicate suppression working correctly; `replay.mjs` exempts it
by reading `stats.suppressions` (safety filters those input indices
before comparing lengths; conservation accepts a missing unit only when
it is "part of a DECLARED suppression ... never a re-derived 'looks
dropped' guess"). `resetKeepingPins` counted its suppressions and never
declared them, so both gates were blind on that path — and resets are
~1 request in 3 by this extension's own measurement. It also cost the
per-suppression event lines in the telemetry log, which is the record
dev-loop's "rule out ourselves" sweep reads (the log that tied three live
400s to our own suppression).

Introduced by 059aae3 (2026-07-31 13:35Z), which is AFTER the day's live
sweep (`cache-fix-gate-status.json`, started 07:52Z) — so no gate run has
ever exercised the reset-path suppression, and the next daily sweep would
have gone red on a designed behaviour. `test/insertion-suppression-on-reset.test.mjs`
asserts the COUNT — same parentage as the code, so it pinned the gap in
place rather than catching it; the new test takes its expectation from
the CONSUMER (`replay.mjs`'s two gates), which is what made it visible.

New tests red before the fix, green after:

    ✔ the EXTENDED delta is a message the PREDECESSOR already carried, not new text
    ✖ a suppression on the RESET path is DECLARED, not only counted
    ✖ count and declaration can never disagree, on either path
    ✔ the merged standalone is NOT suppressed today — the class is still open

After the fix, same replay, same gates: **safety 0, conservation 0**,
first forwarded divergence unchanged at 100 (the fix touches telemetry,
never wire bytes — asserted by that number not moving). Full insertion
suite: 77 tests, 0 failures.

### b4 — census byte-gate over the corpus

`node tools/reminder-migration-census.mjs ~/.claude/cache-fix-captures/*.jsonl`
— **0 MISMATCH** (15 EXACT / 9 EXTENDED / 1 DROPPED, 3311
same-conversation pairs), exit 0. No hole introduced; nothing could have
been, since no wire bytes changed. But see §c4 — that verdict covers 21%
of the corpus by bytes and does not say so.

### b5 — `npm test` and the live gate sweep

`npm test`: **1783 tests, 0 fail**, exit 0 (16.7 s; no hang on the
production port).

`node tools/gate-live.mjs --status <scratchpad>` (gate set resolved from
`cache-fix-proxy.service`, one child per capture under the 2 GB heap cap):

    39 capture(s), 8366 MB, 1 failing
    s-captureB-…: stability=2 safety=0 conservation=0 sequence=0 order=0
    every other capture: clean   (s-captureF, the motivating one: clean)

Exit 1, and **the exit is pre-existing**: the last live sweep before this
dispatch (`~/.claude/cache-fix-gate-status.json`, 07:52Z, 33 captures,
7.2 GB) reports `ok: false` with the same single failing capture and the
same `stability: 2`. So the directive's verifier 4 ("gate-live exits 0")
was already unmeetable on arrival — worth naming, since a verifier that
cannot pass on the day it is written reads as a result and is not one.
This run adds 6 captures and 1.2 GB over that baseline and introduces
zero new violations of any kind; safety and conservation are 0 across the
whole corpus, which is the state the §b3 fix preserves.

## (c) Gaps surfaced — decisions above this tier

### c1 — the dispatched design cannot meet its own done-criterion

§b2 is the whole argument: the delta's bytes belong at the index the
swallowed message occupied, and a frozen TAIL index is not that index.
Building it would have added a state-carrying path to the cache-critical
serialization of a load-bearing extension in exchange for a measured
zero. The census's own rule — "emitting the right bytes at the wrong
index diverges the prefix just the same" — is what the design violates.

**Question for the dispatcher:** none on this half. The measurement is
decisive; the design as written should not be revived.

### c2 — the class is already in flight, and this dispatch duplicated it

The un-merge that DOES work is `docs/directives/flap-move-mitigation-and-fidelity-gate.md`,
unit 2, "first-seen re-serve for recognized moves": recognition of a
standalone whose unwrapped text is the `"\n\n"` join of a disappeared
entry's pinned blocks with its neighbour's, action "serve the first-seen
form ... the merged message is suppressed; no edit-shaped reset". Unit 1
(the conservation gate) shipped as 95ca0cb; unit 2b is BUILT on branch
`wt/fidelity/opus` (dc8c475) and blocked on THE IDENTITY DECISION — how a
re-served entry is identified across requests once CC stops sending it —
which that directive flags as touching identity/state keys, the one
restart-UNSAFE change class (row 3).

`BACKLOG.md`'s EXTENDED item and its cross-message-join item are
therefore **the same class named from two directions**: the census's
`EXTENDED` label (content-relational) and its `blockMigration` label
(position-relational). The EXTENDED item should close by merging into the
flap-move directive, never by a second mechanism — the acc0814 lesson
("extend an existing tool before writing a new one") at the item level.

**Question for the dispatcher:** confirm that closure, and note that the
flap-move directive's own status line already records the sibling of the
defect fixed here: "The reset path must also declare suppressions/reserves
to the conservation gate (builder deviation, REQUIRED and kept)." That
branch and this main-line fix must not collide — the branch predates the
declaration landing on main.

### c3 — census annotation the closing gate asks for (dev-loop q3)

The census emits EXTENDED and stops. The distinction that decides the
mitigation — remainder is a predecessor's standalone (MERGED-STANDALONE)
vs. remainder is genuinely new text — was hand-derived here and is not in
the tool, so the next session re-derives it. Decision-complete item:

> **READY — census: EXTENDED sub-classification (MERGED-STANDALONE vs
> NEW-TEXT).** In `analysePair`, when a finding classifies EXTENDED,
> compare `actual.slice(recon.length)` (leading `"\n\n"` stripped) against
> the texts of the BEFORE request's standalone `role:"system"` messages;
> emit the sub-verdict on the detail row and in the non-EXACT listing.
> Also correct the header comment: "NOT absorbable by any normalization"
> is refuted for the merged sub-class. Verifier: red-first on the corpus —
> the 9 occurrences of §b1 must print MERGED-STANDALONE, and a synthetic
> new-text pair must print NEW-TEXT. Done when the sub-verdict appears in
> `--json`, so `bust-triage` can key on it.

Not lifted into `BACKLOG.md` here: the dispatch's write boundary allowed
only the EXTENDED item's own resolution lines, and `tools/` was
read/execute-only.

### c4 — the census byte-gate silently skips most of the corpus

`dev-loop.md` calls this tool the gate "every NORMALIZATION design must
pass before it ships". Its `census()` swallows a read failure
(`catch { continue; }`) and reports only the captures it DID read.
Measured by replicating its own `readCapture` per file:

    SKIP-UNREADABLE   734 MB  s-captureB-…  :: Cannot create a string longer than 0x1fffffe8 characters
    SKIP-UNREADABLE  2415 MB  s-captureD-…  :: Cannot create a string longer than 0x1fffffe8 characters
    SKIP-UNREADABLE  2059 MB  s-captureA-…  :: Cannot create a string longer than 0x1fffffe8 characters
    SKIP-UNREADABLE  1006 MB  s-captureN-…  :: Cannot create a string longer than 0x1fffffe8 characters

    39 capture file(s): 25 read, 10 skipped as too short, 4 SKIPPED UNREADABLE

**6.2 GB of 7.8 GB — 79% of the corpus by bytes — is silently outside
every verdict this tool has ever produced**, including §b4 above and the
"no MISMATCH corpus-wide" grounding under the row-4 mitigation. The four
skipped files are the largest, i.e. the ones most likely to carry the
class. This is exactly the `RangeError` `replay.mjs` was fixed for on
2026-07-28 ("the gate was unrunnable on the largest corpus while staying
green on every small one"), re-committed in a newer tool, plus the
three-answer violation: an absence reported as a pass. Decision-complete
item:

> **READY — census reads captures by LINE, and says what it could not
> read.** Replace `readCapture`'s `readFileSync` with `readLines`
> (`tools/read-lines.mjs`, already streaming and already the fix for this
> exact class in `replay.mjs`); keep per-conversation grouping unchanged.
> Report skipped/unreadable files as their own line and make a run whose
> unreadable count is non-zero say so in the verdict block (three-answer
> rule). Verifier: a run over `~/.claude/cache-fix-captures/*.jsonl`
> reports 39 files considered and 0 unreadable, versus 25/4 today;
> per-capture EXACT/EXTENDED tallies on the 25 currently-readable files
> unchanged. Done when `gate-live`'s sweep cannot report a clean
> byte-gate over a corpus it did not read.

### c5 — harvest sanitization cannot express this class

`scrubText` tokenizes each text independently, so
`scrub(a + "\n\n" + b) != scrub(a) + "\n\n" + scrub(b)`: the prefix/join
relation that DEFINES both EXTENDED and the merged-standalone shape does
not survive the harvest scrub. Executed against the shipped sanitizer
(`scrubMessage`), not inferred from reading it:

    scrubbed inner reminder : t_557f9b1ec47a_50
    scrubbed merged         : t_9c41a9f9b0c1_100
    scrubbed standalone     : t_d258c4d5a7e5_48
    prefix relation survives: false
    join relation survives  : false A `--pin`ned fixture of the motivating
pair would therefore not reproduce the class it was pinned for. The test
file works around it with synthetic deterministic tokens whose relation
is preserved by construction. Not fixed here (`tools/` read-only) and not
obviously fixable without weakening the scrub — surfaced because
"harvest it" is the standing answer to the closing gate's question 2 and
for this class it silently is not.

## (d) Deviations, with reason

1. **The build was refused.** §c1/§c2. The directive's own instruction —
   surface a counterexample as a gap, never widen or guess — points here;
   the counterexample happens to hit the design rather than the class
   gate.
2. **`insertion-normalization.mjs` was written for a different fix than
   the directive scoped.** In-boundary file, out-of-scope defect. Kept
   because the directive's verifiers 2 and 4 are unmeasurable without it
   (both gates report false reds on the motivating capture) and because
   the miss is live today, on ~1 request in 3.
3. **`gate-live.mjs` run with `--status <scratchpad path>`.** The default
   writes `~/.claude/cache-fix-gate-status.json`, which doctor reads and
   code-stamps; stamping a verdict for a tree that is not deployed would
   have made the doctor's DECLARED/RUNNING/VERIFIED comparison lie.
   Deployment (pin bump, restart, gate stamp) is the dispatcher's act.
4. **The unit test's fixture is hand-built, not harvested.** §c5.

## (e) Candidate lessons

1. **A label is not a mechanism.** `EXTENDED` was defined by a byte
   relation (`startsWith`) and then read as a causal story ("new text
   arrived"), and the story propagated into a backlog item, a directive,
   and a done-criterion without anyone opening the bytes. One read of the
   pair refuted it. Same shape as row 4's own history ("the census names
   the class; only content names the cause") — recurring, so the census
   should carry the sub-class (§c3) rather than the next reader.
2. **Two labels over one phenomenon manufacture duplicate work.** The
   content-relational label (EXTENDED) and the position-relational label
   (blockMigration) named one class, and each grew its own backlog item,
   its own directive and its own dispatch. A cross-check — "does this
   class already have a row under another name?" — belongs at intake,
   next to the tracker sweep dev-loop already mandates.
3. **A test with the code's parentage freezes the gap it should catch.**
   The reset-path suppression had a test asserting `suppressed === 1`,
   which the code produced; the consumer needed `suppressions[]`, which it
   did not. Taking the expectation from the CONSUMER of the value, not
   from the producer, is what made the defect visible.
4. **A gate that cannot read its corpus must say so louder than it says
   "clean".** §c4 is the third instance of this exact class in this repo.

## (f) Files touched + commit

    proxy/extensions/insertion-normalization.mjs   reset path declares suppressions
    test/extended-absorb.test.mjs                  new, 4 tests
    BACKLOG.md                                     EXTENDED item resolution lines
    docs/directives/robustness-threat-matrix.md    row 4 datapoint
    docs/directives/extended-class-absorb-directive.md  status line
    docs/code-reviews/extended-absorb-report.md    this file

Commit `ac49799` on `main`, **unpushed**, targeted `git add` per path.
`extended-class-absorb-directive.md` was untracked when this dispatch
started; it is committed here so the BACKLOG and matrix pointers to it
resolve.

The EXTENDED item in `BACKLOG.md` still opens with its original
"**READY —**" title: the write boundary allowed appended resolution lines
only. On the closure recommended in §c2 that title is what should change,
so the item cannot be re-dispatched off its stale first line.

## (g) What was NOT verified

- **Nothing about the un-merge as shipped code.** §b2's design-B number
  comes from substituting into the pipeline's real output, not from an
  implementation: it establishes the PLACEMENT, and says nothing about
  identity, reset survival, or the state the flap-move directive is
  blocked on.
- **The 421ch remainder's identity was matched by TEXT** in the probe
  (the same text recurs many times in a history). The placement result
  does not depend on it — the bytes substituted are byte-identical
  wherever the copy came from — but "which canonical entry it is" is
  exactly the identity question §c2 is blocked on, and this probe does
  not answer it.
- **The 4 unreadable captures (§c4) were never censused**, so the 9/9
  merged-standalone result is over the readable 21% of corpus bytes.
- **No live traffic** was exercised: no restart, no deployment, no
  `/health` check. The proxy still runs the pre-dispatch tree.
- **`--census` mitigation rows** were not re-derived for the pair; the
  divergence numbers come from `prefix-diff`, `replay.mjs` and the probe,
  which agree.

## (h) Sources actually read, of those the brief named

Read in full: `BACKLOG.md` (both row-4 items, the cross-message-join
parked item, the joined-standalone item), `proxy/extensions/insertion-normalization.mjs`,
`tools/reminder-migration-census.mjs`, `docs/dev-loop.md`,
`test/insertion-suppression-on-reset.test.mjs`.
Read in part, at the sections the brief named or the work reached:
`docs/directives/robustness-threat-matrix.md` (row 4 through the
2026-07-30 corrections), `proxy/extensions/deferred-tool-rewrite.mjs`
(the `tool_addition` injection/anchoring precedent),
`tools/replay.mjs` (safety, conservation, `compactEntry`,
`findMitigationGaps`, the main loop), `tools/harvest.mjs` (sanitization,
`--pin`), `tools/gate-live.mjs` (gate resolution, `--status`),
`docs/directives/flap-move-mitigation-and-fidelity-gate.md` (units 2/2b
and both status sections), `CLAUDE.md`, `CLAUDE.local.md`.
The motivating capture was read locally, never committed; no capture
bytes appear in this report or in the test fixture.

---

## Closing gate (dev-loop, four questions)

1. **Mechanized?** PARTLY. The declaration defect is now a test that goes
   red without the fix, and the class's true shape is a committed fixture
   that survives capture rotation. NOT mechanized, and named: the
   MERGED-STANDALONE sub-classification (§c3) and the census's silent
   capture skips (§c4) both need `tools/` changes this dispatch was not
   granted. Each is written out decision-complete so the next session
   dispatches rather than re-derives.
2. **Evidence harvestable?** PARTLY, and the gap is structural: the
   motivating pair's numbers are reproducible from the capture while it
   lives, but the harvest sanitizer cannot express this class at all
   (§c5, executed). What survives rotation is the synthetic fixture in
   `test/extended-absorb.test.mjs` plus the numbers recorded here and in
   matrix row 4.
3. **Census class/annotation?** YES, named in §c3 — a class hand-derived
   during this work (MERGED-STANDALONE vs NEW-TEXT) that the census
   should emit. Not a one-off derivation: it decides the mitigation.
4. **Instruments ride along?** The only wire-affecting change here is
   none — no forwarded byte moved, so no replay/census change is owed for
   it. The declaration fix is precisely an instrument catching up with
   the extension. Had the dispatched design been built, replay would have
   needed a new declared-injection exemption (an ADDED message has no
   telemetry key today, `isDeclaredInjection` covers only `tool_addition`
   blocks) — recorded because the eventual un-merge in the flap-move
   directive is slot-preserving and therefore does NOT need it, and that
   difference is a reason to prefer it.
