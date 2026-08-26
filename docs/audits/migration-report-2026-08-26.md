# Migration report — BACKLOG.md → ITEMS.md (2026-08-26)

Produced by `lifecycle migrate`. **A DRY RUN**: the source carriers `BACKLOG.md` and `BACKLOG-DONE.md` were READ. They are not edited, not moved and not deleted, and retiring them is a separate act after a human has read this file.

This report DESCRIBES entries — line number, grade word, rule applied. It does not quote their prose.

## Reconciliation

| quantity | count |
|---|---|
| top-level bullets in `BACKLOG.md` | 342 |
| of those, ENTRIES (bold, or led by a grade-shaped word) | 335 |
| of those, non-entry prose bullets (not migrated) | 5 |
| of those, bullets in a section §4 row 1 CUTS | 2 |
| items written to `ITEMS.md` | 317 |
| entries reported UNCLASSIFIED (not written) | 18 |
| archive bodies in `ITEMS-DONE.md` (verbatim) | 273 |
| entries routed to the ledger | 0 |

**Identity:** 335 entries read = 317 written + 18 unclassified — HOLDS.

**Bullet identity:** 342 top-level bullets = 335 entries + 5 prose + 2 cut — HOLDS. This is the identity that makes 'not migrated' visible: every bullet in the source is in exactly one of the three columns, so a bullet the migration simply did not see would show up as a gap in the sum rather than as nothing at all.

**Conservation (§3.1), computed on the produced files:** items 317 + done 273 = 590; baseline 590 + added 0 − compacted 0 = 590. HOLDS.

The bullet count and the archive count use DIFFERENT notions of an entry, deliberately and not accidentally: the archive count is `items_mod.archive_entries`, every line opening `- ` in the archived body, which is the notion the conservation identity uses on both sides of the migration. The entry count above is the migration's own notion. Where the two differ over the same file, the difference is sub-bullets at column zero and is not a lost body.

## Rules applied (design §4 row 1, §3.1)

| source grade word | → | rule |
|---|---|---|
| `READY` | READY | §4 row 1: READY→READY (scheduled by cap/head-rule at read time, not by this migration) |
| `RECORD` | READY | §4 row 1: RECORD→READY-unscheduled; §3.1: the rest are READY and visible, not a separate word |
| `PARKED` | NEW | §4 row 1: PARKED→PARKED with a typed blocker, or NEW |
| `HANDOFF` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `OPEN` | NEW | §4 row 1 and §3.1: OPEN→NEW |
| `BUST` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `PARTLY` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `CANDIDATE` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `FINDING` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `NEW` | NEW | §4 row 1: →NEW with a typed blocker or DROPPED |
| `POINTER` | NEW | §3.1: POINTER → an item whose body lives elsewhere, referenced |
| (ungraded) | NEW | §4 row 1: ungraded → NEW with a typed blocker or DROPPED |
| anything else | — | **UNCLASSIFIED**, reported with its grade word and line number (D-f). Never guessed. |

## Outcome per class

| source grade word | → | entries |
|---|---|---|
| `RECORD` | READY | 191 |
| `PARKED` | NEW | 58 |
| `(ungraded)` | NEW | 27 |
| `READY` | READY | 13 |
| `OPEN` | NEW | 8 |
| `HANDOFF` | NEW | 7 |
| `DECISION` | UNCLASSIFIED | 4 |
| `BUST` | NEW | 4 |
| `PARTLY` | NEW | 3 |
| `FINDING` | NEW | 2 |
| `NEW` | NEW | 2 |
| `CANDIDATE` | NEW | 2 |
| `DONE` | UNCLASSIFIED | 2 |
| `HALF` | UNCLASSIFIED | 1 |
| `DECISIONS` | UNCLASSIFIED | 1 |
| `TOOL` | UNCLASSIFIED | 1 |
| `DATAPOINT` | UNCLASSIFIED | 1 |
| `MECHANISM` | UNCLASSIFIED | 1 |
| `CORROBORATION` | UNCLASSIFIED | 1 |
| `UNDISPOSITIONED` | UNCLASSIFIED | 1 |
| `OPEN-BOOKED` | UNCLASSIFIED | 1 |
| `INCIDENT` | UNCLASSIFIED | 1 |
| `REFRAMED` | UNCLASSIFIED | 1 |
| `ECONNRESET` | UNCLASSIFIED | 1 |
| `SETTLED` | UNCLASSIFIED | 1 |

## Entries by source section

| section | entries |
|---|---|
| claude-code-cache-fix (fork) — open operational items | 0 |
| Grades — THREE since 2026-08-11, and the third one is the point | 0 |
| Build order — EIGHTH derivation (2026-08-18 afternoon), OVERTAKEN that night; read the ove | 0 |
| SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployment half is not | 0 |
| Handoff — 2026-08-18 afternoon, with a NIGHT delta at the top. Rewritten, not appended; a  | 5 |
| Open | 128 |
| Record — decision-complete memory, not scheduled | 151 |
| Upstream PR round — booked 2026-08-05; the round below is CLOSED, current state is the fir | 32 |
| From the closing-gate sweep (2026-07-29, opus dispatch) — parked with bases | 6 |
| Parked decisions | 13 |

