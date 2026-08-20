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

2. **FIRST, check which CONVERSATION and MODEL the tool picked — its
   verdict is void if they are not the busting one.**
   `[GRADUATE -> bust-triage groups by conversation AND model]`
   `bust-triage` selects the busting request by TIME PROXIMITY to the
   worktime event and is blind to `model`. One session id carries the
   main thread, its subagents, and CC's sidecars — and since dispatches
   run on other tiers, it carries more than one MODEL too. Measured
   2026-08-10: on a fable session with sonnet subagents, the 213k event
   at 04:40:50Z was a fable request at **04:40:37.944Z**, and the tool
   returned the sonnet pair `n=97->99` at **04:40:43/47Z** because those
   sat closer to the reported stamp. Every instrument then read on that
   pair — insertion `append-only`, deferred-tool `unchanged`,
   prefix-diff `toolsMatch/systemMatch` true — was TRUE about a
   conversation that never busted, and the walk reached UNCLASSIFIED
   with the answer untouched on disk. The cheap check, before trusting
   any verdict: read the `outcome` records around the stamp
   (`.model`, `.usage.cacheRead`, `.usage.cacheCreation`) straight out
   of the capture and confirm the model of the busting request matches
   the pair the tool chose. A `cacheRead` that collapses to roughly
   tools+system size is the bust; the request carrying it is the one to
   triage.

3. **Triage each one, and read the ROW, not just the verdict.**
   `node tools/bust-triage.mjs --at <stamp>` chains the six-step hand
   walk into one verdict. Its verdicts are MITIGATED / KNOWN-OPEN /
   EXPECTED-BUST / CONTROLLED-CAUSE / **UNCLASSIFIED** /
   **STATUS-UNREADABLE** / UNVERIFIABLE.

   **Triage is the FIRST step of any bust investigation, and three of
   the verdicts END it** (binding, operator 2026-08-14): MITIGATED,
   EXPECTED-BUST and CONTROLLED-CAUSE are stop-heres in the DONE
   direction — no investigation or mitigation work is owed on the
   instance; record the datapoint (the KNOWN-OPEN increment rule at
   the bottom of this file applies to those carriers too) and stop.
   Investigable are UNCLASSIFIED (the alarm), the two
   could-not-answer stops (STATUS-UNREADABLE, UNVERIFIABLE — fix the
   instrument or the status, then re-triage), and KNOWN-OPEN rows a
   brief explicitly names. The measured failure this binds against:
   sessions dispatched to "investigate busts" repeatedly investigated
   ACCEPTED classes — the 1h-TTL idle bust, compaction — because the
   whole non-buildable family then triaged to KNOWN-OPEN, which reads
   as open work. EXPECTED-BUST exists so an expected bust never
   presents as a finding.

   CONTROLLED-CAUSE arrived 2026-08-07: before it, a row
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
   an ACCEPT row is **not** a mitigation — it maps to EXPECTED-BUST
   (2026-08-14; KNOWN-OPEN from 2026-08-06 until then, see
   `TRIAGE_BY_STATUS` in `tools/matrix-status.mjs` for the reversal
   record), because MITIGATED's definition (Terminal states, below)
   requires a shipped extension demonstrated on the instance, which an
   accepted class has never had; and the old flag was computed over the
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

   **THE TOOL AT STEP 3 WAS VIOLATING THIS STEP, silently, until
   2026-08-20.** Recorded here rather than quietly fixed, because it
   changes how to read every verdict written before that date.
   `bust-triage` runs its own replay in a child process, and it spawned
   that child with `--json --census` and NO GATES — inheriting whatever
   `CACHE_FIX_*` the ambient shell carried, in practice none. So the
   ATTRIBUTION line, the census and the tools[] numbers this file tells
   you to trust at step 3 were computed over the DEFAULT extension set.
   Measured on the 09:11:57Z pair: `mitigated: true` / `action
   "normalized"` under the capture's own gates, matching the live
   extension event log — and `mitigated: false` / `action none` under
   defaults. A second number moved too (`tools[] stability` forwarded
   whole array held `0/2` -> `1/2`), so it was never one field in
   isolation. Fixed by passing `--gates-from-capture`. The residue is
   booked with its re-check, and it is ONE-DIRECTIONAL: defaults mutate
   less, so the forwarded output can only diverge later, which biases
   the verdict toward **CC's** — past **OURS** verdicts are safe, past
   **CC's** are the population to re-check.

   **WHICH gate set — the two forms answer different questions.** For a
   bust, the authoritative set is the one that was serving WHEN THE BUST
   HAPPENED, and that is the capture's own boot record:

   ```sh
   node --max-old-space-size=2048 tools/replay.mjs <capture> --census --gates-from-capture
   ```

   `/health` reads what is deployed NOW. The two agree only while
   nothing has restarted or re-gated since the capture, so on any bust
   older than the last restart the `/health` form silently answers about
   a different pipeline. Use it only where the capture declares no gates
   — replay says so itself (`gates: no gates declared in capture`),
   which is a stated could-not-verify and never a clean default:

   ```sh
   curl -s 127.0.0.1:9801/health | jq -r '.gates | to_entries[] | "--env\n\(.key)=\(.value)"' > /tmp/gates.txt
   xargs -a /tmp/gates.txt node --max-old-space-size=2048 tools/replay.mjs <capture> --census
   ```

   If the two sets DISAGREE, that disagreement is itself a fact about
   the walk — a restart or a gate change between the bust and now — and
   belongs in the disposition rather than being resolved by preference.
   Step 3's own rule applies: the narrower basis wins, and for an event
   that already happened the capture's own record is narrower than
   today's deployment.

   Check the daily sweep's own coverage before leaning on it: a sweep
   that FINISHED before the bust happened says nothing about the bust
   (`jq -r '.started, .finished' ~/.local/state/cache-fix/gate-status.json`).

