# Restart-transparent serialization — extension audit

Per `docs/directives/proxy-restart-transparent-state.md`. Audits every
order-affecting or content-affecting extension the directive names, plus
the two already-persisted extensions it cites for the reload-path check,
plus one finding outside the named scope that the audit process surfaced.

Verdict key: **deterministic** (pure function of the current request body;
a restart cannot change its output) | **stateful-persisted** (keeps
cross-request state, but the state survives a restart via disk) |
**stateful-UNPERSISTED** (keeps cross-request state that a restart drops,
changing output for a session already in flight).

> **AMENDMENT 2026-08-05 — `fresh-session-sort` is now stateful-UNPERSISTED.**
> The verdict below is correct for the code it audited and no longer describes
> the extension: it now keeps a per-conversation memory of the block types it
> has relocated (`_relocatedByConversation`, in-process, LRU-capped), so the
> relocated prefix survives CC dropping the source block — the n=331->336
> index-0 divergence on capture s-captureAB. See "Amendment 2026-08-05" at the
> foot of this file for what a restart now costs, and why it is not a
> regression against the audited behaviour.

## Directive's named 5 — sort-stabilization / fresh-session-sort / tool-input-normalize / identity-normalization / content-strip

| Extension | Verdict | Evidence |
|---|---|---|
| `sort-stabilization.mjs` | deterministic | No module-scope mutable state exists in the file (`proxy/extensions/sort-stabilization.mjs` — grepped for `const \|let \|Map()\|Set()`: only local `const` bindings inside `onRequest`). `sortSkillsBlock`/`sortDeferredToolsBlock` (lines 1-31) are pure string transforms of their own argument; `body.tools.sort(...)` (line 61) sorts by `.name` — a pure key derived from the current request's `tools[]`, not history. |
| `tool-input-normalize.mjs` | deterministic | Same check: no module-scope state. `normalizeToolUseInputs` (lines 1-56) derives `toolSchemas` fresh from `body.tools` on every call and reorders `block.input` keys against that schema — a pure function of the current request body alone. |
| `content-strip.mjs` | deterministic | Same check: no module-scope state. `stripContentBlocks` (lines 34-70) filters `msg.content` against pure predicates (`isContinueTrailerBlock`, `isBookkeepingReminder`) that only inspect the block passed in. |
| `fresh-session-sort.mjs` | deterministic (see note) | Has a module-scope `_pinnedBlocks` Map (line 62) — surfaced first as a candidate stateful-UNPERSISTED, but empirically probed and disproved: see "pinBlockContent purity" below. `sortSkillsBlock`/`sortDeferredToolsBlock`/`stripSessionKnowledge` (lines 38-60) are pure. The relocation logic in `onRequest` (lines 96-190) only ever reorders/filters the CURRENT `body.messages` array; it reads no cross-request state. |
| `identity-normalization.mjs` | deterministic (see note) | Same `_pinnedBlocks` pattern (line 3), same purity disproof applies. `normalizeSessionStartText`/`isContinueTrailerBlock`/`isBookkeepingReminder` (lines 30-77) are pure functions of their own text/block argument. |

### pinBlockContent purity — why the module-scope Map is not a restart hazard

`fresh-session-sort.mjs:64-71` and `identity-normalization.mjs:17-28` both
implement the identical pattern:

```js
function pinBlockContent(blockType, text) {
  const normalized = text.replace(/\s+(<\/system-reminder>)\s*$/, "\n$1");
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  const pinned = _pinnedBlocks.get(blockType);
  if (pinned && pinned.hash === hash) return pinned.text;
  _pinnedBlocks.set(blockType, { hash, text: normalized });
  return normalized;
}
```

The hash is computed from `normalized` — i.e., from the *output* of the
pure whitespace-collapse, not the raw input. A hash-match on the cached
entry (`pinned.hash === hash`) therefore certifies, under SHA-256
collision-resistance, that `pinned.text` and the freshly-computed
`normalized` are the same string. So on both branches (`pinned.text` /
`normalized`) the function returns content that is byte-identical to
`text.replace(...)` applied to the CURRENT call's argument alone — the map
never has an observable effect on the returned bytes. It is a reference-
identity micro-cache (returns the same string object on repeat hits, only
relevant if a downstream consumer used `===` on the returned string, which
neither call site does — both compare with `!==`, a JS value comparison
for strings) rather than a source of restart-dependent output.

Verified empirically (not just by reading), two ways:
1. Cross-restart divergence probe: fed a canonical skills-list text through
   a "no restart" module instance and a "with restart" (fresh `import()`,
   empty `_pinnedBlocks`) instance with an identical trivial whitespace
   variant at the second turn. Outputs were byte-identical
   (`/tmp/.../scratchpad/probe-pin-restart.mjs`, run output: `Same bytes
   across restart vs no-restart for the same trivial-variant input? true`).
