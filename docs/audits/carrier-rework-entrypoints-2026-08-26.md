# Carrier rework — step 2: the four entry points, measured (2026-08-26)

How often each recurring entry point is actually used, what a session does
before it does any work, and where the chain from signal to disposition runs
through a human. **Counts with a stated method, not impressions.** Everything
labelled ESTIMATE is one.

Arc: `docs/directives/carrier-rework-handoff-2026-08-26.md`. Composed at the
peer desk (opus); classification was not delegated. Window **2026-07-29 →
2026-08-26** (4 weeks). Base `9697603`.

**Publication bar.** No transcript text appears here. Operator messages were
read to classify them and are restated, never quoted; session identifiers are
not reproduced. Counts and this desk's own summaries only.

## Method, and the instrument hazard that would have inflated everything

Sessions were counted from **top-level session files only** in this project's
store. The naive count is wrong by more than 4×: the store holds **78
top-level sessions and 264 subagent transcripts** in the same tree, and every
dispatched lane writes its own file. A count that walks the directory returns
342 and reads as "sessions". Every figure below is out of **78**.

Each session was classified by its **first genuine operator message** — harness
injections, hook context and tool results excluded. Classification was by hand,
by this desk, over all 78; it is not a sample.

Orientation was measured mechanically rather than judged: **tool calls before
the session's first write**, and **which files the first six calls touch.** The
proxy's limits are stated where they bite.

## The headline: the entry point with the most traffic has no lane, and the one with a lane is never the door

| entry point | sessions | share | has a lane? |
|---|---|---|---|
| **1 · drain the backlog** | **27** | 35% | **none** |
| 2 · check open upstream PRs | 2 | 3% | two, one never run |
| **3 · cut a new upstream PR** | **0** | **0%** | one, conforming |
| 4 · walk a newly posted bust | 10 | 13% | three, no tie-break |
| — bare "continue", no entry stated | 4 | 5% | n/a |
| — no first operator message found | 5 | 6% | n/a |
| — other (peer handoffs, briefs, consults) | 30 | 38% | n/a |

**Entry point 3 never happened — and the work did.** No session in four weeks
opened by setting out to cut an upstream PR. Yet **18 PRs were authored upstream
in the window**, including two on 2026-08-14 and two on 2026-08-20. PR-cutting
rides *inside* sessions that entered some other way, most often a backlog drain.
So the one entry point with a fully conforming lane is the one nobody walks
through the front door of. That is not an argument that the lane is unused —
its own mint records a real gap it closed — it is an argument that **entry-point
frequency and lane quality are uncorrelated here**, which matters for how step 4
ranks work.

**Entry point 2 is used twice a month against a live backlog of five.** As of
this measurement there are **5 open upstream PRs authored by the operator**, all
idle 3–5 days, all `REVIEW_REQUIRED`, four `BLOCKED`, and **one `CONFLICTING`**.
The lane built precisely to sweep that set was minted 2026-08-22 and, per step
1, has never run. Its own trigger — nobody has read the whole open set in a
week — is close to live right now.

*Scoping note that reconciles an apparent contradiction with step 3: the survey
lane measured **0 open PRs** and was right — it queried the **fork**. The real
PR surface is **upstream**, where these five sit. Any future query for EP2 must
name the upstream repo, or it will report a clean board that does not exist.*

## What the operator actually types

The judgment desk asked for the purest measure: sessions whose **first message
was the entry itself**, since that is what a lane would have absorbed.

- **Backlog drain: 13 of 27** open with the bare entry — an instruction to work
  the backlog and nothing else, or that instruction plus a request for an
  overview before work starts. The remaining 14 carry a specific pointer (a
  named entry, a directive path, a handoff).
- **Bust walk: 7 of 10** open with a pasted bust line — the ❄ figure, its class
  and its age, copied in from the statusline.
- **Upstream PRs: 2 of 2** open with the bare entry.

