# Runbook: a daily sweep reports a finding

Standing procedure, written for a fresh context. Consumer: any dev session
opening the day, or any session the sweep's verdict reaches — `doctor`
surfaces it, but interpreting a finding is this repo's job, not the
dotfiles-side doctor's. Companion facts: `docs/dev-loop.md` (the method this
runbook applies — "Rule out the instrument before reporting a defect", "A
checker has THREE answers, not two", "Replay the configuration that is
SERVING, not the defaults"), `FORK-NOTES.md` ("The loop — standing vision":
every threshold bust walks SEE → ATTRIBUTE → MITIGATE/PARK → VERIFY → RETIRE
to a terminal disposition; this runbook is that walk's sweep-shaped
instance), `CLAUDE.local.md` ("Verification stack", "Deployment coupling"),
`docs/directives/robustness-threat-matrix.md` (the KNOWN-OPEN destination),
`docs/runbooks/bust-appears.md` (the REGRESSION destination), `BACKLOG.md`
(the READY-item destination for an instrument defect or a mapping fix).

The sweep is `tools/gate-live.mjs`, run daily by `cache-fix-gate.timer`,
writing `~/.local/state/cache-fix/gate-status.json`. It replays the real gate over
every live capture under the SERVING gate set (dev-loop.md, "Replay the
configuration that is SERVING"). It produces findings every morning, forever,
with nobody present when they appear, while the evidence behind those
findings expires: capture eviction is oldest-mtime-first, which takes the
quiet session first, and a session goes quiet exactly when it stops being
traffic and starts being evidence. Measured 2026-08-05: 3 of the 12 captures
behind the absorption check's first 50 rows were evicted within hours,
taking 11 rows with them, including the one carrying that morning's 38-row
conservation gate-red. That is why the first numbered step below is
"freeze before you analyze," not "analyze, then freeze if it looks real."

## Setup

**The split with the dotfiles side is decided, and it is narrow.** This
sweep spans two repos. Findings are proxy-domain, and everything from "a
finding exists" onward is this repo's job — this runbook owns it.
Dotfiles-side `doctor` owns exactly one question: did the sweep run, and is
its verdict stamped and code-matched. It answers nothing about what any
finding MEANS. Doctor-green means the sweep RAN; it says nothing about
whether anyone opened the findings inside it — treating a green doctor as
"the sweep is handled" is how a finding sits unread indefinitely. This is
the only sentence this runbook carries about the dotfiles side.

**Query the status file with `jq`, never `Read` it whole.** It carries one
fully-detailed row per capture (~33 fields), sits at roughly 200 KB / ~60k
tokens, and stays there — rows track the capture count, captures rotate, so
this is a steady state, not something that will eventually get small. A whole
Read pays 25k tokens for a third of the file plus a paging notice
(dev-loop.md, "Never `Read` that status file whole"). Useful queries:

```sh
jq -r '.started, .finished, .ok, .failing, .proving, .unproving' ~/.local/state/cache-fix/gate-status.json
jq -r '.ok, .failing, (.rows[]|select(.exit!=0)|.file)' ~/.local/state/cache-fix/gate-status.json
jq -r '.code, .gateSource, .host, .version' ~/.local/state/cache-fix/gate-status.json
jq -r '.absorption, .backlogLint' ~/.local/state/cache-fix/gate-status.json
# a specific capture's finding rows, with timestamps and request numbers:
jq -r '.rows[] | select(.file=="<capture-file>") | .conservationRows, .stabilityRows' \
  ~/.local/state/cache-fix/gate-status.json
```

Each finding row (`stabilityRows`, `conservationRows`, `sequenceRows`,
`orderRows`) carries its own `n` (request ordinal) and `ts` (the request's
own timestamp, from `replay.mjs`'s `record = { n: cur.n, prevN: prev.n, ts:
cur.ts, … }`) — that `ts` is what you compare against the traffic you are
investigating, not the sweep's own `started`/`finished`.

**Establish whether the sweep even covers what you're investigating.** The
status file's `started` and `finished` are the sweep's own wall-clock
window, over whatever captures existed on disk at run time — a sweep that
FINISHED before the event you care about proves nothing about it, and a
capture the event happened in may already be gone (eviction, above). Compare
`finished` against the finding row's own `ts`, not against the sweep's
started time and not against "now."

**DECLARED / RUNNING / VERIFIED must agree before the sweep's verdict means
anything for production** (dev-loop.md, "Replay the configuration that is
SERVING"):

    DECLARED   Environment= in cache-fix-proxy.service
    RUNNING    /health `gates` — what the process actually started with
    VERIFIED   `gates` in cache-fix-gate-status.json — what the sweep replayed

DECLARED ≠ RUNNING means the unit was edited without a restart. VERIFIED ≠
RUNNING means the sweep replayed a configuration production is not actually
running — its verdict does not apply to what is serving traffic. Either
mismatch makes the OTHER two answers meaningless too, so treat any mismatch
as its own finding before trusting anything else in the file. `gates` and
`gateSource` are the status file's own fields for the VERIFIED side;
`gateSource` reads `cache-fix-proxy.service` when the unit's declared
environment resolved, `unavailable` or `empty` otherwise.

## The line

1. **Freeze before you analyze.**
   `[GRADUATE -> harvest --pin verifies its own pin; BACKLOG ready]`
   The finding's evidence is the live capture(s) it names, and those
   captures are also the corpus the eviction clock is running against.
   Before reasoning any further, either harvest the relevant range now
   (`node tools/harvest.mjs`, idempotent via per-capture watermarks — safe
   to run by hand at any time) or, if the finding needs to survive as
   frozen proof past this session, pin the exact range via the harvest pin
   path and replay the pin to confirm it actually reproduces the finding
   before trusting it as evidence (dev-loop.md, "The scrub destroys CONTENT
   PREDICATES — a pin is evidence only once replayed": a pin that isn't
   replayed and checked can silently report 0 stability exemptions against
   a live capture that shows the real class). This step is not optional
   busywork ahead of the "real" investigation — a finding whose only
   evidence is a capture that gets evicted mid-triage is a finding you can
   no longer classify, only remember.

2. **Establish what the finding actually is before reaching for a cause.**
   Which gate fired (`stability` / `safety` / `conservation` / `sequence` /
   `order`, or the byte-gate's `MISMATCH`), on which capture (`file`), at
   which rows (`n`, `prevN`, `ts` from the row's own object, per Setup
   above). A finding named only by its count (`conservation: 38`) is not yet
   named — the 38 conservation rows on one capture on 2026-08-05 attributed
   to two entirely different, unrelated declared behaviors once someone read
   the actual rows (BACKLOG, "GATE-RED TRIAGED 2026-08-05"). Skipping this
   step is how one count gets triaged as if it were one cause.

3. **Rule out the instrument before the system.** The check is the newest
   and least-tested thing in the room (dev-loop.md, "Rule out the instrument
   before reporting a defect"). Cheapest-first: is the pair what you think
   it is (violations are per-conversation — diff `prevN` against `n`, never
   `n-1` against `n`)? Is the checker's own exemption list current — is this
   a DECLARED behavior the gate simply has no exemption clause for yet? Read
   the attribution the gate already prints (`[CC bytes at outDiv IDENTICAL
   -> ours]` vs `[CC also changed outDiv]`) before writing a new probe to
   reproduce what the gate already computed.

4. **Attribute ours-vs-CC's from the PRE-pipeline capture.**

   **For a CONSERVATION row this is now one command** — the former
   `[GRADUATE]` marker here is discharged (2026-08-11):

   ```sh
   node tools/replay.mjs <capture> --attribute-conservation   # + the SERVING --env set
   ```

   Every R-side row gains an `attribution`: which stage REMOVED each
   unaccounted unit, which stage had MOVED it there first, its raw message
   index, and the block's shape at the moment it went. Three answers, not
   two — `removed` names a stage, `survived-pipeline` means this replay does
   not reproduce the row (COULD NOT VERIFY, never clean), `absent-in-raw`
   indicts the probe's aim. It is one extra corpus replay, so it is OFF by
   default and `gate-live` does not pass it; a walk asks for it on the one
   capture in question. Deviation from the marker's own wording, stated:
   it is NOT the stability side's bisection over truncated pipeline
   prefixes (~6 corpus replays, and monotone-in-the-cut assumed). The
   conservation question is per-REQUEST, so one pass that runs the pipeline
   a stage at a time answers it exactly, for one replay and no assumption.

   Read that first; the hand method below is now the CROSS-CHECK you run on
   the stage it names, not the way to find the stage. Keep running it — the
   2026-08-11 walk's attribution named `insertion-normalization`, and only
   executing the extension's own predicates showed the removal was of a
   block `fresh-session-sort` had relocated, which is the half a single name
   cannot express.

   Captures are written by `request-capture` at extension order 60, ahead of every
   mutating extension — so a divergence present in the raw capture is Claude
   Code's, and one absent there is ours (dev-loop.md, "Standing rules"). This
   is what makes attribution possible instead of speculative, and the
   worked method is: run the SUSPECTED extension's own exported transform
   over the real raw bytes and check whether its output matches what the
   gate flagged — not by reading the extension's code and reasoning about
   what it should do. That is exactly how the 2026-08-05 triage attributed
   all 38 conservation rows: 11+11 to `fresh-session-sort`'s
   `sortSkillsBlock`/`pinBlockContent` rewrite (run directly, byte-for-byte,
   against the two hashes the gate reported), 8+8 to `smoosh-split` composed
   with `content-strip` (run `splitSmooshedReminders` on the flagged block
   and confirm `{peeled:1}`), and 2 to `identity-normalization`'s
   `normalizeSessionStartText` (run it on the flagged text and find the
   exact offset it rewrote).

   **Pass the transform what it actually takes, and prove the probe
   discriminates before reading its answer.** fresh-session-sort's
   predicates take the block's TEXT (`isMcpBlock(text)`,
   `fresh-session-sort.mjs:14-35`); handed the BLOCK object they return
   `false` on every real case, silently — dev-loop.md records the same
   wrapped-vs-unwrapped confusion costing three separate bugs, and on
   2026-08-11 it cost a fourth, here, in this step. What caught it was the
   CONTROL: a surviving sibling block scored `false` on every predicate too,
   and a probe whose arms all agree has not discriminated anything
   (dev-loop.md, "three arms agreeing IS the finding"). So every run of this
   step carries a block the gate did NOT flag, and the answer counts only
   once the two differ.

   Reasoning about what an extension does from its
   header or its name is the same error one level down from reasoning about
   the system from its source instead of exercising it — dev-loop.md's
   worked instance of this same trap is `hook-context-normalize`, built and
   shipped from a header's claimed scope, then reverted after telemetry
   showed the actual mechanism did something else entirely.

5. **Route to a terminal state.** Every finding gets exactly one of the six
   below. "I looked into it and it seems fine" is not a terminal state — if
   none of the six fits, that mismatch is itself the finding (most likely
   COULD-NOT-VERIFY or NEW CLASS).

## Terminal states

1. **REGRESSION** — was green, now red, and the cause is ours. This does NOT
   close here: it enters the bust line
   (`docs/runbooks/bust-appears.md`) or becomes a fix on its own branch. A
   sweep finding is allowed to hand off; handing off is not the same as
   closing, and this runbook's job ends at the handoff, not before it.

2. **KNOWN-OPEN** — the finding maps to an existing open row in
   `docs/directives/robustness-threat-matrix.md`. Closes by NAMING the row —
   the finding becomes another instance of a known class, not another
   investigation. The trap: a row NAMED is not a row READ.
   `tools/bust-triage.mjs`'s row-status mapping is currently known-wrong —
   it collapses a seven-value status vocabulary onto two verdicts and
   defaults everything that is neither `OPEN` nor `RE-OPENED` to MITIGATED
   (`bust-triage.mjs:397,513`), so it has returned MITIGATED for a bust
   citing row 6, whose actual status text is "OBSERVED, CAUSE NOT ISOLATED"
   (BACKLOG, "READY — `bust-triage`'s verdict is a two-value collapse…",
   measured 2026-08-06, 7 of 25 rows mis-map this way). So: read the row's
   own status text in the matrix file itself before treating a `bust-triage`
   verdict as the row's actual state — the READY item to fix the mapping is
   already booked; until it ships, the row text is the source of truth, not
   the tool's collapsed verdict.

3. **NON-DEFECT** — the check fired on legitimate work. Closes ONLY by a
   DECLARED, class-scoped exemption that the check itself verifies, with the
   legitimate case named in data the check reads — never a softened
   predicate, never an override habit (dev-loop.md, "a check that fires on a
   non-defect is also broken"; a guard that fires on legitimate work trains
   the reflex that kills it). The 2026-08-05 triage's own two READY items are
   the worked shape: `fresh-session-sort`'s reorder and `smoosh-split`'s
   composed peel-then-strip both turned out to be exactly this — declared,
   intentional rewrites the conservation gate had no exemption clause for —
   and the fix booked is a new declared-exemption clause (alongside the
   existing `isDeclaredStrip`/peel-exemption machinery in `replay.mjs`), not
   a loosened conservation check.

4. **INSTRUMENT DEFECT** — the check itself is wrong. The day's verdict for
   that check is VOID, not clean — state this explicitly in whatever record
   you leave; "the check that produced it is wrong" is not a special case of
   "no finding," it is its own answer, and treating it as a clean day loses
   the fact that nothing was actually verified. Closes with a backlog READY
   item carrying a red-first arrangement (dev-loop.md, "Adding a check": the
   fix's own verifier must go red against the current, defective
   implementation before it counts as a check at all).

5. **NEW CLASS** — no threat-matrix row matches. Closes with a new matrix
   row AND evidence frozen at find time (step 1, above) — never "someone can
   re-run it later" while the inputs are on the eviction clock. Also sweep
   the public tracker (`gh search issues` on the upstream repo) before
   writing the row: one phenomenon reached from two directions grows two
   names and two investigations if the check is skipped (dev-loop.md, "The
   census names the class; only content names the cause" — row 4's mechanism
   sat in a public issue for two weeks while it was independently
   re-derived here).

6. **COULD-NOT-VERIFY** — the sweep proved nothing: zero proving captures
   (`.proving` in the status file, or every candidate row's own
   `provesNothing: true`), unreadable byte-gate lines
   (`byteGate.unreadable`/`byteGate.error`), or a DECLARED/RUNNING/VERIFIED
   mismatch (Setup, above). This is its own answer, folded into neither pass
   nor fail — "a run that proves nothing says so" is dev-loop.md's own rule
   for exactly this shape ("A checker has THREE answers, not two"), and it
   binds here the same way it binds the gate's own `ok` field: `ok` requires
   at least one proving row precisely so a sweep over nothing cannot read as
   a pass.

## Limits (the box)

- **Never raise `CACHE_FIX_CAPTURE_MAX_MB` as the answer to expiring
  evidence.** It buys hours and moves the same loss later — the retention
  window is a discovery buffer by design, not a bug to be sized away
  (dev-loop.md, closing-gate question 2's retention-knob corollary). A
  stopgap raise may be TAKEN to keep a specific, already-running analysis
  alive, but it ships named as a bridge, with the durable fix stated and a
  revert trigger written down where the knob lives — never as the
  recommendation on its own.
- **Never close a finding by re-running until it passes.** A finding that
  disappears on re-run without an identified cause is COULD-NOT-VERIFY or an
  unattributed non-event, not a pass — the sweep re-running clean tomorrow
  proves nothing about today's finding.
- **Do not soften a check to make a red go away without the finding first
  reaching a terminal state above.** Where a guard fires on legitimate work
  the repair is a declared, class-scoped exemption the guard itself
  verifies — never a softened predicate, never an override habit; the
  terminal-state routing (NON-DEFECT vs. INSTRUMENT DEFECT) exists precisely
  so that repair is the one available.
- **Never restart the proxy to investigate.** The event logs this runbook's
  attribution step reads from are append-only and need no live intervention
  (FORK-NOTES.md: "Reading `<key>-events.jsonl` … needs no live intervention
  — never restart to investigate"). A restart also changes the thing being
  measured.

## Report

Close the handling of a sweep finding with the dispatch-discipline §2 report
form: items completed with evidence (which finding, which terminal state,
and its basis — the row(s), the transform run, the matrix row named), checks
run with real output (the attribution command and what it printed, not a
summary of it), gaps (a finding that reached no terminal state, surfaced as
a question rather than guessed at), deviations, lessons, files touched plus
commit hashes, and what was NOT verified. If the finding routed to
REGRESSION or NEW CLASS, the report names the follow-on artifact
(`docs/runbooks/bust-appears.md` entry, matrix row, or BACKLOG item) rather
than leaving the finding's disposition implicit in prose. State explicitly
which claims in the report were never executed by anything: an
attribution-heavy triage verifies most of its claims as a byproduct of
running the transforms; a report that only reads rows and reasons about
them verifies none, unless it says so.
