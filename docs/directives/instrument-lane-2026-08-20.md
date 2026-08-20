# Instrument lane — 2026-08-20, from the row-1 absorption walk

**Status:** handed to a peer session on operator GO, 2026-08-20.
**Base commit:** `7b3d9af`.
**Judgment holder:** the dispatching desk (bookings, threat matrix, the
operator decision). The receiving session holds EXECUTION of items 1 and 2.

## Why this lane exists

A live 110k cache bust was walked to disposition today. The walk produced its
verdict, and then produced three findings about the INSTRUMENTS that were
supposed to have caught it. Every one of the three was found by hand, which is
the tell the dev-loop's closing gate names: a manual investigation that
produced a finding is unfinished while the check that would have produced it
does not exist.

The lane below is items 1 and 2 — both decision-complete, both `tools/`-only,
both with their red-first pair already in hand from real corpus data. Item 3 is
recorded here for context and is NOT in this lane: it changes numbers the daily
sweep reports, so its design stays with the desk.

## Established facts (each opened at brief-write time; grades are per line)

- **The bust.** One 372-byte (374 by serialized-message measure; see the
  reconciliation note below) `role:"system"` Stop-hook notification, spliced by
  Claude Code at index 82 of 107, `anchorDelta -23`. Attribution CC's, computed
  by `bust-triage` importing `replay.mjs`'s primitive.
- **Its real cost, from the capture's OWN usage record** — ground truth, not a
  replay estimate: the busting request billed `cacheCreation` **110,022** tokens
  against `cacheRead` 20,623; the request immediately before it billed
  `cacheCreation` 2,410 against `cacheRead` 126,671.
- **Corpus measurement, full 49-capture live window** (mtimes 2026-08-18 17:47
  → 2026-08-20 15:57; probe at `~/.local/share/cache-fix/insert-rate-2026-08-20/`,
  machine-local 0600, not committed — it carries other sessions' message text by
  construction): 7,704 mid-history insert entries over 2,569 pairs. Bucketed per
  pair by its most-negative `anchorDelta`: `>= 0` 2,467 pairs · `-1..-9` 101
  pairs · `<= -10` **1 pair**, that one being the bust itself.
- **The distribution has a gap.** Per-pair minima are 0-or-greater, then exactly
  `-2` (101 pairs), then a single `-23`. Nothing between -3 and -22. This gap is
  the stated basis for the `-10` bound in item 2 — a chosen bound with a
  recorded reason, not a constant discovered later.
- **96% of the class is benign.** CC emits a standing trailing system-reminder
  (the `<total_tokens>` block) as the last array element of every request; each
  new turn's content pushes it one slot later. The content before it is
  genuinely new by `semanticIds` and the trailing anchor survives after it, so
  the pair censuses as `splice/insert-mid` while being ordinary tail growth.
  Three entries per event — a contiguous system/assistant/user run.
  Hand-verified on 4 independent pairs across captures.
- **Avoidable waste, by bucket** (avoidable = the surviving byte-identical
  suffix after the last insertion point; the content at and before it would have
  been billed regardless): `>= 0` 844,494 B of 20,209,808 re-billed (4.2%) ·
  `-1..-9` 226,446 B of 2,175,315 (10.4%) · `<= -10` 27,422 B of 35,192
  (**77.9%**). Depth predicts waste; volume does not.
- **Caveat on every byte figure above, and it is load-bearing:** they are
  `rebilledBytes`, which is divergence-based and understates the mid-history
  case specifically — see item 3. The 77.9% is a share of an understated
  denominator; the direction of the bias makes deep splices look cheaper than
  they are, never dearer.

## Item 1 — `bust-triage` gains an `insert-context` step

Today `edit-anchor` runs behind `if (cls === "replace/edit")`, so for an insert
class the tool returns a row number, an attribution and an absorption line, and
nothing about WHAT was inserted or WHERE. The hand probe's output WAS the
finding on this walk; no instrument printed it.

