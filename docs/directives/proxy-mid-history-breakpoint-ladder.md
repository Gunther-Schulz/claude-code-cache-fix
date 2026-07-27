# Directive: mid-history breakpoint ladder (insertion-bust mitigation)

## Failure modes this mitigates (measured 2026-07-27, session f4d154fc)

Four `messages_changed` full-rewrite busts in one fable-5 session,
total ~1.06M cache-write tokens, none operator-caused:

1. **Mid-flight injection/reorder** (12:44:41 + 12:44:50 UTC, ~153k
   cc each, identical `mtok` 126,243, `flight=true`): parallel
   tool-result batches raced a Skill-launch injection; history
   diverged at the same mid-history index on two successive requests.
2. **Teammate/queue injection mid-turn** (12:47:56, 175k cc): an
   idle-notification envelope was inserted as a user turn 7s before
   the bust; (14:05:06, **580k cc**, `mtok` 504,607): queued operator
   message + hook `persisted-output` attachment entries landed
   mid-turn — transcript shows `queue-operation` / `attachment`
   entries with OUT-OF-ORDER timestamps around the divergence point
   (e.g. 14:01:28 attachment logged after 14:01:35 entries).

Mechanism, both cases: an entry INSERTED (not appended) at history
index N invalidates the prefix from N. Claude Code's cache_control
markers ride at the TAIL (rotating last-user-message placement, cf.
cache-control-normalize) plus messages[0] (our breakpoint #3) and
system. When N is far behind the tail markers, no surviving
breakpoint exists between N and the tail → the API re-writes
everything from N — at 500k+ context, a 500k+ write at premium.

## Design: ladder extension (`mid-history-breakpoint-ladder.mjs`)

Keep one or two cache_control markers PINNED at stable mid-history
depths so an insertion at index N still cache-READS up to the
highest ladder rung ≤ N, converting a full rewrite into a partial
one bounded by the rung spacing.

- Placement: rungs at ~50% and ~75% of the messages array (block
  boundaries on user-role messages only — assistant blocks carry
  thinking signatures; do not touch), computed once and then STICKY:
  a rung, once placed at message index K, stays on the identical
  message while that message remains byte-identical request-over-
  request (sticky check via content hash, same idiom as prefix-diff
  snapshots). Rungs advance (re-place at new 50/75% depths) only
  when the tail has grown ≥ CACHE_FIX_LADDER_ADVANCE (default 40)
  messages past the rung — advancing costs one partial re-write of
  the span above the rung, so it must be rare.
- Budget: the API allows 4 breakpoints total. Current spend: system
  (CC), messages[0] (#3, our extension), tail (canonical, cache-
  control-normalize). That leaves ONE free slot → ship the 50% rung
  first (`CACHE_FIX_LADDER_RUNGS=1` default); the 75% rung only if
  telemetry shows tail-adjacent insertions dominate (would require
  dropping to a single tail marker — separate decision, do not
  bundle).
- Order: after messages-cache-breakpoint (410), before
  ttl-management (500) → order 420. It must see the normalized
  marker layout and must not fight the canonical tail placement.
- Never *remove* an existing marker; if 4 are already present,
  no-op and log (`ladder=skipped reason=budget`).
- Env gates, same idiom as sibling extensions:
  `CACHE_FIX_LADDER=1` (opt-in), `CACHE_FIX_LADDER_RUNGS`,
  `CACHE_FIX_LADDER_ADVANCE`, dump path for diagnostics.
- Telemetry: one JSONL line per request into the existing
  cache-fix-snapshots dir (`ladder` field: rung indices + sticky/
  advanced/skipped) so `claude-worktime --cold` post-mortems can
  join bust events against rung positions.

## Acceptance criteria

1. Unit tests: rung placement math (sticky under append-only growth;
   advance after threshold; budget no-op at 4 markers; user-role-only
   targeting; byte-identity check).
2. Replay test: feed the recorded 14:05 request pair (mirror
   `2026-07-27T10-37-22-138Z-7.jsonl`, divergence at index 469 of
   ~470) through the pipeline with ladder on → expected cache read
   ≥ the 50%-rung span instead of `mtok` 504,607.
3. No regression in prefix-diff (its snapshots must ignore
   proxy-added markers — verify cache-control-normalize ordering
   still strips scattered markers first).
4. Docs: this directive referenced from README extension table.

## Explicit non-goals

- Not trying to PREVENT the insertions (harness behavior, upstream
  Claude Code #27048 class — out of proxy's control).
- Not reordering or rewriting message history (correctness risk;
  the proxy only adds/keeps markers).
- No change to the rotating tail placement in this directive.

## Rollout

Implement on this branch, PR per repo workflow (bot identity, Codex
review). Enable via env in the systemd unit only at a SESSION
BOUNDARY — the FORK-NOTES restart rule stands: a proxy restart is
itself a 225k-class bust for live sessions. Do NOT restart today.
