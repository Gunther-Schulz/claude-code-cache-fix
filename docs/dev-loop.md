# Dev loop: working on this proxy without shipping cache busts

Read this before changing anything under `proxy/`. It is the procedure that
found six self-inflicted defects in one day (2026-07-28) after months in which
every one of them was live and invisible.

## Which line are you on

This file is the METHOD — how to attribute, how to check an instrument, what
must be true before work is done. It is not a SEQUENCE. For the recurring
events, the sequence lives in `docs/runbooks/`, one file per event class,
each written for a fresh context and each ending in a named terminal state.
Open the runbook for the event you have; come back here for the reasoning
behind any step.

| the event | the line | ends at |
|---|---|---|
| a threshold bust appears (❄, operator, or `bust-triage --list`) | `runbooks/bust-appears.md` | mitigated / parked with its named missing piece / controlled-cause / upstream-filed |
| the daily sweep reports a finding, nobody present | `runbooks/sweep-finding.md` | regression / known-open / non-defect / instrument-defect / new-class / could-not-verify |
| the proxy's own detectors log an anomaly (429, 5xx, auth, retry storm) | `runbooks/runtime-anomaly.md` | the sweep's six, plus open-booked |
| an upstream PR gets a review round | `runbooks/upstream-pr-round.md` | round answered, pushed, comment posted |

Why these exist at all (operator, 2026-08-06): the method and the closing gate
were both written down, and how completely an event got handled still depended
on what the session happened to remember. A bust investigation that same
morning froze its evidence into a fixture that proved nothing, and the only
reason it was caught is that someone happened to replay it. Two of the four
gaps that day were missing STEPS, not missing knowledge.

Three rules bind every line, so no runbook has to restate them.

**One — an event that maps to no existing threat-matrix row is UNCLASSIFIED.**
Stop and mint the row; that is the alarm the matrix's convergence note relies
on.

**Two — every event ends in something DURABLE.** A commit, a booked entry, a
matrix row, a PR — or several. "Handled it" and "noted in the report" are not
dispositions: they leave nothing a later session can find. A manual
investigation is unfinished while the check that would have produced its
finding does not exist (the closing gate, question 1).

**Three — the standing question, asked continuously and answered ASAP: what
did this just prove wrong or missing about the tooling, the docs, the
PROCEDURES, or the RULES?**
(The last two were added 2026-08-06 after the first version, written that
morning, said only "tooling and docs" — and then let four findings through in
one afternoon, every one of them a procedure or a rule rather than a tool: a
missing prioritisation method, a missing session-close line, a missing
per-event line of action, and a recurring own-conduct error the session
proposed to "carry forward" instead of writing down. Each became an entry only
because the operator asked. A scope that names tools and docs reads as
exhaustive to a session holding a rule-shaped finding, which is how the
narrower wording survived its own first day.)
This is the one that compounds, and it is deliberately NOT a closing question.
The other four run when work finishes; this one runs the moment an instrument
surprises you, because by then it has already contaminated whatever it was
used for. So it has two halves, in order:

1. **Re-check what rested on it.** A tool found lying mid-investigation
   invalidates the conclusions drawn through it — not the ones you remember
   drawing, the ones you actually drew. Enumerate them before continuing.
2. **Fix it now if small; book it with a red-first arrangement if not.** What
   is never allowed is the third option: leaving it as an observation in a
   reply. A finding about an instrument that ends as prose in a chat message
   has no carrier and evaporates — and the next session re-earns it.
   **The now-or-book call is made on the FIX's size, never on the session's
   state.** Measured 2026-08-06: a two-line doc change was deferred on "not at
   500k tokens with a re-anchor fired" — which sounds like discipline and is
   the rationalization the grounding rules describe, since a basis that
   collapses under one question was never the reason. Depth is a real cost and
   it argues for restarting the session, never for carrying a small fix out of
   it: the fix leaves with the context, and the deferral is not even a named
   one, because "I'll write it later" names no missing evidence. If the session
   is genuinely too deep to make a two-line edit safely, it is too deep to be
   trusted with the judgment that the edit is optional.

Measured on one day, 2026-08-06, all five found while doing something else:
`harvest --pin` reports success on a fixture that reproduces nothing;
`replay.mjs` pointed at a `.json` pin reads 0 pairs and exits clean;
`bust-triage` answers MITIGATED for 7 of 25 matrix rows including ones
reading "OBSERVED, CAUSE NOT ISOLATED"; `fixture-verdict-identity`
mutation-tests only whichever fixture sorts first; and `dossier` wrote live
session ids into a public repo's root with nothing but the push scan between
that and a commit. Two were fixed the same hour, three were booked. None was
the task anyone sat down to do — which is the point: the instruments get
tested by the work, and only if the work is watching.

The tell that this question was skipped is computable, and it is the same
shape whichever of the four the finding is about: **the session's own output
NAMES a gap — a tool that surprised it, a procedure that would have helped, a
rule it says it will carry forward — and no commit, backlog entry or file
change in that session references it.** Named-and-unbooked is the failure
mode, not unnoticed: every one of 2026-08-06's four was correctly spotted and
described in prose, and stalled there until the operator asked. Naming a gap
feels like delivering it, which is exactly why the check cannot be
self-administered by feel — it belongs in the session-close lane (BACKLOG),
where the language tell can be diffed against the session's own commits.

**A runbook is a staging area, not a permanent home.** Steps a human runs by
hand carry `[GRADUATE -> <where it belongs>]`, which makes the file's own
backlog visible while doing the work: `bust-triage` already absorbed six
former hand-steps this way. A step that has carried the marker across two
occurrences of its event is overdue, not pending — and the marker is removed
by the commit that mechanizes it, never by deciding the step is fine as it is.

### Build order is DERIVED at build time, never stored as a priority field

