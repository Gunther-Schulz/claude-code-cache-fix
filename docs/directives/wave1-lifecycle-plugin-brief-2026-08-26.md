# Wave 1 — the `lifecycle` plugin core: dispatch brief

Written at the execution desk (`claude-code-cache-fix-b4`) on the judgment
desk's GO, 2026-08-26. **Not yet dispatched — this passes the judgment desk
first** (design §7). One open question for that pass is at the end; everything
else is settled here.

Design read at cache-fix `b617ac7`, sections §3.0, §3.1, §3.2, §3.6, §3.8,
§3.9, §4 row 1 and §5 of `docs/directives/carrier-rework-design-2026-08-26.md`
(revision 2). **The design is the brief's core and is QUOTED BY POINTER, never
restated here** — where this file and the design differ, the design wins and
the difference is a defect in this file.

---

Title: opus: build the `lifecycle` plugin core and migrate cache-fix's carrier
Working copies: TWO, both named below. Base check on each: `git -C <copy>
rev-parse --short HEAD` against the sha in "Base state", then `git -C <copy>
log --oneline <sha>..HEAD` — commits on top → HALT and report them.
Scratch: your OWN scratchpad, never the dispatcher's.

## Grounding basis — read before building; the report cites what was read

- the executor skill (`dispatch-guards:executor`) — load FIRST
- `docs/directives/carrier-rework-design-2026-08-26.md` (cache-fix) —
  §3.0, §3.1, §3.2, §3.6, §3.8, §3.9, §4 row 1, §5's wave-1 paragraph. **This
  is the settled design. Read these sections in full before writing code.**
  §3.9's table is your acceptance test AND your `--test` roster — one source
  for both, as the design says.
- `~/dev/Gunther-Schulz/dispatch-guards/` — the house plugin convention you
  are copying: root `.claude-plugin/marketplace.json`, `plugin/` holding
  `.claude-plugin/plugin.json`, `hooks/`, `skills/`; repo root carrying
  `CLAUDE.md`, `LEDGER.md`, `BACKLOG.md`, `dev-notes/`, `tools/`. Read its
  `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
  for the exact schema fields.
- cache-fix `tools/absence-scan.mjs` + `test/absence-scan.test.mjs` — the leak
  scan you are MOVING (not rewriting), and its existing bites.
- dotfiles `tools/backlog-census.py` — read `closure_visibility` and the
  three-answer census shape §4 row 1 says the successor keeps by design.
- cache-fix `BACKLOG.md` head (`## Grades`, `Closure-home:`) and
  `BACKLOG-DONE.md` head — the carrier you migrate, and the declarations §4
  row 1 cuts.
- cache-fix `docs/dev-loop.md`, "A checker has THREE answers, not two" and
  "Adding a check" — both bind every check you write here.

## Background (established; verify at the cited lines)

Each line below was OPENED by the dispatcher at brief time unless marked.

- **No `lifecycle` plugin exists anywhere yet.** Checked: no directory
  matching `*lifecycle*` under `~/dev/*/` or `~/.claude/plugins/cache/*/`.
  This is greenfield.
- **The plugin convention is real and is dispatch-guards'.** Its layout is
  quoted above from the directory listing and the two manifest files.
- **cache-fix's carrier is 331 entries today** — counted at brief time
  (`grep -c '^- \*\*' BACKLOG.md`). The design §5 says 329, measured earlier
  the same day; the difference is this desk's own wave-0 bookings, three
  added and one closed out to the done home. Re-derive it yourself and report
  what you get. It is a sanity figure, not an acceptance criterion — and the
  fact that it moved twice in one day is the reason it is not one.
- **`.claude/lanes.json` already exists in cache-fix and is TRACKED**
  (`d995296`), together with the `.gitignore` negation that made tracking
  possible. §3.8 says it serves the LEGACY checker and retires in wave 2 —
  **you do not touch it, and `lifecycle.json` is a separate new file.** The
  `.gitignore` negation your install step must add is the same shape:
  `.claude/*` with per-file negations, so `!.claude/lifecycle.json` is the
  line, and the checker fails on an ignored declaration (§3.0, §3.9's
  "ignored declaration" row).
