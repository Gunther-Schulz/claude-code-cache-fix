# Wave 1d — the SCHEMA WAVE: dispatch brief

Written at the execution desk on the judgment desk's release of the round-4
hold, 2026-08-26. **Passes that desk before dispatch.**

Design read at cache-fix **`5ad809d`**: §3.0, §3.0b, §3.1 (incl. the MIGRATION
WRITE-RULES), §3.3, §3.8b, §3.8c, §3.9, §3.10, §3.11, §4 row 1, §5's wave-1d
paragraph. **The design is the brief's core and is quoted by pointer, never
restated** — where this file and the design differ, the design wins and the
difference is a defect here.

## ONE DISPATCH, and the reason rather than the instruction

§5 says one opus dispatch. **I agree, and the reason is not deference.** The
growth-control vocabulary, the removal of `ready-cap`, the new done-body slots
and the migration regeneration are one change: **one schema version per repo,
stamped in the declaration, and the carrier files' `schema:` lines must EQUAL
it** (§3.8c). Splitting the wave means committing a state where a declaration
says one number and its carriers say another — which is a finding this wave
itself introduces. Law 25 makes the same point from the other side: every
schema change ships its migration dry-run first, so the migration is part of
the change rather than a follow-on.

## THE RE-READ POINT — this brief is a live document