A priority number written into an entry is a label over its own body: assigned
once against one day's evidence, never revisited, and silently wrong the moment
the evidence moves — the drift class this file's own grounding rules name. So
BACKLOG.md carries no priority field. Instead the order is recomputed from what
the entries already prove, and the derived list is written down WITH ITS DATE so
a stale one is visibly stale rather than quietly authoritative.

Four signals, in descending authority. The first is fact; the rest are judgment
over evidence:

1. **Hard ordering constraints.** Some items must precede others or their
   motivating case dissolves — a check that only goes red against the current
   defect has to be demonstrated red BEFORE the fix that removes the defect
   ships, or it ships having never gone red on anything. These are recorded in
   the entries themselves and are not re-litigated at ranking time; they
   partition the list before any judgment is applied.
2. **Measured cost, with its date.** Tokens re-billed, occurrences counted,
   evidence lost. An item ranks on what it can prove TODAY: a cost measured
   once, months ago, ranks as an old measurement, not as a current one.
3. **Silence.** A gap that fails silently outranks a loud one of equal cost.
   A loud failure announces itself and gets handled on its own; a silent one
   compounds, and every day it survives is a day of decisions made on an
   answer nobody knew was wrong. Both of 2026-08-06's worst findings — a
   runbook whose trigger did not exist, a freeze that proved nothing — were
   silent, and both were found by accident.
4. **Cheapness.** A tiebreaker between items the first three rank equally,
   never a reason on its own. "Small" is not a case for building something,
   and a cheap item at the top of a list is usually there because ranking it
   honestly was harder than building it.

Two rules that keep this from rotting. **An item nobody can rank is a finding
about the item** — if its evidence does not support any of signals 2–4, it is
not decision-complete and the gap is in the entry, not in the rubric. And
**the derived order is re-derived, not edited**: patching yesterday's list
re-creates the stored-priority problem one level up.

## The four commands

```sh
node tools/replay.mjs <capture.jsonl> --census   # what shapes are in this traffic
node tools/replay.mjs <capture.jsonl> [--env …]  # the GATE — must exit 0
node tools/gate-live.mjs                         # the gate over EVERY live capture
node tools/harvest.mjs                           # promote novel pairs to fixtures
npm test                                         # committed fixtures, deterministic
```

And when a bust actually HAPPENS, start here rather than at a jq prompt:

```sh
node tools/bust-triage.mjs                       # newest bust -> classified verdict
node tools/bust-triage.mjs --list                # recent busts, newest first
node tools/bust-triage.mjs --at <epoch|ISO>      # one specific bust
```

`bust-triage` chains what used to be a six-step hand walk — worktime ledger,
CC transcript, capture pair, `censusPair`, container byte-test, threat-matrix
lookup — into one verdict, and it reconciles the ledger against the transcript
because those two have disagreed live. Its verdicts are MITIGATED /
KNOWN-OPEN / **UNCLASSIFIED** / UNVERIFIABLE. UNCLASSIFIED is the one to stop
on: it means the shape maps to no matrix row, i.e. a class nothing currently
watches — which is exactly how a whole bust class stayed invisible until a
diff happened to be read by hand.

Designing a NORMALIZATION (rewriting CC's form into a canonical one) has its
own gate, and it is not optional:

```sh
node tools/reminder-migration-census.mjs ~/.claude/cache-fix-captures/*.jsonl
```

It byte-tests a canonical rule against what CC itself emits, across the whole
corpus, and reports EXACT / EXTENDED / DROPPED / MISMATCH plus the PLACEMENT
distribution. Since 2026-07-31 it also sub-classifies every EXTENDED
(MERGED-STANDALONE — the remainder is a standalone the predecessor already
sent — vs NEW-TEXT), classifies every message-count drop
(PURE-TAIL-PRUNE / INTERIOR-DIVERGENT / UNANCHORED, anchor = `isHumanTurn`,
with the re-billed suffix length per row), reads captures by LINE, and
names what it could not read — a non-zero unreadable count is a failing
run, and `gate-live`'s daily sweep carries the byte-gate and prune summary
per capture (`byteGate` in the status file). Both halves are load-bearing: correct bytes at the wrong index
diverge the prefix just the same, and a rule proven on one occurrence is not
proven (the row-4 rule matched one hand-read case and failed the next). Any
MISMATCH blocks shipping — see the matrix's "Byte-match test".

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

**A mitigation ships with its SIBLINGS enumerated.** A class arrives as one
instance, and a fix scoped to that instance leaves the cases one step out
along the same axis uncovered — which is how a single afternoon (2026-08-02)
produced a `tools[]` mitigation that held ADDITIONS byte-stable but reset on a
77-byte DESCRIPTION edit (485k tokens re-billed), and a join-move matcher that
absorbed a migrated standalone with ONE copy while missing it when duplicate
siblings re-bound the ordinals (535k). Neither was a design error; both were
scope stated once and never re-asked. So at ship time, list the adjacent cases
— the same event with one attribute varied: added / removed / renamed /
reordered / re-described / duplicated / arriving during a reset — and state
for each whether the mitigation's OWN safety argument reaches it. Ship what it
reaches; the rest becomes a matrix row, never a TODO in the code. Doing this
once immediately connected the new description-only row to row 6, which had
sat at "OBSERVED, CAUSE NOT ISOLATED".

**And the same enumeration along the ENTRY-PATH axis: a mechanism that
guards one route is not a guard.** Four instances in one day (2026-08-05),
each correct in itself and each with a silent bypass:

| the guard | the route it held | the route it did not |
|---|---|---|
| `pinBlockContent` | a block's BYTES while present | its PRESENCE (row 25's index-0 flip) |
| the daily sweep | the COUNT per gate | the ROWS behind it |
| the suite's config-root isolation | `npm test` | a bare `node --test` |
| `bust-triage`'s substitution note | the default path | `--at <stamp>` |

The shape is one: the protected thing is reachable by a second route, the
second route is silent, and every instance reads as working because the
route someone happened to take was the guarded one. Two of these were found
by counting files afterwards rather than by any check firing.

