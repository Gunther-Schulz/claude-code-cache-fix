# Directive: output guard — last-line invariant check on the outgoing body

Status: APPROVED (operator, 2026-07-28) — build with the injection
proof in the same commit.

## What it protects against

Not CC. Us. The pipeline is a body-mutating middleman (reordering,
rewriting, injecting, and — since phase 3 — substituting first-seen
bytes for what CC sent), and the composition of individually-correct
extensions is where the one real shipped defect lived (the
insertion-normalization index-identity storm). The near-miss record:
deferred-tool-rewrite Phase A would have sent malformed requests and
was stopped by reading, not by a mechanism. The class matrix catches
composition bugs at test time; this guard catches the ones that reach
production anyway.

## Design

Two extensions (the pipeline loads one default export per file):

- `output-guard-stash` (order 55, before the first body mutator at
  90): `structuredClone(ctx.body)` onto `ctx.meta._preMutationBody`.
  Nothing else. Runs unconditionally when the guard flag is set.
- `output-guard` (order 690, after the last body mutator —
  ttl-management at 500 — and before the observers at 700+): validate
  hard invariants on `ctx.body`; on ANY violation, replace `ctx.body`
  with the stashed original, write one `[output-guard] CRITICAL` line
  naming the violated invariant, append a telemetry record
  (`<key>-guard-events.jsonl`, snapshots dir), and set
  `ctx.meta.outputGuardStats`.

Fail-open at the MUTATION level, fail-safe at the REQUEST level: the
worst case of a guard fire is one un-optimized request (CC's own
bytes, which are valid by definition — they are what would have been
sent with the proxy absent). The guard itself swallowing an internal
error must never fail the request: validation exceptions count as
"cannot verify" and pass the mutated body through with a WARN — a
guard crash must not be able to disable the pipeline's value.

Gate: `CACHE_FIX_OUTPUT_GUARD=1`, read per-call, same idiom as every
other extension.

## The invariants (hard, enumerable, shape-level)

1. **Tool adjacency**: every user message carrying tool_result blocks
   is immediately preceded by an assistant message whose tool_use ids
   cover every referenced tool_use_id (validateToolAdjacency, imported
   from insertion-normalization — one implementation, not two).
2. **Marker budget**: total cache_control markers across system blocks
   and messages ≤ 4 (the API's documented cap).
3. **Valid roles**: every messages[] entry has role "user" or
   "assistant".
4. **Content present**: every message has a `content` field that is a
   string or a non-empty array. (Empty TEXT BLOCKS are legal — CC
   itself sends them — but a missing/empty content array is not.)

Deliberately NOT checked: message count stability (smoosh-split
legitimately changes it), role alternation (API contract uncertainty —
an invariant we are not sure of is a false-positive machine), and
anything requiring cross-request state (the guard is stateless by
design; a guard that shares the pipeline's state shares its blind
spots).

## Validation gate (blocking, in the shipping commit)

1. All eight class-matrix corpora replayed with the guard active:
   zero fires (healthy traffic is never degraded).
2. Injection proof: a deliberately broken mutator (breaks adjacency;
   separately, injects a 5th marker) added to the pipeline in a test —
   the guard fires, the forwarded body is byte-identical to the
   pre-pipeline stash, and the telemetry record names the invariant.
3. Guard-crash proof: a validator forced to throw passes the mutated
   body through (fail-open) with stats saying "unverified", request
   unharmed.

## Operations

Guard fires are DEFECT SIGNALS, not noise: any fire means an
extension interaction produced an invalid or unintended body shape in
production. The telemetry file is append-only for post-mortems;
follow-up work (see robustness roadmap) surfaces fire counts in
doctor/health rather than leaving them journal-only.