- **The design's own §3.9 row "leak scan on the plugin repo" needs the scan to
  exist in the plugin before its own first commit.** That ordering is stated
  in §5's wave-1 paragraph; it is a real constraint on your commit order, not
  a preference.

## The settled design — implement exactly this, do not redesign

Everything under §3.0, §3.1, §3.2, §3.6 and §3.9 of the design document is
settled and is implemented as written. The decisions BELOW are the ones the
design leaves to the brief; they are made here, and a fresh context needs no
further judgment to execute.

**D-a. The plugin's home is a NEW repo, `~/dev/Gunther-Schulz/lifecycle`,
laid out exactly like dispatch-guards.** Root: `.claude-plugin/
marketplace.json` (name `lifecycle-marketplace`), `CLAUDE.md`, `LEDGER.md`,
`BACKLOG.md`, `dev-notes/`, `tools/`. Under `plugin/`: `.claude-plugin/
plugin.json` (name `lifecycle`, version `0.1.0`), `cli/`, `skills/`. Initialise
it with `git init -b main`; **do not create a GitHub remote and do not push** —
publishing a new public repo is an outward act reserved to the operator.

**D-b. The CLI is PYTHON; the leak scan stays NODE and MOVES unchanged.**
Basis, so you can check the reasoning rather than inherit it: the commit-time
consumers already live in dotfiles' python `git/hooks/pre-commit`, and the
three-answer census shape the design tells you to keep is python
(`backlog-census.py`); the leak scan is a 390-line node tool with its own
proven bite file, and porting it would re-derive a red-proven instrument for
no requirement the design states. `lifecycle` shells out to it and reports its
exit code; a missing node runtime is COULD-NOT-VERIFY, never a pass.

**D-c. One entry point, `lifecycle`, with subcommands** — `item
add|ready|park|close|ratio`, `ledger`, `lane list`, `kind`, `migrate`,
`--test`. One fire log, as §3.8 says. Exit codes are part of the contract and
are stated in the plugin's own docs: 0 = clean, 2 = a finding, 3 =
could-not-verify. A finding and an unreadable input must not share a code.

