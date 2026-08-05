# Cache-robustness threat matrix (proactive survey, 2026-07-27)

Purpose: enumerate bust classes BEYOND the four measured 2026-07-27
events, with per-class mitigation status. Consumed at directive
triage — each OPEN row is a candidate directive, ranked by
(probability × blast radius). Evidence discipline: a row is only
CLOSED by a shipped extension or a measured non-event; "should be
fine" closes nothing.

Mitigation policy (operator ruling; first recorded at row 6's
ladder, elevated here 2026-07-30): ANY non-operator-initiated bust
is a prevention target regardless of size — 10k and 500k are the
same class, and cost never gates whether mitigation work happens.
The only per-class deliberation is MITIGABILITY: can the class be
absorbed without risking conversation fidelity (safety outranks
cache). Detectors and fire counts supply specimens and retirement
evidence — never a worthiness threshold.

Retirement policy (2026-08-02, the other end of the Mitigation policy
above): upstream fixes CC bugs, so a mitigation can stop earning its
keep — and "it has been quiet lately" retires nothing. A retirement
carries three things, all three or it does not happen:

  (a) **Ledger evidence.** `~/.claude/cache-fix-fire-ledger.jsonl`
      (written per sweep by `tools/gate-live.mjs --fire-ledger`, read by
      `tools/shape-verdicts.mjs`'s `fire-ledger` verdict) carries two
      columns per class: RAW — what CC did, measured off the captured
      request bytes, which keeps counting with the gate OFF — and
      ABSORBED — what the mitigation did about it. The claim is
      **"0 RAW occurrences across N sweeps spanning cc-versions >= X,
      where X ships the fix"**, quoted with those numbers. A quiet
      ABSORBED column alone is not it: absorbed goes quiet the moment a
      gate flips, which is why RAW is the column that decides. `null` in
      either column is not 0 — it means nobody measured, and a sweep
      that did not measure cannot contribute to N.
  (b) **A named upstream ref** — issue closed, changelog entry, or the
      version that ships the fix. The CC-side half of the basis: without
      it the quiet is a coincidence of one machine's traffic. Row 4's
      candidate is `anthropics/claude-code#81077` (PostToolUse
      additionalContext re-serialized between turns), logged 2026-08-01.
  (c) **Gate OFF, never code deletion.** Retirement is reversible by
      construction — the built-and-dormant pattern. The re-add trigger is
      mechanical: the RAW column returns after retirement, which is
      exactly why RAW keeps being measured with the gate off. Re-enabling
      takes a fresh acceptance entry, like every other REMOVED entry
      whose re-enable "verlangt eine neue Abnahme".

Not in scope here, and open: per-row retire triggers (each row naming
its own quiet-threshold and upstream ref). The policy is the standing
rule; the rows have not been walked against it.

Grounding policy for mitigation DESIGN (operator ruling 2026-07-31):
the goal is mitigation, and the path to design-complete is walked with
every tool available — parking for missing evidence is not an option, it
is a work item. Where the instruments cannot answer the question, the
instrument is built FIRST and the design waits on it; "we lack evidence"
names the next build, never a shelf.

Byte-match test — the design gate for any NORMALIZATION (2026-07-31,
learned by nearly shipping past it): a normalization that rewrites CC's
form into a canonical one must produce EXACTLY the bytes CC itself emits
in the form being canonicalized toward. Verify by reconstructing the
canonical form from the earlier request and comparing it byte-for-byte
against the later request's real bytes, on EVERY occurrence in the
capture — not one. A rule proven on a single instance is not proven: the
row-4 reconstruction matched host 97 exactly and failed host 99, where
CC's later message carried content that did not exist at the earlier
request. Absent the second check, the mitigation ships looking correct
and moves the bust instead of absorbing it — a normalization whose output
differs from the client's own is itself a mid-history rewrite, in our
name rather than CC's. Corollary for scoping: when the later form carries
NEW information rather than re-serialized information, no normalization
can absorb it; that is a different class and gets booked as one, never
folded into the normalization's claim.

| # | Class | Mechanism | Status |
|---|---|---|---|
| 1 | Mid-history insertion (queue splice, notification, tool-result race, task_reminder) | entry inserted at index < tail | MITIGATED-half (ladder, this branch) → NEAR-ZERO (insertion-normalization, this branch) |
| 2 | TTL expiry on idle | 1h clock, no request | OPEN — phase-3 keepalive candidate (cost-positive only if operator returns; needs idle-detection + opt-in) |
| 3 | Proxy restart mid-session | fresh process emits a DIFFERENT serialization of the same request (tools array order/normalization state lost) | DOCUMENTED (session-boundary rule). **UPGRADE CANDIDATE — full prevention:** the restart bust is OUR artifact, not physics — the request content is identical; only the proxy's serialization state differs. Persist every order-affecting normalization decision (sort orders, insertion-normalization canonical, ladder rungs — the latter two already persist) so a restarted proxy reproduces BYTE-IDENTICAL output. Then scheduled + crash restarts both become cache-transparent, and the FORK-NOTES restart rule relaxes to "restart freely". Marker-file attribution remains as the fallback for whatever residue testing finds. **STATUS 2026-07-28: the persistence half is DONE and offline-verified, the live half is NOT.** tools/replay.mjs grew `--restart-at N` (fresh module registry, state dir intact = a real restart) and `--wipe-state-at N` (state dir gone = losing the snapshots, a different event); conflating the two measures a disaster and calls it a restart. Offline over a 602-request capture: restart-at is byte-identical to no restart (0 violations, 57 resets either way), wipe-state-at costs 1 violation. So the state that matters already persists and is re-read per request. The ONE live restart since (17:08) is NOT evidence either way — it flipped three gates at the same time, and VOLATILE_PIN changes the canonical identity scheme, so it paid the documented one-time mode-flip reset (605,220 -> 15,132 cr, 678,522 cc, first request `cause=messages@4`). Two variables changed, one conclusion drawn: confounded. **CLOSED 2026-07-28 19:38 — a live restart cost NOTHING.** Taken at the free opportunity as planned (a restart needed anyway, to pick up an upstream merge; gates unchanged since the previous start). Session 58c979ce was ~805k deep: `cache_read` 805,801 immediately before, 809,920 with `cc=383` on the first request after — it climbed straight through the process restart, and `claude-worktime --cold` recorded no hit (last remained 16:31:06, over an hour earlier). Two independent lines now agree: offline replay (`--restart-at` byte-identical to no restart) and this live observation. The persisted-state design works — every cache-relevant decision is written to disk and re-read per request, so a fresh process reproduces byte-identical output. **AMENDED 2026-07-28 21:46 — "restart freely" holds only for a restart that carries NO change to state KEYS or freeze logic.** A restart with an unchanged key set is cache-free (measured twice). A restart that changes how persisted state is KEYED is not: every baseline becomes unreachable, so the first request per conversation forwards CC's raw array instead of the frozen one, and that is a guaranteed `tools_changed` bust. Measured live: the deferred-tool-rewrite conversation sub-key (row 21's fix) shipped at 21:45:14 and the very next request on the new PID logged `tools=DIFFER cause=tools[Write:reordered, WebFetch:reordered, WebSearch:reordered, web_search:removed] | header:anthropic-beta[-mid-conversation-tool-changes]` while CC's own tools count was a steady 14 across the boundary — the change was entirely ours. 177k in an unrelated live session. It self-heals on the following request (`tools=match` from 21:47:30) and is one-time per conversation, but it is a real cost and it is predictable, so it belongs at a session boundary and should be stated BEFORE the restart, not diagnosed after. The general rule: a change to any state KEY invalidates every baseline that key addressed, and the freeze that made bytes stable is exactly what stops being applied. **The FORK-NOTES "never restart mid-session" rule is obsolete for ordinary restarts**; restart freely, and treat a bust around a restart as evidence of something else (a CONFIG change flipped at the same time is the trap — see the 17:08 restart, which flipped three gates and paid VOLATILE_PIN's documented one-time canon mode change, settling nothing). Residual caveat: one live observation, and code did change alongside it — it simply happened to be output-neutral on that traffic. Strongly supported, not proven. |
| 4 | Mutable tail entries (entry APPENDED then later MUTATED in place, e.g. a queued_command attachment whose origin field gets filled in a later request) | byte-drift at a mid index without reordering | **OPEN — RE-OPENED 2026-07-31** (a non-tail instance was measured; full evidence at the end of this row). Prior status, kept for the record: **CLOSED — ACCEPTED-cheap** (2026-07-28; the evidence arrived and it says do NOT build). The row asked for telemetry first; the 940-request corpus supplies it. The class is real but rarer and far cheaper than assumed: **5 of 838 same-conversation pairs (0.6%), and all 5 mutate the LAST message — `idx == length-1` in every case, all `role=user`.** The cause is not a field being filled in: CC appends content BLOCKS into the existing final user message rather than creating a new one — four are `[Request interrupted by user]` plus the follow-up text, the fifth is the compaction instruction. The row's premise was "byte-drift at a MID index"; measured, the drift is never mid-history. A cache keys on the longest identical prefix, so rewriting the final message re-bills that message alone and everything before it still hits. On our side: **0 insertion-normalization resets, 0 stability violations** across the corpus — the classifier forwards these untouched, which is correct. A mutation-tolerant identity would buy roughly one message and introduce a real failure mode (a genuine tail edit silently forwarded stale). Re-open only if a NON-tail instance is measured — `--census` reports the class as `replace/edit` and `tools/gate-live.mjs` runs daily, so it would surface on its own. **← RE-OPENED 2026-07-31 on that stated condition.** A non-tail instance was measured, live, on the operator's own session: `--census --gates-from-capture` over `s-captureF…-requests.jsonl` reports `replace/edit … n=100->101 edit@98 of 123 [anchor-25] ~75 kB 2026-07-31T11:41:05.778Z` — ~25 messages behind the anchor, not `idx == length-1`. Confirmed independently of the census, by diffing the raw pre-pipeline captures of the two adjacent requests: the message at array position ~99 of 127 lost two trailing `text` blocks (hook context: `PreToolUse:Agent`, `PreToolUse:Bash`) which CC re-emitted as standalone `role:"system"` entries — an in-place content mutation, mid-history. Cost, measured end-to-end: the transcript's own `cache_miss_reason` for the resulting turn reads `messages_changed / cache_missed_input_tokens: 105006`. The closure's other leg is superseded rather than refuted: it argued partly from cheapness ("far cheaper than assumed"), and the Mitigation policy elevated 2026-07-30 — AFTER this 2026-07-28 closure — rules that cost never gates mitigation work. Calibration, so the re-open is not over-read: of 5 MID-HISTORY `replace/edit`s in this capture, only this one is deep (the other four sit 1–2 messages off the tail, ~1–5 kB); and 14/179 pairs (7.8%) vs the closure corpus's 5/838 (0.6%) is ONE session against 940 requests — a signal to re-measure the rate, not a rate. Distinct from row 1: insertion-normalization targets a mid-history SPLICE (its own header: "re-serialize a mid-history splice back into arrival order"); this is a REPLACE of an existing message's content, never in that extension's scope — `--census` accordingly counts it in neither the mitigable denominator nor the absorbed numerator. **MITIGABILITY ANSWERED YES, same day** — the only deliberation this matrix's Mitigation policy allows. The mutation is a deterministic CONTAINER change, not a content change: CC first appends hook additional-context as text blocks INSIDE the preceding message, each wrapped `<system-reminder>\n…\n</system-reminder>` (msg 97: two blocks, 387 + 313 chars), then later emits the same text as ONE standalone `role:"system"` message after the host (idx 98, 627 chars) with the wrappers STRIPPED and the blocks JOINED by `\n\n`. Not byte-identical across the move, and that transformation fully accounts for the difference. Both forms carry identical INFORMATION, so canonicalizing changes serialization only and never what the model reads — the same safety argument row 1's insertion-normalization already makes for the splice direction, mirrored to the replace direction. Design is settled and booked READY in BACKLOG.md: canonicalize FORWARD to the standalone form on every request, so the join is never ambiguously re-split and the A→B transition changes no bytes. This also retires the closure's remaining objection — "a mutation-tolerant identity would buy roughly one message" holds for a TAIL edit and not here, where it buys everything after index 97 of 127 (~75 kB measured). Related: `role:"system"` inside `messages[]` is legitimate wire shape (the `mid-conversation-tool-changes` beta's format, `deferred-tool-rewrite.mjs:16,381`), not an anomaly. **ROOT CAUSE FOUND + FIXED 2026-07-31 (059aae3) — and it was not a scope gap.** insertion-normalization's migrated-duplicate suppression (#76606, decision B) already covered this exact shape. Its telemetry for the busting request reads `action=reset resetReason=not-subsequence pinned=2 suppressed=0`: the pins were restored and the suppression pass was SKIPPED, because `resetKeepingPins` returns before it. The suppression was therefore disarmed by ANY reset — at this file's own measured reset rate, roughly one request in three — so it read as shipped and behaved as absent. Fixed by running suppression on the reset path, reusing the pins it has just restored. Measured on the motivating pair: divergence 97 -> 100, re-bill ~104 kB -> ~96 kB. A second extension (`hook-context-normalize`) was built first, measured WORSE (97 -> 101), and was reverted — the diagnosis behind it came from reading an extension's header instead of its telemetry. Method note worth more than the fix: the header said the class was out of scope, the telemetry said the mechanism ran and was skipped. **Read what the mechanism DID, not what it says it does.** Residual, still OPEN: divergence now lands at 100, the remainder being row 22's pruning plus the EXTENDED class — neither absorbable by a serialization rule. **RESIDUAL RE-GRADED 2026-07-31 (same day, later): both halves of that sentence fell.** Row 22's pruning is a measured non-event on its own (see row 22); the EXTENDED class is absorbable after all — not by predicting bytes but by refusing the edit: EXTENDED is definitionally append-shaped (`reminder-migration-census.mjs:96`, `actual.startsWith(reconstructed)`), so the delta is byte-computable and relocatable to a frozen position (READY item in BACKLOG.md). Also measured on this bust's transcript usage: `cache_read 15,214 / cache_creation 123,032` — the divergence at msg 98 of 124 re-billed nearly the WHOLE context, not its ~19k-token suffix, because no breakpoint survives between messages[0] and the tail. **Billing is all-or-nothing per request**: the replay divergence index measures absorption progress, never live cost — a request with ANY unabsorbed mid-history divergence pays ~full price, so per-request total absorption is the only state that pays. PREMISE FALSIFIED 2026-08-02 (dispatcher-measured, raw request dump): this row's "wrappers STRIPPED and the blocks JOINED with `\n\n`" does NOT hold universally — capture s-captureG (2026-08-02T08:06:10.259Z host=30, and 08:24:18.702Z host=74) emits the migrated standalone at host+1 as `role:"system"` with STRING content, 364 chars, `<system-reminder>` WRAPPER RETAINED, whose inner text is byte-equal (327 ch) to the canonical reconstruction. The rule is right about the TEXT and wrong about the ENVELOPE for that shape, so a forward-canonicalizing normalization would MOVE the bust there rather than absorb it (the census's own MISMATCH verdict said so and was right). Full consequence list and the open questions: BACKLOG.md, "PREMISE FALSIFIED" entry. SCOPE NARROWED 2026-08-02 (prune dossier, transcript-verified): all-or-nothing holds when a miss FIRES; instrument-visible divergence does not imply a miss — 14 interior `role:"system"` removals (f94e53ce, div=4) measured billing-free, so at least that divergence class costs nothing and needs no absorption (BACKLOG, reframed interior-prunes entry: what the cache actually keys on is the open question). |
| 5 | System-prompt drift mid-session (env block timestamps, /config flips, plugin reload changing skills catalog) | system[] byte change → invalidates everything | PARTIAL: fingerprint-strip + identity-normalization + cc-version-normalize cover known volatile fields; /reload-plugins mid-session remains a true content change (honest bust). Candidate: none — content changes SHOULD bust; keep the strip list current via upstream-change-detection alarms. |
| 6 | Tool-schema drift mid-session (ToolSearch loading deferred tools, MCP reconnect, schema bump) | tools[] change → front invalidation (tools render before system+messages; NO breakpoint can survive it) | **OBSERVED, CAUSE NOT ISOLATED** (2026-07-27 12:47:56, the 175k event). The ledger row for that request carries TWO independent causes, not one: `tools[SendUserFile:reordered, Skill:reordered, ToolSearch:reordered, Workflow:reordered, Write:reordered, SendMessage:added]` **and** `messages@165(user)`. Either could invalidate the prefix on its own, so this event is consistent with the row's mechanism but does not establish it — ranking the co-occurring user injection "secondary" had no basis in the data. Note also that the tools delta is NOT a pure addition (five entries reordered), which is the precondition Phase A of the deferred-tool directive assumes; an event that fails the precondition cannot be the evidence for it. What would isolate the cause: a tools-only delta with no message divergence in the same request. deferred-tools-restore did NOT absorb it. **SPEC CONTRADICTION: Anthropic's own Claude Code caching doc states deferred-tool loads "only append new content and don't disturb anything already cached" — the measured event contradicts the doc.** Upstream bug evidence (file with the 12:47:56 ledger record + doc quote). **Ladder step (a) is BUILT since 2026-07-28** — `deferred-tool-rewrite.mjs` (gate `CACHE_FIX_TOOL_REWRITE`, active) holds `tools[]` byte-stable and delivers new schemas as appended `tool_addition` blocks; the feasibility question this row posed is answered and shipped. What remains open is only the ATTRIBUTION: the 12:47:56 event still carries two independent causes, and no tools-only delta has been isolated. **MECHANIZED and MEASURED 2026-07-30** (BACKLOG "Row 6's isolating query is built and unread (Q3)"): `findToolsDeltas` now rides every `--census` run and `tools/gate-live.mjs`'s status row carries a compact summary of it (`toolsDeltas: {count, toolsOnly, forwardedStable, leaked}`) so the daily sweep answers this row without a hand-run. Measured directly (`node --max-old-space-size=3072 tools/replay.mjs <capture> --gates-from-capture --census`, all 9 boot-declared gates confirmed set including `CACHE_FIX_TOOL_REWRITE=1`), captures s-4b6a435234bf (1492 same-conversation pairs) and s-97097e027ac0 (640 pairs) — capture keys tokenized 2026-08-01 via `sidToken` (tools/harvest.mjs), the same `s-<12hex>` form the committed fixtures carry, applied to every mention of these two captures in this file: the isolating pair the row's opening 175k event could not establish is now directly observable in quantity, not rare — s-4b6a435234bf: 23 tools[] deltas, 15 tools-ONLY (tools moved, messages did not); s-97097e027ac0: 37 deltas, 33 tools-ONLY. That resolves the CLASS question (a pure tools-only invalidation event is common on this fleet) without re-examining the specific 12:47:56 event, which still carries its original two-cause ambiguity untouched by this measurement. **AMBIGUITY RESOLVED same day (bytes probe): census framing gap, NOT a regression.** `forwardedStable` compares whole-array signatures across pairs where a GENUINE new tool was announced — 100% of "unstable" pairs (25/25 and 36/36 on the re-run, zero counterexamples) carry `newNames.length>0`, and the single "stable" row is exactly the no-new-tool case. Byte check on three real repeat pairs (n=40->41, 139->141, 147->148): every held/shared tool name byte-identical; only the new tool's object differs — deferred-tool-rewrite works exactly as its header documents (stability of what was already forwarded, not invariance of a growing array). First-event pairs were only 3/25 and 3/37 — that hypothesis measured out. Fix SHIPPED same day (813edc8): `heldStable` over the shared-name subset rides every sweep — measured 37/37 on s-97097e027ac0 (vs forwardedStable 1/37), zero counterexamples: the guarantee holds completely, the old metric simply measured a different question. Mitigation ladder, strongest first: (a) **rewrite-to-deferred — BUILT:** the API supports defer_loading + tool_addition system-message blocks (mid-conversation tool changes) — the proxy can hold tools[] byte-stable and deliver a newly-loaded schema as an appended tool_addition block instead; investigate feasibility on our API surface before building. (b) session-start PRELOAD list for near-certain tools (SendMessage in teammate-using sessions) — cheap, ships behaviorally today. (c) ride-along scheduling — LAST RESort for whatever residue (a)+(b) leave, not a primary strategy (operator: unavoidable-break framing rejected; treat every non-operator-initiated bust as a prevention target). |
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
| 13 | tools:REMOVE + placeholder reorder — harness GC of a loaded deferred tool on skills/tool-list updates | MEASURED 766k (2026-07-27 15:36, CronCreate removed + DeferredToolPlaceholder reordered, no ToolSearch nearby; skills-update system events in-window) | **BUILT — `deferred-tool-rewrite.mjs`, gate `CACHE_FIX_TOOL_REWRITE` (active).** Both halves shipped: removed tools are held in the serialized array to session end, and output order is ALWAYS the first-seen order rather than the incoming array's, which also absorbs pure reorder diffs (the `DeferredToolPlaceholder` move this row measured). Corroborated 2026-07-28: the whole corpus replays with `tools=match` and 0 stability violations. Disposition left reading BUILD for a day after it was built — verified against the source before this edit. |
| 14 | Sidecar requests sharing the session-id header (title-generation etc.) pollute per-session state keyed on that header | OBSERVED in today's ledger: alternating identity blocks/params under one key — prefix-diff attribution noise; for insertion-normalization this thrashes canonical (reset on every sidecar; degrades to no-op, never corrupts) | **BUILT, and the row's own remedy proved insufficient** (2026-07-28). `(session-id, system-prompt-hash)` shipped and was NOT enough: every subagent of a session runs the SAME agent prompt, so one bucket held 39 distinct conversations and 100% of conversation switches within a bucket reset (60/60) versus 1% of same-conversation continuations. A third component — `conversationSubKey`, the hash of `msgs[0]` — was added, with a raw-content fallback because `hashMessageContent` returns null for STRING content and that null collapsed 56 of 602 requests into one shared "empty" bucket. Result on the current corpus: **0 resets across 940 requests** (was 72 of 83 resets attributable to this keying artifact). General form, now in `docs/dev-loop.md`: an identity computed more cheaply than the thing it identifies will collide, and the collision presents as churn rather than as a bug. |
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
| 22 | Ephemeral UI turns entering the cached prefix (suggestion-mode: CC injects `[SUGGESTION MODE: Suggest what the user might naturally type…]` turns plus their assistant replies and `"No tools needed for suggestions"` tool_results into the live `messages[]`, then PRUNES them when the real user turn arrives) | throwaway turns are sent, enter the cached prefix, and their later removal rewrites history from the injection point | **OPEN — NEW 2026-07-31, uncovered by any existing row** (grep for "suggestion" across this matrix and `BACKLOG.md` returned nothing before this entry). Measured on the operator's own session: the pre-pipeline capture shows `messages[]` growing 110→112→…→128→130 and then DROPPING to 124 at `2026-07-31T11:41:05.778Z`. Eight of the removed entries are suggestion-mode scaffolding — `[SUGGESTION MODE: …]` user turns, their assistant replies, and `tool_result` bodies reading "No tools needed for suggestions" — replaced by the operator's actual turn. Note the cost is paid TWICE: once sending turns that were never conversation, once re-billing the prefix when they are pruned. This row is NOT the cause of the 11:41 bust — prefix-diff attributes that to `messages@98(system)`, the row-4 mutation, which sits EARLIER and therefore dominates the re-bill; the suggestion pruning at index 126+ is a co-occurring, independently-real class that would have busted on its own had it been the earliest divergence. Mitigability: UNASSESSED — the honest open question is whether these turns can be recognised and held out of the canonical history without risking fidelity (safety outranks cache), since they are indistinguishable from real user turns by role alone. Next evidence needed: how often the injection fires, and whether the pruning boundary is stable enough to pin. **PROMOTED 2026-07-31 — this row is not merely co-occurring, it is what DISARMS row 4's mitigation.** The pruning is what leaves the surviving canonical entries unusable as a subsequence, and the resulting reset is the state in which insertion-normalization skipped its suppression (row 4). 059aae3 makes the suppression survive a reset, so the coupling no longer costs the row-4 class — but the reset itself remains, and every OTHER behaviour that only runs on the success path is still disabled by it. The question this row now carries is therefore wider than suggestion-mode: WHICH normalization behaviours silently switch off on a reset, and at a measured ~1-in-3 reset rate, what does that cost? Enumerate the success-path -only behaviours before designing anything else here. **PRUNE-BUST MECHANISM REFUTED BY MEASUREMENT 2026-07-31 (probe on this row's own capture).** The claim "would have busted on its own had it been the earliest divergence" does not survive: a drop-scan over the full session capture (per-message hash prefixes, drop events classified pure-tail vs interior) found 12 prune events; 10 are PURE-TAIL-PRUNEs (surviving prefix byte-identical to the previous request), and joining ALL 12 against the transcript's `cache_miss_reason` entries (±90s) shows the 10 pure prunes produced ZERO miss events — the session's only misses are the 11:41 row-4 mutation and a 13:43 operator `model_changed`. Mechanism: the pre-injection request's rotating tail marker wrote a cache entry minutes earlier, well inside TTL, so pruning back to that boundary is a HIT — inject-then-prune is self-healing through CC's own marker rotation, and the suggestion turns' geometry confirms it (injection block 122–129 tail-contiguous; post-prune messages 0–121 byte-identical to the 11:38:59 pre-injection request absent the co-occurring row-4 mutation). The class therefore costs ONLY when a mid-history change co-occurs below the injection point — that is row 4/EXTENDED's bill, not this row's. Residual honest costs: the throwaway tail writes themselves (small, honestly priced) and the canonical resets the prunes cause proxy-side. The row STAYS OPEN solely for the promoted question above (success-path-only behaviour enumeration); the original bust mechanism is a measured non-event. **MECHANIZED 2026-07-31 (404d5fc):** the drop-scan probe is now `classifyPrune` in the census, riding gate-live's daily sweep. The probe's own 10/2 split did not survive its mechanization — the boundary is the ANCHOR (`isHumanTurn`), giving 11 pure / 1 interior on this capture (11:31:58 is byte-shape-identical to the pure events; dispatcher decision, census-hardening report §c1). Corpus-wide over the now-fully-readable 39 captures: 226 drops, 181 pure / 45 interior / 0 unanchored, incl. two near-total re-bills booked as their own BACKLOG item. |
| 23 | Description-only `tools[]` change (an existing tool's `description` text edited client-side; `name`, `input_schema`, set and order all byte-identical) | transcript cause `tools_changed` while the message census reads `append-only` — nothing mid-history moved | **OPEN — MEASURED 2026-08-02, mitigation in flight.** Live instance in the operator's own session: 552k re-written, `tools_changed / 484972`, capture pair 15:53:08.789Z -> 15:53:26.105Z (ordinals 1200..1202). Exactly one tool differed (`Bash`), `input_schema` BYTE-IDENTICAL, description 2907 -> 2984 chars: **77 bytes re-billed 484,972 tokens**, because tools precede messages in the cache prefix. deferred-tool-rewrite behaved as designed (`action=reset reason=tool-schema-changed`) — it holds `tools[]` stable for ADDITIONS and takes the honest reset on any schema change to an existing tool; no clause covered a description-only delta. MITIGABILITY ANSWERED YES, and the boundary is the safety argument: identical `input_schema` guarantees the model cannot emit a call the client is unable to execute, so a stale DESCRIPTION is safe where a stale SCHEMA is not; the new text still reaches the model, in-band, via the announcement machinery the extension already uses for tool additions — same information, different container, which is the argument row 1 and row 4 already make for reminders. Design dispatched: forward the canonical block on a description-only delta, announce the changed description, distinct telemetry; anything touching name/schema/set/order keeps today's reset. Closes on a shipped extension plus a live non-event, per this matrix's own rule. |
| 24 | SAME-MACHINE `/resume` after an accidental exit rebuilds the whole prefix | transcript causes `system_changed` then `messages_changed` on consecutive turns, with no mid-history mutation to blame | **OPEN — MEASURED 2026-08-02, mitigability UNASSESSED.** Distinct from row 20, which is CROSS-machine (cwd/platform/git snapshot) and whose advice — start fresh on the new PC — does not reach this case: the operator resumed on the SAME machine SIXTY-ONE SECONDS after the last request (16:11:51 -> 16:12:52) and still paid **603k (`system_changed`) + 589k (`messages_changed`) = ~1.19M tokens**. Measured across the exit boundary in one capture (s-captureJ, last pre-exit request 16:06:39.773Z vs first post-resume 16:12:42.422Z): ALL THREE cache layers differ. System prompt 11,102 -> 10,090 chars, diverging at char 1269 where the pre-exit prompt carries a `# Communicating with the user` section the resumed one LACKS entirely (~1,012 chars absent, not reordered). `messages[0]` hash changes. Message count DROPS 966 -> 938, so CC reconstructs the array from its transcript rather than restoring the live one. TTL EXPIRY IS RULED OUT, not assumed: every outcome record across the boundary carries `ephemeral5m=0` with all creation on `ephemeral1h`, so the session ran the 1-hour tier and 61 seconds could not expire it. The decisive number is the first resumed request's own usage — `cache_read=0 / cache_creation=603242`, a TOTAL miss rather than a partial one, which is what a rebuilt prefix looks like and what an expired or evicted entry would not (an evicted entry re-reads nothing but would not also change the bytes). Consequence for operator advice, which is the actionable half: resuming FASTER cannot help — the cost is set by what the client sends, not by how warm the server is, and the cache was demonstrably still hot. Mitigability, honest open question in two halves: (a) the system-prompt half might be pinnable to the first-seen form, but serving a stale SYSTEM prompt is a much stronger claim than a stale tool description — it is authoritative instruction text, and here the pin would RESTORE a section the client deliberately dropped; (b) the messages half was FIRST GRADED "probably not mitigable" on one argument (a 28-message-shorter history is not a subsequence, so re-serving the pre-exit array would send turns CC no longer believes exist). OPERATOR REJECTED THAT DEFERRAL 2026-08-02 and was right — it collapsed under one question, since `cache_read=0` was measured while system AND tools were ALSO broken, so it never showed where the MESSAGE layer alone would break. Measured properly on the same pair: the first diverging message index is 0, but only 18 of 938 resumed messages are absent from the pre-exit array (98% byte-identical content, 49 pre-exit messages dropped). The index-0 divergence is a `<system-reminder>` block in messages[0] carrying the CLAUDE.md corpus snapshot — 47,505 -> 49,282 chars, diverging at char 1576 — which grew because the corpus was EDITED during the session, so the resumed process re-read it from disk and rebuilt messages[0] around new text. That is volatile reminder content inside the cached prefix: the same class rows 1 and 23 already mitigate, not a novel one. So the honest grade is OPEN AND PROMISING, not unmitigable — with 98% of content identical, pinning messages[0]'s reminder block to its first-seen form could restore a very long shared prefix, and the in-band announcement pattern can carry the delta so the model still sees the newer corpus. Named missing evidence before any build: where the SECOND divergence lands once messages[0] is pinned (the 49 dropped and 18 new messages must be located — tail, scattered, or a compaction boundary), and whether re-serving a stale corpus snapshot is acceptable when the operator has deliberately edited the rules mid-session. BOUNDED 2026-08-02 by measurement — mid-session corpus edits are FREE, only the resume pays: across the main conversation there are exactly TWO distinct `messages[0]` forms, the first byte-identical across 246 requests spanning 14:25:14 -> 16:06:39 (1h40m, during which the global CLAUDE.md was edited twice and dispatch-discipline once), the second appearing only at 16:12:42 post-resume. The array is frozen once built; `/resume` rebuilds messages[0] from whatever is on disk NOW. So "editing the rule corpus busts the cache" is false for the live session and true for its next resume. MITIGATION DESIGN, and its safety argument is unusually cheap here: pin messages[0]'s corpus `<system-reminder>` to its first-seen form per conversation (rows 1/23 machinery), because the operator's OWN periodic re-anchor hook already re-injects the CURRENT corpus into the conversation at token thresholds — so the newer rules still reach the model through a channel that exists independently, and pinning drops nothing the operator has not already arranged to deliver. Caveat to check at design time: the re-anchor fires on thresholds, not on edits, so delivery is eventual rather than immediate. ESCALATION, operator-set: investigate at opus; if opus finds no design, fable takes a crack — do not close this half on a cheap negative. ROOT CAUSE FOUND 2026-08-02, tools layer — and it is a VOLATILE IDENTIFIER IN THE CACHED PREFIX, the same defect class this proxy exists for, one layer up. Across the resume the `tools[]` block also differs (13 tools both sides, same model), and the delta is exactly ONE tool: `Bash`, name identical, `input_schema` byte-identical, description 1496 -> 1496 chars diverging at char 1331 — `...session_01LBJeKUa423Y1oVYDWQaPmT` becomes `...session_01SdKg8pfHxZGPK1W1MNWhxZ`. CC embeds the SESSION ID in the Bash tool description (the `Claude-Session: https://claude.ai/code/session_<ID>` commit-trailer instruction), `/resume` mints a NEW session id, so the tools block changes on every resume BY CONSTRUCTION — no timing, no TTL, no usage pattern can avoid it, and it invalidates from byte zero because tools precede messages. Confirmed independently: the pre-exit id is the one this session wrote into every commit trailer. MITIGATION: the tools half is ALREADY COVERED BY ROW 23's design — name and input_schema identical with only description differing is precisely the description-only class, so serving the canonical first-seen block and announcing the delta in-band absorbs it; the row-23 build should be verified against THIS pair as a second real case. That leaves the system-prompt and messages layers as the genuinely open halves below. UPSTREAM-REPORTABLE as stated: a volatile session identifier inside a cached tool description guarantees a full re-bill on every resume. Do not build either remaining half before that is settled. PRIOR ART, found after this row was written and credited rather than quietly absorbed: claude-worktime `docs/cache-ttl-verification.md` records the same phenomenon on 2026-07-26 (quit, waited ~1 min, resumed, full 139k rewrite at gap=45s) under the heading "elapsed time is not the only thing that busts a resume", and already named the mechanism as `tools=match, system=DIFFER`. What THIS row adds: the divergence located to a specific missing section (`# Communicating with the user`, ~1,012 chars, 11,102 -> 10,090), plus the two layers that doc did not cover — `messages[0]` changing and the array dropping 966 -> 938 turns — and the TTL ruled out by tier data rather than by argument. PROVENANCE, CORRECTED TWICE — the second correction retracts the first, which was wrong: CC DOES ship a resume dialog. Operator screenshot plus the literal in the installed bundle: "This session is ${age} old and ${tokens} tokens. / Resuming the full session will consume a substantial portion of your usage limits. We recommend resuming from a summary." with options compact / continue / never, rendered from inputs `sessionAgeMinutes` and `estimatedTokens`. An earlier revision of this row claimed no such string existed; that was a BAD SEARCH (patterns for cache/stale/expired and for resume-near-compact) reported as an absence, not a real absence — the negative-result trap this corpus warns about, committed while writing the row that warns about it. Separately, claude-worktime DOES also have its own TTL guard (`CACHE_GUARD_TTL`, `elapsed < TTL*0.9`), which is where the two got conflated. What the dialog settles and does NOT settle: its TEXT cites usage limits and never mentions the cache, which reads as CC expecting a full re-read on resume; but `sessionAgeMinutes` as a gating input is equally consistent with a TTL-shaped threshold, and the numeric threshold could not be extracted from the minified bundle. So the dialog does not decide intent in either direction, and the bug argument must not rest on it. The bug argument does not rest on it: the reportable defect is that the same session, same machine, same cwd, resumed 61 s later, is served a system prompt missing a whole section, which is nondeterministic assembly rather than a documented resume cost. |
| 25 | A relocated `<system-reminder>` block DEPARTS — CC stops sending the instance `fresh-session-sort` had relocated to `messages[0]` | the extension re-derived its relocated set from the CURRENT array, so our forwarded `messages[0]` lost the prepended block while CC's own `messages[0]` was byte-identical: CC's edit at index k became OUR edit at index 0 | **MITIGATED 2026-08-05 (per-conversation relocation memory) — and the occurrence that opened the row cost NOTHING, which is the more useful finding.** Measured on capture s-captureAB, pair n=331 -> n=336 (the ~413k-token session): the mcp block sat at raw msg[3] from n=325 through n=331 and was absent from n=336; forwarded `messages[0]` carried four blocks then three (`--dump-forwarded 331:0,336:0`), CC's raw `messages[0]` three blocks with identical hashes on both sides. Gate: `outDiv 0 / inDiv 3 / ccIdenticalAtOutDiv true`, attributed to fresh-session-sort by its own bisection. **The pin was never the mechanism.** `pinBlockContent` holds a block's BYTES stable while it is present; between those two requests the block was absent, so nothing consulted it — presence was the unheld axis, and the handoff's opening question ("why did the pin not hold") had no answer because it was the wrong question. **COST: zero, on this occurrence.** CC changed `tools[]` 11 -> 9 entries (different names and bytes) and its first system block 57 -> 62 chars in the SAME request, so the cache prefix `[tools][system][messages]` was already broken two levels above messages. The row was carried into a handoff as the most expensive open item in the repo on the strength of `outDiv 0` alone. The reading that fixes this is now a FIELD, not a paragraph: every stability violation carries `prefixAboveMessages {ourToolsIdentical, ourSystemIdentical, ccToolsIdentical, ccSystemIdentical, intact}`, and the human line prints `[prefix ALREADY broken above messages: tools+system changed -> no marginal cost]` or `[prefix above messages INTACT -> the whole message array re-bills]`. `intact` is the OURS side because ours is what bills — and the two sides come apart exactly where deferred-tool-rewrite is doing its job, holding forwarded tools stable while CC churns. **Mitigation:** `_relocatedByConversation` (fresh-session-sort), keyed by `resolveInsertionSessionKey` — imported, not re-derived — serves a remembered block whenever CC sends no instance of that type; CC's newer bytes always win, so a genuine content change still resets. The key includes the system-prompt sub-key, which drops the memory exactly when a system change has already broken the prefix above messages, i.e. only where dropping it is free. Conservation covers the re-serve by F-side clause (e): a declared re-serve of bytes the gate itself verified earlier in the same conversation. **RATE, now measured rather than assumed** (the census class shipped the same day, `findRelocDepartures` in replay.mjs — a REPORT, not a gate): s-captureAB carries **2 departures across 342 same-conversation pairs**, and they price differently — n=48->49 (`deferred`, from raw msg[1]) with the forwarded prefix INTACT, n=331->336 (`mcp`, from raw msg[3]) with it already broken. An earlier version of this row said the capture held exactly one departure; that was a hand-read and it was wrong, which is the argument for the class existing in the census at all. **The fix's live engagement is still UNPROVEN, and the second departure does not prove it.** Neither sweep reports a stability violation at n=48->49 — not the post-fix one (16:00Z, `proxyTree e20ece6439f4`) and not the pre-fix one (14:51Z, `3c14d4fd3446`), which is the counterfactual: under the old code that departure cost nothing either. So the extension had never relocated that type for that conversation, and there was nothing to lose — reading (a) of two the census cannot separate on its own. What would prove engagement is a departure whose predecessor carries a `relocated` declaration for the same type; none has been observed yet. **Restart:** covered — the memory persists (audit amended to stateful-PERSISTED), with the byte-identical-restart case in `test/proxy-restart-transparent.test.mjs` and its fail-open control. |


Convergence note (operator-prompted, honest): enumeration is
asymptotic — three passes, three methods, each found cells the prior
missed. What makes it CONVERGE is not better imagination but
attribution telemetry: every bust now either matches a named row or
surfaces as unattributed — and an unattributed bust is itself the
alarm that mints the next row. The guarantee is "no SILENT gaps",
not "no gaps".

---

## Row 21 — FIXED: `deferred-tool-rewrite`'s `tool_addition` injection
## moved between requests (a keying collision, not an injection bug)

Found 2026-07-28 by `tools/gate-live.mjs` on its first run under the
PRODUCTION gate set. It had never been visible because every prior
verification run used the extension defaults, where `CACHE_FIX_TOOL_REWRITE`
is OFF — see `docs/dev-loop.md`, "replay the configuration that is SERVING".

Evidence, corpus `s-captureE`, two independent instances:

    n=44->47   inDiv=23  outDiv=4   <- deferred-tool-rewrite
    n=219->223 inDiv=10  outDiv=4   <- deferred-tool-rewrite

At request 44, output index 4 is the injected announcement:

    {"role":"system","content":[{"type":"tool_addition",
      "tool":{"type":"tool_reference","name":"WebFetch"}}]}

At request 47 that message is absent, and index 4 holds the next real
message. So the injection appears in one request and not the next, and our
forwarded byte stream diverges at index 4 while CC's own history is identical
through index 23 — we move the divergence **19 messages earlier than
required**, and everything from there is re-billed.

This is self-inflicted by construction, and NOT the false-positive class the
safety gate hit: a declared injection is legitimate as CONTENT (which is why
`findSafetyViolations` exempts it), but an injection that is present in one
request and gone in the next is a byte-stability defect regardless of how
legitimate its content is. Verified against the artifact-vs-defect checklist
in dev-loop.md before being written down.

What is NOT yet known, and must be established before a fix:

- Why the announcement disappears — is it emitted only on the request where
  the tool first appears (by design), or dropped by a later state reset?
- Whether the correct fix is to keep announcing it for the life of the
  session (stable but grows), to anchor it at a fixed index, or to stop
  injecting into `messages[]` at all.

Not fixed on discovery deliberately: this extension is ON in production, its
whole purpose is byte stability, and a rushed change to it is exactly how a
mitigation becomes the bust. What kept it unforgettable was the MECHANISM,
not this row: the failing gate sweep held doctor red until the fix landed —
the matrix records, the gate enforces.


**RESOLVED 2026-07-28.** The announcement never disappeared — telemetry shows
`injected=1` on every request. It was RE-ANCHORED: `reanchored=1` at n=46 and
n=47, so the message moved to a different index each time.

Root cause was the SESSION KEY, not the injection. `resolveToolRewriteSessionKey`
was `(session-id, system-prompt)` with no conversation sub-key, so every
subagent shared one state. Message counts under a single key in the failing
window: 49, 22, 24, 51, 11, 26 — six unrelated histories. The stored
`anchorHash` therefore belonged to somebody else's conversation, failed to
match, and `injectAdditions` fell back to "after the last user message", which
is a different index on every request.

This is the SAME collision fixed in insertion-normalization hours earlier
(row 14). The fix did not travel to the sibling because nothing connected
them. So `conversationSubKey` now lives in `message-hash.mjs` — one
implementation, both consumers — and `test/session-key-invariants.test.mjs`
DISCOVERS every exported `*SessionKey` and holds it to the invariant, so the
next stateful extension is covered without anyone remembering.

That guard found a third instance on its first run: `prefix-diff` separates
co-tenants by system prompt only, which is the same insufficiency
insertion-normalization outgrew (one prompt bucket held 39 conversations). It
shapes no request, so the cost is attribution precision rather than cache, and
its coarse FILE key is a deliberate design (its note 1: a path that moves with
content misses its own baseline). Exempted — with a test asserting the
exemption is still earned, so a change to that design fails loudly.

Verification: the 2 violations on corpus `s-captureE` go to 0, and a full
production-gate sweep is clean — 9 captures, 1742 MB, 0 failing. Bite: forcing
the sub-key back to a constant turns the invariant test red.

---

## Row 22 — FIXED: a reset drops VOLATILE PINNING too, so an
## honest edit at the tail costs from 19 messages earlier
## (fix: resetKeepingPins — a reset abandons the ORDER model, not the pins;
## verified on corpus s-captureL 2 -> 0, dfed402)

Found 2026-07-28 19:45 by `cache-fix-gate.timer` on live traffic, minutes
after row 21 was fixed — i.e. by the mechanism, unprompted, which is what it
was built for.

    corpus s-captureL, 110 requests
    stability: n=108->109  inDiv=196  outDiv=177  <- insertion-normalization
    sequence:  n=109 reset(edit-shaped) after normalize at n=108

Our output diverges 19 messages earlier than CC's own history requires, and
the normalize→reset pair means the canonical and CC's serialization disagree
from there on.

UNVERIFIED HYPOTHESIS, recorded as such: row 4 established that CC mutates the
LAST message in place on a user interruption (appending
`[Request interrupted by user]` plus the follow-up text as new content blocks
rather than a new message). This capture is from a session with several such
interruptions. If `classifyInsertion` reads that tail mutation as an
`edit-shaped` change it would reset — which matches the observed pair. That
must be CHECKED before any fix: row 4's own lesson was that the assumed
mechanism (mid-index drift) was not the measured one (tail-only).

Before treating this as a production defect, run `docs/dev-loop.md`'s
artifact-vs-defect list — in particular confirm the pair is 108->109 as
reported and that no declared-injection exemption is missing.

Not fixed on discovery: same reasoning as row 21 — and the same mechanism,
not this row, kept it red until resolved (the gate sweep, via doctor).


**DIAGNOSED 2026-07-28. The hypothesis above was WRONG and is kept as a
record of that.** It guessed a tail mutation from a user interruption. The
measurement says otherwise, and the real mechanism is worse.

What CC did is honest: it replaced message 196 in place —

    108 in[196]: {"role":"user","content":"yes lest do it all!"}
    109 in[196]: {"role":"user","content":"lets do it all 13.x shuodl be ..."}

a genuine history edit, and `reset(edit-shaped)` is a defensible response to
it. Cost should be messages 196+.

What WE did is not. At index 177, isolated:

    CC's in[177] identical across the pair : true
    our out[177] identical                : false
    request 108: out != in   (we RESTORED a <system-reminder> block)
    request 109: out == in   (pinning stopped; the block vanished)

Telemetry agrees: `pinned: 1` at 108, `pinned: 0` at 109. Volatile-block
pinning had been re-inserting a hook `<system-reminder>` that CC dropped from
message 177 — that is the mitigation working. The reset switched it off, the
restored block disappeared, and our forwarded bytes changed at 177 while CC's
were untouched. A bust that should have cost from 196 costs from 177.

Root cause: the canonical reset and the volatile-pin lifecycle are coupled,
and they are orthogonal concerns. Whether the HISTORY was edited says nothing
about whether previously pinned DECORATION is still valid. Fix direction:
pinned volatile state must survive a canonical reset, so a reset confines its
cost to the edited index instead of un-pinning everything before it.

Deployment note, learned at cost the same evening (see row 3's amendment): a
change to state lifecycle invalidates baselines and buys a one-time bust per
live conversation. This one belongs at a session boundary and the cost gets
stated BEFORE the restart, not diagnosed after.


---

## Row 4 — RE-OPENED 2026-07-28 (same day it was closed)

Row 4 closed as ACCEPTED-cheap on the finding that every measured
`replace/edit` mutated the LAST message, so a rewrite re-bills that message
alone. The row states its own re-open condition: "Re-open only if a NON-tail
instance is ever measured."

That verdict rested on census numbers taken BEFORE `semanticIds` carried an
occurrence ordinal. Repeats of an identical message — one history carried the
same hook reminder 44 times — collapsed into a single identity, which
suppressed edits from the classification entirely. With the ordinal, on
session 58c979ce alone:

    replace/edit positions: 20 total, 5 TAIL, 15 MID-HISTORY

Fifteen non-tail instances. The premise is refuted, not weakened. Examples,
worst first by re-billed bytes:

    n=1120->1124  edit@623 of 650  ~70 kB   19:57:20Z
    n=1201->1203  edit@34  of 36   ~63 kB   20:29:51Z
    n=1196->1198  edit@25  of 27   ~32 kB   20:29:15Z
    n=1197->1204  edit@768 of 783  ~27 kB   20:30:26Z

The last one sits 15 seconds before event 14 (484k `messages_changed`,
20:30:41Z) and is the same pair that insertion-normalization answered with
`reset(not-subsequence)`. A mid-history edit at index 768 of 783 invalidates
everything from 768 on — which is the shape of the event, and the first
mechanism for it that survives corrected data.

NOT yet established, and stated as open rather than assumed: whether that edit
CAUSED event 14, and what CC is actually changing at those indices. The
pattern to check first is a system-reminder block being swapped in place
mid-history — at n=1197->1204 index 768 holds a task-tools reminder in one
request and a PreToolUse hook block in the next.

EXTERNALLY CORROBORATED 2026-07-29: anthropics/claude-code#76606 (open,
filed 2026-07-11 by an independent reporter diffing raw /v1/messages bodies)
describes exactly this mechanism — "Claude Code rewrites an old hook
reminder's shape later in the session ... either moving it into its own
message, or merging it into a neighboring one", hit repeatedly in one day
under PreToolUse hooks that add context to tool calls. That is the
reminder-swap pattern above, observed with independent instrumentation on an
unrelated setup. Upgrades the leading candidate from "pattern to check
first" to "mechanism reported in the wild"; still not a measured root cause
for event 14 specifically.

SECOND corroboration, sharper (issue sweep 2026-07-29):
anthropics/claude-code#78660 names the mechanism outright — the "task tools
haven't been used recently" nudge, fired mid-tool-loop, ANCHORS TO THE LAST
HUMAN MESSAGE instead of appending after the pending tool_result, editing
deep into the cached prefix. That nudge is the exact reminder text observed
at index 768, and anchoring-to-last-human explains both the position and the
swap-in-place shape. Row 4's open question ("what is CC swapping at those
indices") now has a reported answer.

VERIFIED 2026-07-29 on this corpus (census over 1,731 requests, 33
mid-history replace/edit pairs matched against message roles): of the 22
pairs with a human-typed anchor, 20 sit within +/-2 of the LAST HUMAN
MESSAGE (11 exactly on it, 8 at -2); the remaining 11 are subagent/sidecar
conversations with no human anchor under the filter. The two deep outliers
(-15/-27 from the current anchor — including the event-14 pair at index
768) sit 3 and 11 messages past the THEN-current last human message,
inside the post-human zone where CC parks injected reminder/hook blocks.
No mid-history edit occurred at arbitrary depth. The mechanism family —
reminder-block re-stamping at or just after the human-message anchor
(CC#78660 / CC#76606) — is CONFIRMED as the cause of this population;
the exact anchor arithmetic of the two aged cases (which specific
injected message they re-anchored to) remains unpinned. Distribution
posted to CC#78660.

Mechanised so it cannot silently rot again: `findEditPositions` in
tools/replay.mjs reports the tail/mid split and prices the mid-history
population on every `--census` run, and `tools/gate-live.mjs` runs daily.
Row 4's disposition is now a measurement, not a memory.

### Row 4 datapoint — 2026-07-30: first measured OSCILLATION (221k bust)
### [CORRECTED 2026-07-31 late: the census join-target run over the live
### capture shows THREE hosts reversing in this event, not the single
### 92→94 pair the flap-probe addendum priced — the 221k was measured at
### a third of its true per-host size. Basis: census-flap-joined-report,
### live slice "10, 6 FLAP, 7 JOIN (3 cross-message)".]

Session 0d6f38ba, 16:57:14Z, `messages_changed`, cc 221,065. The Agent
hook-reminder pair FLAPPED inline->standalone->inline->standalone across
four consecutive main-thread requests in 11 seconds — census over the
pre-pipeline capture:

    n=102->104  edit@86 of 98   [anchor-12] [blockMigration inline->standalone 92->93, 92->94]  ~31 kB  16:57:05.767Z
    n=104->105  edit@86 of 98   [anchor-10] [blockMigration standalone->inline 93->92, 94->92]  ~32 kB  16:57:08.353Z
    n=105->108  edit@86 of 100  [anchor-14] [blockMigration inline->standalone 92->93, 92->94]  ~37 kB  16:57:16.375Z

Trigger window: a teammate report (ubytes=4248) landing at a clean turn
boundary (flight=false) amid mid-turn operator messages. Attribution
CC's: the same census reports 0 pipeline byte-stability violations;
insertion-normalization answered with three edit-shaped resets, sequence
gate 0 (correct response, no bleed). The census emits `blockMigration`
lines directly — the class is recognized, not re-derived (the 07-28
mechanization holding).

Post-pin escape CONFIRMED live: the standalone leg is the system-role
string-content shape `isVolatileBlock` does not classify (runbook
2026-07-28 note), so the pin absorbs the inline leg only — under a flap
that busts on every second flip at best. Magnitude: mtok 201,434 of ctx
236,536 (85%) missed from an edit at ~86/100 — surviving prefix ~35k
tokens, consistent with the 07-28 breakpoint-sparsity question (single
tail cache_control marker), still unproven against wire bytes.

Mitigation status unchanged by this event, both halves already named:
occurrence-side, extend the volatile pin to the standalone system-role
string shape (candidate since 07-28); magnitude-side, the mid-history
breakpoint ladder (directive on feature/mid-history-breakpoint-ladder,
unmerged). Evidence: capture s-captureB…-requests.jsonl (79.8 MB,
rotates; reproduce with `node tools/replay.mjs <capture> --census`);
same-hour harvest reported 0 novel pairs — the shape is already in
fixtures, rotation loses the instance only. New sub-shape worth a
census annotation: a flap detector (same blockMigration pair reversing
within N requests) — currently only visible by reading adjacent lines.

CORRECTION (same day, builder-measured against raw bytes; fixture
090a110 reproduces both relations offline): the census over-reported
this flap's migrations 2x — blockUnits treats any message that SHRANK
to one block as a standalone, so stripping a reminder out of the
tool_result manufactured the phantom "92->93" lines; only 92->94 is
real. The flap stands: one reminder block flipping across three
requests. And suppression coverage was NOT the gap: pinnedBlockHashes
has matched per-block unwrapped text since the original #76606
suppression, the join-hash (78940a0) matches the joined leg —
findSuppressibleDuplicate returns a hash for both matchable
standalones. The real escape: classifyPinned returns
reset("edit-shaped") BEFORE the suppression pass, triggered by the one
genuinely novel leg — a CROSS-MESSAGE join (msg89's unwrapped reminder
+ "\n\n" + the whole standalone msg90) landing in dropped msg90's gap.
Mitigation is a design decision, not a build brief — two named open
questions in BACKLOG (cross-message-join suppression would drop
msg90's bytes from the wire; suppression-before-reset touches a
load-bearing safety discriminator with measured false-positive
history). The pin-extension candidate this entry previously named is
withdrawn — refuted, already-built.

SECOND CORRECTION + detector landed (same day, commits fc44da3 +
47defba): the phantom needed TWO conditions — the shrink AND an
index shift putting an unrelated message at samePos — and a
shrink-based rule cannot see the reverse leg (pair-locally
unknowable; demonstrated by a red reverse-bite). The shipped fix is
candidacy instead: a block is a migration candidate only where it
appears <system-reminder>-wrapped on its inline side (over-narrowing
probed: the documented s-4b6a435234bf real case survives). The census
now flags flap reversals directly — the triple reads 3 migrations,
2 FLAP, driven red-first from the committed fixture, so the proof
survives capture rotation. SECOND FLAP instance (s-4b6a435234bf,
2026-07-29 17:19-17:20Z, same triple shape at msg 155/156): measured
NON-event — the nearest bust on that session sits 26 minutes earlier
— so the parked design item's cost trigger did not fire. Known
detector residual, booked: per-block hashing counts LEGS, not
relocations — two of the fixture's three standalone legs are JOINS
it cannot see (joined-standalone migration target, BACKLOG).

### Row 4 datapoint — 2026-07-31: the census's EXTENDED class IS the
### cross-message join, and its placement is measured, not arguable

`reminder-migration-census.mjs` calls a later standalone EXTENDED when
it carries the canonical reconstruction as a byte PREFIX, and its
header calls the remainder "new reminder text that did not exist at
the earlier request ... NOT absorbable by any normalization". Measured
over every EXTENDED occurrence in the readable corpus: 9 of 9 are the
CROSS-MESSAGE JOIN this row already names one entry up — the
remainder is byte-identical to a standalone system message the
PREDECESSOR request carried, swallowed into the migrated reminder. 0
are new text (4 sessions, 4 dates; the two remainder texts are the
"task tools haven't been used recently" nudge, 421ch, and the "user
sent a new message while you were working" note, 330ch). The census
label and the blockMigration label name one class from two directions;
only the second one's mitigation (directive
flap-move-mitigation-and-fidelity-gate.md, unit 2 first-seen re-serve)
addresses it.

PLACEMENT, measured on the motivating pair (s-captureF, conversation
e7394e05 replayed from its first request through the real pipeline
under the SERVING gate set; first forwarded divergence, prefix-diff
and an independent probe agreeing on the baseline):

    baseline (today)                              100
    delta re-emitted at a frozen TAIL index       100   <- no absorption
    swallowed message restored at ITS index       123 of 124

Correct bytes at the wrong index diverge the prefix just the same —
the census's own placement rule, now with a number on both sides of
it. Any mitigation for this class is an UN-MERGE (put the swallowed
message back where it was), never a relocation.

### Row 4 datapoint — 2026-07-31 (later): the flap/cross-message-join
### mitigation is BUILT and corpus-clean, pending deployment

The un-merge exists and holds: units 2/2b (join-move first-seen
re-serve, moves surviving resets) plus the reserved-entry identity
build (directive `reserved-entry-identity-directive.md`; the ordinal
re-bind was the last escape). Measured A/B over the whole live corpus
(8.5 GB, 36 captures, serving gate set, dispatcher-verified): ZERO
insertion-normalization stability violations remain — s-97097e027ac0,
s-captureD, s-4b6a435234bf, s-captureM all at 0; the corpus's entire
remaining stability debt is two deferred-tool-rewrite pairs on
s-captureB, identical pre/post. Old-canon restart transparency
measured (`verdict-ab --seed-from-a` IDENTICAL, 44 lines). NOT
deployed: ships at the deferred restart boundary (operator settle:
after all proxy work — condition now met). The row stays OPEN until
the deployed proxy shows the class as a live non-event; the un-merge
covers the measured join shape — whether every container-migration
EXTENDED instance (e.g. the 14:32:29 KNOWN-OPEN bust) matches its
conditions (a)–(f) live is the post-restart verification question.

### Row 4 datapoint — 2026-08-02: the escape the un-merge left open is
### SHIPPED — occurrence-ordinal re-attribution (739aa22)

The entry above calls the ordinal re-bind "the last escape" and it was
right, but only for RESERVED entries. Non-reserved entries kept
absolute `(h, r, o)` matching, and the file said so in a sentence that
declared the general case out of scope (`:1108-1110`) — that sentence
was the defect, and it cost 535k tokens on 2026-08-02.

Mechanism, measured not modelled: an ordinal is a position within a
family of identical (hash, role) copies. CC swallowed a MIDDLE copy of
the 421-byte "task tools haven't been used recently" nudge, which stood
28x in the canon against 27x on the wire; every later copy shifted down
one, so each survivor bound to its NEIGHBOUR'S wire slot and the LAST
ordinal was reported as the entry that vanished. The entry that
actually left therefore never reached findJoinMoves, which took its
condition-(b) `continue` and returned [] — `moved:5` was five re-fires
of reserved entries with ZERO fresh recognitions, which is exactly why
"the mitigation ran" and "the mitigation matched" came apart in the
telemetry.

Fix: for a family whose live stored count exceeds its wire count by
exactly one, attribution is re-derived with findJoinMoves' own
condition-(d) lo/hi neighbourhood discriminator; everything else fails
closed, INCLUDING an ambiguous family (two qualifying candidates keeps
today's behaviour rather than guessing, because guessing re-serves one
entry's bytes into another's slot).

Corpus A/B, four captures / 4,136 requests, old vs new under each
capture's own serving gates (`tools/replay-compare.mjs --summary`):
three resets eliminated, one per busting capture — s-captureI n=894
(the 660k instance), s-captureZ n=839, s-captureK n=1417 — each
flipping `reset/not-subsequence` -> `normalized`. The latter two are
precisely the captures the investigation had recorded as reporting
canonical ORDER violations under the pre-re-keying revision;
`orderViolations` now reads 0 on BOTH sides of all four, which is the
re-keying doing its job. Every delta begins AT the busting request and
none before it (893, 838 and 1416 preceding requests byte-identical),
every delta absorbs rather than releases (+56/-0, +79/-0, +10/-0 on
suppressed/moved/canonSize), and a capture without the shape
(s-captureX, 261 requests) shows ZERO deltas — the inertness control.

Restart safety (row 3): no new state key, no persisted schema change —
canonical entries keep `{h,r,o}` and only the `o` VALUES are corrected
in place; `freeze` does not appear in this file at all. NOT deployed at
the time of writing: rides one boundary with the row-23 absorb and the
`movedFresh` telemetry split. The row stays OPEN until the deployed
proxy shows the class as a live non-event — a shipped extension is not
a closed row, per this matrix's own rule.

### Row 4 datapoint — 2026-08-05: the first POST-DEPLOY instance, and
### it is a live EVENT, not the non-event the row waits for (349k)

The two entries above both close with "the row stays OPEN until the
deployed proxy shows the class as a live non-event". The deploy
happened (2026-08-05 boot, proxy_tree `eec233efa271`, systemd
`ExecMainStartTimestamp` 09:59:00 CEST = 07:59Z) and the class fired
70 minutes later. This datapoint records the event and what the
mitigation did, measured — the attribution of the residual is a
separate, open question stated at the end.

THE BUST. Session s-captureQ, 2026-08-05T09:09:41Z / 09:10:03Z (one
event, double-recorded: the 09:09:41 ledger row raced and never
upgraded off `cause=other`, the 09:10:03 row carries
`messages_changed`; `bust-triage --at` on the earlier one prints
`WARN reconcile`). 349,004 tokens re-billed against `ctx` 364,589,
`cacheRead` 15,583 — i.e. the surviving hit is tools+system ONLY and
the whole messages array was re-billed, the row-4 economics exactly
(the mid-history mutation invalidates every message-level breakpoint,
all of which sit at the tail).

THE SHAPE, read off the raw pre-pipeline capture (ordinals 220 ->
221, ts 09:07:57.554Z -> 09:09:01.686Z, 424 -> 428 messages;
`system` and `tools` byte-identical). Raw index 369 is `role:user`
`[tool_result, text(364ch)]` where the text block is a
`<system-reminder>` wrapping a 327-char PreToolUse:Bash hook context;
at 221 that message is `[tool_result]` alone. Raw index 370 is
`role:system`, a 370-char string at 220 and a 699-char string at 221
— exactly `hookText(327) + "\n\n" + userMsg(370)`, the cross-message
join this row already names. The SAME shape recurs at 378/379, where
the migrated reminder INSERTS a new standalone instead of merging
into an existing one, shifting the tail; that is why the pair is
+4 messages and why 48 indices of the common prefix diverge while
only two of them are the migration itself.

WHAT THE MITIGATION DID (replay of the whole capture under
`--gates-from-capture`, exit 0: 0 stability / 0 safety / 0
conservation / 0 sequence / 0 order). At n=221 insertion-normalization
reports `action:"reset"`, `resetReason:"not-subsequence"`,
**`movedFresh:2`** with join-move suppressions at indices 370 and 402
— the un-merge RECOGNIZED both migrations, on the reset path, which is
what `resetKeepingPins` (insertion-normalization.mjs:919) exists for.
The forwarded message count held at 414 -> 414.

AND THE PREFIX STILL DIVERGED — MEASURED, ATTRIBUTED, AND IT IS
OURS. Same-day measurement (standalone probe over
`proxy/pipeline.mjs`, capture replayed from record 0 under
`--gates-from-capture`, forwarded bodies dumped for both ordinals;
`outBodySha` 7b6d51c6027e5e2d / 96c35fd312c577d6 agreeing with the
replay report, so the probe measured the same pipeline replay.mjs
does). First divergence over the FORWARDED arrays is index 360, both
sides 414 messages:

    n=220 forwarded[360]  {"role":"system","content":"<370-char string>"}       405 bytes
    n=221 forwarded[360]  {"role":"system","content":[{"type":"text",...}]}     430 bytes

The inner text is BYTE-IDENTICAL. The 25-byte delta is exactly the
JSON of `[{"type":"text","text":` + `}]` — the container, and nothing
else.

(CORRECTED 2026-08-05: this entry first read 403/428. Those were
`JSON.stringify(msg).length` — UTF-16 code units, not bytes, under a
label that said bytes. The message carries exactly one non-ASCII
character, U+2014 EM DASH at index 208 of the extracted text / byte
offset 239 of the n=220 stringify, 3 bytes in UTF-8 against 1 code
unit, present once on each side: +2 and +2. The 25-byte delta is
unaffected, which is why the conclusion stood while the absolute
numbers did not. Found by `tools/absorption-classify.mjs`, which
counts `Buffer.byteLength(..., "utf8")` — the wire's unit — and
disagreed with this entry rather than being reconciled to it.) And `forwarded[360]` of n=221 is byte-present nowhere in CC's
raw array: **we built it.**

ATTRIBUTED BY EXERCISING, not by reading — the probe re-ran the
pipeline one extension at a time and printed the message's container
after each. It enters `insertion-normalization` as CC's merged
`string(699)` at raw index 370 and leaves it as `array[1] text
textLen=370` at index 360; every one of the 12 extensions after it
leaves the container untouched. The named lead in this entry's first
draft — `cache-control-normalize` / `ttl-management`, from the
`mutatedBy` delta — was WRONG, and the trace is what says so.

WHY THE CANONICAL HOLDS AN ARRAY. Because that is the form CC first
sent, and the pin re-serves first-seen bytes. Measured over the
message's whole life in this capture: at n=194 (08:56:27.369Z, its
first appearance) it is `array[1]` carrying
`cache_control {"type":"ephemeral","ttl":"1h"}` — CC had the
breakpoint on it — and from n=195 onward it is a bare STRING for 26
consecutive requests. This is row 24's container flip
(`content:[{type:"text",text:T,cache_control:…}]` -> `content:T`,
"CC wraps a string-content message in a block array to attach the
breakpoint, then reverts it once the marker moves on") seen from the
other side: the flip happened at n=195 and cost nothing, because
nothing re-served that message until the join-move at n=221 did.

**So rows 4 and 24 COMPOSE into a bust neither predicts alone.** The
un-merge is right about the text and right about the index and
re-serves a container that has not been on the wire for 26 requests;
a wrong container diverges the prefix exactly as much as wrong bytes
would. It also explains the timing — the stale container is dormant
until a join-move fires, which is why 26 requests passed clean.

CONSEQUENCE FOR THE READY ITEM: the narrow container normalisation
(BACKLOG, row-24 messages half) now has a SECOND measured instance
and a second, independent reason to exist — it is not only about
absorbing CC's flip, it is about what our own canonical stores. The
named missing evidence on that item ("the container flip has ONE
measured instance and its corpus-wide frequency is unmeasured") is
one instance less missing.

The original live-ledger reading follows, kept because it is what
pointed at index 360 in the first place.

AND THE PREFIX STILL DIVERGED. The live prefix-diff ledger
(`s-af2dced50fc1-events.jsonl`, ts 09:09:01.704Z, view
`forwarded@680`) reports `messages@360(system)` with
`chain.prevContent` and `chain.nowContent` IDENTICAL over their first
~120 chars — both begin "The user sent a new message while you were
working:". So the substitution put the canonical text back and the
two messages still differ somewhere the content preview does not
reach. That is what the measurement above then answered.

WHY NO GATE CAUGHT IT, and this is the part worth carrying. The
capture replays exit 0: stability 0, safety 0, conservation 0,
sequence 0, order 0. Every one of them is correct. **Stability asks
whether OUR output diverged EARLIER than CC's input** — here CC
diverged at raw 369/370 and we diverged at the same logical slot, so
we did not make it worse and the gate is right to stay green. What
no gate asks is whether we ABSORBED it. A mitigation that recognizes
its class, fires, and absorbs nothing is indistinguishable from one
that was never reached, and today the only thing that separates them
is a human reading `movedFresh` against a prefix-diff row. That is a
missing check, booked in BACKLOG.

WHAT THIS DOES NOT SAY. It does not say the un-merge is broken —
recognition fired, the count held, and the text it restored was
correct. It says the row's closing condition (a live non-event) is
NOT met on the deployed build, and that the residual is a
container flip belonging to row 24. Row 4 stays OPEN with this event
against it.

REFUTED HYPOTHESIS, recorded because it was the session's entering
premise and it was wrong in an instructive way: that the divergence
was a periodic re-anchor hook injecting a ~52KB CLAUDE.md corpus
block at the 300k/400k token thresholds. Three independent
measurements kill it. (1) The 52,883-char corpus block is real but
sits at `messages[0]` — the SessionStart `claudeMd` context, present
from the session's first request and byte-identical across the pair,
368 indices before the first divergence. (2) The re-anchor hook DID
fire (crossing 300,000, at `messages[347]`) and its injection is
**2,324 chars, not 52KB**: the harness's persisted-output mechanism
truncated it to a 2KB preview plus a file pointer
(`.../tool-results/hook-…-additionalContext.txt`, 54,266 bytes on
disk). It too is byte-identical across the pair and sits 22 indices
before the divergence. (3) The divergence is 327 bytes of hook prose
changing container. The probe carried its own known-positive — the
corpus needles ("Grounding — evidence", "Insurance mechanisms",
"Model routing for dispatches") MATCHED at `messages[0]`, so the
absence at the divergence is a measured absence, not a dead
predicate. Operator-side consequence, outside this repo: the
re-anchor mechanism is not delivering the corpus it was built to
re-show — only its first 2KB reaches the model.

### Row 3 datapoint — 2026-08-05: a restart cost 655,021 tokens, and the
### row-3 statement that preceded it PREDICTED the class and mis-sized it

The restart at 14:19:51 CEST landed BETWEEN the two requests of a
busting pair (14:19:40 -> 14:19:58), on the machine's longest-running
conversation. `bust-triage`: 786k re-written, transcript
`messages_changed / 655021`, census **append-only** — CC moved nothing
mid-history. The forwarded view diverged at `messages@1180(assistant)`
with `system: match`, `tools: match`, so the change was OURS.

MECHANISM, each link measured rather than inferred:
`identity-normalization`'s message loop runs over EVERY message,
assistant turns included, and applied `normalizeSessionStartText` to
any text block containing the marker ANYWHERE. The anchoring fix
shipped minutes earlier restricts it to blocks that ARE the hook's
output. The diverging message is raw index 1216 — an assistant turn
of this very session — and it contains
`SessionStart:resume hook success:` quoted in prose, in a paragraph
reporting the anchoring fix. Old build rewrote it; new build does not;
the restart swapped builds mid-conversation; the message changed
mid-history; the whole prefix after it was re-billed. It settled after
one re-baseline, as a one-time cost should.

WHAT THE ROW-3 STATEMENT GOT RIGHT AND WRONG. It named the class
exactly: "the forwarded bytes change for a narrow class — messages
quoting the marker in prose — so running conversations with such
content pay a one-time re-baseline." That prediction was correct. The
sizing was not: it closed with "one measured instance corpus-wide, so
cheap and right", and that is the wrong denominator. The corpus is
historical captures; the bill is paid by conversations RUNNING NOW.
The one live session that contained the affected prose was the 800k
session in which the change was being written — the blast radius was
concentrated precisely where the work was happening, which is the
normal case for a change made while using the thing it changes, not a
coincidence.

THE MEASURED NEGATIVE, without which this datapoint would be
over-applied. Six restarts on 2026-08-05 across four code trees; ONE
busted. Boots at 08:03:56, 09:33:39 (tree eec233efa271), 09:57:44
(e5bb97874a74), 11:30:12 and 11:39:11 (d2dd0ea6f9bc), 12:19:52
(9ef42be576bd); the only bust within five minutes of any of them is
the 12:20:13 one above, 21 seconds after the last. The cleanest
control is the 11:30/11:39 pair: it deployed a COMMENT-ONLY scrub of
proxy/**, so the tree hash and the source fingerprint both changed and
the process genuinely restarted — and it cost nothing, because the
forwarded bytes were byte-identical. That isolates "restart" from
"changed bytes" as well as a live experiment can. The 09:57 restart is
a second control: a real behaviour change (the description absorb)
that no live conversation's existing prefix reached.

Restarts are normally free because the state that matters PERSISTS:
insertion-normalization writes its canonical to disk and re-reads it
per request, thinking-block-sanitize re-seeds its v2 state from a
file. A restart loses module-scope memory and rebuilds it from the
same durable state, so it forwards what it would have forwarded a
second earlier.

THE RULE THIS EARNS, and it is narrower and more useful than "restarts
are cache-transparent unless state keys or freeze logic change": that
formulation asks about the DIFF. A restart is transparent only if
nothing an extension does to forwarded bytes changes across it, and
the cost is measured in the TOKENS OF LIVE SESSIONS, not in corpus
instances. Before a restart whose change alters forwarded bytes for a
named class, ask which running conversations contain that class and
how large they are. `tools/restart-exposure.mjs` answers the
size half mechanically.

## Row 24 — messages layer: DESIGN, not a negative (2026-08-02,
## opus investigation, dispatcher-verified independently)

The row's messages half was once graded "probably not mitigable" on the
argument that a 28-message-shorter history is not a subsequence, so
re-serving the pre-exit array would send turns CC no longer believes
exist. The operator rejected that deferral. The argument is not merely
weak — **it is false**, and the measurement says so twice over.

ZERO REAL TURNS ARE DROPPED. Positional LCS over `semanticIds` gives 76
dropped / 48 added (the row's earlier 49/18 was a SET difference and
undercounts). All 76 dropped are `role:"system"`; of the 48 added, 46
are `role:"system"` and the other two are ordinary tail growth. Two
mechanisms, both decoration: (a) PreToolUse hook contexts are not
replayed on resume — 37 `PreToolUse:Bash` messages plus the Pre-halves
of 9 combined Pre+Post messages are present pre-exit and absent after;
(b) the recurring task-tools nudge is re-emitted at different indices,
byte-identical text, its cadence counter restarted by the resume.

VERIFIED INDEPENDENTLY by the dispatcher on a DIFFERENT identity
function (raw content hashing, not replay.mjs's semanticIds — an
independent check that borrows the instrument inherits its blind spot):
**846 of 846** of the pre-exit array's real turns embed in the resumed
array as a clean subsequence, once `messages[0]` and 3 turns are set
aside. PRECISION, because the two levels get confused: "zero real turns
dropped" holds at POST-NORMALIZATION identity. At raw bytes the dropped
multiset is 46 system + 3 USER, and those 3 differ only by an
in-message `<system-reminder>` block that the ALREADY-SHIPPED volatile
pin absorbs. A later reader checking the claim at the wrong level will
think it failed.

WHAT PINNING REACHES, nested, same pair:
- `messages[0]` alone: divergence 0 -> 41, i.e. 198,686 of 1,743,269
  message bytes = 11.4%, ~67k tokens. **Not worth a restart alone** —
  which is exactly why the row's original single-layer design would
  have underdelivered.
- plus the `role:"system"` layer canonicalised: 99.63%, ~589k tokens.
- plus the shipped volatile-block pin: **100.00%** — 849 of 849
  non-system turns match. The post-resume array is a strict SUPERSET of
  the pre-exit conversation: same real turns, same order, byte-identical
  modulo decoration, plus 3 new tail items.

A SECOND ROOT CAUSE THE ROW DID NOT HAVE, and it is NOT resume-specific.
The 16:13:10 request is a clean MESSAGE-LAYER ISOLATION — `cacheRead =
15,223`, exactly tools+system, byte-identical across that pair — and it
still re-billed 588,956. Byte firstDivergence is 937, the last message
of 938: `role:"system"`, the SessionStart:resume hook output, inner text
BYTE-IDENTICAL at 21,570 chars. Only the CONTAINER differs —
`content:[{type,text,cache_control}]` becomes a bare string `content:T`.
CC wraps a string-content message in a block array to attach the
breakpoint, then reverts it once the marker moves on. Trigger is
computable: the breakpoint lands on a message whose natural
serialisation is a bare string, which is precisely these harness-emitted
`role:"system"` messages — it does not fire on ordinary multi-block
messages, which is why it is not busting every turn. TWO-VARIABLE
CAVEAT, stated rather than attributed: container shape and the
`cache_control` marker changed together at 937, so this pair cannot say
which the server hashed.

COST MODEL, general and worth its own line — it sharpens every other
row. Dispatcher-measured over the whole capture, 1,512 requests with
messages: **1,414 carry a message-layer breakpoint and every one of them
carries exactly ONE — no exceptions.** That single-mark fact is what
"no partial credit" rests on: any divergence before the tail breakpoint
forfeits the entire message prefix. Placement is the softer half and
must be written as such — 1,408 put the mark on the final message and
**6 put it one-to-two from the end** (e.g. 43.1 of 45, 172.1 of 174);
the remaining 98 requests are single-message sidecar traffic carrying no
mark at all. "Always on the last message" is falsifiable in six places;
"one breakpoint, normally on the tail" is not.

DESIGN (simulated on the real pair, not reasoned): widen phase-3's
volatile pin from BLOCK level to MESSAGE level — a whole `role:"system"`
message that is harness-emitted decoration is volatile in the same sense
a `<system-reminder>` block already is — keyed on the existing canonical
entry identity (`computePinnedIdentities`, hash|role|ordinal). ONE
CHANGE REQUIRED: today's removal tolerance marks a canonical entry
missing from incoming as dropped and never forwards it; for this class
it must RE-SERVE the canonical first-seen bytes at their canonical
position. Order violations among survivors and >50% drops keep
resetting — 76/966 = 7.9%, far under. Simulation: forwarded = canonical
A (966, first-seen bytes) + the 48 unmatched B entries in B order =
1,014 messages; `firstDivergence(A, forwarded) = null`, so A is a PURE
PREFIX and the pre-exit breakpoint at 965 is readable;
`validateToolAdjacency` true; the only 3 messages not byte-present are
the already-shipped volatile-pin cases.

SAFETY, and it is stronger than the usual stale-serve argument: the
re-served bytes are ones the model ALREADY SAW in this same
conversation, at the same positions, adjacent to the same tool calls.
The canonical array IS the conversation as the model experienced it, and
CC's resume reconstruction is the lossy party — so this pin does not
serve a stale view, it serves the true one.

NAMED RISK, carried into the build: pinning first-seen bytes for a
message that carried a breakpoint re-serves a stale `cache_control`
beside the live one. The API allows 4, so two is in budget, but the
implementation must COUNT them rather than assume.

NAMED GAP, not bridged: the container flip has ONE measured instance;
corpus-wide frequency is unmeasured. The check that would settle it —
"divergence at a string-content message that previously carried
cache_control" — does not exist in replay.mjs.

THE CHEAPER DESIGN THIS BASIS DOES NOT RULE OUT, per the standing
not-a-cheap-negative rule applied in the affirmative direction: normalise
ONLY the string <-> single-block container and leave `cache_control`
alone. That is narrower than the message-level pin and, because the
588,956 half needs no tools or system fix, **it would cover the
unconditional half by itself**. Price it before building the wider pin.

VALUE SPLIT, which decides scheduling: 588,956 tokens are recoverable by
this design ALONE, gated by nothing. A further ~603,242 needs row 23's
tools absorb AND the system-prompt half to BOTH land, because the cache
is a strict prefix [tools][system][messages] and tools differ by
construction on resume. **The system-prompt half is therefore the
binding constraint on the resume's FIRST request — not the messages
half.** Session profile for scale: 20 busts over 100k in this session,
4,566,292 tokens re-billed; the resume pair is 1,192,198 of that, 26%.

## Event walk 2026-07-31 — ❄ 51k previous_message_not_found:
## CONTROLLED-CAUSE (instrument false positive, no bust)

Statusline showed `❄ 51k previous_message_not_found (12m)` on session
s-captureN. Walked to disposition (basis: worktime activity ledger +
the session transcript's own `cache_miss_reason` diagnostics):

- The session sat idle ~10h (last turn 22:11Z at ~355k ctx, past TTL),
  operator resumed and ran `/compact` FIRST (07:54–07:56Z), then the
  first real prompt at 08:28Z. First API call 08:29:04Z: cc=51061,
  cr=0, `previous_message_not_found` — the inherent first write of the
  brand-new post-compact prefix. Next call read cr=51061 immediately;
  caching healthy throughout. Compact-before-work SAVED a 355k rewrite
  (optimal operator behavior). Nothing proxy-side; no mitigation
  target exists here.
- Why it displayed as a bust — three stacked worktime instrument
  defects (booked in claude-worktime BACKLOG, not here): (1) the
  compact-completion render logged a tokens entry `cr=0,cc=0,ui=0`,
  resetting the idle clock (gap read 32min, not 10h → idle classifier
  missed) and zeroing the cold state's prev-ctx (→ the compact-skip
  predicate `cc ≥ 0.6×prev` fired on prev=0); (2) the busting turn's
  transcript entry wasn't flushed at detection (race) → cause "other"
  → the resume-split (`previous_message_not_found` never books a hit)
  could not fire → false k:"hit" in the ledger; (3) the late-bind
  cause upgrade lacks that split, so the resume-class cause landed in
  the ❄ display — a token the split's contract says never renders it.
  Check-fires-on-non-defect class: each false ❄ trains the operator to
  discount the real ones. FIXED same day (claude-worktime 62420da,
  red-first, suite green): zero-usage renders never persisted;
  late-bind retracts via k:"hit-retract" (readers drop retracted
  hits); the live false hit and the session's ❄ state retro-corrected.

## Hygiene residual — ACCEPTED 2026-08-05: the 8-hex capture-key
## prefix in published history

Full measurements and basis: BACKLOG.md, "ACCEPTED 2026-08-05 … the
8-hex capture-key prefix". Summary for this matrix: the working tree
is clean and the forward gate is closed (contents across every text
type, object key names, and commit messages); what remains is 21
distinct prefixes in fork-main's own commit history and 31
occurrences in three open PR branches' messages, held in upstream's
`refs/pull/N/head`. Upstream's `main` is NOT exposed — both merged
PRs were checked and carry none of the class.

Accepted rather than remediated because remediation does not exist:
GitHub retains `refs/pull/N/head` after force-push and after close
(#294/#296 precedent), so no action produces "the bytes are gone".
And the value is near zero — an 8-hex prefix of a session UUID names a
LOCAL conversation, authenticates nothing, and is worth something only
to a holder of the corresponding capture, which is never published.
That is the opposite of the origin-IP precedent, where the leaked
value WAS the attack surface and remediation meant rotating the host.

Re-opens if a capture becomes public, or if upstream asks for the
branches to be rewritten.

## External issue sweep vs. this stack — coverage matrix (2026-07-29)

A sweep of anthropics/claude-code issues (33 included, 25 read in full;
report: sonnet dispatch, cc-cache-invalidation-report) deduplicated to ten
cause classes. Coverage verdicts, each measured where possible:

- COVERED — tools[] mutation (#81967, #75142, #63930-A, #63792):
  deferred-tool-rewrite; announcement on opus/fable, safe degrade elsewhere.
- COVERED — historical byte drift (#48734 stochastic trailing newline,
  #40524, #81077 relocation): canonical identity + volatile pin.
- RE-OPENED 2026-07-29 — hook-reminder re-render (#76606), first
  in-house instance: s-4b6a435234bf n=26->28 (16:52:11Z), PreToolUse
  additionalContext removed from the tool_result at index 30 and
  re-inserted as a standalone system message at index 31; ~65 kB
  delta, 124k tokens re-billed live (worktime ledger 16:52:58Z,
  cause 'other'; prefix-diff cause=messages@31(system) on the wire).
  CORRECTED same day (sonnet probe + fingerprint check): the earlier
  "mitigation kind null, passed through" reading came from a replay
  under DEFAULT gates — the dev-loop's replay-the-serving-config
  violation, instrument error; the serving process ran current code
  (source-fingerprint 8349b0e665c8 = /health = disk; note the
  fingerprint is sha256-content, NOT a git tree — comparing it to
  git hashes is the hand-rolled-identity error, made twice before
  being checked). RESOLVED same evening (fidelity probe): replay is
  byte-faithful to the wire (outSha match), and "mitigated:true" was
  the METRIC's input-side blindness — the pipeline's real behavior
  was restore-the-pin AND forward the duplicate, a splice at 31 that
  re-billed 124k. MITIGATION BUILT 2026-07-30 (c5d870d, decision B
  pin-and-suppress): the positional rebuild suppresses a standalone
  message whose wrapper-normalized bytes equal a live pinned block;
  red-green on the real pair edit@31 ~61 kB -> edit@48 ~5 kB (the
  residual is ttl-management's cache_control relocation at the old
  tail — a different extension, expected); full-corpus gate under
  boot-record gates 0/0/0/0; declared exemptions in replay's safety
  AND stability gates (the stability one was unbriefed — found by
  full-corpus replay, 67 false fires before the fix); output-guard
  needs none (no message-count invariant by design, its directive
  line 58, 0 fires over 1190 requests). Census annotation shipped:
  blockMigration on splice and edit rows (5cdf51b, red-tested,
  fires on all four in this capture — only ONE produced a live cold
  event). BUILT, NOT YET SERVING: pending proxy restart (dotfiles
  pin bump, stated session boundary). Row closes on the live
  non-event, not on the build.
- COVERED (mechanism now attributed) — mid-history nudge anchoring
  (#78660, #68140, #80604): row 4 above.
- NEUTRALIZED BY CONFIG — subagent 5-minute TTL pinning (#74318): outcome
  records across all captures show 100% of cache writes on the 1h tier,
  0 tokens on 5m — ttl-management's env forcing already covers it.
- RE-MEASURED 2026-07-30 (was "ABSENT ON THIS SETUP", one instance across seven captures probed 07-29) — hidden duplicate request (#78420, v2.1.209+): the standing census counter (findDuplicateRequests) finds ~100 adjacent byte-identical pairs on the two CURRENT captures (72+28, in streaks). Probe verdict: the growth is the CORPUS, not the definition (global-adjacency vs per-conversation differs only +2/+15); the streaks themselves are retry-shaped — distinct capture ids, backoff-shaped intervals (2.6s->35s plateau), and ZERO matching outcome records, i.e. none billed — client retry against repeated upstream/proxy errors, not the #78420 double-billing shape (which requires billed duplicates). Cost-relevant disposition UNCHANGED: no billed duplicate observed. Confirming evidence source arrives with the upstream-error-log gate flip (booked, rides next restart): the error timestamps should line up with the streaks. The counter re-answers daily; a BILLED duplicate re-opens the row.
- MEASURED INACTIVE — thinking-block classes (#76253 fable prior-turn
  drops, #69568 resume signature replay). Probed 2026-07-29: 2 of 323
  consecutive fable pairs showed a thinking block leave shared history
  (context-pruning-shaped) — nothing like "every exchange". And every one
  of 277 thinking blocks in this fleet's deep history is a signature-only
  stub with EMPTY text — CC already omits completed-turn thinking content
  here, so v2StripSigned's target population is zero bytes; it stays OFF
  on the same logic that parked READ_DEDUPE. Neither class has automatic
  surveillance: if #76253 activates it surfaces same-day as per-turn
  cold rewrites in the worktime counter (loud), but #69568's
  population turning non-empty is watched by nothing — spec for a
  harvest-side shape watch is in the dotfiles BACKLOG.
- NOT COVERED, CC-must-fix — resume/fork boundary classes (#51764 measured
  41-99pp hit-rate delta; #77306 session-id inside system-prompt scratchpad
  path; #78720 git status in system prompt; #65805 dropped [1m] modifier;
  #44724 subagent identity string; #44045 skill_listing scatter; #47756
  /clear artifacts): each embeds genuinely-new content in the prefix or
  changes identity keys; a proxy rewrite would lie to the model about real
  state. Mitigation belongs upstream; our exposure is MEASURED, not
  assumed (2026-07-29 probe over all captures): zero deep resume-shaped
  boundaries, two shallow ones (26->28 msgs, subagent-continuation
  shape). Why plain --resume is near-clean HERE: it keeps the
  session-id, so the scratchpad path in the system prompt holds
  (CC#77306 needs a FORK); the git-status variant needs -p --resume
  (CC#78720); overnight resumes land after TTL death and book as idle.
  Attribution machinery for the class is parked in BACKLOG.md — busts
  would already be LOUD in the worktime counter, only unlabeled, which
  distinguishes this from the silent thinking classes that earned
  watchers.
- NOT MITIGABLE — version-correlated prompt growth (#46917, #47528):
  real content changes.
- EXPOSURE NOTED — >200K cold-context ECONNRESET (#79989): this fleet runs
  the 1m beta at 700k+ contexts; if a session ever hard-fails on every
  request after going cold, this is the first hypothesis (a forward-path
  retry/backoff would be the mitigation candidate).
- N/A — usage hygiene (#69468): tracked by worktime/statusline already.
