# Directive: content-conservation gate + first-seen re-serve for cross-message reminder moves

## Goal / Background

Close threat-matrix Row 4's flap class (2026-07-30 datapoint + corrections,
commits 8cd4e1c/cd29e34/1c40886): CC migrates reminder-wrapped blocks
between inline and standalone positions, including a CROSS-MESSAGE join
(msg89's reminder + "\n\n" + standalone msg90 replacing both), and
classifyPinned's edit-shaped reset fires before suppression can act — a
221k bust. The mitigation must answer two safety questions that were
parked with the design (BACKLOG "PARKED (design) — flap escape"); this
directive answers them by MECHANISM: a fidelity gate that makes
content-conservation checkable, then a mitigation that must pass it.
Policy basis: matrix header — any non-operator-initiated bust is a
prevention target; the only deliberation is mitigability without risking
conversation fidelity.

## Non-Functional Requirements

- **Size/complexity budget**: unit 1 ~150-250 LOC in tools/replay.mjs +
  selfcheck tests; unit 2 ~100-200 LOC in
  proxy/extensions/insertion-normalization.mjs + bites + fixture use.
  Two commits, one per unit. Materially larger → stop and surface.
- **Threat model**: conversation fidelity is the protected property; the
  gate IS the enforcement. No request bodies or keys leave the machine;
  any new fixture goes through the harvest sanitizer.
- **Maintainability**: extend existing primitives — join-registry
  (78940a0), candidacy predicate (47defba), canonical state,
  message-hash. No new abstraction without 3+ call sites.
- **Performance/reliability**: gate rides the existing streaming +
  heap-capped replay budget; nothing else applies.
- **Load-bearing?** YES — gate semantics + extension pipeline.
  Fork-internal review path: red-first bites, five-gate zero-violation
  requirement, dispatcher verification (upstream's label machinery does
  not bind fork work).

## Unit 1 — content-conservation (fidelity) gate

Definition, written before any assertion (dev-loop "Adding a check"):
for each same-conversation pair of raw CC input Rn and forwarded output
Fn, every content block in Rn is accounted as exactly one of:
forwarded byte-identical; suppressed-with-copy-present (its unwrapped
bytes reconstructible from blocks present in Fn, including as a join
constituent); or covered by an already-declared transform (existing
exemption registry — sanitization, tool_addition announcements, etc.).
Conversely, every block in Fn is: present in Rn; a first-seen re-serve
of a prior request's block that Rn dropped in a RECOGNIZED move
(declared by unit 2's classifier); or declared-transform output.
Anything else is a fidelity violation; the gate exits non-zero.

Verification, in order:
1. Mutation tests in test/replay-gate-selfcheck.test.mjs (red with the
   check neutralized).
2. THE REAL RED: a throwaway probe variant implementing naive
   merged-standalone suppression (suppress the cur91-class message,
   no re-serve) over fixture test/fixtures/harvested/flap-s-captureB-86.json
   must go RED — msg90's bytes unaccounted. This red is the evidentiary
   answer to parked design question 1 and is quoted in the closing
   report. The probe variant is then discarded; it never lands.
3. Green baseline: the CURRENT pipeline over both fixture corpora and
   the live captures is GREEN. If it is NOT green, that is a real
   finding about existing suppression — halt and surface; do not adjust
   the gate to pass.

## Unit 2 — first-seen re-serve for recognized moves (the mitigation)

Recognition (candidacy-gated; reminder-wrapped blocks only, per
47defba's predicate): within one conversation, a request where (i) an
entry whose content is candidacy-class disappears from the wire, and
(ii) a new standalone system message appears whose unwrapped text
equals the "\n\n" join of pinned blocks from the disappeared entry
and/or its adjacent entries' pinned blocks — classify as MOVE, not
edit. Only the measured shapes: two-constituent "\n\n" joins per the
fixtures. Anything else (subset merges, ≥3-way joins, other joiners,
non-reminder content) is out of scope — surfaced as a gap, never
handled speculatively.

Action on MOVE: serve the first-seen form — canonical retains the
original entries; the merged message is suppressed; no edit-shaped
reset. This classification runs BEFORE the edit-shaped reset test for
candidacy-class content ONLY; all other content keeps today's path and
today's reset behavior, byte-for-byte.

State: content additions to existing registries only — no new key
scheme, no freeze-logic change (threat-matrix row 3: restart stays
cache-transparent; this statement is the pre-restart declaration).

Verification: all five gates (stability, safety, sequence,
canonical-order, fidelity) at zero violations on both corpora and the
live captures under the SERVING gate set; census over
s-captureB-…-requests.jsonl shows the three flap pairs input-mitigated;
suppressed-counts on unaffected corpora unchanged; bites red-first from
the committed flap fixture; oscillation fixture
oscillation-s-captureA-863.json verdicts unchanged (its class is the
separate joined-standalone BACKLOG item, not this directive).

## Out of scope

Subset merges, three-plus-block joins, non-"\n\n" joiners, moves of
non-reminder content, the breakpoint ladder (magnitude side), and the
joined-standalone census item (separate READY entry).

## Deployment (dispatcher-owned, after verification)

proxy/** change → dotfiles pin bump + single proxy restart + gate run;
restart transparency statement above.

## Status 2026-07-30 (post-build)

UNIT 1 SHIPPED — main 95ca0cb (gate name in code: `conservation`;
"replay fidelity" already meant reconstruction fidelity). Definition
written first; 7 mutations each biting; THE REAL RED demonstrated and
recorded: naive suppression over the flap fixture loses msg90's bytes
("1 of 1 unit(s) reconstructible from neither a forwarded block nor a
forwarded join") — parked design question 1 now has a mechanical
answer. Live-sweep baseline 30/30 clean after one instrument
exemption (fresh-session-sort's deliberate /clear-artifact deletions,
exempted via the extension's own exported isClearArtifact; ruled out
as instrument per dev-loop).

UNIT 2 BLOCKED — NOT integrated; commit rides branch
`wt/fidelity/opus` (0ebbd8a). Measured regression: the conservation
gate's sibling stability gate goes red on three otherwise-clean
captures — A RESET ABANDONS THE MOVE: on insertion-normalization's
reset path (not-subsequence) the re-serve is not reapplied, so the
forwarded body flips between re-served form and raw merge across
requests. Candidate fix, deliberately not rushed: recognize moves on
the reset path as resetKeepingPins does for pins — that function is
load-bearing with measured false-positive history; row 22's pin
argument plausibly extends to moves but is unverified for them.
Next step is a design decision + full five-gate re-sweep.

Directive correction (builder-surfaced, confirmed): clause (i)'s
vanishing companion need not itself be candidacy-class — measured
msg90 is a bare-string system nudge, never wrapped. Recognition
requires at least one candidacy-class CONSTITUENT (the wrapped
reminder); the companion's bytes are covered by the join relation,
and the conservation gate enforces the remainder by construction.
Also unmeasured and named: dropped-majority's precedence relative to
move recognition.

## Unit 2b — moves survive resets (design settled 2026-07-30, session-inline)

The row-22 argument extends to moves; checked condition-by-condition
against source (resetKeepingPins :742, findJoinMoves on branch
wt/fidelity/opus):

1. Recognition needs no identity lookup: findJoinMoves is a pure
   function of inputs both reset call-sites already possess (matched,
   droppedNow, priorCanonical, wire; newEntries = one filter). D's
   first-seen bytes persist in the canonical — condition (a).
2. FAIL-CLOSED under disorder: gap test (d) uses matched neighbors'
   wire indices; in a scrambled request the bounds collapse and
   recognition does not match — raw forward, today's behavior. The
   substitution can only fire where the local neighborhood is
   actually ordered.
3. Slot-preserving: 1->1, system->system, in place — never adds,
   drops or reorders; count/roles/adjacency unaffected (the pin
   argument verbatim; the builder already rejected the add+drop
   shape for the tap-point reason).
4. Riders unchanged: adjacency-violation reset stays raw;
   canonicalEntries built from the OUT array with substitutions
   applied (the reset path already does this for pins).

BUILD: inside resetKeepingPins, after pin substitution, run
findJoinMoves on the same inputs and apply move substitutions into
`out`; return `moved: N` beside `pinned`. No other path changes.

VERIFY: red-first bite from the measured regression pair
(s-captureC n=196->197, inDiv 233 / outDiv 225 — fixture via the
harvest sanitizer); the three regression captures return to 0
stability violations; full five-gate sweep 0/0/0/0/0 on all corpora
+ live captures under serving gates; census flap pairs
input-mitigated (the directive's original done-criterion now
reachable); oscillation fixture verdicts unchanged.

## Status 2026-07-30 (unit 2b post-build)

BUILT as designed (dc8c475 on wt/fidelity/opus, atop aef760b) — and
the design's premise for the regression pair is REFUTED BY EXECUTION:
at the reset the absorbed entry is never in droppedNow (`dropped: 0`
on n=197 and n=400), so no reset-path move recognition can fire. The
real mechanism is an IDENTITY MIS-BINDING: identity is (hash, role,
occurrence-ordinal); a re-served entry stays alive in our canonical
while CC stops sending it, so when CC sends ANOTHER copy of the same
recurring nudge text, the entry binds to that unrelated copy at an
inverted position — the not-subsequence reset is the SYMPTOM. Frozen
in fixture reset-move-s-captureC-196-197.json (_mechanism note);
full evidence: docs/audits/unit-2b-closing-report-2026-07-30.md.

Measured effect of 2b as built: real but partial — A/B 7->6 stability
violations (one pair cured, one newly surfaced, one family
unchanged); safety/conservation/sequence/order 0 across 32 captures
/ 7 GB under serving gates. Not integrated; the branch is the
carrier pending THE IDENTITY DECISION (BACKLOG) — how a re-served
entry is identified across requests once CC stops sending it. That
decision touches identity/state keys: the one restart-UNSAFE change
class (row 3) — it takes its own design pass, not a ride-along.

Directive corrections from the build: the done-criterion "census
shows the flap pairs input-mitigated" is NOT EXPRESSIBLE as stated —
`mitigated` covers only MITIGABLE={splice/insert-mid,
append-after-change, reorder-only} (replay.mjs:854) and a flap pair
is replace/edit; the criterion becomes "the three flap pairs show 0
stability violations and the merged bytes accounted by the
conservation gate" until a census absorption class exists for
replace/edit. findJoinMoves does not yet constrain the merged
message's ROLE (gap, folded into the identity item). The reset path
must also declare suppressions/reserves to the conservation gate
(builder deviation, REQUIRED and kept).