So the sibling enumeration at ship time asks the entry-path question too —
what are the OTHER ways in? Another invocation (`npm test` vs `node --test`),
another flag, another caller, another AXIS of the same object (bytes vs
presence, counts vs rows) — and for each, does the guard reach it. Where it
does not and cannot cheaply, the repair is to make the UNGUARDED route fail
loudly rather than to hope it is not taken: `test/config-root-isolation.
test.mjs` is that shape, red on exactly the invocation that bypasses the
harness and green under it — and its own scope had the same hole one level
down (it fires only when it is IN the run set, so a bare single-file
`node --test test/<other>.mjs` bypassed it too, reproduced at 7 leaked
files in one run), closed 2026-08-05 by a `NODE_TEST_CONTEXT` tripwire in
`claudeHome()` itself: the choke point every stateful extension passes
through, where the leak dies for every invocation shape.

**A liveness or resolution check asks "does this resolve", never "does this
resolve AS THE TYPE I expected."** Both defects the pointer lane hit on its
first real run are that error: a trailing `path:line` citation made three
live files read as dead, and `git cat-file -e <t>^{commit}` rejects a TREE,
so four live deployment pins (recorded here as tree hashes) reported dead.
Corollary, from dropping that lane's COMMIT-DEAD label after it scored 0 for
8: when a token's SHAPE cannot separate the namespace you mean from the
namespaces you do not — commit vs capture id vs content fingerprint vs
session id, all short hex — the check does not get a context heuristic bolted
on to rescue it. It goes, and the residual risk is named instead.

The rule is ENUMERATION, not maximal width. Widening past where the safety
argument reaches is how a mitigation MOVES a bust instead of absorbing it:
the byte-match census answers `MISMATCH — DO NOT SHIP as-is` for exactly that
case, and it was right the day the canonical rule's "wrappers are stripped"
premise turned out not to hold universally. The safety argument is the
boundary — for the tools block it is `input_schema` identity, which is what
makes a stale DESCRIPTION safe and a stale SCHEMA not — and a sibling it
cannot justify is named, not shipped.

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
3. **Read the attribution the gate already prints.** Every stability
   violation now carries `[CC bytes at outDiv IDENTICAL -> ours]` or
   `[CC also changed outDiv]`. The first means the divergence is ours by
   construction — nothing upstream changed at that index — and needs no
   probe. This line exists because the same comparison was hand-derived by
   throwaway script three times in one day; the throwaway probe is the tell
   that a check is missing.
4. **Only then look at the bytes.** Print the diverging index from both
   sides and read what is actually there.

Whenever a step of this list gets answered by hand twice, that is the signal
to move it into the tool. Steps 1 and 3 both started as manual probes.

A finding survives this and it is real: at index 4, request 44 carried an
injected `tool_addition` block that request 47 did not. That is a genuine
self-inflicted bust, and it was worth being sure before saying so.

**Your own probe is the newest instrument in the room.** Three ways a probe
lied on 2026-08-05, each of which read as a finding about the system:

- **A needle that matches more than one thing.** A probe searching for the
  message "The user sent a new message while you were working" used
  `findIndex` and printed one hit. Several turns share that prefix, so it
  reported the wrong message and its per-stage trace read as "the container
  never changes" — the exact opposite of the truth. **Print every match, not
  the first.** A probe that reports one hit cannot show that it picked the
  wrong hit.
- **Two coordinate spaces that look like one.** A raw wire index and a
  forwarded index differ by however many messages suppression removed
  (measured: raw 370 forwards as 360). Comparing them directly is silent —
  both numbers are plausible. Say which space each number is in, at the point
  where they meet.
  Same family, one axis over and cheaper to hit: a probe that re-derives a
  tool's OWN ordinal. `replay.mjs` counts request records only (skipping
  outcome and boot records) and starts at `n=0` — a probe that numbered
  capture LINES from 1 printed a neighbouring request, and the neighbour was
  a haiku sidecar and an agent-SDK subagent, from which a whole wrong
  mechanism was nearly derived on 2026-08-05 before the timestamps were
  checked against the row. The record a probe prints is identified by
  matching a field the row already carries — the timestamp — not by trusting
  that two counters agree.
- **A shape check standing in for a content check.** Asserting which fields
  are set does not establish that prompt text is off disk. Plant a sentinel,
  run the real thing, grep what was written — **and then run it again with the
  guard OFF** to prove the grep can see the sentinel at all. A zero from an
  instrument that never fires is indistinguishable from a zero that means
  something.

**Never point a destructive repro at a repository that matters.** The
`GIT_DIR=… node --test` reproduction for the config-corruption incident
corrupts whatever repo it is aimed at — that is what it is for. Run it inside
a throwaway clone (`git clone --no-hardlinks <repo> /tmp/probe`), md5 the
config either side, and delete the clone. Aimed at the working tree it took
out the main clone and six live worktrees at once, mid-session.

## What no gate asks: did the mitigation ABSORB?

The five gates all answer positional questions about our output versus CC's
input. None asks whether a mitigation that FIRED actually held the prefix. On
2026-08-05 a 349k bust replayed exit 0 with every verdict correct:
`movedFresh: 2` said insertion-normalization had recognized both migrations
and substituted at their indices, and the forwarded prefix diverged at the
very slot it had just substituted — right text, right index, stale container.
"The mitigation ran" and "the mitigation absorbed" sat one line apart in the
same telemetry, and only a human reading both noticed.

`findAbsorptionMisses` (replay.mjs) now asks it on every run — not behind
`--census`, because the whole point is that nobody knew to look — and
`gate-live` carries `absorption: {total, ours, captures}` in the daily status
file, because a check that runs only when someone thinks to invoke `replay` by
hand is not in front of the boundary. It is a
REPORT, not a gate, until its corpus-wide rate is measured; a check that
blocks before anyone knows how often it fires on legitimate work is how a
guard trains its reader to ignore it. Each row carries the three numbers that
turned this bust from a puzzle into a mechanism: where the absorption claimed
to act, where the forwarded pair actually diverged, and whether CC's input
diverged there too — the last is `ours: true/false`, and it is the attribution
that otherwise costs an afternoon.