**Design (decided; carried from the booked entry, with one amendment from
today's measurement).** For `cls === "splice/insert-mid"`, report the entries
present in `after` and absent from `before` that sit BEFORE the last surviving
entry, each with role, byte size, and offset from the last human turn. Identity
comes from `semanticIds` / `conversationOf` imported from `replay.mjs`, never
re-derived. Reuse `pairEditContext`'s existing capture-window reader rather than
opening a second one.

**AMENDMENT — this is the stale-premise correction, and without it the step
ships noisy.** The booked design predates today's finding that 96% of this
population is the trailing-reminder push-down. Printed unfiltered, the step
would emit three benign entries for the typical pair and bury the signal it
exists to surface. So the step ALSO buckets by `anchorDelta` and labels the
trailing-reminder shape as such. The deep entries lead; the benign run is
summarized in one line, not enumerated.

**Done-criterion.** `bust-triage --at 2026-08-20T09:11:57Z` prints the index-82
entry, its role, its size and `anchorDelta -23` without a hand probe, and does
NOT bury it under the pair's benign entries.

**Verifier — the pair is mandatory and both arms come from the corpus, neither
constructed.** The busting pair yields the mid-history set `[82]`; an
append-only pair from the same capture yields `[]`. A step proven only on the
positive is one that has been shown to catch and never shown to discriminate —
that exact defect cost this investigation two cycles today.

**Write-set.** `tools/bust-triage.mjs`, plus `test/bust-triage-edit-anchor.test.mjs`
or a sibling `-insert-context` file.

## Item 2 — depth bucketing for the mitigation rows and the fire ledger

`fireRaw.relocations` (`gate-live.mjs:1430`, `mit.length` — one row per MITIGABLE
pair) counts a population that is 96% benign. It is not merely a three-class
superset: it is dominated by a shape that costs almost nothing, which makes it
near-useless as a harm signal. A per-class breakdown — the obvious fix, and the
one two sessions independently agreed on before the measurement — would have
produced a second dominated counter.

**Design (decided).** The separating quantity is `anchorDelta`, not class.
`findMitigationGaps` rows gain a depth bucket; the fire ledger's `relocations`
counter buckets on it. The bound is `-10`, and it is stated in the code WITH its
basis — the measured gap between -3 and -22 — so the next reader inherits the
reason and not just the constant.

**Verifier — pair mandatory, both arms already identified.** The 09:11:57Z pair
must land in the deep bucket; a trailing-reminder push-down pair from the same
capture must land in the `>= 0` bucket. Red-first: run the new expectations
against the current implementation and state the baseline result before the
change, since a proof over an already-red baseline proves nothing.

**Write-set.** `tools/replay.mjs` (`findMitigationGaps`), `tools/gate-live.mjs`
(the counter), plus tests.

## Item 3 — NOT in this lane; recorded so it is not lost

The fire ledger prices with `rebilledBytes` / `savedBytes`, which are
divergence-based. `replay.mjs` already carries the breakpoint-aware twins
(`rebilledBreakpointBytes` / `savedBreakpointBytes`) under their own names,
added precisely because the divergence model "understates the mid-history case".
Nothing appears to consume them.

Measured gap on the one deep event: `rebilledBytes` 35,192 against an actual
billed `cacheCreation` of 110,022 tokens. The ledger therefore understates,
by roughly an order of magnitude, exactly the class it most needs to price —
and it understates only that class, so any comparison between deep and
tail-growth costs drawn from these fields is biased in a consistent direction.

This is out of lane because the fix changes numbers the daily sweep reports and
interacts with the sweep's separately-booked history-carrier defect. Design
stays with the desk.

## Boundaries and conduct

- **Write boundary.** The receiving session owns `tools/` and `test/`. The desk
  owns `BACKLOG.md`, `BACKLOG-DONE.md` and `docs/`. Disjoint by path; both
  sides commit by pathspec — `git commit -m "…" -- <paths>`, every flag before
  the separator, never `git add` then commit, never `-A`. A new file needs
  `git add -N <path>` first, naming a FILE not a directory.
- **Never amend.** Always a new commit. HEAD moves under a shared copy.
- **Shared checkout has no private red.** The repo's pre-push runs the FULL
  suite, so a red tree blocks the other party's unrelated push. Say so in the
  report if the tree is left red between commits. A push blocked by a foreign
  red is a finding to report, never a `--no-verify`.
- **Pre-named gate.** A PreToolUse gate denies this repo's first Write/Edit
  until `docs/dev-loop.md` and `FORK-NOTES.md` have been Read (list:
  `.claude/required-reading.json`). Read both before the first edit; this is a
  mechanical gate, not advice.
- **Deployment coupling: none for this lane.** Both items are `tools/`-only.
  Per the fork's operating guide, `tools/`-only commits need neither the
  dotfiles pin bump nor a proxy restart. If the lane finds itself editing
  anything under `proxy/`, that is out of scope — surface it, do not proceed.
- **Push.** The fork's convention is that commit means commit-and-push to
  `main`; upstream's never-push-to-main rule does not apply to fork-main. The
  pre-push suite is the gate.
- **Gaps surface, never fill.** A missing decision, file or value is reported,
  not bridged with a plausible guess.
- **Trailer.** `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.

## Mitigation design — established 2026-08-20 on operator GO, by reading the code

The operator decided to mitigate CC's behaviour in the proxy rather than change
their own hook. This section records what that costs, because two cheaper
readings were floated during the design round and NEITHER survives contact with
the code.

**Every absorption the proxy performs today is licensed by the content already
being present elsewhere on the wire.** That is the single invariant behind all
of it, and it is what rules out the cheap paths:

- Plain suppression fires only through `findSuppressibleDuplicate` — the
  message's content must already be pinned elsewhere. Its own comment names the
  condition: "a copy is present".
- The join-move is gated by a six-clause predicate in `findJoinMoves`, of which
  (c) is decisive: the candidate's standalone text must EQUAL text already
  pinned by a predecessor. It is de-duplication of reminder text CC has moved
  between containers, not relocation of novel content. (f) additionally
  requires `role === "system"`, and (d)/(e) bound the candidate by surviving
  neighbours' wire indices.
- `fresh-session-sort` (order 250) DOES relocate — but BLOCKS into a target
  message, publishing its declaration on `ctx.meta.freshSessionSortStats` which
  `classifyPinned` then honours via `relocatedAt`. Message count, roles and
  order are untouched, which is why it needs no order exemption. The earlier
  claim "nothing in the pipeline moves a message" stands; this moves blocks.

**Our case satisfies none of it.** The hook notification is NOVEL text,
appearing ONCE, carrying information nothing else on the wire carries. So:
suppressing it drops information the model would otherwise see, and no existing
exemption licenses that.

**Which leaves relocation — and relocation has a RECORDED PRIOR FAILURE.**
`replay.mjs:688`, the comment justifying `findSequenceViolations`: phase-2
insertion-normalization "converts a mid-history splice into a tail append,
which saves the prefix on THAT request and then resets forever after, because
CC keeps sending the entry in its original position. Two requests looked like a
win; three showed the truth." That is this exact mitigation, built and measured
2026-07-28.

**The design, therefore — and its open premise, named rather than assumed.**
A declared relocation with a SELF-VERIFYING exemption, modelled on the
suppression precedent (telemetry-declared, not shape-declared, because a moved
message carries no shape announcing the move — `replay.mjs:596-603` gives that
argument for suppressions and it transfers). The exemption verifies the claim
rather than trusting it: the message at `fromIndex` absent from the output, an
identical message by hash present at `toIndex`, count and roles unchanged, and
the order of everything else unchanged.

The OPEN PREMISE, which decides whether this is buildable at all: phase 2
failed because our reconstruction and CC's serialization diverged permanently.
The pin/canon machinery (phase 3) did not exist then, and its entire purpose is
keeping a reconstruction stable across subsequent requests. Whether pinning
makes a relocation deterministic enough to survive is NOT established by
reading and must not be reasoned about further — it is answerable by replaying
the built change against real captures.

**Verifier, and the discipline it inherits from the failure:** the check is
`findSequenceViolations` returning zero for the affected conversations, over at
least THREE requests. Two is what fooled phase 2. A two-request green is not
evidence here — it is the exact shape of the recorded miss.

**Deployment coupling, unlike items 1 and 2:** this lands in `proxy/`, so it
needs the dotfiles pin bump and a proxy restart. The restart is
cache-transparent unless the change touches state KEYS or freeze logic — this
one plausibly touches the canon model, so that question is answered BEFORE the
restart, not after.

**Load-bearing:** yes — shared abstraction, safety-relevant. It does not ride
on one LLM's judgment.

## THE PREMISE, SETTLED BY EXECUTION — and it inverts the risk/reward

Established 2026-08-20 by running the capture, not by reading code. This is the
section to read before building anything above it.

**CC keeps the notification at index 82 FOREVER.** Tracked by content hash
across the ten requests following the bust in the same conversation key:
index 82, 82, 82, 82, 82, (a 1-message request, absent), 82, 82, 82, 82 — while
the arrays grow 110 → 113 → 116 → 119 → 122 → 125 → 128 → 131 → 134. It is
inserted once and then becomes ordinary, stable history.

**So the cost is ONE-TIME AND SELF-HEALING, not recurring.** Ground truth from
the same capture's usage records: the bust billed `cacheCreation` 110,022 with
`cacheRead` collapsing to 20,623; the very next requests bill 5,857 / 1,652 /
275 with `cacheRead` back above 130,000. The conversation recovers by itself on
the following request. Nothing continues to leak.

**What that does to the mitigation's arithmetic.** From request N+1 onward,
CC's own arrays are already append-only, so a relocating proxy and a
passthrough proxy are equivalent there. The mitigation's entire upside is
avoiding the SINGLE hit at request N — about 108,826 excess tokens, roughly 91
normal requests — once per occurrence, at an observed rate of once per 49
captures / two days.

**And the downside is not symmetric.** To keep the prefix stable the extension
must apply the identical relocation on EVERY subsequent request — 563 of them
in this conversation alone. The arithmetic works while it holds: forwarding
`[0..81, 83..end, notification]` each time keeps indices 0..81 pinned and
diverges only at the previous request's last slot, i.e. tail re-billing. But a
SINGLE failure to reproduce the relocation resets the conversation and re-bills
the prefix — and then does it again. That is exactly what
`replay.mjs:688` records phase 2 measuring: saved on that request, "resets
forever after".

**So the trade is: save ~109k tokens once, against a failure mode that costs
the prefix repeatedly.** The mitigation is only rational if the relocation is
provably deterministic across the whole conversation, which makes the
stability proof not a verification step but the ENTIRE feasibility question.

**Consequently the verifier tightens.** `findSequenceViolations` returning zero
over three requests is NOT sufficient here — three was the bar that exposed
phase 2, not a bar that clears this. The real bar is the full continuation:
zero resets across the affected conversation's remaining requests (563
available in the corpus, which is ample). A green over any short prefix of that
is the phase-2 shape repeating one level up.

**Recommendation to the operator, as new evidence against a decision already
taken rather than a reopening of it:** the decision to mitigate CC's behaviour
rather than change local hook behaviour stands as intent. What has changed is
the premise it was taken under — the cost was presented as a 110k bust without
the one-time-and-self-healing finding, and without the asymmetric downside.
Building remains defensible under the repo's cost-never-gates-mitigation
stance; it is no longer obviously the best use of the next build slot, and the
operator should have that before the work starts.

## Reconciliation owed at booking

The busting message measures 372 bytes by the walk's original basis and 374 by
`Buffer.byteLength(JSON.stringify(msg))` over the full message object. Same
event — every other field matched exactly. Whichever basis the record adopts,
it names the basis and notes the other; neither number is adopted silently.