**Six sessions asked for an overview before any work.** That is the orientation
demand made explicit rather than absorbed silently, and it is the clearest
signal in the data that re-derivation is felt as a cost by the person paying it.

**Three sessions on one day opened with byte-identical text**, typos included —
the same instruction pasted three times. Whatever those sessions produced, the
re-entry cost was paid three times for one intent.

## The orientation cost, measured

**CORRECTED 2026-08-26 (G4 adjudication, in place — the wrong figure is not
left standing above a note).** The backlog row read **37** at n=27. Both are
wrong for this quantity. The basis is a measurement, not this document: of
the 27 backlog sessions, `tools/entrypoint-census.mjs` finds 26 that ever
called a write tool and one that did not, so the measured population is 26
and the 27 is the class count. The corroboration is this row's own range,
9–72, which is exactly the min and max of those 26 values. (The "one session
never wrote at all" sentence below belongs to the BUST paragraph and is about
the bust set — it was misread as covering this row while making this
correction, and the misreading is recorded rather than quietly dropped,
because a true sentence answering a narrower question than the one being
settled is the failure this whole audit exists to catch.) The median of those
26 is
(33+37)/2 = **35**. The 37 is their 14th value — an odd-count median taken
over an even list. The class count 27 is correct as a class count and stays
in its own column.

| entry point | median tool calls before first write | measured / in class | median minutes | range |
|---|---|---|---|---|
| 1 · drain the backlog | **35** | 26 of 27 | 9 | 9–72 calls |
| 2 · upstream PRs | 24 and 49 | 2 of 2 | 4 and 17 | — |
| 4 · walk a bust | 33 | 9 of 10 | 13 | 0–77 calls |

**Read the backlog row as the fixed toll.** Thirty-seven tool calls, at every
entry, before anything changes — independent of how much work follows.

**Read the bust row with more caution.** For a bust walk, investigation *is* the
work: calls before a write are not orientation in the same sense, so the proxy
overstates the toll there. It is reported because the brief asked, and its
weakness is named rather than absorbed. One session never wrote at all; one
opened with a write. Two minute-figures in the backlog set (278 and 2,464) are
long-lived sessions, not long orientations — which is why the median, not the
mean, is the statistic.

**ESTIMATE, and labelled as one:** treating pre-write calls as orientation and
the remainder as work, a median backlog-drain session spends roughly **12–15% of
its tool calls before its first write** (37 against a median ~264 total). This is
a proxy on both sides — some pre-write calls are real investigation, some
post-write calls are re-orientation after compaction — and no attempt was made
to separate them.

## The de-facto procedure nobody wrote down

The first six tool calls are remarkably uniform across backlog-drain sessions:

- **24 of 27** open `BACKLOG.md`
- **19 of 27** open `docs/dev-loop.md`
- **16 of 27** open `FORK-NOTES.md`
- 1 of 27 opens `BACKLOG-DONE.md`; 1 opens the threat matrix

The single most common **first** action is reading `dev-loop.md` — 11 of 27, and
5 of 10 on bust sessions. That is the required-reading gate doing its job: the
opening sequence is already standardised, just not *written* anywhere as a
procedure.

**Two things follow, and they point in opposite directions.**

A lane for entry point 1 would not be inventing a procedure — it would be
writing down one that already runs, uniformly, driven by a gate. That is the
cheap case.

But the same uniformity means **a lane alone will not remove the 37-call toll**,
because most of those calls are the mandated reads themselves. Anything that
claims to cut orientation cost has to change *what must be read*, not just
*document what is read*. Step 4 should not accept a lane as the answer to the
cost measured here.

## Entry point 4: from bust observed to disposition recorded

Every link traced against the wiring, not the documentation.

| link | mechanism | automated? |
|---|---|---|
| bust becomes visible | the statusline command, running as statusline and on session start and prompt submit | **yes** |
| bust reaches a session | **the operator reads the statusline and pastes the line in** | **NO — this is the human** |
| bust gets classified | `bust-triage`, including a `--list` mode over recent events | yes, once invoked |
| disposition recorded | the threat matrix, by hand | no |
| lane that governs the walk | `runbooks/bust-appears.md` | exists |

