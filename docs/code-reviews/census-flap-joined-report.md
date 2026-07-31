# Census: flap annotation + joined-standalone migration target

Dispatch report, 2026-07-31. Base commit `94cbf82` (verified ancestor of the
working HEAD before any edit).

Two READY backlog items were dispatched as a bundle. **Only one of them was
outstanding.** The findings below are ordered accordingly.

---

## 1. "READY — census flap annotation (blockMigration reversal)" — ALREADY SHIPPED

The entry is stale. Both halves of it are in the tree at the dispatch's own
base commit:

| Backlog clause | Delivered by | Ancestor of `94cbf82`? |
|---|---|---|
| flap marker on a block-hash pair reversing within 5 requests of one conversation | `fc44da3` — *census: flap annotation — a blockMigration pair reversing within 5 requests is flagged, not read off adjacent lines* | yes |
| ADDENDUM: the `blockUnits` standalone predicate over-reports 2× (phantom on any message shrunk to one block) | `47defba` — *census: blockMigration counts only reminder-wrapped blocks — a message that shed a sibling is not a standalone emergence* | yes |

Verified against the clauses rather than against the commit subjects:

- `markFlaps` / `FLAP_WINDOW = 5` in `tools/replay.mjs`, grouped per
  `key|conversation`, marking only the reversing row and naming the row it
  reverses.
- Wrapper candidacy in `scanBlockMigrations` (`inline && u.wrapped`,
  `dstUnits.some(d => d.hash === u.hash && d.wrapped)`), which is the
  addendum's fix.
- Five flap bites plus two candidacy bites already in
  `test/replay-gate-selfcheck.test.mjs`, including the real-fixture bite.
- The entry's own verifier, run live against the capture at base commit
  (`tools/replay.mjs <slice> --census`, capture `s-0d6f38ba`, requests 1–260):

  ```
  block migrations (reminder-swap shape): 3, 2 FLAP
      n=104->105 standalone->inline 94->92 [flap reverses n=102->104, 1 req]
      n=105->108 inline->standalone 92->94 [flap reverses n=104->105, 1 req]
      n=102->104 inline->standalone 92->94
  ```

  which is exactly the entry's "on the 2026-07-30 triple the real flap is the
  single 92->94 pair reversing", and its "silent on a corpus without
  reversals" holds too — the 1–130 slice reports `1, 0 FLAP`.

