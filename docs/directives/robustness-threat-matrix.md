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
| 3 | Proxy restart mid-session | fresh process emits a DIFFERENT serialization of the same request (tools array order/normalization state lost) | DOCUMENTED (session-boundary rule). **UPGRADE CANDIDATE — full prevention:** the restart bust is OUR artifact, not physics — the request content is identical; only the proxy's serialization state differs. Persist every order-affecting normalization decision (sort orders, insertion-normalization canonical, ladder rungs — the latter two already persist) so a restarted proxy reproduces BYTE-IDENTICAL output. Then scheduled + crash restarts both become cache-transparent, and the FORK-NOTES restart rule relaxes to "restart freely". Marker-file attribution remains as the fallback for whatever residue testing finds. |
| 4 | Mutable tail entries (entry APPENDED then later MUTATED in place, e.g. a queued_command attachment whose origin field gets filled in a later request) | byte-drift at a mid index without reordering | OPEN — subset of insertion class but classifier sees it as rule-3 edit → full passthrough bust. Candidate: extend normalization with a MUTATION-TOLERANT identity (hash minus known-volatile fields) IF telemetry shows rule-3 resets whose diff is confined to known-volatile attachment fields. Needs evidence first. |
| 5 | System-prompt drift mid-session (env block timestamps, /config flips, plugin reload changing skills catalog) | system[] byte change → invalidates everything | PARTIAL: fingerprint-strip + identity-normalization + cc-version-normalize cover known volatile fields; /reload-plugins mid-session remains a true content change (honest bust). Candidate: none — content changes SHOULD bust; keep the strip list current via upstream-change-detection alarms. |
| 6 | Tool-schema drift mid-session (ToolSearch loading deferred tools, MCP reconnect, schema bump) | tools[] change → front invalidation (tools render before system+messages; NO breakpoint can survive it) | **OBSERVED, CAUSE NOT ISOLATED** (2026-07-27 12:47:56, the 175k event). The ledger row for that request carries TWO independent causes, not one: `tools[SendUserFile:reordered, Skill:reordered, ToolSearch:reordered, Workflow:reordered, Write:reordered, SendMessage:added]` **and** `messages@165(user)`. Either could invalidate the prefix on its own, so this event is consistent with the row's mechanism but does not establish it — ranking the co-occurring user injection "secondary" had no basis in the data. Note also that the tools delta is NOT a pure addition (five entries reordered), which is the precondition Phase A of the deferred-tool directive assumes; an event that fails the precondition cannot be the evidence for it. What would isolate the cause: a tools-only delta with no message divergence in the same request. deferred-tools-restore did NOT absorb it. **SPEC CONTRADICTION: Anthropic's own Claude Code caching doc states deferred-tool loads "only append new content and don't disturb anything already cached" — the measured event contradicts the doc.** Upstream bug evidence (file with the 12:47:56 ledger record + doc quote). Mitigation ladder, strongest first: (a) **rewrite-to-deferred (full prevention candidate):** the API supports defer_loading + tool_addition system-message blocks (mid-conversation tool changes) — the proxy can hold tools[] byte-stable and deliver a newly-loaded schema as an appended tool_addition block instead; investigate feasibility on our API surface before building. (b) session-start PRELOAD list for near-certain tools (SendMessage in teammate-using sessions) — cheap, ships behaviorally today. (c) ride-along scheduling — LAST RESort for whatever residue (a)+(b) leave, not a primary strategy (operator: unavoidable-break framing rejected; treat every non-operator-initiated bust as a prevention target). |
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

## Bookmark-ladder disposition — REVERSED 2026-07-28 (measured)

The KEEP ruling below is **refuted and the ladder is removed**. Its premise
(b) "zero marginal cost: one otherwise-unused breakpoint slot" was false:
with the slot actually free the ladder produced **57 stability violations on
session 35d72503 and 8 on 58c979ce**, because re-placing a rung moves a
cache_control marker onto a different mid-history message — a mid-history
byte change, which is the very thing it was meant to bound. Premise (a),
defense-in-depth, fails with it: a defense that creates the failure is not
depth. Premise (c), independent failure domains, is true and irrelevant.

Also wrong: "Revisit only if a 4th breakpoint consumer ever appears and needs
the slot back." The trigger was not competition for the slot — it was
measuring what the ladder does when it finally gets to run. An unused
mitigation had never been observed in action, and its disposition was decided
on reasoning alone.

Measured resolution: the 4th slot stays EMPTY (0 violations, both corpora).
Retirement details and the re-adoption bar:
docs/directives/proxy-mid-history-breakpoint-ladder.md.

### Original ruling (superseded, kept for the record)

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

## Second enumeration pass (2026-07-27, method-corrected)

Method correction (operator-prompted): enumerate the SERIALIZATION
SURFACE, not event sources — for each request region (params / tools /
system / messages) × each operation (add, remove, reorder, mutate) ×
each initiator (operator / assistant / harness / upstream): can it
occur without deliberate operator intent, what does it cost, is it
covered? First pass enumerated "things that happen" and missed
inverse operations; the 766k event (tools:REMOVE) was a predictable
cell left blank.

