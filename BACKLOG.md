# claude-code-cache-fix (fork) — open operational items

Proxy-domain parking. Deployment-side items (which gates run on which
machine, pins, acceptance records) live in the operator's dotfiles repo;
SYSTEM items — code, PRs, investigations, upstream threads — live here.
Fork-only file, excluded from PR slices like FORK-NOTES.md. One item per
bullet, evidence pointer included.

## Open

- **READY — slice-port preflight: resolve a test file's module-scope
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

- **OPEN/HOT — MERGED-reminder standalone: the 587k's real mechanism
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

- **OPEN — mitigation fire-rate ledger: which extensions still earn
  their keep** (operator question 2026-07-30: upstream may fix CC
  bugs; mitigations should retire on quiet evidence, like corpus
  rules at fire-rate reviews). Today: per-class fire EVIDENCE exists
  (insertion/deferred event logs, guard-events, census per-sweep
  counts) but no TIME SERIES and no retirement consumer — gate
  status keeps only the latest run. Design sketch: gate-live appends
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

- **OPEN/HOT — suppression can strip a request's FINAL message ->
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
  union, never head -1 — and READY, the mechanized form: a
  `--gates-from-capture` replay flag applying the union (names AND
  values, later boots winning) so no operator hand-extracts gates
  at all; the warning text then names the flag as the remedy.
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
  (s-dc3f8071, 25 violations, burst n=372-397) resolved: a session-
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
  red capture is a DIFFERENT class: s-58c979ce n=2024->2025
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
  Verifier: red-green on the real pair (s-58c979ce n=2024->2025
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
  lines in s-dc3f8071, appendFile interleave; mechanism: node
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
  pairs" in s-633915a8 are RESOLVED as instrument artifact: CC
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
  fixture; first pin landed: pinned-s-633915a8-26-28.json, 431 kB).
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

- **READY — upstream-error-log gate ON at the next restart boundary**
  (operator settle 2026-07-30). Unit bites exist
  (test/proxy-upstream-error-log.test.mjs, #235); flip =
  CACHE_FIX_UPSTREAM_ERROR_LOG=1 in the serving unit riding the
  NEXT proxy restart (no dedicated restart), acceptance recorded
  per the doctor's gates-acceptance format in dotfiles; the new
  shape-verdicts alarm entry (Q4 pattern above) is its standing
  consumer — closes the alarm-without-reader gap for this file
  from day one. Done: gate serving + acceptance entry + doctor
  green.

- **RESOLVED 2026-07-30 (probe, dispatcher-booked): forwardedStable
  was a census framing gap — deferred-tool-rewrite is NOT broken.**
  100% of "unstable" pairs coincide with a genuine new-tool
  announcement; held/shared tools byte-identical on every checked
  repeat pair; first-event hypothesis measured out (3/25, 3/37).
  DONE 2026-07-30 (813edc8, sonnet, pushed after dispatcher
  verification: selfcheck exit 0; real capture s-dc3f8071 measures
  heldStable 37/37 against forwardedStable 1/37 — 100%, no
  counterexamples, stronger than the probe's hedge; deviation
  accepted: missing outTools data -> heldStable false, mirroring
  the existing convention). deferred-tool-rewrite's guarantee is
  now measured AS MADE by the daily sweep. Matrix row 6 updated
  same day with the measured number.

- **OPEN — duplicate-request contradiction: ~100 adjacent identical
  pairs vs the booked "one instance in 3,446"** (new per-conversation
  counter, 2026-07-30: 72+28 pairs in 21+2 streaks across the two
  current captures; the 07-29 probe that dispositioned CC#78420
  "ABSENT ON THIS SETUP" likely measured global file adjacency, so
  interleaved sessions broke adjacency — definition mismatch
  hypothesis, unverified). One streak matches the known MCP cascade;
  21 streaks in s-633915a8 (13+ repeats, 3-min spans) unexplained.
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
  distribution on s-58c979ce, acceptance strings citing s-538c0aef)
  still rots with rotation. Spec sketch: `harvest --pin <key> <n..m>`
  freezes a sanitized range as a named fixture; matrix rows and
  acceptance strings then cite fixtures, not capture keys. Effort M.
- **Row 6's isolating query is built and unread (Q3).** findToolsDeltas
  emits exactly the tools-only classification row 6 says "cannot be run
  as-is". With --census now on every sweep, read the answer off the
  next gate status and update row 6. Effort S, blocked on one timer run.
- **Duplicate-request probe → census check (Q1).** The #78420 falsifier
  (adjacent byte-identical bodies) was a throwaway python scan; as a
  census counter it re-answers daily. Effort S.
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
  probe on s-0edbd11c (9de68b3).

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
  with measured false-positive history. Trigger to unpark: a settled
  answer to both, or a second measured flap instance raising the cost.

- **READY — census flap annotation (blockMigration reversal).**
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

- **READY — census: joined-standalone migration target.** blockUnits
  hashes blocks individually, so a standalone that is a JOIN produces
  no migration row — two of the three standalone legs in fixture
  flap-s-0d6f38ba-86.json are joins the detector cannot see, and the
  s-633915a8 oscillation (fixture oscillation-s-633915a8-863.json)
  shows a whole flap class invisible for the same reason. Design:
  register joined-block hashes as migration-candidate targets —
  in-entry joins per 78940a0's "\n\n" rule; cross-message joins
  tagged as their own kind (they are the parked design item's
  subject, and the tag is what will count them). Verifier: red-first
  on oscillation-s-633915a8-863.json — a migration row appears for
  the merged standalone where none does today; existing corpora
  verdicts unchanged. Done-criterion: census on that fixture shows
  the join-standalone row; selfcheck mutation test added per
  dev-loop "Adding a check".

