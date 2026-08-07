# claude-code-cache-fix (fork) — open operational items

Proxy-domain parking. Deployment-side items (which gates run on which
machine, pins, acceptance records) live in the operator's dotfiles repo;
SYSTEM items — code, PRs, investigations, upstream threads — live here.
Fork-only file, excluded from PR slices like FORK-NOTES.md. One item per
bullet, evidence pointer included.

## Build order — DERIVED 2026-08-06 SECOND PASS (evening), re-derive before building

Not a stored priority: recomputed from the rubric in `docs/dev-loop.md`
("Build order is DERIVED at build time"). It ranks on evidence current as of
this date. **Re-derive rather than edit** — patching this list re-creates the
stored-priority problem one level up.

This pass SUPERSEDES the 15:19 derivation of the same day (`18a9dee`, annotated
at close in `6000c04`). Three inputs moved it, and each item below says what
moved: (i) the rubric gained an irreversibility partition (dev-loop, same
commit as this block) — without it the leak-gate items rank last and correctly
so, which is what the first pass found; (ii) two of the three triggers behind
the first pass's own item 1 shipped hours after it was written; (iii) the
close-out walk booked four
entries the first pass never saw, one of which is satisfiable only AT a
re-derivation, i.e. now.

**FILE ORDER IS THE CARRIER — this block is no longer the only one.** The
`## Open` section below is in this ranking's order, so the SessionStart hook's
injected head IS the ranked head; a starting session gets the order without
reading anything. Two obligations follow, both mechanical. The rank lives in
ONE place: each numbered item below carries its own anchor
(an `entry:` HTML comment), which is what `tools/backlog-order.mjs` reads — never
a second list. And a re-derivation is not finished until the tool has run:

    node tools/backlog-order.mjs --check   # exit 1 = file order has drifted
    node tools/backlog-order.mjs           # apply it

Adding an entry above the ranked head, or re-ranking without re-running the
tool, silently restores the old failure — `--check` is what catches it.

The day's cost, which is what most of this ranks against: **five busts,
1,200,000 tokens re-billed** — 984k across four row-4 instances (242k, 225k,
441k, 76k) and 216k from row 26, ours. Row 4 is the most expensive open class by
a factor of four; row 26 is the most expensive class we CAUSED.
(Corrected at session close: an earlier version of this block said four busts /
1,124,000, omitting the 76k at 11:07Z. `bust-triage --list` had surfaced it —
the inventory step worked — and it was then read past while the reported bust
was worked. The count came from what was ATTENDED to, not from the tool's own
output, which is the paraphrase-drift shape aimed at a number.)

1. **~~Make file order BE the derived order~~ — DONE in the commit carrying
   this block** (`tools/backlog-order.mjs`, entry marked DONE below; no anchor,
   because a finished item must not hold a rank). Verified at both ends rather
   than assumed: before, the hook's injected head was an 08-05 BUST entry and
   `--check` exited 1; after, the injected head is item 2 of this list and the
   next seven follow in rank order. The tool is idempotent and its `--check`
   mode is the standing guard against the order drifting back.
2. **Leak-scan scoping** (operator-side, dotfiles) — was 10. Moves on the
   irreversibility partition, not on new cost: 1 occurrence 08-05 plus 3 in
   one round on 08-06, and on the second of those three the bypass was taken
   BEFORE confirming the block was the known case. Signal 3 discounts a loud
   failure because "it announces itself and gets handled on its own" — measured,
   it announced itself four times and was handled four times by `--no-verify`.
   That is the loudness being converted into silence, on the one gate standing
   in front of unscrubbable public history.
   **DONE (dotfiles `6912e2b`).** Driven read-only against the real 2026-08-06
   case: the same four `capture-key-prefix` findings in upstream's own merge
   commit message are scoped out, the block passes, 0.098s added. Verified
   blocking by the dispatcher against the LIVE hook — a planted key in a commit
   message and a planted uuid in a file both still exit 1.
3. **~~Move the leak scan's feedback from PUSH to WRITE~~ — BUILT, NOT LIVE**
   (dotfiles `7b13af4`). Ranked here by COUPLING to (2) rather than by its own
   evidence, and that stands. What shipped: a PreToolUse gate importing the
   fork's own `absence-scan.mjs` classes, denying a capture identifier bound for
   a TRACKED path in a repo carrying the scanner, silent on untracked paths and
   on repos without it — all four cases verified by the dispatcher against the
   real repo and real tracked paths.
   **It is registered nowhere, by instruction, and that is the remaining step:
   an operator decision, not build work.** It changes what every session on this
   machine may write, so it is not a dispatcher's call.
4. **The doorbell's remaining half** — was 1. Two of its three triggers still
   have no watcher and both cost something today: a RED sweep sat unnoticed
   until someone ran `doctor` by hand at close (booked above as undispositioned
   sweep finding 1), and PR rounds are still network-dependent. What shipped
   the same day (dotfiles `69be84a`) covers behind-upstream and READY pressure
   — verified live in this session's attention line, `25 behind` on a fetch
   just now. Do not re-build those two. The remainder needs the scheduled sweep
   to write a local file the hook can read, so it is no longer the cheap item
   the first pass ranked first.
   <!-- entry: "THREE triggers have no watcher" -->
5. **The first-appearance-relocation exemption must assert forwarded `tools[]`
   held.** Unchanged and still a hard constraint, not a judgment: it must be
   demonstrated RED against the current build, and (6) removes the defect it
   would go red on. Build it before (6) or it ships having never caught
   anything.
   <!-- entry: "the stability exemption for a first-appearance relocation" -->
6. **Row 26 — the relocation-induced key rotation.** 216k in one measured event,
   ours, and it re-fires on every first relocation of a block type. Blocked by
   (5). Ships with a row-3 declaration and live pricing, not corpus pricing.
   <!-- entry: "kill the relocation-induced conversation-key rotation" -->
7. **~~`harvest --pin` verifies its own pin~~ — DONE (`c003759`).** Shipped
   with the finding it produced: the exit code does NOT discriminate on the
   designated known-positive (both sides exit 1 from pre-existing conservation
   rows), so the obvious check would have shipped green on the very case it was
   built for. The exemptions row is what fires.
8. **~~`bust-triage`'s two-value verdict collapse~~ — DONE (`70ffcb4` +
   `142e6b1`).** The entry's "7 of 25" was a hand sweep and was low: measured
   before the fix, **17 of 26** rows read as MITIGATED; after, **7 of 26**. Two
   causes the sweep could not see — a row whose lead token it did not check, and
   an `open` flag computed over the UNTRUNCATED cell while the status shown was
   truncated at 260 chars, so a verdict's stated basis was absent from the text
   printed under it.
9. **The session-close lane's computable half, named-and-unbooked check
   first** — previously unranked (the runbook shipped at 16:33, the check did
   not). Measured today: four findings named in prose and left there until the
   operator converted them, plus two more caught by the first hand run of the
   lane. Silent by construction — naming a gap feels like delivering it — and
   its red-first arrangement exists in today's own transcript.
   <!-- entry: "`docs/runbooks/session-close.md` SHIPPED 2026-08-06" -->
10. **Row-scoped evidence pinning at FINDING time.** The permanent answer to
    capture expiry; 11 attribution rows died with three evictions on 08-05
    while the retention knob only moved the loss later. Silent, and it corrupts
    the same evidence base as (7).
   <!-- entry: "evidence leaves the rolling window at FINDING time" -->
11. **`tools/lane-sweep.mjs`.** Finds the next generation of these gaps
    mechanically instead of waiting for someone to ask. Still ranked below (7)
    and (8) because both corrupt evidence it would consume.
   <!-- entry: "`tools/lane-sweep.mjs`: make the lane enumeration repeatable" -->
12. **`/health` reports the resolved extension set.** The DECLARED/RUNNING/VERIFIED
    comparison currently answers about a subset while reading as if it covered
    the pipeline. Silent, medium cost.
   <!-- entry: "`/health`'s `gates` is a pure `CACHE_FIX_*` env filter" -->
13. **Bisection extended to conservation rows.** Mechanizes a hand step run three
    times in one sitting; the machinery exists and is pointed at one list.
   <!-- entry: "extend `replay.mjs`'s extension bisection to CONSERVATION rows" -->
14. **~~`fixture-verdict-identity` mutation-tests only `FIXTURES[0]`~~ — DONE
    (`4168add`).** Ranked as narrow with a blast radius "bounded by the corpus
    size", and that was the wrong axis: widening it exposed that the population
    comes from the fixtures DIRECTORY rather than from git, so the suite covers
    a different corpus on every machine. The successor entry is in `## Open`;
    the lesson for ranking is that a bound stated in terms of corpus SIZE said
    nothing about corpus IDENTITY.