**D-d. Verb-by-verb order, and each stage lands its own commit.** The stages
are ordered so each one's verifier can run before the next exists:
  1. repo skeleton + manifests + the leak scan moved in + the scan armed on
     this repo's own first commit (§5's ordering constraint);
  2. the kind registry: `lifecycle.json` schema, `kind` verb, the declaration
     reader, the refusal rows for an ignored/absent/malformed declaration;
  3. `ITEMS.md` shape: schema line, fixed-slot blocks, the parser, the file
     lock, the shape check;
  4. `item add` with the intake join (§3.2), typed blockers, ids;
  5. `item ready|park|close` with the atomic move, baseline conservation, the
     archive section;
  6. `ledger` line kinds and its two gated readers (§3.6);
  7. `lane list` with exit-code semantics and longhand roster state;
  8. `--test` = the refusal table, every row red-proven;
  9. `migrate` with its classification report (§4 row 1's rules), run on
     cache-fix.
**Stages 1–8 are in the plugin repo. Stage 9 WRITES INTO cache-fix and is the
only stage that does** — see Write boundaries.

**D-e. The migration is a DRY RUN in this dispatch.** `migrate` produces
`ITEMS.md`, `ITEMS-DONE.md` and the classification report as new files;
**`BACKLOG.md` and `BACKLOG-DONE.md` are not deleted, not edited, and not
moved.** Retiring the old carrier is a separate act with its own review, after
a human has read the report. The design's acceptance criterion — "migration
report reconciles entry counts; zero entries routed to the ledger" — is a
property of the report and needs no destruction to check.

**D-f. Every classification rule in §4 row 1 is applied as written, and every
entry the rules do NOT cover is reported as UNCLASSIFIED with its grade word
and line number.** Never guess a mapping. An unclassified entry is a finding
for the desk, not a defect you resolve.

**D-g. `--test` is the refusal table, one bite per row, and a row you cannot
fire is reported as PROSE-REST with the reason** — the design already labels
one row that way and expects the labelling, not silence. Do not delete a row
to make the roster green.

## Verifier (in order; real output pasted in the report)

1. **Every §3.9 row RED first, then green.** For each row: the firing input
   the table names, run against the implementation BEFORE that row's guard
   exists (or with that one condition disabled and restored BY FILE COPY —
   never `git checkout`/`restore`/`stash`, and delete `__pycache__` after a
   python revert). Report per row: the red, the green, and the arrangement.
   A row whose red is a module-load or import error proves the code is new,
   not that the check discriminates — say so and build a real one.
2. **`lifecycle --test`** — full output, full counts including skips, every
   skip dispositioned.
3. **The leak scan, on the plugin repo itself**, shown red on a planted
   `/home/<user>/…` path in a template and then clean. A clean scan that was
   never shown to fire proves nothing.
4. **`migrate` over cache-fix's real carrier**: paste the reconciliation —
   entries in, entries out per class, UNCLASSIFIED count, and the ledger count
   which must be zero. Then the conservation identity from §3.1 computed on
   the produced files.
5. **The old carrier is byte-identical afterwards**: `git -C <cache-fix>
   status --porcelain BACKLOG.md BACKLOG-DONE.md` prints nothing.

## Write boundaries

- **`~/dev/Gunther-Schulz/lifecycle`** — the whole repo; it is yours, you
  created it. Commit freely there; **never push, and never create a remote.**
- **cache-fix `/home/g/dev/vendor/claude-code-cache-fix`** — exactly three NEW
  files, all from stage 9: `ITEMS.md`, `ITEMS-DONE.md`, and the migration
  report at `docs/audits/migration-report-2026-08-26.md`. Nothing else in that
  repo, and **nothing existing there is edited or deleted**. New files are
  invisible to a pathspec commit until `git add -N <path>` registers them —
  name the FILE, never a directory.
- **Do not touch dotfiles at all.** Tier-2 migration is wave 1's second half
  in the design and is NOT in this dispatch; if you find yourself needing a
  dotfiles change, that is a gap to report.
- Commit by pathspec — `git commit -m "…" -- <paths>` with every flag BEFORE
  the separator; never `git add` then commit, never `-A`. Never amend.
- cache-fix is a SHARED working copy with live co-writers (this desk and the
  judgment desk). Its `test/fixtures/harvested/` carries a scheduled harvest
  timer's output — never assume a clean tree there, and never stage it.
- cache-fix is PUBLIC: no foreign home path, session id, capture id or
  transcript text in anything you write there. The migration report describes
  entries; it does not quote operator prose.
- Trailer on every commit:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Commit plan

- **Guards, read rather than assumed:** the machine's global pre-commit is
  `~/dev/Gunther-Schulz/dotfiles/git/hooks/pre-commit` (`git config
  core.hooksPath` → that directory), and it runs in EVERY repo on this
  machine, including your new one. Its lane gate stays silent in a repo with
  no `lanes` declaration, which yours will not have. cache-fix additionally
  runs its full suite on PUSH, not on commit — and you do not push.
- Stage 1's commit must come after the leak scan is in place, per §5.
- One commit per stage of D-d, each with its own verifier output.
- No version bump anywhere; `0.1.0` is the plugin's birth version.

## Base state

- cache-fix: `b617ac7` (read at brief time; re-read at dispatch — this desk
  and the judgment desk both commit there, so a newer HEAD whose extra commits
  leave `BACKLOG.md`, `BACKLOG-DONE.md` and `docs/directives/` untouched is a
  fast path rather than a halt; report the changed-file list either way).
- `~/dev/Gunther-Schulz/lifecycle`: does not exist; you create it.

## The one open question for the judgment desk

**Is wave 1 one dispatch or three?** The design says one opus dispatch, ~3
days. D-d's nine stages are ordered and individually verifiable, so the work
is decomposable without redesigning anything — and the dispatch discipline's
own measured finding is that template-filling passes while free design fails,
which argues for stages 1–3 (skeleton, registry, item shape), 4–6 (the verbs),
7–9 (router, test roster, migration) as three sequential dispatches with this
desk integrating and verifying between them.

**Recommendation: three.** Not because the executor could not hold it, but
because a single dispatch defers every verification to the end, and stage 9's
migration is the one that reads a carrier this desk is still writing to. Three
integration points also give the refusal table three chances to go red early
rather than one late.

Against it, honestly: three dispatches pay the fixed context load three times
and add two integration seams, and the design's author priced it at one.

This is the desk's call, and it is the only thing in this brief that is not
already decided.
