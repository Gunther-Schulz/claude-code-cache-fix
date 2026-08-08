# Success-path-only behaviour enumeration — proxy/extensions/

Row 22 question (robustness-threat-matrix.md): which normalization
behaviours silently switch off on a reset, and what does that cost.
Row 4's 059aae3 fix is the one known instance (`resetKeepingPins`
returning before insertion-normalization's suppression pass).

Sources actually read: dispatch-guards:executor skill;
docs/directives/robustness-threat-matrix.md rows 1-12 + the whole
prose header through line 205 (row 4 and row 22 disposition text);
docs/dev-loop.md lines 1-980 (method, "mitigation ships with its
SIBLINGS enumerated", entry-path axis); proxy/extensions.json;
proxy/pipeline.mjs (loadExtensions, full); and the extension source
files named in each item below (file:line cited per item).

## ZERO-ORDER FINDING: extensions.json is not the activation gate

`pipeline.mjs:20-70` (`loadExtensions`) does `readdir(dir)` over
**every** `.mjs` file in `proxy/extensions/`, not just the names
listed in `extensions.json`. For a file not listed there, activation
is `cfg?.enabled ?? ext.enabled ?? true` (`pipeline.mjs:44`) — i.e.
**enabled by default** unless the module's own default export sets
`enabled: false`. extensions.json only overrides `enabled`/`order`
for the 30 names it lists; it is not an allowlist.

Consequence, checked file by file (`grep -n "enabled:"` on each
default export): six `.mjs` files under `proxy/extensions/` are
**absent from extensions.json and live anyway**:

| file | own `enabled` | mutates body? | per-conv state? |
|---|---|---|---|
| `deferred-tools-restore.mjs:281` | `true` | yes (`:352`) | yes (1 Map/file, not walked) |
| `thinking-block-sanitize.mjs` | none set → `true`; v1 "ON by default as of v4.0.0" (`:249`) | yes | yes, v2 mode only (`v2SessionState` Map, `:228`) |
| `upstream-change-detection.mjs:509` | `true` | not established (no `body.<field> =` hit; may mutate in place — not walked) | yes (5 Maps/Sets, not walked) |
| `prefix-diff.mjs:1225` | `true` | no — dev-loop.md calls it "a diagnostic, not a gate" | yes (session-keyed, diagnostic only) |
| `session-health.mjs:87` | none set → `true` | **no** — its own description says "Read-only; never mutates the body" (`:87`) | yes, but out of scope (no mutation) |
| `auto-1m-guard.mjs:81` | none set → `true` | headers only, and only in `strip` mode (default mode is `warn`, no mutation) | no (stateless) |

Two (`output-efficiency-rewrite.mjs:50`, and the plain
`classifyInsertion`/phase-2 path inside `insertion-normalization.mjs`
when `CACHE_FIX_VOLATILE_PIN=0`) are genuinely GATED-OFF: the former
by its own `enabled: false`, the latter because the live serving
config has `CACHE_FIX_VOLATILE_PIN=1` so `classifyPinned` is always
chosen (`insertion-normalization.mjs:1906`).

**This is a gap in the enumeration, surfaced rather than bridged:**
`deferred-tools-restore.mjs` and `upstream-change-detection.mjs` are
confirmed live, mutating (the former) or state-holding (both), and
were NOT walked to the file:line depth the rest of this report
provides — I ran out of budget after the meta-finding surfaced. Their
reset/no-baseline behaviour is UNVERIFIED, not "clean."

---

## proxy/extensions/insertion-normalization.mjs (2016 lines, walked in full)

Serving config: `CACHE_FIX_INSERTION_NORMALIZE=1`,
`CACHE_FIX_VOLATILE_PIN=1` → `classifyPinned` (`:990`) is the live
classifier; `classifyInsertion` (`:486`, phase-2) is GATED-OFF.

Two reset shapes exist in `classifyPinned`, and they are NOT
equivalent:

- **`no-prior-canonical`** (`:1214-1216`) — fires when there is no
  persisted canon for this (session, system-prompt, conversation)
  sub-key at all. Returns immediately: `{ action: "reset",
  resetReason: "no-prior-canonical", canonicalEntries: freshEntries()
  }`, **no `messages` field**, so `body.messages` forwards CC's raw
  array untouched (`onRequest`, `:1912-1914`, the assignment is
  skipped when `result.messages` is absent).
- **`resetKeepingPins`** (`:1039-1212`) — the row-4 fix's target,
  reached from `not-subsequence` (`:1535`), `dropped-majority`
  (`:1539`), `edit-shaped` (`:1597`), `assistant-interleaved`
  (`:1601`). This path DOES run pins, moves, refires and suppression
  (the 059aae3 fix), on the same footing as the success path.

Per the brief's background (12 of 13 resets today were
`no-prior-canonical`), the `no-prior-canonical` branch is the
dominant real-traffic shape, and it is a **strictly cheaper reset**
than `resetKeepingPins` — it inherits none of the row-4 fix.