New rows found by the matrix pass:

| # | Class | Evidence/cost | Disposition |
|---|---|---|---|
| 13 | tools:REMOVE + placeholder reorder — harness GC of a loaded deferred tool on skills/tool-list updates | MEASURED 766k (2026-07-27 15:36, CronCreate removed + DeferredToolPlaceholder reordered, no ToolSearch nearby; skills-update system events in-window) | BUILD: extend deferred-tool-rewrite — hold removed tools in the serialized array until session end (inert entries cost ~0), pin tool order to first-seen |
| 14 | Sidecar requests sharing the session-id header (title-generation etc.) pollute per-session state keyed on that header | OBSERVED in today's ledger: alternating identity blocks/params under one key — prefix-diff attribution noise; for insertion-normalization this thrashes canonical (reset on every sidecar; degrades to no-op, never corrupts) | BUILD (pre-activation): sub-key persisted state by (session-id, system-prompt-hash) in insertion-normalization + prefix-diff |
| 15 | Subagent 5m TTL | CLOSED-already-shipped (STOP finding 2026-07-27: ttl-management.mjs defaults TTL_SUBAGENT="1h" via detectRequestType, issue #14, predates this row — row was written without cross-referencing the extension inventory; ttl-tier-detect carries the overage exception). Residual OPEN (narrow): subagent-scoped telemetry (small ticket). OPERATOR DECISION 2026-07-27: subagent TTL pinned to 5m via unit env (CACHE_FIX_TTL_SUBAGENT=5m) — cost-first (1h writes 2x, assumed to scale into sub weighting; no long silent steps in operator profile); telemetry may measure, any extension is a discussion item on evidence, never automatic. Unbridged verification gap: no captured-traffic confirmation that subagent requests arrive without explicit ttl (snapshot format drops ttl fields) |
| 16 | Safety-classifier fallback reroute (fable→fallback model) mid-conversation = model change = full bust, harness-initiated | Documented harness behavior; not yet observed here | COVERED operator-side (correction 2026-07-27: an operator hook already catches the fallback reroute and stops the session) + ATTRIBUTE fallback (worktime cause=model). No proxy mitigation possible or needed |
| 17 | params region: opusplan plan-mode model toggle | N/A for this operator (fable sessions) | N/A note only |

Residual after rows 13-17 land: mutable-tail (row 4, instrumented),
upstream-bug filing, and the honest operator-initiated set.

## Third enumeration pass (2026-07-27, docs-list × coverage cross-check)

Method: took Claude Code's OWN documented cache-invalidation list +
the grounded request shape (proxy snapshots) and crossed every entry
against current coverage. New findings:

| # | Class | Status |
|---|---|---|
| 18 | Diagnostic blind spots in prefix-diff | CLOSED (323af49): output_config/speed/betas tracked, anthropic-beta header-set diffed (cause `header:anthropic-beta[+..,-..]`), old-snapshot migration-safe, 71/71. Residual (row-14 sibling, attribution-noise only): prefix-diff's resolveSessionKey still keys on bare session-id — sidecars share the bucket; sub-keying deferred to a small follow-up (diagnostic-only, no correctness cost) |
| 19 | Deny-rule tool removal mid-session (bare-name deny removes the tool definition → tools[] change, docs-documented bust) | COVERED as serialization by row 13's hold (definition stays in array; permission enforcement is harness-side at call time — holding is semantically safe). Note: operator-initiated, but easy to do unknowingly |
| 20 | Cross-machine /resume: system prompt embeds cwd/platform/git snapshot → resuming a session on ANOTHER machine is a guaranteed full re-read (docs: cache scoped to machine+directory) | ACCEPT + DOCUMENT (token-cost-model.md): start fresh sessions on the new PC, never resume old ones expecting warm cache. Timely: operator migrating machines |
| 21 | Server-side cache eviction before TTL (capacity eviction, upstream infra) | ACCEPT, DO NOT ATTRIBUTE: no local attribution is possible. **`other`/`unavailable` is NOT evidence for this row.** `other` is a degraded DEFAULT — `claude-worktime.sh:1662` sets it when `cache_miss_reason` could not be read at all — so it means "no cause available", never "known causes tested and rejected". Treating it as confirmation picks one hypothesis from several unruled-out ones (proxy defect, an untracked class, or a cause sitting in the transcript that the statusline's read missed — all three observed 2026-07-27, when a bust displayed `other` while the transcript held `tools_changed`). Undiagnosed busts belong in an unattributed bucket that stays OPEN, not closed onto this row. No local mitigation exists either way |

Convergence note (operator-prompted, honest): enumeration is
asymptotic — three passes, three methods, each found cells the prior
missed. What makes it CONVERGE is not better imagination but
attribution telemetry: every bust now either matches a named row or
surfaces as unattributed — and an unattributed bust is itself the
alarm that mints the next row. The guarantee is "no SILENT gaps",
not "no gaps".
