# Unit 2b closing report — moves survive resets

Worktree: `/tmp/wt-fidelity2-opus` (branch `wt/fidelity/opus`, rebased onto
`origin/main` 209684f; the unit-1 commit 9cbdfec was skipped by rebase as
already applied on main as 95ca0cb — no conflicts).

**HEADLINE: Unit 2b is built and bite-proven, and it does NOT close the
measured regression it was written for. The directive's premise for that
pair is refuted by execution: the reset is a symptom, not the cause.**

---

## (a) Items completed, with evidence

1. **`findJoinMoves` now runs inside `resetKeepingPins`**, after pin
   substitution, on the same `out` array; substitutions applied by
   `out[mv.mergedIndex] = priorCanonical[mv.ci].m`.
   `proxy/extensions/insertion-normalization.mjs`.
2. **`moved: N` returned beside `pinned`** — and, beyond the directive's
   letter, `suppressions` (kind `join-move`), `suppressed` and `reserves`.
   Reason in (d).
3. **Canonical on a moved slot files the ABSORBED entry**
   (`priorCanonical[mv.ci]`), not a fresh identity built from the merge —
   required by `resetKeepingPins`'s own stated invariant ("the canonical
   must describe the wire we JUST FORWARDED").
4. **`newEntries` hoisted above the order checks** so both early reset call
   sites can see it (as commit 0ebbd8a's note anticipated). Nothing hoisted
   depends on the order model; verified inert by the corpus A/B in (b).
5. **New fixture** `test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json`
   — capture s-dc3f8071 requests 187/195/196/197/198 of one conversation,
   sanitized, 484 KB.
6. **Ten new tests** in `test/insertion-join-move.test.mjs` section (d).
   Seven pass, three are TODO (see (c)).

## (b) Checks RUN, with real output

### Red-first, on the real code before the change

    ✖ BITE — the real reset leg: n=197's reset keeps the move …
    ✖ BITE — the reset's canonical describes the wire it forwarded …
    ✖ the real reset leg passes all five gates
    ✖ BITE — a not-subsequence reset with a move in it re-serves the first-seen form

The two guard tests (fail-closed, fires-on-a-non-defect) were GREEN before
the change, as they must be — they assert that today's behaviour is
unchanged.

### Mutation precision — six mutations, each removing the exact condition its bite names

| mutation | bites that went red |
|---|---|
| M1 delete the move substitution into `out` | `BITE — a not-subsequence reset with a move in it re-serves the first-seen form` |
| M2 canonical files a fresh identity at the moved slot | `BITE — the reset's canonical files the ABSORBED entry …` |
| M3 drop condition (d)'s upper bound in `findJoinMoves` | `BITE — condition (d) …` + `BITE — fail-closed …` (both name that bound) |
| M4 declare no `suppressions` on the reset | `BITE — a reset's move is DECLARED …` |
| M5 declare without the `join-move` kind | `BITE — a reset's move is DECLARED …` |
| M6 return no array when only a move applied | `BITE — a reset carrying ONLY a move still returns its array` |

M4 and M6 initially bit NOTHING. Both holes were real and both are now
covered: the declaration had no gate-level bite at all, and every existing
synthetic case also applied a pin, so the moves-only branch was never
exercised. The M4 bite's first draft then failed for a HARNESS reason (it
hoisted the assistant turn to index 0, which changed `messages[0]` and so
put the pair in two different conversation groups — every re-served byte
read as "invented"); the scramble was moved to index 1 and the gate went
clean. Instrument ruled out before the code, per dev-loop.

### The three regression captures — measured A/B, pre-2b tree vs post-2b tree

Pre-2b measured from a second read-only worktree detached at `aef760b`, so
no file was swapped under the working tree. Both runs `--gates-from-capture`.

| capture | PRE-2b stability violations | POST-2b |
|---|---|---|
| s-dc3f8071 | 2 — n=196→197, n=399→400 | 2 — **identical pairs** |
| s-633915a8 | 3 — n=207→209, n=2204→2205, n=2275→2276 | 2 — n=217→218, n=2275→2276 |
| s-58c979ce | 2 (+1 fresh-session-sort exemption row) | **identical** |

Net across the three: 7 → 6. **The directive's criterion (all three at zero)
is NOT met.** On s-633915a8 the change is real and measurable — two pairs
cured, one new pair surfaced at n=217→218 — and since the two trees differ
only by this diff, that delta is attributable to unit 2b. Safety,
conservation, sequence and canonical-order gates: 0 on every capture, both
trees.

### Why the criterion is not met — the mechanism, by execution

At the reset the absorbed entry is **not dropped**, so there is no move for
any reset-path code to recognize. `dropped: 0` on both n=197 and n=400.

