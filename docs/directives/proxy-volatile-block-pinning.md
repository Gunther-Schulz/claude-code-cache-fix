# Directive (phase 3): volatile-block pinning + removal-tolerant canonical

Status: DESIGN — do not implement until the capture/replay harness
(sibling directive) can validate it against recorded real traffic.
That ordering is the point: this extension's predecessor
(insertion-normalization) shipped a defect that live traffic had to
expose; this one ships only after replay shows it absorbing the
attributed 2026-07-28 busts and mutating nothing else.

## The measured problem (what phase 2 cannot absorb)

Phase 2 (insertion-normalization) models history as append-only with
insertions to re-order. Live capture data (2026-07-27/28,
`e1c30d4` prevContent/nowContent) shows two divergence classes that
break its subsequence premise, and they are DIFFERENT problems:

1. **The flip class — attributed, twice.** A `<system-reminder>`
   block that a PreToolUse hook injected via additionalContext
   (dispatch-guards' "Dispatch starting — brief check", then
   anneal-framework's "Spec-origin trace required") sits inside a
   user message deep in history — and Claude Code serializes it
   INCONSISTENTLY: present in one request, absent in the next,
   present again, across consecutive requests. Each flip is a
   mid-history mutation; with markers at index 0 and tail, each
   cost the whole context (135k at 22:13Z, 182k at 22:25Z, both
   re-reading exactly the 22,620-token index-0 marker). The same
   flip pattern is visible for task-reminder notices, the
   deferred-tools notice, and mid-turn-message wrappers. This is
   not pruning — it is nondeterministic serialization of
   harness-injected bookkeeping, and CC itself cannot decide
   whether the block belongs there.

2. **The removal class — routine, measured.** Same-tenant message
   COUNT shrinks: 91 events across 6 session keys; the
   `context-management-2025-06-27` beta is confirmed on the wire
   for all tenants, and context management removes older content
   by design. 22 of 91 shrinks co-time (±3s) with a phase-2
   `not-subsequence` reset. A removal is legitimately not a
   subsequence, so phase 2 resets — degrading to a no-op for the
   rest of the session's insertions.

## Design part A — pin the flip class (absorbs the bust)

**Identity:** extend `computeIdentities` so a message's identity
hash is computed over content with VOLATILE BLOCKS excluded. A
block is volatile iff it is a text block whose entire text matches
`^<system-reminder>\n[\s\S]*\n</system-reminder>\s*$` (the wrap
regex already in identity-normalization). No allowlist of specific
reminder texts: the flip evidence covers four different reminder
kinds already, and a pattern list would be the next mole. The wrap
IS the contract — CC marks its own injections.

**Forwarding:** for a matched deep-history message whose incoming
bytes differ from first-seen ONLY in volatile blocks, forward the
FIRST-SEEN form (per-message `pinBlockContent` idiom — store the
first-seen serialized message alongside its canonical identity
record). The API then sees byte-stable history; the flip never
reaches the cache.

**Correctness argument.** Pin-to-first-seen forwards, at worst, one
bookkeeping reminder block that CC's latest serialization dropped
(or omits one it re-added). The model already saw the first-seen
form — every later assistant turn was generated against SOME
serialization of this window, and CC itself alternates between the
two forms, so neither is authoritative. The information delta is a
reminder whose content class is bookkeeping by construction.
Hard limits that keep this honest:

- Only user-role messages. Never assistant (thinking signatures,
  tool_use blocks — byte-sacred), enforced structurally, not by
  assumption.
- Only text blocks matching the wrap regex. tool_result blocks are
  never volatile even if their text looks reminder-shaped.
- Pin applies only when the NON-volatile remainder is
  byte-identical. Any other difference in the message → this is
  not a flip → part B / reset path.
- Size: a pinned message stores once, bounded by the message's own
  size; storage lives in the existing canon file.

**Interaction with phase 2:** part A runs as identity refinement
INSIDE insertion-normalization (same extension, same canon file,
version-bump the canon schema; old canon files degrade to one
honest reset via the existing ENOENT/shape handling). It is not a
new pipeline stage — a flip currently classifies as
`not-subsequence` reset; with part A it classifies as a match, and
the splice/append logic proceeds unchanged on top.

## Design part B — survive the removal class (bounds the damage)

Removals CANNOT be absorbed at the proxy: re-forwarding pruned
messages would defeat context management (window growth, request
size) and fight the API's own beta. What the proxy must stop doing
is DYING on them:

- Match allows deletions: canonical entries missing from incoming
  are marked `dropped` (kept in the file, flagged, never forwarded)
  instead of triggering a full reset — the match continues past
  the gap. Strictly-increasing order over the surviving matches
  still required; order violation among survivors remains a hard
  reset (that is a genuine rewrite, not a prune).
- The bust at the removal index is real and stays — one honest
  partial rewrite, priced by wherever the markers sit. What part B
  buys: canonical remains alive, so the NEXT hook flip or insertion
  after a prune still normalizes instead of hitting the
  reset-per-prune behavior measured in 9.2 of the dotfiles handoff
  (51 resets post-4d7061e, 50 of them not-subsequence).
- Guard against pathological churn: if dropped-entry count for a
  canon exceeds half its length, reset anyway (a halved history is
  a compaction, not a prune; fresh canonical is cheaper than a
  dropped-list bigger than the live one).

## Validation gate (blocking)

1. Suite: fixture tests for flip (absorbed, byte-stable output),
   prune (match survives, dropped flagged, no reset), flip+prune
   combined, assistant-content change (hard reset preserved),
   adjacency invariant across pinned forwarding.
2. Replay: over a captured corpus containing the 2026-07-28 events
   (or synthetic fixtures reconstructed from the events ledger's
   prevContent/nowContent until real captures accumulate), the
   report must show: both attributed busts absorbed, zero
   mutations outside flip-pinning, phase-2 reset rate on the
   corpus strictly reduced, never increased.
3. Cache-sim: predicted write-token delta on the corpus, recorded
   in the closing report — the number that says what this is worth
   before it ships.

## Upstream

Both halves are CC bugs wearing proxy mitigations: (1) hook
additionalContext should serialize deterministically once injected;
(2) prunes should be append-shaped from the cache's perspective
(prune-aligned cache markers). File with the flip evidence
(prevContent/nowContent pairs name the exact blocks); keep the
proxy fix regardless — upstream latency is unbounded.
