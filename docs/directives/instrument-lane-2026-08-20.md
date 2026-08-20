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

## Reconciliation owed at booking

The busting message measures 372 bytes by the walk's original basis and 374 by
`Buffer.byteLength(JSON.stringify(msg))` over the full message object. Same
event — every other field matched exactly. Whichever basis the record adopts,
it names the basis and notes the other; neither number is adopted silently.