5. **Read what the gate already prints before reaching for a probe.**
   Every stability violation carries its own attribution
   (`[CC bytes at outDiv IDENTICAL -> ours]`), and reaching for a
   throwaway probe at all is the signal that something is missing from
   the tools.

   **A `splice/insert-mid` bust still needs a HAND probe for its
   mechanism, and that is a known gap rather than a step.**
   `[GRADUATE -> bust-triage grows an `insert-context` step, the mirror
   of the existing `edit-anchor`; BACKLOG ready]` `edit-anchor` — the
   step that names WHICH entry moved, its `anchorDelta`, and its block
   migrations — runs only for the census class `replace/edit`
   (`bust-triage.mjs`, the `if (cls === "replace/edit")` guard). For an
   insert class the tool gives you a row number, an attribution and now
   an absorption line, but nothing about WHAT was inserted or WHERE
   relative to the conversation's last human turn. On 2026-08-20 that
   cost a hand-written probe, and the probe's output was the entire
   finding: one 372-byte `role:"system"` hook notification at index 82
   of 107, `anchorDelta -23`, while the three other new entries were
   ordinary tail growth. The number that mattered — the insertion's
   DEPTH behind the anchor, which is what sets the re-bill — is exactly
   what no instrument printed.
   Until it graduates: diff the pair's `semanticIds` to find entries
   present in `after` and absent from `before`, keep only those sitting
   before the last SURVIVING entry (that is the mid-history set; the
   rest are appends), and report each one's role, byte size and offset
   from the last human turn. Import the identity functions, never
   re-derive them (step 9). Show the probe DISCRIMINATES before
   believing it: the busting pair must yield a non-empty mid-history
   set and a known append-only pair from the same capture must yield an
   empty one.

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
   `bust-triage` now reads the pair's extension event logs itself
   (`stateKeyFlip`) and reports a state-key change as its own
   `state-key` line, stopping at `VERDICT: KEY-FLIP` — ranked with
   UNCLASSIFIED and STATUS-UNREADABLE — rather than reading a
   matrix row's status as a per-instance absorption claim on a pair
   that never shared one instance.
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
    | byte divergence, message shape, migrations | the CAPTURE (pin it) — check its SIZE, next paragraph |
    | state key, reset reason, what an extension DID | `~/.local/state/cache-fix/snapshots/*-events.jsonl` |
    | cause, token cost, `cache_miss_reason` | the CC transcript |
    | which gates/extensions were live | `/health` + the sweep status file |

    **A PIN'S SIZE IS THE CONVERSATION'S DEPTH, NOT THE PAIR'S — check it
    before committing, and check whether your finding needs a pin at all.**
    Added 2026-08-17, from following the table above literally. `harvest
    --pin` writes the pair plus the full conversation prefix from record 0,
    because replay needs the history to group conversations. So the 686k
    row-6 pair, 733 records into a ~700k-context session, produced a **188 MB**
    fixture — 4x the largest pin this repo tracks, and over GitHub's 100 MiB
    hard per-file limit. This repo is PUBLIC and `main` is published
    deployment state that must never be rewritten, so a blob that reaches
    history is not removable; the commit would have succeeded locally and the
    PUSH would have failed with the bytes already committed. The push
    boundary now refuses it (`tools/oversize-blob-guard.mjs`, blocks at
    100 MiB, warns at 50 MB), but the guard is the backstop, not the plan.
    The plan is the granularity question the table above does not ask:
    **a pin freezes the PREFIX, so pin only when your finding needs the
    prefix.** A stability violation or a divergence INDEX does. A `tools[]`
    shape, an addition's namespace, a state key does not — that day's finding
    was two tool arrays and a census row, a few KB, and the whole prefix was
    freight. Where the pin is over the limit, or is freight, freeze
    machine-local to `~/.local/share/cache-fix/bust-evidence/<date>/` and cite
    by alias exactly as the event-log slices below do; nothing about the
    evidence is lost, it just stops being public history. (The write-side
    reroute — `harvest --pin` refusing the tracked tree above the guard's
    threshold — is booked READY, so today this is a hand-check.)

    Event-log slices are machine-local, never committed — raw lines carry
    full session ids and the hygiene scan blocks them at push (the
    `capture-uuid` class). Snapshot to
    `~/.local/share/cache-fix/bust-evidence/<date>/`, mode 0600, and cite
    it in tracked prose by ALIAS like any capture.
    The same verify-your-freeze rule binds here: after snapshotting,
    re-read the slice and confirm the records that PROVE the finding are
    in it (for a key flip: both timestamps present, and more than one
    distinct `key`). A snapshot is a claim exactly like a pin is.
    On a `VERDICT: KEY-FLIP`, `bust-triage` now prints this snapshot
    command itself (a `freeze-hint` line) beside the pin command the
    `capture` step already prints — verified live 2026-08-08 to
    reproduce, carrying both timestamps and more than one distinct
    `key`.

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
  same telemetry.
  **Which instrument answers the second, corrected 2026-08-20 — this
  line named `findAbsorptionMisses`, and that is the wrong one for the
  per-instance question.** `findAbsorptionMisses` grades CLAIMED
  join-move absorptions: it skips any pair whose stats claim nothing,
  so a mitigation that ran and absorbed nothing is invisible to it and
  its silence there means nothing. The per-pair answer is `absorbed`
  (`mitigated && outputPreserved`) from `findMitigationGaps`, and
  `bust-triage`'s ABSORPTION block now prints it directly for the
  busting pair — read that line rather than deriving it:
  `this pair: NOT-ABSORBED — splice/insert-mid, input-mitigated=true
  (action normalized), output splice@82 preserved=false, re-billed
  ~35 kB / saved ~0 kB [INPUT-MITIGATED, OUTPUT-SPLICED]`.
  The trap that made this worth correcting: `mitigated` alone is the
  extension's self-report about its own INPUT reconstruction, and it
  reads exactly like an absorption claim. Until 2026-08-20 the
  headline percentage and the byte pricing both keyed on it, so a
  110k bust printed `absorbed (100%)` and booked its bytes as SAVED.
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
evidence **in BOTH carriers: the matrix cell AND the row's booked
mitigation entry in BACKLOG.md** (one line: cost, UTC stamp, capture
alias). The entry is what the build-order derivation reads — a
datapoint that lands only in the matrix keeps the ranking's
measured-cost signal stale, which is how weeks of walks produced a
perfect record and an unpromoted mitigation (operator finding,
2026-08-10). If the row has NO booked mitigation entry, that absence
is itself booked before the walk closes.
`[GRADUATE -> bust-triage's KNOWN-OPEN verdict prints the row's booked
entry (headline) and the instance cost line to append; BACKLOG ready
— "a walk on a KNOWN-OPEN row is a dead end"]`
A bust that maps to nothing is UNCLASSIFIED: stop, and mint
the row. That is the alarm the matrix's convergence note relies on.

