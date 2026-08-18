# Cache-robustness threat matrix (proactive survey, 2026-07-27)

Purpose: enumerate bust classes BEYOND the four measured 2026-07-27
events, with per-class mitigation status. Consumed at directive
triage — each OPEN row is a candidate directive, ranked by
(probability × blast radius). Evidence discipline: a row is only
CLOSED by a shipped extension or a measured non-event; "should be
fine" closes nothing.

Mitigation policy (operator ruling; first recorded at row 6's
ladder, elevated here 2026-07-30): ANY non-operator-initiated bust
is a prevention target regardless of size — 10k and 500k are the
same class, and cost never gates whether mitigation work happens.
The only per-class deliberation is MITIGABILITY: can the class be
absorbed without risking conversation fidelity (safety outranks
cache). Detectors and fire counts supply specimens and retirement
evidence — never a worthiness threshold.

Retirement policy (2026-08-02, the other end of the Mitigation policy
above): upstream fixes CC bugs, so a mitigation can stop earning its
keep — and "it has been quiet lately" retires nothing. A retirement
carries three things, all three or it does not happen:

  (a) **Ledger evidence.** `~/.local/state/cache-fix/fire-ledger.jsonl`
      (written per sweep by `tools/gate-live.mjs --fire-ledger`, read by
      `tools/shape-verdicts.mjs`'s `fire-ledger` verdict) carries two
      columns per class: RAW — what CC did, measured off the captured
      request bytes, which keeps counting with the gate OFF — and
      ABSORBED — what the mitigation did about it. The claim is
      **"0 RAW occurrences across N sweeps spanning cc-versions >= X,
      where X ships the fix"**, quoted with those numbers. A quiet
      ABSORBED column alone is not it: absorbed goes quiet the moment a
      gate flips, which is why RAW is the column that decides. `null` in
      either column is not 0 — it means nobody measured, and a sweep
      that did not measure cannot contribute to N.
  (b) **A named upstream ref** — issue closed, changelog entry, or the
      version that ships the fix. The CC-side half of the basis: without
      it the quiet is a coincidence of one machine's traffic. Row 4's
      candidate is `anthropics/claude-code#81077` (PostToolUse
      additionalContext re-serialized between turns), logged 2026-08-01.
  (c) **Gate OFF, never code deletion.** Retirement is reversible by
      construction — the built-and-dormant pattern. The re-add trigger is
      mechanical: the RAW column returns after retirement, which is
      exactly why RAW keeps being measured with the gate off. Re-enabling
      takes a fresh acceptance entry, like every other REMOVED entry
      whose re-enable "verlangt eine neue Abnahme".

Not in scope here, and open: per-row retire triggers (each row naming
its own quiet-threshold and upstream ref). The policy is the standing
rule; the rows have not been walked against it.

Grounding policy for mitigation DESIGN (operator ruling 2026-07-31):
the goal is mitigation, and the path to design-complete is walked with
every tool available — parking for missing evidence is not an option, it
is a work item. Where the instruments cannot answer the question, the
instrument is built FIRST and the design waits on it; "we lack evidence"
names the next build, never a shelf.

Byte-match test — the design gate for any NORMALIZATION (2026-07-31,
learned by nearly shipping past it): a normalization that rewrites CC's
form into a canonical one must produce EXACTLY the bytes CC itself emits
in the form being canonicalized toward. Verify by reconstructing the
canonical form from the earlier request and comparing it byte-for-byte
against the later request's real bytes, on EVERY occurrence in the
capture — not one. A rule proven on a single instance is not proven: the
row-4 reconstruction matched host 97 exactly and failed host 99, where
CC's later message carried content that did not exist at the earlier
request. Absent the second check, the mitigation ships looking correct
and moves the bust instead of absorbing it — a normalization whose output
differs from the client's own is itself a mid-history rewrite, in our
name rather than CC's. Corollary for scoping: when the later form carries
NEW information rather than re-serialized information, no normalization
can absorb it; that is a different class and gets booked as one, never
folded into the normalization's claim.

Where a finding goes (2026-08-07, after row 24's cell came to
contradict itself): **a walk, an instance or a measurement about row N
lands as a dated section BELOW the table; the CELL carries only what
the row currently IS — its status and disposition.** The section form
is the one already in use here:

    ### Row N datapoint — <date>: <the finding in a line>

Rows 3, 24 and 27 carry one each and row 4 carries seven. A stamp in
the heading is UTC and carries local time beside it when it is
operator-facing (`… — 2026-08-07 12:58:06Z (14:58 local): …`). The
other dated section below the table is the per-event walk,
`## Event walk <stamp> — <verdict>`, which records one event end to
end. Either form is a section, and neither is a cell.

**And an event walk NAMES ITS ROW, in the heading or its first line.**
Decided 2026-08-08 on a measurement taken while writing this section:
of the five event walks in this file, only two name a numbered row —
the `2026-08-07 05:24:37Z` and `2026-08-07 04:08:35Z + 04:17:25Z`
walks, both "Row 4". The `2026-08-07 09:52:42Z`, `2026-08-07 01:00:55Z`
and `2026-07-31` walks name none within thirty lines of their heading.
(Cited by STAMP, not by line: the first draft of this paragraph carried
line numbers, and inserting the paragraph itself shifted every one of
them by eighteen — a citation that decays as the file it cites is
edited, in the document about labels drifting from their bodies.) That
is not a
style question, because `causeToRow` indexes NUMBERED ROWS ONLY — so a
disposition that lives only in an unnumbered walk is invisible to
`bust-triage`, and three of them are invisible right now. This is the
exact failure already recorded in `docs/dev-loop.md`: on 2026-08-06
`bust-triage` returned UNCLASSIFIED for a cause this matrix had
already dispositioned, because the disposition sat in an `## Event
walk` section the row index could not reach. The reader half was fixed
then and the WRITER half was named and left open — "nothing requires a
CONTROLLED-CAUSE walk to become a row, so the next walk lands in prose
too". This sentence is that writer half. A walk about a class with no
row yet mints the row first; a walk that cannot name one is reporting
an UNCLASSIFIED event, which is the matrix's own stop-and-mint signal
rather than something to write around.

The reason is structural, not tidiness, and it is measured on this
file. Row 24's status is a single table cell of 13,161 characters. It
carries a 2026-08-02 measurement — "mid-session corpus edits are FREE,
only the resume pays", 246 requests over 1h40m — and, a few hundred
words later, a 2026-08-06 addendum asserting the opposite: editing the
global corpus during live sessions "re-bills every one of them from
index 0". Both stood in one cell until the addendum was retracted
2026-08-07 on re-measurement (a live session across a corpus edit:
`messages[0]` 64,006 bytes before and 64,006 after). Neither the author
nor any reader was placed to catch it. An author appending to a cell
that long does not read it first — the addendum says as much in its own
words, "recorded here because nothing else requires one to become a
row" — and on the reading side `matrixRow` truncates the status to 260
characters (`tools/bust-triage.mjs:751`), so every tool that surfaces a
row shows a window in which the contradiction cannot appear. A cell
nobody reads whole is a label standing over its own body, which is the
drift `docs/dev-loop.md` names when it refuses to store a priority
number in a backlog entry; appending to one is how a row comes to
contradict itself in place.

The form was here already and simply was not used — every other walk
that week landed in a section below the table. A section is readable
at its own heading, diffable line by line, and reachable by a reader
arriving at the row from anywhere; a long cell is none of those, and
renders as one unbroken line in every diff.

So a walk that changes a row makes two edits, not one: the finding goes
into its new section, and the cell's status is rewritten to say what
the row is now, pointing at the datapoint that moved it. This binds
what gets written from here on; it is not an instruction to go strip
the history out of cells that have already accumulated it.

| # | Class | Mechanism | Status |
|---|---|---|---|
| 1 | Mid-history insertion (queue splice, notification, tool-result race, task_reminder) | entry inserted at index < tail | MITIGATED-half (ladder, this branch) → NEAR-ZERO (insertion-normalization, this branch) |
| 2 | TTL expiry on idle | 1h clock, no request | **ACCEPTED 2026-08-14 (operator decision) — WON'T BUILD.** The phase-3 keepalive is not built, so an idle-hour cold is EXPECTED cost from now on and a 1h-idle bust triages EXPECTED-BUST rather than KNOWN-OPEN (`matrix-status.mjs` TRIAGE_BY_STATUS: ACCEPTED -> "WON'T BUILD — deliberately unmitigated, cost accepted"). **Do not open an investigation on an instance of this class.** Basis, and it is an arithmetic one rather than a shrug: a keepalive is cost-positive only if the operator RETURNS inside the extended window, and the deliberate case — the operator knows they are stepping away and coming back — is already covered by their own `keep-warm` skill, which fires exactly when it pays off. A proxy-side timer has to GUESS that, and every wrong guess bills a full-prefix cache read per idle window, forever, on every session the machine happens to be holding open. The 2026-07-30 park had already sharpened this to a measurable build trigger (BACKLOG: "a week showing repeated TTL-idle colds with return inside ~2h"); that trigger is WITHDRAWN as the decision criterion, because the skill covers the case the trigger was meant to detect and the remaining population is idleness nobody was planning to return from. What is NOT being built, so a later session does not re-derive it: `docs/directives/proxy-ttl-keepalive.md` stays on disk as the design of record should the decision ever reverse — the design was never the blocker, the return-rate was. Unrelated and untouched by this row: upstream's own cache-warmer directive (`docs/directives/proxy-cache-warmer-v3.7.0.md`, their issue #127) is a separate initiative and this decision says nothing about it. Superseded by this cell: the 2026-07-27 priority-ranking list below still shows "Class 2 (TTL keepalive) — real token math needed; only if idle patterns justify" as item 4; the token math was done (2026-07-30, in BACKLOG) and the answer is this decision. |
| 3 | Proxy restart mid-session | fresh process emits a DIFFERENT serialization of the same request (tools array order/normalization state lost) | DOCUMENTED (session-boundary rule). **UPGRADE CANDIDATE — full prevention:** the restart bust is OUR artifact, not physics — the request content is identical; only the proxy's serialization state differs. Persist every order-affecting normalization decision (sort orders, insertion-normalization canonical, ladder rungs — the latter two already persist) so a restarted proxy reproduces BYTE-IDENTICAL output. Then scheduled + crash restarts both become cache-transparent, and the FORK-NOTES restart rule relaxes to "restart freely". Marker-file attribution remains as the fallback for whatever residue testing finds. **STATUS 2026-07-28: the persistence half is DONE and offline-verified, the live half is NOT.** tools/replay.mjs grew `--restart-at N` (fresh module registry, state dir intact = a real restart) and `--wipe-state-at N` (state dir gone = losing the snapshots, a different event); conflating the two measures a disaster and calls it a restart. Offline over a 602-request capture: restart-at is byte-identical to no restart (0 violations, 57 resets either way), wipe-state-at costs 1 violation. So the state that matters already persists and is re-read per request. The ONE live restart since (17:08) is NOT evidence either way — it flipped three gates at the same time, and VOLATILE_PIN changes the canonical identity scheme, so it paid the documented one-time mode-flip reset (605,220 -> 15,132 cr, 678,522 cc, first request `cause=messages@4`). Two variables changed, one conclusion drawn: confounded. **CLOSED 2026-07-28 19:38 — a live restart cost NOTHING.** Taken at the free opportunity as planned (a restart needed anyway, to pick up an upstream merge; gates unchanged since the previous start). Session 58c979ce was ~805k deep: `cache_read` 805,801 immediately before, 809,920 with `cc=383` on the first request after — it climbed straight through the process restart, and `claude-worktime --cold` recorded no hit (last remained 16:31:06, over an hour earlier). Two independent lines now agree: offline replay (`--restart-at` byte-identical to no restart) and this live observation. The persisted-state design works — every cache-relevant decision is written to disk and re-read per request, so a fresh process reproduces byte-identical output. **AMENDED 2026-07-28 21:46 — "restart freely" holds only for a restart that carries NO change to state KEYS or freeze logic.** A restart with an unchanged key set is cache-free (measured twice). A restart that changes how persisted state is KEYED is not: every baseline becomes unreachable, so the first request per conversation forwards CC's raw array instead of the frozen one, and that is a guaranteed `tools_changed` bust. Measured live: the deferred-tool-rewrite conversation sub-key (row 21's fix) shipped at 21:45:14 and the very next request on the new PID logged `tools=DIFFER cause=tools[Write:reordered, WebFetch:reordered, WebSearch:reordered, web_search:removed] | header:anthropic-beta[-mid-conversation-tool-changes]` while CC's own tools count was a steady 14 across the boundary — the change was entirely ours. 177k in an unrelated live session. It self-heals on the following request (`tools=match` from 21:47:30) and is one-time per conversation, but it is a real cost and it is predictable, so it belongs at a session boundary and should be stated BEFORE the restart, not diagnosed after. The general rule: a change to any state KEY invalidates every baseline that key addressed, and the freeze that made bytes stable is exactly what stops being applied. **The FORK-NOTES "never restart mid-session" rule is obsolete for ordinary restarts**; restart freely, and treat a bust around a restart as evidence of something else (a CONFIG change flipped at the same time is the trap — see the 17:08 restart, which flipped three gates and paid VOLATILE_PIN's documented one-time canon mode change, settling nothing). Residual caveat: one live observation, and code did change alongside it — it simply happened to be output-neutral on that traffic. Strongly supported, not proven. |
| 4 | Mutable tail entries (entry APPENDED then later MUTATED in place, e.g. a queued_command attachment whose origin field gets filled in a later request) | byte-drift at a mid index without reordering | **OPEN — RE-OPENED 2026-07-31** (a non-tail instance was measured; full evidence at the end of this row). Prior status, kept for the record: **CLOSED — ACCEPTED-cheap** (2026-07-28; the evidence arrived and it says do NOT build). The row asked for telemetry first; the 940-request corpus supplies it. The class is real but rarer and far cheaper than assumed: **5 of 838 same-conversation pairs (0.6%), and all 5 mutate the LAST message — `idx == length-1` in every case, all `role=user`.** The cause is not a field being filled in: CC appends content BLOCKS into the existing final user message rather than creating a new one — four are `[Request interrupted by user]` plus the follow-up text, the fifth is the compaction instruction. The row's premise was "byte-drift at a MID index"; measured, the drift is never mid-history. A cache keys on the longest identical prefix, so rewriting the final message re-bills that message alone and everything before it still hits. On our side: **0 insertion-normalization resets, 0 stability violations** across the corpus — the classifier forwards these untouched, which is correct. A mutation-tolerant identity would buy roughly one message and introduce a real failure mode (a genuine tail edit silently forwarded stale). Re-open only if a NON-tail instance is measured — `--census` reports the class as `replace/edit` and `tools/gate-live.mjs` runs daily, so it would surface on its own. **← RE-OPENED 2026-07-31 on that stated condition.** A non-tail instance was measured, live, on the operator's own session: `--census --gates-from-capture` over `s-captureF…-requests.jsonl` reports `replace/edit … n=100->101 edit@98 of 123 [anchor-25] ~75 kB 2026-07-31T11:41:05.778Z` — ~25 messages behind the anchor, not `idx == length-1`. Confirmed independently of the census, by diffing the raw pre-pipeline captures of the two adjacent requests: the message at array position ~99 of 127 lost two trailing `text` blocks (hook context: `PreToolUse:Agent`, `PreToolUse:Bash`) which CC re-emitted as standalone `role:"system"` entries — an in-place content mutation, mid-history. Cost, measured end-to-end: the transcript's own `cache_miss_reason` for the resulting turn reads `messages_changed / cache_missed_input_tokens: 105006`. The closure's other leg is superseded rather than refuted: it argued partly from cheapness ("far cheaper than assumed"), and the Mitigation policy elevated 2026-07-30 — AFTER this 2026-07-28 closure — rules that cost never gates mitigation work. Calibration, so the re-open is not over-read: of 5 MID-HISTORY `replace/edit`s in this capture, only this one is deep (the other four sit 1–2 messages off the tail, ~1–5 kB); and 14/179 pairs (7.8%) vs the closure corpus's 5/838 (0.6%) is ONE session against 940 requests — a signal to re-measure the rate, not a rate. Distinct from row 1: insertion-normalization targets a mid-history SPLICE (its own header: "re-serialize a mid-history splice back into arrival order"); this is a REPLACE of an existing message's content, never in that extension's scope — `--census` accordingly counts it in neither the mitigable denominator nor the absorbed numerator. **MITIGABILITY ANSWERED YES, same day** — the only deliberation this matrix's Mitigation policy allows. The mutation is a deterministic CONTAINER change, not a content change: CC first appends hook additional-context as text blocks INSIDE the preceding message, each wrapped `<system-reminder>\n…\n</system-reminder>` (msg 97: two blocks, 387 + 313 chars), then later emits the same text as ONE standalone `role:"system"` message after the host (idx 98, 627 chars) with the wrappers STRIPPED and the blocks JOINED by `\n\n`. Not byte-identical across the move, and that transformation fully accounts for the difference. Both forms carry identical INFORMATION, so canonicalizing changes serialization only and never what the model reads — the same safety argument row 1's insertion-normalization already makes for the splice direction, mirrored to the replace direction. Design is settled and booked READY in BACKLOG.md: canonicalize FORWARD to the standalone form on every request, so the join is never ambiguously re-split and the A→B transition changes no bytes. This also retires the closure's remaining objection — "a mutation-tolerant identity would buy roughly one message" holds for a TAIL edit and not here, where it buys everything after index 97 of 127 (~75 kB measured). Related: `role:"system"` inside `messages[]` is legitimate wire shape (the `mid-conversation-tool-changes` beta's format, `deferred-tool-rewrite.mjs:16,381`), not an anomaly. **ROOT CAUSE FOUND + FIXED 2026-07-31 (059aae3) — and it was not a scope gap.** insertion-normalization's migrated-duplicate suppression (#76606, decision B) already covered this exact shape. Its telemetry for the busting request reads `action=reset resetReason=not-subsequence pinned=2 suppressed=0`: the pins were restored and the suppression pass was SKIPPED, because `resetKeepingPins` returns before it. The suppression was therefore disarmed by ANY reset — at this file's own measured reset rate, roughly one request in three — so it read as shipped and behaved as absent. Fixed by running suppression on the reset path, reusing the pins it has just restored. Measured on the motivating pair: divergence 97 -> 100, re-bill ~104 kB -> ~96 kB. A second extension (`hook-context-normalize`) was built first, measured WORSE (97 -> 101), and was reverted — the diagnosis behind it came from reading an extension's header instead of its telemetry. Method note worth more than the fix: the header said the class was out of scope, the telemetry said the mechanism ran and was skipped. **Read what the mechanism DID, not what it says it does.** Residual, still OPEN: divergence now lands at 100, the remainder being row 22's pruning plus the EXTENDED class — neither absorbable by a serialization rule. **RESIDUAL RE-GRADED 2026-07-31 (same day, later): both halves of that sentence fell.** Row 22's pruning is a measured non-event on its own (see row 22); the EXTENDED class is absorbable after all — not by predicting bytes but by refusing the edit: EXTENDED is definitionally append-shaped (`reminder-migration-census.mjs:96`, `actual.startsWith(reconstructed)`), so the delta is byte-computable and relocatable to a frozen position (READY item in BACKLOG.md). Also measured on this bust's transcript usage: `cache_read 15,214 / cache_creation 123,032` — the divergence at msg 98 of 124 re-billed nearly the WHOLE context, not its ~19k-token suffix, because no breakpoint survives between messages[0] and the tail. **Billing is all-or-nothing per request**: the replay divergence index measures absorption progress, never live cost — a request with ANY unabsorbed mid-history divergence pays ~full price, so per-request total absorption is the only state that pays. PREMISE FALSIFIED 2026-08-02 (dispatcher-measured, raw request dump): this row's "wrappers STRIPPED and the blocks JOINED with `\n\n`" does NOT hold universally — capture s-captureG (2026-08-02T08:06:10.259Z host=30, and 08:24:18.702Z host=74) emits the migrated standalone at host+1 as `role:"system"` with STRING content, 364 chars, `<system-reminder>` WRAPPER RETAINED, whose inner text is byte-equal (327 ch) to the canonical reconstruction. The rule is right about the TEXT and wrong about the ENVELOPE for that shape, so a forward-canonicalizing normalization would MOVE the bust there rather than absorb it (the census's own MISMATCH verdict said so and was right). Full consequence list and the open questions: BACKLOG.md, "PREMISE FALSIFIED" entry. SCOPE NARROWED 2026-08-02 (prune dossier, transcript-verified): all-or-nothing holds when a miss FIRES; instrument-visible divergence does not imply a miss — 14 interior `role:"system"` removals (f94e53ce, div=4) measured billing-free, so at least that divergence class costs nothing and needs no absorption (BACKLOG, reframed interior-prunes entry: what the cache actually keys on is the open question). **NEW INSTANCE 2026-08-10 evening, live, in the triaging session itself:** `❄ 311k messages_changed (1m)` at 11:23:24Z, session `c7de3d0e`, pair n=408->416. `bust-triage`: census `replace/edit`; row-4 container migration at host 366 (EXTENDED/MERGED-STANDALONE); ATTRIBUTION **CC's** (raw bytes diverged at index 366, replayed census recorded no stability violation). State key stable across the pair, though reported `reset/not-subsequence` on the second side. **The part that is NOT this row's known shape, and is why the instance is recorded rather than tallied:** the edit-anchor check WARNed — `edit@367 of 415 [anchor-47]`, i.e. more than 30 messages from the human anchor, which the tool itself labels *NOT the known reminder-anchoring class*. Four block migrations rode along, two of them cross-message joins (`inline->standalone 366+367->367` and `375+376->376`). **Evidence NOT frozen, and the reason is a mechanism limit rather than a judgment call:** `harvest --pin` writes every record from 0 through m, so freezing this pair (1048..1049 of a 592 MB / 2065-record capture) would have put roughly 300 MB into a public history, against 30 MB for the largest pin tracked today. Booked as a bounded-prefix `--pin` mode. The window is not closed meanwhile: eviction is oldest-mtime-first and this is the most recently written capture, so it is the last to go — but it starts aging the moment the session goes quiet. **NEW INSTANCE 2026-08-10 late-evening, FROZEN — the first row-4 instance whose evidence is committed rather than lost.** `❄ 305k messages_changed` at 18:49:59Z (20:49 local), this repo's OWN dev session — which is why the pin is committable at all, the publication bar permitting cache-fix's own traffic and nothing else. Pair n=220->231. `bust-triage`: census `replace/edit`; row-4 container migration at host 46 (EXTENDED/MERGED-STANDALONE); ATTRIBUTION **CC's** — CC's raw bytes diverged at index 46 and the replayed census recorded no stability violation for the pair, so our forwarded output never diverged earlier than CC's own bytes did. **Same NOT-the-known-anchoring-class WARN as the 11:23 instance:** `edit@47 of 230 [anchor-183]`, more than 30 messages from the human anchor, with five block migrations riding along, two of them cross-message joins (`46+47->47`, `74+75->75`). **The freeze that was impossible this morning is DONE, by the mechanism that instance's own note booked:** bounded `--pin` shipped today (`e9a374b`, its fidelity check `ce975c5`), so `harvest --pin … 302..310 --bounded` wrote 611 records — 99 kept, 212 placeholders, **6.0 MB** against the ~300 MB an unbounded pin would have put into public history — at `test/fixtures/harvested/pinned-s-390797cdcacf-302-310.json`. **Verified as evidence rather than claimed**, per this repo's own rule that a pin is a claim until replayed: feeding the pin's `.records` back out as JSONL reproduces `replace/edit n=302->310 edit@47 of 230 [anchor-183]` with all five block migrations, at 98 same-conversation pairs against the live 98. (The first extraction attempt printed 0 pairs — `jq -r` had exploded each record across lines; the pair count is what caught it, which is exactly why the rule is stated in pair counts and not in exit codes.) **Two anchor-distant instances in one day is a pattern, not a curiosity:** the row's known reminder-anchoring mechanism explains neither, and characterising that far-from-anchor sibling now precedes canonicalizing anything for it. **THIRD INSTANCE, same day, 2026-08-10T19:44:24Z (21:44 local) — 3-for-3 on the anchor distance.** `179k messages_changed`, capture `s-captureBA`, pair `n=143->147`, host 47, EXTENDED/MERGED-STANDALONE, `edit@48 of 168 [anchor-120]`, ~25 kB moved, three block migrations (two cross-message joins `47+48->48` and `66+67->67`, one in-entry `90->91`). ATTRIBUTION **CC's**, settled two ways: CC's raw bytes diverged at index 47, and the replayed census recorded no stability violation for the pair. Frozen as `pinned-s-9365ef5cd8c1-143-147.json` (bounded, 294 records) and replay-VERIFIED under the serving gates to carry this event's own strings (`edit@48 of 168 [anchor-120]`, all three migrations, the >30-from-anchor callout) rather than merely to reproduce something. Datapoint appended to the canonicalization entry in `BACKLOG.md` in the same commit, per the both-carriers rule. Rate remains UNMEASURED — three instances is one day of one machine's traffic and this row carries no denominator. **It also exonerates the D1 dual-read restart minutes earlier**, which the timing otherwise invites blaming: the pair's state key is `296cc2723f48ed4d -> 296cc2723f48ed4d`, stable, and a restart-induced rotation is by definition a flip — operator-corroborated, the bust belonging to another session while the shipping one stayed clean. **FOURTH INSTANCE, same day, 2026-08-10T19:57:07Z (21:57 local) — and the first of a SECOND shape.** `321k`, statusline cause `other` while ledger and transcript both read `messages_changed / 282112` (the FORK-NOTES `other` trap: it means no cause available, never causes-tested-and-rejected). Pair `n=330->335`, census **`splice/insert-mid`**, container migration at host 225, **EXTENDED/NEW-TEXT**, no anchor callout — the anchor annotation rides `replace/edit` rows, so the 3-for-3 anchor-distance signal above does not speak to this one. ATTRIBUTION **CC's**: raw bytes diverged at index 225 and the replayed census recorded no stability violation. **So today is FOUR instances in TWO shapes** — three `replace/edit`/MERGED-STANDALONE/anchor-far, one `splice/insert-mid`/NEW-TEXT — which converts the canonicalization's which-shape-do-you-cover question from a formality into a blocking design input: a rule tuned on the MERGED-STANDALONE remainder has no defined behaviour on NEW-TEXT. Datapoint booked in the canonicalization entry in the same commit. Evidence not yet pinned (command booked with the entry); safe because eviction is oldest-mtime-first and this is the newest capture on the machine. It also exonerates the D1 dual-read restart a second time — `state-key d6a653d5cb224df0 -> d6a653d5cb224df0`, stable, ten minutes after the restart; two busts now bracket it and neither carries a key flip. **PARKED 2026-08-14, with both blockers named and each of them MEASURED rather than described — and the two halves have moved in opposite directions.** *The BYTE half is characterized and is no longer the harder one.* All 16 MISMATCH occurrences corpus-wide are ONE mechanism: CC re-emits the migrated blocks with the `<system-reminder>` wrappers **RETAINED** (row 4's own definition, and `canonical`, assume they are stripped), each block's trailing whitespace removed, joined by the same `"\n\n"`. Under that reconstruction the class resolves completely — **8 WRAPPER-RETAINED-EXACT + 8 WRAPPER-RETAINED-EXTENDED + 0 UNRELATED**, and all 8 EXTENDED remainders sub-classify MERGED-STANDALONE with **0 NEW-TEXT**, i.e. every byte is computable from the PREDECESSOR alone (`trimEnd` is a pure function of the host's own blocks). Mechanized the same day rather than left as a hand-derivation: `mismatchSub`, `wrapped`, `wrappedSub` and — for a residual row — `unrelatedDiag`'s wrapper arithmetic now ride every census run (`f1994ce`, `6020144`), so the next instance is recognized instead of re-derived. What this does NOT do is clear the gate: the census TALLY is still computed against the shipped stripped rule, so it still reports 16 MISMATCH, and the "zero MISMATCH" precondition would be met only by a census whose canonical rule covers both forms — that is the first design step, not a formality. **And the re-census is over the WHOLE corpus, not over the 16.** "Every byte computable from the predecessor" is proven on the MISMATCH rows and on nothing else: the 493 occurrences currently EXACT under the stripped rule are not automatically EXACT under a retained-wrapper one, and assuming they carry over is how a normalization ships having been verified on the population it was fitted to. Whatever rule is proposed runs against all 16,117 same-conversation pairs before it is believed. *The PLACEMENT half is still blocking, and is now the harder one.* Complete distribution, uncapped (`placementOffsets`, added the same day after the first export sampled away its own subject — 200 rows kept of which 190 were the dominant offset, 548 dropped): **521 occurrences at offset +1, and 27 off-mode spread across 20 distinct values from +4 to +110.** Two candidate derivation rules were tested and **REFUTED BY MEASUREMENT, not by argument**: the standalone is not tail-anchored (its distance from the last message ranges 2 to 152 across the off-mode rows, and varies in the +1 class too), and it is not anchored to the predecessor's own length either (`standaloneIndex - nBefore` scatters from -142 to +2 in BOTH classes). **Named missing evidence, the one thing that would re-open the design:** what sits BETWEEN the host and the standalone — the roles and kinds of the intervening messages — which no export currently carries and which is the only remaining place a derivation rule could live. Until that is measured, a mitigation would be picking an index that is right 521 times out of 548, and correct bytes at the wrong index diverge the prefix exactly as badly as wrong bytes. |
| 5 | System-prompt drift mid-session (env block timestamps, /config flips, plugin reload changing skills catalog) | system[] byte change → invalidates everything | PARTIAL: fingerprint-strip + identity-normalization + cc-version-normalize cover known volatile fields; /reload-plugins mid-session remains a true content change (honest bust). Candidate: none — content changes SHOULD bust; keep the strip list current via upstream-change-detection alarms. |
| 6 | Tool-schema drift mid-session (ToolSearch loading deferred tools, MCP reconnect, schema bump) | tools[] change → front invalidation (tools render before system+messages; NO breakpoint can survive it) | **OBSERVED, CAUSE NOT ISOLATED** (2026-07-27 12:47:56, the 175k event). The ledger row for that request carries TWO independent causes, not one: `tools[SendUserFile:reordered, Skill:reordered, ToolSearch:reordered, Workflow:reordered, Write:reordered, SendMessage:added]` **and** `messages@165(user)`. Either could invalidate the prefix on its own, so this event is consistent with the row's mechanism but does not establish it — ranking the co-occurring user injection "secondary" had no basis in the data. Note also that the tools delta is NOT a pure addition (five entries reordered), which is the precondition Phase A of the deferred-tool directive assumes; an event that fails the precondition cannot be the evidence for it. What would isolate the cause: a tools-only delta with no message divergence in the same request. deferred-tools-restore did NOT absorb it. **SPEC CONTRADICTION: Anthropic's own Claude Code caching doc states deferred-tool loads "only append new content and don't disturb anything already cached" — the measured event contradicts the doc.** Upstream bug evidence (file with the 12:47:56 ledger record + doc quote). **Ladder step (a) is BUILT since 2026-07-28** — `deferred-tool-rewrite.mjs` (gate `CACHE_FIX_TOOL_REWRITE`, active) holds `tools[]` byte-stable and delivers new schemas as appended `tool_addition` blocks; the feasibility question this row posed is answered and shipped. What remains open is only the ATTRIBUTION: the 12:47:56 event still carries two independent causes, and no tools-only delta has been isolated. **MECHANIZED and MEASURED 2026-07-30** (BACKLOG "Row 6's isolating query is built and unread (Q3)"): `findToolsDeltas` now rides every `--census` run and `tools/gate-live.mjs`'s status row carries a compact summary of it (`toolsDeltas: {count, toolsOnly, forwardedStable, leaked}`) so the daily sweep answers this row without a hand-run. Measured directly (`node --max-old-space-size=3072 tools/replay.mjs <capture> --gates-from-capture --census`, all 9 boot-declared gates confirmed set including `CACHE_FIX_TOOL_REWRITE=1`), captures s-4b6a435234bf (1492 same-conversation pairs) and s-97097e027ac0 (640 pairs) — capture keys tokenized 2026-08-01 via `sidToken` (tools/harvest.mjs), the same `s-<12hex>` form the committed fixtures carry, applied to every mention of these two captures in this file: the isolating pair the row's opening 175k event could not establish is now directly observable in quantity, not rare — s-4b6a435234bf: 23 tools[] deltas, 15 tools-ONLY (tools moved, messages did not); s-97097e027ac0: 37 deltas, 33 tools-ONLY. That resolves the CLASS question (a pure tools-only invalidation event is common on this fleet) without re-examining the specific 12:47:56 event, which still carries its original two-cause ambiguity untouched by this measurement. **AMBIGUITY RESOLVED same day (bytes probe): census framing gap, NOT a regression.** `forwardedStable` compares whole-array signatures across pairs where a GENUINE new tool was announced — 100% of "unstable" pairs (25/25 and 36/36 on the re-run, zero counterexamples) carry `newNames.length>0`, and the single "stable" row is exactly the no-new-tool case. Byte check on three real repeat pairs (n=40->41, 139->141, 147->148): every held/shared tool name byte-identical; only the new tool's object differs — deferred-tool-rewrite works exactly as its header documents (stability of what was already forwarded, not invariance of a growing array). First-event pairs were only 3/25 and 3/37 — that hypothesis measured out. Fix SHIPPED same day (813edc8): `heldStable` over the shared-name subset rides every sweep — measured 37/37 on s-97097e027ac0 (vs forwardedStable 1/37), zero counterexamples: the guarantee holds completely, the old metric simply measured a different question. Mitigation ladder, strongest first: (a) **rewrite-to-deferred — BUILT:** the API supports defer_loading + tool_addition system-message blocks (mid-conversation tool changes) — the proxy can hold tools[] byte-stable and deliver a newly-loaded schema as an appended tool_addition block instead; investigate feasibility on our API surface before building. (b) session-start PRELOAD list for near-certain tools (SendMessage in teammate-using sessions) — cheap, ships behaviorally today. (c) ride-along scheduling — LAST RESort for whatever residue (a)+(b) leave, not a primary strategy (operator: unavoidable-break framing rejected; treat every non-operator-initiated bust as a prevention target). **NEW INSTANCE 2026-08-10 — the tools-ONLY isolation this row has been asking for since 2026-07-27.** `s-captureAV`, pinned as `pinned-s-dda5c6419d49-372-373.json`; pin replayed via `.records` out as JSONL (a `.json` pin read directly reports 0 pairs and exits clean) and the event SEEN: 351 pairs, 23 conversations, the pinned delta present. Live signal `❄ 263k tools_changed (0m)` at 11:07:05Z. Where the 12:47:56 event carried two independent causes, this one carries one: `kind:membership+`, `msgKind:append-only`, `toolsOnly:true`, ZERO removals and ZERO reorders — no co-occurring message divergence competes for the cause, which is exactly the precondition that event failed. The seven added names are one MCP server's — `mcp__claude-in-chrome__{computer,form_input,navigate,read_page,tabs_close_mcp,tabs_context_mcp,tabs_create_mcp}` — a server connecting mid-session, NOT a ToolSearch deferred load, so this is the `MCP reconnect` limb of this row's trigger rather than the deferred-tool limb. `bust-triage` ATTRIBUTION: **CC's** (raw bytes diverged at index 355; the replayed census recorded no stability violation, so our forwarded output never diverged earlier than CC's own did). First live exercise of the ATTRIBUTION line shipped the same day. **What this instance does NOT settle, stated so it is not read as closed:** replayed with `--gates-from-capture` (10 of 10 declared gates set, `CACHE_FIX_TOOL_REWRITE=1`), `absorptionMisses` is 0 and `heldStable` is TRUE — and yet `outCount` is `27->34`, so the grown array went out on the wire, and `deferred-tool-rewrite` IS in `mutatedBy` for both n=372 and n=373. It engaged and the array still grew. Ladder step (a) above is written as holding `tools[]` byte-stable and delivering new schemas as appended `tool_addition` blocks; had it done that here, `outCount` would have stayed 27. Two readings remain alive and this measurement does not separate them: the rewrite scopes out MCP-sourced tools, or its guarantee is only held-tool stability (which is what the AMBIGUITY-RESOLVED paragraph actually claims) and any growing array front-invalidates regardless. NAMED MISSING EVIDENCE: `deferred-tool-rewrite`'s own per-request stats for the n=372->373 pair — `mutatedBy` proves it ran, never what it did. **ANSWERED SAME DAY by `6fc397d`, and the answer is reading (ii).** The extension now reports its own decision (`announcedNames`, `passthrough[{name,reason}]`) and `findToolsDeltas` carries it. Replayed over the frozen pin with the serving gate config (dispatcher-verified independently, not taken from the lane's report): n=373 carries `announcedNames` = all seven `mcp__claude-in-chrome__*` names and `passthrough: []`; n=370 likewise carries the five `mcp__playwright__*` names. So the MCP tools were NOT scoped out — they went through the documented `tool_addition` announce path, and the one-time array growth is the API's own precondition rather than a miss: the schema must physically sit in `tools[]` with `defer_loading:true` for the `tool_reference` block to resolve (`proxy/extensions/deferred-tool-rewrite.mjs:13-15`, `:450`, opened). **So ladder step (a) is working as documented and the 263k was not a mitigation failure.** What holds byte-stable is what was already forwarded; a genuinely NEW tool costs one front invalidation because tools render above system+messages, which is this row's own opening mechanism. The remaining lever is therefore step (b) — the session-start PRELOAD list for near-certain tools — and step (c) stays last resort. **What this does NOT establish, kept explicit:** the finding is one pin. `passthrough` has never been observed non-empty on real traffic; both of its reason branches (`model-not-allowlisted`, `no-anchor-message`) are proven REACHABLE by constructed bites in `test/deferred-tool-rewrite.test.mjs:976` and `:1004`, so the field is not a predicate that cannot fire — but whether live traffic ever reaches them is unmeasured. Any future bust of this class now answers the question from its own `--census` run instead of by hand. **NEW INSTANCE 2026-08-17 — 686k, and it re-runs the 2026-08-10 finding exactly.** `s-captureBS`, 2026-08-17T21:11:40Z (23:11 local), operator-reported from the busting session itself. Transcript cause `tools_changed`; `cache_read` collapses 697,201 -> 18,142 with `cache_creation` 686,046 at 21:11:39.677Z, `claude-opus-5` on BOTH sides of the pair (the 2026-08-10 cross-model trap checked explicitly, not assumed). `bust-triage`: KNOWN-OPEN / row 6 / ATTRIBUTION **CC's** (raw bytes diverged at index 1607, no stability violation on the replayed pair). Frozen as `pinned-s-ec63519a9167-733-734.json`, pin self-verified reproducing (631 same-conversation pairs, 0 violations, exit 0) — and NOT tracked: at 188 MB it is over GitHub's 100 MiB hard limit, so it lives machine-local at `~/.local/share/cache-fix/bust-evidence/2026-08-17/` (mode 0600), re-verified reproducing the pair AFTER the move, which is the half a freeze claim usually skips. A pin's size tracks the busting CONVERSATION's depth (full prefix from record 0), not the pair's, so a deep session yields an unpublishable fixture; the push-boundary guard for that shipped with this walk (`tools/oversize-blob-guard.mjs`) and the write-side reroute is booked READY. Censused under the SERVING config (13 gates read from `/health`, not defaults): pair n=733->734 is `kind:membership+`, `toolsOnly:true`, `heldStable:true`, `count`/`outCount` both `15->20`, `deferredToolRewriteStats.action:"rewrite"` announcing all five names with `passthrough: []`. So the mitigation again held exactly the guarantee it makes and the array again grew by the API's own precondition — an expected-bust reading of this row's mechanism, not a mitigation failure. **NEW CENSUS ANNOTATION, shipped with this walk: `addition` on every `membership+` row** (`replay.mjs` `classifyAddition`; `additionShapes` tallied into `gate-live`'s status row so the rate rides the daily sweep). It reports whether the added tool's NAMESPACE (`mcp__<server>`, or `builtin`) was already in the previous request's `tools[]`. This instance: `new-namespace`, `mcp__claude-in-chrome`, all five names. Re-run over the 2026-08-10 pin, five `membership+` deltas: four first-appearances (`mcp__thunderbird-mail`, `mcp__qgis`, `mcp__playwright`, `mcp__claude-in-chrome`) and ONE selective load into an already-present namespace (n=321->322, `mcp__thunderbird-mail`) — a discriminating pair drawn from real traffic, not constructed. **CORRECTION to this row's 2026-08-10 limb assignment, which is now labelled UNVERIFIED.** That entry states the 263k was "a server connecting mid-session, NOT a ToolSearch deferred load", derived from reading seven names in prose. The namespace annotation CANNOT settle it in either direction — deferred MCP tools sit outside `tools[]` until something loads them, so a first-time ToolSearch load and a server connecting both read `new-namespace`. What the data does say points the other way: five names arrived here out of the 24 `mcp__claude-in-chrome__*` tools this machine's harness lists as deferred, and a subset is a SELECTION rather than a server's tool set. Which limb fires decides whether ladder step (b) is even the right lever, so this is not cosmetic. NAMED MISSING EVIDENCE: `ToolSearch` `tool_use` adjacency in the pair's own appended messages — the pair is `msgKind:append-only`, so the messages that would carry it are in hand; nothing reads them yet. Booked READY in BACKLOG. **LADDER STEP (b) IS BUILT 2026-08-18 — and it is BUILT, not SERVING, which is the whole difference between this line and a closure.** `deferred-tool-rewrite` now seeds a preload set into a conversation's persisted known-tools array at `no-baseline` only, using bytes LEARNED from live traffic into one machine-local store, marks them `defer_loading` on the wire with NO `tool_addition` block (an unannounced deferred tool is not loadable — that half is safety, not cache), and announces each one at the request where CC finally sends it, without moving `tools[]`. Gate `CACHE_FIX_TOOL_PRELOAD` is a BOOLEAN ("1") — the name set is the `PRELOAD_TOOL_NAMES` source constant, each name carrying its measured evidence, because `proxy/gate-allowlist.mjs` forbids publishing a free-form value while ship-step 4b requires a serving gate to be publishable — and it is UNSET everywhere today, so the code is inert on this deployment until the unit declares it. Scope, from the 2026-08-16 population record: `SendMessage` is 103 of 126 addition events in 24 of the 25 captures that have any, so k=1 covers ~80% of events; the k=10 ceiling is ~89% and the residue is mid-session MCP arrivals — including the 686k instance above — that NO session-start mechanism can reach. This does not close that limb and is not claimed to. Red-first, both arms stated: the nine new bites in `test/deferred-tool-rewrite.test.mjs` run 43 pass / 9 fail against the unmodified extension (every pre-existing bite green, each new one failing at its own call site) and 52/52 with it. The discriminating control is the one that matters — an implementation that stabilised every array would pass the seeded arm and fail the gate-OFF arm, which asserts today's bytes exactly. Counters ride along per closing-gate question 4: `toolPreload {seeded, announced, fallback}` in `gate-status.json` (three-answer — `null`, never a clean zero, when no event file was scanned), and the learned-schema store is registered as a carrier in `state-report`. Restart-transparency is MEASURED rather than argued: `node tools/verdict-ab.mjs eaa1454^ eaa1454` reports IDENTICAL across 3,223 verdict lines over 19 corpora, exit 0 (that tool exits 2 with COULD-NOT-VERIFY on an unreplayable corpus, so the result is a measurement), and `gate-live` over the live corpus under the SERVING 12-gate set is `ok=true` / 0 failing over 20 captures / 12,378 MB with the run's own `code.proxyTree` reading the WORKING tree's fingerprint rather than the serving proxy's — which is what establishes the sweep exercised the built change. **THE SAFETY PREMISE IS NOW MEASURED, and the result is that the property HOLDS while the reason this file and the extension both gave for it was FALSE.** The premise: a tool in `tools[]` carrying `defer_loading: true` with NO `tool_addition` block anywhere is accepted by the API AND is not reachable by the model. Settled 2026-08-18 by a live disposable session through a throwaway proxy on a spare port with isolated XDG dirs (production verified answering afterwards), using the DISCRIMINATING case — a FABRICATED tool name CC can never have registered. `SendMessage` cannot separate the hypotheses: CC's own deferred-tool listing already names it in a teammate-less session, read from the PRE-pipeline capture, so the model loads it whether or not the proxy seeds it. Both halves: the API ACCEPTED the unannounced deferred tool (no 400, request completed) and the model answered ABSENT when asked whether it could see or call it — with the extension's own telemetry and persisted array proving the seed reached the wire, without which ABSENT would be indistinguishable from a probe that never armed. **The mechanism that actually protects it is NOT the one the extension header named** ("the API loads a deferred tool only when its tool_addition block is present in THAT request" — measured false: 4,972 of 4,972 sampled requests carry `defer_loading` tools with NO announcement and zero carry both, ordinary ToolSearch traffic). The real one: the model's loadable-tool view comes from Claude Code's own listing written into `body.messages` from its registry, never from `tools[]`. Corrected in `deferred-tool-rewrite.mjs`. Residual, precisely stated: the risk lives in the preload SET, not the mechanism — a name CC does not universally register is invisible to the model and pins bytes nothing will announce; `SendMessage` is safe on this axis. The gate still does not go ON in any unit until the review's BLOCKING finding is repaired. The absorption half of the done-criterion is likewise unmeasured — `toolPreload.announced` non-zero on a live sweep is what would settle it. **SERVING SINCE 2026-08-18, and the absorption half is now MEASURED — the criterion named in the sentence before this one returned, so it is settled and not probed further.** Gate `CACHE_FIX_TOOL_PRELOAD=1` declared in the unit, pin bumped, proxy restarted; `/health` publishes the gate as `1` (boolean, not `<redacted>` — the allowlist shape the repair lane fixed) across 14 gates. First post-flip sweep (window 09:03:33Z–10:57:55Z, 22 event files): `toolPreload {seeded: 2, announced: 1, fallback: 0}`, `ok=true`, 0 failing over 19 captures. Read independently from the extension's own event logs at the moment it acted — 4 seeds and 2 announces by 11:02Z, 0 fallbacks — which AGREES with the sweep on their shared coordinate: the sweep's window contains exactly 2 of those seeds and 1 of those announces. Two measurements, one window, same numbers. **The `leaked: 2` on the announcing session's census row is NOT a mitigation failure and must not be read as one** — `leaked` is defined as `!forwardedStable` (`replay.mjs:5029`), and `forwardedStable` is the whole-array claim this row's own AMBIGUITY-RESOLVED paragraph already retired as a census framing gap (`replay.mjs:1099-1105`). The counter that carries the guarantee the extension actually makes is `heldStable`, and it reads **2/2 with `heldUnstable: 0`** on that row; the addition shape is `within-known-namespace` for both. **What is still NOT established, kept explicit so the serving line is not read as a closure:** conversations born before the restart are never retrofitted by design, so day-one traffic mixes seeded and unseeded conversations and today's numbers do not isolate a seeded arrival's wire bytes. That isolation exists, but its basis is the pre-ship verification against the real production store (birth seeds one clean marker with CC's learned description/schema; turn 2 byte-identical; arrival → `action: unchanged`, `preloadAnnounced: ['SendMessage']`, forwarded array byte-identical to turn 1), not a live capture. A live-capture isolation of a seeded arrival is the next thing this limb can gain, and it needs only a sweep day where the announcing conversation was also born under the gate. |
| 7 | Cross-request nondeterminism in CC serialization (key order, whitespace) | byte-diff with identical semantics | CLOSED (sort-stabilization, tool-input-normalize) — keep regression tests |
| 8 | Subagent/session cross-contamination (shared key buckets) | wrong snapshot compared → misdiagnosis (not itself a bust) | CLOSED for keying (fc432bf); forensics-only class |
| 9 | Image/media re-encode drift (same screenshot, different bytes) | binary nondeterminism mid-history | CLOSED-presumed (image-strip/image-hash) — add one regression fixture if an image-bearing session ever shows a mid-history image diff |
| 10 | Compaction / context-editing / /rc mid-session | deliberate history rewrite | ACCEPTED-honest-bust (operator practice: /rc from session start; compaction unavoidable at window limit). Normalization rule 3 must keep passing these through — regression-tested. |
| 11 | Model switch / fallback reroute (server-side fallback serves a different model mid-conversation) | cache is model-keyed | ACCEPTED (rare, deliberate). Watch: if fast-mode/fallback ever flips model_id silently, worktime --cold shows cause=model — attribution exists. |
| 12 | Thinking-block replay drift (signature blocks echoed back subtly differently after harness upgrade) | assistant-content byte drift mid-history | OPEN-watch: no measured instance; thinking-block-sanitize covers known shapes. Alarm-only: prefix-diff cause=messages@N(assistant) with no insertion is this class's signature — add it to the runbook's pattern list. |

## Priority ranking (probability × radius, given current traffic)

1. Class 4 (mutable tail) — same session that produced today's events
   likely produces this; telemetry from normalization will show it as
   otherwise-unexplained rule-3 resets. ZERO build cost now: the
   telemetry line already captures resetReason.
2. Class 6 (tools drift via MCP reconnect) — one verification pass
   against today's snapshots ledger; build only if uncovered.
3. Class 3 residual (crash restarts) — tiny: marker file + statusline
   note, pure attribution.
4. Class 2 (TTL keepalive) — real token math needed; only if idle
   patterns justify.

## Bookmark-ladder disposition — REVERSED 2026-07-28 (measured)

The KEEP ruling below is **refuted and the ladder is removed**. Its premise
(b) "zero marginal cost: one otherwise-unused breakpoint slot" was false:
with the slot actually free the ladder produced **57 stability violations on
session 35d72503 and 8 on 58c979ce**, because re-placing a rung moves a
cache_control marker onto a different mid-history message — a mid-history
byte change, which is the very thing it was meant to bound. Premise (a),
defense-in-depth, fails with it: a defense that creates the failure is not
depth. Premise (c), independent failure domains, is true and irrelevant.

Also wrong: "Revisit only if a 4th breakpoint consumer ever appears and needs
the slot back." The trigger was not competition for the slot — it was
measuring what the ladder does when it finally gets to run. An unused
mitigation had never been observed in action, and its disposition was decided
on reasoning alone.

Measured resolution: the 4th slot stays EMPTY (0 violations, both corpora).
Retirement details and the re-adoption bar:
docs/directives/proxy-mid-history-breakpoint-ladder.md.

### Original ruling (superseded, kept for the record)

KEEP the ladder alongside normalization. Reasons:
(a) Defense-in-depth for classifier misses: every rule-3 reset —
    legitimate or classifier-too-conservative — still pays a span;
    the rung halves it. Classes 4, 10, and any unknown-unknown land
    there.
(b) Zero marginal cost: one otherwise-unused breakpoint slot; no-ops
    at budget; inert without its env flag.
(c) Independent failure domains: normalization depends on persisted
    canonical state (resets on corruption/restart); the ladder is
    stateless per-request math and keeps working through exactly the
    events that reset normalization.
Revisit only if a 4th breakpoint consumer ever appears and needs the
slot back — that is the single scenario where ladder retirement is
on the table.

## Second enumeration pass (2026-07-27, method-corrected)

Method correction (operator-prompted): enumerate the SERIALIZATION
SURFACE, not event sources — for each request region (params / tools /
system / messages) × each operation (add, remove, reorder, mutate) ×
each initiator (operator / assistant / harness / upstream): can it
occur without deliberate operator intent, what does it cost, is it
covered? First pass enumerated "things that happen" and missed
inverse operations; the 766k event (tools:REMOVE) was a predictable
cell left blank.

New rows found by the matrix pass:

| # | Class | Evidence/cost | Disposition |
|---|---|---|---|
| 13 | tools:REMOVE + placeholder reorder — harness GC of a loaded deferred tool on skills/tool-list updates | MEASURED 766k (2026-07-27 15:36, CronCreate removed + DeferredToolPlaceholder reordered, no ToolSearch nearby; skills-update system events in-window) | **BUILT — `deferred-tool-rewrite.mjs`, gate `CACHE_FIX_TOOL_REWRITE` (active).** Both halves shipped: removed tools are held in the serialized array to session end, and output order is ALWAYS the first-seen order rather than the incoming array's, which also absorbs pure reorder diffs (the `DeferredToolPlaceholder` move this row measured). Corroborated 2026-07-28: the whole corpus replays with `tools=match` and 0 stability violations. Disposition left reading BUILD for a day after it was built — verified against the source before this edit. |
| 14 | Sidecar requests sharing the session-id header (title-generation etc.) pollute per-session state keyed on that header | OBSERVED in today's ledger: alternating identity blocks/params under one key — prefix-diff attribution noise; for insertion-normalization this thrashes canonical (reset on every sidecar; degrades to no-op, never corrupts) | **SHIPPED 2026-08-11 reading (`5a7093d`, 2026-07-28) — and the headline this cell used to carry ("BUILT, and the row's own remedy proved insufficient") named the SUPERSEDED half while the deciding result sat mid-body, which is the misread this row is a precedent for.** The first remedy was insufficient; the third key component settled it, and the settling sentence is the corpus result below: 0 resets across 940 requests. Verified in the serving source 2026-08-11 rather than re-read from this cell: `conversationSubKey` with the raw-content fallback for STRING content lives at `message-hash.mjs:69-80` and is read by `resolveInsertionSessionKey` (`insertion-normalization.mjs:253-260`) and `resolveToolRewriteSessionKey`, i.e. both consumers the collision hit. (That same key gained D1's optional pre-pipeline override in `246b61d` — row 26 — which changes where the identity is COMPUTED, not the three components this row is about.) The record, unchanged: `(session-id, system-prompt-hash)` shipped and was NOT enough: every subagent of a session runs the SAME agent prompt, so one bucket held 39 distinct conversations and 100% of conversation switches within a bucket reset (60/60) versus 1% of same-conversation continuations. A third component — `conversationSubKey`, the hash of `msgs[0]` — was added, with a raw-content fallback because `hashMessageContent` returns null for STRING content and that null collapsed 56 of 602 requests into one shared "empty" bucket. Result on the current corpus: **0 resets across 940 requests** (was 72 of 83 resets attributable to this keying artifact). General form, now in `docs/dev-loop.md`: an identity computed more cheaply than the thing it identifies will collide, and the collision presents as churn rather than as a bug. |
| 15 | Subagent 5m TTL | CLOSED-already-shipped (STOP finding 2026-07-27: ttl-management.mjs defaults TTL_SUBAGENT="1h" via detectRequestType, issue #14, predates this row — row was written without cross-referencing the extension inventory; ttl-tier-detect carries the overage exception). Residual OPEN (narrow): subagent-scoped telemetry (small ticket). OPERATOR DECISION 2026-07-27: subagent TTL pinned to 5m via unit env (CACHE_FIX_TTL_SUBAGENT=5m) — cost-first (1h writes 2x, assumed to scale into sub weighting; no long silent steps in operator profile); telemetry may measure, any extension is a discussion item on evidence, never automatic. Unbridged verification gap: no captured-traffic confirmation that subagent requests arrive without explicit ttl (snapshot format drops ttl fields) |
| 16 | Safety-classifier fallback reroute (fable→fallback model) mid-conversation = model change = full bust, harness-initiated | Documented harness behavior; not yet observed here | COVERED operator-side (correction 2026-07-27: an operator hook already catches the fallback reroute and stops the session) + ATTRIBUTE fallback (worktime cause=model). No proxy mitigation possible or needed |
| 17 | params region: opusplan plan-mode model toggle | N/A for this operator (fable sessions) | N/A note only |

Residual after rows 13-17 land: mutable-tail (row 4, instrumented),
upstream-bug filing, and the honest operator-initiated set.

## Third enumeration pass (2026-07-27, docs-list × coverage cross-check)

Method: took Claude Code's OWN documented cache-invalidation list +
the grounded request shape (proxy snapshots) and crossed every entry
against current coverage. New findings:

| # | Class | Status |
|---|---|---|
| 18 | Diagnostic blind spots in prefix-diff | CLOSED (323af49): output_config/speed/betas tracked, anthropic-beta header-set diffed (cause `header:anthropic-beta[+..,-..]`), old-snapshot migration-safe, 71/71. Residual (row-14 sibling, attribution-noise only): prefix-diff's resolveSessionKey still keys on bare session-id — sidecars share the bucket; sub-keying deferred to a small follow-up (diagnostic-only, no correctness cost) |
| 19 | Deny-rule tool removal mid-session (bare-name deny removes the tool definition → tools[] change, docs-documented bust) | COVERED as serialization by row 13's hold (definition stays in array; permission enforcement is harness-side at call time — holding is semantically safe). Note: operator-initiated, but easy to do unknowingly |
| 20 | Cross-machine /resume: system prompt embeds cwd/platform/git snapshot → resuming a session on ANOTHER machine is a guaranteed full re-read (docs: cache scoped to machine+directory) | ACCEPT + DOCUMENT (token-cost-model.md): start fresh sessions on the new PC, never resume old ones expecting warm cache. Timely: operator migrating machines |
| 21 | Server-side cache eviction before TTL (capacity eviction, upstream infra) | ACCEPT, DO NOT ATTRIBUTE: no local attribution is possible. **`other`/`unavailable` is NOT evidence for this row.** `other` is a degraded DEFAULT — `claude-worktime.sh:1662` sets it when `cache_miss_reason` could not be read at all — so it means "no cause available", never "known causes tested and rejected". Treating it as confirmation picks one hypothesis from several unruled-out ones (proxy defect, an untracked class, or a cause sitting in the transcript that the statusline's read missed — all three observed 2026-07-27, when a bust displayed `other` while the transcript held `tools_changed`). Undiagnosed busts belong in an unattributed bucket that stays OPEN, not closed onto this row. No local mitigation exists either way |
| 22 | Ephemeral UI turns entering the cached prefix (suggestion-mode: CC injects `[SUGGESTION MODE: Suggest what the user might naturally type…]` turns plus their assistant replies and `"No tools needed for suggestions"` tool_results into the live `messages[]`, then PRUNES them when the real user turn arrives) | throwaway turns are sent, enter the cached prefix, and their later removal rewrites history from the injection point | **ACCEPTED 2026-08-11 (deliberately unmitigated, with a named parked remainder — see the SETTLEMENT at the end of this cell).** Was: **OPEN — NEW 2026-07-31, uncovered by any existing row** (grep for "suggestion" across this matrix and `BACKLOG.md` returned nothing before this entry). Measured on the operator's own session: the pre-pipeline capture shows `messages[]` growing 110→112→…→128→130 and then DROPPING to 124 at `2026-07-31T11:41:05.778Z`. Eight of the removed entries are suggestion-mode scaffolding — `[SUGGESTION MODE: …]` user turns, their assistant replies, and `tool_result` bodies reading "No tools needed for suggestions" — replaced by the operator's actual turn. Note the cost is paid TWICE: once sending turns that were never conversation, once re-billing the prefix when they are pruned. This row is NOT the cause of the 11:41 bust — prefix-diff attributes that to `messages@98(system)`, the row-4 mutation, which sits EARLIER and therefore dominates the re-bill; the suggestion pruning at index 126+ is a co-occurring, independently-real class that would have busted on its own had it been the earliest divergence. Mitigability: UNASSESSED — the honest open question is whether these turns can be recognised and held out of the canonical history without risking fidelity (safety outranks cache), since they are indistinguishable from real user turns by role alone. Next evidence needed: how often the injection fires, and whether the pruning boundary is stable enough to pin. **PROMOTED 2026-07-31 — this row is not merely co-occurring, it is what DISARMS row 4's mitigation.** The pruning is what leaves the surviving canonical entries unusable as a subsequence, and the resulting reset is the state in which insertion-normalization skipped its suppression (row 4). 059aae3 makes the suppression survive a reset, so the coupling no longer costs the row-4 class — but the reset itself remains, and every OTHER behaviour that only runs on the success path is still disabled by it. The question this row now carries is therefore wider than suggestion-mode: WHICH normalization behaviours silently switch off on a reset, and at a measured ~1-in-3 reset rate, what does that cost? Enumerate the success-path -only behaviours before designing anything else here. **PRUNE-BUST MECHANISM REFUTED BY MEASUREMENT 2026-07-31 (probe on this row's own capture).** The claim "would have busted on its own had it been the earliest divergence" does not survive: a drop-scan over the full session capture (per-message hash prefixes, drop events classified pure-tail vs interior) found 12 prune events; 10 are PURE-TAIL-PRUNEs (surviving prefix byte-identical to the previous request), and joining ALL 12 against the transcript's `cache_miss_reason` entries (±90s) shows the 10 pure prunes produced ZERO miss events — the session's only misses are the 11:41 row-4 mutation and a 13:43 operator `model_changed`. Mechanism: the pre-injection request's rotating tail marker wrote a cache entry minutes earlier, well inside TTL, so pruning back to that boundary is a HIT — inject-then-prune is self-healing through CC's own marker rotation, and the suggestion turns' geometry confirms it (injection block 122–129 tail-contiguous; post-prune messages 0–121 byte-identical to the 11:38:59 pre-injection request absent the co-occurring row-4 mutation). The class therefore costs ONLY when a mid-history change co-occurs below the injection point — that is row 4/EXTENDED's bill, not this row's. Residual honest costs: the throwaway tail writes themselves (small, honestly priced) and the canonical resets the prunes cause proxy-side. The row STAYS OPEN solely for the promoted question above (success-path-only behaviour enumeration); the original bust mechanism is a measured non-event. **MECHANIZED 2026-07-31 (404d5fc):** the drop-scan probe is now `classifyPrune` in the census, riding gate-live's daily sweep. The probe's own 10/2 split did not survive its mechanization — the boundary is the ANCHOR (`isHumanTurn`), giving 11 pure / 1 interior on this capture (11:31:58 is byte-shape-identical to the pure events; dispatcher decision, census-hardening report §c1). Corpus-wide over the now-fully-readable 39 captures: 226 drops, 181 pure / 45 interior / 0 unanchored, incl. two near-total re-bills booked as their own BACKLOG item. **SETTLEMENT 2026-08-11 — the UNASSESSED-vs-closeable question, answered against the artifact rather than against its mention.** This cell's own closing condition is the sentence above it: the row "STAYS OPEN solely for the promoted question". That question — which normalization behaviours silently switch off on a reset — is answered by a DELIVERED artifact, `docs/directives/success-path-only-enumeration.md`, read here rather than cited: it labels every extension's behaviours SKIPPED-ON-RESET / SKIPPED-ON-NO-BASELINE / RUNS-ON-BOTH with file:line per item, carries the zero-order finding that `extensions.json` is not the activation gate (`pipeline.mjs:20-70` reads the whole directory; six unlisted extensions are live), names its own unwalked remainder rather than reporting it clean, and its top finding is already a booked READY entry (`validateToolAdjacency` runs on no reset path). With that discharged and the original prune-bust mechanism a MEASURED non-event (mechanized as `classifyPrune`, `404d5fc`), nothing here is buildable-and-undone. What stays is a PARKED sub-question, and it is the residual this row now carries: suggestion-mode mitigability is blocked on pruning-boundary stability — those turns carry ordinary `user`/`assistant` roles, so holding them out of canonical history on a text match risks dropping real conversation, and safety outranks cache. Interior prunes (45 corpus-wide, two near-total re-bills) are tracked by their own entry, not by this row. Re-open this row on either: a measured cost attributable to the injection/prune cycle ALONE, or evidence that the boundary is recognisable by something better than a text prefix. |
| 23 | Description-only `tools[]` change (an existing tool's `description` text edited client-side; `name`, `input_schema`, set and order all byte-identical) | transcript cause `tools_changed` while the message census reads `append-only` — nothing mid-history moved | **RESIDUAL — SHIPPED `fd87e12`, DEMONSTRATED ABSORBING live 2026-08-13; remainder named in the status file and in the datapoint below.** (Was OPEN "mitigation in flight" from 2026-08-02 until the absorption evidence was actually joined; the extension had been shipped the whole time and nobody had asked the second question.) Live instance in the operator's own session: 552k re-written, `tools_changed / 484972`, capture pair 15:53:08.789Z -> 15:53:26.105Z (ordinals 1200..1202). Exactly one tool differed (`Bash`), `input_schema` BYTE-IDENTICAL, description 2907 -> 2984 chars: **77 bytes re-billed 484,972 tokens**, because tools precede messages in the cache prefix. deferred-tool-rewrite behaved as designed (`action=reset reason=tool-schema-changed`) — it holds `tools[]` stable for ADDITIONS and takes the honest reset on any schema change to an existing tool; no clause covered a description-only delta. MITIGABILITY ANSWERED YES, and the boundary is the safety argument: identical `input_schema` guarantees the model cannot emit a call the client is unable to execute, so a stale DESCRIPTION is safe where a stale SCHEMA is not; the new text still reaches the model, in-band, via the announcement machinery the extension already uses for tool additions — same information, different container, which is the argument row 1 and row 4 already make for reminders. Design dispatched: forward the canonical block on a description-only delta, announce the changed description, distinct telemetry; anything touching name/schema/set/order keeps today's reset. Closes on a shipped extension plus a live non-event, per this matrix's own rule. |
| 24 | SAME-MACHINE `/resume` after an accidental exit rebuilds the whole prefix | transcript causes `system_changed` then `messages_changed` on consecutive turns, with no mid-history mutation to blame | **OPEN — MEASURED 2026-08-02, mitigability UNASSESSED.** Distinct from row 20, which is CROSS-machine (cwd/platform/git snapshot) and whose advice — start fresh on the new PC — does not reach this case: the operator resumed on the SAME machine SIXTY-ONE SECONDS after the last request (16:11:51 -> 16:12:52) and still paid **603k (`system_changed`) + 589k (`messages_changed`) = ~1.19M tokens**. Measured across the exit boundary in one capture (s-captureJ, last pre-exit request 16:06:39.773Z vs first post-resume 16:12:42.422Z): ALL THREE cache layers differ. System prompt 11,102 -> 10,090 chars, diverging at char 1269 where the pre-exit prompt carries a `# Communicating with the user` section the resumed one LACKS entirely (~1,012 chars absent, not reordered). `messages[0]` hash changes. Message count DROPS 966 -> 938, so CC reconstructs the array from its transcript rather than restoring the live one. TTL EXPIRY IS RULED OUT, not assumed: every outcome record across the boundary carries `ephemeral5m=0` with all creation on `ephemeral1h`, so the session ran the 1-hour tier and 61 seconds could not expire it. The decisive number is the first resumed request's own usage — `cache_read=0 / cache_creation=603242`, a TOTAL miss rather than a partial one, which is what a rebuilt prefix looks like and what an expired or evicted entry would not (an evicted entry re-reads nothing but would not also change the bytes). Consequence for operator advice, which is the actionable half: resuming FASTER cannot help — the cost is set by what the client sends, not by how warm the server is, and the cache was demonstrably still hot. Mitigability, honest open question in two halves: (a) the system-prompt half might be pinnable to the first-seen form, but serving a stale SYSTEM prompt is a much stronger claim than a stale tool description — it is authoritative instruction text, and here the pin would RESTORE a section the client deliberately dropped; (b) the messages half was FIRST GRADED "probably not mitigable" on one argument (a 28-message-shorter history is not a subsequence, so re-serving the pre-exit array would send turns CC no longer believes exist). OPERATOR REJECTED THAT DEFERRAL 2026-08-02 and was right — it collapsed under one question, since `cache_read=0` was measured while system AND tools were ALSO broken, so it never showed where the MESSAGE layer alone would break. Measured properly on the same pair: the first diverging message index is 0, but only 18 of 938 resumed messages are absent from the pre-exit array (98% byte-identical content, 49 pre-exit messages dropped). The index-0 divergence is a `<system-reminder>` block in messages[0] carrying the CLAUDE.md corpus snapshot — 47,505 -> 49,282 chars, diverging at char 1576 — which grew because the corpus was EDITED during the session, so the resumed process re-read it from disk and rebuilt messages[0] around new text. That is volatile reminder content inside the cached prefix: the same class rows 1 and 23 already mitigate, not a novel one. So the honest grade is OPEN AND PROMISING, not unmitigable — with 98% of content identical, pinning messages[0]'s reminder block to its first-seen form could restore a very long shared prefix, and the in-band announcement pattern can carry the delta so the model still sees the newer corpus. Named missing evidence before any build: where the SECOND divergence lands once messages[0] is pinned (the 49 dropped and 18 new messages must be located — tail, scattered, or a compaction boundary), and whether re-serving a stale corpus snapshot is acceptable when the operator has deliberately edited the rules mid-session. BOUNDED 2026-08-02 by measurement — mid-session corpus edits are FREE, only the resume pays: across the main conversation there are exactly TWO distinct `messages[0]` forms, the first byte-identical across 246 requests spanning 14:25:14 -> 16:06:39 (1h40m, during which the global CLAUDE.md was edited twice and dispatch-discipline once), the second appearing only at 16:12:42 post-resume. The array is frozen once built; `/resume` rebuilds messages[0] from whatever is on disk NOW. So "editing the rule corpus busts the cache" is false for the live session and true for its next resume. MITIGATION DESIGN, and its safety argument is unusually cheap here: pin messages[0]'s corpus `<system-reminder>` to its first-seen form per conversation (rows 1/23 machinery), because the operator's OWN periodic re-anchor hook already re-injects the CURRENT corpus into the conversation at token thresholds — so the newer rules still reach the model through a channel that exists independently, and pinning drops nothing the operator has not already arranged to deliver. Caveat to check at design time: the re-anchor fires on thresholds, not on edits, so delivery is eventual rather than immediate. ESCALATION, operator-set: investigate at opus; if opus finds no design, fable takes a crack — do not close this half on a cheap negative. ROOT CAUSE FOUND 2026-08-02, tools layer — and it is a VOLATILE IDENTIFIER IN THE CACHED PREFIX, the same defect class this proxy exists for, one layer up. Across the resume the `tools[]` block also differs (13 tools both sides, same model), and the delta is exactly ONE tool: `Bash`, name identical, `input_schema` byte-identical, description 1496 -> 1496 chars diverging at char 1331 — `...session_01LBJeKUa423Y1oVYDWQaPmT` becomes `...session_01SdKg8pfHxZGPK1W1MNWhxZ`. CC embeds the SESSION ID in the Bash tool description (the `Claude-Session: https://claude.ai/code/session_<ID>` commit-trailer instruction), `/resume` mints a NEW session id, so the tools block changes on every resume BY CONSTRUCTION — no timing, no TTL, no usage pattern can avoid it, and it invalidates from byte zero because tools precede messages. Confirmed independently: the pre-exit id is the one this session wrote into every commit trailer. MITIGATION: the tools half is ALREADY COVERED BY ROW 23's design — name and input_schema identical with only description differing is precisely the description-only class, so serving the canonical first-seen block and announcing the delta in-band absorbs it; the row-23 build should be verified against THIS pair as a second real case. That leaves the system-prompt and messages layers as the genuinely open halves below. UPSTREAM-REPORTABLE as stated: a volatile session identifier inside a cached tool description guarantees a full re-bill on every resume. Do not build either remaining half before that is settled. PRIOR ART, found after this row was written and credited rather than quietly absorbed: claude-worktime `docs/cache-ttl-verification.md` records the same phenomenon on 2026-07-26 (quit, waited ~1 min, resumed, full 139k rewrite at gap=45s) under the heading "elapsed time is not the only thing that busts a resume", and already named the mechanism as `tools=match, system=DIFFER`. What THIS row adds: the divergence located to a specific missing section (`# Communicating with the user`, ~1,012 chars, 11,102 -> 10,090), plus the two layers that doc did not cover — `messages[0]` changing and the array dropping 966 -> 938 turns — and the TTL ruled out by tier data rather than by argument. PROVENANCE, CORRECTED TWICE — the second correction retracts the first, which was wrong: CC DOES ship a resume dialog. Operator screenshot plus the literal in the installed bundle: "This session is ${age} old and ${tokens} tokens. / Resuming the full session will consume a substantial portion of your usage limits. We recommend resuming from a summary." with options compact / continue / never, rendered from inputs `sessionAgeMinutes` and `estimatedTokens`. An earlier revision of this row claimed no such string existed; that was a BAD SEARCH (patterns for cache/stale/expired and for resume-near-compact) reported as an absence, not a real absence — the negative-result trap this corpus warns about, committed while writing the row that warns about it. Separately, claude-worktime DOES also have its own TTL guard (`CACHE_GUARD_TTL`, `elapsed < TTL*0.9`), which is where the two got conflated. What the dialog settles and does NOT settle: its TEXT cites usage limits and never mentions the cache, which reads as CC expecting a full re-read on resume; but `sessionAgeMinutes` as a gating input is equally consistent with a TTL-shaped threshold, and the numeric threshold could not be extracted from the minified bundle. So the dialog does not decide intent in either direction, and the bug argument must not rest on it. The bug argument does not rest on it: the reportable defect is that the same session, same machine, same cwd, resumed 61 s later, is served a system prompt missing a whole section, which is nondeterministic assembly rather than a documented resume cost. **MITIGABILITY ASSESSED 2026-08-05 (backlog step 0, measured corpus-wide): a messages-layer mitigation is REFUSED on measurement.** Across every live capture, born-large conversation starts (a rebuilt array's signature — first request ≥50 msgs on a fresh `conversationSubKey`, identities imported) number 28; at 24 of the 27 with an in-file comparand the SYSTEM layer broke across the boundary too, this row's own boundary among them, and in the cleanest same-thread-shaped subset (no first-block identity rotation, message count within a few percent) it still broke 4 of 7. System renders before messages, so a `messages[0]` pin buys nothing at the typical boundary; the class stays a CONTROLLED cost (`bust-triage`'s deliberate grading). 20 of the 28 boundaries also rotated the FIRST system block with a repeating ~+2,040-char delta — a distinct born-large population (agent-SDK-identity boundaries, not operator resumes) that the census should learn to tell apart; booked as its own backlog item. **INSTANCE WALKED 2026-08-06 evening — CONTROLLED-CAUSE, and the walk is recorded here because nothing else requires one to become a row.** Capture s-captureAL, 17:40:16Z, **204,513 cache_creation**, transcript cause `system_changed`, fable session. Every sub-mechanism this row names was present and independently measured on the raw pre-pipeline pair n=89 (17:34:43.963Z) → n=91 (17:39:23.557Z): `tools[2]` (Bash) description differs from char 1363, the per-session console URL, with name and `input_schema` identical — i.e. row 23's absorb design would reach it; `system[2]` 9891→9845 B, the env "Recent commits" block, 5 commit lines replaced — also row 5's class; and `messages[0]` 56206→56440 B, the claudeMd `<system-reminder>` corpus snapshot re-read from disk because the global corpus was EDITED between the two requests. `firstDivergence(rawMessages) = 0`, so no output divergence can be earlier and the attribution is CC's by construction rather than by gate verdict — the stability gate never compares this pair, since n=91 opens a NEW conversation identity. This row's own 2026-08-05 grading applies unchanged: the system and tools layers both broke and both render before messages, so a `messages[0]` pin buys nothing here either. **RETRACTED 2026-08-07 — this addendum first read: "the operator-facing half, which this row had not stated: editing the global corpus DURING live sessions re-bills every one of them from index 0". That is FALSE, and the row had stated the opposite already — see BOUNDED 2026-08-02 above, in this same cell: mid-session corpus edits are FREE, only the resume pays, measured over 246 requests spanning 1h40m during which the global CLAUDE.md was edited twice with `messages[0]` byte-identical throughout. A premise and its dependent contradicting inside one output is the stale-premise tell, and here both sat in one matrix cell.** Re-measured independently 2026-08-07 on a live session across a corpus edit at 01:37:48Z: `messages[0]` 64,006 before (01:30) and 64,006 after (01:47), `system` 10,203 both sides — a ~500-byte corpus growth that moved neither. The array is frozen once built. What this walk's pair actually shows is the SAME bounded fact, not a new one: `messages[0]` 56206->56440 because n=91 **opens a new conversation identity** (stated two sentences up as the reason the stability gate never compares the pair) — i.e. a rebuild, which is the resume path the bound already names. The corpus edit is visible at that boundary because the boundary re-reads from disk, not because a running session does. **NOT PINNED, deliberately** (dispatcher, same evening): the two novel findings from this walk rest on the literal `SessionStart:` text predicate, which the scrub destroys, so a pin would replay green and prove neither — the "pin reports success on a fixture that reproduces nothing" shape; the structural half duplicates datapoints this row already carries from a richer capture; and `pinRange` freezes from the file start, i.e. ~30 MB into a public tree. The durable evidence is this addendum plus a SYNTHETIC fixture, booked. **INSTANCE WALKED 2026-08-15 — the FOUR-LAYER CASCADE MEASURED, and it answers this row's own named missing evidence.** Capture s-captureBR, event 15:07:49Z, **919,402 cache_creation**, transcript cause `system_changed`, opus session. Operator-reported; resumed **2m27s** after the previous request (15:04:43.064Z, which carries NO outcome record — aborted — then 15:07:10.081Z). TTL is not in play at that gap, and the preceding request read 913,341 cached tokens, so the entry was demonstrably hot. New instrument: `tools/boundary-layers.mjs` prices a boundary layer by layer in wire order and classifies the message divergence; it produced every number below, and its JSON output is frozen machine-local beside the event-log slice. FOUR divergences, ALL present in the RAW pre-pipeline capture (attribution CC's by construction): (1) `tools[]` at char 17974 — the `Claude-Session: …/session_<ID>` trailer inside Bash's description, this row's own documented mechanism; (2) `system[2]` at char 12222 — the `<env>` gitStatus block, working tree going from two deleted-file entries to `(clean)`, plus five replaced "Recent commits" lines, i.e. **row 29's `<env>` mechanism firing on a RESUME rather than an idle boundary**; (3) `messages[0]` at char 50066 — the claudeMd `<system-reminder>` corpus snapshot, 78,761 -> 80,420 chars, re-read from disk; (4) `messages[115..116]` — **and this is the answer to "where the SECOND divergence lands once messages[0] is pinned": index 115 of 1549.** It is a LOCAL EDIT of exactly two messages, NOT a rebuild and NOT a shift: the resumed array drops one of TWO parallel `tool_use` blocks from an assistant turn and its matching `tool_result` from the following user turn, dropping the pair together so the conversation stays valid. `messages[117..]` is byte-identical at the SAME indices — 1,432 messages, 92.4% of the array; position-blind overlap 1,525/1,549 (98.5%). **CONSEQUENCE — a sharpening, not a reversal.** The 2026-08-05 refusal stands exactly as written: system renders before messages, so a `messages[0]` pin ALONE still buys nothing. What is new is that the history below the prefix is nearly intact, so the obstacle is the three layers ABOVE it plus a two-message edit, never a rebuilt array. **PRICED IN CACHE SEGMENTS 2026-08-16, and the layer percentages this cell used to carry are WITHDRAWN — both of them, the original and its first correction.** The cell read "pinning tools alone recovers 1.5%, +`system[2]` 2.0%, +`messages[0]` 5.2%, all four 100%": a byte fraction of what CHANGED, which is not a recovery, because the readable unit is the span between `cache_control` breakpoints and not the layer. The 2026-08-15 replacement claim ("`tools[]` carries no breakpoint, so pinning tools alone recovers exactly zero") OVERSHOOTS in the other direction and is also withdrawn — a layer with no breakpoint of its own is un-readable ON ITS OWN, which is a different claim from contributing nothing to the span that closes over it. Measured by running `tools/boundary-layers.mjs` on this event rather than reasoning about it: this request carries breakpoints on `system[1]`, `system[2]` and the last message only, giving THREE segments — `[tools, system[0], system[1]]` 38.9 kB ending at `system[1]`, broken by **`tools` alone**; `[system[2]]` 12.6 kB, broken by `system[2]`; `[messages[0], messages[1..]]` 2.5 MB, broken by `messages[0]` and the tail edit at 115. So the SMALLEST USEFUL FIX is `tools` by itself — it makes the 38.9 kB first span readable, which is small and is NOT zero — and each later span then needs its own layers matched before it can be read, prefix caching being cumulative. That is what makes the class absorb-all-four-or-nothing for the BODY while still leaving a real first-span recovery for the tools pin this repo already ships. The class is **absorb-all-four-or-nothing**, which is why every previous single-layer design correctly measured as worthless. **THE LINCHPIN, measured rather than argued.** The proxy's own per-conversation state key ROTATED across the boundary: `…-2719b7a4-8067f43a66beb9f3` (`append-only`) -> `…-2719b7a4-aa5eb6d0c37ed62e` (`reset`, then `no-baseline`). The system-prompt sub-key did NOT move — `2719b7a4` on both sides, because `systemPromptSubKey` hashes `system[0]`, which was byte-identical — so it was `conversationSubKey`, i.e. `messages[0]`, that rotated. Every persisted mitigation keyed on that identity, `deferred-tool-rewrite`'s canonical tools included, was therefore stranded at precisely the request that needed it and forwarded CC's raw array unchanged. **So a four-layer absorption is GATED on a resume-tolerant state key: without it no pin can be read, and layer 1 is already built and already disarmed.** Booked in BACKLOG with that as its first link. **TWO INSTRUMENT DEFECTS FOUND BY THIS WALK, both fixed the same session** (they are why the numbers above are not the ones the tool first reported): `bust-triage`'s lineage stage took the ARGMAX of `lineageOverlap`, which normalizes by the smaller set, so a short 2h13m-old request scored 1.0 and beat the true 2m27s predecessor — every downstream line was computed over a pair that never busted; and `stateKeyAt` joined event-log records by time alone, so a one-message haiku sidecar 6ms away won both sides and the reported flip was between two sidecars. Fixed as overlap-admits/recency-selects and a conversation-scoped join, each red-first (`test/bust-triage-lineage-recency.test.mjs`, `test/bust-triage-state-key-tenant.test.mjs`). |
| 25 | A relocated `<system-reminder>` block DEPARTS — CC stops sending the instance `fresh-session-sort` had relocated to `messages[0]` | the extension re-derived its relocated set from the CURRENT array, so our forwarded `messages[0]` lost the prepended block while CC's own `messages[0]` was byte-identical: CC's edit at index k became OUR edit at index 0 | **MITIGATED 2026-08-05 (per-conversation relocation memory) — and the occurrence that opened the row cost NOTHING, which is the more useful finding.** Measured on capture s-captureAB, pair n=331 -> n=336 (the ~413k-token session): the mcp block sat at raw msg[3] from n=325 through n=331 and was absent from n=336; forwarded `messages[0]` carried four blocks then three (`--dump-forwarded 331:0,336:0`), CC's raw `messages[0]` three blocks with identical hashes on both sides. Gate: `outDiv 0 / inDiv 3 / ccIdenticalAtOutDiv true`, attributed to fresh-session-sort by its own bisection. **The pin was never the mechanism.** `pinBlockContent` holds a block's BYTES stable while it is present; between those two requests the block was absent, so nothing consulted it — presence was the unheld axis, and the handoff's opening question ("why did the pin not hold") had no answer because it was the wrong question. **COST: zero, on this occurrence.** CC changed `tools[]` 11 -> 9 entries (different names and bytes) and its first system block 57 -> 62 chars in the SAME request, so the cache prefix `[tools][system][messages]` was already broken two levels above messages. The row was carried into a handoff as the most expensive open item in the repo on the strength of `outDiv 0` alone. The reading that fixes this is now a FIELD, not a paragraph: every stability violation carries `prefixAboveMessages {ourToolsIdentical, ourSystemIdentical, ccToolsIdentical, ccSystemIdentical, intact}`, and the human line prints `[prefix ALREADY broken above messages: tools+system changed -> no marginal cost]` or `[prefix above messages INTACT -> the whole message array re-bills]`. `intact` is the OURS side because ours is what bills — and the two sides come apart exactly where deferred-tool-rewrite is doing its job, holding forwarded tools stable while CC churns. **Mitigation:** `_relocatedByConversation` (fresh-session-sort), keyed by `resolveInsertionSessionKey` — imported, not re-derived — serves a remembered block whenever CC sends no instance of that type; CC's newer bytes always win, so a genuine content change still resets. The key includes the system-prompt sub-key, which drops the memory exactly when a system change has already broken the prefix above messages, i.e. only where dropping it is free. Conservation covers the re-serve by F-side clause (e): a declared re-serve of bytes the gate itself verified earlier in the same conversation. **RATE, now measured rather than assumed** (the census class shipped the same day, `findRelocDepartures` in replay.mjs — a REPORT, not a gate): s-captureAB carries **2 departures across 342 same-conversation pairs**, and they price differently — n=48->49 (`deferred`, from raw msg[1]) with the forwarded prefix INTACT, n=331->336 (`mcp`, from raw msg[3]) with it already broken. An earlier version of this row said the capture held exactly one departure; that was a hand-read and it was wrong, which is the argument for the class existing in the census at all. **THE FIX IS PROVEN LIVE, on traffic from the afternoon it shipped.** Capture s-captureAC carries two departures the census grades costly (`mcp` leaving raw msg[3], n=120->123 at 15:32:47Z and n=254->259 at 16:19:54Z, `prefixAboveMessages.intact: true` on both). Replayed under the PRE-fix build (76658d8) that capture produces exactly two stability violations — `n=120->123` and `n=254->259`, both `outDiv=0 / inDiv=3 / ccIdenticalAtOutDiv=true`, both attributed to fresh-session-sort by the gate's own bisection — and under the shipped build it is CLEAN (exit 0, stability 0, 5 exemptions). Same capture, same gates, one variable. Neither event was visible to the earlier counterfactual because both postdate the 14:51Z pre-fix sweep. **What that saves, stated to its reach and no further.** CC's own array diverged at index 3 in both pairs, so the fix does not prevent the re-bill — it prevents the AMPLIFICATION of CC's index-3 change into our index-0 change, which recovers messages 0..2. Measured on those requests: 82,525 B of 419,264 B (19.7% of the array) at n=123, 81,814 B of 131,191 B (62.4%) at n=259 — messages[0] alone is ~52 KB of each. The requests' own outcome records, served live by the pre-fix build, read `cache_read=10,412 / cache_creation=150,214` at n=123 and `10,412 / 46,827` at n=259. What the recovered prefix converts to in BILLED tokens is NOT measured here: that depends on cache_control breakpoint placement, and a prefix ending mid-array is only readable if a breakpoint covers it. The unbilled-cost claim stops at the byte level. **The earlier grading, kept because it was wrong in an instructive way:** Neither sweep reports a stability violation at n=48->49 — not the post-fix one (16:00Z, `proxyTree e20ece6439f4`) and not the pre-fix one (14:51Z, `3c14d4fd3446`), which is the counterfactual: under the old code that departure cost nothing either. So the extension had never relocated that type for that conversation, and there was nothing to lose — reading (a) of two the census cannot separate on its own. What would prove engagement is a departure whose predecessor carries a `relocated` declaration for the same type; none has been observed yet. **Restart:** covered — the memory persists (audit amended to stateful-PERSISTED), with the byte-identical-restart case in `test/proxy-restart-transparent.test.mjs` and its fail-open control. **THE STANDING RED, explained and converted to a declared exemption (2026-08-05 fresh-context review).** The post-fix sweep still failed s-captureAB's own n=331->336, which this row never explained: the memory is keyed through `systemPromptSubKey`, and CC swapped its first system block ("You are Claude Code…" 57 chars -> "You are a Claude agent…" 62 chars) in the same request, rotating the sub-key (2719b7a4 -> 0d706285) — the memory sat stranded under the old key, so the fix structurally cannot absorb its own originating case, and does not need to: the rotation's cause is a wire-visible system change that re-bills everything after system anyway. Carrying the memory across rotation was considered and rejected (it would re-open the sidecar collision the sub-key exists to close, or buy bytes already re-billed). The gate carries `memoryStrandedByKeyRotationExemption` (replay.mjs): five conditions, all telemetry or imported identity — prev declared holding the relocated prefix at the flipped slot, cur declares nothing, CC's bytes at outDiv identical, the first-system-block sub-key rotated, and `ourSystemIdentical === false`. That last condition is the exemption's own retirement trigger: if anything upstream ever stabilizes the forwarded system prompt, a stranding stops being free, the condition stops holding, and the violation returns by construction — the gate re-arms exactly when the freeness coupling breaks. Bites: green on the stranding shape, red on each condition removed singly (replay-gate-selfcheck); demonstrated on the real capture (exit 1 -> exit 0, exemption row carries both sub-keys). **Residual, PARKED (BACKLOG): eviction stranding** — the memory is LRU/prune-capped at 256 conversations, and a conversation quiet past both caps loses its block with the prefix INTACT, the original full-cost flip; promotion evidence is a costly departure row whose predecessor declared `relocated`/`reserved` for the same type, which the daily `relocDepartureRows` already emit. |
| 26 | A relocated `<system-reminder>` block ARRIVES — `fresh-session-sort`'s FIRST relocation of a type into `messages[0]` rotates the conversation sub-key that every DOWNSTREAM stateful extension keys on, so our own mitigation destroys their state | transcript cause `tools_changed` with CC's raw `tools[]` byte-order IDENTICAL across the pair; `deferred-tool-rewrite` logs `no-baseline` and `insertion-normalization` logs `reset`, both at the relocating request's millisecond, both under a conversation sub-key that appears in no earlier request | **SHIPPED 2026-08-10 (`246b61d`, instrument repair `a5f1960`), BRIDGE PENDING RETIREMENT — see the VERIFICATION ADDENDUM at the end of this cell for what was established against the running system and what was not.** Everything from here to that addendum is the isolation record as it stood while the row was open, kept because the mechanism is the reasoning the fix rests on. Row 25's mirror image: that row is a relocated block DEPARTING, this is one ARRIVING, and the cost lands one prefix level higher. Measured on capture s-captureAE, raw pair n=166 -> n=167 (2026-08-06T09:59:02.225Z): **216,060 cache_creation tokens, transcript cause `tools_changed`** (worktime row `cc=216060 mtok=178466`). **The chain, each link measured rather than reasoned.** (a) Conversation identity is `conversationSubKey(messages)` = the hash of `messages[0]` (`message-hash.mjs:48-63`), and both stateful extensions call it on the body as it reaches THEM — `insertion-normalization` at order 395, `deferred-tool-rewrite` at order 425 — while `fresh-session-sort` runs at order 250 and prepends the relocated block into `messages[firstUserIdx]` (`fresh-session-sort.mjs:474-477`). The identity is therefore computed over bytes WE invented. (b) The raw sub-key is identical on both requests of the pair — `7741083f1d475059`, computed with the repo's own exported `conversationSubKey` over the pre-pipeline capture, not re-derived. (c) At 09:58:53.301Z `deferred-tool-rewrite` logged `action=rewrite injected=1` under `…-7741083f1d475059`; at 09:59:02.231Z it logged `action=no-baseline` under `…-0adfdad6b91abb0e`, and `insertion-normalization` logged `action=reset` under the same new key in the same millisecond. `fresh-session-sort`'s own memory file — keyed `7741083f1d475059`, because it runs BEFORE the mutation it makes — was created at 09:59:02.228Z holding exactly one block, `skills`, 14,593 chars. (d) **Falsification probe with a control:** prepending that remembered block to the raw `messages[0]` of n=167 reproduces `0adfdad6b91abb0e` exactly, while a sentinel block in the same position yields `f4cef8bb94f72c13` — so the new key is the relocation's, not any-mutation's. **Why it re-bills everything.** `no-baseline` forwards CC's array untouched where `rewrite` forwards the frozen held order (`deferred-tool-rewrite.mjs:779-781`), so the previously-forwarded frozen array and the now-passthrough array disagree: prefix-diff at 09:59:02.231Z records `toolsMatch:false` with `tools[SendUserFile:reordered, Skill:reordered, ToolSearch:reordered, Write:reordered, SendMessage:reordered]` — five entries, the row-6 signature — against CC's byte-order-identical input. The cache prefix is `[tools][system][messages]`, so this lands ABOVE messages and nothing below survives. The `messages[0]` flip the relocation was ACCOUNTED for is real and, on this request, not even the expensive half. **Why every gate stayed green.** `replay` exempts the pair by name: `n=166->167 inDiv=13 outDiv=0 <- fresh-session-sort:first-appearance-relocation (skills)`, telemetry-backed by `relocated[].firstAppearance`. The exemption is correct about what it names — the deliberate one-time `messages[0]` cost — and silent about what it does not: **nothing asserts the forwarded `tools[]` held across a first-appearance relocation.** Row 25 built `prefixAboveMessages` for exactly this distinction and the exemption path does not consult it, which is the repo's own entry-path rule (dev-loop, "a mechanism that guards one route is not a guard") landing on the guard that row's own fix installed. **Second instance, same capture, same morning, no recorded cost:** `n=86->88` at 09:48:49.689Z, `first-appearance-relocation (mcp)`, carries no cold event. Why is NOT established — the first thing to check is whether `deferred-tool-rewrite` held a baseline under the pre-rotation key at that moment, since with nothing held there is nothing to lose. **Rate is unmeasured**: two first-appearance relocations in one capture is one session, not a rate. **MITIGABILITY: yes, and the design question is which end to fix.** Conversation identity is a property of CC's conversation, so deriving it from a body we have already mutated is the repo's own hand-rolled-identity error committed against ourselves — the candidate fix is to resolve the sub-key ONCE from the raw body (early, into `ctx.meta`) and have both stateful extensions read it, rather than each re-deriving from whatever reaches them. Rejected on sight: reordering `fresh-session-sort` after order 425, which trades this for the relocation no longer being visible to the extensions that must see the forwarded shape. **Row-3 declaration required before shipping any of it:** the fix CHANGES STATE KEYS for two extensions, so the restart is not cache-transparent and every live conversation re-baselines — price it with `tools/restart-exposure.mjs --match` first, not against the corpus. **Evidence frozen, and the freeze does NOT hold:** `pinned-s-468303a4d2d0-166-167.json` replays with 0 stability exemptions across 136 compared pairs (records fed out as JSONL — pointing `replay.mjs` at the `.json` pin reads 0 pairs and exits clean, which is a false clean, see dev-loop), because the sanitizer destroys the literal prefixes all four relocatable-block predicates key on (`isSkillsBlock`, `isHooksBlock`, `isDeferredToolsBlock`, `isMcpBlock`, `fresh-session-sort.mjs:17-32`) — measured: "The following skills are available" / "hook success" / "MCP Server Instructions" / "The following deferred tools" each 0 hits in the pinned fixture against 107–170 in the live capture. `fresh-session-sort` is structurally unexercisable on the harvested corpus, so the durable evidence for this row must be SYNTHETIC (BACKLOG, and dev-loop's "Corpus hygiene" now records the class). **ADDENDUM 2026-08-06 — the surviving corpus carries the MECHANISM and not the COST, measured rather than assumed.** The backlog's tools-condition check (a first-appearance relocation must also hold the forwarded `tools[]`) was to be demonstrated red on this row's `n=166->167`; that capture has since been evicted, so every first-appearance-relocation exemption still on disk was enumerated instead, at HEAD's build over the serving gate set: **12 pairs across 5 captures — s-captureAI n=49->50; s-captureAK n=160->162, n=171->174; s-captureAB n=179->180, n=184->185, n=324->325; s-captureAJ n=38->40; s-captureAC n=48->50, n=62->64, n=225->227, n=229->231, n=277->278 — all `mcp`, all `outDiv=0 / inDiv=1`, and all twelve report `prefixAboveMessages` fully INTACT: forwarded `tools[]` identical, CC's `tools[]` identical, forwarded system identical.** So the proposed condition would fire on none of them. What is NOT absent is this row's link (c): at each of the twelve relocating requests' own millisecond, `deferred-tool-rewrite` logs `action=no-baseline injected=0` under the post-relocation key (`*-deferred-tool-events.jsonl`) — the sub-key rotation happens every time. The flip to a divergent forwarded array needs a second condition the twelve never met: a frozen order held under the PRE-rotation key that disagrees with CC's passthrough array. That is the difference between a 216,060-token event and twelve free ones, and it means the class is live while its cost is intermittent — a rate this corpus cannot estimate, since the one costly instance is exactly the capture that rotated out. Instrument note for anyone re-running this: `toolsFingerprints().sig` is `null` for a side carrying no `tools[]`, and `null === null` renders as "identical", so a table of `ourToolsIdentical` values is an absence wearing a verdict's clothes until presence is shown separately — checked here, every one of the twelve `cur` requests carries a real raw `tools[]` (9 or 11 entries; two of the five captures do contain tool-less requests, 15 of 145 and 24 of 383, so the hazard is real in this corpus). **SECOND MEASURED INSTANCE, 2026-08-10, on a DIFFERENT capture — and it arrived from an entry that did not know it was this row.** The backlog entry "attribute the state-key FLIP that disarmed row 1's mitigation on a live 141k bust" was booked 2026-08-08 believing its class was row 26 but its instance uncaused. It is this row, cause confirmed: capture `s-captureAT`, the pair at 2026-08-08T09:58:46.362Z -> 09:58:50.626Z (141k, `messages_changed / 124331`). Request 2 carried an `# MCP Server Instructions` `<system-reminder>` at message index 3, where CC put it; `fresh-session-sort` (order 250) stripped it (`fresh-session-sort.mjs:462-470`) and prepended it as a new block 0 of `messages[0]` (`:480-483`), taking that message from 3 blocks to 4. `insertion-normalization` (order 395) then keyed on the mutated array. **Attribution OURS, established twice independently:** the dispatched lane reproduced BOTH recorded suffixes by replaying the real pre-395 pipeline in a scratch XDG state dir (`496b188f5f435920` raw / `a20843f8616f3866` post-pipeline, each matching the on-disk key verbatim), with a one-byte sentinel mutation yielding a third value so the probe is shown to discriminate; and the desk recomputed `conversationSubKey` over the RAW captured records alone — **both hash to `496b188f5f435920`, both `messages[0]` carrying 3 blocks**, i.e. CC sent byte-identical bytes and the whole rotation is ours. That is this row's link (b) reproduced on new evidence. **NEW FACT this row did not carry, and it names the mitigation:** `fresh-session-sort` computes its OWN memory key at `:373` by calling `resolveInsertionSessionKey` on `body.messages` BEFORE its own relocation runs, so it files its memory under the PRE-mutation identity while every downstream stateful extension computes the same function over the POST-mutation array. One key function, two snapshots of one mutable array, two buckets — corroborated on disk, where the only `*-fresh-sort-relocated.json` present sits under the pre-mutation suffix and none under the rotated one. Read for blame this is a split-brain; read for DESIGN it is the fix already existing in-tree: the pre-pipeline identity is the stable one under our own edits, and the extension that computes it that way is the one that never rotates. The mitigation direction for this row is therefore to give the downstream stateful extensions the pre-pipeline conversation identity rather than the one they compute over bytes we invented — booked with its alarm ahead of it, since a check that only goes red against the current defect has to be demonstrated red before the fix removes it. **Still NOT established, and not to be written into this row without its own evidence:** that the sub-key rotation CAUSED the 141k re-bill. CC keys its cache on the bytes it sends, not on our internal key; what the flip demonstrably did is DISARM our absorption. The upstream miss's own cause remains unattributed on this instance. **VERIFICATION ADDENDUM 2026-08-11 — established against the RUNNING SYSTEM, not against the commit messages that claim it.** (a) `246b61d` and `a5f1960` are both ancestors of `HEAD` and present in `origin/main`. (b) The code is SERVING, checked content-to-content rather than by mtime: `node proxy/source-fingerprint.mjs` prints `140351b73356`, byte-identical to `/health`'s `proxy_tree`, with the unit up since 2026-08-10 21:50:08 CEST (19:50:08Z); the deployment pin `CACHE_FIX_PROXY_TREE_PIN=ebaaf0e` equals `git rev-parse --short HEAD:proxy`. (c) The mechanism is in the source at all three sites: the carrier at `fresh-session-sort.mjs:392-393` (published on the line that already computes the identity, before every branch), the dual-reads at `insertion-normalization.mjs:1909-1911` and `deferred-tool-rewrite.mjs:697-699`. **RESIDUAL 1 — the bridge.** The old-key fallback retires after seven consecutive days with zero `oldKeyFallback` records; measured 2026-08-11, **0** files across the snapshots dir carry `"oldKeyFallback":true`, and the field is written only on a hit (`deferred-tool-rewrite.mjs:916`, `insertion-normalization.mjs:2007`), so this is a live log reading zero rather than a dead instrument — 110 event files were written since the restart. Earliest discharge 2026-08-17. **RESIDUAL 2 — nothing asserts the mitigation ABSORBED, and the obvious counter does not answer it.** `gate-status.json`'s `identityRotations.transitions` (7 over 753 requests in the 2026-08-11 sweep) compares the RAW `messages[0]` hash against the FORWARDED one (`replay.mjs:1136-1153`) — it counts our pipeline still relocating, which D1 deliberately does not stop; the fix moves the CONSUMERS off the mutated identity. So a non-zero transition count is not evidence this row re-opened, and a zero would not have been evidence it closed. The consumer-side effect (a relocating request serving `rewrite`/`unchanged` instead of `no-baseline`, forwarded `tools[]` byte-identical across the pair) has no instrument today; its home is the booked `gate-live` snapshots pass, and that entry is where it belongs rather than in a hand-grep repeated per session. |

| 27 | IDLE-GAP TTL EXPIRY — a conversation sits longer than the cache TTL and the next request re-bills the whole prefix. Distinct from row 21, which is eviction BEFORE TTL | measured 2026-08-06 23:59:10Z on s-captureAL: ledger `gap` **22,702 s (6h18m)** against `"ttl":"1h"` seen 217 times on that same session's own wire, surviving read `ctx` 215,875 - `cc` 215,873 = **2 tokens**, transcript `previous_message_not_found`. 215,873 tokens. (An earlier version of this cell cited `mtok` 0 as a discriminator; struck 2026-08-07 - `mtok` defaults to 0 whenever the transcript diagnostic was not read, so it carries no information on an `other`/`idle` row. See this row's datapoint.) | **CONTROLLED-CAUSE — no mitigation exists.** (This cell led with `ACCEPT` from 2026-08-06 to 2026-08-07 solely to stay readable: `statusKind` had no CONTROLLED state, so the honest wording read STATUS-UNREADABLE — a stop-here on a row that needs no stopping — while ACCEPT read KNOWN-OPEN, i.e. a controlled cause presented as open work. The verdict enum gained its fifth value on 2026-08-07 and the cell flipped in the same commit, which is the ordering the BACKLOG entry required: flipped earlier the row is unreadable, flipped later the enum ships with no row exercising it. `bust-triage` now answers CONTROLLED-CAUSE here.) The entry is gone by expiry before the request is composed; nothing the proxy forwards can change that. NOT a prevention target, and this is the one place FORK-NOTES' "any non-operator-initiated bust is a prevention target" does not reach — the operator initiated it by being away. What IS a target is the MISCLASSIFICATION: this event booked as `k:"hit"` (cls `bust`) and `bust-triage` answered KNOWN-OPEN **row 4**, inflating row 4's evidence with an instance it did not cause. Discriminator, computable from the ledger record the tool already reads: `gap` > TTL together with a surviving read (`ctx` - `cc`) that is ~0. NOT `mtok` - see the datapoint's correction |
| 28 | SELF-INFLICTED CONTENT LOSS — insertion-normalization's migrated-duplicate suppression deletes a standalone whose bytes NOTHING on our wire is restoring. The suppression's precondition was read off the CANONICAL (`pinnedBlockHashes`/`pinnedJoinHashes` over `priorCanonical`), which answers "is this block in a live entry", not "is a copy on the wire we are sending" | a `suppressed-without-copy` row from the replay's conservation check — and NOTHING else: the request is gate-green on stability, safety, sequence and order, the suppression is correctly DECLARED, and the model simply never sees the bytes | **MITIGATED 2026-08-07 (this commit), demonstrated on the instance.** Measured on capture s-captureAE n=62 (2026-08-06T09:36:31.212Z), one of four conservation reds in that morning's sweep, attributed by the read-only lane and branch-traced under instrumented replay: prior canonical ci=7 was a user carrier `[tool_result, skill body 21476, <system-reminder> 1510]`; on n=62 CC sent that message with its skill body one character shorter and the reminder shed into standalone wire[8] (1473 b, the operator's own CLAUDE.md diff). The carrier's identity therefore changed, the pin could not apply, and the reminder's hash was STILL in the set — from an entry nothing was serving. The standalone matched it and was removed: absent from the forwarded array as a unit under the gate's own hashing, as a substring, and line-by-line (0 of 18 substantial lines). The same request's other suppression (wire[13], carrier matched and pinned) was correct — the failure is per-instance, never wholesale, which is why only the conservation gate could see it. Trace: `idx=8 hash=b6e8e363… ci=7 onWire=false pinApplied=false` against `idx=13 hash=45e20a0c… ci=11 onWire=true pinApplied=true`. **Fix:** the hash sets are built from the bytes THIS request forwards at the slots the extension controls (matched pin, move re-serve, re-fire) — `restoringHashes`, both call sites. A narrowing, never a widening: where the precondition now fails, CC itself edited or dropped the carrier, so CC's own array has already diverged at or before that slot and forwarding the standalone costs no additional cache. **Entry-path enumeration (both closed, four bites, red on the old implementation before the fix):** the reset path (carrier EDITED) and the success path (carrier MATCHED but arriving with a `cache_control` breakpoint, where `pinnedForwardForm` hands CC's message through untouched — identity is volatile-blind, so a matched carrier is not a restored one). Siblings covered by the same construction and pinned by their own bites: carrier PRUNED outright, and the JOIN hash set (merged two-reminder standalone). **Verified:** the preserved capture replays exit 1 -> exit 0 with the row gone and 0 stability / 0 safety / 0 sequence / 0 order; the other two preserved captures are byte-for-byte unchanged in their conservation rows (34 `invented` on s-captureAE, 31 `suppressed-without-copy` on s-captureAH, 1 `invented` on s-captureAO — all three are checker-reach gaps, booked OPEN separately, and their survival is what shows the fix is targeted). npm test 2327 pass / 0 fail / 3 skipped of 2330. **CORPUS-WIDE, post-deploy:** the 13:19-13:47Z sweep ran the SERVING config over 95 captures with this fix live — 92 green, and the three reds are the same three captures with 34 / 31 / 1 rows. s-captureAE went 35 -> 34: exactly this row's violation removed, nothing else changed, and no capture that was green became red. |
| 29 | IDLE-BOUNDARY REBUILD — a still-running session that has been idle rebuilds `messages[0]` AND refreshes the `<env>` block from disk on its next turn, so every corpus edit and every git state change that landed during the idle window is paid for at once | `system_changed` then `messages_changed` on consecutive turns of ONE session, across an idle gap, with an UNBROKEN `parentUuid` chain and no process exit | **OPEN — MEASURED 2026-08-08, CC-side, mitigability UNASSESSED.** Distinct from row 24, which shares the mechanism ("rebuild pulls from disk NOW") but NOT its trigger: row 24 needs an accidental exit and a `/resume`. Here the process never exited — the transcript's `parentUuid` chain is unbroken across the gap, which reads as a session idle at the keyboard rather than a kill-and-reattach. Measured on s-captureAT, main thread: `conversationSubKey` (the `messages[0]` hash) is IDENTICAL across ALL 251 requests from 09:52:12Z to 11:28:30Z — nearly two hours during which the operator's corpus file demonstrably changed on disk (mtime 10:52:23Z) and the array did not notice. It was rebuilt only at the idle boundary: ord=713 (11:28:30Z) vs ord=715 (11:45:49Z) carry a real multi-paragraph `messages[0]` diff. So this row is the OTHER HALF of the line 118 measurement ("mid-session corpus edits are FREE"): free until the boundary, then billed in full. **TTL expiry is RULED OUT, not assumed** — the gap is 1046 s (17m26s) on the 1-hour tier, well under the ~3240 s idle threshold, and `cold-events.mjs`' own cause ladder never prints `idle`. **The `<env>` half is the operationally sharper finding and it was NOT anticipated:** diffing `body.system` across the same pair shows ~50 bytes changed, all inside the ordinary `<env>` block — git status `(clean)` -> ` M BACKLOG.md` and the "Recent commits" list advancing five commits. That block is regenerated from the working copy at the same boundary, so OUR OWN commits and dirty files invalidate the cached system prefix of every other session working in the same repo, at whatever moment each of them next rebuilds. Attribution is CC's by construction: the divergence is present in the RAW pre-pipeline capture (request-capture, order 60). Cost this instance: 553k (`system_changed`) + 540k (`messages_changed`) on one session, plus a 353k `system_changed` on a second, unrelated fable session in the same window. **The count itself needed an instrument:** the ledger showed four events, `cold-events.mjs` (dedup by `requestId`) shows THREE — the morning pair collapses under the known duplicate-row defect while the 11:46 pair does not, being two genuinely distinct re-bills whose second (`concur:1 flight:true`, 26 s later, byte-identical content) reads as racing the first miss's not-yet-committed cache write. Mitigability, honest open question: nothing on our side moved these bytes and nothing on our side can restore a prefix CC rebuilt; the reachable half is PRICING it before the edit (`restart-exposure` is the right tool and cannot express this class — it takes a TEXT predicate, booked) and BATCHING corpus and commit activity rather than spreading it across live idle sessions. Do not design a mitigation against this row until the attribution line the bust walk now demands is emitted mechanically. **CONFIRMED ON A SECOND TRIGGER 2026-08-15 (s-captureBR, 919k):** the `<env>` half of this row — git status and the "Recent commits" list regenerated from the working copy — fired at a same-machine RESUME boundary, not only at the idle boundary this row is named for. Same bytes, same block, different entry path: `system[2]` char 12222, two deleted-file entries -> `(clean)` plus five replaced commit lines. It was the SECOND of four layers there (row 24 carries the full cascade), so on that instance it was not independently costly — `tools[]` had already diverged above it. Recorded because this row's mitigability question is "can the `<env>` block be pinned", and the answer now has to hold for both entry paths, which is the sibling enumeration dev-loop demands at ship time. |
| 30 | RELOCATE-THEN-PIN CONTENT LOSS — `fresh-session-sort` relocates a reminder block into `messages[0]`, then `insertion-normalization`'s volatile pin serves that message's STORED FIRST-SEEN form, which predates the relocated block, so CC-sent content reaches the wire in NO message. A REGRESSION created by D1 (`246b61d`), which fixed row 26's sub-key rotation — and the rotation had been MASKING this: while the relocation rotated the sub-key, insertion-normalization saw a new conversation, reset, held no canonical, and never pinned, so the block survived by accident | conservation `kind: lost, side: in`, exactly ONE unit per row and ZERO `invented` rows corpus-wide (a rewrite loses one unit and invents one; pure loss with no invention is a whole block removed without disturbing its siblings' hashes). Extension telemetry reads `pinned: 1` with `suppressed`/`dropped`/`moved` all 0 — which is why reading those three REFUTED insertion-normalization on 2026-08-11 and sent the walk to the wrong candidates: a pin is none of them | **FIXED, SHIPPED AND SERVING 2026-08-11** (fork `03398e3`, dotfiles pin `ec05377`, proxy restarted; verified content-to-content rather than by assuming the restart took — `/health` `proxy_tree` reads `53180b0da2ee`, which is `proxy/source-fingerprint.mjs` over the deployed tree, and the pin equals `HEAD:proxy`. Those are two DIFFERENT namespaces and the check is two comparisons, not one: the health field is a sha256 source fingerprint, never the git tree hash). The fix: `fresh-session-sort` now publishes `relocatedBlocks` in its stats, and `insertion-normalization`'s `pinnedForwardForm` carries those DECLARED blocks across the pin instead of serving a stored form that predates them — declared rather than re-derived, because a predicate re-implemented there would be a second truth about what counts as relocatable and importing the real one would close a cycle (fresh-session-sort already imports `resolveInsertionSessionKey` from that module). The stability question the fix had to answer first — does re-prepending make `messages[0]` churn, which is what the pin exists to prevent — is answered by the relocator's own construction: it emits its per-conversation MEMORY, not this request's findings, so the carried set is already stable across requests. **VERIFIED LIVE by the post-deploy sweep** (13:49:40Z -> 14:19:08Z, code stamp `proxyTree 53180b0da2ee`, i.e. VERIFIED equals RUNNING): **conservation is ZERO across all 25 captures**, against twelve failing captures and 1,899 rows before the fix — a larger population than the hand-replayed five, so it supersedes rather than repeats them. The sweep's one remaining red is s-captureBC's stability row, closed as NON-DEFECT the same day and awaiting its own booked exemption. **PROVEN BY DIFFERENCE before deploy:** the three captures that reported 81, 179 and 251 conservation rows replay to **0, 0 and 0** under the fix, with stability and safety unchanged at 0 on each — the forwarded bytes changed without introducing a divergence, which is the half a conservation-only check would not have caught. Observable side effect, asserted: `pinned` on the affected request goes 1 -> 0, because the pin's output now equals its input and it correctly no-ops. **ATTRIBUTED OURS.** Attribution by three independent instruments, none of them a reading. (1) Per-stage attribution (`replay.mjs --attribute-conservation`, built this day for exactly this gap): 750 of 750 rows across five captures (s-captureBA/BD/BF/BG/BI) name `insertion-normalization` as remover and `fresh-session-sort` as the mover that put the unit in `messages[0]` first, from raw message index 3, one 1,433-char reminder-wrapped block. (2) The extensions' own predicates executed on the real bytes: `isMcpBlock` true and `getBlockType` `mcp` on the lost block, both false/null on a surviving sibling of the SAME message — the control, without which the probe discriminates nothing. (3) The forwarded bytes: `--dump-forwarded 46:0,46:3` shows forwarded `messages[0]` carrying the two stored first-seen blocks and no MCP block, while CC's raw request carries it on every request from n=46 on. **THE COUNTERFACTUAL, one variable** (row 25's method): the SAME capture under the pre-D1 build `44b62d9` replays to **0 conservation rows, exit 0**, and `--dump-forwarded` there shows the MCP block present as `messages[0]` block 0 — against 81 rows and the block absent under today's build. **BLAST RADIUS is all four relocatable types, measured not assumed:** the synthetic reproduction destroys a late-arriving `skills`, `deferred`, `hooks` and `mcp` block alike (`test/relocate-then-pin-conservation.test.mjs`) — the mechanism is `pinnedForwardForm` serving a form that predates whatever was relocated in, and it is type-blind. **PRECONDITION, which bounds it:** the block's FIRST appearance must postdate the target message becoming canonical; a block present at first-seen is inside `stored.m` and survives. **EVIDENCE IS SYNTHETIC BY NECESSITY,** not by preference: `fresh-session-sort`'s four predicates are literal-text prefix tests and the harvest scrub replaces text with hash tokens, so a pinned fixture scores zero relocations and reproduces nothing while `harvest --pin` reports success (dev-loop.md, "The scrub destroys CONTENT PREDICATES"). The fixture is built from known-safe parts and runs the REAL pipeline. **What is NOT established:** the billed cost of the loss (this is a fidelity defect, not a divergence — the forwarded bytes are STABLE across requests, so no gate but conservation sees it and there is no re-bill to price); and whether the seven unexamined failing captures share the signature (five of twelve measured, 100% uniform). **COVERAGE CHECKED INDEPENDENTLY, and the check was briefed blind to the cause.** A separate read of this matrix — given the mechanism and the measurements but NOT the D1 counterfactual, not `246b61d` and not row 26 — returned NO ROW COVERS IT, and reached "likely the second-order consequence of row 26's own fix" from the matrix alone. Its row-by-row disposition: row 25 is the DEPARTURE axis and does not fit, since CC never stops sending this block; row 28 is the only other place `pinnedForwardForm` is named but sits on a different path and a different kind (`suppressed-without-copy` via a canonical hash, not the volatile pin); row 4 carries "the pin re-serves first-seen bytes" as a general fact, never combined with fresh-session-sort's timing; and no prose section dispositions it either — the nearest analog, the un-numbered "reset drops volatile pinning" FIXED section, is the OPPOSITE shape (a reset turning pinning off, against a stable pin persisting a stale form). Agreement is not a second measurement — the counterfactual above is the evidence and that read is a second opinion over the same document — but it was reached without the answer in hand. **WHERE THIS WOULD HAVE BEEN CAUGHT, from row 26's own text:** that row's standing residual reads that its absorption is UNASSERTED — no bite covers whether a relocating request actually serves rewrite/unchanged, and `identityRotations.transitions` does not answer it. This defect is the consumer-side effect that missing instrument was named for; row 26's residual and this row close together or not at all. **Fix design and its red-first arrangement: BACKLOG.md, "READY — the relocate-then-pin content loss".** The repo's own ordering decides the interim: safety outranks cache, and D1 traded a billing defect for a correctness one. |
| 31 | CONCURRENT DUPLICATE SIDECAR SEND — CC issues the same session-start sidecar request TWICE, ~13 ms apart, while the first is still in flight; both are answered and both are charged | two byte-identical adjacent same-conversation requests with DISTINCT upstream request-ids, each carrying its own capture outcome record AND its own completed usage-log record | **MITIGATED — shipped and LIVE 2026-08-14 (`CACHE_FIX_COALESCE_SIDECAR=1`), effect measurement pending the next sweeps; see MITIGATION at the end of this cell. Measured CC-side the same day, and the obvious mitigation really was the wrong one — see below.** Not a cache bust: this row is a DOUBLE CHARGE for two real answers to one question, which is why it did not surface through any of the four gates. **The population, corpus-wide:** 118 duplicate streaks, 62 double-billed, of which **47 are this class** — model `claude-haiku-4-5`, `nMsg=1`, `max_tokens=32000`, every one at capture lines 3-5 (session start), intervals **6 to 25 ms** (p50 14). Model, capture position and interval are three independent axes and they partition the population identically, which is what makes this a class rather than a sort. **Both sends are real API calls and both completed:** 47/47 pairs carry DISTINCT upstream `request-id`s with none null, and every member joins to its own `usage.jsonl` record with a real final `output_tokens` — the pairs answer within a token or two of each other (16|16, 18|18, 19|19, 26|29). **It cannot be a retry, and that is measured rather than argued:** the first send's own wall time to first usage is ~700-800 ms while the duplicate is issued 6-25 ms in, so on 47/47 pairs the second request left before anything about the first could have been observed. **Cost:** 48,203 input-side tokens attributable to the duplicate sends. Cheap per instance — this is a defect by structure, not by size, and the expensive duplicate population is a DIFFERENT class (mid-session, booked separately: there the first attempt has no completion record at all and the second send is a retry, so 2.87 M tokens of that charge is an aborted attempt rather than a double answer). **ATTRIBUTION: CC's, by construction** — captures are written pre-pipeline (request-capture, order 60) so both sends are CC's own bytes, and the proxy forwards one-inbound-one-upstream (`server.mjs` `forwardRequest` per request, no retry loop). **Why the obvious mitigation is wrong, stated here because 'byte-identical adjacent dedupe' reads as the lowest-risk change this proxy could ship:** DROPPING the second send is not available — two client requests are in flight and each is owed a response, so the only safe shape is COALESCING one upstream call to both callers, which is undesigned and touches the streaming path. And any such mechanism must NEVER reach the mid-session class, where suppressing the second send would leave a real retry unanswered. **Upstream:** #78420-adjacent; the report is worth filing and needs operator GO (Public Communication rule: draft first). Instrument: `tools/duplicate-billing.mjs` answers this row from one command. **MITIGATION, live 2026-08-14 (fork `1176d65` mechanism, `4c6c061` record, dotfiles `7050372` flip + `700833b` acceptance).** COALESCING, as the cell above says it had to be: the second caller is attached to the first request's response WRITER, so extensions and telemetry run exactly once and both callers receive byte-identical post-pipeline bytes. Four conditions must hold together, and each one is the fence around a different way of being wrong: exactly ONE message and NO tools (so the request joins no cached prefix and the mid-session retry class can never be reached), byte-identical forwarded bytes (the key IS a sha256 over them), and a 50 ms window with the first request still in flight. The mid-session arm asserting TWO upstream calls is the discriminating half of the test set, not decoration. **It shipped gated OFF for a day, and the reason is the reusable half:** a coalesced follower gets a capture request record and never an outcome record, which in the duplicate-streak rollup is byte-for-byte the shape of a retry streak's unanswered send — the mitigation would have inverted the very number this row's done-criterion is stated in. The fix is a `type:"coalesced"` capture record naming the follower, the leader whose outcome carries the billing, the forwarded digest in the outcome record's own `outSha` namespace, and the interval; the census reports `coalescedRequests`/`coalescedStreaks` and `duplicate-billing` reports COALESCED rather than NO-REQUEST-ID. **Live acceptance the same day:** two byte-identical sends 15 ms apart against the serving proxy → one upstream call, both callers byte-identical, one coalesced record (deltaMs 14), read through the real census as `coalescedRequests 1, doubleBilledStreaks 0`. **What closes this row is still outstanding and is NAMED:** the duplicate-streak count for THIS class falling to 0 across a full sweep while the mid-session class stays UNCHANGED — a fall there would be over-reach, not success. **2026-08-15 — that criterion was UNREADABLE from the daily sweep by construction, and now is not (fork `8f8e5ab`, `b5f42e2`).** Two separate gaps, both silent. The census emitted `coalescedRequests`/`coalescedStreaks` on every sweep and gate-live's two rollups enumerated the duplicate fields by hand, so both were dropped for four days into a `byteGate.duplicates` block that read complete — measured on the 10:03Z sweep, whose per-capture rows carry 3 coalesced requests over 3 streaks against a rollup carrying neither key. And no counter existed for EITHER side of the two-sided criterion: `summariseDuplicates` now splits streaks, double-billed streaks and coalesced streaks by `nMsg === 1` (this row's own discriminator, quoted not re-decided), gate-live's rollups derive their field set from that summariser instead of copying it, and both the census text report and the sweep summary print the two sides with the criterion spelled out. Read the row's progress at `byteGate.duplicates.singleMessageDoubleBilled` (must reach 0) against `.multiMessageDoubleBilled` (must not move); the first full sweep after 2026-08-14 18:17 local produces the corpus number. The `singleMessage` bucket is WIDER than this class — it reads `nMsg` alone, not the model, the capture position or the interval — so a non-zero there is a prompt to read the rows, never a refutation of the mitigation on its own. **MEASURED AND CLOSED 2026-08-15 — the done-criterion is met on both sides, from the sweep finished 13:38:00Z (`ok: true`, 0 failing, 57 captures, all 57 stamped).** The corpus is MIXED, so it was read as a COHORT rather than waiting for the pre-flip captures to rotate — a stronger arrangement than the entry asked for, because it carries its own baseline: `node tools/gate-live.mjs --cohort 2026-08-14T16:17:00Z` splits the sweep's rows by each capture's own first-record stamp. **BEFORE (44 captures): 48 single-message streaks, 34 DOUBLE-BILLED (71%), 1 coalesced; 32 multi-message streaks, 3 double-billed, 0 coalesced. AFTER (13 captures): 14 single-message streaks, 0 DOUBLE-BILLED (0%), 8 coalesced; 1 multi-message streak, 1 double-billed, 0 coalesced.** Zero captures unstamped, so the two cohorts are total. Fisher exact, one-sided, on the pre-registered comparison: **p = 1.4e-6** (7.7 double-bills expected post-flip under the null, 0 observed) — this is not a best-cell-of-many reading, it is the single comparison the criterion names. **It is not an absence dressed as a result:** the mitigation is observed ACTING 8 times in those 13 captures, so the "traffic simply changed" story is refuted — that story predicts zero double-bills AND zero coalesces. **The four disconfirming observations were each looked for and named:** a non-zero on the target side (none, across 14 streaks); the control side falling to zero, which would be over-reach rather than success (it did not — still billing, and the one post-flip retry streak was NOT suppressed); the fence breached (`multiMessageCoalesced` is **0 across all 95 streaks**, pre and post — the mitigation has never once fired on the retry class); the mitigation inert (refuted by the 8 firings). **RESIDUAL, stated rather than smoothed over:** the control arm has n=1 post-flip streak and is under-powered — that count says "still non-zero", never "unchanged". What carries the no-over-reach conclusion is the 0-coalesced-on-the-retry-side figure across the whole corpus plus the code condition (`nMsg === 1` and no tools) and its two-upstream-calls bite, not the retry count. **STANDING WATCHER so the closure cannot rot silently:** `row-31-coalesce` in `tools/shape-verdicts.mjs`, scoped to the post-flip cohort (a corpus-wide predicate would fire on the 34 pre-flip double-bills and train its reader to ignore it), warning in BOTH directions — a post-flip double-bill, and any coalesce landing on the retry class. Live and green against the 13:38Z sweep.  **EFFECT MEASURED 2026-08-16, and the instrument the measurement was specified with is REFUTED — read that before the numbers.** An A/B replay (same captures, coalescer off then on) cannot measure this mitigation: the coalescing decision lives in the live request path (`server.mjs`, the only site outside the gate allowlist reading `CACHE_FIX_COALESCE_SIDECAR`), which is UPSTREAM of the capture file, so by the time a capture exists the decision is taken and recorded. Executed on a capture carrying a real `type:"coalesced"` record: the census returns a BYTE-IDENTICAL duplicate rollup under the gate `=0` and `=1`. Two arms that agree have measured nothing; the structural half agrees, with zero reads of that variable under `tools/` against an instrument-positive of three `tools/` files for a gate the tools do read. **What replaces it:** every capture's BOOT RECORD declares the gate set its proxy started with, so one fixed corpus labels its own arms and the label is data rather than a re-run — `tools/row31-effect.mjs` (`55618fd`) reads it off line 1 of each capture and joins it to the sweep's retained per-streak rows. **Reading, 2026-08-16: ON 30 captures, session-start double-billing 0.000 per capture; PRE-GATE control 5 captures, 0.400.** Mid-session 0.133 vs 0.400, which is NOT reported as over-reach at n=5 — the honest over-reach discriminator is the census's `multiMessageCoalesced`, ZERO in every run to date, i.e. the mitigation has never acted outside its class. Observational, not randomized: the control arm is older captures, so time is confounded with the gate; rates are per capture because the corpus rotates. **THIS DOES NOT CLOSE THE ROW.** The stated criterion is the census's own `singleMessage*` counters, and the 11:09 sweep still reports `singleMessageDoubleBilled: 3` against `singleMessageCoalesced: 14` and `multiMessageCoalesced: 0`. What those 3 residual streaks fail — one of the mitigation's other three conditions, or a capture written before the flip — is the named missing evidence, and it is now answerable because the retained streak rows carry `coalesced` (same commit) where they previously dropped it. |

Convergence note (operator-prompted, honest): enumeration is
asymptotic — three passes, three methods, each found cells the prior
missed. What makes it CONVERGE is not better imagination but
attribution telemetry: every bust now either matches a named row or
surfaces as unattributed — and an unattributed bust is itself the
alarm that mints the next row. The guarantee is "no SILENT gaps",
not "no gaps".

---

## FIXED 2026-07-28 — `deferred-tool-rewrite`'s `tool_addition` injection
## moved between requests (a keying collision, not an injection bug)

**TITLE CORRECTED 2026-08-11.** This section read `## Row 21 — FIXED: …`
until today, and that number is from a SUPERSEDED numbering: today's row 21
is server-side cache eviction, which has nothing to do with this. Found by
the enumeration lane that walked every disposition-bearing passage outside
the table — the "a disposition living in a section, invisible to a
row-number index" failure this document's own intro records being burned by
once already, arriving a second time as a stale LABEL rather than a missing
one. The class this section belongs to today is **row 14's** — a keying
collision, and its own body says so one paragraph down ("the SAME collision
fixed in insertion-normalization hours earlier"), which is the pair row 14
now records as one fix with two consumers. Stated as a reading, not as a
renumbering: the old number is not resolvable from this document, and
nothing machine-reads these headings — checked, `bust-triage` indexes only
`WALK-INDEX:` lines inside `## Event walk` sections
(`tools/bust-triage.mjs:1338`), so the cost was paid by human readers.

Found 2026-07-28 by `tools/gate-live.mjs` on its first run under the
PRODUCTION gate set. It had never been visible because every prior
verification run used the extension defaults, where `CACHE_FIX_TOOL_REWRITE`
is OFF — see `docs/dev-loop.md`, "replay the configuration that is SERVING".

Evidence, corpus `s-captureE`, two independent instances:

    n=44->47   inDiv=23  outDiv=4   <- deferred-tool-rewrite
    n=219->223 inDiv=10  outDiv=4   <- deferred-tool-rewrite

At request 44, output index 4 is the injected announcement:

    {"role":"system","content":[{"type":"tool_addition",
      "tool":{"type":"tool_reference","name":"WebFetch"}}]}

At request 47 that message is absent, and index 4 holds the next real
message. So the injection appears in one request and not the next, and our
forwarded byte stream diverges at index 4 while CC's own history is identical
through index 23 — we move the divergence **19 messages earlier than
required**, and everything from there is re-billed.

This is self-inflicted by construction, and NOT the false-positive class the
safety gate hit: a declared injection is legitimate as CONTENT (which is why
`findSafetyViolations` exempts it), but an injection that is present in one
request and gone in the next is a byte-stability defect regardless of how
legitimate its content is. Verified against the artifact-vs-defect checklist
in dev-loop.md before being written down.

What is NOT yet known, and must be established before a fix:

- Why the announcement disappears — is it emitted only on the request where
  the tool first appears (by design), or dropped by a later state reset?
- Whether the correct fix is to keep announcing it for the life of the
  session (stable but grows), to anchor it at a fixed index, or to stop
  injecting into `messages[]` at all.

Not fixed on discovery deliberately: this extension is ON in production, its
whole purpose is byte stability, and a rushed change to it is exactly how a
mitigation becomes the bust. What kept it unforgettable was the MECHANISM,
not this row: the failing gate sweep held doctor red until the fix landed —
the matrix records, the gate enforces.


**RESOLVED 2026-07-28.** The announcement never disappeared — telemetry shows
`injected=1` on every request. It was RE-ANCHORED: `reanchored=1` at n=46 and
n=47, so the message moved to a different index each time.

Root cause was the SESSION KEY, not the injection. `resolveToolRewriteSessionKey`
was `(session-id, system-prompt)` with no conversation sub-key, so every
subagent shared one state. Message counts under a single key in the failing
window: 49, 22, 24, 51, 11, 26 — six unrelated histories. The stored
`anchorHash` therefore belonged to somebody else's conversation, failed to
match, and `injectAdditions` fell back to "after the last user message", which
is a different index on every request.

This is the SAME collision fixed in insertion-normalization hours earlier
(row 14). The fix did not travel to the sibling because nothing connected
them. So `conversationSubKey` now lives in `message-hash.mjs` — one
implementation, both consumers — and `test/session-key-invariants.test.mjs`
DISCOVERS every exported `*SessionKey` and holds it to the invariant, so the
next stateful extension is covered without anyone remembering.

That guard found a third instance on its first run: `prefix-diff` separates
co-tenants by system prompt only, which is the same insufficiency
insertion-normalization outgrew (one prompt bucket held 39 conversations). It
shapes no request, so the cost is attribution precision rather than cache, and
its coarse FILE key is a deliberate design (its note 1: a path that moves with
content misses its own baseline). Exempted — with a test asserting the
exemption is still earned, so a change to that design fails loudly.

Verification: the 2 violations on corpus `s-captureE` go to 0, and a full
production-gate sweep is clean — 9 captures, 1742 MB, 0 failing. Bite: forcing
the sub-key back to a constant turns the invariant test red.

---

## FIXED 2026-07-28 — a reset drops VOLATILE PINNING too, so an
## honest edit at the tail costs from 19 messages earlier
## (fix: resetKeepingPins — a reset abandons the ORDER model, not the pins;
## verified on corpus s-captureL 2 -> 0, dfed402)

**TITLE CORRECTED 2026-08-11, same finding as the section above.** This read
`## Row 22 — FIXED: …`, and that number CANNOT refer to today's row 22: this
section is dated 2026-07-28 and row 22 (ephemeral UI turns) was created
2026-07-31, three days later. The mechanism it records — `resetKeepingPins`,
a reset abandoning the ORDER model rather than the pins — is the one today's
rows 4 and 22 both cite in their own cells, so the content is live even
though its label was not. Nothing machine-reads these headings (basis in the
section above); the correction is for the reader.

Found 2026-07-28 19:45 by `cache-fix-gate.timer` on live traffic, minutes
after row 21 was fixed — i.e. by the mechanism, unprompted, which is what it
was built for.

    corpus s-captureL, 110 requests
    stability: n=108->109  inDiv=196  outDiv=177  <- insertion-normalization
    sequence:  n=109 reset(edit-shaped) after normalize at n=108

Our output diverges 19 messages earlier than CC's own history requires, and
the normalize→reset pair means the canonical and CC's serialization disagree
from there on.

UNVERIFIED HYPOTHESIS, recorded as such: row 4 established that CC mutates the
LAST message in place on a user interruption (appending
`[Request interrupted by user]` plus the follow-up text as new content blocks
rather than a new message). This capture is from a session with several such
interruptions. If `classifyInsertion` reads that tail mutation as an
`edit-shaped` change it would reset — which matches the observed pair. That
must be CHECKED before any fix: row 4's own lesson was that the assumed
mechanism (mid-index drift) was not the measured one (tail-only).

Before treating this as a production defect, run `docs/dev-loop.md`'s
artifact-vs-defect list — in particular confirm the pair is 108->109 as
reported and that no declared-injection exemption is missing.

Not fixed on discovery: same reasoning as row 21 — and the same mechanism,
not this row, kept it red until resolved (the gate sweep, via doctor).


**DIAGNOSED 2026-07-28. The hypothesis above was WRONG and is kept as a
record of that.** It guessed a tail mutation from a user interruption. The
measurement says otherwise, and the real mechanism is worse.

What CC did is honest: it replaced message 196 in place —

    108 in[196]: {"role":"user","content":"yes lest do it all!"}
    109 in[196]: {"role":"user","content":"lets do it all 13.x shuodl be ..."}

a genuine history edit, and `reset(edit-shaped)` is a defensible response to
it. Cost should be messages 196+.

What WE did is not. At index 177, isolated:

    CC's in[177] identical across the pair : true
    our out[177] identical                : false
    request 108: out != in   (we RESTORED a <system-reminder> block)
    request 109: out == in   (pinning stopped; the block vanished)

Telemetry agrees: `pinned: 1` at 108, `pinned: 0` at 109. Volatile-block
pinning had been re-inserting a hook `<system-reminder>` that CC dropped from
message 177 — that is the mitigation working. The reset switched it off, the
restored block disappeared, and our forwarded bytes changed at 177 while CC's
were untouched. A bust that should have cost from 196 costs from 177.

Root cause: the canonical reset and the volatile-pin lifecycle are coupled,
and they are orthogonal concerns. Whether the HISTORY was edited says nothing
about whether previously pinned DECORATION is still valid. Fix direction:
pinned volatile state must survive a canonical reset, so a reset confines its
cost to the edited index instead of un-pinning everything before it.

Deployment note, learned at cost the same evening (see row 3's amendment): a
change to state lifecycle invalidates baselines and buys a one-time bust per
live conversation. This one belongs at a session boundary and the cost gets
stated BEFORE the restart, not diagnosed after.


---

## Row 4 — RE-OPENED 2026-07-28 (same day it was closed)

Row 4 closed as ACCEPTED-cheap on the finding that every measured
`replace/edit` mutated the LAST message, so a rewrite re-bills that message
alone. The row states its own re-open condition: "Re-open only if a NON-tail
instance is ever measured."

That verdict rested on census numbers taken BEFORE `semanticIds` carried an
occurrence ordinal. Repeats of an identical message — one history carried the
same hook reminder 44 times — collapsed into a single identity, which
suppressed edits from the classification entirely. With the ordinal, on
session 58c979ce alone:

    replace/edit positions: 20 total, 5 TAIL, 15 MID-HISTORY

Fifteen non-tail instances. The premise is refuted, not weakened. Examples,
worst first by re-billed bytes:

    n=1120->1124  edit@623 of 650  ~70 kB   19:57:20Z
    n=1201->1203  edit@34  of 36   ~63 kB   20:29:51Z
    n=1196->1198  edit@25  of 27   ~32 kB   20:29:15Z
    n=1197->1204  edit@768 of 783  ~27 kB   20:30:26Z

The last one sits 15 seconds before event 14 (484k `messages_changed`,
20:30:41Z) and is the same pair that insertion-normalization answered with
`reset(not-subsequence)`. A mid-history edit at index 768 of 783 invalidates
everything from 768 on — which is the shape of the event, and the first
mechanism for it that survives corrected data.

NOT yet established, and stated as open rather than assumed: whether that edit
CAUSED event 14, and what CC is actually changing at those indices. The
pattern to check first is a system-reminder block being swapped in place
mid-history — at n=1197->1204 index 768 holds a task-tools reminder in one
request and a PreToolUse hook block in the next.

EXTERNALLY CORROBORATED 2026-07-29: anthropics/claude-code#76606 (open,
filed 2026-07-11 by an independent reporter diffing raw /v1/messages bodies)
describes exactly this mechanism — "Claude Code rewrites an old hook
reminder's shape later in the session ... either moving it into its own
message, or merging it into a neighboring one", hit repeatedly in one day
under PreToolUse hooks that add context to tool calls. That is the
reminder-swap pattern above, observed with independent instrumentation on an
unrelated setup. Upgrades the leading candidate from "pattern to check
first" to "mechanism reported in the wild"; still not a measured root cause
for event 14 specifically.

SECOND corroboration, sharper (issue sweep 2026-07-29):
anthropics/claude-code#78660 names the mechanism outright — the "task tools
haven't been used recently" nudge, fired mid-tool-loop, ANCHORS TO THE LAST
HUMAN MESSAGE instead of appending after the pending tool_result, editing
deep into the cached prefix. That nudge is the exact reminder text observed
at index 768, and anchoring-to-last-human explains both the position and the
swap-in-place shape. Row 4's open question ("what is CC swapping at those
indices") now has a reported answer.

VERIFIED 2026-07-29 on this corpus (census over 1,731 requests, 33
mid-history replace/edit pairs matched against message roles): of the 22
pairs with a human-typed anchor, 20 sit within +/-2 of the LAST HUMAN
MESSAGE (11 exactly on it, 8 at -2); the remaining 11 are subagent/sidecar
conversations with no human anchor under the filter. The two deep outliers
(-15/-27 from the current anchor — including the event-14 pair at index
768) sit 3 and 11 messages past the THEN-current last human message,
inside the post-human zone where CC parks injected reminder/hook blocks.
No mid-history edit occurred at arbitrary depth. The mechanism family —
reminder-block re-stamping at or just after the human-message anchor
(CC#78660 / CC#76606) — is CONFIRMED as the cause of this population;
the exact anchor arithmetic of the two aged cases (which specific
injected message they re-anchored to) remains unpinned. Distribution
posted to CC#78660.

Mechanised so it cannot silently rot again: `findEditPositions` in
tools/replay.mjs reports the tail/mid split and prices the mid-history
population on every `--census` run, and `tools/gate-live.mjs` runs daily.
Row 4's disposition is now a measurement, not a memory.

### Row 4 datapoint — 2026-07-30: first measured OSCILLATION (221k bust)
### [CORRECTED 2026-07-31 late: the census join-target run over the live
### capture shows THREE hosts reversing in this event, not the single
### 92→94 pair the flap-probe addendum priced — the 221k was measured at
### a third of its true per-host size. Basis: census-flap-joined-report,
### live slice "10, 6 FLAP, 7 JOIN (3 cross-message)".]

Session 0d6f38ba, 16:57:14Z, `messages_changed`, cc 221,065. The Agent
hook-reminder pair FLAPPED inline->standalone->inline->standalone across
four consecutive main-thread requests in 11 seconds — census over the
pre-pipeline capture:

    n=102->104  edit@86 of 98   [anchor-12] [blockMigration inline->standalone 92->93, 92->94]  ~31 kB  16:57:05.767Z
    n=104->105  edit@86 of 98   [anchor-10] [blockMigration standalone->inline 93->92, 94->92]  ~32 kB  16:57:08.353Z
    n=105->108  edit@86 of 100  [anchor-14] [blockMigration inline->standalone 92->93, 92->94]  ~37 kB  16:57:16.375Z

Trigger window: a teammate report (ubytes=4248) landing at a clean turn
boundary (flight=false) amid mid-turn operator messages. Attribution
CC's: the same census reports 0 pipeline byte-stability violations;
insertion-normalization answered with three edit-shaped resets, sequence
gate 0 (correct response, no bleed). The census emits `blockMigration`
lines directly — the class is recognized, not re-derived (the 07-28
mechanization holding).

Post-pin escape CONFIRMED live: the standalone leg is the system-role
string-content shape `isVolatileBlock` does not classify (runbook
2026-07-28 note), so the pin absorbs the inline leg only — under a flap
that busts on every second flip at best. Magnitude: mtok 201,434 of ctx
236,536 (85%) missed from an edit at ~86/100 — surviving prefix ~35k
tokens, consistent with the 07-28 breakpoint-sparsity question (single
tail cache_control marker), still unproven against wire bytes.

Mitigation status unchanged by this event, both halves already named:
occurrence-side, extend the volatile pin to the standalone system-role
string shape (candidate since 07-28); magnitude-side, the mid-history
breakpoint ladder (directive on feature/mid-history-breakpoint-ladder,
unmerged). Evidence: capture s-captureB…-requests.jsonl (79.8 MB,
rotates; reproduce with `node tools/replay.mjs <capture> --census`);
same-hour harvest reported 0 novel pairs — the shape is already in
fixtures, rotation loses the instance only. New sub-shape worth a
census annotation: a flap detector (same blockMigration pair reversing
within N requests) — currently only visible by reading adjacent lines.

CORRECTION (same day, builder-measured against raw bytes; fixture
090a110 reproduces both relations offline): the census over-reported
this flap's migrations 2x — blockUnits treats any message that SHRANK
to one block as a standalone, so stripping a reminder out of the
tool_result manufactured the phantom "92->93" lines; only 92->94 is
real. The flap stands: one reminder block flipping across three
requests. And suppression coverage was NOT the gap: pinnedBlockHashes
has matched per-block unwrapped text since the original #76606
suppression, the join-hash (78940a0) matches the joined leg —
findSuppressibleDuplicate returns a hash for both matchable
standalones. The real escape: classifyPinned returns
reset("edit-shaped") BEFORE the suppression pass, triggered by the one
genuinely novel leg — a CROSS-MESSAGE join (msg89's unwrapped reminder
+ "\n\n" + the whole standalone msg90) landing in dropped msg90's gap.
Mitigation is a design decision, not a build brief — two named open
questions in BACKLOG (cross-message-join suppression would drop
msg90's bytes from the wire; suppression-before-reset touches a
load-bearing safety discriminator with measured false-positive
history). The pin-extension candidate this entry previously named is
withdrawn — refuted, already-built.

SECOND CORRECTION + detector landed (same day, commits fc44da3 +
47defba): the phantom needed TWO conditions — the shrink AND an
index shift putting an unrelated message at samePos — and a
shrink-based rule cannot see the reverse leg (pair-locally
unknowable; demonstrated by a red reverse-bite). The shipped fix is
candidacy instead: a block is a migration candidate only where it
appears <system-reminder>-wrapped on its inline side (over-narrowing
probed: the documented s-4b6a435234bf real case survives). The census
now flags flap reversals directly — the triple reads 3 migrations,
2 FLAP, driven red-first from the committed fixture, so the proof
survives capture rotation. SECOND FLAP instance (s-4b6a435234bf,
2026-07-29 17:19-17:20Z, same triple shape at msg 155/156): measured
NON-event — the nearest bust on that session sits 26 minutes earlier
— so the parked design item's cost trigger did not fire. Known
detector residual, booked: per-block hashing counts LEGS, not
relocations — two of the fixture's three standalone legs are JOINS
it cannot see (joined-standalone migration target, BACKLOG).

### Row 4 datapoint — 2026-07-31: the census's EXTENDED class IS the
### cross-message join, and its placement is measured, not arguable

`reminder-migration-census.mjs` calls a later standalone EXTENDED when
it carries the canonical reconstruction as a byte PREFIX, and its
header calls the remainder "new reminder text that did not exist at
the earlier request ... NOT absorbable by any normalization". Measured
over every EXTENDED occurrence in the readable corpus: 9 of 9 are the
CROSS-MESSAGE JOIN this row already names one entry up — the
remainder is byte-identical to a standalone system message the
PREDECESSOR request carried, swallowed into the migrated reminder. 0
are new text (4 sessions, 4 dates; the two remainder texts are the
"task tools haven't been used recently" nudge, 421ch, and the "user
sent a new message while you were working" note, 330ch). The census
label and the blockMigration label name one class from two directions;
only the second one's mitigation (directive
flap-move-mitigation-and-fidelity-gate.md, unit 2 first-seen re-serve)
addresses it.

PLACEMENT, measured on the motivating pair (s-captureF, conversation
e7394e05 replayed from its first request through the real pipeline
under the SERVING gate set; first forwarded divergence, prefix-diff
and an independent probe agreeing on the baseline):

    baseline (today)                              100
    delta re-emitted at a frozen TAIL index       100   <- no absorption
    swallowed message restored at ITS index       123 of 124

Correct bytes at the wrong index diverge the prefix just the same —
the census's own placement rule, now with a number on both sides of
it. Any mitigation for this class is an UN-MERGE (put the swallowed
message back where it was), never a relocation.

### Row 4 datapoint — 2026-07-31 (later): the flap/cross-message-join
### mitigation is BUILT and corpus-clean, pending deployment

The un-merge exists and holds: units 2/2b (join-move first-seen
re-serve, moves surviving resets) plus the reserved-entry identity
build (directive `reserved-entry-identity-directive.md`; the ordinal
re-bind was the last escape). Measured A/B over the whole live corpus
(8.5 GB, 36 captures, serving gate set, dispatcher-verified): ZERO
insertion-normalization stability violations remain — s-97097e027ac0,
s-captureD, s-4b6a435234bf, s-captureM all at 0; the corpus's entire
remaining stability debt is two deferred-tool-rewrite pairs on
s-captureB, identical pre/post. Old-canon restart transparency
measured (`verdict-ab --seed-from-a` IDENTICAL, 44 lines). NOT
deployed: ships at the deferred restart boundary (operator settle:
after all proxy work — condition now met). The row stays OPEN until
the deployed proxy shows the class as a live non-event; the un-merge
covers the measured join shape — whether every container-migration
EXTENDED instance (e.g. the 14:32:29 KNOWN-OPEN bust) matches its
conditions (a)–(f) live is the post-restart verification question.

### Row 4 datapoint — 2026-08-02: the escape the un-merge left open is
### SHIPPED — occurrence-ordinal re-attribution (739aa22)

The entry above calls the ordinal re-bind "the last escape" and it was
right, but only for RESERVED entries. Non-reserved entries kept
absolute `(h, r, o)` matching, and the file said so in a sentence that
declared the general case out of scope (`:1108-1110`) — that sentence
was the defect, and it cost 535k tokens on 2026-08-02.

Mechanism, measured not modelled: an ordinal is a position within a
family of identical (hash, role) copies. CC swallowed a MIDDLE copy of
the 421-byte "task tools haven't been used recently" nudge, which stood
28x in the canon against 27x on the wire; every later copy shifted down
one, so each survivor bound to its NEIGHBOUR'S wire slot and the LAST
ordinal was reported as the entry that vanished. The entry that
actually left therefore never reached findJoinMoves, which took its
condition-(b) `continue` and returned [] — `moved:5` was five re-fires
of reserved entries with ZERO fresh recognitions, which is exactly why
"the mitigation ran" and "the mitigation matched" came apart in the
telemetry.

Fix: for a family whose live stored count exceeds its wire count by
exactly one, attribution is re-derived with findJoinMoves' own
condition-(d) lo/hi neighbourhood discriminator; everything else fails
closed, INCLUDING an ambiguous family (two qualifying candidates keeps
today's behaviour rather than guessing, because guessing re-serves one
entry's bytes into another's slot).

Corpus A/B, four captures / 4,136 requests, old vs new under each
capture's own serving gates (`tools/replay-compare.mjs --summary`):
three resets eliminated, one per busting capture — s-captureI n=894
(the 660k instance), s-captureZ n=839, s-captureK n=1417 — each
flipping `reset/not-subsequence` -> `normalized`. The latter two are
precisely the captures the investigation had recorded as reporting
canonical ORDER violations under the pre-re-keying revision;
`orderViolations` now reads 0 on BOTH sides of all four, which is the
re-keying doing its job. Every delta begins AT the busting request and
none before it (893, 838 and 1416 preceding requests byte-identical),
every delta absorbs rather than releases (+56/-0, +79/-0, +10/-0 on
suppressed/moved/canonSize), and a capture without the shape
(s-captureX, 261 requests) shows ZERO deltas — the inertness control.

Restart safety (row 3): no new state key, no persisted schema change —
canonical entries keep `{h,r,o}` and only the `o` VALUES are corrected
in place; `freeze` does not appear in this file at all. NOT deployed at
the time of writing: rides one boundary with the row-23 absorb and the
`movedFresh` telemetry split. The row stays OPEN until the deployed
proxy shows the class as a live non-event — a shipped extension is not
a closed row, per this matrix's own rule.

### Row 4 datapoint — 2026-08-05: the first POST-DEPLOY instance, and
### it is a live EVENT, not the non-event the row waits for (349k)

The two entries above both close with "the row stays OPEN until the
deployed proxy shows the class as a live non-event". The deploy
happened (2026-08-05 boot, proxy_tree `eec233efa271`, systemd
`ExecMainStartTimestamp` 09:59:00 CEST = 07:59Z) and the class fired
70 minutes later. This datapoint records the event and what the
mitigation did, measured — the attribution of the residual is a
separate, open question stated at the end.

THE BUST. Session s-captureQ, 2026-08-05T09:09:41Z / 09:10:03Z (one
event, double-recorded: the 09:09:41 ledger row raced and never
upgraded off `cause=other`, the 09:10:03 row carries
`messages_changed`; `bust-triage --at` on the earlier one prints
`WARN reconcile`). 349,004 tokens re-billed against `ctx` 364,589,
`cacheRead` 15,583 — i.e. the surviving hit is tools+system ONLY and
the whole messages array was re-billed, the row-4 economics exactly
(the mid-history mutation invalidates every message-level breakpoint,
all of which sit at the tail).

THE SHAPE, read off the raw pre-pipeline capture (ordinals 220 ->
221, ts 09:07:57.554Z -> 09:09:01.686Z, 424 -> 428 messages;
`system` and `tools` byte-identical). Raw index 369 is `role:user`
`[tool_result, text(364ch)]` where the text block is a
`<system-reminder>` wrapping a 327-char PreToolUse:Bash hook context;
at 221 that message is `[tool_result]` alone. Raw index 370 is
`role:system`, a 370-char string at 220 and a 699-char string at 221
— exactly `hookText(327) + "\n\n" + userMsg(370)`, the cross-message
join this row already names. The SAME shape recurs at 378/379, where
the migrated reminder INSERTS a new standalone instead of merging
into an existing one, shifting the tail; that is why the pair is
+4 messages and why 48 indices of the common prefix diverge while
only two of them are the migration itself.

WHAT THE MITIGATION DID (replay of the whole capture under
`--gates-from-capture`, exit 0: 0 stability / 0 safety / 0
conservation / 0 sequence / 0 order). At n=221 insertion-normalization
reports `action:"reset"`, `resetReason:"not-subsequence"`,
**`movedFresh:2`** with join-move suppressions at indices 370 and 402
— the un-merge RECOGNIZED both migrations, on the reset path, which is
what `resetKeepingPins` (insertion-normalization.mjs:919) exists for.
The forwarded message count held at 414 -> 414.

AND THE PREFIX STILL DIVERGED — MEASURED, ATTRIBUTED, AND IT IS
OURS. Same-day measurement (standalone probe over
`proxy/pipeline.mjs`, capture replayed from record 0 under
`--gates-from-capture`, forwarded bodies dumped for both ordinals;
`outBodySha` 7b6d51c6027e5e2d / 96c35fd312c577d6 agreeing with the
replay report, so the probe measured the same pipeline replay.mjs
does). First divergence over the FORWARDED arrays is index 360, both
sides 414 messages:

    n=220 forwarded[360]  {"role":"system","content":"<370-char string>"}       405 bytes
    n=221 forwarded[360]  {"role":"system","content":[{"type":"text",...}]}     430 bytes

The inner text is BYTE-IDENTICAL. The 25-byte delta is exactly the
JSON of `[{"type":"text","text":` + `}]` — the container, and nothing
else.

(CORRECTED 2026-08-05: this entry first read 403/428. Those were
`JSON.stringify(msg).length` — UTF-16 code units, not bytes, under a
label that said bytes. The message carries exactly one non-ASCII
character, U+2014 EM DASH at index 208 of the extracted text / byte
offset 239 of the n=220 stringify, 3 bytes in UTF-8 against 1 code
unit, present once on each side: +2 and +2. The 25-byte delta is
unaffected, which is why the conclusion stood while the absolute
numbers did not. Found by `tools/absorption-classify.mjs`, which
counts `Buffer.byteLength(..., "utf8")` — the wire's unit — and
disagreed with this entry rather than being reconciled to it.) And `forwarded[360]` of n=221 is byte-present nowhere in CC's
raw array: **we built it.**

ATTRIBUTED BY EXERCISING, not by reading — the probe re-ran the
pipeline one extension at a time and printed the message's container
after each. It enters `insertion-normalization` as CC's merged
`string(699)` at raw index 370 and leaves it as `array[1] text
textLen=370` at index 360; every one of the 12 extensions after it
leaves the container untouched. The named lead in this entry's first
draft — `cache-control-normalize` / `ttl-management`, from the
`mutatedBy` delta — was WRONG, and the trace is what says so.

WHY THE CANONICAL HOLDS AN ARRAY. Because that is the form CC first
sent, and the pin re-serves first-seen bytes. Measured over the
message's whole life in this capture: at n=194 (08:56:27.369Z, its
first appearance) it is `array[1]` carrying
`cache_control {"type":"ephemeral","ttl":"1h"}` — CC had the
breakpoint on it — and from n=195 onward it is a bare STRING for 26
consecutive requests. This is row 24's container flip
(`content:[{type:"text",text:T,cache_control:…}]` -> `content:T`,
"CC wraps a string-content message in a block array to attach the
breakpoint, then reverts it once the marker moves on") seen from the
other side: the flip happened at n=195 and cost nothing, because
nothing re-served that message until the join-move at n=221 did.

**So rows 4 and 24 COMPOSE into a bust neither predicts alone.** The
un-merge is right about the text and right about the index and
re-serves a container that has not been on the wire for 26 requests;
a wrong container diverges the prefix exactly as much as wrong bytes
would. It also explains the timing — the stale container is dormant
until a join-move fires, which is why 26 requests passed clean.

CONSEQUENCE FOR THE READY ITEM: the narrow container normalisation
(BACKLOG, row-24 messages half) now has a SECOND measured instance
and a second, independent reason to exist — it is not only about
absorbing CC's flip, it is about what our own canonical stores. The
named missing evidence on that item ("the container flip has ONE
measured instance and its corpus-wide frequency is unmeasured") is
one instance less missing.

The original live-ledger reading follows, kept because it is what
pointed at index 360 in the first place.

AND THE PREFIX STILL DIVERGED. The live prefix-diff ledger
(`s-af2dced50fc1-events.jsonl`, ts 09:09:01.704Z, view
`forwarded@680`) reports `messages@360(system)` with
`chain.prevContent` and `chain.nowContent` IDENTICAL over their first
~120 chars — both begin "The user sent a new message while you were
working:". So the substitution put the canonical text back and the
two messages still differ somewhere the content preview does not
reach. That is what the measurement above then answered.

WHY NO GATE CAUGHT IT, and this is the part worth carrying. The
capture replays exit 0: stability 0, safety 0, conservation 0,
sequence 0, order 0. Every one of them is correct. **Stability asks
whether OUR output diverged EARLIER than CC's input** — here CC
diverged at raw 369/370 and we diverged at the same logical slot, so
we did not make it worse and the gate is right to stay green. What
no gate asks is whether we ABSORBED it. A mitigation that recognizes
its class, fires, and absorbs nothing is indistinguishable from one
that was never reached, and today the only thing that separates them
is a human reading `movedFresh` against a prefix-diff row. That is a
missing check, booked in BACKLOG.

WHAT THIS DOES NOT SAY. It does not say the un-merge is broken —
recognition fired, the count held, and the text it restored was
correct. It says the row's closing condition (a live non-event) is
NOT met on the deployed build, and that the residual is a
container flip belonging to row 24. Row 4 stays OPEN with this event
against it.

REFUTED HYPOTHESIS, recorded because it was the session's entering
premise and it was wrong in an instructive way: that the divergence
was a periodic re-anchor hook injecting a ~52KB CLAUDE.md corpus
block at the 300k/400k token thresholds. Three independent
measurements kill it. (1) The 52,883-char corpus block is real but
sits at `messages[0]` — the SessionStart `claudeMd` context, present
from the session's first request and byte-identical across the pair,
368 indices before the first divergence. (2) The re-anchor hook DID
fire (crossing 300,000, at `messages[347]`) and its injection is
**2,324 chars, not 52KB**: the harness's persisted-output mechanism
truncated it to a 2KB preview plus a file pointer
(`.../tool-results/hook-…-additionalContext.txt`, 54,266 bytes on
disk). It too is byte-identical across the pair and sits 22 indices
before the divergence. (3) The divergence is 327 bytes of hook prose
changing container. The probe carried its own known-positive — the
corpus needles ("Grounding — evidence", "Insurance mechanisms",
"Model routing for dispatches") MATCHED at `messages[0]`, so the
absence at the divergence is a measured absence, not a dead
predicate. Operator-side consequence, outside this repo: the
re-anchor mechanism is not delivering the corpus it was built to
re-show — only its first 2KB reaches the model.

### Row 4 datapoint — 2026-08-07 12:58:06Z (14:58 local): a routine
### instance, recorded because the row counts instances

THE BUST. Capture s-captureAR, 2026-08-07T12:58:06Z, 178k re-written,
transcript cause `messages_changed / 154634`; `bust-triage` reconciles
the worktime ledger against the transcript and they agree. Capture pair
covers the window (12:57:00.736Z -> 12:57:44.661Z, n=105->115).
`bust-triage` verdict KNOWN-OPEN, row 4.

THE SHAPE. Census `replace/edit`; the migration check names it a row-4
container migration at host 46, sub-class EXTENDED/NEW-TEXT — the class
this row's own 2026-07-31 entry already books as absorbable by refusing
the edit rather than predicting the bytes (READY item in BACKLOG.md,
not yet built). So this is an instance of a known-open class with a
designed and unbuilt mitigation, not a new mechanism.

ABSORPTION, ANSWERED 2026-08-07T13:47Z by the sweep that was still
running when this datapoint was first written. Over this capture's 519
same-conversation pairs (548 requests): `absorptionMisses 0`, `ours 0`,
stability 0, safety 0, sequence 0, order 0, conservation 0, exit 0, and
`provesNothing: false` — so the run checked something rather than
reporting an empty verdict as a clean one. The three `stabilityExempt`
rows were read rather than counted, because an exemption ON the busting
pair would make this green meaningless: all three are
`fresh-session-sort:first-appearance-relocation` at n=23, 29 and 57
(12:49:09Z-12:51:15Z), six minutes and ~50 requests before the pair that
busted. The busting pair carries no exemption. So nothing of ours fired
and failed here — the 178k is CC's own mid-history edit landing in the
EXTENDED class whose mitigation is designed and unbuilt, which is this
row's open item and not a mitigation defect. No
new pin was taken: the row-4 class survives the scrub (structural —
indices, ordinals, migration shapes) and is already frozen by an
existing fixture, so another pin buys megabytes and no new evidence.

### Row 4 datapoint — 2026-08-06 18:08:32Z: a 20-leg OSCILLATION at one
### index, 300,597 tokens, and the instrument that should have shown the
### bytes was printing another request's

THE BUST. Capture s-captureAM, 2026-08-06T18:08:32Z, `cc` 300,597
against `ctx` 315,821 with `cacheRead` **15,222** — the surviving hit
is tools+system only and the whole messages array re-billed, this
row's economics exactly (the mid-history mutation invalidates every
message-level breakpoint, all of which sit at the tail). Transcript
cause `messages_changed / 267780`. `bust-triage`: KNOWN-OPEN, row 4.

THE SHAPE, off the raw pre-pipeline capture (replay under the SERVING
gate set, 10 of 10 declared, exit 0). Eight mid-history edits inside
27 seconds, **five of them at the same raw index 235**, each
re-billing 105–128 kB:

    n=257->259  edit@235 of 283  [anchor-48]  18:07:57.714Z
    n=259->260  edit@235 of 282  [anchor-45]  18:07:59.753Z
    n=262->263  edit@235 of 285  [anchor-48]  18:08:11.130Z
    n=264->265  edit@235 of 287  [anchor-45]  18:08:23.483Z
    n=265->266  edit@235 of 290  [anchor-48]  18:08:24.985Z   <- the bust

Block migrations over the capture: **32, 20 FLAP, 16 JOIN (13
cross-message)** — the same three blocks (raw 237/238, 256/258,
276/279) plus two cross-message joins (234+235<->235, 249+250<->251)
reversing direction on four consecutive requests. This row's own
census callout predicted the outcome verbatim: a pin that classifies
one of the two shapes absorbs one leg, so an oscillation busts on
every second flip at best.

WHAT THE MITIGATION DID. `insertion-normalization` recognized the
migration on three of the requests (`movedFresh: 2` at 18:07:57.724Z
and 18:08:11.139Z, `movedFresh: 1` on the `reset/not-subsequence` at
18:08:24.994Z — the busting request), with `join-move` at indices 235
and 251 each time. The gates are clean: 0 stability / 0 safety / 0
sequence / 0 order / 0 conservation over 256 same-conversation pairs,
2 stability exemptions (both elsewhere, 17:39Z and 17:48Z), and
`findAbsorptionMisses` returns one row for the whole capture — pair
n=84->222, `ours: false`. So the absorption fired and the prefix broke
anyway, and **nothing we run says whose the residual is**: the miss
check only examines pairs where an absorption both claimed AND had a
fresh index at or above the forwarded divergence, which excludes all
five of these.

ATTRIBUTION: **CC's**, by construction. The edits are in the RAW
capture (request-capture, order 60, ahead of every mutating
extension), so the divergence exists before we touch the body; the
stability gate — which compares our divergence index against CC's on
the same pairs, with the same primitives — reports 0 violations, i.e.
we never diverged earlier than CC did. Disposition: another INSTANCE
of this row, not a new class.

THE BYTES, and the instrument correction that produced them. The
`anchorDelta` of -45/-48 puts every one of these outside the known
reminder-ANCHORING class (CC#78660, edits within ±2 of the last human
turn), which is what the far-from-anchor tripwire exists to say. It
fired — and its excerpt pass printed `(missing)` for five of six asks
and, for the sixth, a request from **eleven minutes earlier**. Cause:
the asks were keyed by the census ordinal `n` and matched against
`readCapture`'s LINE index, which counts outcome and boot records too;
main()'s own read loop documents that hazard 500 lines above the pass
that walked into it. Fixed the same session, red-first
(`test/replay-excerpt-record-identity.test.mjs`, RED on the shipped
code with the decoy request's bytes in the assertion diff). With the
join on the record's own id, index 235 reads:

    n=264 (before)  system: PreToolUse:Edit hook additional context: Writer-claims note (§4 mirror duty)…
    n=265 (after)   system: The user sent a new message while you were working: …

i.e. the slot's occupant changes because the block at 235 merged into
234 and the tail shifted up — the cross-message join this row already
names, now with its bytes rather than by inference. The forwarded side
agrees in its own coordinate space: prefix-diff on the busting request
records `messages@248(system)`, `systemMatch: true`, `toolsMatch:
true`, 286->286, prev "The task tools haven't been used recently…" ->
now "PostToolUse:Edit hook blocking error…". Raw 235 and forwarded 248
are NOT equated here; each is quoted from the instrument that
produced it.

NOT PINNED. The class is structural (indices, ordinals, migration
shapes — what the sanitizer preserves), so a pin WOULD reproduce it,
unlike s-captureAL's. It is not taken because this row already carries
two pinned fixtures for the same shape (s-captureAE, s-captureAF) and
a third buys no class the corpus lacks. The durable evidence here is
this entry plus the excerpt-pass regression test, which is the piece
that did not exist before.

### Row 3 datapoint — 2026-08-05: a restart cost 655,021 tokens, and the
### row-3 statement that preceded it PREDICTED the class and mis-sized it

The restart at 14:19:51 CEST landed BETWEEN the two requests of a
busting pair (14:19:40 -> 14:19:58), on the machine's longest-running
conversation. `bust-triage`: 786k re-written, transcript
`messages_changed / 655021`, census **append-only** — CC moved nothing
mid-history. The forwarded view diverged at `messages@1180(assistant)`
with `system: match`, `tools: match`, so the change was OURS.

MECHANISM, each link measured rather than inferred:
`identity-normalization`'s message loop runs over EVERY message,
assistant turns included, and applied `normalizeSessionStartText` to
any text block containing the marker ANYWHERE. The anchoring fix
shipped minutes earlier restricts it to blocks that ARE the hook's
output. The diverging message is raw index 1216 — an assistant turn
of this very session — and it contains
`SessionStart:resume hook success:` quoted in prose, in a paragraph
reporting the anchoring fix. Old build rewrote it; new build does not;
the restart swapped builds mid-conversation; the message changed
mid-history; the whole prefix after it was re-billed. It settled after
one re-baseline, as a one-time cost should.

WHAT THE ROW-3 STATEMENT GOT RIGHT AND WRONG. It named the class
exactly: "the forwarded bytes change for a narrow class — messages
quoting the marker in prose — so running conversations with such
content pay a one-time re-baseline." That prediction was correct. The
sizing was not: it closed with "one measured instance corpus-wide, so
cheap and right", and that is the wrong denominator. The corpus is
historical captures; the bill is paid by conversations RUNNING NOW.
The one live session that contained the affected prose was the 800k
session in which the change was being written — the blast radius was
concentrated precisely where the work was happening, which is the
normal case for a change made while using the thing it changes, not a
coincidence.

THE MEASURED NEGATIVE, without which this datapoint would be
over-applied. Six restarts on 2026-08-05 across four code trees; ONE
busted. Boots at 08:03:56, 09:33:39 (tree eec233efa271), 09:57:44
(e5bb97874a74), 11:30:12 and 11:39:11 (d2dd0ea6f9bc), 12:19:52
(9ef42be576bd); the only bust within five minutes of any of them is
the 12:20:13 one above, 21 seconds after the last. The cleanest
control is the 11:30/11:39 pair: it deployed a COMMENT-ONLY scrub of
proxy/**, so the tree hash and the source fingerprint both changed and
the process genuinely restarted — and it cost nothing, because the
forwarded bytes were byte-identical. That isolates "restart" from
"changed bytes" as well as a live experiment can. The 09:57 restart is
a second control: a real behaviour change (the description absorb)
that no live conversation's existing prefix reached.

Restarts are normally free because the state that matters PERSISTS:
insertion-normalization writes its canonical to disk and re-reads it
per request, thinking-block-sanitize re-seeds its v2 state from a
file. A restart loses module-scope memory and rebuilds it from the
same durable state, so it forwards what it would have forwarded a
second earlier.

THE RULE THIS EARNS, and it is narrower and more useful than "restarts
are cache-transparent unless state keys or freeze logic change": that
formulation asks about the DIFF. A restart is transparent only if
nothing an extension does to forwarded bytes changes across it, and
the cost is measured in the TOKENS OF LIVE SESSIONS, not in corpus
instances. Before a restart whose change alters forwarded bytes for a
named class, ask which running conversations contain that class and
how large they are. `tools/restart-exposure.mjs` answers the
size half mechanically.

### Row 3 PRE-declaration — the XDG migration restart (stated BEFORE, as
### the 21:46 amendment requires; operator authorized 2026-08-07)

Written before the restart is taken, so it is a PREDICTION and not a
post-hoc reading. The change moves sixteen paths out of `~/.claude/`
to `~/.local/share/cache-fix/` and `~/.local/state/cache-fix/`,
including every persisted store the stateful extensions read:
`cache-fix-state/`, `cache-fix-snapshots/`, `cache-fix-keymap.jsonl`.

THE DECLARATION. No state KEY changes and no freeze logic changes —
the keying, the canonical identity scheme and the freeze predicates
are untouched; only the DIRECTORY the store lives in moves. Under the
21:46 amendment's formulation, which asks about the diff, that reads
transparent. Under the sharper rule two paragraphs above — transparent
only if nothing an extension does to forwarded bytes changes across it
— it is transparent CONDITIONALLY, and the condition is the whole
risk: an extension whose store arrives intact at the new path
forwards what it would have forwarded a second earlier, and an
extension whose store does NOT arrive starts empty. An empty store is
indistinguishable in effect from a changed key: every baseline it
addressed becomes unreachable, and the first request per conversation
forwards CC's raw array instead of the frozen one — row 21's measured
`tools_changed` shape, one-time per conversation, self-healing on the
next request, and real.

So the prediction is two-branched, and the branches are what make it
worth writing down:

- Every store arrives and is read at its new path -> **zero tokens**.
  Not "cheap" — zero, because the forwarded bytes are byte-identical
  by construction.
- Any single store does not arrive -> a guaranteed re-baseline for
  every conversation that store addressed, priced below.

MEASURED EXPOSURE, 2026-08-07 12:58Z (14:58 local), `restart-exposure
--window-min 60`: 7 live sessions, ~846k tokens worst case, the three
largest at ~336k / ~233k / ~166k. No `--match` predicate is given
deliberately: the affected class under the failure branch is not a
content class but "every conversation with persisted state", so the
whole-population number IS the right denominator here — the one case
where the unnarrowed figure is the honest one rather than the lazy
one. One of the seven is the session performing the migration, which
the 2026-08-05 datapoint above already names as the normal case for a
change made while using the thing it changes.

WHAT DISCRIMINATES THE BRANCHES, checked before `start`, never after:
per moved path, one executed read through the tool or extension that
owns it. A path that reads back is in branch one; a path that does not
is in branch two and the restart is aborted rather than diagnosed. The
`ls` of the old location is NOT this check — an empty old directory
proves a move happened, never that the destination is readable by the
code that needs it, and that gap is exactly where a silent branch-two
failure would sit.

## Row 24 — messages layer: DESIGN, not a negative (2026-08-02,
## opus investigation, dispatcher-verified independently)

The row's messages half was once graded "probably not mitigable" on the
argument that a 28-message-shorter history is not a subsequence, so
re-serving the pre-exit array would send turns CC no longer believes
exist. The operator rejected that deferral. The argument is not merely
weak — **it is false**, and the measurement says so twice over.

ZERO REAL TURNS ARE DROPPED. Positional LCS over `semanticIds` gives 76
dropped / 48 added (the row's earlier 49/18 was a SET difference and
undercounts). All 76 dropped are `role:"system"`; of the 48 added, 46
are `role:"system"` and the other two are ordinary tail growth. Two
mechanisms, both decoration: (a) PreToolUse hook contexts are not
replayed on resume — 37 `PreToolUse:Bash` messages plus the Pre-halves
of 9 combined Pre+Post messages are present pre-exit and absent after;
(b) the recurring task-tools nudge is re-emitted at different indices,
byte-identical text, its cadence counter restarted by the resume.

VERIFIED INDEPENDENTLY by the dispatcher on a DIFFERENT identity
function (raw content hashing, not replay.mjs's semanticIds — an
independent check that borrows the instrument inherits its blind spot):
**846 of 846** of the pre-exit array's real turns embed in the resumed
array as a clean subsequence, once `messages[0]` and 3 turns are set
aside. PRECISION, because the two levels get confused: "zero real turns
dropped" holds at POST-NORMALIZATION identity. At raw bytes the dropped
multiset is 46 system + 3 USER, and those 3 differ only by an
in-message `<system-reminder>` block that the ALREADY-SHIPPED volatile
pin absorbs. A later reader checking the claim at the wrong level will
think it failed.

WHAT PINNING REACHES, nested, same pair:
- `messages[0]` alone: divergence 0 -> 41, i.e. 198,686 of 1,743,269
  message bytes = 11.4%, ~67k tokens. **Not worth a restart alone** —
  which is exactly why the row's original single-layer design would
  have underdelivered.
- plus the `role:"system"` layer canonicalised: 99.63%, ~589k tokens.
- plus the shipped volatile-block pin: **100.00%** — 849 of 849
  non-system turns match. The post-resume array is a strict SUPERSET of
  the pre-exit conversation: same real turns, same order, byte-identical
  modulo decoration, plus 3 new tail items.

A SECOND ROOT CAUSE THE ROW DID NOT HAVE, and it is NOT resume-specific.
The 16:13:10 request is a clean MESSAGE-LAYER ISOLATION — `cacheRead =
15,223`, exactly tools+system, byte-identical across that pair — and it
still re-billed 588,956. Byte firstDivergence is 937, the last message
of 938: `role:"system"`, the SessionStart:resume hook output, inner text
BYTE-IDENTICAL at 21,570 chars. Only the CONTAINER differs —
`content:[{type,text,cache_control}]` becomes a bare string `content:T`.
CC wraps a string-content message in a block array to attach the
breakpoint, then reverts it once the marker moves on. Trigger is
computable: the breakpoint lands on a message whose natural
serialisation is a bare string, which is precisely these harness-emitted
`role:"system"` messages — it does not fire on ordinary multi-block
messages, which is why it is not busting every turn. TWO-VARIABLE
CAVEAT, stated rather than attributed: container shape and the
`cache_control` marker changed together at 937, so this pair cannot say
which the server hashed.

COST MODEL, general and worth its own line — it sharpens every other
row. Dispatcher-measured over the whole capture, 1,512 requests with
messages: **1,414 carry a message-layer breakpoint and every one of them
carries exactly ONE — no exceptions.** That single-mark fact is what
"no partial credit" rests on: any divergence before the tail breakpoint
forfeits the entire message prefix. Placement is the softer half and
must be written as such — 1,408 put the mark on the final message and
**6 put it one-to-two from the end** (e.g. 43.1 of 45, 172.1 of 174);
the remaining 98 requests are single-message sidecar traffic carrying no
mark at all. "Always on the last message" is falsifiable in six places;
"one breakpoint, normally on the tail" is not.

DESIGN (simulated on the real pair, not reasoned): widen phase-3's
volatile pin from BLOCK level to MESSAGE level — a whole `role:"system"`
message that is harness-emitted decoration is volatile in the same sense
a `<system-reminder>` block already is — keyed on the existing canonical
entry identity (`computePinnedIdentities`, hash|role|ordinal). ONE
CHANGE REQUIRED: today's removal tolerance marks a canonical entry
missing from incoming as dropped and never forwards it; for this class
it must RE-SERVE the canonical first-seen bytes at their canonical
position. Order violations among survivors and >50% drops keep
resetting — 76/966 = 7.9%, far under. Simulation: forwarded = canonical
A (966, first-seen bytes) + the 48 unmatched B entries in B order =
1,014 messages; `firstDivergence(A, forwarded) = null`, so A is a PURE
PREFIX and the pre-exit breakpoint at 965 is readable;
`validateToolAdjacency` true; the only 3 messages not byte-present are
the already-shipped volatile-pin cases.

SAFETY, and it is stronger than the usual stale-serve argument: the
re-served bytes are ones the model ALREADY SAW in this same
conversation, at the same positions, adjacent to the same tool calls.
The canonical array IS the conversation as the model experienced it, and
CC's resume reconstruction is the lossy party — so this pin does not
serve a stale view, it serves the true one.

NAMED RISK, carried into the build: pinning first-seen bytes for a
message that carried a breakpoint re-serves a stale `cache_control`
beside the live one. The API allows 4, so two is in budget, but the
implementation must COUNT them rather than assume.

NAMED GAP, not bridged: the container flip has ONE measured instance;
corpus-wide frequency is unmeasured. The check that would settle it —
"divergence at a string-content message that previously carried
cache_control" — does not exist in replay.mjs.

THE CHEAPER DESIGN THIS BASIS DOES NOT RULE OUT, per the standing
not-a-cheap-negative rule applied in the affirmative direction: normalise
ONLY the string <-> single-block container and leave `cache_control`
alone. That is narrower than the message-level pin and, because the
588,956 half needs no tools or system fix, **it would cover the
unconditional half by itself**. Price it before building the wider pin.

VALUE SPLIT, which decides scheduling: 588,956 tokens are recoverable by
this design ALONE, gated by nothing. A further ~603,242 needs row 23's
tools absorb AND the system-prompt half to BOTH land, because the cache
is a strict prefix [tools][system][messages] and tools differ by
construction on resume. **The system-prompt half is therefore the
binding constraint on the resume's FIRST request — not the messages
half.** Session profile for scale: 20 busts over 100k in this session,
4,566,292 tokens re-billed; the resume pair is 1,192,198 of that, 26%.

### Row 24 datapoint — 2026-08-05 evening: the breakpoint's OWN departure
### re-bills the array (610k), and it falsifies a same-day "free" finding

The row already names CC's habit of wrapping a string message in a block
array to attach a breakpoint and reverting it once the marker moves on.
This is that habit costing the whole array, measured end to end, and it
is recorded here because a finding made the same afternoon says it
should have been free.

THE EVENT. Session s-captureAD, 2026-08-05T20:52:03Z, 610k re-written,
`messages_changed / 529627`. Capture pair: requests 218 -> 219,
20:50:40.217Z -> 20:51:02.935Z, 456 -> 458 messages. Frozen before
rotation as `pinned-s-6052bdc81b48-218-219` (431 records, full prefix
from 0), so this datapoint outlives its capture.

THE SHAPE, read PRE-pipeline. `tools` byte-identical, `system`
byte-identical, and the first divergence over the raw arrays is at index
**455 — the last message of the 456** — where the two differ by exactly
48 bytes: `,"cache_control":{"type":"ephemeral","ttl":"1h"}`. Verified
mechanically, not by eye: the pair is identical once every
`cache_control` key is dropped. One differing index in the entire common
prefix.

WHY IT COSTS, and this is the part worth keeping. CC carries exactly ONE
message-array breakpoint and walks it forward every turn: request 218
has it at `455:block[1]`, request 219 at `456:block[0]`. Both also carry
`system[1]` and `system[2]`. So the entry request 218 wrote ends AT
message 455 — the message that then changed — and the only breakpoints
that survive the change unaltered cover tools+system alone. The
all-or-nothing billing this matrix already states then applies to the
whole array.

WHAT IT FALSIFIES. The same day's absorption classification found 26 of
34 misses to be cache_control-only and inferred that a moved marker is
free, on the basis that 32 of 34 rows had no cold event within +/-180 s.
The COUNTING stands (the daily sweep now emits `cacheControlOnly` and
reproduces it). The INFERENCE does not: absence of a bust at those rows
is equally consistent with an older cache entry — written when the
changed message was not yet the tail — still being readable. This event
is the case where no such entry survives. A moved marker is free WHEN an
entry ending below the change is still readable, which is a narrower
claim than the one that was made, and was published to
anthropics/claude-code#81967 before the narrowing and withdrawn there.

NAMED MISSING EVIDENCE, and the reason no fix is proposed: the split
between "read an older entry" and "read nothing below system" is
per-request `cache_read_input_tokens` vs `cache_creation_input_tokens`,
and no capture on this machine carried outcome usage records. `usage-log`
was enabled the same night (ccff048 lineage, proxy tree f024b0a) and now
writes them, so the next instance of this shape is measurable rather
than arguable. Nothing here is demonstrably ours: the divergence is
present in CC's own bytes before any extension runs.

### SECOND INSTANCE 2026-08-06 16:35:15Z — same class, 308k, and the tool
### could not reach this walk

Found at session close by the close-out lane's step 2, not by anyone
looking for it. `bust-triage --at 2026-08-06T16:35:15Z` over capture
`s-captureAH`: transcript cause `previous_message_not_found`, census
`append-only`, pair n=54->57, **308k re-billed** — six times the 51k of
the walk below, because the rebuilt prefix was that much larger. A
`CONTROLLED(resume)` of identical size sits three seconds later on the
same session, which is the same event seen from the other side.
**Disposition: CONTROLLED-CAUSE**, by the walk below — the inherent
first write of a rebuilt prefix, no mitigation target. Evidence frozen
and VERIFIED: `pinned-s-48bf252a4e02-101-122.json`, 231 records, and
`harvest --pin`'s new self-verification replayed it green (103
same-conversation pairs, 0 violations) rather than reporting a success
it had not checked.

**The finding is the tool, not the bust.** `bust-triage` returned
**UNCLASSIFIED** — "a class nothing currently covers" — for a class this
matrix walked five days earlier. The walk is PROSE under a `## Event
walk` heading, and `causeToRow` only reaches numbered rows, so a
documented, dispositioned class is invisible to the front-line triage
that exists to find it. That is the repo's own entry-path rule aimed at
the matrix itself: the knowledge is recorded on a route the reader takes
and absent from the route the TOOL takes. Booked in BACKLOG.

**Second, smaller, and stated as unverified:** the ledger's cause was
still `other` while the transcript held `previous_message_not_found` —
the raced-read defect the walk below records as FIXED the same day
(claude-worktime `62420da`). Whether that fix does not cover this path,
or this is a different manifestation, is NOT established here; it is a
claude-worktime question and is named rather than diagnosed.

### Row 27 datapoint — 2026-08-06 23:59:10Z: the row this event needed did
### not exist, and three instruments called it three different things

The statusline showed `❄ #4 216k idle (0m)`. `--list` showed **three**
new events, not one, and two of them are the same 216k:

    23:59:47Z  216k  CONTROLLED(resume)   c52b6f1f
    23:59:10Z  216k  idle                 c52b6f1f
    23:31:28Z   61k  CONTROLLED(compact)  2d1e5a89

WHAT IT ACTUALLY WAS. Ledger record at t=1786060750: `k:"hit"`,
cause `idle`, `cc` 215,873, **`gap` 22,702 s** — six hours eighteen
minutes. `"ttl":"1h"` appears 217 times on that same session's own
wire, so every entry had expired more than five hours before the
request was composed. Transcript diagnostic
`previous_message_not_found`, i.e. CC's own words for the same thing.
The surviving read confirms it independently: `ctx` 215,875 − `cc`
215,873 = **2 tokens read**, so nothing at all survived.
Disposition: **CONTROLLED-CAUSE**, and the walk is

**CORRECTED 2026-08-07, hours after this entry was written.** It first
cited **`mtok` 0** as "the discriminator that makes this
not-a-prefix-defect: no prefix matched AT ALL". That is wrong, and the
error is the field's, not the conclusion's. `mtok` is the MISSED
portion **as read from the transcript diagnostic**, and it defaults to
0 when that diagnostic was never read — the same degraded default
`cause: other` already carries, one field over, and undocumented.
Proof, from the ledger itself: the 204,513-token event of 2026-08-06
17:39-17:40 is booked THREE times, and its three rows read `mtok` 0,
`mtok` 0, and `mtok` 182,728. One event, one true missed portion,
three different values — so `mtok` is a per-ROW read artifact, and
`mtok 0` alongside cause `other`/`idle` carries no information about
the cache at all. Across the last seven cold hits the correlation is
exact: cause resolved ⇒ `mtok` populated; cause `other`/`idle` ⇒
`mtok` 0.
What survives unchanged is the CONCLUSION, because the other three
legs never depended on it: a 6h18m gap against a 1h TTL, CC's own
`previous_message_not_found`, and the 2-token surviving read. Struck
here, and struck in the guard design this row spawned — which had
`mtok === 0` as one of two discriminators and would have shipped a
check keyed on a default value.
complete — there is nothing to mitigate.

THREE INSTRUMENTS, THREE ANSWERS, on one event:

- the LEDGER booked it twice with contradictory classes — `k:"hit"`
  (cls `bust`, a prevention target) at 23:59:10Z and `k:"cost"` cause
  `resume` (cls `controlled`, explicitly not triageable) at 23:59:47Z,
  both carrying `cc` 215,873. A third row (`k:"hit"`, cause `other`,
  23:59:15Z) WAS retracted by a `hit-retract` at 23:59:47Z, so the
  retraction machinery fired and took the wrong duplicate. 431,746
  tokens attributed for 215,873 spent.
- `bust-triage` answered **KNOWN-OPEN, row 4** — confidently and
  wrongly. `classToRow` maps census `replace/edit` -> 4 and the pair
  does carry a real container migration at host 104 (EXACT); both
  statements are true and neither is the cause, because the cached
  bytes were already gone. This is worse than the UNCLASSIFIED failure
  BACKLOG already books for `causeToRow`: a false positive on a live
  row, silently inflating row 4's evidence with a 216k instance row 4
  did not produce.
- the RECONCILE check warned "LEDGER says idle, TRANSCRIPT says
  previous_message_not_found — instrument disagreement". They are not
  disagreeing. One is the ledger's gap-derived cause, the other is the
  API's diagnostic, and they name one eviction. A check that fires on
  agreement is the fires-on-a-non-defect class.

WHY THE 2026-07-31 WALK BELOW DID NOT COVER IT. That walk fixed this
in claude-worktime (62420da) and states the contract plainly: the
resume-split means `previous_message_not_found` **never books a hit**.
Today it booked one. The fix held on the route it was built for (the
late-bind `other` cause — that duplicate is exactly what got
retracted) and not on the `idle` route. Same entry-path shape this
repo's guard table already collects, one system over.

AND THE WRITER HALF. That 2026-07-31 disposition lives in a
`## Event walk` prose section, which `causeToRow` cannot index — the
gap BACKLOG already books. Minting row 27 as a TABLE row rather than a
fourth walk section is the writer-side repair for this instance:
`matrixRow(27)` now parses, verified by calling it. What still has no
reader is the route from `previous_message_not_found` / a
TTL-exceeding `gap` TO row 27, and that is booked.

## Event walk 2026-08-07 09:52:42Z — ❄ 212k `other`: CONTROLLED-CAUSE.
## A 4-hour idle expired the entry; the LABEL was the only surprise.

WALK-INDEX: cause=previous_message_not_found disposition=CONTROLLED-CAUSE row=none — the entry expired before the request was composed; nothing the proxy forwards can change that, and the 2026-07-31 walk below already holds the disposition.

Operator report (11:52 local / 09:52:42Z): "I just resumed, so I expected
`idle` — I see `other`." The expectation was right and the label was the
instrument. Disposition: **CONTROLLED-CAUSE** — nothing to mitigate.

THE MEASUREMENT, from the session's own transcript:

    09:52:46.277Z  cc=211,558  cr=15,240   <- the event
    diagnostics    cache_miss_reason: previous_message_not_found

The surviving read is 15,240 — system+tools and nothing else, the same
signature the day's other real busts carry. The capture pair is
`05:44:02.327Z -> 09:51:59.999Z`: a **4 h 07 m 57 s gap** against the
session's own `"ttl":"1h"`, so the cached entry had expired hours before
the request existed. Census `append-only`, no reminder container
migration — nothing of ours is in this pair, and there is no prefix left
to have protected.

WHY THE LABEL SAID `other`. The ledger's cause is the DEGRADED DEFAULT
(`claude-worktime.sh:1662` sets `other` and overwrites it only if the
diagnostic is read successfully); this read raced and never upgraded.
`other` means "no cause available", never "causes tested and rejected" —
FORK-NOTES has said so since 2026-07-27, and this is the shape a reader
hits when the two instruments are read as if they were one vocabulary.

INSTRUMENT NOTE 1, and it is a first fire rather than a defect: the
reconcile check shipped 30 minutes earlier (`fb20f3d`) printed
`ledger still "other" while transcript has "previous_message_not_found" —
raced read never upgraded`. Built against a 2026-08-05 known positive,
it fired unprompted on a NEW event the same morning and named exactly
what the operator was asking about.

INSTRUMENT NOTE 2, a KNOWN reader gap, not a new class: the verdict reads
**UNCLASSIFIED**, because `causeToRow` still cannot reach the
`previous_message_not_found` disposition that lives in the 2026-07-31
`## Event walk` prose. That is the ranked-5th BACKLOG entry, unbuilt as of
this walk. Read this UNCLASSIFIED as the booked gap firing, and do not
mint a row for it — the disposition already exists, one section down.

## Event walk 2026-08-07 05:24:37Z — ❄ 134k `messages_changed`: NOT OURS.
## Row 4 class again, and the third statiker bust of the day (567k total).

WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=4

Operator-reported (07:24 local), session in project `statiker`, model
`claude-fable-5` throughout; capture `s-captureAN`. A DIFFERENT session
from the 04:08/04:17 pair below — same project, same class, same day.

NOT GROWTH, checked with the discriminator the 01:00:55Z walk minted:

    05:24:31.780Z  cc=997      cr=148,349   <- healthy, reads climbing
    05:24:36.282Z  cc=134,114  cr=15,704    <- the event
    diagnostics    messages_changed / cache_missed_input_tokens: 123,507

The surviving read is 15,704 against a predecessor write of 997 and a
predecessor read of 148,349 — the prefix was lost, not grown into. And
15,7xx is the same system+tools remainder the 04:08/04:17 pair read back
(`cr=15,702`, twice), in a different session four hours earlier.

NOT OURS — replayed under the SERVING gate set (`/health` gates,
`--max-old-space-size=2048`):

    cross-request byte-stability violations (self-inflicted busts): 0
    stability exemptions:                                           0
    safety violations:                                              0
    content-conservation violations:                                0
    canonical order violations:                                     0
    absorption misses (via --json):                                 []

Zero violations AND zero exemptions, so this is not the "green gate with
an exemption on the busting pair" case the runbook warns about.

THE CLASS — row 4, on the cross-message-join leg:

    n=77->80  edit@45 of 73 [anchor-28] ~199 kB  2026-08-07T05:24:32.488Z
              [blockMigration inline->standalone 65->66]
              [blockMigration join:cross-message inline->standalone 45+46->46]

`anchor-28` is inside the census's own far-from-anchor threshold (>30), so
no new mechanism is indicated. OUR side at that instant, from the
insertion event log: `action=reset resetReason=not-subsequence pinned=3
suppressed=3 moved=0 movedFresh=0` — the join-move unit is deployed (the
running process emits `movedFresh`) and moved nothing here, and the census
scored the pair `mitigation: 0/0 mitigable`, i.e. the shape never entered
the mitigable denominator at all. The census's own text says why: "a
cross-message join spans two messages, so no hash set in the extension
matches it". Against this row's 2026-07-31 datapoint — "the
flap/cross-message-join mitigation is BUILT and corpus-clean, pending
deployment" — that is a tension worth a measurement rather than a
paragraph, and it is BOOKED: does `movedFresh` ever fire on a pair the
census labels `join:cross-message`, corpus-wide.

CROSS-CHECK, two independently built instruments agreeing: the hand walk
above (replay census) and `bust-triage --at` (rebuilt this morning) reach
the same pair and the same verdict — `census replace/edit`, `migration
row-4 container migration at host 45 (EXTENDED/MERGED-STANDALONE)`,
`VERDICT: KNOWN-OPEN / matrix row 4`. Note the two print DIFFERENT
ordinals for one pair (`n=70->74` capture lines vs `n=77->80` request
records); that is the documented namespace difference, joined by the
timestamp, not a disagreement.

EVIDENCE, and why no pin was taken: the structural evidence for this class
is already frozen and verified — `pinned-s-86a4ec44206b-69-71.json`
reproduces `edit@32 of 87` with all three cross-message joins. What this
instance adds is a COUNT and a COST, both quoted above from the
transcript, which does not rotate with the capture window.

INSTRUMENT NOTE, third live instance: `bust-triage --at` answered
`UNVERIFIABLE — no capture pair (capture off, or rotated)` on this event
at 07:41 local while the capture sat on disk at 35 MB. Same false
disjunction as the 01:00:55Z and 2026-08-06 walks. Fixed the same
morning (`93a8414`, `22b8c05`); the verdict quoted above is the post-fix
run.

## Event walk 2026-08-07 04:08:35Z + 04:17:25Z — two ❄ `messages_changed`
## (203k + 230k, 433k total): NOT OURS. Row 4 class. Operator hypothesis refuted.

WALK-INDEX: cause=messages_changed disposition=NOT-OURS row=4

Session in project `statiker`, model `claude-fable-5` throughout.
Operator asked whether enabling `/keep-warm` moments earlier caused it.

REFUTED, by timeline. The transcript's own usage rows:

    04:08:34.643Z  cc=203,091  cr=15,702   <- bust #1
    04:12:50.799Z  /keep-warm invoked      <- 4m16s AFTER bust #1
    04:12:53 -> 04:16:56  cr 218,874 -> 242,976, cc 150-1,500  (healthy)
    04:17:24.796Z  cc=229,805  cr=15,702   <- bust #2

Bust #1 PREDATES the invocation. Everything keep-warm did between the
two is visible and healthy — twenty-odd requests, reads climbing,
writes tiny. Its tick interval is 3000 s (50 min), so no tick fired in
this window at all; only the arming happened. Two further refutation
probes: both bust rows are `isSidechain:false` with ZERO sidechain rows
in the transcript (not subagent traffic misread as churn), and every
row across the window is `claude-fable-5` (not a model-switch
cache-key change).

NOT OURS — the gate says so, replayed under the SERVING config
(`/health` gates, `--max-old-space-size=2048`) over the 91 MB capture:

    cross-request byte-stability violations (self-inflicted busts): 0
    stability exemptions:                                           0
    safety violations:                                              0
    content-conservation violations:                                0
    canonical order violations:                                     0

Zero violations AND zero exemptions — so this is not the
"green gate with an exemption on the busting pair" case the runbook
warns about; there is no unexamined claim hiding behind an exemption.

THE CLASS — row 4, the reminder container migration. Both busts sit on
an `inline->standalone` conversion in the census:

    n=198->202  inline->standalone 196->197  04:08:28.897Z
    n=198->202  join:cross-message inline->standalone 178+179->179
    n=243->247  inline->standalone 246->247  04:17:17.861Z

`mitigation: 1/1 mitigable events absorbed (100%)` — what we can absorb,
we absorbed. Both busts read back exactly `cr=15,702`, twice: the same
surviving prefix, i.e. system+tools and nothing else, while neighbouring
traffic read 216k and 243k. Row 4 remains the most expensive open class
and these two events add 433k to it.

ALSO SEEN, not a defect: `tools[] deltas: 5 (5 tools-ONLY)`, each
`membership+ in=9->10 forwardedStable=false heldStable=true` — the
shared-name subset guarantee held on all five; the whole-array
comparison is expected to differ when a deferred tool loads.

INSTRUMENT FINDING, second instance. `bust-triage --at` reported
`no capture pair (capture off, or rotated)` and returned UNVERIFIABLE
while the capture sat on disk at 91 MB. Identical to the 01:00:55Z
walk's finding 2. Two instances now, so this is a recurrence and its
BACKLOG entry should say so.

## Event walk 2026-08-07 01:00:55Z — ❄ 336k `other`: NON-DEFECT.
## The cache worked perfectly; GROWTH was booked as LOSS

WALK-INDEX: cause=none disposition=NON-DEFECT row=none — there is no cache_miss_reason anywhere in this session's transcript, so there is no cause token to index and no loss to mitigate; the two findings are both in instruments and both booked.

Statusline: `❄ 336k other (1m)`, session 06636dd1 (a sibling session,
project `~/dev/Gunther-Schulz`). `--list` confirmed one event, not
several. Disposition: **NON-DEFECT — no cache was lost.** Nothing to
mitigate here; the two findings are both in instruments.

THE MEASUREMENT, from the session's own transcript:

    01:00:26.501Z  assistant  cc=39,711   cr=0        <- first request
    01:00:40.623Z  assistant  cc=335,933  cr=39,711   <- the "bust"

`cr` on the second request is **exactly** the first request's `cc`.
Every cached token was reused; the 335,933 written is content that had
never been sent. Reading the raw capture says what it was: at
01:00:27.553Z the request carries 4 messages and 977 kB, of which
**messages[3] is 907,283 bytes** — a `tool_result` from the session's
first tool call. A large new payload entering the cache for the first
time is what a cache write IS. And there is **no `cache_miss_reason`
anywhere in the transcript** — grep returns zero. The ledger's `other`
here does not mean "cause unavailable"; it means there was no miss to
have a cause.

FINDING 1 — the ❄ detector fires on `cc` alone. A large
`cache_creation` with a HEALTHY `cache_read` is growth, not loss, and
nothing distinguishes them. The discriminator is already computable
from the ledger record: `ctx` - `cc` is the surviving read (375,646 -
335,933 = 39,713, matching `cr` 39,711 to rounding), and comparing it
against the predecessor's write answers "did we keep what we had".
Checked across the three events of the last day, it separates them
cleanly where a `cc` threshold does not:

    01:00:55Z  ctx 375,646  cc 335,933  read 39,713 = predecessor's cc  -> GROWTH
    23:59:10Z  ctx 215,875  cc 215,873  read      2                    -> total loss (TTL, row 27)
    18:08:32Z  ctx 315,821  cc 300,597  read 15,224 = tools+system only -> real bust (row 4)

FINDING 2 — `bust-triage` selected the wrong request, then reported
the evidence missing. Its rule is "the newest request at or before the
ledger stamp", and the ledger stamp is when the RESPONSE was booked.
A `claude-haiku-4-5` sidecar fired at 01:00:54.702Z — 1 message,
2,368 bytes, no tools — 27 seconds after the real request at
01:00:27.553Z (opus-5, 4 messages, 977 kB). The sidecar won. It has no
predecessor in its own conversation, so the tool then printed
`no capture pair (capture off, or rotated)` and `no diagnostic found
(older CC, or transcript rotated)` and returned UNVERIFIABLE — while
the capture sat on disk at 6.6 MB and the transcript at 55 lines. Both
disjunctions false, both files present. The co-tenant interleaving
trap this repo documents everywhere, inside the tool built to end the
hand walk.

## Event walk 2026-07-31 — ❄ 51k previous_message_not_found:
## CONTROLLED-CAUSE (instrument false positive, no bust)

WALK-INDEX: cause=previous_message_not_found disposition=CONTROLLED-CAUSE row=none — the API's own diagnostic for a cached entry that is simply gone (expired, or replaced by a compaction the operator asked for); no prevention target exists proxy-side, so there is nothing for a numbered row to watch.

Statusline showed `❄ 51k previous_message_not_found (12m)` on session
s-captureN. Walked to disposition (basis: worktime activity ledger +
the session transcript's own `cache_miss_reason` diagnostics):

- The session sat idle ~10h (last turn 22:11Z at ~355k ctx, past TTL),
  operator resumed and ran `/compact` FIRST (07:54–07:56Z), then the
  first real prompt at 08:28Z. First API call 08:29:04Z: cc=51061,
  cr=0, `previous_message_not_found` — the inherent first write of the
  brand-new post-compact prefix. Next call read cr=51061 immediately;
  caching healthy throughout. Compact-before-work SAVED a 355k rewrite
  (optimal operator behavior). Nothing proxy-side; no mitigation
  target exists here.
- Why it displayed as a bust — three stacked worktime instrument
  defects (booked in claude-worktime BACKLOG, not here): (1) the
  compact-completion render logged a tokens entry `cr=0,cc=0,ui=0`,
  resetting the idle clock (gap read 32min, not 10h → idle classifier
  missed) and zeroing the cold state's prev-ctx (→ the compact-skip
  predicate `cc ≥ 0.6×prev` fired on prev=0); (2) the busting turn's
  transcript entry wasn't flushed at detection (race) → cause "other"
  → the resume-split (`previous_message_not_found` never books a hit)
  could not fire → false k:"hit" in the ledger; (3) the late-bind
  cause upgrade lacks that split, so the resume-class cause landed in
  the ❄ display — a token the split's contract says never renders it.
  Check-fires-on-non-defect class: each false ❄ trains the operator to
  discount the real ones. FIXED same day (claude-worktime 62420da,
  red-first, suite green): zero-usage renders never persisted;
  late-bind retracts via k:"hit-retract" (readers drop retracted
  hits); the live false hit and the session's ❄ state retro-corrected.

## Hygiene residual — ACCEPTED 2026-08-05: the 8-hex capture-key
## prefix in published history

Full measurements and basis: BACKLOG.md, "ACCEPTED 2026-08-05 … the
8-hex capture-key prefix". Summary for this matrix: the working tree
is clean and the forward gate is closed (contents across every text
type, object key names, and commit messages); what remains is 21
distinct prefixes in fork-main's own commit history and 31
occurrences in three open PR branches' messages, held in upstream's
`refs/pull/N/head`. Upstream's `main` is NOT exposed — both merged
PRs were checked and carry none of the class.

Accepted rather than remediated because remediation does not exist:
GitHub retains `refs/pull/N/head` after force-push and after close
(#294/#296 precedent), so no action produces "the bytes are gone".
And the value is near zero — an 8-hex prefix of a session UUID names a
LOCAL conversation, authenticates nothing, and is worth something only
to a holder of the corresponding capture, which is never published.
That is the opposite of the origin-IP precedent, where the leaked
value WAS the attack surface and remediation meant rotating the host.

Re-opens if a capture becomes public, or if upstream asks for the
branches to be rewritten.

## External issue sweep vs. this stack — coverage matrix (2026-07-29)

A sweep of anthropics/claude-code issues (33 included, 25 read in full;
report: sonnet dispatch, cc-cache-invalidation-report) deduplicated to ten
cause classes. Coverage verdicts, each measured where possible:

- COVERED — tools[] mutation (#81967, #75142, #63930-A, #63792):
  deferred-tool-rewrite; announcement on opus/fable, safe degrade elsewhere.
- COVERED — historical byte drift (#48734 stochastic trailing newline,
  #40524, #81077 relocation): canonical identity + volatile pin.
- RE-OPENED 2026-07-29 — hook-reminder re-render (#76606), first
  in-house instance: s-4b6a435234bf n=26->28 (16:52:11Z), PreToolUse
  additionalContext removed from the tool_result at index 30 and
  re-inserted as a standalone system message at index 31; ~65 kB
  delta, 124k tokens re-billed live (worktime ledger 16:52:58Z,
  cause 'other'; prefix-diff cause=messages@31(system) on the wire).
  CORRECTED same day (sonnet probe + fingerprint check): the earlier
  "mitigation kind null, passed through" reading came from a replay
  under DEFAULT gates — the dev-loop's replay-the-serving-config
  violation, instrument error; the serving process ran current code
  (source-fingerprint 8349b0e665c8 = /health = disk; note the
  fingerprint is sha256-content, NOT a git tree — comparing it to
  git hashes is the hand-rolled-identity error, made twice before
  being checked). RESOLVED same evening (fidelity probe): replay is
  byte-faithful to the wire (outSha match), and "mitigated:true" was
  the METRIC's input-side blindness — the pipeline's real behavior
  was restore-the-pin AND forward the duplicate, a splice at 31 that
  re-billed 124k. MITIGATION BUILT 2026-07-30 (c5d870d, decision B
  pin-and-suppress): the positional rebuild suppresses a standalone
  message whose wrapper-normalized bytes equal a live pinned block;
  red-green on the real pair edit@31 ~61 kB -> edit@48 ~5 kB (the
  residual is ttl-management's cache_control relocation at the old
  tail — a different extension, expected); full-corpus gate under
  boot-record gates 0/0/0/0; declared exemptions in replay's safety
  AND stability gates (the stability one was unbriefed — found by
  full-corpus replay, 67 false fires before the fix); output-guard
  needs none (no message-count invariant by design, its directive
  line 58, 0 fires over 1190 requests). Census annotation shipped:
  blockMigration on splice and edit rows (5cdf51b, red-tested,
  fires on all four in this capture — only ONE produced a live cold
  event). BUILT, NOT YET SERVING: pending proxy restart (dotfiles
  pin bump, stated session boundary). Row closes on the live
  non-event, not on the build.
- COVERED (mechanism now attributed) — mid-history nudge anchoring
  (#78660, #68140, #80604): row 4 above.
- NEUTRALIZED BY CONFIG — subagent 5-minute TTL pinning (#74318): outcome
  records across all captures show 100% of cache writes on the 1h tier,
  0 tokens on 5m — ttl-management's env forcing already covers it.
- RE-MEASURED 2026-07-30 (was "ABSENT ON THIS SETUP", one instance across seven captures probed 07-29) — hidden duplicate request (#78420, v2.1.209+): the standing census counter (findDuplicateRequests) finds ~100 adjacent byte-identical pairs on the two CURRENT captures (72+28, in streaks). Probe verdict: the growth is the CORPUS, not the definition (global-adjacency vs per-conversation differs only +2/+15); the streaks themselves are retry-shaped — distinct capture ids, backoff-shaped intervals (2.6s->35s plateau), and ZERO matching outcome records, i.e. none billed — client retry against repeated upstream/proxy errors, not the #78420 double-billing shape (which requires billed duplicates). Cost-relevant disposition UNCHANGED: no billed duplicate observed. Confirming evidence source arrives with the upstream-error-log gate flip (booked, rides next restart): the error timestamps should line up with the streaks. The counter re-answers daily; a BILLED duplicate re-opens the row.
- MEASURED INACTIVE — thinking-block classes (#76253 fable prior-turn
  drops, #69568 resume signature replay). Probed 2026-07-29: 2 of 323
  consecutive fable pairs showed a thinking block leave shared history
  (context-pruning-shaped) — nothing like "every exchange". And every one
  of 277 thinking blocks in this fleet's deep history is a signature-only
  stub with EMPTY text — CC already omits completed-turn thinking content
  here, so v2StripSigned's target population is zero bytes; it stays OFF
  on the same logic that parked READ_DEDUPE. Neither class has automatic
  surveillance: if #76253 activates it surfaces same-day as per-turn
  cold rewrites in the worktime counter (loud), but #69568's
  population turning non-empty is watched by nothing — spec for a
  harvest-side shape watch is in the dotfiles BACKLOG.
- NOT COVERED, CC-must-fix — resume/fork boundary classes (#51764 measured
  41-99pp hit-rate delta; #77306 session-id inside system-prompt scratchpad
  path; #78720 git status in system prompt; #65805 dropped [1m] modifier;
  #44724 subagent identity string; #44045 skill_listing scatter; #47756
  /clear artifacts): each embeds genuinely-new content in the prefix or
  changes identity keys; a proxy rewrite would lie to the model about real
  state. Mitigation belongs upstream; our exposure is MEASURED, not
  assumed (2026-07-29 probe over all captures): zero deep resume-shaped
  boundaries, two shallow ones (26->28 msgs, subagent-continuation
  shape). Why plain --resume is near-clean HERE: it keeps the
  session-id, so the scratchpad path in the system prompt holds
  (CC#77306 needs a FORK); the git-status variant needs -p --resume
  (CC#78720); overnight resumes land after TTL death and book as idle.
  Attribution machinery for the class is parked in BACKLOG.md — busts
  would already be LOUD in the worktime counter, only unlabeled, which
  distinguishes this from the silent thinking classes that earned
  watchers.
- NOT MITIGABLE — version-correlated prompt growth (#46917, #47528):
  real content changes.
- EXPOSURE NOTED — >200K cold-context ECONNRESET (#79989): this fleet runs
  the 1m beta at 700k+ contexts; if a session ever hard-fails on every
  request after going cold, this is the first hypothesis (a forward-path
  retry/backoff would be the mitigation candidate).
- N/A — usage hygiene (#69468): tracked by worktime/statusline already.

### Row 4 datapoint — 2026-08-08 09:48:53Z (11:48 local): a 638k non-tail instance, attributed to CC, and NOTHING attempted to absorb it

Capture `s-captureAS`, session in the dotfiles project (not this repo).
Pair `n=370->372` in `replay.mjs` ordinal space — note `bust-triage` prints
`n=305->311` for the same pair, which is the MESSAGE COUNT and is documented
as such at `bust-triage.mjs:1184`; the two were joined by timestamp
(09:47:49.317Z -> 09:47:52.398Z), never by trusting two counters.

Census: `replace/edit`, **MID-HISTORY**, `at=274 / lastIdx=310`,
`anchorDelta=-36`, ~35 kB, with 4 `blockMigration inline->standalone`
(290->291, 292->291, 300->303, and a `join:cross-message` 274+275->275).
This is the RE-OPENED non-tail shape, not the `idx == length-1` form the
2026-07-28 closure measured.

**Attribution: Claude Code's.** Raw pre-pipeline divergence (order 60, the
untouched capture) at index 274; forwarded divergence at index 267, the
offset being suppression count. Established by dumping and diffing the actual
forwarded message bodies via `replay.mjs --dump-forwarded`, not by reasoning
about the pipeline. No new divergence introduced by us.

**Why nothing absorbed it, and this is the part worth keeping:**
`replace/edit` is not in `replay.mjs`'s `MITIGABLE` set (line 1178 — only
`splice/insert-mid`, `append-after-change`, `reorder-only`). The pipeline does
not attempt this class at all, and insertion-normalization logged
`action=reset resetReason=edit-shaped`. So this row's READY canonicalization
design has been decision-complete since 2026-07-31 and this bust is what its
absence costs.

Gates: replay exit 0 under all 10 SERVING gates, zero
stability/safety/conservation/sequence/canonical-order violations. The run's
single stability exemption names a DIFFERENT pair (`n=111->113`) — silent on
ours, which per the runbook is not a pass on it.
State key **identical** across both requests: not a row-26 state loss.
Daily sweep finished 06:20:22Z, ~3.5 h before the bust — covers nothing here.

**Instrument note, corrected in place:** `findAbsorptionMisses` returned
nothing for this pair, and the first explanation written down — "because
`replace/edit` is not in MITIGABLE" — was WRONG. That gate is at line 1238 in
a different loop. `findAbsorptionMisses` (line 1445) gates on
`claims = movedFresh|descriptionAbsorbed|oscillationAbsorptions > 0`; our pair
logged `action=reset, movedFresh=0`, so it was skipped for having claimed
nothing. Correct behaviour, different mechanism — caught before it shipped as
a "coverage hole in the absorption check", which it is not.

### Row 4 datapoint — 2026-08-13: the byte-match census BLOCKS the canonicalization. 16 MISMATCH over the full corpus, and the placement is not single-valued either

**The gate ran over the whole corpus for the first time in this form and it
says DO NOT SHIP.** `node tools/reminder-migration-census.mjs` over all 41
captures: `read 41/41 capture(s), 0 UNREADABLE, 38 with pairs, 261
conversation(s), 15737 same-conversation pair(s)`. Zero unreadable, so the
run PASSES the criterion that makes its other numbers mean anything.

| class | count | share |
|---|---|---|
| EXACT — canonical rule reproduces CC byte-for-byte | 483 | 85.5% |
| EXTENDED — CC's later form carries MORE (54 MERGED-STANDALONE, **0 NEW-TEXT**) | 54 | 9.6% |
| DROPPED — blocks vanished, rule not exercised | 12 | 2.1% |
| **MISMATCH — rule does not hold; "every one is a hole"** | **16** | **2.8%** |

The tool's own verdict, quoted rather than summarised: *"DO NOT SHIP as-is —
MISMATCH occurrences mean the canonical form differs from CC's own, so
normalizing would move the bust rather than absorb it (threat matrix,
Byte-match test)."* That is this repo's mandatory pre-ship gate for any
NORMALIZATION, and 16 is not zero, so the canonicalization is BLOCKED — not
delayed, blocked, until either the rule changes or those 16 are explained.

**The second half of the gate fails independently, and it is the harder
one.** The placement distribution over the 483 EXACT rows is
`+1 → 457`, then `+4 → 4`, `+8 → 3`, `+9 → 2`, `+6 → 2`, and fifteen further
single-count offsets (`+7, +11, +13, +14, +24, +32, +34, +35, +43, +44, +66,
+73, +79, +88, +110`). The tool prints its own conclusion: *"MORE THAN ONE
PLACEMENT — a mitigation cannot pick an index that is right every time."*
Correct bytes at the wrong index diverge the prefix just as thoroughly, so a
rule that nails 457 of 483 placements and misses 26 has 26 holes even where
its BYTES are perfect. Both halves of this gate are load-bearing and this
design currently fails both.

**Message-count drops:** 33 total — 11 PURE-TAIL-PRUNE, 22
INTERIOR-DIVERGENT, **0 UNANCHORED** (11+22 = 33, so the zero is derived, not
assumed). Worst interior rows re-bill nearly the whole conversation:
`n=666→659 breaks@3 re-bills 656/659`, `n=122→120 breaks@3 re-bills 117/120`,
`n=92→91 breaks@3 re-bills 88/91`.

**Honest residue on this datapoint.** Only ONE of the 16 MISMATCH rows is in
the default output — `MISMATCH 2026-08-11T16:36:32.829Z host=3 blocks=3
recon=5376ch rejected=10014ch` — the other 15 need `--verbose`, which was not
run. So the CLASS is established and the population is counted, while the
individual 15 are unread. Reading them is the next step and it is what
decides whether the 16 are one shape or several; a rule repaired against one
of them repairs nothing if they are several, which is the same
tuned-on-the-first-shape trap row 4's own status entry already names.

### Row 23 datapoint — 2026-08-13: the mitigation was shipped on 2026-08-02 and nobody had asked whether it ABSORBED. It did: 114 firings, zero uncontrolled re-bills

**The row was OPEN for eleven days for the wrong reason.** Its closing rule
is "a shipped extension plus a live non-event". The extension shipped in
`fd87e12` on 2026-08-02 — `description-absorbed` forwards the canonical
block on a description-only delta, announces the new prose in-band, and
leaves anything touching name/schema/set/order on today's honest reset. What
was missing was never code; it was the second question. "The mitigation ran"
and "the mitigation absorbed" are different claims, and only the first had
ever been checked.

**The join, and its instrument-positive first, because the expected answer
is an ABSENCE and a dead query returns exactly what a true absence returns.**
Every `description-absorbed` firing in
`~/.local/state/cache-fix/snapshots/*-deferred-tool-events.jsonl` was joined
against `type:"cold"` records in the worktime ledger, same session, ±180 s.
The probe was first shown live on a case known to carry a cold event (the
2026-08-13T11:33:46Z `cc=246636` row, located verbatim), so a zero means
something.

| | |
|---|---|
| firings | **114**, across 2 distinct sessions (4 event-log files — the sub-key split makes "4 sessions" a miscount, and the brief made it) |
| non-events (no cold event within ±180 s) | **83 / 114** |
| near a cold event | **31 / 114** |
| nearest-cold-event distance | min 0.66 s, median 1112 s, max 5087 s |
| ledger scale | 3646 `type:"cold"` records, of which only 184 carry `cc`+`cause`; 3402 are `k:"gauge"` context samples |

**Why the 31 are not 31 misses, which is the finding rather than the
arithmetic.** All 31 sit in ONE session, and that session's entire ledger
history holds exactly two `cc`-bearing records: `cc=308201` written twice
three seconds apart, once `cause=other` and once `cause=resume`. That is one
re-bill double-written by the instrument, not two events and certainly not
31. And its cause is a RESUME. The other session's 20 firings are all
non-events, and its only re-bill in the whole ledger is `cause=compact`.
Both are CONTROLLED causes by this matrix's own definition — a resume and a
compaction rebuild the prefix by construction, so no cached bytes survive and
no mitigation could have absorbed them. There is no instance in the data of a
description-only delta being followed by an uncontrolled re-bill.

**What would have shown the opposite, and that it was looked for.** A firing
followed by an uncontrolled bust — cause `tools_changed` above all, this
row's own signature. 31 candidates were enumerated and every one resolved to
`resume`/`compact`. That is the operational meaning of "certain" this repo
uses, and it is why the row moves.

**Why RESIDUAL and not SHIPPED — the remainder, stated so a later reader does
not have to rediscover it.** (1) The evidence is a PROXY: absence of a nearby
cold event, not the direct positive, which is the absorbing request's own
`cacheRead > 0`. That measurement is one step away and would convert this from
inference to observation. (2) The denominator is two sessions on one machine,
firings dated 2026-08-06 and 2026-08-10 — the RATE is unmeasured, exactly as
row 4's is. (3) The ±180 s window is inherited from this matrix's own earlier
join and was never itself validated; widening the definition to any
`type:"cold"` record moves the near-count from 31 to 54 without changing the
verdict, because the extra matches are `k:"gauge"` samples rather than
re-bills. The criterion "a live non-event" turned out to admit two readings on
first contact, which is the booked-unexercised-criterion shape this repo
already collects.

### Row 4 datapoint — 2026-08-13 14:14:23Z + 14:22:17Z (16:14 + 16:22 local): two instances in ONE session, 490k total, both attributed CC's — and the two are DIFFERENT sub-shapes of the row

Capture `s-captureBN`. Both `messages_changed`, both `census=replace/edit`,
both `VERDICT: KNOWN-OPEN → row 4`, both `ATTRIBUTION: CC's` — computed by
`bust-triage` importing `replay.mjs`'s primitive, and in both cases the
replayed census recorded no stability violation for the pair, so our
forwarded output never diverged earlier than CC's own bytes did.

| | 14:14:23Z | 14:22:17Z |
|---|---|---|
| re-billed | 225k (`191035` in transcript) | 265k (`224970`) |
| pair | `n=115->118` | `n=188->188` |
| CC diverged at | index 110 | index 135 |
| edit-anchor | `edit@110 of 117 [anchor+0]` | `edit@136 of 187 [anchor-48]` |
| container migration | **none** | **row-4 migration at host 135 (EXTENDED/MERGED-STANDALONE)**, plus `inline->standalone 142->143` and `176->178` |
| flap | none | `FLAP reverses n=166->167, 2 req` — twice |

**Why recording both matters rather than one line saying "two more row-4
hits".** They separate on the row's own discriminator. The first sits
exactly ON the human anchor (`anchor+0`) with no container migration; the
second is 48 messages off-anchor WITH one, and `bust-triage` says so in as
many words — `>30 from the human anchor: NOT the known reminder-anchoring
class`. So one is the anchored shape the row's existing evidence is built
from, and the other is the off-anchor shape the row keeps re-encountering.
The anchor distances are also exactly the measurement the PARKED "row 4 rate
re-measure" entry names in its unpark trigger (mid-history `replace/edit`
counts WITH anchor distances); two instances are not the corpus sweep that
trigger asks for, so it stays parked — recorded here so the next sweep does
not start from zero.

**The freeze FAILED and is recorded as failed, not as done.** Both
`harvest --pin` runs (ranges `169..170` and `127..128`) self-reported
`pinned, but does NOT reproduce: stability exemptions live=1 pin=0`. Read
the reach of that sentence before trusting it in either direction: the
exemption it names is `n=25->27 fresh-session-sort:first-appearance-
relocation (mcp)`, which is an unrelated pair far from either event — so the
self-check is TRUE and its stated reason is NARROWER than "your event is
missing", the same shape recorded at 2026-08-08 where a pin's honest
`does NOT reproduce` was correct for a reason narrower than the truth.
What is established: the fixtures are raw structure. What is NOT
established: that either row-4 event survives in them.

**Both pins were then DROPPED rather than committed, and that is a decision
with a reason, not an omission.** They measured 7.5 MB and 4.5 MB — 12 MB
of permanent PUBLIC history, since this repo's history cannot be retracted.
Against that, their evidentiary value for this datapoint is not merely
unproven but structurally unlikely: row 4's class is container migration,
which is TEXT-predicated, and this file's own rule already says the scrub
destroys text-predicate classes by construction, so "structural classes
survive the scrub and are worth the megabytes; text-predicate classes do
not, and their durable evidence is a SYNTHETIC fixture". Paying 12 MB of
irreversible public storage for a fixture the repo's own rule predicts is
empty would have been buying the appearance of frozen evidence. The drop is
the recorded exit; the durable evidence for this class remains synthetic,
and the numbers in the table above are this datapoint's basis.

**Not a new investigation, per the runbook** — a bust mapping to an existing
OPEN row is another instance of that row. No mitigation is designed off
these two: the attribution is CC's, row 4 is already OPEN with its own
booked entries, and what these add is instance evidence and the anchor
distances above.

### Row 1 / Row 26 datapoint — 2026-08-08 09:59:53Z (11:59 local): a 141k bust where the mitigation was ARMED and had no baseline, and the triage called it MITIGATED

Capture `s-captureAT`, this repo's own dev session. Census
`splice/insert-mid` — a class that IS in `MITIGABLE`, which is what separates
this instance from the 638k above: the pipeline does attempt this shape.

It absorbed nothing, because the pair's two requests ran under DIFFERENT
state keys 4 s apart, both logging `action=reset resetReason=no-prior-
canonical`:

    capture 09:58:46.362Z -> insertion event 09:58:46.364Z  key …496b188f5f435920
    capture 09:58:50.626Z -> insertion event 09:58:50.628Z  key …a20843f8616f3866

Session-wide: 12 distinct state keys over 127 insertion events, 13 resets,
**12 of them `no-prior-canonical`**; 8 of the 12 keys carry exactly ONE event
— a key appears, takes one request, and is never seen again.

**`bust-triage` answered `VERDICT: MITIGATED, matrix row 1`.** That is the
row's STATUS being reported as though it were a per-instance absorption
claim. The tool maps the census class to a row and never reads the pair's
extension event logs, which is the one place the disarm is visible — a body
diff cannot see it. Runbook step 8's GRADUATE marker names exactly this and is
now booked READY with both polarities available live as its verifier
(`s-captureAT` flips keys, `s-captureAS` does not).

**Deliberately NOT claimed:** that the key flip caused the re-bill. CC keys
its cache on the bytes it sends, not on our internal key. What is established
is that the flip DISARMED our absorption; the upstream miss has its own cause
and is unattributed. Booked READY as its own item rather than written here as
a mechanism.

**Class relationship, stated because these three keep getting conflated:**
(i) SKIPPED-ON-RESET — the success path runs a behaviour the reset path
returns before (row 22's promoted question, one instance fixed in `059aae3`,
the enumeration still open); (ii) NO BASELINE AT ALL — this datapoint, row 26's
class; (iii) NOT IN `MITIGABLE` — the 638k above, absent by design rather than
disarmed. A fix aimed at any one of them does not reach the other two.

### Row 3 PRE-declaration — the 2026-08-16 upstream catch-up merge
### (stated BEFORE the restart, as the 21:46 amendment requires; restart NOT
### yet taken — the boundary is the operator's to choose)

The change is the merge of `upstream/main` at `8ddd4f0` into fork main
(`6cb1333`): 37 upstream commits, 97 files incoming, 28 resolved conflicts.

THE DECLARATION: **no state KEY changes and no freeze logic changes**, so
row 3's exception does not fire and the restart is cache-transparent.

This CORRECTS the premise the merge was scheduled under. The sizing entry and
the handoff directive both said the incoming set touches state keys / freeze
logic (15 matched lines) and that row 3 therefore does NOT carry. That was true
of the raw incoming diff and is FALSE of what landed: those 15 lines sat in
upstream's older copies of our OWN extensions, re-imported as add/add because
none of them exists at the merge base, and all of them were resolved to ours.
The stale premise is recorded rather than quietly dropped, because the plan
built on it (price it against live sessions, expect a real bill) would otherwise
have executed unchanged.

THE BASIS, in the order it was established — structural first, then behavioural,
because a scoped read never settles an unscoped absence:

- All four state-key / freeze-logic owners are byte-unchanged across the merge:
  `insertion-normalization.mjs`, `message-hash.mjs`, `deferred-tool-rewrite.mjs`,
  `fresh-session-sort.mjs` (`git diff --numstat 36559f6..HEAD` empty for each).
  The only `canonical` hit anywhere in the landed `proxy/` diff is a comment
  added by this merge saying the new sweep must not touch them.
- **The behavioural half, which is what actually decides it:**
  `node tools/verdict-ab.mjs 36559f6 HEAD --seed-from-a` — the old-canon
  compatibility probe, i.e. does the new code take the same decision the old
  code did when it starts from state the old code produced —
  **IDENTICAL across 3223 verdict lines, 19 corpora, exit 0.** Not a vacuous
  zero: the tool exits 2 with COULD-NOT-VERIFY on an empty corpus and prints
  per-corpus request and conversation counts, which are non-zero throughout.
- The nine `proxy/` files that DID change are non-mutating with respect to the
  forwarded body: prefix-diff and request-capture are diagnostic surfaces,
  upstream-change-detection is a detector, usage-log is telemetry,
  gate-allowlist is a pure function, and the server changes are `/health` gate
  redaction plus RFC 7230 absolute-form routing. `thinking-block-sanitize` is
  the one body-mutating extension touched: its v1 path — the serving mode, with
  `CACHE_FIX_THINKING_SANITIZE` unset — is byte-identical across a three-case
  corpus including a deep-history active continuation, and its v2 path is
  changed but inert here.

PRICED ANYWAY, because "cache-transparent" is a claim about the diff and not
about who pays (dev-loop, "Before a restart: price it against LIVE sessions").
`node tools/restart-exposure.mjs --window-min 60`: **7 live sessions, ~1,311k
tokens worst case** if a restart changed forwarded bytes for all of them
(largest single session ~684k). The measurement above says it changes none of
them, so the expected bill is zero — but the number is what the operator is
choosing against, and it is stated rather than assumed away.

THE ONE REAL CONSEQUENCE, which is not a cache cost and must not be confused
with one. The newly ported prefix-diff retention sweep runs once per process, on
the first live request after the restart. Projected against the real directory
by mirroring its names and mtimes and running the actual `sweepSnapshotDir` over
the mirror (never by re-implementing the selection): the snapshot dir holds
**28,326 entries**; prefix-diff owns **14,469** across 13,927 session keys; the
first run will **delete 14,257 files** and leave 200 keys. Zero out-of-scope
files are touched — the 13,857 fork-owned `-canon.json` / `-relocated.json` /
`-rungs.json` files, which are LIVE STATE whose deletion would rotate the key
their owner reads, all survive, verified on the real listing.

So the restart costs no cache and deletes no live state. What it does delete,
irreversibly and at once, is ~14.3k prefix-diff DIAGNOSTIC artifacts older than
14 days or beyond the 200-key cap. That is evidence, and closing-gate question 2
asks whether any of it backs an open entry before it goes. That is the question
the operator is deciding, not the cache one.