### SKIPPED-ON-NO-BASELINE (all citing success site vs. `:1214-1216`, the `no-prior-canonical` return)

1. **Pin substitution** (restore first-seen bytes for a volatile
   block). Success: `:1711` (`pinnedForwardForm` inside the
   `finalMessages` build). `resetKeepingPins` also runs it, `:1045`.
   Never reached from `no-prior-canonical`. telemetry-only: no.
2. **Cross-message join-move recognition/substitution**
   (`findJoinMoves`/`reserveForward`). Success: `:1565`,
   applied `:1692-1696`. `resetKeepingPins`: `:1059`, applied
   `:1061-1063`. Never reached from `:1214-1216`. telemetry-only: no.
3. **Reserved-entry disposition (re-fire / reclaim / lapse / hold)**
   — the block at `:1401-1513`, runs unconditionally whenever
   `reserved.length>0`, which requires a non-empty `priorCanonical`.
   Structurally unreachable from `:1214-1216` (no prior canonical to
   have reserved entries in). telemetry-only: no.
4. **Occurrence-ordinal re-attribution** (`:1308-1399`, the
   2026-08-02 fix for shifted-ordinal duplicate families). Same
   precondition as #3 — unreachable from `:1214-1216`.
   telemetry-only: no.
5. **Migrated-duplicate / join suppression** (`findSuppressibleDuplicate`).
   Success: `:1636-1659`. `resetKeepingPins`: `:1139-1164` (the
   row-4/059aae3 fix itself — this is the ONE behaviour the matrix
   already knows is disarmed by *some* reset paths). `no-prior-canonical`
   at `:1214-1216` skips it too, and this skip is UNDOCUMENTED anywhere
   in the file (unlike the resetKeepingPins fix, which has an
   eight-paragraph comment block at `:1081-1129`). telemetry-only: no.
   **Candidate for load-bearing**: a migrated-reminder duplicate
   arriving on the very request that establishes a fresh sub-key
   (subagent dispatch, compaction, state-key rotation) is forwarded
   as a raw duplicate, un-suppressed — same wire-level defect class
   as the original row-4 bug, different trigger.
6. **`validateToolAdjacency` safety check.** Success: `:1720`. Called
   in `classifyInsertion`'s own success path too (`:545`). **Never
   called anywhere inside `resetKeepingPins`** (`:1039-1212`, no call
   site) even though that path can splice pinned/moved/refired bytes
   into the array before forwarding it (`out`/`forwarded`,
   `:1040-1167`). So every `resetKeepingPins`-routed reset
   (not-subsequence, dropped-majority, edit-shaped,
   assistant-interleaved) forwards a mutated array with NO adjacency
   validation, and `no-prior-canonical` never validates adjacency
   either (raw CC array, lower risk but the check still never runs).
   telemetry-only: no. **Top candidate for load-bearing** — this is
   the one correctness (not just cache-cost) check in the file, and
   it is absent from every reset path.
