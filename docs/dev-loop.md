# Dev loop: working on this proxy without shipping cache busts

Read this before changing anything under `proxy/`. It is the procedure that
found six self-inflicted defects in one day (2026-07-28) after months in which
every one of them was live and invisible.

## The four commands

```sh
node tools/replay.mjs <capture.jsonl> --census   # what shapes are in this traffic
node tools/replay.mjs <capture.jsonl> [--env …]  # the GATE — must exit 0
node tools/gate-live.mjs                         # the gate over EVERY live capture
node tools/harvest.mjs                           # promote novel pairs to fixtures
npm test                                         # committed fixtures, deterministic
```

`npm test` is necessary and not sufficient — see "the corpus is blind along
its own curation axis" below. `gate-live` is the one that runs against
production-shaped input.

Captures live in `~/.claude/cache-fix-captures/` (written by the
`request-capture` extension, `CACHE_FIX_REQUEST_CAPTURE=1`).

## The gate

`tools/replay.mjs` runs the real pipeline over recorded traffic and enforces
four invariants. It exits non-zero on any of them, so it is a gate, not a
report.

| check | question | failure means |
|---|---|---|
| **stability** | did our output diverge EARLIER than CC's input? | we made a bust bigger than CC's bug required |
| **safety** | same message count, roles, order, tool adjacency? | we corrupted the conversation |
| **sequence** | does a normalize get followed by a reset? | a mitigation that works once and bleeds after |
| **canonical order** | do canonical entries map to increasing wire indices? | our state model has drifted from the wire |

Safety outranks the rest: cache costs money, a mangled history costs
correctness.

`--census` classifies structural deltas; `--trace` shows per-conversation
extension state. `--trace` is a **diagnostic, not a gate** — it has never gone
red on a defect it was built for, so it carries no authority.

## Standing rules

**Captures are PRE-pipeline** (`request-capture` runs at order 60, ahead of
every mutating extension). So: a divergence present in the raw capture is
Claude Code's; one absent there is OURS. That single fact is what makes
attribution possible instead of speculative — use it before blaming either
side.

**Group by conversation before comparing anything.** One session-id header
carries the main thread, every subagent, and CC's own sidecar calls. Comparing
across them makes tenant switches look like churn. This artifact produced
false results six separate times in one day, including in the gate itself —
adjacent-line pairing reported 0 violations on a 602-request capture while a
40-request single-conversation slice of the same session reported 2.

**A green gate is required; token numbers are advisory.** The goal is zero
preventable busts. `tools/cache-sim.mjs` prices what the gates let through,
and its absolute totals are not trustworthy (see its header) — use it for A/B
deltas on one corpus, never as a verdict.

**Run `npm test` alone.** The suite shells out to `git`, so a concurrent
commit in the same repo makes it block on `index.lock` — once observed as a
600-second hang that looked like a hung test.

## Replay the configuration that is SERVING, not the defaults

`replay.mjs` inherits nothing from the systemd unit. Extension gates are read
from `process.env`, and several default OFF while production sets them ON —
`CACHE_FIX_TOOL_REWRITE` is the one that bit. On 2026-07-28 every gate run
that day exercised a pipeline nobody runs:

    default gates:     0 stability violations
    production gates:  2 stability violations, both deferred-tool-rewrite

Same corpus, same code, same day. A green verdict over the wrong
configuration is worth nothing, and it is worse than no verdict because it
reads like one.

`tools/gate-live.mjs` now resolves the gate set from the running unit and
prints it, so every sweep is self-describing. Three answers to "which gates"
must agree, and `doctor` compares all three:

    DECLARED   Environment= in cache-fix-proxy.service
    RUNNING    /health `gates` — what the process actually started with
    VERIFIED   `gates` in cache-fix-gate-status.json — what the sweep replayed

DECLARED ≠ RUNNING means the unit was edited without a restart. VERIFIED ≠
RUNNING means the sweep's verdict does not apply to production. Either way
the other two answers become meaningless, so both are FAIL.

Running a one-off replay by hand? Pass the gates, or you are testing fiction:

```sh
node tools/gate-live.mjs        # resolves them for you — prefer this
```

## Rule out the instrument before reporting a defect

When a check goes red, there are always two hypotheses: the SYSTEM is broken,
or the CHECK is. Report the first without excluding the second and you file a
phantom — and on 2026-07-28 five of six things that looked like Claude Code's
bug were ours, while the safety gate's first 243 "corruptions" were its own
missing exemption. The instrument is not a neutral observer; it is the newest
and least-tested thing in the room.

Order that works, cheapest first:

1. **Is the pair what you think it is?** Violations are reported per
   CONVERSATION, so the predecessor is usually not the previous capture line.
   Diff `prevN` against `n` — never `n-1` against `n`. (This cost a wrong
   diagnosis: the pair was 44→47, the probe compared 46→47, and the two
   unrelated subagent requests it diffed looked like total corruption. The
   violation line now prints `prevN->n` for that reason.)
2. **Is the checker's own exemption list current?** A DECLARED behaviour —
   `deferred-tool-rewrite`'s `tool_addition` announcement is the standing
   example — is not a defect, and a check that forbids it trains its reader
   to ignore red.
3. **Then, and only then, look at the bytes.** Print the diverging index from
   both sides and read what is actually there.

A finding survives this and it is real: at index 4, request 44 carried an
injected `tool_addition` block that request 47 did not. That is a genuine
self-inflicted bust, and it was worth being sure before saying so.

## Adding a check

Two rules, both learned the expensive way:

1. **It must go RED on the real defect before it counts.** Not "would have
   caught it" — demonstrated. Two checks built this way did not work, and only
   the bite test revealed it: a canonical-size drift signal flagged nothing on
   the bug it was designed for, because a split adds one entry AND one message
   so the counts stay equal while the ORDER diverges.
2. **Automate the mechanism, not the symptom you remember.** That drift check
   was built from a remembered number ("canon 92, live 84") that came from a
   *different* bug, already fixed. Re-derive which change produced an
   observation before building on it.

3. **The corpus is blind along its own curation axis.** `harvest.mjs` selects
   pairs by *structural novelty* and sanitises them, so the committed fixtures
   are small by construction — and therefore a fixture corpus curated for
   structure can never contain a scale-shaped input. Both gate defects found
   on 2026-07-28 lived exactly there: a `RangeError` on a 955 MB capture, and
   a 3.2 GB retention peak. `npm test` could not have caught either, and no
   amount of care would have changed that. Generalise it before assuming this
   is about file size: **whatever property a corpus is curated for, every
   other property is where it is blind.**

   That is what `tools/gate-live.mjs` is for — it runs the real gate over the
   live captures (daily, via `cache-fix-gate.timer`), because they are the
   only production-shaped input that exists. `doctor` reads its verdict from
   `~/.claude/cache-fix-gate-status.json`. Run it by hand after any change
   that touches how the tools READ or RETAIN a capture; the fixtures will not
   tell you.

Every new gate gets a mutation test in `test/replay-gate-selfcheck.test.mjs`.
A gate that is confidently wrong is worse than no gate: it converts
"unverified" into "verified" and nobody notices.

Corollary: **a check that fires on a non-defect is also broken.** `gate 1` in
`output-guard.test.mjs` asserted a hardcoded corpus count and therefore
validated nothing from the moment a 9th corpus was added; the safety gate
counted `deferred-tool-rewrite`'s own declared `tool_addition` announcement as
243 corruptions. Both trained their reader to ignore a red suite.

## Identity is where the bugs live

Four keying collisions surfaced in one day, all the same shape:

| where | key that was too cheap |
|---|---|
| `deferred-tool-rewrite` | bare session-id — main thread and sidecars shared one tools baseline |
| `insertion-normalization` | (session-id, system-prompt) — every subagent shares one agent prompt |
| the replay gate | adjacency instead of conversation |
| `cache-sim` | a truncated 200-char prefix of `msgs[0]` |

**An identity computed more cheaply than the thing it identifies will collide,
and the collision presents as churn rather than as a bug.** Hash the whole
thing. `proxy/extensions/message-hash.mjs` is the shared primitive.

## Volatile content vs. real change

CC injects session-scoped content into structures that are otherwise stable,
and does so inconsistently:

- `<system-reminder>` hook blocks inside user messages (absorbed by
  `insertion-normalization`'s volatile-block pinning)
- the per-session console URL inside the **Bash tool's description**
  (absorbed by `toolFingerprint`'s volatile stripping)

Both are decoration, not contract. The rule when adding another: exclude it
from IDENTITY and forward the FIRST-SEEN bytes, keep the pattern narrow, and
make sure a genuine change still resets. Never serve a stale schema or a stale
message.

## Corpus hygiene

Captures grow **quadratically** (each request re-sends the whole history —
one session reached 555 MB) and the retention cap deletes oldest-first. So the
window between "capture written" and "capture deleted" is the deadline for
harvesting. `cache-fix-harvest.timer` runs twice daily for that reason;
`tools/harvest.mjs` is also safe to run by hand at any time — it is idempotent
via per-capture watermarks.

Harvested fixtures are sanitized (text replaced by deterministic hash tokens,
structure preserved exactly) and therefore committable. Ledgers are
per-machine (`LEDGER-<host>.json`); novelty is judged against every sibling
ledger, so N machines share one deduplicated corpus with no coordination.

The gate reads captures **line by line**, so pointing it at a live
multi-hundred-megabyte capture is the intended use, not an abuse. It slurped
them until 2026-07-28, when a 955 MB capture produced `RangeError: Invalid
string length` — the gate was unrunnable on the largest corpus while staying
green on every small one. Run it on the live capture, not only on fixtures:
that is what surfaced this.

## Compaction is a new conversation, not a drop

Settled 2026-07-28 by replaying a capture containing a real compaction
(session `58c979ce`), keys computed with the shipped
`resolveInsertionSessionKey`:

    n=778  1548 msgs   conversation 0dc13516c44f88c7
    n=780  1548 msgs   conversation 0dc13516c44f88c7   <- summarization call
    n=786     4 msgs   conversation 554180f85a9a1528   <- continuation
    n=787     6 msgs   conversation 554180f85a9a1528

Same session-id, same system-prompt sub-key, **different conversation
sub-key**: conversation identity is derived from the history itself, and
compaction replaces `messages[0]` with the summary. So to every stateful
extension the continuation is a NEW conversation — fresh canonical, no reset.

That is correct, and there is nothing to mitigate. The prefix changed at
index 0, so no cached bytes survive by construction; a compaction bust is
honest. All four gates stayed at 0 across the boundary.

Two readings this makes easy to get wrong:

- `insertion-normalization`'s `dropped-majority` branch is **not** the
  compaction path and will never see one — it serves in-conversation
  shrinkage, where `messages[0]` survives. An earlier version of this file
  called that branch an untested gap awaiting a compaction in the corpus; the
  corpus now has one and it does not go there.
- `--census` cannot classify a compaction as `drop-only`, because the pair
  straddles two conversation groups and is never compared. Absence of
  `drop-only` after a compaction is the expected reading, not a miss.

Both were predicted the other way before the capture was replayed. The
prediction cost nothing because it was checked; stating it as a result would
have put two wrong facts in this file.
