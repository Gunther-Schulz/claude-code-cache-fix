# Runbook: a threshold bust appears

Standing procedure, written for a fresh context. Consumer: any dev
session that learns a bust happened — from the statusline's ❄, from
the operator, or from `bust-triage --list` on opening the day.
Companion files: `docs/dev-loop.md` (the METHOD each step below
applies — this file is the sequence, that file is the reasoning),
`FORK-NOTES.md` (the loop and the terminal dispositions),
`docs/directives/robustness-threat-matrix.md` (where a disposition is
recorded).

The rule this file mechanizes is already stated in FORK-NOTES: every
threshold bust walks the loop to a terminal disposition, and an
investigation that ends at "interesting" has not ended. What was
missing was the walk itself.

## Setup

**Timestamps are UTC at both ends.** The statusline reports local
time; `bust-triage --list` prints UTC and marks it. A stamp copied
from one into the other used to shift the window silently by the
machine's offset and answer about the wrong 90 seconds
(`test/stamp-utc.test.mjs` pins the round trip).

**Every number names its tap point before it is compared to another
number.** `request-capture` (order 60) records CC's RAW body;
`prefix-diff` (order 680) diffs the near-final FORWARDED body;
everything between sees a partially-transformed request. Indexes from
different tap points differ by the pipeline's own insertions, and
equating them without the offset check is the hand-rolled-identity
error at the index level.

**Ordinals from different tools are different namespaces.**
`bust-triage` reports capture LINE numbers; `replay.mjs` counts
request records only, skipping outcome and boot records, starting at
`n=0`. On 2026-08-06 the same pair read `n=166->169` in one and
`n=166->167` in the other. Join the two by the TIMESTAMP the row
already carries — never by trusting that two counters agree.

## The line

0. **RESOLVE THE REPORT TO EXACTLY ONE EVENT before investigating
   anything.** Added 2026-08-07, operator: "the lane of me reporting a
   bust must be robust and be able to match cleanly and accurately."
   This step did not exist; the line opened at step 1, which silently
   assumes the event is already identified. It usually is — when the
   session found the bust itself. It is NOT when a human reports one,
   and that is the entry path this lane is named after.
   The two views share almost nothing. The ❄ token shows **ordinal,
   size, cause, age** and the reporter knows their **project**; it
   shows no session id and no timestamp. `bust-triage --list` shows
   **UTC stamp, size, cause, 8-char sid**; no project, no age, no
   ordinal. **The only overlap is size+cause** — so a report of "230k
   messages_changed" is ambiguous the moment two sessions have one.
   Do this, in order: (a) ask for the PROJECT if it was not given;
   (b) convert every stamp into BOTH zones before saying it aloud —
   the Setup note above states the hazard and was not enough, because
   a caution is not a step; (c) name the session span
   (`head -1`/`tail -1` on the transcript) and confirm the event falls
   inside it; (d) restate the resolved event back to the reporter in
   THEIR terms — project, ordinal, size, local time — and get
   agreement before step 1.
   **Terminal state: exactly one ledger event, agreed. A report that
   cannot be resolved to one event is itself the finding** — it means
   the instruments cannot describe what the operator can see, and that
   is booked before the bust walk continues, not after.
   Measured cost of not having this step, 2026-08-07: three statiker
   busts existed (03:49 local 419k in one session; 06:08 and 06:17
   local, 203k and 230k, in another). The session reported UTC stamps
   to an operator reading a wall clock, the operator correctly objected
   that the "4am" bust could not be in their fresh session, and both
   parties were right about different events for several turns. A
   second collision rode along: "largest" was read as "latest", because
   size was the only shared handle.
   `[GRADUATE -> `bust-triage --list` carries project, ordinal, age and
   local time, and gains `--since`; BACKLOG ready. That entry also
   carries the reason this step must stay by hand until then: the
   ledger has three known duplication modes, so a grouped overview
   would render phantom rows today.]`

1. **Inventory; do not trust the count you were given.** Run
   `node tools/bust-triage.mjs --list` before anything else. Measured
   2026-08-06: the operator reported two busts, `--list` showed
   three, and the third shared a session and a mechanism with one of
   the reported two. A notification is a trigger, not an inventory —
   and busts arrive in clusters precisely because one root cause
   fires repeatedly.

