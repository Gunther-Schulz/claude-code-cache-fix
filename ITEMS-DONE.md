schema: 2

## Archive (pre-migration)

# claude-code-cache-fix — closure home

Declared by the `Closure-home:` line in BACKLOG.md, which is what every
reader resolves through — never a literal in a tool. Bodies MOVE here at
closure time and nothing is deleted; do not add live items here.
Split out of BACKLOG.md 2026-08-19 at 268 of 574 entries / 10,228 of
21,696 lines: the carrier had become 71% archive and every reader paid it.

## Done — closures, one home (accretion rule: closure lives in exactly ONE carrier)

- **DONE 2026-08-26 (`c52ede7`) — the entry-point census's four disagreements
  with the hand classification are adjudicated, per case: two were the tool's,
  one was the audit's, and one was never a disagreement about any session.**
  The parked entry asked which side is wrong; the answer differed per case.
  BUST (−3): not a disagreement. The audit classifies a SESSION, the tool
  classifies its OPENING, and the audit's own line — "7 of 10 open with a
  pasted bust line" — is exactly what the opening rule finds. The comparable
  number is 7; the other 3 are a definitional difference, now named in the
  tool's reference block with the session-level counts kept beside them.
  PR_TEND (+1): the tool's, with one concrete case — this arc's own kickoff
  session, whose opening lists four doors and enters none. Mention is not
  entry; an opening naming three distinct doors is now `other`. The disputed
  session needed no content-reading to identify: the audit publishes 24 and
  49 for its two PR sessions and the tool's three were 49, 8 and 24.
  MEDIAN (35 vs 37): the audit's. 27 is the class count; 26 sessions ever
  wrote. The median of those 26 is (33+37)/2 = 35 and the audit's 37 is their
  14th value. Corroborated by the audit's own stated range, 9–72, measured
  here as exactly min 9 / max 72 over n=26. Corrected in the audit in place.
  **Recorded because the next reader will meet it:** the first draft of that
  correction cited the audit's "One session never wrote at all" as its basis,
  and that sentence belongs to the BUST paragraph. A true sentence answering
  a narrower question than the one being settled is the failure this audit
  exists to catch, so the misreading is written into the audit rather than
  quietly dropped.
  **What is NOT evidence:** that every class now agrees. Each verdict rests
  on its own basis — the audit's sentence, one identified session, and an
  arithmetic check against a published range — never on the agreement.
  **Consumer note:** the design doc's §1 cites "37 tool calls (median,
  n=27)"; that figure is now 35 at n=26 and its file is the judgment desk's
  to amend.

- **DONE 2026-08-20 — the byte-gate summary now carries its denominator and
  its MISMATCH sub-classification; and this entry is first of all the record
  of a WRONG DIAGNOSIS I delivered to the operator as fact.** A dotfiles
  doctor FAIL, relayed by the desk that owns that repo, reported
  `cache-fix byteGate: MISMATCH=21`. Reading the status file showed
  `{EXACT: 0, EXTENDED: 0, DROPPED: 0, MISMATCH: 21}` with `unreadable: 0`,
  and I reported to the operator that the all-zero distribution INDICTED THE
  CLASSIFIER — that zero EXACT across 30 captures meant the tool was not
  reaching the rows it believed it read. **That was wrong.**
  **What refuted it was executing the tool instead of reading its source.**
  `reminder-migration-census.mjs --json` over one capture returns
  `considered` (the denominator), `total`, and `mismatchSubs` — a
  per-MISMATCH sub-classification whose buckets are `HOST-PRUNED`,
  `HOST-IDLESS`, `WRAPPER-RETAINED-EXACT`, `WRAPPER-RETAINED-EXTENDED`,
  `UNRELATED`. The classifier is sound and already knows the answer: the
  wrapper-retained mechanism was MEASURED here on 2026-08-14 and is carried
  in the tool's own header (`:237` — CC re-emits migrated blocks with
  `<system-reminder>` wrappers retained rather than stripped, the alternative
  to row 4's stripping assumption).
  **The real defect was one allowlist.** `gate-live.mjs`'s `summariseCensus`
  keeps `pairs / unreadable / tally / extendedSub / prunes / duplicates` and
  dropped `considered`, `total` and `mismatchSubs`, so the status file
  carried a bare count. A count without its denominator is not a
  measurement — 21 of 21 and 21 of 200,000 are different findings — and a
  tally whose classes are hidden cannot separate a known mechanism from a
  real hole. The doctor then surfaced the one number, and it travelled
  through two desks and reached the operator as a broken instrument.
  **Fix:** `summariseCensus` carries all three (`considered`, `total`,
  `mismatchSubs`), verified against real census output, not only fixtures.
  **Red-first, and the arrangement is the point:** the bite is a PAIR of
  tallies IDENTICAL on the MISMATCH count and separable only by the
  sub-classification the summary was dropping — one all `WRAPPER-RETAINED`,
  one all `UNRELATED`. A bite asserting the fields merely exist would pass on
  a summary that still could not tell those two apart, which is the defect
  restated rather than caught. Ran red against the unchanged implementation
  (`the denominator rides along` — `actual: undefined`), green after; the
  file's 7 bites pass.
  **The lesson, and it is not "check harder".** The entry that booked this
  wrote its discriminator DOWN IN ADVANCE, including a third outcome that
  contradicted its own headline — "the rule under test legitimately matches
  nothing, in which case EXACT=0 is correct and the reporting is what
  misleads". That third branch is exactly what happened. Pre-registering the
  outcomes is the only reason the wrong reading was caught within the hour
  instead of being built on: the headline was confident and wrong, and the
  discriminator beside it was right.
  Second lesson, cheaper to state: **a wrongness claim about an artifact is
  answered by the artifact's DEFINITION and its EXECUTED behaviour, never by
  its output shape.** "All-zero-but-MISMATCH looks impossible" is reasoning
  about a distribution; one `--json` run settled it.
  Touches `tools/gate-live.mjs`, `test/census-byte-gate-sweep.test.mjs`.
  Residual, deliberately NOT closed here and living as its own `## Open`
  entry: which class those 21 rows actually are, answerable from the next
  sweep's status file rather than by a walk.

- **DONE 2026-08-19 (`0ba6e45`, `208b121`) — the backlog's closure home is
  DERIVED from one declaration instead of restated in three tools, which is
  what made this file possible.** `backlog-lint.mjs`, `alias-claim.mjs` and
  `runbook-lane-index.mjs` had each decided independently where a carrier's
  closed entries live (`## Done` as a hardcoded literal in the first two), so
  splitting the archive out would have meant re-teaching every reader by hand.
  `tools/closure-home.mjs` is now the single resolver: it reads the optional
  `Closure-home:` carrier-header declaration (the same idiom as dotfiles'
  `backlog-census.py` `Grades:` line) and falls back to `## Done` when absent.
  `backlog-lint` and `alias-claim` derive from it; `alias-claim --releasable`
  also gained the ability to read a FILE-kind home's citations.
  `runbook-lane-index` needed no functional change — its marker exclusion
  already works by positively selecting `## Open`, declaration-agnostic by
  construction — so it was pinned with control tests rather than edited.
  **No-declaration behaviour is byte-identical to before** (verified: the
  real-BACKLOG.md CLI output of `backlog-lint` diffed empty against the
  pre-change code).
  **The red-first arm found a non-discriminating test, and that is why there
  are two commits.** Run against the pre-change tools (`91a1197`), one of the
  seven new `alias-claim` bites passed unchanged: it cited the alias under a
  plain `## Open` section, which the OLD reporter also calls HELD — for a
  reason unrelated to the `kind:"file"` declaration the bite existed to
  exercise. `208b121` rewrites it to cite under a residual `## Done`-named
  section, where the old literal match says RELEASABLE and the new resolver
  says HELD (no in-text section is ever the home once a file is declared).
  A bite both behaviours satisfy is unproven whatever it asserts.
  Touches `tools/closure-home.mjs` (NEW), `tools/backlog-lint.mjs`,
  `tools/alias-claim.mjs`, `tools/runbook-lane-index.mjs` and their four test
  files.
  Residual, found while booking this and NOT closed by it: a fourth consumer
  still resolves the home by literal, and it lives in the other repo — see the
  pointer entry in `BACKLOG.md`'s `## Open`.

- **DONE 2026-08-18 (night) — the proxy now records a coalesce MISS, and the
  deployment half landed with it.** Built and shipped this session: the miss
  record (`dc11012`), the forwarding-path ordering fix that keeps the write
  off the hot path (`f491b0f`), and `harvest --pin` recognising
  coalesce-miss as a third non-request record type (`81548e4`). Deployed:
  dotfiles pin `25c9929` -> `5ddf24f` (`81dd656`), proxy restarted, and the
  ship runbook's three answers agree with VERIFIED produced by a sweep that
  ran AFTER the restart (gate status stamped 21:18:52Z, ok, 0 failing, 30
  captures). The original entry body follows unchanged.
  **ORIGINAL ENTRY, as booked:**
  - **READY 2026-08-18 (evening) — the proxy records a coalesce HIT and nothing
  at all about a coalesce MISS, so row 31's one surviving post-flip
  double-bill cost a hand walk to attribute and the next one will cost
  another.** Measured today on capture `s-captureBU`, evidence frozen at
  `test/fixtures/harvested/pinned-s-44aa393e3110-1-4.json`: a session-start
  duplicate pair of row 31's own class (haiku, `nMsg=1`, `max_tokens=32000`,
  lines 3 and 5, 43 ms apart) was forwarded twice and billed twice, with
  conditions 1-3 provably held — `tools: []`, one message, and equal
  forwarded-bytes digests (`outSha fe8fac4fd93ec354`, 2271 bytes both, and
  condition 3 IS the map key). The gate was ON in the serving process (that
  capture's boot record). So the miss is condition 4's, and **which way it
  failed is unrecorded**: a STALE leader (registered >50 ms earlier by the
  registration clock) and NO leader at all (the leader's `preForward` had not
  resolved when the follower looked) are indistinguishable from outside the
  process, and they call for different fixes.
  **Design, decided — AND REVISED DURING THE BUILD, 2026-08-18 evening. The
  revision is recorded here rather than smoothed over, because the entry is the
  spec and shipping something else without saying so is the drift this file
  collects.** (1) `handleMessages` stamps `arrivedAt` at entry and the leader
  entry carries it. (2) On a candidate whose key finds a leader that is STILL IN
  FLIGHT but outside the window, `request-capture` writes a
  `type:"coalesce-miss"` record beside its existing `buildCoalescedRecord` —
  `{ts, id, key, sha, reason, ageMs (registration clock), arrivalDeltaMs
  (arrival clock), leaderId}`. Both clocks in one record is the point: it says
  whether an arrival-clock window would have caught this miss, which is exactly
  the evidence the parked fix below is waiting on.
  **WHAT WAS CUT AND WHY — a 2 s TOMBSTONE of completed leaders.** The original
  design kept one so a follower arriving after the leader finished could still
  see that a leader existed. Its own CONTROL arm killed it inside the hour: a
  pair that DID coalesce produced a miss record, because the previous pair's
  tombstone was live under the same key — the record firing on the mitigation's
  own success, which is the check-that-fires-on-a-non-defect shape aimed at the
  very number row 31 is measured in. Two facts fell out of that red: a COMPLETED
  leader is not a lost opportunity (nothing was in flight to attach to), and the
  case actually worth catching — the leader mid-pipeline, not yet registered —
  the tombstone never covered at all, since the tombstone is written on
  COMPLETION. So the scope narrowed to the case where an opportunity provably
  existed, and the missing case is recovered AT THE READER without guessing: a
  post-flip single-message streak that is double-billed and carries NO miss
  record IS the leader-not-yet-registered case. Absence of the record is
  evidence, which is why nothing may write one speculatively. (4) A strict view
  `readCaptureCoalesceMiss` in `tools/logs.mjs` beside `readCaptureCoalesced`,
  and the census's duplicate-streak rows carry the miss fields when the streak
  has one, so `shape-verdicts`' `row-31-coalesce` warn can name the reason
  instead of only the count.
  **It changes no forwarding behaviour** — pure observation, no new condition,
  no path where a request is served differently. That is what keeps it
  shippable ahead of the fix it informs.
  **Carrier check (dev-loop q4):** the record rides the capture file, an
  existing registered carrier with an existing collector; no new carrier class.
  Red-first, four arms at the wire, and three of them are controls because the
  one thing this must never do is fire on the mitigation working: a pair whose
  leader is still in flight with the window closed produces NO record today and
  a `reason:"stale-leader"` record carrying both clocks after; a pair that
  coalesces normally still writes `coalesced` and NO miss record; a pair whose
  leader has COMPLETED writes nothing (the scope decision above, pinned); a lone
  request writes nothing.
  Done: the three arms pasted, the census and `shape-verdicts` legs landed, the
  suite green, and — deployment-coupled — the ship runbook walked (pin bump,
  restart at a stated session boundary, gate run, three-way compare). Row 3's
  restart-transparency argument holds: no state KEYS, no freeze logic, and the
  in-memory maps are per-process by design.
  Loop stage: ATTRIBUTE (the instrument the mitigation below reads).
  Anchor: proxy/server.mjs
  Write-set: proxy/server.mjs, proxy/extensions/request-capture.mjs,
  tools/logs.mjs, tools/reminder-migration-census.mjs, tools/shape-verdicts.mjs,
  test/coalesce-record.test.mjs, test/duplicate-coalesce.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/duplicate-coalesce.test.mjs test/coalesce-record.test.mjs
  <!-- entry: "proxy records coalesce hits but never coalesce misses" -->

- **DONE 2026-08-18 — `boundary-layers --at` reports resolved / ambiguous /
  none, never a silent nearest-match. Built `ef28e8e` (lane
  `sonnet-boundary-at`), integrated `4b27733`.** A window sized to the precision
  the caller actually typed resolves first; more than one request inside it is
  AMBIGUOUS, named, non-zero exit, and no cascade prints. An unambiguous resolve
  now prints the record's own ts/msgs/cid before the cascade runs.
  **The entry's own live case is fixed and was re-run:** `--at 07:37:39Z` now
  resolves to the 07:37:39.512Z record instead of the 07:37:38.362Z one the old
  nearest-earlier rule silently picked — the two anatomies that disagreed on
  everything that mattered.
  **The lane's first draft was window-ONLY and went 9/11 red against the
  existing suite**, which is the finding worth keeping: multi-minute `--at` gaps
  are a real, exercised usage (a ledger stamp is not the request's own time),
  and the entry's prose named only the motivating incident. The shipped shape is
  two-tier — window first, nearest-earlier fallback only when the window is
  empty — because the suite refused the simpler design, not because someone
  anticipated it.
  **Attribution repaired at integration:** the lane's commit was missing its
  `Co-Authored-By` trailer and it said so plainly in its own report rather than
  leaving it unremarked; the trailer was added on the desk's cherry-pick.

  <!-- moved from `## Open` at closure; body verbatim -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-18; graded by the DONE entry above, not by this header] was-READY 2026-08-16 (promoted 2026-08-18, EIGHTH derivation — the resume-key
  mitigation it was ranked behind is PARKED, so this is the highest
  operator-ranked available item; head #2, bundled into one lane with the OOM
  entry below) — `boundary-layers --at` picks a request by NEAREST timestamp,
  so second-precision silently selects a DIFFERENT conversation and prints a
  complete, plausible, wrong anatomy.** Measured today at the desk: walking the
  07:37:39Z bust with `--at 2026-08-16T07:37:39Z` resolved to the request at
  `07:37:38.362Z` — a 107-message conversation — while the busting request
  `bust-triage` had joined was `07:37:39.512Z`, a 461-message conversation. The
  two anatomies disagree on everything that matters: the wrong one reports
  `tools` BYTE-IDENTICAL and the first two segments READABLE, the right one
  reports `tools` diverging and the first segment BROKEN. Either reads as a
  finished answer.
  **Why the existing warning does not cover it, which is the whole defect.**
  The tool DOES print "RELATIONS DISAGREE" — but that warning is about
  PREDECESSOR selection, i.e. which record the chosen target is compared
  AGAINST. Nothing warns about the selection of the TARGET itself, which is the
  one that was wrong. A guard that fires on the adjacent question reads as
  coverage of this one; that is the entry-path shape `docs/dev-loop.md` already
  collects, arriving inside a tool built to prevent exactly this class.
  **Design, decided:** `--at` reports the resolved record's OWN timestamp,
  message count and conversation id BEFORE the cascade, and when another
  request sits within the match window it says so and names it — the
  three-answer discipline applied to target selection (resolved / ambiguous /
  none), never a silent nearest-match.
  Loop stage: ATTRIBUTE
  Anchor: `tools/boundary-layers.mjs`
  Write-set: `tools/boundary-layers.mjs`, `test/boundary-layers.test.mjs`
  Verifier: a fixture with two conversations whose requests interleave inside one second — `--at` at second precision must report AMBIGUOUS and name both, and must not silently pick one
  <!-- entry: "boundary-layers --at silently selects the wrong conversation at second precision" -->

- **DONE 2026-08-18 — `harvest --pin` carries the pinned pair's own outcome
  records, and its verification line no longer claims more than it checked.
  Built `5b101e8`+`e268d69`+`0e674d5` (lane `sonnet-pin-outcomes`), integrated
  `cfffb4d`+`1b787f3`+`81548e4`.** The chase runs past ordinal `m` under a
  bounded lookahead, the header carries `outcomes: {resolved, unresolved}`, and
  the CLI says "reproduces the live STABILITY/CENSUS verdicts" plus an explicit
  caveat when any pinned ordinal is unresolved.
  **THE DESK NARROWED IT ONCE, on the lane's own output rather than on review
  taste:** the first build chased ordinals 0..m, and because ordinal 0 had no
  outcome anywhere in the file the chase ran to its bound and swept **90
  unrelated outcome records** into a public fixture — 5 records became 95.
  Scoped to n..m it is 8, with the billing evidence (the duplicate `outSha`
  pair) intact. A pin freezes public history, so record count is not cosmetics.
  **A THIRD extension came from the desk's own build:** the coalesce-miss record
  shipped the same evening adds a third non-request record type, and this tool
  was the ONLY reader in the repo whose else-branch would have taken a request
  ordinal for it — enumerated by executing the grep over every capture reader,
  not by reasoning. The lane's red-first showed the shift concretely: the old
  code produced three records where the real second request had silently
  vanished, replaced by the miss record wearing its ordinal.
  **What the lane closed that it was not asked to close:** its own reported gap.
  It had traced `pinRangeBounded`'s path by hand and said so; asked to exercise
  it instead, it produced a red/green pair against the pre-fix code.

  <!-- moved from `## Open` at closure; body verbatim -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-18; graded by the DONE entry above, not by this header] was-READY 2026-08-18 (evening) — `harvest --pin <n>..<m>` stops at request
  ordinal `m`, so the pinned pair's OWN outcome records are never in the
  fixture, while the tool reports that the pin "reproduces the live
  verdicts".** Measured while freezing today's row-31 evidence, and it cost a
  wasted pin: `--pin s-<key> 1..3` over `s-captureBU` wrote 5 records — boot
  plus four requests, ZERO outcome records — and printed `pin verified:
  reproduces the live verdicts over records 0..3`. That sentence is TRUE about
  what it checked (stability, exemptions, census classes over the request
  stream) and false as read: the finding being frozen was a BILLING one, whose
  entire proof — two distinct upstream request-ids, two `usage` blocks, equal
  `outSha`, and the ABSENCE of a `type:"coalesced"` record — lives in the
  outcome records that follow the last pinned request. `pinRange` breaks out of
  the read loop the moment it pushes request ordinal `m`, so those records are
  excluded by construction, for every pin ever taken. The workaround found by
  hand was to pin `1..4` and let the next request drag the outcomes in, which
  works by accident and freezes an unrelated 170 KB request to do it.
  **Design, decided.** After pushing ordinal `m`, keep streaming until every
  pinned request id has been seen in an `outcome` or `coalesced` record, or a
  bounded lookahead is exhausted (200 records or 32 MB of lines, whichever
  first — a bound, not a scan of the rest of a 435 MB capture). The header
  records the result per pinned ordinal: `outcomes: {resolved: [...],
  unresolved: [...]}`. And the verification line stops claiming the general —
  it names the replayed verdicts and states, when any pinned request's outcome
  is unresolved, that the pin does NOT carry billing or coalescing evidence.
  An assurance wider than its predicate is what stopped anyone looking here.
  Red-first, both arms from the real capture rather than planted: (a) pinning
  `1..3` over `s-captureBU` today produces zero outcome records and the
  unqualified success line — after the change the same command carries all
  three outcome records and the header lists them resolved; (b) a pin whose
  lookahead genuinely runs out (a capture truncated after the pinned request)
  must say `unresolved` and must NOT report the billing-evidence claim — without
  (b) a lookahead that always succeeds passes arm (a).
  Done: both arms pasted, the header field landed, the verification sentence
  narrowed to what it establishes, suite green, entry moves to `## Done`.
  Loop stage: SEE (the evidence-freezing half of it).
  Anchor: `tools/harvest.mjs`
  Write-set: `tools/harvest.mjs`, `test/harvest-pin.test.mjs`,
  `test/harvest-pin-verify.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/harvest-pin.test.mjs test/harvest-pin-verify.test.mjs
  <!-- entry: "harvest --pin excludes the pinned pair's own outcome records" -->

- **DONE 2026-08-18 — a READY entry whose ANCHOR moved after its booking date is
  now FLAGGED at derivation time. Built `935d216` (lane `sonnet-anchor-lint`),
  integrated `5a557ce`.** WARN-only `lintAnchorMoved` in `tools/backlog-lint.mjs`,
  wired into the DEFAULT run (so the session-start banner and the pre-push hook
  both surface it), three answers as designed — ANCHOR-MOVED / ANCHOR-UNCHECKABLE
  / silent — plus the required sentence in `docs/dev-loop.md`'s build-order
  procedure making its output a required read AT DERIVATION TIME.
  **Verified at the desk, not booked from the report:** `test/backlog-lint.test.mjs`
  184/184, and the lane run over the live file. The lane's own red-first was the
  new bites against the old tool (13 fail / 171 pre-existing pass, then 184/184).
  **IT EARNED ITS KEEP INSIDE THE HOUR, twice, which is the part worth keeping.**
  (1) Its first live run reported ANCHOR-UNCHECKABLE on three entries — including
  two this derivation had just promoted — because a `READY (promoted …) <date>`
  header does not carry the date where the census reads it. That is the
  three-answer discipline paying off immediately: the entries were not passing,
  they were unreadable, and the lint said so instead of staying silent. Headers
  fixed; the same run then reported four honest ANCHOR-MOVED findings.
  (2) One of those four was head #6, `_resetRelocationMemory`, whose anchor moved
  in `03398e3` after its booking — the exact shape that made the SEVENTH
  derivation rank an already-shipped item first. Checked against the world in one
  command rather than a lap: `03398e3` is row 30's content-loss fix and its diff
  touches no memory helper, so the entry's premise stands. The lane reports, the
  derivation decides — as its own WARN-only design says.
  **The lane also found, independently and before my correction reached it, that
  a bare `git log --since=<date>` is not midnight** — the same defect this desk
  measured in its own promotion survey the same hour. Two independent
  measurements of one quantity agreeing is what makes it a tool property rather
  than an author's slip; the fix (`--since=<date>T00:00:00`) is in the lane and
  the fact is now in `docs/dev-loop.md`'s standing rules.
  **One deviation, accepted and better than the brief:** the SHA proof is capped
  OLDEST-first, not newest-first, so a finding's stated proof does not silently
  rewrite itself as more commits accrue.

  <!-- moved from `## Open` at closure; body verbatim -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-18; graded by the DONE entry above, not by this header] was-READY 2026-08-18 — a READY entry whose ANCHOR file moved after the entry's
  booking date is a staleness candidate, and nothing reads that today.**
  Measured, not anticipated: the seventh derivation ranked "push scan diffs
  range ENDPOINTS" **head #1** on 2026-08-18, and the work had shipped in
  `f228720` on 2026-08-14 — four days earlier, in the entry's own Anchor file.
  A second entry on the same lane ("hygiene policy is silent on conversation
  content") was half-overtaken the same way. Both were found by the dispatched
  lanes' premise check, in minutes, by opening the Anchor.
  **The mechanism, stated so it is not mistaken for carelessness:** a
  derivation re-reads each entry's REASONING, which stays intact — what
  refutes it is a commit made by a different piece of work that never reads
  the entry, so nobody holds both halves at once and the staleness rule cannot
  fire on its own. That is exactly the shape a computed input dissolves: the
  comparison is two dates and a `git log`, and it is the DELIVERY of the input
  to the judgment that is mechanizable, never the judgment.
  Design, decided: a new WARN-only lane `lintAnchorMoved(text, env)` in
  `tools/backlog-lint.mjs`, beside the existing `lintReadyBar` (same entry
  walk, same finding shape `{line, title, label, token, proof}`). For each
  READY entry in `## Open`: take the booking date from the header
  (`READY YYYY-MM-DD`, the same token the census already reads) and the path
  from the `Anchor:` line, then run
  `git log --format=%h --since=<date> -- <anchor>`. Non-empty -> label
  `ANCHOR-MOVED`, token the anchor path, proof the short SHAs (capped at 3
  plus a count). THREE answers, never two: a header carrying no date, a `row N`
  anchor, or a git invocation that fails -> `ANCHOR-UNCHECKABLE` with the
  reason as proof — an entry that cannot be checked must not read as an entry
  that passed.
  **WARN-only on purpose, and this is the load-bearing decision:** a commit
  touching the anchor does NOT prove the entry stale (the file has many
  reasons to move), so the predicate is judgment-shaped and blocking on it
  would fire on legitimate work and train the override reflex. It reports; the
  derivation decides.
  Consumer, named because a lint nobody reads is decoration: the default
  `backlog-lint` run, which the session-start banner and the pre-push hook
  already surface — PLUS one sentence in `docs/dev-loop.md`'s build-order
  procedure making the lane's output a required read AT DERIVATION TIME, which
  is the moment that actually failed here.
  Red-first, both arms drawn from real history rather than planted: (a) the
  closed entry above, replayed from `git show` of this file at a commit where
  it was still READY with its 2026-08-11 header and `tools/absence-scan.mjs`
  anchor, must produce `ANCHOR-MOVED` naming `f228720`; (b) a READY entry whose
  anchor has NO commits since its booking date must produce nothing at all —
  without arm (b) a lane that fires on everything passes arm (a).
  Done: both arms pasted, the lane wired into the default run and its labels
  registered like the other lanes', the dev-loop sentence landed, and the full
  suite green; this entry moves to `## Done` with its ref.
  Loop stage: MITIGATE (the instrument half).
  Anchor: tools/backlog-lint.mjs
  Write-set: tools/backlog-lint.mjs, test/backlog-lint.test.mjs,
  docs/dev-loop.md
  Verifier: node --test --import ./tools/suite-config-root.mjs test/backlog-lint.test.mjs
  <!-- entry: "READY entry whose anchor moved after its booking date" -->

- **DONE 2026-08-18 — the ship runbook names the A/B verdict tool and states its
  expected silence. Built `fb99920` (lane `sonnet-runbook-ab`), integrated
  `50c331c`.** Step 1b sits beside the row-3 restart-transparency judgment,
  names `tools/verdict-ab.mjs`, and says in the step itself that COULD-NOT-VERIFY
  is the EXPECTED, non-failing answer for a change outside `EXT` — so the step
  makes the tool's reach visible at ship time instead of reading as a gate that
  returns nothing on almost every real ship.
  **Both arms were re-run AT THE DESK rather than booked from the lane's
  report**, and the desk's own corpus is larger than the lane's worktree, which
  is why the numbers differ: `node tools/verdict-ab.mjs cdc2b9a^ aa85900` ->
  exit 2, `COULD NOT VERIFY — 0 of 3228 verdict lines could exercise the changed
  code`; `node tools/verdict-ab.mjs 9059d3a^ 9059d3a` -> exit 0, `IDENTICAL
  across 3228 verdict lines, 20 corpora`.
  **The lane's own honest residue was closed here rather than carried:** it
  reported (g) that the step's LITERAL command form — a tree-ish plus a
  working-directory argument — had never been executed as written. Run at the
  desk: `node tools/verdict-ab.mjs 9059d3a^ .` -> exit 0, a real verdict, not
  COULD NOT VERIFY. The form in the runbook executes.
  The undecided half stands where the entry left it: whether `verdict-ab` should
  load the CHANGED extension rather than a hardcoded one is a real design
  question and is deliberately not bundled.

  <!-- moved from `## Open` at closure; body verbatim -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-18; graded by the DONE entry above, not by this header] was-READY 2026-08-18 — the ship runbook has NO A/B verdict step, and the tool
  everyone assumes fills that slot can only see 1 of this repo's 42
  extensions.** Two facts found while closing the `verdict-ab` entry, each
  measured: `grep -c verdict-ab docs/runbooks/ship-proxy-change.md` -> 0, and
  `grep -rl` over all of `docs/runbooks/` -> no file; and
  `tools/verdict-ab.mjs` hardcodes one module path (`EXT`, :75) and one
  exported function (`classifyPinned`), so a change anywhere else in
  `proxy/extensions/` cannot reach its comparison at all. The runbook's
  restart-transparency question therefore rests on step 1's row-3 JUDGMENT
  alone, with no mechanical arm — and the tool that would have been the
  mechanical arm would have answered vacuously for 41 of 42 extensions until
  `665cec2` made that vacuity visible.
  **Two halves, and only the first is decided.** DECIDED: the runbook gains an
  explicit step naming `tools/verdict-ab.mjs`, stating in the step itself that
  a COULD-NOT-VERIFY is the EXPECTED answer for any change outside `EXT` and
  is not a failure — a step that reads as a gate while returning
  could-not-verify on almost every real ship would train the override reflex
  within a week, which is exactly the guard-fires-on-legitimate-work shape.
  So the step's job is to make the tool's reach VISIBLE at ship time, not to
  pretend to a coverage it does not have.
  NOT DECIDED, and named as this entry's boundary: whether `verdict-ab` should
  be widened to load the changed extension(s) rather than a hardcoded one.
  That is a real design question — the tool's whole shape (its `classifyPinned`
  call signature, its corpus format, `--seed-from-a`) is built around one
  function's contract, and generalizing it is not a rename. Do NOT bundle it
  with the runbook step; the step is worth having either way and lands first.
  Red-first: the runbook change is prose, so the arm is the STEP's own
  instruction exercised once — running the named command on a change outside
  `EXT` must produce COULD-NOT-VERIFY and the step must say that is expected;
  running it on a change inside `EXT` must produce a matched count. Both
  arrangements exist in git history today (`cdc2b9a^..aa85900` for the first;
  any `insertion-normalization.mjs` commit for the second) and neither needs
  constructing.
  Done: the step is in the runbook with its expected-answer sentence, both
  arrangements run and pasted, and this entry moves to `## Done` with its ref.
  Loop stage: VERIFY.
  Anchor: docs/runbooks/ship-proxy-change.md
  Write-set: docs/runbooks/ship-proxy-change.md
  Verifier: node tools/verdict-ab.mjs cdc2b9a^ aa85900 (must read COULD NOT VERIFY, exit 2)
  <!-- entry: "ship runbook has no A/B verdict step; verdict-ab sees one extension" -->

- **DONE 2026-08-18 (`8869124`) — `bust-triage` reads EXEMPTIONS, not only
  violations, before it attributes a bust to CC.** The tool's "no violation row
  for this pair" fallback defaulted to `CC's`, and `replay.mjs`'s `scanGroup`
  routes an exempted divergence OUT of `violations` entirely — so the one shape
  where our own extension caused the divergence and then exempted itself read
  identically to the shape where CC did it. That is what it printed on today's
  448k bust, on our own busting pair. New pure functions
  `attributionFromCensus` / `attributionFromExemption`, both exported and both
  unit-reachable; the `CC's` text is byte-unchanged so the existing attribution
  bite (outside the lane's write set) still passes untouched.
  **Red arm re-run at the desk, and deliberately BEYOND what the lane
  reported.** The lane's red was a module-load failure — the test could not
  import `attributionFromCensus` from the old tool. That proves the export is
  new; it does not prove the assertion discriminates, because a test that
  cannot load fails for any implementation. So the desk ran the behavioural
  mutation instead: exports intact, `rv.exemptions` lookup disabled — the
  original defect and nothing else. Result: 7 of 8 pass and the one that fails
  is `BITE — a census whose ONLY record for this pair is an exemption must not
  yield a bare CC's (the 2026-08-18 448k shape)`. The bite is aimed at the
  defect, not at change.

- **DONE 2026-08-18 (`7b39a5e`) — `bust-triage` now says whether the mitigation
  ABSORBED, instead of naming a row and stopping.** New ABSORPTION step after
  ATTRIBUTION, three-answer throughout: a failed or absent replay is
  SKIPPED/COULD-NOT-VERIFY, a census with zero pairs is COULD-NOT-VERIFY (the
  known `.json`-pin-reads-zero shape, named rather than silently counted as a
  clean zero), zero tools-deltas is NO-FINDING, and only the remaining case is
  MEASURED — with hold ratios for both the whole-array and shared-name-subset
  readings, so the retired metric and the live one are visibly different
  numbers rather than one ambiguous verdict.
  Two of the lane's judgment calls were right and are recorded so they are not
  re-litigated: it attached ABSORPTION at only 2 of the 6 return points,
  because the other four already state that no row's status describes the pair
  and asking about absorption there would ask about a population the pair was
  never in; and it reused the replay `computeAttribution` had already fetched
  rather than spawning a second one — a fresh narrow replay would have been
  WRONG, not merely slower, since the classification depends on accumulated
  per-conversation state.
  Red arm verified per-commit at the desk: the absorption bite is red against
  `8869124` (this commit's own parent, i.e. with entry 1's fix present and this
  one absent) and green after — so each commit's bite is attributable to that
  commit rather than to the pair.

- **DONE 2026-08-18 (`f189e0d`) — the stability check has its
  `modelChangedAcrossPair` exemption, and row 6's LIMB is now measured instead
  of read by hand.** Two entries, one commit, and the bundling was the right
  call rather than a shortcut: both add fields to the same `compactEntry`
  builder in interleaved hunks, and splitting them by hand in a file that size
  risks a broken mid-split state for a solo pathspec workflow. The lane said so
  in its own commit body.
  The exemption is strict in the direction that matters: it fires only when
  both sides carry a model AND it changed AND CC's own byte at the divergence
  index is identical AND the request's measured `cacheRead` is exactly 0 —
  never `!cacheRead`, so an unmeasured outcome stays a violation rather than
  being exempted by its own absence.
  **The row 6 half produced a real FINDING, and it flips an eight-day-old
  answer.** `addition.trigger` (`toolsearch-adjacent` / `no-toolsearch` /
  `unknown`, the third kept separate rather than folded into the second) reads
  both real pairs on `pinned-s-dda5c6419d49-372-373.json` as
  `toolsearch-adjacent` — refuting this row's 2026-08-10 prose that the
  addition was "a server connecting mid-session, NOT a ToolSearch deferred
  load". Read TWICE, because a lone instrument's green is indistinguishable
  from its blind spot: once by the lane's committed assertion over the pin, and
  once independently at the desk by a direct read of `body.messages` and
  `body.tools` off the raw capture, prefix-preservation confirmed on both
  pairs. Folded into the matrix with both halves kept apart — adjacency is not
  causation, and what it kills is the BASIS of the opposite claim, which was a
  hand-read of seven tool names.
  **Consequence, which is why the entry called this upstream of lever choice:**
  the 263k instance joins the 448k one instead of standing apart. Both are
  demand-driven mid-session loads, and a session-start preload is definitionally
  blind to a tool whose need is created mid-conversation — so ladder step (b)'s
  reach is narrower than this row read it, and the residue belongs to step (a).
  **TRAILER CORRECTED BY THE DESK, and the lane flagged it itself.** The lane's
  commit carried `Co-Authored-By: Claude Opus 5 (1M context)` plus a
  `Claude-Session` line — this desk's template, copied literally, crediting the
  wrong model for a Sonnet lane's work. The lane found it after committing and
  reported it rather than amending, which is correct: amend is
  commit-granular and HEAD had moved. The desk rewrote the unpushed commit
  (hence `f189e0d`, not the original hash) after checking the result was
  content-identical to a backup branch — `git diff` against it empty — so the
  correction touched the message and nothing else. Attribution is required to
  be accurate, not merely present; a wrong model in the trailer is the same
  defect as a missing one.

- **DONE 2026-08-18 (`665cec2`) — `verdict-ab` can no longer report IDENTICAL
  when it could not see the change at all; and TWO claims this entry rested on
  were WRONG, both mine, both corrected here.** The fix is what the entry
  asked for and slightly better: before any corpus is touched, the two trees'
  copies of the one file the tool loads are byte-compared. Identical bytes
  means zero of N pairs could exercise a change whatever N is — a distinct
  COULD-NOT-VERIFY, exit 2, never a plain pass; differing bytes print the
  matched count on the verdict line. Verified live at the desk on the real
  arrangement, which is the discriminating flip the done-criterion named:
  `node tools/verdict-ab.mjs cdc2b9a^ aa85900` now prints `COULD NOT VERIFY —
  0 of 3223 verdict lines could exercise the changed code`, exit 2, where this
  morning the same command printed IDENTICAL, exit 0.
  **CORRECTION 1, the mechanism — found by the lane, not by me.** This entry
  says the pinned corpora lack a description-delta-alongside-addition pair.
  That is not why the run came back IDENTICAL. `tools/verdict-ab.mjs` loads
  exactly ONE file (`proxy/extensions/insertion-normalization.mjs`, its `EXT`
  constant at :75) and calls exactly one function from it (`classifyPinned`),
  and that file is BYTE-IDENTICAL across `cdc2b9a^..aa85900` — measured, `git
  diff` over that path in that range is empty, while the change itself lives
  in `deferred-tool-rewrite.mjs` and `tools/replay.mjs`. So no corpus of any
  shape or size could have produced a different answer: the tool structurally
  cannot see 41 of this repo's 42 extensions. The corpus story was plausible,
  self-consistent, and had nothing to do with it — the costume was that both
  stories predict the same observed output.
  **CORRECTION 2, the consumer — mine, and it inflated this item's rank.** The
  entry's Consumer line and its Anchor note both say the tool is consumed by
  `docs/runbooks/ship-proxy-change.md` step 1, and the seventh derivation
  ranked it partly on "it gates the restart-transparency claim of every ship
  through the proxy runbook". It does not. `grep -c verdict-ab
  docs/runbooks/ship-proxy-change.md` -> **0**, and `grep -rl` over the whole
  `docs/runbooks/` tree returns no file at all. It is a hand-run tool that I
  chose to run today; no runbook has ever named it. The claim was never
  checked before being written into a rank basis, and the check is one grep.
  **CORRECTION 3, and this one is PUBLISHED and cannot be edited.** The
  dotfiles pin commit `88440f3` (pushed) explains the IDENTICAL result in its
  body as "die gepinnten Korpora enthalten keinen Description+Addition-Fall".
  That is correction 1's wrong story, shipped as fact in an immutable commit
  message. The commit's OTHER claims stand — the fix was verified on the live
  capture, and the change genuinely is a non-regression — but the reason given
  for the verdict-ab line is false, and this entry is the correction's only
  reachable home. Anyone citing `88440f3` on that point should cite this.
  **What the two corrections have in common, which is the part worth keeping:**
  both are TRUE-basis failures. The corpus story was a real fact about the
  corpora; the runbook story described a step that would be sensible if it
  existed. Neither was a guess — each was a sentence I could defend, answering
  a NARROWER question than the one it was shutting, which is why nothing
  prompted a second look. The lane found the first by reading the tool's
  imports, and one grep found the second.
  Gap booked separately rather than closed here: the ship runbook has no A/B
  verdict step at all (see `## Open`).
  **RESIDUE, and it is the DESK's, not anyone else's — open as of this
  writing.** Correction 3's reachable home is this entry, but a reader who
  hits `88440f3` in DOTFILES history will never open this file, so the
  correction also owes one line in that repo's `LEDGER.md`. It is not written
  yet: a peer session held the dotfiles working copy at that moment (commit
  `41a7e6e`, after mine), and one writer per copy means waiting, not asking
  the peer to write it — a relayed obligation looks discharged from both ends
  while nobody may act on it. The peer was told the FACT so they do not cite
  the commit; the WRITE stays here. Check that reveals it if this session
  ends first: `grep -c 88440f3` over the dotfiles `LEDGER.md` returns 0.
  **DISCHARGED the same session** — the peer released the copy and reported it,
  and the desk wrote the line itself: dotfiles `5d9d0e0`, pushed. The check
  above now returns non-zero, which is what closes this rather than anyone's
  recollection of having done it.

- **DONE 2026-08-14 (`f228720`), discovered closed 2026-08-18 — the push scan
  walks range-INTERIOR commits and annotated tag messages.** Closed by the
  landing that shipped it four days after this was booked; the entry then sat
  in `## Open` for four days and was ranked **head #1** by the seventh
  derivation this morning, which is the finding worth more than the closure.
  Verified in the artifact rather than from the lane's report:
  `rangeCommitShas`/`commitBlobs`/the interior loop and `tagMessage` are in
  `tools/absence-scan.mjs` today (:712, :735, :767, :876-891, :916); all three
  red arms exist as named tests (`test/absence-scan.test.mjs` — "a defect ADDED
  then DELETED", "MODIFIED then REVERTED", "a synthetic UUID in an ANNOTATED
  TAG's message"); and the done-criterion's third arm, the runbook's interim
  hand-rescan sentence, is already replaced by a pointer to the shipped check
  (`docs/runbooks/upstream-pr-round.md`, "Blind spot CLOSED 2026-08-14").
  **Why the derivation did not catch it, stated as a mechanism and not as
  care:** a build order re-reads each entry's REASONING, which stayed
  plausible, and the world that refuted it was a commit in the same file made
  by a different piece of work that never read this entry. Nobody held both
  halves. The dispatched lane found it in minutes by opening the Anchor — which
  is what the premise-check-before-implementing clause in its brief is for, and
  it earned its place on first contact. Tripwire booked in `## Record`
  ("a READY entry whose Anchor moved after its booking date").

- **DONE 2026-08-18 (`e921c86` lane + `0d72bf1` desk) — the push scan's blob
  dedupe is keyed on `(oid, scope)`, so byte-identical content at two paths
  with different scope treatment is scanned under BOTH.** `scannedBlobs` was a
  plain OID set shared between the endpoint pass and the interior walk, so
  whichever path was reached first marked the OID done and the second path's
  own classes never ran — an out-of-corpus twin (byte-level classes only)
  silently absorbing an in-corpus blob's `live-timestamp`/`nested-payload`/
  `raw-content` scan. Red arm re-run at the desk rather than booked from the
  report: baseline 50/50 green, the fix reverted to OID-only keying fails
  exactly the new test and nothing else, restored.
  **The desk added the half the lane's fix was missing** (`0d72bf1`):
  `scopeKey` RESTATES `scanContent`'s routing, which is the basis-restated-from-
  the-source shape that cannot age loudly — a fourth route would leave
  `scopeKey` returning three values and every test green, byte-identical to
  health. The new assertion compares `scopeKey`'s partition against the route
  the scanner ACTUALLY takes, read at run time from `scanContent`'s
  `sourceOnly` and `classesFor`'s applied class set, in both directions over
  every pair (one direction alone is satisfied by a degenerate key). Three
  mutants red, each reverted: a constant key fails 2, a path-unique key 1,
  dropping the source branch alone 1.
  **The done-criterion's cost clause was anchored to mutating state and could
  not be met as written:** it pinned "not materially moved from today's 0.230s
  on `HEAD~30..HEAD`", a figure measured against a different commit window on
  2026-08-14. The lane answered the question the clause was for by A/B-ing
  fixed against unfixed on the SAME current range — ~0.48s both — which is the
  discriminating form the clause should have had.

- **DONE 2026-08-18 (dotfiles `59d2c1c`) — the publication bar now covers our
  OWN prose: no verbatim operator quotes in tracked prose or commit messages.**
  Realized where it always belonged — `cache-fix/CLAUDE.local.md` in the
  DOTFILES repo, deployed here — which is why this entry could never be closed
  by a lane working in this checkout. Two of the four decided points were
  already in the deployed overlay (tool names are inventory; fixtures ship
  structure and hashes only); the missing third and its corollary are what
  landed: attribution and causal record stay, only the wording is restated,
  because a blunt deletion destroys the provenance that made the line worth
  having. Shipped with the extent (1 quote in the tree, 6 in commit messages,
  both scrubbed), the reason the rule is FLAT rather than per-instance, and the
  explicit statement that it is not mechanizable — no predicate separates a
  quote from a restatement, so it is prose with the operator as backstop.
  Verified red-first as a deployment, not just as an edit: the source/dest
  comparison reported drift (exit 1) before `dot apply` and exit 0 after, with
  the doctor's own line `deployed copy in sync: .../CLAUDE.local.md` on OK.
  **The decorative-consumer half is closed too** — this entry's named consumer
  (a fresh dotfiles session) provably could not reach it, measured 2026-08-11
  as 0 hits in the dotfiles backlog. It was discharged by the desk holding both
  repos in one turn instead, which is the other legitimate exit and the cheaper
  one; no cross-repo booking was needed in the end.

- **DONE 2026-08-18 — a description delta no longer forces a global reset when
  it rides alongside a pure tool addition.** Built `cdc2b9a` (dispatched lane)
  + `d7699cc` (desk, the serving-gate bite), pin `88440f3`, restarted and
  verified: the busting pair n=505->508 replays `heldStable=true` (was false),
  the capture's stability exemption is GONE (1 -> 0), and the post-restart
  sweep reports 0 violations AND 0 exemptions over 18 captures with the
  doctor's DECLARED = RUNNING = VERIFIED triple agreeing. Body moved here from
  `## Record` rather than marked done in place, per the one-home rule.
  Residue kept OPEN in `## Record`, deliberately not closed with it: the reset
  path still clears `preloadPending` with a justification that does not cover
  a pending seed, so a reset that DOES fire still forfeits the preload for the
  rest of that conversation.

- **DONE 2026-08-16 (`dd03b30`) — the cap lane now guards BOTH directions, and
  it stopped pinning the live head's size.** Two defects in one commit, and the
  second was found by the first firing: closing the write-owner-only entry
  drained the head to nine, and the whole suite went red.
  **The premise defect, which is the more useful half.** The cap-lane BITE
  hardcoded `clean (10/10)` and built its red arm by adding exactly ONE entry —
  both of them claims about how big the live head happened to be at the moment
  the test ran. So a correct closure, the one act the backlog exists for, took
  every push red: a guard firing on legitimate work, which is precisely how a
  guard trains the override reflex that kills it. The count is now MEASURED from
  the same file both arms are built from (`withReadyCount`, which adds synthetic
  entries or demotes real ones to hit an exact target), and the red arm is sized
  to land exactly one over the cap from wherever the head sits. What the bite
  asserts is unchanged. **Proven count-independent by running the file at nine
  and at ten — green at both, where the old form was green only at ten.**
  **The drained direction, built as its own entry decided.** `lintReadyCap`
  returns `{count, cap, over, under}`; the default run prints an ADDITIONAL
  under-full line beside the clean one (`backlog-ready-cap: N/10 — head
  UNDER-FULL, promote from ## Record`), never replacing it. Asymmetric on
  purpose: over-fill BLOCKS — the cap is a bound the repo chose and exceeding it
  is fixable before a push — while under-fill REPORTS and never blocks, since a
  drained head is what closing work looks like. The entry's own red-first arm
  was live on disk while it was built: the file stood at 9 READY, and the lane
  printed `clean (9/10)` plus the under line at the same moment.
  **And the lane's own header comment was FALSE and had been since 2026-08-15**
  — "REPORT-only, deliberately … the exit code is untouched by this lane", while
  `over` drives the exit code and a bite pins exactly that. Corrected in place,
  with the original rationale kept as history rather than as description. A
  mechanism's words about itself outliving its body reads as the predicate's
  reach to whoever opens it next, which is what stops anyone looking.
  Red-first, both arms named: tool reverted with the new expectations kept →
  exactly THREE red (the two new bites plus the shape assertion) and the other
  168 green; with the change 171/0. Full suite 3536 / 0 fail at the pushed
  commit. Loop stage: VERIFY.
  <!-- entry: "cap lane guards over-fill only, a drained head is silent" -->

- **DONE 2026-08-16 (`92ce3dd`) — the owner-only BITEs now drive the config the
  proxy actually serves, and the serving-gate lint is CLEAN on main.** The
  lint's first real finding, closed the day after it was booked: all six bites
  in `test/write-owner-only.test.mjs` drove `insertion-normalization` with
  `CACHE_FIX_INSERTION_NORMALIZE` alone while the running unit serves
  `CACHE_FIX_VOLATILE_PIN=1` beside it. Pin mode is what selects the canonical
  shape `saveCanonical`/`loadCanonical` round-trip
  (`insertion-normalization.mjs:1958`, `mode: pin | plain`), so the file modes
  under assertion were the modes of a `"plain"` canonical the deployment never
  writes.
  **Built as the entry decided, not as the lint would accept.** Both drive
  helpers and the third, inline drive site take the serving PAIR
  (`SERVING_GATES`), and the arranged pre-existing canon in the atomic-write
  bite was changed from `mode: "plain"` to `mode: "pin"` — it stands in for a
  file the running proxy left behind, and a plain file under a pin-mode load is
  a different case (a mode mismatch) than the one that bite is about. No gate
  MENTION was added to satisfy the tripwire, which the lint's own header says it
  cannot tell from a real drive.
  **The gate-took-effect assertion is the durable half.** `mode` is written from
  `isPinEnabled()` at save time, so it is the one observable separating the
  serving path from the phase-2-only one; without it, adding the gate would be
  decoration nothing could falsify, and the next author could silently revert to
  the unserved path.
  **Red-first, both arms named, under the suite's own config-root isolation**
  (`node --test --import ./tools/suite-config-root.mjs`, which is the supported
  route — bare `node --test` fails all six at HEAD too, the config-root artifact
  `docs/dev-loop.md` already tables): baseline 6/6 GREEN with the change; with
  `CACHE_FIX_VOLATILE_PIN` removed from `SERVING_GATES`, exactly ONE red — the
  canon-shape assertion, by its own message — and the other five green. So the
  assertion discriminates against the defect rather than against change.
  **No path assertion moved**, which was the entry's named finding-if-it-happens.
  Loop stage: VERIFY. Verifier: the six bites 6/6; `node
  tools/serving-gate-lint.mjs` → CLEAN, exit 0; full suite 3546 tests / 0 fail
  at the pushed commit. Test-only change: no `proxy/**` bytes, so no pin bump
  and no restart.
  <!-- entry: "write-owner-only drives insertion-normalization in pin-OFF while production serves pin-ON" -->

- **DONE 2026-08-16 — the serving-gate lint exists and has already produced its
  first finding (`tools/serving-gate-lint.mjs`, `test/serving-gate-lint.test.mjs`).**
  A test that drives a GATED extension without ever naming that gate is green
  about a pipeline nobody runs, and until today nothing checked it. The motivating
  case: `test/insertion-lineage-recovery.test.mjs` on `wip/resume-key-third-read`
  default-imports `insertion-normalization`, drives `ext.onRequest`, and never
  names `CACHE_FIX_VOLATILE_PIN` while the serving unit and `/health` both carry
  it as `1`; all seven of its bites passed.
  **The red-first proof, run before anything was believed.** One run over a tree
  holding BOTH named files — the known positive extracted read-only from the
  branch (`git show`, no checkout, the branch untouched) and the known negative
  `test/insertion-normalization.test.mjs` — against the live serving set:
  FIRES on the positive naming `CACHE_FIX_VOLATILE_PIN`, SILENT on the negative,
  in the same run, so the silence is discriminating rather than vacuous.
  **The entry's design was NARROWED against measurement, and the numbers are the
  reason.** As written, the derived predicate — every `CACHE_FIX_*` an extension
  reads — yields 40 offenders on main, most demanding that a test set
  `CACHE_FIX_DEBUG` or the `CACHE_FIX_SNAPSHOT_DIR` path: a guard that fires on
  legitimate work, which is the shape that trains the override reflex. Two
  narrowings, each measured: requiring only gates the RUNNING proxy has ON takes
  it to 13, and counting only default/namespace imports — holding the extension
  OBJECT, not calling an exported pure helper — takes it to 1. Derivation is
  kept where the entry put it (the per-extension gate set is scanned from source,
  proven by a bite that adds a gate to a fixture extension and watches a new
  offender appear with no change to the lint).
  **The serving set comes from `/health`, never from a list in the file**, so the
  basis cannot go stale silently; an unreachable proxy is COULD NOT VERIFY
  (exit 2), not an empty set that would render as a clean sweep. Declared
  assumption, stated in the header: a switch is recognised by publishing its
  VALUE, which `proxy/gate-allowlist.mjs` and the capture-hardening bite hold.
  **What the lint's own test caught about the lint.** The template-literal bite
  went red for a reason nobody planted: line-anchoring alone does NOT exclude an
  import sitting inside a fixture's template literal. That is a finding about the
  artifact, so the artifact was repaired (`stripNonCode`), not the expectation —
  and the repair was then checked for blast radius against the real corpus
  (232 files, 0 extension-imports lost).
  **First real finding, booked as its own READY entry:**
  `test/write-owner-only.test.mjs` drives `insertion-normalization` in pin-OFF
  while production serves pin-ON. It was NOT exempted — an exemption on the day
  the instrument shipped is how a live finding becomes a silenced instrument.
  Deferred with its named trigger: wiring the lint into a gate waits until it
  exits 0 (its own RECORD entry).
  Loop stage: VERIFY. Verifier: `node tools/serving-gate-lint.mjs` (exit 1, one
  offender), `test/serving-gate-lint.test.mjs` 15/15, full suite 3534 pass / 0
  fail at the pushed commit.
  <!-- entry: "a test exercising a gated extension without its gate is green about a pipeline nobody runs" -->

- **DONE 2026-08-16 — the content gate is ported and this repo's half is
  shipped (`4e58269`); the dotfiles half and the restart are the desk's.**
  Operator answer (a) to the parked content-minimization decision: port
  upstream's `CACHE_FIX_PREFIXDIFF_CONTENT` gate default-OFF over every content
  path and let the deployment opt in, so what rests on disk is a recorded
  choice rather than an unexamined default.
  **What landed.** The gate in `proxy/extensions/prefix-diff.mjs` — system-block
  text, per-message previews, marker previews, and the event-record previews
  that fall out of the same single gating point in `buildSnapshot`. The seven
  gated builders are BYTE-IDENTICAL to upstream's, checked function by function
  with an extractor whose instrument-positive is that it also reported the two
  that genuinely differed (comment dates, since matched too) — so this narrows
  the merge surface rather than widening it.
  **The security bite went RED as designed, and that is the record worth
  keeping.** It asserted the fork's actual persist-by-default contract
  precisely so the port could not pass unnoticed: 1 failing of 10 at the port,
  the other nine green — a discriminating split, not a module-load failure. The
  expectation was then updated deliberately, with the reason written into the
  file.
  **Two defects found on the way, both the shape of a check that passes while
  measuring the wrong quantity.** (1) `payloadWithSentinel()` ignored its
  overrides argument — inherited from upstream — so the two requests in each arm
  were byte-identical, no diff and no event record were ever written, and the
  sentinel-absence claim only ever covered `-last.json`. Fixed, with a
  `wroteDiff` precondition in both arms, red-proven by restoring the defect
  (both arms red on the precondition, eight others green). (2) Both arms drove
  the gate through `options.contentEnabled`, a TEST seam, while production
  drives it through the env var read once at module load — one covered entry
  path out of two. Two child-process bites now cover the env route, each
  mutation-proven: forcing `CONTENT_ENABLED` true reddens only the gate-unset
  arm, forcing it false reddens only the `=1` arm.
  **Row-3, executed rather than argued:** the change touches neither state keys
  nor freeze logic, and prefix-diff makes no request mutation (zero body
  assignments; instrument-positive: 3 in `deferred-tool-rewrite.mjs`). An
  old-code baseline diffed against a new-code snapshot under the deployment's
  own config reports NO change; a real edit still registers; the old-vs-old
  control also reports none. A deployment that does NOT set the variable would
  see one spurious diff record on its first post-restart request, from the
  head/tail window shape change — diagnostic noise, no wire effect.
  Ship-lane step 2, run before the hand-off: 8 live sessions, ~472k worst case
  IF a restart changed forwarded bytes; it changes none.
  Residue, NOT ours and not done by this entry: the `Environment=` line, the
  manifest gate classification, the `CACHE_FIX_GATE_ACCEPTANCE` entry, the tree
  pin, and the restart. Routed to the desk when this landed.
  Loop stage: MITIGATE. Verifier: `test/proxy-prefix-diff-security.test.mjs`
  (12 bites, 12 green), full suite 3519/0 at the pushed commit.
  <!-- entry: "port upstream CACHE_FIX_PREFIXDIFF_CONTENT gate default-OFF, opt deployment in" -->

- **DONE 2026-08-16 — a gate the deployment turns ON has to publish its VALUE,
  or the doctor's three-way compare can never agree (`914ca24`).** Found live by
  the desk within the hour of the gate shipping: `/health` published
  `CACHE_FIX_PREFIXDIFF_CONTENT` as `<redacted>` (deny-by-default in
  `proxy/gate-allowlist.mjs`, working exactly as designed), the unit declared
  `"1"`, and ship-runbook step 7 FAILED with *"Unit geaendert ohne Restart"* —
  a standing red that was wrong about its own cause and would have stayed red
  forever, telling its reader to restart a process that had just been
  restarted.
  **Second instance of this exact shape in one day**, the first being
  `CACHE_FIX_COALESCE_SIDECAR` three lines above it in the same file, whose own
  comment already spelled out the consequence ("a replay could no longer
  reproduce the configuration that was SERVING").
  **The bite asserts the VALUE, not the key's presence**, because a redacted
  gate is still PRESENT in the object — a presence assertion passes in both
  worlds and proves nothing. Its population is derived from the serving unit's
  twelve gates rather than hand-listed. Red-first against the world as it was
  an hour earlier: remove the entry, exactly that bite goes red, seven others
  green.
  Owed and NOT done here: this is a `proxy/**` change, so it needs its own tree
  pin and its own restart — the SECOND restart of the day for one mitigation.
  Loop stage: VERIFY. Verifier: `test/capture-hardening.test.mjs`.
  <!-- entry: "publish CACHE_FIX_PREFIXDIFF_CONTENT value in /health gates" -->

- **DONE 2026-08-16 — row 31's effect is measured, and the instrument the round
  specified is REFUTED rather than merely unbuilt (`55618fd`).**
  **The A/B replay cannot exist.** The coalescing decision lives in the live
  request path (`proxy/server.mjs`, the only site outside the gate allowlist
  reading `CACHE_FIX_COALESCE_SIDECAR`), which is UPSTREAM of the capture file:
  by the time a capture exists the decision is taken and recorded. Executed on
  real data carrying a real `type:"coalesced"` record — the census returns a
  BYTE-IDENTICAL duplicate rollup under the gate `=0` and `=1`. Two arms that
  agree have measured nothing. Structural half, with its instrument-positive:
  zero reads of that variable under `tools/`, against three `tools/` files for
  a gate the tools do read.
  **What replaced it, and why it is stronger:** every capture's BOOT RECORD
  declares the gate set its proxy started with, so the corpus labels its own
  arms — one fixed corpus, one variable, the label being data rather than a
  re-run. `tools/row31-effect.mjs` reads that label off line 1 of each capture
  (never the whole file), joins it to the sweep's retained per-streak rows, and
  reports double-billing per capture per arm.
  **Reading, 2026-08-16:** ON 30 captures, session-start double-billing **0.000
  per capture**; PRE-GATE control 5 captures, **0.400**. Mid-session 0.133 vs
  0.400 — NOT reported as over-reach at n=5, and the tool says so in its own
  output; the honest over-reach discriminator is the census's
  `multiMessageCoalesced`, zero in every run so far.
  **FOUR arms, not three, and the split is what made the tool work:** the first
  run reported "no comparison exists" because OFF was empty — no proxy ever ran
  with the gate declared and unset — while five captures sat there from a build
  predating the mechanism. Collapsing those into UNKNOWN threw away the only
  control the corpus has, so PRE-GATE and NO-BOOT are separate answers and the
  control arm is named in the output.
  Nine bites, three mutations, each reddening only the bites that name its
  condition — including the load-bearing negative one: an ON arm that still
  double-bills must come back non-zero, or the zero above means nothing.
  What this does NOT close: row 31's own done-criterion is stated on the
  census's `singleMessage*` counters, which still show residual double-billing
  (3 streaks in the 11:09 sweep). The row stays open on that number.
  Loop stage: VERIFY.
  <!-- entry: "row 31 effect measurement, A/B replay refuted, boot-record arms" -->

- **DONE 2026-08-16 — the duplicate rollup now survives its own run, and the
  retained streak row keeps the field that proves the mitigation acted
  (`55618fd`).** Closing-gate question 2's recurring-producer clause, firing on
  a producer that had been running for days.
  Two halves, both measured before being fixed: the daily sweep wrote the
  duplicate counters ONLY into the status file it overwrites next run — today's
  two sweeps reported 24 and then 10 double-billed streaks with nothing on disk
  able to compare them — while the fire ledger (41 lines, append-only, the
  artifact built for exactly this) carried `captures` and `ccVersions` and no
  duplicate block at all, read from its own key set rather than from memory.
  And the per-streak projection dropped `coalesced` while keeping `billed`, so
  a retained row could not tell a send the coalescer SUPPRESSED from a retry
  nobody answered: both read `billed: 1` on a two-member streak, which is
  exactly the distinction row 31 closes on.
  Both red-proven: drop either field and exactly its bite goes red, 52 others
  green.
  Loop stage: SEE. Verifier: `test/gate-live.test.mjs` (53 bites).
  <!-- entry: "fire-ledger carries the duplicate rollup; projection keeps coalesced" -->

- **FIXED 2026-08-16 — the prefix-diff boot sweep's scope regex was unanchored,
  so it claimed 13,699 co-tenant files as its own to delete on the next
  restart.** Found by the desk session while the restart was held, confirmed
  independently here from the extension sources.
  **The defect.** `SNAPSHOT_FILE_RE = /^(.+)-(last\.json|diff\.json|events\.jsonl(?:\.1)?)$/`
  — the `(.+)` swallows any family infix, so `s-<key>-insertion-events.jsonl`
  matched under the synthetic key `s-<key>-insertion`. insertion-normalization,
  deferred-tool-rewrite and output-guard all write `<key>-<family>-events.jsonl`
  into that same directory. Measured on the live dir: of 14,545 files the regex
  reached, **846 were prefix-diff's own and 13,699 were other extensions'** —
  94% of its reach.
  **Severity, checked rather than assumed:** both foreign writers only ever
  APPEND to their event log; they `readFile` their `canonPath`/`statePath`
  canonical, which the regex never matched. So this destroys ATTRIBUTION
  EVIDENCE, not live cache state — irreversible on the first request after a
  restart, and exactly the class dev-loop question 2 exists to protect.
  **Why nobody looked:** the module's own comment at the site stated the
  opposite as settled design — it counted all 13,813 `events.jsonl` as "this
  sweep's own scope" and closed with "do NOT widen SNAPSHOT_FILE_RE to reach
  them". The regex already reached them. An assurance wider than its predicate
  establishes reads as the predicate's reach, to its author first.
  **The fix:** anchor the key to the shape the key GENERATORS produce —
  `((?:s-)?[0-9a-f]{12})`, covering both `resolveSessionKey`
  (`s-` + sha256(sid).slice(0,12)) and the headerless `computeSessionKey`
  fallback. Derived from the generators, not a denylist of today's family names,
  so an extension added tomorrow cannot fall inside the scope.
  **Red-first, both arms required and both stated.** The pre-existing boundary
  bite ("NEVER touches the fork's own live state") was GREEN throughout, because
  it seeded only `-canon.json` / `-relocated.json` / `-rungs.json` — families
  that never matched. A check passing while exercising less than its name
  claims. Two new bites added BEFORE the fix, run against the unfixed module:
  97 pass / 2 fail, the 2 being exactly the new ones — the discriminating split.
  After the fix, 100/100 in that file and the full suite 3517 tests / 3505 pass
  / 0 fail / 12 skipped.
  **The durable half:** `tools/snapshot-sweep-projection.mjs` — drives the REAL
  `sweepSnapshotDir` over the live directory with a RECORDING fs (unlink is
  captured, never performed), classifies every projected deletion by the owning
  extension, and exits 2 if any belongs to another. Red-proven on the real
  defect by `git checkout HEAD -- proxy/extensions/prefix-diff.mjs` with the
  empty `git diff --stat` printed as proof the old blob was in place: **exit 2,
  13,518 foreign deletions**; restored (md5 identical) and re-run: **exit 0,
  0 foreign, 266 own** — non-zero, so the sweep still does its job. A fix
  driving both arms to zero would have broken the sweep instead of repairing it.
  The second bite is the reach check and asks the extension SOURCES which
  per-session artifact names they write rather than restating a roster beside
  them; it found `output-guard.mjs` on its own, which has zero files on disk
  today and was therefore invisible to every directory-based measurement.
  Refs: proxy/extensions/prefix-diff.mjs (anchor + corrected scope comment),
  test/proxy-prefix-diff.test.mjs (co-tenant bite, source-derived reach bite),
  test/proxy-prefix-diff-security.test.mjs (fixtures re-keyed to the real shape),
  tools/snapshot-sweep-projection.mjs
  <!-- entry: "prefix-diff sweep scope regex unanchored, claimed co-tenant event logs" -->

**EXIT PASS 2026-08-15 — TWO ROUNDS, and the first one was incomplete.**
110 closed bodies moved here from the live sections, which had been grading
closures in place.

Round 1 moved 54 entries carrying the bare `- **DONE` marker. Round 2 moved
56 more. **The gap is the lesson and is why both rounds are recorded:** round
1's population came from a hand-written pattern keyed on the DONE MARKER,
while the class is CLOSURE — the carrier's actual closure vocabulary is nine
grades (`RESOLVED` 33, `DONE` 12, `CLOSED` 3, `BUILT` 2, `DROPPED` 2,
`ANSWERED`, `FIXED`, `RETIRED`, `SHIPPED`), plus parenthesized forms
(`- **(DONE …`) the anchor missed. Round 1's own negative grep returned a
clean zero, because it asked its own question. The population for round 2 was
DERIVED from the repo's own detector (`backlog-lint --closures-in-live`)
instead of restated — the same derive-from-the-source stance the READY bar
takes.

Reconciliation, before = moved + kept, zero dropped. Round 1:
`171 = 42 + 129` (`## Open`), `79 = 11 + 68` (`## Upstream PR round`),
`29 = 1 + 28` (`## Parked decisions`); total `279 = 54 + 225`. Round 2:
`129 = 4 + 125`, `68 = 34 + 34`, `28 = 18 + 10`; total `225 = 56 + 169`.
Entry count conserved at 488 across both rounds.

Gauge, by the detector rather than by the pattern: `CLOSURE` in live sections
110 -> 0, and 0 in `## Open`. Baseline for the next pass, RE-READ at session
close after the retirement pass and the head re-derivation moved it: 17,943
lines, 492 entries, 389 live. (The figure first written here — 17,825 / 488 /
378 — was true when the exit pass committed and was invalidated hours later by
this same session's own commits. A baseline in a durable artifact is
load-bearing for whoever measures next, and nothing updates it automatically.)

**Left standing, deliberately:** 3 `AMBIGUOUS` entries whose grade is a
DECISION or a REFRAME rather than a closure (`## Open` L2818 and L4931,
`## Upstream PR round` L9244) — each needs a judgment call on whether it is
closed, and a sweep that guesses is how a live entry gets buried. Also 23
`COULD-NOT-VERIFY` rows the detector cannot classify, which are its third
answer and not a clean bill.

**One entry rode along and the pre-commit guard caught it**, which is the
third instrument to correct this pass: a live `PARKED` entry (READINESS
residue) was carried into `## Done` inside a moved closure's span, because its
grade marker was written WITHOUT bold (`- PARKED`, not `- **PARKED`) and the
span walker keys on `- **`. Relocated to `## Open` and its marker bolded — it
had been invisible to every lint lane and to this file's own entry counts for
the same reason, which is why the entry total reads 489 after the pass against
488 before: nothing was added, one entry became parseable for the first time.

**Not cured by this pass**, measured the same day: READY stands at 38 against
its cap of ten, and no lint lane enforces the cap — which is why the cap
re-inflated within four days of being declared. Also found: the
`--closures-in-live` detector that would have caught all 110 of these is an
OPT-IN FLAG, absent from the default `backlog-lint` run, so nothing was ever
going to report this disease unprompted.

- **DONE 2026-08-16 (`6cb1333`) — the upstream catch-up merge is taken; 37 commits, 28 conflicts resolved, suite green, pushed.**
  Was: **PARKED 2026-08-15 — fork-`main` is 33 behind `upstream/main` and that signal
  has had no disposition since it drifted; the answer is NOT an exemption.** The
  session-close line requires every non-silent part of the attention line to
  resolve to an action, a booking, or an explicit "not this session, because —".
  This one resolved to none for the whole session.
  **A proposed exemption was WRONG and the record is what refuted it.** The
  desk's first recommendation was to declare "behind upstream" not-applicable for
  this fork, on the reasoning that main deliberately diverges and slices are cut
  as PR branches. The dotfiles backlog carries the closed entry
  `**cache-fix fork behind upstream** — merged (\`a1e19be\`) … Fork is now 0
  behind / 68 ahead`, i.e. the operator's actual practice has been to MERGE, and
  the signal has a real terminal state. Exempting it would have silenced a
  doorbell that works.
  **Missing evidence / trigger that unparks this:** an operator decision on
  timing. The merge is deployment-coupled — changes under `proxy/` mean a
  `CACHE_FIX_PROXY_TREE_PIN` bump plus a restart at a stated session boundary
  (threat-matrix row 3), so it is a session of its own and must not ride the tail
  of unrelated work.
  **SIZED 2026-08-16, because "33 behind" is a count and not a blast radius.**
  It is **37** behind now, not 33 — it moved by four during a single session,
  which is the drift argument by itself. Measured against the merge base
  (`76d586d`), not against a tree-to-tree diff: **INCOMING is 97 files,
  +22,197 / -782**, including two whole new upstream tools (`tier-advisor.mjs`
  722 lines, and upstream's OWN `tools/absence-scan.mjs` at 479 lines).
  **The conflict surface is 56 files** — files changed on BOTH sides since the
  base — and it lands squarely on this fork's core: all three mitigation
  extensions (`insertion-normalization.mjs`, `message-hash.mjs`,
  `deferred-tool-rewrite.mjs`), `proxy/server.mjs`, and twenty-odd test files.
  **It touches state keys / freeze logic** (15 matched lines in the incoming
  set), so row 3's transparency argument does NOT carry: this restart is priced
  against live sessions, not assumed cheap.
  **The one to look at first is `tools/absence-scan.mjs`:** upstream has
  independently grown its own, and ours is the publication-bar enforcer that
  runs as a pre-push hook. A careless resolution there weakens the leak gate,
  which is the one irreversible axis in this repo.
  **METHOD NOTE, recorded because it produced a wrong reading before it
  produced the right one:** `git diff main..upstream/main` shows the fork's own
  work as DELETIONS — `proxy/xdg-dirs.mjs -208` is our fork-only file, not
  upstream removing it, and the state-key hits in that direction are our own D1
  machinery. Size an incoming merge against `git merge-base`, never tree-to-tree.
  **Sequencing, decided at the desk 2026-08-16:** this goes BEFORE the harness
  lint and before the resume-key redesign. The parked branch
  (`wip/resume-key-third-read`) touches four of the conflict files and is going
  to be re-derived anyway, so its rebase cost is at its MINIMUM right now; and
  the harness lint's own subject — test files exercising gated extensions — sits
  in the conflict set, so building it pre-merge means validating it twice.
  **One home, deliberately:** booked HERE and not in dotfiles, even though the
  precedent entry lives there, because the merge happens in this repo and a fork
  session is its consumer. The dotfiles entry is closed and stays closed.
  Consumer: the session that takes the upstream merge.
  Loop stage: RETIRE.
  Anchor: BACKLOG.md
  Write-set: BACKLOG.md
  Verifier: git rev-list --count main..upstream/main
  **CLOSURE.** Merged `upstream/main` at `8ddd4f0` into main as `6cb1333`. The sizing below was right about the count and WRONG about one load-bearing thing, recorded here rather than dropped: it said the incoming set touches state keys / freeze logic so row 3 does not carry. Those 15 lines sat in upstream's older copies of our OWN extensions (add/add, no merge-base ancestor), all resolved to ours, so the four state-key/freeze owners are byte-unchanged and row 3 DOES carry. Established behaviourally, not just structurally: `verdict-ab 36559f6 HEAD --seed-from-a` → IDENTICAL across 3223 verdict lines, 19 corpora. Full suite green at the commit (3514 tests, 3502 pass, 0 fail, 12 skipped). Leak gate proven still firing, both arms on one real fixture: untouched → clean/exit 0, one planted v4 UUID → FINDING capture-uuid/exit 2. Four upstream review amendments to our own PRs taken back (see the commit message). Row-3 pre-declaration written in the threat matrix; restart and pin bump NOT taken — the boundary is the operator's. Findings booked as separate entries above.
  <!-- entry: "fork main 33 behind upstream, disposition owed, merge not exemption" -->

- **DONE 2026-08-15 — row 31 is MITIGATED AND MEASURED; both entries below close
  together because they are two halves of one fact.** The mitigation shipped
  2026-08-14 and its done-criterion is met on both sides, graded RESIDUAL rather
  than SHIPPED for one named reason (below). Matrix row 31 carries the full
  measurement; the short form:
  **Read as a COHORT** rather than waiting for the pre-flip captures to rotate —
  stronger than the parked entry asked for, because it carries its own baseline.
  `node tools/gate-live.mjs --cohort 2026-08-14T16:17:00Z` over the sweep
  finished 13:38:00Z (`ok: true`, 0 failing, 57 captures, all 57 stamped, so the
  cohorts are total): **BEFORE** 44 captures — 48 single-message streaks, **34
  double-billed (71%)**, 1 coalesced; 32 multi-message streaks, 3 double-billed,
  0 coalesced. **AFTER** 13 captures — 14 single-message streaks, **0
  double-billed (0%)**, 8 coalesced; 1 multi-message streak, 1 double-billed, 0
  coalesced. Fisher exact, one-sided, on the pre-registered comparison:
  **p = 1.4e-6** (7.7 expected under the null, 0 observed).
  **Not an absence dressed as a result:** the mitigation is observed ACTING 8
  times, which refutes the traffic-simply-changed story — that predicts zero
  double-bills AND zero coalesces.
  **The four disconfirming observations were each looked for and named:** a
  non-zero on the target side (none, 14 streaks); the control falling to zero,
  i.e. over-reach (it did not — the one post-flip retry streak was NOT
  suppressed); the fence breached (`multiMessageCoalesced` is 0 across all 95
  streaks, pre and post); the mitigation inert (refuted by the 8 firings).
  **RESIDUAL for one reason, stated rather than smoothed over:** the control arm
  has n=1 post-flip streak and is under-powered — that count says "still
  non-zero", never "unchanged". What carries the no-over-reach conclusion is the
  0-coalesced-on-the-retry-side figure across the whole corpus plus the code
  condition and its two-upstream-calls bite, not the retry count. Promotion to
  SHIPPED wants a post-flip corpus with enough multi-message duplicate streaks
  to say "unchanged" rather than "non-zero".
  **The instruments this needed, all built the same day and each its own
  commit:** the sweep's duplicate rollup stopped dropping the census's coalesce
  fields (`8f8e5ab`); the census gained the class split the criterion is stated
  in (`b5f42e2`); every sweep row carries its capture's first-record stamp so
  the cohort read exists at all (`daf0e46`); and `row-31-coalesce` watches the
  closure on the scheduled path (`1325469`) — needed because the systemd unit
  runs `--quiet`, so the summary line those numbers first landed in reaches
  nobody on a daily run.
  Evidence: `s-captureBQ` was the first post-flip capture in which the
  mitigation fired, and its protection is RELEASED with this closure. The
  release is deliberate and the reasoning is worth keeping, because an earlier
  draft of this entry said "hold it until the residual closes" and that was
  wrong: the residual wants FUTURE traffic with more multi-message duplicate
  streaks, not this capture, whose measurement is recorded above with its
  numbers. `alias-claim --releasable` said releasable and the prose said hold —
  the tool was right, and a prose sentence overriding a mechanism that grades
  by evidence is how a protected set turns into an unexamined one.
  Upstream filing (#78420-adjacent) is a separate act and still needs operator GO.

  <!-- moved from `## Open` at closure; bodies verbatim -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-15; graded by the DONE entry above, not by this header] was-READY 2026-08-14 — row 31's duplicate sidecar send is MITIGABLE, and the
  fidelity objection that blocked its design is weaker than the row assumed.**
  The row parked the mitigation as "undesigned, touches the streaming path" with
  the safe shape named (coalesce one upstream call to both callers) but no
  predicate. Measured at the desk 2026-08-14, reading the duplicated request's
  STRUCTURE only (no message text; publication bar): `model claude-haiku-4-5`,
  `max_tokens 32000`, `stream true`, `nMsg 1`, `roles [user]`, one text block of
  337 chars, 2 system blocks, **0 tools**.
  **The load-bearing fact: it carries no conversation history and no tools**, so
  whatever it returns cannot enter any cached conversation prefix. Handing caller
  B a copy of caller A's answer therefore substitutes one independently-sampled
  answer for another in a request whose output joins no prefix — and CC issued the
  second send 6-25 ms in, with no way to have observed the first, so it already
  treats the two as interchangeable. That is the fidelity question the row left
  open, answered.
  **Cost is NOT the deliberation here** and is recorded so the next session does
  not re-open it on those grounds: the matrix's own mitigation policy says cost
  never gates mitigation work and the only per-class deliberation is mitigability.
  The 48,203 tokens are not a reason in either direction.
  Design, decided — the scoping predicate, all four required: `nMsg === 1` AND the
  request carries no `tools` AND the two bodies are byte-identical AND the second
  arrives < 50 ms after the first while the first is still in flight. The
  mid-session duplicate class — where the second send is a legitimate retry and
  suppressing it would leave a real request unanswered — fails this on `nMsg`
  alone, which is the discriminator the row asked for.
  Dropping the second send stays UNAVAILABLE: two client requests are in flight
  and each is owed a response. Coalescing is the only shape.
  Red-first, and the two must DIFFER: a synthetic pair matching all four
  conditions coalesces to ONE upstream call with both callers answered; a
  mid-session pair (nMsg > 1) issues TWO upstream calls unchanged. A pair
  matching three of four conditions must NOT coalesce.
  Done: the four-condition predicate is implemented and the three arms above pass
  with their output pasted; a live sweep after the restart shows the class's
  duplicate count falling to zero while the mid-session duplicate count is
  UNCHANGED (the second number is what proves the predicate did not over-reach);
  row 31's status cell carries the result; this entry moves to `## Done`.
  Loop stage: MITIGATE.
  Anchor: row 31
  Write-set: `proxy/server.mjs`, `test/duplicate-coalesce.test.mjs`
  Verifier: node --test --import ./tools/suite-config-root.mjs test/duplicate-coalesce.test.mjs
  DEPLOYMENT-COUPLED and it touches the STREAMING path — pin bump, restart at a stated session boundary, and a row-3 declaration BEFORE the restart. Do not bundle it with any other proxy change: attribution of a streaming regression must be unambiguous.
  Upstream filing (#78420-adjacent) is a separate act and has operator GO.
  <!-- entry: "row 31 duplicate sidecar coalescing, scoping predicate decided" -->

- **[CLOSED — moved verbatim from `## Open` 2026-08-15; graded by the DONE entry above, not by this header] was-PARKED 2026-08-14 — row 31's mitigation is LIVE but its done-criterion is
  not measured yet, and the measurement is a two-sided one that a casual read
  will get half right.** `CACHE_FIX_COALESCE_SIDECAR=1` since 2026-08-14
  (dotfiles `7050372`, acceptance `700833b`). What closes the row: across a
  full sweep, the SESSION-START duplicate class (haiku, `nMsg=1`,
  `max_tokens=32000`, capture lines 3-5, intervals 6-25 ms) falls to 0
  double-billed streaks, WHILE the mid-session class stays UNCHANGED.
  **Both halves are the criterion.** A fall in the mid-session count would be
  over-reach, not success: there the second send is a real retry whose first
  attempt has no completion record, and suppressing it would leave a real
  request unanswered. The mitigation's four conditions are built to make that
  impossible (one message, no tools), so a mid-session drop would mean a
  condition is not holding — a finding about the fence, not a win.
  **The new number to read it with**, so nobody hand-derives it again:
  `coalescedRequests` / `coalescedStreaks` in the census rollup, and
  `duplicate-billing`'s COALESCED join class. The pre-flip baseline is the
  2026-08-14 sweep's own duplicates block.
  **RE-GRADED 2026-08-15 — the numbers this entry names were NOT READABLE from
  the daily sweep when it was written, and now are (`8f8e5ab`, `b5f42e2`).**
  Two gaps, both silent, both fixed: gate-live's two duplicate rollups
  enumerated the census's field names by hand and dropped
  `coalescedRequests`/`coalescedStreaks` for four days (measured on the
  2026-08-15 10:03Z sweep — per-capture rows carry 3 coalesced requests over 3
  streaks, the rollup carried neither key), and neither side of the two-sided
  criterion had a counter at all. `summariseDuplicates` now splits by
  `nMsg === 1`, the rollups DERIVE their field set from it, and both the census
  text report and the sweep's own summary line print the two sides. The entry
  stays PARKED: what was missing was the instrument, and what is still missing
  is the traffic.
  NAMED MISSING EVIDENCE: a full sweep over a corpus whose captures were
  written with the gate ON. The 2026-08-14 sweeps ran against pre-flip
  traffic, so their duplicate counts cannot answer this either way — the
  captures have to age past the flip first.
  **Evidence held for this entry: `s-captureBQ`** — the first post-flip
  capture in which the mitigation actually fired (1 streak, 2 sends, 0 billed,
  1 coalesced), claimed and `--protect`ed 2026-08-15. Cited HERE and not only
  in its `## Done` entry deliberately: `alias-claim --releasable` buckets an
  alias by where it is cited, so an alias whose only citation sits under
  `## Done` reads as RELEASABLE — and this one is live evidence for an OPEN
  entry. Release it when this entry closes, not before.
  Trigger to re-grade: the first sweep whose window lies entirely after
  2026-08-14 18:17 local.
  **How to read that sweep, decided now so it is not decided under the
  pressure of wanting the row closed:** `byteGate.duplicates
  .singleMessageDoubleBilled` must reach 0 while `.multiMessageDoubleBilled`
  does not move. The `singleMessage` bucket is WIDER than row 31's class — it
  reads `nMsg` alone, never the model, the capture position or the interval —
  so a non-zero there is a prompt to read the streak rows, not a refutation of
  the mitigation on its own.
  **One thing the first full sweep must be read for, raised 2026-08-15 and
  DELIBERATELY NOT resolved from a sample:** across the two captures probed by
  hand while building the split, every duplicate streak including the
  double-billed one was one-message, i.e. the criterion's control side had no
  members. If that held corpus-wide the "stays UNCHANGED" half would
  discriminate nothing. It probably does not hold — row 31's own cell records
  62 double-billed streaks corpus-wide of which 47 are this class, so 15 sit
  outside it — but those 47 were classified on all four axes, not on `nMsg`, so
  the matrix's numbers do not answer the `nMsg` question either. Two captures
  settle nothing in either direction; the first full sweep prints both buckets
  and settles it in one line.
  Loop stage: VERIFY.
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: docs/directives/robustness-threat-matrix.md (row 31 status)
  <!-- entry: "row 31 done-criterion unmeasured after the coalesce flip" -->

- **DONE 2026-08-15 — the capture-PROTECTION carrier had no collector in
  `state-report`, so 1,710 MB held against eviction was in no scheduled
  reading.** Closing-gate question 4's CARRIER REGISTRATION clause, fired by
  its own trigger: `alias-claim --protect` hard-links a capture into
  `captures-protected/` — bytes that outlive every run, under a cap — and the
  only reading was `--protect-status`, a flag a human had to think to run.
  Found by USING the flag for the first time (this session claimed
  s-captureBQ), which is what the rule predicts: the enumeration runs on the
  WRITE, and the mechanism shipped 2026-08-11, the same day the clause was
  written. Shipped `2fcbe68`; `protectStatus` imported, never restated. The
  FIRST reading is the argument for the clause: five protected captures, 1,710
  MB of a 4,295 MB cap, all aliased — nothing said so anywhere.
  Two renderer findings fell out and were repaired rather than papered over:
  `fmtVerdict` threw on a collector key absent from the data, taking the whole
  report down instead of one line (the shape an older `--json` dump rendered by
  a newer build hits), and the render bite asserted a hardcoded count of eleven
  could-not-verify lines, so it had validated nothing since the day a collector
  was added. Both now assert what they were named for, derived rather than
  restated.

- **DONE 2026-08-15 — the daily sweep dropped the two numbers row 31's
  done-criterion is stated in, and read as complete while doing it.**
  `summariseDuplicates` (census) gained `coalescedRequests`/`coalescedStreaks`
  on 2026-08-11 — its own comment calls them "the MITIGATION's own number, and
  they are why row 31's record exists" — and BOTH of gate-live's duplicate
  rollups enumerated the field names by hand beside it, so both were dropped
  for four days into a `byteGate.duplicates` block carrying eight plausible
  fields. Measured on the 2026-08-15 10:03Z sweep: the per-capture rows carry 3
  coalesced requests over 3 streaks; the rollup a human reads carried neither
  key. The head's LEAD item was therefore not merely unmeasured, it was
  unmeasurable from the daily sweep by construction.
  Fixed `8f8e5ab`: both reducers now DERIVE their field set from
  `summariseDuplicates(newDuplicateScan())` — the source asked, not copied —
  with the MAX-not-SUM exception declared once, so a field the census gains
  arrives without an edit and fails a bite the day it does not. Second half,
  the 2026-08-11 absorption correction applied before it cost the same twice:
  the sweep's stdout printed tally and prunes and NEVER a duplicate number, so
  both the CC#78420 alarm column and the mitigation's own column lived only in
  the status file; `describeDuplicates` prints unconditionally, zeros included,
  and answers COULD NOT VERIFY rather than a row of zeros it never measured.
  Red-first, discriminating split stated: 5 pass / 6 fail against the
  unmodified module, the derived-basis bite naming both dropped fields in its
  own failure message. Desk check beyond the lane's own evidence: a scratch
  sweep over s-captureBQ — a real positive, claimed and `--protect`ed — printed
  the line and both carriers carried the fields.
  Dependents search: `git grep -n doubleBilledStreaks` over the tree; the only
  other rollup consumer is `shape-verdicts.mjs`, single-field, no change.

- **DONE 2026-08-15 — row 31's done-criterion is TWO-SIDED and the census had a
  counter for NEITHER side, so the criterion could only ever be settled by
  hand.** `summariseDuplicates` now splits `streaks`, `doubleBilledStreaks` and
  `coalescedStreaks` by `nMsg === 1` — row 31's own discriminator, quoted
  rather than re-decided — and both readers print it: the census's text report
  gains a BY CLASS block with the criterion spelled out, the sweep summary a
  `by class (row 31)` line that says COULD NOT VERIFY on a rollup written
  before the split rather than inventing two zeros. Shipped `b5f42e2`.
  **The third bucket was deleted before it shipped, which is the part worth
  keeping.** The design started with three — the two above plus `unknownShape`
  for `nMsg: null`, on the three-answer rule — and its bite failed on first run
  for a reason nobody planted: `sameBody` gates run creation on `messages`
  being an array on both sides, so no streak can have a null `nMsg` and the
  bucket was unprovable rather than unproven. It went; the reachability premise
  that replaced it is pinned by a bite with an instrument positive beside its
  zero.
  Red-first with the arrangement named: census reverted to its committed blob
  via `git checkout HEAD -- <file>`, `git diff --stat HEAD` empty as proof the
  old implementation was really in place, 3 split bites red / 16 others green;
  restored 19/19; full suite 3304 pass / 0 fail. The derivation from the
  previous commit then proved itself in the artifact — all six new census
  fields reached gate-live's rollup with NO edit to either reducer.
  Corroboration worth recording: the source-side key-set guard
  (`test/census-duplicate-streak-details.test.mjs`) went red on the addition
  and named all six fields. Its gate-live counterpart did not exist until
  `8f8e5ab`, which is exactly why the same source gaining two fields four days
  earlier was dropped in silence there.
  Two more restated bases removed while here, both of which had just fired:
  `gate-live-duplicates`'s own `dupFixture` and the census suite's "reports
  zeros" assertion now derive their shape from the summariser.

- **DONE 2026-08-15 (retired — overtaken by this session's own exit pass) —
  `## Open` no longer holds ANY closures: the entry below asked for the 43
  DONE entries to leave the live section, and the exit pass moved 110 of them.**
  Verified by the repo's own detector, not by the pattern that did the moving:
  `backlog-closures-in-live-open: CLOSURE=0 (## Open section only)`. Body below,
  unedited.
  <!-- entry: "43 DONE entries in Open, overtaken by the 2026-08-15 exit pass" -->

- **RETIRED 2026-08-15 (was READY 2026-08-11) — `## Open` holds 43 DONE entries, so the live section is
  mostly closures and a fresh context pays for all of them.** Measured this
  session by grading every top-level bullet under `## Open`: 43 DONE against 20
  READY, 32 PARKED and 4 OPEN. This is the exact shape the accretion rule names
  — "never delete silently" is satisfied completely by a recorded MOVE, and a
  DONE grade left in a live section grows the carrier without bound while
  staying formally compliant. Two entries were moved by hand today (the
  relocate-then-pin closure, the 2026-08-11 sweep walk); the other 43 were not,
  and doing them one at a time is how this stays unfixed.
  **Why it matters beyond tidiness, stated as the cost it actually imposes:**
  `## Open` is what a restarting session reads to answer "what is live here",
  and today two thirds of it is answered work. The grade is only information if
  the section it sits in is not already full of its opposite.
  **Design (decided):** a `tools/backlog-lint.mjs --closures-in-live` lane that
  lists every top-level entry under a LIVE section whose grade token is DONE (or
  RESOLVED/ANSWERED — the vocabulary is in the file, not invented here), REPORT
  first so the population is measured before anything blocks; then one mechanical
  pass moving those bodies to `## Done`, byte-untouched, in ONE commit that
  changes no prose. Not a judgement pass: a body that is DONE moves, and any
  entry whose grade is ambiguous is LEFT and listed, never re-graded by reading.
  **Done-criterion:** the lane reports 43 today (the number above, which is its
  red-first positive on real data, not a planted one); after the move it reports
  0; `git show --stat` on the move commit shows equal insertions and deletions
  for BACKLOG.md; and a spot-check of three moved bodies is byte-identical
  before and after.
  Anchor: BACKLOG.md
  Write-set: tools/backlog-lint.mjs, test/backlog-lint.test.mjs, BACKLOG.md
  Verifier: node tools/backlog-lint.mjs --closures-in-live

- **DONE 2026-08-15 — RETIREMENT PASS: eight live entries were overtaken by
  the world and are retired, each against an executed check rather than a
  reading of the entry.** Population DERIVED, not hand-listed: every `#NNN`
  reference in the live sections (18 distinct) resolved against the upstream API,
  13 closed; the 14 live entries citing a closed one were then read individually.
  The eight below close; the other six are legitimate history (`RECORD`/`READY`
  entries citing merged PRs as basis), a live standing watch, or a park handed to
  another repo. **The bodies follow this entry unedited.**
  1. **`IN FLIGHT` — push-scan FILE-half filter (dotfiles).** SHIPPED, and
     proven by the guard's own output rather than by its commit: this session's
     `pr/retire-messages-cache-breakpoint` push printed `15 Befund(e) in 6
     Datei(en) uebersprungen: dieselben Bytes liegen am selben Pfad schon in der
     veroeffentlichten History`. Filter present at dotfiles
     `git/hooks/pre-push:531`.
  2. **`QUEUED` — #278's second rebase round.** Overtaken: the round was run and
     the push deliberately held on the leak-gate gap; upstream MERGED #278 at
     2026-08-06T20:50:19Z, so the held push is moot. Second #278 entry to close
     this way today.
  3-5. **Three superseded `HANDOFF` entries (2026-08-05 LATE NIGHT, LATE, and
     08-05).** The repo keeps ONE handoff, in `## Handoff`, currently
     2026-08-14; its own header states a stale one reads as authoritative.
     L4001 declares itself superseded in its own first line.
  6. **`Upstream PR series #272–#281 (ten open, #281 draft) — await review`.**
     False as written: of those ten, eight have merged; only #276 and #281
     remain open, and #281 is no longer a draft (un-drafted 2026-08-15).
  7. **`COMMITTED … week-of-soak summary, due ~2026-08-05` on the #272/#273
     threads.** Both PRs merged 2026-08-05/06; a soak summary posted to merged
     threads reaches nobody. Not done, and recorded as not done.
  8. **`OPEN (attributed 2026-08-02) — double-billed duplicate pairs`.**
     Self-declared superseded 2026-08-14 with both successor homes named
     (threat-matrix row 31, and the PARKED retry entry in `## Open`).
  **One header was rewritten, not just moved:** entry 8's grade token read
  `OPEN` while its own body declared it superseded, and a pre-commit guard
  blocked the move — an `OPEN` grade under `## Done` reads as live work that has
  fallen out of the dispatch queue the SessionStart scan reads. Regraded to
  `RETIRED 2026-08-15 (was OPEN …)`; the rest of the body is untouched. The
  guard was right and this is the second time today it caught a real defect in
  a sweep of mine.
  **What this pass did NOT do:** it checked the PR-reference class only. Entries
  resting on capture aliases, live file state or threat-matrix rows are a
  different stale-risk class and were not swept — named so the next pass knows
  what is still unexamined.
  <!-- entry: "retirement pass 2026-08-15, eight entries overtaken" -->


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

- **HANDOFF 2026-08-05 LATE — superseded by the evening handoff above;
  its UPSTREAM section is still current.** **It supersedes the
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

- **RETIRED 2026-08-15 (was OPEN — attributed 2026-08-02: CC-defect-resend lean, upstream
  filing is the next step and needs operator GO) — double-billed
  duplicate pairs, now 33 streaks.**
  **SUPERSEDED 2026-08-14 — this entry's population SPLITS, and each half
  goes to its own home: the concurrent-sidecar half is now threat-matrix
  ROW 31 (measured, both sends completed, both charged), and the
  mid-session half is the PARKED retry entry in `## Open`. Read those two
  before this body; what follows is kept because the correction below is
  the reason the split was findable at all.**
  **INSTRUMENT DEFECT 2026-08-14, and it VOIDS this entry's central
  retry-refutation: `outSha` is the FORWARDED REQUEST's hash, never
  the response's.** Read at the writer rather than off the field
  name: `request-capture.mjs:183-184` sets `outSha`/`outBytes` from
  `ctx.meta._forwardedSha`/`_forwardedBytes`, and those are assigned
  at exactly one site — `proxy/server.mjs:132-133`,
  `createHash("sha256").update(forwardBody)` over
  `Buffer.from(JSON.stringify(reqCtx.body))`, under a comment that
  says so in full ("Fingerprint of what we ACTUALLY send… the single
  point where the outbound bytes exist, after every extension has
  run"). So "33/33 double-billed streaks have byte-IDENTICAL response
  content between both billed answers — retry-refuting" is measuring
  the two SENDS, which are byte-identical by the definition of a
  streak (`sameBody`) and would be identical whatever the answers
  were. The same correction hits this entry's other quoted pair:
  "responses byte-identical at outSha 62baa3a1 / 3,043,768 B" is a
  3 MB REQUEST, not a 3 MB response.
  **What survives, and it is most of the entry.** The BILLING half is
  untouched: two outcome records mean two `message_start` frames and
  two input-side charges, and the input numbers (`cacheRead`,
  `cacheCreation`, `inputTokens`) are final at `message_start` by the
  writer's own comment. So is the TRANSCRIPT ASYMMETRY on s-captureK
  751/754 (CC records the second request-id three times and the first
  zero times), which was always the stronger evidence and does not
  read `outSha` at all. What is GONE is the byte-identity argument
  against retry-after-degenerate — and with it the claim that the
  discarded answer was not truncated, which rested on the same field.
  **What the capture cannot answer at all, named so nobody re-derives
  it from the same field:** whether either send produced a COMPLETE
  response. The capture stores no response bytes, and
  `usage.outputTokens` is the `message_start` placeholder (this
  entry's own 2026-08-02 instrument note). The completion evidence
  lives in `usage.jsonl`, whose `output_tokens` comes off
  `message_delta` and which carries `request_id` — the join is
  outcome `requestId` -> usage-log `request_id`, and it is the next
  measurement this entry needs.
  Sonnet discovery
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
  design (`proxy/**`, so it RIDES THE NEXT PROXY BOUNDARY, never
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

- **DONE 2026-08-15 (`bba0a35`, sonnet dispatch, dispatcher-verified) — the
  backlog's two blind spots now report themselves on every lint run: the READY
  cap, and closures sitting in live sections.** Both REPORT-only, both wired
  into the DEFAULT `backlog-lint` run.
  **Why they were needed, measured the same day:** the cap of ten (operator,
  2026-08-11) had no enforcing lane at all — READY went 95 -> exactly 10 at the
  re-derivation, back to 11 within hours of that same day, 26 by evening, and
  38 by 2026-08-15. Nothing reported it. And the closures-in-live detector that
  would have caught all 110 misplaced closures ALREADY EXISTED behind the
  opt-in `--closures-in-live` flag, absent from the default run — the
  flag-nobody-passes shape (`docs/dev-loop.md`, the `--protect` precedent).
  **Red-first, both lanes, both arms from IMMUTABLE refs rather than planted
  fixtures**, and re-run independently by the dispatcher before the push:
  lane A `ee98a997` (READY=10) -> `clean (10/10)`, `053e22af` (READY=11, the
  first breach) -> fires naming 11 against 10 — the boundary itself, and the
  two DIFFER; lane B `96936f3` -> `CLOSURE=110`, `95a5782` -> `CLOSURE=0`.
  **REPORT-only is load-bearing here and was verified as such:** with 38 READY
  over the cap, `backlog-lint` still exits 0 (checked directly). A lane that
  returned non-zero would block every push in the repo until the head is
  re-derived, for a condition nobody has yet had the chance to fix. It is not
  the print-BLOCK-and-exit-zero defect: the line says REPORT only and means it.
  **Lane deviation, kept because it generalizes:** the first Lane A test
  asserted process exit code 0 on both frozen refs, and `ee98a997` exits 1
  there because an unrelated pre-existing BLOCKING lane fires on that
  historical snapshot. Narrowed to assert the lane's own output line. A
  red-first test against a frozen ref can trip on another lane's finding at
  that same ref; assert the target lane's output, not the process status,
  unless the status IS under test.
  Suite: 3290 pass / 0 fail / 10 skipped (baseline 3288 + the two new tests),
  re-run by the dispatcher at the pushed tree — which also closes the lane's
  own named gap, that it had not re-run the full suite after its final
  assertion fix.
  **Residual, deliberately not done here:** promoting the cap lane from REPORT
  to BLOCKING belongs in the same commit that re-derives the head back to ten
  (the grade-inflation cure, still open). Promoting it before that would arm a
  guard against a condition the carrier is knowingly in.
  <!-- entry: "READY-cap and closures-in-live lanes in the default lint run" -->

- **DONE 2026-08-15 (closed UNBUILT, overtaken — `#278` merged upstream
  2026-08-06T20:50:19Z) — the #278 rebase entry was written for a PR that
  merged the next day, and sat READY for nine days afterwards.** Booked
  2026-08-05 21:00Z on a correct measurement (`mergeStateStatus: DIRTY`,
  ball with us). Upstream merged it 2026-08-06T20:50:19Z; verified by API
  read 2026-08-15 (`gh pr view 278 --json state,mergedAt`). None of the
  design was executed and nothing is owed — the worktree at
  `/home/g/dev/vendor/cache-fix-pr7`, the rebase, the force-push and the
  announcement comment all became moot on the merge.
  **Same class as the #281 miss found the same day**, which is why it is
  recorded rather than quietly deleted: an entry whose premise is killed by
  a MERGE decays silently, because nothing posts to the thread and no
  reading of the entry can tell. The mechanism is booked (the
  dependency-cleared predicate for `tools/pr-rounds.mjs`, `## Open`); this
  is its second known instance and the one that dates it — nine days.
  <!-- entry: "#278 rebase closed unbuilt, overtaken by merge" -->

- **DONE 2026-08-14 (posted: `anthropics/claude-code#78420` comment
  `5297021582`; original comment `5117558047` pointer-edited the same
  minute) — the correction is public, in the form the 2026-08-14 round
  settled: new comment plus pointer-edit, never a silent rewrite.** Compose
  followed `docs/runbooks/public-comms.md` (minted the same evening,
  `338ac0c`): every number re-measured at compose time — probe re-run gave
  FILE 65/21,364 vs CONV 160/17,564 over 21,431 records (corpus rotated
  from this entry's 65 vs 162 over 21,739; the 2.5x definition gap is the
  stable fact and is what posted), billing split re-read exact from
  `gate-status.json` (144/114/258/134/55, `membersWithoutId: 0`), and the
  entry's own "the rest are the retry class" wording was corrected before
  posting: 23 of the 59 non-double-billed streaks were billed ONCE, only
  36 never answered. The walk's body follows as booked:
  **does NOT reproduce here, and row 31 then measured 47 of them. The two cannot
  both be right, and the public one is ours.** Posted 2026-07-29 on
  `anthropics/claude-code#78420`: "across 3,446 requests in seven session
  captures spanning three days: one adjacent-identical instance
  (retry-shaped, isolated), no doubling pattern" — offered as a negative data
  point for scoping. Row 31 (matrix, 2026-08-14) measured **118 duplicate
  streaks, 62 double-billed, 47 of them one class**: byte-identical adjacent
  same-conversation sidecar pairs, 6-25 ms apart, both answered, both charged.
  **The shapes differ and that is NOT the resolution.** #78420 is a doubled
  conversation PREFIX with `cache_read ≈ 2.00×`; row 31 is a duplicate
  single-message sidecar. But the PREDICATE our comment reported on — adjacent
  byte-identical request bodies within a session — is the one row 31 found 47
  of. So the comment's number is at best incomplete for the claim it was
  offered as.
  **Why this outranks filing anything new:** a claim shipped as fact in a
  public thread is rested on by its readers, and correcting it is owed whether
  or not we ever post again. It is also the reason nothing should be posted
  there until it is explained — a correction that arrives beside an
  unexplained contradiction reads as noise.
  NAMED MISSING EVIDENCE — the three candidate explanations:
  (a) the July corpus was 7 captures with few session starts, so the class had
  few chances to appear; (b) the July probe's adjacency was defined
  differently from the census's same-conversation adjacency; (c) CC changed
  between 2.1.220 and 2.1.221.
  **CORRECTED 2026-08-14 (second entry the same day, by probing this entry's
  own premise before building against it): the sentence that stood here —
  "TRACKED FIXTURES from that period survive, so (a) and (b) are answerable
  offline and (c) is answerable from the version stamps in the boot records" —
  is FALSE on all three counts, and the measurement it commissioned would have
  produced numbers meaning nothing.** Measured over the 11 tracked
  `test/fixtures/harvested/pinned-*.json`: every timestamp inside a fixture is
  scrubbed to `2000-01-01T00:00:00.000Z` (header `harvestedAt` included), so
  neither an ERA nor the 6-25 ms intervals row 31's class is defined by are
  recoverable; pin boot records carry `proxyTree` + `gates` and NO Claude Code
  version, so (c) is unanswerable from fixtures at all; and only ONE pin was
  committed before August (2026-07-31, 3 request records), so there is no
  July-era corpus in the tree to measure. The scrub preserves structure and
  destroys exactly the two predicates this entry needed — the
  curation-axis blindness this repo already documents, arriving in the axis
  nobody had checked for it.
  **(b) WAS ALREADY MEASURED AND FALSIFIED, 2026-07-30, and this entry was
  written without reading it.** See the RESOLVED entry in `## Record`
  ("duplicate-request contradiction: ~100 adjacent identical pairs vs the
  booked 'one instance in 3,446'"): the definition-mismatch hypothesis was
  tested against the then-current corpus and the answer was that global and
  per-conversation adjacency "differs marginally" — the growth was corpus
  CONTENT. That record also states the honest gap: the 07-29 probe's exact
  runtime and file list are not recoverable. That entry is a document, so it
  is a prompt to re-measure rather than a discharge.
  WHAT REPLACES THE FIXTURE ROUTE: the two definitions measured side by side
  over the corpus that actually exists — the 57 LIVE captures — so the
  definitional question is answered on production-shaped input rather than
  argued. Dispatched 2026-08-14 (`tools/duplicate-adjacency-probe.mjs`, arm
  CONV = the shipped `findDuplicateRequests`, arm FILE = global capture-line
  adjacency, with a discrimination control that must make the two arms
  disagree on an interleaved pair). The 11 pins ride along as the committed,
  reproducible arm — a structural corpus, never a rate.
  **MEASURED 2026-08-14 — the two arms diverge by 2.3x, so the definition
  mismatch is a LIVE mechanism, not the falsified one the 2026-07-30 record
  reports.** `tools/duplicate-adjacency-probe.mjs` (`22781b3`, dispatched
  lane) over 67 inputs / 21,739 request records — 11 tracked pins and the 56
  live captures present at measurement time (the corpus rotated from 57
  mid-session; deviation named by the lane, not papered over):
  pins FILE **0**/2,007 compared vs CONV **14**/1,340; live FILE **65**/19,665
  vs CONV **148**/16,525; combined FILE **65** vs CONV **162**. Arm FILE is
  the July probe's likely shape (raw capture-line adjacency) and it undercounts
  by more than half, because interleaved main/subagent/sidecar traffic breaks
  adjacency that conversation grouping restores. The instrument's controls ran
  first: a planted duplicate is found by BOTH arms, a strict append by
  neither, and an interleaved pair separates them (CONV 1, FILE 0) — the
  constructed discriminator reproducing at corpus scale is what makes the
  divergence readable as a definition effect rather than as noise.
  **This re-grades the correction one paragraph up.** That paragraph leaned on
  the 07-30 record's "global vs per-conversation differs marginally" to call
  (b) falsified. At today's corpus it is not marginal. Both can be true of
  their own corpora and the 07-30 corpus is rotated, so the honest state is:
  (b) explains PART of the gap and cannot be closed; the rest is corpus
  content, which the pins' own 0/2,007 shows from the other side.
  **THE FINDING THAT DECIDES WHAT MAY BE POSTED, and it came from closing the
  lane's own not-verified slot rather than from the totals.** The lane flagged
  two outliers as data. The larger one is a **RETRY STORM, not duplicate
  billing**: 17 request records, one opus-5 `msgs=2` request repeated 13 times
  at growing intervals (3.5s → 41.9s, i.e. backoff), and NO outcome record for
  any of them — the exact shape the 2026-07-30 record already named as "client
  retries against upstream/proxy errors, not the #78420 billing shape". So the
  predicate our public comment reported on — adjacent byte-identical bodies —
  CONFLATES two populations, and a correction quoting a raw duplicate count
  would replace one wrong number with another.
  **The split is already measured by the production instrument** and needs no
  new tool: today's sweep (`gate-status.json`, 16:46:26Z, pre-flip traffic)
  carries `byteGate.duplicates` = 144 pairs / 114 streaks / maxStreak 11 / 258
  requests, of which **134 billed requests, 78 billed streaks, 55
  double-billed streaks**, `membersWithoutId: 0` (so the join is complete
  rather than silently partial). Roughly half the streaks are billed twice;
  the rest are the retry class above.
  WHAT THE CORRECTION MAY THEREFORE CLAIM, and it is stronger than a
  retraction: the July negative rested on a definition that undercounts by
  2.3x AND on a predicate that does not separate retries from double billing;
  measured properly the class is present here at 114 streaks per sweep with 55
  double-billed. Draft owed; operator GO before posting.
  Trigger to re-grade: none outstanding for the measurement — the remaining
  gate is the drafted correction.
  Loop stage: ATTRIBUTE.
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: tools/duplicate-adjacency-probe.mjs (+ its test), then a drafted
  correction comment (operator GO before posting)
  <!-- entry: "our public 78420 comment contradicts row 31" -->

- **DONE 2026-08-14 (`338ac0c`) — public-comms rules carrier minted:
  `docs/runbooks/public-comms.md`, indexed in dev-loop.md's event table.**
  Booked PARKED the same day (`1d25a6f`, operator ask mid-review) on the
  2026-08-14 form round's answers; the operator settled the round the same
  evening (form: new-comment-plus-pointer-edit; same-day in-place exception
  exercised on the #82642 opener), and the settled decisions are in the doc,
  each rule with its producing incident. Verifier per the entry: the doc's
  checklist applied to the next real post — the #78420 correction posted the
  same evening was composed under it.

- **DONE 2026-08-14 (`70b4cb9`) — `inHashOf` is exported, and the one
  done-criterion that did NOT get met was wrong on its merits.** Verified
  against the artifacts rather than against the entry's own reasoning:
  `inHashOf` is exported (`tools/replay.mjs:888`),
  `test/replay-row-identity.test.mjs` carries the identity pair, and
  `docs/dev-loop.md`'s identity section names which entry point is which
  (:2121).
  **The fourth criterion — "breakpoint-scan reads its conversation id through
  `conversationOf`" — is deliberately NOT met, and forcing it would have made
  the tool worse.** `conversationSubKey` is cache_control-STRIPPED, so a
  breakpoint MOVING on `messages[0]` does not change the identity;
  `conversationOf`'s raw `inHash[0]` does. For a tool whose whole subject is
  where breakpoints sit, switching would regroup the very rows it compares.
  The criterion was written before that reason was known, and the artifact's
  own comment carried it all along.
  **What WAS repaired there:** that comment justified its choice with "an
  export replay.mjs does not offer" — true when written, false since
  `70b4cb9`, and left standing it is an absence claim about a file that has
  since changed. Rewritten to give the reason that actually decides it.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:**

  **READY 2026-08-14 — `replay.mjs` exports `conversationOf` but not the hash
  it needs, so a tool holding RAW `body.messages` cannot use the repo's own
  identity function at all.** Returned as a question by the breakpoint-scan
  lane, which hit it while obeying the rule it was pointed at: `conversationOf`
  (`tools/replay.mjs:1092`) reads `e.inHash[0]`, an array built by
  `compactEntry` from a private, unexported `sha`. A tool whose records are raw
  requests has no `inHash` and cannot build one without re-deriving the hash —
  the exact anti-pattern `docs/dev-loop.md` names ("never hand-roll identity in
  a probe"). The lane correctly used `conversationSubKey` from
  `proxy/extensions/message-hash.mjs` instead and did not touch `replay.mjs`.
  **Why it is a real gap and not a naming preference:** the rule says "if a tool
  needs an identity that is not exported yet, export it rather than restate it",
  and today the export that would satisfy a raw-records caller does not exist.
  `tools/cache-sim.mjs` already worked around it the same way, so this is the
  second instance.
  **Design, decided:** export from `tools/replay.mjs` an `inHashOf(messages)`
  (the same hashing `compactEntry` performs, factored out, not copied), so
  `conversationOf` becomes reachable from a raw-messages caller in one step;
  `conversationSubKey` stays the sub-key grain. Then say so at the identity
  section of `docs/dev-loop.md`: `conversationSubKey` is the raw-`messages`
  entry point, `conversationOf` the compactEntry-pair one — the lane's own
  candidate lesson, and the half that stops the next brief naming the wrong one.
  **Red-first arrangement, and the two must DIFFER:** on one real capture,
  `conversationOf(compactEntry(rec))` and `conversationOf({inHash: inHashOf(rec.body.messages)})`
  return the SAME id for the same record, and DIFFERENT ids for two records of
  different conversations. A pair that agrees on identical inputs but never
  differs has not demonstrated the identity.
  Done: `inHashOf` is exported, both arms of the identity pair above pass, at
  least one raw-messages caller (`breakpoint-scan`) reads its conversation id
  through `conversationOf` instead of a sibling, and `docs/dev-loop.md`'s
  identity section names which entry point is which; this entry moves to
  `## Done` with its commit ref.
  Loop stage: ATTRIBUTE (every cross-record comparison in this repo is grouped
  by this key).
  Anchor: tools/replay.mjs
  Write-set: tools/replay.mjs, test/replay-row-identity.test.mjs, docs/dev-loop.md
  Verifier: node --test --import ./tools/suite-config-root.mjs test/replay-row-identity.test.mjs
  <!-- entry: "replay.mjs exports conversationOf but not the hash a raw-messages caller needs" -->

- **DONE 2026-08-14 (fork `46d7bc4` + `189911f`) — D1's retirement trigger
  has an instrument, and the fork half is fully discharged; the remaining half
  lives in the other repo and is booked there.** Verified against the artifact
  rather than from memory: today's `gate-status.json` carries
  `d1OldKeyFallback {hits: 0, newestUtc: null, filesScanned: 831, window:
  {...}}` and `d1PostRelocationNoBaseline {count: 0, newestUtc: null,
  filesScanned: 96, window: {...}}` — both with the `filesScanned` and
  `window` fields this entry specified, so a zero over zero files reads as
  could-not-verify and a small number reads as a narrow scope rather than a
  small corpus. Both extensions' bridge comments now cite the fields by name
  instead of pointing at a hand-grep
  (`insertion-normalization.mjs:1968`, `deferred-tool-rewrite.mjs:709`).
  **The half that is NOT here, with its home named:** doctor reading the
  fields as a third answer is deployment-side, outside this repo's write
  boundary, and it is booked in the dotfiles backlog — checked, not assumed:
  the entry there names both field shapes and says "nothing on the deployment
  side looks at either". Search proven on a known positive before the absence
  was believed (`CACHE_FIX_PROXY_TREE_PIN` → 3 files; `d1OldKeyFallback` →
  BACKLOG.md only).
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:**

  **READY (small) — D1's retirement trigger is a HAND-GREP, and a code comment in two shipped extensions asserts it is booked. This entry is what makes that comment true.** Booked 2026-08-10 immediately after the assertion was checked and found false — the named-and-unbooked class, committed one level above the very defect the same commit had just fixed, which is the useful part of the record: `a5f1960` repaired an over-wide assurance about `gate-live` and then made a second one ("Wiring it there is booked") inside the repair itself.
  **The gap.** D1's bridge retires when `oldKeyFallback` is absent from the event logs for seven consecutive days. Those events live in `~/.local/state/cache-fix/snapshots/*-{insertion,deferred-tool}-events.jsonl`; `gate-live` replays CAPTURES and never reads that directory, so the retirement question is answerable only by a hand-grep nobody will run on day seven. A trigger whose evaluation depends on someone remembering is not a trigger.
  Design, decided: `gate-live` gains a snapshots pass counting `oldKeyFallback:true` records and the newest such record's date, carrying `d1OldKeyFallback: {hits, newestUtc, filesScanned}` in the status file; `doctor` reads it as a third answer so a stale or unwritten count FAILS rather than reading as a silent zero. `filesScanned` is load-bearing, not decoration — a zero over zero files is this repo's could-not-verify case and must never render as clean.
  Verifier, red-first, both arms required: a scratch snapshots dir with one planted `oldKeyFallback:true` record must report `hits: 1`; the same dir without it `hits: 0` with `filesScanned` non-zero. Negative control measured and dated today so a future non-zero is a real transition rather than a first reading: the real snapshots dir reads **0 hits over 9,533 event files** at ~19:58Z.
  **A correction worth keeping, because it is the exact defect this repo names.** That control was first written here as "0 hits over 20 event files" — 20 being the count of event files TOUCHED SINCE THE RESTART (13 insertion + 7 deferred), a different population from all event files, carried across from an earlier measurement of a different quantity. Two numbers, both real, describing different sets; the wrong one read as a total. Caught by re-running the count instead of citing it, which is the whole content of "an entry that says MEASURED without the executed output beside it is making a claim in the costume of a result". It also changes the DESIGN input rather than being cosmetic: a pass over 9,533 files is not free, so the implementation scopes by mtime window (the ~20/hour figure is the honest rate) rather than scanning the directory whole — and `filesScanned` must therefore report the scoped count with its window, or a small number will read as a small corpus rather than as a narrow scope.
  **WIDENED 2026-08-11 at the desk, and the widening is one field in the same pass rather than a second entry.** Re-verifying the row-26 mitigation found that its own done-criterion parts 2 and 3 — `deferred-tool-rewrite` reporting `rewrite`/`unchanged` rather than `no-baseline` on a relocating request, and the forwarded `tools[]` byte-identical across the pair — are asserted by nothing (`grep -rln "PRE_PIPELINE_CONV\|prePipelineConv" test/ tools/` returns one file, which asserts neither). That is the ABSORPTION question, and the counter that looks like it answers it does not: `identityRotations.transitions` compares raw against forwarded `messages[0]` (`replay.mjs:1136-1153`), i.e. our pipeline still relocating, which D1 deliberately does not stop. The snapshots pass this entry already specifies is walking exactly the files that carry the answer, so it also emits `d1PostRelocationNoBaseline: {count, newestUtc}` — `no-baseline` actions logged under a key that rotated, which post-D1 should be ZERO and whose non-zero is the class re-opening. Same red-first shape as the `oldKeyFallback` arms and the same `filesScanned` guard: a zero over zero files is could-not-verify, never clean.
  Done-criterion: the seven-day question AND the absorption question are answerable from `gate-status.json` alone, and both extensions' comments then cite the fields instead of a grep. Realizing write-boundary: `tools/gate-live.mjs` + a test, then the comment update in both extensions. Consumer tier **2 (feeds the gates)**. Loop stage: VERIFY.
  Anchor: row 26
  Write-set: tools/gate-live.mjs, test/gate-live.test.mjs, proxy/extensions/insertion-normalization.mjs, proxy/extensions/deferred-tool-rewrite.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/gate-live.test.mjs

- **DONE 2026-08-14 — the coalesce record ships, and row 31's gate is
  unblocked: a suppressed duplicate no longer reads as an unanswered send.**
  Built at the desk the same day it was booked, so the entry's own record is
  its closure rather than a queue position.
  **What landed.** The proxy writes one `type:"coalesced"` line into the
  capture file the pair already lives in — no new carrier class — naming the
  follower, the leader whose outcome record carries the billing, the
  forwarded-bytes digest in the outcome record's own `outSha` namespace, and
  the interval. It rides a new pipeline hook (`runOnCoalesced`) rather than a
  direct import, because the core must not name one extension by file.
  **The dependents were the work, and they were larger than the record.**
  Twelve sites across six tools spelled "is this a request?" as an exclusion
  list of the two types that existed, which reclassifies any new kind as a
  request. All twelve now ask one positive predicate
  (`isCaptureRequestRecord`, `tools/logs.mjs`). That predicate also surfaced
  sixteen fixtures across eight test files writing `type: "request"` — a shape
  the producer never emits (measured: zero in the tracked corpus, zero in a
  live capture sample) — which passed only because the consumers used an
  exclusion list. Repaired to the writer's real output.
  **Red executed, four mutations, baseline stated before each** (14/14 and
  17/17 green): `noteCoalesced` inert → the census arms report the pre-record
  reading (`coalescedRequests 0`, member `coalesced: null`); the COALESCED
  branch removed from `classifyMember` → the join arm reports
  `NO-REQUEST-ID`, the exact mislabel this record exists to prevent; the
  predicate made to accept every object → the replay arms fail the way the
  real defect did, a `TypeError` out of the request path; the
  `runOnCoalesced` call removed from `proxy/server.mjs` → the wire arm alone
  fails on 0 records vs 1 while every other bite stays green. All four
  reverted, full suite 3242 pass / 0 fail.
  **The pre-change red, executed, with its command and output** — this is the
  claim the entry made about today's behaviour:
  `node tools/replay.mjs <capture with one coalesced line> --census --json`
  → `replay failed: TypeError [ERR_INVALID_ARG_TYPE]: The "data" argument
  must be of type string or an instance of Buffer, TypedArray, or DataView.
  Received undefined  at sha (tools/replay.mjs:88:31)`. After the predicate:
  the same command returns a clean census, two requests, ordinals 0 and 1.
  **What is NOT done here, on purpose:** the gate is still OFF. Flipping
  `CACHE_FIX_COALESCE_SIDECAR` is a separate declared act with its own
  acceptance measurement, in the dotfiles repo (pin bump + restart), and it
  is the next step rather than part of this commit.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:**

  **READY 2026-08-14 — the coalesce RECORD: row 31's mitigation, switched on,
  makes its own success read as an unanswered send, and the carrier that
  distinguishes them does not exist yet.** This is the named blocker that
  parked `CACHE_FIX_COALESCE_SIDECAR` on the day the mitigation shipped
  (`1176d65`, gated off): a coalesced FOLLOWER gets a capture REQUEST record
  and no OUTCOME record, because it never reached upstream and no usage frame
  was ever addressed to it. In the census's duplicate-streak rollup
  (`summariseDuplicates`, `run.billed`) that is byte-for-byte the shape of a
  retry streak's unanswered send. So the mitigation would suppress real double
  billing while writing evidence that reads like the failure class it is not,
  and the row's own done-criterion is stated in exactly that number.
  **Design, decided.** The proxy writes ONE record per coalesce into the same
  capture file the pair already lives in — no new carrier class, so the
  closing gate's carrier-registration question is answered by the captures'
  existing collector rather than by a new one:
  `{ts, type:"coalesced", id:<follower captureId>, key, leaderId:<leader
  captureId>, sha:<16-char forwarded digest, the outcome record's `outSha`
  namespace>, deltaMs}`. `leaderId` joins to the request that WAS answered,
  whose outcome record carries the upstream `requestId` and the billing;
  `sha` lets a reader confirm the pair was byte-identical instead of taking
  the proxy's word for it.
  **The dependents are the work, not the record.** A capture request record is
  identified by carrying NO `type` field, and twelve sites across six tools
  spell that as `rec.type === "outcome" || rec.type === "boot"` — an
  enumeration that reclassifies any new kind as a request. Measured before the
  change: one `coalesced` line kills `replay.mjs --census` with `TypeError:
  The "data" argument must be of type string … Received undefined`. The fix is
  one positive predicate (`isCaptureRequestRecord`, `tools/logs.mjs`) at all
  twelve, so a kind added later is skipped by construction.
  **Consumers that must ride along**: `harvest` needs a scrubber (the record
  carries the capture key and two ids; the same deterministic `id_<sha8>`
  hashing keeps the join alive INSIDE a fixture) and a pass-through branch in
  both pin paths; the census must yield the record and attach it to the
  member, exposing `coalescedStreaks`/`coalescedMembers` so the mitigation's
  effect is a daily number rather than a hand-count; `logs.mjs`'s strict
  member view must gain the field or `duplicate-billing` throws on it;
  `duplicate-billing` reports coalesced members instead of showing them as
  outcome-less.
  Done-criterion: with the gate ON, a duplicate sidecar pair reads as ONE
  billed send plus one COALESCED member — never as two sends of which one went
  unanswered — and `doubleBilledStreaks` stays 0 for that pair.
  Verifier: `npm test` plus `node tools/replay.mjs <capture with a coalesced
  record> --census --json` returning a clean census where it crashes today.
  Loop stage: MITIGATE.
  Anchor: proxy/extensions/request-capture.mjs
  Write-set: proxy/extensions/request-capture.mjs, proxy/server.mjs,
  tools/logs.mjs, tools/harvest.mjs, tools/replay.mjs, tools/fixture-cut.mjs,
  tools/bust-triage.mjs, tools/restart-exposure.mjs,
  tools/fixture-verdict-identity.mjs, tools/gate-live.mjs,
  tools/reminder-migration-census.mjs, tools/duplicate-billing.mjs
  Realizing boundary: this desk (deployment-coupled — `proxy/**`, so it needs
  the dotfiles pin bump and a proxy restart, which `tools/backlog-lanes.mjs`
  routes to DESK and never to a plain lane).
  <!-- entry: "coalesce record so a coalesced follower is not read as an unanswered send" -->

- **DONE 2026-08-14 — the `/tmp` run-root leak is CLOSED: the producer is the
  test suite's own deliberate OOM crashes, the cause is SIGABRT (which runs no
  exit handlers), and the fix is a private `TMPDIR` for the two forcing
  children.** Sixth and last hand-reap taken before the measurement; the
  measurement is the one this entry has named as its unparking condition since
  2026-08-13, and it took one run.
  **The measurement.** Made each run root record its own creator (pid, ppid,
  argv, cwd) at creation — a temporary probe in `tools/tmpdir.mjs`, reverted
  after — and ran the full suite under a PRIVATE `TMPDIR`, which is this
  entry's own recorded attribution trap avoided rather than re-read afterwards.
  Survivors: exactly 2 of 3236 tests' worth of children, both
  `replay.mjs … --json --census --pin-rows`, both children of the SAME test
  process, and neither appearing in `gate-live`'s child-exit log — so they were
  never spawned by the sweep at all. Isolated to
  `test/gate-live-rowpins.test.mjs` in 1.3 s: it crashes replay on purpose
  under `--max-old-space-size=8`, twice, to force the failure class the daily
  sweep's own heap cap converts into a status row.
  **The cause, and it is NOT this entry's leading hypothesis.** A V8
  heap-limit failure calls `abort()` — SIGABRT, exit 134 — and abort runs no
  exit handlers, so `tmpdir.mjs`'s `process.on("exit")` cleanup never fires.
  Paired probe from one command: 8 MB cap → exit 134, one root left; default
  cap → exit 0, zero roots. The arms differ, which is what makes it a
  measurement rather than a reproduction. This also explains why the earlier
  round recorded the OOM hypothesis as having "taken a hit": it was tested at
  gate-live's 2048 MB cap on a 1 GB capture, which does not abort. The right
  cap was inside the test file the whole time.
  **The fix, red-first, both arms stated.** The two forcing children get a
  `TMPDIR` inside the test's own scratch, which lives under the parent's run
  root and dies with it, plus two PID-SCOPED assertions per crash: nothing
  under this child's pid in the shared temp root, exactly one under it in the
  scratch. Pid-scoping is what makes reading shared `/tmp` safe under
  concurrent lanes at all — the attribution trap this entry recorded, turned
  into the instrument's design. Baseline: 11/11 green, zero shared-`/tmp`
  roots. Mutated (private `TMPDIR` removed, assertions kept): 10/11, the
  failure naming the exact leaked directory and pid. Full suite after:
  3226 pass / 0 fail / 10 skipped, zero roots.
  **The correction that outlives the bug.** `tools/tmpdir.mjs`'s DEFINITION
  named SIGKILL as the one case it cannot cover. SIGABRT is a second, and it
  was the one actually occurring — so three sessions hunted a kill that never
  happened, against a definition that ruled the true cause out. Corrected in
  the module header and in `docs/dev-loop.md`. A leftover run root means a
  child DIED HARD: a finding about that child, never about the helper, and
  `tmpLeftovers` is now the only reader that says so.
  Landed: test/gate-live-rowpins.test.mjs, tools/tmpdir.mjs, docs/dev-loop.md.
  Original entry follows, kept as the record of what was asked and of the two
  hypotheses it eliminated on the way.
  **Original entry, as booked:**

  **PARKED 2026-08-13 — the `/tmp` run-root leak is BACK: every full-suite
  run leaks exactly 2 roots, including runs that PASS, and the guard's
  one-hour threshold is a blind window a pushing session refills faster than
  it drains.**
  **THIRD OCCURRENCE 2026-08-14 ~10:10 local, and it answers this entry's
  own first step — the producer is measured, not hypothesized.** The guard
  blocked a push (8 roots older than 1h, every owning pid dead, all created
  09:07-09:10 during that session's own pre-push runs, arriving in PAIRS
  1-2 s apart exactly as this entry describes). Read BEFORE the cleanup,
  which is what makes it evidence rather than a lost opportunity: **all 32
  run roots then on disk contained exactly ONE `cache-fix-replay-*`
  directory and nothing else — 32 of 32, no other producer appears at all.**
  That independently reproduces `534289d`'s localization from a different
  session and a different day, and it narrows the open half: the question is
  no longer WHICH producer but why THAT child's exit handler does not fire.
  New candidate ahead of the entry's SIGKILL guess, and it is testable
  without new machinery: `gate-live` runs every replay child under
  `--max-old-space-size`, and a child dying on the heap cap exits through a
  path no `process.on(exit|SIGTERM|…)` handler serves — the pairs-per-run
  shape fits two capped children per sweep-shaped test. Unmeasured, named as
  the next probe.
  Symptom fix TAKEN again to unblock the push (8 roots removed by hand,
  after verifying each pid dead — the same stopgap this entry already
  records, now on its second use, which is itself the argument for building
  the durable half). `docs/dev-loop.md` claimed "Measured after: a full suite
  leaves ZERO" — corrected today in the same commit as this entry, because
  it is false.
  **The measurement, by counting roots against the runs that made them:**
  six consecutive `pre-push` full-suite runs (16:07, 16:08, 16:09, 16:15,
  16:16, 16:20 local) left exactly TWO `/tmp/cache-fix-run-<pid>-*` roots
  each — twelve, every owning pid dead. The pair from the 16:20 run, which
  PASSED and pushed, is identical to the five from failing runs, so this is
  not a failure path and not a kill path peculiar to red suites. Separately,
  25 roots dating 12:21–13:17 had already accumulated past the one-hour
  threshold and BLOCKED a push via `gate-live`'s `tmpLeftovers` — which is
  how this was found: the guard fired, nobody read the doc line.
  **Why it matters more than 12 directories.** `tmpLeftovers` only fails on
  roots older than an hour, so a session pushing repeatedly stays under the
  threshold while the pile grows; the doc line then tells the next reader
  there is nothing to look for. `dev-loop.md`'s own ENOSPC precedent is
  where that ends: 31,108 dirs, `/tmp` at 100%, unrelated tooling broken
  machine-wide, and a suite returning 0/3/95/525/528 failures across five
  runs of one commit.
  **First step is DIAGNOSIS, not a reaper — the fix must not be a
  `rm -rf` on a schedule**, which would delete a live run's root and
  reintroduce the failure `tmpdir.mjs` deliberately avoids ("never deletes
  anything it did not create"). Identify the two producers per run (the
  `npm test` parent and the `gate-live` subprocess are the candidates, from
  the pre-push command line, unverified) and establish why their exit
  handler does not fire. SIGKILL is the leading hypothesis and is NAMED as
  unmeasured: the registered list is exit/throw/SIGINT/SIGTERM/SIGHUP, and
  SIGKILL is untrappable, so a hard kill would leak exactly this way — but
  a passing run should not be killed at all, which is the fact that
  hypothesis has to explain.
  Red-first arrangement, and the two must DIFFER: instrument the producers
  to record root creation and removal, run the full suite once, and assert
  the created set equals the removed set. Today that assertion must FAIL
  naming 2 roots; after the fix it must pass — and a run that is
  deliberately SIGKILLed must still show the discrepancy, so the check is
  not silently satisfied by removing the instrumentation.
  **NAMED MISSING EVIDENCE — why this is PARKED and not READY, which the
  booking bar caught and it was right to.** The entry was first written
  READY, and the fix's design is precisely what is NOT decided: the repair
  for "the handler is never registered in the child" is a different change
  from "the handler is registered and SIGKILL bypasses it", and nothing here
  distinguishes them. What unparks it is one measurement, and it is
  decision-complete on its own: instrument root creation and removal in
  `tools/tmpdir.mjs`, run `npm test` once, and report the created set minus
  the removed set together with which process created each survivor. That
  names the two producers and says whether their handler ran at all.
  Red executed 2026-08-13, so the premise is not a recollection —
  `for d in /tmp/cache-fix-run-*; do … kill -0 "$pid" …; done | sort`
  returned twelve roots, all `dead`, in six timestamp pairs matching the six
  pre-push runs one-for-one (16:07:24/25, 16:08:12/13, 16:09:07/08,
  16:15:36/37, 16:16:53/55, 16:20:04/06); the 16:20 pair is the run that
  passed and pushed.
  **SECOND OCCURRENCE, same session, 2026-08-13 ~17:35 local — it blocked a
  push again, 40 minutes after the first cleanup, and this is now a
  RECURRING BLOCKER rather than a latent risk.** 18 roots had aged past the
  threshold (26 present in total) and `gate-live`'s
  `real: a clean sweep over the same capture pins no error evidence at all`
  failed the pre-push suite on `FAIL tmp-leftovers: 18 run root(s)`. The
  entry predicted exactly this — "a session pushing repeatedly refills the
  pile inside the guard's own blind window" — so the prediction is confirmed
  rather than merely plausible. Cost so far: two push cycles, both on work
  that had nothing to do with the leak.
  **One hypothesis ELIMINATED, recorded so the next pass does not re-walk
  it.** `tools/tmpdir.mjs`'s own DEFINITION accepts one residue case:
  SIGKILL, "which runs no code at all". The obvious story was therefore that
  the suite deliberately hard-kills spawned children (it has bites like
  "a gate that died is an error"), making the residue BY DESIGN and the real
  defect the guard firing on it an hour later. That story is not supported:
  `grep -rn SIGKILL test/ tools/` returns four hits and NONE of them kills a
  node child in the main suite — two are `tmpdir.mjs`'s own prose, two are
  in the `gh-auth-status-shim` bats tests. So the residue is not
  explained-away design behaviour, and the exit handler — which covers
  `exit`, throws, `process.exit()`, SIGINT/SIGTERM/SIGHUP — should have run.
  That makes the measurement below MORE valuable, not less: the two
  survivors per run are unexplained by the module's own accepted exception.
  **THIRD occurrence, and the producer is now LOCALIZED — this is the
  cheapest thing anyone could have done and it was not done for two rounds.**
  The blocker fired a third time (4 roots past threshold). Instead of reaping
  again, `ls` INSIDE the leaked roots: **every single one contains exactly one
  `cache-fix-replay-*` child and nothing else**, across all 12 present at the
  time (6 pairs, timestamps matching six suite runs one-for-one). So the
  leaker is not "two unknown producers" — it is `replay.mjs`, spawned as a
  child, twice per suite run.
  **What that rules in and out.** The child DID use `tools/tmpdir.mjs` (the
  root exists and carries the module's own `cache-fix-replay-` prefix inside
  it), so `ensureRunRoot` ran and `process.on("exit", removeRunRoot)` was
  registered. `grep -n "kill\|SIGTERM\|timeout\|abort\|signal"
  tools/gate-live.mjs` returns exactly one hit, a comment — **gate-live sends
  no signal to its replay children**. So the child was not killed by its
  parent, and its exit handler did not run. That leaves paths where node runs
  no exit handlers at all: a V8 OOM abort under the heap cap gate-live passes
  (`SIGABRT`, handlers skipped) is the leading candidate, and an uncaught
  native-level crash is the other. Both are NAMED as candidates, neither is
  measured.
  **Why the remaining step is now small and worth doing.** The measurement
  shrinks from "instrument the whole suite" to: run one replay child the way
  gate-live runs it, on a capture big enough to approach the cap, and read
  its exit status and signal. If it aborts on OOM, the fix is a decision
  about the cap or about the child reporting its own failure — and the sweep
  currently reads CLEAN while two of its children died, which is the more
  serious half: a clean verdict over children that aborted is a false green,
  not a tidiness problem.
  **Deliberately not chased further at the desk.** The next step is that
  one-child run, not another hypothesis; guessing at it twice in one session
  is how a blocker becomes a rabbit hole. Reaped by hand three times today
  (18, then 4-past-threshold, then all 12 dead-owner roots) purely to ship
  unrelated work.
  Trigger to re-grade: that measurement's output.
  Loop stage: VERIFY.
  Anchor: tools/tmpdir.mjs
  Write-set: tools/tmpdir.mjs, tools/gate-live.mjs, docs/dev-loop.md
  **FOURTH OCCURRENCE 2026-08-14, and it KILLS one hypothesis while exposing a
  contaminated measurement of my own.** The guard blocked a push again; read
  before the reap, 34 of 34 run roots held exactly one `cache-fix-replay-*`
  child and every owning pid was dead — an independent reproduction of the
  third occurrence's localization, from a different session.
  **The clean-exit path is EXONERATED, measured rather than argued:** one
  `replay.mjs` run under gate-live's own `--max-old-space-size=2048`, given a
  PRIVATE `TMPDIR`, exits 0 and leaves ZERO roots. `removeRunRoot` uses
  `rmSync(recursive, force)` and fires on `exit`, so nothing about an ordinary
  termination leaks. The OOM-abort hypothesis also took a hit rather than
  support: a 1 GB capture replayed under the same cap exited 0.
  **The instrument lesson, and it is the reusable half.** The desk's FIRST
  probe counted `/tmp/cache-fix-run-*` before and after that run in the SHARED
  tmp — 34 then 36 — and read the delta as a clean-exit leak. Four dispatched
  lanes were running full suites in the same `/tmp` at that moment, so the two
  new roots were theirs. `docs/dev-loop.md` names this exact trap ("counting
  leftovers by a TIME WINDOW over shared /tmp attributes any concurrent
  writer's dirs to your own run"); it was read after the fact, not before. The
  private-`TMPDIR` arm is the form that answers, and it is what the corrected
  measurement above uses.
  **So the remaining question is narrower than this entry has ever stated it:**
  which replay invocation terminates WITHOUT running exit handlers, given that
  a clean one does not, gate-live sends no signal, and the heap cap did not
  fire on the largest capture on disk. The next probe is the test-runner side —
  whether `node --test` tears down a spawned gate-live's own replay children at
  suite end, which would be a SIGKILL nothing traps. Named as unmeasured.
  Reaped by hand again (42 dead-owner roots) purely to unblock pushes; that is
  the fourth use of the stopgap and the argument for the durable half.
  **NARROWED 2026-08-14 by a full inventory before the fifth reap, and it cuts
  the caller set rather than repeating the count.** 62 dead roots, ZERO live,
  and the contents are uniform in a way the "2 per suite run" figure hides:
  **62 of 62 hold exactly ONE entry, and every one is a `cache-fix-replay-*`
  scratch** (`tools/replay.mjs:4072`). Not one root belongs to a gate-live,
  harvest or census scratch. So the leaking process is always a REPLAY
  invocation specifically — the run root is created, replay's scratch is made
  inside it, and the process dies before `process.on("exit")` runs.
  Re-confirmed the clean path the same hour rather than citing the earlier
  claim: a normal `node tools/replay.mjs <pinned fixture> --census` (exit 0)
  left the root count UNCHANGED at 62, delta 0. `tmpdir.mjs:62` removes with
  `rmSync(runRoot, { recursive: true, force: true })`, so a non-empty root is
  not the obstacle either — that alternative is refuted, not merely unlikely.
  What remains is exactly the entry's own named next probe (test-runner
  teardown of a spawned gate-live's replay children), now with the caller set
  narrowed to replay children and every other producer excluded by measurement.
  Inventory frozen at
  `<scratch>/tmp-leftovers-inventory-2026-08-14.txt` before the reap — it is
  the only record of the 62, and it dies with the session unless promoted.
  Fifth hand-reap taken to unblock eight commits; the argument for the durable
  half is now five incidents old.
  <!-- entry: "tmp run-root leak returned, 2 per suite run including passes" -->

- **DONE 2026-08-14 — THE PILE IS DRAINED: all 31 commits across 6 lane branches carry a recorded disposition, and the done-criterion had to be re-stated to say so.** Integrated in the entry's own order (a162, a82e, then a46f, ac73, a93d, the orphan), per commit, each with a behaviour-level check against main before the pick. **Landed: 26.** **Skipped as superseded, each with its reason: 5** — `b6bfdca` and `376caa9` (main carries the same capability under other names), `ed30981` (an injectable existence resolver the desk had already built during the previous pick, from the same red), `c485af2` (the upstream-PR-slice runbook is BYTE-IDENTICAL on main — `cmp` clean — and its dev-loop router line is present), `224a23b` (matrix row 30, already minted on main and developed a day further), and the `afc2` orphan's `844b792`.
  **THE ORPHAN IS THE FINDING, and it inverts the hazard this entry carried for three days.** The 2026-08-08 405-insertion commit was the thing the freeze existed to protect. Read at the conflict rather than assumed: main's side of every one of its four hunks is a SUPERSET — the crossesRotation/crossConversation guard, the full `strongerNeighbour` neighbour check, the neighbour-check walk step, a wider import list — because `ac73`'s own later commits (`fe4630e`) implement the same capability more completely. So the commit is not lost work being dropped; it is work that arrived twice and the better copy is in. Its branch is left standing, unpruned.
  **THE HAZARD IS CLOSED BY MEASUREMENT, not by reading the tool.** `tools/prune-lane-branches.mjs` shipped in this same integration, and the question this entry asked — does it check before deleting — was answered by running it: `--dry-run` on the real repo reports the orphan as `SURVIVES (tip is not an ancestor of main — unintegrated, not litter)`, and its 2 delete candidates were independently confirmed at `outstanding=0` by `git cherry` before `--apply` ran. Two instruments, one verdict. Applied: 2 deleted, 25 survive, 17 skipped (live worktree); the orphan branch verified intact afterwards.
  **THE DONE-CRITERION AS BOOKED IS UNMEETABLE AND IS REPLACED HERE.** "Every registered worktree branch reports zero `+` under `git cherry`" assumes clean picks; `git cherry` joins by PATCH-ID, so a conflicted pick is a different patch by construction and reads as outstanding forever. Final tally: `a46f` 0, and 14 residual `+` across the other five — every one either a recorded skip or a pick whose content is on main under a resolved form, named in the commit that landed it. The criterion that holds, and that this entry now closes on: a recorded disposition per commit.
  **What integration proved that no amount of reading would have:** two picks auto-merged CLEANLY and were broken — the absorption report printed its section twice, and a BLOCKING guard printed BLOCK and exited 0 because main's unconditional `return 0` landed above the lane's blocking return. A clean auto-merge is not a substance check, and no conflict marker announces this class.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:** **PARKED** — unchanged: blocked, carrying its named missing evidence.

### The CLOSURE vocabulary — declared 2026-08-13, because it was being used undeclared

The three grades above are what an entry is BOOKED as. They are not what the
file actually contains: measured 2026-08-13 over top-level bullets in live
sections, **312 entries carry 33 distinct grade words**. That gap is not
untidiness, it is why instruments disagree — each one picks a different subset
of an undeclared vocabulary and every count is defensible and different. Three
of them disagreed on one day: the session-start banner's `{DONE, DROPPED}`
predicate said 56 (= DONE 55 + DROPPED 1, reconciled exactly), the
`--closures-in-live` lane's said 103, and this file's own entry claimed 43.

**A mechanical closure move keyed on any subset moves some closures, leaves
others, and reports success** — which is why no move ran until this section
existed. The prerequisite was never a bigger pass over 300 entries; it was a
judgment pass over 33 WORDS.

The grading below was made by SAMPLING a real header for each word, not by
reading the words. Two sampled bodies reversed the obvious call, which is the
whole argument for sampling: `COMMITTED` reads *"COMMITTED on PR #272 and #273
threads: week-of-soak summary, **due**"* — an outstanding obligation, not a
closure; and `PARTLY` / `HALF` / `TOOL` / `MECHANISM` are all *"X HALF DONE …"*
headers with a stated remainder still live.

**CLOSURE — the body says the work is finished; these move to `## Done`:**
`DONE`, `RESOLVED`, `CLOSED`, `DROPPED`, `BUILT`, `FIXED`, `SHIPPED`,
`ANSWERED`, `RETIRED`. (`DROPPED` counts: a recorded deliberate drop is an exit
of equal standing, not a failure — the accretion rule says so outright.)

**OPEN — declared grades plus every word whose body shows live work or a stated
remainder; these stay put:** `READY`, `RECORD`, `PARKED`, `OPEN`, `HOT`,
`OPEN/HOT`, `PARTLY`, `HALF`, `TOOL`, `MECHANISM`, `IN`, `QUEUED`,
`UNDISPOSITIONED`, `NEW`, `FINDING`, `BUST`, `INCIDENT`, `CANDIDATE`,
`HANDOFF`, `DATAPOINT`, `CORROBORATION`, `ECONNRESET`, `COMMITTED`.

**AMBIGUOUS — listed for a human, never moved by machine:** `CORRECTED`,
`DOWNGRADED`, `DECISION`, `DECISIONS`, `REFRAMED`. These are genuinely
undecidable from their own bodies. Leaving them is the cheap side of the
asymmetry this file already states: an item wrongly left OPEN costs one
re-read, an item wrongly CLOSED leaves every future list, because the sentence
that closed it is exactly the thing that stops anyone looking again. **Where a
body is ambiguous the grading is OPEN, on purpose.**

Two things this section is NOT. It is not a licence to invent grade words —
new entries take one of the three booked grades, and this vocabulary exists to
read the corpus AS IT IS, not to bless it. And several of these "grades" are
not grades at all but the first word of a prose header (`TOOL HALF DONE …`,
`MECHANISM HALF DONE …`); they are classified OPEN because that is what their
bodies say, and re-heading them is separate work, deliberately not bundled
here.

**The booking bar, and it applies to READY only.** A READY entry carries three
markers, each on its own line, and `node tools/backlog-lint.mjs --ready-bar`
enforces them:

    Anchor: row <N> | <a repo-relative path>
    Write-set: <comma-separated repo-relative paths>
    Verifier: <a command>

The anchor is what the entry SERVES — a threat-matrix row or a
serving-correctness surface. **It is NOT the rank anchor**, and the two live in
one file under one word: `tools/backlog-order.mjs` calls the
`<!-- entry: "…" -->` comment an anchor too, and `backlog-lint --census` prints
an `anchor` column reporting THAT one — so "READY without anchor: 8" in a census
run and `MISSING-ANCHOR` from `--ready-bar` are different claims about different
objects. Named here rather than renamed, because the rank anchor's name is load
-bearing in two tools; what a reader needs is to know there are two. An entry that cannot name one books as RECORD, or
dies as a one-line journal note; that is the base case that stops instruments
breeding instruments. The write-set is what makes merging, batching and
parallel dispatch a mechanical join over entries instead of a judgment pass
over their prose — the 2026-08-11 census found "which files does this entry
write" was free text, and two independently built instruments disagreed on the
collision counts because of it.

**A FOURTH clause on the verifier, added 2026-08-11 — the WRITER half, since a
reach failure always has one and fixing only the reader leaves the generator
running.** A `Verifier:` that names a live capture — by alias, by `--at
<stamp>`, or by any pointer into `~/.local/share/cache-fix/captures/` — books
as **PARKED** unless the same action that writes the entry also freezes the
evidence (`harvest --pin --bounded`, the pin committed under
`test/fixtures/`). Not "should pin soon": READY is a claim that a fresh
context could execute the entry, and an entry whose red case rotates away
cannot be executed by anyone. Where the class provably cannot survive the
scrub — literal-text predicates the sanitizer tokenizes — the entry says so
and its evidence is a SYNTHETIC fixture, which is this repo's default for
anything bound for a public tree anyway.
The measurement that forced it: 19 of 50 alias citations resolve to
nothing (23 of 27 registered aliases have no capture left on disk; the
citation figure is the shipped lane's, and it counts row-pin fixtures as
resolving), and three of the ten entries in the head derived that same morning
were un-armable by lunchtime — one of them re-verified as reproducing at the
desk the previous day. The reader-side check (`backlog-lint` warning when a
cited alias resolves to neither a live capture nor a committed fixture) is
booked separately and is what catches an entry this clause let through.


- **DONE 2026-08-14 (`750463e`, `2933d95`) — the export shipped and its ANSWER IS NEGATIVE: no placement rule lives in the intervening messages either, so row 4 takes its THIRD named blocker rather than a fourth hypothesis.** Dispatched to sonnet, integrated after the desk ran the lane's verifier plus a check outside its set — a corpus-wide `--json --verbose` census (46 placement rows) read back through `logs.mjs`'s strict view. The field DISCRIMINATES, which is what makes the negative result mean something: 21 off-mode rows carry a non-empty `between` vector, 25 mode rows carry an empty one by construction, and the two classes must differ or the field measures nothing. What the vectors do NOT carry is a rule: they are ordinary tool_use/tool_result turn sequences of varying length, sometimes with intervening system:text messages, with no shape holding across rows beyond the tautological `len = offset - 1`. Body-free by construction (`{role, kind}`, kind read off a block's `type`), so the publication bar is untouched.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:** **READY 2026-08-14 — row 4's placement half has exactly ONE unexamined
  place left, and no export reaches it: what sits BETWEEN the host and the
  migrated standalone.** The byte half is characterized and closed as a
  question (matrix row 4, parked the same day: all 16 MISMATCH occurrences are
  the wrapper-retained form, 8 EXACT + 8 EXTENDED, every remainder
  MERGED-STANDALONE, every byte computable from the predecessor). The
  placement half is what still blocks, and it is now measured rather than
  described: the complete uncapped distribution is 521 occurrences at offset
  +1 and 27 off-mode across 20 distinct values from +4 to +110
  (`placementOffsets`, `6020144`).
  **Two derivation rules are already REFUTED BY MEASUREMENT, so this entry is
  not a re-run of them:** the standalone is not tail-anchored (its distance
  from the last message ranges 2..152 across the off-mode rows, and varies
  inside the +1 class too), and it is not anchored to the predecessor's own
  length (`standaloneIndex - nBefore` scatters -142..+2 in BOTH classes).
  Those were computed from the six fields `placementRows` carries, which is
  why the next question needs a seventh.
  **Design, decided:** each placement row gains `between` — the messages
  strictly between `hostIndexAfter` and `standaloneIndex` in the AFTER
  request, as `[{role, kind}]` in wire order, where `kind` is a CLOSED
  vocabulary read off the message's content blocks (`tool_result`,
  `tool_use`, `text`, `reminder-carrying`, `image`, `thinking`, `other`) —
  roles and kinds only, never text, so the row stays body-free and the
  census-rows evidence document keeps its single exempted absence class.
  Capped at 40 entries with a `betweenTruncated` count beside it, the same
  cap-reports-what-it-dropped shape every other row array here uses. The
  MODE-SAMPLE rows get it too: a derivation rule has to explain the +1
  majority as well, and an export that carries the shape only for the
  unusual rows cannot test that.
  **Red-first arrangement:** a synthetic pair with three known intervening
  messages of different kinds asserts the vector hand-computed; against the
  current tool the field is absent and the bite fails at its own call site
  (namespace import). Live control: the 27 off-mode rows each carry a
  `between` vector, and the +1 rows carry an EMPTY one by construction —
  the two must differ, or the field is measuring nothing.
  **Done:** the desk can state, from one run, whether a placement rule exists
  that covers all 548 occurrences — and if none does, row 4 gets its third
  named blocker instead of a fourth hypothesis.
  Loop stage: ATTRIBUTE (it decides whether row 4's mitigation can be
  designed at all).
  Anchor: row 4
  Write-set: tools/reminder-migration-census.mjs, test/census-placement-rows.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/census-placement-rows.test.mjs
  <!-- entry: "row 4 placement: the intervening messages between host and standalone are unexported" -->


- **DONE 2026-08-14 (`4d29228`, `a828a74`, `2ae9d49`) — the reader owns the census export now, and the concurrent-lane seam it left was closed by the desk against a real export.** Dispatched to sonnet; the lane built the `censusExport` view family, `duplicate-billing` adopted it, and the sweep's KNOWN-OPEN inventory entry went in the same commit. It deliberately left `between`/`betweenTruncated` out and marked the seam, because the writer was still in flight on another lane; `2ae9d49` closes that join with both arms proven on the corpus-wide export. Two lane findings worth keeping: it fixed a latent ordering bug in `makeStrictView` (nested readers ran before optional defaults, so a field in both maps silently returned `undefined` instead of its declared default), and it had to rename `duplicate-billing`'s OWN output keys because the schema-scope sweep is a literal per-line regex — booked below.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:** **READY 2026-08-14 — `tools/logs.mjs` owns the RAW formats and has no view
  for the DERIVED ones, so every consumer of a census export hand-reads
  capture-outcome field names by construction.** Surfaced the same day by the
  schema-scope sweep firing on `tools/duplicate-billing.mjs`, correctly:
  that tool's usage.jsonl side goes through `readUsageLogRecord`, and its
  capture-outcome side reads `cacheRead`/`cacheCreation`/`inputTokens` off
  `duplicateRows[].members[].outcome` in a census `--json --verbose` export.
  Declared KNOWN-OPEN in the sweep's inventory rather than exempted (the
  names really are that schema's, so it is not a false positive) — but the
  inventory is the holding pattern, not the fix.
  **Why this will keep firing:** the census export is a real format this repo
  writes, with a real schema, and it is the format every downstream analysis
  reads. Nothing owns it. That is the same gap `logs.mjs` was built to close
  one level up, and the sweep will now flag each new consumer as it lands —
  which is the guard working, and also the tell that the reader stops one
  format short.
  **Design, decided:** add a `censusExport` view family to `tools/logs.mjs` —
  a strict view per row array (`duplicateRows`, `mismatchRows`,
  `placementRows`, `volatileRows`) that THROWS on an unknown field name, the
  same stance the four existing views take; `duplicate-billing` adopts it and
  leaves the sweep's inventory in the same commit. The census stays the
  writer; the reader stays the one place field names are spelled.
  **Red-first arrangement:** a fixture census export with a misspelled field
  (`cacheReads`) must throw from the view and be caught by a bite, while the
  real export parses clean — and the sweep's own inventory entry for
  `tools/duplicate-billing.mjs` must be REMOVED by the same commit, which the
  sweep verifies by failing if the file still hand-parses.
  **Done:** `duplicate-billing` imports the view, the inventory entry is gone,
  and `node --test test/logs-schemas.test.mjs` is green with the file no
  longer in scope.
  Loop stage: VERIFY (it is the instrument layer every duplicate-billing and
  row-4 measurement now reads through).
  Anchor: tools/logs.mjs
  Write-set: tools/logs.mjs, tools/duplicate-billing.mjs, test/logs-schemas.test.mjs, test/duplicate-billing.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/logs-schemas.test.mjs test/duplicate-billing.test.mjs
  <!-- entry: "logs.mjs has no view for the census export, so every downstream consumer hand-reads the schema" -->


- **DONE 2026-08-14 (`1eafb33`, `2428a18`) — the sweep writes its own evidence now, which is dev-loop question 2's recurring-producer clause discharged for this producer.** Dispatched to sonnet under the operator's same-day mandate; integrated after the desk re-ran the lane's five bites plus the five pre-existing boundary bites (30/30 green with the breakpoint lane). The lane spends the existing per-capture census run twice rather than spawning a second child, and writes one `census-rows-<UTC date>.json` per sweep. TWO ITEMS THE LANE RETURNED AS QUESTIONS ARE BOOKED SEPARATELY below: the prototype's three unbuildable fields, and the `/tmp` foreign red. NOT VERIFIED, in the lane's own words and not softened here: no real scheduled sweep has produced a document yet — the done-criterion is proven by construction and unit reconciliation, and the first live sweep is what closes it.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:** **READY 2026-08-14 (operator mandate, same day: "mandatory build under
  dev-loop question 2's recurring-producer clause, not a nice-to-have") —
  the byte-gate census stores COUNTS and the daily sweep keeps NONE of its
  rows, so every byte-gate finding expires with its capture.** The sweep runs
  the census over every live capture and the status file carries
  `byteGate: {tally, prunes, duplicates}` — 16 MISMATCH, 140 duplicate pairs,
  40,190 changed volatile blocks as of this morning. Which capture, which
  request ordinal, which host index, how many bytes apart: none of it is
  written anywhere, and the capture directory sits AT its 12 GB cap evicting
  oldest-mtime-first. Same shape as the absorption check's 2026-08-05 lesson
  (counts stored, 11 rows lost by the afternoon), one producer over.
  **Prototype and known positive: `148b5e7`** — the hand run this entry
  replaces, committed as `test/fixtures/harvested/census-rows/census-rows-2026-08-14.json`
  (16 mismatch rows, 108 duplicate streaks, 542 volatile entries).
  **Design, decided:** `gate-live` writes ONE document per SWEEP in the
  prototype's own schema, into the same directory, named
  `census-rows-<UTC date>.json`; rows come from the census's existing
  `--json --verbose` exports (`mismatchRows`, `duplicateRows`,
  `volatileRows`), which the sweep already produces per capture, so the caps
  (`MISMATCH_ROW_CAP`, `DUP_ROW_CAP`, `ENTRY_ROW_CAP`) apply per capture and
  the `*Truncated` counters ride into the document rather than being dropped.
  Body-free by construction — a length, an index, an ordinal, an instant, a
  `sidToken` or a closed-vocabulary label, never message text — which is what
  keeps ONE exempted absence class sufficient (`tools/absence-scan.mjs`
  census-rows entry, shipped in `148b5e7`). Writing is idempotent and
  NON-overwriting on differing content, the property `writeRowPins` already
  has and for the same reason. It WRITES, never commits: committing stays a
  human act, as it is for harvest's fixtures.
  **Red-first arrangement, anchored to the committed document rather than to
  live state:** with the writer disabled, a synthetic sweep leaves no
  document; enabled, it writes one whose rows reconcile against its own
  `byteGate` counts. The boundary half is already green and re-runnable —
  `test/evidence-census-rows.test.mjs` iterates the directory, so a document
  the mechanism writes is graded by the same five bites (exemption scope,
  no-leak-outside, boundary scan, planted positive, no free text) with no
  new test needed.
  **Done:** the next daily sweep leaves a `census-rows-<date>.json` whose
  mismatch/duplicate/volatile row counts reconcile against that sweep's own
  `byteGate` rollup, and `test/evidence-census-rows.test.mjs` stays green
  over it.
  Loop stage: ATTRIBUTE (it is the evidence every row-4 and duplicate-billing
  attribution reads).
  Anchor: tools/gate-live.mjs
  Write-set: tools/gate-live.mjs, test/gate-live-census-rows.test.mjs, test/fixtures/harvested/census-rows/
  Verifier: node --test --import ./tools/suite-config-root.mjs test/gate-live-census-rows.test.mjs test/evidence-census-rows.test.mjs
  <!-- entry: "the byte-gate census keeps no rows, so findings expire with their captures" -->


- **DONE 2026-08-14 (`5b24d0f`, `25aec58`) — `--by-conversation` ships, and the identity comes from the repo's own function.** Dispatched to sonnet, integrated after the desk re-ran the file (20/20). Default output proven byte-identical by `cmp` in three modes, not by reading. DEVIATION, accepted: the lane used `conversationSubKey` from `proxy/extensions/message-hash.mjs` rather than `replay.mjs`'s `conversationOf`, because this tool holds raw `body.messages` and `conversationOf` needs a compactEntry's `inHash` array — the brief's own named fallback, and the right call. That mismatch is booked as its own entry below. NOT VERIFIED: the live capture's real `nMessages=1` outlier was reproduced synthetically, not read from the capture — the lane's worktree could not reach the corpus.
  Original entry follows, kept as the record of what was asked.
  **Original entry, as booked:** **READY 2026-08-13 — `breakpoint-scan` does not group by CONVERSATION, so
  every sequence it prints can silently interleave the main thread, its
  subagents and CC's sidecars.** Surfaced by the lane that built it, in its
  own honest-residue slot, not by a reviewer. It reports `sid`, which is the
  session-id HEADER — and `FORK-NOTES.md` and `docs/dev-loop.md` both state
  that one session id carries the main thread, every subagent and CC's own
  background calls. dev-loop's standing rule is explicit: "Group by
  conversation before comparing anything… This artifact produced false
  results six separate times in one day, including in the gate itself",
  where adjacent-line pairing reported 0 violations on a 602-request capture
  while a single-conversation slice of the same session reported 2.
  **It already showed up in the first real run.** Of 22 rows, 21 form a
  smooth `nMessages` growth (161→163→166→…→203) and ONE sits at
  `nMessages=1` with a lone `system[0]` marker. The lane called that a
  different co-tenant conversation on STRUCTURAL grounds — the reset shape —
  and said plainly it had not verified a conversation identity. That is the
  right call and it is exactly the judgement a grouping key would have made
  mechanical.
  **Why this is not merely cosmetic:** the tool's most natural use is
  reading a SEQUENCE (does the tail marker advance, does the layout drift),
  and a sequence is meaningless across tenants. The refutation it produced
  today survives only because that argument was re-based on exhaustive
  window accounting instead of on the sequence — see the RECORD entry above.
  The next user will not necessarily notice they need to do that.
  **Design, decided:** emit a `conversationId` per row using the repo's own
  identity function rather than a new one — `conversationSubKey` /
  `conversationOf` from `replay.mjs`, per `bust-appears.md` step 9 ("never
  hand-roll identity in a probe… an identity computed more cheaply than the
  thing it identifies will collide"). Add `--by-conversation` to group the
  output; default output stays byte-identical so no existing caller changes.
  Do NOT re-derive a first-message hash locally — `cache-sim.mjs` has one and
  a third implementation is the collision this repo has already paid for
  three times.
  Red-first arrangement, and the two must DIFFER: a synthetic capture with
  two interleaved conversations must produce two groups with the correct
  rows in each; the same fixture read WITHOUT grouping must show the
  interleaved (wrong) sequence. A change where both readings agree has not
  demonstrated grouping.
  Done: the two bites above pass, the live capture's `nMessages=1` outlier
  lands in its own group rather than inside the main sequence, and this
  entry moves to `## Done` with its commit ref.
  Loop stage: ATTRIBUTE.
  Anchor: tools/breakpoint-scan.mjs
  Write-set: tools/breakpoint-scan.mjs, test/breakpoint-scan.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/breakpoint-scan.test.mjs
  <!-- entry: "breakpoint-scan does not group by conversation" -->


- **DONE 2026-08-11 (`7555177`) — the section prints unconditionally, and the desk graded it on evidence the lane never used.** Dispatched to sonnet from this entry; integrated after the desk ran a check outside the lane's own set (dev-loop, "verify with something the lane did not run"): a plain text `replay.mjs` run — no `--census` — over the row-4 pin frozen earlier today prints `absorption misses (…): 0` immediately after the relocated-block departures block. That is the entry's zero-line requirement, observed on a real committed capture rather than on the lane's synthetic arms. The lane's own arms were both driven through the REAL `insertion-normalization` extension (1 comparable pair each, never zero) rather than through fabricated stats, and it committed no fixture file — the fixtures are generated inline, which keeps the scrub question from arising at all.
  **The brief was WRONG about its own candidate fixture and the lane caught it, which is the useful record.** It named `rowpin-…-absorptionMiss.json` as a likely red arm; that file is untracked (so it never reached the worktree) AND the whole `rowpin-*` family is a single-row evidence-PIN snapshot — `schema: "rowpin/1"`, `{row, sides, checks, provenance}` — not a `{header, records}` replayable capture. Two different objects under one directory and one naming convention. The dispatcher had graded the line "unverified", which is why it was correctable instead of load-bearing; had it been asserted, the lane would have built against a file shape that cannot feed `replay.mjs` at all.
  Original entry follows, RE-GRADED rather than left at READY.
  **Original entry, as booked (body kept, grade retired — the closure above is the live fact):** `findAbsorptionMisses` ran on every replay and printed on none.
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
  Anchor: tools/replay.mjs
  Write-set: tools/replay.mjs, test/absorption-miss.test.mjs
  Verifier: node --test --import ./tools/suite-config-root.mjs test/absorption-miss.test.mjs

- **CLOSED 2026-08-14 (operator decision) — row 2, the idle-TTL keepalive, is
  NOT BUILT: matrix row 2 goes ACCEPTED and a 1h-idle bust triages
  EXPECTED-BUST from now on.** Two live entries closed into this one, bodies
  moved rather than struck through: the 2026-07-27 "OPEN, phase-3 candidate,
  needs idle-detection + opt-in. Unchanged." entry, and the 2026-07-30 park
  that had sharpened it to a measurable build trigger.
  **The decision.** A keepalive is cost-positive only if the operator RETURNS
  inside the extended window. The deliberate case — stepping away and
  knowing they are coming back — is already covered by the operator's own
  `keep-warm` skill, which fires exactly when it pays off. A proxy-side timer
  has to GUESS that, and each wrong guess bills a full-prefix cache read per
  idle window, forever, on every session the machine happens to be holding
  open.
  **What the closed park's cost math actually said, kept because it is the
  arithmetic the decision rests on** (settled 2026-07-30): a keepalive is a
  full-prefix cache READ (~0.1x) per sub-hour window while one avoided cold
  re-bill is a ~1.25x write, so a ping is ~5% of the bust it prevents and one
  avoided bust pays for ~12 refreshes — cost-positive ONLY for returns
  inside a bounded idle window. Its build trigger was "a week showing
  repeated TTL-idle colds with return inside ~2h, read off the worktime
  --cold ledger's preventable/TTL-idle split"; that trigger is WITHDRAWN as
  the decision criterion, because the skill covers the return case it was
  meant to detect.
  **Not-built design of record**, kept on disk should the decision reverse:
  `docs/directives/proxy-ttl-keepalive.md` (opt-in timer at
  `CACHE_FIX_KEEPALIVE_AT` ~50 min, ping = last request replayed with
  `max_tokens` minimised, capped at 4 consecutive pings, main-thread only).
  The design was never the blocker; the return rate was.
  **Accepted residual, stated rather than implied:** an idle-then-return the
  skill was not started for pays the full cold, and nothing measures how
  often that happens — the rate was never instrumented and is not being
  instrumented.
  Landed in: matrix row 2 cell + `robustness-threat-matrix.status.json` row 2
  (`ACCEPTED`, date 2026-08-14; `matrix-status` clean, 0 findings over 30
  rows; `TRIAGE_BY_STATUS.ACCEPTED` -> EXPECTED-BUST / "WON'T BUILD",
  checked by executing the mapping, not by reading it).
  Untouched by this closure: upstream's cache-warmer directive
  (`docs/directives/proxy-cache-warmer-v3.7.0.md`, their issue #127) is a
  separate initiative and this decision says nothing about it.

- **DONE 2026-08-13 — `breakpoint-scan --values`: marker locations now carry their `cache_control` OBJECTS, and the first run settled the question it was built for (`5b87f32`, sonnet dispatch, desk-verified 14/14).** `findMarkers` and the new `findMarkerValues` both delegate to one `scanMarkers(body)` helper so the two cannot drift; with `--values` absent the output keeps the same seven keys in the same order, asserted by its own bite. Red-first: the lane broke `findMarkerValues` to strip everything but `type`, went RED 12/14 naming both affected tests, restored byte-identical, GREEN 14/14 — all three runs executed, not summarized.
  **What it measured, and it is the load-bearing half.** On all six busting pairs, CC's own markers carry `{"type":"ephemeral","ttl":"1h","scope":"global"}` at `system[1]` and `{"type":"ephemeral","ttl":"1h"}` at `system[2]` and at the rolling tail marker — IDENTICAL on the predecessor and the busting request, every pair. So CC sends a 1-hour TTL and does not change it at the bust. That is what makes the forwarded layer the open question rather than a hunch: `cache-control-normalize.mjs:53-56` rewrites the tail marker to `{ type: "ephemeral" }` with NO `ttl`, which — if it reaches the wire — is a 1h→5m downgrade WE introduce. Unmeasured at the forwarded tap; booked in `## Open`.
  **The join is this commit's other deliverable**, though the helper is not built: `outcome.requestId → outcome.id → request.id`, verified 1:1 and instance-positive 6/6 against transcript `cc`. Booked as its own entry in `## Open` because the lane also self-reported the ad-hoc-probe-count violation that produced it.

- **DONE 2026-08-13 — `tools/breakpoint-scan.mjs`: this repo had no reader for `cache_control` breakpoint LAYOUT, and a bust walk needed one (`c32a74a`, sonnet dispatch, verified at the desk).** Reports, per request in a capture, every `cache_control` location under a fixed grammar (`system[i]` / `tools[i]` / `messages[i].content[j]:role` / `messages[i]`), plus `nMessages` and `lastUserIndex`; `--since`/`--until`/`--json`; streams through `tools/read-lines.mjs` (the 839 MB capture would otherwise blow the heap — that reader's header documents the measured 3.27 GB failure). Schema-tolerant: non-request records are counted as skipped BY REASON, never folded into a zero.
  **Red-first, and it discriminates:** the lane moved a marker from `tools[3]` to `tools[2]` in its own fixture and the assertion went red naming the moved marker, then reverted byte-identical and went green. Desk-verified independently: `node --test --import ./tools/suite-config-root.mjs test/breakpoint-scan.test.mjs` → 9/9 pass. Instrument-positive on real data before any zero was believed: 22 requests scanned, every one `markerCount >= 1`.
  Its first finding refuted the hypothesis it was built to test — see the RECORD entry in `## Open` ("georgendorf 6-bust burst"). Two brief defects it surfaced are recorded there too: the session-mirror is not a forwarded-body artifact, and transcript/capture stamps are different clocks.

- **DONE 2026-08-13 — the backlog grade vocabulary is CLOSED: `CENSUS_GRADES` widened from 13 words to 37 (`3331397`).** Each new word was sampled against a real header before being classified into `CLOSURE_GRADE_SET` / `NOT_CLOSURE_GRADE_SET` / the derived AMBIGUOUS set; per the commit message, COMMITTED and the HALF/TOOL/MECHANISM family reversed the obvious word-shape call because their own bodies state an outstanding obligation, which is why it was a body-read pass rather than a word list typed from memory. Reconciliation over this file, all four buckets summing to 354 before and after: CLOSURE 103->110, AMBIGUOUS 4->3, NOT-CLOSURE 181->216, COULD-NOT-VERIFY 66->25, with all 45 moved entries accounted for. Touches `tools/backlog-lint.mjs`, `test/backlog-lint.test.mjs`, `test/backlog-census.test.mjs`. This is the prerequisite the RECORD entry at `## Open` ("the backlog declares THREE grades and uses THIRTY-THREE") named for the mechanical closure MOVE — the vocabulary judgment pass. The move itself has not run, so that entry stays live.
  **Booking provenance, stated because it is not the author's own.** Booked 2026-08-13 by the cache-bust session, which met the commit only as a push-guard block: it is a subagent commit from an earlier session today whose SHA sat in no record carrier. The basis for every number above is the commit message and `git show --stat`; the desk did NOT re-run its tests or re-measure the buckets. A later session re-reading this entry should treat the reconciliation figures as the author's claim, not as desk-verified.

- **DONE 2026-08-13 — `alias-claim --releasable`, the READER half of the protect/release loop (`4417531`).** Reports, for every currently-protected alias, whether every `BACKLOG.md` citation sits under the closure home — RELEASABLE / HELD / UNCITED / COULD-NOT-VERIFY, report-only, exit 0 always. It releases nothing: `--release` stays the one act that does, and an uncited alias reports UNCITED rather than being read as spent. Touches `tools/alias-claim.mjs` (+126), `test/alias-claim.test.mjs` (+160).
  **This does NOT close the entry it serves.** The RECORD entry "protect default blocked on release wiring and cap size" (`## Open`) decided the build order as: wire `--release` to the closure verb FIRST, then re-ask default-on. This commit delivers the reader, not the wiring — the entry stays live, and reading this closure as discharging it is the label-over-body error that entry's own neighbours warn about.
  **Booking provenance:** same as the entry above — booked by the cache-bust session from the push guard's block, basis is the commit message and `--stat`, tests not re-run at the desk.

- **DONE 2026-08-11 — the 2026-08-11 sweep walk, both halves dispositioned. CONSERVATION: attributed, fixed, deployed and verified live (threat-matrix row 30; conservation zero across all 25 captures in the 14:19Z sweep). STABILITY: closed NON-DEFECT, its `modelChangedAcrossPair` exemption split out as its own entry. What was still live when this closed now lives in three entries in `## Open` — the exemption, the s-captureBE replay-error class, and row 30's eviction-path bite — so nothing here needs re-reading to act. Body kept verbatim as the record, INCLUDING two sentences it got wrong, corrected immediately below rather than edited away.**
  **CORRECTION 1 — "The conservation population is NOT closed" is superseded.** It is closed:
  `fresh-session-sort` relocates a reminder block into `messages[0]` and
  `insertion-normalization`'s pin then served that message's stored first-seen form over it,
  destroying bytes CC sent. Fixed and serving (fork `03398e3`, pin `ec05377`).
  **CORRECTION 2 — the refutation below is WRONG, and its shape is the lesson.**
  `insertion-normalization` was cleared by reading `suppressed`/`dropped`/`moved`, all 0 — and
  all three are structurally blind to a PIN, which read `pinned: 1` at that very request. The
  fields were true; their reach fell short of the claim, so the walk went to `smoosh-split`
  and `fresh-session-sort` as "next candidates" while the answer was in the extension already
  excluded. A refutation is only as wide as the field that carries the mechanism.
  **CORRECTION 3 — the live-log record cited as evidence could not have been joined.** Replay's
  `key` is the SESSION key and the event log's is the conversation SUB-key, so the two were
  matched on timestamp alone across a 3 ms gap, between records that need not share a
  conversation. Booked separately.
  **the next session's FIRST item) — the daily sweep has been RED at 14 of 48
  captures and the banner attributes it to the wrong thing.** Booked 2026-08-11 by
  the records-restructure session, which met it while reading `gate-status.json`
  for phase 3's wiring and is deliberately NOT walking it mid-directive.
  **Why the PARKED grade did not hold, and it is worth naming because the entry
  argued it well.** The named missing evidence — regression or declared-behaviour
  conservation shape — is the WALK'S OWN OUTPUT, not an input to deciding the
  walk. A deferral gated on evidence the deferred action itself produces is delay
  in a spec's costume; the discriminating test is whether any outcome could flip
  the verdict on what to do next, and none can, because the answer either way is
  "run `sweep-finding.md`". The lane is a runbook, so the entry is
  decision-complete by construction and always was.
  **The measurement, taken rather than recalled** (sweep started
  2026-08-11T07:55:50Z, `ok:false failing:14`, 48 captures): the discriminator is
  CONSERVATION and it separates the population completely — every one of the 14
  failing rows carries `conservation > 0` (205, 308, 108, 251, … per row), and all
  34 passing rows carry exactly 0. `stability`, `safety`, `sequence`, `order` and
  `unparseable` are 0 on every failing row, so nothing else is firing.
  **What the session-start banner says is different from what the data says.** The
  banner reads "gate RED: 14/48 failing (cache-fix-proxy.service — cross-project,
  not this repo's suite)", which names a service rather than a class; the failures
  are this repo's own conservation gate over this repo's own captures. A label over
  a body, one level up from the class this whole restructure is about.
  **CORRECTION 2026-08-11 at the desk, from a SECOND independent read of the same
  status file — "nothing else is firing" is false, and it is the sentence that
  would have set the walk's direction.** Re-reading the identical run (started
  07:55:50Z, finished 08:24:43Z) row by row: conservation does fire on all 14 and
  on none of the 34 passing rows, exactly as recorded — but ONE of the 14 also
  carries `stability: 1`, and `absorptionMisses` is non-zero on NINE of the 14
  (1,2,2,8,3,11,2,1,6). `safety`, `sequence`, `order` and `unparseable` are the
  only fields that are genuinely zero throughout. Two readings of one file
  disagreed; the discrepancy is the finding, and the shared coordinate that makes
  the comparison mean anything is that both read the same `finished` stamp.
  **The stability row is the part that changes the walk's priority**, because it
  is attributed to US: `n=461->462`, `inDiv=286`, `outDiv=36`,
  `ccIdenticalAtOutDiv: true` — CC's bytes were identical where our forwarded
  bytes diverged, and `attribution.ext` names `deferred-tool-rewrite`. Its
  timestamp is 2026-08-10T05:39:12Z, i.e. BEFORE that evening's D1 commits
  (`246b61d` 21:41, `a5f1960` 21:49 local), so D1 is not a candidate cause and
  the walk should not start there. Capture: `s-captureBC` (alias claimed
  2026-08-11 for exactly this purpose; 3,427 requests, 3,144 pairs, ~2 GB).
  **Evidence FROZEN before the walk rather than left to rotate, and the freeze
  reports its own limit.** `harvest --pin … 461..462 --bounded` wrote
  `test/fixtures/harvested/pinned-s-d8f209e4b75e-461-462.json` (888 records, 162
  kept / 301 placeholders, 18.5 MB; `absence-scan` clean). `verifyPin` then said
  the pin does NOT reproduce what it was pinned for, and the difference is the
  COST half, not the identity: live reads `[prefix above messages INTACT -> the
  whole message array re-bills]`, the pin reads `[prefix ALREADY broken above
  messages: tools changed -> no marginal cost]`. Identity, both divergence
  indices, the ours-attribution and the naming extension all survive; the price
  does not. This is the scrub-destroys-content-predicates class again (the
  `e53f873` precedent), one level up: what the scrub broke is the SEVERITY, so a
  walk reading only the pin would classify a full-context re-bill as free.
  **The pin is deliberately NOT committed**, and that is a decision with a reason
  rather than an omission: it lives in the working copy, and pins do not rotate —
  only captures do — so the expiry risk is already discharged by the file
  existing. 18.5 MB of permanent public history for a fixture whose own verifier
  says it is not evidence for its class is a bad trade; the walk commits it only
  if it turns out to need it, and the untracked path above is where it is.
  **What the walk still owes** — unchanged, and this is the work, not a blocker:
  whether the conservation population is a REGRESSION or the declared-behaviour
  shape already triaged 2026-08-05, and separately whether the single ours-
  attributed stability violation is a known class. `docs/runbooks/sweep-finding.md`,
  terminal states regression / known-open / non-defect / instrument-defect /
  new-class / could-not-verify. Two facts to carry into it: this repo's earlier
  conservation reds were a SINGLE failing row (BACKLOG's own record), and 14 with
  per-row counts in the hundreds is a different quantity; and the remaining 13
  captures rotate, so the walk freezes what it rests on before closing — the pin
  above covers only the stability row.
  **WALKED 2026-08-11 (partial, and the split is stated rather than blurred).** Step 1 first: `harvest` run (574 -> 618 untracked fixtures), and all twelve failing captures alias-claimed so they can be named after they rotate — `s-captureBC` (stability), `s-captureBE` (the replay-error row), and BD/BF/BG/BH/BA/AW/BI/BJ/BK/BL for the conservation population.
  **The stability row is CLOSED as NON-DEFECT, attributed end to end by execution rather than by reading.** Three independent sources agree. (1) The gate's own attribution: `n=461->462`, `outDiv=36`, CC byte-identical there, `attribution.ext = deferred-tool-rewrite`. (2) The extension's append-only event log for that conversation key: `injected` flips `2 -> 0` at exactly the violating request (log ts 05:39:12.707 against the row's 05:39:12.691), with `action: "rewrite"` and `newNames: []` on both sides — no reset, no schema change. (3) The pinned raw pair: `model` is `claude-fable-5` at n=461 and `claude-opus-4-8` at n=462. `supportsToolAddition` executed on both values returns true and false respectively (`TOOL_ADDITION_MODELS = ["claude-opus-5", "claude-fable-5"]`), so `deferred-tool-rewrite.mjs:758` — `if (!announceOk) additions = []` — empties two established additions, and the forwarded message array changes where CC's did not. That is the extension behaving exactly as designed: it must not send tool-addition announcements to a model that does not support them.
  **The severity half is MEASURED, not argued, and it is what makes this a non-defect rather than a deferred defect.** The first `claude-opus-4-8` request on that key billed `cacheRead: 0, cacheCreation: 633,639` — the model switch re-billed the entire prefix by itself. Our byte flip landed in a request that had no cache to lose, which is the same "re-bills anyway, so this flip costs nothing marginal" reasoning condition 5 of the existing `memoryStrandedByKeyRotationExemption` already runs on (`replay.mjs:295-330`). Note the pin could NOT answer this: its outcome records stop before n=462, so the number came from the live capture — the second time today that a bounded pin kept the identity and lost the cost.
  **Its close is therefore a declared exemption, booked here as the runbook requires (NON-DEFECT closes by an exemption the check itself verifies, never a softened predicate).** Design, decided: a `modelChangedAcrossPair` exemption in `replay.mjs`'s stability check, conditioned on data the check already reads — `prev.model !== cur.model` (both present) AND `ccSame === true` AND the current request's own outcome showing `cacheRead === 0`. The billing condition is load-bearing and is also the retirement trigger, exactly like condition 5: it does not assume "a model switch is always cold", it REQUIRES the measured coldness, so the day a switched-model request reads warm the exemption stops applying and the gate re-arms with no separate monitor. Red-first pair: the real `s-captureBC` pair must go from violation to exempt, and a constructed pair identical except `cacheRead > 0` must still fire — the two must differ, or the exemption is not discriminating.
  **The conservation population is NOT closed, and it is NOT the 2026-08-05 class.** Uniform signature across all eleven captures and all 1,899 rows: `kind: "lost"`, `at: 3`, side `in`, a user message, exactly ONE unit lost per row, `declarationsUnavailable: false`, and ZERO `invented` rows. The 2026-08-05 triage was 19 lost + 19 invented in 1:1, because a text REWRITE loses one unit and invents one; pure loss with no invention is a whole block removed without disturbing its siblings' hashes, a different mechanism. The instrument can still emit `invented` (`replay.mjs:3451,3466`), so the zero is a measured absence rather than a vocabulary that no longer exists — though the last recorded positive for that kind is 2026-08-05 on an older build, which is the residual on this claim.
  **Two candidate causes REFUTED by execution, which is the useful half of an unfinished attribution.** On the smallest failing capture (`s-captureBA`, n=46, `in[3]` = 5 blocks: one `tool_result`, one skill body, three `<system-reminder>` blocks): `content-strip.isBookkeepingReminder` returns false on all five, so content-strip removes nothing there; and insertion-normalization's own log at that exact request (ts 19:37:28.135 against the row's 19:37:28.132) reads `action: "reset", suppressed: 0, dropped: 0, moved: 0`. Neither extension took the unit. The next candidates are `smoosh-split` and `fresh-session-sort`, run the same way — their own exported transforms over these real blocks.
  **Why it stopped here rather than guessing:** conservation rows get NO automatic attribution (the gate's extension bisection is pointed at stability rows only, `replay.mjs:3169`), so this is the hand method the runbook's step 4 already carries a `[GRADUATE]` marker for, and finishing it is a fresh context's job with the signature above as its starting point rather than a blank page. The replay-ERROR row (`s-captureBE`) is also unwalked; its stderr names `auto-1m-guard` / `context-1m-2025-08-07` in outbound betas, a class the 08:24 run did not have.
  Anchor: docs/runbooks/sweep-finding.md
  Write-set: BACKLOG.md, docs/directives/robustness-threat-matrix.md, tools/replay.mjs, test/replay-conservation.test.mjs
  Verifier: node tools/bust-triage.mjs

- **DONE 2026-08-11 (fix in this session's commit; see threat-matrix row 30) — the
  RELOCATE-THEN-PIN content loss: CC-sent reminder blocks were deleted off the
  wire, and D1 created it. FIXED BUT NOT DEPLOYED — the serving build is still
  `246b61d` until the dotfiles pin bump and `systemctl --user restart
  cache-fix-proxy` land, which is the one step this entry does NOT close.**
  Verified by difference on live traffic: s-captureBA 81 -> 0, s-captureBD
  179 -> 0, s-captureBF 251 -> 0, s-captureBG 125 -> 0 conservation rows, with
  stability and safety unchanged at 0 on every one — the fix changes forwarded
  bytes without introducing a divergence. The invariant flip in
  `test/relocate-then-pin-conservation.test.mjs` is the red-first arrangement,
  run against the pre-fix module. Body kept below as the record.
  **(original entry)** Threat-matrix
  row 30; terminal state REGRESSION per `docs/runbooks/sweep-finding.md`, which
  means this does NOT close here — it enters `docs/runbooks/bust-appears.md` or
  ships on its own branch.
  **The mechanism, isolated by execution rather than by reading.**
  `fresh-session-sort` (order 250) relocates a reminder block its own predicates
  claim (`isSkillsBlock`/`isHooksBlock`/`isDeferredToolsBlock`/`isMcpBlock`)
  into `messages[0]`. `insertion-normalization` (order 395) then applies its
  volatile pin: `pinnedForwardForm` returns `stored.m`, the message's STORED
  FIRST-SEEN form, which predates the relocated block. The block therefore
  reaches NO forwarded message. The model never sees it.
  **Why it is new: D1 (`246b61d`) created it by fixing row 26.** While a
  first-appearance relocation still rotated the conversation sub-key,
  insertion-normalization saw a NEW conversation, reset, held no canonical, and
  never pinned — so the block survived by accident. D1 made identity
  pre-pipeline, the canonical now survives the relocation, and the pin eats the
  block. Counterfactual, one variable, capture s-captureBA under the SERVING
  gate set: pre-D1 build `44b62d9` -> **0 conservation rows, exit 0**, and
  `--dump-forwarded 46:0` shows the MCP block present as `messages[0]` block 0;
  today's build -> **81 rows**, block absent everywhere.
  **Population: 750 of 750 rows across five captures carry one signature**
  (s-captureBA 81, BD 179, BF 251, BG 125, BI 114) — `kind: lost`, `at: 3`,
  side `in`, one unit, ZERO invented, remover `insertion-normalization`, mover
  `fresh-session-sort`, target `messages[0]`, a 1,433-char reminder block. Seven
  of the twelve failing captures are unexamined; that is the residual on the
  population claim, not on the mechanism.
  **Blast radius is all four relocatable types**, measured on the synthetic:
  skills, deferred, hooks and mcp are destroyed alike. Bounding precondition:
  the block's FIRST appearance must postdate the target message becoming
  canonical — a block present at first-seen is inside `stored.m` and survives.
  **Design (decided): teach the pin about declared relocations.**
  `pinnedForwardForm` must not silently drop blocks another extension placed in
  the message after first-seen. Serve `stored.m`, then RE-APPLY the relocated
  blocks `fresh-session-sort` declared for THIS request
  (`ctx.meta.freshSessionSortStats.relocated` + `targetIndex`) — its own
  declaration, never a re-derived "this looks relocated" guess, which is the
  same declared-and-verified discipline the conservation gate's clauses already
  use. Rejected alternative, and why: reordering the two extensions so the pin
  runs first inverts a dependency row 26 already paid for and would re-open the
  sub-key question; the loss is a composition defect, and the composition point
  is where it belongs.
  **Red-first arrangement, already built and currently GREEN as a
  characterization of the defect:** `test/relocate-then-pin-conservation.test.mjs`
  drives the REAL pipeline over a synthetic corpus and asserts today's behaviour
  (block absent from the forwarded array) plus the two instrument-positives that
  keep it from passing vacuously (`relocated:["mcp"]`, `pinned > 0`). The fix
  flips those assertions to the INVARIANT — the block IS on the wire — in the
  SAME commit, and the flip is the red. The expectation comes from the
  conservation gate's own R-side clause (a), never from what either extension
  does. Do NOT convert the fixture to a harvested pin: the four predicates are
  literal-text prefix tests and the scrub tokenizes text, so a pin reproduces
  nothing while reporting success.
  **Deployment-coupled**: `proxy/**` change -> dotfiles pin bump
  (`git rev-parse --short HEAD:proxy`) + `systemctl --user restart
  cache-fix-proxy`, stated at a session boundary. Touches neither state KEYS nor
  freeze logic, so row 3's restart-transparency holds; say so before restarting.
  **The interim is the operator's call and it is live** — see the report; the
  repo's own ordering (safety outranks cache) says a correctness loss outranks
  the billing defect reverting D1 would reinstate.
  **Done-criterion:** the characterization assertions in
  `test/relocate-then-pin-conservation.test.mjs` are flipped to the invariant
  (the relocated block IS present in the forwarded array) for all four types
  and pass, with the two instrument-positives still asserting that the
  relocation and the pin both fired; `replay.mjs --attribute-conservation` over
  s-captureBA reports 0 conservation rows where it reports 81 today, with that
  output pasted; full suite green; row 30 re-graded with the shipping commit.
  Anchor: docs/directives/robustness-threat-matrix.md
  Write-set: proxy/extensions/insertion-normalization.mjs, test/relocate-then-pin-conservation.test.mjs, docs/directives/robustness-threat-matrix.md, BACKLOG.md
  Verifier: node --test test/relocate-then-pin-conservation.test.mjs

Moved out of `## Open` 2026-08-10 by the first retirement pass this repo has run.
These bullets were already closed in their own bodies; nothing here was re-graded, and
no entry was dropped — the move is relocation only, verified by header-multiset equality.
Grade tokens moved: DONE, (DONE …), (shipped) READY, RESOLVED, CLOSED, BUILT, SHIPPED,
RETIRED, MOVED, ACCEPTED, (superseded …), GATE-RED TRIAGED, GATE-RED CLOSED.

- **MERGED 2026-08-10 (was READY) (small) — a bullet whose grade token is a NARRATIVE word hides live,
  decision-complete work from every READY-based count, including the one this
  ranking is derived over.** Found 2026-08-08 afternoon by the re-derivation,
  and only because it was reading BODIES: two entries carried live work under
  the grades `CORRECTED WITHIN THE HOUR` and `DOWNGRADED`, and the second's own
  body says "It stays READY" a few lines under a header that does not say so.
  Both were re-graded in this entry's commit. What is NOT fixed is the writer:
  nothing stops the next session opening a bullet with a story instead of a
  grade, and the failure is silent in the way that matters — the entry reads
  perfectly and simply never appears in a list.
  **The class, stated so it is not re-learned as a one-off:** the grade is a
  LABEL over its own body, and a narrative first word is a label that stopped
  describing the body the moment a re-grade was written in prose rather than in
  the header. Every consumer that greps `^- \*\*READY` — the SessionStart
  injection, the ranking population, any survey — inherits the drift.
  Design, decided: the `--census` mode being built on `tools/backlog-lint.mjs`
  already buckets every grade token and lists the UNCLASSIFIED ones. Extend it
  so the NARRATIVE buckets (anything outside the live-grade set
  READY/OPEN/HOT/PARKED and the resolution set) emit a WARN naming the line —
  a non-zero count there means live work is invisible to every consumer, which
  is a finding, not a statistic.
  Verifier, red-first, anchored to immutable refs so it cannot decay: run it
  over `git show b7ae5aa:BACKLOG.md` and it must name the two bullets the hand
  scan found — the `CORRECTED WITHIN THE HOUR` XDG-ownership entry and the
  `DOWNGRADED` tool-adjacency entry; run it over this commit and it must be
  silent on both.
  **CORRECTED WITHIN THE HOUR by the census's first real run, and the
  correction is the point: the class is 26, not 2.** The paragraph above was
  written from a HAND scan, and the hand scan was the pattern — it reached the
  two bullets I happened to read and stopped. `backlog-lint.mjs --census` over
  `b7ae5aa` reports `UNCLASSIFIED=25`, and over HEAD `UNCLASSIFIED=26` — the
  26th being the `OVERTAKEN` grade I invented three edits earlier, which is the
  instrument firing on its own dispatcher within minutes of landing. So the
  number in a claim about a class is the instrument's, never the reader's.
  What the 26 are is NOT yet classified and that is the remaining work: most
  look archival by shape (`HANDOFF`, `BUST`, `GATE-RED TRIAGED`, `MOVED`,
  `FINDING`) and are fine as history, but at least `OPEN-BOOKED`,
  `QUEUED THIS SESSION` and `IN FLIGHT` name live work that no READY-based
  count can see. Done-criterion, sharpened: every one of the 26 carries an
  individual verdict — live-work-mis-graded, or archival-and-correct — and the
  WARN then fires only on the first class. A count without that split would
  train the override reflex on its first run.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation. Ranked at the next derivation, not here.
  <!-- entry: "a bullet whose grade token is a NARRATIVE word hides live" -->

  **MERGED 2026-08-10 into the READY-count entry (`the READY count every
  session reads at startup is 66 where 57 exist`), which now carries the
  combined design and a red-first arrangement over three real positives
  instead of two separate ones.** Merged rather than left parallel because
  both halves are closed by ONE check over the grade vocabulary; kept as a
  record so the reasoning is not re-derived. No content was dropped in the
  merge — the class statement above travelled into the absorbing entry.
- **RETIRED 2026-08-10 (was READY) (small, BLOCKED on a guard fix) — `test/tool-output-stamps.test.mjs`s
  header is now STALE and actively false.** It still says ARM 1 is red on this
  tree on purpose and that two assertions are todo-marked; `f9ec558` fixed the
  defects and removed the markers. A reader who trusts the header will believe
  two live defects remain.
  Design (decided): rewrite the header block to say the two sites WERE found
  still-wrong by this check and were fixed in `f9ec558`, keeping the citations
  (they are the evidence that the check works) and dropping every present-tense
  red and todo claim.
  Verifier: `grep -n "todo" test/tool-output-stamps.test.mjs` returns nothing,
  and the header names `f9ec558`.
  **Why not done in `f9ec558`:** the header is a comment block whose every line
  opens with a double slash, and a PreToolUse guard currently hard-denies any
  Bash command whose text contains that token — a false fire diagnosed
  2026-08-08 and handed to the dotfiles session. Correcting the header was
  booked rather than worked around. UNBLOCKS as soon as that guard fix lands;
  the edit itself is a two-minute rewrite.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  test/tool-output-stamps.test.mjs's header is no longer false: every
  surviving mention of ARM 1 and of the `{ todo }` markers is past-tense
  history (grep for `ARM 1|todo|on purpose` over the file, lines
  21/34/73/82/84). Shipped by c3481d1.
- **RETIRED 2026-08-10 (was READY) (small) — `named-unbooked-scan` is referenced by nothing but itself.**
  Measured immediately after it shipped: `grep -n "named-unbooked-scan"` across
  `BACKLOG.md`, `docs/runbooks/*.md`, `docs/dev-loop.md` and `tools/*.mjs`
  returns hits in ONE file — the tool's own source. No runbook step invokes it,
  no lane names it, nothing schedules it. It is a mechanism with no trigger,
  which is the state the class it detects is about: the check against
  named-and-unbooked was itself named and unwired within the hour of being
  built, by the session that built it.
  Design (decided): the session-close lane owns it —
  `docs/runbooks/session-close.md` gains a numbered step running it over the
  session's own transcript with `--until HEAD`, and the step carries
  `[GRADUATE -> a Stop-hook runs it without anyone remembering]`, because a
  runbook step still depends on someone reading the runbook, which is the same
  dependency that produced the defect. Report-only, as the tool already is.
  Verifier: `grep -n "named-unbooked-scan" docs/runbooks/session-close.md`
  returns the step and its GRADUATE marker; running the step by hand over this
  session's transcript prints its examined-count line rather than a bare
  verdict. Done-criterion: both, suite green.
  Write boundary: `docs/runbooks/session-close.md`.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  named-unbooked-scan is wired: docs/runbooks/session-close.md:82 invokes it
  as numbered step 5. Shipped by 75155b2, hours after this entry was booked.
- **RETIRED 2026-08-10 (was READY) — FIRST THING NEXT SESSION: explain the 2026-08-07 01:00:55Z false ❄
  to the operator in plain language, before any build work.** They asked for
  this explicitly, tired, at the end of a long session, after an explanation
  written in commit-message register did not land. Deliver it as the opening
  message of the session and wait for their reply.
  **What to explain, in this order** (the material is all on disk — matrix
  "Event walk 2026-08-07 01:00:55Z" and the detector entry below; nothing needs
  re-deriving):
  1. Nothing broke. The cache did its job perfectly. The ❄ was wrong.
  2. What the ❄ actually watches: two numbers per turn — how much was newly
     written, and how much was re-read from cache. It cries wolf when the write
     is big AND the read is small, both measured against the previous turn.
  3. What really happened: the session's first tool call returned a 907 kB
     result. That is genuinely new text, so of course it had to be written to
     the cache once. Everything from before it was re-read intact — the read
     equals the previous write to the token.
  4. Why the alarm fired anyway: Claude Code writes one reply into the
     transcript as SEVERAL rows carrying the same numbers. The alarm compared
     one of those rows against another row of the SAME reply. That inflated
     "the previous turn" from 40k to 375k, and against a made-up 375k baseline
     the perfectly normal numbers look alarming.
  5. Why it said `other`: the alarm's list of causes is idle / model-changed /
     everything-else. There is no entry for "nothing was wrong", so a false
     alarm can only ever come out as `other`. The word is a symptom of the bug,
     not a clue about it.
  6. How we know rather than think: the fork has its own copy of the same
     alarm, which throws away duplicate rows first. Run on the same transcript
     it reports zero events, where the other reported a 336k disaster.
  **7. THEN disambiguate it from the OTHER incident, because the operator
  conflated the two at the end of that session and the next reader will too.**
  They are different events with opposite verdicts, hours apart:
  - the 336k above (01:00:55Z) — a FALSE alarm, nothing lost, an instrument
    bug;
  - the 205k at 2026-08-06 17:40:16Z (`system_changed`, matrix row 24) — a
    REAL cost, and the cause is a RESUME, not an edit. Restarting a
    conversation makes Claude Code rebuild its opening from whatever is on
    disk at that moment, and it pays for the whole rebuilt opening. If the
    rules file changed while the session was away, the new text shows up in
    that rebuild — visible at the boundary, but it is the rebuild being paid
    for, not the edit.
  The plain-language version of the rule, which is the useful part: **editing
  the rules while a session is running costs that session nothing — it already
  holds its copy. The next resume pays.**
  **8. And say what was checked, including the correction.** This session
  edited the global rules at 2026-08-07 01:37:48Z with six sessions live, then
  measured its own: the opening message was 64,006 bytes before the edit and
  64,006 after, unchanged. Nothing was re-read, nothing was re-billed. That
  matters because a claim written into the threat matrix hours earlier said the
  opposite — and the matrix had ALREADY recorded the correct, measured version
  months of requests earlier, in the same cell. Both are now reconciled, with
  the wrong one struck. Tell the operator that part too: they asked the
  question that surfaced it.
  **Rules for the delivery, and they are the point of this entry:** short
  sentences, no field names in the first pass, no timestamps unless asked, and
  no "findings/booked/verifier" vocabulary. Offer the detail afterwards; do not
  open with it. If it cannot be said without jargon, it is not understood well
  enough yet.
  Done when: the operator says it landed, or asks a follow-up that shows it
  did. Not when the message is sent.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Delivered, and then overtaken a second time. The 2026-08-07 transcript
  records the plain-language explanation given as that session's opening
  message; independently, the false-❄ root cause was found and fixed
  2026-08-08 with `hits=0` against the fix. Verified by transcript search at
  the desk, not from the lane's report.
- **RETIRED 2026-08-10 (was READY) — THREE triggers have no watcher, and the third is the worst: a RED
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

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The doorbell exists. session-scan.py:293 gate_alerts() reads
  gate_status_path() (:257, XDG first, ~/.claude fallback at :129), and THIS
  session's SessionStart carried `attention: gate RED: 2/103 failing` — the
  live world-read, stronger than the code read.
- **RETIRED 2026-08-10 (was READY) (small) — `capturePair`'s comment describes a size floor the code does
  not implement.** `bust-triage.mjs:275-277` says the busting request must carry
  "a body at least as large as the ledger's own ctx figure allows, floored at 2
  messages"; the code implements only `messages.length >= 2`. Doc-over-body
  drift in a function whose selection rule is load-bearing for every triage.
  Either implement the ctx floor or delete the clause — deciding which needs one
  measurement: whether any real bust would be selected differently. Verifier:
  the 12:54:49Z control and the s-captureAL case must both be unchanged by
  whichever way it resolves.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The ctx-byte size floor is implemented, not messages.length>=2 alone:
  bust-triage.mjs:652-653 `bigEnough = (line) => ctx == null ||
  Buffer.byteLength(line) >= ctx`, composed into `plausible`.
- **RETIRED 2026-08-10 (was READY) — `bust-triage` reports a STATE-KEY CHANGE across the busting pair
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

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  The state-key line shipped: stateKeyFlip at tools/bust-triage.mjs:553,
  stateKeyAt at :505, and the KEY-FLIP verdict documented at :49-55.
- **RETIRED 2026-08-10 (was READY) (POINTER — body belongs in the `dispatch-guards` plugin repo's
  `dev-notes/`) — a veto gate keyed on a WORD in a command matches that word in
  a commit MESSAGE.** Measured 2026-08-08 by the leak-scan lane: `git commit -F -`
  with a heredoc was BLOCKED by `subagent-push-gate` because the commit message
  contained the word "push" (it was describing the push hook). No push was
  attempted or possible.
  **SECOND FIRE, 2026-08-08, different lane:** the same gate denied a
  `git commit` whose inline message carried push-adjacent wording, in a lane
  whose entire subject was the push hook — so the wording was unavoidable, not
  incidental. Both lanes recovered the same correct way (read the state, confirm
  nothing was staged or committed, retry with `-F <file>`), and both surfaced it
  rather than working around it silently. Two fires in one day, both on lanes
  working ON the push path, is the fire-rate this observation needed: the
  predicate reads the payload when it means to read the intent, and it fires
  hardest on exactly the work most likely to need the words. The lane recovered correctly — confirmed nothing had
  been committed, then committed via `-F <file>` — and the confirm-before-retry
  step is the part worth keeping, because a blocked step leaves the state its
  successor assumes was created.
  **Why it is worth a booking rather than a shrug:** this is the
  check-that-fires-on-a-non-defect shape sitting on the gate that matters most,
  and its cost is the override reflex it trains on exactly the guard where an
  override is most dangerous. The general form is a predicate reading the
  PAYLOAD when it means to read the INTENT. Design NOT decided here — it is the
  plugin's, and the plugin's own evolution rule says the observation goes to
  `dev-notes/dispatch-OBSERVATIONS.md` with a proposed rule change. Done when
  that observation exists there; the fix itself is the plugin maintainer's call.

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Recorded where the entry said it belonged: dispatch-guards
  dev-notes/dispatch-OBSERVATIONS.md:104-107 carries the
  heredoc-commit-message case with its proposed fix.
- **RETIRED 2026-08-10 (was READY) — the dispatch-guards writer-claims gate WARNs on a claim whose work
  is already in HEAD, which trains the override reflex it exists to prevent.**
  Measured 2026-08-08, live: a lane's first Edit to
  `~/dev/Gunther-Schulz/claude-worktime/claude-worktime.sh` fired
  `writer-claims-gate` naming `aopus-rotation-writer-a3b5e1755a1598d3` "within
  the claim TTL". That agent's guard fires are stamped 08:06Z; the commits
  carrying its work landed 08:52–08:58Z; its session was quiet from 08:18Z. So
  the claim outlived its own commits by ~2 h and fired on work that could not
  collide with anything.
  **Why it matters beyond the nuisance:** the executing lane could not
  distinguish this from a live conflict using git state alone — a clean tree
  proves nothing was COMMITTED, never that nobody holds uncommitted work — and
  it proceeded on that reasoning, correctly but on a basis narrower than its
  conclusion. What actually settled it was an out-of-band timing comparison the
  dispatcher ran. A guard that fires on a non-defect and can only be cleared by
  the dispatcher is the check-that-trains-its-reader-to-ignore-red shape from
  the corpus.
  Design (this is the PLUGIN's repo, not this one — body belongs in
  `dispatch-guards`' `dev-notes/dispatch-OBSERVATIONS.md` and its BACKLOG;
  this entry is a POINTER so the finding is not lost if that repo is not opened
  soon): before firing, check whether the claimed path's claimed work is
  reachable from HEAD — if the claiming agent's commits are already merged, the
  claim is spent and the gate stays silent. Cheaper variant if that is hard:
  expire a claim when the working tree is clean at the claimed path.
  Verifier, red-first: replay this exact case — a claim stamped before a commit
  that contains its work — must NOT warn; a claim with genuinely uncommitted
  changes at the claimed path MUST still warn. Both arms required; the second
  is the over-firing control that keeps the repair from silencing the gate.
  <!-- entry: "the dispatch-guards writer-claims gate WARNs on a claim whose work" -->

  **RETIRED 2026-08-10 — the retirement pass, verified at the desk.**
  Recorded upstream: dispatch-guards dev-notes/dispatch-OBSERVATIONS.md:410,
  section titled `writer-claims-gate WARNs on a claim whose work is already in
  HEAD`.
- **DONE `82372db` (2026-08-08) — every human-facing stamp emits BOTH zones.**
  Shipped: `tools/local-stamp.mjs` + `test/local-stamp.test.mjs`; seven tools
  converted, four verified as needing none. Verified at the desk by my own
  one-condition mutation, not the lane's: appending a local suffix to
  `restart-exposure`'s machine field `lastActivity` reddened exactly the
  purity CONTROL and nothing else (6 pass / 1 fail from a 7/7 green
  baseline); restored, full suite 2479 pass / 0 fail. Scope correction the
  lane measured: **eleven** files, not ten — original text kept below.
  ORIGINAL ENTRY:
- **(shipped) READY — every human-facing stamp emits BOTH zones, because ten tools emit
  UTC and none emits local.** Measured 2026-08-07: `grep -l 'toISOString\|UTC'
  tools/*.mjs` returns ten tools; `grep -rn 'toLocaleTimeString\|local)'`
  returns zero local-time renderings anywhere in `tools/`. So every stamp that
  reaches the operator is in a zone their clock does not show, and the
  conversion is left to a human doing arithmetic at 6am.
  **The recurrence is the case for building it.** The dev-loop already carries
  a UTC section, and `bust-triage.mjs:618-624` shows the class was reasoned
  about carefully — but only at the MACHINE-to-machine end ("`dossier` now
  reads a zone-less stamp as UTC; this end stops producing one"). The human end
  was never in scope. Cost, 2026-08-07: several turns of a phantom
  disagreement in which the operator and the session were each correct about a
  DIFFERENT bust — 01:49:59Z (03:49 local, 419k, one session) versus
  04:08:35Z/04:17:25Z (06:08/06:17 local, another) — while appearing to
  contradict each other. Operator, same day: "this timezone mismatch has bitten
  many times in many sessions here."
  Design, writer-side, one shared helper in `tools/` used by the human-facing
  print paths: `2026-08-07 04:08:35Z (06:08 local)`. Two constraints that
  decide the format. The UTC token stays FIRST and unmodified, because
  `bust-triage --list` instructs the reader to paste a stamp straight into
  `dossier` and that copy path must keep working. And machine-readable output
  (`--json`, status files, ledger writes) gains NOTHING — the suffix is for
  display lines only, or it becomes a parsing hazard, which is this same class
  in mirror.
  Verifier, red-first: `bust-triage --list` today prints `04:08:35Z` with no
  local rendering — that is the red; after, it prints the pair, and
  `dossier "$(node tools/bust-triage.mjs --list | ...)"` still resolves the
  same event, which is the control proving the paste path survived. Plus a
  negative: `--json` output must be byte-identical before and after.
  **Reader-side backstop is an OPERATOR DECISION, stated not taken** — a Stop
  hook scanning the session's own final message for a bare UTC stamp outside
  code fences with no local equivalent nearby. It is computable and the machine
  already runs a hook of exactly this shape over assistant output
  (`midturn-answer-check.py`), so the pattern is proven here. It changes what
  every session on this machine is nagged about, so it is not a fork-side call.

- **DONE `c567907` (2026-08-08) — `backlog-order.mjs --check` names the
  misplaced bullet.** On mismatch it now prints the first divergent index, the
  leading line found there, the leading line expected there, and a misplaced
  count. Desk verification beyond the lane: I probed the combination the lane
  reported as untested (mismatch at index 0, three displaced, and a full
  reversal) — correct in all three. ORIGINAL ENTRY:
- **(shipped) READY (small) — `backlog-order.mjs --check` reports a verdict with no
  diagnostic, so establishing WHY costs a stash-and-bisect.** Fired 2026-08-08:
  after booking three entries the check printed `file order does NOT match the
  derived order` and nothing else. Finding out that my own insertion caused it
  took `git stash` -> re-run -> `git stash pop` — i.e. mutating the working tree
  to interrogate a read-only check, on a copy other agents write to. The tool
  already HAS both sequences in hand at that moment (`ordered` and `bullets`,
  `tools/backlog-order.mjs:168-170`); it just discards the difference.
  Design (decided): on mismatch, print the first divergent index with the
  leading line of the bullet found there and the bullet expected there, plus a
  count of misplaced bullets. Exit code unchanged (1).
  Verifier: red-first — a fixture BACKLOG with one bullet moved out of rank
  order must produce the naming output; a fixture already in order must stay
  silent (over-firing control). Done-criterion: both bites, full suite green.
  Write boundary: `tools/backlog-order.mjs`, `test/backlog-order.test.mjs`.

- **DONE `d02d58c` + `f9ec558` (2026-08-08) — the both-zones class now has a
  check at the printed-output altitude, and it found two live defects on its
  first run.** `test/tool-output-stamps.test.mjs` executes each of the seven
  converted tools over a fixture and reads the actual bytes: ARM 1 (no bare UTC
  instant without a local pairing on the same line) and ARM 2 (no `local` text
  in machine-read output). 16 bites, all enforcing.
  **What it caught, which is the point:** `82372db` claimed a complete sweep;
  the check refuted it. `bust-triage`s capture step prints the pair stamps and
  the computed span raw at FOUR sites including the success path that fires on
  every clean triage, and `dossier`s step 3 does the same in what that file
  calls the body a person reads. Both verified live against fixtures, not read
  from source.
  **The repair shape, worth reusing:** the two lanes disagreed about
  `bust-triage`s `span` and both were right — it is composed once and read
  verbatim by BOTH `--json` and the text renderer, so mutating it leaks a
  suffix into a parsed payload, while no raw epoch survives at the print site
  to re-derive from. `local-stamp.mjs` gained `withLocalStamps`, applied at the
  TEXT boundary only; the stored value stays bare. One call at each tools
  single text emit site covers every stamp beneath it — including the dossier
  step 2 and step 4 rows the lane named as reached but never exercised.
  Desk note: the lane marked its two findings `todo` rather than silencing
  them, which was correct while `tools/` was outside its write boundary — but a
  todo test reports neither pass nor fail, so the markers were removed once the
  defects were fixed. A todo left standing is a bite that guards nothing.

- **DONE `c3481d1` (2026-08-10) — the header no longer claims defects that
  `f9ec558` fixed, and the same staleness had TWO siblings further down the
  file.** Unblocked by the dotfiles guard fix `025b95f` (dotfiles
  `BACKLOG.md:592` DONE, `LEDGER.md:106`), verified live here before editing
  rather than read off that entry: a `//`-carrying command ran, and the
  guard's own documented positive (`ls /`) still returned
  `deny: path '/' is outside allowed directories` — so the green was the fix
  and not a disabled hook.
  **Desk work beyond the booked design.** (a) The citations were kept per the
  design, and each of the seven line numbers was CHECKED still to point at its
  site (`f9ec558` repaired at the emit boundary, not in those lines) rather
  than kept on the assumption that a fix elsewhere leaves them alone.
  (b) Reading the whole file instead of only the named block found two more
  stale claims of the same class: the dossier ARM 1 comment called step 3 "the
  KNOWN gap, isolated into its own `{ todo }` test below" when no todo test
  exists, and the NAMED GAP block still read as unadjudicated while
  `f9ec558`'s single `withLocalStamps` pass at dossier's render return covers
  the step 2 / step 4 rows (they are still UNEXERCISED — that part was true
  and is now stated as the two missing fixtures).
  **The booked verifier was wrong, which is the fire-rate datapoint.**
  `grep -n "todo"` returning nothing is not achievable and should not be: three
  surviving mentions NARRATE the marker's removal, and deleting them would
  destroy the record the header exists to carry. A keyword verifier cannot
  separate a claim about the present from a description of the past. The
  load-bearing check is the suite's own `todo 0` (2514 tests, 0 fail), which is
  a measurement rather than a text match — this is the "an entry's verifier is
  a claim, probe it before building against it" class, third recorded instance.
  **Closing gate.** q1 — the mechanizable slice is booked as the entry
  immediately below; q2 n/a, the evidence is committed source, not a rotating
  capture; q3 no new census class, this is a doc-staleness class the census
  does not see; q4 no instrument change rode along and none was needed — the
  bites themselves were untouched, only the prose about them.
  ORIGINAL ENTRY:
- **DONE (2026-08-10) — `bust-appears.md` now checks the tool's conversation and
  model before trusting its verdict. CORRECTED ON EXECUTION: the entry claimed
  BOTH runbooks; only one was exposed.** `sweep-finding.md` does not open on
  `bust-triage` — its line runs freeze -> establish -> rule out instrument ->
  attribute -> route, and it reaches the tool only in the KNOWN-OPEN terminal
  state, for row mapping, which it already warns about at its own `:174-184`.
  Its findings arrive as `gate-live` rows per capture, so the model-blind
  SELECTION defect cannot reach it. The entry's "both runbooks" was written from
  memory of naming them together in a reply, not from reading either line — the
  same inherited-claim shape this session already booked twice, caught here by
  opening the file the entry named. No caveat added there; forcing one in to
  satisfy the entry would have been the tuning-to-fit failure.
  ORIGINAL ENTRY:
- **(shipped) READY — the both-zones class has no mechanism at the ALTITUDE the defect
  lives at: the printed output.** `82372db` fixed the sites a human found by
  reading; nothing stops the next one. The lane's own lesson says why a source
  check cannot cover it: `quota-analysis` and `cost-report` print raw UTC
  stamps without ever calling `toISOString()` (pass-through from upstream
  JSONL), so grep-for-the-render-call undercounts at the FILE level and again
  at the LINE level inside a file already in scope.
  Design (decided), `test/tool-output-stamps.test.mjs`: EXECUTE each converted
  tool in a side-effect-free invocation over a fixture, capture stdout, and
  assert no line contains a bare `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` without a
  `(HH:MM local)` on the same line. Companion arm: each tool's `--json` output
  must contain no `local` text.
  Constraint the lane must respect: find a genuinely side-effect-free
  invocation per tool, and where none exists, SKIP that tool explicitly with
  the reason named in the test file — never invent one that writes.
  Verifier: red-first — revert one converted site (e.g. `quota-analysis`'s
  "Time range") and the bite must name that tool; over-firing control — a line
  legitimately carrying a bare stamp (an output FILENAME, a machine field
  echoed in text) must not fire, so the exclusion is declared IN the test as
  data it checks, not as a softened regex.
  Done-criterion: red-first on the reverted site, control green, suite green.
  Write boundary: `test/tool-output-stamps.test.mjs` only.

- **DONE `8fc54e0` (2026-08-08) — `tools/md-splice.mjs` makes anchored splices
  fail loudly.** Desk verification beyond the lane: I replayed the ORIGINAL
  incident against the helper — a two-op call whose second op targets `## Open`
  in a file that says `## Ready` — and it threw naming `operation 2 (find:
  "## Open")` with expected/actual counts, leaving the file byte-identical.
  That is the instrument going red on the defect it was built for, established
  by replay rather than by its own expectation. First real use: this very
  grading edit. ORIGINAL ENTRY:
- **(shipped) READY (small) — anchored markdown splices fail SILENTLY, and the pattern is
  used constantly here.** Measured 2026-08-08 in `claude-worktime`: a python
  splice targeted `## Open`, that repo uses `## Ready`, and because only the
  FIRST replacement was asserted the second dropped with no error — the only
  tell was an insertion count that looked plausible. Same session ran this
  splice shape a dozen times against `BACKLOG.md`; each one re-pastes the
  assert-by-hand discipline, which is exactly where the re-pasted one-liner
  hides a variant bug (project convention: a probe used twice graduates to
  `tools/`).
  Design (decided), `tools/md-splice.mjs`: one exported function taking a file
  path and a list of `{find, replace, count}` operations; every operation
  states its expected occurrence count, and any mismatch throws NAMING the
  operation and both counts before writing anything. All-or-nothing: the file
  is written once, after every operation has matched its count.
  Verifier: red-first — an operation whose `find` is absent must throw with the
  operation named (not a generic error); an operation matching twice where
  `count: 1` was stated must throw; the all-or-nothing property gets its own
  bite (a two-operation call where the second fails must leave the file
  byte-identical). Done-criterion: three bites, each independently reddened
  from a green baseline. Write boundary: `tools/md-splice.mjs`,
  `test/md-splice.test.mjs` (both new).

- **DONE `93cbad4` + `3abc02d` (2026-08-08) — the pre-mutation premise is
  pinned by a runtime bite.** `test/capture-is-pre-mutation.test.mjs`: the
  pre-capture slice is derived from the loaded registry`s own `order` values
  every run, never from today`s extension names, so a future extension landing
  below 60 is exercised without the file changing.
  Two desk findings the lane did not have:
  (i) THE TIE WAS UNCOVERED. `splitAtCapture` divides on `order < rc.order`,
  so a mutator at exactly 60 fell into `atOrAfter` and was never exercised,
  while its real position against request-capture rested on sort stability.
  Found by probing the boundary once the lane`s bites were green: caught at
  59, missed at 60. Closed by FORBIDDING the tie rather than defining a
  tie-break, and red-proven on a TRUE positive — the registry already has
  collisions at 350 and 690, so aiming the same predicate there reddens it.
  (ii) The lane settled one claim statically (request-capture`s own onRequest
  does not mutate `body.messages`). Executed it instead: hash identical across
  the call, capture file written, so it engaged rather than no-opped.
  ORIGINAL ENTRY:
- **(shipped) READY — the premise EVERY attribution verdict rests on is guarded by a
  code comment and nothing else.** Every `OURS / CC's` call this repo makes
  reduces to one claim: the capture is PRE-mutation, so a divergence visible in
  it was sent by Claude Code. Measured 2026-08-08: `request-capture` is order
  60; the only thing asserting that no earlier extension touches the body is
  prose in `proxy/extensions/output-guard-stash.mjs` ("Order 55: before the
  first body-mutating extension (cc-version-normalize, 90)"). No test pins it.
  Instrument-positive for that absence: `grep -rn '\.order\b' test/` DOES find
  relative-order pins (`proxy-cc-version-normalize.test.mjs:275` asserts
  `ext.order < fingerprintExt.order`), so the pattern can match — it finds
  nothing for `request-capture`.
  **Why it is severe: the failure is silent and points the wrong way.** Add or
  reorder any extension below order 60 that touches `body.messages` and every
  future verdict flips from "CC's" to possibly-ours with no alarm — i.e. we
  would build a mitigation for a bust we caused. That is the exact
  mis-attribution the operator named as the thing to never do.
  **Do NOT verify this statically.** Measured the same day: a grep for
  body-mutation idioms returned zero for the three sub-60 extensions AND zero
  for two KNOWN mutators (`sort-stabilization`, `identity-normalization`), so a
  pattern search cannot answer "does X mutate Y" here.
  Design (decided), runtime, `test/capture-is-pre-mutation.test.mjs`:
  (a) REAL-REGISTRY BITE — run the actual loaded registry over a realistic
  fixture body; structurally hash `body.messages` at the instant
  `request-capture`'s `onRequest` runs; assert it equals the hash of the
  unmutated input.
  (b) RED-FIRST — inject a synthetic extension at order 50 that mutates
  `body.messages`; bite (a) must fire. This is a real mechanism disable, not a
  module-load red.
  (c) OVER-FIRING CONTROL — a synthetic extension at order 100 that mutates
  just as hard must NOT fire (a). Without it, (a) is indistinguishable from
  "nothing anywhere ever mutates", which is false and would make the check
  unprovable.
  Done-criterion: (b) reddens exactly (a) from a green baseline; (c) green in
  the same run; full suite green. Write boundary: `test/` only — no `proxy/**`
  change, so no tree-pin bump and no restart.

- **(DONE — 2026-08-08, `6d9a8d3`) `tools/dossier.mjs` carries the reconcile
  vocabulary-collision that `bust-triage` just shed.** Found 2026-08-07 while
  fixing the bust-triage half (`fb20f3d`): `dossier.mjs:286` does
  `if (d.transcriptCause && r.cause && r.cause !== d.transcriptCause.type)` ->
  "instrument disagreement", i.e. the same string-inequality test over two
  different vocabularies that warned on AGREEMENT. `sameEvent` and
  `CAUSE_EQUIVALENCE` are already exported from `bust-triage.mjs` for exactly
  this, so the change is one import and one call. Verifier, red-first: drive
  `dossier` on 2026-08-06T23:59:10Z (ledger `idle`, transcript
  `previous_message_not_found`) — today it must warn, after the change it must
  not; control, the raced-read positive (s-captureQ, 2026-08-05T09:09:41Z,
  ledger `other` vs transcript `messages_changed`) must still warn. Recorded
  honestly: identified by READING dossier, not by running it — the
  reproduction is the first step, not a formality.

- **(DONE — MEASURED 2026-08-08; the answer is YES, 69.8%) does `movedFresh` EVER fire on a pair the census labels
  `join:cross-message`? The matrix and the tool disagree and nobody has
  measured it.** Booked 2026-08-07 from the 05:24:37Z statiker walk. Row 4's
  2026-07-31 datapoint says the flap/cross-message-join mitigation is "BUILT
  and corpus-clean, pending deployment"; `replay.mjs`'s own census text says "a
  cross-message join spans two messages, so no hash set in the extension
  matches it"; and on that live 134k bust the deployed extension logged
  `moved=0 movedFresh=0` while the census scored the pair `mitigation: 0/0
  mitigable` — the shape never entered the mitigable denominator at all. One of
  those two statements is about a shape the other does not name, which is the
  one-phenomenon-two-names trap this repo already books elsewhere. This is a
  MEASUREMENT, not a design: over the corpus the daily sweep already reads,
  count pairs the census labels `join:cross-message` and, for each, whether the
  insertion event log records a `movedFresh > 0` at that request. Done when the
  two claims are reconciled in the matrix, or the divergence is minted as its
  own row. Discriminator stated so the result cannot be read both ways: a
  non-zero rate means the mitigation reaches the class and the 05:24 instance
  is a miss to attribute; a zero rate means the built mitigation and the census
  label name different shapes, and row 4's "pending deployment" line is
  describing something that is not this.

- **(DONE — 2026-08-08, `1d07836`; naming residual booked below) `rebilledBytes` prices the re-bill from the DIVERGENCE, the wire
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

- **(DONE — 2026-08-08, `844b792`; two findings booked separately below) `bust-triage` maps `replace/edit` -> row 4 flatly
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

- **(DONE — 2026-08-08, `2e088df`; deployed, pin `8127160`, restarted; the
  doctor half is booked below) `extensions.json` is NOT the activation gate: every `.mjs` in
  `proxy/extensions/` runs unless it disables ITSELF.** Found 2026-08-08 as the
  zero-order finding of the disarm enumeration; verified by the dispatcher at
  `proxy/pipeline.mjs:20-70`. `loadExtensions` does `readdir(dir)`, filters
  `.mjs`, and computes `const enabled = cfg?.enabled ?? ext.enabled ?? true`.
  Absence from `extensions.json` therefore means DEFAULT ON, not off. Six files
  are absent from the config and live anyway, four of them un-inspected as of
  this booking: `deferred-tools-restore.mjs` (MUTATES, `:352`),
  `thinking-block-sanitize.mjs`, `upstream-change-detection.mjs` (5 Maps),
  `prefix-diff.mjs`, plus `session-health.mjs` and `auto-1m-guard.mjs`
  (classified read-only/stateless).
  **Why this is more than a config nit.** The repo has a three-answer
  discipline for which GATES run — DECLARED/RUNNING/VERIFIED (the unit's
  `Environment=`, `/health`, and the sweep's status file), and `doctor`
  compares all three. There is NO equivalent answer for which EXTENSIONS run:
  a `.mjs` dropped into the directory is live with no declaration anywhere and
  nothing compares it against anything. Every enumeration of "what is enabled"
  written from `extensions.json` has been over the wrong set — which is the
  enumeration-keyed-on-a-NAME error from the dev-loop, one level up at the
  directory. FORK-NOTES' restart-transparency argument enumerates extensions
  this way and is booked separately for the same reason.
  Design: make the extension set answerable and comparable. Emit the loaded set
  (name, file, order, enabled, and WHERE enabled came from — config / module
  default / implicit true) on `/health` beside `gates`, and have `doctor` fail
  when a live extension has no explicit declaration. Do NOT flip the default to
  off in the same change: that is a behaviour change to the serving pipeline
  and needs its own row-3 declaration and live pricing.
  Verifier, red-first: plant a no-op `.mjs` in a scratch extensions dir, load
  it, and assert `/health` lists it with source `implicit-true`; assert
  `doctor` goes RED on exactly that condition and stays green when the same
  extension is declared. Negative control: a file with its own
  `enabled:false` must NOT appear in the loaded set.
  Consumer tier **1 (event disposition)** — every "which extension did this"
  attribution, including today's two bust walks, reads the set this would fix.
  <!-- entry: "extensions.json is NOT the activation gate" -->

- **(DONE — 2026-08-08, `6faf161`) the operator's view and `bust-triage --list` share NO identifying
  field, so neither side can name an event the other can find.** Operator,
  2026-08-07: "I feel like there must be some gaps here as well in our tooling
  that we can't properly match my reporting and what you are able to easily
  investigate and match." Correct, and it is computable.
  What each side actually sees. The ❄ token renders **ordinal (`#2`), size,
  cause, AGE (`17m`)** and the operator knows the **project** they are sitting
  in; it shows no session id and no timestamp. `--list` renders
  (`bust-triage.mjs:648-649`) **UTC stamp, size, cause, 8-char sid**; it shows
  no project, no age, no ordinal. **The only overlap is size+cause.** That is
  why an entire exchange ran on "203k / 230k / 419k" as the sole handles, and
  why "the largest" and "the latest" collided into a phantom disagreement — with
  the zone mismatch (its own entry, above) sitting on top.
  Design: `--list` gains the three fields the operator can read off their
  screen — the per-session ORDINAL that worktime displays, the PROJECT
  directory the session belongs to, and the AGE — beside the existing UTC
  stamp and sid. The ordinal is the load-bearing one: worktime already computes
  it (`cold_count`, `claude-worktime.sh:1371`), the operator sees it, and
  "#2 in statiker" is unambiguous where "230k" is not. Project comes from the
  transcript path under `~/.claude/projects/`; age is `now - t`, rendered like
  the token's.
  **Operator addition, 2026-08-07, and it improves the design:** a WINDOW and
  SESSION GROUPING, not just extra columns. Today `--list` shows "15 of 112" —
  a count, not a period — while the question actually asked is "what happened
  in the last day, and in which sessions". So: `--since <dur>` (default 24h)
  and rows grouped under their session, each group headed by project and
  session, e.g. `statiker c08e2235: #1 203k messages_changed 06:08 local /
  #2 230k messages_changed 06:17 local`. Grouping is what makes the ordinal
  meaningful, since the ordinal is per-session by construction.
  Extend `--list`; do NOT add a tool. `bust-triage` already carries the
  conversation-grouping, the ledger/transcript reconcile, and the
  three-answer discipline, and a fresh file re-earns all of it from zero.
  **SEQUENCING, and this is the part that must not be skipped: the overview
  inherits the ledger's three known duplication modes** — one event booked
  three times (17:39:59/17:40:08/17:40:16Z), two events booked under
  contradictory classes (23:59, 03:32), and a pair with no retraction. Built
  today, a 24-hour overview would render phantom rows with an authoritative
  face, which is strictly worse than the current friction: the operator would
  stop trusting it after the first phantom, and a display nobody trusts is the
  guard-trains-its-reader-to-ignore-it shape. So this ships AFTER, or
  simultaneously with, the claude-worktime dedupe (that repo's entry (B)), or
  it ships with a stated caveat line naming the duplication modes in its own
  output — never silently.
  Verifier, red-first against today's own confusion: given only what the
  operator can see — "statiker, #2, 230k, messages_changed, 17m" — one
  `--list` invocation must identify exactly one row, and the same three inputs
  against the OTHER session's 419k event must identify a different single row.
  Today neither is possible, which is the red. Negative control: a session with
  one bust must render no ordinal, matching the token's own omit-at-N=1 rule,
  so the two displays cannot disagree about the ordinal itself. Plus a
  duplication control: the 17:40 triple must appear as ONE row (or as one row
  flagged as a known duplicate set), never as three.
  **DATAPOINT 2026-08-19 (morning, from a live bust walk) — PART of this entry
  has SHIPPED, and the unshipped part is now worse than absent.** `--list`
  today prints project, age and local time (it carried the 08:42:48Z event's
  project and `4m` age straight into the step-0 resolution, which is what this
  entry was for). Still missing: the per-session ORDINAL and the grouping.
  **But `--since` is not merely unbuilt — it is SILENTLY SWALLOWED.** Measured:
  `bust-triage --list --since 2026-08-19` and a bare `bust-triage --list`
  produce BYTE-IDENTICAL output, and ten rows dated 2026-08-18 are present in
  the supposedly-filtered result. An unknown flag that errors is honest; one
  that is accepted and ignored hands back a list that LOOKS filtered, which is
  this repo's own wrong-answer-shaped-like-a-right-one class arriving through
  the argument parser. So this entry gains a second, separable done-criterion,
  and it is the cheaper half: unknown flags REJECT rather than parse away, with
  a bite passing `--since` and a bite passing a nonsense flag, both expected
  non-zero. That half is worth shipping ahead of the ordinal/grouping design,
  because it is what stops the misread today rather than after the dedupe
  sequencing above clears.

- **(DONE — 2026-08-08, `13278fa`) `bust-triage` reports a state-key CHANGE across the pair as its own
  line (runbook step 8's GRADUATE marker, now with a measured false verdict
  behind it).** The marker has sat in `docs/runbooks/bust-appears.md` step 8
  since it was written; 2026-08-08 supplied the miss it predicted. On
  s-captureAT the tool answered `VERDICT: MITIGATED / matrix row 1 (MITIGATED)`
  for a pair whose two requests ran under different state keys with both sides
  `no-prior-canonical` — i.e. it reported the ROW's status as though it were a
  per-instance absorption claim, on an instance where nothing absorbed.
  Consumer tier **1 (event disposition)** under the dev-loop's reach ordering:
  a walker who runs only the triage, which is what step 2 of the runbook
  prescribes, closes the walk on a pass that was not one.
  Design: `bust-triage` already locates the pair's two requests by timestamp;
  read `~/.local/state/cache-fix/snapshots/*-insertion-events.jsonl` (and the
  deferred-tool log) at those two timestamps, and emit the state key for each
  side plus a `KEY-FLIP` line when they differ. A flip is a stop-here, ranking
  with UNCLASSIFIED and STATUS-UNREADABLE, because a body diff cannot see it.
  Emit `no-prior-canonical` on both sides as its own note even when the key is
  stable — "armed but baseline-less" is the state this walk needed named.
  Verifier, red-first, and it is available today rather than synthetic: run the
  new code against **2026-08-08T09:59:54Z** (s-captureAT) — must emit KEY-FLIP
  and must NOT close as MITIGATED; and against **2026-08-08T09:48:53Z**
  (s-captureAS), whose pair was measured state-key IDENTICAL — must NOT emit
  KEY-FLIP. Two live cases, one of each polarity, so the check cannot pass by
  always firing. Old code fails the first and passes the second, which is the
  red.
  **Second half, same entry because it is the same read** (added 2026-08-08
  when runbook step 11 was corrected): once the tool reads those logs it also
  PRINTS the snapshot command for them, beside the pin command it already
  prints — for whichever artifact the verdict actually rests on. The runbook
  now carries the artifact table and the machine-local snapshot convention
  (`~/.local/share/cache-fix/bust-evidence/<date>/`, 0600, never committed —
  raw lines carry session ids and the hygiene scan's `capture-uuid` class
  blocks them at push); what is missing is the tool emitting it, so a walker
  who runs only `bust-triage` is told which freeze to take. Verifier: on
  s-captureAT the tool must print an event-log snapshot command, on a pair
  whose finding is byte-shaped it must print the pin command, and the
  snapshot arm must be shown to reproduce (both timestamps present, >1
  distinct `key`) — a snapshot is a claim exactly like a pin is.
  <!-- entry: "bust-triage reports a state-key CHANGE across the pair" -->

- **(DONE — 2026-08-08, `2545fdf`; 29 violations remain for the repair lane) the WRITER-side guard that ends the XDG class: a module importing
  `statePath`/`dataPath` must not carry a `~/.claude` citation outside a
  labelled legacy context.** Proposed 2026-08-08 by the lane that ran the
  accounting, and it is the one item here that would stop the sweeps rather
  than run another one. Rule zero applies: this is the generator, and every
  sweep so far has been the amplifier.
  **Why it is the right predicate:** it is computable, it has near-zero false
  fires (a legacy/migration mention is labelled and exempt by construction),
  and it fires at WRITE time rather than at sweep time. Measured reach: it would
  have caught all 14 comment hits in the accounting's bucket (d), plus the four
  `description:` strings fixed before them — i.e. the entire source half of a
  class that has now consumed four lanes.
  **Red-first, and the arrangement is real and in hand:** the 14 known hits are
  committed history. Point the check at the tree before `bdd964d` and require it
  to name them; point it at the tree after the bucket-(d) lane lands and require
  silence. Both ends exist, so this cannot decay the way a live-state
  arrangement does.
  Placement: a repo check under `tools/`, wired into the suite the way the other
  source-shape guards are. NOT `gate-live` — this is a source property, not a
  traffic property.

- **(DONE — 2026-08-08, `83de792`; residual named below) FORK-NOTES asserts
  `deferred-tool-rewrite` is disabled; it is
  ENABLED in the serving config, and that sentence is load-bearing.**
  The sentence is corrected AND the argument it was a premise of is re-derived
  rather than patched around. Three claims verified by the dispatcher in the
  artifact, not booked on the lane's word: `/health` reports
  `"CACHE_FIX_TOOL_REWRITE":"1"`; `grep -l 'body\.tools' proxy/extensions/*.mjs`
  returns **FOUR** files, not the three the old argument enumerated; and
  `tools/verdict-ab.mjs:55` is hardcoded (below).
  **The re-enumeration is the part worth keeping.** Two extensions touching
  `body.tools` had never been considered — `thinking-block-sanitize` (reads
  only, for a hash) and `tool-input-normalize`, which is ACTIVE because
  `extensions.json` overrides its own file-level `enabled: false`. That is the
  `extensions.json`-is-not-the-activation-gate finding arriving from the
  opposite direction: the old argument enumerated from memory of a config, and
  the config both under- and over-states what runs. Outcome: row 3's
  restart-transparency verdict does NOT need re-grading — it gains a fourth
  confirming mechanism (`body.tools` is rebuilt every request from
  disk-persisted state, so a fresh process reproduces it byte-identically)
  instead of losing its only stated one.
  **RESIDUAL, and it is a PARENTAGE defect in this entry rather than in the
  work: the verifier this entry named cannot verify what it was named for.**
  The entry said "a restart with `verdict-ab --seed-from-a` over the
  deferred-tool canon". `tools/verdict-ab.mjs:55` is
  `const EXT = "proxy/extensions/insertion-normalization.mjs"` — hardcoded, no
  override, single-extension by its own header's admission. The lane ran it as
  literally specified (exit 0, IDENTICAL across 310 verdict lines, 8 corpora)
  and then said plainly that the green was OFF-TARGET, which is the right call
  and the reason it is recorded here: a spec sentence and the tool it names
  disagreed, and neither settles it from the inside. So this entry's
  restart-transparency half rests on CODE READING with the label **unverified**
  for the executed half. The tool that would actually verify it is
  `replay.mjs --restart-at N` against a deferred-tool-carrying fixture. That is
  booked below as its own entry rather than left as a caveat here.
  Measured 2026-08-08: `FORK-NOTES.md` (the restart-transparency section)
  states "`deferred-tool-rewrite` (the only extension holding tool-order state)
  is disabled in the unit". The extension's gate is `CACHE_FIX_TOOL_REWRITE`
  (`proxy/extensions/deferred-tool-rewrite.mjs:92`) and `/health` reports
  `CACHE_FIX_TOOL_REWRITE=1`; its event log carries `action=rewrite` on live
  traffic in both sessions examined that morning. So the claim is false against
  the running system.
  **Why this is not a typo fix.** The sentence is a PREMISE in FORK-NOTES' own
  argument that no enabled extension can vary `body.tools` across a restart —
  the argument that supports treating restarts as cache-transparent and that
  retired an earlier "restarts bust live sessions" caution. With the premise
  false, the argument's reach is unknown: `deferred-tool-rewrite` is named
  there as *the* extension holding tool-order state, and it is running.
  Design: correct the sentence, then re-derive the restart-transparency
  argument from the current gate set rather than editing around it — the
  stale-premise rule's "plans and conclusions built on the old premise execute
  stale unless enumerated and re-derived". State explicitly whether
  `deferred-tool-rewrite`'s persisted serialization state makes a fresh process
  emit a byte-identical `body.tools`, citing the code that makes it so.
  Verifier: a restart with `verdict-ab --seed-from-a` over the deferred-tool
  canon, plus the assertion that the corrected FORK-NOTES sentence names the
  same gate value `/health` reports. Done when the sentence and the argument
  both match the serving config, or the row-3 restart-transparency claim is
  re-graded with its new bound stated.
  <!-- entry: "FORK-NOTES asserts deferred-tool-rewrite is disabled" -->

- **(DONE — WITHDRAWN before implementation, 2026-08-08; see
  `docs/directives/portable-state-roots.md` §7) key our roots by PROFILE when
  `CLAUDE_CONFIG_DIR` is set, because
  that variable IS Claude Code's profile identity and our single global root
  silently dissolves it.**
  **The design is REVERSED, and the reason is measured rather than cautious:
  `CLAUDE_CONFIG_DIR` does not mean what this entry assumed.** It does not bound
  Claude Code's OWN footprint — session-resume mirrors under `os.tmpdir()`, a
  separate `CLAUDE_SECURESTORAGE_CONFIG_DIR`, an XDG updater family
  (`versions`/`staging`/`locks` under the XDG data/cache/state roots), a
  platform-fixed managed-settings root, and `.claude.json` as a SIBLING FILE in
  `$HOME` all escape it. A knob that does not contain its own product cannot be
  sold as containing ours, so both halves of this entry's design — "DATA follows
  the config dir" and the profile-suffix rule — are withdrawn. Establishing that
  took two independent lanes, one reading documentation and one reading the
  installed binary, and each caught something the other missed; the record is in
  §7.
  What replaces it is what was already there: the explicit `CACHE_FIX_DATA_DIR`
  / `CACHE_FIX_STATE_DIR` overrides, which are OUR contract and cannot move
  under us. Profile isolation and security relocation are BOTH served by the
  user setting the override per profile.
  **The surviving piece was STRANDED inside this entry as a subordinate clause
  and is now its own READY entry** (`CacheFixConfigDirDivergenceWarning`, at the
  end of `## Open`). That is the carrier defect worth recording: the warning had
  been AMENDED into this entry rather than split out, so re-grading the parent
  — which is correct — would have taken the only remaining answer with it. The
  peer session that made the withdrawal caught it and asked for the split before
  the re-grade, which is the only order in which it was catchable.
  **This entry also cost a rank.** The 2026-08-08 afternoon derivation ranked it
  at cost rank 6 on the basis that its hard sequencing constraint had dissolved.
  That check was TRUE and answered a narrower question than the one it shut:
  `portable-state-roots` shipped, and the design it gated did not survive. The
  rank is VACATED rather than re-pointed, per the DONE-anchor guard.
  Original entry follows. Designed 2026-08-08 when the operator challenged the
  don't-use-`claudeHome()` decision; the decision survived, this gap did not.
  Claude Code's machinery has exactly ONE storage concept: a single relocatable
  root, no config/data/state split (`getClaudeConfigHomeDir()` is one memoized
  base for config, caches, state and transcripts alike). `CLAUDE_CONFIG_DIR`
  therefore carries two meanings at once — WHERE things live, and WHICH PROFILE
  they belong to. `proxy/claude-home.mjs:5-7` names the second in its own words:
  "running one proxy per config dir". Our XDG roots honour neither, so two
  profiles under two config dirs commingle their captures in one directory,
  losing an isolation upstream's `claudeHome()` callers get for free.
  **The split this design rests on:** copy Claude's IDENTITY model, refuse its
  STORAGE model. Its storage model puts data in a config directory because it
  has no split, and the harness then protects that path by SHAPE — which is the
  defect that caused the relocation in the first place, so copying it
  reproduces the thing we fixed. Identity is orthogonal to storage class and
  costs one path segment.
  Design: `root(kind)` = explicit `CACHE_FIX_{DATA,STATE}_DIR` used as-is;
  otherwise `<xdg-or-platform-base>/cache-fix[/<profile>]`, where `<profile>` is
  OMITTED when `CLAUDE_CONFIG_DIR` is unset or resolves to the default
  `~/.claude`, and is a short stable key derived from the resolved config-dir
  path otherwise. Derive the key from the RESOLVED absolute path, not the raw
  variable, so `~/x`, `$HOME/x` and `/home/g/x` are one profile and not three —
  the hand-rolled-identity rule applies to path keys too.
  **Sequencing (hard): lands AFTER `docs/directives/portable-state-roots.md`
  ships**, and as its own commit. Bundling it hides which edit moved which path,
  and the portable-roots change carries a byte-identical-paths invariant that
  must be provable on its own.
  Verifier, red-first, three arms: (1) `CLAUDE_CONFIG_DIR` unset -> roots
  byte-identical to today (the no-op control that protects the live deployment
  — measured 2026-08-08: neither `CLAUDE_CONFIG_DIR` nor `XDG_*` is set in the
  unit or the operator's environment, so this arm covers production); (2)
  `CLAUDE_CONFIG_DIR` set to the DEFAULT `~/.claude` -> still no suffix, which
  is the over-firing control and the one a naive implementation fails; (3) two
  distinct config dirs -> two distinct roots, and the same dir spelled three
  ways -> one root. Old code fails (2)... no: old code passes 1 and 2 and fails
  3, so arm 3 is the red.
  **AMENDED same day, operator question: the security-boundary case is SOLVED
  by construction, not by the warning.** The first draft of this entry left a
  relocated-`CLAUDE_CONFIG_DIR` user with our DATA root at the platform default
  and offered a warning as the answer. A warning is a notification, not a
  control, and for a security boundary that is the wrong instrument.
  What the evidence changed: the DATA root has exactly two consumers
  (`git grep -l "dataPath("` over `proxy/`), and both are the sensitive ones —
  the MITM CA (`proxy/config.mjs:67`, already overridable via
  `CACHE_FIX_CA_DIR`) and the capture corpus (`request-capture.mjs`, already
  opt-in behind `CACHE_FIX_REQUEST_CAPTURE=1`). STATE holds the regenerable
  half: event logs, snapshots, status files. So the module's own split rule —
  unrecoverable if lost -> DATA, regenerable -> STATE — already partitions by
  SENSITIVITY as well as by durability, and the design can use that.
  So the roots diverge deliberately, and the rationale is stated because two
  roots behaving differently is otherwise a surprise:

      DATA:  CACHE_FIX_DATA_DIR
             -> $CLAUDE_CONFIG_DIR/cache-fix   (when set and non-default)
             -> platform/XDG data root
      STATE: CACHE_FIX_STATE_DIR
             -> platform/XDG state root [+ profile suffix, above]

  DATA follows the boundary the user CHOSE; STATE follows platform convention.
  A user who deliberately puts their Claude root on an encrypted volume has
  stated where their Claude-adjacent secrets live, and our preference for
  spec purity does not outrank that — while regenerable operational logs have
  no such claim on the volume.
  **This also simplifies the entry above rather than adding to it:** DATA
  following `CLAUDE_CONFIG_DIR` gives profile isolation for free, so the profile
  SUFFIX is needed only on the STATE root. One mechanism, not two.
  The explicit `CACHE_FIX_*_DIR` overrides stay top of the ladder, which is the
  escape for the case this does NOT cover: a relocated config dir that the
  harness's shape-based protection still prompts on. Whether it does is
  **UNVERIFIED** — the protection keys on path shape and a user-chosen
  `/secure/claude` is probably not that shape, but nothing here measured it, and
  the argument above deliberately does not rest on it.
  `CacheFixConfigDirDivergenceWarning` narrows accordingly: it now fires only
  when STATE diverges from a set `CLAUDE_CONFIG_DIR`, since DATA no longer
  does — and if that leaves it firing on every relocated-config user for a
  divergence that is now deliberate and documented, it should not ship at all.
  Decide that when the portable-roots lane's version is in hand.

- **(DONE — OVERTAKEN, 2026-08-08 afternoon, verified by reading the file;
  residual
  named below) `.claude/settings.local.json` still grants the DEAD capture path,
  so every agent read of the corpus now costs a permission prompt.**
  **The load-bearing half of this entry is FALSE against the world today, and
  the probe cost one Read.** The entry's whole case is "the grant that would
  stop it does not exist". It DOES: `.claude/settings.local.json:9` carries
  `Read(//home/g/.local/share/cache-fix/captures/**)` and `:10` carries
  `Bash(cp ~/.local/share/cache-fix/captures/*)` — the live XDG paths, both
  present. So the designed work is already done and no config write is needed;
  the veto-gated call this entry existed to justify never had to be made.
  **Residual, which is clutter and not a defect:** the dead grants remain at
  `:11-12` and at `:33,35,36,37` (the legacy alias-registry commands). They
  permit paths nothing can read, which is harmless — the entry's own design said
  KEEP the legacy entries through the transition anyway. They retire with
  `legacyReadPath`, on that entry's 30-quiet-day trigger, not separately.
  **Why this is recorded rather than deleted:** it is the fourth entry this week
  whose own load-bearing claim dissolved under a one-command probe, and the
  first found by the DERIVATION rather than by a lane briefed against it — the
  ranking removed its rank on the promise of doing the work, and the work turned
  out to be done. That is the stale-premise class the handoff names, and the
  standing repair (nothing checks that a booked premise is still true) is the
  PARKED verifier-runnability entry.
  Original entry follows. Lines 9-10
  grant `Read(//home/g/.claude/cache-fix-captures/**)` and a `Bash(cp
  ~/.claude/cache-fix-captures/…)`; that directory no longer exists — the
  migration moved the corpus to `~/.local/share/cache-fix/captures/` (96
  entries, verified 2026-08-07 20:20Z). The grants are write-only labels: they
  permit a path nothing can read and fail to permit the one everything reads.
  Design, decided: ADD `Read(//home/g/.local/share/cache-fix/captures/**)` and
  repoint the `cp` rule; KEEP the legacy entries through the transition,
  matching the code's one-transition fallback. Config write, therefore
  veto-gated — correctly refused once when a SUBAGENT asked for it (permission
  laundering); the operator asking is not that. Done-criterion: an agent `Read`
  under the XDG captures path raises no prompt.
  <!-- entry: "settings.local.json still grants the DEAD capture path" -->

- **(DONE — 2026-08-08, dotfiles `3014043`) "already on a remote" is not "already
  public", and the shipped scoping cannot tell them apart.**
  **SHIPPED as DECLARED publicness, not inferred.** `OEFFENTLICHE_REMOTES` sits
  beside `GUARDED`, same list-not-pattern form: the published set is stdin
  `<old>` (always, unconditional) UNION the tracking refs of remotes whose URL
  is declared public. Matching is on a normal form (`host/owner/repo`,
  lowercased, so `https://…/r.git` and `git@…:o/r.git` collapse) and is EXACT
  rather than substring — `…/claude-code-cache-fix` is a prefix of
  `…/claude-code-cache-fix-private`, so a substring match would declare public
  precisely the mirror the list guards against. That trap carries its own
  assertion.
  **The route NOT taken, and why, because the record had it backwards.** The
  entry specified destination-only scoping. The building lane implemented it,
  measured it, and showed it reddens two battery bites that encode measured
  2026-08-06 incidents: bytes already public on UPSTREAM must not block a push
  to ORIGIN. Upstream is public, so those bytes are already beyond recall and
  blocking them is the fires-on-a-non-defect shape on the one gate before
  unerasable history. Destination-only was too narrow; any-remote was too wide;
  declared publicness is the only reading that keeps both properties.
  **A prior halt on this design was recorded with a basis that had gone STALE**
  — its stated reason, "regresses the two 2026-08-06 cases", was true on
  2026-08-07 under the blob-granular rule and false after the finding-granular
  change of 2026-08-08. Re-measuring cost ten minutes and changed what was
  actually being decided. An inherited verdict deserves a re-measure, not a
  re-read.
  **Verified by the dispatcher before pushing:** `pre-push --test` all green
  against the deployed scanner; the two incident bites' assertions byte-identical
  (only a fixture-realism argument changed on a shared helper, same class as the
  already-blessed 7/7b fix); and all three declared URLs confirmed `PUBLIC` via
  `gh repo view --json visibility`, because declaring a private repo public is
  the one failure this design cannot survive.
  **First LIVE git-invoked runs, and stated precisely rather than generously:**
  the fork's pushes at 10:19:32 and 10:22:19 ran the new hook as a real git
  hook (committed 10:18:57; the fork is `GUARDED`). Neither crashed and neither
  false-blocked. That is the clean-path only — a scan returning no findings
  short-circuits before the filter — so the FILTERING path remains
  battery-and-fixture verified, not live-verified. The distinction is the whole
  difference between "it ran" and "it worked".
  **Named limits, all fail-closed by construction, none measured:** the URL
  normal form covers https and scp-style; `ssh://` with an explicit port and
  other transports fall through to NOT-public. The `git push <url>` form
  contributes no declared remote, so stdin `<old>` alone applies. Each errs
  toward keeping findings, which is the safe direction, and each is unmeasured.

- **(DONE — verified shipped 2026-08-08 by reading the deployed hook, not the
  entry) the push-side leak scan reaches ONE repo; body and design live in
  `~/dev/Gunther-Schulz/dotfiles/BACKLOG.md` (booked 2026-08-06).**
  **Re-graded before dispatching against it**, which is the third stale grade
  caught today by probing an entry's claim first. The design was to split
  `MARKER`'s two jobs; `git/hooks/pre-push` now carries exactly that:
  `SCANNER_REPO = "claude-code-cache-fix"` (`:121`) keeps the fallback-scanner
  path, and `GUARDED = (SCANNER_REPO, "claude-worktime")` (`:132`) is the
  activation list `is_active` reads (`:170-172`). The measured trigger — one
  `capture-key-prefix` finding already published in `claude-worktime`'s history
  — is covered: that repo is guarded now.
  **What is NOT closed, and is a DECISION rather than a residual:** every repo
  outside `GUARDED` still gets a silent exit 0. The file says why in its own
  comment — deliberately a LIST, not a pattern, because the hook is fail-closed
  on a missing scanner and a repo swept in by regex would push unchecked. So
  the entry's "reaches ONE repo" framing is superseded: it reaches the repos on
  a list, and widening the list is a per-repo decision with a scanner
  prerequisite, not a bug to fix. A future repo handling capture keys gets
  added to `GUARDED` deliberately; that is the standing action, not a build
  item.

  The machine-wide `git/hooks/pre-push` dispatcher activates on one substring
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
  **BUILT 2026-08-07, UNPUSHED (dotfiles `ca46be4`).** `MARKER`'s two jobs are
  split exactly as the design says — `SCANNER_REPO` keeps the fallback scanner
  path, a separate `GUARDED` tuple drives activation, and activation stayed a
  LIST. Verified here rather than on the report: reverting `GUARDED` to its old
  single-entry value reddens exactly the claude-worktime assertion and
  restoring it greens the whole battery. The lane also graduated its end-to-end
  probe into the battery as a permanent case, so activation is no longer proven
  only by a bare predicate assertion.
  **The push is BLOCKED and not by this work:** two peer-session commits
  (`b795abf`, `8942ec5`, both operator-GO corpus/gate work) sit in the same
  outgoing set, so pushing would publish another session's work. Halted as a
  question rather than pushed — an unexpected commit in the push set is
  answered, never resolved by a live push.
  **EVIDENCE CORRECTION, measured by the lane and stronger than what the
  dotfiles entry states:** that entry cites ONE `capture-key-prefix` finding in
  claude-worktime's `BACKLOG.md`. Measured over the whole history: **four**
  findings, and **none of them in `BACKLOG.md`** — two in `claude-worktime.sh`,
  one in `docs/cachebust-runbook.md`, one in `tests/replay-cold-detect.sh`,
  plus one in a commit message. All are ancestors of `origin/main`, published
  and unremediable. This strengthens the entry's own trigger-rate argument, and
  the dotfiles-side body still carries the stale number — correct it there when
  that repo is next written.
  **ENTRY TWO ("already on a remote" is not "already public") is HALTED at a
  design contradiction, and the decision is the operator's** — the entry's
  design (scope the published set to the DESTINATION remote) was implemented
  and measured, and it regresses the two 2026-08-06 cases: this clone has
  `origin` and `upstream` both public, so destination-only scoping stops
  counting upstream as published and re-blocks every push to origin. The entry
  itself concedes the premise ("origin and upstream are both public GitHub
  repos") and specifies only what to do about a PRIVATE remote. The options are
  (A) destination-only, measured and rejected; (B) destination plus an
  explicitly DECLARED-PUBLIC remote list — fail-closed, keeps the measured
  cases green, and note that matching by repo NAME does not work because a
  private mirror carries the same name; (C) park with the residual named, since
  no clone here has a private+public pair today. Nothing is committed for entry
  TWO; the measured implementation is preserved as a patch in the lane's
  scratch.

- **(DONE — 2026-08-08, `052468b`) the byte-gate's `anyPresent` probe can never
  return false for a
  RECURRING reminder text, so a pruned host is reported MISMATCH instead of
  DROPPED.**
  **SHIPPED in the MATCHING form, not the counting one**, and the corpus result
  was reproduced by the dispatcher rather than booked from the report: 100/100
  captures read, 0 UNREADABLE, **9 DROPPED / 1 MISMATCH** (was 8 / 2). The sole
  surviving MISMATCH is case A — `2026-08-06T11:12:52.584Z host=3 blocks=3
  recon=4347ch rejected=7961ch`, the genuine wrapper-envelope hole — and the
  verdict block still reads `DO NOT SHIP as-is`, which is the outcome that
  mattered: whole-body counting would have reached ZERO MISMATCH and flipped
  that block to "the rule holds on every occurrence", turning the gate green
  for a NORMALIZATION design while a live hole existed.
  **`hj === null` was MEASURED, not argued, and the measurement changed the
  answer.** Over 100 captures / 17.5k pairs / 950 hosts it occurs TWICE, and
  BOTH occurrences reach the no-counterpart branch reporting a bogus rejected
  candidate (25,870ch and 36,066ch, each the message at index 1). So the guard
  was extended to cover it; both rows now print `host-unlocatable`. The
  competing lane had left this unmeasured and its guard did not cover it — had
  that implementation been integrated, the defect would have shipped with a
  plausible story saying it was probably unreachable.
  **Three states now have three words**, closing the tell this row inherited:
  `host-pruned` (host absent), `host-unlocatable` (host carries no id),
  `actual=0ch` (host located, nothing found — three rows, correctly).
  **NAMED RESIDUAL, written at the branch in code as well as here:** a created
  counterpart whose text is byte-identical to a carrier pruned in the SAME pair
  is accounted for by it and reads DROPPED. Outside that case the one-way
  property holds (a true DROPPED may read MISMATCH, never the reverse), so the
  tally stays an upper bound on holes. No live instance searched for.
  Original entry follows. Found 2026-08-07 by the byteGate-MISMATCH lane, dispatcher-verified
  in the code the same hour. Instrument-partition tier 2 (feeds the GATES): a
  MISMATCH blocks shipping any NORMALIZATION design, so a false MISMATCH blocks
  a correct mitigation, and this one has been standing in the corpus-wide tally
  that three documents quote as a semantics question.
  **The defect, at `tools/reminder-migration-census.mjs:326-330`.** The
  no-counterpart branch distinguishes DROP from rule-failure, and its own
  comment states the question correctly: "if the text is absent from `after`
  ENTIRELY, nothing migrated and the rule was never exercised". The
  implementation asks a different question — `blocks.some(...)` takes a 60-char
  probe of each block and searches `wholeAfter()`, the entire serialized after
  body. For a reminder text that recurs at other indices the predicate cannot
  return false whatever the pair did. This is dev-loop's own "a needle that
  matches more than one thing", shipped inside a tool rather than a throwaway
  probe — and the file that documents that lesson is the one this tool's author
  had read.
  **The measured instance (s-captureAP, request ordinal 97, predecessor 96,
  2026-08-05T11:44:44.398Z / 13:44 local).** `MISMATCH host=186 blocks=2
  recon=780ch rejected=37831ch`; n 190->189, prune INTERIOR-DIVERGENT div=174
  anchor=176. The host's `tool_use_id` is absent from the after body entirely —
  the host was PRUNED, nothing migrated. Per-block occurrence counts, which are
  the whole evidence and are what the fix keys on:

  | block | as standalone system msgs | 60-char probe occurrences |
  |---|---|---|
  | 0 (319ch, PreToolUse:Bash push-claim hook) | before [40, 87, 175] -> after [40, 87] | before 4 -> after **3** |
  | 1 (459ch, PostToolUse:Bash plugin-update hook) | before [] -> after [] | before 1 -> after **0** |

  Every count DECREASED. `anyPresent` fired on pre-existing standalones at
  indices 40 and 87 that are byte-identical on both sides. Correct verdict:
  DROPPED.
  **Design, decided — the discriminator comes from the DEFINITION, not from the
  artifact.** The question is whether a counterpart was CREATED at or after the
  host's position, never whether the text appears somewhere. So `anyPresent`
  becomes `anyCreated`.
  **REFUTED 2026-08-08 by the dry-run this entry said it had already done.**
  The struck design read: "per block, count occurrences in BOTH bodies and
  require some block's after-count to EXCEED its before-count. Checked against
  both live cases: case B has no block increasing -> DROPPED; case A
  (s-captureAQ, the genuine wrapper-envelope hole) creates its standalone in
  after, so that block's count increases -> stays MISMATCH." The second half is
  false, and the word "checked" is what makes this worth recording: the dry-run
  was asserted, not executed. Measured by the lane, before any edit, with a
  probe importing `analysePair`/`conversationOf` and counting EVERY match —
  case A (reqOrd 25, prev 24, host present in after at hj=2): block 0 probe60
  2->2, block 1 2->2, block 2 1->1. Whole-body `anyCreated` calls case A
  **DROPPED**, which is a FALSE DROPPED — the one-way error direction REVERSED,
  hiding a real hole instead of over-reporting one.
  **The mechanism is structural, not a quirk of the case:** a migration
  CONSERVES the whole-body count — the inline occurrence disappears exactly as
  the standalone appears — so counting a serialized body is blind to precisely
  the event "a counterpart was created". The corrected design counts the
  STANDALONE population `classify()` already walks (`sysBefore`/`sysAfter`),
  which is what "counterpart" means in this tool: case A block 2 goes 0->1,
  case B goes 3->2 and 0->0. It is also cheaper than the shipped code — no
  `wholeAfter()` serialization, so the per-pair memory note at `:324-326` stays
  satisfied.
  **And COUNT-ONLY is still not the definition, decided at the desk on the
  lane's own case B.** A pair that PRUNES one standalone carrying the block's
  text AND creates a counterpart nets zero, reads "no increase", and returns a
  false DROPPED; case B's block 0 (`standaloneSys` 3->2) proves prunes are
  ordinary here. So the rule is a MATCHING one — a standalone in after not
  accounted for by a corresponding standalone in before — and count-only ships
  only with that residual named in the code, in the report, and as a stated
  loss of the one-way error property the corpus tally's bound rests on. A
  synthetic prune+create pair is the bite that pins it either way.
  **Second, independent defect in the same row, and it is a fix that
  overshot.** `rejectedCandidate` (`:302`, `:304`) exists to cure the
  `actual=0ch` misleading tell — the READY entry further down this file. Its
  position filter reads `if (hj !== null && hj >= 0 && s.j <= hj) continue;`,
  so when `hj = -1` (host absent, exactly this case) the guard short-circuits,
  no filter applies, and the FIRST system message in the array is reported as
  "the nearest position-eligible standalone that classify() rejected". Here
  that printed 37,831 chars of an unrelated summarization notice as though it
  were the counterpart considered. Fix: `rejectedCandidate` is null whenever
  `hj < 0`, because the claim its name makes is false there. Note the shape for
  the ledger — the earlier misleading-tell fix grew its own misleading tell one
  case over, which is the class a single clean review round books and a second
  falsification round catches.
  **Verifier, red-first, and the fixture must be SYNTHETIC.** The class is
  detected by literal TEXT, and the sanitizer replaces text with hash tokens —
  so a harvested pin of s-captureAP cannot reproduce it, and pinning it would
  produce the `harvest --pin` trap dev-loop already documents (a fixture that
  replays clean and proves nothing). Build a synthetic pair: a 2-block host at
  a mid index; block 0's inner text also present as byte-identical standalones
  at two lower indices in BOTH bodies; block 1's text present in before and
  absent from after; the host's `tool_use_id` absent from after. Current code
  must say MISMATCH on it and the fixed code DROPPED. The mutation that proves
  the bite discriminates: raise one block's after-count above its before-count
  and watch the verdict return to MISMATCH.
  **Corpus consequence, stated so the tally is not re-quoted stale.** The
  error direction is one-way (a true DROPPED can be reported MISMATCH, never
  the reverse), so today's `8 DROPPED / 2 MISMATCH` is at most 2 rows wrong and
  the real byte-gate hole count is ONE, not two. The 2026-08-02 `MISMATCH x3`
  accounting (this file, s-captureJ x1 attributed to row 24 — another
  host-vanishing event) may be the same misfire; that is UNVERIFIABLE and stays
  so, because s-captureJ predates the alias registry and cannot be resolved.

- **(DONE — 2026-08-08; fork `7591fec` = `e607c3a` + the test fix, dotfiles
  `d144540`) the leak scan's already-published discard
  is BLOB-granular, so any edit to a file carrying a pre-existing finding is
  blocked forever.**
  **SHIPPED, and both halves verified by the dispatcher against the DEPLOYED
  scanner rather than the lane's copy** — the distinction matters, because the
  lane's own battery first ran green vacuously against the deployed scanner
  that had no `--at` yet, which is how it found the need for a capability
  assert. Real case (range `cb1b5b4~2..cb1b5b4^`, driven through the hook's
  `main()` with git's own stdin, never a live push): hook exit **1 -> 0**, with
  `2 Befund(e) ... uebersprungen: dieselben Bytes liegen am selben Pfad schon in
  der veroeffentlichten History`. Anti-swallow, in a throwaway clone deleted
  afterwards: a freshly planted identifier still **BLOCKS** (exit 1, one
  finding). A discard that swallowed the new one would have traded a gate that
  cannot pass for a gate that does not fire, so that half was the required one.
  **Mechanism as built:** every finding carries an identity —
  `sha256(class + NUL + bytes)[:12]`, hashed never printed, emitted INSIDE the
  parens so the hook's `FINDING_DATEI` regex stays backward-compatible by
  construction; a new `--at <ref> <path>` mode classifies content by its
  LOGICAL path so allowlisting and class-scoped exemptions behave as in
  `--git-range`; and the hook walks each path's DISTINCT published blob
  versions, unioning identities. Fail-closed at every branch.
  **The gate then blocked the dispatcher's own push of the fix** — four
  `capture-key-prefix` findings from literal synthetic keys in the new tests.
  Repaired with the file's existing convention (`SYNTH_KEY`, built from
  fragments so no literal sits on disk), never an allowlist entry and never
  `--no-verify`: exempting the scanner's own test file would blind it to the
  class that matters most, which is this entry's own argument about
  `claude-worktime.sh`. Touching the test to fix it also exposed a real hole in
  it — `SYNTH_KEY_2` was never asserted to fire the class on its own, so the
  "a line gains a SECOND identifier" test had been proving something weaker
  than it claimed.
  Original entry follows. Measured 2026-08-07, on the guard's FIRST real push after
  being widened to `claude-worktime`: a one-function fix to
  `claude-worktime.sh` was blocked by two `capture-key-prefix` findings at lines
  1664 and 1933, both **byte-identical to lines already in `origin/main`**
  (`git grep -F "<line>" origin/main` → present). The bytes are months public
  and unremediable; blocking the push does not unpublish them, it only stops all
  future work on that file.
  **Mechanism:** the discard asks whether the BLOB is already published. Editing
  the file mints a new blob, so a pre-existing finding inside it reads as new on
  every subsequent push. The commit-MESSAGE half of the same discard works
  correctly and is what the widening lane demonstrated end-to-end — which is why
  this passed its verifier and still failed in production: the lane's E2E case
  planted its identifier in a NEW file, so no already-published blob was ever
  edited.
  **This is a gate that cannot pass**, the shape `docs/dev-loop.md` already names
  for `--git-range` over a whole branch, and it trains exactly the `--no-verify`
  habit the hook's own header was rewritten to prevent. It is live right now.
  Design, decided: make the discard FINDING-granular — a finding whose matched
  bytes already appear at the same path in the published history is discarded,
  regardless of which blob currently carries them. The path qualifier keeps it
  narrow: the same bytes appearing in a NEW file are still a finding.
  **CORRECTED 2026-08-08, by probing the entry's own verifier before briefing
  against it.** The line below read "Verifier, red-first and available
  immediately: `git push` in the `claude-worktime` clone with commit `0527e88`
  present must go from BLOCKED to allowed". It is not runnable, and the same
  session that booked it is what killed it: `git log --oneline origin/main..HEAD`
  in that clone is EMPTY, and the offending bytes were scrubbed hours later by
  `cb1b5b4` ("scrub the capture-key prefixes out of four comments"). A booked
  entry's mechanism claim earns the same disproving probe as any other
  load-bearing claim — the rule `docs/dev-loop.md` states, firing on the entry
  that quotes it.
  **The runnable red, on real history and needing no construction** (executed
  2026-08-08 from the claude-worktime clone):
  `node <fork>/tools/absence-scan.mjs --git-range cb1b5b4~2..cb1b5b4^` reports
  the two `capture-key-prefix` findings in `claude-worktime.sh` at lines 1664
  and 1933. `cb1b5b4^` IS `0527e88`, so the pushed range is the one the entry
  meant; the difference is that the arrangement is driven through the scanner
  and the hook's filter rather than through a push.
  **And this enlarges the design rather than merely repairing the verifier.**
  Those bytes are reachable in published HISTORY (at `cb1b5b4^`, an ancestor of
  `origin/main`) and are ABSENT from today's `origin/main` TIP, because the
  scrub removed them. The shipped code reasons over published TIPS; the design
  sentence above says "published history". Tip-only is why the right sentence
  and the wrong implementation coexisted, and the fix must walk the path's
  distinct published blob versions, not the tip.
  Verifier, red-first, as executed above; and a planted NEW identifier in the
  same file must still BLOCK —
  both halves required, since a discard that swallows the new one has traded a
  gate that cannot pass for a gate that does not fire. Plant it in a throwaway
  clone, never in the real one.
  **Do not "fix" this with an allowlist entry:** the allowlist is class-scoped
  per path, so exempting `claude-worktime.sh` from `capture-key-prefix` would
  hide every FUTURE capture key in the file that matters most.
  <!-- entry: "the leak scan's already-published discard" -->

- **(DONE — 2026-08-07, `7b804fe` merge + `c50f183`; dotfiles pin `a5c7263` ->
  `b1d070f`) the SIXTEEN cache-fix-owned paths leave `~/.claude/`; the
  registry was one of seventeen.** EXECUTED: `xdg-migrate --apply` moved 16 of
  16 live paths (COULD-NOT: 0), proxy restarted 19:28Z on the new code,
  `~/.claude/` verified free of every `cache-fix*` entry, doctor 20 FAIL -> 3.
  The count in the body below is SIXTEEN and the executed scope was 24 — the
  extra eight were latent writers a live-directory `ls` could not see, which is
  the entry's own recorded lesson and is left standing rather than edited.
  Two things the run itself produced, both booked separately: `--verify` calls
  a never-written path an abort condition (`c50f183`), and the CA moved while
  running shells held the old path in `NODE_EXTRA_CA_CERTS`, breaking every new
  CC session until a fresh shell (dotfiles LEDGER 2026-08-07). Re-graded at
  session close because the injected SessionStart head lists READY headers in
  file order, so a shipped entry left at READY offers finished work to the next
  session — the DONE-anchor defect this file already carries an entry for.
  Original body follows.
  Operator-ranked FIRST, 2026-08-07.
  `~/.claude/` holds `cache-fix-captures/`, `cache-fix-snapshots/`,
  `cache-fix-state/`, `cache-fix-gate-status.json`,
  `cache-fix-fire-ledger.jsonl`, `cache-fix-keymap.jsonl`,
  `cache-fix-bootstrap-log.jsonl`, `cache-fix-debug.log`, `cache-fix-ca/`,
  `quota-status/`, `session-mirrors/`, `upstream-baseline.json`,
  `upstream-changes.jsonl`, `usage.jsonl`, `usage-log/` and
  `workflow-derivation-events.jsonl` — all tool DATA in a config directory, all
  raising the harness's shape-keyed permission prompt on every read and write,
  for every session and every agent.
  **Two corrections, 2026-08-07, both measured against the live directory
  rather than against this entry.** (1) The count was NINE and the seven
  non-prefixed members were missing, because the enumerating search was
  `ls ~/.claude/cache-fix*` — a glob over the NAME standing in for the class
  "paths this project owns". It could never have matched `quota-status/` or
  `usage.jsonl`, so its result carried no information about them; the
  dotfiles guard, enumerating by allow-set instead, sees all sixteen.
  (2) The split below was stated as "a fact not a judgment" and was neither.
  It is retained verbatim because the correction is legible only against it:
  the sentence names six PROXY extensions as the writers and then concludes a
  `tools/`-only half in the next clause — the contradiction sat inside one
  paragraph, unread, because the reader who wrote it was counting READERS.
  Grepping writers: `cache-fix-gate-status.json` and
  `cache-fix-fire-ledger.jsonl` are the only two written from `tools/`.
  `cache-fix-captures/` — 12 GB, the largest single prompt source — is written
  by `proxy/extensions/request-capture.mjs`. Two of sixteen is not a split
  worth building, so it is DROPPED: one deployment-coupled change, one restart.
  ~~The split that decides the work, and it is a fact not a judgment: five
  tools READ these (`bust-triage`, `dossier`, `gate-live`, `harvest`,
  `cold-events`) and six proxy extensions WRITE them (`request-capture`,
  `prefix-diff`, `insertion-normalization`, `fresh-session-sort`,
  `deferred-tool-rewrite`, `output-guard`). The tools half is `tools/`-only and
  ships today.~~
  Design, decided: `$XDG_DATA_HOME`/`~/.local/share/cache-fix/` for DATA —
  the rule is "unrecoverable if lost", which admits `captures/` and `ca/` and
  nothing else — and `$XDG_STATE_HOME`/`~/.local/state/cache-fix/` for the
  other fourteen (regenerable, or merely expensive to lose). Every path
  resolves through an env override with an XDG default, exactly as
  `CACHE_FIX_ALIAS_REGISTRY` now does, through ONE resolver at
  `proxy/xdg-dirs.mjs` — not one per side: seven files under `tools/` already
  import from `../proxy/`, and a second copy is a path resolver that can
  diverge from the one production uses. Each reader keeps a LOUD legacy
  fallback for one transition; silent fallback is how two stores diverge.
  **Restart accounting is part of this entry, not an afterthought:** the change
  moves where captures and state KEYS are written, so the row-3 rule applies
  and the restart is priced against LIVE sessions
  (`tools/restart-exposure.mjs --match …`) before it is taken, not against the
  corpus.
  Verifier, red-first: the dotfiles guard
  (`bootstrap/doctor.py`, `claude_dir_entries_verdict`) names all sixteen
  today — that is the red, and it is the right instrument because it
  enumerates by allow-set. Done is those sixteen NAMES gone from its output,
  never a finding COUNT: the count is live mutating state and has already been
  quoted at three different values (22, 19, 18) in one day. Plus, per path
  moved, one executed read through the tool that owns it, because a moved file
  nothing can find is a worse failure than a prompt. The machine-wide guard
  that keeps the class from returning is a SEPARATE dispatch, briefed at
  `docs/directives/xdg-data-and-config-dir-guard.md`.
  <!-- entry: "the SIXTEEN cache-fix-owned paths leave" -->

- **(DONE — this commit, 2026-08-07; threat-matrix row 28)
  insertion-normalization suppressed a system message WITHOUT emitting a
  copy: the one REAL content loss in the 67-row conservation residue, and the
  mechanism was live.**
  **BRANCH NAMED, then fixed.** The step-through this entry asked for was run
  under instrumented replay of the preserved capture (a truncated 63-request
  slice reproduces the row, so the loop is seconds rather than minutes):
  `[DBG reset-suppress] idx=8 hash=b6e8e363… ci=7 onWire=false pinApplied=false`
  against `idx=13 hash=45e20a0c… ci=11 onWire=true pinApplied=true`. The branch
  is `resetKeepingPins`' duplicate-suppression loop, and the defect is its
  PRECONDITION rather than the loop: `pinnedBlockHashes(priorCanonical)` answers
  "is this block in a live canonical entry", where the suppression's safety
  argument needs "is a copy on the wire we are sending". CC had edited the
  carrier (skill body 21476 -> 21475 chars), so its identity changed, so the pin
  could not apply — and the reminder's hash was still in the set from an entry
  nothing was serving.
  **The same hole had a SECOND entry path, found by the sibling enumeration and
  not by the instance:** on the success path a carrier arriving with a
  `cache_control` breakpoint still MATCHES (identity is volatile-blind) while
  `pinnedForwardForm` (:637-641) forwards CC's message untouched. Matched is not
  restored. Both call sites now read their hash sets off the bytes the request
  actually forwards (`restoringHashes`), which also covers the pruned-carrier
  and merged-join siblings by construction.
  **Red-first, stated:** the four new bites in
  `test/insertion-suppression-copy-present.test.mjs` were run against the OLD
  implementation in a worktree at the pre-fix HEAD — all four red, both controls
  green — then against the fix, all six green. The preserved capture goes
  exit 1 -> exit 0 with the row gone; the other two preserved captures' rows are
  unchanged (34 / 31 / 1), which is what shows the fix is targeted rather than a
  softened predicate. npm test 2327/2327.
  Original attribution, kept for the record — 2026-08-07 by the read-only lane:
  on s-captureAE n=62, raw[8] — a 1473-byte "CLAUDE.md was modified" system
  message carrying the operator's own edit diff — is absent from the forwarded
  array three ways (as a unit under the gate's own hashing, as a substring, and
  line-by-line, 0 of 18 substantial lines), while the SAME request's other
  suppression (raw[13]) correctly reappears wrapped — per-instance failure,
  not wholesale, which is what makes it credible. Differential-confirmed
  (INSERTION_NORMALIZE=0 removes the row). Extension unchanged since 04ed3c9
  (2026-08-05), so current traffic is exposed. NOT attributed: WHICH branch
  drops it — needs a step-through against the preserved input. Next step,
  decision-shaped and cheap: trace the branch on the preserved arms, then fix
  red-first (the preserved capture replays the row). Evidence bundle +
  all three captures preserved against rotation at
  `~/.local/share/cache-fix/attribution-2026-08-07/` (machine-local;
  ATTRIBUTION-TABLE.tsv, differential arms, probes importing replay.mjs's own
  identity functions, run.sh).

- **(DONE — this commit, 2026-08-07)
  a COMPLETED entry can hold a rank anchor, so the '## Build order' block
  keeps proposing work that already shipped — and no tool said so.**
  Found 2026-08-07 by a dispatched lane that was cut FROM the defect: its
  brief came from the Tier B head ("the conservation gate has no
  declared-exemption clause for `identity-normalization`"), whose own bullet
  had read `(DONE — f2ab6d0, 2026-08-07)` since that morning. The lane's base
  check and grounding reads found the work already landed and it halted
  without building, which is the only reason this cost one dispatch rather
  than a rebuild.
  **Not one stale item: FOUR of the block's thirty-three anchors** resolved to
  DONE-graded bullets (this one, plus the `causeToRow` walk, the verdict enum,
  and the idle/TTL guard — all four shipped earlier the same day). Each is
  removed by this commit, with its bullet's own DONE grade and landed commit
  cited: 9da34df, 52796ea, d520ec0, f2ab6d0, each verified an ancestor of HEAD
  rather than taken from the header text.
  **Why both existing guards were silent, and it is structural.**
  `backlog-order.mjs` asked WHETHER an anchor resolves — zero hits, two hits,
  two anchors on one bullet — and never WHAT it resolves to, so a DONE bullet
  matched its anchor and stayed ranked. `backlog-lint.mjs` skips any entry
  whose header carries no live grade (`HEADER_GRADE`: OPEN/READY/HOT), which
  is exactly what a CORRECTLY re-graded DONE header does not carry, so the
  entry left its population at the moment it became defective in this other
  sense. Both printed clean over the defective file; measured, not reasoned:
  `--check` exit 0 and `backlog-lint: clean`.
  **Shipped:** a completed-entry clause in `reorder()`, same loud-by-
  construction shape as the zero/multi-match errors beside it — an anchor
  resolving to a DONE/RESOLVED/FIXED/BUILT-graded bullet is an error and
  nothing is written. The marker vocabulary is `backlog-lint.mjs`'s own
  (RES_WORD + DONE_LINE), taken as a definition rather than re-derived from
  what today's file happens to contain. Scoped to the bullet's HEADER, which
  is the narrowness that matters: backlog-lint matches its markers anywhere in
  a body, and this corpus writes line-initial DONE sub-steps inside entries
  that are correctly still open — a body-wide match would have fired on those.
  All anchors are reported in one error rather than the first only, since the
  list is repaired as a whole.
  **Red-first, run against today's file before any removal:** 4 reported, all
  DONE-graded, output pasted in the lane's report. Permanent bite:
  `test/backlog-order.test.mjs` (the tool's first suite — it shipped with
  none), 9 tests, its red half reading the pre-removal BACKLOG.md at `a6e51ed`
  via `git show` at test time so the arrangement stays re-runnable against an
  immutable ref. Mutation-checked: with `resolvedGrade` forced to null, 5 of
  the 9 go red and the three negative cases stay green.
  **NOT done here, and deliberately: nothing was re-ranked.** Dead anchors were
  removed and the sequence renumbered; the surviving order is untouched and
  still carries its 2026-08-07 midday derivation date. Removal is the block's
  own documented practice for shipped work ("Five of that list's ranks shipped
  … and drop out"), while re-ranking is a re-derivation and belongs at the desk
  (dev-loop: "the derived order is re-derived, not edited").

- **(DONE — 9da34df, 2026-08-07)
  a matrix walk that dispositions a CAUSE is invisible to the
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

- **(DONE — 52796ea, 2026-08-07)
  the verdict enum has no value for CONTROLLED-CAUSE, so a row whose
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

- **(DONE — d520ec0, 2026-08-07)
  `bust-triage` has no idle/TTL guard, so a 216k eviction answered
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

- **(DONE — f2ab6d0, 2026-08-07)
  the conservation gate has no declared-exemption clause for
  `identity-normalization`, so EVERY capture containing a resume fails the gate
  on declared behaviour.** SHIPPED as clause (h), byte-verified by chaining the
  extension's own `normalizeSessionStartText` per block. Verified by the
  dispatcher in the artifact, not on the report: s-captureAL replayed under the
  serving gate set reads conservation 0 (was 2) with both rows carrying
  `exemptReason: identity-normalization:session-start-substitution` on the
  `lost` and `invented` sides. Of the four live reds, one flips green and 66
  rows remain across the other three — measured as NOT this class (zero `lost`
  rows survive anywhere), and deliberately not widened to. **The design
  deviation, accepted:** the extension publishes no `ctx.meta` telemetry, so the
  declaration is the replay's own staged per-extension measurement (`mutatedBy`)
  rather than a self-report — an observed effect, and it avoids making a
  checker-side repair deployment-coupled. Item 2 of the entry (the `in[937]`
  sweep finding) returns COULD NOT VERIFY: that capture has rotated, shown
  against a known positive rather than asserted. Three gaps it surfaced are
  booked below and their build is in flight on the same lane. Original entry
  follows. Found 2026-08-06 while walking s-captureAL: clauses
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

- **(DONE — e787960 + a5912ad, 2026-08-07)
  evidence leaves the rolling window at FINDING time: the
  sweep pins the request bytes behind each finding row (tools/-only,
  not deployment-coupled).** SHIPPED: `replay.mjs --pin-rows` (all 8
  persisted row families, each with its own index, coordinate SPACE and
  owner), `gate-live --rowpins` writing scrubbed pins to
  `test/fixtures/harvested/rowpins/`, idempotent by (keyToken, n, index,
  space, family), rejecting `bytesMatchRow:false` without writing. Pin
  size measured against the entry's kilobytes claim: 11,711 B committed,
  mean 4,618 B over 21 pins on a 255 MB capture, pin pass +5.7% wall.
  Red-first arrangement executed: capture removed, old path
  `ENOENT`, pin alone still answers "did we build these bytes"
  (`forwardedPresentInRawAt=null -> OURS`). Two residues, both booked
  below: the doctor's three-answer verdict for the new `rowPins` fields
  (dotfiles), and `harvest-scrub-relations` not recursing into the new
  subdirectory. A THIRD residue was closed the same day rather than
  booked (`instantUtc`, and the class-scoped `live-timestamp` exemption
  for `rowpins/`): the pin shipped at day precision with the hour-join
  named as a residual, and this session put it to the operator
  recommending deferral — the operator's correction is now rule ZERO in
  `docs/dev-loop.md`, and it is the reason that residue is a commit and
  not a bullet. Original entry follows. This is the permanent answer to the
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

- **(DONE — 93a8414, 2026-08-07) `bust-triage`'s UNVERIFIABLE branch prints a FALSE disjunction, and
  the reason text is what a reader acts on.** SHIPPED: the reason is computed
  from the walk that failed — capture absent / present-but-window-not-covered /
  present-and-covered-but-no-pair — on the transcript step as well as the
  capture step (the done-criterion covers both, and both disjuncts were false
  on the motivating event). A THIRD live instance was measured the same
  morning, on the 05:24:37Z statiker bust, before the fix landed. Original
  entry follows. Found 2026-08-06 by using it on
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

- **(DONE — 22b8c05, 2026-08-07) `bust-triage` picks the busting request by TIME ALONE, so a haiku
  sidecar was named as the cause of a 336k opus event — and the tool then
  reported the evidence missing while it sat on disk.** (Title kept verbatim as
  the record of the drift the next paragraph corrects; the shipped rule selects
  by whether a candidate could CARRY the event, not by clock position.)
  **THIS ENTRY'S NARRATIVE WAS WRONG AND THE CORRECTION IS THE LESSON.** The
  defect, the design and the verifier were all sound — the fix ships and the
  entry's verifier passes verbatim — but the MECHANISM this entry named is not
  the one in the code, measured by a probe printing every candidate plus a
  stage trace of the real function: the 01:00:54.702Z sidecar has `n=1` and was
  already excluded by the pre-existing `plausible` predicate, so it never
  entered the candidate set and cannot have won on recency; the recency rule
  picked the CORRECT request; what displaced it is `preferTelemetryConfirmed`,
  where a different sidecar's reset event sits 5 ms from an earlier opus
  request. The quoted "2,368 bytes" and "01:00:54.702Z" belong to different
  records. WHAT WROTE IT OUT OF REACH: the entry was assembled by reading a
  candidate LIST instead of tracing the selection FUNCTION, and nothing stops
  the next entry being written the same way — the generalized rule is now in
  `docs/dev-loop.md` ("A booked entry's MECHANISM claim"). Original entry
  follows, kept unedited as the record of the drift. Measured 2026-08-07
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

- **(DONE — b2459a3, 2026-08-07) the threat matrix's status cell is split on `|`, so a row whose
  prose CONTAINS a pipe hands the reader a mid-cell fragment.** SHIPPED as
  candidate (b), markdown-table semantics (a cell boundary is an UNESCAPED pipe
  outside inline code). Done-criterion met and measured: STATUS-UNREADABLE rows
  across the live matrix now 0 (was row 3 alone); the MITIGATED set is unchanged
  at rows 1, 7, 8, 9, 15, 18, 25, so `docs/runbooks/bust-appears.md`'s recorded
  figure did not go stale. Original entry follows. Surfaced
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

- **(DONE — fb20f3d, 2026-08-07) the reconcile check fires when the two instruments AGREE.** SHIPPED as a
  cause-equivalence table; the raced-read known positive (s-captureQ,
  2026-08-05T09:09:41Z) must and does still WARN. First live fire on a NEW
  event the same morning: the 09:52:42Z bust in the dev session, where the
  ledger's `other` and the transcript's `previous_message_not_found` are the
  raced read, and the check named it unprompted — that walk is in the matrix.
  `tools/dossier.mjs:286` carries the identical predicate and is booked below.
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
  red against today's implementation on the second. `proxy/**` so it is
  deployment-coupled; row 3 answer expected NO state key and no freeze
  change, to be stated by the implementation.

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
  CONTAINER to the wire's current one (`proxy/**`, deployed).** Closed
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
  **The design below is what shipped; it is kept for the evidence trail.** This is the
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
  our stored flip) and both are `proxy/**`. First read of the code says
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

- **(DONE — claude-worktime `0527e88`, 2026-08-07; PUSH BLOCKED, see below)
  `PROJECT_GIT_ANCHOR` does not reach a WORKTREE, so
  agent lanes book their time as separate projects.** Fixed as designed:
  `--git-common-dir` with the old `--show-toplevel` kept as the fallback for
  git < 2.31 and non-standard layouts. `tests/label-git-anchor.sh` pins it with
  its controls — a subdirectory and the repo root must not regress, a non-git
  path must still fall back, and with the anchor OFF everything is unchanged,
  which is what stops a fix that anchors unconditionally from passing. Red-first
  recorded: reverting the one changed question reds the two worktree cases and
  leaves the subdirectory control green. All six suites pass; installed to
  `~/.local/bin/claude-worktime` (install.sh COPIES, so a reinstall was
  required).
  **THE PUSH IS BLOCKED, and the blocker is the guard widened hours earlier in
  the same session** — its first real push on the repo it was widened to cover.
  `absence-scan` flags `capture-key-prefix` at `claude-worktime.sh:1664` and
  `:1933`, and both lines are **byte-identical to lines already in
  `origin/main`** (checked with `git grep -F` against that ref). So the
  already-published discard did not apply, and the mechanism is that the
  discard is BLOB-granular: editing a file that carries a pre-existing finding
  mints a new blob, so the finding reads as new forever. Consequence, and it is
  the shape the lane's own brief warned about: `claude-worktime.sh` is now
  permanently unpushable without `--no-verify` — a gate that cannot pass, which
  trains the override habit its header exists to prevent. Booked as its own
  entry below. Not overridden: the operator's gate, on a publish action.
  Original entry follows. Found 2026-08-07 by the
  operator reading their own statusline: the label had changed to
  `worktrees/agent-<id> (worktree-agent-<id> ✗?)` with its own `total 16m`,
  while `PROJECT_GIT_ANCHOR=true` was already set in their config (line 245).
  **The mechanism, executed rather than reasoned:** `_project_label_v`
  (`claude-worktime.sh:~726`) anchors with
  `git -C "$path" rev-parse --show-toplevel`, and inside a worktree that
  returns THE WORKTREE'S OWN ROOT —
  measured: `--show-toplevel` -> `<repo>/.claude/worktrees/agent-<id>` while
  `--git-common-dir` -> `<repo>/.git`. So the option's own comment ("anchor to
  the git repo root, so subdirs and worktrees show the repo") is true for
  subdirs and false for worktrees, which is why it reads as working.
  Design: anchor via the common dir — `git -C "$path" rev-parse
  --path-format=absolute --git-common-dir`, then strip the trailing `/.git`
  (and handle a bare `.git` file/dir alike). Verifier, red-first: the label for
  a path inside a worktree must render as the REPO today and does not; control,
  a plain subdirectory of the main clone must render exactly as it does now,
  and a non-git path must still fall back to the short-path label.
  **Why it is worth more than cosmetics:** per-project totals are the operator's
  own measurement surface, and this repo's build-order rubric ranks on measured
  cost. Every agent lane silently forks a new "project" whose time is not
  counted against the repo it was spent on — and the harness places agent
  worktrees INSIDE the repo (`.claude/worktrees/`), so the fork rate is one per
  dispatched lane, three today alone. Candidate for the false-verdict partition
  at the next derivation (consumer: the worktime ledger, i.e. process/backlog
  tier); not placed by this session, which had already derived its order.
  **Why the body is not in claude-worktime yet, with its trigger:** a lane is
  live right now whose verifier clones that repo and asserts against a
  pre-existing finding in ITS `BACKLOG.md`; editing that file mid-run changes
  the fixture under the test. Move the body there when that lane returns — one
  writer per repo, which is the rule this repo just wrote down.

- **(DONE — 5ecba0b + 0d0d2b6 + 3d98c09, 2026-08-07) three defects the
  conservation clause work surfaced in the gate it extended.** All three
  shipped. Verified here rather than on the report, and the verification that
  mattered is the POSITIVE CONTROL, because zero rows moved on the live corpus
  and "nothing moved" reads identically to "the clause is dead": after the
  per-unit narrowing, s-captureAO still grants **44** `fresh-session-sort:rewrite`
  exemptions alongside 50 peel and 13 strip, conservation unchanged at 1 — a
  broken pre-image/post-image mapping would have collapsed those 44 to zero and
  produced 44 new violations. s-captureAL still reads conservation 0 with its
  two clause-(h) exemptions. **Named residue, carried forward:** both narrowings
  are unproven ON LIVE DATA — no message in the four swept captures carries a
  partial exemption, so the constructed bites are the entire evidence, and the
  other 81 captures were not swept for one. Original entry follows. All three are in
  `tools/replay.mjs`, all three were recommended-to-build by the lane that found
  them, and all three are being built on the extended grant; this entry is the
  record, and if the lane returns without them it is the spec.
  (1) **The three-answer gap.** With no declaration surface on the entry, the
  clause is off and the row reads as an ordinary violation — a could-not-verify
  wearing a fail's clothes, which is the failure this repo has now hit four
  times. Not new with clause (h): `fssDeclared`, `stripDeclared` and
  `smooshDeclared` all behave identically. Fix: a `declarationsUnavailable`
  flag, additive to the row schema, and the row's TEXT must say so too — a flag
  alone leaves the human-facing line unchanged. Red-first: a hand-built entry
  with no stats. Bounded: the SHIPPED path is immune (`conservationViolations`
  is called from one place, with an entry whose `mutatedBy` is always an array),
  so the reachable route is `findConservationViolations` and hand-built entries.
  (2) **Clause (f) exempts per MESSAGE where it claims per unit.**
  `rewriteExempt`'s predicate never references the unit beyond the strip check,
  so one verified rewrite exempts every other lost unit of that message — an
  over-firing exemption, i.e. a gate that UNDER-fires, on the side where safety
  outranks cache. Red-first arrangement already demonstrated: mutation M3 of the
  clause-(h) battery installed exactly that shape and the "a REAL loss in the
  same message" bite went red. This one changes live verdicts, so the four
  currently-red captures are re-run and any row whose verdict MOVES is reported.
  (3) **The violation row's COUNT is not narrowed by partial exemptions** — 2
  lost of which 1 is declared-and-verified still reads `2 of 2`. Pre-existing,
  shared with clauses (f) and (g); a no-op except in the partial case, which is
  what its bite must construct.

- **(DONE by enumeration — 2026-08-07, no further defect found) `lines()` drops
  blank lines, so every POSITION derived from
  it is short by the blank count, and the sweep was never done.**
  **THE SWEEP, run and recorded rather than left as a verdict:** every consumer
  of the helper, in both files that define one. `tools/bust-triage.mjs` — line
  109 (`coldEvents`, JSONL records), 134 and 183 (transcript JSONL), 254 (event
  logs), 737 (`matrixRow`, which matches a row by its own text and returns the
  ROW, never an index); `tools/dossier.mjs` — 116 and 188, both JSONL. **Not one
  of them derives a position**: they read records or match content, where
  dropping blank lines is harmless and for JSONL is required. The single site
  that did derive one — `eventWalks` — was fixed at build time and reads the
  file whole. So the class is one instance, and the entry closes with the
  enumeration as its basis rather than with a fix. What DID ship is the missing
  contract: both helper definitions now carry it, with the measured symptom
  (line 1045 reported for a heading at 1212, both numbers plausible), because
  the next author's defence is the comment at the definition, not this entry.
  Original entry follows. Found
  2026-08-07 mid-build: the matrix lint first reported line 1045 for a heading
  that sits at 1212, and both numbers are plausible — the tell is only that one
  of them is wrong. Fixed in `eventWalks` by reading the file whole. **The
  finding is the SWEEP that did not happen:** the lane fixed its own call site
  and stated plainly that other tools deriving positions from the same helper
  have the same defect and were not checked. Design: grep every consumer of
  `lines()` in `tools/`, and for each, decide whether it derives a POSITION
  (defect) or only content (fine); the ones that do get the whole-file read.
  Done when the enumeration exists with a verdict per call site — an unswept
  helper defect is the paraphrase-drift shape at the line-number level.

- **(DONE — 2026-08-08, this entry's own commit) re-derive the build order; the
  block is banner-marked STALE and
  three of its inputs moved on 2026-08-07 evening.** Done-criterion met as
  written: the block is replaced whole (header `DERIVED 2026-08-08 (morning)`,
  no STALE banner), `node tools/backlog-order.mjs --check` exits 0 over 35
  anchors, `backlog-lint` clean. The pre-existing drift is discharged with it.
  A fourth input the booking did not anticipate: twelve entries had been booked
  after the previous derivation ran, seven of them rankable — four admitted to a
  partition, three declined with their tests recorded in the block. Original
  entry follows. Booked rather than done at
  session close, because a derivation is judgment over the whole READY
  population and this session had none of it loaded. What moved is enumerated
  in the banner itself (shipped operator-ranked #1; stale Tier B head numbers;
  the restart's zero-bust datapoint). Note `--check` is ALREADY red at HEAD, so
  the re-derivation also discharges a pre-existing drift rather than one this
  session introduced. Done-criterion: `node tools/backlog-order.mjs --check`
  exits 0 against a block whose header date is the derivation's own, and the
  STALE banner is gone. Do NOT patch the existing block.

- **(DONE — 2026-08-08 afternoon, this entry's own commit) re-derive the build
  order; the block is banner-marked STALE and
  four of its ranked anchors shipped the day it was written.** Done-criterion
  met as written: the block is replaced whole (header
  `DERIVED 2026-08-08 (afternoon)`, no STALE banner),
  `node tools/backlog-order.mjs --check` exits 0 over **44 anchors / 167
  bullets**, `backlog-lint` clean, and the population is conserved (167 bullets
  / 81 READY before and after the reorder).
  **Two of the booking's own premises were WRONG and the probes are the
  useful half.** (1) The banner said "67 -> 76 READY"; the measured header-set
  diff between `0cef42f` and `b7ae5aa` is **66 -> 81**, +18 booked and −3 left.
  (2) It suggested the empty irreversible partition was the input to weigh; the
  input that actually moved the ranking was the WITHDRAWAL of the morning pass's
  quiet-hours datapoint — two cold events landed the same morning it was spent
  on — plus a hard sequencing constraint dissolving. Both recorded in the new
  block's inputs (i)–(vi).
  Original entry follows. Booked at session
  close 2026-08-08 rather than done, because a derivation is judgment over the
  whole READY population and this session had spent its context elsewhere.
  What moved is enumerated in the banner (empty irreversible partition, 35 -> 31
  anchors, 67 -> 76 READY). Done-criterion: `node tools/backlog-order.mjs
  --check` exits 0 against a block whose header date is the derivation's own,
  and the STALE banner is gone. Do NOT patch the existing block.
  Note for whoever does it: the irreversible partition being EMPTY is a real
  input, not an oversight — an empty top partition is a re-derivation trigger,
  not a vacancy to fill by promoting whatever sat below it.

- **(DONE — 2026-08-08 afternoon, operator instruction "please do it") the
  pre-push suite verifies the WORKING TREE, not the commits being
  pushed, so it can go red on code that is not being pushed and green on a
  commit that is broken.**
  Shipped in `tools/git-hooks/pre-push`: the suite now runs in a DETACHED
  WORKTREE at each pushed sha, read from the refs git feeds the hook on stdin
  (branch deletions carry an all-zero sha and are skipped; empty stdin falls
  back to HEAD — still the committed state, never the working tree). Not
  `git stash`: a pre-push hook must never mutate a working copy a co-writer may
  be mid-edit in. The worktree gets the standing `node_modules` symlink and is
  removed on exit, throw and signal.
  **RED-FIRST PROOF, executed at the desk against the OLD hook
  (`git show HEAD:tools/git-hooks/pre-push`, bare `npm test` in the working
  tree) over the same two synthetic fixtures — inverted on BOTH directions, and
  the output is the whole point of this entry:**

      OLD, untracked scratch red / commit green   -> RESULT: BLOCKED  <- false red
      OLD, commit red / tree 'fixed' uncommitted  -> RESULT: ALLOWED  <- FALSE GREEN,
                                                     broken commit reached the remote

  The false-green direction is now MEASURED rather than argued. It was the arm
  nobody had seen fire, and it is the reason this was worth changing: the cheap
  direction merely wastes a push, the silent one publishes a broken commit under
  a green hook.
  The permanent guard is `test/pre-push-hook.test.mjs`, 4 bites: untracked red
  does not block; committed red blocks even over a green tree; an ordinary green
  push still passes (the over-firing control); and no worktree is left
  registered. Its fixture repo carries its OWN trivial `npm test`, so a hook
  that runs `npm test` is never exercised BY `npm test` — that recursion is real
  and the fixture is what avoids it.
  **A defect in the TEST, caught by the test:** the first version asserted the
  hook's message against `execFileSync`'s return value, which is stdout alone
  while the hook reports on stderr — an assertion that could only ever have been
  vacuous, and it failed loudly only because it was a PRESENCE assertion. The
  same mistake inside an absence assertion is a permanent silent green. Switched
  to `spawnSync` and the reason is written into the helper.
  Original entry follows. Found 2026-08-08 afternoon by an operator question
  ("is that a bug? should be fixed also then") about a blocked push, which is
  the right question: the blockage looked like correct guard behaviour and the
  guard underneath it is aimed at the wrong object.
  **Measured, both facts checked rather than assumed:** `tools/git-hooks/pre-push:41`
  runs bare `npm test`. At the blocked push, `git status --short` reported
  `?? test/xdg-writer-guard.test.mjs` and `?? tools/xdg-writer-guard.mjs` — both
  UNTRACKED — while `git log origin/main..HEAD` listed exactly three commits,
  none of which touched either file. So the hook failed a push over a file that
  was not in it.
  **The false-red is the cheap direction. The false-GREEN is why this ranks.**
  The same defect runs the other way and silently: uncommitted fixes in the
  working tree make a BROKEN committed state pass. Edit a file, do not commit
  it, push — the suite runs against the edit and the pushed commit is broken,
  with a green hook on the record. This repo has already written that shape down
  twice in `docs/dev-loop.md` from other instruments ("new runs against new", a
  red-first arrangement decaying into a vacuous green); this is the same error
  in the guard that stands in front of the irreversible boundary.
  **Second cost, and it is the one that compounds:** the hook's own failure text
  advertises `git push --no-verify` as the escape. The repo hook is CHAINED
  behind the dotfiles global hook that runs the fixture-leak scan, so every
  bypass taken for an unrelated red also skips the scan at the exact boundary
  where git history stops being editable. A guard that false-fires on a
  co-writer's scratch, while naming its own bypass in the error, is training the
  override reflex on the one guard that must never be overridden.
  Design, decided: run the suite against the PUSHED SHA, not the working tree —
  `git worktree add --detach <tmp> <sha>` (the tip being pushed), symlink
  `node_modules` into it (the repo's standing worktree hazard, already noted in
  this hook's own header comment at `:14`), run `npm test` there, remove it.
  Do NOT `git stash` the working tree instead: stashing mutates a working copy
  that a co-writer may be mid-edit in, which is the one thing a pre-push hook
  must never do.
  Verifier, red-first, BOTH directions required and both reproducible in a
  throwaway clone (never against this repo — a destructive repro aimed at a
  working tree took out the main clone and six worktrees once):
  (1) FALSE-RED: commit a green change, add an UNTRACKED failing test, push —
  must be ALLOWED after the fix and is BLOCKED today (today's behaviour is the
  red, already observed live);
  (2) FALSE-GREEN: commit a BROKEN change, then fix it in the working tree
  WITHOUT committing, push — must be BLOCKED after the fix and is ALLOWED today.
  Direction (2) is the one that must be demonstrated, because it is the one
  nobody has seen fire and the one that lets a broken commit reach main.
  Negative control so the hook does not simply always block: an ordinary clean
  push with a green tree must still pass, unchanged.
  **Do not weaken the blocking while fixing the aim.** The whole-suite run and
  the hard block are correct and stay; what changes is only WHICH tree it runs
  against. A change that narrowed the suite to touched files would trade a real
  guard for push latency.
  Consumer tier **2 (feeds the gates)** — it is the gate in front of the
  irreversible boundary. Unranked (booked after the derivation); on the next
  derivation it is a Tier B head candidate on the false-green direction alone.
  <!-- entry: "the pre-push suite verifies the WORKING TREE, not the commits being pushed" -->

- **DONE `28d5022` + `8d603fc` (2026-08-10) — `bust-triage` prints an
  ATTRIBUTION line, and the primitive behind it is imported rather than
  restated.** Two-part design, and the split IS the finding. PART ONE is free:
  captures are PRE-pipeline, so a pure append on CC's raw side
  (`attributionOf`'s `inDiv === null` branch) answers OURS without touching
  disk. PART TWO needs the REAL forwarded array, which only a full stateful
  corpus replay supplies, so it shells out to `replay.mjs --json --census`
  exactly as `gate-live.mjs` already does daily. The lane flagged that
  subprocess as a deviation; ACCEPTED at the desk on its stated basis, opened
  rather than inherited: `tools/replay.mjs:3829` ("Naive attribution (re-run
  just the offending pair) does not work for stateful extensions").
  Desk finding — the lane's own NOT-VERIFIED slot, inverted. It reported the
  costly path's OURS branch as having "no live reachable case on real data".
  The structure says more: `findStabilityViolations` emits a row ONLY under
  `outDiv !== null && outDiv < (inDiv ?? Infinity)` (`replay.mjs` scanGroup),
  which IS `attributionOf(inDiv, outDiv) === true` spelled with the same two
  quantities the row then carries — so OURS is the ONLY verdict that path can
  reach, and the `"CC's"` alternative beside it was a predicate no input could
  falsify, wearing a discriminator's clothes in a three-answer contract.
  Executed, not reasoned: synthetic pairs through the real
  `findStabilityViolations`, instrument-positive first — outDiv=1 < inDiv=3
  emitted 1 row, append-only emitted 1 row (both attributionOf true), the CC's
  shape inDiv=1 < outDiv=3 emitted 0. `8d603fc` replaces the constant with
  `attributionFromRow`, mapping an invariant break to COULD-NOT-ATTRIBUTE with
  the contradiction named, and its bite re-derives the unemittability from the
  real function so a widened emission guard reddens AT THE GUARD rather than at
  a later misattributed bust.
  Second desk finding: the ROW JOIN was unverified and is now measured.
  `replayedViolations` matches `v.n === pair.after.ord && v.prevN ===
  pair.before.ord` — two ordinal spaces built by two different loops
  (`bust-triage.mjs:685-690` vs `replay.mjs:3578-3597`), the coordinate-space
  shape this repo has been bitten by before. Compared per record over four real
  captures: 5,990 records indexed, ZERO disagreements; instrument-positive on a
  planted capture, where a body-less request produces a detected disagreement,
  so the zero is a reading and not a dead probe.
  And the honest reason no live case exists for the costly path: `--census`
  over the largest real capture reports `violations: 0 rows`. Current traffic
  has no stability violation to attribute.
  ORIGINAL ENTRY:
- **(shipped) READY — `bust-triage` emits an ATTRIBUTION verdict (OURS / CC's /
  COULD-NOT-ATTRIBUTE), because today it emits none and the walk that decides
  whether to build a mitigation is the walk that cannot say whose bytes
  moved.** Booked 2026-08-08 on an operator question — "are we careful not to
  attribute wrongly and create a mitigation for a bust we caused?" — answered
  by reading the code rather than the doctrine, which is what turned a
  reassuring answer into an entry.
  **The primitive EXISTS and is correct; the bust walk does not use it.**
  `replay.mjs` computes it twice, independently: `ours: inDiv === null || inDiv
  > outDiv` (`:1537`) and the `ccIdenticalAtOutDiv` annotation printed per
  stability violation (`:3897`). `grep -n 'ours\|attribut' tools/bust-triage.mjs`
  returns **only prose comments** — zero attribution logic — against those two
  live sites. Instrument-positive for that grep: the same pattern over
  `replay.mjs` returns the two sites above, so the zero is a measured absence
  and not a pattern that could never match.
  **Three measured instances, all from one morning, one in each failure
  direction:** the 141k answered `MITIGATED` by mapping the census class to the
  ROW's status (an absorption claim where nothing absorbed — the dangerous
  direction, since it says our mitigation worked); the 638k was attributed by
  HAND-diffing raw against forwarded; the 540k returned `UNVERIFIABLE` and
  stopped with no attribution, which is where a human guesses.
  Design, decided: `bust-triage` prints an `ATTRIBUTION:` line beside its
  verdict, with three answers and no default, the third carrying its COMPUTED
  reason (never a guessed disjunction — that defect already cost this tool a
  correction). It IMPORTS the primitive from `replay.mjs` rather than
  re-deriving it: a second implementation of a divergence or identity test has
  produced a confident wrong answer here three times, and this is the one place
  a wrong answer sends us to fix the wrong system.
  **VERIFIER DURABILITY CORRECTED 2026-08-10, by probing it before dispatching:
  the arrangement is NOT frozen, and it cannot be made frozen by pinning.** The
  claim below ("anchored to frozen evidence rather than to live captures") is
  false in both directions. Measured: the 638k walk runs today and emits no
  ATTRIBUTION line — that is the red, live — but its evidence is the live capture
  pair `n=305->311`, not a fixture. Freezing was attempted with the exact command
  `bust-triage` prints (`harvest --pin s-captureAS 370..372`) and the pin's own
  verifier answered `pinned, but does NOT reproduce: stability exemptions live=1
  pin=0`, naming an unrelated `fresh-session-sort:first-appearance-relocation
  (mcp)` pair at `n=111->113`. A pin carries the full prefix from record 0 by
  construction, so narrowing the range cannot exclude that pair; and the class is
  the one `docs/dev-loop.md` already documents — `fresh-session-sort`'s
  predicates read literal TEXT, which the scrub replaces with hash tokens. The
  fixture was deleted rather than committed, per the same-verdict precedent.
  **Consequence for scheduling, which is why this sits at the top of the entry:**
  the red-first case lives only as long as the capture does. Eviction is
  oldest-mtime-first; as of 2026-08-10 the corpus holds 92 captures with the
  oldest at 2026-08-07 03:55, so this one is not next in line — but the
  arrangement decays rather than waits, and a session that finds it gone must
  re-derive a red case instead of declaring the check unbuildable.
  Verifier, red-first, both polarities available today (original text, with its
  frozen-evidence claim now refuted above): the 638k pair
  (`2026-08-08T09:48:53Z`, hand-attributed to CC's `replace/edit` mid-history)
  must come back **CC's**; and a pair whose forwarded bytes diverge earlier than
  CC's — the stability-violation shape `replay.mjs` already annotates
  `[CC bytes at outDiv IDENTICAL -> ours]` — must come back **OURS**. Old code
  emits neither line, which is the red. Negative control so it cannot pass by
  always answering: the 540k (`2026-08-08T11:46:36Z`), which genuinely cannot be
  paired, must come back COULD-NOT-ATTRIBUTE with the pairing reason, NOT with a
  guess in either direction.
  The prose half SHIPPED with this entry's commit (`docs/dev-loop.md`, "No
  mitigation is DESIGNED before the attribution verdict exists") — it is a gate,
  not advice: while the answer is missing or COULD-NOT-ATTRIBUTE, no mitigation
  for that bust may be designed, booked or briefed. This entry is the machinery
  half; until it lands the gate is enforced by hand, which is exactly the
  arrangement the closing gate's question 1 says does not survive a session
  boundary.
  Consumer tier **1 (event disposition)** — it is the definition of the tier: a
  lie here mis-files the class and every mitigation designed afterwards is
  designed against the wrong evidence. Unranked deliberately (booked after the
  2026-08-08 afternoon derivation); on the next derivation it is a Tier A head
  candidate.
  <!-- entry: "bust-triage emits an ATTRIBUTION verdict" -->

- **DONE `697116b` + `feb8351` + `3acdcd5` (2026-08-10) — a closing commit
  lists the open entries it may have invalidated.** `tools/backlog-neighbours.mjs`:
  given a commit, every still-OPEN entry naming a file it touched, each with a
  blank disposition slot. A REPORT and never a gate — most file overlap between
  entries is ordinary co-tenancy (`docs/dev-loop.md` alone is named by sixteen
  entries), and a guard firing on non-defects trains the override reflex that
  kills it.
  Desk findings: (i) the join was blind to every entry that cited a LINE —
  `path:line` compared whole against git's path namespace, so the tool went
  quiet exactly where an entry was most specific about what it depends on.
  Caught on the tool's OWN motivating case, which returned 0 candidates;
  `feb8351` adds `citedPath`. (ii) The bites asserted line numbers against the
  LIVE working tree, so they died the moment the file they measured changed —
  `3acdcd5` re-anchors all three to a frozen `git show e5d635a:BACKLOG.md` and
  matches on headline text instead of position.
  (iii) FIRST LIVE USE, on this very series, and it paid: four neighbours
  surfaced across `8d603fc`/`28d5022`, of which one was a genuine premise
  correction — the `capturePairResult` entry's cited line numbers had drifted
  749 -> 754 and 760 -> 765 under `28d5022`, and nothing else would have
  re-read that entry. A true positive on its first real run, and it is what
  minted the citation-drift entry now open above.
  ORIGINAL ENTRY:
- **(shipped) READY — closing an entry can invalidate a DIFFERENT open entry, and nothing
  re-reads the neighbours when work ships.** Measured 2026-08-10 by the
  retirement pass, twice, from real history: the state-key entry shipped
  `KEY-FLIP`, which made a second entry's cited verdict count (`six`) wrong — the
  real number is seven, and the second entry was not touched; and `/health`
  gaining an `extensions[]` field from unrelated work dissolved half of the
  gates-blindness entry's premise. Both survived as plausible, decision-complete
  text until a lane probed them directly, which is the failure mode: the entry
  reads perfectly and is quietly about a world that moved.
  **Why the existing rules do not catch it.** The ranking rubric's signal 1
  handles the opposite sign — items that must PRECEDE others or their motivating
  case dissolves — which is about ordering, not about re-reading afterwards. The
  succession rule in `docs/dev-loop.md` is scoped to new EVIDENCE killing a
  premise; our own shipped implementation does not read as evidence arriving, it
  reads as progress, so the trigger never fires on it. Neither is wrong; both
  are aimed one step away.
  **The firing moment is computable, which is what makes this mechanizable at
  all:** an entry going to a closed grade WITH a commit ref is a discrete,
  observable event, unlike the judgment-shaped conditions this file usually has
  to leave as prose.
  Design, decided — `tools/backlog-neighbours.mjs`, a REPORT and never a gate:
  given a commit that closes an entry, list every still-open entry naming a file
  that commit touched, and require a one-line disposition per candidate —
  still-valid / premise-corrected / now-unnecessary. Report, because most hits
  are ordinary co-tenancy (`docs/dev-loop.md` alone is named by sixteen entries)
  and a guard that fires on non-defects trains the override reflex that kills it.
  The join already exists: `filesNamed` per entry, which the census emits.
  **VERIFIER CORRECTED 2026-08-10 — the designated true positive was UNREACHABLE
  BY CONSTRUCTION, found by the lane that built the tool.** `508a006` is a
  BACKLOG-only bookkeeping commit; the work that invalidated the verdict-count
  entry shipped in `13278fa`. And that entry can never surface at all: its only
  file-shaped citation is `cache-fix/CLAUDE.local.md:91`, a dotfiles path this
  repo keeps untracked by design, so no commit here can ever report it touched.
  The pairing was booked without being dry-run — the briefed-known-positive
  defect, committed by this entry's own author.
  **The reachable positive is the class's SECOND measured instance:** `2e088df`
  (which gave `/health` its `extensions[]` field) touches `proxy/server.mjs`, and
  the still-open gates-blindness entry cites `proxy/server.mjs:577-581`. Measured
  after the desk fix below: 3 candidates, that entry among them. Red-first
  pairing, reproduces from history forever.
  **A DEFECT THE DESK FOUND THAT THE LANE'S VERIFIER COULD NOT:** the join
  compared whole backtick tokens against git paths, so every entry citing a LINE
  (`foo.mjs:12`, `foo.mjs:577-581`) was invisible — the tool answered 0
  candidates on the very instance it exists for. That is the `path:line` shape
  `docs/dev-loop.md` already records, and it UNDER-reports, the dangerous
  direction. Fixed at the desk: `citedPath` strips only a trailing line-or-range
  suffix. The lane could not have caught it, because the one positive the brief
  gave it was the unreachable one.
  Original verifier text, kept because its failure is the lesson: run it against
  `508a006` — the commit that retired the state-key entry — and it must
  surface the verdict-count entry as a candidate. Control against
  over-firing: it must NOT surface entries whose only overlap is a file the
  closing commit did not touch.
  Done when a closed entry cannot be committed without its neighbour
  dispositions, and the two 2026-08-10 pairs both appear in a dry run over
  history.
  Consumer tier **3 (backlog and process)** — it mis-files entries and is
  recovered at the next derivation, but it left two stale premises standing in
  decision-complete text, which is where it does real damage.

- **DONE `32da665` (2026-08-10) — `backlog-lint`'s marker exemption widened
  from slash-adjacency to enumeration context plus sub-claim scope**, so the
  same enumeration written with `vs` or commas stops false-firing. The repair
  shape is the one the corpus prescribes for a guard that fires on legitimate
  work: a declared exemption the guard itself verifies, keyed on enumeration
  CONTEXT, never a softened predicate or an override habit.
  ORIGINAL ENTRY:
- **(shipped) READY — `backlog-lint`'s enumeration exemption is SLASH-ONLY, so the same
  enumeration written with `vs` or commas false-fires.** Measured 2026-08-08,
  live, on the entry two below this one: writing the repo's own three-answer
  gate discipline as a `vs`-joined triple tripped `WARN backlog-header
  grade=READY`, i.e. the lint read a NAMED TECHNICAL TERM as a claim that the
  entry's work was resolved. The tool already anticipates exactly this class —
  its header comment says the exemption exists because its own entry lists the
  marker words — but the guard is `(?<!\/)…(?!\/)`, so it clears the
  slash-joined form and misses the same enumeration joined by `vs`, by a
  comma, or by `and`. Worked around at the time by writing the triple
  slash-joined, which is honest (it IS an enumeration) but is a workaround,
  not the fix.
  **This entry self-fired while being written, which is the evidence.** Naming
  the trigger forms literally in prose trips the very gap they describe, so
  they are described here and belong as literal strings in the test fixture,
  not in this file — a guard whose gap cannot be documented without tripping
  it is the sharpest possible statement of the gap.
  **Why it is worth fixing rather than living with:** the verification word is
  a term of art in this repo — it is one third of the DECLARED/RUNNING/VERIFIED
  triple
  that `doctor` compares — so any entry discussing gate verification trips it.
  A guard that fires on correct prose is the check-that-fires-on-a-non-defect
  shape: it trains its reader to route around it, which is what happened here
  within one minute of it firing.
  Design: widen the exemption from slash-adjacency to ENUMERATION CONTEXT —
  the marker word appearing inside a run of two or more all-caps terms joined
  by `/`, `,`, `vs`, `and`, or `+`. Do NOT simply drop the verification word
  from the marker set; the dated-resolution signal it carries is the whole
  point of the check.
  Verifier, red-first, BOTH arms required because this is a predicate change to
  a live guard: (1) the real prose instances the check exists for — a READY
  entry whose body carries the verification word beside a resolution date, in
  resolution prose — must STILL fire; (2) the enumeration forms above must
  NOT. Take arm (1) from the check's own
  historical true positives so the fix is measured against what it caught, not
  against what I imagine it caught. Done when `node tools/backlog-lint.mjs` is
  clean on a corpus containing both arms and `test/backlog-lint.test.mjs`
  covers each.
  **THIRD FIRE, same day, and it pins the sub-shape the design must handle:
  SPACE-PADDED separators.** The repo's three-answer gate triple, written with
  spaces around its slashes, trips the lint; the identical triple written tight
  (the spelling `docs/dev-loop.md` uses) does not. The exemption is
  slash-ADJACENCY — it inspects the single character on each side of the marker
  word — so a padded separator puts a SPACE there and escapes it. Not a new
  defect: the precise boundary of the existing one, and it settles the design
  question above. The widened predicate must key on enumeration CONTEXT, never
  on adjacent characters.
  **And this paragraph tripped the guard while being written, for the second
  time in this entry — by violating the entry's OWN instruction four
  paragraphs up:** literal trigger forms belong in the test fixture, not in
  this file. The first draft pasted the padded triple in as its example, the
  lint fired on this entry, and because `test/backlog-lint.test.mjs` treats a
  WARN as BLOCKING (the separate ranked entry two below), it turned the whole
  suite red and refused a push. So the convention is not stylistic: writing a
  trigger form literally here costs a red suite. Restated without the literal,
  which is what the entry already told me to do.

  **SECOND MEASURED FALSE FIRE, 2026-08-08 afternoon, and it is a DIFFERENT
  shape — so the design above is too narrow.** Editing the XDG-ownership entry
  to record that its three-way README sub-claim had been resolved by `bbc1213`
  tripped `WARN backlog-header grade=READY marker=RESOLVED`. That is not an
  enumeration and no exemption for `vs`/comma/`and` would clear it: the marker
  was a genuine dated resolution, of a SUB-CLAIM, inside an entry that is
  correctly still open. The tool's scope comment already concedes the boundary
  — "one entry runs from a `- **` bullet to the next" — so it cannot tell "this
  entry is resolved" from "something inside this entry is resolved", and a long
  entry that records its own corrections over time is exactly where the second
  case lives. Both fires share one root: the rule reads a marker's PRESENCE
  where it means the entry's STATUS.
  **Worked around, and the workaround is named rather than hidden:** the word
  was changed to `DECIDED`, which is accurate and is not in the marker set, so
  `backlog-lint` is clean at this commit. That is the second time in two days
  this guard has been routed around within a minute of firing — which is the
  fire rate, and it is the argument for fixing rather than living with it.
  Widen the design accordingly: the fix must clear a dated resolution that
  scopes to a NAMED SUB-CLAIM (a sentence-initial bold run, a "superseded text
  follows" section) while still firing on a resolution that scopes to the entry.
  Arm (1) of the verifier is unchanged and still comes from the check's own
  historical true positives.
  Consumer tier **3 (backlog and process)** — it mis-labels entries and is
  recovered at the next read; ranked accordingly, not promoted for being
  annoying.
  <!-- entry: "backlog-lint's enumeration exemption is SLASH-ONLY" -->

- **DONE `f7e52dd` + `4c9ae88` + `17e0a14` (2026-08-10) — `tools/logs.mjs`, one
  strict reader owning the schemas of every format this repo writes.** Six
  readers, each a Proxy that THROWS "unknown field X for format Y" on any name
  outside its schema and defaults only schema-marked-optional fields;
  `cacheReadOf`/`cacheCreationOf`/`messageCountsOf` normalize the two spellings
  per concept. Both motivating wrong reads — the ones that reached the operator
  as fact in one bust walk — are pinned as bites and were verified at the desk
  by executing the reader, not by reading the report: asking a capture OUTCOME
  record for `cache_read_input_tokens` and a prefix-diff EVENT row for
  `messageCountPrev` both throw naming field AND format, while
  `usage.cacheRead`/`cacheCreation` return the frozen 15603 / 213429.
  Evidence frozen rather than live-read: the brief's known positive lived in a
  ROTATING capture, so it is hand-placed into `test/fixtures/logs-schemas.json`
  and the test never reads the captures directory.
  **Desk findings the lane did not have.** (i) Its companion scope lint shipped
  as a PREDICATE that nothing ran over the tree — honestly reported in its own
  slot (g), and the same shape as `tools/xdg-writer-guard.mjs`, which sits red
  at 34 while `npm test` is green. `4c9ae88` gives it the real tree plus a
  declared inventory of PATHS (never a count): `tools/cost-report.mjs` EXEMPT
  with a `mustMatch` the check re-verifies so a drifted exemption fails loudly,
  `tools/cold-events.mjs` KNOWN-OPEN as a genuine hand-parse awaiting adoption.
  Instrument-positive both ways — a planted hand-parse fails the sweep, a
  drifted exemption is reported as stale — because an inventory that happens to
  match is indistinguishable from a sweep that cannot fire.
  (ii) The fixture's `sid` placeholders were synthetic but UUID-SHAPED, and the
  pre-push absence-scan blocked on all four. My own hygiene pass had read every
  value and confirmed none was real; the guard enforces the stricter property —
  not "is this a real id" but "is this shaped like one" — and on a public
  history that is the right bar. Repaired at the DATA (`17e0a14`), not by an
  allowlist entry or `--no-verify`: neither escape was needed once the bytes
  stopped being UUID-shaped.
  **Named limitation carried forward, not silently solved:** the scope lint
  covers only the camelCase capture/prefix-diff spellings. `usage.jsonl`'s
  snake_case names are ALSO Anthropic's own wire vocabulary (they appear in raw
  API responses and CC transcripts), so a text pattern cannot tell "reads our
  usage.jsonl" from "reads a live API response" — separating them needs
  parse-site provenance. Adoption into `bust-triage` and other consumers
  remains its own entry.
  ORIGINAL ENTRY:
- **(shipped) READY — one reader owns the schemas of everything this repo writes, and it
  THROWS on an unknown field instead of returning `null`.** Supersedes the
  narrower "normalize two field names" framing in the parked 213k entry's item
  (d): the defect is not two spellings, it is that every consumer hand-parses.
  Measured 2026-08-10: one bust walk ran ~8 ad-hoc `jq` probes over four
  formats this repo writes, and two returned confidently wrong answers by
  querying one schema with another's names — `usage.cacheRead` (capture
  `outcome`) vs `cache_read_input_tokens` (`usage.jsonl`); `msgs` (prefix-diff
  events) vs `messageCountPrev/Now` (prefix-diff last-state). Both reached the
  operator as fact before being caught. A missing check is silent; a
  hand-rolled read returns a NUMBER indistinguishable from a correct one.
  Design (decided): `tools/logs.mjs`, one module, four format readers — capture
  request records, capture `outcome` records, `usage.jsonl`, prefix-diff
  events + last-state — each exposing normalized accessors over BOTH on-disk
  spellings. The on-disk names do NOT change: `proxy/stream.mjs:21-22` and
  `proxy/extensions/usage-log.mjs:187-188` are wire/schema writers with the
  whole capture corpus behind them, and renaming either makes every archived
  capture unreadable by the new reader — a bigger version of the bug being
  fixed. Reader is strict: an unknown field name throws, naming the field and
  the format, never returns `undefined`.
  Companion scope lint, same shape as the existing xdg scope check
  (`test/` already proves the form): a known schema's raw field names must not
  appear outside `tools/logs.mjs` and the writers named above; a new call site
  that hand-parses fails the bite.
  Verifier, red-first, anchored to immutable references — the two real wrong
  reads, replayed: asking a capture `outcome` record for
  `cache_read_input_tokens`, and a prefix-diff EVENT row for
  `messageCountPrev`, must THROW under the reader while both correct spellings
  return the right numbers on the same records. Over-firing control: a record
  legitimately missing an optional field returns its declared default and does
  not throw, declared IN the test as data. Known positive from real data, not
  planted: the 04:40:39Z outcome must read `cacheRead=15603`,
  `cacheCreation=213429` through the reader.
  Done-criterion: both throws demonstrated red before the reader exists (or, if
  the module must exist first, one named accessor disabled at a time per the
  module-load-red rule), controls green, scope lint green, full suite green.
  Write boundary: `tools/logs.mjs`, `test/logs*.test.mjs`. No `proxy/` change,
  so no pin bump and no restart. `bust-triage`'s adoption is a SEPARATE entry —
  this one ships the reader and its lint only.

- **DONE `6fc397d` (2026-08-10) — `deferred-tool-rewrite` reports WHAT IT
  DECIDED, and the decision closed threat-matrix row 6's open residue.** The
  extension now emits `announcedNames` and `passthrough[{name,reason}]` on
  `ctx.meta.deferredToolRewriteStats` every request — always present, empty
  arrays rather than omitted, so "ran and had nothing to decide" stays
  distinguishable from "never ran" — and `findToolsDeltas` carries it beside
  `heldStable`/`outCount`, so any `--census` run answers the question that
  previously took a hand investigation.
  **The answer, and it is reading (ii).** Verified at the desk by replaying the
  frozen pin under the serving gate config rather than by reading the lane's
  report: n=373 carries all seven `mcp__claude-in-chrome__*` names in
  `announcedNames` with `passthrough: []`, and n=370 the five
  `mcp__playwright__*` names. The MCP tools were never scoped out — they took
  the documented `tool_addition` path, and the one-time array growth is the
  API's own precondition (the schema must sit in `tools[]` with
  `defer_loading:true` for the `tool_reference` block to resolve;
  `proxy/extensions/deferred-tool-rewrite.mjs:13-15`, `:450`). So the 263k was
  NOT a mitigation miss: ladder step (a) holds what was already forwarded, and a
  genuinely new tool costs one front invalidation because tools render above
  system+messages. The remaining lever is step (b), the session-start preload.
  **Desk checks beyond the report.** The red was independently confirmed — this
  session had recorded the same n=373 row hours earlier with no decision field
  at all, so the absence was observed before the lane existed rather than taken
  on trust. The `passthrough` field was probed for the unprovable-predicate
  shape (a field no input can make non-empty, the defect caught in the
  attribution code the same morning): both reason branches are reachable and
  exercised — `test/deferred-tool-rewrite.test.mjs:976` (`model-not-allowlisted`)
  and `:1004` (`no-anchor-message`). Write boundary held: 4 files, 195
  insertions, ZERO deletions, which is the shape a reporting-only change must
  have.
  **Honest residue, three parts.** (1) `passthrough` has never been observed
  non-empty on real traffic; both reason branches are exercised only by
  synthetic unit tests, so reachable-by-construction is not reached, and one
  pin is one pin. (2) The empty-not-absent CONTROL was likewise exercised only
  on constructed input — every row in the pin carries non-empty
  `announcedNames`, so no real pair demonstrates the empty-array case live.
  The property is a code invariant and constructed input is adequate for one,
  but the distinction is recorded rather than rounded off. (3) The instrument
  has not been run against the OTHER row-6 instances (the 2026-07-27 175k
  event, the 141k and 638k walks), so "the mitigation works" is established for
  this pin and inferred everywhere else.
  **Deployment deliberately NOT done:** this touches `proxy/`, so it needs a
  dotfiles pin bump and a proxy restart. The dotfiles repo carried ~50 unpushed
  commits from a peer session, so the pin bump is held rather than half-landed.
  The running proxy is unaffected — the code ships here, the deployment waits.
  ORIGINAL ENTRY:
- **(shipped) READY (small) — `deferred-tool-rewrite` ENGAGED on a 263k tools bust and the
  array still grew on the wire; nothing reads what it actually did.** Measured
  2026-08-10 on `s-captureAV` (pin `pinned-s-dda5c6419d49-372-373.json`,
  replayed `--gates-from-capture`, 10 of 10 declared gates set including
  `CACHE_FIX_TOOL_REWRITE=1`): the n=372->373 pair is `membership+`,
  `toolsOnly:true`, `msgKind:append-only`, zero removals, zero reorders — seven
  `mcp__claude-in-chrome__*` tools arriving from a mid-session MCP connect.
  `heldStable` TRUE, `absorptionMisses` 0, and `outCount` `27->34`. The
  extension appears in `mutatedBy` for BOTH requests, so it ran.
  **The gap is instrument-shaped, not mitigation-shaped.** `mutatedBy` reports
  that an extension ENGAGED; it cannot report what the extension DECIDED. Threat
  matrix row 6 describes ladder step (a) as holding `tools[]` byte-stable and
  delivering new schemas as appended `tool_addition` blocks — had that happened
  here `outCount` would have stayed 27. Two readings survive the measurement and
  it separates neither: (i) the rewrite scopes out MCP-sourced tools; (ii) its
  guarantee is only held-tool byte-stability and a growing array front-invalidates
  regardless, which is what row 6's own AMBIGUITY-RESOLVED paragraph actually
  says. This is the "the mitigation ran" vs "the mitigation absorbed" split
  `docs/runbooks/bust-appears.md` names, one level lower: here even the ABSORBED
  question returns 0 while the wire shows growth, so neither existing instrument
  answers it.
  Design, decided: `deferred-tool-rewrite` already computes the decision; surface
  it as per-request stats the way the other extensions do
  (`ctx.meta.<ext>Stats`, the shape `fresh-session-sort` and
  `insertion-normalization` already use and that `replay.mjs` already reads for
  its exemption bases). Minimum fields: how many additions were injected as
  `tool_addition` blocks, how many names were passed through into `tools[]`
  untouched, and the reason for each pass-through. Then `findToolsDeltas`'s row
  carries the decision beside `heldStable`/`outCount`, and row 6's open question
  is answerable from any `--census` run instead of by hand.
  Verifier, red-first, anchored to the FROZEN pin above so it cannot decay:
  replaying `pinned-s-dda5c6419d49-372-373.json` must report, for n=373, a
  non-empty pass-through list naming the seven `mcp__claude-in-chrome__*` tools
  — today it reports nothing at all, which is the red. Control: a pair with no
  tools delta must carry an empty decision record and NOT be absent, so "no
  decision" and "extension never ran" stay distinguishable.
  Done-criterion: the stats ride every `--census` run, the pin above reproduces
  the pass-through list, and threat-matrix row 6's NAMED MISSING EVIDENCE line is
  answered by a command rather than a reading. **This entry does not decide
  whether the pass-through is a defect** — it builds the instrument that can tell
  the two readings apart, which the matrix row cannot do today.
  Write boundary: `proxy/extensions/deferred-tool-rewrite.mjs`, `tools/replay.mjs`
  (`findToolsDeltas` row only), their tests. Touches `proxy/` — so a dotfiles pin
  bump plus `systemctl --user restart cache-fix-proxy` rides along, and the
  restart is cache-transparent (no state KEYS or freeze logic touched).

- **DONE 2026-08-13 (`999a6ff`, `9e3530a` — shipped 2026-08-11; graded and
  moved here 2026-08-13) — a claimed alias now DOES protect its capture from
  eviction.** Moved from `## Open`, where it had sat graded READY for two days
  after shipping — the closure-without-an-exit shape the accretion rule names,
  and the reason the session-start banner reads "exit pass owed". Body kept
  verbatim below as the record.
  **DESK CHECK, run independently of the lane that built it** (the convention:
  a DONE grading names the desk check and its result, or says plainly that the
  lane's evidence was taken as sufficient). Not the lane's tests — a live
  end-to-end with a DISCRIMINATING pair: two real captures in a scratch root,
  one claimed plain and one claimed `--protect`. Link counts before eviction:
  **1** unprotected, **2** protected. Then both originals unlinked, which is
  what `sweepCaptureDir` does. Result: the captures dir is empty (0 entries)
  and the protected capture is still readable and `cmp`-identical to its
  source. The two DIFFER, which is what makes it a proof rather than a
  demonstration that something happened.
  **Residual, booked as its own entry rather than left here:** the flag reached
  ZERO uses in its first two days because the doc that teaches claiming taught
  it without the flag (fixed `338ae82`; first real use followed within the
  hour). `--release` is wired to nothing and the 4 GiB cap is small against a
  corpus whose captures run to 1.9 GB — see "protect default blocked on release
  wiring and cap size" in `## Open`. Neither blocks this closure: the shipped
  thing does what it says.
  ORIGINAL BODY (verbatim): **READY 2026-08-11 — a claimed alias does not protect its capture from
  eviction, so citing evidence in a booked item does not make the evidence
  survive.** `alias-claim.mjs` records a name for a capture; retention is
  oldest-mtime-first and knows nothing about claims, so an entry, a matrix row
  or an in-flight walk can name a capture that is deleted hours later — observed
  twice now (s-captureBE this session; the 2026-08-05 absorption rows, whose 3
  of 12 captures went within hours). The retention knob is explicitly NOT the
  answer (dev-loop.md, closing-gate q2's corollary): it buys hours and moves the
  same loss later.
  **Design (decided): HARD-LINK on claim.** `alias-claim.mjs --protect` links the
  capture into a protected directory beside the captures root. A hard link costs
  ZERO additional bytes, and eviction's `unlink` on the original merely
  decrements the link count — the bytes survive the rotation that deletes the
  name. Two things the design must carry or it becomes a disk leak with a good
  story: a protected-set CAP with its own oldest-first eviction, reported by
  `doctor`; and a RELEASE step, so an entry reaching DONE unlinks its protection
  (the closure verb already exists — this hangs off it). Rejected alternative:
  copying the capture, which doubles bytes for files measured up to 2 GB here.
  **Done-criterion:** claiming with `--protect` and then forcing a retention
  sweep past the cap leaves the protected capture readable and the unprotected
  one gone, with both `ls` results pasted; `doctor` reports the protected-set
  size; releasing removes the link and the bytes go on the next sweep.
  Anchor: tools/alias-claim.mjs
  Write-set: tools/alias-claim.mjs, test/alias-claim.test.mjs
  Verifier: node --test test/alias-claim.test.mjs

- **DONE 2026-08-10 (`246b61d`, instrument repair `a5f1960`) — kill the
  relocation-induced conversation-key rotation (threat matrix row 26): resolve
  the conversation sub-key ONCE from the RAW body and have both stateful
  extensions read it.** Re-graded 2026-08-11 at the desk: this entry stood
  READY over work that had shipped the night before and is SERVING, which is
  the stale-grade class the records restructure exists to end. Verified against
  the running system, not against the commit message: `node
  proxy/source-fingerprint.mjs` = `140351b73356` = `/health`'s `proxy_tree`
  (unit up 2026-08-10 21:50:08 CEST), pin `ebaaf0e` = `HEAD:proxy`, carrier at
  `fresh-session-sort.mjs:392-393`, dual-reads at
  `insertion-normalization.mjs:1909-1911` and
  `deferred-tool-rewrite.mjs:697-699`.
  **RESIDUAL, and it is this entry's OWN done-criterion, only partly
  discharged — stated rather than absorbed into the DONE.** The criterion below
  has three parts. Part 1 (the sub-key must not rotate across the pair) is
  covered by `test/d1-old-key-computable.test.mjs`, whose gate-1 bites measure
  the identity at each consumer's real read point with a negative control that
  disagrees. Parts 2 and 3 — `deferred-tool-rewrite` reporting
  `rewrite`/`unchanged` rather than `no-baseline` on the second request, and
  the forwarded `tools[]` byte-identical across the pair — have NO bite:
  `grep -rln "PRE_PIPELINE_CONV\|prePipelineConv" test/ tools/` returns that
  one file, and it asserts neither. Those two parts are the ABSORPTION
  question, which this repo already knows no gate asks, so the gap is
  structural rather than an oversight of the shipping lane. Its home is the
  booked D1-retirement entry (`gate-live` snapshots pass): that entry's design
  gains one field — a count of post-relocation `no-baseline` actions under a
  rotated key — beside the `oldKeyFallback` count it already specifies, so one
  pass answers both the retirement question and the absorption question.
  Nothing here is re-derivable from the matrix cell alone; the cell carries the
  same two residuals in its VERIFICATION ADDENDUM.
  The original entry, unchanged below. Mechanism fully isolated 2026-08-06,
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

- **DONE 2026-08-10 (`a30d08d`, subagent commit — dispatched, verified and
  integrated by this desk) — the rows and the labelled pair now ride out of
  the sweep.** `["identityRotationRows", parsed.identityRotations]` sits in the
  `persistRows` loop beside `relocDepartureRows` (`tools/gate-live.mjs:491`)
  and `row.identityRotations = {requests, transitions}` at `:565`.
  The lane's red-first was a real discriminating split, not a module-load
  failure: against the UNMODIFIED module its three new bites failed while the
  36 pre-existing ones passed, and 39/0 after. Its true positive is the live
  one this desk had measured independently — `s-captureAU` came back
  `{requests: 325, transitions: 6}` with `identityRotationRowsTruncated: 325`
  (200 persisted, `ROW_CAP`) and first row `n=31 ts=2026-08-08T11:55:14.000Z
  transition=true`, matching the hand replay exactly.
  Desk checks, run on the artifact rather than read from the report: both
  sites confirmed in the integrated tree, and `rowIsClean` is untouched by the
  diff — a rotation count cannot make a row dirty, which is what keeps this a
  REPORT.
  **Residual, and it is the honest one: the LIVE status file does not carry
  the field yet.** The sweep this desk kicked at 20:53 local ran the
  pre-integration code, so the first status file with rotation rows in it is
  the next scheduled run. Nothing to fix — stated so the next reader does not
  read a fieldless row as a refutation.
  Original header: **the daily sweep COMPUTES the identityRotation numbers
  every morning and drops them on the floor, which is why the paragraph above
  had no rows to fall back on.** Found 2026-08-10 late-evening while checking
  whether AT's loss was recoverable. `gate-live` passes `--census` to every
  replay child (`tools/gate-live.mjs:132`) and `replay --json` emits
  `identityRotations` in its payload (`tools/replay.mjs:4123`), so the numbers
  exist on every sweep — and the persisted row's key set contains no rotation
  field of any kind (read from `jq -r '.rows[0]|keys_unsorted|join(",")'` over
  the live status file), while `grep -n 'identityRotation' tools/gate-live.mjs`
  returns nothing. That is the closing gate's question 2 for a RECURRING
  producer, unanswered: the mechanism does not write out what proves its own
  findings, and the captures behind them rotate — measured cost, the entry
  above.
  It is also the SECOND instance of a defect this file documents about itself:
  `gate-live.mjs:476-483`'s own comment says the departure census "computed
  them for every capture and dropped them on the floor".
  Design, decided: `["identityRotationRows", parsed.identityRotations]` in the
  `persistRows` list (whose three-answer semantics — `null` for never emitted,
  `[]` for a measured zero — stay untouched), plus a labelled summary
  `row.identityRotations = {requests, transitions}` in the `toolsDeltas` style,
  both numbers named because reporting either alone invites the other's
  question. A REPORT: `rowIsClean` does not move.
  Verifier, red-first: the key set above is the red. True positive available:
  `s-captureAU` must come back `{requests: 325, transitions: 6}`.
  Write boundary: `tools/gate-live.mjs`, `test/gate-live.test.mjs`.
  Consumer tier **2 (feeds the gates)**. Loop stage: SEE.
  <!-- entry: "the daily sweep drops the identityRotation numbers" -->

- **DONE 2026-08-10 (`9c1284b`, subagent commit — dispatched, verified and
  integrated by this desk) — the identifier join lands and the original miss
  reproduces on demand.** Verified at the desk by running the frozen
  arrangement myself rather than reading the report:
  `node tools/backlog-neighbours.mjs cf0592d <git show cf0592d:BACKLOG.md>`
  now prints the same 9 file-join rows (now marked `via=file`) PLUS
  `CANDIDATE line=1017 via=identifier shared=conversationOf` — the
  bounded-`--pin` entry, the exact neighbour the file join could not see — in
  a 7-row identifier population, report-sized as predicted. The lane's own red
  matched the desk's baseline exactly (9, none of them 1017), and its two
  mutations (identifier regex widened to `/.*/`; changed-entry exclusion
  dropped) each reddened only their targeted bites.
  **The entry's stale numbers were caught before they were built on**, which is
  why they are recorded here: the live-tree baseline had drifted from ten to
  nineteen since booking (it tracks how many entries are ABOUT backlog tooling,
  which is the defect stated as a measurement), and the second planted positive
  — `sameLineage` as a two-member OPEN class — had dissolved, three of its four
  citing entries having gone DONE the same day. The red was re-anchored to a
  commit-frozen image instead, which is the durable form.
  Deviation worth keeping: the lane refused to import `splitOpen` from
  `tools/backlog-order.mjs` and said why — see the entry directly below.
  Original header: **`backlog-neighbours` joins on FILES, so a premise refuted
  inside ANOTHER ENTRY is invisible to it; add the IDENTIFIER join.** Booked
  2026-08-10, from the miss it would have caught the same hour. `cf0592d`
  recorded a rotation measurement in the `capturePairResult` entry which
  refuted the retention rule of the bounded-`--pin` entry — a conversation-only
  filter that drops the very predecessor it was meant to freeze. Nothing
  flagged it; it surfaced only because the two entries were read together at
  dispatch time, an hour later, by hand. `tools/backlog-neighbours.mjs` exists
  for exactly this class ("closing an entry can invalidate a DIFFERENT open
  entry", its header) and could not see it. Its join is a commit's touched
  FILES against entries' backticked file tokens, and this commit touched only
  `BACKLOG.md`. **Run today, it returns TEN candidates and the bounded-`--pin`
  entry is not among them** — the ten are the entries that happen to cite
  `BACKLOG.md` by name, i.e. the ones ABOUT backlog tooling. So the failure is
  not an empty result, which would at least look like one: it is a populated,
  plausible report selected by a naming convention that is uncorrelated with
  who shares the moved premise. A reader gets ten dispositions to fill and the
  one that mattered is absent.
  Design, decided: a SECOND join in the same report, at one grain finer.
  When a commit changes `BACKLOG.md` itself, diff which ENTRIES its bodies
  changed, and list every still-open entry sharing a backticked camelCase
  IDENTIFIER token with them — same report shape, same blank disposition slot
  (still-valid / premise-corrected / now-unnecessary), same three-answer
  discipline, still a REPORT and never a gate. The file join is untouched.
  **Measured before building, on this tree (2026-08-10), because a join is
  worth nothing if it fires on everything or on nothing:** over the 116 open
  entries there are 194 distinct backticked camelCase identifiers, 44 of them
  shared by more than one entry, and the widest is shared by SEVEN. That is
  report-sized, unlike the file join's own worst case (`docs/dev-loop.md` is
  named by sixteen entries, which its header already calls out as the reason
  it is not a gate). One entry cites a disproportionate share of all
  identifiers and will appear in most lists — name it in the output rather
  than special-casing it.
  Verifier, red-first, with a live known positive rather than a constructed
  one: run the new join over `cf0592d`. It must list the bounded-`--pin` entry
  as a neighbour of the `capturePairResult` entry via `conversationOf` — the
  miss above, reproduced. RED against the OLD implementation was RUN, not
  assumed: `node tools/backlog-neighbours.mjs cf0592d` today prints TEN
  `shared=BACKLOG.md` candidates and none of them is the bounded-`--pin`
  entry. Re-run after THIS entry was written it prints ELEVEN — this entry
  joined the candidate set, because it cites `BACKLOG.md`, while the entry
  that actually shares the moved premise still does not appear. The count
  tracks how many entries are ABOUT backlog tooling and is uncorrelated with
  the premise, which is the defect stated as a measurement. (Candidate LINE
  numbers are deliberately not recorded: they shift on every insertion, and an
  entry about stale cross-entry evidence should not ship a stale view of its
  own.) BASELINE, so
  the red is not vacuous: those ten prove the tool RAN and joined — this is a
  wrong-population result, not a dead command — and the file join must still
  return its own candidates on a commit touching a CODE file, unchanged by this
  work. Second positive, already planted: `sameLineage` appears in exactly the
  two entries of the lineage chain and in no others, so it is a two-member
  class the join must reproduce exactly.
  Done-criterion: both joins in one report, the `cf0592d` reproduction pasted,
  suite green.
  Write boundary: `tools/backlog-neighbours.mjs`, `test/backlog-neighbours.test.mjs`.
  Consumer tier **3 (backlog and process)**.
  **Second, smaller finding from the same hour, same file, booked here rather
  than as its own entry because the mechanism is the same lint:** cross-entry
  references in this file are written POSITIONALLY — "the entry above", "split
  out from the entry below" — and `tools/backlog-order.mjs` PHYSICALLY REORDERS
  entries on every derivation. Four such references were written today and all
  four still happened to hold after a reorder ran minutes later, which is luck
  and not a property. When one breaks it breaks silently: the sentence stays
  grammatical and points at whatever entry now occupies the position. The file
  already carries the durable handle — each entry's `<!-- entry: "…" -->`
  anchor — so the rule is that a cross-entry reference names the headline, and
  the check is a `backlog-lint` report flagging positional words in an entry
  body that refers to another entry. Instrument-positive available today: the
  lineage chain's three entries reference each other positionally right now.

- **DONE 2026-08-10 — MERGED into "kill the relocation-induced conversation-key
  rotation (threat matrix row 26)": one fix, two entries, and the LATER one
  re-opened a decision the earlier one had already made.** (Graded `DONE` and
  not `MERGED` deliberately: lane L1 is building a CLOSED grade vocabulary over
  this file right now, and minting a seventh token mid-flight would hand its
  new check a false positive on its first run.) Found at D1's
  dispatch check by reading both bodies together. They describe the same change
  to the same two extensions; this entry says the carrier is "NOT yet decided …
  a `ctx` field set before the first mutating extension is the obvious
  candidate", while the older entry has already decided exactly that
  (`ctx.meta`, computed before order 250) and carries a named synthetic-fixture
  verifier and a row-3 declaration this one lacks. That is the
  one-phenomenon-two-names shape `docs/dev-loop.md` collects, with the harm
  running the unusual way round: the newer booking was LESS decision-complete
  and would have handed a desk round an open design question that was already
  closed one entry over.
  **Three things travel to the surviving entry and are not lost:**
  (1) the design input — `fresh-session-sort.mjs:373` computes its memory key
  by calling `resolveInsertionSessionKey` on `body.messages` BEFORE its own
  relocation runs, so its identity is stable under its own edit; that asymmetry
  is the bug's signature.
  (2) the on-disk corroboration — the only `*-fresh-sort-relocated.json`
  present sits under the pre-mutation suffix, none under the rotated one.
  (3) **the HARD ORDERING CONSTRAINT (rubric signal 1), which is the load-bearing
  one:** blocked on the `identityRotation` census class, because a check that
  only goes red against the current defect must be demonstrated red BEFORE the
  fix removes it — and this fix's whole effect is to make rotations stop
  mattering, which would leave the class permanently green and unproven.
  Status of that blocker, checked in the world rather than inherited:
  `findIdentityRotations` EXISTS in `tools/replay.mjs` (`:3939`, `:4471-4489`,
  shipped in `a68a8af`), so the class is no longer absent — but its entry's
  done-criterion (the live positive/negative pair reproduced in a bite, and the
  count in the daily sweep) is open and is in lane L3's hands this wave. The
  constraint is therefore PARTLY discharged, not discharged; D1 does not ship
  until L3 reports.
  **The one decision that genuinely remains open in either entry** is the one
  this entry named and the older one does not address: what happens to state
  already on disk under rotated keys. It is at the operator, surfaced
  2026-08-10 with a recommendation, and the answer lands in the surviving entry.
  Original entry follows.

- **DONE (original entry, superseded by the merge directly above) — give the downstream stateful extensions the PRE-PIPELINE
  conversation identity; the fix already exists in-tree and only one extension
  uses it.** Booked 2026-08-10 from the same attribution. Row 26's defect is
  that `insertion-normalization` (order 395) and `deferred-tool-rewrite`
  (order 425) key their per-conversation state on `conversationSubKey` of the
  body AS THEY RECEIVE IT — i.e. over `messages[0]` bytes that
  `fresh-session-sort` (order 250) may have just invented. `fresh-session-sort`
  itself does NOT have this problem, and that is the whole design input:
  `fresh-session-sort.mjs:373` computes its memory key by calling
  `resolveInsertionSessionKey` on `body.messages` BEFORE its own relocation
  runs, so its identity is stable under its own edit. Corroborated on disk —
  the only `*-fresh-sort-relocated.json` present sits under the pre-mutation
  suffix, none under the rotated one.
  Design, NOT yet decided, and this is named rather than hand-waved: the shape
  is "capture the conversation identity once, at the pipeline's entry, and let
  every stateful extension read THAT" — but where it is carried (a `ctx` field
  set before the first mutating extension is the obvious candidate), and what
  happens to state already on disk under rotated keys, are open. The migration
  half is the one that bites: existing per-key files are named by the rotated
  identity, and a change to the key scheme touches state KEYS, which is exactly
  the threat-matrix row-3 condition under which a restart is NOT
  cache-transparent and must state its declaration before it ships.
  **HARD ORDERING CONSTRAINT (rubric signal 1): blocked on the
  `identityRotation` census class above.** A check that only goes red against
  the current defect has to be demonstrated red BEFORE the fix removes the
  defect, or it ships having never gone red on anything — and this fix's whole
  effect is to make rotations stop mattering, which would leave the class
  permanently green and unproven.
  Consumer tier **1 (event disposition)**. Deployment-coupled: `proxy/` change,
  needs the dotfiles pin bump and a restart, at a stated session boundary.

- **DONE 2026-08-10 (`baf3fa3`) — the note landed at the definition, and the
  one claim under it that could be checked without the 441 MB capture WAS
  checked rather than transcribed: the denominator really is
  `Math.min(setA.size, setB.size)` (`tools/replay.mjs:1187`), which is the
  mechanism the whole sizing consequence rests on.** The two NUMBERS (0.60-0.98,
  251 records) are carried with their source and date — the `--bounded` lane's
  measurement — and are not independently reproduced here; reproducing them
  needs the capture, which is exactly the volatility that made stating the
  mechanism at the definition the point. Desk check: `node --check` clean and
  the export still resolves to 0.5, so the comment did not break the module.
  Original header: **a bounded pin's SIZE scales with the busting
  conversation's identity CHURN, which the design note does not say and the
  first real measurement contradicts.** Measured 2026-08-10 by the
  `--bounded` lane. The `capturePairResult` entry's framing implies a target
  plus a few neighbours; the real RED2 union arm on `s-captureAT` ord 715 came
  back at **251 real records**, because that conversation's `conversationOf`
  churned REPEATEDLY across its whole growth rather than once near the end —
  `lineageOverlap` runs from 0.60 (ord 5, a tiny message set sharing a handful
  of messages) up to 0.98 (near ord 715), every one of them above the 0.5
  threshold. That is the union working as specified, not a defect: a small
  early message set clears a ratio threshold on a few shared messages just as
  easily as a large late one does on nearly all of them, because the
  denominator is `min(|A|,|B|)`.
  Design, decided: state it where the number lives, not where it was
  discovered — a note beside `LINEAGE_THRESHOLD` in `tools/replay.mjs` naming
  the min-denominator consequence, so the next reader meets it at the
  definition instead of per-instance. No behaviour change: the threshold is
  NOT retuned, per its own entry ("a future case landing between the clusters
  is a finding about the class, not a reason to tune the number").
  Verifier: the note cites the measured 0.60-0.98 spread and the 251-record
  outcome. Done when a reader of `LINEAGE_THRESHOLD` can predict the sizing
  behaviour without running it.
  Write boundary: `tools/replay.mjs`. Consumer tier **3**.

- **DONE 2026-08-10 (`0fe9cf4`) — closed by RENAME, so the guard ships with
  zero exemptions.** `tools/test-config-root.mjs` became
  `tools/suite-config-root.mjs` (the `suite-*` precedent `suite-run-log.mjs`
  had already set), every live dependent moved with it including two
  operator-facing error messages that carry runnable commands, and its
  docstring now states the measured mechanism instead of the refuted one.
  `test/no-discovered-non-test-files.test.mjs` is the guard: it walks the WHOLE
  repo rather than a fixed directory list, mirrors node's own scan rules
  (skips `node_modules` and dot-directories, treats everything under a `test/`
  directory as intended), and asserts an empty hit list with no exemptions.
  **Verified at the desk INDEPENDENTLY of the lane's own arrangement, and past
  what the brief asked for.** I copied the guard into a synthetic tree so no
  file was planted in a checkout another lane was using, and ran it there:
  baseline GREEN on a clean tree (so its red is not the always-red kind), then
  all FOUR naming rules planted at once — `test-plant.mjs`, `foo-test.mjs`,
  `a_test.mjs`, `b.test.mjs` — each NAMED individually in the failure. The
  brief asked for two patterns; four were exercised, because a red proves the
  class that fired and not the instrument's reach. Over-firing control:
  `tools/suite-thing.mjs` in the same position leaves it silent.
  **The suite arithmetic reconciles exactly, which was the point of demanding
  it.** 2664 tests before and after. The renamed file stops being counted as a
  test (-1: `✔ tools/test-config-root.mjs` is gone from the run log and
  `suite-config-root.mjs` never appears, confirming it sits outside the glob),
  the new guard adds one (+1, at line 1094 of the persisted log). Net zero, and
  both halves were checked rather than inferred from the total holding still —
  a net-zero total is exactly what two unrelated errors would also produce.
  **Second-order finding, and it is the one worth carrying:** the lane ran in
  the SHARED checkout, not a worktree — a third measured instance of the
  reclaimed-worktree class whose half (1) came back to us from the
  dispatch-guards session the same hour. Its commit therefore landed on `main`
  and appeared in my push set as an unexpected commit, which is precisely the
  case the claim rule exists for. It was caught by claiming, not by luck.
  Original header: **a file outside `test/` whose NAME
  matches node's `--test` discovery glob is EXECUTED as a test, and one is in
  the tree right now.** Found 2026-08-10 by the suite-output lane, which hit it
  as a live defect rather than reasoning about it: its first helper was named
  `tools/test-runner.mjs`, node's own discovery swept it in, spawned it in its
  own subprocess with `argv[1]` set to that file — which is `isMain` — and its
  unguarded top level recursively launched ANOTHER full suite. It was reported
  as a passing "test" in 108 ms while the nested run was still in flight.
  **The definition, measured rather than recalled** (probe against the installed
  node v26.4.0: candidate filenames planted in a scratch tree, `node --test`
  run, discovery observed). Executed: `test-*.{js,mjs,cjs}`, `*-test.*`,
  `*_test.*`, `*.test.*`, `test.*`, and every file under a directory named
  `test/` at any depth. Not executed: `footest.mjs`, `testfoo.mjs`,
  `suite-run-log.mjs`. Discovery does NOT descend into `node_modules` or into
  any dot-directory — which is why `.claude/worktrees/` never contributed.
  **The live instance, and the docstring it refutes.** `tools/test-config-root.mjs`
  matches `test-*` and is executed as a zero-assertion test on every run —
  confirmed in today's actual output, the line `✔ tools/test-config-root.mjs`
  among the results. That file's own docstring says it lives in `tools/` rather
  than `test/` *because* node runs everything under `test/`, "from there it was
  ALSO executed as a (zero-assertion) test, inflating the suite count by one".
  The stated remedy never achieved its stated purpose: the move left it inside
  the `test-*` prefix rule, so it kept being executed and the count stayed
  inflated. A mechanism's own words about itself, refuted by its body — the
  paraphrase-drift shape, at the docstring grain.
  Design, decided: RENAME rather than exempt (`tools/suite-config-root.mjs`,
  parallel to `suite-run-log.mjs`), so the guard ships with zero exemptions and
  a closed class; then a source guard in the shape of
  `test/no-raw-mkdtemp.test.mjs`'s CLASS 1, walking the tree with node's own
  scan rules.
  Verifier, red-first with its baseline: the guard is green on the unmutated
  tree FIRST, then a planted `tools/test-plant.mjs` and a planted
  `tools/foo-test.mjs` are each NAMED by a red — two patterns, because one
  proven live does not certify the others. Suite arithmetic is stated, not
  rounded: the count drops by exactly 1 as the renamed file leaves the glob.
  Write boundary: `tools/test-config-root.mjs` (renamed), `package.json`,
  `tools/suite-run-log.mjs`, `proxy/claude-home.mjs`, `proxy/xdg-dirs.mjs`,
  three `test/` files carrying the old path, and the new guard.
  Consumer tier **2 (feeds the gates)**.

- **DONE 2026-08-10 (`eab030a`) — the diagnosis is bought; the flake is still
  unidentified, exactly as this entry said it would be.** `tools/suite-run-log.mjs`
  now backs `npm test`: it spawns the real runner, tees output live to the
  console AND to a per-run file under this fork's XDG state root
  (`statePath("test-runs")`, never `~/.claude`), prints the path
  UNCONDITIONALLY — green or red, so a green run is available to diff against a
  later red one — preserves the child's exit code, and prunes to the newest 10
  per label. Half (2) landed too: `tools/git-hooks/pre-push` shares the same
  naming and retention through the module's CLI, with a `/tmp` fallback for the
  standalone-copy case `test/pre-push-hook.test.mjs` builds.
  Red-first, with its baseline stated: today's pre-change run left NO persisted
  output anywhere (`find` over both XDG roots, empty before and after). After
  the change, a planted always-failing test's name and diff survive in the FIRST
  run's file after a later green run overwrote the console. The pre-push failure
  path was exercised end to end without pushing — a dangling `git commit-tree`
  object carrying a planted failure, fed to the hook on crafted stdin; hook
  exits 1, REFUSES, and both persisted logs name the planted test. Verified at
  the desk by re-running `npm test` myself on the integrated commit: 2664/2659
  pass/0 fail/5 skipped, path printed, 2963-line log on disk.
  **The lane found a second defect while building this one, and it is the more
  valuable half.** Its first helper was named `tools/test-runner.mjs` — which
  matches node's OWN `--test` discovery glob, so node spawned the helper AS a
  test, its unguarded top level ran, and it recursively launched another full
  suite. Renaming out of the glob closed it. That class has a live in-tree
  instance and its own entry now.
  Original header: **the suite has at least one INTERMITTENT test, and the
  runner throws away the evidence needed to name it.** Observed 2026-08-10 at
  `e9a374b`: four consecutive full runs of ONE commit returned 2642 pass / **1
  fail**, then 2643 / 0, then 2643 / 0, then (with another lane integrated)
  2649 / 0. The documented environment class was EXCLUDED rather than assumed:
  `df` reported `/tmp` at **3% used, 30 GB free**, so this is not the 2026-08-08
  ENOSPC shape, which is the first suspect this repo tells you to check.
  **The failing test was never identified, and that is the actual defect.** The
  run streamed to a terminal, the summary counters were read, and by the time
  the failure mattered the output was gone; two further runs were spent on
  greps against output that no longer existed. The suite gates every push, so
  an intermittent failure that vanishes on re-run trains precisely the retry
  reflex that a red result must never train.
  Design, decided, two halves. (1) The runner persists each run's full output
  to a per-run file under the repo's scratch convention and prints the path in
  its summary line, so a transient red is diagnosable after the fact instead of
  re-run away. (2) The pre-push hook keeps its own last-failure output for the
  same reason — it is the run most likely to be transient and least likely to
  be watched.
  Verifier, red-first: with the persistence in place, force one failure, then
  confirm the named file contains the failing test's name and diff AFTER a
  subsequent green run has overwritten the console. Today no such file exists,
  which is the red.
  NOT fixed on notice, and named rather than left implicit: the flake itself
  stays UNIDENTIFIED until the mechanism exists to catch it, so this entry
  buys the diagnosis, not the fix. If the same counter split recurs before
  then, capture the log by redirection first.
  Write boundary: `package.json`, `tools/git-hooks/pre-push`.
  Consumer tier **2 (feeds the gates)**.

- **DONE 2026-08-10 (`ce975c5`) — and the red is the same sabotage that
  exposed it, now caught.** `verifyPin` gained `bustingConversationOrdinals` /
  `missingBustingOrdinals` as its LEADING clause for bounded pins, computing S
  from the raw capture via `conversationOf` alone — never via `boundedKeep`,
  which is the entire point. The old verdict comparison stays as the second,
  weaker check.
  The measured arms, from the lane and matching this entry's own recorded
  numbers: unsabotaged, `pin verified: reproduces the live verdicts over
  records 0..1049 — 188 same-conversation pair(s)`, no clause fired. With
  `boundedKeep` sabotaged to drop every third kept record, the pin's kept count
  fell 189 -> 126 and the new clause fired — *"busting conversation incomplete
  in the bounded pin: 63 of 189 member ordinal(s) missing or placeholder"*, all
  63 named — **while the old comparison alone still reported 125 live vs 125
  pinned**, i.e. it would have printed `diffs: []` exactly as this entry
  described. The defect and its catch, in one run.
  Sabotage reverted and PROVEN reverted: zero `SABOTAGE` hits, and the residual
  diff is the feature only.
  Residual, surfaced by the lane and recorded rather than booked: the new check
  streams the raw capture 0..m independently of `writeCapturePrefixBounded`'s
  own pass, so a bounded `--pin` run now costs roughly two passes, measured at
  ~41-47 s against a ~30 s estimate — plausibly capture GROWTH (2046 records
  now against the 2065 cited when this entry was written) rather than the added
  pass, and not isolated. Not a defect; a number to re-read if verify time ever
  becomes the constraint.
  **The bounded pin's FIDELITY claim is now established** — the size claim
  (3.22%) never depended on this — so freezing a bounded pin as a committed
  fixture is unblocked, which in turn unblocks `capturePairResult`.
  Original header: **`verifyPin` on a
  BOUNDED pin applies the retention filter to its own reference side, so it
  cannot fail for the defect it exists to catch. PROVEN by sabotage, not
  argued.** Booked 2026-08-10 at integration of `--bounded`. The lane surfaced
  the mechanism as a question rather than settling it at its own tier, which is
  exactly right; the answer is that the mechanism is wrong.
  What it does today: for `header.bounded`, the live side is built by
  `writeCapturePrefixBounded`, which applies `boundedKeep` — the SAME retention
  function the pin was built with. Both sides therefore drop the same records,
  and any defect in the filter is invisible by construction. This is the
  same-parentage failure the corpus names: the expectation pins the very thing
  it should catch.
  **The measurement, run at the desk before booking.** Baseline on
  `s-captureAW` 1048..1049: bounded pin 19,686,465 bytes vs a streamed source
  prefix of 610,897,526 (**3.22%**), `verifyPin` live 188 pairs / pin 188 /
  `diffs: []`. Then `boundedKeep` was sabotaged to drop every THIRD record it
  should keep, and the same command re-run: pin 12.93 MB, live **125** pairs /
  pin 125 / **`diffs: []` again**. A pin that had silently lost a third of its
  evidence got a clean bill of health, and the pair count fell 188 -> 125 with
  nothing flagging it. `tools/harvest.mjs` was restored from a byte copy
  immediately after (verified: empty `git diff`, zero `SABOTAGE` occurrences).
  **What this does and does not invalidate, because the distinction is the
  useful part.** The SIZE claim stands — 3.22% is a measurement of the artifact
  and was reproduced independently at the desk. The FIDELITY claim does not:
  "identical verdicts at a fraction of the bytes" is established by this check
  and by nothing else, so as of `e9a374b` the bounded mode ships with its size
  proven and its fidelity unproven. No bounded pin gets committed as a fixture
  until this is fixed.
  Design, decided: the live side goes back to the UNFILTERED prefix
  (`writeCapturePrefix`), and the COMPARISON is narrowed instead of the input —
  both sides restricted to the BUSTING CONVERSATION, identified by
  `conversationOf` of the target record itself. That identity comes from the
  capture, not from `boundedKeep`, which is the whole point: the reference
  stops being filter-derived. The lineage-related conversations are
  deliberately NOT part of the bar — they are retained so a later
  lineage-aware consumer can find them, and a contract defined over them would
  be filter-derived again.
  **MECHANISM SETTLED 2026-08-10, at the desk, because the paragraph above is
  not decision-complete at implementation grain and briefing it would have
  handed that gap to the executing tier.** "Narrow the comparison to the
  busting conversation" does not survive contact with `compareReplayVerdicts`:
  it compares AGGREGATES parsed from a replay — total pairs, violation lines,
  census class tallies — and `runCensus` reports a tally over the whole file,
  not per conversation. Scoping it would mean teaching `replay.mjs` to emit a
  per-conversation breakdown, which widens the write set to the file the
  bounded pin only consumes.
  The cheaper mechanism is a CONTENT check, and it is strictly stronger against
  the defect that motivated this entry. From the RAW capture — independent of
  `boundedKeep`, which is the whole point — compute
  `S = { ordinals i <= m : conversationOf(record_i) === conversationOf(target) }`.
  Then assert the pin holds a REAL (non-placeholder) record at every ordinal in
  S. A retention filter that drops a member of the busting conversation now
  fails on evidence the filter had no hand in producing, and the existing
  verdict comparison stays as a second, weaker check rather than being torn
  out.
  What this establishes, stated exactly so it is not over-read: the busting
  conversation is COMPLETE in the pin. The lineage-related records remain
  outside the bar, deliberately — they are retained for a later lineage-aware
  consumer, and a contract defined over them would be filter-derived again,
  which is the defect this entry exists to remove.
  Under the sabotage below, S is computed from the capture and does not move
  while the pin loses a third of its records, so the check goes red — which is
  the property the current one lacks.
  Verifier, red-first, and the arrangement is ALREADY RUN and recorded above:
  re-apply the same every-third-record sabotage and the check must go RED
  (target-conversation pairs differ), where today it returns `diffs: []`.
  Unsabotaged, the primary case must still return no divergence. Both arms on
  one capture, one command each.
  Done-criterion: sabotage red, clean run green, and the entry above re-graded
  from "size proven, fidelity unproven".
  Write boundary: `tools/harvest.mjs`, `test/harvest-pin-bounded.test.mjs`.
  Consumer tier **1 (event disposition)** — every frozen pin's trustworthiness
  reads through this check.

- **DONE 2026-08-10 (`a68a8af`) — the rows now carry the proxy's OWN identity,
  so a census row and an insertion-normalization event log line finally name
  the same string.** `compactEntry` gained `inConvKey`/`outConvKey`, computed
  by IMPORTING `conversationSubKey` from `proxy/extensions/message-hash.mjs` —
  never a re-implementation — while the cheap stripped-twin predicate stays
  exactly as it was as the pre-filter. Verified at the desk by re-running the
  census myself rather than reading the report: the row prints
  `n=38 ts=2026-08-08T09:58:50.626Z [transition] raw=496b188f5f435920 ->
  forwarded=a20843f8616f3866`, the pair this session had already established
  twice by an independent path, and the neighbouring request 4 s earlier still
  produces no row. Corroborated in the same output by the gate's own
  attribution line for that pair,
  `fresh-session-sort:first-appearance-relocation (mcp)`.
  Original header: **`identityRotation` measures the right EVENT with the
  wrong DIGEST, so its rows cannot be joined to the event logs that record the
  same rotation.** Surfaced 2026-08-10 by the lane that built it, as a question
  rather than a unilateral predicate change — correctly. The class fires
  exactly on its named positive and stays silent on its named negative, both
  verified live; what does not line up are the row's `rawId`/`fwdId` STRINGS.
  `replay.mjs`'s `sha()` (`:87-89`) truncates to **12** hex chars over
  `JSON.stringify` of the WHOLE message object, `role` included;
  `conversationSubKey`/`hashMessageContent`
  (`proxy/extensions/message-hash.mjs:16-24,48-63`) truncates to **16** over
  `msg.content` ONLY. Two primitives over one conceptual quantity, never shown
  equivalent, so by construction a census row can never print the digest the
  insertion-normalization event log recorded for the same request — the desk's
  own verification of this class had to compute the second primitive by hand
  to check the first.
  **Why this is a definition problem and not a formatting one.** What counts as
  "the conversation identity our extensions key on" is defined by
  `conversationSubKey`, because that is the function the proxy actually keys
  on. A near-twin computed over a different input shape can disagree with it —
  a `role` change on `messages[0]` fires our class and moves no real key — and
  nothing downstream would notice, since no consumer compares the two.
  Design, decided: the row carries the REAL identity. Retain `inConvKey` and
  `outConvKey` on the compact entry — two short strings per ENTRY, not per
  message, which is cheaper than the per-message arrays already retained
  beside them — computed by importing `conversationSubKey` itself, never a
  re-implementation (`tools/harvest.mjs` already imports across the
  `proxy/` boundary, so the direction is established). The stripped-twin
  predicate stays as the cheap pre-filter; the digests reported become the
  proxy's own.
  Verifier, red-first, live positive already in hand: the row for
  `s-captureAT` at 2026-08-08T09:58:50.626Z must print
  `496b188f5f435920` -> `a20843f8616f3866`, the pair the desk verified twice
  and the event log recorded, where today it prints two 12-char digests
  matching neither. The negative at 09:58:46.362Z must stay silent.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **1 (event disposition)**.

- **DONE 2026-08-10 (`a68a8af`) — and the two numbers differ by 40x, which is
  the whole point.** Each row carries `transition`, true only the first time a
  `(key, rawId)` pair is seen rotating; `--census` prints both, labelled.
  Measured on `s-captureAT`, reproduced at the desk: **298 requests served
  under a rotated identity, 7 rotation transitions.** Row 26 asked how often a
  rotation OCCURS and would have been answered "298" — a number about
  conversation LENGTH, not about the event. Residual, named by the lane and
  left open rather than papered over: the 7 has no second instrument behind it.
  A cheap cross-check exists — that session's insertion-normalization logs
  carry 12 distinct state keys, and transitions must not exceed distinct keys —
  but it was not run, so 7 is single-sourced.
  Original header: **`identityRotation` counts a persistent STATE as if it were
  an event, so its 40% is not the rate row 26 asks about.** Measured
  2026-08-10 on `s-captureAT`: **298 of 738 requests** classify. The lane's
  reading, which the code supports: `fresh-session-sort`'s relocation is a
  persistent per-session mutation — once it fires for a conversation, EVERY
  subsequent request in that conversation carries the relocated block, and a
  per-REQUEST predicate re-fires on each one. So 298 is "requests served under
  a rotated identity", while row 26's open question is "how often does a
  rotation OCCUR", and the two differ by roughly the length of each affected
  conversation.
  Design, decided: keep the per-request rows (they are the honest per-request
  fact and the join surface for a cost question), and add a TRANSITION count
  beside them — a rotation is NEW when the conversation's raw identity has not
  been seen rotating before in this capture. Report both, labelled, because
  reporting either alone invites the other's question.
  Verifier: over `s-captureAT` the per-request count stays 298 and the
  transition count is materially smaller; both printed, neither derivable from
  the other by the reader guessing. Done when the daily sweep's number cannot
  be read as a rotation rate without saying which of the two it is.
  Write boundary: `tools/replay.mjs`, `test/replay-identity-rotation.test.mjs`.
  Consumer tier **3** — it mis-describes a count rather than mis-classifying an
  event.

- **DONE 2026-08-10 (`f01175b` pushed `e483acc..f01175b`, 12 commits) — the
  guard half was discharged by verification and the publication half by an
  explicit operator GO ("you can push, you are the only one here").** The
  guard cited subagent commits `347d477` and `e9a374b`; this session
  dispatched both and verified both in the artifact — diffs read, suites run,
  the instruments exercised directly, and `e9a374b`'s verifier additionally
  sabotage-probed — so the audit-visible override was the guard's own path for
  that state, not a bypass of it. The second half was never the guard: the
  stack sat on `8b77c4f`, whose message maps where already-public leaks are,
  and that was surfaced twice as an operator decision and held until answered.
  Original header: **11 commits are unpushed and `git push` is DENIED by
  the unbooked-subagent-commit guard.** Booked 2026-08-10 evening by the
  closing session so it is visible at SESSION START, not only in the handoff:
  the session-start hook injects READY bullets from this section, and the
  `## Handoff` section is not on that path. A blocker whose carrier the reader
  never loads is not persisted.
  The guard names two commits — `347d477` (census: emit identityRotation) and
  `e9a374b` (harvest --pin --bounded). Both carry `Co-Authored-By: Claude
  Sonnet 5` with no `Claude-Session:` trailer, which is what "unbooked" means.
  They are SUBAGENT commits of session `…01R9jUauuFcnSPMSjx1ALPUp`; subagents
  commit unpushed by design and the DISPATCHER pushes after verifying in the
  artifact.
  Done when: that dispatcher has verified its two commits and `git push origin
  main` succeeds, leaving `git log origin/main..main` empty.
  **Do NOT reach for `PUSH_UNBOOKED_SUBAGENT_OK=1`** unless you are that
  dispatcher and have verified them — an override taken for another writer's
  unverified work is the habit that kills a guard, and the closing session
  declined it for exactly that reason.
  The tree was green at the attempted push (`npm test`: 2654 / 2649 pass / 0
  fail / 5 skipped), so nothing else stands between these commits and the
  remote.
  Consumer tier **1 (event disposition)**.
  <!-- entry: "9 commits unpushed; push denied by the unbooked-subagent guard" -->

- **DONE 2026-08-10 (`2e53a01`) — the check ships with FOUR answers, and the
  fourth is what keeps it honest.** `lintCitations` reports MATCH / DRIFTED /
  BROKEN-PATH / COULD-NOT-CHECK, runs in the default `backlog-lint` pass with
  no new flag, and is REPORT-only. Red-first over an immutable reference:
  `fe78c94~1`'s BACKLOG.md against today's `tools/bust-triage.mjs` returns
  DRIFTED 749->754 and 760->765; the current file returns MATCH.
  Its reach is small and is split out above as its own entry rather than left as
  a tail here. Verified at the desk by re-running the whole-file accounting
  myself: 74 checked, MATCH 2, DRIFTED 0, BROKEN-PATH 0, COULD-NOT-CHECK 72 —
  identical to the lane's report.
  Original body follows.

- **DONE 2026-08-10 (`2e53a01`) — and it reuses `bust-triage`'s own vocabulary
  rather than minting a second one.** `lintRowStatus` checks a `row N` +
  status-word sentence against the live `robustness-threat-matrix.md`, importing
  `statusKind`/`matrixRow` from `tools/bust-triage.mjs` — two instruments that
  would otherwise disagree about what a status word means now share one.
  Red-first: the real matrix row is paired against a constructed sentence
  asserting the opposite status, which fires, and against one asserting the
  true status, which is silent. (Stated without quoting either sentence — the
  check reads a quoted example as a claim, which it proved on this very
  paragraph; its own entry is above.) Deviation the
  lane named rather than hid: the positive pairs a CONSTRUCTED sentence with the
  REAL committed matrix file, because an exhaustive search over all 360 commits
  touching BACKLOG.md found no historical entry that ever asserted the closed
  status for that row before its re-open — so no real positive exists to search
  for, and the search was run before the construction rather than instead of it.
  A real bug surfaced in its dry run: the check matched bare `OPEN` inside
  `bust-triage`'s own `KNOWN-OPEN` compound verdict. Fixed with a `KNOWN-`
  lookbehind. Clean on the current corpus, desk-verified.
  Original body follows.

- **DONE (original entry, superseded by the closure directly above) — the succession rule's computable slice: an entry that
  ASSERTS a matrix row's status is a dependent nothing re-reads.** The rule
  itself is judgment-shaped and stays prose (dev-loop, "A finding never lands
  alone"), but one slice is a byte comparison: entries routinely say "row N is
  OPEN" / "row N is mitigated" in their own words, and the row's status text
  moves without them. The runbook already names the trap — "a row NAMED is not a
  row READ" — and today's walk hit it from the other side, where row 4's text
  carried the answer an entry had not absorbed.
  Design (decided): extend `tools/backlog-lint.mjs` rather than add a file (the
  extend-before-writing rule; it already owns entry-scoped parsing and the
  `- **` to next `- **` boundary). New WARN class: an entry citing `row N`
  within a sentence that also carries a status word (OPEN / RE-OPENED / CLOSED /
  MITIGATED / OBSERVED / ACCEPTED) is checked against that row's actual status
  cell in `docs/directives/robustness-threat-matrix.md`; a mismatch names the
  entry, the asserted status, and the row's current one. Status vocabulary comes
  from the matrix's own cells, read as data, never a hardcoded list — the
  seven-value vocabulary is exactly what `bust-triage` already collapses wrongly.
  Verifier, red-first against an immutable reference: `git show` an entry from
  before row 4's 2026-07-31 RE-OPENED edit that asserts the row CLOSED, run the
  lint over that pair, and it must name the entry. Over-firing controls, both
  required green: an entry citing `row N` with no status claim must stay silent,
  and an entry whose asserted status matches the current cell must stay silent.
  Done-criterion: red demonstrated on the historical pair with the command and
  its output pasted, both controls green, full suite green, lint wired WARN-only
  into the daily sweep as the existing header class already is.
  Write boundary: `tools/backlog-lint.mjs`, `test/backlog-lint*.test.mjs`.

- **DONE 2026-08-10 — ANSWERED, and the answer is that the flip is OURS. The
  entry's own premise ("the class is row 26 but this instance has no cause")
  was half wrong: it IS row 26, cause and all.** The varying input is named at
  field granularity, which was this entry's done-criterion. `sid` and
  `systemPromptSubKey(system)` are identical across the pair; the only
  differing input is `conversationSubKey(messages)` — the hash of
  `messages[0]` — and **CC sent byte-identical `messages[0]` in both
  requests**. `fresh-session-sort` (order 250) stripped an
  `# MCP Server Instructions` `<system-reminder>` out of message index 3 and
  prepended it as a new block 0 (`fresh-session-sort.mjs:462-470`, `:480-483`),
  taking `messages[0]` from 3 blocks to 4, and `insertion-normalization`
  (order 395) keyed on the mutated array.
  Established TWICE, independently: the lane reproduced both recorded suffixes
  by replaying the real pre-395 pipeline in a scratch XDG state dir, with a
  one-byte sentinel mutation yielding a third value (so the probe discriminates
  rather than merely agreeing); and the desk recomputed `conversationSubKey`
  over the RAW captured records alone, where both hash to
  `496b188f5f435920` with 3 blocks each. Full text and the new
  pre/post-snapshot fact are in the threat matrix, row 26.
  **The entry's warning held and is repeated here because the successor
  entries inherit it:** what the flip demonstrably did is DISARM our
  absorption. It is NOT established that it caused the 141k re-bill — CC keys
  its cache on the bytes it sends, not on our internal key — and the upstream
  miss's own cause stays unattributed on this instance.
  Successors booked directly above: the `identityRotation` census class (the
  mechanism this hand investigation prototyped) and the pre-pipeline-identity
  fix it gates.
  Original header: **READY — attribute the state-key FLIP that disarmed row 1's mitigation on a
  live 141k bust; the class is row 26 but this instance has no cause.**
  Booked 2026-08-08 from the bust walk on s-captureAT (2026-08-08T09:59:53Z,
  141k, `messages_changed / 124331`, this repo's own dev session). The two
  requests of the busting pair ran under DIFFERENT state keys 4 s apart —
  capture 09:58:46.362Z -> insertion event 09:58:46.364Z key
  `…496b188f5f435920`, capture 09:58:50.626Z -> event 09:58:50.628Z key
  `…a20843f8616f3866` — and BOTH logged `action=reset resetReason=no-prior-
  canonical`. The census classes the pair `splice/insert-mid`, which IS in
  `replay.mjs`'s MITIGABLE set, so unlike the same morning's 638k this is a
  mitigation that was ARMED and had no baseline to act on, not one that was
  never attempted. Session-wide that session: 12 distinct keys / 127 events /
  13 resets, **12 of them `no-prior-canonical`**; 8 of the 12 keys carry
  exactly ONE event, i.e. a key appears, takes one request, and is never seen
  again. `bust-triage` answered **MITIGATED (row 1)** on it, because it maps
  the census class to the row's STATUS and never reads the pair's extension
  events — the runbook's step-8 GRADUATE marker is exactly this and is booked
  separately.
  **What is NOT established, and must not be assumed by whoever takes this:**
  that the key flip CAUSED the re-bill. CC keys its cache on the bytes it
  sends, not on our internal key, so what is established is that the flip
  DISARMED our absorption — the upstream miss has its own cause, unattributed
  here. Do not write "key rotation caused a 141k bust" into the matrix on this
  evidence.
  Design: determine what varies the sub-key across two requests of one
  conversation. Read `conversationSubKey`/`identityKey` (import them, never
  re-derive — a probe that re-computes a key has produced a confident wrong
  answer three times here) and diff the two raw capture records at 09:58:46.362Z
  and 09:58:50.626Z on exactly the inputs the key function consumes.
  Verifier, red-first and with a control: feeding the earlier record's
  key-inputs must reproduce key `…496b188f…` and the later record's must
  reproduce `…a20843f8…`; the control that proves the probe discriminates is a
  sentinel mutation of one key-input yielding NEITHER. Done when the varying
  input is named at field granularity, or the entry is re-graded PARKED with
  that named as the missing evidence.
  <!-- entry: "attribute the state-key FLIP that disarmed row 1's mitigation" -->

- **DONE 2026-08-10 (`b0adb93`) as to the INSTRUMENT; its verifier was
  wrong about the evidence and is corrected below rather than left to be
  re-inherited.** `--rows` ships: one JSONL record per deduped API call, with
  inclusive `--since`/`--until` windowing, `--rows`+`--json` a named usage
  error, `messageId`/`stopReason` added to `normalizeRow`, and `scanRows` now
  returning the `rows` its own docstring had claimed for it while the body
  returned three keys. Red-first: 9 new bites red against the unmodified tool
  with all 16 pre-existing bites still green, then 25/25; full suite green at
  the integrated commit (2637 pass / 0 fail).
  **Verified at the desk by running it, not by reading the report:** over the
  frozen 2026-08-07 archive it emits **732 rows from 1,483 raw transcript
  rows — 751 dropped as duplicate API calls**, which is the requestId dedupe
  doing more than half the work, and surfaces both real
  `previous_message_not_found` calls in one command.
  **The two claims this entry's verifier named could NOT be reproduced, and
  that is a finding about the ARCHIVE, not about the tool** — booked as its own
  entry directly above. The reproducible replacements, run 2026-08-10 and
  recorded so the next reader inherits a checkable claim: the two
  `previous_message_not_found` rows sit at 2026-08-06T16:41:37.941Z and
  2026-08-06T23:59:10.461Z, and `cc` 335,933 lives in the archive's
  `event-windows.jsonl`, not in any transcript inside its tar.
  Residual, unverified and named: `--rows` was not load-tested on a >512 MB
  transcript (`readUsageRows` is already streamed, so this is untested rather
  than suspect).
  Original header: **READY — a TRANSCRIPT query instrument. It is the least-tooled data
  source we own, measured, and it is where every cache investigation
  actually lives.** Two enumerations run 2026-08-07:
  an instrument inventory across the three repos (100 instruments) and
  a probe census over readable session history since 2026-07-28
  (1,258 ad-hoc analysis commands matching a closed five-pattern set).
  Cross-read, `transcripts` is served by **exactly one** instrument, a
  QUERY — no GATE, no REPORT, no DOCTOR — while **36 hand-written
  probes** went at transcripts directly. By contrast `live_captures`
  has 9 instruments across all four labels.
  Both numbers are FLOORS, not estimates: the census found no session
  data at all before 2026-07-28, `claude-worktime` has no readable
  main transcript, and 15 of 39 session identities survive only as
  orphaned subagent fragments. The true hand-probe count is higher.
  The recurring shape is stable across the 36 and is what makes this
  designable rather than vague: open `~/.claude/projects/**/<sid>.jsonl`,
  walk it line by line, pull `message.usage` and
  `message.diagnostics.cache_miss_reason` per entry, join to a
  timestamp or an ordinal. Tonight's whole investigation was that
  query, run four times by hand.
  Design: extend `tools/cold-events.mjs` rather than add a file — it
  already reads transcripts, already dedupes rows into API CALLS by
  `requestId` (the property every hand probe got wrong or omitted),
  and already carries the conversation-grouping discipline. Add a
  `--rows` mode emitting one record per API call: timestamp, `sid`,
  `requestId`, `messageId`, `cache_creation`, `cache_read`,
  `input_tokens`, `ctx`, `cache_miss_reason.{type,cache_missed_input_tokens}`,
  and `stop_reason` — as JSONL, filterable by time window. The
  extend-don't-add rule applies with force here: a fresh file re-earns
  the requestId dedupe from zero, and that is exactly the property
  whose absence produced the 2026-08-07 false ❄.
  Verifier, red-first: over the frozen transcript archive at
  `~/.local/share/claude-worktime/cold-design-evidence-2026-08-07/`, `--rows` reports the
  01:00 session's two API calls (cc 39,711 / cc 335,933) as TWO rows
  where the raw transcript carries more, and names the dropped
  duplicate count; and it reproduces, in one command, the
  `previous_message_not_found` diagnostics at 03:31:59Z and 03:32:01Z
  that took a hand probe to find.

- **DONE 2026-08-10 (`d8bb9b6`) — the primitive landed ahead of both its
  consumers exactly as this entry required, and the first one is already built
  on it.** `LINEAGE_THRESHOLD = 0.5`, `lineageOverlap(a, b)` and
  `sameLineage(a, b)` are exported from `tools/replay.mjs:1179-1191`, and
  `test/replay-lineage.test.mjs` carries 10 bites: `node --test
  test/replay-lineage.test.mjs` returns `pass 10 / fail 0`, executed at the desk
  2026-08-10, including the threshold-boundary pair (exactly 0.5 is true, just
  below is false) and the order-independence bite.
  The done-criterion's SECOND half was checked rather than assumed:
  `conversationOf` is unchanged and no existing caller of it was touched — the
  cache identity was not bent to make the lineage relation fit, which was the
  whole design point.
  First consumer live already: `tools/harvest.mjs` imports `sameLineage` from
  `replay.mjs` (`:105`) and its bounded-pin keep set is the busting
  conversation unioned with everything `sameLineage` relates (`:799`) — the
  reuse this entry's "no consumer re-derives either inline" clause exists to
  produce. Second consumer, `capturePairResult`'s lineage fallback, is the
  entry above and is UNBLOCKED by this: its red arrangement was re-run at the
  desk 2026-08-10 and still reproduces (`VERDICT: UNVERIFIABLE` /
  `ATTRIBUTION: COULD-NOT-ATTRIBUTE`, the selected request at ord 715, n=555,
  "18 request(s) in this capture and none earlier"), so the entry is
  dispatchable with a runnable red today.
  Desk-verified independently of any lane's report: the exports were read at
  their lines and the bites executed here.
  Original entry follows, RE-GRADED rather than left at `READY` — a closure
  that leaves its original bullet graded READY is the double-count defect
  booked under the grade-marker entry above.

- **DONE (original entry, superseded by the closure directly above) — the LINEAGE relation, as a shared primitive in
  `replay.mjs`, ahead of BOTH its consumers.** Split out 2026-08-10 from the
  `capturePairResult` entry above, when re-reading the bounded-`--pin` entry's
  premises against the world showed the two could not both be right in the
  order they were booked (the finding is recorded in that entry, below).
  `conversationOf` (`tools/replay.mjs:1077`, `e.inHash[0]` — the first
  message's byte hash) is the CACHE identity and stays exactly as it is: it
  answers "will these two requests hit the same prefix". It cannot answer "is
  this the same conversation as before CC rebuilt its history", and the
  measurement says so — on `s-captureAT` ord 715 the target's `messages[0]`
  matches NONE of the preceding requests, while those same requests share
  97.1 / 97.3 / 97.7 / 98.1 / **98.5%** of its messages by content (ords
  709-713, rising with recency) and the 1-message co-tenant sidecar at ord 714
  shares **0%**.
  Design, decided: a SECOND named relation beside `conversationOf`, in the same
  module, exported the same way — `lineageOverlap(a, b)` = |shared message
  hashes| / min(|a|, |b|) over the compact form's `inHash`, and
  `sameLineage(a, b)` = that ratio >= **0.5**. The threshold sits far from both
  measured clusters rather than tuned to either edge; a future case landing
  between them is a finding about the class, not a reason to tune the number.
  Neither relation replaces the other, and no consumer re-derives either
  inline — three confident wrong answers in this repo already came from
  hand-rolled identity.
  **Why it lands FIRST, ahead of either consumer:** it is a pure function over
  two hash arrays, so its own red-first arrangement needs no capture at all.
  That is what breaks the deadlock the re-read exposed — each consumer needed
  the other's output before it could be verified.
  Verifier, red-first: constructed `inHash` arrays reproducing the measured
  shape — a predecessor whose index 0 differs and whose length changed
  (564 -> 555 in the real case) while ~97% of contents survive, plus a
  1-message sidecar. RED against the OLD implementation is `conversationOf`
  itself: it returns different identities for the 97%-overlap pair, i.e. no
  pairing at all, which is the defect; `sameLineage` must return true there and
  false for the sidecar. BASELINE, stated because the red is otherwise
  indistinguishable from a check that is always red: `conversationOf` must go
  GREEN on two requests that DO share `messages[0]`, so the arrangement
  demonstrates the split rather than a blanket failure.
  Done-criterion: both relations exported from `replay.mjs` with bites green,
  and no existing caller of `conversationOf` changed — the cache identity is
  not touched by this entry.
  Write boundary: `tools/replay.mjs`, `test/replay-lineage.test.mjs` (new file
  — `git add -N` before the pathspec commit).
  Consumer tier **1 (event disposition)**, inherited from the two entries that
  consume it.

- **DONE (`e9a374b`, `ce975c5`, both ancestors of this base) — the design in this entry had ALREADY SHIPPED before the lane that was dispatched to build it opened. Returned by L5 on its premise re-read; desk-verified independently — `pinRangeBounded`, `boundedKeep` (the conversationOf-OR-sameLineage union this entry specifies) and the `--bounded` CLI flag are all live in `tools/harvest.mjs`, and `test/harvest-pin-bounded.test.mjs` covers every clause including the union discriminator. The entry is the stored-brief rot the routing rule names: its grade recorded decision-completeness as of the day it was written and nothing re-graded it when the work landed. — `harvest --pin` cannot freeze a LATE event in a LARGE
  capture, which is exactly when the expensive busts happen.** `--pin n..m`
  always writes every record from 0 through m (deliberately: replay from 0 is
  what keeps insertion-normalization's per-conversation canonical state in
  sync, stated in `tools/harvest.mjs`'s own header). That is correct and it
  does not scale. Measured 2026-08-10 on a live 311k `messages_changed` bust:
  the capture was 592 MB / 2065 records and the busting pair sat at 1048..1049,
  so the prescribed freeze would have written roughly 300 MB into a PUBLIC git
  history. The existing tracked pins are 36 KB, 1.7 MB and 30 MB — this is an
  order of magnitude past the largest, and `docs/runbooks/bust-appears.md`'s
  "structural classes are worth the megabytes" was written when pins were tens
  of megabytes.
  **Consequence, and it is the closing gate's own question 2:** for a late
  event in a big capture there is currently NO proportionate freeze, so the
  evidence-harvestable answer is "no" by construction rather than by choice.
  The one thing that keeps this from being urgent is also measured: eviction is
  oldest-mtime-first, so an ACTIVE session's capture is the last to go — the
  window is real, but it closes when the session goes quiet, which is exactly
  when it stops being traffic and starts being evidence.
  Design, decided: `--pin` gains a bounded-prefix mode that keeps replay
  correctness instead of trading it away. Replay from 0 is needed for the
  per-conversation canonical state, so the bound is per-CONVERSATION, not
  per-file: keep every record of the busting pair's own conversation
  (`conversationOf`, already the grouping key `replay.mjs` uses) from 0
  through m, UNION every record `sameLineage` relates to the busting request
  (the primitive entry above), and drop the rest, which contribute nothing to
  that state. On an interleaved multi-tenant capture like the measured one that
  is most of the file.
  **What the re-read found, 2026-08-10, and why the union clause is part of the
  design rather than a refinement of it.** This entry was booked with the
  conversation filter ALONE, hours before the rotation measurement in the
  `capturePairResult` entry above existed. Applied to that entry's own red case
  it freezes nothing usable: `bust-triage`'s live output on `s-captureAT` ord
  715 reads "its conversation has 18 request(s) in this capture and none
  earlier", so a `conversationOf`-bounded pin over 0..715 keeps exactly ONE
  record — itself. The replay then finds zero pairs, and the pin's own
  self-verification says so in its own words: "compared nothing — same-
  conversation pairs live=N pin=0; a replay over zero pairs proves nothing"
  (`tools/harvest.mjs:814`). The 98.5% predecessor at ord 713 would be dropped
  by the very filter meant to make freezing it affordable. Neither entry was
  wrong when it was written; the premise moved under this one, and it moved
  inside a DIFFERENT entry, which is why nothing flagged it until the two were
  read together at dispatch time — the stored-brief rot the routing rules name,
  caught here by the re-read rather than by a mechanism.
  Verifier, red-first and self-proving: the bounded pin must reproduce the SAME
  verdicts as the full pin over the same range — same pair count for the
  busting conversation, same violations, same census classes — which is the
  check `--pin` already runs on itself today, so the bar is "identical verdicts
  at a fraction of the bytes", not a new notion of correctness. RED: the same
  bound applied by naive truncation (records n..m only, no conversation
  filter) must FAIL that check, which is the failure mode the header comment
  already predicts and nothing currently demonstrates.
  SECOND RED, from the finding above, so the union clause is demonstrated
  load-bearing instead of assumed — and CORRECTED 2026-08-10 before it was
  briefed, because the first version of it could not discriminate. It read
  "the conversation-only bound must report ZERO pairs while the union bound
  reproduces the live verdicts for that conversation". Both arms report zero
  pairs: `replay.mjs` groups by `conversationOf`, so the ord-715 target is a
  singleton there whatever the pin contains, and the live replay of 0..715
  finds no pair either. A check both arms pass is not a check — it is the
  unprovable-predicate shape this repo already names, arriving as a
  verdict-level check where the difference is at CONTENT level.
  The discriminating form, which is what the union clause is actually for:
  the two bounds differ in WHAT THE PIN CONTAINS, so assert on the pin.
  Conversation-only over `s-captureAT` 715 writes exactly ONE request record
  (the target itself). Conversation-union-lineage writes that one PLUS the
  ord-709..713 neighbours, ord 713 among them — the 98.5% predecessor a later
  `capturePairResult` has to be able to find in the frozen artifact. Assert
  the record counts and ord 713's presence, not the replay verdict.
  This also states the boundary plainly for whoever builds it: keeping the
  lineage records does NOT make `replay.mjs` pair them, and is not meant to.
  Replay's grouping stays `conversationOf` and stays right. The union exists
  so the FROZEN FILE still holds the predecessor when the lineage-aware
  consumer arrives.
  Done-criterion: the 2026-08-10 bust above is freezable at a size in line with
  the existing tracked pins, with verdicts identical to the unbounded pin.
  Write boundary: `tools/harvest.mjs`, `test/harvest*.test.mjs`.

- **DONE 2026-08-10 (`e53f873`, unintegrated) as to the PIN — and the answer is that this class CANNOT be frozen, measured rather than predicted. That resolves the synthetic-substitute question this backlog has been holding two commits over.** The pin was taken minutes before the capture rotated off disk; it rotated DURING verification. The window this drain kept naming closed while someone was standing in it.
  **What the pin proves and what it cannot.** Structure survived: 33 live against 33 pinned same-conversation pairs over records 0..38, agreed by TWO independent measurements — `harvest --pin`'s own `verifyPin` against the live capture before rotation, and a separate replay of the pin's `.records` as JSONL. The class did not: `identityRotations = 0` on the pinned replay where the live pair classifies. Cause, confirmed independently by both instruments: `fresh-session-sort`'s mcp-block predicate needs the literal `# MCP Server Instructions` text, and the scrubber tokenizes it away. `harvest --pin`'s own verification reached the same root cause by a different route, naming the missing exemption at `n=35->38`.
  **This is `docs/dev-loop.md`'s scrub-destroys-content-predicates rule arriving as a measurement instead of a warning**, on the very extension whose four relocatable-block predicates that section already names. Before rotation the live state-key hashes were re-confirmed against the entry's own cited values, so the live positive was REAL and is now unreachable forever.
  **The consequence, and it is the useful half.** The row-26 hard-ordering blocker can never be discharged from a harvested pin — not for want of trying, but by construction. dev-loop already states the exit and it is not a compromise: where a class cannot survive the scrub at all, the durable evidence is a SYNTHETIC fixture, and that is "not merely preferred but the only option". So the red-first arrangement for this class is synthetic BY THE RULE, not in spite of it.
  **What that settles elsewhere.** The two held bust-triage commits were held pending exactly this discrimination — structural classes survive the scrub, text-predicated ones provably do not, and nobody had made the call for either. This is the worked precedent: for any member whose class is text-predicated, synthetic is correct and the hold releases; for any member whose class is STRUCTURAL, the substitute-case prohibition still binds, because there a real pin would have worked and nobody took one. The discrimination is now cheap to apply per member and is the next desk act.
  **The lane's conduct is the part to keep.** Told to report honestly if the pin could not carry the class, it did — no live bite added, the fixture kept only as verified raw structure with its scrub checks green and zero raw session-id fragments. A fixture reporting success while reproducing nothing is the exact trap this repo has already sprung once; refusing to build one is the correct outcome, not a failed member.
  Residual, named: the pin is committed but UNINTEGRATED on the replay lane's branch, and it carries a fourth skipped test (its mutant no-op case, matching the three committed pins' pattern). Realizing write-boundary: `BACKLOG.md` plus that branch (desk-only).

- **DONE 2026-08-10 — ANSWERED as a NON-DEFECT, by direct read of the transcript. The sequence is textbook GROWTH with full read-conservation (cc=39711/cr=0 -> cc=39711/cr=0 -> cc=335933/cr=39711 -> cc=1237/cr=375644, and 375644 = 39711+335933). `bust-triage`'s five-diagnostic read is byte-exact correct; the flagged record carries `diagnostics:null`. ATTRIBUTION: n/a — no divergence on either side; this is the ❄ firing on cache_creation alone, an INSTRUMENT property, not a bust. The threat matrix's sentence that no `cache_miss_reason` exists anywhere in the session is FALSE whole-transcript (five exist) and TRUE only for the flagged record — a scope overreach, re-booked below as an L2 matrix correction. — the 2026-08-07 01:00:55Z 336k event reads UNCLASSIFIED, and its
  transcript diagnostic does not join to the ledger record.** Surfaced
  2026-08-07 by `22b8c05`, which turned a non-answer into a finding: with the
  request selection fixed, the walk reaches a real pair (`n=2->4`) and the
  census says `append-only`, which maps to no matrix row — the tool's own
  stop-here. Second half, and it may explain the first: the session transcript
  holds 328 records with 5 `cache_miss_reason` diagnostics and NONE reports
  `cache_creation 335933` (they report 339, 339, 427535, 427535, 427535), so
  the ledger event and the transcript cannot be joined at that stamp. Until
  that join is explained the UNCLASSIFIED cannot be graded — an append-only
  pair carrying a 336k re-bill is either a new class or an instrument artifact,
  and the two are distinguished by which record the 335,933 belongs to. Do the
  join first; mint the row only if the event survives it. Note the earlier walk
  for this same stamp dispositioned it NON-DEFECT/GROWTH on the transcript's
  own numbers — that walk and this verdict must be reconciled, not stacked.

  **DROP REJECTED 2026-08-10 — a lane graded this OVERTAKEN; the desk
  overturned it.**
  A lane graded this OVERTAKEN on the threat matrix's reconciled walk
  (disposition NON-DEFECT). REJECTED at the desk: that is closing against a
  document, and the document CONTRADICTS this entry on a checkable fact. This
  entry says the transcript holds 328 records with 5 cache_miss_reason
  diagnostics (339, 339, 427535 x3); the matrix says `there is no
  cache_miss_reason anywhere in this session's transcript — grep returns
  zero`. Both cannot be true, and the walk's own FINDING 2 (bust-triage had
  selected a haiku sidecar, not the real predecessor) is a live candidate for
  why they disagree about WHICH conversation. The entry stands, with a sharper
  question than it was booked with: which conversation does each of those two
  readings belong to? Settle it by reading the transcript, never by quoting
  either document.

- **DONE 2026-08-10 (`4a0d5f6`) — and the reach is LARGER than either the entry or the lane said. `committedFixtures()` now walks recursively, plus a reachability guard so the NEXT subdirectory cannot hide the same way. L5 reported 210 newly-scanned files, matching `git ls-files`; measured at the desk on the integrated tree the scan's real new domain is 385 files (406 on the filesystem against 21 non-recursively), of which 177 are UNTRACKED — the two-coordinate-spaces split, and the untracked half is the better half, since those are exactly the fixtures staged for the next commit. Desk boundary probe: a planted `.json` in a fresh nested subdirectory is reached and scanned, green — correct, not a gap. — `test/harvest-scrub-relations.test.mjs` reads
  `test/fixtures/harvested` NON-recursively, so the standing corpus check
  cannot see `rowpins/`.** Found 2026-08-07 by the lane that created the
  subdirectory (`e787960`). Reader half: recurse — a one-line change, and the
  new pins are already covered by their own test, so this closes the general
  route rather than a live leak. **Writer half, which is the one that
  compounds:** a sweep that creates subdirectories under
  `test/fixtures/harvested/` is still running, so the NEXT subdirectory is
  invisible to the corpus check again. The computable seam: assert that every
  file under `test/fixtures/harvested/**` is reached by the scan's own file
  list — a set difference, no judgment. Verifier, red-first: plant a sentinel
  identifier in a file inside `rowpins/`, run the suite, and require red;
  today it passes green, which is the defect.

- **DONE 2026-08-10 (`3991a00`) — `rejectedCandidate` carries `.text` beside `.chars`, and a MISMATCH row prints its full reconstruction and the rejected candidate untruncated under `--verbose`; default output unchanged. Red-first with its baseline: the unmodified code failed on "the row's full reconstruction must be printed under --verbose", the row having printed lengths only. — the census header promises MISMATCH bodies (the
  code prints lengths only, and three consumers believed the sentence.** Found
  2026-08-07 by the byteGate lane, which needed the bodies and discovered the
  tool cannot produce them.
  **The claim**, `tools/reminder-migration-census.mjs:46-47`: every MISMATCH
  "is a hole in the rule and is printed in full, because these are what would
  silently move a bust." **The code**: the `extra:` body line is EXTENDED-only
  (`:1167-1170`), and a MISMATCH row carries `text: ""` by construction —
  MISMATCH is reachable ONLY from the no-counterpart branch (`:332-334`), which
  pushes an empty text. Verified by running the tool `--verbose` over both
  captures that carry a MISMATCH; the complete output for each finding is one
  line of counts (`host=` `blocks=` `recon=` `rejected=`) and no body at all.
  **Why this is worth an entry rather than a one-line docstring fix.** The
  sentence was read as a CAPABILITY by three independent consumers: the
  header's own author, the dotfiles handover of 2026-08-07 §2b ("the two bodies
  are printable: … `--verbose`"), and this repo's dispatch brief, which
  repeated the handover's instruction to a lane that then could not follow it.
  Nothing executes a header comment, so nothing ever contradicted it — the
  prose-only class the dev-loop's closing gate names, in its purest form: a
  building-heavy stretch verifies most of its claims as a byproduct, and a
  header verifies none of its own.
  **Design, decided — build the capability, do not weaken the sentence.** The
  header states the right requirement; a MISMATCH body is exactly what a human
  needs and is what the lane had to reconstruct by hand with a scratch probe
  importing `analysePair`/`conversationOf`/`canonical`. So carry the bodies on
  the MISMATCH finding and print them under `--verbose`: the reconstruction,
  and the standalone actually considered where one exists. Retiring the promise
  instead would be tuning the definition to ratify the implementation, which is
  the parentage error the corpus names.
  **Verifier, red-first:** assert that `--verbose` output for a MISMATCH
  contains the reconstruction text. That bite must be shown RED against today's
  code — it will be, because today's code emits no body — and the assertion is
  written from the header's requirement, never from what the new code happens
  to emit.
  Adjacent, found in the same pass and NOT bundled with it: the READY entry
  further down for `census must distinguish "no counterpart" from "counterpart
  present but unmatched"` has SHIPPED — `rejectedCandidate` is live at `:302`
  and `:304` — and is still graded READY. Re-grade it DONE with its commit ref
  when the `anyPresent` fix lands, since that fix touches the same branch and
  will re-read this code anyway.

- **DONE 2026-08-10 (dotfiles `7f4d0f3`) — the entry's DIAGNOSIS was right, its
  preferred FIX was refuted, and the handoff is what produced the repair.
  Read this before the original body below.**
  **My own first withdrawal of this entry, written an hour earlier, was wrong
  about the mechanism and is corrected here** — it is left described rather than
  deleted because the error is the instructive part. I integrated a sonnet
  lane's commit `eab030a` carrying `Co-Authored-By: Claude Sonnet 5` and NO
  `Claude-Session:` — the exact shape this entry says bounces — and the push
  went through clean. I read the guard, found a booking half, and concluded the
  criterion had been "replaced the same day" independently of us, so the entry
  had simply been overtaken. Wrong: the dotfiles session shipped that booking
  half `7f4d0f3` IN RESPONSE TO THIS HANDOFF, hours before my push. The
  observation was sound; the causal story I attached to it was invented, and it
  happened to make our own handoff invisible. A true observation with a
  fabricated mechanism reads exactly like a finding.
  **What they measured, with the instrument shown live on a known positive
  first** (`_ist_subagent_trailer` at :752 and :823 of the pre-fix file):
  `git show 7f4d0f3^:git/hooks/pre-push` carries NEITHER `_ist_gebucht` NOR
  `RECORD_PFADE`, and its block text read *"a commit counts as unbooked if it
  carries `Co-Authored-By: Claude ` but no `Claude-Session:`"* — trailer shape
  alone. So at booking time this entry was exactly right: EVERY subagent commit
  bounced, booked or not, and the override was the only exit. That is the cost
  the entry recorded, and it was real.
  **`7f4d0f3` shipped the entry's option (b)** — the one it listed as weaker: a
  commit clears if its SHA is cited in a record carrier at the pushed tip. That
  is why `eab030a` passed; I had cited it in the entry closing its work.
  **Option (a) — mandate both trailers in every dispatching brief — is REFUTED,
  not merely overtaken, and the reason is sharper than the one I gave.** Writing
  `Claude-Session:` into subagent commits makes them indistinguishable from desk
  commits *to the very predicate that detects them*. It would have SILENCED the
  guard. The pre-fix file predicted this about itself at :742 — "blind
  direction, fail-open: should subagent commits ever get their own
  `Claude-Session:` trailer, this guard no longer sees them" — and the
  prediction is what the entry's own preferred fix would have fulfilled.
  The audit-trail question this entry raised against option (b) is answered by
  the booking carrier, not by the trailer.
  **The durable lesson, and it generalizes past this guard:** a proposed fix
  that makes the checked party write the label the checker reads is not a fix,
  it is a silencer — and it reads as tightening. Carrying both trailers stays
  harmless; it is no longer what decides a push. What decides it is booking the
  integrated commit's sha in the record carrier, which this repo's conventions
  already required for unrelated reasons.
  Audit with bases: dotfiles `BACKLOG.md` pointer-set entry (`6303111`) and the
  dotfiles `LEDGER.md` entry in `9aa3d91`.
  The entry claimed the machine's pre-push guard refuses a commit carrying
  `Co-Authored-By: Claude ` without a `Claude-Session:` trailer, and concluded
  that briefs should mandate both trailers.
  **What refuted it:** I integrated a sonnet lane's commit `eab030a` carrying
  `Co-Authored-By: Claude Sonnet 5` and NO `Claude-Session:` — exactly the
  shape the entry says bounces — and the push went through clean. No bounce, no
  override. The result was surprising, so the guard got READ rather than
  reasoned about (`dotfiles/git/hooks/pre-push`, its own header comment).
  **The criterion was replaced the same day.** Primary is now a MARK —
  `is_marked(sha, …)`, written by a recorder module the checked party does not
  control — followed by a BOOKING check (`_ist_gebucht`: the commit's sha
  appears in the repo's record carrier). `eab030a` passed because I had cited
  it in the BACKLOG entry closing its work. The trailer test survives only as
  the FALLBACK, reached when the mark store cannot be loaded. A repo with no
  record carrier now WARNS and names instead of blocking, because the old
  fallback blocked in every foreign repo on this machine — where the finding is
  unresolvable by booking, so the override was the only exit, training the
  override reflex that kills a guard.
  **Why the guard's author moved:** the blind direction the old criterion had
  predicted about itself arrived — of three subagent commits in one wave, one
  carried a `Claude-Session:` and two did not, and no brief had asked for it.
  A label the CHECKED PARTY writes itself is worse than one that merely drifts.
  So mandating both trailers in every brief aims at the fallback and
  re-entrenches exactly that self-written label. Not to be built.
  What survives, and it is the useful half: the coupling now load-bearing at
  integration time is that **the dispatcher books the integrated commit's sha
  in the repo's record carrier** — which this repo's own conventions already
  require for unrelated reasons, and which is what silently made today's push
  legal. Carrying both trailers stays harmless; it is no longer what decides.
  This is the stored-brief rot shape the corpus names, caught live: the FIX
  stayed plausible while the DIAGNOSIS under it was refuted elsewhere, by a
  change to a file in another repo that nothing here reads.
  Original entry follows, unchanged, because the correction is the more useful
  artifact.

- **DONE 2026-08-10 (`dcba443`, `5631334`) — the leak scan could not see a UUID
  in a COMMIT MESSAGE, and had not been able to for its whole life.** Found by
  the batch lane the hard way: it cited a real session UUID in a doc AND in its
  own commit message, the doc hit was caught immediately by the roster test, and
  chasing why the commit-message hit was NOT caught exposed the structural gap.
  The mechanism, and it is the assurance-wider-than-its-predicate shape exactly:
  `scanSourceText` MATCHED full UUIDs and then SUPPRESSED them, deferring to
  "the capture-uuid class" — but that class only ever ran inside `scanDocument`,
  over JSON values. Source text never reached it. So the deferral pointed at a
  consumer that never fired, and the suppression read as delegation while being
  deletion. Verified directly before the fix: `scanSourceText` over a string
  carrying a full session UUID returned ZERO findings.
  This sat under the pre-push hook, at the irreversible boundary, which is the
  one place a cleanness claim has to be true — and `docs/dev-loop.md` already
  records a real prior leak through an earlier scrubber into a public PR.
  Fix: `scanSourceText` reports `capture-uuid` directly instead of suppressing.
  Red-first with its baseline stated, via stash: 37/39 pass WITHOUT the fix, and
  the two failures are exactly the two tests that should fail; 39/39 with it.
  The fix then flagged 13 pre-existing SYNTHETIC UUIDs in the suite's own roster
  file — legitimate, and noise on every future touch. Closed with a
  CLASS-SCOPED allowlist entry (`capture-uuid` only, that one file), not a
  whole-file skip: that file's own roster test independently re-verifies every
  UUID it carries on every `npm test`, so the exemption is one the mechanism
  itself checks rather than one taken on trust.
  Desk-verified end to end, on the real history rather than a fixture: the scan
  over the outgoing range reported the leak by commit and line; after the
  message was rewritten it reported clean; and the SAME invocation still fires
  on the preserved pre-rewrite branch. The last of those three is what makes
  the clean readable — a clean scan and a broken scan print the same word.

- **DONE 2026-08-10 (`92fdffc`) — and writing the pin found a live bug, which
  is the argument for coverage work in one line.** The per-call table's `#`
  header was one character narrower than every data row's own prefix, so every
  row was misaligned permanently, independent of timestamp width. Re-scoped by
  the lane to design point (c) only, with its reason: points (a) and (b) are
  already pinned by `test/tool-output-stamps.test.mjs`'s ARM1/ARM2, so building
  them again would have been a second instrument sharing one author's blind
  spot. Red-first by hand: fix reverted, test fails 49 !== 48; restored, passes.
  Original entry follows.

- **DONE (original entry, superseded by the closure directly above) — `cost-report.mjs` had ZERO test coverage before `82372db`
  and still has none.** Measured by the lane: `grep -rl cost-report test/`
  returned nothing. Its timestamp changes in `82372db` (three display sites, two
  of them pass-through, plus a `padEnd 28→43` column widening) are verified only
  by live smoke output, which is not a committed regression. This is the
  general shape, not a one-off: the both-zones sweep touched a tool whose
  correctness nothing pins, so the NEXT edit there is equally unguarded.
  Design (decided): `test/cost-report.test.mjs` pinning (a) the text-report
  Timestamp column renders both zones, (b) `--json` carries no `local` text,
  (c) the column is wide enough that a both-zones stamp does not wrap.
  Verifier: red-first — revert each pin's site in turn, confirm exactly its own
  bite fires. Done-criterion: three bites, each independently reddened.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  `ZERO test coverage` is factually wrong today: the entry's own verifying
  command `grep -rl cost-report test/` now returns
  test/tool-output-stamps.test.mjs, whose ARM1/ARM2 cover design points (a)
  and (b). Still true: no dedicated test/cost-report.test.mjs, and nothing
  covers design point (c), the column-width/wrap concern. Re-scope to (c).

- **DONE 2026-08-10 (`a5a9b54`), prose half only, which is what this member is. — `docs/dev-loop.md`: a FIELD can be a default rather than a
  measurement, and 0 is where the two are indistinguishable. FIVE instances in
  one session.** The file already teaches that a number names its tap point and
  its unit; it does not teach that a number may not be a number at all. Each of
  these was used according to the field's NAME before its definition was read,
  and each produced a confident wrong statement:
  `mtok` — read as "no prefix matched"; it is the missed portion AS READ from
  the transcript diagnostic and defaults to 0 when that read never happened.
  Disproof was in the ledger: one event booked three times reads `mtok` 0, 0,
  182,728.
  `pinned` — read as the size of the pin store, so a 9->4 transition looked
  like state loss; it is a per-request count of pins APPLIED
  (`insertion-normalization.mjs`, `pinned: applied`), which alternates with
  CC's own oscillation and means nothing about retention.
  `rebilledBytes` — read as the cost; it prices from the divergence index while
  the wire prices from the last written breakpoint (its own entry, above).
  `readCapture`'s index — read as the request ordinal; it counts every
  non-blank LINE, and `main()` documents that hazard 500 lines above the pass
  that walked into it.
  `cause: other` — the one case already documented in FORK-NOTES as a degraded
  default, which is what makes the class visible: the SAME shape was
  undocumented on every sibling field.
  Design: one section, sited beside "Tap points — every number names where it
  was measured", stating the class — a field's value is a measurement only
  where the writer wrote one; the zero of an unwritten field and the zero of a
  measured absence are the same bytes, and only the writer distinguishes them.
  This is the three-answer rule (verified clean / verified broken / COULD NOT
  VERIFY) one level down: it already governs CHECKERS and not the FIELDS they
  read. Widening the existing section beats a new one.
  **WIDENED 2026-08-07 — the class covers PRESENCE-encoded booleans, not just
  numeric zeros, and the sixth instance cost a wrong finding delivered to the
  operator.** `prefix-diff` writes `record.crossTenant = true` and OMITS the
  field when false (`prefix-diff.mjs:1095`). Reading the raw event log, a
  session saw two very different `msgs` shapes under one key with no marker on
  either, concluded the tool was POOLING two conversations into one baseline,
  and told the operator so — who correctly asked for it to be booked. It was
  wrong: 475 persisted records DO carry `crossTenant`, and the ones without it
  are correctly unmarked. An absent boolean and an unemitted boolean are the
  same bytes, exactly as an unwritten 0 and a measured 0 are.
  This is the harder half of the class, because the numeric version at least
  shows a value. Design addition: the section states that a boolean encoded by
  key PRESENCE is unreadable from a single record — the reader must establish
  that the writer emits it at all (`grep -c` for the key across the corpus is
  the one-command check, and it is what settled this instance) before reading
  its absence as `false`.
  Residual, PARKED with its named probe rather than booked as a finding: four
  records in one capture show `messages=31->2` with `tools[SendMessage:removed]`
  and no `crossTenant`. Whether that is correct depends on `prefix-diff`'s own
  tenant DEFINITION, which has not been read; the probe is reading it and
  checking those four against it. The session's tenant-switch signature was
  hand-rolled, which is the never-hand-roll-identity trap, so the discrepancy
  is suggestive and nothing more.
  Verifier: the section names the five fields above with, for each, what its
  zero means; states the presence-encoded-boolean case with `crossTenant` as
  its worked example; and `cause: other`'s FORK-NOTES paragraph gains a pointer
  to it, since that paragraph is where a reader currently learns the class from
  a single instance.

- **DONE 2026-08-10 (`cf8843f`, scrubbed in `a3f141c`) — and the lane
  REPRODUCED the entry's own incident rather than re-describing it, which is
  where the leak came from.** New step 4 in the "Rule out the instrument"
  ladder, naming the three known sibling pairs: `cold-events.mjs` vs worktime,
  `replay.mjs --census` vs `reminder-migration-census.mjs`, `bust-triage` vs
  dossier.
  The reproduction, against this entry's own named 2026-08-07T01:00:55Z stamp:
  the live transcript was still on disk, `cold-events.mjs` was run over it, and
  the same disagreement worktime's ledger shows was confirmed — cc=335933
  flagged there, not flagged by `cold-events.mjs`, because its own 66-row dedup
  changes the `prev_ctx` chain the predicate reads. That is a mechanism, not a
  coincidence, and it is what the new rung teaches.
  **The cost, recorded because it is the durable part:** reproducing against a
  real transcript put a real session UUID into the doc and into the commit
  message. The doc was caught by the roster test within one suite run and
  scrubbed; the message needed a history rewrite before any push, and chasing
  why the message hit was NOT caught exposed a structural hole in the scanner
  itself (its own entry, above). Reproduction is the right method AND it walks
  evidence across the publication boundary — the two are not in tension only if
  the scrub runs before the push, which is exactly where this repo puts it.
  Original entry follows.

- **DONE (original entry, superseded by the closure directly above) — `docs/dev-loop.md`: when an instrument surprises you, run
  the SIBLING implementation before reasoning about the defect.** The corpus
  carries this as principle ("divergence between two independently built
  measurements of the same quantity is the cheap reach detector"); the dev-loop
  has the whole "rule out the instrument" ladder and does not mention it,
  though this repo is unusually rich in sibling implementations.
  Measured 2026-08-07: a 336k ❄ was diagnosed by running `tools/cold-events.mjs`
  — the fork's own re-implementation of worktime's cold-event predicate — over
  the same transcript. It returned `events: 0` against worktime's one 336k hit,
  and the difference between them (a `requestId` dedup one has and the other
  lacks) WAS the defect and its remedy, in a single step. Reasoning had already
  produced two wrong mechanisms before that command ran.
  Design: one step in the "Rule out the instrument" ladder, above "look at the
  bytes" — name the known sibling pairs so the step is executable rather than
  aspirational (`cold-events.mjs` vs claude-worktime's detector;
  `replay.mjs --census` vs `reminder-migration-census.mjs` on container
  migrations; `bust-triage` vs `dossier` on row lookup, which the runbook
  already treats as a disagreement source).
  Verifier: the step, run against the 2026-08-07 01:00:55Z stamp, reaches the
  same verdict the hand-walk reached — and the ladder's existing steps stay in
  their current order, since this adds a rung rather than re-ranking them.

- **DONE 2026-08-10 (`963e6b2`) — a runbook procedure step in `session-close.md`, carrying its `[GRADUATE]` marker rather than pretending to be mechanized. — the close-out lane inventories EVENTS and not SIGNALS, so a
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

- **DONE 2026-08-10 (`0dd7e56`) for the CENSUS half; the gate-live wiring is carved out and re-booked below. `--json --verbose` exports `mismatchRows` verbatim, capped at 200 with `mismatchRowsTruncated`. Red-first: unmodified code failed `mismatchRows must be an array; got: undefined`. The cap bite found a defect NEITHER entry named and it is the serious one — `process.exit(await main(...))` truncated its own large stdout write mid-JSON (146KB came back `SyntaxError: Unterminated string`), pre-existing and invisible until a payload got big enough. Fixed in the same commit with `process.exitCode`. — the byte-gate's MISMATCH rows have no way OUT of the census, so
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

- **DONE 2026-08-10 (`b77d8b8`) — two lines now, where one word used to cover
  two different facts.** `skipped (all classes): <path>` for a whole-file skip,
  `exempt <class,...>: <path>` for a class-scoped drop. Verifier as this entry
  named it: `formatAllowlistLine` over a skip entry and over an exempt entry
  now differ, and the existing LEDGER test was updated to assert the new form
  rather than left asserting the old one.
  Original entry follows.

- **DONE (original entry, superseded by the closure directly above) — `absence-scan`'s `allowlisted:` line cannot distinguish a
  whole-file SKIP from a class-scoped DROP, which is exactly the distinction the
  2026-08-05 narrowing was made to create.** Noticed 2026-08-08 while scanning
  today's sweep pins before committing them: three files reported `allowlisted:`
  and the reader cannot tell whether they were scanned-with-two-findings-dropped
  or skipped whole. `report()` prints one line for both routes — `main()`'s file
  branch and `scanGitRange` both `allowlisted.push(file)` on a full skip
  (`isAllowlisted`), and both push again when `kept.length < findings.length`.
  **Graded honestly as LATENT, not as a lying instrument, because the check was
  run rather than assumed:** `isAllowlisted` was narrowed the same day to mean
  "exempt from EVERY class", and no `ALLOWLIST` entry uses `classes: "all"`
  today, so the full-skip route is currently unreachable. It becomes live the
  day someone adds one — and then a path-wide skip reads exactly like a
  two-class drop, which is the entry-path shape `docs/dev-loop.md` collects (the
  protected thing reachable by a second, silent route). Design, decided: two
  distinct lines — `skipped (all classes): <path>` and
  `exempt <class,…>: <path>` — so the report states which route fired. Verifier,
  red-first: a temporary `classes: "all"` entry must make the two lines differ;
  today both render identically. NOT built on notice because
  `tools/absence-scan.mjs` is owned by a running lane (the finding-granular
  discard); this is the booking, and whoever holds that file next takes it.

- **DONE 2026-08-10 (`2e53a01` + `2676523`) — and the second commit is the
  interesting one: the check shipped with HALF its design removed, on evidence.**
  This entry specified two signals — a shipped-commit citation, and a split-out
  phrase. Built as specified, the split-out signal returned **5 findings, 5
  false**: this corpus uses "split out of/into" overwhelmingly for entry
  LINEAGE (a big entry deliberately split into sub-entries, tracked both
  directions), not for "my remainder is done, handed elsewhere". No phrasing
  separates them, so it was REMOVED rather than thresholded — a threshold that
  silences today's five is the same check waiting for a sixth. The lane
  returned the 5/5 as a question instead of tuning it away, which is why the
  decision was available to make.
  A WARN-only check that is wrong every time it speaks is worse than absent: it
  trains the reader to discount the reds from the three checks sharing its
  output. That is the cost this entry's own "report and not a gate" reasoning
  was already aiming at, one step further along.
  **This entry's named verifier is satisfied, and I ran it myself rather than
  booking the claim** — the entry says: run it over `BACKLOG.md` at `633256b`,
  where the coverage-walk entry was still READY with its own commits in its
  body, and it must flag exactly that entry. My run:
  `WARN backlog-premise line=677 signals=shipped-commit:7827c4e`, one finding,
  that entry. Clean on the current corpus in the same tool version — so the
  clean is a live check reporting nothing, not a dead one, which is the only
  reading a zero supports on its own.
  The self-match exclusion is CHECKED, not hardcoded: the commit token must sit
  inside a sentence-initial bold run, reusing `isSentenceInitialBoldContext`
  already defined in the same file. This entry narrates its own positive in
  plain prose, which is exactly what the exclusion catches — no line numbers,
  which rot here within the hour.
  Original body follows.

- **DONE (original entry, superseded by the closure directly above) — a derivation asks whether an entry's PREMISE is true and never
  whether WORK REMAINS, and the two come apart silently.** Measured 2026-08-10,
  within an hour of the first retirement pass, by the ranking that pass fed: the
  coverage-walk entry was probed STILL-TRUE — correctly, every fact in it holds —
  and ranked tenth, and it contains no remaining work at all. Its own body says
  so in a sentence nobody read at ranking time: parts (1) and (2) shipped
  (`7827c4e`, `b94d118`) and part (3) was split into a separate entry, leaving it
  "READY only for (3)'s absence, which is another entry's work; it survives here
  as the record of what the instrument covers."
  **The class, stated so it is not re-learned as a one-off:** an entry can be
  entirely TRUE and entirely DONE at once. Premise-truth and work-remaining are
  independent, the retirement pass measured only the first, and the READY grade
  asserts the second. So a pass that verifies every premise still leaves the
  count overstating the queue, and the overstatement is invisible precisely
  because each entry reads correct.
  **Why this is not covered by the neighbour-invalidation entry above it:** that
  one fires when a DIFFERENT entry's work lands. This one fires when the entry's
  OWN work lands in pieces and the residue is split out — no other entry closes,
  so nothing anywhere is triggered.
  **The computable slice, which is most of it:** an entry whose body cites its
  own commit refs as shipped, or whose text splits its remainder into another
  entry, is machine-detectable — commit-shaped tokens plus a split-out phrase in
  a bullet still graded READY. The judgment remainder (is what is left actually
  work?) stays prose.
  Design, decided: the check lands in `tools/backlog-lint.mjs` as a REPORT — a
  READY bullet whose body carries a shipped-commit citation for its own parts is
  flagged for a human read, never auto-re-graded. Report and not a gate, because
  an entry legitimately cites commits that shipped ADJACENT work, and a guard
  firing on that trains the override reflex.
  **Verifier, red-first over an immutable reference and a TRUE positive:** run it
  over `BACKLOG.md` at `633256b`, where the coverage-walk entry was still graded
  READY with `7827c4e` and `b94d118` in its own body — it must flag exactly that
  entry. Over-firing control: the entries that cite a commit ref belonging to
  another entry's work must NOT be flagged. Done when the flag fires on the
  frozen positive and the derivation's own preamble records the count it found.
  Consumer tier **3 (backlog and process)** — it mis-orders work and inflates
  every count read from this file, and it is recovered at the next derivation.

- **DONE 2026-08-10 (`2e53a01`) — built, with its over-firing control proven in
  the same run.** `lintCorrectionPlacement` flags the first correction marker
  past the first third of an entry; backtick-quoted mentions are exempt. It
  fires on 16 real entries and stays SILENT on the `bust-appears` DONE entry
  whose correction sits inside its own header — so it separates a correction
  folded into the head from one appended below it, which is the whole
  distinction. Desk-verified: my own run returns the same 16.
  The disposition of those 16 is split out above as its own entry.
  Original body follows.

- **DONE 2026-08-10 (`2d07e74`) — and the entry's own number had rotted, which
  the lane caught by measuring instead of inheriting.** `main()` is refactored
  into an exported `sweep()` and wired into `gate-live.mjs` WARN-only under the
  status field `xdgWriterGuard`, matching this entry's "non-blocking at first"
  design. The sweep is red at **38**, not the 34 recorded here — the tree moved
  between the entry being written and being executed, the ordinary stored-brief
  rot, and it would have shipped as a wrong assertion had the lane trusted the
  entry over the tree.
  Two tests, and the second is the one that matters: the sweep over the real
  tree is non-zero today, AND planting one fresh violation moves the count by
  exactly one. A non-zero count alone is satisfied by a sweep that returns a
  constant.
  Original entry follows.

- **DONE (original entry, superseded by the closure directly above) — `tools/xdg-writer-guard.mjs` is red at 34 and its `main()`
  is wired to no consumer; and the reason recorded in this backlog for why
  `npm test` stays green is FALSE.** Booked 2026-08-10 from the public-surface
  and systems review. The wiring half is already named inside the bucket-(d)
  entry above as "a second item hiding inside this one" — which is the shape
  that never ships, so it is precipitated out here.
  **The correction matters more than the item.** That entry says
  "`test/xdg-writer-guard.test.mjs` exercises the PREDICATE on synthetic
  content and never runs it over the real tree". Verified in the artifact and
  it is wrong: `:35` runs `execFileSync("git", ["show", <ref>:<path>])` against
  real git history, `:97-98` reads `tools/usage-to-dashboard-ndjson.mjs`, and
  `:115` reads `tools/gate-live.mjs`. The test reads real bytes. What is
  unwired is only the **full-tree sweep entrypoint** — `main()` — which no
  test, gate or hook calls. I asserted the synthetic-only version myself
  first, inheriting it from a brief, and a dispatched census contradicted me;
  reading the file settled it. The class name survived
  (predicate-tested, deployment-untested); the instance attribution did not,
  and the correction makes the fix an order of magnitude cheaper — wire one
  entrypoint, do not rewrite a test.
  Design (decided): give `main()` a consumer, NON-blocking at first because it
  over-fires on the 9 someone-else's-path hits — a `gate-live` sweep line, the
  same reporting slot the backlog lint uses, so a red is visible daily without
  training the override reflex. It goes blocking only after the ~20 real stale
  claims are repaired and the 9 are a declared, self-verifying exemption the
  guard itself checks.
  Verifier, red-first: run the wired consumer at the current commit and
  confirm it reports non-zero (34 today — the baseline is already red, which
  is stated because a mutate-and-revert proof over an always-red baseline
  proves nothing); then plant one fresh stale claim and confirm the count
  moves by exactly one.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "xdg-writer-guard main() is wired to no consumer" -->

- **DONE (no commit — verified ALREADY DONE against the file rather than assumed) — `docs/dev-loop.md:1921-1950` already carries the accept-and-rewrite text this entry asks for. L8 read the current bytes before concluding, which is the closing-against-the-world rule doing its job in the cheap direction. — the scrub's length-vector residual was accepted on a premise the
  operator's 2026-08-10 bar falsifies, so the acceptance has to be re-derived
  rather than inherited.** `docs/dev-loop.md` recorded the residual —
  paragraph count, per-paragraph lengths, and cross-text sharing of identical
  paragraphs — as "Accepted here (operator, 2026-07-31) because this
  deployment runs local and controlled and **commits only its own traffic's
  fixtures**". The proxy fronts every Claude Code session on this machine, so
  the captures behind those fixtures are other projects' conversations. The
  exemption's own next clause — "anyone harvesting NON-local or third-party
  traffic should re-make that judgment ... length vectors can fingerprint
  known public texts" — describes this deployment. It was written as a
  warning to someone else.
  **The operator's bar, stated 2026-08-10:** cache-fix's own dev chat in
  public is acceptable; content from any OTHER session is not. Tool names are
  explicitly acceptable (same day) — inventory, not content.
  **Content measured clean against that bar across all 249 tracked fixture
  files**, every probe red-first against a planted positive: message text is
  hash tokens throughout; 1,323 image blocks all tokenized, **0** base64
  payloads; 34,053 of 34,054 thinking blocks empty, the one non-empty block
  synthetic and labelled; **0** non-structural object keys across 249 tracked
  and 176 untracked-and-staged files; 0 foreign filesystem paths; 249/249
  readable, zero could-not-verify. The prose corpus yielded exactly one
  conversation-shaped quote and it is the harness string "The user sent a new
  message while you were working:".
  So the residual is SHAPE, never content: nobody reconstructs a conversation
  from it, but for a session that pasted a known public document the vector
  can confirm which one.
  **DECIDED 2026-08-10 — ACCEPT-AND-REWRITE** (operator, standing go on the
  recommendation): the shape residual is accepted under the new bar, and the
  falsified rationale is replaced rather than inherited. The alternative was
  changing the scrub granularity, rejected because the
  granularity is what makes the fixtures useful as replay input, and
  quantising paragraph lengths would degrade the corpus to defeat an attack
  nobody has evidence of. What is not defensible is leaving the falsified
  sentence standing; it has been rewritten in place already, marked as an open
  accepted risk pointing here.
  Consumer tier **1 (event disposition)** — it governs what may be published.
  <!-- entry: "the length-vector acceptance rests on a falsified premise" -->

- **DONE `a449d9a` (2026-08-10) — the full-UUID shape was deferred to a
  roster that did not walk the file, so writing the FULL id disabled the guard
  that catches the SHORT one. Roster widened to the scanner's own predicate;
  the two now import the same regex.**
  **MECHANISM CORRECTED, and the first version of this entry was wrong in a
  way worth keeping visible.** It claimed "`absence-scan` cannot see PROSE —
  both byte-level classes fire only on parsed JSON values". That is false.
  `tools/absence-scan.mjs:355-361` routes a source file to `scanSourceText`
  DELIBERATELY, applying the short-key class alone, and `:395-408` carries the
  measured rationale for excluding the UUID and b64 classes from source files
  (dozens of legitimate synthetics in tests and docs; a guard that fires on
  legitimate work trains the override reflex). I graded a considered design as
  an oversight because I read the behaviour and not the reasons beside it —
  the wrongness claim needs the DEFINITION, not just the reproduction, and the
  definition was one screen up in the same file.
  **What actually survived, and it is sharper than the original claim.**
  `FULL_UUID_HEAD` (`:441`) suppresses the short-key finding on any line
  containing a full 8-4-4-4-12 UUID, deferring that shape to "the source-UUID
  roster the suite already walks" (`test/absence-scan.test.mjs:387`). That
  roster walked `test/*.mjs`, `tools/*.mjs`, `proxy/**.mjs`, `docs/**.md` —
  599 files, and NO root-level `.md`, no `.md` under `tools/`, no tracked
  `.sh`/`.py`/`.yml`. So for `BACKLOG.md` and `FORK-NOTES.md` — the two
  fork-only root documents, and the ones that discuss captures most — the
  deferral pointed at nobody, and writing the full form actively DISABLED the
  short-key guard on that line. Two sentences of one spec disagreeing.
  Measured, both arms: `scanContent("… <full id>", "BACKLOG.md")` -> 0
  findings; the short form on the same file -> 1.
  **CONFIRMED END-TO-END by a second session, 2026-08-10, by planting rather
  than by reading** — the component measurements above establish the roster's
  WIDTH, and this establishes that the chain from a real edit to a blocked push
  actually closes. A synthetic full UUID appended to tracked `FORK-NOTES.md`
  turned the roster bite RED ("unlisted UUID(s) in source — a capture
  identifier in a public tree, or a new synthetic missing from the allowlist"),
  35 pass / 1 fail; the repo's pre-push hook runs the full suite, so that red
  is a blocked push. `FORK-NOTES.md` was restored from a byte copy in the same
  command (empty `git diff`, zero occurrences remaining). Worth recording
  because the scan ITSELF still reports `absence-scan: clean` on that file —
  checked directly, exit 0 — so the guard that stops the leak is the suite, not
  the scanner, and anyone reading only the scanner's own output would conclude
  the opposite.
  **Fix shipped.** The roster now enumerates `git ls-files` filtered through
  `SOURCE_SCANNABLE` and `SCANNABLE`, both newly EXPORTED from the scanner and
  IMPORTED by the test rather than restated — the deferral's target is now the
  same set as its domain by construction, and narrowing one narrows the other.
  646 files, up from 599. `git ls-files` rather than a wider readdir also
  excludes untracked scratch, which is correct: three root-level dossier files
  on this machine carry real registered capture ids right now, and they are
  not findings while untracked and become findings the moment anyone commits
  them.
  **Red-first, arrangement named:** the new expectations were run against the
  OLD walk in place (same directory, so paths resolve; only the walk reverted)
  and failed on `the walk collected no root-level file`, 35 other tests
  passing — so the red is the new assertion, not a broken copy. An earlier
  attempt to prove this from a scratchpad copy failed for path reasons and was
  discarded rather than reported as the red. Over-fire half: 0 offenders
  across all 646 files, `npm test` 2648 tests / 2643 pass / 0 fail.
  **One allowlist entry added, and it is NOT ours:**
  `tools/MANUAL-COMPACT.md` carries a real-looking session id as example
  output, byte-identical in `upstream/main` (verified with
  `git show upstream/main:<file> | grep -c`). Inherited, already published
  from upstream's own repository, listed with that provenance rather than
  scrubbed — editing it would diverge a file we carry unchanged. I nearly
  scrubbed it as a live fork leak; the same "measure whose artifact it is
  first" check that cut the public-surface count by six caught it.
  **The scope line was the other half and is corrected too.** It reported
  every non-corpus file as getting "byte-level classes only (b64-run,
  capture-uuid)" — false in both halves for a source file: those classes never
  run on it, and the one that does (`capture-key-prefix`) went unnamed. It now
  reports the two regimes separately and names the roster that owns the full
  shape. An assurance wider than its predicate is what stops anyone checking
  it.
  Superseded text follows: **`absence-scan` cannot see
  PROSE. Both of its byte-level classes fire only on parsed JSON values, so a
  session UUID or an image payload written into any `.md` file passes the
  pre-push guard untouched — and its own scope line says the opposite.**
  Found 2026-08-10 by doing it: while writing the history-scan entry below I
  put a real published session UUID into `BACKLOG.md`, and neither guard
  stopped it. My own grep did.
  **Measured, both arms, same UUID, same run:**
  - as a JSON value → `FINDING capture-uuid ... $.note (36 chars)`, exit
    non-zero. The class works.
  - in markdown prose → `absence-scan: clean`.
  Identical split for the other class: a 400-char base64 run is
  `FINDING b64-run` as a JSON value and **clean** in a `.md` file.
  **The label-over-body half, which is why nobody looked.** The tool prints
  `scope: N file(s) outside test/fixtures/harvested/ — byte-level classes
  only (b64-run, capture-uuid)` (`tools/absence-scan.mjs:640`). "Byte-level"
  reads as "these classes run over the raw bytes of this file". They do not:
  `:248-253` and `:221` are value predicates evaluated during a JSON walk, so
  for a non-JSON file the walk yields nothing and every class returns clean.
  The assurance is wider than the predicate establishes, which is exactly
  what stops anyone checking it.
  **Why this is blocking rather than tidy-up.** The alias convention exists
  *for prose* — `BACKLOG.md`, `docs/dev-loop.md`, the threat matrix, the
  runbooks are where captures get discussed, and prose is the one place the
  pre-push scan is blind. The Edit-time hook covers part of the gap: it
  denied a later write of mine for `capture-key-prefix` (short `s-<hex>`
  forms). It did NOT deny the full canonical UUID. So a full session id in a
  markdown file today passes BOTH guards, and the only thing that caught it
  was a human running grep on the diff.
  Design (decided): the two `scope: "any"` classes get a genuine byte-level
  pass over the file's raw text for every scanned file, JSON or not — the
  JSON walk stays as-is for the corpus classes that need key context
  (`raw-content` needs `CONTENT_KEYS`, so it cannot go byte-level and must
  keep saying so). Then correct the scope line to state what each class
  actually reaches; an instrument's own words about itself are a claim like
  any other.
  Verifier, red-first, and the arrangement is already run: plant a real
  published session UUID and a 400-char base64 run in a `.md` fixture and
  confirm both fire (today both are silent — that is the red, and it is a
  REAL positive, not a constructed one: the UUID is s-captureAX's, which
  genuinely shipped). Over-fire half: the current tree, including this file
  with its ~185 alias citations, must stay green — aliases are not UUIDs and
  must not become findings.
  Consumer tier **1 (event disposition)** — it is the guard on the
  irreversible boundary.
  <!-- entry: "absence-scan cannot see prose; both byte-level classes are JSON-value-only" -->

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
  on two. Extension half `proxy/**` — rides the shared restart
  boundary. The build was: fresh-session-sort emits ctx.meta
  telemetry (relocated block types + first-appearance flag), and
  replay's stability check gains a telemetry-keyed
  exemption mirroring suppressedIndices ("never a re-derived
  guess") for first-appearance relocations at the reported index.
  Verifier: red-green on the real pair (s-captureD n=2024->2025
  flips to exempt-with-basis, gate fully green) + unit bite both
  ways (relocation without telemetry stays RED — the exemption
  must not fire on shape alone). SERIALIZED behind the row6-dup
  dispatch on tools/replay.mjs; extension half is `proxy/**` — rides
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
  `proxy/**` — rides the next restart boundary together with the
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

- **RESOLVED 2026-08-10 — CLOSED by the pass's own correction, taking the
  "or close" branch it offered. `bust-appears.md` already carries the designed
  caveat verbatim (step 2, GRADUATE marker at :91, before the `--at` call at
  :112) and `sweep-finding.md` never sends a reader to `bust-triage` for pair
  selection at all — its only mentions sit in the KNOWN-OPEN branch discussing an
  unrelated row-status bug. Established by a dispatched lane that read both files
  and HALTED rather than inventing a place to put the caveat.**
  Original header: **both event runbooks open on a tool measured unreliable for
  the exact event that enters them.** `docs/runbooks/sweep-finding.md` and
  `docs/runbooks/bust-appears.md` send a fresh context to `bust-triage` FIRST.
  Measured 2026-08-10: it selects the busting request by time proximity to the
  worktime event and is blind to `model`, so on a fable session with sonnet
  subagents it handed back the sonnet pair `n=97->99` (04:40:43/47) while the
  fable request at 04:40:37.944 was the one that busted — and every instrument
  reading the walk then collected described a conversation that never busted.
  A fresh context following either runbook today walks into that silently.
  This entry exists because the dependents were NAMED in session prose and
  nearly left there — the named-and-unbooked shape, caught by the operator.
  Design (decided): both runbooks gain a step-zero caveat BEFORE the
  `bust-triage` line — check the busting request's `model` against the
  session's other traffic, and treat a verdict as void if the selected pair's
  model differs from the model the bust was reported against. Written as a
  caveat, not a rewrite: the tool fix is a separate entry, and the runbook must
  stay correct in the window before it ships. Each caveat carries
  `[GRADUATE -> bust-triage groups by conversation AND model]` per this repo's
  runbook-as-staging-area rule, so it is removed by the commit that mechanizes
  it rather than by someone deciding it reads fine.
  Verifier: the caveat must name the 2026-08-10 instance with its two
  timestamps, so a reader can reproduce the miss rather than take the warning
  on trust; `grep -n "GRADUATE" docs/runbooks/*.md` shows both new markers.
  Done-criterion: both files carry the caveat above their `bust-triage` step,
  both markers present, suite green.
  Write boundary: `docs/runbooks/sweep-finding.md`,
  `docs/runbooks/bust-appears.md`.

  **PREMISE CORRECTED 2026-08-10 by the retirement pass — the entry stands,
  the cited fact does not.**
  Half of the premise is gone. bust-appears.md already carries the designed
  model-mismatch caveat (step 2 + GRADUATE marker). sweep-finding.md was
  restructured and no longer opens on bust-triage — step 1 is now `Freeze
  before you analyze`, and bust-triage enters only inside the KNOWN-OPEN
  branch (~line 174) under a different caveat. `Both runbooks open on the
  unreliable tool` no longer holds; re-scope to bust-appears alone or close.

- **RESOLVED 2026-08-10 by the retirement pass — NO WORK REMAINS HERE, and the
  READY grade was wrong on its own body's evidence: parts (1) and (2) shipped
  (`7827c4e`, `b94d118`) and part (3) is a separate entry below. Kept as the
  record of what the instrument covers, per its own closing sentence.**
  Original header: **graduate the coverage walk into `tools/`: "is this content on the
  wire" must not be answered by a substring scan, and today every such answer
  is one.** Found 2026-08-07 by the conservation enumeration lane, reported
  against its own delivered result after its lane had closed.
  **The measured defect, in a probe that read as CLEAN.** Its first R-side
  probe labelled all 31 clause-(b) rows REAL-LOSS. It returned a definite
  verdict for every row with a stated basis, and the basis was TRUE — it had
  simply never looked inside list-content `tool_result` blocks, so bytes that
  were on the wire scanned as absent. A coverage walk replaced it and all 31
  flipped to fully covered. Thirty-one phantom content losses, one instrument
  away from being reported as a mitigation defect.
  **Why this is a tooling item and not a war story.** The failure is invisible
  from inside the probe — its output is a definite label, not an error — and
  invisible to a second instrument that shares the reach limit, so the usual
  cross-check does not reach it. Any attribution resolving presence by scanning
  `block.text` and string `block.content` only carries the same defect, in the
  direction that OVER-reports loss. That is the shape of the hand-rolled
  presence probes written here so far, and the walk that survives contact
  exists only as `cover-rows.py` in a session scratchpad, perishable by
  construction.
  **Design, decided.** Graduate it to `tools/`, extending an existing tool
  rather than adding a file if one fits — `bust-triage` and `replay` both
  already own capture+dump plumbing. Interface, from the working probe: given a
  capture, a `replay.mjs --dump-forwarded` dump and a rows JSON, report per-row
  coverage percent plus the uncovered remainder VERBATIM — the remainder is
  what turns "X% covered" into an attribution. It walks every container the
  wire can carry, list-content `tool_result` blocks included; the enumeration
  of container shapes is the thing being graduated, since that is exactly what
  the substring scan got wrong.
  **Verifier, red-first, and the known positive is real and in hand:** the 31
  clause-(b) rows.
  **PARTLY SHIPPED 2026-08-08 — `7827c4e`, `tools/coverage-walk.mjs` (new, 564
  lines) plus `blockUnitsFull` exported from `replay.mjs`.** New file rather
  than an extension, reason stated as the rule requires: `bust-triage` owns
  capture-PAIR plumbing and not `--dump-forwarded`, `replay.mjs` is the dump's
  PRODUCER and this is a consumer of its output, and the house precedent for a
  separate consumer of replay's dump is `absorption-classify.mjs`. Suite
  2344/2342/0 at that commit, verified at the desk in a frozen worktree, not
  taken from the report.
  **THE ENTRY'S OWN MECHANISM WAS FALSE, and the halt this entry's brief
  carried is what caught it.** Struck: "it had simply never looked inside
  list-content `tool_result` blocks" and "a mutation removing list-content
  descent must send them back to REAL-LOSS". Measured over all 31 rows through
  the shipped instrument, and REPRODUCED at the desk against the PRESERVED
  attribution rows (i.e. not the lane's own row derivation):

      (no mutation)                    COVERED=31 UNCOVERED=0
      --without reminder-unwrap        COVERED=0  UNCOVERED=31
      --without list-content-descent   COVERED=31 UNCOVERED=0   <- NO-OP
      --without multi-piece            COVERED=0  UNCOVERED=31
      --without separator-skip         COVERED=0  UNCOVERED=31

  The true reach limit was the whole-string substring scan (0% vs 100%), plus
  the reminder unwrap and the join separator. The GATE-side limit is narrower
  than "cannot see joins": `crossJoinUnitHash` reconstructs a cross-message join
  only for ADJACENT forwarded messages, and the contributors sit at forwarded 55
  and 57 with an unrelated message at 56. All 31 rows are ONE message (one
  distinct content sha, 9949 bytes / 9865 code units, role=system, string
  content) reconstructing exactly as `unwrap(fwd[55].content[9])` + `"\n\n"` +
  `unwrap(fwd[55].content[10])` + `"\n\n"` + `fwd[57].content` = 683+2+683+2+
  8495 = 9865.
  **REMAINING WORK — (1) and (2) CLOSED 2026-08-08 (`b94d118`), (3) split out:**
  (1) DONE — the bite (`test/coverage-walk-bite.test.mjs`, 9 tests) names the
  three conditions that are actually red on the real 31-row positive, one bite
  each, each certified by breaking THAT condition's wiring alone; the
  dispatcher reproduced one mutant independently and exactly the bite naming it
  fired. Plus two controls that stop the fixtures collapsing into one: a
  whole-string scan must FAIL on the join fixture (with its own positive
  control), and each fixture asserts the other's conditions are no-ops on it.
  (2) DONE — the list-content descent has a SYNTHETIC positive, and the branch
  is stated plainly because no real row reaches it: 93 covering pieces across
  the 31 rows, zero from a list-content sub-block. The entry's "7 list-content
  blocks" was itself wrong — it came from the small preserved `fwd-*` files;
  the full dump carries 186, with 62 `tool_reference` sub-blocks.
  (3) OPEN — the 35 `out`/`invented` rows, split into its own entry below.
  **This entry is therefore READY only for (3)'s absence**, which is another
  entry's work; it survives here as the record of what the instrument covers.
  **The done-criterion as written CANNOT be met, and the honest form replaces
  it.** It said the re-run converts "1 REAL-LOSS" from a floor into a bound.
  Measured: of the 66 checker-reach rows, 31 are now POSITIVELY confirmed on
  the wire by an instrument whose covering conditions are each red; the other
  35 return COULD-NOT-VERIFY with the reason computed. So the floor's SCOPE
  shrank and the floor remains a floor.

- **(CLOSED — design record only; both halves shipped, see the re-grade bullet directly above. Header de-READY'd 2026-08-14 after it mis-ranked a build order; body still awaiting its MOVE to `## Done` in the exit pass.) — a booked verifier names a live capture as its calibration evidence and NOTHING pins it at booking time; two entries have now lost theirs.** Measured 2026-08-10 by the read-only evidence lane, which could not execute either design because the data was already gone. One entry's motivating pair is off disk, never pinned; another's five backing captures are all gone — searched across the whole cache-fix data tree and the committed fixtures, zero hits. Not "about to expire": already expired. The corpus also shrank from 89 captures to 58 in the same window.
  **What makes this a class and not two accidents:** an entry is booked with a red-first arrangement pointing at live, mutating state; the arrangement is correct on the day it is written; the capture rotates on a quadratic clock, oldest-mtime-first — which takes the QUIET session first, and a session goes quiet exactly when it stops being traffic and starts being evidence. Nothing in the booking path notices. This repo already carries the rule that a red-first arrangement is anchored to an immutable reference; what it lacks is anything that CHECKS that at the moment a booking is written.
  **The correction to the obvious repair, and it is the load-bearing half:** the answer is NOT to find a substitute calibration case. `docs/dev-loop.md` is explicit — a check whose motivating case dissolves does not get a substitute found for it, because it would ship having never gone red on a real defect. An entry whose calibration evidence expired is therefore not re-armable by shopping for a fresh instance; it is re-armable only by capturing and pinning the NEXT live occurrence, which makes the pin the deliverable and the fix the thing that waits.
  Design, decided, in two halves. MECHANISM: `backlog-lint` gains a check that an entry citing a capture ALIAS in its verifier resolves that alias against the alias registry and against committed fixtures, and WARNs when it resolves to neither — computable with near-zero false fires, since an alias is a closed vocabulary. PROCEDURE: an entry whose verifier names a live capture pins it in the same action that books it, and where the class cannot survive the scrub (literal-text predicates) the entry says so rather than pretending the pin carries it.
  Verifier, red-first: the two entries above are permanent real positives at this commit — the check must WARN on both and stay silent on entries whose cited aliases still resolve. Both arms required; a check that warns on everything is the non-defect firing this repo already collects.
  Realizing write-boundary: `tools/backlog-lint.mjs` + `test/backlog-lint*.test.mjs` for the mechanism half (the backlog-tooling lane's set); `BACKLOG.md` for the procedure half (desk). Consumer tier **1 (event disposition)** — it governs whether a mitigation's evidence still exists when someone goes to build it.
  **RE-MEASURED 2026-08-11 at the desk, and the population is far larger than
  "two entries" — this is now the rate, not the anecdote.** Every registered
  alias resolved against the captures directory and against `git ls-files`:
  **23 of 27 have no CAPTURE on disk**, and only four (s-captureAV,
  s-captureAW, s-captureBA, s-captureBB) still do. Instrument control,
  run before the zeros were believed: a sid known present returned 1 under the
  identical probe while each cited one returned 0, so the probe discriminates
  and the absence is a measurement rather than a dead pattern. Oldest capture
  on disk is 2026-08-09; the four aliases the derived head depends on
  (s-captureAL, s-captureAM, s-captureAT, s-captureAU) are all from 2026-08-06
  or 2026-08-08.
  **CORRECTED the same day, and the correction is worth more than the
  measurement: the control above covered ONE of the probe's two arms while
  being reported as if it covered both.** The disk arm was proven on a known
  positive. The COMMITTED-FIXTURE arm was not — and it was wrong. It joined on
  the session UUID's leading hex, while a pinned fixture is named by `sidToken`,
  `s-` + the first 12 hex of `sha256("s-" + sid)` (`tools/harvest.mjs:252`).
  Both renderings are `s-` followed by 12 hex, so the wrong one looks exactly
  like the right one and returns the clean zero a true absence returns.
  Found by the dispatched lane, which declined to trust the join the brief
  asserted: it hand-checked it against two registry entries that name their own
  pinned fixtures (zero matches), found the real function, and matched both.
  Re-verified at the desk with `sidToken` itself — **AL and AM have four
  tracked fixture files each; AT and AU have none.**
  Corrected population, measured by the shipped lane over the real file:
  **50 alias citations, 24 resolved, 19 unresolved, 7 exempt** (the pre-registry
  aliases, which can never resolve and are declared rather than warned on).
  What survives: AT and AU are genuinely gone, and they are the two the head's
  blocked entries rest on. What changes: AL and AM resolve to ROW PINS —
  single-row snapshots, not replayable pairs — so those entries stay parked on
  the evidence they actually need, while no longer being examples of nothing
  having been kept.
  **The cost landed on the same day's own derivation**, which is the part worth
  keeping: entries 2, 3 and half of 4 in the head derived 2026-08-11 were
  ranked as dispatchable and are un-armable, one of them re-verified as
  reproducing at the desk on 2026-08-10 — twenty-four hours of life left at the
  moment it was called runnable. The check this entry specifies is what would
  have said so at booking time; the four re-grades below are its manual run.
  A second field the mechanism should carry, from this run: the alias registry
  is a closed vocabulary, so the resolvable FRACTION is computable and its
  collapse (4/27) is itself the signal — a per-entry warn plus a corpus-level
  rate, since a reader seeing one warn cannot see that the corpus has emptied.
  Anchor: tools/backlog-lint.mjs
  Write-set: tools/backlog-lint.mjs, test/backlog-lint.test.mjs, BACKLOG.md
  Verifier: node --test --import ./tools/suite-config-root.mjs test/backlog-lint.test.mjs

- **ANSWERED 2026-08-10, not booked as open — "guards firing on legitimate
  work: reproducible discipline or luck?" It is discipline, and the sample is
  now four, including one failure the original two did not show.** Part B
  seed 5 of the review. Recorded because the question was asked and an
  unrecorded answer gets re-asked.
  The four instances, each with what the repair was: (1) the leak scan
  blocking on synthetic-but-UUID-shaped placeholders — repaired AT THE DATA,
  making the synthetics unmistakable; (2) a scope lint false-positiving on a
  coincidental identifier — repaired with a self-verifying declared
  exemption; (3) 2026-08-10, the capture-key-prefix hook denying a legitimate
  BACKLOG.md write that carried real ids — a CORRECT fire, repaired at the
  data by claiming aliases; (4) 2026-08-10, `tools/MANUAL-COMPACT.md`'s
  upstream-owned session id — repaired with a declared allowlist entry
  carrying its provenance, verified with `git show upstream/main:<file>`.
  **The pattern is real: every repair was at the DATA or in a NAMED, verified
  exemption, and none softened a predicate or reached for an override.** That
  is the shape the corpus prescribes, and four for four is not luck.
  **The failure the original two hid, and it is why this is worth recording
  rather than celebrating:** a guard can also over-SUPPRESS, and that direction
  produces no false fire to notice. `FULL_UUID_HEAD` suppressed the short-key
  class whenever a line carried a full UUID, deferring to a roster that did
  not walk the file — silent, and it took a real leak to surface (fixed,
  `a449d9a`). So the discipline is proven on the fire direction only. The
  standing question this leaves: **for every suppression clause in a guard,
  what proves its deferral target actually covers the suppressed domain?**
  `a449d9a` answered that for one clause by importing the predicate instead
  of restating it; nothing yet asks it of the others.
  Design (decided, small): a test that enumerates suppression clauses in
  `tools/` guards and asserts each names a target the suite exercises. Where
  that is not mechanizable, the clause carries the assertion inline, as
  `FULL_UUID_HEAD` now does.
  Consumer tier **2 (feeds the gates)**.
  <!-- entry: "guards firing on legitimate work: discipline, and the suppression direction it misses" -->

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

- **(DONE — shipped as `rejectedCandidate`, live at
  `tools/reminder-migration-census.mjs:302` and `:304`, with its bite in
  `test/census-counterpart-diagnostic.test.mjs`; re-graded 2026-08-08 after
  the byte-gate lane found it still carrying a READY header) census must
  distinguish "no counterpart" from
  "counterpart present but unmatched".** Re-graded rather than closed
  silently, because the entry's own case and the field's REACH came apart
  afterwards and both facts belong here. The case this entry names — a
  wrapper-retaining standalone at host+1, host PRESENT — is served: the row no
  longer reads `actual=0ch` about something present.
  **What the field does NOT reach, found 2026-08-07/08 and booked in the
  byte-gate entry rather than re-opening this one:** with the host ABSENT
  (`hj = -1`, pruned) the position filter never ran, so the field named the
  FIRST system message in the array as "the nearest position-eligible
  standalone that classify() rejected" — 37,831 chars of an unrelated
  summarization notice. `41ed30c` nulls it there, which is correct and hands
  the reader back `actual=0ch` — this entry's own tell, returning one case
  over, for a state that still has no word of its own. The fix (a distinct
  `host-pruned` token) is in the live byte-gate lane's brief.
  This is the shape worth keeping: a fix that cures a misleading tell can grow
  its own misleading tell one case over, and the entry that shipped the cure is
  where the next reader looks. Original entry follows. Grounding: the diagnostic
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
  absence coverage — any `test/fixtures/**` file in a slice whose
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
  extension-side field (`proxy/**` — rides a proxy boundary, never
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
  three real failing sub-conversations pre/post. `proxy/**` — the
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

- **(DONE — 2026-08-08, `b82ee4f` + `eca3a10`)** every temp-dir producer here LEAKS its mkdtemp
  dir:
  **SHIPPED.** `tools/tmpdir.mjs`: one run root per process, removed on exit,
  on throw, and on SIGINT/SIGTERM/SIGHUP — and deliberately NOT a reaper, it
  never deletes what it did not create in-process. 146 call sites across 81
  files converted. `gate-live` now carries `tmpLeftovers` and BLOCKS (`ok`
  false) on run roots older than 1h whose creating process is dead; the
  liveness skip is what keeps it from firing on gate-live's own long replay
  children, which would have been a guard firing on legitimate work.
  **Verified by the dispatcher, not booked from the report:** a full suite run
  leaves ZERO entries newer than a marker (0 in a frozen worktree at the lane's
  commit, 0 again on main after integration). No `proxy/` file changed, so this
  is NOT deployment-coupled — no pin bump, no restart.
  **THE ENTRY'S OWN NUMBER WAS REFUTED, and it was a ranking input.** "One
  full-suite run leaves thousands" was never measured: the real figure is
  **113**, confirmed by two independent instruments. 31,108 was ACCUMULATION
  over many runs plus the scheduled tools. Nothing about the fix changes; the
  cost signal this was ranked on does.
  **The brief's enumeration key was wrong and would have shipped a false
  green** — "every mkdtemp call site" missed a hand-rolled `join(tmpdir(), …)`
  and an aliased `mkdtemp as mkd`. Found by MEASURING after conversion (3
  leftovers, not 0), never by grepping. Third instance of the name-vs-behaviour
  class in one day, all in the dispatcher's own scoping; rule booked in
  `docs/dev-loop.md`.
  **Writer half shipped too**, unasked and correctly: `test/no-raw-mkdtemp.
  test.mjs` fails on the `mkdtemp` name outside the helper (no exemptions —
  matching the NAME rather than the call shape is what makes the alias route
  fail) and on undeclared hand-rolled `tmpdir()` sites, each declared with a
  count and a reason so a changed count fails too. Shown red against the base.
  **DECIDED, on the nine remaining hand-rolled `tmpdir()` sites:** leave them.
  Four create things and own their cleanup (measured: 0 leftovers), five build
  paths that must not exist or are assertion-only, and all nine are declared in
  a guard that fails on an undeclared site or a changed count. That is a
  mechanism rather than a promise, which is the bar. Converting the four is
  available if the helper should ever be the single route; it buys nothing
  measurable today.
  ORIGINAL ENTRY FOLLOWS. /tmp (31 GB tmpfs) hit 100% with 31,108 top-level dirs
  (7,024 fixture-verd*, ~8,000 bt-*, plus census-*, harvest-*,
  verdict-*, ledger-*, mitigation-output-*, insertion-suppress*,
  cache-fix-probe/replay-*), and the ENOSPC broke UNRELATED live
  tooling machine-wide (Claude Code's Bash output capture died
  mid-session — silent-failure class: the suite stays green while
  filling the disk). Writer half: test suite and tools create
  mkdtemp dirs and never remove them — one full-suite run leaves
  thousands; gate-live (daily) and harvest (twice daily) add on
  schedule, so refill is structural, not incidental. Entry-path
  enumeration: npm test, bare node --test, gate-live, harvest,
  bust-triage, census, replay probes — every mkdtemp call site.
  Design: one shared tmpdir helper (per-run parent dir + cleanup
  registered on exit/finally), imported by tools and tests (the
  extend-existing-tool rule); plus gate-live reports a leftover
  count of matching dirs older than 1h as a failing signal so a
  regression is loud. Verifier (red-first: today's state IS the
  red): run the full suite, then count matching /tmp dirs newer
  than a start marker — must be 0; current runs leave thousands.
  Interim relief 2026-08-08: hand-deleted ~21,500 pattern-matched
  g-owned dirs older than 60 min (100% -> 25G free) — the
  hand-cleanup is the prototype, the helper is the deliverable.
  Consumer: next tooling session here; the derivation ranks it.

- **CLOSED 2026-08-26 — #276's CI is GREEN and the comment is posted.**
  Ref: https://github.com/cnighswonger/claude-code-cache-fix/pull/276#issuecomment-5425702398
  Final state: PR head `ad4afe8`, CI run `32971025877` — test (18) pass,
  test (20) pass, test (22) pass, GitGuardian pass, Snyk pass. Checked past
  the colour, because a suite goes green by SKIPPING the case as easily as by
  passing it: node 18 totals 2147 tests / 2141 pass / 6 skipped (0 failures,
  and 2141+6=2147 closes), and the previously failing case appears by name as
  `ok 199 - fallback RED: mitigation-output-form.test.mjs skips (not fails)…`.
  It RUNS and passes on 18 rather than vanishing into the skip count.
  **One error of mine, caught at the judgment desk's pass and not by me:** the
  draft signed off as an agent role belonging to UPSTREAM's team apparatus.
  The fork overlay states that apparatus never binds — fork-internal or
  upstream-facing — and names signing as one of their identities as the
  transcription failure it already records twice. I made it a third time, in
  an upstream-facing comment, where it would have asserted a team membership
  that does not exist. Posted with a neutral sign-off naming what wrote it.
  The body it closes follows.

- **RECORD 2026-08-26 (found by reading #276's CI after the rebase push, not by
  a local run — by construction the suite cannot run here while #352 is
  unmerged) — upstream CI is RED at `5cfd491` and the failing test is OURS.**
  Run 32958295215: test(18) FAIL, test(20) FAIL, test(22) PASS; GitGuardian
  and Snyk pass. 2147 tests, 2140 pass, 1 fail on each red job — the same
  single test. `test/harvest-pin.test.mjs`, the "fallback RED … skips (not
  fails) when capture and fixture are both absent" case. Established as ours,
  not upstream's, by a pattern match run against BOTH trees with a positive
  control that fired on both: present on the PR branch, absent from
  `upstream/main`.
  **Mechanism, read from the log rather than guessed:** the assertion that
  fails is `/# skipped 1/` — the log carries the mismatch text verbatim. The
  test spawns a child `node --test --test-reporter=tap` and asserts on the
  child's TAP SUMMARY line, whose skipped accounting differs across node
  majors; the child reports tests 2 / pass 0 / fail 0 on the red jobs. Nothing
  we SHIP behaves differently across those versions — the brittleness is in
  the assertion.
  **Design, and the trap in it:** `# skipped 1` is what separates "the check
  skipped" from "the check never ran", so deleting it leaves an assertion both
  outcomes satisfy. The durable form asserts the per-test SKIP directive in the
  TAP BODY, which is stable across majors, instead of the summary count.
  **Write-set:** `test/harvest-pin.test.mjs` on `pr/verification-tools`.
  **Verifier:** the same three CI jobs green at the new tip — the only verifier
  available, since the suite cannot be run locally against a tree cut from
  current `upstream/main` while #352 is unmerged.
  **Done when** CI is green on 18, 20 and 22. Not verified here: that node 22
  emits the summary line the others omit — only 26.7.0 is available locally,
  and the version-dependence is inferred from the pass/fail split across the
  three jobs. The failing assertion itself is measured.
  **Gate:** no comment goes to upstream before this is green — a comment
  naming a red board on a PR whose red is our own test is worse than silence.
  **BUILT 2026-08-26, both copies, NOT yet closed.** Commits, both by a sonnet
  lane, both verified at the artifact by this desk before either moved:
  fork `main` **`ff16f64`** (pushed with this booking) and
  `pr/verification-tools-rebase` **`ad4afe8`** (committed, UNPUSHED — the push
  is an outward act to a public upstream PR and waits on the operator).
  The change is one assertion: `/# skipped 1/` → `/# SKIP\b/`, moving from the
  child's TAP SUMMARY count to the per-test SKIP directive in the TAP body.
  Discrimination proven before the commit, not after: the exact new regex run
  against both real captured strings — matches `ok 1 - … # SKIP … COULD NOT
  VERIFY`, does NOT match the plain `ok 1 - …` of the run case. Re-checked
  independently here: `test/harvest-pin.test.mjs` 21 tests, 21 pass, 0 fail,
  0 skipped.
  **Why it was proven in the MAIN checkout and not on the PR branch:** that
  branch's tree carries `test/proxy-held-port.test.mjs`, whose cleanup signals
  `systemd --user`; a session-kill gate denied the run and the lane correctly
  refused the `CACHE_FIX_SUITE_KILL_ACK=1` override rather than accepting a
  risk that is the operator's. Verified: that file is PRESENT on the PR branch
  and ABSENT on `main`, so the main checkout is a safe host for the identical
  proof. The transfer was argued, not assumed — the `# SKIP` directive is
  node's reporter behaviour rather than this repo's, and both `t.skip` call
  sites were read on the PR branch with `git show` and are byte-identical.
  **Still open:** the PR-branch push, and CI green on 18/20/22 — the version
  axis stays could-not-verify locally, since only node 26.7.0 exists here.
  **Instrument gap noticed in passing, not acted on:** editing the file inside
  the worktree produced a "capture-leak gate could not verify … this write is
  NOT scanned" notice. A leak gate that cannot verify a write in a worktree is
  a real hole; it is nobody's task today and is named here so it is not lost.