**The operator is the transport.** No hook routes a bust to a session. The
notification hook that exists is wired to the harness's own notification event —
permission prompts and the like — not to bust detection. The evidence agrees
with the wiring: 7 of 10 bust sessions begin with a pasted bust line.

**The lane is rarely the entry.** Of 10 bust sessions, the runbook that governs
the walk is touched in the first call **twice**; five open the method file
instead. The lane exists, conforms in substance, and is not where a bust walk
starts.

**`bust-triage --list` is the piece that makes automation conceivable** — a
recent-events listing already exists, so the missing link between "a bust
happened" and "a session is working it" is a trigger, not a tool. Stated as an
observation about what exists; the design is step 4's.

## Where sessions stalled or turned to the operator

Not mechanically countable — no marker distinguishes a question to the operator
from ordinary output — so this is a **qualitative read over the 78 first
messages plus the classification pass**, and is labelled as such. Three shapes
recurred:

- **The overview request** (6 sessions): work was not started until the session
  had reported what was coming. The operator asking to be told the state before
  authorising work is orientation cost surfacing as an interaction.
- **The relay** (at least 1 clear instance): the operator pasted another
  session's closing output and asked what it meant. A report written for a code
  reader reaching a person who then needs a translator — the failure the
  reporting conventions exist to prevent, observed in this repo's own record.
- **The re-entry with a pointer** (14 of 27 backlog sessions): the operator
  supplied the specific entry or directive rather than letting the session find
  it. That is a *workaround* for the missing lane, and it is why the missing lane
  does not show up as a visible failure: the operator absorbs it by hand.

That last shape is the important one. **Entry point 1 has no lane and no
symptom**, because the cost is paid in the operator's own message-writing rather
than in a stall the record would show.

## Could not verify

- **The orientation/work split is a proxy, not a measurement.** Tool calls before
  first write is mechanical and reproducible; it is not the same quantity as
  orientation. No attempt was made to hand-classify calls as orientation vs work.
- **Stalls are a qualitative read**, not a count. No marker distinguishes a
  question to the operator from other output.
- **5 sessions have no recoverable first operator message** and are unclassified
  rather than assigned.
- **4 sessions opened with a bare continuation** and cannot be attributed to an
  entry point; they are counted separately rather than folded into one.
- **Per-entry-point time-in-session was not measured** — only time to first
  write. A session's total duration is dominated by what it worked on.
- **Whether a bust reached a session at all** in cases where the operator saw the
  statusline and did nothing is unmeasurable from this side: unactioned busts
  leave no session to count. The 10 counted are a floor, not the incidence.

## Candidate bookings

For the judgment desk, which books. None is booked here.

1. **Entry point 1 carries 35% of traffic and has no lane** — the largest
   frequency-to-coverage gap in the set.
2. **A lane will not remove the 37-call toll.** The opening reads are mandated;
   cutting the cost means changing what must be read. Do not let a lane be
   accepted as the answer to this measurement.
3. **Entry point 2 is used twice a month against 5 open PRs, one conflicting,
   all idle 3–5 days** — and its sweep lane has never run since being minted.
   The highest-value-per-effort item in the set.
4. **Any PR query must name the upstream repo.** The fork reads as a clean board
   because the PRs are not there.
5. **Entry point 3 never happens as an entry, but the work does** — 18 PRs cut in
   the window. Frequency and lane quality are uncorrelated; rank on cost, not on
   whether a lane exists.
6. **The bust chain's only manual link is the operator pasting the line.** A
   listing tool already exists; what is missing is a trigger.
7. **The bust lane is the first thing opened in 2 of 10 bust sessions.** Either
   the router should reach it sooner or the three overlapping bust lanes need the
   tie-break step 1 already flagged.
8. **Six sessions asked for an overview before work, and three re-entered one day
   with identical text.** If any single number motivates the rework, it is that
   one.
