# Dev loop: working on this proxy without shipping cache busts

Read this before changing anything under `proxy/`. It is the procedure that
found six self-inflicted defects in one day (2026-07-28) after months in which
every one of them was live and invisible.

## The four commands

```sh
node tools/replay.mjs <capture.jsonl> --census   # what shapes are in this traffic
node tools/replay.mjs <capture.jsonl> [--env …]  # the GATE — must exit 0
node tools/harvest.mjs                           # promote novel pairs to fixtures
npm test                                         # committed fixtures, deterministic
```

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

Known gap worth filling: no corpus yet contains a **compaction** event, so
`insertion-normalization`'s compaction path has never met real traffic.
