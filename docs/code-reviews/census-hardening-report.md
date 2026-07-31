# Census / bust-triage instrument hardening — dispatch report

Four READY backlog items, one commit each, 2026-07-31. Dispatched by the
team lead; executed on `main`, unpushed.

| item | commit | state |
|---|---|---|
| census reads captures by LINE, and says what it could not read | `a77c930` | done |
| census: EXTENDED sub-classification (MERGED-STANDALONE vs NEW-TEXT) | `a301ef1` | done |
| prune-event classification rides `--census` | `404d5fc` | done, one deviation |
| bust-triage must see what the statusline shows (k:"cost") | `6efce90` | done, one widening |
| (not an item) comment in `a301ef1` refuted by a concurrent commit | `496fbf0` | corrected, §c5 |

## (a) Items completed, with evidence

### 1 — the census byte-gate reads the whole corpus now (`a77c930`)

`readCapture`'s `readFileSync` is replaced by `readLines`, the same
pull-based reader the gate uses, and the per-file grouping now retains only
each conversation's PREVIOUS request instead of every record. Read failures
are collected rather than swallowed: named in the header, in a `COULD NOT
READ` block, in `--json`, and in the verdict block, and the process exits 1.

Red first, on the real defect. The pre-change tool, run over
`~/.claude/cache-fix-captures/*.jsonl`:

    reminder-migration census — 25 capture(s), 82 conversation(s), 3646 same-conversation pair(s)
    (exit 0, no mention of the 4 captures it could not read — 6.2 GB of 7.9 GB)

After:

    reminder-migration census — read 39/39 capture(s), 0 UNREADABLE, 28 with pairs,
    165 conversation(s), 10290 same-conversation pair(s)

The verifier's second half — tallies on the previously-readable files
unchanged — holds. New tool over the same 35 files (39 minus the 4 that used
to throw): **17 EXACT / 10 EXTENDED / 1 DROPPED / 0 MISMATCH**, identical to
the baseline's, at 3661 pairs against the baseline's 3662 re-run minutes
later (the captures are live and grew between runs; that is the whole delta).

One counting difference to know about: the header used to say "25
capture(s)", meaning files with >= 2 records READ. It now says "28 with
pairs", meaning files that yielded >= 1 same-conversation pair. A file whose
two records belong to two different conversations counts in the old number
and not in the new one.

Streaming verified as a mechanism, not an API shape: the 2.4 GB capture
censuses in **6 s under `--max-old-space-size=512`**, and the full 7.9 GB
corpus in 20 s under 2048.

### 2 — EXTENDED is two classes, and the tool now says which (`a301ef1`)

`subclassifyExtended` compares the remainder (`actual.slice(recon.length)`,
joining `"\n\n"` stripped) against the texts of the BEFORE request's
standalone `role:"system"` messages. The sub-verdict rides the detail row,
the non-EXACT listing, the tally block and `--json` (`extendedSub`).

Corpus-wide, all 39 captures: **21 EXTENDED — 21 MERGED-STANDALONE, 0
NEW-TEXT**. Each of the report's nine §b1 occurrences reproduces as
MERGED-STANDALONE, e.g.

    EXTENDED 2026-07-31T11:41:05.778Z  host=99 blocks=1 recon=293ch actual=716ch  MERGED-STANDALONE
    EXTENDED 2026-07-29T15:45:02.462Z  host=330 blocks=2 recon=627ch actual=1050ch  MERGED-STANDALONE

The header's "NOT absorbable by any normalization — new information, not
re-serialization" is corrected in place, with the measurement rather than an
argument.

### 3 — prune events are classified, and the sweep carries them (`404d5fc`)

`classifyPrune` runs on every same-conversation pair whose message count
decreased, importing `firstDivergence` and `isHumanTurn` from `replay.mjs`.
`gate-live` runs the census as a second child per capture under the same
heap cap and records `byteGate` per row plus a corpus-wide total.

See (d) for the one deviation: the event COUNT reproduces exactly (12 on
`s-77fe2779`), the pure/interior SPLIT does not, and the disagreement is one
event with byte evidence behind it.

### 4 — bust-triage sees the whole ❄ population (`6efce90`)

`coldEvents()` reads k:"hit" (class `bust`) plus k:"cost" and legacy
k:"resume" (class `controlled`); `busts()` is now a filter over it, so no
downstream meaning shifted. Live ledger:

      2026-07-31 14:32:29   142k  messages_changed               7749d7fc
      2026-07-31 13:43:54    55k  CONTROLLED(compact)            77fe2779
      2026-07-31 12:25:23    44k  other                          ca09f676
      2026-07-31 09:32:49    51k  CONTROLLED(previous_message_not_found) f94e53ce