**Re-read this brief at HEAD before each verifier run.** Not before each
commit: keyed to commits, the rule fires only in lanes that commit into a
shared tree, and it fires late (W1c's own correction, now law 18).

The desk and this desk both write to cache-fix while you work. A brief that
promised completeness at dispatch and was then amended three times is what
produced this rule; it is not repeated here. **If this file at HEAD differs
from what you read at dispatch, the difference is real and the HEAD version
wins.**

## Grounding — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST
- cache-fix `docs/directives/carrier-rework-design-2026-08-26.md` at HEAD:
  **§3.8c in full** (round 4's 38 accepted findings — this wave IS that
  section plus §5's additions), **§3.1 in full** including the blocking
  MIGRATION WRITE-RULES, **§3.3** (the source-scope foreign-path class),
  **§3.11 in full** (the six judgment rules and the register), **§3.8b** (the
  homes table), **§5's wave-1d paragraph** (your acceptance criteria).
- the plugin's whole `plugin/cli/lifecycle_core/` tree, its `test/`, and
  **`tools/prove-rows.py`** — you extend that instrument, never replace it.
- the plugin's `CLAUDE.md` (its 22 laws — **laws 23–25 are yours to honour and
  they are new**), `JOURNAL.md`, `LEDGER.md` (G10 and G11 are the two entries
  that most bear on this wave), `BACKLOG.md`, and `.claude/lifecycle.json`.
- cache-fix `.claude/lifecycle.json`, `ITEMS.md`, `ITEMS-DONE.md` and
  `docs/audits/migration-report-2026-08-26.md` — the dry run you REGENERATE.
- cache-fix `docs/dev-loop.md`: "A checker has THREE answers, not two" and
  "Adding a check".

## Established — how each line was established

- **Base state, verified at the artifact by this desk**: lifecycle `8a0a8be` —
  python 42/42, `lifecycle --test` 41 rows all passing with 8 prose-rest,
  emit-site coverage clean, `prove-rows.py` 41 of 41 arrangements holding.
- **`kind check` on the PLUGIN's own declaration exits 2 on two findings, and
  BOTH ARE YOURS TO CLOSE**: `ready-cap` demanded as a positive integer under a
  design that withdrew caps (left null and FAILING deliberately — a fabricated
  number would be the defect R22 exists to prevent), and `laws_over_cap` firing
  on a 280-line laws file under a cap the design removed. `LAWS_CAP_LINES = 60`
  is still a constant at `declaration.py:79`.
- **A defect found by using the tool, and the desk has ruled which side
  moves**: `head-rule`'s error message states the value may be *"an object
  carrying `lead-goal` … or the string `none`"*, and the code at
  `declaration.py:342` rejects the bare string. **The PREDICATE widens** — the
  message was the design's intent. A message wider than its predicate, inside
  the validator whose job is predicates.
- **§3.9 in the design is a STALE SNAPSHOT** — 22 of 49 rows, frozen at
  `fa45623`. **You regenerate it from `lifecycle --test --list`** and the
  design carries the generated table. Never hand-copy it.
- **One node bite fails and must KEEP failing** — its anti-vacuity anchors are
  cache-fix's tree and the file is a byte-identical copy. A could-not-verify
  about the COPY, never about the scanner. Do not edit it or the roster count.
- **The version bump guard fires on every plugin payload commit.** Keep
  bumping; W1c left it at 0.1.6. **Never `--no-verify`** (law 11).

## Scope

**A. The schema change itself.**
- `bound` → the growth-control vocabulary: `bounded-by-exit` / `compacted` /
  `unbounded-with-reason` (R22). **`ready-cap` removed** — the head is DERIVED
  by `head-rule` over all READY.
- **One schema version per repo**, stamped in the declaration; a carrier whose
  `schema:` line does not EQUAL it is a finding. **A comment block may precede
  a carrier's schema line**, so a public `LEDGER.md` can say what it is for
  (today cache-fix's is one bare line — W1c's G5).
- **Typed `reader`/`writer` values**: `lane:<name>`, `verb:<subcommand>`,
  `hook:<name>`, `session`, `producer:<name>`, `operator`. **Prose in the slot
  is a finding**, and `dangling_reference` then reaches every type. Both
  existing declarations carry prose today and must be converted.
- **`superseded-by:` and `blocker-moot:` become REAL done-body slots**, and the
  **done home gets its own shape check** — it is a kind with the tool as
  writer, so shape applies. Today `item check` shape-checks the live carrier
  only and the done home's `parsed.problems` is ignored by both callers, so a
  closed body carrying either annotation passes everything (W1c G4).
- **`head-rule`'s predicate widens** to accept the bare string `none`.

**B. The verbs §3.8c places in this wave** (law 24 — every verb has a wave):
`retire`, `audit`, `migrate --schema-from <n>` and `--apply`,
`item ready --head`, `item ratio` (built by W1b, now PLACED), `lane register`,
`item check` (named), `kind sweep` (the unregistered-file half of invariant 1,
brought forward from wave 4).
**Flags never share a spelling across meanings**: `--schema-from <n>` is the
schema path; `--from <path>` stays the carrier source.

**C. The route set per refusal row** — round 4's cross-row cure. Beside its
firing input, **every row states the ROUTE SET it watches, derived from the
source** exactly as the emit-site check derives sites. `--test` fails a row
whose refusal TEXT names an effect wider than its routes. Red-first is
specified for you: **`dangling_reference` goes red on today's roster,
`schema_above_floor` stays green.** That pair is the proof the check
discriminates; run it and paste both.

**D. Exit codes and row splitting.** argparse usage errors remap to **3** with
a `usage:` prefix — unreadable input, never a finding (law 1). **A registry row
yielding different answer classes at different sites SPLITS into one row per
site.**

**E. The laws scope audit replaces `laws_over_cap`** — flags lines carrying
another kind's markers as "possibly mis-homed", a FINDING for review with the
lines listed, never a refusal; the size figure reported as a number. **The
judgment half is PROSE-REST and the check's own output says so** (invariant 9):
"possibly mis-homed" hardens into "mis-homed" if the output does not hedge.

**F. The six judgment rules of §3.11**, built as FINDINGS never refusals, each
recording its **use-evidence** (fired / fired on legitimate work / overridden)
for the fire-rate review. The ledger line is each one's correction path.

**G. The source-scope foreign-path class** (§3.3) — per repo.

**H. The migration write-rules of §3.1, and the cache-fix dry run
REGENERATED.** These are blocking and fixed: a migrated entry **NEVER inherits
READY** (old READY → NEW with `blocked-by: decision "regrade: was READY under
the old carrier"`); every migrated entry carries a decision blocker so it sits
in the operator's court where staleness surfaces and never drops; `UNKNOWN` is
a DECLARED transitional value the grade workflow fills before READY, that the
retire lane never reads as "advances no goal", and that **`item ready` REFUSES**;
the goal set is closed.

**The blocker rule is TYPED and NARROWER than "every entry" — corrected at the
judgment desk's pass, because an untyped blocker must not be able to satisfy
it:**
- **OPEN items only.** The done home holds closed bodies; **a blocker there is
  a shape finding**, not a migration output.
- old READY → NEW with `blocked-by: decision "regrade: was READY under the old
  carrier"`.
- every **slot-incomplete** entry → NEW with `blocked-by: decision <what the
  desk must supply>`.
- a PARKED entry **carrying its named missing evidence KEEPS
  `blocked-by: evidence`** — it is already in the machine's court and must not
  be converted into a decision.
Under the new closed goal vocabulary nearly every migrated open item is
slot-incomplete anyway, so the count will LOOK like "all" — which is precisely
why the acceptance sentence must not say "all", or it passes on an untyped
blocker.

**R3 ON THE WALK'S OWN OUTPUTS** (§3.8c bullet 8, added at the desk's pass):
**the regenerated migration report's findings enter cache-fix's carrier as
ITEMS via intake** (`item add --source …`), **never as prose in an audit nobody
routes.** The regeneration is the moment those findings are produced, so it
happens inside H, and **the report then points at item ids** rather than
carrying the findings itself. Begehung findings are this desk's, not yours.

