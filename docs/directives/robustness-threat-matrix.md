# Cache-robustness threat matrix (proactive survey, 2026-07-27)

Purpose: enumerate bust classes BEYOND the four measured 2026-07-27
events, with per-class mitigation status. Consumed at directive
triage — each OPEN row is a candidate directive, ranked by
(probability × blast radius). Evidence discipline: a row is only
CLOSED by a shipped extension or a measured non-event; "should be
fine" closes nothing.

| # | Class | Mechanism | Status |
|---|---|---|---|
| 1 | Mid-history insertion (queue splice, notification, tool-result race, task_reminder) | entry inserted at index < tail | MITIGATED-half (ladder, this branch) → NEAR-ZERO (insertion-normalization, this branch) |
| 2 | TTL expiry on idle | 1h clock, no request | OPEN — phase-3 keepalive candidate (cost-positive only if operator returns; needs idle-detection + opt-in) |
| 3 | Proxy restart mid-session | fresh process emits different tools array | DOCUMENTED (FORK-NOTES rule: session-boundary restarts only). Residual: crash/OOM restarts are not schedulable → candidate: systemd unit drops in a marker file; statusline surfaces "proxy restarted — expect one bust" so it's at least attributed, never mysterious |
| 4 | Mutable tail entries (entry APPENDED then later MUTATED in place, e.g. a queued_command attachment whose origin field gets filled in a later request) | byte-drift at a mid index without reordering | OPEN — subset of insertion class but classifier sees it as rule-3 edit → full passthrough bust. Candidate: extend normalization with a MUTATION-TOLERANT identity (hash minus known-volatile fields) IF telemetry shows rule-3 resets whose diff is confined to known-volatile attachment fields. Needs evidence first. |
| 5 | System-prompt drift mid-session (env block timestamps, /config flips, plugin reload changing skills catalog) | system[] byte change → invalidates everything | PARTIAL: fingerprint-strip + identity-normalization + cc-version-normalize cover known volatile fields; /reload-plugins mid-session remains a true content change (honest bust). Candidate: none — content changes SHOULD bust; keep the strip list current via upstream-change-detection alarms. |
| 6 | Tool-schema drift mid-session (ToolSearch loading deferred tools, MCP server reconnect re-registering, schema version bump) | tools[] change → front invalidation | OPEN-verify: deferred-tools-restore exists — VERIFY it covers the MCP-reconnect case (today's thunderbird-mail server connected mid-session; check whether any tools[] diff followed). If uncovered: candidate tools-array pinning — forward the SESSION-FIRST tools serialization while semantically identical, reset on real change. |
| 7 | Cross-request nondeterminism in CC serialization (key order, whitespace) | byte-diff with identical semantics | CLOSED (sort-stabilization, tool-input-normalize) — keep regression tests |
| 8 | Subagent/session cross-contamination (shared key buckets) | wrong snapshot compared → misdiagnosis (not itself a bust) | CLOSED for keying (fc432bf); forensics-only class |
| 9 | Image/media re-encode drift (same screenshot, different bytes) | binary nondeterminism mid-history | CLOSED-presumed (image-strip/image-hash) — add one regression fixture if an image-bearing session ever shows a mid-history image diff |
| 10 | Compaction / context-editing / /rc mid-session | deliberate history rewrite | ACCEPTED-honest-bust (operator practice: /rc from session start; compaction unavoidable at window limit). Normalization rule 3 must keep passing these through — regression-tested. |
| 11 | Model switch / fallback reroute (server-side fallback serves a different model mid-conversation) | cache is model-keyed | ACCEPTED (rare, deliberate). Watch: if fast-mode/fallback ever flips model_id silently, worktime --cold shows cause=model — attribution exists. |
| 12 | Thinking-block replay drift (signature blocks echoed back subtly differently after harness upgrade) | assistant-content byte drift mid-history | OPEN-watch: no measured instance; thinking-block-sanitize covers known shapes. Alarm-only: prefix-diff cause=messages@N(assistant) with no insertion is this class's signature — add it to the runbook's pattern list. |

## Priority ranking (probability × radius, given current traffic)

1. Class 4 (mutable tail) — same session that produced today's events
   likely produces this; telemetry from normalization will show it as
   otherwise-unexplained rule-3 resets. ZERO build cost now: the
   telemetry line already captures resetReason.
2. Class 6 (tools drift via MCP reconnect) — one verification pass
   against today's snapshots ledger; build only if uncovered.
3. Class 3 residual (crash restarts) — tiny: marker file + statusline
   note, pure attribution.
4. Class 2 (TTL keepalive) — real token math needed; only if idle
   patterns justify.

## Bookmark-ladder disposition (operator question 2026-07-27)

KEEP the ladder alongside normalization. Reasons:
(a) Defense-in-depth for classifier misses: every rule-3 reset —
    legitimate or classifier-too-conservative — still pays a span;
    the rung halves it. Classes 4, 10, and any unknown-unknown land
    there.
(b) Zero marginal cost: one otherwise-unused breakpoint slot; no-ops
    at budget; inert without its env flag.
(c) Independent failure domains: normalization depends on persisted
    canonical state (resets on corruption/restart); the ladder is
    stateless per-request math and keeps working through exactly the
    events that reset normalization.
Revisit only if a 4th breakpoint consumer ever appears and needs the
slot back — that is the single scenario where ladder retirement is
on the table.