## Non-entry bullets — prose, not migrated

Top-level bullets that are neither bold nor led by a grade-shaped word. They sit in the carrier's PROSE sections and are listed here so that 'not migrated' is a visible decision rather than a silent omission.

- `BACKLOG.md:265` — section: SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployme
- `BACKLOG.md:267` — section: SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployme
- `BACKLOG.md:272` — section: SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployme
- `BACKLOG.md:276` — section: SHIP HELD — the coalesce-miss record is BUILT and PUSHED, the deployme
- `BACKLOG.md:348` — section: Handoff — 2026-08-18 afternoon, with a NIGHT delta at the top. Rewritt

## CUT by §4 row 1 — the grade-vocabulary declarations

"`## Grades` prose declarations, `Closure-home:` line, declared extra words | CUT — the tool owns the vocabulary". The bullets below DESCRIBE the old carrier's grade words; they are not work items, and the successor's vocabulary is the tool's closed five. Listed rather than dropped in silence — the first run of this migration migrated them as items, which is what a cut nobody prints looks like from the other side.

- `BACKLOG.md:23` — section: Grades — THREE since 2026-08-11, and the third one is the point
- `BACKLOG.md:29` — section: Grades — THREE since 2026-08-11, and the third one is the point

The successor's closure home is named by `.claude/lifecycle.json`'s `closure-home` key, not by a `Closure-home:` line in the carrier: one fact, one home, and the declaration is where every reader already resolves it.

## UNCLASSIFIED — findings for the desk

18 entry/ies match no rule. Each is reported with its grade word and line number and was NOT written to the successor carrier. An unclassified entry is a finding for the desk: a guessed mapping is a design decision taken by the migration and invisible afterwards, because it looks exactly like a rule.

| line | grade word | section |
|---|---|---|
| `BACKLOG.md:1019` | `DECISION` | Open |
| `BACKLOG.md:4026` | `HALF` | Open |
| `BACKLOG.md:4029` | `DECISIONS` | Open |
| `BACKLOG.md:4041` | `TOOL` | Open |
| `BACKLOG.md:4050` | `DATAPOINT` | Open |
| `BACKLOG.md:4091` | `MECHANISM` | Open |
| `BACKLOG.md:4527` | `CORROBORATION` | Open |
| `BACKLOG.md:4789` | `UNDISPOSITIONED` | Open |
| `BACKLOG.md:4946` | `OPEN-BOOKED` | Open |
| `BACKLOG.md:5422` | `INCIDENT` | Open |
| `BACKLOG.md:5804` | `DECISION` | Open |
| `BACKLOG.md:12361` | `REFRAMED` | Upstream PR round — booked 2026-08-05; the round below is CL |
| `BACKLOG.md:12513` | `ECONNRESET` | Upstream PR round — booked 2026-08-05; the round below is CL |
| `BACKLOG.md:12755` | `DONE` | From the closing-gate sweep (2026-07-29, opus dispatch) — pa |
| `BACKLOG.md:12771` | `DONE` | From the closing-gate sweep (2026-07-29, opus dispatch) — pa |
| `BACKLOG.md:12789` | `SETTLED` | Parked decisions |
| `BACKLOG.md:12794` | `DECISION` | Parked decisions |
| `BACKLOG.md:12830` | `DECISION` | Parked decisions |

## What this migration does NOT carry, named rather than discovered

- **`goal`, `done-criterion` and `evidence` have no rule in §4 row 1.** Only the write-set does ("write-set absent → UNKNOWN"). A slot cannot be empty, so `goal` and `done-criterion` are written `UNKNOWN` at the same width the design gives the write-set, and `evidence` carries the source line range in `BACKLOG.md`. The design gap is reported, not closed here.
- **The PARKED branch of §4 row 1 is unreachable over this carrier.** "PARKED→PARKED with a typed blocker or NEW" turns on a typed blocker, and the old carrier has no blocker slot; no rule in the design derives one from a body. Every PARKED entry therefore takes the NEW branch, and the parked-ness — which court the item waits in — is not carried across. That is the largest single information loss in this migration and it is a decision for the desk, not for the tool.
- **A NARRATIVE section's bold bullets migrate as items, because §4 row 1 states no rule that stops them.** The rule list covers grade words and "ungraded", and a handoff paragraph's bullet is ungraded — so it becomes a NEW item. Only `## Grades` is CUT by name. The per-section table above is where this is visible: a section whose heading is a status narrative rather than a queue contributed entries, and whether that is wanted is the desk's call, not a rule this tool may invent.
- **Live entry BODIES are not carried.** An item's slots are one line each; the old entries are paragraphs. In this DRY RUN the bodies stay in `BACKLOG.md`, and git keeps them either way — but a later act that retires the old carrier drops them to history, and that is worth deciding rather than discovering.

## Ledger

`LEDGER.md` holds 0 line(s). Nothing migrates into the ledger (§3.6, §4 row 1); the acceptance criterion is that this number is zero, and it is printed as a number because "nothing migrated" and "nothing was counted" read the same in prose.