**I. The plugin repo is tier 1b** (§3.8c): its own legacy backlog migrates with
the tool, its prose grade declaration is cut, and it declares **its fire log
and the plugin cache as kinds**.

**J. `migrate --schema-from` run over the existing declarations as its own
first proof** — law 25. Dry-run first, per repo, **blocked per repo on
UNCLASSIFIED**.

**K. Regenerate §3.9's table** from `lifecycle --test --list` into the design.

**L. THE PRE-COMMIT SEAM** (§3.8c bullet 6 — added at the judgment desk's pass;
scope A–K had dropped it while §5 says "everything in §3.8c"). The plugin
**declares its hooks in `plugin.json`** and **registers its shape checks with
the machine's global hook dispatcher** (`core.hooksPath` → the operator's
dotfiles `git/hooks/`), **never a second hooks path** — a repo-local
`core.hooksPath` silently replaces the dispatcher and everything it provides.
This brief's commit-plan section READS that dispatcher; nothing until now BUILT
the plugin's registration into it.

**The write-boundary consequence, stated so it cannot be discovered at commit
time:** the dispatcher's registration file lives in **dotfiles, which is READ
ONLY for you.** So you deliver **the plugin side only** — the hook script in
the plugin repo, its declaration in `plugin.json`, and **the one-line
registration entry written out in your report as a RESIDUE for this desk to
land in dotfiles.** Never a dotfiles write.

**Name that residue as the desk's, with the check that reveals it if it is
forgotten:** a shape-check commit made in the plugin repo that the global
dispatcher does not run. That is the observable — not "the registration is
missing", which nothing surfaces, but a hook that should have fired and did
not. Say in your report which command produces that observation.

**M. LAND LAWS 23–25 IN THE PLUGIN'S `CLAUDE.md`**, quoted from design §3.10.
**They do not exist in that file today** — it carries 22, and the three live
only in the design. This brief told you to honour them, which was a defect in
the brief: **law 23 is itself the rule that a named thing has its home, and the
laws file is that home.** Quoted, not paraphrased:

> 23. A design line that names a thing names its home, its writer and its
>     reader; a home is always explicit, never a default the tool assumes.
> 24. A verb named is a verb placed in a stage; a refusal named has its firing
>     input; neither exists in prose alone.
> 25. Every schema change ships its migration, dry-run first, over every
>     declared repo, before it is applied anywhere.

This changes the line count that scope E's laws scope audit reports. That is
fine and is the point of the change: it is **a number now, not a cap.**

## Verifier (§5's acceptance, plus the arrangement rules)