The `1785505434` event is the 13:43:54 row. The no-args half of the verifier
could not be reproduced against the ledger as it stands — a bust landed at
14:32:29, so the newest event is no longer controlled — so it was exercised
against a copy truncated to that instant, through the real `main()`:

      NOTE  the newest cold event is 2026-07-31 13:43:54 CONTROLLED(compact), 55k re-written.
            Cannot triage: a controlled cause (compact/resume) is a cost you
            caused, not a bust — there is no prevented-loss verdict to give.
            Falling back to the newest BUST: 2026-07-31 12:25:23 (other).

12:25:23 is exactly the older event the tool used to triage in silence.

## (b) Checks RUN, with real output

Everything below was executed; nothing is reconstructed from reading.

**Red-first, per item.** Each new test file was run against the code as it
stood BEFORE its item landed, and the failures are the ones the item exists
to fix:

- `census-read-coverage`: 2 of 3 fail on the pre-change module (`unreadable`
  is `undefined`); the third — per-conversation grouping survives the
  streaming rewrite — passes on both sides by design, as a regression guard.
- `census-extended-subclass`: 4 of 4 fail at `a77c930`.
- `census-prune-classification`, `census-byte-gate-sweep`,
  `bust-triage-controlled`: the modules do not export the function under
  test at the parent commit, so the files fail to load.

**Unit tests, after:** 3 + 4 + 6 + 6 + 8 = 27 new tests, all green.

**Corpus prune distribution (39/39 captures):** 226 drop events — 181
PURE-TAIL-PRUNE, 45 INTERIOR-DIVERGENT, 0 UNANCHORED.

**`s-77fe2779` (the capture the entry names):**

    prune events (message count decreased): 12 — 11 PURE-TAIL-PRUNE (prefix intact up to the live turn), 1 INTERIOR-DIVERGENT
      INTERIOR-DIVERGENT 2026-07-31T11:41:05.778Z  n=130->124  breaks at 97 (anchor 123)  re-bills 27 of 124

**Full `gate-live` sweep**, serving gate set resolved from
`cache-fix-proxy.service`, `--status` into the scratchpad (the doctor's file
was never written):

    39 capture(s), 8604 MB, 1 failing -> <scratchpad>/gate-status.json
    byte-gate corpus-wide: 59 EXACT / 22 EXTENDED (22 merged-standalone, 0 new-text)
      / 1 DROPPED / 0 MISMATCH; prunes 181 pure / 46 INTERIOR-DIVERGENT

All 39 rows carry a `byteGate` field; `unreadable: 0`, `errors: 0`. The one
failing row is `s-0d6f38ba` at `stability=2` — **pre-existing, not from this
work**: the deployed `~/.claude/cache-fix-gate-status.json` from that
morning's scheduled run (started 07:52:23Z, read-only) already carries
`stability 2` on the same file, and nothing here touches `replay.mjs` or the
replay's arguments.

**`npm test`, run alone: 1820 tests, 1820 pass, 0 fail** (16 s).

The sweep's counts sit slightly above the standalone census run earlier in
the session (59/22/46 vs 58/21/45): the captures are live and grew by a few
requests between the two runs, the same drift the baseline comparison shows.

## (c) Gaps surfaced — decisions above this tier

### c1 — the prune boundary is a definition the entry and the bytes disagree on

The entry's verifier (10 pure / 2 interior, naming 11:31:58) is reproducible
only with a "divergence within the last ~2 messages" threshold. Read at the
bytes, 11:31:58 is the same event shape as the ten it counts as pure:

    == 2026-07-31T11:31:58.662Z n=83->77 div=74 anchor=74
       A[74] user: [SUGGESTION MODE: Suggest what the user might naturally type next…]
       B[74] user: - Discussion #83 (@man-vu) — "Possible cache bust when Advisor mode…"
    == 2026-07-31T11:45:03.995Z n=166->165 div=163 anchor=163      <- entry counts this PURE
       A[163] user: [SUGGESTION MODE: …]
       B[163] user: yes

Both are CC pruning a scaffolding block and landing the user's real turn at
the same index; they differ only in how many messages the live turn had
produced. I shipped the anchor boundary (11 pure / 1 interior). **Decision
for the dispatcher:** keep it, or pin the entry's 10/2 and accept a
threshold with no definition behind it. Either way the entry's verifier
value needs updating, since it now describes neither.

### c2 — 45 interior prunes corpus-wide, two of them enormous

    INTERIOR 2026-07-31T12:42:11.673Z n=688->675 div=4 anchor=674 rebilled=671  s-f94e53ce
    INTERIOR 2026-07-31T11:40:24.245Z n=83->81   div=4 anchor=80  rebilled=77   s-b6952ffc

