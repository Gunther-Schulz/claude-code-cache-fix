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
   no re-serve) over fixture test/fixtures/harvested/flap-s-0d6f38ba-86.json
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
s-0d6f38ba-…-requests.jsonl shows the three flap pairs input-mitigated;
suppressed-counts on unaffected corpora unchanged; bites red-first from
the committed flap fixture; oscillation fixture
oscillation-s-633915a8-863.json verdicts unchanged (its class is the
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