2. **Triage each one, and read the ROW, not just the verdict.**
   `node tools/bust-triage.mjs --at <stamp>` chains the six-step hand
   walk into one verdict. Its verdicts are MITIGATED / KNOWN-OPEN /
   CONTROLLED-CAUSE / **UNCLASSIFIED** / **STATUS-UNREADABLE** /
   UNVERIFIABLE. CONTROLLED-CAUSE arrived 2026-08-07: before it, a row
   whose honest status was a controlled cause had to be written as
   `ACCEPT` to stay readable, because the enum had no state for it and
   the truthful wording read STATUS-UNREADABLE — a stop-here on a row
   that needs no stopping. Two are
   stop-heres, and for the same reason: UNCLASSIFIED means the shape
   maps to no matrix row, STATUS-UNREADABLE means the row's status is
   in no state the tool recognises. Neither is a pass.

   **FIXED 2026-08-06 — what this step used to warn about is gone, and
   the shape of the fix is worth knowing.** The verdict was a two-value
   collapse: an open-test over a truncated status slice, so every status
   that was neither OPEN nor RE-OPENED landed on MITIGATED. Measured
   before the fix: **17 of 26 rows** read as MITIGATED, including one
   whose cell says "OBSERVED, CAUSE NOT ISOLATED" — a class nobody has
   ever mitigated. After: **7 of 26** (rows 1, 7, 8, 9, 15, 18, 25), and
   the status parses to an anchored enum with a mandatory unmatched
   case. Two details that outlive the fix:
   an ACCEPT row is **not** a mitigation — it maps to KNOWN-OPEN,
   because MITIGATED's definition (Terminal states, below) requires a
   shipped extension demonstrated on the instance, which an accepted
   class has never had; and the old flag was computed over the
   UNTRUNCATED cell while the status printed beside it was truncated at
   260 chars, so two rows carried a verdict whose stated basis was
   absent from the text under it. **Read the row's own status text
   before believing any label** — that part of the old warning stands
   on its own merits, not on the defect that prompted it.

3. **When two instruments disagree, the narrower basis loses.**
   `[GRADUATE -> bust-triage and dossier share one row reader, so they
   cannot disagree. The status-mapping half SHIPPED 2026-08-06; what
   remains is the shared reader — dossier still reads the row through
   its own path, and that it agrees today was established by reading
   the code, not by running both]` On
   the same stamp, `dossier` said "no row matches — UNCLASSIFIED,
   treat as a new class" while `bust-triage` said MITIGATED. The
   dossier had read the row; the triage had read a regex. Disagreement
   between tools is a finding about the tools and is booked as one —
   it is never resolved by picking the more convenient answer.

4. **Replay under the configuration that is SERVING.** Never the
   defaults — a green verdict over the wrong configuration is worse
   than no verdict because it reads like one.

   ```sh
   curl -s 127.0.0.1:9801/health | jq -r '.gates | to_entries[] | "--env\n\(.key)=\(.value)"' > /tmp/gates.txt
   xargs -a /tmp/gates.txt node --max-old-space-size=2048 tools/replay.mjs <capture> --census
   ```

   Check the daily sweep's own coverage before leaning on it: a sweep
   that FINISHED before the bust happened says nothing about the bust
   (`jq -r '.started, .finished' ~/.local/state/cache-fix/gate-status.json`).

5. **Read what the gate already prints before reaching for a probe.**
   Every stability violation carries its own attribution
   (`[CC bytes at outDiv IDENTICAL -> ours]`), and reaching for a
   throwaway probe at all is the signal that something is missing from
   the tools.

   **The EXEMPTION rows are the interesting ones, not the violations.**
   An exemption is a true statement about what it NAMES and is silent
   about everything else. Measured 2026-08-06: the pair that cost
   216,060 tokens was exempted as
   `fresh-session-sort:first-appearance-relocation (skills)` —
   correct about the deliberate `messages[0]` cost, and silent about
   the forwarded `tools[]`, which is where that request actually paid.
   A green gate with an exemption on the busting pair is not a green
   gate; it is an unexamined claim.

6. **Attribute from the PRE-pipeline capture.** Captures are written
   at order 60, ahead of every mutating extension, so: a divergence
   PRESENT in the raw capture is Claude Code's; one ABSENT there is
   OURS. That single fact is what makes attribution possible instead
   of speculative. Compare the raw pair (`prevN` against `n`, grouped
   by CONVERSATION — never `n-1` against `n`, never by capture
   adjacency) against what `prefix-diff` recorded for the forwarded
   bodies. Equal divergence indexes mean we amplified nothing.

7. **Rule out ourselves at our own event logs before any external
   attribution.** The pipeline is a live ACTOR, and every mutating
   extension logs its acts. Grep the timestamp in
   `~/.local/state/cache-fix/snapshots/*-events.jsonl`,
   `*-insertion-events.jsonl`, `*-deferred-tool-events.jsonl`. "The
   platform did it" is claimable only once our logs are clean at the
   timestamp. The grep takes seconds; skipping it wasted the machinery
   that exists to make it cheap.

