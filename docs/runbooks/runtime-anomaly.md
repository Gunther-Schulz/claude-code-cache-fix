# Runbook: the proxy reports an anomaly

Standing procedure, written for a fresh context. Consumer: any dev session
that notices a runtime detector fired — from `shape-verdicts.mjs`'s output,
from reading a `*-events.jsonl` file directly, or from the operator asking
"what is this error". Companion facts: `docs/dev-loop.md` ("Rule out the
instrument before reporting a defect", "A checker has THREE answers, not
two", "Rule out ourselves — attribution starts at our own event logs"),
`FORK-NOTES.md` ("Rule out ourselves — attribution starts at our own event
logs": the worked incident this whole runbook elaborates), `docs/runbooks/
bust-appears.md` (step 7, "Rule out ourselves at our own event logs before
any external attribution" — this file extends that rule to the proxy's
continuously-running detectors rather than to a single busting pair),
`docs/runbooks/sweep-finding.md` (the terminal-state list this file reuses
verbatim), `tools/shape-verdicts.mjs` (the fork's own telemetry-freshness
verdicts), `BACKLOG.md` (the OPEN-BOOKED destination).

This is the fourth event line (`docs/dev-loop.md`'s "Which line are you
on" table carries the first three). It exists because the proxy's runtime
detectors — `upstream-error-log`, `rate-limit-log`, `image-retry-circuit-
breaker`, `session-budget-breaker`, `usage-log` — write continuously, and
nothing routes what they write to a disposition. `shape-verdicts.mjs`
reads one of the five (below), and even that reading only answers "did
something land recently", never what it was. The other event lines all
arrive pre-filtered: a bust is already a threshold crossing, a sweep
finding is already a named gate row. A runtime log is not — most of what
lands in it is upstream capacity noise the proxy already retried through,
and the step that does not exist anywhere else in this repo's runbooks is
telling that apart from the rare entry that is not noise. That triage is
why this file exists on its own rather than folding into `sweep-finding.md`.

## Setup

**Where the detectors write, and which have a reader today.** Five
extensions log to five separate files under `~/.claude/`. Grepped from
`tools/shape-verdicts.mjs`'s `TELEMETRY_CONSUMERS` array (not assumed):

| detector (extension) | log file | gate | `shape-verdicts` reader? |
|---|---|---|---|
| `upstream-error-log` | `usage-log/upstream-errors.jsonl` | `CACHE_FIX_UPSTREAM_ERROR_LOG=on` | **yes** — `telemetry-upstream-errors`, kind `alarm` |
| `rate-limit-log` | `usage-log/rate-limit-events.jsonl` | `enabled: true` in the extension's own config (order 660) — **not** a `CACHE_FIX_*` env var | no |
| `image-retry-circuit-breaker` | `image-retry-events.jsonl` | `CACHE_FIX_IMAGE_RETRY_BREAKER` | no |
| `session-budget-breaker` | `session-budget-events.jsonl` | `CACHE_FIX_SESSION_BUDGET` | no |
| `usage-log` | `usage.jsonl` | (per-call log; no `CACHE_FIX_*` gate found in the extension) | no |

Verified by grep: `grep -n "usage\\.jsonl\\|rate-limit-events\\|image-retry-
events\\|session-budget-events" tools/shape-verdicts.mjs` returns nothing —
only `upstream-errors.jsonl` (line 292) has an entry in the array. The other
four have hand-run analysis tools (`tools/quota-analysis.mjs`, `tools/
usage-to-dashboard-ndjson.mjs`, `tools/cost-report.mjs` read `usage.jsonl`;
`tools/sim-session-budget-breaker.mjs` simulates the budget breaker) but
none of them is invoked automatically or produces a verdict — a session has
to think to run them.

**Even the one reader only answers freshness, not content.**
`telemetryConsumerVerdict` (`tools/shape-verdicts.mjs:331`) for an `alarm`-
kind entry checks only the file's mtime against `HARVEST_MAX_AGE_H` (26h,
`tools/shape-verdicts.mjs:46`) — it does not read a single record, does not
count entries, and cannot distinguish a `529` retried-and-recovered burst
from a `401` that has recurred for a week. "Needs a look" from
`shape-verdicts` means exactly one thing: *the file's mtime is within 26
hours of now*. Everything below this line is the part no tool does yet.

**These logs are append-only and need no restart to read** (same rule as
the other three lines — `bust-appears.md`, Limits). Query with `jq`:

```sh
jq -c 'select(.ts | startswith("<date>"))' ~/.claude/usage-log/upstream-errors.jsonl
jq -r '.response_status' ~/.claude/usage-log/upstream-errors.jsonl | sort | uniq -c
jq -r 'select(.response_status==<code>) | .ts, .requested_model, .session_id, .x_should_retry, .retry_after' \
  ~/.claude/usage-log/upstream-errors.jsonl
```

Fields on record (verified against a live file, not assumed): `ts`,
`response_status`, `type`, `requested_model`, `request_path`, `session_id`,
`upstream_message`, `x_should_retry`, `retry_after`, `ratelimit_status`,
`ratelimit_overage_status`, `has_ratelimit_headers`, `upstream_request_id`,
`upstream_connection_id`, `schema_version`.

**The `/health` three-way check does not cover every detector the same
way.** `bust-appears.md` and `dev-loop.md` both lean on DECLARED / RUNNING
/ VERIFIED agreement via `curl -s 127.0.0.1:9801/health | jq .gates` — but
`proxy/server.mjs:577` builds `.gates` by filtering `process.env` for keys
starting `CACHE_FIX_`. That covers `upstream-error-log`, `image-retry-
circuit-breaker`, and `session-budget-breaker` (all env-var gated) but
**not** `rate-limit-log`, whose enablement is a config-file `enabled` flag
with no `CACHE_FIX_*` name — it will never appear in `.gates` regardless of
whether it is on. Before trusting an absent `rate-limit-events.jsonl` as
"gate is off", check the extension's own config, not `/health`.

## The line

1. **Triage noise versus signal before anything else — this is the step
   the other three lines get for free and this one does not.** A bust
   arrives already thresholded; a sweep finding already names a gate row.
   A runtime log entry is neither: most of what lands in `upstream-
   errors.jsonl` is upstream capacity the proxy already retried through.
   The discriminator, read from the record itself: a status that is
   **retryable** (`x_should_retry: true`) **and self-resolves** (the same
   session's later requests succeed, and inter-event gaps widen — a
   backoff shape, not a flat rate) is NOISE. A status that is **not
   retryable** (`x_should_retry: false`), or one that keeps recurring
   without ever resolving regardless of retry advice, is a FINDING.
   Worked contrast, both read from `~/.claude/usage-log/upstream-
   errors.jsonl` on 2026-08-06: ten `529`s from 08:59:07 to 09:01:42,
   all `x_should_retry: true`, `retry_after: "0"`, same session, same
   `requested_model`, with inter-event gaps widening from ~2s to ~39s
   before leveling off (2, 2, 4, 6, 10, 20, 36, 39, 35s) — upstream
   capacity plus our own backoff, self-resolving, NOISE. Ten `401`s the
   same day from 10:23:26 to 12:34:21, every one `requested_model:
   "test"`, `session_id: null`, `request_path: /v1/messages`,
   `x_should_retry: false`, irregular gaps with no backoff shape — a
   FINDING, and it is this runbook's worked OPEN-BOOKED example below.
   `[GRADUATE -> a backoff-shape classifier (widening-gap + x_should_retry
   + same-session) belongs in shape-verdicts.mjs or a sibling tool, so this
   triage stops being hand-read on every occurrence. Not yet booked — the
   trigger, per dev-loop.md's "answered by hand twice" rule, is a second
   occurrence of this exact by-hand read.]`

2. **Establish the shape before reaching for a cause.** Which detector
   fired (the log file names it), which `response_status` / `type`, on how
   many records, over what window (first `ts` to last `ts`, not "now"),
   and — query the file again — is it still firing. A finding named only
   by its count ("ten 401s") is not yet named, the same trap
   `sweep-finding.md` step 2 already states for gate rows.

3. **Rule out ourselves at our own event logs before any external
   attribution.** This is the rule `FORK-NOTES.md` states once and every
   line in this repo cites rather than restates: "the pipeline is not
   only an instrument; it is a live ACTOR that mutates requests, and every
   mutating extension logs its acts... any wire-visible anomaly... gets a
   timestamp-correlation sweep of OUR event logs BEFORE any external
   attribution." Its worked incident is the whole argument: three "400
   must end with a user message" idle-failures were verbally booked as
   harness noise **twice**, until the operator's push forced the log
   check — the insertion event log's suppressed-duplicate entries
   preceded all three failures by ~1 second each; the pipeline's own
   suppression had stripped the requests' final message. "The platform
   did it" is comfortable, specific, and was wrong both times it was
   said out loud before the grep. Grep the anomaly's timestamp across
   `~/.local/state/cache-fix/snapshots/*-events.jsonl` (per-session insertion,
   deferred-tool, guard events) before writing down any cause outside
   this repo's own code.

4. **Only then attribute outward.** If step 3's grep is clean at the
   timestamp — no suppression, no rewrite, no guard event coinciding —
   the cause is either upstream or external to both, and only then does
   "upstream did it" or "unexplained, external" become a claimable
   sentence.

5. **`x_should_retry` and `retry_after` are the upstream's own opinion,
   not this repo's verdict.** They say what the far end believes about
   its own condition, which is useful evidence for step 1's triage and
   nothing more — a `529` marked retryable that keeps recurring past
   several retries is still worth a look, and a `401` marked
   non-retryable but genuinely caused by an operator's own manual test
   run (see Terminal states, `CONTROLLED-CAUSE`-shaped read below) is
   still not a defect. Read them as data feeding the triage, never as
   the triage's answer.

6. **Route to a terminal state.** Every anomaly gets exactly one of the
   seven below. "Looked into it, seems like noise" without naming which
   state applies is not a terminal state — if none of the seven fits,
   that mismatch is itself the finding.

## Terminal states

Reused verbatim from `sweep-finding.md` — the six general states apply
here exactly as written there; only their instancing differs. See that
file for the full text of each. The one-line form, plus this lane's
addition:

1. **REGRESSION** — was clean, now anomalous, and the cause is ours
   (found at step 3). Hands off to `bust-appears.md` or a fix branch;
   this runbook's job ends at the handoff.
2. **KNOWN-OPEN** — maps to an existing open threat-matrix row. Closes by
   naming the row, read in full — not by trusting a collapsed verdict
   tool.
3. **NON-DEFECT** — the detector fired on legitimate, declared behavior.
   Closes only by a declared, class-scoped exemption the detector itself
   verifies.
4. **INSTRUMENT DEFECT** — the detector (or `shape-verdicts`'s reading of
   it) is wrong. The day's verdict is VOID, not clean; say so explicitly.
5. **NEW CLASS** — no matrix row matches. Closes with a new row and
   evidence frozen at find time; sweep the upstream tracker first.
6. **COULD-NOT-VERIFY** — the log proves nothing usable: unreadable
   records, a gate whose `/health` state cannot be resolved (Setup,
   above — `rate-limit-log` in particular), or a window that does not
   actually cover the anomaly.
7. **OPEN-BOOKED** (this lane's addition). The anomaly is real,
   reproducible in the log, step 3's self-check is clean, and the cause
   is not established. Closes with a BACKLOG entry naming what evidence
   would identify it — never with a guess at the cause dressed as an
   answer. **Worked example, this session's own finding, unsolved on
   purpose:** the ten `401`s above are not an isolated day — the same
   shape (`requested_model: "test"`, `session_id: null`, `response_
   status: 401`, `x_should_retry: false`) accounts for every single `401`
   in the whole log — 170 of 194 total records as of this read, spanning
   six days and still growing during the writing of this entry (1 on
   2026-07-30, 22 on 07-31, 7 on 08-01, 7 on 08-02, 121 on 08-05, 12 on
   08-06, the last of those at 12:44:01Z — three more landed while this
   file was being drafted, same shape each time). A repo-wide grep for a
   literal `"test"` model sender
   (`grep -rn '"test"' tools/*.sh tools/*.mjs`, and the obvious senders —
   dotfiles bootstrap, the Claude Code hooks, `tools/cache-test.sh`) found
   nothing that sends `requested_model: "test"`. `BACKLOG.md` (line 4055)
   once attributed one day's occurrences of this exact shape to "today's
   test runs" — a controlled-cause read for 2026-07-31 specifically. That
   explanation does not travel to 08-05's 121 occurrences: a controlled-
   cause disposition earned on one day's volume is not evidence about a
   later day's volume of the same shape, and re-asserting it without
   re-checking is exactly the stale-premise error the operator corpus
   names under Fixing. This entry stays OPEN-BOOKED, not solved, here.

## Limits (the box)

- **Never restart the proxy to investigate.** The event logs this
  runbook reads are append-only and need no live intervention; a restart
  also changes the thing being measured (`FORK-NOTES.md`).
- **Never conclude "upstream did it" while our own event logs at that
  timestamp are unread.** Step 3 is not optional ahead of a comfortable
  external story — see its worked incident (booked wrong, twice, the
  same day, before the grep was forced).
- **Never treat an absent log file as "no incidents."** A detector whose
  gate is off writes nothing, and that is indistinguishable from a
  detector that is on and has seen a clean run — until the gate state is
  checked. For the three env-var-gated detectors, check `/health`'s
  `.gates`; for `rate-limit-log`, `/health` cannot answer this at all
  (Setup, above) — check its own config.
- **A retried-and-recovered burst is not a finding, and treating it as
  one trains the reflex that misses the real ones.** The widening-gap
  `529` burst in step 1's worked contrast is the shape to recognize and
  set aside, every time, before spending the rule-out-ourselves grep on
  something that was never a finding.
- **Do not soften a detector to make a red go away without a terminal
  state first.** Same rule as the other lines: NON-DEFECT closes with a
  declared exemption the detector itself verifies, never a loosened
  threshold.

## Report

Close with the dispatch-discipline §2 report form: which anomaly, which
detector and log, which terminal state and its basis (the record window,
the step-3 grep output, the matrix row or BACKLOG entry named); checks run
with real output (the `jq` queries and their actual results, not a
summary); gaps (an anomaly that reached no terminal state, surfaced as a
question); deviations; lessons; files touched plus commit hashes; and
which claims in the report were never executed by anything — a triage
that greps its own logs verifies most of its claims as a byproduct, a
report that only reads counts and reasons about them verifies none unless
it says so.