A prune whose prefix breaks at index 4 re-bills essentially the whole
context. `s-f94e53ce` is one of the four captures that were unreadable until
`a77c930`, so this event has never been visible to any verdict. Neither is
explained here — out of scope for these four items, and the cause is not
guessable from the drop shape. Worth a triage pass of its own; the tool now
surfaces both without a hand-run.

### c3 — placement is no longer single, which touches a shipped grounding

On the readable 21% the census printed `+1  17  <- single placement; safe to
emit`. Over the full corpus it prints

    placement (standalone index - host index, EXACT only):
         +1    56
         +4     3
      MORE THAN ONE PLACEMENT — a mitigation cannot pick an index that is
      right every time…

Any normalization design resting on "single placement" was resting on 21% of
the corpus. The three `+4` occurrences are not investigated here.

### c5 — a premise changed underneath this work (concurrent writer on `main`)

`opus-extended-absorb` landed `bffcb05` + `cbbbc3a` on `main` while these
four items were in flight, making harvest's scrub a `"\n\n"`-homomorphism and
resolving the PARKED §c5 item. That refutes a premise I had already committed:
`test/census-extended-subclass.test.mjs` (in `a301ef1`) carried a comment
saying a harvested fixture cannot reproduce this class. Verified rather than
taken from their commit message — executed against the shipped `scrubMessage`:

    prefix relation survives: true
    join relation survives  : true
    census verdict on scrubbed bytes: EXTENDED
    sub-verdict on scrubbed bytes  : MERGED-STANDALONE

So the two changes compose: the class now survives sanitization AND the tool
sub-classifies it on the scrubbed bytes. The stale comment is corrected in a
separate commit rather than amended into `a301ef1`.

Worth naming as a process fact: the brief's "one writer per working copy"
did not hold — two agents committed to this working copy in the same window.
Nothing collided in git (both used targeted `git add`, and a `BACKLOG.md`
edit of mine failed loudly on a stale read rather than silently overwriting
theirs), but that was the tooling catching it, not the arrangement
preventing it.

The SCRATCHPAD did collide, and it is worth knowing about because it looked
briefly like a defect in my own change. Both dispatches were told to run
`gate-live --status <scratchpad path>`; the scratchpad is keyed by SESSION,
not by agent, so both wrote `<scratchpad>/gate-status.json`. While my sweep
was still running I read that file and found a completed run —
`started 14:23:41Z, finished 14:38:58Z, captures 39, byteGate null` — which
reads exactly like "the byte-gate field never got written". It was the other
agent's earlier sweep, on code that predates `404d5fc`. Rule of thumb for
the next parallel dispatch: give each agent a distinct status filename, and
check `started` before believing a status file you did not watch being
written.

### c4 — bust-triage does not yet key on the EXTENDED sub-verdict

Item 2's done-criterion is `--json` carrying it, which it does.
`bust-triage.mjs`'s own `migrationVerdict` still returns a bare
`EXACT`/`EXTENDED`/`DROPPED` and could import `subclassifyExtended` for one
line. Not done: it belongs to neither item's scope and would have bundled
two items into one commit.

### c6 — two docs outside the write boundary now under-describe these tools

Not edited, because the brief's boundary stopped at `tools/`, `test/`,
`BACKLOG.md` and this file:

- `docs/dev-loop.md` enumerates the census's outputs as "EXACT / EXTENDED /
  DROPPED / MISMATCH plus the PLACEMENT distribution". It now also reports
  the EXTENDED sub-verdict, the prune classification, and its own read
  coverage — and it exits 1 when a capture could not be read, which that
  section does not mention.
- `docs/directives/robustness-threat-matrix.md` row 22 rests on the
  hand-run drop scan. It has a mechanized classifier now, and the corpus
  number behind the row moved from "10/10 pure in one session" to 181 pure
  / 45 interior over 226 events corpus-wide.

## (d) Deviations, with reason

1. **Prune split: 11/1 rather than the entry's 10/2.** Basis in c1. The
   entry is normative and I did not follow it; the byte evidence and the
   absence of any definition producing 10/2 are the reason, and the decision
   is returned rather than settled.
2. **`k:"resume"` included alongside `k:"cost"`.** The entry names only
   `cost`; the done-criterion is "a ❄-visible event can never be absent from
   `--list`", and `claude-worktime`'s own `--cold --all` filter is
   `hit or cost or resume`, with 3 resume records live in the ledger.
   Following the criterion required the superset.
3. **One BACKLOG commit for all four resolution lines, not one per item.**
   A resolution line carries its commit ref, which does not exist until
   after the commit. Code commits stayed one per item.
4. **`gate-live` also gained the byte-gate COVERAGE bite (item 1's
   done-criterion), not only item 3's summary.** Both criteria land in the
   same `byteGate` field; splitting them would have meant touching
   `gate-live` twice for one mechanism.