**Action needed and NOT taken (outside this dispatch's write boundary):**
`BACKLOG.md` still carries the entry as READY. It should leave by commit ref
(`fc44da3`, `47defba`) per the file-role rule.

**A correction the entry's addendum now needs.** Its closing sentence — "on
the 2026-07-30 triple the real flap is the single 92->94 pair reversing" — was
true of what the detector could SEE, not of the event. Item 2 below shows the
same triple carries **three** reversing hosts, not one. The event was being
priced at a third of its size.

---

## 2. "READY — census: joined-standalone migration target" — BUILT

### The gap

`blockUnits` hashes blocks individually, so `scanBlockMigrations` can only
match a standalone message that is ONE block's bytes. CC routinely emits the
other shape: several reminders leave their host and arrive as a single
`"\n\n"`-joined standalone. No unit hash equals that message's hash, so the
class produced no row at all.

Measured on both committed fixtures (current names — the entry was written
against the pre-sanitization names `flap-s-0d6f38ba-86.json` and
`oscillation-s-633915a8-863.json`, both renamed by `687cbc5`):

- `flap-s-0dc8ac87c43d-86.json` — of the three standalone messages the
  standalone leg carries, only `msg94` is a lone block. `msg86` is the join of
  `msg85`'s four wrapped reminders; `msg91` is `msg89`'s reminder joined with
  the whole of the standalone `msg90` that followed it. Two thirds of the
  2026-07-30 221k event was invisible.
- `oscillation-s-4b6a435234bf-863.json` — the fixture's entire subject
  (`msg863`'s two reminders becoming the merged `msg864`) is a join, so the
  detector reported **nothing** on a capture harvested for oscillating.

### The definition built to

A JOIN MIGRATION is the same reminder-swap event with the joined text in place
of the single block. Two conditions, direct analogues of the block scan's
`samePos` and wrapper guards:

- **(A) the join moved** — the joined text is a whole single-block message on
  the standalone side, within ±`BLOCK_MIGRATION_WINDOW` (3) of the inline
  host's index, and is a whole message nowhere on the inline side.
- **(B) the constituents left their wrapper** — no constituent block appears
  `<system-reminder>`-wrapped anywhere on the standalone side. Deliberately
  index-free: the host's own index shifts when messages are inserted above it,
  which is precisely the phantom the block scan's positional guard produced
  before `47defba`.

Two KINDS, and the entry's reason for the tag holds up: `in-entry` joins all
of one message's wrapped blocks in wire order — 78940a0's rule, which is
`findSuppressibleDuplicate`'s own hash set, so the shipped mitigation can
already match it. `cross-message` spans two adjacent messages and no hash set
in the extension covers it. The tag is what lets a census reader separate
"already matchable" from "nothing can match this yet".

### Where the hashes come from

Not recomputed in the checker: a join is a concatenation and hashes do not
concatenate, so a join hash cannot be reconstructed from the text-free
`inBlocks`, and retaining the text to do it later is the O(file) retention
class this file has paid for three times. `compactEntry` therefore derives the
block units once and keeps two projections — `inBlocks` as before, plus
`inJoins` (two hash strings per message, both `null` for any message with no
reminder-wrapped block). `joinUnitHash` / `crossJoinUnitHash` are the
conservation gate's existing helpers, reused rather than restated — one
definition of "a join" in the file.

`blockUnits` (the projection wrapper) became dead and was removed.

### Evidence

**The two fixtures**, through `findBlockMigrations`:

| fixture | before | after |
|---|---|---|
| `flap-s-0dc8ac87c43d-86.json` | 3 rows, 2 flaps (msg94 column only) | 9 rows, 6 flaps, 3 hashes — msg86 (in-entry), msg91 (cross-message), msg94 (block), each flipping three times |
| `oscillation-s-4b6a435234bf-863.json` | 0 rows | 3 rows, 2 flaps, all `in-entry` |

**One census run over a real capture** — `tools/replay.mjs --census` over a
read-only 260-request slice of `~/.claude/cache-fix-captures/s-0d6f38ba-…`,
the same bytes both fixtures were harvested from. The fixture bites' expected
values are reproduced independently by the live run:

```
block migrations (reminder-swap shape): 10, 6 FLAP, 7 JOIN (3 cross-message)
  a cross-message join spans two messages, so no hash set in the extension matches it —
  in-entry joins are already findSuppressibleDuplicate's shape (78940a0), these are not
  a FLAP reverses a migration of the SAME block within 5 requests of one conversation —
  …
    n=104->105 standalone->inline 94->92 [flap reverses n=102->104, 1 req]
    n=104->105 join:in-entry standalone->inline 86->85 [flap reverses n=102->104, 1 req]
    n=104->105 join:cross-message standalone->inline 91->89+90 [flap reverses n=102->104, 1 req]
    n=105->108 inline->standalone 92->94 [flap reverses n=104->105, 1 req]
    n=105->108 join:in-entry inline->standalone 85->86 [flap reverses n=104->105, 1 req]
    n=105->108 join:cross-message inline->standalone 89+90->91 [flap reverses n=104->105, 1 req]
    n=66->67 join:in-entry inline->standalone 72->73
    n=102->104 inline->standalone 92->94
    n=102->104 join:in-entry inline->standalone 85->86
    n=102->104 join:cross-message inline->standalone 89+90->91
```

The same slice at base commit `94cbf82` reports `3, 2 FLAP`. The marker also
rides the mid-history edit-position line, where the annotation is actually
read:

```
n=66->67 edit@73 of 75 [anchor-2] [blockMigration join:in-entry inline->standalone 72->73] ~4 kB
```

A cross-message row renders both of its inline-side messages (`89+90->91`,
`91->89+90`) rather than dropping the absorbed neighbour.

### Verifiers

- **Mutation precision** — six mutations, each removing exactly one named
  condition; every one is bitten by the bite that names it:

  | mutation | red |
  |---|---|
  | condition (A), "already a message of its own", both directions | `join: fires-on-non-defect guard — a joined standalone present on BOTH sides did not ARRIVE` |
  | condition (A), the ±3 window in `wholeMsgNear` | `join: the merged standalone must land within the same +/-3 window a block migration uses` |
  | condition (B), `unwrappedOn`, both directions | `join: fires-on-non-defect guard — constituents still WRAPPED on the standalone side are a copy, not a move` |
  | `cross-message` kind dropped from the scan | the real-flap bite + the cross-message bite |
  | `join: kind` collapsed to a constant | the real-flap bite + the cross-message bite |
  | join scan not wired into `findBlockMigrations` | four bites, incl. both real-fixture ones |

  The (A) mutation **survived the first draft** of its bite: that draft kept
  the reminders wrapped on both sides, a shape condition (B) rejects first, so
  it was checking the other guard. Rewritten to a de-duplication shape (the
  joined standalone already present in the predecessor, the host then shedding
  its wrapped copy) — which reaches (A) with (B) passing — the mutation goes
  red. Recorded because it is the dev-loop's rule earning its keep: a mutation
  that leaves the bite green is evidence about the mutation before it is
  evidence about the bite.

- `node --test test/replay-gate-selfcheck.test.mjs` — 66/66 pass.
- Full suite minus `proxy-integration` / `proxy-wrapper`: **1844 pass, 0
  fail** (baseline on `94cbf82`: 1839/1839/0; +5 new bites, no test removed).
- Timing, same 260-request slice, 3 runs each: before 6891/6755/6988 ms,
  after 7125/6952/6817 ms — no measurable cost from the added per-message
  hashing (the join helpers return `null` before hashing for any message with
  fewer than two wrapped blocks).

### Not verified

- `tools/gate-live.mjs` was not run. It consumes `--json`, not the text form,
  and reads no `blockMigrations` field, so the change is additive for it — but
  that is a read of the source, not an executed sweep. The daily sweep's
  verdict under the new row counts is unmeasured, and `gate-live` writes under
  `~/.claude`, outside this dispatch's write boundary.
- No live-traffic effect: `proxy/**` is untouched, so no pin bump and no
  proxy restart are implied (`tools/`-only).
- The `oscillation-…-863.json` bite reconstructs a minimal 5-message history
  around the two messages the fixture actually carries (`msg863`, `msg864`);
  the fixture does not hold the 913-message arrays. The padding exists to
  reproduce the pair KIND (`splice/insert-mid`); request numbers in that bite
  are synthetic because the fixture records timestamps, not `n`. The bytes
  under test are the fixture's.
