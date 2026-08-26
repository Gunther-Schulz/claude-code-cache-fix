# Migration report — BACKLOG.md → ITEMS.md (2026-08-26)

Produced by `lifecycle migrate`. **A DRY RUN**: the source carriers `BACKLOG.md` and `BACKLOG-DONE.md` were READ. They are not edited, not moved and not deleted, and retiring them is a separate act after a human has read this file.

This report DESCRIBES entries — line number, grade word, rule applied. It does not quote their prose.

## Reconciliation

| quantity | count |
|---|---|
| top-level bullets in `BACKLOG.md` | 343 |
| of those, ENTRIES (bold, or led by a grade-shaped word) | 336 |
| of those, non-entry prose bullets (not migrated) | 5 |
| of those, bullets in a section §4 row 1 CUTS | 2 |
| items written to `ITEMS.md` | 318 |
| entries reported UNCLASSIFIED (not written) | 18 |
| archive bodies in `ITEMS-DONE.md` (verbatim) | 275 |
| entries routed to the ledger | 0 |

**Identity:** 336 entries read = 318 written + 18 unclassified — HOLDS.

**Bullet identity:** 343 top-level bullets = 336 entries + 5 prose + 2 cut — HOLDS. This is the identity that makes 'not migrated' visible: every bullet in the source is in exactly one of the three columns, so a bullet the migration simply did not see would show up as a gap in the sum rather than as nothing at all.

**Conservation (§3.1), computed on the produced files:** items 318 + done 275 = 593; baseline 593 + added 0 − compacted 0 = 593. HOLDS.

The bullet count and the archive count use DIFFERENT notions of an entry, deliberately and not accidentally: the archive count is `items_mod.archive_entries`, every line opening `- ` in the archived body, which is the notion the conservation identity uses on both sides of the migration. The entry count above is the migration's own notion. Where the two differ over the same file, the difference is sub-bullets at column zero and is not a lost body.

## The MIGRATION WRITE-RULES (§3.1, blocking and fixed)

**No migrated entry inherits READY.** READY is the desk's judgment that a fresh context could execute an item now, made about a carrier that no longer exists. Every entry below is written NEW.

**Every migrated OPEN entry carries a TYPED blocker.** The typing is the rule, not a detail: "every migrated item is blocked" is satisfied by prose, and prose sits in nobody's court — which is the entry that ages out silently. The three branches:

| branch | blocker | why |
|---|---|---|
| old READY / RECORD | `decision` | the grade returns to the desk for a re-grade; it is not inherited |
| PARKED carrying its named missing evidence | `evidence` | it is already in the MACHINE's court, and converting it to a decision would move a waiting item into the operator's queue for no reason |
| slot-incomplete (everything else) | `decision` | NEW with a decision naming what the desk must supply — never `NONE` |

**Blockers written, PER TYPE.** A total is the number that hides the untyped one, so there is no total here:

| blocker type | entries |
|---|---|
| `decision` | 283 |
| `evidence` | 35 |
| `item-id` | 0 |
| `NONE` | 0 |
| `untyped` | 0 |

`untyped` and `NONE` are both **0**, and either being non-zero is a finding rather than a statistic. Under the closed goal vocabulary nearly every migrated open item is slot-incomplete anyway, so the `decision` count will LOOK like "all" — which is precisely why the criterion is stated per type.

**The done home holds no blocker.** The write-rules are about OPEN items; a blocker in the closure home is a shape finding, not a migration output. This migration writes nothing into the done home but the verbatim archive, so the property holds by construction — and it is CHECKED by the done home's own shape check rather than assumed.

## Grade-word rules (design §4 row 1, §3.1)

These classify the SOURCE word — which entries are entries and which are unclassifiable. The resulting grade is then overridden to NEW by the write-rules above; the mapping is kept because it decides UNCLASSIFIED, and because a reader needs to see which word each entry carried.

| source grade word | §4 row 1 says | after the §3.1 write-rules |
|---|---|---|
| `READY` | READY | NEW — §4 row 1: READY→READY (scheduled by cap/head-rule at read time, not by this migration) |
| `RECORD` | READY | NEW — §4 row 1: RECORD→READY-unscheduled; §3.1: the rest are READY and visible, not a separate word |
| `PARKED` | NEW | NEW — §4 row 1: PARKED→PARKED with a typed blocker, or NEW |
| `HANDOFF` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `OPEN` | NEW | NEW — §4 row 1 and §3.1: OPEN→NEW |
| `BUST` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `PARTLY` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `CANDIDATE` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `FINDING` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `NEW` | NEW | NEW — §4 row 1: →NEW with a typed blocker or DROPPED |
| `POINTER` | NEW | NEW — §3.1: POINTER → an item whose body lives elsewhere, referenced |
| (ungraded) | NEW | NEW — §4 row 1: ungraded → NEW with a typed blocker or DROPPED |
| anything else | — | **UNCLASSIFIED**, reported with its grade word and line number (D-f). Never guessed. |

## Outcome per class