8. **Where state is involved, compare the KEYS, not only the bodies.**
   `[GRADUATE -> bust-triage reads the pair's extension event logs and
   reports a state-key change as its own line; BACKLOG ready]`
   This is the step that found row 26 and it is invisible to every
   body diff: the extension event logs carry the state key each
   request was handled under, and a key that CHANGES between two
   requests of one conversation is a total state loss — the extension
   does not report an error, it reports `no-baseline` or `reset` and
   carries on. Measured 2026-08-06: `deferred-tool-rewrite` logged
   `rewrite` under one key and `no-baseline` under another, nine
   seconds apart, same conversation; that flip WAS the 216k bust, and
   nothing in either request's bytes said so.

9. **Never hand-roll identity in a probe.** Import the repo's own
   functions — `conversationSubKey`, `semanticIds`, `identityKey`,
   `firstDivergence`, `censusPair`, `conversationOf`. An identity
   computed more cheaply than the thing it identifies will collide,
   and the collision presents as churn rather than as a bug. A probe
   that re-derives a key has produced a confident wrong answer three
   separate times in this repo's history.

10. **One falsification probe, with a CONTROL.** State the claim so
    that a positive result would KILL it, then run the control that
    proves the probe can distinguish anything at all. Row 26's probe:
    prepending the remembered block to the raw `messages[0]`
    reproduces the rotated key exactly — and a sentinel block in the
    same position yields a different key, which is what rules out
    "any mutation whatsoever produces that key".

11. **Freeze the evidence — and then verify the freeze.**
    `[GRADUATE -> harvest --pin verifies its own pin; BACKLOG ready]`

    **FIRST: freeze what carries YOUR finding, which is not always the
    capture.** Added 2026-08-08, from following this step literally and
    freezing the wrong artifact. This step used to describe captures and
    only captures — while step 8, three steps above, says the state key
    lives in the EXTENSION EVENT LOGS and is *invisible to every body
    diff*. Both sentences were correct and nobody had put them together:
    a walk whose finding is a state-key flip pins a capture that cannot
    contain it. Measured that day — the pin's own self-check reported
    `does NOT reproduce`, correctly, and for a reason narrower than the
    truth (the scrub had destroyed the text-predicate classes; the
    state-key finding had never been in that file at all).
    So, before pinning anything, name the artifact your finding actually
    lives in:

    | the finding | what carries it |
    |---|---|
    | byte divergence, message shape, migrations | the CAPTURE (pin it) |
    | state key, reset reason, what an extension DID | `~/.local/state/cache-fix/snapshots/*-events.jsonl` |
    | cause, token cost, `cache_miss_reason` | the CC transcript |
    | which gates/extensions were live | `/health` + the sweep status file |

    Event-log slices are machine-local, never committed — raw lines carry
    full session ids and the hygiene scan blocks them at push (the
    `capture-uuid` class). Snapshot to
    `~/.local/share/cache-fix/bust-evidence/<date>/`, mode 0600, and cite
    it in tracked prose by ALIAS like any capture.
    The same verify-your-freeze rule binds here: after snapshotting,
    re-read the slice and confirm the records that PROVE the finding are
    in it (for a key flip: both timestamps present, and more than one
    distinct `key`). A snapshot is a claim exactly like a pin is.
    `[GRADUATE -> bust-triage prints the event-log snapshot command beside
    the pin command, for whichever artifact the verdict rests on; BACKLOG
    ready]`

    Captures
    rotate on a quadratic clock and eviction is oldest-mtime-first,
    which takes the quiet session first. `bust-triage` prints the pin
    command for the pair. But **a pin is a claim until you replay it
    and see the event you pinned it for**: `harvest --pin` reports
    success on a fixture that reproduces nothing, and the scrub
    destroys any class detected by literal TEXT (all four of
    `fresh-session-sort`'s block predicates score 0 in a pin against
    107–170 in the live capture). Replay the pin by feeding
    `.records` out as JSONL and confirm the pair count is in the same
    range as the live capture's — pointing `replay.mjs` at the
    `.json` pin directly reads **0 pairs and exits clean**, which is
    a false clean. Structural classes survive the scrub and are worth
    the megabytes; text-predicate classes do not, and their durable
    evidence is a SYNTHETIC fixture.