## The hygiene gate scans messages and every text type, not just fixtures

Two blind spots, both found by planting rather than by reading, both closed
2026-08-05:

- **Object KEY NAMES were never scanned.** A map keyed BY the protected thing
  is an ordinary shape — this repo's own harvest ledger was
  `{"keys": {"<full session uuid>": …}}` — and the identical UUID reported
  `capture-uuid` as a value and nothing at all as a key. Key findings are
  positional (`$.keys[#1]~key`) because the path would otherwise BE the key.
- **COMMIT MESSAGES were scanned by nothing.** The signature move is a scrub
  commit that names the value it scrubbed; observed live, caught by eye.
  Message bytes are as permanent as file bytes and no content scan sees them.
  Scoped to the range being pushed — over a whole branch it reports commits
  already public, which is a gate that cannot pass.

### The written rule is NARROWER than the enforced one — this is the gap

The tracked `CLAUDE.md` hygiene section enumerates what must never reach a
tracked file: origin IPs, SSH targets, internal ports, stack fingerprinting.
`tools/absence-scan.mjs` enforces those AND `capture-uuid` ("a session UUID is
a live capture identifier") AND `capture-key-prefix`. **An author who reads the
written rule, complies with it completely, and names a capture in prose still
leaks** — and finds out at push, after the bytes are already in a commit.

Measured 2026-08-05, twice in one session by the same author: a capture
filename written into BACKLOG.md, the matrix, a source comment, a test and a
commit message; then, hours later and after the first block, capture filenames
written into a review brief. Both blocked at the boundary, both requiring an
amend. The scan did its job. The rule someone reads before writing did not
mention the class.

**So, the authoring rule, stated where the author looks:** a capture is named
in tracked prose by ALIAS — `s-captureA`, `s-captureB`, … — never by filename
or session id. That convention was already in use in about thirty places
across `docs/` and `BACKLOG.md` and was written down in exactly none of them,
which is why it transmitted by imitation and failed the moment someone wrote
about a NEW capture.

**Aliases are resolvable, or they are write-only labels.** The mapping lives at
`~/.claude/cache-fix-capture-aliases.json` — machine-local by nature, mode
0600, never tracked, because it holds precisely the bytes the convention keeps
out of git. Assign the next unused alias at the moment you first write it into
tracked prose and record it there. Entries that cite an alias also quote the
timestamps and request ordinals they rest on, which is the join of last resort:
aliases A..AA predate the registry and can no longer be resolved at all.

A fourth, found by asking what the first three did NOT cover: the allowlist
was PATH-wide. A file named in it was skipped entirely, so an exemption
written about one class silently excused every class — including ones nobody
had thought of when it was written. That is exactly how the harvest ledger's
94 identifiers sat behind an exemption whose stated reason was its timestamps.
Exemptions are class-scoped now: `{pattern, classes}`, the file is still
scanned, and only findings of the named classes are dropped.

The file-type filter was the third: `--git-range` looked only at
`.json`/`.jsonl`, so an identifier in a `.mjs`, `.md`, `.sh`, `.yml` or `.py`
sailed through. Source files get the short-key class and only it; pointing the
UUID and base64 classes at source would fire on dozens of legitimate synthetic
values. Measured cost of the widening: 0 findings over every tracked file.

## Before a restart: price it against LIVE sessions, not the corpus

The threat matrix's row-3 rule ("cache-transparent unless the change touches
state KEYS or freeze logic") asks about the DIFF, and a restart on 2026-08-05
satisfied it while costing 655,021 tokens. The row-3 statement written
beforehand named the affected class correctly — messages quoting a marker in
prose — and then sized it "one measured instance corpus-wide, so cheap". That
is the wrong denominator. The corpus is historical captures; the bill is paid
by conversations running right now.

The affected session was the one the change was being written in, which is the
NORMAL case rather than bad luck: a change made while using the thing it
changes concentrates its blast radius exactly where the work is happening.

```sh
node tools/restart-exposure.mjs --window-min 60                 # worst case
node tools/restart-exposure.mjs --match '<your affected class>' # the real number
```

Without `--match` it lists every live session; with a predicate for your change
it lists the ones that will actually re-baseline. On the restart above it
reports ~581k tokens against the single matching session — the number that was
missing from the decision.

## Timestamps are UTC, at both ends of the chain

`bust-triage --list` prints UTC and now marks it; `dossier` reads a stamp with
no zone designator as UTC. Before both, the documented chain — copy a stamp
from one into the other — silently shifted the window by the machine's UTC
offset, and `dossier` answered about the wrong 90 seconds with four plausible
"ABSENT" lines. `test/stamp-utc.test.mjs` pins the round trip rather than
either end, because fixing one end while the other drifts reintroduces it.

## "Streams" is a claim about a mechanism, not an API choice

The capture read was fixed for scale twice and was still O(file) the third
time. `readFile` → RangeError (found 2026-07-28); per-entry retention →
compactEntry (same day, "the wall had only moved"); and then readline's async
iterator, which reads push-based and buffers every line the consumer has not
taken yet. The replay awaits per request, so during each await the queue grew
— measured 2026-07-29: 1.2 GB held after 25 consumed lines, the entire
remaining file (~2.3 GB as strings) by line 75, a 3.27 GB peak wearing a
comment that said "streamed, never slurped".

Three things worth keeping from the episode:

- **Verify the mechanism, not the API shape.** "We use a stream now" was true
  and irrelevant — reading happened at disk speed regardless of consumption.
  The content question is `bytesRead` against bytes consumed, and it is
  cheap: the read-lines bite test asks exactly that and went red on line 3
  against the readline shape.
- **A probe must reproduce the consumer's YIELD behaviour, not just its
  cost.** The first probe simulated per-line work with a synchronous
  busy-wait: the event loop never turned, the stream could not run ahead, and
  the probe reported the defect absent. Swapping the busy-wait for
  `await sleep(40)` — same delay, one yield — showed 2.3 GB. A slow consumer
  and an *awaiting* consumer are different programs to a push-based source.
- **A recurring failure class earns a resource cap as its standing check.**
  After the third wall, the fix stopped being only code: gate-live now runs
  every replay child under `--max-old-space-size=2048`. A replay that truly
  streams needs ~15% of capture bytes; one that regressed into retaining its
  input dies against the cap and fails the sweep the same day, whatever the
  fourth wall turns out to be made of.

## The census names the class; only content names the cause

Row 4 sat "re-opened" for a day with the mechanism unexplained — while an
outside reporter with far lighter tooling (#78660) had already named it. The
gap was not effort; it was a structural blindness we designed in: the census
reduces messages to hashes and ordinals, which is what makes it scalable and
publishable, and exactly what makes it causally mute. Hashes can say
same/different/moved; they cannot say "this is the task-tools nudge, and it
anchors to the last human message." Two rules from the miss:

- **When a class is localized, return to the bytes and to the STRUCTURE.**
  Read the actual content at the offending position (once, locally — the
  privacy discipline applies to what gets committed, not to what gets read),
  and relate the position to conversation structure: roles, anchors,
  injection zones. The verdict that closed row 4 was one 30-line matcher
  relating edit positions to the last human-typed message (20 of 22 within
  ±2). That relation now lives in the census itself (`anchorDelta` on every
  edit row, with a "far from any anchor = new mechanism" callout) — the
  matcher was the prototype, per the standing rule about throwaway probes.
- **Sweep the public tracker when an investigation OPENS, not after it
  ships — and sweep the matrix and backlog for the same class under
  ANOTHER LABEL.** One phenomenon reached from two directions grows two
  names, and each name grows its own item, directive and dispatch: the
  census's content-relational EXTENDED and its position-relational
  blockMigration named one class, and the duplicate was caught only at
  build time, by refusing a dispatched design (extended-absorb report,
  lesson 2). The cross-check is one grep per new class name, at intake. The row-4 mechanism sat in a public issue for over two weeks
  while we derived the same facts independently. One `gh search issues` per
  new unexplained class converts an investigation into a verification —
  strictly cheaper, and the verification is worth posting back.

## Never hand-roll identity in a probe

Twice on 2026-07-28 a throwaway probe reached a wrong conclusion because it
computed its own notion of "the same message" instead of importing the one the
code uses:

- a probe hand-built a session key, found a collision that did not exist, and
  reported a bug against production code;
- a probe compared message SETS to decide whether a pair was a tail append. It
  was a mid-history edit at index 768. The probe had printed the positional
  divergence in the same output and it was read past — set membership says
  "these entries all still exist", which is not the question a cache asks.

A third on 2026-07-31, in a NEW tool rather than a throwaway probe: a census
of the row-4 container migration paired requests by `sid`, then by its own
first-message hash, instead of importing `conversationOf`. It reported 475
rule failures — 99.3% — and every row read `actual=0ch`, the tell that no
counterpart was found AT ALL rather than a rule that failed. Two distinct
errors rode in on the hand-rolled identity: comparing `before[i]` to
`after[i]` by INDEX (one inserted message shifts every later index), and
pairing ADJACENT capture lines (live traffic interleaves main, subagent and
sidecar, so two requests of one conversation sit several lines apart — the
trap `replay.mjs` already documents at its grouping comment). Corrected
grouping turned 475 failures into 0. Both wrong answers looked like findings
and would have blocked a correct mitigation.

Both are the same mistake as the collisions in the extensions themselves: an
identity computed more cheaply than the thing it identifies. Import
`semanticIds`, `identityKey`, `firstDivergence`, `censusPair`,
`conversationOf` — never re-derive them inline. Two corollaries the third
instance forced:

- **Extend an existing tool before writing a new one.** If a tool in the
  domain already exists, the default is to add the mode there; a new file
  needs a stated reason the existing one did not fit. This is not tidiness —
  reuse INHERITS hard-won correctness (the interleaving lesson, the pairing
  rule, the three-answer discipline), while a fresh file re-earns every one
  of them from zero, silently and usually wrongly.
- **Any comparison of two requests is grouped by CONVERSATION, never by
  capture adjacency and never by index.** `conversationOf` is exported from
  `replay.mjs` for exactly this; if a tool needs an identity that is not
  exported yet, export it rather than restate it. And when a question is about CACHE, the answer is always
POSITIONAL: the API keys on the longest identical PREFIX, so "what changed and
at which index" is the only form that means anything. "Which entries exist"
never is.

The tools now answer it directly — `--census` prints `edit@N of M` per
replace/edit and `[CC bytes at outDiv IDENTICAL -> ours]` per violation — so
reaching for a probe at all is the signal that something is missing from them.

## A checker has THREE answers, not two

    verified clean    -> pass
    verified broken   -> fail
    COULD NOT VERIFY  -> its own answer, folded into neither

The third is where checkers lie, and it happened three times on 2026-07-28
alone:

- `claude-worktime --cold` printed **"No cold rewrites recorded"** while 26 real
  records sat in the file — its parser had died on one malformed line and the
  error went to `/dev/null`;
- the gate sweep would have reported a run over **zero captures** as success —
  it checked nothing and nothing said so;
- the replay-fidelity check printed **"0/0"**, which reads exactly like
  "checked and clean" when it means "there was nothing to check".

Every one of those is an absence of evidence wearing a verdict's clothes, and
each was written by someone who had just fixed the previous one.

Which of the two an absence maps to is a JUDGEMENT, and it has to be made
deliberately rather than by default:

- absence that is ITSELF the defect → **fail**. A gate running with no entry in
  the acceptance roster means somebody flipped a flag without recording what
  proved it safe.
- absence that is nobody's fault → **warn, and say what is missing**. No
  comparable requests, no outcome records yet, no captures on this machine.

What is never allowed is silence, or a number shaped like a pass. If a run
proves nothing, the output says it proves nothing.

Mechanised on the dotfiles side: `bootstrap/doctor.py` enumerates its own
`*_verdict` functions by introspection and fails its self-check if any lacks a
test, so a new verdict cannot be added without its could-not-verify case being
exercised.

<!-- required-reading-extract-start -->
## The closing gate: four questions before any proxy work is done

MANDATE (operator, 2026-07-29). Every piece of work here — a fix, an
investigation, a probe, a doc — answers these four before it closes. Each
question has a same-day precedent where skipping it cost real time; "no"
is an acceptable answer, silence is not — and a "no" or "not yet" must
NAME the missing evidence or design element, which converts it into a
spec. An unnamed deferral is drift, and a deferral justified by a cited
rule that collapses under one question was a rationalization, not a
reason (same day: a trend alarm was declined citing red-before-build,
which synthetic bites already satisfied; naming the real concern —
false-fires on deliberate changes — produced the design that dissolved
it, acknowledge-by-commit, within the hour).

1. **Can this be mechanized?** Interpretation stays human; everything
   around it is machinery — the check, the annotation, the alarm, the
   EVIDENCE DELIVERY. The tell remains the throwaway probe: row 4's verdict
   came from a 30-line matcher that became `anchorDelta` the same day, and
   the byte-extraction friction that stalled the row for a day became the
   far-from-anchor excerpt pass. If the answer is "it needs judgment", ask
   again about the part BELOW the judgment: delivering the inputs to the
   judgment is always mechanizable.
2. **Is the evidence harvestable?** Captures rotate on a quadratic clock;
   a finding that rests on volatile bytes is a finding with an expiry date.
   If the claim would be unverifiable after rotation, snapshot what proves
   it — sanitized, via the harvest path — before closing (precedent: the
   growth-step spec exists because a baseline step's explaining diff dies
   with the capture).
   **A RECURRING producer of findings has no closing moment, so it
   satisfies this question in its own machinery or not at all.** The four
   questions run at work-time, per change — which silently assumes a human
   is present when the finding appears. A daily gate is not: it produces
   findings every morning, forever, with nobody closing anything. Shipping
   one and answering question 2 "yes, harvestable" is answering about the
   day it shipped, not about the class. Measured cost, 2026-08-05: the
   absorption check shipped in the morning storing COUNTS only; by
   afternoon 3 of the 12 captures behind its first 50 rows were evicted,
   taking 11 rows with them, and the capture carrying that same morning's
   38-row conservation gate-red was one of them — its row-level
   attribution had hours of life left when it was produced by hand.
   So for anything that runs on a schedule, question 2 reads: does the
   MECHANISM write out what proves its own findings, at the moment it
   finds them? "A human can re-run it later" is not an answer while the
   inputs expire — and eviction is oldest-mtime-first, which takes the
   quiet session first, and a session goes quiet exactly when it stops
   being traffic and starts being evidence.
   **Corollary — a retention knob is never the answer here.** Raising
   `CACHE_FIX_CAPTURE_MAX_MB` buys hours and moves the same loss later;
   the window is a discovery buffer by design. A stopgap may be TAKEN
   (2026-08-05: 8192 -> 12288, to keep an analysis alive that was already
   running), but it ships named as a bridge, with the durable fix stated
   and a revert trigger written where the knob lives — never as the
   recommendation on its own.
3. **Does the census need a new class or annotation?** A class you named
   by hand while investigating is a classification the census should emit
   — otherwise the next instance gets re-derived instead of recognized
   (precedent: `anchorDelta`, occurrence ordinals, the tools-delta kinds
   all started as hand-derivations). A NAMED deferral can still answer
   the wrong question here: whether the class deserves an ALARM is
   question 4's concern — question 3 asks only whether a classification
   now exists by hand, and a probe that assigns kinds or counts to
   traffic answers it YES by existing. The one valid deferral argues the
   derivation is genuinely one-off. (Observed: the resume-boundary
   classifier was parked with an alarm-shaped basis minutes after its
   probe had hand-classified every capture; one operator question undid
   the parking.)
4. **Did the instruments ride along?** A mitigation change without its
   replay/gate change ships blind: the gate replays the SERVING config, so
   an instrument that lags the extension verifies a pipeline nobody runs
   (precedent: the day every gate run exercised defaults while production
   ran eleven gates). New state, new record fields, new gates — each lands
   with its replay handling, its ledger declaration, and its three-answer
   doctor verdict in the same change.
<!-- required-reading-extract-end -->

### Cadence: the gate guards the flow, the sweep re-checks the stock

The closing gate runs at work-time, per change. A dispatched stock-sweep
(read-only, the four questions over the WHOLE system) is for after building
bursts — the 2026-07-29 sweep found twelve gaps because twelve pieces of
machinery had just landed, and its top finding was live within the hour.
Not a standing schedule: standing machinery must be maintained forever, and
a sweep of an unchanged system yields nothing. Retirement signal, borrowed
from skill-craft's consolidation rule: two consecutive sweeps returning
only minor findings — then the ritual stops until the next burst.

## Adding a check

Two rules, both learned the expensive way:

1. **It must go RED on the real defect before it counts.** Not "would have
   caught it" — demonstrated. Two checks built this way did not work, and only
   the bite test revealed it: a canonical-size drift signal flagged nothing on
   the bug it was designed for, because a split adds one entry AND one message
   so the counts stay equal while the ORDER diverges.

   **A red that is a MODULE-LOAD failure proves the check is new, never that
   it discriminates.** For a brand-new checker there is nothing to run the new
   expectations against: the red reads `does not provide an export named …`,
   which is satisfied by any implementation whatsoever, including one that
   returns a constant. Two independent builds hit this on 2026-08-05 and both
   reached the same repair — after the checker exists, remove ONE named
   condition at a time and watch the specific bite go red (the grouping key
   forced to a constant; the presence test disabled; the recorder never
   recording). Same medicine for a bite that asserts an ABSENCE — "no row
   arrays on an errored run" passes vacuously while the field does not exist,
   so its red arrangement is a mutation that CREATES the defect rather than a
   revert to before the fix. Where the expectations can run against the old
   implementation, that is still the stronger arrangement and stays the
   default; this is the case where they cannot.
2. **Automate the mechanism, not the symptom you remember.** That drift check
   was built from a remembered number ("canon 92, live 84") that came from a
   *different* bug, already fixed. Re-derive which change produced an
   observation before building on it.

   **A known positive NAMED IN A BRIEF is a claim, not a fixture.** The
   dispatcher hands the builder "here is a real instance your check must
   flag" — and that sentence carries the dispatcher's reading, not the
   file's bytes. Measured 2026-08-05: a lane was briefed to flag a backlog
   entry "whose own body cites the commit that fixed it". The entry's body
   cites no commit at all; the ref sat on the first line of the NEXT entry
   and had been attributed across the boundary — the same-entry limit
   `tools/backlog-lint.mjs` documents as deliberate, walked into while
   reading. The builder ran the entry's real line range through one grep,
   got nothing, and HALTED — rather than widening the entry boundary until
   the designated case fired, which is what tuning an instrument to ratify
   its own premise looks like from the inside. Two rules from it: a briefed
   known-positive earns the same disproving probe as any other load-bearing
   claim, and the probe is cheap (here, entry-boundary arithmetic); and a
   check whose motivating case dissolves does not get a substitute case
   found for it — it does not ship, because it would ship having never gone
   red on a real defect.

   **A mutation must remove the exact condition the bite names** — two
   bites in one build passed for the WRONG reason and survived their
   mutations, because the mutation deleted adjacent machinery rather
   than the named condition; a mutation that leaves the bite green is
   evidence about the mutation before it is evidence about the bite.

   **A bite's expected value comes from the invariant's DEFINITION, never
   from the implementation or the reasoning that produced it** — an
   expectation with the same parentage as the code pins the bug it should
   catch. Write the definitional comment first; the assertion follows from
   it. (Observed: the succession bite's first draft asserted a
   one-shot-sidecar handback as a correct succession — same mental model
   as the code's missing first-appearance condition; writing the
   definition sentence is what contradicted the assertion, and the
   phantom-minting bug fell out of the correction.)

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

   **Never `Read` that status file whole — query it with `jq`.** It carries
   one fully-detailed row per capture (~33 fields), so it sits at roughly
   200 KB / ~60k tokens and stays there: rows track the capture count, and
   captures rotate, so this is a steady state rather than growth something
   will eventually prune. That is ~2.4x the Read tool's 25k-token cap, so a
   whole-file Read spends 25k tokens to deliver a third of the file plus a
   paging notice. Two sessions have each paid that before switching to `jq`.
   `jq -r '.ok, .failing, (.rows[]|select(.exit!=0)|.file)'` answers the
   usual question for a few hundred bytes.

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
structure preserved exactly) and therefore committable. Scrub granularity is
per-`"\n\n"`-segment (relation-preserving — see
`docs/directives/scrub-relation-preservation-directive.md`): tokens expose
paragraph count, per-paragraph lengths, and cross-text sharing of identical
paragraphs, never content bytes. Accepted here (operator, 2026-07-31) because
this deployment runs local and controlled and commits only its own traffic's
fixtures; anyone harvesting NON-local or third-party traffic should re-make
that judgment before committing fixtures publicly — length vectors can
fingerprint known public texts. Ledgers are
per-machine (`LEDGER-<host>.json`); novelty is judged against every sibling
ledger, so N machines share one deduplicated corpus with no coordination.

Sanitization is subtractive — it removes the hazards someone enumerated, and
the unanticipated field ships by default (measured 2026-07-31: conversation
keys, sids, wall-clock timestamps, a session UUID in a filename, and nested
`source.data` image bytes all rode through a scrubber whose header claimed
completeness, into a public PR — caught by the upstream reviewer, not by us).
Two standing rules from that incident. **Fixtures bound for a public tree are
synthesized by default**; a harvested-and-scrubbed fixture is the exception,
justified by real-pair evidence value (a class only real traffic teaches) and
committable only with the absence scan green. **A sanitization claim counts
only as its checker's output**: the absence classes live in
`tools/absence-scan.mjs` — imported by `test/harvest-scrub-relations.test.mjs`
at test time, run again by the dotfiles pre-push guard at the boundary where
git history becomes unscrubbable. A new identifier class discovered later is
added to the scanner first (red on the live instance), then scrubbed.

### The scrub destroys CONTENT PREDICATES — a pin is evidence only once replayed

The curation-axis rule below ("Adding a check", point 3) says a corpus is blind
to whatever it was not curated for, and its worked example is SCALE. There is a
second axis, measured 2026-08-06, and it silently disables whole extensions:
**the sanitizer replaces text with hash tokens, so any extension gated on a
literal text prefix can never fire on a harvested fixture.** All four of
`fresh-session-sort`'s relocatable-block predicates are exactly that shape
(`isSkillsBlock`, `isHooksBlock`, `isDeferredToolsBlock`, `isMcpBlock`,
`fresh-session-sort.mjs:17-32`). Measured on a pin taken that morning to freeze
a live 216k bust: "The following skills are available", "hook success",
"MCP Server Instructions" and "The following deferred tools" each score **0
hits in the pinned fixture against 107–170 in the live capture** — the live
side is the positive control, without which a zero proves nothing. So the
committed corpus, and `npm test` with it, is blind to that extension's entire
behaviour; only `gate-live` over live captures reaches it, and only while the
capture lives.

The trap is not the blindness, it is that **the pin reports success**:
`harvest --pin` printed `pinned 327 record(s), range 166..167` for a fixture
that replays with **0 stability exemptions across 136 compared pairs**, where
the live capture over the same range yields
`first-appearance-relocation (skills)`. Nothing in the tool compares the two.
That fixture was about to be committed as the frozen evidence for a
threat-matrix row — the harvest-side instance of "an absence of evidence
wearing a verdict's clothes".

**One guard did fire, and its reach is the lesson.** `npm test` went red on
that pin: `fixture-verdict-identity.test.mjs` refuses to run its mutation when
the subject fixture carries no full `<system-reminder>` block, because the
mutation would be a no-op — the suite's own vacuous-pass guard, working
exactly as designed. But it examines `FIXTURES[0]`, the **alphabetically
first** pin, and the red happened only because `468…` sorts ahead of `4b6…`.
Probed rather than assumed: the identical defective pin renamed to sort LAST
gives **2184/2184 green**. So the corpus is guarded at one entry — whichever
fixture happens to sort first — and silent on every other, the same
one-route shape this file's guard table already collects. A pin landing
anywhere but position 0 is unchecked by anything.

**And the verification itself has a silent wrong way, walked into while finding
this.** A pin is `{header, records}` JSON, not JSONL, so
`replay.mjs <pin>.json` does not read it as a capture: it reports
`census: 0 same-conversation pairs`, `gates: no gates declared in capture`, and
exits **clean**. Every violation and exemption count is 0 because nothing was
compared — the same zero the real finding produces, from an instrument that
never ran. Replay a pin by feeding `.records` out as JSONL and confirming the
pair count is in the same range as the live capture's; a pin check that does not
report how many pairs it compared has not checked anything. This is the third
recorded instance of the shape in this file, and the first where it bit the
check built to catch the second.

**The split is predictable, so use it when deciding what to pin.** Two pins
taken the same morning, checked the same way: the row-4 pair reproduces
EXACTLY — `n=69->71 edit@32 of 87` with all three cross-message joins — while
the row-26 pair reproduces nothing. Structural classes survive the scrub
(indices, ordinals, hashes, migration shapes are what the sanitizer preserves
by design); classes whose detection reads literal TEXT do not. Before pinning,
ask which of the two the finding rests on. Only the first is worth the
megabytes.

So, until `harvest --pin` verifies itself (BACKLOG, ready): **a pin is a claim
until you replay it and see the event you pinned it for.** One command, and it
is the same command that produced the finding. Where the class cannot survive
the scrub at all, the durable evidence is a SYNTHETIC fixture — which the rule
two paragraphs up already makes the default for anything bound for a public
tree, and this is the case where it is not merely preferred but the only option.

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

## Tap points — every number names where it was measured

Every telemetry index is relative to its writer's position in the
extension order: request-capture (order 60) records CC's RAW body;
prefix-diff (order 680) diffs the near-final FORWARDED body; everything
between sees a partially-transformed request. Two consequences, both
paid for on 2026-07-30 (587k event: journal said index 867, raw said
863, and the first attribution blamed the wrong content class):

- **Origin attribution (CC-side vs ours) comes ONLY from the
  pre-pipeline capture diff.** A post-pipeline journal divergence
  proves the forwarded bytes drifted — it can never say WHO moved
  them; with today's order, every mutating extension is upstream of
  the journal.
- **First step of any bust attribution: name the tap point of every
  number in hand** before comparing them. Indexes from different tap
  points differ by the pipeline's insertions and must not be equated;
  matching them without the offset check is the hand-rolled-identity
  error at the index level.
- **A number names its UNIT at definition time, and "bytes" is the one
  that lies.** Same failure one axis over: not where it was measured,
  but in what. `JSON.stringify(x).length` counts UTF-16 code units and
  reads as a byte count everywhere it is written down — the two agree
  on ASCII and part company at the first non-ASCII character, which in
  this corpus means the first em-dash in a reminder. Measured
  2026-08-05: the row-4 datapoint's forwarded messages were recorded as
  403/428 bytes and are 405/430; one U+2014 at index 208, 3 bytes
  against 1 code unit, +2 on each side. The DELTA survived, which is
  why the conclusion stood and the numbers were still wrong — a
  difference of two lengths cancels the error whenever the multi-byte
  text is common to both. So it hid until a tool that counts
  `Buffer.byteLength(…, "utf8")` disagreed with a hand-derivation.
  Rule: a field called bytes IS `Buffer.byteLength`, a field counting
  code units says so in its name, and a check that compares one to the
  other is comparing two namespaces (the identity error again, at the
  unit level). The same tool's disagreement with a written record is
  the record's problem until the instrument is shown wrong — it is not
  reconciled by adjusting the instrument.

## Rule out ourselves — attribution starts at our own event logs

The pipeline is not only an instrument; it is a live ACTOR that mutates
requests, and every mutating extension logs its acts (insertion events,
guard events, deferred-tool events, suppression lines). Therefore: any
wire-visible anomaly — an API error, a bust, odd behavior in ANY
session on this machine — gets a timestamp-correlation sweep of OUR
event logs BEFORE any external attribution. "The platform did it" is
claimable only once our logs are clean at the timestamp.

Paid for 2026-07-30: three "400 must end with a user message"
idle-failures were verbally booked as harness noise TWICE; the
operator's push forced the log check, and the insertion event log's
suppressed-duplicate entries preceded all three failures by ~1 second
each — our suppression had stripped the requests' final message. The
pattern-matched external story was comfortable, specific, and wrong;
the grep took seconds. Corollary of the consumer principle: the logs
exist precisely so this check is cheap — an attribution that skips
them wastes the machinery it already paid for.
