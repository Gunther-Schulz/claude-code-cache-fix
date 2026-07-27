# Directive (phase 2): insertion-to-append normalization

Status: DESIGN — do not implement until phase 1 (breakpoint ladder,
sibling directive) has shipped and its telemetry confirms the
insertion classes in live traffic.

## The observation this rests on

All four 2026-07-27 busts share one shape: Claude Code SPLICES a
late-arriving entry (queued operator message, hook attachment,
teammate notification, racing tool-result batch) into the transcript
at a position EARLIER than entries already sent to the API in prior
requests — observable as out-of-order timestamps around the
divergence index.

The splice is retroactive history rewriting, and it is CAUSALLY
WRONG: the assistant turns that sit after the splice point were
generated WITHOUT seeing the inserted entry. The true causal order
is arrival order — which is exactly what the API saw request by
request. The prefix cache is keyed on that arrival order. So the
harness lies about the past, and the cache bust is the price of the
lie.

## Design sketch

The proxy maintains a per-session CANONICAL history: append-only,
in first-seen order (session key = session-id header, same as
prefix-diff post-fc432bf). On each request:

1. Diff incoming messages[] against canonical (prefix-diff already
   computes this).
2. Divergence classified as INSERTION-ONLY (canonical is a
   subsequence of incoming; all new entries are user-role or
   system-role — never assistant) → re-serialize: forward canonical
   order + new entries appended in arrival order. The API sees an
   append; the cache survives fully.
3. Any other divergence (true edit, compaction, /rc, microcompact,
   context-editing, assistant-content change) → passthrough
   unchanged + RESET canonical to incoming (one honest bust,
   correctness over savings).
4. Mapping is persisted (same snapshots dir) so a proxy restart
   degrades to one reset-bust, never to wrong order.

Correctness argument: re-serialization restores the order the model
actually experienced — responses that reference an inserted message
were generated after its arrival, so arrival-order placement keeps
referent before reference. The harness's spliced order is the one
that breaks causality, not ours. Assistant messages are never
created, moved, or edited (thinking-signature and tool_use/result
adjacency invariants untouched; tool_result user-messages keep
their pairing because they arrive in order).

Known risks to resolve at implementation time:
- Entry identity: match by content hash + role, not index; identical
  duplicate messages need an occurrence counter.
- CC-side features that legitimately reorder (microcompact writes a
  summary + truncates) must hit rule 3, not rule 2 — the classifier
  must be conservative: when unsure, passthrough.
- Divergent proxy/harness views persist for the session lifetime;
  /resume replays from CC's transcript → canonical reset on session
  restart (natural, since cache is gone anyway).
- Token accounting: none — content is identical, only order differs.

## Alternative considered (cheaper, weaker): full marker ownership

The API allows 4 cache_control breakpoints. CC spends them on
system + rotating tail; our extensions add messages[0] + (phase 1)
one mid rung. A "full ownership" mode would strip and re-place ALL
message-level markers: system / rung@40% / rung@70% / tail —
worst-case insertion span drops from ~50% to ~30% of context.
Rejected as the primary path: still pays ~30% per event (a 580k
event still costs ~175k), and messages[0]'s marker genuinely earns
its slot on fresh sessions. Normalization pays ~0 per insertion
event. Keep this as fallback if normalization's classifier proves
too risky in practice.

## Upstream

This class should ultimately be fixed in Claude Code itself (queue
splice → append at delivery time). File the issue with the four
2026-07-27 forensic records (runbook + snapshots ledger) once the
ladder telemetry corroborates from a second session.