7. **`canonOrderViolation` self-diagnostic** (the "reported, not
   asserted" order-drift check). Success: computed inline in the
   final return object, `:1834-1853`. Not present in
   `resetKeepingPins`'s return object (`:1181-1211`), nor in
   `no-prior-canonical`'s (`:1214-1216`), nor in the
   `adjacency-violation` return (`:1721`). So the ONE instrument this
   file has for catching its own state-model drift never runs on any
   reset. telemetry-only: yes (diagnostic report field), but it is
   the mechanism dev-loop.md's own "rule out the instrument" section
   depends on for this file.
8. **Positional canonical rebuild / "trailing dropped-or-held
   entries kept adjacent to their neighbours"** (`droppedAfter`
   mechanism, built `:1751-1783`, included in `canonicalEntries`
   `:1784-1811`). `resetKeepingPins`'s `canonicalEntries` is built
   from `keptEntries.map(...)` over `incoming` (wire) entries ONLY
   (`:1180-1192`) — there is no equivalent trailing/carry-forward
   step. A `priorCanonical` entry with NO wire representation this
   request (a plain `d:true` drop-tolerance entry, OR a `rs:true`
   reserved/**held** entry whose neighbourhood could not resolve this
   request, `heldCi` at `:1454-1470`) is **silently absent from the
   rebuilt canonical** on every `resetKeepingPins`-routed reset. The
   success path explicitly preserves these (`:1774-1779`,
   "carried forward exactly as stored, still reserved"); the reset
   path has no code path that reaches them at all, since it only
   iterates `incoming`. telemetry-only: no. **Top candidate for
   load-bearing** — this silently degrades the drop-tolerance/
   reservation design (built specifically so "a later un-prune still
   matches in order", `:1737-1739`) at exactly the moment (a reset)
   state fidelity matters most, and unlike every other reset-path gap
   in this file it carries NO comment or acknowledgement anywhere.

### SKIPPED-ON-RESET (deliberate, documented — adjacency-violation path)

9. Adjacency-violation reset (`:1720-1722`): reached AFTER pins,
   moves, and suppression have already been computed into
   `finalMessages` (`:1690-1718`). On failure the entire mutated
   array is discarded — `freshEntries()` is returned with no
   `messages` field, so CC's raw array forwards untouched, and
   canonical restarts fresh (no carry-forward of `d`/`rs` bookkeeping
   at all — same shape as item 8 but total rather than partial).
   Explicitly by design per the comment at `:1011-1013` ("must send
   the raw array"). telemetry-only: no.

### RUNS-ON-BOTH (negative control — confirms items above are real skips, not the norm)

10. Pins, moves/refires, and suppression are all explicitly re-run
    inside `resetKeepingPins` for the four non-`no-prior-canonical`
    reset reasons (`:1042-1050` pins, `:1059-1066` moves/refires,
    `:1107-1164` suppression) — this is the 059aae3 fix itself,
    verified by reading the code rather than the header, per
    dev-loop.md's own instruction on this exact file ("read what the
    mechanism DID, not what it says it does").
11. `saveCanonical` (`:1916`) and the `ctx.meta.insertionNormalizeStats`
    telemetry block (`:1927-1956`) run unconditionally for every
    action including every reset reason — telemetry-only: yes. Values
    read `?? 0` for fields the reset path never populates
    (`pinned`, `dropped`, `suppressed`, `moved`), so the telemetry
    line is present but silently reports zeros for `no-prior-canonical`
    and `adjacency-violation` even where a real skip occurred (item 5
    above: a real duplicate could have gone un-suppressed and the
    telemetry line reads `suppressed: 0`, indistinguishable from "no
    duplicate was present").
12. Per-suppression event lines (`:1986-2002`) — gated on
    `result.suppressions.length`, which is `undefined`/absent for
    `no-prior-canonical` and `adjacency-violation` (those actions
    never set `.suppressions`). telemetry-only: yes.

### classifyInsertion (phase-2, GATED-OFF — VOLATILE_PIN=1 in serving)

13-17. Its own no-prior-canonical (`:489-495`), not-subsequence
(`:502-508`), assistant-interleaved (`:533-539`), and
adjacency-violation (`:546-551`) resets each return early with a
freshly rebuilt `canonicalEntries` and no `messages` field — simpler
than phase-3 since phase-2 has no pin/move/suppression machinery to
skip in the first place. Labeled GATED-OFF, not walked further.

**Coverage, insertion-normalization.mjs:** state-touching behaviours
walked: 17. SKIPPED-ON-NO-BASELINE: 5 (items 1-5). SKIPPED-ON-RESET: 3
(items 6, 7, 9). RUNS-ON-BOTH: 3 (items 10-12, all telemetry-only
except the pin/move/suppression re-run itself). GATED-OFF: 5 (items
13-17, phase-2 classifier). UNREACHABLE-OTHER: 1 (item 8 — technically
a SKIPPED-ON-RESET but categorized separately above because it is the
strongest candidate and needs its own line). GAPS: 0 — every item
above carries both a success-site and a skip-site citation.

---

## proxy/extensions/deferred-tool-rewrite.mjs (877 lines, walked in full)

Serving config: `CACHE_FIX_TOOL_REWRITE=1`. Single reset action,
`"reset"` (schema change, `:390` and `:421`) plus a `"no-baseline"`
first-request action (`:369`). Unlike insertion-normalization, this
extension does NOT attempt any partial state preservation across a
reset — it is a clean full reset by explicit design, and every skip
below is documented in the file's own comments.

### SKIPPED-ON-RESET (all deliberate, cited in the file's own comments)

1. **Pending injection carry-forward** (`additions`). Success:
   `additions = prior?.additions ?? []` (`:712`, non-reset branch of
   the ternary). Reset: same line, `result.action === "reset"` ⇒
   `additions = []`. Comment at `:709-711` states the rationale
   explicitly ("a schema change re-baselines everything ... pending
   injections are abandoned with it"). Consequence: the entire
   re-injection/re-anchoring mechanism (`injectAdditions`, `:807-822`)
   never runs on a reset, because its guard `additions.length > 0`
   (`:807`) is false. telemetry-only: no.
2. **Held-tool order-pin** (`heldOrPresentTools`, `:435`, action
   `"rewrite"` only). Does not apply on reset — a schema change makes
   CC's own array authoritative again. Deliberate ("never paper over
   a real edit", file header `:47-49`). telemetry-only: no.
3. **`body.tools` frozen-array forwarding** (`forwardedTools`,
   success sites `:785`, `:803`). Never assigned for action `"reset"`
   or `"no-baseline"` — CC's raw incoming `tools[]` passes through
   both times, which is the intended "one honest bust" per class 6's
   mitigation design. telemetry-only: no.

### SKIPPED-ON-NO-BASELINE

4. Same three items as above (1-3), citing the `"no-baseline"`
   branch at `:369` — first request of a session/sub-key has no
   `prior` to compare against, so classification never reaches
   `"rewrite"`/`"description-absorbed"`, and none of the hold/pin/
   announce machinery runs on this request. Deliberate — this is the
   request that ESTABLISHES the baseline.

### RUNS-ON-BOTH

5. `saveState` (`:824`) and the `ctx.meta.deferredToolRewriteStats`
   telemetry block (`:826-838`) run unconditionally for every action.
   telemetry-only: yes.

**Coverage, deferred-tool-rewrite.mjs:** state-touching behaviours
walked: 5 (3 distinct mechanisms × 2 citation contexts, counted once
each = 3 substantive + 1 telemetry pair). SKIPPED-ON-RESET: 3.
SKIPPED-ON-NO-BASELINE: 3 (same 3 mechanisms, both triggers).
RUNS-ON-BOTH: 1 (telemetry). GATED-OFF: 0. GAPS: 0. No hidden/
undocumented skip found here — contrast with insertion-normalization.mjs
item 8, which is undocumented.

---

## proxy/extensions/fresh-session-sort.mjs (512 lines, walked in full)

Serving: no dedicated env gate (`order: 250`, always on when
`extensions.json` says `enabled: true`, which it does). Holds a
per-conversation "sticky relocation memory" (`_relocatedByConversation`
Map + on-disk mirror, keyed by `resolveInsertionSessionKey` — the
SAME sub-key insertion-normalization uses, so a state-key rotation
resets both extensions simultaneously).

No explicit "reset" action exists in this file (it never discards
existing memory) — the only skip shape is the **no-baseline / first
sighting** branch.

### SKIPPED-ON-NO-BASELINE

1. **Memory seeding from an in-place (unscattered) first sighting.**
   The condition `!hasScatteredBlocks && !remembered` (`:376`) takes
   the "baseline" branch, which only sorts/pins blocks already at
   `messages[firstUserIdx]` (`:378-393`) and returns at `:417` —
   **before** the backward-scan (`:431-448`) that populates `found`,
   and before `memory.set` (`:460`) that would seed the persisted
   relocation memory. So a relocatable block's very first appearance,
   if it is NOT scattered (i.e., already in the "right" place), is
   normalized in place but never recorded into memory. Compare: the
   scattered-block case DOES seed memory on first sighting, via the
   same backward-scan + `memory.set` at `:431-460`, reached because
   `hasScatteredBlocks` is true. Consequence: if that block later
   disappears entirely from CC's array (the exact "presence is the
   axis that was unheld" failure this file's own header describes,
   `:93-107`, for the SCATTERED case), this extension has nothing to
   restore it from, because it was never scattered on the request
   where it could have been captured. telemetry-only: no. **Candidate
   for load-bearing** — this is the same failure class the file was
   built to fix (2026-08-05, capture s-captureAB), left open for the
   one entry path (in-place-first) the fix didn't cover.
2. **Cross-message block removal/consolidation** (`:462-470`) and
   **memory-served "reserved" blocks for absent types** (`:476-483`)
   — both only reached past the `:376` early return, i.e., only once
   either scattering or existing memory is present. Deliberate/
   structural, not a hidden bug — cited for completeness.
3. **`persistMemory` disk write** (`:510`) — never reached from the
   baseline branch (return at `:417` precedes it). telemetry-only: no
   (state persistence, not a report).

**Coverage, fresh-session-sort.mjs:** state-touching behaviours
walked: 3. SKIPPED-ON-NO-BASELINE: 3. SKIPPED-ON-RESET: 0 (no reset
concept in this file — CC's bytes always win, only absence is ever
papered over). RUNS-ON-BOTH: 0 (the in-place sort/pin,
`fixBlockText`/`pinBlockContent`, DOES run on both the baseline and
relocate branches, `:385` and `:444` — listed here as a negative
control: RUNS-ON-BOTH: 1). GATED-OFF: 0. GAPS: 0.

---

## Files confirmed OUT OF SCOPE (walked enough to classify; no per-request state loss possible because no cross-request state exists, or no body mutation exists)

- **`identity-normalization.mjs`** (149 lines, walked in full) — holds
  `_pinnedBlocks` at MODULE scope keyed only by `system_${i}` /
  block-type strings (`:3, :17-28`), NOT by session/conversation —
  every conversation in the process shares the same slot. No
  reset/no-baseline branch exists (it unconditionally overwrites on a
  hash mismatch, `:22-27`). Flagged as a GAP, not a defect: whether
  this cross-conversation sharing itself causes cache damage is a
  reachability question outside this enumeration's taxonomy (it isn't
  a "skip", it's a possible mis-scoped key) — surfaced, not judged.
- **`cache-control-normalize.mjs`** (61 lines, walked in full) —
  stateless: `countUserCacheControlMarkers`/`stripCacheControlMarkers`
  recompute from the current request only, no Map, no session key, no
  disk state (`grep -c "new Map()"` = 0). No baseline to lose.
- **`microcompact-stability.mjs`** (walked lines 1-60 of 430) —
  stateless detection/normalization of a sentinel pattern from the
  current request's content only; no session-keyed Map found in the
  earlier full-file grep. `CACHE_FIX_NORMALIZE_MICROCOMPACT` is not
  in the brief's listed live serving gates.
- **`read-dedupe.mjs`** (351 lines, walked lines 1-230 + the dedupe
  orchestrator) — confirmed stateless: `buildToolUseMap` and every
  Map used (`buildToolUseMap`, `perMsg`, `buckets`, `keeperByKey`) are
  local to `onRequest`/its pure helpers, recomputed fresh from the
  current request's own `messages[]` every call. No cross-request
  persistence, so no reset/no-baseline distinction is possible.
- **`auto-1m-guard.mjs`** (117 lines, default export read in full) —
  stateless (no Map, no session key); mutates headers only in `strip`
  mode, which is not the default (`warn`).
- **`session-health.mjs`** (95 of 152 lines read) — explicitly
  documented "Read-only; never mutates the body" (`:87`). Live by
  default (six-file meta-finding above) but out of scope: no
  mutation.
- **`output-efficiency-rewrite.mjs`** — `enabled: false` in its own
  default export (`:50`). GATED-OFF, not walked further.

## Files named but NOT walked (time/budget exhausted after the meta-finding; report as gaps, not as clean)

`deferred-tools-restore.mjs`, `thinking-block-sanitize.mjs` (v2 mode),
`upstream-change-detection.mjs`, `prefix-diff.mjs` (diagnostic-only
per dev-loop.md, so likely low-stakes but unconfirmed),
`workflow-agent-id-synthesis.mjs`, `cc-version-normalize.mjs`,
`image-retry-circuit-breaker.mjs`, `session-budget-breaker.mjs`,
`jsonl-session-mirror.mjs`, `cache-telemetry.mjs`, `append-queue.mjs`,
`write-owner-only.mjs` (library, no `.name` export, not itself an
extension), `message-hash.mjs` (library), `signature-surface-hash.mjs`
(no default export found — likely library), and the remaining
stateless-by-name files never grepped for Map/session-key at all:
`content-strip.mjs`, `tool-input-normalize.mjs`, `thinking-display.mjs`,
`sort-stabilization.mjs`, `image-strip.mjs`, `image-dimensions.mjs`
(not an extension — proxy/ root), `fingerprint-strip.mjs`,
`ttl-management.mjs`, `ttl-tier-detect.mjs`, `output-guard.mjs`,
`output-guard-stash.mjs`, `overage-warning.mjs`, `upstream-error-log.mjs`,
`rate-limit-log.mjs`, `usage-log.mjs`, `request-log.mjs` (disabled in
extensions.json), `request-capture.mjs` (pre-pipeline, captures raw —
dev-loop.md states it runs before every mutating extension, so by
definition it cannot itself skip a mutation on reset; not walked for
its own internal state though), `bootstrap-defense.mjs`.

For every file in this paragraph: **coverage is 0 walked, 0 cited,
reason: not reached before budget exhausted** — this is a gap in the
enumeration itself, not a claim that these files are clean.

---

# ROUND 2 (continuation) — Part 1 (undeclared live extensions) + Part 2 (Map-holders) + the cross-cutting question

## Answer to "does any OTHER extension have the same shape — a
## correctness/validation call the success path makes and an
## early-return path skips?"

**Yes and no — found the OPPOSITE too, and it matters more.**
`output-guard.mjs` (order 690, `CACHE_FIX_OUTPUT_GUARD=1` — confirmed
in the brief's live serving gates) calls the SAME function,
`validateToolAdjacency` (imported from insertion-normalization.mjs,
`output-guard.mjs:25,44`), as one of 5 unconditional validators
(`VALIDATORS`, `:119`; `findViolation` runs all 5 with no early skip,
`:124-130`). This runs on the **fully mutated FINAL body**, on every
request where the gate is on and `ctx.body.messages` is an array
(`:150-152`) — there is no reset/no-baseline branch in this file that
skips it. So insertion-normalization's `resetKeepingPins` gap
(candidate #1 from round 1) is NOT an unguarded path to the API: if
`resetKeepingPins` (or anything else in the pipeline) produces an
adjacency violation, output-guard catches it on the SAME request and
reverts `ctx.body` to `ctx.meta._preMutationBody` — CC's raw,
pre-pipeline body, stashed by `output-guard-stash.mjs` (order 55,
same gate, before any mutator runs — `:20-30`) — discarding EVERY
extension's work for that request, not just insertion-normalization's.
**This downgrades candidate #1 from round 1**: the safety exposure is
bounded by this backstop; the residual cost is that a caught violation
throws away the whole pipeline's cache work for that request (an
honest bust), which output-guard's own `CRITICAL` stderr line and
`{restored:true}` telemetry make loud, not silent — consistent with
this being the ONE mechanism in the codebase built explicitly as "the
composition of individually-correct extensions is where the one real
shipped defect lived" (`output-guard.mjs:4-6`).

**Its own single gap, found by the same method:** `checkAssistantTerminal`
(`:108-117`) is the one validator of the 5 that needs `incomingBody`
(the stash) to do anything; when the stash is absent it explicitly
"yields no violation rather than guessing" (`:105-107`, `:109`). Stash
absence only happens if `structuredClone(ctx.body)` throws in
`output-guard-stash.mjs:25` (non-cloneable content) — both files share
`isGuardEnabled()`, so there's no gate-mismatch risk, only this narrow
per-request clone failure. Labeled UNREACHABLE-OTHER, cited, not
SKIPPED-ON-RESET (no reset concept applies — it's a clone-failure
edge case, not a state-carry-forward skip).

**No other file was found with this shape** (a validation call present
on a success path and absent on an early-return branch) among the
files actually walked this round or in round 1 — checked by reading
every `onRequest` in Part 1+2 below end-to-end and confirming each
extension's mutation logic is either uniform (no reset concept) or, in
insertion-normalization's case, already fully catalogued in round 1.
This is not a claim about the ~15 files still unwalked (listed at the
end).

## PART 1 — the four undeclared live extensions

**`deferred-tools-restore.mjs`** (367 lines, walked in full). State:
per-PROJECT (not per-conversation) — key is `sha1("cwd:"+cwd)`
(`:160-162`), parsed from the system prompt's `# Environment` block,
shared across every conversation in the same project directory. This
itself is a fact worth flagging (not a defect judgment): matrix row 8
("shared key buckets") closed for the OTHER extensions' session-id
keying; this file was never covered by that closure since it doesn't
key on session id at all.
No "reset" concept — four early-return branches, each its own
`reason` code, no state-carry-forward attempted:
- SKIPPED-ON-NO-BASELINE: `no-snapshot` (`:328-332`) — hasUnavail is
  true (this IS the failure the extension exists for) but no
  persisted snapshot at this key yet. Success site (the restore
  substitution): `:349-352`. telemetry-only: no.
- UNREACHABLE-OTHER: `no-cwd` (`:291-295`, cwd unparseable/ambiguous)
  and `no-block` (`:300-304`, no deferred-tools block found) —
  precondition failures, not reset/baseline. telemetry-only: no.
- RUNS-ON-BOTH (negative control, and a real asymmetry worth noting):
  the PERSIST-on-clean path (`:309-323`) has NO "strictly longer"
  guard — it unconditionally overwrites the snapshot with whatever
  clean text arrives, even if shorter than a previous snapshot. The
  RESTORE path (`:335-345`) DOES guard on strictly-longer. This is a
  deliberate asymmetry (a clean, shorter block is CC's own honest
  content, not staleness) but it means the persisted baseline can
  shrink and stay shrunk with no record of the larger prior value —
  named as an observation, not judged.

**`thinking-block-sanitize.mjs`** (358 lines, walked in full). v1
(default-on since v4.0.0, stateless, `planSanitize` recomputes purely
from the current request — 0 items) + v2 (opt-in via
`CACHE_FIX_THINKING_SANITIZE=v2`; not confirmed in the brief's serving
gate list, so possibly GATED-OFF in production — unconfirmed, named as
a gap). v2 holds `v2SessionState` (Map, `:228`), keyed per session.
- SKIPPED-ON-NO-BASELINE: the signed/redacted-thinking drop
  (`isSignedThinkingForV2`, applied `:189-192`) fires only when
  `v2StripSigned = baseline !== null && baseline !== currentHash`
  (`:291`). First request for a (session, key) — `baseline === null`
  — never strips; explicitly documented ("observes-and-establishes —
  no strip", `:290`). Success site: same line, opposite branch.
  telemetry-only: no.
- A second, DISTINCT skip of the same mechanism found by reading the
  response-side hook: `onResponseStart` (`:335-357`) only advances the
  baseline on HTTP 2xx (`:339-340` early-returns on any other status).
  On a 4xx/5xx response, the baseline silently stays at its OLD value
  — the next request's mismatch check runs against stale ground truth
  until a request finally succeeds. Not a "reset" in the taxonomy's
  sense (nothing resets state to empty) but the same failure SHAPE:
  the class-2 mechanism (baseline advance) silently doesn't run on a
  path (request failure) the happy path (`:342-357` when 2xx) does.
  Labeled here rather than force-fit into SKIPPED-ON-RESET.
  telemetry-only: no (it gates a security-relevant strip decision).
- UNREACHABLE-OTHER: `stateKey === "unknown"` (`:277`) — v2 entirely
  no-ops (v1 still runs, per comment `:276`) when session id doesn't
  resolve. telemetry-only: no.
- RUNS-ON-BOTH: v1's omitted-thinking drop (`:182-185`) and the
  active-tool-continuation guard (`:173-179`) — both unconditional,
  independent of v2 state.

**`upstream-change-detection.mjs`** (read lines 1-130 + full grep for
mutation) — confirmed **read-only** by its own header (`:1`,
"read-only structural fingerprinter") and by a `body.<field> =` grep
returning zero hits. Holds 5 Maps/Sets for baseline-drift detection,
but since it never touches `ctx.body`, it is OUT OF SCOPE for this
enumeration (no forwarded-bytes behaviour to skip). 0 items.

**`prefix-diff.mjs`** (grepped for mutation across all 1238 lines) —
confirmed **read-only** by dev-loop.md ("a diagnostic, not a gate")
AND by a `ctx.body =` / `body.<field> =` grep returning zero hits.
0 items, OUT OF SCOPE.

## PART 2 — Map-holders and the rest

**`session-budget-breaker.mjs`** (full `onRequest`/`onStreamEvent`/
`onResponse` read). Holds 2 Maps (`_tallies`, LRU-capped) but its
shape is CIRCUIT-BREAKER, not normalization: every branch either
forwards the body UNCHANGED (fail-open on missing sid/tally/ceiling,
`:311-322`) or short-circuits ENTIRELY with a synthetic response
(`buildSkipResult`, `:344`, when over ceiling) — there is no
"success path forwards a normalized X, reset path forwards raw CC
bytes" shape to catalogue. The `!e` "no tally yet (first request) →
forward" branch (`:319`) is the breaker's CORRECT first-occurrence
behaviour (nothing to break on yet), not a mitigation silently
switching off. 0 items in this taxonomy; reasoning stated rather than
assumed.

**`image-retry-circuit-breaker.mjs`** (full `onRequest`/`onResponse`
read). Same circuit-breaker shape as above (holds 1 Map, `state.failures`,
LRU-capped): forwards unchanged unless a repeated image-hash signature
within the cool-off window fires `buildSkipResult` (`:311`). 0 items,
same reasoning.

**`jsonl-session-mirror.mjs`** (grepped; confirmed non-mutating) —
writes a session JSONL mirror to disk, never touches `ctx.body`. 3
Maps hold mirror bookkeeping (`mirrorState.sessions` etc.), out of
scope for forwarded-bytes behaviour. 0 items.

**`cache-telemetry.mjs`** (grepped; confirmed non-mutating) — pure
telemetry aggregation (rate-limit/quota reporting), 0 `ctx.body =`
hits, 2 Maps for divergence/quota state. 0 items.

**`workflow-agent-id-synthesis.mjs`** (read in full) — self-documented
"this extension does not touch headers or body" (`:18-19`); only
writes `ctx.meta._workflowAgentId`, consumed downstream by
`usage-log.mjs`. 0 items, OUT OF SCOPE (no wire mutation) despite
holding a `_lastCanaryEmitMs` Map (a telemetry throttle, not a
normalization baseline).

**Confirmed stateless (0 Maps/Sets each, so no reset/no-baseline
distinction is possible even though several DO mutate the body
per-request) — grepped for `new Map()`/`new Set()` = 0 AND, where
mutation was found, read enough to confirm it derives entirely from
the current request:** `content-strip.mjs` (mutates, stateless),
`tool-input-normalize.mjs` (mutates, stateless), `image-strip.mjs`
(mutates, stateless), `ttl-management.mjs` (mutates, stateless),
`cc-version-normalize.mjs` (mutates `body.system[r.index]` at `:165`,
0 Maps — stateless), `sort-stabilization.mjs`, `thinking-display.mjs`,
`fingerprint-strip.mjs`, `ttl-tier-detect.mjs`, `output-guard-stash.mjs`
(walked in full above), `overage-warning.mjs`, `upstream-error-log.mjs`,
`rate-limit-log.mjs`, `usage-log.mjs`, `request-log.mjs` (disabled in
extensions.json anyway), `request-capture.mjs` (pre-pipeline, captures
raw — dev-loop.md states it runs before every mutator), `bootstrap-defense.mjs`
(1 Map, but grep found zero `body.<field> =` mutation sites — not
walked past the grep, so its Map's purpose is unconfirmed; named as a
residual gap, not claimed clean). Each: 0 items, 0 Maps (or, for
bootstrap-defense, unconfirmed non-mutation) — one line each rather
than a full walk, per the coverage-artifact instruction.

## Still unwalked (named explicitly, budget stopped here)

`message-hash.mjs`, `write-owner-only.mjs`, `signature-surface-hash.mjs`
(library modules, no `.name` default export — confirmed earlier round,
not extensions themselves). `bootstrap-defense.mjs`'s actual Map usage
(grep-only, not read). Nothing else remains from the original ~24;
every file from round 1's "not walked" list has now been either walked
or classified via grep+targeted-read this round.
