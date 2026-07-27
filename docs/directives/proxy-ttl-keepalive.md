# Directive: idle TTL keepalive (class 2)

Goal: no cache expiry during operator think-time. Operator math is
right: with the subscription's 1h TTL, ONE ping near the 50-minute
idle mark re-reads the prefix at ~0.1× (≈60k-equiv at 600k context)
vs ~2× write to re-establish (≈1.2M-equiv) — a ping is ~5% of the
bust it prevents. 4 pings ≈ 4h of coverage.

Design (proxy-side extension `ttl-keepalive.mjs`):
- Idle detection per session key: proxy records last-request ts; a
  timer fires at CACHE_FIX_KEEPALIVE_AT (default 3000s = 50min)
  after the LAST main-thread request if no new one arrived.
- Ping = replay of the last request VERBATIM with max_tokens
  forced to the minimum viable: max_tokens:0 where the request's
  thinking config allows it; on models where thinking cannot be
  disabled (fable-5: thinking always-on → max_tokens:0 rejected),
  use max_tokens:1 (bills 1 output token). Strip stream. Discard
  the response entirely.
- Caps: CACHE_FIX_KEEPALIVE_MAX_PINGS (default 4) consecutive
  pings without a real request, then stop (≈4h); reset counter on
  any real request. Main-thread sessions only (subagents run 5m
  TTL — out of scope). Disabled automatically if the last real
  response carried an overage/5m-TTL signal (ttl-tier-detect
  already classifies this) — pinging a 5m cache at 50min is dead
  weight, and pinging every <5m is out of the question.
- Env gates: CACHE_FIX_KEEPALIVE=1 opt-in; _AT; _MAX_PINGS.
- Telemetry: JSONL line per ping {ts, key, sid, ctx, result}.

ToS note (recorded, operator-reviewed): pre-warm requests are a
documented API pattern; automation through Anthropic's own tooling
is permitted by the Consumer Terms carve-out. A proxy-initiated
replay is one step removed from "the real CLI initiated it" — gray
zone acknowledged; opt-in flag + low cap keeps usage proportionate.
Operator accepts on current knowledge (2026-07-27).