`computePinnedIdentities` keys a message as (content-hash, role,
occurrence-ordinal-within-the-request). A recognized move keeps the absorbed
entry ALIVE in the canonical while CC has stopped sending it — so its
ordinal is a claim about an array CC no longer sends. Measured on the
fixture:

    canonical[223] = (h=598f08142b3dde9a, role=system, o=7), first-seen bytes stored
    n=196 incoming: 7 copies of that text, o=0..6  -> o=7 absent -> DROPPED -> move recognized
    n=197 incoming: 8 copies, the 8th at wire 236 (fresh tail reminder, carries cache_control)
                    -> it takes o=7 -> the canonical entry matches THAT message

Two consequences at once: (1) the entry leaves `droppedNow`, so no move can
be recognized; (2) the match pairs canonical 223 → wire 236 against
canonical 224 → wire 224, an inversion, which is what trips
`not-subsequence`. n=399→400 is the identical shape and the identical merged-
content hash `dae62cdff0890cb5`.

This is dev-loop's "identity is where the bugs live" — an identity computed
more cheaply than the thing it identifies. It is frozen in the fixture's
`_mechanism` note so it survives capture rotation.

### Corpus A/B — nothing else moved

Per-request verdicts (action, resetReason, pinned, suppressed, moved,
dropped, forwarded length) dumped for every committed fixture corpus in both
trees and diffed:

    IDENTICAL across 40 verdict lines
    corpora: flap-s-0d6f38ba-86, harvested-append-after-change-s-35d72503-323,
             harvested-replace-edit-s-0edbd11c-20,
             harvested-splice-insert-mid-s-0edbd11c-19,
             pinned-s-633915a8-26-28  (oscillation-s-633915a8-863 is not a
             message-array corpus; its verdicts are asserted by
             test/insertion-merge-suppression.test.mjs — 8/8 pass)

Note: the first version of this comparison "passed" over two EMPTY files
because the script had crashed on both trees. That is the absence-wearing-a-
verdict shape; the script now exits 2 with `COULD NOT VERIFY` when no
fixture yields a replayable request.

### Test suite

Targeted (extension + gates + fixtures), 10 files:

    # tests 195   # pass 192   # fail 0   # todo 3

Full suite: `proxy-integration.test.mjs` and `proxy-wrapper.test.mjs` HANG on
this machine — confirmed environmental, identical 90 s timeout on BOTH trees
(the production proxy holds the port; documented in CLAUDE.local.md). Suite
run with exactly those two excluded, both trees:

    post-2b:  # tests 1700  # pass 1677  # fail 16  # cancelled 4  # todo 3
    pre-2b:   # tests 1690  # pass 1670  # fail 16  # cancelled 4  # todo 0

    diff of failure NAMES: IDENTICAL FAILURE SET — none introduced by 2b

The 16 are all port/network-binding files (proxy-server*, proxy-upstream*,
oauth-refresher, forward-ca, SIGTERM exit code).

### Census over s-0d6f38ba (live capture, under its own boot gates)

Stability: 2 violations, both attributed to **deferred-tool-rewrite**, none
to insertion-normalization. The three flap pairs still appear in the
`block migrations` section — that section is a pure INPUT-side census of what
CC did and will list them regardless of our mitigation. See (c) for why the
directive's "input-mitigated" wording is not expressible today.

## (c) Gaps surfaced — for a tier above this one

1. **THE DESIGN QUESTION (blocking the directive's own done-criterion).**
   A recognized move keeps an entry live in our canonical that CC no longer
   sends, and the entry's identity carries an occurrence ordinal computed
   over CC's array. Any later request carrying one MORE copy of that text
   re-binds the entry to the new copy — killing the move recognition and
   tripping `not-subsequence` at the same time. Closing it means changing
   how a re-served entry is identified. That touches state KEYS, so it is a
   threat-matrix row 3 question (restart transparency) as well as a
   correctness one. **Not settled at this tier.** Three directions were
   visible and none is chosen here: file the moved slot with an ordinal
   computed over the wire WE forwarded; make a re-served entry's identity
   positional/sticky; or recognize the move before the identity match
   rather than after.
2. **The directive's census criterion is not expressible.** "Census over
   s-0d6f38ba shows the three flap pairs input-mitigated" — `mitigated` is
   defined only for `MITIGABLE = {splice/insert-mid, append-after-change,
   reorder-only}` (tools/replay.mjs:854) and a flap pair classifies as
   `replace/edit`, so it never enters that counter. The `mitigation: 1/3`
   line in the output counts unrelated splice events. Either the criterion
   or the census needs restating; not done here (tools/ is outside the
   write boundary).
3. **Fixture naming was not assigned.** The brief named no filename. I
   followed the closest precedent (`pinned-s-633915a8-26-28.json`, a
   request-range fixture) → `reset-move-s-dc3f8071-196-197.json`. Rename
   freely.
4. **No harvest mode for this fixture shape.** Both this fixture and the
   flap one were built by a throwaway script: `harvest.mjs --pin` writes the
   FULL prefix 0..m, which for n=197 of a 472 MB capture is unusable. A
   "select these request ordinals, sanitize, keep a named join relation
   intact" mode is the missing mechanism (dev-loop: the throwaway probe is
   the tell). Outside the write boundary.
