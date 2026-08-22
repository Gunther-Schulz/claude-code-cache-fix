# claude-code-cache-fix (fork) — open operational items

Proxy-domain parking. Deployment-side items (which gates run on which
machine, pins, acceptance records) live in the operator's dotfiles repo;
SYSTEM items — code, PRs, investigations, upstream threads — live here.
Fork-only file, excluded from PR slices like FORK-NOTES.md. One item per
bullet, evidence pointer included.

Closure-home: BACKLOG-DONE.md

## Grades — THREE since 2026-08-11, and the third one is the point

`READY` used to mean decision-complete, and by 2026-08-11 ninety-five entries
carried it. Decision-completeness and a schedule are different claims, and
while the ready set was small they coincided; at ninety-five they had parted
company, so the grade asserted an intent nobody held — and a label nobody
believes carries no information, which makes the head of the list
indistinguishable from its tail. The accretion rule's own threshold ("ready
outgrows what the repo will ever schedule") was crossed, so the repo declares
the third grade rather than working around it by hand-ranking a head and
calling the rest unranked.

- **READY** — the SCHEDULED HEAD, capped at ten (operator, 2026-08-11).
  Dispatchable by construction and actually next. Membership is derived, never
  edited: re-run the derivation in `docs/dev-loop.md` ("Build order is DERIVED
  at build time"), including its composition rule that a head contains at least
  one MITIGATE-stage item whenever one is decision-complete — and says so in one
  line when none is.
- **RECORD** — decision-complete memory, not scheduled. Same bodies, same
  verifiers, nothing dropped; booking stays cheap because the record is what
  booking exists for. Lives in `## Record`.
## Build order — EIGHTH derivation (2026-08-18 afternoon), OVERTAKEN that night; read the override below before the list

**OVERRIDE — 2026-08-18 night, operator decision. This section's ranking is
STALE and the header's old claim that "the READY set IS this list" is false as
written: three entries booked after it are not in it, and its own item 1
shipped.** Do not re-derive a ninth ordering to fix that — the next session's
order is decided and stated here:

  1. **the replay children's heap cap decoupled from the rotation ceiling** —
     OOM, created this session (ceiling 8192 -> 12288 cut headroom 1.67x ->
     1.11x on a cap that is a proven regression detector).
  2. **the gate's parent memory** — 4.3 -> 8.3 GB monotonic, uncapped, no
     equivalent of the children's detector. Runtime is FLAT (0.87 min/capture
     vs 0.89) and wants a duration alarm, not incrementality.
  3. **`state-report` gains four collectors** — the intake gap.
  Then the surviving items of the list below, in its order.

**The operator's framing that decides all of the above: storage is NOT scarce
on this machine. Nothing valuable is pruned or leaned to save space — only
PERFORMANCE and OOM justify a change.** The capture-size entry (~271:1 stored
to novel) is PARKED under that constraint, not ready.

**Item 1 of the list below is CLOSED** — the coalesce-MISS record shipped this
session (`dc11012`, `f491b0f`, `81548e4`), deployed (pin `5ddf24f`, `81dd656`,
restart, three answers agreeing), and its entry has MOVED to `## Done`. The
ranking text below is left unedited as the record of what was derived that
afternoon; this block is what is current.

Method unchanged (`docs/dev-loop.md`, "Build order is DERIVED at build time"):
partitions first — hard ordering constraints, then irreversible failure modes,
then instruments with a MEASURED false verdict — then signals 2-4 inside each,
under the mitigation-led composition rule. The SEVENTH derivation (same day) is
REPLACED, not edited; its lap closure, the seven items that closed and the four
rankings it refuted live in `## Done` and in the commit record.

**THE OWED QUESTION, ANSWERED BEFORE ANYTHING IS RANKED — what proxy-side bust
class got closer to closed this week?** The seventh derivation made this the
eighth's first obligation and said that if the honest answer is "none", the
ranking is not the thing to fix. **The answer is not none**, and it is read from
the machine-readable row record and the shipped commits rather than from any
entry's prose: diffing `robustness-threat-matrix.status.json` at `60cf17c` (the
last commit before 2026-08-11) against today gives **row 23 OPEN -> RESIDUAL**
(the description-delta absorb, shipped today, `cdc2b9a` + `d7699cc`), **row 31
NEW -> RESIDUAL** (the duplicate sidecar coalesce, shipped 2026-08-14, measured
2026-08-15 at p = 1.4e-6), and row 2 OPEN -> ACCEPTED, which is an operator
disposition rather than a mitigation and is counted as neither. Row 6's ladder
gained the tool preload (`eaa1454`, `2759eeb`, `3eff617`) with a first live
absorption recorded. Eleven commits touched `proxy/**` in that window. So the
FORM is not this week's finding, and this derivation does not open on a process
repair.

**But the same read found what a ranking question would never have asked for.**
Row 31's own standing watcher — built to keep its closure honest, because the
systemd unit runs `--quiet` and the closing numbers otherwise reach nobody — is
WARN as of today's 13:20-13:36Z sweep: one post-flip single-message streak
double-billed of 27. It went unread at close because the close lane's health
list does not run `shape-verdicts` (fixed, `session-close.md` step 3b). Walked
today to a measured cause: the surviving miss fails ONLY the mitigation's fourth
condition, whose clock is stamped at the leader's POST-PIPELINE registration, so
our own pipeline latency is spent out of CC's 50 ms budget. Matrix row 31 carries
the full walk; the evidence is frozen. **The class this week closed is the class
now leaking, and that is what the head leads on.**

**THE MITIGATE LEAD, AND THE ONE REGRADE IT REQUIRED.** The composition rule says
the head LEADS with a MITIGATE-stage item whenever one is decision-complete. The
only candidate was `_resetRelocationMemory`, and reading its body to check the
label found something narrower and worse: **the entry has never carried a `Loop
stage:` line at all.** The MITIGATE label existed only in the SEVENTH
derivation's own prose, where it was written to satisfy this very rule — a
composition check answered by a label the derivation minted for itself, over a
body that does not support it. What the body does support is VERIFY: the entry's
own `git grep` finds the definition plus one test and no other caller, and its
done-criterion is a TEST passing using only the exported helper. The stage line
is now IN the entry, with that basis, rather than in a derivation block that
gets replaced every few days. **So no MITIGATE-stage
item is decision-complete today**, which triggers the rule's load-bearing second
clause: the nearest mitigation is the coalesce WINDOW-CLOCK fix (PARKED below),
and what would make it ready is named — the coalesce-miss records ranked #1,
which discriminate `stale-leader` (the clock fix removes it) from `tombstone` (a
different change to a different line). A mitigation designed before that
discrimination would be designed under an unknown attribution.

**THE INSTRUMENT-LED CAUTION, PAID RATHER THAN INHERITED.** The seventh
derivation said the form is the finding if the eighth came out instrument-led.
By raw count it has. That is not the same state the caution described, and the
difference is checkable rather than rhetorical: the lead instrument is UPSTREAM
of the mitigation parked on it — the exception the scoping rule already carries,
here as arithmetic rather than as an appeal; the second was found while freezing
this week's own evidence and silently drops the proof of any billing finding;
the third is an instrument with a MEASURED false verdict feeding EVENT
DISPOSITION, tier 1 of the partition's reach ordering, and operator-ranked. What
would indict the form is an instrument-led head with no mitigation blocked on
any of it. Today every instrument at the top has a named consumer waiting on it.

*(The eighth derivation's rank 1 — the coalesce-MISS record — is GONE from
this list along with its `<!-- entry: -->` anchor, because it shipped this
session and its entry moved to `## Done`. Two attempts to keep it here failed
the completed-rank guard, correctly: the guard resolves each rank ANCHOR to a
live `## Open` bullet, so neither annotating the bullet nor un-numbering it
satisfies anything — the anchor is the thing that has to go. Refs for the
closure are in the `## Done` entry. Ranks 2-6 below keep their original
numbers as the record of what that derivation ordered.)*
2. **`boundary-layers --at` picks a request by NEAREST timestamp and prints a
   complete, plausible, wrong anatomy** — PROMOTED from `## Record`, where it
   was booked OPERATOR-RANKED SECOND behind a mitigation that has since parked.
   Third partition, tier 1: its output is what a bust walk attributes from, and
   it has already produced two disagreeing anatomies of one event. Bundles into
   ONE lane with the OOM entry below it — same realizing file, separate
   red-first arrangements.
<!-- entry: "boundary-layers OOMs at 4GB on a live capture, reach shrinks quadratically" -->
3. **`boundary-layers` OOMs at a 4 GB heap while captures grow quadratically** —
   the same lane's second half, and it rides the lane rather than leading it
   for the reason its own body gives: a core dump cannot be mistaken for an
   answer. Its repair is NOT decided — the lane MEASURES (`bytesRead` against
   bytes consumed on a large capture) and returns the streaming-vs-cap decision
   to the desk. That is stated here so the lane is not briefed as a fix.
4. **`harvest --pin` stops at request ordinal `m`, so the pinned pair's own
   outcome records are never in the fixture** — while the tool reports that the
   pin "reproduces the live verdicts". SEE. Found today by freezing evidence
   with it; every billing or coalescing finding ever pinned lost its proof this
   way.
5. **a READY entry whose ANCHOR moved after its booking date is unflagged** —
   the seventh derivation's own measured failure, mechanized. Ranked below the
   proxy work deliberately: it is process instrumentation and nothing
   downstream waits on it. **CLOSED the same evening (`935d216` / `5a557ce`);
   body in `## Done`.** Its ranking anchor is deliberately absent from this
   line: `tools/backlog-order.mjs` requires every ranked anchor to match a LIVE
   bullet in `## Open`, and leaving one behind after a closure is what made the
   pre-push suite red here — the guard working, caught before the push rather
   than after it.
<!-- entry: "resetRelocationMemory cannot evict the memory the pipeline uses" -->
6. **`_resetRelocationMemory` cannot evict the memory the running pipeline
   uses** — REGRADED to VERIFY above. Deployment-coupled, ships on its own; it
   is real work and it is last because nothing rests on it, which is the same
   sentence that took it out of the lead slot.

**THE HEAD IS SIX, NOT TEN, AND THAT IS A DECISION.** `backlog-lint`'s cap lane
reports UNDER-FULL and is right about the count. Filling to ten would re-assert
the intent the third grade exists to stop asserting: today's schedulable
capacity is three parallel lanes plus two desk-side `proxy/**` ships, and the
promotion pass below found the population honestly thin. What is nearest, named
so the ninth derivation does not re-derive it: the `deferred-tool-rewrite`
resume-tolerant read (a MEASURED 38.9 kB span, and the strongest mitigation in
the file) is blocked by a HARD ORDERING constraint its own entry states — the
sibling resume-key design must settle first, and that entry is parked on an opus
review's ten findings; the fork-owned snapshot retention item is MITIGATE-stage
but its design is explicitly undecided ("not widen the regex" is all that is
settled).

**A MEASURED INSTRUMENT TRAP THIS DERIVATION HIT ITSELF, recorded because the
next derivation will use the same command.** `git log --since=YYYY-MM-DD` does
NOT mean midnight: git's approxidate attaches the CURRENT clock time, so at
17:00 the bare form silently drops every commit made earlier that day, and the
same check returns different answers depending on the hour it runs. Measured
three ways on one anchor: `--since=2026-08-16` returned nothing for
`tools/boundary-layers.mjs`, `--since="2026-08-16 00:00"` returned `a644022
df83937`, and `a644022`'s own committer date is 2026-08-16 10:22:22 +0200. The
first pass of this derivation's promotion survey ran the bare form, so its
zeroes were unfounded and were re-run pinned (21 anchor-moved entries became
24). The correction reached the anchor-lint lane mid-flight with a third bite
attached to it.

**LAP CLOSURE, same evening — two of the six are already in `## Done`, and the
numbering below is what was DERIVED, not what is left.** Head #5 (the
anchor-moved lint) shipped `935d216`/`5a557ce` and closed; the ship-runbook A/B
step that was the seventh derivation's residue shipped `fb99920`/`50c331c`. Head
#4 (`harvest --pin`) is built and back with its lane for one narrowing — the
chase was scoped 0..m and swept 90 unrelated outcome records into a public
fixture, so it is being re-scoped to n..m before integration. Nothing here
re-ranks: a lap closure records what left, and the NINTH derivation is what
re-orders.

**LAP CLOSURE, second pass — the head is down to TWO, and the ninth derivation
is what refills it.** Since the note above: #4 (`harvest --pin`) and #2
(`boundary-layers --at`) both CLOSED and are in `## Done`; #3 (the OOM reach)
is REGRADED to PARKED — its measurement ran and returned a scale gap rather
than an answer, and its named missing evidence is now a capture at incident
scale; #1 (the coalesce-miss record) is BUILT AND PUSHED but its done-criterion
includes a ship, and the ship is HELD at the runbook's step 2 (see the section
above this handoff). What remains READY is #1's ship and #6. That is thin on
purpose rather than by attrition: five of the six items derived this morning
reached a terminal state the same day, and re-ranking a two-item head inside the
same lap would repeat the mistake the seventh derivation is a record of.

**LANE JOIN over the entries' write-boundary slots — derived from the
`Write-set:` lines, not composed by hand:**

| lane | items | write-set | state |
|---|---|---|---|
| — | 4 | `tools/harvest.mjs` + its two pin tests | dispatched |
| — | 5 | `tools/backlog-lint.mjs`, its test, `docs/dev-loop.md` | dispatched |
| — | 2, 3 | `tools/boundary-layers.mjs`, `test/boundary-layers.test.mjs` | ready to dispatch |
| desk | 1 | `proxy/server.mjs` + capture, census, verdict readers | desk (ship runbook) |
| desk | 6 | `proxy/extensions/fresh-session-sort.mjs` | desk (ship runbook) |

The three tool lanes are disjoint and run in PARALLEL. Both `proxy/**` items are
deployment-coupled and are NOT bundled — with each other or with anything else:
row 31's own entry records why attribution of a streaming-path regression must
stay unambiguous. The ship-runbook A/B step that led the seventh derivation's
residue CLOSED during this derivation (`50c331c`) and is in `## Done`.

## SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployment half is not

**State, 2026-08-18 evening.** Fork `main` carries the change
(`dc11012` + `f491b0f`, suite green at each). The RUNNING proxy does not: no pin
bump in dotfiles, no restart. That is a decision taken at the ship runbook's own
step 2, not an omission.
**CORRECTED, same evening, by running the doctor instead of predicting it.**
This paragraph first said the unchanged pin would keep `doctor` green "rather
than reporting a mismatch nobody chose". False, and the doctor was one command
away: it compares the pin against the REPO's `HEAD:proxy`, not only against the
running process, so the hold produces TWO warns, both accurate —
`main@proxy:5ddf24f != Pin main@proxy:25c9929` and `laufender Prozess fuehrt
Fingerprint 7f15d0bc285b aus, auf der Platte liegt c2effc3e1d2e — Aenderung ohne
Restart`. Those warns are the CORRECT state of a half-finished ship and are
better than the green I predicted: they say out loud that code on disk is not
the code serving traffic, which is exactly what a session arriving tomorrow
needs to know. Treat them as the hold's own reminder, not as a defect to
silence — the second one clears at the restart, the first at the pin bump, and
the trigger below is when both happen.

**Why held, with the number the step asks for.** `node tools/restart-exposure.mjs
--window-min 60` reported **7 live sessions, worst case ~1,112k tokens**, three of
them large and active within the same minute (601, 846 and 604 messages). The
runbook calls a non-trivial number here "a decision point (restart now vs. wait
for a quieter window), not a step to note and proceed past". The change is
OBSERVATIONAL — it writes a record and forwards nothing differently — so it buys
exactly nothing until the next coalesce miss occurs, while a restart during three
large live sessions risks a class this repo has measured busting once in three
restarts. Waiting costs the value of one missed record; not waiting risks a real
rebill. That asymmetry is the whole argument.

**Steps already discharged, so the next session does not redo them:**
- Step 1, row-3 declaration: NOT owed. No state KEYS, no freeze logic; the two
  maps are per-process and already were, and no extension mutates the body.
- Step 1b, the A/B verdict tool, on its first real use since the step landed:
  `node tools/verdict-ab.mjs dc11012^ .` -> exit 2, `COULD NOT VERIFY — 0 of 3228
  verdict lines could exercise the changed code`. That is the EXPECTED answer for
  a change outside `EXT` and says nothing about this ship's safety, exactly as the
  step's own text says to read it.
- Step 2b, the skip gauge: silent-failure NO (the record's absence is itself
  readable — a double-billed streak with no miss record is the other case), blast
  radius YES. Fewer than both noes, so no fresh-context review gate; stated rather
  than skipped.
- Step 3, commit + push: done.

**TRIGGER TO FINISH IT, computable rather than remembered:** run
`node tools/restart-exposure.mjs --window-min 60` again; when no session with more
than 100 messages has been active in that window (or on operator GO regardless),
resume the runbook at step 4 — pin bump `git rev-parse --short HEAD:proxy` in
dotfiles `bootstrap/manifest.py`, restart, step 5's health check, step 6's gate
run, step 7's three-way compare. Nothing else about the ship is outstanding.

## Handoff — 2026-08-18 afternoon, with a NIGHT delta at the top. Rewritten, not appended; a stale one reads as authoritative.

**NIGHT DELTA — 2026-08-18, close of session. Read this before the afternoon
body below, which is still accurate on everything it covers but predates the
following.**

**NEXT SESSION STARTS HERE (operator decision, 2026-08-18 night):** the
entries at the head of `## Open` are the next work, and the operator's
framing decides which: **storage is NOT scarce on this machine, so nothing
valuable is pruned to save space. Only PERFORMANCE and OOM justify a
change.** Under that constraint the order is:
  1. **The child heap cap decoupled from the rotation ceiling** — an OOM
     finding this session created: raising `CACHE_FIX_CAPTURE_MAX_MB`
     8192 -> 12288 cut the replay children's headroom 1.67x -> 1.11x, and
     the cap is a proven regression detector, so it is now close to firing
     on healthy input.
  2. **The gate's parent memory** — 4.3 -> 8.3 GB monotonic, uncapped, with
     no equivalent of the children's regression detector. Runtime is FLAT
     (0.87 min/capture) and needs only an alarm, not incrementality.
  3. The capture-size ratio is **PARKED**, not ready — its storage
     justification died with the operator's constraint, and its risk (byte
     fidelity is the evidence base) is not worth buying on a resource that
     is not scarce.

**The ship is COMPLETE.** Pin `5ddf24f` in fork and dotfiles, proxy restarted,
fingerprint on-disk `c2effc3e1d2e` equal to running, version `4.4.0-beta.0`
equal to its pin, and the runbook's three answers all agree — DECLARED
(unit) = RUNNING (`/health`) = VERIFIED (gate status stamped 21:18:52Z,
`ok: true`, 0 failing, 30 captures). The sweep that produced VERIFIED ran
AFTER the restart, which is the freshness this step exists to establish; an
earlier read in the same session nearly booked the afternoon's 13:36Z file
as this ship's verification.

- **The ship is still HELD and nothing about it moved.** Pin `5ddf24f` local
  vs `25c9929` in the dotfiles manifest, fingerprint `c2effc3e1d2e` local vs
  `7f15d0bc285b` on live `/health` — both MISMATCH, both expected, both
  clearing at the pin bump + restart per `## SHIP HELD`. A night session
  verified the divergence is exactly the coalesce-miss work and nothing else.
- **A session-intake script was proposed, measured, and withdrawn** — the
  entry at the head of `## Open` carries the design that survived (four
  collectors on `state-report.mjs`) and the reason a ninth script is not it.
  Do not re-derive; the entry says so in its own body.
- **`docs/dev-loop.md`'s cost header was CORRECTED in place (`8866244`), not
  reverted.** Its earlier claim — that a whole-file read of that file was the
  single largest context jump of a session — overstated two things: the file
  returns ~16k tokens on a whole-file Read (the 2000-line cap truncates it,
  so the header's own ~40k figure never lands in one read), and the 33k jump
  was that read as DOMINANT COMPONENT, roughly half to two-thirds, not the
  whole. The section index added earlier that day (`a9d0473`) STAYS; it was
  kept deliberately after the correction, not overlooked.
- **A corpus rule shipped in dotfiles (`c054c05`) that binds work in THIS
  repo:** the discovery tell now counts intake and state verification —
  checking a handoff's or a booking's claims against the world — and the
  reading of large local artifacts (transcripts, logs, corpora) as discovery.
  Both had been escaping it by presenting as grounding discipline. Concretely
  for a successor here: verifying this handoff's own claims is dispatchable
  mechanical work; grading what the outcomes mean stays at the desk. That is
  the corpus's answer to the ~106k this repo's own openings have been costing.
- **An instrument defect worth inheriting:** transcript analysis that dedupes
  by API message id, keeping the first record per id, silently drops the
  majority of `tool_use` blocks — they live in later streaming partials
  (measured 236 of 354). It reports them as absent and never goes red. The
  head entry of `## Open` carries the full note.
- Unchanged and still open exactly as the afternoon body states: the row-31
  upstream filing (operator GO given, still nothing posted), the resume-key
  mitigation (design re-derived, build not started), the protect-default and
  cap-size decision.

The 2026-08-15 handoff is REPLACED. Two of its four "open operator decisions"
are dead of their own premises and are retired below rather than carried — that
is the failure this whole day's record is about, so this section does not get to
repeat it.

**The entry point is `continue from backlog`.** Build ORDER is derived at build
time (`docs/dev-loop.md`). **SUPERSEDED 2026-08-18 (evening): the EIGHTH
derivation has been RUN** — the `## Build order` block above is it, its owed
question is answered in its first paragraph (three proxy-side classes moved this
week; the answer is not "none"), and the head is six with the under-fill stated
as a decision. The rest of this handoff was written before that and is being
rewritten at close; where it and the build-order block disagree, the block is
newer.

**STATE — everything is pushed in both repos, verified against the remote, not
recalled.** Fork `main` at `323ca40`; dotfiles `main` at `5d9d0e0`;
`git log origin/main..main` empty in both. No background agents, no scheduled
wakeup, no worktree rebase state, no dispatch awaiting a report. Two modified
files are NOT this work and must not be committed: `LEDGER-Siren.json` (harvest
churn) in the fork, `qgis/QGIS3.ini` (the operator's) in dotfiles.

**DEPLOYMENT — the proxy WAS shipped today and the triple agrees.** `HEAD:proxy`
`25c9929` = dotfiles `CACHE_FIX_PROXY_TREE_PIN` `25c9929`; source fingerprint
`7f15d0bc285b` = `/health` `7f15d0bc285b`; version `4.4.0-beta.0` unchanged.
Everything committed AFTER the ship was `tools/`, `test/` or docs, so no further
bump and no restart is owed, and none was made. **The current lead item does not
change that; the SECOND one does** — `_resetRelocationMemory` is `proxy/**` and
owes the whole ship runbook (pin bump + restart at a stated session boundary +
gate run + three-way compare). Row 3's restart-transparency argument holds
unchanged for it: memory helper only, no state KEYS, no freeze logic.

**HEALTH AT CLOSE.** Suite green (3,641 tests, 0 fail, 12 pre-existing skips).
Daily gate `ok=true`, 0 failing over 18 captures, finished 13:36Z. Sweep
stability: 0 violations AND 0 exemptions. `serving-gate-lint` CLEAN over 13
serving gates. `matrix-status` 0 findings over 31 rows. `backlog-lint`
ready-bar 0. Nothing is broken; everything below is unbuilt.

**THE HEAD IS DELIBERATELY SHORT — 3 of 10, and that is not an oversight.** The
cap lane prints `head UNDER-FULL, promote from ## Record`, correctly. Refilling
it IS the eighth derivation, and doing that mid-lap on a day that just refuted
four of its own rankings would repeat the exact error. Promote when you derive,
with the question below answered first.

**LIVE STATE WORTH SEEING BEFORE YOU PICK WORK.** Protected captures hold 7,626
MB of an 8,590 MB cap — 89%, five files, `s-captureBR` alone 5,916 MB. That cap
is a hard stop, and there is a RECORD entry on the protect-default/cap-size
decision. Nothing is failing yet; this is the number that decides whether the
next big freeze succeeds.

**RETIRED OPERATOR DECISIONS — both killed by measurement today, not by an
answer.** (1) "fork `main` 33 behind `upstream/main`" is MOOT: measured after an
explicit `git fetch upstream --verbose`, the fork is **0 behind and 1,079
ahead** of `upstream/main` (`8ddd4f0`, dated 2026-08-15). There is nothing to
merge. (2) "committing the 687 uncommitted evidence pins" no longer describes
the tree: 25 untracked files under `test/fixtures/harvested/`, not 687. The
underlying question (are evidence pins tracked, and at what public cost) still
lives in its own entry; the NUMBER that made it urgent is gone. Two decisions
that STILL stand: the protect-default/cap-size call, and **operator GO for the
row-31 upstream filing** (#78420-adjacent) — no public artifact has been posted.

**WHAT LANDED TODAY, so it is not re-derived.** A live 448k bust walked to a root
cause in our own extension, fixed, shipped and verified; four parallel lanes
closing seven head items; row 6's ToolSearch-limb question answered and its
eight-day-old prose refuted in the matrix; and three instruments caught
producing false verdicts — `bust-triage` attributing to CC on a pair we had
exempted, `verdict-ab` reporting IDENTICAL over a comparison it structurally
could not make, and the runbook marker check confirming "BACKLOG ready" claims
from PARKED and DONE entries. All three are fixed. The bodies are in `## Done`;
do not re-derive any of them.

**THREE CORRECTIONS TO MY OWN DELIVERED CLAIMS, recorded because a successor
would otherwise inherit them as facts.** (a) The reason `verdict-ab` returned
IDENTICAL was NOT that the corpora lacked a case — the tool loads one module
file and the change was in another. (b) `verdict-ab` is named in NO runbook;
the seventh derivation ranked it partly on a runbook role it does not have.
(c) dotfiles commit `88440f3` carries (a)'s wrong story in its own body,
pushed and unfixable; the correction is in dotfiles `LEDGER.md` and in
`## Done` here. All three shared one shape: a TRUE basis answering a narrower
question than the one it was closing.

**ONE THING I BROKE, stated because the record is the only place it exists.**
While rewriting an unpushed commit to fix a misattributed co-author trailer, a
`git reset --hard` also discarded the uncommitted `LEDGER-Siren.json` change
that had been in the tree since before the session. Re-running `harvest`
rebuilt it (307 keys against 289 committed, and both expired-capture keys — the
lossy case — present), so nothing evidential was lost. The lesson is the scope:
the reset's blast radius rested on my memory of what was dirty rather than on a
read of the actual state.

**OTHER PARTIES.** A peer session holds the upstream PR-round thread; two review
rounds have been in our court since 2026-08-06 and nothing about that moved
today. `git log origin/main..main` covers only what landed here. A dotfiles
peer session was active this afternoon (`41a7e6e`, `ee00e42`) and released the
repo cleanly; my own dotfiles work is in and pushed.

**LANE BRANCHES — read `state-report`, not a raw `rev-list`.** 54 lane branches
exist and a naive `git rev-list main..<branch>` reports ~47 of them as carrying
unmerged work, which is WRONG: their content landed on `main` by cherry-pick, so
the SHAs differ while the change is present. `state-report`'s own count is the
one to trust — 5 branches with work, 1 orphaned with work and no registered
worktree (`worktree-agent-afc2401061b010669`, 2026-08-08). 26 worktrees
registered, 0 prunable.

**NOTHING GOES PUBLIC WITHOUT OPERATOR GO.** Binds every PR comment, issue
comment and new issue.

## Open

- **RECORD 2026-08-20 (found by destroying the thing it protects — I overwrote
  the pre-fix fire-ledger baseline by running a sweep, and only then discovered
  there was no second copy) — the daily sweep's `gate-status.json` is a carrier
  with NO HISTORY, so every run silently destroys the only record of the one
  before it, and every before/after question about the sweep is unanswerable
  after the fact.** Checked rather than assumed: one file at
  `~/.local/state/cache-fix/gate-status.json`, no dated siblings, nothing else
  matching `gate-status*` under the state root.
  **Why this is a mechanism finding and not my mistake alone.** The dev-loop's
  closing gate, question 2, already binds it: *a RECURRING producer of findings
  has no closing moment, so it satisfies the harvest question in its own
  machinery or not at all* — a daily sweep produces findings every morning with
  nobody closing anything. That clause was applied to CAPTURES (row-level
  attribution dying with eviction) and never to the sweep's own OUTPUT. The
  status file is the sweep's finding, and it is written in a way that guarantees
  exactly one generation survives.
  **What it costs, beyond today.** Every question of the form "did this number
  move, and when" — absorbed rate, saved/leaked, byteGate MISMATCH count,
  tmpLeftovers, fidelity — is answerable only against the CURRENT file. A
  regression that appears between two sweeps has no observable delta; the trend
  questions the ranking rubric's signal 2 wants (a cost "with its date") cannot
  be asked of the sweep at all. Today's byteGate entry is a live instance: it
  waits on "the answer arrives in the next sweep's status file", and that next
  sweep will erase the figure it is being compared against.
  **Design, and it is deliberately dull:** write each run to
  `gate-status-<ISO instant>.json` beside the live one and keep the current
  name as a copy or symlink so every existing reader is untouched; retain by
  count, not by age, so a quiet week cannot age out the comparison basis. The
  retention knob caution from the dev-loop applies in the usual direction — this
  is a few hundred KB per run against 486 KB today, so it is not a storage
  trade, and the operator's standing framing (storage is not scarce; only
  PERFORMANCE and OOM justify a change) settles it.
  **Register the carrier, per the closing gate's own clause:** the archive is a
  new persistent state carrier and needs its collector in `state-report` in the
  same change, or it repeats this defect one level up.
  Loop stage: SEE (the sweep is the daily eye; today it cannot remember).
  Anchor: `tools/gate-live.mjs`
  Write-set: `tools/gate-live.mjs`, `tools/state-report.mjs` (carrier
  registration) — the sweep's own file is the cache-fix desk's deployment lane
  to schedule, but the write itself is repo-side
  Verifier: red-first — two consecutive runs must leave TWO readable status
  files with different `started` stamps, and the older one must still answer the
  figure the newer one changed; today the second run leaves exactly one file,
  which is the red.
  <!-- entry: "gate-status.json has no history so every sweep destroys the previous record" -->

- **RECORD 2026-08-20 — PROMOTION CANDIDATE, deliberately not graded READY:
  the scheduled head is at its declared cap of ten, and membership is DERIVED
  at the next build-order derivation, never edited into place by the session
  that booked the entry. It is decision-complete (design decided, verifier
  named, write-set named), so promoting it is a one-line derivation decision
  rather than more work. (named in the 09:11Z walk's matrix datapoint and then NOT
  booked — caught by the operator asking whether the runbook needed updating,
  which is the named-and-unbooked shape `tools/named-unbooked-scan.mjs` exists
  to catch, arriving one level up as a missing ENTRY rather than a missing
  sentence) — `bust-triage` gains an `insert-context` step, the mirror of
  `edit-anchor`, so a `splice/insert-mid` bust reports its MECHANISM instead of
  requiring a hand probe.** Today `edit-anchor` runs behind
  `if (cls === "replace/edit")`, so for an insert class the tool returns a row
  number, an attribution and (since `3eb2de0`) an absorption line, and nothing
  about WHAT was inserted or WHERE.
  **Measured cost, this walk:** the hand probe's output WAS the finding — one
  372-byte `role:"system"` hook notification at index 82 of 107, `anchorDelta
  -23`, with the three other new entries ordinary tail growth. The quantity
  that explains the bust is the insertion's DEPTH behind the human anchor,
  because that is what sets the re-bill (372 bytes -> 110,022 tokens), and no
  instrument printed it. Without it the walk cannot distinguish a mid-history
  splice from tail growth that merely censuses as one.
  **Design, decided:** for `cls === "splice/insert-mid"`, report the entries
  present in `after` and absent from `before` that sit BEFORE the last
  surviving entry (the mid-history set — the remainder are appends), each with
  role, byte size, and offset from the last human turn. Identity comes from
  `semanticIds`/`conversationOf` imported from `replay.mjs`, never re-derived
  (the runbook's step 9). Reuse `pairEditContext`'s existing capture-window
  reader rather than opening a second one.
  **Done-criterion:** `bust-triage --at 2026-08-20T09:11:57Z` prints the index
  82 entry, its role, its size and `anchorDelta -23` without a probe.
  Loop stage: ATTRIBUTE (mechanism, the half the row number does not carry).
  Anchor: `tools/bust-triage.mjs`
  Write-set: `tools/bust-triage.mjs`, `test/bust-triage-edit-anchor.test.mjs`
  (or a sibling `-insert-context` file)
  Verifier: red-first, and the instrument PAIR is mandatory because the probe
  it replaces was nearly believed on a single arm — the busting pair yields the
  mid-history set `[82]`, and the same capture's append-only pair (ord 2->4)
  yields `[]`. Both from the capture, neither constructed.
  <!-- entry: "bust-triage insert-context step for splice/insert-mid mechanism" -->

- **RECORD 2026-08-20 (the fix SHIPPED in `3eb2de0`; what is booked here is its
  RESIDUE, which is larger than the fix) — every `bust-triage` verdict produced
  before today, ATTRIBUTION included, was computed over the DEFAULT extension
  set rather than the pipeline that was serving.** The spawn at
  `bust-triage.mjs` passed `--json --census` and no gates at all, so the child
  inherited whatever `CACHE_FIX_*` the ambient shell carried — in practice
  none. `--gates-from-capture` now rides that call.
  **Measured on the 09:11:57Z pair, both arms, same capture:** under the
  capture's own declared gates the mitigation row reads `mitigated: true`,
  `action "normalized"` — matching the LIVE extension event log at
  09:11:47.948Z; under defaults it reads `mitigated: false, action none`,
  because `CACHE_FIX_INSERTION_NORMALIZE` is simply unset. A second number
  moved in the same comparison (`tools[] stability` forwarded-whole-array held
  `0/2` -> `1/2`), so the gate set was not affecting one field in isolation.
  **THE RESIDUE, and it is one-directional, which is what makes it
  checkable rather than a panic.** Attribution is
  `ours = inDiv === null || inDiv > outDiv`. Under defaults our pipeline
  mutates LESS, so the forwarded output diverges no earlier than it would have
  under the serving set — which biases every verdict toward **CC's**. So:
  - a past verdict of **OURS** is safe. A stability violation found under a
    weaker pipeline is still a violation.
  - a past verdict of **CC's** is the suspect population, and every walk in the
    matrix rests on one.
  This does NOT mean they are wrong; it means their basis was not what the
  runbook's step 4 requires. **For the 09:11:57Z bust I re-ran it under the
  SERVING gates directly and the attribution is unchanged** (0 stability
  violations both arms), so that datapoint stands on a checked basis. No other
  instance has been re-checked.
  **Named missing evidence:** a re-run of `bust-triage --at <stamp>` for each
  matrix instance whose capture still exists, comparing the ATTRIBUTION line
  before and after. Captures that have rotated are a stated could-not-verify,
  never a pass — and that population is exactly what the bounded-pin discipline
  exists for.
  Loop stage: ATTRIBUTE (the gate the whole loop's second stage rests on).
  Anchor: `tools/bust-triage.mjs`
  Write-set: `docs/directives/robustness-threat-matrix.md` (per-instance
  attribution notes), `BACKLOG.md`
  Verifier: for each re-checkable instance, the ATTRIBUTION verdict under
  `--gates-from-capture` equals the one recorded in the matrix; any divergence
  is a finding about that walk, booked against its row.
  <!-- entry: "pre-2026-08-20 bust-triage verdicts computed under default gates" -->

- **RECORD 2026-08-20 (falls out of the same fix, `3eb2de0`) — the fire
  ledger's historical `saved`/`leaked` figures were computed under the old
  input-only pricing and are not comparable to anything measured from today
  on.** `rebilledBytes`/`savedBytes` (and their breakpoint twins) now key on
  `absorbed = mitigated && outputPreserved` instead of on `mitigated`, so every
  input-mitigated-but-output-spliced pair moves its bytes from the saved column
  to the leaked one. That is the intended effect — those bytes really were
  re-billed — but it re-baselines a series.
  **Direction and shape of the correction, so a reader is not left guessing:**
  saved was overstated and leaked understated, by exactly the
  `INPUT-MITIGATED, OUTPUT-SPLICED` population, which is the expensive tail
  rather than a uniform shave — the 09:11Z pair alone moves ~35 kB across the
  columns.
  **POST-FIX SWEEP RUN 2026-08-20 12:01:22Z..12:25:54Z, 48 captures.** Totals
  under the corrected pricing: `saved` **468,531 B** against `leaked`
  **28,220,974 B** — saved is 1.7% of leaked.
  **AND THE COMPARISON THIS ENTRY ASKED FOR IS NO LONGER POSSIBLE AS WRITTEN,
  because running that sweep DESTROYED its own baseline. Mine, second
  self-inflicted evidence loss of the day, same class as the s-captureBM one.**
  `gate-status.json` is a single file that each sweep OVERWRITES; there is no
  archive (checked: one file, no siblings, nothing under the state root). The
  previous sweep's `saved`/`leaked` figures — the pre-fix numbers — were still
  on disk when I started the run and I did not read or copy them. I read
  `.started`, `.finished` and `.code` from that very file minutes earlier and
  took the two numbers I actually needed off it never. The corpus rule walked
  past is the one already booked against me today: before a destructive step
  whose scope rests on a prior step's effect, read the object's CURRENT state —
  an overwrite is destructive, and a scheduled sweep does not present as one.
  **It is RECONSTRUCTIBLE, so this is a cost rather than a hole, and the method
  is named so nobody re-derives it:** the pre-fix code is in git. Check out
  `1cfc872` (the commit before `3eb2de0`) into a scratch worktree and run
  `gate-live` there against a scratch `--status` path — never the real one, per
  the parallel-lane rule — then diff the two totals. ~25 min, no operator
  decision, and the delta must equal the summed `rebilledBytes` of the
  input-mitigated-but-not-output-preserved rows.
  **Second, cheaper reconstruction, preferred if someone wants only the
  magnitude:** the delta is computable directly as
  `sum(rebilled where mitigated && !outputPreserved)` over the corpus, without
  any second sweep — the quantity that moved columns is exactly that
  population.
  **A MECHANISM FINDING falls out of the loss and it outlives this entry:**
  the sweep's own status file is a carrier with no history, so every sweep
  silently destroys the only record of the one before it. That makes ANY
  before/after question about the sweep unanswerable after the fact, not just
  this one. Booked as its own entry below.
  **Still deliberately not asserted:** the magnitude. One pair is n=1, the
  post-fix absolutes above are not a delta, and this entry claims no rate.
  Loop stage: VERIFY (the ledger that prices what the gates let through).
  Anchor: `tools/gate-live.mjs`
  Write-set: `tools/gate-live.mjs` if the sweep needs a stated re-baseline
  marker — HELD BY THE CACHE-FIX DESK's deployment lane, not this entry's to
  land; the measurement itself needs no write.
  Verifier: the next sweep's `saved`/`leaked` pair against the previous one,
  with the delta attributable to the input-mitigated-output-spliced rows rather
  than unexplained.
  <!-- entry: "fire ledger saved/leaked re-baselined by the absorbed pricing fix" -->

- **RECORD 2026-08-20 (INCIDENT, self-inflicted and irreversible, found by
  reading the tool's own success-path WARNING instead of moving past it) —
  `alias-claim --protect` DELETES the last copy of another capture when the
  protected-set cap is exceeded, and reports it as a warning on a zero
  exit.** Measured today, by me, on a live capture: protecting the 347 MB
  busting capture pushed the set past its 12 GB cap, and the tool responded
  `dropped protection for s-captureBM`. That capture's live-dir copy had
  ALREADY rotated out, so the protected hard-link was the LAST link to its
  bytes; unlinking it freed them. Confirmed against current state, not
  assumed: absent from `captures-protected/`, absent from `captures/`, and a
  `find` over the whole cache-fix data root returns nothing. Unrecoverable.
  **The defect is in the cap's own stated rationale, which is why nobody
  caught it.** `alias-claim.mjs:101-105` argues the cap is safe because
  "`--protect` hard-links, so a protected capture adds zero bytes to the
  filesystem and this number only limits how much the eviction sweep is told
  to keep". That is TRUE while the live copy still exists and FALSE for
  exactly the population the cap then evicts — old captures whose live copy
  is gone, where the protected link is the only link and is holding real
  bytes. The bounds-retention-not-disk claim and the eviction behaviour are
  correct sentences that contradict each other on the oldest members.
  **It also contradicts a standing operator framing** already recorded at the
  head of this file: storage is NOT scarce on this machine, and nothing
  valuable is pruned to save space — only PERFORMANCE and OOM justify a
  change. A 12 GB cap that destroys frozen bust evidence is a
  space-saving lean on the most valuable bytes in the tree.
  **The fix has two halves and the second is the load-bearing one.** (1)
  `--protect` must REFUSE, not warn, when its eviction candidate has no other
  link — a guard's repair for firing on legitimate work is a declared
  exemption, but here the guard is silent where it should block. (2) The
  decision must be visible BEFORE the act: a caller-visible pre-check
  ("protecting this evicts s-captureX, whose only copy this is") turns an
  irreversible side effect into a decision. A WARNING after the unlink is the
  register nobody stops for, which is exactly how this landed.
  **What did NOT break, established in the artifact rather than read off the
  entry:** the finding BACKLOG's own s-captureBM entry rests on survives in
  its committed bounded pin `test/fixtures/harvested/pinned-s-2474f17f818d-10-13.json`
  (98 KB, present, 26 records / 14 with messages, counts including the 16 and
  19 that its 14/16 = 0.875 overlap claim needs, plus the n=0..12 range its
  "checked against every predecessor" claim needs). The three-link freeze
  chain that entry documents completing is what saved it. The loss is the raw
  re-derivation surface beyond the pin, not the finding — which is itself the
  argument for bounded pins over relying on protection.
  **Second carrier owed:** that entry's parenthetical "claimed AND
  `--protect`ed, so retention cannot take it" is now FALSE and is corrected in
  the same change.
  **STANDING HAZARD — CORRECTED 2026-08-20 by the desk's measurement, and my
  first reading UNDERSTATED it.** I wrote "still at its cap". The set is
  already OVER it: 12,915,666,939 bytes against `capBytes` 12,884,901,888, six
  members, over by ~29 MB. So the next `--protect` does not RISK a drop, it
  drops deterministically, with nobody passing anything unusual.
  **And the set's normal condition is last copies, which is what makes my
  incident structural rather than unlucky.** `nlink` across all six:
  `s-captureBX` 362 MB (2), `s-captureBR` 5642 MB (**1**), `s-captureBV`
  5064 MB (2), `s-captureBP` 807 MB (**1**), `s-captureBA` 127 MB (**1**),
  `s-captureBO` 315 MB (**1**). FOUR OF SIX exist only in
  `captures-protected/`. Eviction is oldest `protectedAt` first, which names
  the next victim outright: `s-captureBO` (protected 2026-08-14T07:34:12.323Z);
  dropping it alone brings the total under cap, so it stops after one.
  **SCOPE of the freeze, established by read rather than by running it:**
  `enforceProtectedCap` has exactly ONE call site (`alias-claim.mjs:413`) and
  it is inside the protect path, so a plain `--note` claim never reaches it.
  Ordinary bust-walk alias claims are safe; only `--protect` is frozen.
  **The idempotent path is NOT safe, and its test will not write itself:**
  line 413 sits OUTSIDE the `if (!alreadyLinked)` block at 408-412, so a
  re-run of `--protect` on an already-linked capture — same dev/ino, zero
  bytes added, `protectedAt` not even refreshed — still enforces the cap and
  still deletes. The file's idempotence assurance is true about ALIASES and
  false about protected captures. A red-first case written for the natural
  fresh-protect shape stays green straight through this branch, so it needs
  its own bite: already-linked + over cap + last-copy candidate must exit
  non-zero AND leave the candidate's link intact.
  **The defect is a PARENTAGE one, which forecloses the obvious objection.**
  The file's own header states the designed behaviour — "at 93% the next
  protection simply fails" — so failing closed IS the spec and
  eviction-into-deletion is the implementation contradicting it. Two sentences
  of one design disagreeing; the deciding test is which reading fires on the
  motivating incident, and failing-closed fires while evicting does not. So
  "but then protecting gets harder" is not a cost of the fix, it is the
  documented intent being restored.
  **Owner: the tool fix is the cache-fix desk's** (claimed 2026-08-20,
  `tools/alias-claim.mjs`; shape: skip `nlink === 1` candidates, error
  non-zero when the cap cannot be met without unlinking a last copy). This
  entry keeps the incident, the measurements and the verifier obligations;
  it does not carry the write.
  Second-partition candidate (irreversible failure mode) at the next build-order
  derivation; not hand-promoted here, since READY membership is derived.
  Loop stage: SEE (evidence retention — the loop's inputs).
  Anchor: `tools/alias-claim.mjs`
  Write-set: `tools/alias-claim.mjs` (HELD BY THE CACHE-FIX DESK from
  2026-08-20 — not this entry's to land), `BACKLOG.md` (the s-captureBM
  parenthetical, DONE)
  Verifier: red-first, and it takes THREE cases, because the natural first one
  leaves two branches unexercised. (1) Over cap + a link-count-1 eviction
  candidate: `--protect` must exit non-zero and leave the candidate's link
  intact. (2) The SAME case one link higher: must still evict silently, or the
  guard has stopped discriminating and merely blocks everything. (3) The
  idempotent path — already-linked capture, over cap, last-copy candidate:
  must also exit non-zero, since `enforceProtectedCap` runs outside the
  `alreadyLinked` guard. A refusal only ever exercised against a capture that
  HAS another link is green in a way that means nothing (desk's framing,
  2026-08-20).
  <!-- entry: "alias-claim --protect deletes the last copy of an evicted capture at cap" -->

- **RECORD 2026-08-20 (found by walking the 09:11:57Z 110k bust to its
  absorption question) — `findAbsorptionMisses` cannot see a mitigation that
  ran and absorbed NOTHING, because it gates on the mitigation having CLAIMED
  an absorption.** `replay.mjs:2015-2018` computes
  `claims = movedFresh>0 || descriptionAbsorbed>0 || oscillationAbsorptions>0`
  and `if (!claims || !fresh.length) continue`. So the check answers "did a
  claimed absorption actually hold" and is silent on "did the mitigation
  decline to absorb an event it saw".
  **The instance, frozen:** on the busting pair, `insertion-normalization`
  logged `action:"normalized"` — its own header defines that as "a splice was
  detected and corrected" — with `inserted` 3 -> 4, and
  `moved:0, movedFresh:0, suppressed:0, dropped:0`. It SAW the new entry and
  relocated nothing, and 110,022 tokens were re-billed. `claims` is false, so
  the pair was skipped and the sweep reported clean on it.
  **CORRECTED 2026-08-20, SAME DAY, BY ME, BEFORE BUILDING ON IT — the
  headline above is true and the conclusion I drew from it was too broad.**
  I wrote that this population is one "nobody instrumented". That is FALSE.
  `findMitigationGaps` (`replay.mjs:1723`) already covers it, and covers it
  precisely: it filters to MITIGABLE input classes, computes
  `mitigated = cur.action === "normalized"`, computes `outputPreserved` from
  the OUTPUT census, and its own block comment names this exact combination —
  "a pair can be `mitigated: true` and `outputPreserved: false` at once, and
  that combination — not `mitigated` alone — is what determines whether the
  cache was actually preserved."
  **Executed against the frozen pair under the SERVING config**, which is how
  I found my own error rather than by re-reading my reasoning:
  `mitigation: 1/1 mitigable events absorbed (100%)` /
  `1 pair(s) input-mitigated but NOT output-preserved:` /
  `n=0->1 splice/insert-mid splice@82 [INPUT-MITIGATED, OUTPUT-SPLICED] ~31 kB`.
  The instrument names our bust, by class and by index.
  **How the error happened, since the shape is the reusable part:** my basis
  was a read of one `continue` in one function, and it was TRUE. It answered
  "is `findAbsorptionMisses` blind here" — a narrower question than the one I
  closed, which was "is this population instrumented". Every sentence stayed
  correct while the claim overreached, and nothing in the reading prompted a
  second look because the sentence I had was right. The reach test names this;
  the discipline that caught it was going to BUILD, which forced me to check
  whether the thing already existed.
  **WHAT SURVIVES AS THE REAL FINDING, and it is worse than what I booked,
  because it has a consumer and a wrong NUMBER.** The gap is not detection, it
  is that two of the three consumers of that detection report the opposite of
  what it found:
  1. **The headline percentage lies, on the same screen as the truth.**
     `absorbed (100%)` sits one line above `NOT output-preserved`, because the
     percentage counts INPUT mitigation (`action === "normalized"`, the
     extension's self-report about its own reconstruction) while the line under
     it reports the OUTPUT. A reader taking the summary number — which is what
     a status file or a sweep digest carries — reads 100% absorbed for a
     request that re-billed 110,022 tokens.
  2. **`savedBytes` credits the loss as a save, and it reaches the daily
     ledger.** `rebilledBytes: mitigated ? 0 : rebilled` and
     `savedBytes: mitigated ? rebilled : 0` both key on the INPUT-side
     `mitigated` flag alone. So our pair books ~31 kB SAVED and 0 LEAKED. That
     flows through `summariseFireBytes` (`gate-live.mjs:1550-1558`) into
     `saved.relocations`, into `reduceFireBytes` and the sweep's printed
     `saved` column (`gate-live.mjs:2444`, `gate-live.mjs:2514`) and its status
     file. The fire ledger's
     saved column is therefore inflated by exactly the events that cost the
     most, and its leaked column understates by the same amount.
  3. `bust-triage`'s ABSORPTION block never surfaces any of it — see the
     separate entry below.
  So the corrected finding is a PARENTAGE defect, not a coverage gap: one
  field named `mitigated` answers "did the extension re-serialise the input"
  and is consumed as "did the cache survive". Those are different questions and
  `findMitigationGaps`' own comment already says so.
  **`findAbsorptionMisses`' zero-claim skip remains TRUE and is now a
  SECOND-ORDER note rather than the finding:** it is arguably correct for that
  function's own contract (it grades join-move absorptions), and the population
  is covered by `findMitigationGaps`. Keeping the executed proof below because
  it cost nothing and pins the behaviour; dropping the claim that it matters
  much.
  **Design note, REWRITTEN after the correction above — the fix is NOT a new
  detector.** This entry originally specified adding a DECLINED class, which
  would have built a second instrument beside a working one and split the
  population across two readers. The fix is to make the three consumers report
  what `findMitigationGaps` already knows:
  - price `rebilledBytes`/`savedBytes` on `mitigated && outputPreserved`, not
    on `mitigated` alone, so the ledger stops crediting spliced output as
    saved;
  - report the absorbed percentage on the same conjunction, or print it as two
    numbers (input-mitigated / output-preserved) so one cannot stand for the
    other;
  - surface the `[INPUT-MITIGATED, OUTPUT-SPLICED]` row for the busting pair in
    `bust-triage`'s ABSORPTION block.
  Existing consumers of `rebilledBytes`/`savedBytes` move by construction —
  that is the point, not a side effect — so the change lands with its
  dependents search stated and its numbers re-baselined deliberately.
  **EXECUTED, not read off the `continue`.** Two entry pairs identical in every
  byte of `outHash`/`inHash` and differing ONLY in whether the mitigation
  claimed: `movedFresh:0` -> **0 rows** (invisible), `movedFresh:1` with a
  matching `join-move` -> **1 row** (`absorbedFreshAt:[83]`,
  `forwardedDivergence:83`). Identical divergence, opposite verdicts, so the
  skip is driven by the CLAIM and not by the bytes.
  **Worth recording, because it nearly confirmed itself for the wrong reason:**
  the first arrangement put the `join-move` at index 82 while the conversation
  identity element shifted the real divergence to 83, so
  `if (outDiv > Math.max(...fresh)) continue` (`replay.mjs:2031`) discarded the
  claimed arm too. BOTH arms returned 0 — which looks exactly like the finding
  being true, and was in fact the instrument not discriminating. The pair is the
  only thing that told them apart.
  Loop stage: VERIFY (the absorption instrument's reach).
  Anchor: `tools/replay.mjs`
  Write-set: `tools/replay.mjs`, `tools/bust-triage.mjs` (the ABSORPTION block)
  Verifier: red-first on the frozen pair below — a DECLINED row must appear for
  it, and must NOT appear for the append-only control pair at ord 2->4 of the
  same capture.
  <!-- entry: "findAbsorptionMisses blind to zero-claim runs on mitigable pairs" -->

- **RECORD 2026-08-20 (bust walk, 09:11:57Z) — row 1 instance: a 372-byte
  mid-history hook message cost 110,022 tokens, and row 1's residual sentence
  is REFUTED by it.** Event: 2026-08-20 09:11:57Z (11:11 local), 110k,
  `messages_changed`, capture `s-captureBX`, model `claude-opus-5[1m]`,
  pair ord 39->41 (`2026-08-20T09:10:38.414Z -> 09:11:47.934Z`).
  **ATTRIBUTION: CC's** — computed by `bust-triage` importing `replay.mjs`'s
  primitive, not by hand: CC's own raw pre-pipeline bytes diverge at index 82
  and the replayed census recorded no stability violation for the pair. The
  pair was CLASSIFIED rather than skipped (census `splice/insert-mid: 1` of 328
  pairs / 31 conversations — ours is that single one), so the negative is not
  vacuous.
  **MECHANISM, which the tool does not compute for this class:** exactly ONE
  mid-history insertion, at index 82 of 107, `role:"system"`, 372 bytes,
  carrying a Stop-hook blocking-error notification (`unpushed-reminder.py`).
  `anchorDelta -23` — 23 messages BEHIND the last human turn. The other three
  new entries (104, 105, 106) are ordinary tail growth. So a 372-byte
  notification spliced 23 turns back re-billed 110k: the cost is set by the
  insertion's DEPTH, not its size.
  **ABSORPTION: NO.** See the `findAbsorptionMisses` entry above — the
  mitigation ran, logged `normalized`, moved nothing.
  **The refutation.** Row 1's status record (`RESIDUAL`) asserts "the
  insertions that still bust are rows 4 and 22's classes". This instance is
  neither: `bust-triage`'s own migration step reads *no reminder container
  migration in this pair* (not row 4), and row 22 is the prune/suggestion-mode
  class, ACCEPTED and unrelated to a hook notification. So a third population
  busts under row 1 and the residual under-describes it. Row 1's status text is
  corrected in the matrix by the same change.
  **Instrument note, an INCREMENT to the known `classToRow` defect rather than
  a new finding:** the KNOWN-OPEN/row-1 verdict came from `classToRow`'s flat
  `splice/insert-mid -> 1` map (`bust-triage.mjs:1424-1430`), which is the same
  mechanism-blind mapping row 32 already booked for `replace/edit -> 4`. Second
  measured instance, one class over.
  **ABSENCE BOOKED, per the runbook's requirement:** row 1 has NO booked
  mitigation entry in this file, so the instance datapoint has no
  build-order-visible carrier and the ranking's measured-cost signal for row 1
  stays stale. That absence is this bullet.
  **Evidence, frozen and VERIFIED to reproduce** (machine-local, 0600, not
  committed — bounded deliberately: the finding is a message shape plus one
  event line, so the conversation prefix would be freight):
  `~/.local/share/cache-fix/bust-evidence/2026-08-20/bust-0911-pair.jsonl`
  (736 KB, 2 records) re-reads as `splice/insert-mid`, divergence index 82,
  mid-history inserts `[82]`; and `bust-0911-insertion-events.jsonl` (8 records)
  carries the `normalized / inserted:4 / moved:0` line.
  Loop stage: MITIGATE (row 1's remainder, now characterised).
  Anchor: `proxy/extensions/insertion-normalization.mjs`
  Write-set: `docs/directives/robustness-threat-matrix.status.json`,
  `docs/directives/robustness-threat-matrix.md`
  <!-- entry: "row 1 instance 2026-08-20 110k mid-history hook insert, residual refuted" -->

- **RECORD 2026-08-20 (settled by READING the code, while the rate measurement
  was still running — it does not depend on that measurement and is booked
  ahead of it) — NOTHING IN THE PIPELINE MOVES A MESSAGE, so row 1's
  relocation mitigation is a new OPERATION CATEGORY, not a new predicate on an
  existing one.** The question arose as an open design premise in the desk
  exchange over whether the proxy should absorb the mid-history hook-insert
  class, where it stood UNVERIFIED on both sides.
  **The invariant, verbatim** (`replay.mjs:558-559`): "The proxy's licence is
  to change BYTES, never the message sequence the model sees: same count, same
  roles, same order, tool_results still answering the tool_use immediately
  before them." A relocation changes ORDER by construction.
  **Every absorption today is slot-preserving substitution, stated in three
  independent places in the extension's own words:**
  `insertion-normalization.mjs:1083` — the join-move substitution "is
  slot-preserving: 1 -> 1, in place, so count, roles and adjacency are
  untouched, which is the pin argument verbatim"; `:720` — "The text is never
  touched, so count, roles, slot and bytes-the-model-sees are all unchanged";
  `:1057` — "Pinning substitutes the CONTENT of a single user message and never
  adds, drops or reorders one."
  **The refutation probe I ran against my own conclusion:** `relocatedAt`
  (`:1039`) reads like a mover and is not one — it returns `relocation.blocks`
  for a target index, i.e. WHICH BLOCKS to substitute at a slot already
  identified. Content, not position. A name over a body that does something
  narrower is the paraphrase-drift shape, and it is what made the "moves
  already happen and pass the gate" reading plausible to two sessions at once.
  **Consequence for the design, which is why this is booked and not just
  noted:** the two declared-exemption classes that exist do NOT generalize to a
  move. `isDeclaredInjection` (`:582`) is SHAPE-declared and deliberately
  narrow — only a system message whose content is entirely `tool_addition`
  blocks, or the description notice via `isDescriptionNotice`; its own comment
  says anything else in `messages[]` is still a violation, "free-text system
  messages included", which is exactly what the busting hook notification IS.
  `suppressedIndices` (`:604`) is TELEMETRY-declared, for messages deliberately
  never forwarded. A relocation needs a THIRD class, and it must be
  telemetry-declared for the reason the code already gives about suppressions
  (`:596-603`): "a removed message, unlike an added one, carries no shape of
  its own to detect after the fact" — a MOVED message has the same problem.
  **What this does NOT do: it does not decline the mitigation.** `FORK-NOTES.md:32`
  binds — "Any non-operator-initiated bust is a prevention target; cost never
  gates mitigation" (read, not recalled). It prices it, and it kills one
  argument that was being made FOR the narrow version: narrowing the predicate
  does not reduce the order violation, because the violation is in the
  operation, not in its breadth.
  Loop stage: MITIGATE (row 1 — the design premise, settled).
  Anchor: `tools/replay.mjs:558`
  Write-set: `proxy/extensions/insertion-normalization.mjs`, `tools/replay.mjs`
  (the third exemption class lands in both, or in neither)
  Verifier: red-first is available and mandatory — a relocation built without
  the exemption must make `findSafetyViolations` go RED on the relocated pair,
  and the exemption must then make it green while a NON-declared move on the
  same pair stays red. That pair is the discrimination; an exemption proven
  only by the green arm is one that exempts everything.
  <!-- entry: "nothing in the pipeline moves a message; relocation needs a third telemetry-declared exemption" -->

- **RECORD 2026-08-20 (found by the rate measurement's own instrument defect,
  which is a better finding than the rate it was commissioned for) — the
  census class `splice/insert-mid` is ~96% BENIGN near-tail growth, so every
  counter keyed on that class is dominated by a shape that costs almost
  nothing. The separating quantity is `anchorDelta`, not class.**
  **How it surfaced:** a dispatched sweep's first partial output carried a role
  histogram of system 211 / assistant 210 / user 210 across 631 mid-history
  insert entries. Near-uniform thirds is not the shape a "mid-history system
  notification" class produces. The dispatch brief had specified a positive
  control only — which proves an instrument CATCHES and says nothing about
  whether it DISCRIMINATES — so the count was could-not-verify until the
  negative arm was added and returned empty on `append-only` and `identical`
  pairs from the positive's own capture.
  **The mechanism, hand-verified on 4 independent pairs across captures:** CC
  emits a standing TRAILING system-reminder (the `<total_tokens>` block) as the
  last array element of every request. Each new turn's content pushes it one
  slot later. The content before it is genuinely new by `semanticIds`, and the
  trailing anchor survives AFTER it, so the pair censuses as `splice/insert-mid`
  while being ordinary tail growth. Three entries per event — a contiguous
  system/assistant/user run — which is the histogram.
  **The measured split (22 of 49 captures, provisional until the sweep closes;
  computed twice, once by the lane and once by me from its data file, agreeing):**
  1039 mid-history insert entries over 347 distinct pairs. 1000 entries
  (96.2%) at `anchorDelta >= 0`. 39 entries at `anchorDelta < 0`, over 20
  pairs. Exactly ONE pair at `anchorDelta <= -10`: the 09:11:57Z bust,
  `rebilledBytes` 35192, `absorbed` false, producer `unpushed-reminder.py`.
  **The distribution has a GAP, and the gap is the design input:** the deep
  values are one at -23, then eighteen at -2 and twenty at -1. Nothing between
  -3 and -22.
  **What this costs the fire ledger, which is where it bites:** `fireRaw.relocations`
  (`gate-live.mjs:1430`, `mit.length` — one row per MITIGABLE pair) is not
  merely a three-class superset; it is DOMINATED by the benign shape. A
  per-class breakdown of it — the obvious fix, and the one two sessions had
  agreed on — would have produced a second dominated counter. The counter must
  bucket on `anchorDelta`.
  **Design note carried from the desk exchange (peer provenance, and it is the
  half that decays):** whatever bound the counter uses for "deep" is stated as
  a CHOSEN bound with its basis — today's gap between -3 and -22 — never left
  to be discovered later as an implicit constant. The gap is cheap to defend
  today and expensive to reconstruct next month.
  **Named absence, graded real-now:** the exact percentage and the `<= -10`
  membership are pending the full 49-capture sweep, and the largest capture
  (4.9 GB, the longest session, hence the likeliest home for a deep splice) had
  not landed when this was written. That is a REAL absence — the corpus is
  external to this session's reach until the child process finishes — so the
  numbers above carry their denominator and the entry ships rather than waits.
  Loop stage: SEE (the instrument that would have recognised the class).
  Anchor: `tools/gate-live.mjs:1430`
  Write-set: `tools/gate-live.mjs` (the `relocations` bucketing),
  `tools/replay.mjs` (`findMitigationGaps` rows gain the depth bucket)
  Verifier: red-first, and the PAIR is mandatory and already in hand — the
  09:11:57Z pair must land in the deep bucket, and a trailing-reminder
  push-down pair from the same capture must land in the `>= 0` bucket. Both
  from the corpus, neither constructed. Data:
  `~/.local/share/cache-fix/insert-rate-2026-08-20/instances.jsonl` (machine-local,
  0600, not committed — it carries other sessions' message text by construction).
  <!-- entry: "splice/insert-mid is 96% benign near-tail; anchorDelta separates harm, not class" -->

- **DECISION 2026-08-20 (operator, stated once the measurement and the cost
  were both on the table) — MITIGATE THE CC BEHAVIOUR IN THE PROXY; do NOT
  change the operator's own hook.** The stated preference: mitigate CC bugs
  rather than alter legitimate local behaviour. This SUPERSEDES the
  park-with-re-entry-trigger disposition that the rate evidence alone would
  have supported, and it supersedes the "quiet the one hook" lever entirely.
  Recorded as a decision, not a finding — it is intent, and it is executed.
  **Why the framing holds on the evidence, so the next session does not re-open
  it:** `unpushed-reminder.py` is a `Stop` hook (registered in settings.json on
  the `Stop` event, no matcher, timeout 15) that returns
  `{"decision": "block", "reason": ...}` — the documented Stop-hook mechanism
  for declining to stop with a reason. It behaved to spec; nothing about its
  firing is anomalous, and it is unrelated to the same-day
  `worktree-edit-guard.py` NameError incident. What cost money is CC's
  PLACEMENT of the resulting notification at index 82 of 107 — 23 messages
  behind the last human turn — where CC's other notifications (system-reminders)
  ride at the tail. Attribution was already computed as CC's from the raw
  pre-pipeline bytes.
  **NOT ESTABLISHED, and the label matters:** that this is a BUG rather than a
  deliberate CC design with a cache cost. CC's intent is not readable from the
  capture, and no upstream issue has been checked against it — the coverage
  matrix's #87966 read is still owed. "Consistent with a bug" is what the
  evidence supports; "is a bug" is unverified.
  Loop stage: MITIGATE (row 1 — now GO, previously park-leaning).
  Anchor: `proxy/extensions/insertion-normalization.mjs`
  Write-set: DESIGN FIRST — the third telemetry-declared exemption class (see
  the safety-invariant entry above) is a prerequisite, and this is load-bearing
  under the repo's own non-functional rule, so it does not ride on one LLM's
  judgment. No implementation write-set until the design round closes.
  <!-- entry: "operator decision 2026-08-20: mitigate the CC behaviour in-proxy, not the hook" -->

- **RECORD 2026-08-20 (operator requirement, raised while the mitigation
  verdict was still open) — WHATEVER THE VERDICT, THE DEEP MID-HISTORY
  HOOK-INSERT CLASS GETS REGISTERED SO IT TERMINATES A FUTURE WALK INSTEAD OF
  BEING RE-INVESTIGATED. The operator's framing: if we decide against
  mitigating, there must be something unmissable showing we KNEW and chose not
  to — not a fact that has to be rediscovered.**
  **The mechanism already exists and is stronger than the placeholder the
  requirement asks for.** `bust-triage.mjs:51` defines `EXPECTED-BUST` — "known
  class, deliberately unmitigated (WON'T / MUST-NOT / ...)" — as a verdict that
  ENDS the walk, and `:63` defines `UNCLASSIFIED` as "no matrix row matches",
  the tool's actual payload. So the carrier is a threat-matrix row plus its
  `classToRow` mapping, and the delivery is automatic: the next session that
  runs `bust-triage` on an instance of this class gets a terminal verdict
  instead of an investigation. A comment in the proxy is the WEAKER form — it
  is passive and only found by someone already reading that file; the tool
  verdict fires at the moment of rediscovery, which is the moment that matters.
  **Do BOTH, because they serve different readers:** the matrix row + mapping
  for the walker, and a site comment in
  `proxy/extensions/insertion-normalization.mjs` for the next person who tries
  to BUILD the mitigation — that reader is not running `bust-triage`, they are
  editing the extension, and the phase-2 failure is exactly what they need to
  meet before they start. The comment carries a pointer to
  `docs/directives/instrument-lane-2026-08-20.md`, never a summary of it.
  **NEEDED EITHER WAY, which is why this is not gated on the verdict:** if we
  mitigate, the row's disposition becomes MITIGATED and the walk still
  terminates; if we do not, it becomes EXPECTED-BUST and the walk still
  terminates. Only the disposition word differs. So this is buildable now and
  is not waiting on the design consult.
  **PREREQUISITE, and it is already in flight:** today `classToRow`
  (`bust-triage.mjs:1424-1430`) maps `splice/insert-mid -> 1` flatly, which
  cannot tell our deep instance from the 96% benign trailing-reminder
  push-down that shares the class. Registering a disposition against the flat
  class would therefore mark the benign majority as EXPECTED-BUST too — a
  verdict that ends walks it should not end, which is worse than no
  registration. The depth bucketing (peer lane item 2) is what makes the class
  addressable; this entry lands ON it.
  Loop stage: RETIRE (the class's terminal disposition, whichever it is).
  Anchor: `tools/bust-triage.mjs:1424`
  Write-set: `docs/directives/robustness-threat-matrix.md`,
  `docs/directives/robustness-threat-matrix.status.json`,
  `tools/bust-triage.mjs` (the mapping),
  `proxy/extensions/insertion-normalization.mjs` (the site comment only — no
  behaviour change, so no pin bump and no restart)
  Verifier: red-first and the PAIR is available — `bust-triage` on the
  09:11:57Z instance must return the registered terminal verdict rather than
  UNCLASSIFIED or a bare row-1 walk, AND a benign trailing-reminder pair from
  the same capture must NOT return that verdict. A registration proven only on
  the instance it was written for is one that has been shown to fire and never
  shown to discriminate — the same defect that cost this investigation two
  cycles today.
  <!-- entry: "register the deep mid-history hook-insert class so a future walk terminates instead of re-investigating" -->

- **RECORD 2026-08-20 (correction to a number I computed and circulated the
  same day) — 76 PAIRS HAVE NO HUMAN TURN AT ALL, and my probe folded them into
  the `>= 0` bucket where the shipped instrument reports them as
  could-not-verify.** Subagent and sidecar conversations have no user-authored
  message, so `anchorDelta` is undefined for them rather than zero. My hand
  probe's `>= 0` count of 2,467 therefore overstated tail growth by 76; the
  shipped functions report deep 1 · shallow 103 · tail 2,455 · unanchored 76
  over 2,635 pairs across all 50 captures. The DEEP count is unaffected and was
  independently reproduced, which is what makes the disagreement informative
  rather than alarming: two implementations of one measurement, differing only
  where mine silently defaulted an undefined value.
  **The reusable half:** an undefined quantity given a numeric default lands in
  whichever bucket the default falls in, and reads as a measurement. The
  shipped instrument is right to carry a fourth answer; a three-bucket split of
  a quantity that can be undefined is a three-answer question asked with two
  answers available.
  Loop stage: SEE.
  Anchor: `tools/replay.mjs` (the depth bucketing)
  Write-set: none — the shipped code already reports unanchored; this corrects
  the RECORD, and the directive's measurement section is the consumer.
  <!-- entry: "76 unanchored pairs: my probe defaulted an undefined anchorDelta into the tail bucket" -->

- **RECORD 2026-08-20 (observed by the instrument lane, deliberately NOT built
  on) — a SHARPER discriminator than depth exists for the harmful class, and it
  rests on n=1.** Insert-count histogram over the corpus: 3 entries in 2,633
  pairs, 2 entries in 1, 1 entry in 1. Role sequences: `system/assistant/user`
  2,633 · `system` 1 · `user/assistant` 1. All runs contiguous. **The 09:11
  bust is the only lone-`system` mid-history insert in the entire corpus** —
  a cleaner separator than `anchorDelta <= -10`, which needs a threshold.
  **Why it is booked and not built:** one case. An instrument fitted to a
  single instance is fitted to noise, and it would be the same-parentage defect
  the corpus names — an expectation derived from the artifact it grades. The
  shipped design stays on `anchorDelta`, whose gap (-3 to -22) was
  independently reproduced by two implementations.
  **Named re-entry trigger, so this is a spec and not a shelf:** if a SECOND
  lone-`system` mid-history insert appears, the discriminator has n=2 and
  becomes worth building — at which point it may replace the threshold rather
  than joining it.
  Loop stage: SEE.
  Anchor: `tools/replay.mjs`
  Write-set: deferred — re-entry trigger above.
  <!-- entry: "lone-system insert is a sharper discriminator than depth, parked at n=1 with its re-entry trigger" -->

- **RECORD 2026-08-20 (found by dispositioning a risen skip count before a
  push, per the dispatcher duty; the skips turned out benign and this is what
  was underneath) — `fixture-verdict-identity` SKIPS ROUGHLY A THIRD OF ITS
  MUTANT WALKS, and nothing reports why.** Measured across two runs of the same
  suite this afternoon: 14 fixtures × 3 mutants → 29 exercised, 13 skipped; 16
  fixtures × 3 → 33 exercised, 15 skipped. The suite-level `skipped` number IS
  this walker's, so every reading of the suite's skip count is really a reading
  of this instrument's coverage.
  **Why it matters rather than being housekeeping:** a mutation walker's whole
  claim is that the fixtures would go red under corruption, and a skipped
  mutant is a claim not made. At ~31% the instrument's green is a statement
  about two thirds of what it appears to cover, and the skip REASONS are not
  printed, so no reader can tell an inapplicable mutant from a silently
  degraded one. The scaling is linear in fixture count (~1 skip per fixture),
  which is what makes it look like a constant rather than a gap.
  **Design, decided:** the walker prints a per-mutant disposition — exercised,
  or skipped WITH its reason — and the suite's skip line names this walker as
  its source so the number stops reading as a test-runner skip.
  Loop stage: SEE (the instrument's own coverage).
  Anchor: the `fixture-verdict-identity` walker
  Write-set: the walker's test file
  Verifier: a fixture known to be inapplicable to one mutant reports that
  mutant skipped WITH the reason, and a fixture applicable to all three reports
  zero skips — the pair, so the reason field is shown to discriminate rather
  than to be populated.
  <!-- entry: "fixture-verdict-identity skips ~31% of mutant walks with no reason printed" -->

- **RECORD 2026-08-20 (found by answering an operator question against the
  carrier rather than from memory) — the one READY MITIGATE-stage entry in the
  scheduled head names missing evidence and two open design questions, which is
  the PARKED definition.** The entry is "the preload residue is reachable:
  deferred MCP names are known at session start". Its body carries "NAMED
  MISSING EVIDENCE ... what share of the residue is configured-server deferred
  loads versus genuinely unpredictable arrivals", and then "Two design
  questions the measurement feeds" — the seed set's scope, and per-project MCP
  schema differences. READY promises a fresh context could execute the entry
  without making a design decision; this one requires two.
  **NOT re-graded here, deliberately:** head membership is DERIVED at build
  time, never edited in place by the session that noticed. This is the
  observation the next derivation reads.
  **The unblocking step is cheap and already specified in the entry itself:** a
  corpus pass over the captures' `deferred-tool-events` files grouping
  `newNames` by whether the name's server was in that session's config at its
  first request. That measurement answers both design questions, so running it
  converts the entry rather than re-designing it.
  Loop stage: MITIGATE (blocked on its own named measurement).
  Anchor: `BACKLOG.md`, the preload-residue entry
  Write-set: none — a grading observation for the next build-order derivation.
  <!-- entry: "the head's one READY mitigation names missing evidence and two open design questions" -->

- **RECORD 2026-08-20 (found while reconciling a number that did not add up —
  the event billed 110k tokens and the ledger priced it at 35 kB) — THE FIRE
  LEDGER PRICES CACHE LOSS WITH A METRIC THAT UNDERSTATES THE MID-HISTORY
  CLASS BY ROUGHLY AN ORDER OF MAGNITUDE, AND ONLY THAT CLASS.**
  `summariseFireBytes` reads `rebilledBytes` / `savedBytes`, which are
  divergence-based. `replay.mjs` already carries `rebilledBreakpointBytes` /
  `savedBreakpointBytes` — added because the divergence model "understates the
  mid-history case", in the file's own words — under their own names, and
  nothing consumes them.
  **Ground truth, from the capture's OWN usage records rather than any replay
  estimate** (capture holding the 09:11 bust, 546 requests): the busting
  request billed `cacheCreation` **110,022** with `cacheRead` collapsing
  126,671 -> 20,623; the six requests before it billed 1,108 / 940 / 758 /
  1,826 / 1,128 / 2,410 while reading 120k-126k from cache; the requests after
  recover to 5,857 / 1,652 / 275 with cacheRead back above 130k. Median
  `cacheCreation` across all 546 requests excluding the bust: **1,196**. So the
  single event's excess is **~108,826 tokens — about 91 normal requests.** The
  ledger's figure for the same event is 35,192 bytes.
  **Why this is worse than a wrong number: it is a BIASED COMPARISON.** Tail
  growth is priced correctly by the divergence model (the breakpoint collapses
  onto the divergence there, per the file's own comment), so every deep-vs-tail
  cost comparison drawn from these fields sets an accurate number against an
  understated one, in the direction that makes the expensive class look cheap.
  Today's own bucket table has this bias in it and says so.
  **The measurement that ends the ambiguity, and it is cheap:** the captures
  carry per-request `usage` (`cacheCreation`, `cacheRead`, `ephemeral1h`,
  `ephemeral5m`). Pricing from the running system's own billing beats
  reconstructing it — the altitude rule, applied to money. That is a different
  and better instrument than switching to the breakpoint twin.
  Loop stage: SEE (the ledger's own unit).
  Anchor: `tools/gate-live.mjs` (`summariseFireBytes`)
  Write-set: `tools/gate-live.mjs`, `tools/replay.mjs` — HELD at the desk, not
  in the peer lane: it changes numbers the daily sweep reports and interacts
  with the sweep's booked history-carrier defect.
  Verifier: the 09:11 pair must price at ~108,826 excess tokens against the
  546-request median, and a neighbouring tail-growth pair from the same capture
  must price near its own median — the pair, from the corpus, neither
  constructed.
  <!-- entry: "fire ledger prices with a metric that understates mid-history by ~12x; price from capture usage records" -->

- **RECORD 2026-08-20 (surfaced by dispositioning a risen skip count, which is
  the only reason anyone looked) — the row-pin mutation arm that proves the
  check can go RED runs on 1 of 14 fixtures, and its skip count tracks FIXTURE
  POPULATION rather than health, so it will rise forever and means nothing.**
  Measured on today's full run: `(2) SKIP:` 13, `(2) ran` 1 — the single
  exercising fixture is `pinned-s-4b6a435234bf-26-28.json`. The skip reason is
  computed per fixture from its own bytes ("first request carries no full
  `<system-reminder>` block — the mutation would be a no-op"), so this is a
  SELF-VERIFYING exemption and not a blanket skip; that half is correct and is
  not the finding.
  **Two things that are.** (1) One positive certifies the CLASS that fired,
  which is real but thin: the arm's reach over the pin population is 7%, and
  nothing says whether the 13 non-exercising fixtures differ from the one in
  any way that matters. (2) The COUNT is a decoy. It moved 12 -> 13 today
  purely because harvest added a fixture (1,057 rowpin files on disk against
  995 tracked), so a reader applying the standing rule "a risen skip count is
  a finding" gets a true alarm about nothing, every time the corpus grows —
  the check-that-fires-on-a-non-defect shape, arriving through a metric rather
  than a predicate.
  **Named missing evidence, and it is a design question rather than a
  measurement:** what the arm should assert for a fixture whose first request
  cannot carry the mutation. Skipping is honest; a fixture-count-proportional
  skip stream is not readable. The candidate shape is the one this repo
  already uses elsewhere — report the exemption as a DECLARED population with
  its own count ("13 of 14 fixtures cannot exercise arm 2, by construction")
  rather than as 13 individual skips, so the number a reader sees is the
  reach, not the population.
  Loop stage: VERIFY (instrument reach, and a metric that misreports it).
  Anchor: `test/gate-live-rowpins.test.mjs`
  Write-set: `test/gate-live-rowpins.test.mjs`
  <!-- entry: "rowpin mutation arm exercises 1 of 14 and its skip count tracks population" -->

- **RECORD 2026-08-20 (the diagnosis half SHIPPED and its closure is in
  `BACKLOG-DONE.md`; what stays open is one unread number) — are the 21
  byte-gate MISMATCHes the known WRAPPER-RETAINED mechanism, or genuine holes
  in the rule?** The status file could not answer this until today: it carried
  `MISMATCH: 21` with no denominator and no class, because `summariseCensus`
  dropped `considered`, `total` and `mismatchSubs`. That is fixed and pushed,
  so the question is now answerable by reading, not by a walk.
  **Trigger, and it needs no session to remember it:** after the next
  `gate-live` sweep, read `byteGate.mismatchSubs` in
  `~/.local/state/cache-fix/gate-status.json`. All counts in
  `WRAPPER-RETAINED-EXACT` / `WRAPPER-RETAINED-EXTENDED` -> the known class
  measured 2026-08-14 (`reminder-migration-census.mjs:237`), no action, close
  this entry. Any `UNRELATED` -> real holes in the row-4 rule, and THAT is a
  finding that mints its own entry with the rows attached.
  **Why this is not a walk:** the corpus-wide sweep already runs daily and now
  writes the answer into its own status file. A session re-running the census
  by hand would pay the whole corpus pass to learn what tomorrow's sweep
  reports for free — the recurring-producer clause (`docs/dev-loop.md`,
  closing gate question 2) satisfied in the machinery rather than by hand.
  Loop stage: ATTRIBUTE (which class the 21 rows belong to).
  Anchor: `tools/reminder-migration-census.mjs`
  Write-set: none until the number is read — this entry is a scheduled READ,
  and the write it may produce is a new entry, not an edit to this one
  <!-- entry: "are the 21 byteGate mismatches wrapper-retained or real holes" -->

- **RECORD 2026-08-20 (SUPERSEDED — the diagnosis in this body is WRONG and it
  is kept only so the misreading stays legible; the correction and the fix are
  in `BACKLOG-DONE.md`) — the daily gate's byte-match tally reads `MISMATCH=21`
  while EXACT, EXTENDED and DROPPED are ALL ZERO, and that distribution was
  read as indicting the INSTRUMENT rather than the corpus.** Read from the
  gate's own status file
  (`~/.local/state/cache-fix/gate-status.json`, `ok: true`, 30 captures):
  `byteGate.tally = {EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 21}` with
  `errors: 0, unreadable: 0`.
  **Why the ZEROES are the finding and the 21 is not.** The census classifies
  every candidate row into one of the four buckets. A healthy corpus of 30
  live captures is overwhelmingly EXACT — that is what "the canonical rule
  reproduces what CC emits" looks like. Zero EXACT across the whole corpus is
  not a corpus in which every row diverges; it is a classifier that is not
  reaching the rows it thinks it is. `unreadable: 0` rules out the honest
  third answer, which makes it worse: the tool believes it read everything.
  **This is the third-partition class by construction** (`docs/dev-loop.md`,
  "an instrument that has produced a MEASURED FALSE VERDICT ranks above the
  cost ordering"), and its consumer is named rather than assumed: this is the
  gate every NORMALIZATION design must pass before it ships, so a wrong tally
  here mis-grades the next mitigation's readiness in either direction — a real
  MISMATCH hidden among 21 phantom ones, or a design blocked by a number that
  means nothing. Tier 2 by the partition's own reach ordering (feeds the
  GATES, not event disposition).
  **NAMED MISSING EVIDENCE, and it is one command rather than a design:** the
  per-row detail behind those 21. `tools/reminder-migration-census.mjs` over a
  SINGLE capture, reading which rows classify MISMATCH and against what
  comparand — deliberately not re-run here, because the corpus-wide sweep is
  what the daily gate already does and a second whole-corpus pass would cost
  the session without adding a row-level read. The discriminator is stated in
  advance so the next session cannot rationalize either way: if the MISMATCH
  rows carry real diverging bytes, the instrument is fine and 21 live
  divergences are a genuine finding; if they carry empty, absent or
  wrong-namespace comparands, the classifier is broken and the number is
  noise. A THIRD outcome is possible and is the one to watch for — the rule
  under test legitimately matches nothing in the current corpus, in which case
  EXACT=0 is correct and the reporting is what misleads.
  **Do NOT read `ok: true` as disagreement with this entry.** The gate's own
  green covers its four replay invariants; the byte tally rides alongside and
  is not what sets `ok`. The dotfiles doctor is the only reader that surfaces
  it today, which is why this arrived by operator relay from another desk
  rather than from anything in this repo.
  **Corroboration this same read supplied, recorded because it closes a
  question rather than opening one:** `duplicates.coalesceMissRequests: 0` and
  `coalesceMissStreaks: 0` in the same file — the gate's own record agrees
  with the independent grep over the capture window, so the parked coalesce
  window-clock mitigation's re-grade trigger has NOT fired, now measured twice
  from two sources.
  Loop stage: VERIFY (an instrument feeding the gates, with a suspect tally).
  Anchor: `tools/reminder-migration-census.mjs`
  Write-set: `tools/reminder-migration-census.mjs`, `test/reminder-migration-census.test.mjs`
  Verifier: the per-row read above on one capture, then a bite pinning
  whichever of the three outcomes it returns — red-first against today's
  all-zero-but-MISMATCH shape
  <!-- entry: "byteGate tally is all-zero except MISMATCH, which indicts the classifier" -->

- **PARKED 2026-08-20 (POINTER — the fix site is `dotfiles git/hooks/pre-push`,
  not this repo) — the unbooked-subagent push lane resolves bookings through a
  hardcoded carrier list and so cannot see this repo's DECLARED closure home,
  which makes it block the very push that carries the booking.** Measured
  today, not reasoned: `RECORD_PFADE = ("LEDGER.md", "claude/JOURNAL.md",
  "BACKLOG.md")` at `git/hooks/pre-push:812`, and `git push origin main` with
  both 08-19 SHAs booked in `BACKLOG-DONE.md` returns `Push BLOCKIERT —
  ungebuchte Subagent-Commits` naming `0ba6e45` and `208b121`. The booking
  exists and is correct; the reader looks in a file the declaration does not
  point at.
  **This is the FOURTH consumer of the same class**, and the other three are
  already booked in the dotfiles carrier (the `backlog-close` mover, the
  retirement tripwire's FILE-kind blindness, and the closure-home lane's own
  residual). The fix is the same shape as the change that closed the first
  three and is recorded in `BACKLOG-DONE.md`'s 2026-08-19 entry: derive the
  home through the `Closure-home:` declaration, never restate it. `pre-push`
  already imports `subagent-commit-mark.py` for the mark rule, so importing a
  resolver is the established idiom in that file rather than a new one.
  **Why this entry is HERE and not in the dotfiles backlog, named so it is not
  read as the wrong home:** the realizing write is in dotfiles, whose
  `BACKLOG.md` was held by another desk's live lane at booking time (one writer
  per working copy). The obligation stays with THIS desk — it is not discharged
  by naming the other repo, and the check that reveals it is a `grep -n
  RECORD_PFADE` in `dotfiles git/hooks/pre-push` returning a literal tuple.
  Migrate the body there when that copy frees; until then this is the carrier
  on the read path.
  **Operational consequence, stated NARROWLY because the first draft of this
  line overstated it and was corrected the same hour by running the push
  instead of predicting it.** It does NOT follow that such a push needs
  `PUSH_UNBOOKED_SUBAGENT_OK=1`. The gate's booking test is a substring match
  for the 7-char SHA anywhere in the carriers it reads, so any entry that
  CITES the SHA satisfies it — and this very entry does, having quoted both
  SHAs above as its own measurement evidence. That is what let `efdac38` push
  cleanly with no override. The defect is therefore narrower and quieter than
  "pushes are blocked": a closure whose SHA appears ONLY in the declared home,
  with no citation anywhere in `BACKLOG.md`, is invisible to the lane — which
  is the normal shape once the archive stops being cited from the live file,
  i.e. it gets WORSE as the split does its job. The override remains the
  gate's own named exit for "booked and intended" if it ever does block; it is
  audit-visible by design and every use is one the fix removes.
  Loop stage: none (process instrument in the sibling repo; surfaced under the
  trajectory test as tooling that gates this repo's own closures).
  Anchor: `BACKLOG-DONE.md`
  Write-set: `dotfiles git/hooks/pre-push` — ANOTHER REPO, and another desk's
  working copy; not dispatchable from here while that lane is open
  Verifier: `python3 dotfiles/claude/hooks/../../git/hooks/pre-push --test` plus
  a red-first arm — a carrier declaring a FILE-kind home, with a SHA booked only
  in that file, must pass where it blocks today
  <!-- entry: "pre-push booking lane cannot see a declared closure home" -->

- **READY 2026-08-19 (midday, found by the co-writer census that the dispatch
  discipline demands before a dispatch — not by anything watching) — 25 agent
  worktrees and 55 lane branches are registered in this repo with no reader,
  and 14 commits in them have no counterpart in `main`.** The harness's native
  worktree isolation registers each dispatch lane under
  `.claude/worktrees/agent-<id>` with a branch `worktree-agent-<id>`, and
  nothing removes either. `git worktree list` shows 25 live registrations, all
  directories still present; `git branch --list 'worktree-agent-*'` shows 55
  branches, 50 of which carry commits not reachable from `main`.
  **The alarming number is NOT the finding, and the discriminating probe is why
  — run it before believing any count here.** `git rev-list --count main..<b>`
  totals 105 unreachable commits, which reads as lost work and mostly is not:
  integration is by `cherry-pick`, which rewrites the hash while preserving the
  patch-id. `git cherry main <b>` separates the two: **77 commits come back `-`
  (content IS in `main` under another hash — correctly integrated, the branch is
  litter) and 14 come back `+` (patch-id found nowhere in `main`)**. Fourteen is
  an UPPER BOUND on unlanded work, not a count of it: a commit whose content was
  adjusted during integration also lands `+`.
  **Why this is a carrier-registration failure and not housekeeping** (the
  closing gate's question 4): a branch is a carrier, worktree registrations live
  in `.git/worktrees/` where no repo-level check looks, and `git status` plus
  `git log origin/main..main` both read clean over all of it. `docs/dev-loop.md`
  already records this exact class once — "thirty-three commits sat in lane
  branches while `git status`, `git log origin/main..main` and a handoff all read
  clean" — so this is the SECOND occurrence, at roughly triple the size, and it
  was found the same way both times: by a human looking, not by a mechanism.
  Design, two parts, and the first is the one that matters:
  (1) a `tools/` check that reports lane branches carrying `+` commits, keyed on
  `git cherry` rather than on reachability — reachability is the count that cries
  wolf, and a check that cries wolf trains its reader to ignore it;
  (2) a lane-worktree exit: after a lane's report is booked, its worktree is
  removed and its branch deleted ONLY once `git cherry` reports no `+`.
  Removal is terminal (it closes the agent's resume channel), so the exit runs
  at booking-plus-interrogation, never at booking.
  Red-first: the 14 `+` commits present today must be REPORTED by the new check,
  and a branch whose commits are all `-` must NOT be — without that second arm
  the check is indistinguishable from one that reports every lane branch.
  Loop stage: VERIFY (state that outlives its run with nobody scheduled to look).
  Anchor rationale: no tool owns this class yet; the anchor is the carrier that
  already records its FIRST occurrence, so a change there is what would signal
  the premise moved.
  Anchor: `docs/dev-loop.md`
  Write-set: `tools/lane-branch-residue.mjs` (NEW), `test/lane-branch-residue.test.mjs` (NEW)
  Verifier: both arms of the red-first pair above, run against this repo's real
  branch set
  <!-- entry: "lane worktrees and branches accumulate with no reader" -->

- **READY 2026-08-19 (morning, minted by a LIVE 138k bust the operator
  reported; threat-matrix row 32) — the census has no class for CC evicting
  IMAGE payloads from already-sent messages, so the rate and the TRIGGER of a
  measured bust class are both unknown.** Hand-derived this morning on capture
  `s-captureBW`: between two adjacent same-conversation requests the whole-array
  image count went **26 -> 0** (messages 18, 42, 51, 74) and the body collapsed
  **7,186,192 -> 402,596 bytes**, while the message count GREW 82 -> 85 and the
  surrounding `tool_result` text stayed byte-identical. Divergence lands at the
  earliest stripped message and re-bills everything after it. That whole read
  was four ad-hoc `jq` probes against a format this repo writes, which is two
  past the dev-loop's own stop-count — the tool that should have answered it is
  `replay.mjs --census`, and it does not have the class.
  Design: `censusPair` gains an image-eviction classification (per-message and
  whole-array image-block counts across the pair, plus the body-size delta), so
  the next instance is RECOGNIZED rather than re-derived; then the corpus sweep
  answers the two questions row 32 records as unestablished — the RATE (the row
  has no denominator, n=1) and CC's TRIGGER, which is the blocking design input
  for any mitigation. A 7.2 MB body is well inside the 32 MB wire limit, so a
  size cap is a hypothesis, not the finding; turn-age and tool-result age are
  equally unrefuted, and the sweep discriminates them by correlating each
  eviction against the body size, the turn distance and the age of the stripped
  `tool_result` at the moment it went.
  Red-first: the frozen pair under `~/.local/share/cache-fix/bust-evidence/`
  `2026-08-19/` must classify as image-eviction, and an adjacent pair from the
  same capture with images intact on both sides must NOT — the pair is what
  makes the classifier discriminating rather than merely firing.
  Loop stage: SEE (a bust class the instruments cannot name).
  Anchor: `tools/replay.mjs`
  Write-set: `tools/replay.mjs`, `test/census-image-eviction.test.mjs`
  Verifier: the red-first pair above, plus a corpus run reporting a non-zero
  eviction count with its trigger correlation printed
  <!-- entry: "census has no class for CC image-payload eviction" -->

- **READY 2026-08-19 (morning, found by the same bust walk) — `bust-triage`
  maps the census class `replace/edit` FLATLY to matrix row 4, so a mechanism
  row 4 does not cover is returned as KNOWN-OPEN and the walk ends.** Measured
  on the 2026-08-19T08:42:48Z event: the verdict read `KNOWN-OPEN, matrix row 4
  (OPEN)` while the tool's OWN `migration` step in the same output read *no
  reminder container migration in this pair* — row 4's mechanism is the
  container migration, and it was absent. The `edit-anchor` step WARNed in the
  same output. Neither line reaches the verdict.
  **Why this outranks its own size:** the runbook binds KNOWN-OPEN as a
  stop-here unless a brief names the row, precisely so sessions stop
  re-investigating accepted classes. A flat class->row mapping therefore does
  not merely mislabel — it BURIES a new class inside a known one and ends the
  walk that would have found it. Row 32 exists only because the row's status
  text was read against the pair by hand. This is a measured false verdict
  feeding EVENT DISPOSITION, i.e. tier 1 of the ranking rubric's third
  partition (nothing downstream recovers a mis-filed class).
  Design: `classToRow` stops answering from the census class alone. Where the
  row it would return names a MECHANISM the pair's own evidence contradicts —
  row 4 with no container migration is the measured case — the verdict is
  UNCLASSIFIED, not KNOWN-OPEN. Prefer failing loudly: an unknown that fails
  loudly catches what a silent exemption hides.
  Red-first: the 08:42:48Z pair, frozen, must return UNCLASSIFIED under the fix
  and KNOWN-OPEN row 4 under today's code; a genuine row-4 pair (any of the
  four instances the row already records) must still return KNOWN-OPEN row 4 —
  without that second arm the fix is indistinguishable from disabling the row.
  Loop stage: ATTRIBUTE (the instrument that assigns the class).
  Anchor: `tools/bust-triage.mjs`
  Write-set: `tools/bust-triage.mjs`, `test/bust-triage-classtorow.test.mjs`
  Verifier: both arms of the red-first pair above
  <!-- entry: "bust-triage classToRow maps replace/edit flatly to row 4" -->

- **PARKED 2026-08-19 (morning) — a proxy-side image normalization would absorb
  row 32, and it is NOT information-preserving, which is why it is parked and
  not booked ready.** The mechanism is available and mostly built: if the proxy
  replaced image payloads with a stable placeholder unconditionally, CC's own
  eviction would change no forwarded bytes and the class would stop busting.
  `image-strip` already carries the `PLACEHOLDER` constant and the eviction
  ordering to do it.
  **Named missing evidence, both halves, and neither is a formality.** (1) CC's
  eviction TRIGGER — the entry above measures it; without it a proxy-side strip
  either fires far earlier than CC's and pays fidelity for nothing, or fires
  later and absorbs nothing. (2) An OPERATOR DECISION on the fidelity trade:
  unlike the row-1 and row-4 serialization rules, this one removes what the
  model reads in the window between our strip and CC's, and this repo's
  standing stance is that safety outranks cache. Recommendation attached, as
  the deferral convention requires: build it gated OFF behind an env flag once
  the trigger is measured, so the arm exists and the operator flips it.
  **Standing state this walk exposed, needing no build:** `image-strip` is
  enabled in `extensions.json` at order 150 while the running proxy has NONE of
  `CACHE_FIX_IMAGE_KEEP_LAST` / `_MAX_DIM` / `_GUARD` set (read from
  `/proc/<MainPID>/environ`, positive control: 14 other `CACHE_FIX_*` vars
  present). Whether that is deliberate is the operator's to say; it is recorded
  here so the next session does not read the extension's presence as coverage.
  Loop stage: MITIGATE.
  Anchor: `proxy/extensions/image-strip.mjs`
  Write-set: `proxy/extensions/image-strip.mjs` — deployment-coupled (pin bump
  + restart at a session boundary), and gated, so the row-3 declaration applies
  only if state keys move, which this design does not touch
  <!-- entry: "proxy-side image normalization for row 32" -->



- **READY 2026-08-18 (night, operator question: does the sweep have to cost
  this much) — the daily gate re-walks the WHOLE corpus every run and its
  PARENT process is uncapped. Runtime is LINEAR and healthy today; the
  memory half is the live concern and the runtime half is a trajectory, not
  a present defect.** Measured off the status file's own stamps rather than
  assumed: this run **26.1 min over 30 captures (0.87 min/capture)** against
  the afternoon's **16.1 min over 18 (0.89 min/capture)**. Per-capture cost
  is FLAT — the sweep is not degrading, it is doing proportionally more work
  on a corpus that grew from 18 captures to 30 / 12 GB in a day.
  **A CORRECTION TO THIS ENTRY'S FIRST VERSION, kept because the shape
  recurs:** it was booked claiming the run was "still running at 50 minutes"
  and overdue. That was an assumed elapsed time — nobody read a clock, and
  the session had asserted 38 and then 50 minutes from feel while the run
  actually took 26. The operator caught it. The instrument was available the
  whole time (`started` and `finished` in the status file), and the entry it
  produced overstated a real-but-mild finding into a failing one.
  Parent RSS climbed 4.3 -> 5.9 -> 8.1 GB across the run (peak 8.3),
  monotonically, which is accumulation rather than streaming — the parent
  retains per-streak rows for every capture and never releases them. That
  half stands unqualified: it is measured, it is unbounded, and unlike the
  runtime it has no linear headroom argument.
  **The heap cap does not cover this, and the note saying it does is reading
  the wrong half:** `tools/gate-live.mjs:138` `export const
  CHILD_HEAP_CAP_MB = 2048;` caps the replay and census CHILDREN,
  deliberately, as a check rather than a tuning knob. The parent has no cap in the unit either — no `MemoryMax`, no
  `NODE_OPTIONS` (`systemctl --user cat cache-fix-gate`). `CLAUDE.local.md`
  calls the sweep "heap-capped", which is TRUE of the children and silent
  about the parent; that line wants a word.
  **Two independent fixes, and they are not alternatives:**
  (1) INCREMENTALITY. The sweep already computes a per-capture code stamp
  (33 references in `gate-live.mjs`) but nothing skips on it and there is no
  `--since` / `--incremental` flag (0 hits). A capture already verified at
  the current code fingerprint does not need replaying. This is the runtime
  fix and it is the one that stops the trend.
  (2) A PARENT BOUND. Retained rows are what grow; either stream them to the
  status file per capture or cap what is held. This is the memory fix.
  **Why it still matters at a flat per-capture cost:** the unit is on a
  twice-daily timer, so linear growth has a crossing point — a run that
  outgrows its own interval silently stops being a daily sweep, and that
  failure is a NON-EVENT: no red, just an older verdict than anyone thinks.
  Nothing alarms on sweep duration today. At 0.87 min/capture the interval
  is not close, so this is a watch-and-design item, not a repair. The cheap
  first move is the alarm, not the incrementality.
  Loop stage: VERIFY (instrument economics; the sweep produces the third of
  the ship runbook's three answers, so its health is load-bearing for every
  ship).
  Anchor: `tools/gate-live.mjs`
  Write-set: `tools/gate-live.mjs`, `test/gate-live-rowpins.test.mjs`
  Verifier: a second consecutive sweep over an unchanged corpus completes in
  a small fraction of the first, and parent peak RSS stops tracking capture
  count; both read off the run rather than argued
  <!-- entry: "daily gate re-walks the whole corpus and its parent is uncapped" -->

- **READY 2026-08-18 (night, and it is an OOM finding this session CREATED) —
  the replay children's heap cap is a constant sitting beside the ceiling it
  was sized against, so tonight's ceiling raise silently cut its headroom
  from 1.67x to 1.11x.** `tools/gate-live.mjs:138` `export const
  CHILD_HEAP_CAP_MB = 2048;` is deliberately a REGRESSION DETECTOR, not a
  tuning knob — its own comment records it proven red on the real defect (the
  pre-`8b7ed9e` replay OOMs under it in 5 s on the 1.5 GB capture; the fixed
  one finishes with headroom). The sizing argument is written there too: a
  streaming replay needs ~15% of capture bytes, "~1.2 GB projected at the
  8 GB rotation ceiling".
  **The ceiling is no longer 8 GB.** `CACHE_FIX_CAPTURE_MAX_MB` reads 12288
  on the live proxy — raised from 8192 earlier this same session as a named
  bridge. At 15%, projected child peak moves 1229 MB -> 1843 MB against the
  unchanged 2048 MB cap: **1.67x headroom -> 1.11x**. Nothing failed, and
  nothing would have said anything until a legitimately large capture tripped
  a check whose whole value is that it only fires on regressions. That is the
  over-firing shape: a detector that starts firing on healthy input trains the
  reader to discount it, and this one is load-bearing.
  **The defect is the COUPLING, not the number.** A constant beside the
  quantity it is derived from cannot age loudly — the same restated-basis
  shape as a hand-kept index beside its directory. Derive the cap from the
  live ceiling (`ceiling x 0.15 x safety`), or assert the ratio in a bite so
  moving either one goes red. Do NOT simply raise 2048: that discards the
  detector's calibration and is the tuning-knob reading its own comment
  forbids.
  Loop stage: VERIFY (an instrument whose calibration silently drifted).
  Anchor: `tools/gate-live.mjs`
  Write-set: `tools/gate-live.mjs`, `test/gate-live-rowpins.test.mjs`
  Verifier: with the ceiling moved in a fixture, the derived cap moves with
  it and a pinned ratio assertion goes red when it does not
  <!-- entry: "child heap cap decoupled from the rotation ceiling it was sized against" -->

- **PARKED 2026-08-18 (night, operator question: do the captures have to be so
  big — and the answer is that SIZE is not the problem here) — the capture
  store keeps roughly 271 bytes for every byte of novel conversation, because
  every request re-sends the whole conversation and each one is stored in
  full.**
  **PARKED, not ready, and the operator's constraint is why:** disk on this
  machine is not scarce, so nothing valuable gets pruned to save space. That
  removes the entire storage justification this entry was first booked under.
  What remains is only the part that touches PERFORMANCE and OOM: capture
  bytes drive the replay children's memory at ~15%, so capture size is an
  input to the entry above rather than a problem in itself. Missing evidence
  before this becomes ready: a measurement showing capture SIZE (rather than
  capture COUNT) is what drives sweep cost or memory — today the sweep is
  flat at 0.87 min/capture and children sit far under their cap, so neither
  is in evidence.
  **Read the risk before reviving it:** byte-level fidelity IS the evidence
  base — attribution rests on comparing forwarded bytes — so a
  content-addressed rewrite would put every reader behind a reconstruction
  layer, and a subtly lossy one would corrupt the evidence quietly rather
  than fail loudly. A two-orders-of-magnitude saving on a resource that is
  not scarce does not buy that risk. The measurement below is kept because it
  is real and was expensive to get, not because it justifies the change. Measured over a 315 MB sample of the largest live
  capture: 562 whole records, median 516 KB, largest single record 1.16 MB,
  total 313 MB — a stored-to-largest ratio of ~271:1. Record sizes grow
  monotonically through a session (186 -> 191 -> 194 -> 211 KB across four
  consecutive requests), which is the conversation prefix accumulating.
  Store today: **12 GB across 30 captures**, largest single capture 2.5 GB.
  **Two instrument notes, because the obvious measurements both mislead:**
  gzip over the file reports only 2.2:1, and cannot do better — its window is
  32 KB while the repetition is at 100 KB+ range, so a low ratio there is
  evidence of nothing. And a common-PREFIX comparison between consecutive
  records reads 0.0%, also misleading: records alternate request/outcome, and
  two request records differ in their opening bytes (timestamps, ids) even
  when their bodies are near-identical. Prefix is the wrong operator; the
  size distribution is what carries the finding.
  **The one argument that survives the operator's constraint, and it is not
  about disk:** the retention sweep evicts oldest-first on a size cap, so
  capture size sets how far back evidence survives — the rotation clock the
  closing gate's question 2 exists for. But where disk is cheap the direct
  answer is to RAISE the ceiling, which was already done tonight, and the
  entry above is what that raise cost. So even the evidence-window argument
  routes through the cap-coupling fix first, not through a storage rewrite.
  Loop stage: SEE (the cost is measured; nothing justifies the design yet).
  Anchor: `proxy/extensions/request-capture.mjs`
  Write-set: `proxy/extensions/request-capture.mjs`, `tools/logs.mjs`
  Verifier: a reconstructed capture is byte-identical to the original across
  the whole corpus — the red-first arm being a deliberately corrupted block
  that must fail the comparison
  <!-- entry: "captures store ~271:1 against novel content; content-addressed blocks" -->

- **READY 2026-08-18 (night, found by the pre-push suite going red on an
  unrelated commit) — the runbook marker checker CONFIRMS a claim from the
  claim's own disposition keyword, so one ordinary entry can silence every
  stale marker at once.** `checkMarkers` asks `findMatchingPhrase` whether any
  distinctive BIGRAM of the marker body appears in the ready-entry text. The
  marker bodies end in their own disposition phrase, and that phrase survives
  into the bigram set — so it is matched against a file where those same two
  words occur in ordinary prose. The match is then tautological: the marker is
  confirmed by the words it used to declare itself, not by the entry it claims
  exists.
  **Measured tonight, and this is the red-first arrangement:** with a new entry
  added that happened to contain those two words adjacently in unrelated prose,
  real STALE markers went 5 -> 0. Restoring the wording restored 5. The five
  markers were never resolved; the checker simply stopped seeing them, and the
  test that guards this only fails because it asserts staleness must be found —
  had it asserted the opposite, the silencing would have read as success.
  Fix: drop each marker's own disposition phrase from its distinctive-bigram
  set before matching, so confirmation can only come from content naming the
  actual work. The bite is the case above: the entry text plus the five
  markers, frozen as a fixture, must classify all five STALE.
  Loop stage: VERIFY (instrument defect; the same tool was corrected once
  already this week for confirming claims from PARKED and DONE entries — this
  is a second, independent hole in the same confirmation path).
  Anchor: `tools/named-unbooked-scan.mjs`
  Write-set: `tools/named-unbooked-scan.mjs`, `test/runbook-lane-index.test.mjs`
  Verifier: the frozen fixture classifies all five markers STALE, and the same
  predicate goes green on a marker whose named work genuinely has an entry
  <!-- entry: "runbook marker checker confirms from the disposition keyword" -->

- **READY 2026-08-18 (night) — `state-report` answers most of a session's
  intake already; four collectors close the rest, and the ninth script that
  was proposed instead is withdrawn.** A session-intake script was proposed
  this evening on the premise that a session's opening spends ~90-95k on
  mechanical facts. Both halves of that premise failed. The token half was
  refuted by re-measurement (see the instrument note below). The redundancy
  half was found by a read-only discovery lane: `tools/state-report.mjs`
  ALREADY aggregates the threat-matrix status counts and OPEN/RESIDUAL rows,
  the head of this file's ready set, the gate-live verdict subset, the git-tree pin
  against the dotfiles manifest, the content fingerprint against live
  `/health`, protected-capture bytes, repo hygiene and lane-branch commit
  counts — via pure `collect*()` functions feeding one text/`--json`
  renderer, importing `matrix-status.mjs`, `backlog-lint.mjs`,
  `gate-live.mjs`, `alias-claim.mjs` and `proxy/source-fingerprint.mjs`
  rather than re-deriving their invariants. Measured: 45 lines, 2.39 s.
  **The four genuine gaps**, each a collector in the existing pattern
  (`{ok, ...}` or `{ok:false, reason}`, one renderer line, one `--json` key):
  (1) the full `/health` gate and extension listing — the fingerprint
  collector already fetches `/health` but extracts only `proxy_tree`;
  (2) `shape-verdicts.mjs` output, currently uncovered;
  (3) test-suite last-run state — tail of the newest file in
  `~/.local/state/cache-fix/test-runs/`;
  (4) raw capture-store size — `~/.local/share/cache-fix/captures`; only the
  protected sibling directory is measured today.
  Loop stage: VERIFY (this is instrument coverage, not a mitigation).
  Anchor: `tools/state-report.mjs`
  Write-set: `tools/state-report.mjs`
  Verifier: `node tools/state-report.mjs` and `--json` both emit the four new keys and the serving-gate lint stays green; done when a session answers all eight intake facts from one command
  <!-- entry: "state-report gains four collectors; the ninth intake script is withdrawn" -->
  The realizing site is `collectAll()`/`renderText()` in that file — no new file.
  **Do NOT re-propose a separate intake script without first re-reading this
  entry** — the discovery lane's full fact-by-fact mechanics (sources, keys,
  costs, side-effect checks) are preserved with the decomposition record in
  dotfiles `claude/records/transcript-decomposition-2026-08-18*`; the
  session scratchpad they were written in is not a carrier and will rotate.
  **Instrument note, the reusable part:** the ~90-95k premise came from a
  transcript analysis that deduped by API message id keeping the FIRST record
  per id. Streaming splits one message across partials and the `tool_use`
  blocks sit in the LATER ones — measured 236 of 354 blocks discarded, so the
  instrument saw a third of the session's tool calls and reported the rest as
  absent. It never went red, because a dropped call and a call that never
  happened look identical. Any future transcript tooling here inherits this
  the moment it dedupes that way. Full mechanism and the three instruments:
  the dotfiles record above; corpus JOURNAL 2026-08-18 carries it too.

- **READY 2026-08-18 (evening, minted by a LIVE bust while the session was
  designing the next mitigation) — the preload's named residue is NOT
  unreachable: the mid-session tools[] additions that bust are DEFERRED MCP
  tools whose names this machine already knows at session start.** The
  preload entry states the opposite as settled — "the residue is mid-session MCP
  arrivals that NO session-start mechanism can reach" — and tonight's 431k bust
  is the case that refutes it, measured rather than argued.
  **The event, walked to a disposition (`bust-triage`, 2026-08-18T15:56:17Z,
  capture `s-captureBV`, protected):** VERDICT KNOWN-OPEN against matrix row 6,
  ATTRIBUTION **CC's** — computed, not inherited: CC's own raw bytes diverged at
  index 648 and the replayed census recorded no stability violation for the
  pair. At the bust instant `deferred-tool-rewrite` classified `rewrite` with
  **eight new names, every one `mcp__claude-in-chrome__*`** (computer, find,
  navigate, read_console_messages, read_network_requests, read_page,
  tabs_context_mcp, tabs_create_mcp), announced them, and held the shared-name
  subset 20/20 while the whole array moved 0/20. The extension did exactly what
  it is built to do; the class simply is not covered.
  **Why this is a mitigation lead and not just a bust record.** Those eight
  arrived MID-session (the conversation had been running an hour) because
  ToolSearch loaded them on demand — row 6's own first mechanism, "ToolSearch
  loading deferred tools". But the SERVER was configured at session start, and
  its tool names are already in this machine's learned state: the preload store
  exists and records schemas. A name that is seeded before it arrives is
  classified as KNOWN when it does, the frozen array is forwarded, and `tools[]`
  does not move — which is precisely the mechanism that already ships for
  `SendMessage`.
  **The safety half is ALREADY MEASURED and does not need re-deriving** — today's
  live probe against a throwaway proxy settled it with a fabricated name CC can
  never have registered: the API accepts an unannounced `defer_loading` tool and
  the model answers ABSENT when asked whether it can see or call it, because the
  model's loadable view comes from CC's own listing inside `body.messages`, not
  from `tools[]`. That is the same fence this would rest on.
  **NAMED MISSING EVIDENCE, and it is a population question rather than a design
  one:** what share of the residue is configured-server deferred loads (knowable
  at session start) versus genuinely unpredictable arrivals? The 2026-08-16
  record measured 126 addition events with 103 `SendMessage`; the other 23 have
  never been split by that axis. The measurement is a corpus pass over the
  captures' `deferred-tool-events` files, grouping `newNames` by whether the
  name's server was present in that session's config at its first request —
  cheap, and it decides both the ceiling and whether the seed set is per-machine
  or per-project.
  **Two design questions the measurement feeds, stated so they are not
  re-derived:** whether the seed set is machine-wide or scoped to the servers a
  session actually declares (a machine-wide seed puts tools in the array of
  sessions that will never see them — stable, so not a bust, but it inflates
  every prefix), and how a per-project MCP schema difference is handled, since
  the store is last-writer-wins today.
  Loop stage: MITIGATE.
  Anchor: `proxy/extensions/deferred-tool-rewrite.mjs`
  Write-set: `proxy/extensions/deferred-tool-rewrite.mjs`, `test/deferred-tool-preload.test.mjs`
  Verifier: a replay of `s-captureBV` under the SERVING gate set where the 15:56 pair classifies as a known-name rewrite with `tools[]` unmoved, against today's 8-name addition as the red arm
  <!-- entry: "the preload residue is reachable: deferred MCP names are known at session start" -->

- **RECORD 2026-08-18 — `harvest --pin --bounded` failed to reproduce for the
  THIRD time on a born-large conversation, and its own self-check is what said
  so.** Tonight's 431k bust: `--pin 1791..1795 --bounded` kept 281 of 1796
  records and reported `135 of 281 member ordinal(s) missing or placeholder —
  the fixture is kept but it is NOT evidence for what it was pinned for`. The
  fixture was deleted rather than committed; a 3,422-record artifact that proves
  nothing does not belong in public history.
  **This is the third occurrence and the pattern is now the finding:** born-large
  refusal (2026-08-18 morning), 65 of 174 ordinals missing (2026-08-16), 135 of
  281 tonight. The bounded pin's member-selection cannot follow a conversation
  whose members are interleaved across a long capture, and the tool is honest
  about it every time — which is why this is a booking rather than a bust.
  **What kept the evidence anyway, and it is the reusable half:** the capture was
  PROTECTED (`s-captureBV`) before the pin was attempted, so the raw bytes are
  off the eviction clock regardless. Protection is the freeze that works today;
  the pin is the freeze that is committable, and only the first is currently
  reliable for this shape.
  Consumer: whoever next works `harvest --pin --bounded`, and the parked row-24
  entry whose named missing evidence is a frozen born-large pin.
  Loop stage: SEE.
  Anchor: `tools/harvest.mjs`
  Write-set: `tools/harvest.mjs`, `test/harvest-pin-bounded.test.mjs`
  Verifier: a bounded pin over a born-large capture reproduces its own pair — the self-check that currently refuses
  <!-- entry: "harvest --pin --bounded fails to reproduce on born-large, third occurrence" -->


- **PARKED 2026-08-18 (was READY, promoted the same day; the measurement RAN and returned a SCALE GAP rather than an answer — head #3, formerly riding the
  `--at` lane above — same realizing file, separate red-first arrangements. THE
  LANE MEASURES, IT DOES NOT REPAIR: the streaming-vs-declared-cap decision
  returns to the desk, per this entry's own "only then decide") — `boundary-layers` OOMs at a
  4 GB heap on a live capture and the capture grows quadratically, so the
  instrument's reach shrinks while the events worth walking get bigger.**
  Measured today: `--max-old-space-size=4096` died `FATAL ERROR: Ineffective
  mark-compacts near heap limit` after ~21 s on a 2.83 GB capture and dumped
  core; the same walk completed at `10240`. The same tool had run on the SAME
  capture earlier the same day at 4096, so the failure threshold was crossed by
  roughly 150 MB of growth in one session — this is not a stable margin.
  **Why it ranks BELOW the `--at` defect despite being the louder symptom:**
  signal 3 of the ranking rubric — a core dump cannot be mistaken for an answer,
  while a silently mis-selected conversation already was. It ranks above ordinary
  cost work because the trigger is a clock nobody controls.
  **Design, decided:** the repo already has the shape for this — `gate-live` runs
  every replay child under an explicit `--max-old-space-size` cap, and
  `docs/dev-loop.md`'s "Streams is a claim about a mechanism" section records
  that this capture read was fixed for scale THREE times and was still O(file)
  the third. So: measure `bytesRead` against bytes consumed on a large capture
  before touching anything (the read-lines bite's own question), and only then
  decide between a streaming repair and a declared cap. A raised heap is a
  BRIDGE, named as one here, with its revert trigger being the first streaming
  measurement.
  **NOT established:** whether the retention is in `readLines`, in
  `findPredecessor`'s candidate collection, or in the cascade's own body
  retention. Nothing was profiled; the 4096-vs-10240 split is the only datum.
  **MEASURED 2026-08-18 and it did NOT reproduce — which is a scale gap, not a
  clean bill.** The dispatched lane instrumented `process.memoryUsage()` behind
  a forced GC at each phase boundary and ran the largest protected capture under
  1 GB (846 MB, 2438 request lines): peak `heapUsed` ~11 MB, rss plateau
  ~155 MB, and clean exits at the default cap, at `--max-old-space-size=192`
  AND at `=96`. The reported failure was a 4096 MB cap dying on a 2.83 GB
  capture — over three times this file's size — so a clean result here answers
  "not reproduced at this scale" and never "not present". The instrumentation
  was reverted before any commit; this half produced no code.
  **One hypothesis IS ruled out, on source grounds rather than by the
  inconclusive numbers:** all three `findPredecessor` stages retain exactly ONE
  candidate at a time (`before` / `pick` / `nearest`, each reassigned, never
  pushed to a list), so "the candidate collection accumulates" cannot be the
  retention site. Two of the entry's three named hypotheses remain.
  **NAMED MISSING EVIDENCE, and it is the lane's returned question, not a
  preference:** a capture at or near the 2.83 GB incident scale, or an operator
  decision to build a synthetic fixture long enough to force
  `findPredecessor`'s stage-2/3 fallback at length. The protected set tops out
  at 846 MB today, so the instrument cannot currently be exercised at the scale
  its own defect was reported at — which is a standing gap for any future
  reach measurement here, not only this one.
  Trigger to re-grade: a capture of >2 GB on disk (protected, so it does not
  rotate), or that operator decision.
  Loop stage: ATTRIBUTE
  Anchor: `tools/boundary-layers.mjs`
  Write-set: `tools/boundary-layers.mjs`, `test/boundary-layers.test.mjs`
  Verifier: a bytesRead-vs-consumed assertion on a multi-GB capture, red against the current retention
  <!-- entry: "boundary-layers OOMs at 4GB on a live capture, reach shrinks quadratically" -->

- **READY 2026-08-11 (evening; promoted 2026-08-15, sixth derivation) — `_resetRelocationMemory` cannot evict the memory
  the running pipeline uses, so its name promises an eviction it does not
  perform.** Found by the row-30 eviction lane PROBING the premise before
  building on it, which is the only reason the bite it was building is not
  vacuous. Two independent causes, both confirmed by that lane against the real
  pipeline: (1) `loadExtensions` (`proxy/pipeline.mjs:39`) imports every
  extension through a cache-busted URL (`?t=<counter>`), so a plainly-imported
  `_resetRelocationMemory()` clears a Map belonging to a DIFFERENT module
  instance than the one the pipeline runs — a silent no-op; and (2) even on the
  same instance, `recallMemory()` falls back to disk when RAM is empty, so a
  RAM-only reset is un-evicted by the persisted `*-fresh-sort-relocated.json`.
  **What rested on it: nothing, and that was checked rather than assumed** —
  `git grep _resetRelocationMemory` finds the definition plus the new test and no
  other caller, so no prior conclusion is invalidated. The export was added for
  exactly the purpose it cannot serve, which is why it reads as available.
  **Design (decided):** the helper's doc comment states that it reaches only a
  caller controlling module identity, AND gains a disk-clearing counterpart so
  the two halves of the memory are evictable in one call. Deployment-coupled:
  `proxy/**`, so it needs a dotfiles pin bump and a restart at a session
  boundary; the change is memory-helper-only and touches no state KEYS or freeze
  logic, so row 3's restart-transparency argument holds unchanged.
  **Done-criterion:** the eviction bite in
  `test/relocate-then-pin-conservation.test.mjs` passes using ONLY the exported
  helper — with its current splice-and-unlink workaround removed — and goes red
  when the helper's disk half is disabled. Both arms pasted.
  Loop stage: VERIFY (added 2026-08-18 by the EIGHTH derivation — this entry has
  never carried a stage line; the MITIGATE label it was led with existed only in
  the SEVENTH derivation's own prose. VERIFY is what the body supports: the
  entry's own `git grep` finds the definition plus one test and no other caller,
  and the done-criterion is a TEST passing using only the exported helper.)
  Anchor: `proxy/extensions/fresh-session-sort.mjs`
  Write-set: `proxy/extensions/fresh-session-sort.mjs`, `test/relocate-then-pin-conservation.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/relocate-then-pin-conservation.test.mjs
  <!-- entry: "resetRelocationMemory cannot evict the memory the pipeline uses" -->

- **PARKED 2026-08-18 (evening) — row 31's 50 ms window is measured from the
  leader's POST-PIPELINE registration, so our own pipeline latency is spent out
  of CC's budget.** `entry.at = Date.now()` is stamped after `preForward` has
  run the whole extension pipeline (`proxy/server.mjs`), and the follower
  compares against it after its OWN pipeline — so the quantity checked against
  `COALESCE_WINDOW_MS` is the arrival delta PLUS the skew between the two
  requests' pipeline times, not the interval CC actually produced. The measured
  instance: a 43 ms pair (class p50 is 14 ms) missed the window while a 166 KB
  13-tool request arrived between the two and shared the event loop, 9 ms ahead
  of the follower.
  **The obvious fix — compare arrival stamps instead — is NOT booked as ready,
  and the reason is the honest one:** if the follower found no leader at all
  because the leader had not finished its pipeline yet, an arrival clock changes
  nothing, because there is no entry to compare against. Building the clock fix
  under that reading would ship a mitigation for a cause that may not be the
  one occurring, which is what the attribution rule forbids.
  NAMED MISSING EVIDENCE: `coalesce-miss` records (the READY entry above)
  showing, across at least a few live instances, whether the misses read
  `stale-leader` with `arrivalDeltaMs < 50` — which the clock fix removes — or
  `tombstone`, which needs the leader registered EARLIER instead, a different
  change to a different line.
  Design sketch held for when that lands, so the trigger is a build and not a
  re-derivation: the leader entry carries `arrivedAt`; condition 4 reads
  `follower.arrivedAt - leader.arrivedAt < COALESCE_WINDOW_MS`; the window
  constant is unchanged, because widening it to absorb our own latency is the
  workaround, not the fix.
  Trigger to re-grade: the first sweep whose captures carry `coalesce-miss`
  records.
  Loop stage: MITIGATE.
  Anchor: proxy/server.mjs
  Write-set: proxy/server.mjs, test/duplicate-coalesce.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/duplicate-coalesce.test.mjs
  <!-- entry: "coalesce window measured from registration, not arrival" -->

- **PARKED 2026-08-18 (was READY; HALF ONE IS SHIPPED, half two is blocked on
  another repo file) — `bust-triage` cannot reach threat-matrix row 24 by ANY
  of its three routes, so the whole resume / born-large class triages as
  UNVERIFIABLE or UNCLASSIFIED forever.**
  **REGRADED after the dispatched lane's premise check, before any code was
  written — and the check is what saved the lane from rebuilding shipped
  work.** HALF ONE (`causeToRow`: `system_changed` -> 24) was ALREADY SHIPPED by
  the 2026-08-11 dispatch: verified live by the lane, `causeToRow("system_changed",
  null) === 24`, with its bite already passing in
  `test/bust-triage-matrix-walk.test.mjs`. HALF TWO (the cross-conversation
  born-large pair mode) is what remains, and its blocker has MOVED since this
  entry was written, which is why it parks rather than staying ready: the
  original blocker was "no case on disk, and no substitute is to be shopped
  for"; a real case (`s-captureBR`) has since arrived, and `harvest --pin
  --bounded` refused to freeze it — its own self-check fires because the
  busting request is its conversation's SOLE member, so bounding placeholders
  exactly the record the pin exists for.
  **NAMED MISSING EVIDENCE, which is the whole content of this parking:** a
  frozen pin of a born-large case. That is not this entry's write-set — the
  realizing write is in `tools/harvest.mjs`, and the pin-retention question is
  booked as its own entry below. When that lands and a case is frozen, this
  un-parks with its design unchanged.
  **DISPATCH NOTE, answering the lane's own question back:** half two does NOT
  get a lane while its evidence cannot be frozen. Briefing it now would send a
  lane to build a mode it cannot red-first against anything real, and this
  entry's own rule already forbids shopping for a substitute case. Measured 2026-08-06 on capture s-captureAL (the
  204,513-token `system_changed` event, walked to CONTROLLED-CAUSE in row 24).
  Three independent misses, each at file:line:
  (i) **Pair selection.** `capturePair` pairs on byte-identical `messages[0]`
  (`bust-triage.mjs:334-347`), so a bust whose defining feature IS a
  `messages[0]` change can never be represented. Worse, it is steered there:
  `preferTelemetryConfirmed` (`:313-332`) prefers the RESET-carrying request,
  and at a resume boundary that request is BY CONSTRUCTION its conversation's
  first — a guaranteed null. The heuristic is correct and puts the class out of
  reach anyway.
  (ii) **Census class.** The counterfactual pair (91→92) was built and run
  through the tool's own steps: `censusPair` = append-only, `migrationVerdict` =
  null, `classToRow` → null.
  (iii) **Cause map.** `causeToRow` (`:524-538`) maps `messages_changed`→4 and
  `tools_changed`→6/23 and nothing else. **`system_changed` — one of the three
  causes CC emits, and the one this whole class books under — maps to no row.**
  Good news, and it is why this is READY rather than urgent: both reachable
  routes fail LOUDLY (UNVERIFIABLE / UNCLASSIFIED). There is no silent-wrong-row
  path. Positive control that the tool is not simply broken:
  `--at 2026-08-06T12:54:49Z` returns a pair and grades KNOWN-OPEN row 4.
  Design, DECIDED (dispatcher), in two separable halves so they can ship apart:
  **the cause map first** — `system_changed` → row 24, three lines, and it
  converts the loudest hole into an answer; **then the pair mode** — when no
  same-`messages[0]` predecessor exists, fall back to the nearest earlier
  same-session request with ≥2 messages and LABEL the pair
  `cross-conversation (born-large)`, so nothing downstream mistakes it for a
  normal pair. Verifier, red-first and already in hand: `--at 1786038016` must
  go from UNVERIFIABLE to a row-24 verdict, and the 12:54:49Z control must be
  unchanged.
  **SPLIT 2026-08-11 — half one DISPATCHED, half two PARKED, and the split is
  forced by the evidence rather than chosen.** The verifier quoted in the line
  above is DEAD: s-captureAL has 0 hits in the captures directory (desk
  measurement 2026-08-11, control sid returning 1 under the identical probe;
  oldest capture on disk is 2026-08-09, the capture is from 2026-08-06), so the
  `--at` arms cannot run at any tier.
  **CORRECTED the same day: this note first said "and 0 in `git ls-files`",
  which was the wrong join talking.** Under `sidToken` — the hash a pinned
  fixture is actually named by — s-captureAL has FOUR committed row-pin
  fixtures. They do not revive the verifier, because a row pin is a single-row
  snapshot and `--at` needs a replayable pair, so half two stays parked on
  exactly the evidence it always needed. What the correction does change is the
  next reader's first move: there is real frozen material for this session to
  read, and "nothing was kept" would have stopped them looking.
  HALF ONE (the cause map, `system_changed` -> row 24) survives the loss
  because its red is a PURE-FUNCTION arrangement — `causeToRow` returning
  nothing today, asserted in `test/bust-triage-matrix-walk.test.mjs` — which
  is exactly the immutable-reference property this repo requires and the reason
  it stayed dispatchable while the rest of the entry did not. Dispatched
  2026-08-11.
  HALF TWO (the cross-conversation born-large pair mode) is PARKED. MISSING
  EVIDENCE, named: a pinned resume/born-large pair — a request that is its own
  conversation's first, with its nearest earlier same-session predecessor
  present in the same pin — frozen by `harvest --pin --bounded` at the next
  such walk. No substitute case is to be shopped for.
  **THE WALK ARRIVED 2026-08-15 AND THE FREEZE FAILED — the missing piece is
  now the PIN MODE, not the case.** s-captureBR (919k, 15:07:49Z) is exactly
  the shape this half has been waiting for: the busting request at ord 664 is
  its own conversation's first (a brand-new `conversationSubKey`, no earlier
  request shares it) with its nearest earlier same-session predecessor at
  ord 662 in the same capture. `harvest --pin s-… 662..664 --bounded` was run
  and its OWN self-check refused the claim, correctly: *"busting conversation
  incomplete in the bounded pin: 1 of 1 member ordinal(s) missing or
  placeholder — ordinal(s) 664"*. That is structural, not incidental, and it
  is why this half will fail the same way at EVERY future occurrence:
  `--bounded` keeps the busting conversation's own members, and for a
  born-large pair the busting request is that conversation's SOLE member, so
  bounding placeholders the one record the pin exists for. The unbounded
  route is not the escape — the bounded attempt already wrote a **155 MB**
  file into the public tree before being rejected (this row's own `pinRange`
  note records the same hazard at ~30 MB), and it was deleted unstaged.
  So the named missing piece is now: `harvest --pin --bounded` must retain the
  busting request itself even when it is its conversation's only member —
  otherwise the born-large class is unfreezable by construction. Until that
  lands, the durable evidence for this class is the matrix row 24 addendum
  plus the machine-local freezes at
  `~/.local/share/cache-fix/bust-evidence/2026-08-15/` (event-log slice, both
  timestamps and 4 distinct keys verified present; and the
  `boundary-layers --json` output carrying the four-layer cascade).
  Anchor: row 24
  Write-set: tools/bust-triage.mjs, test/bust-triage-matrix-walk.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-matrix-walk.test.mjs
  <!-- entry: "bust-triage cannot reach matrix row 24 by any route" -->

- **PARKED 2026-08-18 — `harvest --pin --bounded` REFUSES exactly the case a
  pin is most needed for: a busting request that is its conversation's SOLE
  member.** Surfaced by the row-24 lane's premise check (that entry is parked
  ON this one). The bounded pin's own self-check fires because bounding
  placeholders the only record in the conversation — so the freeze that would
  make a born-large case testable is the freeze the tool declines to make. A
  second instance of the same family arrived from the replay lane the same day
  and is recorded here rather than as a sibling entry, because both are the
  same question about what a pin's RANGE must include: a pin frozen through
  request N structurally cannot carry request N's own OUTCOME record, since an
  outcome trails its own request in capture file order — measured on
  `pinned-s-d8f209e4b75e-461-462.json`, which is why that lane's exemption test
  had to construct its pair from documented real numbers instead of replaying
  the committed pin.
  **NAMED MISSING EVIDENCE — a DESIGN decision, not a measurement, and it is
  the operator's or a design round's, not a lane's:** what a pin's boundary
  means. Three readings are live and they are not interchangeable. (i) A pin
  freezes a request RANGE and its truncation properties are the caller's
  problem — today's behaviour, honest, and it makes both cases above
  unfixable by definition. (ii) A pin freezes through the last record its
  range's requests DEPEND ON, which would pull in trailing outcomes and make
  the sole-member case coherent — bigger pins, and this repo already has an
  unpublishable 188 MB one. (iii) The bounded mode gains an explicit
  sole-member branch and nothing else changes — cheapest, and it leaves the
  outcome-truncation half untouched.
  Why not READY: picking among those is a scope-and-cost judgment about
  evidence retention, exactly the axis where this repo has already paid for a
  wrong default once. A lane briefed on it would be inventing the boundary
  rule, which is a design decision and therefore not decision-complete.
  Un-parks when that reading is chosen.
  Loop stage: SEE.
  Anchor: tools/harvest.mjs
  Write-set: tools/harvest.mjs, test/harvest.test.mjs
  Verifier: a born-large case freezes and its pin replays reproducing the pair
  <!-- entry: "harvest pin boundary refuses sole-member conversations and truncates outcomes" -->



- **RECORD (regraded from READY 2026-08-18, seventh derivation — SHIPPED; the
  remainder is an OBSERVATION, not work) 2026-08-18 (booked READY 2026-08-17, PARKED and un-PARKED the same
  day — see the grade trail below; MITIGATE stage) — preload
  `SendMessage` as a deferred tool at session start, so the addition that
  causes 80% of tool-front invalidations never arrives mid-session.** Row 6
  ladder step (b), the lever the 2026-08-16 population record measured and
  deliberately left un-designed.
  **BUILT (`eaa1454`, local, unpushed), RE-GRADED READY -> PARKED by an opus
  fresh-context review of the built change, then PARKED -> READY the same day
  once the park's named missing evidence was SUPPLIED by a live probe. The
  implementation is not the thing to throw away; what it needs is the repair
  list below, which is decision-complete.**
  **THE PARK'S MISSING EVIDENCE IS NOW IN HAND — and the result is that the
  safety property HOLDS while the reason stated for it was false.** The park
  asked one thing: is a tool sitting in `tools[]` with `defer_loading: true`
  and no `tool_addition` block reachable by the model? Settled by a live
  disposable session against a throwaway proxy on a spare port with isolated
  XDG dirs (production untouched, verified answering afterwards), using the
  DISCRIMINATING case rather than the convenient one — a FABRICATED name CC can
  never have registered, because `SendMessage` cannot separate the hypotheses:
  CC's own deferred-tool listing already names it, so the model can load it
  whether or not we seed it (read from the PRE-pipeline capture of the first
  probe, i.e. before our extension touched anything — the repo's own
  attribution primitive). Reading that first run as "the seed made it
  reachable" would have been a confident wrong claim.
  Result, both halves: the API ACCEPTED an unannounced `defer_loading` tool (no
  400, request completed), and the model answered **ABSENT** when asked whether
  it could see or call it. Instrument-positive, without which ABSENT proves
  nothing: the extension's own telemetry (`seeded=['ZzProbeOnlyTool']`) and its
  persisted array (`preloaded: ['ZzProbeOnlyTool']`, never announced) establish
  the seed genuinely reached the wire, so ABSENT is a measurement rather than a
  probe that never armed.
  **What that changes in the CODE, and it is a correction to a PRE-EXISTING
  sentence rather than to this entry's work:** the header's STATELESSNESS
  paragraph claimed "the API loads a deferred tool only when its tool_addition
  block is present in THAT request". Measured false — 4,972 of 4,972 sampled
  requests carry `defer_loading` tools with NO announcement, zero carry both.
  The true mechanism is that the model's loadable-tool view comes from CC's own
  listing inside `body.messages`, not from `tools[]`. Corrected in the file.
  The design's safety half therefore stands, on the right mechanism — with the
  residual now precisely stated: the risk lives in the preload SET, not in the
  mechanism. Seeding a name CC does not universally register is invisible to
  the model (safe) but pins bytes nothing will ever announce; `SendMessage` is
  safe on this axis because CC lists it regardless.
  **The header's safety claim is REFUTED IN ITS LITERAL FORM, and it is the
  extension's PRE-EXISTING sentence rather than a new one — this entry's
  design simply rested on it.** Desk-verified independently of the lane by a
  streamed scan of 4 live captures: 4,972 requests carry `tools[]`; of those,
  **4,972 carry `defer_loading` tools with NO `tool_addition` block anywhere
  and ZERO carry both**; `SendMessage` itself arrives from CC already deferred
  in 3,327. So "a deferred tool loads only when its `tool_addition` block is
  present in THAT request" (`deferred-tool-rewrite.mjs`, STATELESSNESS
  paragraph) is false as stated — that is ordinary ToolSearch traffic. The
  instrument-positive is the 4,972 itself: a zero there would have made the
  parse the finding rather than the corpus.
  What appears to protect the case is a DIFFERENT mechanism the commit never
  names: CC writes the deferred-tool listing the model reads out of its own
  registry, as a system-role message inside `messages[]` (found there, never in
  top-level `system`), so a name CC never registered would not appear in it.
  Plausible, and tested by nothing here. The open half — whether the API
  surfaces a deferred name server-side — is what the probe must answer.
  **THE NINE FINDINGS, as dispositions rather than prose, so this is a brief
  whoever executes it.** Every one was demonstrated by EXECUTING the real
  extension or by mutating it; the two marked (desk) were re-verified here
  independently rather than booked on the lane's word.
  1. BLOCKING — a pending seed disables the shipped description-absorb. The
     absorb needs `heldNames.length === 0` (`:559-562`, refused `:575-578`)
     and a seeded-but-unarrived name is permanently held, so every description
     delta in the pending window takes `reset/tool-schema-changed` instead.
     (desk) Two arms, same input, only the gate differing: preload OFF ->
     `description-absorbed`, wire unchanged; preload ON -> `reset`, wire moves
     `[Bash, Read, SendMessage*]` -> `[Bash, Read]`. The reset also zeroes
     `preloadPending`, so the conversation loses the preload as well. FIX: the
     set-identity test must ignore names the extension itself seeded — a name
     WE added is not evidence CC changed its tool set; write that definition
     before the assertion. RED-FIRST: the two-arm probe as written.
     Lane-reported and NOT desk-verified, booked as such because it changes
     emphasis and no verdict: 145 of 153 live `description-absorbed` events sit
     inside a pending window.
  2. HIGH — a stale learned schema at arrival is strictly WORSE than no
     preload. Store learns schema A, CC later sends schema B: PRELOAD arm
     `reset`, CONTROL arm (parent commit) `rewrite` + announce, prefix held.
     FIX: on a fingerprint mismatch for a name still PENDING, adopt CC's bytes
     and announce — the new-name path — never the global reset.
  3. HIGH — a duplicated name in the gate list puts two identical-name entries
     on the wire (`CACHE_FIX_TOOL_PRELOAD="SendMessage,SendMessage"` ->
     `[..., SendMessage*, SendMessage*]`). This file's own classifier calls a
     duplicate-name array degenerate. FIX: de-duplicate; may dissolve entirely
     under the gate-shape repair below.
  4. HIGH — the safety premise, above. Blocks the gate flip on its own.
  5. MEDIUM — "never retrofits" is guarded by `action === "no-baseline"`,
     which is a fact about the STATE FILE, not about the conversation. A
     mid-conversation key rotation (this repo has measured one: `s-captureAB`
     n=331->336) makes turn 7 of a live conversation classify `no-baseline` and
     SEED — wire went 8 tools -> 9. FIX: the guard needs a conversation-depth
     or history test, not a state-file test.
  6. MEDIUM — the new reset reason is an unexplained stability violation in
     the offline gate: `resetWipesAdditionsExemption` keys on the exact string
     `tool-schema-changed` (`tools/replay.mjs:280-281`), so every
     `preload-unannounceable` abandon fires a red the gate cannot explain —
     the standing-FAIL-on-a-non-defect shape replay.mjs's own comment warns
     about. FIX: extend the exemption, or do not mint a new reason.
  7. MEDIUM — the machine-wide store is rewritten on every request whose
     preloaded tool's bytes differ; for any name whose description is project-
     or plugin-dependent that is a write per request across every session on
     the box, last writer winning. FIX: restrict the gate to schema-stable
     names, or throttle the write.
  8. LOW — gate-unset inertness holds on the wire (byte-identical across 6
     requests spanning all five classifier actions), with two non-wire deltas
     named: `deferredToolRewriteStats` gains three keys, and the canon file
     gains `"preloaded": []`. No consumer break found.
  9. LOW — odd store shapes degrade to "no seed" except one: an entry whose
     `tool.name` disagrees with its key seeds under the OTHER name.
  **FIVE CLAIMS THIS ENTRY'S OWN TESTS DO NOT COVER — from a mutation battery
  (14 mutations caught, 5 uncaught), and the first is the sharpest because the
  header calls it load-bearing while nothing tests it:** announce-on-arrival
  moved INSIDE the `wantPreload` gate (zero bites red); pending surviving a
  classifier reset; a store that parses but has no `tools` object; gate-live's
  window filter on preload acts; and the `unchanged`/`description-absorbed`
  forwarding branches with a non-empty pending set.
  **AND A DEFECT THE REVIEW DID NOT NEED TO FIND — the gate's SHAPE.**
  `CACHE_FIX_TOOL_PRELOAD` was a comma-separated name list, which
  `proxy/gate-allowlist.mjs` forbids adding (its rule: no free-form values),
  while ship-runbook step 4b requires a serving gate to be publishable or the
  doctor's three-way compare FAILS naming the wrong cause. FIX: make the gate
  a boolean and move the preload set into a source constant beside
  `TOOL_ADDITION_MODELS`, where each name carries its measured evidence —
  which is better than an env string anyone can set without any.
  **REPAIR ROUND CLOSED 2026-08-18 — dispositions-first + dispatch, and the
  form change WORKED: the series went 9 findings -> 1.** Commits `3eff617`,
  `8fa214e`, `2ae2cd9` (opus lane, unpushed at close of round). All seven
  worked findings plus the gate-shape repair are built; F4 was closed by the
  probe and F8 needed no code. Verified at the DESK with instruments the lane
  did not run, never booked on its report: the original two-arm absorb probe
  now returns `description-absorbed` with `tools[]` unmoved (the BLOCKING
  finding is gone), and an independent stale-schema arrival probe shows the
  model receives CC's CURRENT schema rather than the stored one — the half a
  bare "not a reset" assertion would have missed. Suite 3,582/0, verdict-ab
  IDENTICAL across 3,223 verdict lines / 19 corpora, serving-gate-lint exit 0.
  **THE ONE DEFECT THE ROUND ITSELF ALMOST SHIPPED, and it was a CONSTANT the
  brief forced the lane to invent.** The brief named F5's fix ("a
  conversation-depth or history test") without a value; the lane picked
  `PRELOAD_MAX_SEED_MESSAGES = 1` and reasoned the failure direction benign —
  "too strict seeds nothing, i.e. today's behaviour". Measured at the desk over
  6 live captures / 5,428 tool-carrying requests grouped by imported
  `conversationSubKey`: **0 of 43 conversations** would have passed it, so the
  mitigation was dead on arrival under a fully green suite — the silent-failure
  class the skip gauge named. The bites passed only because they drive
  1-message bodies, a shape CC does not produce: fixture-encodes-an-impossible-
  state, with the constant calibrated to the fixture.
  Replaced by a SEMANTIC test, `isConversationBirth(messages)` — no assistant
  turn yet — derived from a discriminating pair in real data rather than a
  constructed one: births (no assistant) numbered 27 at exactly 2 messages,
  roles `user/system`; mid-conversations (assistant present) numbered 16 at 4
  or 6+. Zero overlap. `PRELOAD_MAX_SEED_MESSAGES` is gone, not kept beside it.
  **CORRECTION to this entry's own numbers, because the lane re-measured rather
  than booking mine:** on its independent capture set the guard admitted 2 of
  50, not 0 of 43. One-message first requests DO occur and are rare, so "never
  seeds" was an overreach of my sample — the honest figure is ~96%, and the two
  survivors are exactly why the old bites looked healthy. Direction and size
  unchanged. Desk-probed afterwards with a THIRD arm neither side had stated:
  the rare 1-message birth also seeds, which is what proves the new guard is
  semantic rather than a count in disguise.
  **What the round returned as outside the lane's boundary and the desk then
  closed:** the `gate-live` window-filter bite (added, and RED-PROVEN — deleting
  the window test reddens exactly that bite, 55/1, restored 56/56), and both
  documents still describing the gate in its old name-list shape.
  **Telemetry shape change, for whoever next reads a live sweep:** the pending
  steady state now reports action `unchanged` where it reported `rewrite` with
  `heldNames=[SendMessage]`. Wire bytes identical either way; `preloadPending`
  still carries the count.
  **THE FORM IS WHAT FAILED, and the trend is the reason this WAS parked rather
  than repaired in place.** Three rounds on this extension family now: the
  row-24 lane's round 1 (green bites, green suite -> blocking defect at a desk
  probe), its round 2 (green bites, green suite, green desk probe -> ten
  findings, two blocking), and this one (nine red-first bites, 3,570-test suite
  green, gate green over 12,378 MB, `verdict-ab` IDENTICAL over 3,223 verdict
  lines -> nine findings, one blocking). Flat-to-worsening, each round's
  defects minted by its own changes. `docs/dev-loop.md`'s measured split names
  what held instead: dispositions recorded BEFORE implementation, then
  implemented from them — desk-implemented repairs took the blockers both
  previous times. The list above IS that record; a fourth lap in the same shape
  reproduces the class.
  **Why this one and why now.** `SendMessage` is 103 of 126 measured addition
  events, in 24 of the 25 captures that have any (2026-08-16 record, this
  file). It is also the only frequent addition that is PREDICTABLE at session
  start: it appears when a session gains a teammate agent, unlike the one-off
  MCP servers that make up the rest. Operator decision 2026-08-17, taken with
  the ceiling stated: k=1 covers ~80% of events, the k=10 ceiling is ~89%, and
  the residue is mid-session MCP arrivals that NO session-start mechanism can
  reach — tonight's own 686k bust included. This does not fix that class and
  is not claimed to.
  **The design, and it is a SEED of existing machinery rather than a new
  mechanism.** `deferred-tool-rewrite` already forwards, for every KNOWN tool
  name, the FROZEN persisted object rather than CC's incoming bytes
  (`proxy/extensions/deferred-tool-rewrite.mjs`, header + `loadState`). So if
  `SendMessage` is already in the persisted known-tools array before CC ever
  sends it, CC's later addition is classified as a known name, the frozen
  object is forwarded, and `tools[]` does not move — no front invalidation.
  Concretely, at the `no-baseline` path only (first-seen session):
  1. seed the persisted array with the preload set, each entry marked
     `defer_loading: true`;
  2. emit NO `tool_addition` block at seed time. This half is load-bearing
     for SAFETY, not for cache: the API loads a deferred tool only when its
     `tool_addition` block is present in that request (extension header,
     beta `mid-conversation-tool-changes-2026-07-01`), so an unannounced
     preloaded tool sits in `tools[]` without being callable. That is what
     stops the model from invoking a tool Claude Code does not yet know it
     has and cannot route;
  3. when CC later sends `SendMessage` for real, announce it then — the
     existing new-name path already does exactly this.
  **THE SHIP-TIME HAZARD, and it is the one that would bust every live
  session.** The seed must apply ONLY to sessions with no baseline yet. A
  running session already has a persisted array; adding `SendMessage` to it
  mid-flight changes `tools[]` and busts that session — the mitigation
  causing the exact class it prevents. So: seed at baseline creation, never
  retrofit, and price the restart against LIVE sessions
  (`tools/restart-exposure.mjs`), not against the corpus.
  **Where the preloaded BYTES come from — decide this before coding, it is
  the entry's one open sub-decision.** Two candidates, recommendation first:
  (a) LEARNED — the first session that ever sees `SendMessage` records its
  schema to machine-local state; later sessions seed from that. No hardcoded
  schema to go stale, and the existing fingerprint-change path already handles
  the day CC's schema moves (reset + re-record). (b) PINNED — a committed
  schema snapshot. Simpler, but it is a restated copy of CC's own artifact and
  cannot age loudly, which is the exact shape this repo keeps getting bitten
  by. Recommend (a); a fresh context may take (a) without asking.
  **Red-first, and the two arms must DIFFER.** Over a capture whose session
  adds `SendMessage` mid-conversation (the 2026-08-16 record names 24 such
  captures; pick one and pin it): today that pair censuses as `membership+`
  with the array growing and a front invalidation; with the preload seeded,
  the same pair must census with `tools[]` byte-stable across it — and a
  control session that never gains `SendMessage` must forward an array
  identical to today's except for the one deferred entry. A version that
  makes every pair stable is over-firing and fails the control.
  **Gates that bind before this ships, none relaxed by "mitigations first":**
  attribution verdict exists (row 6, CC's — done tonight); replay/gate green
  under the SERVING config, not defaults; the fidelity gate green, since this
  changes what the model can see; sibling enumeration (added / removed /
  renamed / re-described / duplicated / arriving during a reset) stated at
  ship time; and the row-3 declaration — this touches persisted state
  CONTENT, so state whether it moves state KEYS or freeze logic before any
  restart. `proxy/**` changes need the dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) + `systemctl --user restart
  cache-fix-proxy`, at a stated session boundary.
  **Skip-gauge, run 2026-08-17: two NOs.** Failure is SILENT (a preload with
  wrong bytes causes busts instead of preventing them, on every session), and
  blast radius is large (`proxy/**` fronts every Claude Code session on this
  machine). Paired mechanisms, both owed: fresh-context verification of the
  built change before push, and a written enumeration of everything touched.
  **BUILT 2026-08-18 (`eaa1454`, held unpushed pending the gauge's owed
  fresh-context review). The entry stays READY because BUILT is not SHIPPED,
  and the gap between them is this entry's whole remaining risk.** What
  exists: the seed at `no-baseline` only, learned bytes (option (a), taken as
  the entry permits), no announcement at seed time, announce-on-arrival —
  which is NOT the existing new-name path, since by then the name is KNOWN and
  the classifier never lists it in `newNames`; the pending set is carried in
  the persisted state (`preloaded`) and drained there. Two decisions the entry
  did not contain and the desk made: the model gate (seed only for a model on
  `TOOL_ADDITION_MODELS` — a preloaded tool that can never be announced is a
  tool that can never be called), and the ABANDON path (a seeded conversation
  whose model later leaves the allowlist takes one honest reset, reason
  `preload-unannounceable`, rather than sending `defer_loading` plus the beta
  header to a model with a recorded 400 on this contract).
  Red-first, both arms: 43 pass / 9 fail against the unmodified extension
  (`git checkout HEAD -- <ext>`, `git diff --stat HEAD` printed as proof the
  old blob was in place), 52/52 with it; the same arrangement for the two
  instrument changes (30/3 and 53/2). Full suite 3565 pass / 0 fail.
  **What remains, and it is a DEPLOYMENT act rather than more building:** the
  gate `CACHE_FIX_TOOL_PRELOAD` is a BOOLEAN ("1") since the repair round — the
  name set lives in the `PRELOAD_TOOL_NAMES` source constant beside
  `TOOL_ADDITION_MODELS`, each name carrying its measured evidence — and it is
  unset everywhere, so the shipped code is inert until a unit declares it. The
  unit line to eventually add is `CACHE_FIX_TOOL_PRELOAD=1`, NOT a name list.
  Flipping
  it lands in the DOTFILES repo (`Environment=` on `cache-fix-proxy.service`),
  which is a different write boundary, and it changes what goes on the wire
  for every new conversation on this machine — so it is the operator's call,
  with the desk recommendation being YES and the evidence being the two
  transparency facts below.
  **Row-3 declaration, and it is stronger than the entry assumed — MEASURED,
  not reasoned.** No key derivation moved; the per-conversation state file
  gains one field read as `[]` when absent. With the gate unset the new path
  is entirely inert, and that is the half with executed evidence rather than
  an argument: `node tools/verdict-ab.mjs eaa1454^ eaa1454` reports
  **IDENTICAL across 3,223 verdict lines over 19 corpora**, exit 0 — and that
  tool exits 2 with COULD-NOT-VERIFY on an empty or unreplayable corpus, so
  the result is a measurement and not an absence. Beside it, `gate-live` over
  the live corpus with the SERVING 12-gate set: `ok=true`, 0 failing over 20
  captures / 12,378 MB, `tmpLeftovers` 0, and the run's own `code.proxyTree`
  is `ba5770e8fdd8` — the WORKING TREE's fingerprint, not the serving proxy's
  `c36cba5af50e`, which is what establishes that the sweep exercised the built
  change rather than the deployed pipeline.
  **What that evidence does NOT establish, stated because the two are easy to
  merge:** IDENTICAL proves the change is INERT on existing shapes, which is
  exactly the restart-transparency question. It says nothing about whether the
  new path WORKS — the committed corpus is curated for structure and contains
  no seeded conversation at all. That half rests on the new bites, on the
  fresh-context review, and on the live probe named below.
  And the gate FLIP is itself transparent to live conversations, because the
  seed fires at baseline creation only — an existing conversation is never
  retrofitted, which is the ship-time hazard this entry names. Both halves owe
  `tools/restart-exposure.mjs` against LIVE sessions before the restart, not
  the corpus.
  **NAMED MISSING EVIDENCE, and it is the SAFETY premise rather than a cache
  one — this entry may not ship its gate ON until it exists.** The design
  rests on: a tool present in `tools[]` with `defer_loading: true` and NO
  `tool_addition` block anywhere is (a) accepted by the API and (b) NOT
  callable. Nothing built here tests it — every check drives the extension
  locally, and `tools/probe-tool-addition.mjs` measures the OPPOSITE case (its
  header: whether a model accepts a tool_addition BLOCK). This is also the one
  surface where this repo has already recorded the published contract being
  wrong: row 6 carries a logged SPEC CONTRADICTION on deferred-tool loads. If
  (a) is false the proxy 400s every new conversation; if (b) is false the
  model can call a tool Claude Code cannot route. The probe is the runbook's
  own through-proxy method (a throwaway proxy on a spare port, one disposable
  `claude -p` session, verify on the capture) — booked as this entry's next
  step, before any unit `Environment=` change.
  **The done-criterion's absorption half is UNMEASURED and says so.** Nothing
  live has exercised the preload; `toolPreload.announced` non-zero on a daily
  sweep is the observation that would settle it, and until then this is "the
  mitigation is built", never "the mitigation absorbed".
  **SETTLED 2026-08-18 — the named observation returned.** Gate flipped on in
  the unit, proxy restarted, `/health` publishes `CACHE_FIX_TOOL_PRELOAD=1`.
  First post-flip sweep: `toolPreload {seeded: 2, announced: 1, fallback: 0}`,
  `ok=true`, 0 failing over 19 captures; the extension's own event logs read
  independently give 4 seeds / 2 announces / 0 fallbacks by 11:02Z and agree
  with the sweep on the shared window. `heldStable` 2/2, `heldUnstable` 0 on
  the announcing session; the `leaked: 2` beside it is the retired
  whole-array framing gap (`replay.mjs:1099-1105`), not a miss.
  **Two Done clauses remain OPEN, so this entry does NOT move to `## Done`:**
  (1) a seeded session's `SendMessage` arrival shown `tools[]` byte-stable in
  the CENSUS — today's isolation rests on the pre-ship run against the real
  production store, not on a live capture, because pre-restart conversations
  are never retrofitted and day-one traffic mixes seeded with unseeded; and
  (2) a live addition named ABSORBED by `bust-triage` rather than merely
  counted. Both need one sweep day whose announcing conversation was also
  born under the gate — no design work outstanding, only the observation.
  **INSTANCE 2026-08-18: 448k, 2026-08-18T11:22:51Z, `s-captureBT`** (row 6,
  ToolSearch limb, `claude-opus-5` both sides so `tool_addition` was
  available). Not absorbed, and not the named remainder: a pure addition of
  `WebFetch`+`WebSearch` (14->16, 0 of 14 shared tool objects changed) landed
  in the same request as a description delta, so `sameSet` failed and the
  extension took a global `reset` — the capture's only `heldStable=false` of
  9 `tools[]` deltas.
  **COST ATTRIBUTION CORRECTED 2026-08-18 by the fresh-context verifier (this
  desk's first reading was wrong and is retracted):** the 448k itself is CC's.
  Their addition moved `tools[]`, which renders first, so the prefix was
  already invalid — the reset's MARGINAL cost on this pair is ZERO. What is
  ours is not this bust's price but what the reset destroyed for the rest of
  the conversation: the frozen canonical and every pending injection with
  their `defer_loading` markers (`:1222`, and reset is absent from the
  forwarding branches `:1326-1353`, so `body.tools` reverts to CC's raw
  array). Do not cite this instance as a cost figure for the reset defect.
  Per testimony from the busting session (recollection-grade, not checked
  here): the load served a verification need created mid-conversation, so no
  session-start mechanism could have enumerated it. The lever for this limb is
  therefore step (a)'s reset path, and "load it earlier" is not a mitigation
  for the class.
  Done: a seeded session's `SendMessage` arrival shows `tools[]` byte-stable
  in the census; the control session is unchanged; gate + fidelity green under
  serving config; shipped via `docs/runbooks/ship-proxy-change.md`; the next
  live `SendMessage` addition named ABSORBED rather than merely "the
  mitigation ran"; entry moves to `## Done` with its ref.
  Loop stage: MITIGATE.
  Anchor: row 6
  Write-set: `proxy/extensions/deferred-tool-rewrite.mjs`,
  `test/deferred-tool-rewrite.test.mjs`,
  `docs/directives/robustness-threat-matrix.md`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/deferred-tool-rewrite.test.mjs
  <!-- entry: "preload SendMessage as a deferred tool at session start (row 6 step b)" -->

- **RECORD 2026-08-17 — the READY cap of ten is doing its job, and its cost
  lands at exactly the wrong moment: BOOKING time.** Operator, tonight, on
  being told a demotion was needed to book the preload: *"this 10 limit seems
  to sometimes hurt more than help?"*
  **Measured on this instance, both directions.** The cap HELPED: forced to
  pick a member to demote, the session read all ten and found that the
  ingestion-lane reconciliation entry does not meet the READY bar — its design
  depends on per-event lane+identity data the matrix does not carry and the
  entry never specifies. That entry had been sitting in the scheduled head
  claiming a fresh context could execute it. Nothing but the cap would have
  prompted anyone to look. The cap COST: five entries read and a judgment call
  made, mid-flight, while booking — and the accretion rule that keeps this
  repo honest is precisely that booking must stay about as cheap as doing,
  because the moment it stops being cheap the un-booked exit starts winning.
  **So the finding is not "the cap is wrong", it is "the demotion is
  unmechanized".** `backlog-lint` already computes the count and the cap; at
  11 it BLOCKS and says nothing about which member is weakest, so every
  booking that hits the ceiling pays a full manual re-read. The hazard that
  makes this worth building rather than tolerating: a session under pressure,
  facing "demote something or don't book", takes the exit the rules forbid —
  and unlike a dropped entry, a never-written one leaves no trace to find.
  **Design sketch, NOT decision-complete (this is why RECORD, not READY):**
  the lint prints a DEMOTION CANDIDATES line at or near the cap, ranking head
  members by facts the entries already carry — a design decision still open in
  the body, a measured cost older than N days, a premise citing a file that
  has since changed. Which signals, and in what order, is the open decision;
  a rank nobody trusts is worse than no rank, and the ranking rubric in
  `docs/dev-loop.md` is the place that argument belongs.
  **What is NOT recommended, so it is not re-argued:** raising the cap. The
  cap's own rationale is that a grade nobody believes carries no information
  (sibling repo at 110 READY), and tonight's demotion found a real defect
  inside the ten, which is evidence the bound is binding on something real.
  The number is the operator's (2026-08-11); nothing here asks to change it.
  Consumer: whoever next hits the cap while booking — i.e. the next session
  that books anything into a full head.
  Loop stage: none (process instrument; surfaced under the trajectory test as
  evidence of a missing stage in the booking path itself).
  <!-- entry: "READY cap blocks at 11 but never names a demotion candidate" -->

- **READY (re-derived and UN-PARKED 2026-08-18 evening, operator GO to design the next mitigation; MITIGATE stage) 2026-08-16 — a resume-tolerant state key: the
  LINCHPIN that gates every four-layer resume absorption, and the reason the
  tools mitigation we already ship is disarmed at exactly the request that
  needs it.** Booked because matrix row 24 had NO mitigation entry at all,
  which the bust runbook says is itself booked before a walk closes.
  **RE-GRADED READY -> PARKED 2026-08-16 by an opus fresh-context review of the
  built change (4 unpushed commits, `838e064..1d0bfe2`). The implementation is
  NOT the problem to fix; the entry stopped being decision-complete.** Named
  missing pieces, both of which must land before this is dispatchable again:
  (1) an OPERATOR SCOPE DECISION — see finding 4 below; (2) a re-derived design,
  because the mechanism as specified has a production cost nobody priced
  (finding 6). Ten findings, every one demonstrated by executing the real
  extension, not by reading it. Two BLOCKING:
  **F1 (BLOCKING) — the feature is INERT in the configuration that serves.**
  The unit and `/health` both carry `CACHE_FIX_VOLATILE_PIN=1` (verified at the
  desk, DECLARED and RUNNING agree). In pin mode stored canonicals hold
  `computePinnedIdentities` hashes whose user-role entries carry a `"v:"`
  prefix BY CONSTRUCTION — deliberately disjoint from the plain ones
  (`:541-545`, "never a silent partial mismatch"). `:2105` passes
  `computeIdentities(messages)` unconditionally while `mode` is in scope on the
  same line. Measured at the real CC ratio (every `tool_result` is a user
  message, so 2 user : 1 assistant): shipped comparand overlap 0.333 /
  coverage 0.333, correct comparand 1.000 / 1.000. Every real conversation
  sits under the 0.5 floor. One-line diagnosis AND fix:
  `pin ? computePinnedIdentities(messages) : computeIdentities(messages)`.
  **F2 (BLOCKING) — once F1 is fixed, the third read serves one conversation's
  bytes into another.** `findLineageRecovery` matches on `s-<sid>-` alone,
  crossing the system-prompt sub-key that row 14 exists because co-tenants
  under one session id were overwriting each other. Demonstrated in pin mode:
  conversation B's outgoing body carried NINE messages of conversation A's
  content and none of its own; the without-the-change control carried B's
  correctly. **F1 currently MASKS F2 — fixing F1 alone arms F2 at full
  strength; they land together or not at all.**
  **F3 (HIGH) — recency picks a newer co-tenant.** The coverage floor closes
  the SHORT co-tenant hole and does nothing about a LONG one: a fork/subagent
  canonical that is a 41-message superset (newer) beats the main thread's own
  40-message predecessor. `subagent_type: "fork"` inherits the parent's full
  context, so the harness produces this shape routinely.
  **F4 (HIGH) — THE DONE-CRITERION IS UNREACHABLE FROM THE DECIDED WRITE
  BOUNDARY, and this is the operator decision.** The stated payoff is
  `deferred-tool-rewrite` reporting `description-absorbed`/`rewrite` — layer 1,
  the 38.9 kB first span. That extension keeps its OWN state file
  (`deferred-tool-rewrite.mjs:205`) and its OWN two-key read (`:698-726`), both
  keyed on `conversationSubKey` and both rotating at the same boundary, and it
  has no third read. So this change satisfies the design paragraph and CANNOT
  satisfy the done-criterion. Desk recommendation, for the operator:
  NARROW the criterion to "the canonical resolves" and book the tools-layer
  third read as its OWN entry — two extensions, two state files, and bundling
  them doubles a lane that has already failed twice.
  **F5 (MEDIUM-HIGH) — the `sameLineage` gate at `:401` can never fire.**
  `lineageCoverage` divides by max, `lineageOverlap` by min, both floors 0.5;
  since min <= max, coverage >= 0.5 IMPLIES overlap >= 0.5. Verified
  arithmetically at the desk and by deleting the line (all 7 bites stay green).
  The documented two-gate design is one live gate — and a later lowering of the
  coverage floor would silently leave the dead gate as the only guard, i.e. the
  short-sidecar hole reopening. This one is the dispatcher's own design defect,
  introduced by the coverage floor.
  **F6 (MEDIUM) — unbounded synchronous scan in the LIVE request path.**
  Measured at real scale (desk-verified: 11,169 canonical files, 626 MB, the
  busiest sid holding 649, largest file 1.19 MB): the scan `readFile`s and
  `JSON.parse`s EVERY prefix-matching candidate and only afterwards `stat`s it,
  so the mtime it selects on never skips work. End-to-end `onRequest` at 649
  candidates: **150 ms with the third read vs 2 ms without**, blocking the event
  loop of a proxy fronting every session on this machine. It fires on the first
  request of every new conversation under that sid, every subagent, and every
  sidecar. This is what makes the mechanism itself suspect rather than the code:
  a lineage INDEX written at save time would make recovery one small read.
  **F7 (MEDIUM) — the new gate-live counter reports a clean zero over an
  unscanned population.** `gate-live.mjs:1879-1884` gates `hits` on
  `filesScanned` (both suffixes) while the signal appears only in
  insertion-events files; `insertionScanned` is already computed and unused.
  The sibling four lines above does it right. `grep -rn d1LineageRecovered
  test/` -> 0: a counter that never counts would ship green.
  **F8 (MEDIUM) — compaction-shaped input is admitted**, against this entry's
  own sibling enumeration, which says the safety argument reaches resume and
  explicitly does NOT reach compaction. Demonstrated admitted at overlap 0.955 /
  coverage 0.55; only arithmetic keeps large-canonical compactions out, by
  accident of size.
  **F9 (LOW-MED) — the floor is nearly free for short arrays**: two 2-message
  conversations sharing ONE message admit at exactly 0.500.
  **F10 (LOW) — nondeterministic tie-break**: `:410` uses strict `>`, and
  `readdir` is unsorted, so equal mtimes make "whose baseline is served" a
  filesystem-order outcome.
  **RE-DERIVED DESIGN, 2026-08-18 — this is the second named missing piece, now
  supplied. The first (the F4 scope decision) was discharged when the
  tools-layer read was split into its own entry on operator GO.**
  **The mechanism changes shape: the read-time SCAN is dropped entirely and
  replaced by a save-time LINEAGE INDEX.** F6 is not a slow implementation of a
  sound design, it is the design being wrong: recovery cannot afford to
  `readFile` + `JSON.parse` every prefix-matching candidate on the live request
  path (measured 150 ms vs 2 ms at 649 candidates, blocking the event loop of a
  proxy fronting every session on this machine), and no amount of ordering the
  `stat` before the parse fixes a mechanism whose cost grows with a directory
  nobody bounds.
  1. **The index.** When insertion-normalization SAVES a canonical it also
     upserts one row into a per-sid index file beside the canonicals,
     `<sid>-lineage-index.json`: `{ subKey, file, mtimeMs, n, mode,
     identityHashes }` — the identity set is what the floors are computed from,
     so it is STORED rather than re-derived. `mode` is stored because F1 is a
     mode confusion: a pin-mode canonical's identities carry the `"v:"` prefix
     by construction and must never be compared against plain ones.
  2. **Recovery becomes one small read plus one canonical read.** Load the
     index, score candidates from the stored identity sets, then read exactly
     ONE canonical — the winner. No candidate parse, no directory walk.
  3. **F1, one line and it lands with F2 or not at all:**
     `pin ? computePinnedIdentities(messages) : computeIdentities(messages)`.
     F1 currently MASKS F2, so fixing it alone arms cross-conversation bleed at
     full strength. The index's stored `mode` is what makes the comparison
     checkable rather than remembered.
  4. **F2 — the index row carries the system SUB-KEY and matching REQUIRES it.**
     `s-<sid>-` alone crosses the boundary row 14 exists because co-tenants
     under one session id overwrote each other. This is the same fence, applied
     at the index rather than at a filename prefix.
  5. **F3 — selection is by BEST FIT, not by recency.** Among candidates passing
     the floors, prefer the one whose message count is closest to the incoming
     count without exceeding it; a fork/subagent superset (the harness produces
     these routinely) therefore loses to the thread's own predecessor even when
     it is newer. mtime is a tie-break, never the ranking.
  6. **F5 — the dead gate goes, and its arithmetic is recorded where it died.**
     `lineageCoverage` divides by max and `lineageOverlap` by min, so coverage
     >= floor IMPLIES overlap >= floor and the documented two-gate design is one
     live gate. Keep ONE stated floor. Deleting the redundant test is not a
     relaxation, and the comment says why, so a later lowering of the floor
     cannot silently leave a dead guard as the only fence.
  7. **F9 — the floor gains an ABSOLUTE minimum:** at least 3 shared identities,
     because two 2-message conversations sharing one admit at exactly 0.500 and
     a ratio alone cannot express "too small to mean anything".
  8. **F8 — compaction-shaped input is REFUSED explicitly**, by a predicate
     rather than by the accident of size that keeps it out today. This entry's
     own sibling enumeration says the safety argument reaches resume and does
     NOT reach compaction; an accident is not a fence.
  9. **F10 — deterministic order:** candidates sort by `(score, n, subKey)`,
     never by `readdir` order, so "whose baseline is served" stops being a
     filesystem outcome.
  10. **F7 — the counter gates on `insertionScanned`**, which is already computed
     and unused, not on `filesScanned`; and it ships with the bite whose absence
     `grep -rn d1LineageRecovered test/` -> 0 already proved.
  **CARRIER REGISTRATION, and it is a build obligation rather than a nicety
  (dev-loop closing gate, question 4):** the index is a NEW persistent state
  carrier — it outlives the run and nothing is scheduled to look at it. It ships
  with a collector in `state-report` (count, total bytes, oldest/newest row,
  and rows whose canonical file no longer exists) in the SAME change, or the
  mechanism is unfinished.
  **What the index also buys, stated because it is the argument for preferring
  it over a faster scan:** a stale row is detectable (its canonical is gone) and
  the index is bounded per sid, so the pathology F6 measured — cost growing with
  a directory nobody bounds — cannot recur in the same shape.
  **THE PREVIOUS IMPLEMENTATION IS NOT THE STARTING POINT.** Four commits sit on
  `wip/resume-key-third-read` (`c051d7d`..`1d0bfe2`) and they implement the
  SCAN. They stay as the record of what was measured; the build starts from this
  design. That is also what resolves the serving-gate-lint wiring entry, whose
  named blocker is this branch's disposition: the branch does not land in its
  current form.
  **Red-first, and the two that matter are the ones the previous round did not
  have.** (a) F2's cross-conversation bleed, reproduced first: conversation B's
  outgoing body carrying nine of A's messages under the OLD code, and B's own
  under the new — the review demonstrated exactly this, so the arrangement
  exists. (b) The COST arm, because F6 is why the design changed: recovery over
  a sid holding hundreds of canonicals must be a small constant, measured, with
  the old scan's number quoted beside it — an assertion that only checks
  correctness would pass the design that had to be abandoned. Plus one arm per
  finding above, each red against the current implementation.
  **Done-criterion, NARROWED per F4 and unchanged by this re-derivation:** the
  CANONICAL resolves across a resume boundary (insertion-normalization reports a
  recovered baseline instead of `no-baseline`), measured on a real capture. The
  tools-layer half — the 38.9 kB span — is its own entry and is NOT claimed here.
  **Ship discipline: deployment-coupled and it touches state KEYS**, so unlike
  tonight's observational change it owes row 3's declaration BEFORE the restart,
  and the restart is priced against live sessions with `restart-exposure`.
  **UNTESTED INPUT CLASSES, named so the next round does not re-derive them:**
  pin mode; `sid` null (the header-less `c-` path returns early, so direct-API
  traffic never recovers); sids that sanitize to the same string; unreadable
  dir; corrupt/truncated candidate JSON; `mode` mismatch; `entries: []`;
  entries carrying `d` (dropped) flags — these INFLATE the max-normalized
  denominator and can push a true long-lived predecessor UNDER the floor, a
  false negative created by the dispatcher's own coverage design; entries
  missing `h` (they enter the Set as `undefined` and can match another
  malformed candidate); 1- and 2-message arrays; capture-scale (~1,400)
  arrays; coverage exactly 0.5; identical candidates under different keys;
  equal mtimes; `stat` failing between load and stat; any candidate count
  above 2.
  **THE FORM IS WHAT FAILED, not the individual fixes — read this before
  opening another repair lap.** Round 1: 7 bites green, suite green, and a desk
  probe found a blocking defect. Round 2: fixed, 7 bites green, suite green,
  desk probe green — and a fresh review found ten more including two blocking.
  Both rounds' green came from checks that never exercised the SERVING config
  (`grep -c VOLATILE_PIN` over the new test file: 0), and the corrections
  concentrate in the newest round's own changes. A third lap in the same shape
  reproduces the class. The harness fix below comes FIRST.
  **THE 4 COMMITS ARE OFF `main` AND ON A NAMED BRANCH: `wip/resume-key-third-read`**
  (`838e064`, `c051d7d`, `6de0fc5`, `1d0bfe2`; branch tip also carries the
  bookings that were stacked above them). Taken off `main` 2026-08-16 rather
  than merely left unpushed, and the reason is F6 rather than tidiness: even
  with F1 making the feature INERT, the scan still runs on every miss, so those
  commits are a live 150 ms-per-miss regression that any restart would arm —
  and `main` IS the deployment state on this machine. Inert-because-broken is
  not a safety argument.
  Recorded here because an unreferenced lane branch is the exact class this repo
  has already paid for once (33 commits sat in lane branches while `git status`,
  `git log origin/main..main` and a handoff all read clean). Whoever resumes
  this starts from that branch, not from scratch: the four commits are sound
  work against a design that was wrong, and F1's fix is one line.
  MEASURED 2026-08-15 on capture s-captureBR (919,402 cache_creation,
  15:07:49Z, opus, resumed 2m27s after the previous request, cache
  demonstrably hot at 913,341 read on the preceding call).
  **The finding.** `tools/boundary-layers.mjs` (shipped with this entry)
  prices the boundary in wire order. FOUR layers diverge, all present in the
  RAW pre-pipeline capture so attribution is CC's by construction:
  `tools[]` @17974 (the `Claude-Session:` trailer in Bash's description),
  `system[2]` @12222 (the `<env>` gitStatus + recent-commits block),
  `messages[0]` @50066 (the claudeMd corpus snapshot re-read from disk), and
  `messages[115..116]` — a LOCAL EDIT of two messages where CC's rebuild drops
  one of two parallel `tool_use` blocks and its matching `tool_result`.
  `messages[117..]` is byte-identical at the SAME indices (1,432 messages,
  92.4%).
  **PRICED IN SEGMENTS 2026-08-16 — the layer percentages this entry carried
  are withdrawn, and so is the correction that replaced them.** The entry read
  "tools alone 1.5%, +system 2.0%, +messages[0] 5.2%, all four 100%", which is
  a byte fraction of what CHANGED rather than a recovery; the readable unit is
  the span between `cache_control` breakpoints. The 2026-08-15 replacement
  ("pinning tools alone recovers exactly zero") overshoots and is withdrawn
  too. Measured by running `tools/boundary-layers.mjs` on the event: three
  segments — `[tools, system[0], system[1]]` 38.9 kB broken by **`tools`
  alone**, `[system[2]]` 12.6 kB, `[messages[0], messages[1..]]` 2.5 MB. The
  smallest useful fix is `tools` by itself, recovering the 38.9 kB first span —
  small, and NOT zero. **The class is absorb-all-four-or-nothing for the
  BODY**, which is why every earlier single-layer design correctly measured as
  worthless against the 2.5 MB — that is a sharpening of row 24's 2026-08-05
  refusal, not a reversal of it. What changes here is that the tools pin this
  repo ALREADY SHIPS has a real, measurable first-span recovery the moment its
  state key survives the boundary, which is this entry's whole subject.
  **Why the key comes FIRST, and why nothing else is dispatchable before it.**
  The per-conversation state key rotated across the boundary:
  `…-2719b7a4-8067f43a66beb9f3` (`append-only`) -> `…-2719b7a4-aa5eb6d0c37ed62e`
  (`reset`, then `no-baseline`). The system-prompt sub-key did NOT move
  (`2719b7a4` both sides — `systemPromptSubKey` hashes `system[0]`, byte-identical
  here); it was `conversationSubKey`, i.e. `messages[0]`, that rotated. So every
  persisted pin keyed on that identity was stranded, `deferred-tool-rewrite`
  included — it forwarded CC's raw `tools[]` unchanged at the one request where
  its canonical would have absorbed layer 1. Pins that cannot be READ cannot
  absorb anything, so the other three layers are not independently buildable.
  **Design, decided.** Extend `insertion-normalization`'s existing D1 dual-read
  with a THIRD, lineage-recovered read, in the same shape and with the same
  rules D1 already follows (read under the recovered key, always WRITE under
  the new one, so a conversation migrates on its first post-resume request and
  never writes two buckets). When both the pre-pipeline key and the rotated key
  miss (`prior === null`), scan this session's own canonical files and adopt the
  one whose stored per-message hashes share >= `LINEAGE_THRESHOLD` with the
  incoming array, using `sameLineage`/`lineageOverlap` — never re-derived
  (three confident wrong answers in this repo came from hand-rolled identity).
  No schema change is needed: the canonical already persists `{index, h, r, o}`
  per message (`computeIdentities`, `insertion-normalization.mjs:317`), and `h`
  is the comparand.
  **PLACEMENT DECIDED 2026-08-16 — the entry said "IMPORTED from `replay.mjs`"
  and that direction is WRONG, which is a decision the executor must not be
  left to make.** `git grep 'from "\.\./\.\./tools/'` over `proxy/` returns
  ZERO: no deployed file imports from `tools/` today, and the deployment pin
  `CACHE_FIX_PROXY_TREE_PIN` hashes the `proxy/` tree ALONE. An extension
  importing `tools/replay.mjs` would put deployed code outside the pin, so the
  pin would go on reading "unchanged" while the serving behaviour moved —
  a silent-failure surface, not a style question. The existing direction is the
  opposite and is already established: `tools/boundary-layers.mjs:54` imports
  `conversationSubKey` from `../proxy/extensions/message-hash.mjs`, which
  dev-loop names as THE shared identity primitive. So: MOVE
  `LINEAGE_THRESHOLD`, `lineageOverlap` and `sameLineage` into
  `proxy/extensions/message-hash.mjs` and RE-EXPORT them from `tools/replay.mjs`
  so the existing consumer (`tools/bust-triage.mjs:94`) keeps working untouched.
  **ADAPTER DECIDED 2026-08-16, second unstated decision:** `lineageOverlap(a, b)`
  reads `a.inHash` / `b.inHash` ARRAYS (`replay.mjs:1250-1257`), not the
  `{index, h, r, o}` canonical shape, so the caller builds
  `{ inHash: stored.map((x) => x.h) }` and the same from
  `computeIdentities(messages)`. Note the denominator is
  `Math.min(setA.size, setB.size)` — the very property that produced the argmax
  defect below, which is why the selection rule that follows is load-bearing
  rather than a refinement.
  Selection rule, and it is the one this session had to FIX in the tooling
  before trusting it: overlap ADMITS, recency SELECTS — argmax of
  `lineageOverlap` is wrong because it normalizes by the smaller set, so a
  short old candidate scores 1.0 and beats the true predecessor
  (`tools/bust-triage.mjs` carried exactly that defect; see
  `test/bust-triage-lineage-recency.test.mjs`).
  **Write boundary — WIDENED 2026-08-16 by the two decisions above, and the
  widening is the point rather than a detail:** `proxy/extensions/insertion-normalization.mjs`
  (the dual-read site, `:1953-1990`), `proxy/extensions/message-hash.mjs` (the
  primitives move here), `tools/replay.mjs` (re-export, so `bust-triage` is
  untouched), `test/insertion-lineage-recovery.test.mjs` (new), and
  `tools/gate-live.mjs` — the last because closing-gate question 4 binds: the
  third read is a new fallback TIER and needs its own counter beside
  `d1OldKeyFallback`, in the same three-answer shape `collectD1Retirement`
  already uses (`hits` null when `filesScanned` is 0 — could-not-verify, never
  a clean zero), or it ships unobservable and unretirable exactly as the D1
  bridge would have.
  **ROW-3 DECLARATION, MEASURED 2026-08-16 — and it REFUTES this entry's own
  premise, which said "touches state KEYS, so it is NOT a cache-transparent
  restart".** What was actually built does not touch key derivation at all:
  the diff over `838e064^..1d0bfe2` changes no line of
  `resolveInsertionSessionKey`, `conversationSubKey` or `systemPromptSubKey` —
  the only edit to the import line ADDS names. The change adds a third fallback
  READ, reached solely when both existing reads miss. So across a restart every
  continuing session re-derives the same key it had, hits its own canonical on
  the FIRST read, and never reaches the new path.
  Executed evidence, not reasoning: `node tools/verdict-ab.mjs f69cb78 1d0bfe2`
  reports **IDENTICAL across 3,223 verdict lines over 19 corpora**, exit 0 —
  and that tool exits 2 with COULD-NOT-VERIFY on an empty or unreplayable
  corpus, so the zero is a measurement rather than an absence.
  **What that evidence does NOT establish, stated because the two are easy to
  merge:** IDENTICAL proves the change is INERT on existing shapes, which is
  exactly the restart-transparency question. It says nothing about whether the
  new path WORKS — the committed corpus is curated for structure and may never
  produce the double-miss state the third read exists for. That half rests on
  the new bites and the desk probe, not on this run.
  Restart cost therefore re-derived: `restart-exposure --window-min 60` reports
  4 live sessions and a ~784k worst case, but that figure assumes forwarded
  bytes change for all of them. They do not — the measurement above says
  forwarded bytes are unchanged for any session whose canonical resolves, which
  is every continuing one. The residual exposure is confined to sessions
  already in the miss path, i.e. already resetting.
  Still deployment-coupled: it states its threat-matrix row-3
  declaration first, is priced with `tools/restart-exposure.mjs` against LIVE
  sessions rather than the corpus, ships via `docs/runbooks/ship-proxy-change.md`,
  and needs the dotfiles `CACHE_FIX_PROXY_TREE_PIN` bump plus a restart at a
  stated session boundary.
  **Verifier:** a new `test/insertion-lineage-recovery.test.mjs`, red-first
  against the CURRENT implementation — the fixture is the measured shape above
  (a rotated `messages[0]` over an array sharing >= threshold with the stored
  canonical must RECOVER the canonical instead of logging `no-baseline`), plus
  two controls that must stay green: an unrelated co-tenant sidecar below the
  threshold is never adopted, and an ordinary same-key request never reaches
  the third read. Then `node tools/replay.mjs <capture> --env …` green under the
  SERVING config, and `npm test`.
  **EVIDENCE WAS UNPROTECTED — RESOLVED 2026-08-16 (later the same day), and
  the correction is left in place rather than deleted because the paragraph was
  stale in the REASSURING direction's opposite: it named a live risk that no
  longer exists, and a reader taking it at face value would re-derive an
  eviction hazard and a blocked operator decision that are both gone.** The
  capture behind s-captureBR is now IN `captures-protected/` (protected
  2026-08-16T08:27:25Z), it has grown to 4.42 GB, and the protected set holds
  6.01 GB against a cap since raised to 8 GiB. Read from the world (the
  protected directory and `--protect-status`), not from this entry — which is
  the point: this paragraph's own numbers (2.87 GB, unprotected, 1.67 GB of a
  4 GiB cap) were true when written and were still being quoted hours later by
  a fresh reader who had read the ENTRY rather than the directory.
  What the original paragraph got right and keeps: the claim was made without
  `--protect`, which is exactly the miss dev-loop records against that flag,
  and closing-gate question 2 fired on this entry's own basis. What is no
  longer true: the eviction risk, and the dependency on the cap decision.
  **Done-criterion — NARROWED 2026-08-16 on operator GO, resolving review
  finding F4.** It read: "on a replay of s-captureBR the post-resume request
  resolves its canonical (no `no-baseline`) AND `deferred-tool-rewrite` reports
  `description-absorbed`/`rewrite`". The second clause is unreachable from this
  entry's write boundary — that extension holds its own state file and its own
  two-key read and has no third read — so the criterion demanded of this entry
  something only a DIFFERENT entry can deliver.
  It now reads, in full: **on a replay of s-captureBR under the SERVING gate set
  (`CACHE_FIX_VOLATILE_PIN=1` included — a plain-mode replay proves nothing
  here, per F1), the post-resume request resolves its canonical and logs no
  `no-baseline` from `insertion-normalization`.** That is this change's whole
  claim: the pin becomes READABLE across the boundary.
  What the narrowing deliberately gives up, so nobody reads it as a win: the
  38.9 kB first-span recovery is NOT demonstrated by this entry any more. It
  moves to the tools-layer entry below, and until that ships this mitigation
  buys a readable canonical and no measured cache recovery. Layers 2-4 remain
  separate entries named in matrix row 24, none worth building before the key
  survives.
  **Sibling enumeration (ship-time, per dev-loop):** the same rotation happens
  at compaction and at an idle boundary (row 29), where re-serving a stale
  canonical is NOT obviously safe — this entry's safety argument reaches the
  resume case, where the incoming array is 98.5% the stored one, and is stated
  as not reaching a compaction, whose whole purpose is to replace history.
  Anchor: row 24
  Write-set: proxy/extensions/insertion-normalization.mjs, test/insertion-lineage-recovery.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/insertion-lineage-recovery.test.mjs
  <!-- entry: "resume-tolerant state key gates four-layer resume absorption" -->

- **RECORD 2026-08-16 — the serving-gate lint is a hand-run tool; wiring it into
  the suite or the pre-push hook waits on both known offenders being
  repaired.** Named missing element, not a preference: the lint is RED on main
  today (one offender) and red on `wip/resume-key-third-read` (the second), so
  wiring it now makes every push red and trains the `--no-verify` reflex the
  repo's own rules call the way a guard dies. It also must not be wired by
  exempting the two offenders — an exemption there silences the instrument on
  the day it was built.
  **Trigger, computable:** `node tools/serving-gate-lint.mjs` exits 0. At that
  point the wiring decision is between the suite (a bite that runs the lint over
  the real tree) and `tools/git-hooks/pre-push`. Recommendation: pre-push, not
  the suite — the lint reads `/health`, so a suite bite would go COULD NOT
  VERIFY on any machine with no proxy running and a suite has no third answer to
  express that in.
  **TRIGGER HALF-FIRED 2026-08-16 (`92ce3dd`), and the remaining half is a
  QUESTION rather than a repair.** Main is CLEAN — `node
  tools/serving-gate-lint.mjs` exits 0 on `main`, measured at that commit, so
  the first of the two named offenders is gone. The second lives on
  `wip/resume-key-third-read`, which `f0`'s grading calls wrong-by-approach
  (F6: the per-miss parse-every-candidate scan is a design defect; the entry's
  own save-time lineage index is the right shape), so that branch may never
  land in its current form. Wiring pre-push on main today would therefore go
  red only for whoever pushes THAT branch — which is arguably the instrument
  working, not the override-reflex hazard this entry was written against.
  **What this entry now waits on, named:** the row-24 redesign's disposition of
  `wip/resume-key-third-read` — rebuilt on the lineage-index shape (its test
  gets the serving pair as it is written, and no offender exists) or dropped
  (nothing left to be red about). Either outcome makes the wiring
  unconditional; wiring before it means guessing which.
  Anchor: tools/serving-gate-lint.mjs
  Write-set: tools/git-hooks/pre-push (or test/), decided at wiring time
  <!-- entry: "wire the serving-gate lint into a gate once both known offenders are repaired" -->

- **PARKED 2026-08-16 (desk finding, relayed, then downgraded by its own author
  the same hour) — `shape-watch`'s staleness verdict asserts a cause it has not
  checked, and what the number underneath it means is UNSETTLED.** Two separable
  halves, and only the first is established.
  **Established, code-read and executed:** `shape-verdicts.mjs` takes
  `max(ledger.keys[*].lastHarvest)`; `harvest.mjs:1480` skips a capture
  (`if (count <= prior.requests) continue;`) BEFORE the `lastHarvest: now` write
  at :1522, so the field advances only for captures that GREW or are new — it
  never tracks "did the timer run". The verdict's own sentence, "the timer is not
  watching", is therefore measurably false: `systemctl --user list-timers` shows
  `cache-fix-harvest.timer` active, last run 2026-08-16 08:48:42 CEST, exit 0.
  The WORDING is wrong regardless of what follows.
  **NOT established, and this is why the entry is parked rather than ready:**
  whether the 75h reading is benign. A brand-new capture has no `prior`, so it
  should not be skipped and SHOULD refresh the field — yet 37 captures sit on
  disk against 289 ledger keys of which 287 are `gone`, and the newest
  `lastHarvest` is 08-13. Those facts do not reconcile.
  **Named missing evidence (the park's trigger):** that reconciliation. Until it
  exists, the run-marker design the finding originally carried is not adoptable —
  it presumes the number is harmless, which is exactly the unsettled half.
  Anchor: tools/shape-verdicts.mjs
  Write-set: tools/harvest.mjs, tools/shape-verdicts.mjs
  <!-- entry: "shape-watch staleness verdict anchors to lastHarvest, which means last GREW" -->

- **RECORD 2026-08-16 — REFUTED THE SAME HOUR, kept for the lesson and not as
  work: "two captures expired before harvest and nothing a human reads said
  so".** The finding was relayed by the desk, retracted by the desk, and the
  retraction was checked here against the code rather than accepted as
  testimony. Both halves of it were wrong.
  **There IS a reader.** `retentionVerdict` (`tools/shape-verdicts.mjs:158`)
  exists for exactly this, reports "N capture(s) expired before harvest
  finished", and works by acknowledge-by-commit — a newly `gone` key warns until
  the ledger commit acknowledges it. The claim that the verdict layer "stayed
  silent" asserted an absence nobody had looked for.
  **And the observation was manufactured by the probe that reported it.**
  `entry.gone = true` and `report.expired.push(...)` run in the same loop under
  the same guard (`tools/harvest.mjs:1437-1440`), while the ledger write is
  behind `if (!args.dryRun)` (:1533). The finding came from a `--dry-run`: it set
  the flag in memory, printed the WARNING from it, and discarded the flag
  unwritten. The alarm described as reaching nobody was printed by the reporter's
  own terminal. Both keys are `gone: false` in working and committed ledgers,
  while 287 others are gone and acknowledged in both — the mechanism working as
  designed.
  **The lesson, which is why this is booked at all:** the non-event rule in its
  purest form. A probe whose output LOOKS like a finding is the instrument, and a
  dry run is a mode in which mechanisms deliberately do not complete — an absence
  observed under `--dry-run` is not an absence in production. Class:
  instrument-not-ruled-out. Mechanism: none — this is the judgment remainder the
  dev-loop already names, with the operator and the peer channel as backstop.
  <!-- entry: "REFUTED: expired-before-harvest reaches no verdict — the dry run manufactured it" -->

- **RECORD (regraded from READY, seventh derivation — the oversize-blob push
  guard backstops the irreversible half) 2026-08-17 — `harvest --pin` sizes a pin by the CONVERSATION's
  depth, so a deep session's pin is unpublishable, and nothing on the write
  side says so.** Measured today: freezing the 686k row-6 pair (n=733->734)
  produced a **188 MB** fixture in `test/fixtures/harvested/` — 4x the
  largest pin this repo has ever tracked (45.8 MB) and over GitHub's 100 MiB
  hard per-file limit, i.e. it could have been committed and then failed at
  push, with the bytes already in `main`'s history that FORK-NOTES.md forbids
  rewriting.
  The READER half SHIPPED today (`tools/oversize-blob-guard.mjs`, wired into
  `tools/git-hooks/pre-push` ahead of the suite; red-first proven live at
  101 MiB, negative control at 45 MiB green). **This entry is the WRITER
  half, which is still running**: the pin is built full-prefix-from-0 by
  construction, so the next deep-session walk produces the same artifact and
  only learns at push.
  **The mismatch under it, stated as the design question rather than a fix:**
  pin granularity is fixed while FINDING granularity is not. Today's finding
  was a `tools[]` SHAPE — two arrays, a few KB — and the runbook's freeze
  table ("byte divergence, message shape, migrations -> the CAPTURE (pin
  it)") routed it to the whole prefix. A stability or divergence-index
  finding genuinely needs the prefix; a tools-shape or state-key finding does
  not.
  Design, decided: `harvest --pin` refuses to write into the tracked tree
  above the guard's block threshold — imported from
  `tools/oversize-blob-guard.mjs`, never restated, so one number moves both —
  and writes to `~/.local/share/cache-fix/bust-evidence/<date>/` (mode 0600)
  instead, printing the alias-citation line the runbook already requires.
  That is a REROUTE, not a refusal to freeze: the evidence still exists, it
  just stops being a public-history problem. Whether a narrower
  finding-scoped pin should also exist is NOT decided here and is explicitly
  out of this entry's scope.
  Red-first: today's own case is the fixture — pinning n=733..734 of
  `s-captureBS` must land in `bust-evidence/`, not in
  `test/fixtures/harvested/`, and a shallow pin (any existing tracked pin's
  range) must still land in the tree. The two arms must DIFFER; a version
  that reroutes everything passes the first arm and fails the second.
  The DOC half is already done (same commit as the guard):
  `docs/runbooks/bust-appears.md` step 11 now carries the size caveat and the
  granularity rule — pin only when the finding needs the PREFIX — so this
  entry is the code half alone.
  Done: a deep-session pin lands machine-local with its citation line, a
  shallow one still lands tracked; entry moves to `## Done` with its ref.
  Loop stage: SEE (evidence retention for every later stage).
  Anchor: tools/harvest.mjs
  Write-set: `tools/harvest.mjs`, `test/harvest-pin.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/harvest-pin.test.mjs
  <!-- entry: "harvest --pin sizes by conversation depth; deep-session pins are unpublishable" -->

- **RECORD (DEMOTED from the scheduled head 2026-08-17 to make room for row
  6's preload mitigation, and it does not meet the READY bar as written) —
  three ingestion lanes reach the same event and two disposition
  VOCABULARIES reach the matrix, with nothing reconciling or deduping them.**
  **The named gap that demotes it:** the design says "a matrix event carries
  the LANE it entered by and the event identity (timestamp + session) it was
  dispositioned under" — and the matrix carries no such per-event data today,
  nor does this entry specify its shape or where it lives. A fresh context
  cannot execute that without making a data-model decision, which is exactly
  what READY promises it will not have to do. Everything below stands; what
  it needs to return to the head is one paragraph deciding where per-event
  lane+identity is recorded. Nothing here is judged less valuable than the
  head's other nine — the head is at its cap of ten and this is the one
  member with a design decision still open.
  Operator, 2026-08-07: "there are two ingestion lanes right? when I report,
  but at the same time we sweep on a schedule — two lanes but they converge on
  results I assume." Three, and they converge on the CARRIER but not on the
  VOCABULARY. From `dev-loop.md`'s own index:
  - `bust-appears` (❄ / operator / `--list`) ends at **mitigated / parked /
    controlled-cause / upstream-filed** — four values, all answering "what did
    we DO about it";
  - `sweep-finding` (the daily gate, nobody present) ends at **regression /
    known-open / non-defect / instrument-defect / new-class /
    could-not-verify** — six values, all answering "what KIND of thing is it";
  - `runtime-anomaly` (our own detectors) ends at "the sweep's six, plus
    open-booked".
  So two of three share a vocabulary and the bust lane's is DISJOINT from it.
  The axes are legitimately different — one is a disposition, the other a
  classification — but the same EVENT can enter by any door, and which door it
  came through decides which shape of answer it gets.
  **The concrete risk, measured 2026-08-07:** the sweep last ran 2026-08-06
  07:35Z and is RED (`ok:false, failing:1`); the next run is due 07:15 CEST.
  Today's three busts (03:49 local 419k, 06:08 203k, 06:17 230k) were all
  ingested through the bust lane, two of them dispositioned. Nothing tells the
  sweep that. It can re-raise a dispositioned event as a fresh finding, and a
  reader has no way to see that the two records describe one event — the
  duplicate-under-two-names shape the dev-loop already documents for class
  names ("one phenomenon reached from two directions grows two names"), here at
  the level of whole lanes.
  Design: one reconciliation point, not a merged vocabulary — the vocabularies
  stay distinct because the questions are. A matrix event carries the LANE it
  entered by and the event identity (timestamp + session) it was dispositioned
  under; the sweep consults that before raising, and an event already
  dispositioned by another lane is reported as `already-dispositioned (<lane>,
  <date>)` rather than as a new finding. That is a set difference, not a
  judgment call.
  Verifier, red-first: run the sweep against today's ledger with the two
  dispositioned busts in the matrix — today it raises them as findings, which
  is the red; after, it names them as already-dispositioned and raises only the
  419k, which genuinely is not walked. Negative control: an event no lane has
  touched must still be raised normally, so the reconciliation cannot become a
  silencer.
  Anchor: docs/runbooks/bust-appears.md
  Write-set: tools/bust-triage.mjs, docs/runbooks/bust-appears.md, test/bust-triage-reconcile.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-reconcile.test.mjs
  <!-- entry: "two disposition vocabularies reach the matrix unreconciled" -->

- **RECORD 2026-08-14 — the PR-round doorbell has a WRITER and no READER, and
  that cost eight days of silence on two open rounds.** RECORD and not READY
  on purpose: the realizing write is a hook in the dotfiles repo, outside this
  repo's boundary, so the dispatchable entry lives THERE (booked same day) and
  this is the fork-side record of why it exists. An entry graded READY here
  would be dispatchable by nobody — its write-set resolves to no path in this
  repo, which the READY bar catches and did. `tools/pr-rounds.mjs`
  runs, works, and writes its verdict to the XDG state root; its own header
  says the reader belongs in dotfiles' session-start attention line and was
  out of that member's reach. Nobody built it. Measured today: `--dry-run`
  reports rounds open on **#276 since 2026-08-06T12:58:37Z** and **#306 since
  2026-08-06T19:41:40Z** — the ball in our court for eight days, while three
  sessions' handoffs said nothing about either.
  **This is the failure the writer was built to prevent**, recorded in its own
  header from 2026-08-06: a hand `gh pr list` found #273 merged 42 minutes
  earlier and a round open on #278 for 33 minutes, "both invisible to the
  session, whose own handoff still read 'the ball is with upstream'". The
  writer fixed the measurement and not the noticing.
  Design, decided (it is the writer's own stated design, not a new one): the
  reader is a SessionStart attention line in dotfiles' `claude/hooks/`,
  reading the writer's JSON under the same three states the gate-red doorbell
  already uses — count when >0, silent at zero, `stale` when `finished` is
  older than ~3h, silent when the file is absent. A timer runs the writer
  hourly.
  Done-criterion: a session opened with a round outstanding SEES it in its
  first screen without anyone running `gh`.
  Realizing boundary: the dotfiles repo (hook + timer), booked THERE as well —
  this entry is the fork-side record of why, and it retires when the dotfiles
  entry does.
  Loop stage: VERIFY.
  Anchor: tools/pr-rounds.mjs
  Realizing boundary: the dotfiles repo — hook plus a user timer.
  <!-- entry: "pr-round doorbell has a writer and no reader" -->

- **RECORD 2026-08-14 — row 31 is UPSTREAM-FILED, and the slice is narrower than
  the mitigation because the gates said so.** PR
  `cnighswonger/claude-code-cache-fix#337` (`pr/coalesce-sidecar`, cut from
  `upstream/main` per `docs/runbooks/upstream-pr-slice.md`), opt-in behind
  `CACHE_FIX_COALESCE_SIDECAR=1`, body carrying the measured population (144
  pairs / 114 streaks / 55 double-billed) and the retry class as the design
  constraint rather than as a caveat.
  **What the slice does NOT carry, decided by a gate rather than by taste:**
  the coalesce RECORD half (`4c6c061`) refused at two of the runbook's steps —
  cherry-pick conflicted on fork-only paths (`BACKLOG.md`, the bust-triage and
  census suites) because they do not exist upstream, and `slice-preflight`
  then named five static imports in `test/coalesce-record.test.mjs` reaching
  the census/harvest stack. Ported anyway it would have widened this PR into
  #276's topic, so it rides with that work; the PR body says so rather than
  leaving the omission to be discovered.
  `tools/tmpdir.mjs` rides along as its own commit — the topic's test imports
  it and upstream has no equivalent. All four slice gates green: fork-only
  sweep no hits, preflight clean, `absence-scan --git-range` clean, full
  upstream suite 1795/1796 with 0 fail.
  **Also filed: `#336`**, the one-file fix for upstream's hardcoded test port,
  proven as a controlled pair (9876 held: before 42/43, after 43/43). It is a
  separate PR rather than a rider because upstream asked for unrelated changes
  to be lifted out of PRs.
  Loop stage: RETIRE (upstream fixes theirs).
  Anchor: docs/directives/robustness-threat-matrix.md
  <!-- entry: "row 31 filed upstream as PR 337" -->

- **RECORD 2026-08-14 — FOUR instances of one class in one day, and the day
  was SPENT fixing the first one.** The class: reporting the state of an
  artifact without opening it. Booked as a record rather than a fix because
  the corpus rule already exists and is loaded — this is evidence about its
  firing, and the next fire-rate review is its consumer.
  1. The #276 blocker (2026-08-06, a prior session): fork-main's line numbers
     reported as the pushed ref's. Cost eight days of a blocked review.
  2. The `#82642` comment's opener said "Third platform". Inherited verbatim
     from this repo's own backlog headline, never checked against the filing
     it describes — our own 2026-07-29 comment says "linux" in its first
     sentence. Corrected in place by the review session; the headline itself
     is corrected above, because the entry is the writer.
  3. The handoff written to hand this work over asserted the 2026-07-29
     comment "carries no AI-attribution footer". It carries one. I did not
     open it.
  4. The same handoff asserted my published `#82642` comment "restates the
     macOS reporter's figures". It does not — `grep -cE '48,404|47,081|1,279'`
     over the published body returns 0. I did not re-read what I had posted.
  **The shape, and why the third and fourth are the interesting ones:** 3 and
  4 are claims about MY OWN output, made hours after producing it, in the very
  document whose purpose was to let someone else check my work. The corpus
  names that case exactly ("one's own past output is the same altitude
  question, at the claim moment only"), and it was loaded all day. Both were
  cheap to check — one API read each — and both were made in the register of
  recollection rather than of assertion, which is the tell the rule names.
  A fifth, adjacent and caught by the reviewer rather than by me: the #78420
  draft said the non-double-billed streaks "are retries that were never
  answered". The fields I QUOTED IN THE SAME PARAGRAPH refute it — 114
  streaks, 78 billed, 55 double-billed, so 23 of the 59 were billed exactly
  once and only 36 were never answered. Not an unopened artifact this time but
  an uncomputed subtraction over numbers already in hand, which is the same
  failure with the source sitting in the sentence.
  No mechanism proposed: every instance was catchable by one read or one
  subtraction, and a guard that fires on "did you open it" has no computable
  predicate. The operator is the backstop, and today the backstop was a peer
  session doing exactly the review it was handed.
  Loop stage: VERIFY.
  Anchor: docs/runbooks/public-comms.md
  <!-- entry: "four unopened-artifact claims in one day" -->

- **RECORD 2026-08-14 — the #276 blocker is settled by measurement, and the
  cause is NOT the one both sides assumed.** Upstream reported that
  `pr-276-head` (`e8574b6`) still carries the old `NAME_UUID_PREFIX`
  (`[^0-9a-f]` form, line 97) and `SCANNABLE = /\.jsonl?$/i` (line 268), file
  length 402 — against our 2026-08-06 comment claiming both fixes were in at
  `:139` and `:359`. **Upstream is right.** Their hypothesis was that the
  rebase dropped the carrying commit; measured, no such commit ever existed:
  for each commit touching `tools/absence-scan.mjs`, greping its own blob for
  `zA-Z` returns ZERO hits on `pr/verification-tools`, on
  `backup/verification-tools-pre-rewrite`, and on `pr/absence-scan` — while
  the same loop over fork `main` returns three (`f228720`, `148b5e7`,
  `5631334`). Same result for `SOURCE_SCANNABLE`. The positive control is the
  load-bearing half: the first run of that probe returned zero on `main` TOO,
  because zsh reads `$c:tools/…` as the `:t` history modifier — an empty
  result shaped exactly like a clean absence, caught only because a control
  was run. (Environment class: the corpus's "Bash idioms that read as SUCCESS
  under zsh" covers `$VAR` splitting and `PIPESTATUS`, not this member.)
  So the failure is one step EARLIER than "shipped fork-side ≠ in the pushed
  ref": our comment cited line numbers from fork-main's *current* file (993
  lines today) and reported them as the branch's (402 lines). One
  `git show pr-276-head:<path>` before writing would have caught it, and that
  is exactly the instrument upstream used.
  CONSEQUENCE FOR THE FIXES: they belong on `pr/absence-scan` (#306), not
  here — Chris's Q1 put scanner ownership there, and `fb9763b` carries the
  same two old forms. Pushing them to both refs forks the scanner.
  Loop stage: VERIFY.
  Anchor: BACKLOG.md `## Upstream PR round`
  Write-set: pr/absence-scan (the two changes), pr/verification-tools (rebase
  onto 4ab9cf8, drop the scanner pair, lift the
  `test/insertion-suppression.test.mjs` rider) — both pushes operator-GO-gated
  **BOTH ROUNDS ANSWERED 2026-08-14 on operator GO.** The two agreed changes
  are pushed to `pr/absence-scan` (`20365e1`) and READ BACK OUT OF THE REF
  before the comment was written — `pr-306-head` = `20365e1`, 479 lines,
  `NAME_UUID_PREFIX` at `:113` in the `[^0-9a-zA-Z]` form, `SOURCE_SCANNABLE`
  at `:343` — which is the step whose absence caused this entry.
  Comments: #306 `issuecomment-5296435924`, #276 `issuecomment-5296436518`.
  STILL OPEN and deliberately not done: the #276 branch work (rebase onto
  `4ab9cf8`, drop the scanner pair once #306 lands, lift the
  `insertion-suppression` rider). The comment asks upstream which sequencing
  they want, because either order costs a force-push and their answer decides
  which diff they have to read. That question is the round's live half.
  <!-- entry: "the 276 fixes were never on the branch" -->

- **PARKED 2026-08-14 — the push scan's interior walk diffs each commit against its
  FIRST PARENT only, so a merge commit's second-parent-only content is out of
  reach.** Named by the range-interior lane; it did not widen past the design, which
  was right. This is a PRE-EXISTING limitation the endpoint diff already carried —
  the lane inherited it rather than introducing it.
  MISSING EVIDENCE, named: whether any content can reach `origin` through a
  second parent that is not also reachable through the first. On this repo's
  merge topology (fork main merging `upstream/main`) the answer is plausibly yes
  for upstream-authored blobs, but nobody has measured it, and upstream content is
  not the leak class this guard exists for. What would un-park this: one measured
  instance of a blob reachable only via a second parent in a range this repo
  actually pushed.
  Loop stage: VERIFY.
  Anchor: tools/absence-scan.mjs
  <!-- entry: "absence-scan interior walk is first-parent only on merge commits" -->

- **PARKED 2026-08-14 — the EXPENSIVE duplicate population is a RETRY after
  an incomplete first attempt, not a double answer, and the named missing
  evidence is why the first attempt did not complete.** 15 mid-session
  streaks, and they carry 2,873,059 of the 2,921,262 input-side tokens the
  whole double-billed population costs — 98% of the money is here, and it is
  NOT the class row 31 describes.
  **The measurement** (`tools/duplicate-billing.mjs`, joining the capture
  outcome's `requestId` to `usage.jsonl`'s `request_id`): 14 of the 15
  streaks have their FIRST member `NOT-IN-USAGE-LOG` while every second and
  later member joins cleanly with a real final `output_tokens` (175..8,077).
  The remaining streak is a 3-member fable run where all three joined
  (606/517/572). Position is exact: all 14 unjoined members sit at index 0 of
  their streak, and 94 of 94 session-start members joined — so "missing" does
  not correlate with being first, it correlates with being a mid-session
  first send.
  **What that means, read off the WRITERS rather than the field names.** The
  capture outcome is written on `message_start` (`request-capture.mjs:311`),
  so an outcome record proves the request reached the model and was charged
  input-side. `usage-log` appends only on `message_delta` and only when a
  `message_start` was seen for that response (`usage-log.mjs:321,324`), so an
  absent usage record means no completion frame was observed. First send
  charged, no completion; second send completes. That is the retry shape, and
  it is why the 2026-08-02 entry's "CC received a COMPLETE answer and
  discarded it" reading does not survive.
  **NAMED MISSING EVIDENCE, and it is what keeps this parked rather than
  ready:** WHY the first attempt produced no completion frame. Three live
  candidates, none measured — an upstream error or stream abort (the proxy's
  own `upstream-errors.jsonl` at those timestamps is the first place to
  look), a client disconnect (CC cancelling, e.g. an interrupted turn), or a
  proxy-side stream failure, which is the one that would make this OURS. The
  attribution rule binds here: until that answer exists, no mitigation for
  this class may be designed, and the 2.87 M figure is a cost observation,
  not a defect claim.
  **What must NOT happen meanwhile:** any byte-identical-adjacent dedupe or
  coalescing built for row 31 must be scoped so it can never reach this
  class. Suppressing the second send here would leave a real retry
  unanswered — the mitigation that saves 48 k tokens would break the
  conversations that account for 2.87 M.
  <!-- entry: "mid-session duplicate streaks are retries after an incomplete first attempt" -->

- **RECORD 2026-08-14 — the double-billed duplicate population is TWO
  populations, and three independent axes agree on the split.** Full corpus,
  118 duplicate streaks of which 62 are double-billed (evidence pinned in
  `census-rows-2026-08-14.json`; the discriminators shipped in `f1994ce`):
  - **47 haiku sidecar streaks** — `model claude-haiku-4-5`, `nMsg=1`,
    `max_tokens=32000` — ALL at capture lines 3-5 (session start), intervals
    **6 to 25 ms** (p50 14 ms).
  - **15 main-thread streaks** — opus-5 (6), fable-5 (6), sonnet-5 (3),
    `max_tokens=64000`, nMsg 1..412 — ALL mid-session, intervals **3.5 to
    63 s** (p50 12.3 s).
  Model, capture position and interval are three independent axes and they
  partition the population the same way, which is what makes this a split
  rather than a sort. The 2026-08-02 entry's hand-derived version of this
  (24 sidecar / 7 main-thread) reproduces at 4x the scale.
  **What is NOT a retry, and what is still open.** A 6-25 ms gap between two
  byte-identical sends is not a backoff, so the sidecar family is not retry-
  shaped by interval alone. The mid-session family's intervals ARE
  retry-plausible, and the capture cannot settle it: it stores no response
  bytes and its `usage.outputTokens` is the message_start placeholder. The
  join that can settle it exists and is fully populated — every one of the
  125 double-billed members carries an outcome record AND a `requestId`, and
  `usage.jsonl` covers 2026-08-05 onward with `request_id` on 48,256 of
  48,256 records. `tools/duplicate-billing.mjs` is dispatched to run it.
  **The cost, stated as what it is:** across those 125 members the capture's
  own outcome records carry 5,255,225 cacheRead + 458,166 cacheCreation +
  96,464 input tokens of input-side charge. That is the total over every
  member including the legitimate first send; the duplicate-attributable
  half is what the dispatched tool computes (members beyond the first in
  each streak), and it is not restated here as a guess.
  **The calibration fact worth keeping:** 56 of the 118 streaks are NOT
  double-billed (31 carry zero outcome records, 20 carry exactly one), which
  is the retry population behaving correctly and is evidence that
  `doubleBilledStreaks` is not firing on ordinary traffic.
  <!-- entry: "double-billed duplicates are two populations: haiku sidecar at session start, main thread mid-session" -->

- **RECORD 2026-08-14 — the volatile-block sweep's byproduct, which is the
  measurement #272 blocker 2 has been waiting for: the change population is
  entirely REMOVALS, and IN-PLACE TEXT EDITS ARE ZERO.** Full corpus, 46
  captures considered / 43 with pairs, 0 unreadable (evidence pinned in
  `census-rows-2026-08-14.json`, `148b5e7`; captures s-captureBO / s-captureBA
  / s-captureBP protected against rotation): 1,224,062 re-occurrences of a
  pinned identity, 69,375 of them where the pin rewrites bytes at all, 29,185
  IDENTICAL and **40,190 CHANGED** — and the change kinds are `VANISHED`
  40,170, `REDUCED` 20, `IN-PLACE-TEXT` **0**, `APPEARED` 0, `AUGMENTED` 0.
  Distinct pinned entries behind those rows: 542 (541 VANISHED, 1 REDUCED —
  the singleton sits in s-captureBO at request 239, 496 bytes down to 748…362
  with first divergence at offset 43). `cacheControlExempt` is 0, so none of
  these rows is one the shipped pin would have declined to override.
  **Why it is decision-relevant rather than trivia:** the blocker asks which
  repair the pin needs — an evidenced allowlist, or a fail-closed re-pin —
  and the answer turns on how often CC *changes* volatile bytes as against
  *re-serializing* or dropping them. Under this classification, changing the
  text in place has zero instances corpus-wide, and every counted change is
  the reminder going away.
  **What this does NOT establish, named rather than glossed:** the
  classification is `classifyVolatileChange`'s, so "0 IN-PLACE-TEXT" is a
  statement about that predicate's partition and not an independent
  measurement of the upstream reviewer's reproduction — which was a real
  observation and is not refuted by a corpus-wide zero in a different
  vocabulary. No second instrument has measured this quantity, so there is
  no divergence check on it (the cheap reach detector this repo prefers).
  **Missing piece that would make this READY:** the #272 blocker-2 design
  decision itself (allowlist vs fail-closed re-pin), which is a desk/operator
  design call, not an evidence gap — this entry is the evidence half, and it
  is now on disk instead of in a capture.
  <!-- entry: "volatile-block sweep byproduct: every counted change is a removal, zero in-place text edits" -->

- **RECORD 2026-08-13 — the 6-bust burst in the Georgendorf session is NOT a
  breakpoint-layout change, and the desk hypothesis that said it was is
  REFUTED. `cache_control` marker layout is byte-identical across warm and
  cold requests.** Six full-context rewrites (`cache_read` exactly 0) between
  11:33:46Z and 11:37:09Z, ~1.51 M tokens re-billed, session ddd83862,
  model `claude-fable-5`, context ~247k. Prefix-diff records `system: match`,
  `tools: match` and a pure message append at every one of them.
  **The desk hypothesis, stated so the refutation is checkable:**
  `cache-control-normalize` (order 400, live) strips every user-message
  `cache_control` and re-applies ONE at the last user message's last block;
  the desk argued this collapses CC's multi-breakpoint scheme to a single
  tail breakpoint, removing the fallback that makes a partial hit possible,
  which would explain `cache_read` being exactly 0 rather than
  tools+system-sized.
  **What the measurement says (`tools/breakpoint-scan.mjs`, built for this,
  `c32a74a`; 22 requests scanned in 11:32:00–11:35:30Z, all markerCount>=1,
  so not a dead instrument).** CC's RAW pre-pipeline layout is the same three
  markers on every single request, busting and warm alike:
  `system[1]`, `system[2]`, and one rolling marker at the last message's
  `content[0]`. Two of those three sit in `body.system`, which
  `cache-control-normalize` does not touch — it filters `msg.role === "user"`
  only. So the stable front breakpoints SURVIVE our pipeline, the collapse
  the hypothesis needed does not happen, and a `cache_read` of 0 cannot be
  explained by losing the fallback: the system-level entries should still
  have hit. The hypothesis is dead in its strong form.
  **The basis for "busting and warm alike", stated because the obvious basis
  is unsound and was nearly used.** The tempting join is timestamp
  proximity, and it is WRONG here — transcript stamps are assistant-message
  COMPLETION times against the capture's request-START times, so 5 of the 6
  bust stamps have no capture row within seconds and only stamp #1 lands
  within 122 ms (coincidence, not a match). The claim does not rest on that
  join and does not need it. It rests on EXHAUSTIVE ACCOUNTING over the
  window: 22 scanned + 993 outside-window + 927 skipped (boot 1, outcome
  926) = 1942 = every non-blank line read, so no request in
  11:32:00–11:35:30Z escaped the scan. Busts #1–#5 fall inside that window
  by their own timestamps, therefore they ARE among the 22 — whichever rows
  they are — and all 22 carry the same three-marker layout. Set membership,
  not a join. Bust #6 (11:37:09Z) is outside the window and remains
  unmeasured.
  **A residual on that scan, booked rather than waved past:** the rows were
  never grouped by CONVERSATION — see the entry below — so this argument is
  about all traffic in the window, not about one conversation's traffic.
  That is sufficient for the refutation (every member has the property) and
  is NOT sufficient for any claim about how the layout EVOLVES, which is why
  Q4's "advances by exactly 2 per request" is recorded as an observation
  over an ungrouped sequence rather than as a property of the busting
  conversation.
  **What the refutation does NOT settle, which is now the open question.**
  `cache_read` 0 means even the `tools`+`system` prefix missed, while both
  compare equal. The next discriminator is the marker VALUE rather than its
  location: `cache-control-normalize` writes `{ type: "ephemeral" }` with no
  `ttl` field, so if CC's own markers carry `ttl: "1h"` the rewritten tail
  marker is a TTL DOWNGRADE, and a differing ttl makes a different cache
  entry. `breakpoint-scan` records locations only, not values — extending it
  to carry each marker's `cache_control` object is the measurement, raw vs
  post-pipeline. Note the upstream sweep already surfaced
  `anthropics/claude-code#81967`, titled for tools-array mutation AND TTL
  downgrade during a session; that is a prompt to check, never a discharge.
  **Instrument note for whoever runs it:** the forwarded body is NOT
  obtainable from `session-mirrors/` — that file is a per-message
  CC-transcript envelope with no `body.messages`/`system`/`tools` (measured:
  2446 records, 0 scannable). The desk brief asserted otherwise and was
  wrong. The post-pipeline body comes from REPLAYING the capture under the
  serving config (`replay.mjs`, or `cache-sim.mjs --pipeline`), not from a
  persisted artifact — nothing persists a post-pipeline body by design,
  since `request-capture` is deliberately PRE-pipeline at order 60.
  **Join hazard, measured:** transcript stamps are assistant-message
  COMPLETION times and capture stamps are request-START times, so 5 of the 6
  bust stamps have no capture row at a matching timestamp and a
  nearest-neighbour join is wrong. Join on the request id the transcript
  already carries (`req_…`), or via the prefix-diff ledger, which shares the
  capture's clock.
  Loop stage: ATTRIBUTE. Anchor: proxy/extensions/cache-control-normalize.mjs
  <!-- entry: "georgendorf 6-bust burst — layout refuted, ttl value open" -->

- **RECORD 2026-08-13 — `gate-live`'s new LOCATED error-pin path has no
  PRODUCER: `replay.mjs` emits no ordinal marker to stderr, so every error pin
  in production is GUESSED.** The error-pin lane shipped today (`fc174b6`)
  implements the entry's design exactly — LOCATED when the child's stderr
  carries an `n=<num>` marker, GUESSED (a window around the capture's last
  known ordinal) when it does not, never conflated. **The entry's design
  premise is false and this is the finding, not the fix:** its sentence "the
  child's stderr carries the request ordinal or timestamp" does not hold.
  Measured two independent ways. The lane forced two real `replay.mjs` crashes
  and read the stderr: no ordinal, and no timestamp either. The desk
  corroborated structurally: `grep -nE "stderr\.write|console\.error"
  tools/replay.mjs` returns 11 writes, NONE carrying `n=`, an ordinal, or a
  timestamp (instrument-positive: the same pattern matches, e.g. `:2650`,
  `:2680`, `:2695`). Behaviour and structure agree, which is why this is
  stated rather than suspected.
  **This is the WRITER half of a reach failure** (`docs/dev-loop.md`: a
  finding stated as "X cannot reach Y" names only the READER, and something
  is still putting Y out of reach). The reader is built and correct; the
  producer does not exist. Until it does, the LOCATED branch is wired to
  nothing real — it has never fired on a genuine stderr and cannot.
  **Design (decided):** `replay.mjs` writes `n=<ordinal>` to stderr on the
  request it is processing when it dies — the cheapest form is a
  single-variable current-ordinal written into an uncaught-exception /
  fatal path, not per-request logging. Then gate-live's LOCATED branch has a
  real shape to match.
  **Done-criterion / red-first PAIR, both halves required:** a forced crash
  on a real capture produces a status row reading LOCATED with the correct
  ordinal, AND the same forced crash with the marker suppressed still reads
  GUESSED — the two must DIFFER, or the branch is not discriminating and a
  guessed range would read like a located one, which is the exact clause the
  original design called load-bearing.
  Loop stage: ATTRIBUTE. Anchor: docs/runbooks/sweep-finding.md
  Write-set: tools/replay.mjs, tools/gate-live.mjs, test/gate-live-rowpins.test.mjs
  Verifier: node --test test/gate-live-rowpins.test.mjs
  <!-- entry: "replay.mjs emits no ordinal marker so LOCATED never fires" -->

- **RECORD 2026-08-13 — 687 evidence pins, 29.6 MB, sit UNTRACKED in the
  working tree: the anti-rotation mechanism works at the write step and stops
  at the commit step.** Measured today: 687 untracked files under
  `test/fixtures/harvested/` (684 rowpins + 3 pinned/growth), dated 2026-08-10
  through 2026-08-13, against 210 tracked rowpins. The daily sweep writes them
  faithfully — that is closing-gate question 2's recurring-producer clause
  working — and `gate-live` deliberately never commits ("committing is a human
  act here"). Nobody has. They are durable only until someone runs
  `git clean`, invisible to a fresh clone, and any entry citing them would find
  nothing.
  **The publication gate is GREEN on all 687**, red-proven first: a planted
  session UUID was caught (`FINDING capture-uuid`, exit 2), the pile returned
  `absence-scan: clean`, exit 0, with the `live-timestamp` class-scoped
  exemptions that are documented. So the blocker is not hygiene.
  **The carrier has no collector, and the enumeration entry as written cannot
  find it.** `state-report` collects unpushed commits, rescue tags, dangling
  objects, lane branches, the gate verdict, the deployment pin and the
  fingerprint — and nothing for uncommitted evidence pins. The booked
  enumeration entry ("enumerate every `tools/` mechanism that writes state
  OUTSIDE the tree") is scoped to a LOCATION while the defect is a CLASS: pins
  are written INSIDE the tree, so that pass would return clean and miss all
  687 — the pattern-scoped-sweep blind spot `docs/dev-loop.md` already
  collects, arriving in the entry meant to close carrier gaps. The closing
  gate's own definition names "a pin" as a carrier explicitly.
  **Two halves, and the second is the durable one.** (1) An operator decision
  on committing the existing 687 (surfaced 2026-08-13; irreversible, public,
  bulk-publishes scrubbed other-session-derived fixtures whose SHAPE residual
  is an open accepted risk — desk recommendation: commit). (2) Widen the
  enumeration entry's scope from "outside the tree" to "any carrier the
  mechanism leaves behind", with these 687 as its instrument-positive: an
  enumeration that does not surface them has not run.
  Loop stage: SEE. Anchor: docs/dev-loop.md
  Write-set: BACKLOG.md (the enumeration entry's scope line), tools/state-report.mjs
  Verifier: node tools/state-report.mjs --json | grep -c untrackedPins
  <!-- entry: "687 evidence pins uncommitted, carrier with no collector" -->

- **RECORD 2026-08-13 — `alias-claim --protect` cannot be made the default
  until `--release` is wired and the cap is re-sized; both are measured, not
  argued.** `--protect` shipped 2026-08-11 and works (desk-verified today with
  a discriminating pair: link count 1 unprotected vs 2 protected; unlink both
  originals and the unprotected capture is gone while the protected one is
  readable and byte-identical). It had **zero uses** until today, because the
  one paragraph telling an author how to claim taught the command without the
  flag — fixed in `338ae82`, and the first real use followed within the hour.
  **Why default-on is NOT the next step, with the numbers.** The cap is 4 GiB
  (`CACHE_FIX_PROTECTED_MAX_MB`, default 4096). Live captures measure median
  160 MB, mean 309 MB, max 1.9 GB across 39 files totalling 11.8 GB; three
  individual captures each exceed half the cap. And `--release` exists in the
  tool but is wired to NOTHING — `git grep -- "--release"` outside
  `tools/alias-claim.mjs` and its tests returns only the doc line added today,
  so no closure verb unlinks a protection. Default-on against an undrained
  4 GiB cap fills it within a handful of claims and starts dropping the very
  protections the mechanism exists to keep, which is the failure wearing the
  fix's costume.
  **Build order, decided:** wire `--release` to the closure verb first (an
  entry reaching DONE unlinks its protection), THEN re-ask the default. The
  cap re-size is an operator decision on disk, surfaced 2026-08-13 with the
  distribution above; the desk recommendation is to leave the cap and wire
  release, since a drained set rarely approaches it.
  Loop stage: VERIFY. Anchor: tools/alias-claim.mjs
  Write-set: tools/alias-claim.mjs, test/alias-claim.test.mjs, docs/dev-loop.md
  Verifier: node --test test/alias-claim.test.mjs
  <!-- entry: "protect default blocked on release wiring and cap size" -->

- **RECORD 2026-08-13 — the backlog declares THREE grades and uses
  THIRTY-THREE; every instrument that reads grades picks a different subset,
  which is why three of them disagreed today.** Measured over top-level
  `- **WORD` bullets in live sections (everything outside `## Done`): 312
  bullets carrying 33 distinct grade words — RECORD 92, DONE 55, PARKED 45,
  RESOLVED 33, READY 31, HANDOFF 10, OPEN 10, BUST 4, PARTLY 3, then FINDING,
  NEW, CANDIDATE, CLOSED, BUILT at 2, and nineteen words appearing exactly
  once (HALF, DECISIONS, TOOL, DATAPOINT, MECHANISM, CORROBORATION, IN,
  QUEUED, UNDISPOSITIONED, INCIDENT, DECISION, ANSWERED, DROPPED, SHIPPED,
  REFRAMED, FIXED, COMMITTED, ECONNRESET, RETIRED).
  **The disagreement reconciles exactly, which is what makes this measurable
  rather than a complaint.** The session-start banner's predicate is
  `{DONE, DROPPED}` on top-level bullets outside `## Done` = **56**
  (= DONE 55 + DROPPED 1). `--closures-in-live`'s is
  `{DONE, RESOLVED, FIXED, BUILT}` = 103 whole-file, 45 under `## Open`. The
  requesting entry's headline was 43 (DONE alone, `## Open` only) — and its
  own tally "43 DONE against 20 READY, 32 PARKED and 4 OPEN" totals 99 against
  a section holding **145**, so it undercounted itself by 46 and never counted
  RESOLVED despite its own design sentence naming it.
  **Consequence, and it is why no move has run:** a mechanical move keyed on
  ANY subset of an undeclared vocabulary moves some closures, leaves others,
  and reports success — leaving the carrier non-compliant behind a clean
  verdict, on a 15,000-line load-bearing file. The prerequisite is closing the
  vocabulary: a judgment pass over 33 WORDS, not over 300 entries. That is the
  cheap half and it makes the move mechanical.
  **Already done, and deliberately only this:** RECORD was missing from BOTH
  lists that read grades and is now in both (`9ad432a`) — it is a DECLARED
  grade, so adding it aligned an instrument with the file's own declaration
  rather than deciding anything. The undeclared closure-shaped words
  (ANSWERED, CLOSED, SHIPPED, RETIRED, COMMITTED, MERGED, ACCEPTED, DROPPED)
  are the operator's call and were left alone.
  **The measuring instrument itself shipped today and is booked here:
  `6ee63de`** (the `--closures-in-live` lane: REPORT-only, sections derived
  from the file's own `^## ` headers, four buckets with zeros stated, red-first
  split of 12 fail / 110 pass with the pre-existing bites passing, pinned
  against frozen ref `7f745af` rather than the live file) and **`850f273`**
  (a regression bite for the paren-wrapped header shape).
  **`850f273` also settles a desk-vs-lane disagreement, and the LANE was
  right.** The desk cross-checked the lane's whole-file CLOSURE=103 against a
  naive `^- \*\*(DONE|RESOLVED|FIXED|BUILT)\b` line regex and got 91, and
  reported that 12-entry gap to the operator as the lane's number needing
  explanation. It was the DESK's regex that was short: 12 real closures are
  headed `- **(DONE …)**` with a leading paren, which `censusGrade`'s own
  paren-stripping handles and a naive line scan does not. Re-measured:
  91 + 12 = 103 exactly. The lesson is the one this file already collects from
  the other direction — a hand-rolled read returns a NUMBER, and a number from
  a pattern that cannot match the whole class is byte-identical to a right
  one. Mutation-proven: disabling the paren-stripping reddens exactly that one
  bite (123 pass / 1 fail); restored, 124/124.
  **Process note, recorded because the record is the only place it survives:**
  `850f273` was committed by the closures lane AFTER its closing report was
  booked and AFTER it had been told its lane was closed — the post-report
  write the dispatch rules forbid (a defect found later is REPORTED, never
  edited). The content is correct and desk-verified, so it stands rather than
  being reverted to punish the process; but the lane was resumed by the very
  message that closed it, which is the mechanism to watch, not the agent.
  Loop stage: RETIRE. Anchor: BACKLOG.md
  Write-set: BACKLOG.md (the `## Grades` section), tools/backlog-lint.mjs
  Verifier: node tools/backlog-lint.mjs --closures-in-live
  <!-- entry: "33 grade words against 3 declared, vocabulary must close first" -->

- **RECORD 2026-08-11 (evening) — `alias-claim --protect`'s protected-set size
  needs a `doctor` verdict, and that half lives in DOTFILES, not here.** The
  shipped `--protect` design (entry above, in flight) carries a capped protected
  directory with its own oldest-first eviction; a cap nobody reports is a disk
  commitment with no reader. This repo's side is `--protect-status`, which prints
  `{dir, count, bytes, capBytes, entries[]}` as JSON precisely so the dotfiles
  doctor can read it without this repo writing across a boundary.
  **This entry is a POINTER and a pointer is not a discharge** (accretion: a named
  reader who never loads the carrier makes the naming decorative — observed as a
  cross-repo booking reaching its consumer only by operator relay). The real home
  is dotfiles' own BACKLOG; until the entry exists THERE, the doctor half is
  unbooked wherever this file says otherwise. Surfaced to the operator
  2026-08-11 rather than written across.
  **RESOLVED 2026-08-13 — the entry EXISTS there, checked in the other repo
  rather than assumed from this one.** `dotfiles/BACKLOG.md:147`, graded READY
  2026-08-11, and it is decision-complete on its own terms: a verdict function
  in `bootstrap/doctor.py` running `alias-claim --protect-status` in the fork
  checkout, grading ok with count/bytes-vs-cap, WARN at ≥75% fill (because the
  eviction that follows silently drops protection — the loss the mechanism
  exists to close), and WARN-with-reason on unreadable or absent output rather
  than a silent skip. Its own done-criterion already includes "the fork's
  pointer entry re-pointed here so it resolves", which this paragraph
  discharges from our side.
  So the pointer now resolves and the doctor half is booked where its consumer
  reads. Nothing further is owed in THIS repo — and note the check was reading
  the other repo's file, not this entry's own claim about it, which is the
  distinction the paragraph above was written to enforce.

- **PARKED 2026-08-11 — the s-captureBE replay-ERROR class is unwalked and its evidence is
  GONE.** The 12:24Z sweep reported a replay error whose stderr named `auto-1m-guard` and
  `context-1m-2025-08-07` in outbound betas, a class the 08:24Z run did not have. The capture
  rotated off disk during the same session (verified: zero matches in the captures dir), so the
  instance can no longer be replayed, pinned, or attributed — this is PARKED rather than READY
  because the missing piece is evidence, not design.
  **Named missing evidence / promotion trigger:** the next sweep row that ERRORS with those
  beta tokens in its stderr, on a capture still present. At that moment the walk is
  `docs/runbooks/sweep-finding.md` from step 1 (freeze FIRST — that is the step whose skipping
  cost this instance), and the two entries above it in this file are what stop the same loss
  recurring: the sweep does not freeze anything on an ERROR today, and a claimed alias does not
  protect its capture from eviction.
  **Do not close this by re-running:** a class that does not reappear is COULD-NOT-VERIFY, not
  a pass (`sweep-finding.md`, the box).

- **RECORD (pattern, 2 instances same day) 2026-08-11 — a bounded pin
  keeps a finding's IDENTITY and loses its COST: the outcome/billing
  records for the pinned rows stop before the range, so any severity or
  price claim still rests on the live capture the pin exists to outlive.**
  Both instances 2026-08-11, both on `harvest --pin --bounded` products:
  the stability-pair pin whose own `verifyPin` reports it does not carry
  what it was pinned for (live capture said the prefix above `messages`
  was intact so the whole array re-bills; the pin says it was already
  broken — identity and divergence indices survive, the price does not),
  and the model-switch exemption's deciding number (`cacheRead: 0,
  cacheCreation: 633,639`) which had to come from the live capture
  because the pin's outcome records stop before n=462. The two bookings
  above each note their instance; this entry is the pattern's carrier.
  Promotion path, named: extend the bounded pin to include the
  outcome/billing rows for its own pinned range (small JSON, no payload
  bytes — the size argument against tracking pins does not apply to
  these rows); `verifyPin`'s existing not-evidence-for-its-class report
  is the ready-made red, going green when the pin carries its cost.
  Until built, the working rule: a pin backing a claim whose severity is
  a NUMBER freezes the outcome rows beside the pin in the same act.

- **RECORD (small) 2026-08-11 — `collectMatrix` reads the status file
  TWICE: `readRecords` parses it for validation, then collectMatrix
  parses it again for enum counts (tools/state-report.mjs:155-160), so a
  write landing between the two reads yields counts and validation from
  different versions — against the file's own "one collection pass"
  contract.** Found by Begehung round 2. Milliseconds-wide race with a
  human consumer, hence RECORD not READY. Fix shape when touched next:
  `readRecords` returns its parsed object (or accepts one), collectMatrix
  consumes that — one read, one home; the bite is a readRecords stub
  whose returned object differs from the on-disk file, asserting the
  counts follow the SAME read the validation used.

- **RECORD 2026-08-11 — gh-authored public text (PR bodies, PR and issue
  comments) is an outward channel with NO mechanical scan; the covering
  discipline is prose, and this entry is the explicit prose-rest label so
  the gap is a decision, not a dark corner.** Found by Begehung round 1.
  What exists: the upstream-pr-round runbook's hand-greps and comment form,
  review-before-post, and the operator-approval rule for public
  communication. What does not: any hook in front of `gh pr create`/
  `comment` — nothing structural stops a capture identifier pasted into a
  PR body, and a posted comment is publishable history the moment it lands.
  Named backstop: the runbook's grep step runs over draft comment text too,
  plus review. Promotion trigger, named: a capture identifier or other
  bar-covered content actually reaching a gh draft — at that point build a
  `gh` wrapper that pipes body text through `scanSourceText` before
  posting, red-proven on a planted body first.

- **PARKED — the D1 absorption counter joins two event logs on `sid` + a 5s
  window because neither log carries a shared request id.** Surfaced 2026-08-11
  by the lane that shipped the counter, as a gap rather than a decision, and it
  is correct to have stopped there: the durable fix writes a correlation id at
  the point both extensions already write their records, which is a `proxy/**`
  schema change with a pin bump and a restart, not a tools change.
  Why the heuristic is acceptable meanwhile, stated so it is not read as a
  known-wrong shipped counter: the correlating condition is
  `oldKeyFallback:true`, which requires prior state to have been FOUND, so a
  brand-new subagent conversation — the population that produced the lane's
  169 false positives — cannot satisfy it at all. The residual is two genuinely
  distinct events for one `sid` inside 5s.
  MISSING EVIDENCE: a real instance where the correlation is wrong. None exists
  in the corpus today (both counters read 0 over 994 and 190 files), so the
  tolerance cannot be calibrated against anything — which is exactly why this
  is parked rather than ready, and what would un-park it is the first non-zero
  reading on either counter.
  Anchor: proxy/extensions/insertion-normalization.mjs
  Write-set: proxy/extensions/insertion-normalization.mjs, proxy/extensions/deferred-tool-rewrite.mjs, tools/gate-live.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/gate-live.test.mjs

- **RECORD (UN-PARKED 2026-08-13 — the named missing evidence now EXISTS and is
  frozen; re-graded from PARKED, which it had been since 2026-08-11) —
  `capturePairResult`'s conversation identity is the busting
  request's own `messages[0]`, so the pairing instrument goes BLIND exactly
  when the class it would observe fires.** Found 2026-08-08 by the row-map
  lane, which correctly refused to fix it and returned the question.
  **THE EVIDENCE, replacing the missing-evidence block this entry carried for
  two days.** A surviving instance of the exact named class was found
  2026-08-13 and FROZEN the same hour, so the three-link chain this entry
  specifies (lineage primitive -> bounded `--pin` -> freeze both cases)
  completed for the first time; last time it stopped before link three and the
  capture rotated out within a day.
  - **The instance**, in capture `s-captureBM` (**CORRECTED 2026-08-20: this
    parenthetical read "claimed AND `--protect`ed, so retention cannot take
    it" and is now FALSE — that capture's bytes were DESTROYED on 2026-08-20
    by an `alias-claim --protect` call whose cap eviction dropped its last
    link; see the incident entry at the head of `## Open`. The finding below
    is unaffected and was re-verified in the committed pin that day**):
    ordinal `n=13` at `2026-08-13T10:15:23.189Z`,
    19 messages, whose `messages[0]` matches NO predecessor in the capture —
    checked against every one of `n=0..12`, not merely its neighbours — while
    its lineage predecessor `n=10` at `2026-08-11T17:19:04.040Z` (16 messages,
    ~41h earlier) shares 14 of 16 messages, overlap **0.875**, well above
    `LINEAGE_THRESHOLD` 0.5. Both halves hold: no predecessor by identity, a
    lineage neighbour by overlap.
  - **Verified twice, independently.** The finding lane imported
    `conversationOf` / `lineageOverlap` / `sameLineage` from `replay.mjs`
    rather than re-deriving them, and self-tested its predicate on three
    constructed controls before reading any capture (search half fires,
    failure half fires, zero-overlap negative does not). The desk then
    re-derived it from the raw file by TIMESTAMP — no shared code, no imports
    — and got the identical four numbers.
  - **The pin**: `test/fixtures/harvested/pinned-s-2474f17f818d-10-13.json`,
    100 KB, `harvest --pin --bounded`, self-verified as reproducing the live
    verdicts over 6 compared pairs (a pair COUNT, per the rule that a pin
    check reporting no pair count has checked nothing). Confirmed to carry the
    event itself and not merely to exist: in the pin, `messages[0]` still
    differs and the overlap is still **14/16 = 0.875**, byte-identical to the
    live measurement — the rotation is structural, so it survives the scrub.
    Absence-scan clean.
  - **The capture is THIS REPO'S OWN dev session**, which matters twice: the
    rotation is our own ~41h resume boundary, and under the operator's
    publication bar our own dev chat in the public tree is explicitly fine, so
    this pin carries no other-session question at all.
  **DESK CAVEAT, and it changes the verifier rather than the design.**
  `bust-triage --at 2026-08-13T10:15:23.189Z` does NOT reach the pairing code
  on this instance: it resolves to `CONTROLLED(resume)` and answers "a
  controlled cause is a cost you caused, not a bust", short-circuiting first.
  Calling `capturePairResult(sid, ts)` directly also fails to exercise it —
  the function runs its OWN request selection and returned ord 190->198 for
  both the instance stamp and a control stamp, i.e. the two arms agreed, which
  indicts the probe and not the finding. So the fix's red-first arrangement
  must drive the pairing predicate against THIS NAMED PAIR from the pin, never
  through `bust-triage --at` and never through `capturePairResult`'s selector,
  or it ships having never gone red on anything.
  **Grade note:** RECORD rather than READY because READY is the scheduled head
  capped at ten and membership is DERIVED (`## Grades`); this entry is now
  decision-complete and armed, and whether it enters the head is the next
  build-order derivation's call, not this booking's.
  **Why, measured at the desk 2026-08-11:** both verifier arms named below
  (s-captureAT for the red, s-captureAU for the control) are GONE — 0 hits in
  the captures directory and 0 committed fixtures, the latter RE-CHECKED with
  `sidToken` after the first pass used a wrong join that happened to give the
  same answer here (it did not for two sibling aliases), against a control sid that
  returned 1 under the identical probe. The oldest capture now on disk is
  2026-08-09. The entry below records the desk re-running this red on
  2026-08-10 and finding it reproduced; it had one day left. The three-link
  chain the entry itself specifies (lineage primitive -> bounded `--pin` ->
  freeze both cases) completed its first two links and stopped before the
  third, and the third is the one that was time-critical — which is the
  precise shape the booked-verifier-pins entry exists to catch.
  Do NOT shop for a substitute capture: a check whose motivating case
  dissolves does not get a substitute found for it (`docs/dev-loop.md`). The
  design below stands unchanged and is complete; only its evidence is missing.
  Sites, cited by ANCHOR TEXT — the line numbers are derived, not load-bearing,
  and are stale the moment anything above them moves (this citation has now been
  corrected four times in four days; the fifth correction is a booked mechanism,
  not another edit). `const cid = JSON.stringify(after.body.messages[0])` fixes
  identity from the busting request, and
  `if (JSON.stringify(r.body.messages[0]) !== cid) continue;` tests every
  candidate predecessor against it. Both now live inside `findPredecessor`
  (extracted 2026-08-14, `bf01df9`); as of that commit they are at
  `tools/bust-triage.mjs:759` and `:770`, resolvable at any later commit by
  grepping the anchor text above.
  **Line numbers corrected a THIRD time 2026-08-14** (764 -> 770, 775 -> 781):
  the EXPECTED-BUST vocabulary block landed in the header above both sites.
  Caught by the citation lint at suite time again; same class as the two
  corrections below.
  **Line numbers corrected AGAIN 2026-08-11** (754 -> 764, 765 -> 775): the
  status-file reader landed ten lines above both sites. Caught by the citation
  lint at suite time, in the lane that caused it, before integration — which is
  the difference between this correction and the one below: that one was found
  by a neighbour report days later, this one by a check that blocks. The lane
  surfaced it as a question rather than shrinking its own comment to preserve
  an incidental byte offset, which is the right call: the citation is the
  dependent, and the dependent moves.
  **Line numbers corrected 2026-08-10** (749 -> 754, 760 -> 765): `28d5022`
  inserted the attribution section above both sites and shifted them. Surfaced
  by `backlog-neighbours` on its first live run — the neighbour report is what
  made anyone re-read this entry at all. The entry survived only because it
  QUOTED the expression beside each number; a bare `:749` now points at an
  unrelated line that still reads as a plausible site.
  **Threat-matrix row 29's mechanism IS the
  rebuild of `messages[0]` at an idle boundary**, so for every row-29 event the
  predecessor is unreachable by construction and the tool answers
  `UNVERIFIABLE / no-pair-in-conversation`. Measured identically BEFORE and
  AFTER that lane's change on `2026-08-08T11:46:36Z` and its companion
  `11:46:13Z` — which is also what proved my own briefed verifier vacuous
  (below).
  **Three consequences, and the third decided the ranking.** (1) Every row-29
  event reports as could-not-verify rather than as row 29, so the class is
  silently UNDER-COUNTED in any survey reading this tool. (2) The outcome is
  indistinguishable from a genuinely absent capture — the could-not-verify
  REASON class this tool was already corrected for once. (3) `docs/dev-loop.md`
  now carries a gate: no mitigation may be designed while attribution is
  COULD-NOT-ATTRIBUTE. So row 29 cannot be mitigated at all until pairing
  works — a tooling gap holding a whole matrix row hostage.
  **DESIGN DECIDED 2026-08-10 at the desk, by measuring the rotation rather
  than reasoning about it.** The fork was real: `conversationOf`'s
  history-derived identity is CORRECT for cache purposes — a rebuilt
  `messages[0]` genuinely IS a new conversation to the API, which is why row 29
  costs what it costs — while a bust WALK needs a different relation, the
  predecessor ACROSS an identity rotation. Two concepts; conflating them is how
  the defect arrived, so the fix adds a relation instead of bending the
  existing one.
  **The measurement that settled it** (capture `s-captureAT`, the entry's own
  red case, ord 715 = the 2026-08-08T11:46:36Z bust; per-message SHA over the
  raw arrays): the target carries 555 messages and its `messages[0]` matches
  NONE of the preceding requests — the rebuild is total, so no
  `messages[0]`-keyed search can ever reach the predecessor. But by CONTENT the
  same requests share 97.1 / 97.3 / 97.7 / 98.1 / **98.5%** of the target's
  messages (ords 709-713, rising with recency), while the co-tenant sidecar at
  ord 714 — a 1-message title-generation call — shares **0%**. Index-aligned
  comparison is useless here (longest common run from index 1 is only 21,
  because the rebuild also changed the array LENGTH, 564 -> 555, shifting
  everything after the first divergence); set overlap over per-message hashes
  is what separates cleanly.
  **So content overlap does the very job `messages[0]` identity was introduced
  for** — excluding co-tenant traffic — AND survives the rotation that defeats
  it. That is the design: a SECOND, explicitly named relation, never a
  loosening of the first.
  Design: keep `conversationOf` (`messages[0]`) exactly as it is, as the CACHE
  identity. Add a LINEAGE relation to the shared primitive — overlap of
  per-message hash sets, `shared / min(|a|,|b|)` — SPLIT OUT 2026-08-10 into
  its own entry below, because the bounded-`--pin` entry turned out to need the
  same relation and neither could be verified before it existed. Then make
  `capturePairResult` two-stage: the current same-`cid` search first, unchanged,
  so every stable-identity pair behaves byte-identically; only when it returns
  nothing does the lineage fallback run, taking the highest-overlap EARLIER
  request above the threshold. The returned pair is LABELLED as crossing a
  rotation so a reader cannot mistake it for an ordinary pair, and neither
  relation is re-derived inline — three confident wrong answers here already
  came from hand-rolled identity.
  Threshold: **0.5**, chosen to sit far from both measured clusters (0% for a
  co-tenant, 97%+ for a true predecessor) rather than tuned to either edge. If
  a future case lands between them that is a finding about the class, not a
  reason to tune the number.
  **Dependency the fix must carry:** `pairEditContext`
  (`tools/bust-triage.mjs:1261`, its shared identity test at `:1276`)
  deliberately reuses the SAME test to stay consistent with
  `capturePairResult`'s notion of "same conversation". A fix at 754/765
  updates that call site in the same change, or the two disagree about which
  requests are one conversation — a silent split-brain inside one tool.
  (Citations re-checked 2026-08-10: `:1271` named a `for await` line, not
  `pairEditContext`. Found while READING this entry to work it — the same
  day's neighbour-driven correction above had fixed only the two citations
  the report quoted and left these, which is the reach failure the citation
  checker is booked to end: a correction scoped to what the instrument
  pointed at, in an entry where the same numbers appear twice more.)
  Verifier, red-first — BOTH sides re-run 2026-08-10 and their current output
  recorded here, so the arrangement is checkable rather than remembered.
  RED: `--at 2026-08-08T11:46:36Z` today returns `VERDICT: UNVERIFIABLE` /
  `ATTRIBUTION: COULD-NOT-ATTRIBUTE`, reason "its conversation has 18
  request(s) in this capture and none earlier — nothing to pair it against".
  After the fix it must reach a row, and the pair it reaches must be ord 713
  (the 98.5% neighbour), not merely "some" pair.
  CONTROL: `--at 2026-08-08T12:18:15Z` today pairs n=224->226 with
  `ATTRIBUTION: CC's` and a stable state key; it must come back BYTE-IDENTICAL,
  which is what stops a fix from pairing everything to anything.
  NEGATIVE CONTROL, from the same measurement: the 1-message sidecar at ord 714
  shares 0% and must never be selected as the predecessor — the lineage
  fallback has to reject it on its own evidence, not by a special case.
  **HARD ORDERING CONSTRAINT (rubric signal 1) — this entry is BLOCKED on the
  bounded-`--pin` entry, and the block is measured, not cautious.** Both
  verifier cases live in captures that rotate: `s-captureAT` is **441 MB** and
  `s-captureAU` is **279 MB**, and `harvest --pin` writes every record from 0
  through the pair, so freezing the red case at ord 715 is a multi-hundred-MB
  write into a PUBLIC history. Building this against the LIVE captures instead
  produces a verifier that decays into a false alarm the moment they age out —
  the anchored-to-mutating-state defect this repo already names. So the chain is
  THREE links, not two: the LINEAGE primitive lands first (its own entry below
  — a pure function needing no capture), then the bounded `--pin` that consumes
  it, then both cases are frozen, then this ships against the frozen pins. The
  middle link acquired its lineage-union clause on 2026-08-10 for THIS entry's
  sake: bounded on `conversationOf` alone it would have dropped the ord-713
  predecessor and frozen a pin proving nothing — recorded in that entry. Until then the design above is
  complete and the work is NOT dispatchable, which is a sequencing fact rather
  than a gap in the design.
  Consumer tier **1 (event disposition)**. Unranked (booked after the
  derivation); a Tier A head candidate at the next one.
  <!-- entry: "capturePairResult's conversation identity is the busting request's own messages[0]" -->
  Anchor: row 29
  Write-set: tools/bust-triage.mjs, test/bust-triage-busting-request.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-busting-request.test.mjs

- **PARKED 2026-08-10 late-evening — `s-captureAT` ROTATED OUT, and it took
  the only recorded instance of `capturePairResult`'s red case with it.**
  Measured, with a positive control so the zero means something: the alias
  registry resolves `s-captureAT` to a filename that is present in ZERO
  locations under `~/.local/share/cache-fix` and `~/.local/state/cache-fix`,
  while the identical probe run for `s-captureAU` returns 1. Not a matcher
  artifact — the capture is gone.
  **What this kills, enumerated rather than felt.** The `capturePairResult`
  entry's RED (`--at 2026-08-08T11:46:36Z`, the total `messages[0]` rebuild at
  ord 715) lived in AT and is now unreproducible. Its CONTROL
  (`--at 2026-08-08T12:18:15Z`) lives in AU, which survives at 292 MB. So the
  entry's hard-ordering chain — lineage primitive, then bounded pin, then
  FREEZE BOTH CASES, then ship — cannot complete as written: there is nothing
  left to freeze on the red side. This is the anchored-to-mutating-state
  defect `docs/dev-loop.md` already names, realized on a booked verifier while
  the ranking was reading that entry as blocked-but-live.
  **What survives, and it is the more useful half.** A replacement live
  positive for the neighbouring `identityRotation` class EXISTS in a surviving
  capture: a census replay over `s-captureAU` at the desk today (serving gate
  set, from `/health`) reports *"identity rotations (row 26 — our own
  pipeline, raw vs forwarded): 325 requests served under a rotated identity, 6
  rotation transitions"*, first transition row `n=31
  ts=2026-08-08T11:55:14.000Z`, with non-classifying neighbours available as
  negatives. So the row-26 chain's "the live arm does not exist" blocker is
  dischargeable against AU rather than dead.
  Named missing evidence, which is what keeps this PARKED rather than READY: a
  surviving capture carrying a `capturePairResult` PAIRING FAILURE — a request
  whose `messages[0]` matches none of its predecessors while a lineage
  neighbour exists. AU has rotations; whether it has that specific shape is
  unmeasured. The measurement is mechanical (replay `--census` over the
  surviving captures, look for a transition whose `conversationOf` search
  finds no predecessor) and is the first thing the next session on this entry
  should run — if it finds one, this converts to READY and the
  `capturePairResult` entry is re-anchored to it; if it does not, the entry's
  verifier has to be rebuilt from a synthetic case and that is a design
  decision, not a lookup.
  **RESOLVED 2026-08-13 — the measurement was run and the answer is FOUND.**
  The prescribed lookup was executed smallest-first over the live corpus and
  returned a positive: a request whose `messages[0]` matches none of its
  predecessors while a lineage neighbour sits at 0.875 overlap. It is frozen
  as `test/fixtures/harvested/pinned-s-2474f17f818d-10-13.json` and its
  capture is `--protect`ed; full evidence, the two independent verifications
  and the desk caveat live in the `capturePairResult` entry above, which is
  now re-anchored to it exactly as this paragraph prescribed. So the branch
  this entry left open resolves to its FIRST arm: no synthetic rebuild is
  needed and no design decision is owed.
  **Coverage, stated because a positive does not excuse it:** the hunt stopped
  on the first solidly-evidenced instance, as briefed — 13 of 39 captures,
  smallest-first, ~77 MB of an 11.8 GB corpus (33% by count, ~0.6% by bytes).
  The other 26 captures are UNCOVERED, not zero. That is sufficient for this
  entry, whose question was existence, and it is NOT a base rate: nothing here
  measures how often the class fires.
  Loop stage: ATTRIBUTE. Consumer tier **1**.
  <!-- entry: "s-captureAT rotated out, taking capturePairResult's red case" -->

- **The reach measurement, kept in place:** `lintCitations` ships
  with four answers (MATCH / DRIFTED / BROKEN-PATH / COULD-NOT-CHECK) and its
  whole-file accounting over the current file reads: **74 citations checked,
  MATCH 2, DRIFTED 0, BROKEN-PATH 0, COULD-NOT-CHECK 72.**
  **Read that as 2 of 74, never as "citations are fine".** A zero in the DRIFTED
  column over a corpus the instrument can only READ 3% of certifies the 3%, and
  the honest COULD-NOT-CHECK answer is the only reason that is visible at all —
  a two-answer check would have printed "0 drifted" and been believed. This is
  the reach shape the corpus names: the basis satisfies the claim's form while
  answering a narrower question, and every sentence stays true.
  Why the reach is small: the check anchors on a tight cite-then-quote idiom
  (`path:line` immediately followed by the quoted expression), and most
  citations in this file simply do not use it. That is a fact about the corpus,
  not a defect in the check — and it was found by DRY RUN, after a first draft
  that looked correct from its definition alone produced 20 false DRIFTED on
  real data.
  What remains open, and it is the real work: raising reach past 3% needs a
  second anchoring idiom, or a convention that new citations adopt the tight
  form. Neither is decided. Verifier for any such change: the MATCH+DRIFTED
  count rises while false-fires stay at zero — both halves, since a looser
  anchor buys reach by inventing pairings, which is exactly the 20-false-DRIFTED
  failure already measured here.
  Original entry follows.
- **PARKED 2026-08-10 — the fork's ENTIRE operational corpus is public, and
  nothing about the upstream relationship requires it to be.** Raised by the
  operator while settling the quote question, and it reaches much further than
  quotes.
  **FIRST COUNT WAS WRONG, and the error is the one this repo keeps naming.**
  It reported "~289 fork-only documents, ~3.5 MB" by taking the fork-only
  DIRECTORY list out of `CLAUDE.local.md` and summing whole directories — a
  label read as its own body, never checked against the world. Re-derived
  mechanically (`comm -23` of `git ls-files` against
  `git ls-tree -r upstream/main`): 405 of 901 tracked files are absent from
  upstream, but 318 are under `test/`, 33 under `tools/` and 2 under
  `proxy/` — fork-only CODE, which is candidate upstream contribution and
  belongs in public. Of the 217 files in `docs/code-reviews`, 206 are
  UPSTREAM'S OWN, inherited by the fork; only 11 are ours. Same shape in
  `docs/directives`: 52 present, 23 fork-only.
  **The real private-candidate set is 52 files, 1.7 MB** — `BACKLOG.md`,
  `FORK-NOTES.md`, 23 directives, 11 code-review reports, 9 audits, 5
  runbooks, `docs/dev-loop.md`, `docs/CONSUMER-SETUP.md` — roughly a sixth of
  what the first count claimed, which changes this from a migration into a
  move.
  **It is NOT a clean split, and that is the design question.** Several
  fork-only directives document features that were upstreamed
  (`proxy-deferred-tool-rewrite.md`, `proxy-insertion-normalization.md`,
  `proxy-output-guard.md`), so they read as contribution material rather than
  operator notes. Proposed rule, mechanical enough to apply without
  re-litigating each file: a fork-only doc stays PUBLIC only if it documents
  code that has been or will be upstreamed, or is cited by an upstream PR;
  everything describing how the OPERATOR works — backlog, runbooks, handoffs,
  session takeovers, dispatch reports, threat evidence, audits — goes private.
  Checked rather than assumed: across the three OPEN upstream PRs the only
  fork-only doc referenced in any PR body is `docs/dev-loop.md` (one
  reference), so exactly one file is load-bearing for a live contribution.
  **Why it is public is an accident of GitHub, not a decision:** a fork
  inherits its parent's visibility and cannot be made private. The operator's
  private material already has a home — `Gunther-Schulz/dotfiles` is private —
  so this is the one body of working notes that escaped it.
  **What the public fork IS load-bearing for, checked rather than assumed:**
  `gh pr list --repo cnighswonger/... --author ...` returns 6 MERGED and 3 OPEN
  upstream PRs whose branches live in this fork. So the fork itself must stay,
  and "delete and recreate with a clean history" — the remediation the
  Public-Repo Information Hygiene section prescribes for a leak — would break
  three open contributions. That option is real but no longer cheap, and the
  repo has 0 stars and 0 forks, so the cost is entirely the open PRs.
  RECOMMENDATION (operator's call, which is why this is parked): move the
  fork-only operational corpus into the private repo and leave the public fork
  carrying only what upstream could ever want. That stops the accrual without
  touching the PR relationship. It does NOT retract what is already published —
  history rewrite on a repo with live upstream PRs is the disruptive option and
  is a separate decision.
  MISSING (why parked): the operator's decision on the public surface, and — if
  it is yes — the migration's own design, since the tooling assumes these paths
  (`.claude/required-reading.json` names repo-relative files, and
  `tools/backlog-*.mjs`, the runbook router and the dotfiles doctor all read
  in-tree paths). The migration is tractable but it is not a `git mv`.

- **HALF ONE DONE 2026-08-11 (`2af3944`), half two PARKED on expired evidence — and the desk answered the question the lane returned.** The cause map now resolves `system_changed` to row 24, so the loudest hole (UNCLASSIFIED — a class nothing watches) becomes an answer. Red-first was a pure function and therefore could not decay: 13/14 with the new bite failing `null !== 24` against the unmodified tool, 14/14 after; re-run at the desk after integration.
  **Graded with two checks the lane did not run.** (1) Its expectation's PARENTAGE was re-executed rather than trusted: row 24's own cell in the matrix does name this shape — `system_changed` then `messages_changed` on consecutive turns — so the mapping derives from the matrix's definition, not from the tool it grades. (2) The lane returned a live question rather than settling it: row 24's status is `DECLINED`, so every `system_changed` bust now reports that, and it asked whether the whole class should read that way. Answered at the desk by reading the verdict the tool actually produces: `KNOWN-OPEN — MUST NOT BUILD — mitigating would suppress a legitimate bust`, carrying row 24's residual, which distinguishes "declined on measurement" from "unknown class". That is the intended conversion and needs no per-cause override.
  A true-positive end-to-end probe was NOT available: `bust-triage --list` shows no `system_changed` event in the recent window (15 of 136 rows, newest first), so the class is proven at the function and unproven end to end. Named, not silently omitted.
- **DECISIONS 2026-08-10 (operator GO, all three) — the round this drain surfaced, answered. Booked here because a GO delivered in chat has no carrier.**
  **1. D1 migration strategy: GO on DUAL-READ.** Read the new pre-pipeline key, fall back to the old rotated key once, always write under the new one. Operator's stated rationale: it satisfies the row-3 restart-transparency obligation BY CONSTRUCTION — old rotated keys stay readable, so no live session's state orphans at the restart.
  **The GO carries an ADDITION, and it is the operator's, not an inference:** the retirement trigger is stated IN the GO so the shim does not become permanent. Trigger: the old-read path retires when the event logs show ZERO old-key hits over a stated window. The implementing session picks the window and writes it where the fallback lives — the repo's standing rule for a bridge is that it ships named as one with its revert trigger beside it, never as the recommendation on its own.
  **Grade the two halves differently, at the operator's own instruction.** The DECISION is authority and is executed. The RATIONALE is testimony: the operator stated they had not re-read the migration half's body this turn and that the session holding the entry outranks their endorsement. So before implementing, re-read that body and confirm the by-construction claim against it — specifically that the old key remains COMPUTABLE at each extension's read point. That claim was graded "from the entry, unverified in the extension source" when the recommendation was made and it has not been probed since. If it fails, the fallback is unavailable and the answer reverts to drop-and-re-baseline, priced with `restart-exposure --match` at a session boundary.
  **GATE 1 ANSWERED 2026-08-10 — the by-construction claim HOLDS, executed rather than read: dual-read is viable and one shared fallback value serves both consumers.** Instrument: `test/d1-old-key-computable.test.mjs`, which drives the REAL pipeline (`loadExtensions` + `runOnRequest` over the serving `extensions.json`) in segments and reads the identity at each consumer's own read point, with the cut points resolved from the registry BY NAME so a reordering cannot silently move them. Measured, synthetic fixture (mcp block at message index 2, the row-26 class): `K_pre` (before order 250) `e355b8dd9f3e3b82` -> `K_ins` (at 395) `395eaa20f50765bd` ROTATED -> `K_def` (at 425) `395eaa20f50765bd`, i.e. **the old key is computable at both read points and both rotate to the SAME value**, so the fallback does not need to be computed per-extension. Negative control (same block already first in `messages[0]`): no rotation at either point — and its `K_pre` is `395eaa20f50765bd`, byte-identical to the positive's rotated key, which is row 26's own falsification-probe shape reproduced independently: the rotation IS the relocation, not any-mutation. Both arms are required and they disagree, so the probe discriminates. Consequence: the drop-and-re-baseline fallback answer is NOT needed, and no `restart-exposure --match` pricing of that alternative is owed. SYNTHETIC by the rule, not for convenience — per `e53f873` this class cannot survive the scrub (`fresh-session-sort`'s four predicates key on literal prefixes the scrubber tokenizes), so a harvested pin provably cannot carry it.
  Still gated: D1 does not ship until the row-26 hard-ordering blocker has its red, which per `5df372f` must now be SYNTHETIC — a harvested pin provably cannot carry that class. Status of that blocker, checked in the world 2026-08-10: the sweep-count half is SHIPPED (`a30d08d` — `gate-live.mjs:491,564-567` carry `identityRotationRows` and the labelled requests/transitions pair), and `test/replay-identity-rotation.test.mjs` passes with 9 constructed bites. The labelling decision 2 GO'd is now DONE in the same commit as this note: that file's header carries the synthetic-only label, the structural-vs-text-predicated discrimination that makes the departure correct (with `e53f873`'s measurement as its basis), and the swap trigger — which is mechanised rather than aspirational, since a non-zero `identityRotations.transitions` in `gate-status.json` is the trigger firing. **The row-26 hard-ordering blocker is therefore DISCHARGED and D1's two gates are both clear; D1's remaining work is implementation, not evidence.** What implementation still owes, unchanged: the `ctx.meta` carrier computed before order 250, both consumers reading it with the single shared fallback this probe measured, the retirement window written where the fallback lives (operator's GO carries the trigger: zero old-key hits over a stated window), the row-3 declaration before the restart, the dotfiles `CACHE_FIX_PROXY_TREE_PIN` bump, and the ship via `docs/runbooks/ship-proxy-change.md`.
  **ROW-3 DECLARATION INPUT, measured 2026-08-10 19:32Z (21:32 local) so it is dated rather than inherited.** `node tools/restart-exposure.mjs --window-min 60`: **8 live sessions, ~817k tokens worst case** if the restart changes forwarded bytes for them — and one of the eight is this repo's own dev session, which is row 3's normal case rather than bad luck. **The declaration D1 gets to make, and why it is stronger than "cheap":** dual-read re-baselines NOTHING, by the same construction gate 1 verified. A conversation with no relocation has pre-pipeline key == post-pipeline key, so its state is found under an unchanged key; a conversation WITH one has a differing key, and the fallback reads the old one — which is computable at both read points, to a single shared value. So the ~817k is the cost of the fallback being WRONG, not the cost of the ship. **That converts the row-3 declaration into a verifiable claim rather than a pricing argument, and the implementation owes the bite that discharges it:** state written under the OLD (rotated) key must still be found after the carrier change, asserted on the same synthetic row-26 fixture `test/d1-old-key-computable.test.mjs` already builds — red-first by disabling the fallback, which must produce a miss where the enabled path produces a hit. Without that bite the restart is priced at ~817k and unverified; with it, at zero and verified.
  **2. Held synthetic-stand-in commits: GO on INTEGRATE-WITH-LABEL.** Both holds release. Each check ships labelled synthetic-only in its own test header, plus a booked swap-on-first-live-instance trigger. Operator's basis, and it is the freshest evidence available: `5df372f` measured live instances of these evidence classes rotating away in MINUTES, so waiting for a live instance gambles the mechanism against that clock. This is the provisionality pattern the repo already uses for early bookings — book now, name what would re-grade it.
  This SUPERSEDES the branch I recommended on the substitute-case rule. Recording why rather than quietly switching: that rule forbids shopping for a substitute case to keep a check alive, and it is right about that. What it does not price is the mechanism never shipping at all because its class rotates faster than a lane can be dispatched. The label plus the swap trigger keeps the rule's actual protection — nobody may read the green as certifying the real class — while not paying the mechanism's life for it.
  **3. The grade split: GO — declare the third grade.** Operator recommended it twice on principle; wave 1 supplied the measurement, and that is what moved it: FIVE independent lanes hit entries graded READY whose own bodies say the design is undecided. The false-READY defect is demonstrated at RATE, not as anecdote. This is the repo-level convention call the backlog-tooling lane correctly returned rather than took, and the linter half it returned as gated is now unblocked.
  Realizing write-boundary: `BACKLOG.md` and this repo's `CLAUDE.md` discipline section for the grade declaration (desk); the two held lane branches for decision 2; `proxy/**` plus the dotfiles pin and restart for decision 1 (deployment-coupled, row-3 declaration owed before the restart).

- **TOOL HALF DONE 2026-08-11 (`46d7bc4`); the two extension comments remain, and they are deployment-coupled so they are the desk's.** `gate-live` gains `collectD1Retirement`, emitting `d1OldKeyFallback {hits, newestUtc, filesScanned, window}` and `d1PostRelocationNoBaseline {count, newestUtc, filesScanned, window}` into the status file, reusing the existing snapshots resolution and the could-not-verify convention (`filesScanned: 0` renders as null, never a clean zero). Red-first: 39 pre-existing bites pass, 9 new ones fail against the unmodified file. Dated real-corpus control: `d1OldKeyFallback {hits:0, filesScanned:994}` and `d1PostRelocationNoBaseline {count:0, filesScanned:190}` over a 24h window at 11:20:25Z — measured zeros, both denominators non-zero.
  **The lane's mid-task correction is the part to keep, and it is this repo's own documented trap caught by an executor.** Its first design flagged a `no-baseline` whose `key` differed from the previous record under the same `sid`. Bites green, so it ran the real corpus before committing — and got `count:169` in a window where the sibling counter read 0. Cause: `sid` is the session id, shared by the main thread and every subagent, so `key` changes constantly under one busy `sid` — the group-by-conversation rule `FORK-NOTES.md` already states, arriving as a live false positive rather than as a reading. The shipped design correlates across BOTH logs (a `no-baseline` counts only where insertion-normalization's own `oldKeyFallback:true` fires for the same `sid` within 5s) and re-measures 0, consistent with its sibling. The wrong turn is recorded in the tool's header rather than erased.
  **What that leaves open, named:** the 5s + `sid` correlation is a HEURISTIC because neither log carries a shared request id — the durable fix is a schema change in `proxy/**`, which is not this entry. Booked as its own item rather than left in the lane's report.
  **STILL OWED on this entry, and it is the desk's because it ships a proxy tree change:** the comment update in `insertion-normalization.mjs` and `deferred-tool-rewrite.mjs` so they cite the two fields instead of asserting a grep, plus the dotfiles-side doctor reading them as a third answer. That is a `proxy/**` commit — pin bump (`git rev-parse --short HEAD:proxy`) and a restart via `docs/runbooks/ship-proxy-change.md` — and it is deliberately NOT bundled into a tools-only push.
  **SHIPPED 2026-08-11 (`189911f`; dotfiles pin `3b9d4f3`), lane run to its terminal state.** Steps, with their real outputs rather than a summary: step 1 — comment-only `proxy/**` diff, no state-key or freeze-logic touch, so row 3's exception does not apply (checked with a filter that shows no non-comment line in the diff and is proven able to fire on `246b61d`). Step 2 — `restart-exposure --window-min 60`: 7 live sessions, ~792k tokens worst case, which prices a restart that CHANGES forwarded bytes; a comment-only diff changes none. Step 4 — pin `ebaaf0e` -> `3279c62`. Step 4b (added to the runbook in the same session, see below) — n/a: no `CACHE_FIX_*` token moved in `189911f`, filter proven able to fire on `d6647cc`. Step 5 — restarted 13:53 local; `/health` `proxy_tree` `9d966435e42c` equals the fingerprint computed from the on-disk source right then, and the previous sweep's stamp `140351b73356` is the negative control that makes that equality discriminating. Steps 6-7 — sweep 11:53:26Z -> 12:24:30Z, code stamp `9d966435e42c` matching RUNNING; DECLARED and RUNNING identical at eleven gates; VERIFIED nine plus the two documented artifact-only exclusions.
  **The first REAL emission of both fields, which is what this entry existed for:** `d1OldKeyFallback {hits: 0, newestUtc: null, filesScanned: 231}` and `d1PostRelocationNoBaseline {count: 0, newestUtc: null, filesScanned: 33}`, window 08:24:43Z -> 12:24:30Z. Both denominators non-zero, so both zeros are MEASURED rather than could-not-verify — the seven-day retirement clock has a first reading and the absorption question has a first answer, neither of them a hand-grep.
  **The doctor half is NOT dropped, it moved to its own repo** — booked in dotfiles `07573c4` as READY, with its design (a `d1_retirement_verdict` beside `bytegate_verdict`), its three answers, and its red-first pair. It was not built in this turn for a stated reason rather than a vague one: when the entry was written the live status file still predated the writer, so a verdict authored against it would have graded a shape it had never seen. That is now false — the emission above is the shape.
  **A defect the lane surfaced by being EXECUTED rather than read** (`a7f04a0`): step 7's three-way compare was not executable on a scheduled run. The unit and `/health` carry eleven gates and the status file nine; `gate-live`'s header says the two artifact-only exclusions are "named in the output so nobody reads them as tested", but that line sits behind `!args.quiet` and the systemd unit passes `--quiet` — so the only run that writes the artifact step 7 reads is the only run whose artifact omits the explanation. `gatesExcludedArtifactOnly` now rides on the status object, sourced from the same Set the filter applies; step 7 became a union compare with the commands written out. Two bites, red-first by name against the unmodified tool, each asserting disjointness AND union because either alone passes on a defect the other catches.
  Original entry follows, RE-GRADED rather than left at READY.
- **DATAPOINT 2026-08-10 21:57 local (19:57:07Z) — the FOURTH row-4 instance today, and the first that is NOT the far-from-anchor `replace/edit` shape.** Recorded against row 4; it re-grades the canonicalization entry's design question rather than merely incrementing a count. `❄ 321k`, statusline cause `other`, ledger AND transcript both `messages_changed / 282112` — the `other` display is the FORK-NOTES trap ("no cause available", never "causes tested and rejected"), and the real cause was on disk the whole time. This session's own capture (`s-captureBB`), pair `n=330->335`.
  ATTRIBUTION **CC's**: CC's raw bytes diverged at index 225, and the replayed census recorded no stability violation for the pair. Census **`splice/insert-mid`** (not `replace/edit`), row-4 container migration at host 225, **EXTENDED/NEW-TEXT** (not MERGED-STANDALONE), and no anchor callout — the anchor annotation rides `replace/edit` rows, so today's 3-for-3 anchor-distance signal says nothing about this instance either way.
  **Why this re-grades the design:** today's four instances are TWO shapes, not one. Three are `replace/edit` / MERGED-STANDALONE / >30 from the human anchor; this is `splice/insert-mid` / NEW-TEXT. The canonicalization entry already owed a statement of which shape it covers before the byte-match gate, and that is no longer a formality — a rule tuned on the MERGED-STANDALONE remainder has no defined behaviour on NEW-TEXT. Ship what the safety argument reaches, name the other as a sibling.
  **It also exonerates the D1 restart a second time**, ten minutes after it: `state-key d6a653d5cb224df0 -> d6a653d5cb224df0`, stable. Two busts now bracket that restart and neither carries a key flip, which is the signature a restart-induced rotation leaves.
  Evidence NOT yet frozen, reason stated rather than left as drift: `harvest --pin <s-captureBB> 157..158 --bounded` (resolve the id with `node tools/alias-claim.mjs --show s-captureBB`; it is deliberately NOT written here — a capture is named by ALIAS in tracked prose, and the raw prefix in this very sentence is what the pre-push hygiene scan caught) (bust-triage's own hint — note 157..158 are request ordinals while `n=330->335` are capture LINES, different namespaces per the runbook's Setup warning). Safe to defer because eviction is oldest-mtime-first and this is the newest, most actively appended capture on the machine, so it rotates LAST — not because freezing is optional.
  **FROZEN 2026-08-11, and the deferral above is the reason it got done today rather than the reason it was safe.** The identical "safe to defer, it rotates last" argument was made for four other captures and all four are gone; this one survived by one day. Pin: `test/fixtures/harvested/pinned-s-715784c0809b-157-158.json` — bounded, 313 records, 150 kept / 9 placeholders, 12.5 MB against the multi-hundred-MB an unbounded pin would have written into public history.
  **Verified as evidence, not merely as a file** (a pin is a claim until replayed and seen to carry the event it was pinned for): feeding `.records` out as JSONL and replaying reports **149 same-conversation pairs** across 10 conversations — in the same range as the live capture, so the instrument compared something — and the pinned event reproduces with its own strings: `n=157->158 splice/insert-mid [blockMigration inline->standalone 225->226]`, i.e. the host-225 container migration this datapoint exists for. Hygiene: `absence-scan` clean on the pin, with the scan proven able to fire — the same file with a session UUID planted in its header goes red with a `capture-uuid` finding.

- **HANDOFF 2026-08-10 — the small-tools batch closed ALL SEVEN members, and one of its commits carries the WRONG MESSAGE because of a collision I caused. Both facts need to survive this session; the second is an obligation, not a note.** Commits are on `worktree-agent-a46f0d2dbf29a93d7`, unpushed and un-cherry-picked, full suite green after every commit from member 3 onward (2748 pass / 0 fail / 3 pre-existing skips at the end).
  **The only lane in wave 1 with zero returns**, which is itself evidence: this was the BATCH — members with genuinely disjoint one-file boundaries — while every lane that returned members was a MERGE whose boundaries had been inferred from prose. The batch/merge distinction held up exactly where the boundary derivation did not.
  New tools shipped: the lane sweep, the PR-ROUNDS writer, the synthetic-HOME helper, the lane-branch prune, plus a `--verify` non-defect fix, a `--match-class` predicate, and a todo-marker claim check. The prune tool honored its carve — built and tested against a throwaway fixture repo only, zero writes to this repo's real branches or worktrees, which mattered because several lane worktrees were live at the time.
  **THE OBLIGATION, stated here because a promise made in a chat message has no carrier.** Commit `16a087a` (the PR-ROUNDS writer) has the CORRECT diff — verified by the lane via `git show --stat`, exactly its two intended files — and the WRONG commit message: MY commit text landed in it. Cause: I wrote my own commit messages to generic names in a scratchpad the harness SHARES across lanes, so `git commit -F` read a file I had overwritten between the lane creating it and reading it. Last-writer-wins by construction. **Whoever integrates this reword `16a087a` before pushing it**; the lane's intended message text is in its closing report, and the lane was right to refuse to amend rather than fix it itself.
  **THE INTENDED MESSAGE FOR `16a087a`, PERSISTED VERBATIM HERE**, because it was delivered only in a chat report and the obligation to use it outlives that channel. Reword with exactly this, preserving the lane's own `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer:
  > tools/pr-rounds.mjs: the WRITER half of the PR-ROUNDS trigger
  >
  > A gate-red-shaped doorbell for upstream PR review rounds, split from a sibling BACKLOG entry because it needs the network: gh pr list against upstream, then per-PR gh api calls for issue comments, review comments and reviews, filtered to exclude our own login. A round is open when the latest EXTERNAL event postdates our own last push (the head branch's newest commit's committer date) -- the ball is in our court and we have not answered with a new commit.
  >
  > Verified against this fork's real open PRs (--dry-run, read-only): #276 and #306 both show live open rounds; #306 checked by hand against the raw API (one comment from an upstream bot account after our last push). #281 is the negative control -- its only two comments are both ours, correctly reported as silent.
  >
  > PATH CORRECTION from the entry: it names a `~/.claude/`-rooted state file, written 2026-08-06, before this repo's XDG migration (tools/xdg-migrate.mjs, 2026-08-07+, hardened by this same batch's member 1). Writing a new artifact into the config root today reintroduces the exact sensitive-file-prompt problem that migration ends, so this writes to the XDG state root instead.
  >
  > Gap surfaced, not built: the READER (the SessionStart attention line under the same three states the gate-red doorbell uses) lives in the operator's dotfiles repo, outside this repo and this member's reach. It needs pointing at this writer's new path.

  **The defect is mine and it is a rule I had read.** The dispatch discipline names this exact hazard — parallel agents share the session scratchpad, so any output at a default or generic filename is a silent collision, and the brief must ASSIGN per-agent filenames. I read that clause, wrote nine briefs, and put it in none of them. The lane found it only because it verified its own commit message after writing it, which is not a step anybody had asked for.
  Design, decided, for the mechanism half: any brief this repo issues to a parallel lane assigns per-agent scratch filenames for every output that would otherwise take a default or generic name — commit-message files first, since those are written and read seconds apart and their corruption is invisible in the diff. The judgment remainder (what counts as generic) stays prose.
  Next actions, no decisions in them: reword `16a087a`, verify the lane's claims in the artifact, cherry-pick its 7 commits, book the 7 dispositions. Realizing write-boundary: `BACKLOG.md` and that branch (desk-only). This entry retires when the reword and the bookings are done.

- **HANDOFF 2026-08-10 — the backlog-tooling lane is REPORTED and NOT INTEGRATED; 9 commits on a worktree branch, and its report is in a scratchpad that does not outlive the dispatching session.** Same carrier problem as the replay lane's handoff below, same reason for this entry.
  **State.** 8 members CLOSED, 11 RETURNED, 9 commits on `worktree-agent-a82eb314485126126`, unpushed and un-cherry-picked, full suite green throughout (2771 pass / 0 fail / 3 skipped at the end, from a 2694 baseline) and `backlog-lint` still exits 0. One of its closures — the `lintRowStatus` quoted-mention exemption — was verified at the desk and ALREADY integrated separately (`f09a8c5`); the other seven closures are still on the branch.
  **The eleven returns are the finding, and they are not failures.** Two are premise-dead (the work had already shipped). Two more say, in the ENTRY'S OWN WORDS, that the design is undecided — entries carrying "design undecided" and "the decision belongs with the operator" inside a body graded READY. That is the false-READY class this drain has now hit from five directions in one day, and it is the strongest evidence yet for the grade-split the lane returned as member 1.
  **The one that needs a decision before it is buildable at all.** Member 9 (the anchor-namespace entry) was BUILT and then REVERTED by the lane, because the literal design — match the entry's FIRST LINE only — breaks 1 of the 6 live `## Build order` anchors, which resolves through an `<!-- entry: -->` comment sitting inside an entry body where a first-line matcher cannot see it. The lane reverting rather than widening the spec to fit is correct: widening it would have been tuning the instrument until it ratified its own premise. The scope question is real and is the desk's.
  **Two more decisions the lane correctly refused rather than took:** the grade-split itself (member 1 — declaring a third grade is a repo-level convention change, and `BACKLOG.md` is never a lane's), and a cross-repo git-history resolution (member 14).
  Next actions, none requiring a decision: verify the lane's claims in the artifact, cherry-pick the remaining commits, book the 19 dispositions. Then the three decisions above, in the order: grade-split, member 9's scope, member 14's cross-repo half. Realizing write-boundary: `BACKLOG.md` (desk-only). This entry retires when the dispositions are booked.

- **HANDOFF 2026-08-10 — wave 1's replay lane is REPORTED, VERIFIED-IN-PART and NOT YET INTEGRATED; this entry is the only durable record of where it sits.** Written because the lane's detailed report parts live in a session-local scratchpad that dies with the dispatching session, and its commits live on a worktree branch nobody would find by looking at `main`.
  **State, exactly.** 8 members CLOSED, 5 RETURNED. Commits are on branch `worktree-agent-a162bc7ead18882ad`, 8 on top of base `3bc6a72`, unpushed and un-cherry-picked; the lane reports the full suite green at every one of them (2718/2721, 3 pre-existing skips). Closed: the lineage threshold note, the first-appearance stability exemption's 4th condition, `findAbsorptionMisses` printing at zero, the `--json` census (carved — no bust-triage wiring), row `id`/`prevId` across 9 families, and three more. Returned with concrete findings rather than "too big": two are ALREADY-RESOLVED (the code exists, or the hypothesis is already determined), three are UNRESOLVED DESIGN DECISIONS inside entries that read as build-ready and are not — which is the same false-READY class this drain has now hit from four directions.
  **The one I checked myself, because it is load-bearing elsewhere.** The lane returned the `identityRotation` entry as premise-dead. The classifier is real and `test/replay-identity-rotation.test.mjs` passes 9/9 (run at the desk). But all nine bites are CONSTRUCTED, and the entry demanded a LIVE known positive — a named real request that must classify and a neighbour 4 s earlier that must not. That live arm does not exist. It is the hard-ordering blocker on the row-26 mitigation, whose whole effect is to make rotations stop mattering, so a constructed positive cannot discharge it. NOT discharged; my earlier "partly discharged" was wrong.
  **The expiring half, and the reason this is urgent rather than tidy.** The capture carrying that pair is from 2026-08-08 and still covers the window (confirmed today: 738 requests, 09:51:58Z..11:54:12Z). Captures rotate oldest-mtime-first. Two entries in this backlog have already died exactly this way. The lane was re-tasked to pin the pair — BOTH ordinals, positive and neighbouring negative — and to replay the pin and report the PAIR COUNT rather than the exit code, since a pin fed as `{header, records}` exits clean over zero pairs. If that re-task did not complete, IT IS THE FIRST THING THE NEXT SESSION DOES.
  **Incident the lane reported against itself, worth keeping:** a `git checkout HEAD -- <file>` intended to discard a throwaway red-first experiment also discarded a real uncommitted fix sharing that file. Caught by grep, redone, no commit affected. That is the corpus's one-command rule at a smaller grain — a revert whose scope is "the thing I just made" acts on the whole file, and the file had two authors' worth of change in it.
  Next actions, in order, none of them requiring a decision: (1) confirm or re-issue the pin; (2) verify the lane's claims in the artifact and cherry-pick its 8 commits; (3) book its 13 dispositions; (4) wave 2 (`gate-live` + billing) unblocks only after (2). Realizing write-boundary: `BACKLOG.md` (desk-only). This entry retires when (3) is done.

- **MECHANISM HALF DONE 2026-08-11 (`d6647cc`) — and it corrected the desk that briefed it, which is the result worth recording.** `lintCaptureAliases` ships in `tools/backlog-lint.mjs`: every `s-capture[A-Z]+` citation anywhere in an `## Open` entry resolves against the alias registry (capture on disk) OR a committed fixture, WARNs when neither holds, exempts the pre-registry aliases from the registry's own `_burned` list, and returns the third answer — `registryPresent:false` — when the registry cannot be read, never a silent clean. Red-first: 99 pre-existing bites pass, 11 new ones fail against the unmodified tool. Real run: `scanned=50 resolved=24 unresolved=19 exempt=7`, WARNing on s-captureAT (10 citations) and s-captureAU (5) and silent on the four that resolve.
  **The lane refused the join the brief asserted, and was right** — the brief said a fixture is named by the session id's leading hex; it is named by `sidToken`, a sha256 prefix of the same width. The lane hand-checked the asserted join against two registry entries that name their own pinned fixtures, got zero matches, found the real function, matched both, and IMPORTED it rather than reimplementing. Desk-verified independently with `sidToken` itself before this booking. Every alias figure written earlier today rests on the wrong join and is corrected above.
  **Two desk checks the lane did not run.** Its bites inject the registry path rather than reading the machine's, which is correct for portability and means the committed suite never touches real state — so the live arms were re-run here: AT/AU warn, AV/AW/BA/BB silent. And the lane's own deviation note says the hygiene guard blocked its first attempt at UUID-shaped test placeholders; that is the guard firing on a synthetic value in a test, which is the false-fire direction this repo watches — recorded, not acted on, since the lane's workaround (non-UUID placeholders) costs nothing and the guard's reach is deliberate.
  PROCEDURE half: DONE separately, as the READY bar's fourth clause at the top of this file.
  Original entry follows, RE-GRADED rather than left at READY.
- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — a non-executable hook is SKIPPED BY GIT
  IN SILENCE, so one `chmod` disables the machine's last gate with no error
  anywhere.** Found 2026-08-06 by the leak-gate lane, against itself, and it is
  the more valuable half of that work: a neutralised copy of the push hook was
  written by python's `open()` at mode 644, git skipped it entirely, and the
  test run's failure landed on a PRE-EXISTING case — which read as the intended
  red. Nothing ran, and the run looked like evidence.
  Two distinct consequences, and the second is why this is not a testing note:
  the instrument shape (a red that is really a non-event, the family this repo
  has hit three times) and the STANDING exposure — the leak scan, the suite
  gate, and every other hook are single `chmod` away from silently not
  existing, in a repo where the thing they guard is unscrubbable public history.
  Verified present today (`-rwxr-xr-x` on the dotfiles dispatcher), which is the
  point: nothing checks it, so it is true until it is not.
  Design, decided: a doctor verdict over every registered hook path — file
  exists, is executable by the invoking user, and (for symlinked repo hooks)
  its TARGET is too, since `.git/hooks/pre-push` here is a symlink and the mode
  that matters is the target's. Computable, zero-judgment, near-zero false
  fires — the precipitation criterion the corpus names. Verifier, red-first:
  `chmod -x` a hook in a throwaway clone and require the verdict to go red;
  control, the current state must be green. Done when a hook that git would
  skip cannot pass doctor.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — the reorder collapses the READY-age
  signal, which is the measured case `session-scan.py` asked for before
  re-opening first-appearance dating.** `_entry_times` dates entries by
  `git blame`, and the docstring names its own residual explicitly: "an entry
  ... moved in a way git records as delete-plus-add reads younger than it has
  been sitting. A first-appearance implementation was built to close that and
  then REVERTED on 2026-08-06: on this corpus both methods return the same
  oldest date ... Re-open with a measured case: two runs of this hook
  straddling a backlog reorder where the reported age drops."
  This is that reorder, and it is not a one-off: the carrier design makes a
  whole-section reorder the NORMAL consequence of every future re-derivation.
  **MEASURED, and the prediction written here first was WRONG — kept, because
  the correction is the useful part.** The predicted symptom was the attention
  line collapsing to ~0d. It did not: `28 READY, oldest 1d` before the reorder
  commit, `29 READY, oldest 1d` after. The aggregate is a MIN over every READY
  bullet, only the 13 ranked ones moved, and an unmoved 08-05 entry still holds
  the minimum — so the line looked fine and proved nothing either way. What
  actually died is per-entry, confirmed by reading blame rather than by
  reasoning about it: two moved headers now date to today 16:59 (the reorder
  commit), two unmoved ones still date to 08-05 21:48 and 22:25.
  So the damage is narrower than predicted and lands worse: the entries that
  lose their age are exactly the RANKED ones — the head of the list, the items
  most likely to reach the three-session re-grade — while the aggregate signal
  that would have shown it stays healthy-looking. It also degrades with use:
  every future re-derivation moves more entries, and the min creeps toward
  today one reorder at a time.
  Design, decided: restore the first-appearance implementation (it exists in
  dotfiles history) and date an entry by the commit that first introduced its
  header line, not by the last commit that touched it. Verifier, red-first and
  now available: run both dating methods against this repo across the reorder
  commit — blame must report ~0d for the moved entries and first-appearance
  must report their true ages; the reverted implementation could not be
  falsified before because no such case existed. Done when the age on the
  attention line survives a reorder unchanged.
  **RE-GRADED 2026-08-10 by the retirement pass, and the decided design above is
  now the EXPENSIVE option. The measured case this entry asked for arrived, far
  larger than the two-entry one recorded above, and it was self-inflicted:**
  commit `8e58988` (the Open/Done split) moved 74 bullets, and git rendered it as
  a whole-file rewrite. Measured over all 92 READY headers at their indexed
  lines: **42 of 92 now blame to `8e58988`** — they read as booked today, their
  real ages gone. That is the predicted damage at 46% of the list rather than at
  two entries, and it hit the ranked head hardest, exactly as this entry said it
  would.
  **The cheap fix was probed and it is TOTAL: `git blame -M -C` returns 42 -> 0.**
  Same 92 lines, same commit, one command apart: without move detection 42 blame
  to the reorder commit, with `-M -C` **zero** do, and the distribution goes flat
  across the original booking commits (spot-check, entry n=5 at line 706: plain
  `80839806 2026-08-07`, with `-M -C` `23079f09 2026-08-07`). The hook does not
  pass either flag — `session-scan.py:218` is
  `_git_out(root, "blame", "--line-porcelain", "--", name)`, and the docstring
  four lines above it names this exact residual while the call does nothing about
  it.
  **Corrected design, replacing the one above:** add `-M -C` to that call first,
  because it closes the MEASURED case (verbatim block moves recorded as
  delete-plus-add) at two flags against a reimplementation. Stated honestly, it
  is not a full substitute: `-M -C` follows a line that moved UNCHANGED, so an
  entry whose header is REWORDED still dates to the reword. First-appearance
  dating remains the complete answer and stays booked as the residual — but it is
  no longer the first move, and shipping it before the two flags would spend the
  larger cost to buy the same measured case.
  Verifier, red-first and permanently runnable (an immutable commit range, not
  live tree state): over the 92 header lines at `8e58988`, plain blame must
  report 42 hits on `8e58988` and `-M -C` must report 0. Both numbers reproduce
  today and will reproduce next year.
  **What this cost, recorded because the pass caused it:** the SessionStart
  attention line derives entry age from the same blame call, so its `oldest Nd`
  figure has been wrong for every session since `8e58988` — a live wrong number,
  not a latent one. It is the reason this jumped the queue.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles — POINTER; body belongs in that repo) — the
  doctor has no three-answer verdict for the sweep's new `rowPins` fields.**
  Booked 2026-08-07 with `e787960`, which added per-row `rowPins` plus a sweep
  rollup `{captures, written, unchanged, rejected, unverifiable, conflicts,
  errors}` to `~/.claude/cache-fix-gate-status.json`. Nothing reads them. The
  closing gate's question 4 (instruments ride along) is therefore answered
  PARTLY for that change, and this entry is the named remainder. Design
  question for the dotfiles side, stated so it is not re-derived: `rejected > 0`
  or `conflicts > 0` means a pin's bytes did not match the row it claims —
  loud, not advisory; `unverifiable` is the third answer and must not fold into
  either. Consumer: `bootstrap/doctor.py`, which enumerates its own `*_verdict`
  functions and fails its self-check if one lacks a test.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Path citation is stale: `~/.claude/cache-fix-gate-status.json` does not
  exist. Real path `~/.local/state/cache-fix/gate-status.json` (present),
  written by gate-live.mjs:61 via statePath(). rowPins and rollup fields
  confirmed still present there. Substance unaffected.
- **PARKED (provisional — investigation still open, operator flagged that these
  gradings may be revised) — the 2026-08-10 04:40:39Z 213k event and the
  instrument failures the walk exposed.** One entry rather than seven, because
  the walk is not finished and splitting it now would freeze a shape that is
  still moving. Missing evidence that closes the parking: the census row for
  the FABLE pair spanning 04:40:24.015 -> 04:40:37.944 (msgs 110 -> 113). If it
  reads `splice/insert-mid`, this event is row 1 / row 4 economics and the entry
  becomes KNOWN-OPEN, not a new class.
  **What IS measured (executed output, not reasoning).** A real bust: the fable
  main thread went `cr=224187 cc=1148` (04:40:24) -> `cr=15603 cc=213429`
  (04:40:37) -> `cr=229032 cc=1153` (04:41:04), and 15603+213429=229032
  exactly — the prefix was discarded, rebuilt in full, then read in full. The
  ~15.6k survivor is tools+system alone, the signature row 4 already records at
  `cache_read 15,214 / cache_creation 123,032`. NOT OURS by the gate's own
  verdict: `replay.mjs --gates-from-capture --census` over the capture exits 0
  with 0 stability and 0 safety violations across 281 same-conversation pairs /
  31 conversations, 10 of 10 declared gates. Tools (14), system (11316 ch),
  sysBlocks (3) and `messages[0]` (73456 ch) are byte-stable across the bust, so
  it is not tools_changed and not a system-prompt change. Same capture:
  `mitigation: 1/8 mitigable events absorbed (13%)`, ~0.5 MB passed through.
  **Instrument findings, each with its basis.**
  (a) `bust-triage` selected the pair `n=97->99` at 04:40:43/47 — SONNET
  subagent traffic — while the busting request was FABLE at 04:40:37.944. It
  picks by time proximity to the worktime event (04:40:50) and is blind to
  `model`, so every "append-only / unchanged / toolsMatch:true" the walk
  collected described a conversation that never busted. Distinct from the
  booked `capturePairResult` messages[0]-identity entry: that one mis-pairs
  WITHIN a conversation, this one selects the wrong conversation entirely.
  (b) `bust-triage` never reads the `outcome` records in the same capture file,
  though they carry `usage.cacheRead`/`cacheCreation` per request — the numbers
  that identified the class in one command after the walk had already run.
  (c) `replay.mjs` already prints `CROSS-TENANT=baseline belongs to another
  conversation on this session id … NOT evidence of a bust`; `bust-triage`
  consults none of it.
  (d) The same quantity carries different names in different files:
  `usage.cacheRead` (capture outcome) vs `cache_read_input_tokens`
  (`usage.jsonl`); `msgs` (prefix-diff events) vs `messageCountPrev/Now`
  (prefix-diff last-state). Querying one schema with the other's names returns
  `null`, which reads as "no data" — three vacuous reads in one session, two of
  them reported to the operator before being caught.
  (e) `grep`-ing a capture JSONL by timestamp matches timestamps inside message
  CONTENT, not the record's own `.ts`. Committed here, returned false rows;
  the correct form filters on `.ts` in jq.
  (f) `gate-live` keeps finding ROWS but not what attributes them: of this
  morning's three conservation reds, the 34-row capture was already evicted, so
  that finding can no longer be attributed at all.
  **PARKING CONDITION DISCHARGED 2026-08-10 — and it refutes the hypothesis it
  was booked to test.** The splice/insert-mid guess is DEAD. The busting pair's
  own prefix-diff record reads `msgs 110->113, causes: [], chain.appendOnly:
  true, first: -1, toolsMatch: true, systemMatch: true, params: [],
  betaHeader: null, windows {head:0, markers:2, tail:3}` — strictly append-only,
  and the census carries no row for it because there was no divergence to
  report. The four-request neighbourhood inverts the story outright:

      04:40:17  106->108  causes:[messages@105(user)]  appendOnly:false  cr=220904  no bust
      04:40:24  108->110  causes:[]                    appendOnly:true   cr=224187  no bust
      04:40:37  110->113  causes:[]                    appendOnly:true   cr= 15603  cc=213429  BUST
      04:41:04  113->115  causes:[messages@112(system)] appendOnly:false cr=229032  no bust

  The request carrying a MID-HISTORY divergence kept its cache; the one that
  lost 213k differed from its predecessor by three APPENDED messages and
  nothing else. Marker windows identical across all four, so a breakpoint move
  is excluded too — which also clears `stripCacheControlMarkers` on our side.
  **Terminal state: COULD-NOT-ATTRIBUTE with a computed reason, and a NEW CLASS
  by construction** — every axis any instrument here measures was stable, so
  the loss is not ours (replay: 0 stability, 0 safety over 281 pairs) and not a
  CC prefix change (append-only in the PRE-pipeline capture). What remains is
  server-side cache behaviour we cannot observe from either tap point. Per the
  attribution gate, NO mitigation may be designed for this, and none is booked.
  **The one thing still not established:** whether
  insertion-normalization's 1/8 absorption on this capture is a regression or
  the standing rate — that is a separate measurement over more captures, and it
  is not what caused this event.

- **PARKED [HANDED OFF 2026-08-10 — dispatch-guards brief] (small) — a brief that dispatches committing work into THIS repo must
  state both trailers, or the dispatcher's push bounces.** Measured 2026-08-10:
  the brief gave the executor `Co-Authored-By: Claude sonnet-5 …` and nothing
  else; this repo's pre-push guard treats a commit carrying
  `Co-Authored-By: Claude ` WITHOUT a `Claude-Session:` trailer as an unbooked
  subagent commit and refuses the push. The commit WAS booked — full report
  received, verified at the desk, a defect found and fixed — so the audited
  override was correct, but the bounce was avoidable and the override is a habit
  worth not training. Dispatch skill §1 already says guarded write paths
  pre-name their gate; this is the repo-specific fact that rule needs to be
  applied here, and it lives nowhere a brief-writer looks.
  Design (decided): `CLAUDE.md`'s verify section gains one line under the
  existing push discipline — briefs dispatching work that commits here state
  BOTH trailers verbatim, `Co-Authored-By: Claude <model> <noreply@…>` and
  `Claude-Session: <url>`, because the guard reads the pair, not either alone.
  Stated as the repo fact, not as a brief template, so it holds for any brief
  form.
  Verifier: a scratch commit carrying only the Co-Authored-By trailer must be
  refused by the guard, and the same commit with both trailers must pass —
  run in a throwaway clone, never against this working tree.
  Done-criterion: both runs' output pasted, line present in CLAUDE.md.
  Write boundary: `CLAUDE.md`.
  **Provenance worth keeping: this entry exists because
  `tools/named-unbooked-scan.mjs` flagged it on its FIRST real run**, over the
  session that built it, on the sentence "worth carrying forward" — the exact
  phrase-class it was built for, naming a defect its own author had left in
  prose one message earlier.

- **PARKED — TWO REAL order collisions exist in the loaded registry, and
  nothing says whether their relative order matters.** Measured 2026-08-08
  while red-proving the tie bite above, against the real loaded registry:
  `deferred-tools-restore` and `microcompact-stability` both sit at order
  350; `output-guard` and `session-budget-breaker` both sit at 690. Within a
  tie, which runs first rests on sort stability — no contract fixes it, and a
  registry reload or a rename could silently swap them.
  This was found in passing, NOT investigated: I do not know whether either
  pair is order-sensitive, and the 350 pair in particular both touch request
  content, which is where a swap would show.
  NAMED MISSING EVIDENCE, the one thing that decides it: for each pair, run
  the two orderings over the same realistic body and compare the resulting
  `body.messages` — identical output means the tie is harmless and the pair
  can stay; any difference makes it a live latent bug and the orders must be
  separated (which touches `proxy/**`, so tree-pin bump plus restart, with a
  row-3 declaration).
  Deliberately parked rather than "fixed" by assigning distinct orders: that
  would CHANGE execution order for whichever pair is order-sensitive, i.e. the
  repair could itself be the regression. Measure first.
  Trigger to unpark: any change to either pair, or the next time the tie bite
  above is extended registry-wide.

- **PARKED — `usage-to-dashboard-ndjson.mjs --watch` was never exercised live.**
  Its converted line sits in a long-running `fs.watch` callback; the lane
  verified it by code inspection plus the shared helper's Date-input unit tests
  (the same input type), never by running it. NAMED MISSING EVIDENCE: one live
  `--watch` run observed emitting a both-zones line while a real append occurs.
  Trigger to unpark: the next time anything edits that watch path, or the next
  dashboard session that runs `--watch` anyway — cheap to grab in passing, and
  it is the only site in the sweep with no executed check behind it.

- **PARKED (RE-GRADED 2026-08-11 from READY) — `capturePairResult` may select a
  DIFFERENT pair than the one the
  census walk calls "the bust", and nothing says the two disagree.** Found
  2026-08-08 by the row-map lane while validating against known bytes, and it
  is the more dangerous of that lane's two findings because the output looks
  correct either way.
  **The re-grade is a CORRECTION of this entry's own verifier sentence, not a
  change of circumstances.** It reads "red-first, on committed evidence that
  cannot decay: s-captureAM". The CAPTURE is gone — 0 hits in the captures
  directory at the desk 2026-08-11, against a control sid returning 1 under the
  identical probe — so the verifier as written cannot run.
  **CORRECTED the same day: this note first added "and 0 in `git ls-files`",
  which was a wrong join (the fixture name is a `sidToken` hash, not a slice of
  the session id).** s-captureAM has FOUR committed row-pin fixtures. They are
  single-row snapshots and this entry's whole subject is a DISAGREEMENT between
  two pair selections, which one row cannot exhibit — so the park stands on its
  own terms rather than on an absence that was never true.
  The entry's original sentence asserted the very property that would have made it safe, which
  is why nothing re-checked it — an entry saying its evidence is durable is a
  claim in the costume of a result, the same shape as CHECKED/VERIFIED without
  the output beside it.
  MISSING EVIDENCE, named: a pinned pair where the tool's selection and the
  strongest bust candidate DISAGREE — the disagreement is the whole subject, so
  a fixture with only one plausible pair tests nothing. Freeze it with
  `harvest --pin --bounded` at the next such walk; the design below is complete
  and unchanged.
  Measured on s-captureAM (session `c7e7cb71`): the tool's pairing selected
  **ord 260->261** — a real `replace/edit` pair in the same conversation,
  `anchorDelta +0`, benign — while the threat matrix's own hand walk names
  **ord 265->266** (`anchorDelta -48`, the FLAP) as the actual busting
  transition. Both are genuine pairs several requests apart; the tool is not
  malfunctioning, it is answering a different question than the reader assumes.
  **The general shape, which is why this is booked rather than shrugged at:**
  two independently-computed facts about "the same bust" — the ledger
  cc/transcript-diagnostic match, and the capture-pair selection — agreeing
  that an event happened is NOT evidence that they picked the same underlying
  request pair. Every piece of evidence the tool prints beside its verdict
  (anchorDelta, blockMigration rows, FLAP tags, and the new far-from-anchor
  callout) is computed on the SELECTED pair, so a mis-selection presents as
  confident, well-formatted evidence for the wrong transition.
  Design, decided: the tool states which pair it selected and on what basis,
  and flags when a same-conversation neighbour scores as a stronger bust
  candidate (a larger |anchorDelta|, or a FLAP where the selected pair has
  none). Do NOT silently change the selection rule — the current one is
  documented and a second, unannounced heuristic is how the previous selection
  defect got its wrong story.
  Verifier, red-first, on committed evidence that cannot decay: s-captureAM,
  where the tool selects 260->261 and the matrix names 265->266. After the
  change the disagreement must be VISIBLE in the output. Control: a walk whose
  selected pair IS the strongest candidate must gain no warning.
  Consumer tier **1 (event disposition)** — it feeds the evidence every walk's
  disposition rests on. Unranked (booked after the derivation).
  <!-- entry: "capturePairResult may select a DIFFERENT pair than the census walk" -->
  Anchor: row 29
  Write-set: tools/bust-triage.mjs, test/bust-triage-list-identity.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-list-identity.test.mjs

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles — POINTER) — `doctor` has no verdict
  over the live EXTENSION set, so six extensions run undeclared and nothing
  says so.** Booked 2026-08-08 as the half of the activation-gate entry that
  lands in the dotfiles repo and therefore outside this tree's write boundary.
  The reporting half SHIPPED here (`2e088df`, deployed): `/health` now emits
  `extensions: [{name, file, order, enabled, source}]` beside `gates`, where
  `source` is the layer that decided it — `config` / `module-default` /
  `implicit-true`.
  **Measured live at the moment it shipped: 36 loaded, 30 `config`, and SIX
  with no declaration anywhere** — `upstream-change-detection` (50),
  `deferred-tools-restore` (350), `auto-1m-guard` (520),
  `thinking-block-sanitize` (550), `session-health` (590), `prefix-diff` (680).
  Three of those are `implicit-true`: nothing in any file says they should run;
  they run because the loader defaults to true on absence.
  Design, decided, from the shipping lane's recommendation and stated as a
  predicate rather than a description: `doctor` FAILS when any entry in the
  live `/health` `.extensions` array carries `source !== "config"` — running
  without an explicit `extensions.json` entry. Green when the same extension is
  declared. This completes the DECLARED/RUNNING/VERIFIED discipline for
  extensions, which today exists only for gates.
  **Do NOT pair this with flipping the loader default to off.** That is a
  behaviour change to the serving pipeline and needs its own row-3 declaration
  and live pricing; this verdict only makes the gap visible.
  Verifier, red-first and available today without constructing anything: the
  live `/health` currently returns six non-`config` entries, so the verdict
  must go RED against production as it stands. Green arm: declare one of the
  six in `extensions.json` and require that entry to stop firing while the
  other five still do — an over-firing control, so it cannot pass by always
  failing. Third answer required per this repo's standing checker discipline: a
  `/health` that cannot be reached is COULD-NOT-VERIFY, never a pass.
  <!-- entry: "doctor has no verdict over the live EXTENSION set" -->

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles) — nothing checks that a
  declared-public remote is STILL public.** Booked 2026-08-08 as the named limit
  of the entry above. `OEFFENTLICHE_REMOTES` is a human claim the hook trusts:
  a repo made private later keeps being treated as published, and its bytes
  would then pass a gate that exists to stop exactly that.
  **Decided: NOT a check inside the hook.** A live `gh repo view` in pre-push is
  the wrong mechanism in both directions — offline it either fails closed (a
  gate that cannot pass, the defect this week removed twice) or fails open (no
  protection at all), and it puts a network round trip in front of every push.
  Design: a dotfiles doctor verdict that asserts each URL in
  `OEFFENTLICHE_REMOTES` still reports `PUBLIC`, on the doctor's own schedule,
  with the three-answer discipline (unreachable network is COULD-NOT-VERIFY, not
  a pass). Verifier, red-first: point it at a list entry that is private (or a
  nonexistent repo) and require a FAIL; today nothing asks. Done when the list
  has a mechanism keeping it true rather than a convention.

 Found 2026-08-06
  while confirming the leak-scan lane's scope reading, which is otherwise
  correct and confirmed: it treats a commit message as published when the text
  is reachable from `stdin <old>` or from ANY `refs/remotes/**` ref. That is the
  right rule for this clone — origin and upstream are both public GitHub repos,
  and it is the only reading under which 3 of the 4 measured occurrences are
  covered, since upstream's merge commit is not reachable from any PR branch's
  old remote tip.
  The residual is the word "remote". A clone with BOTH a private remote and a
  public one — a private mirror, a work remote, a bare backup — would treat a
  message published only to the PRIVATE side as already public, and then let it
  through to the public one. The gate would be correct about "the remote already
  has this" and wrong about the only thing that matters, which is whether the
  bytes are already beyond recall. No such clone exists here today; this is
  written down because the hook is machine-global and the next clone is not
  reviewed by anyone.
  Design, decided: the published set is computed per REMOTE against the remote
  being pushed to, not over `refs/remotes/**` as a flat set — `git push` names
  its remote on argv, and the hook already receives it. Verifier, red-first: a
  fixture clone with two remotes where the message exists only on remote A must
  BLOCK on a push to remote B, and pass on a push to A; today it passes both.
  Done when the scope question is answered per destination.

- **OPEN — three residuals of the DONE-anchor guard (c533cef), each named in
  its lane's report and none dispositioned by it.** (i) The guard's
  resolution vocabulary is `backlog-lint.mjs`'s four (DONE/RESOLVED/FIXED/
  BUILT); this file's headers also open with CLOSED, SUPERSEDED, MOVED,
  ACCEPTED, which neither tool treats as resolution markers. Whether they
  should is a definition call — decide it in backlog-lint FIRST (single
  source; the guard imports its verdict), never by widening the guard alone.
  None of the four is anchored today. Trigger: the first ranked entry whose
  header opens with one of them. (ii) `BUILT ... NOT LIVE` is arguably still
  live work; the guard would call it completed if it were ever anchored.
  Named, not special-cased — a shape exemption is how a predicate stops
  being computable. Same trigger. (iii) The pre-existing zero-match/
  multi-match errors in `backlog-order.mjs` still have no bites — the
  completed-entry clause shipped with the tool's first and only 9 tests.
  Cheap: same suite, two synthetic fixtures.

- **OPEN — the conservation checker's fresh-session-sort exemptions (clauses
  e/f) are reachable ONLY through the `lost` branch, so CC duplicating the
  pre-image elsewhere in the request defeats both: 34 false `invented` rows on
  one capture.** Attribution lane, 2026-08-07, s-captureAE n=167..203: the
  relocated skills block is a pure line permutation (same multiset, same
  length), but CC also sends the list a second time unwrapped, so `lost` is
  empty, the clause-(f) rewrite logic (tools/replay.mjs:3012 gate, :3029-3046)
  is skipped, fssExemptFHashes never learns the post-image — and seenRewrites
  (:3045) is fed in the same skipped branch, so clause (e) can never fire for
  these bytes either (confirmed at the class tail: n=203 re-serves the stale
  sorted block while CC's live list moved on). Two-arm disproving probe
  (duplicate present/removed) flips 1 violation/0 exemptions to 0/2. The
  checker is implicated, not the extension. Repair design is desk work: the
  exemption must learn the post-image without the `lost` precondition, WITHOUT
  softening real-invention detection — the two-arm probe is the red-first
  arrangement either way. Same evidence bundle as the HOT entry.

- **OPEN — clause (b)'s three join forms cannot express a conserved THREE-WAY
  split, so 31 fully-conserved suppressions report as
  `suppressed-without-copy`.** Attribution lane, 2026-08-07, s-captureAH
  n=201..237: raw[57] byte-exactly equals unwrap(FWD[55].b[9]) + "\n\n" +
  unwrap(FWD[55].b[10]) + "\n\n" + FWD[57] (shown at both ends of the class);
  the same request's single-message joins reconstruct fine (positive control).
  joinUnitHash/crossJoinUnitHash (tools/replay.mjs:2641-2666) accept whole-unit
  copy, single-message volatile join, adjacent cross-join — nothing spanning
  three messages. Flagged in the same request, unexplained and NOT assumed
  benign: FWD[56] (1488 b, a deferred-tool-rewrite description notice) exists
  in neither raw[57] nor anywhere in CC's raw array; it produced no violation.
  Same evidence bundle.

- **OPEN — a smoosh-split peel product re-served in a LATER request has no
  exemption clause: clause (d) covers a peel verified in THIS request, clause
  (e) covers fresh-session-sort re-serves, and nothing covers the pair.**
  Attribution lane, 2026-08-07, s-captureAO n=288: the 446-byte MCP-
  instructions block only ever existed embedded inside a tool_result — CC
  never sent it as a unit, so `seen` has no entry — and splitSmooshedReminders
  on the conversation's own earlier raw m2 reproduces the forwarded block
  byte-exactly (peeled block[2] equalsForwardedBlock=TRUE). Stale re-serve of
  own content, not invention, not cross-conversation (the lane's first
  cross-conversation probe read b.text where tool_result carries content; the
  corrected probe was proven live on a known positive first and the leak claim
  withdrawn). Same evidence bundle.

- **CORROBORATION 2026-08-06 for the conservation-exemption entry below — a
  SECOND capture, same shape.** That entry closes "Not claimed here — different
  capture, and a candidate is not a match." Gating s-captureAL under the serving
  config exits 123 with `n=91 lost: in[96] (system): 1 of 1 unit` +
  `invented: out[96] (system)` — the identical lost+invented system-unit pair on
  a capture whose resume was walked independently (matrix row 24, 17:40:16Z).
  Two captures, one shape, both containing a resume. Still NOT the byte-level
  proof: that remains the `normalizeSessionStartText` comparison the entry
  names. What this changes is the odds, not the evidence class.

- **PARTLY DONE — `docs/runbooks/session-close.md` SHIPPED 2026-08-06; the
  computable half of it is still READY. The fifth lane: the operator
  signals a session is ending.** Operator-proposed 2026-08-06 at the moment it
  paid for itself. Asked "all threads done or booked?" at close, the
  enumeration found two that were not, and BOTH were invisible to every
  existing check: a bust `bust-triage --list` had surfaced hours earlier and
  nobody walked, and two agreed corpus edits that existed only in chat. Neither
  is a defect in any tool. They are the class that dies with the context, and
  session close is the only moment they can be caught — which is exactly why it
  needs a line and did not have one.
  **What makes this lane different from the closing gate it sits beside:** the
  four questions in dev-loop run per CHANGE and ask whether the WORK is
  finished. This runs once per SESSION and asks a different question — is every
  fact that currently lives only in context now on disk? A session can close
  with every piece of work correctly finished and still lose a decision nobody
  wrote down. Framed the way the next session experiences it: the job is
  converting context-resident state into disk-resident state, and everything
  not converted is gone, silently, with no artifact recording that it existed.
  **Computable half — build this as the check; each item is a set difference,
  none needs judgment:** cold events since session start that have no recorded
  disposition (`bust-triage --list` against the matrix and backlog); background
  agents not closed; a `ScheduleWakeup` still armed; worktrees carrying
  dangling rebase state (`.git/rebase-merge` / `rebase-apply`); uncommitted
  tracked files. **NOT unpushed commits** — the dotfiles `unpushed-reminder`
  Stop hook already owns that and calls itself the session-cut check; adding a
  second reader is the duplicate-guard shape.
  **The NAMED-AND-UNBOOKED check — computable after all, and the highest-value
  item in this entry.** Operator, 2026-08-06: "you named a gap to me but didn't
  take the next steps." Four times that day a finding was correctly spotted,
  described in prose, and left there until the operator converted it — a
  prioritisation method, this very lane, the per-event lines, and a recurring
  own-conduct error the session proposed to "carry forward" rather than write
  down. Not one was missed; every one was named and unbooked, because naming a
  gap feels like delivering it. The tell is therefore textual and diffable, not
  a matter of self-assessment: scan the session's own assistant output for
  gap-language — "we should", "worth booking", "the gap is", "I'd carry
  forward", "worth watching", "not yet booked" — and require each hit to
  resolve to a commit, a BACKLOG entry, or a file change made in the same
  session. Unresolved hits are the report. Expect false fires (the phrasing is
  common in ordinary explanation), so this REPORTS and never blocks — its value
  is a list to walk at close, and a check that blocked on prose would be
  softened within a day. Red-first arrangement, available from this session's
  own transcript: run it over 2026-08-06 before `fc4b7aa` and it must surface
  the "conduct, not rules" sentence; run it after and that hit must resolve to
  `fc4b7aa`.
  **The step that must lead the line — RUN the mechanism, do not describe it.**
  Every close-out claim about what some machinery will do is checked by
  executing that machinery, not by reasoning about it, and the checks are
  seconds each. Measured twice in the last ten minutes of 2026-08-06, both
  times the description was wrong: "the next session picks this up
  automatically" — running `session-scan.py` showed it hands over eight READY
  headers in FILE order with the ranking invisible; and "everything is booked"
  — running the enumeration found two findings named in conversation and never
  written down. Same shape as the corpus rule about reconstructing behaviour
  from source rather than exercising it, pointed at OUR OWN machinery, which is
  where it is least suspected because we wrote it. So the lane opens by running
  what it is about to report on.
  **SCOPE EXTENSION 2026-08-07 — the trigger is not session close, and
  scoping it there is why this keeps happening.** Twice in ONE session, hours
  apart, the same shape fired mid-flight with no close in sight. First: a
  timed-out ad-hoc scan was described in prose and converted only when the
  operator asked "may a tool/instrument improvement to book?". Then, later,
  the session's own closing paragraph listed THREE of its own instrument
  misfires — a process-per-line scan, a jq keyed on a field name taken from a
  summary instead of the file, and `$?` after a pipe reporting `tail` — and
  booked none of them until the operator asked a second time, "why were two
  not booked before I mentioned it?". One of the three had nearly let a
  CRASHING guard read as passing.
  The entry as written says the value is "a list to walk at close". A long
  session has one close and many work-units, so a close-scoped check cannot
  catch either instance above. The global corpus already states the correct
  trigger — the learning question fires again whenever the CORRECTION LIST
  GROWS, because the count is a recognizable event where closing is not — and
  this entry does not carry it.
  Computable, and tonight is its red-first case: fire when one assistant
  message enumerates two or more of the session's OWN errors (a self-directed
  correction list), not only at close. Run it over this session's transcript
  and it must surface the three-misfire paragraph with zero of the three
  resolving to a commit at that timestamp; run it after `95f9c89` and two of
  the three must resolve.
  The recorded miss shape is that both conversions came from the operator
  asking. That is the backstop doing the mechanism's job, twice in one
  session, on a mechanism already booked and still unbuilt.
  **Judgment half — stays prose, and is where today's other two lived:**
  decisions or designs settled in conversation with no carrier (the tell is a
  sentence like "we agreed X" with no commit, backlog entry, or file behind
  it); numbers or claims committed earlier in the session that later evidence
  revised — today's build-order block said four busts and 1,124k when the truth
  was five and 1,200k, and nothing but re-reading catches that; and the three
  closing questions from the operator corpus (missing / learned / routed).
  **Terminal state, one only:** CLOSED — every context-resident fact is on disk
  or explicitly named as deliberately dropped. "I think that's everything" is
  not it.
  Verifier, red-first and available: run the computable half against this
  session's own state as of 11:07Z, when the 76k bust had been listed and not
  yet dispositioned — it must name that event. Against the state after
  `42b9ad7` it must be silent. Done-criterion: both, plus the run printing what
  it examined (events considered, agents, worktrees), since a close-out
  reporting "nothing outstanding" over an empty enumeration is the failure this
  repo has hit most often.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — one status file now has TWO definitions of
  "how old is the sweep", and they can disagree by design.** Surfaced 2026-08-06
  by the agent that built the gate-red doorbell, as a returned gap rather than a
  silent choice — the good outcome, and worth noting as such. The hook
  (`claude/hooks/session-scan.py`) measures age from the payload's `.finished`
  with a 26 h bound; doctor (`gate_status_verdict`, `bootstrap/doctor.py:458-479`)
  measures it from the file's **mtime** with a 36 h bound. Both read
  `~/.claude/cache-fix-gate-status.json`. A file that is copied, restored from a
  backup, or rewritten without a fresh sweep has a new mtime and an old
  `.finished`: the hook says stale, doctor says fine, and each is internally
  consistent — the classic two-namespaces-that-look-like-one shape (dev-loop,
  "Two coordinate spaces that look like one"), here at the level of a unit
  rather than an index.
  Design, decided: `.finished` wins — it answers "last SWEPT", mtime answers
  "last WRITTEN", and the question both readers are asking is the first. Doctor
  converges onto `.finished`, and the bound becomes ONE constant with one name,
  read by both (a second copy of "26" is the thing that rots). The hook's
  behaviour does not change.
  Verifier, red-first and cheap to stage: a status file with `finished` 30 h ago
  and mtime NOW — today doctor passes it and the hook flags it; after the change
  both flag it. Plus the control that a genuinely fresh sweep still passes both.
  Done-criterion: the disagreement demonstrated before and gone after, one
  constant with both consumers citing it, and doctor's own bite battery green.
  NOT this repo's file — this is a dotfiles change, booked here only because it
  was found here and the fork backlog already carries operator-side entries.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Substance STILL-TRUE (doctor.py still ages the file by mtime;
  session-scan.py's own comment records doctor as deliberately left
  unconverged), but the entry's path citation
  `~/.claude/cache-fix-gate-status.json` is stale — same correction as n=25.
- **BUST 2026-08-06 15:02:33Z — 48k, cause `other`, PARKED with its named
  missing evidence.** Walked the bust-appears line rather than improvised.
  Inventory (`--list`): this is the newest cold event and the only one after
  the 14:46:32Z CONTROLLED(compact); the operator reported both and neither
  was a second instance of the other.
  `other` is the DEGRADED cause — `claude-worktime.sh` sets it as a default and
  overwrites it only when `cache_miss_reason` reads, so it means "no cause
  available", never "causes tested and rejected".
  MEASURED, replay under the SERVING configuration (10 of 10 declared gates,
  resolved from `/health`, capture `s-captureAG`): **4 same-conversation pairs
  across 4 conversations, 0 stability / 0 safety / 0 sequence / 0 conservation
  violations**; the pairs are 3 append-only + 1 identical. So nothing of ours
  diverged in that session's traffic, and by the pre-pipeline rule there is no
  divergence to attribute in either direction.
  **Named missing evidence, which is the whole reason this is parked and not
  closed:** the per-request `cache_read_input_tokens` for that session in the
  15:01–15:04Z window. That number separates "fresh conversation start, cold by
  construction" from "a real re-bill", and it is currently unreachable — see
  the usage-join entry below, which is the mechanism this park is waiting on.
  Promotion trigger: that join existing, or a second instance of the same
  48k-shaped `other` event in a session whose usage rows can be reached.

- **PARTLY DONE 2026-08-10 (`087d435`) — `tools/runbook-lane-index.mjs` + its test ship checks 2 and 3 of the four this entry names; CHECK 4 (every index row names a detection channel) is NOT built and stays READY below, because its red is entangled with an unbuilt TRIGGER-column schema and filling that in would have been a silent design decision at the executing tier. On its first real run the tool found two live STALE markers (`bust-appears.md:236`, `sweep-finding.md:93`) and reproduced the real 3-of-5 runbook-list staleness — an instrument earning its keep on contact. — an index check for the runbook lane system, and it must be built
  BEFORE the two reds above.** Peer session's design, adopted: build it split,
  with checks 2 and 3 domain-free so they are not this repo's private tooling,
  plus a fourth condition — **every index row names a detection channel**, i.e.
  how the event announces itself, which is what makes a lane's trigger
  falsifiable instead of aspirational.
  Red-first arrangement, available RIGHT NOW and destroyed by fixing either red:
  check (2) goes red on `CLAUDE.local.md`'s 3-of-5 list; check (4) goes red on
  the injection gap above (rows exist whose detection channel is a hook that
  does not carry them). Build, demonstrate both reds, then fix the reds.
  Done-criterion: both reds demonstrated on the real files, then green after the
  two fixes land, and a synthetic index missing a detection channel still red.

- **PARKED — nothing anywhere says when a LANE is born.** Peer session's
  finding, and it is rule-shaped, which is the class dev-loop's rule three was
  widened to catch. Five lanes have been minted (bust, sweep, runtime-anomaly,
  upstream-PR-round, session-close), each on somebody noticing an event class
  had no written procedure, and the trigger for minting the next one exists
  nowhere. Named missing evidence: what distinguishes an event class that
  DESERVES a lane from one that a rule or a tool should absorb — the five
  existing lanes are the only data, and all five were minted the same week under
  operator prompting, so they cannot yet separate the two. Promotion trigger: a
  sixth lane proposed, or one of the five going unused for a month.
  **Input for the next re-derivation, not an edit to the current list:**
  `tools/lane-sweep.mjs` was ranked on a premise that has since moved — its
  value was scored as fork-only, and the index check above makes two of its
  conditions domain-free. Re-score it when the order is next derived.

- **BUST 2026-08-05 20:52Z — 610k, `messages_changed`, and its only
  pre-pipeline difference is a cache_control marker leaving the last message.
  This CONTRADICTS the same day's "a moved breakpoint is free" finding and
  the finding is the thing in doubt, not the bust.** Fresh, measured at the
  raw bytes, evidence frozen before rotation: `pinned-s-6052bdc81b48-218-219`
  (431 records, full prefix from 0). Session s-captureAD, requests 218 -> 219,
  20:50:40.217Z -> 20:51:02.935Z, 456 -> 458 messages.
  THE PAIR, read pre-pipeline (request-capture, order 60): `tools` identical,
  `system` identical, and the first raw divergence is at index **455 — the
  LAST message of the 456**, where the two differ by 48 bytes that are
  exactly `,"cache_control":{"type":"ephemeral","ttl":"1h"}`. Verified
  mechanically: identical once every cache_control key is dropped. One
  differing index out of the whole common prefix.
  THE BREAKPOINT LAYOUT is what makes it cost. CC carries exactly ONE
  message-array breakpoint and moves it forward every turn: at 218 it sits on
  `455:block[1]`, at 219 on `456:block[0]`. Both requests also carry
  `system[1]`/`system[2]`. So the entry request 218 wrote ends AT message 455
  — the message that then changed — and the only breakpoints that survive
  unchanged cover tools+system alone. `messages_changed / 529627`.
  WHY THIS IS NOT A CONTRADICTION OF THE MEASUREMENT, BUT OF ITS
  GENERALISATION: the 34-row corpus classification stands as counting (26 of
  34 rows are marker-only, mechanically confirmed by the sweep's own
  `cacheControlOnly`). What does NOT stand is the inference that marker-only
  therefore means free. The cold-ledger check behind it asked "is there a bust
  within +/-180 s", and 32 of 34 said no — but ABSENCE of a bust at those rows
  is consistent with an older cache entry, written when the changed message
  was not yet the tail, still being readable. This bust is the case where no
  such entry survives, and there the marker's own bytes are inside the only
  prefix on offer. A moved marker is free WHEN an entry ending below the
  change is still readable, and that is a different claim from the one made.
  NAMED MISSING EVIDENCE, and it is what a future session should get first:
  per-request `cache_read_input_tokens` / `cache_creation_input_tokens` for
  the pair. The capture carries NO outcome records with usage on this session
  (measured: 0 of them), so the split between "read an older entry" and "read
  nothing below system" is currently unmeasured — and that split is the whole
  question. `usage-log` exists and is DISABLED in `proxy/extensions.json`;
  enabling it is the cheapest route to the number, and is a serving change, so
  it is an operator call rather than something to switch on unasked.
  ALSO NOT DONE: no fix. Nothing here is obviously ours — the marker placement
  is CC's, our `cache-control-normalize` acts at order 400 on the FORWARDED
  body and this divergence is already present pre-pipeline. Whether our
  canonical placement helps, hurts, or is neutral against CC's single moving
  breakpoint is exactly the unmeasured question above.
  CONSEQUENCE ALREADY TAKEN: the public comment on anthropics/claude-code#81967
  carried the un-narrowed "moving a marker costs nothing" note as an aside; it
  has been withdrawn in place, with the reason stated, rather than defended.

- **PARKED — the rules corpus has no fire-rate, so prose accumulates with no
  retirement signal.** Named in conversation 2026-08-06 and initially NOT
  booked, on the reasoning that a check I could not specify is not
  decision-complete. That was the third exit the rule forbids: not-decision-
  complete is what PARKED is for, and leaving it in chat would have lost it.
  The concern, measured: `docs/dev-loop.md` grew by roughly 150 lines in one
  day, and rule three's scope was wrong within hours of being written — caught
  only because the operator asked, not because anything re-read it. Mitigations
  have a retirement policy (the fire-ledger, RAW vs ABSORBED) and skill-craft
  has a consolidation rule; dev-loop prose has neither, so a rule that never
  fires is indistinguishable from one that fires constantly, and unread rules
  dilute the ones that work.
  **Named missing evidence, which is why this is parked and not ready:** what
  "a rule fired" even means operationally. A count of sessions that cited it is
  not it (citation is not application), and a judgment poll wearing a number is
  worse than nothing. The nearest candidate worth exploring is the incident
  trail the rules already carry — most dev-loop rules name a dated occurrence,
  so a rule whose newest occurrence is old is a candidate for consolidation
  rather than for deletion. Promotion trigger: a second consecutive session
  where a dev-loop rule is found to be wrong or too narrow, which would make
  this a pattern rather than one bad afternoon.

- **UNDISPOSITIONED SWEEP FINDINGS 2026-08-06 — two, both surfaced at session
  close by running doctor, neither walked. The sweep lane's first real
  input.** Recorded with what is measured so the walk starts from evidence
  rather than from scratch; NOT classified, because guessing a terminal state
  is the thing that lane exists to prevent.
  (1) **Gate red, conservation.** The single failing row in
  `~/.claude/cache-fix-gate-status.json` reads `exit=1, pairs=1395,
  stability=0, safety=0, conservation=2` — one of 66 captures. Candidate class
  is the declared-behaviour conservation shape triaged 2026-08-05 (that entry
  attributed 38 rows on a different capture to `fresh-session-sort` and
  `smoosh-split`+`content-strip`), but two rows on a different capture is a
  CANDIDATE, not a match: the 2026-08-05 attribution was made by running each
  suspected extension's own exported transform over the real bytes, and
  nothing of the sort has been done here. Next step is exactly that.
  (2) **The byte-gate's two readers disagree.** `doctor` reports
  `MISMATCH=2` with tally `{EXACT: 543, EXTENDED: 84, DROPPED: 4, MISMATCH: 2}`
  while `jq '.byteGate.mismatch'` on the same status file returns **null**.
  Null is "nobody measured", not 0 — so either doctor computes the tally from
  a source the status file does not carry, or the field is not being written.
  Until that is settled, neither number can be cited: this is the
  instrument-defect branch of the sweep lane, and the first move is finding
  which producer doctor actually reads.
  **DISPOSITIONED 2026-08-06 evening — INSTRUMENT-DEFECT, and the instrument is
  the HAND QUERY, not the producer.** The two readers never disagreed. The
  producer writes a top-level `byteGate` carrying
  `tally: {EXACT:543, EXTENDED:84, DROPPED:4, MISMATCH:2}`; summing the same
  four fields across `.rows[].byteGate.tally` independently gives exactly
  `{543, 84, 4, 2}`; and doctor reads that same object (`bytegate_verdict`,
  dotfiles `bootstrap/doctor.py:530-544`). There is no key named `mismatch` at
  any level — the field is `tally.MISMATCH` — so `jq '.byteGate.mismatch'`
  returned null because the PATH does not exist, not because nothing was
  measured. **MISMATCH=2 is citable**, and the two rows behind it are named in
  the status file (`byteGate.tally.MISMATCH == 1` on each of two captures, 1670
  and 1395 pairs).
  **The transferable half, and it is why this entry stays rather than being
  deleted:** a `jq` null is ambiguous in exactly the way this repo's three-answer
  rule is about — "absent because unmeasured" and "absent because you asked for
  the wrong key" are byte-identical answers, and the first reads as a finding
  about the system while the second is a finding about the reader. A
  self-composed query path is the instrument, so its own form is the claim's
  basis (grounding corpus, the self-built view). Cheap discipline, first use
  here: before reading a null as a measurement, print the object's KEYS
  (`jq -r 'keys|join(", ")'`, or `[.rows[].byteGate|keys?]|add|unique`) and show
  the path exists. Not mechanized deliberately — the trigger is judgment-shaped
  (every legitimate null would fire it) and this is the first recorded
  occurrence; if a second hand-cited null is ever mis-read, the probe has been
  used twice and graduates to `tools/` under the standing rule.
  **This closes finding (2) of this entry. Finding (1) — the gate-red
  conservation row — remains OPEN and unwalked**; its next step is still the one
  written above: run each suspected extension's own exported transform over the
  real bytes rather than pattern-matching it to the 2026-08-05 attribution.
  Both are pre-existing, neither is caused by 2026-08-06's changes, and both
  were named in conversation before being written down — the named-and-unbooked
  shape, caught by the close-out enumeration on the same day the rule for it
  was minted.

- **PARKED [HANDED OFF 2026-08-10] (operator-side, corpus — NOT this repo) — two corpus edits agreed
  2026-08-06 and handed to another session; booked here because chat is not a
  carrier.** Both come from one measured failure: a dispatch brief written from
  a settled six-decision round dropped decision 5 (the cross-repo boundary),
  which surfaced only because the dispatcher re-read its own decisions after
  spawning. Same shape the §2 report tail already fixed one level down — free
  composition drops invariant clauses — but for the design's OWN decisions
  rather than the boilerplate.
  (1) **dispatch skill §1 brief skeleton gains a slot**:
  `## Decisions this dispatch must honor`, enumerated from the round, `n/a` for
  the ones that do not apply. Satisfied by construction for anyone pasting the
  skeleton, which is how the tail already works. Deliberately NOT a hook lane:
  the condition ("an operator decision round preceded this dispatch") is
  invisible to the hook, so a lane would demand an `n/a` line on every brief and
  train the override reflex — the computable slice precipitates, this part does
  not.
  (2) **CLAUDE.md model-routing: sharpen the existing already-written-brief
  clause**, not a new entry. It names the three shapes and says "the settled
  design is the brief's core already written" — and never says what to DO with
  it. The gap is exactly there: that reads as "the thinking is done" when it
  should read "carry it across verbatim — an enumerated design is QUOTED into
  the brief, not restated from memory." Widening beats adding; the generic
  paraphrase-drift rule above it is already correct and already present.
  (3) **CLAUDE.md Fixing — widen the own-past-output clause from ASSERTION to
  any direction and any quantity.** Operator's correction, 2026-08-06: a
  recurring error named as "conduct I'll carry forward" has no carrier and dies
  at session end — the same argument this entry makes about chat-only
  decisions, which the session then violated in the same message. So it is a
  rule or it is nothing.
  The clause today reads: asserting "I already answered/sent/delivered X" is a
  claim about the transcript, checked there before it is asserted. Correct, and
  it fired on none of the day's three instances because each ran a different
  direction: (i) asserting a NON-delivery — a subagent's report demanded as
  missing when it had arrived, been read, and been acted on, costing the agent
  three resends and a diagnosis of a delivery fault that did not exist;
  (ii) asserting a CLASSIFICATION before reading it — a leak gate bypassed on
  "this is the known already-public false fire", confirmed only afterwards
  (it was, but the confirmation is what makes the bypass legitimate);
  (iii) asserting a COUNT from attention — "four busts, 1,124,000 tokens"
  committed into a ranked artifact while `bust-triage --list` had printed five,
  the fifth read past hours earlier.
  Widening, not a new entry: the invariant is that a claim about the RECORD —
  what was delivered, what a gate said, how many there were — is checked
  against the record whenever the check is cheap, regardless of whether the
  claim is positive, negative, or numeric. The tell is uniform and worth
  keeping: the sentence is about something the session witnessed, and the
  witness is memory of ATTENTION rather than the artifact. Three instances in
  one day argues the direction-specific phrasing is what let it through.
  (4) **CLAUDE.md Per-project accretion — widen the do-it-now-or-book-it
  bullet to cover the DELIBERATE postponement.** It currently reads: a deferred
  change stated only in chat has no carrier and evaporates — do it now or book
  it; "I'll fold it in later" is the tell. Correct, and it did not bind on
  2026-08-06, because the tell it names is a passive one. What actually
  happened was an ACTIVE, reasoned-sounding decision — "I am deliberately not
  writing this now, at this depth" — which loses the finding just as
  completely while presenting as prudence rather than as drift. That is the
  costume rule from Grounding, and the two bullets should meet: the branch is
  binary, done or booked, with no third exit however well argued.
  Carry the falsifier with it, since it is what makes the rule self-enforcing:
  **booking costs about what doing it costs, for anything small.** So any
  reason that would justify not making a two-line fix fails by the same
  arithmetic to justify not booking it. Where the fix is genuinely large the
  costs diverge and the choice is real — which is precisely the case booking
  exists for. One question before any postponement: what does booking this
  cost, against doing it? "About the same" means it was never a decision.
  Operator's framing, 2026-08-06, worth keeping verbatim in whatever wording
  lands: things cannot get lost, ever.
  Both files are operational corpus: `CLAUDE-maintenance.md` governs the edit
  and each lands with a JOURNAL line in dotfiles. Not done here because the
  operator routed it to a separate session.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Of the four proposed corpus edits, item (4) has already landed in the global
  accretion.md; items (1)-(3) are still open. Re-scope to three.
- **PARKED — do the three runbooks actually get FOLLOWED, and did folding the
  two sub-classes in rather than splitting them out hold?** The
  per-event-line work is DONE (operator session 2026-08-06, `0868657` +
  the sweep-runbook commit): `docs/runbooks/bust-appears.md`,
  `sweep-finding.md`, `upstream-pr-round.md`, indexed in dev-loop's "Which
  line are you on", each ending in a named terminal state. Decisions taken,
  recorded here because nothing else carries them: THREE lines, not the five
  originally listed — an instrument going red and a gate-red that triages to
  a non-defect are decision POINTS INSIDE the other lines, not event classes
  with their own sequence, and splitting them out would have produced files
  duplicating context that nobody opens. Terminal states are REUSED, never
  invented (the bust line takes FORK-NOTES' four; the sweep line got its own
  six, settled by the dispatcher before briefing so a cheaper tier could not
  design them silently). Runbooks are staging areas: a hand-run step carries
  `[GRADUATE -> where it belongs]` and the marker is removed only by the
  commit that mechanizes it.
  **Named missing evidence for un-parking:** two occurrences of each event
  class handled BY the runbook, after which the questions are answerable and
  not before — (a) did the folded-in sub-classes get reached, or did a
  session hit an instrument-lying case and fail to find the branch because
  it was not a file? (b) which `[GRADUATE]` markers survived two occurrences
  and are therefore overdue? (c) did any session route a finding to "seems
  fine", i.e. off the terminal-state list entirely? None of these is
  answerable from the documents themselves — only from watching them get
  used, which is why this is parked rather than ready.

- **OPEN-BOOKED 2026-08-06 — a recurring `401` with `requested_model: "test"`
  and no session id, unexplained, still firing.** The runtime-anomaly runbook's
  own worked example, and the reason that terminal state exists. Measured:
  `~/.claude/usage-log/upstream-errors.jsonl` holds 194 lines of which 170 are
  this shape — `response_status: 401`, `requested_model: "test"`,
  `session_id: null`, `request_path: /v1/messages`, `x_should_retry: false` —
  distributed 1 (07-30), 22 (07-31), 7 (08-01), 7 (08-02), 121 (08-05), 12+
  (08-06, still growing during the investigation, last seen 12:44:01Z).
  **Why this is not already closed:** an earlier entry in this file attributes
  the shape to "today's test runs" on 07-31 (grep `model:"test" 401s`). That
  explanation was written about one day's occurrences and cannot carry 08-05's
  121 — a premise that was true when written, re-used past its evidence, which
  is the stale-premise class the corpus names under Fixing. The dispatched
  agent caught this unprompted and correctly refused to close on the old note.
  **Named missing evidence:** the sender. No repo tool sends `requested_model:
  "test"` (grepped across `tools/*.sh`, `tools/*.mjs`), and `session_id: null`
  rules out a Claude Code session. Next probe, cheapest first: correlate the
  timestamps against `~/.claude/cache-fix-captures/` (a capture exists → it
  came through the normal path) and against the dotfiles doctor/bootstrap run
  times, since an unauthenticated probe on a schedule is the shape that fits.
  Until the sender is named this stays OPEN-BOOKED — real, reproducible,
  cause not established — and NOT closed as controlled-cause on a guess.

- **HANDOFF 2026-08-05 NIGHT — read this first; it supersedes the
  EVENING handoff's "START HERE" section and nothing else.**
  **THE INDEX-0 VIOLATION IS ANSWERED, MITIGATED — AND IT COST NOTHING.**
  Mechanism, verified at the forwarded bodies rather than reasoned from
  the source: `fresh-session-sort` re-derived its relocated set from the
  CURRENT array on every request, so what we forwarded at `messages[0]`
  tracked the PRESENCE of the source block. (s-captureAB is the ~281 MB
  capture whose pair sits at 2026-08-05T13:49:31Z -> 13:50:48Z; the real
  filename is local-only — join by timestamp against
  `~/.claude/cache-fix-gate-status.json`, never by writing the session id
  into this public tree.) On it the mcp
  `<system-reminder>` sat at raw msg[3] from n=325 through n=331 and was
  gone at n=336; with nothing to relocate, our forwarded `messages[0]`
  went from four blocks to three (`--dump-forwarded 331:0,336:0`) while
  CC's own `messages[0]` was byte-identical on both sides.
  **THE PIN WAS THE WRONG QUESTION.** `pinBlockContent` holds a block's
  BYTES stable while it is present; across that pair the block was
  ABSENT, so nothing consulted it. Presence was the unheld axis. Anyone
  re-opening this: do not go looking for a pin bug, there isn't one.
  **THE COST WAS ZERO ON THAT OCCURRENCE, and this is the correction
  that matters.** CC changed `tools[]` from 11 entries to 9 and its first
  system block from 57 to 62 chars in the same request. The cache prefix
  is `[tools][system][messages]`, so it was already broken two levels
  above messages and our index-0 flip added nothing. The EVENING
  handoff's ranking — "one occurrence costs more than the whole
  remaining absorption-miss population" — rested on `outDiv 0` alone and
  does not survive. **So CACHE-CONTROL 14 / TEXT 15 is once again the
  top of the queue**, and the `builtByUs` + pin-at-finding dispatch after
  it, exactly as the evening handoff ordered them below the index-0 item.
  **THE READING IS NOW A FIELD, not a paragraph.** Every stability
  violation carries `prefixAboveMessages {ourToolsIdentical,
  ourSystemIdentical, ccToolsIdentical, ccSystemIdentical, intact}` and
  the human line prints `[prefix ALREADY broken above messages:
  tools+system changed -> no marginal cost]` or `[prefix above messages
  INTACT -> the whole message array re-bills]`. `intact` is the OURS side
  because ours is what bills; the cc* pair answers the different question
  of whose change it was, and the two come apart precisely where
  deferred-tool-rewrite is doing its job. Demonstrated on the real row,
  not just on bites: the live line reads
  `n=331->336 … outDiv=0 [CC bytes at outDiv IDENTICAL -> ours]
  [prefix ALREADY broken above messages: tools+system changed -> no
  marginal cost] <- fresh-session-sort`.
  **WHAT SHIPPED, all of it pushed and suite-green (2154/2154):**
  (1) `_relocatedByConversation` in fresh-session-sort — a per-conversation
  memory of relocated types, keyed by `resolveInsertionSessionKey`
  (imported, never re-derived), LRU-capped at 256
  (`CACHE_FIX_FRESH_SORT_MAX_CONVERSATIONS`), serving a remembered block
  only when CC sends no instance of that type; CC's newer bytes always
  win, so a genuine content change still resets (65d0455).
  (2) That memory PERSISTED — one file per conversation key under
  `cache-fix-snapshots`, tmp+rename, owner-only, fail-open read, written
  only on change, disk bounded by the same cap (4a61b1c). Without it every
  restart re-inflicted the very divergence the memory prevents.
  (3) `reserved` telemetry plus conservation F-side clause (e), which
  verifies a re-serve against rewrites the gate itself saw on the wire
  earlier in the same conversation (65d0455).
  (4) `prefixAboveMessages` on every stability violation, and the human
  line that reads it (65d0455) — the cost annotation above.
  (5) A departure CENSUS class, `findRelocDepartures`, always on, REPORT
  not gate (500f131).
  (6) The daily sweep now persists per-gate ROWS, not just counts —
  stability, stability-exempt, conservation, conservation-exempt,
  sequence, order — capped at 200/field/capture with an explicit
  `<field>Truncated` marker, and `absorptionMissRows` moved onto the same
  recorder so an absent field reads as `null` rather than as a measured
  zero (c6a6e31, c0a525c). Measured growth on today's corpus: ~113 KB
  against 104 KB, ~8%.
  (7) `tools/test-config-root.mjs` — the suite had NO default config root,
  so any test driving a stateful extension wrote into the operator's real
  `~/.claude`; this one left 8 files there in a single run (4a61b1c).
  **THE FIX IS PROVEN LIVE — this replaced an "unproven" note held for most
  of the session.** Corpus-wide rate, from the sweep that now persists
  departure rows: 3 departures over 42 captures, 2 of them costly (prefix
  above messages INTACT), both on capture s-captureAC this afternoon. That
  capture replayed under the PRE-fix build produces exactly two stability
  violations at those same two pairs (n=120->123, n=254->259; outDiv=0,
  inDiv=3, ccIdenticalAtOutDiv=true, attributed to fresh-session-sort) and is
  CLEAN under the shipped build. Same capture, same gates, one variable.
  Neither was visible to the earlier counterfactual because both postdate the
  14:51Z pre-fix sweep — which is why the honest answer was "unproven" for
  hours and is not any more.
  What it saves, to its reach: CC diverged at index 3 on its own, so the fix
  prevents the AMPLIFICATION to index 0, recovering messages 0..2 — 19.7% of
  the array at n=123, 62.4% at n=259, messages[0] alone ~52 KB. The billed-
  token saving is NOT measured (it depends on breakpoint placement); the
  claim stops at bytes. Superseded note follows.
  **WHAT WAS NOT ESTABLISHED, until it was.** The class's
  live rate is now measured (2 departures / 342 same-conversation pairs on
  s-captureAB, 1 of them with an intact prefix), but the fix's live
  ENGAGEMENT is still unproven. The second departure does not prove it:
  neither sweep reports a stability violation at n=48->49 — not the
  post-fix one (16:00Z, `e20ece6439f4`) nor the pre-fix one (14:51Z,
  `3c14d4fd3446`), and the second is the counterfactual, so under the old
  code that departure cost nothing either. The extension had simply never
  relocated that type for that conversation. What would prove engagement
  is a departure whose predecessor carries a `relocated` declaration for
  the same type; none has been observed. The bites are still the only
  evidence that the memory does what it says.
  **DEPLOY IS DONE (restarted ~17:55Z, verified content-to-content).**
  `sourceFingerprint(disk)` == `/health proxy_tree` == `a5ca4c18d185`, and
  the 17:56->18:13Z sweep is stamped with that same tree, so all three
  answers agree. Bookkeeping correction (2026-08-05 fresh-context review):
  this paragraph previously said NOT DONE — commit e57908b's message
  claimed to amend it and the amendment never landed in the diff, so the
  label sat stale over a resolved body. Two evidence notes from the same
  review: the restart's "23 of 23 forwarded bodies byte-identical
  old-vs-new" A/B exists ONLY in e57908b's commit message, with no run
  artifact anywhere — treat that half as unverified; the "no cold record
  after" half IS verified against the worktime ledger (last real cold
  event 12:20:13Z, controlled resume 17:22:36Z, nothing after the
  restart).
  Row-3 statement for that restart: fresh-session-sort is now
  stateful-PERSISTED, so the restart is cache-transparent for it — the
  relocation memory is re-read from disk, which is exactly what the
  byte-identical-restart bite pins. No state KEY changed and no existing
  baseline is re-keyed: the state file is new, and its absence is an
  ordinary fail-open read. Price it with `tools/restart-exposure.mjs` like
  any other restart, but this change adds no re-baselining of its own.

- **PARKED — relocation-memory EVICTION stranding: the one route where a
  stranded memory costs the full array.** The memory and its state files
  are capped at 256 conversations (LRU + oldest-mtime prune,
  fresh-session-sort); a conversation quiet long enough to fall past BOTH
  caps loses its remembered block with the prefix above messages INTACT —
  the original row-25 full-cost flip, and eviction takes the quiet session
  first (the dev-loop harvest lesson, applied to state). Key-rotation
  stranding is exempt and free by coupling (row 25, the entry above);
  eviction stranding is neither. Missing evidence, named: no instance
  observed. The census already emits exactly the promotion signal: a costly
  departure row (`prefixAboveMessages.intact: true`) whose PREDECESSOR
  carries a `relocated`/`reserved` declaration for the same type, in the
  daily `relocDepartureRows`. One such row promotes this to work (raise the
  cap, or exempt-and-declare); until then it parks. 2026-08-05.

- **HANDOFF 2026-08-05 EVENING — superseded on its "START HERE" section
  by the night handoff above; the rest still stands.** Written at ~274k tokens on the depth rule, with
  work remaining and no blocker — the restart is the recommendation,
  not an exhaustion.
  **READ `docs/dev-loop.md` BEFORE THE FIRST CHANGE.** Not the pointer
  to it, the file. This session spent an afternoon re-deriving a design
  that closing-gate question 2 already stated in full, because the
  overlay carried a shorthand of the four questions good enough to feel
  sufficient. The shorthand is gone now (dotfiles f1eefc3) and question
  2 is widened for recurring producers (2fa2807). Do not re-add a
  summary anywhere.
  **STATE: everything committed and pushed, both repos.** Fork main at
  2fa2807; dotfiles at a8c506e. Proxy deployed and verified
  content-to-content (`sourceFingerprint(disk)` == `/health proxy_tree`
  == `3c14d4fd3446`), dotfiles pin `8c747aa`. Suite 2128/2128.
  **WHAT SHIPPED:** the absorption-miss classifier (`tools/
  absorption-classify.mjs`, 8-class ladder, two-pass with a mandatory
  cross-check), `--dump-forwarded`/`--dump-out` on replay, `prevN` on
  absorption rows, `absorptionMissRows` persisted by the sweep, and
  the container fix itself (04ed3c9) — the re-serve now emits the
  container the entry was LAST SEEN in, at all four re-serve sites.
  **THE NUMBER THAT MATTERED IS ANSWERED.** The morning's "50 misses,
  40 ours, unexplained" is one mechanism: 41 of 41 rows CONTAINER,
  every other class zero. The fix removed it — 15 rows gone, 26 moved
  to a later index, 0 reclassified at the same index.
  **START HERE INSTEAD — a LIVE stability violation at forwarded index
  0, ours by construction, found by the post-fix gate run.** Capture
  the 83 MB capture of the session that was carrying ~413k tokens,
  n=336 / prevN=331, ts 2026-08-05T13:50:48Z:
  `outDiv: 0` against `inDiv: 3`, with `ccIdenticalAtOutDiv: true` —
  CC's own message 0 was IDENTICAL across the pair and ours was not.
  The gate attributes it to **`fresh-session-sort`** by its own
  bisection. Three sibling events on the same capture (n=180, 185,
  325) ARE exempted; this one is not.
  WHY IT OUTRANKS THE CACHE-CONTROL LAYER: a divergence at forwarded
  `messages[0]` invalidates the entire messages array — the cache
  prefix is [tools][system][messages], so everything after index 0
  re-bills. That session was carrying ~413k tokens. One occurrence of
  this costs more than the whole remaining absorption-miss population.
  NOT MINE, and checked rather than assumed: replayed under
  `04ed3c9~1` and under `04ed3c9` in a frozen worktree, the violation
  is BYTE-IDENTICAL — same n, same prevN, same indices, same
  attribution. It surfaced now because the capture GREW (the request
  postdates the 12:20Z sweep), not because the container fix changed
  anything.
  WHERE TO START: this morning's triage established that
  `fresh-session-sort` rewrites the skills `<system-reminder>` block —
  `sortSkillsBlock` + `pinBlockContent`, 8080 -> 8079 chars — and
  booked that as a CONSERVATION matter with declared exemptions. This
  is the STABILITY face of the same extension and the exemptions do
  not cover it. The question to answer first is why the pin did not
  hold: `pinBlockContent` exists to make that block byte-stable across
  requests, and between n=331 and n=336 it did not.
  **THEN the next number: CACHE-CONTROL 14** (plus
  TEXT 15), out of 30 remaining misses, 24 ours. Both classes scored
  ZERO before the fix because the container divergence masked them.
  This is the same shape as the morning's 40, one layer down, and
  today's two busts (349k, 786k) are what an unabsorbed miss costs.
  **GATE STATE after the fix, stamped against the new build
  (`proxyTree 3c14d4fd3446`, 14:51-15:06Z): 39 captures, 2 failing,
  BOTH ATTRIBUTED and neither caused by this session's change.**
  ONE capture stability 1 — the index-0 finding above, proven
  byte-identical old-vs-new. A SECOND capture conservation 2 — the
  pre-existing row-24 container-flip pair the earlier handoffs already
  attributed. Sweep-wide absorption after the fix: 31 total / 25 ours
  over 7 captures.
  **RECOMMENDED ORDER for the next session** — the index-0 violation
  first (it is the only item here with a full-context re-bill behind
  it), then:
  (1) `builtByUs` + pin-at-finding as ONE dispatch — both `tools/`,
  both touch replay.mjs/gate-live.mjs, so one lane and sequential.
  `builtByUs` turns the `ours` split from a floor into a count (a row
  whose bytes were provably ours was scored not-ours today);
  pin-at-finding makes the evidence outlive the corpus and is the
  written revert trigger for the retention bridge.
  (2) Classify the CACHE-CONTROL layer.
  NOT worth the next session: the single surviving CONTAINER row
  (n=334 of the 597 MB capture) — one instance behind a deliberate
  fail-closed boundary, against fourteen in the next class.
  **ROW 4 IS NOT CLOSED.** The container fix is necessary and not
  sufficient for the 349k bust: on its own capture the divergence
  moved from index 360 to 373 and reclassified to TEXT, attributed to
  CC's own input (`inDiv` 369).
  **THE BRIDGE THAT MUST BE RETIRED:** capture retention is at 12288,
  raised from 8192 because the corpus was evicting captures an
  analysis still needed. Revert when pin-at-finding lands; the trigger
  is written in the dotfiles unit file where the knob lives.

- **BUST 2026-08-05 12:20Z — 786k, 655,021 tokens re-billed, and it was
  MY RESTART. Investigated, mechanism closed, lesson mechanized.**
  Full record: matrix "Row 3 datapoint — 2026-08-05".
  Chain, each link measured: the restart landed at 14:19:51 CEST,
  BETWEEN the busting pair's two requests (14:19:40 -> 14:19:58).
  Census says **append-only** — CC moved nothing mid-history — while
  the forwarded view diverged at `messages@1180(assistant)` with
  system and tools matching, so the change was ours.
  `identity-normalization`'s message loop runs over EVERY message,
  assistant turns included; the anchoring fix shipped minutes earlier
  narrowed what it rewrites. The diverging message is raw index 1216,
  an assistant turn OF THIS SESSION, containing
  `SessionStart:resume hook success:` quoted in prose — in the
  paragraph reporting the anchoring fix. Old build rewrote it, new
  build does not, restart swapped builds mid-conversation. Settled
  after one re-baseline, as a one-time cost should.
  THE ROW-3 STATEMENT PREDICTED THE CLASS AND MIS-SIZED IT. It said
  running conversations quoting the marker pay a one-time re-baseline
  — correct — and closed "one measured instance corpus-wide, so cheap
  and right", which is the wrong denominator. The corpus is history;
  the bill is live sessions. The affected session was the one the
  change was written in, which is the normal case for a change made
  while using the thing it changes, not bad luck.
  MECHANIZED: `tools/restart-exposure.mjs` prices a restart against
  LIVE sessions, optionally filtered by a predicate for the change's
  affected class. On today's predicate it reports ~581k tokens against
  the single matching session — the number missing from the decision.
  Its own first live run understated that session as `~0k` because it
  took the last record of ANY kind and the tail ended on an outcome
  record; fixed, and that defect is what its bite pins hardest.

- **BUST TRIAGED 2026-08-05 — the 349k s-captureQ event is row 4,
  post-deploy, and the operator's re-anchor hypothesis is REFUTED.**
  Full record: the new "Row 4 datapoint — 2026-08-05" section of
  `docs/directives/robustness-threat-matrix.md`. Headline: the two
  09:09:41Z / 09:10:03Z ledger rows are ONE event double-recorded
  (the earlier raced and never upgraded off `cause=other`);
  `cacheRead` 15,583 against `ctx` 364,589 means only tools+system
  survived. The mitigation RECOGNIZED the migration (`movedFresh:2`,
  join-moves at 370 and 402, count held 414 -> 414) and the forwarded
  prefix still diverged at `messages@360(system)` with identical
  leading content. Row 4 therefore does NOT close — its stated
  closing condition is a live non-event and this is a live event.
  **ANSWERED same day, measured and attributed** (full record in the
  matrix datapoint): forwarded[360] carries BYTE-IDENTICAL text in
  both requests and differs only in its CONTAINER — `content:"T"` at
  n=220, `content:[{"type":"text","text":"T"}]` at n=221, a 25-byte
  delta that is exactly the block-array JSON. The array form is
  byte-present nowhere in CC's raw request: we built it.
  `insertion-normalization` is the stage (per-extension trace; the
  `cache-control-normalize`/`ttl-management` lead was WRONG), and the
  reason is the pin's own contract — it re-serves FIRST-SEEN bytes,
  and the first time CC sent that message (n=194, 08:56:27.369Z) it
  was an array carrying `cache_control {"ephemeral","1h"}`. From
  n=195 it was a bare string for 26 straight requests. **Rows 4 and
  24 compose:** the un-merge restores the right text at the right
  index in a container that left the wire 26 requests earlier, and
  the staleness is dormant until a join-move fires.
  Operator-side, outside this repo: the periodic re-anchor hook's
  ~52KB corpus output is truncated by the harness's persisted-output
  mechanism to a 2,324-char preview plus a file pointer
  (`.../tool-results/hook-…-additionalContext.txt`, 54,266 bytes on
  disk) — the corpus it exists to re-show does not reach the model.

- **FINDING 2026-08-05 (dispatcher-measured) — the absorption check's
  `ours` flag UNDER-attributes, so "40 of 50 ours" is a floor and the
  class question must be asked over all 50.** Measured on the
  known-positive capture, which the sweep scores 2 total / 1 ours.
  Both rows are class CONTAINER with a 25-byte delta; the second
  (`n=124->130`, forwarded index 178) is scored NOT ours only because
  CC's own input diverged earlier — `inputDivergence 28` against
  `forwardedDivergence 178` — and the flag is
  `ours = inDiv === null || inDiv > outDiv` (replay.mjs:1228).
  So the flag answers "is the FIRST forwarded divergence explainable
  by CC's input?", not "did WE build the bytes at the divergence
  index?" — and on this row the earlier input divergence is one our
  own pipeline ABSORBED, i.e. the mitigation working, which then
  disqualifies the row from the attribution it deserves.
  THE SHARPER TEST EXISTS AND IS THE MATRIX'S OWN: is
  `JSON.stringify(forwarded[i])` byte-present in CC's raw `messages`
  array? Run over both rows (probe: replay `--dump-forwarded
  124:178,130:178,220:360,221:360`, then a substring test against the
  raw record):
      n=124 forwarded[178] string 9002 B — present in CC's raw: YES
      n=130 forwarded[178] array  9027 B — present in CC's raw: NO — we built it
      n=220 forwarded[360] string  405 B — present in CC's raw: YES
      n=221 forwarded[360] array   430 B — present in CC's raw: NO — we built it
  The text is present in CC's array in all four cases; only the
  container is ours. So `n=130` is the 349k defect exactly, 96
  requests earlier in the same capture, and the flag hid it.
  READY, and it is small: `--dump-forwarded` gains a `builtByUs`
  boolean computed at dump time (`rec.body.messages` is in hand there,
  pre-pipeline), and `absorption-classify` carries it as a column
  beside `ours`. Re-run the corpus after it lands and grade the
  classes on `builtByUs`, not on `ours`. Verifier, red-first: assert
  `builtByUs === true` for n=130 and n=221 and `false` for their
  predecessors — red today, since the field does not exist.
  RESIDUE, named: this says nothing about the 10 not-ours rows on
  OTHER captures; they may be genuine CC-side divergences. The
  re-run is what settles their split, and until it lands the honest
  statement is "at least 40 of 50, mechanism unconfirmed for the
  remainder".
  **RE-GROUND BEFORE DISPATCHING THIS, 2026-08-05 evening: the named known
  positives are not reproducible on the current corpus.** `n=124->130` is
  gone from the sweep entirely, and `n=220->221` now diverges at forwarded
  373 rather than 360 — the container fix (04ed3c9) moved it, exactly as
  the evening handoff recorded. Spot-checked with this entry's own sharper
  test (is `JSON.stringify(forwarded[i])` byte-present in CC's raw
  `messages`?) on three rows of today's 34, one per shape: the row-4
  residual (i=373), the surviving CONTAINER row (i=346 — CC sends both the
  array and the bare-string form itself, row 24's flip seen from the other
  side), and a cache_control-only row (i=414). All six reads byte-present,
  so no live "we built it" instance turned up among them — three rows of
  34, a spot check and not the population.
  A briefed known positive is a claim, not a fixture (dev-loop, "Adding a
  check"), and a check whose motivating case dissolves does not get a
  substitute hunted for it. The next move here is a live known positive or
  a re-grade, not a build.

- **FINDING 2026-08-05 (measured, mid-dispatch) — the capture corpus
  is SATURATED, so evidence now expires by mtime within hours, and
  every corpus-wide number the sweep prints is unreproducible the
  moment it is printed.** Surfaced by the absorption-classification
  dispatch: 3 of the 12 captures the 12:20Z sweep measured were GONE
  from disk when the classifier ran at ~15:30Z, taking 11 of the 50
  rows (9 of the 40 `ours`) with them. Mechanism, read at the source:
  `request-capture.mjs:191-219` (`sweepCaptureDir`) deletes
  OLDEST-mtime-first until the directory is under the ceiling, and
  the serving ceiling is `CACHE_FIX_CAPTURE_MAX_MB=8192` (read live
  from `systemctl --user show cache-fix-proxy -p Environment`) against
  a directory measuring 7.6 GB / 37 files right now — down from 41
  files at the sweep. At the ceiling every new request evicts an older
  capture, so eviction is CONTINUOUS, not occasional, and it selects
  on last-write time rather than on evidentiary value: the quiet
  session's capture goes first, and a capture is quiet exactly when
  its conversation has ended, which is when it becomes evidence.
  THE CONCRETE COST, today, twice over: the capture that carried this
  morning's 38-row conservation gate-red is one of the three that
  rotated away. That triage had to REPLAY the capture to get its rows
  (the status file stores counts only), and it landed hours before the
  file was deleted. Had it not, the row-level attribution behind
  "GATE-RED CLOSED" could no longer be produced at all — the fix and
  its tests would stand, and the evidence for WHY would be gone.
  NOT A NEW RETENTION POLICY. Raising the ceiling buys hours and
  changes nothing structural; the corpus is a rolling window by
  design and should stay one. What must change is that a measurement
  keeps its own rows at the moment it takes them, which is the READY
  item below.
  BRIDGE TAKEN 2026-08-05 (operator GO): ceiling 8192 -> 12288
  (dotfiles 4c2d0ca, unpushed there — a concurrent writer holds that
  repo). Restart verified transparent: `proxy_tree 9ef42be576bd`
  before and after, env-only change, so no forwarded byte differs and
  no `restart-exposure` run was owed (row 3). The dotfiles comment
  claiming "8 GB ~= 11 Tage" was falsified by today's measurement and
  is corrected in the same commit. REVERT TRIGGER: the READY item
  below plus the pin-at-finding item — once both land, the window
  carries discovery only and 8192 is enough again.
  THE SIGNAL FOR THIS EXISTED AND HAD NO READER, which is the part
  worth keeping. `harvest.mjs:897-901` prints "WARNING: N capture(s)
  expired before harvest — raise CACHE_FIX_CAPTURE_MAX_MB", and the
  unit comment names that warning as the designed measurement of
  whether the cap suffices. It runs twice daily. Nobody has read it:
  the ledger carries 93 `gone` entries against 7 live. So the cap was
  instrumented from the start and the instrument reported into a
  stream with no consumer — the orphan-telemetry class this backlog
  already tracks (Q4), landing on the one number it was built for.
  Also, the warning's own wording is wrong in the same way today's
  byte-length label was: every one of the 93 has a watermark >= 1,
  i.e. it WAS harvested at least once, so the message fires on
  "expired after harvest" while saying "before harvest". Fix the
  string when the reader is built; a warning that misstates its own
  condition trains the reader who finally arrives to discount it.

- **PARKED — `_pinnedBlocks` in fresh-session-sort (and its twin in
  identity-normalization) is keyed by BLOCK TYPE alone, across every
  conversation on the machine.** Noticed while building the relocation memory
  beside it, and deliberately not touched: it is the repo's own
  identity-computed-too-cheaply shape ("Identity is where the bugs live"),
  and two live conversations with different skills blocks do flip the pin
  every request. It costs nothing TODAY, and the reason is worth writing
  down: on a hash mismatch the function returns `normalized`, a pure
  function of the current call's own argument, so a collision evicts a cache
  entry and never returns another tenant's bytes — the pin is a
  reference-identity micro-cache, exactly as the restart-state audit
  established. Named missing evidence before it becomes work: a use that
  reads `pinned.text` for anything other than returning it, or a second
  writer of `_pinnedBlocks` — either turns the collision from free into
  cross-tenant. The relocation memory next door is keyed per conversation
  and is not affected.

- **PARKED — the rotated-identity born-large population: 20 of 28 born-large
  starts are NOT resume-shaped.** Signature, measured 2026-08-05: first
  system block rotates (the agent-SDK identity swap) with a repeating
  ~+2,040-char total-system delta, new conversation born at 57-244
  messages, clustered across sessions and days. These are some distinct CC
  mechanism (teammate/SDK agent boundaries?) — not operator `/resume`, and
  currently nameless, so any cost they carry is invisible in triage.
  Missing evidence, named: what CC feature produces them (correlate one
  boundary's timestamp against the operator's transcript for that session),
  and whether their first request re-bills (read its outcome record's
  cache_read). Both are one-capture lookups; either promotes the class to
  its own matrix row. The born-large census class above will count them
  from day one via the sub-key-rotated field.

- **PARKED — what the pointer lane does NOT cover, named by its builder rather
  than discovered later.** Shipped 2026-08-05 (ffdf760, `--pointers`,
  report-only, 5 labels after COMMIT-DEAD was dropped). Four declared blind
  spots, each with the evidence that would promote it to work: (1) the
  false-fire rate is measured on ONE file at ONE commit — future entries may
  cite shapes never seen, and that rate is the input to any decision to make
  the lane BLOCKING; (2) ABS-PATH and REF-DEAD rest on n=1 each; (3) the lane
  answers "does this pointer resolve", never "does it still MEAN what its entry
  claims" — a live path whose contents moved reads clean; (4) `bin/`, `hooks/`
  and `templates/` are real top-level dirs here but sit outside the scoped
  four-dir set, so a dead path under them is invisible. (4) is a one-line
  widening whenever someone wants it; the others need accumulated runs, which
  is the trigger: revisit after the lane has been run on a materially changed
  BACKLOG.md a few times.

- **PARKED — `~/.claude/cache-fix-snapshots` grows without bound: ~9,800 files
  / 181 MB, five writers, no pruner anywhere (measured 2026-08-05).**
  fresh-session-sort's new state files prune their OWN class (newest 256), and
  that is deliberately all they touch: another extension's canonical is
  load-bearing for ITS correctness, so a directory-wide sweep is not a
  tools/-side decision. Named missing evidence: which of the five classes are
  still READ after their session ends (insertion canon and ladder rungs are,
  by design; `-last.json`/`-diff.json` may not be), and what the retention
  window should be for each. Until that is answered a pruner would be deleting
  state on a guess. The deployment side (a timer, if it lands) belongs in
  dotfiles, not here.

- **INCIDENT RECURRED 2026-08-05 12:35 — the entry below was booked
  SOLVED and was not; the fix covered the pre-push PATH, not the
  hazard. Now closed at the spawn, red-first, measured.**
  WHAT HAPPENED: the same corruption, same signature — `core.bare =
  true`, `user.name = t`, `user.email = t@t` written into the SHARED
  `<repo>/.git/config` (this clone), breaking
  the work tree for the main repo and all six live worktrees at once.
  Repaired by unsetting the three keys; nothing else in the config was
  touched, no commits lost, every worktree healthy afterwards
  (checked, not assumed).
  ATTRIBUTION, immediate and mine: a dispatch brief I wrote listed the
  incident repro itself as a verifier — `GIT_DIR=$(git rev-parse
  --absolute-git-dir) node --test test/absence-scan.test.mjs` — WITHOUT
  sequencing it after the hardening it was meant to verify. Run against
  the un-hardened file, that command does exactly what the un-hardened
  file does. The agent executed the brief correctly.
  WHY THE EARLIER "SOLUTION" DID NOT HOLD, and this is the part worth
  keeping: it hardened `tools/git-hooks/pre-push` (sanitize the hook
  env before `npm test`). That closes ONE CALLER. The hazard lives in
  the test helpers, which spawn git with `cwd: tempdir` and an
  inherited env, so ANY runner with `GIT_DIR` set reproduces it — a
  hook, a hand-typed command, another repo's tooling, an agent. The
  entry below even names the remaining work ("Same hardening goes to
  fork-main's own copies … when this ships") and defers it to a PR
  that has not landed; that deferral is what left the hole open for
  seven hours. A fix at the caller is not a fix at the hazard.
  FIXED at the spawn, in both files, red-first on a THROWAWAY CLONE so
  the proof itself risked nothing: un-hardened, the repro moves the
  config md5 `58de0dd7…` -> `81d02943…` and injects `user.name=t` /
  `user.email=t@t`; hardened, 36/36 tests pass and the md5 is
  BYTE-IDENTICAL before and after. `SCRUBBED_GIT_ENV` sets `GIT_DIR`,
  `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_COMMON_DIR`,
  `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`,
  `GIT_CEILING_DIRECTORIES` to undefined (not `""` — an empty string
  is still "set" to git), inlined in each test file rather than shared,
  so `absence-scan.test.mjs` stays standalone-portable for the split PR.
  **MECHANIZATION, now doubly earned and still not built** — the
  entry below already named it: doctor FAILS on a local
  `user.name`/`user.email` in this repo (the convention here is the
  global identity, so a local one is always leakage) and on
  `core.bare` being set in a non-bare repo. Both are computable
  predicates with near-zero false fires, and both would have caught
  this within seconds instead of at the next `git rebase`. It is a
  dotfiles-repo change; surfaced to the operator rather than made from
  a fork session.

- **NEW FINDING 2026-08-05, from the same event — `hooks/examples/
  worktree-edit-guard.py` is GIT_DIR-sensitive.** Measured, not
  argued: with an absolute `GIT_DIR` exported, all eight "block"
  assertions in `test/hook-worktree-edit-guard.test.mjs` fail — the
  guard resolves the exported git dir instead of the worktree it was
  asked about, so it stops blocking out-of-worktree edits. Its real
  deployment is a Claude Code PreToolUse hook, where no `GIT_DIR` is
  exported, so this is not a live hole today; the test now spawns it
  with the same scrub for exactly that reason (it should measure the
  guard, not the harness's environment). Open question, not decided
  here: should the guard scrub its own environment before resolving
  paths, so that a future caller which DOES export `GIT_DIR` cannot
  silently disarm it? Fail-closed is this guard's whole design, and
  "silently stops blocking under an inherited env" is the opposite.
  Verifier if built: the same eight assertions, run under an exported
  absolute `GIT_DIR`, must still block — red today by measurement.

- **PARKED [HANDED OFF 2026-08-10] (small, operator-side, dotfiles) — `cache-fix/CLAUDE.local.md:91`
  lists FOUR verdicts and there are now six.** Found 2026-08-07 by the enum
  lane's dependents search, which is the reason that search is a convention: a
  value-set change breaks its documented consumers silently. The file is
  deployed from dotfiles and must be edited THERE, never in this tree. Also
  update the runbook's list if it drifts again — this repo's copy was corrected
  in the same commit as this booking.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  The doc still lists 4 verdicts (unchanged, so the entry stands), but the
  real count is now 7, not the `six` this entry cites — KEY-FLIP, shipped by
  n=76's own work, was never counted.
- **(PARTLY DONE — 2026-08-08, `978a44e` operational + `ddcdca3` user-facing;
  the wider class is IN FLIGHT) the XDG migration left ~50 legacy
  `~/.claude/cache-fix*` path
  citations across the tracked tree, and only the operational read path was
  swept.**
  **ANSWERED, and it was the entry's gating question: the PROXY's own defaults
  moved, not just this machine's data.** `proxy/extensions/request-capture.mjs`
  returns `process.env.CACHE_FIX_CAPTURE_DIR || dataPath("captures")`, importing
  from `proxy/xdg-dirs.mjs`, and six proxy extensions import those helpers. So
  the legacy citations were wrong for every consumer of this package, not merely
  stale for us — which is what moved this from a docs chore to a shipping bug.
  **The user-facing sweep shipped** (`ddcdca3`): 25 citations across seven docs,
  each path resolved through its OWNING module before being written, plus one
  user-facing string inside `proxy/` — which moved the proxy tree hash and was
  handled as such (dotfiles pin `b1d070f` -> `e631c5b`, restart 09:59 local,
  row-3 declaration made BEFORE the restart because the string is metadata on an
  extension's default export and cannot reach forwarded bytes).
  **AND THE SWEEP'S OWN SCOPE WAS THE DEFECT.** It was scoped by
  `git grep "\.claude/cache-fix"` — a pattern encoding a NAMING convention while
  the defect is a LOCATION. ~74 citations of the same class remained, of
  proxy-owned artifacts whose filenames lack the substring (`quota-status/`,
  `usage.jsonl`, `session-mirrors/`, `upstream-baseline.json`,
  `workflow-derivation-events.jsonl`, …), leaving `docs/disk-usage.md`
  internally contradicting itself. This is the SECOND instance of that error in
  one day and both are the dispatcher's: the first was this entry's own
  `ls ~/.claude/cache-fix*` count, corrected in the morning and then reproduced
  in an afternoon brief. Rule booked in `docs/dev-loop.md`.
  **THE WIDER SWEEP SHIPPED** (`332df4a`), and the discrimination held: 116 ->
  76 occurrences over the owned set, with 34 SURVIVORS that are supposed to
  survive — `settings.json` x9, `hooks/` x8, `projects/` x4, `.credentials.json`
  x3, `.oauth_refresh.lock` x1, all Claude Code's own config root, plus 9
  deliberate historical/fallback mentions. `docs/disk-usage.md` went to ZERO and
  its rows no longer disagree with each other. CHANGELOG rose by 2 on purpose —
  the new `[Unreleased]` entry cites `~/.claude` to say what moved OUT of it —
  and all ~27 wider hits there sit in dated release sections, so none was
  rewritten.
  **Untouched populations verified by construction rather than by count**: the
  commit touches exactly the six owned docs, so `code-reviews/`, `audits/`,
  `directives/`, `tools/`, `test/`, `proxy/` and `preload.mjs` cannot have
  moved. Worth recording because my first attempt to check this compared MY
  occurrence counts against the lane's LINE counts on a tree that had since
  gained two other lanes' commits — two instruments and two trees, which is the
  namespace error one level up. The file list settles it and the counts do not.
  **What remains, and it is not this entry's:** `preload.mjs`'s citations are
  its real deployment path and are correct; `docs/directives/` and the
  historical sets stay as written.
  Original entry follows. Found 2026-08-08 by a lane that named ONE stale citation
  (`docs/dev-loop.md`); the grep for the class found, AFTER the operational
  half was fixed, 85 remaining hits in 48 files (`git grep -c
  '\.claude/cache-fix' -- . ':!BACKLOG.md'`, summed — 106 in 49 files counting
  this file's own prose, which is history and stays). The
  operational half is FIXED in this entry's commit — `docs/dev-loop.md` and the
  three runbooks, 11 citations repointed to
  `~/.local/state/cache-fix/gate-status.json`,
  `~/.local/share/cache-fix/captures/` and
  `~/.local/state/cache-fix/snapshots/`, each proved by RUNNING the documented
  command (the `jq` returns `false / 3`, the census glob resolves 100 captures)
  rather than by re-reading the path.
  **What is deliberately NOT swept, and why it is a decision rather than an
  omission.** Three populations, and bulk-editing them would each be a
  different mistake. (1) HISTORICAL records — `docs/code-reviews/`,
  `docs/audits/`, `docs/disclosure/`, `march-23-regression-investigation.md`:
  these record what was true when written, and rewriting them falsifies the
  record. Leave permanently. (2) UPSTREAM-FACING docs — `README.md`,
  `README.zh.md`, `CHANGELOG.md`, `docs/guia-pt-br.md`, `docs/monitoring.md`,
  `docs/CONSUMER-SETUP.md`, `docs/disk-usage.md`: these document behaviour for
  cnighswonger's users, and whether they are wrong depends on whether the
  PROXY's own defaults moved or only this machine's data did. Unresolved and it
  is the real question. (3) CODE comments and docstrings in `proxy/**` and
  `tools/**`: same dependency, plus `tools/alias-claim.mjs:48`'s
  `LEGACY_REGISTRY` is a DELIBERATE one-transition fallback and must not be
  touched.
  **Done-criterion:** answer (2) first by reading what `proxy/` actually writes
  today — if the defaults moved, the upstream-facing docs are wrong for every
  consumer and that is a shipping bug, not a docs chore; if only this
  deployment's data moved, they are correct as written and the sweep ends. The
  entry stays READY because that read is the whole decision and it is cheap.
  Verifier: `git grep -c "\.claude/cache-fix"` before and after, with the
  three populations accounted for by name rather than by count.

- **PARKED (named residual, not a defect) — the finding-granular discard walks
  every distinct published version of a path, measured at 5.4s for 226 versions
  of one file.** Recorded 2026-08-08 from the leak-scan lane's measurement so it
  is not re-derived. Paid ONLY when a path already has findings; a clean push
  short-circuits before the walk (rc==0), so no normal push pays it. The lane
  surfaced an early exit (stop once every pending identity is matched, giving an
  IDENTICAL discard decision and cutting the common case to ~1 run) and did NOT
  build it, correctly — it was outside its brief.
  **DECIDED at the desk: do not build it.** A latency nobody waits on does not
  justify adding a termination condition to a filter whose correctness is the
  entire point — a wrong early exit discards a finding that was never matched,
  which is the swallow direction. What would unpark this: a measured case where
  the walk is actually in someone's way (a path with versions in the thousands,
  or a push that visibly stalls). The number above is the trigger to compare
  against.

- **PARKED [HANDED OFF 2026-08-10] (small, POINTER — body belongs in the dotfiles/harness repo) — a
  path-restriction hook read a REGEX as a filesystem path and denied the
  command.** Measured 2026-08-08: `restrict-bash-paths.py` blocked a lane's
  probe because the grep PATTERN it carried was `/home/[a-z]+/\.claude` — a
  regular expression, matched as though it were a path outside the allowed
  directories. The lane obeyed the hook's own instruction not to retry or work
  around, so that arm of its reach check is permanently UNRUN.
  **Third instance today of one shape**, which is what makes it worth booking
  rather than shrugging at: a guard whose predicate reads the PAYLOAD when it
  means to read the INTENT. The other two are the subagent push-gate firing on
  the word "push" inside commit MESSAGES, twice, both on lanes whose subject was
  the push hook. Design not decided here — it belongs to whoever owns the hook;
  what this entry carries is the measured shape and the fire count.

- **PARKED — nothing checks that a booked verifier is still RUNNABLE, so a
  red-first arrangement rots silently between booking and build.** Booked
  2026-08-08 as the WRITER half of the leak-scan entry's stale-verifier
  correction (that entry carries the reader half: the arrangement re-anchored to
  a commit range). The judgment half shipped as prose the same hour —
  `docs/dev-loop.md`, "Adding a check", the immutable-anchor paragraph — so what
  is parked here is only the mechanized half.
  **Why it is parked and not ready: the missing piece is a computable predicate
  with near-zero false fires, and three candidates have already failed.**
  (1) Matching wording ("must go from BLOCKED to allowed", "currently",
  "available immediately") is an enumerated tell — it catches its listed
  variants and misses the next one, which is the failure shape the corpus names.
  (2) "The verifier must cite an immutable anchor" over-fires on every entry
  whose verifier is legitimately `npm test`. (3) Re-RUNNING each booked verifier
  is the only honest check and is not a lint — it is a sweep, and its cost is
  unbounded.
  **What would unpark it:** a predicate that separates a verifier naming
  VOLATILE state from one naming a standing command, stated as a rule rather
  than a word list — plus a measured false-fire rate over the current READY
  population before it blocks anything. Note the adjacent machinery that may
  already reach part of it: the pointer lane's liveness check
  (`docs/dev-loop.md`, "A liveness or resolution check asks 'does this
  resolve'") already resolves cited refs and paths, and a verifier citing a
  commit that no longer resolves is exactly its shape — check whether extending
  it costs less than a new check before designing one.
  **Rate, honestly:** three recorded instances of an entry's own load-bearing
  claim dissolving under a one-command probe, all found by a session that
  probed before briefing. None was found by a check.

- **PARKED 2026-08-08 — delete `legacyReadPath` and its 26 call sites. Named
  missing evidence: 30 consecutive days with no `CacheFixLegacyPathWarning`.**
  `proxy/xdg-dirs.mjs:100-106` instructs its own deletion — "REMOVE THIS AND
  EVERY `legacyReadPath(` call after the transition. Grep for the function name;
  that is the whole deletion" — and nothing anywhere named when the transition
  ends, so a fallback designed for ONE transition has been indistinguishable
  from permanent since it landed. Measured 2026-08-08: `git grep
  "legacyReadPath("` returns **26 hits across 12 files** (`proxy/xdg-dirs.mjs`,
  `proxy/extensions/cache-telemetry.mjs`, `test/xdg-dirs.test.mjs`, and the
  tools `bust-triage`, `cold-events`, `cost-report`, `dossier`, `gate-live`,
  `harvest`, `quota-analysis`, `restart-exposure`,
  `scan-description-carrier-evidence`), and BACKLOG.md contained zero mentions
  of it before this entry.
  **Why PARKED and not READY, with the evidence named so this is a spec rather
  than drift:** the deletion is trivially enumerable and its DONE-criterion is
  its own grep returning zero, so nothing about the work is undecided — what is
  missing is the evidence that the transition finished. Deleting while a machine
  still holds unmigrated data turns a loud warning into a silent absent-file,
  which is the failure the fallback exists to prevent.
  The trigger is measurable rather than a judgement call because the instrument
  already exists: the fallback emits `CacheFixLegacyPathWarning` once per path
  per process, so "no warning for 30 consecutive days" is observable. It becomes
  READY the day that holds.
  Verifier when it fires: `git grep "legacyReadPath("` returns zero, `npm test`
  green, and — the arm that matters — a probe run against a HOME containing only
  legacy-located artifacts must fail LOUDLY with a missing-file error rather
  than silently resolving to an empty new path, because a silent empty read is
  exactly what the three-answer design in the module header was built to avoid.
  <!-- entry: "delete legacyReadPath and its 26 call sites" -->

- **PARKED [SUPERSEDED — see above] (small) — a lane whose worktree is RECLAIMED lands in the shared main
  checkout, and its in-progress red then blocks the DISPATCHER's unrelated
  push.** Measured 2026-08-08 afternoon, end to end. A lane was dispatched with
  worktree isolation; the worktree did not survive, and the lane correctly
  reported that it was in the shared checkout. That report was acknowledged and
  the write-boundary rules were re-issued (pathspec-only commits, never amend,
  never push) — and the coupling nobody named was the PUSH: the repo's pre-push
  hook runs the WHOLE suite, so the lane's half-written
  `test/xdg-writer-guard.test.mjs:112` (2407 pass / 1 fail, a test it was
  actively iterating on) blocked a dispatcher push carrying two unrelated
  commits. The dispatcher's work was green; the tree was not.
  **The wrong repair is `--no-verify`, and it is worth writing down why**, since
  it is the obvious move and the hook itself suggests it. The repo hook is
  CHAINED behind the global dispatcher hook (dotfiles `git/hooks/pre-push`),
  which runs the fixture-leak scan — so `--no-verify` skips the suite AND the
  leak scan, at the exact boundary where git history stops being editable. A
  bypass taken for an unrelated red is how a capture id reaches a public repo.
  The correct move is to wait for the tree to go green, which is what happened.
  **What is actually missing:** `docs/dev-loop.md` says concurrent lanes need
  worktrees, and the dispatch skill's worktree recipe assumes the worktree
  exists. Neither covers the case where the harness RECLAIMS it mid-run and the
  lane silently continues in the shared checkout — discovered by the dispatcher
  at push time, which is the worst moment to discover it.
  Design, decided, two halves. (1) A dispatcher-side probe at the first report
  from any isolated lane: confirm the worktree still exists
  (`git worktree list` naming it) before acknowledging; a reclaimed worktree
  converts the lane to shared-checkout rules, which now include "the dispatcher
  cannot push until you are green — tell me when you are". (2) State the
  coupling in the brief's write-boundaries section so the executing lane knows
  its red is not private. Do NOT try to scope the pre-push suite to changed
  files: the whole-suite run is what catches cross-file breakage and narrowing
  it to buy push latency trades a real guard for convenience.
  Verifier, red-first, reproducible without waiting for a lane: in a scratch
  clone, add a failing test file, commit an unrelated change by pathspec, and
  confirm `git push` is BLOCKED; remove the failing test and confirm it is
  allowed. That is the whole mechanism, and it is the arrangement this incident
  ran by accident.
  Consumer tier **3 (backlog and process)** — it costs elapsed time and a
  bypass temptation, not a wrong verdict. Unranked (booked after the
  derivation).
  <!-- entry: "a lane whose worktree is RECLAIMED lands in the shared main checkout" -->

- **The instrument-positive, kept in place:**
  `lintCorrectionPlacement` flags the first correction marker (PREMISE
  CORRECTED / RE-GRADED / CORRECTED / WITHDRAWN) appearing past the first third
  of an entry; backtick-quoted mentions are exempt. Over the current file it
  returns **16 findings, spot-checked and all real** — genuine late-appended
  corrections, each one a body that contradicts its own head for anyone who
  stops at the head.
  Its over-firing control is part of the same run and matters as much as the
  16: the `bust-appears` DONE entry, whose correction sits inside its own
  header at line 2 of 13, stays SILENT. So the check separates a correction
  that was folded into the head from one appended below it, which is the whole
  distinction the class is about.
  This entry no longer needs to argue the class exists. What it needs is the
  disposition of the 16 — fold each correction into its entry's head, or
  establish that some of them are legitimately tail-shaped. That is prose work
  over 16 named entries and it is a BATCH candidate by construction.
  Original entry follows.
- **PARKED [HANDED OFF 2026-08-10] (small, POINTER — the fix site is `dotfiles`) — the session-start
  line reports `127 open item(s)` from `## Open` alone, while the file holds
  337 entries across five sections, and the rendered line carries no
  qualifier.** Measured 2026-08-10 by section:
  `## Open` **128**, `## Done` 93, `## Upstream PR round` 82,
  `## Parked decisions` 29, `## From the closing-gate sweep` 5.
  `session-scan.py:29` (dotfiles) declares the `## Open` scope in its
  docstring — the code is honest; the OUTPUT is the paraphrase. A reader sees
  a whole-file count. This is the label-over-body class pointed at our own
  instrument: the scope is true, stated, and invisible at the point of use.
  Design (decided): the rendered line names its scope —
  `backlog (BACKLOG.md): 128 open item(s) [## Open only; 209 more in 4 other
  sections]`. Cheaper and more honest than widening the scan.
  **Owed write, not done, and the reason is stated rather than silent:** the
  fix site is `session-scan.py` in the `dotfiles` repo, whose working copy was
  reported carrying ~50 unpushed commits from a peer session. One writer per
  working copy — writing this entry into another writer's tree is the
  collision the dispatch rules forbid. The dotfiles-side booking is
  OUTSTANDING and this pointer does not discharge it; a pointer whose consumer
  never loads this file is decorative.
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "session-start line reports ## Open only, unqualified" -->

- **PARTLY DONE 2026-08-10 — the bar is now written down and one of its five
  predicates is enforced; three remain.**
  **Shipped:** the bar itself is in `CLAUDE.local.md` (dotfiles
  `cache-fix/CLAUDE.local.md`, commit `7530895`, deployed and pushed) — stated
  in one line with the load-bearing fact under it, the 2026-08-10 measurement,
  the enforcement split, and the note that git history is not covered.
  **Also shipped, by a different route than this entry predicted:** the
  canonical-UUID predicate. `a449d9a` widened the source-UUID roster to every
  tracked SOURCE_SCANNABLE file, so a session id in any tracked source file or
  document now fails `npm test`. That is stronger than the `absence-scan`
  predicate proposed below and supersedes it — one owner for the shape, not
  two.
  **Still open, and the entry is READY for exactly these:** the base64-run,
  non-empty-thinking, and foreign-path predicates over source files, plus the
  harness-marker one. Each ships with its own planted-positive fixture — four
  reds, not one, because red certifies the class that fired.
  Original entry follows.
  Booked 2026-08-10, the day the bar was first stated. The bar: **no content
  from any session other than cache-fix's own dev chat reaches the public
  tree**; tool names are acceptable.
  Every check that currently defends it was run BY HAND this session. When
  the next session harvests, nothing re-runs them.
  Design (decided), splitting computable from judgment exactly where the
  post-incident rule says to. Computable, and it goes into `absence-scan.mjs`
  (already a pre-push hook, so it sits before the irreversible boundary):
  a base64 run of ≥256 chars; a non-empty `thinking`/`redacted_thinking`
  body; an absolute `/home/<user>/...` path outside this repo and the known
  XDG roots; a canonical UUID in content or filename; the harness markers
  (`<system-reminder>`, "The user sent a new message while you were
  working:"). Each of the five ships with its own planted-positive fixture in
  the test — five reds, not one, because red certifies the class that fired,
  never the instrument's reach.
  Judgment remainder, staying prose with the operator as backstop: whether a
  given residual string is other-session content or this repo's own
  vocabulary. The 2026-08-10 pass had to classify 3,012 distinct residual
  strings by hand and every one turned out to be this repo's census
  vocabulary, sanitizer provenance notes, or test scaffolding — that
  classification is not mechanizable and should not be faked.
  The bar itself belongs in `CLAUDE.local.md` (the operator overlay, which is
  where fork conventions live and which every session in this repo loads),
  stated in one line, with the mechanism named beside it.
  Verifier: the five planted-positive fixtures each turn `absence-scan` red in
  isolation, and the whole current tree stays green — the over-fire half.
  **Two of the five now have a REAL known positive, which beats a planted one
  and was found the same day** (see the history-scan entry below): the base64
  predicate can be proven on blob
  `aceb2c443f4a35f5f76ac2adbf5e7c59c96ca1b8` — an actual 9,794-byte PNG that
  actually shipped — and the UUID predicate on **s-captureAX**'s full session
  id, which sits in `LEDGER-Siren.json`'s historical blob (the id itself is in
  the machine-local alias registry, not here). A predicate red on the defect
  that really occurred certifies the class
  that really fires; a planted case certifies only the planting.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "the operator's publication bar is not written down or enforced" -->

- **DECISION (operator's) — git history was scanned end to end for the first
  time on 2026-08-10, and it holds exactly two things: one real published
  image, and a reversible session-id mapping. No conversation text.** The
  question decision #4 ("no history rewrite") was answered under is now
  measured rather than unknown.
  **Method, so the numbers are re-checkable.** Population defined
  mechanically and pinned: every blob introduced by a fork-only commit, any
  path — `git rev-list upstream/main..HEAD` then `git diff-tree -r` per
  commit — **712 commits, 1,752 distinct (blob, path) pairs**, pinned at
  `cf0592d` because HEAD moved mid-run and a moving population is not a
  population. Seven-class closed taxonomy, each class required to catch a
  planted positive before any of its zeros counted; `blobs_scanned` 1752,
  `blobs_unreadable` 0.
  **FINDING 1 — a real PNG, published, unretractable.** Blob
  `aceb2c443f4a35f5f76ac2adbf5e7c59c96ca1b8`, the reset-move 196-197 fixture
  of **s-captureAX**, at `$.requests[0..4].messages[210].content[2].source.data`:
  9,794 bytes, PNG magic verified, **951x55, 8-bit RGBA**, five identical
  copies. Header decoded only; the image was not viewed. Introduced by
  `a1170a7`, removed by `687cbc5` ("sanitize fixtures fully: nested payloads,
  capture identifiers, wall-clock, filenames") — **both commits are ancestors
  of `origin/main`**, so it was public before the scrubber fix and the blob
  stays fetchable at its sha forever. This is the incident
  `docs/dev-loop.md` already records, now located to the byte. `in_head:
  false` is not protection, and the permalink probe (raw and blob both HTTP
  200 at a pinned sha, 404 at `main`) is why.
  The second base64-shaped hit is NOT an image — it is a thinking-block
  `signature` field in the oscillation 863 fixture of **s-captureAZ**.
  Recorded because the taxonomy's literal shape test cannot tell the two
  apart and the next reader will hit the same ambiguity.
  **FINDING 2 — the short scrub tokens are reversible from public files.**
  The short token for **s-captureAX** resolves to its full canonical session
  UUID in historical blobs of `test/fixtures/harvested/LEDGER-Siren.json`,
  `docs/directives/robustness-threat-matrix.md` and `tools/replay.mjs`; the
  same holds for **s-captureAY** and **s-captureAZ**. Every containing commit
  is an ancestor of `origin/main`. Verified with a negative control:
  `git log --all -S` on a planted nonexistent UUID returns 0 commits.
  Current HEAD is clean — its 13 canonical UUIDs are placeholders plus three
  fixed test constants. (The three full ids are in the alias registry, which
  is machine-local by nature; they are not repeated here, for the reason this
  entry is about.)
  **What the scan did NOT find, each with the reason its zero is
  believable.** No other-session conversation text: 681 CHAT-PROSE hits, 78
  unique, every one our own provenance headers, our census verdict strings,
  harness text, or hand-written synthetic fixtures that declare themselves
  in-band (`insertion-1405.json`: "NOT real session content — built by
  hand"). No foreign-project paths: 295 hits, 27 unique, all this repo's own
  PR worktrees, `claude-worktime`, or `/home/test/...` placeholders — the
  allowlist was too narrow, an instrument-scope artifact rather than a leak.
  One THINKING-TEXT hit, synthetic and self-labelled.
  **The one residual that is the operator's own:** the flap and oscillation
  fixtures carry dotfiles corpus hook prose (`CLAUDE-maintenance.md` text)
  and a real agent id, committed RAW on purpose because the migration
  evidence needed raw bytes. All `in_head: false` after the 2026-07-31
  rebuild; history keeps them. Not another session's chat.
  **DECIDED 2026-08-10 — ACCEPT, no history rewrite** (operator, standing go
  on the recommendation). Recorded as a made decision rather than a live
  question so the next session does not re-open it: the basis is the
  measurement in this entry, and what would re-open it is NEW evidence — a
  further class found in history, or the image turning out to carry something
  its 951x55 strip does not suggest. Absent that, this is closed.
  The reasoning it rests on: A 951x55 image strip and a set of session identifiers do not
  justify rewriting a repo with three open upstream PRs, and the rewrite
  would not retract anything already cloned or cached. What the measurement
  changes is that the acceptance is made on evidence instead of on the
  absence of it — which was the whole reason to scan.
  **Not deferrable regardless of that decision:** the two predicates get
  their real known positives wired into `absence-scan` (entry above), so the
  next occurrence is stopped at the pre-push boundary rather than found by a
  scan a year later.
  **The guard proved itself while this entry was being written.** The first
  draft quoted the three full session UUIDs as evidence, and the fixture-leak
  hook refused the write — an entry ABOUT an id leak would have committed
  those ids into the current tree, where none of them are today. A guard that
  fires on its author writing about the very class it guards is the strongest
  evidence it is not decorative, and it is worth one line so the next session
  does not read the alias convention as bureaucracy.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "git history scanned: one published PNG, one reversible id mapping, no chat text" -->

- **PARKED 2026-08-05 — READINESS residue for this repo, awaiting the
  executor-skill + §6 reshape (dotfiles backlog e519b8c).** Under the
  reshaped design this repo keeps NO detailed certification ledger —
  certification is class-level and global; the per-repo file holds
  only exclusions and deviations. Pre-drafted for when it lands:
  exclusions — deploy/restart of the serving proxy (silent failure
  mode + production-facing; never delegable down, §6 exclusion
  class); anything touching state KEYS or freeze logic (threat
  matrix row 3 — session-boundary statement required, judgment
  stays top-tier). Convention already in force regardless of the
  park: the Opus dev session's FIRST run of each procedure class
  here (PR round, bust triage, gate-red triage) gets its output
  graded by a top-tier session — that grading doubles as the
  class-certification probe once §6 lands. Missing piece that
  unparks this: the executor skill shipped + §6 amended (named
  trigger). Consumer: the session instantiating READINESS.json
  here, and the grading session booking probe evidence.

- **PARKED 2026-08-15 — #276 is held on an unanswered sequencing question, and
  what each answer implies is written here because it existed only in a
  session's context.** The PR asked Chris (2026-08-14 comment) whether to land
  #306 first and rebase #276 on top, or rebase #276 now against `4ab9cf8` so its
  scope is visible while #306 is still in review. Held rather than rebased, and
  the reason is stronger than "avoid doing it twice": **the rescope's substance
  is dropping `absence-scan.mjs` from #276, which cannot happen until #306
  LANDS** — otherwise the scanner exists in no merged place at all.
  **Measured consequence, so the next session does not re-derive it:** #276's CI
  carries TWO failures and only one is explained by the rescope. `source: every
  UUID … is on the synthetic allowlist` leaves with the scanner. `fallback RED:
  mitigation-output-form.test.mjs skips …` does NOT — it survives any rebase,
  and it is booked separately (`## Record`, "harvest-pin fallback RED counts
  skips in another file"). So a rebase today lands a PR that is still red, still
  not rescoped, and still owes a second rebase when #306 lands.
  **Missing evidence that unparks this:** Chris's answer on the #276 thread. On
  "land #306 first" — wait, then rebase and drop the scanner in one pass. On
  "rebase now" — rebase onto current `upstream/main`, do NOT drop the scanner,
  and expect the UUID-allowlist failure to persist until #306 merges.
  Consumer: the session that reads a reply on the #276 thread.
  Loop stage: RETIRE (upstream-facing slice).
  Anchor: BACKLOG.md
  Write-set: BACKLOG.md
  Verifier: gh pr view 276 --repo cnighswonger/claude-code-cache-fix --json comments
  <!-- entry: "#276 held on the sequencing question, both answers pre-derived" -->






- **PARKED on operator GO 2026-08-16 — upstream's own copy of the prefix-diff
  security test carries the fixture defect we just fixed here, so their
  default-mode content-minimization bite covers less than it says.**
  `payloadWithSentinel()` in upstream's `test/proxy-prefix-diff-security.test.mjs`
  takes no parameter, and both arms call it with an overrides object
  (`payloadWithSentinel({ messages: [...] })`) intended to make the second
  request differ from the first. The object is ignored, so the two requests are
  byte-identical, `wroteDiff` is false, and no `-diff.json` or `-events.jsonl`
  is ever written — the sentinel-absence assertion only ever covers
  `-last.json`, while its own comment says it covers "the artifacts most likely
  to carry a leaked preview". Verified here by restoring the defect: both arms
  go red on the `wroteDiff` precondition.
  This matters to them more than to us: theirs is the DEFAULT configuration, so
  the bite is their only check that prompt text does not rest on disk.
  Named missing evidence: none — it is an operator GO on the exact text, per
  the Public Communication rule. The fix is two lines (accept an overrides
  argument, assert `wroteDiff`), and our commit `4e58269` is the reference.
  Recommendation: report it, with the fix, as a small upstream issue or PR.
  Consumer: the operator, then whoever opens the upstream issue.
  Loop stage: RETIRE (upstream carrying the fix is what lets ours stop being a
  divergence).
  Anchor: upstream test/proxy-prefix-diff-security.test.mjs, payloadWithSentinel
  Write-set: an upstream issue/PR — nothing in this repo
  Verifier: the upstream arms go red on the precondition before the fix
  <!-- entry: "upstream's prefix-diff security bite carries the same ignored-overrides fixture defect" -->

## Record — decision-complete memory, not scheduled

- **RECORD 2026-08-22 (midday, operator trigger: the desktop session died a
  second time while an upstream-cut worktree ran a single test file, and the
  operator's reading was that an earlier session had already closed this) —
  the suite's session-kill class was mitigated by RENAMING the pre-push
  symlink, which is a carrier nobody reads; SHIPPED this session as a
  quarantine inside the hook whose retirement condition is the fix's own
  presence in the pushed tree.** Basis: `.git/hooks/pre-push` had been renamed
  to `pre-push.DISABLED-2026-08-20-desktop-collapse` — a date in a filename,
  visible only to someone running `ls` on a hooks directory, with nothing
  scheduled to re-arm it. Measured today, `git grep -l killOurs <ref> -- test`:
  five files on `fix/test-suite-kills-session-manager`, **zero** on fork
  `main`, `origin/main`, `upstream/main` and the PR branch — the fix exists
  only on an unmerged branch. Measured in the same pass and NOT expected: the
  three killer files (`proxy-held-port`, `proxy-holder-handover`,
  `stdio-epipe-survival`) are **absent from fork-main** and present on
  `upstream/main` and every branch cut from it. So the danger is the
  upstream-cut trees, not this fork's own suite, and the 2026-08-20 disable
  was over-broad in the costly direction: it gated off the one tree that was
  never dangerous, leaving fork-main's red-tree protection off for two days
  while the branches that actually kill were untouched by it.
  **The correction to this repo's own record:** the class reads as closed
  because a branch fixing it exists and an upstream issue is open. Neither is
  a merge. A tree is safe iff it lacks the machinery or CARRIES the fix, and
  the refs above say our upstream-facing ones do neither.
  **What shipped:** `tools/git-hooks/pre-push` reads the pushed tree's
  `test/proc-helpers.mjs` — upstream's process-helper module, which is both
  where the fix's `killOurs()` choke point lands and a reliable sign that the
  tree carries the port-holder machinery at all. Three cases, only the middle
  one dangerous: **absent** (this fork's main, which carries none of the three
  killer files either — measured) → the suite RUNS; **present without the
  definition** (upstream/main and every branch cut from it) → SKIP, loudly,
  push allowed; **present with it** → runs. Unreadable tree counts as
  dangerous. Skip rather than refuse because refusing would make `--no-verify`
  routine on every upstream-facing branch, and a guard that fires on
  legitimate work trains the bypass reflex that kills it.
  **Two earlier predicates were wrong, one of them in production for the
  length of a push, and both are recorded because the shape recurs.** v1
  searched all of `test/` for the bare token — and the commit introducing it
  carried `test/pre-push-hook.test.mjs`, which names the token in its prose
  and writes it into its fixture. The tree matched ITSELF, the quarantine did
  not fire, and the full suite ran on a tree that has never carried the fix
  (observed live on the push of `889f678`; the session survived, which is luck
  and not evidence). That is the same self-match that made the earlier guard
  for this class green on the tree carrying the very defect it was written for
  (`f4c10a3`) — a guard naming its own subject is inside its own search space.
  v2 narrowed to the definition and over-fired the other way, quarantining
  fork-main, where the file is absent only because the danger is: that
  predicate would have silently restored the ungated state the block exists to
  end. Only running the thing against all three real trees separated them.
  **Retirement is automatic and needs no calendar entry:** the predicate is
  the fix's presence, so the day a pushed tree carries it — upstream merge or
  our own rebase — the quarantine stops being taken and the suite resumes on
  its own. Deleting the block is then cleanup, not a required act.
  **Named cost, so it is not discovered later:** the red-main protection this
  hook exists for (2026-08-02 incident) is NOT in force for a quarantined
  commit, and only the fix restores it. Every such push says so on stderr.
  Red-first, executed, three real arms and each earlier predicate red on
  exactly the arm it got wrong: v3 (shipped) 8 pass / 0 fail; v1 6 pass /
  2 fail (both the quarantine arm and the fork-main arm); v2 7 pass / 1 fail
  (the fork-main arm alone). The two must-RUN arms are controls — without
  them the quarantine arm proves only that something allowed a push.
  Post-incident (1) mechanized: yes, the check above. (2) truth level:
  project — the mechanism is this repo's hook and the marker is this repo's
  fix.
  Loop stage: MITIGATE.
  Anchor: `tools/git-hooks/pre-push`, the SESSION-KILL QUARANTINE block
  Write-set: `tools/git-hooks/pre-push`, `test/pre-push-hook.test.mjs` — both
  landed this session
  Verifier: `node --test test/pre-push-hook.test.mjs`, the two
  session-kill arms
  <!-- entry: "session-kill quarantine in the pre-push hook, retiring on the fix's presence" -->
- **RECORD 2026-08-19 (morning, bit during the row-32 walk; demoted from READY the same hour by the ten-cap guard, not by a re-ranking) — `alias-claim
  --show` answers `UNCLAIMED` for an alias that IS claimed, because the reverse
  direction is unsupported and the failure reuses the vocabulary word for
  genuine absence.** Measured within one minute of each other:
  `--show <capture-file>` returned `s-captureBW`, and `--show s-captureBW`
  returned `UNCLAIMED`. Both answers are the tool working as written — `--show`
  takes a capture or session id — but `UNCLAIMED` is the token that elsewhere
  means *this capture has no alias*, so the alias direction gets a confident
  wrong answer rather than a rejection. The runbook advertises `--show` as the
  thing that "answers UNCLAIMED rather than printing nothing", which is exactly
  the sentence that makes the wrong answer read as the right one.
  **Why it is worth its size:** aliases are what tracked prose cites, so the
  natural question a later reader asks is alias -> capture — the unsupported
  direction is the one the public-facing convention creates demand for. A
  reader who checks a cited alias and gets UNCLAIMED concludes the registry
  lost it.
  Design: accept an alias as input and resolve it, or — if the reverse map is
  deliberately not kept — REJECT an argument matching the alias shape
  (`s-capture[A-Z]+`) with a message naming the supported direction. Either is
  fine; answering UNCLAIMED is not. While here: `--help` currently throws an
  unhandled `Error: not a capture: --help` with a stack trace, which is the
  same class one door over.
  Red-first: `--show s-captureBW` must not return `UNCLAIMED` (resolve or
  reject), while `--show <a genuinely unclaimed capture>` must still return
  `UNCLAIMED` — without that second arm the fix is indistinguishable from
  deleting the token.
  Loop stage: SEE (the evidence-citation path).
  Anchor: `tools/alias-claim.mjs`
  Write-set: `tools/alias-claim.mjs`, `test/alias-claim.test.mjs`
  Verifier: both arms of the red-first pair above
  <!-- entry: "alias-claim --show answers UNCLAIMED for a claimed alias" -->
- **RECORD 2026-08-19 (morning; demoted from READY the same hour by the ten-cap guard, not by a re-ranking) — minting ONE legitimate matrix row goes red in
  FOUR places on hardcoded row-count literals, and the contiguity property they
  exist for is already derivable.** Measured this morning minting row 32: the
  suite failed at `test/matrix-status.test.mjs` (count literal, and a second
  `Array.from({length: 31})`), at its `readRecords` bite, and at
  `test/state-report.test.mjs` (`totalRows` and `openResidual.length`). Every
  one of them fired on a non-defect, and two carry comments that PREDICT this
  exact fire — `state-report`'s says "every legitimate new row moves them by
  construction", making this its third recorded firing.
  **What is NOT proposed: deleting them.** `state-report`'s comment states the
  real job — the counts must agree with an INDEPENDENT count from the two
  artifacts, so a parser that silently stopped reading rows fails even when the
  literals are stale. That cross-artifact agreement is the load-bearing half
  and it stays. What is ceremony is the ABSOLUTE literal repeated at four
  sites: contiguity (no gaps, no duplicates) is fully expressed as
  `numbers[i] === i + 1` over the parsed set, with no total in it, and the
  cross-check already compares prose-count against status-count.
  Design: keep exactly ONE hand-maintained total, in the place a human should
  be forced to notice a new row, and derive the other three from the artifacts.
  The dev-loop's own rule is the grounding: a blocking assert on a hardcoded
  count stopped validating anything the day the count legitimately grew, and
  each false red trains a reader to discount the next one.
  Red-first: a planted row with a GAP (rows 1..31 plus 33) must still fail
  contiguity under the derived form — the arm that proves the literal was not
  what caught gaps — and a planted legitimately-contiguous new row must go
  GREEN without any test edit.
  Loop stage: VERIFY.
  Anchor: `test/matrix-status.test.mjs`
  Write-set: `test/matrix-status.test.mjs`, `test/state-report.test.mjs`
  Verifier: both arms of the red-first pair above, plus a full suite green
  <!-- entry: "four hardcoded matrix row-count literals fire on every new row" -->

- **RECORD 2026-08-18 (decision-complete; promotion belongs to the next
  derivation or a dated operator OVERRIDE) — keep the ten-cap, demote the
  derivation from authority over READY membership to an occasional method, and
  make the dated operator-OVERRIDE block a first-class object
  `backlog-order --check` understands.** Provenance, stated because it is
  second-hand: the operator GO'd this at the DOTFILES desk (2026-08-18,
  5-point backlog-system round, item 2); this booking is a relay — the GO is
  real, its witness here is testimony, and if this repo's rules want it
  re-typed at this desk, surface that at next operator contact. The evidence
  is this repo's OWN report to that desk (f4 session, same evening): a
  derivation costs an hour and REPLACES its predecessor's reasoning; the
  cap's churn is a one-line edit; the evening's dated OVERRIDE block makes
  `backlog-order --check` report 9 bullets misplaced — an operator decision
  reading as drift to the machine, which a future derivation would "fix".
  Design: (a) the ten-cap stands (operator 2026-08-11); (b) dev-loop.md's
  "Build order is DERIVED at build time" is amended — the derivation becomes
  a method for when the order is genuinely unknown, not the standing
  authority, and "the derived order is re-derived, not edited" gains the
  override as its declared exception; (c) `tools/backlog-order.mjs` (and
  `tools/backlog-lint.mjs` where it reads order) parses a dated
  `OVERRIDE (operator, YYYY-MM-DD)` block as first-class: bullets ordered
  under it are not misplacements, and the check reports the override's date
  and scope instead of drift. Verifier: `backlog-order --check` green over
  the evening's REAL override with zero misplaced bullets, AND still red on
  a bullet misordered outside the override's scope — both arms shown, the
  pair must differ. Done: an operator ordering decision is expressible
  without running a derivation and without red checks. Write-set:
  `tools/backlog-order.mjs`, `tools/backlog-lint.mjs`, `docs/dev-loop.md`,
  this file's build-order section. RELATED CORPUS FACT, same GO (dotfiles
  `9b9c474`): the global accretion module now canonicalizes the slot token
  `Write-set:` (this repo's spelling won, 115 vs 32 measured) and closed
  per-carrier grade vocabulary with three-answer counters; this file's 32
  `Write boundary:` spellings are now the non-conforming form repo-wide —
  normalization is a small separate act, foldable into any carrier pass.

- **RECORD 2026-08-18 (found by the EIGHTH derivation's own promotion pass, and
  it is the reason that pass was slower than the ranking) — 106 of the 140
  `## Record` entries carry no `Loop stage:` line and 88 carry no `Anchor:`, so
  the two fields the composition rule and the staleness check are STATED IN
  cannot be read off most of the promotion population.** Measured by parsing the
  section rather than sampling it: 140 entries, 34 with a loop stage, 52 with an
  anchor, 67 with a verifier. The consequence is specific and it bit today: a
  derivation refilling the head has to open bodies by hand to find out which
  stage an entry advances, which is exactly the per-entry judgment pass the
  boundary and stage slots exist to replace — and the mitigation-led composition
  rule reads the stage, so an entry without one is invisible to the rule that is
  supposed to promote it.
  **Not a data-entry failure.** The fields postdate most of these bodies; the
  entries were correct when written. What is missing is a decision about which
  of three shapes the repo wants, and that decision is why this is booked rather
  than built:
  (1) backfill all 106 by hand — expensive, and a stage assigned by a reader who
  did not write the entry is a label over someone else's body, the exact drift
  class this file collects;
  (2) require the fields only for entries booked or re-graded after a stated
  date, and have `backlog-lint` say `STAGE-UNSTATED` for the older ones — three
  answers, so an unreadable entry never reads as a passing one;
  (3) derive nothing and accept that promotion from `## Record` is a body-read
  pass, stated as such in `docs/dev-loop.md` so no future derivation budgets for
  a mechanical join it will not get.
  Recommendation if this is picked up: (2). It is the only one that makes the
  gap VISIBLE per entry at the moment a derivation reads it, and it costs one
  lint lane rather than 106 judgments.
  NAMED MISSING ELEMENT: the choice between those three, which is a desk or
  operator call, not a lane's to invent.
  Consumer: the ninth derivation's promotion pass, and whoever next extends
  `tools/backlog-lint.mjs`.
  Loop stage: VERIFY (the promotion path's own readability).
  Anchor: `tools/backlog-lint.mjs`
  Write-set: `tools/backlog-lint.mjs`, `test/backlog-lint.test.mjs`, `docs/dev-loop.md`
  Verifier: the lane reports STAGE-UNSTATED for a Record entry with no `Loop stage:` line and nothing for one that has it
  <!-- entry: "most Record entries carry no loop stage or anchor" -->

- **RECORD 2026-08-18 (small; closes a dangling pointer created the same day) —
  ship-runbook step 6b names a GRADUATE target that has no entry.** Step 6b
  (re-run `serving-gate-lint` AFTER the restart when a ship adds a gate) was
  added today after a pre-restart run certified nothing about the gate the
  ship existed to add. Its `[GRADUATE -> ...]` marker points at the backlog and
  nothing was booked, which is the marker convention failing in the one
  direction nobody checks — a hand-run step that believes it is already
  scheduled.
  The graduation: the lint runs from the GATE UNIT, so the daily sweep re-asks
  it against whatever is serving that morning, instead of only when a human
  remembers at ship time. That also fixes the ordering hazard structurally
  rather than by discipline — a sweep cannot run before its own restart.
  Named missing evidence: none.
  Done-criterion: `cache-fix-gate` runs `serving-gate-lint` and its result
  reaches `gate-status.json` as a three-answer field (pass / findings /
  COULD-NOT-VERIFY when `/health` is unreachable, never a clean zero); the
  runbook's step 6b is then reduced to reading that field, and its GRADUATE
  marker is removed in the same change.
  Consumer: the daily sweep, and the next session shipping a gate.
  Loop stage: VERIFY.
  Anchor: `docs/runbooks/ship-proxy-change.md` step 6b; `tools/gate-live.mjs`
  Write-set: `tools/gate-live.mjs`, `tools/serving-gate-lint.mjs` (exit
  contract only if needed), `docs/runbooks/ship-proxy-change.md`
  Verifier: a gate run writes the lint field; unplugging `/health` yields
  COULD-NOT-VERIFY rather than a pass
  <!-- entry: "step 6b's GRADUATE target unbooked; lint should ride the gate unit" -->

- **RECORD 2026-08-18 (review lens + audit; instruments) — FIVE instruments in
  this repo failed one class on one day, and the class has a MECHANICAL test.**
  The test, and it is the point of this entry: **where does the checker's
  CHECK SET come from, and can the defect it hunts shrink that set?** That is
  answerable by looking at a guard's wiring, without judging its prose — which
  is what makes it a lens rather than a mood. The looser parent form ("the
  output reads wider than its predicate establishes") is a per-case judgment
  call and does not schedule any work.
  **The five, each with its disposition:**
  1. `deferred-tool-rewrite`'s reset reason `tool-schema-changed`, emitted on a
     branch where the schema scan has ALREADY returned — no schema had moved.
     FIXED 2026-08-18 (`cdc2b9a`); the surviving branch says
     `description-delta-with-removal`.
  2. `bust-triage` printing `ATTRIBUTION: CC's` from the basis "no stability
     violation for this pair". Stability EXEMPTIONS are excluded from
     violations by construction, so an exempted pair satisfies it — and the
     capture's only exemption WAS the busting pair. BOOKED (own entry above).
  3. `serving-gate-lint`: its verdict holds only for the serving set at the
     moment it ran, so a run taken before a gate flip says nothing about the
     gate that flip adds — and both runs print green. FIXED as ship-runbook
     step 6b. **Strongest exhibit of the class in this repo** (peer's
     assessment, and it is right: nothing distinguishes the two greens).
  4. The machine doctor's `replay-bench` FAIL detail, which took the bench's
     LAST stdout line — "false fires: 0 (fired where the corpus expects
     silence)" — so every failure rendered inside a success sentence. FIXED in
     the dotfiles repo.
  5. `forwardedStable`, a whole-array claim standing where the guarantee covers
     only the shared-name subset. Previously retired by adding `heldStable`;
     listed because it is the same shape and shows the class predates today.
  **THE REPAIR PATTERN, contributed by a peer session on this machine and
  worth more than the diagnosis:** derive the expectation set from a SECOND,
  INDEPENDENTLY MAINTAINED source, so the defect cannot drag the check set
  along with it. Their case: a check that picks its subject from the newest
  record silently drops any abandoned record the moment a newer one appears —
  exactly the state it exists to find.
  **Cross-repo note, stated so nobody re-derives it:** the peer booked the
  mechanical form on their side; their instances are theirs and are NOT
  duplicated here, and these five are ours and were not sent there.
  **SIXTH INSTANCE, and it widens the test rather than adding a sibling
  entry — 2026-08-18, measured while closing the `verdict-ab` item.** The test
  above asks whether the defect can shrink the checker's CHECK SET. The same
  false green arrives one axis over, from a narrow SUBJECT with a perfectly
  healthy check set: `verdict-ab` compared 3,223 verdict lines across 19
  corpora — an ample set by any reading — and could not have seen the change,
  because it loads ONE hardcoded module path and one exported function, and
  the change was in a different extension. Set size is not reach. So the test
  now has two halves, asked together: can the quarry shrink the check SET, and
  can it fall outside the SUBJECT the checker loads at all? The second half is
  the quieter one precisely because a large N reads as thorough — the number
  is what stops anyone asking what the number is OVER.
  Named missing evidence: none — the test is stated and the five are
  dispositioned. What is unbuilt is the SWEEP.
  Done-criterion: every `tools/` checker that derives a check set at run time
  has been walked against the test above, each one either shown immune (its
  set cannot be shrunk by its own quarry) or repaired by the second-source
  pattern; the walk's result recorded per instrument.
  **Explicitly NOT to be mechanized as a guard** — "does this verdict overstate
  its predicate" is judgment-shaped, would over- and under-fire, and would
  train the override reflex that kills a guard. This is a review lens applied
  by a human or a dispatched reviewer, not a hook.
  Consumer: the next session auditing instruments, or writing a new checker
  that derives its own check set.
  Loop stage: VERIFY.
  Anchor: this entry; ship runbook step 6b; the `bust-triage` attribution entry
  Write-set: `tools/*.mjs` (per-instrument, only where the walk finds a defect)
  Verifier: the walk's per-instrument record, with at least one instrument
  shown red-then-green under the second-source pattern
  <!-- entry: "check-set-derived-at-runtime: five instruments, one mechanical test" -->

- **RECORD 2026-08-18 (small) — ledger and transcript disagree on the bust
  CAUSE, and the lane says a tool disagreement is itself the finding.** For
  2026-08-18T11:22:51Z the ledger recorded `no-prefix` while the CC transcript
  recorded `tools_changed / 342781`; `bust-triage` surfaces this correctly as
  `WARN reconcile`, so the disagreement is detected but nothing decides it.
  The walk established the transcript was right — the pair's raw arrays differ
  by exactly two added tools — so on this instance the LEDGER's cause label is
  the wrong one, and the statusline the operator reads shows the ledger's.
  Not merely cosmetic: `no-prefix` and `tools_changed` route to different
  matrix rows, so the label decides which row a reporter and a triage start
  from.
  Named missing evidence: whether the ledger's `no-prefix` is a distinct
  measurable condition that CO-OCCURS with `tools_changed`, or a
  misclassification — one more instance with both labels would separate them,
  and 2026-08-17T17:10:47Z (315k, `no-prefix`, statiker) is a candidate
  already in the ledger.
  Done-criterion: the two causes reconciled on both instances, and either the
  ledger's classifier corrected or the co-occurrence documented as expected.
  Consumer: the next session entering the bust lane on a `no-prefix` report.
  Loop stage: SEE.
  Anchor: `bust-triage` reconcile step; ledger cause field
  Write-set: whichever writer sets the ledger cause
  Verifier: both instances triage without a `WARN reconcile`
  <!-- entry: "ledger no-prefix vs transcript tools_changed disagree" -->

- **RECORD 2026-08-16 — FOUR lane branches from 2026-08-10 still carry work
  that is not in `main`, and `git status`, `git log origin/main..main` and
  every handoff since have all read clean.** This is the exact class dev-loop
  records ("thirty commits sat in five registered worktrees, never merged"),
  found again by counting rather than by any check firing — and found while
  doing something else, which is how the first instance was found too.
  Counted by PATCH-ID (`git cherry main <branch>`, `+` only), never by
  revision, because cherry-picking changes every hash it touches and a rev
  count called eleven branches unintegrated where six had landed:
  `worktree-agent-a162bc7ead18882ad` 3 · `worktree-agent-a82eb314485126126` 7 ·
  `worktree-agent-a93d5b5926262ab7c` 1 · `worktree-agent-ac73dca7ecf344d05` 2.
  Thirteen commits over 26 registered worktrees; the other 22 branches report
  zero, so the finding is four lanes and not a general failure.
  The subject matter is real work, not scratch — `findBornLargeStarts` as a
  census class, absorption-miss rows printed in the plain text report, the
  backlog-lint READY-outside-Open and closure-mints-a-second-bullet lanes,
  `backlog-index.mjs`, the row-30 mint, and `capturePairResult`'s lineage
  fallback for a rotated `messages[0]`. At least two of those look like they
  were later RE-IMPLEMENTED on main (the absorption text print and the row-24
  cause map are both recorded as landing separately), which is the measured
  cost of the class: work rebuilt because nobody could see it.
  NOT resolved here, and the reason is a boundary rather than effort:
  integrating another session's lane needs that lane's closing report and its
  verification, which this session does not hold. Cherry-picking thirteen
  unread commits into the deployment state is the opposite of what the
  integration rule asks for.
  Named missing evidence: each lane's closing report, or a per-branch read of
  what the commits do and whether main has since re-implemented it.
  Done-criterion: every registered worktree's branch reports zero `+` under
  `git cherry main <branch>`, or each remainder is named with a disposition
  (integrated / superseded by a named commit on main / dropped with a reason).
  Consumer: whoever runs the next session-close lane; `tools/prune-lane-branches.mjs`
  is the mechanism that exists for it.
  Loop stage: VERIFY (it decides whether shipped work is actually shipped).
  Anchor: `git worktree list`, the four branches above
  Write-set: the branches and the worktree registrations — no source file
  Verifier: `git cherry main <branch>` per registered worktree, zero `+`
  <!-- entry: "four 2026-08-10 lane branches carry 13 unmerged commits, invisible to every clean reading" -->

- **RECORD 2026-08-16 (small; decision-complete, NOT scheduled — the READY head
  is capped at ten and its membership is derived, not edited) — the sweep's
  per-streak evidence document is keyed by DATE, so only the FIRST run of any
  day retains row-level evidence.**
  Measured today: `gate-status.json` reports
  `censusRowsWrite: {written:false, unchanged:false, conflict:true, file:"census-rows-2026-08-16.json"}`
  for the 10:41 sweep, because the 06:48 run had already written that filename
  with different content. The conflict is deliberate (never overwrite), and its
  consequence is not: the 10:41 run's duplicate and mismatch rows went nowhere,
  and the file on disk answers about 06:48 while the status file answers about
  11:09. A reader joining the two gets a silent cross-run mismatch — the rows
  and the rollup are from different sweeps and nothing in either says so.
  This bit immediately: the row-31 effect measurement had to join 06:48 rows to
  a 11:09 rollup, and the only reason it did not mislead is that the tool
  prints the document's own `producedAt`.
  Named missing evidence: none. The design decision is the filename, and it is
  a small one — a per-run suffix (`census-rows-<date>T<hhmm>.json`), or a merge
  into the existing document, or an explicit "second run of the day appends".
  Whoever owns the document's consumers picks; the entry is dispatchable once
  that one choice is made, which is why this is READY rather than parked.
  Done-criterion: two sweeps on one day both retain their rows, and a reader
  can tell which run any row came from.
  Consumer: the next session reading `census-rows-*.json` for row-level
  evidence; `tools/row31-effect.mjs` is the first.
  Loop stage: SEE.
  Anchor: tools/gate-live.mjs, writeCensusRowsDocument / the conflict branch
  Write-set: tools/gate-live.mjs, test/gate-live.test.mjs
  Verifier: a bite that runs two sweeps in one day against a temp dir and
  asserts both documents exist and are distinguishable — red-first against
  today's code, where the second write is a no-op
  <!-- entry: "census-rows document is date-keyed, second run of the day retains nothing" -->

- **RECORD 2026-08-16 — row 6 step (b): the tool-addition population is
  MEASURED, and the headline is that a session-start preload cannot reach most
  of it.** Dispatched discovery over the whole live corpus (36 captures, ~11.5
  GiB, 36/36 censused with zero could-not-verify, 17,006 requests) via
  `replay.mjs --gates-from-capture --census --json`.
  **How often:** 128 tools deltas, of which 126 are pure additions and 2 mixed
  (one description byte-edit, one removal). 25 of 36 captures had at least one
  addition; 11 had none, 4 of those being one-request placeholder sessions.
  The lane checked rather than assumed that `kind:"membership+"` means a pure
  addition — it is a NET-direction label — and verified
  `(count_now - count_prev) === newNames.length` on 126/126 rows.
  **Which tools:** `SendMessage` dominates — 103 of 126 addition events, in 24
  of the 25 captures that have any. Everything else is a one-off MCP server
  connecting mid-session (qgis, claude-in-chrome, playwright, thunderbird),
  clustering by SERVER rather than by tool: 37 of 39 distinct names appear in
  exactly ONE capture.
  **Where — the finding that bounds the lever:** additions do NOT cluster at
  session start. Median first addition sits ~12% into a session; only 3% of all
  events and 4 of 25 first-additions land in the opening 5%, while 56% fall in
  the 25-75% band. A preload is a session-START mechanism by construction, so
  most measured additions are events it cannot anticipate.
  **Coverage arithmetic, as a measurement and not a proposal** (an event counts
  as covered only if EVERY name it adds is in the set; the denominator for
  captures is the 25 with additions, never all 36):
  k=1 {SendMessage} 101/126 events (80.2%), 12/25 captures fully covered;
  k=3 84.1% / 60.0%; k=5 86.5% / 68.0%; k=10 88.9% / 76.0%. The residue at
  k=10 is 11.1% of events and 24% of captures, all one-off MCP servers whose
  membership a session-start list cannot know without over-fitting to this
  snapshot.
  **No list is proposed here, deliberately** — the round's instruction, and the
  right one: the design question the numbers now let someone answer is whether
  an 80%-of-events lever whose ceiling is ~89% is worth a session-start
  mechanism at all, against the alternative of doing nothing for the
  mid-session bursts. That is the desk's and the operator's call, and it is
  informed rather than guessed for the first time.
  Named missing evidence for a DESIGN: none about the population; what is
  missing is the cost side — what a preloaded-but-unused tool costs in prefix
  bytes, which nothing here measured.
  **INSTANCE 2026-08-17: 686k re-written, 21:11:40Z, `s-captureBS`** (pair
  n=733->734, five `mcp__claude-in-chrome__*` names, `new-namespace`,
  attribution CC's, `heldStable` true). It lands squarely in this record's
  hard residue: a one-off MCP-server namespace appearing ~46% into a
  6h51m session, i.e. exactly the mid-session burst the k=10 arithmetic
  above leaves uncovered. The measured ceiling did not move; this is the
  second `mcp__claude-in-chrome` first-appearance on record (2026-08-10,
  263k) and the first with a machine-readable addition shape.
  Consumer: whoever designs row 6 step (b).
  Loop stage: MITIGATE (the design this would inform).
  Anchor: threat matrix row 6, ladder step (b)
  <!-- entry: "row 6 step (b) population measured: SendMessage 103/126, additions spread mid-session" -->


- **RECORD 2026-08-16 (small; DOTFILES-SIDE residue of today's merge, not ours
  to edit) — `CACHE_FIX_PIN` still reads 4.3.0 while the restarted proxy serves
  4.4.0-beta.0, so the doctor FAILs.** Found by running the doctor after the
  restart to positive-control an unrelated guard — not by any step of the ship
  lane, which is the finding.
  **Observed, both sides of the boundary:** before the restart `/health`
  reported `"version":"4.3.0"` and the check passed; the upstream merge moved
  `package.json` to 4.4.0-beta.0; after the restart `/health` reports
  4.4.0-beta.0 and `bootstrap/doctor.py:1042` fails
  (`cache-fix-proxy: health/version abweichend`), because `:1038` compares
  `h["version"] == CACHE_FIX_PIN` and `manifest.py:221` still says "4.3.0".
  Causal chain by observation, not inference.
  **Why nothing caught it: there are TWO pins and the lane tracked one.**
  `CACHE_FIX_PROXY_TREE_PIN` (tree) is ship-runbook step 4 and was correct
  throughout at 2bf03b8; `CACHE_FIX_PIN` (the /health version string) is named
  by no step. Both live in one dotfiles file, which is what makes the omission
  invisible — the step that edits that file reads as covering it.
  FIXED ON OUR SIDE the same day: step 4 now names both pins and carries the
  package.json/`/health` filter that decides whether the second is owed. The
  dotfiles edit itself is NOT ours — `dotfiles-5b` holds that copy; sent to the
  desk to route.
  Named missing evidence: none. The value is known (4.4.0-beta.0) and the site
  is known (manifest.py:221); only the write boundary is elsewhere.
  Done-criterion: `CACHE_FIX_PIN` = the string `/health` actually reports, and
  the doctor's cache-fix-proxy check green.
  Consumer: whoever ships the dotfiles half (desk routes it).
  Loop stage: VERIFY (restores a health check that is currently red).
  Anchor: dotfiles bootstrap/manifest.py:221; bootstrap/doctor.py:1038-1042
  Write-set: dotfiles only (NOT this repo)
  Verifier: bootstrap/doctor.py — the cache-fix-proxy health line goes OK
  <!-- entry: "CACHE_FIX_PIN 4.3.0 vs serving 4.4.0-beta.0, doctor FAIL, dotfiles-side" -->

- **RECORD 2026-08-16 (small) — the snapshot key cap now counts only
  prefix-diff's own keys, and 200 may be the wrong number for that.** Before the
  scope anchor landed today the key cap was being spent on keys that were never
  prefix-diff's: `s-<key>` and `s-<key>-insertion` grouped as two DIFFERENT keys,
  so co-tenant families inflated the count that then evicted everyone, and
  `keysRemaining` sat at the 200 cap for that reason rather than on prefix-diff's
  own volume. Post-fix measurement over the live directory
  (`node tools/snapshot-sweep-projection.mjs`): 28,511 files, 266 would be
  deleted, all 266 prefix-diff's own, `keysRemaining` still 200 — i.e. the cap is
  genuinely binding on ~302 of its own session keys and evicting ~102 of them.
  **The open question is whether 200 is right now that it means what it says.**
  It was inherited from upstream, whose deployment does not front every session
  on the machine. This is not a defect and nothing is being destroyed that the
  14-day age pass would not also take eventually; it is a number nobody has
  chosen against this fork's own traffic.
  Done-criterion: the cap is either re-derived from observed live-session counts
  with the derivation written at the constant, or explicitly affirmed at 200 with
  its reason.
  Consumer: the session that next works snapshot retention (joins the entry
  below — same file, same design conversation).
  Loop stage: VERIFY (bounds the store attribution reads from).
  Anchor: proxy/extensions/prefix-diff.mjs `SNAPSHOT_MAX_KEYS`
  Write-set: proxy/extensions/prefix-diff.mjs, test/
  Verifier: node tools/snapshot-sweep-projection.mjs — own-key eviction count
  <!-- entry: "snapshot key cap 200 inherited from upstream, never chosen for this fork" -->

- **RECORD 2026-08-16 (relayed from the desk session; not independently
  re-measured here) — 24 registered agent worktrees, 2.3 GB, and up to 14
  orphaned commits.** `git worktree list` shows 24 live registrations under
  `.claude/worktrees/agent-*`, oldest content 2026-08-08, none prunable because
  the directories still exist; 46 `worktree-agent-*` branches carry commits not
  reachable from main. The desk discriminated the raw count rather than reporting
  it: **71 of 85 landed by the normal cherry-pick route** (matched by patch-id,
  which a cherry-pick rewrites) and **14 are genuinely orphaned across 5
  branches** — itself an upper bound, since a commit picked AND modified reads as
  orphaned to `git cherry`. Two spot-checks split: the backlog-lint lanes are all
  on main and NOT lost; `224a23b` ("matrix: mint row 30, APPEND-ONLY CACHE
  COLLAPSE") never landed and its row number was reused for different content.
  The other 12 are unchecked, and the booking is the enumeration, not the samples.
  **Class:** the carrier-registration failure from dev-loop question 4, recurring
  — a worktree registration lives in `.git/worktrees/` and a branch in the ref
  namespace, and no reading any session takes touches either. Same shape as the
  33 commits that sat in lane branches while `git status`, `git log
  origin/main..main` and a handoff all read clean.
  **Do NOT bulk-delete.** The 2.3 GB is the least interesting fact; the 14 need
  resolving first and removal is terminal.
  Done-criterion: all 14 classified as landed-elsewhere / re-derived / genuinely
  lost, AND a collector for the worktree+branch carrier class in `state-report`,
  so the next occurrence is a reading rather than an archaeology.
  Consumer: the session that next runs a session-close or lane-integration pass.
  Loop stage: VERIFY (registers a carrier nothing currently reads).
  Anchor: `.git/worktrees/`, `git branch --list 'worktree-agent-*'`
  Write-set: tools/state-report (the collector), plus whatever resolves the 14
  Verifier: git cherry main <branch> reports zero '+' for each, or each named
  <!-- entry: "24 registered agent worktrees and up to 14 orphaned commits, no collector" -->

- **RECORD 2026-08-16 (relayed from the desk session; small) — one of our own
  state files sits in the config directory, cause UNKNOWN.** The dotfiles doctor
  reports `FAIL ~/.claude/ holds non-config entry: cache-fix-state`. Confirmed by
  the desk: `~/.claude/cache-fix-state/cache-control-sticky-<key>.json`, 37
  bytes, `{"version":1,"positions":[]}`, dated 2026-08-15.
  **The code default is CORRECT** — `preload.mjs:799`,
  `CACHE_CONTROL_STICKY_DIR = process.env.CACHE_FIX_STATE_DIR || join(xdgState(), "state")`
  — so something ran with `CACHE_FIX_STATE_DIR` pointed at that path. No setter
  with that value was found anywhere in the fork or in dotfiles.
  **Booked as unknown rather than guessed:** a wrong cause here is worse than an
  open question, and the file itself is empty and carries nothing sensitive.
  **Why it is not cosmetic:** per the environment binding, `~/.claude/` is
  protected by path SHAPE, so tool data there costs a permission dialog on every
  read and write for the operator and every dispatched agent — and one such
  prompt was denied mid-task once and lost the work in flight.
  Named missing evidence: which process set `CACHE_FIX_STATE_DIR` to that value.
  Cheapest next probe: the file's mtime against the session/test-run logs for
  2026-08-15 12:24, since the writer is more likely a test or tool invocation
  than the serving unit (whose Environment= does not set it).
  Done-criterion: the writer identified, the stray directory removed, and doctor
  green — removal alone re-opens it the next time the writer runs.
  Consumer: the session that next works XDG placement or reads a doctor FAIL.
  Loop stage: VERIFY.
  Anchor: preload.mjs:799; ~/.claude/cache-fix-state/
  Write-set: whichever caller sets CACHE_FIX_STATE_DIR; possibly test/ only
  Verifier: dotfiles doctor `claude_dir_entries_verdict` green
  <!-- entry: "cache-fix-state in ~/.claude, writer unknown, doctor FAIL" -->

- **RECORD 2026-08-16 (MITIGATE stage; small) — the fork's own snapshot artifacts
  have NO retention at all, and the upstream sweep merged today deliberately
  cannot reach them.** The 2026-08-16 merge ported upstream's prefix-diff
  cross-key sweep (14d age, 200-key cap).
  **NUMBERS AND SCOPE CLAIM CORRECTED 2026-08-16, same day — the original body
  classified the directory BY FILE SUFFIX and was wrong twice over.** It read
  "prefix-diff owns 14,469 ... 13,857 are OURS", which counted every
  `-events.jsonl` as prefix-diff's; three co-tenant extensions end their own
  per-session event logs the same way. Re-measured with the family names derived
  from each writer's source rather than from the suffix: **28,475 files, of which
  the scope regex reached 14,545 — only 846 prefix-diff's own, and 13,699
  belonging to insertion-normalization (11,437), deferred-tool-rewrite (2,255)
  and the ladder (7)**. The remaining 13,930 are `-canon.json`
  (insertion-normalization), `-relocated.json` (fresh-session-sort) and
  `-rungs.json` (deferred-tool-rewrite).
  It also asserted the scope regex "covers only prefix-diff's own three artifact
  names, correctly" — false when written, and that sentence is precisely what
  stopped anyone looking. FIXED the same day (`## Done`, the key anchor).
  Those fork files are LIVE STATE, and deleting a canonical rotates
  the key its owner reads and busts the prefix the extension exists to hold.
  So the sweep bounds part of the directory and the rest still grows forever.
  **The design is NOT "widen the regex"** — that is the one thing the merge
  commented against at the site. It needs a liveness predicate: a canonical is
  evictable only once no live session can address it, which is a different
  question from age. Nearest cheap approximation to evaluate first: evict on
  `mtime` older than the capture-retention window AND no matching live session
  in `restart-exposure`'s own listing.
  Done-criterion: fork-owned snapshot artifacts are bounded by a stated rule,
  with a bite that goes red when a LIVE canonical would be evicted.
  Consumer: the session that next works snapshot retention.
  Loop stage: MITIGATE (bounds a store the mitigations themselves depend on).
  Anchor: proxy/extensions/prefix-diff.mjs (the sweep + its scope comment)
  Write-set: proxy/extensions/*.mjs (whichever owns the eviction), test/
  Verifier: node -e over the real snapshots dir — fork-owned file count bounded
  <!-- entry: "fork-owned snapshot artifacts unbounded; upstream sweep cannot reach them" -->

- **RECORD 2026-08-16 (small) — upstream's new `tools/tier-advisor.mjs` resolves
  all four of its paths under `~/.claude`, which is not where this fork keeps
  any of them.** Arrived with the merge. `:405-411` default `account.json`,
  `usage.jsonl`, `tier-advisor-state.json` and `overage-warnings.jsonl` to
  `join(homedir(), ".claude", …)`; on this fork all four live under the XDG
  roots. Its 47 tests pass because they drive the `CACHE_FIX_ADVISOR_*`
  overrides, so the defaults are exercised by nothing — the tool is silently
  wrong here rather than loudly broken, which is the shape that survives.
  Second, smaller half found the same day: `tools/quota-statusline.sh` reads
  `account.json` from the XDG root (`:29`, `:48`) and `tier-advisor-state.json`
  from `$HOME/.claude` (`:245`) — one script, two conventions. Writer and reader
  currently agree, so the feature works; the inconsistency is what will rot.
  Fix: resolve all four through the fork's own `proxy/xdg-dirs.mjs`, the single
  resolver whose absence this repo has already paid for once (FORK-NOTES records
  five proxy-wrapper tests failing when a second hand-rolled resolution went
  stale).
  Done-criterion: `tier-advisor` run with no `CACHE_FIX_ADVISOR_*` set finds the
  fork's real account.json, and the statusline reads its state from one root.
  Consumer: the session that next touches tier-advisor or the statusline.
  Loop stage: SEE (a reporting surface that currently reports nothing here).
  Anchor: tools/tier-advisor.mjs
  Write-set: tools/tier-advisor.mjs, tools/quota-statusline.sh, test/tier-advisor.test.mjs
  Verifier: node tools/tier-advisor.mjs --json  (with no ADVISOR env set)
  <!-- entry: "tier-advisor and statusline resolve tier state under ~/.claude, not XDG" -->

- **RECORD 2026-08-16 (small; the manual pass is already done, this is the
  mechanism) — an upstream-merge triage tool, because the add/add
  self-origin class recurs at EVERY catch-up merge.** The 2026-08-16 merge spent
  its first hour hand-deriving one fact: 22 of 28 conflicts existed only because
  our own merged PRs re-import our own work as an independent add (no
  merge-base copy → add/add), and the remaining 6 were the only genuinely
  foreign work. That derivation is mechanical and it will be needed again the
  next time this fork falls behind — every PR we land upstream mints another
  member of the class.
  The tool takes `<base> <ours> <theirs>` and per conflicting file reports:
  origin (self-authored upstream commit vs foreign), the upstream-only
  declaration/test-name set, and whether the file exists at the merge base. Two
  reach limits the manual pass hit and the tool must carry, or it will report
  the same false clean: `git log -- <path>` PRUNES under history simplification
  (use `--full-history`), and a test-NAME set comparison misses a renamed test
  and a same-named test whose body changed — so it reports names as a
  candidate list, never as a completeness claim.
  Red-first arrangement, immutable and re-runnable: `76d586d` (base), `36559f6`
  (pre-merge main), `8ddd4f0` (upstream) — the tool must classify
  `proxy/extensions/message-hash.mjs` as self-origin with zero upstream-only
  declarations, and `test/proxy-forward-ca.test.mjs` as foreign.
  Done-criterion: the classification above reproduces from those three refs.
  Consumer: the session that takes the NEXT upstream merge.
  Loop stage: RETIRE (upstream catch-up is the retirement lane).
  Anchor: tools/ (new file — no existing tool is in this domain)
  Write-set: tools/upstream-merge-triage.mjs, test/
  Verifier: node tools/upstream-merge-triage.mjs 76d586d 36559f6 8ddd4f0
  <!-- entry: "upstream-merge triage tool: the add/add self-origin class recurs every merge" -->

- **RECORD 2026-08-16 — two traps the NEXT upstream merge will hit, written
  down because both were found by accident and neither is discoverable from the
  diff.** (1) `proxy/extensions.json` reads as a huge conflict and is purely a
  formatting difference — parse both sides and compare KEY SETS, never the text.
  The only real delta is that upstream still rosters
  `messages-cache-breakpoint`, which exists at the merge base and which this
  fork deleted, entry AND extension file; taking upstream's roster points the
  running pipeline at a file we removed. (2) Upstream ships per-file
  raw-`mkdtemp` guards inside `test/proxy-wrapper.test.mjs` and
  `test/proxy-forward-ca.test.mjs` that name `mkdtempSync` inside their own
  pattern strings. This fork's `test/no-raw-mkdtemp.test.mjs` is tree-wide and
  matches the NAME rather than the call shape — deliberately closed to
  exemptions, because the alias route (`import { mkdtemp as mkd }`) is what a
  call-shape scan cannot see. The 2026-08-16 merge REMOVED upstream's two local
  guards rather than opening the strong one; if they come back, remove them
  again rather than adding exemptions.
  Consumer: the session that takes the next upstream merge.
  Loop stage: RETIRE.
  Anchor: BACKLOG.md
  Write-set: n/a — memory
  Verifier: n/a
  <!-- entry: "next-merge traps: extensions.json key sets, upstream's local mkdtemp guards" -->

- **RECORD 2026-08-16 (split out of the resume-key entry on operator GO,
  resolving review finding F4) — `deferred-tool-rewrite` needs its OWN
  resume-tolerant read, and it is where the measured 38.9 kB actually lives.**
  The resume-key entry's done-criterion used to demand this and could not
  reach it: `deferred-tool-rewrite` keeps a SEPARATE state file
  (`deferred-tool-rewrite.mjs:205`, `<key>-deferred-tool-canon.json`) and its
  own two-key read (`:698-726`), both keyed on `conversationSubKey` exactly as
  insertion-normalization is, and both rotate at the same resume boundary. It
  has no third read, so it logs `no-baseline` and forwards CC's raw `tools[]`
  at precisely the request its canonical would have absorbed.
  **Why this is the entry that carries the payoff.** Measured on s-captureBR by
  `tools/boundary-layers.mjs`: the first cache segment ends at `system[1]`,
  spans 38.9 kB, and its ONLY broken layer is `tools` — so the smallest useful
  fix on that event is the tools pin alone, and it is worth a readable 38.9 kB
  span. The insertion-normalization work buys a readable canonical; THIS buys
  the bytes.
  **Named missing evidence, and it is a hard ORDERING constraint rather than a
  preference:** this is not dispatchable until (a) the harness lint above
  exists, so any bite here is exercised under the serving gate set — this
  extension is gated by `CACHE_FIX_TOOL_REWRITE=1`, so it has exactly the F1
  exposure that made the sibling lane's green worthless; and (b) the sibling
  entry's re-derived design settles, because if both extensions end up needing
  the same lineage-recovery primitive it is written ONCE, in
  `proxy/extensions/message-hash.mjs`, not twice.
  **Do NOT copy the sibling's mechanism forward uncritically.** Review finding
  F6 measured that design at 150 ms per miss on 649 candidates; whatever this
  entry adopts must not repeat a per-request parse of every candidate file.
  Loop stage: MITIGATE
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: proxy/extensions/deferred-tool-rewrite.mjs, test/deferred-tool-resume-recovery.test.mjs (new)
  Verifier: a replay of s-captureBR under the SERVING gate set where deferred-tool-rewrite reports description-absorbed/rewrite instead of no-baseline, plus the boundary-layers segment line showing the first span readable
  <!-- entry: "deferred-tool-rewrite needs its own resume-tolerant read, where the 38.9 kB lives" -->

- **RECORD 2026-08-16 — a `tools/` module that calls `main()` unconditionally at
  module scope cannot be IMPORTED, so its internals can only ever be tested
  through the CLI — and nothing checks that.** Surfaced by the boundary-layers
  lane as a deviation it had to make before it could write a unit bite at all:
  a namespace import of `tools/boundary-layers.mjs` triggered a full CLI run
  against the test runner's own argv and `process.exit(2)`, killing the test
  process before any test ran. It added the guard
  `if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])`,
  which is the repo's existing idiom — desk-verified byte-identical at
  `tools/gate-live.mjs:2419` (the lane's report cited `:2458`, a pointer slip;
  the idiom claim itself is true).
  **Why this is a class and not one file's slip:** the guard's absence is
  invisible until someone tries to unit-test the tool, and until then the tool
  accumulates CLI-only tests — which is exactly how `boundary-layers` came to
  have no test that could see `scanCapture`'s retention. The defect and the
  reason it went unseen are the same fact.
  **Design, decided:** a source lint over `tools/*.mjs` — any module defining a
  `main()` must guard its invocation. The repo already has this exact shape in
  `test/no-raw-mkdtemp.test.mjs` (a repo-wide `git ls-files` sweep with a
  self-verifying exemption list), so this is a second instance of a pattern that
  works here, not a new mechanism. Exemptions declared in data the lint checks.
  **Instrument-positive, so a zero is a measurement:** revert the guard in
  `boundary-layers.mjs` and the lint must fire; it must stay silent on
  `gate-live.mjs` and `replay.mjs`, which already carry it.
  Loop stage: VERIFY
  Anchor: tools/boundary-layers.mjs
  Write-set: tools/main-guard-lint.mjs (new), test/main-guard-lint.test.mjs (new)
  Verifier: node tools/main-guard-lint.mjs — red with the guard reverted, green with it, silent on the two tools that already have it
  <!-- entry: "a tools module calling main() at module scope cannot be imported or unit-tested" -->

- **RECORD 2026-08-16 — `git commit -q` is invisible to the subagent-commit
  recorder, so every quiet commit reaches the push gate UNMARKED and the gate
  cannot say who made it.** Observed on this session's own push: three commits
  listed under "ungebuchte(r) Commit(s) OHNE MARKE — konnte nicht bestimmt
  werden, wer sie gemacht hat", with the hook naming its own mechanism —
  `claude/hooks/subagent-commit-mark.py` never saw them because `git commit -q`
  returns no `gitOperation` and therefore no SHA for the recorder to key on.
  **Why it is worth a record rather than a shrug:** the gate's whole purpose is
  separating subagent work from desk work at the push boundary, and the
  degraded answer is not "unknown author" but a LIST the reader must
  hand-triage — which is the shape that gets skimmed. The failure is silent in
  the direction that matters: a subagent commit made with `-q` looks exactly
  like a desk commit made with `-q`.
  **What is NOT established:** whether any other commit-invoking form has the
  same hole (`git commit -F`, `-am`, commit via a tool wrapper), and whether
  the recorder could key on the post-commit ref change instead of on the
  harness's `gitOperation`. Neither was probed; both are one command away for
  whoever picks this up.
  Realizing write-boundary is the DOTFILES repo (`claude/hooks/subagent-commit-mark.py`
  plus the pre-push lane that reads its marks), not this one — a dotfiles
  session is its reader, and it is recorded here only because this is where it
  was observed.
  Anchor: n/a (process instrument, not a threat-matrix row)
  Write-set: (cross-repo) dotfiles `claude/hooks/subagent-commit-mark.py`, `git/hooks/pre-push`
  Verifier: make a commit with `git commit -q` and one without, then run the pre-push mark lane — the marked/unmarked split must follow the AUTHOR, not the flag
  <!-- entry: "git commit -q is invisible to the subagent-commit recorder" -->

- **RECORD 2026-08-15 — the ledger and CC's own diagnostics disagree about the
  919k event's cause, and it is DELIBERATELY not silenced.** `bust-triage`'s
  reconcile step warns `LEDGER says "no-prefix", TRANSCRIPT says
  "system_changed"`. Investigated rather than left as a standing warning, and
  the outcome is a could-not-verify with its missing evidence named.
  **Same request, established rather than assumed:** both instruments join on
  `cache_creation_input_tokens = 919402`, so they describe one event. The
  ledger record reads `cause:"no-prefix"`, `mtok:0`, `pblk:[]`, `gap:186`; the
  transcript's `cache_miss_reason` reads `system_changed` with
  `cache_missed_input_tokens: 737747`.
  **Why no equivalence entry was added.** `bust-triage` already carries a table
  of ledger/transcript pairs that NAME THE SAME EVENT in different vocabularies
  (`idle` <-> `previous_message_not_found`), added because the check had fired
  on a non-defect. `no-prefix` <-> `system_changed` is a candidate for that
  table and **n=1**: `grep -c '"cause":"no-prefix"'` over the whole ledger
  returns exactly ONE record, this event, out of 4,158 cold events. An
  equivalence silences the warning permanently for that pair, so minting one
  from a single instance would be softening a check to make a red go away —
  the repair the standing rules forbid.
  **The half that argues it is a real defect, not a vocabulary difference:**
  the ledger populates `mtok` on 77 of 4,158 events and `pblk` on 71, so those
  fields are readable in general; here the ledger recorded 0 while the number
  sat in the transcript. That is consistent with the ledger's cause ladder
  failing to read a diagnostic it could have read.
  **Consequence, and it is the operator-facing half:** `causeToRow` maps
  `system_changed` to row 24 and has no mapping for `no-prefix`, and the ❄
  statusline the operator reads and reports from is fed by the LEDGER. So a
  hand-reported bust of this class arrives carrying a cause that maps to no
  matrix row — the step-0 resolution problem `runbooks/bust-appears.md`
  already names, with a new way in.
  MISSING EVIDENCE, named: a SECOND `no-prefix` instance with its transcript
  cause, or claude-worktime's cause-ladder source read directly to establish
  whether `no-prefix` is a positive determination or a degraded default like
  `other`. Either settles equivalence-vs-defect; neither is shoppable for.
  Realizing write-boundary is claude-worktime (a sibling repo), not this one —
  `bust-triage`'s own behaviour is already correct: it prefers the transcript
  cause and flags the disagreement rather than acting on the ledger's.
  Anchor: row 24
  Write-set: (cross-repo) claude-worktime cause ladder; tools/bust-triage.mjs only if an equivalence is ever justified
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-reconcile.test.mjs
  <!-- entry: "ledger no-prefix disagrees with transcript system_changed, n=1" -->

- **RECORD 2026-08-15 — the census cannot say whether a message divergence is a
  LOCAL EDIT, a SHIFT or a REBUILD, so every boundary walk re-derives it by
  hand.** Closing-gate question 3, answered YES by having hand-classified it:
  today's walk needed exactly this distinction and nothing emitted it.
  `firstDivergence` gives an INDEX, and an index alone is ambiguous between
  three outcomes that route to different mitigations — a content edit at k
  (pin those messages), an insert/delete at k (the class
  insertion-normalization already exists for), and a genuine rebuild below k
  (not mitigable by pinning at all). On s-captureBR the index was 115 of 1549
  and the truth was a TWO-MESSAGE local edit with 92.4% of the array intact at
  the same indices; read as a rebuild it would have closed the class as
  unmitigable, which is the direction that never gets re-opened.
  The classifier now exists in `tools/boundary-layers.mjs` (`alignMessages`,
  three answers plus a position-blind total-overlap number, red-first in
  `test/boundary-layers.test.mjs` including a mutation proof), so this entry is
  about the CENSUS emitting it per pair rather than about inventing it.
  Design: `censusPair` gains the same three-valued classification, computed by
  IMPORTING `alignMessages` rather than restating it — the second-implementation
  drift this repo has already paid for three times.
  Done-criterion: a census run over a capture containing a known resume
  boundary reports the class per pair, and the daily sweep can be asked "how
  many boundaries were LOCAL-EDIT" without a hand walk.
  Anchor: row 24
  Write-set: tools/replay.mjs, tools/boundary-layers.mjs, test/replay-census-alignment.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/replay-census-alignment.test.mjs
  <!-- entry: "census cannot classify a message divergence as local-edit, shift or rebuild" -->

- **RECORD 2026-08-15 — `bust-evidence/` is an UNREGISTERED state carrier: a
  mechanism writes it, nothing is scheduled to read it.** Closing-gate question
  4's carrier-registration clause, answered NO against the actual file rather
  than from feel: `grep -n bust-evidence tools/state-report.mjs` returns
  NOTHING, while `tools/bust-triage.mjs:715` prints the command that creates
  `~/.local/share/cache-fix/bust-evidence/<date>/` and the bust runbook (step
  11) instructs every walk to write there. Two files landed there today.
  This is the exact failure the gate describes — "never a wrong reading, a
  reading that does not exist": the slices are correct, mode 0600, verified to
  reproduce, and no inventory pass will ever mention them, so they accumulate
  unbounded and a future session looking for frozen evidence has no way to
  learn which walks left any.
  Design: a `collectBustEvidence` collector in `tools/state-report.mjs` in the
  same three-answer shape as its siblings — count, newest date, total bytes,
  and `ok:false` with a reason when the directory is absent (absent is not
  zero). Its retirement axis is size: the class exists to be READ, so the
  collector is also what makes an accumulation trigger possible later.
  Done-criterion: `state-report` names the carrier with a non-null count on a
  machine that has walked a bust, and `ok:false` with a stated reason on one
  that has not.
  Anchor: row 24
  Write-set: tools/state-report.mjs, test/state-report-bust-evidence.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/state-report-bust-evidence.test.mjs
  <!-- entry: "bust-evidence is an unregistered state carrier with no collector" -->

- **RECORD (demoted 2026-08-15 — the head hit its cap of ten when the resume-tolerant state key was booked as a decision-complete MITIGATE item; the head LEADS with a mitigation and an instrument outranks it only when it is UPSTREAM of it, which this is not: its consumer is the PR-round process, tier 3 by the instrument partition's own reach ordering, not event disposition or the gates. Body, verifier and done-criterion unchanged.) 2026-08-15 — `pr-rounds` only sees PRs somebody POSTED on, so a PR
  whose blocker cleared in SILENCE is invisible to it; #281 sat ten days that
  way.** Measured today while checking PR state: #281 was graded "stalled, ball
  with nobody" by a fresh read of its thread, and that grade was wrong — its
  stated dependency #272 had merged on 2026-08-05 as the squash `b00b141`.
  Because a squash leaves the original commits non-ancestors, the branch was
  still replaying seven already-merged commits, which is the whole of what
  `mergeable: CONFLICTING` was reporting. Nobody had posted on #281 since our
  own status ping of 2026-07-30.
  **Why the existing writer cannot catch it, by its own definition:** a round
  is open when someone OTHER than us posted after our last push
  (`tools/pr-rounds.mjs` header). On #281 nobody posted at all, so the tool
  reports no round — correctly, forever. The doorbell entry above is a
  different gap (a missing READER, realizing in dotfiles); this one is a
  missing PREDICATE in the writer, and its write-set resolves in THIS repo,
  which is why it is booked here and not folded there.
  **Design, decided:** a second predicate beside the round predicate —
  DEPENDENCY-CLEARED. For each of our open PRs, extract `#\d+` references from
  its title and body (#281's title carries "stacks on #272"; the recurring
  prose forms are "stacks on", "lands after", "Ref"), resolve each referenced
  number, and emit when a referenced PR is MERGED or CLOSED and our PR has had
  no push to its head branch since that merge timestamp. A DRAFT PR in that
  state is the sharper case and is emitted with its own label, since draft
  status means no reviewer is looking either.
  **Red-first arrangement, and the two must DIFFER:** `computeRounds` is
  already dependency-injected (tools/pr-rounds.mjs:92), so both arms are
  fixtures, replayed from #281's recorded state — referenced PR merged
  2026-08-05 with our last push 2026-08-01 MUST fire and name #281; the same
  fixture with the referenced PR still OPEN must NOT fire. A predicate green on
  both arms is matching on the reference existing rather than on its being
  merged, and has not pinned the defect.
  Done: both arms hold, the #281 replay fires, and this entry moves to
  `## Done` with its commit ref.
  Loop stage: BUILD.
  Anchor: tools/pr-rounds.mjs
  Write-set: tools/pr-rounds.mjs, test/pr-rounds.test.mjs
  Verifier: node --test test/pr-rounds.test.mjs
  <!-- entry: "pr-rounds misses a PR whose blocking dependency merged in silence" -->

Everything here was READY on 2026-08-11 and was demoted MECHANICALLY when
the third grade was declared: one pass over the `## Open` section, bodies
byte-untouched, nothing dropped and nothing re-graded by reading. A RECORD
entry is not worse than a READY one — it is the same decision-complete body
with no claim of a schedule attached, which is the whole point of the split:
`READY` had come to assert an intent nobody held, and a label nobody believes
carries no information.

Promotion is by re-deriving the head, never by editing a grade in place. An
entry promoted to READY must satisfy the booking bar in this file's header
(`Anchor:` / `Write-set:` / `Verifier:`), which `tools/backlog-lint.mjs
--ready-bar` enforces.

- **RECORD 2026-08-14 — a manual compact is NOT automatically a cold rewrite,
  and the two cases are readable in the usage numbers alone.** Reported by the
  `claude-worktime` session (peer message, their measurement, not this repo's):
  the same act — a manual `/compact` — produced `cache_read 105164 /
  cache_creation 8040` in a session whose cache was still warm, and
  `cache_read 0 / cache_creation 77475` in one that had sat idle 3h03m. The
  mechanism is this repo's own subject read from the other end: cache keys are
  PREFIXES, the system prompt and tool definitions sit before the messages, and
  a compact leaves them byte-identical — so a warm compact re-bills the summary
  and keeps the prefix, while a dead-cache compact pays for everything.
  **Why it is worth keeping here even though nothing is owed:** it is a
  counterexample to "compaction causes a bust", which is a premise a future
  attribution pass could easily rest on. The busting variable is TIME SINCE
  THE LAST UPSTREAM CALL — not idle time, and the distinction is not
  pedantry: the warm session here was this one, which had been working
  continuously for those 3h03m without touching the API. A session can be
  busy and let its cache die, so a discriminator written as "the user was
  away" measures the wrong quantity. (That wording was corrected in both
  repos after this session read its own case wrong first.)
  It also names a cheap discriminator — `cache_read` on the first request
  after a compact separates the two cases with no other instrument: 105164
  against 0 in the two measured sessions.
  UNVERIFIED here, and the reach is stated rather than left to the reader:
  this session reproduced neither measurement, the numbers are the peer's,
  and n=2 — same machine, same afternoon, both Opus 1M. That carries fully as
  a COUNTEREXAMPLE (one warm compact refutes "a compact busts the cache") and
  carries nothing about how OFTEN compacts land warm. What would make it
  actionable rather than memory: a census class that labels a post-compact
  first request warm vs cold, which nothing currently asks for.
  <!-- entry: "manual compact is not automatically a cold rewrite" -->


- **RECORD (ex-READY 2026-08-11, displaced from the head by the matrix prose strip) — no instrument reads the BILLING side, so the only ground truth we
  have about whether the cache held is unread.** Measured 2026-08-10:
  `grep -c usage tools/gate-live.mjs` → 0; `bust-triage` reads none;
  `replay.mjs`'s only `cacheRead` mentions are prose in comments (`:1200`,
  `:1256`). Every gate asks a POSITIONAL question about our output against CC's
  input; none asks whether the prefix was actually reused. The 213k walk above
  took hours and reached UNCLASSIFIED, then resolved in one command once the
  `outcome` records were read — records that were in the capture the whole time.
  Design (decided): a `cacheLoss` check in `tools/gate-live.mjs`, REPORT-only
  until its corpus-wide rate is measured (the absorption check's precedent — a
  blocking check shipped before anyone knows how often it fires is how a guard
  trains its reader to ignore it). Per same-conversation pair, join the capture's
  `outcome` usage to the pair and flag: `cacheRead` falling by an order of
  magnitude while the pair's own verdict is NO divergence. Rows carry the
  four-request neighbourhood — ts, model, msgs, causes, appendOnly, cacheRead,
  cacheCreation — written AT DETECTION TIME, because this is a recurring
  producer with no closing moment and its inputs are on the eviction clock
  (closing gate q2); a count alone would have lost today's event by tomorrow.
  Verifier, red-first on a TRUE positive from real data, not a planted one: the
  2026-08-10T04:40:39Z fable request must fire (`cacheRead` 224187 -> 15603,
  `causes: []`, `appendOnly: true`). Over-firing controls, both required
  silent and both real: the 04:40:17 pair, which DID diverge mid-history and
  kept its cache at 220904, and the 04:41:04 pair (divergent, cr=229032) —
  divergence without loss must never fire, or the check reports the class
  backwards.
  Done-criterion: red on the real positive with its output pasted, both real
  controls green, corpus-wide rate reported over the live captures, suite green.
  Write boundary: `tools/gate-live.mjs`, `test/gate-live*.test.mjs`. No `proxy/`
  change, so no pin bump and no restart.

- **RECORD (ex-READY 2026-08-11) — a walk on a KNOWN-OPEN row is a dead end: the datapoint lands in
  the matrix and the row's booked mitigation entry accrues nothing, which is
  how weeks of bust reports produced a perfect record and zero new wire
  behavior.** Booked 2026-08-10 (operator: "the whole goal of this repo is
  to build more mitigations... I expected something to land in the backlog,
  not just in the threat matrix"). The loop's MITIGATE stage has no forward
  edge from a walk: `bust-appears` terminals are all dispositions; for a row
  whose mitigation is already booked, the walk ends by appending to the
  matrix CELL while the backlog ENTRY's measured-cost basis goes stale — so
  the ranking's cost signal under-promotes exactly the items the busts keep
  paying for, on top of the already-diagnosed brief-race starvation.
  Design, decided, two halves sharing one join: (a) mitigation-bearing
  entries carry their matrix ROW ID as data (the realizing-boundary lesson
  one field over — the row↔entry join must be data, not prose; today it is
  derivable only by reading bodies). (b) `bust-triage`'s KNOWN-OPEN verdict
  gains one output line: the row's booked mitigation entry (headline, via
  the join) and the instance's cost — and the runbook's KNOWN-OPEN terminal
  gains the matching step: append the instance datapoint TO THAT ENTRY
  (cost, capture stamp, one line), which keeps the entry's signal-2 basis
  current so the next derivation promotes it on evidence instead of
  memory. A row with NO booked mitigation already stops the walk as
  UNCLASSIFIED-adjacent; unchanged.
  Verifier, red-first: tonight's row-4 walk (`e18c299`'s frozen evidence)
  replayed through the new output must name the canonicalization entry and
  its cost line — today it names only the row; a constructed walk on a row
  with no entry-join must say so rather than guess. Lint half: a matrix row
  in OPEN status with no entry carrying its row id is a WARN
  (`backlog-lint` report lane).
  Realizing write-boundary: `tools/bust-triage.mjs`,
  `docs/runbooks/bust-appears.md`, `tools/backlog-lint.mjs` (+ tests).
  **PROCEDURE HALF SHIPPED 2026-08-10, same session as the booking** (the
  one-question test convicted the split — the runbook edit cost what booking
  it cost): the KNOWN-OPEN terminal now mandates the both-carriers append
  with the GRADUATE marker pointing here. What REMAINS this entry's build:
  the mechanized halves — the row-id join as entry data, `bust-triage`'s
  KNOWN-OPEN output line, and the `backlog-lint` WARN for an OPEN row with
  no entry carrying its id.
  Done-criterion: the next KNOWN-OPEN walk's booking shows the entry
  datapoint appended in the same session as the walk, no operator prompt in
  between. Consumer tier **1**. Loop stage: MITIGATE (its feeding edge).

- **RECORD (ex-READY 2026-08-11) — the bust-to-mitigation chain: one runbook continuation so an
  operator bust report can run A-Z to a shipped mitigation without the
  operator re-prompting each stage.** Booked 2026-08-10 (operator: "an A-Z
  solution starting with me posting a new bust to an opus session and it
  doing everything until we land with a restart of the proxy that has a new
  mitigation"). The stages ALL exist as lanes today; what is missing is the
  chain: `bust-appears` ends at disposition, and nothing says CONTINUE when
  the next step is decision-complete. Design, decided — an extension of
  `bust-appears` (amendment, not a new lane): after the disposition, walk
  forward while each next link is decision-complete, stopping ONLY at a
  named operator decision or a gate red: disposition → (entry datapoint,
  the sibling entry above) → if the row's mitigation entry is READY,
  dispatch/build it → census byte-match gate where it is a normalization →
  replay/gate green → ship via `ship-proxy-change.md` (row-3 declaration,
  pin bump, session-boundary restart) → post-restart verification (gates
  over fresh traffic; the absorbed class named). The existing guards stay
  binding and are the chain's stop rules: no mitigation designed before
  the attribution verdict; MISMATCH blocks; restart only at a stated
  session boundary; genuine decisions (state-key calls, scope widenings)
  surface to the operator as a numbered round with recommendations — the
  chain makes stopping EXPLICIT (which link, why, what un-sticks it)
  instead of silently ending at the matrix.
  Verifier: dry-run the chain on paper against row 4's current state — it
  must stop at exactly two named links (canonicalization unbuilt: the
  build; the census gate) and at no unnamed ones; after row 26 ships, a
  real bust on an absorbed class must chain to "verified absorbed" with
  zero operator prompts.
  Realizing write-boundary: `docs/runbooks/bust-appears.md` + the dev-loop
  index row's terminal-state column.
  **BUILT 2026-08-10, same session** — the forward-edge section is in the
  runbook and the index row's terminal column carries it. The entry stays
  OPEN on its done-criterion alone, which only a live event can satisfy:
  one real bust report runs the chain to either a shipped mitigation or a
  stop at a NAMED operator decision, with the operator's only inputs being
  the report and the decisions. First candidate: the next row-4 or row-26
  instance after those mitigations build. Consumer tier **1**. Loop
  stage: MITIGATE.

- **RECORD (ex-READY 2026-08-11) (small) — a FROZEN evidence archive whose own cited numbers are not
  in it, and nothing said so for three days.** Found 2026-08-10 by the lane
  building the transcript instrument, which was sent to reproduce two claims
  against `~/.local/share/claude-worktime/cold-design-evidence-2026-08-07/`
  and could reproduce NEITHER — correctly reporting both as gaps rather than
  tuning the tool until the numbers appeared. Re-run independently at the desk,
  same result both times:
  - the "01:00 session" numbers (`cc` 335,933 / `cr` 39,711) are real and ARE
    frozen — in `event-windows.jsonl`, a DERIVED worktime log sitting beside
    the tar. The raw CC transcript they were computed from is NOT in
    `transcripts-2026-08-07.tar.gz`: no file among its 24 carries
    `"sessionId":"06636dd1-…"`. The id appears eight times in the tar's PATH
    names — as a scratchpad DIRECTORY belonging to that session, whose
    transcripts have their own, different session ids. A name-shaped match in
    the wrong namespace, which is the coordinate-space confusion `dev-loop`
    already collects, arriving inside an evidence archive.
  - the `previous_message_not_found` timestamps (03:31:59Z / 03:32:01Z) appear
    NOWHERE in the archive — not in the tar, not in `cold-rows-all.jsonl`, not
    in `event-windows.jsonl`. The archive does hold two real ones, at
    2026-08-06T16:41:37.941Z and 2026-08-06T23:59:10.461Z. The cited pair most
    likely came from the worktime LEDGER (the neighbouring entry discusses a
    contradictory-class pair at 2026-08-07T03:32:02Z in ledger vocabulary —
    booked twice, `hit`/`idle` then `cost`/`resume`), i.e. a verifier that
    silently crossed two sources.
  **Why this is the closing gate's question 2 failing in the field, not a
  filing error.** The archive was created BY a design pass, on the day of the
  measurement, precisely so the claims would stay checkable after rotation. It
  froze the derived views and left the source out — so the entry read as
  evidence-backed for three days while the evidence for half of it did not
  exist, and the only reason anyone found out is that a lane was sent to
  reproduce it rather than to trust it.
  Design, decided, two halves — the second is the one that generalises:
  (1) the archive gains an INVENTORY it does not currently have: one
  `MANIFEST.jsonl` listing every file with its size, its sha256, and for a
  transcript the session ids actually INSIDE it (never the ones in its path).
  (2) A verifier that cites a frozen archive names the FILE inside it that
  carries the number, not the directory — `<archive>/event-windows.jsonl` is a
  checkable citation, `<archive>/` is a gesture. The convention costs a path
  segment and is what would have caught this at write time.
  Verifier, red-first, with the positive already in hand: build the manifest
  and assert it lists no `sessionId` for 06636dd1 while
  `event-windows.jsonl` does carry `cc` 335,933 — the exact split this finding
  is. RED against the old state is that no manifest exists at all, so the
  question "is the source in here?" is answerable only by extracting 24 files
  and grepping, which is what it cost today.
  Done-criterion: the manifest exists, the transcript entry above cites file
  paths rather than the directory, and both facts above are readable without
  extracting the tar.
  Write boundary: the archive directory (operator-side data, not this repo's
  tree) plus this repo's citing entries. **Consumer tier 1 (event
  disposition)** — a frozen archive is what every later attribution re-reads,
  and one that silently lacks its source sends the re-reader to a wrong
  conclusion or to no conclusion at all.

- **RECORD (ex-READY 2026-08-11) (small) — the required-reading gate guards `Write`/`Edit` and NOT a
  script, so the session's first write can bypass it entirely.** Measured
  2026-08-10 by walking into it: this session's phase-1 edit rewrote
  `BACKLOG.md` from a `node` script run through `Bash`, moving 74 bullets, and
  the PreToolUse gate that is supposed to deny the first write until
  `docs/dev-loop.md` and `FORK-NOTES.md` have been Read never fired — it keys on
  the Write/Edit tool names. No harm here (both files had been Read, which is
  why this is a gate finding and not an incident), and that is exactly what makes
  it worth booking: the guarded route was taken by accident, not by design.
  This is the entry-path table in `docs/dev-loop.md` ("a mechanism that guards
  one route is not a guard") with a fifth row, and the same shape as the
  `npm test` vs `node --test` row already in it: the protected thing is reachable
  by a second route, the second route is silent, and every instance reads as
  working because the route someone happened to take was the guarded one.
  Design, decided: the gate matches on the WRITE EFFECT, not the tool name — add
  a Bash lane that fires when a command's argv would write a repo file (a
  redirect, a `tee`, an interpreter invocation with a script that writes), or, if
  that predicate is too loose to keep near-zero false fires, invert it: make the
  reading obligation a precondition of the SESSION rather than of the first
  Write, satisfied once and checked cheaply thereafter. The judgment-shaped
  remainder stays prose with the operator as backstop — the corpus rule on
  mechanisms earning their slot only where the trigger is computable.
  Verifier, red-first and permanently runnable: in a scratch clone with the
  reading unsatisfied, run `node -e 'require("fs").appendFileSync("BACKLOG.md","x")'`
  through Bash — it must be DENIED, and the identical run after the two Reads must
  be allowed. Both arms required; today only the second is observable, which is
  the vacuous-green shape.
  Consumer tier **2 (feeds the gates)** — it is a guard in front of a
  correctness obligation. Unranked (booked after the derivation).

- **RECORD (ex-READY 2026-08-11) (small, operator-side — DECISION ATTACHED) — `CLAUDE.local.md`
  carries a SECOND index over the runbook lanes, and it is now stale by four
  of seven.** Measured 2026-08-10 late-evening at the desk, after both new
  lanes landed: `node tools/runbook-lane-index.mjs` reports "7 index row(s), 7
  runbook file(s) on disk" with zero orphans and zero dead pointers — the
  dev-loop router is complete — and four `CLAUDE.local.md STALE LIST` findings
  (`runtime-anomaly`, `session-close`, `ship-proxy-change`,
  `upstream-pr-slice`). The list was already stale by two before today; the two
  new lanes made it four.
  **The recommendation is to DELETE the inline list, not to sync it**, and the
  basis is `~/.claude/runbook-format.md`'s own rule: there is exactly ONE
  router per repo, because "minting a second one beside it creates two lists
  over the same lanes that drift apart within hours" — which is precisely the
  observed history here. `CLAUDE.local.md`'s own sentence already concedes it
  ("**The index is `docs/dev-loop.md` … — read that, not this line**, which is
  a pointer and will go stale first"), so the file is carrying a list it tells
  its reader not to trust. Syncing it buys four green findings and re-arms the
  same drift on the next lane.
  Why this is not just done: the file is the operator's overlay, DEPLOYED from
  dotfiles `cache-fix/CLAUDE.local.md` — edited there, never here — and its
  deletion changes what `runbook-lane-index`'s CHECK 2b measures. That second
  half is the real work: with no inline list the check must report
  NOT-APPLICABLE, not COULD-NOT-VERIFY, or it converts a deliberate removal
  into a permanent unverifiable — and today COULD-NOT-VERIFY is exactly what
  it already reports in every worktree, where the untracked file is absent, so
  the two states are currently indistinguishable.
  Write boundary: dotfiles `cache-fix/CLAUDE.local.md` (the list), then
  `tools/runbook-lane-index.mjs` + `test/runbook-lane-index.test.mjs` (CHECK
  2b's third answer). Verifier, red-first: with the list removed, the check
  must report not-applicable while a PLANTED partial list still reports STALE
  LIST — both arms, or the removal has simply silenced the check.
  Consumer tier **2**. Loop stage: VERIFY.
  <!-- entry: "CLAUDE.local.md carries a second index over the runbook lanes" -->

- **RECORD (ex-READY 2026-08-11) (small) — `tools/backlog-order.mjs` parses `process.argv` at IMPORT
  time and `process.exit(2)`s on an argument it does not recognise, so it
  cannot be imported as a library at all.** Found 2026-08-10 by the
  identifier-join lane, which was instructed to reuse the shared `## Open`
  boundary lookup and correctly refused: importing `splitOpen` would have made
  `backlog-neighbours` exit 2 on its own commit-ish argument
  (`backlog-order.mjs:41-58`, no `import.meta.url` guard). The lane duplicated
  ~10 lines instead and said why — the right call at its tier, and the third
  copy of that boundary lookup (`backlog-lint`'s private `censusOpenSection`
  and `backlog-order`'s `splitOpen` are the other two, a duplication
  `backlog-order`'s own comment already notes).
  This is the entrypoint-guard class an earlier commit measured across ten
  tools, arriving with a consumer: the missing guard here has now cost a real
  duplication rather than a hypothetical one.
  Design, decided: guard `backlog-order.mjs`'s CLI behind
  `import.meta.url === pathToFileURL(process.argv[1]).href` (the shape
  `backlog-neighbours.mjs:202` already uses), then collapse the three copies of
  the `## Open` slice onto one exported pure function.
  Verifier, red-first and one command: `node -e 'import("./tools/backlog-order.mjs")'`
  run with an extra argv token must currently exit 2 and must exit 0 after —
  and the collapse is done when `grep -c "## Open" ` over the three files finds
  one implementation, not three.
  Write boundary: `tools/backlog-order.mjs`, `tools/backlog-lint.mjs`,
  `tools/backlog-neighbours.mjs` + their tests. Consumer tier **3**.
  Loop stage: VERIFY.
  <!-- entry: "backlog-order parses argv at import time" -->

- **RECORD (ex-READY 2026-08-11) (small) — a dispatched worktree does NOT carry the main clone's
  untracked files, so a verifier baseline computed at the desk can be
  unreproducible in the lane that was briefed with it.** Found 2026-08-10 by
  the ship-proxy-change lane, which reported it rather than bridging it.
  `CLAUDE.local.md` is untracked and git-excluded here by design, so in a
  worktree `tools/runbook-lane-index.mjs` reports its CHECK 2b as
  `CLAUDE.local.md list COULD-NOT-VERIFY (absent or no inline list)` — the
  three-answer discipline working correctly — and the lane therefore measured a
  5-finding baseline where the desk had cited 7. Both numbers were right about
  their own tree.
  The checker is not the defect; the BRIEF is. Design, decided: a dispatcher
  writing a baseline into a brief states which tree it was measured in, and any
  baseline that depends on an untracked file is either recomputed by the lane
  in ITS tree or checked by the dispatcher at integration (which is what
  happened here — the desk re-ran it in the main clone and got the predicted
  8 = 7 + 1 new STALE LIST row). The portable half belongs in the
  `dispatch-guards` plugin's `dev-notes/dispatch-OBSERVATIONS.md`, not here.
  Verifier: a brief-time check that flags a cited baseline command whose output
  depends on a git-excluded path. Consumer tier **3**. Loop stage: VERIFY.
  <!-- entry: "a dispatched worktree does not carry untracked files" -->

- **RECORD (ex-READY 2026-08-11) (IN FLIGHT 2026-08-10 late-evening — dispatched to sonnet in a
  worktree; write set `docs/runbooks/ship-proxy-change.md` + one row in
  dev-loop's index table) — a ship-a-proxy-change runbook: the deploy
  discipline exists in
  three homes and no lane, and D1 is its first consumer.** Booked 2026-08-10
  (operator question "do we have good procedures to handle service restart?"
  — answered by inventory: `docs/runbooks/` has five lanes, none for
  deployment; the discipline is scattered across FORK-NOTES' restart section,
  CLAUDE.local.md's deployment-coupling block, and matrix row 3). D1 is about
  to ship several `proxy/**` changes, each owing the full sequence, and a
  fresh context today reconstructs it from three files or misses a step.
  Design, decided: an INTENT workflow (dev-loop's runbook taxonomy), written
  for a fresh context, consolidating — not restating — the three homes by
  pointer where the reasoning lives there: (1) row-3 declaration owed?
  (state keys / freeze logic — stated BEFORE the restart); (2) session
  boundary confirmed; (3) commit+push; (4) pin bump in dotfiles
  (`git rev-parse --short HEAD:proxy` → `CACHE_FIX_PROXY_TREE_PIN`) —
  doc/tools-only commits skip 4-7; (5) `systemctl --user restart
  cache-fix-proxy` + `/health` gates check; (6) gate run (`systemctl --user
  start cache-fix-gate`); (7) doctor's three answers agree. Hand steps carry
  `[GRADUATE -> …]` per the staging-area rule. The upstream catch-up merge
  (restart-and-repin, FORK-NOTES procedure) ENTERS this lane as a caller,
  which retires the borderline prose block from being the only carrier.
  Realizing write-boundary: `docs/runbooks/ship-proxy-change.md` (new) +
  the dev-loop "Which line are you on" index row + `.claude/`
  required-reading untouched.
  Verifier, red-first: the runbook-format checker / lane index check must
  fail on the missing index row before it is added (the lanes-backfill
  entry's machinery); dry-run the lane against the LAST shipped proxy
  change's commit trail and require every step to map to an artifact that
  exists (the pin bump commit, the restart timestamp, the gate verdict).
  Done-criterion: D1's first proxy ship executes from the runbook without
  consulting FORK-NOTES or CLAUDE.local.md for sequence, and the lane ends
  at a named terminal state (shipped / aborted-with-reason).
  Consumer: D1 and every future proxy ship. Loop stage: VERIFY.

- **RECORD (ex-READY 2026-08-11) (IN FLIGHT 2026-08-10 late-evening — dispatched to sonnet in a
  worktree; write set `docs/runbooks/upstream-pr-slice.md` + one row in
  dev-loop's index table) — an upstream-PR-slice runbook: the highest-hygiene
  procedure in
  the repo has a sketch, a tool, and no lane.** Booked 2026-08-10 (same
  operator question, PR half). What exists: FORK-NOTES' "Upstream-PR plan
  (when ready)" sketch (cut `feat/<topic>` from main, per-topic slices,
  attach forensics), `tools/slice-preflight.mjs` (does a test file still
  LOAD in its slice — built from the 2026-07-30 wave-2 load failures), the
  fork-only-files list (CLAUDE.local.md), and the publication bar. What is
  missing is the LANE: the ordered sequence a fresh context runs to produce
  one reviewable upstream PR without leaking fork-only content — and the
  stakes are public git history, where the remediation precedent is
  destroy-and-recreate.
  Design, decided: an intent workflow consolidating: (1) topic chosen from
  the slice plan, cut from main; (2) fork-only exclusion sweep (the list is
  data — the runbook names its home, never copies it); (3) slice-preflight
  over every mapped test file; (4) the absence-scan / hygiene gates run
  against the SLICE, not the branch it came from; (5) upstream PR body form
  (attribution footer per upstream's CLAUDE.md, forensics attachment);
  (6) the review-round handoff into `upstream-pr-round.md`, which already
  exists and stays the receiving lane.
  Realizing write-boundary: `docs/runbooks/upstream-pr-slice.md` (new) +
  the dev-loop index row.
  Verifier, red-first: run the exclusion sweep step against a deliberately
  mis-mapped slice containing one fork-only file (planted) — the lane must
  refuse; slice-preflight's own red is its existing test. Done-criterion:
  the first real upstream slice ships through the lane end to end, and the
  sketch paragraph in FORK-NOTES is replaced by a pointer to the runbook.
  Consumer: the post-drain upstream-PR phase. Loop stage: RETIRE (posting
  verified mechanisms back is the loop's retirement arm).

- **RECORD (ex-READY 2026-08-11) — the backlog is heavily MERGEABLE by realizing file, and the
  measurement that suggested otherwise was my own weak instrument.** Raised
  2026-08-10 by the operator on both counts: *"i wonder what the rest are?"*
  and *"a lot of the tooling ones could be heavily merged, no?"* Both answered
  by measuring, and the first answer corrects a number this session had already
  published.
  **The correction first, because the earlier claim was under-evidenced.** This
  session reported "36 cite a `tools/` file, 11 cite a `proxy/` file, so the
  queue is ~3:1 tooling". The predicate was a backticked FILE PATH, and **63 of
  100 entries cite neither** — not because they are not tool work, but because
  they name a FUNCTION instead: `capturePairResult`, `rebilledBytes`,
  `findAbsorptionMisses`, the frozen-archive entry, three `bust-triage` row
  entries. So 36 and 11 are FLOORS, the 3:1 ratio is not established, and the
  honest statement is that the tooling share is at least 36% and probably far
  higher. The direction of the operator's original intuition survives; the
  number I attached to it does not. Same shape as this repo's standing warning:
  a pattern-scoped count certifies the pattern, not the class.
  **The merge finding, which is the actionable half.** Counting entries by the
  `tools/` file they name: `replay.mjs` **6**, `backlog-lint.mjs` **6**,
  `harvest.mjs` 3, `backlog-order.mjs` 3, `bust-triage.mjs` 3,
  `cold-events.mjs` 2, `gate-live.mjs` 2, `lane-sweep.mjs` 2. And the
  backlog-tooling FAMILY — `backlog-lint` + `backlog-order` +
  `backlog-neighbours` + `backlog-index` — is **11 entries against four files
  that already import each other** (`backlog-neighbours` and `backlog-order`
  both consume `backlog-lint`'s `censusEntries`).
  Design, decided: **bundle by realizing file, not by topic.** Dispatch
  discipline already says items sharing a file must serialize, so a shared file
  is not a reason to queue them — it is a reason to make them ONE lane with one
  red-first arrangement and one integration. The backlog-tooling family is the
  first bundle and the largest: up to 11 entries, one write set, one suite run.
  `replay.mjs`'s six and `harvest.mjs`'s three are the next two, though both
  files have lanes in flight right now and the bundle waits for them.
  **What this does NOT claim.** Bundling reduces LANES and integration cost; it
  does not reduce the work, and an entry that is merely adjacent is not merged
  by being in the same lane. The merge is real only where the entries share a
  red-first arrangement or a single design decision — otherwise it is a
  convoy, which is fine but should be called that.
  **BATCHING is the second axis, and it is the one that touches the COUNT.**
  Added 2026-08-10 on the operator's decision — *"so let's not only look for
  merge opportunity but also BATCH opportunities"* — after this entry's own
  arithmetic showed merging moving zero: today's 111 -> 96 came from re-grading
  eleven handed-off dotfiles entries and from three closures plus two parkings,
  and the merge bundle contributed nothing because it was still in flight.
  Merge and batch are different relations and must not be conflated. MERGE
  groups entries that SHARE a realizing file — they must serialize anyway, so
  one lane costs one integration instead of six. BATCH groups entries whose
  realizing files are DISJOINT — nothing forces them together, and that is
  precisely why one lane can close all of them in a single pass without a
  single serialization point.
  Measured, 2026-08-10, over the 33 `READY (small)` entries by extracting each
  entry's backticked file citations (scratch enumerator; the predicate is a
  backticked path, so an entry naming only a FUNCTION contributes no file — the
  same floor caveat this entry already records above). Four batches fall out:
  - **Disposals and doc-only, no code**: the two spent briefs at the repo root,
    the frozen-archive entry, the `{ todo }` marker claim, the matrix-lint
    suite-time entry, the `row=none` disposition entry, the timestamp-correlator
    entry. Seven entries, no shared file, no build.
  - **One-file tools, each a different file**: `local-stamp`, `cost-report`,
    `xdg-writer-guard`, `gate-live`, `absence-scan`, `cold-events`. Six
    entries; `gate-live` appears twice, which is a merge INSIDE the batch.
  - **`tools/replay.mjs`**: three entries, one file — a merge, not a batch.
  - **`tools/backlog-lint.mjs`**: five entries, one file — a merge, and BLOCKED
    while a lane holds that file.
  Design, decided: a batch lane takes its entries as a numbered list with one
  write boundary per entry, and its report dispositions EVERY entry — closed,
  or returned with the reason. The failure this guards against is the convoy
  that quietly drops its tail; the per-entry disposition is what makes a
  dropped entry visible rather than merely absent.
  Batch verifier: after a batch lane, each of its entries carries the SAME
  commit ref or an explicit non-closure reason, and the open count falls by the
  number closed — the first measurement in this repo where a lane's cost and
  the count actually move together.
  Verifier: after the first bundle, the count of entries naming that file drops
  by the number closed, and each closed entry carries the same commit ref —
  which is also the check that the bundle did not quietly drop one.
  Done-criterion: the backlog-tooling family is one lane and its entries close
  together or return with a stated reason why one could not; and at least one
  BATCH lane has run, its entries dispositioned one by one.
  **LANE PLAN DERIVED 2026-08-10 (late)** — the full assignment exists:
  `docs/directives/backlog-lane-plan-2026-08-10.md` maps all 100 READY
  entries into 10 dispatchable lanes (wave 1: nine parallel, wave 2:
  gate-live after replay), a 7-entry deployment-coupled desk round, and 10
  trigger-gated holds, each lane with its write boundary, internal ordering,
  and the carve-outs that keep the write sets disjoint. Consumer: the
  session executing the drain. The plan is derived-not-edited (same rule as
  the build-order block) and keys entries by HEADLINE, not line number.
  This entry stays open until its own done-criterion above is met by lanes
  actually running.
  Consumer tier **3 (backlog and process)**.

- **RECORD (ex-READY 2026-08-11) — `backlog-lanes.mjs`: lane derivation becomes a mechanical join,
  and a READY entry missing its realizing boundary becomes a finding.**
  Booked 2026-08-10 (operator GO) from the lane-plan derivation itself: 63 of
  100 READY entries cited no file — they name functions or nothing — so
  grouping them into lanes was a judgment pass over ~6600 lines of prose that
  one session failed at and another did by hand. The hand derivation
  (`docs/directives/backlog-lane-plan-2026-08-10.md`) is the prototype; the
  mechanism is the deliverable (closing gate Q1). The global half is minted:
  the corpus's ready grade now includes the realizing write-boundary (dotfiles
  `88a3580`); this entry is its computable half here.
  Design, decided: (a) `tools/backlog-lanes.mjs`, a REPORT and never a gate —
  consumes `censusEntries`, resolves each READY entry's realizing boundary
  from its backticked citations (noise-list for dispatcher-owned carriers:
  `BACKLOG.md`, `docs/dev-loop.md`; `proxy/**` classifies deployment-coupled;
  operator/cross-repo grade markers classify holds), computes connected
  components over shared boundary files, and emits: merge lanes, disjoint
  batch candidates, desk set, holds, and UNRESOLVED (no boundary derivable —
  the queue for boundary-slot repair). (b) In `backlog-lint`'s report lanes:
  a READY entry with no resolvable boundary is a WARN finding (advisory, per
  that tool's own posture; the grade stays prose-governed).
  Verifier, red-first: run over `3b37ece:BACKLOG.md` (frozen derivation-time
  state) must report ~63 UNRESOLVED and reproduce the hand plan's two largest
  components (the backlog-tooling family; replay + fixture-verdict) —
  divergence tool-vs-hand is a finding about one of them, adjudicated in the
  entry bodies. Lint red on a planted boundary-less READY entry; known
  positive on a citing one.
  Write boundary: `tools/backlog-lanes.mjs` (new), `tools/backlog-lint.mjs`,
  `test/backlog-lanes.test.mjs` — L1's write set; the entry joins L1.
  Done-criterion: red-first run over the frozen ref recorded; lint fires on
  the plant; the NEXT lane-plan derivation cites the tool's output instead of
  a hand census. Consumer tier **3 (backlog and process)**.

- **RECORD (ex-READY 2026-08-11) (small) — `DOTFILES-BRIEF-inherited-items.md` sits untracked at the
  repo root and needs a disposal, not a mention.** Written 2026-08-10 on
  operator request ("if any of the open items are work for the dotfiles repo,
  give me a brief for another session"), excluded via `.git/info/exclude`
  because this repo is public and the brief names guard internals. It covers
  the eleven `(operator-side, dotfiles)` and POINTER entries plus the two
  writes the closing review session left owed, and it POINTS at their bodies
  rather than copying them.
  It is spent the moment that session reports back. Disposal, decided by the
  same reasoning the review brief's own entry used: DELETE rather than move to
  `docs/directives/` — unlike that one it is a routing document with no
  findings of its own, every claim in it is a pointer to an entry that
  outlives it, and publishing guard internals buys nothing. Deleting an
  untracked file is irreversible with no git copy, so it is a confirm-first
  act, not an assume-one.
  Trigger: the dotfiles session reports, or the last of its eleven entries
  closes. Done-criterion: the file is gone and each closed pointer entry
  carries its dotfiles commit ref.
  **HANDED OFF 2026-08-10 — and the eleven entries were RE-GRADED, which is the
  half that would otherwise have been a mention.** They carried `READY`, and
  `READY` asserts this session intends to build them; once the brief was passed
  on that was false, and a false grade is the exact defect the grade-split entry
  below names. They now read `PARKED [HANDED OFF 2026-08-10]`, which is the
  closed vocabulary's honest fit: PARKED requires a named trigger and these have
  one — **the dotfiles session reporting back**. Stated once here rather than
  copied into eleven bodies, because a shared fact with eleven homes drifts in
  ten of them.
  READY fell **111 -> 100** on that re-grade alone, and that number is worth
  reading carefully: nothing was built and nothing was dropped. The count was
  simply wrong before, in the direction the operator had already spotted by
  eye. Selection was by GRADE MARKER — `(operator-side, dotfiles`,
  `(operator-side, corpus`, and the two POINTER spellings naming that repo —
  never by the word "dotfiles", which also appears in cache-fix entries that
  are merely deployment-coupled and stay ours. One further match was left
  alone: an entry already graded `IN FLIGHT` since 2026-08-06, dispatched
  elsewhere and not this brief's to re-grade.
  Re-grading them is NOT a discharge. Each still owes its closure here with the
  dotfiles commit ref, which is what the pointer entries exist for.

- **RECORD (ex-READY 2026-08-11) — the READY grade asserts INTENT TO BUILD, 110 entries carry it, and
  the operator's read is that they will never be finished. He is right, and the
  count is not the defect — the GRADE is.** Raised 2026-08-10 by the operator
  looking at the number ("110 is so much, I really see problems with ever
  finishing them"). Measured the same hour rather than argued: 12 entries
  closed that day against ~33 booked, READY 89 -> 110, about **2.75:1**. The
  repo's retirement trigger (3:1 over a +30% stretch) had NOT fired, so the
  rule says nothing is owed — and the rule is answering a different question
  than the one asked. Retirement removes what is overtaken; it does not make a
  110-item queue honest.
  **The diagnosis.** `READY` is defined as decision-complete AND dispatchable,
  so a file carrying 110 of them asserts an intention to build 110 things. That
  is false, and everyone reading it knows it is false, which is the specific
  harm: a grade nobody believes stops carrying information, and the head of the
  list becomes indistinguishable from its tail. Today's third derivation
  already worked around this by hand — it ranked ELEVEN and said the other ~99
  are unranked — which is the shape of the fix arriving as a workaround.
  Design, decided: **split the grade.** `READY` keeps its current meaning and
  is reserved for the derived head — queued work someone intends to take.
  Everything else that is decision-complete but unscheduled becomes
  `DESIGNED`: the same body, the same verifier, the same done-criterion,
  explicitly NOT a commitment. Nothing is dropped and nothing is downgraded in
  substance — the record stays complete, which is what booking exists for,
  while the queue becomes a number that means something.
  Consequences to carry in the same change, each already a live consumer:
  `tools/backlog-lint.mjs` (grade vocabulary and census), the session-start
  hook (it injects READY bullets, and injecting 110 is why a fresh session
  opens on noise), `tools/backlog-order.mjs` (rank anchors must resolve to
  READY, so promotion to the head becomes an explicit act), and the retirement
  trigger's ratio, which should then read against DESIGNED rather than READY.
  **The standing rule this implies, stated so the split does not silently
  re-fill:** a finding is booked `DESIGNED` by default; it becomes `READY` only
  by a derivation putting it in the head. Booking stays as cheap as it is today
  — that is deliberate and is not what is being traded away.
  Verifier, red-first: after the split, the session-start hook's injected list
  is the derived head and nothing else (today it is 110 lines); `backlog-lint`
  fails a `READY` bullet carrying no rank anchor; and the count the operator
  reads at startup is the queue, not the archive.
  Done-criterion: READY count equals the derived head's size, DESIGNED carries
  the rest, and no entry lost a field in the move.
  Write boundary: `BACKLOG.md`, `tools/backlog-lint.mjs`,
  `tools/backlog-order.mjs`, plus the dotfiles-side session-start hook (a
  POINTER — that body belongs in the dotfiles repo).
  Consumer tier **3 (backlog and process)** — it mis-describes the queue rather
  than mis-classifying an event, but it is read at the start of every session.

- **RECORD (ex-READY 2026-08-11) (small) — billing and verdict are written by two extensions with no
  join key, so the join is by TIMESTAMP, which is how today's walk mis-joined.**
  The capture's `outcome` record carries `id` and `requestId`; the prefix-diff
  event record carries none of them — its keys are `betaHeader, causes, chain,
  key, msgs, params, prevTs, sid, system, systemMatch, tools, toolsMatch, ts,
  view, windows` (read off a real record 2026-08-10). Joining them therefore
  means matching wall-clock stamps across two tap points, on a session that
  interleaves several conversations and models — the exact conditions under
  which `bust-triage` picked the wrong conversation the same morning.
  Design (decided): prefix-diff writes the request `id` into its event record,
  same value the capture's request and outcome records already share, so the
  join is an equality test instead of a proximity heuristic. Field name `id`,
  matching the capture's — never a second spelling (this repo has paid for that
  twice today).
  Verifier, red-first: a replay over a capture must join every prefix-diff event
  to its outcome by `id` with zero unmatched, and the SAME join by timestamp
  proximity must be shown to mis-pair at least one record on the 2026-08-10
  session — the measurement that justifies the field, not an assumption that it
  helps. Done-criterion: both numbers pasted, suite green, `/health` unchanged.
  Write boundary: `proxy/extensions/prefix-diff.mjs` + its tests. **Deployment-
  coupled**: `proxy/` changes need the dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) and `systemctl --user restart
  cache-fix-proxy`; the change touches no state KEYS and no freeze logic, so
  row 3's restart-transparency verdict holds and the restart is cache-transparent.

- **RECORD (ex-READY 2026-08-11) (operator-side, claude-worktime — POINTER; body belongs in that
  repo's BACKLOG) — the ❄ detector fires on `cc` alone, so GROWTH is booked as
  LOSS.** Measured 2026-08-07 01:00:55Z: `cc` 335,933 with `cr` **39,711 =
  exactly the predecessor's `cc`**, i.e. every cached token reused and the
  written portion entirely new content (a 907 kB `tool_result` from the
  session's first tool call). No `cache_miss_reason` exists anywhere in that
  transcript. A ❄ fired anyway, and the event entered the ledger as
  `k:"hit"` — a preventable-loss class.
  **ROOT CAUSE FOUND 2026-08-07, and it is not the threshold — it is the
  BASELINE.** The predicate (`cc >= 0.6 x prev_ctx` AND `cr <= prev_ctx / 5`,
  `claude-worktime.sh:1694`) is applied per TRANSCRIPT ROW, and one assistant
  message is written across several rows carrying identical usage. Row 2 is
  therefore compared against row 1 OF THE SAME MESSAGE, whose `ctx` already
  contains the big write. Measured: state file reads
  `count=1 … lastcc=335933 lasthit_t=1786064455 lastcause=other`, `gap` 15 s,
  so the baseline turn was 01:00:40 — and the 01:00:40 and 01:00:54 transcript
  rows both read `cc` 335,933 / `cr` 39,711. Baseline `prev_ctx` becomes
  375,646 instead of 39,713, so identical numbers read as "re-wrote 89% of a
  375k context, read back 10%" and both tests pass by wide margins.
  **This unifies two entries.** The same duplicate-row shape explains the
  triple-booking already moved to that repo (three rows, one `msgId`, three
  hits) AND this false fire (two rows, one message, poisoned baseline). One
  root cause: rows are not API calls.
  **The fix already exists in a sibling implementation, which is how this was
  confirmed rather than argued.** `tools/cold-events.mjs` in THIS repo
  re-implements the identical predicate (`r.cr <= Math.floor(prevCtx / 5)`,
  line 184) and dedupes by `requestId` first, with its own comment recording
  why ("38 rows for 12 API calls… requestId is the API call"). Run against the
  same transcript it returns **`events: 0`** over 13 calls — zero cold
  rewrites where worktime booked a 336k hit. Two independent measurements of
  one quantity diverging is the cheap reach detector, and here it names the
  defect and the remedy in one step.
  Secondary, and still worth having once the baseline is right: `ctx` - `cc`
  is the surviving read, and comparing it against the predecessor's write
  separates the three live cases where a `cc` threshold cannot — 39,713
  (growth) / 2 (TTL loss) / 15,224 (real bust).
  **And the cause ladder has no branch for "the cache was fine."** It runs
  idle -> model -> residual, assuming a cold rewrite happened and only asking
  why; the residual names a real cause only if `cache_miss_reason` is
  readable, and here the transcript contains none because there was no miss.
  So a false fire can only ever be labelled `other` — the label is a
  CONSEQUENCE of the false fire, not independent evidence for it. FORK-NOTES
  already says `other` means "no cause available"; what is new is that it is
  also what a non-event looks like.
  **DESIGNED AND MOVED 2026-08-07 — the body now lives in
  `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md`; do not execute from
  here.** Designing the three together showed one root cause (the detector
  has no notion of an API CALL) and three dependency-ordered layers, and the
  pass falsified two claims stated above, both by reading rather than
  reasoning:
  - **"the predicate is applied per TRANSCRIPT ROW" is true of OUR scanner,
    not of worktime's live path.** `claude-worktime.sh:1259-1279` takes its
    usage from the statusline stdin payload
    (`.context_window.current_usage.*`), so the predicate runs per statusline
    RENDER. Sixteen fields are extracted and none is an identifier, so a
    `requestId` dedupe — which is what `tools/cold-events.mjs` does and why it
    is right — is not available at that tap without reading the transcript.
    The conclusion (poisoned baseline, not a bad threshold) survives intact;
    the mechanism sentence did not.
  - **worktime already HAS a dedupe guard, and its holes are the defect.**
    `claude-worktime.sh:1640-1652` skips the block when `(cr,cc)` matches the
    previous pair — but the file is `${LOGDIR}/.token_prev`, ONE file for every
    session (verified on disk beside the per-session `.cold_<sid>` files). A
    concurrent session's write between two renders of one call lets the
    duplicate through. So the repair is a per-session identity guard, not a
    new mechanism.
  Also found while measuring: the contradictory-class pair RECURRED at
  2026-08-07 03:32:02Z (427,535 booked twice, `hit`/`idle` then
  `cost`/`resume`) with **no retraction at all**, where the 23:59 instance got
  one. Live and growing, not historical. Two further entries were booked there
  from this pass (the 45 unreadable ledger lines' writer; the missing ledger
  query surface).

- **RECORD (ex-READY 2026-08-11) (small) — RE-SCOPED 2026-08-10 after a batch lane correctly REFUSED
  it: the write boundary was wrong, and it was wrong because I derived it from
  the entry's backticked file citations.** The lane was briefed with
  "`tools/gate-live.mjs` and its tests" and halted rather than renaming half a
  symbol: `gate-live.mjs` only READS `m.rebilledBytes`; the name is PRODUCED in
  `tools/replay.mjs` (assigned :1497, :1868, :2774). Renaming only the consumer
  breaks the read silently — the exact failure this repo's dependents-search
  convention exists to prevent, and the lane cited that convention as its reason.
  **The real dependents set, searched rather than inferred**
  (`grep -rn rebilledBytes`, excluding `node_modules`, `.git` and `BACKLOG.md`):
  **65 sites across 10 files** — `tools/replay.mjs` 17, `test/gate-live.test.mjs`
  11, `test/replay-gate-selfcheck.test.mjs` 9, `test/mitigation-output-form.test.mjs`
  7, `tools/gate-live.mjs` 3, `tools/fixture-verdict-identity.mjs` 3,
  `test/fixture-verdict-identity.test.mjs` 2, `test/replay-edit-anchor.test.mjs` 1,
  `test/insertion-suppression.test.mjs` 1. A boundary of "gate-live and its
  tests" covered 14 of 65.
  Decision: ONE lane over all ten files, not a re-split — a symbol rename that
  lands in two commits is a broken read between them.
  **The general defect, which is the part worth keeping:** an entry's backticked
  file citations are a FLOOR, not a boundary. This backlog's own merge entry
  says so in writing — it is why the 36/11 tooling count is recorded as a floor
  — and I derived a write boundary from those citations anyway, one entry later.
  The mechanical fix is cheap and is now the rule for any rename dispatch: grep
  the entry's key SYMBOL and use the hit set as the boundary, never the entry's
  prose citations.
  Original entry follows.
- **RECORD (ex-READY 2026-08-11) (small) — `rebilledBytes` still emits the understated number under
  the intuitive NAME, while the corrected figure hides behind a longer one.**
  Booked 2026-08-08 as the named residual of the fix above. The lane added
  `rebilledBreakpointBytes` / `savedBreakpointBytes` alongside and left
  `rebilledBytes` / `savedBytes` untouched — correct as a conservative change
  that breaks no consumer, and it leaves the misleading half in the position a
  reader reaches for first.
  Measured on the worked example (s-captureAM, n=265->266): `rebilledBytes` =
  **114,653**, `rebilledBreakpointBytes` = **884,858**, the latter
  independently verified equal to the sum of all 291 messages in the raw
  capture. That is a **7.7x** spread between two fields whose names differ by
  one word — and note the parent entry's own headline said 2.6x, so the entry
  under-stated its own defect and the fix's measurement corrected it.
  **Why a naming change rather than leaving both:** every cost figure in this
  repo is assembled by a reader choosing a field, and the field named
  `rebilledBytes` is the one they will choose. Design, decided: rename the
  divergence-based field to `rebilledSuffixBytes` — which is what it actually
  measures, the suffix from the divergence — so neither name is the obvious
  default and the reader has to say which they mean. Do NOT delete it: it is
  the right number for "how much of the tail changed", a different question
  from what the cache re-bills.
  This is a value-set change others depend on, so it lands with its DEPENDENTS
  SEARCH stated — command and hits — in the same commit: `rebilledBytes` and
  `savedBytes` are read by `gate-live.mjs`, the status file's row schema, and
  anything consuming `replay.mjs --json`. A rename that misses one of those
  breaks silently, which is the class this repo's convention exists for.
  Verifier: the search's own hits, all updated, plus the suite green.
  <!-- entry: "rebilledBytes still emits the understated number under the intuitive NAME" -->

- **RECORD (ex-READY 2026-08-11) — bucket (d) of the XDG accounting: 65 measured instances still
  telling readers the proxy writes under `~/.claude`.** Booked 2026-08-08 with
  the list ITEMISED here rather than left in a scratchpad, because a dispatch
  was in flight against it and its input had no durable carrier — if that lane
  had died the work would have been lost with the message that described it.
  **The in-flight lane was STOPPED at session close and its work DISCARDED** —
  twelve files edited, nothing committed, so there was no verified artifact to
  salvage and no report to book. Recorded rather than hidden: the cost was that
  lane's time, and the reason it cost nothing more is that this list is in the
  file. A worktree of half-finished uncommitted edits carried across a session
  boundary is worse than redoing it — the next session would find modifications
  with no owner and no verification, and might trust them.
  **The list, by write-set, so it can be split or run whole:**
  (1) SOURCE COMMENTS contradicting their own module, 14 — each file imports and
  calls `statePath`/`dataPath`: `proxy/extensions/prefix-diff.mjs:5,11,954,957`
  (`:954` is an `@param` default), `upstream-change-detection.mjs:8,10`,
  `bootstrap-defense.mjs:156`, `overage-warning.mjs:7`, `proxy/server.mjs:13`,
  `proxy/oauth/events.mjs:2`, `proxy/session-mirror-writer.mjs:7`,
  `usage-log.mjs:1`, `upstream-error-log.mjs:2`, `rate-limit-log.mjs:1`.
  (2) THE CONTRACT SENTENCE, `proxy/session-mirror-writer.mjs:8-9`: "established
  convention is all proxy artifacts live under `~/.claude/` per Fable round 1 B5
  finding", four lines under `import { statePath }`. Not a stale path — a stated
  project CONVENTION that is false and will regenerate the class in the next
  artifact someone writes. Fix this one even if nothing else on the list gets
  done.
  (3) `README.ko.md`, 7 — never swept by either doc lane, both of whose file
  lists named `README.md` and `README.zh.md` from memory. `:128` claims ALL
  telemetry is written under `~/.claude/`; also `:42`, `:205` x3, `:301` x2.
  `:249` is CORRECT (inside a migration blockquote) and stays.
  (4) `docs/runbooks/runtime-anomaly.md`, 5 — `:35` says five extensions log
  under `~/.claude/` directly above a table whose rows are XDG-relative; plus
  `:68,69,71,104`.
  (5) `tools/`, 16 — `usage-to-dashboard-ndjson` x4, `cost-report` x3,
  `cache_analysis.py` x2, one each in `bust-triage`, `cold-events`,
  `quota-analysis`, `reminder-migration-census`, `replay`,
  `sim-session-budget-breaker`, `test-config-root`. `test/`, 3 —
  `harvest-pin:232`, `proxy-session-budget-breaker:47`, and
  `proxy-rate-limit-log:306` which is a wrong ASSERT MESSAGE (fix the message,
  never the assertion).
  **MUST NOT be "fixed":** Claude Code's own config root (`settings.json`,
  `hooks/`, `projects/`, `.credentials.json`, `.oauth_refresh.lock`), and
  `docs/dashboard-integration.md:34,44` which are fgrosswig's dashboard's own
  default, attributed in the text.
  **`BACKLOG.md`'s 19 hits are excluded** — mostly historical narrative in
  entries describing what the paths WERE; the counting lane flagged 19 as a
  conservative over-count it did not adjudicate.
  Done-criterion: re-run the accounting (classifier preserved at
  `docs/directives/` or rebuilt per the method in `docs/dev-loop.md`) and reach
  bucket (d) = 0, or itemise each survivor with the reason. DEPLOYMENT-COUPLED:
  `proxy/` changes move the tree hash, needing a dotfiles pin bump and restart.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Three cited paths moved under proxy/extensions/: usage-log.mjs,
  upstream-error-log.mjs, rate-limit-log.mjs. session-mirror-writer.mjs's
  contract sentence is now at lines 7-9, not 8-9. The core defect (stale
  ~/.claude comments) is unfixed and the entry stands.
- **RECORD (ex-READY 2026-08-11) (small) — `lintCitations` can READ only 3% of the citations it
  checks, and nothing in its output says so twice.** Split out 2026-08-10 from
  the citation entry at its closure, deliberately as its own bullet rather than
  as a tail on a DONE body — burying it there is the exact late-correction
  defect the same bundle just measured 16 times.
  Measured: 74 citations checked, MATCH 2, DRIFTED 0, BROKEN-PATH 0,
  COULD-NOT-CHECK 72. The check anchors on a tight cite-then-quote idiom
  (`path:line` immediately followed by the quoted expression) and most
  citations in this file do not use it. The COULD-NOT-CHECK bucket is why the
  limit is visible at all; the risk is a later reader summarising the run as
  "0 drifted".
  Design, undecided — this is the open question, not a settled plan: raise reach
  by adding a second anchoring idiom, or by a convention that new citations
  adopt the tight form. Neither is chosen.
  Verifier, BOTH halves required: MATCH+DRIFTED rises AND false-fires stay at
  zero. Not one or the other — a looser anchor buys reach by inventing pairings,
  and that failure is already measured here at 20 false DRIFTED in the check's
  own first draft.
  Consumer tier **3 (backlog and process)**.

- **RECORD (ex-READY 2026-08-11) (small) — dispose of the 16 late corrections `lintCorrectionPlacement`
  found.** Split out 2026-08-10 from the correction-placement entry at its
  closure. The check is built and its class is proven; what is open is the
  16 named entries themselves — each carries a correction below its own head, so
  each contradicts itself for anyone who stops at the header.
  Per entry, one of two dispositions: fold the correction into the entry's head,
  or establish that this one is legitimately tail-shaped and say why. The
  positions run 56%-95% into their entries, so none is marginal.
  This is a BATCH candidate by construction — 16 items, one file, no shared
  design decision between them, and the lane that takes it dispositions all 16
  by number.
  Verifier: re-run `node tools/backlog-lint.mjs`; the correction lane's count
  falls by the number folded, and every entry not folded is named with its
  reason. A count that falls further than the number folded means a correction
  was deleted rather than moved, which is the failure to watch for.
  Consumer tier **3 (backlog and process)**.

- **RECORD (ex-READY 2026-08-11) (small) — a backlog entry that cites `file:line` has no check that
  the line still holds what it quotes, and citations outlived their source six
  times in one session.** Measured 2026-08-10 across the retirement pass and
  the attribution grade: the `capturePairResult` entry cited
  `tools/bust-triage.mjs:749` and `:760`; `28d5022` inserted the attribution
  section above both and they silently became `:754` and `:765`. That entry
  survived only because it QUOTED the expression beside each number — a bare
  `:749` now points at an unrelated line that still reads as a plausible site,
  which is the silent direction. Same class as the stale line index, the
  shifted ordinals and the live-anchored test assertions this session also
  produced: a derived view outliving its source.
  Design, decided: extend `tools/backlog-lint.mjs` with a CITATION check over
  `## Open` — for every `path:line` token whose entry also quotes a backticked
  expression within the following two lines, read that line of that file and
  compare. Reuse `backlog-neighbours`'s `citedPath` for the split rather than a
  second regex; that function exists because this exact namespace confusion
  already cost a silent zero-candidate run.
  Reach requirement, measured 2026-08-10: the check must also catch the BARE
  continuation form (`` `:760` `` on its own, meaning "the same file, line
  760"), not only the full `path:line` token. A `grep -o` for
  `tools/bust-triage.mjs:[0-9]*` over this file found four citations and
  MISSED every bare one — including the two that were actually stale. An
  instrument that under-reports exactly where entries are most compact is the
  zero-hit-read-as-absence shape, so the bare form is part of the scope, not
  a follow-up. Resolve a bare `:NNN` against the nearest preceding full path
  citation in the same entry.
  SCOPE: `## Open` only. `## Done` citations are historical records of the
  state at closing time and must NOT be rewritten — one drifted example is
  already in there (`tools/bust-triage.mjs:553` for `stateKeyFlip`, now at
  `:557`), and correcting it would falsify the record it exists to keep.
  FOUR answers, never two — and the count is four because dry-running the
  criterion split one of them (below): MATCH; DRIFTED — the quoted expression
  is elsewhere in the file, reported WITH its new line number, which makes the
  report a patch rather than a complaint; BROKEN-PATH — the cited file does not
  exist; COULD-NOT-CHECK — line past EOF, or no quoted expression to anchor
  on — naming which check failed. A citation
  with no quoted expression is COULD-NOT-CHECK by construction and never a
  pass — the whole point is that a bare number cannot be validated.
  **Correction to this design, 2026-08-10, found by dry-running it:** an
  ABSENT FILE is its own finding (BROKEN-PATH), NOT a COULD-NOT-CHECK. The
  first draft above filed it under could-not-check, which would have swallowed
  a real positive silently — the exact failure mode the three-answer rule
  exists to prevent, written into the criterion itself. Caught because the
  criterion was dry-run against cases already in hand rather than booked
  unexercised. COULD-NOT-CHECK keeps only: line past EOF, and no quoted
  expression to anchor on.
  **Dry run over `## Open`, the instrument-positive for this entry** (same
  day, 33 distinct `path:line` citations resolved against their files):
  1 BROKEN-PATH — `proxy/extensions/session-mirror-writer.mjs:8-9`, where no
  `extensions/` copy exists and the real file is `proxy/session-mirror-writer.mjs`
  (lines 8-9 correct there). That one is load-bearing: the entry citing it
  argues the XDG relocation REVERSES upstream's stated design rather than
  adding a missing convention, which sets the whole upstream-PR strategy. The
  substantive claim survived the check — the sentence is byte-identical in
  `upstream/main` at those lines, verified by `diff` — so the defect was the
  path alone, corrected in place. That is the shape this check is for: a
  citation wrong in a way that leaves every sentence around it true.
  Verifier, red-first, against a FROZEN reference so the case cannot decay the
  way `3acdcd5` had to repair: run the check over the pre-correction backlog
  (`git show <the commit before today's correction>:BACKLOG.md`) against
  today's `tools/bust-triage.mjs` — it must report DRIFTED with 749 -> 754.
  Control: the same run over the corrected text must report MATCH, and an entry
  citing a line that never moved must not fire.
  Done when the check runs inside `backlog-lint`'s existing pass (no new entry
  point) and its drift report names the corrected line number.
  Write boundary: `tools/backlog-lint.mjs`, `test/backlog-lint.test.mjs`.

- **RECORD (ex-READY 2026-08-11) — a derived VIEW of this backlog outlives its source within one
  session, three times measured in one afternoon, and every consumer of it reads
  the wrong bytes silently.** Measured 2026-08-10 during the retirement pass, by
  the session that built the views: (1) a line-number index generated at
  `8e58988` was read after a commit that inserted 34 lines, and six entries came
  back as the WRONG entries — the tell was a bullet rendering as `PARKED` where a
  `READY` was expected, i.e. it was caught by luck, not by a check; (2) after
  eight entries left `## Open`, the ORDINALS shifted, so a lane's `n=61` and the
  desk's `n=61` named different entries — resolved only by mapping through header
  TEXT; (3) a disposition script captured bullet positions before later
  insertions moved them and mangled the file, caught by a conservation check and
  restored from HEAD.
  All three are one class and it is already named in `docs/dev-loop.md` ("two
  coordinate spaces that look like one", "paraphrases drift ... constructed at
  read time as a partial or transformed view"). What the day adds is that the
  view here is generated by the session itself, minutes before use, which is
  precisely when it feels safest.
  Design, decided: the index stops being a throwaway and becomes
  `tools/backlog-index.mjs` — the third re-paste of the same twelve lines is the
  graduation trigger this repo already writes down. It emits per READY entry a
  STABLE identity that survives both insertion and removal (the header line's
  content hash), alongside the volatile `n`/`startLine`/`endLine`, and it stamps
  the file with the `git rev-parse HEAD:BACKLOG.md` blob it was built from. Any
  consumer re-checks that blob before trusting a line number and re-derives on
  mismatch. Dispatch briefs cite the stable id, never the ordinal — which is what
  would have made lane C's `n=61` unambiguous.
  Verifier, red-first over an immutable reference: build the index at `8e58988`,
  then read entry ordinals 50 and 61 against HEAD `f3980db` — the ordinals must
  resolve to DIFFERENT headers (the defect, reproducible forever), while the
  content-hash ids must resolve to the same two entries in both. Done when a
  stale index fails loudly instead of returning a plausible wrong entry.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation, but it corrupted three separate readings in
  one session. Unranked (booked after the derivation).

- **RECORD (ex-READY 2026-08-11) 2026-08-07 — the READY count every session reads at startup is 66
  where 57 exist, and 6 further READY items sit outside the ranking carrier
  entirely.** Two halves of one reach failure — the reader and the writer, per
  dev-loop's standing question.
  **Reader.** `session-scan.py:29` (dotfiles) defines a bullet as READY "when
  the literal 'READY' appears anywhere in the bullet's own text". Measured
  2026-08-07 over this file: 114 top-level bullets under `## Open`, **66** match
  the hook's rule, **57** begin `- **READY`. The nine extras are two bullets
  marked **DONE**, plus PARTLY DONE, BUST, HANDOFF, GATE-RED and two FINDING
  bullets — each merely mentions READY in its body. So the startup line a fresh
  context reads over-reports the unbuilt-actionable queue by 16%, and the
  `## Build order` block's own rule ("a finished item must not hold a rank") is
  broken by the COUNTER rather than by the list. Not a hidden bug: the docstring
  states the rule as intended, which is why it survived — a definition that
  over-fires reads as deliberate.
  **Writer.** Six `- **READY` bullets sit BELOW `## Open`'s end (line 4253),
  under `## Upstream PR round`. File order is the ranking carrier
  (`tools/backlog-order.mjs`) and the hook reads `## Open` only, so those six
  are unrankable and invisible by construction — and nothing stops the next one
  from landing there. Fixing only the predicate leaves the generator running.
  **Why this ranks as an instrument defect, not a gap:** the count is consumed
  at every session start, and it is an input to the build-order derivation
  itself — the ranking reads a population that includes finished work.
  **Third instance, measured 2026-08-10 — and this one IS the derivation's
  own input.** The `## Build order` block written by the retirement pass
  states its population as "the **86** `- **READY` bullets under `## Open`".
  Counted at that same commit with the header test this entry prescribes
  (`awk '/^## Done/{exit} /^- \*\*READY/{c++}'`): **91**. The pass's
  arithmetic (92 -> 83 after eight retirements and a merge, +3 booked) was
  carried in prose and never checked against the file it describes, so a
  count reached a delivered artifact that the artifact's own source refutes.
  This is why the reader fix alone is insufficient: a count nobody recomputes
  from the file drifts wherever it is written down, and the build-order block
  is the highest-leverage place for it to be wrong.
  Design, both halves. *Reader* (dotfiles repo; booked there too — this entry is
  the fork-side record): the predicate becomes a HEADER test, the bullet's first
  line matching `^- \*\*READY\b`, which is the grade-marker convention the file
  actually uses. *Writer* (here): the six are moved into `## Open` or re-graded,
  and `tools/backlog-lint.mjs` gains a check that no `- **READY` or
  `- **PARKED` bullet exists outside `## Open`.
  Verifier, red-first, two bites: the lint bite fails on the file as it stands
  (6 offenders) and passes after the move; and `session-scan.py --test` gains a
  fixture bullet reading `- **DONE 2026-08-06 … supersedes the READY entry
  above`, which must NOT be counted — today it is, and that is the red.
  Done when: both bites go red first and green after, and the injected startup
  count equals `grep -c '^- \*\*READY' BACKLOG.md`.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Reader half FIXED (session-scan.py now matches READY by header line, with a
  regression test); WRITER half still open — 5 `- **READY` bullets sit outside
  `## Open` under `## Upstream PR round`, whole-file 97 vs section 92, and no
  backlog-lint guard exists. Also: phase 1 of this pass identified a SECOND
  writer mechanism this entry never named — five bullets reading `-
  **(shipped) READY`, invisible to a `^- \*\*READY` grep but counted by the
  hook's substring rule. They are now in `## Done`. See the merge note: this
  entry and the NARRATIVE-grade-token entry are one defect.
  **MERGED 2026-08-10 by the retirement pass — this entry ABSORBS the
  narrative-grade-token entry, because the pass proved them one defect with
  one verifier.** The other entry's writer half (nothing stops a bullet
  opening with a story instead of a grade) and this entry's writer half (READY
  bullets outside the ranking carrier) are the same failure: the GRADE MARKER
  in a bullet's first token is the only thing every consumer reads, and
  nothing enforces its vocabulary. The pass added a THIRD variant neither
  entry named — five bullets reading `- **(shipped) READY`, which a `^-
  \*\*READY` grep misses while the hook's substring rule counts them, so the
  two known counters disagreed in OPPOSITE directions on the same five
  bullets. Merged design, one check in `tools/backlog-lint.mjs`: every
  top-level bullet's first token must come from a closed grade vocabulary, and
  no bullet carrying a READY grade may sit outside `## Open`. Red-first on
  three real positives now permanently available in `## Done` at this commit
  rather than on planted cases — the nine substring-only extras, the five
  outside-`## Open` bullets, and the five `(shipped) READY` bullets. Done when
  `backlog-lint` fails on each of the three and the SessionStart count equals
  `grep -c '^- \*\*READY'` over `## Open`.
- **RECORD (ex-READY 2026-08-11) (small) — the closure convention mints a SECOND bullet and leaves the
  first graded READY, so a closed item is counted OPEN forever; six were live in
  this file today.** The WRITER half of the grade-marker entry above, and a
  mechanism that entry never named. A closure is booked here by PREPENDING a
  `DONE` bullet that ends "Original entry follows." and leaving the original
  bullet in place — with its `READY` grade token untouched. One work item, two
  bullets, and every consumer that counts grade tokens counts the second as open.
  Measured 2026-08-10 at `3b37ece`, red-first with its baseline stated: a probe
  over `git show 3b37ece:BACKLOG.md` (unmodified) reported **6** — the
  succession-rule slice, `cost-report` coverage, the dev-loop sibling rung,
  `absence-scan`'s allowlist line, the premise-true derivation, and
  `xdg-writer-guard`'s sweep — and over the same file after four had been
  re-graded by hand it reported **2**, so the count moved by exactly the four
  changed. The probe discriminates rather than returning a constant, which a
  single non-zero run could not have shown.
  **What it costs, measured rather than argued:** all six were closed by lanes
  earlier the same day, and four were still carried as live members of the lane
  plan derived hours afterwards. The bill is a lane dispatched against work
  already finished.
  **What put it out of reach, and it is still running:** nothing re-grades the
  original bullet, and the booking session cannot see the drift, because the
  `DONE` bullet it has just written reads as the closure. The reader-side fix in
  the entry above (a header test on the first token) makes the count honest
  about the TOKEN; it cannot see that two bullets are one item.
  Design, decided: `tools/backlog-lint.mjs` gains a check — a top-level bullet
  graded `DONE` or `RESOLVED` whose body matches `/Original (entry|body)
  follows/i` and whose IMMEDIATELY FOLLOWING top-level bullet still carries a
  `READY` grade is a finding, naming both line numbers. Blocking, not advisory.
  The one false-fire class is a genuine RE-SCOPE, and the predicate cannot see
  it: a re-scope prepend carries a `READY` grade itself (two live examples in
  this file, the `rebilledBytes` and `local-stamp` pairs), so keying on the
  PREPEND's grade is what separates a closure from a re-scope. That is the
  declared exemption the guard itself verifies, not a softened predicate.
  Verifier, red-first with its baseline, anchored to an IMMUTABLE reference so
  the arrangement cannot decay into a false green: run the check over
  `git show 3b37ece:BACKLOG.md` — it must name exactly the six pairs above — and
  over the tree at the commit closing this entry, where it must report zero. A
  commit range, never a working copy.
  Realizing file: `tools/backlog-lint.mjs`, `test/backlog-lint*.test.mjs`.
  Consumer tier **3 (backlog and process)**. Loop stage: none directly — it
  repairs the machinery every other stage is scheduled from.

- **RECORD (ex-READY 2026-08-11) (small) — the census cannot see OUR OWN pipeline rotating the
  conversation identity, which is the one thing it would have to see to catch
  row 26 automatically.** Booked 2026-08-10, straight out of the state-key
  attribution below, and it is the closing gate's questions 1 and 3 answered
  together: the rotation was found by a hand replay of the pre-395 pipeline in
  a scratch state dir, and a class found by hand is a class the census should
  emit. Today nothing compares the two identities at all — `replay.mjs`
  computes `conversationOf` on ONE snapshot and never asks whether our own
  extensions moved it.
  Design, decided: a census class `identityRotation`, emitted per request when
  `conversationSubKey` over the RAW captured body differs from the same
  function over the body as it reaches order 395. `replay.mjs` already runs
  the real pipeline over recorded traffic, so both snapshots are in hand at the
  point the census runs; nothing new needs replaying — they are already on
  every compact entry as `inHash` (raw) and `outHash` (forwarded), built by
  the same `sha(JSON.stringify(m))` primitive on both sides
  (`replay.mjs:876`, `:898`).
  **The predicate is the cache_control-STRIPPED twins, and getting this wrong
  is how the class would ship firing on non-defects.** Use
  `inHashNoCC[0] !== outHashNoCC[0]`, not `inHash[0] !== outHash[0]`. The
  proxy's real key function strips `cache_control` per block before hashing
  (`message-hash.mjs:16-24`, via `hashMessageContent`), so a moved BREAKPOINT
  changes `inHash[0]` while changing the actual conversation identity not at
  all — and breakpoints move constantly. The stripped twins already exist for
  a neighbouring reason (`inHashNoCC` at `:885`, `outHashNoCC` just after
  `:898`), so this costs an index, not a mechanism. Named caveat, not to be
  papered over: `stripCacheControlDeep` and `hashMessageContent`'s per-block
  strip are two implementations of one intent and have not been shown
  equivalent — so the bite set carries a constructed cache_control-ONLY
  difference that must NOT classify, which is the case that would expose a
  divergence between them. A rotation is not by
  itself a defect (it is row 26's precondition, and eleven of row 26's twelve
  measured rotations cost nothing), so this ships as a CLASS and a count, never
  as a gate failure — a check firing on a non-defect trains the override reflex
  that kills it.
  Verifier, red-first, with a live known positive rather than a constructed
  one: over capture `s-captureAT`, the request at 2026-08-08T09:58:50.626Z must
  classify `identityRotation` (raw `496b188f5f435920` -> post-pipeline
  `a20843f8616f3866`, both verified twice on 2026-08-10), while the request at
  09:58:46.362Z — same conversation, same session, 4 s earlier, untouched by
  `fresh-session-sort` — must NOT. That neighbouring negative is what stops the
  class being a counter that fires on everything. RED against the old
  implementation is that the class does not exist and the two requests are
  indistinguishable to every census output today.
  Done-criterion: the class is emitted, the positive/negative pair above is
  reproduced in a bite, and the count appears in the daily sweep so the class's
  RATE becomes observable instead of anecdotal — the rate is exactly what row
  26 says this corpus cannot currently estimate.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **1 (event disposition)**.

- **RECORD (ex-READY 2026-08-11) (small) — the new tools-decision instrument is CAPTURE-BOUND, so it
  answers only while the evidence it needs is still on disk.** Surfaced by the
  lane's own deviation slot (`6fc397d`): the decision reaches
  `ctx.meta.deferredToolRewriteStats` and the `findToolsDeltas` census row, and
  `appendTelemetry` was deliberately left untouched to keep the diff inside
  "no behaviour change". Correct for that dispatch, and it leaves a hole.
  **Why it matters is `docs/dev-loop.md`'s question 2, the RECURRING-producer
  corollary:** a mechanism that produces findings forever satisfies the
  evidence question in its own machinery or not at all — "a human can re-run it
  later" is not an answer while the inputs expire. Reading this decision today
  requires REPLAYING a capture, and captures rotate on a quadratic clock with
  oldest-mtime-first eviction. The JSONL telemetry outlives them. So for any
  bust older than the retention window the question this instrument was built
  to answer is once again unanswerable — the exact shape the absorption check
  hit on 2026-08-05, when 3 of the 12 captures behind its first 50 rows were
  evicted within hours of shipping.
  Design, decided: `appendTelemetry` carries the same two fields the census row
  now carries (`announcedNames`, `passthrough`), written at the moment the
  decision is made. Telemetry already has a `suppressed` flag covering one of
  the two pass-through reasons, so the addition is the second reason plus the
  announced list — not a new record type.
  Verifier, red-first: a request that announces new tools must leave a
  telemetry line naming them, checkable WITHOUT any capture present. Today no
  such line exists — that absence is the red. Control: a request with no tools
  delta writes the empty form rather than omitting the fields, keeping "decided
  nothing" distinct from "never ran", the same distinction the census row
  already preserves.
  Done-criterion: the 2026-08-10 decision is recoverable from telemetry alone
  after its capture is gone.
  Write boundary: `proxy/extensions/deferred-tool-rewrite.mjs`, its tests.
  Touches `proxy/` — pin bump and restart ride along, and the restart is
  cache-transparent (no state keys, no freeze logic).

- **RECORD (ex-READY 2026-08-11) (small) — the matrix datapoint convention's COMPUTABLE half: a table
  cell over N chars, or one carrying a date-stamped addendum, is a finding.**
  Carved out 2026-08-08 at dispatch time, not deferred by judgment: the check
  belongs in `tools/bust-triage.mjs` beside the existing `--lint-matrix`, and
  that file was being edited by the `mkdtemp` lane in the same window, so
  building it concurrently would have collided. The prose half — the convention
  in the matrix header — shipped separately.
  Design, unchanged from the parent entry: red-first on row 24 at the commit
  BEFORE the retraction (the cell then held a dated addendum contradicting its
  own body), and SILENT on rows whose walks live in datapoint sections — which
  is most of them, and is what keeps the check from firing on the whole table.
  **PROBE THE RED-FIRST ARRANGEMENT BEFORE BRIEFING IT.** The building lane
  flagged that it did not check whether that commit is still reachable or
  whether the cell there really holds the contradicting addendum — and booked
  verifiers have now decayed twice this week in this repo. One command settles
  it; do it first.
  **Implementation notes from the lane that wrote the prose half**, so the next
  one does not re-derive them: `splitRowCells` already exists in
  `tools/bust-triage.mjs` and `matrixRow` sits beside it at `:740`; the status
  truncation is `:751`; row 24's cell is 13,161 chars, which is the outlier to
  threshold against; and a date-stamped addendum inside a cell is a
  `20\d\d-\d\d-\d\d` match in the status cell.
  **A SECOND computable case, now that the convention names it:** an
  `## Event walk` section that names no numbered row is unreachable to
  `causeToRow` (which indexes numbered rows only, `bust-triage.mjs:912` and the
  comment at `:934`). Three such walks exist today — the `2026-08-07 09:52:42Z`,
  `2026-08-07 01:00:55Z` and `2026-07-31` ones. That is a real red-first
  arrangement sitting in the file right now, and it is stronger than the row-24
  one because it cannot decay: the walks are committed history.
  That silence half is the load-bearing one: a lint that flags every long cell
  trains the override reflex the convention exists to prevent.

- **RECORD (ex-READY 2026-08-11) — the threat matrix has a datapoint-section form and yesterday's
  addendum was appended INTO the table cell instead, which is how a cell came
  to contradict itself.** Row 24's cell carries a 2026-08-02 measurement
  ("mid-session corpus edits are FREE, only the resume pays", 246 requests) and,
  a few hundred words later, a 2026-08-06 addendum asserting the opposite as
  "the operator-facing half this row had not stated". Retracted 2026-08-07 on
  re-measurement. The mechanism is structural, not carelessness: the cell is
  thousands of words in ONE table cell, so an author appending to it does not
  read it first, and `matrixRow` truncates the status at 260 chars, so no
  reader sees the conflict either.
  **The form already exists and was not used.** Rows 3, 4 and 24 all carry
  `### Row N datapoint — <date>: <finding>` sections BELOW the table, which are
  readable, diffable, and where every other walk this week landed. The
  2026-08-06 addendum is the one that went into the cell.
  Design: state the convention in the matrix header — a walk's findings land as
  a dated datapoint section; the CELL carries only the row's current status and
  disposition — and add a `tools/` check for the computable half: a table cell
  over N chars, or one containing a date-stamped addendum, is a finding.
  Verifier, red-first: red on row 24 at the commit before the retraction (the
  cell then held a dated addendum contradicting its own body), and SILENT on
  rows whose walks live in datapoint sections — which is most of them, and is
  what keeps the check from firing on the whole table.

- **RECORD (ex-READY 2026-08-11) (BLOCKING, rides with the hold above on the same two-plus-three unintegrated commits) — a pairing predicate GAINED two outcomes, three pre-existing tests were adjusted to match, and nobody has asked which outcome every OTHER fixture now exercises.** Booked 2026-08-10 at grading, before integration.
  **The reported half.** The lane added a lineage fallback and a cross-conversation fallback to `capturePairResult`, which changes what "no pair found" MEANS. Three pre-existing tests then needed fixture adjustments, and the lane says each is a confirmed real behaviour shift rather than a masked regression. That claim may well be right. It is also the single most dangerous slot in any lane report: a red arriving for a reason nobody planted is a finding about the ARTIFACT, and repairing the test to restore the expected result is how a live finding becomes a silenced instrument. Three at once earns a desk read of each diff against the definition of the invariant, not against the new implementation — the expectation's parentage is the whole question.
  **The UNREPORTED half, which is the one that worries me more.** When a predicate gains a value, a fixture written under the old two-valued version does not FAIL under the new one — it stops testing, silently, by routing through a branch it was never written for. The three that went red announced themselves. The population that did not go red is unexamined, and it is larger. The primary same-`cid` search is unchanged, so most fixtures should still take stage one — but "should" is the word this repo collects, and nothing has measured it.
  Design, decided, and it is cheap because the instrument already exists: have the pairing path report WHICH stage returned the pair (primary / lineage / crossConversation), then run the suite and take the per-stage distribution. Any fixture landing in a fallback stage that was written before the fallbacks existed is a case that changed meaning without changing colour. The distribution is the deliverable; a count alone is not, since a count cannot say which fixture moved.
  Verifier, both directions: the three adjusted tests each name the stage they now exercise and the stage they exercised before; and the whole suite's per-stage distribution is recorded at this commit, so the next change to the pairing rule has a baseline to diff instead of an impression. Red-first is available for free — the pre-fallback blob is one `git checkout <sha> -- <file>` away, and the distribution over the old code is the baseline the new one is compared against.
  Realizing write-boundary: `tools/bust-triage.mjs` + `test/bust-triage-*` (the same set as the held commits — do this in the same integration, not as a follow-up, or the baseline is gone). Consumer tier **1 (event disposition)**.

- **RECORD (ex-READY 2026-08-11) (BLOCKING on two unintegrated commits) — the bust-triage lane shipped two checks whose motivating cases had already ROTATED OUT, and substituted synthetic reproductions; this repo's own rule forbids exactly that.** Caught at the desk 2026-08-10 while grading the lane's report, BEFORE integration — nothing has been cherry-picked, so this is a decision, not a repair.
  **What the lane did, and it reported it honestly rather than hiding it.** For its members 2 and 3 it re-read the premises first and found each entry's named live verifier gone: one entry's capture absent with no fixture ever frozen, and the other's two named `--at` verifiers both answering capture-absent. It then built each design against a SYNTHETIC reproduction, citing this repo's snapshot-what-proves-a-finding convention.
  **Why that is the wrong convention to reach for.** `docs/dev-loop.md` states the governing one directly: a check whose motivating case dissolves does NOT get a substitute case found for it — it does not ship, because it would ship having never gone red on a real defect. Tuning an instrument until it fires on a constructed stand-in is how a check ratifies its own premise, and both of these checks now have a green that certifies the construction rather than the class. The lane's red-first arrangements are real and correctly run; the objection is to what they were run AGAINST.
  **Scale, because this is now a class and not an incident.** SIX entries in one day were found with dead calibration evidence — corrected upward at close from the lane's own final accounting, which reported 4 of its 8 members carrying evidence already rotated out, against the 2 the read-only evidence lane could not execute at all. The count was understated by a third when first booked, an hour after the class was named, which is the ordinary way a rate gets under-read: each lane sees only its own members. A fifth is still alive and being pinned. The rate is what makes the sibling entry above (a booked verifier naming a live capture with nothing pinning it) a tier-1 concern rather than housekeeping.
  Decision owed, and it is the desk's, not a lane's: for each of the two commits, either (a) hold it unintegrated until a fresh LIVE occurrence of its class is captured, pinned and used as the red — the rule's literal reading, and the reason it exists; or (b) integrate it with the check explicitly LABELLED as synthetic-only in its own test header, plus a booked trigger to re-red it on the next live instance. (b) is the defensible departure only if the mechanism under test is structural rather than text-predicated, since structural classes survive the scrub and text ones provably do not — that discrimination is the deciding evidence and it has NOT been made yet for either commit.
  Verifier: whichever branch is taken, the closing record names for each of the two checks which live instance it went red on, or states that it never did and carries its re-red trigger. A check that cannot answer that question is the thing this entry is about.
  Realizing write-boundary: `BACKLOG.md` plus the two unintegrated commits on the lane's branch (desk-only; no lane may self-grade this). Consumer tier **1 (event disposition)** — these checks feed which row an event maps to.

- **RECORD (ex-READY 2026-08-11) (small) — importing a `tools/*.mjs` can execute its whole CLI as a side effect; ONE case was found and fixed by accident, and TEN files lack the guard. The discrimination that turns ten into a real count has NOT been made.** Found 2026-08-10 by the small-tools lane, which needed to import `TABLE`/`OWNERS` from `tools/xdg-migrate.mjs` and discovered the import ran a full filesystem scan and report: only `--verify` was gated, the default body was not. Fixed there by wrapping the CLI in the same `import.meta.url` entrypoint guard `tools/replay.mjs` already uses. The lane named the sibling sweep as a follow-up and correctly did not run it — out of its scope.
  **The sweep, run at the desk, with its instrument-positive FIRST so the population means something:** the known case at its pre-fix blob scores zero `import.meta.url` occurrences, so the detector demonstrably finds a real positive rather than returning an empty predicate. Over `tools/*.mjs` on the current tree it returns **ten** files with no entrypoint guard at all.
  **Why ten is NOT the finding, and this is the load-bearing part.** The defect requires a top-level side-effecting CLI BODY. A pure library module has nothing to guard and its missing guard is correct, not a bug — and several of the ten are plainly that shape by name alone (the line reader, the tmpdir helper, the suite config root, the strict log reader). Reporting ten would be the check-that-fires-on-a-non-defect this repo already collects, and it would train its reader to discount the class. The population is ten; the DEFECT COUNT is unmeasured, and anyone acting on this measures it before fixing anything.
  Design, decided: the predicate is not "lacks `import.meta.url`" but "has module-level statements with EFFECTS outside function and class declarations, and lacks the guard" — argv parsing, a filesystem read, a console write, a top-level call. Ship it as a test over `tools/*.mjs` rather than a one-off script, since a re-pasted one-liner is where the variant bug rides unexamined.
  Verifier, red-first with an immutable anchor: the check must fire on `git show 3bc6a72:tools/xdg-migrate.mjs` (the known positive, guard absent, real CLI body) and stay SILENT on the pure-library members of the same ten at the same ref. Both arms required — a check that flags every unguarded file has not distinguished the class, it has just counted files.
  Realizing write-boundary: a new `test/tools-entrypoint-guard.test.mjs`, plus whichever of the ten the measurement convicts. Consumer tier **2 (feeds the gates)** — an import with side effects corrupts whatever the importing tool then measures. Loop stage: VERIFY.

- **RECORD (ex-READY 2026-08-11) — the lane plan derived write boundaries from entry PROSE, and eight of twenty-one dispositioned members came back because the realizing file was somewhere else.** Measured 2026-08-10 across wave 1 of the backlog drain, from the lanes' own returns rather than from impression: L8 returned 5 of 9, L7 4 of 7, L4 1 of 3, L5 0 of 2 on this ground. None was a design failure and every refusal was correct.
  **The mechanism, and it is the dispatcher's rather than the lanes':** the plan grouped entries by reading their bodies and inferring which file each would land in. An entry that says what is WRONG without saying WHERE THE FIX LANDS hides its collisions until brief time, and a boundary inferred from backticked citations is a FLOOR, not a boundary — this backlog already said so in writing, and the derivation did it anyway, for the third time in one day.
  **What it cost, priced rather than asserted:** eight lane-members spent a premise re-read and a refusal instead of a build, plus one near-miss — one lane edited ten deployment-coupled extension files and a co-lane's tool before catching the breach against its own brief, and reverted before committing (desk-verified: none of its three commits carries any of those paths). A boundary the plan states wrongly is a boundary the executor discovers by walking into it.
  **This is the WRITER half of a defect whose reader half is already booked.** The lane-derivation tool booked in `406bf0e` mechanizes the JOIN — resolve each READY entry's boundary, group by connected components, WARN on boundary-less entries. That closes the derivation. It does not close this: the entries themselves still do not carry the slot, so the join has nothing to read for most of them, and the derivation-time ref scores 42 UNRESOLVED against it — MEASURED 2026-08-10 by the lane that built the tool, not the ~63 this entry first carried from the booking entry's own approximation. The tool accounts for 100/100 entries at that ref. The approximate figure was inherited rather than run, and it was wrong by half again; the measured one is the verifier target.
  Design, decided: a pass over the READY set adding the realizing write-boundary slot to every entry lacking one, taken from the entry's own design where that is unambiguous and marked UNRESOLVED where it is not — a VISIBLE unresolved is the deliverable, not a defect. It is a BACKLOG.md convention-and-content change, so it is the desk's and never a lane's.
  Verifier, red-first, anchored to an immutable ref so it cannot decay: the lane-derivation tool over the derivation-time ref reports its 42 UNRESOLVED (measured, not approximated), and over the tree at the commit closing this entry reports zero UNRESOLVED among READY entries, with the residue named per entry rather than summarised as a count.
  Realizing write-boundary: `BACKLOG.md` (desk-only). Ordering: depends on the lane-derivation tool existing first. Consumer tier **3 (backlog and process)**. Loop stage: none directly — it repairs the scheduling machinery every other stage is dispatched from.

- **RECORD (ex-READY 2026-08-11) — the inverse-direction coverage walk: an `out`/`invented`
  conservation row asks "CC never sent this in this conversation", which no
  instrument answers today.** Split out 2026-08-08 from the entry above, whose
  three-input interface (capture + forwarded dump + rows) structurally cannot
  carry it. Rows by side across the three failing captures, measured: 67 total,
  32 `in`, 35 `out` — s-captureAE 35 rows (1 `in`/suppressed-without-copy, 34
  `out`/invented), s-captureAH 31 rows (all `in`), s-captureAO 1 row
  (`out`/invented). Every `out` row needs `conversationOf` grouping over the
  conversation's whole RAW population rather than one request's forwarded
  array. Design NOT decided — this is the fork in the road that keeps it out of
  the ready grade: either `coverage-walk` grows a second mode that takes the
  capture and a conversation key, or the question belongs in `replay.mjs` where
  the grouping already exists. Verifier, red-first and available: the 35 rows
  return COULD-NOT-VERIFY today (real output: `35 row(s): COVERED=0 UNCOVERED=0
  COULD-NOT-VERIFY=35`), so any real verdict on them is a change of state.
  Until this ships, "1 REAL-LOSS" stays a FLOOR and no document may quote it as
  a bound.

- **RECORD (ex-READY 2026-08-11) — the stability exemption for a first-appearance relocation must
  assert what it does NOT currently cover: that the forwarded `tools[]` held
  across the relocation.** This is the instrument that would have caught row 26
  on the morning it fired, and its absence is why every gate was green while
  216k tokens burned. Today the exemption is granted on
  `relocated[].firstAppearance` alone (replay.mjs), which is a true statement
  about the deliberate `messages[0]` cost and says nothing about the prefix
  level ABOVE messages, where this one actually landed. Design, decided: the
  exemption gains a condition — forwarded `tools[]` byte-identical across the
  pair — and a first-appearance relocation that also flips tools is NOT
  exempt, it is a violation naming both facts. Row 25 already built
  `prefixAboveMessages` for this exact distinction; consult it rather than
  re-derive. Verifier: red-first against the live pair — the current build must
  exempt `n=166->167` and the new build must fail it, on the same input, one
  variable. Note the ordering constraint with the row-26 fix: once the key
  rotation is fixed the tools stop flipping, so this check must be demonstrated
  red BEFORE that ships, or its motivating case dissolves and it would ship
  having never gone red on a real defect. Done-criterion: the red demonstrated
  and quoted, plus a bite in `test/replay-gate-selfcheck.test.mjs` per the
  every-new-gate rule.
  **STAGE-2b RESULT 2026-08-06 evening, and the ROUTE DECIDED (dispatcher). NOT
  BUILT: zero of the 12 surviving positives would fire it.** The named live pair
  was evicted, so every first-appearance-relocation exemption still on disk was
  enumerated at HEAD's build over the serving gate set — 12 pairs, 5 captures,
  all `mcp`, all `prefixAboveMessages` fully INTACT. Full table and the
  presence-probe behind it: threat matrix row 26, addendum of the same evening
  (`8c3404e`). The condition would have shipped changing nothing, and tomorrow's
  sweep would be byte-identical — which is the finding, not a disappointment.
  **The class is live and only the COST is intermittent.** Row 26's link (c) —
  `deferred-tool-rewrite` logging `no-baseline` under the post-relocation key —
  is present at all twelve relocating requests' own millisecond. The rotation
  always fires. What the twelve never met is the SECOND condition: a frozen tools
  order held under the PRE-rotation key that disagrees with CC's passthrough
  array. That difference is the whole gap between one 216,060-token event and
  twelve free ones.
  **ROUTE: synthetic red-first, merged with the fixture row 26 already mandates.
  Decided rather than left open, with its basis.** The dev-loop rule forbidding a
  substitute case was minted about a briefed known-positive that never existed —
  an entry whose body cited no commit, i.e. an attribution error. This case
  existed, was measured to the token, and had its mechanism isolated with a
  falsification probe AND a control. The rule's purpose is to stop an instrument
  being tuned to ratify its own premise; that purpose is not engaged where the
  premise was established independently by measurement. So the fixture is not
  "a case constructed to make the check fire" — it is the durable form of a
  defect the corpus can no longer hold, and it was independently required
  already.
  **AND THE FIXTURE SPEC IS WRONG AS WRITTEN — this is the correction, and
  skipping it produces a vacuous green.** The row-26 entry specifies two requests
  "differing only by the first appearance of a skills block". That fixture
  reproduces the ROTATION and nothing else — which is exactly the state all
  twelve survivors are in, and they demonstrate that rotation alone leaves the
  forwarded `tools[]` intact. A check for the tools condition demonstrated
  against a two-request fixture would therefore pass while asserting nothing, the
  same shape as every other vacuous green this repo has collected. The merged
  fixture needs THREE or more requests: enough leading traffic for
  `deferred-tool-rewrite` to FREEZE a tools order under the pre-rotation key that
  differs from CC's passthrough array, and only then the relocating request. One
  fixture then makes both assertions red against the current build — row 26's
  (the sub-key is identical across the pair) and this one's (the exemption is
  denied when the forwarded `tools[]` flips).
  The ordering constraint stands and is now cheap to honour: demonstrate this red
  before the row-26 fix ships. It is no longer ABSOLUTE, because a committed
  synthetic fixture can be replayed against the pre-fix extension by the existing
  bisection — but relying on that is archaeology, and doing it in the right order
  costs nothing.

- **RECORD (ex-READY 2026-08-11) — `replay.mjs --json` drops the census entirely, so every consumer
  has to parse its TEXT output.** Returned as a gap by the pin-verification
  lane, which hit it while building: `census.tally` and `census.examples` are
  `Map`s, and `JSON.stringify` renders a Map as `{}`. Measured:
  `node tools/replay.mjs <capture> --census --json` yields
  `{"pairs":1,"conv":2,"tally":{},"examples":{}}` — the two fields carrying the
  actual classification are empty objects, and nothing errors.
  Consequence, already paid: `verifyPin` parses replay's human-readable output
  and guards itself with an anchor check that sets `ok:false` on unreadable
  input. That guard is correct and the parsing should not have been necessary.
  Design, decided: serialize both Maps as plain objects in the `--json` path.
  **Dependents search first, and stated in the same change** — `--json` is a
  contract, and a consumer keying on the current empty `{}` (or on its absence)
  would break silently; the change lands with `grep -rn "\-\-json" tools/ test/`
  and the hits enumerated.
  **Dependent set grew 2026-08-10:** `tools/bust-triage.mjs` now spawns
  `replay.mjs --json --census` and reads `parsed.violations` (`28d5022`). It
  does not read `tally`/`examples`, so this fix cannot break it — but it is a
  new `--json` consumer the enumeration above must name, and it was surfaced
  by `backlog-neighbours`, not by the grep. Verifier, red-first: the command above must print
  populated `tally`/`examples`; control, a run with no census requested must be
  byte-identical to today. Done when `verifyPin` can drop its text parser — and
  the parser's removal is the done-criterion, not an optional follow-up, since a
  second reader of the same data is how the two drift.

- **RECORD (ex-READY 2026-08-11) — every OTHER row family in `replay.mjs` still carries only report
  ordinals, so the next consumer that goes back to the capture repeats the bug
  just fixed.** Found 2026-08-06 walking s-captureAM: the far-from-anchor
  excerpt pass keyed its asks by the census `n` and matched them against
  `readCapture`'s LINE index — 5 of 6 asks printed `(missing)`, the 6th printed
  a request 11 minutes away. Fixed for `edits` rows by carrying `id`/`prevId`
  from the capture record (`test/replay-excerpt-record-identity.test.mjs`, red
  on the shipped code). **The WRITER half is untouched**: `violations`,
  `exemptions`, `absorptionMisses`, `blockMigrations`, `relocDepartures`,
  `successions` and `mitigation` rows all still carry `n`/`prevN` and nothing
  else that joins to disk, and nothing marks them as non-joinable — so the
  hazard is intact for every future reader, which is exactly the "fix the
  reader, leave the generator" shape `docs/dev-loop.md` warns about.
  Measured rather than asserted, by dumping one key per family from a
  `--json` run over s-captureAM: `exemptions`, `absorptionMisses`, `relocDepartures`,
  `toolsDeltas`, `mitigation`, `blockMigrations`, `successions` and
  `duplicateRequests` all carry `n`/`prevN` and no id — nine families, two
  more than the first draft of this entry named. `violations` was empty on
  that capture and is unverified.
  **Update 2026-08-10:** `violations` is empty on the largest CURRENT capture
  too (`--census` reports 0 rows), so this family stays unverified from live
  data. Its `n` space was verified against disk, though, by the attribution
  lane's join: `bust-triage.mjs`'s ordinal loop (`:685-690`) and `replay.mjs`'s
  `reqN` (`:3578-3597`) agree on 5,990 records across four real captures, zero
  disagreements, instrument-positive on a planted body-less request. So for
  `violations` the ordinal IS joinable today — and the fix is still wanted,
  because nothing MARKS it joinable and the next reader re-derives that at
  their own risk. And the precedent already existed and did
  not travel: the `report` family has carried `captureId` all along.
  Design: `compactEntry` already retains `id` as of this commit; add
  `id`/`prevId` to each row family at construction, one line each.
  Verifier, and it must be the generic one rather than a second copy of the
  excerpt test: a test that asserts EVERY row family emitted by a `--json` run
  over a fixture with interleaved outcome records carries a non-null `id` for
  each ordinal it carries — red today on six of the seven families.

- **RECORD (ex-READY 2026-08-11) — the widened mutation test WENT RED on the first new real pin,
  and which side is wrong is NOT established.** Found 2026-08-06 at
  session close, by the push gate, on the first fixture added after the
  widening shipped two hours earlier. That is the widening working: under
  the old `FIXTURES[0]` behaviour this pin would have been invisible.
  The failure, verbatim: mutant (1) — "a prefix of boot+outcome records
  (verdicts never depend on either) gets fully dropped, identity holds" —
  `AssertionError: every prefix record here is inert, so the cut must drop
  all 191, not 12`.
  **Two hypotheses, and picking one without evidence is the whole trap:**
  either the cut under-drops on this shape (a real defect, assertion
  right), or the assertion encodes a property true only of the three
  fixtures it was written against — "widening a population re-grades
  assertions written for a population of one", the lane's own candidate
  lesson, landing on the very next fixture.
  **Reproduction, one move:** put
  `test/fixtures/pending-review/pinned-s-48bf252a4e02-101-122.json` back
  into `test/fixtures/harvested/` and run `npm test`. It is parked outside
  the scanned corpus so `main` stays green and the evidence survives — and
  because the directory-derived-population defect booked below means any
  file left there changes what the suite proves.
  **Do NOT resolve it by softening the assertion** (dev-loop's box: a
  guard that fires is repaired by a declared exemption the guard itself
  verifies, never a loosened predicate). Verifier: whichever hypothesis
  wins is demonstrated on the real fixture — if the cut is wrong, a bite
  red on the current implementation; if the assertion is wrong, its
  replacement still goes red on a planted under-drop.
  The pin is verified evidence for the matrix's `previous_message_not_found`
  second instance (231 records, replays green over 103 pairs), so it is
  worth keeping either way.

- **RECORD (ex-READY 2026-08-11) — the fixture-verdict mutation population is DIRECTORY-derived, so
  the suite covers a different corpus on every machine.**
  **A PARTIAL IMPLEMENTATION OF THIS ENTRY EXISTS AND IS RESCUED, origin
  unknown: `~/.local/state/cache-fix/rescued-patches/2026-08-14-fixture-verdict-identity-from-worktree-af68d602.patch`
  (2026-08-14).** 76 uncommitted lines against
  `test/fixture-verdict-identity.test.mjs`, written by neither the dispatching
  session nor the lane, found sitting in a harness-cut agent worktree that a
  reclaim would have taken with it. It implements this entry's own fix — the
  population read from `git ls-files` rather than `readdirSync`, top-level
  only, with this entry's 2026-08-06 measurement quoted in its comments. The
  patch was copied out and the worktree left untouched; nothing has been
  applied or verified. Whoever picks this entry up — including whoever wrote
  those lines — reads the patch first rather than starting over. Recorded HERE
  because a rescued file in a state directory is on nobody's read path, and
  persistence without a consumer is litter with good intentions.
  Found 2026-08-06
  immediately after integrating the widening, by an unexplained test-count
  delta: the dispatched lane measured 2200 tests in its worktree and the same
  code measured 2203 here. The difference is exactly one fixture × three
  mutants. This clone's `test/fixtures/harvested/` holds FOUR pins; git tracks
  three. The fourth is a 46 MB pin excluded in `.git/info/exclude` — deliberately
  machine-local, and picked up anyway because the test enumerates the DIRECTORY.
  So the coverage line reads `walked 4 replayable fixture(s)` here and
  `walked 3` in any other checkout, CI included, with nothing saying so.
  The widening did not introduce this — the old test took the alphabetically
  first entry of the same directory listing, which is the same defect with a
  population of one. Widening made it visible and multiplied it by the corpus
  size, which is the honest way round.
  Design, decided: the population comes from `git ls-files`, not from `readdir`
  — a tracked-file question answered by the tracking system. An untracked or
  excluded pin present in the directory is REPORTED by the coverage line
  ("3 tracked, 1 untracked ignored: <name>") rather than silently walked, so a
  local experiment cannot change what the suite proves.
  Verifier, red-first and available on this machine right now: with the 46 MB
  pin present, the current test walks 4 and must walk 3 after the change while
  naming the skipped one; on a clean checkout both walk 3. Done when the
  coverage count is a function of the repository rather than of the machine.

- **RECORD (ex-READY 2026-08-11) — the synthetic-HOME pattern is the only way to drive this repo's
  CLIs, and it is currently re-invented per test.** Credited to the dispatched
  status-enum work's candidate lesson, generalised one step: every tool here
  that matters reads `~/.claude` — the worktime ledger, the gate status file,
  the capture directory, the alias registry — and each has a CLI on top whose
  WIRING is where the defects have actually lived. Measured the same day: the
  `--at` silent substitution lived entirely in `main()`, so a resolver unit test
  passes straight over it; pointing HOME at a synthetic ledger and spawning the
  real binary is what caught it, and it also produced the strongest red
  arrangement available — new expectations against the old implementation, with
  no module-load red to mistake for discrimination.
  Design, decided: a shared test helper that builds a synthetic `~/.claude`
  (ledger, gate status, captures, aliases — each optional), yields its path, and
  tears it down; every new CLI bite drives the real binary through it instead of
  importing internals. Verifier, red-first: re-point the two existing CLI bites
  at the helper and show they still go red under their own mutations; a helper
  that silently produces an EMPTY home must fail loudly rather than yield a
  passing test over nothing — that is the "0/0 reads like clean" shape this repo
  has hit three times.
  Not blocking anything; ranked at the next derivation.

- **RECORD (ex-READY 2026-08-11) — the suggestion-mode variant fork is a census class: CC issues
  two variants of one conversation that differ at a mid-history index, and
  every consecutive-pair check compares across them.** Found 2026-08-05
  while classifying the absorption misses; 6 of the 34 rows are this, all
  on one capture. Shape, read off the raw pre-pipeline records: at the same
  array index CC sends either the real user turn or a 1,377-byte
  `[SUGGESTION MODE: Suggest what the user might naturally type next into
  Claude Code.]` instruction, alternating between requests, with identical
  `messages[0]`, system prompt, tool count and model — so `conversationOf`
  groups them and the pair (suggestion-variant, real-variant) reads as a
  prefix divergence. Nothing our mitigations could absorb: the bytes on
  both sides are CC's own, and neither variant is the other's predecessor.
  Cost, as far as it is measured: no cold event within +/-180 s of any of
  the six.
  Design, decision-complete: a `suggestionVariant` boolean on the
  absorption row, from a marker predicate over the pre-pipeline message at
  the divergence index (the instruction's leading bracket line is a
  constant CC emits verbatim) — extend `findAbsorptionMisses`, never a new
  file. Verifier, red-first: a synthetic pair whose divergence is the
  suggestion prompt asserts the flag, plus a control that an ordinary user
  turn at the same index does not set it. Done when the daily sweep counts
  the class beside `cacheControlOnly`, so the residual population is what
  is left after BOTH free classes are named.
  Named residue: the class is measured on ONE capture and one CC version;
  whether the marker text is stable across CC releases is unverified, and
  a predicate keyed to prose decays — `cc-version-normalize`'s own version
  telemetry is the join if it ever needs one.

- **RECORD (ex-READY 2026-08-11) — `backlog-order.mjs`'s anchor namespace is the whole BULLET BODY, so
  an entry that QUOTES another entry's title breaks the ranking tool.** Hit
  2026-08-06 evening, first use after the tool shipped, by ordinary work: an
  addendum written into the row-scoped-pinning entry cited the ranked-5th item
  by its title, and `--check` died with `anchor matches 2 bullets`. Reproduction
  is one line — put any ranked anchor's text inside a second bullet.
  The tool behaved CORRECTLY (`reorder`, tools/backlog-order.mjs:79-91: zero or
  multiple hits throw, nothing is written — a partially-applied order is worse
  than none), so this is not a silent defect and the loudness is the design
  working. It is the fires-on-legitimate-work shape instead: citing one entry
  from another is normal prose, and the current repair is to reword the citation,
  which trains the writer to avoid naming entries rather than to name them.
  Design, decided, and derived from the DEFINITION rather than from the current
  behaviour: an anchor identifies an entry by its TITLE, and a title is the bold
  lead of the bullet — so the match is scoped to the bullet's first line
  (`b.split("\n")[0].includes(a)`), never its body. That is a narrowing to what
  the anchor always meant, not a softened predicate: a genuine duplicate TITLE
  still throws, which is the case the guard exists for.
  Verifier, red-first and already in hand: a bite over a synthetic two-bullet
  document where bullet B's BODY quotes bullet A's title verbatim — against
  today's implementation `reorder` throws `anchor matches 2 bullets`, against the
  fix it ranks A and leaves B below; plus the preserved-guard control, two
  bullets with the same TITLE, which must still throw under both. Done-criterion:
  both bites, and `node tools/backlog-order.mjs --check` green on the real file
  with the citation restored to the wording that failed — which is NOT in git
  history (it was reworded before the commit, so no diff carries it) and is
  therefore quoted here as the reproduction input: a bullet body containing the
  string `the stability exemption for a first-appearance` + ` relocation`, split
  across two literals in this entry for exactly the reason the entry exists.

- **RECORD (ex-READY 2026-08-11) (small) — `backlog-lint` calls its own header findings advisory and
  the suite treats them as blocking, so the CLI trains its reader to walk into
  a push gate.** Measured 2026-08-06, on me: the tool printed
  `1 stale header(s) — WARN only, review BACKLOG.md` and exited **0**, I read
  "WARN only" as advisory and committed, and `test/backlog-lint.test.mjs`
  ("CLI: zero false fires on the current BACKLOG.md") failed the pre-push
  suite on the identical line. Two instruments, one predicate, opposite
  severities — and the one a human reads while writing is the lenient one.
  The trigger was a grade-claim marker (the past-tense form of "verify", in
  capitals) inside a `READY` entry's BODY, under a non-matching header —
  exactly what the lane is for, so this was a real fire and not a false one.
  Written around rather than quoted, because writing the token here fires the
  lane a second time: this entry tripped it on its own first draft. That
  self-reference is itself the missing piece — a lane with no way to talk
  about its own trigger has no exemption path, which is the declared-exemption
  shape `docs/dev-loop.md` prescribes and this lane lacks.
  Design decision belongs with the operator and is stated here rather than
  taken: either the CLI exits non-zero on a header finding (making the two
  agree, at the cost of a stricter local loop), or the WARN line names the
  consequence — "blocks the pre-push suite" — instead of the word "only".
  Recommendation: the second. It costs one string, keeps the local loop
  non-blocking for genuinely advisory classes, and the failure it prevents is
  a reader believing a severity the pipeline does not honour.
  Verifier: with a planted marker, the CLI's own output must name the gate it
  will fail, and the assertion must quote that phrase so the two cannot drift.

- **RECORD (ex-READY 2026-08-11) (counts CORRECTED WITHIN THE HOUR — the counts below are WRONG; read
  this block
  first). FORK-OWNED is 39 items / 42 occurrences; UPSTREAM-OWNED is 4 locations
  / 7 occurrences, `README.ko.md` and nothing else.** Commit `53a5adc` shipped
  the superseded numbers in its title and body; git history is immutable, so the
  correction lives here.
  **The instrument was wrong, and the distinction is the lesson.** The first
  ownership pass tested whether the COMMENT TEXT was byte-identical to
  `upstream/main`. That answers "is this prose inherited?" — a different
  question from the one that decides ownership: does the FUNCTION the claim
  describes still belong to upstream, or did this fork rewrite it? Re-tested
  against the function, every one of the 13 proxy/tools items imports
  `statePath`/`dataPath`/`xdgState` from `xdg-dirs.mjs` — a module upstream does
  not have — in the very function the comment sits above. **A byte-identical
  comment over a fork-rewritten function is a stale comment on the fork's OWN
  change, not an upstream claim.** Ambiguous after re-testing: none.
  So `session-mirror-writer.mjs:8-9`'s contract sentence is OURS to fix after
  all — we rewrote the function under it and left the sentence describing the
  old behaviour.
  **What survives the correction, unchanged:** that sentence IS byte-identical
  in `upstream/main`, and upstream's `cache-telemetry.mjs:16` really does
  `join(claudeHome(), "quota-status")`. Upstream's stated convention genuinely
  is `~/.claude`, so the PR repricing below stands on its own evidence — it
  never depended on the miscounted bucket. Both things are true at once: the
  convention is upstream's, and our stale copy of the sentence is ours.
  Scope of the authorised repair is therefore the 39 fork-owned items, and the
  verifier's guard inverts: after the repair the UPSTREAM-OWNED bucket must
  still read exactly `README.ko.md` — evidence `git log --format='%an' --
  README.ko.md` shows zero commits by this fork's operator, ever.

  **GUARD WIDENED 2026-08-08 afternoon, and as written above it had become a
  guard that PASSES WHILE THE DEFECT RETURNS.** `bbc1213` (operator decision,
  peer session) REVERTS the fork's XDG patches to `README.md` and
  `README.zh.md` — restoring upstream's `~/.claude` text in all three
  translations deliberately, measured 0 / 0 / 0 XDG claims after. So
  **all three READMEs are UPSTREAM-OWNED and EXCLUDED from this repair class**,
  not `README.ko.md` alone. The guard's authorship evidence is what made it too
  narrow: `README.ko.md` had zero fork commits, the other two had some, and the
  guard encoded AUTHORSHIP where the question is OWNERSHIP — and a revert
  changes ownership without changing authorship history. Read as written, the
  old guard would have watched the Korean file, seen it unchanged, passed, and
  let a future accounting "repair" `README.md`'s ~22 restored `~/.claude`
  mentions straight back into the divergence the operator just decided against.
  Corrected guard: after any repair, ALL THREE READMEs still carry upstream's
  text, and the XDG-claim count in each is ZERO. The trap was surfaced by the
  peer session that made the revert, which is the only place it was visible —
  from inside this entry the guard reads correct.

  Superseded text follows: **repair the 17 fork-only stale location claims. The
  other 29 are UPSTREAM'S and must not be touched, because upstream's stated
  convention IS `~/.claude`.** Accounting completed 2026-08-08 over the whole tracked tree,
  then re-classified against `upstream/main` by byte-level evidence
  (`git show upstream/main:<file> | grep -F "<exact text>"` per item, not by a
  file-ownership guess).
  Counts: **STILL-WRONG 17**, all confirmed fork-only — the file is absent from
  upstream, or the text has no upstream match.
  **RE-MEASURED 2026-08-10 (operator question: "does our design violate
  upstream?"), and the 17 above is STALE.** `node tools/xdg-writer-guard.mjs`
  is RED at 34 violations today. Partitioned by whose artifact the citation
  names: 9 cite SOMEONE ELSE'S path (`~/.claude/projects/**` = Claude Code's
  own transcripts; `anthropic-proxy-logs/` = fgrosswig's dashboard) and are
  CORRECT — that is the guard's own documented KNOWN LIMITATION, "the
  predicate has no notion of whose artifact", not a new finding. The other 25
  name OUR artifacts; of those, 3 are the guard's own explanatory header and
  at least one is a deliberate contrast (`usage-to-dashboard-ndjson.mjs:142`,
  "both defaults are XDG state paths, NOT ~/.claude"), so the true repair set
  is ~20 and is NOT yet triaged item by item.
  Spot-checked 3 of 25 against the code, stale 3 for 3 — comment vs the
  function directly under it: `proxy/server.mjs:13` says "writes to
  ~/.claude/cache-fix-debug.log" while `:25` returns `statePath("debug.log")`;
  `tools/cost-report.mjs:6` says "reads ... at ~/.claude/usage.jsonl" while
  `:32` calls `legacyReadPath(statePath('usage.jsonl'), …)`;
  `proxy/extensions/usage-log.mjs:1` says "append ... to ~/.claude/usage.jsonl"
  while the module imports `statePath`.
  **The guard is RED and BLOCKS NOTHING.** `npm test` is green at the same
  commit: `test/xdg-writer-guard.test.mjs` exercises the PREDICATE on
  synthetic content and never runs it over the real tree, so the 34 sit in a
  tool nobody's pipeline calls. Wiring it is a separate decision from the
  repair (it cannot go blocking while it over-fires on the 9 above), and it
  is exactly the shape this repo keeps re-learning: a checker that passes
  review, reports honestly, and is wired to no consumer.
 **UPSTREAM-OWNED 29 locations /
  ~32 occurrences**, confirmed byte-identical in `upstream/main` right now.
  CORRECT ~45. EXCLUDED 3 files. The headline dropped from 49 to 17 purely by
  asking who owns the file — and the earlier figure of 65 contained false
  positives too (`tools/cache_analysis.py`'s two hits re-verified CORRECT: an
  explicitly commented legacy fallback, not a stale claim).
  **The finding that outranks the counts, and it is definition-level:**
  `proxy/session-mirror-writer.mjs:8-9` carries the sentence "the
  established convention is all proxy artifacts live under `~/.claude/`" — and
  that sentence is byte-identical in `upstream/main`. It is not a fork mistake
  we failed to clean up; it is UPSTREAM'S OWN STATED DESIGN, inherited
  unchanged. Corroborated at the code altitude rather than the comment
  altitude: upstream's `cache-telemetry.mjs:16` literally does
  `join(claudeHome(), "quota-status")`.
  **What that does to the upstream-PR question:** the XDG relocation is not "add
  a missing convention" to upstream, it is REVERSING one they have written down
  and implemented. That is a design argument with their maintainers, not a
  cleanup PR, and it should be priced that way before anyone opens it. It also
  means every one of those 29 comments is CORRECT in its own repo and repairing
  them here would silently diverge 29 more upstream files.
  **Three-way README contradiction — DECIDED 2026-08-08 by `bbc1213`, and the
  paragraph below is kept only as the input that produced the decision. Every
  one of its three clauses is now STALE: the count is 0, not 29; the fork edits
  are reverted; the disagreement is gone.** The operator's revert-or-upstream
  call — named "still open" below — was made, and it went REVERT: all three
  translations carry upstream's `~/.claude` text on purpose. Where the
  divergence is documented now is `FORK-NOTES.md`, in a new section before the
  update-from-upstream procedure, which also records the condition that would
  flip the call — if people actually install FROM this fork rather than it being
  the operator's deployment plus a PR staging ground, the answer becomes finish
  the migration and accept the conflicts.
  Superseded text: **Three-way README contradiction, now measured.** `README.md` (29 XDG
  mentions, fork-patched in `332df4a`/`ddcdca3`) and `README.zh.md` were both
  edited by this fork; `README.ko.md` was not — it is byte-identical to
  upstream's plus one disclaimer line. So three translations of one document now
  disagree about where the same proxy writes. The repair is NOT to patch the
  Korean file into agreement: it is the operator's revert-or-upstream decision,
  still open, and this entry is its input.
  Scope of the repair this entry authorises: the 17 fork-only items ONLY —
  `docs/runbooks/runtime-anomaly.md` (5), `tools/` (9 across
  `usage-to-dashboard-ndjson`, `cost-report`, `cold-events`, `quota-analysis`,
  `reminder-migration-census`, `replay`, `sim-session-budget-breaker`), `test/`
  (3), plus the fork-only source items including `write-owner-only.mjs:6-9,14`
  (a module DEFINITION that is false against ~15 callers) and
  `tools/test-config-root.mjs`'s opening definition (a false universal
  `claudeHome()` claim carrying no path substring — the accounting lane's own
  answer to "name one member the pattern cannot match").
  Verifier: after the repair, re-run the accounting's own probes and the
  STILL-WRONG bucket returns zero for fork-only files, with UPSTREAM-OWNED
  unchanged at 29 — a repair that shrinks the upstream bucket has overstepped
  and is the failure this entry exists to prevent.
  <!-- entry: "repair the 17 fork-only stale location claims" -->

- **RECORD (ex-READY 2026-08-11) (severity DOWNGRADED 2026-08-08, SAME DAY, BY THE LANE THAT FOUND IT
  — read this
  first): the reset paths skip insertion-normalization's OWN adjacency check,
  but `output-guard` is an unconditional BACKSTOP, so this is not a safety
  hole.** The original entry follows unchanged below; it is kept rather than
  rewritten because the correction is the more useful artifact.
  What kills the severity claim: `output-guard.mjs` (order 690, gate
  `CACHE_FIX_OUTPUT_GUARD=1` live) imports the SAME `validateToolAdjacency`
  (`:25`) and runs it as `checkToolAdjacency` inside the `VALIDATORS` array
  (`:118`), which `findViolation` (`:124-130`) walks unconditionally on the
  fully-mutated final body at `:157`, every request, with no early return
  reachable from any reset. On a violation it reverts `ctx.body` to the
  pre-pipeline stash and logs CRITICAL. Dispatcher-confirmed at those lines.
  **And it has NEVER FIRED.** Zero `*-guard-events.jsonl` files exist in
  `statePath("snapshots")` — which is where `appendGuardEvent(getSnapshotDir(),
  …)` (`:192`, `:38`) writes, and the same directory holds thousands of other
  extensions' `*-events.jsonl`, so the zero is a measured absence and not a
  glob that could never match.
  **What the finding actually is, re-derived rather than deleted:** a reset
  that produced an invalid body would cost a FULL PIPELINE DISCARD — every
  mitigation for that request thrown away and the raw body forwarded — which
  is an honest bust, LOUD (CRITICAL log + telemetry), and never yet observed.
  That moves it off the silence signal entirely, which was half its ranking
  case. It stays READY because the defence-in-depth argument is real (the
  backstop discards work the inner check could have prevented) and because
  `checkAssistantTerminal` (`:108-117`) silently no-ops when the stash's
  `structuredClone` throws (`:25`) — a narrow same-gate gap worth closing in
  the same pass. Consumer tier stays **2**; the SILENCE elevation is WITHDRAWN.
  **Method note, the reason this entry is kept in full:** the severity claim
  was published to the operator and committed (`0ca3419`, whose title now
  overstates it — git history is immutable, the correction lives here) before
  the backstop was known. Round 1 of the enumeration was scoped to
  insertion-normalization and answered its question correctly; the backstop sat
  one extension away, and the question that surfaced it — "does any OTHER
  extension have this shape?" — was asked only in round 2. A single-extension
  enumeration cannot see a cross-extension backstop, and nothing in round 1's
  output signalled the absence. Ask the cross-file question in round ONE.

  Original entry, unchanged: **the tool-adjacency SAFETY check does not run on
  ANY reset path, and safety is the property this repo says outranks cache.**
  Found 2026-08-08 by
  the row-22 disarm enumeration; the control flow confirmed at the source by
  the dispatcher rather than booked on the lane's word.
  `validateToolAdjacency` (`proxy/extensions/insertion-normalization.mjs:459`)
  has exactly two call sites, `:545` and `:1720`. Every reset is an EARLY
  RETURN that never reaches `:1720` — `return resetKeepingPins("not-
  subsequence")` `:1535`, `("dropped-majority")` `:1539`, `("edit-shaped")`
  `:1597`, `("assistant-interleaved")` `:1601` — and `resetKeepingPins` itself
  (`:1039-1212`) contains no adjacency call. So the pinned/moved/refired
  messages a reset forwards go out WITHOUT the correctness check the success
  path applies to its own output.
  **Rate, measured, not assumed:** the matrix's row-22 work puts the reset rate
  at roughly one request in three. In one live session 2026-08-08 (s-captureAT):
  13 resets over 127 insertion events, 12 of them `no-prior-canonical`; a second
  session took `edit-shaped` on its busting request. So this is a routinely
  taken path, not an edge case.
  **What is NOT claimed, and this bounds the severity honestly:** no adjacency
  violation has been OBSERVED. `replay.mjs`'s own safety gate covers message
  count, roles, order and tool adjacency over pipeline output, and it reported
  `safety violations: 0` on both captures replayed that day. So this is an
  UNGUARDED ROUTE, not a known-broken one — the dev-loop's entry-path table
  shape exactly ("the protected thing is reachable by a second route, the
  second route is silent"), one level inside an extension rather than across
  invocations. Do not write "the proxy corrupts conversations on reset" into
  the matrix on this evidence.
  Design: call `validateToolAdjacency` on `resetKeepingPins`' output before it
  returns, taking the same action the success path takes when it fails. The
  success path's failure branch at `:545`/`:1720` is the model; do not invent a
  second policy.
  Verifier, red-first and it needs CONSTRUCTING because no natural instance
  exists: build a fixture whose reset output violates adjacency (a pinned
  `tool_use` restored without its `tool_result`, or the reverse), assert the new
  code rejects it, and confirm the OLD code forwards it silently — that silent
  forward IS the red. Negative control, required so the check cannot pass by
  always firing: a normal `no-prior-canonical` reset from s-captureAT must still
  pass untouched. Done when both arms hold and the full suite is green.
  **Sequencing constraint (hard):** this check must be demonstrated RED against
  the current code BEFORE any change to the reset paths ships, or it ships
  having never gone red on anything.
  Consumer tier **2 (feeds the gates)** — it is a correctness guard, not an
  event classifier — but note it outranks its tier on the SILENCE signal: a
  fidelity failure here is silent by construction, and the repo's stance is
  that safety outranks cache.
  <!-- entry: "the tool-adjacency SAFETY check does not run on ANY reset path" -->

- **RECORD (ex-READY 2026-08-11) — the XDG accounting's EXCLUDED-BY-GENRE bucket (~260 occurrences)
  was never individually verified, and two exceptions have already been found
  inside it.** Measured 2026-08-08 by the accounting lane, and flagged by that
  lane itself rather than by a reader — which is what makes it credible.
  The accounting bucketed `docs/directives/`, `docs/code-reviews/`,
  `docs/release-tests/`, `docs/audits/` and `BACKLOG.md` as EXCLUDED on the
  reasoning that they are historical genres whose stale paths are honest
  history. That reasoning is right for most of the set and wrong for an unknown
  fraction of it: `robustness-threat-matrix.md` was already a known exception
  (fixed earlier), and this run found a SECOND —
  `docs/audits/restart-state-audit.md:84`, which is not frozen history at all
  because `proxy-restart-transparent-state.md:11` actively cites it as "the
  authority". Two more are unresolved:
  `docs/directives/xdg-data-and-config-dir-guard.md` (the directive that
  MOTIVATED this migration, carrying stale "TODAY:" framing) and
  `proxy-restart-transparent-state.md` (cites the wrong audit).
  **So the headline number is a FLOOR, not a count.** STILL-WRONG came back 49
  occurrences across 30 file:line locations, and that figure explicitly excludes
  a bucket with a known non-zero error rate. Anyone reading "49" as the residual
  is reading a partial view as its whole body.
  **The discriminator that separates the two cases, and why a genre rule cannot:
  CITATION.** A historical document nobody cites is history; a historical
  document another live document cites as authority is a live claim wearing a
  genre's clothes. Genre is a property of the folder; authority is a property of
  the citation graph, and only the second decides.
  Design: sweep the excluded set by CITATION rather than by genre — for each
  file in it carrying a location claim, grep the tracked tree for references to
  that filename; a file cited by any live document (runbook, directive in force,
  CLAUDE.md, FORK-NOTES, a tool's comment) is IN SCOPE and gets classified
  individually. Uncited files stay excluded, and the exclusion is then a
  measurement rather than an assumption.
  Verifier, red-first with both polarities available today: the sweep must
  return `restart-state-audit.md` IN SCOPE (it is cited as authority) and must
  return at least one genuinely-uncited historical document OUT of scope —
  otherwise it has simply widened to everything and re-created the genre problem
  with a different label. Done when every one of the ~260 occurrences carries an
  individual verdict and the residual is a number.
  <!-- entry: "the XDG accounting's EXCLUDED-BY-GENRE bucket was never verified" -->

- **RECORD (ex-READY 2026-08-11) (small) — the three READMEs must agree on their path citations.**
  Proposed 2026-08-08 by the same lane, from a measured miss: `README.ko.md` was
  skipped by BOTH doc sweeps because each file list named `README.md` and
  `README.zh.md` from memory, and it ended up carrying the class's single worst
  line — a blanket claim (`:128`) that ALL telemetry is written under
  `~/.claude/`. A translation drifting from its source is invisible to any
  reviewer who does not read that language.
  Design: a check asserting the three READMEs cite the same set of paths.
  Computable, near-zero false fire, and it does not require the checker to read
  Korean — it compares path tokens, not prose. Red-first: the pre-fix
  `README.ko.md` must fail it.
  **RE-AIMED 2026-08-08 afternoon, and the entry is MORE worth building, not
  less.** `bbc1213` reverted the fork's XDG patches to `README.md` and
  `README.zh.md`, so the three now AGREE (0 / 0 / 0 XDG claims) and the check
  would be green today. Two things follow and neither is "drop it".
  (1) The red-first arrangement moves to committed history and becomes
  permanent rather than expiring: run it over `ddcdca3`, where the three
  demonstrably disagreed — English and Chinese carrying XDG claims beside
  upstream's, Korean carrying upstream's alone — and require a FAIL; run it
  over `bbc1213` and require silence. Two immutable refs, one of each polarity,
  so it cannot pass by always firing and cannot decay.
  (2) Its VALUE changed from detective to preventive, and that is the stronger
  case: the operator's decision is that all three carry upstream's text, and
  the thing most likely to undo it is a future XDG accounting "repairing"
  `README.md`'s restored `~/.claude` mentions. This check is what makes that
  attempt fail loudly instead of silently re-creating the divergence. It is the
  same shape as the writer-side guard at cost rank 1 — a generator-stopper, not
  another sweep.

- **RECORD (ex-READY 2026-08-11) 2026-08-07 — `xdg-migrate.mjs --verify` exits 1 on a NON-defect:
  it reports NOT-ARRIVED for paths that were never written, and calls that
  the abort condition.** Found by running the real migration on the desktop
  (dotfiles booked it; fork main `7b804fe`). Measured: `--apply` moved 16 of
  16 live paths, `COULD-NOT: 0`, and classified the other 8 as
  `ALREADY-DONE … (neither present — nothing was ever written here)`.
  `--verify` then re-read the same 24 and printed `arrived: 16
  NOT-ARRIVED: 6 COULD-NOT-VERIFY: 2`, exit code **1**, under the banner
  *"NOT-ARRIVED is the ABORT condition for the restart, not a warning: an
  extension whose store did not arrive starts empty, which costs a
  guaranteed re-baseline on every live conversation."* Independently
  checked from the dotfiles side: all six are absent at the LEGACY path
  too, so nothing was left behind and nothing can re-baseline — a store
  that never existed has nothing to lose. The two halves of one tool
  disagree: `--apply` distinguishes "never written" from "moved", `--verify`
  does not, so it folds a never-fired extension into the same bucket as a
  real transfer failure. THE DEFECT IS THE CHECK, NOT THE MIGRATION — and it
  is the shape this repo's own dev-loop names: a check that fires on a
  non-defect trains its reader to discount the red that will one day be
  real, and this one fires on the FIRST and only run of a gate designed to
  be run once. Design decided: `--verify`'s three answers become arrived /
  NOT-ARRIVED (present at neither location AND recorded as moved by apply —
  the real abort) / NEVER-WRITTEN (absent at both, apply said ALREADY-DONE
  — reported, not aborting), with `COULD-NOT-VERIFY` untouched. Verifier:
  re-run `--verify` on this now-migrated machine and it exits 0 with
  `arrived: 16  never-written: 6  COULD-NOT-VERIFY: 2`; red-first by
  asserting the current exit 1 before the change. Done when the exit code
  distinguishes the two, and a synthetic case where a path IS recorded as
  moved but is missing still aborts.


- **RECORD (ex-READY 2026-08-11) — `restart-exposure --match` takes a TEXT predicate, and an
  extension-behaviour change's affected class is usually STRUCTURAL, so the
  rule that says "price it against live sessions, not the corpus" has no
  instrument for the commonest case.** Found 2026-08-07 while shipping the
  suppression fix (403dde9, matrix row 28). That change's affected class is
  "a conversation where a suppression is firing with nothing restoring the
  block" — a predicate over canonical state and forwarded bytes, not over
  text. Without `--match` the tool answers ~815k across all seven live
  sessions, which is the worst case and is not the number the decision
  needs; the real number came from the morning sweep's conservation rows
  (zero live sessions in the class), which is a DIFFERENT instrument
  answering a NEIGHBOURING question — it reports on the last sweep's
  snapshot, not on the sessions live at restart time, and a session that
  entered the class since 11:50Z is invisible to it. Two sessions have now
  reached for a text predicate and settled for a proxy.
  Design, decided: `--match` keeps its text form and gains a
  `--match-class <name>` that runs the named replay predicate over each live
  session's own capture tail — the classes are the conservation kinds the
  gate already emits (`suppressed-without-copy`, `invented`, `lost`), so the
  vocabulary is `replay.mjs`'s, not a new one. Verifier, red-first: point it
  at capture s-captureAE (which carries the row) and at s-captureAO (which
  does not) and require the two to separate; the arrangement exists today
  because both captures are preserved at
  `~/.local/share/cache-fix/attribution-2026-08-07/`. Done when a restart
  decision for a structural class can quote a per-session number with the
  class named.

- **RECORD (ex-READY 2026-08-11) (small) — mint the matrix row this walk's terminal state requires.**
  An event mapping to no row is UNCLASSIFIED, and the rule is to stop and mint
  rather than explain it away; the walk above reached a terminal state with no
  row to record it against, which is the alarm the matrix's convergence note
  relies on. Drafted content, so this is a placement task and not a re-think:
  CLASS — an APPEND-ONLY request loses its cached prefix, cache read collapsing
  to roughly tools+system size while cache creation prices the whole context.
  DETECTION — `outcome.usage.cacheRead` falling by an order of magnitude across
  a pair whose prefix-diff record reads `causes: []` and `appendOnly: true`.
  STATUS — OBSERVED, CAUSE NOT ISOLATED (server-side; both tap points clean).
  NOT MITIGABLE from here, stated with its reason rather than left blank, and
  the row carries the 2026-08-10 04:40:39Z datapoint with the four-request
  table above as its evidence. Verifier: `bust-triage` on that stamp must map
  to the new row instead of answering UNCLASSIFIED. Done-criterion: row present,
  `bust-triage --at 2026-08-10T04:40:50Z` names it, suite green.
  Write boundary: `docs/directives/robustness-threat-matrix.md`.

- **RECORD (ex-READY 2026-08-11) (small) — a comment claiming a `{ todo }` marker exists is checkable
  against the runner, and nothing checks it.** `c3481d1` fixed three such
  claims by hand in one file; the class is "prose about a test contradicting
  the test", and it is silent by construction — the suite is green either way,
  so only a human reading the header ever finds it. The judgment half (is this
  sentence a claim about the present or a description of the past?) stays
  prose; the computable slice is the marker itself.
  Design (decided): one bite, in the SHAPE the same file already proves works —
  `test/tool-output-stamps.test.mjs:243-259` pins "exactly the one known
  `--json` mention" and fails when a new one appears. Same move over the test
  tree: collect (a) every `test/*.mjs` whose COMMENT text contains `{ todo }`
  and (b) every file with a real todo-marked test declaration, and assert the
  two sets match a mapping declared IN the test as data. A file narrating a
  removed marker is listed as a known comment-only mention with its reason;
  a NEW mention anywhere fails until someone classifies it. That is the
  declared-exemption form dev-loop mandates, not a softened regex — the check
  never has to decide what a sentence means, only that somebody classified it.
  Verifier: red-first against an IMMUTABLE reference, not the working tree —
  `git checkout c3481d1^ -- test/tool-output-stamps.test.mjs`, print
  `git diff --stat HEAD` as proof the old blob is really in place, and the bite
  must fire NAMING that file (its header claimed `{ todo }`; the runner reports
  0 todo tests). Over-firing control: at `c3481d1` and later the bite is green
  with the three narrating mentions classified.
  Done-criterion: red demonstrated with the old blob in place and the diffstat
  pasted, control green, full suite green.
  Write boundary: one new file under `test/`. No `tools/` change.

- **RECORD (ex-READY 2026-08-11) (small) — RE-SCOPED 2026-08-10, same refusal shape as the
  `rebilledBytes` entry above and the same cause.** The batch lane was briefed
  with "`tools/local-stamp.mjs`, `test/local-stamp.test.mjs'" and halted: the
  design requires editing `proxy/server.mjs` and `preload.mjs`, neither in that
  boundary, and it could not add tests asserting behaviour at unconverted sites
  without landing a red suite. Correct refusal — a test written to pass against
  a half-converted tree is a test that pins the half-conversion.
  Decision: the boundary is the design's own named sites (`proxy/server.mjs:51`,
  `preload.mjs:1396`) plus `tools/local-stamp.mjs` and its tests, in one lane.
  Same general lesson as above: the entry's file citations were a floor.
  Original entry follows.
- **RECORD (ex-READY 2026-08-11) (small) — the both-zones class recurs PAST the eleven-file boundary
  the shipped entry drew, at two measured sites.** `proxy/server.mjs:51` and
  `preload.mjs:1396` are both `[${new Date().toISOString()}] ...` human-facing
  log-line prefixes — the same shape as `usage-to-dashboard-ndjson`'s watch
  line, which WAS converted in `82372db`. They were left because they sit
  outside that lane's write boundary, not because they are correct.
  Design (decided): import `withLocal` from `tools/local-stamp.mjs` at both
  sites. Verifier: extend `test/local-stamp.test.mjs` with a bite per site plus
  the standing purity CONTROL that no machine-read `ts`/`timestamp` field in
  `proxy/**` gains a suffix (the sweep already accounted 33 proxy hits and 11
  preload hits as machine fields — that accounting is the exclusion list).
  Done-criterion: red-first on each new bite, full suite green.
  **Deployment coupling:** `proxy/**` is TREE-PINNED — this needs the dotfiles
  `CACHE_FIX_PROXY_TREE_PIN` bump plus `systemctl --user restart
  cache-fix-proxy`. Row-3 declaration, stated before the restart: a log-line
  format change touches neither state KEYS nor freeze logic, so the restart is
  cache-transparent.

- **RECORD (ex-READY 2026-08-11) (small) — 22 orphaned `worktree-agent-*` branches survive their
  worktrees, and nothing prunes them.** Measured 2026-08-10 while cleaning up
  after two integrated lanes: `git worktree remove` deletes the checkout and
  leaves the BRANCH, so every dispatch that ever got a worktree has left a ref
  behind. `git branch` currently lists 22 of them plus 3 `wt/*` and 4
  `backup/*-pre-rewrite`.
  Why it is worth a line rather than a one-off deletion: it grows monotonically
  with dispatch volume, it makes `git branch` unreadable exactly when someone is
  looking for a real branch under pressure, and — the load-bearing reason — a
  stale lane branch can carry content that was deliberately removed from
  `main`. That is not hypothetical here: this same session rewrote a commit
  message carrying a real session UUID, and the two rewrite-safety branches held
  the pre-scrub commit until they were explicitly deleted. A leak retracted from
  `main` and left alive on an orphan branch is retracted from nothing.
  Design, decided: a prune step that deletes a `worktree-agent-*` branch whose
  worktree is gone AND whose tip is an ancestor of `main` (i.e. integrated), and
  REPORTS rather than deletes any whose tip is not — an unintegrated lane branch
  is unfinished work, not litter, and the two must never be confused.
  Verifier, both directions: over the current 22, every deleted branch's tip is
  reachable from `main` afterwards, and a synthetic lane branch with an
  unmerged commit survives the prune and is named in its report.
  Consumer tier **3 (backlog and process)**.

- **RECORD (ex-READY 2026-08-11) (small) — `lintRowStatus` fires on prose that DESCRIBES a status
  assertion, and it caught its own closure entry within the hour.** Instrument-
  positive, unplanted, 2026-08-10: the entry closing the row-status check
  narrated its red-first case — a constructed sentence naming a matrix row
  together with a status word — and the check read the narration as the claim.
  Blocked a push. (This entry is itself written around the trigger rather than
  through it, which is the workaround the fix below exists to retire: prose that
  has to avoid its own subject is prose the checker is dictating.)
  This is the check-fires-on-a-non-defect shape the corpus names, and the
  repair it prescribes is a declared exemption the guard itself verifies, never
  a softened predicate. `lintCorrectionPlacement`, built by the same lane in the
  same commit, already exempts backtick-quoted mentions; `lintRowStatus` does
  not, so the two disagree about whether quoting a thing counts as asserting it.
  Design, decided: `lintRowStatus` takes the same quoted-mention exemption its
  sibling already has, sharing one predicate rather than growing a second.
  Verifier, red-first with its baseline: the exemption is added, the closure
  entry's original narrating sentence is restored, and the check stays silent on
  it while STILL firing on the constructed positive the entry's own test uses.
  Both halves — an exemption that silences the real positive too is not an
  exemption, it is a disabled check.

- **RECORD (ex-READY 2026-08-11) (small) — a test asserting "zero false fires on the real CURRENT
  BACKLOG.md" is anchored to live, mutating state, and decays into a false alarm
  by construction.** Found 2026-08-10 when it went red at the push boundary on
  ordinary prose written that same hour. The corpus states the rule directly:
  acceptance criteria anchored to live, mutating state decay into false alarms;
  frozen into a fixed reference they stay re-runnable. This test re-reads a file
  that changes several times an hour, so every future editor inherits a red
  whose cause is their own wording.
  What makes it worth fixing rather than deleting: the zero-false-fire property
  IS the thing worth pinning — it is the over-firing control, and the same lane's
  other checks each carry one. The defect is the ANCHOR, not the assertion.
  Design, decided: pin the control to a FROZEN snapshot (a committed fixture, or
  a named historical SHA the way `lintPremiseTrue`'s positive uses `633256b`),
  and keep a separate REPORT-only run over the live file that never fails the
  suite. Two consumers, two anchors: the suite gets an immutable one, the human
  gets the live one.
  Applies to any sibling check written the same way — check all four lanes'
  tests for a live-file assertion while in there.
  Verifier: edit `BACKLOG.md` prose in a way that would have tripped the old
  test, and the suite stays green while the report line appears.
  Consumer tier **2 (feeds the gates)**.

- **RECORD (ex-READY 2026-08-11) — ~30% of `join:cross-message` pairs do NOT fire `movedFresh`, and
  nobody has established whether they share a cause.** Booked 2026-08-08 from
  the corpus measurement that closed the question above: over all 89 captures
  under PRODUCTION gates, 18,425 pairs, **139 labelled `join:cross-message`, 97
  of them (69.8%) fire `movedFresh`**. The measurement's job was to decide
  whether the mitigation reaches the class at all — it does — and the residue
  is a separate question the same run surfaced and deliberately did not chase.
  **Why it is worth its own entry rather than a footnote:** the 42 non-firing
  pairs are, today, indistinguishable from each other. Some are presumably the
  same shape as the 05:24:37Z instance (s-captureAN) that motivated the parent
  entry and is confirmed absent from the 97; whether the rest share that shape,
  several shapes, or none, is unmeasured. A 30% miss rate quoted without that
  split is a number that sounds like a bound and is not one.
  Design, decided: classify the 42. Group them by whatever the census already
  emits (anchorDelta band, block counts, whether the suppression set contained
  a NEAR-miss hash), and report the distribution — the deliverable is the
  SPLIT, not a rate. Only once the groups exist is it worth asking whether any
  of them is mitigable.
  Verifier, red-first and permanent because it runs over committed corpus
  behaviour rather than live state: the classifier must place the 05:24:37Z
  pair in a named group rather than in an "other" bucket, and the group counts
  must sum to 42 with an explicit zero for any empty class — a classifier whose
  buckets do not reconcile against the total has not classified anything.
  Consumer tier **1 (event disposition)** — it decides whether an individual
  cross-message miss is a known shape or a new one. Unranked (booked after the
  derivation).
  <!-- entry: "~30% of join:cross-message pairs do NOT fire movedFresh" -->

- **RECORD (ex-READY 2026-08-11) (small) — the own-event-log timestamp correlator: a RULE
  stated in three places with no tool behind it.** `docs/dev-loop.md`
  ("Rule out ourselves — attribution starts at our own event logs")
  makes this mandatory before any external attribution, and the
  hand-step census of 2026-08-07 found it hand-applied identically in
  the runbooks with `tool=grep` and no wrapper — one of 14 RECURRING
  un-mechanized steps found across runbooks, dev-loop and the matrix.
  The rule already carries its own precedent for why it matters: three
  "400 must end with a user message" failures were verbally booked as
  harness noise twice, and our own suppression log had preceded all
  three by ~1 second.
  Design: `tools/own-logs-at.mjs <epoch|ISO> [--window-sec N]` — greps
  every `~/.claude/cache-fix-snapshots/*-events.jsonl` and the
  extension event logs for entries inside the window, printing them
  time-ordered with their source file, and exiting 0 with an explicit
  "no entries in window" line rather than silence (the three-answer
  rule: an empty window is a stated result, never a blank).
  Verifier, red-first: run at the 2026-07-30 suppression incident's
  stamp and the suppressed-duplicate entries must appear; run at a
  quiet stamp and the output must say so in words. A run that prints
  nothing at all is a failing run.

- **RECORD (ex-READY 2026-08-11) (small; same file as the backlog-lint WARN item, dispatch them
  together) — a `backlog-lint` lane for the two ways a booked entry is not
  DISPATCHABLE.** Standing rule persisted 2026-08-06 (operator, session-close
  runbook step 8): the backlog closes dispatchable — every open entry
  executable by someone who is not you, in the repo where the work happens,
  without asking anyone a question. Steps 5 to 7 of that lane catch findings
  that were never booked; nothing catches a booked entry that reads complete
  and cannot be executed. Both shapes were measured the day the rule was
  written, both authored by the session that wrote them: a decision parked in
  a work queue (an entry whose body says the operator must decide first —
  correct authorship, incomplete queue item, and the operator was present the
  whole time), and the wrong carrier (two claude-worktime items booked here
  while that repo's own BACKLOG.md read "Ready: (empty), Parked: (empty)").
  Design: two classes over READY/HOT bodies only — DECISION-PARKED on the
  language tells ("operator decision", "stated rather than taken", "bring to
  the operator", "decide whether", "recommendation:" adjacent to a grade
  header) and FOREIGN-CARRIER on a repo path outside this tree in an entry
  that is not marked operator-side-informational. WARN, not blocking: whether
  a given entry is genuinely blocked is judgment, so the lint flags and the
  operator backstops — a blocking predicate here would fire on legitimate
  entries and train the override reflex.
  **SECTION EXEMPTION, found by HAND-RUNNING the check before building it
  (2026-08-06):** this file already has a `## Parked decisions` section (line
  6204) — the sanctioned home for a question that is deliberately waiting.
  DECISION-PARKED must not fire inside it, or the lane's first run flags the
  one place the shape is CORRECT: the fires-on-legitimate-work failure this
  entry's own WARN-not-blocking clause guards against, one level down. So the
  distinction is three-way, not two — parked on evidence (healthy, anywhere),
  a decision inside `## Parked decisions` (healthy), a decision inside a READY
  work entry (the finding).
  **Its red cases already exist, unsettled, and producing that list is what
  the lane is FOR:** the same hand-run found three outside that section — the
  write-registration item ("registered nowhere, by instruction … an operator
  decision, not build work", ~line 78), the upstream order-690 collision
  ("SURFACED, NOT RAISED — an operator decision", ~line 1108), and the
  upstream-error-log gate flip ("operator decision", ~line 6195). Each either
  moves into `## Parked decisions` or gets settled. Which one is the
  operator's call, not the lane's.
  Verifier, red-first and THREE sides required: red on the two 2026-08-06
  entries named above at the commit that introduced them; SILENT on a PARKED
  entry whose body names missing evidence; and SILENT on every entry inside
  `## Parked decisions`, checked against the three real ones now sitting
  there.

- **RECORD (ex-READY 2026-08-11) — `tools/lane-sweep.mjs`: make the lane enumeration repeatable, because
  the hand pass found three gaps and will not survive this session.** Done by
  hand 2026-08-06 (operator-prompted): walk every event class and check it has
  a trigger, a line, a terminal state, and a durable disposition. It found the
  sweep runbook's missing doorbell, the two upstream triggers, and a whole
  unrouted event class (the proxy's own runtime detector logs). The reasoning
  that produced it is exactly what does not survive into the next session —
  dev-loop's own "the manual pass finds the defect once, the mechanism finds it
  forever."
  **The mechanical half, which is the whole of this item.** Three cross-checks,
  each a set difference over things that exist on disk:
  (1) PRODUCERS vs LANES — enumerate every path an extension writes under
  `claudeHome()` (14 extensions do today, via `appendFileOwnerOnly`/
  `writeFileOwnerOnly`) plus every `cache-fix-*.timer`; for each, require
  EITHER a named reader (some `tools/*.mjs` opens it) OR a lane (a runbook or
  the dev-loop index names it). Neither → **UNROUTED**, which is the alarm. This
  is the check that would have named the runtime-detector class instead of
  waiting for someone to notice `upstream-errors.jsonl` at 79 KB.
  (2) INDEX vs FILES, both directions — every dev-loop index row resolves to a
  runbook that exists; every `docs/runbooks/*.md` appears in the index. Catches
  the orphan and the dead pointer, which is how the CLAUDE.local.md runbook
  list went stale within hours of the second runbook landing.
  (3) MARKERS — every `[GRADUATE -> …]` either names a BACKLOG item whose text
  is present, or says "not yet booked" AND names its trigger. A marker pointing
  at a booked item that has since shipped is stale and must fail.
  **Schema change this needs, and it is small:** the dev-loop index table gains
  a TRIGGER column naming the mechanism (`statusline ❄`, `SessionStart line`,
  `operator decision`). Check (1) then verifies a named trigger RESOLVES — a
  hook file that exists, or the literal `operator decision`, which is a valid
  answer and not a hole. Without that column the doorbell gap is invisible to
  any check, which is precisely how it shipped.
  **The one open decision, surfaced not filled:** state-only writers (canon
  files, watermarks) are not finding producers and would otherwise all report
  UNROUTED. Recommendation: an explicit `writesState` declaration in the
  extension's own export, so the exemption is data the check reads and goes red
  when a state file quietly starts carrying findings — never a filename
  allowlist in the checker, which is the softened-predicate shape.
  **Verifier, red-first, and the arrangement is available today:** run it at
  `217b61c^` — it must report the runtime-detector producers UNROUTED and the
  sweep lane's trigger missing; at `217b61c` the trigger row is still missing
  (that fix is the booked doorbell item), so the bite to pin is the UNROUTED
  set shrinking by exactly the producers the doorbell item routes. Done-criterion:
  that, plus the run printing what it EXAMINED — producer count, lane count,
  marker count — because a sweep that reports "no gaps" over an empty
  enumeration is this repo's most-repeated failure.
  **NOT in scope, and it is the judgment half:** whether the event-class list is
  COMPLETE. No check knows what events the world produces; today's runtime-detector
  class was found by asking, not by enumerating. That stays a prose ritual with
  dev-loop's existing stock-sweep cadence and its retirement signal (two
  consecutive sweeps returning only minor findings, then it stops until the next
  burst) — reused, not re-invented.

- **RECORD (ex-READY 2026-08-11) — `/health`'s `gates` is a pure `CACHE_FIX_*` env filter, so any
  extension gated by `enabled:` in `extensions.json` is INVISIBLE to the
  DECLARED/RUNNING/VERIFIED check that every runbook leans on.** Found
  2026-08-06 by the dispatched agent writing the runtime-anomaly runbook, and
  verified here: `proxy/server.mjs:577-581` builds `_gates` as
  `Object.entries(process.env).filter(([k]) => k.startsWith("CACHE_FIX_"))`.
  `rate-limit-log` is gated by `enabled: false` in its own default export plus
  a row in `extensions.json` (`rate-limit-log.mjs:215`) — no env var — so it
  cannot appear in `/health`, cannot appear in the sweep's `gates`, and the
  three-way agreement dev-loop calls load-bearing silently answers about a
  SUBSET of the pipeline while reading as if it covered all of it. That is the
  "absence of evidence wearing a verdict's clothes" shape aimed at the one
  check that decides whether a gate run means anything for production. The
  same day, the dispatcher looked at `/health`, did not see `usage-log` or
  `rate-limit-log`, and had to go read `extensions.json` to find them enabled —
  the confusion this causes is measured, not hypothetical.
  Design, decided: `/health` reports the RESOLVED extension set — every
  extension with its enabled state and the SOURCE that decided it (`env` /
  `extensions.json` / `default`) — and the sweep records that same resolved set
  as its third answer, so all three compare like with like. The env list stays
  as-is beside it; this adds an answer rather than changing one. Verifier,
  red-first: with `rate-limit-log` enabled in `extensions.json` and no env var,
  today's `/health` omits it and the new one must name it with
  `source: extensions.json`; flipping it to disabled must flip the report.
  Done-criterion: both, plus `doctor`'s three-way comparison reading the
  resolved set — a fix that leaves doctor comparing env lists has moved the
  blind spot, not closed it.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  /health already reports resolved extensions with their source (2e088df). The
  doctor-side consumption is still open — and it is a DUPLICATE of n=50, so
  this is a merge candidate rather than an independent entry.
- **RECORD (ex-READY 2026-08-11) — extend `replay.mjs`'s extension bisection to CONSERVATION rows;
  today it attributes stability violations only, and conservation rows are
  attributed by hand.** The graduation trigger fired long ago and was only
  noticed when `docs/runbooks/sweep-finding.md` had to teach the hand method
  as a step: dev-loop's rule is "whenever a step of this list gets answered by
  hand twice, move it into the tool" (dev-loop.md:269), and the 2026-08-05
  gate-red triage ran this exact hand method — the suspected extension's own
  exported transform over the real raw bytes — on THREE extensions in one
  sitting (`fresh-session-sort`'s `sortSkillsBlock`/`pinBlockContent`,
  `smoosh-split` composed with `content-strip`, and
  `identity-normalization`'s `normalizeSessionStartText`). Not a new tool:
  the machinery exists and is good (`replay.mjs:3169` — one bisection over
  the union of rows rather than one per row, results cached by cut, 58s
  linear -> ~11s bisected). It is pointed at `violations` and never at the
  conservation list. Design, decided: build the bisection's input as the
  UNION of stability violations and conservation rows, and give each
  conservation row the same `attributedTo` field a stability violation
  already gets — same cut-cache, so the added cost is the extra rows'
  probes, not a second bisection pass. Verifier, red-first: the 38-row
  gate-red capture is the known positive — every row must come back
  attributed to one of the three extensions named above, and the run must
  report rows it could NOT attribute as their own count rather than folding
  them into the attributed ones (an attribution that cannot say "I don't
  know" is the could-not-verify hole in a third clothing). Done-criterion:
  that capture's rows attributed with the counts matching the hand triage
  recorded in the "GATE-RED TRIAGED 2026-08-05" entry, plus a bite in
  `test/replay-gate-selfcheck.test.mjs`. Removes the `[GRADUATE]` marker on
  step 4 of the sweep runbook — that marker comes out with this commit and
  by no other means.

- **RECORD (ex-READY 2026-08-11) (small, and it sharpens the rate question) — why did twelve
  first-appearance relocations rotate the key for free while the thirteenth cost
  216k? The type is the obvious suspect and probably the wrong one.** All 12
  survivors are `mcp`; the costly one was `skills` (14,593 chars). Correlation
  noted, mechanism not — and the mechanism already has a better candidate: the
  flip needs `deferred-tool-rewrite` to be HOLDING a frozen tools order under the
  pre-rotation key, which depends on whether CC had already reordered its tools
  array earlier in that conversation, i.e. on WHEN in the session the relocation
  lands, not on which block type moved. Cheap to settle from evidence already on
  disk: for each of the 12, read the PRE-rotation key's state in
  `*-deferred-tool-events.jsonl` (the enumeration read the post-rotation key
  only) and record whether a baseline was held. Done-criterion: a held/not-held
  column beside the 12, and a one-line verdict on which of the two hypotheses the
  data supports — with "neither, n is too small" as an acceptable answer, since
  12 free instances and one costly one is not a rate. Ranks below the fixture
  work: it explains the cost distribution, it does not block the mitigation.

  **DROP REJECTED 2026-08-10 — a lane graded this OVERTAKEN; the desk
  overturned it.**
  A lane graded this OVERTAKEN citing the STAGE-2b record at
  BACKLOG.md:904-916. REJECTED at the desk: that record answers a NARROWER
  question. It establishes that zero of the 12 surviving positives would fire
  the proposed check, and that all 12 are `mcp` with prefixAboveMessages
  INTACT. This entry asks a MECHANISM question — why twelve rotations were
  free and the thirteenth cost 216k, with its own text already saying the type
  is the obvious suspect and probably the wrong one. A true sentence answering
  a smaller question is the reach failure the corpus names; the mechanism is
  still unexplained.
- **RECORD (ex-READY 2026-08-11) — the PR-ROUNDS trigger, split out of the entry above with its WRITER
  named, because it is the one part that cannot ride the SessionStart hook
  directly.** The gate-red part reads a local file and is dispatched; this part
  needs `gh`, i.e. the network, and a session-start hook is the one place a
  network call must not go — it sits on the critical path of every session and
  fails in ways nobody sees. So the design splits in two, and only the writer is
  new work: a scheduled WRITER (user timer, hourly) runs `gh pr list --repo
  cnighswonger/claude-code-cache-fix --author @me --json
  number,reviewDecision,updatedAt,headRefName` plus per-PR last-comment time,
  compares each against our last push on that branch, and writes
  `~/.claude/cache-fix-pr-rounds.json` as `{finished, rounds:[{n, since}]}`; the
  READER is the attention line, under the same three states the gate-red part
  uses — count when >0, silent at zero, `stale` when `finished` is older than
  ~3 h, silent when the file is absent (a machine with no fork checkout must not
  grow a permanent line).
  **The live positive exists and it is today's, which is why this is READY and
  not parked.** Measured 2026-08-06 ~19:30 local by a hand `gh pr list` run
  purely to write this entry: #273 MERGED at 16:19:46Z, and at 16:28:44Z
  upstream posted a round on **#278** asking for a second rebase (`#273` and
  `#317` merged since our `3c4ecfa` push; current upstream main `48e9673`;
  "nothing to fix in your code"), plus the finding that both CI failures are the
  same transient 503 at *Prepare all required actions*, not our code. That round
  sat **three hours** with nothing announcing it.
  **The sharper cost, and it is the one worth quoting at the next
  re-derivation:** the previous session's own handoff — written at 19:01, i.e.
  after both events — records "Today's three rebases went out … and #273 reads
  APPROVED, so the ball is with upstream." #273 had been MERGED for 42 minutes
  and #278 had been waiting for 33 when that sentence was written. The handoff
  was not careless; it was working from the last state anyone had LOOKED at,
  which is precisely what a doorbell replaces. A missing watcher does not only
  delay a response — it writes stale premises into the artifact the next session
  starts from.
  Verifier, three parts: (a) WRITER — its output for today must contain #278
  with `since = 2026-08-06T16:28:44Z`, checked against the `gh` output by hand
  once; (b) READER red-first — against that file the attention line prints the
  rounds part, against a synthetic `{rounds: []}` it prints nothing, against a
  `finished` 6 h old it prints stale; (c) the zero case proven silent on the
  same invocation that fires on the real file, so a zero from an instrument that
  never ran is excluded. Done-criterion: all three, plus the writer's failure
  mode named — `gh` unauthenticated or offline must leave the previous file
  intact and let staleness speak, never write an empty `rounds` (an empty list
  from a failed call is indistinguishable from peace, and would be the
  absence-wearing-a-verdict's-clothes shape aimed at the one signal that has now
  measurably gone unanswered twice).

- **RECORD (ex-READY 2026-08-11) — `identity-normalization` rewrites ONE of the two containers CC emits
  for the same message, so its own normalization is half-applied.** Measured
  2026-08-06, s-captureAL, same message and same conversation 52 s apart:
  `identity-normalization.mjs:126` reads `if (!Array.isArray(msg.content))
  continue;`, so the block-array form at n=91 is rewritten
  (`SessionStart:resume` → `startup`, verified byte-identical to the extension's
  own exported `normalizeSessionStartText` over the raw bytes) while the BARE
  STRING form at n=92 passes through untouched — though the same transform
  returns `substitutions=1` on it. This is the repo's own entry-path rule ("a
  mechanism that guards one route is not a guard") landing inside an extension
  rather than on a gate. Cost UNMEASURED, and that is the honest state: the
  point is that a normalization which fires on one container and not the other
  can leave the prefix divergent exactly where it meant to hold it.
  Verifier: this is a NORMALIZATION, so it does not ship without
  `tools/reminder-migration-census.mjs` green across the corpus (content AND
  placement, any MISMATCH blocking) — that gate is not optional and is named
  here so it cannot be skipped. Red-first: n=92 of s-captureAL forwards the
  un-normalized bare string today; after the fix it must forward the substituted
  text, same input, one variable. Durable evidence must be SYNTHETIC — the
  predicate is literal text, which the scrub destroys.

- **RECORD (ex-READY 2026-08-11) — findings get classified ONE-SIDEDLY and the operator is the
  only thing that catches it. Twice on 2026-08-06, which is a rate, not an
  anecdote.** This is the gap behind the two entries below, booked
  separately because fixing either of them leaves this one intact.
  **Instance 1 (morning):** four findings were tool-shaped in the telling
  and procedure- or rule-shaped in fact; each became an entry only when the
  operator asked. The response was to widen dev-loop rule three from
  "tooling and docs" to "tooling, docs, PROCEDURES, RULES".
  **Instance 2 (same evening, after that widening):** a reach failure —
  `bust-triage` cannot see a disposition the matrix records — was written
  up as "**the finding is the tool, not the bust**", with a reader fix
  about to be booked alone. The writer half (nothing requires a
  CONTROLLED-CAUSE walk to become a row, so the next one lands in prose
  too) surfaced only when the operator asked four words. Verified against
  artifacts, not memory: the matrix addendum written BEFORE the question
  contains zero process-half language; the entry written after contains
  both.
  **So the widened rule did not hold on its own first evening, and that is
  the finding.** A rule that names four categories still gets answered with
  one, because the session states the category in the same breath as the
  defect and never re-asks. Widening the vocabulary again would repeat the
  morning's fix and get the morning's result.
  **Computable slice, and it rides a check already booked** — the
  named-and-unbooked scanner (session-close entry below) already scans the
  session's own output for gap-language and reports unresolved hits. Add
  one pattern class to its spec: REACH-FAILURE language — "cannot reach",
  "invisible to", "only indexes", "does not see", "not covered by" — and
  require the entry that resolves it to contain a writer clause (what put
  the target out of reach, and whether that is still happening). It
  REPORTS, never blocks, exactly as that check's design already specifies.
  **Red-first arrangement, available now and unusually clean:** run it over
  this session. The matrix addendum must be flagged (reach-failure language,
  no writer clause); the backlog entry written twenty minutes later must
  not (both halves present). Two texts, one session, opposite verdicts, no
  synthetic fixture needed.
  **Judgment remainder, stated so nobody mechanizes it:** whether a
  one-sided finding is genuinely one-sided (some reach failures have no
  live writer) is not computable. The check surfaces candidates; the
  operator stays the backstop, and the honest record is that the backstop
  is what worked both times.

- **RECORD (ex-READY 2026-08-11) — the new verdict kinds have no live path, so most of the enum has
  never been produced by a real bust.** Honest residue from the status-enum
  lane's slot (g), booked rather than left in its report: `classToRow` and
  `causeToRow` only ever produce rows 1, 4, 6 and 23, so the kinds ACCEPTED,
  PARTIAL, BUILT, DOCUMENTED, COVERED and NOT-APPLICABLE are exercised by bites
  against the real status strings and by nothing else. STATUS-UNREADABLE reached
  its output path only under a temporary mutation that forced row 3.
  Why it is worth an entry rather than a shrug: the mapping was just corrected
  in the direction of "stop reassuring the reader", and the rows that benefit
  most from that correction are precisely the ones no live classification can
  reach. A verdict nobody can trigger is a verdict nobody will notice is wrong.
  Named missing evidence: whether the gap is in the CLASSIFIER (a real bust
  whose shape maps to an ACCEPT row exists and is being sent to row 1/4/6/23
  instead) or in the MATRIX (no bust class legitimately lands on those rows).
  Those need opposite fixes, and the census's own class distribution over the
  live corpus answers which — one query, not a design. Do that before designing
  anything.

- **RECORD (ex-READY 2026-08-11) — the usage log has no CC-session key by design, so the number that
  settles a re-bill question cannot be reached from a bust.** Grounding,
  measured 2026-08-06 while parking the 48k above: `~/.claude/usage.jsonl`
  carries 3001 rows and exactly **2 distinct `sid` values** over eighteen hours
  in which the proxy captured 83 sessions. That is not a coverage gap — the
  definition says so at `proxy/extensions/usage-log.mjs:10`: `sid` is the
  **proxy session, sticky for proxy lifetime**, and the two values are one
  restart apart. The header states the intended join at :40-49: `request_id`
  from the upstream response header, joined against CC's own per-session
  transcripts, "recovers per-CC-session attribution that `sid` alone cannot
  provide" — documented, and implemented by nothing.
  **Why this ranks as more than a convenience:** the 610k entry's remedy is
  exactly this number ("`usage-log` was enabled tonight and writes per-request
  `cache_read` / `cache_creation`"). That claim is true per REQUEST and does not
  reach a SESSION without the join, so the entry's stated way out is a step
  nobody has built — and the 48k above is the first bust to stall on it.
  Design, decided: a `--usage` mode on `bust-triage` that, for the pair it has
  already identified, reads the CC transcript for the session, collects the
  `requestId`s in the busting window, joins them against `usage.jsonl`, and
  prints `cache_read` / `cache_creation` per request beside the pair. Same tool,
  because the pair identification and the window are already there — a new file
  would re-earn the conversation-grouping and UTC lessons from zero.
  Verifier, red-first: the 48k event above must go from "cannot be answered" to
  a printed pair of numbers; control, a stamp whose window has no matching
  `requestId` must say so rather than print zeros. Done when the park above can
  be closed by running one command.
  **Probe lesson from finding it, kept because it is the same error one level
  out:** the first probe filtered `usage.jsonl` by CC session id and returned 0
  rows, which read as "the instrument does not cover this session". It was a
  namespace mismatch — the field is a proxy id — and the definition at
  `usage-log.mjs:10` said so at reading distance. Reading the source is what
  corrected it; more probing would not have.

- **RECORD (ex-READY 2026-08-11) — the required-reading INJECTION carries the closing gate and not the
  recognition device, so a fresh session gets the questions and never sees the
  event→lane table.** Reported by a peer session and CONFIRMED here at the
  bytes: the extract markers in `docs/dev-loop.md` sit at lines 728 and 802 and
  wrap the closing gate alone; "Which line are you on" — the table that maps an
  EVENT to its runbook — is at line 7, far outside. `.claude/required-reading.json`
  lists the two files, and the gate still forces the full read at the session's
  first Write, so the precise claim is narrower than "a fresh session never sees
  it": a session that WRITES gets the table, a session that only reads or
  reviews never does, and the injection's usefulness is what makes the absence
  invisible.
  **HARD ORDERING CONSTRAINT — do not fix this before the index check below.**
  This state is a live red for that check's fourth condition. Fix it first and
  the check ships having never gone red on anything, which is the failure
  `docs/dev-loop.md` documents under "Adding a check".
  Same constraint, same reason, for its sibling: `CLAUDE.local.md` lists 3 of
  the 5 runbooks on disk (`bust-appears`, `sweep-finding`, `upstream-pr-round`;
  `runtime-anomaly` and `session-close` are missing), one line after the text
  that predicts its own staleness — the fix there is DELETION of the list, not
  an update, since the file already points at dev-loop's table as the index.
  That file is deployed from dotfiles `cache-fix/CLAUDE.local.md` and is edited
  THERE, never in this repo.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  The extract markers are at docs/dev-loop.md:1348 and :1422, not 728/802. The
  file grew under the citation.
- **RECORD (ex-READY 2026-08-11) — READY has no expiry, so nothing ever forces the build-or-drop
  decision, and the queue is now growing faster than it drains.** Measured
  2026-08-06 from git history, counting `^- \*\*READY` per day: **8 (07-30),
  7 (08-02), 13 (08-05), 25 (08-06)** — flat through 08-02, when items were
  being built, then roughly doubling today alone. PARKED over the same span:
  2 → 16. Today produced twelve new READY entries and one line of executable
  change.
  **Why this is the self-improvement loop's own failure mode rather than a
  tidiness complaint.** Every mechanism this repo added today makes FINDING
  gaps cheaper and converting them into decision-complete entries frictionless
  — the standing question, the named-and-unbooked check, the lane sweep. None
  makes BUILDING cheaper. A system that optimises the cheap half of a pipeline
  and not the expensive half accumulates at the junction, and the accumulation
  reads as health: every finding is "booked", the backlog is rich, and the
  machinery is unchanged. The corpus rule that should prevent it —
  "items leave by commit ref or are dropped with a one-line reason" — has no
  TRIGGER, so nothing ever asks, and an entry booked in good faith on 07-30 is
  indistinguishable at a glance from one booked this morning.
  Design, decided: entry age is computable (`git log -S` on the entry's header
  line gives its first appearance), so the count and the OLDEST READY age ride
  the same SessionStart carrier as the three doorbells — one line, silent below
  a threshold. And the re-grade rule: a READY item that survives **three
  sessions** without being built gets one of two dispositions, never a third —
  re-affirmed with a sentence saying what evidence still makes it worth
  building, or DROPPED with its one-line reason. "Still relevant" is not a
  disposition. The point is not to shrink the list; it is that an item nobody
  will build is information about priorities, and leaving it silently ranked
  hides that information.
  Verifier: against 2026-08-06's state it must report 25 READY with the oldest
  dating to 07-30 or earlier; against a synthetic backlog of three fresh
  entries it must be silent. Done-criterion: both, plus the age derived from
  git rather than from a date written in the entry — a hand-written date is a
  label over its own body and will drift from the commit that added it.

- **RECORD (ex-READY 2026-08-11) — born-large conversation starts become a census class.** The
  classification has now been hand-derived TWICE (the parked resume-boundary
  classifier, and the step-0 probe that closed the /resume item) — exactly
  the closing-gate-Q3 shape where the next instance gets re-derived instead
  of recognized. Design, decision-complete: a `findBornLargeStarts(entries)`
  in replay.mjs (extend the existing tool, never a new file), REPORT not
  gate, one row per first-seen `conversationSubKey` whose first request
  carries ≥50 messages, with the most recent earlier large request as
  comparand and three fields the step-0 probe proved informative: whether
  the full system hash held, whether `systemPromptSubKey` rotated (compact
  entries already carry `inSysSub`), and the system char delta. Verifier:
  bites in replay-gate-selfcheck (green on a synthetic born-large pair, red
  with the grouping key forced constant, control for a conversation born
  small); plus the live known positive (the 449-msg start). Done when the
  daily sweep persists the rows like the other eight arrays. ~60 LOC + 3
  bites; not load-bearing (report-only).

- **RECORD (ex-READY 2026-08-11) — the lanes backfill: the five runbooks gain `Trigger:` lines and
  dev-loop's router table gains kind/channels, per the dotfiles lanes-format
  contract.** Booked 2026-08-07 on operator instruction; this is the scope
  dotfiles Session C could not deliver because a session held this working
  copy. **Authority: `/home/g/dev/Gunther-Schulz/dotfiles/docs/directives/lanes-format-contract.md`,
  settled by operator GO 2026-08-07 — its decisions are NOT re-openable at
  execution; a contradiction between it and the ground here returns to the
  operator with evidence, never a local redesign.** Read first: its sections
  "The file format", "Backfill for the five existing files", "The router — one
  per repo, DECLARED, never assumed", "The other validator (boundary declared
  in data)".
  Items, all additive: (1) add the five `Trigger:` lines to
  `docs/runbooks/*.md` exactly as the backfill section renders them — no other
  text, heading or line change to those five files; (2) extend
  `docs/dev-loop.md`'s router table ("Which line are you on") with `kind` and
  `channels` columns per the router section — dev-loop REMAINS the router and
  no `INDEX.md` is created (operator GO, option 2: a second router is the
  duplicate-head defect this file already books); (3) declare the router in
  `.claude/required-reading.json` — `"lanes": {"dir": "docs/runbooks", "router":
  "docs/dev-loop.md"}` beside `"required"`; (4) file three entries HERE, decided
  in this repo: `check_devbook_form.py` fails `runtime-anomaly` (missing stop),
  `session-close` (missing verify) and `sweep-finding` (missing stop) — the
  contract's validator boundary makes these non-binding for lanes, so satisfy
  or exempt is this repo's domain judgment; (5) reconcile the READY
  `tools/lane-sweep.mjs` entry, whose "TRIGGER column" schema clause predates
  the contract — amend it to key on the kind/channels columns landing here, so
  two schemas do not get built.
  **PLACEMENT GAP, found at booking and NOT bridged (item 3):**
  `.claude/required-reading.json` is UNTRACKED in this repo — `git ls-files
  .claude/` returns only `agent-name` and `github-app`. The live file is
  deployed from dotfiles `cache-fix/required-reading.json` (present there,
  52 bytes), and CLAUDE.local.md's standing rule for deployed artifacts is
  edit THERE, never here. So item 3's write lands in the dotfiles source and
  arrives here by deployment; an edit made in this tree would be overwritten
  and would not be tracked. Stated rather than resolved: whether the contract
  intends the dotfiles-side write is the operator's to confirm, and it changes
  which repo the commit lands in, not what is written.
  Verifier: `/home/g/dev/Gunther-Schulz/dotfiles/tools/lane-check.py` — red
  already attested at 7 violations over the un-backfilled lanes here; after the
  backfill it must run green over this repo, real output pasted. This repo's
  own battery green before push. Write boundaries: the five lane files
  (`Trigger:` lines only), `docs/dev-loop.md` (table only),
  `.claude/required-reading.json` (see the placement gap), `BACKLOG.md`.

- **RECORD (ex-READY 2026-08-11) (small) — an entry proposing a DECLARED EXEMPTION states the
  `ctx.meta` key it will read, or states that there is none.** Booked 2026-08-07
  from the clause-(h) lane's standing question, and it is a writer-side repair
  rather than a reader-side one. That entry's own verifier required the
  exemption to be "telemetry-backed"; the extension it named publishes no
  telemetry at all (`ctx.meta` in `identity-normalization.mjs`: 0 hits), so the
  dispatched lane had to make a design decision the entry had implicitly
  foreclosed. **What wrote it out of reach:** the clause form was read off the
  three existing INSTANCES rather than off each extension's actual surface, and
  that generator is still running — the next declared-exemption entry inherits
  the same assumption. The fix is one line at intake, in
  `docs/dev-loop.md` beside the conservation discussion, plus the corollary the
  lane proved: a declaration need not be an extension's SELF-REPORT, since a
  harness-measured effect is strictly harder evidence and avoids making a
  checker-side repair deployment-coupled. Done when both sentences are in the
  method file where an entry author reads before writing.

- **RECORD (ex-READY 2026-08-11) (small) — the matrix lint is blocked at SUITE time, one step after the
  prose is written.** Booked 2026-08-07 by the lane that built
  `--lint-matrix`, as its own named residual. The writer half now exists — an
  undeclared `## Event walk` is refused — but the refusal arrives at the next
  `npm test`, not at the edit, so a walk can be written, committed and read by a
  human before anything objects. Design: call `--lint-matrix` from `gate-live`'s
  sweep and give it a doctor verdict beside `backlogLint`, which is the same
  shape that file already carries for the backlog. Verifier, red-first: plant an
  undeclared walk, run the sweep, require the status file to carry the finding —
  today it carries nothing, because nothing asks.

- **RECORD (ex-READY 2026-08-11) (small) — a walk whose disposition is NOT-OURS or NON-DEFECT with
  `row=none` would read STATUS-UNREADABLE.** Named 2026-08-07 by the enum lane
  and deliberately not built, because widening the enum a second time was
  outside its decided scope. Neither token is in `STATUS_RULES`; no walk is in
  that state today (both such walks carry `row=4` or `cause=none`), so this is a
  latent case rather than a live one. Verifier, red-first: a fixture walk
  declaring `disposition=NOT-OURS row=none` must reach a real verdict, and today
  reads STATUS-UNREADABLE — a stop-here on a walk that needs no stopping, which
  is the exact defect the CONTROLLED-CAUSE entry just closed one token over.

- **RECORD (ex-READY 2026-08-11) — `CacheFixConfigDirDivergenceWarning`: tell a user who has set
  `CLAUDE_CONFIG_DIR` that our roots deliberately do NOT follow it, and where
  they actually resolve.** Booked 2026-08-08 afternoon at the request of the
  peer session that withdrew the parent design, and booked BEFORE that parent
  was re-graded — which is the only order that works. This warning existed as a
  subordinate clause inside the `key our roots by PROFILE` entry; that entry's
  headline design is withdrawn (`docs/directives/portable-state-roots.md` §7),
  so re-grading it — correct in itself — would have taken the warning with it.
  **It is now the WHOLE answer**, not a fallback: with `CLAUDE_CONFIG_DIR`
  refused as a root key, the warning is what tells a user that per-profile
  isolation and security relocation are available, and how (the explicit
  `CACHE_FIX_DATA_DIR` / `CACHE_FIX_STATE_DIR` overrides, which are OUR contract
  and cannot move under us). A carrier defect caught one step before it landed;
  the writer half — an amendment that should have been a split — is the lesson.
  **Design, complete, so nothing needs re-deriving:**
  - Fires in the WRAPPERS — `xdgData()` (`proxy/xdg-dirs.mjs:151`) and
    `xdgState()` (`:156`) — never in `resolveRoot` (`:141`), which stays pure
    and side-effect-free. That purity is what makes it testable, and it is the
    same reason `assertIsolated` sits in the wrappers.
  - Reuses the existing `warned` Set at `:192` — the legacy fallback's
    once-per-key mechanism. Do NOT add a second warn-once mechanism.
  - Condition: `CLAUDE_CONFIG_DIR` is set AND neither `CACHE_FIX_DATA_DIR` nor
    `CACHE_FIX_STATE_DIR` is set.
  - Text states four things: the variable is set; our roots deliberately do not
    follow it; where they actually resolve; and that the two `CACHE_FIX_*_DIR`
    overrides co-locate them.
  **Verifier, red-first, three arms, ALL required — the third is the one that
  matters.** FIRES: config dir set, no override → exactly one warning per root
  key (not per call). SILENT: config dir unset — this is the control that
  protects the live deployment, where neither variable is set. SILENT: config
  dir set WITH an override present — the over-firing control, because a warning
  that keeps firing after the user has already resolved the divergence trains
  them to ignore it, which is the check-that-fires-on-a-non-defect shape aimed
  at the one message we need read.
  Deployment-coupled: `proxy/**`, so it needs a dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) and a restart. Row 3: it touches neither
  state KEYS nor freeze logic — a warn-once side effect in a path wrapper — so
  the restart is cache-transparent, and that declaration is made HERE, before
  the restart, per the row's own rule.
  Unranked deliberately: booked after the 2026-08-08 afternoon derivation, and
  a rank is a re-derivation's to assign.
  <!-- entry: "CacheFixConfigDirDivergenceWarning" -->

- **RECORD (ex-READY 2026-08-11) (small) — a POINTER entry's liveness lives in ANOTHER repo, so this
  file's DONE-anchor guard cannot see it, and a POINTER can hold a rank forever
  after its work has shipped.** Measured 2026-08-08 afternoon on myself:
  `backlog-order.mjs` throws when a rank anchor resolves to a DONE-graded entry
  — it fired three times today and is the reason no stale rank survived — but it
  only reads THIS file's grade. A POINTER entry's body lives elsewhere by
  definition, so the fork entry stays `READY` no matter what that repo does, and
  the guard passes with a clean conscience. Two ranked entries in the current
  block are POINTERs; a third was in the previous block.
  **And the failure mode is not hypothetical — it is how I got it wrong in both
  directions in one hour.** I first carried the ❄-detector POINTER forward at
  Tier A rank 6 without checking the other repo (the midday handoff had said the
  cross-repo items shipped); then, when the operator asked, I discharged it from
  that same handoff SENTENCE rather than from the world; then the operator
  observed the class still firing and the check refuted the discharge. Three
  readings, none of them from the pointed-at repo, and the one that settled it
  was an md5 against the installed file.
  Design, decided: a POINTER entry names its target repo and an identifying
  string; a check resolves that repo's backlog and reports the target entry's
  grade beside the pointer, with the three-answer discipline — target RESOLVED
  (this pointer is stale) / target LIVE / COULD-NOT-RESOLVE with its reason
  (repo absent, string not found, ambiguous match). It runs where the other
  cross-file checks run, not in `gate-live`: this is a repo-state property, not
  a traffic property. Keep it a REPORT, not a blocker, until its false-fire rate
  over the current POINTER population is measured — a guard that blocks before
  anyone knows how often it fires on legitimate work is how a guard trains its
  reader to ignore it.
  **And "resolved there" is NOT "discharged here" — the check reports, the human
  grades.** That distinction is the whole lesson above: the ❄ pointer's target
  entries ARE shipped in the other repo, and the fork-side concern survived them
  anyway. A pointer whose target is RESOLVED is a prompt to re-read the fork
  entry's own premise against the world, never an instruction to grade it DONE.
  Verifier, red-first and available on committed history: run it over
  `git show ed76e61:BACKLOG.md` — the ❄ pointer must report target-RESOLVED
  (`8bfc385` shipped before that commit) while the fork entry there reads READY,
  which is exactly the divergence nothing currently detects. Negative control: a
  POINTER whose target is genuinely open must report target-LIVE, and a POINTER
  naming a repo that is not present must report COULD-NOT-RESOLVE rather than
  either.
  Consumer tier **3 (backlog and process)** — it mis-orders work and is
  recovered at the next derivation. Unranked (booked after the derivation).
  <!-- entry: "a POINTER entry's liveness lives in ANOTHER repo" -->

- **RECORD (ex-READY 2026-08-11) (small) — HALF (1) CAME BACK TO US 2026-08-10; half (2) stays with
  the dispatch-guards session. The scope below is now the dispatcher-side
  procedure ONLY.** Their disposition, with the instrument shown live on a known
  positive first (`shared` matches 13x and 10x across the two skills): `shared
  checkout` and `whole suite` both return ZERO hits across the plugin, so
  nothing there states this coupling today. The single `reclaim` hit is a
  DIFFERENT 2026-08-05 incident — an unused SESSION worktree auto-reclaimed
  mid-run kills Bash outright — and `worktree_doctor.py` covers a third, the
  16-worktree destructive sweep. Neither is this class.
  So half (2), the Write-boundaries sentence, is theirs and is the half they
  judge worth building. **Half (1) is unwritten and is ours — and it MOVED
  EARLIER the same hour, on evidence.** It was written as "the dispatcher probes
  `git worktree list` before ACKNOWLEDGING a lane's first report". That is too
  late by one step. The correct moment is BEFORE THE BRIEF IS WRITTEN, because
  the brief ASSERTS the isolation.
  **Measured 2026-08-10, on me, twice in one hour.** I wrote "You are in your own
  worktree; a concurrent lane owns X — do not touch it" into two briefs. Both
  were false: neither lane got a worktree, both ran directly in the shared main
  checkout alongside my own session. The `sonnet-test-glob-guard` lane found
  this itself and returned it as a gap rather than absorbing it — it ran
  `git worktree list`, saw only two `.claude/worktrees/agent-*` entries
  belonging to OTHER lanes, watched my own `BACKLOG.md` commits land live in its
  working tree mid-task, and hand-diffed every changed line before committing
  because it could no longer trust the isolation the brief had promised.
  **The class, and why it escaped the provenance rule I had just applied.** The
  same brief graded its factual claims carefully — the node discovery patterns
  were probed, the dependents list was a pasted command output. Then it asserted
  an ENVIRONMENT fact with no grade at all, because an environment fact reads
  like a decision the dispatcher is making ("you are in a worktree" sounds like
  an assignment) rather than a claim about the world that could be false. A
  dispatcher cannot assign a worktree by saying so. The costume is
  assignment-shaped, which is why nothing prompted the check.
  **What the false claim costs**, and it is not zero: it changes which commit
  safety checks the executor thinks it needs. An executor believing itself
  isolated has no reason to hand-diff before committing, and a pathspec commit
  in a shared copy is the one place that matters.
  Design, revised: the dispatcher probes `git worktree list` and compares the
  lane's cwd against it BEFORE composing the brief's isolation sentence, and
  writes what the probe returned — including "you are in the SHARED checkout,
  hand-diff before every commit" when that is the answer. The
  acknowledge-time probe stays as the second gate, for the reclaim-mid-run case
  the original entry describes.
  Verifier: a brief whose isolation sentence disagrees with `git worktree list`
  at dispatch time — exercised against a real dispatch that gets no worktree,
  which is now the OBSERVED default here rather than the exception, so the
  positive is free.

- **RECORD (ex-READY 2026-08-11) (small) — `git stash`/`pop` across a `git mv` desyncs the index, and
  `test/logs-schemas.test.mjs` reports it as an unrelated ENOENT.** Found
  2026-08-10 by the `sonnet-test-glob-guard` lane, self-inflicted and
  self-caught, reported rather than buried. It stashed to check whether a red it
  was seeing belonged to it (correct instinct — it did not; the red was my own
  in-flight `BACKLOG.md` edit, and the lane proved that by reproducing it on
  bare HEAD with its own changes stashed out). The `pop` split the rename into a
  staged ADD plus an unstaged DELETE, so `logs-schemas`' `git ls-files`-based
  sweep hit ENOENT on a path that no longer exists. Resolved by re-staging the
  deletion on one targeted path, never `-A`.
  Why it is worth a mechanism: the failure names a file the developer did not
  touch, in a test about something else, and the true cause is index state
  rather than any content — the diagnosis costs a detour every time, and the
  lane only got there because it had just been doing a rename and remembered.
  Design, decided: `logs-schemas`' sweep distinguishes "path missing from disk"
  from "path missing from the index", and says which — a three-answer verdict,
  not a two-answer one. No existing guard catches this class.
  Verifier, red-first: reproduce the split index (`git mv`, `stash`, `pop`), run
  the suite, and confirm the failure now names the INDEX desync rather than the
  file. Baseline stated: on a clean index the same check stays green.
  Consumer tier **2 (feeds the gates)**.
  Original entry follows unchanged.
- **RECORD (ex-READY 2026-08-11) (small) — a correction APPENDED to the end of an entry is invisible to
  everyone who reads the entry's head, and this repo's own entries are long
  enough that the head is what gets read.** Measured 2026-08-10, and it cost a
  dispatch: the retirement pass wrote `PREMISE CORRECTED` blocks by APPENDING
  them after each entry's body. Hours later the same session briefed a lane from
  one of those entries, read its head to write the brief's Background, and
  asserted the pre-correction premise as current fact. The correction sat at line
  29 of 36 — 78% in. The lane read the whole entry, found the contradiction,
  halted before touching a file, and returned the question. The guard worked and
  the dispatch was still wasted.
  **The class:** an entry is a document with a HEAD and a BODY, and a grade or a
  premise correction is a claim about the WHOLE entry. Placed at the end it
  becomes a label that the label's own readers never reach — the corpus's
  label-over-body drift, produced here by the correction format rather than by
  neglect. Appending is what a script does naturally, which is why this arrived
  as a mechanical habit rather than a judgment error.
  **What makes it worth a mechanism rather than a resolution:** the writer is
  still running. Every future pass that corrects entries in bulk will append
  unless something stops it, and the next reader will be a brief-writer under
  momentum — the exact conditions of this instance.
  Design, decided, two halves. (1) CONVENTION, in `docs/dev-loop.md` beside the
  entry-format rules: a grade change or premise correction is written
  IMMEDIATELY AFTER the entry's first bold claim, never appended — the reader who
  stops early must hit it first. (2) The computable slice, in
  `tools/backlog-lint.mjs` as a REPORT: a bullet containing a correction marker
  (`PREMISE CORRECTED`, `RE-GRADED`, `CORRECTED`, `WITHDRAWN`) past its first
  third is flagged. Report and not a gate, because a long entry may legitimately
  narrate several corrections in sequence; what is flagged is the FIRST one being
  late.
  **Verifier, red-first over an immutable reference and a TRUE positive:** run it
  over `BACKLOG.md` at `633256b` — the runbook-caveat entry must flag (correction
  at 78%), and the entries whose corrections the same pass placed early must not.
  Over-firing control: an entry whose ONLY correction marker sits in a quoted
  historical narrative must not flag.
  Done when the check fires on the frozen positive, and the next bulk correction
  pass writes its blocks at the head by construction.
  Consumer tier **3 (backlog and process)** — it mis-informs the reader of an
  entry, and its measured cost so far is one wasted dispatch.

- **RECORD (ex-READY 2026-08-11) — nothing in this repo distinguishes a checker that WORKS from a
  checker that is CALLED, so `npm test` green is not evidence that any
  instrument runs on real data.** Booked 2026-08-10; this is the structural
  finding under the review's seed observation 1, which asked whether a
  manifest of checkers-and-consumers beats case-by-case discovery.
  **Measured, not asserted.** A census over the stack classified **49
  mechanisms: REAL 13, SYNTHETIC-ONLY 16, MANUAL-ONLY 15, NO-CONSUMER 1** —
  31 of 49 never touch real data unattended. `npm test` at the same commit:
  2620 tests, 2615 pass, 0 fail, 5 skipped. The suite proves mechanisms WORK.
  Nothing proves they are USED, and the two failures are indistinguishable
  from inside the suite.
  **Why prose will not close this.** The rule is already written in this
  file, in `docs/dev-loop.md`, and it has been re-learned at least three times
  this month (the scope lint, the xdg guard, the absorption check). Each
  instance was caught by a human reading a report, which is exactly the
  recognition step that fails mid-flight.
  Design (decided): a derived meta-test, not a hand-maintained manifest — a
  hand-written list of checkers goes stale the first time someone adds one,
  which is the same label-over-body defect the checkers exist to catch.
  Enumerate executable checkers from the tree the way
  `test/logs-schemas.test.mjs:340-420` enumerates sources
  (`git ls-files tools` filtered to modules exporting a `main` or having a
  CLI entry), and assert each appears in at least one CONSUMER position:
  a `package.json` script, a `gate-live` invocation, a git hook, a systemd
  unit, or a test that calls its entrypoint over real tree data. Unreached
  checkers are a KNOWN-OPEN inventory **by path, never by count** — a count
  stops validating the day it legitimately grows.
  `test/logs-schemas.test.mjs:340-420` is the template in every respect and
  should be read before writing this: real sweep, self-verifying `mustMatch`
  exemption, a planted-case instrument-positive AND a real-file
  instrument-positive, `assert.ok(files.length > 50)` so a dead enumerator
  cannot pass as a clean sweep.
  Verifier, red-first: the meta-test must go red on `xdg-writer-guard.mjs`
  TODAY (it is the known positive, unwired at this commit); wiring it must
  turn that one row green while the rest of the inventory stays put.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "nothing distinguishes a checker that works from one that is called" -->

- **RECORD (ex-READY 2026-08-11) — `gate-status.json` grows without bound, the doc that says
  otherwise is why nobody noticed, and the fix is to SPLIT it, not to prune
  it.** Measured 2026-08-10: **571,997 bytes** against the ~200 KB
  `docs/dev-loop.md` recorded as a steady state (2.9x); **103 rows** against
  **70 captures on disk**; **41 of 103 rows name a capture that is gone**
  (negative control: the other 62 resolve, so the orphan count is not a
  matcher artifact). `grep -nE 'prune|MAX_ROWS|retain' tools/gate-live.mjs`
  returns nothing. Rows do not track the capture count — the file is
  monotonic in cumulative captures ever seen.
  The doc's sentence has been corrected in place (`docs/dev-loop.md`, the
  "Never Read that status file whole" block), because a load-bearing measured
  number that is 2.9x stale is what makes the growth invisible.
  **The inversion is the design.** Those 41 orphaned rows are precisely what
  closing-gate question 2 demands of a recurring producer: evidence that
  outlived its capture. Pruning them to shrink the file would delete the
  answer to the question the gate exists to ask. Split instead: a small
  `gate-status.json` snapshot (ok / failing / current rows) that the doctor
  and `jq` read, plus an append-only `gate-evidence.jsonl` that nobody `Read`s
  whole and nothing prunes.
  Verifier: after the split, `stat -c%s` on the snapshot stays under the Read
  tool's cap across a week of gate runs while the evidence file's line count
  strictly increases; and the 41 currently-orphaned rows survive the
  migration (count them before and after — a migration that "cleans up" is
  the failure mode).
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "gate-status.json grows without bound; split it, do not prune it" -->

- **RECORD (ex-READY 2026-08-11) (small) — `backlog-lint` reports clean on a `## ` heading split
  across two lines, and 82 entries were filed under a phantom section because
  of it.** Found and repaired 2026-08-10. `BACKLOG.md` carried
  `## Upstream PR round — booked 2026-08-05; the round below is CLOSED,` on
  one line and `## current state is the first entry` on the next: ONE logical
  heading, TWO `## ` lines, so every section-scoped parser saw two sections
  and 82 entries sat under a heading that is a sentence fragment.
  `node tools/backlog-lint.mjs BACKLOG.md` → `backlog-lint: clean`, before and
  after. The heading is now joined; the lint gap is not.
  Design (decided): add a predicate to `backlog-lint` — a `## ` line whose
  text begins lowercase, or whose predecessor `## ` line ends in a comma or
  conjunction, is a WRAPPED-HEADING finding. Both halves, because either
  alone is escapable.
  Verifier, red-first, and the baseline is stated: the lint is GREEN on the
  current file, so re-introduce the exact two-line form from
  `git show HEAD:BACKLOG.md` and confirm the new predicate fires on it; then
  confirm it stays silent on every other `## ` heading in the file (the
  over-fire half — a lint that flags legitimate headings trains the override
  reflex).
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "backlog-lint reports clean on a heading split across two lines" -->

- **RECORD (ex-READY 2026-08-11) — `tools/logs.mjs` shipped as "one strict reader owning every
  on-disk schema" and has ZERO adopters; 14 tools still hand-parse the
  formats it owns.** Measured 2026-08-10, the day it landed
  (`f7e52dd` + `4c9ae88` + `17e0a14`). Importers of `tools/logs.mjs`:
  `tools/logs.mjs` itself and `test/logs-schemas.test.mjs` — nothing else.
  `grep -lE 'gate-status|usage\.jsonl|-events\.jsonl|captures/' tools/*.mjs`
  → **14 files**.
  The module is correct and tested. It simply does not yet do the job it was
  built for, and `docs/dev-loop.md:100-105` describes it in the present tense
  as though it does — which is how a mechanism becomes a paraphrase of itself.
  This is the same shape as the xdg-guard entry above and is the second
  instance behind the checker-consumer meta-test; both are listed because the
  meta-test will not migrate call sites.
  Design (decided): migrate the 14 hand-parsers to `logs.mjs` one commit per
  file, then let the existing scope lint go BLOCKING on the schema field
  names appearing outside the owner. Order matters — the lint before the
  migration is a guard that fires on legitimate work 14 times.
  Verifier: after each migration commit the sweep in
  `test/logs-schemas.test.mjs:340-420` moves exactly one path out of its
  KNOWN-OPEN inventory; the inventory is by path, so the count cannot drift
  silently.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "tools/logs.mjs shipped with zero adopters" -->

- **RECORD (ex-READY 2026-08-11) — the public-surface split: UNTRACK IN PLACE, do not move the
  files; and two of the four premises the decision was built on are refuted.**
  Booked 2026-08-10 from the review of `FABLE-BRIEF-public-surface-and-systems-
  review.md`. The proposal was to move ~33 fork-only documents into a private
  `cache-fix-ops` repo.
  **Refuted premise 1 — "6 merged, 3 open" upstream PRs.** Real count:
  **10 merged, 3 open, 1 closed** (`gh pr list --repo
  cnighswonger/claude-code-cache-fix --author Gunther-Schulz --state all`).
  **Refuted premise 2 — decision #2, "`docs/dev-loop.md` stays public because
  an open upstream PR body references it".** Only **#276** references it, and
  its own line reads "Optional — happy to drop it if you'd rather keep docs
  lean." Zero PR-body hits for BACKLOG / FORK-NOTES / runbooks / audits /
  matrix. The stated basis for keeping dev-loop public does not hold — it
  should stay public for a different and stronger reason: **82 of its
  citations sit in `tools/`, which #276 upstreams.**
  **The permalink probe, executed with a negative control**, and it cuts both
  ways: a file deleted in `76658d8` is still served at its parent SHA
  `7553466` — raw HTTP **200**, blob page HTTP **200** — while the same path
  at `main` is HTTP **404**. So moving files buys nothing retroactively; only
  the forward write stream changes. Decision #4 (no history rewrite) already
  accepted that, but the move was being priced as if it bought more.
  **The measured cost of moving.** 144 citations in PUBLIC source would dangle
  into a private repo; 12 of the 94 citing files already exist in upstream's
  tree. `tools/bust-triage.mjs:77` hardcodes the threat matrix path and
  degrades SILENTLY: probed with a positive control, `matrixRow(4, <real>)`
  returns the row and `matrixRow(4, <moved>)` returns `null`;
  `eventWalks(<real>)` returns 5 and `eventWalks(<moved>)` returns 0 — every
  event becomes UNCLASSIFIED with no error. `required-reading-gate.py` is
  **fail-open by design** (its own docstring: roster absent → ALLOW, SILENT),
  so moving `FORK-NOTES.md` silently disables half the gate.
  **What the operator's bar does to this whole question: it largely dissolves
  it.** The 120 MB of fixtures — the largest and most alarming part of the
  public surface — measure clean (entry above). The 52 fork-only documents are
  cache-fix dev chat by construction, which the bar explicitly permits. The
  33-file move solves a problem that does not exist.
  Design (recommended, operator's call): **untrack in place.** Make
  `cache-fix-ops` the HOME and deploy back to the same in-tree paths through
  the existing `DEPLOYED_COPIES` mechanism in dotfiles' `bootstrap/manifest.py`
  — the same mechanism that already deploys `CLAUDE.local.md` and
  `.claude/required-reading.json` here. Every path stays where every tool,
  citation and gate expects it; nothing dangles; nothing degrades silently.
  Use a TRACKED `.gitignore`, not `.git/info/exclude` — the latter does not
  travel to a fresh clone, which is the whole failure mode being guarded
  against.
  **DECIDED 2026-08-10 — UNTRACK IN PLACE, priority LOW** (operator, standing
  go on the recommendation). Low because the bar's content half is met in the
  tree, so the move buys hygiene rather than protection; the design above is
  what gets built when it is picked up, and no part of it waits on further
  evidence.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "public-surface split: untrack in place, do not move the files" -->

- **RECORD (ex-READY 2026-08-11) — an instrument that separates MITIGATION-WORKED from
  MITIGATION-RAN. Today three instruments all report engagement and none
  reports outcome, so a live question had two surviving readings and nothing
  to decide between them.** Part B seed 2 of the 2026-08-10 review, booked
  because the review closed without reaching it and an unbooked seed dies
  with the session that read it.
  The observed case: a 263k bust triaged to a clean attribution, and the
  mitigation question could not be answered at all. `mutatedBy` proves an
  extension RAN. `absorptionMisses` returned 0. The wire still showed the
  array growing. Reading A — the mitigation worked and the growth is the
  API's own price. Reading B — the mitigation ran and did nothing. Both fit
  every number available.
  **The class, stated so it is not re-learned per instance:** a counter of
  invocations is a liveness probe, not an outcome probe, and a zero from a
  miss-counter is the non-event shape — a dead detector returns it too. The
  stack has several of these and they read as outcome evidence because they
  sit beside outcome questions.
  Design (decided): the outcome instrument is a COUNTERFACTUAL, not another
  counter — replay the same pair with the extension disabled and diff the
  wire bytes against the mitigated run. `tools/replay.mjs` already replays a
  serving config, so this is a second config and a diff, not new machinery.
  Reading A predicts a difference; reading B predicts byte-identity. That is
  the discriminating measurement the two readings lacked.
  Verifier, red-first: run it on the 263k case, where the answer is currently
  unknown — and BEFORE trusting either result, run it on a pair whose outcome
  is already known (a mitigation whose effect is measured), because a
  counterfactual harness that silently replays the same config twice returns
  byte-identity for both readings and looks like reading B.
  Consumer tier **1 (event disposition)** — it decides whether a matrix row
  is mitigated.
  <!-- entry: "an instrument that separates mitigation-worked from mitigation-ran" -->

- **RECORD (ex-READY 2026-08-11) (small) — dispose of `FABLE-BRIEF-public-surface-and-systems-review.md`
  at the repo root: it is a spent brief, and its own header's reason for
  existing untracked has expired.** Booked 2026-08-10 by the session that
  executed it, because naming a loose end is not disposing of it.
  The file says it is "UNTRACKED on purpose — it argues about what to
  un-publish, so it does not publish itself while that decision is open." That
  decision is now CLOSED (untrack-in-place, LOW priority — its own entry
  above), and every finding the brief commissioned is booked: Part A as the
  public-surface entry, Part B seeds 1/4/6 as the checker-consumer,
  derived-view and record-drift entries, seed 2 as the mitigation-outcome
  instrument, seed 3 shipped by `e9a374b`, seed 5 answered in its own entry.
  So the brief is spent, not pending.
  Design (decided): MOVE it to `docs/directives/`, do not delete. Two reasons,
  and the second is why this is an entry rather than an act. (1) File roles:
  `docs/directives/` is where persisted briefs of substantial dispatched work
  live, and this is one. (2) Deleting an untracked file is IRREVERSIBLE — git
  holds no copy — and it is the operator's own input document, not this
  session's artifact. An irreversible act on someone else's file is exactly
  the kind that gets confirmed rather than assumed.
  Note before moving: `docs/directives/` is TRACKED and this repo is public,
  so the move publishes it. Read it against the publication bar first
  (`CLAUDE.local.md`) — it quotes measurements and PR counts, and a spot check
  found no capture ids in it, but the check belongs to whoever moves it, not
  to this entry. If it fails that read, delete instead and record which.
  Done when: the file is under `docs/directives/` and committed, or deleted
  with the reason recorded in this entry's closure line.
  Consumer tier **3 (backlog and process)**.
  <!-- entry: "dispose of the spent FABLE-BRIEF at the repo root" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — the PR-round doorbell cannot be answered by ANSWERING:
  its predicate reads our last COMMIT, so a round whose correct reply is a
  question stays open forever.** Found by using it minutes after both rounds
  were answered: `--dry-run` reported #306 closed and **#276 still open**,
  although our comment (17:47:15Z) is the last activity on the thread and
  there are no reviews. The predicate is `lastExternal.at > ourLastPush` with
  `ourLastPush` taken from the PR's COMMIT dates (`tools/pr-rounds.mjs`, the
  `rounds.push` guard) — comments of ours are filtered out of the event list
  entirely, so they cannot close anything. #306 closed only because that round
  happened to end in a push.
  **Wrong in BOTH directions, which is what makes it a defect rather than a
  strict reading.** A push with no answer to their findings CLOSES the round;
  an answer with no push does not. #276's answer is deliberately comment-only
  — we asked upstream which sequencing they want before force-pushing the
  branch twice — so the correct state of that round is "ball with upstream"
  and the tool says the opposite.
  **Why this is urgent rather than tidy:** the dotfiles entry to build the
  READER is READY and would be built against this predicate. A doorbell that
  keeps ringing after the door was answered trains the operator to ignore it —
  the fires-on-a-non-defect shape, arriving on the one instrument whose
  silence already cost eight days.
  **Design, decided:** the ball is with us iff the last NAMED activity on the
  PR is theirs. Compare `lastExternal.at` against
  `max(ourLastPush, ourLastComment)` — our own comments come back into the
  event list for the max, while staying excluded from `lastExternal`. Same
  trust we already place in a push, and it is what a human means by "our
  court".
  Red-first: #276 as it stands today is the live positive — the tool must go
  from reporting it open to reporting no open rounds, with no other round's
  verdict moving. Pin it as a fixture (a synthetic events/commits pair in both
  orders), because the live case dissolves the moment either side pushes.
  Done-criterion: a round answered by comment alone reports closed; a push
  that answers nothing does NOT close a round whose last external event
  postdates it.
  Loop stage: VERIFY.
  Anchor: tools/pr-rounds.mjs
  Write-set: tools/pr-rounds.mjs, test/pr-rounds.test.mjs
  Verifier: the fixture pair above, plus `--dry-run` against the live #276
  <!-- entry: "pr-rounds predicate reads commits, not answers" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — CC #82642 got an independent second measurement today;
  ours adds the numbers our own filing never carried, and it is short.**
  **THIS HEADLINE SAID "ours would make it a third platform" UNTIL
  2026-08-14, AND THAT PHRASE REACHED A PUBLIC COMMENT.** It is false and was
  falsifiable from our own filing: the issue is ours, filed from LINUX, so
  linux is platform one and the macOS corroboration is platform two — our
  measurement is a second data point on the FIRST platform, not a third
  platform. Our own 2026-07-29 comment on the sibling issue states the setup
  in its first sentence ("CC 2.1.220, linux"), so nothing had to be measured
  to catch this; the entry's own words simply went unchecked against the
  thread they describe. The published comment opened "Third platform" on the
  strength of this line and was corrected in place the same day. The reader
  fix is the correction above; the WRITER fix is this line, because an entry
  that phrases a claim wrongly hands it to whoever drafts from it, and
  drafting from the entry is exactly what the entry is for.
  `anthropics/claude-code#82642` (PreToolUse denials discard `decisionReason`)
  is ours, filed 2026-07-30. Today another user posted a corroboration from a
  different platform: 48,404 `PreToolUse:Bash` attachments across 601
  transcripts on macOS — `allow` 47,081, `ask` 1,279, **`deny` 0** — against
  132 denials visible only as error tool-results, and on one hook's 92
  denials the `allow` rows sitting on those same calls belong to a DIFFERENT
  hook in the chain, so a denied call reads as decided by someone else.
  **Why ours adds something rather than repeating:** different OS (linux),
  and this machine's guards deny regularly and deliberately — the
  dispatch-guards set has fired denies this week that we can point at. Same
  parse over `~/.claude/projects/**/*.jsonl` here gives the third data point,
  and a version stamp newer than either existing one.
  **Design, decided:** one pass over `~/.claude/projects/**/*.jsonl` that
  reports three counts and nothing derived — `PreToolUse:*` attachments,
  decisions parsed out of each attachment's `stdout` grouped by kind
  (`allow`/`ask`/`deny`/empty), and denials visible only as `tool_result`
  error text. Grouped by hook name as well as in total, because the macOS
  comment's sharpest finding is per-hook: an `allow` from one hook in the
  chain sits on a call another hook denied. It ships as a script under
  `tools/` rather than a scratch one-liner — a probe used twice graduates
  there, and this is the second time this repo has parsed that tree.
  Done-criterion: the three counts measured on this machine, the parse stated
  so a reader can re-run it, drafted as a comment.
  **Red-first, and the positive control is already on disk:** this session's
  own fused-push denial (`dispatch-guards/push-claim-reminder`, 2026-08-14)
  is a known deny — the parse must SEE that call among the denials-visible-
  only-as-text, or it is measuring nothing. A zero over an unproven parse is
  the absence-read-as-clean shape.
  OPERATOR GO BEFORE POSTING — draft only.
  **MEASURED 2026-08-14; the tool is shipped and the draft is written. Only
  the posting is outstanding.** `tools/hook-decision-census.mjs` +
  `test/hook-decision-census.test.mjs` (`7658ab4`, dispatched lane; desk
  corrections `341dede`). Over 979 transcripts, CC 2.1.232: 6,171
  `PreToolUse:*` attachments, **deny=0**, against **1,567** denials visible
  only as tool_result error text. The positive control named above appeared
  (`push-claim-reminder`, 137 hits), so the parse measures something real.
  **The desk grading found two numbers whose denominators nobody stated, and
  both would have gone into a public comment wrong.** (i) 6,171 is NOT the
  decision denominator — 3,333 attachments carry no `stdout` at all and reach
  no classifier, which is a different absence from the 2,693 that carry
  stdout and no `permissionDecision`; `decisions.classified` /
  `decisions.noStdout` now state it and the suite pins
  `classified + noStdout == total`. (ii) The lane reported honestly that its
  two denial-text signatures were "not proven exhaustive" — a hedge measures
  nothing, so it is now counted: **134** error results mention a hook and
  match neither signature, which makes 1,567 a FLOOR. Red-first for both,
  arrangement stated: 29/29 green on the new code, and with the old blob
  restored exactly the four new bites fail while all 25 pre-existing pass.
  **A SECOND, SHARPER FINDING the brief did not ask for, and it is a
  DECISION rather than a booking:** 1,339 of the 1,567 have NO PreToolUse
  attachment on the call at all — not a discarded `decisionReason`, no record
  of any kind; for `message-payload-gate` (denying `SendMessage`) it is
  1,061 of 1,061. #82642 as filed names only the discarded-reason tier. Open
  question for the operator: does this ride in the same comment (drafted that
  way) or become its own issue? Drafted, not posted.
  Draft: scratchpad `draft-cc82642-comment.md`, absence-scan clean with both
  classes proven live on that file first.
  Loop stage: SEE.
  Anchor: tools/
  Write-set: tools/ (the probe), plus the comment draft
  Verifier: the probe's own output on this machine, with the known-deny
  positive control named above appearing in it
  <!-- entry: "add our linux numbers to CC 82642" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — the READY-bar and the boundary resolver read the SAME
  `Write-set:` slot with DIFFERENT grammars, so an entry can pass the bar and be
  invisible to the lane derivation.** Measured by walking into it 2026-08-14: three
  entries booked at the desk carried a well-formed `Write-set:` line naming real
  files, passed `lintReadyBar` clean, and every one came back
  `no-resolvable-boundary`. Cause, at file:line: `censusFiles`
  (`tools/backlog-lint.mjs:655-669`) harvests paths ONLY from inline-code spans
  (`CENSUS_INLINE_CODE`), so a bare `Write-set: tools/foo.mjs` yields `files: []`
  and therefore an empty realizing boundary — while the READY bar accepts the same
  bare line as present and well-formed.
  **Why this is worth a mechanism and not a style note.** The boundary slot exists
  so that batching, merging and parallel dispatch are a mechanical JOIN over
  entries instead of a judgment pass over their prose. An entry invisible to the
  join does not fail loudly — it silently drops out of every lane derivation and
  reads as unbatchable, which is indistinguishable from an entry that genuinely
  names no boundary. That is the quiet direction of a drifting check: it stays
  green while exercising less than it claims.
  **The two-instrument shape, recorded because it is the general lesson:** two
  checks over one slot agreeing on the VERDICT ("this entry has a write set")
  while disagreeing on the GRAIN (backticked vs bare) is the shared-coordinate
  failure — they were never comparing the same thing, and the disagreement only
  surfaced because one of them happened to fire.
  Design, decided: the READY bar's `Write-set:` check and the boundary resolver
  read the slot through ONE shared parser, so the two cannot diverge again —
  derive it from the slot line, not from a second regex over the body. Where a
  path is cited only in prose, the backtick requirement stands; where it is on the
  `Write-set:` line, backticks are optional and the parser strips them.
  Red-first, and the two must DIFFER: an entry with a BARE `Write-set:` naming two
  real files must resolve to those two files (today it resolves to none), and an
  entry whose `Write-set:` names only dead paths must still report unresolved.
  Done: one shared parser serves both checks; a bare `Write-set:` naming two real
  files resolves to those two files; an entry whose `Write-set:` names only dead
  paths still reports unresolved; `node tools/backlog-lint.mjs` reports no NEW
  boundary finding against today's 11; this entry moves to `## Done` with its ref.
  Loop stage: VERIFY.
  THIRD RECORDED INSTANCE of the `path:line` anchor defect, and it was booked
  before I hit it: this entry originally read `Anchor: tools/backlog-lint.mjs:655`
  and the READY bar fired `ANCHOR-UNRESOLVED` on it, because `lintReadyBar`
  resolves a non-`row N` anchor with a bare `pathExists(value)`. The entry
  describing that defect calls itself the second instance; this is the third, and
  the two entries should be built together — same file, same slot-parsing fix.
  Anchor: tools/backlog-lint.mjs
  Write-set: `tools/backlog-lint.mjs`, `test/backlog-lint.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/backlog-lint.test.mjs
  <!-- entry: "ready-bar and boundary resolver read the write-set slot with different grammars" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — `cache-control-normalize` (order 400) strips the marker's
  `ttl` and `ttl-management` (order 500) puts it back, and NEITHER FILE SAYS SO.**
  Found by the forwarded-TTL lane while refuting the downgrade hypothesis, and it
  is worth more than the refutation: the cited defect at
  `cache-control-normalize.mjs:53-56` is REAL IN ISOLATION — it reapplies
  `{ type: "ephemeral" }` with no `ttl` — and is neutralised only because
  `ttl-management` (order 500) injects `ttl:"1h"` into every ephemeral marker
  missing one, across `body.system` and every `messages[*].content[*]` block.
  Measured 2026-08-14 over all six pairs of the 2026-08-13 burst under the SERVING
  gate set: forwarded tail marker is `{"type":"ephemeral","ttl":"1h"}`, byte-identical
  to CC's own, and the full forwarded bodies are byte-identical between the
  extension-enabled and extension-disabled arms. Ordering has been stable since
  `b4c5fe8` (2026-04-21), so this is not a recent fix masking a bug.
  **Why this is a build item and not a note.** The coupling is invisible at both
  ends. A session reading `:53-56` sees a marker shipped without its `ttl` and
  "fixes" it — now 500 is injecting into an already-correct marker. A session
  retiring or reordering `ttl-management` silently ships a 1h->5m downgrade on
  every request, and no gate would catch it: `prefix-diff` compares our forwarded
  body to our PREVIOUS forwarded body, so a mutation applied identically every
  request is invisible to it by construction.
  Design, decided: a one-line comment at each end naming the other and the
  invariant (`400 strips, 500 restores; changing either without the other changes
  the wire`), plus a bite that asserts the FORWARDED tail marker carries a `ttl`
  after the full pipeline — the assertion is on the wire value, not on either
  extension's own output, so it survives a refactor of either.
  Red-first, and the two must DIFFER: with `ttl-management` disabled the bite must
  go red (marker forwarded without `ttl`); with the serving set it must pass.
  Done: both comments present and naming each other's order number and the
  invariant; the forwarded-marker bite passes under the serving set and goes red
  with `ttl-management` disabled, both outputs pasted; pin bumped and restarted;
  this entry moves to `## Done` with its ref.
  Loop stage: VERIFY.
  Anchor: proxy/extensions/cache-control-normalize.mjs
  Write-set: `proxy/extensions/cache-control-normalize.mjs`, `proxy/extensions/ttl-management.mjs`, `test/ttl-forwarding.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/ttl-forwarding.test.mjs
  DEPLOYMENT-COUPLED: `proxy/**` — needs a dotfiles pin bump (`git rev-parse --short HEAD:proxy`) and a restart. Comment-only, so row 3 transparency holds.
  <!-- entry: "cache-control-normalize strips the ttl and ttl-management restores it, undocumented" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-15 — #276's `fallback RED` meta-test counts SKIPS in another
  file, so it broke when that file grew a second test; it is red in CI now and
  a rebase will not clear it.** Diagnosed today from the CI log of run
  31103225337 (job 92621747522), the second of #276's two failures. The first
  (`source: every UUID ... is on the synthetic allowlist`) leaves with the
  scanner when it moves to #306; THIS one survives any rebase, so it is the
  half that is actually owed.
  **The defect:** `test/harvest-pin.test.mjs:264` runs
  `mitigation-output-form.test.mjs` as a subprocess with both capture and
  fixture pointed at nonexistent paths, then asserts `/# skipped 1/`. Actual
  output is `# skipped 2` — the target file holds two tests, and node reports
  the one excluded by `--test-name-pattern` as a skip too
  (`# SKIP test name does not match pattern`). The assertion pinned a count it
  does not own: the number of tests in a DIFFERENT file. It passed when written
  and stopped being true when that file grew, with nothing in either file
  announcing the coupling.
  **Design, decided:** assert the OUTCOME, not the tally. Keep
  `/COULD NOT VERIFY/` and `/# fail 0/`, and replace `/# pass 0/` and
  `/# skipped 1/` with a match on the specific subtest line — the real-pair
  test named, carrying `# SKIP` and the COULD-NOT-VERIFY reason. That is what
  the check exists to prove, and it is invariant under the target file gaining
  or losing unrelated tests.
  **Red-first arrangement, and the two must DIFFER:** add a third test to
  `mitigation-output-form.test.mjs` (or stub one in a fixture copy) — the
  current assertion must fail on the skip count while the outcome-shaped one
  passes; then point the fixture override at a REAL fixture and the
  outcome-shaped assertion must fail, since COULD NOT VERIFY no longer appears.
  An assertion green on both arms is matching the file running at all.
  Note the same brittleness in the sibling `fallback GREEN` test at :274,
  which asserts `/# pass 1/` — same class, same file, fix together.
  Done: both arms hold, #276's CI shows this test green, and this entry moves
  to `## Done` with its commit ref.
  Loop stage: BUILD.
  Anchor: test/harvest-pin.test.mjs
  Write-set: test/harvest-pin.test.mjs
  Verifier: node --test test/harvest-pin.test.mjs
  Lands on branch `pr/verification-tools` (#276), where the red is; the file
  exists on main too, so the anchor resolves either way.
  <!-- entry: "harvest-pin fallback RED counts skips in another file" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — the schema-scope sweep is a literal per-line regex, so
  it fires on a CONSUMER's own output field names and "adopt the reader" cannot
  clear it.** Returned by the logs-view lane, which had to rename
  `duplicate-billing`'s own `captureUsage.cacheRead`/`cacheCreation` output keys
  to `cacheReadTokens`/`cacheCreationTokens` before the sweep would go green —
  not because it hand-parsed anything (it no longer does), but because the word
  appears in the file. The rename is harmless and was the right unblock; the
  sweep's reach is the defect.
  **Why it will keep firing:** every future consumer that ADOPTS the reader
  inherits this, and the fix each time is to rename that consumer's own
  vocabulary — which is the guard shaping the code rather than checking it, the
  fires-on-legitimate-work shape `docs/dev-loop.md` names. The next author will
  read a red on a file that does exactly what the rule asks.
  **Design, decided:** the sweep skips a line whose schema word is a WRITE — an
  object-literal key or a property assignment in the consumer's own output
  construction — and keeps firing on a READ of another format's field. Where
  that distinction is not cheaply computable per line, the fallback is a
  declared exemption the sweep itself verifies (the shape this repo already
  requires of a guard that fires on legitimate work): the consumer names the
  key, the sweep asserts the file no longer hand-parses.
  **Red-first arrangement, and the two must DIFFER:** restore
  `duplicate-billing`'s original output key names and the sweep must stay
  SILENT (they are its own writes); plant a genuine cross-schema read
  (`rec.cache_read_input_tokens` off a capture outcome) and it must still FIRE.
  A change that silences both has removed the check.
  Done: `duplicate-billing`'s output keys can carry the repo's natural names
  again with the sweep silent, a planted cross-schema read still fires, and no
  future adopter has to rename its own vocabulary to go green; this entry moves
  to `## Done` with its commit ref.
  Loop stage: VERIFY.
  Anchor: test/logs-schemas.test.mjs
  Write-set: test/logs-schemas.test.mjs, tools/duplicate-billing.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/logs-schemas.test.mjs
  <!-- entry: "the schema-scope sweep fires on a consumer's own output field names" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-14 — three fields the census-rows prototype carries are
  computed NOWHERE in the census tool, so the shipped document substitutes
  arithmetic for them.** Returned as a question by the census-rows lane, which
  found `wrapperSegments`, `strippedSegmentsEqualRecon` and `candidateIndex` in
  the hand-built prototype (`test/fixtures/harvested/census-rows/census-rows-2026-08-14.json`)
  and absent from `tools/reminder-migration-census.mjs` (grepped). Reproducing
  them meant re-deriving census-internal logic outside its owning file, which
  its write boundary forbade and which would have been the second
  implementation of an identity this repo has already paid for three times. It
  substituted `remainderChars` (`candidateChars - reconChars`, pure arithmetic)
  and said so.
  **The lesson under it, worth more than the three fields:** a brief that names
  a hand-built prototype as "the schema" is naming a label over a body nobody
  checked against the live producer — the drift class, arriving through the
  door marked "use the existing shape". Verify a prototype's field names
  against the writer before treating it as a contract.
  **Design, decided:** the census tool EXPORTS the three, computed where the
  wrapper reconstruction already happens (`analysePair`'s mismatch branch), and
  the sweep's document carries them instead of `remainderChars`; the prototype
  is then a real sample of the shipped schema rather than a wish.
  **Red-first arrangement:** a synthetic wrapper-retained pair whose segment
  count is known by hand asserts `wrapperSegments`; against the current tool the
  field is absent and the bite fails at its own call site. Live control: the 16
  real MISMATCH occurrences must all carry a non-zero `wrapperSegments`, since
  every one of them is the wrapper-retained form by measurement.
  Done: the three fields are computed by the census and ride the sweep's
  document, `remainderChars` is retired or kept deliberately with a stated
  reason, and the committed prototype is regenerated from a real run so it is a
  sample rather than a wish; this entry moves to `## Done` with its commit ref.
  Loop stage: ATTRIBUTE.
  Anchor: row 4
  Write-set: tools/reminder-migration-census.mjs, tools/gate-live.mjs, test/census-mismatch-rows-export.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/census-mismatch-rows-export.test.mjs
  <!-- entry: "three census-rows prototype fields are computed nowhere in the census tool" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-13 — MEASURE THE FORWARDED TTL: CC sends `ttl:"1h"` on
  every marker and `cache-control-normalize` rewrites the tail marker to
  `{ type: "ephemeral" }` with no `ttl`. If that reaches the wire we are
  downgrading a 1-hour breakpoint to 5 minutes on every request. This is
  the last unmeasured layer of the Georgendorf burst and the only remaining
  candidate that is OURS.** This is the decisive next step of the walk in
  the RECORD entry above; nothing else in the raw body varies.
  **What is already measured, so the next lane does not redo it.** Across
  all six busting pairs, at the raw pre-pipeline tap: `model`, `system`,
  `tools`, `metadata`, `max_tokens`, `thinking`, `context_management`,
  `fallbacks`, `output_config` and `stream` all IDENTICAL to the
  predecessor; messages `append-only` (`censusPair`); marker VALUES
  identical including `ttl:"1h"` on all three. The single differing
  top-level key is `diagnostics.previous_message_id`, same length both
  sides, which changes on every request busting or not. So CC changed
  nothing that could invalidate a prefix — and the request still read ZERO.
  **The unmeasured layer, stated precisely.** `cache-control-normalize.mjs`
  (order 400, live) strips every `cache_control` from user messages and
  re-applies `{ type: "ephemeral" }` — literal, no `ttl` — at the last user
  message's last block (`:53-56`). CC's marker there carried
  `{"type":"ephemeral","ttl":"1h"}`. Nobody has read what we actually
  forward. `prefix-diff` recording `system: match / tools: match` does NOT
  answer it: that compares our forwarded body to our PREVIOUS forwarded
  body, so a mutation we apply identically every request is invisible to it
  by construction — a stable wrong value matches a stable wrong value.
  **Design, decided:** replay the six pairs through the SERVING config and
  run `breakpoint-scan --values` on the pipeline OUTPUT, not on the capture.
  The serving gates come from `/health`, never from defaults — a green
  verdict over the wrong configuration is worse than no verdict. There is
  no persisted post-pipeline body by design (`request-capture` is order 60,
  deliberately pre-pipeline), so the body must be produced by replay
  (`replay.mjs`, or `cache-sim.mjs --pipeline`).
  Red-first arrangement, and the two must DIFFER: run the same pair with
  `cache-control-normalize` DISABLED and with it enabled. Enabled must show
  the tail marker's `ttl` absent (or show it preserved, which kills the
  hypothesis); disabled must show `ttl:"1h"` surviving from CC's input. If
  both arms agree the extension is not the mutator and the hypothesis dies
  there — which is a result, not a failure.
  **RE-GRADED 2026-08-13, same session, ~20 minutes after booking — the
  headline above is DEMOTED and the word "only" in it is withdrawn.** Two
  things landed after it was written, and neither needed the forwarded
  measurement to bite.
  *One — the intermittency argument, which is decisive on its own.*
  `cache-control-normalize` has no per-request variation available to it: it
  is order 400, always enabled, and its one early exit is
  `markerCount === 0`, which never fires here because CC places a marker on
  the last user message of every request in the window (measured, 22 of 22).
  So it rewrites the tail marker identically on EVERY request — and only 6
  of roughly 200 requests in that session missed. A mechanism that behaves
  the same on all of them cannot be the discriminator between the ones that
  hit and the ones that did not. The TTL-expiry route is closed separately
  by arithmetic: a 5-minute entry cannot expire across the 11-second and
  13-second gaps actually observed before the busts.
  *Two — the header measurement came back NEGATIVE.* `anthropic-beta` is
  byte-identical across every busting pair, and carries
  `extended-cache-ttl-2025-04-11`, `prompt-caching-scope-2026-01-05` and
  `cache-diagnosis-2026-04-07` on the warm predecessor and the busting
  request alike (capture lines 1874–1886, 1913, 1915). The suspicion that a
  dropped beta header explained it dies there, at the pre-pipeline tap.
  *And a premise the entry leaned on was already contradicted in our own
  source.* `tools/replay.mjs:1740-1752` states this repo's measured model:
  the API keys its cache on CONTENT and reads a `cache_control` marker as
  the designation of a WRITE POINT, so a marker moving as the conversation
  grows re-bills nothing — with a corpus measurement behind it. Under that
  model a marker's own value is not the cache key, which is exactly what the
  ttl story needed it to be. That comment predates this walk by a week and
  went unread until after the entry was booked; reading the code the entry
  was about would have cost less than writing it.
  **What the entry is still worth, at its reduced weight:** the forwarded
  layer genuinely has never been read, the measurement is cheap, and a
  NEGATIVE result there is what converts "nothing we send explains it" from
  an inference into a measurement. Keep it as a completeness check, not as
  the leading candidate.
  **Where that leaves the class: everything CC sends is identical and our
  own logs are clean, so the honest disposition is COULD-NOT-ATTRIBUTE
  pending the forwarded read** — body identical on ten top-level keys,
  messages append-only, markers identical including ttl, headers identical,
  extension event logs showing a stable state key and a constant `rewrite`
  action across the burst. That is the state in which the corpus forbids
  designing a mitigation, and it is why none is designed here.
  **Do not design a mitigation off this entry.** The attribution gate binds:
  if the forwarded tail marker turns out to keep `ttl:"1h"`, the class is
  not ours and the walk returns to COULD-NOT-ATTRIBUTE with the downgrade
  eliminated. Only a measured downgrade licenses a fix.
  Done: the forwarded marker values for all six pairs are recorded beside
  the raw ones in `bust-evidence/2026-08-13/`; the disabled-vs-enabled arms
  are both run and DIFFER or provably do not; the RECORD entry above is
  re-graded with the verdict; this entry moves to `## Done` with its ref.
  Loop stage: ATTRIBUTE.
  Anchor: proxy/extensions/cache-control-normalize.mjs
  Write-set: tools/breakpoint-scan.mjs, test/breakpoint-scan.test.mjs
  Verifier: node tools/gate-live.mjs
  <!-- entry: "measure the forwarded ttl on the georgendorf burst" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-13 — the capture join (outcome -> request) is not
  mechanized anywhere, so every bust walk re-derives it by hand, and the
  last one cost 6-7 ad-hoc probes against schemas this repo itself
  writes.** Surfaced by the lane that needed it, in its own deviations slot:
  it self-reported blowing through `docs/dev-loop.md`'s "the SECOND ad-hoc
  probe against a format this repo already writes stops the investigation"
  threshold while working out how to connect an API request id to a capture
  record. The rule names exactly this tell — the throwaway probe is the
  signal a tool is missing — and the honest self-report is what makes it
  actionable rather than invisible.
  **The join, established and verified by that lane, so it is not
  re-derived here:** an `outcome` record's `requestId` (the `req_…` the CC
  transcript also carries) -> that outcome record's short `id` -> the
  request record's own `id`. Confirmed 1:1 on a real pair (short id
  `13857504-932`: exactly two hits in the capture, one request record, one
  outcome record), and instance-positive across all six targets, where
  `outcome.usage.cacheCreation` matched the transcript's `cc` EXACTLY on
  6 of 6 — which is what proves the join landed on the right request rather
  than on a same-size coincidence.
  **Why this outranks its own small size.** `bust-triage` currently selects
  the busting request by TIME PROXIMITY, which is measurably wrong: it is
  the documented 2026-08-10 defect (a sonnet pair returned for a fable
  bust), it picked a pair 51 s off the event during today's walk, and the
  runbook's step 0 already carries a `[GRADUATE]` marker over the same
  ground. Timestamps cannot join these two artifacts at all — transcript
  stamps are response-COMPLETION times and capture stamps are request-START
  times — so this is not a better heuristic than proximity, it is the
  correct join replacing a wrong one.
  **Design, decided:** one exported helper, `joinOutcomeToRequest`, living
  beside the other capture readers, taking a `req_…` id and returning the
  request record's line and id, or a stated could-not-verify — never a
  nearest-match fallback, which is the failure being removed. `bust-triage`
  consumes it for pair selection; `--at` keeps working for events with no
  transcript request id, but says which path it used.
  Red-first arrangement, and the two must DIFFER: on the 2026-08-13 11:33:46Z
  event the helper must return the request record whose outcome carries
  `cacheCreation=246636`, while the current time-proximity path returns a
  pair 51 s earlier — the two must not agree, or the change is inert. A
  `req_…` id absent from the capture must return could-not-verify, NOT the
  nearest record.
  Done: the two bites above pass; `bust-triage` on the 2026-08-13 events
  reports the joined pair rather than the proximate one; this entry moves to
  `## Done` with its commit ref.
  Loop stage: ATTRIBUTE.
  Anchor: tools/bust-triage.mjs
  Write-set: tools/bust-triage.mjs, test/bust-triage-at-substitution.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/bust-triage-at-substitution.test.mjs
  <!-- entry: "capture outcome-to-request join is not mechanized" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-13 — the READY-bar's `Anchor:` resolver rejects a
  `path:line` citation as a dead path, which is the SECOND recorded instance
  of a class this repo has already paid for.** `lintReadyBar` resolves a
  non-`row N` anchor with a bare `pathExists(value)`
  (`tools/backlog-lint.mjs:1751`), so `Anchor: tools/state-report.mjs:427`
  reports `ANCHOR-UNRESOLVED — test -e tools/state-report.mjs:427 -> absent`
  while the file is live. Measured today, on a real booking, by its author.
  **Why this is a guard defect and not just a convention violation.** The
  convention is a bare path — 12 live READY entries follow it — so the guard
  is right that the entry departed from it, and WRONG about why: it reports
  the file as absent when the file exists and the anchor is strictly MORE
  precise than the convention asks. That is the check firing on legitimate
  work, which trains the override reflex the corpus names, and it is the
  same shape `docs/dev-loop.md` already records under "A liveness or
  resolution check asks 'does this resolve', never 'does this resolve AS THE
  TYPE I expected'" — where a trailing `path:line` citation made three live
  files read as dead. The lesson was written down and the fix landed in the
  POINTER lane only; this resolver never got it.
  **Design, decided:** before `pathExists`, strip a trailing `:<digits>`
  (and `:<digits>:<digits>`) and resolve the path part; keep reporting the
  ORIGINAL value in the finding so a genuinely dead path still names what
  the author wrote. Do NOT accept arbitrary suffixes — the strip is anchored
  to digits precisely so a file whose name really ends in `:foo` is not
  silently rescued, which is the widening the dev-loop's own corollary warns
  against.
  Red-first arrangement, and the two must DIFFER: `Anchor:
  tools/state-report.mjs:427` currently fires ANCHOR-UNRESOLVED and must go
  silent after the change; `Anchor: tools/does-not-exist.mjs:427` must STILL
  fire, naming the full original value. A change that silences both has
  removed the check rather than fixed it.
  Done: both bites above pass, `node tools/backlog-lint.mjs` stays clean on
  the live file, and this entry moves to `## Done` with its commit ref.
  Loop stage: VERIFY.
  Anchor: tools/backlog-lint.mjs
  Write-set: tools/backlog-lint.mjs, test/backlog-lint.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/backlog-lint.test.mjs
  <!-- entry: "ready-bar anchor resolver rejects path:line citations" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-13 — the untracked-fixture ACCUMULATION guard lost its
  assertion when its defect got fixed, and nothing now watches the class.**
  `test/state-report.test.mjs`'s red-first reproduction asserted
  `count > 500` untracked files under `test/fixtures/harvested/`. `dc6c234`
  committed 713 of them, so the count is 0 against 945 tracked and the
  assertion went red for the correct reason — its defect stopped
  reproducing. Re-graded the same day to a collector-liveness bite (the
  collector must read the real main checkout, and the mtime range must be
  populated in BOTH directions — present iff `count > 0`), which keeps
  `collectFixturesAccumulation` exercised against live-world shape but
  asserts NOTHING about accumulation.
  **Why the obvious repair is wrong and was declined at the desk.**
  `count === 0` fires on legitimate in-flight state: `harvest.mjs` runs twice
  daily and writes pins here, so untracked files exist between a harvest and
  the commit that keeps them. A guard red in that window is the
  check-that-fires-on-a-non-defect shape, and it trains the override reflex
  that kills the guard — the same failure the dev-loop names.
  **The design, decided: guard on AGE, not on count.** An untracked pin
  younger than a harvest cycle is in-flight; one that has survived a week is
  accumulation, which is the actual defect (687 pins / 29.6 MB sat untracked
  until `dc6c234`). So: FAIL when any untracked file under
  `test/fixtures/harvested/` has an mtime older than 7 days.
  `collectFixturesAccumulation` already returns `oldestMtime`, so the
  predicate is one comparison and needs no new collector.
  **The 7 days is the one knob an operator may want to move** — it is a
  false-fire/latency trade, not a correctness constant. Anything from 2 to 14
  days is defensible; below ~2 days it starts catching ordinary weekend
  in-flight state.
  Red-first arrangement: `touch -d '8 days ago'` an untracked file in a
  SYNTHETIC repo fixture (never the real checkout) and assert the guard goes
  red naming it; assert it stays green with the same file at 1 day old. The
  two must DIFFER — a guard both states satisfy is unproven.
  Done: the age guard exists and DISCRIMINATES — on a synthetic repo fixture
  it goes red naming an untracked pin backdated 8 days, and stays green with
  that same file at 1 day old (the two must differ, or the guard is unproven
  whatever it asserts); the real main checkout passes; and this entry moves
  to `## Done` with the commit ref.
  Loop stage: VERIFY.
  Anchor: tools/state-report.mjs
  Write-set: test/state-report.test.mjs, tools/state-report.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/state-report.test.mjs
  <!-- entry: "untracked-fixture accumulation guard needs an age threshold" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-11 (evening) — `named-unbooked-scan` reports 0/0 on a session
  that enumerated its own errors twice, because its vocabulary does not carry the
  words sessions actually use.** Found at this session's own close, by refusing
  its zero: the run examined 37 assistant messages (so it was not a
  zero-message vacuous pass, the failure the runbook warns about) and returned
  `GAP-LANGUAGE=0/0 SELF-CORRECTION-LIST=0/0` over a session whose closing
  message opened a paragraph "Two of my own misses" and whose body twice listed
  its own reach failures.
  **Measured with a positive control, so this is a reach claim and not an
  impression.** `ERROR_WORD_RE`
  (`tools/named-unbooked-scan.mjs:116-118`) fires TRUE on "I was wrong about the
  count", "that was my mistake", "the check failed" — and FALSE on every phrase
  this session actually used: "Two of my own misses", "The branch-count reach
  failure", "my brief asserted … a name I had taken from a comment". Two distinct
  causes: "miss/misses" is absent from the vocabulary entirely, and
  `\bfail(?:ed|s|ing)?\b` CANNOT match "failure" — there is no word boundary
  between `fail` and `ure`, so the one word most likely to appear in an
  self-reported reach defect is unmatchable by construction. Separately, 0 of the
  6 `gap-language` phrases match "still owed", "not done", "unstarted".
  **Why this outranks its own size:** the scan is the session-close lane's step 6
  and the dotfiles Stop hook's payload, so its zero is read as "nothing was named
  and left unbooked". A silent under-fire there certifies a close as clean, which
  is the absence-wearing-a-verdict's-clothes class aimed at the instrument that
  exists to prevent it. This session's close would have passed on it.
  **Design (decided):** add `miss(?:es|ed)?` and `failure` to `ERROR_WORD_RE`
  (the latter by relaxing the suffix group to `fail(?:ed|s|ing|ure|ures)?`), and
  add "still owed", "not done", "unstarted", "left for" to the `gap-language`
  phrases. Do NOT widen further in the same change: the runbook already expects
  false fires here, and a phrase list that fires on ordinary explanation trains
  its reader to discount the output — which is the same defect from the other
  side.
  **Done-criterion / red-first PAIR, both halves required:** this session's own
  transcript (`7e2fadd8…`, 37 assistant messages) must go from 0 hits to ≥1
  under the patched vocabulary — a REAL positive, not a planted one — AND a
  transcript of a session that named no gaps must stay at 0. The two must
  DIFFER, or the widening is a predicate that fires always.
  Anchor: docs/runbooks/session-close.md
  Write-set: tools/named-unbooked-scan.mjs, test/named-unbooked-scan.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/named-unbooked-scan.test.mjs

- **RECORD 2026-08-15 — nothing checks a NEW entry against the existing ones, so
  a gap reached from two directions grows two entries; measured today.** This
  session booked a duplicate of the 2026-08-11 carrier-enumeration entry, having
  arrived at the same gap from the capture-protection side. `docs/dev-loop.md`
  already prescribes the cure — "one grep per new class name, at intake" — and it
  was skipped, exactly as prose rules are skipped: mid-flight, inside an
  unrelated analysis, with no firing moment. It surfaced only because re-deriving
  the head put both entries in view at once, which is luck rather than method.
  **The cost is not the duplicate, it is what the duplicate did to its twin.**
  The pre-existing entry named `alias-claim.mjs`'s protected-link carrier as the
  known positive its enumeration MUST surface. The duplicate's session built that
  collector without reading the entry, so the entry's instrument-positive is now
  spent and a zero from that enumeration is unproven. A near-duplicate does not
  merely waste a slot; it lets two sessions consume each other's calibration.
  **Design, decided:** a `backlog-lint` lane that, for every entry, scores its
  headline against every OTHER entry's headline and body, and reports pairs above
  a threshold as NEAR-DUPLICATE — report-only, never blocking, because entry
  prose legitimately repeats vocabulary and a blocking predicate here would fire
  on ordinary work. It runs over the whole file, so it catches pairs booked weeks
  apart, which is the case a discipline at intake cannot cover.
  **Red-first, and the known positive is REAL and permanent:** the duplicate pair
  as it existed in commit `937d41a` (my entry) against the 2026-08-11 entry is a
  committed range carrying exactly the defect. The lane must surface that pair
  over `937d41a` and must NOT surface it at HEAD, where the duplicate is merged
  away. Both arms are commit-anchored, so neither decays.
  **Negative control, required before believing a hit list:** the lane must stay
  silent on the two `bust-triage` entries and the two `absence-scan` entries in
  the current head, which share tooling vocabulary heavily and are genuinely
  different work. A lane that flags those has learned the vocabulary, not the
  duplication.
  Loop stage: SEE.
  Anchor: tools/backlog-lint.mjs
  Write-set: `tools/backlog-lint.mjs`, `test/backlog-lint-near-duplicate.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/backlog-lint-near-duplicate.test.mjs
  <!-- entry: "nothing checks a new entry against existing ones, duplicates grow" -->

- **RECORD 2026-08-15 — anything `gate-live` prints behind `!args.quiet` is
  invisible on the ONLY run that matters, and this is the SECOND measured
  instance of that class.** The systemd unit is
  `ExecStart=... tools/gate-live.mjs --quiet`, so every line the tool writes to
  stdout reaches a human only when someone runs it by hand. Instance one is
  already recorded in this file (`a7f04a0`): the artifact-only gate exclusions
  sat behind `!args.quiet`, so "the only run that writes the artifact step 7
  reads is the only run whose artifact omits the explanation". It was fixed by
  moving the fact onto the STATUS OBJECT (`gatesExcludedArtifactOnly`).
  Instance two is today: the duplicate/coalesce summary line added in `8f8e5ab`
  — added specifically to fix a computation-runs/nobody-sees-it split — landed
  behind the same flag and reaches nobody daily. Fixed for row 31 by a VERDICT
  (`row-31-coalesce`, `1325469`) rather than by a print.
  **The class, stated so the next author recognises it before shipping:** a
  print is not a delivery mechanism in this tool. Two instances, two different
  authors, both adding a line to a text report that the scheduled invocation
  suppresses — and in both cases the author had just been reasoning about
  exactly this failure shape, which is why noticing is not the fix.
  **Design, decided:** a bite over `gate-live`'s stdout-only surface asserting
  that no line behind `!args.quiet` carries a fact absent from the status object
  or a verdict — enforceable as an inventory: each `!args.quiet` block names the
  status field or verdict that carries the same fact, or declares itself
  operator-convenience only (progress, per-capture chatter). An unclassified
  block is the finding, the same shape as the carrier enumeration.
  **Red-first, and the known positive is real rather than planted:** the
  duplicate line as it stood between `8f8e5ab` and `1325469` is a committed
  range carrying exactly the defect — a fact behind `!args.quiet` with no
  status-object or verdict counterpart. The check must fire over that range and
  stay silent at HEAD.
  Loop stage: VERIFY.
  Anchor: tools/gate-live.mjs
  Write-set: `tools/gate-live.mjs`, `test/gate-live-quiet-surface.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/gate-live-quiet-surface.test.mjs
  <!-- entry: "gate-live stdout behind quiet is invisible on the scheduled run" -->

- **RECORD (ex-READY 2026-08-15) 2026-08-11 (evening) — enumerate every `tools/` mechanism that writes
  state outside the tree and name its collector, or name why its state is not a
  carrier.** The enumerable half of the carrier-registration rule minted into
  `docs/dev-loop.md`'s closing gate (question 4) the same day. The rule's
  completeness test is only a slogan until the enumeration has been run once and
  its residual is a NUMBER — the same reason the XDG path accounting exists and
  the same reason it returned 65 on its first run after three sweeps had each
  shipped believing the class closed.
  **Design (decided):** an exhaustive pass over `tools/*.mjs` (and any `proxy/**`
  writer a tool drives), each writer classified into exactly one of: HAS-COLLECTOR
  (naming it in `state-report`), NEEDS-COLLECTOR, NOT-A-CARRIER-process-local,
  NOT-A-CARRIER-self-expiring. Every hit accounted for, zeros stated explicitly;
  no materiality judgment at enumeration time — a writer that looks trivial is
  still listed and the grading is the desk's.
  **Done-criterion:** the enumeration covers every `tools/*.mjs` by path (not by
  count), the four buckets sum to the total, and the NEEDS-COLLECTOR bucket is
  booked as entries. It is dispatchable as an enumeration brief; the grading of
  its buckets stays at the desk.
  **Instrument-positive, so a zero bucket is distinguishable from a dead pass:**
  `tools/alias-claim.mjs` is known to write a carrier (the protected-link set)
  whose collector does not exist yet, so it MUST land in NEEDS-COLLECTOR; an
  enumeration that does not surface it has not run.
  **THAT POSITIVE IS SPENT AS OF 2026-08-15 (`2fcbe68`), and this entry is
  WEAKER for it — the loss is recorded rather than quietly absorbed.** The
  protected-link carrier now HAS a collector, so `alias-claim.mjs` lands in
  HAS-COLLECTOR and can no longer distinguish a live enumeration from a dead
  one. This is the fix-destroys-its-own-calibration-case shape (`docs/dev-loop.md`,
  "Rule out the instrument"): the collector was built without reading this
  entry, by the session that found the same gap from the other direction.
  **No substitute is to be shopped for** — the rule this repo already carries
  is that a check whose motivating case dissolves does not get a replacement
  hunted down, because tuning an instrument to ratify its own premise is what
  that looks like from the inside. What the enumeration has INSTEAD is a
  measured prior: one writer in this class was found unregistered four days
  after shipping, and found only because somebody happened to use the flag. If
  the enumeration returns zero NEEDS-COLLECTOR, that zero is now UNPROVEN and
  says so; a fresh known-positive arrives the next time a `tools/` mechanism
  ships a carrier, and the enumeration is better run BEFORE that than after.
  **How it was found, because the miss is reusable:** a session booked a
  DUPLICATE of this entry on 2026-08-15 having reached the same gap from the
  capture-protection side, and caught it only when re-deriving the head made
  both visible at once. `dev-loop.md` already prescribes the cure — one grep
  per new class name, at intake — and it was skipped. The duplicate was
  dropped and its substance merged here.
  Anchor: docs/dev-loop.md
  Write-set: BACKLOG.md (the resulting entries), docs/directives/carrier-enumeration.md
  Verifier: test -f docs/directives/carrier-enumeration.md && grep -c '^| ' docs/directives/carrier-enumeration.md

- **RECORD (ex-READY 2026-08-15) 2026-08-11 (evening) — five registered worktrees hold 30 commits that
  never reached `main`, and two of them BLOCK the current head.** Measured at
  session start by patch-id (`git cherry main <branch>`, counting `+`, which is
  the coordinate `docs/dev-loop.md` prescribes because cherry-picking rewrites
  every hash): `worktree-agent-a162…` 9, `worktree-agent-a82e…` 8,
  `worktree-agent-a46f…` 7, `worktree-agent-ac73…` 5, `worktree-agent-a93d…` 1.
  All five branch from `3bc6a72` except the last (`db5fbfa`). This is the exact
  class dev-loop.md booked this morning ("A lane's report ends the LANE. Nothing
  ends the INTEGRATION") recurring within the day — and the mechanism for it,
  `tools/prune-lane-branches.mjs`, is itself sitting in the pile, which is the
  shape that entry predicted.
  **It is NOT all lost work, and it is NOT all noise — that is what makes it
  judgment rather than a script.** Symbol-level check with positive controls
  (each symbol counted on the branch AND on main; a symbol scoring 0 on the
  branch is a dead probe, reported as such rather than as an absence):
  `findBornLargeStarts` branch 3 / main 0, `WRAPPED-HEADING` 1/0,
  `READY-outside-Open` 2/0, bust-triage `lineage` 2/0 — genuinely unintegrated;
  while `identityRotation` 6/6, `prevId` 14/2, `NOT-OURS` 5/1 are on main
  already, re-implemented rather than cherry-picked, which is why patch-id
  counts them as outstanding. A blanket cherry-pick would double-apply.
  **Why it blocks:** the head's `modelChangedAcrossPair` entry writes
  `tools/replay.mjs` + `test/replay-gate-selfcheck.test.mjs` (both in a162's
  set), and the `--closures-in-live` entry writes `tools/backlog-lint.mjs` +
  `test/backlog-lint.test.mjs` (both in a82e's set). Building either on `main`
  today manufactures the conflict instead of resolving it.
  **Design (decided):** integrate per COMMIT, not per branch, each with its own
  substance check before the pick — `git show <c> --stat`, then grep main for the
  distinctive symbol it introduces; already-present means SKIP with the skip
  recorded, not a forced pick.
  **METHOD CORRECTED 2026-08-11 evening, and the correction is load-bearing: the
  symbol grep above is NOT SUFFICIENT and following it alone double-applies.**
  Proven on the first real pick. `b6bfdca` ("backlog-neighbours: second join on
  backticked camelCase IDENTIFIERs") reported its distinctive symbols ABSENT from
  main (`CAMEL_ID`, `buildIdentifierReport`) — and `main` already implements that
  exact join under DIFFERENT names, `CAMEL_CASE_IDENTIFIER` and
  `extractIdentifiers`, with its own dedicated test section (12 references in
  `test/backlog-neighbours.test.mjs`, 5 in the tool, against the lane's 4). The
  conflict hunk is what exposed it: HEAD's side of the hunk WAS the feature. This
  is dev-loop's own rule — an enumeration keyed on a NAME is not an enumeration
  of the BEHAVIOUR — landing on the integration method, and a name-only check
  would have re-applied a feature the trunk already has, under two names, with
  two test suites asserting it.
  **So the per-commit check is BEHAVIOUR-level:** name what the commit makes the
  tool DO, then look for that capability on main under any name — the commit's
  own test names are the cheapest description of it. Read HEAD's side of any
  conflict hunk before resolving it; that side is main's answer to the same
  question and is often the whole finding.
  **SKIP RECORDED (not silently dropped): `b6bfdca` — superseded by main's own
  identifier join.** Seven of a82e's eight remain.
  **Conflict map measured so far:** `877d3bc` conflicts in
  `tools/backlog-lint.mjs` + `test/backlog-lint.test.mjs` (main gained 6 and 9
  commits on those two since the branch point, and 5 of a82e's commits touch
  them), so that file pair is where this branch's real merge work sits. The
  remaining six were not individually attempted. Order: a162 and a82e first (they unblock the
  head), then ac73, a46f, a93d. Integration verb is `cherry-pick` onto main after
  verification, never merge; the worktree is removed once its branch reports zero
  `+`. `--closures-in-live` is confirmed absent from main AND from a82e, so item
  4 is genuinely unbuilt and lands after a82e is in.
  **Done-criterion:** every registered worktree branch reports zero `+` under
  `git cherry main <branch>`, or each remainder is NAMED with why it was
  dropped; the full suite green at the integrated HEAD; and the skip list pasted,
  since a silent skip and a lost commit are the same bytes.
  **MEASURED 2026-08-11 evening, and it decides how big this is: the picks are
  CONFLICTED, not clean.** Commits landed on `main` since the lanes branched at
  `3bc6a72`, per contended file: `tools/backlog-lint.mjs` 6,
  `test/backlog-lint.test.mjs` 9, `tools/replay.mjs` 3, `tools/bust-triage.mjs` 2,
  `test/replay-gate-selfcheck.test.mjs` 0. So `main` evolved these files
  independently while the lanes held their own versions, and every pick against
  them needs the substance question answered before the conflict is resolved —
  "did main already solve this, differently?" — which is judgment per commit, not
  a mechanical replay. Budget it as such: 17 commits across the two blocking
  branches, most of them conflicted.
  **Two lanes already came home and are IN, so the count is live:** the
  `alias-claim --protect` pair (`999a6ff`, `9e3530a`) and the row-30 eviction
  bite (`02f6cb7`) were cherry-picked, desk-verified and pushed 2026-08-11
  evening — those are not part of the remaining debt.
  **THE READING NOW EXISTS, which changes how this entry is worked:** the
  lane-branch collector shipped 2026-08-11 evening and `node tools/state-report.mjs
  --json` reports `laneBranches.{totalOutstanding, orphanedWithWork,
  branchesWithWork}` live — 31 and 1 at the moment of writing, against 33 and 1 in
  the frozen fixture, the difference being the three lanes integrated that
  evening. So progress on this entry is MEASURED rather than recounted by hand,
  and the done-criterion's "zero `+` per branch" is one command. Desk-verified
  independently of the building lane: the two cherry-picked lanes read
  `outstanding=0, alreadyUpstream=2` and `=1`, which a revision count would have
  reported as still outstanding — the patch-id coordinate is real, not claimed.
  **Ordering note for whoever runs this:** `test/replay-gate-selfcheck.test.mjs`
  has ZERO main-side commits, so the `modelChangedAcrossPair` exemption's test
  half can land without waiting on a162; only its `tools/replay.mjs` half is
  contended. That splits the head's item-1 rather than blocking it whole.
  Anchor: docs/dev-loop.md
  Write-set: (integration commits onto main; no single file — the branches' own
  file sets, listed in the entry's measurement above)
  Verifier: for b in $(git worktree list --porcelain | grep '^branch ' | sed 's|branch refs/heads/||'); do echo "$(git cherry main $b | grep -c '^+')  $b"; done
  **INTEGRATED 2026-08-14: both blocking lanes are in, 13 commits landed and 4
  dispositioned as skips — and the DONE-CRITERION AS WRITTEN CANNOT BE MET,
  which is a finding about the criterion.** `worktree-agent-a162` (replay) and
  `worktree-agent-a82e` (backlog tooling) both integrated per commit, each with
  its behaviour-level check against main before the pick. Skips, recorded
  rather than dropped: `b6bfdca` (main's own identifier join, confirmed again),
  `376caa9` (main carries the same LINEAGE_THRESHOLD sizing note in its own
  words), `ed30981` (an injectable existence resolver — the desk had already
  built the same design during the previous pick, from the same red), and
  `87e0f74`'s tool half (main had landed the absorption section inline, with a
  richer row).
  **Why `git cherry` will keep reporting a remainder anyway:** it joins by
  PATCH-ID, and a conflicted pick is a different patch by construction. Three
  of a162's nine and one of a82e's eight still read `+` while their content is
  on main under a resolved form. So "every registered worktree branch reports
  zero `+`" is satisfiable only by clean picks, and this pile was measured
  CONFLICTED at booking time. The criterion that actually holds is the one this
  entry's own method section already implies: every commit carries a recorded
  disposition — picked, resolved-and-picked, or skipped with its reason — and
  the commit messages are where those live.
  **Two merges would have shipped broken under a clean auto-merge, which is the
  reusable half:** the absorption commit merged with no conflict marker and
  produced TWO renderers printing the section twice; the closure-duplicate lane
  merged with main's unconditional `return 0` above its blocking return, so a
  BLOCKING guard printed BLOCK and exited 0. Both were caught by running the
  tests, neither by reading the diff — a clean auto-merge is not a substance
  check, which is this entry's own method correction arriving one level down.
  **Remaining: `ac73` (5), `a46f` (7), `a93d` (1), the `afc2` orphan (1).** The
  a46f hazard stands and is now the live one: it carries
  `tools/prune-lane-branches.mjs`, which deletes orphaned `worktree-agent-*`
  branches, and `afc2` is exactly such an orphan holding a real commit.

- **RECORD (ex-READY 2026-08-15) 2026-08-11 — row 30's fix is untested on the eviction path, which is the one way its
  carried-over set can go empty.** `insertion-normalization` now carries blocks across the pin
  from `fresh-session-sort`'s DECLARATION (`relocatedBlocks`). That declaration is emitted from
  the relocator's per-conversation MEMORY, and row 25 records that memory as LRU/prune-capped at
  256 conversations — so a conversation quiet past the cap stops declaring, the pin carries
  nothing, and CC's own bytes win. That is CORRECT behaviour and it is untested: nothing asserts
  the fix degrades to the pre-relocation form rather than to a half-built message, and this is
  the sole reason row 30 is RESIDUAL instead of SHIPPED.
  **Design (decided):** extend `test/relocate-then-pin-conservation.test.mjs` with a third
  request whose relocation memory has been evicted (call the module's exported
  `_resetRelocationMemory`, which exists for this), and assert the forwarded message is exactly
  CC's own incoming message — no relocated block, no stale carry-over, and the conservation gate
  reporting neither `lost` nor `invented`.
  **Done-criterion:** that bite passes, AND its instrument-positive shows the eviction really
  happened (the relocation declaration is absent on the third request, present on the second) —
  without it the case passes vacuously by never having relocated at all, which is how this same
  fixture reported a loss ABSENT earlier today.
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: test/relocate-then-pin-conservation.test.mjs
  Verifier: node --test test/relocate-then-pin-conservation.test.mjs

- **RECORD (ex-READY 2026-08-15) 2026-08-11 — the sweep pins row evidence but freezes NOTHING when a
  replay ERRORS, which is the one case where the input is most needed and least
  likely to survive.** Measured this session: the 2026-08-11 12:24Z sweep
  reported a replay-error row on s-captureBE (stderr naming `auto-1m-guard` /
  `context-1m-2025-08-07` in outbound betas, a class that run did not have), and
  by 13:20Z that capture had rotated off disk — the finding is now unwalkable
  from its own evidence, inside one session's window. The gap is structural, not
  bad luck: `--pin-rows` builds pins from the replay's JSON ROWS, and an errored
  child produces no JSON at all, so the pin pass has nothing to ask for exactly
  when the run failed. A gate FAILURE freezes its evidence; a gate ERROR does
  not.
  **Design (decided):** on a non-zero replay child that produced no parseable
  JSON, `gate-live` pins a bounded range around the failing request — the child's
  stderr carries the request ordinal or timestamp, and `harvest --pin --bounded`
  already takes a range — and records the stderr verbatim in the status row. If
  the ordinal cannot be recovered from stderr, pin the LAST successfully replayed
  ordinal plus a window, and say in the row which of the two it did: a pin whose
  range was guessed must not read like one that was located.
  **Done-criterion:** a deliberately errored replay over a real capture leaves a
  pin that reproduces the error on replay, with the pin path and the stderr in
  the status row, demonstrated with the output pasted; and the negative control,
  a clean run, pins nothing extra.
  Anchor: docs/runbooks/sweep-finding.md
  Write-set: tools/gate-live.mjs, test/gate-live-rowpins.test.mjs
  Verifier: node --test test/gate-live-rowpins.test.mjs

- **RECORD (ex-READY 2026-08-15) 2026-08-11 — the conservation attribution has no F-side (`invented`)
  half, and no live positive exists to build one against.** Shipped this day:
  `replay.mjs --attribute-conservation` answers "which stage REMOVED these
  bytes" for every R-side row, with a `movedBy` naming the stage that relocated
  the unit first. The mirror question — which stage ADDED bytes CC never sent —
  is unbuilt, deliberately: the 2026-08-11 population contains ZERO `invented`
  rows, so building it now would ship a check that had never gone red on a real
  defect (dev-loop.md, "a check whose motivating case dissolves does not get a
  substitute case found for it"). Trigger to build: the first `invented` row any
  sweep reports. Until then this entry is the named deferral, not a gap.
  **Design (decided):** mirror the R-side loop — track the first stage after
  which a candidate `invented` hash APPEARS in the body, reusing the same
  per-stage snapshot the remover side already takes, and report it on the row
  as `attribution.perUnit[].reason = "added"`. No new pass and no new replay.
  **Done-criterion:** an `invented` row from a real sweep names the stage that
  added the bytes, demonstrated red-first against that real positive (never a
  planted one) with the output pasted, plus the discrimination control that a
  unit CC did send is not reported as added.
  Anchor: tools/replay.mjs
  Write-set: tools/replay.mjs, test/replay-conservation-attribution.test.mjs
  Verifier: node --test test/replay-conservation-attribution.test.mjs

- **RECORD (ex-READY 2026-08-15) 2026-08-11 — replay request ordinals and the live insertion event log
  share no joinable coordinate, and the walk compared them by timestamp.** The
  2026-08-11 walk refuted `insertion-normalization` by reading a live
  `<key>-events.jsonl` record 3 ms from the row's own timestamp. Replay's
  `report[].key` is the SESSION key; the event log's `key` is the
  conversation-SUB-keyed form, so the two cannot be joined and the match was
  made on time alone — across records that need not belong to the same
  conversation. Two independent measurements only compare where they share a
  coordinate (operator corpus, grounding). Design: `replay.mjs` emits the
  resolved conversation sub-key per request (it already imports
  `resolveInsertionSessionKey`), so a row joins to the log by key, not by clock.
  Red-first: the 2026-08-11 n=46 case must join to exactly one log record, and a
  neighbouring conversation's record 3 ms away must NOT match.
  **Done-criterion:** a replay row carries the conversation sub-key, the n=46
  case joins to exactly one live log record by that key, the 3 ms-away
  neighbouring record does not match, and both results are pasted.
  Anchor: tools/replay.mjs
  Write-set: tools/replay.mjs, test/replay-conservation-attribution.test.mjs
  Verifier: node --test test/replay-conservation-attribution.test.mjs

- **RECORD (ex-READY 2026-08-15) (small) 2026-08-11 — a stale gate verdict renders as CURRENT in
  state-report: `collectGateVerdict` passes `finished` through raw and no
  staleness logic exists anywhere in the tool, so a dead gate timer and a
  healthy quiet day produce the same reassuring line.** Found by Begehung
  round 2 (BEGEHUNG-MAP.md); probe EXECUTED at the desk 2026-08-11: a
  synthetic gate-status.json with `finished` 7 days old collects as
  `{ok:true, gateOk:true}` with no age signal — the reader must do date
  arithmetic by hand, which is evidence delivery left to the human
  (dev-loop q1). The dead-timer case is a non-event: nothing changes, so
  only a mechanism can distinguish it. Design: collector adds `ageHours`
  computed from `finished` (null-safe: an unparseable or absent
  timestamp is its own could-not-verify, never age 0); renderer appends
  ` — STALE (>24h)` past the threshold, chosen as 24h because the gate
  is a daily timer (07:55) and one missed run is exactly the event worth
  seeing. Red-first pair: a fixture with finished = now−3d must render
  the STALE marker (red against the current renderer proves the defect),
  a fixture with finished = now−1h must NOT (the discrimination arm —
  catches a marker that fires always).
  Anchor: tools/state-report.mjs
  Write-set: tools/state-report.mjs, test/state-report.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/state-report.test.mjs
  Done: both arms green with the pre-fix red pasted in the closing
  report; `--json` carries `ageHours` so the two renderers stay one pass.

- **RECORD (ex-READY 2026-08-15) (small) 2026-08-11 — declare the close-scan contract line in
  `docs/runbooks/session-close.md`, so the dotfiles close-signal hook can
  demand this repo's scan mechanically.** Companion of a dotfiles booking
  (its BACKLOG, grep "close-signal Stop-hook"; incident: a closing
  report's "all booked" was wrong on 2 of 4, caught by operator challenge
  instead of by the runbook's own step 6). The hook design reads a
  `Close-scan: <command>` line from this runbook — grep-readable, opt-in
  by presence. This entry is the opt-in: add the line carrying the
  runbook's existing step-6 command (`node tools/named-unbooked-scan.mjs
  --transcript "$T" --until HEAD` — quote step 6's exact form, do not
  restate it) near the runbook's Trigger header where a hook's grep and
  a human's skim both land on it.
  Anchor: docs/runbooks/session-close.md
  Write-set: docs/runbooks/session-close.md
  Verifier: grep -n "^Close-scan:" docs/runbooks/session-close.md
  Done: the line present and byte-identical to step 6's command form;
  the dotfiles hook's fire-case bite (its own entry's verifier) reads
  this line from a fixture copy of the runbook.

- **RECORD (ex-READY 2026-08-15) — the harvest LEDGER is tracked and its CORPUS is not: 574 untracked
  fixture files against a ledger 959 lines ahead of what is committed.**
  Measured 2026-08-11 at session close (the modified file is
  `LEDGER-<host>.json`, whose oldest superseded entry dates to 2026-08-08, so
  this has been true for three days across many sessions). The twice-daily
  timer writes fixtures and updates the ledger; nothing commits either, so the
  tracked ledger claims harvests whose fixtures exist only on this machine.
  **Why this is not "just run `git add`".** Two rules collide and the collision
  is the decision: fixtures bound for a public tree are SYNTHESIZED by default
  and a harvested one is an exception justified by evidence value, and the
  operator's publication bar has a judgment remainder no scan covers (is a
  residual string this repo's own vocabulary or another session's content).
  574 files is not a judgment anyone can make by inspection at the end of a
  session, and the absence scan clears only the computable slice.
  **The silent half, which is what makes it READY rather than housekeeping:**
  novelty is judged AGAINST the ledger. A ledger that has recorded a shape as
  harvested suppresses re-harvesting it, so an uncommitted corpus plus a
  committed ledger means the next machine to read this repo believes it holds
  evidence it does not have — the label-over-body drift with the body on one
  laptop.
  Design, decided: `harvest` gains a `--corpus-status` verdict (tracked-ledger
  entries whose fixture file is untracked or absent, with counts and the three
  answers), the doctor reads it, and the disposition of the current 574 is a
  separate operator-facing pass — commit the ones whose evidence value is
  stated, drop the rest, and record which.
  Verifier, red-first, available now: today's tree is the positive (574
  untracked against a modified ledger); a tree whose fixtures are all committed
  must report zero.
  Anchor: tools/harvest.mjs
  Write-set: tools/harvest.mjs, test/harvest-corpus-status.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/harvest-corpus-status.test.mjs

- **RECORD (ex-READY 2026-08-15) (small) — thirteen `git` call sites in `tools/` still run on Node's
  1 MB default stdout cap, and the corpus has now crossed it.** Sibling
  enumeration for `8487b6f`, which fixed the two sites in
  `backlog-neighbours.mjs` after `BACKLOG.md` grew past 1,048,576 bytes and
  turned that tool into a checker reporting the truncated file as its own
  COULD-NOT-VERIFY reason. The class is not "a tool broke": it is that a
  SIZE threshold nobody watches flips a whole family of readers from correct to
  confidently-wrong, one ordinary commit at a time, and the failure surfaces
  somewhere unrelated.
  Measured 2026-08-11: `grep -rn "execFileSync(\|execSync("` over `tools/*.mjs`
  gives **17 call sites, 4 naming `maxBuffer`** — two of those four are the
  ones just fixed. Every remaining site is to be classified, not blanket-
  patched: EXPOSED (its output scales with the corpus — `git show` of a
  BACKLOG image, a commit diff, a fixture dump), BOUNDED (`cat-file -e`,
  `ls-files`, a name list), or ALREADY-CAPPED. Only EXPOSED sites take the cap.
  The accounting is the deliverable — a count of patched sites without a
  disposition for every hit is the pattern-scoped sweep this repo has shipped
  three times believing it was complete.
  Second half, and it is what makes this more than a sweep: every catch block
  that renders `e.stdout` as a proof or reason has the payload-as-reason defect
  independently of the cap. `gitProofOf` (`tools/backlog-neighbours.mjs`) is
  the shape to reuse — extend-before-adding, one implementation.
  Verifier, red-first, both arms: for each EXPOSED site, an input over 1 MB
  must succeed where it previously threw (commit `ee98a99`'s `BACKLOG.md` is a
  permanent over-cap reference), and a synthetic ENOBUFS must produce a reason
  naming the mode with none of the payload in it.
  Anchor: tools/backlog-neighbours.mjs
  Write-set: tools/named-unbooked-scan.mjs, tools/state-report.mjs, tools/absence-scan.mjs, tools/backlog-lint.mjs, tools/harvest.mjs, tools/fixture-verdict-identity.mjs, tools/fixture-cut.mjs, tools/xdg-writer-guard.mjs, tools/matrix-status.mjs
  Verifier: npm test

- **RECORD (ex-READY 2026-08-15) — THIRTY commits of lane work from 2026-08-10 evening never reached
  `main`, and today two lanes were dispatched to rebuild parts of it.** Found
  2026-08-11 at the desk while checking whether two returning lanes' worktrees
  were safe to remove — not by any check, and nothing would have raised it.
  **The measurement.** 20 worktrees are registered under
  `.claude/worktrees/`; five carry content `main` does not have. Counted by
  PATCH-ID (`git cherry main <branch>`), never by revision count, because
  cherry-picking preserves content and changes the hash — a rev count called
  eleven branches unintegrated when six of those were already merged in
  substance. Real total: **30 commits, 2026-08-10 19:24 to 20:48**, across
  `backlog-lint`/`backlog-lanes` (8), `replay`/fixtures (9), tooling (7),
  `bust-triage`/matrix (5), runbooks (1).
  **What it cost, today, before anyone knew:** a lane was dispatched this
  morning to build the row-24 cause map — `8da5547` already did it, plus the
  `capturePairResult` reach the same entry's half two describes. A second lane
  was dispatched to print the absorption section — `87e0f74` already did it.
  Both were rebuilt from scratch, verified, and integrated; the duplication is
  the visible cost and the invisible one is that the FIRST implementations were
  never graded, so whichever is better is unknown.
  **It also touches a claim made earlier today.** The re-grade of the
  `capturePairResult` identity entry says nothing pinned s-captureAT. Precisely:
  `e53f873` DOES pin it — and its own title records that the pin does NOT
  reproduce, which is why the entry's evidence is still gone in substance. The
  correction matters anyway, because "no pin was taken" and "a pin was taken and
  proved nothing" point at different repairs.
  **The writer, since a reach failure always has one:** a lane's closing report
  is the end of the LANE, and nothing marks the end of the INTEGRATION. The
  dispatcher pushes after verifying, and a session that ends between those two
  acts leaves the branch registered, the commits reachable, and no artifact
  anywhere saying so — `git status` is clean, `git log origin/main..main` is
  empty, and both read as done. The pile is invisible to every check this repo
  has. It is still happening: two lanes are in flight right now under the same
  conditions.
  **The joke the pile is telling, and it is the ranking argument:** `39d2944`
  in that same pile is `tools/prune-lane-branches.mjs`, built to prune orphaned
  lane branches. The mechanism that would have surfaced this is inside the thing
  it would have surfaced.
  Design, decided: a check that reports every registered worktree whose branch
  carries content `main` lacks, by patch-id, with the count and the per-branch
  subjects — and the THREE answers, since a worktree list that cannot be read is
  could-not-verify, never zero. Consumers: `docs/runbooks/session-close.md`
  (a session may not close over unintegrated lane content without naming it) and
  the doctor. First act of the implementation is to read `39d2944` and extend it
  rather than write a rival — the extend-before-adding rule applies hardest to a
  tool that already exists and is merely unreachable.
  Verifier, red-first and permanent at this commit: the five branches above are
  real positives (`git cherry` gives `+` lines today), and the branches already
  cherry-picked are real negatives (all `-`) — a check that flags those is
  reporting the rev-count answer and is wrong.
  Anchor: docs/runbooks/session-close.md
  Write-set: tools/prune-lane-branches.mjs, test/prune-lane-branches.test.mjs, docs/runbooks/session-close.md
  Verifier: node --test --import ./tools/suite-config-root.mjs test/prune-lane-branches.test.mjs

- **RECORD (ex-READY 2026-08-15) — the 30 unintegrated commits above get a per-commit disposition:
  integrate, supersede, or drop, each with its reason.** Split from the entry
  above because that one is the MECHANISM and this one is the backlog of
  content; conflating them is how the mechanism would end up gated on a large
  judgment pass. Not dispatchable as one lane: several commits are now
  superseded by today's re-implementations (row-24 cause map, absorption print)
  and deciding which of two implementations survives is a desk judgment per
  pair, not a briefable rule. What IS mechanical and rides the entry above: the
  enumeration — branch, commit, subject, files, and whether `main` carries an
  equivalent by patch-id.
  Ordering constraint: the mechanism entry ships FIRST, because its red-first
  arrangement is these five branches, and integrating them removes it.
  **The anchor below is `BACKLOG.md` and NOT the obvious
  `tools/prune-lane-branches.mjs`, because the READY bar refused the obvious
  one — `ANCHOR-UNRESOLVED`, the file does not exist in this tree.** That red
  is the entry's own thesis arriving from a direction nobody arranged: the
  natural anchor for a lost-lane-work item is the tool a lost lane wrote, and
  the check that grades anchors is what says so out loud. Left recorded rather
  than silently re-anchored, since it is the cheapest possible demonstration
  that the pile is unreachable from the tree.
  Anchor: BACKLOG.md
  Write-set: BACKLOG.md
  Verifier: git cherry main <each registered lane branch> reports zero `+` lines, or each remaining `+` has a booked reason

- **RECORD (ex-READY 2026-08-15) — strip the verdict TOKEN from all 29 matrix status cells; the
  status file is authoritative and the prose still carries a second copy.**
  The last step of `docs/directives/records-restructure.md` phase 1, and the
  only one this session did not take. Booked rather than done because a dry run
  proved it is NOT mechanical, which is the finding: a regex over the 29 cells
  ate narrative in nine rows (row 8's whole cell IS its verdict plus its
  evidence ref; row 18 lost `71/71`; row 21 lost the `other`-is-a-degraded-
  default warning that is its most load-bearing sentence), cut mid-token inside
  filenames (row 15 `.mjs defaults…`, row 20 `.md): start fresh…`), left nine
  unbalanced `**` spans, and failed to parse row 3 at all, whose cell contains a
  literal `|` inside a quoted log line.
  So the unit of work is a JUDGMENT per row — which words are verdict and which
  are narrative — made 29 times on this repo's central record, with the cell's
  reasoning, evidence trail and event walks preserved verbatim. A brief cannot
  carry it because the brief would have to contain the answer.
  **Every dependent is already re-pointed, which is what makes this safe to do
  now and unsafe to have done earlier:** `bust-triage` resolves row verdicts
  from the status file (`41faa48`), the daily sweep reads it (`7d9e034`), and
  `lintRowStatus` — the last prose consumer — is in flight on
  `wt/rowstatus-from-data`. Do NOT start until that lands, or the strip turns a
  live checker silently green.
  Design, decided: each cell keeps its narrative and gains the leading pointer
  `status: see \`robustness-threat-matrix.status.json\``; the verdict token
  leaves. Row 3 is edited by hand (its embedded pipe defeats field splitting).
  Verifier, red-first and already built: `node tools/matrix-status.mjs` must
  stay at 0 findings over 29 rows, `npm test` green (the row-status and
  matrix-cells lanes are the ones that would catch a mangled cell), and a
  row-by-row `git diff` read confirming no evidence ref, measured number or
  event-walk sentence left with the token. Done-criterion: no cell's leading
  span is a verdict word, and the status file is the only place a verdict
  appears.
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: docs/directives/robustness-threat-matrix.md
  Verifier: node tools/matrix-status.mjs && npm test

- **RECORD (ex-READY 2026-08-15) (RE-GRADED 2026-08-11) — hook-context container normalization
  (matrix row 4, mid-history replace/edit): canonicalize FORWARD to the
  standalone form.** The header this entry carried until today is quoted in the
  re-grade note below rather than kept here, because it asserted a closure this
  entry does not have — and `backlog-lint`'s header lane fired on the first
  attempt to keep it, which is the check doing exactly its job on my edit.
  **RE-GRADE 2026-08-11, and it is two defects in one entry.** The header quoted
  in this paragraph is SUPERSEDED — quoted verbatim so the drift is legible, and
  labelled with the word `backlog-lint`'s own exemption keys on, which is the
  declared-exemption form this repo requires when a guard fires on legitimate
  work (never a softened predicate). Superseded header: "RESOLVED 2026-07-31
  (059aae3 — suppression runs on the reset path;
  header re-titled 2026-08-01, body was already resolved) — hook-context
  container normalization (matrix row 4, mid-history replace/edit)."
  (1) The grade was
  over-wide: `059aae3` resolved the DISARMING half — insertion-normalization's
  suppression now survives a reset — while the design this body settles, forward
  canonicalization of the hook-context container, is UNBUILT. Checked in the world
  rather than inferred from the grade: no extension emits the standalone form, and
  the row-4 cell records the rule's own premise FALSIFIED 2026-08-02 (a migrated
  standalone arriving with its `<system-reminder>` wrapper RETAINED), so the
  byte-match census gate blocks shipping until that is answered. (2) It was filed
  outside `## Open`, in the upstream-PR section, where `backlog-lint --census`,
  the build-order derivation and the session-start banner all scope to `## Open`
  and therefore could not see it — so the repo's ONE mitigation-stage item was
  invisible to every ranking that has run since. Moved here with its body
  byte-untouched.
  Anchor: row 4
  Write-set: proxy/extensions/insertion-normalization.mjs, test/insertion-normalization.test.mjs, tools/reminder-migration-census.mjs
  Verifier: node tools/reminder-migration-census.mjs ~/.local/share/cache-fix/captures/*.jsonl  # any MISMATCH blocks shipping
  Grounding: measured live 2026-07-31, two
  instruments agreeing (`--census`: `edit@98 of 123 [anchor-25] ~75 kB`;
  raw capture diff of the adjacent requests), end-to-end cost from the
  transcript's own `cache_miss_reason messages_changed / 105006`. The
  mutation is a deterministic CONTAINER change, not a content change:
  CC first appends hook additional-context as text blocks INSIDE the
  preceding message, each wrapped `<system-reminder>\n…\n</system-reminder>`
  (observed: msg 97, two blocks, 387 + 313 chars); a later request emits
  the same text as ONE standalone `role:"system"` message positioned after
  the host (observed: idx 98, 627 chars), wrappers STRIPPED and the blocks
  JOINED with `\n\n`. Verified not byte-identical across the move, and the
  transformation fully accounts for the difference. Mitigability —
  the only deliberation the matrix's Mitigation policy allows — is
  ANSWERED YES: the class is recognisable by that shape, and both forms
  carry identical information, so pinning changes serialization only, never
  what the model reads. Same safety argument insertion-normalization
  already makes for the splice direction; this is its mirror for the
  replace direction. Design (settled): canonicalize FORWARD to the standalone
  form on every request — strip the wrappers, join with `\n\n`, emit as one
  `role:"system"` message after the host. Forward-only, so the `\n\n` join
  is never ambiguously re-split; the A→B transition then changes no bytes.
  `role:"system"` inside `messages[]` is legitimate wire shape, not an
  anomaly — it is the `mid-conversation-tool-changes` beta's format
  (`deferred-tool-rewrite.mjs:16,381`). Verifier — NOTE the first one named here was WRONG and the run proved
  it: `--census` classifies the INPUT (what CC sent), so no mitigation can
  ever change `edit@98 of 123`; that line names the class, never the
  absorption. The real check is whether the FORWARDED bodies converge —
  run `normalizeMessages` over both captured requests and compare the first
  divergence index. RESOLVED 2026-07-31 — and NOT by the extension this
  item proposed. The mechanism already existed: insertion-normalization's
  migrated-duplicate suppression (#76606, decision B) covers exactly this
  shape, and its telemetry for the busting request read
  `action=reset resetReason=not-subsequence pinned=2 suppressed=0` — pins
  restored, suppression skipped, because `resetKeepingPins` returns before the
  suppression pass. The suppression was therefore disabled by ANY reset, and
  this extension's own measurement puts resets at ~1 request in 3. Fixed in
  059aae3 by running suppression on the reset path, reusing the pins it has
  already restored. Measured on the motivating pair: divergence 97 -> 100,
  re-bill ~104 kB -> ~96 kB, suppressed=1.
  A separate `hook-context-normalize` extension WAS written first (acc0814)
  and has been REVERTED. It duplicated VOLATILE_WRAP_REGEX and the
  canonical-join concept in a second file, and measured WORSE than fixing the
  existing one (97 -> 101, ~97 kB). The diagnosis that justified it — "the
  class was never in insertion-normalization's scope" — came from reading that
  extension's header instead of its telemetry, which said the opposite. That
  is the dev-loop rule "extend an existing tool before writing a new one",
  violated one day after writing it; recorded rather than tidied away.
  Residual, NOT closed: divergence still lands at 100. The remainder is the
  EXTENDED class (a later form carrying text that did not exist yet) plus the
  ephemeral-turn pruning — neither absorbable by a serialization rule.
  NOT gated on the rate re-measure below: the Mitigation policy states fire
  counts are "never a worthiness threshold" and cost never gates the work —
  an earlier revision of this item made exactly that error.
  CORRECTION 2026-07-31 (same day, later): "neither absorbable by a
  serialization rule" did not survive measurement. (a) The pruning half is
  a measured NON-EVENT on its own — 10 of 10 pure tail prunes in this
  session's capture produced zero `cache_miss_reason` entries (matrix
  row 22 carries the probe); it costs only when a co-occurring mid-history
  change breaks the prefix below the injection point. (b) The EXTENDED
  half IS absorbable — not by predicting bytes but by refusing the edit:
  the census verdict is defined as `actual.startsWith(reconstructed)`
  (`reminder-migration-census.mjs:96`), so the delta is byte-computable.
  READY item below. Also grounded same day: billing is ALL-OR-NOTHING per
  request — the 11:41 bust turn's transcript usage reads
  `cache_read 15,214 / cache_creation 123,032` on a divergence at msg 98
  of 124 whose suffix is only ~19k tokens; with breakpoints at
  {system, messages[0], tail} a mid-history divergence re-bills nearly the
  whole context regardless of depth. Consequence: partial absorption buys
  ~nothing live; per-request TOTAL absorption is the prize, so the last
  open class is worth as much as the first.
  CORRECTION 2026-08-02 (prune dossier, dispatcher-verified): scope
  NARROWED — all-or-nothing holds WHEN a miss fires (the 11:41
  measurement stands); instrument-visible divergence does not imply
  a miss fires: 14 interior role:"system" removals (f94e53ce,
  div=4) measured billing-free (zero cache_miss_reason, ordinary
  creations). "Any unabsorbed mid-history divergence pays ~full
  price" over-claimed; at least the interior system-removal class
  is free. See the reframed interior-prunes entry above.

- **RECORD (ex-READY 2026-08-15, demoted to free a head slot for the promotion-path lane) 2026-08-14 — a tool that PRINTS a blocking verdict and EXITS ZERO is
  a guard that blocks nothing, and only one of this repo's blocking lanes has a
  bite pinning the pair.** Measured the same day, during the lane-pile
  integration: `backlog-lint`'s closure-duplicate lane printed
  `BLOCK backlog-closure-duplicate …` and exited 0, because a clean auto-merge
  left main's unconditional `return 0` ABOVE the lane's
  `return closureDuplicates.length ? 1 : 0`. No conflict marker announced it and
  the file parsed fine. It was caught only because THAT lane happens to own a
  CLI bite asserting the exit code; the other blocking lanes in this repo have
  no such pairing, so the same merge shape lands silently in any of them.
  **Why the sibling fix (the report-section invariant, `test/absorption-miss.test.mjs`)
  does not cover this:** that one asserts on rendered TEXT, and this defect is
  the text being right while the EXIT CODE disagrees with it. Two different
  surfaces of the same integration class — a printed verdict and the process
  status are separately reachable, and a guard is only as strong as the weaker.
  **Design, decided:** one bite per tool that can emit a blocking verdict,
  asserting the PAIR in both directions — a known-blocking input yields both the
  BLOCK line and a non-zero exit, and a known-clean input yields neither. The
  tool inventory is DERIVED, not restated: `git grep -l "BLOCK "` over `tools/`
  is the population, and a tool in that list without such a bite is itself the
  finding (the same derive-from-the-source stance `test/logs-schemas.test.mjs`'s
  scope lint already takes, rather than a hardcoded list beside the parser it
  mirrors).
  **Red-first arrangement, and the two must DIFFER:** for each covered tool,
  hoist an unconditional `return 0` above its blocking return (the exact 08-14
  mutation) and the bite must fail naming that tool; revert and it must pass.
  A bite that stays green under that mutation is asserting the printed line
  only and has not pinned the pair.
  Done: every tool in the derived population carries the two-direction bite,
  the derivation itself fails when a new blocking tool appears without one, and
  this entry moves to `## Done` with its commit ref.
  Loop stage: VERIFY.
  Anchor: tools/backlog-lint.mjs
  Write-set: test/backlog-lint.test.mjs, test/absence-scan.test.mjs, test/blocking-verdict-exit-pair.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/blocking-verdict-exit-pair.test.mjs
  <!-- entry: "a tool that prints a blocking verdict and exits zero blocks nothing" -->

## Upstream PR round — booked 2026-08-05; the round below is CLOSED, current state is the first entry

**STATE RE-READ FROM THE API 2026-08-15** (the 2026-08-05 table this
replaces is superseded, not appended to — a stale table reads as
authoritative). Nine of the twelve have merged; two remain open.

| PR | state | ball |
|---|---|---|
| #272 #273 #275 #278 #279 #280 #282 #307 | **MERGED** 2026-08-05..08-06 | done |
| #281 | open, MERGEABLE, CI green — rebased and un-drafted 2026-08-15 | upstream |
| #276 | open, CONFLICTING, awaiting Chris's sequencing answer (2026-08-14) | upstream |
| #306 | open, MERGEABLE, all maintainer questions answered 2026-08-14 | upstream |
| #295 | CLOSED 2026-08-05, premise falsified | done |

- **PARKED [HANDED OFF 2026-08-10] (operator-side, dotfiles) — a worktree without `node_modules`
  should fail loudly at doctor time, not as a 900 s fake hang.** Measured
  2026-08-05: four of fifteen worktrees (pr2, pr5, pr6, pr7) had no
  `node_modules`, symlinked the same day. The runbook has said to symlink at
  setup since 08-02 and the gap still recurred four times, which is the
  signal that prose is the wrong instrument here — the trigger is a
  computable predicate with no judgment in it and effectively zero false
  fires: a worktree of this repo whose `node_modules` does not resolve.
  Design: a doctor verdict that enumerates `git worktree list --porcelain`
  for the cache-fix repo and reports any whose `node_modules` is absent,
  with the symlink command in the message. Verifier, red-first: remove the
  link from one worktree and require the verdict to go red naming that
  worktree; control that a fully-linked set reports clean. Done when the
  check ships with its three-answer case (no worktrees at all is "could not
  verify", not "clean").

Procedure for every item: docs/runbooks/upstream-pr-round.md (worktree
setup, hygiene gate, comment form, the box). Per-PR state and full
review gists: docs/audits/upstream-pr-sweep-2026-08-05.md. Upstream's
own landing order is in issue #284 (2026-08-04 comment): #272 first
("highest-leverage thing on your side of the board"), then the
absence-scan split (unblocks their #302), then #279/#282/#275/#280,
then the queued ones. Work the items in that order.

- **(superseded, see above) — a full-suite gate before push (the red-main incident,
  2026-08-02 evening).** What happened: the source-UUID guard landed
  2026-08-01 (2a8738d); on 2026-08-02 two commits (0def5ca, 3b32e6b)
  each put a REAL capture session id into a tracked `.mjs`, and both
  pushed with the guard red. Nobody ran `npm test` — targeted files
  were run instead, which is the documented habit and is usually
  right. The red survived a day and was found only because an
  unrelated full-suite run happened during other work; fixed forward
  in 770e915. Note what did NOT fail: the guard itself fired
  correctly, on a real defect, the first time it was asked.
  The post-incident question (1) answers YES here — "the full suite
  is green" is a computable predicate with near-zero false-fire risk,
  because the suite is FAST: measured twice today at ~17 s wall clock
  for 2036 tests. Design: a `pre-push` git hook running `npm test`,
  refusing the push on a non-zero exit, with an explicit bypass
  documented for the deliberate-WIP case. Verifier: the hook refuses
  a push with a seeded failing test and permits it once removed.
  NAMED OBSTACLE, not a blocker but the reason this is READY rather
  than done: git hooks live in `.git/hooks`, which is untracked, so
  the hook is machine-local and invisible to a fresh clone — placing
  it is arguably a dotfiles-repo act (CLAUDE.local: deployment items
  live there), and this fork-side entry should not decide that. Also
  named: `CLAUDE.local.md` warns `npm test` "can hang on the
  production port"; that did not reproduce in either of today's two
  full runs, so the warning is a STALE-PREMISE CANDIDATE — if it is
  live, the hook needs a timeout and the warning needs its trigger
  condition written down; if it is stale, the warning should go. That
  file is deployed from dotfiles and must be edited there, so the
  question travels to the operator rather than being resolved here.

- **HANDOFF 2026-08-02 LATE evening — supersedes the earlier handoff
  below on every point they disagree. Read this first.** Main is at
  9059d3a, everything pushed, working tree clean, `git stash list`
  EMPTY (the earlier handoff's stash item is resolved). Full suite
  2054/2054/0, run on main after the last integration — main is
  GREEN, which it was not when this session started.
  **WHAT LANDED** (all pushed): 739aa22 the row-4 ordinal fix (the
  535k class, verified four independent ways — see the matrix
  datapoint); 9059d3a the movedFresh/movedRefires split, integrated
  from a sonnet dispatch and dispatcher-verified; 770e915 a RED MAIN
  fixed forward (real capture session ids in tracked .mjs, guard
  broken for a day); 268278c firstDivergence made two-sided
  (identity was not reflexive); 1ed57a7 tools/replay-compare.mjs;
  7673050 the row-24 messages-half investigation booked as a DESIGN.
  **THE ONE THING NOT INTEGRATED — pick this up first.** Branch
  `wt/description-absorb`, commit **fd87e12**, PUSHED to origin as
  insurance (its worktree lives under /tmp and will not survive a
  reboot; the branch will). It is the row-23 + row-24-tools-layer
  description-absorb build: 182 lines of deferred-tool-rewrite.mjs
  plus the 366-line bite, which the dispatcher confirmed genuinely
  red against clean HEAD (5 behavioural fails, both safety CONTROLs
  already green). Its full report DID arrive before the session
  closed and it changes the picture — **do not deploy fd87e12 as it
  stands.** NOT RE-RUN BY THE DISPATCHER; what the AGENT verified:
  bite 9/9, deferred-tool-rewrite 40/40, `npm test` 2044/2043 (sole
  failure = the absence-scan guard expected at its pre-fix base),
  corpus replay complete both sides, and red-first RE-ESTABLISHED
  independently in its own clean worktree at 9799ff0 (9 tests,
  4 pass / 5 fail, both safety CONTROLs among the passes).
  Deviations: none, bite untouched.
  **THREE THINGS BLOCK DEPLOYMENT, all raised by the agent as
  questions above its tier — the next session's first decisions.**
  **G2, the important one: THE SHIPPED FORM MISSES THE BUST THAT
  MOTIVATED IT.** `classifyToolChange` on the raw captured arrays
  does return `description-absorbed` for the 15:53 pair — but in the
  REAL state chain request 1202 still RESETS, because the canonical
  holds FIRST-SEEN order while sort-stabilization (order 200)
  name-sorts the incoming array, so after any earlier addition the
  orders never match again (that key shows 370 pure-reorder
  `rewrite` results before 1202). Counterfactual, on a chain the
  agent first validated by reproducing the executed pipeline's own
  histogram and absorb ordinals exactly: relaxing the precondition
  from ORDER-identity to SET-identity (same names, no held, no new;
  `input_schema` identity UNCHANGED so the safety boundary is
  untouched, and the extension already forwards its own order) takes
  the corpus from 14 absorbs to 52, resets 3 -> 2, and COVERS 1202 —
  the live 484,972-token bust. The agent shipped the strict form
  because the BITE mandates it ("CONTROL — order is part of the
  identity the absorb requires") and correctly refused to edit the
  bite to fit its code. THE DECISION IS OURS: is tools[] order part
  of the callable contract, or is SET-identity the intended
  precondition? If SET-identity, re-specify the bite's reorder
  CONTROL FIRST, then change the code — never the other way round.
  **G1: the offline gate does not declare the new announcement.**
  Corpus old -> new: safety 0 -> 14, conservation 2 -> 16 (+14
  `invented`), one cause — `isDeclaredInjection` (tools/replay.mjs
  :330, and the conservation clause at :1949) accepts ONLY a system
  message whose content is entirely `tool_addition` blocks, while
  the description notice carries TEXT blocks (it must: no tool is
  added). Not corruption; the gate needs widening, keyed on the
  extension's reported `descriptionChangedNames` rather than on
  shape. Until then the daily gate goes RED on legitimate work —
  the fires-on-a-non-defect class this repo treats as its own
  defect.
  **G3: the wire carrier is unproven against the live API.**
  `tool_addition` blocks are probe-backed for opus-5/fable-5; a TEXT
  block on a mid-conversation system message under that beta is NOT,
  and the shipped code assumes the allowlist built for the former
  covers the latter. One `tools/probe-tool-addition.mjs`-style run
  settles it and is owed BEFORE this rides live.
  **Row 3 for fd87e12:** no state-key change; freeze logic EXTENDED
  not altered (the canonical is now retained across one delta class
  that previously re-baselined); persisted `additions` entries gain
  additive `kind`/`sig` fields. Old files read fine, but state
  written by this build and read by the OLD build mis-marks
  defer_loading — **forward-compatible only, so a rollback after
  deploying it is not clean.**
  Its worktree (scratchpad/wt-desc-absorb) is disposable; the branch
  is the work. Note the agent did NOT read BACKLOG.md or matrix rows
  23/24 — both were on its do-not-touch list and it worked from the
  bite — so nothing in those files informed its G2 choice.
  **DEPLOYMENT IS OWED AND NOT DONE — this is the largest open
  item, and the plan CHANGED at the last minute.** The intent was
  one restart carrying all three `proxy/**` changes. G1-G3 above take
  fd87e12 off that list, so the choice is now explicit and it is the
  next session's to make: **deploy the TWO landed changes now** (the
  ordinal fix + the movedFresh split, both on main, both green, both
  cache-transparent), or hold the restart until the description
  absorb clears its three blockers. The recommendation from here is
  DEPLOY THE TWO: the ordinal fix is the 535k-token class and it
  earns nothing sitting on disk, row 4 closes only on the live
  non-event, and fd87e12's G2 decision may take a round or two. The
  cost of not bundling is one extra restart, which is cheap and
  cache-transparent; the cost of bundling is that the largest
  measured win waits on an open design question.
  Mechanics: dotfiles pin `CACHE_FIX_PROXY_TREE_PIN` is at `ad4ff80`
  (bootstrap/manifest.py:157); the proxy tree is `5d651e7` as of
  9059d3a — recompute with `git rev-parse --short HEAD:proxy` rather
  than copying that value, since it moves with any `proxy/**` commit.
  Then `systemctl --user restart cache-fix-proxy`, then one gate
  run. Row 3 is answered for BOTH landed changes: no new state key,
  no persisted schema change (only canonical `o` VALUES corrected in
  place), and `freeze` does not appear in insertion-normalization
  .mjs at all — the restart is cache-transparent and cleanly
  reversible. fd87e12 is NOT (forward-compatible only; see its Row 3
  note above), which is a second, independent reason not to bundle
  it. Rows 4 and 23 close on the LIVE non-event, not on the build.
  **ENVIRONMENT TRAP that cost this session real time, and will cost
  the next one the same:** a git worktree does NOT inherit
  `node_modules`, so `npm test` in a fresh worktree dies with
  `ERR_MODULE_NOT_FOUND: Cannot find package 'hpagent'` across every
  proxy-* suite and two tests then appear to HANG for ~899 s. Both
  agents hit it and one of them misread it as CLAUDE.local's
  documented production-port hazard. Fix when creating a worktree:
  `ln -s <repo>/node_modules
  <worktree>/node_modules` (5 packages, that is all this repo
  needs). COROLLARY, and it corrects an earlier claim in this file:
  the "npm test can hang on the production port" warning is
  NEITHER confirmed nor refuted by today's evidence — both observed
  hangs are fully explained by the missing dependencies, so they are
  evidence for neither side. The stale-premise question stays open.
  **STILL LIVE OFF-GIT:** the 46 MB row-4 pin
  (test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json,
  untracked, git-excluded) and its source capture both still exist.
  It earned its keep twice today (see the 3-UPDATE item below) and
  should NOT be deleted — but fixture-cut cannot make it
  committable; see the content-addressed-fixture READY item for the
  axis that can.
  **PRIORITY ORDER for the next session, revised after the agents'
  final reports:** (1) **settle G2** — order-identity vs
  set-identity for the description absorb. It is a one-question
  design decision worth 484,972 measured tokens on the very bust
  that motivated the build, and everything else about fd87e12 waits
  behind it. If the answer is set-identity, the BITE changes first.
  (2) G1, widening replay's `isDeclaredInjection` — cheap, tools/-
  only, not deployment-coupled, and until it lands the daily gate
  reports 14 false violations. (3) The deployment boundary for the
  two landed changes (see the recommendation above), then the gate
  run that closes row 4 on a live non-event. (4) G3's carrier probe,
  before fd87e12 ever rides live. (5) Price the NARROW container
  normalisation from the row-24 messages design — it covers the
  unconditional 589k half by itself and may make the wide
  message-level pin unnecessary. (6) The content-addressed fixture
  format, before pinning the next large fixture. STANDING GO carries forward with both refinements (do not
  blindly book a mis-scoped request; do not close an investigation on
  a first negative) and all gates still bind.
  **RESIDUE, named:** the movedFresh reset-path emitter is covered by
  reading and by a success-path bite, but the reset+re-fire-only
  combination was never executed — the dispatcher looked for it
  across a 963-request capture and found ZERO instances, so it
  remains not-observed rather than confirmed. Two worktrees I created
  were removed at wrap-up, and the old locked
  agent-ade6b83a41d013bf0 worktree was removed too: its only content
  was the description-absorb bite, now committed byte-identically in
  fd87e12 (diffed before removing).

- **HANDOFF 2026-08-02 evening — three items carry LIVE OFF-GIT STATE
  a fresh session cannot discover by reading the repo. Read this
  before starting anything below.** The session that produced them
  ended at ~650k tokens; everything verified is already committed and
  pushed, so `git log` is trustworthy — what follows is only the
  work that is NOT in a commit.
  (1) **RESOLVED 2026-08-02 evening (739aa22, pushed) — the stash is
  popped, verified and committed; `git stash list` is empty and the
  bite is tracked at test/insertion-ordinal-reattribution.test.mjs.**
  Red-first arrangement stated in the commit: NEW bite against OLD
  implementation (main tip, patch out of the tree) → moved 0,
  reset/not-subsequence, CONTROL green; same bite green with the
  patch. Corpus A/B over four captures / 4,136 requests eliminated
  three resets, one per busting capture (c7c83ca5 n=894, 6df6b9d2
  n=839, 0fbf8674 n=1417 — the last two are the very instances the
  design entry named), with zero deltas on a capture lacking the
  shape. Row 3: no new state key, no schema change, `freeze` absent
  from the file. Row-4 datapoint written to the threat matrix. What
  remains is DEPLOYMENT only, on the shared boundary. Original entry
  follows for the record.
  **(1-orig) Ordinal fix (row-4, the 535k class) — THE STASH IS GONE;
  the work is not. Recovery, 2026-08-05:** `git stash list` is EMPTY and
  `.git/logs/refs/stash` does not exist, so the `git stash pop` recipe below
  no longer works — it would pop nothing, or someone else's later stash. The
  commit itself survived as an UNREACHABLE object and is now anchored by a
  tag so gc cannot take it: **`wip/ordinal-fix-2026-08-02` = 692abc0**,
  verified to be exactly this entry's description (143 insertions / 4
  deletions in proxy/extensions/insertion-normalization.mjs, base 1ea9804).
  Use `git stash apply wip/ordinal-fix-2026-08-02` — apply, not pop, and it
  three-way merges onto a main that has moved since 2026-08-02. Attribution,
  since a stash push+pop happened in this repo on 2026-08-05: the drop
  PREDATES it — `git stash list` printed exactly one entry (that session's
  own) while its stash was live, and `git stash push` never removes existing
  entries. When it was dropped is not recoverable; the stash reflog goes with
  the ref. The untracked red-first bite is still on disk
  (test/insertion-ordinal-reattribution.test.mjs, 4,256 bytes).
  Original text follows, with the stale recipe kept only so the pointer's
  history is legible: implementation
  lived in a stash that no longer exists — recovered and anchored as tag
  `wip/ordinal-fix-2026-08-02`, see the correction at the head of this entry;
  "WIP on main: 1ea9804", 143 insertions / 4 deletions
  in proxy/extensions/insertion-normalization.mjs. Its red-first bite
  is on disk UNTRACKED at test/insertion-ordinal-reattribution.test
  .mjs (88 lines) and is EXPECTED TO FAIL without the stash — do not
  commit it alone, that would put a failing test on main. Recipe:
  `git stash pop`, run the bite (RED before / GREEN after was already
  demonstrated by hand), then the four suites named in the design
  entry, then a corpus check over >=3 captures incl. the row-4
  busting one (`s-captureA`). The design is settled and
  written out in the "MECHANISM FOUND" entry below — classifyPinned's
  match loop, family (h,r) whose stored count exceeds wire count by
  exactly one, re-attribute via condition (d)'s lo/hi discriminator,
  fail closed otherwise. `proxy/**` so it is deployment-coupled: pin
  bump + restart at a stated boundary, and the report must state
  whether it writes a state key or touches freeze logic (row 3).
  (2) **Description-absorb (row 23 + the row-24 tools layer) —
  worktree `.claude/worktrees/agent-ade6b83a41d013bf0` at base
  360093a, LOCKED, holding only an untracked
  test/deferred-tool-description-absorb.test.mjs.** The extension was
  never modified; the agent was aborted early. Either finish it there
  and cherry-pick, or delete the worktree
  (`git worktree remove ... --force`) and restart from the design in
  the row-23 entry. NOTE the scope GREW after that brief was written:
  this same mitigation also absorbs the row-24 `/resume` tools-layer
  bust (session id embedded in the Bash description), so it now has
  TWO real test cases, and the second is the better one because it
  recurs on every resume.
  (3-UPDATE 2026-08-02 evening) The 46 MB pin is still on disk and its
  source capture still exists. It has now EARNED its keep twice over.
  First, as independent verification of the ordinal fix on sanitized
  bytes: replayed under pre-fix and post-fix code, exactly 1 of 895
  entry verdicts differs — n=894, `reset/not-subsequence` (suppressed
  31) -> `normalized` (suppressed 32). That is a stronger inertness
  statement than the live-capture A/B because the fixture is
  tokenized, so it holds even after the capture rotates. Second, the
  attempt to minimize it exposed a real instrument bug: fixture-cut
  refused with "internal error … d=0 failed its own identity check
  against itself", which was NOT fixture-cut's bug but a one-sided
  presence guard in firstDivergence — fixed two-sided in 268278c with
  a red-first reflexivity bite. Minimization re-run after that fix;
  whether the fixture becomes committable is recorded below when the
  run lands. NOTE for whoever reads the fixture as row-4 evidence: it
  produces exactly ONE mitigation row, at 783->804, and none at the
  pinned range 892..894 — the pair's value here is the ENTRY VERDICT
  flip at n=894, not a mitigation row. Also n=893 replays as
  `reset/no-prior-canonical` with inLen=1, i.e. a foreign
  single-message request sits inside the pinned range.
  (3) **Frozen evidence, untracked and locally git-excluded:**
  test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json (46 MB,
  the row-4 busting pair). tools/fixture-cut.mjs now exists (2cd23fa)
  and is the tool that would make it committable — that sweep was
  never run. If the file is gone, re-pin with `harvest --pin <key>
  892..894` — resolve `<key>` from `bust-triage --list`, which prints
  the freeze command with the live key already filled in, rather than
  from a session id written down here.
  Also live: two worktrees were removed at integration today; if
  `git worktree list` ever shows an `agent-` entry with no running
  agent, it is a leak — remove it.
  **STANDING GO, carried from the 2026-08-02 session — this is the
  operator's grant, not an assumption.** Work autonomously by best
  judgement; dispatch freely without asking per-item; book and
  persist everything as you go. Two explicit refinements the operator
  made during that session, both to be continued: (a) do NOT blindly
  book a request that is mis-scoped — improve it and say why, which
  the operator called out approvingly twice; (b) do NOT close an
  investigation on a first negative — the operator had to push for
  another digging round and was right both times, which is now the
  Grounding true-basis clause. Gates that still bind: anything
  published under the operator's accounts (upstream issues, PR
  comments) is DRAFTED and approved before posting; `proxy/**` changes
  are deployment-coupled and ride a stated boundary with a dotfiles
  pin bump + restart; haiku is barred; the fable consolidation review
  of the corpus is booked in the dotfiles corpus backlog and must NOT
  run in a session that authored those mints.
  **PRIORITY ORDER for the next session**, highest value first:
  (1) finish the ordinal fix from tag `wip/ordinal-fix-2026-08-02`
  (`git stash apply` it; the stash index it once lived at is gone) — it is the 535k-token
  class and the design is settled; (2) the description-absorb build,
  which now absorbs TWO measured classes (row 23 plus the row-24
  `/resume` tools layer, the better test case since it recurs on
  every resume); (3) the row-24 messages layer — investigate at opus,
  escalate to fable if opus finds no design, explicitly not closable
  on a cheap negative; (4) the deployment boundary once (1) and (2)
  land: pin bump + restart carries both, plus the `movedFresh`
  telemetry split which should ride the same restart rather than
  spending a second boundary.

- **NEW CLASS 2026-08-02 — description-only tools[] change re-bills
  the whole context; mitigation dispatched.** Live in the
  dispatcher's own session: bust 15:53:46, 552k re-written,
  transcript `tools_changed / 484972`, capture pair 15:53:08.789Z ->
  15:53:26.105Z (ordinals 1200..1202). Measured on the raw bodies:
  the tool SET is unchanged (13 before, 13 after, no adds, no
  removes, same order) and exactly ONE tool differs — `Bash`, with
  `name` identical and `input_schema` BYTE-IDENTICAL, only
  `description` growing 2907 -> 2984 chars. **77 bytes of tool prose
  re-billed 484,972 tokens**, because tools precede messages in the
  cache prefix. The added line is advisory ("Command output is
  displayed to you, not reliably to the user"), i.e. a client-side
  text edit, not a capability change. Messages were `append-only`,
  so nothing mid-history moved — this is purely a tools-block event.
  deferred-tool-rewrite BEHAVED AS DESIGNED and is not at fault: its
  telemetry reads `action=reset reason=tool-schema-changed` — it
  holds tools[] stable for ADDITIONS (announce in-band) and takes the
  honest reset for any schema change to an existing tool. Nothing
  covered a description-only delta.
  MITIGABILITY: YES, and the boundary is what makes it safe —
  identical `input_schema` guarantees the model cannot emit a call
  the client is unable to execute, so a stale DESCRIPTION is safe
  where a stale SCHEMA is not. Design (settled, dispatched to opus
  in an isolated worktree): on a delta that is description-only,
  forward the CANONICAL tools block and announce the changed
  description in-band via the extension's EXISTING announcement
  machinery, with distinct telemetry; anything touching name,
  input_schema, set or order keeps today's honest reset. Verifier:
  red-first bite on a description-only pair plus a CONTROL bite
  proving an input_schema delta still resets, and a live replay of
  ordinals 1200..1202 showing the forwarded tools block byte-stable.
  Deployment-coupled (`proxy/**`), rides a stated boundary.
  INSTRUMENT GAP found in the same triage, booked below: bust-triage
  called this UNCLASSIFIED although it had already read and printed
  `transcript tools_changed`.

- **READY (trigger fired) — fixture minimization at pin time
  (was PARKED as "harvest --pin --replay-from K", fixture-cut c3).**
  The park's stated build trigger was "a second fixture needing
  minimization"; today produced it — pinned-s-9f12950909ed-892-894
  .json is 46 MB (full prefix from 0) and is untracked-and-excluded
  precisely because it cannot be committed at that size, which
  leaves the row-4 evidence outside git rather than in it. The
  2026-08-01 ruling that minimization stays a post-step gated by
  tools/fixture-verdict-identity.mjs still holds — this item is the
  post-step being built, not a harvest parameter.
  Write-set: `tools/fixture-cut.mjs`, `tools/harvest.mjs` (the `--pin`
  writer that hands the post-step its input) — gated by, and therefore
  NOT writing, `tools/fixture-verdict-identity.mjs`. Slot added
  2026-08-19 by the Kämmung cure-4 pass; the artifacts are the ones
  this entry's own prose already names, not a fresh judgment.

- **CANDIDATE MINT, belongs to the CORPUS layer not this repo — a
  STOPGAP is never the recommendation on its own (dispatcher defect,
  2026-08-05).** Evidence: asked how to keep captures alive for a
  running analysis, I offered three options and recommended raising
  the retention ceiling — a knob that buys hours and moves the same
  loss later. The durable design (evidence leaves the window at
  finding time, kilobytes per row, into git) came only after the
  operator asked "isn't there a GOOD permanent solution?", and it was
  ALREADY WRITTEN in this repo's own runbook as closing-gate question
  2, which I had not re-read.
  Target entry, by amendment not addition: CLAUDE.md "Recommending &
  reporting", whose existing rule kills hedging options beside a
  strong recommendation. The gap is one level down — the
  recommendation ITSELF can be a stopgap, and a stopgap is defensible
  only as a bridge. Proposed widening, in that entry's register: a
  stopgap recommended alone reads as a solution and closes the
  question; it ships named as a bridge, with the durable fix stated
  beside it and a revert trigger written where the knob lives, or it
  is not the recommendation.
  Why it is corpus-level and not project-level: it fired here on a
  retention ceiling, but the shape is any knob, timeout, retry,
  allowlist or cap — every project has them. The project half of
  today's lesson (a recurring finding-producer has no closing moment)
  is already minted in `docs/dev-loop.md` question 2, which is where
  it is true.
  Not minted from this session on purpose: the global corpus is
  governed by `CLAUDE-maintenance.md` (amendment-over-addition, the
  render test, a JOURNAL line in the dotfiles repo), and that repo
  currently has a concurrent writer holding `claude/`. It is a
  focused unit, not a fold-in.

- **CANDIDATE MINT, belongs to the CORPUS layer not this repo —
  brief-time path existence check (dispatcher defect, 2026-08-02).**
  Evidence: the row-24 investigation brief listed `tools/census.mjs`
  as a file to read. That file does not exist — the census lives
  inside `tools/replay.mjs`. The agent surfaced it as a gap instead
  of bridging it (correct behaviour, and the reason it cost nothing),
  but a cheaper-tier executor might have invented a plausible
  substitute. dispatch-discipline §1 already carries the rule this
  violates ("Files to read, listed — never paraphrased"); what it
  lacks is the check, and I named the path from memory.
  Per CLAUDE-maintenance's precipitation-first rule this is a HOOK
  candidate rather than prose: "every repo-relative path named in a
  dispatch prompt exists" is computable with near-zero false fires.
  A hook is a config write and therefore veto-gated, and the corpus
  is the operator's layer — so this is recorded here as a candidate
  and surfaced, not minted from a fork session. Widening the existing
  §1 clause beats adding an entry if it stays prose.

- **READY — price the NARROW container normalisation before building
  the wide message-level pin (row 24 messages half, 2026-08-02).**
  Order matters here and the investigation said so itself: the narrow
  fix — normalise ONLY the string <-> single-block `content` container
  on a `role:"system"` message, leaving `cache_control` untouched —
  covers the 588,956-token UNCONDITIONAL half by itself, because that
  bust was a clean message-layer isolation (`cacheRead=15,223`, exactly
  tools+system, byte-identical). The wide fix (volatile pin widened
  from block level to message level, plus removal tolerance re-serving
  canonical bytes instead of dropping) reaches 100% of the pre-exit
  array but is a much larger change to phase-3 behaviour. Do the
  pricing first: if the narrow one holds, the wide one may not be owed
  at all. Both are `proxy/**`, deployment-coupled.
  Full design, simulation, safety argument, named risk (stale
  `cache_control` re-served beside the live one — count them, budget
  is 4) and the value split are in the threat matrix, section
  "Row 24 — messages layer". Verifier for either: the simulation the
  investigation already ran — `firstDivergence(A, forwarded) === null`
  plus `validateToolAdjacency(forwarded)` on the real 16:06:39 /
  16:12:42 pair of s-captureJ — as a red-first bite, since neither
  holds today.
  NAMED MISSING EVIDENCE, and it gates nothing but should ride along:
  the container flip has ONE measured instance and its corpus-wide
  frequency is unmeasured. The check that would settle it does not
  exist — "divergence at a string-content message that previously
  carried `cache_control`", a replay.mjs addition, tools/-only and not
  deployment-coupled.
  SCHEDULING NOTE, from the same measurement: the cache is a strict
  prefix [tools][system][messages] and tools differ by construction on
  every resume, so the resume's FIRST request is gated by the
  SYSTEM-PROMPT half, not by this one. This work buys the second
  request and everything after it.
  Write-set: `proxy/extensions/insertion-normalization.mjs` (the volatile
  pin this entry widens) — DEPLOYMENT-COUPLED, so the pin bump and a
  session-boundary restart ride with it; plus `tools/replay.mjs` for the
  named-missing-evidence check, which is tools-only and separable. The
  two halves have different write boundaries and can be split into two
  lanes; the entry's own ordering rule (price the narrow one first)
  survives either way. Slot added 2026-08-19 by the Kämmung cure-4 pass,
  derived from this entry's own "Both are `proxy/**`, deployment-coupled"
  and its `replay.mjs` sentence.

- **READY — content-addressed fixture format: the axis that actually
  makes a pinned fixture committable (2026-08-02, measured).**
  fixture-cut WORKS now (it was blocked by the firstDivergence guard,
  fixed 268278c) and on its motivating case it is close to useless:
  on the 46 MB row-4 fixture it dropped 16 of 1707 prefix records —
  ~1% of content; the headline 47.9 MB -> 23.5 MB is almost entirely
  the input being pretty-printed and the output compact. This is NOT
  a fixture-cut defect. Front-truncation is the wrong axis, because
  insertion-normalization's canonical state is stateful from request
  0, so nearly every prefix record is genuinely load-bearing and the
  bisection is right to keep it.
  THE REAL SIZE DRIVER, measured on the cut file: a capture stores
  the WHOLE `messages` array per request, so 887 request records hold
  95,613 message objects of which only 2,466 are DISTINCT — a 38.8x
  redundancy that grows quadratically with conversation length. The
  fixture is big because it stores the same ~2.5k messages 38 times
  over, not because it retains too many requests.
  Design: a content-addressed fixture format — each distinct message
  object stored once in a `messages` pool keyed by hash, each request
  carrying the ordered list of keys; rehydrate at load in
  fixture-verdict-identity's replay path (and harvest's writer).
  Projected: ~23.5 MB -> under 1 MB, i.e. committable, which is the
  entire point of the parent item. Verifier: byte-identity of the
  rehydrated fixture's REPLAY VERDICTS against the flat form —
  fixture-verdict-identity is exactly that comparison and already
  exists, so the check is `firstDivergence(flat, rehydrated) === null`
  over the real 46 MB fixture, plus a red-first bite proving a
  corrupted pool entry is caught rather than silently rehydrated.
  Blocked on nothing. Do it before pinning the next large fixture.
  Write-set: `tools/harvest.mjs` (the writer that emits the pooled form)
  and `tools/fixture-verdict-identity.mjs` (the replay path that
  rehydrates it) — both named by this entry's own design sentence. Note
  the collision this slot makes visible, which is the point of having
  it: `tools/harvest.mjs` is also in the fixture-minimization entry's
  write-set above, so those two SERIALIZE rather than run as parallel
  lanes. Slot added 2026-08-19 by the Kämmung cure-4 pass.

- **Candidate — census `--json` carries no finding rows.** Surfaced
  by the rejectedCandidate build (2026-08-02) and correctly returned
  as a question rather than widened into its scope: the JSON output
  has always emitted rollups (tally/prunes/duplicates/…) and never
  the per-finding rows, so `rejectedCandidate` — and every other
  per-row detail — is visible only in the human print. Consequence:
  a machine consumer sees verdict COUNTS and cannot see which
  occurrence produced them, which is why per-row questions keep
  being answered by re-running the tool by hand and reading prose.
  Build when a second consumer needs row-level data; natural shape
  is a `details` array behind a flag, so the default output size
  does not change.

- **Candidate — gate status code-stamp races a concurrent commit.**
  Today's sweep stamped `toolsTree` at start and a tools/ commit
  landed during its 75-minute run, so the finished status file
  describes a tree that no longer exists and the doctor's
  code-mismatch warning fires on a non-defect — the shape that
  trains readers to discount warnings. Cheapest honest fix: stamp
  the tree at start AND at finish, and say "code changed during the
  sweep" when they differ, which is a different statement from
  "verdict is stale". Build if the warning fires again on a clean
  run; one occurrence is not yet a pattern.

- **Candidate — corpus-wide ordinal-drift detector.** The
  investigation hand-derived "1 of 534 families drifts on the
  busting request"; the manual pass found it once, a stat would
  watch it forever (and would answer the ordinal fix's own named
  gap: how often the class occurs across captures). Design sketch: a
  per-request census/replay stat counting families whose stored
  count exceeds their wire count, reported like the existing
  tallies. Build only if the ordinal fix's corpus verification does
  not already answer the frequency question.

- **OPEN (2026-08-02, dispatcher-measured) — PREMISE FALSIFIED: the
  migrated standalone is NOT always wrapper-stripped, so
  "canonicalize forward to the standalone form" does not cover every
  instance.** Both homes of the premise say it the same way — this
  BACKLOG's row-4 entry and threat-matrix row 4: "CC ... emits the
  same text as ONE standalone `role:"system"` message after the
  host, wrappers STRIPPED and the blocks JOINED with `\n\n`".
  Counter-instance, measured: capture s-captureG, request
  2026-08-02T08:06:10.259Z (second at 08:24:18.702Z, host=74). The
  census reports `MISMATCH host=30 blocks=1 recon=327ch actual=0ch`.
  Raw dump of the request: a standalone counterpart DOES exist at
  host+1 (index 31, role:"system", content a STRING not a block
  array), total length 364, `<system-reminder>` WRAPPER RETAINED;
  stripping the wrapper leaves exactly 327 characters — byte-equal
  to the census's own reconstruction. So the reconstruction rule is
  right about the TEXT and wrong about the ENVELOPE for this shape.
  Consequences, enumerated per the stale-premise rule rather than
  left to be re-derived: (1) a normalization that canonicalizes
  forward to the stripped form would MOVE the bust for this shape,
  not absorb it — which is exactly what the census's own "DO NOT
  SHIP as-is" verdict on MISMATCH says, and it was right; (2) any
  matcher keyed on stripped-and-joined text cannot match a
  wrapper-retaining standalone — a candidate mechanism for the
  un-merge miss at host 568, sent to that investigation as evidence
  to test, NOT as its answer; (3) the census's `actual=0ch`
  diagnostic is misleading here — it reads as "no counterpart found"
  (the documented tell of a matching bug) while a counterpart exists
  and merely failed the standalone predicate; the verdict is right,
  the tell is not. Owed: whether the wrapper-retained form is a
  distinct CC behaviour or the same one at a different lifecycle
  point, and whether the corpus's EXACT rows are all stripped-form
  (i.e. is this rare or merely rarely matched). Do NOT re-grade the
  row-4 design as settled until that is answered.
  SCOPE SETTLED 2026-08-02 (same day) by the host-568 investigation
  this evidence was sent to — and consequence (2) above is REFUTED,
  recorded rather than quietly dropped. Executed on the busting
  pair's raw bytes: the migrated standalone at after[569] contains
  `<system-reminder>` NOWHERE, both source blocks at before[568] DO
  carry wrappers, and stripped-join + "\n\n" + before[569] ===
  after[569] is TRUE while the wrapper-retained join is FALSE — CC
  applied the canonical rule there exactly as both homes state it.
  Capture-wide over that 498 MB file: ZERO wrapper-carrying
  standalones, and the zero is trustworthy because the instrument
  was proven live in the same run (base pattern
  `"role":"system","content":"` matches 820 lines; a synthetic
  positive control matches the wrapper-retaining pattern) — the
  non-event probe done properly. Edge named by that run, not
  bridged: the looser variant cannot cross an escaped quote, so a
  wrapper appearing mid-text after an escaped `"` would be missed;
  the wholly-wrapped shape this entry describes is what the strict
  pattern catches, and that is 0. Net: the falsification STANDS
  (the premise is not universal; s-captureG is a real
  counter-instance and surfaces as MISMATCH, a different verdict
  from that pair's clean EXTENDED), but the form is RARE rather
  than merely rarely matched, it did NOT cause the host-568 miss
  (ordinal misattribution did), and it does not change the ordinal
  fix's design. The only open half left is the first one above:
  distinct CC behaviour, or the same one at a different lifecycle
  point.
  **DATAPOINT 2026-08-10 late-evening, appended under the KNOWN-OPEN
  forward-edge rule that shipped hours earlier — the first walk to
  discharge it, in the same session as the walk and without an
  operator prompt, which is that rule's own done-criterion.**
  `❄ 305k messages_changed`, 18:49:59Z (20:49 local), this repo's own
  dev session, pair n=220->231. ATTRIBUTION **CC's** (raw bytes
  diverged at index 46; no stability violation on the replayed pair).
  Census `replace/edit`, row-4 container migration at host 46,
  EXTENDED/MERGED-STANDALONE, `edit@47 of 230 [anchor-183]`, ~35 kB of
  moved text re-billing 305k tokens. Five block migrations rode along,
  two of them cross-message joins (`46+47->47`, `74+75->75`).
  **Evidence FROZEN and replay-proven**, which is what makes this a
  datapoint rather than a memory: `pinned-s-390797cdcacf-302-310.json`
  (bounded, 611 records, 99 kept / 212 placeholders, 6.0 MB) reproduces
  `n=302->310 edit@47 of 230 [anchor-183]` with all five migrations.
  **What it adds to THIS entry's open half:** the anchor distance. Both
  of today's row-4 instances sit >30 messages from the human anchor —
  the census's own "NOT the known reminder-anchoring class" callout —
  so the lifecycle-point question above now has two same-day
  measurements pointing at the same answer, and any canonicalization
  designed here has to state which of the two shapes it covers before
  it reaches the byte-match gate.

  **DATAPOINT 2026-08-10 21:44 local (19:44:24Z) — the THIRD same-day
  instance, and it makes the anchor distance a pattern rather than a
  pair.** `❄ 179k messages_changed`, capture `s-captureBA`, pair
  `n=143->147`. ATTRIBUTION **CC's**, settled two ways rather than
  assumed: CC's own raw bytes diverged at index 47, and the replayed
  census recorded no stability violation for the pair. Row-4 container
  migration at host 47, EXTENDED/MERGED-STANDALONE,
  `edit@48 of 168 [anchor-120]`, ~25 kB of moved text, three block
  migrations of which two are cross-message joins (`47+48->48`,
  `66+67->67`) plus one in-entry (`90->91`).
  **Evidence FROZEN and replay-verified to carry THIS event, not merely
  to reproduce something:** `pinned-s-9365ef5cd8c1-143-147.json`
  (bounded, 294 records, 80 kept / 68 placeholders) replays under the
  SERVING gate set to `n=143->147 edit@48 of 168 [anchor-120]` with all
  three migrations and the ">30 from the human anchor" callout — the
  same strings the live triage printed. Hygiene gate clean on it, and
  non-vacuously: `raw-content` applied 5,185 times for 0 findings, which
  is also the first LIVE positive for `9464ac0`'s tokenized bounded
  placeholder (the class that blocked the first bounded pin ever
  committed now passes on a new one).
  **What it adds to this entry's open half:** the anchor-distance
  signal is now 3-for-3 today (anchor-183, anchor-120, and the earlier
  instance), all >30 from the human anchor, i.e. all outside the known
  reminder-anchoring class. Two measurements were suggestive; three of
  three with no counter-instance is the shape the canonicalization
  design must cover, and it sharpens the open question from "which of
  two shapes" to "the far-from-anchor shape is the common case here".
  **NOT established, and deliberately not written as though it were:**
  the rate. Three instances in one day is one day of one machine's
  traffic, and this entry has no denominator — the census counts
  instances, not opportunities.
  **This instance also exonerates the D1 restart minutes earlier**, which
  is worth recording because the timing invites the opposite reading: the
  pair's `state-key` line reads
  `296cc2723f48ed4d -> 296cc2723f48ed4d — stable`, and a restart-induced
  rotation IS a key flip. Independently corroborated by the operator, who
  reported the bust as belonging to another session while this one stayed
  clean. Two variables moved in that window (the ship and this bust) and
  the attribution evidence separates them rather than the timeline doing
  it — the two-variable trap this repo has already paid for once.

- **OPEN (attributed 2026-08-02, fix serialized behind a running
  read-only dispatch) — conservation gate fires on
  fresh-session-sort's declared rewrite: 38 violations, capture
  s-captureI, the sole red row in the 15:05 sweep (29 captures,
  ok=false failing=1).** NOT a defect and NOT the smoosh class (that
  exemption stands; conservation exemptions on this capture = 0).
  Attribution, dispatcher-run: every failing request is the FIRST
  request of a fresh sub-key (deferred-tool telemetry reads
  `action=no-baseline` at each), i.e. the parallel agent spawns at
  10:43-10:44; the violations sit at in[0]/in[6] as "1 of 4 units
  lost, 1 of 5 invented" — 4 blocks in, 5 out. Mechanism:
  fresh-session-sort REWRITES a system-reminder block in place
  (`sortSkillsBlock` sorts the skills list's lines) and relocates
  hooks/skills/deferred-tools/MCP blocks
  (`isRelocatableBlock`), so CC's original bytes are neither
  forwarded nor accounted for by any clause the fifth gate carries.
  The extension DECLARES its work
  (`ctx.meta.freshSessionSortStats`, fresh-session-sort.mjs:211) and
  the STABILITY gate already keys an exemption off exactly that
  (`freshSessionSortExemption`, replay.mjs:193) — conservation, being
  newer, never got the clause. Remedy (same shape as the smoosh
  exemption that shipped this morning, 3b32e6b): a declared
  exemption the gate BYTE-VERIFIES by chaining the extension's own
  transform, tamper stays red, exemptions counted visibly.
  Complication, named: fresh-session-sort does not export its
  transform today, so chaining it needs an export — a `proxy/**`
  change, behaviour-neutral but deployment-coupled (pin bump +
  restart; row-3 clear, no state keys or freeze logic). SERIALIZED,
  not parked: tools/replay.mjs is in the read set of the running
  un-merge investigation, and a concurrent writer there would hand
  that agent an unstable instrument.

- **REFRAMED 2026-08-02 (sonnet dossier, dispatcher-verified in the
  transcript: cache_read climbs smoothly through the event, creations
  stay sub-3k, zero cache_miss_reason) — the two enormous interior
  prunes BILLED NOTHING; the open question is now the
  instrument-vs-billing mismatch, not the prune size.** Dossier of
  12:42:11.673Z (f94e53ce, capture present; b6952ffc's rotated
  away): 14 messages removed, ALL role:"system" (899–15852 B),
  scattered indices 4→653, not anchor-clustered; index-4 BEFORE =
  role:"system" CC date-changed reminder (15852 B), AFTER =
  ordinary assistant turn. Raw-capture divergence at div=4 AND the
  prefix-diff ledger's independent flag at the same index/moment —
  yet the transcript shows no billing event at all. Consequence,
  the stale-premise cascade: "billing is all-or-nothing per
  request" NARROWS to "when a mid-history miss FIRES, re-bill is
  ~total (11:41 measurement stands); instrument-visible divergence
  does NOT imply a miss fires — interior role:'system' removals
  measured billing-free" (correction lines added at both homes:
  the row-4 entry below and matrix row 4). Mitigation consequence:
  this prune class needs NO absorption — it is already free; what
  it needs is the instruments learning which divergences bill.
  OPEN question, next step: characterize what the API's cache
  actually keys on across role:"system" entries (a controlled
  probe, or passive: census prune rows joined against transcript
  usage per event — the join the dossier hand-ran, mechanizable).
  Instrument findings booked: capturePair silently picks the wrong
  pair when driven by a floored timestamp (candidate below); the
  s-<8hex> tokens here are raw UUID prefixes, not sidToken hashes
  (bust-triage.mjs:461 — brief premise corrected).
  Original entry: `12:42:11.673Z n=688->675 div=4 anchor=674
  rebilled=671` (s-captureN — invisible to every verdict until
  a77c930) and `11:40:24.245Z n=83->81 div=4 anchor=80 rebilled=77`
  (s-captureW); the census prune rows surface any recurrence
  without a hand-run.

- **Candidate — capturePair floored-timestamp mis-selection
  (prune-dossier instrument finding, 2026-08-02).** Driven by a
  floored/seconds-grain timestamp, capturePair (bust-triage.mjs:252,
  also dossier.mjs's path) silently picks the wrong request pair for
  sub-second-adjacent events — the dossier worked around it by
  locating the pair by hand and calling the classifiers directly.
  Adjacent to the resolved reset-telemetry preference and the parked
  join-key entry; fix candidate: carry ms precision end-to-end or
  prefer the pair bracketing the exact event ts. Trigger: next
  bust-triage/dossier session touching that file.

- **PARKED — park basis RE-CONFIRMED 2026-08-10 by an independent sweep, which
  is the only thing that could have unparked it.** The dispatch-guards session
  swept both repos' records since the park for an incident in either direction —
  a message claiming absent content, or a warn-only hook misfiring — and found
  NONE. Its cited mitigation has moved 0.1.12 -> 0.10.13, i.e. more cover than
  this entry knew about, but still not the incident its trigger names. Gap
  stated rather than assumed: incidents outside that sweep's read scope were not
  visible to it, so this is "no evidence found", never "no evidence exists".
  Stays parked, missing evidence unchanged.
- **PARKED — commit-claim guard (commit-msg hook, warn-only): a message
  naming a file/symbol absent from the staged diff.** Evidence, twice in
  two days in THIS repo: acc0814's message claimed a BACKLOG.md edit the
  commit did not contain (landed separately as c369e50), and 7b2a5ef's
  message listed `hostId` among the census exports while the staged file
  lacked it — the code sat uncommitted until session close 2026-07-31
  (committed 3afce21). Both are the same shape: the message was written
  against intended state, not staged state. Parked on a design decision
  the operator owns: the hook lives in dotfiles (git hooks are deployed
  from there), and the computable predicate needs care to avoid
  fire-on-non-defect (messages legitimately name files they do not touch
  — "matrix row 4", "see BACKLOG"); candidate slice: warn only when a
  message uses change verbs (add/fix/export/remove) adjacent to a
  path-or-symbol token that greps to zero hits in `git diff --cached`.
  Trigger reworded 2026-07-31 (operator GO) from a count to a content
  test — a third incident adds count, not information; the predicate's
  false-fire problem is not fixed by more examples. Unpark and BUILD
  (backtick-scoped slice only: change verb + backtick-quoted
  path-or-symbol token with zero hits in `git diff --cached`) when an
  incident arrives where the false message carried real cost (someone
  acted on it before the diff corrected them) OR one the backtick
  slice would provably have caught. A further CHEAP self-surfacing
  incident is instead evidence to DROP the item with a one-line
  reason: the class is real but self-healing (the message sits
  permanently beside its own refutation, the diff), and exposure has
  shrunk since the park — the push-claim reminder (dispatch-guards
  0.1.12) now creates a review moment before agent commits publish.
  Either way the next incident decides; the item leaves in one of the
  two directions.

- **PARKED — row 4 rate re-measure (telemetry, NOT a gate on the item
  above).** (Header restored 2026-07-31 — c53ea3a replaced this line
  instead of inserting above it, gluing this item's body onto the
  commit-claim entry.) Missing evidence, named: 14 replace/edits in 179 pairs (7.8%)
  in one session vs 5 in 838 (0.6%) in the 940-request corpus that closed
  the row on 2026-07-28 — one session against a corpus, so the rate is not
  established. Trigger to unpark: a `--census` sweep over the harvested
  corpus reporting MID-HISTORY replace/edit counts WITH anchor distances,
  so "deep" separates from "1-2 off the tail" (four of the five here were
  the latter, ~1-5 kB). Value is retirement/telemetry evidence and sizing
  the win — never permission to build.

- **PARKED — suggestion-mode ephemeral turns (matrix row 22): establish
  pruning-boundary stability.** Missing evidence, named — and note the
  fire rate is deliberately NOT among it: the Mitigation policy states
  fire counts are never a worthiness threshold, so frequency sizes the
  win but cannot gate the work. What DOES block is mitigability:
  (a) context only — how often CC injects `[SUGGESTION MODE: …]` turns into the live
  `messages[]` — observed once, at 2026-07-31T11:41:05.778Z, where 8
  scaffolding entries were pruned as the array went 130→124; (b)
  whether the injection/pruning boundary is stable enough to pin, i.e.
  whether the turns are recognisable by something better than their
  text prefix. Mitigability is UNASSESSED and must stay so until (b):
  these entries carry ordinary `user`/`assistant` roles, so holding
  them out of canonical history on a text match risks dropping real
  conversation — safety outranks cache. Note the class is
  independently real but was NOT the cause of the 11:41 bust (row 4's
  mutation at index 98 sat earlier and dominated the re-bill).

- **Candidate — leakedOutBytes column (fire-bytes proposal 3,
  2026-08-02).** rebilledOutBytes exists and is real but every
  observed row read 0 (outputPreserved:true) — build only if the
  output-side leak ever measures non-zero; trigger: a sweep showing
  rebilledOutBytes > 0.

- **Candidate — fire-ledger verdict gains saved/(saved+leaked)
  (fire-bytes proposal 4).** UNBLOCKED 2026-08-02 (0a905a5 —
  savedBytes live); those two share RAW's denominator, so theirs is
  the one meaningful ratio on the line (units note already in
  gate-live's header). Build on operator wish or when the series
  has enough lines for the ratio to say something.

- **Candidate — docs-name-real-gates test** (2026-07-30, consumer-doc
  tiering): a small test asserting every CACHE_FIX_* named in
  docs/*.md exists as an env the code actually reads — a doc
  recommending a renamed/removed gate misleads consumers silently
  (the consumer principle for docs). Build at next docs touch.

- **Candidate — tools/whodunit: timestamp-correlation sweep as a
  tool** (2026-07-30, first use was a hand grep): given a
  timestamp, sweep all event logs (insertion, guard, deferred,
  upstream-changes, upstream-errors) +-5s and print correlated
  events — the mechanized form of dev-loop's "rule out ourselves"
  step. Second use graduates it into tools/ per the probe rule;
  built then, not now.

- **Residual — harvest --pin needs a ts-range mode** (2026-07-30):
  ordinal selection against a LIVE capture failed twice in one hour
  (growth moved the window; harvest's numbering differs from a hand
  count — two schemes, the identity error at ordinal level). Pin by
  timestamp range + echo endpoint timestamps in the report line for
  eyeball verification; deep-range pins also need a no-full-prefix
  mode (297 MB fixture from an 8-request window).

- **Watch threads** for responses: anthropics/claude-code #76606,
  #81967, #78660 (our comments with measurements), #82229 (our issue),
  cnighswonger PRs #272–#281.

- **ECONNRESET on >200K cold contexts (CC#79989) — exposure noted,
  mitigation candidate.** This fleet runs the 1m beta at 700k+ contexts.
  If a session hard-fails every request after going cold, this is the
  first hypothesis; the candidate mitigation is a forward-path
  retry/backoff. Not built: no local occurrence yet (deferral basis:
  zero observed instances here — an occurrence is the build trigger,
  and the threat-matrix coverage section carries the class).

- **Reminder-swap (#76606): DECIDED — pin-and-suppress (operator
  "B", 2026-07-29 evening).** Resolution history: fidelity probe
  proved replay byte-faithful to the wire; the "mitigated:true" had
  been the METRIC's blindness (input-side only), and the pipeline's
  real behavior is restore-the-pin AND forward the duplicate — a
  splice at 31 that re-billed 124k while carrying the reminder
  twice. (a) DONE: census blockMigration annotation (5cdf51b).
  (b) DONE: output-side metric (3db056b, pushed; dispatcher-verified
  under boot-record gates — flags exactly n=26->28, nowhere else in
  1190 requests). Residuals from its report, accepted with names:
  the real-pair test SKIPs (not fails) once the capture rotates —
  third motivating instance for "Harvest pins instances" above; and
  the metric newly exposes FIVE more output-spliced pairs (~0.6 MB,
  ordinals in the mitigation report) — classify against
  blockMigration after (c) lands, they may be a different mechanism.
  (c) DONE 2026-07-30 (c5d870d, sonnet build;
  dispatcher-verified: suites green, full-corpus gate 0/0/0/0 under
  boot-record gates, real pair edit@31 ~61 kB -> edit@48 ~5 kB).
  Two spec corrections booked from the build, both verified: the
  "declared exemption in the live output-guard" clause was written
  against a check that does not exist (output-guard has no
  message-count invariant BY DESIGN — its directive line 58; 0
  fires over 1190 requests) — no exemption owed; and the literal
  acceptance criterion "outputPreserved:true / rebilledOut 0" was
  unreachable by this fix alone — the residual divergence at 48 is
  ttl-management relocating its cache_control marker off the old
  tail (messages differ in ONLY that key, direct diff), expected
  behavior of a different extension. The stability gate needed the
  same declared exemption as the safety gate and the brief did not
  name it (67 false fires before the fix, caught by full-corpus
  replay) — lesson: a message-COUNT change gets checked against all
  four replay invariants, not the two a brief happens to name.
  Suppression is re-detected per request from the on-disk pin set
  (no new state file). Remaining, named: (1) DEPLOY — `proxy/**` ->
  dotfiles pin bump + restart at a stated session boundary + gate
  run (dev-loop); row 8 closes on the live non-event, not the
  build. (2) The five other output-spliced pairs are confirmed NOT
  block migrations (census post-fix: exactly 4, none of the five)
  — a different, still-unclassified mechanism, still open. (3) The
  three sibling migrations (n=105->107, 107->108, 108->109) were
  covered only by the aggregate gate, not individually verified.
  (4) grep for consumers of the new suppressed/suppressions stats
  fields not run (prior equivalent check on outputForm found none).

- **OPEN — twin busts 2026-07-31 19:13:48 (152k, s-captureV) and
  19:22:40 (190k, s-captureS): KNOWN FAMILY suspected (row-4
  mid-history mutation), plugin-update trigger hypothesis
  unverified.** Evidence gathered at triage time: BOTH sessions'
  telemetry shows a `not-subsequence` reset seconds before the ❄
  stamp (7749d7fc 19:13:31 pinned=3; adf6cadb 19:22:22 pinned=1),
  both on the PRE-restart serving code (deployment 20:04Z); both
  transcripts say messages_changed (152k/165k). Two deep sessions,
  9 minutes apart, same signature → shared trigger; candidate with
  exact timing: `claude plugin update dispatch-guards` completed
  19:13:13.559Z — 35 s before the first bust, and the second landed
  at the other session's next turn (hook-set change plausibly
  changes hook-context reminders mid-history in every live
  session). ATTRIBUTE step owed: byte-diff the reset pair
  (19:22:22 request vs its conversation predecessor) and say WHAT
  moved; whether the deployed un-merge absorbs it is the live
  question.
  ATTRIBUTE DONE 2026-08-01 (sonnet discovery, frozen copies,
  originals byte-identical before/after): KNOWN FAMILY CONFIRMED at
  byte level — both resets are the row-4 container migration
  (reminder blocks leave a host whose hostId/tool_use_id stays;
  not-subsequence confirmed both sides): adf6cadb diverges at
  msg-index 58 in a SIDECAR conversation, its departed blocks JOIN
  an existing standalone (452→1085 B, same index — the
  merged-standalone shape 78940a0 targets); 7749d7fc at index 69 in
  main, a fresh 1925 B standalone. Trigger hypothesis holds as the
  entry predicted: 7749d7fc reset +17.7 s after the plugin-update
  completion, adf6cadb at its own next turn (+549 s), and BOTH
  sessions show the same ~17 s reset→bust-stamp internal lag. The
  live question is unchanged and time-gated: a post-restart
  recurrence means the un-merge did not absorb it; silence means it
  did. TOOL GAP found en route (own fix candidate, small):
  bust-triage's capturePair picks the newest plausible pair ≤ stamp
  and chose an APPEND-ONLY pair 4-16 s after the actual
  reset-carrying request → verdict UNCLASSIFIED was a
  pair-SELECTION artifact, not a new class; candidate rule — prefer
  the nearest same-conversation pair whose after-request carries a
  non-append action (the telemetry knows), fall back to current
  rule. Tool gap resolved — its own DONE entry directly below;
  THIS entry stays open only on the time-gated absorption question.
  NOTE for next occurrence: if this class fires again
  POST-restart, the un-merge did not absorb it — that is the real
  news; tonight's instances prove nothing about the new code.
  WATCH ARMED 2026-08-02T14:32:54Z (dispatcher): the same trigger
  class was fired deliberately — `claude plugin update
  dispatch-guards` 0.1.15 -> 0.1.17 — with the serving code checked
  current first (proxy source fingerprint a80e29b2b356 equals the
  on-disk tree, so the un-merge IS live; /health, not inferred).
  Baseline: 7 bust events 2026-08-02, ZERO of cause
  messages_changed; three model_changed at 14:30-14:32 (537k+281k+
  267k re-billed) belong to an operator model switch ~39 s BEFORE
  the update — a co-occurring variable the cause label separates,
  and the reason the discriminator is the CAUSE, not the count.
  Result at +3 min: no bust of any cause. NOT YET CONCLUSIVE, and
  the reason is the non-event rule: census over the dispatching
  session's own capture shows NO row-4 migration in the post-update
  traffic (69 edits / 18 blockMigrations in the file, none after
  14:32:54), i.e. the trigger has not fired yet — silence so far is
  absence of stimulus, not proven absorption. Live sessions may also
  need /reload-plugins (the update printed "Restart to apply") for
  the new hook set to reach them. How to close this properly: the
  census classifies CC's INPUT independently of billing, so the
  conclusive pair is a request where the census SHOWS the row-4
  container migration AND the ledger shows no messages_changed —
  absorption demonstrated; a messages_changed bust on such a pair
  refutes the un-merge. Next session reading this: run
  `bust-triage --list | rg messages_changed` and the census over any
  capture spanning a hook-set change.
  WATCH ANSWERED 2026-08-02T14:58:11Z — NEGATIVE, which is this
  entry's own stated real news: the un-merge did NOT absorb the
  class. Operator-reported ❄, triaged mechanically with the tooling
  built today: session c7c83ca5, 660k re-written, transcript
  `messages_changed / 535102`, capture pair 14:56:52.670 ->
  14:57:41.375 n=591->595, census replace/edit, migration = row-4
  container migration at host 568 (EXTENDED/MERGED-STANDALONE),
  VERDICT KNOWN-OPEN. It fired 25 min after the deliberate plugin
  update (14:32:54) on serving code checked current, so the trigger
  hypothesis holds and the absorption question is settled negative.
  NOT a dead mechanism — insertion-normalization's telemetry for the
  main sub-key shows it RAN on the busting request:
  `14:57:41.399Z reset resetReason=not-subsequence pinned=34
  suppressed=31 moved=5` (predecessor 14:56:52.694Z: normalized
  pinned=31 suppressed=29 moved=5). Pins restored, 31 suppressions
  applied, 5 join-moves re-served — and host 568 still diverged, so
  the gap is in MATCHING, not in firing: the one shape a non-event
  probe could never have distinguished. Evidence frozen against
  rotation: test/fixtures/harvested/pinned-s-9f12950909ed-590-596
  .json (17 MB, UNTRACKED by design — the fixture-cut minimization
  floor applies before it could ever be committed). Investigation
  dispatched (opus, read-only) for the mechanism at file:line plus a
  minimal absorb design and its red-first bite; any `proxy/**` fix is
  deployment-coupled and rides a stated boundary. Cost datum for the
  Mitigation policy: this single instance re-billed 535k tokens.
  MECHANISM FOUND 2026-08-02 (opus investigation, dispatcher-verified
  at the cited lines and by running the bite): NOT a definition gap
  and NOT the wrapper-retention class (that evidence was sent to the
  investigation and correctly tested-and-set-aside — the un-merge's
  definition covers this pair byte-exactly). The miss is one level
  below the definition, in OCCURRENCE-ORDINAL IDENTITY: identityKey
  is `h|r|o` (insertion-normalization.mjs:381-383, applied
  :1115-1117), and the 421-byte "task tools haven't been used
  recently" nudge occurs 28x in the canonical against 27x on the
  busting wire, so ordinals re-bind — the entry that actually
  vanished (ci 545) matches the surviving copy at wire 584, leaving
  `droppedNow = {560}`, the LAST ordinal, whose predecessor pins no
  reminder, so findJoinMoves takes `continue` at :835 condition (b)
  and returns []. The file already names this class and declares it
  out of scope (:1108-1110, verified verbatim: "the general ordinal
  instability of duplicate copies under middle-copy drops is a
  pre-existing class and deliberately out of scope here") — THAT
  SENTENCE IS THE DEFECT. Counterfactual on the real state:
  attribute the drop to ci 545 and findJoinMoves returns exactly
  {mergedIndex:569, ci:545, afterIdx:568}, conditions (a)-(f) all
  holding, with wanted (622 + "\n\n" + 421 = 1045) byte-equal to
  wire[569]. The reset is a CO-SYMPTOM, not upstream: the single
  strict-increasing break in `matched` is the same misattribution
  (ci 545->584 then 546->570). `moved:5` was five re-fires of
  reserved entries — findJoinMoves minted ZERO fresh recognitions,
  which is why "the mitigation ran" and "the mitigation matched"
  came apart. Distinct from the CLOSED EXTENDED-absorb entry: unit 2
  shipped and works, and the agent's control run shows today's code
  absorbs the identical shape when the nudge has ONE copy; the
  never-measured piece is DUPLICATE SIBLINGS.
  DESIGN (settled, from the investigation): extend the match loop in
  classifyPinned (:1082-1118) — no new function — so that for a
  family (h,r) whose live stored count exceeds its wire count by
  exactly one, attribution is re-derived with the same lo/hi
  neighbourhood discriminator condition (d) already uses; fail
  closed otherwise. Probed on the real request: 1 of 534 families
  triggers and exactly one member qualifies ({ci 545, lo 568,
  hi 570}). BITE exists and is dispatcher-run: ~40 lines synthetic,
  no capture bytes — RED today ("a swallowed MIDDLE copy of a
  recurring standalone is recognized as a join-move": moved 0), and
  its CONTROL (one nudge copy) GREEN, so the bite isolates the
  duplicate-sibling case rather than the machinery. Named gaps
  before shipping: corpus-wide effect across the other captures not
  measured, and row-3 restart safety not exercised (no state key
  written, but freeze logic untested). EVIDENCE CORRECTION: the
  earlier frozen fixture was the WRONG RANGE — `--pin n..m` takes
  file-wide REQUEST ORDINALS (harvest.mjs:612-648) while
  bust-triage's "n=591->595" is a MESSAGE COUNT; the busting pair is
  ordinals 892..894, re-pinned as
  test/fixtures/harvested/pinned-s-9f12950909ed-892-894.json (46 MB,
  untracked and locally excluded; needs the fixture-cut floor before
  it could be committed).
  CLASS COST, measured 2026-08-02 over the whole worktime ledger
  (58 bust events, 6 distinct days): `messages_changed` is the
  LARGEST single cause — 21 events, 5.99M tokens of context
  re-written, ~38% of the 15.7M total; next are `other` (23, 5.45M),
  `tools_changed` (3, 1.26M), `model_changed` (4, 1.25M), `idle`
  (4, 1.06M), `model` (3, 0.71M). Framing per the Mitigation policy:
  this is a PRIORITY datum and explicitly NOT a worthiness
  threshold — cost never gates whether the work happens (an earlier
  revision of the row-4 entry made exactly that error). Two
  caveats: `cc` is context size re-written, an approximation of the
  true re-bill (the transcript's cache_creation is exact), and
  `messages_changed` is a cause label that may cover classes beyond
  row-4.

- **PARKED — bust-triage pair selection: same-conversation join key
  (twin-busts tool-gap residual, 2026-08-02).** The timestamp join
  shipped in 092a7cf/d2c9d00 is a proximity heuristic; the exact fix
  joins on the insertion events' own `key` field (full sessionKey)
  against a per-candidate key computed from conversationSubKey
  (exported, proxy/extensions/message-hash.mjs) + systemPromptSubKey
  (NOT exported from insertion-normalization.mjs) + resolveSessionId.
  Named missing piece: the systemPromptSubKey export is a `proxy/**`
  change — deployment-coupled (pin bump + restart), so it rides the
  next proxy boundary, never alone. Evidence: sonnet dispatch report
  2026-08-02 — reset-only matching closed both live cases without
  it; trigger to build is the next selection miss the heuristic
  cannot break.

## From the closing-gate sweep (2026-07-29, opus dispatch) — parked with bases

- **Orphan telemetry consumers (Q4).** Alarm files written by ON gates
  that nothing reads: `guard-events.jsonl` (output-guard restores),
  `upstream-changes.jsonl` (row 5's alarm), insertion/deferred event
  logs, session mirrors; plus status-file fields (`gateSource`,
  `fidelityMutated*`) and boot-record `proxyTree`. Design ONE consumer
  pattern (likely: more shape-verdicts entries reading each file's
  recency + alarm count) rather than N bespoke checks. Deferral basis:
  consumer DESIGN per file is judgment work (which absence fails, which
  warns), not a mechanical port. Effort M.
- **Harvest pins instances, not only classes (Q2).** Fixtures bank one
  exemplar per CLASS; the evidence behind specific verdicts (row 4's
  distribution on s-captureD, acceptance strings citing s-captureL)
  still rots with rotation. Spec sketch: `harvest --pin <key> <n..m>`
  freezes a sanitized range as a named fixture; matrix rows and
  acceptance strings then cite fixtures, not capture keys. Effort M.
- **Row 6's isolating query is built and unread (Q3).** findToolsDeltas
  emits exactly the tools-only classification row 6 says "cannot be run
  as-is". With --census now on every sweep, read the answer off the
  next gate status and update row 6. Effort S, blocked on one timer run.
- DONE 2026-08-01 (4185fb4, dup-census dispatch, dispatcher-verified:
  selftest + 29/29; red-first structural AND mutation; the naive
  forward-only billing match was itself caught red by the order-true
  fixture) — Duplicate-request probe → census check (Q1). The counter
  found a real population on its first live run → the double-billed
  OPEN entry near the resolved duplicate-request item. Daily
  re-answering still needs the gate-live wiring (READY below).
- **upstream-error-log gate ON? (operator decision.)** CC#79989's named
  first-hypothesis alarm exists in-tree and is OFF. Needs the standard
  acceptance probe before flipping — a gate flip without one is the
  class the roster check exists for.
- **resolveCaptureKey pools literal "empty" (79 requests).** A capture
  keying change = state-KEY change (threat matrix row 3): belongs at a
  session boundary, stated before the restart. Not urgent — the pooled
  requests are keyless utility calls.

## Parked decisions

- **SETTLED 2026-08-16 — answer (a). Body kept for its evidence; the work is
  booked in `## Record` ("port upstream CACHE_FIX_PREFIXDIFF_CONTENT gate
  default-OFF, opt deployment in"), which carries the two-repo residue split.
  Not moved to `## Done`: the DECISION closed, the WORK has not shipped.**
  Original entry follows.
- **DECISION OWED (operator) 2026-08-16 — this fork persists prompt text to disk
  by default; upstream gates it off, and the merge did NOT take that.** Upstream
  gates every content path in prefix-diff on `CACHE_FIX_PREFIXDIFF_CONTENT=1`,
  off by default, "because the whole point of the default mode is that
  prompt-derived text never rests on disk". **This fork has no such gate** —
  `grep -c 'CONTENT_ENABLED\|PREFIXDIFF_CONTENT' proxy/extensions/prefix-diff.mjs`
  returns 0 — and always stores system-block text (to `SYSTEM_TEXT_CAP` = 20,000
  chars), message previews and event-record previews.
  **Why it is a real exposure and not a tidiness point:** the proxy fronts EVERY
  Claude Code session on this machine, so that text is other projects'
  conversations, and it sits in a directory holding 28,326 files.
  **Why it is not a free fix:** it trades directly against this fork's core
  mission. dev-loop's own rule is "the census names the class; only content
  names the cause", and byte-level attribution is what the content windows feed.
  **The three answers, so the decision is a choice and not an essay.**
  (a) Adopt upstream's gate default-OFF and set `CACHE_FIX_PREFIXDIFF_CONTENT=1`
  in the serving unit — code matches upstream exactly, the deployment opts in
  with a recorded reason, attribution keeps its inputs; costs a unit edit, a
  manifest gate classification and a `CACHE_FIX_GATE_ACCEPTANCE` entry
  (ship-runbook step 4b). RECOMMENDED.
  (b) Adopt it default-OFF and leave it off — maximum privacy, and the next bust
  walk loses the bytes it needs.
  (c) Keep the fork as-is — no divergence work, exposure unchanged.
  Named missing evidence: none. This is intent, not evidence — it is the
  operator's call and is surfaced rather than defaulted.
  The security bite now asserts the fork's ACTUAL contract
  (`test/proxy-prefix-diff-security.test.mjs`, "FORK CONTRACT — default mode DOES
  persist prompt text"), so it goes RED the day the gate is ported, which is
  exactly when this decision must be recorded.
  Consumer: the operator, then the session that implements the chosen answer.
  Loop stage: MITIGATE.
  Anchor: BACKLOG.md
  Write-set: proxy/extensions/prefix-diff.mjs, test/, dotfiles manifest + unit
  Verifier: grep -c CONTENT_ENABLED proxy/extensions/prefix-diff.mjs
  <!-- entry: "prefix-diff persists prompt text by default; upstream gates it, operator decision owed" -->

- **DECISION OWED (operator GO) 2026-08-16 — upstream's `docs/benchmarking.md`
  carried a real-looking session UUID, against upstream's own written rule.**
  Found by our leak scan going red on content the merge imported. Upstream's
  `docs/code-reviews/README.md` says plainly: "Do not paste real session UUIDs,
  request ids, or `s-<8hex>` capture prefixes into review artifacts", and
  mandates `00000000-0000-4000-8000-<12hex>` as the substitute. Their
  `docs/benchmarking.md` sample output nevertheless carried a v4-shaped
  `session_id` alongside real timestamps. Upstream has scrubbed this class once
  already (`e3149ae`, "scrub two real session UUIDs from PR #299 review
  artifacts"), which is why the two `00000000-…` values now in that tree are the
  SCRUBBED replacements — so this is a known class with a known remedy there.
  In our tree it is resolved: the value was replaced with a non-identifier
  placeholder (`"<session-id>"`), which needed no UUID literal and therefore
  passed the authoring guard that blocks writing one into a tracked file.
  **What is owed is the report to upstream, and it is a PUBLIC communication, so
  it waits for operator GO on the exact text.** Recommendation: report it — it
  is their own rule, the remedy is one line, and they have applied it before.
  Named missing evidence / trigger: operator GO.
  Consumer: the session that files it, via docs/runbooks/public-comms.md.
  Loop stage: RETIRE (upstream-facing).
  Anchor: BACKLOG.md
  Write-set: an upstream issue or PR — nothing in this repo
  Verifier: gh issue list --repo cnighswonger/claude-code-cache-fix --search benchmarking
  <!-- entry: "upstream benchmarking.md real session UUID, report owed on operator GO" -->

- **Repo location `~/dev/vendor/` — LEAVE for now** (operator + session
  2026-07-29). The fork is operator-owned (taxonomy says
  `~/dev/Gunther-Schulz/`), but a move touches the serving unit's
  ExecStart, HTTPS_PROXY env, manifest paths, repos.tsv, and ten live
  PR worktrees' gitdir pointers — coordinated migration for purely
  taxonomic gain. Revisit trigger: PR series merged and worktrees
  removed (the natural cheap moment).

- **Resume-boundary attribution — BUILT the day it was parked**
  (operator push; findSuccessions in tools/replay.mjs, census-gated,
  rides the daily sweep): compaction/resume/fork boundary classes with
  opener pricing; interleaves structurally suppressed (never-returns +
  first-appearance conditions — the one-shot-sidecar phantom was caught
  by the class's own bite). Validated pair-for-pair against the hand
  probe on s-captureE (9de68b3).

- **Census system-delta class — candidate, not built** (2026-07-29).
  Within-session inflation instruments: tools[] churn is classified
  (findToolsDeltas, counts + forwardedStable); SYSTEM deltas are only
  observed live (prefix-diff cause lines) and preserved in captures —
  censusPair classifies messages only, so an offline "how often / how
  expensive are mid-session system changes" question has no census
  answer today. Deliberately not built: no such question is currently
  unanswered (prefix-diff logs + matrix row 5 cover the known classes).
  Build trigger: the first system-delta question that needs an offline
  answer over a corpus — then a census kind beside toolsDeltas, same
  shape.

- **PARKED (design) — flap escape: cross-message join +
  reset-before-suppression precedence.** The earlier READY per-block
  item's premise was REFUTED by the build probe (fixture 090a110, full
  measurements in its commit message): per-block hashes exist since
  #76606, both matchable standalone legs already hash-match; the escape
  is classifyPinned's reset("edit-shaped") firing BEFORE suppression,
  triggered by the novel CROSS-MESSAGE join (msg89's reminder + "\n\n"
  + standalone msg90, landing in dropped msg90's gap). Named open
  decisions before any build: (1) may a cross-message join suppress at
  all — suppressing drops msg90's bytes from the wire (the extension
  never re-adds a message; same family as the suppression-stripped
  final-message 400s), the alternative direction is first-seen-form
  canonical re-serve rather than suppression; (2) may suppression
  precede the edit-shaped reset — a load-bearing safety discriminator
  with measured false-positive history. Unpark condition (corrected
  same day per the matrix mitigation policy — cost never gates
  mitigation): a settled answer to the two design questions, nothing
  else; the cost-trigger this entry briefly carried contradicted the
  recorded operator ruling (matrix header / row 6 ladder) and is
  withdrawn. MERGE NOTE 2026-07-31: main now carries the reset-path
  suppressions DECLARATION (5c4d70a) while branch wt/fidelity/opus
  carries its own sibling declaration fix ("builder deviation,
  REQUIRED and kept" in the flap-move directive's status) — the two
  edit the same classifyPinned region and must be reconciled at that
  branch's integration, not auto-merged. The detector supplies design specimens, not a
  worthiness threshold. UNPARKED 2026-07-30 (operator GO): both
  questions answered by mechanism in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md —
  fidelity gate first (its red case IS question 1's dangerous
  design), then candidacy-gated first-seen re-serve. STATUS: unit 1
  (conservation gate) SHIPPED 95ca0cb — question 1 answered
  mechanically, red on record; unit 2 BLOCKED on the
  reset-abandons-move regression (branch wt/fidelity/opus, directive
  Status section has the shape + candidate fix); next step is the
  reset-path design decision + five-gate re-sweep.
  RESOLVED 2026-07-31: units 2/2b integrated (reconciled with 5c4d70a
  per the MERGE NOTE above) and the last escape — the ordinal
  re-bind — closed by the reserved-entry identity build
  (a1170a7..9983a1b + the TODO-15 rewrite; directive
  reserved-entry-identity-directive.md, report
  docs/code-reviews/reserved-entry-identity-report.md).
  Corpus-verified zero insertion-normalization stability violations;
  deployment rides the restart boundary. Branch wt/fidelity/opus is
  consumed (cherry-picked, squashed) and deletable.

- **OPEN (design) — cold-events wiring + tenant grain (loop-trio
  G2/G3).** Nothing invokes cold-events yet (DEFAULT_LEDGER_PATH
  exported for whoever wires it), and the grain decision gates the
  wiring: capture outcome records are SESSION-grained (the Messages
  API has no agentId slot), and a real run over s-captureR MEASURED
  a false event (cause=model, prevCtx=1k — a haiku background call
  and the main conversation diffing against each other; exactly the
  co-tenant artifact prefix-diff's tenantId exists to remove).
  Options, undecided: (a) run over transcripts
  (conversation-grained — what both verifiers used, proven), (b)
  give capture rows a tenant via prefix-diff's tenantId hash, (c)
  accept session grain and filter. Until settled, capture-only
  proxy-side detection manufactures false events — do not wire that
  path. Evidence: loop-trio report 3a, eead8bc's test suite.

- **PARKED — CC-version tripwire (loop: premise staleness).** On
  first traffic from a new CC client version, one alarm suggesting a
  census sweep of day-one captures against known classes. MISSING
  EVIDENCE before any design (doc-vs-artifact rule): what
  CACHE_FIX_UPSTREAM_DETECTION already covers — read the extension
  first; if it already does this, the item dissolves into a doc
  pointer.

- **PARKED — tokenize LEDGER-Siren.json keys (g1 follow-up).**
  Accepted residual today (operator ruling, local deployment);
  becomes real work only if the ledger ever feeds a PR slice or a
  non-local consumer. Same sidToken scheme harvest now uses;
  consumer to name at build time: growth snapshots + doctor
  bookings read it.

- **PARKED — harvest --pin --replay-from K (fixture-cut c3).**
  runPin always writes replayFrom 0 + the full prefix, so
  regenerating the pinned fixture would restore the 432 kB dump.
  Ruling 2026-08-01: minimization STAYS a post-step gated by
  tools/fixture-verdict-identity.mjs — the floor is swept per
  fixture, not a harvest parameter. Trigger to build: a second
  fixture needing minimization at harvest time.

- **PARKED — bare s-<8hex> short forms in fork docs prose
  (ready-bundle residual c2: s-captureD, s-captureM, s-captureF in
  the threat matrix; BACKLOG prose carries many more).** Ruling
  2026-08-01, consistent with the 07-31 association-on-fork ruling:
  ACCEPTED residual on this fork — the short forms carry
  operator-local cross-referencing value and the token↔capture
  association is already public here; the exception (same file
  redacts the full UUID → tokenize the short forms too) was applied
  by the triage. Trigger to act: any such doc ported upstream —
  tokenize at the port, and the slice preflight's absence arm is
  the backstop.

- **PARKED — reserved-entry residuals, three named, all unmeasured
  (report gaps c3/c6 + not-verified list).** (1) heldCi retirement:
  a reserved entry with a permanently unresolvable neighbourhood is
  carried forward inert forever on the success path (the reset path
  retires it); bounded (~1-2 entries/conversation measured), costs
  one canonical entry. (2) dropped-majority precedence relative to
  move recognition: the disposition pass runs on that path too; no
  corpus instance exercises it (named unmeasured three reports
  running). (3) conversations with >1 reserved entry at a time: the
  pass handles a list and guards double-claims, but every measured
  instance has exactly one. Missing evidence, named: a corpus
  instance of any of the three. Trigger: first live sighting (a
  held entry, a dropped-majority reset with a live move, or a
  two-reserve conversation) — then measure before designing.


