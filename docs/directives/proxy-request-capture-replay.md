# Directive: request capture + offline replay + cache simulator

Status: DESIGN — approved direction (operator, 2026-07-28); implement
capture first, replay second, simulator third. Each stage is useful
without the ones after it.

## The problem this solves

Every extension in this pipeline has been validated one of two ways:
synthetic fixtures (the suite — 1504 tests green while live traffic
burned 1.3M write-tokens in one session) or production (the
insertion-normalization index-identity defect shipped green and then
caused a measured reset storm — 125 resets across 350 requests —
until live prefix-diff data exposed it). There is no middle: no way
to ask "what would this change have done to yesterday's real
traffic?" before deploying it. Consequence: every fix waits for a
new live bust to confirm or refute it — whack-a-mole, at write-token
prices, with the operator's sessions as the test bench.

The proxy is the one component that sees every request byte-for-byte
and it currently throws the bodies away. Session-mirrors are
transcript-shaped reconstructions; prefix-diff stores projections
(hashes, previews, windows). Neither can drive a replay.

## Stage 1: capture (extension, ~trivial)

New extension `request-capture`, order ~90 (before ALL mutating
extensions — capture must record what CC sent, not what the pipeline
made of it), gated `CACHE_FIX_REQUEST_CAPTURE=1`.

Per request, append one NDJSON record to
`~/.claude/cache-fix-captures/<session-key>-requests.jsonl`:

    { ts, sid, key, headers: {anthropic-beta, session-id},
      body: <the FULL request body, verbatim> }

- Session key derivation: same as prefix-diff (session-id header,
  content-hash fallback) — captures must join against the existing
  events ledgers by key + ts.
- Retention: captures are large (a 200k-context request is ~800KB of
  JSON). Cap via `CACHE_FIX_CAPTURE_MAX_MB` (default 2048, oldest
  files deleted first) and document that captures contain the FULL
  conversation content — same sensitivity as the transcripts in
  `~/.claude/projects/`, same machine, no new exposure class, but
  say it in the README.
- Fail-open, same idiom as prefix-diff: capture failure must never
  fail the request.

## Stage 2: replay (offline tool, no proxy involved)

`tools/replay.mjs <captures.jsonl> [--env FLAG=1 ...]`:

1. Load the extension pipeline exactly as `server.mjs` does (same
   loader, same ordering) with the env flags given on the CLI.
2. Feed each captured body through `onRequest` in file order,
   against a scratch snapshots dir (never the live
   `~/.claude/cache-fix-snapshots`).
3. Emit per-request: which extensions mutated the body, a diff
   summary (reuse prefix-diff's computeDiff between pre- and
   post-pipeline body), and the pipeline's own telemetry
   (insertion-normalization action/resetReason, ladder placements,
   breakpoint injections).

Acceptance for any future extension change: replay the same corpus
with the flag OFF and ON; the report must show the intended
mutations and NOTHING else changed. This is the gate
deferred-tool-rewrite Phase B invented ad hoc ("one request, watch
for a 400") made systematic and free of live traffic.

## Stage 3: cache simulator (the predictive half)

`tools/cache-sim.mjs <captures.jsonl>`: model the API's prefix cache
over consecutive same-tenant requests:

- A request's cacheable prefix = bytes up to each cache_control
  marker, in order (system blocks, then messages up to each marked
  index).
- Hit size = the highest marker whose prefix is byte-identical to
  the previous request's; everything above it is re-written.
- Token counts approximated chars/4 — the absolute numbers are
  rough, but the tool's job is RELATIVE comparison: same corpus,
  pipeline-variant A vs B, predicted write-token delta.

Calibration check (build this into the tool's self-test): run over a
captured live window and compare predicted misses against the
worktime cold ledger for the same window — the tool is trustworthy
when it flags the same events, not when the token counts match
exactly.

## What this makes possible, concretely

- The volatile-block-pinning directive (sibling doc) validates
  against replayed real traffic before its flag ever flips live.
- The deferred-tool-rewrite Phase B wire-shape question becomes
  "replay 1000 real requests through the rewrite and inspect the
  output bodies", leaving only the final does-the-API-accept-it
  probe for live.
- Restart-bust investigation (open question): capture across a
  deliberate restart and diff the first post-restart request against
  the last pre-restart one — the answer is in the bytes.

## Known limits

- Replay covers request-side behavior only; extensions acting on
  responses (ttl-management's refresh decisions, stream rewrites)
  need response capture — out of scope here, note it and stop.
- A capture corpus records ONE pipeline's output context: captures
  taken with flag X on include X's mutations in CC's NEXT request
  (CC echoes history). Replaying with X off is therefore not a
  perfect counterfactual past the first divergent request. Fine for
  the acceptance gate (no unintended mutations); stated so nobody
  mistakes the simulator for a time machine.
