# Carrier rework — step 1: the system AS IT OPERATES (2026-08-26)

An inventory of every persistent carrier, every reader that grades one, every
scheduled producer, and every lane — **as measured, not as documented.** Every
row rests on an executed read; "documented but not found" and "found but
undocumented" are rows, not omissions.

Arc: `docs/directives/carrier-rework-handoff-2026-08-26.md`. Peer desk (opus)
composing; five read-only sonnet discovery lanes gathered (carriers×2 by repo,
readers/enforcers, scheduled machinery, lanes). Base: `main` @ `d44c4c5` at
dispatch; `1d85425` at compose time (intervening commits are handoff and the
step-3 survey — this file's write set untouched by them).

**Scope note on naming.** This repo is public. Two scheduled units in the
sibling dotfiles repo belong to the operator's unrelated office-domain work;
they appear here by role and finding only, never by project name. Their
specifics went to the judgment desk directly, and the work items they imply
belong in the dotfiles backlog, not here.

## What the two added columns are for, and how to read a blank

Mid-arc the operator ruled that the rework weighs **cutting and full rewrite as
first-class options, not fallbacks**, and that step 4 designs **greenfield** —
from requirements, with the current system out of view — then diffs against
this inventory, cutting what the design does not re-derive. Two columns follow
from that and are the reason this file exists in its present shape:

- **USE-EVIDENCE** — when the thing was last demonstrably used, with an
  executed basis, or the exact string `no evidence of use`.
- **REQUIREMENT** — the incident or failure it was minted to prevent, with the
  record, or the exact string `no recorded motivation`.

**An empty value is a finding, never an inference.** Lanes were instructed not
to supply a plausible motivation where none is recorded, and not to soften a
zero. Three distinctions are load-bearing throughout and are kept separate
everywhere:

| looks the same, means opposite things | |
|---|---|
| `no recorded motivation` | searched the carriers, nothing states why this exists |
| GAP / not checked | did not look, or could not reach it |
| `no evidence of use` | searched, with a positive control, and found nothing |
| a **stalled action** | real use evidence exists; the booked action never ran |

**Instrument discipline applied throughout.** Every absence claim carries a
positive control — the same search form returning a hit on a case known to be
present — because a pattern that could never have matched returns exactly what a
true absence returns. Every instrument was inspected in source for writes
*before* being invoked; anything that would mutate state is recorded as `not
exercised — would mutate state` with the write's file:line rather than run.

---

## A. Carriers

### A1 — this repo

28 rows in the lane data; the decision-relevant ones here. Counts:
PRESENT-DECLARED 19 · PRESENT-UNDECLARED 9 · DECLARED-ABSENT 2 · AMBIGUOUS 1.

| carrier | who READS it | USE-EVIDENCE | REQUIREMENT |
|---|---|---|---|
| `BACKLOG.md` (12,720 lines; 336 bullets across 9 sections) | session-start banner (`## Open` only); `state-report` (`## Open` + a bare count of `## Record`); the `backlog-*` tools | last write 2026-08-22; read today | recorded — minted 2026-07-29 to stop proxy-domain judgment and deployment-repo aggregation mirroring each other by convention |
| `BACKLOG-DONE.md` (10,323 lines; 272 bullets) | **nobody mechanically** | last write 2026-08-20; no mechanical read at all | recorded, dated, quantified — the archive was 71% of what every reader loaded |
| threat matrix + its `.status.json` sidecar (32 rows) | `matrix-status` → `state-report` | last write 2026-08-22 | recorded; the sidecar's own reason is that a leading-token read mis-graded rows whose verdict sentence sat elsewhere |
| `.claude/required-reading.json` | the required-reading gate and injector | gate fired today; **cannot be tied to this repo** — the log carries no repo field | recorded, dated, in two independent sources |
| `.claude/github-app` + `.claude/agent-name` | **a confirmed-absent consumer** | written once, 109 days ago | recorded at mint — but its consuming hook does not exist on this machine |
| `docs/directives/` (61 files) | one file has a collector; 60 do not | most recent write today | **found on the second pass** — the retention requirement is recorded in `FORK-NOTES.md`: retired directives are refutations with numbers, and a session proposed two shapes already measured and retired |
| `docs/runbooks/` (9 files) | a session entering the event, via the router | last write 2026-08-22 | recorded, system-level, dated — event handling depended on what a session happened to remember |
| `docs/audits/`, `docs/code-reviews/` | a session that remembers to | 16 and 11 days | **found on the second pass** — recorded in `BACKLOG.md` as append-only historical records whose rewriting would falsify them |
| `docs/release-tests/` (4 files) | a session that remembers to | **75 days — the stalest declared role** | **`no recorded motivation`** — and the lane refused to extend the neighbouring historical-record rationale to it, because that sentence does not name it |
| `BEGEHUNG-MAP.md` | the coverage-walk skill | 2 rounds ever, both the same day; **its own 14-day staleness rule is currently violated** | recorded — rotate lenses instead of revisiting the last incident's corner |
| three untracked `*-BRIEF-*.md` | a session by hand | one has **zero citations ever**; the other two are **stalled actions** — booked for disposal 16 days ago, never executed | recorded, all three, in their own bodies |
| `docs/api-key-audit-*.md` | — | one commit ever, 140 days | recorded — an external report of phantom billing |
| `.claude/settings.local.json`, `CHANGELOG.md`, `README.md` | harness / humans | mtime only | **`no recorded motivation`**, confirmed on the second pass — discussed in the carriers, never motivated |
| `.claude/worktrees/agent-*/` (26 dirs) | the agents that owned them | see §E | **`no recorded motivation`** at this repo's level; the mechanism's rationale lives in the plugin repo |
| `READINESS.json`, root `LEDGER.md` | — | **DECLARED-ABSENT** — the roles exist in doctrine, the files do not | n/a |

**The second pass earned its round trip.** Three rows first marked `no recorded
motivation` — `docs/directives/`, `docs/audits/`, `docs/code-reviews/` — were
upgraded to *recorded* once the search widened from mint commits to the
chronological carriers. Each would otherwise have reached step 4 as a false cut
candidate. Two rows survived the widened search and are now much stronger for
it. That asymmetry is the argument for running the pass at all.

### A2 — the corpus, dotfiles, and the plugin

| carrier | USE-EVIDENCE | REQUIREMENT |
|---|---|---|
| the 8 corpus modules | all edited within one recent consolidation wave; 7 of 8 cross-cited by other modules | recorded — every module carries dated in-file incident clauses; density ranges 15 down to 1 |
| the machine-wide lane router and its one lane | **followed on record at least twice**, with commit citations, plus one attempt that ended blocked | recorded |
| dotfiles root backlog and corpus backlog | actively edited | recorded |
| the instrument-lesson carriers (OBSERVATIONS files) | actively amended | recorded |
| **24 orphaned plugin-cache versions** | none since supersession | **`no recorded motivation`** — nothing anywhere requires or discusses keeping them, in contrast to a sibling directory that documents a cap of five |
| a 4-month-stale command file | no invocation found | `no recorded motivation` at origin — **but see §E, this is not a clean cut** |

**Corpus drift is structurally impossible, which is a different fact from
"clean."** Every corpus path under the deployed config directory is a symlink
into the dotfiles checkout, and no deployed hooks copy exists at all — hooks run
from absolute source paths. Verified with a negative control. A no-drift that
holds by construction stays true unattended; one that holds by discipline needs
a mechanism. Do not book this as "checked, clean."

**The drift that is real sits one layer down:** the active plugin install is 10
commits behind the local checkout, alongside 24 orphaned cached versions.

---

## B. Readers and enforcers

~35 instruments. **Zero were exercised against live state** — the arc's rule was
inspect-for-writes-first, and everything with a `--test` battery was read rather
than run, because running the doctor's battery exercises every hook's self-test.
Five are mutators, recorded as `not exercised — would mutate state`.

**The sharpest single row in the whole inventory:**

> **`corpus-pointer-check.py` is wired, self-tested, registered on every corpus
> edit, calls the fire recorder at exactly one site — and has never fired.**
> Verified at this desk with checks the lane did not run: 1 call site; **0 rows
> in a 3,055-line fire log**; controls in the same file and the same form — its
> sibling corpus hook 33, the session-start hook 238, the required-reading gate
> 237. The logging works, the hook is live, and it has never caught anything.

**Checks whose reach is a restated list, and therefore ages silently.** This is
the class, not a list of individual bugs:

- a Stop-hook's hardcoded three-name booking list, which does not know this
  repo's own declared closure home — so a turn that booked correctly would be
  nagged as unbooked;
- a closure-word regex missing three synonyms that a sibling tool has *measured*
  occurring in the wild;
- a lane checker's two hardcoded section headings, restated from a spec it never
  re-reads;
- a pre-commit hook's hardcoded carrier basenames.
- **Counter-example worth preserving:** the backlog census unions its default
  vocabulary with the carrier's own declaration and reports an explicit
  `unknown` bucket. That is the shape that ages loudly.

**Notification channels — who actually learns anything.** Most instruments emit
to the operator's terminal. Two inject into agent context at session start. A
dozen block or nag the model. One output is orphaned: a dispatch log written on
every dispatch, with **zero code consumers** — scoped claim, positive-controlled
against six real code consumers for a sibling carrier. Its own docstring names
its consumer as a manual ritual.

**The two-layer push gate: verified, all five links.** Global hooks path → the
global dispatcher → the pushed repo's own leak scanner → a chain into the
repo-local hook (resolved deliberately so it cannot recurse into itself, after a
dated incident) → the full suite in a detached worktree at the pushed sha. The
local guide's claim is accurate, with one nuance the doc omits: the chain
resolves by git-dir query rather than a literal path.

**`--test` coverage is real.** All 16 plugin hooks carry a bite; the machine
doctor invokes them across three homes inside an isolated state root, after a
measured incident where one doctor run appended 149 synthetic lines to the real
fire log.

**Guards that fire constantly.** Four exceed 300 fires in a 20-day window, the
highest at 1,101. The volume is named as data; no override-training verdict is
asserted, because proving that needs evidence of bypasses following denials,
which was not gathered.

**Guards the fire log structurally cannot see.** Four plugin hooks contain no
fire-recording call at all. Their absence from the log is not evidence of never
firing — it is evidence the mechanism cannot observe them. Kept distinct from
the never-fired row above, which is the whole point.

### A guard that fired on legitimate work, and what it cost

A path guard denied a command of this desk's because a `grep` **pattern**
contained a token shaped like a path outside the allowed roots. Nothing outside
those roots was read or targeted.

The mechanism, found by the judgment desk by *executing* the hook rather than
reasoning about it: the guard **does** have a pattern-slot concept for grep-family
commands; the tokenizer glued the statement separator to the preceding word, so
any command after the first never opened a segment and the exemption never
applied. Fixed, red-first, and verified live from this desk by re-running the
exact blocked command.

Two things worth carrying, and one correction:

- **This desk's first reading was wrong** — it inferred a missing classifier
  concept from two observations and delivered it in the same voice as the
  observations. The fix would have gone at the wrong layer. Recorded because the
  inventory is full of the same shape in other people's instruments.
- **A second denial the same day was correct** (a literal root-directory search)
  and was initially mis-paired with the first as a second false fire.
- **What survives and has no mechanical fix:** the deny text ends "do not retry
  or work around." A lane re-ran the correct denial narrowed to in-bounds paths —
  the right act, formally non-compliant. The tokenizer bug is now closed in code
  and cannot recur silently; the wording will keep making a correct narrowing
  look like a dodge, on every future fire.
- **The fire log records no command text**, which is why neither desk could
  triage either fire from it. An instrument whose output cannot answer the
  question it exists to support — the same class this section catalogues.

---

## C. Scheduled machinery

Six relevant timers plus the continuously-running proxy. **No dead or masked
units; no cron installed on this machine.** No local registry was found for any
Claude-Code-native scheduling; only a single last-fired watermark exists.

| producer | what it writes | who reads it | landing |
|---|---|---|---|
| the daily replay gate | a full verdict with row-level evidence; a fire-ledger line; row-pin and census snapshots | verdict: **three** independent readers. Fire ledger: one reader, itself never scheduled. Row-pins/census content: **nobody** | mixed |
| the twice-daily harvest | novel fixtures, growth snapshots, a watermark ledger | ledger: only itself, next run. Fixture content: **nobody scheduled** | LANDS-UNREAD |
| two office-domain timers (out of scope) | reports and seen-state | one pair alarms the operator on failure; the other's report **nobody reads** | one NOTIFIES-OPERATOR, one LANDS-UNREAD |

**Both cache-fix producers PASS the recurring-producer clause** — each writes out
what proves its own findings at find-time, not counts. Their evidence outlives
the captures it came from, which is what the clause asks.

**But four carriers they produce have no collector in the state report**, seen
only as a generic untracked-file count: the fire ledger, the row-pin content,
the census-row content, and the growth fixtures. Each has a *recorded
requirement* — one of them is the very incident the recurring-producer clause
cites as its precedent — so none is a cut candidate. **This is a wiring gap, not
a motivation gap**, and the distinction decides the disposition.

**The cleanest cut candidate the inventory produced** is the one out-of-scope
office-domain timer that satisfies both halves: `no recorded motivation` *and*
no scheduled reader. It belongs to the dotfiles repo, and the booking goes
there.

### Two findings about the gate that were not in any brief

**The banner can show a superseded verdict with no indication.** A lane reported
an unresolved discrepancy between the banner's figure and the stored one, and
guessed at capture rotation. The actual cause, from fields it did not read: the
gate ran across this session's start, so the banner read the *previous* run's
completed verdict while the current run was still executing, and the file was
rewritten seventeen minutes later. Both numbers are correct reads of different
states.
The gap underneath is real: the banner distinguishes fresh, stale and
age-unknown, but has **no "run in progress" state**. A verdict being recomputed
is indistinguishable from a settled one. The data to detect it is already in the
file — a start stamp with no matching finish.

**The gate service runs uncapped.** Peak memory ~12.0 GiB with no memory limit
of any kind, on a job that runs unattended twice daily. Independent of every
other finding here.

*Also corrected: a lane read the gate's `status=1/FAILURE` as a crashed service.
The unit declares exit 1 a success, because a red verdict is its signalling
channel; systemd's own result is success and the journal's closing line says
finished. Reading a rendered label as a semantic claim — the same class the lane
was cataloguing in other instruments.*

---

## D. Lanes

Nine runbooks here, one machine-wide, one procedure living only as prose.

**The router is clean and mechanically unenforced.** Both directions of the
prose router check out — every row names a file that exists, every file appears
as a row, zero drift either way. But `.claude/required-reading.json` carries no
`lanes` declaration, so the commit-time lane checker returns *not applicable* on
every commit here. Proven by execution, not inference. The checker's own
documentation uses this repo's exact intended shape as its worked example. The
machine-wide router self-reports the same gap for its own scope.

**Six of nine runbooks lack the `Trigger:` line their own format requires.**
Verified independently at this desk: 3 of 9 files carry one, positive control 7
occurrences in the format spec. One file additionally lacks both the limits and
report headings. Three conform fully.

Together those two facts argue about the **form**, not about six missing lines: a
format is prescribed, mostly unfollowed, and unenforced.

**Use evidence.** Eight of nine lanes have dated follow-through. One —
the stale-PR lane, minted four days ago — has **zero hits anywhere** beyond its
own mint commit. It has a recorded requirement and no runs, which is a different
disposition from having neither.

**Requirements.** Nine of eleven lanes carry a recorded motivation; four share
one dated system-level requirement, quoted once rather than copied down each
row. Two are `no recorded motivation`: one runbook whose mint commit describes
its contents but no incident, and the prose-only procedure whose mint commit is
a subject line with no body.

**Entry-point coverage — the operator's actual question.**

| entry point | lanes | verdict |
|---|---|---|
| 1 · drain the backlog | **none** | **Re-derive. The sharpest gap.** No lane, no router row. A session opens the backlog and works its grading vocabulary from memory |
| 2 · upstream PRs needing work | two, cleanly split by the router | mostly resolved by reading the table |
| 3 · cut a new upstream PR | one, with an explicit handoff | **best covered** |
| 4 · walk a bust | three overlapping candidates | **Re-derive among three.** No stated tie-break when more than one condition fits |

**The prose-only count was challenged and defended.** A single prose-only lane
was reported. That looked implausibly low against a 2,548-line method file, so it
was sent back with a four-part test. The lane adjudicated eight further
candidates and rejected every one with a named failing clause — several because a
runbook already covers them, one because the runbook itself declares the prose
superseded, and several because the method file states outright that it is method
and not sequence. **Could-not-decide: 0.** The count stands at one, now defended
rather than asserted.

---

## E. Two findings that cut across the classes

**The worktrees are registered, and my own first reading of them was wrong.** A
pre-commit census surfaced 25 agent worktrees and a raw count of **91 commits
unreachable from main** — which looks exactly like the lost-work failure the
closing gate warns about. It is not. The state report *does* collect this class
and reports the meaningful figures: 26 worktrees, 0 prunable; 58 lane branches,
**14 outstanding commits**, 5 with work, 1 orphaned-with-work. The 91 was
inflated by cherry-picked commits, unreachable by construction. The single
orphan resolves clean — main contains its work plus everything built on it since.
**No lost work.** What remains is accumulation: 26 live registrations and 58
branches for finished lanes, where the discipline treats removal as terminal.
And a second-order finding: the "1 orphaned-with-work" line will report forever
until that branch is deleted — a permanent benign alarm, the shape that teaches
readers to discount alarms.

**A clean-looking cut candidate that is not one.** A 4-month-stale command file
with no use evidence and `no recorded motivation` at origin reads as the
inventory's easiest deletion. A lane then found a *different* carrier's design
decision, dated and live, that deliberately excludes a directory from
synchronisation **because** that command is expected to recreate it on demand.
No motivation of its own; a live dependency recorded elsewhere. Removing it
would silently orphan a decision made in another file. **This is the shape a
per-row cut decision misses**, and it is the strongest argument in this document
for grading cut candidates against the whole carrier set rather than row by row.

## Could not verify

Explicit, per the arc's done-criterion; none supports a finding above.

**Carriers.** Whether today's required-reading gate fire was against *this*
repo — the log carries no repo field, and the mechanism is confirmed shared
across repos. Which reading the closure conservation check is meant to use:
strict closure grades give a clean zero-in-live against 131 in the home, but the
home's vocabulary has drifted to 18 words and one of them appears at bullet-start
in *both* files; no file states the formula, and the one recorded historical
figure matches neither count today. Per-file recency inside three large
directories. Contents of two harness-owned files.

**Readers.** No instrument was run against live state. Two mutators' non-test
write paths were not traced. A sidecar's writer was not confirmed. A per-file
self-test count across ~45 hook files was not completed. One 208KB hook was read
only in the relevant section.

**Scheduled.** No local registry for Claude-Code-native scheduling could be
found; the session-scoped listing cannot rule out jobs owned elsewhere.

**Lanes.** Whether the three bust-adjacent runbooks cross-reference a priority
order was not checked against their full bodies.

## Candidate bookings

Listed for the judgment desk, which books. None is booked here, and none is a
design recommendation.

1. **Entry point 1 has no lane.** The most-used entry point is the one with
   nothing written down.
2. **Decide the runbook form question**, not the six missing lines — a format
   prescribed, mostly unfollowed, and unenforced is one decision, not six edits.
3. **The lanes declaration is absent**, so an existing checker no-ops here on
   every commit. One line in the roster arms it.
4. **A guard that has never fired** needs a disposition — retire, or find out why
   its condition never occurs.
5. **Add a run-in-progress state to the gate banner**, from data already in the
   verdict file.
6. **Cap the gate service's memory.** Uncapped, ~12 GiB peak, unattended.
7. **Wire the four evidence carriers into the state report** — all have recorded
   requirements; this is wiring, not motivation.
8. **The closure conservation check has no stated formula.** Two defensible
   readings give materially different verdicts.
9. **`PARKED` is undeclared** in the backlog's own grades section despite 57 uses
   and a header claiming three grades.
10. **The state report never reads the closure home**, which holds most of the
    historical record.
11. **Retire the orphaned plugin-cache versions** — no use, no recorded reason,
    and a sibling directory documents a cap.
12. **Two disposal actions booked 16 days ago never ran** — stalled, not unused.
13. **The dispatch log has no code consumer.** Either wire one or record that its
    consumer is deliberately manual.
14. **Guard wording:** "do not retry or work around" makes a correct narrowing
    look like a dodge. No mechanical fix; a wording decision.
15. **The fire log records no command text**, so a guard fire cannot be triaged
    from it. Belongs to the dotfiles repo.
16. **Both dotfiles backlogs currently owe a retirement pass** — measured live at
    this desk, read-only: one at roughly 3.5:1 against a 3:1 tripwire, the other
    with zero closures in the measured window. This repo's own backlog is clean.
    Belongs to the dotfiles repo.