5. **Latent, not measured, not changed:** `findJoinMoves` does not constrain
   the merged message's ROLE. If CC ever parked such a join in a user
   message, the substitution would change a role in place and the safety
   gate would fire. Pre-existing in unit 2 (both paths), no corpus instance;
   changing it is a unit-2 design decision.
6. **Directive Status section needs updating** (dispatcher-owned — outside
   the write boundary).

## (d) Deviations, with reason

1. **The reset now also returns `suppressions` (kind `join-move`),
   `suppressed` and `reserves`**, which the directive's BUILD line did not
   name. Required, not cosmetic: `tools/replay.mjs` reads a join-move off
   `stats.suppressions` — the conservation gate to know the merged bytes are
   reconstructible from the forwarded neighbours (`suppressedIndices`, then
   `fJoinHashes`), the safety gate to know the suppression KEEPS its slot
   (`wireRemovedIndices` filters `kind !== "join-move"`). Performing the
   substitution without declaring it makes the conservation gate report the
   merged bytes as `lost`. Bitten by M4/M5.
2. **The `messages` guard widened** from `applied > 0` to
   `applied > 0 || moves.length > 0`; otherwise a moves-only reset performs
   the substitution and throws the array away. Bitten by M6.
3. **Fixture sanitization deviates from the flap fixture's precedent.** The
   flap fixture kept the participating texts RAW because `scrubText` is not
   a homomorphism over concatenation. Here two of the three join
   constituents are the operator's OWN hook texts (PreToolUse/PostToolUse
   `:Agent`, referencing dispatch-discipline §1/§2), not harness-generated
   reminders — raw retention would put operator prose in a public repo. So
   every message goes through `scrubMessage` and the merged message is
   REBUILT as the `\n\n`-join of the sanitized constituents. Verified by
   execution that the sanitized fixture reproduces the raw slice exactly:
   same actions, same reset reason, same suppression/reserve indices, same
   stability violation at the same indices (inDiv 233, outDiv 223). Hygiene
   scan: zero occurrences of any raw fragment, no IPv4, no ssh lines.
4. **Three tests are TODO rather than absent or passing.** They assert the
   criterion unit 2b was meant to reach. Making them pass is impossible
   without the identity decision; deleting them loses the criterion;
   asserting today's output would RATIFY the defect (dev-loop's parentage
   rule). `node --test` exits 0 with a failing todo and prints its
   diagnostic, and a todo that starts passing is reported — so they announce
   themselves the day the identity question is answered. Verified by probe.
5. **Fixture carries 5 requests, not the pair.** n=187 primes the canonical
   (nothing earlier reproduces — 189/184/180 do not), n=195/196 recognize
   the move, n=197 is the reset, n=198 lets a bite name the canonical
   condition separately from the substitution.

## (e) Candidate lessons

1. **A mutation that bites nothing is a finding about the CHECKS, not the
   mutation.** M4 and M6 each exposed a real uncovered branch. Running
   mutations for conditions one believes are "obviously covered" is where
   the coverage holes actually surfaced.
2. **A gate harness inherits the gate's grouping rules.** Building a
   two-entry pair for `findConservationViolations` silently created two
   CONVERSATIONS because the synthetic scramble moved `messages[0]`, and the
   gate then called correct output "invented". Same class as the standing
   "group by conversation before comparing anything" rule, hit from the test
   side.
3. **A comparison script must fail loudly on an empty corpus.** The first
   corpus A/B printed "IDENTICAL" over two empty files after crashing on
   both trees — a pass-shaped absence, the exact three-answer failure
   dev-loop names.
4. **A settled design can be right and still not close the defect it was
   written for.** The row-22 argument does extend to moves — the synthetic
   bites prove it — but the measured pair fails one level earlier. Worth
   checking, at design-settlement time, that the mechanism blamed is the one
   actually firing on the measured bytes.

### gate-live — the whole live corpus under the SERVING gate set