1. **Baseline first, stated**: both suites, `--test`, and `prove-rows.py` at
   `8a0a8be` before anything changes, full counts, the known node red named as
   expected rather than discovered.
2. **Every new and changed row RED then GREEN under the route-set check.** One
   named condition disabled at the single place a finding is recorded; restore
   **BY FILE COPY**; `__pycache__` cleared around every arm. **A red that is a
   module-load or import error proves the code is new, not that the check
   discriminates** (law 4) — and a mutation that CRASHES proves the branch is
   reached, not that the row discriminates: fold one VERDICT into another.
3. **The route-set check's own pair**: `dangling_reference` RED on today's
   roster, `schema_above_floor` GREEN. Both pasted.
4. **`prove-rows.py` covers every row**, or the remainder is LISTED in its own
   output with the reason, never omitted.
5. **`kind check` and `item check` CLEAN on cache-fix's regenerated dry run**,
   with — **worded at the judgment desk's pass so it cannot pass on an untyped
   blocker** — **0 READY**, **every migrated OPEN item blocked AND its blocker
   TYPED**, **UNKNOWN counted**, and **no blocker anywhere in the done home**.
   §5's shorter "all migrated items blocked on a decision" is the loose form:
   it is satisfied by an untyped blocker and by a blocker written into a closed
   body, and §3.1 is narrower than it on both counts. Report the per-type
   counts (`decision` / `evidence` / `<item-id>`), not a total — a total is the
   number that hides the untyped one.
6. **The old carrier byte-identical**: `git -C <cache-fix> status --porcelain
   BACKLOG.md BACKLOG-DONE.md` prints NOTHING. The regenerated dry run replaces
   `ITEMS.md`/`ITEMS-DONE.md`/the report; it does not touch the source.
7. **`migrate --schema-from` over both existing declarations**, dry-run first,
   output pasted per repo.
8. **Both `kind check` findings from the base state are GONE** — no `ready-cap`
   demand, no `laws_over_cap`.
9. Full suites green, **every skip dispositioned**; a skip in a check YOU built
   is a finding by construction.

## Write boundaries

- **`~/dev/Gunther-Schulz/lifecycle`** — yours, the bulk of the work. **Never
  push, never create a remote.**
- **cache-fix** — the regenerated dry-run outputs and the declaration only:
  `ITEMS.md`, `ITEMS-DONE.md`, `docs/audits/migration-report-2026-08-26.md`,
  `.claude/lifecycle.json`, and the design's §3.9 table. **`BACKLOG.md` and
  `BACKLOG-DONE.md` are never edited, moved or deleted.** cache-fix is SHARED
  and PUBLIC: no foreign home path, session id, capture id or transcript text,
  and **the migration report describes entries — it does not quote operator
  prose.**
- **The operator's dotfiles repo — READ ONLY.**
- **Do not edit** `tools/absence-scan.mjs` or `test/absence-scan.test.mjs` in
  the plugin.
- `test/fixtures/harvested/` is **never staged** — a scheduled timer writes
  there.
- Commit by pathspec, flags before the separator, `git add -N <file>` for new
  files naming the FILE never a directory. Never `git add` then commit, never
  `-A`, **never amend**.
- Trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Commit plan

- Guards read at compose time: the machine's global pre-commit runs in both
  repos (`core.hooksPath` → dotfiles `git/hooks/`, inherited, verified not
  repo-local). Firing lanes: the **plugin version bump** (expected; keep
  bumping) and the **READY-envelope** gate on plugin BACKLOG entries lacking a
  `Design` token. cache-fix runs its full suite on PUSH — **and you do not
  push.**
- **Commit per VERIFIER-PASSING STATE**, not per scope letter. Say in the
  report how you grouped and why. The schema change and the migration
  regeneration are ONE state by construction (see the top of this brief).
- Two repos, never one commit.

## Report

Closing report per dispatch skill §2, slots (a)–(h). **Label parts by CONTENT,
not a fixed N.** **State token on every message**: your lifecycle HEAD and the
cache-fix HEAD you read.

Blockers immediately, mid-flight. Everything else batches into the report.