**RE-GRADED by this pass, not ranked:** the READY-expiry entry ("READY has no
expiry, so nothing ever forces the build-or-drop decision"). Its MECHANISM half
shipped 15 minutes after it was booked — `session-scan.py:170-189` emits the
count and the oldest age on the same carrier the entry specifies. Two residuals,
both real: the entry's verifier expects "25 READY, oldest 07-30 or earlier"
while the live line reads `28 READY, oldest 1d`, because the shipped
implementation dates entries by `git blame` and deliberately reverted a
first-appearance implementation (`session-scan.py:142-151` names the residual) —
so the booked verifier and the shipped mechanism disagree about what "oldest"
means, and neither number can be cited until that is settled; and the re-grade
RULE (three sessions unbuilt → re-affirm with evidence or drop with a reason)
is prose with no trigger yet.

**NOT ranked, and this is a finding rather than an omission:** row 4's own
absorption. It is the most expensive open class measured today by a wide margin,
and it does not appear above because no entry for it is decision-complete — the
cross-message join variant has no design that survives the byte-match census, so
there is nothing to rank. The rubric's own rule applies: an item nobody can rank
is a finding about the item. Row 4's next move is design work, not build work.

**Outside this ranking, deliberately:** upstream PR work. Today's three rebases
went out (12:46–12:58Z on #273/#276/#278) and #273 reads APPROVED, so the ball
is with upstream; `main` is 25 behind as of a fetch during this pass. The #278
entry below predates those pushes and should be re-read against the PR before
being treated as open work.

Roughly twenty older entries below still carry no rank. They were not assessed
in either pass and should not be read as ranked-last; deriving an order for them
needs them read, which neither pass did.

## Handoff — 2026-08-07 early. Read this before the build order below.

**State: everything on disk and pushed, three repos.** Fork `main` clean, 0
outgoing, suite green at the tip. dotfiles clean (`qgis/QGIS3.ini` is QGIS
writing its own config, not ours). claude-worktime clean. The previous
handoff's warning about 9 unclaimed dotfiles commits is DISCHARGED — they were
already on the remote before tonight; the one commit pushed from here
(`302fe01`) was verified sole and ours by `git log 141b391..302fe01` before
pushing.

**What to build next: everything under `## Open` that is graded READY.** Ten of
them, and they are decision-complete by construction — design decided,
verifier named. Re-derive the build ORDER (this file's rubric says derived at
build time, never stored); what follows is only what a derivation cannot
recover on its own.

**The route, because the write-sets are a fact and not a judgement.** Two
disjoint groups, so the default is two PARALLEL dispatches rather than a queue:

  group A — `tools/replay.mjs`, `tools/backlog-lint.mjs`, `docs/dev-loop.md`
  group B — `tools/bust-triage.mjs`, `docs/runbooks/bust-appears.md`,
            `docs/directives/robustness-threat-matrix.md`

  `BACKLOG.md` belongs to NEITHER — it is the dispatcher's integration point,
  and two agents booking departures into one file is the overlap that forces
  serialization for no gain.

**Two hard orderings, both stated inside their own entries — this is a pointer,
not the source.** The verdict-enum entry must precede the idle/TTL guard (row
27's cell flips, so a test written first pins the workaround). The conservation
exemption is the one item where something is currently BROKEN rather than
blind: `~/.claude/cache-fix-gate-status.json` has been red since 2026-08-06
07:35Z. Read it before anything else.

**Three entries are NOT dispatchable and are flagged as such**, found by
hand-running session-close step 8: an unsettled operator decision sits inside
a READY body in three places (write-registration ~line 78, upstream order-690
~line 1108, upstream-error-log gate ~line 6195). Each either moves into
`## Parked decisions` or gets settled. Put them to the operator; do not answer
them. The lane that will find these mechanically is itself booked.

**Work booked in OTHER repos, with pointers here** (the carrier rule: body
where the work happens, pointer where the finder sits): two claude-worktime
items (`0f03e4b`) and the leak-gate reach in dotfiles (`302fe01`).

**The standing question this session added, and it now binds every close:** the
backlog closes DISPATCHABLE — every open entry executable by someone who is not
you, in the repo where the work happens, without asking a question
(`docs/runbooks/session-close.md` step 8). Park on missing EVIDENCE, never on a
missing DECISION.

## Open` because
`tools/backlog-order.mjs` reorders bullets INSIDE `## Open` and would
otherwise push a handoff below the ranked head. That is a real tension
between two things built the same day — the ranked-file carrier and the
handoff convention — and it is resolved here by placement, not by design.
If a future re-derivation wants handoffs ranked, that is a decision, not
a bug fix.

**Today's own close-out found one thing, and it was found by the lane
rather than by anyone looking:** a 308k `previous_message_not_found`
event at 16:35:15Z that `bust-triage` called UNCLASSIFIED, for a class
the threat matrix had already walked on 2026-07-31. Dispositioned
CONTROLLED-CAUSE, evidence pinned and verified, and the gap it exposed is
the first entry below.

## Open

- **POINTER — the push-side leak scan reaches ONE repo; body and design live in
  `~/dev/Gunther-Schulz/dotfiles/BACKLOG.md` (booked 2026-08-06).** The
  machine-wide `git/hooks/pre-push` dispatcher activates on one substring
  (`MARKER = "claude-code-cache-fix"`, `is_active = any(MARKER in u)`), so
  every other repo gets a silent exit 0 — including `claude-worktime`, which
  is PUBLIC, handles session ids and capture keys by its nature, and as of
  2026-08-06 carries this repo's operator-side bust items. One
  `capture-key-prefix` finding already sits in its published history,
  unremediable.
  **Why a pointer HERE when the code is there** (operator, 2026-08-06): the
  two repos are operationally linked, and the session likely to do this work
  is a cache-fix bust session — the scanner it would extend is
  `tools/absence-scan.mjs` in this tree, and the hazard is discovered here.
  The carrier rule wants the body where the work happens and a pointer on the
  reader's path; this is the pointer. It is deliberately NOT a copy — the
  design (including the `MARKER`-has-two-jobs trap) is stated once, there.
  Do not execute from this entry; open that one.
  Same shape, mirrored, as the two claude-worktime pointers above: body in the
  executing repo, pointer where the finder sits.

- **READY (small; same file as the backlog-lint WARN item, dispatch them
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

- **READY — `rebilledBytes` prices the re-bill from the DIVERGENCE, the wire
  prices it from the last surviving BREAKPOINT, and the fire ledger's one
  meaningful ratio is built on the first.** Derived by hand during the
  2026-08-06 18:08:32Z walk and not booked at the time — caught by the
  session-close named-and-unbooked sweep, which is exactly the class that
  step existed for.
  `findMitigationGaps` computes `rebilled` as the sum of `inBytes` from the
  divergence index onward (`replay.mjs`, the `cur.inBytes.slice(from)` line),
  and `savedBytes` is its complement. `gate-live`'s `summariseFireBytes` reads
  both as the relocations class's leaked/saved columns, and its own comment
  calls `saved/(saved+leaked)` "the one ratio on this line that means
  something".
  **The model is breakpoint-blind.** The API reuses up to a WRITTEN
  cache_control breakpoint, not up to an arbitrary index, so a divergence at
  index N re-bills from the last breakpoint at or before N — and when no
  breakpoint sits between the array start and N, that is the whole array.
  Measured on the 18:08:32Z pair (s-captureAM, n=265->266): the census row
  reports `rebilledBytes` 114,653 while the transcript recorded `cc` 300,597
  against `ctx` 315,821 with `cacheRead` **15,222** — the surviving hit is
  tools+system alone. Threat-matrix row 4 already states this economics in
  prose ("all of which sit at the tail"); what is new is that a FIELD feeding
  a ledger does not model it.
  **Units, stated because this repo has been bitten by exactly this:** 114,653
  is `JSON.stringify(...).length` — UTF-16 code units under a name that says
  bytes — and 300,597 is tokens. They are not two measurements of one
  quantity and the entry does not divide them. The claim is about the MODEL,
  not a ratio between those two numbers.
  **What is NOT established, and it decides the size of the fix:** whether the
  ratio survives. Both columns share the model, so a uniform understatement
  would cancel — but the error depends on per-pair breakpoint placement, so
  uniformity is an assumption, not a finding. Nothing here has measured it.
  Design: price from the last cache_control breakpoint at or before the
  divergence, which `compactEntry` can retain as a per-message breakpoint
  index at no content cost (`outHashNoCC`/`stripCacheControlDeep` already walk
  the field). Keep the current number under its own name rather than
  redefining a field other rows carry.
  Verifier, red-first: on this pair the new number must price essentially the
  whole array while the old one prices the suffix, and a TAIL edit — where a
  breakpoint does sit at the divergence — must leave both numbers equal, since
  that is the case the current model gets right and a fix that moves it is
  overshooting.

- **READY — `bust-triage` picks the busting request by TIME ALONE, so a haiku
  sidecar was named as the cause of a 336k opus event — and the tool then
  reported the evidence missing while it sat on disk.** Measured 2026-08-07
  01:00:55Z (matrix event walk of that date). The rule is "the newest request
  at or before the ledger stamp", and the ledger stamp is when the RESPONSE
  was booked, not when the request was sent. A `claude-haiku-4-5` sidecar at
  01:00:54.702Z (1 message, 2,368 bytes, no tools) beat the real request at
  01:00:27.553Z (opus-5, 4 messages, 977 kB) by 27 seconds. The sidecar has no
  predecessor in its own conversation, so the walk cascaded to
  `no capture pair (capture off, or rotated)` / `no diagnostic found (older CC,
  or transcript rotated)` and UNVERIFIABLE — with the capture present at 6.6 MB
  and the transcript at 55 lines. **Both disjunctions false.** This is the
  co-tenant interleaving trap `replay.mjs` documents at its grouping comment,
  inside the tool built to end the hand walk; it is also a second live
  instance for the booked false-disjunction entry, which should be fixed in
  the same pass.
  Design: select among requests whose response could plausibly be the booked
  event, not by raw recency — filter to the conversation that CARRIES the
  bust. Two signals are already on the records: the ledger's `ctx` against the
  candidate's own token size (a 2 kB sidecar cannot produce a 375k-token
  event), and the model (a bust booked for an opus response did not come from
  a haiku request). Prefer the size test as primary; it needs no model list to
  go stale.
  Verifier, red-first and both sides: this stamp must select the 01:00:27.553Z
  opus request and reach a real verdict, and the 2026-08-06 18:08:32Z stamp
  (no interleaved sidecar) must select exactly what it selects today — a
  selection change on the uncontaminated case is a regression, not a fix.
  While there: when no candidate survives, the WARN must say which reason
  actually applies rather than printing a disjunction of two it did not test.

- **READY (operator-side, claude-worktime — POINTER; body belongs in that
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
  **Not written into claude-worktime's backlog by this session** because the
  fix interacts with the two entries already moved there (the idle-cause
  hit-booking route and the contradictory-class dedupe) and all three want
  designing together. That is a NAMED next step, not a deferral: whoever picks
  up those two adds this as the third, or books it there first.

- **READY — `bust-triage` has no idle/TTL guard, so a 216k eviction answered
  KNOWN-OPEN row 4.** Measured 2026-08-06 23:59:10Z (s-captureAL, matrix row 27,
  minted by that walk): `gap` 22,702 s against `"ttl":"1h"` on the session's own
  wire, transcript `previous_message_not_found`, and a surviving read of 2 tokens
  (`ctx` 215,875 - `cc` 215,873) — the cached entry
  expired five hours before the request existed, and the pair's real container
  migration at host 104 is a true statement that is not the cause. `classToRow`
  saw census `replace/edit`, returned 4, and the verdict inflated row 4's
  evidence with an instance row 4 did not produce.
  **The discriminators are computable from the ledger record `bust-triage`
  already reads** and none is consulted — this is a mechanization, not a
  research task.
  **CORRECTED 2026-08-07, before this shipped:** the design below first named
  `mtok === 0` as one of two discriminators. `mtok` is the missed portion as
  read from the transcript diagnostic and DEFAULTS TO 0 when that diagnostic
  was never read — the same degraded default `cause: other` carries. The
  2026-08-06 17:39-17:40 event is booked three times with `mtok` 0, 0 and
  182,728: one event, three values. A check keyed on it would have fired on
  every unresolved row. Use the surviving read instead — `ctx` - `cc`, both
  present on the record, no default to be fooled by.
  Design: before any `classToRow` call, test `gap` against the TTL in force and
  a surviving read (`ctx` - `cc`) at or near zero; on a hit, return row 27 and
  stop. The TTL is read from the
  capture's own wire, never assumed — a hardcoded 3600 is the remembered-number
  error the dev-loop names.
  Verifier, red-first: this stamp must return row 27, and the 2026-08-06
  18:08:32Z stamp (surviving read 15,224 of `ctx` 315,821, sub-minute gap)
  must still return row 4 — a guard that reclassifies both is worse than none.
  Third side, added by the 2026-08-07 01:00:55Z walk: the 336k event there had
  a surviving read of 39,713 that exactly equalled its predecessor's write, and
  must classify as GROWTH rather than as either row — a guard that folds it in
  with the idle case has learned "large `cc`" instead of "prefix lost".
  **ORDERING — do the verdict-enum entry FIRST.** Row 27's status cell leads
  with `ACCEPT` today purely to stay readable, so this guard's row-27 hit
  currently prints verdict KNOWN-OPEN. After the enum entry lands it prints
  CONTROLLED-CAUSE. Assert the POST-enum value: written against today's value
  the test pins the workaround and goes red the moment the enum ships, which
  is the same-parentage error one step over.

- **READY — the verdict enum has no value for CONTROLLED-CAUSE, so a row whose
  honest status is a controlled cause must be written as `ACCEPT` to stay
  readable.** Found 2026-08-06 minting row 27: `statusKind` returned null for
  "CONTROLLED-CAUSE …", which makes the row STATUS-UNREADABLE — a documented
  stop-here — on a row that needs no stopping. Worked around by leading the
  cell with `ACCEPT` (row 21's precedent for "no local mitigation possible"),
  with the reason written into the cell so the next author does not re-derive
  it. `VERDICT_BY_KIND`'s own comment declines to widen the vocabulary
  unilaterally because it has consumers outside that file — which is exactly
  why this is an entry and not a patch.
  **DECIDED (operator, 2026-08-06): add the fifth verdict value.** The
  alternative — keep four and make the ACCEPT-with-explanation form the written
  convention — was put beside it and declined, because
  `runbooks/bust-appears.md` already lists CONTROLLED-CAUSE as one of four
  terminal dispositions, so the enum is the short thing, and the workaround
  makes a controlled cause read as an open one on every future walk.
  The comment's stated worry ("consumers outside this file") was MEASURED
  before deciding rather than trusted: `grep -rn 'VERDICT_BY_KIND\|statusKind'`
  over this repo and dotfiles returns `tools/bust-triage.mjs` (definition,
  `statusVerdict`, `triage()`, the printer's STATUS-UNREADABLE case, and the
  header comment at lines 37-39), `test/bust-triage-status-enum.test.mjs`, and
  the verdict list in `runbooks/bust-appears.md` step 2. `tools/dossier.mjs`
  imports from bust-triage but its only `verdict` reference is
  `s.migration.verdict` — the byte-match census's EXACT/EXTENDED vocabulary, a
  different axis. Nothing in dotfiles calls bust-triage; no `--json` consumer
  exists outside this repo. Reach: one code file, one test, one runbook line.
  Design: `STATUS_RULES` gains `[/^CONTROLLED(?:-CAUSE)?\b/, "CONTROLLED"]`,
  `VERDICT_BY_KIND.CONTROLLED = "CONTROLLED-CAUSE"`, and the runbook's verdict
  list gains it. Name collision to carry in the comment, NOT to resolve by
  renaming: `bust-triage` already has `CONTROLLED = new Set(["cost","resume"])`
  which classifies LEDGER EVENTS by their `k`. A row STATUS of CONTROLLED-CAUSE
  is a different axis — the CLASS has no mitigation — and row 27 fires on an
  event the ledger classified `bust`. Two axes, one word; the comment says so
  where both are read.
  **HARD ORDERING CONSTRAINT, and it is why this cannot be split:** matrix row
  27's status cell currently leads with `ACCEPT` solely to stay readable. The
  cell flips to `CONTROLLED-CAUSE` in the SAME commit as the enum change —
  flipped earlier the row reads STATUS-UNREADABLE, flipped later the enum ships
  with no row exercising it.
  Verifier, red-first and three-sided: `matrixRow(27)` must return kind
  CONTROLLED and verdict CONTROLLED-CAUSE after; the existing enum test's
  assertions for all nine current kinds must still pass unchanged (a widening
  that perturbs an existing mapping is a different change); and a junk status
  must still return STATUS-UNREADABLE, since the mandatory-unmatched-case
  property is the thing the whole enum was rebuilt for on 2026-08-06.

- **MOVED 2026-08-06 to `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md` —
  `previous_message_not_found` booked a hit, against the 2026-07-31 fix's own
  contract.** Not dropped and not done: the work is in claude-worktime and a
  session there reads that file, not this one. Body lives there; it is not
  restated here, because a copy drifts from its original and a survey built
  from copies inherits the drift. Evidence for it stays here where it was
  measured — matrix row 27's datapoint, 2026-08-06 23:59:10Z.
  First instance of this repo's "the backlog closes dispatchable" rule
  (`runbooks/session-close.md` step 8) catching a wrong carrier: that file
  read "Ready: (empty)" while two of its items sat in this one.

- **READY (small) — the reconcile check fires when the two instruments AGREE.**
  `bust-triage` warned "LEDGER says idle, TRANSCRIPT says
  previous_message_not_found — instrument disagreement" on 2026-08-06 23:59:10Z.
  They name one eviction: `idle` is the ledger's gap-derived cause, the other is
  the API's diagnostic. The check compares two fields from different vocabularies
  as though they were one. Design: an equivalence table for the pairs that mean
  the same event (`idle`/`previous_message_not_found` is the first entry), and
  the warning fires only outside it. Verifier: red on this stamp today, and it
  must STILL fire on the genuine disagreement the check was built for — the
  raced `other` read that never upgraded (matrix row 4's 2026-08-05 datapoint
  names an instance), which is the known positive it must not lose.

- **CORROBORATION 2026-08-06 for the conservation-exemption entry below — a
  SECOND capture, same shape.** That entry closes "Not claimed here — different
  capture, and a candidate is not a match." Gating s-captureAL under the serving
  config exits 123 with `n=91 lost: in[96] (system): 1 of 1 unit` +
  `invented: out[96] (system)` — the identical lost+invented system-unit pair on
  a capture whose resume was walked independently (matrix row 24, 17:40:16Z).
  Two captures, one shape, both containing a resume. Still NOT the byte-level
  proof: that remains the `normalizeSessionStartText` comparison the entry
  names. What this changes is the odds, not the evidence class.

- **READY (small) — `backlog-lint` calls its own header findings advisory and
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

- **READY — every OTHER row family in `replay.mjs` still carries only report
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
  that capture and is unverified. And the precedent already existed and did
  not travel: the `report` family has carried `captureId` all along.
  Design: `compactEntry` already retains `id` as of this commit; add
  `id`/`prevId` to each row family at construction, one line each.
  Verifier, and it must be the generic one rather than a second copy of the
  excerpt test: a test that asserts EVERY row family emitted by a `--json` run
  over a fixture with interleaved outcome records carries a non-null `id` for
  each ordinal it carries — red today on six of the seven families.

- **READY — `findAbsorptionMisses` runs on every replay and prints on none.**
  `docs/dev-loop.md` says it "now asks it on every run — not behind
  `--census`, because the whole point is that nobody knew to look". True of the
  COMPUTATION (`replay.mjs:3082`); the rows reach a human only via `--json`
  (`replay.mjs:3195`) or `gate-live`'s status file. The text report — the
  route `docs/runbooks/bust-appears.md` step 4 tells a human to run during a
  bust walk — has no absorption section at all, not even a zero line. Measured
  2026-08-06 on s-captureAM: 1 miss existed and the text run never mentioned
  it; it surfaced only because `relocDepartures` happened to name the same
  pair by a different check. One-route guard shape, and the doc claims a reach
  the code does not have.
  Design: print the section unconditionally with its count (zero included, per
  the three-answer rule), each row carrying the three numbers the check exists
  for — absorbed-at, forwarded divergence, `ours`. Verifier: a fixture with a
  known miss must show the row in plain `--census` output, and a fixture with
  none must print an explicit `0`.
  While there: the dev-loop sentence gets corrected in the same commit — it is
  the sentence that made the gap invisible.

- **READY — `bust-triage` maps `replace/edit` -> row 4 flatly
  (`bust-triage.mjs:501`), so the census annotations that distinguish this
  row's sub-mechanisms never reach the operator at the runbook's designated
  entry point.** Measured 2026-08-06: the 301k s-captureAM bust is a 20-leg
  FLAP at one index with `anchorDelta` -45/-48 — i.e. the census's own
  far-from-anchor tripwire fires and says "NOT the known reminder-anchoring
  class" — and `bust-triage`'s verdict block shows `census replace/edit` and
  nothing else. `anchorDelta` exists nowhere outside `replay.mjs`: zero hits in
  `bust-triage.mjs` and zero in the threat matrix. A walker who runs only the
  triage (which is what step 2 of `runbooks/bust-appears.md` prescribes) cannot
  tell an anchored ±2 re-stamp from a deep oscillation, and the two have
  different mitigation stories inside one row.
  Design: `bust-triage` already imports `censusPair` from `replay.mjs`; have it
  also report the pair's `anchorDelta` and any `blockMigration`/FLAP rows on
  the same pair, and print the far-from-anchor callout verbatim when it fires.
  Verifier: run against this capture's stamp — the row must name FLAP and the
  anchor distance; run against a ±2 anchored instance and it must not.

- **READY — THREE triggers have no watcher, and the third is the worst: a RED
  daily sweep has no doorbell either.** Found 2026-08-06 while enumerating the
  lanes: `session-scan.py` surfaces BACKLOG only, and NO SessionStart hook reads
  `~/.claude/cache-fix-gate-status.json`. The dotfiles doctor reads it, but
  doctor is a command someone runs, not something that greets them. So
  `docs/runbooks/sweep-finding.md` — written that same morning — has a trigger
  of "you happened to look." The runbook was authored, reviewed and committed
  without anyone noticing its entry condition did not exist, which is the
  clearest possible case for the standing instrument question (dev-loop, rule
  three): the gap was in the thing being built, not in something old.
  All three conditions are computable, share one carrier, and ship together:
  gate red (`.ok == false` or `.failing > 0` in the status file, plus its
  `finished` age so a stale sweep reads as stale rather than clean), commits
  behind (`git log main..upstream/main --oneline | wc -l`), and review rounds
  waiting (`gh pr list --author @me` with activity newer than our last push).
  Silent at zero, all three.
  Measured 2026-08-06, by looking rather than by anything reporting: fork `main`
  is **24 commits behind `upstream/main`**, and **three open PRs (#273, #276,
  #278) carry a reviewer comment from that same day**, all three `CONFLICTING`,
  all three at `REVIEW_REQUIRED`, all three asking for the same rebase. The
  runbook for answering a round exists and is good; nothing tells anyone a
  round is waiting. A well-written line with no doorbell.
  Both conditions are computable with near-zero false fires, which is the test
  a mechanism has to pass here — no judgment, no semantics, two counts:
  `git log main..upstream/main --oneline | wc -l`, and `gh pr list --author @me
  --json number,reviewDecision,updatedAt` filtered to rounds newer than our last
  push on that branch. Design, decided: both land as counts on the SessionStart
  line beside the backlog count that already appears there — same carrier,
  because that line is demonstrably on the read path and a new one would not
  be. Silent at zero; a count only when there is something. Verifier: with the
  state as of 2026-08-06 it must print both (24 behind, 3 rounds waiting);
  against a synthetic in-sync state it must print nothing. Done-criterion:
  both, plus the zero case proven silent — a trigger that always prints is a
  trigger nobody reads.
  NOT covered here, because it is not computable and should not be faked: WHEN
  a fork mitigation becomes an upstream slice. FORK-NOTES says "when ready",
  which is an unstated trigger and therefore drift. That one is an operator
  decision and stays prose — but it stays prose ON PURPOSE and says so, rather
  than by omission.

- **READY — the stability exemption for a first-appearance relocation must
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

- **READY — kill the relocation-induced conversation-key rotation (threat
  matrix row 26): resolve the conversation sub-key ONCE from the RAW body and
  have both stateful extensions read it.** Mechanism fully isolated 2026-08-06,
  216,060 tokens on one request; the row carries the four measured links and the
  falsification probe with its control, so nothing here needs re-deriving.
  Design, decided: `conversationSubKey` is a property of CC's conversation, so
  it is computed early (before order 250 mutates `messages[0]`) into `ctx.meta`
  and both `insertion-normalization` (395) and `deferred-tool-rewrite` (425)
  read it from there instead of each re-deriving it from whatever body reaches
  them — the repo's own "never hand-roll identity" rule, applied to the case
  where the second derivation is over OUR bytes. `fresh-session-sort` (250)
  already keys on the raw body and needs no change; that asymmetry is the bug's
  signature and its state files are the proof (its memory sits under the raw
  key while the downstream two sit under the rotated one).
  Verifier, named: a SYNTHETIC fixture — mandatory, not preferred, because the
  scrub destroys all four relocatable-block predicates (dev-loop, "The scrub
  destroys CONTENT PREDICATES"), so no harvested pin can ever carry this class.
  Red-first arrangement, stated so it cannot pass vacuously: the fixture's two
  requests differ only by the first appearance of a skills block; against the
  CURRENT implementation the assertion "the sub-key deferred-tool-rewrite keys
  on is identical across the pair" must FAIL, and the failure must name the two
  keys. Done-criterion: that assertion green, `deferred-tool-rewrite` reporting
  `rewrite`/`unchanged` rather than `no-baseline` on the second request, and
  the forwarded `tools[]` byte-identical across the pair.
  **Row-3 declaration, required before the restart, not after:** this CHANGES
  STATE KEYS for two extensions — the restart is NOT cache-transparent and
  every live conversation re-baselines. Price it with
  `tools/restart-exposure.mjs --match` against live sessions before shipping,
  per dev-loop's "price it against LIVE sessions, not the corpus".
  **FIXTURE SPEC CORRECTED 2026-08-06 evening (dispatcher), and the correction is
  load-bearing for the entry ranked before this one.** The two-request shape
  above — "differ only by the first appearance of a skills block" — is sufficient
  for THIS entry's assertion (the sub-key must not rotate) and INSUFFICIENT for
  the tools-condition check that must ship first: it reproduces the rotation
  only, and 12 surviving pairs measured the same evening prove rotation alone
  leaves the forwarded `tools[]` intact. Build the fixture at three-or-more
  requests — leading traffic that makes `deferred-tool-rewrite` freeze a tools
  order under the pre-rotation key differing from CC's passthrough array, then
  the relocating request — and ONE fixture serves both verifiers. Building the
  two-request version first would satisfy this entry and silently hand the other
  a check that passes while asserting nothing.

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

- **READY — evidence leaves the rolling window at FINDING time: the
  sweep pins the request bytes behind each finding row (tools/-only,
  not deployment-coupled).** This is the permanent answer to the
  expiry finding above, and the reason no ceiling is the answer:
  eviction is continuous by construction, so the fix is not to keep
  captures longer but to stop needing them. Two halves, and the
  second is this item — the first is the row-persistence item below.
  Grounding, measured today: a row-scoped pin is KILOBYTES. The
  builtByUs probe needed exactly `forwarded[i]` for two requests plus
  the raw `messages` array to test byte-presence; the whole evidence
  for the 349k bust's row is a few KB against a 316 MB capture. The
  46 MB fixture problem that blocks `harvest --pin` does NOT apply
  here, because that tool pins a whole prefix from request 0 while
  this pins one pair at one index — so this item is NOT blocked on
  the content-addressed fixture format, and that is the thing to
  check first if it looks blocked.
  Design: when a gate records a finding row, write a companion
  artifact keyed by the row (capture-key hash + n + index) carrying
  the two forwarded messages at the divergence index, the raw
  counterpart, and the array lengths. Scrubbed by the existing
  harvest scrub, absence-scanned like everything else, and small
  enough to commit — which is the whole point: the finding becomes
  answerable from git after the capture is gone.
  Verifier, red-first: delete (or point away from) the capture and
  require the row's attribution question — "did we build these bytes"
  — to still be answerable from the pinned artifact alone; red today,
  since the answer currently requires the capture. Plus a control
  that a pin whose bytes do not match the row it claims is rejected
  rather than trusted.
  WHY THIS IS THE PERMANENT ONE, stated so it is not re-litigated:
  the window's job becomes DISCOVERY, and archival moves to git where
  it is diffable, scrubbed and free. The ceiling then only has to
  outlive the gap between two sweeps, which is hours, not weeks.
  **NEW COST, measured 2026-08-06 evening, and it is a different KIND
  from the earlier ones: eviction took out a READY item's named
  verifier, not just an explanation.** Row 26's pair `n=166->167` was
  measured at 09:59Z; by ~19:25Z the capture holding it was gone from
  `~/.claude/cache-fix-captures/` (checked by filename, no match), so
  the ranked-5th item on the forwarded-`tools[]` condition for that
  exemption — booked the same day, and stating "red-first against the
  live pair: the current build must exempt `n=166->167`" — had its
  designated known-positive dissolve inside ten hours. The pin taken for
  that row cannot stand in: the scrub destroys all four relocatable-block
  predicates, which the row itself records. Every earlier datapoint for
  this item was about losing an EXPLANATION after the fact; this one is
  about a check that cannot be built red-first at all, which is the
  point where the loss stops being retrospective and starts blocking
  work. What survives is what the sweep already wrote down: 12
  `first-appearance-relocation` exemption rows across 5 still-present
  captures in the 07:55Z status file — i.e. the status file's own
  row-level record is currently the ONLY thing standing between this
  class and unbuildability, which is exactly the artifact this item
  proposes to make durable.

- **READY — `tools/lane-sweep.mjs`: make the lane enumeration repeatable, because
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

- **READY — `/health`'s `gates` is a pure `CACHE_FIX_*` env filter, so any
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

- **READY — extend `replay.mjs`'s extension bisection to CONSERVATION rows;
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

- **READY (small, and it sharpens the rate question) — why did twelve
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

- **READY — the PR-ROUNDS trigger, split out of the entry above with its WRITER
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

- **READY — `bust-triage` cannot reach threat-matrix row 24 by ANY of its three
  routes, so the whole resume / born-large class triages as UNVERIFIABLE or
  UNCLASSIFIED forever.** Measured 2026-08-06 on capture s-captureAL (the
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

- **READY — `identity-normalization` rewrites ONE of the two containers CC emits
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

- **READY — the conservation gate has no declared-exemption clause for
  `identity-normalization`, so EVERY capture containing a resume fails the gate
  on declared behaviour.** Found 2026-08-06 while walking s-captureAL: clauses
  exist for `smoosh-split`, `fresh-session-sort` and `content-strip`
  (`replay.mjs:2426-2455`) and not for this one, so its documented
  resume→startup substitution reports as `lost` + `invented` on the system unit
  every time. That is the fires-on-a-non-defect class on a BLOCKING gate, and it
  trains its reader to discount conservation red.
  **CONCRETE NEXT STEP FOR UNDISPOSITIONED SWEEP FINDING 1, which this makes
  cheap:** that finding's single failing row reads `in[937] (system): 1 of 1
  unit lost` + `invented` — the same shape one index-space over. Its own entry
  named the method and left it unwalked; the method is now demonstrated. Run
  `normalizeSessionStartText` over that capture's raw `n=1400 msg[937]` and
  compare to the forwarded bytes. If they match, the standing gate red is this
  same declared behaviour and the sweep finding closes as non-defect with the
  exemption as its fix. **Not claimed here — different capture, and a candidate
  is not a match.**
  Verifier for the exemption itself: it must be telemetry-backed and narrow
  enough that a REAL conservation violation in the same message still fires —
  demonstrated by mutating the substitution to change extra bytes and watching
  the gate go red through the exemption.

- **MOVED 2026-08-06 to `~/dev/Gunther-Schulz/claude-worktime/BACKLOG.md` — one
  event is booked twice or three times, so every cost total derived from that
  ledger is inflated by an unknown factor.** Merged there with the
  contradictory-CLASS instance found the same day, and the class question is
  now DECIDED (operator: neither class wins — dedupe the cost, keep both
  classifications, render the disagreement as its own state). Body lives there,
  deliberately not restated here.
  **What stays this repo's problem, and it is the reason to care:** the
  build-order block above opens with "five busts, 1,200,000 tokens re-billed"
  and ranks the queue partly on it. That figure rests on a counter with two
  known duplication modes. It is not re-derived here on one instance — but it
  is a premise with a crack in it rather than a fact, and the next build-order
  derivation says so or repeats it.

- **READY (small) — `capturePair`'s comment describes a size floor the code does
  not implement.** `bust-triage.mjs:275-277` says the busting request must carry
  "a body at least as large as the ledger's own ctx figure allows, floored at 2
  messages"; the code implements only `messages.length >= 2`. Doc-over-body
  drift in a function whose selection rule is load-bearing for every triage.
  Either implement the ctx floor or delete the clause — deciding which needs one
  measurement: whether any real bust would be selected differently. Verifier:
  the 12:54:49Z control and the s-captureAL case must both be unchanged by
  whichever way it resolves.

- **IN FLIGHT (operator-side, dotfiles; dispatched 2026-08-06 evening) — the
  push scan's already-published filter covers COMMIT MESSAGES only, and the FILE
  half fired on the identical class the same week.** The 2026-08-06 fix
  (dotfiles `6912e2b`) discards message findings whose text the other side
  already has, and says so in its own docstring, which ends
  `Datei-Befunde bleiben unangetastet`. That was a declared scope, not an
  oversight — which is exactly why this entry exists: the ARGUMENT the fix
  records ("was oeffentlich ist, ist per Konstruktion ausserhalb dessen, was ein
  Block noch verhindern koennte") is about publication, not about which FIELD
  carries the bytes, so it reached message bytes and stopped at file bytes for no
  stated reason. A rule's basis outliving its stated scope is the reach-test
  shape from the grounding corpus, here written down by the author of the
  narrower half.
  **The occurrence, measured:** a force-push of `pr/output-guard` rebased onto
  `upstream/main` (`e3149ae`) was blocked by 5 `capture-key-prefix` findings in
  `proxy/extensions/deferred-tool-rewrite.mjs` (224/238/417) and
  `test/deferred-tool-rewrite.test.mjs` (258/517). Confirmed before any
  bypass was considered: all five lines are byte-identical to `upstream/main`'s
  same lines, and neither file is in the branch's own 13-file diff. The bytes are
  a source comment naming a capture, already public in upstream's repo via our
  own merged #273 — unretractable by any block. **No `--no-verify` was taken**;
  the fork's rule limits it to deliberate WIP pushes, and the corpus rule is that
  a guard firing on legitimate work earns a declared exemption the guard itself
  verifies, never an override habit. The push is held until the gate is fixed.
  Design dispatched: discard a FILE finding only when the blob at the pushed tip
  is byte-identical to the same path's blob at a published tip (same
  `veroeffentlichte_tips` source as the message filter). A file our own commits
  touched is fully scanned, always — conservative on purpose, since a file
  carrying both public and new bytes must never ride through on its public half.
  Red-first: tonight's block reproduced, then green, and a capture id planted in
  a file the branch DOES touch must still block.

- **READY (operator-side, dotfiles) — one status file now has TWO definitions of
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

- **READY — `backlog-order.mjs`'s anchor namespace is the whole BULLET BODY, so
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

- **QUEUED THIS SESSION (2026-08-06 evening) — #278's second rebase round,
  serialized behind the running fork-repo lane, not dropped.** The round is read
  and understood (previous entry carries its content); the work is the runbook
  `docs/runbooks/upstream-pr-round.md` end to end — worktree + `node_modules`
  symlink, rebase onto current `upstream/main`, full `npm test` in the worktree,
  the hygiene greps scoped to THIS round's commits, then push and the
  push-announcement comment. It is not running yet for one reason, stated so it
  is not re-litigated: another agent owns this repository's working copy right
  now, and the runbook's own setup writes to the shared `.git` — one writer per
  repository. If this entry is still here when the fork lane has reported, that
  is the next thing to run.
  **RUN 2026-08-06 evening — REBASED AND VERIFIED, PUSH HELD.** Clean rebase onto
  `upstream/main` = `e3149ae` (not the `48e9673` upstream's comment names — it had
  moved again), zero conflicts, nothing left mid-rebase. `git range-diff` shows
  both commits `=`: content and message identical to what is already public in
  `refs/pull/278/head`, which is what makes the message-grep vacuous BY PROOF
  rather than by assertion. Suite in the worktree 1767/1768 (the count grew from
  1724 because the new base carries #273/#317). Both diff forms now agree at 13
  files / +543 / **0 deletions**; upstream's phantom `-2125` is gone. The push is
  blocked by the leak-gate scope gap booked above and waits on that fix — NOT on
  an override.
  **CI, and upstream's account is right but incomplete IN OUR FAVOUR.** Run
  31102727767 on the pre-rebase head: `test (18)` and `test (22)` each have
  exactly one step, `Set up job`, dead at *Failed to resolve action download
  info — Service Unavailable* (15:38–15:41Z), never reaching `Run tests` — so
  upstream's transient claim is corroborated verbatim. What their comment omits:
  **`test (20)` succeeded, all nine steps green including `Run tests`.** The
  suite did execute on `3c4ecfa` and passed; only two legs died at setup.
  **SURFACED, NOT RAISED — an operator decision, because it exceeds the
  push-announcement pattern the runbook authorises.** Post-rebase
  `proxy/extensions.json` registers `output-guard` at order **690, the same slot
  as the pre-existing `session-budget-breaker`**, while `request-log` already
  sits at **700** (`enabled: false`). This is unchanged branch content, not a
  rebase artifact, and it bears directly on the structural premise upstream's
  review raised (that nothing registers above 690 — a disabled 700 entry already
  exists). Their load-bearing review pass will reach it. Raising it needs a GO;
  the runbook's box permits the push announcement and nothing beyond it.
  **Instrument note, third instance tonight of one shape:** the round's first
  check grepped the test output for `output-guard` and got zero — a pattern that
  could never have matched, since no test title in that file carries the string.
  Same family as this evening's `jq '.byteGate.mismatch'` null: a self-composed
  pattern or path IS the instrument, and its reach is the claim's basis. Both
  were caught by their own authors; neither was caught by a mechanism.

- **READY — the close-out lane inventories EVENTS and not SIGNALS, so a
  doorbell that fires on every single turn can go a whole session
  undispositioned.** Found 2026-08-06 by asking "what else did we miss?"
  after the lane had already reported CLOSED. Measured on this session:
  `attention: 25 behind upstream (as of last fetch) | 33 READY, oldest 1d`
  was injected at session start and re-rendered every turn for ~8 hours.
  Nobody merged, nobody decided not to merge, and no entry records either.
  The lane's step 2 walks cold EVENTS to a disposition and its step 3 reads
  git state — neither asks what the standing signals were saying, so the
  one signal that was on the whole time was the one thing not walked.
  **Why this is worse than an ordinary miss: the doorbell was built this
  morning to stop exactly this, and it worked.** It fired, correctly, on
  every turn. What failed is the layer above — a signal with no
  disposition step becomes wallpaper, and a doorbell that is never
  answered trains the reader to stop hearing it, which is this repo's
  own check-that-fires-on-a-non-defect shape aimed at a check that is
  firing CORRECTLY. Habituation is the failure mode of a working alarm.
  Design, decided: close-out gains a step between 2 and 3 — **re-run the
  SessionStart scan and require every non-silent part of the attention
  line to resolve** to (a) an action taken this session, (b) a booked
  entry, or (c) an explicit "not this session, because —". The line is
  silent when clean by construction, so the step is a no-op on a healthy
  repo and costs one command otherwise. Computable: the parts are already
  structured (`N behind upstream`, `N READY, oldest Nd`, and gate-red once
  it ships), so the check is a parse plus a set difference against the
  session's own commits — no judgment beyond option (c)'s reason.
  Verifier, red-first and available: run it against this session before
  this entry existed — it must flag `25 behind upstream` as undispositioned;
  against the state after, it must pass on (b). Done when a standing
  signal cannot stay on for a whole session without someone saying why.
  **Immediate disposition of the instance, so this entry is not itself the
  miss it describes:** `main` is 25 behind `upstream/main`, deliberately
  NOT merged this session — merging upstream into deployed fork-main is a
  restart-and-repin operation (FORK-NOTES' update procedure), which is a
  poor fit for a session that spent its budget elsewhere and is closing.
  It is the first thing the next session should weigh against build order
  item 4.

- **READY — findings get classified ONE-SIDEDLY and the operator is the
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

- **READY — the widened mutation test WENT RED on the first new real pin,
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

- **READY — a matrix walk that dispositions a CAUSE is invisible to the
  tool that triages that cause, and both halves of the gap are real.**
  Found 2026-08-06 at session close. `bust-triage --at` returned
  **UNCLASSIFIED** — "a class nothing currently covers" — for
  `previous_message_not_found`, which this repo walked to CONTROLLED-CAUSE
  on 2026-07-31 and wrote up under a `## Event walk` heading in the threat
  matrix. `causeToRow` reaches numbered rows only, so the walk is
  unreachable by construction.
  **Machinery half:** the matrix has two containers for a disposition —
  numbered rows and `## Event walk` prose — and the tool indexes one. A
  reader following the documented route finds the answer; the tool
  following its route reports a new class. That is the entry-path rule
  (dev-loop) aimed at the matrix itself.
  **Process half, which is the generator:** nothing requires a walk ending
  in CONTROLLED-CAUSE to become a numbered row, or to state why it
  deliberately is not. The 2026-07-31 walk was prose because the moment
  called for prose; the next one will be too.
  **The seam between them is COMPUTABLE, which is what makes this a check
  rather than a rule.** "A cause token dispositioned anywhere in the matrix
  that `causeToRow` cannot resolve" is a set difference over two lists, no
  judgment involved — the precipitation criterion the corpus names.
  Design, decided: (1) extend the matrix reader to index `## Event walk`
  sections by the cause they name, so a documented disposition is reachable
  from the cause; (2) add a lint asserting the set difference is empty, so
  the process half enforces itself instead of relying on the next author
  remembering; (3) the same lint asserts every `## Event walk` section
  either names a numbered row or carries an explicit no-row declaration —
  that is the generator, and it is a grep, not a judgment.
  **Recorded because the rule change rests on it:** this session found (1)
  on its own, wrote "the finding is the tool, not the bust" into the matrix,
  and was about to book the reader fix ALONE. The process half exists only
  because the operator asked "machinery or process?" — verified against the
  artifacts rather than recalled: the matrix addendum, written before the
  question, contains zero process-half language; the entry you are reading,
  written after, contains both. `docs/dev-loop.md` rule three now carries
  the sharpened form (every reach failure has a writer, still running). Verifier, red-first and available now: the lint must go red
  on today's state (`previous_message_not_found` dispositioned, unreachable)
  and green after (1); `--at 2026-08-06T16:35:15Z` must stop saying
  UNCLASSIFIED and name the walk. Done when a cause the matrix has
  dispositioned cannot read as UNCLASSIFIED.

- **READY (operator-side, dotfiles) — "already on a remote" is not "already
  public", and the shipped scoping cannot tell them apart.** Found 2026-08-06
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

- **DONE 2026-08-06 (dotfiles `6912e2b`) — the push-side leak scan re-flagged already-public history on every
  rebase of an open PR branch, and the only exit is `--no-verify`.** Measured
  2026-08-05 while rebasing `pr/insertion-normalization` onto upstream's
  current main (upstream asked for it, to pick up their #310): the scan ranges
  over the REF UPDATE (`old..new`), so a force-push after a rebase presents
  eight re-parented commits as new and re-reports the `capture-key-prefix`
  findings in two of their messages. Those messages are byte-identical to
  commits already on the remote — verified by `git patch-id --stable` on all
  eight and by md5 of the two flagged messages — so they are already in
  `refs/pull/272/head`, which no push can retract and no block can help.
  The push went out with `--no-verify`, stated in the same message, after the
  full suite ran green in the worktree (1708/1709, 1 skipped).
  This is the fires-on-a-non-defect shape on the one gate guarding a public
  boundary, and the override habit it trains is the failure mode — the
  runbook already says as much about the HAND grep and scopes it to the
  round's own commits; the hook has no such scoping.
  Design, decision-complete: scope the scan's commit-message pass to content
  the REMOTE does not already have — for a force-push that is
  `new_sha ^{/}` minus the set of messages reachable from the old remote tip,
  computed from the pre-push stdin's `<old> <new>` pair rather than from the
  range alone. A message already published is out of scope by construction,
  not by allowlist. Verifier, red-first: drive the hook with a simulated
  force-push whose new commits are patch-identical re-parents of the old ones
  and assert it does NOT block; plus the control that a genuinely new commit
  carrying a capture key in its message still does. Done when a rebase
  force-push of an open PR branch passes the gate without `--no-verify`.
  Lives in dotfiles (the global pre-push dispatcher owns the leak scan), so
  this is an operator-side item like the Write-time hook entry below.
  **SECOND AND THIRD OCCURRENCE 2026-08-06 — this is now overdue, not
  pending.** Rebasing all three open PR branches onto `b00b141` produced the
  identical block on each: four `capture-key-prefix` findings, all four in the
  message of `b00b141` itself — UPSTREAM's own merge commit of our #272, an
  ancestor of `upstream/main` and therefore public on their repo, unremovable
  by anything we do. The design above already covers it (a message reachable
  from the remote tip is out of scope by construction), and the case is even
  clearer than the originating one: the flagged commit is not merely
  already-published, it is not ours. Three pushes went out `--no-verify` this
  round, each stated. The measured cost of the gap is no longer "an override
  once" — it is an override becoming the routine way to push a rebased branch,
  which is precisely the reflex the entry predicted.
  Discipline note from the same round, kept because it is the part that nearly
  went wrong: on the second of the three pushes the bypass was used WITHOUT
  first confirming the block was this known case. It was checked afterwards and
  the branch was clean, but the order was wrong — the confirmation is what makes
  the bypass legitimate, and doing it retroactively is how a justified exception
  decays into a habit. Until the hook is fixed: read the block, name the commit
  it flags, confirm that commit is already public, THEN bypass.

- **BUILT 2026-08-06, NOT LIVE (dotfiles `7b13af4`) — moved the leak scan's feedback from PUSH
  to WRITE.** Grounding, measured 2026-08-05: the same author leaked capture
  session ids into tracked files TWICE in one session, hours apart, and both
  times learned at `git push` — after the bytes were in a commit, requiring an
  amend each time. The scan is correctly placed as the last line before public
  history and must stay there; what is missing is an earlier, cheaper signal.
  Root cause is booked in `docs/dev-loop.md` ("The written rule is NARROWER
  than the enforced one") and its prose half is fixed there; this item is the
  mechanical half.
  Design: a PreToolUse hook on Write/Edit that runs `tools/absence-scan.mjs`'s
  `scope: "any"` classes over the pending CONTENT when the target path is
  TRACKED in a repo whose tree carries `tools/absence-scan.mjs` — import the
  classes, never restate the patterns, so the two gates cannot drift. Deny with
  the class name and the alias convention in the message. Scope keeps the false
  fires near zero: untracked paths (scratch, `CLAUDE.local.md`, the alias
  registry) and non-repo paths are exempt by construction, and those are where
  a session id legitimately gets written.
  Verifier, red-first: drive the hook with a payload containing a real-shaped
  capture key destined for a tracked path — must DENY, naming the class; and
  two negatives that must ALLOW — the same payload to an untracked path, and a
  tracked path in a repo without the scanner. Done when a write of the shape
  that leaked today is refused at the Write call.
  Lives in dotfiles (`claude/hooks/`), not here: the repo owns the classes, the
  machine owns the hook.

- **READY (operator-side, dotfiles) — a non-executable hook is SKIPPED BY GIT
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

- **CLOSED 2026-08-06 — VERIFIED BLOCKING, by an executed run against the LIVE
  hook.** The dispatcher ran the lane's own force-push repro
  (`repro-item1.sh`, two real bare remotes and a real fetch) pointed at
  `~/dev/Gunther-Schulz/dotfiles/git/hooks/pre-push`, the file global
  `core.hooksPath` actually resolves: CTRL 1 (new commit, capture key in the
  MESSAGE) `git push exit=1`; CTRL 2 (new commit, capture UUID in a FILE)
  `git push exit=1`; CASE A (force-push of re-parented commits) and CASE B
  (rebase onto upstream's public commit) both `exit=0` with the already-public
  findings named as skipped rather than silently dropped. So the gate blocks
  what it must, passes what it should, and says which it did. The entry stays
  in place rather than being deleted because the STATE it describes recurs:
  every future edit to that file is live on write, and this run is the shape
  that re-closes it.
  Original entry, kept for the trigger it names:
  State: global `core.hooksPath` resolves to the dotfiles
  `git/hooks/` directory, so `git/hooks/pre-push` is the active gate for every
  push on this machine and went live the moment it was WRITTEN — no commit, no
  deploy. A dispatched lane rewrote it (270 lines, already on the dotfiles
  remote via a peer session's push).
  What IS established: the modified hook let a legitimate 8-commit push through
  with the leak scan running (fork `main` -> `75d9a0e`), so it is not
  fail-closed and not hanging on the normal path.
  What is NOT established, and is the entire point of the gate: that it still
  BLOCKS a real leak. One attempt was made and proves nothing — a throwaway repo
  driven with a synthetic pre-push stdin pair hung for two minutes and was
  killed; the invocation was artificial (no reachable remote), so the hang is
  evidence about the probe, not about the hook.
  Verifier: plant a capture-key-shaped identifier in a commit MESSAGE in a
  throwaway clone with a reachable local bare remote, push, and require a block
  naming the class; control, a clean commit must push. Until that passes, treat
  every push from this machine as unscanned and read the block output rather
  than trusting silence. Done when the control has gone red on a planted leak
  since the rewrite.

- **READY — the new verdict kinds have no live path, so most of the enum has
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

- **DONE 2026-08-06 (c003759) — `harvest --pin` now verifies the pin reproduces what it was taken
  for; today it reports success on a fixture that proves nothing.** Measured
  2026-08-06: a pin taken to freeze the row-26 evidence printed
  `pinned 327 record(s), range 166..167` and replays with 0 exemptions where
  the live range yields `first-appearance-relocation (skills)`. The scrub had
  removed the literal prefixes the extension keys on; the tool had no way to
  notice and no obligation to look. Design, decided: after writing the fixture,
  `--pin` replays BOTH the pinned file and the same range of the source capture
  under the same gates, and compares the verdict-bearing rows (exit code,
  stability violations, exemptions, census classes) — feeding `.records` out as
  JSONL, never pointing `replay.mjs` at the `.json` pin, which reads 0 pairs and
  exits clean. The comparison therefore asserts the PAIR COUNT first: two runs
  that compared nothing agree perfectly and mean nothing. Divergence prints as a
  named WARNING on the pin — `pinned, but does NOT reproduce: <what differs>` —
  never as silent success; a pin that reproduces nothing is still worth keeping
  as raw structure, so this warns rather than refuses. Verifier: run it on
  `pinned-s-468303a4d2d0-166-167.json`, which is the known positive — it must
  warn. Then run it on a pin whose class survives the scrub, which must not.
  Done-criterion: both, plus the warning text naming the missing rows.

- **DONE 2026-08-06 (70ffcb4 + 142e6b1) — `bust-triage`'s verdict was a two-value collapse over a seven-value
  status vocabulary, and the default is the reassuring one.** Measured
  2026-08-06: `--at 2026-08-06T09:59:58Z` returned **MITIGATED** for a bust
  whose class nobody has mitigated, citing row 6 — whose status is literally
  "OBSERVED, CAUSE NOT ISOLATED". Cause: `bust-triage.mjs:397` computes
  `open: /\bOPEN\b|RE-OPENED/.test(status)` over a 260-char slice and
  `:513` maps `row.open ? "KNOWN-OPEN" : "MITIGATED"`, so every status that is
  neither OPEN nor RE-OPENED lands on MITIGATED. Swept over the matrix: **7 of
  25 rows mis-map** — 3 (DOCUMENTED), 5 (PARTIAL), 6 (OBSERVED, CAUSE NOT
  ISOLATED), 13 (BUILT), 14 (BUILT, remedy proved insufficient), 16 (COVERED
  operator-side), 17 (N/A note only). The same stamp's `dossier` said "no row
  matches — UNCLASSIFIED, treat as a new class" and was right; the tool a
  reader acts on was the one that was wrong. This is dev-loop's "A checker has
  THREE answers, not two" broken inside the repo's own front-line triage: the
  third answer (status recognized by no rule) is folded into pass. Design,
  decided: parse the status to an explicit enum with a MANDATORY unmatched case
  that surfaces as its own verdict — `STATUS-UNREADABLE`, grouped with
  UNCLASSIFIED as a stop-here, never with MITIGATED. Verifier: red-first
  against the current implementation using row 6's real status string, which
  must return MITIGATED today and must not after; plus a case per mis-mapping
  row above. Done-criterion: all 7 stop being MITIGATED, and a row whose status
  genuinely reads MITIGATED still does.

- **DONE 2026-08-06 (4168add) — `fixture-verdict-identity.test.mjs` mutation-tested `FIXTURES[0]`,
  so which artifact the whole file exercises is decided by SORT ORDER, and
  adding a pin silently re-aims it.** Found 2026-08-06 by adding one: the new
  pin sorted first (`468…` before `4b6…`), became the mutation subject, and the
  file went red on its own vacuous-pass guard ("carries no `<system-reminder>`
  block — the mutation would be a no-op"). The guard is right and the aiming is
  not. Probed: the identical fixture renamed to sort last gives 2184/2184
  green, so every pin except position 0 is mutation-tested by nothing — the
  entry-path shape, in the corpus this time. Design, decided: run the three
  mutants over EVERY replayable fixture (they are a handful, and the run is
  seconds), with the no-op precondition reported per fixture as a named SKIP
  carrying the reason rather than an assertion failure — a fixture that cannot
  host the mutation is a fact about the fixture, not a broken test, and today
  it reads as the latter. Verifier: with a known-defective pin present at any
  position the run must name it; with only sound pins it must be green and must
  print how many fixtures it exercised. Done-criterion: both, and the count
  printed — a run over one fixture and a run over five must not look alike.

- **READY — the fixture-verdict mutation population is DIRECTORY-derived, so
  the suite covers a different corpus on every machine.** Found 2026-08-06
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

- **READY — `replay.mjs --json` drops the census entirely, so every consumer
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
  and the hits enumerated. Verifier, red-first: the command above must print
  populated `tally`/`examples`; control, a run with no census requested must be
  byte-identical to today. Done when `verifyPin` can drop its text parser — and
  the parser's removal is the done-criterion, not an optional follow-up, since a
  second reader of the same data is how the two drift.

- **READY — the threat matrix's status cell is split on `|`, so a row whose
  prose CONTAINS a pipe hands the reader a mid-cell fragment.** Surfaced
  2026-08-06 by the dispatched status-enum work, correctly returned as a gap
  rather than fixed inside a boundary that did not cover it. Row 3's status
  contains an inline `` `header:anthropic-beta[-mid-conversation-tool-changes]` ``
  in running text; `matrixRow`'s `line.split("|")` therefore yields a fragment
  starting mid-sentence, and the `DOCUMENTED` the row LEADS with is never seen
  by anything. The shipped status enum makes this land on STATUS-UNREADABLE,
  which is the safe direction and is not a fix: the tool still cannot read a row
  it is supposed to read.
  Two candidate fixes and the second is preferred: (a) escape the pipe in the
  matrix cell — one row today, and the next author re-introduces it; (b) parse
  the row by markdown table semantics (a cell boundary is an UNESCAPED pipe
  outside inline code), which fixes the class. Verifier, red-first: row 3 must
  parse to kind DOCUMENTED after the change and to STATUS-UNREADABLE before it;
  control, a row with no pipe in its prose is unaffected. Done when no matrix
  row reads as UNREADABLE for a reason that is the parser's rather than the
  row's.
  **Why it is worth more than one row:** the same split is how the other matrix
  readers reach their cells. A parser that silently truncates at the first pipe
  is the "partial view read as its whole body" shape aimed at a table.

- **READY — the synthetic-HOME pattern is the only way to drive this repo's
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

- **READY — `bust-triage`'s UNVERIFIABLE branch prints a FALSE disjunction, and
  the reason text is what a reader acts on.** Found 2026-08-06 by using it on
  the event above: it answered `UNVERIFIABLE — no capture pair (capture off, or
  rotated)`, and both disjuncts were false. The capture for that session existed
  at the time of the run, covered the window (its last write is one minute AFTER
  the busting timestamp), and a replay over it found 4 same-conversation pairs.
  So the tool's stated reason named two causes, neither of which held, for a
  state it has no word for: capture PRESENT, pairs PRESENT, and its own pairing
  step nonetheless returning nothing.
  This is the same defect family as the two-value verdict collapse already
  ranked — dev-loop's "a checker has THREE answers, not two", one level in: the
  third answer is present but its EXPLANATION is a guess, and a guessed reason
  reads exactly like a measured one.
  Design, decided: the UNVERIFIABLE reason is computed, never asserted — check
  in order and report which check failed: capture file for the session absent /
  present-but-window-not-covered / present-and-covered-but-no-pair-found. The
  third is its own reason string and names the pairing input it had.
  Verifier, red-first: drive it on the event above; today it must print the
  false disjunction and after the change it must print the
  present-and-covered-but-no-pair case. Control: a genuinely absent capture must
  still report absent. Done when no UNVERIFIABLE row states a cause the tool did
  not test.

- **READY — the usage log has no CC-session key by design, so the number that
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

- **READY — the required-reading INJECTION carries the closing gate and not the
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

- **READY — an index check for the runbook lane system, and it must be built
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

- **DONE 2026-08-06 (ships with this entry's commit, `tools/backlog-order.mjs`)
  — the derived build order did not reach a fresh session, so the
  ranking was invisible exactly where it is meant to act.** Found 2026-08-06 by
  running the SessionStart hook against this repo instead of assuming what it
  emits: `session-scan.py` reads the `## Open` section only, and the
  `## Build order` block sits above it. A starting session is therefore handed
  eight READY headers in FILE order — the first being an 08-05 bust entry —
  and never sees which of the twenty-seven to build first. The doorbell and
  the ranking were built the same day and do not meet.
  Two candidate fixes, and the second is preferred. (a) Teach the hook to
  surface a named ranking section — but `session-scan.py` is generic and shared
  by every repo, and hard-coding one repo's heading into it is the wrong
  placement. (b) **Make file order BE the derived order**: re-ordering the
  `## Open` section to match the ranking whenever it is re-derived makes the
  injected head the ranked head for free, with no hook change and no second
  place for the order to live. That is consistent with the rubric rather than
  in tension with it — the rule is "re-derive rather than edit", and a
  re-derivation that also reorders the file is still one derivation with one
  carrier. Verifier: after a re-derive, the hook's first injected line
  is the ranking's item 1. Done-criterion: that, plus the `## Build order`
  block naming file order as its own carrier so the next session does not
  reintroduce a second copy.
  **BUILT as (b), both halves.** `tools/backlog-order.mjs` moves the ranked
  bullets to the head of `## Open` from anchors that live inside the build-order
  items themselves — one copy of the rank, adjacent to the item it ranks — and
  its `--check` mode is the standing guard. Demonstrated red before it was
  applied (`--check` exit 1 against the file as it stood, injected head an 08-05
  bust entry), green after, and idempotent on a second run. The block above now
  names file order as the carrier and carries the two commands.
  **Residual, named rather than left implicit:** the tool moves whole bullets,
  so `git blame` dates every moved entry to the reorder commit — which is
  precisely the case `session-scan.py`'s own age docstring says would re-open
  its first-appearance question. That is the entry below, with the number.

- **READY (operator-side, dotfiles) — the reorder collapses the READY-age
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

- **HANDOFF 2026-08-05 LATE NIGHT — read this first. It supersedes the NIGHT
  handoff's queue section and nothing else.**
  **STATE: everything committed and pushed, both repos.** Fork main at the
  commit carrying this entry; dotfiles at the pin `f024b0a`. Suite 2184/2184.
  Proxy restarted TWICE tonight and verified content-to-content both times
  (`/health` == `sourceFingerprint(disk)` == `3162447a7a61`, dotfiles pin ==
  `git rev-parse --short HEAD:proxy` == `f024b0a`). A gate re-stamp for that
  tree was running when this was written — CHECK IT FIRST
  (`jq -c '{finished,code,failing}' ~/.claude/cache-fix-gate-status.json`);
  the previous sweep was 63 captures, 1 failing, and the one failure is the
  long-standing row-24 conservation pair, not a regression.
  **THE QUEUE'S TOP ITEM IS DONE, with its mechanism.** CACHE-CONTROL and
  TEXT were one class: 26 of 34 absorption misses are a moved cache_control
  breakpoint. The ladder mislabelled them (TEXT ran before the strip test),
  `cacheControlOnly` now rides every absorption row from a
  container-preserving stripped hash, and the sweep summary carries
  `cacheControlOnly` + `cacheControlUnknown`. The sweep's own number
  reproduced the hand classification exactly, 26/34 with zero unknowns.
  **AND THE FINDING IT PRODUCED IS PARTLY IN DOUBT — start here.** A 610k
  bust at 20:52Z is a marker leaving the last message and nothing else. The
  counting stands; the inference "therefore free" does not. Its entry below
  carries the measurement, the frozen fixture, and the one number that
  settles it. That number now exists going forward: `usage-log` was enabled
  tonight and writes per-request `cache_read` / `cache_creation`.
  **DO NOT DISPATCH `builtByUs` AS WRITTEN.** Its named known positives are
  gone from the corpus — one row no longer exists, the other moved index —
  and three spot-checked rows were all byte-present in CC's raw array. Its
  entry says what to re-ground first.
  **UPSTREAM MOVED TODAY, and the previous handoff's "nothing is blocked on
  us" is stale.** Four PRs merged (#275, #279, #280, #282). #272 is rebased,
  APPROVED and CLEAN — ball with upstream, and #273/#278/#281 unblock behind
  it. #276 answered. #295 closed as dropped. #278 shows `mergeStateStatus:
  DIRTY` and will need the same rebase treatment #272 got — that is the next
  upstream item, and the runbook covers it.
  **TWO PUBLIC CLAIMS WERE CORRECTED TONIGHT**, both because a check was made
  at the wrong layer: a scanner "false positive" that was really a declared
  exemption doing its job, and the marker-is-free note above. Both edited in
  place, reasons stated. The lesson is already in dev-loop; the pattern was
  testing a part (an exported regex, a corpus count) and claiming a property
  of the whole (the scanner, the cost).

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

- **READY — READY has no expiry, so nothing ever forces the build-or-drop
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

- **READY (operator-side, corpus — NOT this repo) — two corpus edits agreed
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

- **READY — `bust-triage` reports a STATE-KEY CHANGE across the busting pair
  as its own line.** This is the hand-step that found row 26, and it is
  invisible to every diff of the request bodies: the extension event logs
  carry the key each request was handled under, and a key that changes between
  two requests of one conversation is a total state loss reported as
  `no-baseline`/`reset` rather than as an error. Measured 2026-08-06:
  `deferred-tool-rewrite` logged `rewrite` under one key and `no-baseline`
  under another nine seconds later, same conversation — that flip WAS the
  216,060-token bust, and nothing in either request's bytes said so. Closing
  gate question 3 answers YES by existing: the classification was made by hand,
  so the tool should emit it. Design, decided: for the pair it already
  identifies, `bust-triage` greps
  `~/.claude/cache-fix-snapshots/*-{insertion,deferred-tool}-events.jsonl` at
  both timestamps, extracts the key each request was handled under, and prints
  a `state-key` step — OK when both requests share a key, and a named finding
  when they differ, quoting both keys and both `action` values. It is a STEP in
  the existing chain, not a new tool (dev-loop: extend an existing tool before
  writing a new one; reuse inherits the interleaving and pairing lessons a
  fresh file re-earns from zero). Verifier, red-first: run it at
  `--at 2026-08-06T09:59:58Z`, which must report the flip
  `7741083f1d475059 -> 0adfdad6b91abb0e` with `rewrite -> no-baseline`; and at
  a stamp whose pair shares one key, which must report OK. Done-criterion:
  both, plus the step appearing in the OK case too — a check that prints only
  on findings cannot be distinguished from one that did not run.

- **DONE 2026-08-05 (ships with this entry's commit) — CACHE-CONTROL and
  TEXT are ONE mechanism, it is ours, and it re-bills nothing: 26 of the
  34 absorption misses are a moved cache_control BREAKPOINT.** The queue's
  top item asked whether the remaining misses are one mechanism or
  several. Measured over every row the sweep persisted, not over a sample:
  each row's forwarded pair dumped at its own divergence index
  (`--dump-forwarded` built from the persisted rows, one replay pass per
  capture) and compared after a container-preserving cache_control strip.
  **26 CACHE-CONTROL / 7 TEXT / 1 CONTAINER**, and the ladder class agrees
  with the strip test on all 34 rows — two independent computations, zero
  disagreements.
  **THE MECHANISM IS OUR OWN `cache-control-normalize` (order 400,
  enabled).** It strips every user-message marker and places one canonical
  `{"type":"ephemeral"}` on the last block of the last user message, so on
  the NEXT request the message at the old position has lost its marker and
  `findAbsorptionMisses` — which hashes raw bytes, deliberately — calls
  that a miss. The signature is a 48-byte delta, exactly
  `,"cache_control":{"type":"ephemeral","ttl":"1h"}`.
  **AND IT IS FREE, measured rather than argued.** The API keys its cache
  on content and reads a marker as the designation of a write point; the
  documented multi-turn pattern is to move the breakpoint to the newest
  turn every request and keep reading the prefix. Live check: 32 of 34 rows
  have NO cold event in the same session within +/-180 s, over all 83
  worktime-ledger events. The instrument is shown live on a known positive
  in the same query — the one genuinely-stale row lands on both 349k events
  — and the other hit is a `tools_changed` bust, a cause above the messages
  layer entirely.
  **"TEXT 15" WAS NEVER A TEXT CLASS.** `extractText` stringifies every
  non-text block, cache_control included, so a marker on a `tool_result`
  read as a text difference and the TEXT check ran first. The evening
  handoff's split was measured through that ladder. Fixed: the strip test
  now runs directly after ROLE, where it can steal no row from a real class
  (a pair equal after stripping differs in nothing else by construction).
  Red-first on the real shape; the CONTAINER and TEXT order controls stay
  green.
  **WHAT SHIPPED, tools/-only, no deployment coupling:** (1) the ladder
  reorder plus its bite; (2) `stripCacheControlDeep` in replay.mjs,
  exported and imported by absorption-classify so the two cannot drift;
  (3) `outHashNoCC` in `compactEntry` — container-PRESERVING, deliberately
  not `outHashSem`, which folds string into one-block array and would have
  exempted the row-4 container flip this check exists for; (4)
  `cacheControlOnly` on every absorption row, `null` (never `false`) when
  the entry predates the field; (5) the sweep's `absorption` summary gains
  `cacheControlOnly` + `cacheControlUnknown`. Suite 2182/2182.
  **THE RESIDUAL, named: 8 rows that are real, and neither is new work
  today.** One is the row-4 residual the evening handoff already booked
  (CC's own input diverged first). One is the surviving CONTAINER row. The
  other six are a CC-side variant fork on one capture, entry below.

- **READY — the suggestion-mode variant fork is a census class: CC issues
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

- **DONE 2026-08-05 (fresh-context review; ships with this entry's commit) —
  the post-fix standing red on s-captureAB is explained, verified at the
  bytes, and converted to a declared exemption.** The sweep kept failing
  that capture's n=331->336 under the SHIPPED build because the relocation
  memory is keyed through `systemPromptSubKey`, and CC swapped its first
  system block in the same request ("You are Claude Code…" 57 chars -> "You
  are a Claude agent…" 62 chars, sub-key 2719b7a4 -> 0d706285) — the memory
  sat stranded under the old key, the in-place path forwarded without the
  block, and the flip is free by construction (the system change re-bills
  everything after system anyway). No extension change: carrying the memory
  across rotation would either re-open the sidecar collision the sub-key
  closes or buy bytes that are already re-billed. The gate instead gains
  `memoryStrandedByKeyRotationExemption` (replay.mjs): five conditions, all
  telemetry or imported identity, green on the stranding shape and red on
  each condition removed singly (replay-gate-selfcheck), demonstrated on the
  real capture (exit 1 -> exit 0, the row now prints
  `memory-stranded-by-key-rotation (mcp)` with both sub-keys as basis).
  Condition 5 (`ourSystemIdentical === false`) is the exemption's own
  retirement trigger: if anything upstream ever stabilizes the forwarded
  system prompt, a stranding stops being free and the violation returns by
  construction. Row 25 carries the same explanation.

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

- **DONE 2026-08-05 (500f131) — the relocated-block DEPARTURE class is a
  census class, and it found a second instance the hand-read had missed.**
  `findRelocDepartures` (replay.mjs), always on, REPORT not gate, one row per
  type present in a pair's predecessor and absent in its successor, each
  carrying `prefixAboveMessages` so a costly departure is separable from a
  free one at a glance. First corpus reading on s-captureAB: 2 departures /
  342 pairs, 1 with an intact prefix. Row 25 amended; the sentence it
  replaced ("exactly one departure") was a hand-read and was wrong.

- **DONE 2026-08-05 (4a61b1c) — the relocation memory persists, so a
  restart no longer re-inflicts the divergence it prevents.** One file per
  conversation key under `cache-fix-snapshots`, tmp+rename, owner-only,
  fail-open read, written only on change, disk bounded by the same cap as
  memory (newest 256, pruned every 64th write, own suffix only). Pinned by a
  byte-identical-restart bite plus a fail-open control plus both halves of
  the 0600 invariant; mutating `persistMemory` to a no-op turns all three
  red. Audit moved back to stateful-PERSISTED.

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

- **HANDOFF 2026-08-05 LATE — superseded by the evening handoff above;
  its UPSTREAM section is still current.** It supersedes the
  handoff below on every point they disagree.** Everything is
  committed and pushed (fork-main and dotfiles both clean, 0 unpushed).
  Suite 2112/2112. Deployed tree `9ef42be576bd`, /health verified
  content-to-content against disk, dotfiles pin `5d39423`. Doctor reports
  ONE fail and it is the gate-red below, not a machine problem —
  "1 von 41 Captures NICHT sauber". Everything else in doctor is
  green, including the two new .git/config-signature checks.

  **STATE OF THE GATE: 1 failing capture, down from 3.** The survivor
  is s-captureD conservation 2 — the row-24 container-flip pair the
  earlier handoff already attributed as PRE-EXISTING and proven
  byte-identical under old and new code. The other two are CLOSED (see
  the GATE-RED CLOSED entry): 38 -> 0 and 2 -> 0.

  **THE BIGGEST OPEN THING, and it is new: the absorption check's
  first corpus-wide number is 50 misses, 40 of them OURS, across 12
  captures.** `gate-live` now carries `absorption: {total, ours,
  captures}` in every sweep. That is 40 cases where a mitigation RAN
  and did not ABSORB, attributable to us — the class that let a 349k
  bust replay green on all five gates. It is a REPORT, not a gate, on
  purpose: the rate was unmeasured when it shipped and now it is not,
  so the next question is CLASSIFICATION — are the 40 one mechanism or
  several? Start here; it is the largest measured, unexplained number
  in the repo.

  **WHAT SHIPPED TODAY** (all pushed, all red-first): the conservation
  exemptions (fresh-session-sort's rewrite, the smoosh-split/
  content-strip composition) and the `normalizeSessionStartText`
  anchoring; `findAbsorptionMisses` in replay + the daily sweep; the
  UTC round trip (`bust-triage` marks its rows, `dossier` reads a
  naked stamp as UTC); the absence-scan's three blind spots — object
  KEY names, commit messages, and every text file type — plus
  class-scoped exemptions replacing the path-wide allowlist; the
  harvest ledger's keys hashed (94 session UUIDs gone from a public
  file); `tools/restart-exposure.mjs`; and the doctor checks for the
  .git/config corruption signature (dotfiles 443b200).

  **THREE THINGS THE NEXT SESSION SHOULD NOT RE-LEARN.**
  (1) A restart is transparent unless the NEW CODE forwards different
  bytes for content live conversations already hold — measured six
  restarts, one bust, with a comment-only-scrub restart as the clean
  control. Before any proxy restart whose change alters forwarded
  bytes, run `node tools/restart-exposure.mjs --match '<class>'`; the
  cost is live-session tokens, never corpus instances.
  (2) The gate's conservation units are UNWRAPPED while the
  extensions' predicates are defined over the WRAPPED
  `<system-reminder>` form. That one confusion caused three separate
  bugs in replay.mjs in a single afternoon.
  (3) A measurement over a working tree another writer holds is quoted
  with the commit it was taken at, or not quoted — three wrong
  exposure counts came from unpinned greps while an agent committed.

  **UPSTREAM:** all nine PR-round items are ANSWERED — which is not
  the same as merged, and the distinction matters for whoever reads
  this next. Six PRs had their review round answered with a fix
  pushed and a comment posted (#272, #275, #276, #279, #280, #282) and
  are still OPEN awaiting upstream; issue #292 is answered and its fix
  is **PR #307** (`Closes #292`); the absence-scan split is **PR
  #306**; #295 is DROPPED on a falsified premise (see its entry).
  Nothing is blocked on us. Do NOT re-do any of the six — check the PR
  thread first; the next move on all of them is upstream's.

  **THE 8-HEX PREFIX IN HISTORY: DECIDED — ACCEPTED, 2026-08-05.** See
  the dedicated entry below for the measurements and the basis.

- **HANDOFF 2026-08-05 — the 08-02 handoff's G1/G2/G3 are all settled
  and shipped on `wt/description-absorb` (now at 7f6e5a1, pushed);
  read this before the entry below, which it supersedes on those
  points.**
  **G2 DECIDED: SET-identity.** Basis: sort-stabilization (order 200,
  `proxy/extensions/sort-stabilization.mjs:60-62`) name-sorts
  `body.tools` on EVERY live request, so incoming order is not a
  property the pipeline preserves — and the absorb forwards the
  canonical's first-seen order regardless, so the relax changes zero
  wire bytes versus the order-identical case. Bite re-specified FIRST
  (commit 1a60631), red-first at both levels (new bite vs fd87e12:
  exactly the reorder expectation red; new self-check vs old replay:
  exactly the exemption test red). Corpus: the absorb now FIRES on
  request 1202 — the 484,972-token bust — and old-vs-new replay of
  the whole 1512-request capture differs ONLY in the 52 declared
  announcements.
  **G1 SHIPPED (da4e8e1)** — with a deliberate deviation from the
  entry below: the exemption is SHAPE-based (isDescriptionNotice,
  living beside the builder, shared template constants), NOT keyed on
  `descriptionChangedNames` telemetry as sketched, because both
  consumers rule telemetry out: input-side ECHOES of injections carry
  no telemetry (the 2026-07-29 one-sided-filter incident), and the
  byte-stability exemption reads positions after bodies are gone
  (tools/replay.mjs:712-716).
  **G3 SETTLED by wire evidence, not a probe**
  (tools/scan-description-carrier-evidence.mjs, 7f6e5a1): 837 live
  streamed-200 requests on claude-opus-5 AND claude-fable-5 carried
  an active tool_addition injection (beta on the wire) alongside CC's
  own role:system TEXT messages — the notice's exact carrier shape,
  at population scale. Residue: proves the carrier, not the specific
  notice bytes; the extension header's gate-3 live acceptance (one
  absorbed request observed on production capture) remains owed at
  flag-flip.
  **DEPLOYMENT of the two landed changes: DONE, by the 08-05 boot.**
  The machine rebooted 09:59; systemd started the proxy from the repo
  tree at 9059d3a, and /health's fingerprint matches disk exactly
  (eec233efa271) — no restart owed. Dotfiles pin bumped ad4ff80 ->
  6b69e87 (dotfiles d2c9874).
  **ROW 4 IS NOT CLOSED — the gate ran RED, on OTHER classes.** First
  gate run over the 40-capture/6.7GB corpus (10:02-10:14): failing 3,
  byte-gate MISMATCH 3. Attributed: s-captureJ conservation 2 = the
  row-24 container-flip pair at n=1400 (in[937]/out[937], role
  system, 938-msg thread) — PRE-EXISTING, proven byte-identical under
  old and new code. UNATTRIBUTED, next session's triage:
  **s-captureI conservation 38** (the big one), s-captureU
  conservation 2, byte-gate MISMATCH s-captureG x2 + s-captureJ x1.
  Row 4's own signal was not read out of the gate rows before this
  handoff — read it there before booking anything about row 4.
  **BRANCH DEPLOY still gated on:** (1) full suite on the branch —
  known sole failure is the absence-scan guard at the branch's
  pre-770e915 base (session ids main already scrubbed;
  gate-live.test.mjs, replay-gate-selfcheck.test.mjs, replay.mjs) —
  merge into current main and re-run rather than fixing on-branch;
  (2) the merge itself; (3) restart with row-3 stated: fd87e12+ is
  FORWARD-COMPATIBLE ONLY (rollback after deploy is not clean — old
  build mis-marks defer_loading on new-format state).
  **UPSTREAM (operator asked 08-05):** fork is 14 behind
  upstream/main; `git merge-tree` shows REAL conflicts in
  proxy/server.mjs and test/proxy-wrapper.test.mjs — the pull is its
  own deployment-coupled work unit, not a casual merge. Among the 14:
  header-forwarding and supervised-stop fixes to server.mjs, launcher
  ca-trust changes, RFC 7230 absolute-form fix. PR-thread sweep
  (10 fork PRs; 5 CHANGES_REQUESTED, #275 CONFLICTING) dispatched to
  a sonnet agent 08-05; report delivered — persisted (id-masked) at
  docs/audits/upstream-pr-sweep-2026-08-05.md, and every actionable
  item from it is booked in the "Upstream PR round" section below.

- **GATE-RED TRIAGED 2026-08-05 — all 38 conservation rows on
  s-captureI attributed to TWO declared behaviours; neither is a
  corruption, and the gate is right by its own definition.** Method:
  the capture replayed under `--gates-from-capture` (exit 1,
  reproducing the sweep: conservation 38 = 19 lost + 19 invented,
  everything else 0), then each row attributed by RUNNING the
  suspected extension's own exported transform over the real raw
  bytes — not by reading it. Evidence file:
  `scratchpad/replay-c7c83ca5.json` (session-local).
  **(A) 11 lost + 11 invented — `fresh-session-sort`'s block
  rewrite.** The skills `<system-reminder>` block is re-sorted by
  `sortSkillsBlock` and whitespace-normalized by `pinBlockContent`
  (fresh-session-sort.mjs:37-70): 8080 -> 8079 chars, unit hash
  `0a3d686e8066b1e2` -> `85efde987a484e9d`, first difference at
  offset 85 (the entry order). `hashMessageContent` excludes only
  `cache_control`, so a text rewrite is one lost unit plus one
  invented unit, per request, exactly the observed 1:1. Measured on
  requests 168/169/175 (block at msg 0) and 191 (msg 14, relocated to
  out[0] — which is why the lost and invented rows sit at different
  message indices). The deferred-tools block's sort is a NO-OP on
  this corpus (CC already emits it sorted), which is why one unit
  moves and not two.
  **(B) 8 lost + 8 invented — `smoosh-split` COMPOSED with
  `content-strip`, at msg[6] of requests 177/180/181/182/186/187/
  189/191.** msg[6] block[3] is a `tool_result` whose STRING content
  carries a `<system-reminder>` smooshed onto its end ("The task
  tools haven't been used recently."). `splitSmooshedReminders`
  returns `{peeled:1}` on it (measured), splitting 4 blocks into 5;
  `content-strip` then removes the peeled standalone because that
  text matches its own BOOKKEEPING_PATTERNS (content-strip.mjs:4-12).
  The conservation gate's clause-(d) peel exemption requires
  `peeled.every(u => fHashes.has(u.hash))` (replay.mjs:1927) and that
  `.every` correctly fails — the peeled unit really is off the wire.
  So the exemption machinery is working; what is missing is a
  declared exemption for content-strip AT ALL: clause (c)
  (`isDeclaredStrip`) covers only fresh-session-sort's
  `isClearArtifact`, never content-strip's bookkeeping patterns.
  **Consequence: this is the repo's own "a check that fires on a
  NON-defect is failing too" class, twice.** No content the model
  needs is lost — (A) reorders a list, (B) drops a rotating
  bookkeeping nudge on purpose — but the daily gate goes RED on
  legitimate work, which trains the reader to discount red. Repair is
  the declared-exemption shape this file already uses, never a
  softened predicate. Two READY items below.
  **(C) s-captureU's 2 rows, same sweep, attributed the same way and
  it is the one with a real fidelity residue.** Replayed under its own
  gates (exit 1, conservation 2, everything else 0): request 292
  (2026-08-02T17:20:02.283Z), `in[278]` lost / `out[272]` invented, a
  single-unit 5,438-char user text block. Attribution by exercising
  the extension's own export: `normalizeSessionStartText`
  (identity-normalization.mjs:36-56) rewrites `SessionStart:resume
  hook success:` -> `SessionStart:startup hook success:` at offset
  1379 — and at that offset the marker is being QUOTED inside a
  `<teammate-message>` as prose, not emitted as a hook. The predicate
  is an unanchored substring replace over any text block, so it
  cannot tell a live marker from a mention of one. Booked as its own
  READY item below; the conservation exemption for it is the same
  declare-and-verify shape as (A).
  With (A), (B), (C) and the already-attributed s-captureJ 2 (row-24
  container flip, 08-05 handoff), every conservation row of the
  10:02-10:14 sweep is now accounted for. Byte-gate MISMATCH x3 stays
  as the handoff left it: s-captureG x2 is the PREMISE FALSIFIED entry
  further down (wrapper-retaining standalone), s-captureJ x1 the same
  row-24 pair.

- **(DONE 2026-08-05) — anchor `normalizeSessionStartText` to a block that IS a
  SessionStart hook output.** Grounding, measured (entry (C) above):
  the normalizer rewrote a quoted marker inside a teammate message's
  prose, silently altering conversation content CC sent. Impact here
  is cosmetic (one word inside a quotation) and the class is not:
  any text mentioning `SessionStart:resume hook success:` gets
  rewritten wherever it appears, including a user's own words.
  Design: require the block to BE the hook output — the marker at
  text start, or at the start of the `<system-reminder>` wrapper's
  inner text — rather than matching anywhere in it; the two other
  substitutions (`SESSION_START_ID_TAG`,
  `SESSION_START_LAST_ACTIVE_LINE`) get the same anchoring review in
  the same pass. Verifier, red-first: a bite with two blocks — a real
  SessionStart hook block (still normalized) and a prose block
  quoting the marker mid-sentence (must pass through untouched) —
  red against today's implementation on the second. proxy/** so it is
  deployment-coupled; row 3 answer expected NO state key and no freeze
  change, to be stated by the implementation.

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

- **GATE-RED CLOSED 2026-08-05 — all 40 conservation rows are now
  either exempt-with-verification or fixed at the source.** Measured
  on the two captures, replayed under their own gates:
  s-captureI **38 -> 0** violations, 38 exemptions
  (`fresh-session-sort:rewrite` 22 + `smoosh-split:declared-peel` 16),
  matching the triage's 22/16 split exactly. s-captureL **2 -> 0**
  with ZERO exemptions — the better outcome: anchoring
  `normalizeSessionStartText` stops the rewrite happening on quoted
  prose at all, so nothing needed excusing. An exemption there would
  have papered over a real fidelity bug.
  FOUR OF MY OWN DEFECTS, all silent (the code ran and returned
  plausible output), all found by measuring rather than reading:
  (1) the gate's units are UNWRAPPED while both extensions' predicates
  are defined over the WRAPPED `<system-reminder>` form — three
  separate bugs from this one confusion, now handled by carrying the
  peel's BLOCKS beside their hashes with the reason at the call site;
  (2) the F-side credited a fresh-session-sort rewrite to
  `smoosh-split:declared-peel` — an exemption ledger that mislabels
  WHY bytes were excused is barely better than a silent exemption;
  (3) `fresh-session-sort` declared stats only on the RELOCATION path,
  so the in-place sort branch rewrote blocks and declared nothing —
  18 of the 38 rows were that branch;
  (4) the composed peel/strip case needed the peel's verification to
  accept a product content-strip legitimately removed.
  DEVIATION from the booked design, with its reason: the entry said
  re-run `fixBlockText`, but that ends in `pinBlockContent`, which
  MUTATES the extension's module-level pin map — a checker must not
  edit the state of the thing it checks, mid-run. The pure half
  (`rewriteBlockText`) was extracted for the gate, so it still chains
  the extension's own logic rather than re-implementing the sort.
  ONE PRE-EXISTING TEST updated rather than worked around: it asserted
  the in-place branch emits NO stats, which was stricter than its own
  stated reason (no RELOCATE telemetry, since a relocation record buys
  a stability exemption). Verified directly that a rewrite-only
  declaration yields `null` from `freshSessionSortExemption`, so no
  stability exemption is widened.

- **(DONE 2026-08-05) — conservation gate: declared exemption for
  `fresh-session-sort`'s block rewrite.** Design settled by the
  triage above. Shape mirrors the existing clause-(d) peel exemption
  exactly (replay.mjs:1853 `smooshSplitPeelUnits` / :1927): the
  extension DECLARES its rewrites (`ctx.meta.freshSessionSortStats`
  with the count, same wiring as `smooshSplitStats` at
  replay.mjs:2310), and the gate VERIFIES the declaration by
  re-running fresh-session-sort's OWN exported `fixBlockText(
  getBlockType(t), t)` on the raw block and requiring the result
  present in F byte-identically — declaration alone never exempts.
  Restricted to blocks the extension actually touches
  (`isRelocatableBlock`); a rewrite of anything else stays a
  violation. Verifier, red-first: the bite asserts the 11 rows of
  s-captureI (requests 168,169,175,177,180,181,182,186,187,189,191)
  go from `lost`/`invented` to `conservationExemptions` — red against
  today's replay.mjs — plus a CONTROL asserting that a rewrite whose
  re-run does NOT reproduce the forwarded bytes still reports a
  violation (tamper one forwarded block in the fixture). tools/-only,
  not deployment-coupled.

- **(DONE 2026-08-05, as the peel/strip COMPOSITION) — conservation gate: declared exemption for
  `content-strip`.** Same shape, clause (c) widened. content-strip
  (order-wise ahead of the gate's view) declares the blocks it
  removed; the gate re-runs content-strip's OWN predicates
  (`isContinueTrailerBlock` / `isBookkeepingReminder`, which must be
  EXPORTED — they are module-private today, content-strip.mjs:14-31)
  against the raw unit and exempts only a unit those predicates
  accept. Note the composition the triage found: the unit reaching
  content-strip may be a smoosh-split PEEL product rather than a
  block CC sent, so the clause-(d) peel verification must treat a
  peeled unit that content-strip legitimately strips as accounted —
  i.e. the two exemptions compose, and the bite must cover the
  composed case, which is the ONLY case measured so far (8 of the 8
  rows). Verifier, red-first: the bite asserts the 8 rows at msg[6]
  of s-captureI become exemptions — red today — plus a CONTROL that a
  removed block matching NEITHER predicate still reports `lost`.
  tools/-only, not deployment-coupled. SEQUENCE: this one after the
  fresh-session-sort exemption, since both touch the same R-side loop.

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

- **ACCEPTED 2026-08-05 (operator decision, measured) — the 8-hex
  capture-key prefix already in published git history stays there. No
  history rewrite.**
  WHAT IS ACTUALLY EXPOSED, measured rather than estimated:
  - fork-main's WORKING TREE: **clean**. `absence-scan` over all 605
    tracked files reports clean; the raw-grep hits that remain are the
    synthetics the scanner knows (the fixture token, the test
    fixtures, the exemption regex itself).
  - fork-main's own COMMIT HISTORY: 21 distinct prefixes across the
    messages. Public, immutable.
  - the OPEN PR branches' commit messages, which live in upstream's
    `refs/pull/N/head`: **31 occurrences**, concentrated in three
    branches (pr/insertion-join-moves 15, pr/verification-tools 11,
    pr/insertion-normalization 5). The other four are clean.
  - upstream's `main`: **NOT exposed.** Both merged PRs (#274, #277)
    carry none of the class in message or added diff — checked, not
    assumed, and this was the fact that decided it.
  WHY ACCEPT RATHER THAN REMEDIATE, and the first reason alone is
  sufficient:
  (1) **Remediation is not available.** GitHub retains
    `refs/pull/N/head` objects after a force-push and after a PR
    closes — precedent already recorded in this repo (#294/#296). A
    fork-history rewrite would break every PR branch and every
    upstream ref while retracting nothing that has been fetched.
    There is no action whose outcome is "the bytes are gone".
  (2) **The residual value of the leaked bytes is near zero.** An
    8-hex prefix of a session UUID identifies a LOCAL Claude Code
    conversation on one machine. It is not a credential, it addresses
    no remote resource, and it authenticates nothing. It has worth
    only to someone who ALSO holds the corresponding capture — and
    captures are never published, which is the rule the whole
    hygiene apparatus exists to keep. Contrast the origin-IP
    precedent this repo's CLAUDE.md cites, where the leaked value WAS
    the attack surface and remediation meant rotating the host: here
    there is nothing to rotate and nothing the value unlocks.
  (3) The forward boundary is closed and measured: the scan now reads
    file CONTENTS across every text type, object KEY names, and
    COMMIT MESSAGES scoped to the range being pushed — 0 findings
    over 605 files, still red on an unseen real prefix.
  WHAT WOULD RE-OPEN THIS: a capture file becoming public (the prefix
  then links a comment to real prompt bytes), or upstream asking for
  the branches to be rewritten. Neither is true today.
  NOT DONE, deliberately: rewriting the three branches' commit
  messages. It would cost a force-push on each, break the review
  threads' commit links, and — per (1) — not retract anything.

- **RESOLVED 2026-08-05 — the push gate now sees source files, and the
  tree it guards is scrubbed. Both halves landed together, which was
  the whole point.**
  THE GAP, found by running the instrument against a known positive
  rather than by reading it: `--git-range` filtered candidates to
  `.json`/`.jsonl` BEFORE any class ran, so a capture identifier in a
  tracked `.mjs` or `.md` passed the push hook silently — exactly
  where the 2026-08-02 red-main incident put one. A planted UUID went
  RED in a `.json` and GREEN in a `.mjs`. The FILTER was the hole, not
  the class definitions.
  THE COUPLING, and why neither half could ship alone: widening the
  gate over an unscrubbed tree fires it on hundreds of pre-existing
  non-defects and trains the `--no-verify` reflex on the one boundary
  that matters; scrubbing without widening leaves the next addition
  unguarded. So: scrub first (e822458 + this commit), then widen.
  THE SCRUB. Each distinct real prefix maps to a stable synthetic
  token (`s-captureA`, `s-captureB`, …) applied everywhere, so two
  notes about the same capture still visibly refer to the same one. No
  mapping file — a committed synthetic-to-real table would undo the
  exercise. 42 files, 314 occurrences replaced.
  THE MEASUREMENT, pinned to refs because it was got wrong three times
  otherwise (see the correction note below):
  pre-scrub `b6017b8` = **430 matches across 49 files**, 97 distinct
  prefixes; post-scrub `e822458` = 116 across 8 files, all in the
  excluded set below.
  DELIBERATELY NOT SCRUBBED, each for a stated reason:
  `test/fixtures/harvested/LEDGER-*.json` (94) is the per-machine
  harvest watermark, allowlisted in the scanner's own code by operator
  ruling 2026-07-31 — and its entries are NOT bare prefixes at all:
  every one is a JSON key holding a FULL UUID, which the 8-hex pattern
  matches only by its head. Substituting the head alone would have
  left the real 28-hex tail in place beside a synthetic prefix — worse
  than a no-op. Two full-UUID citations in this file's own prose, and
  two ASSERTED test values, were handled individually.
  **CORRECTION, recorded because the shape repeats.** This entry
  carried three wrong exposure numbers in succession: 96 (one id
  counted, framed as the class), then 414 (an unanchored count that
  also matched the SAFE 12-hex form), then "four files / ~116" — the
  last measured against a tree a dispatched agent was committing to,
  WITHOUT PINNING A REF, so pre- and post-scrub numbers were compared
  as if they were the same tree. The agent pinned its refs and was
  right throughout; the dispatcher's corrections were the unreliable
  part. Rule earned: a measurement over a working tree another writer
  holds is quoted with the commit it was taken at, or it is not
  quoted.
  THE WIDENING, kept narrow on purpose. Source files get the
  short-key class and ONLY it. Widening the whole scan across source
  would drag the UUID and base64 classes over dozens of legitimate
  synthetic values — the fires-on-a-non-defect trap, one level up from
  the one being fixed. Measured false-fire rate after the scrub: **0
  findings over 545 tracked source files**, with the class still red
  on a real prefix. Two false fires were found and fixed in the
  predicate rather than papered over in the data: a bare
  `s-20240229` inside a grep pattern in prose, and the head of a full
  UUID, which belongs to the UUID class and was double-reporting.
  RESIDUE, named: the ids remain in immutable public history — this
  buys hygiene forward, not retraction — and the PR branches' own
  commit MESSAGES still carry prefixes that no push can retract.

- **DONE 2026-08-05 — the ledger's 94 session UUIDs are gone, and the
  scanner's KEY-POSITION blind spot that hid them is closed.** Operator
  GO on the recommendation; building it found the larger defect.
  WHAT WAS ACTUALLY WRONG, two independent things:
  (1) `harvest` indexed `ledger.keys` BY the capture key, so every
  entry was a full session id in a tracked public file. (2) The
  scanner could not see them: `strings()` yielded VALUES only, never
  object KEY NAMES. Measured — the identical UUID reports
  `capture-uuid` as a value and NOTHING as a key. A map keyed by the
  protected thing is an ordinary shape, so this was a general hole,
  not a quirk of one file.
  MY RECOMMENDATION WAS PARTLY WRONG and the record says so: I told
  the operator to retire the allowlist entry in the same commit.
  Retiring it turns the gate red on 95 `live-timestamp` findings from
  `lastHarvest`, which is legitimately what a watermark ledger
  contains. The entry stays; its JUSTIFICATION is narrowed to that one
  class. The old wording ("keyed by raw capture key BY DESIGN") is
  what let everyone, including its author, read it as blessing the
  identifiers.
  BUILT: `ledgerKey()` hashes to `k_<sha16>`, migrating at LOAD so
  watermarks survive with nobody running anything. Verified on the
  live file: 95 keys, all distinct under the map, 94 UUID-shaped -> 0,
  every watermark >= its previous value. Key findings are positional
  (`$.keys[#1]~key`) because the path would otherwise BE the key —
  the finding would have echoed the thing it exists to flag.
  NEARLY BROKE: `key` also feeds `sidToken()` for harvested FIXTURE
  FILENAMES. Hashing it there would have renamed every future fixture
  and silently split them from the existing ones; the raw capture key
  stays for that path.
  BLAST RADIUS, checked rather than recalled (operator asked): the
  ledger reached NO upstream PR. All 14 PRs ever opened list zero
  LEDGER files; every PR branch diffs zero against upstream/main; the
  file is absent from upstream/main. The fork-only convention held.
  The exposure was real but confined to fork-main, which is itself
  public.
  Red-first both halves: removing the key-yield turns the two scanner
  bites red; reverting `ledgerKey` to identity turns the ledger bites
  red. Suite 2089/2089.
  **FOLLOW-UP, same day — the residual named in the report is closed
  too.** The allowlist was PATH-wide: a file named in it was skipped
  entirely, so an exemption written about one class excused every
  class. That is how the ledger's identifiers sat behind an exemption
  whose stated reason was its timestamps — and it meant the one file
  whose exposure started this was the one file the scanner would not
  look at. Entries are `{pattern, classes}` now; the file is scanned
  and only the named classes are dropped. `isAllowlisted` narrowed to
  mean "exempt from EVERY class" and is consequently false for the
  ledger. Verified: the real ledger still exits 0 (its timestamps are
  excused), a UUID planted into it exits 2 with a positional path.
  Two consumer tests encoded the old semantics and were updated rather
  than worked around — one asserted that an allowlisted path is "not
  scanned", which was the defect stated as an expectation.

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

- **DONE 2026-08-05 (closed on measurement, step 0; ships with this entry's
  commit) — the `/resume` re-bill (matrix row 24): STEP 0 ANSWERED YES, the
  system layer usually breaks too, so the messages[0] pin is refused and the
  item closes without a build.** Measured corpus-wide (probe importing
  `conversationSubKey`/`systemPromptSubKey`, proven live on this entry's own
  named known positive — the 449-msg born-large conversation — after a first
  run returned zero on a reader-shape bug): 28 born-large conversation
  starts across all captures; at 24 of the 27 with an in-file comparand the
  SYSTEM layer broke across the boundary (row 24's own boundary among them),
  and in the cleanest same-thread subset (no first-block rotation, message
  count within a few percent) still 4 of 7. System renders before messages:
  at the typical boundary a messages-layer pin buys nothing. The
  recommendation below (do NOT build) is thereby measured, not argued; the
  class stays a CONTROLLED cost. Row 24 carries the assessment. Two
  follow-ons booked separately: the born-large census class, and the
  rotated-identity born-large population (20 of 28, repeating ~+2,040-char
  system delta) that is NOT resume-shaped and deserves its own name.
  Original entry kept below for the record.
  **(superseded) READY — the `/resume` re-bill (matrix row 24): pick up where
  the row's
  named missing evidence stops, and decide a compromise.** Operator ask,
  2026-08-05. Not a fresh investigation: row 24 already measured the class
  (~1.19M tokens across one boundary, `cache_read=0` on the first resumed
  request, TTL expiry ruled out, resuming FASTER cannot help) and graded it
  OPEN AND PROMISING — 98% of the resumed content is byte-identical to the
  pre-exit array, and the index-0 divergence is a `<system-reminder>` block
  carrying the CLAUDE.md corpus snapshot, i.e. the volatile-reminder class rows
  1 and 23 already mitigate. Still live and current rather than historical:
  the cold ledger records `2026-08-05 17:22:36Z 408k CONTROLLED(resume)` for
  the operator's own session today.
  **STEP 0, ADDED 2026-08-05 night, and it may close this item without any
  build: does the SYSTEM layer break on a resume too?** On the one boundary
  row 24 measured in depth, all three cache layers had changed — system prompt
  11,102 -> 10,090 chars (a whole `# Communicating with the user` section
  absent), `messages[0]`, and the message count 966 -> 938. System renders
  BEFORE messages, so on that boundary a messages-layer pin buys exactly
  NOTHING. Whether that is typical is unmeasured, and it is cheap to measure:
  compare system-prompt hashes across resume boundaries in the existing
  captures (a rebuilt array's signature is a conversation whose FIRST request
  is already large — `conversationSubKey`, imported, never re-derived). If the
  system layer usually breaks too, this item closes on measurement.
  RECOMMENDATION as of tonight, stated so the next session does not re-derive
  it: do NOT build the messages[0] pin. Three reasons beyond step 0. The
  announcement cannot actually supersede — the stale block's bytes ARE the
  cache key, so it cannot be deleted and the model sees both copies, leaving a
  prose marker as the only lever, and prose is what the re-anchor hook exists
  because it decays. The corpus is authoritative INSTRUCTION text, so a rule
  edited to stop a behaviour still says do it in the stale copy: a correctness
  cost paid for a cache cost, against this repo's own ordering. And a resume is
  a CONTROLLED cost — `bust-triage` classifies it that way deliberately — so
  the machinery it needs (a key surviving a rebuilt messages[0], persisted
  state, a delta computation) ranks below the preventable classes still open.
  An earlier version of this entry recommended the compromise; that
  recommendation underweighted the system layer, which is the same error as
  reading an index-0 divergence without checking whether tools had already
  changed.

  **The blocker to solve FIRST, and it is new — it comes from building the
  relocation memory today.** Every stateful extension keys on
  `conversationSubKey(messages)`, a hash of `messages[0]`. A resume REBUILDS
  `messages[0]`, so the resumed session is a different conversation to all of
  them by construction — there is no key under which the pre-exit form could
  be looked up, which is why "pin messages[0] to its first-seen form" is not
  yet implementable however desirable it is. So step 1 is the KEY question,
  not the pinning question: does any identity survive a resume boundary
  (session-id header + system-prompt sub-key without the conversation
  sub-key? a content overlap test against recent conversations?), and what
  does each candidate collide with — the co-tenant traffic that forced the
  conversation sub-key in the first place is the thing to re-check, since
  dropping it is what row 14 was about.
  Step 2 is row 24's own named missing evidence: where the SECOND divergence
  lands once `messages[0]` is held (the 49 dropped and 18 new messages must be
  located — tail, scattered, or a compaction boundary), measured with today's
  instruments, which did not exist when the row was written: the stability
  violation's `prefixAboveMessages` says whether a message-layer fix would
  even be billable, and the row's own note that the SYSTEM prompt also
  changed means the messages half may be worth nothing until the system half
  is answered too.
  Step 3 is the compromise itself, and one half of it is an OPERATOR CALL,
  not a measurement: re-serving a stale corpus snapshot after the operator has
  deliberately edited the rules mid-session. The in-band announcement pattern
  (rows 1/23) can carry the delta so the model still reads the newer text —
  that is the shape of the compromise, and whether it is acceptable for
  authoritative instruction text is the operator's to settle.
  Done when: the key question has a measured answer, the second divergence has
  an index and a re-billed size, and the compromise is either designed or
  refused with its reason. Evidence pointer, with its expiry: today's capture
  for session `03d45c17` holds exactly one born-large conversation
  (`conversationSubKey 9ea7aead0d1a7452`, n=2, 15:33:17Z, 449 messages) — the
  rebuilt-array signature — while the 17:22:36Z 408k event's own request was
  NOT located in it, which is itself the first thing to reconcile. Captures
  rotate oldest-mtime-first; this one is ~320 MB and current.

- **READY — born-large conversation starts become a census class.** The
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

- **DONE 2026-08-06 (c53bbae) — `bust-triage --at <stamp>` substituted silently when the stamp
  names a CONTROLLED event (tools/-only).** Found 2026-08-05 by using it: the
  DEFAULT path prints the note it should — "the newest cold event is
  2026-08-05 17:22:36Z CONTROLLED(resume), 408k re-written … Cannot triage …
  Falling back to the newest BUST" — and `--at 2026-08-05T17:22:36Z` prints
  NOTHING and answers about the 12:20:13Z `messages_changed` bust instead.
  That is the exact failure `fallbackNote`'s own docstring names ("someone
  sees a ❄ token, runs the tool, and gets a verdict about a different, older
  event with nothing marking the substitution") — the guard exists, and the
  `--at` path routes around it, which is worse than not having it: the reader
  believes the verdict describes the event they asked about.
  Design: `--at` resolves against ALL cold events, not just busts; when the
  resolved event is controlled, emit the same note (naming the requested
  stamp, not only "the newest") before any fallback, and when there is no
  bust at or before the stamp say so rather than defaulting to the newest.
  Verifier, red-first: a bite driving `--at` with a controlled stamp against
  a synthetic ledger must assert the note's presence and the named stamp —
  red today, since the path prints nothing; plus a control asserting the
  default path's note is unchanged.

- **READY — the byte-gate's MISMATCH rows have no way OUT of the census, so
  the sweep cannot persist them (tools/-only).** Surfaced by the row-persistence
  lane as a returned question, not filled by it: the six other per-gate row
  arrays now ride the status file, but the byte gate is a SECOND child
  (`reminder-migration-census.mjs`) whose `--json` emit never includes the
  per-row `details` array it builds internally — `--verbose` adds
  volatileRows/duplicateRows, neither of which is the MISMATCH set. Its emit
  carries an "ADDITIVE ONLY" comment written for gate-live's benefit, and its
  richest row set never entered that contract: orphan telemetry one layer in.
  Decision, so this is dispatchable as written: expose a MISMATCH-FILTERED
  slice (never raw `details`, which is unbounded and includes EXACT rows),
  cap it CENSUS-side at 200 with an explicit `detailsTruncated: <total>`
  beside it — the producer owns its own bound — and have `summarise()` copy
  it verbatim into `byteGateMismatchRows` through the existing `persistRows`,
  which already gives it the three answers. Verifier, red-first: a census bite
  asserting a MISMATCH corpus emits the slice (red today — no such key), plus
  the truncation control, plus a gate-live bite that the field lands on the row.

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

- **DONE 2026-08-05 (c6a6e31, c0a525c, b9c5a28) — the daily sweep persists
  ROWS, not just counts.** Eight fields, taken verbatim from the child's
  parsed JSON with no reshaping: stability, stability-exempt, conservation,
  conservation-exempt, sequence, order, absorption-miss and
  reloc-departure. Capped at 200/field/capture with an explicit
  `<field>Truncated: <total>` beside it, and all eight go through one
  recorder that keeps the three answers — absent is `null`, empty is a
  measured zero. `absorptionMissRows` moved onto it too: it shipped first
  and shipped with `?? []`, so an absent field read as a measured zero in
  the one row a reader consults to decide whether a class is live.
  VERIFIED against a real sweep, not only synthetics (17:34Z run, 42
  captures): every row carries the arrays, none null, and the live
  stability row carries `prefixAboveMessages` — which also closed the
  "field names read, not exercised" residue the building lane reported.
  Measured growth: ~113 KB against 104 KB, ~8%. RESIDUAL, split off into
  its own entry above: byte-gate MISMATCH rows, which no child exposes as
  a copyable array.
  Original text follows for the evidence trail.
  AMENDED 2026-08-05 night: STABILITY rows belong in the list too — the
  original enumeration named conservation, byte-gate, order, sequence and
  census and skipped them, and they now carry the field that says what a
  violation COST (`prefixAboveMessages`, row 25). Today that field exists
  only in the replay JSON the sweep throws away, so the status file still
  shows `stability: 1` and the next reader re-derives the cost by hand
  over a multi-hundred-MB capture — which is the exact loss this item
  exists to stop, and it has now happened twice.
  Grounding: the finding above, plus the precedent that just shipped —
  the absorption check's rows are now written to the status file
  (`gate-live.mjs`, `row.absorptionMissRows`) precisely because their
  absence forced an 8 GB re-read to answer a question the sweep had
  already answered once. Every other per-row gate still discards:
  conservation violations and exemptions, byte-gate MISMATCH rows,
  order and sequence violations, census findings. Each is a list the
  sweep computes and throws away, and each is re-derivable only while
  the capture still exists — which the finding above prices at hours.
  Design: same shape as `absorptionMissRows`, one field per gate,
  written from the child's parsed JSON with NO reshaping. Bound it
  per gate per capture (200 rows is above every count observed; the
  38-row gate-red is the largest so far) and on truncation write an
  explicit `truncated: <n>` beside the array — a silently short list
  is the failure this item exists to prevent, one level up.
  Verifier, red-first: a bite asserting a sweep row carries the
  conservation rows for a capture whose replay reports them, red
  against today's `summarise*` which keep only counts; plus a control
  asserting the truncation marker appears when the cap is crossed.
  NOT in scope: changing what any gate COMPUTES, or the sweep's
  pass/fail. This is persistence only.

- **DONE 2026-08-05 (04ed3c9) — the canonical re-serve normalizes its
  CONTAINER to the wire's current one (proxy/**, deployed).** Closed
  2026-08-05 night. The closure is right — the work shipped as 04ed3c9 —
  but the ROUTE to it, as first written here, was not, and the correction
  matters more than the closure: this entry's own body cites NO commit ref.
  `04ed3c9` appears at the first line of the NEXT entry, which was already
  graded DONE, and the first version of this note attributed it across that
  boundary — the same-entry/cross-entry limit `tools/backlog-lint.mjs`
  documents as deliberate, walked into while reading. The lint was clean on
  this entry for a simpler reason than the one first recorded: it carries no
  resolution marker of any kind. Caught by the dispatched lane, which
  refused to build a check on the premise and halted instead of widening the
  entry boundary to make its known-positive fire — the right call, and the
  reason no `GRADE-VS-COMMIT` lane exists.
  The design below is what shipped; it is kept for the evidence trail.** This is the
  349k bust's actual fix and it is narrower than the row-24 message-
  level pin. Grounding, all measured today (matrix, Row 4 datapoint
  2026-08-05): `resetKeepingPins`/`findJoinMoves` substitute
  `priorCanonical[ci].m` verbatim, that stored message is CC's
  FIRST-SEEN form, and CC's first-seen form for a `role:"system"`
  harness message is frequently the block-array wrapper it uses to
  carry a `cache_control` breakpoint — which it then drops. Measured
  instance: first seen n=194 as `array[1] cc={"ephemeral","1h"}`,
  bare string from n=195 for 26 requests, re-served as an array at
  n=221, 349,004 tokens.
  Design: at substitution time, re-serve the canonical's TEXT in the
  container the CURRENT wire message uses — string stays string,
  array stays array — rather than the container that was stored.
  Text identity is untouched, so the safety argument is unchanged
  (same bytes, same slot, same count, same roles); only the envelope
  follows the wire. Scope it to the `role:"system"` single-text-block
  case that is measured, and fail closed to today's behaviour on
  anything else — a multi-block message or a container change that
  also changes text is NOT this class.
  CALL SITES, located 2026-08-05 (read, not yet exercised — the
  exercise is the bite below): the verbatim re-serve is exactly two
  lines, `insertion-normalization.mjs:941` (join-moves,
  `out[mv.mergedIndex] = priorCanonical[mv.ci].m`) and `:942`
  (re-fires, `out[rf.index] = priorCanonical[rf.ci].m`). The stored
  `.m` is written by `buildPinEntry` (:620-622) as
  `stripAllCacheControl(msg)` over CC's RAW first-seen message, so
  the container stored is whichever one CC happened to use first —
  the array, in the measured instance, because that is how CC carries
  a breakpoint.
  WHY THIS IS A FORWARDING BUG AND NOT AN IDENTITY ONE, and it is the
  fact that makes the fix small: `canonicalMessageShape` (:370-379)
  ALREADY treats a bare string and a single text block as the same
  identity, which is why the entry matched across the flip at all.
  Identity is container-blind today; only the forwarded bytes are
  not. And the PIN path already does the right thing — line 925 calls
  `pinnedForwardForm(stored, messages[e.index])`, i.e. it consults
  the live wire message before deciding what to send (:633-637).
  The move/re-fire path at 941-942 is the outlier that consults
  nothing. State the fix that way when building it: give 941-942 the
  wire-consulting form the pin path already has.
  SEQUENCING against the narrow container normalisation item further
  down: they are the same mechanism seen from two sides (CC's flip vs
  our stored flip) and both are proxy/**. First read of the code says
  they do NOT dissolve into one another and the sequencing note
  overstated it — this item fixes what WE re-serve (two lines,
  container-blind identity already in place), the row-24 item
  normalizes what CC sends, which rewrites pass-through bytes and is
  the larger behaviour change. A row-24 normalisation applied to both
  the stored and the live view would also cover this class as a side
  effect, so the dissolve direction is one-way and the cheap item is
  this one. That reading is UNEXERCISED: it rests on the call sites
  above, not on a replay, and the old-vs-new corpus check below is
  what settles it.
  Verifier, red-first: a bite that drives the measured sequence —
  first request carries the message as `array[1]` with a
  `cache_control`, later requests as a bare string, then a join-move
  fires — and asserts the forwarded message is a STRING. Red against
  today's implementation (it forwards the array). Plus a CONTROL
  where the wire's current form IS an array, asserting the array is
  still forwarded. Corpus check: replay s-captureQ old-vs-new and
  require the ONLY delta to be at n=221.

- **(DONE 2026-08-05 — shipped 12d7dd6, then CLASSIFIED 383d8a5, and the
  class it found is FIXED at 04ed3c9) — a gate that asks whether a
  mitigation ABSORBED, not just whether it ran.**
  WHAT THE FIRST CORPUS-WIDE MEASUREMENT SAID, and it is a
  single-class population: **41 of 41 absorption-miss rows are
  CONTAINER** — a stale block-array-vs-string wrapper — across 9
  captures, with every other class of the 8-way ladder at ZERO
  (ABSENT, IDENTICAL, ROLE, TEXT, CACHE-CONTROL, BLOCKS, OTHER all 0).
  The `ours` subset, 33 rows, has the identical shape. So the answer
  to "are the 40 one mechanism or several?" is ONE mechanism, and it
  is the one the 349k bust named.
  `IDENTICAL: 0` is the instrument's own self-check: not one reported
  divergence turned out to be a false alarm at the index it named.
  COVERAGE, stated rather than summed: 41/50 rows overall and 33/40
  `ours`, because 3 captures rotated off disk between the 12:20Z sweep
  and the run. The measured total EXCEEDS the 39/31 ceiling that
  arithmetic predicted, and the excess is isolated rather than waved
  at: 8 of 9 captures match their sweep counts exactly and one grew
  from 9 to 11 rows (both new rows CONTAINER, both ours) because
  captures are live. +2/+2 accounts for the whole delta.
  THE FIX FOLLOWED THE MEASUREMENT, same day: 04ed3c9 makes the
  re-serve emit the container the entry was LAST SEEN in. Post-fix
  re-run of the same corpus is the after-half of the comparison; on
  the known-positive capture it is already CONTAINER 2 -> 0, with one
  row reclassifying to TEXT thirteen messages later and attributed to
  CC's own input (`inDiv` 369 < `fwdDiv` 373).
  RESIDUE, named: single-class at n=41 is established FOR THIS
  CORPUS, not as a universal — whether other classes exist elsewhere
  is the next corpus's question, and the per-capita RATE is still
  unmeasured. And the `ours` split is a floor, not a count (see the
  under-attribution finding above).
  **THE AFTER-HALF, measured over the same 9 captures under 04ed3c9,
  and the row-level join is what makes it a verdict rather than a
  tally.** Totals 41 -> 30 rows, 33 -> 24 ours, CONTAINER 41 -> 1.
  Joining pre to post by request number: **15 rows GONE, 26 MOVED TO A
  LATER INDEX, 0 reclassified AT THE SAME INDEX**, plus 4 new rows on
  the one capture that grew between the two runs. The zero is the
  finding: not one slot came back as "right container, still wrong
  bytes at that index", which is the shape a half-fix would have. The
  fix repaired every instance it touched.
  IT DID NOT REMOVE THE MISSES, AND THAT IS THE HONEST HEADLINE: 30
  remain, 24 of them ours, now classifying as TEXT 15 and
  CACHE-CONTROL 14 — two classes that scored ZERO before, because the
  container divergence was the FIRST one and masked everything behind
  it. Every "moved later" row is a prefix that now survives further
  and then diverges for a different reason. So the corpus has not got
  better by 11 rows; it has become legible for the first time, and
  the next layer is a marker-placement class (CACHE-CONTROL) that no
  one has looked at yet.
  ONE CONTAINER ROW SURVIVES (n=334 of the 597 MB capture,
  CONTAINER@342 -> CONTAINER@346): a SECOND container divergence
  sitting behind the first, at a different index, so it is not the
  fixed one reappearing. It is presumably one of the shapes
  `reserveForward` fails closed on — multi-block, or a role outside
  the carrier class. Named, not chased.
  METHOD CAVEAT, stated because it bounds the comparison: captures
  are live and one of the nine grew between the before and after
  runs, so the two populations are not measured over byte-identical
  inputs. The per-request join is immune to that (a row is matched by
  its own request number, and growth shows up as `new`), which is why
  the join is the evidence here and the totals are not.

- **(DONE, see above) — a gate that asks whether a mitigation ABSORBED, not just
  whether it ran.** Grounding, and it is the reason the 349k bust
  reached a human: the capture replays exit 0 on all five gates and
  every verdict is correct. Stability asks whether OUR output
  diverged EARLIER than CC's input; CC diverged at the same logical
  slot, so green is the right answer. Nothing asks the question that
  mattered — insertion-normalization reported `movedFresh:2`, i.e.
  it RECOGNIZED both migrations, and the forwarded prefix diverged at
  the very slot it had just substituted. "The mitigation ran" and
  "the mitigation absorbed" came apart, which is the same split the
  `movedFresh`/`movedRefires` work was minted for, one level up.
  Design: a sixth per-pair check — when an entry reports a fresh
  absorption (`movedFresh > 0`, or a description absorb, or an
  oscillation absorption) AND the forwarded pair still diverges at or
  before the absorbed index, that is an ABSORPTION MISS. Report it
  with the absorbed index, the forwarded divergence index, and
  whether the raw pair diverged there too — the three numbers that
  turned this bust from a puzzle into a mechanism. It is a REPORT
  first, not a gate: measure its corpus-wide rate before deciding
  whether it may block, precisely because a check that fires on a
  non-defect trains the reader to discount red.
  Verifier, red-first: run it over s-captureQ and require exactly one
  absorption-miss row at n=221 (absorbed index 360, forwarded
  divergence 360) — the current code reports nothing, so the bite is
  red by construction; plus a CONTROL over a capture where an absorb
  fires and the prefix holds (the description absorb on s-captureJ
  n=1202), asserting zero rows. tools/-only, not deployment-coupled,
  and it should ride gate-live's daily sweep as a `absorptionMisses`
  summary alongside `byteGate`.

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

- **(SUPERSEDED by the recurrence entry above — its fix was
  incomplete) SOLVED INCIDENT 2026-08-05 (root cause found same day, fixed in
  the commit this entry rides in) — the .git/config corruption was
  the suite hook running under git's HOOK ENVIRONMENT from a
  worktree.** Mechanism, fully reproduced: git exports GIT_DIR into
  pre-push hooks — RELATIVE ".git" for main-tree pushes, ABSOLUTE
  for worktree pushes. The suite's scratch-repo test helpers spawn
  git with cwd=tempdir but inherited env, so under the worktree
  hook every `git init`/`git config` in them resolved to the REAL
  shared git dir: `git init` on a git-dir not named ".git" writes
  core.bare=true (bare-ness is guessed from the dir name), and the
  fixture identity writes followed. Main-tree pushes were immune
  because the relative GIT_DIR re-resolves inside each test's temp
  cwd — which is why the corruption appeared only after the
  dispatcher's worktree-reach fix made the suite run on a worktree
  push at all (my own dry-run at 10:56:09; config mtime 10:56:10).
  Repro: `GIT_DIR=$(git rev-parse --absolute-git-dir) node --test
  test/absence-scan.test.mjs` from a worktree — corrupts; measured.
  Fix: tools/git-hooks/pre-push unsets `git rev-parse
  --local-env-vars` before npm test — same repro against the fixed
  hook leaves the config byte-identical; measured. The 10:51
  FETCH_HEAD/ORIG_HEAD was dot apply's own refresh pull, benign and
  unrelated. Standing lesson for ANY runner of this suite from a git
  hook: sanitize the hook env first — and the absence-scan split
  entry below now carries the test-layer hardening so upstream
  consumers are safe regardless of their hook context.
  Original investigation record follows.

- **(superseded by the SOLVED entry above) OPEN INCIDENT 2026-08-05
  ~10:51-10:56 — an external writer
  corrupted this repo's .git/config; repaired, attribution needs the
  concurrent sessions' transcripts.** Observed: `core.bare=true` +
  `user.name=t` + `user.email=t@t` written into the LOCAL config
  (config mtime 10:56:10), breaking all git work-tree operations and
  mis-authoring one commit as "t" (b81e80a — re-authored to 3261ee3
  and force-with-lease pushed same hour). Also unexplained:
  FETCH_HEAD + ORIG_HEAD written 10:51 by a fetch/pull this session
  never ran. `.git/description` and `HEAD` untouched since July, so
  no reinit — direct config writes. The t/t@t/bare triple is exactly
  the scratch-repo fixture convention of BOTH test rigs on this
  machine. EXONERATED BY EXPERIMENT, both re-run against a config
  md5 before/after: (1) the fork suite's two t@t-writing test files
  executed inside the wt-g2 worktree — config byte-identical; (2)
  the dotfiles pre-push battery executed with cwd in this repo —
  config byte-identical.
  UPDATE, same day: the 10:51 half is SOLVED — the operator ran
  `./dot apply`, whose refresh step runs `git -C <this repo> pull
  --ff-only` by design (dot: step_refresh_verified_clones), exactly
  the FETCH_HEAD/ORIG_HEAD fingerprint. Benign. The 10:56 config
  write stays open, with the exoneration list now exhaustive for
  locally executable mechanisms: fork suite files (read + measured,
  helpers temp-bound), dotfiles pre-push battery (measured, twice,
  both cwds), and doctor's FULL 18-hook bite-test loop replicated
  with cwd in this repo (all CLEAN against a config md5) — so `dot
  apply`'s doctor pass does not reproduce it either, on current
  code. Unexecutable-from-here candidates remain: the clippy
  session's live worktree-config probes (mid-edit on exactly that
  recipe at 10:55), and manual shell commands. Next diagnostics, in
  order: the operator's fish `history --show-time` for 10:51-10:56,
  and the clippy session's transcript. Mechanization candidate once
  attributed: doctor fail on a local user.name/user.email in this
  repo (global identity is the convention here; a local one is
  always leakage).

## Upstream PR round — booked 2026-08-05; the round below is CLOSED,
## current state is the first entry

**STATE AS OF 2026-08-05 21:00Z, read from the API rather than from this
file's history — the entries below record what WE did, not what upstream
then did with it, and four of them have since merged.**

| PR | state | ball |
|---|---|---|
| #275 #279 #280 #282 | **MERGED** 15:11–15:31Z | done |
| #272 | **APPROVED, mergeStateStatus CLEAN**, rebased onto `39570db` tonight | upstream |
| #276 | answered tonight; upstream replied accepting both points | upstream |
| #306 #307 | open, no comments, REVIEW_REQUIRED | upstream |
| #273 #281 | REVIEW_REQUIRED, BLOCKED behind #272 | upstream |
| #278 | REVIEW_REQUIRED, **mergeStateStatus DIRTY** | **US — entry below** |
| #295 | CLOSED tonight, premise falsified | done |

- **READY (operator-side, dotfiles) — a worktree without `node_modules`
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

- **READY — #278 (`pr/output-guard`) is CONFLICTING and needs the same
  rebase #272 just had.** Measured 2026-08-05 21:00Z: `mergeStateStatus:
  DIRTY`, last comment ours from 07-30, so nothing is owed in the thread —
  only the merge state blocks it. Upstream's contributor rule (their tracked
  CLAUDE.md, which binds on upstream-facing branches) is rebase-against-
  current-main, never cherry-pick the conflict away, and the runbook's
  rebase-policy step covers it.
  Design, decision-complete: worktree at `/home/g/dev/vendor/cache-fix-pr7`
  (already provisioned, already on `pr/output-guard` at `e4bd379`;
  `node_modules` was missing and was symlinked 2026-08-05 — along with
  pr2, pr5 and pr6, which had the same gap — so the suite runs there now:
  `test/output-guard.test.mjs` 15/15, and `hpagent` resolves. That gap is
  the documented 900 s false hang, and four of fifteen worktrees carried
  it). Then `git rebase upstream/main`, full suite in the worktree, the
  runbook's
  hygiene greps scoped to THIS round's commits, `git push
  --force-with-lease`, then the push-announcement comment with real test
  counts and the attribution footer.
  Known in advance, so it does not surprise the next session: the push-side
  leak scan will block the force-push by re-flagging already-public commit
  messages — that is the separate READY item above, and the check is
  patch-id equivalence against the pre-rebase commits before overriding.
  Done when #278 reports CLEAN and the comment is posted.

Procedure for every item: docs/runbooks/upstream-pr-round.md (worktree
setup, hygiene gate, comment form, the box). Per-PR state and full
review gists: docs/audits/upstream-pr-sweep-2026-08-05.md. Upstream's
own landing order is in issue #284 (2026-08-04 comment): #272 first
("highest-leverage thing on your side of the board"), then the
absence-scan split (unblocks their #302), then #279/#282/#275/#280,
then the queued ones. Work the items in that order.

- **DONE 2026-08-05 — #272 (c489f29, pushed, commented), #282
  (9474a39, pushed, commented), #276 (1ccd191 + f80501f, pushed,
  commented), #292 (d667df9 on fork-main, commented).** Four of the
  nine. Notes that outlive the items: (1) the reviewer's named lists
  UNDERCOUNTED on both scrub items — 5 named vs 11 actual on #272,
  9 files named vs 6 further captures on #276 — because a
  diff-scoped read reaches only what the slice changed; the
  corpus-wide bare-shape grep is what found the rest. (2) Both scrub
  branches fail `npm test` on `proxy-read-dedupe.test.mjs:505`
  (extension-order adjacency) and it is a genuine branch-base
  artifact — VERIFIED by checking the base commit out into a scratch
  worktree and running the suite there, not by trusting the report;
  both pushes were `--no-verify` with that stated. (3) #282's branch
  fails one wrapper test under this machine's ambient
  `NO_PROXY`/`HTTPS_PROXY` — the machine routes through the proxy
  this repo builds — and passes 11/11 with them cleared; fork-main's
  copy of that test is no longer env-sensitive, so porting the fix
  onto the branch is a candidate if the reviewer trips on it.
  **#275 also DONE (8a47da4), inline rather than dispatched — the only
  CONFLICTING one, and a rebase with real conflicts is not work for a
  cheaper tier.** Three notes from it: (1) the rebase DROPPED the
  header-forwarding commit as already-applied upstream, so that stack
  is gone and the branch is one commit on upstream/main — the
  "CONFLICTING" state was mostly staleness, not divergence; (2) the
  /health finding is worse than the review framed it — of ~117
  `CACHE_FIX_*` names the code reads, several carry an OAuth client
  id, a token endpoint, a credentials path and the operator's
  filesystem layout, so the fix is an allowlist of value-bearing
  GATES with NAME-ONLY as the default, which makes a variable added
  tomorrow safe without anyone remembering the file exists; measured
  cost zero, all eleven production gates keep their values; (3) the
  red-first arrangement had a weaker variant available that would
  have read identically in a report — helper-level assertions pass
  with the call sites reverted — so the suite drives `ext.onRequest`
  end to end and stats the disk.
  **ROUND CLOSED 2026-08-05 — all nine items resolved.** Landed:
  #272, #276, #282, #292, #275, #279, #280, and the absence-scan split
  as **PR #306**. #295 is DROPPED (premise falsified — see its entry).
  #280 note worth keeping: the content-minimization went WIDER than
  its three named categories, because the head-5/tail-3 message
  windows stored real message bytes and the old truncation capped only
  `.text` — `tool_use.input` and `tool_result.content` went to disk
  uncapped on every changed request. The design's three categories
  would have left "prompt text does not rest on disk" false by
  construction. Verified by planting a sentinel in four places at once
  and grepping every written file: 0 hits in default mode, 25 with
  `CACHE_FIX_PREFIXDIFF_CONTENT=1` — the second number is what makes
  the first mean anything, and both were re-measured by the dispatcher
  independently of the shipped test.
  TWO THINGS THE ROUND TURNED UP THAT OUTLIVE IT:
  (1) **Upstream's own tree still carries the real capture content** in
  `test/fixtures/cc-transcript-shape-snapshot.json` — measured, not
  inferred: the scanner returns 10 findings / exit 2 against their
  current main. Reported on #292 with the count, and the standing offer
  to send our rebuilt fixture as its own PR is theirs to accept.
  (2) **A tool's suite must not assert things about its HOST repo's
  content.** Fork-main's absence-scan suite carries two such guards
  (the transcript fixture is clean; every source-tree UUID is on a
  roster). Ported verbatim into the standalone cut they went red on
  upstream's data — correctly, but unlandably. Dropped from the port
  with the reason written in the file. The general shape: a bite goes
  red on the TOOL's defects; a bite that also goes red on its host's
  data cannot be adopted, and softening it to pass is worse than
  removing it.

- **(DONE, see above) — #272: scrub the 5 residual capture-id comment strings.**
  On branch `pr/insertion-normalization`: the reviewer's 08-01 comment
  names 5 comment-only occurrences of the real capture session id —
  `insertion-normalization.mjs:616,659`,
  `test/insertion-merge-suppression.test.mjs:2`,
  `test/insertion-suppression.test.mjs:7,267` (line numbers as of
  head `720ecb46`; re-locate by grep, not by line). Replace each with
  the synthetic token the branch already uses (`s-4b6a435234bf`).
  Verifier: grep for the real id over the whole branch returns zero;
  full suite green in the worktree. Done: pushed + PR comment;
  reviewer restarts full review from top per their comment.

- **(DONE 2026-08-05, d667df9 + issue comment) — #292: synthesize cc-transcript-shape-snapshot.json.**
  The tracked fixture carries 6 real UUIDs, a 448-char thinking
  signature, a `$.source` path, and 2,305 chars of verbatim
  third-party GitHub comments with 3 real logins (confirmed by
  upstream 08-03), plus a `_note` falsely claiming it is redacted.
  Rebuild it structure-preserving with every value from known-safe
  generators (the redaction-by-scrub vs build-from-safe-parts
  asymmetry: build, don't scrub), drop the false `_note`, remove the
  fixture's allowlist entry in the absence-scan, and reply on #292.
  Verifier: fork-main's content-scanning absence-scan green WITHOUT
  the allowlist entry; every test consuming the fixture's shape still
  green. Sequenced BEFORE the split item below so the standalone scan
  ships without the entry.

- **(DONE 2026-08-05 — PR #306 opened) — absence-scan split: standalone PR (unblocks upstream
  #302; asked twice, #284 + #292).** New branch from `upstream/main`
  carrying only `tools/absence-scan.mjs` + its test, in the
  content-scanning form fork-main ships (post-770e915), with the two
  boundary conditions fixed exactly as upstream named them: (1)
  `CORPUS_SCOPE` — upstream has no `test/fixtures/harvested/`; the
  scan must treat that scope as empty-and-passing when the directory
  is absent, with a test pinning it; (2) no
  cc-transcript-shape-snapshot.json allowlist entry (see the #292
  item's sequencing); (3) the test file's scratch-repo helpers
  scrub git's hook environment in their spawn env
  (`GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` undefined) — an
  upstream consumer running this suite from a git hook otherwise
  corrupts their real repo (the SOLVED incident above; reproduced,
  not theoretical). Same hardening goes to fork-main's own copies of
  absence-scan.test.mjs and hook-worktree-edit-guard.test.mjs when
  this ships. Verifier: the scan's own suite green on the cut
  branch against upstream/main; a planted violation goes red
  (instrument known-positive); the incident's GIT_DIR repro run
  against the hardened tests leaves the enclosing repo's config
  byte-identical. Done: PR opened as the standalone,
  `Ref #302` + `Ref #292` in the body, generated-with footer.

- **(DONE 2026-08-05, 1ccd191 + f80501f) — #276: widen the branch's absence-scan + clean the 9
  files.** `pr/verification-tools` still carries the filename-only
  scan; the reviewer holds review on #276 AND #272 until it scans
  tracked-file CONTENTS and is re-run. Port fork-main's
  content-scanning version (and its 770e915-class scrubs) onto the
  branch; the reviewer's 08-01 comment lists 9 branch files carrying
  the real id in comments. Verifier: the widened scan green on the
  branch; grep for the real id returns zero. Done: pushed + PR
  comment answering the hold.

- **(DONE 2026-08-05, 0b67dbf pushed + commented) — #279: split the sanitize planner by mode.** Design
  settled from the review (full text on the PR, round 1, 07-31): the
  by-shape protection of answered tool-continuations applies to the
  v1 omitted-thinking path ONLY; the `v2StripSigned` path keeps its
  directive contract — strip signed thinking from ALL prior assistant
  turns, preserve only the latest active continuation
  (proxy-thinking-block-sanitize-v2.md:58-67,153-159). Verifier: the
  reviewer's own repro flips — `planSanitize([answered continuation,
  later assistant], {v2StripSigned:true})` strips the prior signed
  block (droppedV2:1, matching main) — while the PR's new v1
  byte-stability regression test stays green; both suites green.
  Done: pushed + PR comment. #284 calls this one of the two "closest
  to landing."

- **(DONE 2026-08-05, 9474a39) — #282: alarm predicate suppresses only count-only
  INCREASES.** `upstream-change-detection.mjs:469` (head `de9ab87e`)
  currently suppresses every count-only diff; a DECREASE
  (compaction/truncation/upstream rewrite) must still alarm. Add the
  increase-only condition plus a regression test for the decrease
  case. Verifier: new test red against the branch head, green after;
  suite green. Done: pushed + PR comment. The other "closest to
  landing" per #284.

- **(DONE 2026-08-05, 8a47da4 force-pushed + commented) — #275: capture-file hardening + /health env allowlist +
  rebase.** Three parts, one branch (`pr/request-capture`, the only
  CONFLICTING one): (1) capture dir 0700, capture files 0600 via the
  repo's own write-owner-only helpers, applied BEFORE first byte is
  written (pre-write, per the review); (2) /health and boot records
  stop dumping the whole `CACHE_FIX_*` env — emit a declared
  allowlist of known gate keys; an unknown `CACHE_FIX_*` key appears
  by NAME only, never value, with a test pinning that; (3) rebase
  onto current upstream/main (the conflict is real; conflict files
  not enumerable via API — surfaces during rebase),
  `--force-with-lease`. Verifier: mode-bit assertions in tests; the
  allowlist test; suite green post-rebase. Done: pushed + PR comment.
  Note for the report: upstream marks this load-bearing (their
  human's review follows — not ours to chase).

- **(DONE 2026-08-05, 2f96c88 pushed + commented) — #280: prefix-diff persistence gets a permissions +
  retention story.** Design settled: (1) every prefix-diff artifact
  goes through write-owner-only (0600) — snapshots, diffs, events,
  rotations; (2) content minimization by default: system-block
  windows (up to 20k chars/block), message previews, and event-record
  previews are stored ONLY under a new opt-in
  `CACHE_FIX_PREFIXDIFF_CONTENT=1`; default persists hashes + lengths
  + indices (attribution stays readable, prompt text does not rest on
  disk); (3) cross-key retention: a sweep on boot deleting prefix-diff
  artifacts older than 14 days and pruning oldest beyond 200 session
  keys — the reviewer's exact gap was "no cross-key GC, TTL, cap, or
  sweep". Document in the PR body that the CONTENT flag persists
  prompt-derived text. Verifier: mode-bit test; a seeded-old-files
  sweep test; default-mode test asserting no raw prompt text lands in
  any artifact (grep the written files for a sentinel string from the
  request); suite green. Done: pushed + PR comment.

- **DROPPED 2026-08-05 — NOT ACHIEVABLE as scoped; the premise was
  falsified, not the timing.** The entry assumed the 7 commits were
  self-contained. They are relative to #276 and are NOT relative to
  #272: six of the seven MODIFY
  `proxy/extensions/insertion-normalization.mjs`, none creates it, and
  `git cat-file -e upstream/main:...insertion-normalization.mjs`
  fails — that file exists only because of #272. Cherry-picking the
  first onto a branch cut from upstream/main gives
  `CONFLICT (modify/delete)`, not a textual conflict, and the only
  resolution is importing #272's file creation, which recreates the
  stacked diff the slim branch exists to avoid. Upstream's own stated
  alternative applies literally: once #272 lands, #295 re-diffs
  against a main carrying the base file and the problem dissolves.
  Reported on #295; no branch pushed, no draft PR. Re-open only if
  #272 stalls AND upstream asks again.
  (original entry below, for the record)
- **(DROPPED, see above) READY (optional acceleration) — #295: cut the 7-commit slim
  branch.** Upstream cannot review the stacked diff (69 files of
  inherited parents) and offered the #304-shaped workaround: a branch
  from upstream/main carrying only the 7 #295-specific commits
  (enumerate: commits on `pr/insertion-join-moves` not on its stack
  parents). Cherry-pick onto the slim branch (deleted since; the entry is
  DROPPED, so the name is history, not a pointer); if a
  pick depends materially on #272/#276 content, STOP and report —
  upstream's stated alternative is waiting for the parents to land.
  Verifier: suite green on the slim branch; diff shows only the
  7-commit surface. Done: new draft PR referencing #295, comment on
  #295 pointing at it.

- **SHIPPED fork-side 2026-08-05 (commit ref: the tools/git-hooks
  commit this entry rides in; activation corrected same day) — the
  pre-push full-suite gate.** The named obstacle dissolved: the hook
  is TRACKED (tools/git-hooks/pre-push); activation is per-machine as
  a SYMLINK `.git/hooks/pre-push -> ../../tools/git-hooks/pre-push`
  (done on Siren), which the operator's GLOBAL hook dispatcher chains
  after its fixture-leak scan. Verified red-first: a seeded failing
  test refused a real push; the landing pushes are the green cases.
  Bypass: `--no-verify`, stated in the same message.
  **INCIDENT, same day, caught by the check's own red-test:** the
  first activation used repo-local `core.hooksPath`, which silently
  REPLACED the global leak-scan dispatcher for exactly the repo it
  protects (one push, 190b395, went out leak-unscanned; its content
  was clean — hook + backlog text, and npm test's absence-scan ran).
  Root cause: a config write without the dependents search — one
  `git config core.hooksPath` read would have shown the global
  dispatcher. Mechanized: the dotfiles doctor now FAILS on a set
  repo-local hooksPath in this repo and on a missing/wrong
  .git/hooks/pre-push symlink (both halves proven red on their
  defects). The former dotfiles residues are DONE: doctor checks
  landed, and the stale "npm test hangs on the production port"
  warning is retired from CLAUDE.local (added 2026-07-29 with no
  recorded observation; never reproduced; both real hangs were the
  worktree node_modules artifact). The worktree gap is CLOSED
  mechanically (dotfiles b419af0, same day): the dispatcher now falls
  back to the common git dir's hooks, so `.git/hooks/pre-push`
  reaches worktree pushes — bite-tested (red against the old
  dispatcher), and live-verified from the wt-g2 worktree, where the
  suite gate refused a dry-run push it previously never saw.
  Original entry follows for the record.

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
  one restart carrying all three proxy/** changes. G1-G3 above take
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
  than copying that value, since it moves with any proxy/** commit.
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
  fail closed otherwise. proxy/** so it is deployment-coupled: pin
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
  comments) is DRAFTED and approved before posting; proxy/** changes
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
  Deployment-coupled (proxy/**), rides a stated boundary.
  INSTRUMENT GAP found in the same triage, booked below: bust-triage
  called this UNCLASSIFIED although it had already read and printed
  `transcript tools_changed`.

- **DONE 2026-08-02 (caa38c5, inline, parallel to three dispatches;
  13/13 tests + selftest green, and the live 15:53:46 bust re-triages
  from UNCLASSIFIED to KNOWN-OPEN/row 23) — bust-triage's verdict
  consults the transcript cause.** Shipped slightly WIDER than this
  entry specified, deliberately: rather than mapping `tools_changed`
  to the general row and stopping, `causeToRow` discriminates the
  tools delta from the pair it already holds — every tool's `name`
  and `input_schema` byte-identical with changed prose is row 23
  (absorbable), anything touching schema, set or order is row 6. That
  discrimination is precisely the three hand probes this session
  spent on the live capture, and the manual pass is unfinished while
  the check does not exist. UNCLASSIFIED stays reachable and now
  requires BOTH axes to miss, with the why-line naming which cause
  was considered. Original entry: On the 15:53:46 bust the tool printed
  `OK transcript tools_changed / 484972` and then `VERDICT:
  UNCLASSIFIED — census class "append-only" maps to no
  threat-matrix row`. Both statements are true and the verdict is
  still wrong: the census classifies the MESSAGE array, so a
  tools-driven bust whose messages are legitimately append-only is
  unclassifiable BY CONSTRUCTION on that axis, and the tool already
  holds the answer one line above. Design: when the census class
  maps to no row, fall back to the transcript cause (`tools_changed`
  -> the tools-stability row, `messages_changed` -> row 4, etc.)
  before returning UNCLASSIFIED; keep UNCLASSIFIED for the genuine
  case where NEITHER axis maps, since that verdict is this tool's
  whole payload. Verifier: bite red-first on a synthetic
  append-only + tools_changed event asserting the row is named, and
  a control asserting an unmappable pair still returns UNCLASSIFIED.
  tools/-only, not deployment-coupled.

- **(DONE — shipped 9059d3a; `movedFresh`/`movedRefires` are live in
  insertion-normalization.mjs and were the telemetry that made the
  2026-08-05 349k bust readable) — split `moved` into fresh recognitions vs re-fires
  (the instrument change the 660k bust argues for).** Grounding,
  verified at the line: insertion-normalization.mjs:1062 emits
  `moved: moves.length + refires.length` — the code holds the two
  populations in SEPARATE arrays and sums them at the telemetry
  boundary. That single `+` is why the busting request reported
  `moved:5` while findJoinMoves had minted ZERO fresh recognitions,
  and why "the mitigation ran" could not be distinguished from "the
  mitigation matched" until an investigation read the code. Design:
  keep `moved` (consumers exist), add `movedFresh: moves.length`
  and `movedRefires: refires.length`. Consumers to wire in the same
  pass: a shape-verdicts entry whose alarm is exactly
  "join-moves re-firing while fresh recognitions stay 0 over N
  requests" (the shape that just cost 535k tokens), and the fire
  ledger's absorbed column, which today counts activity that may be
  pure re-fire. Verifier: bite red-first on a synthetic pair where
  moves=0 and refires>0 — today's telemetry cannot express it.
  SERIALIZED behind the ordinal fix (same file), and it should ride
  the SAME proxy boundary — one restart carries both.

- **(DONE — `bust-triage` now prints `freeze: harvest --pin <key> n..m`
  on its capture line, verified live 2026-08-05) — bust-triage prints pin-ready request ordinals.**
  Grounding: an evidence-freezing error made by the dispatcher
  today. bust-triage's capture line reports `n=591->595`, which is a
  MESSAGE COUNT, while `harvest --pin <key> n..m` takes file-wide
  REQUEST ORDINALS (harvest.mjs:612-648) — the busting pair was
  ordinals 892..894. Pinning the reported numbers froze an unrelated
  90-minute-earlier range and produced a 17 MB fixture of the wrong
  thing, undetected until an agent cross-checked. Design: the
  capture line also prints the two ordinals, or emits the exact
  `harvest --pin` command; the two numbers live in the same record
  the line is built from. tools/-only, no deployment coupling.
  Verifier: bite asserting the printed ordinals address the same
  records the pair was read from.

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
  at all. Both are proxy/**, deployment-coupled.
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

- **READY — census must distinguish "no counterpart" from
  "counterpart present but unmatched".** Grounding: the diagnostic
  cost the dispatcher several investigation steps today. On a
  MISMATCH the census prints `actual=0ch`, and its own comment
  (:264) documents that as "the tell that no counterpart was found
  at all, rather than a rule that failed". For the s-captureG rows
  that tell was WRONG: a counterpart existed at host+1 and merely
  failed the standalone predicate (it was wrapper-retaining), so the
  number said "absent" about something present. Design: when the
  no-counterpart branch is taken, report whether a candidate
  standalone existed at the expected position and was rejected — a
  third state alongside the DROPPED/MISMATCH split that already
  lives there (:300-316), with the rejected candidate's length so
  `recon` and it can be compared at a glance. Verifier: bite
  red-first on the s-captureG shape (a wrapper-retaining standalone
  at host+1) asserting the row does NOT read 0ch.

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
  transform today, so chaining it needs an export — a proxy/**
  change, behaviour-neutral but deployment-coupled (pin bump +
  restart; row-3 clear, no state keys or freeze logic). SERIALIZED,
  not parked: tools/replay.mjs is in the read set of the running
  un-merge investigation, and a concurrent writer there would hand
  that agent an unstable instrument.

- **RESOLVED 2026-07-31 (059aae3 — suppression runs on the reset
  path; header re-titled 2026-08-01, body was already resolved) —
  hook-context container normalization (matrix row 4,
  mid-history replace/edit).** Grounding: measured live 2026-07-31, two
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

- **CLOSED 2026-07-31 — EXTENDED-class absorb: build refused on
  measurement; duplicate of the flap-move cross-message-join class
  (5c4d70a, dispatcher-verified: the merged-standalone byte relation
  re-checked against the raw capture, npm test 1783/0).** Do not
  re-dispatch off this entry — the un-merge lives in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md unit 2,
  blocked on the identity decision. Original entry kept below for the
  record; its premise and placement are both refuted in the resolution
  lines at the bottom. Grounding: census over
  this session's capture reports exactly one EXTENDED occurrence
  (2026-07-31T11:41:05.778Z, host=99, recon=293ch, actual=716ch) and the
  extra text is the "task tools haven't been used recently" harness
  reminder appended after `\n\n` — bookkeeping-class, position-insensitive.
  EXTENDED is definitionally append-shaped (`actual.startsWith(recon)`,
  `reminder-migration-census.mjs:96`), so `delta = actual.slice(recon.length)`
  needs no prediction. Design (settled): inside insertion-normalization
  (extend, never a new extension — the acc0814 lesson above), when a
  pinned/canonical standalone's incoming bytes EXTEND the first-seen form,
  forward the first-seen bytes at the original position and emit the delta
  as a proxy-authored `role:"system"` entry at a FROZEN index — appended at
  the current tail on first sight, then held at that index forever (same
  stable-insertion machinery the pins already use; precedent for
  content-at-relocated-position: `deferred-tool-rewrite.mjs` tool_addition
  blocks). Class-gated: only text matching the harness-bookkeeping wrap
  contract; anything else takes the honest reset. Safety argument: the
  model reads identical information, a few positions later; information is
  never dropped. Verifier: replay the 11:41 pair through the pipeline —
  first forwarded divergence must move past the EXTENDED host (beyond
  index 99); plus a unit test red-first on the captured 293→716ch pair.
  Done-criterion: on the motivating pair, with row-4 suppression + this,
  forwarded divergence ≥ 122 (the injection point), i.e. the entire
  mid-history region byte-stable, leaving only the self-healing prune.
  NOT bundled: the volatile-block-pinning directive (flip class) — note
  its blocking precondition "wait for capture/replay harness" is NOW MET
  (replay/census/bust-triage all exist); it can be scheduled on its own
  evidence.
  BUILD REFUSED 2026-07-31 (dispatch
  docs/directives/extended-class-absorb-directive.md; full evidence
  docs/code-reviews/extended-absorb-report.md). Three measurements, in
  the order that killed the design:
  (1) THE PREMISE IS WRONG. The EXTENDED remainder is not "new reminder
  text that did not exist yet" — it is a standalone system message the
  PREDECESSOR request already carried, swallowed into the migrated
  reminder. Measured on the motivating pair (capture s-captureF,
  conversation e7394e05, requests 100->101): before[99] user + one
  330ch wrapped reminder, before[100] system 421ch, after[101] system
  716ch = 293 + "\n\n" + 421, the 421 byte-identical to before[100].
  Corpus-wide, over every EXTENDED occurrence the census finds:
  9 of 9 MERGED-STANDALONE, 0 genuinely new text (4 sessions, 4 dates).
  (2) THE PLACEMENT IS A NO-OP. Real pipeline, serving gate set, the
  conversation replayed from its first request: baseline first
  forwarded divergence 100; with the delta re-emitted at a frozen TAIL
  index (this item's design) 100 — unchanged, zero absorption, because
  the bytes belong at the index the swallowed message occupied. Putting
  them back THERE moves it to 123 of 124, i.e. past the >=122
  done-criterion, the whole mid-history region byte-stable.
  (3) IT IS ALREADY IN FLIGHT, under another name. That un-merge IS unit 2's
  "first-seen re-serve" in
  docs/directives/flap-move-mitigation-and-fidelity-gate.md — the
  PARKED/UNPARKED cross-message-join item below (msg89's reminder +
  "\n\n" + standalone msg90) is the same shape reached from the census's
  blockMigration label instead of its EXTENDED label. Unit 2b is built
  on branch wt/fidelity/opus and BLOCKED on THE IDENTITY DECISION, not
  on a placement question. So this item is a DUPLICATE: it closes by
  merging into that one, never by a second mechanism (the acc0814
  lesson at the file level).
  Shipped from the dispatch, in scope and independent of the design: the
  reset path now DECLARES its suppressions (`suppressions: [{index,
  hash}]`, not just the count), so replay's safety and conservation
  gates stop reporting a designed behaviour as corruption — one false
  safety violation and one false conservation violation on the
  motivating conversation, both 0 after. Two spun-off items with their
  verifiers written out live in the report file, un-lifted into this
  backlog only because the dispatch's write boundary stopped at this
  entry: a census EXTENDED->MERGED-STANDALONE annotation, and the
  census byte-gate's SILENT capture skips (4 of 39 files, 6.2 GB — 79%
  of the corpus by bytes — dropped on `RangeError: Cannot create a
  string longer than 0x1fffffe8 characters`, reported as "25
  capture(s)" with no could-not-verify line).

- **RESOLVED 2026-07-31 (a77c930) — census reads captures by LINE, and says what it could not
  read** (lifted 2026-07-31 from
  docs/code-reviews/extended-absorb-report.md §c4, where the measured
  skip list lives). Replace `readCapture`'s `readFileSync` in
  `tools/reminder-migration-census.mjs` with `readLines`
  (`tools/read-lines.mjs`, already streaming and already the fix for
  this exact RangeError class in `replay.mjs`); keep per-conversation
  grouping unchanged. Report skipped/unreadable files as their own
  line and make a run whose unreadable count is non-zero say so in
  the verdict block (three-answer rule). Verifier: a run over
  `~/.claude/cache-fix-captures/*.jsonl` reports 39 files considered
  and 0 unreadable, versus 25/4 today; per-capture EXACT/EXTENDED
  tallies on the 25 currently-readable files unchanged. A MISMATCH
  surfacing in the newly-readable 79% of corpus bytes is a FINDING to
  report, never a failure of this change. Done when `gate-live`'s
  sweep cannot report a clean byte-gate over a corpus it did not read.
  **RESOLVED a77c930** — `read 39/39 capture(s), 0 UNREADABLE` against a
  baseline re-run of the old code reporting `25 capture(s)` and exit 0;
  tallies on the previously-readable 35 files unchanged (17 EXACT / 10
  EXTENDED / 1 DROPPED / 0 MISMATCH), pairs 3661 vs the baseline's 3662
  minutes later (live captures grew between runs). 2.4 GB capture
  censused in 6 s under `--max-old-space-size=512`. Done-criterion met in
  404d5fc: `gate-live` runs the census per capture and a byte-gate that
  could not READ makes the row not clean. FINDING from the newly-readable
  79%: placement is no longer single (56 at host+1, **3 at host+4**), so
  "single placement; safe to emit" was a verdict over 21% of the corpus —
  docs/code-reviews/census-hardening-report.md §c3.

- **RESOLVED 2026-07-31 (a301ef1) — census: EXTENDED sub-classification (MERGED-STANDALONE vs
  NEW-TEXT)** (lifted 2026-07-31 from the same report §c3; ORDER: land
  the line-read item above first — this one's classifications then
  cover the whole corpus). In `analysePair`, when a finding classifies
  EXTENDED, compare `actual.slice(recon.length)` (leading `"\n\n"`
  stripped) against the texts of the BEFORE request's standalone
  `role:"system"` messages; emit the sub-verdict on the detail row and
  in the non-EXACT listing. Also correct the header comment: "NOT
  absorbable by any normalization" is refuted for the merged
  sub-class. Verifier: red-first on the corpus — the 9 occurrences of
  the report's §b1 must print MERGED-STANDALONE, and a synthetic
  new-text pair must print NEW-TEXT. Done when the sub-verdict appears
  in `--json`, so `bust-triage` can key on it.
  **RESOLVED a301ef1** — `extendedSub` rides `--json`; corpus-wide over
  all 39 captures: **21 EXTENDED, 21 MERGED-STANDALONE, 0 NEW-TEXT**, and
  each of the report's nine §b1 occurrences prints MERGED-STANDALONE.
  Header comment corrected in place. Four unit tests red-first at a77c930
  (test/census-extended-subclass.test.mjs), including the discriminating
  case: a remainder present only in the LATER request is NEW-TEXT, since
  matching the after request's own standalones would make every merge
  trivially true. NOT done (out of both items' scope):
  `bust-triage.mjs`'s `migrationVerdict` still returns a bare EXTENDED
  and could import `subclassifyExtended` — report §c4.

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

- **CLOSED 2026-08-02 (sonnet discovery, dispatcher-verified at the
  cited lines) — placement multiplicity is interleaving depth, and
  nothing rests on a fixed offset.** The finder (chained from
  census()'s own exports, 30 live captures, 0 unreadable) found the
  corpus rotated to ONE host+4 occurrence (s-captureK, host@128 ->
  standalone@132, EXACT, 327B): a leftover EXTENDED standalone at
  +1, a real tool round-trip at +2/+3, the migrated standalone at
  +4 — interleaving, not a new migration shape. The consumer
  re-check the entry owed is now VERIFIED, not deferred:
  findSuppressibleDuplicate matches by content hash ("never a
  positional or role heuristic", insertion-normalization.mjs:726),
  findJoinMoves searches a bounded byte-match window, and the
  flap-move unit-2 re-serve substitutes in place at the move's own
  mergedIndex (:1372-1390, rationale recorded in the code).
  Placement tally today: 8 distinct EXACT offsets
  (+1:213, +6:2, +10:2, +4/+11/+12/+17/+42: 1 each) — the
  MORE-THAN-ONE-PLACEMENT warning is correct and stays. Residual,
  named: the earlier narrowing's other 2 host+4 occurrences rotated
  out unreconciled — no basis to say what they were.
  Original entry: **placement is no longer single: re-check what
  rested on it (report census-hardening §c3).** Full-corpus census prints 56
  standalones at host+1 and **3 at host+4** with the tool's own
  MORE-THAN-ONE-PLACEMENT warning, where the readable-21% corpus said
  "single placement; safe to emit". The 3 host+4 occurrences are
  uninvestigated.
  NARROWED 2026-08-01 (same sonnet discovery, per-occurrence finder
  built from the census's own exported primitives and
  cross-validated against the shipped tally): the 3 occurrences are
  NOT in the twin-bust or enormous-prune captures — every placement
  there is host+1. They live among the ~35 untouched, mostly-live
  captures; locate when those rotate, or via the finder over the
  full corpus in a quiet window. Consumers to re-check: any NORMALIZATION design that
  emits at a fixed host offset — the flap-move unit-2 re-serve is
  slot-preserving (no emit) and should be unaffected, but that is a
  claim to verify at its integration, not a fact.

- **RESOLVED 2026-07-31 (74f0f28 + the dispatcher's
  most-informative-host preference; verified live: triage of
  11:41:05 prints "row-4 container migration at host 99
  (EXTENDED/MERGED-STANDALONE)") — bust-triage sub-verdict.** The
  dispatch surfaced rather than built the one real decision: the
  pair carries TWO migrating hosts and first-match hid the EXTENDED
  behind an EXACT; ruling: one result kept (shape stable), most
  informative wins (EXTENDED > EXACT > DROPPED). Also this evening,
  same tool: capturePair now streams (7138ddd) — the 752 MB capture
  killed the default run with the same ERR_STRING_TOO_LONG class
  a77c930 fixed in the census; found live and independently by the
  dispatch (its gap 2).

- **RESOLVED 2026-07-31 — harvest scrub now preserves prefix/join byte
  relations (bffcb05, dispatcher-verified).** Was PARKED (report §c5:
  `scrub(a+"\n\n"+b) != scrub(a)+"\n\n"+scrub(b)`, executed). The named
  missing piece — a relation-preserving scrub that does not weaken the
  privacy guarantee — was settled same day as a `"\n\n"`-homomorphism
  (docs/directives/scrub-relation-preservation-directive.md): wrap
  handling first and unchanged, then per-segment tokens rejoined with
  the domain's join separator. Privacy delta is metadata-only and
  operator-ACCEPTED for this local, controlled deployment (caveat for
  non-local harvesters in scrubText's comment and dev-loop corpus
  hygiene). Verified: 10 property tests red-first then green, npm test
  1800/0, --dry-run clean under a 512 MB heap cap, and the dispatcher's
  cross-tool round-trip on the REAL motivating pair — new scrub +
  committed census: verdict EXTENDED, delta byte-equal to the scrubbed
  predecessor standalone, i.e. the class survives sanitization
  end-to-end.

- **RESOLVED 2026-07-31 (404d5fc; boundary decided, see below) — prune-event classification rides `--census` (mechanize the
  2026-07-31 drop-scan probe).** The row-22 refutation was produced by a
  throwaway inline script (per-message hash prefixes; drop events
  classified PURE-TAIL-PRUNE vs INTERIOR-DIVERGENT by first-differing
  index) plus a transcript join on `cache_miss_reason` (±90s). Extend
  `reminder-migration-census.mjs` (never a new tool): census already pairs
  same-conversation requests, so add a per-pair `nDrop` classification and
  a summary line (`prunes: {pure, interior}`), and let `bust-triage.mjs`
  do the transcript join it already knows how to do. Verifier: re-run over
  this session's capture must reproduce 12 events, 10 pure / 2 interior
  (11:31:58 and 11:41:05). Done when `gate-live.mjs`'s daily sweep carries
  the summary, so an interior-divergent prune surfaces without a hand-run.
  **RESOLVED 404d5fc, with the verifier's SPLIT disputed — decision open.**
  `classifyPrune` imports `firstDivergence` + `isHumanTurn`; `gate-live`
  carries `prunes` per row and corpus-wide. Event COUNT reproduces exactly
  (12 on s-captureF) and 11:41:05 is INTERIOR-DIVERGENT (breaks at 97,
  anchor 123, re-bills 27 of 124). 11:31:58 does NOT reproduce as
  interior: at the bytes it is the same phenomenon as the ten pure ones —
  a `[SUGGESTION MODE: …]` block pruned, the user's real turn landing at
  the same index — differing only in the live turn having produced 3
  messages rather than 1-2. The entry's 10/2 is reachable only via a
  "within N of the tail" threshold no definition produces, so the shipped
  boundary is the ANCHOR (the relation row 4's verdict rests on): 11 pure
  / 1 interior. DECIDED 2026-07-31 (dispatcher): the ANCHOR boundary is
  KEPT and this entry's 10/2 is corrected to 11/1 — the 10/2 was
  parented on the throwaway probe's output (the remembered symptom,
  dev-loop "Adding a check" rule 2), the bytes show 11:31:58
  shape-identical to the pure events, and reproducing 10/2 requires a
  tail-distance threshold no definition produces. Corpus-wide: 226 drop events,
  181 pure, 45 interior, 0 unanchored — two of them re-bill nearly
  everything (12:42:11 n=688->675 breaks at 4, re-bills 671, in a capture
  unreadable before a77c930; 11:40:24 n=83->81 breaks at 4, re-bills 77),
  unexplained and worth their own triage (report §c2). Done-criterion met:
  the full sweep prints `byte-gate corpus-wide: 59 EXACT / 22 EXTENDED (22
  merged-standalone, 0 new-text) / 1 DROPPED / 0 MISMATCH; prunes 181 pure
  / 46 INTERIOR-DIVERGENT` and all 39 rows carry `byteGate` in the status
  file (`unreadable: 0`, `errors: 0`); `npm test` 1820/0.

- **RESOLVED 2026-07-31 (6efce90) — bust-triage must see what the statusline shows (k:"cost"
  blindness).** Grounding, observed live 2026-07-31 ~13:53Z: statusline
  showed `❄ 55k compact (8m)` (ledger `k:"cost"` t=1785505434, this
  session); `bust-triage` and `--list` showed nothing newer than 12:25
  because `bust-triage.mjs:59` filters `k === "hit"` only — the default
  run silently triaged an older, different event. The event itself was
  controlled (post-/compact + model-switch first write, same instant as
  the transcript's `model_changed mtok=49784` diagnostic at 13:43:54Z;
  worktime cc=54908 is total-written, mtok is missed-portion — one event,
  two measures). Fix (extend, not new tool): include `k:"cost"` entries in
  `--list` labeled `CONTROLLED(<cause>)`; when the newest ledger event is
  a controlled class, the default run states that and names the event it
  fell back to instead of silently skipping. Verifier: re-run against the
  current ledger must list the 1785505434 compact event and say so in the
  no-args run. Done when a ❄-visible event can never be absent from
  `--list`. Per the three-answer rule: "cannot triage: controlled cause"
  is an answer; silence is not.
  **RESOLVED 6efce90** — `coldEvents()` reads the whole ❄-visible
  population and splits `bust` / `controlled`; `busts()` is a filter over
  it, so nothing downstream shifted. Live `--list` now carries
  `2026-07-31 13:43:54  55k  CONTROLLED(compact)  77fe2779`. The no-args
  half could not be reproduced against the ledger as it stands (a bust
  landed at 14:32:29, so the newest event is no longer controlled), so it
  was exercised through the real `main()` against a copy truncated to
  that instant: it prints the NOTE and names the 12:25:23 fallback — the
  substitution that used to happen in silence. WIDENED beyond the entry,
  deliberately: legacy `k:"resume"` is included with `k:"cost"`, because
  the ❄ token advances on `cold_hit` and `cold_cost` and worktime's own
  `--cold --all` filter is `hit or cost or resume` (3 resume records are
  live in the ledger) — the done-criterion is the superset's.

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

- **RESOLVED 2026-07-31 — `role:"system"` inside `messages[]` is
  legitimate wire shape, not an anomaly.** It is the
  `mid-conversation-tool-changes` beta's format
  (`deferred-tool-rewrite.mjs:16,381`), and CC additionally uses that
  role to carry hook additional-context. The observation that opened
  this item (13 of 124 messages) needed no mitigation of its own — it
  was the CONTAINER half of row 4's mutation, and is folded into the
  READY item above. Kept as a line rather than deleted so a future
  session re-encountering the role does not re-derive it.

- **RESOLVED 2026-08-01 (f71dd3a, ready-bundle dispatch,
  dispatcher-verified: 51/51, clean over all 123 test files; the
  verifier took the REAL-HISTORY route — both wave-2 defects
  reproduced from git-show reconstructions, cured tree green, and
  the WIDENED fixture arm red-first. Residual: the "wired into the
  next port brief" arm lands with the rebuild brief (HOLD entry);
  not yet run against a live slice worktree) — slice-port
  preflight: resolve a test file's module-scope
  reads against the slice tree before mapping it.** Grounding: both
  wave-2 load failures (2026-07-30) were the same shape — a test
  file mapped into a slice by `--stat` carried a module-scope
  dependency living in another slice (static
  `import ../tools/harvest.mjs`; top-level `readFileSync` of the
  oscillation fixture) and died at load in pr1/pr7/pr10; only
  `node --test` on the slice sees it, after the port. Design
  (settled): a `tools/` check that, given a slice tree and a list
  of test files, extracts static import specifiers and top-level
  `readFileSync`/`readFile` literals and resolves each against the
  tree — missing resolution = red, named. Verifier: run against the
  wave-2 mapping as recorded — must flag exactly
  `insertion-suppression.test.mjs` (harvest.mjs) and
  `insertion-merge-suppression.test.mjs` (oscillation fixture) at
  the pre-fix states, green after da9bf8c + the fixture port.
  Done-criterion: check in `tools/`, red on the recorded defect,
  wired into the next port brief's preflight. Related brief-form
  note for the next port: distinguish modify/delete conflicts on
  brief-prescribed discard paths (no-op resolution, proceed) from
  content (`UU`) conflicts (abort) — wave-2's executor had to
  deviate to deliver anything (report §d D1).
  WIDENED 2026-08-01 (fixture-leak post-incident, operator GO): the
  preflight also flags a FIXTURE mapped into a slice without its
  absence coverage — any test/fixtures/** file in a slice whose
  absence scan (tools/absence-scan.mjs, extracted from
  harvest-scrub-relations §6) is not runnable in that slice = red,
  named. The dotfiles pre-push guard is the boundary backstop either
  way, so this preflight arm is defense-in-depth, not the only line.

- **BUILT+SERVING 2026-07-30 (78940a0, rides the restart with
  b167fa5; residual OPEN: sole-587k-contributor question, closer =
  the post-restart live non-event; header re-titled 2026-08-01) —
  MERGED-reminder standalone: the 587k's real mechanism
  (premise corrected by the builder's probe, dispatcher
  byte-verified 2026-07-30).** The oscillation-pin premise was
  DISPROVEN against real code + production telemetry: the pin
  already absorbs msg863's flips (volatile-classed, identity
  unchanged, zero resets across the window). The REAL forwarded
  divergence: CC migrates BOTH of msg863's hook reminders into ONE
  standalone system message — wrapper-stripped, joined with exactly
  "\n\n" (627 chars, byte-confirmed at raw 864) — and suppression
  cannot match it: pinnedBlockHashes hashes blocks INDIVIDUALLY,
  never a concatenation (suppressed:0 across 560 session events;
  census independently flags the edit as not-the-known-class).
  DESIGN SETTLED: per pinned entry with >=2 volatile blocks, also
  register the join-hash of their unwrapped texts in wire order
  ("\n\n" joiner as observed); a standalone matching the join
  suppresses through the existing path; subset-merges not built
  (unobserved — the census keeps watching). Fixture extended with
  the real 864 standalone (requests_864). Build granted to the
  probing agent. BUILT + VERIFIED + PUSHED same day (78940a0: 7/7
  merge bites red-first from the real fixture bytes; sibling suites
  65/65; gate 0/0/0/0; the census's "input-mitigated but NOT
  output-preserved" list EMPTIED — including n=1515->1528, a second
  independent real occurrence from a different subagent's spawn,
  confirming the fix generalizes past the fixture). Rides the
  restart boundary with b167fa5 (view-markers). Residual: whether
  this is the sole 587k contributor or one of several (agent flag,
  unverified; the post-restart live non-event is the closer).

- **RESOLVED 2026-08-02 (0def5ca + bc454d1 + b702b69 + 07218a1, opus
  dispatch, dispatcher-verified: 39/39 on both suites re-run, all
  four red-first probes reported broken->red->green, live
  shape-verdicts run shows the fire-ledger verdict, commit graph
  re-verified after the amend incidents) — mitigation fire-rate
  ledger.** gate-live --fire-ledger (default
  ~/.claude/cache-fix-fire-ledger.jsonl, no systemd change needed —
  the series starts with the next timer run) appends one line per
  sweep: {ts, windowFrom, windowSeeded, ccVersions, captures,
  raw{7}, absorbed{7}}; RAW = census-measured CC behaviour per
  class, ABSORBED = event-log applications over the inter-sweep
  window; null never 0 on a missing source (bitten in-suite).
  NOT THE SAME UNIT: raw counts occurrences, absorbed counts
  applications (a suppression re-applies per request by design) —
  ratio-blind by construction, said in the file header (b702b69).
  shape-verdicts `fire-ledger` is informational unless the series
  itself cannot answer (no ledger / undated / >26h frozen) — the
  check-fires-on-non-defect rule applied at design time. Matrix
  gains the Retirement policy block (bc454d1): 0 RAW across N sweeps
  spanning cc-versions >= X + named upstream ref (row 4 candidate:
  anthropics/claude-code#81077) + gate OFF never deletion, RAW
  return = mechanical re-add trigger. DECISION booked (2026-08-02):
  ccVersions joins capture sid -> CC transcript's own top-level
  `version` — the brief's "cc-version namespace already in captures"
  premise was REFUTED in the artifact (0 grep hits across all 34
  captures; request-capture stores only anthropic-beta + session-id,
  request-capture.mjs:108); the transcript is CC's own version
  record, accepted as retirement evidence. Residuals, named:
  guardRestores RAW = null by definition (answers our pipeline, not
  CC; suite-asserted so a future measure must argue with a test);
  oscillationAbsorptions has no ABSORBED source without an
  extension-side field (proxy/** — rides a proxy boundary, never
  alone); blockMigrations/duplicates absorbed-null (no mitigation
  absorbs those classes); 4 single-request captures resolved
  ccVersions []; multi-day verdict wording fixture-tested only; 26h
  staleness threshold inherited from HARVEST_MAX_AGE_H, not measured
  against the gate cadence; per-row retire triggers still open in
  the matrix block. SAVED-vs-LEAKED bytes clause NOT built — its own
  OPEN item below. Original entry follows.
  (UPSTREAM-REF candidate logged 2026-08-01: anthropics/claude-code
  #81077 — "PostToolUse additionalContext re-serialized between
  turns, invalidating prompt cache" — is the row-4 class filed
  upstream; found by the dossier's gh sweep. A future row-4
  retirement names it, per refinement (1) below.)
  (operator question 2026-07-30: upstream may fix CC
  bugs; mitigations should retire on quiet evidence, like corpus
  rules at fire-rate reviews). Today: per-class fire EVIDENCE exists
  (insertion/deferred event logs, guard-events, census per-sweep
  counts) but no TIME SERIES and no retirement consumer — gate
  status keeps only the latest run. WIDENED 2026-07-30 (loop stage
  RETIRE): the per-run line also accumulates SAVED-vs-LEAKED —
  absorbed bytes (input-mitigated sizes) vs passed-through re-billed
  bytes — the retirement evidence and the proxy's justification
  number in one series. Design sketch: gate-live appends
  one compact per-run line (date + per-class counts: suppressions,
  relocations, tool-addition announcements, oscillation-absorptions,
  guard restores, blockMigrations, duplicates) to a cumulative
  fire-ledger jsonl; consumer: a shape-verdicts entry answering
  "class X last fired N days ago" + threat-matrix rows gain retire
  triggers ("quiet M weeks + upstream fix confirmed -> gate OFF,
  acceptance-style"). Operator refinements 2026-07-30, both in the
  design: (1) UPSTREAM EVIDENCE IS PART OF THE BASIS — a retirement
  names its CC-side ref (issue closed / changelog entry / version),
  and the ledger lines carry the CC VERSION seen (cc-version
  namespace already in captures), so the claim becomes "0 raw
  occurrences across N sweeps spanning versions >= X, where X ships
  the fix" — not just "quiet lately". (2) RETIREMENT IS REVERSIBLE
  BY CONSTRUCTION — gate OFF, never code deletion (the
  built-and-dormant pattern); the ledger tracks TWO columns per
  class: RAW occurrences (CC's behavior, census-measured offline —
  keeps counting even with the gate off) and ABSORBED fires
  (mitigation activity). Re-add trigger = raw count returns after
  retirement; re-enable takes a fresh acceptance entry (the
  existing pattern — the acceptance dict already carries REMOVED
  entries whose re-enable "verlangt eine neue Abnahme", and the
  doctor enforces it). Pairs naturally with the soak summary and
  the watch threads.

- **BUILT 2026-08-02 (dc0fce1, opus dispatch, dispatcher-verified:
  61/61 across five suites, four red-first probes, real subset line
  appended to scratch) — fire-ledger SAVED-vs-LEAKED bytes columns;
  saved side NULL-BLOCKED on a replay field, its READY item below.**
  Line schema gains savedBytes/leakedBytes (7-class key set, null
  never 0, old lines parseable — bitten). This entry's own premise
  "the data already exists per mitigation row" was REFUTED in the
  artifact: only relocations carries byte fields; leakedBytes is
  1-of-7 live and PROVEN to move when the mitigation fires (A/B
  replay on s-captureG: gate OFF 23865, serving 13952 — the 9913
  delta is the absorbed re-bill). savedBytes is 7/7 null under both
  readings (census AND event logs carry no byte field anywhere) —
  the one blocking expression is replay.mjs:1044
  `rebilledBytes: mitigated ? 0 : rebilled`, which computes the
  justification number and discards it. Dispatcher rulings
  2026-08-02: shipped-all-null RATIFIED (an all-null column reads
  "unmeasured", the ledger's own discipline); rebilledOutBytes
  correctly NOT summed into leakedBytes (output tokens price
  differently — own column if ever wanted, candidate below);
  verdict message stays counts-only until saved is real. Lesson
  booked from the refutation: "the data already exists" in a
  backlog entry is an artifact claim and decays as the artifact
  moves.

- **RESOLVED 2026-08-02 (0a905a5, inline after the smoosh lane
  closed; 128/128 across six affected suites) — replay keeps the
  pre-mitigation re-bill: savedBytes' one missing field.** Landed
  as designed with one correction to the entry's own claim: "NO
  gate-live change needed" was the dispatch's overstatement — its
  shipped summariseFireBytes hard-nulled saved, so the read had to
  be added there (with an old-schema guard: rows predating the
  field stay null, measured-empty is a real zero, three states
  pinned in-suite). Retained-not-recomputed pinned by replaying the
  same pair mitigated and unmitigated (equal numbers, opposite
  fields). Done-criterion met exactly: n=63 row savedBytes 9913
  under serving gates, subset ledger line
  savedBytes.relocations 9913 / leakedBytes.relocations 13952 —
  byte-equal to the dispatch's A/B evidence. The fire ledger now
  prices both directions; the saved/(saved+leaked) verdict ratio
  (candidate below) is unblocked.

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

- **RESOLVED 2026-08-02 (3b32e6b, sonnet dispatch,
  dispatcher-verified: five replay suites green, live replay of the
  capture 10 violations -> 0 with 10 visible same-class exemptions,
  exit 0) — new live conservation failure: s-captureP,
  conservation=10, gate exit 1 (found 2026-08-02 by the fire-ledger
  dispatch's full-corpus run — 34 captures vs the 07:51 production
  sweep's 28; NOT caused by the fire-ledger work, which touches no
  replay or extension path).** The gate now byte-verifies
  smoosh-split's declared peel by chaining the extension's own
  export; tamper stays red; the gate's DEFINITION comment carries
  the new clause (d), and the dispatch also repaired pre-existing
  drift there (isDeclaredStrip's dangling clause-(c)
  self-reference). Residual, named: exemption granularity is
  message-level — a message carrying BOTH a legitimate peel and an
  unrelated genuine drop stays a plain violation with no
  known-good-part hint (safe direction, never masks a loss; not
  observed live). Lesson: "the comment is the definition" needs
  occasional audit against the code's inline clause references —
  drift compounds silently until someone adds an adjacent clause.
  Mon 07:18 sweep expected GREEN.
  ATTRIBUTE DONE 2026-08-02 (inline, dispatcher; replayed the
  capture alone with --gates-from-capture, dumped in[2] of the
  09:18:11 request): NOT a defect — the gate fires on legitimate,
  declared mitigation work it predates. Five requests
  09:18:11–09:18:45, each losing 1 user tool_result unit at in[2]
  and inventing 2 at out[2] — the exact signature of
  smoosh-split.mjs (ON in serving config; declares
  ctx.meta.smooshSplitStats) peeling a trailing <system-reminder>
  (MCP server instructions, smooshed by CC into a WebFetch
  redirect tool_result string) into a text block appended to the
  same message. The conservation gate's definition (replay.mjs
  ~:1683) has clauses for suppressions and declared injections,
  none for the peel — first live smoosh since the gate shipped.
  Remedy per the check-fires-on-non-defect rule: declared
  exemption the gate byte-verifies by CHAINING the extension's own
  exported splitSmooshedReminders (census-sub-classifier
  precedent), tamper stays red, exemptions counted visibly;
  sonnet dispatch in flight, resolution ref lands with its booked
  report. Capture note: the session is LIVE — counts may exceed 10
  by verification time; same-class growth is expected.

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

- **FIXED + CLASS CLOSED 2026-07-30 (e0f8fcb; all three real
  failures replay clean, fourth 400 was the deploy window; two
  residues named in body; header re-titled 2026-08-01) —
  suppression can strip a request's FINAL message ->
  assistant-terminal 400: OUR bug, three live failures 2026-07-30**
  (operator push overturned the dispatcher's "harness noise" claim
  — twice booked wrong in chat before the log check). Evidence:
  insertion event log's three suppressed-duplicate events precede
  the three "400 must end with a user message" idle-failures by ~1s
  each (05:55:26/27 lifo, 07:12:37/38 fss, 08:09:10/11
  oscillation). Mechanism: report-enforcer injects IDENTICAL
  instruction bytes at every SubagentStop; first occurrence pinned,
  next occurrence suppressed as duplicate; when it was the resume
  request's ONLY/new final message the forwarded conversation ends
  assistant-role -> upstream 400. Damage so far: failed pokes of
  COMPLETED agents (cosmetic); the same mechanism would kill a
  live resume of unfinished work. FIX (granted to the suppression
  agent): (1) tail guard — never suppress the array's final
  message (a tail-position duplicate is the request's live payload,
  not a migration; bite red-first on the resume shape); (2)
  output-guard gains the assistant-terminal invariant (incoming
  ends non-assistant -> forwarded must too; restore + guard-event
  on violation — the live catch this class lacked); (3) replay the
  three real failing sub-conversations pre/post. proxy/** — the
  restart urgency is raised: the class actively breaks resumes.
  FIXED same day (e0f8fcb, sonnet, pushed after dispatcher
  verification: 83/83 + output-guard suite green; all THREE real
  failures replayed pre/post — PRE shows the exact 400 condition
  (incoming last=user, forwarded last=assistant, guard silent);
  POST all three intact, suppressed=0 at tail, build 1 prevents
  and build 2 stands as belt. Builder also caught + fixed its own
  prior test's accidental tail-index harness). Candidate lesson
  stands: a mutation that can REMOVE messages needs a
  tail-validity invariant from day one; the message-COUNT lesson
  covered the checkers, not the API-contract shape. SERVING after
  the ASAP restart (task #5). CLASS CLOSED (probe, same day): a
  fourth 400 at 08:40:48 was the DEPLOYMENT WINDOW — the request
  hit 54s after the fix's push and 43s before its restart, served
  by the stale process (probe reproduced production's event log
  byte-for-byte with the pre-fix files, and HEAD replays the same
  request clean; the three originals replay clean under current
  code — no second mechanism). Two residues, named: (1) accepted —
  commit-to-restart windows serve stale code by construction; rare,
  self-healing, no standing check built (point-in-time gates can't
  see a 54s window; a fix-class actively firing during its own
  deploy window is unlucky timing, not drift). (2) instrument
  lesson — the dispatcher misread a TRUNCATED log print ("index:
  2..." was index 287, cut mid-number) and briefed "mid-history"
  wrong; the probe's full-record read corrected it. Print full
  records when the value is load-bearing.

- **Upstream PR series #272–#281 (ten open, #281 draft) — await review.**
  Updated 2026-07-30 after the suppression work: #272 gained the
  duplicate-suppression commit (c713d0e), #276 the output-side
  metric/census/exemptions refresh (93203c9, extension synced to the
  #272 tip), #281 rebased onto c713d0e (draft, force-with-lease); all
  three commented, slices test-verified in their own worktrees.
  Rebase worktrees: `~/dev/vendor/cache-fix-pr{1..10}`. #281 flips to
  ready when #272 merges (either side can; `gh pr ready 281`). Residue
  riding with rebases or a final chore PR: +35 lines of test hardening
  (install-service / proxy-wrapper / read-dedupe tests) and
  proxy-restart-transparent.test.mjs. PR2's copy of
  session-key-invariants.test.mjs excises the prefix-diff tenantId case;
  it lives in #280's proxy-prefix-diff.test.mjs.
  Wave 2 (post-morning commits da4e7e1..e0f8fcb → #272/#276/#278/#280,
  #281 rebase): hold released 2026-07-30, brief decision-complete at
  docs/directives/pr-wave2-port-brief.md; execution blocked by the CC
  Agent-denial incident — full state in
  docs/directives/HANDOFF-2026-07-30-agent-denial-restart.md.

- **COMMITTED on PR #272 and #273 threads: week-of-soak summary, due
  ~2026-08-05.** Material: cache-fix-gate-status.json history + the
  worktime --cold ledger (preventable vs TTL-idle split).

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

- **Row 2 (threat matrix): TTL keepalive** — OPEN since 2026-07-27,
  phase-3 candidate, cost-positive only if the operator returns after
  idle; needs idle-detection + opt-in. Unchanged.

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
  (no new state file). Remaining, named: (1) DEPLOY — proxy/** ->
  dotfiles pin bump + restart at a stated session boundary + gate
  run (dev-loop); row 8 closes on the live non-event, not the
  build. (2) The five other output-spliced pairs are confirmed NOT
  block migrations (census post-fix: exactly 4, none of the five)
  — a different, still-unclassified mechanism, still open. (3) The
  three sibling migrations (n=105->107, 107->108, 108->109) were
  covered only by the aggregate gate, not individually verified.
  (4) grep for consumers of the new suppressed/suppressions stats
  fields not run (prior equivalent check on outputForm found none).

- **DONE 2026-07-30 — replay warns on gateless runs of gated
  captures** (669c8c7, sonnet build, pushed after dispatcher
  verification; grounding was three same-day instrument errors with
  the dev-loop prose loaded each time). Validation better than the
  planned bite: during dispatcher verification the warning fired on
  a REAL instance of its class — a head-1 gates extraction on a
  multi-boot capture whose first boot declares no gates produced an
  empty env the dispatcher believed was gated; the builder's
  union-across-boots judgment call is what made the fire correct.
  Named residuals, accepted: the strict-partial case (0<M<N gates
  set) shares the code path but has no bite; no real multi-boot
  fixture in-repo (union exercised against the live capture only).
  Convention from the incident: extract gates via the ALL-boots
  union, never head -1 — and DONE 2026-07-30 (dac26a0; clause sat
  stale as READY until booked 2026-08-02), the mechanized form: a
  `--gates-from-capture` replay flag applying the union (names AND
  values, later boots winning) so no operator hand-extracts gates
  at all; the warning text now names the flag as the remedy
  (replay.mjs:2242).
  Design: reuse declaredGateNames' iteration, apply before
  extension load (same merge point as --env); --env still wins
  over the flag where both name a gate. Verifier: bite — flag on
  the multi-boot capture reproduces the union run (no warning,
  header "N of N"); flag + --env override → override wins. The
  hand-extraction one-liner dies with the flag (the probe-
  graduation rule's case).

- **DONE 2026-07-30 — injectAdditions LIFO fix (00d1e58, sonnet in
  isolated worktree, cherry-picked + pushed after dispatcher
  verification: 25 stability violations -> 0 on the real capture,
  own replay run, all other invariants 0; red-before-green in units
  AND on the capture; no pre-existing test asserted LIFO). Open
  question from the build, unresolved: pre/post replay diagnostic
  logs diverged in volume past line 1912 (a 643-message conversation
  cycling; live capture grew between runs ~6 min apart — plausible,
  unconfirmed). SERVING since 2026-07-30 morning (pin c3f975b,
  restart at a stated boundary, /health = disk fingerprint
  910554e0b153); ported to upstream PR #273 (6636aa9, commented).
  Live non-event on the next MCP-heavy session boot closes it. Original entry follows for the record.**
  Mechanism found by probe 2026-07-30, dispatcher-verified at the
  code. The gate-red investigation
  (s-captureC, 25 violations, burst n=372-397) resolved: a session-
  boot MCP discovery cascade grows tools[] 0->11->428->singles while
  the conversation stays 1 message; `injectAdditions`
  (deferred-tool-rewrite.mjs:408-440) splices EVERY addition at its
  anchor's idx+1, so on a shared anchor the newest addition lands
  first and pushes all earlier ones back — a LIFO stack that
  reorders the already-forwarded prefix on every new tool.
  Deterministic (byte-for-byte in sequential replay), pre-existing
  (A/B exonerated the suppression deploy). Fix design: injection
  order must preserve FORWARDED order — on a shared anchor, splice
  each new addition AFTER the additions already injected there
  (append to the run, FIFO), so the forwarded prefix is stable and
  only the tail grows; same rule in the reanchor path. Verifier:
  red-green on the real capture — the 25 stability violations drop
  to 0 with fidelity/safety unchanged; unit bite for the shared-
  anchor multi-addition order. Live-cost note from the probe: the
  26 burst requests have NO outcome records (cancelled in-flight),
  so the paid cost is unattributable without A/B — the violations
  themselves are the evidence. Upstream coupling: PR #273 carries
  this extension — port the fix there after fork verification.
  Full evidence: scratchpad flap-probe/detail.txt (session-local);
  probe report booked here is the durable record. Related, same
  probe, SEPARATE items: (i) torn capture lines, (ii) census
  output-hash blind spot — both below. The second
  red capture is a DIFFERENT class: s-captureD n=2024->2025
  (12:31:18Z, pre-deploy traffic), 1 violation, `inDiv=1 outDiv=0
  [CC bytes IDENTICAL -> ours] <- fresh-session-sort` — CC's input
  changed at index 1, our output byte-flapped at index 0; not
  suppression-shaped (byte change, not message removal), one
  instance in ~2000 requests. RESOLVED at mechanism level
  (probe 2026-07-30, dispatcher-verified at the code):
  fresh-session-sort's relocate branch fires on the FIRST
  APPEARANCE of a relocatable block type anywhere in the array
  (hasScatteredBlocks, :117-127) and prepends it to messages[0] —
  a DELIBERATE one-time relocation bust that buys elimination of
  repeated future ones (extension-impact-guide: the #34629 class,
  the project's founding bug). Deterministic-from-input;
  1/~2000 matches session-init frequency. DONE 2026-07-30
  (e41e068, sonnet, pushed after dispatcher verification: 52/52 +
  selfcheck green; real pair PRE 1 violation measured independently
  twice, POST 0 violations + 1 annotated telemetry-backed exemption
  on the dispatcher's own run — THE GATE'S LAST RED IS RESOLVED,
  next sweep should be fully green). Builder's attribution
  correction on the record: its "second POST run" was the
  dispatcher's process seen via ps — POST stands on one run, PRE
  on two. Extension half proxy/** — rides the shared restart
  boundary. The build was: fresh-session-sort emits ctx.meta
  telemetry (relocated block types + first-appearance flag), and
  replay's stability check gains a telemetry-keyed
  exemption mirroring suppressedIndices ("never a re-derived
  guess") for first-appearance relocations at the reported index.
  Verifier: red-green on the real pair (s-captureD n=2024->2025
  flips to exempt-with-basis, gate fully green) + unit bite both
  ways (relocation without telemetry stays RED — the exemption
  must not fire on shape alone). SERIALIZED behind the row6-dup
  dispatch on tools/replay.mjs; extension half is proxy/** — rides
  the shared next restart boundary (fourth rider).

- **DONE 2026-07-30 — capture appends serialize per path**
  (ec71be1, sonnet, pushed after dispatcher verification: 14/14
  across queue + capture suites, routing confirmed at all three
  sites). Escalation settled at dispatch: the mocked chunked-yield
  RED is SUFFICIENT — the checker's expectation derives from the
  defect's definition (writes split across syscalls interleave),
  and the live tie to reality is the 5 torn pairs already observed;
  an at-scale flaky repro would add platform noise, not evidence.
  Builder finding, dispatcher-verified: jsonl-session-mirror rides
  proxy/session-mirror-writer.mjs's appendFileSync — synchronous,
  cannot self-interleave, correctly untouched. NOT YET SERVING:
  proxy/** — rides the next restart boundary together with the
  error-log gate flip (one boundary, one statement).
  Original entry: (settled
  2026-07-30; evidence: flap probe fact 4 — 5 pairs of torn ~1MB
  lines in s-captureC, appendFile interleave; mechanism: node
  splits large buffers across write() syscalls, concurrent async
  appends to one path interleave mid-line). Design: a per-path
  promise-chain append queue (a small shared util; request-capture's
  three appendFile sites route through it; check jsonl-session-mirror
  for the same pattern and route it too if found). No format change.
  Verifier: bite — two concurrent large appends through the writer
  parse back as exactly two lines (red against bare appendFile);
  census unparseable count on future captures is the standing
  consumer. Done: bite green + suites green.

- **DONE 2026-07-30 — census outputForm strips cache_control
  (903a2be) + --gates-from-capture flag (dac26a0), one sonnet
  dispatch, dispatcher-verified: all five pairs AND n=26->28 now
  outputPreserved:true on the real capture via the new flag; 61/61
  replay suites green; downstream suppression-test assertion updated
  by the dispatcher (c128dbf — second consecutive dispatch tripped
  that file; lesson booked: grep test/ for assertions on a field
  before changing what it returns). Ported to upstream PR #276
  (16a3ca3, commented; extensions synced to the #272/#273 tips). Original entry:** The five "unclassified output-spliced
  pairs" in s-captureA are RESOLVED as instrument artifact: CC
  itself sends the same 32,140-char text as a cache_control-bearing
  block while it is the tail, then as a bare string later — its own
  shape choice, pre-pipeline (probe-verified on n=678->681 raw
  bytes; deferredToolRewriteStats inert on all five;
  findStabilityViolations 0 on the whole capture). compactEntry
  (replay.mjs:474) hashes raw JSON.stringify(message) with no
  cache_control strip, unlike the pin-identity path (:396) — the
  exact input-side blind-spot class already documented, unfixed on
  the output side. Fix: strip cache_control (and mirror the
  volatile-wrapper fold where applicable) in the out-side hashing
  used by findMitigationGaps' outputForm; verifier: the five pairs
  flip to outputPreserved:true / rebilledOut ~0 while n=26->28's
  pre-fix signature (in the harvested fixture, if pinned) still
  classifies as spliced. Closes the reminder-swap entry's residual
  (2).

- **DONE 2026-07-30 — harvest --pin + fixture fallback (da4e7e1 +
  fda83cc + 2dfe0f0, sonnet in isolated worktree, cherry-picked +
  pushed after dispatcher verification: 40/40 combined incl. both
  real-pair suites from live capture AND from the committed pinned
  fixture; first pin landed: pinned-s-captureA-26-28.json, 431 kB).
  Load-bearing deviation REVIEWED AND APPROVED (fda83cc, own
  commit): the shared scrubber's fixed "REDACTED" for wrapped
  reminders broke wrap/unwrap identity — a fixture replayed to the
  PRE-fix defect shape; now the inner text re-wraps its own
  deterministic token, preserving equality-under-scrub with no raw
  leak; empirical basis in the code comment. The rotation-eats-
  evidence residual (three instances) is retired. Original entry:**
  (settled 2026-07-30; three motivating instances: real-pair tests
  SKIP after rotation — suppression, output-form, and the metric
  booking each carried the residual). Design per the parked sketch:
  `harvest --pin <key> <n..m>` writes the sanitized range (harvest's
  existing scrubber; tool schemas dropped as today) to
  test/fixtures/harvested/pinned-<key>-<n>-<m>.json; real-pair tests
  gain a fixture-fallback (capture absent -> pinned fixture ->
  skip); matrix rows / acceptance strings cite fixtures, not capture
  keys, from then on. Verifier: pin the n=26->28 pair as the first
  real use; the suppression real-pair test passes from the fixture
  with the capture path renamed away (red: fallback absent ->
  skip). Done: flag + fallback + first pin landed.

- **DONE 2026-07-30 — telemetry-consumer table in shape-verdicts
  (083c5d6 + dispatcher gate-source fix 8e91c69, pushed): five
  entries, 13/13 bites, live-mutation red. Dispatcher verification
  caught the gate-source gap (out-of-band runs read env, not
  serving truth — fixed via gate-status fallback; the fix's own
  first draft had its ReferenceError swallowed by its fail-open
  catch, caught by the live-output check, not the suite). Residues
  booked: session-mirror gate invisible to the fallback (sweep set
  excludes mirror/capture by design) — warn stands as known;
  upstream-change-detection logs ROUTINE message-count growth as
  structural_change (alarm-noise calibration, row 5 territory);
  the unknowable fs-error branch unbitten. Original entry:** (settled 2026-07-30, grounded in the
  consumer principle minted same day + the fresh no-consumer grep
  for suppressed/suppressions). Design: a declared table in
  shape-verdicts.mjs — {file, kind: alarm|log, maxAgeH, predicate}
  — emitting one three-answer verdict per entry (alarm files warn
  on nonzero recent entries: guard-events, upstream-changes; log
  files warn on staleness only: insertion/deferred event logs,
  session mirrors). Status-file fields + boot proxyTree: doctor is
  already their consumer — declared, nothing built. Verifier: bite
  per kind (alarm fires on a nonzero fixture, log fires on an old
  mtime); the doctor books the new verdicts unchanged. Done: table
  + verdicts + bites green.

- **Row 2 TTL keepalive — PARK sharpened to a measurable trigger**
  (settled 2026-07-30): cost math — a keepalive is a full-prefix
  cache-READ (~0.1x) per <1h window; one avoided cold re-bill
  (~1.25x write) pays for ~12 refreshes, so it is cost-positive
  only for returns within a bounded idle window. Build trigger,
  measurable from the worktime --cold ledger's preventable/TTL-idle
  split: a week showing repeated TTL-idle colds with return inside
  ~2h. Until the ledger shows that pattern, not built; design then:
  opt-in timer, last-activity from capture mtime, capped extension
  window.

- **RESOLVED 2026-07-31 — restart boundary EXECUTED (operator GO
  "restart now"; same GO retired the restart-busts-live-sessions
  caution, 747f5e6).** Evidence chain: pin bumped 3730d27 → 00f4273
  with acceptance extended (dotfiles 7f03a2c); proxy restarted
  ~22:04 CEST, /health ok, serving tree 06ed53a421a6; error-log
  flip live (unit already carried =on, activated by this restart;
  acceptance was on file since 2026-07-30); doctor: pin OK, running
  process = disk tree OK, all gates classified+accepted; fresh gate
  stamp 20:18:58Z describes the SERVING tree — byteGate 0 MISMATCH
  / 0 unreadable, sole failing capture s-captureB (the two
  pre-existing deferred-tool-rewrite pairs, own OPEN item below).
  Telemetry "needs a look" warns both walked to controlled causes
  (this session's tool-schema flips; model:"test" 401s from today's
  test runs). RIDER STILL OPEN, moved to the dotfiles BACKLOG
  (deployment items live there): doctor has no byteGate/prunes
  consumer yet — the fields are in the status file, doctor ignores
  them silently (alarm-without-reader class).

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
  minimal absorb design and its red-first bite; any proxy/** fix is
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

- **DONE 2026-08-02 (092a7cf + d2c9d00, sonnet dispatch,
  dispatcher-verified: selftest green, controlled 8/8, dossier
  19/19, real triage re-run) — bust-triage pair-selection tool gap
  (split out of the twin-busts entry above, whose absorption
  question stays open).** Three layers, each red-proven on real
  numbers: (1) telemetry-confirmed preference; (2) nearest-event
  wins over newest-of-matches (5 ms genuine vs 1899 ms spurious
  cross-conversation match), candidates scoped to 60 s of the
  recency pick (unscoped, an exact coincidental match 18 min out
  won); (3) match narrowed to action="reset" only — "non-append"
  was a paraphrase; the extension's own action contract
  (insertion-normalization.mjs ~483-554) defines reset as the
  cache-invalidating action, and "normalized" fires on ordinary
  successful requests (a 4 ms normalized decoy beat the genuine
  5 ms reset match). Result: BOTH twin busts now classify
  mechanically — adf6cadb KNOWN-OPEN/row-4 host 58
  MERGED-STANDALONE via --at; 7749d7fc KNOWN-OPEN/row-4 host 71
  EXTENDED/NEW-TEXT via direct capturePair+censusPair+
  migrationVerdict call (its LEDGER ENTRY IS PRUNED — activity.jsonl
  greps empty — so the --at flow cannot reach it). Residuals, named:
  the twin-busts entry's byte attribution said "index 69" where the
  tool reports host 71 — unchased; no broader sid sweep for other
  normalized-vs-reset collisions; same-conversation join key parked
  below.

- **PARKED — bust-triage pair selection: same-conversation join key
  (twin-busts tool-gap residual, 2026-08-02).** The timestamp join
  shipped in 092a7cf/d2c9d00 is a proximity heuristic; the exact fix
  joins on the insertion events' own `key` field (full sessionKey)
  against a per-candidate key computed from conversationSubKey
  (exported, proxy/extensions/message-hash.mjs) + systemPromptSubKey
  (NOT exported from insertion-normalization.mjs) + resolveSessionId.
  Named missing piece: the systemPromptSubKey export is a proxy/**
  change — deployment-coupled (pin bump + restart), so it rides the
  next proxy boundary, never alone. Evidence: sonnet dispatch report
  2026-08-02 — reset-only matching closed both live cases without
  it; trigger to build is the next selection miss the heuristic
  cannot break.

- **RESOLVED (attribution 2026-08-01; remedy 8e28833; deployment
  legs re-checked 2026-08-02 by the dispatcher: CACHE_FIX_UPSTREAM_
  ERROR_LOG reads `on` in the serving unit per /health, proxy pin
  ad4ff80 equals HEAD:proxy, and the status stamp's proxyTree
  a80e29b2b356 equals the on-disk source fingerprint — so the
  "still describes the pre-5c4d70a tree" clause below is itself
  superseded). RESIDUAL, dotfiles-side and unclosed: the doctor's
  three-answer verdict on the sweep status file's `byteGate` and
  `prunes` fields. Header re-graded 2026-08-02 — it read OPEN with
  "ATTRIBUTE step owed" while its own body recorded the attribution
  DONE; caught by backlog-lint only after DONE was added to its
  marker set (9d20b7d follow-up), i.e. the guard was blind to this
  corpus's most-used grade word — the corpus's entire remaining
  stability debt: two
  deferred-tool-rewrite pairs on s-captureB** (n=709→710 outDiv=236,
  n=701→718 outDiv=82, gate attribution line, byte-identical across
  the identity-build A/B — pre-existing, not insertion-normalization;
  named "worth a separate look" in the unit-2b report (g) and now
  the sole red row in every sweep, incl. the fresh post-deployment
  stamp). ATTRIBUTE step owed: pull the two pairs' per-request
  deferred-tool-rewrite telemetry and classify — real self-inflicted
  flip vs instrument/exemption gap.
  DONE 2026-08-01 (sonnet discovery, dispatcher-classified; evidence
  docs/code-reviews/s-0dc8ac87c43d-attribute-evidence.md — token
  name, capture = this entry's): both divergences are
  deferred-tool-rewrite's own reset branch wiping its injected
  announcements (reason=tool-schema-changed; CC raw bytes identical
  at both indices; attribution instrument-bisected, violations=2
  exemptions=0 corpus-wide). Classification: self-inflicted in FORM,
  zero marginal billing in SUBSTANCE — the schema change that
  triggers the reset busts the tools-block cache prefix regardless
  (premise: tools precede messages in the cache prefix, Anthropic
  caching docs — the one reviewer-checkable premise). Remedy decided
  → READY exemption entry below; reset-preserving-additions REJECTED
  (no billing win, muddies honest-reset semantics). The strict-A/B
  rotation constraint is superseded by the bisection unless the
  exemption bite demands live confirmation. Unit bites exist
  (test/proxy-upstream-error-log.test.mjs, #235); flip =
  CACHE_FIX_UPSTREAM_ERROR_LOG=1 in the serving unit riding the
  NEXT proxy restart (no dedicated restart), acceptance recorded
  per the doctor's gates-acceptance format in dotfiles; the new
  shape-verdicts alarm entry (Q4 pattern above) is its standing
  consumer — closes the alarm-without-reader gap for this file
  from day one. Done: gate serving + acceptance entry + doctor
  green. SAME BOUNDARY now also carries (2026-07-31): the dotfiles
  proxy tree pin bump for 5c4d70a (insertion-normalization
  declares reset-path suppressions — telemetry-only, no state
  keys or freeze logic touched, so row-3 restart-safe) and the
  post-restart gate stamp (the dispatch's gate run went to
  scratchpad deliberately, so ~/.claude/cache-fix-gate-status.json
  still describes the pre-5c4d70a tree). Also at that boundary
  (dotfiles-side): the daily sweep's status file now carries
  `byteGate` and `prunes` fields (404d5fc) that doctor has never
  seen — they need their three-answer doctor verdict with the first
  timer-path run (census-hardening report, NOT-VERIFIED slot).

- **DONE 2026-08-01 (8e28833, opus dispatch, dispatcher-verified
  114/114; agent live A/B on the evidence capture: violations 2->0,
  exemptions=2, gate exit 1->0) — reset-wipes-additions exemption.**
  Residuals, named: an append-only+reset pair stays a VIOLATION by this
  entry's own ccIdentical condition (future false red, named in the code
  comment); corpus-wide no-new-exemptions unmeasured until the next
  daily sweep; the status row now carries stabilityExempt so
  GREEN-by-exemption is visible to the doctor. Original entry: In
  scanGroup, beside freshSessionSortExemption: exempt a violation
  iff the after-request's deferred-tool-rewrite telemetry shows
  action=reset reason=tool-schema-changed AND the divergence is
  fully explained by removed tool_addition injection message(s) AND
  CC's raw messages are identical at outDiv. Build note: replay's
  compact stability entries do not carry deferredToolRewriteStats
  today (the evidence probe had to re-run the pipeline) — carrying
  action/reason into the entry is part of the build. Bite red-first
  on a synthetic pair pinning the shape; live confirmation: corpus
  violations 2→0 with exemptions=2 and the doctor cache-fix-gate
  goes GREEN. Urgency basis: a standing FAIL on a non-defect trains
  readers to discount the gate (the check-fires-on-non-defect
  shape). Evidence: the attribute file above.

- **RESOLVED 2026-07-30 (probe, dispatcher-booked): forwardedStable
  was a census framing gap — deferred-tool-rewrite is NOT broken.**
  100% of "unstable" pairs coincide with a genuine new-tool
  announcement; held/shared tools byte-identical on every checked
  repeat pair; first-event hypothesis measured out (3/25, 3/37).
  DONE 2026-07-30 (813edc8, sonnet, pushed after dispatcher
  verification: selfcheck exit 0; real capture s-captureC measures
  heldStable 37/37 against forwardedStable 1/37 — 100%, no
  counterexamples, stronger than the probe's hedge; deviation
  accepted: missing outTools data -> heldStable false, mirroring
  the existing convention). deferred-tool-rewrite's guarantee is
  now measured AS MADE by the daily sweep. Matrix row 6 updated
  same day with the measured number.

- **RESOLVED 2026-07-30 (probe; header re-titled 2026-08-01, body
  already carried the resolution — third stale-header instance that
  day) — duplicate-request contradiction: ~100 adjacent identical
  pairs vs the booked "one instance in 3,446"** (new per-conversation
  counter, 2026-07-30: 72+28 pairs in 21+2 streaks across the two
  current captures; the 07-29 probe that dispositioned CC#78420
  "ABSENT ON THIS SETUP" likely measured global file adjacency, so
  interleaved sessions broke adjacency — definition mismatch
  hypothesis, unverified). One streak matches the known MCP cascade;
  21 streaks in s-captureA (13+ repeats, 3-min spans) unexplained.
  RESOLVED 2026-07-30 (probe): definition-mismatch FALSIFIED by
  measurement (global vs per-conversation differs marginally); the
  growth is corpus content, and the streaks are retry-shaped —
  distinct ids, backoff intervals, ZERO outcome records (none
  billed): client retries against upstream/proxy errors, not the
  #78420 billing shape. Coverage row re-dispositioned same day.
  Residue, named: the error evidence itself arrives with the
  upstream-error-log flip (booked); streak timestamps vs error
  timestamps is the confirming check, rides the first week of that
  gate. Honest gap: the 07-29 probe's exact runtime/file list not
  recoverable.
  REVISED 2026-08-01: the zero-billed discriminator was SAMPLE-BOUND
  — the counter's first live run over the current corpus found a
  second population; see the double-billed OPEN entry below.

- **OPEN (attributed 2026-08-02: CC-defect-resend lean, upstream
  filing is the next step and needs operator GO) — double-billed
  duplicate pairs, now 33 streaks.** Sonnet discovery
  (dispatcher-spot-checked: the hand-verified s-captureK streak's
  two outcomes read identical outSha 610e911e / outBytes 2406 under
  my own probe): 33/33 double-billed streaks have byte-IDENTICAL
  response content between both billed answers — retry-refuting
  (a retry hoping for better gets different bytes); 79% land at the
  session's very first request (structural, not content-gated);
  upstream-error correlation 1/33 and that one sits inside a 2-hour
  401 burst (auth noise, not signal — 30/32 log entries are 401s).
  The entry's earlier degenerate-lean was the wrong lens: the
  content-class split (24 deg/deg, 4 deg/sub, 2 sub/deg, 3 sub/sub)
  is superseded by the hash identity. Residues, named: one
  outputTokens-vs-outSha accounting anomaly (s-captureT 654/656:
  same bytes, tokens 2 vs 1); the 7 mid-session streaks' trigger
  uncharacterized. Evidence: the discovery report in the
  dispatching session's scratchpad; re-derivable from the census
  duplicates key + outcome outSha join.
  INSTRUMENT DEFECT 2026-08-02, and it invalidates this entry's own
  "degenerate answer" reasoning: the capture outcome record's
  `usage.outputTokens` is the `message_start` PLACEHOLDER, never the
  completion length. request-capture builds the outcome on
  message_start only (request-capture.mjs:311) and its own comment
  says message_delta updates output tokens afterwards but waiting
  risks losing the record on a cancelled stream — a defensible
  choice, recorded under a field name that reads as final. Measured:
  in one 805-outcome capture, 803 responses exceed 20 kB while the
  MAXIMUM outputTokens ever recorded is 73, mass at 1-3. So every
  "outputTokens 1-2 => degenerate answer" inference is void — this
  entry's original one, the census's help text
  (reminder-migration-census.mjs:92,985), and the discovery's
  content-class split (24 deg/deg etc.), which its own outSha
  finding had already superseded for a different reason. The
  byte-identity result is UNAFFECTED (outSha/outBytes are real).
  A correct source already exists: cache-telemetry, request-log and
  usage-log read `event.usage.output_tokens` off message_delta
  (stream.mjs, cache-telemetry.mjs) — final, not placeholder. Fix
  design (proxy/**, so it RIDES THE NEXT PROXY BOUNDARY, never
  alone): rename to `outputTokensAtStart` in the outcome record and
  let consumers that want the real length join the request-log `n`;
  dependents search run before the rename lands (this entry's own
  grep found the census help text and the two test fixtures).
  Undiagnosed, named: the recorded distribution has a 34-73 tail no
  message_start story explains — not chased, and not needed for the
  invalidation above.
  UPSTREAM FILING BLOCKED 2026-08-02 by its own refutation probe
  (dispatcher, run BEFORE drafting): the report's open item 3 — "is
  CC actually sending two physically distinct HTTP requests, or is
  one proxy-side" — probed on the hand-verified s-captureK pair.
  Half-answered, and it reframes the finding. Both answers carry
  DISTINCT server-assigned request-ids (req_011Cdbpbge…,
  req_011Cdbpbgi…), so two real API calls were made and billed, and
  the proxy forwards one-inbound-one-upstream (server.mjs
  forwardRequest per request, no retry loop in the handler) — the
  duplication is client-side, not ours. BUT the pair is a HAIKU
  SIDECAR (model claude-haiku-4-5, msgs=1, max_tokens=32000), not
  the main conversation, and neither id appears in that session's CC
  transcript — which carries requestId 1648 times, so the absence is
  real rather than an instrument gap: background calls simply are not
  transcript-recorded. Consequence: "CC re-sends CONVERSATION
  requests" is the wrong framing for at least the session-start
  majority, which looks like the background sidecar double-firing —
  and session start is where 26/33 streaks sit by construction.
  SPLIT DONE 2026-08-02 (sonnet discovery, dispatcher-verified on
  s-captureK 751/754 with my own probe): of 31 double-billed
  streaks, 24 are HAIKU SIDECAR calls (nMsg=1, max_tokens=32000) and
  7 are MAIN-THREAD shaped (fable-5/opus-5, nMsg>1,
  max_tokens=64000) — clean split, zero ambiguous. The entry's
  "one pair near session start" shape is ENTIRELY a sidecar artifact:
  all 24 sit at capture lines 3-5, every session. Discriminator note
  from the build: system-prompt presence does NOT separate the
  classes (every request carries one, sidecars included) — message
  count + model does. TRANSCRIPT ASYMMETRY, the finding that makes
  the main-thread subset reportable: on s-captureK 751/754 (two
  fable-5 requests, 152 messages each, responses byte-identical at
  outSha 62baa3a1 / 3,043,768 B) CC's own transcript records the
  SECOND request-id three times and the FIRST zero times — so CC
  received a COMPLETE answer, discarded it, re-sent the identical
  request and kept the second answer; both were billed. Completeness
  matters to the reading: identical outSha means the discarded
  response was not truncated, which argues against retry-after-
  failed-stream and toward a genuine duplicate send. Across 3
  main-thread streaks checked, 0 had both ids present and 2 had
  exactly one — consistent shape, small n, stated as such. Then: fold into the #272/#273 week-of-soak
  summary (due ~08-07) and/or file upstream as the #78420-adjacent
  shape — Public Communication rule: draft first, operator approves
  before posting.
  Original entry: **double-billed duplicate pairs: 29 streaks live
  (dup-census first run, 2026-08-01), hand-verified at the
  altitude.** Two examples records-read-directly: s-captureK lines
  3/5 (identical 2384-char haiku bodies, 14 ms apart, BOTH answered,
  587 input tokens charged EACH) and s-captureT lines 654/656
  (identical 1.84 MB fable bodies 11 s apart, both answered;
  outputTokens 2 and 1 — the first answers look degenerate; second
  read 360k cached). Corpus rollup: 71 pairs / 67 streaks / 32
  billed / 29 double-billed of 10,454 same-conversation pairs.
  Shape: one pair near session start per session + scattered
  mid-session. OPEN question: CC defect (needless re-send, the
  #78420-adjacent shape) vs legitimate retry after a degenerate
  answer — the outputTokens 2/1 pattern leans retry-after-degenerate
  but is unclassified. Next evidence: inspect the paired answers'
  content class; correlate streak timestamps with upstream errors
  once the error-log gate flips (same rider as the retry residue
  above). Not comparable to the 07-30 numbers: that sample's capture
  aged out of the corpus mid-measurement.

- **DONE 2026-08-01 (194baf2 + dispatcher wiring, sonnet dispatch,
  dispatcher-verified) — duplicates wired into the daily gate.** Two
  corrections booked from the build: the census `duplicates` key is
  produced by reminder-migration-census.mjs, not replay.mjs; and no
  "volatile-change metric consumer" existed as code to pattern on — the
  verdict follows shape-verdicts' three-answer convention instead.
  Field lands with the next daily run (deployment-side). Original
  entry: tools/gate-live.mjs summariseCensus (≈:134-149) whitelists
  pairs/unreadable/tally/extendedSub/prunes and drops the census's
  new `duplicates` key; add it plus a sweep-level reduce so the
  status file carries pairs/streaks/billed/doubleBilled per sweep —
  that line is what makes Q1's "re-answers daily" true, and
  doubleBilledStreaks is the alarm column (first standing consumer:
  shape-verdicts, same pattern as the volatile-change metric).
  Verifier: the field present in the next daily status file with
  the live numbers; a synthetic sweep bite red-first on the dropped
  key. Effort S.

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

- **RESOLVED — census flap annotation: shipped BEFORE the dispatch
  that was sent to build it (fc44da3 marker + 47defba addendum, both
  ancestors of the dispatch base 94cbf82; caught by the census-pair
  agent's premise check, git log on the target file, before any
  build — its lesson (i)). Entry left by those refs; joined-standalone
  below resolved by 9ff79f7 the same night (dispatcher-verified:
  selfcheck 66/66, full suite 1848/1848/0; live slice of s-captureB:
  "10, 6 FLAP, 7 JOIN (3 cross-message)" vs "3, 2 FLAP" at base).
  CORRECTION riding this (agent gap 2, matrix updated): the
  addendum's "the real flap is the single 92→94 pair" is REFUTED by
  the live run — THREE hosts reverse, so row 4's 221k event was
  priced at a third of its true size.** Original entry kept below
  for the record.
  Original: census flap annotation (blockMigration reversal).
  `replay.mjs --census` emits a `flap` marker when the same
  blockMigration block-hash pair reverses direction within 5 requests
  of one conversation — today the flap is visible only by reading
  adjacent census lines (matrix 8cd4e1c). Verifier: emits on the
  2026-07-30 triple (n=102-108), silent on a corpus without reversals;
  mutation test in replay-gate-selfcheck per dev-loop "Adding a check".
  ADDENDUM (same day): detector counts REAL migrations only — the
  blockUnits standalone predicate over-reports 2x (phantom on any
  message shrunk to one block); its fix granted to the running
  annotation builder, red-first, before the detector lands. On the
  2026-07-30 triple the real flap is the single 92->94 pair reversing.

- **RESOLVED 2026-07-31 (9ff79f7, census-pair dispatch — see the
  flap-annotation resolution above for the shared evidence; kinds
  tagged in-entry vs cross-message, join hashes on compactEntry, no
  text retained, dead blockUnits removed).** Original: blockUnits
  hashes blocks individually, so a standalone that is a JOIN produces
  no migration row — two of the three standalone legs in fixture
  flap-s-captureB-86.json are joins the detector cannot see, and the
  s-captureA oscillation (fixture oscillation-s-captureA-863.json)
  shows a whole flap class invisible for the same reason. Design:
  register joined-block hashes as migration-candidate targets —
  in-entry joins per 78940a0's "\n\n" rule; cross-message joins
  tagged as their own kind (they are the parked design item's
  subject, and the tag is what will count them). Verifier: red-first
  on oscillation-s-captureA-863.json — a migration row appears for
  the merged standalone where none does today; existing corpora
  verdicts unchanged. Done-criterion: census on that fixture shows
  the join-standalone row; selfcheck mutation test added per
  dev-loop "Adding a check".

- **RESOLVED 2026-08-01 (eead8bc, loop-trio dispatch,
  dispatcher-verified 126/126; live ledgers verifiably untouched).
  Done-criterion ruling (its G1): SATISFIED — the entry named a
  SPEND case as the test case for a THRESHOLD detector (the 1.07M
  fable-verify dispatch had a healthy cache; zero threshold events
  is the CORRECT answer, and its spend rides the totals row), and
  the entry's intent — subagent busts worktime cannot see — is
  decisively measured: six events, ~1.5M cc, on 07-30 alone, none
  in worktime's ledger. Feasibility answer: NO new response tap —
  request-capture outcome records carry usage since e57a0de.
  Follow-up decisions → the wiring/grain OPEN entry below —
  proxy-side cold detection: subagent-complete bust
  visibility (loop: SEE).** worktime's cold ledger is main-session
  only by design; subagent spend is invisible (a verify dispatch cost
  ≈1.1M processed tokens dedup-corrected, excavated by hand from
  transcript files).
  The proxy sees every request and response. Step 1, named
  feasibility: confirm usage fields are extractable from the proxied
  response path (SSE message_delta usage) against a captured
  response; step 2: per conversation-key cc/cr running totals +
  magnitude-threshold events (runbook rule: cc>=60% of prior ctx,
  cr<=20%) appended to a cold-events ledger with key + model.
  Verifier: reproduces worktime's main-thread events AND surfaces a
  subagent event worktime cannot see (the 2026-07-30 fable verify
  dispatch is the known test case). Done-criterion: that dispatch
  would have produced an event row.

- **RESOLVED 2026-08-01 (0486395, loop-trio dispatch,
  dispatcher-verified; entry verifier 5/5 evidence classes PRESENT
  against the 07-30 16:57 event, matrix-datapoint facts verbatim;
  bonus find: the gh sweep surfaced anthropics/claude-code#81077 —
  the row-4 class already filed upstream, logged on the fire-rate
  entry as its upstream-ref candidate) — bust dossier tool
  (loop: ATTRIBUTE).** `tools/dossier.mjs
  <utc-timestamp|--last>`: emits ONE file joining the worktime row,
  the prefix-diff snapshot-ledger slice for the window, census lines
  for the affected pairs, transcript context pointers, and the
  dev-loop-mandated `gh search issues` sweep. The runbook stays the
  interpretation guide; collection stops being manual. Verifier: run
  against the 2026-07-30 16:57 event — the dossier must contain the
  facts the hand investigation established (matrix Row 4 datapoint is
  the expected-content spec). Done-criterion: one command, one file,
  all four runbook steps' evidence present or explicitly marked
  absent (three-answer rule).

- **RESOLVED 2026-08-01 (7a4f226, loop-trio dispatch,
  dispatcher-verified; ENOENT-strict "new key" predicate — the one
  surviving mutant got its own seventh bite; activation rides the
  next proxy boundary, no deploy performed) — key→conversation map
  (rides the dossier; loop:
  ATTRIBUTE).** prefix-diff appends one line per NEW key — (key,
  session-id, model, first-seen ts) — to a keymap ledger; deletes the
  runbook's "the mapping is recorded nowhere; select by TIME"
  friction. Verifier: the 2026-07-30 main-vs-verifier key confusion
  becomes a single lookup.

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

- **RESOLVED 2026-07-31 — reserved-entry identity built, criterion
  met and exceeded (a1170a7 integration, fad6f6b build, da8b837
  verdict-ab, 0cc05c7 perf, 9983a1b docs; opus dispatch,
  dispatcher-verified: suites 253/0 and 1826/0 re-run, s-captureC
  five gates 0/0/0/0/0 re-run, verdict-ab --seed-from-a IDENTICAL/44
  re-run).** Was READY with the directive as brief. Corpus-wide:
  stability 10 → 2, both survivors deferred-tool-rewrite on
  s-captureB, ZERO insertion-normalization violations left; the
  ordinal collision turned out to be firing on four captures, not
  one. All three unit-2b TODO tests now pass — TODO 15's control was
  symptom-parented and was rewritten by the dispatcher to assert the
  definition (n=197 normalized). Lapse read ratified (dropped
  outright). Deployment rides the restart boundary. Residuals below
  in the PARKED reserved-entry-residuals entry; verdict-ab self-test
  its own READY item.

- **RESOLVED 2026-07-31 (687cbc5, opus dispatch,
  dispatcher-verified: full suite 1839/1839/0 on main
  post-integration; report
  docs/code-reviews/fixture-sanitization-report.md) — fixture
  sanitization, directive §§1-5.** 9/20 absence bites red-first on
  the old fixtures (5 raw PNGs, 83 live timestamps, 3 UUIDs, 57 raw
  strings, 4 raw signatures); verdict-neutral across all 44 corpus
  verdict lines; all 9 non-LEDGER fixtures rebuilt+renamed;
  oscillation fixture's "already tokenized" premise REFUTED and
  fully rebuilt; the merged-join byte-equality is now a CHECK,
  retiring the raw-retention precedent. §6 (upstream rewrites)
  stays reviewer-gated. Dispatch gap dispositions: (g1)
  LEDGER-Siren.json's 42 session UUIDs + wall-clock = ACCEPTED
  RESIDUAL for this local/controlled deployment per the operator's
  2026-07-31 corpus-hygiene ruling; tokenizing the ledger is PARKED
  below. (g2) hardcoded UUID + /home path in two test REAL_CAPTURE
  defaults → READY item below. (g3) four stale fixture-name
  comments: replay.mjs's two fixed same evening; the extension's
  two ride the next proxy boundary (folded into the blocker-3
  item's note).

- **PARKED — tokenize LEDGER-Siren.json keys (g1 follow-up).**
  Accepted residual today (operator ruling, local deployment);
  becomes real work only if the ledger ever feeds a PR slice or a
  non-local consumer. Same sidToken scheme harvest now uses;
  consumer to name at build time: growth snapshots + doctor
  bookings read it.

- **RESOLVED 2026-08-01 (eb4f844, fixture-cut dispatch,
  dispatcher-verified) — test REAL_CAPTURE defaults (g2).** With a
  correction to this entry's own design: "newest capture" was wrong
  on contact with the data (the newest file belongs to an unrelated
  conversation and fails the pair assertions) — the landed fix
  recovers the capture by HASHING candidates (sidToken(filename) ==
  fixture header.key over the capture dir); override kept, designed
  skip kept, no identifier in source. Lesson booked: a backlog
  entry can carry a decision falsified by one ls. The verifier's
  "zero UUIDs in test/ source" is now a standing mechanism:
  absence-scan.test.mjs source-allowlist test (red-first on the two
  live instances it then caught — census-block-migration comment +
  tools/replay.mjs, both fixed same commit).

- **RESOLVED 2026-08-01 — prepared PR-slice branches: all conditions
  met, rewritten and pushed.** #272 rewritten (tip 720ecb4, forced),
  #276 rewritten via filter-repo + sanitization sync commit (tip
  8bb3af4, forced), #281 rebased (fb63f61, forced), the join-moves
  branch rebuilt from the rewritten tips and pushed as draft PR #295;
  rewrite-done comments on #272 (issuecomment-5151725115) and #276
  (issuecomment-5151722072). Full verification per
  docs/audits/pr-prep-2026-08-01/rewrite-plan.md status ledger.
  Original entry (conditions historical): State: pr/verification-tools
  advanced 53761a3 → a0a051f (15 commits, tools/ byte-equal to fork
  main) in worktree cache-fix-pr4; NEW pr/insertion-join-moves at
  fbec02f (b713b2f + merge of a0a051f + 7 commits, extension
  byte-equal to fork main) in worktree cache-fix-pr12; both merge
  clean onto upstream/main 0817302; suites green except the
  pre-existing proxy-read-dedupe failure (#272 open blocker 4,
  proven pre-existing at 53761a3). Drafts + exact push/gh commands:
  docs/audits/pr-prep-2026-07-31/. Conditions before any push:
  (1) MET 2026-07-31 late (687cbc5) — fixture-sanitization §§1-5 on
  fork main;
  (2) MET 2026-08-01 10:53Z — the #272 reviewer CONFIRMED the path
  on-thread ("On the rewrite — go ahead … Force-push when ready;
  nothing here depends on the current SHAs"):
  cnighswonger/claude-code-cache-fix#272 issuecomment-5151107400,
  replying to the operator-approved plan issuecomment-5147223070.
  Same comment sets the landing order: after #272's rewrite lands,
  rebase the stack #273 → #276 → #278, #281 last; reviewer will
  re-review #272 from the top (fresh round, review state already
  changes-requested); Chris review still required (load-bearing);
  (3) the prepared branches are then REBUILT carrying only clean
  fixture blobs (both are unpushed, so no force-push is needed on
  them; #272's own branch rewrite is the reviewer-coordinated one).
  Rewrite detail from the hardening gap 3 disposition: the slice
  copies of insertion-normalization.mjs drop the capture-prefix
  half of the fixture-name comments — the token↔capture pairing
  stays fork-only.
  Also fold in at push time: the stacked PR body should name #273
  as the third stacked parent (the merge carries
  deferred-tool-rewrite.mjs).

- **RESOLVED 2026-08-01 (measurement 97867f3, directive 40c11b2,
  delivered on-thread: PR #272 issuecomment-5151089462; decision =
  evidenced allowlist monitored by the daily census IN-PLACE-TEXT
  metric, fail-closed re-pin is the build trigger on first
  occurrence) — #272 blocker 2: a reminder-only BYTE change is
  re-served stale (reviewer: "not patchable, needs a directive" —
  agreed, and it is a genuine fidelity question, not appeasement).**
  Volatile exclusion IS the pin mechanism, so the extension cannot
  currently distinguish CC re-serializing a reminder (pin, correct)
  from CC changing its bytes (stale forward, fidelity risk; reviewer
  reproduced OLD→NEW overridden). Measurement FIRST, design second:
  the corpus can answer how often pinned volatile bytes actually
  change across matched entries (census-style sweep over harvested +
  live captures). Outcome shapes the design — measured-never → the
  evidenced allowlist the reviewer offered as the alternative;
  measured-real → fail-closed re-pin (store the NEW bytes, honest
  reset of that boundary only). Deliverable: the directive the
  reviewer asked for, with the measurement inside.
  ALSO IN THE DIRECTIVE (2026-08-01 GO): the fixture-strategy section
  the reviewer asked for — synthesized-by-default for public trees,
  harvested-and-scrubbed as the justified exception gated on the
  absence scan; minification; the body/headers-retention question
  answered together with the persistence story; and the widened
  public-repo hygiene class (conversation/capture data alongside
  origin-server info) proposed for upstream's CLAUDE.md.

- STANDING GO (operator, 2026-07-31 late): the held execution items
  below — blockers 3+4, census flap annotation, joined-standalone
  target — dispatch WITHOUT a further per-item GO the moment their
  file sets free (the fixture-sanitize lane closing is the trigger
  for the test-file overlaps). The same standing GO covers the
  design-tier openers (blocker-2 measurement+directive, enormous
  prunes, placement re-check, and the s-captureB
  deferred-tool-rewrite pairs' ATTRIBUTE step — telemetry pull +
  three-way classification per its OPEN item) at next session
  start.

- **RESOLVED 2026-07-31 (blockers 3+4, opus dispatch,
  dispatcher-verified: full suite 1843/1843/0 on main; report
  docs/code-reviews/hardening-blockers34-report.md).** Blocker 3:
  write-owner-only primitive, 27 write sites / 18 extensions, mode
  at create + lazy chmod (Node's mode option is CREATE-only — the
  booked lesson), red-first 0/4 → 4/4 with mutation-split
  mechanisms. Blocker 4: adjacency NOT load-bearing (grep basis:
  read-dedupe.mjs has zero cache-control references); assertion
  already green on fork main since 60cb337 — the missing piece was
  the recorded reasoning, now beside the assertion. Gap
  dispositions: prefix-diff's truncated raw snapshot KEPT
  (diagnostic purpose; 0600 covers; same treatment as canon
  entry.m); the token↔capture-prefix comment pairing stays on fork
  (association already public here) but the §6 slice rewrite DROPS
  the capture half upstream (noted on the HOLD entry); missing
  proxy-read-dedupe.md directive → READY item below. NEXT PROXY
  BOUNDARY owed (pin bump + restart + gate): carries 0600 +
  comment fixes; row-3 clear per the report (no state keys, no
  freeze logic, no order change).

- **RESOLVED 2026-08-01 (0c487c7, fixture-cut dispatch,
  dispatcher-verified: grep leaves no citation not immediately
  followed by "was never committed") — proxy-read-dedupe.md refs.**
  Conservative branch taken per the entry's rule: the header carries
  contracts but no goal/threat-model and defers to sections it
  cannot supply (incl. an open msgIdx question) — extraction would
  have meant new claims, so both refs now state the file never
  existed and point at extension-impact-guide §12.

- **PARKED — harvest --pin --replay-from K (fixture-cut c3).**
  runPin always writes replayFrom 0 + the full prefix, so
  regenerating the pinned fixture would restore the 432 kB dump.
  Ruling 2026-08-01: minimization STAYS a post-step gated by
  tools/fixture-verdict-identity.mjs — the floor is swept per
  fixture, not a harvest parameter. Trigger to build: a second
  fixture needing minimization at harvest time.

- **RESOLVED 2026-08-01 (78bf112, ready-bundle dispatch,
  dispatcher-verified; mutants derived at test time, fixture
  discovered shape-agnostically, both reds land inside the
  comparison; known limit: one replayable fixture today, first by
  sort order if more appear) — committed bite for
  tools/fixture-verdict-identity.mjs (fixture-cut c2).** test/fixture-verdict-identity.test.mjs seeding
  both demonstrated reds as fixtures: (1) a cut missing a covered
  ordinal → coverage divergence; (2) a cut keeping every record but
  stripping the pin-establishing reminder bytes → outHash
  divergence inside the comparison. Verifier: both seeds exit 1
  with the named divergence, the real pair exits 0. Done-criterion:
  node --test green + both mutants bitten.

- **RESOLVED 2026-08-01 (df902a2, ready-bundle dispatch,
  dispatcher-verified: red-first on exactly 7 real hits, tokens
  cross-checked against committed fixture names by executing
  sidToken, org-id redacted per the asymmetry ruling, source scan
  now walks docs/) — docs/ UUID triage (source-scan follow-up).** Full
  8-4-4-4-12 UUIDs appear in 9+ files under docs/ (sweep
  2026-08-01: code-reviews, directives, release-tests, audits).
  Classify per hit: synthetic example vs capture/session-derived;
  tokenize the real ones (burn-forward, history unscrubbable);
  uncertain → surface, never guess. Verifier: extend the
  absence-scan source test's scope to docs/ with the synthetics
  allowlisted — the extension IS the done-criterion.

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

- **DONE 2026-08-01 (8578ebb + sweep wiring, sonnet dispatch,
  dispatcher-verified: red-first on 4 of the 5 named instances; the
  5th, blocker-4 dup, is a CROSS-entry duplicate outside the same-entry
  rule — resolved by deletion in 9ae9e9b, and cross-entry near-duplicate
  detection deliberately not built) — backlog header lint (FIVE stale headers found
  2026-08-01: row-4, blocker-4 dup, duplicate-request,
  merged-standalone, final-message strip — each header
  contradicting its own body's recorded resolution; two of them
  mis-graded a survey before being caught).** tools/backlog-lint.mjs,
  WARN-only: flag an entry whose header grade is OPEN/READY/HOT
  while the SAME entry's body (scoped `- **` to next `- **`)
  carries a dated resolution marker (RESOLVED/FIXED/BUILT +
  VERIFIED/CLASS CLOSED). Verifier: red on the five instances as
  they stood at 40c11b2 (`git show 40c11b2:BACKLOG.md`), zero
  false fires on the current file. Done-criterion: lint in tools/,
  red-first demonstrated, wired as a WARN into the daily sweep or
  doctor.

- **RETIRED-marker (see RESOLVED above) — original blocker-3 entry
  follows for the record.**
  Original: conversation-derived state
  files land at ambient umask with raw bytes. Canon/events (this
  extension), request bodies (#275), system prompts (#280) — same
  shape three times; the reviewer asks to fix it once as a pattern.
  Fork-side too: ~/.claude state written by the serving proxy. Build:
  explicit 0600 on every conversation-derived write (one helper,
  grep-established call sites stated), hashes instead of raw bytes
  where bytes are not structurally required (canon `entry.m` IS
  structurally required — that stays, documented). Verifier: a bite
  asserting mode 0600 on freshly written canon/events; sweep of
  existing files chmod'd at deploy.

- DROPPED 2026-08-01 (duplicate): the #272 blocker-4 adjacency entry —
  already resolved 2026-07-31 (see the RESOLVED blockers 3+4 entry
  above: adjacency not load-bearing, assertion green since 60cb337,
  reasoning recorded beside it). The prepared branches' known-red is
  cured by their rebuild (HOLD entry, condition 3).
- **RESOLVED 2026-07-31 (1770a97, small-pair dispatch,
  dispatcher-verified: 11/11 tests) — verdict-ab self-test.** (This
  bullet's header had been consumed by a neighboring edit — the
  second same-day instance of the header-splice shape, this time the
  dispatcher's own; restored as its resolution.) Skip-list derived
  at test time by a shape-agnostic search, no fixture named — rename
  -safe by construction; four mutants each bitten, including the
  historical 2-of-6 reader-narrowing miss.

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


- **RESOLVED 2026-08-01 (dotfiles 7d1b3df, verified live on a blocked
  push; fork-side exemption 9db47fc) — absence-scan run-seam: the class
  recurred one day after the mechanism shipped, and the seam is now a
  pre-push guard.** 2026-08-01: seven full-UUID
  literals of capture 0d6f38ba landed via three loop-trio commits
  and were pushed public with absence-scan.test.mjs already on main
  (red-first mint 2026-07-31, the g2 entry above) — the mechanism
  caught nothing because nothing runs it at the push seam; it fired
  only when a later session ran the suite by hand. Fixed forward
  f1fc59f (existing proxy-suite synthetic swapped in, no allowlist
  growth; the leaked UUID itself is unscrubbable history, same
  accepted-residual class as the LEDGER keys, PARKED above).
  Decision RESOLVED 2026-08-01 — by the operator's dotfiles,
  independently and before this entry was booked: pre-push
  absence-scan guard deployed 10:47 (dotfiles 7d1b3df), runs the
  pushing tree's tools/absence-scan.mjs over every outgoing range,
  EMPTY..tip for new refs. Verified live the same day: blocked a
  new-branch push on upstream's own transcript-shape fixture —
  a pre-existing-third-party false fire, repaired by declared
  ALLOWLIST exemption with provenance (the guard's documented
  remedy), not by --no-verify.
  Same day, same prose-vs-guard shape: reader worktrees
  (dispatch-discipline's frozen-reader recipe) have no removal
  clause — two frozen /tmp probe worktrees found still registered
  days after their sessions ended (verified clean ancestors,
  removed 2026-08-01); the discipline edit's carrier is ~/.claude
  (operator corpus, GO owed).

- PARKED 2026-08-05 — READINESS residue for this repo, awaiting the
  executor-skill + §6 reshape (dotfiles backlog e519b8c). Under the
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