`node tools/gate-live.mjs --status <scratchpad>` (status redirected so the
operator's `~/.claude/cache-fix-gate-status.json` keeps describing the
SERVING code, not this worktree):

    gates from cache-fix-proxy.service: CACHE_FIX_FORWARD_PROXY=on
      CACHE_FIX_PREFIXDIFF=1 CACHE_FIX_INSERTION_NORMALIZE=1
      CACHE_FIX_VOLATILE_PIN=1 CACHE_FIX_TOOL_REWRITE=1
      CACHE_FIX_UPSTREAM_DETECTION=1 CACHE_FIX_UPSTREAM_ERROR_LOG=on
      CACHE_FIX_CAPTURE_MAX_MB=8192 CACHE_FIX_OUTPUT_GUARD=1

    s-0d6f38ba (629.7 MB, 891 req):  stability=2 safety=0 conservation=0 sequence=0 order=0
    s-58c979ce (2415.4 MB, 2073 req): stability=2 safety=0 conservation=0 sequence=0 order=0
    s-633915a8 (2059.4 MB, 2630 req): stability=2 safety=0 conservation=0 sequence=0 order=0
    s-dc3f8071 (472.9 MB, 769 req):   stability=2 safety=0 conservation=0 sequence=0 order=0
    28 other captures: clean
    32 capture(s), 7072 MB, 4 failing

**Safety, conservation, sequence and canonical order are at ZERO across the
entire 7 GB live corpus.** Stability is not: 8 violations, 6 of them
insertion-normalization (the ordinal collision above) and 2
deferred-tool-rewrite on s-0d6f38ba. The directive's 0/0/0/0/0 is therefore
four-fifths met; the fifth is the open question in (c).

## (f) Files touched + commit

Commit `dc8c475` on `wt/fidelity/opus`, **unpushed** (parent `aef760b`).
Staged with targeted `git add`, never `-A`; trailer
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

- `proxy/extensions/insertion-normalization.mjs` (+56 −5)
- `test/insertion-join-move.test.mjs` (+301)
- `test/fixtures/harvested/reset-move-s-dc3f8071-196-197.json` (new, 484 KB)

Working tree clean; nothing else touched. **Note for integration:** `main`
advanced during this work, 209684f → 1dfd8c9 (`backlog: dedup-correct the
cold-detection item's grounding figure`, operator-authored, BACKLOG.md
only). Verified `dc8c475` is NOT an ancestor of main — the worktree did not
escape — but the branch is now one commit behind main again.

## (g) What was NOT verified

- **Which specific requests in s-633915a8 hit the new reset-path
  substitution.** The 3→2 delta is attributable to this diff (the two trees
  differ by nothing else), but the individual pairs n=207→209, n=2204→2205
  and the newly-surfaced n=217→218 were not traced to their per-request
  telemetry.
- **`dropped-majority`'s precedence relative to move recognition** — named
  as unmeasured in the directive, still unmeasured. That call site now
  applies moves like the others; no corpus instance exercises it.
- **The two `deferred-tool-rewrite` stability violations on s-0d6f38ba** —
  another extension, and that capture is the live session's own file (still
  growing), so a strict A/B on it is not possible. Not attributable to 2b;
  worth a separate look.
- **`proxy-integration` and `proxy-wrapper`** — cannot run on this machine
  while the proxy serves; confirmed identical on both trees.
- **Nothing was deployed.** No pin bump, no restart, no gate-status write to
  `~/.claude` (gate-live was run with `--status` redirected into the
  scratchpad precisely so the operator's verdict file keeps describing the
  SERVING code).

## (h) Sources actually read, of those the brief named

- `docs/dev-loop.md` — in full, including the "Adding a check" paragraph on
  mutation precision and expectation parentage.
- `docs/directives/flap-move-mitigation-and-fidelity-gate.md` — in full
  (Unit 2b section, Status section, Unit 2's verification list).
- `proxy/extensions/insertion-normalization.mjs` at `wt/fidelity/opus` —
  `resetKeepingPins` and its full comment block, `findJoinMoves` and its
  definition block, `classifyPinned`, the telemetry tail.
- Commit `0ebbd8a`'s full message including the KNOWN DEFECT note.
- The regression capture `s-dc3f8071-…-requests.jsonl` (read-only); also
  `s-633915a8`, `s-58c979ce`, `s-0d6f38ba` for the sweeps.
- `~/.claude/dispatch-discipline.md` §1 (worktree recipe, followed including
  per-remote pushurl denial — probe-verified: the worktree push is refused).
- Additionally, not named in the brief but load-bearing for the work:
  `tools/replay.mjs` (`conservationViolations`, `suppressedIndices`,
  `wireRemovedIndices`, `findMitigationGaps`, `MITIGABLE`),
  `tools/harvest.mjs` (`scrubMessage`, `pinRange`), `tools/gate-live.mjs`,
  `test/insertion-join-move.test.mjs`, and the pin-on-reset tests in
  `test/insertion-normalization.test.mjs`.