| source grade word | → | entries |
|---|---|---|
| `RECORD` | READY | 191 |
| `PARKED` | NEW | 59 |
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
| Open | 129 |
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
| `BACKLOG.md:1084` | `DECISION` | Open |
| `BACKLOG.md:4091` | `HALF` | Open |
| `BACKLOG.md:4094` | `DECISIONS` | Open |
| `BACKLOG.md:4106` | `TOOL` | Open |
| `BACKLOG.md:4115` | `DATAPOINT` | Open |
| `BACKLOG.md:4156` | `MECHANISM` | Open |
| `BACKLOG.md:4592` | `CORROBORATION` | Open |
| `BACKLOG.md:4854` | `UNDISPOSITIONED` | Open |
| `BACKLOG.md:5011` | `OPEN-BOOKED` | Open |
| `BACKLOG.md:5487` | `INCIDENT` | Open |
| `BACKLOG.md:5869` | `DECISION` | Open |
| `BACKLOG.md:12419` | `REFRAMED` | Upstream PR round — booked 2026-08-05; the round below is CL |
| `BACKLOG.md:12571` | `ECONNRESET` | Upstream PR round — booked 2026-08-05; the round below is CL |
| `BACKLOG.md:12813` | `DONE` | From the closing-gate sweep (2026-07-29, opus dispatch) — pa |
| `BACKLOG.md:12829` | `DONE` | From the closing-gate sweep (2026-07-29, opus dispatch) — pa |
| `BACKLOG.md:12847` | `SETTLED` | Parked decisions |
| `BACKLOG.md:12852` | `DECISION` | Parked decisions |
| `BACKLOG.md:12888` | `DECISION` | Parked decisions |

## What this migration does NOT carry, named rather than discovered

- **`goal`, `done-criterion` and `evidence` have no rule in §4 row 1.** Only the write-set does ("write-set absent → UNKNOWN"). A slot cannot be empty, so `goal` and `done-criterion` are written `UNKNOWN` at the same width the design gives the write-set, and `evidence` carries the source line range in `BACKLOG.md`. The design gap is reported, not closed here.
- **The PARKED branch of §4 row 1 is unreachable over this carrier.** "PARKED→PARKED with a typed blocker or NEW" turns on a typed blocker, and the old carrier has no blocker slot; no rule in the design derives one from a body. Every PARKED entry therefore takes the NEW branch, and the parked-ness — which court the item waits in — is not carried across. That is the largest single information loss in this migration and it is a decision for the desk, not for the tool.
- **A NARRATIVE section's bold bullets migrate as items, because §4 row 1 states no rule that stops them.** The rule list covers grade words and "ungraded", and a handoff paragraph's bullet is ungraded — so it becomes a NEW item. Only `## Grades` is CUT by name. The per-section table above is where this is visible: a section whose heading is a status narrative rather than a queue contributed entries, and whether that is wanted is the desk's call, not a rule this tool may invent.
- **Live entry BODIES are not carried.** An item's slots are one line each; the old entries are paragraphs. In this DRY RUN the bodies stay in `BACKLOG.md`, and git keeps them either way — but a later act that retires the old carrier drops them to history, and that is worth deciding rather than discovering.

## Where these findings WENT (R3)

**A finding in an audit nobody routes is a finding nobody acts on.** §3.8c bullet 8 sends this report's findings into the carrier as ITEMS via intake, and has the report point at the item ids rather than carrying the findings itself. The table below is READ FROM THE CARRIER at report time — items whose `evidence` slot cites this file — so it cannot go stale against it, and an empty table means the routing has not happened rather than that there was nothing to route.

| item | grade | blocked-by | requirement |
|---|---|---|---|
| `cf-319` | NEW | `decision what each of the 18 unrecognise` | The migration reports 18 entries whose grade word no rule in design §4 row 1 or §3.1 covers; they were NOT written to ITEMS.md and are listed by line  |
| `cf-320` | NEW | `decision whether the grade workflow fill` | The migration has no rule for goal, done-criterion or evidence: §4 row 1 names UNKNOWN for the write-set alone, so 318 items carry UNKNOWN in three sl |
| `cf-321` | NEW | `decision whether a blocker may be derive` | The PARKED branch of §4 row 1 is unreachable over the old carrier, so which court each of 58 parked entries waited in did not cross the migration; the |
| `cf-322` | NEW | `decision which of the old carrier's narr` | A narrative section's bold bullets migrate as items because §4 row 1 states no rule that stops them, so status-narrative headings contributed entries  |
| `cf-323` | NEW | `decision whether the old entry bodies ar` | Live entry BODIES are not carried across the migration: an item slot is one line and the old entries are paragraphs, so retiring the old carrier would |

5 finding(s) routed. Each is an ITEM with a typed blocker, so it sits in a named court and the retire lane can see it age — which is the whole difference between a routed finding and a paragraph in a file.

## Ledger

`LEDGER.md` holds 0 line(s). Nothing migrates into the ledger (§3.6, §4 row 1); the acceptance criterion is that this number is zero, and it is printed as a number because "nothing migrated" and "nothing was counted" read the same in prose.