5. **A perf fix rode along in `analysePair`:** `JSON.stringify(after)` was
   recomputed per unmatched host and is now memoized per pair. Behaviour is
   identical; without it the newly-readable multi-GB captures are
   O(hosts x bytes) on exactly the files item 1 exists to reach.

## (e) Candidate lessons

1. **A verifier value copied from a throwaway probe carries the probe's
   arbitrary threshold.** The entry's 10/2 was decision-complete in form and
   under-determined in substance: reproducing it required adopting a
   distance cutoff nobody wrote down. The tell was that the count matched
   exactly while the split did not — a partial reproduction is where the
   probe's undocumented judgement hides. (Fixing-corpus adjacent: "automate
   the mechanism, not the symptom you remember".)
2. **A coverage number needs its denominator printed even when it is
   clean.** "25 capture(s)" was true and read as complete for weeks. The
   fix that mattered was not the streaming read but printing
   `read 39/39, 0 UNREADABLE` on every run, including the clean ones.
3. **Fixing a read can move a verdict that nothing else touched.** The
   single-placement grounding (c3) was never wrong about what it measured;
   it was wrong about what it covered.

## (f) Files touched + commits (unpushed)

    a77c930  tools/reminder-migration-census.mjs, test/census-read-coverage.test.mjs
    a301ef1  tools/reminder-migration-census.mjs, test/census-extended-subclass.test.mjs
    404d5fc  tools/reminder-migration-census.mjs, tools/gate-live.mjs,
             test/census-prune-classification.test.mjs, test/census-byte-gate-sweep.test.mjs
    6efce90  tools/bust-triage.mjs, test/bust-triage-controlled.test.mjs

Nothing under `proxy/` was touched, so no pin bump and no restart. Every
`gate-live` run used `--status <scratchpad>`;
`~/.claude/cache-fix-gate-status.json` was not written.

## (g) What was NOT verified

- **The RangeError itself is not in any committed test**, and cannot be: a
  >512 MB fixture is impossible in a corpus harvest curates for structural
  novelty. The unit tests pin the MECHANISM (a read failure is named); only
  the live-capture run covers the scale trigger.
- **The `+4` placements (c3) and the two huge interior prunes (c2)** are
  reported, not explained.
- **No claim about token cost.** `rebilled` counts MESSAGES; nothing here
  prices them.
- **The daily timer path** (`cache-fix-gate.timer`) was not exercised — only
  a manual `gate-live` run with a scratchpad status path. The next scheduled
  run is the first to write `byteGate` into the file `doctor` reads;
  `doctor` has no verdict on that field yet (dotfiles side, out of boundary).
- **Sweep runtime under the added census child was not isolated.** The run
  took 16 minutes wall-clock for 8.6 GB, but a second agent was building and
  running suites on the same machine throughout, so that number prices
  nothing. The census alone is 20 s over the whole corpus.

## (h) Sources actually read, of those the brief named

Read in full: `docs/dev-loop.md`, the four BACKLOG entries plus their
neighbours, `docs/code-reviews/extended-absorb-report.md` §b1-§b4 and
§c3-§c5, `tools/reminder-migration-census.mjs`, `tools/bust-triage.mjs`,
`tools/gate-live.mjs`, `tools/read-lines.mjs`, `test/gate-live.test.mjs`,
the relevant parts of `tools/replay.mjs` (`firstDivergence`,
`conversationOf`, `semanticIds`, `censusIds`, `isHumanTurn`), `CLAUDE.md`
and `CLAUDE.local.md`, and `claude-worktime`'s cold-record and `--cold`
sections (the definition item 4 rests on).

## Closing gate (dev-loop's four questions), per item

**1 — line-reading census.** Mechanized: yes, the read failure is a named
population in `--json` and a failing sweep row. Harvestable: n/a, the claim
is about coverage, not about volatile bytes. Census class: yes —
`unreadable` is the new class. Instruments: yes, `gate-live` fails a row
whose byte-gate could not read.

**2 — EXTENDED sub-classification.** Mechanized: yes, it was a hand
derivation and is now a verdict. Harvestable: **yes, as of bffcb05** — see
c5 below; the answer was "no, and named" when this work started and changed
underneath it the same day. Census class: yes, that is the item.
Instruments: yes, `extendedSub` rides `--json` and the sweep.

**3 — prune classification.** Mechanized: yes, probe to check. Harvestable:
partly — the two big interior events (c2) rest on captures that will rotate;
they are named with session, timestamp and indices here, but no fixture was
pinned. Census class: yes, three new kinds. Instruments: yes, `gate-live`
carries the summary per row and corpus-wide.

**4 — bust-triage controlled events.** Mechanized: yes. Harvestable: yes —
the ledger is append-only and not on the capture rotation clock. Census
class: n/a, this is ledger-side. Instruments: yes, the tool's own selftest
plus 8 unit tests; no gate change needed.