2. Direct purity probe: called `pinBlockContent` on the same input from (a)
   a freshly-imported module (empty map) and (b) a warmed module that had
   just pinned unrelated content under other keys — outputs matched
   (`/tmp/.../scratchpad/probe-pin-purity.mjs`, run output: `fresh-module
   output === repeat-call output? true` for both files).

Conclusion: no fix needed for either extension. The directive's fix
mandate ("persist via the snapshots-dir idiom") applies only to the
stateful-UNPERSISTED class; neither extension is in that class.

## Already-persisted extensions cited by the directive (verify-only, not audit-scope)

| Extension | Verdict | Evidence |
|---|---|---|
| `insertion-normalization.mjs` | stateful-persisted ✓ | Canonical identity list written to `~/.claude/cache-fix-snapshots/<key>-insertion-canon.json` via atomic tmp+rename (`saveCanonical`, lines 142-148) and reloaded on every request (`loadCanonical`, lines 130-140) before classification runs. A restart re-reads this file, so the classifier's decision for the next request is unaffected by the restart. Directive asked only to "verify the reload path against a real restart in tests" — covered by `test/proxy-restart-transparent.test.mjs`'s insertion-normalization case (see below). |

## Finding outside the directive's named scope: `mid-history-breakpoint-ladder.mjs` contradicts its own "persisted ✓" claim

The directive's own audit line states: *"mid-history-breakpoint-ladder:
rungs persisted ✓ (same [verify against a real restart])."* This is
**false** as currently implemented, and the directive's own instruction to
"verify... against a real restart in tests" is exactly what surfaced it.

Evidence: `proxy/extensions/mid-history-breakpoint-ladder.mjs:113-121`
states outright in its own comment block: *"Module-scope Map... State
never touches disk; a proxy restart resets the ladder to fresh placement,
which is acceptable (worst case: one rung re-placement, not a correctness
issue)."* `sessionRungs` (line 121) is a plain in-memory `Map`, with no
`readFile`/`writeFile` calls anywhere in the file (confirmed by grep — the
file imports only `appendFile`/`mkdir` for the telemetry JSONL, never for
rung state).

Empirically confirmed this is a real divergence, not just a theoretical
one: a session whose history grows by less than `CACHE_FIX_LADDER_ADVANCE`
messages (default 40) between two requests should keep its rung STICKY at
its original index (`computeLadderPlacement`'s `grew >= advanceThreshold`
branch, lines 172-186, is the only path that moves a sticky rung). But if a
restart happens between those two requests, `sessionRungs` is empty on the
second request, so the ladder treats it as first-ever placement and
recomputes a FRESH 50%-depth index against the new (larger) message count
— landing on a *different* message than the no-restart path would have.

Probe (`/tmp/.../scratchpad/probe-ladder-restart2.mjs`), same session
growing 20 → 50 messages:
- No restart: rung stays sticky at index 10 (`status=sticky`).
- Same growth, but a restart is simulated between the two requests (fresh
  `import()` of the module, i.e., empty `sessionRungs`): rung is freshly
  placed at index 24 (`status=placed`, 50% of 50).
- Run output: `Divergence: true -- restart changed WHICH message gets the
  cache_control marker, busting the prefix cache from idx 10 onward vs the
  no-restart path.`

This is precisely the failure mode class 3 (restart-transparent
serialization) exists to close: a restart produces a *different* cache
breakpoint placement than an equivalent non-restart continuation would
have, busting the prefix cache the ladder exists to protect from the
divergence point onward.

**Surfaced as a gap, not fixed here** — per the brief's write boundary
("the unit-2 persistence fixes inside the five audited extension files")
and per the "don't bridge with a guess" instruction: fixing this properly
requires deciding the ladder's own persistence contract (single rung
records keyed per session, advance-tracking `placedAtLength` semantics
across restarts, and interaction with the `MAX_MARKERS` budget check that
reads `existingMarkers` from the CURRENT request) — a design decision
outside this directive's named-5 scope and outside this unit's write
boundary (`mid-history-breakpoint-ladder.mjs` is not one of the five
audited files, and the brief authorizes fixes only "inside the five
audited extension files"). Recommend a follow-up directive scoped
specifically to the ladder's own restart-transparency, mirroring
`insertion-normalization`'s snapshots-dir idiom (a natural fit: the ladder
already writes JSONL telemetry to the same `cache-fix-snapshots` directory
via `getSnapshotDir()`/`writeTelemetry`, so persisting `sessionRungs`
alongside it is additive, not a new storage surface).