## The disposition is not the exit — the forward edge

Added 2026-08-10 (operator: the goal of this repo is shipped
mitigations, and every walk was ending at the matrix). After the
disposition, the walk CONTINUES while each next link is
decision-complete, and stops only at a NAMED halt — a gate red, a
missing decision, or a genuine operator call. Ending at the
disposition without naming which link stopped you is the dead end
this section removes.

1. **Entry datapoint** (previous section) — the row's mitigation
   entry carries the instance.
2. **Re-ask the entry's dispatchability, now, against the current
   world.** READY and decision-complete → the walk continues into the
   build (dispatch or desk per the routing corpus); no operator
   prompt is owed for work the rules already settle. Blocked → the
   walk's close names the blocking decision or missing evidence, and
   a decision that is genuinely the operator's goes to them as a
   numbered question WITH a recommendation — never as a silent stall.
3. **The build's own gates, unchanged and binding:** a normalization
   passes the byte-match census
   (`tools/reminder-migration-census.mjs`) with zero MISMATCH;
   replay/gate green under the SERVING config; red-first proven on
   the instance's own frozen evidence (or synthetic where the class
   is text-predicated — the pin measurement settled that synthetic is
   the correct arrangement there, not a compromise).
4. **Ship via `docs/runbooks/ship-proxy-change.md`** — row-3
   declaration where state keys or freeze logic move, pin bump,
   restart at a stated session boundary.
5. **Post-restart verification closes the loop:** the gate run over
   fresh traffic, and the next instance of the class named ABSORBED
   (`findAbsorptionMisses` asks exactly that) — "the mitigation ran"
   and "the mitigation absorbed" remain different claims.

The standing guards are this chain's stop rules, not obstacles to it:
no mitigation designed before the attribution verdict; MISMATCH
blocks; cost never gates mitigation; restarts only at session
boundaries. What the chain forbids is the SILENT stop — a walk that
ends "interesting, filed" when the next link was executable.

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
written or incremented; the backlog items booked — including the
mitigation entry each instance datapoint was appended to, or the
booking of its absence; **which forward-edge link the walk stopped
at, and why, where it did not reach a ship**; and — explicitly —
which claims in the report were never executed by anything. A
building-heavy stretch verifies most of its claims as a byproduct; a
pure investigation verifies none unless it says so.