12. **Claim the alias before writing the capture into tracked prose,
    and claim it with the tool:**

    ```sh
    node tools/alias-claim.mjs <capture-file|session-id> --note "<why>"
    node tools/alias-claim.mjs --show <capture-file|session-id>
    ```

    This repo is public. A capture is named by ALIAS (`s-captureA`,
    `s-captureB`, …), never by filename or session id; the mapping
    lives in `~/.local/share/cache-fix/capture-aliases.json` (mode 0600,
    never tracked; moved out of `~/.claude/` on 2026-08-07 because a
    config directory is not a data directory and the harness prompts
    on the shape). Skipping it is caught at push, after the bytes are
    already in a commit, and costs an amend.
    The tool replaced the hand-run "take the next unused alias" on
    2026-08-07, and the reason is worth knowing rather than trusting:
    that instruction is a read-modify-write, sound for one writer and
    unsound the moment lanes run in parallel. Three were live that day;
    two briefs handed out the same next-unused alias and one lane
    registered it. An alias resolving to two captures is not stale, it
    is wrong in a way no reader can detect. Claiming is exclusive and
    idempotent per capture, so a retry returns the same alias rather
    than burning one — and `--show` answers UNCLAIMED rather than
    printing nothing.

13. **Reach a terminal state and record it** (next section). Then run
    the four closing questions from `docs/dev-loop.md` — in
    particular question 1: the hand-derivation you just did is the
    prototype, the mechanism is the deliverable.

## Terminal states

The dispositions are FORK-NOTES': **mitigated**, **parked with its
named missing piece**, **controlled-cause**, **upstream-filed**. They
are not the same thing as `bust-triage`'s verdicts — a verdict
classifies the shape, a disposition ends the walk — and conflating
the two is how a bust gets closed by having been looked at.

- **MITIGATED** — a shipped extension absorbs the class, demonstrated
  on this instance. "The mitigation ran" and "the mitigation
  absorbed" are different claims that have sat one line apart in the
  same telemetry; `findAbsorptionMisses` asks the second.
- **PARKED, with its named missing evidence or design element** — an
  unnamed deferral is drift, and a named one is a spec. A deferral
  justified by a cited rule that collapses under one question was a
  rationalization, not a reason.
- **CONTROLLED-CAUSE** — the bust was operator-initiated or otherwise
  honest (a compaction changes `messages[0]`, so no cached bytes
  survive by construction; a resume rebuilds the prefix). Recorded,
  not mitigated.
- **UPSTREAM-FILED** — the mechanism is CC's and is posted back.
  Sweep the tracker when the investigation OPENS, not after it ships:
  one `gh search issues` per new unexplained class converts an
  investigation into a verification, and row 4's mechanism sat in a
  public issue for over two weeks while it was derived here
  independently.

A bust that maps to an existing OPEN row is another INSTANCE of that
row, not a new investigation — name the row and increment its
evidence. A bust that maps to nothing is UNCLASSIFIED: stop, and mint
the row. That is the alarm the matrix's convergence note relies on.

## Limits (the box)

- **Never restart the proxy to investigate.** The event logs are
  append-only and need no live intervention. A restart also changes
  the thing being measured.
- **Never point a destructive repro at a repository that matters.**
  The `GIT_DIR=… node --test` reproduction corrupts whatever repo it
  is aimed at — that is what it is for. Throwaway clone, md5 either
  side, delete.
- **Do not widen a mitigation past where its safety argument
  reaches.** Widening is how a mitigation MOVES a bust instead of
  absorbing it; a sibling it cannot justify is named in the matrix,
  never shipped.
- **Do not soften a check to make a red go away.** Where a guard
  fires on legitimate work the repair is a declared, class-scoped
  exemption the guard itself verifies — never a softened predicate,
  never an override habit.
- **A fix touching state KEYS or freeze logic is not a
  cache-transparent restart.** It states its row-3 declaration first
  and is priced against LIVE sessions
  (`tools/restart-exposure.mjs --match '<class>'`), not against the
  corpus — the corpus is historical captures, the bill is paid by
  conversations running right now, and a change made while using the
  thing it changes concentrates its blast radius exactly where the
  work is happening.
- **Do not close a bust on cost.** Any non-operator-initiated bust is
  a prevention target regardless of size; cost never gates whether
  mitigation work happens. The only per-class deliberation is
  MITIGABILITY.

## Report

Close with: each bust and its terminal state; the attribution for
each (ours / CC's) with the evidence that settled it; what was frozen
and whether the freeze was verified to reproduce; the matrix rows
written or incremented; the backlog items booked; and — explicitly —
which claims in the report were never executed by anything. A
building-heavy stretch verifies most of its claims as a byproduct; a
pure investigation verifies none unless it says so.