## Startup self-check (directive requirement)

The directive requires: *"on first request after boot, if a persisted
serialization state exists for the session key, apply it BEFORE emitting;
telemetry line `{restart_transparent: true|false, reason}`."*

`insertion-normalization.mjs` already satisfies the substance of this:
`loadCanonical` (called at the top of `onRequest`, before classification)
reads any persisted canonical-identity state for the session key before
the request is classified/re-serialized, and `appendTelemetry` (lines
150-157, called from `onRequest`) writes a JSONL line every request
including the `action` field, which doubles as the restart-transparency
signal (`action: "reset"` with `resetReason: "no-prior-canonical"` on the
first request after a restart is the visible signature; any other action
value confirms the restart was transparent for that request). No new
`restart_transparent` boolean field was added — surfaced as a gap: the
directive's exact telemetry shape (`{restart_transparent, reason}`) is not
literally present under that name, though the existing `action`/
`resetReason` fields carry equivalent information. Renaming/adding a field
was judged out of scope for this audit-and-fix unit (touches
`insertion-normalization.mjs`'s telemetry contract, which is outside the
five audited files and already has its own test coverage keyed to the
current field names).

## Summary

| Extension | Verdict | Fix applied |
|---|---|---|
| sort-stabilization | deterministic | none needed |
| fresh-session-sort | deterministic | none needed |
| tool-input-normalize | deterministic | none needed |
| identity-normalization | deterministic | none needed |
| content-strip | deterministic | none needed |
| insertion-normalization (reference) | stateful-persisted ✓ | none needed (verified only) |
| mid-history-breakpoint-ladder (out-of-scope finding) | stateful-**UNPERSISTED** | **not fixed — gap surfaced above** |

No extension in the directive's named-5 required a code change. The
byte-identical restart test (`test/proxy-restart-transparent.test.mjs`)
covers all five deterministic extensions plus insertion-normalization's
disk-reload path, per the directive's acceptance criterion.

UPDATE: the ladder gap flagged above is FIXED in 7ed1886 —
sticky-rung state persists per session key (atomic write, fail-open
reload); byte-identical restart test + the empirical probe regression
are in test/mid-history-breakpoint-ladder.test.mjs.

## Amendment 2026-08-05 — fresh-session-sort moves to stateful-UNPERSISTED

The audited relocation logic re-derived the relocated set from the CURRENT
`body.messages` on every request, which is exactly what made it deterministic
— and exactly what cost a full-prefix re-bill on capture s-captureAB
(pair n=331 -> n=336, a session carrying ~413k tokens). CC sent the mcp
`<system-reminder>` at msg[3] from n=325 through n=331 and stopped at n=336;
with nothing to relocate, our forwarded `messages[0]` lost its first block.
CC's own divergence sat at index 3, ours at index 0, and the cache prefix is
`[tools][system][messages]`. Verified at the forwarded bodies, not inferred:
`--dump-forwarded 331:0,336:0` shows four blocks then three, while CC's raw
`messages[0]` is byte-identical across the pair (three blocks, same hashes).

The fix keeps a per-conversation memory of the types it has relocated
(`_relocatedByConversation`, keyed by `resolveInsertionSessionKey` — the same
conversation identity insertion-normalization uses, imported rather than
re-derived) and serves a remembered block whenever CC sends no instance of
that type. CC's newer bytes always win, so a genuine content change still
resets; the memory covers ABSENCE only.

**What a restart costs now, stated rather than assumed.** The memory is
in-process, so a restart drops it: a conversation whose source block CC has
already stopped sending re-derives an empty relocated set and its
`messages[0]` flips — the full-prefix re-bill this fix exists to prevent.
That is a real cost and it belongs in the row-3 statement before any restart.
It is NOT a regression against the audited behaviour: pre-fix, that same
conversation paid the identical flip at the moment CC dropped the block,
restart or no restart. The fix moves the cost from "every departure" to "a
departure followed by a restart in the same conversation", and post-restart
output is byte-identical to what the audited code produced. Priced with
`tools/restart-exposure.mjs` like any other restart.

The durable answer is persistence (the pattern insertion-normalization and the
ladder already use: atomic owner-only write per conversation key, fail-open
reload). Booked in `BACKLOG.md` rather than built here, because the in-memory
form already removes the class in steady-state operation and persistence is a
separate change with its own state-key question (row 3's own amendment: a new
state KEY invalidates every baseline that key addressed).

`test/proxy-restart-transparent.test.mjs`'s fresh-session-sort case still
passes and still means what it says — its body takes the in-place path, where
no memory is created and the extension remains a pure function of the request.
